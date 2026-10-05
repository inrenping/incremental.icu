#!/usr/bin/env python3
"""Verify the i18n message packs and every t('key') call site.

Checks:
  1. en.json / zh.json have identical key sets.
  2. Every useTranslations('NS') + <alias>('key') resolves in both packs.
  3. No Chinese left outside comments / string literals.

Usage: python3 scripts/check-i18n.py
"""
import io
import json
import os
import re
import sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
MESSAGES = os.path.join(SRC, 'messages')


def flatten(obj, prefix=''):
    out = {}
    for k, v in obj.items():
        key = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, key))
        else:
            out[key] = v
    return out


packs = {}
for lang in ('en', 'zh'):
    with io.open(os.path.join(MESSAGES, f'{lang}.json'), encoding='utf-8') as f:
        packs[lang] = flatten(json.load(f))

en_keys, zh_keys = set(packs['en']), set(packs['zh'])
problems = []

only_en = sorted(en_keys - zh_keys)
only_zh = sorted(zh_keys - en_keys)
if only_en:
    problems.append(f'en-only keys ({len(only_en)}): {only_en}')
if only_zh:
    problems.append(f'zh-only keys ({len(only_zh)}): {only_zh}')
print(f'[1] key parity: en={len(en_keys)} zh={len(zh_keys)} '
      f'en-only={len(only_en)} zh-only={len(only_zh)}')

# ---- collect t('key') call sites, resolving the alias to its namespace ----
# The alias is whatever identifier immediately precedes the call paren, so
# t / tRuns / tPage / tLogs / tCompare all work without hardcoding names.
CALL_RE = re.compile(r"""\b([A-Za-z_$][\w$]*)\(\s*['"]([A-Za-z0-9_.]+)['"]""")
ALIAS_RE = re.compile(r"""const\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*['"]([A-Za-z0-9_]+)['"]\s*\)""")
# Only look at calls whose alias is a known translator alias.
HOOK_NAMES = ('t',)

files = []
for dirpath, _dirs, names in os.walk(SRC):
    if dirpath.startswith(MESSAGES):
        continue
    for n in names:
        if n.endswith(('.ts', '.tsx')):
            files.append(os.path.join(dirpath, n))
files.sort()

missing = defaultdict(set)
call_count = 0
for path in files:
    text = io.open(path, encoding='utf-8').read()
    # Walk top-to-bottom so an alias declared later does not shadow earlier uses.
    events = []
    for m in ALIAS_RE.finditer(text):
        events.append((m.start(), 'alias', m.group(1), m.group(2)))
    for m in CALL_RE.finditer(text):
        events.append((m.start(), 'call', m.group(1), m.group(2)))
    events.sort(key=lambda e: e[0])

    aliases = {}
    for pos, kind, a, b in events:
        if kind == 'alias':
            aliases[a] = b
            continue
        if a not in aliases:
            continue  # not a translator call (e.g. some other helper)
        ns = aliases[a]
        call_count += 1
        full = f'{ns}.{b}'
        if full not in en_keys:
            missing[f'not in en.json: {full}'].add(os.path.relpath(path, ROOT))
        if full not in zh_keys:
            missing[f'not in zh.json: {full}'].add(os.path.relpath(path, ROOT))

print(f'[2] checked {call_count} translation call sites in {len(files)} files')
if missing:
    for k, v in sorted(missing.items()):
        problems.append(f'{k}  <- {sorted(v)}')
else:
    print('    every <alias>("key") resolves in both packs')

# ---- Chinese left in code (comments and string literals are ignored) ----
CJK = re.compile(r'[一-鿿]')
LINE_COMMENT = re.compile(r'//.*')
BLOCK_COMMENT = re.compile(r'/\*.*?\*/', re.S)
# Match template literals, single- and double-quoted strings (with escapes).
QUOTED = re.compile(r"""`(?:\\.|[^`\\])*`|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*\"""", re.S)


def strip_noise(text):
    """Remove comments and quoted/template literals, keeping JSX text."""
    text = BLOCK_COMMENT.sub(lambda m: '\n' * m.group(0).count('\n'), text)
    out = []
    for line in text.split('\n'):
        line = LINE_COMMENT.sub('', line)
        line = QUOTED.sub('', line)
        out.append(line)
    return '\n'.join(out)


leftovers = []
for path in files:
    rel = os.path.relpath(path, ROOT).replace(os.sep, '/')
    if rel.startswith('src/app/api/') or rel.startswith('src/i18n/'):
        continue  # server-only plumbing, never rendered
    text = strip_noise(io.open(path, encoding='utf-8').read())
    for i, line in enumerate(text.split('\n'), 1):
        if CJK.search(line):
            leftovers.append(f'{rel}: {line.strip()[:110]}')

print(f'[3] Chinese left outside comments/strings: {len(leftovers)} line(s)')
if leftovers:
    problems.append('Chinese left in code:\n    ' + '\n    '.join(leftovers))

print()
if problems:
    print('FAILED:')
    for p in problems:
        print(' -', p)
    sys.exit(1)
print('ALL CHECKS PASSED')
