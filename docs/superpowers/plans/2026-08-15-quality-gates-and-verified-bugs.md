# Quality Gates and Verified Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the broken lint and test gates, then fix six verified user-facing bugs — including implementing the drag-to-reorder feature the README already promises.

**Architecture:** Each bug fix extracts its decision logic into a small pure module under `src/lib/`, tested behaviorally with Node's built-in test runner, then wires that module into the React component. This replaces the repo's existing source-regex test style (which asserts that source text matches a pattern, and cannot catch logic errors) with tests that actually execute the code.

**Tech Stack:** React 19, TypeScript, Vite 8, Zustand 5, @dnd-kit (core 6.3.1 + sortable 10.0.0), Tailwind v4, Supabase, Node 22 test runner.

## Global Constraints

These apply to **every** task. They were verified against this machine and this repo on 2026-08-15.

1. **Relative imports in any module reachable from a test MUST use an explicit `.ts` extension.** Node's ESM resolver rejects extensionless relative imports (`from '../dates'` → `ERR_MODULE_NOT_FOUND`). `allowImportingTsExtensions: true` is already set in `tsconfig.app.json`, and both `tsc -b` and `vite build` were verified to accept `.ts` extensions. Example: `import { getWeekId } from '../dates.ts'`.
2. **No test may transitively import `src/lib/supabase.ts`.** It throws at module load when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are absent. This means **never import `src/store.ts` from a test.** Test pure `src/lib/*` modules only.
3. **Do not import React components from tests.** Node cannot resolve JSX. Component correctness in this plan is verified by manual browser check, listed explicitly where it applies.
4. **Node version floor: v22.6+** for native TypeScript type-stripping. Verified present: `v22.23.2`.
5. **Run all tests with:** `node --test "tests/**/*.test.mjs"` (quote the glob — Node expands it). Passing a bare directory (`node --test tests/`) fails with `MODULE_NOT_FOUND`.
6. **Commit after every task.** Do not batch commits across tasks.
7. **Never edit files under `.worktrees/`** — that is a separate checked-out worktree of the same repo.

## Baseline (verified before starting)

- `npx tsc -b` → passes, no errors.
- `npx eslint .` → **crashes**: `TypeError: Cannot read properties of undefined (reading 'Cjs')`.
- `node --test "tests/**/*.test.mjs"` → 50 tests, 47 pass, **3 fail**:
  - `WeekHeader no longer exposes Today actions`
  - `WeekGrid always renders the full week grid`
  - `theme CSS supports explicit light and dark overrides`

---

## File Structure

**New files**

| File | Responsibility |
| --- | --- |
| `src/lib/notifications.ts` | Decide whether a service-worker message should complete a task. |
| `src/lib/task-colors.ts` | Single source of truth for the four task color tokens and their hex values. |
| `src/lib/streak.ts` | Compute the consecutive-week review streak from reviewed week IDs. |
| `src/lib/reorder.ts` | Compute a fractional `order` value for a drag-and-drop insertion point. |
| `tests/notification-action.test.mjs` | Behavioral tests for `notifications.ts`. |
| `tests/task-colors.test.mjs` | Behavioral tests for `task-colors.ts`. |
| `tests/review-streak.test.mjs` | Behavioral tests for `streak.ts`. |
| `tests/reorder.test.mjs` | Behavioral tests for `reorder.ts`. |

**Modified files**

| File | Change |
| --- | --- |
| `package.json` | Pin `typescript` to `5.9.3`; add `test` and `test:all` scripts. |
| `tests/remove-today-feature.test.mjs` | Delete — guards a removal that was reverted. |
| `tests/theme-switcher.test.mjs` | Correct the `--bg` hex assertion. |
| `src/App.tsx` | Gate task completion on notification action; wire sortable drag-end. |
| `src/components/QuickCaptureDialog.tsx` | Replace non-existent `bg-red` classes with real hex swatches. |
| `src/components/TaskRow.tsx` | Import shared colors; swap `useDraggable` → `useSortable`. |
| `src/components/ReviewScreen.tsx` | Seed reflection from saved review; use real streak; preserve `created_at`. |
| `src/components/DayColumn.tsx` | Wrap task list in `SortableContext`. |
| `src/components/BacklogPanel.tsx` | Wrap task list in `SortableContext`. |
| `src/store.ts` | Order `week_reviews` query deterministically. |
| `README.md` | Correct the stale `hooks/` listing. |

---

## Task 1: Restore the lint gate and add a unified test script

`typescript-eslint@8.61.0` declares `peerDependencies.typescript: ">=4.8.4 <6.1.0"`. The repo has `typescript@7.0.2`, which is outside that range and crashes ESLint at load. TypeScript `5.9.3` is the newest 5.x and supports `erasableSyntaxOnly` (added in 5.8), which `tsconfig.app.json` requires.

**Files:**
- Modify: `package.json` (`devDependencies.typescript`, `scripts`)

**Interfaces:**
- Consumes: nothing.
- Produces: working `npm run lint` and `npm test`. Every later task's verification steps depend on these.

- [ ] **Step 1: Confirm the failure you are fixing**

Run: `npx eslint . 2>&1 | head -5`

Expected: `TypeError: Cannot read properties of undefined (reading 'Cjs')`

- [ ] **Step 2: Pin TypeScript to 5.9.3**

```bash
npm install --save-exact --save-dev typescript@5.9.3
```

- [ ] **Step 3: Verify lint now runs**

Run: `npx eslint .`

Expected: ESLint completes without crashing. It may report real lint findings — that is success, the gate is alive. **Do not fix those findings in this task**; record them and stop. A clean exit is also acceptable.

- [ ] **Step 4: Verify the type-check still passes on the older compiler**

Run: `npx tsc -b --force --pretty false`

Expected: `TypeScript: No errors found`

If this fails, TS 5.9.3 rejects something TS 7 allowed. Stop and report the errors rather than weakening `tsconfig.app.json`.

- [ ] **Step 5: Verify the production build still works**

Run: `npx vite build`

Expected: build completes, `dist/sw.js` is generated by the PWA plugin.

- [ ] **Step 6: Add unified test scripts to `package.json`**

Add these two entries to `"scripts"`, keeping all existing `test:*` entries:

```json
"test": "node --test \"tests/**/*.test.mjs\"",
"test:all": "npm run lint && npx tsc -b && npm test"
```

- [ ] **Step 7: Verify the test script finds every test file**

Run: `npm test`

Expected: `# tests 50`, `# pass 47`, `# fail 3`. The 3 failures are the known-stale tests fixed in Task 2. Confirm the count is 50 — if it is lower, the glob is not matching all files.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: pin typescript to 5.9.3 to restore eslint, add unified test script

typescript-eslint 8.61 declares peer typescript >=4.8.4 <6.1.0; typescript 7.0.2
crashed eslint at load. Adds npm test / npm run test:all."
```

---

## Task 2: Fix the three stale test assertions

`tests/remove-today-feature.test.mjs` asserts the Today-focus feature was removed, but it is live and documented (`WeekHeader.tsx` renders a Today toggle, `WeekGrid.tsx` filters to today). The test guards a removal that was reverted, so it is wrong, not the code. `tests/theme-switcher.test.mjs` asserts a background hex that changed.

**Files:**
- Delete: `tests/remove-today-feature.test.mjs`
- Modify: `tests/theme-switcher.test.mjs:33`

**Interfaces:**
- Consumes: `npm test` from Task 1.
- Produces: a green baseline. Every later task asserts "no new failures" against this.

- [ ] **Step 1: Confirm the three failures and their names**

Run: `npm test 2>&1 | grep "^not ok"`

Expected:
```
not ok 37 - WeekHeader no longer exposes Today actions
not ok 40 - WeekGrid always renders the full week grid
not ok 46 - theme CSS supports explicit light and dark overrides
```

- [ ] **Step 2: Confirm Today focus is genuinely a live feature before deleting its removal-guard**

Run: `grep -n "toggleTodayFocus\|todayFocusActive" src/components/WeekHeader.tsx src/components/WeekGrid.tsx src/hooks/useGlobalShortcuts.ts`

Expected: multiple hits across all three files, including the `t` keyboard shortcut. This confirms the feature exists and the test is the stale artifact.

- [ ] **Step 3: Delete the obsolete test file**

```bash
git rm tests/remove-today-feature.test.mjs
```

- [ ] **Step 4: Correct the theme hex assertion**

In `tests/theme-switcher.test.mjs`, the assertion on line 33 reads:

```js
  assert.match(cssSource, /--bg: #fffdf3/);
```

Replace it with the value actually in `src/index.css:22`:

```js
  assert.match(cssSource, /--bg: #fffdfc/);
```

- [ ] **Step 5: Verify a fully green suite**

Run: `npm test`

Expected: `# fail 0`. Test count drops to 47 (three tests removed with the file, one fixed).

- [ ] **Step 6: Commit**

```bash
git add -A tests/
git commit -m "test: remove stale today-focus removal guard, fix theme bg hex

remove-today-feature.test.mjs asserted the absence of a feature that was
reinstated. theme-switcher expected --bg #fffdf3; index.css uses #fffdfc."
```

---

## Task 3: Stop notification body-taps from completing tasks

`src/sw.ts:22-26` posts `{ type: 'weeklie:mark-done', taskId, action }` on **every** `notificationclick`, including a plain tap on the notification body (where `event.action` is `''`). `src/App.tsx:135-139` checks only `event.data.type` and ignores `action`, so glancing at a reminder silently completes the task.

The fix keeps the service worker posting on every click — the app still needs to focus — and moves the completion decision into a tested pure function.

**Files:**
- Create: `src/lib/notifications.ts`
- Create: `tests/notification-action.test.mjs`
- Modify: `src/App.tsx:132-143`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `getTaskIdToComplete(data: unknown): string | null` — returns the task ID **only** when the message is a mark-done *action*; `null` for body taps, foreign messages, and malformed payloads.

- [ ] **Step 1: Write the failing test**

Create `tests/notification-action.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { getTaskIdToComplete } from "../src/lib/notifications.ts";

test("completes the task when the mark-done action button is used", () => {
  assert.equal(
    getTaskIdToComplete({ type: "weeklie:mark-done", taskId: "abc123", action: "mark-done" }),
    "abc123",
  );
});

test("does NOT complete the task when the notification body is tapped", () => {
  // Browsers report action as "" for a plain body tap. This is the bug.
  assert.equal(
    getTaskIdToComplete({ type: "weeklie:mark-done", taskId: "abc123", action: "" }),
    null,
  );
});

test("does NOT complete the task when action is absent", () => {
  assert.equal(
    getTaskIdToComplete({ type: "weeklie:mark-done", taskId: "abc123" }),
    null,
  );
});

test("ignores messages of a different type", () => {
  assert.equal(
    getTaskIdToComplete({ type: "workbox-broadcast-update", taskId: "abc123", action: "mark-done" }),
    null,
  );
});

test("ignores a mark-done action with no task id", () => {
  assert.equal(getTaskIdToComplete({ type: "weeklie:mark-done", action: "mark-done" }), null);
});

test("tolerates malformed payloads without throwing", () => {
  assert.equal(getTaskIdToComplete(null), null);
  assert.equal(getTaskIdToComplete(undefined), null);
  assert.equal(getTaskIdToComplete("nope"), null);
  assert.equal(getTaskIdToComplete(42), null);
  assert.equal(getTaskIdToComplete({ type: "weeklie:mark-done", taskId: 7, action: "mark-done" }), null);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/notification-action.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/notifications.ts`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/notifications.ts`:

```ts
export const MARK_DONE_MESSAGE_TYPE = 'weeklie:mark-done'
export const MARK_DONE_ACTION = 'mark-done'

/**
 * Returns the task id to complete, or null.
 *
 * The service worker posts a message on every notification click so the app can
 * focus itself. Only an explicit "Mark done" action button press should complete
 * the task — a plain tap on the notification body reports action "".
 */
export function getTaskIdToComplete(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null
  const message = data as Record<string, unknown>
  if (message.type !== MARK_DONE_MESSAGE_TYPE) return null
  if (message.action !== MARK_DONE_ACTION) return null
  const taskId = message.taskId
  if (typeof taskId !== 'string' || taskId.length === 0) return null
  return taskId
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/notification-action.test.mjs`

Expected: `# pass 6`, `# fail 0`.

- [ ] **Step 5: Wire it into App.tsx**

In `src/App.tsx`, add the import alongside the other `./lib/...` imports:

```ts
import { getTaskIdToComplete } from './lib/notifications'
```

Then replace the entire service-worker message effect (currently lines 132-143) with:

```tsx
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handleMessage = (event: MessageEvent) => {
      const taskId = getTaskIdToComplete(event.data)
      if (!taskId) return
      const task = useStore.getState().tasks.find((item) => item.id === taskId)
      if (task && !task.done) toggleDone(taskId)
    }
    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
  }, [toggleDone])
```

Note: `App.tsx` is a component and is not covered by the Node test, so it imports without the `.ts` extension to match its sibling imports. `notifications.ts` has no relative imports of its own, so the test resolves it directly.

- [ ] **Step 6: Verify types, lint, and the full suite**

Run: `npx tsc -b && npm run lint && npm test`

Expected: type-check clean, lint no new errors, `# fail 0`.

- [ ] **Step 7: Manual browser verification**

1. `npm run dev`, sign in.
2. Open a task's ⋯ menu → **Remind me** → pick a time 1–2 minutes out. Grant notification permission when prompted.
3. Wait for the notification to fire.
4. **Tap the notification body** (not the button). Expected: the app focuses and the task is **still incomplete**. Before this fix it would have been checked off.
5. Fire another reminder and press the **Mark done** action button. Expected: the task is completed.

- [ ] **Step 8: Commit**

```bash
git add src/lib/notifications.ts tests/notification-action.test.mjs src/App.tsx
git commit -m "fix: only complete a task via the notification's Mark done action

sw.ts posts on every notificationclick; App.tsx ignored event.action, so
tapping the notification body silently completed the task."
```

---

## Task 4: Fix the invisible Quick Capture color swatches

`src/components/QuickCaptureDialog.tsx:21-26` maps colors to `bg-red`, `bg-orange`, `bg-yellow`, `bg-green`. These are not Tailwind v4 utilities (which require a shade, e.g. `bg-red-500`) and are not defined in the `@theme` block in `src/index.css`. Grepping the built CSS confirms `.bg-ink` exists while none of these four do — so the swatches render as four blank circles.

`src/components/TaskRow.tsx:13-18` already solves this correctly with an inline `COLOR_MAP` of hex values. Promote it to a shared module rather than duplicating it.

**Files:**
- Create: `src/lib/task-colors.ts`
- Create: `tests/task-colors.test.mjs`
- Modify: `src/components/TaskRow.tsx:12-18,51-54`
- Modify: `src/components/QuickCaptureDialog.tsx:19-26,~166`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `TASK_COLOR_TOKENS: readonly ['red','orange','yellow','green']`
  - `TASK_COLOR_HEX: Record<TaskColorToken, string>`
  - `type TaskColorToken = 'red'|'orange'|'yellow'|'green'`
  - `getTaskColorHex(color: string | null): string | null`

- [ ] **Step 1: Write the failing test**

Create `tests/task-colors.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  TASK_COLOR_TOKENS,
  TASK_COLOR_HEX,
  getTaskColorHex,
} from "../src/lib/task-colors.ts";

test("exposes exactly the four supported tokens", () => {
  assert.deepEqual([...TASK_COLOR_TOKENS], ["red", "orange", "yellow", "green"]);
});

test("every token maps to a real 6-digit hex value", () => {
  for (const token of TASK_COLOR_TOKENS) {
    assert.match(
      TASK_COLOR_HEX[token],
      /^#[0-9a-f]{6}$/i,
      `${token} must map to a hex colour, got ${TASK_COLOR_HEX[token]}`,
    );
  }
});

test("no token maps to a bare Tailwind class name", () => {
  // Regression guard for the original bug: bg-red / bg-green are not real
  // Tailwind v4 utilities and rendered as invisible swatches.
  for (const token of TASK_COLOR_TOKENS) {
    assert.doesNotMatch(TASK_COLOR_HEX[token], /^bg-/);
  }
});

test("getTaskColorHex resolves known tokens and rejects everything else", () => {
  assert.equal(getTaskColorHex("green"), TASK_COLOR_HEX.green);
  assert.equal(getTaskColorHex(null), null);
  assert.equal(getTaskColorHex("purple"), null);
  assert.equal(getTaskColorHex(""), null);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/task-colors.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/task-colors.ts`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/task-colors.ts` (hex values copied verbatim from the existing `TaskRow.COLOR_MAP` so current tasks do not change appearance):

```ts
export const TASK_COLOR_TOKENS = ['red', 'orange', 'yellow', 'green'] as const

export type TaskColorToken = (typeof TASK_COLOR_TOKENS)[number]

export const TASK_COLOR_HEX: Record<TaskColorToken, string> = {
  red: '#e74c3c',
  orange: '#e67e22',
  yellow: '#eab308',
  green: '#22c55e',
}

export function getTaskColorHex(color: string | null): string | null {
  if (!color) return null
  if (!(color in TASK_COLOR_HEX)) return null
  return TASK_COLOR_HEX[color as TaskColorToken]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/task-colors.test.mjs`

Expected: `# pass 4`, `# fail 0`.

- [ ] **Step 5: Point TaskRow at the shared module**

In `src/components/TaskRow.tsx`, delete the local `COLOR_TOKENS`, `COLOR_MAP`, and `ColorToken` declarations (lines 12-20) and the local `getTaskColor` function (lines 51-54). Add this import next to the other `../lib/...` imports:

```ts
import { TASK_COLOR_TOKENS, TASK_COLOR_HEX, getTaskColorHex } from "../lib/task-colors";
import type { TaskColorToken } from "../lib/task-colors";
```

Then update the three usages inside the component:
- `const taskColor = getTaskColor(task.color);` → `const taskColor = getTaskColorHex(task.color);`
- `(color: ColorToken)` in `selectColor` → `(color: TaskColorToken)`
- `COLOR_TOKENS.map((color) => (` → `TASK_COLOR_TOKENS.map((color) => (`
- `style={{ backgroundColor: COLOR_MAP[color] }}` → `style={{ backgroundColor: TASK_COLOR_HEX[color] }}`

- [ ] **Step 6: Fix the QuickCaptureDialog swatches**

In `src/components/QuickCaptureDialog.tsx`, delete the local `COLORS` and `COLOR_CLASS` declarations (lines 19-26) and add:

```ts
import { TASK_COLOR_TOKENS, TASK_COLOR_HEX } from "../lib/task-colors";
```

Find the swatch button (around line 166, the element with `className={`h-9 w-9 rounded-full border ${COLOR_CLASS[token]} ...`}`). Replace the `COLORS.map(...)` iteration with `TASK_COLOR_TOKENS.map(...)`, remove `${COLOR_CLASS[token]}` from the `className`, and add an inline style so the colour actually renders:

```tsx
{TASK_COLOR_TOKENS.map((token) => (
  <button
    key={token}
    type="button"
    aria-label={`Set color ${token}`}
    aria-pressed={color === token}
    onClick={() => setColor(color === token ? null : token)}
    style={{ backgroundColor: TASK_COLOR_HEX[token] }}
    className={`h-9 w-9 rounded-full border transition ${
      color === token ? "border-ink scale-110" : "border-rule"
    }`}
  />
))}
```

Keep any surrounding wrapper markup (the grid container and its "clear colour" control, if present) exactly as it is — only the mapped buttons change.

- [ ] **Step 7: Verify types, lint, and the full suite**

Run: `npx tsc -b && npm run lint && npm test`

Expected: type-check clean (this catches any missed `COLOR_MAP` reference), lint no new errors, `# fail 0`.

- [ ] **Step 8: Manual browser verification**

1. `npm run dev`, sign in, press `Cmd/Ctrl+K`.
2. Expected: four **visibly coloured** circles — red, orange, yellow, green.
3. Click one; it should show a selected ring. Add the task and confirm the row is tinted with the same colour.
4. Open an existing task's ⋯ menu and confirm its colour swatches are unchanged from before this task.

- [ ] **Step 9: Commit**

```bash
git add src/lib/task-colors.ts tests/task-colors.test.mjs \
        src/components/TaskRow.tsx src/components/QuickCaptureDialog.tsx
git commit -m "fix: render Quick Capture colour swatches

bg-red/bg-orange/bg-yellow/bg-green are not Tailwind v4 utilities and were
absent from the built CSS, so the swatches were invisible. Extracts TaskRow's
hex map into src/lib/task-colors.ts and uses it in both surfaces."
```

---

## Task 5: Make the review streak real

`src/components/ReviewScreen.tsx:65` computes `reviews[reviews.length - 1].streak + 1`. `loadReviews` (`src/store.ts:238-245`) issues `select('*')` with **no `.order()`**, so row order is arbitrary. The code also never checks week adjacency and increments on every save — including re-saving the same week. The number only ever grows.

Correct definition: **1 for the week being reviewed, plus one for each consecutive preceding week that already has a review.**

**Files:**
- Create: `src/lib/streak.ts`
- Create: `tests/review-streak.test.mjs`
- Modify: `src/store.ts:238-245` (add deterministic ordering)
- Modify: `src/components/ReviewScreen.tsx:64-66`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `calculateReviewStreak(reviewedWeekIds: Iterable<string>, currentWeekStart: Date): number`

Week IDs are the `YYYY-Www` format produced by `getWeekId` in `src/dates.ts`. All expected values below were computed from the real `getWeekId` implementation and are exact.

- [ ] **Step 1: Write the failing test**

Create `tests/review-streak.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { calculateReviewStreak } from "../src/lib/streak.ts";
import { getWeekStart } from "../src/dates.ts";

// getWeekStart("2026-08-12") === 2026-08-10, whose week id is 2026-W33.
// Preceding weeks are 2026-W32, 2026-W31, 2026-W30.
const augWeek = getWeekStart(new Date("2026-08-12T12:00:00"));

test("a first-ever review is a streak of 1", () => {
  assert.equal(calculateReviewStreak([], augWeek), 1);
});

test("counts consecutive preceding weeks", () => {
  assert.equal(calculateReviewStreak(["2026-W32", "2026-W31"], augWeek), 3);
});

test("stops at the first gap", () => {
  // W32 missing breaks the chain even though W31 and W30 exist.
  assert.equal(calculateReviewStreak(["2026-W31", "2026-W30"], augWeek), 1);
});

test("is not inflated by the current week already being present", () => {
  // Re-saving the same week must not double-count it.
  assert.equal(calculateReviewStreak(["2026-W33", "2026-W32"], augWeek), 2);
});

test("ignores unordered input", () => {
  assert.equal(calculateReviewStreak(["2026-W31", "2026-W32"], augWeek), 3);
});

test("crosses the ISO year boundary", () => {
  // getWeekStart("2025-12-31") === 2025-12-29, whose ISO week id is 2026-W01.
  // The preceding week (2025-12-22) is 2025-W52.
  const newYearWeek = getWeekStart(new Date("2025-12-31T12:00:00"));
  assert.equal(calculateReviewStreak(["2025-W52", "2025-W51"], newYearWeek), 3);
});

test("accepts a Set as well as an array", () => {
  assert.equal(calculateReviewStreak(new Set(["2026-W32"]), augWeek), 2);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/review-streak.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/streak.ts`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/streak.ts`. Note the **explicit `.ts` extension** on the `../dates` import — required by Global Constraint 1, since this module is imported by a Node test.

```ts
import { subWeeks } from 'date-fns'
import { getWeekId } from '../dates.ts'

/**
 * Consecutive-week review streak, counting the week currently being reviewed.
 *
 * Returns 1 when no preceding week has a review, then adds one for each
 * unbroken preceding week found in `reviewedWeekIds`.
 */
export function calculateReviewStreak(
  reviewedWeekIds: Iterable<string>,
  currentWeekStart: Date,
): number {
  const reviewed = new Set(reviewedWeekIds)
  let streak = 1
  let cursor = subWeeks(currentWeekStart, 1)

  while (reviewed.has(getWeekId(cursor))) {
    streak += 1
    cursor = subWeeks(cursor, 1)
  }

  return streak
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/review-streak.test.mjs`

Expected: `# pass 7`, `# fail 0`.

- [ ] **Step 5: Make the reviews query deterministic**

In `src/store.ts`, the `loadReviews` action currently reads:

```ts
    const { data, error } = await supabase.from('week_reviews').select('*')
```

Replace that single line with:

```ts
    const { data, error } = await supabase
      .from('week_reviews')
      .select('*')
      .order('week_id', { ascending: true })
```

This does not affect the streak calculation (which is set-based) but removes the arbitrary ordering that made the old code non-deterministic, and makes `reviews` safe for any future index-based access.

- [ ] **Step 6: Use the real streak in ReviewScreen**

In `src/components/ReviewScreen.tsx`, add the import next to the other `../lib/...` import:

```ts
import { calculateReviewStreak } from "../lib/streak";
```

Replace the streak calculation (currently lines 64-66):

```ts
  const streak =
    reviews.length > 0 ? reviews[reviews.length - 1].streak + 1 : 1;
```

with:

```ts
  const streak = calculateReviewStreak(
    reviews.map((review) => review.week_id),
    weekStart,
  );
```

`weekStart` is already in scope (`const weekStart = useStore((s) => s.currentWeekStart)`).

- [ ] **Step 7: Verify types, lint, and the full suite**

Run: `npx tsc -b && npm run lint && npm test`

Expected: type-check clean, lint no new errors, `# fail 0`.

- [ ] **Step 8: Manual browser verification**

1. `npm run dev`, sign in, open **Review** on the current week. Note the 🔥 number.
2. Save the review, close it, and reopen the same week's review.
3. Expected: the number is **unchanged**. Before this fix it incremented on every save.
4. Navigate back several weeks and open Review. Expected: the streak reflects consecutive reviewed weeks, not the total review count.

- [ ] **Step 9: Commit**

```bash
git add src/lib/streak.ts tests/review-streak.test.mjs \
        src/store.ts src/components/ReviewScreen.tsx
git commit -m "fix: compute the review streak from consecutive weeks

The streak read reviews[length-1].streak+1 from an unordered query and
incremented on every save, so it only ever grew. Now counts unbroken
preceding week ids, and orders the week_reviews query deterministically."
```

---

## Task 6: Stop the weekly review from destroying saved text

Two defects in the same save path:

1. `src/components/ReviewScreen.tsx:61` is `useState("")` and is never seeded from the saved review. Reopening a reviewed week shows an empty field, and saving overwrites the stored reflection with `""`. `existingReview` is already computed on line 39 but is only read for `intention`.
2. `handleSave` sets `created_at: now` unconditionally. `persistReviewChange` spreads the whole review into its **update** payload (`store.ts:463`), so re-saving overwrites the original creation timestamp.

**Files:**
- Modify: `src/components/ReviewScreen.tsx:61,67-80`

**Interfaces:**
- Consumes: `calculateReviewStreak` wiring from Task 5 (same file, same function — apply Task 5 first to avoid a conflicting edit).
- Produces: nothing consumed by later tasks.

This task changes only React component state, which Global Constraint 3 excludes from Node testing. It is verified by type-check plus explicit manual steps.

- [ ] **Step 1: Reproduce the data loss in the browser**

1. `npm run dev`, sign in, open **Review**.
2. Type `first reflection` into the Reflection field and click **Done**.
3. Reopen **Review** for the same week.
4. Expected (the bug): the field is **empty**. Click **Done** again, reopen — the original text is gone for good.

Record that you reproduced it before changing code.

- [ ] **Step 2: Seed the reflection from the saved review**

In `src/components/ReviewScreen.tsx`, replace:

```ts
  const [reflection, setReflection] = useState("");
```

with:

```ts
  const [reflection, setReflection] = useState(existingReview?.reflection ?? "");
```

`existingReview` is declared on line 39, above this line, so it is in scope. `ReviewScreen` is conditionally mounted by `App.tsx` (`{showReview && <ReviewScreen ... />}`), so it remounts on every open and the initializer runs each time.

- [ ] **Step 3: Preserve the original creation timestamp**

In the same file, inside `handleSave`, replace:

```ts
      created_at: now,
```

with:

```ts
      created_at: existingReview?.created_at ?? now,
```

- [ ] **Step 4: Verify types, lint, and the full suite**

Run: `npx tsc -b && npm run lint && npm test`

Expected: type-check clean, lint no new errors, `# fail 0`.

- [ ] **Step 5: Manual browser verification of the fix**

1. Open **Review**, type `second reflection`, click **Done**.
2. Reopen **Review** for the same week. Expected: the field shows `second reflection`.
3. Append ` — edited`, click **Done**, reopen. Expected: `second reflection — edited`.
4. Navigate to a different week and open **Review**. Expected: an empty field, not the other week's text.

- [ ] **Step 6: Commit**

```bash
git add src/components/ReviewScreen.tsx
git commit -m "fix: preserve weekly reflection text and created_at on re-save

Reflection state started empty on every mount, so reopening a reviewed week
and saving wiped the stored text. handleSave also reset created_at, which
persistReviewChange spreads into its UPDATE payload."
```

---

## Task 7: Implement drag-to-reorder

The README promises "drag to reorder". It does not work. `TaskRow` registers only a draggable (`useDraggable`, line 245); the sole droppables are the columns themselves (`DayColumn.tsx:24`, `BacklogPanel.tsx:9`). So `over.data.current?.order` in `App.tsx:156` is **always `undefined`**, and the fallback on lines 160-165 assigns `max(order) + 1` — **every drop appends to the bottom of the target column.**

`@dnd-kit/sortable@10.0.0` is already installed and imported nowhere. `src/lib/fractional-index.ts` already contains a correct `fractionalIndex(before, after)` helper and is imported nowhere — it was written for exactly this and never wired up.

This is the largest task. The insertion arithmetic goes into a tested pure module first; the dnd-kit wiring follows and is verified manually.

**Files:**
- Create: `src/lib/reorder.ts`
- Create: `tests/reorder.test.mjs`
- Modify: `src/components/TaskRow.tsx:3,244-252`
- Modify: `src/components/DayColumn.tsx`
- Modify: `src/components/BacklogPanel.tsx`
- Modify: `src/App.tsx:2,150-168`
- Modify: `README.md`

**Interfaces:**
- Consumes: `fractionalIndex` from the existing `src/lib/fractional-index.ts`.
- Produces:
  - `computeOrderAtIndex(orders: number[], targetIndex: number): number`
  - `computeDropOrder(targetColumnTasks: OrderedTask[], activeId: string, overTaskId: string | null): number`
  - `type OrderedTask = { id: string; order: number }`

- [ ] **Step 1: Write the failing test**

Create `tests/reorder.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { computeOrderAtIndex, computeDropOrder } from "../src/lib/reorder.ts";

test("computeOrderAtIndex: empty column starts at 1", () => {
  assert.equal(computeOrderAtIndex([], 0), 1);
});

test("computeOrderAtIndex: dropping at the top goes before the first order", () => {
  assert.equal(computeOrderAtIndex([10, 20, 30], 0), 9);
});

test("computeOrderAtIndex: dropping at the end goes after the last order", () => {
  assert.equal(computeOrderAtIndex([10, 20, 30], 3), 31);
});

test("computeOrderAtIndex: dropping in the middle splits the neighbours", () => {
  assert.equal(computeOrderAtIndex([10, 20, 30], 1), 15);
  assert.equal(computeOrderAtIndex([10, 20, 30], 2), 25);
});

test("computeOrderAtIndex: out-of-range indices clamp instead of returning NaN", () => {
  assert.equal(computeOrderAtIndex([10, 20, 30], 99), 31);
  assert.equal(computeOrderAtIndex([10, 20, 30], -5), 9);
});

const column = [
  { id: "a", order: 10 },
  { id: "b", order: 20 },
  { id: "c", order: 30 },
];

test("computeDropOrder: dragging upward lands above the hovered task", () => {
  // c (last) dropped onto b → between a and b
  assert.equal(computeDropOrder(column, "c", "b"), 15);
});

test("computeDropOrder: dragging downward lands below the hovered task", () => {
  // a (first) dropped onto b → between b and c
  assert.equal(computeDropOrder(column, "a", "b"), 25);
});

test("computeDropOrder: dropping on the column background appends to the end", () => {
  assert.equal(computeDropOrder(column, "a", null), 31);
});

test("computeDropOrder: moving into a different column inserts above the hovered task", () => {
  // "z" is not currently in this column, so there is no drag direction to infer.
  assert.equal(computeDropOrder(column, "z", "b"), 15);
});

test("computeDropOrder: dropping into an empty column yields 1", () => {
  assert.equal(computeDropOrder([], "a", null), 1);
});

test("computeDropOrder: an unknown hovered id falls back to appending", () => {
  assert.equal(computeDropOrder(column, "a", "nope"), 31);
});

test("computeDropOrder: a self-drop falls through to the append path", () => {
  // The active task is removed from the list before the lookup, so hovering
  // yourself behaves like an unknown id. App.tsx guards this case before
  // calling, so it never reaches the store — this pins the contract only.
  assert.equal(computeDropOrder(column, "b", "b"), 31);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/reorder.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/reorder.ts`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/reorder.ts`. Note the explicit `.ts` extension per Global Constraint 1.

```ts
import { fractionalIndex } from './fractional-index.ts'

export type OrderedTask = { id: string; order: number }

/**
 * Fractional order value for inserting at `targetIndex` within `orders`
 * (ascending, with the dragged task already removed).
 */
export function computeOrderAtIndex(orders: number[], targetIndex: number): number {
  if (orders.length === 0) return 1

  const clamped = Math.max(0, Math.min(targetIndex, orders.length))
  const before = clamped === 0 ? null : orders[clamped - 1]
  const after = clamped === orders.length ? null : orders[clamped]

  return fractionalIndex(before, after)
}

/**
 * Order value for dropping `activeId` onto `overTaskId` inside a column.
 *
 * `targetColumnTasks` must be the destination column's tasks sorted ascending by
 * order, including the dragged task when it started in this column. Pass
 * `overTaskId: null` when the drop landed on the column background.
 *
 * When dragging downward within the same column the task settles *below* the
 * hovered row, matching how a vertical sortable list reads; in every other case
 * it settles above.
 */
export function computeDropOrder(
  targetColumnTasks: OrderedTask[],
  activeId: string,
  overTaskId: string | null,
): number {
  const without = targetColumnTasks.filter((task) => task.id !== activeId)
  const orders = without.map((task) => task.order)

  if (overTaskId === null) return computeOrderAtIndex(orders, orders.length)

  const overIndex = without.findIndex((task) => task.id === overTaskId)
  if (overIndex === -1) return computeOrderAtIndex(orders, orders.length)

  const activeIndexBefore = targetColumnTasks.findIndex((task) => task.id === activeId)
  const overIndexBefore = targetColumnTasks.findIndex((task) => task.id === overTaskId)
  const draggingDown = activeIndexBefore !== -1 && activeIndexBefore < overIndexBefore

  return computeOrderAtIndex(orders, draggingDown ? overIndex + 1 : overIndex)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/reorder.test.mjs`

Expected: `# pass 12`, `# fail 0`.

- [ ] **Step 5: Commit the tested core before touching the UI**

```bash
git add src/lib/reorder.ts tests/reorder.test.mjs
git commit -m "feat: add tested fractional-index reorder helpers

Wires up the previously dead src/lib/fractional-index.ts behind two pure
functions for drag-and-drop insertion points."
```

- [ ] **Step 6: Convert TaskRow from draggable to sortable**

In `src/components/TaskRow.tsx`, replace the import on line 3:

```ts
import { useDraggable } from "@dnd-kit/core";
```

with:

```ts
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
```

Then replace the `useDraggable` call and the style derivation (lines 244-252):

```ts
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: { date: task.date, order: task.order },
    });

  const rowStyle = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;
```

with:

```ts
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: task.id,
      data: { type: "task", date: task.date, order: task.order },
    });

  const rowStyle = {
    transform: CSS.Translate.toString(transform),
    transition,
  };
```

`@dnd-kit/utilities` is already a direct dependency (`^3.2.2`). `useSortable` registers the row as both a draggable **and** a droppable, which is what makes `over` resolve to a task instead of always a column.

- [ ] **Step 7: Wrap the DayColumn task list in a SortableContext**

In `src/components/DayColumn.tsx`, add the imports:

```ts
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
```

Then wrap the rendered rows. Replace:

```tsx
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
```

with:

```tsx
        <SortableContext
          id={`day-${dateKey}`}
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </SortableContext>
```

- [ ] **Step 8: Wrap the BacklogPanel task list in a SortableContext**

In `src/components/BacklogPanel.tsx`, add the same import:

```ts
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
```

Replace:

```tsx
          {filteredTasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
```

with:

```tsx
          <SortableContext
            id="backlog"
            items={filteredTasks.map((task) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            {filteredTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </SortableContext>
```

- [ ] **Step 9: Rewrite handleDragEnd to use the tested helper**

In `src/App.tsx`, add to the `@dnd-kit/core` import on line 2 the `closestCenter` collision detector, so the import list becomes:

```ts
import { closestCenter, DndContext, DragOverlay, PointerSensor, TouchSensor, useDndContext, useSensor, useSensors } from '@dnd-kit/core'
```

Add the helper import next to the other `./lib/...` imports:

```ts
import { computeDropOrder } from './lib/reorder'
```

Replace the whole `handleDragEnd` function (lines 150-168):

```tsx
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const tasks = useStore.getState().tasks
    const activeTask = tasks.find((t) => t.id === taskId)
    if (!activeTask) return

    const overData = over.data.current
    const overIsTask = overData?.type === 'task'

    // Both a sortable row and a column droppable carry `date` in their data,
    // so this resolves the destination column either way.
    const targetDate = overData?.date as string | null | undefined
    if (targetDate === undefined) return

    const overTaskId = overIsTask ? (over.id as string) : null
    if (overTaskId === taskId && activeTask.date === targetDate) return

    const targetColumnTasks = tasks
      .filter((t) => t.date === targetDate)
      .sort((a, b) => a.order - b.order)

    const newOrder = computeDropOrder(targetColumnTasks, taskId, overTaskId)
    if (activeTask.date === targetDate && activeTask.order === newOrder) return

    moveTask(taskId, targetDate, newOrder)
  }
```

Then add the collision detector to the `DndContext` element (around line 190):

```tsx
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
```

`closestCenter` is required — the default `rectIntersection` behaves poorly for vertical lists where rows overlap the column droppable beneath them.

- [ ] **Step 10: Verify types, lint, and the full suite**

Run: `npx tsc -b && npm run lint && npm test`

Expected: type-check clean, lint no new errors, `# fail 0`.

- [ ] **Step 11: Manual browser verification — this is the real gate**

`npm run dev`, sign in, and create a column with at least four tasks.

1. **Reorder down:** drag the first task onto the third. Expected: it settles **below** the third. Reload the page — the new order persists.
2. **Reorder up:** drag the last task onto the first. Expected: it settles **above** the first. Reload — persists.
3. **Cross-column:** drag a task onto a specific row in another day. Expected: it lands at that position, not at the bottom.
4. **Empty column:** drag a task into an empty day. Expected: it lands there and persists.
5. **Backlog:** repeat steps 1 and 3 inside the Backlog panel, then drag from Backlog to a day and back.
6. **Touch:** using device emulation, long-press (250 ms) then drag. Expected: reordering works; a plain scroll does not start a drag.
7. **Regression — row interactions still work:** click a title to edit, click the checkbox, and open the ⋯ menu. None of these should trigger a drag.
8. **Regression — keyboard:** focus a task and press `Shift+ArrowRight`. Expected: it still moves to the next day.

- [ ] **Step 12: Fix the stale README section**

In `README.md`, the "Project structure" block lists hooks that do not exist. Replace the `hooks/` line:

```
├── hooks/           # React hooks (useTodayFocus, useRollover, useHideOnScroll)
```

with the real contents of `src/hooks/`:

```
├── hooks/           # React hooks (useRollover, useTheme, useHideOnScroll,
│                    #              useFocusTrap, useGlobalShortcuts)
```

The "drag to reorder" claim in the opening paragraph is now accurate and should stay.

- [ ] **Step 13: Commit**

```bash
git add src/App.tsx src/components/TaskRow.tsx src/components/DayColumn.tsx \
        src/components/BacklogPanel.tsx README.md
git commit -m "feat: implement drag-to-reorder within and across columns

Task rows were draggables only, so 'over' always resolved to a column and
every drop appended to the bottom. Converts rows to useSortable inside a
SortableContext per column and derives a fractional order via computeDropOrder."
```

---

## Final Verification

- [ ] **Run the complete gate**

Run: `npm run test:all`

Expected: lint completes, `tsc -b` reports no errors, `# fail 0`.

- [ ] **Confirm a clean production build**

Run: `npx vite build`

Expected: build succeeds and the PWA plugin emits `dist/sw.js`.

- [ ] **Confirm the working tree is clean**

Run: `git status --short`

Expected: empty.

---

## Out of Scope

Deliberately excluded from this plan — these came out of the same review and are worth a follow-up plan, but each has a wider blast radius than the fixes above:

- **Data layer:** unbounded `loadTasks` / `loadEvents` (PostgREST row cap), optimistic reverts clobbering concurrent edits via stale full-array snapshots, no user-visible error surface on mutation failure, no offline write queue.
- **Time awareness:** no midnight/date tick so `currentWeekStart` goes stale in a long-lived tab; `startWeeklyHabitScheduler` generating the week *after* the one it fires on (verified: `getNextMondayMidnight(2026-08-10T00:00)` → `2026-08-17`); habit generation racing `loadTasks` on sign-in.
- **Refactors:** splitting the 859-line `store.ts`; hoisting the per-task settings dialog out of `TaskRow` (every visible task currently mounts its own portaled dialog); removing the orphaned legacy `task.recurrence` system that no UI writes to; the `z-index: 9999` paper-grain overlay covering modals; `window.confirm` on delete and the absence of undo.
