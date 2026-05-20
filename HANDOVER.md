# 711event — Project Handover Document

_Last updated: 2026-05-19. All contents verified from source files._

---

## 1. What This Project Is

**711event** is a World Cup token-guessing competition platform for a company's internal players (customers). Players guess match results to earn tokens, then redeem tokens for rewards. A LiveChat module lets players contact customer service agents.

Two deployed apps sharing one Supabase database:

| App | Domain | Purpose |
|-----|--------|---------|
| `apps/frontend` | `711event.vercel.app` | Player-facing (会员前端) — login, predict, leaderboard, redeem, livechat |
| `apps/backend` | `bo711event.vercel.app` | Staff-facing (管理后台 BO) — manage matches, players, rewards, chat |
| `packages/shared` | `@k8event/shared` | Supabase clients, auth helpers, chat UI components, Dexie, uploadImage |

---

## 2. Tech Stack

- **Next.js 16.2** (App Router, Turbopack default) — **NOT standard v15**. See critical differences below.
- **Supabase** (Postgres + Auth + Storage) — free tier, project region: Singapore
- **Vercel** — both apps deployed, functions pinned to `sin1` (Singapore) via `vercel.json`
- **@supabase/ssr** — cookie-based auth for SSR
- **Tailwind CSS** — styling
- **Dexie** (IndexedDB) — client-side image staging before upload
- **date-fns-tz** — timezone handling in `@k8event/shared/time/malaysia`
- **zod** — input validation in server actions and API routes
- **sonner** — toast notifications
- **npm workspaces** monorepo

### Next.js 16.2 Breaking Differences (CRITICAL)
- `middleware.ts` → renamed to **`proxy.ts`**, function named **`proxy`**, runs on Node.js (not edge)
- `cookies()`, `headers()`, `params`, `searchParams` → **all async** (must `await`)
- Turbopack is default for both `dev` and `build` (no `--turbopack` flag)
- `next lint` removed — use `npx eslint .` directly
- `revalidateTag` requires second `cacheLife` argument

---

## 3. Repo Layout

```
k8event/
├── apps/
│   ├── frontend/           → 711event.vercel.app
│   │   ├── app/
│   │   │   ├── (app)/      → player pages (no hard auth gate — guests can browse)
│   │   │   │   ├── layout.tsx    → redirects admin/agent role away; players pass through
│   │   │   │   ├── event/        → current event info
│   │   │   │   ├── matches/      → match list + prediction form
│   │   │   │   ├── leaderboard/  → all-time token earned ranking
│   │   │   │   ├── tokens/       → transaction history
│   │   │   │   ├── history/      → prediction history
│   │   │   │   ├── redemptions/  → player's redemption requests
│   │   │   │   ├── reward/       → reward shop
│   │   │   │   └── livechat/     → guest LiveChat (ChatRoom.tsx)
│   │   │   ├── api/chat/
│   │   │   │   ├── guest/route.ts  → POST: bootstrap thread, set k8e_guest cookie
│   │   │   │   └── send/route.ts   → POST: send guest message (text or image)
│   │   │   ├── login/      → username+password login (LoginForm.tsx + actions.ts)
│   │   │   └── page.tsx    → redirect to /matches
│   │   ├── proxy.ts        → session cookie refresh only (NO auth redirect)
│   │   └── vercel.json     → { "regions": ["sin1"] }
│   │
│   └── backend/            → bo711event.vercel.app
│       ├── app/admin/
│       │   ├── layout.tsx          → requireRole([admin,agent]) + sidebar + ChatUnreadProvider
│       │   ├── page.tsx            → dashboard
│       │   ├── chat/
│       │   │   ├── page.tsx        → inbox (server component)
│       │   │   ├── ChatInboxAutoRefresh.tsx  → 8s polling: router.refresh()
│       │   │   └── [threadId]/
│       │   │       ├── page.tsx    → thread page (server component)
│       │   │       ├── AgentChat.tsx  → 3s polling: fetch messages > lastCreatedAt
│       │   │       └── actions.ts  → agentSendMessage, claim, unclaim, close
│       │   ├── matches/     → create/manage matches, settle results
│       │   ├── players/     → create player accounts (actions.ts uses service role)
│       │   ├── recharge/    → CSV import daily recharge
│       │   ├── redemptions/ → approve/reject/fulfill redemptions
│       │   ├── rewards/     → manage reward shop items
│       │   ├── teams/       → manage team list + logos
│       │   └── quick-replies/ → manage agent quick-reply templates
│       ├── components/admin/
│       │   ├── ChatUnreadProvider.tsx  → sidebar badge + ding, 5s polling
│       │   └── TemplatePicker.tsx      → search-enabled template picker (fixed-position dropdown)
│       ├── proxy.ts         → session cookie refresh only (NO auth redirect)
│       └── vercel.json      → { "regions": ["sin1"] }
│
├── packages/shared/src/
│   ├── supabase/
│   │   ├── client.ts       → createSupabaseBrowserClient(extraHeaders?) — accepts x-guest-token
│   │   ├── server.ts       → createSupabaseServerClient(extraHeaders?) — async, awaits cookies()
│   │   ├── admin.ts        → getSupabaseAdmin() — service role, server-only
│   │   ├── database.types.ts → generated Supabase types
│   │   └── types.ts        → UserRole, RedemptionStatus etc.
│   ├── auth/
│   │   ├── get-user.ts     → getCurrentUser(): AuthedUser|null — calls auth.getUser() + profiles join
│   │   ├── require-role.ts → requireRole(role|role[]) — redirect('/login') if unauthed or wrong role
│   │   └── sign-out.ts     → signOutAction server action
│   ├── chat/
│   │   ├── dexie.ts        → IndexedDB schema for staged images
│   │   └── uploadImage.ts  → ensureUploaded(), ingestFiles(), pruneOldImages()
│   ├── components/
│   │   ├── chat/
│   │   │   ├── MessageList.tsx  → shared message bubble list (ChatMessageView type)
│   │   │   ├── InputBar.tsx     → composer with topSlot/leftSlot props
│   │   │   ├── ThumbStrip.tsx   → image thumbnail picker from Dexie
│   │   │   └── AttachMenu.tsx   → file attach button
│   │   └── SignOutButton.tsx
│   └── time/
│       └── malaysia.ts     → toMalaysia(), malaysiaToUtc(), malaysiaDateString(), formatMalaysia()
│                             (uses date-fns-tz, timezone: 'Asia/Kuala_Lumpur')
│
├── supabase/migrations/
│   ├── 0001_init.sql       → full schema (profiles, matches, tokens, chat, rewards)
│   ├── 0002_quick_replies_relax.sql → relax quick_replies constraints
│   ├── 0003_enable_realtime.sql     → add tables to supabase_realtime publication
│   └── 0004_replica_identity_full.sql → REPLICA IDENTITY FULL on chat tables
│
├── scripts/
│   └── create-user.ts      → offline script to create admin/agent accounts
│
├── CLAUDE.md / AGENTS.md   → AI coding instructions (Next.js 16.2 rules, hard rules)
└── package.json            → workspaces: ["apps/*", "packages/*"], scripts: dev:frontend, dev:backend, build:all, typecheck
```

---

## 4. Database Schema Summary

All in `supabase/migrations/0001_init.sql`. Key tables:

| Table | Purpose |
|-------|---------|
| `profiles` | user_id (FK auth.users), role (player/agent/admin), username (citext unique), display_name |
| `daily_recharge` | (player_id, recharge_date) PK — amount ≥ 500 = eligible to predict that GMT+8 day |
| `teams` | id, name, short_code, logo_url |
| `matches` | home/away team, kickoff_at, token_reward, status (scheduled/locked/finished/cancelled), result (home/away/draw) |
| `predictions` | (match_id, player_id) PK, pick (home/away), is_correct, awarded |
| `token_transactions` | delta, reason (match_win/redeem/admin_adjust), player_id, match_id, redemption_id |
| `token_balances` | VIEW — sum of all deltas per player (spendable balance) |
| `token_earned` | VIEW — sum of positive deltas only (for leaderboard) |
| `reward_items` | name, cost, stock (-1=unlimited), is_active |
| `redemption_requests` | player_id, item_id, cost_at_request, status (pending/approved/fulfilled/rejected) |
| `chat_threads` | guest_session (cookie), guest_name, status (open/claimed/closed), claimed_by, last_message_at |
| `chat_messages` | thread_id, sender (guest/agent/system), kind (text/image), body, image_url, width, height, client_id, agent_id |
| `quick_replies` | title, body — agent response templates |

### Key DB rules
- Predictions: trigger `check_prediction_insert` enforces match status=scheduled, before kickoff, player has ≥500 recharge on match's GMT+8 date
- Leaderboard: `token_earned` view — positive transactions with reason `match_win` or `admin_adjust` only
- `is_eligible(player_uuid, date)` SQL function — used in prediction insert trigger
- `auth_role()` SQL function — returns calling user's role, used in RLS policies

---

## 5. Auth Architecture

### Player accounts
- Username + password only
- Email stored internally as `<username>@k8event.local` (never displayed)
- Frontend `LoginForm` submits username; server action appends `@k8event.local` if no `@`
- Role = `player` — rejected by `apps/backend` login
- Created by admins only via backend `/admin/players` (uses service role `auth.admin.createUser`)

### Admin / Agent accounts
- Created via `scripts/create-user.ts` (service role)
- Role = `admin` or `agent`
- Rejected by `apps/frontend` login
- **Agent nav is limited**: sidebar shows only "客服会话" + "快速回复" (admin sees all 9 items)

### `proxy.ts` — what it does (and doesn't do)
Both `apps/frontend/proxy.ts` and `apps/backend/proxy.ts` do **only one thing**: call `supabase.auth.getSession()`. This refreshes expiring JWTs and writes new cookies to the response. **It does NOT redirect unauthenticated users** — that happens in `requireRole()` inside each page/layout.

```
proxy.ts:   getSession() → refresh cookie if near expiry → pass through
requireRole(): getCurrentUser() → if null/wrong role → redirect('/login')
```

### `getCurrentUser()` vs `requireRole()`
- `getCurrentUser()` → returns `AuthedUser|null`, never redirects (use in optional-auth pages)
- `requireRole(['admin','agent'])` → returns `AuthedUser` or redirects to `/login`

### Frontend player pages
The `(app)/layout.tsx` does **not** require login for players — guests can browse. It only redirects if the user is logged in as `admin` or `agent` (sends them to `/admin`). Individual pages that need auth call `getCurrentUser()` or `requireRole('player')` themselves.

---

## 6. LiveChat Architecture

### Guest bootstrap (frontend)
1. `ChatRoom.tsx` mounts → `POST /api/chat/guest`
2. API reads or creates `chat_threads` row keyed on `k8e_guest` cookie (HttpOnly, 1-year TTL)
3. If player is logged in, their username is backfilled as `guest_name`
4. Returns `{ threadId, guestToken, status, guestName }`
5. `guestToken` is the raw cookie value, passed as `x-guest-token` header to Supabase browser client for guest RLS

### Guest send
- `POST /api/chat/send` with `{ body?, imageUrl?, width?, height?, clientId? }`
- Validates `k8e_guest` cookie → looks up thread → inserts into `chat_messages` as service role

### Guest receive (ChatRoom.tsx polling)
- 5s `setInterval` polling on `chat_messages` where thread_id matches, created_at > last seen
- Also has Supabase Realtime subscription (likely broken on free tier but kept as attempted first-class path; polling is the real fallback that works)
- 15s send timeout: if slow → shows error, removes optimistic bubble

### Agent flow (backend)
- `AgentChat.tsx` — 3s HTTP polling for new guest messages via Supabase JS client (anon key, agent JWT)
- Cursor tracked in `lastCreatedAtRef` — fetches only messages with `created_at > cursor`
- `agentSendMessageAction` server action — zod-validated, inserts with `agent_id` field
- Claim/unclaim/close via separate server actions, `revalidatePath` on both inbox + thread

### Unread badge + ding (backend sidebar)
- `ChatUnreadProvider.tsx` — 5s polling, `count(*)` query: sender=guest AND created_at > localStorage `bo_chat_last_seen_at`
- Ding via Web Audio API (B5 988Hz + E6 1319Hz, two-tone) — only when count increases between polls
- Resets to 0 when user navigates to any `/admin/chat*` path
- `localStorage` key: `bo_chat_last_seen_at`

### Inbox auto-refresh
- `ChatInboxAutoRefresh.tsx` — 8s `router.refresh()` (re-runs server component, diffs markup)
- All three polling components pause when `document.hidden`, resume + immediate fetch on tab focus

### Why polling, not Supabase Realtime
Free tier never broadcasts `postgres_changes` events despite publication + REPLICA IDENTITY FULL being correctly set (Realtime Messages usage stayed 0 across entire billing cycle, confirmed by WebSocket probe). **Do not attempt to re-add Realtime** — it fundamentally doesn't work on free tier.

---

## 7. Image Upload Flow

1. User picks file → `ingestFiles()` → stores blob in Dexie (IndexedDB) with objectURL preview
2. `ThumbStrip` reads Dexie → shows thumbnail strip above InputBar
3. User clicks thumbnail to send → `sendImage(localId)`
4. `ensureUploaded(localId, senderCtx)` → uploads to Supabase Storage → returns `{ publicUrl, width, height }`
5. Server action / API route stores `publicUrl` in `chat_messages.image_url`
6. `pruneOldImages()` called on mount — cleans Dexie entries older than 24h

`SenderContext` = `{ sender: 'agent', userId }` or `{ sender: 'guest', guestToken }`

---

## 8. Dev Commands

```bash
# From repo root:
npm run dev:frontend     # frontend on :3000
npm run dev:backend      # backend on :3001
npm run build:frontend
npm run build:backend
npm run build:all
npm run typecheck        # runs in all workspaces
npx eslint .             # lint (next lint removed in 16.2)
```

---

## 9. Environment Variables

Both apps need these in Vercel project settings AND local `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # server-only — never import in "use client" files
```

Both apps use service role: frontend for `/api/chat/*` (creates/reads threads as service); backend for `auth.admin.createUser` in player creation.

---

## 10. Deployment

- GitHub: `711event` org under `nur.aisyah000831@gmail.com`
- Vercel: two projects (`711event` + `k8event`) under same account, both `sin1` via `vercel.json`
- Supabase: single project, Singapore region, under `nur.aisyah000831@gmail.com`
- Push to `main` → both Vercel projects auto-deploy (~40s build)
- **All external services (GitHub, Supabase, Vercel) MUST use `nur.aisyah000831@gmail.com`** — original `kb8event@gmail.com` was disabled by Google (migrated 2026-05-18)

---

## 11. Key Technical Decisions Made

| Decision | Why |
|----------|-----|
| Polling instead of Supabase Realtime | Free tier never broadcasts events (verified by WebSocket probe + 0 Realtime Messages in billing dashboard for entire billing cycle) |
| `auth.getSession()` in proxy.ts | `auth.getUser()` makes network call on every request (was 35s latency on free-tier throttled auth endpoint); `getSession()` reads cookie locally (~6ms) |
| `regions: ["sin1"]` hardcoded in vercel.json | Vercel dashboard Save button was silently not persisting region changes; hardcoded to guarantee Singapore region |
| Synthetic email `@k8event.local` | Supabase Auth requires email; players use username-only login |
| Leaderboard by all-time earned | Not current balance — spending tokens shouldn't hurt ranking |
| Quick-reply `++` prefix = button chip | Titles starting `++` fill composer without sending; others go into TemplatePicker search dialog |
| TemplatePicker fixed positioning | Dropdown was clipped by `overflow-x-auto` parent; fixed using `getBoundingClientRect` anchor |
| Agent nav filtered by role | Agents (`role='agent'`) only see chat + quick-replies; full nav only for admins |

---

## 12. Pending Work (as of 2026-05-19)

### 1. Member single-device login enforcement (未做)
Prevent players from being logged in on multiple devices simultaneously.

**Option A (simple — recommended starting point)**:
On successful login in the frontend `signInAction`, call `supabase.auth.admin.signOut(userId, { scope: 'others' })` (service role) to invalidate all other sessions for that user. Player notices only when they try to use the old device.

**Option B (instant kick)**:
Poll a session version number every ~30s; if server version doesn't match local, force sign-out. More complex, immediate effect.

### 2. LiveChat send timeout UX (未做)
Currently if send fails/times out, the optimistic bubble is **deleted**. Better UX: show "发送失败 — 点击重试" state on the bubble instead of removing it. Affects `sendText` and `sendImage` in both `ChatRoom.tsx` and `AgentChat.tsx`.

### 3. Performance monitoring with multiple tabs
Server-side confirmed fast (Vercel logs: 35-50ms total). If user reports slowness again: check Supabase free-tier rate limiting (count queries every 5s across multiple open tabs accumulate). Mitigation: increase intervals (5s→10s, 8s→15s, 3s→6s) or add DB index on `chat_messages(sender, created_at)`.

---

## 13. Known Issues / Gotchas

- `supabase/migrations/0003` + `0004` exist (publication + REPLICA IDENTITY FULL) but Realtime still doesn't work on free tier — kept for documentation
- `packages/shared/src/supabase/database.types.ts` may go stale after schema changes — regenerate: `npx supabase gen types typescript --project-id <id> > packages/shared/src/supabase/database.types.ts`
- Turbopack (default in 16.2) occasionally doesn't hot-reload changes to `@k8event/shared` — restart dev server if shared package changes don't reflect
- `quick_replies.title` starting with `++` renders as instant-fill chip in InputBar; others go into TemplatePicker (handled in `AgentChat.tsx` by `isButtonReply` function)
- `chat_messages.agent_id` column exists — set by `agentSendMessageAction` but not used in any UI yet

---

## 14. Where to Find Things

| What | Where |
|------|-------|
| Full DB schema | `supabase/migrations/0001_init.sql` |
| Auth helpers | `packages/shared/src/auth/` |
| Malaysia time utils | `packages/shared/src/time/malaysia.ts` — exports: `toMalaysia`, `malaysiaToUtc`, `malaysiaDateString`, `formatMalaysia` |
| Image upload logic | `packages/shared/src/chat/uploadImage.ts` |
| Guest chat API | `apps/frontend/app/api/chat/guest/route.ts` (bootstrap) + `send/route.ts` (send) |
| Admin chat actions | `apps/backend/app/admin/chat/[threadId]/actions.ts` |
| Polling components | `ChatUnreadProvider.tsx`, `ChatInboxAutoRefresh.tsx`, `AgentChat.tsx` |
| Player creation | `apps/backend/app/admin/players/actions.ts` (service role) |
| Previous AI plans | `C:\Users\User\.claude\plans\project-snappy-valiant.md` |
| Supabase project | Dashboard under `nur.aisyah000831@gmail.com` |
