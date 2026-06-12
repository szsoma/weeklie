import { create } from 'zustand'
import { db } from './db'
import { createId } from './nanoid'
import { formatDate } from './dates'
import type { Task, WeekReview } from './types'

type State = {
  tasks: Task[]
  reviews: WeekReview[]
  currentWeekStart: Date
  isLoading: boolean
}

type Actions = {
  loadTasks: () => Promise<void>
  addTask: (title: string, date: string | null) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  toggleDone: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  moveTask: (id: string, newDate: string | null, newOrder: number) => Promise<void>
  setCurrentWeekStart: (date: Date) => void
  rolloverTasks: () => Promise<number>
  saveReview: (review: WeekReview) => Promise<void>
  loadReviews: () => Promise<void>
}

export const useStore = create<State & Actions>((set, get) => ({
  tasks: [],
  reviews: [],
  currentWeekStart: new Date(),
  isLoading: true,

  loadTasks: async () => {
    const tasks = await db.tasks.toArray()
    set({ tasks, isLoading: false })
  },

  addTask: async (title, date) => {
    const tasks = get().tasks
    const dayTasks = tasks.filter(t => t.date === date)
    const maxOrder = dayTasks.length > 0
      ? Math.max(...dayTasks.map(t => t.order))
      : 0

    const task: Task = {
      id: createId(),
      title,
      date,
      done: false,
      doneAt: null,
      color: null,
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
      rolledOverCount: 0,
    }

    await db.tasks.add(task)
    set({ tasks: [...tasks, task] })
  },

  updateTask: async (id, updates) => {
    await db.tasks.update(id, updates)
    set({
      tasks: get().tasks.map(t => t.id === id ? { ...t, ...updates } : t),
    })
  },

  toggleDone: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return

    const done = !task.done
    const doneAt = done ? new Date().toISOString() : null
    await db.tasks.update(id, { done, doneAt })
    set({
      tasks: get().tasks.map(t =>
        t.id === id ? { ...t, done, doneAt } : t
      ),
    })
  },

  deleteTask: async (id) => {
    await db.tasks.delete(id)
    set({ tasks: get().tasks.filter(t => t.id !== id) })
  },

  moveTask: async (id, newDate, newOrder) => {
    await db.tasks.update(id, { date: newDate, order: newOrder })
    set({
      tasks: get().tasks.map(t =>
        t.id === id ? { ...t, date: newDate, order: newOrder } : t
      ),
    })
  },

  setCurrentWeekStart: (date) => set({ currentWeekStart: date }),

  rolloverTasks: async () => {
    const { tasks, updateTask } = get()
    const today = formatDate(new Date())
    const overdue = tasks.filter(
      t => t.date !== null && t.date < today && !t.done
    )

    for (const task of overdue) {
      await updateTask(task.id, {
        date: today,
        rolledOverCount: task.rolledOverCount + 1,
      })
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
}))
