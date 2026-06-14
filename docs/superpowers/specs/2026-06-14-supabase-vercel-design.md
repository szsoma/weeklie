# weeklie → Supabase + Vercel — Design

**Date:** 2026-06-14
**Status:** Approved
**Branch:** `feat/supabase-integration`

## Goal

Move weeklie from a local-only IndexedDB app to a cloud-backed app: connect Supabase as the data backend, add auth, create the database schema, and deploy the app to Vercel.

## Context

weeklie is a React 19 + Vite + TypeScript weekly task planner PWA. Today it is 100% local: state lives in Zustand, persistence in Dexie (IndexedDB). There is no backend, no auth, no users. Three entities exist:

- **Task** — id, title, date (`null` = backlog), done, doneAt, color, order, createdAt, updatedAt, deletedAt (soft-delete), plannedDate, rolledOverCount, lastRolledOverAt
- **TaskEvent** — audit log (created / updated / completed / reopened / moved / rolled-over / deleted)
- **WeekReview** — per-week review + streak

Repo is on GitHub at `szsoma/weeklie`, currently on `master`.

## Decisions (confirmed with user)

1. **Single-user sync.** Auth + RLS to protect data; no public sign-up flow. One owner.
2. **Online-first; Supabase is the single source of truth.** Dexie/IndexedDB is removed. The store reads/writes Supabase directly; data is held in memory (Zustand) for the session.
3. **Email magic-link / OTP login** (passwordless).
4. **Start fresh** — no migration of existing local IndexedDB data.

## Architecture

- The Zustand store keeps the in-memory task list for the session and performs every read/write against Supabase. Dexie is removed.
- Auth is required to use the app. `App` renders a login screen until a valid Supabase session exists.
- Every table carries `user_id = auth.uid()` with RLS. This secures the single user now and makes multi-user possible later with no schema change.

## Schema

All tables in `public`, all with RLS enabled, all scoped by `user_id`. Primary keys are client-generated text (`nanoid`) to match existing code — no id-format churn. Timestamps are `timestamptz`; date-only fields (`date`, `planned_date`) stay as `text` to avoid timezone bugs. Array fields use Postgres `text[]`.

### `tasks`
| column | type | notes |
|---|---|---|
| `id` | `text` PK | client nanoid |
| `user_id` | `uuid` NOT NULL DEFAULT `auth.uid()` | FK `auth.users(id)` |
| `title` | `text` NOT NULL | |
| `date` | `text` | `null` = backlog; `"2026-06-12"` otherwise |
| `done` | `boolean` | |
| `done_at` | `timestamptz` | |
| `color` | `text` | one of the palette or null |
| `order` | `integer` | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |
| `deleted_at` | `timestamptz` | soft-delete (null = live) |
| `planned_date` | `text` | original date before rollover |
| `rolled_over_count` | `integer` | |
| `last_rolled_over_at` | `timestamptz` | |

### `task_events`
| column | type | notes |
|---|---|---|
| `id` | `text` PK | client nanoid |
| `user_id` | `uuid` NOT NULL DEFAULT `auth.uid()` | FK `auth.users(id)` |
| `task_id` | `text` | FK `tasks(id) ON DELETE CASCADE` |
| `type` | `text` | one of the event types |
| `from_date` | `text` | |
| `to_date` | `text` | |
| `created_at` | `timestamptz` | |

### `week_reviews`
| column | type | notes |
|---|---|---|
| `week_id` | `text` | composite PK with `user_id` |
| `user_id` | `uuid` NOT NULL DEFAULT `auth.uid()` | FK `auth.users(id)` |
| `completed_count` | `integer` | |
| `planned_count` | `integer` | |
| `rolled_over_count` | `integer` | |
| `reflection` | `text` | |
| `viewed_at` | `timestamptz` | |
| `streak` | `integer` | |
| `completed_task_ids` | `text[]` | |
| `rolled_over_task_ids` | `text[]` | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### RLS policies (all three tables)

- `SELECT`: `USING (user_id = auth.uid())`
- `INSERT`: `WITH CHECK (user_id = auth.uid())`
- `UPDATE`: `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`
- `DELETE`: `USING (user_id = auth.uid())`

## Client changes

- **Install** `@supabase/supabase-js` (pin version, commit lockfile).
- **New** `src/lib/supabase.ts` — singleton client from `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
- **New** login screen — email entry → 6-digit OTP via Supabase Auth; on valid session, render the app.
- **Rewrite** `src/store.ts`:
  - `loadTasks` → `supabase.from('tasks').select().is('deleted_at', null)`
  - `addTask / updateTask / toggleDone / deleteTask / moveTask / rolloverTasks` → Supabase insert/update with **optimistic** local-state updates (instant UI, matching current feel) and revert + toast on error
  - `saveReview / loadReviews` → Supabase upsert / select
  - keep `createId()` (nanoid), ordering & `normalizeOrders` logic, and `hideDone` (stays in localStorage — a UI pref, not data)
- **Remove** `src/db.ts` (Dexie). Update `src/main.tsx` bootstrap. Remove `dexie` dependency.
- **Env:** `.env` (gitignored) holding `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Add `.env` to `.gitignore`.

## Auth lock-down

1. Enable the Email provider in Supabase Auth.
2. Owner registers once via OTP.
3. Disable "Allow new users to sign up" (public sign-ups off) so no one else can register. RLS protects the data regardless of this setting.

## Vercel deployment

- Import `szsoma/weeklie` from GitHub. Vercel auto-detects Vite (`npm run build` → `dist`).
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as env vars in the Vercel project.
- Because Vercel's dashboard import is a browser OAuth flow I cannot perform, I will: push all code, prepare a `vercel.json` if needed, and provide exact dashboard steps — or use the Vercel CLI if it is authenticated locally.

## Security checklist (to honor during implementation)

- Use the **publishable** key (`NEXT_PUBLIC_`-equivalent: `VITE_SUPABASE_ANON_KEY`) in the client; never expose `service_role`.
- RLS on every exposed table; `WITH CHECK` on INSERT/UPDATE.
- `user_id` set server-side via `DEFAULT auth.uid()`, never trusted from the client payload.
- Do not use `user_metadata` for authorization.

## Out of scope (YAGNI)

- Offline / sync layer (online-first was chosen).
- Migration of existing local data.
- Public sign-up UI.
- Edge Functions, Realtime, Storage.
