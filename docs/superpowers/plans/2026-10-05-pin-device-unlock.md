# PIN Device Unlock Implementation Plan

**Goal:** Replace the password-only unlock wording with a PIN experience; the PIN is the Supabase account password.

**Design doc:** `docs/superpowers/specs/2026-10-05-pin-device-unlock-design.md`

## Steps

1. [ ] Update `tests/password-unlock-screen.test.mjs`: require `inputMode="numeric"`, "Incorrect PIN code." mapping, keep `type="password"`, `autoComplete="current-password"`, `signInWithPassword({ email: ownerEmail, password })`, Unlock action, no signup/OTP UI.
2. [ ] Update `src/components/AuthScreen.tsx`: PIN copy, placeholder "PIN code", `inputMode="numeric"`, aria-label "PIN code", map `Invalid login credentials` to "Incorrect PIN code.".
3. [ ] Update `README.md` unlock paragraph to PIN wording.
4. [ ] `npm run test:all` and `npm run build` green.
5. [ ] Commit, push branch, open PR to `main`.
