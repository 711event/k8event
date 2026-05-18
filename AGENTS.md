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

# k8event project rules

## Email constraint (hard rule)
All external services — **GitHub, Supabase, Vercel** — must be created and accessed under the email **`kb8event@gmail.com`**. Before any account-touching action (create project, login, push, deploy), confirm the active session is on that email. If you find a resource bound to a different email, **stop and prompt the user** to switch.

## Domain rules
- All "daily" date judgements (recharge eligibility, etc.) must use **GMT+8 (Asia/Kuala_Lumpur)** via `lib/time/malaysia.ts`. Never rely on `now()::date` without explicit timezone conversion.
- Player accounts use **username + password** only; internally we store a synthetic email `<username>@k8event.local`. The login form accepts a username and appends the suffix if no `@` is present.
- Leaderboard is by **all-time tokens earned** (positive transactions), not current balance.
- Quick-reply chips (titles like `++WELCOME`) **fill** the composer for the agent to edit; do not auto-send.
- Player and agent accounts are admin-created via `/api/admin/players` (service-role) — there is no self-signup.
- `service_role` key is server-only. Only use it in `app/api/*` server code, never in `'use client'` modules.

## Where to find things
- Full implementation plan: `C:\Users\User\.claude\plans\project-snappy-valiant.md`
- Database schema and RPCs: `supabase/migrations/0001_init.sql`
