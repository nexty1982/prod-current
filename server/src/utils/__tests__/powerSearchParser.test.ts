#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/powerSearchParser.js (OMD-889)
 *
 * Covers:
 *   - tokenize          (quoted phrases, field:value, operators)
 *   - resolveField      (alias resolution + whitelist)
 *   - parseDateValue    (YYYY / YYYY-MM / YYYY-MM-DD with all operators)
 *   - buildWhereClause  (SQL + params + warnings)
 *   - parseSearchQuery  (top-level entry, summary)
 *   - Constants         (FIELD_ALIASES, VALID_COLUMNS, DATE_FIELDS, GLOBAL_SEARCH_FIELDS)
 *
 * Run: npx tsx server/src/utils/__tests__/powerSearchParser.test.ts
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const parser: any = require('../powerSearchParser');

const {
  parseSearchQuery,
  tokenize,
  resolveField,
  parseDateValue,
  buildWhereClause,
  FIELD_ALIASES,
  VALID_COLUMNS,
  DATE_FIELDS,
  GLOBAL_SEARCH_FIELDS,
} = parser;

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

// ============================================================================
// Constants
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');

assert(typeof FIELD_ALIASES === 'object', 'FIELD_ALIASES is object');
assert(VALID_COLUMNS instanceof Set, 'VALID_COLUMNS is a Set');
assert(DATE_FIELDS instanceof Set, 'DATE_FIELDS is a Set');
assert(Array.isArray(GLOBAL_SEARCH_FIELDS), 'GLOBAL_SEARCH_FIELDS is array');

assertEq(FIELD_ALIASES.first, 'person_first', 'alias: first → person_first');
assertEq(FIELD_ALIASES.fname, 'person_first', 'alias: fname → person_first');
assertEq(FIELD_ALIASES.lname, 'person_last', 'alias: lname → person_last');
assertEq(FIELD_ALIASES.dob, 'birth_date', 'alias: dob → birth_date');
assertEq(FIELD_ALIASES.priest, 'officiant_name', 'alias: priest → officiant_name');
assertEq(FIELD_ALIASES.sponsors, 'godparents', 'alias: sponsors → godparents');

assert(VALID_COLUMNS.has('person_first'), 'VALID_COLUMNS includes person_first');
assert(VALID_COLUMNS.has('birth_date'), 'VALID_COLUMNS includes birth_date');
assert(!VALID_COLUMNS.has('not_a_real_column'), 'VALID_COLUMNS rejects garbage');

assert(DATE_FIELDS.has('birth_date'), 'DATE_FIELDS: birth_date');
assert(DATE_FIELDS.has('baptism_date'), 'DATE_FIELDS: baptism_date');
assert(DATE_FIELDS.has('reception_date'), 'DATE_FIELDS: reception_date');
assert(!DATE_FIELDS.has('person_first'), 'DATE_FIELDS does NOT include person_first');

// ============================================================================
// resolveField
// ============================================================================
console.log('\n── resolveField ──────────────────────────────────────────');

// Aliases resolve to canonical
assertEq(resolveField('first'), 'person_first', 'first → person_first');
assertEq(resolveField('FName'), 'person_first', 'FName (case insensitive) → person_first');
assertEq(resolveField('first_name'), 'person_first', 'first_name (underscore stripped) → person_first');
assertEq(resolveField('first-name'), 'person_first', 'first-name (hyphen stripped) → person_first');
assertEq(resolveField('lastname'), 'person_last', 'lastname → person_last');
assertEq(resolveField('dob'), 'birth_date', 'dob → birth_date');
assertEq(resolveField('birthdate'), 'birth_date', 'birthdate → birth_date');
assertEq(resolveField('priest'), 'officiant_name', 'priest → officiant_name');

// Direct canonical names
assertEq(resolveField('person_first'), 'person_first', 'canonical passthrough');
assertEq(resolveField('birth_date'), 'birth_date', 'canonical date passthrough');

// Unknown field → null
assertEq(resolveField('not_a_field'), null, 'unknown → null');
assertEq(resolveField('martian'), null, 'gibberish → null');
assertEq(resolveField(''), null, 'empty → null');

// ============================================================================
// parseDateValue
// ============================================================================
console.log('\n── parseDateValue ────────────────────────────────────────');

// YYYY format - exact (no operator) → BETWEEN year-01-01 AND year-12-31
const yexact = parseDateValue('2025', '~');
assertEq(yexact?.sql, 'BETWEEN ? AND ?', 'YYYY no-operator: BETWEEN');
assertEq(yexact?.params, ['2025-01-01', '2025-12-31'], 'YYYY: full year range');

// YYYY > → >= last day of year
const ygt = parseDateValue('2025', '>');
assertEq(ygt?.sql, '>= ?', 'YYYY >: >= last day');
assertEq(ygt?.params, ['2025-12-31'], 'YYYY > params');

// YYYY >= → also >= last day of year (same as >)
const ygte = parseDateValue('2025', '>=');
assertEq(ygte?.params, ['2025-12-31'], 'YYYY >= params');

// YYYY < → < jan 1
const ylt = parseDateValue('2025', '<');
assertEq(ylt?.sql, '< ?', 'YYYY <: < jan 1');
assertEq(ylt?.params, ['2025-01-01'], 'YYYY < params');

const ylte = parseDateValue('2025', '<=');
assertEq(ylte?.params, ['2025-01-01'], 'YYYY <= params');

// YYYY-MM exact - month range
const ymExact = parseDateValue('2025-08', '~');
assertEq(ymExact?.sql, 'BETWEEN ? AND ?', 'YYYY-MM exact: BETWEEN');
assertEq(ymExact?.params, ['2025-08-01', '2025-08-31'], 'YYYY-MM Aug range');

// YYYY-MM February (28 days in 2025)
const ymFeb = parseDateValue('2025-02', '~');
assertEq(ymFeb?.params, ['2025-02-01', '2025-02-28'], 'YYYY-MM Feb 28 days');

// YYYY-MM Feb leap year (2024)
const ymFebLeap = parseDateValue('2024-02', '~');
assertEq(ymFebLeap?.params, ['2024-02-01', '2024-02-29'], 'YYYY-MM Feb leap year 29 days');

// YYYY-MM > → >= last day of month
const ymGt = parseDateValue('2025-08', '>');
assertEq(ymGt?.params, ['2025-08-31'], 'YYYY-MM > params');

// YYYY-MM < → < first day
const ymLt = parseDateValue('2025-08', '<');
assertEq(ymLt?.params, ['2025-08-01'], 'YYYY-MM < params');

// YYYY-MM-DD exact
const ymd = parseDateValue('2025-08-15', '=');
assertEq(ymd?.sql, '= ?', 'YYYY-MM-DD = sql');
assertEq(ymd?.params, ['2025-08-15'], 'YYYY-MM-DD exact');

const ymdGt = parseDateValue('2025-08-15', '>');
assertEq(ymdGt?.sql, '> ?', 'YYYY-MM-DD > sql');

const ymdLte = parseDateValue('2025-08-15', '<=');
assertEq(ymdLte?.sql, '<= ?', 'YYYY-MM-DD <= sql');

// Invalid formats
assertEq(parseDateValue('not-a-date', '='), null, 'invalid → null');
assertEq(parseDateValue('25', '='), null, '2-digit year → null');
assertEq(parseDateValue('2025-8-15', '='), null, 'unzero-padded → null');
assertEq(parseDateValue('', '='), null, 'empty → null');

// ============================================================================
// tokenize
// ============================================================================
console.log('\n── tokenize ──────────────────────────────────────────────');

// Empty / falsy
assertEq(tokenize(''), [], 'empty string → []');
assertEq(tokenize(null), [], 'null → []');
assertEq(tokenize(undefined), [], 'undefined → []');
assertEq(tokenize(123), [], 'non-string → []');

// Single global term
const t1 = tokenize('john');
assertEq(t1.length, 1, 'single term: 1 token');
assertEq(t1[0].type, 'global', 'global type');
assertEq(t1[0].value, 'john', 'global value');

// Multiple global terms
const t2 = tokenize('john smith');
assertEq(t2.length, 2, '2 terms → 2 tokens');
assertEq(t2[0].value, 'john', 'first term');
assertEq(t2[1].value, 'smith', 'second term');

// Quoted phrase (standalone)
const t3 = tokenize('"Rev. David"');
assertEq(t3.length, 1, 'quoted phrase: 1 token');
assertEq(t3[0].type, 'global', 'quoted is global');
assertEq(t3[0].value, 'Rev. David', 'quoted value preserved with space');

// Field:value
const t4 = tokenize('first:john');
assertEq(t4.length, 1, '1 field token');
assertEq(t4[0].type, 'field', 'field type');
assertEq(t4[0].field, 'first', 'field name');
assertEq(t4[0].operator, '~', 'default operator: ~');
assertEq(t4[0].value, 'john', 'field value');

// Field with explicit operator
const t5 = tokenize('first:=john');
assertEq(t5[0].operator, '=', 'explicit = operator');
assertEq(t5[0].value, 'john', 'value after =');

// Date field with > operator
const t6 = tokenize('birth:>2020');
assertEq(t6[0].field, 'birth', 'date field');
assertEq(t6[0].operator, '>', '> operator');
assertEq(t6[0].value, '2020', 'year value');

// Date field with >= operator
const t7 = tokenize('birth:>=2020');
assertEq(t7[0].operator, '>=', '>= operator');
assertEq(t7[0].value, '2020', 'value after >=');

// Date field with <= operator
const t8 = tokenize('birth:<=2020');
assertEq(t8[0].operator, '<=', '<= operator');

// Range operator (..)
const t9 = tokenize('birth:2020..2025');
assertEq(t9[0].operator, '..', 'range operator');
assertEq(t9[0].value, { start: '2020', end: '2025' }, 'range value object');

// Field with quoted value
const t10 = tokenize('clergy:"Rev. David"');
assertEq(t10[0].field, 'clergy', 'quoted field');
assertEq(t10[0].operator, '~', 'default operator on quoted');
assertEq(t10[0].value, 'Rev. David', 'quoted field value with space');

// Mixed query
const t11 = tokenize('john first:david birth:>2020');
assertEq(t11.length, 3, 'mixed: 3 tokens');
assertEq(t11[0].type, 'global', 'mixed[0]: global');
assertEq(t11[0].value, 'john', 'mixed[0]: john');
assertEq(t11[1].type, 'field', 'mixed[1]: field');
assertEq(t11[1].field, 'first', 'mixed[1]: first');
assertEq(t11[2].type, 'field', 'mixed[2]: field');
assertEq(t11[2].operator, '>', 'mixed[2]: >');

// Standalone operator pattern (no colon, e.g. "birth>2020")
const t12 = tokenize('birth>2020');
assertEq(t12[0].type, 'field', 'standalone operator: field type');
assertEq(t12[0].field, 'birth', 'standalone field');
assertEq(t12[0].operator, '>', 'standalone operator: >');
assertEq(t12[0].value, '2020', 'standalone value');

// Multiple field tokens
const t13 = tokenize('first:john last:smith');
assertEq(t13.length, 2, '2 field tokens');
assertEq(t13[0].field, 'first', 'first field');
assertEq(t13[1].field, 'last', 'last field');

// Whitespace tolerance
const t14 = tokenize('  john   smith  ');
assertEq(t14.length, 2, 'whitespace tolerated');

// Field with ~ operator
const t15 = tokenize('first:~smith');
assertEq(t15[0].operator, '~', '~ operator');
assertEq(t15[0].value, 'smith', '~ value');

// ============================================================================
// buildWhereClause
// ============================================================================
console.log('\n── buildWhereClause ──────────────────────────────────────');

// Empty tokens
const w1 = buildWhereClause([]);
assertEq(w1.sql, '', 'empty tokens: empty sql');
assertEq(w1.params, [], 'empty tokens: no params');
assertEq(w1.warnings, [], 'empty tokens: no warnings');

// Single global term: builds OR across global search fields
const w2 = buildWhereClause([{ type: 'global', value: 'john' }]);
assert(w2.sql.includes('LIKE'), 'global term: LIKE');
assert(w2.sql.includes('OR'), 'global term: OR-joined');
assert(w2.sql.includes('person_first'), 'global term: searches person_first');
assert(w2.sql.includes('person_last'), 'global term: searches person_last');
assertEq(w2.params.length, GLOBAL_SEARCH_FIELDS.length, 'global term: param count = global field count');
assertEq(w2.params[0], '%john%', 'global term: %wrapped%');

// Field exact match
const w3 = buildWhereClause([
  { type: 'field', field: 'first', operator: '=', value: 'john' },
]);
assertEq(w3.sql, 'person_first = ?', 'field =: exact SQL');
assertEq(w3.params, ['john'], 'field =: literal value');
assertEq(w3.warnings, [], 'no warnings');

// Field partial match (~)
const w4 = buildWhereClause([
  { type: 'field', field: 'first', operator: '~', value: 'john' },
]);
assertEq(w4.sql, 'person_first LIKE ?', 'field ~: LIKE');
assertEq(w4.params, ['%john%'], 'field ~: %wrapped%');

// Date field with year
const w5 = buildWhereClause([
  { type: 'field', field: 'birth', operator: '~', value: '2020' },
]);
assert(w5.sql.includes('birth_date BETWEEN'), 'date year: BETWEEN');
assertEq(w5.params, ['2020-01-01', '2020-12-31'], 'date year: full year params');

// Date field with > operator
const w6 = buildWhereClause([
  { type: 'field', field: 'birth', operator: '>', value: '2020' },
]);
assert(w6.sql.includes('birth_date >='), 'date year >: >=');
assertEq(w6.params, ['2020-12-31'], 'date year > params');

// Date range operator (..)
// QUIRK: buildWhereClause calls parseDateValue with '>=' for the start and
// '<=' for the end. For a year-only value, '>=' returns the LAST day of that
// year and '<=' returns the FIRST day. So 'birth:2020..2025' produces
// BETWEEN '2020-12-31' AND '2025-01-01' — which is an *empty* range and
// almost certainly a bug, but we document the actual behavior here.
const w7 = buildWhereClause([
  {
    type: 'field',
    field: 'birth',
    operator: '..',
    value: { start: '2020', end: '2025' },
  },
]);
assert(w7.sql.includes('birth_date BETWEEN'), 'date range: BETWEEN');
assertEq(w7.params, ['2020-12-31', '2025-01-01'], 'date range: actual (buggy) inverted bounds');

// Range operator on non-date field → warning
const w8 = buildWhereClause([
  {
    type: 'field',
    field: 'first',
    operator: '..',
    value: { start: 'a', end: 'z' },
  },
]);
assertEq(w8.sql, '', 'range on text: no SQL');
assert(w8.warnings.length === 1, 'range on text: 1 warning');
assert(w8.warnings[0].includes('Range operator'), 'range on text: warning text');

// Unknown field → warning
const w9 = buildWhereClause([
  { type: 'field', field: 'martian', operator: '=', value: 'foo' },
]);
assertEq(w9.sql, '', 'unknown field: no SQL');
assertEq(w9.warnings.length, 1, 'unknown field: 1 warning');
assert(w9.warnings[0].includes('martian'), 'unknown field: warning mentions name');

// Invalid date format → warning
const w10 = buildWhereClause([
  { type: 'field', field: 'birth', operator: '=', value: 'not-a-date' },
]);
assertEq(w10.sql, '', 'invalid date: no SQL');
assertEq(w10.warnings.length, 1, 'invalid date: 1 warning');

// Unsupported operator on text field → warning
const w11 = buildWhereClause([
  { type: 'field', field: 'first', operator: '>', value: 'a' },
]);
assertEq(w11.warnings.length, 1, '> on text: 1 warning');
assert(w11.warnings[0].includes('not supported'), '> on text: warning text');

// Mixed: global + field
const w12 = buildWhereClause([
  { type: 'global', value: 'john' },
  { type: 'field', field: 'birth', operator: '~', value: '2020' },
]);
assert(w12.sql.includes('AND'), 'mixed: joined with AND');
assert(w12.sql.includes('LIKE'), 'mixed: has LIKE for global');
assert(w12.sql.includes('BETWEEN'), 'mixed: has BETWEEN for date');

// Range with invalid endpoints
const w13 = buildWhereClause([
  {
    type: 'field',
    field: 'birth',
    operator: '..',
    value: { start: 'bad', end: '2025' },
  },
]);
assertEq(w13.sql, '', 'invalid range: no SQL');
assertEq(w13.warnings.length, 1, 'invalid range: warning');

// ============================================================================
// parseSearchQuery (top-level entry)
// ============================================================================
console.log('\n── parseSearchQuery ──────────────────────────────────────');

// Empty/falsy
const p1 = parseSearchQuery('');
assertEq(p1.sql, '', 'empty: no sql');
assertEq(p1.params, [], 'empty: no params');
assertEq(p1.tokens, [], 'empty: no tokens');

const p2 = parseSearchQuery(null);
assertEq(p2.sql, '', 'null: no sql');

const p3 = parseSearchQuery('   ');
assertEq(p3.sql, '', 'whitespace only: no sql');

// Simple global query
const p4 = parseSearchQuery('john');
assert(p4.sql.includes('LIKE'), 'global: LIKE');
assertEq(p4.summary.globalTerms, 1, 'summary: 1 global term');
assertEq(p4.summary.fieldFilters, 0, 'summary: 0 field filters');
assertEq(p4.summary.totalTokens, 1, 'summary: 1 total token');

// Field query
const p5 = parseSearchQuery('first:john');
assertEq(p5.sql, 'person_first LIKE ?', 'field-only: LIKE sql');
assertEq(p5.params, ['%john%'], 'field-only: param');
assertEq(p5.summary.fieldFilters, 1, 'summary: 1 field');

// Mixed query
const p6 = parseSearchQuery('john first:david');
assertEq(p6.summary.globalTerms, 1, 'mixed summary: 1 global');
assertEq(p6.summary.fieldFilters, 1, 'mixed summary: 1 field');
assertEq(p6.summary.totalTokens, 2, 'mixed summary: 2 total');

// Date range query — see quirk note in buildWhereClause section
const p7 = parseSearchQuery('birth:2020..2025');
assert(p7.sql.includes('birth_date BETWEEN'), 'date range: BETWEEN');
assertEq(p7.params, ['2020-12-31', '2025-01-01'], 'date range params (inverted bounds quirk)');

// Quoted phrase
const p8 = parseSearchQuery('"John Smith"');
assertEq(p8.summary.globalTerms, 1, 'quoted phrase: 1 global');

// Unknown field → warning
const p9 = parseSearchQuery('martian:foo');
assertEq(p9.warnings.length, 1, 'unknown field: 1 warning');
assertEq(p9.sql, '', 'unknown field: no sql');

// Multiple field filters
const p10 = parseSearchQuery('first:=john last:=smith');
assert(p10.sql.includes('person_first = ?'), 'multi-field: first =');
assert(p10.sql.includes('person_last = ?'), 'multi-field: last =');
assert(p10.sql.includes('AND'), 'multi-field: AND-joined');
assertEq(p10.params, ['john', 'smith'], 'multi-field params');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
