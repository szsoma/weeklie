import assert from 'node:assert/strict'
import test from 'node:test'
const startup = await import('../src/lib/habit-startup.ts').catch(() => ({}))

test('habit base is ready only after both task and template loads complete', async () => {
  const calls = []
  let finishTasks
  const tasks = new Promise((resolve) => { finishTasks = resolve })
  const loading = startup.loadHabitBase({
    loadTasks: async () => { calls.push('tasks started'); await tasks; calls.push('tasks done'); return true },
    loadTemplates: async () => { calls.push('templates done'); return true },
  })
  await Promise.resolve()
  assert.deepEqual(calls, ['tasks started', 'templates done'])
  finishTasks()
  assert.equal(await loading, true)
  assert.deepEqual(calls, ['tasks started', 'templates done', 'tasks done'])
})

test('habit week generation waits for instances and skips after a load failure', async () => {
  const calls = []
  const deps = {
    loadInstances: async () => { calls.push('instances'); return true },
    generate: async () => { calls.push('generate') },
  }
  assert.equal(await startup.loadHabitWeek(new Date(2026, 9, 5), deps), true)
  assert.deepEqual(calls, ['instances', 'generate'])
  calls.length = 0
  assert.equal(await startup.loadHabitWeek(new Date(2026, 9, 5), {
    ...deps,
    loadInstances: async () => false,
  }), false)
  assert.deepEqual(calls, [])
})
