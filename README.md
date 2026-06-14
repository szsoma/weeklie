# weeklie

A minimal, local-first weekly task planner built as a Progressive Web App. Plan your week day-by-day, drag tasks between days, and reflect on your progress with a weekly review screen.

## Features

### Weekly Grid

A 7-column layout (Mon–Sun) showing tasks for each day. On mobile, columns stack vertically and auto-scroll to today. Navigate between weeks with arrow keys or the header controls.

### Task Management

- **Inline creation** — type a task title at the bottom of any day column or the backlog
- **Inline editing** — click any task title to edit it; press Enter to save, Escape to cancel
- **Completion** — checkbox toggles done state with timestamp tracking
- **Color coding** — click the color dot to cycle through 6 colors
- **Deletion** — hover to reveal the × button

### Drag and Drop

Tasks can be dragged between days and to/from the backlog panel using `@dnd-kit`. Supports both mouse (pointer) and touch input with activation constraints to prevent accidental drags.

### Backlog

A persistent bottom panel for tasks without a scheduled date. Tasks can be moved from the backlog to any day and vice versa.

### Automatic Rollover

Incomplete tasks from past days are automatically moved to today on app load and when the browser tab regains focus. Each rollover is tracked with a counter visible in the weekly review.

### Weekly Review

On Sundays, a "Ready for your weekly review?" button appears. The review screen shows:

- Completion ring chart (SVG) with percentage
- List of completed tasks
- Slipped tasks with rollover counts and actions (move to next week, backlog, or delete)
- Reflection input
- Review streak counter

### PWA

Installable as a standalone app with offline support via Workbox (auto-generated service worker).

## Tech Stack

### Core

| Technology | Version | Purpose |
|---|---|---|
| **React** | 19.2 | UI framework |
| **TypeScript** | 6.0 | Type safety |
| **Vite** | 8.0 | Build tool and dev server |

### State & Data

| Technology | Version | Purpose |
|---|---|---|
| **Zustand** | 5.0 | Global state management |
| **Dexie** | 4.4 | IndexedDB wrapper for client-side persistence |
| **nanoid** | 5.1 | Unique ID generation |

### UI & Interaction

| Technology | Version | Purpose |
|---|---|---|
| **Tailwind CSS** | 4.3 | Utility-first styling (via `@tailwindcss/vite` plugin) |
| **@dnd-kit** | 6.3 / 10.0 | Drag-and-drop (core + sortable) |
| **date-fns** | 4.4 | Date manipulation and formatting |
| **Geist** | 1.0 | Typeface (loaded via CDN) |

### Build & Tooling

| Technology | Version | Purpose |
|---|---|---|
| **vite-plugin-pwa** | 1.3 | PWA manifest and service worker generation |
| **ESLint** | 10.3 | Linting with React Hooks and React Refresh plugins |
| **typescript-eslint** | 8.59 | TypeScript-aware ESLint rules |

## Project Structure

```
weeklie/
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── src/
│   ├── components/
│   │   ├── BacklogPanel.tsx    # Unscheduled tasks panel
│   │   ├── DayColumn.tsx       # Single day in the week grid
│   │   ├── NewTaskLine.tsx     # Inline task creation input
│   │   ├── ReviewScreen.tsx    # Weekly review overlay
│   │   ├── RingChart.tsx       # SVG completion ring chart
│   │   ├── TaskRow.tsx         # Individual task with edit/color/drag
│   │   ├── Toast.tsx           # Notification toast
│   │   ├── WeekGrid.tsx        # 7-column day layout
│   │   └── WeekHeader.tsx      # Week navigation header
│   ├── hooks/
│   │   └── useRollover.ts      # Auto-rollover on load/focus
│   ├── lib/
│   │   └── fractional-index.ts # Ordering algorithm for drag-and-drop
│   ├── App.tsx                 # Root component with DndContext
│   ├── dates.ts                # Date utility functions
│   ├── db.ts                   # Dexie database schema
│   ├── index.css               # Tailwind import + theme variables
│   ├── main.tsx                # Entry point, bootstrap data loading
│   ├── nanoid.ts               # ID generator wrapper
│   ├── rollover.ts             # Overdue task detection
│   ├── store.ts                # Zustand store with all actions
│   ├── types.ts                # Task and WeekReview type definitions
│   └── vite-env.d.ts           # Vite client types
├── index.html                  # HTML entry with Geist font links
├── package.json
├── tsconfig.json               # Project references (app + node)
├── tsconfig.app.json           # App TypeScript config
├── tsconfig.node.json          # Node TypeScript config
├── vite.config.ts              # Vite + React + Tailwind + PWA
└── eslint.config.js            # ESLint flat config
```

## Data Model

### Task

```typescript
type Task = {
  id: string              // nanoid
  title: string
  date: string | null     // "YYYY-MM-DD", null = Backlog
  done: boolean
  doneAt: string | null   // ISO timestamp
  color: number | null    // 0-5 palette index
  order: number           // fractional index for sorting
  createdAt: string       // ISO timestamp
  rolledOverCount: number // times auto-moved to today
}
```

### WeekReview

```typescript
type WeekReview = {
  weekId: string          // e.g. "2026-W24"
  completedCount: number
  rolledOverCount: number
  reflection: string
  viewedAt: string        // ISO timestamp
  streak: number          // consecutive review weeks
}
```

## Database

Uses **Dexie** (IndexedDB) with two object stores:

- `tasks` — indexed by `id`, `date`, `done`, `order`
- `reviews` — indexed by `weekId`

All data is stored locally in the browser. No server, no authentication, no cloud sync.

## Architecture

### State Management

A single Zustand store (`src/store.ts`) holds all application state and actions. The store loads data from IndexedDB on bootstrap (`main.tsx`) and writes back on every mutation. This keeps the UI reactive while ensuring data persistence.

### Drag and Drop

`@dnd-kit/core` provides the `DndContext` at the app level. Each `DayColumn` and the `BacklogPanel` register as droppable targets. Each `TaskRow` is draggable. The `fractional-index` utility calculates order values between adjacent tasks to avoid reindexing the entire list.

### Rollover Engine

The `useRollover` hook runs on mount and on `visibilitychange`. It finds tasks with dates before today that aren't done, updates their date to today, and increments their rollover counter. The `rollover.ts` module contains the pure filtering logic.

### Styling

Tailwind CSS v4 via the `@tailwindcss/vite` plugin. Theme colors use CSS custom properties (`--bg`, `--text`) with `prefers-color-scheme: dark` media query support. The `prefers-reduced-motion` media query disables animations.

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check with `tsc` then build with Vite |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint on the project |

## Browser Support

Requires a modern browser with support for:

- IndexedDB
- CSS Grid
- ES2023
- `prefers-color-scheme` / `prefers-reduced-motion`
