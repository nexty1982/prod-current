---

task: 142 - extract\_component\_library
assignee: cursor
priority: high
description: |
Refactor the current OrthodoxMetrics codebase to fully extract all existing components for easier access, reuse, and reorganization. Additionally, repeat this process for the Raydar template source. The goal is to centralize all UI/UX elements into a single, logically structured component library to streamline future use across the platform.

**Scope:**

1. OrthodoxMetrics main frontend (dev and prod folders)
2. Raydar template (provided via upload)

**Steps:**

- Identify and extract all components from:
  - `components/`
  - `context/`
  - `hooks/`
  - `layouts/`
  - Any stray inline components embedded in page files
- Organize these components into a new `@om/components` directory with subfolders:
  - `/ui` for buttons, inputs, overlays, etc.
  - `/layout` for structural elements (headers, sidebars)
  - `/features` for complex or domain-specific UI (e.g., Calendar, Liturgical Widgets)
  - `/charts` for any MUI Charts integrations or AG Grid configurations
  - `/data` for reusable table or form schemas
  - `/legacy` for anything deprecated but still required
- Rename components and ensure exports are named and documented (JSDoc or TSdoc) for auto-import support.
- Ensure no logic is lost from `context/` or `hooks/`; rewire any removed references from original app pages to the new imports.
- Replace all absolute import references in pages to use `@om/components/...` alias.

**Notes:**

- Use TypeScript conventions where possible.
- Where Raydar and OrthodoxMetrics components overlap, prioritize OrthodoxMetrics version unless Raydar is more visually appealing or performant.
- Log all renamed or merged components in `MIGRATION_LOG.md`.

**Output:**

- New directory structure under `dev/front-end/@om/components`
- Refactored imports across pages
- Standalone `README.md` in `@om/components` describing organization and usage
- `MIGRATION_LOG.md` with all renames, merges, and deprecated components

**Dependencies:**

- Raydar zip already uploaded
- OrthodoxMetrics dev frontend path: `/var/www/orthodmetrics/dev/front-end`

**Time Estimate:** 3–5 hours

**Phase 2 (to be queued after this):**
Create a searchable Storybook-like viewer inside `/sandbox/component-preview` that dynamically loads and renders components from `@om/components` with description, props, sample usage, and live demo.

## status: open

evaluate which existing components from OrthodoxMetrics, Raydar, or Modernize can be used as replacements for current components based on clarity, maintainability, and visual quality. Define 'better' using criteria such as accessibility, responsiveness, aesthetic consistency, and reduced code complexity.

lastly The current Calendar component lacks visual clarity and does not resemble a traditional calendar layout. It should be redesigned to more accurately reflect a calendar grid with clearly defined days, weeks, and months. Improve usability, apply a more modern aesthetic, and ensure the design aligns with the OrthodoxMetrics public-facing visual standards.

the raydar is in the tasks/node directory
