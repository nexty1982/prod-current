# Theme token pattern (approved 2026-06-08)

Use MUI semantic palette tokens instead of hardcoded hex in layout and chrome components.

## Backgrounds

| Surface | Token |
|---------|-------|
| App shell / page canvas | `theme.palette.background.default` |
| Sidebar, cards, HUD panels | `theme.palette.background.paper` |

**Do not** inline `#0f1117`, `#1a1a2e`, or `#f8f8fb` in layout components — those values live in `DefaultColors.tsx` and liturgical theme overrides.

## Text & borders

| Use | Token |
|-----|-------|
| Primary copy | `theme.palette.text.primary` |
| Secondary copy | `theme.palette.text.secondary` |
| Dividers / subtle borders | `theme.palette.divider` |
| Accent borders (HUD, alerts) | `theme.palette.primary.main` / `theme.palette.error.main` |

## Styled components

```tsx
const Shell = styled('div')(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
}));
```

For `sx` callbacks, prefer `(theme) => theme.palette.*` over mode ternaries when a semantic token exists.

## Responsive floating UI

Floating panels (e.g. Admin HUD):

- `maxWidth: calc(100vw - margin)`
- Collapse fixed widths below `sm` breakpoint
- Clamp drag position with `clampHudPosition()` in `adminHudTypes.ts`

## Liturgical themes

Liturgical palette variants extend `DefaultColors` — never flatten them to a single dark hex. If a component needs a one-off accent, use existing palette keys (`primary`, `secondary`, `warning`) or CSS variables from the active theme.
