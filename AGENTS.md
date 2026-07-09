# AGENTS.md — AI Assistant Guidelines

This file defines conventions, architecture decisions, and workflows for AI agents working on the **Incremental.icu** project. Agents should read this before making changes.

## Project Overview

**Incremental.icu** is a cross-platform sports data synchronization tool that bridges Garmin (CN/Global) and Coros platforms. It syncs `.FIT` activity data via official APIs.

- **Repo**: `incremental.icu`
- **Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend**: FastAPI (Python) — separate repo
- **Database**: Neon (Serverless Postgres)
- **Auth**: next-auth v5 (Google OAuth, GitHub OAuth)
- **Internationalization**: next-intl (zh, en)
- **Hosting**: Vercel (frontend)

## Directory Structure

```
src/
  app/           # Next.js App Router pages & API routes
    api/         # Backend API route handlers
    dash/        # Dashboard pages (authenticated)
    doc/         # Documentation pages
    heart/       # Heart rate pages
    login/       # Authentication pages
  components/    # React components
    ui/          # shadcn/ui primitives
    dash/        # Dashboard-specific components
    login/       # Login-specific components
    hooks/       # Custom hooks
  hooks/         # App-wide hooks
  i18n/          # Internationalization config
  lib/           # Utilities, API client, constants
  messages/      # Locale strings (en.json, zh.json)
public/
  docs/          # Static markdown documentation
```

## Coding Conventions

### General

- **Language**: All code, comments, and commit messages in English. UI strings go in `src/messages/`.
- **TypeScript**: Strict mode. Avoid `any`. Prefer `interface` over `type` for object shapes.
- **Components**: Use functional components with explicit return types. One component per file.
- **Imports**: Order: React/Next → third-party → `@/` aliases → relative. No blank lines between groups.

### Styling

- Use **Tailwind CSS v4** exclusively. No CSS modules or styled-components.
- Use `cn()` utility (`@/lib/utils`) for conditional class merging.
- shadcn/ui components live in `src/components/ui/`. Do not modify them directly without explicit request.

### State & Data Fetching

- Server Components by default. Use `"use client"` only when interactivity is needed.
- Use Next.js Server Actions or Route Handlers for mutations.
- Fetching logic goes in `src/lib/api.ts`.

### Routing

- App Router conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`.
- Dynamic route params via `[param]` directory naming.

### i18n

- Use `next-intl` with `useTranslations()` hook.
- Add all user-facing strings to `src/messages/en.json` and `src/messages/zh.json`.
- Message keys follow dot-notation: `page.section.action`.

## Workflow

1. **Read first**: Understand existing code before suggesting changes.
2. **Lint before finalize**: Run `npm run lint` before completing a task.
3. **Minimal changes**: Only touch files directly relevant to the task. No scope creep.
4. **Commit style**: Follow existing commit history — concise, imperative mood.
5. **Type safety**: Prefer avoiding `@ts-ignore` or `@ts-expect-error` unless necessary.
