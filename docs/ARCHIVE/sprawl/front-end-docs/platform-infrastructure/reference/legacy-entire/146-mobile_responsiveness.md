---
task: 146 - mobile_responsiveness
assignee: cursor
priority: high
description: |
  Audit and update the entire OrthodoxMetrics frontend to ensure full mobile device support. The site must look clean, professional, and function perfectly on mobile devices (e.g., iPhone, Android, tablets, and foldables).

## Scope:

- OrthodoxMetrics public website
- Admin and dashboard pages
- Record pages (Baptism, Marriage, Funeral, etc.)
- Component Library under `@om/components`
- Sandbox viewer (`/sandbox/component-preview`)
- Landing pages and login/auth screens
- OMAI and Big Book UI
- Modal windows, navbars, dropdowns, grids, tables, calendars, and tooltips

## Requirements:

- Use responsive layout techniques (Tailwind breakpoints, `flex`, `grid`, `min/max-w`, etc.)
- Add mobile-first logic to all components and layouts
- Ensure buttons, text, and controls are accessible and tappable at mobile resolutions
- Avoid horizontal scrolling unless explicitly required (e.g., data tables)
- Collapse sidebars into drawers on smaller screens
- Ensure all modals are fully readable and scrollable on mobile
- Detect and adjust layout for foldable devices and safe areas (e.g., using `env(safe-area-inset-*)`)
- Add mobile-responsive viewport `<meta>` tags to `index.html` if not already present

## Output:

- Refactored responsive layout for all key views and pages
- Tailwind classes optimized for mobile layouts (`sm:`, `md:`, `lg:`, `xl:`)
- Updated components that previously broke layout on mobile
- Optional: add `useDeviceDetect()` hook to selectively tweak behavior on mobile if needed

## Testing:

- Confirm visual and interaction quality on:
  - iPhone SE, 13 Pro, and Fold 6 (simulated)
  - Android Pixel 7
  - iPad (portrait + landscape)
- Validate performance and UI on dev URL via Chrome DevTools device emulation

## Path:

OrthodoxMetrics dev frontend: `/var/www/orthodmetrics/dev/front-end`

## Notes:

- This task is high priority. User reports poor mobile experience site-wide.
- Take visual inspiration from mobile-optimized dashboards (e.g., Notion, Linear, GitHub mobile).
- User expects a **perfectly tuned mobile UX**, not just minor adjustments.

## status: open
