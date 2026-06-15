# Weeklie Header Fixes — Design Spec

**Date:** 2026-06-15
**Scope:** `WeekHeader.tsx`, `SiteHeader.tsx`

## Problem

1. **WeekHeader desktop layout**: date sits between two chevrons in the center; the chevrons should be on the right with the action buttons, and the date alone on the left.
2. **SiteHeader mobile height**: too tall on small screens — excessive vertical padding.
3. **WeekHeader mobile**: layout is broken, and the three action buttons (Hide Done, Today, Review) take up too much horizontal space as individual icon buttons. They should collapse into a single dropdown.

## Design

### 1. Desktop WeekHeader reorder (`WeekHeader.tsx`)

Current JSX structure:
```
header
  left-group: [< prev] [Week label + date] [next >]
  right-group: [Hide Done] [Today] [Review]
```

Target JSX structure:
```
header
  left: [Week label + date]
  right-group: [< prev] [next >] [Hide Done] [Today] [Review]
```

**Implementation:** move the two chevron `<button>` elements from the left `div` into the right `div`, placing them before the existing action buttons. The date label `div` moves to be the sole left-aligned child. No CSS changes needed.

### 2. SiteHeader mobile height (`SiteHeader.tsx`)

Change the padding on the header container:
- `py-4` → `py-2.5 md:py-4`

This trims ~12px of vertical space on mobile while keeping desktop identical. No other changes.

### 3. Mobile action dropdown (`WeekHeader.tsx`)

On viewports `< 768px`, the three action buttons (Hide Done, Today, Review) are replaced by a single "More" button that opens a popover menu.

**State:** `const [menuOpen, setMenuOpen] = useState(false)`

**More button:**
- Renders a vertical ellipsis icon (⋮ — three dots vertical)
- Same size and styling as the current mobile icon buttons (`w-10 h-10`)
- `onClick` toggles `menuOpen`
- `aria-expanded` and `aria-label="More actions"`

**Popover menu:**
- Renders conditionally when `menuOpen` is true
- Positioned `absolute right-0 top-full mt-1` relative to a wrapper `div`
- Styled: `bg-surface border border-rule-strong rounded-xl shadow-lg`, min-width ~180px
- Contains three buttons, each with icon + label:
  1. Hide Done / Show Done (with EyeIcon, reflects current `hideDone` state)
  2. Today (CalendarIcon)
  3. Review (ReviewIcon)
- Each item: `flex items-center gap-3 px-4 py-3 font-mono text-[14px]`, full width
- Selecting an item calls the same handler as the current button + closes the menu

**Backdrop:**
- A fixed `inset-0 z-30` div rendered behind the popover
- `onClick` dismisses the menu
- No visible styling (transparent)

**Desktop:** the existing three buttons render as today — no change except the chevrons are now prepended (see Fix 1).

**Chevrons on mobile:** remain visible outside the dropdown, flanking the date label. The current mobile layout (chevrons + compact date) stays unchanged.

### Z-index considerations

- Popover: `z-40` (above backdrop, below FloatingNav's z-50)
- Backdrop: `z-30`
- No conflict with FloatingNav (z-50), paper grain (z-9999, pointer-events: none), or ReviewScreen (rendered outside the header entirely)

## Non-goals

- WeekGrid, FloatingNav, DayColumn, BacklogPanel — unchanged
- Scroll-hide animation on WeekHeader — preserved as-is
- Desktop layout beyond the chevron/date swap — unchanged
- All existing icon SVG components — reused, not rewritten
