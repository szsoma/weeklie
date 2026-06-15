# TaskRow Tooltip Redesign

**Date**: 2026-06-15
**Scope**: `src/components/TaskRow.tsx`

## Summary

Remove the inline color dot and X delete button from TaskRow to save horizontal space. Replace with a vertical kebab (⋮) trigger that opens a glass morphism tooltip containing color picker dots and delete action.

## Row Layout

```
[checkbox] [title — text-sm, truncate] [⋮]
```

- Title font: `text-sm` (0.875rem), single line with `truncate`
- Remove: color dot button, X delete button
- Add: vertical kebab trigger on the right

## Tooltip

- **Trigger**: click on ⋮
- **Position**: below/adjacent to the row
- **Style**: glass morphism — `backdrop-blur-lg bg-white/10 border border-white/20 rounded-xl shadow-xl`
- **Colors**: red (#e74c3c), orange (#e67e22), yellow (#eab308), green (#22c55e) — as clickable dots
- **Delete**: trash icon with label, below a divider
- **Dismiss**: click outside, Esc, or after selecting an option

## Color Behavior

- Selecting a color: `updateTask(id, { color })` — row gets `bg-<color>-500/15 rounded-lg`
- Clicking the already-selected color: clears it (`color: null`)
- Keep existing COLOR_MAP values for red/orange/yellow/green; blue/purple removed from UI but kept in COLOR_MAP for backward compat

## Color constants change

Reduce from 6 to 4 colors (red, orange, yellow, green) as the user specified.
