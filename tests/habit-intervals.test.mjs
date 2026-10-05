import assert from 'node:assert/strict'
import test from 'node:test'
import { formatDate } from '../src/dates.ts'
import * as habits from '../src/lib/habits.ts'

const { getDueDatesForWeek } = habits

const dates = (rule, week, anchor) =>
  getDueDatesForWeek(rule, new Date(`${week}T00:00:00`), new Date(`${anchor}T00:00:00`)).map(formatDate)

test('daily interval follows the base date across week boundaries', () => {
  const rule = { freq: 'daily', interval: 2, byWeekdays: [] }
  assert.deepEqual(dates(rule, '2026-10-05', '2026-10-05'), ['2026-10-05', '2026-10-07', '2026-10-09', '2026-10-11'])
  assert.deepEqual(dates(rule, '2026-10-12', '2026-10-05'), ['2026-10-13', '2026-10-15', '2026-10-17'])
})

test('biweekly and custom weekly rules skip intervening weeks', () => {
  const biweekly = { freq: 'weekly', interval: 2, byWeekdays: [3] }
  assert.deepEqual(dates(biweekly, '2026-09-28', '2026-09-30'), ['2026-09-30'])
  assert.deepEqual(dates(biweekly, '2026-10-05', '2026-09-30'), [])
  assert.deepEqual(dates(biweekly, '2026-10-12', '2026-09-30'), ['2026-10-14'])

  const custom = { freq: 'weekly', interval: 3, byWeekdays: [1, 3] }
  assert.deepEqual(dates(custom, '2026-10-05', '2026-10-06'), ['2026-10-07'])
  assert.deepEqual(dates(custom, '2026-10-26', '2026-10-06'), ['2026-10-26', '2026-10-28'])
})

test('monthly and yearly intervals respect calendar periods and missing dates', () => {
  const everyOtherMonth = { freq: 'monthly', interval: 2, byWeekdays: [], startDayOfMonth: 15 }
  assert.deepEqual(dates(everyOtherMonth, '2026-02-09', '2026-01-15'), [])
  assert.deepEqual(dates(everyOtherMonth, '2026-03-09', '2026-01-15'), ['2026-03-15'])

  const monthly = { freq: 'monthly', interval: 2, byWeekdays: [], startDayOfMonth: 31 }
  assert.deepEqual(dates(monthly, '2026-01-26', '2026-01-31'), ['2026-01-31'])
  assert.deepEqual(dates(monthly, '2026-02-23', '2026-01-31'), [])
  assert.deepEqual(dates(monthly, '2026-03-30', '2026-01-31'), ['2026-03-31'])

  const yearly = { freq: 'yearly', interval: 2, byWeekdays: [], startDayOfMonth: 29, startMonth: 2 }
  assert.deepEqual(dates(yearly, '2025-02-24', '2024-02-29'), [])
  assert.deepEqual(dates(yearly, '2028-02-28', '2024-02-29'), ['2028-02-29'])

  const everyOtherYear = { freq: 'yearly', interval: 2, byWeekdays: [], startDayOfMonth: 5, startMonth: 6 }
  assert.deepEqual(dates(everyOtherYear, '2025-06-02', '2024-06-05'), [])
  assert.deepEqual(dates(everyOtherYear, '2026-06-01', '2024-06-05'), ['2026-06-05'])
})

test('habit anchor stays at the original planned date after moving its base task', () => {
  const task = {
    planned_date: '2026-09-30',
    date: '2026-10-05',
    created_at: '2026-09-29T12:00:00Z',
  }
  assert.equal(formatDate(habits.getHabitAnchorDate(task)), '2026-09-30')
  assert.equal(formatDate(habits.getHabitAnchorDate({ ...task, planned_date: null, date: null })), '2026-09-29')
})
