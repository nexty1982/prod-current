#!/usr/bin/env npx tsx
/**
 * Unit tests for services/templateTableProvisioner.js (OMD-1092)
 *
 * Turns template.fields JSON into CREATE TABLE statements, then provisions
 * record/history tables in a church DB. Two external deps:
 *   - ../config/db              → getAppPool (templates lookup)
 *   - ../utils/dbSwitcher       → getChurchDbConnection (church DB access)
 *
 * Both stubbed via require.cache before requiring the SUT.
 *
 * Coverage:
 *   - fieldTypeToSqlType: date/number/boolean/text/default + column-name
 *     heuristics (_date, _id, count, number, notes, description)
 *   - generateCreateTableFromTemplate:
 *       · throws when fields missing or empty
 *       · always prepends id PRIMARY KEY
 *       · adds church_id column when not present in template
 *       · skips id/church_id in template to avoid duplicates
 *       · adds timestamp columns (created_by/at, updated_at)
 *       · adds indexes for known indexed fields
 *       · NOT NULL + default value handling (with SQL-injection escape)
 *       · supports both `field.column` and `field.field`
 *   - provisionTablesFromTemplates:
 *       · empty selectedTemplates → empty result
 *       · null-valued slugs skipped
 *       · unknown record type warned + skipped
 *       · template not found → added to tables_failed
 *       · happy path creates record table AND history table
 *       · fields stored as JSON string are parsed
 *       · per-template error captured, loop continues
 *       · connection.release() called in finally
 *       · top-level error rethrown
 *
 * Run: npx tsx server/src/services/__tests__/templateTableProvisioner.test.ts
 */

import * as pathMod from 'path';

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

// ── Fake app pool (templates lookup) ─────────────────────────────────
type AppQueryCall = { sql: string; params: any[] };
const appQueryLog: AppQueryCall[] = [];
let templatesBySlug: Record<string, any> = {};

const fakeAppPool = {
  query: async (sql: string, params: any[] = []) => {
    appQueryLog.push({ sql, params });
    if (/FROM `[^`]+`\.templates/i.test(sql)) {
      const slug = params[0];
      const row = templatesBySlug[slug];
      return row ? [[row], []] : [[], []];
    }
    return [[], []];
  },
};

const fakeDbModule = { getAppPool: () => fakeAppPool };

// ── Fake church DB connection (executes CREATE TABLE statements) ─────
type ExecuteCall = { sql: string };
const executeLog: ExecuteCall[] = [];
let releaseCount = 0;
let executeThrowsOnPattern: RegExp | null = null;
let getConnectionThrows = false;

const fakeChurchConnection = {
  execute: async (sql: string) => {
    executeLog.push({ sql });
    if (executeThrowsOnPattern && executeThrowsOnPattern.test(sql)) {
      throw new Error('church db fail');
    }
    return [{}];
  },
  release: () => { releaseCount++; },
};

const fakeChurchPool = {
  getConnection: async () => {
    if (getConnectionThrows) throw new Error('getConnection boom');
    return fakeChurchConnection;
  },
};

const fakeDbSwitcher = {
  getChurchDbConnection: async (_dbName: string) => fakeChurchPool,
};

// ── Stub modules ─────────────────────────────────────────────────────
function stubModule(relFromSrc: string, exports: any) {
  const absWithoutExt = pathMod.resolve(__dirname, '..', '..', relFromSrc);
  const resolved = require.resolve(absWithoutExt);
  require.cache[resolved] = {
    id: resolved, filename: resolved, loaded: true, exports,
  } as any;
}

stubModule('config/db', fakeDbModule);
stubModule('utils/dbSwitcher', fakeDbSwitcher);

function resetAll() {
  appQueryLog.length = 0;
  templatesBySlug = {};
  executeLog.length = 0;
  releaseCount = 0;
  executeThrowsOnPattern = null;
  getConnectionThrows = false;
}

// Silence
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

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

assertEq(fieldTypeToSqlType({ type: 'date' }), 'DATE', 'type=date');
assertEq(fieldTypeToSqlType({ type: 'number' }), 'INT', 'type=number');
assertEq(fieldTypeToSqlType({ type: 'int' }), 'INT', 'type=int');
assertEq(fieldTypeToSqlType({ type: 'boolean' }), 'BOOLEAN', 'type=boolean');
assertEq(fieldTypeToSqlType({ type: 'bool' }), 'BOOLEAN', 'type=bool');
assertEq(fieldTypeToSqlType({ type: 'text' }), 'TEXT', 'type=text');
assertEq(fieldTypeToSqlType({ type: 'string' }), 'VARCHAR(255)', 'type=string default');
assertEq(fieldTypeToSqlType({}), 'VARCHAR(255)', 'no type default');

// Column-name heuristics
assertEq(fieldTypeToSqlType({ column: 'baptism_date' }), 'DATE', 'column contains _date');
assertEq(fieldTypeToSqlType({ column: 'user_id' }), 'INT', 'column contains _id');
assertEq(fieldTypeToSqlType({ column: 'notes' }), 'TEXT', 'column=notes → TEXT');
assertEq(fieldTypeToSqlType({ column: 'description' }), 'TEXT', 'column=description → TEXT');
assertEq(fieldTypeToSqlType({ column: 'page_count' }), 'INT', 'column contains count');
assertEq(fieldTypeToSqlType({ column: 'record_number' }), 'INT', 'column contains number');
assertEq(fieldTypeToSqlType({ field: 'first_name' }), 'VARCHAR(255)', 'plain name default');

// Explicit type wins over column name... actually NO, looking at the code,
// the heuristics fire based on type first, then column matches fall through.
// type='date' already returns DATE, so we don't need to test that collision.

// ============================================================================
// generateCreateTableFromTemplate — validation
// ============================================================================
console.log('\n── generateCreateTableFromTemplate: validation ───────────');

{
  let caught: any = null;
  try { generateCreateTableFromTemplate('t', null, 1); } catch (e) { caught = e; }
  assert(caught !== null, 'null fields throws');
}
{
  let caught: any = null;
  try { generateCreateTableFromTemplate('t', [], 1); } catch (e) { caught = e; }
  assert(caught !== null, 'empty fields throws');
  assert(caught && caught.message.includes('Template fields are required'), 'error mentions required');
}
{
  let caught: any = null;
  try { generateCreateTableFromTemplate('t', 'not an array' as any, 1); } catch (e) { caught = e; }
  assert(caught !== null, 'non-array throws');
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
    { column: 'notes', type: 'text' },
  ], 46);

  assert(/CREATE TABLE IF NOT EXISTS `baptism_records`/.test(sql), 'CREATE TABLE');
  assert(/id INT PRIMARY KEY AUTO_INCREMENT/.test(sql), 'id PK');
  assert(/church_id INT NOT NULL DEFAULT 46/.test(sql), 'church_id default');
  assert(/`first_name` VARCHAR\(255\) NOT NULL/.test(sql), 'first_name NOT NULL');
  assert(/`last_name` VARCHAR\(255\) NOT NULL/.test(sql), 'last_name NOT NULL');
  assert(/`baptism_date` DATE/.test(sql), 'baptism_date DATE');
  assert(/`notes` TEXT/.test(sql), 'notes TEXT');
  assert(/created_by INT/.test(sql), 'created_by');
  assert(/created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP/.test(sql), 'created_at');
  assert(/updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE/.test(sql), 'updated_at');
  assert(/ENGINE=InnoDB/.test(sql), 'InnoDB engine');
  assert(/utf8mb4/.test(sql), 'utf8mb4 charset');
  // Indexes
  assert(/INDEX idx_baptism_records_first_name/.test(sql), 'index first_name');
  assert(/INDEX idx_baptism_records_last_name/.test(sql), 'index last_name');
  assert(/INDEX idx_baptism_records_baptism_date/.test(sql), 'index baptism_date');
}

// Template with its own church_id — should NOT be duplicated
{
  const sql = generateCreateTableFromTemplate('t', [
    { column: 'church_id', type: 'int' },
    { column: 'name', type: 'string' },
  ], 46);
  // church_id should appear only once (from template, not the default clause)
  // church_id is in indexedFields list, so it shows up twice when in template:
  // once as a column declaration, once in the INDEX name. The point is that
  // the DEFAULT fallback line ("church_id INT NOT NULL DEFAULT 46") is NOT emitted.
  assert(!/church_id INT NOT NULL DEFAULT 46/.test(sql), 'no default church_id line');
  assert(/`church_id`/.test(sql), 'church_id column present from template');
  assert(/idx_t_church_id/.test(sql), 'church_id is indexed');
}

// Template with id field — should be skipped
{
  const sql = generateCreateTableFromTemplate('t', [
    { column: 'id', type: 'int' }, // skipped
    { column: 'name', type: 'string' },
  ], 0);
  // id should only appear in the hardcoded PK line
  const idLines = sql.split('\n').filter((l) => /\bid\b/i.test(l) && !/idx_/i.test(l));
  // First match: "id INT PRIMARY KEY AUTO_INCREMENT"
  assert(
    idLines.some((l) => /id INT PRIMARY KEY AUTO_INCREMENT/.test(l)),
    'id PK line present'
  );
  // There should be no additional `id` column line with just INT
  const extraIdCol = idLines.filter((l) => /`id`/.test(l));
  assertEq(extraIdCol.length, 0, 'no extra `id` column line');
}

// Supports `field.field` instead of `field.column`
{
  const sql = generateCreateTableFromTemplate('t', [
    { field: 'alt_name', type: 'string' },
  ], 0);
  assert(/`alt_name`/.test(sql), 'uses field.field fallback');
}

// Field with no column/field name → skipped
{
  const sql = generateCreateTableFromTemplate('t', [
    { type: 'string' }, // no column or field → skipped
    { column: 'valid', type: 'string' },
  ], 0);
  assert(/`valid`/.test(sql), 'valid column present');
  // Only one non-id/church_id/timestamp column
}

// Default value with single-quote escape (SQL injection guard)
{
  const sql = generateCreateTableFromTemplate('t', [
    { column: 'status', type: 'string', default: "it's" },
  ], 0);
  assert(/`status` VARCHAR\(255\)\s+DEFAULT 'it''s'/.test(sql), 'single-quote escaped');
}

// Default value with non-required field (NOT NULL empty)
{
  const sql = generateCreateTableFromTemplate('t', [
    { column: 'foo', type: 'string', default: 'bar' },
  ], 0);
  assert(/`foo` VARCHAR\(255\)\s+DEFAULT 'bar'/.test(sql), 'default without NOT NULL');
}

// Default value = 0 is honored (not treated as undefined)
{
  const sql = generateCreateTableFromTemplate('t', [
    { column: 'cnt', type: 'number', default: 0 },
  ], 0);
  assert(/`cnt` INT\s+DEFAULT '0'/.test(sql), 'default=0 honored');
}

// Default null is NOT emitted
{
  const sql = generateCreateTableFromTemplate('t', [
    { column: 'foo', type: 'string', default: null },
  ], 0);
  assert(!/DEFAULT 'null'/.test(sql), 'null default not emitted');
}

// churchId null/undefined → defaults to 0
{
  const sql = generateCreateTableFromTemplate('t', [
    { column: 'name', type: 'string' },
  ], null as any);
  assert(/church_id INT NOT NULL DEFAULT 0/.test(sql), 'null churchId → 0');
}

// ============================================================================
// provisionTablesFromTemplates — empty input
// ============================================================================
console.log('\n── provision: empty input ────────────────────────────────');

resetAll();
{
  const r = await provisionTablesFromTemplates(46, {});
  assertEq(r.tables_created, [], 'empty created');
  assertEq(r.tables_failed, [], 'empty failed');
  assertEq(r.errors, [], 'empty errors');
  assertEq(appQueryLog.length, 0, 'no DB calls');
}

resetAll();
{
  const r = await provisionTablesFromTemplates(46, null as any);
  assertEq(r.tables_created.length, 0, 'null → empty created');
}

// ============================================================================
// provision: happy path — single template
// ============================================================================
console.log('\n── provision: happy path ─────────────────────────────────');

resetAll();
templatesBySlug = {
  en_baptism_records: {
    slug: 'en_baptism_records',
    name: 'English Baptism',
    record_type: 'baptism',
    fields: JSON.stringify([
      { column: 'first_name', type: 'string', required: true },
      { column: 'baptism_date', type: 'date' },
    ]),
  },
};

quiet();
const r = await provisionTablesFromTemplates(46, { baptism: 'en_baptism_records' });
loud();

assertEq(r.tables_created.length, 1, '1 table created');
assertEq(r.tables_failed.length, 0, '0 failed');
assertEq(r.errors.length, 0, 'no errors');
assertEq(r.tables_created[0].table, 'baptism_records', 'record table name');
assertEq(r.tables_created[0].template_slug, 'en_baptism_records', 'slug');
assertEq(r.tables_created[0].template_name, 'English Baptism', 'template name');
assertEq(r.tables_created[0].fields_count, 2, 'fields count');

// Executes: 1) record CREATE TABLE, 2) history CREATE TABLE
assertEq(executeLog.length, 2, '2 execute calls (record + history)');
assert(/baptism_records/.test(executeLog[0].sql), 'first: baptism_records');
assert(/baptism_history/.test(executeLog[1].sql), 'second: baptism_history');
assert(/ENUM\('INSERT', 'UPDATE', 'DELETE'\)/.test(executeLog[1].sql), 'history ENUM action column');
assertEq(releaseCount, 1, 'connection released');

// ============================================================================
// provision: template fields as object (not stringified)
// ============================================================================
console.log('\n── provision: fields as object ───────────────────────────');

resetAll();
templatesBySlug = {
  en_marriage: {
    slug: 'en_marriage',
    name: 'EN Marriage',
    record_type: 'marriage',
    fields: [{ column: 'bride_name', type: 'string' }], // object, not JSON string
  },
};

quiet();
const r2 = await provisionTablesFromTemplates(46, { marriage: 'en_marriage' });
loud();

assertEq(r2.tables_created.length, 1, 'created from object fields');
assertEq(r2.tables_created[0].table, 'marriage_records', 'marriage_records table');

// ============================================================================
// provision: unknown record type → skipped with warning
// ============================================================================
console.log('\n── provision: unknown record type ────────────────────────');

resetAll();
templatesBySlug = {
  en_bogus: { slug: 'en_bogus', name: 'Bogus', record_type: 'x', fields: [] },
};

quiet();
const r3 = await provisionTablesFromTemplates(46, { unknownType: 'en_bogus' });
loud();

assertEq(r3.tables_created.length, 0, 'nothing created for unknown type');
assertEq(r3.tables_failed.length, 0, 'not added to failed');
assertEq(executeLog.length, 0, 'no execute calls');
assertEq(releaseCount, 1, 'released');

// ============================================================================
// provision: null/empty slug values skipped
// ============================================================================
console.log('\n── provision: null slug values ───────────────────────────');

resetAll();
quiet();
const r4 = await provisionTablesFromTemplates(46, { baptism: null, marriage: '', funeral: null });
loud();

assertEq(r4.tables_created.length, 0, 'no tables when all slugs null/empty');
assertEq(executeLog.length, 0, 'no execute calls');
// connection is still acquired — release called
assertEq(releaseCount, 1, 'released even on empty pass');

// ============================================================================
// provision: template not found
// ============================================================================
console.log('\n── provision: template not found ─────────────────────────');

resetAll();
templatesBySlug = {}; // nothing exists

quiet();
const r5 = await provisionTablesFromTemplates(46, { baptism: 'missing_template' });
loud();

assertEq(r5.tables_created.length, 0, 'nothing created');
assertEq(r5.tables_failed.length, 1, '1 failed');
assertEq(r5.tables_failed[0].table, 'baptism_records', 'failed table name');
assert(r5.tables_failed[0].reason.includes('missing_template'), 'reason includes slug');
assert(r5.tables_failed[0].reason.includes('not found'), 'reason mentions not found');

// ============================================================================
// provision: execute error → captured in failed, loop continues
// ============================================================================
console.log('\n── provision: execute error ──────────────────────────────');

resetAll();
templatesBySlug = {
  t_baptism: {
    slug: 't_baptism',
    name: 'Baptism',
    record_type: 'baptism',
    fields: [{ column: 'name', type: 'string' }],
  },
  t_marriage: {
    slug: 't_marriage',
    name: 'Marriage',
    record_type: 'marriage',
    fields: [{ column: 'groom', type: 'string' }],
  },
};
// Fail only on the baptism record table (first CREATE TABLE)
executeThrowsOnPattern = /baptism_records/;

quiet();
const r6 = await provisionTablesFromTemplates(46, {
  baptism: 't_baptism',
  marriage: 't_marriage',
});
loud();

// Marriage should succeed, baptism should fail
assertEq(r6.tables_created.length, 1, '1 succeeded');
assertEq(r6.tables_created[0].table, 'marriage_records', 'marriage succeeded');
assertEq(r6.tables_failed.length, 1, '1 failed');
assertEq(r6.tables_failed[0].table, 'baptism_records', 'baptism failed');
assertEq(r6.tables_failed[0].template_slug, 't_baptism', 'failed slug');
assert(r6.tables_failed[0].error.includes('church db fail'), 'failed error msg');
assert(r6.errors.length > 0, 'errors array populated');
assertEq(releaseCount, 1, 'released even after partial failure');

// ============================================================================
// provision: top-level error (getConnection throws) → rethrown
// ============================================================================
console.log('\n── provision: getConnection throws ───────────────────────');

resetAll();
getConnectionThrows = true;

{
  let caught: any = null;
  quiet();
  try {
    await provisionTablesFromTemplates(46, { baptism: 'slug' });
  } catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'rethrows on top-level error');
  assert(caught && /getConnection boom/.test(caught.message), 'original error message');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
