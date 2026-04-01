# OMAI Route Architecture & Migration Map

> Phase 2A–2D deliverable. Defines the official OMAI information architecture,
> maps old OrthodoxMetrics routes to new OMAI routes, and classifies every
> dependency for extraction.

## Design Principles

- **OMAI = operations/control plane.** OrthodoxMetrics = product/application plane.
- One clear responsibility per route. No "misc admin" dumping grounds.
- Admin+ role gating by default; super_admin for destructive/sensitive surfaces.
- Berry template demo routes are removed entirely.

---

## 1. Final OMAI Route Tree

```
/ops
  /platform-status     Platform health dashboard (DB, system, services, alerts)
  /service-monitor     Service cards with status/restart/logs actions
  /logs                Recent operational log tail (planned)
  /log-search          Full-text log search with filters and detail drawer
  /sessions            Active session visibility and control (planned)

/devops
  /repo                Git branch management, status, cleanup
  /build               Build console / version / deploy health
  /change-sets         Release change-set lifecycle
  /releases            Historical release/promotion timeline

/system
  /config              Platform configuration surface
  /security            Users, permissions, security settings
  /code-safety         Snapshot/backup management

/ai
  /admin               AI command/training administration
  /code-detection      Content/code change detection + rebuild triggers
  /prompt-plans        AI agent prompt plan management

/tools
  /api-explorer        Interactive API route explorer and tester
  /omtrace             File-system tracing console
  /refactor            Code refactoring console
  /conversation-log    AI conversation transcript archive
```

---

## 2. Old-to-New Route Mapping

| OM Route | OMAI Route | Source Component | Classification |
|----------|-----------|-----------------|----------------|
| `/devel-tools/platform-status` | `/ops/platform-status` | PlatformStatusPage | **BUILT** (Phase 1A) |
| _none (new in Phase 1B)_ | `/ops/service-monitor` | ServiceMonitorPage | **BUILT** (Phase 1B) |
| `/admin/logs` + `/admin/activity-logs` | `/ops/logs` | — | **PLACEHOLDER** (planned) |
| `/admin/log-search` | `/ops/log-search` | LogSearchPage | **BUILT** (Phase 1B) |
| `/admin/sessions` | `/ops/sessions` | SessionManagement | **PLACEHOLDER** (rewrite needed) |
| `/devel-tools/repo-ops` | `/devops/repo` | RepoOpsPage (1544 lines) | **SAFE COPY** — self-contained git UI |
| `/admin/build` | `/devops/build` | BuildConsole / BuildInfo | **BUILT** (build-info exists; full console is planned) |
| `/admin/control-panel/omai-daily/change-sets` | `/devops/change-sets` | ChangeSetsDashboard | **PLACEHOLDER** (safe copy later) |
| `/admin/control-panel/omai-daily/change-sets/releases` | `/devops/releases` | ReleaseHistoryPage | **PLACEHOLDER** (safe copy later) |
| `/admin/control-panel/system-server/platform-config` | `/system/config` | PlatformConfigPage (89 lines) | **SAFE COPY** — nav hub only |
| `/admin/control-panel/system-server/users-security` | `/system/security` | UsersSecurityPage | **PLACEHOLDER** (rewrite needed) |
| `/admin/control-panel/system-server/code-safety` | `/system/code-safety` | CodeSafetyPage (397 lines) | **SAFE COPY** — snapshot UI |
| `/admin/ai` | `/ai/admin` | AIAdminPanel (886 lines) | **REWRITE** — church-coupled EmailRecordsTab |
| `/admin/ai/code-changes` | `/ai/code-detection` | CodeChangeDetection (466 lines) | **SAFE COPY** — zero coupling |
| `/devel-tools/prompt-plans` | `/ai/prompt-plans` | PromptPlansPage (328 lines) | **SAFE COPY** — portable |
| `/devel-tools/api-explorer` | `/tools/api-explorer` | ApiExplorerPage (969 lines) | **SAFE COPY** — standalone |
| `/devel-tools/omtrace` | `/tools/omtrace` | OmtraceConsole (401 lines) | **REWRITE** — hardcoded paths |
| `/devel-tools/refactor-console` | `/tools/refactor` | RefactorConsole (1629 lines) | **SAFE COPY** — client-abstracted |
| `/devel-tools/conversation-log` | `/tools/conversation-log` | ConversationLogPage (2069 lines) | **SAFE COPY** — zero coupling |

### Routes explicitly NOT moved to OMAI

| OM Route | Reason |
|----------|--------|
| `/records/*`, `/church/*` | Product — church record entry/browsing |
| `/devel/ocr-studio/*` | Product — OCR production workflows |
| `/portal/*`, `/account-hub/*` | Product — church portal / parish management |
| `/public/*`, `/about`, `/blog`, `/contact`, `/tour` | Product — public pages |
| `/apps/email`, `/social/*`, `/apps/chat` | Product — social/CRM |
| `/admin/control-panel` (hub) | **REWRITE** — bloated; decomposed into focused OMAI pages |
| `/admin/control-panel/omai-daily` | **DEFER** — 1900 lines, entangled; extract later |
| `/admin/control-panel/church-*` | Product — church lifecycle is product admin |
| `/admin/control-panel/crm-outreach` | Product — CRM |
| `/devel/ocr-*` | Product — OCR admin |

---

## 3. Dependency Classification

### SAFE COPY (10 components)
Minimal OM coupling, standard MUI, self-contained.

| Component | Lines | API Endpoints | Notes |
|-----------|-------|---------------|-------|
| RepoOpsPage | 1544 | `/api/ops/git/*` | Git branch mgmt |
| ConversationLogPage | 2069 | `/api/conversation-log/*` | Transcript archive |
| ApiExplorerPage | 969 | `/api/system/routes`, `/api/admin/api-tests/*` | API tester |
| RefactorConsole | 1629 | Via refactorConsoleClient | Code refactoring |
| CodeSafetyPage | 397 | `/api/snapshots/*` | Snapshot management |
| CodeChangeDetection | 466 | `/api/content-changes/*` | Change detection |
| PromptPlansPage | 328 | `/api/prompt-plans/*` | Agent plans |
| PlatformConfigPage | 89 | None (nav hub) | Config navigation |
| ServerDevOpsPage | 95 | None (nav hub) | DevOps navigation |

### REWRITE (2 components)
Needed but too coupled to copy directly.

| Component | Lines | Issue | Plan |
|-----------|-------|-------|------|
| AIAdminPanel | 886 | EmailRecordsTab uses churchId | Strip church tab, keep command/training tabs |
| OmtraceConsole | 401 | Hardcoded `/var/www/orthodoxmetrics` paths | Externalize base dir to config |

### IGNORE / DEFER
- AdminControlPanel — bloated hub, decomposed into focused pages
- OMDailyPage (1900 lines) — entangled with kanban/change-sets; extract incrementally
- All OCR production pages — product, not ops
- Church lifecycle/CRM/portal pages — product admin

---

## 4. Consolidation Decisions (Phase 2D)

| Overlap | Resolution |
|---------|------------|
| `/admin/logs` vs `/admin/log-search` vs server log files | Unified into `/ops/log-search` (DB search + server log tabs). `/ops/logs` will be a simpler tail view. |
| `/devel-tools/platform-status` vs system-server monitoring | `/ops/platform-status` = single health dashboard |
| Build info vs build console vs repo ops | `/devops/build` = version/deploy info. `/devops/repo` = git operations. No overlap. |
| Sessions vs activity logs | `/ops/sessions` = active session control. Activity logs folded into `/ops/logs`. |
| Control-panel fragments | Decomposed: config→`/system/config`, security→`/system/security`, devops→`/devops/*` |

---

## 5. Backend API Gap List

| OMAI Route | Required Endpoints | Status |
|------------|-------------------|--------|
| `/ops/platform-status` | `/api/platform/status` | **EXISTS** |
| `/ops/service-monitor` | `/api/platform/status`, `/api/platform/actions/service/*/logs,restart` | **EXISTS** |
| `/ops/log-search` | `/api/admin/log-search/*` | **EXISTS** |
| `/ops/logs` | `/api/admin/log-search` (simplified) | **EXISTS** (reuse) |
| `/ops/sessions` | `/api/admin/sessions/*` | **EXISTS** (in OM backend) |
| `/devops/repo` | `/api/ops/git/*` | **EXISTS** |
| `/devops/build` | `/api/system/build-info` | **EXISTS** |
| `/devops/change-sets` | `/api/admin/change-sets/*` | **EXISTS** |
| `/devops/releases` | `/api/admin/change-sets/releases/*` | **EXISTS** (to verify) |
| `/system/config` | `/api/admin/settings/*` | **EXISTS** |
| `/system/security` | `/api/users/*`, `/api/permissions/*` | **EXISTS** |
| `/system/code-safety` | `/api/snapshots/*` | **EXISTS** |
| `/ai/admin` | `/api/admin/ai/*` | **EXISTS** |
| `/ai/code-detection` | `/api/content-changes/*` | **EXISTS** |
| `/ai/prompt-plans` | `/api/prompt-plans/*` | **EXISTS** |
| `/tools/api-explorer` | `/api/system/routes`, `/api/admin/api-tests/*` | **EXISTS** |
| `/tools/omtrace` | `/api/omtrace/*` | **EXISTS** (to verify) |
| `/tools/refactor` | Via refactorConsoleClient | **EXISTS** |
| `/tools/conversation-log` | `/api/conversation-log/*` | **EXISTS** |

**No backend gaps identified.** All required endpoints exist in the OM backend (port 3001) and are accessible via OMAI's nginx proxy.

---

## 6. Implementation Status

| Route | Status | Phase |
|-------|--------|-------|
| `/ops/platform-status` | **LIVE** | 1A |
| `/ops/service-monitor` | **LIVE** | 1B |
| `/ops/log-search` | **LIVE** | 1B |
| `/devops/build` | **LIVE** (build-info) | 1A |
| All others | **PLACEHOLDER** | 2A–2D |

Placeholders use `PlaceholderPage` component showing planned status, description, and the OM source component available for future extraction.
