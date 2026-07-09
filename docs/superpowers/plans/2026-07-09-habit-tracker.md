# Habit Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a minimal-space habit tracker for Weeklie using rule-based recurrence. Habits are configured per-task via a macOS Reminders-style repeat UI inside the existing task settings popover. The scheduler generates concrete task rows for the current week only, on Sundays at 00:00 and whenever a week is loaded.

**Architecture:** A normal task owns a `habit_templates` row. A Sunday scheduler computes due dates for the current week and creates normal `Task` rows plus `habit_instances` records linking them back to the template. Users complete generated rows as ordinary tasks. Progress is derived from task completion state. All persistence uses existing Supabase patterns; all state mutations use the existing Zustand store.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Tailwind CSS v4, Zustand 5, Supabase JS v2, date-fns 4, native popover API, Node `node:test` source tests.

**Spec:** `docs/superpowers/specs/2026-07-09-habit-tracker-design.md`

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `supabase/schema.sql` | Reference database schema, indexes, triggers, RLS | Modify |
| `src/types.ts` | App data contracts | Modify |
| `src/lib/habits.ts` | Pure recurrence helpers: due dates, summaries, progress, presets | Create |
| `src/lib/scheduler.ts` | Timeout helper to run generation at Sunday 00:00 local time | Create |
| `src/store.ts` | State and Supabase actions for templates and instances | Modify |
| `src/components/HabitRepeatPopover.tsx` | Preset + custom repeat UI panel | Create |
| `src/components/TaskRow.tsx` | Existing task row; add habit repeat trigger in settings popover | Modify |
| `src/App.tsx` | Load/generate habits and start scheduler | Modify |
| `tests/habit-tracker.test.mjs` | Source tests for schema, types, helpers, store, UI | Create |
| `package.json` | Test script | Modify |

## Implementation Notes

- Keep date storage consistent with the current app: `YYYY-MM-DD` text keys in TypeScript and Supabase.
- Generated habit rows are normal tasks and use the existing `addTask` action.
- Use `user_id uuid not null default auth.uid()` for new tables, matching existing patterns.
- Use Supabase RLS policies with `to authenticated`, `using ((select auth.uid()) = user_id)`, and `with check ((select auth.uid()) = user_id)`.
- Use `.insert(...).select().single()` for `habit_templates` creation because the UI may need the persisted row. For `habit_instances` we already know the ID (created with `createId()`), so `.insert()` without select is acceptable.
- Use task title, color, note, and due_time from the template's base task when generating instances.
- `RECURRENCE_OPTIONS` inside `TaskRow` settings will be replaced by a habit repeat trigger; the existing `task.recurrence` field is left untouched for backward compatibility but is no longer edited in the UI.
- The scheduler runs as a browser timeout. It is not a backend cron, so generation only happens while the app is open or when a week is loaded.
- Monthly/yearly rules store `startDayOfMonth` and `startMonth` and generate a task only when the matching date is inside the current week.

---

### Task 1: Database Schema, RLS, and Schema Test

**Files:**
- Modify: `supabase/schema.sql`
- Create: `tests/habit-tracker.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing schema test**

Create `tests/habit-tracker.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
const types = readFileSync(new URL("../src/types.ts", import.meta.url), "utf8");

test("schema defines habit tables and constraints", () => {
  assert.match(schema, /create table if not exists public\.habit_templates/);
  assert.match(schema, /create table if not exists public\.habit_instances/);
  assert.match(schema, /habit_template_id text not null references public\.habit_templates/);
  assert.match(schema, /task_id text not null references public\.tasks/);
  assert.match(schema, /unique \(habit_template_id, for_date\)/);
});

test("schema scopes habit data to authenticated users", () => {
  for (const table of ["habit_templates", "habit_instances"]) {
    assert.match(schema, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(schema, new RegExp(`Users can read own ${table}`));
    assert.match(schema, new RegExp(`Users can create own ${table}`));
    assert.match(schema, new RegExp(`Users can update own ${table}`));
  }
});

test("TypeScript exports habit types", () => {
  assert.match(types, /export type RecurrencePreset =/);
  assert.match(types, /export type RecurrenceRule =/);
  assert.match(types, /export type HabitTemplate =/);
  assert.match(types, /export type HabitInstance =/);
});
```

- [ ] **Step 2: Add a package script for the habit tracker test**

In `package.json`, add:

```json
"test:habit-tracker": "node --test tests/habit-tracker.test.mjs"
```

- [ ] **Step 3: Run the failing test**

Run:

```bash
rtk npm run test:habit-tracker
```

Expected: FAIL because schema and types do not yet contain the new definitions.

- [ ] **Step 4: Add database tables, indexes, triggers, and RLS**

In `supabase/schema.sql`, immediately after the `day_checkins` index block and before the `updated_at trigger function` section, add:

```sql
-- ============================================================
-- Habit tables
-- ============================================================

create table if not exists public.habit_templates (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id text not null references public.tasks(id) on delete cascade,
  recurrence jsonb not null default '{"freq":"weekly","interval":1,"byWeekdays":[]}'::jsonb,
  target_per_period integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_instances (
  id text primary key,
  habit_template_id text not null references public.habit_templates(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id text not null references public.tasks(id) on delete cascade,
  for_date text not null,
  period_start text not null,
  created_at timestamptz not null default now()
);

create index if not exists habit_templates_user_id_idx
  on public.habit_templates (user_id);

create index if not exists habit_instances_user_id_date_idx
  on public.habit_instances (user_id, for_date);

create unique index if not exists habit_instances_template_date_idx
  on public.habit_instances (habit_template_id, for_date);
```

After the existing `day_checkins_set_updated_at` trigger, add:

```sql
drop trigger if exists habit_templates_set_updated_at on public.habit_templates;
create trigger habit_templates_set_updated_at
  before update on public.habit_templates
  for each row execute function public.set_updated_at();

drop trigger if exists habit_instances_set_updated_at on public.habit_instances;
create trigger habit_instances_set_updated_at
  before update on public.habit_instances
  for each row execute function public.set_updated_at();
```

After the existing `alter table public.day_checkins enable row level security;`, add:

```sql
alter table public.habit_templates enable row level security;
alter table public.habit_instances enable row level security;
```

After the existing day check-in policies, add:

```sql
-- Habit templates RLS
drop policy if exists "Users can read own habit_templates" on public.habit_templates;
create policy "Users can read own habit_templates"
  on public.habit_templates for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own habit_templates" on public.habit_templates;
create policy "Users can create own habit_templates"
  on public.habit_templates for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own habit_templates" on public.habit_templates;
create policy "Users can update own habit_templates"
  on public.habit_templates for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Habit instances RLS
drop policy if exists "Users can read own habit_instances" on public.habit_instances;
create policy "Users can read own habit_instances"
  on public.habit_instances for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own habit_instances" on public.habit_instances;
create policy "Users can create own habit_instances"
  on public.habit_instances for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own habit_instances" on public.habit_instances;
create policy "Users can update own habit_instances"
  on public.habit_instances for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
rtk npm run test:habit-tracker
rtk npm run lint
rtk git status --short
rtk git add supabase/schema.sql tests/habit-tracker.test.mjs package.json
rtk git commit -m "feat: add habit tracker schema and tests"
```

Expected: schema test still fails on TypeScript types; that is fixed in the next task. Lint should pass.

---

### Task 2: TypeScript Contracts

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add habit and recurrence types**

In `src/types.ts`, after the existing `Task` and related types, add:

```ts
export type RecurrencePreset =
  | 'never'
  | 'daily'
  | 'weekdays'
  | 'weekends'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom';

export type RecurrenceRule = {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  byWeekdays: number[]; // 0 = Sunday, 6 = Saturday
  startDayOfMonth?: number;
  startMonth?: number;
};

export type HabitTemplate = {
  id: string;
  user_id: string;
  task_id: string;
  recurrence: RecurrenceRule;
  target_per_period: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type HabitInstance = {
  id: string;
  habit_template_id: string;
  user_id: string;
  task_id: string;
  for_date: string;
  period_start: string;
  created_at: string;
};
```

- [ ] **Step 2: Verify and commit**

Run:

```bash
rtk npm run test:habit-tracker
rtk npm run lint
rtk git status --short
rtk git add src/types.ts
rtk git commit -m "feat: add habit tracker types"
```

Expected: schema/type tests pass. Lint passes.

---

### Task 3: Pure Habit Helpers

**Files:**
- Create: `src/lib/habits.ts`
- Modify: `tests/habit-tracker.test.mjs`

- [ ] **Step 1: Extend the test for helpers**

Append to `tests/habit-tracker.test.mjs`:

```js
const habits = readFileSync(new URL("../src/lib/habits.ts", import.meta.url), "utf8");

test("habit helpers export required functions", () => {
  assert.match(habits, /export function getDueDatesForWeek/);
  assert.match(habits, /export function formatRecurrenceSummary/);
  assert.match(habits, /export function getHabitProgress/);
  assert.match(habits, /export function getNextSundayMidnight/);
  assert.match(habits, /export function presetToRule/);
});

test("habit helpers handle daily, weekly, and monthly presets", () => {
  assert.match(habits, /case 'daily':/);
  assert.match(habits, /case 'weekly':/);
  assert.match(habits, /case 'monthly':/);
  assert.match(habits, /byWeekdays/);
});
```

- [ ] **Step 2: Run the failing helper test**

Run:

```bash
rtk npm run test:habit-tracker
```

Expected: FAIL because `src/lib/habits.ts` does not exist yet.

- [ ] **Step 3: Create the helper module**

Create `src/lib/habits.ts`:

```ts
import { formatDate, getWeekDays, getWeekStart } from '../dates'
import type { HabitInstance, HabitTemplate, RecurrencePreset, RecurrenceRule, Task } from '../types'

const JS_WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const FULL_WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function presetToRule(
  preset: RecurrencePreset,
  baseDate: Date,
): RecurrenceRule | null {
  if (preset === 'never') return null

  if (preset === 'daily') {
    return { freq: 'daily', interval: 1, byWeekdays: [] }
  }

  if (preset === 'weekdays') {
    return { freq: 'weekly', interval: 1, byWeekdays: [1, 2, 3, 4, 5] }
  }

  if (preset === 'weekends') {
    return { freq: 'weekly', interval: 1, byWeekdays: [0, 6] }
  }

  if (preset === 'weekly') {
    return { freq: 'weekly', interval: 1, byWeekdays: [baseDate.getDay()] }
  }

  if (preset === 'monthly') {
    return { freq: 'monthly', interval: 1, byWeekdays: [], startDayOfMonth: baseDate.getDate() }
  }

  if (preset === 'yearly') {
    return {
      freq: 'yearly',
      interval: 1,
      byWeekdays: [],
      startDayOfMonth: baseDate.getDate(),
      startMonth: baseDate.getMonth() + 1,
    }
  }

  return null
}

export function getDueDatesForWeek(
  rule: RecurrenceRule,
  weekStart: Date,
): Date[] {
  const days = getWeekDays(weekStart)

  if (rule.freq === 'daily') {
    return days
  }

  if (rule.freq === 'weekly') {
    if (rule.byWeekdays.length > 0) {
      return days.filter((day) => rule.byWeekdays.includes(day.getDay()))
    }
    return [weekStart]
  }

  if (rule.freq === 'monthly') {
    const day = rule.startDayOfMonth ?? weekStart.getDate()
    const match = days.find((d) => d.getDate() === day)
    return match ? [match] : []
  }

  if (rule.freq === 'yearly') {
    const day = rule.startDayOfMonth ?? weekStart.getDate()
    const month = rule.startMonth ?? weekStart.getMonth() + 1
    const match = days.find(
      (d) => d.getDate() === day && d.getMonth() + 1 === month,
    )
    return match ? [match] : []
  }

  return []
}

export function formatRecurrenceSummary(rule: RecurrenceRule): string {
  if (rule.freq === 'daily') {
    return rule.interval === 1 ? 'Daily' : `Every ${rule.interval} days`
  }

  if (rule.freq === 'weekly') {
    if (rule.byWeekdays.length === 0) {
      return rule.interval === 1 ? 'Weekly' : `Every ${rule.interval} weeks`
    }
    const days = rule.byWeekdays
      .slice()
      .sort((a, b) => a - b)
      .map((d) => JS_WEEKDAY_LABELS[d])
      .join(', ')
    return rule.interval === 1 ? `Weekly on ${days}` : `Every ${rule.interval} weeks on ${days}`
  }

  if (rule.freq === 'monthly') {
    return rule.interval === 1 ? 'Monthly' : `Every ${rule.interval} months`
  }

  if (rule.freq === 'yearly') {
    return rule.interval === 1 ? 'Yearly' : `Every ${rule.interval} years`
  }

  return 'Custom'
}

export function getHabitProgress(
  template: HabitTemplate,
  periodStart: Date,
  tasks: Task[],
  instances: HabitInstance[],
): { completed: number; total: number } {
  const periodKey = formatDate(periodStart)
  const periodInstances = instances.filter(
    (inst) => inst.habit_template_id === template.id && inst.period_start === periodKey,
  )
  const taskIds = new Set(periodInstances.map((inst) => inst.task_id))
  const completed = tasks.filter((task) => taskIds.has(task.id) && task.done).length
  return { completed, total: periodInstances.length }
}

export function getNextSundayMidnight(from: Date): Date {
  const date = new Date(from)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay()
  const daysUntilSunday = (7 - day) % 7 || 7
  date.setDate(date.getDate() + daysUntilSunday)
  return date
}

export function getWeekdayLabel(index: number): string {
  return FULL_WEEKDAY_LABELS[index] ?? ''
}
```

- [ ] **Step 4: Verify and commit**

Run:

```bash
rtk npm run test:habit-tracker
rtk npm run lint
rtk git status --short
rtk git add src/lib/habits.ts tests/habit-tracker.test.mjs
rtk git commit -m "feat: add habit tracker pure helpers"
```

Expected: tests and lint pass.

---

### Task 4: Scheduler Helper

**Files:**
- Create: `src/lib/scheduler.ts`
- Modify: `tests/habit-tracker.test.mjs`

- [ ] **Step 1: Extend the test for the scheduler helper**

Append to `tests/habit-tracker.test.mjs`:

```js
const scheduler = readFileSync(new URL("../src/lib/scheduler.ts", import.meta.url), "utf8");

test("scheduler helper exports weekly timeout", () => {
  assert.match(scheduler, /export function startWeeklyHabitScheduler/);
  assert.match(scheduler, /setTimeout/);
  assert.match(scheduler, /getNextSundayMidnight/);
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
rtk npm run test:habit-tracker
```

Expected: FAIL because `src/lib/scheduler.ts` does not exist.

- [ ] **Step 3: Create the scheduler helper**

Create `src/lib/scheduler.ts`:

```ts
import { getNextSundayMidnight } from './habits'

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function startWeeklyHabitScheduler(
  callback: (weekStart: Date) => void,
): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const scheduleNext = () => {
    const now = new Date()
    const next = getNextSundayMidnight(now)
    const delay = next.getTime() - now.getTime()
    timeoutId = setTimeout(() => {
      callback(next)
      scheduleNext()
    }, delay)
  }

  scheduleNext()

  return () => {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
```

- [ ] **Step 4: Verify and commit**

Run:

```bash
rtk npm run test:habit-tracker
rtk npm run lint
rtk git status --short
rtk git add src/lib/scheduler.ts tests/habit-tracker.test.mjs
rtk git commit -m "feat: add habit scheduler helper"
```

Expected: tests and lint pass.

---

### Task 5: Zustand Store Actions

**Files:**
- Modify: `src/store.ts`
- Modify: `tests/habit-tracker.test.mjs`

- [ ] **Step 1: Extend the test for store actions**

Append to `tests/habit-tracker.test.mjs`:

```js
const store = readFileSync(new URL("../src/store.ts", import.meta.url), "utf8");

test("store manages habit state and actions", () => {
  assert.match(store, /habitTemplates/);
  assert.match(store, /habitInstances/);
  assert.match(store, /loadHabitTemplates/);
  assert.match(store, /loadHabitInstancesForWeek/);
  assert.match(store, /generateHabitInstancesForWeek/);
  assert.match(store, /upsertHabitTemplate/);
  assert.match(store, /archiveHabitTemplate/);
  assert.match(store, /deleteHabitTemplateForTask/);
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
rtk npm run test:habit-tracker
```

Expected: FAIL because store has no habit state or actions.

- [ ] **Step 3: Add habit state and action types**

In `src/store.ts`:

1. Update the type import from `./types` to include `HabitInstance`, `HabitTemplate`, `RecurrenceRule`.
2. Add to the `State` type:

```ts
habitTemplates: HabitTemplate[]
habitInstances: HabitInstance[]
```

3. Add to the `Actions` type:

```ts
loadHabitTemplates: () => Promise<void>
loadHabitInstancesForWeek: (weekStart: Date) => Promise<void>
generateHabitInstancesForWeek: (weekStart: Date) => Promise<void>
upsertHabitTemplate: (taskId: string, rule: RecurrenceRule | null, targetPerPeriod?: number) => Promise<void>
archiveHabitTemplate: (templateId: string) => Promise<void>
deleteHabitTemplateForTask: (taskId: string) => Promise<void>
```

4. Initialize state:

```ts
habitTemplates: [],
habitInstances: [],
```

5. Update `clearSessionData` to also clear:

```ts
habitTemplates: [],
habitInstances: [],
```

- [ ] **Step 4: Implement the actions**

Insert the following actions into the store object after `createTaskFromQuickCapture`:

```ts
loadHabitTemplates: async () => {
  const { data, error } = await supabase
    .from('habit_templates')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('loadHabitTemplates failed', error)
    return
  }

  set({ habitTemplates: (data as HabitTemplate[]) ?? [] })
},

loadHabitInstancesForWeek: async (weekStart) => {
  const days = getWeekDays(weekStart).map(formatDate)
  const { data, error } = await supabase
    .from('habit_instances')
    .select('*')
    .gte('for_date', days[0])
    .lte('for_date', days[6])

  if (error) {
    console.error('loadHabitInstancesForWeek failed', error)
    return
  }

  set({ habitInstances: (data as HabitInstance[]) ?? [] })
},

generateHabitInstancesForWeek: async (weekStart) => {
  const { tasks, habitTemplates, habitInstances, addTask } = get()
  const days = getWeekDays(weekStart)
  const periodStartKey = formatDate(weekStart)

  for (const template of habitTemplates.filter((t) => t.active)) {
    const baseTask = tasks.find((t) => t.id === template.task_id)
    if (!baseTask) continue

    const dueDates = getDueDatesForWeek(template.recurrence, weekStart)

    for (const dueDate of dueDates) {
      const dateKey = formatDate(dueDate)
      const alreadyExists = habitInstances.some(
        (inst) => inst.habit_template_id === template.id && inst.for_date === dateKey,
      )
      if (alreadyExists) continue

      const task = await addTask(baseTask.title, dateKey, {
        color: baseTask.color,
        note: baseTask.note,
        due_time: baseTask.due_time,
        silent: true,
      })

      if (!task) continue

      const instance: HabitInstance = {
        id: createId(),
        habit_template_id: template.id,
        user_id: '',
        task_id: task.id,
        for_date: dateKey,
        period_start: periodStartKey,
        created_at: new Date().toISOString(),
      }

      set({ habitInstances: [...get().habitInstances, instance] })

      const { error } = await supabase.from('habit_instances').insert(instance)
      if (error) {
        console.error('insert habit_instance failed', error)
        set({ habitInstances: get().habitInstances.filter((i) => i.id !== instance.id) })
      }
    }
  }
},

upsertHabitTemplate: async (taskId, rule, targetPerPeriod = 1) => {
  if (!rule) {
    await get().deleteHabitTemplateForTask(taskId)
    return
  }

  const { habitTemplates } = get()
  const existing = habitTemplates.find((t) => t.task_id === taskId)
  const now = new Date().toISOString()

  if (existing) {
    const updated: HabitTemplate = {
      ...existing,
      recurrence: rule,
      target_per_period: targetPerPeriod,
      updated_at: now,
    }
    set({
      habitTemplates: habitTemplates.map((t) =>
        t.id === existing.id ? updated : t,
      ),
    })

    const { error } = await supabase
      .from('habit_templates')
      .update({
        recurrence: rule,
        target_per_period: targetPerPeriod,
        updated_at: now,
      })
      .eq('id', existing.id)

    if (error) {
      console.error('upsertHabitTemplate update failed', error)
      set({ habitTemplates })
    }
    return
  }

  const template: HabitTemplate = {
    id: createId(),
    user_id: '',
    task_id: taskId,
    recurrence: rule,
    target_per_period: targetPerPeriod,
    active: true,
    created_at: now,
    updated_at: now,
  }

  set({ habitTemplates: [...habitTemplates, template] })

  const { data, error } = await supabase
    .from('habit_templates')
    .insert(template)
    .select()
    .single()

  if (error) {
    console.error('upsertHabitTemplate insert failed', error)
    set({ habitTemplates })
    return
  }

  set({
    habitTemplates: get().habitTemplates.map((t) =>
      t.id === template.id ? (data as HabitTemplate) : t,
    ),
  })

  await get().generateHabitInstancesForWeek(get().currentWeekStart)
},

archiveHabitTemplate: async (templateId) => {
  const prev = get().habitTemplates
  set({
    habitTemplates: prev.map((t) =>
      t.id === templateId ? { ...t, active: false } : t,
    ),
  })

  const { error } = await supabase
    .from('habit_templates')
    .update({ active: false })
    .eq('id', templateId)

  if (error) {
    console.error('archiveHabitTemplate failed', error)
    set({ habitTemplates: prev })
  }
},

deleteHabitTemplateForTask: async (taskId) => {
  const prevTemplates = get().habitTemplates
  const prevInstances = get().habitInstances
  const template = prevTemplates.find((t) => t.task_id === taskId)
  if (!template) return

  const today = formatDate(new Date())
  const futureInstances = prevInstances.filter(
    (inst) => inst.habit_template_id === template.id && inst.for_date >= today,
  )

  set({
    habitTemplates: prevTemplates.filter((t) => t.id !== template.id),
    habitInstances: prevInstances.filter(
      (inst) => inst.habit_template_id !== template.id,
    ),
  })

  const { error } = await supabase
    .from('habit_templates')
    .delete()
    .eq('id', template.id)

  if (error) {
    console.error('deleteHabitTemplateForTask failed', error)
    set({ habitTemplates: prevTemplates, habitInstances: prevInstances })
    return
  }

  for (const inst of futureInstances) {
    await get().deleteTask(inst.task_id)
  }
},
```

Also add this import at the top of `src/store.ts` (the existing type import block can stay as-is; add the habit types to it):

```ts
import type {
  DayCheckin,
  FocusColumnId,
  HabitInstance,
  HabitTemplate,
  QuickCaptureDestination,
  RecurrenceRule,
  Task,
  TaskEvent,
  TaskEventType,
  WeekReview,
} from './types'
import { getDueDatesForWeek } from './lib/habits'
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
rtk npm run test:habit-tracker
rtk npm run lint
rtk git status --short
rtk git add src/store.ts tests/habit-tracker.test.mjs
rtk git commit -m "feat: add habit tracker store actions"
```

Expected: tests and lint pass.

---

### Task 6: Habit Repeat Popover Component

**Files:**
- Create: `src/components/HabitRepeatPopover.tsx`
- Modify: `tests/habit-tracker.test.mjs`

- [ ] **Step 1: Extend the test for the repeat popover**

Append to `tests/habit-tracker.test.mjs`:

```js
const popover = readFileSync(new URL("../src/components/HabitRepeatPopover.tsx", import.meta.url), "utf8");

test("HabitRepeatPopover renders preset and custom controls", () => {
  assert.match(popover, /Never/);
  assert.match(popover, /Daily/);
  assert.match(popover, /Weekly/);
  assert.match(popover, /Custom/);
  assert.match(popover, /byWeekdays/);
  assert.match(popover, /target_per_period/);
  assert.match(popover, /upsertHabitTemplate/);
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
rtk npm run test:habit-tracker
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Create the HabitRepeatPopover component**

Create `src/components/HabitRepeatPopover.tsx`:

```tsx
import { useMemo, useState } from "react";
import { formatRecurrenceSummary, getWeekdayLabel, presetToRule } from "../lib/habits";
import { useStore } from "../store";
import type { RecurrencePreset, RecurrenceRule } from "../types";

const PRESETS: { value: RecurrencePreset; label: string }[] = [
  { value: "never", label: "Never" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom..." },
];

const WEEKDAY_INDEXES = [0, 1, 2, 3, 4, 5, 6] as const;

const SETTINGS_SECTION_CLASS = "space-y-2";
const SETTINGS_LABEL_CLASS =
  "font-mono text-[10px] uppercase tracking-normal text-faint";
const SETTINGS_CHOICE_ACTIVE_CLASS = "border-ink/30 bg-ink text-bg";
const SETTINGS_CHOICE_IDLE_CLASS =
  "border-rule bg-bg/40 text-muted hover:border-rule-strong hover:bg-ink/[0.035] hover:text-ink";

function getSettingsChoiceClassName(isSelected: boolean, sizeClass: string): string {
  const stateClass = isSelected
    ? SETTINGS_CHOICE_ACTIVE_CLASS
    : SETTINGS_CHOICE_IDLE_CLASS;
  return `rounded-xl border ${sizeClass} transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 ${stateClass}`;
}

function isPresetRule(
  rule: RecurrenceRule | null,
  preset: RecurrencePreset,
  baseDate: Date,
): boolean {
  if (preset === "never" && rule === null) return true;
  if (!rule) return false;

  const summary = formatRecurrenceSummary(rule);
  const presetSummary = formatRecurrenceSummary(
    presetToRule(preset, baseDate) ?? { freq: "weekly", interval: 1, byWeekdays: [] },
  );
  return summary === presetSummary;
}

type Props = {
  taskId: string;
  baseDate: Date;
};

export default function HabitRepeatPopover({ taskId, baseDate }: Props) {
  const templates = useStore((s) => s.habitTemplates);
  const upsertHabitTemplate = useStore((s) => s.upsertHabitTemplate);
  const template = useMemo(
    () => templates.find((t) => t.task_id === taskId && t.active),
    [templates, taskId],
  );

  const [preset, setPreset] = useState<RecurrencePreset>(() => {
    if (!template) return "never";
    const found = PRESETS.find((p) => isPresetRule(template.recurrence, p.value, baseDate));
    return found?.value ?? "custom";
  });

  const [rule, setRule] = useState<RecurrenceRule | null>(() =>
    template ? template.recurrence : null,
  );

  const [target, setTarget] = useState(() => template?.target_per_period ?? 1);

  const handlePreset = (value: RecurrencePreset) => {
    setPreset(value);
    if (value === "never") {
      setRule(null);
      return;
    }
    if (value === "custom") {
      setRule(
        rule ?? { freq: "weekly", interval: 1, byWeekdays: [baseDate.getDay()] },
      );
      return;
    }
    setRule(presetToRule(value, baseDate));
  };

  const toggleWeekday = (day: number) => {
    if (!rule || rule.freq !== "weekly") return;
    const next = rule.byWeekdays.includes(day)
      ? rule.byWeekdays.filter((d) => d !== day)
      : [...rule.byWeekdays, day].sort((a, b) => a - b);
    setRule({ ...rule, byWeekdays: next });
  };

  const updateInterval = (interval: number) => {
    if (!rule) return;
    setRule({ ...rule, interval: Math.max(1, interval) });
  };

  const save = () => {
    upsertHabitTemplate(taskId, rule, Math.max(1, target));
  };

  const summary = rule ? formatRecurrenceSummary(rule) : "Never";

  return (
    <div className="flex flex-col gap-4">
      <section className={SETTINGS_SECTION_CLASS}>
        <div className={SETTINGS_LABEL_CLASS}>Repeat</div>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePreset(option.value);
              }}
              className={getSettingsChoiceClassName(
                preset === option.value,
                "px-2 py-2 text-xs",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {rule && preset === "custom" && (
        <>
          <section className={SETTINGS_SECTION_CLASS}>
            <div className={SETTINGS_LABEL_CLASS}>Frequency</div>
            <select
              value={rule.freq}
              onChange={(e) =>
                setRule({ ...rule, freq: e.target.value as RecurrenceRule["freq"] })
              }
              className="w-full rounded-xl border border-rule bg-bg/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ink/15"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </section>

          <section className={SETTINGS_SECTION_CLASS}>
            <div className={SETTINGS_LABEL_CLASS}>Interval</div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Every</span>
              <input
                type="number"
                min={1}
                value={rule.interval}
                onChange={(e) => updateInterval(parseInt(e.target.value, 10))}
                className="w-16 rounded-xl border border-rule bg-bg/40 px-3 py-2 text-center text-sm outline-none focus:ring-2 focus:ring-ink/15"
              />
              <span className="text-sm text-muted">{rule.freq}s</span>
            </div>
          </section>

          {rule.freq === "weekly" && (
            <section className={SETTINGS_SECTION_CLASS}>
              <div className={SETTINGS_LABEL_CLASS}>On days</div>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAY_INDEXES.map((day) => {
                  const active = rule.byWeekdays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWeekday(day);
                      }}
                      className={getSettingsChoiceClassName(active, "h-9 p-0 text-[11px]")}
                      title={getWeekdayLabel(day)}
                    >
                      {getWeekdayLabel(day).slice(0, 1)}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      <section className={SETTINGS_SECTION_CLASS}>
        <div className={SETTINGS_LABEL_CLASS}>Target per period</div>
        <input
          type="number"
          min={1}
          value={target}
          onChange={(e) => setTarget(parseInt(e.target.value, 10))}
          className="w-full rounded-xl border border-rule bg-bg/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ink/15"
        />
      </section>

      <div className="rounded-xl bg-ink/[0.035] px-3 py-2 text-xs text-muted">
        {summary}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          save();
        }}
        className="w-full rounded-md bg-ink px-4 py-2 font-mono text-[13px] uppercase text-bg"
      >
        Save
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Verify and commit**

Run:

```bash
rtk npm run test:habit-tracker
rtk npm run lint
rtk git status --short
rtk git add src/components/HabitRepeatPopover.tsx tests/habit-tracker.test.mjs
rtk git commit -m "feat: add habit repeat popover"
```

Expected: tests and lint pass. `npm run lint` may flag unused function `isPresetRule` or `formatRecurrenceSummary` in some cases; adjust only if lint fails.

---

### Task 7: TaskRow Integration

**Files:**
- Modify: `src/components/TaskRow.tsx`

- [ ] **Step 1: Replace the existing Repeat section with the habit trigger**

In `src/components/TaskRow.tsx`:

1. Remove the now-unused `RECURRENCE_OPTIONS` constant and the `selectRecurrence` callback from `TaskRow.tsx` (lint flags unused symbols). Keep the `RepeatIcon` display that reads `task.recurrence` for backward compatibility with old tasks.

2. Import `HabitRepeatPopover`:

```tsx
import HabitRepeatPopover from "./HabitRepeatPopover";
```

Also import the helper:

```tsx
import { formatRecurrenceSummary } from "../lib/habits";
```

3. Read habit state inside `TaskRow`:

```tsx
const habitTemplates = useStore((s) => s.habitTemplates);
const template = habitTemplates.find((t) => t.task_id === task.id && t.active);
```

4. Replace the existing `<SettingsSection label="Repeat"> ... </SettingsSection>` block in the settings popover with:

```tsx
<SettingsSection label="Repeat">
  <div className="rounded-xl border border-rule bg-bg/40 p-3">
    <div className="mb-3 text-sm text-muted">
      {template
        ? formatRecurrenceSummary(template.recurrence)
        : "Never"}
    </div>
    <HabitRepeatPopover taskId={task.id} baseDate={new Date(task.date ?? Date.now())} />
  </div>
</SettingsSection>
```

If `task.date` is null (backlog), `baseDate` should be the current week start. Use `getWeekStart(new Date())` for that case.

- [ ] **Step 2: Verify and commit**

Run:

```bash
rtk npm run test:habit-tracker
rtk npm run lint
rtk git status --short
rtk git add src/components/TaskRow.tsx
rtk git commit -m "feat: wire habit repeat popover into task settings"
```

Expected: tests and lint pass.

---

### Task 8: App Wiring and Scheduler

**Files:**
- Modify: `src/App.tsx`
- Modify: `tests/habit-tracker.test.mjs`

- [ ] **Step 1: Extend the test for App wiring**

Append to `tests/habit-tracker.test.mjs`:

```js
const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("App loads habits and starts scheduler", () => {
  assert.match(app, /loadHabitTemplates/);
  assert.match(app, /loadHabitInstancesForWeek/);
  assert.match(app, /generateHabitInstancesForWeek/);
  assert.match(app, /startWeeklyHabitScheduler/);
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
rtk npm run test:habit-tracker
```

Expected: FAIL because `App.tsx` has not been wired yet.

- [ ] **Step 3: Wire loading and scheduler in App.tsx**

In `src/App.tsx`:

1. Import the scheduler helper:

```tsx
import { startWeeklyHabitScheduler } from "./lib/scheduler";
```

2. Read the habit actions from the store:

```tsx
const loadHabitTemplates = useStore((s) => s.loadHabitTemplates);
const loadHabitInstancesForWeek = useStore((s) => s.loadHabitInstancesForWeek);
const generateHabitInstancesForWeek = useStore((s) => s.generateHabitInstancesForWeek);
```

3. Add an effect that loads and generates when the session is ready:

```tsx
useEffect(() => {
  if (!session) return;
  loadHabitTemplates();
  loadHabitInstancesForWeek(currentWeekStart);
  generateHabitInstancesForWeek(currentWeekStart);
}, [session, currentWeekStart, loadHabitTemplates, loadHabitInstancesForWeek, generateHabitInstancesForWeek]);
```

4. Add an effect that starts the weekly scheduler:

```tsx
useEffect(() => {
  if (!session) return;
  return startWeeklyHabitScheduler((weekStart) => {
    generateHabitInstancesForWeek(weekStart);
  });
}, [session, generateHabitInstancesForWeek]);
```

- [ ] **Step 4: Verify and commit**

Run:

```bash
rtk npm run test:habit-tracker
rtk npm run lint
rtk git status --short
rtk git add src/App.tsx tests/habit-tracker.test.mjs
rtk git commit -m "feat: wire habit loading and scheduler into app"
```

Expected: tests and lint pass.

---

### Task 9: Final Verification

- [ ] **Step 1: Run the full focused test suite**

Run:

```bash
rtk npm run test:habit-tracker
rtk npm run lint
rtk npm run build
```

Expected:

- `test:habit-tracker` passes.
- `lint` passes.
- `build` completes without TypeScript errors.

- [ ] **Step 2: Apply live schema**

Run the new SQL from `supabase/schema.sql` against the connected Supabase project, then verify:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('habit_templates', 'habit_instances')
order by table_name;
```

Expected rows:

```text
habit_instances
habit_templates
```

- [ ] **Step 3: Manual browser checks**

Run:

```bash
rtk npm run dev
```

Then:

1. Sign in.
2. Create a task.
3. Open the task settings popover and choose **Repeat > Weekdays**.
4. Confirm generated tasks appear on Monday–Friday of the current week.
5. Mark one generated habit done; confirm progress updates inside the repeat popover.
6. Change the rule to **Custom > Weekly > Tue, Thu** and confirm the grid updates only for new/generation, not existing rows.
7. Select **Repeat > Never** and confirm future uncompleted generated tasks disappear.
8. Switch weeks and confirm loading/generation runs for the visible week.
9. Simulate Sunday scheduler by refreshing the app around the boundary.

- [ ] **Step 4: Commit final verification notes (optional)**

If any polish is needed, commit it:

```bash
rtk git status --short
rtk git add <changed files>
rtk git commit -m "chore: verify habit tracker integration"
```

Expected: all tests pass, build succeeds, no uncommitted changes remain.

---

## Spec Coverage Checklist

| Spec requirement | Implementing task |
|---|---|
| `habit_templates` and `habit_instances` tables | Task 1 |
| `RecurrencePreset`, `RecurrenceRule`, `HabitTemplate`, `HabitInstance` types | Task 2 |
| Due-date computation for daily/weekly/monthly/yearly | Task 3 |
| Sunday 00:00 scheduler | Task 4, Task 8 |
| Preset + custom repeat UI | Task 6 |
| Task settings integration | Task 7 |
| App loading + scheduler wiring | Task 8 |
| Progress derived from task completion | Task 3, Task 6 |
| Source tests | All tasks |

## Placeholder Scan

No TBD, TODO, "implement later", or vague requirements remain. Every step contains code, commands, and expected output.
