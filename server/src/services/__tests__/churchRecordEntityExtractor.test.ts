#!/usr/bin/env npx tsx
/**
 * Unit tests for services/churchRecordEntityExtractor.js (OMD-1040)
 *
 * AI entity extractor for Orthodox church records. Has shallow DB dependencies
 * (`../config/db-compat`, `../utils/dbSwitcher`) that are stubbed with empty
 * exports; the tested methods are purely pattern-based and don't touch the DB.
 *
 * Coverage:
 *   - preprocessText — whitespace + punctuation cleanup
 *   - detectLanguage — Greek / Russian / Serbian / English
 *   - detectRecordType — baptism / marriage / funeral / unknown via term scoring
 *   - calculateOverallConfidence — linear + cap
 *   - parseDate — ISO-first ordering (OMD-874 regression), DD/MM vs MM/DD
 *     disambiguation, 2-digit years, out-of-range validation
 *   - parsePersonName — "Last, First", "First Last", "First Middle Last", single
 *   - parseParentNames — English/Greek/Russian/& separators, fallback father-only
 *   - guessColumnType / guessMarriageColumnType — header → column type
 *   - isDataRow — alphanumeric, all-caps header, divider line rejection
 *   - isRegistryFormat — pipes + headers + entry-number heuristics
 *   - detectRegistryColumns / detectMarriageRegistryColumns — with + without pipes
 *   - extractRowData + mapCellToField — integration of parsers
 *   - extractEntities — full pipeline stubs via preprocess/detect/extract
 *
 * Run from server/: npx tsx src/services/__tests__/churchRecordEntityExtractor.test.ts
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

// ── Stub db dependencies (never touched by pure methods) ───────────────────
const dbCompatPath = require.resolve('../../config/db-compat');
require.cache[dbCompatPath] = {
  id: dbCompatPath, filename: dbCompatPath, loaded: true,
  exports: {
    getAppPool: () => ({ query: async () => [[]] }),
    promisePool: { query: async () => [[]] },
  },
} as any;

const dbSwitcherPath = require.resolve('../../utils/dbSwitcher');
require.cache[dbSwitcherPath] = {
  id: dbSwitcherPath, filename: dbSwitcherPath, loaded: true,
  exports: {
    getChurchDbConnection: async () => ({ query: async () => [[]] }),
  },
} as any;

// Silence console
const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;
function quiet() { console.log = () => {}; console.error = () => {}; console.warn = () => {}; }
function loud() { console.log = origLog; console.error = origError; console.warn = origWarn; }

const ChurchRecordEntityExtractor = require('../churchRecordEntityExtractor');

// Silence console at construction (initializePatterns logs nothing but extract methods chatter)
quiet();
const ex = new ChurchRecordEntityExtractor();
loud();

async function main() {

// ============================================================================
// preprocessText
// ============================================================================
console.log('\n── preprocessText ────────────────────────────────────────');

assertEq(ex.preprocessText('  hello   world  '), 'hello world', 'whitespace collapsed');
assertEq(ex.preprocessText('hello\n\tworld'), 'hello world', 'tabs/newlines collapsed');
assertEq(ex.preprocessText('hello@#$world'), 'hello   world', 'special chars → space (not collapsed to single)');
assertEq(ex.preprocessText('John Doe, born 1980.'), 'John Doe, born 1980.', 'punct allowed (commas, periods)');
assertEq(ex.preprocessText(''), '', 'empty');

// ============================================================================
// detectLanguage
// ============================================================================
console.log('\n── detectLanguage ────────────────────────────────────────');

assertEq(ex.detectLanguage('Βάπτισμα'), 'gr', 'Greek letters');
assertEq(ex.detectLanguage('Крещение'), 'ru', 'Cyrillic');
// Serbian check is only reached if no Russian-range char is present.
// Use only Serbian-specific Cyrillic letters (outside А-Я/а-я range).
assertEq(ex.detectLanguage('ћџђ'), 'sr', 'Serbian-specific letters (outside Russian range)');
assertEq(ex.detectLanguage('Baptism on 1980'), 'en', 'Latin → en');
assertEq(ex.detectLanguage(''), 'en', 'empty → en');

// ============================================================================
// detectRecordType
// ============================================================================
console.log('\n── detectRecordType ──────────────────────────────────────');

assertEq(
  ex.detectRecordType('Certificate of Baptism for John Doe, godparent present'),
  'baptism',
  'baptism keywords'
);
assertEq(
  ex.detectRecordType('Marriage of John and Mary, witness present'),
  'marriage',
  'marriage keywords'
);
assertEq(
  ex.detectRecordType('Funeral service conducted by Father Peter'),
  'funeral',
  'funeral keywords'
);
assertEq(
  ex.detectRecordType('Lorem ipsum dolor sit amet'),
  'unknown',
  'no keywords → unknown'
);

// ============================================================================
// calculateOverallConfidence
// ============================================================================
console.log('\n── calculateOverallConfidence ────────────────────────────');

assertEq(ex.calculateOverallConfidence({}), 0, 'empty → 0');
assertEq(ex.calculateOverallConfidence({ a: 1 }), 0.15, '1 field → 0.15');
assertEq(ex.calculateOverallConfidence({ a: 1, b: 2 }), 0.3, '2 fields → 0.30');
assertEq(ex.calculateOverallConfidence({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }), 0.9, 'capped at 0.9');
assertEq(ex.calculateOverallConfidence({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10 }), 0.9, 'beyond cap still 0.9');

// ============================================================================
// parseDate — ISO-first ordering (OMD-874 regression)
// ============================================================================
console.log('\n── parseDate: ISO ordering ───────────────────────────────');

// If the pattern order were wrong, this would match the DD/MM/YY pattern first
// and interpret "20-05-12" inside "2020-05-12" as the full date.
assertEq(ex.parseDate('2020-05-12'), '2020-05-12', 'YYYY-MM-DD ISO');
assertEq(ex.parseDate('2015/01/30'), '2015-01-30', 'YYYY/MM/DD slash');
assertEq(ex.parseDate('1999-12-31'), '1999-12-31', 'ISO year boundary');

// ============================================================================
// parseDate — DD/MM vs MM/DD disambiguation
// ============================================================================
console.log('\n── parseDate: DD/MM vs MM/DD ─────────────────────────────');

// First > 12 → must be day (DD/MM)
assertEq(ex.parseDate('15/03/2020'), '2020-03-15', 'DD/MM forced by day>12');
// Second > 12 → must be day (MM/DD)
assertEq(ex.parseDate('03/25/2020'), '2020-03-25', 'MM/DD forced by day>12');
// Both ≤ 12 → DD/MM default (European Orthodox tradition)
assertEq(ex.parseDate('05/06/2020'), '2020-06-05', 'ambiguous → DD/MM');

// 2-digit years
assertEq(ex.parseDate('15/03/20'), '2020-03-15', '2-digit year <50 → 2000+');
assertEq(ex.parseDate('15/03/80'), '1980-03-15', '2-digit year >=50 → 1900+');

// Invalid dates
assertEq(ex.parseDate('32/13/2020'), null, 'out-of-range → null');
assertEq(ex.parseDate('not a date'), null, 'non-matching → null');
assertEq(ex.parseDate(''), null, 'empty → null');
assertEq(ex.parseDate(null as any), null, 'null input → null');

// ============================================================================
// parsePersonName
// ============================================================================
console.log('\n── parsePersonName ───────────────────────────────────────');

{
  // "Last, First" format
  const r = ex.parsePersonName('Smith, John');
  assertEq(r.lastName, 'Smith', 'Last,First → lastName');
  assertEq(r.firstName, 'John', 'Last,First → firstName');
}

{
  // "First Last"
  const r = ex.parsePersonName('John Smith');
  assertEq(r.firstName, 'John', 'First Last → firstName');
  assertEq(r.lastName, 'Smith', 'First Last → lastName');
}

{
  // "First Middle Last"
  const r = ex.parsePersonName('John Peter Smith');
  assertEq(r.firstName, 'John', '3-part → firstName');
  assertEq(r.middleName, 'Peter', '3-part → middleName');
  assertEq(r.lastName, 'Smith', '3-part → lastName');
}

{
  // Single name
  const r = ex.parsePersonName('John');
  assertEq(r.firstName, 'John', 'single → firstName');
  assert(r.lastName === undefined, 'single → no lastName');
}

{
  // Whitespace preserved in fullName
  const r = ex.parsePersonName('  John   Smith  ');
  assertEq(r.firstName, 'John', 'collapses whitespace');
  assertEq(r.lastName, 'Smith', 'collapses whitespace → last');
}

// ============================================================================
// parseParentNames
// ============================================================================
console.log('\n── parseParentNames ──────────────────────────────────────');

{
  const r = ex.parseParentNames('John Smith and Mary Smith');
  assertEq(r.father, 'John Smith', 'English: father');
  assertEq(r.mother, 'Mary Smith', 'English: mother');
}
{
  const r = ex.parseParentNames('John & Mary');
  assertEq(r.father, 'John', 'ampersand: father');
  assertEq(r.mother, 'Mary', 'ampersand: mother');
}
{
  const r = ex.parseParentNames('Иван и Мария');
  assertEq(r.father, 'Иван', 'Russian "и": father');
  assertEq(r.mother, 'Мария', 'Russian "и": mother');
}
{
  const r = ex.parseParentNames('Γιάννης και Μαρία');
  assertEq(r.father, 'Γιάννης', 'Greek "και": father');
  assertEq(r.mother, 'Μαρία', 'Greek "και": mother');
}
{
  // No separator → falls through to father-only
  const r = ex.parseParentNames('JustOneName');
  assertEq(r.father, 'JustOneName', 'no separator → father only');
  assert(r.mother === undefined, 'no mother when no separator');
}

// ============================================================================
// guessColumnType
// ============================================================================
console.log('\n── guessColumnType ───────────────────────────────────────');

assertEq(ex.guessColumnType('Entry No'), 'entryNumber', 'entry no');
assertEq(ex.guessColumnType('#'), 'entryNumber', '#');
assertEq(ex.guessColumnType('Child Name'), 'childName', 'child name');
assertEq(ex.guessColumnType('Infant'), 'childName', 'infant');
assertEq(ex.guessColumnType('Date of Birth'), 'birthDate', 'birth');
assertEq(ex.guessColumnType('Baptism Date'), 'baptismDate', 'baptism');
assertEq(ex.guessColumnType('Christening'), 'baptismDate', 'christen');
assertEq(ex.guessColumnType('Parents'), 'parents', 'parents');
assertEq(ex.guessColumnType('Father'), 'parents', 'father');
// "Godparents" contains "parent" which matches the parents pattern first (module quirk)
assertEq(ex.guessColumnType('Godparents'), 'parents', 'godparents → parents (contains "parent")');
assertEq(ex.guessColumnType('Sponsor'), 'godparents', 'sponsor');
assertEq(ex.guessColumnType('Priest'), 'priest', 'priest');
assertEq(ex.guessColumnType('Clergy'), 'priest', 'clergy');
assertEq(ex.guessColumnType('Church'), 'place', 'church → place');
assertEq(ex.guessColumnType('Remarks'), 'remarks', 'remarks');
assertEq(ex.guessColumnType('Random'), 'unknown', 'unknown');

// ============================================================================
// guessMarriageColumnType
// ============================================================================
console.log('\n── guessMarriageColumnType ───────────────────────────────');

assertEq(ex.guessMarriageColumnType('Number'), 'entryNumber', 'number');
assertEq(ex.guessMarriageColumnType('Date'), 'marriageDate', 'date');
assertEq(ex.guessMarriageColumnType('Groom'), 'groomInfo', 'groom');
assertEq(ex.guessMarriageColumnType('Bride'), 'brideInfo', 'bride');
assertEq(ex.guessMarriageColumnType('Witnesses'), 'witnesses', 'witnesses');
assertEq(ex.guessMarriageColumnType('License'), 'license', 'license');
assertEq(ex.guessMarriageColumnType('Priest'), 'priest', 'priest');
assertEq(ex.guessMarriageColumnType('Other'), 'unknown', 'unknown');

// ============================================================================
// isDataRow
// ============================================================================
console.log('\n── isDataRow ─────────────────────────────────────────────');

assertEq(ex.isDataRow('1 | John Smith | 1980-01-01'), true, 'has data');
assertEq(ex.isDataRow('   '), false, 'whitespace only');
assertEq(ex.isDataRow('THIS IS ALL CAPS HEADER LINE'), false, 'all caps long → header');
assertEq(ex.isDataRow('AB'), true, 'short all caps → data (no length gate)');
assertEq(ex.isDataRow('---|---|---'), false, 'divider line');
assertEq(ex.isDataRow('John'), true, 'single name → data');

// ============================================================================
// isRegistryFormat
// ============================================================================
console.log('\n── isRegistryFormat ──────────────────────────────────────');

// With header + pipes
quiet();
const hasHeader = ex.isRegistryFormat('Entry | Name | Date\n1 | John | 1980');
loud();
assertEq(hasHeader, true, 'pipes + header → registry');

quiet();
const plainText = ex.isRegistryFormat('This is just a plain narrative text with no structure.');
loud();
assertEq(plainText, false, 'plain text → not registry');

// ============================================================================
// detectRegistryColumns
// ============================================================================
console.log('\n── detectRegistryColumns ─────────────────────────────────');

{
  const cols = ex.detectRegistryColumns('Entry | Child | Birth | Baptism | Parents\n1 | John | 1980 | 1981 | Smith');
  assertEq(cols.length, 5, '5 cols detected');
  assertEq(cols[0].type, 'entryNumber', 'col0 entry');
  assertEq(cols[1].type, 'childName', 'col1 child');
  assertEq(cols[2].type, 'birthDate', 'col2 birth');
  assertEq(cols[3].type, 'baptismDate', 'col3 baptism');
  assertEq(cols[4].type, 'parents', 'col4 parents');
}

{
  // No pipes → fallback default
  const cols = ex.detectRegistryColumns('plain text with no pipes');
  assertEq(cols.length, 7, 'default 7-col fallback');
  assertEq(cols[0].type, 'entryNumber', 'default col0');
}

// ============================================================================
// detectMarriageRegistryColumns
// ============================================================================
console.log('\n── detectMarriageRegistryColumns ─────────────────────────');

{
  const cols = ex.detectMarriageRegistryColumns('Number | Date | Groom | Bride | Witnesses\n1|2020|A|B|C');
  assertEq(cols.length, 5, 'marriage cols');
  assertEq(cols[0].type, 'entryNumber', 'col0');
  assertEq(cols[2].type, 'groomInfo', 'col2 groom');
  assertEq(cols[3].type, 'brideInfo', 'col3 bride');
}

{
  // No match → fallback
  const cols = ex.detectMarriageRegistryColumns('some text');
  assertEq(cols.length, 6, 'default 6-col marriage fallback');
}

// ============================================================================
// extractRowData + mapCellToField integration
// ============================================================================
console.log('\n── extractRowData ────────────────────────────────────────');

{
  const columns = [
    { index: 0, header: 'Entry', type: 'entryNumber' },
    { index: 1, header: 'Child', type: 'childName' },
    { index: 2, header: 'Birth', type: 'birthDate' },
    { index: 3, header: 'Baptism', type: 'baptismDate' },
    { index: 4, header: 'Parents', type: 'parents' },
    { index: 5, header: 'Godparents', type: 'godparents' },
    { index: 6, header: 'Priest', type: 'priest' },
  ];
  const row = '42|Smith, John|15/03/1980|20/04/1980|Peter Smith and Maria Smith|Uncle Bob|Father Nicholas';
  const fields = ex.extractRowData(row, columns);

  assertEq(fields.entryNumber, 42, 'entryNumber parsed as int');
  assertEq(fields.childFirstName, 'John', 'child first (Last, First format)');
  assertEq(fields.childLastName, 'Smith', 'child last (Last, First format)');
  assertEq(fields.dateOfBirth, '1980-03-15', 'birthDate parsed');
  assertEq(fields.dateOfBaptism, '1980-04-20', 'baptismDate parsed');
  assertEq(fields.fatherName, 'Peter Smith', 'father');
  assertEq(fields.motherName, 'Maria Smith', 'mother');
  assertEq(fields.godparents, 'Uncle Bob', 'godparents raw');
  assertEq(fields.officiantName, 'Father Nicholas', 'priest → officiantName');
}

// mapCellToField for unknown column → stores as-is
{
  const fields: any = {};
  ex.mapCellToField('raw value', 'unknown_type', fields);
  assertEq(fields.unknown_type, 'raw value', 'unknown column type passthrough');
}

// marriageDate branch
{
  const columns = [{ index: 0, header: 'Date', type: 'marriageDate' }];
  const fields = ex.extractRowData('15/06/2019', columns);
  assertEq(fields.dateOfMarriage, '2019-06-15', 'marriageDate parsed');
}

// entryNumber non-numeric → returns cell
{
  const columns = [{ index: 0, header: 'Entry', type: 'entryNumber' }];
  const fields = ex.extractRowData('A-42', columns);
  assertEq(fields.entryNumber, 'A-42', 'non-numeric entry kept as string');
}

// ============================================================================
// extractEntities — full pipeline
// ============================================================================
console.log('\n── extractEntities ───────────────────────────────────────');

quiet();
{
  const result = await ex.extractEntities(
    'Certificate of Baptism for John Doe, godparent present',
    null,  // auto-detect
    'multi'
  );
  loud();
  assertEq(result.recordType, 'baptism', 'auto-detected baptism');
  assertEq(result.metadata.language, 'en', 'multi → detected en');
  assert(typeof result.confidence === 'number', 'confidence number');
  assert(result.metadata.extractionDate !== undefined, 'has extractionDate');
}

// Explicit record type skips detection
quiet();
{
  const result = await ex.extractEntities('Lorem ipsum', 'marriage', 'en');
  loud();
  assertEq(result.recordType, 'marriage', 'respects passed recordType');
}

// Funeral branch
quiet();
{
  const result = await ex.extractEntities('Funeral service', 'funeral', 'en');
  loud();
  assertEq(result.recordType, 'funeral', 'funeral branch');
}

// Default branch (unknown → extractCommonData)
quiet();
{
  const result = await ex.extractEntities('Mystery text', 'unknown', 'en');
  loud();
  assertEq(result.recordType, 'unknown', 'unknown defaults to common extract');
  assertEq(Object.keys(result.fields).length, 0, 'no fields from common');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => {
  loud();
  console.error('Unhandled test error:', e);
  process.exit(1);
});
