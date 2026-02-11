Here’s Phase 5 in the same style—paste this into a GPT-4.1 Opus Precise/Code tab in Cursor.

markdown
Copy
Edit

# OrthodoxMetrics — Phase 5: Legacy Records (Priority) + Records Browser + Dashboard + Universal Import

**Mode:** Precise/Code • **Temp:** 0.1 • **Long context:** ON  
**Root:** /var/www/orthodoxmetrics/prod

## Goal

Ship a production-ready **Legacy Records** experience (highest priority) plus a simple **Records Browser** and **Records Dashboard**, all backed by `orthodoxmetrics_db`. Add a universal **Import Data** flow that accepts **CSV, JSON, SQL, XML** and stamps `church_id` automatically. Minimal diffs; small, verifiable commits.

---

## Global Rules

- Multi-tenant safety: every read/write scoped to `req.tenantId` (`church_id`) with middleware enforcement.
- Idempotent imports via `(church_id, source_hash)`; domain uniques per table (cert number or book/page/entry).
- No hard deletes; archive to `.archive/YYYY-MM-DD/...`.
- Keep secrets out of git. Log actions to `ops/audit/FIX_LOG.md`.

---

## Step 0 — Preflight (no changes)

```bash
pnpm -v && node -v
git status --porcelain
mysql -N -e "SHOW TABLES FROM orthodoxmetrics_db LIKE '%_records';"
If dirty with unrelated changes:

bash
Copy
Edit
git add -A && git commit -m "chore(phase5): snapshot before records UX"
Step 1 — DB: Import tracking + constraints
Create db/sql/06_records_imports.sql:

import_jobs (id, church_id, type[baptisms|marriages|funerals], format[csv|json|sql|xml], filename, size, status[pending|running|done|error], totals, started_at, finished_at, error_text)

import_files (id, job_id FK, storage_path, original_name, mime, sha1)

Ensure uniques exist (composites per church):

Baptisms: (church_id, certificate_no) and (church_id, book_no, page_no, entry_no)

Marriages: (church_id, certificate_no) and (church_id, book_no, page_no, entry_no)

Funerals: (church_id, certificate_no) and (church_id, book_no, page_no, entry_no)

Add indexes on dates and last names for fast browsing.

Run:

bash
Copy
Edit
mysql -u root -p < db/sql/06_records_imports.sql
git add db/sql/06_records_imports.sql && git commit -m "feat(db): import tracking + scoped uniques for records"
Step 2 — Backend: Import API (CSV/JSON/SQL/XML) + Parsing
Create:

server/src/routes/records/import.ts:

POST /api/records/import/upload — multipart upload; create import_jobs+import_files, store under uploads/<churchId>/<jobId>/.

POST /api/records/import/preview — parse first N rows/objects; infer headers/fields; return mapping suggestions.

POST /api/records/import/commit — stream the whole file, map → canonical fields, compute source_hash, upsert.

All stamped with req.tenantId; only superadmin can set X-OMX-Church-ID to impersonate.

server/src/modules/records/importService.ts:

detectFormat(filename,mime) → 'csv'|'json'|'sql'|'xml'

Parsers:

CSV: fast-csv (stream)

JSON: accept array or NDJSON; map keys via provided mapping

SQL: whitelist only INSERT INTO baptism_records|marriage_records|funeral_records (...) VALUES ...; → parse columns/values, stamp church_id

XML: xml2js; accept a mapping of XPath-ish selectors → canonical fields

Compute source_hash:

Baptisms: name + baptism_date + cert OR book/page/entry

Marriages: groom + bride + marriage_date + cert/BPE

Funerals: name + (funeral_date||death_date) + cert/BPE

Upsert by (church_id, source_hash); also respect domain uniques (skip or update on conflict).

Job bookkeeping: update import_jobs.status, counts, and error_text.

server/src/routes/records/browse.ts:

GET /api/records/:type → paginated list, filters (q=name, date range, cert, book/page/entry), church-scoped.

GET /api/records/:type/:id → detail.

server/src/routes/records/dashboard.ts:

GET /api/records/dashboard → total counts per type, last 30d trend, recent imports with status.

Install:

bash
Copy
Edit
pnpm add fast-csv xml2js mysql2
pnpm add -D @types/multer
(Use multer or busboy for uploads; pick one and keep it minimal.)

Mount routes (e.g. in server/src/app.ts):

ts
Copy
Edit
import recordsImport from "./routes/records/import";
import recordsBrowse from "./routes/records/browse";
import recordsDashboard from "./routes/records/dashboard";
app.use(recordsImport, recordsBrowse, recordsDashboard);
Commit:

bash
Copy
Edit
git add server/src/routes/records server/src/modules/records && git commit -m "feat(api): universal records import + browse + dashboard"
Step 3 — Frontend: Legacy Records (PRIORITY)
Create pages/components:

front-end/src/pages/LegacyRecordsPage.tsx (route: /legacy-records)

Import Data button → opens LegacyImportWizard

Table of Recent Imports (status badges; view errors)

front-end/src/components/records/LegacyImportWizard.tsx

Step 1 Upload: drag/drop; shows detected format; sends to /api/records/import/upload

Step 2 Mapping: show auto-detected fields; allow manual mapping to canonical schema

per type: Baptism (person_first/middle/last, dates, cert, book/page/entry, parents/godparents); Marriage; Funeral

Step 3 Preview: fetch /preview (first 100 rows); show diff counts, dupes to be skipped

Step 4 Import: call /commit; show progress; on done, link to Records Browser

front-end/src/lib/recordsApi.ts — typed calls; token-aware apiFetch.

front-end/src/routes/Router.tsx — add route.

UI libraries: stick to what’s already in repo (@mui/* or native). Keep it lightweight and consistent.

Commit:

bash
Copy
Edit
git add front-end/src/pages front-end/src/components/records front-end/src/lib/recordsApi.ts front-end/src/routes/Router.tsx
git commit -m "feat(legacy): import wizard with upload→map→preview→commit and recent jobs"
Step 4 — Frontend: Records Browser
Create:

front-end/src/pages/RecordsBrowserPage.tsx (route: /records)

Tabs: Baptisms | Marriages | Funerals

Filters: name (debounced), date range, cert, book/page/entry

Table: sortable columns; pagination; row → details

Each tab has Import Data (opens same wizard with default type)

front-end/src/pages/RecordDetailPage.tsx (route: /records/:type/:id)

Show full canonical fields; JSON badges for arrays (godparents, witnesses)

“Open in legacy book” helpers (book/page/entry if present)

Commit:

bash
Copy
Edit
git add front-end/src/pages && git commit -m "feat(records): browser + detail pages with filters and pagination"
Step 5 — Frontend: Records Dashboard
Create:

front-end/src/pages/RecordsDashboardPage.tsx (route: /records/dashboard)

Cards: total counts per type (church-scoped)

Chart: imports over time (last 90 days)

Duplicates quick list (by domain uniques)

CTA buttons to Legacy Import and Records Browser

Commit:

bash
Copy
Edit
git add front-end/src/pages/RecordsDashboardPage.tsx && git commit -m "feat(records): dashboard with counts, trends, dupes"
Step 6 — Multi-tenancy Enforcement & Limits
Ensure all endpoints use requireAuth + tenant middleware (req.tenantId).

Upload storage path: uploads/<churchId>/<jobId>/...

Add server limits:

Max file size (env IMPORT_MAX_BYTES, default 50MB)

Allowed mimetypes/extensions

Timeouts for preview/commit

Add simple dupe strategy env:

IMPORT_DUPLICATE_MODE=skip|update (default update uses source_hash upsert).

Commit:

bash
Copy
Edit
git add server/src && git commit -m "chore(import): tenant-safe storage, limits, and duplicate strategy"
Step 7 — Verification
bash
Copy
Edit
# 1) Upload CSV (church_id implied by auth) → preview → commit
# Use sample 5-row CSVs for each type; verify counts increase only once on re-import.
curl -s -X GET "http://localhost:3000/api/records/baptisms?q=smith&limit=5"

# 2) JSON import (array)
# 3) XML import (supply a mapping in the wizard)
# 4) SQL import (INSERT statements for supported tables only)
# 5) Dashboard shows counts & recent job; Browser filters work; Detail pages render.

# DB checks
mysql -N -e "SELECT COUNT(*) FROM orthodoxmetrics_db.baptism_records WHERE church_id=<your_church_id>;"
mysql -N -e "SELECT COUNT(*) FROM orthodoxmetrics_db.marriage_records WHERE church_id=<your_church_id>;"
mysql -N -e "SELECT COUNT(*) FROM orthodoxmetrics_db.funeral_records WHERE church_id=<your_church_id>;"
Commit:

bash
Copy
Edit
git add -A && git commit -m "chore(verify): phase 5 manual verification snapshot"
Acceptance Criteria
Legacy Records page: Import wizard works for CSV, JSON, SQL, XML, with preview & mapping, job status, and safe upserts.

Records Browser: paginated, filterable views per type; per-record detail pages.

Records Dashboard: counts, trend chart, recent imports, duplicate hints.

All operations are church-scoped and idempotent. No regressions on re-imports.

Rollback Plan
Revert Phase 5 commits; pm2 resurrect if needed.

Imports are idempotent; re-runs will not duplicate due to (church_id, source_hash).

Begin
Create 06_records_imports.sql and run it.

Implement backend import endpoints+parsers.

Build Legacy Records wizard (upload→mapping→preview→commit).

Add Browser and Dashboard.

Verify and commit artifacts.
```
