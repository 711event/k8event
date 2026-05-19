<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version is **Next.js 16.2** with breaking changes vs the v15 most agents know. Before writing code, consult `node_modules/next/dist/docs/` for the relevant guide. Key things that differ:

- `middleware.ts` → renamed to `proxy.ts`. Function must be named `proxy`. Runs on Node.js runtime (not edge).
- `cookies()`, `headers()`, `draftMode()`, `params`, and `searchParams` are **all async** — `await` them.
- Turbopack is the default for `next dev` and `next build` (no `--turbopack` flag needed).
- `next lint` has been removed. Use `npx eslint .` directly.
- `revalidateTag` requires a second `cacheLife` argument.
- `next/image` defaults changed (qualities, minimumCacheTTL, imageSizes). Set `images.localPatterns.search` for local images with query strings.
- Parallel routes require explicit `default.js`.
<!-- END:nextjs-agent-rules -->

# 711event project rules

## Monorepo layout (P10 split)

This repo is an **npm workspaces** monorepo with two independently-deployed Next.js apps + one shared package:

```
apps/frontend/        → 711event.vercel.app    (会员 / 玩家前端)
apps/backend/         → bo711event.vercel.app  (员工 / 管理后台)
packages/shared/      → @k8event/shared        (supabase clients, auth helpers,
                                                time, chat ui + dexie + uploadImage,
                                                SignOutButton, signOutAction)
supabase/             → SQL migrations (DB schema, shared by both apps)
scripts/              → offline ops scripts (create-user, etc.)
```

- **Run dev**: `npm run dev:frontend` or `npm run dev:backend` (from repo root).
- **Build**: `npm run build:frontend` / `npm run build:backend` / `npm run build:all`.
- **Typecheck**: `npm run typecheck` (runs in each workspace).
- **Import shared code**: `import { ... } from "@k8event/shared/supabase/server"` (or `/auth/get-user`, `/time/malaysia`, `/chat/dexie`, `/components/chat/MessageList`, `/components/SignOutButton`, `/auth/sign-out`, etc.). Each app's `tsconfig.json` resolves this via the `@k8event/shared/*` path alias and Next.js transpiles via `transpilePackages: ["@k8event/shared"]`.
- **Both apps point to the same Supabase project**; cookies and sessions are domain-scoped, so logging in on one does not log you in on the other (this is intentional).
- **Player accounts** never need to (and cannot) log into `apps/backend` — `signInAction` rejects role=player. **Admin/agent accounts** are rejected by `apps/frontend` login. The errant role gets `supabase.auth.signOut()` and a Chinese explanation.
- `/api/chat/*` exists only in **apps/frontend** (LiveChat guest endpoint). Admin chat reply uses a server action in `apps/backend/app/admin/chat/[threadId]/actions.ts`, not an API route.

## Hard rules

- All external services — **GitHub, Supabase, Vercel** — must be created and accessed under the email **`nur.aisyah000831@gmail.com`** (GitHub/Supabase org name `711event`). The original `kb8event@gmail.com` was disabled by Google; the project migrated 2026-05-18. Before any account-touching action confirm the active session is on the new email; if you find a resource bound elsewhere, **stop and prompt the user**.
- All "daily" date judgements (recharge eligibility, etc.) must use **GMT+8 (Asia/Kuala_Lumpur)** via `@k8event/shared/time/malaysia`. Never rely on `now()::date` without explicit timezone conversion.
- Player accounts use **username + password** only; internally we store a synthetic email `<username>@k8event.local`. The login form accepts a username and appends the suffix if no `@` is present. (This suffix is auth-internal — never displayed and never to be renamed.)
- Leaderboard is by **all-time tokens earned** (positive transactions), not current balance.
- Quick-reply chips (titles like `++WELCOME`) **fill** the composer for the agent to edit; do not auto-send.
- Player and agent accounts are admin-created via `apps/backend/app/admin/players/actions.ts` (service-role) — there is no self-signup.
- `SUPABASE_SERVICE_ROLE_KEY` is **server-only**. Only use inside server actions / API routes, never in `"use client"` modules. Both apps need it set on Vercel (frontend uses it for `/api/chat/guest` thread creation; backend uses it for `auth.admin.createUser`).

## Where to find things
- Full implementation plan: `C:\Users\User\.claude\plans\project-snappy-valiant.md`
- Database schema and RPCs: `supabase/migrations/0001_init.sql`
- P10 split context: same plan file (most recent section)
