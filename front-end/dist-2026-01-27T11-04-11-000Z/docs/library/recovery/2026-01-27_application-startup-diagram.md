# Orthodox Metrics Application Startup Sequence

## Overview
This diagram illustrates the order and flow of how the application starts, including CSS loading, based on the `om-load.txt` log file.

---

## Phase 1: Route Matching & Initial Component Load
```
[8:13:45 PM] 🛣️  ROUTE: /apps/records/baptism
    ↓
📦 FILE: GET BaptismRecordsPage.tsx
    ↓
📝 SOURCE: Loading BaptismRecordsPage.tsx
```

---

## Phase 2: CSS Loading (Early)
```
📝 SOURCE: Loading → src/styles/advanced-grid-themes.css
    ↓
📦 FILE: GET /src/styles/advanced-grid-themes.css
```
**Note:** CSS is loaded early, before most component dependencies.

---

## Phase 3: Store & State Management
```
📦 FILE: GET useTableStyleStore.ts
    ↓
📝 SOURCE: Loading → enhancedTableStore.ts
    ↓
📦 FILE: GET enhancedTableStore.ts
```

---

## Phase 4: API & Utility Layer
```
📝 SOURCE: Loading → recordsApi.ts
    ↓
📝 SOURCE: Loading → admin.api.ts
    ↓
📦 FILE: GET recordsApi.ts
    ↓
📦 FILE: GET admin.api.ts
    ↓
📦 FILE: GET axiosInstance.ts
    ↓
📦 FILE: GET api.config.ts
```

---

## Phase 5: Component Dependencies (Parallel Loading)
```
┌─────────────────────────────────────────────────────────┐
│  Parallel Component Loading                              │
├─────────────────────────────────────────────────────────┤
│  • TableControlPanel.tsx                                │
│  • ColorPaletteSelector.tsx                             │
│  • BrandButtons.tsx                                     │
│  • AdvancedGridDialog.tsx                               │
│  • DynamicRecordsDisplay.tsx                            │
│  • DynamicRecordsInspector.tsx                          │
│  • columnMappers.ts                                     │
│  • cellRenderers.tsx                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 6: Image Assets (Parallel Requests)
```
🌐 SERVER REQ: GET /images/records/baptism.png
🌐 SERVER REQ: GET /images/records/g1.png
🌐 SERVER REQ: GET /images/records/gold-hor.png
🌐 SERVER REQ: GET /images/records/gold-vertical.png
🌐 SERVER REQ: GET /images/records/46-bg.png
```
**Note:** Images are requested in parallel, but many return 404 errors.

---

## Phase 7: API Data Requests (Parallel)
```
┌─────────────────────────────────────────────────────────┐
│  Parallel API Requests                                  │
├─────────────────────────────────────────────────────────┤
│  🔌 API: GET /api/admin/churches/46/record-settings     │
│  🔌 API: GET /api/churches/church-info                  │
│  🔌 API: GET /api/baptism-records?table=baptism...     │
│  🔌 API: GET /api/admin/churches/46/tables/.../columns │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 8: Main Application Initialization
```
📦 FILE: GET /src/main.tsx
    ↓
📦 FILE: GET /src/index.css          ← CSS LOADED
    ↓
📦 FILE: GET /src/App.tsx
    ↓
📦 FILE: GET /src/App.css            ← CSS LOADED
```

---

## Phase 9: Context Providers (Sequential)
```
📦 FILE: GET CustomizerContext.tsx
    ↓
📦 FILE: GET omTheme.ts
    ↓
📦 FILE: GET Theme.tsx
    ↓
📦 FILE: GET Router.tsx
    ↓
┌─────────────────────────────────────────────────────────┐
│  Context Providers (Parallel)                          │
├─────────────────────────────────────────────────────────┤
│  • ChurchRecordsContext.tsx                            │
│  • AuthContext.tsx                                     │
│  • MenuVisibilityContext.tsx                           │
│  • NotificationContext.tsx                              │
│  • WebSocketContext.tsx                                │
│  • UserDataContext.tsx                                 │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 10: Theme System Initialization
```
📦 FILE: GET Components.tsx
    ↓
📦 FILE: GET Typography.tsx
    ↓
📦 FILE: GET Shadows.tsx
    ↓
📦 FILE: GET DarkThemeColors.tsx
    ↓
📦 FILE: GET LightThemeColors.tsx
    ↓
📦 FILE: GET DefaultColors.tsx
```

---

## Phase 11: Error Handling & Utilities
```
📦 FILE: GET globalErrorHandler.ts
    ↓
📦 FILE: GET debugLogger.ts
    ↓
📦 FILE: GET ErrorBoundary components
    ↓
📦 FILE: GET axiosInterceptor.ts
```

---

## Phase 12: Layout Components (If Route Changes)
```
[8:13:47 PM] 🛣️  ROUTE: /frontend-pages/homepage
    ↓
📦 FILE: GET BlankLayout.tsx
    ↓
📦 FILE: GET Homepage.tsx
    ↓
📦 FILE: GET Header.tsx
    ↓
📦 FILE: GET Footer.tsx
    ↓
📦 FILE: GET LeftSideMenu.tsx
```

---

## Phase 13: Authentication Flow (If Needed)
```
[8:14:06 PM] 🛣️  ROUTE: /auth/login2
    ↓
📦 FILE: GET Login2.tsx
    ↓
📦 FILE: GET AuthLogin.tsx
    ↓
📦 FILE: GET CustomTextField.tsx
    ↓
📦 FILE: GET CustomCheckbox.tsx
    ↓
🌐 SERVER REQ: POST /api/auth/login
    ↓
[8:14:09 PM] 🛣️  ROUTE: /dashboards/super
```

---

## Phase 14: Dashboard Layout (After Auth)
```
📦 FILE: GET FullLayout.tsx
    ↓
📦 FILE: GET Header.tsx (vertical)
    ↓
📦 FILE: GET Sidebar.tsx
    ↓
📦 FILE: GET Customizer.tsx
    ↓
📦 FILE: GET Navigation components
```

---

## Complete Startup Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION STARTUP                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  1. Route Match                     │
        │     /apps/records/baptism           │
        └─────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │  2. Component Load                  │
        │     BaptismRecordsPage.tsx          │
        └─────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌───────────────┐          ┌──────────────────┐
│ 3. CSS Load   │          │ 4. Store Load    │
│ advanced-grid │          │ useTableStyle    │
│ -themes.css   │          │ Store            │
└───────────────┘          └──────────────────┘
        │                           │
        └─────────────┬─────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │  5. API Layer                       │
        │     recordsApi.ts                   │
        │     admin.api.ts                    │
        │     axiosInstance.ts                │
        └─────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │  6. Component Dependencies          │
        │     (Parallel Loading)              │
        └─────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌───────────────┐          ┌──────────────────┐
│ 7. Images     │          │ 8. API Requests  │
│ (Parallel)    │          │ (Parallel)       │
└───────────────┘          └──────────────────┘
        │                           │
        └─────────────┬─────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │  9. Main App Init                   │
        │     main.tsx                        │
        │     index.css ← CSS                 │
        │     App.tsx                         │
        │     App.css ← CSS                   │
        └─────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │  10. Context Providers              │
        │     (Parallel)                      │
        └─────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │  11. Theme System                   │
        │     Components, Typography, etc.    │
        └─────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │  12. Error Handling                 │
        │     ErrorBoundary, Interceptors     │
        └─────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │  13. Layout Components              │
        │     (Route-dependent)               │
        └─────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │  14. Authentication                │
        │     (If needed)                     │
        └─────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │  15. Dashboard/Layout              │
        │     (After auth)                    │
        └─────────────────────────────────────┘
```

---

## CSS Loading Summary

### CSS Files Loaded in Order:
1. **`src/styles/advanced-grid-themes.css`** - Loaded early (Phase 2), before most components
2. **`src/index.css`** - Loaded during main app initialization (Phase 8)
3. **`src/App.css`** - Loaded with App.tsx (Phase 8)

### CSS Loading Pattern:
- **Early CSS**: Component-specific CSS (like `advanced-grid-themes.css`) loads with the component that imports it
- **Base CSS**: `index.css` loads with `main.tsx` entry point
- **App CSS**: `App.css` loads with `App.tsx` root component

---

## Key Observations

1. **CSS is loaded early**: Component-specific CSS loads before most JavaScript dependencies
2. **Parallel loading**: Many components, API requests, and images load in parallel
3. **Sequential initialization**: Core app files (main.tsx, App.tsx) load sequentially
4. **Context providers**: Load in parallel after main app initialization
5. **Theme system**: Loads after contexts, before layout components
6. **Route-dependent**: Layout components only load when route changes

---

## Performance Notes

- **304 responses**: Many API requests return 304 (Not Modified), indicating effective caching
- **404 images**: Several image requests fail (404), suggesting missing assets
- **401 responses**: Some API requests return 401 (Unauthorized), requiring authentication
- **Parallel requests**: The application efficiently loads multiple resources simultaneously

---

## Timeline Summary

- **8:13:45 PM**: Route match and initial component load
- **8:13:46 PM**: CSS, stores, APIs, and component dependencies load
- **8:13:47 PM**: Main app initialization begins
- **8:14:06 PM**: Authentication flow (if user navigates to login)
- **8:14:09 PM**: Dashboard loads after successful authentication
- **8:14:13 PM**: Records page reloads (likely after navigation)
- **8:14:19 PM**: Advanced grid view loads with multiple record type requests

