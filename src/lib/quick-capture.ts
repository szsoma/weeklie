import { formatDate, getWeekDays, getWeekStart } from '../dates'
import type { QuickCaptureDestination, Task } from '../types'

const WEEKDAY_INDEX: Record<Exclude<QuickCaptureDestination, 'today' | 'backlog'>, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
}

export function resolveQuickCaptureDate(
  destination: QuickCaptureDestination,
  visibleWeekStart: Date,
): string | null {
  switch (destination) {
    case 'backlog':
      return null
    case 'today':
      return formatDate(new Date())
    default: {
      const dayIndex = WEEKDAY_INDEX[destination]
      return formatDate(getWeekDays(visibleWeekStart)[dayIndex])
    }
  }
}

export function getDefaultQuickCaptureDestination(
  visibleWeekStart: Date,
  todayFocusActive: boolean,
  backlogSearchFocused: boolean,
): QuickCaptureDestination {
  if (backlogSearchFocused) return 'backlog'
  if (todayFocusActive) return 'today'
  return formatDate(visibleWeekStart) === formatDate(getWeekStart(new Date()))
    ? 'today'
    : 'backlog'
}

export function getTopOrderForDate(tasks: Task[], date: string | null): number {
  const destinationTasks = tasks.filter(task => task.date === date)
  if (destinationTasks.length === 0) return 1
  return Math.min(...destinationTasks.map(task => task.order)) - 1
}
