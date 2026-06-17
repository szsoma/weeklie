# Weeklie UI Polish — Design

**Date:** 2026-06-16
**Source:** `docs/fixes.md` (13 items)
**Status:** Approved (pending spec review)

## Overview

A focused UI polish pass over the Weeklie weekly planner. The changes remove visual noise (borders, placeholder rows), enforce consistent row/header geometry, add an About page, a subtle audio chime, mobile hide-on-scroll for the nav, and stronger contrast. No data model, routing framework, or auth changes.

## Resolved decisions

| Fix | Decision |
|-----|----------|
| #6 About page | Conditional `AboutScreen` component (overlay pattern, like `ReviewScreen`), toggled by state in `App.tsx`. Linked from `FloatingNav`. No router. |
| #8 "edit only the next task row" | Not an edit restriction. All added tasks remain editable. The "next task row" is the always-present **Add-task input** at the bottom of each column; typing + Enter commits the task and a fresh empty Add row is immediately ready (input retains focus). |
| #9 Chime | Synthesized **Web Audio API** tone, two variants (`add`, `complete`). |
| #12 Hide-on-scroll | The **bottom FloatingNav** pill slides out on scroll-down and reappears at/near the top. Desktop unchanged. |
| #2 / #10 Rounding | Unify all row background states and the drag overlay to **`rounded-full`** (pill). |

## Stack context

- React 19 + Vite + TypeScript, Tailwind v4 (`@import "tailwindcss"` + `@theme inline` tokens), Zustand store (`src/store.ts`), `@dnd-kit` drag-and-drop, Supabase persistence.
- App shell (`src/App.tsx`) renders `WeekHeader` (top), `WeekGrid` (scrollable week view with `DayColumn`s + `BacklogPanel`), and `FloatingNav` (bottom pill nav). Screens are toggled via state (e.g. `ReviewScreen`); no router is wired up.
- `src/components/SiteHeader.tsx` is **not rendered** anywhere — an unused marketing header. Left untouched.
- Semantic tokens defined in `src/index.css`: `--bg`, `--surface`, `--ink`, `--muted`, `--faint`, `--rule`, `--rule-strong`, `--today`, with light + `prefers-color-scheme: dark` variants.

## Workstream A — Borders, shapes & row heights (#1, #2, #3, #4, #10)

**Files:** `src/components/NewTaskLine.tsx`, `src/components/TaskRow.tsx`, `src/components/DayColumn.tsx`, `src/App.tsx`.

- **#1 Add-input border:** Remove `border-rule` from the `NewTaskLine` wrapper `div`. Keep only the input's existing keyboard focus ring. Wrapper keeps its hover/focus background.
- **#2 Task-row borders + rounding:** Every task row background state uses `rounded-full` and has no border:
  - idle: no background (transparent), `rounded-full`.
  - hover: `hover:bg-ink/[0.025]`, `rounded-full`.
  - active/editing: `rounded-full`.
  - colored rows: keep `rounded-full` (already pill) — unify the colored overlay + hover to the same radius (already consistent).
  - Remove any `border*` classes from `TaskRow`.
- **#3 Placeholder rows:** Delete the `Array.from({ length: Math.max(0, 3 - tasks.length) })` empty ruled-slot block in `DayColumn`. Only real tasks + the `NewTaskLine` remain.
- **#4 Uniform row height:** Give every row a fixed height so empty/filled/editing/hover/Add are identical. Proposed fixed height **`h-10`** (40px) applied to `TaskRow` root and `NewTaskLine` root; remove the `mt-0.5` drift on `NewTaskLine`. Inner content (checkbox 16px, text) vertically centered.
- **#8 Add-row "next task" flow:** No per-task edit restriction — all added tasks stay editable. Concrete change in `NewTaskLine`: on Enter, commit the task, clear the input, and **keep focus in the same input** (do not blur) so a fresh empty Add row is immediately ready for the next entry. Verify the current `handleKeyDown`/`handleSave` path actually retains focus after `setTitle("")` and fix if it drops focus.
- **#10 Dragged task:** In `App.tsx` `TaskDragOverlay`, change the overlay to `bg-ink text-bg rounded-full` with a large soft shadow (`shadow-2xl` plus a lower-opacity, large-blur layer) and keep `opacity-90` / `cursor-grabbing`. Padding tuned so the pill reads as a task chip.

## Workstream B — Header heights & date styling (#5, #11)

**Files:** `src/components/DayColumn.tsx`, `src/components/BacklogPanel.tsx`.

- **#5 Uniform header height:** Give the `DayColumn` date header and the `BacklogPanel` title row a **shared fixed height** (`min-h-[44px]` with vertically centered, baseline-aligned content) so day headers and the Backlog title align across the grid on both desktop and mobile.
- **#11 Date styling:**
  - Day number + month → **`font-semibold text-ink`** (bold, same color). Month keeps its short form.
  - Day name → **`text-muted`** (lighter than number/month) and **sentence case** (e.g. "Mon", not "MON") — remove `uppercase` and adjust `toLocaleDateString`/casing accordingly.

## Workstream C — About page (#6, plus content)

**Files:** new `src/components/AboutScreen.tsx`, `src/App.tsx`, `src/components/FloatingNav.tsx`.

- New `AboutScreen` overlay component (close button + esc-to-close), styled to match the existing surface/paper aesthetic.
- `App.tsx`: add `showAbout` state; render `<AboutScreen onClose=.../>` when set. Add an `onShowAbout` prop path analogous to `onShowReview`.
- `FloatingNav`: replace the dead `#about` anchor with a real button calling `onShowAbout` (prop threaded from `App`). Leave pre-existing `#features`/`#login`/`#signup` anchors as-is (out of scope).
- **About copy (brief):** "Weeklie is a minimalist weekly task planner. Plan your week across Monday–Sunday columns plus a backlog, drag to reorder, roll over unfinished tasks, and reflect with a weekly review — wrapped in a warm, paper-quiet interface."

## Workstream D — Chime (#9)

**Files:** new `src/lib/sound.ts`, `src/store.ts`.

- `src/lib/sound.ts`:
  - Lazily create a module-level `AudioContext`; resume on first use (add/complete are user gestures, satisfying autoplay rules).
  - `playChime(variant: 'add' | 'complete')` — short, soft synthesized tone (e.g. two quick sine/triangle notes, gentle gain envelope). `complete` slightly higher/longer than `add`.
  - Gate on a `localStorage` flag (`weeklie.sound` defaulting to `'1'`/on) so a future mute toggle needs no rework. No-op silently if disabled or if context creation fails.
- `store.ts`:
  - `addTask`: call `playChime('add')` after a successful insert (not on revert).
  - `toggleDone`: call `playChime('complete')` only when transitioning to `done === true` (not on un-complete), after the update succeeds.

## Workstream E — Mobile hide-on-scroll for FloatingNav (#12)

**Files:** new `src/hooks/useHideOnScroll.ts` (or inline in `FloatingNav`), `src/components/FloatingNav.tsx`.

- Small hook that attaches a scroll listener to the mobile `WeekGrid` scroll container (`.weekgrid`). Tracks scroll direction and position:
  - Hidden state when scrolling **down** and `scrollTop` is beyond a small threshold.
  - Visible state when `scrollTop` is near 0 (top) — i.e. reappears at the top.
  - Reveal-on-scroll-up is acceptable but the hard requirement is **reveal at the top**.
- `FloatingNav` pill + overlay apply a translate-down + fade when hidden. Behavior is **mobile only** (`md:hidden` scope / gated on viewport width); desktop FloatingNav unchanged.

## Workstream F — Contrast (#13)

**File:** `src/index.css`.

Tighten secondary text and hairline tokens so they read stronger (primary `--ink` unchanged):

- **Light:**
  - `--muted`: `#6e6657` → `#514b3f`
  - `--faint`: `#8e8572` → `#6f6657`
  - `--rule`: `rgba(26,26,26,0.08)` → `rgba(26,26,26,0.14)`
  - `--rule-strong`: `rgba(26,26,26,0.16)` → `rgba(26,26,26,0.24)`
- **Dark:**
  - `--muted`: `#a39b8b` → `#bcb4a4`
  - `--faint`: `#857c6f` → `#a39a8a`
  - `--rule`: `rgba(233,227,214,0.09)` → `rgba(233,227,214,0.16)`
  - `--rule-strong`: `rgba(233,227,214,0.18)` → `rgba(233,227,214,0.26)`

(Final values tuned by eye during implementation; the direction is "stronger.")

## Workstream G — Docs (#6 content, #7)

**Files:** `README.md`.

- Replace the default Vite template `README.md` with a project README:
  - What Weeklie is (reuse About copy).
  - Stack: React 19, Vite, TypeScript, Tailwind v4, Zustand, @dnd-kit, Supabase, vite-plugin-pwa.
  - Commands: `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`.
  - High-level project structure (`src/components`, `src/store.ts`, `src/lib`, `src/hooks`).

## Out of scope

- Removing or wiring up the unused `SiteHeader.tsx`.
- Making the dead `#features` / `#login` / `#signup` anchors functional.
- Adding a chime mute UI (only the storage flag is added now).
- Test harness (none exists in repo).

## Verification

Manual verification in the running app (`npm run dev`):
- Rows: no borders; all states (empty, filled, editing, hover, colored, dragged) are `rounded-full` and identical height; Add row matches.
- No placeholder empty rows in any day column.
- Day headers and Backlog header share height; dates styled per #11.
- About opens from FloatingNav and closes cleanly.
- Chime plays on add and on complete (not on un-complete); silent if flag off.
- Mobile: FloatingNav hides on scroll-down, reappears at top; desktop unchanged.
- Contrast visibly stronger in light + dark; `npm run build` and `npm run lint` pass.
