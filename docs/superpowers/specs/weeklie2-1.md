Here is a product specification for features 1, 18, 19, and 2: Habit Tracker, Quick Capture, Keyboard Navigation, and Energy/Mood Check-in.

Weeklie 2.1 Feature Specification

Overview

Weeklie 2.1 expands the app from a weekly task planner into a more complete weekly rhythm tool. The release introduces four connected features:

1. Habit tracker
2. Quick capture
3. Keyboard navigation
4. Energy and mood check-in

These features should preserve Weeklie’s existing product direction: minimalist, calm, paper-like, mobile-first, and focused on weekly planning rather than heavy productivity management.

The goal is to help users not only plan and complete tasks, but also track repeating behaviors, capture tasks quickly, navigate faster, and reflect on how each day felt.

Important: all of these features should work together seamlessly to provide a cohesive weekly rhythm experience. Make sure that these features are proveide the best user experience on Mobile devices too.

⸻

1. Habit Tracker

Purpose

The habit tracker gives users a simple way to track recurring personal behaviors across the week without turning them into tasks.

Tasks answer:

“What do I need to do?”

Habits answer:

“What do I want to keep showing up for?”

Habits should feel lighter than tasks and should not clutter the main task grid.

Core User Stories

* As a user, I can create a habit so I can track it during the week.
* As a user, I can check off a habit for each day of the week.
* As a user, I can see my habit progress for the current week.
* As a user, I can archive habits I no longer want to track.
* As a user, I can see habit performance in the weekly review.

Placement

The habit tracker should appear below the week intention and above the main weekly task grid.

Suggested layout:

Week Header
Week Intention
Habit Tracker
Weekly Task Grid
Backlog

On mobile, the habit tracker should appear as a compact horizontal section above the day columns.

Habit Model

A habit should have:

* Title
* Optional color
* Archived state
* Creation date
* User ownership

A habit entry should have:

* Habit ID
* Date
* Completed state

Suggested Supabase Schema

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  color text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists habit_entries (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references habits(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  date date not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

Recommended indexes:

create index if not exists habits_user_id_idx
on habits(user_id);
create index if not exists habit_entries_user_id_date_idx
on habit_entries(user_id, date);
create index if not exists habit_entries_habit_id_date_idx
on habit_entries(habit_id, date);

UI Behavior

Each habit appears as a row.

Desktop example:

Habit        M   T   W   T   F   S   S
Read         ✓   ✓   ○   ○   ○   ○   ○
Workout      ○   ✓   ○   ○   ○   ○   ○
Journal      ✓   ✓   ✓   ○   ○   ○   ○

Mobile example:

Habits
Read       2/7
Workout    1/7
Journal    3/7

Tapping a habit can expand it into the full Monday-Sunday check grid.

Interactions

Create habit

Users can create a habit using an inline input:

+ Add habit

When submitted:

* Create a new habit.
* Add it to the current week habit list.
* Do not create habit entries until a day is checked.

Check habit

When a user checks a day:

* If no entry exists for that habit/date, create one with completed = true.
* If an entry exists, toggle completed.

Archive habit

Users should be able to archive a habit from a small menu.

Archived habits:

* Should not appear in future weeks by default.
* Should remain visible in past weekly review data.
* Should not delete historical entries.

Delete habit

Deletion should not be part of the primary UI. Prefer archive to protect history.

Weekly Review Integration

The weekly review should include:

* Habit completion count
* Best habit of the week
* Lowest-consistency habit
* Optional streak indicator

Example:

Habits
Read: 5/7
Workout: 3/7
Journal: 6/7

Edge Cases

* If a habit is archived midweek, existing entries should remain.
* If a user navigates to a past week, historical habit entries should still display.
* If a user navigates to a future week, habits should appear but have no completed entries yet.
* If a user signs out, habit data should clear from local state.
* Offline habit toggles should eventually sync when persistence is available.

Acceptance Criteria

* Users can create a habit.
* Users can check and uncheck habits for specific days.
* Habit entries save to Supabase.
* Habits are scoped to the authenticated user.
* Archived habits disappear from active tracking.
* Historical habit entries remain available.
* Weekly review displays habit completion data.

⸻

2. Quick Capture

Purpose

Quick capture lets users add a task without navigating to a specific day or backlog first.

This should make Weeklie feel faster and more useful during active work.

Core User Stories

* As a user, I can quickly add a task from anywhere in the app.
* As a user, I can choose whether the task goes to today, a weekday, or the backlog.
* As a user, I can use a keyboard shortcut to open quick capture.
* As a mobile user, I can tap a floating add button to capture a task quickly.

Entry Points

Desktop:

* Cmd + K / Ctrl + K opens quick capture.
* Optional: C opens quick capture when not typing inside an input.
* Floating nav can include a small add button.

Mobile:

* Floating add button in the bottom area.
* Button should hide while scrolling if it conflicts with the existing mobile nav behavior.

Quick Capture Modal

The modal should be simple and keyboard-friendly.

Fields:

1. Task title
2. Destination
3. Optional note
4. Optional due time
5. Optional color

Default destination:

* If viewing the current week: today
* If viewing another week: backlog
* If Today Focus is active: today
* If backlog search is focused: backlog

Example:

Quick Capture
Task
[ Buy printer paper ]
Where should it go?
[ Today v ]
Optional note
[ For client contract folder ]
[ Add task ]

Destination Options

Possible destinations:

* Today
* Monday
* Tuesday
* Wednesday
* Thursday
* Friday
* Saturday
* Sunday
* Backlog

If the user is viewing a non-current week, weekday destinations should refer to the visible week.

Keyboard Behavior

Inside quick capture:

* Enter submits when title is focused and no multiline note is active.
* Escape closes the modal.
* Tab moves through fields.
* Arrow keys can move through destination options.
* Cmd + Enter / Ctrl + Enter submits from anywhere inside the modal.

Task Creation Behavior

When a task is added:

* Create the task in the selected destination.
* Use the same task model as existing tasks.
* Assign fractional index so it appears at the top or bottom consistently.

Recommended default:

* Add to top of selected day or backlog.

Sound and Feedback

Since Weeklie already uses subtle interaction chimes:

* Play a soft add-task sound when quick capture succeeds.
* Show a small confirmation message.

Example:

Added to Tuesday

Edge Cases

* Empty task titles should not submit.
* Whitespace-only titles should not submit.
* If Supabase save fails, show a quiet error state.
* If unauthenticated, quick capture should be disabled or prompt sign-in.
* If the destination is today but the visible week is not current, clarify the task will be added to the real current day.

Acceptance Criteria

* Cmd + K and Ctrl + K open quick capture.
* Mobile users can open quick capture from a visible add button.
* Users can add a task to today, any weekday, or backlog.
* Optional note, due time, and color are saved.
* Quick capture works without breaking existing drag-and-drop behavior.
* The modal is fully keyboard accessible.

⸻

3. Keyboard Navigation

Purpose

Keyboard navigation helps desktop users move faster through Weeklie and improves accessibility.

The feature should support common actions without requiring the mouse, while avoiding conflicts with normal typing.

Core User Stories

* As a user, I can navigate between days using the keyboard.
* As a user, I can create tasks using the keyboard.
* As a user, I can mark tasks done using the keyboard.
* As a user, I can move tasks between days using keyboard shortcuts.
* As a user, I can focus search and quick capture using shortcuts.

Global Shortcuts

Global shortcuts should only work when the user is not typing in an input, textarea, select, or editable field.

Recommended shortcuts:

Cmd/Ctrl + K    Open quick capture
/               Focus backlog search
T               Toggle Today Focus
N               Add task to focused day
Esc             Close modal or clear active selection

Optional:

?               Open keyboard shortcut help

Task-Level Shortcuts

When a task is focused:

Enter           Edit task title
Space           Toggle done
Cmd/Ctrl + Enter Mark done
Backspace       Delete task, with confirmation or undo
Arrow Up        Move focus to previous task
Arrow Down      Move focus to next task
Arrow Left      Move focus to previous day column
Arrow Right     Move focus to next day column
Shift + Left    Move task to previous day
Shift + Right   Move task to next day

Column-Level Shortcuts

When a day column is focused:

Enter           Add new task to this day
Arrow Left      Focus previous day
Arrow Right     Focus next day
Arrow Down      Focus first task in column

Backlog should behave like a column.

Focus Management

Weeklie should have a visible focus state that matches the warm paper UI.

Requirements:

* Focus rings must be visible in light and dark mode.
* Focus should not use harsh default browser styling if it clashes with the design.
* Focus should remain accessible and high contrast.
* Drag-and-drop handles must not trap focus.

Shortcut Help Dialog

Add a small keyboard help dialog.

Open with:

?

Suggested content:

Keyboard shortcuts
Quick capture       Cmd/Ctrl + K
Focus backlog       /
Toggle today        T
Add task            N
Mark done           Space
Move task           Shift + Arrow
Close               Esc

Accessibility Requirements

* All task actions available by mouse should also be available by keyboard.
* Modals should trap focus while open.
* Escape should close dialogs.
* Buttons should have accessible names.
* Shortcut-only actions should also have visible UI alternatives.

Edge Cases

* Shortcuts should not fire while editing task titles or notes.
* Shortcuts should not fire while typing in backlog search.
* Space should not scroll the page when a task is focused.
* Keyboard task movement should preserve task ordering.
* Moving a task across week boundaries should not happen unless explicitly supported.
* Today Focus shortcut should be disabled outside the current week, matching the existing UI rule.

Acceptance Criteria

* Users can navigate the grid with arrow keys.
* Users can create, edit, complete, and move tasks with the keyboard.
* Shortcuts do not interfere with typing.
* A keyboard help dialog is available.
* Focus states are visible and accessible.
* Keyboard navigation works in light and dark mode.

⸻

4. Energy and Mood Check-in

Purpose

Energy and mood check-ins help users reflect on how each day felt, not just what they completed.

This feature should stay very lightweight. It should not become a full journal unless the user chooses to add notes later.

Core User Stories

* As a user, I can mark my energy or mood for each day.
* As a user, I can see daily check-ins during weekly review.
* As a user, I can understand how my energy relates to task completion.
* As a user, I can leave a day blank if I do not want to track it.

Recommended Model

Use a simple daily check-in model connected to a date.

Each daily check-in can contain:

* Energy score
* Mood label
* Optional note

Suggested Supabase Schema

create table if not exists day_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  date date not null,
  energy smallint,
  mood text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date),
  check (energy is null or energy between 1 and 5)
);

Recommended index:

create index if not exists day_checkins_user_id_date_idx
on day_checkins(user_id, date);

UI Placement

Each day column can include a small check-in control near the day heading.

Example:

Monday
Energy: ○ ○ ○ ○ ○
Mood: Calm

To keep the grid minimal, the default display could be compressed:

Monday    Energy 4 · Calm

Clicking opens a small popover.

Energy Scale

Use a 1 to 5 scale.

Suggested labels:

1 Very low
2 Low
3 Okay
4 Good
5 High

The UI can show this as five small dots, bars, or paper marks.

Mood Options

Keep the mood list short.

Recommended moods:

Calm
Focused
Scattered
Tired
Stressed
Good

Users should not need to choose both energy and mood. Either field can be blank.

Optional Daily Note

The note should be short and optional.

Examples:

Slept badly.
Good focus after lunch.
Too many meetings.

This note should not replace task notes or weekly review notes.

Save Behavior

Check-ins should save automatically:

* On energy selection
* On mood selection
* On note blur
* On Enter inside note field

Escape should discard unsaved note edits.

This matches the existing task note behavior.

Weekly Review Integration

The weekly review should show:

* Average energy
* Most common mood
* Best energy day
* Lowest energy day
* Optional relationship to completion rate

Example:

Daily rhythm
Average energy: 3.6/5
Most common mood: Focused
Best day: Wednesday
Lowest energy: Friday
You completed the most tasks on higher-energy days.

The final line should only appear if there is enough data to support it.

Edge Cases

* If a day has no check-in, display nothing or a soft empty state.
* If fewer than three days have energy data, do not show trend conclusions.
* If a user edits a past week, update historical review data.
* If the user is unauthenticated, check-ins should not load or save.
* Future days can allow check-ins, but the UI should avoid nudging users to fill them early.

Acceptance Criteria

* Users can set energy from 1 to 5 for each day.
* Users can select an optional mood for each day.
* Users can add an optional short note.
* Check-ins save per user and date.
* Weekly review summarizes check-in data.
* The feature works across current and past weeks.
* Blank check-ins are allowed.

⸻

Shared Implementation Notes

Store Updates

The Zustand store should add state and actions for:

habits
habitEntries
dayCheckins
quickCaptureOpen
focusedColumnId
focusedTaskId

Suggested actions:

createHabit()
archiveHabit()
toggleHabitEntry()
loadHabitsForWeek()
loadHabitEntriesForWeek()
openQuickCapture()
closeQuickCapture()
createTaskFromQuickCapture()
setFocusedColumn()
setFocusedTask()
moveFocusedTask()
upsertDayCheckin()
loadDayCheckinsForWeek()

TypeScript Types

Suggested types:

type Habit = {
  id: string;
  userId: string;
  title: string;
  color?: string | null;
  archived: boolean;
  createdAt: string;
};
type HabitEntry = {
  id: string;
  habitId: string;
  userId: string;
  date: string;
  completed: boolean;
  createdAt: string;
};
type DayCheckin = {
  id: string;
  userId: string;
  date: string;
  energy?: number | null;
  mood?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};
type QuickCaptureDestination =
  | "today"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday"
  | "backlog";

Components

New components:

HabitTracker
HabitRow
HabitAddInput
HabitMenu
QuickCaptureDialog
KeyboardShortcutsDialog
DayCheckinButton
DayCheckinPopover

Possible updates to existing components:

WeekGrid
DayColumn
TaskRow
BacklogPanel
WeekHeader
WeeklyReview
FloatingNav
TodayFocusButton

Testing

Recommended tests:

habit creation
habit entry toggle
habit archive behavior
habit weekly summary
quick capture opens from shortcut
quick capture creates task in selected destination
quick capture rejects empty title
keyboard shortcuts ignored while typing
task focus moves with arrow keys
task can be marked done by keyboard
task can move between days by keyboard
day check-in saves energy
day check-in saves mood
weekly review calculates average energy

Release Priority

Recommended implementation order:

1. Quick capture
2. Keyboard navigation
3. Energy and mood check-in
4. Habit tracker

Reasoning:

Quick capture and keyboard navigation improve the core task experience first. Energy check-ins are simpler than the habit tracker and can feed into the weekly review. Habit tracking is the largest feature because it requires new data models, weekly UI, and review summaries.

Definition of Done

Weeklie 2.1 is complete when:

* Users can add tasks quickly from anywhere.
* Users can operate the main planner with keyboard shortcuts.
* Users can track daily energy and mood.
* Users can create and complete weekly habits.
* Weekly review includes habit and energy insights.
* All features work with Supabase persistence.
* Mobile layouts remain clean and usable.
* Light and dark mode both remain visually consistent.
* Existing Weeklie 2.0 features continue to work.

A good next step would be turning this into implementation tickets grouped by files, components, store actions, and Supabase migrations.
