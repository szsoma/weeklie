# Visible Recurrence Generation Design

## Goal

When a user sets a task to repeat, future matching occurrences should appear on the related future dates as the user views those weeks. The app should not create an unbounded number of future task rows.

## Scope

This change updates recurrence behavior for scheduled tasks. Backlog tasks remain non-generating because they have no source date.

In scope:

- Weekly recurrence: same weekday in later weeks.
- Monthly recurrence: same day of month in later months.
- Daily recurrence: each later day in the visible week.
- Visible-window generation: create only occurrences needed for the week currently being loaded or viewed.

Out of scope:

- Infinite upfront generation.
- Custom intervals.
- End dates.
- Editing an entire recurrence series at once.
- A separate recurrence-series table.

## User Behavior

When the user sets a scheduled task to repeat:

- Daily: future occurrences appear on later visible days.
- Weekly: the matching task appears on the same weekday in next week, then the following week, and so on as those weeks are viewed.
- Monthly: the matching task appears on the same day number next month, then following months as those dates become visible.

If a monthly task starts on a day that does not exist in a later month, the occurrence uses the last day of that month. For example, a task on January 31 repeats on February 28 or February 29, depending on the year.

Generated occurrences copy:

- title
- color
- note
- due time
- recurrence value
- recurrence anchor date

Generated occurrences set `planned_date` to the generated occurrence date.

## Data Model

Extend `TaskRecurrence` from:

```ts
export type TaskRecurrence = 'daily' | 'weekly';
```

to:

```ts
export type TaskRecurrence = 'daily' | 'weekly' | 'monthly';
```

Add one nullable anchor column:

```sql
alter table public.tasks
  add column if not exists recurrence_anchor_date text;
```

Add the matching field to `Task`:

```ts
recurrence_anchor_date: string | null;
```

When a task is first set to repeat, set `recurrence_anchor_date` to `task.date`. Generated occurrences copy the same anchor date. Existing repeating tasks without an anchor fall back to their own `date` as the anchor.

This avoids monthly drift. A task anchored on January 31 can generate February 28 or 29, then March 31, instead of letting the February occurrence become a March 28 source.

## Recurrence Generation

The recurrence helper remains the source of truth for date calculation.

Add monthly date math:

- `daily`: add one calendar day.
- `weekly`: add one calendar week.
- `monthly`: add calendar months from `recurrence_anchor_date`, clamped to the target month's last day when needed.

`getRecurringSeedsForWeek(tasks, weekStart)` should generate all occurrences for the visible week, not only the first next occurrence.

For each recurring source task:

1. Skip tasks with no `date`, no `recurrence`, or non-null `deleted_at`.
2. Use `recurrence_anchor_date ?? date` as the anchor date.
3. Repeatedly calculate occurrence dates after the source task's own occurrence, using the anchor date and recurrence cadence, until the candidate date reaches the visible week.
4. For every candidate date inside the visible week, check whether an undone matching occurrence already exists.
5. If no matching undone occurrence exists, return a seed for that date.
6. Stop once the candidate date is after the visible week.

The duplicate guard continues to use the current simple chain heuristic:

- different task id
- same date
- same title
- same recurrence
- same recurrence anchor when both tasks have one
- not deleted
- not done

This preserves the existing tradeoff: renaming a repeated task starts a new simple chain.

## Store Behavior

`generateRecurringTasksForWeek(weekStart)` continues to call `getRecurringSeedsForWeek` and create each seed with `addTask`.

When `TaskRow` updates recurrence from `null` to `daily`, `weekly`, or `monthly`, the update should also set `recurrence_anchor_date` to the task's current date. When recurrence changes between non-null values, reset the anchor to the current date so the new cadence starts from the visible task the user edited. Then the store should generate occurrences for the current visible week immediately after the update succeeds. This gives instant feedback for daily repeats in the current week and prepares same-window occurrences when applicable.

For Weekly and Monthly, future occurrences mainly appear when the user navigates to future weeks. This keeps the database bounded to weeks the user has actually viewed.

Completing a recurring task may continue to create the next available single occurrence as it does today, but it must use the same updated date math and duplicate guard.

## UI

The repeat selector adds a Monthly option:

- None
- Daily
- Weekly
- Monthly

The existing repeat icon and "Repeats ..." label continue to work with the new value.

## Edge Cases

- Backlog recurring tasks: do not generate because `date` is null.
- Monthly on the 29th, 30th, or 31st: clamp to the last day of shorter months.
- Monthly after a clamped month: keep using the original anchor day when later months support it again.
- Existing occurrence already present: do not create a duplicate undone task for that same title, recurrence, and date.
- Done occurrence exists on the target date: allow a new undone occurrence, matching current behavior.
- Deleted occurrence exists on the target date: allow a new undone occurrence.
- Future week navigation: generated occurrences appear when that week is viewed.

## Testing

Add focused tests for recurrence helper behavior:

- Weekly source on a Tuesday generates the following Tuesday when that next week is visible.
- Monthly source on January 31 generates February 28 or 29 for a February week.
- Monthly source anchored on January 31 generates March 31 for a March week, even if a February clamped occurrence exists.
- Daily source generates each later visible day in the current visible week.
- Existing undone matching occurrence prevents a duplicate seed.
- Backlog recurring source creates no seed.

Add a source-level UI test or focused component/source check that Monthly appears in the repeat options.

Manual verification:

1. Create a dated task.
2. Set Repeat to Weekly.
3. Navigate to next week and confirm the task appears on the same weekday.
4. Set another dated task to Monthly on a stable day number, navigate to the month containing the next occurrence, and confirm it appears on the same day number.
5. Test a month-end date if possible and confirm clamping behavior.
