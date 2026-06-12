import {
  format,
  startOfISOWeek,
  endOfISOWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isToday,
  isBefore,
  startOfDay,
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

export { isToday }
