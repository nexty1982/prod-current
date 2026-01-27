# OrthodoxMetrics — Phase 4: Church Multi-Tenancy Consolidation (Single DB, Hard Isolation)

**Model:** GPT-4.1 Opus • **Mode:** Precise/Code • **Temp:** 0.1 • **Long context:** ON  
**Root:** /var/www/orthodoxmetrics/prod

## Goal

Consolidate **all church data** into **orthodoxmetrics_db** while keeping tenants **logically isolated**:

- One database: `orthodoxmetrics_db`
- Each row belongs to exactly one church via `church_id`
- Server guarantees **row-level isolation** for every request
- No architectural rewrite; minimal diffs; migrations are **idempotent**

---

## Global Rules

- No hard deletes; archive to `.archive/YYYY-MM-DD/...`.
- Schema changes must be **idempotent** and safe to re-run.
- All writes must carry `church_id`; all reads must filter by `church_id`.
- Superadmins may impersonate a church explicitly via header `X-OMX-Church-ID` or query param; everyone else uses `req.user.church_id`.
- Keep **email global-unique** (login simplicity). If we later need per-church emails, we’ll switch to `UNIQUE(church_id,email)` in a separate phase.

---

## Step 0 — Preflight (no changes)

```bash
mysql -N -e "SELECT DATABASE(); SHOW DATABASES LIKE 'orthodoxmetrics_db';"
mysql -N -e "SHOW TABLES FROM orthodoxmetrics_db;"
git status --porcelain
```

If dirty with unrelated changes:

```bash
git add -A && git commit -m "chore(phase4): snapshot before multi-tenant consolidation"
```

---

## Step 1 — Canonical Church Schema

Create `db/sql/04_multitenant_churches.sql` (idempotent). Contents:

- `churches` table (id, slug, name, status, timestamps)
- Utility procs to **add `church_id` column** to any table if missing, create FK, and create **(church_id, …)** composite uniques
- Best-effort **backfill helpers**:
  - If table has `church_id` → ensure FK + indexes only
  - Else if has `user_id` → set `table.church_id = users.church_id`
  - Else leave NULL and report in `ops/audit/tenant_unassigned.json`

Then run:

```bash
mysql -u root -p < server/database/04_multitenant_churches.sql
```

---

## Step 2 — Inventory & Plan

Generate an inventory of candidate tables to tenant-scope (names likely include: `members`, `families`, `events`, `donations`, `pledges`, `attendance`, `notes`, `files`, `settings`, `roles`, `permissions`, etc.).

1. Use `information_schema` to list tables in `orthodoxmetrics_db` excluding pure reference tables (e.g., migrations).
2. For each, detect whether it already has `church_id` or `user_id`.

Write `ops/audit/tenant_inventory.json`:

```jsonc
[
  {
    "table": "members",
    "has_church_id": false,
    "has_user_id": true,
    "candidate_uniques": ["member_number", "email"],
  },
]
```

Produce `ops/audit/tenant_plan.md`:

- For each table: action = {add church_id, fk, indexes, backfill via user_id join | verify only | needs manual mapping}.

Commit: `docs(tenant): inventory & plan`.

---

## Step 3 — Apply `church_id` Columns + FKs + Uniques

For every table in the plan:

- If missing, `ALTER TABLE ... ADD COLUMN church_id BIGINT UNSIGNED NULL AFTER id;`
- Add FK: `FOREIGN KEY (church_id) REFERENCES churches(id)`
- For uniqueness, **scope by church** where appropriate, e.g.:
  - `UNIQUE KEY uq_members_number (church_id, member_number)`
  - `UNIQUE KEY uq_events_slug (church_id, slug)`
- Backfill:
  - If table has `user_id`, set `church_id = users.church_id`.
  - Else if table has `created_by` or `updated_by` → try join to users.
  - Else leave NULL; add to `tenant_unassigned.json`.

Re-run until all backfills done; **then** set `church_id` to **NOT NULL** when safe.

Commit per table group:

```
git commit -m "feat(tenant): add church_id + fk + scoped uniques on <table_group>"
```

---

## Step 4 — Server Enforcement (Row-level Isolation)

Add **tenant guard** and **tenant-aware DB helpers**.

### 4a. Middleware `server/src/middleware/tenant.ts`

- Resolve `req.tenantId`:
  - If `req.user.role === 'superadmin'` and header `X-OMX-Church-ID` set → use that church (verify exists).
  - Else use `req.user.church_id`.
  - If none → `403`.
- Attach `req.tenantId` to request.

### 4b. DB helper `server/src/db/tenant.ts`

Provide wrappers:

```ts
export async function tQuery(churchId: number, sql: string, params: any[]) {
  /* add WHERE church_id = ? if missing */
}
export async function tInsert(churchId: number, table: string, row: any) {
  row.church_id = churchId; /* insert */
}
export async function tUpdate(churchId: number, table: string, row: any, where: any) {
  /* ensure where includes church_id */
}
```

For raw SQL hotspots, **migrate to these helpers**; add ESLint rule or grep check to flag queries lacking `church_id` condition.

Commit: `feat(tenant): middleware + tenant-aware db helpers`.

---

## Step 5 — Service Refactors

Refactor high-traffic services first (users, members, events, donations). For each query:

- `SELECT ... WHERE church_id = ?` (bound to `req.tenantId`)
- `INSERT ...` add `church_id = ?`
- `UPDATE ... WHERE church_id = ? AND ...`
- `DELETE ... WHERE church_id = ? AND ...`

Commit in small batches:

```
git commit -m "feat(tenant): scope users service to church_id"
git commit -m "feat(tenant): scope members service to church_id"
```

---

## Step 6 — Views (Optional Convenience, Read-only)

For reporting, create safe views that **require a provided church id** (parameterized at the app layer), e.g.:

- `v_members (SELECT ... FROM members WHERE church_id = ?)`  
  _(App substitutes the `?`—do not create per-church static views in DB.)_

Document in `ops/audit/tenant_views.md`.

---

## Step 7 — Verification

Write `ops/verify/tenant_verify.sh` to run:

```bash
# 1) No cross-church leaks
mysql -N -e "SELECT COUNT(*) FROM members m JOIN users u ON u.id=m.created_by WHERE m.church_id <> u.church_id;"
# 2) Null church rows (should be 0)
mysql -N -e "SELECT TABLE_NAME, COUNT(*) FROM information_schema.COLUMNS c JOIN information_schema.TABLES t
 ON c.TABLE_SCHEMA=t.TABLE_SCHEMA AND c.TABLE_NAME=t.TABLE_NAME
 WHERE t.TABLE_SCHEMA='orthodoxmetrics_db' AND c.COLUMN_NAME='church_id' AND c.IS_NULLABLE='YES'
 GROUP BY TABLE_NAME;"
# 3) App spot check via API with two different tenants (superadmin header)
```

Update `ops/audit/VERIFY_TENANT.md` with results. Commit: `chore(verify): tenant isolation checks`.

---

## Step 8 — Guardrails

- CI: fail build if any SQL in repo matches `orthodoxmetrics_db\.\w+\s` without `church_id` in predicate for DML statements (best-effort grep).
- Add pre-commit hook to grep for `\bFROM\s+\w+\b(?!.*church_id)` in changed SQL/TS queries (heuristic).

Commit: `ci(tenant): add isolation guardrails`.

---

## Acceptance Criteria

- All church data lives in `orthodoxmetrics_db`.
- Every tenant-owned table has `church_id` **NOT NULL**, FK to `churches(id)`, and scoped uniques.
- Server enforces `req.tenantId` on all read/write paths.
- No cross-church reads/writes possible through the API.
- Verification artifacts committed under `ops/audit/*`.

---

## Begin

1. Write `db/sql/04_multitenant_churches.sql` (idempotent).
2. Generate inventory + plan.
3. Apply per-table changes with backfills.
4. Add middleware + DB helpers; refactor top services.
5. Run verification and commit artifacts.
