# Weeklie

A minimalist weekly task planner. Plan your week across Monday–Sunday columns plus a backlog, drag to reorder, roll over unfinished tasks, and reflect with a weekly review — wrapped in a warm, paper-quiet interface.

## Stack

- **React 19** + **Vite** + **TypeScript**
- **Tailwind CSS v4** (semantic tokens, light/dark via `prefers-color-scheme`)
- **Zustand** for state
- **@dnd-kit** for drag-and-drop reordering
- **Supabase** for auth and persistence
- **vite-plugin-pwa** for installable PWA support
- Web Audio API for subtle interaction chimes

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL in your browser.

## Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite dev server with HMR   |
| `npm run build`   | Type-check (`tsc -b`) and build      |
| `npm run preview` | Preview the production build locally |
| `npm run lint`    | Run ESLint                           |

## Project structure

```
src/
├── components/      # UI: WeekGrid, DayColumn, TaskRow, BacklogPanel, nav, dialogs
├── hooks/           # React hooks (e.g. useRollover, useHideOnScroll)
├── lib/             # Pure helpers (supabase client, sound, fractional-index)
├── store.ts         # Zustand store: tasks, events, reviews, actions
├── dates.ts         # Date/week helpers
├── types.ts         # Shared TypeScript types
└── index.css        # Theme tokens + base styles
```

## Notes

- Auth-gated: sign in via Supabase before tasks load.
- Unfinished past tasks roll over to today automatically.
- Designed mobile-first; the bottom nav hides while scrolling on mobile.
