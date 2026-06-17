# Week Share Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build revocable, unauthenticated, live read-only share links for scheduled tasks in a selected Weeklie week.

**Architecture:** Add a `week_shares` table keyed by owner and week, plus a `security definer` RPC that returns only safe public task fields for active tokens. Add owner share controls in `WeekHeader`, a public `/share/:token` path that bypasses the auth gate, and read-only shared-week components that never mount drag/drop or mutation handlers.

**Tech Stack:** React 19, Vite, TypeScript, Zustand-adjacent API helpers, Supabase Postgres/RLS/RPC, Tailwind CSS v4, nanoid.

---

## File Structure

- Modify `supabase/schema.sql`
  - Add `week_shares`, RLS policies, updated-at trigger, public RPC, and RPC grants.
- Modify `src/nanoid.ts`
  - Add `createShareToken()` using `nanoid(32)`.
- Modify `src/types.ts`
  - Add public share and shared-task TypeScript types.
- Create `src/lib/week-share.ts`
  - Encapsulate owner share operations and public shared-week loading.
- Create `src/components/ShareWeekDialog.tsx`
  - Owner UI for creating, copying, revoking, and regenerating a week link.
- Modify `src/components/WeekHeader.tsx`
  - Add Share action on desktop and mobile menu.
- Create `src/components/SharedTaskRow.tsx`
  - Read-only task row with completed and color display only.
- Create `src/components/SharedWeekGrid.tsx`
  - Read-only Monday-Sunday grid excluding backlog.
- Create `src/components/SharedWeekPage.tsx`
  - Public route shell for loading, unavailable, empty, and content states.
- Modify `src/App.tsx`
  - Render `/share/:token` before the auth loading and sign-in screens, and wire the owner dialog.

## Task 1: Database Share Model And Public RPC

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Add schema/RLS/RPC SQL**

Append this SQL to `supabase/schema.sql` after the existing `week_reviews_set_updated_at` trigger:

```sql
create table if not exists public.week_shares (
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

create index if not exists week_shares_user_week_start_idx
  on public.week_shares (user_id, week_start);

drop trigger if exists week_shares_set_updated_at on public.week_shares;
create trigger week_shares_set_updated_at
  before update on public.week_shares
  for each row execute function public.set_updated_at();

alter table public.week_shares enable row level security;

drop policy if exists "Users can read own week shares" on public.week_shares;
create policy "Users can read own week shares"
  on public.week_shares
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create own week shares" on public.week_shares;
create policy "Users can create own week shares"
  on public.week_shares
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own week shares" on public.week_shares;
create policy "Users can update own week shares"
  on public.week_shares
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own week shares" on public.week_shares;
create policy "Users can delete own week shares"
  on public.week_shares
  for delete
  to authenticated
  using (user_id = auth.uid());

create or replace function public.get_shared_week(share_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  share_record public.week_shares%rowtype;
  week_end text;
begin
  select *
    into share_record
    from public.week_shares
    where token = share_token
      and revoked_at is null
    limit 1;

  if share_record.id is null then
    return jsonb_build_object(
      'ok', false,
      'reason', 'unavailable'
    );
  end if;

  week_end := to_char((share_record.week_start::date + interval '7 days'), 'YYYY-MM-DD');

  return jsonb_build_object(
    'ok', true,
    'week_id', share_record.week_id,
    'week_start', share_record.week_start,
    'tasks', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', t.id,
            'title', t.title,
            'date', t.date,
            'done', t.done,
            'color', t.color,
            'order', t."order"
          )
          order by t.date, t."order"
        )
        from public.tasks t
        where t.user_id = share_record.user_id
          and t.deleted_at is null
          and t.date is not null
          and t.date >= share_record.week_start
          and t.date < week_end
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.get_shared_week(text) from public;
grant execute on function public.get_shared_week(text) to anon, authenticated;
```

- [ ] **Step 2: Review SQL for deterministic public data shape**

Run:

```bash
rtk rg -n "week_shares|get_shared_week|grant execute" supabase/schema.sql
```

Expected: output includes the table, the RPC, and `grant execute` lines.

- [ ] **Step 3: Commit database contract**

Run:

```bash
rtk git status --short
rtk git add supabase/schema.sql
rtk git commit -m "feat: add week share database contract"
```

Expected: commit succeeds. Do not stage unrelated files such as `src/components/WeekGrid.tsx`.

## Task 2: Share Types And API Helpers

**Files:**
- Modify: `src/nanoid.ts`
- Modify: `src/types.ts`
- Create: `src/lib/week-share.ts`

- [ ] **Step 1: Add dedicated share token helper**

Replace `src/nanoid.ts` with:

```ts
import { nanoid } from 'nanoid'

export function createId(): string {
  return nanoid()
}

export function createShareToken(): string {
  return nanoid(32)
}
```

- [ ] **Step 2: Add share-related types**

Append these types to `src/types.ts`:

```ts
export type WeekShare = {
  id: string;
  week_id: string;
  week_start: string;
  token: string;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SharedWeekTask = Pick<
  Task,
  'id' | 'title' | 'date' | 'done' | 'color' | 'order'
>;

export type SharedWeekAvailable = {
  ok: true;
  week_id: string;
  week_start: string;
  tasks: SharedWeekTask[];
};

export type SharedWeekUnavailable = {
  ok: false;
  reason: 'unavailable';
};

export type SharedWeekResponse = SharedWeekAvailable | SharedWeekUnavailable;
```

- [ ] **Step 3: Create owner and public share API helper**

Create `src/lib/week-share.ts` with:

```ts
import { createId, createShareToken } from '../nanoid'
import { supabase } from './supabase'
import type { SharedWeekResponse, WeekShare } from '../types'

type WeekShareRow = WeekShare & {
  user_id: string;
}

type WeekShareInput = {
  weekId: string;
  weekStart: string;
}

export function buildShareUrl(token: string): string {
  return `${window.location.origin}/share/${token}`
}

export async function getOrCreateWeekShare({
  weekId,
  weekStart,
}: WeekShareInput): Promise<WeekShare> {
  const { data: existing, error: selectError } = await supabase
    .from('week_shares')
    .select('id, week_id, week_start, token, revoked_at, created_at, updated_at')
    .eq('week_start', weekStart)
    .maybeSingle()

  if (selectError) {
    throw new Error(selectError.message)
  }

  if (existing && !existing.revoked_at) {
    return existing as WeekShare
  }

  if (existing) {
    const { data, error } = await supabase
      .from('week_shares')
      .update({
        token: createShareToken(),
        revoked_at: null,
        week_id: weekId,
      })
      .eq('id', existing.id)
      .select('id, week_id, week_start, token, revoked_at, created_at, updated_at')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as WeekShare
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    throw new Error(userError?.message ?? 'You must be signed in to share a week.')
  }

  const insertRow: WeekShareRow = {
    id: createId(),
    user_id: userData.user.id,
    week_id: weekId,
    week_start: weekStart,
    token: createShareToken(),
    revoked_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('week_shares')
    .insert(insertRow)
    .select('id, week_id, week_start, token, revoked_at, created_at, updated_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as WeekShare
}

export async function revokeWeekShare(weekStart: string): Promise<void> {
  const { error } = await supabase
    .from('week_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('week_start', weekStart)

  if (error) {
    throw new Error(error.message)
  }
}

export async function loadSharedWeek(token: string): Promise<SharedWeekResponse> {
  const { data, error } = await supabase.rpc('get_shared_week', {
    share_token: token,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as SharedWeekResponse
}
```

- [ ] **Step 4: Verify TypeScript compiles the helper**

Run:

```bash
rtk npm run build
```

Expected: build passes.

- [ ] **Step 5: Commit share helper**

Run:

```bash
rtk git status --short
rtk git add src/nanoid.ts src/types.ts src/lib/week-share.ts
rtk git commit -m "feat: add week share client helpers"
```

Expected: commit succeeds.

## Task 3: Owner Share Dialog

**Files:**
- Create: `src/components/ShareWeekDialog.tsx`

- [ ] **Step 1: Create dialog component**

Create `src/components/ShareWeekDialog.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import { formatWeekLabel, getWeekId, toLocalDateKey } from '../dates'
import {
  buildShareUrl,
  getOrCreateWeekShare,
  revokeWeekShare,
} from '../lib/week-share'
import type { WeekShare } from '../types'

type Props = {
  weekStart: Date;
  onClose: () => void;
}

type CopyState = 'idle' | 'copied' | 'failed'

export default function ShareWeekDialog({ weekStart, onClose }: Props) {
  const [share, setShare] = useState<WeekShare | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [revoking, setRevoking] = useState(false)

  const weekId = getWeekId(weekStart)
  const weekStartKey = toLocalDateKey(weekStart)
  const shareUrl = share ? buildShareUrl(share.token) : ''

  useEffect(() => {
    let cancelled = false

    async function loadShare() {
      setLoading(true)
      setError(null)
      try {
        const nextShare = await getOrCreateWeekShare({
          weekId,
          weekStart: weekStartKey,
        })
        if (!cancelled) setShare(nextShare)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not create share link.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadShare()

    return () => {
      cancelled = true
    }
  }, [weekId, weekStartKey])

  const copyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  const revoke = async () => {
    setRevoking(true)
    setError(null)
    try {
      await revokeWeekShare(weekStartKey)
      setShare(null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke share link.')
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/20 px-4">
      <button
        className="absolute inset-0 cursor-default"
        aria-label="Close share dialog"
        onClick={onClose}
      />
      <section className="relative w-full max-w-md rounded-2xl border border-rule-strong bg-surface p-5 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.45)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
              Share week
            </p>
            <h2 className="mt-1 font-mono text-xl font-semibold text-ink">
              {formatWeekLabel(weekStart)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            aria-label="Close"
          >
            X
          </button>
        </div>

        {loading && (
          <p className="font-mono text-sm text-muted">Creating share link...</p>
        )}

        {error && (
          <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {!loading && shareUrl && (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                Public link
              </span>
              <input
                readOnly
                value={shareUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="h-11 w-full rounded-xl border border-rule-strong bg-bg px-3 font-mono text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
              />
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={copyLink}
                className="h-11 flex-1 rounded-xl bg-ink px-4 font-mono text-sm uppercase text-bg transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                {copyState === 'copied' ? 'Copied' : 'Copy link'}
              </button>
              <button
                type="button"
                onClick={revoke}
                disabled={revoking}
                className="h-11 flex-1 rounded-xl border border-rule-strong px-4 font-mono text-sm uppercase text-muted transition hover:bg-ink/[0.06] hover:text-ink disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                {revoking ? 'Revoking' : 'Revoke'}
              </button>
            </div>

            {copyState === 'failed' && (
              <p className="font-mono text-xs text-muted">
                Copy failed. Select the link field and copy it manually.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Verify dialog compiles**

Run:

```bash
rtk npm run build
```

Expected: build passes.

- [ ] **Step 3: Commit dialog**

Run:

```bash
rtk git add src/components/ShareWeekDialog.tsx
rtk git commit -m "feat: add week share dialog"
```

Expected: commit succeeds.

## Task 4: WeekHeader Share Entry Point

**Files:**
- Modify: `src/components/WeekHeader.tsx`

- [ ] **Step 1: Add share icon component**

In `src/components/WeekHeader.tsx`, add this component after `ReviewIcon`:

```tsx
function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[20px] h-[20px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M12 16V4" />
      <path d="M8 8l4-4 4 4" />
    </svg>
  );
}
```

- [ ] **Step 2: Add callback prop**

Change the props type from:

```tsx
type Props = {
  onShowReview?: () => void;
};
```

to:

```tsx
type Props = {
  onShowReview?: () => void;
  onShowShare?: () => void;
};
```

Change the component signature from:

```tsx
export default function WeekHeader({ onShowReview }: Props) {
```

to:

```tsx
export default function WeekHeader({ onShowReview, onShowShare }: Props) {
```

- [ ] **Step 3: Add desktop Share button**

Add this button in the desktop action group between Today and Review:

```tsx
<button
  onClick={onShowShare}
  aria-label="Share this week"
  className="h-10 w-auto font-mono text-[14px] uppercase rounded-md border border-rule-strong text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
>
  <span className="hidden md:inline px-4">Share</span>
</button>
```

- [ ] **Step 4: Add mobile Share menu item**

Add this menu item between Today and Review in the mobile popover:

```tsx
<button
  onClick={() => {
    onShowShare?.();
    setMenuOpen(false);
  }}
  className="flex items-center gap-3 w-full px-4 py-3 font-mono text-[14px] text-ink hover:bg-ink/[0.06] transition"
>
  <ShareIcon />
  <span>Share</span>
</button>
```

- [ ] **Step 5: Verify header compiles**

Run:

```bash
rtk npm run build
```

Expected: build passes because `onShowShare` is optional until Task 7 wires the callback.

- [ ] **Step 6: Commit header entry point**

Run:

```bash
rtk git add src/components/WeekHeader.tsx
rtk git commit -m "feat: add week share header action"
```

Expected: commit succeeds.

## Task 5: Read-Only Shared Week Components

**Files:**
- Create: `src/components/SharedTaskRow.tsx`
- Create: `src/components/SharedWeekGrid.tsx`

- [ ] **Step 1: Create read-only task row**

Create `src/components/SharedTaskRow.tsx` with:

```tsx
import type { SharedWeekTask } from '../types'

const COLOR_MAP: Record<string, string> = {
  red: '#e74c3c',
  orange: '#e67e22',
  yellow: '#eab308',
  green: '#22c55e',
}

type Props = {
  task: SharedWeekTask;
}

export default function SharedTaskRow({ task }: Props) {
  const hasColor = task.color !== null && task.color in COLOR_MAP
  const colorBg = hasColor
    ? { backgroundColor: `${COLOR_MAP[task.color!]}18` }
    : undefined

  return (
    <div className="group relative flex h-10 items-center gap-2 rounded-full px-2 text-sm leading-snug">
      {hasColor && (
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={colorBg}
        />
      )}
      <span
        className={`relative z-[1] grid h-4 w-4 flex-shrink-0 place-items-center rounded-[5px] ${
          task.done ? 'bg-ink' : 'bg-ink/[0.04]'
        }`}
        aria-hidden
      >
        {task.done && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--bg)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        )}
      </span>
      <span
        className={`relative z-[1] min-w-0 flex-1 truncate ${
          task.done ? 'text-faint line-through' : 'text-ink'
        }`}
      >
        {task.title}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Create read-only week grid**

Create `src/components/SharedWeekGrid.tsx` with:

```tsx
import { getWeekDays, isToday, toLocalDateKey } from '../dates'
import type { SharedWeekTask } from '../types'
import SharedTaskRow from './SharedTaskRow'

type Props = {
  weekStart: Date;
  tasks: SharedWeekTask[];
}

type SharedDayColumnProps = {
  date: Date;
  tasks: SharedWeekTask[];
}

function SharedDayColumn({ date, tasks }: SharedDayColumnProps) {
  const dateKey = toLocalDateKey(date)
  const dayTasks = tasks
    .filter((task) => task.date === dateKey)
    .sort((a, b) => a.order - b.order)
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
  const monthName = date.toLocaleDateString('en-US', { month: 'short' })
  const dayNum = date.getDate()
  const today = isToday(date)

  return (
    <div className={`relative flex min-h-[220px] flex-col ${today ? 'bg-today' : 'bg-bg'}`}>
      <div
        className="sticky top-0 z-10 flex min-h-[44px] items-center justify-between gap-2 border-b border-rule px-2 md:static"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="font-mono text-[18px] font-semibold leading-none tabular-nums text-ink">
            {String(dayNum).padStart(2, '0')}
          </span>
          <span className="font-mono text-[18px] font-semibold uppercase leading-none text-ink">
            {monthName}
          </span>
        </div>
        <span className="font-mono text-[18px] leading-none text-muted">
          {dayName}
        </span>
      </div>

      <div className="flex-1 px-2 pb-5 pt-1">
        {dayTasks.length === 0 ? (
          <p className="px-2 py-3 font-mono text-xs uppercase tracking-[0.08em] text-faint">
            Open
          </p>
        ) : (
          dayTasks.map((task) => (
            <SharedTaskRow key={task.id} task={task} />
          ))
        )}
      </div>
    </div>
  )
}

export default function SharedWeekGrid({ weekStart, tasks }: Props) {
  const days = getWeekDays(weekStart)
  const weekdays = days.slice(0, 5)
  const saturday = days[5]
  const sunday = days[6]

  return (
    <>
      <div className="weekgrid flex-1 divide-y divide-rule overflow-y-auto pb-10 md:hidden">
        {days.map((day) => (
          <SharedDayColumn
            key={day.toISOString()}
            date={day}
            tasks={tasks}
          />
        ))}
      </div>

      <div className="mx-6 hidden min-h-0 flex-1 grid-cols-6 grid-rows-2 gap-px bg-rule md:grid">
        {weekdays.map((day) => (
          <div key={day.toISOString()} className="min-w-0">
            <SharedDayColumn date={day} tasks={tasks} />
          </div>
        ))}
        <div key={saturday.toISOString()} className="min-w-0">
          <SharedDayColumn date={saturday} tasks={tasks} />
        </div>
        <div className="col-start-1 col-end-6 row-start-2 grid place-items-center bg-bg p-6 text-center">
          <p className="max-w-md font-mono text-sm uppercase tracking-[0.08em] text-muted">
            Backlog is private and not included in shared week links.
          </p>
        </div>
        <div key={sunday.toISOString()} className="col-start-6 row-start-2 min-w-0">
          <SharedDayColumn date={sunday} tasks={tasks} />
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Verify read-only components compile**

Run:

```bash
rtk npm run build
```

Expected: build passes.

- [ ] **Step 4: Commit read-only components**

Run:

```bash
rtk git add src/components/SharedTaskRow.tsx src/components/SharedWeekGrid.tsx
rtk git commit -m "feat: add read-only shared week components"
```

Expected: commit succeeds.

## Task 6: Public Shared Week Page

**Files:**
- Create: `src/components/SharedWeekPage.tsx`

- [ ] **Step 1: Create public page component**

Create `src/components/SharedWeekPage.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import { formatWeekLabel } from '../dates'
import { loadSharedWeek } from '../lib/week-share'
import type { SharedWeekAvailable } from '../types'
import SharedWeekGrid from './SharedWeekGrid'

type Props = {
  token: string;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string }
  | { status: 'ready'; week: SharedWeekAvailable }

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00`)
}

export default function SharedWeekPage({ token }: Props) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function load() {
      setState({ status: 'loading' })
      try {
        const response = await loadSharedWeek(token)
        if (cancelled) return
        if (!response.ok) {
          setState({ status: 'unavailable' })
          return
        }
        setState({ status: 'ready', week: response })
      } catch (err) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Could not load this shared week.',
          })
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [token])

  if (state.status === 'loading') {
    return (
      <div className="h-[100dvh] grid place-items-center">
        <span className="font-mono text-sm text-muted">Loading shared week...</span>
      </div>
    )
  }

  if (state.status === 'unavailable') {
    return (
      <div className="h-[100dvh] grid place-items-center px-6 text-center">
        <div className="max-w-md">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
            Shared week
          </p>
          <h1 className="mt-2 font-mono text-2xl font-semibold text-ink">
            This link is unavailable
          </h1>
          <p className="mt-3 text-sm text-muted">
            The share link may have been revoked or mistyped.
          </p>
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="h-[100dvh] grid place-items-center px-6 text-center">
        <div className="max-w-md">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
            Shared week
          </p>
          <h1 className="mt-2 font-mono text-2xl font-semibold text-ink">
            Could not load this week
          </h1>
          <p className="mt-3 text-sm text-muted">{state.message}</p>
        </div>
      </div>
    )
  }

  const weekStart = parseDateKey(state.week.week_start)
  const isEmpty = state.week.tasks.length === 0

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <header className="border-b-2 border-rule px-4 py-4 sm:px-6 md:px-8">
        <p className="font-mono text-[11px] uppercase leading-none tracking-[0.08em] text-muted">
          Shared week plan
        </p>
        <h1 className="mt-1 font-mono text-[24px] font-semibold leading-none tracking-tight text-ink md:text-[22px]">
          {formatWeekLabel(weekStart)}
        </h1>
      </header>

      {isEmpty ? (
        <main className="grid flex-1 place-items-center px-6 text-center">
          <div className="max-w-md">
            <h2 className="font-mono text-xl font-semibold text-ink">
              No scheduled tasks shared
            </h2>
            <p className="mt-3 text-sm text-muted">
              This week has no scheduled tasks in the shared view.
            </p>
          </div>
        </main>
      ) : (
        <SharedWeekGrid weekStart={weekStart} tasks={state.week.tasks} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify page compiles**

Run:

```bash
rtk npm run build
```

Expected: build passes.

- [ ] **Step 3: Commit public page**

Run:

```bash
rtk git add src/components/SharedWeekPage.tsx
rtk git commit -m "feat: add public shared week page"
```

Expected: commit succeeds.

## Task 7: App Route And Owner Dialog Integration

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import share components**

In `src/App.tsx`, add:

```tsx
import ShareWeekDialog from './components/ShareWeekDialog'
import SharedWeekPage from './components/SharedWeekPage'
```

- [ ] **Step 2: Add public share route before auth loading**

Inside `App`, after state/hooks are declared and before `if (!authReady)`, add:

```tsx
  const shareMatch = window.location.pathname.match(/^\/share\/([^/]+)$/)
  if (shareMatch) {
    return <SharedWeekPage token={decodeURIComponent(shareMatch[1])} />
  }
```

Place this before the auth-ready loading branch so unauthenticated recipients never see `AuthScreen`.

- [ ] **Step 3: Add owner share state**

Add selected week state and dialog state near the existing review/about state:

```tsx
  const currentWeekStart = useStore(s => s.currentWeekStart)
  const [showShare, setShowShare] = useState(false)
```

- [ ] **Step 4: Wire WeekHeader callback**

Change:

```tsx
<WeekHeader onShowReview={() => setShowReview(true)} />
```

to:

```tsx
<WeekHeader
  onShowReview={() => setShowReview(true)}
  onShowShare={() => setShowShare(true)}
/>
```

- [ ] **Step 5: Render share dialog**

Add this near the existing `ReviewScreen` and `AboutScreen` overlays:

```tsx
{showShare && (
  <ShareWeekDialog
    weekStart={currentWeekStart}
    onClose={() => setShowShare(false)}
  />
)}
```

- [ ] **Step 6: Verify full integration**

Run:

```bash
rtk npm run build
```

Expected: build passes.

- [ ] **Step 7: Commit app integration**

Run:

```bash
rtk git add src/App.tsx
rtk git commit -m "feat: wire week share route and dialog"
```

Expected: commit succeeds.

## Task 8: Lint, Manual Verification, And Final Commit

**Files:**
- Modify if needed: any file from Tasks 1-7

- [ ] **Step 1: Run lint**

Run:

```bash
rtk npm run lint
```

Expected: lint passes. Fix lint failures in the files changed for this feature.

- [ ] **Step 2: Run production build**

Run:

```bash
rtk npm run build
```

Expected: build passes.

- [ ] **Step 3: Manual owner verification**

Run:

```bash
rtk npm run dev
```

Expected: Vite prints a local URL.

In the browser:

- Sign in.
- Open a week with at least one scheduled incomplete task, one scheduled completed task, and one backlog task.
- Click Share.
- Confirm a URL appears in the dialog.
- Click Copy link.
- Confirm button text changes to `Copied`.

- [ ] **Step 4: Manual recipient verification**

Open the copied URL in an incognito/private browser window.

Expected:

- The page loads without sign-in.
- Scheduled incomplete tasks are visible.
- Scheduled completed tasks are visible with completed styling.
- Backlog tasks are absent.
- No add, edit, delete, drag, review, or authenticated nav controls are visible.

- [ ] **Step 5: Manual live-view verification**

In the signed-in browser:

- Rename one scheduled task.
- Mark one scheduled task done or not done.
- Add one new scheduled task to the same week.

Reload the public share URL.

Expected:

- The renamed title is visible.
- The done state reflects the owner view.
- The new scheduled task is visible.

- [ ] **Step 6: Manual revocation verification**

In the signed-in browser:

- Open Share.
- Click Revoke.
- Reload the old public share URL.

Expected:

- The public page shows `This link is unavailable`.

Open Share again for the same week and copy the new URL.

Expected:

- The new URL contains a different token.
- The new URL loads the shared week.
- The old URL remains unavailable.

- [ ] **Step 7: Commit verification fixes**

If Tasks 8.1-8.6 required code changes, commit them:

```bash
rtk git status --short
rtk git add supabase/schema.sql src/nanoid.ts src/types.ts src/lib/week-share.ts src/components/ShareWeekDialog.tsx src/components/WeekHeader.tsx src/components/SharedTaskRow.tsx src/components/SharedWeekGrid.tsx src/components/SharedWeekPage.tsx src/App.tsx
rtk git commit -m "fix: polish week share verification"
```

Expected: commit succeeds if there were fixes. If there were no changes, `rtk git status --short` shows no staged feature files.

## Final Review Checklist

- [ ] `/share/:token` bypasses auth.
- [ ] Invalid and revoked tokens render the same unavailable state.
- [ ] Empty active weeks render an empty shared-week state.
- [ ] Public RPC returns only `id`, `title`, `date`, `done`, `color`, and `order`.
- [ ] Backlog tasks are excluded because `date is not null` is required.
- [ ] Completed tasks are included because there is no `done = false` filter.
- [ ] `week_shares` direct access is owner-only through RLS.
- [ ] Anonymous access uses only `get_shared_week`.
- [ ] Share tokens are generated with `nanoid(32)`.
- [ ] No unrelated dirty worktree changes are staged.
