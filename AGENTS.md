# AGENTS.md — AI Assistant Guidelines

This file defines conventions, architecture decisions, and workflows for AI agents working on the **Incremental.icu** project. Agents should read this before making changes.

## Project Overview

**Incremental.icu** is a cross-platform sports data synchronization tool that bridges Garmin (CN/Global) and Coros platforms. It moves `.FIT` activity files between platforms via their official APIs, and additionally shows Garmin sleep/heart-rate data plus running statistics.

- **Repos**: frontend `incremental.icu` (this repo, [github.com/inrenping/incremental.icu](https://github.com/inrenping/incremental.icu)) · backend `incremental-serve` · MCP `incremental-mcp`
- **Frontend stack**: Next.js 16.2 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui + Radix, Recharts, dayjs, sonner
- **Auth**: Clerk (`@clerk/nextjs`) — email code, Google OAuth, GitHub OAuth. This is the only auth stack; the old `next-auth` / `@react-oauth/google` leftovers have been removed from `package.json`.
- **Backend**: FastAPI (Python), SQLAlchemy, APScheduler — separate repo
- **Database**: Neon (Serverless Postgres); activity files stored in Supabase Storage
- **Internationalization**: next-intl (zh default, en available, `localePrefix: 'as-needed'`)
- **Hosting**: Vercel (frontend) from `main`; backend deployed by GitHub Actions from `master`
- **MCP endpoint**: `https://incremental.icu/mcp` (streamable-http)

## Directory Structure

```
src/
  app/
    page.tsx                 # landing page
    layout.tsx               # ClerkProvider + theme + intl providers
    sign-in/[[...sign-in]]/  # Clerk sign-in
    sign-up/[[...sign-up]]/  # Clerk sign-up
    api/
      garmin/route.ts        # server-side Garmin login helper (garmin-connect)
      coros/route.ts         # server-side Coros helper
    dash/
      layout.tsx             # sidebar + header shell
      page.tsx               # dashboard with 4 tabs: console / sync / sleep / heart
      accounts/              # platform account management (incl. "master" source switch)
      activities/            # activity list (compare/, files/ subpages)
      calendar/              # weekly training calendar
      fitness/               # Garmin fitness metrics (training status, fitness age, PRs, race prediction)
      task/                  # scheduled sync tasks
      sync-history/          # sync run history
      files/                 # Supabase activity files
      logs/ syslogs/         # operation logs / system request logs
      profile/               # profile, timezone, yearly target, social bindings
      gpt/                   # one-time OAuth code for MCP clients
    heart/                   # standalone heart-rate page (reuses HeartRatePanel)
    doc/[slug]/              # docs page, fetches /docs/<slug>.md at runtime
  components/
    ui/                      # shadcn/ui primitives — do not edit unless asked
    dash/                    # dashboard business components
    login/                   # login-page components
    hooks/                   # component-level hooks
  hooks/                     # app-wide hooks (use-layout etc.)
  i18n/                      # next-intl routing + request config
  lib/
    api.ts                   # clerkFetch / authFetch (Bearer Clerk JWT)
    token-manager.ts         # getAuthToken()
    doc-menu.json            # docs sidebar menu
    activities.ts, activity-icons.tsx, storage.ts, events.ts, utils.ts
  messages/                  # en.json, zh.json
  middleware.ts              # clerkMiddleware + public route allowlist
public/
  docs/                      # static markdown documentation (+ guide/ screenshots)
```

## Domain Concepts

The frontend talks to a Python backend; keeping these business rules straight matters more than UI details.

- **AppConfig / connect config**: one connected platform account (`source_type`: `garmin` | `garmin_cn` | `coros`, `region`, credentials, `total_count`, `last_synced_at`).
- **Master source (`master: true`)**: the single connected account that feeds the dashboard's running stats, 30-day chart and recent activities. Set via `connection-dialog.tsx`.
- **Sync is one-way**: every sync needs an explicit source → target. `execute2` = one-click sync comparing the latest 10 activities on both sides.
- **Scheduled task limits**: max **10 tasks per user**, exactly **1 sync config per task**, max **3 executions per day**. These constants are duplicated in `src/app/dash/task/page.tsx` and `src/components/dash/task-dialog.tsx` — change both together, and keep them aligned with the backend. Duplicate source→target configs across tasks are rejected.
- **Tasks fire hourly**: the server checks enabled tasks every hour against the user's timezone set on the profile page. Execution happens within that hour, not at an exact minute.
- **Sleep & heart rate are Garmin-only** and pulled on demand (`garmin/getDailySleep`, `garmin/getMonthlySleep`, `garmin/syncMonthlySleep`, `garmin/getDailyHeartRate`, `garmin/syncDailyHeartRate`).

## Coding Conventions

### General

- Code identifiers in English. Existing history and comments are **mixed Chinese/English** (Chinese comments are common in newer business modules like `sleep-combined-panel.tsx`, English in infrastructure files such as `token-manager.ts`); follow whichever style the file you are editing already uses. Commit messages follow `type(scope): 中文或英文简述` as seen in `git log`. UI strings belong in `src/messages/*.json`.
- TypeScript strict mode. Avoid `any` (use `unknown` + narrowing; if unavoidable, add a targeted eslint-disable with a reason).
- Functional components, one component per file, explicit return types where practical.
- Import order: React/Next → third-party → `@/` aliases → relative.

### Styling

- Tailwind CSS v4 only. No CSS modules or styled-components.
- Use `cn()` from `@/lib/utils` for conditional classes.
- Never hand-edit anything in `src/components/ui/` unless explicitly asked.

### State & Data Fetching

- Server Components by default; `"use client"` only when interactivity requires it.
- All backend calls must go through `clerkFetch` (`authFetch` is a legacy alias) from `@/lib/api` — it attaches the Clerk JWT on every request. Do not use bare `fetch` for `/api/v1/*`, and do not reintroduce a hand-rolled token cache (see the comment in `token-manager.ts`).
- 401/403 surfaces a toast rather than a redirect; keep that behavior.
- Toasts via `sonner`; date math via `dayjs`.

### Routing

- App Router conventions: `page.tsx`, `layout.tsx`, `route.ts`. Dynamic segments use `[param]`.
- Anything under `/dash/**` is protected. To make a route public, add it to the matcher list in `src/middleware.ts`.

### i18n

- Use `useTranslations()` from `next-intl` with dot-notation namespaces (`DashPage`, `GptCodePage`, `IndexPage`, …).
- Every new user-facing string must be added to **both** `src/messages/en.json` and `src/messages/zh.json`. No hardcoded Chinese in components.

### Documentation

- Site docs live in `public/docs/*.md` and are fetched client-side at `/docs/<slug>.md`; MDX/server features do not work there.
- Adding a doc requires also registering it in `src/lib/doc-menu.json`.
- h2 headings become the right-hand table of contents automatically.

## Working Principles

**Before executing any actual operations (modifying code, creating files, running commands, etc.), you must first confirm with the user. Only proceed after receiving explicit approval.** Read-only operations such as analysis, reading, and searching do not require confirmation.

## Workflow

1. **Read first**: understand existing code before changing anything.
2. **Lint before finalize**: run `npm run lint` before completing a task.
3. **Minimal changes**: only touch files directly relevant to the task. No scope creep, no speculative refactors.
4. **Commit style**: follow existing history — concise, imperative, often prefixed (`feat(dash): …`, `fix(task): …`).
5. **Type safety**: avoid `@ts-ignore` / `@ts-expect-error` unless there is no alternative. Note that `next.config.ts` sets `typescript.ignoreBuildErrors: true` (leftover `/login` route types), so `lint`/review — not `build` — is the real gate for type errors.
6. **Keep docs honest**: when behavior, routes, dependencies or limits change, update `public/docs/*.md`, `README.md` and this file in the same change.

## Branch & Release

- Develop on `dev`, then merge to `main` for Vercel deployment. Backend repo uses `dev` → `master`.
- If a database change ships with the feature: run the migration SQL first, then release the backend, then the frontend.
