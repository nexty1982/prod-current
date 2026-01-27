---
task: 144 - mobile_components_refactor_and_sidebar_structure
assignee: cursor
priority: critical
description: |
  This task involves three high-impact enhancements to OrthodoxMetrics:

  1. Make the entire site fully responsive and mobile-optimized across all components and views.
  2. Add a new sidebar menu group titled "Site Components" with Modernize and Raydar sections.
  3. Prepare two liturgical calendar variations: one using the Modernize Calendar and one using Raydar's Calendar styling.

---

## ✅ Part 1: Mobile-Friendly Site Enhancements

**Goal:** Make OrthodoxMetrics.com fully usable on mobile devices, including phones and tablets.

**Scope:**
- All public and admin pages (frontend only)
- All core layouts (headers, footers, sidebars, modals, dialogs, forms, grids, calendar views, etc.)

**Steps:**
- Audit the current layout in Chrome and Firefox DevTools responsive view.
- Fix layout shifts, overflows, and non-scalable sections.
- Implement a mobile sidebar drawer for navigation (hamburger menu).
- Ensure form fields scale and stay touch-friendly.
- Tables (AG Grid or others): enable horizontal scroll or use mobile card layout if necessary.
- Charts: ensure proper responsive container behavior.
- Font sizes: Use `clamp()` or media queries to ensure readability on small screens.
- Touch areas: ensure minimum 48x48px target size.

**Output:**
- The entire site renders beautifully on iPhone, Android, iPad, and other small screens.
- Confirm via screenshots.
- Add mobile support audit log as `MOBILE_AUDIT_LOG.md`

---

## 📦 Part 2: Site Components Menu in Sidebar

**Goal:** Organize all Raydar and Modernize components into a visual, easily navigable section in the sidebar.

**Steps:**
1. In the vertical sidebar menu:
   - Add a new group called `Site Components`
     - Under it, two collapsible items:
       - `Raydar`
         - `Components`
           - Dynamically list all extracted Raydar components
       - `Modernize`
         - `Components`
           - Dynamically list all extracted Modernize components

2. Each listed component should link to its live demo page inside `/sandbox/component-preview/:componentName`
3. Use icons consistent with UI/UX for menu items

**Purpose:**
This allows quick component lookup and enables referencing components by name:
> "Replace current table with Raydar `LiturgicalTable`"

---

## 📅 Part 3: Liturgical Calendar Component Refactor

**Goal:** Replace the current liturgical calendar implementation with improved visual versions based on Raydar and Modernize designs.

**Steps:**
- Identify or replicate the Calendar component from the Modernize template.
- Do the same for the Raydar calendar (or use Raydar-styled MUI Calendar if no direct component exists).
- Create two new calendar components under:
  - `@om/components/features/liturgical-calendar-modern.tsx`
  - `@om/components/features/liturgical-calendar-raydar.tsx`

**Requirements:**
- Use liturgical season color indicators
- Show feast days and fast days visually (colored badges or gradients)
- Responsive layout, scrollable weeks or monthly grid
- Integrate with existing calendar logic already implemented in OrthodoxMetrics

**Output:**
- Both calendar versions visible under `/sandbox/component-preview`
- Each wired up to demo liturgical data
- Sidebar entries created under:
  - Site Components → Modernize → `Liturgical Calendar`
  - Site Components → Raydar → `Liturgical Calendar`

---

## Final Deliverables:
- Full site mobile-ready
- Sidebar updated with new component navigation
- Modernize and Raydar calendar components implemented and previewable
- Changes committed and documented in respective README and MIGRATION_LOG

## Estimated Time: 6–8 hours

