import { create } from 'zustand'
import { supabase } from './lib/supabase'
import { createId } from './nanoid'
import { formatDate, getWeekStart } from './dates'
import { playChime } from './lib/sound'
import type { Task, TaskEvent, TaskEventType, WeekReview } from './types'

async function logEvent(
  taskId: string,
  type: TaskEventType,
  fromDate: string | null = null,
  toDate: string | null = null,
) {
  const event: TaskEvent = {
    id: createId(),
    task_id: taskId,
    type,
    from_date: fromDate,
    to_date: toDate,
    created_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('task_events').insert(event)
  if (error) console.error('Failed to log event', error)
}

const HIDE_DONE_KEY = 'weeklie.hideDone'
function readHideDone(): boolean {
  try {
    return globalThis.localStorage?.getItem(HIDE_DONE_KEY) === '1'
  } catch {
    return false
  }
}

type State = {
  tasks: Task[]
  events: TaskEvent[]
  reviews: WeekReview[]
  currentWeekStart: Date
  isLoading: boolean
  hideDone: boolean
}

type Actions = {
  loadTasks: () => Promise<void>
  loadEvents: () => Promise<void>
  loadReviews: () => Promise<void>
  addTask: (title: string, date: string | null) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  toggleDone: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  moveTask: (id: string, newDate: string | null, newOrder: number) => Promise<void>
  setCurrentWeekStart: (date: Date) => void
  rolloverTasks: () => Promise<number>
  saveReview: (review: WeekReview) => Promise<void>
  normalizeOrders: (date: string) => void
  setHideDone: (value: boolean) => void
}

export const useStore = create<State & Actions>((set, get) => ({
  tasks: [],
  events: [],
  reviews: [],
  currentWeekStart: getWeekStart(new Date()),
  isLoading: true,
  hideDone: readHideDone(),

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
  },

  loadEvents: async () => {
    const { data, error } = await supabase.from('task_events').select('*')
    if (error) {
      console.error('loadEvents failed', error)
      return
    }
    set({ events: (data as TaskEvent[]) ?? [] })
  },

  loadReviews: async () => {
    const { data, error } = await supabase.from('week_reviews').select('*')
    if (error) {
      console.error('loadReviews failed', error)
      return
    }
    set({ reviews: (data as WeekReview[]) ?? [] })
  },

  addTask: async (title, date) => {
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
      color: null,
      order: maxOrder + 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      planned_date: date,
      rolled_over_count: 0,
      last_rolled_over_at: null,
    }
    // optimistic insert; revert on error
    set({ tasks: [...tasks, task] })
    const { error } = await supabase.from('tasks').insert(task)
    if (error) {
      console.error('addTask failed', error)
      set({ tasks: get().tasks.filter(t => t.id !== task.id) })
      return
    }
    playChime('add')
    await logEvent(task.id, 'created', null, date)
  },

  updateTask: async (id, updates) => {
    const prev = get().tasks
    const now = new Date().toISOString()
    const updatesWithTs = { ...updates, updated_at: now }
    set({ tasks: prev.map(t => (t.id === id ? { ...t, ...updatesWithTs } : t)) })
    const { error } = await supabase.from('tasks').update(updatesWithTs).eq('id', id)
    if (error) {
      console.error('updateTask failed', error)
      set({ tasks: prev }) // revert
    }
  },

  toggleDone: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const done = !task.done
    const now = new Date().toISOString()
    await get().updateTask(id, { done, done_at: done ? now : null })
    if (done) playChime('complete')
    await logEvent(id, done ? 'completed' : 'reopened', task.date, task.date)
  },

  deleteTask: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const now = new Date().toISOString()
    const prev = get().tasks
    // optimistic soft-delete: hide immediately
    set({ tasks: prev.filter(t => t.id !== id) })
    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', id)
    if (error) {
      console.error('deleteTask failed', error)
      set({ tasks: prev }) // revert
      return
    }
    await logEvent(id, 'deleted', task.date, null)
  },

  moveTask: async (id, newDate, newOrder) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    await get().updateTask(id, { date: newDate, order: newOrder })
    await logEvent(id, 'moved', task.date, newDate)

    const dayTasks = get().tasks
      .filter(t => t.date === newDate && t.id !== id)
      .map(t => t.order)

    const needsNormalization = dayTasks.some(o => Math.abs(o - newOrder) < 0.001)
    if (needsNormalization) {
      setTimeout(() => get().normalizeOrders(newDate!), 0)
    }
  },

  setCurrentWeekStart: (date) => set({ currentWeekStart: date }),

  rolloverTasks: async () => {
    const tasks = get().tasks
    const today = formatDate(new Date())
    const overdue = tasks.filter(
      t => t.date !== null &&
           t.date < today &&
           !t.done &&
           t.last_rolled_over_at !== today,
    )

    for (const task of overdue) {
      await get().updateTask(task.id, {
        date: today,
        rolled_over_count: task.rolled_over_count + 1,
        last_rolled_over_at: today,
        planned_date: task.planned_date ?? task.date,
      })
      await logEvent(task.id, 'rolled-over', task.date, today)
    }

    return overdue.length
  },

  saveReview: async (review) => {
    const prev = get().reviews
    // optimistic
    set({ reviews: prev.filter(r => r.week_id !== review.week_id).concat(review) })

    const { data: existing, error: selErr } = await supabase
      .from('week_reviews')
      .select('week_id')
      .eq('week_id', review.week_id)
      .maybeSingle()

    const now = new Date().toISOString()
    if (selErr) {
      console.error('saveReview select failed', selErr)
      set({ reviews: prev })
      return
    }

    if (existing) {
      const { error } = await supabase
        .from('week_reviews')
        .update({ ...review, updated_at: now })
        .eq('week_id', review.week_id)
      if (error) {
        console.error('saveReview update failed', error)
        set({ reviews: prev })
      }
    } else {
      const { error } = await supabase
        .from('week_reviews')
        .insert({ ...review, created_at: now, updated_at: now })
      if (error) {
        console.error('saveReview insert failed', error)
        set({ reviews: prev })
      }
    }
  },

  normalizeOrders: (date) => {
    const { tasks, updateTask } = get()
    const dayTasks = tasks.filter(t => t.date === date).sort((a, b) => a.order - b.order)
    dayTasks.forEach((task, index) => {
      const newOrder = (index + 1) * 1000
      if (task.order !== newOrder) {
        updateTask(task.id, { order: newOrder })
      }
    })
  },

  setHideDone: (value) => {
    try {
      globalThis.localStorage?.setItem(HIDE_DONE_KEY, value ? '1' : '0')
    } catch {
      // ignore storage failures (private mode, etc.)
    }
    set({ hideDone: value })
  },
}))
