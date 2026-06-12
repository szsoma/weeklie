import Dexie, { type Table } from 'dexie'
import type { Task, WeekReview } from './types'

export class WeeklyPlannerDB extends Dexie {
  tasks!: Table<Task>
  reviews!: Table<WeekReview>

  constructor() {
    super('weekly-planner')
    this.version(1).stores({
      tasks: 'id, date, done, order',
      reviews: 'weekId',
    })
  }
}

export const db = new WeeklyPlannerDB()
