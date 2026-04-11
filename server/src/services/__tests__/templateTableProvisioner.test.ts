#!/usr/bin/env npx tsx
/**
 * Unit tests for services/templateTableProvisioner.js (OMD-1217)
 *
 * Generates CREATE TABLE DDL from template field definitions and provisions
 * record/history tables in church databases.
 *
 * Dependencies:
 *   - `../config/db`          → getAppPool().query(...)
 *   - `../utils/dbSwitcher`   → getChurchDbConnection(dbName) (runtime require)
 *
 * Strategy: stub both modules via require.cache. The dbSwitcher is required
 * inline inside provisionTablesFromTemplates, but require.cache entries are
 * honored for runtime requires as long as the key matches the resolved path.
 *
 * Coverage:
 *   - fieldTypeToSqlType: type precedence + name heuristics
 *   - generateCreateTableFromTemplate:
 *       · missing fields throws
 *       · includes id PRIMARY KEY, church_id column (unless in fields)
 *       · skips id/church_id from field list
 *       · emits NOT NULL + DEFAULT '...' (quote-escaped)
 *       · adds timestamp columns
 *       · includes indexes for well-known fields
 *       · correct table name / ENGINE / charset
 *   - provisionTablesFromTemplates:
 *       · empty selectedTemplates → returns empty results
 *       · unknown record type → warn + skip
 *       · template not found → tables_failed entry
 *       · happy path: records + history table DDL executed
 *       · execute error → captured in tables_failed + errors
 *       · connection.release() called in finally
 *
 * Run: npx tsx server/src/services/__tests__/templateTableProvisioner.test.ts
 */

let passed = 0;
let failed = 0;

function assert(cond: any, message: string): void {
  if (cond) { console.log(`  PASS: ${message}`); passed++; }
  else { console.error(`  FAIL: ${message}`); failed++; }
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { console.log(`  PASS: ${message}`); passed++; }
  else {
    console.error(`  FAIL: ${message}\n         expected: ${e}\n         actual:   ${a}`);
    failed++;
  }
}

// ── Fake getAppPool ─────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const poolQueryCalls: QueryCall[] = [];
let appPoolResponder: (sql: string, params: any[]) => any = () => [[], []];

const fakeAppPool = {
  query: async (sql: string, params: any[] = []) => {
    poolQueryCalls.push({ sql, params });
    return appPoolResponder(sql, params);
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakeAppPool },
} as any;

// ── Fake dbSwitcher ─────────────────────────────────────────────────
const execCalls: QueryCall[] = [];
let releaseCount = 0;
let executeThrowsOnPattern: RegExp | null = null;
let lastDbName: string | null = null;

const fakeConnection = {
  execute: async (sql: string, params: any[] = []) => {
    execCalls.push({ sql, params });
    if (executeThrowsOnPattern && executeThrowsOnPattern.test(sql)) {
      throw new Error('fake execute failure');
    }
    return [{}, []];
  },
  release: () => { releaseCount++; },
};

const fakeChurchDbPool = {
  getConnection: async () => fakeConnection,
};

const dbSwitcherStub = {
  getChurchDbConnection: async (dbName: string) => {
    lastDbName = dbName;
    return fakeChurchDbPool;
  },
};

const dbSwitcherPath = require.resolve('../../utils/dbSwitcher');
require.cache[dbSwitcherPath] = {
  id: dbSwitcherPath,
  filename: dbSwitcherPath,
  loaded: true,
  exports: dbSwitcherStub,
} as any;

function resetState() {
  poolQueryCalls.length = 0;
  execCalls.length = 0;
  releaseCount = 0;
  executeThrowsOnPattern = null;
  lastDbName = null;
  appPoolResponder = () => [[], []];
}

// Silence console
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

// ── Load SUT ────────────────────────────────────────────────────────
const {
  fieldTypeToSqlType,
  generateCreateTableFromTemplate,
  provisionTablesFromTemplates,
} = require('../templateTableProvisioner');

async function main() {

// ============================================================================
// fieldTypeToSqlType
// ============================================================================
console.log('\n── fieldTypeToSqlType ────────────────────────────────────');

assertEq(fieldTypeToSqlType({ type: 'date' }), 'DATE', 'explicit date');
assertEq(fieldTypeToSqlType({ type: 'number' }), 'INT', 'explicit number');
assertEq(fieldTypeToSqlType({ type: 'int' }), 'INT', 'explicit int');
assertEq(fieldTypeToSqlType({ type: 'boolean' }), 'BOOLEAN', 'explicit boolean');
assertEq(fieldTypeToSqlType({ type: 'bool' }), 'BOOLEAN', 'explicit bool');
assertEq(fieldTypeToSqlType({ type: 'text' }), 'TEXT', 'explicit text');
assertEq(fieldTypeToSqlType({ type: 'string' }), 'VARCHAR(255)', 'string → varchar');
assertEq(fieldTypeToSqlType({}), 'VARCHAR(255)', 'empty → varchar');

// Name heuristics
assertEq(fieldTypeToSqlType({ column: 'baptism_date' }), 'DATE', 'column ends _date');
assertEq(fieldTypeToSqlType({ field: 'priest_id' }), 'INT', 'column ends _id');
assertEq(fieldTypeToSqlType({ column: 'notes' }), 'TEXT', 'notes → TEXT');
assertEq(fieldTypeToSqlType({ column: 'description' }), 'TEXT', 'description → TEXT');
assertEq(fieldTypeToSqlType({ column: 'page_number' }), 'INT', 'number → INT');

// ============================================================================
// generateCreateTableFromTemplate — missing fields
// ============================================================================
console.log('\n── generateCreateTableFromTemplate: missing fields ───────');

{
  let caught: Error | null = null;
  try { generateCreateTableFromTemplate('foo', null, 46); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /fields are required/.test(caught.message), 'null fields throws');
}

{
  let caught: Error | null = null;
  try { generateCreateTableFromTemplate('foo', [], 46); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'empty fields throws');
}

// ============================================================================
// generateCreateTableFromTemplate — happy path
// ============================================================================
console.log('\n── generateCreateTableFromTemplate: happy path ───────────');

{
  const sql = generateCreateTableFromTemplate('baptism_records', [
    { column: 'first_name', type: 'string', required: true },
    { column: 'last_name', type: 'string', required: true },
    { column: 'baptism_date', type: 'date' },
    { column: 'notes', type: 'text', default: "O'Hara's note" },
  ], 46);

  assert(sql.includes('CREATE TABLE IF NOT EXISTS `baptism_records`'), 'backticked table name');
  assert(sql.includes('id INT PRIMARY KEY AUTO_INCREMENT'), 'id column');
  assert(/church_id INT NOT NULL DEFAULT 46/.test(sql), 'church_id default = churchId');
  assert(sql.includes('`first_name` VARCHAR(255) NOT NULL'), 'first_name NOT NULL');
  assert(sql.includes('`last_name` VARCHAR(255) NOT NULL'), 'last_name NOT NULL');
  assert(sql.includes('`baptism_date` DATE'), 'baptism_date DATE');
  assert(/`notes` TEXT\s+DEFAULT 'O''Hara''s note'/.test(sql), 'quote-escaped default in notes');
  assert(sql.includes('created_by INT'), 'created_by column');
  assert(sql.includes('created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'), 'created_at');
  assert(sql.includes('updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE'), 'updated_at');
  assert(sql.includes('INDEX idx_baptism_records_first_name'), 'first_name index');
  assert(sql.includes('INDEX idx_baptism_records_last_name'), 'last_name index');
  assert(sql.includes('INDEX idx_baptism_records_baptism_date'), 'baptism_date index');
  assert(sql.includes('INDEX idx_baptism_records_church_id') === false, 'no church_id index (not in fields)');
  assert(sql.includes('ENGINE=InnoDB'), 'InnoDB engine');
  assert(sql.includes('CHARSET=utf8mb4'), 'utf8mb4 charset');
}

// Fields include church_id → don't add default column
{
  const sql = generateCreateTableFromTemplate('custom_records', [
    { column: 'church_id', type: 'int' },
    { column: 'custom_field', type: 'string' },
  ], 99);

  const churchIdMatches = (sql.match(/church_id/g) || []).length;
  // "church_id" appears: column def + index (idx_..._church_id). It should
  // appear AT LEAST once as a column. We assert no "DEFAULT 99" line.
  assert(churchIdMatches >= 1, 'church_id present');
  assert(!/church_id INT NOT NULL DEFAULT 99/.test(sql), 'no auto-added church_id default');
  assert(sql.includes('`custom_field` VARCHAR(255)'), 'custom_field present');
  assert(sql.includes('INDEX idx_custom_records_church_id'), 'church_id index (was in fields)');
}

// Fields skip id/church_id names regardless
{
  const sql = generateCreateTableFromTemplate('weird_records', [
    { column: 'id', type: 'int' },
    { field: 'church_id', type: 'int' },
    { column: 'valid', type: 'string' },
  ], 0);

  // id only added once as PRIMARY KEY
  const idColMatches = (sql.match(/\bid INT PRIMARY KEY/g) || []).length;
  assertEq(idColMatches, 1, 'id only added as primary key (skipped in fields)');
  // NOTE: "other" does not contain "id", "date", etc. — safe for VARCHAR heuristic
  assert(/`valid` /.test(sql), 'valid field column present');
}

// Extra: heuristic edge — name containing "id" substring → INT
{
  const sql = generateCreateTableFromTemplate('x_records', [
    { column: 'rapid', type: 'string' },
  ], 0);
  // "rapid" contains "id" substring (no "date" substring) → INT
  assert(sql.includes('`rapid` INT'), 'rapid → INT (name heuristic)');
}

// ============================================================================
// provisionTablesFromTemplates — empty input
// ============================================================================
console.log('\n── provisionTablesFromTemplates: empty ───────────────────');

resetState();
{
  const r = await provisionTablesFromTemplates(46, {});
  assertEq(r, { tables_created: [], tables_failed: [], errors: [] }, 'empty object returns empty results');
  assertEq(poolQueryCalls.length, 0, 'no DB calls');
  assertEq(execCalls.length, 0, 'no execute calls');
}

resetState();
{
  const r = await provisionTablesFromTemplates(46, null as any);
  assertEq(r.tables_created.length, 0, 'null input: no tables');
  assertEq(poolQueryCalls.length, 0, 'null input: no DB calls');
}

// ============================================================================
// provisionTablesFromTemplates — happy path
// ============================================================================
console.log('\n── provisionTablesFromTemplates: happy path ──────────────');

resetState();
appPoolResponder = (sql: string, params: any[]) => {
  if (params[0] === 'en_baptism_records') {
    return [[{
      slug: 'en_baptism_records',
      name: 'English Baptism',
      record_type: 'baptism',
      fields: JSON.stringify([
        { column: 'first_name', type: 'string', required: true },
        { column: 'last_name', type: 'string' },
      ]),
    }], []];
  }
  if (params[0] === 'en_marriage_records') {
    return [[{
      slug: 'en_marriage_records',
      name: 'English Marriage',
      record_type: 'marriage',
      fields: [
        { column: 'groom', type: 'string' },
        { column: 'bride', type: 'string' },
      ],
    }], []];
  }
  return [[], []];
};

quiet();
{
  const r = await provisionTablesFromTemplates(46, {
    baptism: 'en_baptism_records',
    marriage: 'en_marriage_records',
  });
  loud();

  assertEq(r.tables_created.length, 2, '2 tables created');
  assertEq(r.tables_failed.length, 0, 'none failed');
  assertEq(r.errors.length, 0, 'no errors');

  assertEq(lastDbName, 'om_church_46', 'connected to om_church_46');
  assertEq(releaseCount, 1, 'connection released once');

  const baptism = r.tables_created.find((t: any) => t.table === 'baptism_records');
  assert(baptism !== undefined, 'baptism_records in tables_created');
  assertEq(baptism.template_slug, 'en_baptism_records', 'template_slug recorded');
  assertEq(baptism.template_name, 'English Baptism', 'template_name recorded');
  assertEq(baptism.fields_count, 2, 'fields_count');

  // Execute calls: 2 tables × (records + history) = 4
  assertEq(execCalls.length, 4, '4 execute calls (2 records + 2 history)');

  // Check SQL content
  const recordsCreates = execCalls.filter(c => /CREATE TABLE[\s\S]*_records/.test(c.sql));
  const historyCreates = execCalls.filter(c => /CREATE TABLE[\s\S]*_history/.test(c.sql));
  assertEq(recordsCreates.length, 2, '2 records CREATEs');
  assertEq(historyCreates.length, 2, '2 history CREATEs');

  // History table should have standard shape
  const firstHistory = historyCreates[0].sql;
  assert(/record_id INT NOT NULL/.test(firstHistory), 'history has record_id');
  assert(/action ENUM\('INSERT', 'UPDATE', 'DELETE'\)/.test(firstHistory), 'history has action ENUM');
  assert(/before_json LONGTEXT/.test(firstHistory), 'history before_json');
  assert(/after_json LONGTEXT/.test(firstHistory), 'history after_json');
}

// ============================================================================
// provisionTablesFromTemplates — template not found
// ============================================================================
console.log('\n── provisionTablesFromTemplates: template not found ─────');

resetState();
appPoolResponder = () => [[], []];

quiet();
{
  const r = await provisionTablesFromTemplates(46, { baptism: 'missing_slug' });
  loud();

  assertEq(r.tables_created.length, 0, 'nothing created');
  assertEq(r.tables_failed.length, 1, '1 table failed');
  assertEq(r.tables_failed[0].table, 'baptism_records', 'failed: baptism_records');
  assert(/Template missing_slug not found/.test(r.tables_failed[0].reason), 'failure reason');
  assertEq(execCalls.length, 0, 'no execute calls');
  assertEq(releaseCount, 1, 'still released');
}

// ============================================================================
// provisionTablesFromTemplates — unknown record type
// ============================================================================
console.log('\n── provisionTablesFromTemplates: unknown record type ─────');

resetState();

quiet();
{
  const r = await provisionTablesFromTemplates(46, { unknown: 'some_slug' });
  loud();

  assertEq(r.tables_created.length, 0, 'nothing created');
  assertEq(r.tables_failed.length, 0, 'nothing failed (just skipped)');
  assertEq(poolQueryCalls.length, 0, 'no pool query (skipped before fetch)');
}

// ============================================================================
// provisionTablesFromTemplates — execute error on CREATE TABLE
// ============================================================================
console.log('\n── provisionTablesFromTemplates: execute error ───────────');

resetState();
appPoolResponder = () => [[{
  slug: 'en_funeral_records',
  name: 'English Funeral',
  record_type: 'funeral',
  fields: [{ column: 'deceased_name', type: 'string' }],
}], []];
executeThrowsOnPattern = /CREATE TABLE IF NOT EXISTS `funeral_records`/;

quiet();
{
  const r = await provisionTablesFromTemplates(46, { funeral: 'en_funeral_records' });
  loud();

  assertEq(r.tables_created.length, 0, 'nothing created');
  assertEq(r.tables_failed.length, 1, '1 failure');
  assertEq(r.tables_failed[0].table, 'funeral_records', 'failed table');
  assert(/fake execute failure/.test(r.tables_failed[0].error), 'error captured');
  assertEq(r.errors.length, 1, 'errors list populated');
  assertEq(releaseCount, 1, 'released despite error');
}

// ============================================================================
// provisionTablesFromTemplates — skip empty slug value
// ============================================================================
console.log('\n── provisionTablesFromTemplates: empty slug skip ─────────');

resetState();
quiet();
{
  const r = await provisionTablesFromTemplates(46, { baptism: '' });
  loud();
  assertEq(r.tables_created.length, 0, 'empty slug: nothing created');
  assertEq(r.tables_failed.length, 0, 'empty slug: nothing failed');
  assertEq(poolQueryCalls.length, 0, 'empty slug: no pool query');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
