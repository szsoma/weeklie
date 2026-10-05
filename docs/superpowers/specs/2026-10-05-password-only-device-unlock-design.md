# Password-only device unlock

## Goal

Open the same private Weeklie planner on multiple devices by entering the existing Supabase account password once per device. Remove the visible email, signup, and email-code login flows. Preserve all existing data, row-level security policies, and public read-only week links.

## Decision

Keep Supabase Auth and Postgres. Supabase requires an account identifier for password sign-in, so deployment provides the existing owner's email as `VITE_OWNER_EMAIL`. This value is public configuration, never a credential. The password is entered in the browser and passed directly to Supabase Auth. It is not stored by Weeklie; the existing Supabase client persists its session on that device. Every device signs into the same existing account, so its `auth.uid()` and owned rows remain the same.

This is a password-only unlock experience, not removal of authentication underneath. It avoids a database migration and preserves the current direct Supabase data operations.

## App behavior

- On launch, check the persisted Supabase session. If it belongs to the configured owner, load the planner as today.
- Without an owner session, show one password field with an "Unlock" action. An incorrect password shows an inline error and keeps the field available for retry.
- If the configured owner email is missing, show a configuration error rather than attempting sign-in or showing an empty planner.
- An unrelated persisted Supabase session must not load the planner. Sign it out on this device and show the unlock screen.
- Replace the planner menu's "Logout" action with "Forget this device". Use local-scope Supabase sign-out so other devices stay connected.
- Remove email, signup, and email-code actions from the unlock UI and public site navigation. Public share pages continue to load by token without an owner session.

## Data and security

No table, policy, or owner row is changed. The owner's existing password remains the shared device enrollment key. `VITE_OWNER_EMAIL` may be visible in the browser bundle; the password and Supabase session must not be logged, committed, or copied into configuration. Access to planner tables remains governed by the existing authenticated-user RLS policies. The public share RPC retains its token-based, read-only access.

## Verification

- Unit tests cover owner-email configuration, password-only form, rejected password, local sign-out, wrong-account session rejection, and absence of signup/email-code UI.
- Existing lint, typecheck, unit tests, and production build pass.
- Browser inspection checks the unlock screen and the public share route. Live sign-in and cross-device data access require the owner's email and password; report them as not run if unavailable.

## Alternatives considered

- A server API with a separate enrollment key provides more control over device sessions but requires migrating every database operation and adding server secrets. It is unnecessary for the requested password-only change.
- Google Sheets would require a server API and data migration while losing the existing relational constraints and RLS model.
