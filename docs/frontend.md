# Frontend Architecture

## Stack

- **React 18** + TypeScript
- **Vite** build tool
- **MUI** (Material UI) component library
- **Tailwind CSS** utility classes
- **React Router v6** (`createBrowserRouter`)
- **Axios** for API calls

## Directory Structure

```
front-end/src/
├── Router.tsx           # All route definitions
├── App.tsx              # Root component
├── api/
│   └── utils/
│       └── axiosInstance.ts  # API client (auto-prefixes /api)
├── components/          # Shared/reusable components
├── features/            # Feature-specific directories
│   ├── admin/           # Admin panel features
│   ├── ocr/             # OCR studio components
│   ├── records/         # Record management
│   ├── refactor-console/# Refactor console
│   └── ...
├── layouts/
│   ├── full/            # FullLayout (sidebar + header)
│   └── blank/           # BlankLayout (no chrome)
├── pages/               # Page-level components
├── hooks/               # Custom React hooks
├── store/               # State management
├── theme/               # MUI theme config
└── utils/               # Utility functions
```

## Routing

Routes are defined in `front-end/src/Router.tsx` using `createBrowserRouter`. Two layout groups:

### FullLayout (authenticated pages)

Requires authentication. Includes sidebar navigation and header.

| Route Group | Example Paths | Roles |
|-------------|---------------|-------|
| Dashboards | `/dashboards/super`, `/dashboards/analytics` | Varies |
| Admin | `/admin/users`, `/admin/churches`, `/admin/menu-management` | admin, super_admin |
| Records | `/apps/records/baptism`, `/apps/records/marriage`, `/apps/records/funeral` | admin + church roles |
| Record Entry | `/apps/records/baptism/new`, `/apps/records/baptism/edit/:id` | admin + church roles |
| OCR Studio | `/devel/ocr-studio/*` | admin + church roles |
| Dev Tools | `/devel-tools/refactor-console`, `/devel-tools/omtrace` | admin, super_admin |
| Calendar | `/apps/liturgical-calendar`, `/apps/orthodox-calendar` | authenticated |
| Church Admin | `/admin/churches`, `/admin/church/:id` | admin, super_admin |

### BlankLayout (public/auth pages)

No sidebar or header.

| Route Group | Example Paths |
|-------------|---------------|
| Auth | `/auth/login`, `/auth/register`, `/auth/forgot-password` |
| Frontend | `/frontend-pages/homepage`, `/frontend-pages/about`, `/frontend-pages/contact` |
| Public | `/tasks`, `/tasks/:id`, `/blog/:slug`, `/tour` |
| Interactive Reports | `/r/interactive/:token` (feature-flagged) |

## Route Protection

```tsx
// Role-based
<ProtectedRoute requiredRole={['admin', 'super_admin']}>
  <AdminPage />
</ProtectedRoute>

// Permission-based
<ProtectedRoute requiredPermission="view_dashboard">
  <Dashboard />
</ProtectedRoute>

// Any authenticated user
<ProtectedRoute>
  <SomePage />
</ProtectedRoute>
```

Roles hierarchy: `super_admin` > `admin` > `church_admin` > `priest` > `deacon` > `editor`

## API Client

```ts
import apiClient from '@/api/utils/axiosInstance';

// Auto-prefixes /api, so this calls GET /api/churches
const { data } = await apiClient.get('/churches');
```

- Base URL auto-prefixed: `/api`
- Credentials included (cookies sent)
- Interceptors handle auth errors (redirect to login on 401)

## Lazy Loading

Components use `Loadable()` wrapper for code splitting:

```tsx
const BaptismRecordsPage = Loadable(
  lazy(() => import('@/features/records/pages/BaptismRecordsPage'))
);
```

## Error Boundaries

- `AppErrorBoundary` — top-level app errors
- `AdminErrorBoundary` — admin feature errors
- `RecordsRouteErrorBoundary` — records-specific errors

## Build

```bash
cd front-end
npm install --legacy-peer-deps
npx vite build
```

Output goes to `front-end/dist/`. Served by Express static middleware in production. Vite produces hashed filenames for cache busting (`assets/index-abc123.js`).

**Note**: Large chunk warnings from Vite are expected and can be ignored.
