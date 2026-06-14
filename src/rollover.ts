import type { Task } from './types'
import { formatDate } from './dates'

export function findOverdueTasks(tasks: Task[]): Task[] {
  const today = formatDate(new Date())
  return tasks.filter(
    t => t.date !== null &&
         t.date < today &&
         !t.done &&
         t.last_rolled_over_at !== today
  )
}
