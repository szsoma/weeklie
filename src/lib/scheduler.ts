import { getNextMondayMidnight } from './habits'

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function startWeeklyHabitScheduler(
  callback: (weekStart: Date) => void,
): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let intervalId: ReturnType<typeof setInterval> | null = null

  const tick = () => {
    const monday = getNextMondayMidnight(new Date())
    callback(monday)
  }

  const scheduleNext = () => {
    const now = new Date()
    const nextMonday = getNextMondayMidnight(now)
    const delay = nextMonday.getTime() - now.getTime()
    timeoutId = setTimeout(() => {
      tick()
      intervalId = setInterval(tick, ONE_WEEK_MS)
    }, delay)
  }

  scheduleNext()

  return () => {
    if (timeoutId) clearTimeout(timeoutId)
    if (intervalId) clearInterval(intervalId)
  }
}
