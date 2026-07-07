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
