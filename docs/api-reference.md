# Backend API Routes

All routes are mounted in `server/src/index.ts` using `safeRequire()` wrappers. Base URL: `http://localhost:3001`.

## Public Endpoints (No Auth)

| Route | Source | Description |
|-------|--------|-------------|
| `GET /api/system/health` | Inline in index.ts | Health check (DB status, memory, uptime) |
| `GET /api/maintenance/status` | Inline in index.ts | Maintenance mode check |
| `GET /api/maintenance/*` | `api/maintenance-public` | Public maintenance routes |
| `POST /api/auth/login` | `routes/auth` | User login |
| `POST /api/auth/register` | `routes/auth` | User registration |
| `GET /api/churches` | `routes/churches` | Public church listing |

## Authentication

| Route | Source | Description |
|-------|--------|-------------|
| `/api/auth/*` | `routes/auth` | Login, register, logout, password reset |
| `GET /api/auth/check` | Inline fallback | Session check |

## Admin Routes

| Route | Source | Description |
|-------|--------|-------------|
| `/api/admin/*` | `api/admin` | General admin (catch-all, mounted last) |
| `/api/admin/church/*` | `routes/admin/church` | Church admin management |
| `/api/admin/churches/*` | `routes/admin/churches-compat` + `routes/admin/churches` | Church provisioning |
| `/api/admin/users/*` | `routes/admin/users` | User management |
| `/api/admin/sessions/*` | `routes/admin/sessions` | Session management |
| `/api/admin/session-stats/*` | Rewrite to sessions/stats | Session statistics |
| `/api/admin/activity-logs/*` | `routes/admin/activity-logs` | Activity logs |
| `/api/admin/templates/*` | `routes/admin/templates` | Template management |
| `/api/admin/global-images/*` | `routes/admin/globalImages` | Global image management |
| `/api/admin/services/*` | `routes/admin/services` | Service management |
| `/api/admin/components/*` | `routes/admin/components` | Component management |
| `/api/admin/settings/*` | `routes/admin/settings` | Admin settings |
| `/api/admin/capabilities/*` | `routes/admin/capabilities` | Admin capabilities |
| `/api/admin/fs-tests/*` | `routes/admin/fsTests` | Filesystem tests |
| `/api/admin/tasks/*` | `api/dailyTasks` | Daily task management |
| `/api/admin/logs/*` | `routes/logs` | Log viewing |
| `/api/admin/nfs-backup/*` | `routes/admin/nfs-backup` | NFS backup config |
| `/api/admin/social-permissions/*` | `routes/admin/social-permissions` | Social permissions |
| `/api/admin/menu-permissions/*` | `routes/admin/menu-permissions` | Menu permissions |
| `/api/admin/church-users/*` | `routes/admin/church-users` | Church user management |
| `/api/admin/church-database/*` | `routes/admin/church-database` | Church DB management |
| `/api/admin/omai-spin/*` | `routes/admin/omaiSpin` | OMAI spin management |
| `/api/admin/api-tests/*` | `api/apiExplorer` (testsRouter) | API test runner |
| `/api/admin/system/*` | `routes/adminSystem` | System management |
| `/api/admin/build-status` | `routes/admin/buildStatus` | Build status |
| `/api/admin/build-runs` | `routes/admin/buildRuns` | Build run history |
| `/api/admin/auth/*` | `routes/admin/auth-check` | Admin auth check |
| `/api/admin/seed-records` | `routes/admin/seedRecords` | Seed records |
| `GET /api/admin/_routes` | Inline (admin-only) | Route health check |
| `/api/ops/*` | `routes/admin/ops` | OM-Ops operations |

## Records

| Route | Source | Description |
|-------|--------|-------------|
| `/api/church-records/*` | `routes/records` | Church records (generic) |
| `/api/churches/:churchId/records/*` | `routes/records` | Church-scoped records |
| `/api/records/*` | `api/powerSearchApi` | Power Search with pagination |
| `/api/records/import/*` | `routes/records-import` | Records import |
| `/api/records/interactive-reports/*` | `routes/interactiveReports` | Interactive reports |
| `/api/baptism-records/*` | `routes/baptism` | Baptism records |
| `/api/marriage-records/*` | `routes/marriage` | Marriage records |
| `/api/funeral-records/*` | `routes/funeral` | Funeral records |
| `/api/unique-values/*` | `routes/unique-values` | Unique field values |

## OCR

### Route Groups

| Route Prefix | Source | Auth | Description |
|-------------|--------|------|-------------|
| `/api/feeder/*` | `routes/feeder.js` | admin | OCR feeder pipeline ingest |
| `/api/church/:churchId/ocr/*` | `routes/ocr/` | auth | Church-scoped OCR operations |
| `/api/admin/ocr/*` | `routes/ocr/adminMonitor.ts` | super_admin | Admin OCR monitoring |
| `/api/system/ocr/*` | `api/systemStatus.js` | admin | OCR health & recovery |

### Feeder Pipeline (`/api/feeder`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ingest` | admin | Upload and ingest a new OCR job |
| GET | `/jobs/:jobId` | admin | Get feeder job status |
| GET | `/pages/:pageId` | admin | Get page processing status |
| POST | `/pages/:pageId/retry` | admin | Retry failed page |
| POST | `/pages/:pageId/correction` | admin | Submit page correction |

### Church-Scoped OCR (`/api/church/:churchId/ocr`)

**Jobs (jobs.ts):**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/jobs` | List jobs for church |
| POST | `/enhanced/process` | Upload and process via enhanced pipeline |
| GET | `/jobs/:jobId` | Get job detail |
| GET | `/jobs/:jobId/image` | Get source image |
| GET | `/jobs/:jobId/debug` | Debug info for job |
| PATCH | `/jobs/:jobId` | Update job metadata |
| POST | `/jobs/:jobId/retry` | Retry failed job |
| POST | `/jobs/:jobId/replay` | Replay processing |
| GET | `/jobs/:jobId/history` | Job state change history |
| POST | `/jobs/:jobId/resume` | Resume paused job |
| DELETE | `/jobs` | Bulk delete jobs |
| POST | `/jobs/:jobId/finalize` | Finalize single record |
| POST | `/jobs/:jobId/finalize-batch` | Finalize multiple records |
| POST | `/jobs/:jobId/autocommit` | Auto-commit high-confidence records |
| POST | `/jobs/:jobId/save-draft` | Save draft edits |
| POST | `/jobs/:jobId/apply-template` | Apply layout template |
| POST | `/jobs/:jobId/auto-extract` | Run auto-extraction |
| POST | `/jobs/:jobId/reject-row` | Reject extracted row |
| POST | `/jobs/:jobId/reextract-row` | Re-extract single row |
| POST | `/jobs/:jobId/crop-reocr` | Crop and re-OCR region |
| POST | `/jobs/:jobId/learn-from-confirmations` | Train from user confirmations |
| GET | `/jobs/:jobId/download` | Download extracted data |
| PATCH | `/jobs/:jobId/review-status` | Update review status |

**Fusion Workflow (fusion.ts):**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/jobs/:jobId/fusion/drafts` | List fusion drafts |
| PUT | `/jobs/:jobId/fusion/drafts/:entryIndex` | Update draft entry |
| POST | `/jobs/:jobId/fusion/drafts` | Create new draft |
| POST | `/jobs/:jobId/fusion/extract-layout` | Extract using layout template |
| POST | `/jobs/:jobId/fusion/ready-for-review` | Mark drafts ready for review |
| POST | `/jobs/:jobId/fusion/validate` | Validate drafts before commit |
| POST | `/jobs/:jobId/fusion/commit` | Commit drafts to record tables |
| POST | `/jobs/:jobId/normalize` | Normalize extracted data |

**Review (review.ts):**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/jobs/:jobId/review/finalize` | Finalize review |
| POST | `/jobs/:jobId/review/commit` | Commit reviewed records |
| GET | `/finalize-history` | Get finalization history |

**Settings (settings.ts):**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Get church OCR settings |
| PUT | `/` | Update church OCR settings |

**Setup Wizard (setupWizard.ts):**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/setup-state` | Get setup wizard state |
| PUT | `/setup-state` | Update wizard state |
| POST | `/setup-validate` | Validate setup configuration |
| GET | `/setup-inventory` | Get available OCR capabilities |

### Admin OCR Monitoring (`/api/admin/ocr`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/dashboard` | super_admin | Aggregate OCR dashboard stats |
| GET | `/jobs` | super_admin | List all OCR jobs across churches |
| GET | `/jobs/:churchId/:jobId` | super_admin | Get specific job detail |
| POST | `/jobs/bulk` | super_admin | Bulk job operations |
| POST | `/jobs/clear-processed` | super_admin | Clear completed jobs |
| POST | `/jobs/cleanup-stale` | super_admin | Clean up stale jobs |
| POST | `/jobs/:churchId/:jobId/kill` | super_admin | Kill running job |
| POST | `/jobs/:churchId/:jobId/reprocess` | super_admin | Reprocess job |
| POST | `/jobs/:churchId/:jobId/clear` | super_admin | Clear job data |
| POST | `/jobs/:churchId/:jobId/resume` | super_admin | Resume paused job |
| DELETE | `/jobs/:churchId/:jobId` | super_admin | Delete job |
| GET | `/jobs/:churchId/:jobId/history` | super_admin | Job history |
| GET | `/layout-templates` | super_admin | List layout templates |
| GET | `/layout-templates/:id` | super_admin | Get template detail |
| POST | `/layout-templates` | super_admin | Create template |
| PUT | `/layout-templates/:id` | super_admin | Update template |
| DELETE | `/layout-templates/:id` | super_admin | Delete template |
| POST | `/layout-templates/preview-inline` | super_admin | Preview template extraction |
| POST | `/normalize-schema/:churchId` | super_admin | Normalize church OCR schema |

### OCR Health (`/api/system/ocr`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | admin | OCR subsystem health check |
| POST | `/recover-stale` | super_admin | Reset stuck jobs to pending |

**Health response:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "worker_status": "running|stopped",
  "pending_jobs": 0,
  "processing_jobs": 0,
  "failed_jobs": 4,
  "stale_jobs": 0,
  "stale_job_ids": [],
  "avg_processing_time_seconds": null,
  "storage_writable": true,
  "completed_last_24h": 0
}
```

## Certificates

| Route | Source | Description |
|-------|--------|-------------|
| `/api/certificates/*` | `routes/certificates` | General certificates |
| `/api/baptismCertificates/*` | `routes/baptismCertificates` | Baptism certificates |
| `/api/certificate/baptism/*` | `routes/baptismCertificates` | Baptism (alt path) |
| `/api/marriageCertificates/*` | `routes/marriageCertificates` | Marriage certificates |
| `/api/certificate/marriage/*` | `routes/marriageCertificates` | Marriage (alt path) |
| `/api/funeralCertificates/*` | `routes/funeralCertificates` | Funeral certificates |
| `/api/certificate/funeral/*` | `routes/funeralCertificates` | Funeral (alt path) |
| `/api/church/:churchId/certificate/*` | `api/churchCertificates` | Church-scoped certs |

## Social

| Route | Source | Description |
|-------|--------|-------------|
| `/api/social/blog/*` | `routes/social/blog` | Blog posts |
| `/api/social/friends/*` | `routes/social/friends` | Friends |
| `/api/social/chat/*` | `routes/social/chat` | Chat |
| `/api/social/notifications/*` | `routes/social/notifications` | Social notifications |

## CMS & Content

| Route | Source | Description |
|-------|--------|-------------|
| `/api/pages/*` | `routes/pages` | Page management |
| `/api/blogs/*` | `routes/blogs` | Blog functionality |
| `/api/uploads/*` | `routes/uploads` | Upload management |
| `/api/gallery/*` | `routes/gallery` | Gallery |
| `/api/docs/*` | `routes/docs` | Docs |
| `/api/user-files/*` | `routes/user-files` | User file management |
| `/api/bigbook/*` | `routes/bigbook` | Big Book system |
| `/api/library/*` | `routes/library` | OM-Library |
| `/api/headlines/*` | `routes/headlines` | Headlines |
| `/api/headlines/config/*` | `routes/headlines-config` | Headlines config |

## Business & Features

| Route | Source | Description |
|-------|--------|-------------|
| `/api/calendar/*` | `routes/calendar` | Calendar |
| `/api/orthodox-calendar/*` | `routes/orthodoxCalendar` | Liturgical calendar |
| `/api/dashboard/*` | `routes/dashboard` | Dashboard data |
| `/api/invoices/*` | `routes/invoices` | Invoices |
| `/api/invoices-enhanced/*` | `routes/enhancedInvoices` | Enhanced invoices |
| `/api/invoices-ml/*` | `routes/invoicesMultilingual` | Multilingual invoices |
| `/api/billing/*` | `routes/billing` | Billing |
| `/api/provision/*` | `routes/provision` | Church provisioning |
| `/api/eCommerce/*` | `routes/ecommerce` | E-commerce |
| `/api/kanban/*` | `routes/kanban` | Kanban boards |
| `/api/survey/*` | `routes/survey` | OMSiteSurvey |
| `/api/analytics/*` | `routes/analytics` | Analytics (choropleth) |
| `/api/crm/*` | `routes/crm` | CRM |
| `/api/notes/*` | `routes/notes` | Notes |

## User & Profile

| Route | Source | Description |
|-------|--------|-------------|
| `/api/user/*` | `routes/user` | User routes |
| `/api/user/profile/*` | `routes/user-profile` | User profile |
| `/api/upload/*` | `routes/upload` | Profile image upload |
| `/api/om/profile/*` | `routes/om/profile` | OM profile |
| `/api/contact` | `routes/contact` | Contact form (public) |

## System & Dev Tools

| Route | Source | Description |
|-------|--------|-------------|
| `/api/system/*` | `api/systemStatus` + `routes/system` | System status, updates |
| `/api/system/*` | `api/apiExplorer` (routesRouter) | API explorer routes |
| `/api/version/*` | `routes/version` | Version info |
| `/api/omtrace/*` | `api/omtrace` | OMTrace dependency analysis |
| `/api/refactor-console/*` | `routes/refactorConsole` | Refactor console |
| `/api/router-menu/*` | `routes/routerMenu` | Router menu studio |
| `/api/build/*` | `routes/build` | Build system |
| `/api/ai/*` | `routes/ai` | AI admin panel |
| `/api/server/*` | `routes/backend_diagnostics` | Backend diagnostics |
| `/api/settings/*` | `routes/settings` | App settings |
| `/api/lookup/*` | `routes/lookup` | Canonical lookups |

## OMAI

| Route | Source | Description |
|-------|--------|-------------|
| `/api/omai/*` | `routes/omai` | OM-AI system |
| `/api/omai/memories/*` | `routes/omai/memories` | OMAI memories |
| `/api/omai/global/*` | `routes/globalOmai` | Global OMAI chat |
| `/api/omb/*` | `routes/omb` | OMB system |
| `/api/omai-logger/*` | `routes/omaiLogger` | OMAI logger |

## Logging & Errors

| Route | Source | Description |
|-------|--------|-------------|
| `/api/logger/*` | `routes/logger` | Logger API |
| `/api/logs/*` | `routes/logs` | Log viewing |
| `/api/errors/*` | `routes/github-issues` | GitHub issues reporting |

## Backups

| Route | Source | Description |
|-------|--------|-------------|
| `/api/backups/*` | `api/backups` + `routes/backups` | Database backups |
| `/api/backup/*` | `routes/backup` | Original backup system |

## Other

| Route | Source | Description |
|-------|--------|-------------|
| `/api/menu-management/*` | `routes/menuManagement` | Menu management |
| `/api/menu-permissions/*` | `routes/menuPermissionsApi` | Menu permissions API |
| `/api/*` (menu) | `routes/menu` | Menu endpoints |
| `/api/*` (dropdowns) | `routes/dropdownOptions` | Dropdown options |
| `/api/*` (notifications) | `routes/notifications` | Notifications |
| `/api/*` (upload-token) | `routes/uploadToken` | Upload tokens |
| `/api/*` (utility) | `routes/utilityEndpoints` | Utility endpoints |
| `/api/templates/*` | `routes/templates` | Templates |
| `/api/global-templates/*` | `routes/globalTemplates` | Global templates |
| `/api/metrics/*` | `routes/metrics` | Metrics |
| `/api/internal/*` | `routes/internal/buildEvents` | Internal build events |
| `/client/:clientSlug/api/*` | `routes/clientApi` | Multi-tenant client API |
| `/r/interactive/*` | `routes/interactiveReports` | Interactive report links |

## Debug Endpoints

| Route | Description |
|-------|-------------|
| `GET /__debug/current-db` | Shows current database |
| `GET /__debug/session` | Shows session info |

## WebSocket Endpoints

| Path | Description |
|------|-------------|
| `/ws/omai-logger` | OMAI logger real-time updates |
| WebSocket service | General WebSocket (initialized after server start) |

## Route Pattern Notes

- `safeRequire(path, label)` — loads module, returns 503 stub on failure
- `safeRequireProp(path, prop, label)` — loads named export from module
- Certificate routers use `safeRequire` because native canvas module may fail
- Church-scoped OCR routes use `mountOcrRoutes(app, upload)` pattern with multer
- Legacy OCR routes disabled by default (set `ENABLE_LEGACY_OCR_ROUTES=true`)
