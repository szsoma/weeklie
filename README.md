# Weekly

A minimalist weekly task planner. Plan your week across Monday–Sunday columns plus a backlog, drag to reorder, roll over unfinished tasks, and reflect with a weekly review — wrapped in a warm, paper-quiet interface.

## Features

Weekly 2.0 adds a cohesive set of tools across the three moments of a week — setting it up, working through it, and reviewing it.

**Planning the week**
- **Week intention** — a single italic line under the header ("This week I want to…") saved per week.
- **Copy last week** — pull undone tasks from the previous week onto the matching weekdays (title, color, and note copied; recurrence and backlog items skipped).
- **Recurring tasks** — mark a task Daily or Weekly; completing it spawns the next undone instance with the same title, color, note, and due time.

**Day-to-day execution**
- **Today focus** — toggle the floating-nav pill (or the mobile header button) to collapse the grid to just today; the backlog hides and the toggle disables outside the current week.
- **Due-time reminders** — set a reminder time on a task and get a browser notification with a **Mark done** action when it fires.
- **Task notes** — a short second line under any task title for context (saves on blur / Enter, discards on Escape).
- **Backlog search** — filter the backlog by title as you type.

**Weekly review**
- **Week-over-week trends** — a small four-week completion chart under the ring stat.
- **Slipped-task emphasis** — tasks rolled over three or more times get a warning badge and a gentle "Still relevant?" nudge.

The light-mode background was also lightened toward near-white paper so task highlight colors read more clearly; dark mode is unchanged.

## Stack

- **React 19** + **Vite** + **TypeScript**
- **Tailwind CSS v4** (semantic tokens, light/dark via `prefers-color-scheme`)
- **Zustand** for state
- **@dnd-kit** for drag-and-drop reordering
- **Supabase** for the existing owner account and planner data
- **vite-plugin-pwa** (`injectManifest`) for installable PWA support and a custom service worker that bridges notification taps
- Web Audio API for subtle interaction chimes; Notifications API for due-time reminders

## Getting started

```bash
cp .env.example .env
npm install
npm run dev
```

Set the Supabase URL, publishable key, and `VITE_OWNER_EMAIL` in `.env` before starting the app. Use the email of the existing Supabase account that owns the planner data. Open the printed local URL and enter that account's password to unlock the device. The email is included in the frontend build; keep the password out of `.env` and enter it only in the unlock screen. Each device remembers its own Supabase session. Use **Forget this device** to clear only that device's session.

## Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite dev server with HMR   |
| `npm run build`   | Type-check (`tsc -b`) and build      |
| `npm run preview` | Preview the production build locally |
| `npm run lint`    | Run ESLint                           |

Component tests live under `tests/` and run on Node's built-in test runner — e.g. `npm run test:taskrow-note-menu`, `npm run test:taskrow-popover-menu`, `npm run test:input-focus-style`.

## Project structure

```
src/
├── components/      # UI: WeekGrid, DayColumn, TaskRow, BacklogPanel,
│                    #     WeekHeader, WeekIntention, WeekTrendBars,
│                    #     TodayFocusButton, FloatingNav, dialogs
├── hooks/           # React hooks (useRollover, useTheme, useHideOnScroll,
│                    #              useFocusTrap, useGlobalShortcuts)
├── lib/             # Pure helpers (supabase client, sound, fractional-index,
│                    #     reorder, recurrence, reminders, notifications,
│                    #     habits, task-colors, quick-capture, scheduler,
│                    #     streak, keyboard, week-insights, week-share)
├── store.ts         # Zustand store: tasks, events, reviews, actions
├── dates.ts         # Date/week helpers
├── sw.ts            # Service worker — precaching + notification-click bridge
├── types.ts         # Shared TypeScript types
└── index.css        # Theme tokens + base styles
```

`supabase/schema.sql` is the reference schema. Weekly 2.0 adds nullable `recurrence`, `note`, and `due_time` columns on `tasks` and an `intention` column on `week_reviews`; apply the same `alter table … add column if not exists` statements to your Supabase project before deploying.

**Required before deploying this frontend:** apply `supabase/migrations/20260816000000_widen_task_order.sql` (`alter table public.tasks alter column "order" type double precision`) to your Supabase project. Drag-to-reorder now persists fractional order values (e.g. `1.5`) between existing rows. If the column is still `integer` when the new frontend ships, PostgREST rejects those writes with a 400 on any mid-column drop and the optimistic reorder silently reverts.

**Also required before deploying the habit integrity changes:** apply `supabase/migrations/20261005000000_habit_integrity.sql` to the same Supabase project. It adds authenticated database functions that atomically create generated tasks and habit instances, and remove a habit with its future generated tasks. The frontend calls these functions; habit generation and removal will fail until the migration is applied. The migration preserves existing rows.

## Notes

- Planner data loads only for the configured existing Supabase account. Public read-only week links remain available without unlocking.
- Unfinished past tasks roll over to today automatically.
- Recurring instances are generated on app load and when navigating into a week whose next occurrence is missing.
- Reminders fire reliably while the app (or installed PWA) is open; background delivery depends on the platform keeping the service worker active.
- Designed mobile-first; the bottom nav hides while scrolling on mobile.
