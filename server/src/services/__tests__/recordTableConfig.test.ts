#!/usr/bin/env npx tsx
/**
 * Unit tests for services/recordTableConfig.js (OMD-965)
 *
 * Mix of pure helpers + DB-backed functions. Stubs `../config/db-compat`
 * via require.cache to inject a fake pool that routes queries by SQL regex.
 *
 * Coverage:
 *   - validateTableName: truthy/falsy/type/pattern
 *   - inferDefaultsFromColumns:
 *       · empty/null → empty defaults
 *       · system-field exclusion (created_at, updated_at, deleted_at, password, token)
 *       · 'id' NOT excluded
 *       · JSON/blob/text type exclusion
 *       · displayNameMap snake_case → Title Case
 *       · sort-field priority: reception_date first, else other date fields,
 *         else id, else first visible field (with asc)
 *   - getChurchSchemaName: found / not-found / null database_name fallback
 *   - listChurchTables: record-table filter; raw fallback when no record tables
 *   - getTableColumns: schema missing → null; no columns → null; mapping
 *   - getRecordTableConfig: null schema → null; tables-only branch;
 *     invalid name → throw; unknown table → null; happy path
 *   - getRecordTableBundle: adds endpoint URLs; null passthrough
 *
 * Run: npx tsx server/src/services/__tests__/recordTableConfig.test.ts
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

// ── Fake pool ──────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

// Scriptable responses keyed by SQL pattern
let nextChurchRow: any = null;     // for SELECT database_name FROM churches
let nextShowTables: any[] = [];    // for SHOW TABLES
let nextTableCheck: any[] = [];    // for SELECT table_name FROM information_schema
let nextShowColumns: any[] = [];   // for SHOW COLUMNS
let shouldFailNextQuery = false;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (shouldFailNextQuery) {
      shouldFailNextQuery = false;
      throw new Error('fake db failure');
    }
    if (/FROM churches/i.test(sql)) {
      return [nextChurchRow ? [nextChurchRow] : [], []];
    }
    if (/^SHOW TABLES/i.test(sql)) {
      return [nextShowTables, []];
    }
    if (/information_schema\.tables/i.test(sql)) {
      return [nextTableCheck, []];
    }
    if (/^SHOW COLUMNS/i.test(sql)) {
      return [nextShowColumns, []];
    }
    return [[], []];
  },
};

const dbCompatStub = {
  getAppPool: () => fakePool,
};

const dbPath = require.resolve('../../config/db-compat');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: dbCompatStub,
} as any;

const {
  getChurchSchemaName,
  listChurchTables,
  getTableColumns,
  inferDefaultsFromColumns,
  validateTableName,
  getRecordTableConfig,
  getRecordTableBundle,
} = require('../recordTableConfig');

function resetLog() { queryLog.length = 0; }

async function main() {

// ============================================================================
// validateTableName
// ============================================================================
console.log('\n── validateTableName ─────────────────────────────────────');

assertEq(validateTableName('baptism_records'), true, 'snake_case valid');
assertEq(validateTableName('users'), true, 'plain name valid');
assertEq(validateTableName('Table_123'), true, 'mixed case + digits valid');
assertEq(validateTableName(''), false, 'empty string invalid');
assertEq(validateTableName(null), false, 'null invalid');
assertEq(validateTableName(undefined), false, 'undefined invalid');
assertEq(validateTableName(123 as any), false, 'number invalid');
assertEq(validateTableName('table name'), false, 'space invalid');
assertEq(validateTableName('table-name'), false, 'dash invalid');
assertEq(validateTableName('users; DROP TABLE x'), false, 'SQL injection invalid');
assertEq(validateTableName('users.other'), false, 'dot invalid');

// ============================================================================
// inferDefaultsFromColumns — empty / null
// ============================================================================
console.log('\n── inferDefaultsFromColumns: empty ───────────────────────');

{
  const d = inferDefaultsFromColumns([]);
  assertEq(d.visibleFields, [], 'empty: visibleFields');
  assertEq(d.displayNameMap, {}, 'empty: displayNameMap');
  assertEq(d.defaultSortField, null, 'empty: sortField null');
  assertEq(d.defaultSortDirection, 'asc', 'empty: asc');
}

{
  const d = inferDefaultsFromColumns(null as any);
  assertEq(d.visibleFields, [], 'null: visibleFields');
  assertEq(d.defaultSortField, null, 'null: sortField null');
}

// ============================================================================
// inferDefaultsFromColumns — system field exclusion
// ============================================================================
console.log('\n── inferDefaultsFromColumns: system fields ───────────────');

{
  const cols = [
    { name: 'id', type: 'int' },
    { name: 'first_name', type: 'varchar(100)' },
    { name: 'created_at', type: 'datetime' },
    { name: 'updated_at', type: 'datetime' },
    { name: 'deleted_at', type: 'datetime' },
    { name: 'password', type: 'varchar(255)' },
    { name: 'token', type: 'varchar(255)' },
  ];
  const d = inferDefaultsFromColumns(cols);
  assert(d.visibleFields.includes('id'), 'id NOT excluded');
  assert(d.visibleFields.includes('first_name'), 'first_name visible');
  assert(!d.visibleFields.includes('created_at'), 'created_at excluded');
  assert(!d.visibleFields.includes('updated_at'), 'updated_at excluded');
  assert(!d.visibleFields.includes('deleted_at'), 'deleted_at excluded');
  assert(!d.visibleFields.includes('password'), 'password excluded');
  assert(!d.visibleFields.includes('token'), 'token excluded');
}

// ============================================================================
// inferDefaultsFromColumns — JSON/blob/text exclusion
// ============================================================================
console.log('\n── inferDefaultsFromColumns: json/blob/text ──────────────');

{
  const cols = [
    { name: 'id', type: 'int' },
    { name: 'metadata', type: 'json' },
    { name: 'bio', type: 'text' },
    { name: 'data_blob', type: 'blob' },
    { name: 'longtext_field', type: 'longtext' },
    { name: 'json_data', type: 'JSON' }, // case
    { name: 'name', type: 'varchar(100)' },
  ];
  const d = inferDefaultsFromColumns(cols);
  assert(d.visibleFields.includes('id'), 'id kept');
  assert(d.visibleFields.includes('name'), 'name kept');
  assert(!d.visibleFields.includes('metadata'), 'json excluded');
  assert(!d.visibleFields.includes('bio'), 'text excluded');
  assert(!d.visibleFields.includes('data_blob'), 'blob excluded');
  assert(!d.visibleFields.includes('longtext_field'), 'longtext excluded');
  assert(!d.visibleFields.includes('json_data'), 'JSON case-insensitive');
}

// ============================================================================
// inferDefaultsFromColumns — displayNameMap
// ============================================================================
console.log('\n── inferDefaultsFromColumns: displayNameMap ──────────────');

{
  const cols = [
    { name: 'first_name', type: 'varchar' },
    { name: 'last_name', type: 'varchar' },
    { name: 'id', type: 'int' },
    { name: 'date_of_birth', type: 'date' },
    { name: 'EMAIL_ADDRESS', type: 'varchar' },
  ];
  const d = inferDefaultsFromColumns(cols);
  assertEq(d.displayNameMap.first_name, 'First Name', 'first_name → First Name');
  assertEq(d.displayNameMap.last_name, 'Last Name', 'last_name → Last Name');
  assertEq(d.displayNameMap.id, 'Id', 'id → Id');
  assertEq(d.displayNameMap.date_of_birth, 'Date Of Birth', 'three-word title case');
  assertEq(d.displayNameMap.EMAIL_ADDRESS, 'Email Address', 'uppercase → Title Case');
}

// ============================================================================
// inferDefaultsFromColumns — sort field priority
// ============================================================================
console.log('\n── inferDefaultsFromColumns: sort priority ───────────────');

// reception_date wins
{
  const cols = [
    { name: 'id', type: 'int' },
    { name: 'reception_date', type: 'date' },
    { name: 'date_of_baptism', type: 'date' },
  ];
  const d = inferDefaultsFromColumns(cols);
  assertEq(d.defaultSortField, 'reception_date', 'reception_date wins');
  assertEq(d.defaultSortDirection, 'desc', 'desc when date present');
}

// date_of_baptism when no reception
{
  const cols = [
    { name: 'id', type: 'int' },
    { name: 'date_of_baptism', type: 'date' },
  ];
  const d = inferDefaultsFromColumns(cols);
  assertEq(d.defaultSortField, 'date_of_baptism', 'date_of_baptism fallback');
  assertEq(d.defaultSortDirection, 'desc', 'desc');
}

// marriage_date
{
  const cols = [
    { name: 'id', type: 'int' },
    { name: 'marriage_date', type: 'date' },
  ];
  const d = inferDefaultsFromColumns(cols);
  assertEq(d.defaultSortField, 'marriage_date', 'marriage_date');
}

// burial_date
{
  const cols = [
    { name: 'id', type: 'int' },
    { name: 'burial_date', type: 'date' },
  ];
  const d = inferDefaultsFromColumns(cols);
  assertEq(d.defaultSortField, 'burial_date', 'burial_date');
}

// death_date
{
  const cols = [
    { name: 'id', type: 'int' },
    { name: 'death_date', type: 'date' },
  ];
  const d = inferDefaultsFromColumns(cols);
  assertEq(d.defaultSortField, 'death_date', 'death_date');
}

// id when no date field
{
  const cols = [
    { name: 'id', type: 'int' },
    { name: 'name', type: 'varchar' },
  ];
  const d = inferDefaultsFromColumns(cols);
  assertEq(d.defaultSortField, 'id', 'id when no date');
  assertEq(d.defaultSortDirection, 'desc', 'desc');
}

// first visible when no date/id
{
  const cols = [
    { name: 'name', type: 'varchar' },
    { name: 'city', type: 'varchar' },
  ];
  const d = inferDefaultsFromColumns(cols);
  assertEq(d.defaultSortField, 'name', 'first visible fallback');
  assertEq(d.defaultSortDirection, 'asc', 'asc when fallback');
}

// ============================================================================
// getChurchSchemaName
// ============================================================================
console.log('\n── getChurchSchemaName ───────────────────────────────────');

resetLog();
nextChurchRow = { database_name: 'om_church_46' };
{
  const name = await getChurchSchemaName(46);
  assertEq(name, 'om_church_46', 'returns database_name');
  assertEq(queryLog.length, 1, 'one query');
  assert(queryLog[0].sql.includes('FROM churches'), 'queries churches table');
  assertEq(queryLog[0].params, [46], 'params');
}

// Not found → null
resetLog();
nextChurchRow = null;
{
  const name = await getChurchSchemaName(999);
  assertEq(name, null, 'not found → null');
}

// database_name null → fallback to om_church_${id}
resetLog();
nextChurchRow = { database_name: null };
{
  const name = await getChurchSchemaName(42);
  assertEq(name, 'om_church_42', 'null database_name → fallback');
}

// ============================================================================
// listChurchTables
// ============================================================================
console.log('\n── listChurchTables ──────────────────────────────────────');

// Has record tables → filtered
resetLog();
nextChurchRow = { database_name: 'om_church_46' };
nextShowTables = [
  { Tables_in_om_church_46: 'baptism_records' },
  { Tables_in_om_church_46: 'marriage_records' },
  { Tables_in_om_church_46: 'funeral_records' },
  { Tables_in_om_church_46: 'users' },
  { Tables_in_om_church_46: 'sessions' },
];
{
  const tables = await listChurchTables(46);
  assertEq(
    tables,
    ['baptism_records', 'marriage_records', 'funeral_records'],
    'filtered to record tables'
  );
}

// With cemetery_records too
resetLog();
nextShowTables = [
  { t: 'baptism_records' },
  { t: 'cemetery_records' },
  { t: 'other' },
];
{
  const tables = await listChurchTables(46);
  assertEq(tables, ['baptism_records', 'cemetery_records'], 'cemetery included');
}

// No record tables → raw tables returned
resetLog();
nextShowTables = [
  { t: 'users' },
  { t: 'sessions' },
];
{
  const tables = await listChurchTables(46);
  assertEq(tables, ['users', 'sessions'], 'raw fallback when no record tables');
}

// Schema not found → []
resetLog();
nextChurchRow = null;
{
  const tables = await listChurchTables(999);
  assertEq(tables, [], 'no schema → empty');
}

// ============================================================================
// getTableColumns
// ============================================================================
console.log('\n── getTableColumns ───────────────────────────────────────');

// Schema missing → null
resetLog();
nextChurchRow = null;
{
  const cols = await getTableColumns(999, 'baptism_records');
  assertEq(cols, null, 'no schema → null');
}

// Table not in information_schema → null
resetLog();
nextChurchRow = { database_name: 'om_church_46' };
nextTableCheck = [];
{
  const cols = await getTableColumns(46, 'nonexistent');
  assertEq(cols, null, 'table not in information_schema → null');
}

// Happy path: table exists with columns
resetLog();
nextChurchRow = { database_name: 'om_church_46' };
nextTableCheck = [{ table_name: 'baptism_records' }];
nextShowColumns = [
  { Field: 'id', Type: 'int', Null: 'NO', Default: null, Key: 'PRI', Extra: 'auto_increment' },
  { Field: 'first_name', Type: 'varchar(100)', Null: 'YES', Default: null, Key: '', Extra: '' },
  { Field: 'reception_date', Type: 'date', Null: 'YES', Default: null, Key: '', Extra: '' },
];
{
  const cols = await getTableColumns(46, 'baptism_records');
  assert(cols !== null, 'cols returned');
  assertEq(cols.length, 3, '3 columns');
  assertEq(cols[0].name, 'id', 'col[0].name');
  assertEq(cols[0].position, 1, 'col[0].position 1-indexed');
  assertEq(cols[0].nullable, false, 'id NOT null');
  assertEq(cols[0].key, 'PRI', 'PRI key');
  assertEq(cols[1].nullable, true, 'first_name YES null');
  assertEq(cols[2].position, 3, 'col[2].position');
}

// Columns query returns empty → null
resetLog();
nextShowColumns = [];
nextTableCheck = [{ table_name: 'empty_table' }];
{
  const cols = await getTableColumns(46, 'empty_table');
  assertEq(cols, null, 'empty columns → null');
}

// ============================================================================
// getRecordTableConfig
// ============================================================================
console.log('\n── getRecordTableConfig ──────────────────────────────────');

// Church not found → null
resetLog();
nextChurchRow = null;
{
  const cfg = await getRecordTableConfig(999);
  assertEq(cfg, null, 'no church → null');
}

// No tableName → tables-only branch
resetLog();
nextChurchRow = { database_name: 'om_church_46' };
nextShowTables = [
  { t: 'baptism_records' },
  { t: 'marriage_records' },
];
{
  const cfg = await getRecordTableConfig(46);
  assert(cfg !== null, 'cfg returned');
  assertEq(cfg.churchId, 46, 'churchId');
  assertEq(cfg.schemaName, 'om_church_46', 'schemaName');
  assertEq(cfg.table, null, 'table null');
  assertEq(cfg.tables, ['baptism_records', 'marriage_records'], 'tables array');
  assertEq(cfg.columns, [], 'columns empty');
  assertEq(cfg.schema.columns, [], 'schema.columns empty');
  assertEq(cfg.defaults.visibleFields, [], 'defaults empty');
}

// Invalid table name → throws
resetLog();
nextChurchRow = { database_name: 'om_church_46' };
nextShowTables = [{ t: 'baptism_records' }];
{
  let caught: Error | null = null;
  try {
    await getRecordTableConfig(46, 'bad; name');
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'invalid name throws');
  assert(caught !== null && caught.message.includes('Invalid table name'), 'error msg');
}

// Unknown table → null
resetLog();
nextChurchRow = { database_name: 'om_church_46' };
nextShowTables = [{ t: 'baptism_records' }];
{
  const cfg = await getRecordTableConfig(46, 'not_in_list');
  assertEq(cfg, null, 'unknown table → null');
}

// Happy path with tableName
resetLog();
nextChurchRow = { database_name: 'om_church_46' };
nextShowTables = [{ t: 'baptism_records' }];
nextTableCheck = [{ table_name: 'baptism_records' }];
nextShowColumns = [
  { Field: 'id', Type: 'int', Null: 'NO', Default: null, Key: 'PRI', Extra: '' },
  { Field: 'first_name', Type: 'varchar(100)', Null: 'YES', Default: null, Key: '', Extra: '' },
  { Field: 'reception_date', Type: 'date', Null: 'YES', Default: null, Key: '', Extra: '' },
];
{
  const cfg = await getRecordTableConfig(46, 'baptism_records');
  assert(cfg !== null, 'cfg returned');
  assertEq(cfg.table, 'baptism_records', 'table set');
  assertEq(cfg.columns.length, 3, '3 columns');
  assertEq(cfg.schema.columns.length, 3, 'schema.columns matches');
  assertEq(cfg.defaults.defaultSortField, 'reception_date', 'reception_date default sort');
  assertEq(cfg.defaults.defaultSortDirection, 'desc', 'desc');
  assert(cfg.defaults.visibleFields.includes('id'), 'id visible');
  assertEq(cfg.defaults.displayNameMap.first_name, 'First Name', 'display name');
}

// Table exists but has no columns → null
resetLog();
nextChurchRow = { database_name: 'om_church_46' };
nextShowTables = [{ t: 'baptism_records' }];
nextTableCheck = [{ table_name: 'baptism_records' }];
nextShowColumns = [];
{
  const cfg = await getRecordTableConfig(46, 'baptism_records');
  assertEq(cfg, null, 'no columns → null');
}

// ============================================================================
// getRecordTableBundle
// ============================================================================
console.log('\n── getRecordTableBundle ──────────────────────────────────');

// Happy path: adds endpoints
resetLog();
nextChurchRow = { database_name: 'om_church_46' };
nextShowTables = [{ t: 'baptism_records' }];
nextTableCheck = [{ table_name: 'baptism_records' }];
nextShowColumns = [
  { Field: 'id', Type: 'int', Null: 'NO', Default: null, Key: 'PRI', Extra: '' },
];
{
  const bundle = await getRecordTableBundle(46, 'baptism_records');
  assert(bundle !== null, 'bundle returned');
  assertEq(bundle.table, 'baptism_records', 'table preserved');
  assert(bundle.endpoints !== undefined, 'endpoints added');
  assertEq(
    bundle.endpoints.columns,
    '/api/admin/churches/46/tables/baptism_records/columns',
    'columns URL'
  );
  assertEq(
    bundle.endpoints.columnsLegacy,
    '/api/admin/church/46/tables/baptism_records/columns',
    'columnsLegacy URL'
  );
  assertEq(
    bundle.endpoints.table,
    '/api/admin/churches/46/tables/baptism_records',
    'table URL'
  );
}

// Null passthrough
resetLog();
nextChurchRow = null;
{
  const bundle = await getRecordTableBundle(999, 'baptism_records');
  assertEq(bundle, null, 'null config → null bundle');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
