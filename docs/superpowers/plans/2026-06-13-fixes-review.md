# Fixes Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the weeklie data model, rollover logic, and weekly review based on the specification review in `docs/fixes.md`.

**Architecture:** Incremental migration of the Task type and IndexedDB schema, with an event log for accurate weekly reviews. Each task is self-contained and backwards-compatible.

**Tech Stack:** TypeScript, Zustand, Dexie (IndexedDB), date-fns, React, Tailwind CSS

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/types.ts` | Task, TaskEvent, WeekReview type definitions |
| `src/db.ts` | Dexie database schema and migrations |
| `src/store.ts` | Zustand store with business logic |
| `src/dates.ts` | Date/week helper utilities |
| `src/rollover.ts` | Rollover detection and execution |
| `src/components/ReviewScreen.tsx` | Weekly review UI |
| `src/hooks/useRollover.ts` | Rollover trigger on app load |

---

## Phase 1: Data Model Foundation

### Task 1: Add `updatedAt`, `deletedAt`, `plannedDate`, `lastRolledOverAt` to Task type

**Files:**
- Modify: `src/types.ts:1-11`

- [ ] **Step 1: Update Task type**

```typescript
export type Task = {
  id: string;
  title: string;
  date: string | null; // "2026-06-12", null = Backlog
  done: boolean;
  doneAt: string | null;
  color: string | null; // "red" | "orange" | "yellow" | "green" | "blue" | "purple"
  order: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  plannedDate: string | null; // original scheduled date before rollover
  rolledOverCount: number;
  lastRolledOverAt: string | null;
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS (existing code will have type errors until store is updated)

---

### Task 2: Add TaskEvent type

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add TaskEvent type after Task**

```typescript
export type TaskEventType =
  | 'created'
  | 'updated'
  | 'completed'
  | 'reopened'
  | 'moved'
  | 'rolled-over'
  | 'deleted';

export type TaskEvent = {
  id: string;
  taskId: string;
  type: TaskEventType;
  fromDate: string | null;
  toDate: string | null;
  createdAt: string;
};
```

- [ ] **Step 2: Update WeekReview type**

```typescript
export type WeekReview = {
  weekId: string;
  completedCount: number;
  plannedCount: number;
  rolledOverCount: number;
  reflection: string;
  viewedAt: string;
  streak: number;
  completedTaskIds: string[];
  rolledOverTaskIds: string[];
  createdAt: string;
  updatedAt: string;
};
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Type errors from store.ts (expected, will fix in Task 3)

---

### Task 3: Update Dexie schema with migration

**Files:**
- Modify: `src/db.ts:1-17`

- [ ] **Step 1: Update database schema**

```typescript
import Dexie, { type Table } from 'dexie'
import type { Task, TaskEvent, WeekReview } from './types'

export class WeeklyPlannerDB extends Dexie {
  tasks!: Table<Task>
  events!: Table<TaskEvent>
  reviews!: Table<WeekReview>

  constructor() {
    super('weekly-planner')
    this.version(1).stores({
      tasks: 'id, date, done, order',
      reviews: 'weekId',
    })
    this.version(2).stores({
      tasks: 'id, date, done, order, deletedAt, plannedDate',
      events: 'id, taskId, type, createdAt',
      reviews: 'weekId',
    }).upgrade(async (tx) => {
      // Migrate existing tasks to add new fields
      await tx.table('tasks').toCollection().modify((task: any) => {
        task.updatedAt = task.createdAt || new Date().toISOString()
        task.deletedAt = null
        task.plannedDate = task.date
        task.lastRolledOverAt = null
        // Convert color index to string
        if (typeof task.color === 'number') {
          const palette = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']
          task.color = palette[task.color] || null
        }
      })
    })
  }
}

export const db = new WeeklyPlannerDB()
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

---

## Phase 2: Date Logic Hardening

### Task 4: Add local date helper to dates.ts

**Files:**
- Modify: `src/dates.ts`

- [ ] **Step 1: Add `toLocalDateKey` function**

```typescript
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
```

- [ ] **Step 2: Add ISO week ID helper**

```typescript
import { getISOWeek, getISOWeekYear } from 'date-fns'

export function getWeekId(date: Date): string {
  const year = getISOWeekYear(date)
  const week = getISOWeek(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

---

## Phase 3: Store Updates

### Task 5: Update store to use new Task fields

**Files:**
- Modify: `src/store.ts`

- [ ] **Step 1: Update `addTask` to set new fields**

In `src/store.ts`, update the task creation in `addTask`:

```typescript
addTask: async (title, date) => {
  const tasks = get().tasks
  const dayTasks = tasks.filter(t => t.date === date)
  const maxOrder = dayTasks.length > 0
    ? Math.max(...dayTasks.map(t => t.order))
    : 0

  const now = new Date().toISOString()
  const task: Task = {
    id: createId(),
    title,
    date,
    done: false,
    doneAt: null,
    color: null,
    order: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    plannedDate: date,
    rolledOverCount: 0,
    lastRolledOverAt: null,
  }

  await db.tasks.add(task)
  set({ tasks: [...tasks, task] })
},
```

- [ ] **Step 2: Update `updateTask` to set `updatedAt`**

```typescript
updateTask: async (id, updates) => {
  const now = new Date().toISOString()
  const updatesWithTimestamp = { ...updates, updatedAt: now }
  await db.tasks.update(id, updatesWithTimestamp)
  set({
    tasks: get().tasks.map(t => t.id === id ? { ...t, ...updatesWithTimestamp } : t),
  })
},
```

- [ ] **Step 3: Update `toggleDone` to set `updatedAt`**

```typescript
toggleDone: async (id) => {
  const task = get().tasks.find(t => t.id === id)
  if (!task) return

  const done = !task.done
  const now = new Date().toISOString()
  const doneAt = done ? now : null
  await db.tasks.update(id, { done, doneAt, updatedAt: now })
  set({
    tasks: get().tasks.map(t =>
      t.id === id ? { ...t, done, doneAt, updatedAt: now } : t
    ),
  })
},
```

- [ ] **Step 4: Update `deleteTask` to soft delete**

```typescript
deleteTask: async (id) => {
  const now = new Date().toISOString()
  await db.tasks.update(id, { deletedAt: now, updatedAt: now })
  set({
    tasks: get().tasks.map(t =>
      t.id === id ? { ...t, deletedAt: now, updatedAt: now } : t
    ),
  })
},
```

- [ ] **Step 5: Update `moveTask` to set `updatedAt`**

```typescript
moveTask: async (id, newDate, newOrder) => {
  const now = new Date().toISOString()
  await db.tasks.update(id, { date: newDate, order: newOrder, updatedAt: now })
  set({
    tasks: get().tasks.map(t =>
      t.id === id ? { ...t, date: newDate, order: newOrder, updatedAt: now } : t
    ),
  })
},
```

- [ ] **Step 6: Update `loadTasks` to filter deleted tasks**

```typescript
loadTasks: async () => {
  const tasks = await db.tasks.filter(t => t.deletedAt === null).toArray()
  set({ tasks, isLoading: false })
},
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

---

### Task 6: Add event logging to store actions

**Files:**
- Modify: `src/store.ts`

- [ ] **Step 1: Add helper function for logging events**

Add this function at the top of the file, after imports:

```typescript
async function logEvent(taskId: string, type: TaskEventType, fromDate?: string | null, toDate?: string | null) {
  const event: TaskEvent = {
    id: createId(),
    taskId,
    type,
    fromDate: fromDate ?? null,
    toDate: toDate ?? null,
    createdAt: new Date().toISOString(),
  }
  await db.events.add(event)
}
```

- [ ] **Step 2: Update `addTask` to log event**

After `await db.tasks.add(task)`, add:

```typescript
await logEvent(task.id, 'created', null, date)
```

- [ ] **Step 3: Update `toggleDone` to log event**

After the database update, add:

```typescript
const eventType = done ? 'completed' : 'reopened'
await logEvent(id, eventType, task.date, task.date)
```

- [ ] **Step 4: Update `deleteTask` to log event**

After the database update, add:

```typescript
await logEvent(id, 'deleted', task.date, null)
```

- [ ] **Step 5: Update `moveTask` to log event**

After the database update, add:

```typescript
await logEvent(id, 'moved', task.date, newDate)
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

---

## Phase 4: Idempotent Rollover

### Task 7: Fix rollover to be idempotent

**Files:**
- Modify: `src/store.ts:98-113`
- Modify: `src/rollover.ts:1-7`

- [ ] **Step 1: Update `rolloverTasks` in store**

```typescript
rolloverTasks: async () => {
  const { tasks, updateTask } = get()
  const today = formatDate(new Date())
  const overdue = tasks.filter(
    t => t.date !== null &&
         t.date < today &&
         !t.done &&
         t.lastRolledOverAt !== today
  )

  for (const task of overdue) {
    await updateTask(task.id, {
      date: today,
      rolledOverCount: task.rolledOverCount + 1,
      lastRolledOverAt: today,
      plannedDate: task.plannedDate ?? task.date,
    })
    await logEvent(task.id, 'rolled-over', task.date, today)
  }

  return overdue.length
},
```

- [ ] **Step 2: Update `rollover.ts` helper**

```typescript
import type { Task } from './types'
import { formatDate } from './dates'

export function findOverdueTasks(tasks: Task[]): Task[] {
  const today = formatDate(new Date())
  return tasks.filter(
    t => t.date !== null &&
         t.date < today &&
         !t.done &&
         t.lastRolledOverAt !== today
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

---

## Phase 5: Order Normalization

### Task 8: Add order normalization

**Files:**
- Modify: `src/store.ts`

- [ ] **Step 1: Add `normalizeOrders` action**

```typescript
normalizeOrders: (date: string) => {
  const { tasks, updateTask } = get()
  const dayTasks = tasks
    .filter(t => t.date === date)
    .sort((a, b) => a.order - b.order)

  dayTasks.forEach((task, index) => {
    const newOrder = (index + 1) * 1000
    if (task.order !== newOrder) {
      updateTask(task.id, { order: newOrder })
    }
  })
},
```

- [ ] **Step 2: Add normalization trigger in `moveTask`**

After updating the task in `moveTask`, add:

```typescript
const dayTasks = get().tasks
  .filter(t => t.date === newDate && t.id !== id)
  .map(t => t.order)

const needsNormalization = dayTasks.some(o => {
  const diff = Math.abs(o - newOrder)
  return diff < 0.001 && diff > 0
})

if (needsNormalization) {
  setTimeout(() => get().normalizeOrders(newDate!), 0)
}
```

- [ ] **Step 3: Add `normalizeOrders` to Actions type**

```typescript
normalizeOrders: (date: string) => void
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

---

## Phase 6: Weekly Review from Events

### Task 9: Update ReviewScreen to use event log

**Files:**
- Modify: `src/components/ReviewScreen.tsx:1-132`
- Modify: `src/store.ts` (add `loadEvents` and `getEventsForWeek`)

- [ ] **Step 1: Add events to store state and actions**

```typescript
type State = {
  tasks: Task[]
  events: TaskEvent[]
  reviews: WeekReview[]
  currentWeekStart: Date
  isLoading: boolean
}

// Add to actions:
loadEvents: () => Promise<void>
```

- [ ] **Step 2: Implement `loadEvents`**

```typescript
events: [],

loadEvents: async () => {
  const events = await db.events.toArray()
  set({ events })
},
```

- [ ] **Step 3: Call `loadEvents` in `main.tsx` or alongside `loadTasks`**

- [ ] **Step 4: Update ReviewScreen to use events for accurate counts**

```typescript
const events = useStore(s => s.events)

const weekStart = getWeekStart(new Date())
const weekEnd = endOfISOWeek(weekStart)
const weekId = getWeekId(weekStart)

const weekEvents = events.filter(e => {
  const eventDate = e.createdAt.slice(0, 10)
  return eventDate >= formatDate(weekStart) && eventDate <= formatDate(weekEnd)
})

const completedTaskIds = [...new Set(
  weekEvents
    .filter(e => e.type === 'completed')
    .map(e => e.taskId)
)]

const rolledOverTaskIds = [...new Set(
  weekEvents
    .filter(e => e.type === 'rolled-over')
    .map(e => e.taskId)
)]

const completed = tasks.filter(t => completedTaskIds.includes(t.id))
const rolledOver = tasks.filter(t => rolledOverTaskIds.includes(t.id))
```

- [ ] **Step 5: Update `handleSave` to store snapshot**

```typescript
const handleSave = () => {
  const now = new Date().toISOString()
  const review: WeekReview = {
    weekId,
    completedCount: completed.length,
    plannedCount: weekTasks.length,
    rolledOverCount: rolledOver.length,
    reflection,
    viewedAt: now,
    streak,
    completedTaskIds,
    rolledOverTaskIds,
    createdAt: now,
    updatedAt: now,
  }
  saveReview(review)
  onClose()
}
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

---

## Phase 7: Week ID Fix

### Task 10: Fix weekId to use ISO week year

**Files:**
- Modify: `src/components/ReviewScreen.tsx:20`

- [ ] **Step 1: Replace manual weekId calculation**

Change:
```typescript
const weekId = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate()) / 7)).padStart(2, '0')}`
```

To:
```typescript
const weekId = getWeekId(weekStart)
```

- [ ] **Step 2: Import `getWeekId` from dates**

```typescript
import { formatDate, getWeekDays, getWeekStart, getWeekId } from '../dates'
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

---

## Phase 8: Undo Toast for Rollover

### Task 11: Add undo toast for rollover

**Files:**
- Create: `src/components/Toast.tsx` (if not exists)
- Modify: `src/hooks/useRollover.ts`

- [ ] **Step 1: Check if Toast component exists**

Run: `ls src/components/Toast.tsx`

If it exists, skip to Step 3.

- [ ] **Step 2: Create Toast component**

```typescript
import { useEffect, useState } from 'react'

type Props = {
  message: string
  onUndo?: () => void
  onDismiss: () => void
  duration?: number
}

export default function Toast({ message, onUndo, onDismiss, duration = 5000 }: Props) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-3 transition-opacity ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <span className="text-sm">{message}</span>
      {onUndo && (
        <button
          onClick={onUndo}
          className="text-sm underline hover:text-gray-300"
        >
          Undo
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update `useRollover` hook to show toast**

```typescript
import { useEffect, useState } from 'react'
import { useStore } from '../store'

export function useRollover() {
  const rolloverTasks = useStore(s => s.rolloverTasks)
  const [toast, setToast] = useState<{ message: string; count: number } | null>(null)

  useEffect(() => {
    const run = async () => {
      const count = await rolloverTasks()
      if (count > 0) {
        setToast({ message: `${count} task${count > 1 ? 's' : ''} moved to today`, count })
      }
    }
    run()
  }, [])

  return toast
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

---

## Verification Checklist

After completing all tasks:

- [ ] Run `npx tsc --noEmit` - no type errors
- [ ] Run `npm run lint` - no new lint errors
- [ ] Run `npm run build` - builds successfully
- [ ] Test rollover: create overdue task, reload app, verify it moves to today
- [ ] Test idempotency: reload app multiple times, verify rollover only happens once
- [ ] Test soft delete: delete a task, verify it disappears from view but remains in IndexedDB
- [ ] Test weekly review: complete some tasks, run review, verify counts match
- [ ] Test week navigation: verify Monday-Sunday grid shows correctly
