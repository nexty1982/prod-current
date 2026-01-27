# OrthodoxMetrics — Schema Governance & Implementation Guide (v1.0)

**Date:** 2025-08-19  
**Owner:** Architecture (Nick)  
**Applies to:** FE + BE + DB

---

## 1) Purpose
Create a single source of truth for database **tables** and **columns**, so UI/API/DB stay in lockstep. This eliminates ad‑hoc updates (e.g., `name` vs `church_name`) and standardizes migrations across the stack.

## 2) Scope (Initial Tables)
```
activity, ai, churches, records, backups, church_users, social, errors, invoices,
roles, languages, locations, logs, images, ocr, omai, notifications, profiles,
permissions, sessions, tasks, uploads
```

## 3) Core Decisions (ADRs)
- **ADR‑001 — Schema Mapping File:** A shared JSON file `shared/app-schema.json` is the **canonical** source for table + column mappings.
- **ADR‑002 — Logical vs DB Names:** Code uses **logical keys** (e.g., `name`). The JSON maps logical → DB (e.g., `name → church_name`).
- **ADR‑003 — Libraries:** Thin helpers consume the JSON:
  - FE: `front-end/src/lib/schema.ts`
  - BE: `server/src/lib/schema.js`
- **ADR‑004 — Compatibility:** API responses alias DB columns to logical names (e.g., `church_name AS name`).
- **ADR‑005 — Dev Admin UI:** A dev‑only screen (`/admin/schema`) edits the mapping; persisted via `PUT /api/admin/schema` writing `shared/app-schema.json`.

## 4) Naming & Modeling Standards
- **Tables:** plural, `snake_case` (e.g., `church_users`, `languages`).
- **Columns:** `snake_case`. Foreign keys use `<entity>_id`.
- **Primary Key:** `id INT AUTO_INCREMENT` (unless clear reason otherwise).
- **Booleans:** `TINYINT(1)` (0/1).
- **Timestamps:** `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`, `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`.
- **Enums:** Prefer lookups (reference tables) or `ENUM` with documented allowed set.
- **Soft Deletes:** If needed, `deleted_at DATETIME NULL` (no ghosts without policy).
- **Indexes:** Explicit for FK columns and frequently filtered fields.

## 5) Canonical JSON (Source of Truth)
**File:** `shared/app-schema.json`

**Shape:**
```json
{
  "version": 1,
  "tables": {
    "churches": {
      "table": "churches",
      "columns": {
        "id": "id",
        "name": "church_name",
        "email": "email",
        "phone": "phone",
        "address": "address",
        "city": "city",
        "state_province": "state_province",
        "postal_code": "postal_code",
        "country": "country",
        "preferred_language": "preferred_language",
        "timezone": "timezone",
        "currency": "currency",
        "tax_id": "tax_id",
        "website": "website",
        "is_active": "is_active",
        "setup_complete": "setup_complete",
        "has_baptism_records": "has_baptism_records",
        "has_marriage_records": "has_marriage_records",
        "has_funeral_records": "has_funeral_records",
        "db_name": "db_name",
        "admin_email": "admin_email",
        "created_at": "created_at",
        "updated_at": "updated_at"
      }
    }
    // … add remaining tables similarly
  }
}
```

> **Rule:** Logical keys are the *contract* for UI/API. DB names can change via mapping without breaking consumers.

## 6) Helper Libraries
### 6.1 Front‑end — `front-end/src/lib/schema.ts`
- `getTable(key)`: table name.
- `getCol(key, logical)`: DB column name.
- `mapToDb(key, uiRow)`: logical → DB payload.
- `mapFromDb(key, dbRow)`: DB row → logical payload.

**Usage patterns:**
```ts
// After fetching DB row from API
const ui = mapFromDb('churches', dbRow); // ui.name is present

// Before saving from UI form
const payload = mapToDb('churches', formValues); // name→church_name
```

### 6.2 Back‑end — `server/src/lib/schema.js`
- `selectColumns(key, alias)`: returns `alias.db_col AS logical` list for SELECTs.
- `getTable`, `getCol`, `mapToDb`, `mapFromDb` analogous to FE.

**Usage patterns:**
```js
const cols = selectColumns('churches', 'c');
const sql  = `SELECT ${cols} FROM ${getTable('churches')} c WHERE c.id = ?`;
// INSERT/UPDATE
const dbPayload = mapToDb('churches', req.body);
```

## 7) Dev Admin UI
- **Route:** `/admin/schema` (dev‑only)
- **Functions:** edit table name + per‑column mapping; buttons: **Save** (PUT JSON), **Reset** (defaults).
- **Persist:** `PUT /api/admin/schema` (dev‑only endpoint writes JSON and invalidates in‑memory cache).

## 8) Change Management (Schema)
1. **Propose change:** open an ADR `docs/adr/ADR-xxx-name.md` (template below).
2. **Generate migration:** author SQL (backfill, add columns, create indexes, deprecations).
3. **Update JSON mapping:** adjust `shared/app-schema.json`.
4. **Update helpers/tests:** FE/BE compile‑time checks.
5. **Deploy plan:** stage → prod with backout.
6. **Monitor:** logs, error trackers.

**PR Checklist:**
- [ ] ADR approved
- [ ] SQL migration idempotent
- [ ] JSON schema updated + validated
- [ ] FE form + API updated to logical keys only
- [ ] Backward‑compat (views/aliases) removed after grace window

## 9) Migrations & Compatibility
- Prefer **additive** migrations (add new column, backfill, shift reads, then drop old).
- Backfill with explicit `TRIM` handling and null‑safe compares.
- Transitional compatibility tools:
  - **API aliasing:** `SELECT church_name AS name` via `selectColumns`.
  - **DB alias (optional):** generated column or view during cutover.

**Example — drop `name`, keep `church_name`:**
```sql
-- verify no diffs remain
SELECT COUNT(*) AS diffs FROM churches
WHERE NOT (NULLIF(TRIM(name),'') <=> NULLIF(TRIM(church_name),''));

-- enforce and drop
ALTER TABLE churches MODIFY COLUMN church_name VARCHAR(255) NOT NULL;
ALTER TABLE churches DROP COLUMN name;
```

## 10) Tooling
- **Schema generator:** `tools/gen-app-schema.mjs` introspects MariaDB and writes the JSON. Special‑case overrides (e.g., `churches.name → church_name`).
- **Unused code monitor (dev):** endpoint `/__unused.txt` lists used/unused files by browsing coverage.

## 11) Rollback Strategy
- Always take a table‑level dump pre‑migration.
- Keep compatibility aliases (API or DB) for one release cycle before final removal.
- Maintain a `ROLLBACK.sql` with the inverse `ALTER/UPDATE`.

## 12) Security & Access
- Dev schema editing endpoint disabled in production.
- Only privileged users commit changes to `shared/app-schema.json`.
- DB migrations require code owner review.

## 13) Adding a New Table — Checklist
1) Create DB table with standards (PK, timestamps, indexes).
2) Regenerate `shared/app-schema.json` or hand‑add mapping.
3) FE/BE helpers: use logical keys only.
4) Update admin UI to display mappings (driven dynamically from JSON keys).
5) Add tests for `mapToDb`/`mapFromDb` and `selectColumns`.

## 14) Current Table Notes (initial baseline)
- **churches**: canonical name column is **`church_name`**; logical key exposed to UI is **`name`**.
- **others**: baseline mapping logical = DB until specific overrides are decided.

## 15) ADR Template
```
# ADR-XXX: <Title>

- **Status:** Proposed | Accepted | Superseded
- **Date:** <YYYY-MM-DD>

## Context
<Why change is needed>

## Decision
<What we decided>

## Consequences
<Positive/negative trade-offs>

## Migration Plan
<SQL steps, backfill, compatibility window>

## Rollback Plan
<Exact steps to revert>
```

## 16) Migration PR Template
```
### Summary
<One-liner>

### Changes
- DB: <ALTERs>
- JSON: <mapping changes>
- API/FE: <affected endpoints/components>

### Pre‑flight
- [ ] Backup completed
- [ ] Diff check completed

### Post‑deploy
- [ ] Errors/metrics clean for 24h
- [ ] Remove compatibility code in next release
```

## 17) Examples — Commands (copy‑paste ready)
**Generate JSON from DB:**
```bash
set -Eeuo pipefail
cd "$(git rev-parse --show-toplevel)"
DB_HOST=127.0.0.1 DB_USER=root DB_PASSWORD=*** DB_NAME=orthodoxmetrics_db \
node tools/gen-app-schema.mjs
```

**Backfill `church_name` from `name` (if ever needed):**
```sql
UPDATE churches
SET church_name = TRIM(name)
WHERE (church_name IS NULL OR TRIM(church_name) = '')
  AND name IS NOT NULL AND TRIM(name) <> '';
```

**Example SELECT via helper (concept):**
```sql
SELECT c.church_name AS name, c.email, c.city FROM churches c WHERE c.id = ?;
```

---

### End of v1.0

