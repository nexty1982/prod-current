# OMAI Migration Plan — Frontend Component Migration

**Date**: 2026-03-24
**Status**: Planning (pre-implementation)

---

## 1. Current-State Audit

### OrthodoxMetrics Frontend (`/var/www/orthodoxmetrics/prod/front-end/src/`)

| Area | Implementation | Key Files |
|------|---------------|-----------|
| **Router** | React Router 6, `createBrowserRouter`, lazy-loaded via `Loadable()` wrapper, 200+ routes | `routes/Router.tsx` |
| **Layout** | `FullLayout` shell → Sidebar + Header + Container + Outlet. Collapsible sidebar, horizontal mode option | `layouts/full/FullLayout.tsx` |
| **Auth** | Session-based + JWT fallback. `AuthContext` with login/logout/refresh. Token in localStorage, session cookie from server | `context/AuthContext.tsx`, `shared/lib/authService.ts` |
| **API Client** | Singleton `ApiClient` on Axios. Auto-prefixes `/api`, attaches Bearer token, 401 refresh+retry, file uploads | `api/utils/axiosInstance.ts` |
| **State** | Context + Hooks (no Redux). 13+ contexts for auth, theme, notifications, websocket, church, etc. | `context/*.tsx` |
| **Theme** | MUI `createTheme` with 6+ presets, light/dark mode, auto-dark after 6 PM. `CustomizerContext` persists to localStorage | `theme/*.tsx`, `context/CustomizerContext.tsx` |
| **Tables** | AG Grid (enterprise) for data-heavy views. React Table demos exist. Custom `useTableStyleStore` | AG Grid in `features/records-centralized/` |
| **Charts** | ApexCharts (`react-apexcharts`) for dashboards. Recharts in analytics/admin views | `components/dashboards/`, `features/admin/AnalyticsDashboard.tsx` |
| **Roles** | Hierarchy: super_admin(7) > admin(6) > church_admin(5) > priest(4) > deacon(3) > editor(2) > viewer(1) > guest(0) | `utils/roles.ts` |
| **Shared UI** | AppCard, DashboardCard, BlankCard, PageContainer, Spinner, error boundaries, toast via NotificationContext | `components/shared/`, `context/NotificationContext.tsx` |
| **Feature Flags** | 5-stage lifecycle in `featureRegistry.ts`. `<EnvironmentAwarePage>` wrapper controls visibility by role | `config/featureRegistry.ts` |

### OMAI Berry Frontend (`/var/www/omai/berry/src/`)

| Area | Implementation | Key Files |
|------|---------------|-----------|
| **Router** | React Router 7.5.2, `createBrowserRouter`, lazy-loaded via `Loadable()`. Base path `/omai` | `routes/index.tsx`, `routes/MainRoutes.tsx` |
| **Layout** | Berry `MainLayout` → AppBar(88px) + Sidebar drawer + Breadcrumbs + Outlet + Footer. Mini-drawer toggle | `layout/MainLayout/index.tsx` |
| **Auth** | `JWTContext` — stateless JWT. Token in localStorage (`serviceToken`). AuthBridge for SSO from OM. AuthGuard/GuestGuard | `contexts/JWTContext.tsx`, `views/pages/authentication/AuthBridge.tsx` |
| **API Client** | Basic Axios instance, auto-attaches Bearer from localStorage. 401 → redirect to `/login`. SWR for data fetching | `utils/axios.ts` |
| **State** | Redux Toolkit + redux-persist. Slices: snackbar, kanban, customer, contact, product, chat, calendar, mail, user, cart. Account reducer for auth | `store/index.ts`, `store/slices/` |
| **Theme** | MUI 7 `createTheme`, 6 color presets, light/dark, configurable font/border-radius/direction. Persisted via `ConfigProvider` | `themes/palette.tsx`, `themes/typography.tsx` |
| **Tables** | MUI DataGrid (in `forms/data-grid/`), standard MUI Tables. No AG Grid | `views/forms/tables/`, `views/forms/data-grid/` |
| **Charts** | ApexCharts via `react-apexcharts` | `views/forms/chart/` |
| **Menu** | `menu-items/*.ts` defines nav tree. SWR-backed state via `api/menu.ts` | `menu-items/index.ts` |
| **UI Components** | Cards (FloatingCart, SideIconCard, RevenueCard, ReportCard), Snackbar, AnimateButton, Breadcrumbs, Transitions | `ui-component/` |
| **Icons** | Tabler Icons (`@tabler/icons-react`) | Throughout |
| **Current Pages** | Mostly stock Berry template: dashboards, e-commerce, CRM, kanban, forms, UI demos. No ops content yet | `views/` |

### Key Differences

| Concern | OM Frontend | OMAI Berry |
|---------|------------|------------|
| React Router | v6 | v7.5.2 |
| MUI | v5 (likely) | v7.0.2 |
| State mgmt | Context API | Redux Toolkit |
| Auth storage | `access_token` + session cookie | `serviceToken` (JWT only) |
| Icons | Mixed (MUI icons + custom) | Tabler Icons |
| Base path | `/` | `/omai` |
| Data fetching | Direct axios | SWR + axios |

---

## 2. Recommended Migration Order

### Phase 1A — Infrastructure (must-do before any pages)

| # | Component | Action | Why First |
|---|-----------|--------|-----------|
| 1 | **API client hardening** | Enhance `utils/axios.ts` to support `/api` prefix, better error objects, retry logic | Every migrated page needs reliable API calls |
| 2 | **Role/permission helpers** | Create `utils/roles.ts` in OMAI (copy+adapt from OM `utils/roles.ts`) | Every ops page gates on super_admin/admin |
| 3 | **Auth context enrichment** | Extend `JWTContext` to expose `user.role`, add `hasRole()`, `hasPermission()` checks | Pages need role checks inline |
| 4 | **Route guard enhancement** | Upgrade AuthGuard to support `requiredRole` prop (like OM's `ProtectedRoute`) | Ops pages must restrict to admin+ |
| 5 | **Ops page shell** | Create a reusable `OpsPageContainer` component (title, breadcrumb, loading, error states) | Consistent page structure across all ops views |
| 6 | **Status/badge components** | Create `StatusChip`, `PriorityChip`, `LevelBadge` (log level, job status, etc.) | Used by logs, monitoring, OM Daily |
| 7 | **Snackbar/toast integration** | Verify Notistack setup works for success/error feedback | Every form/action page needs feedback |

### Phase 1B — First Ops Pages (in priority order)

| # | Page | Source | Why This Order |
|---|------|--------|----------------|
| 1 | **Platform Status** | `features/devel-tools/platform-status/PlatformStatusPage.tsx` | High-value, self-contained, validates API client |
| 2 | **Build Info** | `features/devel-tools/build-info/BuildInfoPage.tsx` | Small, validates infrastructure, immediately useful |
| 3 | **Log Search** | `features/admin/dashboard/LogSearch.tsx` | Core ops capability — most-used admin tool |
| 4 | **Session Pulse** | `features/admin/components/SessionPulse.tsx` | Real-time monitoring, small component |
| 5 | **Service Monitor** | `features/system/settings/ServiceManagement.tsx` | Service health visibility |

### Phase 1C — Work Tracking & Deployment Visibility

| # | Page | Source |
|---|------|--------|
| 6 | **OM Daily Items** | `features/admin/om-daily/pages/OMDailyItemsPage.tsx` + hooks/components |
| 7 | **OM Daily Board** | `features/admin/om-daily/pages/OMDailyBoardPage.tsx` |
| 8 | **Change Sets Dashboard** | `features/devel-tools/change-sets/ChangeSetsDashboard.tsx` |
| 9 | **Ops Reports Hub** | `features/admin/ops/OpsReportsHub.tsx` |

### Phase 2 — Extended Admin (future)

| Page | Source |
|------|--------|
| User Management | `features/admin/admin/UserManagement.tsx` |
| Activity Logs | `features/admin/admin/ActivityLogs.tsx` |
| SDLC Dashboard | `features/admin/control-panel/SDLCPage.tsx` |
| OCR Activity Monitor | `features/admin/OcrActivityMonitor.tsx` |
| API Explorer | `features/devel-tools/api-explorer/ApiExplorerPage.tsx` |
| SSL Certificate Manager | `features/admin/control-panel/system-server/SSLCertificatePage.tsx` |

---

## 3. Dependency & Risk List

### Hard Dependencies (must resolve)

| Risk | Detail | Mitigation |
|------|--------|------------|
| **MUI version gap** | OM uses MUI v5, Berry uses MUI v7. Component API changes (Grid2, sx prop changes, theme structure) | Rewrite components against MUI 7 API, don't copy MUI v5 patterns |
| **State model mismatch** | OM uses Context, Berry uses Redux. Migrated components reference `useAuth()` from different contexts | Adapt imports to use Berry's `useAuth` hook which wraps JWTContext. Add missing fields (role helpers) to Berry's auth |
| **API client differences** | OM's `apiClient` auto-prefixes `/api`. Berry's `axiosServices` uses base URL from env | Enhance Berry's axios to auto-prefix `/api` OR create a thin `omApi` wrapper |
| **Icon library** | OM uses MUI icons, Berry uses Tabler icons | Replace icon imports during migration. Map MUI icons → Tabler equivalents |
| **AG Grid** | OM uses AG Grid Enterprise for data tables. Berry has MUI DataGrid | Use MUI DataGrid for OMAI. Rewrite table configs. Simpler for ops use cases |
| **Recharts vs ApexCharts** | OM analytics uses Recharts, Berry ships ApexCharts | Standardize on ApexCharts in OMAI (already a dependency). Rewrite chart components |

### Moderate Risks

| Risk | Detail | Mitigation |
|------|--------|------------|
| **Auth token format** | OM stores as `access_token`, Berry stores as `serviceToken`. AuthBridge SSO flow must work | AuthBridge already handles this — verify token field names align |
| **Session cookie dependency** | Some OM backend endpoints may check session cookie in addition to JWT | Test each migrated endpoint with JWT-only auth. Fix backend if needed |
| **CustomizerContext** | OM components reference `CustomizerContext` for theme state (dark mode, card shadows) | Berry uses `ConfigProvider` / `useConfig`. Replace references |
| **Feature registry** | OM wraps pages in `<EnvironmentAwarePage>`. Not needed in OMAI (all ops = production) | Strip `EnvironmentAwarePage` wrappers. Ops pages are always visible to authorized users |
| **Polling patterns** | SessionPulse polls every 10s, PlatformStatus polls health endpoints | Verify OMAI's proxy handles polling correctly. Consider SWR's `refreshInterval` instead of manual `setInterval` |
| **Error boundaries** | OM has multiple specialized error boundaries | Create one generic `OpsErrorBoundary` for OMAI |

### Low Risks

| Risk | Detail |
|------|--------|
| **CSS/Tailwind** | OM uses Tailwind + MUI. Berry uses Emotion + MUI. Minor style conflicts possible |
| **Date libraries** | OM uses various date utilities. Berry has `date-fns`. Standardize on `date-fns` |
| **Breadcrumbs** | Berry already has breadcrumbs in MainLayout. Just configure correctly |

---

## 4. First Concrete Batch — Phase 1A + 1B (Items 1–5)

### Batch 1: Infrastructure + Platform Status + Build Info

This is the minimum viable set to prove the migration pattern works.

---

## 5. File-Level Migration Map

### Infrastructure Files (Create New in OMAI)

| # | Destination (OMAI) | Source (OM) | Action | Dependencies |
|---|-------------------|-------------|--------|--------------|
| 1 | `berry/src/utils/omApi.ts` | `front-end/src/api/utils/axiosInstance.ts` | **Rewrite** — thin wrapper around Berry's axios that auto-prefixes `/api`, adds standard error handling, typed response helpers | Berry's `utils/axios.ts` |
| 2 | `berry/src/utils/roles.ts` | `front-end/src/utils/roles.ts` | **Copy+adapt** — role hierarchy, `hasRole()`, `hasAnyRole()`, `getAssignableRoles()` | None |
| 3 | `berry/src/hooks/useRoles.ts` | (new) | **Create** — hook wrapping `useAuth()` + role utils: `const { hasRole, isAdmin, isSuperAdmin } = useRoles()` | `utils/roles.ts`, `hooks/useAuth.ts` |
| 4 | `berry/src/utils/route-guard/RoleGuard.tsx` | `front-end/src/components/auth/ProtectedRoute.tsx` | **Rewrite** — Berry-style guard component: `<RoleGuard roles={['super_admin','admin']}>` wrapping route elements | `hooks/useAuth.ts`, `utils/roles.ts` |
| 5 | `berry/src/ui-component/ops/OpsPageContainer.tsx` | (new, inspired by OM's PageContainer) | **Create** — standard ops page wrapper: title, optional subtitle, loading skeleton, error state, breadcrumb config | Berry's `MainCard`, MUI 7 |
| 6 | `berry/src/ui-component/ops/StatusChip.tsx` | (new) | **Create** — generic status chip: maps status string → color. Covers log levels, job states, item statuses | MUI Chip |
| 7 | `berry/src/ui-component/ops/MetricCard.tsx` | (new, inspired by OM's DashboardWidgetCard) | **Create** — compact metric display: icon + value + label + optional trend indicator | MUI Card, Tabler icons |

### Page Files — Platform Status

| # | Destination (OMAI) | Source (OM) | Action | Dependencies |
|---|-------------------|-------------|--------|--------------|
| 8 | `berry/src/views/ops/platform-status/index.tsx` | `features/devel-tools/platform-status/PlatformStatusPage.tsx` | **Rewrite** — adapt to MUI 7 + Berry layout + `omApi` client. Replace OM icons with Tabler. Use Berry's card components | `omApi`, `OpsPageContainer`, `StatusChip`, `MetricCard` |
| 9 | Backend: no changes needed | `server/src/routes/system.ts` | **None** — `/api/system/health`, `/api/system/build-info` already exist and return JSON | JWT auth on OM backend |

### Page Files — Build Info

| # | Destination (OMAI) | Source (OM) | Action | Dependencies |
|---|-------------------|-------------|--------|--------------|
| 10 | `berry/src/views/ops/build-info/index.tsx` | `features/devel-tools/build-info/BuildInfoPage.tsx` | **Rewrite** — simpler than Platform Status. Git SHA, branch, build time, version sync | `omApi`, `OpsPageContainer` |

### Page Files — Log Search

| # | Destination (OMAI) | Source (OM) | Action | Dependencies |
|---|-------------------|-------------|--------|--------------|
| 11 | `berry/src/views/ops/log-search/index.tsx` | `features/admin/dashboard/LogSearch.tsx` | **Rewrite** — this is 1000+ lines in OM. Simplify: search bar, level filter, date range, paginated results table. Use MUI DataGrid instead of custom table | `omApi`, `OpsPageContainer`, `StatusChip` |
| 12 | `berry/src/views/ops/log-search/LogFilters.tsx` | (extract from above) | **Create** — filter bar component: level chips, date range picker, search input, source dropdown | MUI 7 components |
| 13 | `berry/src/views/ops/log-search/LogDetailDrawer.tsx` | (extract from above) | **Create** — slide-out drawer showing full log entry detail, raw JSON, metadata | MUI Drawer |

### Page Files — Session Pulse

| # | Destination (OMAI) | Source (OM) | Action | Dependencies |
|---|-------------------|-------------|--------|--------------|
| 14 | `berry/src/views/ops/session-pulse/index.tsx` | `features/admin/components/SessionPulse.tsx` | **Rewrite** — active sessions count, unique users, health indicator. Use SWR `refreshInterval` instead of raw `setInterval` | `omApi`, `MetricCard`, SWR |

### Page Files — Service Monitor

| # | Destination (OMAI) | Source (OM) | Action | Dependencies |
|---|-------------------|-------------|--------|--------------|
| 15 | `berry/src/views/ops/services/index.tsx` | `features/system/settings/ServiceManagement.tsx` | **Rewrite** — list services with status badges, restart buttons. Cleaner than OM's tab-embedded version | `omApi`, `OpsPageContainer`, `StatusChip` |

### Route & Menu Wiring

| # | File | Action |
|---|------|--------|
| 16 | `berry/src/routes/OpsRoutes.tsx` | **Create** — new route group: `/ops/status`, `/ops/build`, `/ops/logs`, `/ops/sessions`, `/ops/services`. All wrapped with `RoleGuard` |
| 17 | `berry/src/routes/MainRoutes.tsx` | **Edit** — add `OpsRoutes` children under MainLayout |
| 18 | `berry/src/menu-items/ops.ts` | **Create** — new menu group "Operations" with Tabler icons: IconHeartRateMonitor, IconBuildingFactory, IconFileSearch, IconUsers, IconServer |
| 19 | `berry/src/menu-items/index.ts` | **Edit** — add ops menu group |

### Summary Table

| Action | Count |
|--------|-------|
| **Create (new)** | 12 files |
| **Rewrite (from OM source)** | 7 files |
| **Edit (existing OMAI)** | 2 files |
| **Backend changes** | 0 |
| **Copy verbatim** | 0 |

---

## 6. Implementation Sequence

```
Step 1:  utils/roles.ts + hooks/useRoles.ts           (role infrastructure)
Step 2:  utils/omApi.ts                                 (API client)
Step 3:  utils/route-guard/RoleGuard.tsx               (route protection)
Step 4:  ui-component/ops/ (OpsPageContainer,          (shared ops UI)
         StatusChip, MetricCard)
Step 5:  views/ops/platform-status/index.tsx           (first real page)
Step 6:  views/ops/build-info/index.tsx                (second page, validates pattern)
Step 7:  routes/OpsRoutes.tsx + menu-items/ops.ts      (wire navigation)
         + edit MainRoutes.tsx + index.ts
Step 8:  views/ops/log-search/*                        (complex page)
Step 9:  views/ops/session-pulse/index.tsx             (polling page)
Step 10: views/ops/services/index.tsx                  (action page)
```

Each step is independently deployable and testable.

---

## 7. What We Are NOT Doing

- Not installing AG Grid in OMAI (MUI DataGrid suffices for ops tables)
- Not adding Recharts (ApexCharts already available)
- Not copying OM's CustomizerContext (Berry's ConfigProvider is cleaner)
- Not migrating NotificationContext/WebSocket (not needed for ops MVP)
- Not copying OM's feature registry/lifecycle system (ops pages are always on)
- Not touching OM's backend — all endpoints already exist
- Not creating a shared npm package (premature; copy+adapt for now)
- Not migrating any church-facing, records, OCR, CRM, or public pages
