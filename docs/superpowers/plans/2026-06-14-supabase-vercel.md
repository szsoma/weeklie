# weeklie → Supabase + Vercel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move weeklie from a local IndexedDB app to an online-first Supabase-backed app with email-OTP auth, then deploy to Vercel.

**Architecture:** Supabase becomes the single source of truth. Dexie/IndexedDB is removed. A Zustand store holds tasks in memory for the session and reads/writes Supabase directly with optimistic updates + revert-on-error. Auth gates the app (email OTP). Every table is RLS-protected and scoped by `user_id = auth.uid()`.

**Tech Stack:** React 19, Vite, TypeScript, Zustand, `@supabase/supabase-js`, Supabase (Postgres + Auth), Vercel.

---

## Verification approach (read this first)

This project has **no test runner** (no vitest/jest, no `test` script in `package.json`). Per YAGNI and the user's stated goal (connect + deploy), this plan does **not** introduce a test framework. Each task verifies via:

- `npx tsc -b` — typecheck (must pass, zero errors)
- `npm run build` — production build (must succeed)
- Dev-server smoke check — `npm run dev`, exercise the feature manually
- Direct SQL via Supabase MCP (`execute_sql`, `list_tables`) — confirm schema/data

This is a deliberate, flagged deviation from the skill's TDD default. If the user later wants a test suite, that is a separate plan.

## Spec refinements (decided during planning, well-justified)

1. **`last_rolled_over_at` is `text`, not `timestamptz`.** The app stores a date-only string (`"2026-06-14"`) and compares it by equality (`!== today`). A `timestamptz` would round-trip as a full ISO timestamp and break that equality. Same rationale as `date`/`planned_date` being `text` (already in spec).
2. **`loadTasks` sorts client-side** by `order` after fetch, instead of relying on Supabase's server-side `.order('order')`. `order` is a Postgres reserved word; client-side sort removes any reserved-word query risk. The DDL still quotes it as `"order"`.
3. **`week_reviews` upsert is manual** (select-then-update-or-insert) rather than `.upsert({ onConflict })`, to avoid composite-PK conflict-target ambiguity. PK stays `(user_id, week_id)`.

## File structure

**Created:**
- `src/lib/supabase.ts` — Supabase client singleton
- `src/components/AuthScreen.tsx` — email OTP login screen
- `.env.example` — template for env vars (committed)
- `.env` — real env vars (gitignored)
- `supabase/schema.sql` — the schema migration (committed for reference/reproducibility)

**Modified:**
- `src/types.ts` — fields renamed to snake_case (Supabase-native)
- `src/store.ts` — rewritten: Dexie → Supabase, optimistic + revert
- `src/rollover.ts` — one field rename (`lastRolledOverAt` → `last_rolled_over_at`)
- `src/components/ReviewScreen.tsx` — field renames (`createdAt`/`taskId`/`rolledOverCount` → snake_case), review object literal → snake_case
- `src/App.tsx` — auth gate + load-on-session
- `src/hooks/useRollover.ts` — run rollover after async load completes (regression fix)
- `src/main.tsx` — remove pre-emptive Dexie load
- `package.json` — add `@supabase/supabase-js`, remove `dexie`
- `.gitignore` — add `.env`

**Deleted:**
- `src/db.ts` — Dexie is gone

---

## Phase 1 — Supabase backend

### Task 1: Create the `weeklie` Supabase project + capture credentials

**Context:** Org `fluid` exists. No `weeklie` project exists yet (existing projects are unrelated). This task **incurs cost** — surface it to the user before confirming. Region default: `eu-central-1` (matches the user's other active project).

- [ ] **Step 1: Get the cost for a new project in org `fluid`**

Call MCP `get_cost` with `type: "project"`, `organization_id: "skkpbxchvwxvvevgibpx"`.
Present the returned hourly/monthly cost to the user and confirm they accept before proceeding. Do not skip this.

- [ ] **Step 2: Confirm the cost**

Call MCP `confirm_cost` with `type: "project"`, `recurrence` (from get_cost), `amount` (from get_cost). Capture the returned `confirm_cost_id`.

- [ ] **Step 3: Create the project**

Call MCP `create_project` with:
```
name: "weeklie"
region: "eu-central-1"
organization_id: "skkpbxchvwxvvevgibpx"
confirm_cost_id: <from step 2>
```
Capture the returned `id` (project ref). This is the **PROJECT_REF** used everywhere below.

- [ ] **Step 4: Wait for the project to be ready**

Call MCP `get_project` with `id: <PROJECT_REF>` every ~20s until `status` is `ACTIVE_HEALTHY` (timeout ~3 min). This is the one place a polling loop is acceptable.

- [ ] **Step 5: Capture the project URL + publishable key**

Call MCP `get_project_url` with `project_id: <PROJECT_REF>` → **SUPABASE_URL**.
Call MCP `get_publishable_keys` with `project_id: <PROJECT_REF>` → use the `sb_publishable_...` key if present, else the legacy `anon` key. → **SUPABASE_ANON_KEY**.

Record both values locally (they go into `.env` in Task 5). Do not commit them.

- [ ] **Step 6: Commit nothing yet** (no repo changes this task).

---

### Task 2: Apply the schema migration

**Files:**
- Create: `supabase/schema.sql`

- [ ] **Step 1: Write the full schema SQL to `supabase/schema.sql`**

```sql
-- weeklie schema
-- Note: last_rolled_over_at is TEXT (date-only string, see plan refinement #1).

create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  date text,
  done boolean not null default false,
  done_at timestamptz,
  color text,
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  planned_date text,
  rolled_over_count integer not null default 0,
  last_rolled_over_at text
);

create index if not exists tasks_user_date_idx on public.tasks (user_id, date);

create table if not exists public.task_events (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id text references public.tasks(id) on delete cascade,
  type text not null,
  from_date text,
  to_date text,
  created_at timestamptz not null default now()
);

create index if not exists task_events_user_created_idx on public.task_events (user_id, created_at);

create table if not exists public.week_reviews (
  week_id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  completed_count integer not null default 0,
  planned_count integer not null default 0,
  rolled_over_count integer not null default 0,
  reflection text not null default '',
  viewed_at timestamptz,
  streak integer not null default 0,
  completed_task_ids text[] not null default '{}',
  rolled_over_task_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_id)
);

-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

drop trigger if exists week_reviews_set_updated_at on public.week_reviews;
create trigger week_reviews_set_updated_at
  before update on public.week_reviews
  for each row execute function public.set_updated_at();
```

- [ ] **Step 2: Apply the SQL**

Call MCP `apply_migration` with `project_id: <PROJECT_REF>`, `name: "create_weeklie_schema"`, `query:` (the full SQL above).

- [ ] **Step 3: Verify tables exist**

Call MCP `list_tables` with `project_id: <PROJECT_REF>`, `schemas: ["public"]`, `verbose: false`.
Expected: `tasks`, `task_events`, `week_reviews` all present.

- [ ] **Step 4: Commit the reference SQL file**

```bash
git add supabase/schema.sql
git commit -m "chore: add weeklie supabase schema reference"
```

---

### Task 3: Enable RLS + create policies

- [ ] **Step 1: Apply RLS + per-owner policies**

Call MCP `apply_migration` with `project_id: <PROJECT_REF>`, `name: "enable_rls_and_policies"`, `query:`

```sql
alter table public.tasks enable row level security;
alter table public.task_events enable row level security;
alter table public.week_reviews enable row level security;

-- tasks
drop policy if exists "tasks owner select" on public.tasks;
create policy "tasks owner select" on public.tasks
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "tasks owner insert" on public.tasks;
create policy "tasks owner insert" on public.tasks
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "tasks owner update" on public.tasks;
create policy "tasks owner update" on public.tasks
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "tasks owner delete" on public.tasks;
create policy "tasks owner delete" on public.tasks
  for delete to authenticated using (user_id = auth.uid());

-- task_events
drop policy if exists "events owner select" on public.task_events;
create policy "events owner select" on public.task_events
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "events owner insert" on public.task_events;
create policy "events owner insert" on public.task_events
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "events owner update" on public.task_events;
create policy "events owner update" on public.task_events
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "events owner delete" on public.task_events;
create policy "events owner delete" on public.task_events
  for delete to authenticated using (user_id = auth.uid());

-- week_reviews
drop policy if exists "reviews owner select" on public.week_reviews;
create policy "reviews owner select" on public.week_reviews
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "reviews owner insert" on public.week_reviews;
create policy "reviews owner insert" on public.week_reviews
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "reviews owner update" on public.week_reviews;
create policy "reviews owner update" on public.week_reviews
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "reviews owner delete" on public.week_reviews;
create policy "reviews owner delete" on public.week_reviews
  for delete to authenticated using (user_id = auth.uid());
```

- [ ] **Step 2: Verify policies**

Call MCP `execute_sql` with `project_id: <PROJECT_REF>`, `query:`
```sql
select tablename, policyname, cmd from pg_policies where schemaname = 'public' order by tablename, cmd;
```
Expected: 4 policies per table (select/insert/update/delete), 12 total.

- [ ] **Step 3: Run security advisors**

Call MCP `get_advisors` with `project_id: <PROJECT_REF>`, `type: "security"`.
Fix anything reported against the three tables (most likely none, since RLS is on and policies use `auth.uid()` with `WITH CHECK`). Commit nothing (backend-only).

---

### Task 4: Configure Auth (email OTP) — owner registers, then lock signups

**Context:** First the owner must be able to register; afterward public signups are disabled.

- [ ] **Step 1: Confirm the Email provider is enabled**

Call MCP `execute_sql` with `project_id: <PROJECT_REF>`, `query:`
```sql
select id, ((config->>'external')::json->>'enabled')::boolean as email_enabled
from auth.identities where id = 'email';
```
If `email_enabled` is not `true` (or row absent), the owner enables it in the dashboard: **Authentication → Providers → Email → Enable**. (Auth config is not editable via the standard MCP tools; this is a one-time dashboard click. Note it as a manual step if needed.)

- [ ] **Step 2: Set the email OTP template to a 6-digit code**

In dashboard: **Authentication → Email Templates → Magic Link**. Replace `{{ .ConfirmationURL }}` with `Your weeklie code: {{ .Token }}`. This makes `signInWithOtp` deliver a 6-digit code the user types in. (One-time dashboard step.)

- [ ] **Step 3: Owner registers (do this AFTER the login screen exists — defer to Task 11)**

This step is executed during the Task 11 smoke test, not now. Leave a note: "Owner's first sign-in via the AuthScreen creates the account."

- [ ] **Step 4: Disable public signups (do this AFTER owner registered — defer to end of Phase 2)**

After the owner has registered once (Task 11), disable "Allow new users to sign up": dashboard **Authentication → Sign In / Providers → Email → turn off "Allow new users to sign up"**. RLS still protects data regardless.

- [ ] **Step 5: Commit nothing** (dashboard config only).

---

## Phase 2 — Client wiring

### Task 5: Install Supabase client, remove Dexie, set up env

- [ ] **Step 1: Install the client (pin version)**

```bash
npm install @supabase/supabase-js
```
Confirm `package.json` now lists `@supabase/supabase-js` with a pinned `^x.y.z` and `package-lock.json` is updated.

- [ ] **Step 2: Remove Dexie**

```bash
npm uninstall dexie
```
Confirm `dexie` is gone from `package.json`.

- [ ] **Step 3: Create `.env.example`**

Write file `.env.example`:
```
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-key
```

- [ ] **Step 4: Create `.env` with real values from Task 1**

Write file `.env`:
```
VITE_SUPABASE_URL=<SUPABASE_URL from Task 1 Step 5>
VITE_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY from Task 1 Step 5>
```

- [ ] **Step 5: Add `.env` to `.gitignore`**

In `.gitignore`, add (if not present):
```
# Env
.env
.env.local
.env.*.local
```
(Keep `.env.example` committed — it must NOT be ignored.)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example
git commit -m "chore: add supabase-js, remove dexie, add env template"
```

---

### Task 6: Create the Supabase client singleton

**Files:**
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: Write `src/lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in values.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: success (no errors). (If `import.meta.env` types complain, the existing `src/vite-env.d.ts` with `/// <reference types="vite/client" />` covers it.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat: add supabase client singleton"
```

---

### Task 7: Rename TS types to snake_case

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Replace the entire contents of `src/types.ts`**

```ts
export type Task = {
  id: string;
  title: string;
  date: string | null; // "2026-06-12", null = Backlog
  done: boolean;
  done_at: string | null;
  color: string | null; // "red" | "orange" | "yellow" | "green" | "blue" | "purple"
  order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  planned_date: string | null; // original scheduled date before rollover
  rolled_over_count: number;
  last_rolled_over_at: string | null; // date-only string "2026-06-14"
};

export type TaskEventType =
  | 'created'
  | 'updated'
  | 'completed'
  | 'reopened'
  | 'moved'
  | 'rolled-over'
  | 'deleted';

export type TaskEvent = {
  id: string;
  task_id: string;
  type: TaskEventType;
  from_date: string | null;
  to_date: string | null;
  created_at: string;
};

export type WeekReview = {
  week_id: string;
  completed_count: number;
  planned_count: number;
  rolled_over_count: number;
  reflection: string;
  viewed_at: string;
  streak: number;
  completed_task_ids: string[];
  rolled_over_task_ids: string[];
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 2: Do not typecheck yet** — `store.ts`, `rollover.ts`, `ReviewScreen.tsx` still reference old names and will error. They are fixed in Tasks 8, 9, 10.

- [ ] **Step 3: Commit (the dependent fixes land in the next tasks; commit together at end of Task 10)**

---

### Task 8: Update `rollover.ts` field name

**Files:**
- Modify: `src/rollover.ts`

- [ ] **Step 1: Update the `lastRolledOverAt` reference**

In `src/rollover.ts`, change:
```ts
         !t.done &&
         t.lastRolledOverAt !== today
```
to:
```ts
         !t.done &&
         t.last_rolled_over_at !== today
```

(Full resulting file for clarity:)
```ts
import type { Task } from './types'
import { formatDate } from './dates'

export function findOverdueTasks(tasks: Task[]): Task[] {
  const today = formatDate(new Date())
  return tasks.filter(
    t => t.date !== null &&
         t.date < today &&
         !t.done &&
         t.last_rolled_over_at !== today
  )
}
```

---

### Task 9: Rewrite `src/store.ts` (Dexie → Supabase, optimistic + revert)

**Files:**
- Modify: `src/store.ts` (full rewrite)

- [ ] **Step 1: Replace the entire contents of `src/store.ts`**

```ts
import { create } from 'zustand'
import { supabase } from './lib/supabase'
import { createId } from './nanoid'
import { formatDate, getWeekStart } from './dates'
import type { Task, TaskEvent, TaskEventType, WeekReview } from './types'

async function logEvent(
  taskId: string,
  type: TaskEventType,
  fromDate: string | null = null,
  toDate: string | null = null,
) {
  const event: TaskEvent = {
    id: createId(),
    task_id: taskId,
    type,
    from_date: fromDate,
    to_date: toDate,
    created_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('task_events').insert(event)
  if (error) console.error('Failed to log event', error)
}

const HIDE_DONE_KEY = 'weeklie.hideDone'
function readHideDone(): boolean {
  try {
    return globalThis.localStorage?.getItem(HIDE_DONE_KEY) === '1'
  } catch {
    return false
  }
}

type State = {
  tasks: Task[]
  events: TaskEvent[]
  reviews: WeekReview[]
  currentWeekStart: Date
  isLoading: boolean
  hideDone: boolean
}

type Actions = {
  loadTasks: () => Promise<void>
  loadEvents: () => Promise<void>
  loadReviews: () => Promise<void>
  addTask: (title: string, date: string | null) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  toggleDone: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  moveTask: (id: string, newDate: string | null, newOrder: number) => Promise<void>
  setCurrentWeekStart: (date: Date) => void
  rolloverTasks: () => Promise<number>
  saveReview: (review: WeekReview) => Promise<void>
  normalizeOrders: (date: string) => void
  setHideDone: (value: boolean) => void
}

export const useStore = create<State & Actions>((set, get) => ({
  tasks: [],
  events: [],
  reviews: [],
  currentWeekStart: getWeekStart(new Date()),
  isLoading: true,
  hideDone: readHideDone(),

  loadTasks: async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .is('deleted_at', null)
    if (error) {
      console.error('loadTasks failed', error)
      set({ isLoading: false })
      return
    }
    const tasks = ((data as Task[]) ?? []).slice().sort((a, b) => a.order - b.order)
    set({ tasks, isLoading: false })
  },

  loadEvents: async () => {
    const { data, error } = await supabase.from('task_events').select('*')
    if (error) {
      console.error('loadEvents failed', error)
      return
    }
    set({ events: (data as TaskEvent[]) ?? [] })
  },

  loadReviews: async () => {
    const { data, error } = await supabase.from('week_reviews').select('*')
    if (error) {
      console.error('loadReviews failed', error)
      return
    }
    set({ reviews: (data as WeekReview[]) ?? [] })
  },

  addTask: async (title, date) => {
    const tasks = get().tasks
    const dayTasks = tasks.filter(t => t.date === date)
    const maxOrder = dayTasks.length > 0 ? Math.max(...dayTasks.map(t => t.order)) : 0
    const now = new Date().toISOString()
    const task: Task = {
      id: createId(),
      title,
      date,
      done: false,
      done_at: null,
      color: null,
      order: maxOrder + 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      planned_date: date,
      rolled_over_count: 0,
      last_rolled_over_at: null,
    }
    // optimistic insert; revert on error
    set({ tasks: [...tasks, task] })
    const { error } = await supabase.from('tasks').insert(task)
    if (error) {
      console.error('addTask failed', error)
      set({ tasks: get().tasks.filter(t => t.id !== task.id) })
      return
    }
    await logEvent(task.id, 'created', null, date)
  },

  updateTask: async (id, updates) => {
    const prev = get().tasks
    const now = new Date().toISOString()
    const updatesWithTs = { ...updates, updated_at: now }
    set({ tasks: prev.map(t => (t.id === id ? { ...t, ...updatesWithTs } : t)) })
    const { error } = await supabase.from('tasks').update(updatesWithTs).eq('id', id)
    if (error) {
      console.error('updateTask failed', error)
      set({ tasks: prev }) // revert
    }
  },

  toggleDone: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const done = !task.done
    const now = new Date().toISOString()
    await get().updateTask(id, { done, done_at: done ? now : null })
    await logEvent(id, done ? 'completed' : 'reopened', task.date, task.date)
  },

  deleteTask: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const now = new Date().toISOString()
    const prev = get().tasks
    // optimistic soft-delete: hide immediately
    set({ tasks: prev.filter(t => t.id !== id) })
    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', id)
    if (error) {
      console.error('deleteTask failed', error)
      set({ tasks: prev }) // revert
      return
    }
    await logEvent(id, 'deleted', task.date, null)
  },

  moveTask: async (id, newDate, newOrder) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    await get().updateTask(id, { date: newDate, order: newOrder })
    await logEvent(id, 'moved', task.date, newDate)

    const dayTasks = get().tasks
      .filter(t => t.date === newDate && t.id !== id)
      .map(t => t.order)

    const needsNormalization = dayTasks.some(o => Math.abs(o - newOrder) < 0.001)
    if (needsNormalization) {
      setTimeout(() => get().normalizeOrders(newDate!), 0)
    }
  },

  setCurrentWeekStart: (date) => set({ currentWeekStart: date }),

  rolloverTasks: async () => {
    const tasks = get().tasks
    const today = formatDate(new Date())
    const overdue = tasks.filter(
      t => t.date !== null &&
           t.date < today &&
           !t.done &&
           t.last_rolled_over_at !== today,
    )

    for (const task of overdue) {
      await get().updateTask(task.id, {
        date: today,
        rolled_over_count: task.rolled_over_count + 1,
        last_rolled_over_at: today,
        planned_date: task.planned_date ?? task.date,
      })
      await logEvent(task.id, 'rolled-over', task.date, today)
    }

    return overdue.length
  },

  saveReview: async (review) => {
    const prev = get().reviews
    // optimistic
    set({ reviews: prev.filter(r => r.week_id !== review.week_id).concat(review) })

    const { data: existing, error: selErr } = await supabase
      .from('week_reviews')
      .select('week_id')
      .eq('week_id', review.week_id)
      .maybeSingle()

    const now = new Date().toISOString()
    if (selErr) {
      console.error('saveReview select failed', selErr)
      set({ reviews: prev })
      return
    }

    if (existing) {
      const { error } = await supabase
        .from('week_reviews')
        .update({ ...review, updated_at: now })
        .eq('week_id', review.week_id)
      if (error) {
        console.error('saveReview update failed', error)
        set({ reviews: prev })
      }
    } else {
      const { error } = await supabase
        .from('week_reviews')
        .insert({ ...review, created_at: now, updated_at: now })
      if (error) {
        console.error('saveReview insert failed', error)
        set({ reviews: prev })
      }
    }
  },

  normalizeOrders: (date) => {
    const { tasks, updateTask } = get()
    const dayTasks = tasks.filter(t => t.date === date).sort((a, b) => a.order - b.order)
    dayTasks.forEach((task, index) => {
      const newOrder = (index + 1) * 1000
      if (task.order !== newOrder) {
        updateTask(task.id, { order: newOrder })
      }
    })
  },

  setHideDone: (value) => {
    try {
      globalThis.localStorage?.setItem(HIDE_DONE_KEY, value ? '1' : '0')
    } catch {
      // ignore storage failures (private mode, etc.)
    }
    set({ hideDone: value })
  },
}))
```

---

### Task 10: Update `ReviewScreen.tsx` field references

**Files:**
- Modify: `src/components/ReviewScreen.tsx`

- [ ] **Step 1: Rename `e.createdAt` → `e.created_at` (line ~30)**

Change:
```tsx
    const eventDate = e.createdAt.slice(0, 10);
```
to:
```tsx
    const eventDate = e.created_at.slice(0, 10);
```

- [ ] **Step 2: Rename `e.taskId` → `e.task_id` (two occurrences, lines ~38, ~44)**

Change both `e.taskId` to `e.task_id`:
```tsx
      weekEvents.filter((e) => e.type === "completed").map((e) => e.task_id),
```
and
```tsx
      weekEvents.filter((e) => e.type === "rolled-over").map((e) => e.task_id),
```

- [ ] **Step 3: Rename `task.rolledOverCount` → `task.rolled_over_count` (line ~140)**

Change:
```tsx
                  moved {task.rolledOverCount}×
```
to:
```tsx
                  moved {task.rolled_over_count}×
```

- [ ] **Step 4: Rewrite the `review` object literal in `handleSave` to snake_case (lines ~58–70)**

Change:
```tsx
    const review: WeekReview = {
      weekId,
      completedCount: completed.length,
      plannedCount: weekTasks.length,
      rolledOverCount: rolledOver.length,
      reflection,
      viewedAt: now,
      streak,
      completedTaskIds,
      rolledOverTaskIds,
      createdAt: now,
      updatedAt: now,
    };
```
to:
```tsx
    const review: WeekReview = {
      week_id: weekId,
      completed_count: completed.length,
      planned_count: weekTasks.length,
      rolled_over_count: rolledOver.length,
      reflection,
      viewed_at: now,
      streak,
      completed_task_ids: completedTaskIds,
      rolled_over_task_ids: rolledOverTaskIds,
      created_at: now,
      updated_at: now,
    };
```
(Note: `weekId`, `completedTaskIds`, `rolledOverTaskIds` stay as local JS variable names; only the object *keys* change.)

- [ ] **Step 5: Typecheck Tasks 7–10 together**

Run: `npx tsc -b`
Expected: success. If errors remain, they reference the old camelCase names — fix any stragglers. (`reviews[...].streak` on line ~54 is fine — `streak` is single-word, unchanged.)

- [ ] **Step 6: Commit Tasks 7–10**

```bash
git add src/types.ts src/rollover.ts src/store.ts src/components/ReviewScreen.tsx
git commit -m "feat: switch store + types to supabase (snake_case, optimistic writes)"
```

---

### Task 11: Remove Dexie `db.ts`, update `main.tsx`

**Files:**
- Delete: `src/db.ts`
- Modify: `src/main.tsx`

- [ ] **Step 1: Delete `src/db.ts`**

```bash
git rm src/db.ts
```

- [ ] **Step 2: Replace `src/main.tsx` — no pre-emptive load**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
```

(Task loading now happens in `App` after auth, in Task 13.)

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc -b && npm run build`
Expected: success. (App won't run correctly yet — auth gate + load wiring lands in Task 13 — but it must compile.)

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx
git commit -m "refactor: remove dexie db, drop pre-emptive load from bootstrap"
```

---

### Task 12: Create `AuthScreen.tsx` (email OTP)

**Files:**
- Create: `src/components/AuthScreen.tsx`

- [ ] **Step 1: Write `src/components/AuthScreen.tsx`**

```tsx
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setBusy(false);
    if (error) setError(error.message);
    // on success, App's onAuthStateChange flips to the app
  };

  return (
    <div className="h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-mono font-semibold text-2xl tracking-tight mb-1">
          weeklie
        </h1>
        <p className="text-sm text-muted mb-8">
          {sent ? "Enter the 6-digit code sent to your email." : "Sign in to sync your week."}
        </p>

        {!sent ? (
          <form onSubmit={sendCode} className="space-y-4">
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-transparent border-b border-rule-strong outline-none py-2.5 text-[17px] placeholder:text-faint focus:border-ink transition-colors"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 bg-ink text-bg rounded-md font-mono text-[14px] uppercase hover:opacity-80 active:scale-[0.99] transition disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <input
              type="text"
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full bg-transparent border-b border-rule-strong outline-none py-2.5 text-[17px] tracking-[0.4em] placeholder:text-faint placeholder:tracking-normal focus:border-ink transition-colors"
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full py-3.5 bg-ink text-bg rounded-md font-mono text-[14px] uppercase hover:opacity-80 active:scale-[0.99] transition disabled:opacity-50"
            >
              {busy ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setCode("");
              }}
              className="w-full text-[12px] font-mono uppercase text-muted hover:text-ink"
            >
              ← use a different email
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AuthScreen.tsx
git commit -m "feat: add email-otp auth screen"
```

---

### Task 13: Gate `App.tsx` on auth + load data on session

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add auth + loading wiring at the top of `App`**

In `src/App.tsx`:

Add imports (top of file, after existing imports):
```tsx
import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import AuthScreen from './components/AuthScreen'
```
(If `useState` is already imported, do not duplicate. `useEffect` is new.)

Replace the body of `App()`. The full new `App.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, useDndContext } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import type { Session } from '@supabase/supabase-js'
import WeekHeader from './components/WeekHeader'
import WeekGrid from './components/WeekGrid'
import ReviewScreen from './components/ReviewScreen'
import AuthScreen from './components/AuthScreen'
import { supabase } from './lib/supabase'
import { useStore } from './store'
import { useRollover } from './hooks/useRollover'
import Toast from './components/Toast'

function TaskDragOverlay() {
  const { active } = useDndContext()
  const activeTask = useStore(s =>
    active?.id ? s.tasks.find(t => t.id === active.id) ?? null : null
  )

  if (!activeTask) return null

  return (
    <DragOverlay dropAnimation={null}>
      <div className="opacity-90 bg-surface border border-rule-strong rounded-md px-4 py-3 shadow-lg text-[19px] cursor-grabbing">
        {activeTask.title}
      </div>
    </DragOverlay>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setAuthReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const { toast: rolloverToast, clearToast } = useRollover()
  const moveTask = useStore(s => s.moveTask)
  const loadTasks = useStore(s => s.loadTasks)
  const loadEvents = useStore(s => s.loadEvents)
  const loadReviews = useStore(s => s.loadReviews)
  const isLoading = useStore(s => s.isLoading)

  // Load data once a session exists.
  useEffect(() => {
    if (!session) return
    loadTasks()
    loadEvents()
    loadReviews()
  }, [session, loadTasks, loadEvents, loadReviews])

  const [showReview, setShowReview] = useState(false)
  const today = new Date()
  const isSunday = today.getDay() === 0

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const taskId = active.id as string
    const targetDate = over.data.current?.date as string | null
    let targetOrder = over.data.current?.order as number | undefined

    if (targetDate === undefined) return

    if (targetOrder === undefined) {
      const tasks = useStore.getState().tasks.filter(t => t.date === targetDate && t.id !== taskId)
      targetOrder = tasks.length > 0
        ? Math.max(...tasks.map(t => t.order)) + 1
        : 1
    }

    moveTask(taskId, targetDate, targetOrder)
  }

  if (!authReady) {
    return (
      <div className="h-screen grid place-items-center">
        <span className="font-mono text-sm text-muted">Loading…</span>
      </div>
    )
  }

  if (!session) {
    return <AuthScreen />
  }

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col">
        {isLoading ? (
          <div className="h-screen grid place-items-center">
            <span className="font-mono text-sm text-muted">Loading your week…</span>
          </div>
        ) : (
          <>
            <WeekHeader />
            <WeekGrid />
          </>
        )}
      </div>
      {isSunday && !showReview && (
        <button
          onClick={() => setShowReview(true)}
          className="fixed top-2 left-1/2 -translate-x-1/2 bg-ink text-bg px-5 py-2.5 rounded-full font-mono text-[13px] uppercase tracking-[0.12em] shadow-lg z-40"
        >
          Ready for your weekly review?
        </button>
      )}
      {showReview && <ReviewScreen onClose={() => setShowReview(false)} />}
      {rolloverToast && (
        <Toast
          message={rolloverToast.message}
          onDismiss={clearToast}
        />
      )}
      <TaskDragOverlay />
    </DndContext>
  )
}
```

- [ ] **Step 2: Fix `useRollover` so rollover runs after async load (regression fix)**

**Files:**
- Modify: `src/hooks/useRollover.ts`

**Why:** Previously tasks loaded *before* render (old `main.tsx`), so `useRollover`'s mount effect saw populated tasks. Now tasks load async after auth, so the mount effect sees an empty list and the daily rollover never fires. Tie the effect to `isLoading` instead.

Replace the entire contents of `src/hooks/useRollover.ts`:

```ts
import { useEffect, useState } from 'react'
import { useStore } from '../store'

export function useRollover() {
  const [toast, setToast] = useState<{ message: string; count: number } | null>(null)
  const isLoading = useStore((s) => s.isLoading)

  useEffect(() => {
    if (isLoading) return // wait until the first load completes
    const run = async () => {
      const count = await useStore.getState().rolloverTasks()
      if (count > 0) {
        setToast({ message: `${count} task${count > 1 ? 's' : ''} moved to today`, count })
      }
    }
    run()
  }, [isLoading])

  return { toast, clearToast: () => setToast(null) }
}
```

(`rolloverTasks` is idempotent — sets `last_rolled_over_at = today` — so a StrictMode double-invoke in dev is safe.)

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc -b && npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/hooks/useRollover.ts
git commit -m "feat: gate app on auth session, load data after login"
```

---

### Task 14: End-to-end smoke test (local)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Owner registers via the AuthScreen**

Open the printed localhost URL. Enter the owner's email → "Send code". Check inbox for the 6-digit code (from the template set in Task 4 Step 2). Enter it → "Verify".

Expected: app loads (empty week, no tasks yet — fresh start). `onAuthStateChange` persists the session.

- [ ] **Step 3: Exercise core flows**

- Add a task to a day → verify it appears; verify it persisted: call MCP `execute_sql`:
  ```sql
  select id, title, date, user_id from public.tasks where deleted_at is null;
  ```
  Expected: one row with `user_id` = the owner's auth UID.
- Toggle done, drag between days, delete a task.
- Verify `task_events` rows are created:
  ```sql
  select type, count(*) from public.task_events group by type;
  ```

- [ ] **Step 4: Refresh the page**

Expected: session persists (no re-login), tasks reload from Supabase.

- [ ] **Step 5: Disable public signups (Task 4 Step 4 — now safe)**

In dashboard: **Authentication → Providers → Email → turn off "Allow new users to sign up."** The owner is already registered; no one else can sign up. (RLS still protects all data regardless.)

- [ ] **Step 6: Commit nothing** (smoke test only). Leave dev server running for the next phase if convenient.

---

## Phase 3 — Deploy to Vercel

### Task 15: Merge to `master` and push

**Context:** Vercel deploys from `master`. All Phase 2 work is on `feat/supabase-integration`.

- [ ] **Step 1: Ensure working tree is clean on the branch**

```bash
git status
```
Expected: clean (all committed).

- [ ] **Step 2: Switch to master, merge, push**

```bash
git checkout master
git merge --no-ff feat/supabase-integration -m "Merge Supabase + Vercel integration"
git push origin master
```

- [ ] **Step 3: Verify push succeeded**

Confirm `git log origin/master` includes the merge commit.

---

### Task 16: Deploy on Vercel

**Context:** Vercel import is a browser OAuth flow the agent cannot perform. Two paths — try CLI first, fall back to dashboard.

- [ ] **Step 1 (preferred): Vercel CLI, if authenticated**

Check:
```bash
vercel --version 2>/dev/null && vercel whoami
```
If `whoami` returns a user:
```bash
vercel link        # link szsoma/weeklie (confirm prompts)
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```
(Paste the values from `.env` when prompted; add to both Preview and Production.)
Then:
```bash
vercel --prod      # production deploy
```
Capture the production URL from the output.

- [ ] **Step 2 (fallback): Dashboard import, if CLI not authenticated**

Give the user these exact steps:
1. Go to https://vercel.com/new
2. Import the `szsoma/weeklie` GitHub repo
3. Framework Preset: **Vite** (auto-detected). Build Command `npm run build`, Output Directory `dist`. Leave as-is.
4. **Environment Variables** — add both:
   - `VITE_SUPABASE_URL` = `<SUPABASE_URL>`
   - `VITE_SUPABASE_ANON_KEY` = `<SUPABASE_ANON_KEY>`
5. Click **Deploy**.

- [ ] **Step 3: Configure Supabase auth redirect (so magic-link/code flows resolve on the prod domain)**

In Supabase dashboard: **Authentication → URL Configuration → Site URL** = the Vercel production URL (e.g. `https://weeklie.vercel.app`). Add the same URL under **Redirect URLs**, plus `http://localhost:5173` for local dev.

- [ ] **Step 4: Production smoke test**

Open the Vercel URL. Log in (OTP). Add a task. Refresh. Confirm it persisted and matches local. Done.

---

## Done criteria

- [ ] `master` builds clean (`npm run build`) and is deployed on Vercel.
- [ ] Supabase has 3 RLS-protected tables; owner can read/write only their rows.
- [ ] Email-OTP login works on the production URL; public signups disabled.
- [ ] Tasks/events/reviews persist across reloads and devices.
- [ ] `.env` is gitignored; `.env.example` committed; no secrets in git.
```
