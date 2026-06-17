# Week Share Link - Design Spec

**Date:** 2026-06-17
**Scope:** Shareable live weekly plan links, public read-only shared week view, Supabase schema/RPC updates

## Problem

Weeklie currently requires authentication before any task data loads. Users cannot share their weekly plan with someone else unless that person has access to the same account. The feature lets a user create a shareable link for a specific week so another person can view that week plan without signing in.

## Goals

- Let an authenticated user create one reusable share link for the selected week.
- Make the shared link a live view of the current scheduled tasks for that week.
- Allow recipients to open the link without an account.
- Show scheduled tasks only; exclude backlog tasks.
- Include completed tasks.
- Make links revocable.
- Keep public access narrow and read-only.

## Non-goals

- No collaborative editing.
- No comments, reactions, or task assignment.
- No sharing of backlog tasks.
- No sharing of weekly review content or task event history.
- No password-protected links.
- No multiple active links for the same user/week.
- No snapshot/archive mode.

## Selected Approach

Use a `week_shares` table with a random token and expose shared task data through a narrow `security definer` RPC.

This gives us revocable, unauthenticated live links without weakening the existing authenticated task queries. The public client never queries `tasks` directly; it asks the RPC for the safe view represented by a token.

## Data Model

Add `public.week_shares`:

```sql
create table public.week_shares (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_id text not null,
  week_start text not null,
  token text not null unique,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);
```

`week_id` uses the existing ISO week format from `getWeekId`, for example `2026-W25`.
`week_start` stores the Monday date key for the shared ISO week, for example `2026-06-15`. The RPC uses `week_start` to compute date boundaries, avoiding ISO week parsing in SQL.

Indexes:

- Unique token lookup: `token`.
- Owner/week lookup: `(user_id, week_start)`.

RLS:

- Enable RLS on `week_shares`.
- Authenticated users can select/insert/update/delete only their own rows.
- Anonymous users do not get direct table access.

Updated-at trigger:

- Reuse the existing `set_updated_at()` trigger pattern for `week_shares`.

## Public RPC

Add `public.get_shared_week(share_token text)` as a `security definer` function returning a JSON object:

```json
{
  "ok": true,
  "week_id": "2026-W25",
  "week_start": "2026-06-15",
  "tasks": []
}
```

Unavailable links return:

```json
{
  "ok": false,
  "reason": "unavailable"
}
```

Behavior:

- Look up `week_shares` by `token`.
- Reject missing or revoked shares.
- Resolve the share owner and `week_start` date boundaries.
- Return only non-deleted scheduled tasks owned by the share creator where `date` is inside that week.
- Include completed tasks.
- Exclude backlog tasks where `date is null`.
- Sort by `date`, then `order`.

Returned fields:

- `id`
- `title`
- `date`
- `done`
- `color`
- `order`

Fields not exposed:

- `user_id`
- `created_at`
- `updated_at`
- `deleted_at`
- `planned_date`
- `rolled_over_count`
- `last_rolled_over_at`
- task events
- week reviews

If the token is invalid or revoked, the RPC returns `{ "ok": false, "reason": "unavailable" }`. Active shares with no scheduled tasks return `{ "ok": true, "tasks": [] }`, so the client can distinguish empty weeks from unavailable links.

## Owner User Flow

Authenticated users get a Share action for the currently selected week.

Desktop:

- Add **Share** next to the existing **Today** and **Review** actions in `WeekHeader`.

Mobile:

- Add **Share** to the existing More menu.

Share panel:

- Opens from the Share action.
- Shows the selected week label.
- If no active share exists, creates one.
- Shows the public URL, `/share/:token`.
- Provides **Copy link**.
- Provides **Revoke link**.

Reuse/regeneration:

- Each user/week has one reusable active link.
- Opening Share again for the same week reuses the existing active token.
- Revoking sets `revoked_at`.
- Sharing again after revoke updates the same `(user_id, week_start)` row with a fresh token and clears `revoked_at`, invalidating the old URL.

## Recipient User Flow

Recipients open `/share/:token` without signing in.

The shared page:

- Loads the token from the route.
- Calls `get_shared_week(token)`.
- Shows a read-only weekly layout for Monday through Sunday.
- Shows scheduled tasks only.
- Includes completed tasks.
- Does not render backlog.
- Does not render add, edit, delete, drag, review, or authenticated navigation controls.

States:

- Loading: show a compact loading state.
- Invalid/revoked token: show an unavailable-link message.
- Empty week: show a friendly empty state explaining that no scheduled tasks are shared for that week.

## Frontend Architecture

The app currently has no router and auth-gates the whole application in `App.tsx`. The share route needs to bypass that auth gate.

Add lightweight route detection based on `window.location.pathname`:

- `/share/:token` renders the public shared-week screen.
- All other paths keep the existing authenticated app flow.

This avoids introducing a full routing library for one public route. If the app later needs more routes, this can be replaced with React Router or a similar router.

Suggested frontend units:

- `src/components/ShareWeekDialog.tsx`
  - Owner-facing create/copy/revoke UI.
- `src/components/SharedWeekPage.tsx`
  - Public route shell, loading/error/empty handling.
- `src/components/SharedWeekGrid.tsx`
  - Read-only Monday-Sunday layout.
- `src/components/SharedTaskRow.tsx`
  - Read-only task display.
- Store actions or a small API module for share operations:
  - `getOrCreateWeekShare(weekId, weekStart)`
  - `revokeWeekShare(weekStart)`
  - `loadSharedWeek(token)`

Shared read-only components must not reuse interactive task components in a way that leaves drag/drop, mutation handlers, or authenticated state dependencies attached.

## Security Considerations

- Tokens must be high entropy and unguessable.
- The public route must not require a Supabase session.
- Anonymous clients must not receive direct `tasks` table access.
- The RPC must filter by the share creator's `user_id`.
- Revoked links must stop returning task data.
- Public data must be limited to fields needed to render the weekly plan.

## Error Handling

Owner flow:

- If share creation fails, keep the dialog open and show a clear error.
- If copy fails, leave the URL visible so the user can copy manually.
- If revoke fails, show a clear error and keep the current link state.

Public flow:

- Network/RPC errors show a retry-friendly error state.
- Invalid or revoked tokens show the same unavailable-link state so the app does not disclose whether a token ever existed.

## Testing And Verification

- Run `npm run build`.
- Run `npm run lint`.
- If no test framework exists, do not add one only for this feature.
- Manually verify:
  - unauthenticated `/share/:token` loads,
  - shared view updates after owner edits scheduled tasks,
  - backlog tasks are excluded,
  - completed tasks are included,
  - revoked links stop working,
  - regenerated links work and old links remain unavailable.

## Implementation Notes

- Generate share tokens client-side with `nanoid(32)` through a dedicated helper such as `createShareToken()`. Keep task IDs on the existing `createId()` helper.
- The public shared page can initially use a simplified layout instead of the full authenticated `WeekGrid` if that reduces risk. It must preserve the Weeklie visual language and be clearly read-only.
