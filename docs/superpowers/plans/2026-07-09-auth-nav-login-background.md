# Auth Nav and Login Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update authenticated nav actions in both nav components and add the supplied full-screen background treatment to the login page.

**Architecture:** `App` owns the logout callback because it already owns Supabase session state. `FloatingNav` and `SiteHeader` receive minimal auth props and render either signed-out links or a signed-in logout button. `AuthScreen` keeps the current Supabase form behavior and only changes layout/styling.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS utilities, Supabase JS v2, Node's built-in test runner.

---

## File Map

- Modify: `src/App.tsx`
  - Adds a small `handleLogout` callback around `supabase.auth.signOut()`.
  - Passes `isAuthenticated` and `onLogout` to `FloatingNav`.
- Modify: `src/components/FloatingNav.tsx`
  - Adds `isAuthenticated?: boolean` and `onLogout?: () => void` props.
  - Shows `Logout` and hides `Sign up` when authenticated.
  - Keeps About, Theme, Features, and quick capture behavior unchanged.
- Modify: `src/components/SiteHeader.tsx`
  - Adds the same optional auth props.
  - Keeps default signed-out behavior when props are omitted.
  - Updates desktop and mobile auth actions consistently.
- Modify: `src/components/AuthScreen.tsx`
  - Adds the image-backed full-screen layout and translucent blurred auth panel.
  - Keeps form state, password login, OTP send, and OTP verify behavior unchanged.
- Create: `tests/auth-nav-login-background.test.mjs`
  - Source-level coverage for auth nav rendering hooks and login background styling.
- Add to commit: `public/hero-bg-p-2600.jpg`
  - Static asset already present in the working tree and currently untracked.

## Baseline Note

The working tree already has uncommitted edits in `index.html`, `public/weekly-logo.svg`, `src/components/AboutScreen.tsx`, `src/components/AuthScreen.tsx`, `src/components/FloatingNav.tsx`, and `src/components/SiteHeader.tsx`, plus untracked `public/hero-bg-p-2600.jpg`. Do not revert those changes. Read each touched file before editing and preserve unrelated existing edits.

### Task 1: Add Source Tests

**Files:**

- Create: `tests/auth-nav-login-background.test.mjs`

- [ ] **Step 1: Write the failing source test**

Create `tests/auth-nav-login-background.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const floatingNavSource = readFileSync(
  new URL("../src/components/FloatingNav.tsx", import.meta.url),
  "utf8",
);
const siteHeaderSource = readFileSync(
  new URL("../src/components/SiteHeader.tsx", import.meta.url),
  "utf8",
);
const authScreenSource = readFileSync(
  new URL("../src/components/AuthScreen.tsx", import.meta.url),
  "utf8",
);

test("App owns logout and passes authenticated nav props", () => {
  assert.match(appSource, /const handleLogout = async \(\) => \{/);
  assert.match(appSource, /supabase\.auth\.signOut\(\)/);
  assert.match(appSource, /isAuthenticated=\{Boolean\(session\)\}/);
  assert.match(appSource, /onLogout=\{handleLogout\}/);
});

test("FloatingNav swaps login and signup for logout when authenticated", () => {
  assert.match(floatingNavSource, /isAuthenticated\?: boolean/);
  assert.match(floatingNavSource, /onLogout\?: \(\) => void/);
  assert.match(floatingNavSource, /isAuthenticated \? \(/);
  assert.match(floatingNavSource, />Logout</);
  assert.match(floatingNavSource, /onLogout\?\.\(\)/);
  assert.match(floatingNavSource, /!\s*isAuthenticated && \(/);
});

test("SiteHeader supports the same authenticated auth actions", () => {
  assert.match(siteHeaderSource, /isAuthenticated\?: boolean/);
  assert.match(siteHeaderSource, /onLogout\?: \(\) => void/);
  assert.match(siteHeaderSource, /isAuthenticated \? \(/);
  assert.match(siteHeaderSource, />Logout</);
  assert.match(siteHeaderSource, /onLogout\?\.\(\)/);
  assert.match(siteHeaderSource, /!\s*isAuthenticated && \(/);
});

test("AuthScreen uses the supplied full-screen image and blurred white panel", () => {
  assert.match(authScreenSource, /url\('\/hero-bg-p-2600\.jpg'\)/);
  assert.match(authScreenSource, /bg-cover/);
  assert.match(authScreenSource, /bg-center/);
  assert.match(authScreenSource, /bg-white\/80/);
  assert.match(authScreenSource, /backdrop-blur/);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
rtk node --test tests/auth-nav-login-background.test.mjs
```

Expected: FAIL. At least one assertion should fail because `handleLogout`, authenticated nav props, and login background classes do not exist yet.

- [ ] **Step 3: Commit the failing test**

Run:

```bash
rtk git add tests/auth-nav-login-background.test.mjs
rtk git commit -m "test: cover auth nav and login background"
```

Expected: Commit succeeds with only the new test file staged. If the repo policy does not allow committing a failing test separately, leave the test unstaged and commit it with Task 2.

### Task 2: Wire Logout Through the App and Nav Components

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/components/FloatingNav.tsx`
- Modify: `src/components/SiteHeader.tsx`
- Test: `tests/auth-nav-login-background.test.mjs`

- [ ] **Step 1: Add logout ownership in `src/App.tsx`**

In `AuthenticatedApp`, add this callback after `handleDragEnd` and before the loading branches:

```tsx
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Failed to sign out', error)
    }
  }
```

Then change the `FloatingNav` call to include auth props:

```tsx
            <FloatingNav
              isAuthenticated={Boolean(session)}
              onLogout={handleLogout}
              onShowAbout={() => setShowAbout(true)}
              onShowFeatures={() => setShowFeatures(true)}
              onOpenQuickCapture={openQuickCapture}
            />
```

- [ ] **Step 2: Add auth props to `src/components/FloatingNav.tsx`**

Change the props type to:

```tsx
type Props = {
  isAuthenticated?: boolean;
  onLogout?: () => void;
  onShowAbout?: () => void;
  onShowFeatures?: () => void;
  onOpenQuickCapture?: () => void;
};
```

Change the function signature to:

```tsx
export default function FloatingNav({
  isAuthenticated = false,
  onLogout,
  onShowAbout,
  onShowFeatures,
  onOpenQuickCapture,
}: Props) {
```

Replace the current `Login` and `Sign up` anchor block with:

```tsx
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                onLogout?.();
                setOpen(false);
              }}
              className={linkClass}
            >
              Logout
            </button>
          ) : (
            <>
              <a
                href="#login"
                onClick={() => setOpen(false)}
                className={linkClass}
              >
                Login
              </a>
              {!isAuthenticated && (
                <a
                  href="#signup"
                  onClick={() => setOpen(false)}
                  className={linkClass}
                >
                  Sign up
                </a>
              )}
            </>
          )}
```

- [ ] **Step 3: Add auth props to `src/components/SiteHeader.tsx`**

Add a props type above `export default function SiteHeader`:

```tsx
type Props = {
  isAuthenticated?: boolean;
  onLogout?: () => void;
};
```

Change the function signature to:

```tsx
export default function SiteHeader({
  isAuthenticated = false,
  onLogout,
}: Props) {
```

Replace the desktop login/sign-up anchors with:

```tsx
          {isAuthenticated ? (
            <button
              type="button"
              onClick={onLogout}
              className="font-mono text-[13px] uppercase hover:opacity-80 transition"
            >
              Logout
            </button>
          ) : (
            <>
              <a
                href="#login"
                className="font-mono text-[13px] uppercase hover:opacity-80 transition"
              >
                Login
              </a>
              {!isAuthenticated && (
                <a
                  href="#signup"
                  className="font-mono text-[13px] uppercase h-9 px-4 inline-flex items-center bg-bg text-ink rounded-md hover:opacity-80 active:scale-[0.98] transition"
                >
                  Sign up
                </a>
              )}
            </>
          )}
```

Replace the mobile login/sign-up button group with:

```tsx
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  onLogout?.();
                  setOpen(false);
                }}
                className="flex-1 font-mono text-[13px] uppercase h-10 px-4 inline-flex items-center justify-center rounded-md border border-bg/20 hover:bg-bg/10 active:scale-[0.98] transition"
              >
                Logout
              </button>
            ) : (
              <>
                <a
                  href="#login"
                  onClick={() => setOpen(false)}
                  className="flex-1 font-mono text-[13px] uppercase h-10 px-4 inline-flex items-center justify-center rounded-md border border-bg/20 hover:bg-bg/10 active:scale-[0.98] transition"
                >
                  Login
                </a>
                {!isAuthenticated && (
                  <a
                    href="#signup"
                    onClick={() => setOpen(false)}
                    className="flex-1 font-mono text-[13px] uppercase h-10 px-4 inline-flex items-center justify-center bg-bg text-ink rounded-md hover:opacity-80 active:scale-[0.98] transition"
                  >
                    Sign up
                  </a>
                )}
              </>
            )}
          </div>
```

- [ ] **Step 4: Run the source test**

Run:

```bash
rtk node --test tests/auth-nav-login-background.test.mjs
```

Expected: the first three tests pass. The `AuthScreen` test still fails until Task 3.

- [ ] **Step 5: Commit nav and logout changes**

Run:

```bash
rtk git add src/App.tsx src/components/FloatingNav.tsx src/components/SiteHeader.tsx tests/auth-nav-login-background.test.mjs
rtk git commit -m "feat: add authenticated nav logout"
```

Expected: Commit includes the App callback, both nav components, and the source test if it was not committed in Task 1.

### Task 3: Add Login Background and Blurred Auth Panel

**Files:**

- Modify: `src/components/AuthScreen.tsx`
- Add to implementation commit: `public/hero-bg-p-2600.jpg`
- Test: `tests/auth-nav-login-background.test.mjs`

- [ ] **Step 1: Update `src/components/AuthScreen.tsx` layout classes**

Replace the final returned JSX wrapper in `AuthScreen` with:

```tsx
  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center bg-cover bg-center px-4 py-8 sm:px-6"
      style={{ backgroundImage: "url('/hero-bg-p-2600.jpg')" }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/60 bg-white/80 p-6 text-ink shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-8">
        <h1 className="mb-2">
          <img
            src="/weekly-logo.svg"
            alt="Weekly"
            className="h-8 w-auto"
          />
        </h1>
        <p className="text-sm text-muted mb-6">Sign in to sync your week.</p>

        <div className="flex gap-5 mb-6 font-mono text-[12px] uppercase tracking-[0.08em]">
          <ModeButton
            mode="password"
            activeMode={mode}
            onSelect={switchMode}
            ariaLabel="Password sign in"
          >
            Password
          </ModeButton>
          <ModeButton
            mode="code"
            activeMode={mode}
            onSelect={switchMode}
            ariaLabel="Email code sign in"
          >
            Email code
          </ModeButton>
        </div>

        {renderAuthForm()}

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
```

- [ ] **Step 2: Run the source test**

Run:

```bash
rtk node --test tests/auth-nav-login-background.test.mjs
```

Expected: PASS.

- [ ] **Step 3: Commit login background changes and image asset**

Run:

```bash
rtk git add src/components/AuthScreen.tsx public/hero-bg-p-2600.jpg
rtk git commit -m "feat: add login background image"
```

Expected: Commit includes the login screen change and the public image asset.

### Task 4: Verification

**Files:**

- Verify: `src/App.tsx`
- Verify: `src/components/FloatingNav.tsx`
- Verify: `src/components/SiteHeader.tsx`
- Verify: `src/components/AuthScreen.tsx`
- Verify: `tests/auth-nav-login-background.test.mjs`

- [ ] **Step 1: Run the focused source test**

Run:

```bash
rtk node --test tests/auth-nav-login-background.test.mjs
```

Expected: PASS with four passing tests.

- [ ] **Step 2: Run lint**

Run:

```bash
rtk npm run lint
```

Expected: PASS. If lint fails in unrelated dirty files, record the exact unrelated file and rerun focused lint on the touched files:

```bash
rtk ./node_modules/.bin/eslint src/App.tsx src/components/FloatingNav.tsx src/components/SiteHeader.tsx src/components/AuthScreen.tsx tests/auth-nav-login-background.test.mjs
```

Expected: PASS for the touched files.

- [ ] **Step 3: Run the production build**

Run:

```bash
rtk npm run build
```

Expected: PASS. TypeScript should accept the new optional props and the image-backed `style` object.

- [ ] **Step 4: Manual browser verification**

Run:

```bash
rtk npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL, usually `http://127.0.0.1:5173/`.

Check:

- Signed-out login page shows the supplied background image covering the viewport.
- Login box is readable, white/translucent, and visibly blurred against the image.
- After signing in, opening the floating nav shows `Logout` and no `Sign up`.
- Clicking `Logout` returns to the login page.

- [ ] **Step 5: Final status check**

Run:

```bash
rtk git status --short
```

Expected: no unexpected changes from this feature remain unstaged. Pre-existing unrelated dirty files can remain dirty if they were not part of this feature.

## Self-Review

Spec coverage:

- Both nav components are covered in Task 2.
- `Login` to `Logout` and hidden `Sign up` are covered in Task 2 and tested in Task 1.
- Minimal logout via `supabase.auth.signOut()` is covered in Task 2.
- Existing auth listener and data flow stay unchanged because only `handleLogout` is added to `App`.
- Full-screen login background and translucent blurred white panel are covered in Task 3.
- Settings and account settings are not included.

Placeholder scan:

- No placeholder markers or incomplete steps are present.
- Every command includes an expected result.
- Every code-changing step includes the exact code block to insert or replace.

Type consistency:

- `isAuthenticated?: boolean` and `onLogout?: () => void` are used consistently in both nav components.
- `handleLogout` is passed as `onLogout={handleLogout}` from `App`.
- `Boolean(session)` is used for the authenticated flag.
