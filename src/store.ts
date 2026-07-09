import { create } from 'zustand'
import { subWeeks } from 'date-fns'
import { supabase } from './lib/supabase'
import { createId } from './nanoid'
import { formatDate, getWeekDays, getWeekId, getWeekStart } from './dates'
import { getNextAvailableRecurringDate, getRecurringSeedsForWeek } from './lib/recurrence'
import { getTopOrderForDate, resolveQuickCaptureDate } from './lib/quick-capture'
import { playChime } from './lib/sound'
import { getDueDatesForWeek } from './lib/habits'
import type {
  DayCheckin,
  FocusColumnId,
  HabitInstance,
  HabitTemplate,
  QuickCaptureDestination,
  RecurrenceRule,
  Task,
  TaskEvent,
  TaskEventType,
  WeekReview,
} from './types'

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

type ReviewPersistencePayload = Partial<WeekReview>

type ReviewPersistenceInput = {
  weekId: string
  selectErrorMessage: string
  updateErrorMessage: string
  insertErrorMessage: string
  getTimestamp?: () => string
  createUpdatePayload: (now: string) => ReviewPersistencePayload
  createInsertPayload: (now: string) => ReviewPersistencePayload
}

type State = {
  tasks: Task[]
  events: TaskEvent[]
  reviews: WeekReview[]
  dayCheckins: DayCheckin[]
  currentWeekStart: Date
  isLoading: boolean
  hideDone: boolean
  quickCaptureOpen: boolean
  quickCaptureNotice: string | null
  backlogSearchFocused: boolean
  todayFocusActive: boolean
  focusedColumnId: FocusColumnId
  focusedTaskId: string | null
  keyboardHelpOpen: boolean
  habitTemplates: HabitTemplate[]
  habitInstances: HabitInstance[]
}

type Actions = {
  loadTasks: () => Promise<void>
  loadEvents: () => Promise<void>
  loadReviews: () => Promise<void>
  loadDayCheckinsForWeek: (weekStart: Date) => Promise<void>
  clearSessionData: () => void
  addTask: (title: string, date: string | null, options?: AddTaskOptions) => Promise<Task | null>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  toggleDone: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  moveTask: (id: string, newDate: string | null, newOrder: number) => Promise<void>
  copyLastWeekTasks: () => Promise<number>
  generateRecurringTasksForWeek: (weekStart: Date) => Promise<void>
  setCurrentWeekStart: (date: Date) => Promise<void>
  rolloverTasks: () => Promise<number>
  saveReview: (review: WeekReview) => Promise<void>
  saveIntention: (input: SaveIntentionInput) => Promise<void>
  normalizeOrders: (date: string) => void
  setHideDone: (value: boolean) => void
  openQuickCapture: () => void
  closeQuickCapture: () => void
  clearQuickCaptureNotice: () => void
  setBacklogSearchFocused: (focused: boolean) => void
  setTodayFocusActive: (active: boolean) => void
  setFocusedColumn: (columnId: FocusColumnId) => void
  setFocusedTask: (taskId: string | null) => void
  moveFocusedTask: (direction: -1 | 1) => Promise<void>
  openKeyboardHelp: () => void
  closeKeyboardHelp: () => void
  toggleTodayFocus: () => void
  upsertDayCheckin: (date: string, updates: Partial<Pick<DayCheckin, 'energy' | 'mood' | 'note'>>) => Promise<void>
  createTaskFromQuickCapture: (input: {
    title: string;
    destination: QuickCaptureDestination;
    note: string;
    due_time: string | null;
    color: string | null;
  }) => Promise<Task | null>
  loadHabitTemplates: () => Promise<void>
  loadHabitInstancesForWeek: (weekStart: Date) => Promise<void>
  generateHabitInstancesForWeek: (weekStart: Date) => Promise<void>
  upsertHabitTemplate: (taskId: string, rule: RecurrenceRule | null, targetPerPeriod?: number) => Promise<void>
  archiveHabitTemplate: (templateId: string) => Promise<void>
  deleteHabitTemplateForTask: (taskId: string) => Promise<void>
}

function getTaskCarryoverOptions(
  task: Task,
  overrides: AddTaskOptions = {},
): AddTaskOptions {
  return {
    color: task.color,
    recurrence: task.recurrence,
    note: task.note,
    due_time: task.due_time,
    ...overrides,
  }
}

async function persistReviewChange({
  weekId,
  selectErrorMessage,
  updateErrorMessage,
  insertErrorMessage,
  getTimestamp,
  createUpdatePayload,
  createInsertPayload,
}: ReviewPersistenceInput): Promise<boolean> {
  const { data: existing, error: selErr } = await supabase
    .from('week_reviews')
    .select('week_id')
    .eq('week_id', weekId)
    .maybeSingle()

  if (selErr) {
    console.error(selectErrorMessage, selErr)
    return false
  }

  const now = getTimestamp?.() ?? new Date().toISOString()

  if (existing) {
    const { error } = await supabase
      .from('week_reviews')
      .update(createUpdatePayload(now))
      .eq('week_id', weekId)
    if (error) {
      console.error(updateErrorMessage, error)
      return false
    }
    return true
  }

  const { error } = await supabase
    .from('week_reviews')
    .insert(createInsertPayload(now))
  if (error) {
    console.error(insertErrorMessage, error)
    return false
  }
  return true
}

export const useStore = create<State & Actions>((set, get) => ({
  tasks: [],
  events: [],
  reviews: [],
  dayCheckins: [],
  currentWeekStart: getWeekStart(new Date()),
  isLoading: true,
  hideDone: readHideDone(),
  quickCaptureOpen: false,
  quickCaptureNotice: null,
  backlogSearchFocused: false,
  todayFocusActive: false,
  focusedColumnId: null,
  focusedTaskId: null,
  keyboardHelpOpen: false,
  habitTemplates: [],
  habitInstances: [],

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

  loadDayCheckinsForWeek: async (weekStart) => {
    const days = getWeekDays(weekStart).map(formatDate)
    const { data, error } = await supabase
      .from('day_checkins')
      .select('*')
      .gte('date', days[0])
      .lte('date', days[6])

    if (error) {
      console.error('loadDayCheckinsForWeek failed', error)
      return
    }

    set({ dayCheckins: (data as DayCheckin[]) ?? [] })
  },

  clearSessionData: () => set({
    tasks: [],
    events: [],
    reviews: [],
    dayCheckins: [],
    quickCaptureOpen: false,
    quickCaptureNotice: null,
    backlogSearchFocused: false,
    todayFocusActive: false,
    focusedColumnId: null,
    focusedTaskId: null,
    keyboardHelpOpen: false,
    habitTemplates: [],
    habitInstances: [],
    isLoading: false,
  }),

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
    // optimistic insert; revert on error
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

    if (!done || !task.recurrence) return

    const nextDate = getNextAvailableRecurringDate(get().tasks, task)
    if (!nextDate) return

    await get().addTask(task.title, nextDate, getTaskCarryoverOptions(task, {
      planned_date: nextDate,
      silent: true,
    }))
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
      await get().addTask(task.title, targetDate, getTaskCarryoverOptions(task, {
        recurrence: null,
        due_time: null,
        silent: true,
      }))
    }

    return copied.length
  },

  generateRecurringTasksForWeek: async (weekStart) => {
    const seeds = getRecurringSeedsForWeek(get().tasks, weekStart)
    for (const seed of seeds) {
      await get().addTask(seed.sourceTask.title, seed.date, getTaskCarryoverOptions(seed.sourceTask, {
        planned_date: seed.date,
        silent: true,
      }))
    }
  },

  setCurrentWeekStart: async (date) => {
    const weekDays = getWeekDays(date).map(formatDate)
    set({
      currentWeekStart: date,
      todayFocusActive: weekDays.includes(formatDate(new Date()))
        ? get().todayFocusActive
        : false,
    })
    await get().generateRecurringTasksForWeek(date)
  },

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

    const persisted = await persistReviewChange({
      weekId: review.week_id,
      selectErrorMessage: 'saveReview select failed',
      updateErrorMessage: 'saveReview update failed',
      insertErrorMessage: 'saveReview insert failed',
      createUpdatePayload: now => ({ ...review, updated_at: now }),
      createInsertPayload: now => ({ ...review, created_at: now, updated_at: now }),
    })

    if (!persisted) {
      set({ reviews: prev })
    }
  },

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

    const persisted = await persistReviewChange({
      weekId,
      selectErrorMessage: 'saveIntention select failed',
      updateErrorMessage: 'saveIntention update failed',
      insertErrorMessage: 'saveIntention insert failed',
      getTimestamp: () => now,
      createUpdatePayload: timestamp => ({ intention, updated_at: timestamp }),
      createInsertPayload: timestamp => ({
        week_id: weekId,
        intention,
        viewed_at: timestamp,
        updated_at: timestamp,
      }),
    })

    if (!persisted) {
      set({ reviews: prev })
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

  openQuickCapture: () => set({ quickCaptureOpen: true }),

  closeQuickCapture: () => set({ quickCaptureOpen: false }),

  clearQuickCaptureNotice: () => set({ quickCaptureNotice: null }),

  setBacklogSearchFocused: (focused) => set({ backlogSearchFocused: focused }),

  setTodayFocusActive: (active) => set({ todayFocusActive: active }),

  setFocusedColumn: (columnId) => set({ focusedColumnId: columnId }),

  setFocusedTask: (taskId) => set({ focusedTaskId: taskId }),

  openKeyboardHelp: () => set({ keyboardHelpOpen: true }),

  closeKeyboardHelp: () => set({ keyboardHelpOpen: false }),

  toggleTodayFocus: () => {
    const currentWeekDays = getWeekDays(get().currentWeekStart).map(formatDate)
    const today = formatDate(new Date())
    if (!currentWeekDays.includes(today)) return
    set({ todayFocusActive: !get().todayFocusActive })
  },

  moveFocusedTask: async (direction) => {
    const { focusedTaskId, tasks, currentWeekStart } = get()
    if (!focusedTaskId) return
    const task = tasks.find(item => item.id === focusedTaskId)
    if (!task?.date) return
    const weekDays = getWeekDays(currentWeekStart).map(formatDate)
    const currentIndex = weekDays.indexOf(task.date)
    if (currentIndex === -1) return
    const targetDate = weekDays[currentIndex + direction]
    if (!targetDate) return
    await get().moveTask(task.id, targetDate, getTopOrderForDate(tasks, targetDate))
    set({ focusedColumnId: targetDate })
  },

  upsertDayCheckin: async (date, updates) => {
    const prev = get().dayCheckins
    const existing = prev.find(checkin => checkin.date === date)
    const now = new Date().toISOString()
    const optimistic = existing
      ? { ...existing, ...updates, updated_at: now }
      : {
          id: `pending-${date}`,
          user_id: '',
          date,
          energy: updates.energy ?? null,
          mood: updates.mood ?? null,
          note: updates.note ?? null,
          created_at: now,
          updated_at: now,
        }

    set({ dayCheckins: prev.filter(checkin => checkin.date !== date).concat(optimistic as DayCheckin) })

    const { data, error } = await supabase
      .from('day_checkins')
      .upsert({ date, ...updates }, { onConflict: 'user_id,date' })
      .select()
      .single()

    if (error) {
      console.error('upsertDayCheckin failed', error)
      set({ dayCheckins: prev })
      return
    }

    set({
      dayCheckins: get().dayCheckins
        .filter(checkin => checkin.date !== date)
        .concat(data as DayCheckin),
    })
  },

  createTaskFromQuickCapture: async (input) => {
    const title = input.title.trim()
    if (!title) return null

    const targetDate = resolveQuickCaptureDate(input.destination, get().currentWeekStart)
    const task = await get().addTask(title, targetDate, {
      note: input.note.trim() || null,
      due_time: input.due_time,
      color: input.color,
      order: getTopOrderForDate(get().tasks, targetDate),
    })

    if (task) {
      const label = targetDate === null
        ? 'backlog'
        : input.destination === 'today'
          ? 'today'
          : input.destination
      set({
        quickCaptureOpen: false,
        quickCaptureNotice: `Added to ${label}`,
      })
    }

    return task
  },

  loadHabitTemplates: async () => {
    const { data, error } = await supabase
      .from('habit_templates')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('loadHabitTemplates failed', error)
      return
    }

    set({ habitTemplates: (data as HabitTemplate[]) ?? [] })
  },

  loadHabitInstancesForWeek: async (weekStart) => {
    const days = getWeekDays(weekStart).map(formatDate)
    const { data, error } = await supabase
      .from('habit_instances')
      .select('*')
      .gte('for_date', days[0])
      .lte('for_date', days[6])

    if (error) {
      console.error('loadHabitInstancesForWeek failed', error)
      return
    }

    set({ habitInstances: (data as HabitInstance[]) ?? [] })
  },

  generateHabitInstancesForWeek: async (weekStart) => {
    const { tasks, habitTemplates, habitInstances, addTask } = get()
    const periodStartKey = formatDate(weekStart)
    const todayKey = formatDate(new Date())

    for (const template of habitTemplates.filter((t) => t.active)) {
      const baseTask = tasks.find((t) => t.id === template.task_id)
      if (!baseTask) continue

      const dueDates = getDueDatesForWeek(template.recurrence, weekStart)

      for (const dueDate of dueDates) {
        const dateKey = formatDate(dueDate)
        if (dateKey < todayKey) continue

        const alreadyExists = habitInstances.some(
          (inst) => inst.habit_template_id === template.id && inst.for_date === dateKey,
        )
        if (alreadyExists) continue

        const task = await addTask(baseTask.title, dateKey, {
          color: baseTask.color,
          note: baseTask.note,
          due_time: baseTask.due_time,
          silent: true,
        })

        if (!task) continue

        const instance: HabitInstance = {
          id: createId(),
          habit_template_id: template.id,
          user_id: '',
          task_id: task.id,
          for_date: dateKey,
          period_start: periodStartKey,
          created_at: new Date().toISOString(),
        }

        set({ habitInstances: [...get().habitInstances, instance] })

        const { error } = await supabase.from('habit_instances').insert({
          id: instance.id,
          habit_template_id: instance.habit_template_id,
          task_id: instance.task_id,
          for_date: instance.for_date,
          period_start: instance.period_start,
        })
        if (error) {
          console.error('insert habit_instance failed', error)
          set({ habitInstances: get().habitInstances.filter((i) => i.id !== instance.id) })
        }
      }
    }
  },

  upsertHabitTemplate: async (taskId, rule, targetPerPeriod = 1) => {
    if (!rule) {
      await get().deleteHabitTemplateForTask(taskId)
      return
    }

    const { habitTemplates } = get()
    const existing = habitTemplates.find((t) => t.task_id === taskId)
    const now = new Date().toISOString()

    if (existing) {
      const updated: HabitTemplate = {
        ...existing,
        recurrence: rule,
        target_per_period: targetPerPeriod,
        updated_at: now,
      }
      set({
        habitTemplates: habitTemplates.map((t) =>
          t.id === existing.id ? updated : t,
        ),
      })

      const { error } = await supabase
        .from('habit_templates')
        .update({
          recurrence: rule,
          target_per_period: targetPerPeriod,
          updated_at: now,
        })
        .eq('id', existing.id)

      if (error) {
        console.error('upsertHabitTemplate update failed', error)
        set({ habitTemplates })
      }
      return
    }

    const template: HabitTemplate = {
      id: createId(),
      user_id: '',
      task_id: taskId,
      recurrence: rule,
      target_per_period: targetPerPeriod,
      active: true,
      created_at: now,
      updated_at: now,
    }

    set({ habitTemplates: [...habitTemplates, template] })

    const { data, error } = await supabase
      .from('habit_templates')
      .insert({
        id: template.id,
        task_id: template.task_id,
        recurrence: template.recurrence,
        target_per_period: template.target_per_period,
        active: template.active,
        created_at: template.created_at,
        updated_at: template.updated_at,
      })
      .select()
      .single()

    if (error) {
      console.error('upsertHabitTemplate insert failed', error)
      set({ habitTemplates })
      return
    }

    set({
      habitTemplates: get().habitTemplates.map((t) =>
        t.id === template.id ? (data as HabitTemplate) : t,
      ),
    })

    await get().generateHabitInstancesForWeek(get().currentWeekStart)
  },

  archiveHabitTemplate: async (templateId) => {
    const prev = get().habitTemplates
    set({
      habitTemplates: prev.map((t) =>
        t.id === templateId ? { ...t, active: false } : t,
      ),
    })

    const { error } = await supabase
      .from('habit_templates')
      .update({ active: false })
      .eq('id', templateId)

    if (error) {
      console.error('archiveHabitTemplate failed', error)
      set({ habitTemplates: prev })
    }
  },

  deleteHabitTemplateForTask: async (taskId) => {
    const prevTemplates = get().habitTemplates
    const prevInstances = get().habitInstances
    const template = prevTemplates.find((t) => t.task_id === taskId)
    if (!template) return

    const today = formatDate(new Date())
    const futureInstances = prevInstances.filter(
      (inst) => inst.habit_template_id === template.id && inst.for_date >= today,
    )

    set({
      habitTemplates: prevTemplates.filter((t) => t.id !== template.id),
      habitInstances: prevInstances.filter(
        (inst) => inst.habit_template_id !== template.id,
      ),
    })

    const { error } = await supabase
      .from('habit_templates')
      .delete()
      .eq('id', template.id)

    if (error) {
      console.error('deleteHabitTemplateForTask failed', error)
      set({ habitTemplates: prevTemplates, habitInstances: prevInstances })
      return
    }

    for (const inst of futureInstances) {
      await get().deleteTask(inst.task_id)
    }
  },
}))
