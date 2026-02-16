# Database Schema and Access

## Overview

MariaDB with mysql2/promise. Two-tier multi-tenant architecture:

- **Platform DB** (`orthodoxmetrics_db`) — shared across all tenants
- **Church DBs** (`om_church_##`) — one per church, numbered by church ID

## Connection Pools

| Pool | Function | Config |
|------|----------|--------|
| App pool | `getAppPool()` | 10 connections, platform DB |
| Auth pool | `getAuthPool()` | 10 connections, platform DB (separate for sessions) |
| Tenant pool | `getTenantPool(churchId)` | 5 connections each, cached in Map |

All pools: mysql2/promise, 60s connect timeout, utf8mb4 charset.

Source: `server/src/config/db.js`

## Platform DB Tables (`orthodoxmetrics_db`)

### Core

| Table | Purpose |
|-------|---------|
| `users` | User accounts (email, password hash, role, church_id) |
| `churches` | Church registry (name, database_name, settings) |
| `sessions` | Express session store (MySQL-backed) |
| `system_logs` | Centralized API request logging (via dbRequestLogger) |
| `system_settings` | Application configuration |

### OCR

| Table | Purpose |
|-------|---------|
| `ocr_jobs` | OCR job queue (platform-level, legacy) |

### OMAI

| Table | Purpose |
|-------|---------|
| `omai_commands` | Command patterns and handlers |
| `omai_logs` | OMAI interaction logs |
| `omai_policies` | AI behavior policies |
| `omai_memories` | AI memory storage |
| `omai_md_catalog` | Markdown documentation catalog |
| (+ ~7 more `omai_*` tables) | Various OMAI subsystems |

### Other

| Table | Purpose |
|-------|---------|
| `notifications` | User notifications |
| `kanban_*` | Kanban board tables |
| `interactive_reports` | Interactive report definitions |
| `daily_tasks` | Daily task queue |

## Church DB Tables (`om_church_##`)

Each church database follows the same schema:

### Records

| Table | Purpose |
|-------|---------|
| `baptism_records` | Baptism sacramental records |
| `marriage_records` | Marriage sacramental records |
| `funeral_records` | Funeral sacramental records |

### OCR (per-church)

| Table | Purpose |
|-------|---------|
| `ocr_jobs` | Church-scoped OCR job queue |
| `ocr_feeder_pages` | OCR page-level data |
| `ocr_feeder_artifacts` | OCR artifacts (images, etc.) |

### Other

| Table | Purpose |
|-------|---------|
| `audit_logs` | Record change audit trail |
| `calendar` | Church calendar events |

## Access Patterns

### Platform queries

```js
const { getAppPool } = require('./config/db');
const pool = getAppPool();
const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
```

### Church-specific queries (by churchId)

```js
const { getTenantPool } = require('./config/db');
const pool = getTenantPool(churchId);
const [rows] = await pool.query('SELECT * FROM baptism_records WHERE id = ?', [recordId]);
```

### Cross-database qualified names

Used in the records controller when churchId is known but you're on the platform pool:

```js
const [rows] = await appPool.query(
  `SELECT * FROM \`om_church_46\`.\`baptism_records\` WHERE id = ?`, [id]
);
```

### resolveChurchDb pattern

The records controller looks up `churches.database_name` from `churchId`, caches it in an in-memory Map:

```js
// In routes/records.js
const dbName = await resolveChurchDb(req); // Returns 'om_church_46'
```

## databaseRouter Middleware

Applied globally before routes (`server/src/middleware/databaseRouter.js`). Sets request properties:

| Path pattern | Sets | Destination |
|-------------|------|-------------|
| Record paths (via `isRecordPath()`) | `req.recordDatabase`, `req.isRecordRequest = true` | Church DB |
| `/api/admin/logs`, `/api/logger`, `/api/errors` | `req.useOmaiDatabase = true` | OMAI error DB |
| Everything else | `req.isRecordRequest = false` | Platform DB |

## db-compat.js

Compatibility layer at `server/src/config/db-compat.js`. Re-exports `getAppPool`, `getAuthPool`, plus a legacy `pool` object and `getChurchDbConnection` from `utils/dbSwitcher`.

## Known Issues

- **`getChurchRecordConnection`** in `services/databaseService.js` is BROKEN — uses undefined `process.env.DB_PASS` (should be `DB_PASSWORD`). Use `getTenantPool(churchId)` instead.
- **Query logging** is always on — all queries logged to console via `logQuery()`. This is verbose in production.

## CLI Database Access

The `mysql` shell client cannot authenticate as `orthodoxapps`. Use node instead:

```bash
node -e "
const mysql = require('mysql2/promise');
(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost', user: 'orthodoxapps',
    password: '...', database: 'orthodoxmetrics_db'
  });
  const [rows] = await conn.query('SELECT COUNT(*) as n FROM users');
  console.log(rows);
  await conn.end();
})();
"
```
