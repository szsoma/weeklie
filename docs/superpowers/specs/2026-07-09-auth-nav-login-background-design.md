# Auth Nav and Login Background Design

## Goal

Tighten the authenticated navigation and refresh the login screen.

When the user is signed in, navigation should stop offering sign-up and should make logout available from the existing nav surfaces. The login screen should use the supplied hero image as a full-screen background with the existing auth form presented in a translucent, blurred white panel.

## Scope

In scope:

- Update both `src/components/FloatingNav.tsx` and `src/components/SiteHeader.tsx`.
- Show `Logout` instead of `Login` when a session exists.
- Hide `Sign up` when a session exists.
- Add logout wiring through `supabase.auth.signOut()`.
- Keep the existing auth listener, session clearing, and unauthenticated redirect behavior.
- Use `public/hero-bg-p-2600.jpg` as the full-screen login background.
- Style the login box with white at 0.8 opacity and backdrop blur.

Out of scope:

- Global settings menu.
- Account settings.
- Database changes.
- New auth providers.
- Sign-up flow changes.
- Route framework changes.
- Reworking task data loading or session persistence.

## Current Context

`src/App.tsx` gates the app on Supabase session state. If there is no session, it renders `AuthScreen`. If there is a session, it renders the planner shell and `FloatingNav`.

`FloatingNav` is the active signed-in navigation surface. `SiteHeader` is currently not rendered by the app, but it still contains matching login and sign-up links. Updating both keeps the components consistent and avoids stale behavior if the header is reused later.

## Behavior

Signed out:

- Login page renders the existing password and email-code forms.
- Login page background fills the viewport with `public/hero-bg-p-2600.jpg`.
- Login form sits in a white translucent panel using 0.8 opacity and backdrop blur.
- Navigation components, if rendered signed out, show `Login` and `Sign up`.

Signed in:

- `Login` becomes `Logout`.
- `Sign up` is hidden.
- Activating `Logout` calls `supabase.auth.signOut()`.
- The existing `onAuthStateChange` listener in `App` receives the signed-out state, clears session data through the current path, and returns the user to `AuthScreen`.

## Component Design

`App` should own logout behavior because it already owns session state. It passes a small `onLogout` callback and an `isAuthenticated` boolean to `FloatingNav`.

`FloatingNav` should stay presentational:

- keep About, Theme, and Features behavior unchanged,
- render auth action based on `isAuthenticated`,
- close the menu after logout is selected,
- do not introduce settings or account-menu state.

`SiteHeader` should receive optional auth props so it can support both modes if it is rendered later:

- `isAuthenticated?: boolean`,
- `onLogout?: () => void`.

If those props are omitted, `SiteHeader` keeps its current signed-out visual behavior.

## Styling

`AuthScreen` should use an outer full-viewport container with:

- background image: `/hero-bg-p-2600.jpg`,
- `background-size: cover`,
- `background-position: center`,
- enough padding for mobile safe spacing.

The form panel should use:

- `background-color: rgba(255, 255, 255, 0.8)`,
- `backdrop-filter: blur(...)`,
- a compact border or shadow consistent with the app's paper-like visual language,
- readable text contrast in both system theme modes.

The background image should cover the viewport without changing auth form behavior.

## Error Handling

Logout failures should not crash the app. If `supabase.auth.signOut()` returns an error, the callback can log the error and leave the session state unchanged. No new toast system is required for this pass.

The login background image is a static public asset. If it fails to load, the existing background color remains the fallback.

## Testing

Source-level tests should cover:

- `FloatingNav` has a logout path and does not show sign-up when authenticated.
- `SiteHeader` has the same authenticated behavior.
- `AuthScreen` references `/hero-bg-p-2600.jpg` and uses translucent white plus backdrop blur.

Manual verification:

1. Start the app and view the signed-out login screen.
2. Confirm the hero image covers the viewport.
3. Confirm the auth panel is readable with translucent white and blur.
4. Sign in.
5. Open the floating nav and confirm `Logout` is visible and `Sign up` is absent.
6. Click `Logout` and confirm the app returns to the login screen.
