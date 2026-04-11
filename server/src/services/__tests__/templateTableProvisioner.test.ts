#!/usr/bin/env npx tsx
/**
 * Unit tests for services/templateTableProvisioner.js (OMD-998)
 *
 * Exports:
 *   - fieldTypeToSqlType(field)                        (pure)
 *   - generateCreateTableFromTemplate(name, fields, churchId)  (pure)
 *   - provisionTablesFromTemplates(churchId, selected) (db-backed)
 *
 * Stubs:
 *   - ../config/db → getAppPool
 *   - ../utils/dbSwitcher → getChurchDbConnection
 *
 * Run: npx tsx server/src/services/__tests__/templateTableProvisioner.test.ts
 */

// ── stub ../config/db ─────────────────────────────────────────────────
type PoolCall = { sql: string; params: any[] };
let appQCalls: PoolCall[] = [];
type Route = { match: RegExp; rows: any[] };
let appRoutes: Route[] = [];
let appThrows = false;

const fakeAppPool = {
  query: async (sql: string, params: any[] = []) => {
    appQCalls.push({ sql, params });
    if (appThrows) throw new Error('app db down');
    for (const r of appRoutes) {
      if (r.match.test(sql)) return [r.rows, {}];
    }
    return [[], {}];
  },
};
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakeAppPool },
} as any;

// ── stub ../utils/dbSwitcher ──────────────────────────────────────────
type ExecCall = { sql: string; params?: any[] };
let execCalls: ExecCall[] = [];
let execThrowsOnSql: RegExp | null = null;
let connReleaseCount = 0;
let getConnThrows = false;

const fakeConnection = {
  execute: async (sql: string, params?: any[]) => {
    execCalls.push({ sql, params });
    if (execThrowsOnSql && execThrowsOnSql.test(sql)) {
      throw new Error('execute failed');
    }
    return [{}, {}];
  },
  release: () => { connReleaseCount++; },
};

const fakeChurchPool = {
  getConnection: async () => {
    if (getConnThrows) throw new Error('cannot get connection');
    return fakeConnection;
  },
};

const switcherPath = require.resolve('../../utils/dbSwitcher');
require.cache[switcherPath] = {
  id: switcherPath,
  filename: switcherPath,
  loaded: true,
  exports: {
    getChurchDbConnection: async (_name: string) => fakeChurchPool,
  },
} as any;

const {
  fieldTypeToSqlType,
  generateCreateTableFromTemplate,
  provisionTablesFromTemplates,
} = require('../templateTableProvisioner');

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

const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;
function quiet() { console.log = () => {}; console.error = () => {}; console.warn = () => {}; }
function loud() { console.log = origLog; console.error = origError; console.warn = origWarn; }

function resetDb() {
  appQCalls = [];
  appRoutes = [];
  appThrows = false;
  execCalls = [];
  execThrowsOnSql = null;
  connReleaseCount = 0;
  getConnThrows = false;
}

async function main() {

// ============================================================================
// fieldTypeToSqlType — pure
// ============================================================================
console.log('\n── fieldTypeToSqlType ───────────────────────────────────');

// Explicit types
assertEq(fieldTypeToSqlType({ type: 'date', column: 'x' }), 'DATE', 'type=date');
assertEq(fieldTypeToSqlType({ type: 'DATE', column: 'x' }), 'DATE', 'type=DATE (case-insensitive)');
assertEq(fieldTypeToSqlType({ type: 'number', column: 'x' }), 'INT', 'type=number');
assertEq(fieldTypeToSqlType({ type: 'int', column: 'x' }), 'INT', 'type=int');
assertEq(fieldTypeToSqlType({ type: 'boolean', column: 'x' }), 'BOOLEAN', 'type=boolean');
assertEq(fieldTypeToSqlType({ type: 'bool', column: 'x' }), 'BOOLEAN', 'type=bool');
assertEq(fieldTypeToSqlType({ type: 'text', column: 'x' }), 'TEXT', 'type=text');

// Default
assertEq(fieldTypeToSqlType({ type: 'string', column: 'x' }), 'VARCHAR(255)', 'type=string');
assertEq(fieldTypeToSqlType({ column: 'x' }), 'VARCHAR(255)', 'no type → VARCHAR');
assertEq(fieldTypeToSqlType({}), 'VARCHAR(255)', 'empty field → VARCHAR');

// Column-name heuristics
assertEq(fieldTypeToSqlType({ column: 'baptism_date' }), 'DATE', 'column contains _date → DATE');
assertEq(fieldTypeToSqlType({ column: 'birthdate' }), 'DATE', 'column contains date → DATE');
assertEq(fieldTypeToSqlType({ column: 'church_id' }), 'INT', 'column contains _id → INT');
assertEq(fieldTypeToSqlType({ column: 'id' }), 'INT', 'column == id → INT');
assertEq(fieldTypeToSqlType({ column: 'record_number' }), 'INT', 'column contains number → INT');
assertEq(fieldTypeToSqlType({ column: 'child_count' }), 'INT', 'column contains count → INT');
assertEq(fieldTypeToSqlType({ column: 'notes' }), 'TEXT', 'column contains notes → TEXT');
assertEq(fieldTypeToSqlType({ column: 'description' }), 'TEXT', 'column contains description → TEXT');

// Fallback to `field` key
assertEq(fieldTypeToSqlType({ field: 'baptism_date' }), 'DATE', 'field key works too');
assertEq(fieldTypeToSqlType({ field: 'first_name' }), 'VARCHAR(255)', 'field fallback to varchar');

// ============================================================================
// generateCreateTableFromTemplate — pure
// ============================================================================
console.log('\n── generateCreateTableFromTemplate: validation ──────────');

// Empty fields → throws
{
  let thrown = false;
  try {
    generateCreateTableFromTemplate('baptism_records', [], 1);
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('required'), 'empty fields error mentions required');
    assert(e.message.includes('baptism_records'), 'error includes table name');
  }
  assert(thrown, 'empty fields → throws');
}

{
  let thrown = false;
  try {
    generateCreateTableFromTemplate('x', null, 1);
  } catch (e: any) { thrown = true; }
  assert(thrown, 'null fields → throws');
}

// ============================================================================
// generateCreateTableFromTemplate — happy path
// ============================================================================
console.log('\n── generateCreateTableFromTemplate: happy path ──────────');

{
  const sql = generateCreateTableFromTemplate(
    'baptism_records',
    [
      { column: 'first_name', type: 'string', required: true },
      { column: 'last_name', type: 'string', required: true },
      { column: 'baptism_date', type: 'date' },
      { column: 'notes' }, // heuristic → TEXT
      { field: 'child_count' }, // fallback to field, heuristic → INT
    ],
    42
  );

  // Base structure
  assert(/CREATE TABLE IF NOT EXISTS `baptism_records`/.test(sql), 'CREATE TABLE IF NOT EXISTS wraps table name');
  assert(/id INT PRIMARY KEY AUTO_INCREMENT/.test(sql), 'id primary key');
  assert(/church_id INT NOT NULL DEFAULT 42/.test(sql), 'church_id default churchId');

  // Column generation
  assert(/`first_name` VARCHAR\(255\) NOT NULL/.test(sql), 'first_name required varchar');
  assert(/`last_name` VARCHAR\(255\) NOT NULL/.test(sql), 'last_name required varchar');
  assert(/`baptism_date` DATE/.test(sql), 'baptism_date date');
  assert(/`notes` TEXT/.test(sql), 'notes text from heuristic');
  assert(/`child_count` INT/.test(sql), 'child_count int from field+heuristic');

  // Standard timestamps
  assert(/created_by INT/.test(sql), 'created_by column');
  assert(/created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP/.test(sql), 'created_at timestamp');
  assert(
    /updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP/.test(sql),
    'updated_at auto-update'
  );

  // Indexes
  assert(/INDEX idx_baptism_records_first_name/.test(sql), 'first_name indexed');
  assert(/INDEX idx_baptism_records_last_name/.test(sql), 'last_name indexed');
  assert(/INDEX idx_baptism_records_baptism_date/.test(sql), 'baptism_date indexed');
  assert(!/INDEX idx_baptism_records_notes/.test(sql), 'notes NOT indexed');

  // Engine / charset
  assert(/ENGINE=InnoDB/.test(sql), 'InnoDB');
  assert(/utf8mb4/.test(sql), 'utf8mb4');
}

// Explicit church_id in fields → default line suppressed.
// (Per-field loop also skips church_id, so the explicit column is effectively
// not emitted — hasChurchId short-circuits both the auto-add and the loop.)
{
  const sql = generateCreateTableFromTemplate(
    'marriage_records',
    [
      { column: 'church_id', type: 'int', required: true },
      { column: 'groom_full', type: 'string' },
    ],
    99
  );
  assert(
    !/church_id INT NOT NULL DEFAULT 99/.test(sql),
    'church_id DEFAULT 99 suppressed when explicit'
  );
  // groom_full still emitted (no 'id' substring to trigger INT heuristic)
  assert(/`groom_full` VARCHAR\(255\)/.test(sql), 'other columns still emitted');
  // No bare `church_id` VARCHAR column (per-loop skip)
  assert(!/`church_id` VARCHAR/.test(sql), 'church_id not re-emitted as VARCHAR');
}

// Skips id and church_id in per-field loop
{
  const sql = generateCreateTableFromTemplate(
    't1',
    [
      { column: 'id', type: 'int' },       // skipped
      { column: 'church_id', type: 'int' },// also skipped for column emit, but hasChurchId blocks the default line
      { column: 'name', type: 'string' },
    ],
    1
  );
  // id should only appear in the autogenerated PRIMARY KEY line
  const idMatches = sql.match(/\bid\b/g) || [];
  // Primary key "id", index names etc. — just check no `id` VARCHAR column was added
  assert(!/`id` VARCHAR/.test(sql), 'id field not duplicated as VARCHAR');
}

// Default value escaping
{
  const sql = generateCreateTableFromTemplate(
    't',
    [
      { column: 'title', type: 'string', default: "O'Brien" },
      { column: 'active', type: 'boolean', default: 1 },
    ],
    1
  );
  assert(/DEFAULT 'O''Brien'/.test(sql), "single quote escaped (O''Brien)");
  assert(/DEFAULT '1'/.test(sql), 'numeric default stringified');
}

// Default = null/undefined → no DEFAULT clause
{
  const sql = generateCreateTableFromTemplate(
    't',
    [
      { column: 'name', type: 'string', default: null },
      { column: 'other', type: 'string' }, // undefined default
    ],
    1
  );
  assert(!/`name` VARCHAR\(255\).*DEFAULT/.test(sql), 'null default → no DEFAULT clause');
  assert(!/`other` VARCHAR\(255\).*DEFAULT/.test(sql), 'undefined default → no DEFAULT clause');
}

// Skips fields with empty column name
{
  const sql = generateCreateTableFromTemplate(
    't',
    [
      { type: 'string' },          // no column/field → skipped
      { column: '', type: 'string' }, // empty → skipped
      { column: 'good_field', type: 'string' },
    ],
    1
  );
  assert(/`good_field`/.test(sql), 'good field included');
  // No empty backticks
  assert(!/`` VARCHAR/.test(sql), 'no empty-name columns');
}

// No indexed fields → no index lines
{
  const sql = generateCreateTableFromTemplate(
    't',
    [
      { column: 'random_col', type: 'string' },
    ],
    1
  );
  assert(!/INDEX idx_t_/.test(sql), 'no indexes when no indexable columns');
}

// ============================================================================
// provisionTablesFromTemplates — empty / no-op
// ============================================================================
console.log('\n── provisionTablesFromTemplates: empty ──────────────────');

{
  resetDb();
  const result = await provisionTablesFromTemplates(1, {});
  assertEq(result, { tables_created: [], tables_failed: [], errors: [] }, 'empty templates → empty result');
  assertEq(appQCalls.length, 0, 'no db calls for empty templates');
}

{
  resetDb();
  const result = await provisionTablesFromTemplates(1, null);
  assertEq(result.tables_created, [], 'null templates safe');
}

// ============================================================================
// provisionTablesFromTemplates — happy path (all 3 types)
// ============================================================================
console.log('\n── provisionTablesFromTemplates: happy path ─────────────');

{
  resetDb();
  appRoutes = [{
    match: /FROM.+templates/i,
    rows: [{
      slug: 'stub',
      name: 'Stub Template',
      record_type: 'baptism',
      fields: JSON.stringify([
        { column: 'first_name', type: 'string' },
        { column: 'last_name', type: 'string' },
      ]),
    }],
  }];
  quiet();
  const result = await provisionTablesFromTemplates(7, {
    baptism: 'en_baptism_records',
    marriage: 'en_marriage_records',
    funeral: 'en_funeral_records',
  });
  loud();

  assertEq(result.tables_created.length, 3, '3 tables created');
  assertEq(result.tables_failed.length, 0, 'no failures');
  const tableNames = result.tables_created.map((t: any) => t.table).sort();
  assertEq(tableNames, ['baptism_records', 'funeral_records', 'marriage_records'], 'all 3 record tables');

  // fields_count from JSON.parse
  assertEq(result.tables_created[0].fields_count, 2, 'fields_count counted');

  // Template fetched 3 times (once per record type)
  const templateFetches = appQCalls.filter((c) => /FROM.*templates/i.test(c.sql));
  assertEq(templateFetches.length, 3, '3 template SELECTs');
  assertEq(templateFetches[0].params, ['en_baptism_records'], 'baptism slug param');
  assertEq(templateFetches[1].params, ['en_marriage_records'], 'marriage slug param');
  assertEq(templateFetches[2].params, ['en_funeral_records'], 'funeral slug param');
  assert(/is_global = 1/i.test(templateFetches[0].sql), 'filters is_global');

  // execute: 3 tables × 2 statements (main + history) = 6 executes
  assertEq(execCalls.length, 6, '6 execute() calls');
  const mainCreates = execCalls.filter((c) => /CREATE TABLE IF NOT EXISTS `(baptism|marriage|funeral)_records`/.test(c.sql));
  const historyCreates = execCalls.filter((c) => /_history`/.test(c.sql));
  assertEq(mainCreates.length, 3, '3 main CREATE TABLEs');
  assertEq(historyCreates.length, 3, '3 history CREATE TABLEs');

  // History has audit columns
  assert(historyCreates[0].sql.includes('action ENUM'), 'history has action ENUM');
  assert(historyCreates[0].sql.includes('before_json'), 'history has before_json');
  assert(historyCreates[0].sql.includes('after_json'), 'history has after_json');

  // Connection released
  assertEq(connReleaseCount, 1, 'connection released');
}

// ============================================================================
// provisionTablesFromTemplates — template not found
// ============================================================================
console.log('\n── provisionTablesFromTemplates: template not found ─────');

{
  resetDb();
  appRoutes = [{
    match: /FROM.+templates/i,
    rows: [], // none
  }];
  quiet();
  const result = await provisionTablesFromTemplates(1, { baptism: 'missing_slug' });
  loud();
  assertEq(result.tables_created.length, 0, 'nothing created');
  assertEq(result.tables_failed.length, 1, '1 failure recorded');
  assertEq(result.tables_failed[0].table, 'baptism_records', 'failed table name');
  assert(
    result.tables_failed[0].reason.includes('missing_slug'),
    'reason mentions slug'
  );
  assertEq(execCalls.length, 0, 'no executes attempted');
  assertEq(connReleaseCount, 1, 'connection still released');
}

// ============================================================================
// provisionTablesFromTemplates — unknown record type skipped
// ============================================================================
console.log('\n── provisionTablesFromTemplates: unknown record type ────');

{
  resetDb();
  quiet();
  const result = await provisionTablesFromTemplates(1, {
    chrismation: 'en_chrismation',  // unknown type
  });
  loud();
  assertEq(result.tables_created.length, 0, 'nothing created');
  assertEq(result.tables_failed.length, 0, 'no failures for unknown type (just warns)');
  assertEq(appQCalls.length, 0, 'no template fetch for unknown type');
}

// ============================================================================
// provisionTablesFromTemplates — empty slug skipped
// ============================================================================
console.log('\n── provisionTablesFromTemplates: empty slug ─────────────');

{
  resetDb();
  const result = await provisionTablesFromTemplates(1, {
    baptism: '',
    marriage: null,
  });
  assertEq(result.tables_created.length, 0, 'nothing created');
  assertEq(appQCalls.length, 0, 'no template fetch for empty slug');
}

// ============================================================================
// provisionTablesFromTemplates — execute failure per-table caught
// ============================================================================
console.log('\n── provisionTablesFromTemplates: execute failure ────────');

{
  resetDb();
  appRoutes = [{
    match: /FROM.+templates/i,
    rows: [{
      slug: 'stub',
      name: 'Stub',
      fields: [{ column: 'first_name', type: 'string' }],
    }],
  }];
  execThrowsOnSql = /CREATE TABLE IF NOT EXISTS `baptism_records`/;
  quiet();
  const result = await provisionTablesFromTemplates(1, { baptism: 'en_baptism_records' });
  loud();

  assertEq(result.tables_created.length, 0, 'no tables created on execute failure');
  assertEq(result.tables_failed.length, 1, '1 failure logged');
  assertEq(result.tables_failed[0].template_slug, 'en_baptism_records', 'slug in failure');
  assertEq(result.errors.length, 1, '1 error logged');
  assert(result.errors[0].includes('execute failed'), 'error message captured');
  assertEq(connReleaseCount, 1, 'connection released even on failure');
}

// ============================================================================
// provisionTablesFromTemplates — fields as object (already parsed)
// ============================================================================
console.log('\n── provisionTablesFromTemplates: fields as object ───────');

{
  resetDb();
  appRoutes = [{
    match: /FROM.+templates/i,
    rows: [{
      slug: 'stub',
      name: 'Stub',
      fields: [{ column: 'first_name', type: 'string' }], // already parsed
    }],
  }];
  quiet();
  const result = await provisionTablesFromTemplates(1, { baptism: 'en_baptism_records' });
  loud();
  assertEq(result.tables_created.length, 1, 'succeeds with pre-parsed fields');
  assertEq(result.tables_created[0].fields_count, 1, 'fields_count from object');
}

// ============================================================================
// provisionTablesFromTemplates — getConnection error → throws
// ============================================================================
console.log('\n── provisionTablesFromTemplates: conn error ─────────────');

{
  resetDb();
  getConnThrows = true;
  let thrown = false;
  quiet();
  try {
    await provisionTablesFromTemplates(1, { baptism: 'en_baptism_records' });
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('cannot get connection'), 'original error propagated');
  }
  loud();
  assert(thrown, 'throws on connection failure');
  assertEq(connReleaseCount, 0, 'no connection to release');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
