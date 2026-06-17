# Weeklie UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the 13 fixes in `docs/fixes.md` — remove borders/placeholders, unify row + header geometry to `rounded-full`, add an About page, a Web Audio chime, mobile hide-on-scroll for the nav, and stronger contrast.

**Architecture:** Pure front-end changes to the existing React 19 + Vite + Tailwind v4 + Zustand + dnd-kit app. No routing, data model, or auth changes. New files: `src/lib/sound.ts`, `src/components/AboutScreen.tsx`, `src/hooks/useHideOnScroll.ts`. Modified: `index.css`, `TaskRow.tsx`, `NewTaskLine.tsx`, `DayColumn.tsx`, `BacklogPanel.tsx`, `App.tsx`, `FloatingNav.tsx`, `README.md`.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind v4 (`@theme inline` tokens), Zustand, @dnd-kit/core, Supabase, Web Audio API.

**Spec:** `docs/superpowers/specs/2026-06-16-weeklie-ui-polish-design.md`

**Testing strategy:** No test runner exists in this repo (only `eslint`). Each task verifies with `npm run lint`; the final task runs `npm run build` (which runs `tsc -b`). Visual/interactive behavior is verified manually in the running app (`npm run dev`). Do not add a test framework — it is out of scope.

**Baseline note:** The working tree currently has uncommitted modifications to `DayColumn.tsx`, `NewTaskLine.tsx`, `SiteHeader.tsx`, and `TaskRow.tsx`. This plan's "Modify" instructions and code blocks are written against that current content (the state in the working tree right now). If you want each task's commit to be clean, commit or stash those WIP changes before starting. Otherwise, task commits will bundle prior WIP for the touched file — which is fine.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/index.css` | Semantic color tokens (light/dark) | Modify — tighten contrast |
| `src/components/TaskRow.tsx` | A single task row | Modify — `rounded-full`, fixed height, no borders |
| `src/components/NewTaskLine.tsx` | The "Add task" input row | Modify — no border, fixed height, focus retention |
| `src/components/DayColumn.tsx` | One weekday column | Modify — remove placeholder rows, header height, date styling |
| `src/components/BacklogPanel.tsx` | Backlog column | Modify — header height to match day columns |
| `src/App.tsx` | App shell + drag overlay | Modify — drag overlay styling, About state |
| `src/lib/sound.ts` | Web Audio chime | Create |
| `src/store.ts` | Zustand store | Modify — trigger chime on add/complete |
| `src/components/AboutScreen.tsx` | About overlay | Create |
| `src/components/FloatingNav.tsx` | Bottom nav pill | Modify — About link, hide-on-scroll |
| `src/hooks/useHideOnScroll.ts` | Mobile scroll-hide hook | Create |
| `README.md` | Project docs | Modify — replace Vite template |

---

### Task 1: Tighten contrast tokens (#13)

**Files:**
- Modify: `src/index.css:20-42`

- [ ] **Step 1: Replace the `:root` token block**

In `src/index.css`, replace the light `:root` block (lines 20–29):

```css
:root {
  --bg: #fbfad2; /* light yellowish paper */
  --surface: #fbf8de; /* lifted card */
  --ink: #1a1a1a; /* primary text */
  --muted: #514b3f; /* readable secondary text */
  --faint: #6f6657; /* subtle labels / placeholders */
  --rule: rgba(26, 26, 26, 0.14);
  --rule-strong: rgba(26, 26, 26, 0.24);
  --today: #f6f0c8;
}
```

- [ ] **Step 2: Replace the dark token block**

Replace the `@media (prefers-color-scheme: dark)` `:root` block (lines 31–42):

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1a1a1a;
    --surface: #21211f;
    --ink: #e9e3d6; /* warm off-white */
    --muted: #bcb4a4;
    --faint: #a39a8a;
    --rule: rgba(233, 227, 214, 0.16);
    --rule-strong: rgba(233, 227, 214, 0.26);
    --today: #27241e;
  }
}
```

- [ ] **Step 3: Verify**

Run: `npm run lint`
Expected: passes (CSS-only change; lint should be clean).

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "refine: strengthen muted/faint text and rule contrast"
```

---

### Task 2: TaskRow — rounded-full, fixed height, no borders (#2, #4)

**Files:**
- Modify: `src/components/TaskRow.tsx:117-132`

- [ ] **Step 1: Replace the TaskRow root element className**

In `src/components/TaskRow.tsx`, replace the root `<div>` opening tag (the one with `ref={setNodeRef}`, currently lines 118–132):

```tsx
    <div
      ref={setNodeRef}
      style={rowStyle}
      {...listeners}
      {...attributes}
      className={`group relative flex items-center m-1 gap-2 px-2 h-10 text-sm leading-snug rounded-full transition-colors ${
        isDragging
          ? "opacity-40 cursor-grabbing"
          : isEditing
            ? "cursor-text"
            : "cursor-grab hover:bg-ink/[0.025]"
      }`}
    >
```

Changes vs. current: removed `py-2`, added `h-10`; replaced the `${hasColor ? "rounded-full" : ""}` conditional with an unconditional `rounded-full`; no border classes (there were none, confirmed). The colored overlay `<div>` at line ~136 already uses `rounded-full`, so colored + hover + idle now share one radius.

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: passes.
Manual: `npm run dev` → every task row (empty, filled, colored, hovered) is a 40px-tall pill with no borders; hover shows a rounded fill.

- [ ] **Step 3: Commit**

```bash
git add src/components/TaskRow.tsx
git commit -m "refine: unify task rows to rounded-full at fixed height"
```

---

### Task 3: NewTaskLine — no border, fixed height, focus retention (#1, #4, #8)

**Files:**
- Modify: `src/components/NewTaskLine.tsx:22-56`

- [ ] **Step 1: Add focus retention to the Enter handler**

In `src/components/NewTaskLine.tsx`, replace the `handleKeyDown` function (lines 22–28):

```tsx
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
      inputRef.current?.focus();
    }
    if (e.key === "Escape") {
      setTitle("");
      inputRef.current?.blur();
    }
  };
```

(This keeps focus in the input after Enter so the next task can be typed immediately. The `focus()` lives in the Enter branch only — not in `handleSave` — so it never fights the `onBlur` handler.)

- [ ] **Step 2: Replace the wrapper element className**

Replace the wrapper `<div>` opening tag (currently lines 31–35):

```tsx
    <div
      className={`flex items-center gap-2 px-2 m-1 h-10 rounded-full transition-colors ${
        isFocused ? "bg-ink/[0.03]" : "hover:bg-ink/[0.025]"
      }`}
    >
```

Changes vs. current: removed `border-rule`, `mt-0.5`, and `py-2`; added `m-1` and `h-10` to match `TaskRow`'s box model exactly, plus unconditional `rounded-full`.

- [ ] **Step 3: Verify**

Run: `npm run lint`
Expected: passes.
Manual: in the app, focus an "Add task…" input, type a title, press Enter → task is added, input clears, **focus stays** in the same input ready for the next task; the Add row is 40px tall with no border and a rounded hover/focus fill, matching task rows.

- [ ] **Step 4: Commit**

```bash
git add src/components/NewTaskLine.tsx
git commit -m "refine: borderless add-row at fixed height with focus retention"
```

---

### Task 4: DayColumn — remove placeholders, header height, date styling (#3, #5, #11)

**Files:**
- Modify: `src/components/DayColumn.tsx:36-72`

- [ ] **Step 1: Replace the date header**

In `src/components/DayColumn.tsx`, replace the header `<div>` block (lines 36–55):

```tsx
      <div
        className="sticky top-0 z-10 md:static px-2 min-h-[44px] flex items-center justify-between gap-2 border-b border-rule"
        style={{ backgroundColor: "var(--bg)" }}
      >
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-mono font-semibold text-[18px] leading-none tabular-nums text-ink">
            {String(dayNum).padStart(2, "0")}
          </span>
          <span className="font-mono font-semibold text-[18px] uppercase text-ink leading-none">
            {monthName}
          </span>
        </div>
        <span className="font-mono text-[18px] leading-none text-muted">
          {dayName}
        </span>
      </div>
```

Changes vs. current: header now `min-h-[44px] flex items-center` (uniform height), `py-3` removed; month is now `font-semibold text-ink` (bold, same color as the number); day name is `text-muted` (lighter), `uppercase` removed so it renders sentence case ("Mon"). The today/no-today color split on the day name is removed (the `bg-today` column background already marks today).

- [ ] **Step 2: Remove the placeholder empty-slot block**

Delete the entire placeholder block (currently lines 62–72), i.e. this code:

```tsx
        {/* Empty ruled slots — mirror TaskRow layout (checkbox + spacer + kebab) */}
        {Array.from({ length: Math.max(0, 3 - tasks.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="flex items-center gap-2 px-2 py-2 border-b border-rule"
          >
            <div className="w-4 h-4 rounded-[5px] flex-shrink-0 border border-dashed border-rule-strong/60" />
            <div className="flex-1" />
            <div className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          </div>
        ))}
```

After deletion, the tasks container body (currently lines 57–75) should look like:

```tsx
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-5 md:pb-24">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}

        <NewTaskLine date={formatDate(date)} />
      </div>
```

- [ ] **Step 3: Verify**

Run: `npm run lint`
Expected: passes.
Manual: each day column shows only real tasks + the Add row — no dashed placeholder rows. Day header is 44px tall; "16 JUN" is bold ink; day name is lighter, sentence case ("Mon").

- [ ] **Step 4: Commit**

```bash
git add src/components/DayColumn.tsx
git commit -m "refine: drop placeholder rows, unify header height and date styling"
```

---

### Task 5: BacklogPanel — match header height (#5)

**Files:**
- Modify: `src/components/BacklogPanel.tsx:25`

- [ ] **Step 1: Replace the Backlog header className**

In `src/components/BacklogPanel.tsx`, replace the header `<div>` opening tag (line 25):

```tsx
      <div className="flex items-center gap-2 px-4 sm:px-6 md:px-8 min-h-[44px] border-b border-rule">
```

Changes vs. current: `items-baseline` → `items-center`, `py-3` removed, `min-h-[44px]` added — matching the day-column header from Task 4.

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: passes.
Manual: on desktop, the Backlog title row and every day header share the same 44px height and align across the grid.

- [ ] **Step 3: Commit**

```bash
git add src/components/BacklogPanel.tsx
git commit -m "refine: align Backlog header height with day columns"
```

---

### Task 6: Drag overlay — black pill with soft shadow (#10)

**Files:**
- Modify: `src/App.tsx:23-28`

- [ ] **Step 1: Replace the TaskDragOverlay content**

In `src/App.tsx`, replace the inner `<div>` of `TaskDragOverlay` (lines 25–27):

```tsx
      <div className="opacity-95 bg-ink text-bg rounded-full px-5 h-12 inline-flex items-center gap-2 shadow-[0_24px_50px_-14px_rgba(0,0,0,0.5)] text-[15px] font-medium cursor-grabbing max-w-[80vw]">
        <span className="truncate">{activeTask.title}</span>
      </div>
```

Changes vs. current: `bg-surface border border-rule-strong rounded-md … shadow-lg text-[17px]` → `bg-ink text-bg rounded-full` pill, `h-12` chip height, large soft shadow via an arbitrary `shadow-[…]` value, and `truncate` so long titles don't overflow.

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: passes.
Manual: drag a task — the floating chip is a black pill with white text and a large soft shadow.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "refine: black rounded-full drag chip with soft shadow"
```

---

### Task 7: Web Audio chime + store triggers (#9)

**Files:**
- Create: `src/lib/sound.ts`
- Modify: `src/store.ts:1-5` (import), `:99-128` (addTask), `:142-149` (toggleDone)

- [ ] **Step 1: Create the sound module**

Create `src/lib/sound.ts`:

```ts
// Subtle Web Audio chimes for task add/complete.
// Gated by a localStorage flag so a future mute toggle needs no rework.

const FLAG_KEY = "weeklie.sound";

function soundEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem(FLAG_KEY) !== "0";
  } catch {
    return true;
  }
}

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  audio: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  peak: number,
) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  const t0 = audio.currentTime + startOffset;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playChime(variant: "add" | "complete") {
  if (!soundEnabled()) return;
  const audio = getCtx();
  if (!audio) return;

  if (variant === "add") {
    tone(audio, 660, 0, 0.12, 0.06);
  } else {
    tone(audio, 660, 0, 0.12, 0.06);
    tone(audio, 990, 0.09, 0.18, 0.06);
  }
}
```

- [ ] **Step 2: Import playChime in the store**

In `src/store.ts`, add to the imports at the top (after line 4, the `./dates` import):

```ts
import { playChime } from "./lib/sound";
```

- [ ] **Step 3: Trigger chime on successful add**

In `src/store.ts`, in the `addTask` action, add `playChime("add")` after the error check (the action currently ends with `await logEvent(task.id, 'created', null, date)`). Replace the tail of `addTask` (currently lines 121–128):

```ts
    const { error } = await supabase.from('tasks').insert(task)
    if (error) {
      console.error('addTask failed', error)
      set({ tasks: get().tasks.filter(t => t.id !== task.id) })
      return
    }
    playChime('add')
    await logEvent(task.id, 'created', null, date)
  },
```

- [ ] **Step 4: Trigger chime on complete**

In `src/store.ts`, replace the `toggleDone` action (currently lines 142–149):

```ts
  toggleDone: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const done = !task.done
    const now = new Date().toISOString()
    await get().updateTask(id, { done, done_at: done ? now : null })
    if (done) playChime('complete')
    await logEvent(id, done ? 'completed' : 'reopened', task.date, task.date)
  },
```

(The chime fires only when marking done — not when un-completing, and not on add failure.)

- [ ] **Step 5: Verify**

Run: `npm run lint`
Expected: passes.
Run: `npm run build`
Expected: passes (type-checks `sound.ts`).
Manual: add a task → soft chime; check a task off → slightly higher two-note chime; un-check → silent. If the browser blocked audio until first gesture, the first user-initiated add/check still plays (add/check are gestures).

- [ ] **Step 6: Commit**

```bash
git add src/lib/sound.ts src/store.ts
git commit -m "feat: subtle Web Audio chime on task add and complete"
```

---

### Task 8: About screen + nav link (#6)

**Files:**
- Create: `src/components/AboutScreen.tsx`
- Modify: `src/App.tsx` (imports, state, render)
- Modify: `src/components/FloatingNav.tsx:47-88` (prop + About entry)

- [ ] **Step 1: Create the AboutScreen component**

Create `src/components/AboutScreen.tsx`:

```tsx
import { useEffect } from "react";

type Props = {
  onClose: () => void;
};

export default function AboutScreen({ onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="About Weeklie"
    >
      <div
        className="w-[min(32rem,calc(100vw-2rem))] bg-surface border border-rule-strong rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono font-semibold text-[20px] tracking-tight">
            <span className="opacity-50">_</span>Weeklie
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close about"
            className="grid place-items-center w-8 h-8 -mr-1 rounded-full text-muted hover:text-ink hover:bg-ink/[0.06] transition"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          Weeklie is a minimalist weekly task planner. Plan your week across
          Monday–Sunday columns plus a backlog, drag to reorder, roll over
          unfinished tasks, and reflect with a weekly review — wrapped in a
          warm, paper-quiet interface.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire About state into App**

In `src/App.tsx`:

Add the import near the other component imports (after the `Toast` import, line 13):

```tsx
import AboutScreen from './components/AboutScreen'
```

Add state next to the other `useState` (after `const [showReview, setShowReview] = useState(false)` at line 62):

```tsx
  const [showAbout, setShowAbout] = useState(false)
```

Pass the handler to `FloatingNav` (replace the `<FloatingNav />` line, currently line 115):

```tsx
          <FloatingNav onShowAbout={() => setShowAbout(true)} />
```

Render the screen (add alongside the `showReview` render, after line 119):

```tsx
      {showAbout && <AboutScreen onClose={() => setShowAbout(false)} />}
```

- [ ] **Step 3: Add the About prop and entry to FloatingNav**

In `src/components/FloatingNav.tsx`, add a `Props` type and accept it (replace the `export default function FloatingNav()` line, currently line 47):

```tsx
type Props = {
  onShowAbout?: () => void;
};

export default function FloatingNav({ onShowAbout }: Props) {
  const [open, setOpen] = useState(false);
```

Replace the dead `#about` anchor (currently lines 74–76):

```tsx
          <a href="#about" onClick={() => setOpen(false)} className={linkClass}>
            About
          </a>
```

with a real button:

```tsx
          <button
            type="button"
            onClick={() => {
              onShowAbout?.();
              setOpen(false);
            }}
            className="block w-full text-left font-mono text-[13px] uppercase opacity-70 hover:opacity-100 py-3 transition focus-visible:outline-none focus-visible:opacity-100"
          >
            About
          </button>
```

(Leave the existing `#features`, `#login`, `#signup` anchors as-is — out of scope.)

- [ ] **Step 4: Verify**

Run: `npm run lint`
Expected: passes.
Manual: tap the FloatingNav pill → menu → "About" → About dialog opens with the description; close via the ×, backdrop click, or Esc.

- [ ] **Step 5: Commit**

```bash
git add src/components/AboutScreen.tsx src/App.tsx src/components/FloatingNav.tsx
git commit -m "feat: add About screen linked from the nav"
```

---

### Task 9: Mobile hide-on-scroll for FloatingNav (#12)

**Files:**
- Create: `src/hooks/useHideOnScroll.ts`
- Modify: `src/components/FloatingNav.tsx`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useHideOnScroll.ts`:

```ts
import { useEffect, useState } from "react";

/**
 * Returns `true` while the user has scrolled down inside the element matching
 * `selector`, and `false` again once they return to the top. Mobile only —
 * no-ops (always false) at or above the md breakpoint.
 */
export function useHideOnScroll(selector: string): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;

    const mq = window.matchMedia("(max-width: 767px)");
    let lastTop = el.scrollTop;

    const update = () => {
      const top = el.scrollTop;
      const goingDown = top > lastTop;
      if (top <= 4) {
        setHidden(false);
      } else if (goingDown && top > 48) {
        setHidden(true);
      }
      lastTop = top;
    };

    const onBreakpoint = () => {
      if (!mq.matches) setHidden(false);
    };

    el.addEventListener("scroll", update, { passive: true });
    mq.addEventListener("change", onBreakpoint);
    return () => {
      el.removeEventListener("scroll", update);
      mq.removeEventListener("change", onBreakpoint);
    };
  }, [selector]);

  return hidden;
}
```

- [ ] **Step 2: Use the hook in FloatingNav**

In `src/components/FloatingNav.tsx`, add the import (after the React import, line 1):

```tsx
import { useHideOnScroll } from "../hooks/useHideOnScroll";
```

Inside the component, just after `const [open, setOpen] = useState(false);`, add:

```tsx
  const hidden = useHideOnScroll(".weekgrid");
```

- [ ] **Step 3: Apply the hidden transform to the pill**

In `src/components/FloatingNav.tsx`, replace the floating pill `<div>` opening tag (the one starting `className="fixed z-50 bottom-[calc(env(safe-area-inset-bottom,0px)+16px)]…`, currently lines 91–92):

```tsx
      <div
        className={`fixed z-50 bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] left-1/2 -translate-x-1/2 w-[min(24rem,calc(100%-2rem))] bg-ink text-bg rounded-full shadow-xl border border-ink/5 transition-all duration-300 ${
          hidden
            ? "translate-y-[150%] opacity-0 pointer-events-none"
            : "opacity-100"
        }`}
      >
```

(The `-translate-x-1/2` keeps horizontal centering; the conditional `translate-y-[150%]` composes with it to slide the pill down out of view. `pointer-events-none` stops interaction while hidden. Desktop never hides — the hook only sets `hidden` on mobile.)

- [ ] **Step 4: Verify**

Run: `npm run lint`
Expected: passes.
Manual (mobile viewport, e.g. DevTools device mode or narrow window < 768px): scroll the week view down → the FloatingNav pill slides out; scroll back to the very top → it reappears. Resize to ≥ 768px → pill is always visible.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useHideOnScroll.ts src/components/FloatingNav.tsx
git commit -m "feat: hide FloatingNav on mobile scroll-down, reveal at top"
```

---

### Task 10: Replace README (#7)

**Files:**
- Modify: `README.md` (full replace)

- [ ] **Step 1: Overwrite README.md**

Replace the entire contents of `README.md` with:

````markdown
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
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: replace Vite template README with project docs"
```

---

### Task 11: Final verification

- [ ] **Step 1: Lint + type-check + build**

Run: `npm run lint`
Expected: passes.
Run: `npm run build`
Expected: completes with no TypeScript or build errors.

- [ ] **Step 2: Manual smoke test in the app**

Run: `npm run dev`, then verify across light **and** dark mode:

1. Task rows: no borders; empty/filled/editing/hover/colored all 40px tall and `rounded-full`.
2. No dashed placeholder rows in any day column; the Add row matches task-row height and keeps focus after Enter.
3. Day headers and the Backlog header share 44px height; dates show bold-ink "DD MON" with a lighter, sentence-case day name.
4. Drag a task → black rounded-full chip, white text, large soft shadow.
5. Add a task → chime; complete a task → chime; un-complete → silent.
6. FloatingNav → "About" opens the About dialog (close via × / backdrop / Esc).
7. Mobile (< 768px): scroll the week down → nav pill hides; scroll to top → reappears. Desktop: always visible.
8. Secondary text and hairline dividers read visibly stronger than before.

- [ ] **Step 3: Mark `docs/fixes.md` items done (optional)**

If you track progress there, tick off the 13 items in `docs/fixes.md`.

---

## Self-Review (completed)

**Spec coverage:** all 13 fixes mapped — #1 T3, #2 T2, #3 T4, #4 T2+T3, #5 T4+T5, #6 T8, #7 T10, #8 T3, #9 T7, #10 T6, #11 T4, #12 T9, #13 T1. No gaps.

**Placeholder scan:** no TBD/TODO; every code step shows the actual code.

**Type/name consistency:** `playChime('add'|'complete')` matches between `sound.ts` and `store.ts`; `useHideOnScroll(selector)` matches between the hook and `FloatingNav`; `onShowAbout` prop matches between `App.tsx` and `FloatingNav`; `AboutScreen` `onClose` matches its render site.
