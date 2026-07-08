import { toLocalDateKey } from '../dates'
import type { Task } from '../types'

const PRESET_TIMES = ['07:00', '09:00', '12:00', '15:00', '17:00', '20:00'] as const

export const REMINDER_PRESET_TIMES = PRESET_TIMES

type ReminderStop = () => void
type NotificationOptionsWithActions = NotificationOptions & {
  actions?: Array<{ action: string; title: string }>;
  data?: { taskId: string };
}

function timeToToday(time: string): Date | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

async function showReminder(task: Task) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const registration = await navigator.serviceWorker?.ready.catch(() => null)
  const options: NotificationOptionsWithActions = {
    body: task.note ?? '',
    tag: `weeklie-task-${task.id}`,
    data: { taskId: task.id },
    requireInteraction: false,
    actions: [{ action: 'mark-done', title: 'Mark done' }],
  }

  if (registration?.showNotification) {
    await registration.showNotification(task.title, options)
    return
  }

  const notification = new Notification(task.title, options)
  notification.onclick = () => window.focus()
}

export async function requestReminderPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'default') {
    return Notification.requestPermission()
  }
  return Notification.permission
}

export function startReminderScheduler(getTasks: () => Task[]): ReminderStop {
  const timeouts = new Map<string, number>()

  const clear = () => {
    for (const timeoutId of timeouts.values()) window.clearTimeout(timeoutId)
    timeouts.clear()
  }

  const schedule = () => {
    clear()
    const now = new Date()
    for (const task of getTasks()) {
      if (!task.due_time || task.done || task.deleted_at !== null || task.date === null) continue
      const taskDate = task.date
      const todayKey = toLocalDateKey(now)
      if (taskDate !== todayKey) continue

      const dueAt = timeToToday(task.due_time)
      if (!dueAt || dueAt.getTime() <= now.getTime()) continue

      const delay = dueAt.getTime() - now.getTime()
      const timeoutId = window.setTimeout(() => {
        showReminder(task).catch((error) => console.error('showReminder failed', error))
        timeouts.delete(task.id)
      }, delay)
      timeouts.set(task.id, timeoutId)
    }
  }

  schedule()
  const intervalId = window.setInterval(schedule, 60_000)

  return () => {
    window.clearInterval(intervalId)
    clear()
  }
}
