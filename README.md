# Weeklie

A minimalist weekly task planner. Plan your week across Monday–Sunday columns plus a backlog, drag to reorder, roll over unfinished tasks, and reflect with a weekly review — wrapped in a warm, paper-quiet interface.

## Features

Weeklie 2.0 adds a cohesive set of tools across the three moments of a week — setting it up, working through it, and reviewing it.

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
- **Supabase** for auth and persistence
- **vite-plugin-pwa** (`injectManifest`) for installable PWA support and a custom service worker that bridges notification taps
- Web Audio API for subtle interaction chimes; Notifications API for due-time reminders

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL in your browser. Sign in via Supabase to load tasks.

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
├── hooks/           # React hooks (useTodayFocus, useRollover, useHideOnScroll)
├── lib/             # Pure helpers (supabase client, sound, fractional-index,
│                    #     recurrence, reminders)
├── store.ts         # Zustand store: tasks, events, reviews, actions
├── dates.ts         # Date/week helpers
├── sw.ts            # Service worker — precaching + notification-click bridge
├── types.ts         # Shared TypeScript types
└── index.css        # Theme tokens + base styles
```

`supabase/schema.sql` is the reference schema. Weeklie 2.0 adds nullable `recurrence`, `note`, and `due_time` columns on `tasks` and an `intention` column on `week_reviews`; apply the same `alter table … add column if not exists` statements to your Supabase project before deploying.

## Notes

- Auth-gated: sign in via Supabase before tasks load.
- Unfinished past tasks roll over to today automatically.
- Recurring instances are generated on app load and when navigating into a week whose next occurrence is missing.
- Reminders fire reliably while the app (or installed PWA) is open; background delivery depends on the platform keeping the service worker active.
- Designed mobile-first; the bottom nav hides while scrolling on mobile.
