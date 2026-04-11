#!/usr/bin/env npx tsx
/**
 * Unit tests for services/templateTableProvisioner.js (OMD-1014)
 *
 * Three exports:
 *   - fieldTypeToSqlType(field) — pure
 *   - generateCreateTableFromTemplate(tableName, fields, churchId) — pure
 *   - provisionTablesFromTemplates(churchId, selectedTemplates) — DB-bound
 *
 * Dependencies to stub:
 *   - ../config/db.getAppPool  (for templates query)
 *   - ../utils/dbSwitcher.getChurchDbConnection (inline require inside fn)
 *
 * Coverage:
 *   - fieldTypeToSqlType: date (explicit + inferred), int (explicit +
 *     inferred from column name), boolean, text (explicit + inferred
 *     from 'notes' / 'description'), default VARCHAR(255), missing type
 *     → VARCHAR
 *   - generateCreateTableFromTemplate:
 *       · throws on empty/missing fields array
 *       · id column always first
 *       · church_id auto-added when missing, uses churchId default
 *       · church_id NOT added when present in fields
 *       · required → NOT NULL
 *       · default value escaped (single quotes doubled)
 *       · indexes added only for indexed field names
 *       · timestamps always present
 *   - provisionTablesFromTemplates:
 *       · empty selectedTemplates → no-op returns empty results
 *       · happy path: creates record + history tables, records counted
 *       · unknown record type → skipped (console.warn)
 *       · empty template slug → skipped
 *       · template not found → tables_failed with reason
 *       · JSON string fields parsed
 *       · connection.release() called even on error (via finally)
 *       · outer error (getChurchDbConnection failure) re-thrown
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

// ─── Stub config/db.getAppPool ───────────────────────────────────────
type Route = { match: RegExp; rows?: any; throws?: Error };
const appQueryLog: { sql: string; params: any[] }[] = [];
let appRoutes: Route[] = [];

const fakeAppPool = {
  query: async (sql: string, params: any[] = []) => {
    appQueryLog.push({ sql, params });
    for (const r of appRoutes) {
      if (r.match.test(sql)) {
        if (r.throws) throw r.throws;
        return [r.rows ?? [], {}];
      }
    }
    return [[], {}];
  },
};

const dbStub = { getAppPool: () => fakeAppPool };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true, exports: dbStub,
} as any;

// ─── Stub dbSwitcher.getChurchDbConnection ───────────────────────────
const churchExecuteLog: string[] = [];
let churchExecuteThrowsOnPattern: RegExp | null = null;
let connectionReleased = 0;
let getChurchDbConnectionThrows = false;

const fakeConnection = {
  execute: async (sql: string) => {
    churchExecuteLog.push(sql);
    if (churchExecuteThrowsOnPattern && churchExecuteThrowsOnPattern.test(sql)) {
      throw new Error('fake table create failure');
    }
    return [{}];
  },
  release: () => { connectionReleased++; },
};

const fakeChurchPool = {
  getConnection: async () => fakeConnection,
};

const dbSwitcherStub = {
  getChurchDbConnection: async (_name: string) => {
    if (getChurchDbConnectionThrows) throw new Error('cannot connect to church db');
    return fakeChurchPool;
  },
};

const switcherPath = require.resolve('../../utils/dbSwitcher');
require.cache[switcherPath] = {
  id: switcherPath, filename: switcherPath, loaded: true, exports: dbSwitcherStub,
} as any;

// ─── Helpers ─────────────────────────────────────────────────────────
function resetState() {
  appQueryLog.length = 0;
  appRoutes = [];
  churchExecuteLog.length = 0;
  churchExecuteThrowsOnPattern = null;
  connectionReleased = 0;
  getChurchDbConnectionThrows = false;
}

// Silence console
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
function loud() {
  console.log = origLog;
  console.warn = origWarn;
  console.error = origError;
}

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

// Explicit types
assertEq(fieldTypeToSqlType({ type: 'date', column: 'foo' }), 'DATE', 'explicit date');
assertEq(fieldTypeToSqlType({ type: 'number', column: 'foo' }), 'INT', 'explicit number');
assertEq(fieldTypeToSqlType({ type: 'int', column: 'foo' }), 'INT', 'explicit int');
assertEq(fieldTypeToSqlType({ type: 'boolean', column: 'foo' }), 'BOOLEAN', 'explicit boolean');
assertEq(fieldTypeToSqlType({ type: 'bool', column: 'foo' }), 'BOOLEAN', 'explicit bool');
assertEq(fieldTypeToSqlType({ type: 'text', column: 'foo' }), 'TEXT', 'explicit text');

// Inferred from column name
assertEq(fieldTypeToSqlType({ type: 'string', column: 'baptism_date' }), 'DATE', 'inferred date from _date');
assertEq(fieldTypeToSqlType({ type: 'string', column: 'date_of_birth' }), 'DATE', 'inferred date from date');
assertEq(fieldTypeToSqlType({ type: 'string', column: 'user_id' }), 'INT', 'inferred int from _id');
assertEq(fieldTypeToSqlType({ type: 'string', column: 'page_number' }), 'INT', 'inferred int from number');
assertEq(fieldTypeToSqlType({ type: 'string', column: 'record_count' }), 'INT', 'inferred int from count');
assertEq(fieldTypeToSqlType({ type: 'string', column: 'notes' }), 'TEXT', 'inferred text from notes');
assertEq(fieldTypeToSqlType({ type: 'string', column: 'description' }), 'TEXT', 'inferred text from description');

// Fallback to VARCHAR(255)
assertEq(fieldTypeToSqlType({ type: 'string', column: 'first_name' }), 'VARCHAR(255)', 'default VARCHAR');
assertEq(fieldTypeToSqlType({ column: 'foo' }), 'VARCHAR(255)', 'missing type → VARCHAR');
assertEq(fieldTypeToSqlType({}), 'VARCHAR(255)', 'empty field → VARCHAR');

// Type uppercase handled (lowercased)
assertEq(fieldTypeToSqlType({ type: 'DATE', column: 'foo' }), 'DATE', 'uppercase type');

// Uses field.field as fallback for column
assertEq(fieldTypeToSqlType({ type: 'string', field: 'baptism_date' }), 'DATE', 'uses field.field fallback');

// ============================================================================
// generateCreateTableFromTemplate — errors
// ============================================================================
console.log('\n── generateCreateTableFromTemplate: errors ──────────────');

{
  let caught: Error | null = null;
  try { generateCreateTableFromTemplate('foo', null, 1); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Template fields are required'),
    'null fields throws');
}

{
  let caught: Error | null = null;
  try { generateCreateTableFromTemplate('foo', [], 1); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'empty fields throws');
}

{
  let caught: Error | null = null;
  try { generateCreateTableFromTemplate('foo', 'not-array' as any, 1); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'non-array fields throws');
}

// ============================================================================
// generateCreateTableFromTemplate — happy path
// ============================================================================
console.log('\n── generateCreateTableFromTemplate: happy path ──────────');

{
  const sql = generateCreateTableFromTemplate('baptism_records', [
    { column: 'first_name', type: 'string', required: true },
    { column: 'last_name', type: 'string', required: true },
    { column: 'baptism_date', type: 'date' },
    { column: 'notes' },
  ], 46);

  assert(/CREATE TABLE IF NOT EXISTS `baptism_records`/.test(sql), 'table name');
  assert(/id INT PRIMARY KEY AUTO_INCREMENT/.test(sql), 'id column first');
  assert(/church_id INT NOT NULL DEFAULT 46/.test(sql), 'auto church_id with default');
  assert(/`first_name` VARCHAR\(255\) NOT NULL/.test(sql), 'required → NOT NULL');
  assert(/`last_name` VARCHAR\(255\) NOT NULL/.test(sql), 'last_name NOT NULL');
  assert(/`baptism_date` DATE/.test(sql), 'baptism_date DATE');
  assert(!/`baptism_date` DATE NOT NULL/.test(sql), 'non-required no NOT NULL');
  assert(/`notes` TEXT/.test(sql), 'notes inferred TEXT');
  assert(/created_by INT/.test(sql), 'created_by');
  assert(/created_at TIMESTAMP/.test(sql), 'created_at');
  assert(/updated_at TIMESTAMP/.test(sql), 'updated_at');
  assert(/INDEX idx_baptism_records_first_name \(`first_name`\)/.test(sql),
    'first_name indexed');
  assert(/INDEX idx_baptism_records_last_name \(`last_name`\)/.test(sql),
    'last_name indexed');
  assert(/INDEX idx_baptism_records_baptism_date \(`baptism_date`\)/.test(sql),
    'baptism_date indexed');
  assert(/ENGINE=InnoDB/.test(sql), 'InnoDB engine');
}

// church_id provided by field → NOT auto-added
{
  const sql = generateCreateTableFromTemplate('foo', [
    { column: 'church_id', type: 'number' },
    { column: 'name', type: 'string' },
  ], 46);
  const matches = sql.match(/church_id/g) || [];
  // One in `church_id` column + one in INDEX idx_foo_church_id
  assert(!/church_id INT NOT NULL DEFAULT 46/.test(sql), 'no auto church_id default');
  assert(matches.length >= 1, 'church_id still present from field');
}

// church_id with falsy churchId → DEFAULT 0
{
  const sql = generateCreateTableFromTemplate('foo', [
    { column: 'name', type: 'string' },
  ], 0);
  assert(/church_id INT NOT NULL DEFAULT 0/.test(sql), 'churchId=0 → DEFAULT 0');
}

{
  const sql = generateCreateTableFromTemplate('foo', [
    { column: 'name', type: 'string' },
  ], undefined as any);
  assert(/church_id INT NOT NULL DEFAULT 0/.test(sql), 'undefined churchId → DEFAULT 0');
}

// Default value escaped (SQL injection attempt)
{
  const sql = generateCreateTableFromTemplate('foo', [
    { column: 'name', type: 'string', default: "O'Brien" },
  ], 1);
  assert(/DEFAULT 'O''Brien'/.test(sql), 'single quote escaped');
  assert(!/DEFAULT 'O'Brien'/.test(sql), 'no unescaped quote');
}

// Fields without column/field name are skipped
{
  const sql = generateCreateTableFromTemplate('foo', [
    { type: 'string' },
    { column: 'valid', type: 'string' },
  ], 1);
  assert(/`valid`/.test(sql), 'valid column included');
}

// id / church_id are skipped from field iteration (handled specially)
{
  const sql = generateCreateTableFromTemplate('foo', [
    { column: 'id', type: 'number' },
    { column: 'name', type: 'string' },
  ], 1);
  const idMatches = (sql.match(/^\s*`?id`? INT/gm) || []).length;
  // Only the auto id PRIMARY KEY line should exist
  assert(/id INT PRIMARY KEY AUTO_INCREMENT/.test(sql), 'auto id present');
  assert(!/`id` VARCHAR/.test(sql), 'field id not added as VARCHAR');
}

// Field with `field` property (not `column`)
{
  const sql = generateCreateTableFromTemplate('foo', [
    { field: 'my_field', type: 'string' },
  ], 1);
  assert(/`my_field` VARCHAR/.test(sql), 'field.field fallback works');
}

// Default value escaping preserves null-or-undefined as no default
{
  const sql = generateCreateTableFromTemplate('foo', [
    { column: 'a', type: 'string', default: null },
    { column: 'b', type: 'string', default: undefined },
  ], 1);
  assert(!/`a` VARCHAR\(255\).*DEFAULT/.test(sql), 'null default → no DEFAULT');
  assert(!/`b` VARCHAR\(255\).*DEFAULT/.test(sql), 'undefined default → no DEFAULT');
}

// ============================================================================
// provisionTablesFromTemplates — empty selection
// ============================================================================
console.log('\n── provisionTablesFromTemplates: empty ───────────────────');

resetState();
{
  const r = await provisionTablesFromTemplates(46, {});
  assertEq(r.tables_created, [], 'no tables created');
  assertEq(r.tables_failed, [], 'no failures');
  assertEq(r.errors, [], 'no errors');
  assertEq(connectionReleased, 0, 'no connection opened');
}

resetState();
{
  const r = await provisionTablesFromTemplates(46, null as any);
  assertEq(r.tables_created, [], 'null templates → empty');
}

// ============================================================================
// provisionTablesFromTemplates — happy path
// ============================================================================
console.log('\n── provisionTablesFromTemplates: happy path ─────────────');

resetState();
appRoutes = [
  {
    match: /SELECT slug, name, record_type, fields/,
    rows: [{
      slug: 'en_baptism_records',
      name: 'English Baptism',
      record_type: 'baptism',
      fields: JSON.stringify([
        { column: 'first_name', type: 'string', required: true },
        { column: 'baptism_date', type: 'date' },
      ]),
    }],
  },
];
quiet();
{
  const r = await provisionTablesFromTemplates(46, { baptism: 'en_baptism_records' });
  loud();
  assertEq(r.tables_created.length, 1, '1 table created');
  assertEq(r.tables_created[0].table, 'baptism_records', 'baptism_records');
  assertEq(r.tables_created[0].template_slug, 'en_baptism_records', 'template slug');
  assertEq(r.tables_created[0].template_name, 'English Baptism', 'template name');
  assertEq(r.tables_created[0].fields_count, 2, 'fields_count=2');
  assertEq(r.tables_failed, [], 'no failures');
  // church connection: 2 executes (record table + history table)
  assertEq(churchExecuteLog.length, 2, '2 executes (record + history)');
  assert(/CREATE TABLE IF NOT EXISTS `baptism_records`/.test(churchExecuteLog[0]),
    'first creates baptism_records');
  assert(/CREATE TABLE IF NOT EXISTS `baptism_history`/.test(churchExecuteLog[1]),
    'second creates baptism_history');
  assertEq(connectionReleased, 1, 'connection released once');
}

// ============================================================================
// provisionTablesFromTemplates — unknown record type
// ============================================================================
console.log('\n── provisionTablesFromTemplates: unknown type ───────────');

resetState();
quiet();
{
  const r = await provisionTablesFromTemplates(46, {
    unknown_type: 'some_slug',
  });
  loud();
  assertEq(r.tables_created, [], 'nothing created');
  assertEq(r.tables_failed, [], 'not in failed list — just skipped');
  assertEq(connectionReleased, 1, 'connection released');
}

// Empty template slug → skipped
resetState();
quiet();
{
  const r = await provisionTablesFromTemplates(46, { baptism: '' });
  loud();
  assertEq(r.tables_created, [], 'empty slug skipped');
  assertEq(churchExecuteLog.length, 0, 'no SQL executed');
  assertEq(connectionReleased, 1, 'connection released');
}

// ============================================================================
// provisionTablesFromTemplates — template not found
// ============================================================================
console.log('\n── provisionTablesFromTemplates: template not found ─────');

resetState();
appRoutes = [
  { match: /SELECT slug, name, record_type, fields/, rows: [] },
];
quiet();
{
  const r = await provisionTablesFromTemplates(46, { baptism: 'missing' });
  loud();
  assertEq(r.tables_created, [], 'nothing created');
  assertEq(r.tables_failed.length, 1, '1 failure');
  assertEq(r.tables_failed[0].table, 'baptism_records', 'failed table');
  assert(
    r.tables_failed[0].reason.includes('missing'),
    'reason mentions missing slug'
  );
}

// ============================================================================
// provisionTablesFromTemplates — DB execute error
// ============================================================================
console.log('\n── provisionTablesFromTemplates: execute error ──────────');

resetState();
appRoutes = [
  {
    match: /SELECT slug, name, record_type, fields/,
    rows: [{
      slug: 'en_marriage',
      name: 'Marriage',
      record_type: 'marriage',
      fields: [{ column: 'husband', type: 'string' }],
    }],
  },
];
churchExecuteThrowsOnPattern = /CREATE TABLE IF NOT EXISTS `marriage_records`/;
quiet();
{
  const r = await provisionTablesFromTemplates(46, { marriage: 'en_marriage' });
  loud();
  assertEq(r.tables_created, [], 'not created');
  assertEq(r.tables_failed.length, 1, '1 failure');
  assertEq(r.tables_failed[0].table, 'marriage_records', 'failed table');
  assert(r.tables_failed[0].error.includes('fake'), 'error captured');
  assertEq(r.errors.length, 1, '1 error entry');
  assertEq(connectionReleased, 1, 'connection still released (finally)');
}

// ============================================================================
// provisionTablesFromTemplates — fields is object (not string)
// ============================================================================
console.log('\n── provisionTablesFromTemplates: object fields ──────────');

resetState();
appRoutes = [
  {
    match: /SELECT slug, name, record_type, fields/,
    rows: [{
      slug: 'en_funeral',
      name: 'Funeral',
      record_type: 'funeral',
      // Object, not stringified — should pass through
      fields: [{ column: 'deceased_name', type: 'string' }],
    }],
  },
];
quiet();
{
  const r = await provisionTablesFromTemplates(46, { funeral: 'en_funeral' });
  loud();
  assertEq(r.tables_created.length, 1, 'object fields parsed OK');
  assertEq(r.tables_created[0].table, 'funeral_records', 'funeral_records created');
}

// ============================================================================
// provisionTablesFromTemplates — outer error re-thrown
// ============================================================================
console.log('\n── provisionTablesFromTemplates: outer error ────────────');

resetState();
getChurchDbConnectionThrows = true;
quiet();
{
  let caught: Error | null = null;
  try {
    await provisionTablesFromTemplates(46, { baptism: 'en_baptism' });
  } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'connection error re-thrown');
  assert(
    caught !== null && caught.message.includes('cannot connect'),
    'original error preserved'
  );
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
