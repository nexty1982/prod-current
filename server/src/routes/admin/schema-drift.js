/**
 * Schema Drift Detector — Admin API
 *
 * Compares actual database schemas (tenant + platform) against their canonical
 * expected definitions and surfaces deviations as structured findings.
 *
 * Canonical source strategy:
 *   - Tenant DBs  → record_template1 (live, introspected at scan time)
 *   - Platform DB → PLATFORM_CANONICAL_SCHEMA (hardcoded required-column manifest)
 *
 * Severity rules are centralized in classifySeverity().
 * SQL generation is read-only output only — nothing is ever executed.
 * ALTER TABLE MODIFY is never generated; type mismatches are manual-review only.
 *
 * Drift categories detected:
 *   MISSING_TABLE, UNEXPECTED_TABLE,
 *   MISSING_COLUMN, UNEXPECTED_COLUMN,
 *   TYPE_MISMATCH (manual review), NULLABILITY_MISMATCH (manual review),
 *   DEFAULT_MISMATCH, PK_MISMATCH (manual review),
 *   MISSING_INDEX, MISSING_UNIQUE_INDEX,
 *   ENGINE_MISMATCH (manual review), COLLATION_MISMATCH (manual review)
 *
 * Impact areas: records | ocr | audit | admin | analytics | unknown
 *
 * Persistence: stateless (in-memory jobs, no DB table). Decision rationale:
 *   scan results are ephemeral diagnostics; adding a schema table risks drift
 *   in that table itself; the refactorConsole.ts pattern is proven and sufficient.
 */

'use strict';

const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();

const axios      = require('axios');
const nodemailer = require('nodemailer');

const { getAppPool } = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { getActiveEmailConfig } = require('../../api/settings');

const requireSuperAdmin = requireRole(['super_admin']);

// ─── Canonical: Tenant DB (sourced from tenantProvisioning.js) ───────────────

const TEMPLATE_DB = 'record_template1';

const EXPECTED_TENANT_TABLES = [
  'activity_log', 'baptism_history', 'baptism_records',
  'change_log', 'church_settings',
  'funeral_history', 'funeral_records',
  'marriage_history', 'marriage_records',
  'ocr_draft_records', 'ocr_feeder_artifacts', 'ocr_feeder_pages',
  'ocr_finalize_history', 'ocr_fused_drafts', 'ocr_jobs',
  'ocr_mappings', 'ocr_settings', 'ocr_setup_state',
  'record_supplements', 'template_meta',
];

const CRITICAL_TENANT_TABLES = new Set([
  'baptism_records', 'baptism_history',
  'marriage_records', 'marriage_history',
  'funeral_records', 'funeral_history',
  'activity_log', 'change_log',
  'church_settings', 'ocr_jobs',
  'ocr_fused_drafts', 'ocr_feeder_pages',
  'record_supplements',
]);

// ─── Canonical: Platform DB (required-column manifest, no type enforcement) ──
//
// Seeded from current known-good orthodoxmetrics_db.
// Type mismatches are not flagged here because platform DB has no migration
// system; only column existence is enforced.
// Update this manifest when new critical columns are intentionally added.

const PLATFORM_CANONICAL_SCHEMA = {
  churches: {
    requiredColumns: [
      'id', 'name', 'email', 'database_name', 'is_active',
      'setup_complete', 'created_at', 'updated_at',
    ],
  },
  ocr_jobs: {
    requiredColumns: [
      'id', 'church_id', 'filename', 'status', 'record_type',
      'language', 'confidence_score', 'ocr_text', 'created_at',
    ],
  },
  tenant_provisioning_log: {
    requiredColumns: [
      'id', 'church_id', 'db_name', 'template_version',
      'status', 'started_at', 'completed_at', 'verification_passed',
    ],
  },
  om_daily_items: {
    requiredColumns: ['id', 'title', 'status', 'priority', 'created_at'],
  },
  image_registry: {
    requiredColumns: ['id', 'image_path', 'category', 'label', 'created_at'],
  },
  image_bindings: {
    requiredColumns: [
      'id', 'page_key', 'image_key', 'scope', 'church_id',
      'image_path', 'priority', 'enabled',
    ],
  },
};

// ─── Impact Map ──────────────────────────────────────────────────────────────

const TABLE_IMPACT_MAP = {
  baptism_records:     ['records'],
  marriage_records:    ['records'],
  funeral_records:     ['records'],
  baptism_history:     ['records', 'audit'],
  marriage_history:    ['records', 'audit'],
  funeral_history:     ['records', 'audit'],
  record_supplements:  ['records'],
  ocr_jobs:            ['ocr'],
  ocr_feeder_pages:    ['ocr'],
  ocr_feeder_artifacts:['ocr'],
  ocr_fused_drafts:    ['ocr'],
  ocr_draft_records:   ['ocr'],
  ocr_finalize_history:['ocr'],
  ocr_mappings:        ['ocr'],
  ocr_settings:        ['ocr'],
  ocr_setup_state:     ['ocr'],
  activity_log:        ['audit'],
  change_log:          ['audit'],
  church_settings:     ['admin'],
  template_meta:       ['admin'],
  churches:            ['admin', 'analytics'],
  tenant_provisioning_log: ['admin'],
  om_daily_items:      ['admin'],
  image_registry:      ['admin', 'analytics'],
  image_bindings:      ['admin'],
};

function getImpactAreas(tableName) {
  return TABLE_IMPACT_MAP[tableName] || ['unknown'];
}

// ─── Severity Rules (centralised) ────────────────────────────────────────────
//
// Rules:
//   critical      — missing critical table; PK missing or changed
//   high          — missing non-critical expected table; missing column in
//                   critical table; missing unique index; platform table absent
//   medium        — missing column (non-critical table); type/nullability
//                   mismatch; missing regular index; FK mismatch
//   low           — default mismatch; engine mismatch; collation mismatch
//   informational — unexpected table; unexpected column

function classifySeverity(driftType, ctx = {}) {
  switch (driftType) {
    case 'MISSING_TABLE':
      return ctx.isCritical ? 'critical' : 'high';

    case 'MISSING_COLUMN':
      return ctx.isCritical ? 'high' : 'medium';

    case 'PK_MISMATCH':
      return 'critical';

    case 'TABLE_MISSING_PLATFORM':
    case 'MISSING_UNIQUE_INDEX':
    case 'COLUMN_MISSING_PLATFORM':
      return 'high';

    case 'TYPE_MISMATCH':
    case 'NULLABILITY_MISMATCH':
    case 'MISSING_INDEX':
    case 'FK_MISMATCH':
      return 'medium';

    case 'DEFAULT_MISMATCH':
    case 'ENGINE_MISMATCH':
    case 'COLLATION_MISMATCH':
      return 'low';

    case 'UNEXPECTED_TABLE':
    case 'UNEXPECTED_COLUMN':
      return 'informational';

    default:
      return 'informational';
  }
}

// ─── Schema Introspection Helpers ─────────────────────────────────────────────
//
// All queries use information_schema via getAppPool().
// The orthodoxapps user has SELECT on information_schema for all schemas.
// Batch queries accept an array of schema names to avoid N+1.

async function batchFetchColumns(pool, schemaNames) {
  if (!schemaNames.length) return {};
  const [rows] = await pool.query(
    `SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, ORDINAL_POSITION,
            COLUMN_DEFAULT, IS_NULLABLE, DATA_TYPE, COLUMN_TYPE,
            CHARACTER_SET_NAME, COLLATION_NAME, COLUMN_KEY, EXTRA
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA IN (?)
     ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION`,
    [schemaNames]
  );
  // Index: schema → table → columns[]
  const index = {};
  for (const r of rows) {
    if (!index[r.TABLE_SCHEMA]) index[r.TABLE_SCHEMA] = {};
    if (!index[r.TABLE_SCHEMA][r.TABLE_NAME]) index[r.TABLE_SCHEMA][r.TABLE_NAME] = [];
    index[r.TABLE_SCHEMA][r.TABLE_NAME].push({
      name:       r.COLUMN_NAME,
      position:   r.ORDINAL_POSITION,
      default:    r.COLUMN_DEFAULT,
      nullable:   r.IS_NULLABLE === 'YES',
      dataType:   r.DATA_TYPE,
      columnType: r.COLUMN_TYPE,
      charSet:    r.CHARACTER_SET_NAME,
      collation:  r.COLLATION_NAME,
      key:        r.COLUMN_KEY,
      extra:      r.EXTRA,
    });
  }
  return index;
}

async function batchFetchIndexes(pool, schemaNames) {
  if (!schemaNames.length) return {};
  const [rows] = await pool.query(
    `SELECT TABLE_SCHEMA, TABLE_NAME, INDEX_NAME, NON_UNIQUE,
            SEQ_IN_INDEX, COLUMN_NAME, INDEX_TYPE
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA IN (?)
     ORDER BY TABLE_SCHEMA, TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
    [schemaNames]
  );
  // Index: schema → table → indexName → {name, unique, columns[], indexType}
  const index = {};
  for (const r of rows) {
    if (!index[r.TABLE_SCHEMA]) index[r.TABLE_SCHEMA] = {};
    if (!index[r.TABLE_SCHEMA][r.TABLE_NAME]) index[r.TABLE_SCHEMA][r.TABLE_NAME] = {};
    if (!index[r.TABLE_SCHEMA][r.TABLE_NAME][r.INDEX_NAME]) {
      index[r.TABLE_SCHEMA][r.TABLE_NAME][r.INDEX_NAME] = {
        name:      r.INDEX_NAME,
        unique:    r.NON_UNIQUE === 0,
        columns:   [],
        indexType: r.INDEX_TYPE,
      };
    }
    index[r.TABLE_SCHEMA][r.TABLE_NAME][r.INDEX_NAME].columns.push(r.COLUMN_NAME);
  }
  return index;
}

async function batchFetchTableMeta(pool, schemaNames) {
  if (!schemaNames.length) return {};
  const [rows] = await pool.query(
    `SELECT TABLE_SCHEMA, TABLE_NAME, ENGINE, TABLE_COLLATION, TABLE_ROWS
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA IN (?) AND TABLE_TYPE = 'BASE TABLE'`,
    [schemaNames]
  );
  // Index: schema → table → {engine, collation, rows}
  const index = {};
  for (const r of rows) {
    if (!index[r.TABLE_SCHEMA]) index[r.TABLE_SCHEMA] = {};
    index[r.TABLE_SCHEMA][r.TABLE_NAME] = {
      engine:    r.ENGINE,
      collation: r.TABLE_COLLATION,
      rows:      r.TABLE_ROWS,
    };
  }
  return index;
}

// ─── Template Schema Loader ───────────────────────────────────────────────────

async function loadTemplateSchema(pool) {
  const [schemaRows] = await pool.query(
    'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
    [TEMPLATE_DB]
  );
  if (!schemaRows.length) {
    return {
      valid: false,
      reason: `Template database "${TEMPLATE_DB}" does not exist`,
      tables: {}, indexes: {}, tableMeta: {},
      version: null, frozenAt: null,
    };
  }

  let version = null;
  let frozenAt = null;
  try {
    const [meta] = await pool.query(
      `SELECT \`version\`, frozen_at FROM \`${TEMPLATE_DB}\`.template_meta LIMIT 1`
    );
    if (meta.length) { version = meta[0].version; frozenAt = meta[0].frozen_at; }
  } catch (_) { /* template_meta may not be queryable this way */ }

  const schemaNames = [TEMPLATE_DB];
  const [colIdx, idxIdx, metaIdx] = await Promise.all([
    batchFetchColumns(pool, schemaNames),
    batchFetchIndexes(pool, schemaNames),
    batchFetchTableMeta(pool, schemaNames),
  ]);

  return {
    valid: true,
    version,
    frozenAt,
    tables:    colIdx[TEMPLATE_DB]  || {},
    indexes:   idxIdx[TEMPLATE_DB]  || {},
    tableMeta: metaIdx[TEMPLATE_DB] || {},
  };
}

// ─── Column Diff ─────────────────────────────────────────────────────────────

function diffColumns(expectedCols, actualCols, tableName, scope) {
  const findings = [];
  const isCritical = CRITICAL_TENANT_TABLES.has(tableName);
  const expMap = new Map(expectedCols.map(c => [c.name, c]));
  const actMap = new Map(actualCols.map(c => [c.name, c]));

  for (const [name, exp] of expMap) {
    if (!actMap.has(name)) {
      const nullClause = exp.nullable ? '' : ' NOT NULL';
      const defClause  = exp.default !== null && exp.default !== undefined
        ? ` DEFAULT '${String(exp.default).replace(/'/g, "\\'")}'`
        : '';
      findings.push({
        scope, table: tableName, column: name,
        driftType:  'MISSING_COLUMN',
        severity:   classifySeverity('MISSING_COLUMN', { isCritical }),
        expected:   exp.columnType,
        actual:     null,
        impact:     getImpactAreas(tableName),
        fix:        `ADD COLUMN \`${name}\` ${exp.columnType}${nullClause}${defClause}`,
        remediable: true,
        manualReview: false,
      });
      continue;
    }

    const act = actMap.get(name);

    // Type mismatch — manual review only, no MODIFY generated
    if (exp.columnType !== act.columnType) {
      findings.push({
        scope, table: tableName, column: name,
        driftType:   'TYPE_MISMATCH',
        severity:    classifySeverity('TYPE_MISMATCH'),
        expected:    exp.columnType,
        actual:      act.columnType,
        impact:      getImpactAreas(tableName),
        fix:         null,
        remediable:  false,
        manualReview: true,
        manualNote:  'ALTER TABLE MODIFY is never generated. Verify data compatibility before changing.',
      });
    }

    // Nullability mismatch — manual review
    if (exp.nullable !== act.nullable) {
      findings.push({
        scope, table: tableName, column: name,
        driftType:   'NULLABILITY_MISMATCH',
        severity:    classifySeverity('NULLABILITY_MISMATCH'),
        expected:    exp.nullable ? 'NULL' : 'NOT NULL',
        actual:      act.nullable ? 'NULL' : 'NOT NULL',
        impact:      getImpactAreas(tableName),
        fix:         null,
        remediable:  false,
        manualReview: true,
        manualNote:  'Nullability change may break existing rows. Manual review required.',
      });
    }

    // Default mismatch (informational / low)
    const expDef = exp.default === null ? 'NULL' : String(exp.default);
    const actDef = act.default === null ? 'NULL' : String(act.default);
    if (expDef !== actDef) {
      findings.push({
        scope, table: tableName, column: name,
        driftType:   'DEFAULT_MISMATCH',
        severity:    classifySeverity('DEFAULT_MISMATCH'),
        expected:    expDef,
        actual:      actDef,
        impact:      getImpactAreas(tableName),
        fix:         `ALTER TABLE \`${tableName}\` ALTER COLUMN \`${name}\` SET DEFAULT '${expDef}'`,
        remediable:  expDef !== 'NULL',
        manualReview: false,
      });
    }

    // PK mismatch — critical, manual review
    if (exp.key === 'PRI' && act.key !== 'PRI') {
      findings.push({
        scope, table: tableName, column: name,
        driftType:   'PK_MISMATCH',
        severity:    classifySeverity('PK_MISMATCH'),
        expected:    'PRIMARY KEY',
        actual:      act.key || 'none',
        impact:      getImpactAreas(tableName),
        fix:         null,
        remediable:  false,
        manualReview: true,
        manualNote:  'Primary key changes require data-level validation and manual DDL.',
      });
    }
  }

  // Unexpected columns
  for (const [name, act] of actMap) {
    if (!expMap.has(name)) {
      findings.push({
        scope, table: tableName, column: name,
        driftType:   'UNEXPECTED_COLUMN',
        severity:    classifySeverity('UNEXPECTED_COLUMN'),
        expected:    null,
        actual:      act.columnType,
        impact:      getImpactAreas(tableName),
        fix:         null,
        remediable:  false,
        manualReview: false,
      });
    }
  }

  return findings;
}

// ─── Index Diff ───────────────────────────────────────────────────────────────

function diffIndexes(expectedIdxMap, actualIdxMap, tableName, scope) {
  const findings = [];
  if (!expectedIdxMap || !actualIdxMap) return findings;

  for (const [idxName, exp] of Object.entries(expectedIdxMap)) {
    if (idxName === 'PRIMARY') continue; // PK handled in column diff

    if (!actualIdxMap[idxName]) {
      const driftType = exp.unique ? 'MISSING_UNIQUE_INDEX' : 'MISSING_INDEX';
      const colsBackticked = exp.columns.map(c => `\`${c}\``).join(', ');
      findings.push({
        scope, table: tableName, column: null,
        indexName:   idxName,
        driftType,
        severity:    classifySeverity(driftType),
        expected:    `${exp.unique ? 'UNIQUE ' : ''}INDEX \`${idxName}\` (${exp.columns.join(', ')})`,
        actual:      null,
        impact:      getImpactAreas(tableName),
        fix:         `ADD ${exp.unique ? 'UNIQUE ' : ''}INDEX \`${idxName}\` (${colsBackticked})`,
        remediable:  true,
        manualReview: false,
      });
    }
  }

  return findings;
}

// ─── Tenant Scanner ───────────────────────────────────────────────────────────

function buildTenantFindings(dbName, colsByTable, idxsByTable, metaByTable, templateSchema) {
  const findings = [];
  const scope = `tenant:${dbName}`;

  const actualTableNames = new Set(Object.keys(colsByTable));
  const expectedSet      = new Set(EXPECTED_TENANT_TABLES);

  // Missing expected tables
  for (const t of expectedSet) {
    if (!actualTableNames.has(t)) {
      findings.push({
        scope, table: t, column: null,
        driftType:   'MISSING_TABLE',
        severity:    classifySeverity('MISSING_TABLE', { isCritical: CRITICAL_TENANT_TABLES.has(t) }),
        expected:    'table should exist',
        actual:      null,
        impact:      getImpactAreas(t),
        fix:         null,
        remediable:  false,
        manualReview: true,
        manualNote:  `Run SHOW CREATE TABLE \`${TEMPLATE_DB}\`.\`${t}\` to obtain DDL.`,
      });
    }
  }

  // Unexpected tables
  for (const t of actualTableNames) {
    if (!expectedSet.has(t)) {
      findings.push({
        scope, table: t, column: null,
        driftType:   'UNEXPECTED_TABLE',
        severity:    classifySeverity('UNEXPECTED_TABLE'),
        expected:    null,
        actual:      'exists but not in expected set',
        impact:      getImpactAreas(t),
        fix:         null,
        remediable:  false,
        manualReview: false,
      });
    }
  }

  // Per-table deep diff only for tables that exist in both actual and template
  if (templateSchema.valid) {
    for (const tableName of EXPECTED_TENANT_TABLES) {
      if (!actualTableNames.has(tableName)) continue;

      const templateCols = templateSchema.tables[tableName]   || [];
      const actualCols   = colsByTable[tableName]             || [];
      const templateIdxs = templateSchema.indexes[tableName]  || {};
      const actualIdxs   = idxsByTable[tableName]             || {};
      const tmplMeta     = templateSchema.tableMeta[tableName] || {};
      const actMeta      = metaByTable[tableName]             || {};

      findings.push(...diffColumns(templateCols, actualCols, tableName, scope));
      findings.push(...diffIndexes(templateIdxs, actualIdxs, tableName, scope));

      if (tmplMeta.engine && actMeta.engine && tmplMeta.engine !== actMeta.engine) {
        findings.push({
          scope, table: tableName, column: null,
          driftType: 'ENGINE_MISMATCH', severity: classifySeverity('ENGINE_MISMATCH'),
          expected: tmplMeta.engine, actual: actMeta.engine,
          impact: getImpactAreas(tableName), fix: null, remediable: false, manualReview: true,
          manualNote: 'Engine changes require careful migration planning.',
        });
      }

      if (tmplMeta.collation && actMeta.collation && tmplMeta.collation !== actMeta.collation) {
        findings.push({
          scope, table: tableName, column: null,
          driftType: 'COLLATION_MISMATCH', severity: classifySeverity('COLLATION_MISMATCH'),
          expected: tmplMeta.collation, actual: actMeta.collation,
          impact: getImpactAreas(tableName), fix: null, remediable: false, manualReview: true,
          manualNote: 'Collation changes may require CONVERT TO CHARACTER SET.',
        });
      }
    }
  }

  return findings;
}

// ─── Platform DB Scanner ──────────────────────────────────────────────────────

async function scanPlatformDb(pool) {
  const scope = 'platform:orthodoxmetrics_db';

  let colsByTable;
  try {
    const colIdx = await batchFetchColumns(pool, ['orthodoxmetrics_db']);
    colsByTable = colIdx['orthodoxmetrics_db'] || {};
  } catch (err) {
    return { findings: [], accessible: false, error: `Cannot access platform schema: ${err.message}` };
  }

  const actualTableNames = new Set(Object.keys(colsByTable));
  const findings = [];

  for (const [tableName, spec] of Object.entries(PLATFORM_CANONICAL_SCHEMA)) {
    if (!actualTableNames.has(tableName)) {
      findings.push({
        scope, table: tableName, column: null,
        driftType:   'TABLE_MISSING_PLATFORM',
        severity:    classifySeverity('TABLE_MISSING_PLATFORM'),
        expected:    'table should exist in platform DB',
        actual:      null,
        impact:      getImpactAreas(tableName),
        fix:         null,
        remediable:  false,
        manualReview: true,
      });
      continue;
    }

    const actualColNames = new Set((colsByTable[tableName] || []).map(c => c.name));
    for (const colName of spec.requiredColumns) {
      if (!actualColNames.has(colName)) {
        findings.push({
          scope, table: tableName, column: colName,
          driftType:   'COLUMN_MISSING_PLATFORM',
          severity:    classifySeverity('COLUMN_MISSING_PLATFORM'),
          expected:    `column "${colName}" should exist`,
          actual:      null,
          impact:      getImpactAreas(tableName),
          fix:         null,
          remediable:  false,
          manualReview: true,
          manualNote:  'Platform canonical schema enforces column existence only (no type info). Review migrations.',
        });
      }
    }
  }

  return { findings, accessible: true, error: null };
}

// ─── SQL Remediation Generator ────────────────────────────────────────────────
//
// Rules:
//   - Only ADD COLUMN IF NOT EXISTS, ADD INDEX, ADD UNIQUE INDEX
//   - Never ALTER TABLE MODIFY (type changes are manual-review)
//   - Never DROP TABLE, DROP COLUMN, DROP INDEX
//   - Generated SQL is a string — never executed by this service

function generateRemediationSql(allTenantResults, platformResult, targetDb) {
  const ts = new Date().toISOString();
  const lines = [];

  // Flatten findings scoped to targetDb (or all if null)
  const allResults = [
    ...(platformResult ? [{ dbName: 'orthodoxmetrics_db', findings: platformResult.findings || [] }] : []),
    ...(allTenantResults || []).map(r => ({ dbName: r.dbName, findings: r.findings || [] })),
  ];

  const scoped = targetDb
    ? allResults.filter(r => r.dbName === targetDb)
    : allResults;

  const totalFindings = scoped.reduce((n, r) => n + r.findings.length, 0);
  const remediable    = scoped.reduce((n, r) => n + r.findings.filter(f => f.remediable && f.fix).length, 0);
  const manualCount   = totalFindings - remediable;

  lines.push('-- ============================================================');
  lines.push('-- Schema Drift Remediation SQL');
  lines.push(`-- Target:    ${targetDb || 'all scanned databases'}`);
  lines.push(`-- Generated: ${ts}`);
  lines.push(`-- Issues:    ${totalFindings} total  |  ${remediable} auto-remediable  |  ${manualCount} manual-review`);
  lines.push('-- WARNING:   REVIEW ALL STATEMENTS BEFORE RUNNING.');
  lines.push('--            Test on a non-production database first.');
  lines.push('--            This script will NOT drop tables, columns, or indexes.');
  lines.push('--            ALTER TABLE MODIFY is never generated (type mismatches');
  lines.push('--            require manual assessment).');
  lines.push('-- ============================================================');
  lines.push('');

  let hasRemediable = false;

  for (const { dbName, findings } of scoped) {
    const actionable = findings.filter(f => f.remediable && f.fix);
    if (!actionable.length) continue;
    hasRemediable = true;

    lines.push(`-- ── ${dbName} ${'─'.repeat(Math.max(0, 54 - dbName.length))}`);
    lines.push('');

    for (const f of actionable) {
      const label = f.column ? `${f.table}.${f.column}` : f.table;
      lines.push(`-- [${f.severity.toUpperCase()}] ${f.driftType}: ${label}`);
      if (f.driftType === 'MISSING_COLUMN') {
        lines.push(`ALTER TABLE \`${dbName}\`.\`${f.table}\` ${f.fix};`);
      } else if (f.driftType === 'MISSING_INDEX' || f.driftType === 'MISSING_UNIQUE_INDEX') {
        lines.push(`ALTER TABLE \`${dbName}\`.\`${f.table}\` ${f.fix};`);
      } else if (f.driftType === 'DEFAULT_MISMATCH' && f.fix) {
        lines.push(`-- (verify before applying default change)`);
        lines.push(`-- ${f.fix};`);
      } else {
        lines.push(`-- ${f.fix};`);
      }
      lines.push('');
    }
  }

  if (!hasRemediable) {
    lines.push('-- No auto-remediable issues found for the selected scope.');
    lines.push('');
  }

  // Manual-review section
  const allManual = scoped.flatMap(r =>
    r.findings.filter(f => f.manualReview || (!f.remediable && f.driftType !== 'UNEXPECTED_TABLE' && f.driftType !== 'UNEXPECTED_COLUMN'))
  );

  if (allManual.length) {
    lines.push('-- ============================================================');
    lines.push(`-- MANUAL REVIEW REQUIRED (${allManual.length} issues)`);
    lines.push('-- These changes cannot be safely auto-generated.');
    lines.push('-- ============================================================');
    lines.push('');
    for (const f of allManual) {
      const label = f.column ? `${f.scope} / ${f.table}.${f.column}` : `${f.scope} / ${f.table}`;
      lines.push(`-- [${f.severity.toUpperCase()}] ${f.driftType}: ${label}`);
      if (f.expected) lines.push(`--   Expected : ${f.expected}`);
      if (f.actual)   lines.push(`--   Actual   : ${f.actual}`);
      if (f.manualNote) lines.push(`--   Note     : ${f.manualNote}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ─── Job System ───────────────────────────────────────────────────────────────

const _jobs = new Map();

function createJob(params) {
  const jobId = crypto.randomUUID();
  _jobs.set(jobId, {
    id:          jobId,
    status:      'pending',
    progress:    { current: 0, total: 0, stage: 'queued' },
    params,
    result:      null,
    error:       null,
    createdAt:   new Date().toISOString(),
    completedAt: null,
  });
  return jobId;
}

// Prune jobs older than 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of _jobs.entries()) {
    if (new Date(job.createdAt).getTime() < cutoff) _jobs.delete(id);
  }
}, 10 * 60 * 1000).unref();

// ─── Suppression Table Bootstrap ────────────────────────────────────────────
//
// schema_drift_suppressions lives in orthodoxmetrics_db.
// Auto-created on module load; failure is logged but non-fatal.

const VALID_SCOPE_TYPES = new Set(['platform', 'tenant', 'all']);
const VALID_SEVERITIES  = new Set(['critical', 'high', 'medium', 'low', 'informational']);
const VALID_DRIFT_TYPES = new Set([
  'MISSING_TABLE', 'UNEXPECTED_TABLE',
  'MISSING_COLUMN', 'UNEXPECTED_COLUMN',
  'TYPE_MISMATCH', 'NULLABILITY_MISMATCH',
  'DEFAULT_MISMATCH', 'PK_MISMATCH',
  'MISSING_INDEX', 'MISSING_UNIQUE_INDEX',
  'ENGINE_MISMATCH', 'COLLATION_MISMATCH',
  'TABLE_MISSING_PLATFORM', 'COLUMN_MISSING_PLATFORM',
]);

async function ensureSuppressionsTable() {
  const pool = getAppPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_drift_suppressions (
      id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
      is_active      TINYINT(1)   NOT NULL DEFAULT 1,
      name           VARCHAR(255) NOT NULL,
      description    TEXT         DEFAULT NULL,
      scope_type     ENUM('platform','tenant','all') NOT NULL DEFAULT 'all',
      target_db      VARCHAR(255) DEFAULT NULL,
      drift_type     VARCHAR(60)  DEFAULT NULL,
      table_name     VARCHAR(255) DEFAULT NULL,
      column_name    VARCHAR(255) DEFAULT NULL,
      severity       ENUM('critical','high','medium','low','informational') DEFAULT NULL,
      match_expected VARCHAR(500) DEFAULT NULL,
      match_actual   VARCHAR(500) DEFAULT NULL,
      created_by     VARCHAR(255) NOT NULL,
      created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

ensureSuppressionsTable().catch(err => {
  console.error('[schema-drift] Failed to ensure suppressions table:', err.message);
});

// ─── Phase 4: Persistence Tables Bootstrap ────────────────────────────────────
//
// schema_drift_scan_runs     — one row per completed or failed persisted scan
// schema_drift_schedule      — single-row schedule config (id=1)
// schema_drift_notifications — actionable delta events for admin review
//
// findings_snapshot stores raw findings JSON so delta can compare without
// relying on in-memory jobs (which are ephemeral and pruned after 30 min).

async function ensurePersistenceTables() {
  const pool = getAppPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_drift_scan_runs (
      id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
      triggered_by          VARCHAR(255) NOT NULL,
      scope_type            VARCHAR(60)  NOT NULL DEFAULT 'all',
      scope_payload         JSON         DEFAULT NULL,
      status                ENUM('running','complete','error') NOT NULL DEFAULT 'running',
      started_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at          DATETIME     DEFAULT NULL,
      total_findings_raw    INT UNSIGNED NOT NULL DEFAULT 0,
      total_findings_active INT UNSIGNED NOT NULL DEFAULT 0,
      total_suppressed      INT UNSIGNED NOT NULL DEFAULT 0,
      critical_count        INT UNSIGNED NOT NULL DEFAULT 0,
      high_count            INT UNSIGNED NOT NULL DEFAULT 0,
      medium_count          INT UNSIGNED NOT NULL DEFAULT 0,
      low_count             INT UNSIGNED NOT NULL DEFAULT 0,
      informational_count   INT UNSIGNED NOT NULL DEFAULT 0,
      findings_snapshot     LONGTEXT     DEFAULT NULL,
      error_message         TEXT         DEFAULT NULL,
      PRIMARY KEY (id),
      INDEX idx_scope_status (scope_type, status),
      INDEX idx_started_at   (started_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_drift_schedule (
      id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
      is_enabled   TINYINT(1)   NOT NULL DEFAULT 0,
      frequency    ENUM('daily','weekly') NOT NULL DEFAULT 'daily',
      scope_type   VARCHAR(60)  NOT NULL DEFAULT 'all',
      run_hour_utc TINYINT      NOT NULL DEFAULT 2,
      updated_by   VARCHAR(255) DEFAULT NULL,
      updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    INSERT IGNORE INTO schema_drift_schedule (id, is_enabled, frequency, scope_type, run_hour_utc)
    VALUES (1, 0, 'daily', 'all', 2)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_drift_notifications (
      id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
      run_id       INT UNSIGNED NOT NULL,
      severity     ENUM('critical','high','medium','low','informational') NOT NULL,
      event_type   VARCHAR(60)  NOT NULL,
      title        VARCHAR(500) NOT NULL,
      body         TEXT         DEFAULT NULL,
      is_read      TINYINT(1)   NOT NULL DEFAULT 0,
      created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_run_id     (run_id),
      INDEX idx_is_read    (is_read),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Phase 5: Notification delivery config + delivery log ─────────────────
  //
  // schema_drift_notif_config: single-row (id=1) delivery settings.
  //   Separate from schema_drift_schedule: different concern, different editor.
  //
  // schema_drift_notif_delivery_log: one row per delivery attempt.
  //   Queryable for UI display and debugging. notification_id is nullable
  //   to support test deliveries that don't produce a notifications row.

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_drift_notif_config (
      id                  TINYINT UNSIGNED NOT NULL DEFAULT 1,
      is_enabled          TINYINT(1)    NOT NULL DEFAULT 0,
      email_enabled       TINYINT(1)    NOT NULL DEFAULT 0,
      webhook_enabled     TINYINT(1)    NOT NULL DEFAULT 0,
      recipient_emails    TEXT          NOT NULL DEFAULT '',
      webhook_url         VARCHAR(1000) DEFAULT NULL,
      webhook_secret      VARCHAR(255)  DEFAULT NULL,
      min_severity        ENUM('critical','high') NOT NULL DEFAULT 'high',
      notify_new_critical TINYINT(1)    NOT NULL DEFAULT 1,
      notify_new_high     TINYINT(1)    NOT NULL DEFAULT 1,
      notify_surge        TINYINT(1)    NOT NULL DEFAULT 0,
      cooldown_minutes    INT UNSIGNED  NOT NULL DEFAULT 60,
      updated_by          VARCHAR(255)  DEFAULT NULL,
      updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    INSERT IGNORE INTO schema_drift_notif_config (id) VALUES (1)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_drift_notif_delivery_log (
      id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
      notification_id INT UNSIGNED DEFAULT NULL,
      run_id          INT UNSIGNED NOT NULL,
      channel         ENUM('email','webhook') NOT NULL,
      event_type      VARCHAR(60)  NOT NULL,
      status          ENUM('sent','failed','skipped') NOT NULL,
      detail          TEXT         DEFAULT NULL,
      attempted_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_run        (run_id),
      INDEX idx_notif      (notification_id),
      INDEX idx_evt_status (event_type, status, attempted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Phase 6A: Distributed scan lock ──────────────────────────────────────
  //
  // Design: DB row-level lock with PRIMARY KEY on lock_key.
  //   Acquire = DELETE stale (expires_at < NOW()) then INSERT IGNORE.
  //   These two operations are sequential but:
  //     - DELETE only removes *expired* rows, not any active lock
  //     - INSERT IGNORE silently fails if the key already exists
  //   Result: only one caller wins the INSERT; the rest get rows_affected=0.
  //
  //   Why this over MySQL GET_LOCK():
  //     + Survives connection pool churn (GET_LOCK is connection-scoped)
  //     + Observable in the UI (SELECT the table)
  //     + Records owner, run_id, timestamps for auditability
  //     + Compatible with multi-instance deployments
  //   Why not SELECT FOR UPDATE:
  //     - Requires explicit transaction; INSERT IGNORE is cleaner here.
  //
  //   Stale lock recovery: locks have an expires_at. On every acquire attempt,
  //   expired locks are cleared first. A crashed scan can never block future
  //   scans beyond the TTL (default 30 minutes, stored in retention config).

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_drift_scan_lock (
      lock_key   VARCHAR(60)   NOT NULL,
      locked_by  VARCHAR(255)  NOT NULL,
      run_id     INT UNSIGNED  DEFAULT NULL,
      locked_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME      NOT NULL,
      PRIMARY KEY (lock_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Phase 6B: Retention policy configuration ─────────────────────────────
  //
  // Single-row config (id=1). auto_cleanup_enabled triggers cleanup
  // automatically after each scheduled scan.
  //
  // Retention windows:
  //   retention_scan_runs_days    — delete scan run rows beyond this age
  //   retention_snapshot_days     — NULL-out findings_snapshot beyond this age
  //                                  (preserves the run row for history, just
  //                                   drops the large LONGTEXT payload)
  //   retention_delivery_log_days — delete delivery log rows beyond this age
  //   retention_notif_days        — delete notification rows beyond this age
  //   min_runs_to_keep            — safety: never delete the most recent N runs
  //                                  regardless of age
  //   scan_lock_ttl_minutes       — how long before an acquired lock expires

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_drift_retention_config (
      id                          TINYINT UNSIGNED NOT NULL DEFAULT 1,
      retention_scan_runs_days    INT UNSIGNED NOT NULL DEFAULT 90,
      retention_snapshot_days     INT UNSIGNED NOT NULL DEFAULT 30,
      retention_delivery_log_days INT UNSIGNED NOT NULL DEFAULT 60,
      retention_notif_days        INT UNSIGNED NOT NULL DEFAULT 180,
      min_runs_to_keep            INT UNSIGNED NOT NULL DEFAULT 10,
      scan_lock_ttl_minutes       INT UNSIGNED NOT NULL DEFAULT 30,
      auto_cleanup_enabled        TINYINT(1)   NOT NULL DEFAULT 0,
      updated_by                  VARCHAR(255) DEFAULT NULL,
      updated_at                  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    INSERT IGNORE INTO schema_drift_retention_config (id) VALUES (1)
  `);

  // ── Phase 6C: Retention cleanup history ──────────────────────────────────

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_drift_retention_log (
      id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
      triggered_by         VARCHAR(255) NOT NULL,
      dry_run              TINYINT(1)   NOT NULL DEFAULT 0,
      runs_deleted         INT UNSIGNED NOT NULL DEFAULT 0,
      snapshots_nulled     INT UNSIGNED NOT NULL DEFAULT 0,
      delivery_log_deleted INT UNSIGNED NOT NULL DEFAULT 0,
      notifs_deleted       INT UNSIGNED NOT NULL DEFAULT 0,
      error_message        TEXT         DEFAULT NULL,
      executed_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_executed_at (executed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

ensurePersistenceTables().catch(err => {
  console.error('[schema-drift] Failed to ensure persistence tables:', err.message);
});

// ─── Suppression Matching Engine ──────────────────────────────────────────────
//
// Rules:
//   - null / undefined field on a rule means "match any" (wildcard)
//   - '*' in drift_type, table_name, or column_name also means "match any"
//   - target_db is an exact DB name match (extracted from finding.scope)
//   - match_expected / match_actual use substring containment (no regex, no fuzzy)
//   - No critical findings are suppressed unless a rule explicitly targets them
//   - The engine is deterministic: same rule + same finding = same result, always

function matchesSuppression(finding, rule) {
  // scope_type: 'platform' | 'tenant' | 'all'
  if (rule.scope_type && rule.scope_type !== 'all') {
    const findingScope = finding.scope || '';
    const isPlatform   = findingScope.startsWith('platform:');
    const isTenant     = findingScope.startsWith('tenant:');
    if (rule.scope_type === 'platform' && !isPlatform) return false;
    if (rule.scope_type === 'tenant'   && !isTenant)   return false;
  }

  // target_db: extract DB name from "platform:db" or "tenant:db"
  if (rule.target_db) {
    const findingDb = (finding.scope || '').replace(/^(?:platform|tenant):/, '');
    if (findingDb !== rule.target_db) return false;
  }

  // drift_type: exact match or null / '*' = any
  if (rule.drift_type && rule.drift_type !== '*') {
    if (finding.driftType !== rule.drift_type) return false;
  }

  // table_name: exact match or null / '*' = any
  if (rule.table_name && rule.table_name !== '*') {
    if (finding.table !== rule.table_name) return false;
  }

  // column_name: exact match or null / '*' = any
  // Note: finding.column may be null (table-level findings)
  if (rule.column_name && rule.column_name !== '*') {
    if ((finding.column ?? null) !== rule.column_name) return false;
  }

  // severity: exact match or null = any
  if (rule.severity) {
    if (finding.severity !== rule.severity) return false;
  }

  // match_expected: substring containment or null / '*' = any
  if (rule.match_expected && rule.match_expected !== '*') {
    const hay = finding.expected !== null && finding.expected !== undefined
      ? String(finding.expected) : '';
    if (!hay.includes(rule.match_expected)) return false;
  }

  // match_actual: substring containment or null / '*' = any
  if (rule.match_actual && rule.match_actual !== '*') {
    const hay = finding.actual !== null && finding.actual !== undefined
      ? String(finding.actual) : '';
    if (!hay.includes(rule.match_actual)) return false;
  }

  return true;
}

// Annotate findings with suppression metadata.
// Returns a NEW array — original findings are never mutated.
// Each finding gains: suppressed: bool, suppressedBy: { id, name } | null
function annotateSuppression(findings, rules) {
  const activeRules = rules.filter(r => r.is_active);
  return findings.map(finding => {
    for (const rule of activeRules) {
      if (matchesSuppression(finding, rule)) {
        return { ...finding, suppressed: true,  suppressedBy: { id: rule.id, name: rule.name } };
      }
    }
    return { ...finding, suppressed: false, suppressedBy: null };
  });
}

// Load suppression rules from the platform DB
async function loadSuppressionRules(pool, activeOnly = false) {
  const sql = activeOnly
    ? 'SELECT * FROM schema_drift_suppressions WHERE is_active = 1 ORDER BY id'
    : 'SELECT * FROM schema_drift_suppressions ORDER BY id';
  const [rows] = await pool.query(sql);
  return rows;
}

// ─── Scan Run Persistence Helpers ─────────────────────────────────────────────

async function persistScanRun(pool, { triggeredBy, scopeType, scopePayload,
    status, startedAt, completedAt, summary, allFindings, errorMessage }) {
  const bySev = summary?.bySeverity || {};
  const [ins] = await pool.query(
    `INSERT INTO schema_drift_scan_runs
       (triggered_by, scope_type, scope_payload, status, started_at, completed_at,
        total_findings_raw, total_findings_active, total_suppressed,
        critical_count, high_count, medium_count, low_count, informational_count,
        findings_snapshot, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      triggeredBy,
      scopeType,
      scopePayload ? JSON.stringify(scopePayload) : null,
      status,
      startedAt,
      completedAt || null,
      summary?.totalFindings          || 0,
      summary?.activeFindings         ?? summary?.totalFindings ?? 0,
      summary?.suppressedFindings     || 0,
      bySev.critical                  || 0,
      bySev.high                      || 0,
      bySev.medium                    || 0,
      bySev.low                       || 0,
      bySev.informational             || 0,
      allFindings ? JSON.stringify(allFindings) : null,
      errorMessage || null,
    ]
  );
  return ins.insertId;
}

async function updateScanRun(pool, runId, { status, completedAt, summary,
    allFindings, errorMessage }) {
  const bySev = summary?.bySeverity || {};
  await pool.query(
    `UPDATE schema_drift_scan_runs
     SET status=?, completed_at=?,
         total_findings_raw=?, total_findings_active=?, total_suppressed=?,
         critical_count=?, high_count=?, medium_count=?,
         low_count=?, informational_count=?,
         findings_snapshot=?, error_message=?
     WHERE id=?`,
    [
      status,
      completedAt || null,
      summary?.totalFindings          || 0,
      summary?.activeFindings         ?? summary?.totalFindings ?? 0,
      summary?.suppressedFindings     || 0,
      bySev.critical                  || 0,
      bySev.high                      || 0,
      bySev.medium                    || 0,
      bySev.low                       || 0,
      bySev.informational             || 0,
      allFindings ? JSON.stringify(allFindings) : null,
      errorMessage || null,
      runId,
    ]
  );
}

// ─── Phase 6: Distributed Scan Lock ───────────────────────────────────────────
//
// LOCK_KEY is a single global key. Future: per-scope keys e.g. 'scan:all',
// 'scan:platform_only'. For now one key prevents any overlapping scans.
//
// Acquire protocol:
//   1. DELETE FROM schema_drift_scan_lock WHERE lock_key=? AND expires_at < NOW()
//      → clears any expired/stale lock (stale lock recovery)
//   2. INSERT IGNORE INTO schema_drift_scan_lock (lock_key, locked_by, run_id, expires_at)
//      → atomic: succeeds only if no row exists for this key
//   3. If rows_affected=1: acquired. If 0: another instance holds the lock.
//
// Release protocol: DELETE WHERE lock_key=?
//   Must be called in a finally block; scan failure must not skip release.
//
// TTL: loaded from schema_drift_retention_config.scan_lock_ttl_minutes (default 30).
//   A crashed scan (process restart, unhandled exception) leaves a stale lock
//   that auto-expires after TTL. This ensures no single scan failure can
//   permanently block future scans.

const SCAN_LOCK_KEY = 'schema_drift:scan';

async function loadRetentionConfig(pool) {
  const [rows] = await pool.query(
    'SELECT * FROM schema_drift_retention_config WHERE id = 1 LIMIT 1'
  );
  return rows[0] || {
    retention_scan_runs_days:    90,
    retention_snapshot_days:     30,
    retention_delivery_log_days: 60,
    retention_notif_days:        180,
    min_runs_to_keep:            10,
    scan_lock_ttl_minutes:       30,
    auto_cleanup_enabled:        0,
  };
}

async function acquireScanLock(pool, lockedBy, runId = null) {
  const cfg = await loadRetentionConfig(pool);
  const ttl = Math.max(5, cfg.scan_lock_ttl_minutes || 30);

  // Step 1: clear any stale/expired lock for this key
  await pool.query(
    'DELETE FROM schema_drift_scan_lock WHERE lock_key = ? AND expires_at < NOW()',
    [SCAN_LOCK_KEY]
  );

  // Step 2: attempt atomic acquire
  const [result] = await pool.query(
    `INSERT IGNORE INTO schema_drift_scan_lock (lock_key, locked_by, run_id, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [SCAN_LOCK_KEY, lockedBy, runId, ttl]
  );

  if (result.affectedRows === 1) {
    return { acquired: true, existingLock: null };
  }

  // Lock already held — fetch current holder for informational logging
  const [rows] = await pool.query(
    'SELECT * FROM schema_drift_scan_lock WHERE lock_key = ? LIMIT 1',
    [SCAN_LOCK_KEY]
  );
  return { acquired: false, existingLock: rows[0] || null };
}

async function updateLockRunId(pool, runId) {
  await pool.query(
    'UPDATE schema_drift_scan_lock SET run_id = ? WHERE lock_key = ?',
    [runId, SCAN_LOCK_KEY]
  ).catch(() => {});
}

async function releaseScanLock(pool) {
  await pool.query(
    'DELETE FROM schema_drift_scan_lock WHERE lock_key = ?',
    [SCAN_LOCK_KEY]
  );
}

// ─── Phase 6: Retention Engine ─────────────────────────────────────────────────
//
// runRetentionCleanup(pool, triggeredBy, dryRun):
//   dryRun=true  → COUNT only, no deletions, returns preview
//   dryRun=false → executes deletions, returns actual counts
//
// Safety rules enforced:
//   1. Never delete the most recent min_runs_to_keep scan runs (ORDER BY id DESC)
//   2. NULL-out findings_snapshot for old runs rather than deleting the row
//      (preserves run metadata/history without the large LONGTEXT payload)
//   3. Only delete delivery log and notification rows older than their windows
//
// The cleanup function always logs to schema_drift_retention_log (even dry-run).

async function runRetentionCleanup(pool, triggeredBy, dryRun = false) {
  const cfg = await loadRetentionConfig(pool);

  const scanRunsDays    = Math.max(1, cfg.retention_scan_runs_days    || 90);
  const snapshotDays    = Math.max(1, cfg.retention_snapshot_days     || 30);
  const deliveryDays    = Math.max(1, cfg.retention_delivery_log_days || 60);
  const notifDays       = Math.max(1, cfg.retention_notif_days        || 180);
  const minKeep         = Math.max(1, cfg.min_runs_to_keep            || 10);

  let runsDeleted         = 0;
  let snapshotsNulled     = 0;
  let deliveryLogDeleted  = 0;
  let notifsDeleted       = 0;
  let errorMessage        = null;

  try {
    // --- Find the min id of the most-recent N runs (safety anchor) ----------
    const [anchorRows] = await pool.query(
      `SELECT id FROM schema_drift_scan_runs ORDER BY id DESC LIMIT ?`,
      [minKeep]
    );
    const anchorIds    = anchorRows.map(r => r.id);
    const safeAnchorId = anchorIds.length > 0 ? Math.min(...anchorIds) : 0;

    // 1. NULL-out findings_snapshot for runs older than retention_snapshot_days
    //    (but never for the most recent min_runs_to_keep runs)
    if (dryRun) {
      const [cnt] = await pool.query(
        `SELECT COUNT(*) AS n FROM schema_drift_scan_runs
         WHERE findings_snapshot IS NOT NULL
           AND started_at < DATE_SUB(NOW(), INTERVAL ? DAY)
           AND id < ?`,
        [snapshotDays, safeAnchorId]
      );
      snapshotsNulled = cnt[0].n;
    } else {
      const [res] = await pool.query(
        `UPDATE schema_drift_scan_runs
         SET findings_snapshot = NULL
         WHERE findings_snapshot IS NOT NULL
           AND started_at < DATE_SUB(NOW(), INTERVAL ? DAY)
           AND id < ?`,
        [snapshotDays, safeAnchorId]
      );
      snapshotsNulled = res.affectedRows;
    }

    // 2. DELETE scan run rows older than retention_scan_runs_days
    //    (never delete the most recent min_runs_to_keep runs)
    if (dryRun) {
      const [cnt] = await pool.query(
        `SELECT COUNT(*) AS n FROM schema_drift_scan_runs
         WHERE started_at < DATE_SUB(NOW(), INTERVAL ? DAY)
           AND id < ?`,
        [scanRunsDays, safeAnchorId]
      );
      runsDeleted = cnt[0].n;
    } else {
      const [res] = await pool.query(
        `DELETE FROM schema_drift_scan_runs
         WHERE started_at < DATE_SUB(NOW(), INTERVAL ? DAY)
           AND id < ?`,
        [scanRunsDays, safeAnchorId]
      );
      runsDeleted = res.affectedRows;
    }

    // 3. DELETE delivery log rows older than retention_delivery_log_days
    if (dryRun) {
      const [cnt] = await pool.query(
        `SELECT COUNT(*) AS n FROM schema_drift_notif_delivery_log
         WHERE attempted_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [deliveryDays]
      );
      deliveryLogDeleted = cnt[0].n;
    } else {
      const [res] = await pool.query(
        `DELETE FROM schema_drift_notif_delivery_log
         WHERE attempted_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [deliveryDays]
      );
      deliveryLogDeleted = res.affectedRows;
    }

    // 4. DELETE notification rows older than retention_notif_days
    if (dryRun) {
      const [cnt] = await pool.query(
        `SELECT COUNT(*) AS n FROM schema_drift_notifications
         WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [notifDays]
      );
      notifsDeleted = cnt[0].n;
    } else {
      const [res] = await pool.query(
        `DELETE FROM schema_drift_notifications
         WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [notifDays]
      );
      notifsDeleted = res.affectedRows;
    }

  } catch (err) {
    errorMessage = err.message;
    console.error('[schema-drift] runRetentionCleanup error:', err.message);
  }

  // Always log the cleanup run (even dry-runs, even partial failures)
  await pool.query(
    `INSERT INTO schema_drift_retention_log
       (triggered_by, dry_run, runs_deleted, snapshots_nulled,
        delivery_log_deleted, notifs_deleted, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [triggeredBy, dryRun ? 1 : 0,
     runsDeleted, snapshotsNulled, deliveryLogDeleted, notifsDeleted,
     errorMessage]
  ).catch(logErr => console.error('[schema-drift] Failed to log cleanup run:', logErr.message));

  return {
    dryRun,
    runsDeleted,
    snapshotsNulled,
    deliveryLogDeleted,
    notifsDeleted,
    errorMessage,
    executedAt: new Date().toISOString(),
    config: {
      scanRunsDays, snapshotDays, deliveryDays, notifDays, minKeep,
    },
  };
}

// ─── Phase 5: Notification Delivery Engine ────────────────────────────────────
//
// Architecture: called fire-and-forget from computeAndStoreDelta after delta
// rows are inserted. Never throws into the scan pipeline.
//
// Dedupe / anti-spam:
//   1. Delta engine: only NEW findings (not in prior snapshot) create notifs.
//      Unchanged findings never reach this code. ✓
//   2. Cooldown window: before delivery, check delivery_log for a 'sent' entry
//      with the same event_type within cooldown_minutes. Skip if found.
//      Default 60 min — configurable per schema_drift_notif_config.
//
// Suppression proof: newCritical / newHigh passed from computeAndStoreDelta are
// already filtered through annotateSuppression(). Suppressed findings have
// suppressed===true and are excluded before being passed here.

async function loadNotifConfig(pool) {
  const [rows] = await pool.query(
    'SELECT * FROM schema_drift_notif_config WHERE id = 1 LIMIT 1'
  );
  return rows[0] || null;
}

function buildDriftEmailHtml({ runId, scannedAt, scopeType, triggeredBy, newCritical, newHigh, delta, siteUrl }) {
  const hasCritical = newCritical.length > 0;
  const headerColor = hasCritical ? '#c62828' : '#e65100';
  const scopeLabel  = {
    all: 'All Tenants + Platform', platform_only: 'Platform DB Only', tenants_only: 'All Tenants Only',
  }[scopeType] || scopeType;

  const findingRows = (findings) => findings.slice(0, 10).map(f =>
    `<tr>
      <td style="padding:4px 8px;border-bottom:1px solid #eee;font-family:monospace;font-size:11px;color:#555;">${f.scope.replace(/^(platform|tenant):/, '')}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #eee;font-size:12px;">${f.driftType}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #eee;font-family:monospace;font-size:11px;">${f.table}${f.column ? '.' + f.column : ''}</td>
    </tr>`
  ).join('');

  const critSection = hasCritical ? `
    <h3 style="color:#c62828;margin:20px 0 8px;border-bottom:2px solid #c62828;padding-bottom:6px;">&#x1F534; New Critical Findings (${newCritical.length})</h3>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="background:#fce4e4;">
        <th style="padding:6px 8px;text-align:left;font-size:11px;color:#555;">Scope</th>
        <th style="padding:6px 8px;text-align:left;font-size:11px;color:#555;">Drift Type</th>
        <th style="padding:6px 8px;text-align:left;font-size:11px;color:#555;">Table.Column</th>
      </tr></thead>
      <tbody>${findingRows(newCritical)}</tbody>
    </table>
    ${newCritical.length > 10 ? `<p style="font-size:11px;color:#888;margin:4px 0 16px;">&hellip; and ${newCritical.length - 10} more.</p>` : ''}` : '';

  const highSection = newHigh.length > 0 ? `
    <h3 style="color:#e65100;margin:20px 0 8px;border-bottom:2px solid #e65100;padding-bottom:6px;">&#x1F7E0; New High Findings (${newHigh.length})</h3>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="background:#fff3e0;">
        <th style="padding:6px 8px;text-align:left;font-size:11px;color:#555;">Scope</th>
        <th style="padding:6px 8px;text-align:left;font-size:11px;color:#555;">Drift Type</th>
        <th style="padding:6px 8px;text-align:left;font-size:11px;color:#555;">Table.Column</th>
      </tr></thead>
      <tbody>${findingRows(newHigh)}</tbody>
    </table>
    ${newHigh.length > 10 ? `<p style="font-size:11px;color:#888;margin:4px 0 16px;">&hellip; and ${newHigh.length - 10} more.</p>` : ''}` : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background:#f4f4f4;">
  <div style="max-width:600px;margin:20px auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12);">
    <div style="background:${headerColor};color:white;padding:24px 30px;">
      <h1 style="margin:0;font-size:20px;">&#x26A0;&#xFE0F; Schema Drift Alert &mdash; Orthodox Metrics</h1>
      <p style="margin:6px 0 0;opacity:.88;font-size:13px;">New unsuppressed critical/high drift detected</p>
    </div>
    <div style="padding:24px 30px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;">
        <tr><td style="padding:4px 0;color:#777;width:130px;">Scan Run</td><td style="padding:4px 0;font-weight:700;">#${runId}</td></tr>
        <tr><td style="padding:4px 0;color:#777;">Scanned At</td><td style="padding:4px 0;">${new Date(scannedAt).toUTCString()}</td></tr>
        <tr><td style="padding:4px 0;color:#777;">Scope</td><td style="padding:4px 0;">${scopeLabel}</td></tr>
        <tr><td style="padding:4px 0;color:#777;">Triggered By</td><td style="padding:4px 0;">${triggeredBy}</td></tr>
        <tr><td style="padding:4px 0;color:#777;">New Findings</td><td style="padding:4px 0;font-weight:700;color:#e65100;">+${delta.newCount}</td></tr>
        <tr><td style="padding:4px 0;color:#777;">Resolved</td><td style="padding:4px 0;color:#2e7d32;">-${delta.resolvedCount}</td></tr>
        <tr><td style="padding:4px 0;color:#777;">Compared To</td><td style="padding:4px 0;color:#555;">Run #${delta.priorRunId}</td></tr>
      </table>
      ${critSection}${highSection}
      <div style="text-align:center;margin:28px 0 8px;">
        <a href="${siteUrl}/devel-tools/schema-drift" style="background:#1565c0;color:white;padding:12px 28px;text-decoration:none;border-radius:5px;font-weight:600;font-size:14px;display:inline-block;">
          View Schema Drift Detector &#x2192;
        </a>
      </div>
    </div>
    <div style="background:#f8f9fa;padding:16px 30px;text-align:center;font-size:11px;color:#aaa;">
      Orthodox Metrics Schema Drift Detector &middot; Automated Alert<br>
      Configure: Admin &rarr; Schema Drift &rarr; Notification Settings
    </div>
  </div>
</body></html>`;
}

function buildDriftEmailText({ runId, scannedAt, scopeType, triggeredBy, newCritical, newHigh, delta, siteUrl }) {
  const lines = [
    'SCHEMA DRIFT ALERT — Orthodox Metrics',
    '='.repeat(50), '',
    `Scan Run    : #${runId}`,
    `Scanned At  : ${new Date(scannedAt).toUTCString()}`,
    `Scope       : ${scopeType}`,
    `Triggered By: ${triggeredBy}`,
    `New Findings: +${delta.newCount}`,
    `Resolved    : -${delta.resolvedCount}`,
    `Compared To : Run #${delta.priorRunId}`,
    '',
  ];
  if (newCritical.length) {
    lines.push(`NEW CRITICAL FINDINGS (${newCritical.length}):`);
    lines.push('-'.repeat(40));
    newCritical.slice(0, 10).forEach(f =>
      lines.push(`  [${f.scope}] ${f.driftType} on ${f.table}${f.column ? '.' + f.column : ''}`)
    );
    if (newCritical.length > 10) lines.push(`  … and ${newCritical.length - 10} more.`);
    lines.push('');
  }
  if (newHigh.length) {
    lines.push(`NEW HIGH FINDINGS (${newHigh.length}):`);
    lines.push('-'.repeat(40));
    newHigh.slice(0, 10).forEach(f =>
      lines.push(`  [${f.scope}] ${f.driftType} on ${f.table}${f.column ? '.' + f.column : ''}`)
    );
    if (newHigh.length > 10) lines.push(`  … and ${newHigh.length - 10} more.`);
    lines.push('');
  }
  lines.push(`View in admin: ${siteUrl}/devel-tools/schema-drift`);
  return lines.join('\n');
}

function buildWebhookPayload({ runId, scannedAt, scopeType, triggeredBy, delta, newCritical, newHigh }) {
  const mapFinding = f => ({
    scope: f.scope, table: f.table, column: f.column ?? null,
    driftType: f.driftType, severity: f.severity,
    expected: f.expected ?? null, actual: f.actual ?? null,
  });
  return {
    event:       'schema_drift_alert',
    runId,
    scannedAt,
    scopeType,
    triggeredBy,
    delta: {
      priorRunId:       delta.priorRunId,
      newCount:         delta.newCount,
      resolvedCount:    delta.resolvedCount,
      newCriticalCount: delta.newCriticalCount,
      newHighCount:     delta.newHighCount,
    },
    newCriticalFindings: newCritical.slice(0, 20).map(mapFinding),
    newHighFindings:     newHigh.slice(0, 20).map(mapFinding),
    hasPlatformFindings: [...newCritical, ...newHigh].some(f => f.scope.startsWith('platform:')),
    generatedAt: new Date().toISOString(),
  };
}

async function deliverNotifications(pool, runId, notifs, delta, scopeType, newCritical, newHigh) {
  if (!notifs.length) return;

  const config = await loadNotifConfig(pool);
  if (!config || !config.is_enabled) return;
  if (!config.email_enabled && !config.webhook_enabled) return;

  // Apply per-event-type and min-severity filters from config
  const filteredNotifs = notifs.filter(n => {
    if (n.event_type === 'new_critical'   && !config.notify_new_critical) return false;
    if (n.event_type === 'new_high'       && !config.notify_new_high)     return false;
    if (n.event_type === 'findings_surge' && !config.notify_surge)        return false;
    if (config.min_severity === 'critical' && n.severity !== 'critical')  return false;
    return true;
  });
  if (!filteredNotifs.length) return;

  // Cooldown dedupe: skip if same event_type was successfully delivered within window
  const cooldown = Math.max(1, config.cooldown_minutes || 60);
  const [recentRows] = await pool.query(
    `SELECT DISTINCT event_type FROM schema_drift_notif_delivery_log
     WHERE status = 'sent' AND attempted_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    [cooldown]
  );
  const recentTypes  = new Set(recentRows.map(r => r.event_type));
  const toDeliver    = filteredNotifs.filter(n => !recentTypes.has(n.event_type));
  const toSkipCooldown = filteredNotifs.filter(n =>  recentTypes.has(n.event_type));

  // Log skipped (cooldown) entries for both channels
  for (const n of toSkipCooldown) {
    const reason = `Cooldown: ${n.event_type} sent within last ${cooldown}min`;
    for (const ch of ['email', 'webhook']) {
      if ((ch === 'email' && config.email_enabled) || (ch === 'webhook' && config.webhook_enabled)) {
        await pool.query(
          `INSERT INTO schema_drift_notif_delivery_log (notification_id,run_id,channel,event_type,status,detail) VALUES (?,?,'${ch}',?,'skipped',?)`,
          [n.id ?? null, runId, n.event_type, reason]
        ).catch(() => {});
      }
    }
  }
  if (!toDeliver.length) {
    console.log(`[schema-drift] deliverNotifications: all ${toSkipCooldown.length} notif(s) in cooldown window`);
    return;
  }

  // Fetch run metadata for payload / email body
  const [runRows] = await pool.query(
    'SELECT started_at, triggered_by FROM schema_drift_scan_runs WHERE id = ? LIMIT 1',
    [runId]
  );
  const scannedAt   = runRows[0]?.started_at || new Date().toISOString();
  const triggeredBy = runRows[0]?.triggered_by || 'unknown';
  const siteUrl     = process.env.SITE_URL || process.env.BASE_URL || 'https://orthodoxmetrics.com';
  const emailPayload = { runId, scannedAt, scopeType, triggeredBy, newCritical, newHigh, delta, siteUrl };

  // ── Email delivery ────────────────────────────────────────────────────────
  if (config.email_enabled) {
    const recipients = (config.recipient_emails || '').split(',').map(e => e.trim()).filter(Boolean);
    if (!recipients.length) {
      console.warn('[schema-drift] Email delivery: no recipients configured');
    } else {
      let emailStatus = 'failed';
      let emailDetail = 'Not attempted';
      try {
        const smtpConfig = await getActiveEmailConfig();
        let transporterOpts;
        if (smtpConfig?.smtp_host && smtpConfig?.smtp_user && smtpConfig?.smtp_pass) {
          transporterOpts = {
            host: smtpConfig.smtp_host, port: smtpConfig.smtp_port,
            secure: !!smtpConfig.smtp_secure,
            auth: { user: smtpConfig.smtp_user, pass: smtpConfig.smtp_pass },
          };
        } else {
          transporterOpts = {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          };
        }
        const transporter  = nodemailer.createTransport(transporterOpts);
        const senderName   = smtpConfig?.sender_name  || 'OrthodoxMetrics System';
        const senderEmail  = smtpConfig?.sender_email || process.env.SMTP_USER || 'noreply@orthodoxmetrics.com';
        const subjectParts = [];
        if (newCritical.length) subjectParts.push(`${newCritical.length} CRITICAL`);
        if (newHigh.length)     subjectParts.push(`${newHigh.length} HIGH`);
        const subject = `[Schema Drift] ${subjectParts.join(', ')} new finding${subjectParts.length > 1 ? 's' : ''} — Run #${runId}`;

        const info = await transporter.sendMail({
          from:    `"${senderName}" <${senderEmail}>`,
          to:      recipients.join(', '),
          subject,
          html:    buildDriftEmailHtml(emailPayload),
          text:    buildDriftEmailText(emailPayload),
          headers: {
            'X-Schema-Drift-Run':   String(runId),
            'X-Schema-Drift-Scope': scopeType,
          },
        });
        emailStatus = 'sent';
        emailDetail = `messageId=${info.messageId} to=${recipients.join(',')}`;
        console.log(`[schema-drift] Email alert → ${recipients.join(', ')} (${info.messageId})`);
      } catch (err) {
        emailDetail = err.message;
        console.error('[schema-drift] Email delivery failed:', err.message);
      }
      for (const n of toDeliver) {
        await pool.query(
          `INSERT INTO schema_drift_notif_delivery_log (notification_id,run_id,channel,event_type,status,detail) VALUES (?,?,'email',?,?,?)`,
          [n.id ?? null, runId, n.event_type, emailStatus, emailDetail]
        ).catch(() => {});
      }
    }
  }

  // ── Webhook delivery ──────────────────────────────────────────────────────
  if (config.webhook_enabled && config.webhook_url) {
    let webhookStatus = 'failed';
    let webhookDetail = 'Not attempted';
    try {
      const payload = buildWebhookPayload({ runId, scannedAt, scopeType, triggeredBy, delta, newCritical, newHigh });
      const body    = JSON.stringify(payload);
      const headers = {
        'Content-Type':         'application/json',
        'User-Agent':           'OrthodoxMetrics-SchemaDrift/1.0',
        'X-Schema-Drift-Event': 'schema_drift_alert',
        'X-Schema-Drift-Run':   String(runId),
      };
      if (config.webhook_secret) {
        headers['X-Schema-Drift-Signature'] =
          'sha256=' + crypto.createHmac('sha256', config.webhook_secret).update(body).digest('hex');
      }
      const resp = await axios.post(config.webhook_url, payload, {
        headers, timeout: 10000, maxRedirects: 2,
      });
      webhookStatus = 'sent';
      webhookDetail = `HTTP ${resp.status} ${resp.statusText}`;
      console.log(`[schema-drift] Webhook → ${config.webhook_url} (${resp.status})`);
    } catch (err) {
      webhookDetail = err.response
        ? `HTTP ${err.response.status}: ${err.response.statusText}`
        : err.message;
      console.error(`[schema-drift] Webhook failed → ${config.webhook_url}: ${webhookDetail}`);
    }
    for (const n of toDeliver) {
      await pool.query(
        `INSERT INTO schema_drift_notif_delivery_log (notification_id,run_id,channel,event_type,status,detail) VALUES (?,?,'webhook',?,?,?)`,
        [n.id ?? null, runId, n.event_type, webhookStatus, webhookDetail]
      ).catch(() => {});
    }
  }
}

// ─── Delta Comparison Engine ───────────────────────────────────────────────────
//
// Stable matching key: scope|table|column|driftType
// All fields are defined on every finding — no fuzzy matching.
// Prior run must share the same scope_type for a meaningful diff.
//
// Two variants:
//   computeDeltaReadOnly() — pure read: computes delta, returns result, NO DB writes.
//                            Used by GET /scans/:runId/delta to prevent duplicate
//                            notification rows from repeated read requests.
//   computeAndStoreDelta() — full: computes delta, inserts notification rows,
//                            triggers email/webhook delivery.
//                            Used after scan completion (scheduler + POST /scans/run).

function findingFingerprint(f) {
  return `${f.scope}|${f.table}|${f.column ?? ''}|${f.driftType}`;
}

async function computeDeltaReadOnly(pool, runId, currentFindings, scopeType, suppressionRules) {
  const [priorRows] = await pool.query(
    `SELECT id, findings_snapshot FROM schema_drift_scan_runs
     WHERE status = 'complete' AND scope_type = ? AND id != ?
     ORDER BY id DESC LIMIT 1`,
    [scopeType, runId]
  );

  if (!priorRows.length || !priorRows[0].findings_snapshot) return null;

  let priorFindings;
  try { priorFindings = JSON.parse(priorRows[0].findings_snapshot); }
  catch (_) { return null; }

  const priorKeys = new Set(priorFindings.map(findingFingerprint));
  const currKeys  = new Set(currentFindings.map(findingFingerprint));

  const newFindings      = currentFindings.filter(f => !priorKeys.has(findingFingerprint(f)));
  const resolvedFindings = priorFindings.filter(f => !currKeys.has(findingFingerprint(f)));

  const annotatedNew            = annotateSuppression(newFindings, suppressionRules);
  const newUnsuppressedCritical = annotatedNew.filter(f => !f.suppressed && f.severity === 'critical');
  const newUnsuppressedHigh     = annotatedNew.filter(f => !f.suppressed && f.severity === 'high');

  return {
    priorRunId:       priorRows[0].id,
    newCount:         newFindings.length,
    resolvedCount:    resolvedFindings.length,
    newCriticalCount: newUnsuppressedCritical.length,
    newHighCount:     newUnsuppressedHigh.length,
    newFindings:      newFindings.slice(0, 100),
    resolvedFindings: resolvedFindings.slice(0, 100),
  };
}

async function computeAndStoreDelta(pool, runId, currentFindings, scopeType, suppressionRules) {
  const [priorRows] = await pool.query(
    `SELECT id, findings_snapshot FROM schema_drift_scan_runs
     WHERE status = 'complete' AND scope_type = ? AND id != ?
     ORDER BY id DESC LIMIT 1`,
    [scopeType, runId]
  );

  if (!priorRows.length || !priorRows[0].findings_snapshot) return null;

  let priorFindings;
  try { priorFindings = JSON.parse(priorRows[0].findings_snapshot); }
  catch (_) { return null; }

  const priorKeys = new Set(priorFindings.map(findingFingerprint));
  const currKeys  = new Set(currentFindings.map(findingFingerprint));

  const newFindings      = currentFindings.filter(f => !priorKeys.has(findingFingerprint(f)));
  const resolvedFindings = priorFindings.filter(f => !currKeys.has(findingFingerprint(f)));

  const annotatedNew          = annotateSuppression(newFindings, suppressionRules);
  const newUnsuppressedCritical = annotatedNew.filter(f => !f.suppressed && f.severity === 'critical');
  const newUnsuppressedHigh     = annotatedNew.filter(f => !f.suppressed && f.severity === 'high');

  const notifs = [];

  if (newUnsuppressedCritical.length > 0) {
    notifs.push({
      severity:   'critical',
      event_type: 'new_critical',
      title:      `${newUnsuppressedCritical.length} new CRITICAL finding(s) detected`,
      body:       newUnsuppressedCritical.slice(0, 5)
        .map(f => `[${f.scope}] ${f.driftType} on ${f.table}${f.column ? `.${f.column}` : ''}`)
        .join('\n'),
    });
  }

  if (newUnsuppressedHigh.length > 0) {
    notifs.push({
      severity:   'high',
      event_type: 'new_high',
      title:      `${newUnsuppressedHigh.length} new HIGH finding(s) detected`,
      body:       newUnsuppressedHigh.slice(0, 5)
        .map(f => `[${f.scope}] ${f.driftType} on ${f.table}${f.column ? `.${f.column}` : ''}`)
        .join('\n'),
    });
  }

  if (currentFindings.length > priorFindings.length * 1.5 && newFindings.length > 10) {
    notifs.push({
      severity:   'high',
      event_type: 'findings_surge',
      title:      `Active findings surged: ${priorFindings.length} → ${currentFindings.length} (+${newFindings.length} new)`,
      body:       null,
    });
  }

  for (const n of notifs) {
    const [ins] = await pool.query(
      `INSERT INTO schema_drift_notifications (run_id, severity, event_type, title, body)
       VALUES (?, ?, ?, ?, ?)`,
      [runId, n.severity, n.event_type, n.title, n.body]
    );
    n.id = ins.insertId;
  }

  const delta = {
    priorRunId:       priorRows[0].id,
    newCount:         newFindings.length,
    resolvedCount:    resolvedFindings.length,
    newCriticalCount: newUnsuppressedCritical.length,
    newHighCount:     newUnsuppressedHigh.length,
    newFindings:      newFindings.slice(0, 100),
    resolvedFindings: resolvedFindings.slice(0, 100),
    notificationsCreated: notifs.length,
  };

  // Phase 5: deliver email/webhook — fire-and-forget, never blocks scan pipeline
  deliverNotifications(
    pool, runId, notifs, delta, scopeType,
    newUnsuppressedCritical,
    newUnsuppressedHigh
  ).catch(err => console.error('[schema-drift] deliverNotifications error:', err.message));

  return delta;
}

// ─── Scheduler ────────────────────────────────────────────────────────────────
//
// Architecture: setInterval hourly tick, checks schedule config from DB each run.
//
// Tradeoffs:
//   + No external dependencies (no node-cron, no message queue)
//   + Config changes in DB take effect within 1 hour
//   + Re-reads config on every tick — no stale in-memory state
//   - Timer clears on process restart; re-armed automatically by module load
//   - Not cluster-safe: two running instances would both tick.
//     Mitigation: guard check for in-progress runs in DB before starting.
//   - Granularity: ±1 hour. Acceptable for daily/weekly cadence.

function getISOWeek(date) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

const _schedulerState = {
  lastRunDate: null,  // 'YYYY-MM-DD'
  lastRunWeek: null,  // 'YYYY-Www'
};

async function runScheduledScan() {
  const pool = getAppPool();

  const [configRows] = await pool.query(
    'SELECT * FROM schema_drift_schedule WHERE id = 1 LIMIT 1'
  );
  const config = configRows[0];
  if (!config || !config.is_enabled) return;

  const now     = new Date();
  const hour    = now.getUTCHours();
  if (hour !== config.run_hour_utc) return;

  const todayDate = now.toISOString().slice(0, 10);
  const todayWeek = getISOWeek(now);

  if (config.frequency === 'daily'  && _schedulerState.lastRunDate === todayDate) return;
  if (config.frequency === 'weekly' && _schedulerState.lastRunWeek === todayWeek)  return;

  // Phase 6: acquire distributed scan lock before proceeding.
  // acquireScanLock() already clears expired/stale locks (stale lock recovery).
  const lockResult = await acquireScanLock(pool, 'scheduler', null);
  if (!lockResult.acquired) {
    const holder = lockResult.existingLock;
    console.log(
      `[schema-drift] Scheduler: skipping — lock held by "${holder?.locked_by || 'unknown'}"` +
      (holder?.run_id ? ` (run #${holder.run_id})` : '') +
      `, expires ${holder?.expires_at || 'unknown'}`
    );
    return;
  }

  _schedulerState.lastRunDate = todayDate;
  _schedulerState.lastRunWeek = todayWeek;

  console.log(`[schema-drift] Scheduler: triggering ${config.frequency} scan (UTC hour ${hour})`);

  const startedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const [ins] = await pool.query(
    `INSERT INTO schema_drift_scan_runs (triggered_by, scope_type, status, started_at)
     VALUES ('scheduler', ?, 'running', ?)`,
    [config.scope_type, startedAt]
  );
  const runId = ins.insertId;

  // Update lock row with actual runId now that we have it
  await updateLockRunId(pool, runId);

  const params = { scope: config.scope_type, includePlatform: true };
  const jobId  = createJob(params);

  runScan(jobId, params)
    .then(async () => {
      const job = _jobs.get(jobId);
      if (!job || job.status !== 'complete') {
        await pool.query(
          `UPDATE schema_drift_scan_runs SET status='error', completed_at=NOW(),
           error_message=? WHERE id=?`,
          [job?.error || 'Scan did not complete', runId]
        );
        return;
      }

      const allFindings = [
        ...(job.result.platform?.findings || []),
        ...job.result.tenants.flatMap(t => t.findings || []),
      ];

      const suppressionRules = await loadSuppressionRules(pool, true);
      const annotated        = annotateSuppression(allFindings, suppressionRules);
      const suppressedCount  = annotated.filter(f => f.suppressed).length;

      const enrichedSummary = {
        ...job.result.summary,
        suppressedFindings: suppressedCount,
        activeFindings:     allFindings.length - suppressedCount,
      };

      await updateScanRun(pool, runId, {
        status:       'complete',
        completedAt:  new Date().toISOString().slice(0, 19).replace('T', ' '),
        summary:      enrichedSummary,
        allFindings,
        errorMessage: null,
      });

      await computeAndStoreDelta(pool, runId, allFindings, config.scope_type, suppressionRules);
      console.log(`[schema-drift] Scheduled scan run ${runId} complete: ${allFindings.length} findings`);

      // Phase 6: auto-cleanup if enabled
      const retCfg = await loadRetentionConfig(pool);
      if (retCfg.auto_cleanup_enabled) {
        runRetentionCleanup(pool, 'scheduler-auto', false).catch(err =>
          console.error('[schema-drift] Auto-cleanup error:', err.message)
        );
      }
    })
    .catch(async err => {
      console.error('[schema-drift] Scheduled scan error:', err.message);
      await pool.query(
        `UPDATE schema_drift_scan_runs SET status='error', completed_at=NOW(),
         error_message=? WHERE id=?`,
        [err.message, runId]
      );
    })
    .finally(async () => {
      // Phase 6: always release lock, regardless of success/failure
      await releaseScanLock(pool).catch(err =>
        console.error('[schema-drift] Failed to release scan lock:', err.message)
      );
    });
}

// Hourly tick — .unref() keeps it from blocking process exit
setInterval(() => {
  runScheduledScan().catch(err => {
    console.error('[schema-drift] Scheduler tick error:', err.message);
  });
}, 60 * 60 * 1000).unref();

// ─── Core Scan Runner ─────────────────────────────────────────────────────────

async function runScan(jobId, params) {
  const job = _jobs.get(jobId);
  if (!job) return;

  job.status = 'running';
  job.progress.stage = 'initializing';

  const pool     = getAppPool();
  const started  = Date.now();

  try {
    const out = {
      jobId,
      scannedAt:    new Date().toISOString(),
      templateInfo: null,
      platform:     null,
      tenants:      [],
    };

    // 1. Load template schema
    job.progress.stage = 'loading_template';
    const tpl = await loadTemplateSchema(pool);
    out.templateInfo = {
      valid:      tpl.valid,
      version:    tpl.version,
      frozenAt:   tpl.frozenAt,
      tableCount: Object.keys(tpl.tables).length,
      tables:     Object.keys(tpl.tables),
      reason:     tpl.reason || null,
    };

    // 2. Platform scan
    if (params.includePlatform !== false && params.scope !== 'tenants_only') {
      job.progress.stage = 'scanning_platform';
      out.platform = await scanPlatformDb(pool);
    }

    // 3. Tenant scan
    if (params.scope !== 'platform_only') {
      job.progress.stage = 'discovering_tenants';

      let churchList;
      if (params.churchIds && params.churchIds.length > 0) {
        const [rows] = await pool.query(
          `SELECT id, name, database_name
           FROM churches
           WHERE id IN (?) AND database_name IS NOT NULL AND database_name != ''`,
          [params.churchIds]
        );
        churchList = rows;
      } else {
        const [rows] = await pool.query(
          `SELECT id, name, database_name
           FROM churches
           WHERE database_name IS NOT NULL AND database_name != ''
           ORDER BY id`
        );
        churchList = rows;
      }

      job.progress.total = churchList.length;
      job.progress.stage = 'scanning_tenants';

      if (churchList.length > 0) {
        const dbNames = churchList.map(c => c.database_name);

        // Batch all INFORMATION_SCHEMA queries — one pass for all tenants
        job.progress.stage = 'fetching_tenant_metadata';
        let allColIdx = {}, allIdxIdx = {}, allMetaIdx = {};
        try {
          [allColIdx, allIdxIdx, allMetaIdx] = await Promise.all([
            batchFetchColumns(pool, dbNames),
            batchFetchIndexes(pool, dbNames),
            batchFetchTableMeta(pool, dbNames),
          ]);
        } catch (batchErr) {
          // Graceful degradation: fall back to per-tenant queries
          for (const church of churchList) {
            try {
              const [c, i, m] = await Promise.all([
                batchFetchColumns(pool, [church.database_name]),
                batchFetchIndexes(pool, [church.database_name]),
                batchFetchTableMeta(pool, [church.database_name]),
              ]);
              allColIdx[church.database_name]  = c[church.database_name]  || {};
              allIdxIdx[church.database_name]  = i[church.database_name]  || {};
              allMetaIdx[church.database_name] = m[church.database_name]  || {};
            } catch (perErr) {
              allColIdx[church.database_name]  = null;
              allIdxIdx[church.database_name]  = null;
              allMetaIdx[church.database_name] = null;
            }
          }
        }

        job.progress.stage = 'building_findings';
        for (let i = 0; i < churchList.length; i++) {
          const church = churchList[i];
          job.progress.current = i + 1;

          const db = church.database_name;

          if (allColIdx[db] === null) {
            out.tenants.push({
              churchId: church.id, churchName: church.name, dbName: db,
              accessible: false,
              error:      'Failed to fetch schema metadata',
              findings:   [],
            });
            continue;
          }

          try {
            const findings = buildTenantFindings(
              db,
              allColIdx[db]  || {},
              allIdxIdx[db]  || {},
              allMetaIdx[db] || {},
              tpl
            );
            out.tenants.push({
              churchId:   church.id,
              churchName: church.name,
              dbName:     db,
              accessible: true,
              error:      null,
              findings,
            });
          } catch (findErr) {
            out.tenants.push({
              churchId: church.id, churchName: church.name, dbName: db,
              accessible: false,
              error:      findErr.message,
              findings:   [],
            });
          }
        }
      }
    }

    // 4. Build summary
    const allFindings = [
      ...(out.platform?.findings || []),
      ...out.tenants.flatMap(t => t.findings || []),
    ];

    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 };
    const byType     = {};
    for (const f of allFindings) {
      bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
      byType[f.driftType]    = (byType[f.driftType]    || 0) + 1;
    }

    out.summary = {
      totalFindings:       allFindings.length,
      bySeverity,
      byType,
      tenantsScanned:      out.tenants.length,
      tenantsWithDrift:    out.tenants.filter(t => (t.findings || []).length > 0).length,
      tenantsInaccessible: out.tenants.filter(t => !t.accessible).length,
      templateValid:       tpl.valid,
      templateVersion:     tpl.version,
      durationMs:          Date.now() - started,
    };

    job.status      = 'complete';
    job.result      = out;
    job.completedAt = new Date().toISOString();
    job.progress.stage = 'done';

  } catch (err) {
    job.status      = 'error';
    job.error       = err.message;
    job.completedAt = new Date().toISOString();
    job.progress.stage = 'error';
  }
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

// GET /api/admin/schema-drift/status
router.get('/status', requireAuth, requireSuperAdmin, (_req, res) => {
  res.json({ ok: true, service: 'schema-drift', activeJobs: _jobs.size });
});

// GET /api/admin/schema-drift/template-info
router.get('/template-info', requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const info = await loadTemplateSchema(getAppPool());
    res.json({
      valid:      info.valid,
      version:    info.version,
      frozenAt:   info.frozenAt,
      tableCount: Object.keys(info.tables).length,
      tables:     Object.keys(info.tables),
      reason:     info.reason || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/schema-drift/churches
router.get('/churches', requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const [rows] = await getAppPool().query(
      `SELECT id, name, database_name
       FROM churches
       WHERE database_name IS NOT NULL AND database_name != ''
       ORDER BY name`
    );
    res.json({ churches: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/schema-drift/scan
// Body: { scope: 'all' | 'platform_only' | 'tenants_only' | 'selected',
//          churchIds?: number[], includePlatform?: boolean }
router.post('/scan', requireAuth, requireSuperAdmin, (req, res) => {
  const { scope = 'all', churchIds, includePlatform = true } = req.body || {};
  const params = { scope, churchIds, includePlatform };
  const jobId  = createJob(params);

  runScan(jobId, params).catch(err => {
    const job = _jobs.get(jobId);
    if (job) { job.status = 'error'; job.error = err.message; }
  });

  res.json({ jobId, status: 'started' });
});

// GET /api/admin/schema-drift/jobs/:jobId
router.get('/jobs/:jobId', requireAuth, requireSuperAdmin, (req, res) => {
  const job = _jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const { result, ...meta } = job;
  res.json({ ...meta, hasResult: !!result });
});

// GET /api/admin/schema-drift/jobs/:jobId/result
// Query param: ?applySuppressions=1  — annotate findings with active suppression rules
// Raw findings are always preserved in-memory; suppression is a read-time overlay only.
router.get('/jobs/:jobId/result', requireAuth, requireSuperAdmin, async (req, res) => {
  const job = _jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'complete') {
    return res.status(202).json({ status: job.status, progress: job.progress });
  }

  if (req.query.applySuppressions !== '1') {
    return res.json(job.result);
  }

  try {
    const pool  = getAppPool();
    const rules = await loadSuppressionRules(pool, true);

    const result = { ...job.result };

    if (result.platform && Array.isArray(result.platform.findings)) {
      result.platform = {
        ...result.platform,
        findings: annotateSuppression(result.platform.findings, rules),
      };
    }

    result.tenants = (result.tenants || []).map(t => ({
      ...t,
      findings: Array.isArray(t.findings)
        ? annotateSuppression(t.findings, rules)
        : t.findings,
    }));

    const allAnnotated = [
      ...(result.platform?.findings || []),
      ...result.tenants.flatMap(t => t.findings || []),
    ];
    const suppressedCount = allAnnotated.filter(f => f.suppressed).length;

    result.summary = {
      ...result.summary,
      suppressedFindings: suppressedCount,
      activeFindings:     allAnnotated.length - suppressedCount,
      suppressionRules:   rules.length,
    };

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `Failed to apply suppressions: ${err.message}` });
  }
});

// POST /api/admin/schema-drift/remediation-sql
// Body: { jobId, targetDb?: string }
router.post('/remediation-sql', requireAuth, requireSuperAdmin, (req, res) => {
  const { jobId, targetDb } = req.body || {};
  if (!jobId) return res.status(400).json({ error: 'jobId is required' });

  const job = _jobs.get(jobId);
  if (!job)                    return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'complete') return res.status(400).json({ error: 'Scan not yet complete' });

  const { platform, tenants } = job.result;
  const sql = generateRemediationSql(tenants, platform, targetDb || null);

  res.json({
    sql,
    generatedAt: new Date().toISOString(),
    targetDb:    targetDb || 'all',
    jobId,
  });
});

// ─── Suppression Rule Helpers ────────────────────────────────────────────────

function validateSuppressionPayload(body) {
  const errors = [];
  const { name, scope_type, drift_type, table_name, column_name, severity } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('name is required');
  }
  if (scope_type && !VALID_SCOPE_TYPES.has(scope_type)) {
    errors.push(`scope_type must be one of: ${[...VALID_SCOPE_TYPES].join(', ')}`);
  }
  if (drift_type && drift_type !== '*' && !VALID_DRIFT_TYPES.has(drift_type)) {
    errors.push(`drift_type "${drift_type}" is not a recognised drift type`);
  }
  if (severity && !VALID_SEVERITIES.has(severity)) {
    errors.push(`severity must be one of: ${[...VALID_SEVERITIES].join(', ')}`);
  }
  const hasSpecificity = drift_type || table_name || column_name ||
                         (scope_type && scope_type !== 'all');
  if (!hasSpecificity) {
    errors.push(
      'Rule must specify at least one of: drift_type, table_name, column_name, ' +
      'or a non-all scope_type'
    );
  }
  return errors;
}

// ─── Suppression Routes ───────────────────────────────────────────────────────

// GET /api/admin/schema-drift/suppressions
router.get('/suppressions', requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const rules = await loadSuppressionRules(getAppPool(), false);
    res.json({ rules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/schema-drift/suppressions
// Body: { name, description?, scope_type?, target_db?, drift_type?, table_name?,
//          column_name?, severity?, match_expected?, match_actual?,
//          confirm_critical? }
router.post('/suppressions', requireAuth, requireSuperAdmin, async (req, res) => {
  const body   = req.body || {};
  const errors = validateSuppressionPayload(body);
  if (errors.length) return res.status(400).json({ errors });

  const {
    name,
    description    = null,
    scope_type     = 'all',
    target_db      = null,
    drift_type     = null,
    table_name     = null,
    column_name    = null,
    severity       = null,
    match_expected = null,
    match_actual   = null,
    confirm_critical = false,
  } = body;

  if ((severity === 'critical' || severity === 'high') && !confirm_critical) {
    return res.status(400).json({
      error:                'Suppressing critical or high findings requires explicit confirmation.',
      requiresConfirmation: true,
      confirmField:         'confirm_critical',
    });
  }

  const createdBy = req.user?.email || req.user?.username || 'unknown';

  try {
    const pool = getAppPool();
    const [result] = await pool.query(
      `INSERT INTO schema_drift_suppressions
         (name, description, scope_type, target_db, drift_type, table_name, column_name,
          severity, match_expected, match_actual, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, scope_type, target_db, drift_type, table_name, column_name,
       severity, match_expected, match_actual, createdBy]
    );
    const [rows] = await pool.query(
      'SELECT * FROM schema_drift_suppressions WHERE id = ?', [result.insertId]
    );
    res.status(201).json({ rule: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/schema-drift/suppressions/:id
// Updatable fields: is_active, name, description, scope_type, target_db,
//                   drift_type, table_name, column_name, severity,
//                   match_expected, match_actual
router.patch('/suppressions/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id || id < 1) return res.status(400).json({ error: 'Invalid suppression id' });

  const pool = getAppPool();
  try {
    const [existing] = await pool.query(
      'SELECT * FROM schema_drift_suppressions WHERE id = ?', [id]
    );
    if (!existing.length) return res.status(404).json({ error: 'Suppression rule not found' });

    const ALLOWED_FIELDS = [
      'is_active', 'name', 'description', 'scope_type', 'target_db',
      'drift_type', 'table_name', 'column_name', 'severity',
      'match_expected', 'match_actual',
    ];
    const updates = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in req.body) updates[key] = req.body[key];
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    if (updates.scope_type && !VALID_SCOPE_TYPES.has(updates.scope_type)) {
      return res.status(400).json({ error: `Invalid scope_type: ${updates.scope_type}` });
    }
    if (updates.severity && !VALID_SEVERITIES.has(updates.severity)) {
      return res.status(400).json({ error: `Invalid severity: ${updates.severity}` });
    }
    if (updates.drift_type && updates.drift_type !== '*' &&
        !VALID_DRIFT_TYPES.has(updates.drift_type)) {
      return res.status(400).json({ error: `Unknown drift_type: ${updates.drift_type}` });
    }

    const setClauses = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
    const values     = [...Object.values(updates), id];
    await pool.query(
      `UPDATE schema_drift_suppressions SET ${setClauses} WHERE id = ?`, values
    );
    const [rows] = await pool.query(
      'SELECT * FROM schema_drift_suppressions WHERE id = ?', [id]
    );
    res.json({ rule: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/schema-drift/suppressions/preview
// Preview which findings a candidate rule would suppress from a completed scan.
// Body: { jobId, rule: { scope_type?, target_db?, drift_type?, table_name?,
//                         column_name?, severity?, match_expected?, match_actual? } }
router.post('/suppressions/preview', requireAuth, requireSuperAdmin, (req, res) => {
  const { jobId, rule } = req.body || {};
  if (!jobId)                       return res.status(400).json({ error: 'jobId is required' });
  if (!rule || typeof rule !== 'object') return res.status(400).json({ error: 'rule object is required' });

  const job = _jobs.get(jobId);
  if (!job)                      return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'complete') return res.status(400).json({ error: 'Scan not yet complete' });

  const { platform, tenants } = job.result;
  const allFindings = [
    ...(platform?.findings || []),
    ...tenants.flatMap(t => t.findings || []),
  ];

  const matched = allFindings.filter(f => matchesSuppression(f, rule));

  const bySeverity = {};
  for (const f of matched) {
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
  }

  res.json({
    matchCount:      matched.length,
    totalFindings:   allFindings.length,
    bySeverity,
    matchedFindings: matched.slice(0, 50),
    hasCritical:     matched.some(f => f.severity === 'critical'),
    hasHigh:         matched.some(f => f.severity === 'high'),
  });
});

// ─── Phase 4: Scan History Routes ────────────────────────────────────────────

// GET /api/admin/schema-drift/scans
// Returns the 50 most recent persisted scan runs (no snapshot payload).
router.get('/scans', requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const [rows] = await getAppPool().query(
      `SELECT id, triggered_by, scope_type, scope_payload, status,
              started_at, completed_at,
              total_findings_raw, total_findings_active, total_suppressed,
              critical_count, high_count, medium_count, low_count, informational_count,
              error_message
       FROM schema_drift_scan_runs
       ORDER BY id DESC LIMIT 50`
    );
    res.json({ runs: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/schema-drift/scans/:runId
// Returns full run row including findings_snapshot.
router.get('/scans/:runId', requireAuth, requireSuperAdmin, async (req, res) => {
  const runId = parseInt(req.params.runId, 10);
  if (!runId || runId < 1) return res.status(400).json({ error: 'Invalid runId' });
  try {
    const [rows] = await getAppPool().query(
      'SELECT * FROM schema_drift_scan_runs WHERE id = ?', [runId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Scan run not found' });
    const row = rows[0];
    if (row.findings_snapshot) {
      try { row.findings_snapshot = JSON.parse(row.findings_snapshot); }
      catch (_) { /* leave as string */ }
    }
    res.json({ run: row });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/schema-drift/scans/:runId/delta
// Returns a read-only delta between runId and the prior completed run of the same
// scope_type. Uses computeDeltaReadOnly — no DB writes, safe to call repeatedly.
// (Previously called computeAndStoreDelta which created duplicate notifications.)
router.get('/scans/:runId/delta', requireAuth, requireSuperAdmin, async (req, res) => {
  const runId = parseInt(req.params.runId, 10);
  if (!runId || runId < 1) return res.status(400).json({ error: 'Invalid runId' });

  const pool = getAppPool();
  try {
    const [rows] = await pool.query(
      `SELECT id, scope_type, findings_snapshot, status
       FROM schema_drift_scan_runs WHERE id = ?`, [runId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Scan run not found' });
    const run = rows[0];
    if (run.status !== 'complete') {
      return res.status(400).json({ error: 'Scan run is not complete' });
    }
    if (!run.findings_snapshot) {
      return res.status(400).json({ error: 'No findings snapshot available for this run' });
    }

    let currentFindings;
    try { currentFindings = JSON.parse(run.findings_snapshot); }
    catch (_) { return res.status(500).json({ error: 'Could not parse findings snapshot' }); }

    const rules = await loadSuppressionRules(pool, true);
    const delta = await computeDeltaReadOnly(pool, runId, currentFindings, run.scope_type, rules);

    if (!delta) {
      return res.json({ delta: null, message: 'No prior run found for comparison' });
    }
    res.json({ delta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/schema-drift/scans/run
// Triggers a persisted scan (manual but saved to DB with delta computation).
// Body: { scope?: 'all' | 'platform_only' | 'tenants_only' | 'selected',
//          churchIds?: number[], includePlatform?: boolean }
router.post('/scans/run', requireAuth, requireSuperAdmin, async (req, res) => {
  const { scope = 'all', churchIds, includePlatform = true } = req.body || {};
  const triggeredBy = req.user?.email || req.user?.username || 'manual';
  const pool        = getAppPool();

  // Phase 6: acquire distributed lock before starting
  const lockResult = await acquireScanLock(pool, triggeredBy, null);
  if (!lockResult.acquired) {
    const holder = lockResult.existingLock;
    return res.status(409).json({
      error:    'A scan is already in progress. Please wait for it to complete.',
      lockedBy: holder?.locked_by || 'unknown',
      runId:    holder?.run_id    || null,
      lockedAt: holder?.locked_at || null,
      expiresAt:holder?.expires_at|| null,
    });
  }

  let runId;
  try {
    const startedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [ins] = await pool.query(
      `INSERT INTO schema_drift_scan_runs
         (triggered_by, scope_type, scope_payload, status, started_at)
       VALUES (?, ?, ?, 'running', ?)`,
      [
        triggeredBy,
        scope,
        churchIds?.length ? JSON.stringify({ churchIds }) : null,
        startedAt,
      ]
    );
    runId = ins.insertId;

    // Update lock with actual runId
    await updateLockRunId(pool, runId);

  } catch (initErr) {
    await releaseScanLock(pool).catch(() => {});
    return res.status(500).json({ error: initErr.message });
  }

  const params = { scope, churchIds, includePlatform };
  const jobId  = createJob(params);

  res.json({ jobId, runId, status: 'started' });

  runScan(jobId, params)
    .then(async () => {
      const job = _jobs.get(jobId);
      if (!job || job.status !== 'complete') {
        await pool.query(
          `UPDATE schema_drift_scan_runs SET status='error', completed_at=NOW(),
           error_message=? WHERE id=?`,
          [job?.error || 'Scan did not complete', runId]
        );
        return;
      }

      const allFindings = [
        ...(job.result.platform?.findings || []),
        ...job.result.tenants.flatMap(t => t.findings || []),
      ];

      const suppressionRules = await loadSuppressionRules(pool, true);
      const annotated        = annotateSuppression(allFindings, suppressionRules);
      const suppressedCount  = annotated.filter(f => f.suppressed).length;

      const enrichedSummary = {
        ...job.result.summary,
        suppressedFindings: suppressedCount,
        activeFindings:     allFindings.length - suppressedCount,
      };

      await updateScanRun(pool, runId, {
        status:       'complete',
        completedAt:  new Date().toISOString().slice(0, 19).replace('T', ' '),
        summary:      enrichedSummary,
        allFindings,
        errorMessage: null,
      });

      await computeAndStoreDelta(pool, runId, allFindings, scope, suppressionRules);
    })
    .catch(async err => {
      await pool.query(
        `UPDATE schema_drift_scan_runs SET status='error', completed_at=NOW(),
         error_message=? WHERE id=?`,
        [err.message, runId]
      );
    })
    .finally(async () => {
      // Phase 6: always release lock on completion or failure
      await releaseScanLock(pool).catch(err =>
        console.error('[schema-drift] Failed to release scan lock after manual scan:', err.message)
      );
    });
});

// ─── Phase 4: Schedule Config Routes ─────────────────────────────────────────

// GET /api/admin/schema-drift/schedule
router.get('/schedule', requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const [rows] = await getAppPool().query(
      'SELECT * FROM schema_drift_schedule WHERE id = 1 LIMIT 1'
    );
    res.json({ schedule: rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/schema-drift/schedule
// Body: { is_enabled?, frequency?, scope_type?, run_hour_utc? }
router.put('/schedule', requireAuth, requireSuperAdmin, async (req, res) => {
  const ALLOWED = ['is_enabled', 'frequency', 'scope_type', 'run_hour_utc'];
  const VALID_FREQUENCIES = new Set(['daily', 'weekly']);
  const body    = req.body || {};
  const updates = {};

  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key];
  }
  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'No valid fields provided' });
  }
  if (updates.frequency && !VALID_FREQUENCIES.has(updates.frequency)) {
    return res.status(400).json({ error: 'frequency must be daily or weekly' });
  }
  if (updates.run_hour_utc !== undefined) {
    const h = parseInt(updates.run_hour_utc, 10);
    if (isNaN(h) || h < 0 || h > 23) {
      return res.status(400).json({ error: 'run_hour_utc must be 0-23' });
    }
    updates.run_hour_utc = h;
  }

  updates.updated_by = req.user?.email || req.user?.username || 'unknown';

  const pool = getAppPool();
  try {
    const setClauses = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
    await pool.query(
      `UPDATE schema_drift_schedule SET ${setClauses} WHERE id = 1`,
      Object.values(updates)
    );
    const [rows] = await pool.query(
      'SELECT * FROM schema_drift_schedule WHERE id = 1 LIMIT 1'
    );
    res.json({ schedule: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Phase 4: Notification Routes ────────────────────────────────────────────

// GET /api/admin/schema-drift/notifications
// Query: ?unreadOnly=1 (default: all), limit (default 50)
router.get('/notifications', requireAuth, requireSuperAdmin, async (req, res) => {
  const unreadOnly = req.query.unreadOnly === '1';
  const limit      = Math.min(parseInt(req.query.limit || '50', 10), 200);
  try {
    const sql = unreadOnly
      ? `SELECT * FROM schema_drift_notifications WHERE is_read = 0
         ORDER BY id DESC LIMIT ?`
      : `SELECT * FROM schema_drift_notifications ORDER BY id DESC LIMIT ?`;
    const [rows] = await getAppPool().query(sql, [limit]);
    const [countRow] = await getAppPool().query(
      'SELECT COUNT(*) AS unread FROM schema_drift_notifications WHERE is_read = 0'
    );
    res.json({ notifications: rows, unreadCount: countRow[0].unread });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/schema-drift/notifications/:id/read
router.patch('/notifications/:id/read', requireAuth, requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id || id < 1) return res.status(400).json({ error: 'Invalid notification id' });
  try {
    await getAppPool().query(
      'UPDATE schema_drift_notifications SET is_read = 1 WHERE id = ?', [id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/schema-drift/notifications/read-all
router.patch('/notifications/read-all', requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    await getAppPool().query(
      'UPDATE schema_drift_notifications SET is_read = 1 WHERE is_read = 0'
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Phase 5: Notification Config + Delivery Routes ───────────────────────────

// GET /api/admin/schema-drift/notif-config
router.get('/notif-config', requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const [rows] = await getAppPool().query(
      `SELECT id, is_enabled, email_enabled, webhook_enabled, recipient_emails,
              webhook_url, min_severity, notify_new_critical, notify_new_high,
              notify_surge, cooldown_minutes, updated_by, updated_at
       FROM schema_drift_notif_config WHERE id = 1 LIMIT 1`
    );
    res.json({ config: rows[0] || null });
  } catch (err) {
    console.error('[schema-drift] GET /notif-config error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/schema-drift/notif-config
router.put('/notif-config', requireAuth, requireSuperAdmin, async (req, res) => {
  const ALLOWED = [
    'is_enabled', 'email_enabled', 'webhook_enabled',
    'recipient_emails', 'webhook_url', 'webhook_secret',
    'min_severity', 'notify_new_critical', 'notify_new_high',
    'notify_surge', 'cooldown_minutes',
  ];
  const body    = req.body || {};
  const updates = {};
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key];
  }
  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'No valid fields provided' });
  }
  if (updates.min_severity !== undefined && !['critical', 'high'].includes(updates.min_severity)) {
    return res.status(400).json({ error: 'min_severity must be critical or high' });
  }
  if (updates.cooldown_minutes !== undefined) {
    const v = parseInt(updates.cooldown_minutes, 10);
    if (isNaN(v) || v < 0 || v > 10080) {
      return res.status(400).json({ error: 'cooldown_minutes must be 0–10080' });
    }
    updates.cooldown_minutes = v;
  }
  updates.updated_by = req.user?.email || req.user?.username || 'unknown';

  const pool = getAppPool();
  try {
    const setClauses = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
    await pool.query(
      `UPDATE schema_drift_notif_config SET ${setClauses} WHERE id = 1`,
      Object.values(updates)
    );
    const [rows] = await pool.query(
      `SELECT id, is_enabled, email_enabled, webhook_enabled, recipient_emails,
              webhook_url, min_severity, notify_new_critical, notify_new_high,
              notify_surge, cooldown_minutes, updated_by, updated_at
       FROM schema_drift_notif_config WHERE id = 1 LIMIT 1`
    );
    res.json({ config: rows[0] });
  } catch (err) {
    console.error('[schema-drift] PUT /notif-config error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/schema-drift/notif-deliveries?limit=50&runId=<n>
router.get('/notif-deliveries', requireAuth, requireSuperAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  const runId = req.query.runId ? parseInt(req.query.runId, 10) : null;
  try {
    let sql, params;
    if (runId) {
      sql    = `SELECT * FROM schema_drift_notif_delivery_log WHERE run_id = ? ORDER BY id DESC LIMIT ?`;
      params = [runId, limit];
    } else {
      sql    = `SELECT * FROM schema_drift_notif_delivery_log ORDER BY id DESC LIMIT ?`;
      params = [limit];
    }
    const [rows] = await getAppPool().query(sql, params);
    res.json({ deliveries: rows });
  } catch (err) {
    console.error('[schema-drift] GET /notif-deliveries error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/schema-drift/notif-config/test
// Sends a real delivery with a clearly-labelled test payload.
// Does NOT create schema_drift_notifications rows.
// Uses the same SMTP / webhook config as live deliveries.
router.post('/notif-config/test', requireAuth, requireSuperAdmin, async (req, res) => {
  const pool = getAppPool();
  try {
    const config = await loadNotifConfig(pool);
    if (!config || !config.is_enabled) {
      return res.status(400).json({ error: 'Notifications are disabled. Enable them before testing.' });
    }
    if (!config.email_enabled && !config.webhook_enabled) {
      return res.status(400).json({ error: 'No delivery channel enabled (enable email or webhook first).' });
    }

    const testRunId   = 0;
    const scannedAt   = new Date().toISOString();
    const triggeredBy = req.user?.email || req.user?.username || 'admin-test';
    const siteUrl     = process.env.SITE_URL || process.env.BASE_URL || 'https://orthodoxmetrics.com';
    const scopeType   = 'all';

    const testNewCritical = [{
      scope: 'platform:orthodoxmetrics_db', table: 'test_table', column: 'test_col',
      driftType: 'MISSING_COLUMN', severity: 'critical',
      expected: 'varchar(255)', actual: null,
    }];
    const testNewHigh = [{
      scope: 'tenant:om_church_1', table: 'baptism_records', column: 'entry_date',
      driftType: 'DEFAULT_MISMATCH', severity: 'high',
      expected: 'CURRENT_TIMESTAMP', actual: 'NULL',
    }];
    const testDelta = {
      priorRunId: 0, newCount: 2, resolvedCount: 0, newCriticalCount: 1, newHighCount: 1,
    };
    const emailPayload = { runId: testRunId, scannedAt, scopeType, triggeredBy, newCritical: testNewCritical, newHigh: testNewHigh, delta: testDelta, siteUrl };
    const results = {};

    if (config.email_enabled) {
      const recipients = (config.recipient_emails || '').split(',').map(e => e.trim()).filter(Boolean);
      if (!recipients.length) {
        results.email = { status: 'skipped', detail: 'No recipients configured' };
      } else {
        try {
          const smtpConfig = await getActiveEmailConfig();
          let transporterOpts;
          if (smtpConfig?.smtp_host && smtpConfig?.smtp_user && smtpConfig?.smtp_pass) {
            transporterOpts = {
              host: smtpConfig.smtp_host, port: smtpConfig.smtp_port,
              secure: !!smtpConfig.smtp_secure,
              auth: { user: smtpConfig.smtp_user, pass: smtpConfig.smtp_pass },
            };
          } else {
            transporterOpts = {
              host: process.env.SMTP_HOST || 'smtp.gmail.com',
              port: parseInt(process.env.SMTP_PORT) || 587,
              secure: process.env.SMTP_SECURE === 'true',
              auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            };
          }
          const transporter = nodemailer.createTransport(transporterOpts);
          const senderName  = smtpConfig?.sender_name  || 'OrthodoxMetrics System';
          const senderEmail = smtpConfig?.sender_email || process.env.SMTP_USER || 'noreply@orthodoxmetrics.com';
          const info = await transporter.sendMail({
            from:    `"${senderName}" <${senderEmail}>`,
            to:      recipients.join(', '),
            subject: `[TEST] Schema Drift Alert — 1 CRITICAL, 1 HIGH (test only, not a real alert)`,
            html:    buildDriftEmailHtml(emailPayload),
            text:    buildDriftEmailText(emailPayload),
          });
          results.email = { status: 'sent', messageId: info.messageId, to: recipients };
        } catch (err) {
          results.email = { status: 'failed', detail: err.message };
        }
      }
    }

    if (config.webhook_enabled && config.webhook_url) {
      try {
        const payload = buildWebhookPayload({ runId: testRunId, scannedAt, scopeType, triggeredBy, delta: testDelta, newCritical: testNewCritical, newHigh: testNewHigh });
        payload.test = true;
        const body    = JSON.stringify(payload);
        const headers = {
          'Content-Type':         'application/json',
          'User-Agent':           'OrthodoxMetrics-SchemaDrift/1.0',
          'X-Schema-Drift-Event': 'schema_drift_test',
          'X-Schema-Drift-Test':  '1',
        };
        if (config.webhook_secret) {
          headers['X-Schema-Drift-Signature'] =
            'sha256=' + crypto.createHmac('sha256', config.webhook_secret).update(body).digest('hex');
        }
        const resp = await axios.post(config.webhook_url, payload, { headers, timeout: 10000, maxRedirects: 2 });
        results.webhook = { status: 'sent', httpStatus: resp.status };
      } catch (err) {
        results.webhook = {
          status: 'failed',
          detail: err.response ? `HTTP ${err.response.status}: ${err.response.statusText}` : err.message,
        };
      }
    }

    res.json({ results });
  } catch (err) {
    console.error('[schema-drift] POST /notif-config/test error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Phase 6: Maintenance Routes ─────────────────────────────────────────────
//
// All routes require super_admin.
// Write routes (PUT, POST) mutate operational config or trigger cleanup.

// GET /api/admin/schema-drift/maintenance/lock-status
// Returns current scan lock row, or null if no lock is held.
// Also indicates whether the lock appears stale (expires_at in the past).
router.get('/maintenance/lock-status', requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const [rows] = await getAppPool().query(
      'SELECT * FROM schema_drift_scan_lock WHERE lock_key = ? LIMIT 1',
      [SCAN_LOCK_KEY]
    );
    const lock = rows[0] || null;
    res.json({
      lock,
      isLocked:  !!lock,
      isStale:   lock ? new Date(lock.expires_at) < new Date() : false,
      lockKey:   SCAN_LOCK_KEY,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/schema-drift/maintenance/lock
// Force-releases the current scan lock. Use only when a scan is confirmed dead.
// Protected: super_admin only.
router.delete('/maintenance/lock', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const pool = getAppPool();
    const [before] = await pool.query(
      'SELECT * FROM schema_drift_scan_lock WHERE lock_key = ? LIMIT 1',
      [SCAN_LOCK_KEY]
    );
    const hadLock = before.length > 0;
    await pool.query(
      'DELETE FROM schema_drift_scan_lock WHERE lock_key = ?',
      [SCAN_LOCK_KEY]
    );
    const releasedBy = req.user?.email || req.user?.username || 'admin';
    console.log(`[schema-drift] Lock force-released by ${releasedBy}`);
    res.json({
      ok:         true,
      hadLock,
      releasedBy,
      releasedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/schema-drift/maintenance/retention-config
router.get('/maintenance/retention-config', requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const cfg = await loadRetentionConfig(getAppPool());
    res.json({ config: cfg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/schema-drift/maintenance/retention-config
// Body: any subset of the configurable fields.
router.put('/maintenance/retention-config', requireAuth, requireSuperAdmin, async (req, res) => {
  const ALLOWED = [
    'retention_scan_runs_days',
    'retention_snapshot_days',
    'retention_delivery_log_days',
    'retention_notif_days',
    'min_runs_to_keep',
    'scan_lock_ttl_minutes',
    'auto_cleanup_enabled',
  ];
  const body    = req.body || {};
  const updates = {};
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key];
  }
  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'No valid fields provided' });
  }

  // Validate numeric fields
  const numericFields = [
    'retention_scan_runs_days', 'retention_snapshot_days',
    'retention_delivery_log_days', 'retention_notif_days',
    'min_runs_to_keep', 'scan_lock_ttl_minutes',
  ];
  for (const f of numericFields) {
    if (f in updates) {
      const v = parseInt(updates[f], 10);
      if (isNaN(v) || v < 1) {
        return res.status(400).json({ error: `${f} must be a positive integer` });
      }
      updates[f] = v;
    }
  }
  if ('auto_cleanup_enabled' in updates) {
    updates.auto_cleanup_enabled = updates.auto_cleanup_enabled ? 1 : 0;
  }

  updates.updated_by = req.user?.email || req.user?.username || 'unknown';

  const pool = getAppPool();
  try {
    const setClauses = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
    await pool.query(
      `UPDATE schema_drift_retention_config SET ${setClauses} WHERE id = 1`,
      Object.values(updates)
    );
    const cfg = await loadRetentionConfig(pool);
    res.json({ config: cfg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/schema-drift/maintenance/cleanup
// Triggers retention cleanup. Supports dry-run (body: { dryRun: true }).
// Returns cleanup summary and what was (or would be) deleted.
router.post('/maintenance/cleanup', requireAuth, requireSuperAdmin, async (req, res) => {
  const dryRun     = req.body?.dryRun === true || req.body?.dry_run === true;
  const triggeredBy = req.user?.email || req.user?.username || 'admin';
  const pool        = getAppPool();
  try {
    const result = await runRetentionCleanup(pool, triggeredBy, dryRun);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/schema-drift/maintenance/cleanup-history?limit=20
// Returns recent cleanup run log entries (newest first).
router.get('/maintenance/cleanup-history', requireAuth, requireSuperAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  try {
    const [rows] = await getAppPool().query(
      `SELECT * FROM schema_drift_retention_log ORDER BY id DESC LIMIT ?`,
      [limit]
    );
    res.json({ history: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
