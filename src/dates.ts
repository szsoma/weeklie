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

export function formatWeekLabel(weekStart: Date): string {
  const weekEnd = endOfISOWeek(weekStart)
  const sameMonth = format(weekStart, 'MMM') === format(weekEnd, 'MMM')
  if (sameMonth) {
    return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'd')}`
  }
  return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`
}

export function getWeekDays(weekStart: Date): Date[] {
  const weekEnd = endOfISOWeek(weekStart)
  return eachDayOfInterval({ start: weekStart, end: weekEnd })
}

export function getWeekStart(date: Date = new Date()): Date {
  return startOfISOWeek(date)
}

export function nextWeek(weekStart: Date): Date {
  return addWeeks(weekStart, 1)
}

export function prevWeek(weekStart: Date): Date {
  return subWeeks(weekStart, 1)
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function isTaskOverdue(dateStr: string): boolean {
  const taskDate = startOfDay(new Date(dateStr))
  const today = startOfDay(new Date())
  return isBefore(taskDate, today)
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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

export function getWeekId(date: Date): string {
  const year = getISOWeekYear(date)
  const week = getISOWeek(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export { isToday }
