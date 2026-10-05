# Password-only Device Unlock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let one existing Supabase account unlock the planner with only its password, once per device, while preserving its data and public share links.

**Architecture:** Keep Supabase Auth and the existing browser client. Configure the owner's email through `VITE_OWNER_EMAIL`, reject sessions for any other account before loading data, and use local-scope sign-out to forget one device. No database schema or API migration is needed.

**Tech Stack:** React 19, Vite 8, TypeScript, Supabase JS 2, Node test runner.

---

## File map

- `src/lib/owner-access.ts`: pure owner-session identity check.
- `src/lib/supabase.ts`: exports the configured owner email alongside the existing client.
- `src/App.tsx`: owner-session gate, wrong-account cleanup, local device sign-out.
- `src/components/AuthScreen.tsx`: password-only unlock form and configuration error.
- `src/components/FloatingNav.tsx`: device-forget action with no login/signup choices.
- `src/components/SiteHeader.tsx`: remove unused login/signup links.
- `tests/owner-access.test.mjs`: owner-session behavior.
- `tests/auth-nav-login-background.test.mjs`: replace obsolete source assertions with unlock UI and navigation checks.
- `.env.example`, `README.md`: owner email setup and device behavior.

### Task 1: Gate sessions to the existing owner

- [ ] Write `tests/owner-access.test.mjs` against `isOwnerSession(session, email)` for matching email, different email, null session, and blank configuration. The matching case is:

```js
assert.equal(isOwnerSession({ user: { email: 'Owner@Example.com' } }, 'owner@example.com'), true)
```

- [ ] Run `rtk proxy node --test tests/owner-access.test.mjs` and verify failure because the helper does not exist.
- [ ] Add `src/lib/owner-access.ts` with a pure function that requires a nonblank email and compares normalized session email to it. Export `ownerEmail` from `src/lib/supabase.ts` using `import.meta.env.VITE_OWNER_EMAIL?.trim() ?? ''`.
- [ ] Run the focused test and verify it passes.
- [ ] In `src/App.tsx`, derive an owner session with the helper. Only run task, review, habit, check-in, and reminder effects for that session. When a different session is found, clear store data and sign out with `{ scope: 'local' }` outside the auth-state callback.
- [ ] Run `rtk npm run test:all`; fix type and lint errors. Commit the focused change.

### Task 2: Replace the sign-in page with device unlock

- [ ] Update `tests/auth-nav-login-background.test.mjs` to require exactly one password input, an Unlock action, `signInWithPassword({ email: ownerEmail, password })`, and no OTP/email-entry mode. Keep its background and theme checks.
- [ ] Run `rtk proxy node --test tests/auth-nav-login-background.test.mjs` and verify the new assertions fail against the old screen.
- [ ] Rewrite `src/components/AuthScreen.tsx` to keep the current background and white panel, show a configuration error when `ownerEmail` is blank, and otherwise submit the password through Supabase Auth. Clear the password after a failed attempt and show an inline error.
- [ ] Run the focused test and `rtk npm run test:all`. Commit the focused change.

### Task 3: Remove visible login actions and forget only this device

- [ ] Extend `tests/auth-nav-login-background.test.mjs` to require the menu label `Forget this device`, local-scope sign-out, and no login/signup links in `FloatingNav` or `SiteHeader`.
- [ ] Run the focused test and verify failure against the old navigation.
- [ ] Change `src/App.tsx` to pass an `onForgetDevice` handler using `supabase.auth.signOut({ scope: 'local' })`. Change `FloatingNav` to show the device-forget action. Remove obsolete auth props and login/signup links from `SiteHeader`.
- [ ] Run the focused test and `rtk npm run test:all`. Commit the focused change.

### Task 4: Configure, verify, and integrate

- [ ] Add `VITE_OWNER_EMAIL=your-existing-supabase-account@example.com` to `.env.example`. Update `README.md` to explain the owner email setting, password-only unlock, per-device persistence, and local forget action. Never put the actual password in `.env` or source.
- [ ] Run `rtk npm run test:all` and `rtk npm run build` and inspect complete exit codes.
- [ ] Start the app with test configuration and inspect the unlock UI in the collaborative browser. Check `/share/<invalid-token>` remains publicly reachable. If actual owner credentials are unavailable, label live sign-in and cross-device sync NOT RUN.
- [ ] Inspect `rtk git diff --check`, `rtk git status --short`, and commits; then fast-forward `main`, re-run tests, push, and remove the merged worktree and branch.

## Self-review

- The owner guard applies before every authenticated load and blocks a wrong persisted account.
- The existing Supabase account ID and data rows remain unchanged, so RLS ownership and share links remain valid.
- No step needs a server secret or a database migration. The only deployment value the user must set is the existing account email.
