# Weeklie UI Refinement — Design Spec

**Date:** 2026-06-15
**Scope:** All UI components — padding, spacing, alignment consistency

## Problem

The app uses ad-hoc spacing values (`py-3.5`, `gap-2.5`, `px-7`, `gap-3.5`) that don't align to any consistent scale. Horizontal padding varies between components (WeekHeader 28px vs DayColumn 20px on mobile), causing visual misalignment where stacked content edges don't line up. Vertical padding is generous across the board, wasting screen real estate especially on mobile.

## Design

### 1. Spacing Scale

Replace all ad-hoc values with a consistent 4px-based scale:

| Token | Pixels | Tailwind | Replaces |
|-------|--------|----------|----------|
| 1 | 4px | `p-1`, `gap-1`, `mb-1` | — |
| 2 | 8px | `p-2`, `gap-2` | `gap-2.5` (10px) |
| 3 | 12px | `p-3`, `gap-3`, `py-3` | `py-3.5` (14px), `gap-3.5` (14px) |
| 4 | 16px | `p-4`, `py-4` | — |
| 5 | 20px | `p-5`, `px-5`, `pt-5` | — |
| 6 | 24px | `p-6`, `px-6`, `py-6` | `px-7` (28px) |
| 8 | 32px | `p-8` | — |
| 10 | 40px | `px-10` | — |

**Optical micro-values preserved:** `mt-[3px]`, `mt-[1px]`, `tracking-tight`, `tracking-[-0.02em]` — these are precise alignment hacks for icons relative to text baselines, not spacing system values.

### 2. Horizontal Alignment

Every component that stacks vertically in the main app view uses the same horizontal gutters so content edges align:

| Component | Mobile | Desktop |
|-----------|--------|---------|
| WeekHeader | `px-6` (24px) | `px-10` (40px) |
| DayColumn (header + content) | `px-6` (24px) | `px-10` (40px) |
| BacklogPanel (header + content) | `px-6` (24px) | `px-10` (40px) |

SiteHeader is excluded — it's a top navigation bar, not part of the content column.

### 3. Vertical Rhythm — Main App

**WeekHeader:**
- `py-6` (24px) → `py-4` (16px)
- `mb-1.5` (6px) → `mb-1` (4px) — "Week" label closer to date
- Button gap: `gap-2.5` → `gap-2` (10px → 8px)

**DayColumn header (sticky day bar):**
- `pt-5 pb-4` (20px/16px) → `py-3` (12px)

**TaskRow:**
- Vertical padding: `py-3.5` → `py-3` (14px → 12px)
- Element gap: stays `gap-2` (already on scale)

**NewTaskLine:**
- `gap-3.5 py-3.5 pr-1.5` → `gap-3 py-3 pr-1.5`
- `mt-0.5` preserved (optical)

**Empty slot placeholders:**
- `gap-3.5 py-3.5 pr-1.5` → `gap-3 py-3 pr-1.5`

**BacklogPanel header:**
- `py-4` → `py-3` (16px → 12px)

**BacklogPanel content:**
- `py-4` → `py-3` (16px → 12px)

### 4. Non-Main Views

**ReviewScreen:**
- Outer container: `p-8` → `p-6 md:p-8` (32px→24px mobile)
- Inner card: `px-8 py-12` → `px-6 py-8` (32px/48px → 24px/32px)
- Section gaps: `mb-8` → `mb-6`, `mb-6` → `mb-4`
- Stats section `mb-8` → `mb-6`
- Done button unchanged

**AuthScreen:**
- No changes — already compact and well-proportioned

**SiteHeader:**
- No changes — already refined in prior work

**FloatingNav pill:**
- `px-5` → `px-4` (20px → 16px horizontal)
- `py-3` stays (12px)

**Toast:**
- `px-5 py-3` → `px-4 py-2` (20px/12px → 16px/8px)
- `bottom-4` stays

### 5. Button Gap Normalization

Wherever action buttons sit in a flex row with `gap-2.5` (10px), change to `gap-2` (8px):
- WeekHeader right group
- WeekHeader desktop action wrapper (already has its own `gap-2.5` in the wrapper div)

## Non-goals

- Colors, typography, border radii — unchanged
- Component structure or logic — unchanged
- Functional behavior — unchanged
- FloatingNav menu panel padding — unchanged (not in the content column)
- Task row element sizes (dot, checkbox, delete button) — unchanged
