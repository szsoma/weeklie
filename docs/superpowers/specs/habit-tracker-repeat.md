To help you build a robust recurring task feature for your habit tracker, here is the breakdown of how macOS Reminders handles repeats, followed by a structured development plan.

---

## 🛠️ macOS Reminders "Repeat" Feature Breakdown

Based on the UI provided, the system uses a **preset-driven configuration** that cascades into a **highly customizable recurrence engine** when needed.

### 1. Preset Options (Standard Triggers)

When clicking the "Repeat" menu, users are presented with a clean dropdown list of common intervals:

* **Never:** Single-occurrence task.
* **Daily:** Repeats every day.
* **Weekdays:** Repeats Monday through Friday.
* **Weekends:** Repeats Saturday and Sunday.
* **Weekly:** Repeats on the same day every week.
* **Biweekly:** Repeats every two weeks.
* **Monthly:** Repeats on the same date/day every month.
* **Every 3 Months / Every 6 Months / Yearly:** Standard long-term intervals.

### 2. Custom Recurrence Model

Selecting **"Custom..."** opens a modal to fine-tune the rule. It relies on two main variables:

* **Frequency:** A dropdown specifying the base unit of time (`Daily`, `Weekly`, `Monthly`, `Yearly`).
* **Interval:** An integer input (`Every [ X ] Day/Week/Month/Year`) allowing the user to skip increments (e.g., *Every 3 Days*).

---

## 📋 Habit Tracker Development Plan

Since this is for a **habit tracker**, you need to ensure your data model supports tracking completions per interval without polluting the user's main task list with infinite future entries.

### Phase 1: Database & Data Modeling

Instead of generating hundreds of future database rows, use a **Rule-based Architecture** (similar to the iCalendar `RRULE` RFC 5545 standard).

* **Task/Habit Schema:**
```json
{
  "id": "habit_123",
  "title": "3 / 5 workouts",
  "is_recurring": true,
  "recurrence_rule": {
    "frequency": "weekly", // daily, weekly, monthly, custom
    "interval": 1,        // every 1 week, every 2 days, etc.
    "by_weekdays": [1, 3, 5] // e.g., Mon, Wed, Fri (if applicable)
  },
  "start_date": "2026-07-09"
}

```


* **Completion Logs Schema:** Track history in a separate collection/table.
```json
{
  "log_id": "log_999",
  "habit_id": "habit_123",
  "completed_at": "2026-07-09T18:30:00Z",
  "target_period": "2026-W28" // Helps track weekly/daily buckets
}

```



### Phase 2: Core Logic Engine

You need backend or local client utilities to compute when a habit is due.

* **The "Next Occurrence" Generator:** Write a function that takes the `start_date` and `recurrence_rule` to calculate the next valid date the habit should appear.
* **The "Reset/Rollover" Cron Job:** For a habit tracker, decide if uncompleted habits roll over as "overdue" or simply reset (e.g., if you don't hit "3/5 workouts" this week, Monday starts a clean slate).

### Phase 3: UI/UX Component Construction

Build the front-end components mirroring the macOS layout:

* **Component A (The Selector Dropdown):** A standard dropdown menu listing the quick presets (`Daily`, `Weekly`, etc.). The last item is "Custom...".
* **Component B (The Custom Modal):** A conditional popover or modal.
* *State handling:* If Frequency = `Daily`, show text `Every [X] Days`.
* *Habit Tracker Extra:* If Frequency = `Weekly`, consider adding a weekday picker (M, T, W, Th, F, S, S) so users can explicitly track "Every Tuesday and Thursday".



### Phase 4: Habit-Specific Edge Cases

Unlike a simple reminder app, habit tracking has strict tracking constraints:

* **Timezone Changes:** Store recurrence start times in UTC but evaluate "Daily" logic using the user's local timezone so a 12:00 AM reset happens at *their* midnight.
* **Historic Logging:** Ensure that editing a habit's repeat structure (e.g., changing from "Daily" to "Weekly") does *not* break or misalign past completion history maps.

---
