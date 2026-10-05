import assert from 'node:assert/strict'
import test from 'node:test'
import { isOwnerSession } from '../src/lib/owner-access.ts'

test('accepts the configured owner regardless of email casing and whitespace', () => {
  assert.equal(
    isOwnerSession({ user: { email: ' Owner@Example.com ' } }, 'owner@example.com'),
    true,
  )
})

test('rejects another account, a missing session, and an empty owner setting', () => {
  assert.equal(isOwnerSession({ user: { email: 'other@example.com' } }, 'owner@example.com'), false)
  assert.equal(isOwnerSession(null, 'owner@example.com'), false)
  assert.equal(isOwnerSession({ user: { email: 'owner@example.com' } }, '  '), false)
  assert.equal(isOwnerSession({ user: { email: null } }, 'owner@example.com'), false)
})
