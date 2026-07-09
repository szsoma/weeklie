# Habit Tracker Design

## Purpose

Add a lightweight, rule-based habit tracker to Weeklie that uses minimal UI space. Habits are configured through a macOS Reminders-style repeat popover attached to normal tasks. The system generates concrete task rows for the current week only, so habits behave like ordinary tasks in the grid while supporting multi-slot weekly targets.

## Non-goals

- No dedicated habit dashboard, streak calendar, or visual chart in this version.
- No retroactive editing of past generated instances when a rule changes.
- No infinite future generation; tasks are created one week at a time.

## Architecture

A habit is an ordinary task that owns a `habit_templates` row. The template stores a recurrence rule and a weekly target. A Sunday scheduler creates normal `Task` rows for the current week on the days the rule specifies, linked through `habit_instances`. Users complete the generated rows like any other task. Progress is derived from existing task completion state.

## Data model

### New tables

```sql
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

create unique index if not exists habit_instances_template_date_idx
  on public.habit_instances (habit_template_id, for_date);
```

### New types

```ts
export type RecurrencePreset =
  | 'never'
  | 'daily'
  | 'weekdays'
  | 'weekends'
  | 'weekly'
  | 'biweekly'
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
  task_id: string;
  for_date: string;
  period_start: string;
  created_at: string;
};
```

## Scheduler

A function runs at **Sunday 00:00 local user time** and whenever the app loads a week:

1. Load active `habit_templates`.
2. For each template, compute due dates inside the current week using the rule.
3. Skip dates that already have a `habit_instances` row for this template.
4. Create a normal task row via the existing `addTask` action with the template task's title, color, note, due_time, and `date = for_date`.
5. Insert a matching `habit_instances` record linking the generated task to the template.

Rules:

- `daily` generates one task per day.
- `weekly` with `byWeekdays` generates tasks on those days.
- `weekly` without `byWeekdays` generates one task on the week-start day.
- `monthly`/`yearly` generate a task only if the current week contains the matching date.

## Repeat popover UI

### Entry point

Inside the existing task settings popover, add a line:

- "Repeat: Never" if no template.
- "Repeat: Weekly on Mon, Wed, Fri" or similar summary if a template exists.

Clicking opens the repeat popover.

### Preset popover

Options:

- Never
- Daily
- Weekdays
- Weekends
- Weekly
- Biweekly
- Monthly
- Yearly
- Custom...

Selecting a preset sets the rule and immediately generates instances for the current week.

### Custom popover

- Frequency dropdown: Daily / Weekly / Monthly / Yearly
- Interval input: "Every [ 2 ] [ days | weeks | months | years ]"
- Weekday toggles (S M T W T F S) when frequency is Weekly
- Target per period input (default 1)

### Saving behavior

- `upsertHabitTemplate(taskId, rule, targetPerPeriod)` inserts or updates the template.
- Selecting "Never" deletes the template and removes future uncompleted instances for dates >= today.
- Archiving sets `active = false` and stops future generations.
- No badge or indicator on the task row itself; the repeat summary only appears inside the settings popover.

## Completion counting

Progress is derived from generated task rows:

```ts
function getHabitProgress(
  template: HabitTemplate,
  periodStart: Date,
  tasks: Task[],
  instances: HabitInstance[],
): { completed: number; total: number }
```

- Total = number of generated instances for the period.
- Completed = how many of those task rows are marked `done`.
- Progress is shown only inside the task settings popover summary line, e.g., "3/5 done this week".

## File structure

| File | Responsibility |
|---|---|
| `supabase/schema.sql` | Add tables, indexes, triggers, RLS |
| `src/types.ts` | Add recurrence and habit types |
| `src/lib/habits.ts` | Pure helpers for due dates, summaries, progress |
| `src/lib/scheduler.ts` | Timeout helper for Sunday 00:00 generation |
| `src/store.ts` | State and actions for templates, instances, generation |
| `src/components/HabitRepeatPopover.tsx` | Preset + custom repeat UI |
| `src/components/TaskSettingsPopover.tsx` | Add repeat trigger line |
| `src/App.tsx` | Wire scheduler and load actions |
| `tests/habit-tracker.test.mjs` | Source tests |

## Testing

- `tests/habit-tracker.test.mjs` verifies:
  - Schema defines both new tables and RLS.
  - TypeScript types exported.
  - `getDueDatesForWeek` handles daily, weekly with weekdays, and monthly rules.
  - `upsertHabitTemplate` and `generateHabitInstancesForWeek` exist in the store.
  - `HabitRepeatPopover` renders preset list and custom weekday picker.
- Run `npm run test:habit-tracker` and `npm run lint` after implementation.
- Manual browser check: create habit, verify generated rows appear on scheduled days, verify Sunday scheduler creates the next week's tasks.

## Risks

- Editing a habit rule does not update already-generated tasks in the current week.
- The scheduler relies on the app being open at Sunday 00:00 or loading the week afterward; a backend cron would be more reliable but is out of scope.
- Monthly/yearly habits generate only when the matching date falls inside the current week.
