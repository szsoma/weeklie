# UI Refinement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize all padding, spacing, and gutters across 8 components to a consistent 4px-based scale, align horizontal edges in the main app view, and tighten vertical rhythm throughout.

**Architecture:** CSS-class-only changes across 8 files. No logic, no new components, no new files. Each task modifies distinct files so tasks are independent and can be executed in any order.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-06-15-weeklie-ui-refinement-design.md`

---

### Task 1: WeekHeader spacing

**Files:**
- Modify: `src/components/WeekHeader.tsx`

All changes are in the `className` strings of the `WeekHeader` component.

- [ ] **Step 1: Apply horizontal padding, vertical padding, and label gap**

Three changes in the header element and date label:

**Change A — header element (line ~111):**
```
OLD: className="flex items-center justify-between px-7 md:px-10 py-6 border-b-2 border-rule"
NEW: className="flex items-center justify-between px-6 md:px-10 py-4 border-b-2 border-rule"
```

**Change B — "Week" label span (line ~113):**
```
OLD: className="font-mono text-[12px] uppercase text-faint leading-none mb-1.5"
NEW: className="font-mono text-[12px] uppercase text-faint leading-none mb-1"
```

**Change C — right group button gap (line ~121):**
```
OLD: className="flex items-center gap-2.5"
NEW: className="flex items-center gap-2"
```

**Change D — desktop action wrapper gap (line ~141, inside the `hidden md:flex` div):**
```
OLD: className="hidden md:flex items-center gap-2.5"
NEW: className="hidden md:flex items-center gap-2"
```

- [ ] **Step 2: Verify**

Run TypeScript check — no errors expected since only class strings changed:

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/WeekHeader.tsx
git commit -m "refine: normalize WeekHeader spacing to 4px scale"
```

---

### Task 2: DayColumn spacing

**Files:**
- Modify: `src/components/DayColumn.tsx`

- [ ] **Step 1: Align horizontal padding and tighten header**

**Change A — day header bar (line ~42):**
```
OLD: className="sticky top-0 z-10 font-bold md:static px-5 md:px-6 pt-5 pb-4 flex items-baseline justify-between gap-2 border-b border-rule"
NEW: className="sticky top-0 z-10 font-bold md:static px-6 md:px-10 py-3 flex items-baseline justify-between gap-2 border-b border-rule"
```

Note: `pt-5 pb-4` becomes `py-3` (12px). Removes the asymmetric top/bottom padding and aligns mobile horizontal padding to 24px, desktop to 40px.

**Change B — task list area (line ~62):**
```
OLD: className="flex-1 min-h-0 overflow-y-auto px-5 md:px-6 pb-5"
NEW: className="flex-1 min-h-0 overflow-y-auto px-6 md:px-10 pb-5"
```

Note: `pb-5` stays (20px bottom breathing room is on-scale).

**Change C — empty slot placeholders (line ~71):**
```
OLD: className="flex items-start gap-3.5 py-3.5 pr-1.5 border-b border-rule"
NEW: className="flex items-start gap-3 py-3 pr-1.5 border-b border-rule"
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/DayColumn.tsx
git commit -m "refine: normalize DayColumn spacing to 4px scale"
```

---

### Task 3: BacklogPanel spacing

**Files:**
- Modify: `src/components/BacklogPanel.tsx`

- [ ] **Step 1: Align horizontal padding and tighten vertical**

**Change A — header bar (line ~25):**
```
OLD: className="flex items-baseline gap-2 px-7 md:px-10 py-4 border-b border-rule"
NEW: className="flex items-baseline gap-2 px-6 md:px-10 py-3 border-b border-rule"
```

**Change B — content area (line ~33):**
```
OLD: className="flex-1 min-h-0 overflow-y-auto px-7 md:px-10 py-4"
NEW: className="flex-1 min-h-0 overflow-y-auto px-6 md:px-10 py-3"
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/BacklogPanel.tsx
git commit -m "refine: normalize BacklogPanel spacing to 4px scale"
```

---

### Task 4: TaskRow + NewTaskLine spacing

**Files:**
- Modify: `src/components/TaskRow.tsx`
- Modify: `src/components/NewTaskLine.tsx`

- [ ] **Step 1: TaskRow vertical padding**

In `TaskRow.tsx`, find the outer `div` className on the task row (line ~91):

```
OLD: className={`group relative flex items-start gap-2 py-3.5 text-lg leading-snug cursor-grab ${
NEW: className={`group relative flex items-start gap-2 py-3 text-lg leading-snug cursor-grab ${
```

Note: `gap-2` already on the 4px scale, no change needed. Only `py-3.5` → `py-3`.

- [ ] **Step 2: NewTaskLine spacing**

In `NewTaskLine.tsx`, find the outer `div` className (line ~32):

```
OLD: className={`flex items-start gap-3.5 py-3.5 pr-1.5 mt-0.5 rounded transition-colors ${
NEW: className={`flex items-start gap-3 py-3 pr-1.5 mt-0.5 rounded transition-colors ${
```

Note: `mt-0.5` (2px) is an optical micro-value, preserved. `pr-1.5` (6px) is a counterbalance to the row's visual weight, preserved as optical tweak.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/TaskRow.tsx src/components/NewTaskLine.tsx
git commit -m "refine: normalize TaskRow and NewTaskLine spacing to 4px scale"
```

---

### Task 5: ReviewScreen spacing

**Files:**
- Modify: `src/components/ReviewScreen.tsx`

- [ ] **Step 1: Tighten outer and inner container padding**

**Change A — outer scroll container (line ~76):**
```
OLD: className="fixed inset-0 bg-bg z-50 overflow-y-auto p-8"
NEW: className="fixed inset-0 bg-bg z-50 overflow-y-auto p-6 md:p-8"
```

**Change B — inner card (line ~77):**
```
OLD: className="bg-amber-50 max-w-lg mx-auto px-8 py-12"
NEW: className="bg-amber-50 max-w-lg mx-auto px-6 py-8"
```

- [ ] **Step 2: Tighten section gaps**

**Change C — streak text (line ~97):**
```
OLD: className="text-sm text-muted mb-6 font-mono"
NEW: className="text-sm text-muted mb-4 font-mono"
```

**Change D — stats section (line ~102):**
```
OLD: className="flex items-center gap-6 mb-8"
NEW: className="flex items-center gap-6 mb-6"
```

**Change E — completed list section (line ~113):**
```
OLD: className="mb-8"
NEW: className="mb-6"
```

**Change F — slipped section (inside the conditional, find `mb-8`):**
```
OLD: className="mb-8"
NEW: className="mb-6"
```

**Change G — reflection section (line ~168):**
```
OLD: className="mb-8"
NEW: className="mb-6"
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ReviewScreen.tsx
git commit -m "refine: normalize ReviewScreen spacing to 4px scale"
```

---

### Task 6: FloatingNav + Toast spacing

**Files:**
- Modify: `src/components/FloatingNav.tsx`
- Modify: `src/components/Toast.tsx`

- [ ] **Step 1: FloatingNav pill padding**

In `FloatingNav.tsx`, find the pill bar inner div (line ~94):

```
OLD: className="flex items-center justify-between px-5 py-3"
NEW: className="flex items-center justify-between px-4 py-3"
```

Note: `py-3` (12px) is already on-scale, only horizontal padding changes.

- [ ] **Step 2: Toast padding**

In `Toast.tsx`, find the outer div className (line ~23):

```
OLD: className={`fixed bottom-4 left-1/2 -translate-x-1/2 bg-ink text-bg px-5 py-3 rounded-md shadow-lg z-50 flex items-center gap-3 transition-opacity ${visible ? 'opacity-100' : 'opacity-0'}`}
NEW: className={`fixed bottom-4 left-1/2 -translate-x-1/2 bg-ink text-bg px-4 py-2 rounded-md shadow-lg z-50 flex items-center gap-3 transition-opacity ${visible ? 'opacity-100' : 'opacity-0'}`}
```

Note: `gap-3` (12px) and `bottom-4` (16px) are already on-scale.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/FloatingNav.tsx src/components/Toast.tsx
git commit -m "refine: normalize FloatingNav and Toast spacing to 4px scale"
```

---

### Task 7: Final integration verification

- [ ] **Step 1: Verify all changes compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Start dev server and spot-check**

```bash
npm run dev
```

Check these specific alignments in the browser:

| Viewport | Check |
|----------|-------|
| Mobile 375px | WeekHeader left edge, DayColumn left edge, BacklogPanel left edge all at 24px from screen edge |
| Desktop 1024px | WeekHeader, DayColumn, BacklogPanel all at 40px from screen edge |
| Mobile | Task rows are ~2px denser, header is visibly tighter |
| Desktop | Review screen card has comfortable but not excessive padding |
| Both | Toast is compact, FloatingNav pill is slightly narrower |

- [ ] **Step 3: Commit any final tweaks**

```bash
git add -A
git commit -m "chore: final integration verification for UI refinement"
```
