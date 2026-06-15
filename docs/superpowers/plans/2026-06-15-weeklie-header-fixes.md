# Weeklie Header Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix WeekHeader desktop layout (date left, chevrons right), reduce SiteHeader mobile height, and collapse WeekHeader action buttons into a dropdown on mobile.

**Architecture:** All changes are contained within two existing components (`WeekHeader.tsx`, `SiteHeader.tsx`). No new files, no new dependencies. The mobile dropdown uses a local `useState` toggle with a positioned popover and transparent backdrop — same pattern already used by `FloatingNav`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-06-15-weeklie-header-fixes-design.md`

---

### Task 1: Reduce SiteHeader mobile height

**Files:**
- Modify: `src/components/SiteHeader.tsx`

- [ ] **Step 1: Tighten mobile padding and font size**

The current working tree has `py-2 md:py-4` on the inner header div. Reduce mobile padding further and shrink the wordmark font on small screens.

Find this line in `SiteHeader.tsx` (the inner `<div>` inside `<header>`):

```tsx
<div className="flex items-center justify-between px-7 md:px-10 py-2 md:py-4 bg-ink/70 backdrop-blur-md backdrop-saturate-150 md:bg-ink">
```

Replace it with:

```tsx
<div className="flex items-center justify-between px-4 md:px-10 py-2 md:py-4 bg-ink/70 backdrop-blur-md backdrop-saturate-150 md:bg-ink">
```

Then find the wordmark `<a>` tag:

```tsx
<a
  href="#"
  className="inline-flex items-center gap-1 font-mono font-semibold text-[18px] tracking-tight text-bg whitespace-nowrap shrink-0 hover:opacity-80 transition"
>
```

Replace the `text-[18px]` with responsive sizing:

```tsx
<a
  href="#"
  className="inline-flex items-center gap-1 font-mono font-semibold text-[16px] md:text-[18px] tracking-tight text-bg whitespace-nowrap shrink-0 hover:opacity-80 transition"
>
```

And the checkmark SVG inside that `<a>` — shrink it slightly on mobile too:

```tsx
<svg
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="3"
  strokeLinecap="round"
  strokeLinejoin="round"
  className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]"
  aria-hidden
>
```

Also reduce the hamburger button's negative margin to match the tighter horizontal padding:

```tsx
className="md:hidden grid place-items-center w-10 h-10 -mr-2 rounded-md text-bg hover:bg-bg/10 active:scale-95 transition"
```

Change `-mr-2` to `-mr-1`:

```tsx
className="md:hidden grid place-items-center w-10 h-10 -mr-1 rounded-md text-bg hover:bg-bg/10 active:scale-95 transition"
```

- [ ] **Step 2: Verify the change**

Run the dev server and check on a mobile viewport (≤375px wide) that the SiteHeader is visibly shorter.

```bash
npm run dev
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SiteHeader.tsx
git commit -m "fix: reduce SiteHeader height on mobile"
```

---

### Task 2: Reorder desktop WeekHeader (date left, chevrons right)

**Files:**
- Modify: `src/components/WeekHeader.tsx`

- [ ] **Step 1: Move chevrons from left group to right group**

The current JSX structure is:

```
header
  left-div:   [< prev button] [date label] [next > button]
  right-div:  [Hide Done] [Today] [Review]
```

Restructure to:

```
header
  date label (standalone, left-aligned)
  right-div:  [< prev] [next >] [Hide Done] [Today] [Review]
```

**Current code** (lines ~118–149 in the working tree):

```tsx
<div className="flex items-center gap-4 md:gap-6">
  <button
    onClick={() => setCurrentWeekStart(prevWeek(currentWeekStart))}
    aria-label="Previous week"
    className="grid place-items-center w-10 h-10 -ml-2 rounded-md text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-95 transition"
  >
    <Chevron direction="left" />
  </button>

  <div className="flex flex-col min-w-0 items-center text-center md:w-[280px]">
    <span className="font-mono text-[12px] uppercase text-faint leading-none mb-1.5">
      Week
    </span>
    <h1 className="font-mono font-semibold text-[22px] md:text-[20px] tracking-tight leading-none whitespace-nowrap">
      {formatWeekLabel(currentWeekStart)}
    </h1>
  </div>

  <button
    onClick={() => setCurrentWeekStart(nextWeek(currentWeekStart))}
    aria-label="Next week"
    className="grid place-items-center w-10 h-10 -mr-2 rounded-md text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-95 transition"
  >
    <Chevron direction="right" />
  </button>
</div>
```

**Replace the entire block above** with the date label alone. The parent header's `justify-between` handles positioning — on mobile the date stays centered between the left edge and the right group (chevrons + dropdown), on desktop it sits flush left:

```tsx
<div className="flex flex-col min-w-0 items-center text-center md:items-start md:text-left md:w-[280px]">
  <span className="font-mono text-[12px] uppercase text-faint leading-none mb-1.5">
    Week
  </span>
  <h1 className="font-mono font-semibold text-[22px] md:text-[20px] tracking-tight leading-none whitespace-nowrap">
    {formatWeekLabel(currentWeekStart)}
  </h1>
</div>
```

**Now add the chevrons to the right group.** Find the right group div (currently around line 151 in the working tree):

```tsx
<div className="flex items-center gap-2.5">
```

Insert the two chevron buttons before the Hide Done button. The right group becomes:

```tsx
<div className="flex items-center gap-2.5">
  {/* Previous week */}
  <button
    onClick={() => setCurrentWeekStart(prevWeek(currentWeekStart))}
    aria-label="Previous week"
    className="grid place-items-center w-10 h-10 rounded-md text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-95 transition"
  >
    <Chevron direction="left" />
  </button>

  {/* Next week */}
  <button
    onClick={() => setCurrentWeekStart(nextWeek(currentWeekStart))}
    aria-label="Next week"
    className="grid place-items-center w-10 h-10 rounded-md text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-95 transition"
  >
    <Chevron direction="right" />
  </button>

  {/* Hide done — icon on mobile, text on desktop; done-count badge when hidden */}
  <button ... >
```

Note: removed `-ml-2` and `-mr-2` from the chevron buttons since they're no longer at the edges of the group — they sit in the middle of the button row.

- [ ] **Step 2: Verify desktop layout**

Run the dev server, view at ≥768px width. Confirm:
- Date label is on the left
- Chevrons + action buttons are on the right, in order: `< > [Hide Done] [Today] [Review]`

```bash
npm run dev
```

- [ ] **Step 3: Commit**

```bash
git add src/components/WeekHeader.tsx
git commit -m "refactor: reorder WeekHeader — date left, chevrons right"
```

---

### Task 3: Add mobile action dropdown to WeekHeader

**Files:**
- Modify: `src/components/WeekHeader.tsx`

- [ ] **Step 1: Add `useState` import and MoreMenu icon component**

The file already imports `useState` (added in a prior working-tree change). Verify the import line at the top reads:

```tsx
import { useEffect, useState } from "react";
```

If it's missing `useState`, add it now.

Add a new `MoreIcon` component after the existing icon components (after `ReviewIcon`, before `type Props`):

```tsx
function MoreIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[20px] h-[20px]"
      fill="currentColor"
      stroke="none"
      aria-hidden
    >
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}
```

- [ ] **Step 2: Add `menuOpen` state**

Inside the `WeekHeader` function, after the `goToToday` line, add:

```tsx
const [menuOpen, setMenuOpen] = useState(false);
```

- [ ] **Step 3: Replace the mobile action buttons with dropdown**

The current right group renders three buttons unconditionally (Hide Done, Today, Review). We need to:
- On **desktop** (`md:` and up): keep all five buttons (chevrons + three actions) visible — this is already covered by the JSX from Task 2 reorder
- On **mobile** (`<md`): hide the three action buttons, show a single "More" button that opens a popover

**Replace the three action buttons** (Hide Done, Today, Review) and wrap them in conditional rendering.

Find the three action buttons in the right group (starting around the Hide Done button after the two chevrons). Replace the entire block of three buttons with:

```tsx
{/* Desktop action buttons — visible md and up */}
<div className="hidden md:flex items-center gap-2.5">
  {/* Hide done */}
  <button
    onClick={() => setHideDone(!hideDone)}
    aria-pressed={hideDone}
    aria-label={
      hideDone
        ? doneCount
          ? `Show ${doneCount} done task${doneCount === 1 ? "" : "s"}`
          : "Show done tasks"
        : "Hide done tasks"
    }
    className={`relative h-10 font-mono text-[14px] uppercase rounded-md border transition active:scale-[0.98] ${
      hideDone
        ? "bg-ink text-bg border-ink"
        : "border-rule-strong text-muted hover:text-ink hover:bg-ink/[0.06]"
    }`}
  >
    <span className="hidden md:inline px-4">
      {hideDone
        ? `Show done${doneCount ? ` ${doneCount}` : ""}`
        : "Hide done"}
    </span>
  </button>

  {/* Today */}
  <button
    onClick={goToToday}
    aria-label="Jump to today"
    className="h-10 w-auto font-mono text-[14px] uppercase rounded-md border border-rule-strong text-ink hover:bg-ink/[0.06] active:scale-[0.98] transition"
  >
    <span className="hidden md:inline px-4">Today</span>
  </button>

  {/* Review */}
  <button
    onClick={onShowReview}
    aria-label="Open weekly review"
    className="h-10 w-auto font-mono text-[14px] uppercase rounded-md border border-rule-strong text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-[0.98] transition"
  >
    <span className="hidden md:inline px-4">Review</span>
  </button>
</div>

{/* Mobile more button + dropdown — visible below md */}
<div className="relative md:hidden">
  <button
    onClick={() => setMenuOpen((v) => !v)}
    aria-expanded={menuOpen}
    aria-label="More actions"
    className="grid place-items-center w-10 h-10 rounded-md text-muted hover:text-ink hover:bg-ink/[0.06] active:scale-95 transition"
  >
    <MoreIcon />
  </button>

  {/* Backdrop */}
  {menuOpen && (
    <div
      className="fixed inset-0 z-30"
      onClick={() => setMenuOpen(false)}
      aria-hidden
    />
  )}

  {/* Popover menu */}
  {menuOpen && (
    <div className="absolute right-0 top-full mt-1 z-40 w-48 bg-surface border border-rule-strong rounded-xl shadow-lg overflow-hidden">
      {/* Hide Done / Show Done */}
      <button
        onClick={() => {
          setHideDone(!hideDone);
          setMenuOpen(false);
        }}
        className="flex items-center gap-3 w-full px-4 py-3 font-mono text-[14px] text-ink hover:bg-ink/[0.06] transition"
      >
        <EyeIcon hidden={hideDone} />
        <span>
          {hideDone
            ? `Show done${doneCount ? ` (${doneCount})` : ""}`
            : "Hide done"}
        </span>
      </button>

      {/* Today */}
      <button
        onClick={() => {
          goToToday();
          setMenuOpen(false);
        }}
        className="flex items-center gap-3 w-full px-4 py-3 font-mono text-[14px] text-ink hover:bg-ink/[0.06] transition"
      >
        <CalendarIcon />
        <span>Today</span>
      </button>

      {/* Review */}
      <button
        onClick={() => {
          onShowReview?.();
          setMenuOpen(false);
        }}
        className="flex items-center gap-3 w-full px-4 py-3 font-mono text-[14px] text-ink hover:bg-ink/[0.06] transition"
      >
        <ReviewIcon />
        <span>Review</span>
      </button>
    </div>
  )}
</div>
```

Note: `onShowReview?.()` uses optional chaining to handle the case where `onShowReview` is undefined.

- [ ] **Step 4: Handle click-outside for the popover on desktop too**

The current `menuOpen` backdrop handles mobile tap-outside. On desktop, if the viewport is resized below 768px while the menu is open, the same backdrop works. No additional handler needed — the fixed backdrop covers the full viewport.

- [ ] **Step 5: Verify mobile dropdown**

Run the dev server, view at <768px width:
1. Confirm the three action buttons are replaced by a single `⋮` button
2. Tap `⋮` — the popover opens with three items (Hide Done, Today, Review)
3. Tap each item — it performs the action and closes the menu
4. Tap outside the popover — it closes
5. The chevrons remain visible flanking the date label

```bash
npm run dev
```

- [ ] **Step 6: Verify desktop is unchanged**

Resize to ≥768px. All five buttons (two chevrons + three actions) should be visible in a row on the right, with the date label alone on the left.

- [ ] **Step 7: Commit**

```bash
git add src/components/WeekHeader.tsx
git commit -m "feat: collapse WeekHeader actions into dropdown on mobile"
```

---

### Task 4: Final integration check

- [ ] **Step 1: Verify all changes together**

Run the dev server and check all three viewports:

| Viewport | SiteHeader | WeekHeader |
|----------|-----------|------------|
| Mobile (<768px) | Compact height, ~36px total | Date centered, chevrons visible, `⋮` button opens dropdown |
| Tablet (768–1024px) | Desktop height | Date left, all buttons right |
| Desktop (>1024px) | Desktop height | Date left, all buttons right |

Also verify:
- FloatingNav pill doesn't overlap the dropdown (z-50 vs z-40)
- ReviewScreen overlay still works when triggered from the dropdown
- Scroll-hide animation on both headers still works

```bash
npm run dev
```

- [ ] **Step 2: Commit any final tweaks**

```bash
git add -A
git commit -m "chore: final integration tweaks for header fixes"
```
