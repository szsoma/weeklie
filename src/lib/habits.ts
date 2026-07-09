import { formatDate, getWeekDays } from '../dates'
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
): Date[] {
  const days = getWeekDays(weekStart)

  if (rule.freq === 'daily') {
    return days
  }

  if (rule.freq === 'weekly') {
    if (rule.byWeekdays.length > 0) {
      return days.filter((day) => rule.byWeekdays.includes(day.getDay()))
    }
    return [weekStart]
  }

  if (rule.freq === 'monthly') {
    const day = rule.startDayOfMonth ?? weekStart.getDate()
    const match = days.find((d) => d.getDate() === day)
    return match ? [match] : []
  }

  if (rule.freq === 'yearly') {
    const day = rule.startDayOfMonth ?? weekStart.getDate()
    const month = rule.startMonth ?? weekStart.getMonth() + 1
    const match = days.find(
      (d) => d.getDate() === day && d.getMonth() + 1 === month,
    )
    return match ? [match] : []
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
