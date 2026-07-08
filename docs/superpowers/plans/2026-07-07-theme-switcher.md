# Theme Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a System / Light / Dark theme selector to the floating nav menu.

**Architecture:** Keep the existing CSS variable theme system. Add a focused `useTheme` hook that persists the user preference in `localStorage` and synchronizes `document.documentElement.dataset.theme`. Add a compact segmented control to `FloatingNav` without closing the menu when the theme changes.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS utilities, Node test runner source-level tests.

---

## File Structure

- Create: `src/hooks/useTheme.ts` - local UI preference hook for reading, persisting, and applying the theme mode.
- Modify: `src/components/FloatingNav.tsx` - render the Theme row and segmented System / Light / Dark control inside the existing menu.
- Modify: `src/index.css` - add explicit `[data-theme="light"]` and `[data-theme="dark"]` token overrides while keeping the current system fallback.
- Create: `tests/theme-switcher.test.mjs` - source-level tests for the hook, CSS overrides, and menu options.
- Modify: `package.json` - add a script for the new test.

### Task 1: Add Theme Switcher Source Test

**Files:**
- Create: `tests/theme-switcher.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing source test**

Create `tests/theme-switcher.test.mjs`:

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function readOptional(url) {
  return existsSync(url) ? readFileSync(url, "utf8") : "";
}

const floatingNavSource = readFileSync(
  new URL("../src/components/FloatingNav.tsx", import.meta.url),
  "utf8",
);
const cssSource = readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8",
);
const themeHookSource = readOptional(
  new URL("../src/hooks/useTheme.ts", import.meta.url),
);

test("FloatingNav exposes System, Light, and Dark theme options", () => {
  assert.match(floatingNavSource, /Theme/);
  assert.match(floatingNavSource, /System/);
  assert.match(floatingNavSource, /Light/);
  assert.match(floatingNavSource, /Dark/);
  assert.match(floatingNavSource, /aria-label=\{`Set theme to \$\{option\.label\}`\}/);
});

test("theme CSS supports explicit light and dark overrides", () => {
  assert.match(cssSource, /:root\[data-theme="light"\]/);
  assert.match(cssSource, /:root\[data-theme="dark"\]/);
  assert.match(cssSource, /--bg: #fffdf3/);
  assert.match(cssSource, /--bg: #1a1a1a/);
});

test("useTheme persists the local theme preference and applies document override", () => {
  assert.match(themeHookSource, /THEME_STORAGE_KEY = "weeklie\.theme"/);
  assert.match(themeHookSource, /document\.documentElement\.dataset\.theme = theme/);
  assert.match(themeHookSource, /delete document\.documentElement\.dataset\.theme/);
  assert.match(themeHookSource, /localStorage\?\.setItem\(THEME_STORAGE_KEY, theme\)/);
});
```

Add the test script to `package.json`:

```json
"test:theme-switcher": "node --test tests/theme-switcher.test.mjs"
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
rtk npm run test:theme-switcher
```

Expected: FAIL assertions because `src/hooks/useTheme.ts` does not exist yet and the theme options/CSS overrides are missing.

- [ ] **Step 3: Commit the failing test**

Do not commit the failing test by itself. Continue to Task 2 for the implementation, then commit test and implementation together after green verification.

### Task 2: Add Theme State and CSS Overrides

**Files:**
- Create: `src/hooks/useTheme.ts`
- Modify: `src/index.css`

- [ ] **Step 1: Implement the theme hook**

Create `src/hooks/useTheme.ts`:

```ts
import { useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";

const THEME_STORAGE_KEY = "weeklie.theme";
const THEME_MODES: ThemeMode[] = ["system", "light", "dark"];

function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && THEME_MODES.includes(value as ThemeMode);
}

function readStoredTheme(): ThemeMode {
  try {
    const stored = globalThis.localStorage?.getItem(THEME_STORAGE_KEY) ?? null;
    return isThemeMode(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(readStoredTheme);

  useEffect(() => {
    if (theme === "system") {
      try {
        globalThis.localStorage?.removeItem(THEME_STORAGE_KEY);
      } catch {
        // Ignore storage failures.
      }
      delete document.documentElement.dataset.theme;
      return;
    }

    try {
      globalThis.localStorage?.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures.
    }
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return { theme, setTheme };
}
```

- [ ] **Step 2: Add explicit CSS token overrides**

In `src/index.css`, keep the existing `:root` and `@media (prefers-color-scheme: dark)` blocks. Add these blocks after the media query:

```css
:root[data-theme="light"] {
  --bg: #fffdf3;
  --surface: #fffaf0;
  --ink: #1a1a1a;
  --muted: #514b3f;
  --faint: #6f6657;
  --rule: rgba(26, 26, 26, 0.12);
  --rule-strong: rgba(26, 26, 26, 0.22);
  --today: #f8f2d8;
}

:root[data-theme="dark"] {
  --bg: #1a1a1a;
  --surface: #21211f;
  --ink: #e9e3d6;
  --muted: #bcb4a4;
  --faint: #a39a8a;
  --rule: rgba(233, 227, 214, 0.16);
  --rule-strong: rgba(233, 227, 214, 0.26);
  --today: #27241e;
}
```

- [ ] **Step 3: Run the source test**

Run:

```bash
rtk npm run test:theme-switcher
```

Expected: still FAIL because `FloatingNav` does not expose the theme control yet.

### Task 3: Add Theme Control to FloatingNav

**Files:**
- Modify: `src/components/FloatingNav.tsx`

- [ ] **Step 1: Add imports, options, and hook usage**

In `src/components/FloatingNav.tsx`, add:

```ts
import { useTheme, type ThemeMode } from "../hooks/useTheme";

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];
```

Inside `FloatingNav`, add:

```ts
const { theme, setTheme } = useTheme();
```

- [ ] **Step 2: Add the menu row**

Add this block after the About button and before Features:

```tsx
<div className="flex items-center justify-between gap-3 py-3">
  <span className="font-mono text-[13px] uppercase opacity-70">
    Theme
  </span>
  <div
    className="grid grid-cols-3 rounded-full bg-ink/[0.055] p-1"
    aria-label="Theme mode"
  >
    {THEME_OPTIONS.map((option) => {
      const active = theme === option.value;
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => setTheme(option.value)}
          aria-pressed={active}
          aria-label={`Set theme to ${option.label}`}
          className={`rounded-full px-2.5 py-1.5 font-mono text-[11px] uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 ${
            active
              ? "bg-ink text-bg shadow-sm"
              : "text-muted hover:bg-ink/[0.06] hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
</div>
```

Do not call `setOpen(false)` in this row; changing theme must keep the menu open.

- [ ] **Step 3: Run focused tests**

Run:

```bash
rtk npm run test:theme-switcher
rtk npm run test:input-focus-style
rtk npm run test:taskrow-note-menu
rtk npm run test:taskrow-popover-menu
```

Expected: all four commands PASS.

- [ ] **Step 4: Run build**

Run:

```bash
rtk npm run build
```

Expected: TypeScript and Vite build exit 0.

- [ ] **Step 5: Manual browser verification**

Run:

```bash
rtk npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173`, then:

1. Open the floating nav menu.
2. Click Dark and confirm the app changes immediately.
3. Click Light and confirm the app changes immediately.
4. Click System and confirm `document.documentElement.dataset.theme` is removed in DevTools.
5. Reload after choosing Light or Dark and confirm the choice persists.

- [ ] **Step 6: Commit implementation**

Stage only files from this feature:

```bash
rtk git add package.json src/hooks/useTheme.ts src/components/FloatingNav.tsx src/index.css tests/theme-switcher.test.mjs docs/superpowers/plans/2026-07-07-theme-switcher.md
rtk git commit -m "feat: add theme switcher"
```

Do not stage unrelated dirty files.
