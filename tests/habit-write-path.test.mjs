import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const store = readFileSync(new URL('../src/store.ts', import.meta.url), 'utf8')
const popover = readFileSync(new URL('../src/components/HabitRepeatPopover.tsx', import.meta.url), 'utf8')

test('habit generation and removal use the atomic database functions', () => {
  assert.match(store, /\.rpc\('create_habit_occurrence'/)
  assert.match(store, /\.rpc\('remove_habit_template_for_task'/)
  assert.doesNotMatch(store, /\.from\('habit_instances'\)\.insert/)
  assert.doesNotMatch(store, /\.from\('habit_templates'\)\s*\.delete\(/)
})

test('template write failures propagate to the popover instead of claiming Saved', () => {
  assert.match(store, /throw new Error\(`Failed to save habit repeat/)
  assert.match(store, /throw new Error\(`Failed to remove habit repeat/)
  assert.match(popover, /setSaveState\("error"\)/)
})

test('editing an existing repeat attempts current-week generation before reporting success', () => {
  const updateBranch = store.split('if (existing) {').at(-1).split('return')[0]
  assert.match(updateBranch, /await get\(\)\.generateHabitInstancesForWeek\(get\(\)\.currentWeekStart\)/)
})
