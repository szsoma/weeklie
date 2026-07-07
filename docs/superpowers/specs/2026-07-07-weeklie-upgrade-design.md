# Weeklie 2.0 Upgrade — Design Spec

**Date:** 2026-07-07

## Overview

Upgrade Weeklie with a cohesive set of features across three moments: week setup, mid-week execution, and weekly review. Keep the paper-quiet, minimalist feel. No new tables. No guided ritual flows. Each feature stands alone and works independently.

## Data Model Changes

Three new nullable columns on `tasks`:

| Column | Type | Purpose |
|--------|------|---------|
| `recurrence` | `text` | `'daily'` or `'weekly'` — null means one-off task |
| `note` | `text` | Short context line, max ~300 chars, null when empty |
| `due_time` | `text` | HH:MM in local time, e.g. `'09:00'` — null means no reminder |

No new tables. Recurrence lives on the task itself. When you complete a recurring task, a new undone copy spawns on the next date with the same title, recurrence, color, and note. The "chain" is the task moving forward through time.

**Recurrence generation trigger:** On `loadTasks` (app start, auth) and on `setCurrentWeekStart` (week navigation), for each recurring task whose next-occurrence date falls within the visible week and has no existing undone instance on that date, create the instance.

**Notification trigger:** A `setInterval` (or PWA service worker periodic sync) checks tasks with `due_time` set. At the scheduled local time, fires a browser `Notification` with the task title and a "Mark done" action button.

One new nullable column on `week_reviews`:

| Column | Type | Purpose |
|--------|------|---------|
| `intention` | `text` | The "This week I want to…" line, saved per week |

**Migration:**
- `ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence text;` (same for note, due_time)
- `ALTER TABLE public.week_reviews ADD COLUMN IF NOT EXISTS intention text;`
- All nullable — existing rows unaffected.

## Design Token Change: Lighter Background

Adjust CSS custom properties in `src/index.css`:

- **Light mode:** `--bg` shifts from warm cream toward near-white. `--surface` lightens proportionally. Exact hex values to be tuned during implementation — the goal is enough contrast for highlight colors to pop while keeping the paper feel.
- **Dark mode:** unchanged.
- **Effect:** Task highlight colors (red, orange, yellow, green, blue, purple) gain visual prominence against the lighter backdrop.

This is a self-contained CSS change. All components inherit the updated tokens.

## Feature 1: Recurring Tasks

### UI
- **Kebab menu:** Add "Repeat" option with submenu: None / Daily / Weekly. Current selection shows a checkmark.
- **Row indicator:** A 🔁 icon on the task row (right side, before the kebab trigger) when recurrence is set.
- **Icon color:** Uses the task's color if set, otherwise `text-faint`.

### Behavior
- **Completion of a recurring task** (via `toggleDone`): After the normal toggle, if `task.recurrence` is set, create a new undone task on the next date (today for daily, same day next week for weekly) with identical title, recurrence, color, and note. `planned_date` is set to the new date.
- **Cancelling recurrence:** Change `recurrence` to null via kebab menu. Current task stays, no more spawns.
- **Generation on navigation:** When loading tasks for a week, for each recurring task found anywhere, compute whether its next occurrence falls within the visible week. If no undone instance of that "chain" (same original task chain, tracked by matching title+recurrence on that date) exists, create it. Use a simple heuristic: same title + same recurrence type + date matches the recurrence interval from the source task.
- **Edge case — completing a recurring task that has already spawned:** The spawned instance on the next date already exists. Only spawn the one after that. In practice: if Monday's "Exercise" (daily) already has a Tuesday instance, completing Monday's spawns Wednesday's.

### States
- **Loading:** No visible change — existing tasks show recurrence icon if applicable.
- **Empty:** No recurring tasks → no icons shown.
- **Error:** Task creation fails → revert optimistically, show no toast (consistent with existing addTask behavior).
- **Edge:** Weekly recurrence crossing year boundaries — uses date math, not week IDs, so boundary is handled correctly.

## Feature 2: Copy From Last Week

### UI
- **Location:** Week header, as a small action button or link — e.g. "Copy last week" next to the week label or in the header's right side.
- **Style:** Font-mono, text-xs, uppercase, muted color, matching existing header controls.

### Behavior
- **Action:** Fetches all undone tasks from the previous ISO week (Mon–Sun preceding the currently displayed week).
- **Duplicate:** Creates new tasks in the current week on the same day-of-week as the source tasks. Title, color, and note are copied. Recurrence is NOT copied (the user set it on the source; copying it would create duplicate recurrence chains). Order is preserved relative to other copied tasks for that day.
- **Idempotency:** No dedup check. Each tap creates another set of copies. The user controls this.
- **Edge case — empty previous week:** Button is disabled or hidden if no undone tasks exist in the previous week.
- **Edge case — backlog tasks in previous week:** These have `date = null`. They are skipped (backlog items don't have a day-of-week to map to).

### States
- **Loading:** Show brief spinner or disable button during copy operation (likely instantaneous for typical task counts).
- **Empty previous week:** Button hidden or disabled with "No tasks to copy" tooltip.
- **Error:** Supabase insert fails → revert optimistically, log error, no toast.

## Feature 3: Week Intention

### UI
- **Location:** Beneath the week header, above the grid. A single line of text with placeholder.
- **Style:** Italic or lighter-weight text, centered, subtle — "This week I want to…" as placeholder. Matches the existing muted aesthetic. Font-size ~15px. Below the placeholder line, a subtle horizontal rule or just padding.
- **Edit:** Click to edit inline. No save button — persists on blur or Enter.

### Behavior
- **Storage:** Saved as part of the `week_reviews` row. Add an `intention` column (`text`, nullable) to `week_reviews`. Loaded with existing reviews.
- **Persistence:** On blur or Enter, upsert the week_review row with the intention field. If the review doesn't exist yet, create a partial row (week_id, user_id, intention).
- **Empty state:** Shows placeholder text. Clicking clears placeholder and lets you type.
- **Edge case — navigating away before save:** Intent is saved on blur, so clicking elsewhere in the UI triggers persistence. If the user navigates weeks before blur fires, the intention is lost — acceptable tradeoff for the "no save button" interaction.

### States
- **Loading:** Placeholder visible, field interactive once tasks load.
- **Empty:** Placeholder "This week I want to…"
- **Filled:** Shows the saved intention text.
- **Error:** Save fails → revert to previous value silently (no toast for this low-stakes field).

## Feature 4: Daily Focus Toggle

### UI
- **Location:** Floating nav pill — add a "Today" toggle button between the wordmark and the hamburger. On mobile, also show in the week header.
- **Style:** A small pill-shaped toggle. Active state: filled (bg-ink text-bg). Inactive: outlined or muted. Small sun or calendar icon.
- **Active state:** When active, the WeekGrid shows only today's day column.

### Behavior
- **Toggle:** Tapping switches between full-week view and today-only view.
- **Today-only view:** A single DayColumn (today's date) shown full-width. On desktop, centered with a max-width. The BacklogPanel is hidden in today-only mode.
- **Persistence:** State lives in `localStorage` (key: `weeklie.todayFocus`). Survives page reload but resets to full-week view when navigating to a new week (when today is no longer in the visible week, focus mode is meaningless).
- **Today not in visible week:** Toggle disabled or hidden when the current week doesn't contain today.
- **Edge case — midnight crossing:** If the date changes while in focus mode, re-check whether today is still in the visible week. If not, exit focus mode. Otherwise, switch to the new today's column.

### States
- **Loading:** Toggle hidden until tasks load.
- **Active:** Pill filled, grid shows only today.
- **Inactive:** Pill outlined, grid shows full week.
- **Disabled:** Today not in visible week → toggle hidden or greyed out.
- **Error:** No error states — this is purely a client-side filter.

## Feature 5: Due Time Notifications

### UI
- **Kebab menu:** Add "Remind me" option. Tapping opens a minimal time picker or preset slots: 7 AM, 9 AM, 12 PM, 3 PM, 5 PM, 8 PM, plus a "Custom" option.
- **Row indicator:** A small 🕐 icon (or clock SVG) on the task row when due_time is set. Shows the time in a subtle label — e.g. "9:00" in `text-faint` font-mono.
- **Permission prompt:** On first use (first time setting a due time), request browser Notification permission. If denied, show a small note: "Notifications blocked — enable in browser settings to receive reminders."

### Behavior
- **Scheduling:** When `due_time` is set, the PWA service worker schedules a notification. Implementation options:
  - **While app is open:** `setTimeout` calculated from now until the due time.
  - **PWA service worker:** Use the Periodic Background Sync API or schedule a notification trigger via the service worker. Minimum viable: notifications fire reliably when the app/PWA is open; service worker handles the PWA-in-background case.
- **Notification content:** Title = task title. Body = empty or "You set a reminder for this." Actions: "Mark done" button that posts a message back to the app.
- **Clearing:** When a task is completed or deleted, any pending notification for that task is cancelled.
- **Recurring tasks with due times:** The spawned next instance also gets the same `due_time`. Both recurrence and due_time are copied to the new task.
- **Edge case — past due time on load:** If a task's due_time has already passed today, no notification fires. The due_time is still shown on the row (as a visual hint) but is effectively "missed."
- **Edge case — timezone:** Due times are stored as local time strings (HH:MM). No timezone conversion. If the user travels, the notification fires at that local wall-clock time. This is the correct behavior for a personal planner.

### States
- **Loading:** No visible change — existing tasks with due_time show their clock icon and time label.
- **Permission denied:** Tasks can still have due_times set (the visual label still works), but no notifications fire. Subtle indicator in the time picker: "Notifications off."
- **Permission granted:** Notifications fire as scheduled.
- **Empty:** No due_time set → no icon, no label.
- **Error:** Notification API fails → silently degrade (the time label on the row is still useful). Service worker registration fails → already handled by existing PWA setup; if PWA isn't installed, notifications only work while the tab is open.

## Feature 6: Backlog Search

### UI
- **Location:** Top of the BacklogPanel, above the task list. A small search input.
- **Style:** Borderless input, font-mono, placeholder "Filter…" or a magnifying glass icon. Matches the existing Add Task input styling. No search button — filters as you type.
- **Clear:** An ✕ button appears in the input when text is present.

### Behavior
- **Filter:** Case-insensitive substring match against task titles in the backlog (`date === null`).
- **Non-backlog tasks:** Not affected. This is strictly a backlog search, not a global search.
- **Persistence:** Search text is component-local state. Clears when the BacklogPanel remounts (week navigation).
- **Edge case — no matches:** Show empty state: "No backlog tasks matching 'xyz'."

### States
- **Loading:** Hidden until tasks load. Placeholder visible once loaded.
- **Empty:** Search input shown but no filter applied if text is empty.
- **No matches:** Empty state message.
- **Matches:** Filtered task list renders normally with drag-and-drop still functional.
- **Error:** No error states — pure client-side filter.

## Feature 7: Task Notes

### UI
- **Row expansion:** Each TaskRow can optionally show a second line beneath the title when a note exists.
- **Note icon:** A small 📝 icon (or equivalent SVG) appears on the row when no note exists, acting as an affordance to add one. When a note exists, the icon is replaced by the note text itself.
- **Edit:** Clicking the note text or the icon opens an inline input. On Enter or blur, the note is saved. Escape discards.
- **Style:** Note text is smaller than the title (~13px), `text-muted`, with a subtle left padding to align with the title. Max one line, truncated with ellipsis if it overflows the column width. Full text visible on hover via title attribute or a small tooltip.
- **Max length:** ~300 chars. Enforced by the input, not by a character counter.

### Behavior
- **Storage:** The `note` column on `tasks`. Updated via the existing `updateTask` action.
- **Empty state:** No second line. Just the 📝 icon as a subtle affordance. Most tasks won't have notes — that's by design.
- **Edge case — note-only update:** Updating a note fires the same `updateTask` path as any other update. No separate event log entry needed (it's an update, not a lifecycle event).

### States
- **Loading:** Tasks with notes show the note line immediately on load.
- **Empty:** No note → small 📝 icon visible on hover or always (TBD during implementation).
- **Editing:** Inline input replaces the note text.
- **Saved:** Note text displayed beneath title.
- **Error:** Save fails → revert to previous note value. No toast.

## Feature 8: Week-Over-Week Trends

### UI
- **Location:** In the ReviewScreen, below the ring chart and completion stats, above the "Completed" list.
- **Chart:** A small horizontal bar chart or sparkline showing completion rates for the last 4 weeks (including the current week). Each bar is a week, height proportional to completion percentage.
- **Labels:** Week labels beneath bars in abbreviated form ("W27", "W28", etc.).
- **Empty weeks:** Weeks with no data (no review saved) shown as a lighter, dashed bar or "—".

### Behavior
- **Data source:** The existing `reviews` array in the store. Each review has `completed_count` and `planned_count`. Calculate completion rate as `completed_count / planned_count` (0 if planned_count is 0).
- **Selection:** Last 4 reviews (including the current partial week if a review hasn't been saved yet — use live task counts for the current week). Sorted chronologically.
- **Edge case — fewer than 4 weeks of history:** Show only the weeks that have data. If only 1 week exists, show just that bar. If 0 weeks, hide the chart entirely.
- **Edge case — 0 planned tasks:** Bar height is 0. Label still shows.

### States
- **Loading:** Hidden until reviews and tasks are loaded.
- **Empty:** Hidden entirely (no reviews exist yet).
- **Partial:** Shows available weeks (1–3 bars).
- **Full:** Shows 4 bars.
- **Error:** Hidden (no separate error state — if data is missing, the chart doesn't render).

## Feature 9: Slipped Task Patterns

### UI
- **In the ReviewScreen "Slipped" section:** Each rolled-over task already shows "moved X×" badge. This feature enhances that display.
- **Visual hierarchy:** Tasks rolled over 3+ times get a stronger visual treatment — a subtle warning color (amber/red tint on the badge) instead of the default muted badge.
- **Grouping:** Optionally group slipped tasks by rollover count: "First time" vs. "Chronic (3+×)".

### Behavior
- **Logic:** Uses the existing `rolled_over_count` field on each task. No new data needed.
- **Action buttons:** The existing Next wk / Backlog / Delete buttons remain. For chronic tasks (3+×), add a small prompt: "Still relevant?" — purely visual, no new behavior.

### States
- **Loading:** Tasks load with their rollover counts.
- **Empty:** No slipped tasks → section hidden (existing behavior).
- **Few:** Standard display with count badges.
- **Chronic:** Enhanced badges for 3+× tasks.

## Feature Implementation Order

The features are independent and can be shipped incrementally. Recommended order based on user impact vs. implementation complexity:

1. **Lighter background** — CSS-only, immediate visual impact, no dependencies
2. **Task notes** — simple column add + inline UI, high utility
3. **Backlog search** — pure client-side filter, low risk
4. **Daily focus toggle** — client-side view filter, medium complexity for edge cases
5. **Recurring tasks** — most complex logic (generation, spawning), core to setup moment
6. **Week intention** — simple column add + inline edit, depends on week_reviews
7. **Copy from last week** — straightforward data operation, pairs with recurring tasks
8. **Due time notifications** — PWA service worker changes, permission flow
9. **Week-over-week trends** — chart rendering, depends on having review history
10. **Slipped task patterns** — enhances existing UI, depends on rollover data

## Risks and Open Questions

- **Recurrence generation heuristic:** Matching tasks by title + recurrence type + date interval is simple but imperfect. If the user renames a recurring task mid-chain, the heuristic breaks — the renamed task becomes a new chain. This is acceptable for a personal planner; the user can manually reconcile.
- **Service worker notifications:** PWA notification reliability varies by platform (iOS Safari has limited support). The feature degrades gracefully — the time label on the row is useful even without notifications.
- **Week intention save on blur:** If the user navigates away before blur fires, the intention is lost. This is a known tradeoff of the "no save button" interaction. Mitigation: autosave on a debounced interval (2s) in addition to blur.
- **Performance:** Recurrence generation on every week navigation adds computation. For typical task counts (<500 total), this is negligible. No optimization needed at this scale.
