import assert from 'node:assert/strict'
import test from 'node:test'

const pages = await import('../src/lib/pagination.ts').catch(() => ({}))

test('loads every ordered page beyond the API row cap', async () => {
  const rows = Array.from({ length: 1001 }, (_, id) => ({ id }))
  const calls = []
  const result = await pages.fetchAllPages(async (from, to) => {
    calls.push([from, to])
    return { data: rows.slice(from, to + 1), error: null }
  })
  assert.deepEqual(result, rows)
  assert.deepEqual(calls, [[0, 499], [500, 999], [1000, 1499]])
})

test('later-page errors reject rather than returning a partial history', async () => {
  await assert.rejects(() => pages.fetchAllPages(async (from) =>
    from === 0
      ? { data: Array.from({ length: 500 }, (_, id) => ({ id })), error: null }
      : { data: null, error: { message: 'request failed' } },
  ), /request failed/)
})
