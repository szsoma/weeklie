import { create } from 'zustand'
import { db } from './db'
import { createId } from './nanoid'
import { formatDate, getWeekStart } from './dates'
import type { Task, TaskEvent, TaskEventType, WeekReview } from './types'

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

type State = {
  tasks: Task[]
  events: TaskEvent[]
  reviews: WeekReview[]
  currentWeekStart: Date
  isLoading: boolean
}

type Actions = {
  loadTasks: () => Promise<void>
  loadEvents: () => Promise<void>
  addTask: (title: string, date: string | null) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  toggleDone: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  moveTask: (id: string, newDate: string | null, newOrder: number) => Promise<void>
  setCurrentWeekStart: (date: Date) => void
  rolloverTasks: () => Promise<number>
  saveReview: (review: WeekReview) => Promise<void>
  loadReviews: () => Promise<void>
  normalizeOrders: (date: string) => void
}

export const useStore = create<State & Actions>((set, get) => ({
  tasks: [],
  events: [],
  reviews: [],
  currentWeekStart: getWeekStart(new Date()),
  isLoading: true,

  loadTasks: async () => {
    const tasks = await db.tasks.filter(t => t.deletedAt === null).toArray()
    set({ tasks, isLoading: false })
  },

  loadEvents: async () => {
    const events = await db.events.toArray()
    set({ events })
  },

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
    await logEvent(task.id, 'created', null, date)
    set({ tasks: [...tasks, task] })
  },

  updateTask: async (id, updates) => {
    const now = new Date().toISOString()
    const updatesWithTimestamp = { ...updates, updatedAt: now }
    await db.tasks.update(id, updatesWithTimestamp)
    set({
      tasks: get().tasks.map(t => t.id === id ? { ...t, ...updatesWithTimestamp } : t),
    })
  },

  toggleDone: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return

    const done = !task.done
    const now = new Date().toISOString()
    const doneAt = done ? now : null
    await db.tasks.update(id, { done, doneAt, updatedAt: now })
    const eventType = done ? 'completed' : 'reopened'
    await logEvent(id, eventType, task.date, task.date)
    set({
      tasks: get().tasks.map(t =>
        t.id === id ? { ...t, done, doneAt, updatedAt: now } : t
      ),
    })
  },

  deleteTask: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return

    const now = new Date().toISOString()
    await db.tasks.update(id, { deletedAt: now, updatedAt: now })
    await logEvent(id, 'deleted', task.date, null)
    set({
      tasks: get().tasks.map(t =>
        t.id === id ? { ...t, deletedAt: now, updatedAt: now } : t
      ),
    })
  },

  moveTask: async (id, newDate, newOrder) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return

    const now = new Date().toISOString()
    await db.tasks.update(id, { date: newDate, order: newOrder, updatedAt: now })
    await logEvent(id, 'moved', task.date, newDate)
    set({
      tasks: get().tasks.map(t =>
        t.id === id ? { ...t, date: newDate, order: newOrder, updatedAt: now } : t
      ),
    })

    const dayTasks = get().tasks
      .filter(t => t.date === newDate && t.id !== id)
      .map(t => t.order)

    const needsNormalization = dayTasks.some(o => {
      const diff = Math.abs(o - newOrder)
      return diff < 0.001
    })

    if (needsNormalization) {
      setTimeout(() => get().normalizeOrders(newDate!), 0)
    }
  },

  setCurrentWeekStart: (date) => set({ currentWeekStart: date }),

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

  saveReview: async (review) => {
    await db.reviews.put(review)
    set({
      reviews: get().reviews.filter(r => r.weekId !== review.weekId).concat(review),
    })
  },

  loadReviews: async () => {
    const reviews = await db.reviews.toArray()
    set({ reviews })
  },

  normalizeOrders: (date) => {
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
}))
