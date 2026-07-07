# Theme Switcher Design

## Goal

Add a theme selector to the floating nav menu so the user can choose System, Light, or Dark mode.

## Scope

In scope:

- A three-option theme control in `FloatingNav`.
- Persisting the selected mode locally.
- Applying the selected mode to the existing CSS token system.
- Respecting system color preference when System is selected.

Out of scope:

- New color palettes.
- Account-synced theme settings.
- A separate settings screen.

## Behavior

The floating nav menu gains a compact Theme row with a segmented control:

- System
- Light
- Dark

Selection behavior:

- `System`: remove any explicit theme override and let `prefers-color-scheme` decide.
- `Light`: force the light token set.
- `Dark`: force the dark token set.

The selected value is saved in `localStorage` under `weeklie.theme`. If the value is missing or invalid, the app behaves as System.

## Architecture

Add a small theme hook:

```ts
type ThemeMode = 'system' | 'light' | 'dark';
```

The hook:

- reads `weeklie.theme` on mount,
- exposes `{ theme, setTheme }`,
- writes changes to `localStorage`,
- applies the selected mode to `document.documentElement.dataset.theme`,
- removes the dataset override when `theme === 'system'`.

The hook does not need global store state because theme preference is local UI preference and not part of task data.

## CSS

Keep the existing CSS variables and color utilities.

Current behavior remains the fallback:

- `:root` defines light colors.
- `@media (prefers-color-scheme: dark)` defines dark colors.

Add explicit overrides:

- `:root[data-theme="light"]` uses the light token set.
- `:root[data-theme="dark"]` uses the dark token set.

This keeps the current visual design intact and only adds user control over which token set is active.

## UI

The control lives inside the existing floating nav menu, near the top under About.

It should be compact and scannable:

- label: `Theme`
- three equal buttons in one segmented group
- active option uses the current ink/background contrast
- inactive options stay subdued but readable
- keyboard focus remains visible

The menu should not close when changing theme. Theme changes should be visible immediately.

## Testing

Add source-level tests for:

- `FloatingNav` includes System, Light, and Dark theme options.
- CSS includes explicit `[data-theme="light"]` and `[data-theme="dark"]` overrides.
- Theme persistence uses the `weeklie.theme` key.

Manual verification:

1. Open the nav menu.
2. Switch to Dark and confirm the app changes immediately.
3. Switch to Light and confirm the app changes immediately.
4. Switch to System and confirm the explicit override is removed.
5. Reload and confirm the saved choice persists for Light and Dark.
