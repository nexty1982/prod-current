# Feature Lifecycle (SDLC)

Every user-facing feature in OrthodoxMetrics follows a five-stage lifecycle. The single source of truth for all features and their current stage is:

```
front-end/src/config/featureRegistry.ts
```

## Lifecycle Stages

| Stage | Label | Banner Color | Visibility | Route Prefix |
|-------|-------|-------------|------------|--------------|
| **1** | Prototype | Red (`error`) | super_admin only (`latest`) | `/devel-tools/` |
| **2** | Development | Red (`error`) | super_admin only (`latest`) | `/devel-tools/` |
| **3** | Review | Orange (`warning`) | super_admin only (`latest`) | `/devel/` or `/apps/` |
| **4** | Stabilizing | Orange (`warning`) | super_admin only (`latest`) | `/apps/` |
| **5** | Production | Green (`success`) or none | All authenticated users (`stable`) | `/apps/` or `/admin/` |

Priority **0** is a graduated production feature — no banner is shown at all.

## Stage Definitions

### 1 — Prototype

Feature concept being explored. May be non-functional, have placeholder UI, or incomplete backend. No data persistence guarantees.

- **Entry**: New feature directory created under `front-end/src/features/`
- **Exit**: Core UI renders, basic navigation works, feature purpose is clear

### 2 — Development

Feature is actively being built. Has functional UI and at least partial backend integration. May have known bugs.

- **Entry**: Passed prototype review
- **Exit**: All primary user flows work end-to-end, API endpoints return real data

### 3 — Review

Feature is functionally complete and ready for review. May have edge cases or polish issues.

- **Entry**: All user flows work, no known critical bugs
- **Exit**: Reviewed by stakeholder, feedback addressed

### 4 — Stabilizing

Feature is approved but being hardened. Route may move from `/devel-tools/` to `/apps/`. Focus on error handling, edge cases, performance.

- **Entry**: Stakeholder approved
- **Exit**: No known bugs, error boundaries in place, works across roles

### 5 — Production

Feature is stable and visible to all users. Stage 5 features show a green "production-ready" banner. To hide the banner entirely, set the explicit `priority={0}` override in Router.tsx (fully graduated).

- **Entry**: Passed stabilization
- **Exit**: N/A (or banner removed by setting priority to 0 in the route)

## How To Register a New Feature

Add an entry to the `FEATURE_REGISTRY` array in `front-end/src/config/featureRegistry.ts`:

```ts
{ id: 'my-feature', name: 'My Feature', stage: 1, route: '/devel-tools/my-feature', since: '2026-02-15' },
```

Then wrap the route in `Router.tsx` with `<EnvironmentAwarePage featureId="my-feature">`. The banner priority is auto-derived from the registry — no need to pass `priority` explicitly unless you want to override.

## How To Promote a Feature

Change the `stage` value in `featureRegistry.ts`. That's it. The `EnvironmentContext` and `EnvironmentAwarePage` components derive all visibility and banner behavior from the registry.

```ts
// Before (stage 2 = Development)
{ id: 'my-feature', name: 'My Feature', stage: 2, ... },

// After (stage 3 = Review)
{ id: 'my-feature', name: 'My Feature', stage: 3, since: '2026-03-01', ... },
```

When promoting to stage 5, consider moving the route from `/devel-tools/` or `/devel/` to `/apps/` or `/admin/`.

## How It Works

### EnvironmentContext.tsx

- `isFeatureEnabled(id)`: Checks the registry. Stage 5 = always enabled. Stage 1-4 = enabled only in `latest` environment (super_admin).
- `shouldShowPriority(p)`: Priority 1-4 requires `latest` access, 5 and 0 are always shown.

### EnvironmentAwarePage.tsx

- If `featureId` is provided but `priority` is not, priority is auto-derived from the registry via `featurePriority(id)`.
- Banner labels use stage names: Prototype, Development, Review, Stabilizing, Production Ready.

### Environment Determination

- `super_admin` users get `latest` environment → see all features, see dev banners.
- All other roles get `stable` environment → only see stage 5 features, no banners.

## Git Branch Naming

```
feature/<color>/<date>/<feature-id>     # New feature work
fix/<color>/<date>/<description>         # Bug fixes
```

Example: `feature/yellow/2026-02-11/search-weights-config`

## Architecture Diagram

```
featureRegistry.ts          (source of truth)
        |
        +---> EnvironmentContext.tsx   (isFeatureEnabled, shouldShowPriority)
        |
        +---> EnvironmentAwarePage.tsx (auto-derive priority, banner labels)
        |
        +---> Router.tsx              (EnvironmentAwarePage wraps gated routes)
```
