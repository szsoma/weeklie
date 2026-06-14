import Dexie, { type Table } from 'dexie'
import type { Task, TaskEvent, WeekReview } from './types'

export class WeeklyPlannerDB extends Dexie {
  tasks!: Table<Task>
  events!: Table<TaskEvent>
  reviews!: Table<WeekReview>

  constructor() {
    super('weekly-planner')
    this.version(1).stores({
      tasks: 'id, date, done, order',
      reviews: 'weekId',
    })
    this.version(2).stores({
      tasks: 'id, date, done, order, deletedAt, plannedDate',
      events: 'id, taskId, type, createdAt',
      reviews: 'weekId',
    }).upgrade(async (tx) => {
      await tx.table('tasks').toCollection().modify((task: any) => {
        task.updatedAt = task.createdAt || new Date().toISOString()
        task.deletedAt = null
        task.plannedDate = task.date
        task.lastRolledOverAt = null
        if (typeof task.color === 'number') {
          const palette = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']
          task.color = palette[task.color] || null
        }
      })
    })
  }
}

export const db = new WeeklyPlannerDB()
