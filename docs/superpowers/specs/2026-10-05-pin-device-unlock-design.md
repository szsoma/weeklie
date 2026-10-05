# PIN device unlock

## Goal

Open the same private Weeklie planner on any device by entering a 6+ digit PIN once per device. Replace the password wording on the unlock screen with a PIN experience without removing the authentication underneath. Preserve all existing data, row-level security policies, and public read-only week links.

## Design

Keep Supabase Auth and Postgres exactly as in the password-only device unlock design. The PIN **is** the Supabase account password: a memorable 6+ digit numeric code stored by Supabase (bcrypt) on the existing owner account (`szsoma+weeklie@proton.me`). The unlock form submits the PIN through `signInWithPassword({ email: ownerEmail, password })`, so Supabase performs real verification and RLS remains unchanged. No secret is added to the frontend bundle.

Supabase requires passwords of at least 6 characters, so 4-digit PINs are not possible. A 6-digit numeric PIN has 10^6 combinations; it is a memorability choice, not high-security, and is protected in practice by Supabase Auth rate limits plus the obscurity of the app URL.

## UI

- Without an owner session, show one masked PIN field (`type="password"` with `inputMode="numeric"`), placeholder "PIN code", and an "Unlock" action.
- Copy: "Enter your PIN code to unlock this device."
- `Invalid login credentials` from Supabase Auth is shown as "Incorrect PIN code."; other errors pass through unchanged.
- The missing-configuration state (`VITE_OWNER_EMAIL` blank) is unchanged.

## Data and rollout

No table, policy, or owner row changes. The account password was set to the owner's chosen PIN server-side via `psql` (`update auth.users set encrypted_password = crypt(...)`), verified by a live `token?grant_type=password` request. Existing sessions stay valid. `VITE_OWNER_EMAIL` in local `.env` was corrected to the real account email.

## Testing

- Unit tests cover the PIN-only form, owner email configuration, "Incorrect PIN code." mapping, and absence of signup/email-code UI.
- Browser checks the unlock screen and share route. Live sign-in verified against the production auth endpoint.
