import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/components/AuthScreen.tsx', import.meta.url), 'utf8')

test('device unlock only asks for a password and uses the configured owner email', () => {
  assert.match(source, /type="password"/)
  assert.match(source, /autoComplete="current-password"/)
  assert.match(source, /signInWithPassword\(\{\s*email: ownerEmail,\s*password,?\s*\}\)/)
  assert.match(source, />\s*Unlock\s*</)
  assert.doesNotMatch(source, /type="email"|signInWithOtp|verifyOtp|Email code|Sign up/)
})

test('device unlock has an explicit missing-configuration state', () => {
  assert.match(source, /!ownerEmail/)
  assert.match(source, /VITE_OWNER_EMAIL/)
})
