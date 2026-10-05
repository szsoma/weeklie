import { formatDate, getWeekDays } from '../dates.ts'
import type { HabitInstance, HabitTemplate, RecurrencePreset, RecurrenceRule, Task } from '../types'

export const JS_WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const FULL_WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export function getHabitAnchorDate(
  task: Pick<Task, 'planned_date' | 'date' | 'created_at'>,
): Date {
  const date = task.planned_date ?? task.date
  return date ? new Date(`${date}T00:00:00`) : new Date(task.created_at)
}

export function presetToRule(
  preset: RecurrencePreset,
  baseDate: Date,
): RecurrenceRule | null {
  switch (preset) {
    case 'never':
      return null
    case 'daily':
      return { freq: 'daily', interval: 1, byWeekdays: [] }
    case 'weekdays':
      return { freq: 'weekly', interval: 1, byWeekdays: [1, 2, 3, 4, 5] }
    case 'weekends':
      return { freq: 'weekly', interval: 1, byWeekdays: [0, 6] }
    case 'weekly':
      return { freq: 'weekly', interval: 1, byWeekdays: [baseDate.getDay()] }
    case 'biweekly':
      return { freq: 'weekly', interval: 2, byWeekdays: [baseDate.getDay()] }
    case 'monthly':
      return { freq: 'monthly', interval: 1, byWeekdays: [], startDayOfMonth: baseDate.getDate() }
    case 'yearly':
      return {
        freq: 'yearly',
        interval: 1,
        byWeekdays: [],
        startDayOfMonth: baseDate.getDate(),
        startMonth: baseDate.getMonth() + 1,
      }
    case 'custom':
      return null
    default:
      return null
  }
}

export function getDueDatesForWeek(
  rule: RecurrenceRule,
  weekStart: Date,
  anchorDate: Date,
): Date[] {
  const days = getWeekDays(weekStart)
  const interval = Math.max(1, Math.trunc(rule.interval || 1))
  const dayNumber = (date: Date) =>
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
  const anchorDay = dayNumber(anchorDate)

  const isOnOrAfterAnchor = (day: Date) => dayNumber(day) >= anchorDay

  if (rule.freq === 'daily') {
    return days.filter((day) =>
      isOnOrAfterAnchor(day) && (dayNumber(day) - anchorDay) % interval === 0,
    )
  }

  if (rule.freq === 'weekly') {
    const anchorWeek = anchorDay - (anchorDate.getDay() + 6) % 7
    const weekdays = rule.byWeekdays.length > 0 ? rule.byWeekdays : [anchorDate.getDay()]
    return days.filter((day) => {
      const week = dayNumber(day) - (day.getDay() + 6) % 7
      const weeksSinceAnchor = (week - anchorWeek) / 7
      return isOnOrAfterAnchor(day) && weekdays.includes(day.getDay()) && weeksSinceAnchor % interval === 0
    })
  }

  if (rule.freq === 'monthly') {
    const dayOfMonth = rule.startDayOfMonth ?? anchorDate.getDate()
    return days.filter((day) => {
      const monthsSinceAnchor = (day.getFullYear() - anchorDate.getFullYear()) * 12
        + day.getMonth() - anchorDate.getMonth()
      return isOnOrAfterAnchor(day) && day.getDate() === dayOfMonth
        && monthsSinceAnchor % interval === 0
    })
  }

  if (rule.freq === 'yearly') {
    const dayOfMonth = rule.startDayOfMonth ?? anchorDate.getDate()
    const month = rule.startMonth ?? anchorDate.getMonth() + 1
    return days.filter((day) =>
      isOnOrAfterAnchor(day) && day.getDate() === dayOfMonth
        && day.getMonth() + 1 === month
        && (day.getFullYear() - anchorDate.getFullYear()) % interval === 0,
    )
  }

  return []
}

export function formatRecurrenceSummary(rule: RecurrenceRule): string {
  if (rule.freq === 'daily') {
    return rule.interval === 1 ? 'Daily' : `Every ${rule.interval} days`
  }

  if (rule.freq === 'weekly') {
    if (rule.byWeekdays.length === 0) {
      return rule.interval === 1 ? 'Weekly' : `Every ${rule.interval} weeks`
    }
    const days = rule.byWeekdays
      .slice()
      .sort((a, b) => a - b)
      .map((d) => JS_WEEKDAY_LABELS[d])
      .join(', ')
    if (rule.interval === 2) return `Every 2 weeks on ${days}`
    return rule.interval === 1
      ? `Weekly on ${days}`
      : `Every ${rule.interval} weeks on ${days}`
  }

  if (rule.freq === 'monthly') {
    return rule.interval === 1 ? 'Monthly' : `Every ${rule.interval} months`
  }

  if (rule.freq === 'yearly') {
    return rule.interval === 1 ? 'Yearly' : `Every ${rule.interval} years`
  }

  return 'Custom'
}

export function getHabitProgress(
  template: HabitTemplate,
  periodStart: Date,
  tasks: Task[],
  instances: HabitInstance[],
): { completed: number; total: number } {
  const periodKey = formatDate(periodStart)
  const periodInstances = instances.filter(
    (inst) =>
      inst.habit_template_id === template.id && inst.period_start === periodKey,
  )
  const taskIds = new Set(periodInstances.map((inst) => inst.task_id))
  const completed = tasks.filter(
    (task) => taskIds.has(task.id) && task.done,
  ).length
  return { completed, total: periodInstances.length }
}

export function getNextMondayMidnight(from: Date): Date {
  const date = new Date(from)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay()
  const daysUntilMonday = (8 - day) % 7 || 7
  date.setDate(date.getDate() + daysUntilMonday)
  return date
}

export function getWeekdayLabel(index: number): string {
  return FULL_WEEKDAY_LABELS[index] ?? ''
}
