# Weeklie 2.0 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Weeklie 2.0 upgrade from `docs/superpowers/specs/2026-07-07-weeklie-upgrade-design.md` without changing the core one-screen planner model.

**Architecture:** Add nullable task/review fields to the existing Supabase tables, then extend the current Zustand store with small actions for recurring tasks, week intention, last-week copying, and reminders. Keep UI changes component-local where possible, and isolate date/recurrence/reminder logic in focused helper files so `TaskRow.tsx`, `WeekGrid.tsx`, and `ReviewScreen.tsx` do not absorb all feature complexity.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Tailwind CSS v4, Zustand 5, Supabase JS v2, date-fns 4, vite-plugin-pwa, Browser Notification API.

**Spec:** `docs/superpowers/specs/2026-07-07-weeklie-upgrade-design.md`

**Docs checked:** Context7 `/supabase/supabase` for Supabase JS v2 insert/update/upsert return behavior, and Context7 `/vite-pwa/vite-plugin-pwa` for `injectManifest`, `srcDir`, `filename`, and `devOptions.enabled` configuration.

**Testing strategy:** This repo currently has no test runner. Do not add a test framework in this upgrade. Each task verifies with `rtk npm run lint`; the final task runs `rtk npm run build`. Behavior is verified manually in `rtk npm run dev` against an authenticated Supabase-backed account. Supabase JS v2 writes return no row data unless `.select()` is appended, so only append `.select().single()` when the implementation needs the inserted row immediately.

**Baseline note:** The current working tree is dirty before this plan: deleted `.playwright-mcp` files, modified `docs/fixes.md`, modified `src/components/WeekGrid.tsx`, modified `supabase/schema.sql`, and untracked `CLAUDE.md`. Implementation commits must stage only the files for the current task and must not revert unrelated user changes. `supabase/schema.sql` already contains uncommitted share-link schema additions; add the Weeklie 2.0 columns without removing that work.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `supabase/schema.sql` | Reference database schema | Modify: add nullable columns on `tasks` and `week_reviews` |
| `src/types.ts` | App data contracts | Modify: add recurrence, note, due time, and intention fields |
| `src/dates.ts` | Shared date helpers | Modify: add week containment and local date helpers |
| `src/lib/recurrence.ts` | Pure recurrence calculations | Create |
| `src/lib/reminders.ts` | Open-tab notification scheduling | Create |
| `src/hooks/useTodayFocus.ts` | Today-only view state and localStorage | Create |
| `src/components/TodayFocusButton.tsx` | Reusable focus toggle | Create |
| `src/components/WeekIntention.tsx` | Inline weekly intention editor | Create |
| `src/components/WeekTrendBars.tsx` | Four-week completion trend chart | Create |
| `src/store.ts` | App state and Supabase writes | Modify: add recurrence generation, copy last week, intention saving, task metadata writes |
| `src/App.tsx` | Shell-level state and reminder bootstrap | Modify: wire focus mode and reminder message handling |
| `src/components/FloatingNav.tsx` | Bottom nav pill | Modify: add Today focus toggle between wordmark and menu |
| `src/components/WeekHeader.tsx` | Week controls | Modify: add mobile Today focus and Copy last week action |
| `src/components/WeekGrid.tsx` | Week/day/backlog layout | Modify: render today-only mode |
| `src/components/TaskRow.tsx` | Task metadata UI | Modify: notes, repeat menu, due time menu, indicators |
| `src/components/BacklogPanel.tsx` | Backlog list | Modify: add local search/filter |
| `src/components/ReviewScreen.tsx` | Weekly review UI | Modify: trend bars and slipped-task emphasis |
| `vite.config.ts` | PWA plugin config | Modify: switch to `injectManifest` for custom notification click handling |
| `src/main.tsx` | React/PWA bootstrap | Modify: register service worker |
| `src/vite-env.d.ts` | Vite type references | Modify: add vite-plugin-pwa client types |
| `src/sw.ts` | Service worker notification click bridge | Create |

## Implementation Notes

- Preserve the existing no-toast error behavior for task mutations. Log Supabase failures and revert optimistic state.
- Use ASCII text in code strings unless a user-facing placeholder already requires the ellipsis in the spec. In code, prefer `"This week I want to..."` and `"Filter..."`.
- Use inline SVG icons because the app does not currently depend on an icon library.
- The old share-link schema in `supabase/schema.sql` is outside this upgrade. Leave it intact.
- Keep recurrence matching simple: same `title`, same `recurrence`, and matching local date. This accepts the spec tradeoff that renaming a recurring task starts a new chain.

---

### Task 1: Database Columns And Type Contracts

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/types.ts`

- [ ] **Step 1: Add nullable database columns**

In `supabase/schema.sql`, immediately after the `create table if not exists public.tasks (...)` block and before `create index if not exists tasks_user_date_idx`, add:

```sql
alter table public.tasks
  add column if not exists recurrence text,
  add column if not exists note text,
  add column if not exists due_time text;
```

Immediately after the `create table if not exists public.week_reviews (...)` block and before the `updated_at trigger function` section, add:

```sql
alter table public.week_reviews
  add column if not exists intention text;
```

- [ ] **Step 2: Extend task and review TypeScript types**

In `src/types.ts`, add this type before `export type Task`:

```ts
export type TaskRecurrence = 'daily' | 'weekly';
```

Then add these fields to `Task` after `color`:

```ts
  recurrence: TaskRecurrence | null;
  note: string | null;
  due_time: string | null;
```

Add this field to `WeekReview` after `reflection`:

```ts
  intention: string | null;
```

- [ ] **Step 3: Verify schema and types**

Run:

```bash
rtk rg -n "recurrence|due_time|note|intention" supabase/schema.sql src/types.ts
rtk npm run lint
```

Expected: `rg` shows all four fields in both schema/types where relevant, and lint passes.

- [ ] **Step 4: Commit**

```bash
rtk git status --short
rtk git add supabase/schema.sql src/types.ts
rtk git commit -m "feat: add task metadata and week intention fields"
```

Expected: commit stages only `supabase/schema.sql` and `src/types.ts`.

---

### Task 2: Shared Date And Recurrence Helpers

**Files:**
- Modify: `src/dates.ts`
- Create: `src/lib/recurrence.ts`

- [ ] **Step 1: Add date helper imports**

In `src/dates.ts`, extend the `date-fns` import with `addDays`, `isSameDay`, and `parseISO`:

```ts
import {
  format,
  startOfISOWeek,
  endOfISOWeek,
  addWeeks,
  addDays,
  subWeeks,
  eachDayOfInterval,
  isToday,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
  getISOWeek,
  getISOWeekYear,
} from 'date-fns'
```

- [ ] **Step 2: Add reusable week/date helpers**

In `src/dates.ts`, add these functions after `toLocalDateKey`:

```ts
export function parseDateKey(dateKey: string): Date {
  return parseISO(`${dateKey}T00:00:00`)
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  return formatDate(addDays(parseDateKey(dateKey), days))
}

export function addWeeksToDateKey(dateKey: string, weeks: number): string {
  return formatDate(addWeeks(parseDateKey(dateKey), weeks))
}

export function isDateInWeek(dateKey: string, weekStart: Date): boolean {
  const date = startOfDay(parseDateKey(dateKey))
  const start = startOfDay(weekStart)
  const end = startOfDay(endOfISOWeek(weekStart))
  return date >= start && date <= end
}

export function weekContainsToday(weekStart: Date): boolean {
  return getWeekDays(weekStart).some(day => isSameDay(day, new Date()))
}
```

- [ ] **Step 3: Create recurrence helper**

Create `src/lib/recurrence.ts`:

```ts
import { addDaysToDateKey, addWeeksToDateKey, formatDate, isDateInWeek } from '../dates'
import type { Task, TaskRecurrence } from '../types'

export type RecurringTaskSeed = {
  sourceTask: Task;
  date: string;
}

function nextDate(date: string, recurrence: TaskRecurrence): string {
  return recurrence === 'daily'
    ? addDaysToDateKey(date, 1)
    : addWeeksToDateKey(date, 1)
}

export function getNextRecurringDate(task: Task): string | null {
  if (!task.recurrence || !task.date) return null
  return nextDate(task.date, task.recurrence)
}

export function hasUndoneOccurrence(tasks: Task[], sourceTask: Task, date: string): boolean {
  return tasks.some(task =>
    task.id !== sourceTask.id &&
    task.deleted_at === null &&
    !task.done &&
    task.date === date &&
    task.title === sourceTask.title &&
    task.recurrence === sourceTask.recurrence
  )
}

export function getNextAvailableRecurringDate(tasks: Task[], sourceTask: Task): string | null {
  if (!sourceTask.recurrence || !sourceTask.date) return null

  let candidate = getNextRecurringDate(sourceTask)
  while (candidate && hasUndoneOccurrence(tasks, sourceTask, candidate)) {
    candidate = nextDate(candidate, sourceTask.recurrence)
  }
  return candidate
}

export function getRecurringSeedsForWeek(tasks: Task[], weekStart: Date): RecurringTaskSeed[] {
  const seeds: RecurringTaskSeed[] = []
  const nowDate = formatDate(new Date())
  const weekStartKey = formatDate(weekStart)
  const earliestDate = weekStartKey > nowDate ? weekStartKey : nowDate
  const allTasks = [...tasks].sort((a, b) => {
    const left = a.date ?? ''
    const right = b.date ?? ''
    return left.localeCompare(right)
  })

  for (const task of allTasks) {
    if (!task.recurrence || !task.date || task.deleted_at !== null) continue

    let candidate = getNextRecurringDate(task)
    while (candidate && candidate < earliestDate) {
      candidate = nextDate(candidate, task.recurrence)
    }
    if (!candidate || !isDateInWeek(candidate, weekStart)) continue

    const tasksWithSeeds = tasks.concat(
      seeds.map(seed => ({
        ...seed.sourceTask,
        id: `seed-${seed.sourceTask.id}-${seed.date}`,
        date: seed.date,
        done: false,
        deleted_at: null,
      })),
    )

    if (!hasUndoneOccurrence(tasksWithSeeds, task, candidate)) {
      seeds.push({ sourceTask: task, date: candidate })
    }
  }

  return seeds
}
```

- [ ] **Step 4: Verify helper compile**

Run:

```bash
rtk npm run lint
```

Expected: lint passes with no unused import or type errors.

- [ ] **Step 5: Commit**

```bash
rtk git add src/dates.ts src/lib/recurrence.ts
rtk git commit -m "feat: add recurrence date helpers"
```

---

### Task 3: Store Actions For Metadata, Recurrence, Copying, And Intention

**Files:**
- Modify: `src/store.ts`
- Modify: `src/components/ReviewScreen.tsx`

- [ ] **Step 1: Update imports**

In `src/store.ts`, replace the date import:

```ts
import { subWeeks } from 'date-fns'
import { formatDate, getWeekDays, getWeekId, getWeekStart } from './dates'
```

Add recurrence imports:

```ts
import { getNextAvailableRecurringDate, getRecurringSeedsForWeek } from './lib/recurrence'
```

- [ ] **Step 2: Add task creation input types**

Add these types above `type State`:

```ts
type AddTaskOptions = Partial<Pick<
  Task,
  'color' | 'recurrence' | 'note' | 'due_time' | 'planned_date' | 'order'
>> & {
  silent?: boolean;
};

type SaveIntentionInput = {
  weekStart: Date;
  intention: string;
};
```

- [ ] **Step 3: Extend Actions**

In `type Actions`, replace these existing signatures:

```ts
  loadTasks: () => Promise<void>
  addTask: (title: string, date: string | null) => Promise<void>
  setCurrentWeekStart: (date: Date) => void
  saveReview: (review: WeekReview) => Promise<void>
```

with:

```ts
  loadTasks: () => Promise<void>
  addTask: (title: string, date: string | null, options?: AddTaskOptions) => Promise<Task | null>
  copyLastWeekTasks: () => Promise<number>
  generateRecurringTasksForWeek: (weekStart: Date) => Promise<void>
  setCurrentWeekStart: (date: Date) => Promise<void>
  saveReview: (review: WeekReview) => Promise<void>
  saveIntention: (input: SaveIntentionInput) => Promise<void>
```

- [ ] **Step 4: Replace `loadTasks` implementation**

Replace the current `loadTasks` action with:

```ts
  loadTasks: async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .is('deleted_at', null)
    if (error) {
      console.error('loadTasks failed', error)
      set({ isLoading: false })
      return
    }
    const tasks = ((data as Task[]) ?? []).slice().sort((a, b) => a.order - b.order)
    set({ tasks, isLoading: false })
    await get().generateRecurringTasksForWeek(get().currentWeekStart)
  },
```

- [ ] **Step 5: Replace `addTask` implementation**

Replace the current `addTask` action with:

```ts
  addTask: async (title, date, options = {}) => {
    const tasks = get().tasks
    const dayTasks = tasks.filter(t => t.date === date)
    const maxOrder = dayTasks.length > 0 ? Math.max(...dayTasks.map(t => t.order)) : 0
    const now = new Date().toISOString()
    const task: Task = {
      id: createId(),
      title,
      date,
      done: false,
      done_at: null,
      color: options.color ?? null,
      recurrence: options.recurrence ?? null,
      note: options.note ?? null,
      due_time: options.due_time ?? null,
      order: options.order ?? maxOrder + 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      planned_date: options.planned_date ?? date,
      rolled_over_count: 0,
      last_rolled_over_at: null,
    }
    set({ tasks: [...tasks, task] })
    const { error } = await supabase.from('tasks').insert(task)
    if (error) {
      console.error('addTask failed', error)
      set({ tasks: get().tasks.filter(t => t.id !== task.id) })
      return null
    }
    if (!options.silent) playChime('add')
    await logEvent(task.id, 'created', null, date)
    return task
  },
```

- [ ] **Step 6: Replace `toggleDone` implementation**

Replace the current `toggleDone` action with:

```ts
  toggleDone: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const done = !task.done
    const now = new Date().toISOString()
    await get().updateTask(id, { done, done_at: done ? now : null })
    if (done) playChime('complete')
    await logEvent(id, done ? 'completed' : 'reopened', task.date, task.date)

    if (!done || !task.recurrence) return

    const nextDate = getNextAvailableRecurringDate(get().tasks, task)
    if (!nextDate) return

    await get().addTask(task.title, nextDate, {
      color: task.color,
      recurrence: task.recurrence,
      note: task.note,
      due_time: task.due_time,
      planned_date: nextDate,
      silent: true,
    })
  },
```

- [ ] **Step 7: Add copy, generation, and intention actions**

Add these actions after `moveTask` and before `setCurrentWeekStart`:

```ts
  copyLastWeekTasks: async () => {
    const { currentWeekStart, tasks } = get()
    const previousWeekStart = subWeeks(currentWeekStart, 1)
    const previousDays = getWeekDays(previousWeekStart).map(formatDate)
    const currentDays = getWeekDays(currentWeekStart).map(formatDate)
    const copied = tasks
      .filter(task => task.date !== null && previousDays.includes(task.date) && !task.done)
      .sort((a, b) => {
        if (a.date === b.date) return a.order - b.order
        return (a.date ?? '').localeCompare(b.date ?? '')
      })

    for (const task of copied) {
      const previousDayIndex = previousDays.indexOf(task.date!)
      const targetDate = currentDays[previousDayIndex]
      if (!targetDate) continue
      await get().addTask(task.title, targetDate, {
        color: task.color,
        note: task.note,
        recurrence: null,
        silent: true,
      })
    }

    return copied.length
  },

  generateRecurringTasksForWeek: async (weekStart) => {
    const seeds = getRecurringSeedsForWeek(get().tasks, weekStart)
    for (const seed of seeds) {
      await get().addTask(seed.sourceTask.title, seed.date, {
        color: seed.sourceTask.color,
        recurrence: seed.sourceTask.recurrence,
        note: seed.sourceTask.note,
        due_time: seed.sourceTask.due_time,
        planned_date: seed.date,
        silent: true,
      })
    }
  },
```

Then replace `setCurrentWeekStart`:

```ts
  setCurrentWeekStart: async (date) => {
    set({ currentWeekStart: date })
    await get().generateRecurringTasksForWeek(date)
  },
```

Add `saveIntention` after `saveReview`:

```ts
  saveIntention: async ({ weekStart, intention }) => {
    const prev = get().reviews
    const weekId = getWeekId(weekStart)
    const now = new Date().toISOString()
    const existing = prev.find(review => review.week_id === weekId)
    const nextReview: WeekReview = existing
      ? { ...existing, intention, updated_at: now }
      : {
          week_id: weekId,
          completed_count: 0,
          planned_count: 0,
          rolled_over_count: 0,
          reflection: '',
          intention,
          viewed_at: now,
          streak: 0,
          completed_task_ids: [],
          rolled_over_task_ids: [],
          created_at: now,
          updated_at: now,
        }

    set({ reviews: prev.filter(r => r.week_id !== weekId).concat(nextReview) })

    const { data: existingRow, error: selErr } = await supabase
      .from('week_reviews')
      .select('week_id')
      .eq('week_id', weekId)
      .maybeSingle()

    if (selErr) {
      console.error('saveIntention select failed', selErr)
      set({ reviews: prev })
      return
    }

    if (existingRow) {
      const { error } = await supabase
        .from('week_reviews')
        .update({ intention, updated_at: now })
        .eq('week_id', weekId)
      if (error) {
        console.error('saveIntention update failed', error)
        set({ reviews: prev })
      }
    } else {
      const { error } = await supabase
        .from('week_reviews')
        .insert({ week_id: weekId, intention, viewed_at: now, updated_at: now })
      if (error) {
        console.error('saveIntention insert failed', error)
        set({ reviews: prev })
      }
    }
  },
```

Also add this field to the `review` object created in `src/components/ReviewScreen.tsx`:

```tsx
      intention: null,
```

Task 9 replaces this temporary null with the saved weekly intention value.

- [ ] **Step 8: Verify store changes**

Run:

```bash
rtk npm run lint
rtk npm run build
```

Expected: lint and build pass.

- [ ] **Step 9: Commit**

```bash
rtk git add src/store.ts src/components/ReviewScreen.tsx
rtk git commit -m "feat: add recurring task and intention store actions"
```

---

### Task 4: Lighter Light-Mode Background

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Replace light-mode token values**

In `src/index.css`, replace only the light `:root` token block with:

```css
:root {
  --bg: #fffdf3; /* near-white paper */
  --surface: #fffaf0; /* lifted paper */
  --ink: #1a1a1a; /* primary text */
  --muted: #514b3f; /* readable secondary text */
  --faint: #6f6657; /* subtle labels / placeholders */
  --rule: rgba(26, 26, 26, 0.12);
  --rule-strong: rgba(26, 26, 26, 0.22);
  --today: #f8f2d8;
}
```

Do not modify the dark-mode block.

- [ ] **Step 2: Verify CSS-only change**

Run:

```bash
rtk npm run lint
```

Manual: run `rtk npm run dev`, open the app, and confirm task color backgrounds stand out more than before while the app still reads as paper-like.

- [ ] **Step 3: Commit**

```bash
rtk git add src/index.css
rtk git commit -m "refine: lighten weeklie paper background"
```

---

### Task 5: Task Notes UI

**Files:**
- Modify: `src/components/TaskRow.tsx`

- [ ] **Step 1: Add note editing state**

Near the existing icon helpers, add:

```tsx
function NoteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 4h16v16H4z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}
```

Inside `TaskRow`, after the existing title editing state:

```tsx
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editNote, setEditNote] = useState(task.note ?? "");
  const noteInputRef = useRef<HTMLInputElement>(null);
```

Add this effect after the existing title focus effect:

```tsx
  useEffect(() => {
    if (isEditingNote) noteInputRef.current?.focus();
  }, [isEditingNote]);
```

- [ ] **Step 2: Add note save handlers**

Add these handlers after `handleKeyDown`:

```tsx
  const handleNoteSave = () => {
    const trimmed = editNote.trim().slice(0, 300);
    updateTask(task.id, { note: trimmed ? trimmed : null });
    setIsEditingNote(false);
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleNoteSave();
    if (e.key === "Escape") {
      setEditNote(task.note ?? "");
      setIsEditingNote(false);
    }
  };
```

- [ ] **Step 3: Change row layout to allow a second line**

Replace the root task row class string with one that supports notes:

```tsx
      className={`group relative grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center m-1 gap-x-2 px-2 min-h-10 text-sm leading-snug rounded-full transition-colors ${
        isDragging
          ? "opacity-40 cursor-grabbing"
          : isEditing || isEditingNote
            ? "cursor-text"
            : "cursor-grab hover:bg-ink/[0.025]"
      }`}
```

The checkbox stays in column 1. Replace the title block with this wrapper in column 2:

```tsx
      <div className="min-w-0 z-[1] py-1">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Edit task title"
            name="task-title"
            autoComplete="off"
            className="w-full min-w-0 bg-transparent text-sm leading-snug focus:outline-none"
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className={`block cursor-text truncate ${
              task.done ? "line-through text-faint" : "text-ink"
            }`}
          >
            {task.title}
          </span>
        )}

        {isEditingNote ? (
          <input
            ref={noteInputRef}
            value={editNote}
            maxLength={300}
            onChange={(e) => setEditNote(e.target.value)}
            onBlur={handleNoteSave}
            onKeyDown={handleNoteKeyDown}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Edit task note"
            name="task-note"
            autoComplete="off"
            className="block w-full min-w-0 bg-transparent text-[13px] leading-snug text-muted placeholder:text-faint focus:outline-none"
            placeholder="Note"
          />
        ) : task.note ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditNote(task.note ?? "");
              setIsEditingNote(true);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            title={task.note}
            className="block w-full truncate text-left text-[13px] leading-snug text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/10 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            {task.note}
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditNote("");
              setIsEditingNote(true);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Add task note"
            className="hidden group-hover:inline-flex text-faint hover:text-muted focus-visible:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/10 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <NoteIcon />
          </button>
        )}
      </div>
```

- [ ] **Step 4: Verify notes**

Run:

```bash
rtk npm run lint
rtk npm run build
```

Manual: add a note to a task, blur the input, reload the app, and confirm the note persists and truncates on one line. Press Escape while editing a note and confirm the old note remains.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/TaskRow.tsx
rtk git commit -m "feat: add inline task notes"
```

---

### Task 6: Backlog Search

**Files:**
- Modify: `src/components/BacklogPanel.tsx`

- [ ] **Step 1: Add search state and filtered tasks**

At the top, change the import to:

```tsx
import { useMemo, useState } from "react";
```

Inside `BacklogPanel`, after `tasks`:

```tsx
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredTasks = useMemo(
    () =>
      normalizedQuery
        ? tasks.filter((task) => task.title.toLowerCase().includes(normalizedQuery))
        : tasks,
    [normalizedQuery, tasks],
  );
```

- [ ] **Step 2: Add search input to the header**

Replace the backlog header block with:

```tsx
      <div className="flex items-center gap-2 px-4 sm:px-6 md:px-2 min-h-[44px] border-b border-rule">
        <h2 className="font-mono font-semibold text-[18px] uppercase tracking-[-0.02em] text-muted">
          Backlog
        </h2>
        <span className="font-mono font-semibold text-[18px] text-faint tabular-nums">
          {filteredTasks.length}
        </span>
        <div className="ml-auto flex items-center min-w-0 max-w-[12rem] h-8 rounded-full bg-ink/[0.035] px-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter..."
            aria-label="Filter backlog tasks"
            name="backlog-filter"
            className="w-full min-w-0 bg-transparent font-mono text-[12px] text-ink placeholder:text-faint outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear backlog filter"
              className="ml-2 text-faint hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/10 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              x
            </button>
          )}
        </div>
      </div>
```

- [ ] **Step 3: Render filtered results and no-match state**

Replace the `tasks.map` body with:

```tsx
          {filteredTasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
          {normalizedQuery && filteredTasks.length === 0 && (
            <div className="col-span-full px-2 py-3 font-mono text-[12px] text-faint">
              No backlog tasks matching "{query.trim()}".
            </div>
          )}
```

- [ ] **Step 4: Verify search**

Run:

```bash
rtk npm run lint
rtk npm run build
```

Manual: type a mixed-case substring in the backlog filter and confirm only backlog tasks filter. Drag/drop for visible backlog tasks still works.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/BacklogPanel.tsx
rtk git commit -m "feat: filter backlog tasks"
```

---

### Task 7: Daily Focus Toggle

**Files:**
- Create: `src/hooks/useTodayFocus.ts`
- Create: `src/components/TodayFocusButton.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/FloatingNav.tsx`
- Modify: `src/components/WeekHeader.tsx`
- Modify: `src/components/WeekGrid.tsx`

- [ ] **Step 1: Create today focus hook**

Create `src/hooks/useTodayFocus.ts`:

```ts
import { useEffect, useState } from 'react'
import { getWeekStart, weekContainsToday } from '../dates'

const TODAY_FOCUS_KEY = 'weeklie.todayFocus'

function readInitialFocus(): boolean {
  try {
    return globalThis.localStorage?.getItem(TODAY_FOCUS_KEY) === '1'
  } catch {
    return false
  }
}

export function useTodayFocus(currentWeekStart: Date) {
  const [todayFocus, setTodayFocusState] = useState(readInitialFocus)
  const canFocusToday = weekContainsToday(currentWeekStart)

  const setTodayFocus = (value: boolean) => {
    setTodayFocusState(value)
    try {
      globalThis.localStorage?.setItem(TODAY_FOCUS_KEY, value ? '1' : '0')
    } catch {
      // Ignore localStorage failures.
    }
  }

  useEffect(() => {
    if (!canFocusToday && todayFocus) {
      setTodayFocus(false)
    }
  }, [canFocusToday, todayFocus])

  useEffect(() => {
    const interval = window.setInterval(() => {
      const visibleWeekStart = getWeekStart(new Date())
      if (visibleWeekStart.getTime() !== currentWeekStart.getTime() && todayFocus) {
        setTodayFocus(false)
      }
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [currentWeekStart, todayFocus])

  return {
    todayFocus: todayFocus && canFocusToday,
    canFocusToday,
    setTodayFocus,
    toggleTodayFocus: () => setTodayFocus(!todayFocus),
  }
}
```

- [ ] **Step 2: Create reusable toggle button**

Create `src/components/TodayFocusButton.tsx`:

```tsx
type Props = {
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
  compact?: boolean;
  tone?: "paper" | "ink";
};

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export default function TodayFocusButton({
  active,
  disabled = false,
  onToggle,
  compact = false,
  tone = "paper",
}: Props) {
  const inactiveClass = tone === "ink"
    ? "border-bg/25 text-bg/80 hover:text-bg hover:bg-bg/10"
    : "border-rule-strong text-muted hover:text-ink hover:bg-ink/[0.06]";
  const focusOffsetClass = tone === "ink"
    ? "focus-visible:ring-offset-ink"
    : "focus-visible:ring-offset-bg";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={active}
      aria-label={active ? "Show full week" : "Focus on today"}
      className={`inline-flex items-center justify-center gap-2 rounded-full border font-mono uppercase transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
        compact ? "h-9 px-3 text-[12px]" : "h-10 px-4 text-[13px]"
      } ${
        active
          ? "bg-ink text-bg border-ink"
          : inactiveClass
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 ${focusOffsetClass}`}
    >
      <SunIcon />
      <span>Today</span>
    </button>
  );
}
```

- [ ] **Step 3: Wire focus state in App**

In `src/App.tsx`, import the hook:

```tsx
import { useTodayFocus } from './hooks/useTodayFocus'
```

Read `currentWeekStart` from the store:

```tsx
  const currentWeekStart = useStore(s => s.currentWeekStart)
  const todayFocusState = useTodayFocus(currentWeekStart)
```

Pass props:

```tsx
            <WeekHeader
              onShowReview={() => setShowReview(true)}
              todayFocus={todayFocusState.todayFocus}
              canFocusToday={todayFocusState.canFocusToday}
              onToggleTodayFocus={todayFocusState.toggleTodayFocus}
            />
            <WeekGrid todayFocus={todayFocusState.todayFocus} />
            <FloatingNav
              onShowAbout={() => setShowAbout(true)}
              todayFocus={todayFocusState.todayFocus}
              canFocusToday={todayFocusState.canFocusToday}
              onToggleTodayFocus={todayFocusState.toggleTodayFocus}
            />
```

- [ ] **Step 4: Add focus toggle to FloatingNav**

In `src/components/FloatingNav.tsx`, import:

```tsx
import TodayFocusButton from "./TodayFocusButton";
```

Extend `Props`:

```tsx
type Props = {
  onShowAbout?: () => void;
  todayFocus: boolean;
  canFocusToday: boolean;
  onToggleTodayFocus: () => void;
};
```

Update the function signature:

```tsx
export default function FloatingNav({
  onShowAbout,
  todayFocus,
  canFocusToday,
  onToggleTodayFocus,
}: Props) {
```

Between the wordmark and burger button, add:

```tsx
          <TodayFocusButton
            active={todayFocus}
            disabled={!canFocusToday}
            onToggle={onToggleTodayFocus}
            compact
            tone="ink"
          />
```

- [ ] **Step 5: Add mobile header focus toggle**

In `src/components/WeekHeader.tsx`, import:

```tsx
import TodayFocusButton from "./TodayFocusButton";
```

Change `Props`:

```tsx
type Props = {
  onShowReview?: () => void;
  todayFocus: boolean;
  canFocusToday: boolean;
  onToggleTodayFocus: () => void;
};
```

Update the function signature:

```tsx
export default function WeekHeader({
  onShowReview,
  todayFocus,
  canFocusToday,
  onToggleTodayFocus,
}: Props) {
```

Inside the mobile menu, add this button above the existing Today jump action:

```tsx
              <button
                onClick={() => {
                  onToggleTodayFocus();
                  setMenuOpen(false);
                }}
                disabled={!canFocusToday}
                className="flex items-center gap-3 w-full px-4 py-3 font-mono text-[14px] text-ink hover:bg-ink/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <CalendarIcon />
                <span>{todayFocus ? "Full week" : "Today focus"}</span>
              </button>
```

Under the header title block and visible only on mobile, add:

```tsx
        <div className="mt-3 md:hidden">
          <TodayFocusButton
            active={todayFocus}
            disabled={!canFocusToday}
            onToggle={onToggleTodayFocus}
            compact
          />
        </div>
```

- [ ] **Step 6: Render today-only WeekGrid**

Change `WeekGrid` props:

```tsx
type Props = {
  todayFocus: boolean;
};

export default function WeekGrid({ todayFocus }: Props) {
```

After `const days = getWeekDays(currentWeekStart);`, add:

```tsx
  const today = days.find((day) => isToday(day));
```

Before the normal return, add:

```tsx
  if (todayFocus && today) {
    return (
      <div className="weekgrid flex-1 min-h-0 overflow-y-auto pb-24 md:grid md:place-items-start md:overflow-hidden">
        <div className="w-full md:max-w-[28rem] md:mx-auto md:h-full md:border-x md:border-rule">
          <DayColumn date={today} />
        </div>
      </div>
    );
  }
```

- [ ] **Step 7: Verify focus mode**

Run:

```bash
rtk npm run lint
rtk npm run build
```

Manual: current week shows the Today toggle. Activating it shows only today and hides backlog. Navigate to a non-current week and confirm focus exits or disables.

- [ ] **Step 8: Commit**

```bash
rtk git add src/hooks/useTodayFocus.ts src/components/TodayFocusButton.tsx src/App.tsx src/components/FloatingNav.tsx src/components/WeekHeader.tsx src/components/WeekGrid.tsx
rtk git commit -m "feat: add today focus mode"
```

---

### Task 8: Recurring Task UI

**Files:**
- Modify: `src/components/TaskRow.tsx`

- [ ] **Step 1: Add recurrence constants and icon**

Near `COLOR_TOKENS`, add:

```tsx
const RECURRENCE_OPTIONS = [
  { value: null, label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
] as const;

function RepeatIcon({ color }: { color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke={color ?? "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  );
}
```

- [ ] **Step 2: Add recurrence selector handler**

Inside `TaskRow`, add:

```tsx
  const selectRecurrence = useCallback(
    (recurrence: Task["recurrence"]) => {
      updateTask(task.id, { recurrence });
      setTooltipOpen(false);
    },
    [task.id, updateTask],
  );
```

- [ ] **Step 3: Add row indicator before kebab**

Before the kebab trigger:

```tsx
      {task.recurrence && (
        <span
          className="z-[1] flex-shrink-0 text-faint"
          title={`Repeats ${task.recurrence}`}
          aria-label={`Repeats ${task.recurrence}`}
        >
          <RepeatIcon color={hasColor ? COLOR_MAP[task.color!] : undefined} />
        </span>
      )}
```

- [ ] **Step 4: Add Repeat menu controls**

Inside the tooltip, between color dots and Delete, add:

```tsx
            <div className="h-px bg-rule" />
            <div className="flex flex-col gap-1">
              <div className="px-1 font-mono text-[10px] uppercase text-faint">
                Repeat
              </div>
              {RECURRENCE_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectRecurrence(option.value);
                  }}
                  className="flex items-center justify-between gap-4 rounded-md px-1 py-1 text-xs text-muted hover:bg-ink/[0.06] hover:text-ink"
                >
                  <span>{option.label}</span>
                  {task.recurrence === option.value && <span aria-hidden>Set</span>}
                </button>
              ))}
            </div>
```

- [ ] **Step 5: Verify recurrence UI and spawning**

Run:

```bash
rtk npm run lint
rtk npm run build
```

Manual: set a task to Daily, complete it, and confirm an undone copy appears on the next available daily date with title, color, note, recurrence, and due time copied. Change Repeat to None and confirm completing it no longer creates the next task.

- [ ] **Step 6: Commit**

```bash
rtk git add src/components/TaskRow.tsx
rtk git commit -m "feat: add recurring task controls"
```

---

### Task 9: Week Intention

**Files:**
- Create: `src/components/WeekIntention.tsx`
- Modify: `src/components/WeekHeader.tsx`
- Modify: `src/components/ReviewScreen.tsx`

- [ ] **Step 1: Create WeekIntention component**

Create `src/components/WeekIntention.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useStore } from "../store";
import { getWeekId } from "../dates";

type Props = {
  weekStart: Date;
};

export default function WeekIntention({ weekStart }: Props) {
  const reviews = useStore((s) => s.reviews);
  const saveIntention = useStore((s) => s.saveIntention);
  const weekId = getWeekId(weekStart);
  const saved = reviews.find((review) => review.week_id === weekId)?.intention ?? "";
  const [value, setValue] = useState(saved);

  useEffect(() => {
    setValue(saved);
  }, [saved, weekId]);

  const persist = () => {
    const trimmed = value.trim();
    if (trimmed === saved) return;
    saveIntention({ weekStart, intention: trimmed });
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 py-3 border-b border-rule text-center">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={persist}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            setValue(saved);
            e.currentTarget.blur();
          }
        }}
        placeholder="This week I want to..."
        aria-label="This week I want to"
        name="week-intention"
        className="w-full bg-transparent text-center text-[15px] italic text-muted placeholder:text-faint outline-none focus:text-ink focus-visible:ring-2 focus-visible:ring-ink/10 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      />
    </div>
  );
}
```

- [ ] **Step 2: Render intention below the week header controls**

In `src/components/WeekHeader.tsx`, import:

```tsx
import WeekIntention from "./WeekIntention";
```

Wrap the current `<header ...>...</header>` return in a fragment and render the intention below it:

```tsx
    <>
      <header className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-4 border-b-2 border-rule">
        ...
      </header>
      <WeekIntention weekStart={currentWeekStart} />
    </>
```

- [ ] **Step 3: Preserve intention when saving review**

In `src/components/ReviewScreen.tsx`, read the existing review:

```tsx
  const existingReview = reviews.find((review) => review.week_id === weekId);
```

Add `intention` to the `review` object in `handleSave`:

```tsx
      intention: existingReview?.intention ?? null,
```

- [ ] **Step 4: Verify intention behavior**

Run:

```bash
rtk npm run lint
rtk npm run build
```

Manual: enter an intention, press Enter, reload, and confirm it persists for the current week only. Navigate to another week and confirm the field changes to that week value or placeholder.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/WeekIntention.tsx src/components/WeekHeader.tsx src/components/ReviewScreen.tsx
rtk git commit -m "feat: add weekly intention"
```

---

### Task 10: Copy From Last Week

**Files:**
- Modify: `src/components/WeekHeader.tsx`

- [ ] **Step 1: Add copy state and previous-week count**

In `WeekHeader`, read tasks and action:

```tsx
  const tasks = useStore((s) => s.tasks);
  const copyLastWeekTasks = useStore((s) => s.copyLastWeekTasks);
  const [isCopyingLastWeek, setIsCopyingLastWeek] = useState(false);
```

Extend the date import at the top:

```tsx
import { formatDate, formatWeekLabel, getWeekDays, getWeekStart, nextWeek, prevWeek } from "../dates";
```

Add these derived values after `goToToday`:

```tsx
  const previousWeekStart = prevWeek(currentWeekStart);
  const previousWeekDates = new Set(getWeekDays(previousWeekStart).map(formatDate));
  const previousUndoneCount = tasks.filter(
    (task) => task.date !== null && previousWeekDates.has(task.date) && !task.done,
  ).length;

  const handleCopyLastWeek = async () => {
    if (isCopyingLastWeek || previousUndoneCount === 0) return;
    setIsCopyingLastWeek(true);
    await copyLastWeekTasks();
    setIsCopyingLastWeek(false);
  };
```

- [ ] **Step 2: Add desktop copy action**

In the desktop action buttons, before Review:

```tsx
          <button
            onClick={handleCopyLastWeek}
            disabled={isCopyingLastWeek || previousUndoneCount === 0}
            title={previousUndoneCount === 0 ? "No tasks to copy" : "Copy undone tasks from last week"}
            className="h-10 w-auto font-mono text-[14px] uppercase rounded-md border border-rule-strong text-muted hover:text-ink hover:bg-ink/[0.06] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <span className="hidden md:inline px-4">
              {isCopyingLastWeek ? "Copying" : "Copy last week"}
            </span>
          </button>
```

- [ ] **Step 3: Add mobile copy action**

In the mobile menu, before Review:

```tsx
              <button
                onClick={async () => {
                  await handleCopyLastWeek();
                  setMenuOpen(false);
                }}
                disabled={isCopyingLastWeek || previousUndoneCount === 0}
                className="flex items-center gap-3 w-full px-4 py-3 font-mono text-[14px] text-ink hover:bg-ink/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <CalendarIcon />
                <span>{isCopyingLastWeek ? "Copying" : "Copy last week"}</span>
              </button>
```

- [ ] **Step 4: Verify copy behavior**

Run:

```bash
rtk npm run lint
rtk npm run build
```

Manual: create undone tasks last week, including one backlog task. Click Copy last week. Confirm scheduled undone tasks copy to the matching current-week weekdays with title, color, and note copied; recurrence and due time are not copied; backlog tasks are skipped; pressing again creates duplicates.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/WeekHeader.tsx
rtk git commit -m "feat: copy undone tasks from last week"
```

---

### Task 11: Due Time Reminders

**Files:**
- Create: `src/lib/reminders.ts`
- Create: `src/sw.ts`
- Modify: `src/components/TaskRow.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Modify: `src/vite-env.d.ts`
- Modify: `vite.config.ts`

- [ ] **Step 1: Create reminder scheduler**

Create `src/lib/reminders.ts`:

```ts
import { toLocalDateKey } from '../dates'
import type { Task } from '../types'

const PRESET_TIMES = ['07:00', '09:00', '12:00', '15:00', '17:00', '20:00'] as const

export const REMINDER_PRESET_TIMES = PRESET_TIMES

type ReminderStop = () => void
type NotificationOptionsWithActions = NotificationOptions & {
  actions?: Array<{ action: string; title: string }>;
  data?: { taskId: string };
}

function timeToToday(time: string): Date | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

async function showReminder(task: Task) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const registration = await navigator.serviceWorker?.ready.catch(() => null)
  const options: NotificationOptionsWithActions = {
    body: task.note ?? '',
    tag: `weeklie-task-${task.id}`,
    data: { taskId: task.id },
    requireInteraction: false,
    actions: [{ action: 'mark-done', title: 'Mark done' }],
  }

  if (registration?.showNotification) {
    await registration.showNotification(task.title, options)
    return
  }

  const notification = new Notification(task.title, options)
  notification.onclick = () => window.focus()
}

export async function requestReminderPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'default') {
    return Notification.requestPermission()
  }
  return Notification.permission
}

export function startReminderScheduler(getTasks: () => Task[]): ReminderStop {
  const timeouts = new Map<string, number>()

  const clear = () => {
    for (const timeoutId of timeouts.values()) window.clearTimeout(timeoutId)
    timeouts.clear()
  }

  const schedule = () => {
    clear()
    const now = new Date()
    for (const task of getTasks()) {
      if (!task.due_time || task.done || task.deleted_at !== null || task.date === null) continue
      const taskDate = task.date
      const todayKey = toLocalDateKey(now)
      if (taskDate !== todayKey) continue

      const dueAt = timeToToday(task.due_time)
      if (!dueAt || dueAt.getTime() <= now.getTime()) continue

      const delay = dueAt.getTime() - now.getTime()
      const timeoutId = window.setTimeout(() => {
        showReminder(task).catch((error) => console.error('showReminder failed', error))
        timeouts.delete(task.id)
      }, delay)
      timeouts.set(task.id, timeoutId)
    }
  }

  schedule()
  const intervalId = window.setInterval(schedule, 60_000)

  return () => {
    window.clearInterval(intervalId)
    clear()
  }
}
```

- [ ] **Step 2: Create service worker notification click bridge**

Create `src/sw.ts`:

```ts
/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<unknown>;
}

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const taskId = event.notification.data?.taskId

  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    })

    for (const client of clientsList) {
      client.postMessage({
        type: 'weeklie:mark-done',
        taskId,
        action: event.action,
      })
      if ('focus' in client) await client.focus()
      return
    }

    await self.clients.openWindow('/')
  })())
})
```

- [ ] **Step 3: Configure VitePWA for custom worker**

In `vite.config.ts`, replace the `VitePWA({ ... })` options with:

```ts
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: 'Weekly Planner',
        short_name: 'Weekly',
        theme_color: '#fffdf3',
        background_color: '#fffdf3',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
```

- [ ] **Step 4: Register the service worker**

In `src/vite-env.d.ts`, add:

```ts
/// <reference types="vite-plugin-pwa/client" />
```

In `src/main.tsx`, add:

```ts
import { registerSW } from 'virtual:pwa-register'
```

Then before `createRoot(...)`:

```ts
registerSW({ immediate: true })
```

- [ ] **Step 5: Add due time UI to TaskRow**

In `src/components/TaskRow.tsx`, import:

```tsx
import { REMINDER_PRESET_TIMES, requestReminderPermission } from "../lib/reminders";
```

Add notification permission state after the note editing state:

```tsx
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() =>
    "Notification" in window ? Notification.permission : "denied",
  );
```

Add a clock icon near `RepeatIcon`:

```tsx
function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
```

Add handler:

```tsx
  const selectDueTime = useCallback(
    async (dueTime: string | null) => {
      if (dueTime) {
        const permission = await requestReminderPermission();
        setNotificationPermission(permission);
      }
      updateTask(task.id, { due_time: dueTime });
      setTooltipOpen(false);
    },
    [task.id, updateTask],
  );
```

Before recurrence indicator, add:

```tsx
      {task.due_time && (
        <span
          className="z-[1] inline-flex items-center gap-1 flex-shrink-0 font-mono text-[11px] text-faint"
          title={`Reminder at ${task.due_time}`}
        >
          <ClockIcon />
          {task.due_time}
        </span>
      )}
```

Inside the tooltip, before Delete, add:

```tsx
            <div className="h-px bg-rule" />
            <div className="flex flex-col gap-1">
              <div className="px-1 font-mono text-[10px] uppercase text-faint">
                Remind me
              </div>
              {REMINDER_PRESET_TIMES.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectDueTime(time);
                  }}
                  className="flex items-center justify-between gap-4 rounded-md px-1 py-1 text-xs text-muted hover:bg-ink/[0.06] hover:text-ink"
                >
                  <span>{time}</span>
                  {task.due_time === time && <span aria-hidden>Set</span>}
                </button>
              ))}
              <input
                type="time"
                value={task.due_time ?? ""}
                onChange={(e) => selectDueTime(e.target.value || null)}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Custom reminder time"
                className="rounded-md bg-transparent px-1 py-1 text-xs text-muted outline-none hover:bg-ink/[0.06] focus-visible:ring-2 focus-visible:ring-ink/10 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  selectDueTime(null);
                }}
                className="rounded-md px-1 py-1 text-left text-xs text-faint hover:bg-ink/[0.06] hover:text-ink"
              >
                Clear
              </button>
              {notificationPermission === "denied" && (
                <div className="px-1 text-[11px] leading-snug text-faint">
                  Notifications blocked. Enable them in browser settings to receive reminders.
                </div>
              )}
            </div>
```

- [ ] **Step 6: Bootstrap scheduler and mark-done messages in App**

In `src/App.tsx`, import:

```tsx
import { startReminderScheduler } from './lib/reminders'
```

After store reads:

```tsx
  const tasks = useStore(s => s.tasks)
  const toggleDone = useStore(s => s.toggleDone)
```

Add this effect:

```tsx
  useEffect(() => {
    if (!session || isLoading) return
    return startReminderScheduler(() => useStore.getState().tasks)
  }, [session, isLoading, tasks])
```

Add this effect:

```tsx
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'weeklie:mark-done') return
      const taskId = event.data.taskId as string | undefined
      if (!taskId) return
      const task = useStore.getState().tasks.find((item) => item.id === taskId)
      if (task && !task.done) toggleDone(taskId)
    }
    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
  }, [toggleDone])
```

- [ ] **Step 7: Verify reminders**

Run:

```bash
rtk npm run lint
rtk npm run build
```

Manual: set a due time for a task a few minutes ahead, grant notification permission, keep the app open, and confirm a notification appears at the local time. Click Mark done and confirm the task completes if the browser supports notification actions. Deny permission and confirm the due-time label remains visible and no crash occurs.

- [ ] **Step 8: Commit**

```bash
rtk git add src/lib/reminders.ts src/sw.ts src/components/TaskRow.tsx src/App.tsx src/main.tsx src/vite-env.d.ts vite.config.ts
rtk git commit -m "feat: add due time reminders"
```

---

### Task 12: Week-Over-Week Trends And Slipped Patterns

**Files:**
- Create: `src/components/WeekTrendBars.tsx`
- Modify: `src/components/ReviewScreen.tsx`

- [ ] **Step 1: Create trend bars component**

Create `src/components/WeekTrendBars.tsx`:

```tsx
import type { WeekReview } from "../types";

type TrendPoint = {
  week_id: string;
  completed_count: number;
  planned_count: number;
};

type Props = {
  reviews: WeekReview[];
  currentWeek: TrendPoint;
};

function rate(point: TrendPoint): number {
  if (point.planned_count === 0) return 0;
  return Math.round((point.completed_count / point.planned_count) * 100);
}

export default function WeekTrendBars({ reviews, currentWeek }: Props) {
  if (reviews.length === 0 && currentWeek.planned_count === 0 && currentWeek.completed_count === 0) {
    return null;
  }

  const historical = reviews
    .filter((review) => review.week_id !== currentWeek.week_id)
    .sort((a, b) => a.week_id.localeCompare(b.week_id))
    .map((review) => ({
      week_id: review.week_id,
      completed_count: review.completed_count,
      planned_count: review.planned_count,
    }));

  const points = historical.concat(currentWeek).slice(-4);

  if (points.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="font-mono text-[12px] uppercase text-faint mb-3">
        Last 4 weeks
      </h3>
      <div className="flex items-end gap-3 h-28 border-b border-rule px-1">
        {points.map((point) => {
          const value = rate(point);
          const label = point.week_id.split("-")[1] ?? point.week_id;
          return (
            <div key={point.week_id} className="flex flex-1 flex-col items-center justify-end gap-2 h-full">
              <div
                className="w-full max-w-10 rounded-t bg-ink/[0.16]"
                style={{ height: value === 0 ? "0%" : `${value}%` }}
                title={`${point.week_id}: ${value}%`}
              />
              <span className="font-mono text-[11px] text-faint">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Render trend bars in ReviewScreen**

In `src/components/ReviewScreen.tsx`, import:

```tsx
import WeekTrendBars from "./WeekTrendBars";
```

After the stats block and before Completed:

```tsx
        <WeekTrendBars
          reviews={reviews}
          currentWeek={{
            week_id: weekId,
            completed_count: completed.length,
            planned_count: weekTasks.length,
          }}
        />
```

- [ ] **Step 3: Emphasize chronic slipped tasks**

In the rolled-over map, compute:

```tsx
              const chronic = task.rolled_over_count >= 3;
```

Replace the badge class with:

```tsx
                <span
                  className={`text-[11px] px-2 py-0.5 rounded font-mono tabular-nums ${
                    chronic
                      ? "bg-red-500/10 text-red-600"
                      : "bg-ink/[0.06] text-muted"
                  }`}
                >
                  moved {task.rolled_over_count}x
                </span>
                {chronic && (
                  <span className="font-mono text-[11px] uppercase text-red-600/80">
                    Still relevant?
                  </span>
                )}
```

Use a block body in `.map` so `chronic` can be declared:

```tsx
            {rolledOver.map((task) => {
              const chronic = task.rolled_over_count >= 3;
              return (
                ...
              );
            })}
```

- [ ] **Step 4: Verify review enhancements**

Run:

```bash
rtk npm run lint
rtk npm run build
```

Manual: open Review. Confirm the trend chart appears below the ring chart when at least one review/current week exists. Confirm slipped tasks with `rolled_over_count >= 3` show the stronger badge and "Still relevant?" prompt, while existing Next wk, Backlog, and Delete actions still work.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/WeekTrendBars.tsx src/components/ReviewScreen.tsx
rtk git commit -m "feat: show week trends and chronic slipped tasks"
```

---

### Task 13: Full Verification And Deployment Notes

**Files:**
- Modify only files that fail verification.

- [ ] **Step 1: Run static verification**

Run:

```bash
rtk npm run lint
rtk npm run build
```

Expected: both pass.

- [ ] **Step 2: Run local app verification**

Run:

```bash
rtk npm run dev
```

Manual checks:

1. Light mode background is near-white paper and task highlight colors are more prominent.
2. Task notes save on blur/Enter, discard on Escape, and survive reload.
3. Backlog search filters only backlog tasks and shows the no-match message.
4. Today focus toggles between full week and today-only, hides backlog in focus mode, and disables outside the current week.
5. Repeat Daily and Weekly can be set/cleared from the kebab menu; completing a recurring task creates the next available instance.
6. Week intention saves per week and does not overwrite reflection text.
7. Copy last week copies undone scheduled tasks only, skips backlog, does not copy recurrence, and allows duplicate copies.
8. Due time labels show on task rows; notification permission denial does not break task editing; granted permission fires open-tab notifications.
9. Review shows trend bars and chronic slipped-task badges.

- [ ] **Step 3: Verify database migration instructions**

Before deploying, apply the new column statements to the connected Supabase project:

```sql
alter table public.tasks
  add column if not exists recurrence text,
  add column if not exists note text,
  add column if not exists due_time text;

alter table public.week_reviews
  add column if not exists intention text;
```

Expected: production Supabase has the same nullable columns as `supabase/schema.sql`. Existing rows remain valid because every new column is nullable.

- [ ] **Step 4: Commit final fixes if needed**

If verification required fixes:

```bash
rtk git status --short
rtk git add <only-fixed-files>
rtk git commit -m "fix: stabilize weeklie upgrade"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review

- Spec coverage:
  - Data model changes: Task 1.
  - Lighter background: Task 4.
  - Recurring tasks: Tasks 2, 3, and 8.
  - Copy from last week: Tasks 3 and 10.
  - Week intention: Tasks 3 and 9.
  - Daily focus toggle: Task 7.
  - Due time notifications: Tasks 3 and 11.
  - Backlog search: Task 6.
  - Task notes: Tasks 1 and 5.
  - Week-over-week trends: Task 12.
  - Slipped task patterns: Task 12.
- Placeholder scan: passed.
- Type consistency:
  - `Task.recurrence`, `Task.note`, `Task.due_time`, and `WeekReview.intention` are introduced before store/component usage.
  - `addTask` returns `Promise<Task | null>` and existing call sites can ignore the return value.
  - `setCurrentWeekStart` becomes async; existing button handlers may call it without awaiting because React event handlers accept ignored promises.
- Known limitation accepted from the spec: reminder scheduling is reliable while the app is open. Background delivery depends on the platform keeping the service worker and installed PWA active.

Plan complete and saved to `docs/superpowers/plans/2026-07-07-weeklie-upgrade.md`. Two execution options:

1. Subagent-Driven (recommended) - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. Inline Execution - execute tasks in this session using executing-plans, batch execution with checkpoints.
