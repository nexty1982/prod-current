#!/usr/bin/env npx tsx
/**
 * Unit tests for services/templateTableProvisioner.js (OMD-1148)
 *
 * Converts template field definitions into CREATE TABLE statements and
 * provisions record tables in a church database. Dependencies:
 *   - `../config/db.getAppPool` (for reading templates)
 *   - `../utils/dbSwitcher.getChurchDbConnection` (lazy-required)
 *
 * Both are stubbed via require.cache BEFORE requiring SUT. The fake
 * app pool returns scripted templates; the fake church connection
 * records `execute` calls for CREATE TABLE verification.
 *
 * Coverage:
 *   - fieldTypeToSqlType:
 *       · explicit type strings (date/number/int/boolean/text)
 *       · column-name heuristics (_date, _id, notes, etc.)
 *       · unknown type → VARCHAR(255)
 *       · missing type falls back based on column name
 *   - generateCreateTableFromTemplate:
 *       · empty/missing fields → throws
 *       · always includes id PRIMARY KEY + church_id
 *       · church_id not duplicated if already in fields
 *       · skips columnless fields
 *       · required → NOT NULL
 *       · default value quoted + escaped
 *       · standard timestamp columns appended
 *       · indexes for known field names
 *       · table name backticked
 *   - provisionTablesFromTemplates:
 *       · empty selectedTemplates → no-op returns empty results
 *       · falsy slug → skipped
 *       · unknown recordType → skipped
 *       · template not found → tables_failed with reason
 *       · happy path → creates record + history tables
 *       · JSON fields string → parsed
 *       · connection released in finally (even on inner errors)
 *       · top-level error re-thrown
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

// ── db stub ──────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const appQueryLog: QueryCall[] = [];
let templateRows: any[] = []; // scripted templates response

const fakeAppPool = {
  query: async (sql: string, params: any[] = []) => {
    appQueryLog.push({ sql, params });
    if (/FROM .*templates/i.test(sql)) {
      return [templateRows];
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakeAppPool };

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: dbStub,
} as any;

// ── dbSwitcher stub ──────────────────────────────────────────────────
type ExecCall = { sql: string; params: any[] };
const execLog: ExecCall[] = [];
let releaseCount = 0;
let throwOnExecutePattern: RegExp | null = null;
let throwOnGetConnection = false;

const fakeConnection = {
  execute: async (sql: string, params: any[] = []) => {
    execLog.push({ sql, params });
    if (throwOnExecutePattern && throwOnExecutePattern.test(sql)) {
      throw new Error('fake execute failure');
    }
    return [{ affectedRows: 0 }];
  },
  release: () => { releaseCount++; },
};

const fakeChurchPool = {
  getConnection: async () => {
    if (throwOnGetConnection) throw new Error('fake getConnection failure');
    return fakeConnection;
  },
};

const dbSwitcherStub = {
  getChurchDbConnection: async (_dbName: string) => fakeChurchPool,
};

const dbSwitcherPath = require.resolve('../../utils/dbSwitcher');
require.cache[dbSwitcherPath] = {
  id: dbSwitcherPath,
  filename: dbSwitcherPath,
  loaded: true,
  exports: dbSwitcherStub,
} as any;

// Silence noisy logs
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

function resetState() {
  appQueryLog.length = 0;
  execLog.length = 0;
  releaseCount = 0;
  templateRows = [];
  throwOnExecutePattern = null;
  throwOnGetConnection = false;
}

const {
  fieldTypeToSqlType,
  generateCreateTableFromTemplate,
  provisionTablesFromTemplates,
} = require('../templateTableProvisioner');

async function main() {

// ============================================================================
// fieldTypeToSqlType — explicit types
// ============================================================================
console.log('\n── fieldTypeToSqlType: explicit types ────────────────────');

assertEq(fieldTypeToSqlType({ type: 'date', column: 'foo' }), 'DATE', 'type=date → DATE');
assertEq(fieldTypeToSqlType({ type: 'number', column: 'foo' }), 'INT', 'type=number → INT');
assertEq(fieldTypeToSqlType({ type: 'int', column: 'foo' }), 'INT', 'type=int → INT');
assertEq(fieldTypeToSqlType({ type: 'boolean', column: 'foo' }), 'BOOLEAN', 'type=boolean → BOOLEAN');
assertEq(fieldTypeToSqlType({ type: 'bool', column: 'foo' }), 'BOOLEAN', 'type=bool → BOOLEAN');
assertEq(fieldTypeToSqlType({ type: 'text', column: 'foo' }), 'TEXT', 'type=text → TEXT');
assertEq(fieldTypeToSqlType({ type: 'string', column: 'foo' }), 'VARCHAR(255)', 'type=string → VARCHAR(255)');
assertEq(fieldTypeToSqlType({ type: 'unknown', column: 'foo' }), 'VARCHAR(255)', 'unknown type → VARCHAR(255)');
assertEq(fieldTypeToSqlType({ column: 'foo' }), 'VARCHAR(255)', 'missing type → VARCHAR(255) default');

// ============================================================================
// fieldTypeToSqlType — column-name heuristics
// ============================================================================
console.log('\n── fieldTypeToSqlType: column-name heuristics ────────────');

assertEq(fieldTypeToSqlType({ column: 'baptism_date' }), 'DATE', '_date in name → DATE');
assertEq(fieldTypeToSqlType({ column: 'dateOfBirth' }), 'DATE', 'date in name → DATE');
assertEq(fieldTypeToSqlType({ column: 'church_id' }), 'INT', '_id in name → INT');
assertEq(fieldTypeToSqlType({ column: 'userid' }), 'INT', 'id substring → INT');
assertEq(fieldTypeToSqlType({ column: 'child_count' }), 'INT', 'count in name → INT');
assertEq(fieldTypeToSqlType({ column: 'phone_number' }), 'INT', 'number in name → INT');
assertEq(fieldTypeToSqlType({ column: 'notes' }), 'TEXT', 'notes in name → TEXT');
assertEq(fieldTypeToSqlType({ column: 'description' }), 'TEXT', 'description in name → TEXT');
assertEq(fieldTypeToSqlType({ column: 'first_name' }), 'VARCHAR(255)', 'plain name → VARCHAR(255)');

// field.field fallback when no column
assertEq(fieldTypeToSqlType({ field: 'birth_date' }), 'DATE', 'field used when no column');

// Uppercase type
assertEq(fieldTypeToSqlType({ type: 'DATE', column: 'x' }), 'DATE', 'uppercase type lowered');

// ============================================================================
// generateCreateTableFromTemplate — validation
// ============================================================================
console.log('\n── generateCreateTableFromTemplate: validation ───────────');

{
  let caught: Error | null = null;
  try { generateCreateTableFromTemplate('foo', [], 1); } catch (e: any) { caught = e; }
  assert(caught !== null, 'empty fields throws');
  assert(caught !== null && caught.message.includes('required'), 'error mentions required');
}

{
  let caught: Error | null = null;
  try { generateCreateTableFromTemplate('foo', null as any, 1); } catch (e: any) { caught = e; }
  assert(caught !== null, 'null fields throws');
}

{
  let caught: Error | null = null;
  try { generateCreateTableFromTemplate('foo', undefined as any, 1); } catch (e: any) { caught = e; }
  assert(caught !== null, 'undefined fields throws');
}

{
  let caught: Error | null = null;
  try { generateCreateTableFromTemplate('foo', 'nope' as any, 1); } catch (e: any) { caught = e; }
  assert(caught !== null, 'non-array fields throws');
}

// ============================================================================
// generateCreateTableFromTemplate — happy path
// ============================================================================
console.log('\n── generateCreateTableFromTemplate: happy path ───────────');

{
  const fields = [
    { column: 'first_name', type: 'string', required: true },
    { column: 'last_name', type: 'string', required: true },
    { column: 'baptism_date', type: 'date' },
    { column: 'notes', type: 'text' },
  ];
  const sql = generateCreateTableFromTemplate('baptism_records', fields, 46);

  assert(sql.includes('CREATE TABLE IF NOT EXISTS `baptism_records`'), 'table name backticked');
  assert(sql.includes('id INT PRIMARY KEY AUTO_INCREMENT'), 'id PRIMARY KEY');
  assert(sql.includes('church_id INT NOT NULL DEFAULT 46'), 'church_id with default');
  assert(sql.includes('`first_name` VARCHAR(255) NOT NULL'), 'first_name required');
  assert(sql.includes('`last_name` VARCHAR(255) NOT NULL'), 'last_name required');
  assert(sql.includes('`baptism_date` DATE'), 'baptism_date type');
  assert(sql.includes('`notes` TEXT'), 'notes type');
  assert(sql.includes('created_by INT'), 'created_by timestamp col');
  assert(sql.includes('created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'), 'created_at');
  assert(sql.includes('updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'), 'updated_at');
  assert(sql.includes('ENGINE=InnoDB'), 'InnoDB engine');
  assert(sql.includes('utf8mb4'), 'utf8mb4 charset');
}

// ============================================================================
// generateCreateTableFromTemplate — skips id + church_id when already present
// ============================================================================
console.log('\n── generateCreateTableFromTemplate: skip duplicates ──────');

{
  const fields = [
    { column: 'id', type: 'int' },
    { column: 'church_id', type: 'int' },
    { column: 'name', type: 'string' },
  ];
  const sql = generateCreateTableFromTemplate('baptism_records', fields, 46);

  // Once for PK, not duplicated
  const idMatches = sql.match(/`id`/g) || [];
  assertEq(idMatches.length, 0, 'no `id` column (skipped since matches reserved name)');

  // church_id should NOT be added a second time (has one from fields presence check OR default)
  // Since fields has church_id, the default line should NOT be added
  assert(!sql.includes('DEFAULT 46'), 'church_id default line skipped');
  assert(sql.includes('`name`'), 'name column added');
}

// Empty-columnless fields skipped
{
  const fields = [
    { type: 'string' }, // no column or field
    { column: '', type: 'string' }, // empty column
    { column: 'good', type: 'string' },
  ];
  const sql = generateCreateTableFromTemplate('foo', fields, 1);
  assert(sql.includes('`good`'), 'good column included');
  // Only "good" column should be present
  const colLine = sql.match(/`good` VARCHAR/);
  assert(colLine !== null, 'good column in output');
}

// ============================================================================
// generateCreateTableFromTemplate — default value with escaping
// ============================================================================
console.log('\n── generateCreateTableFromTemplate: defaults ─────────────');

{
  const fields = [
    { column: 'status', type: 'string', default: 'pending' },
    { column: 'note', type: 'string', default: "it's fine" },
    { column: 'count', type: 'number', default: 0 },
  ];
  const sql = generateCreateTableFromTemplate('foo', fields, 1);

  assert(sql.includes("`status` VARCHAR(255)  DEFAULT 'pending'"), 'string default');
  assert(sql.includes("`note` VARCHAR(255)  DEFAULT 'it''s fine'"), 'single-quote escaped');
  assert(sql.includes("`count` INT  DEFAULT '0'"), 'numeric default stringified');
}

// ============================================================================
// generateCreateTableFromTemplate — indexes
// ============================================================================
console.log('\n── generateCreateTableFromTemplate: indexes ──────────────');

{
  const fields = [
    { column: 'first_name', type: 'string' },
    { column: 'last_name', type: 'string' },
    { column: 'baptism_date', type: 'date' },
    { column: 'random_field', type: 'string' },
  ];
  const sql = generateCreateTableFromTemplate('baptism_records', fields, 46);

  assert(sql.includes('INDEX idx_baptism_records_first_name'), 'first_name index');
  assert(sql.includes('INDEX idx_baptism_records_last_name'), 'last_name index');
  assert(sql.includes('INDEX idx_baptism_records_baptism_date'), 'baptism_date index');
  assert(!sql.includes('idx_baptism_records_random_field'), 'non-indexed field skipped');
}

// No fields qualifying for index → no index clause
{
  const fields = [{ column: 'random', type: 'string' }];
  const sql = generateCreateTableFromTemplate('foo', fields, 1);
  assert(!sql.includes('INDEX idx_'), 'no indexes when none match');
}

// ============================================================================
// provisionTablesFromTemplates — empty
// ============================================================================
console.log('\n── provisionTablesFromTemplates: empty ───────────────────');

resetState();
{
  const r1 = await provisionTablesFromTemplates(46, {});
  assertEq(r1, { tables_created: [], tables_failed: [], errors: [] }, 'empty obj → empty results');

  const r2 = await provisionTablesFromTemplates(46, null);
  assertEq(r2, { tables_created: [], tables_failed: [], errors: [] }, 'null → empty results');
  assertEq(execLog.length, 0, 'no executes');
}

// ============================================================================
// provisionTablesFromTemplates — happy path
// ============================================================================
console.log('\n── provisionTablesFromTemplates: happy path ──────────────');

resetState();
templateRows = [{
  slug: 'en_baptism_records',
  name: 'English Baptism',
  record_type: 'baptism',
  fields: JSON.stringify([
    { column: 'first_name', type: 'string', required: true },
    { column: 'last_name', type: 'string', required: true },
  ]),
}];
quiet();
{
  const r = await provisionTablesFromTemplates(46, { baptism: 'en_baptism_records' });
  loud();
  assertEq(r.tables_created.length, 1, '1 table created');
  assertEq(r.tables_created[0].table, 'baptism_records', 'record table name');
  assertEq(r.tables_created[0].template_slug, 'en_baptism_records', 'slug');
  assertEq(r.tables_created[0].template_name, 'English Baptism', 'template name');
  assertEq(r.tables_created[0].fields_count, 2, 'fields count');
  assertEq(r.tables_failed.length, 0, 'none failed');

  // Verify executes: CREATE record table + CREATE history table
  assertEq(execLog.length, 2, '2 CREATE TABLE statements');
  assert(/CREATE TABLE.*baptism_records/i.test(execLog[0].sql), 'record table created');
  assert(/CREATE TABLE.*baptism_history/i.test(execLog[1].sql), 'history table created');
  assert(/before_json LONGTEXT/i.test(execLog[1].sql), 'history has before_json');
  assert(/after_json LONGTEXT/i.test(execLog[1].sql), 'history has after_json');
  assert(/ENUM\('INSERT', 'UPDATE', 'DELETE'\)/i.test(execLog[1].sql), 'history action ENUM');
  assertEq(releaseCount, 1, 'connection released');
}

// Fields already an object (not string)
resetState();
templateRows = [{
  slug: 'en_marriage_records',
  name: 'English Marriage',
  record_type: 'marriage',
  fields: [{ column: 'groom_name', type: 'string' }],
}];
quiet();
{
  const r = await provisionTablesFromTemplates(46, { marriage: 'en_marriage_records' });
  loud();
  assertEq(r.tables_created.length, 1, 'object fields parsed');
  assertEq(r.tables_created[0].table, 'marriage_records', 'marriage_records');
}

// ============================================================================
// provisionTablesFromTemplates — falsy slug skipped
// ============================================================================
console.log('\n── provisionTablesFromTemplates: falsy slug ──────────────');

resetState();
quiet();
{
  const r = await provisionTablesFromTemplates(46, { baptism: null, marriage: '', funeral: undefined });
  loud();
  assertEq(r.tables_created.length, 0, 'all falsy → none created');
  assertEq(r.tables_failed.length, 0, 'none failed');
  assertEq(execLog.length, 0, 'no executes');
}

// ============================================================================
// provisionTablesFromTemplates — unknown record type
// ============================================================================
console.log('\n── provisionTablesFromTemplates: unknown type ────────────');

resetState();
quiet();
{
  const r = await provisionTablesFromTemplates(46, { bogus: 'some_slug' });
  loud();
  assertEq(r.tables_created.length, 0, 'unknown type → skipped');
  assertEq(execLog.length, 0, 'no executes');
}

// ============================================================================
// provisionTablesFromTemplates — template not found
// ============================================================================
console.log('\n── provisionTablesFromTemplates: template not found ──────');

resetState();
templateRows = []; // template lookup returns empty
quiet();
{
  const r = await provisionTablesFromTemplates(46, { baptism: 'missing' });
  loud();
  assertEq(r.tables_created.length, 0, 'none created');
  assertEq(r.tables_failed.length, 1, '1 failed');
  assertEq(r.tables_failed[0].table, 'baptism_records', 'table name');
  assert(r.tables_failed[0].reason.includes('missing'), 'reason mentions slug');
  assertEq(releaseCount, 1, 'still released');
}

// ============================================================================
// provisionTablesFromTemplates — execute error captured
// ============================================================================
console.log('\n── provisionTablesFromTemplates: execute error ───────────');

resetState();
templateRows = [{
  slug: 's1', name: 'N', record_type: 'baptism',
  fields: [{ column: 'a', type: 'string' }],
}];
throwOnExecutePattern = /CREATE TABLE.*baptism_records/i;
quiet();
{
  const r = await provisionTablesFromTemplates(46, { baptism: 's1' });
  loud();
  assertEq(r.tables_created.length, 0, 'not created');
  assertEq(r.tables_failed.length, 1, '1 failed');
  assertEq(r.tables_failed[0].table, 'baptism_records', 'table name');
  assert(r.errors.length > 0, 'error captured');
  assertEq(releaseCount, 1, 'released on error');
}

// ============================================================================
// provisionTablesFromTemplates — top-level error re-thrown
// ============================================================================
console.log('\n── provisionTablesFromTemplates: top-level error ─────────');

resetState();
throwOnGetConnection = true;
quiet();
{
  let caught: Error | null = null;
  try {
    await provisionTablesFromTemplates(46, { baptism: 's' });
  } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'top-level error re-thrown');
  assert(caught !== null && caught.message.includes('getConnection'), 'original message');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
