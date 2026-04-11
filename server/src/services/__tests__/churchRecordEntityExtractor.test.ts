#!/usr/bin/env npx tsx
/**
 * Unit tests for services/churchRecordEntityExtractor.js (OMD-1140)
 *
 * The ChurchRecordEntityExtractor class is mostly pure logic — regex
 * pattern matching, string parsing, and date normalization. It imports
 * `../config/db-compat` and `../utils/dbSwitcher` at the top but NEVER
 * uses them in the current implementation. We still stub them so the
 * SUT can be required without side effects.
 *
 * Coverage:
 *   - preprocessText                 — collapses whitespace, strips punctuation
 *   - detectLanguage                 — gr/ru/sr/en
 *   - detectRecordType               — baptism/marriage/funeral/unknown scoring
 *   - calculateOverallConfidence     — linear scaling + clamp at 0.9
 *   - isRegistryFormat               — detects entry numbers / table structure / headers
 *   - detectRegistryColumns          — pipe-header parse, default fallback
 *   - detectMarriageRegistryColumns  — pipe-header with groom/bride, default fallback
 *   - guessColumnType                — header-to-type mapping
 *   - guessMarriageColumnType        — marriage-specific header mapping
 *   - isDataRow                      — filters headers/separators
 *   - parsePersonName                — Last,First / First Last / First Middle Last / single
 *   - parseParentNames               — and/&/и/και/, separators / single name
 *   - parseDate                      — OMD-874: YYYY-MM-DD priority;
 *                                      2-digit year normalization;
 *                                      DD/MM vs MM/DD disambiguation;
 *                                      invalid month/day → null
 *   - mapCellToField                 — all column-type branches
 *   - extractRowData                 — end-to-end row parse with pipes
 *   - extractEntities                — end-to-end async flow, auto-detect,
 *                                      error swallowing, confidence rounding
 *   - extractBaptismData / extractMarriageData — registry detection branch
 *   - extractCommonData / extractFuneralData   — return {}
 *   - storeExtractionResult          — swallows errors
 *
 * Run: npx tsx server/src/services/__tests__/churchRecordEntityExtractor.test.ts
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

// ── Stub db-compat + dbSwitcher before requiring SUT ────────────────
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

// Silence noisy console.log/warn/error during extraction runs
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

const ChurchRecordEntityExtractor = require('../churchRecordEntityExtractor');
const extractor = new ChurchRecordEntityExtractor();

async function main() {

// ============================================================================
// preprocessText
// ============================================================================
console.log('\n── preprocessText ────────────────────────────────────────');

assertEq(
  extractor.preprocessText('  hello    world  '),
  'hello world',
  'collapses whitespace and trims'
);
assertEq(
  extractor.preprocessText('Hello, World! @#$%'),
  'Hello, World',
  'strips special chars, keeps allowed punctuation'
);
assertEq(
  extractor.preprocessText('John Doe (1990-01-15); age: 30.'),
  'John Doe (1990-01-15); age: 30.',
  'preserves -.,;:()'
);

// ============================================================================
// detectLanguage
// ============================================================================
console.log('\n── detectLanguage ────────────────────────────────────────');

assertEq(extractor.detectLanguage('Βάπτισμα Ιωάννου'), 'gr', 'Greek text');
assertEq(extractor.detectLanguage('Крещение Иоанна'), 'ru', 'Russian text');
// Serbian detection requires characters OUTSIDE А-Яа-я (which is matched
// for Russian first). Ћ/ћ/џ/ђ are in the 0x040B range, outside Russian.
assertEq(extractor.detectLanguage('Ћћџђ'), 'sr', 'Serbian text (unique chars)');
assertEq(extractor.detectLanguage('Baptism of John'), 'en', 'English text');
assertEq(extractor.detectLanguage(''), 'en', 'empty → en');
assertEq(extractor.detectLanguage('123 456'), 'en', 'numeric only → en');

// ============================================================================
// detectRecordType
// ============================================================================
console.log('\n── detectRecordType ──────────────────────────────────────');

assertEq(
  extractor.detectRecordType('This is a baptism record for John'),
  'baptism',
  'baptism keyword wins'
);
assertEq(
  extractor.detectRecordType('Marriage certificate bride groom'),
  'marriage',
  'marriage keyword wins'
);
assertEq(
  extractor.detectRecordType('Funeral service for deceased member'),
  'funeral',
  'funeral keyword wins'
);
assertEq(
  extractor.detectRecordType('Random unrelated text with no matches'),
  'unknown',
  'no matches → unknown'
);
assertEq(
  extractor.detectRecordType('βάπτισμα του παιδιού'),
  'baptism',
  'Greek baptism'
);
assertEq(
  extractor.detectRecordType('венчание в церкви'),
  'marriage',
  'Russian marriage'
);

// Pattern-based scoring (orthodox terms)
assertEq(
  extractor.detectRecordType('βαπτίζω νονός ανάδοχος'),
  'baptism',
  'Greek orthodox baptism terms'
);

// ============================================================================
// calculateOverallConfidence
// ============================================================================
console.log('\n── calculateOverallConfidence ────────────────────────────');

assertEq(extractor.calculateOverallConfidence({}), 0, 'empty → 0');
assertEq(
  extractor.calculateOverallConfidence({ a: 1 }),
  0.15,
  '1 field → 0.15'
);
assertEq(
  extractor.calculateOverallConfidence({ a: 1, b: 2, c: 3, d: 4 }),
  0.6,
  '4 fields → 0.60'
);
assertEq(
  extractor.calculateOverallConfidence({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }),
  0.9,
  '6 fields → 0.90 (clamp)'
);
assertEq(
  extractor.calculateOverallConfidence({
    a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10,
  }),
  0.9,
  '10 fields → still 0.90 (clamped)'
);

// ============================================================================
// isRegistryFormat
// ============================================================================
console.log('\n── isRegistryFormat ──────────────────────────────────────');

// Header-based detection (most reliable)
assert(
  extractor.isRegistryFormat('Entry No. | Child Name | Date of Birth'),
  'detected by headers'
);

// Table structure with pipes
assert(
  extractor.isRegistryFormat('| col1 | col2 | col3 |\n| data1 | data2 | data3 |'),
  'detected by pipe table structure'
);

// ============================================================================
// detectRegistryColumns
// ============================================================================
console.log('\n── detectRegistryColumns ─────────────────────────────────');

{
  // Pipe-delimited header row
  const columns = extractor.detectRegistryColumns(
    'Entry | Child Name | Birth Date | Parents | Godparents | Priest'
  );
  assertEq(columns.length, 6, 'detects 6 columns from pipes');
  assertEq(columns[0].header, 'Entry', 'col 0 header');
  assertEq(columns[0].type, 'entryNumber', 'col 0 type');
  assertEq(columns[1].type, 'childName', 'col 1 type');
  assertEq(columns[2].type, 'birthDate', 'col 2 type');
  assertEq(columns[3].type, 'parents', 'col 3 type');
  // NOTE: guessColumnType checks /parent|father|mother/ BEFORE /godparent/,
  // so 'Godparents' matches 'parent' and resolves to 'parents'. This is
  // current behavior — tests lock it in rather than assert the ideal.
  assertEq(columns[4].type, 'parents', 'col 4: Godparents → parents (parent substring)');
  assertEq(columns[5].type, 'priest', 'col 5 type');
}

{
  // No pipes → default column structure
  const columns = extractor.detectRegistryColumns('plain text no pipes');
  assertEq(columns.length, 7, 'default 7-column baptism structure');
  assertEq(columns[0].type, 'entryNumber', 'default col 0');
  assertEq(columns[6].type, 'priest', 'default col 6');
}

// ============================================================================
// detectMarriageRegistryColumns
// ============================================================================
console.log('\n── detectMarriageRegistryColumns ─────────────────────────');

{
  const columns = extractor.detectMarriageRegistryColumns(
    'Number | Date | Groom Info | Bride Info | Witnesses'
  );
  assertEq(columns.length, 5, '5 columns');
  assertEq(columns[2].type, 'groomInfo', 'groom type');
  assertEq(columns[3].type, 'brideInfo', 'bride type');
}

{
  // No marriage header → default marriage structure
  const columns = extractor.detectMarriageRegistryColumns('nothing matches');
  assertEq(columns.length, 6, 'default 6-column marriage structure');
  assertEq(columns[2].type, 'groomInfo', 'default groom col');
  assertEq(columns[3].type, 'brideInfo', 'default bride col');
}

// ============================================================================
// guessColumnType
// ============================================================================
console.log('\n── guessColumnType ───────────────────────────────────────');

assertEq(extractor.guessColumnType('Entry No.'), 'entryNumber', 'entry number');
assertEq(extractor.guessColumnType('#'), 'entryNumber', 'hash');
assertEq(extractor.guessColumnType('Child Name'), 'childName', 'child name');
assertEq(extractor.guessColumnType('Infant'), 'childName', 'infant');
assertEq(extractor.guessColumnType('Date of Birth'), 'birthDate', 'birth');
assertEq(extractor.guessColumnType('Date of Baptism'), 'baptismDate', 'baptism');
assertEq(extractor.guessColumnType('Parents'), 'parents', 'parents');
assertEq(extractor.guessColumnType('Father'), 'parents', 'father');
// 'Godparents' contains 'parent' which matches /parent/ before /godparent/
// (see detectRegistryColumns test above)
assertEq(extractor.guessColumnType('Godparents'), 'parents', 'godparents → parents (substring)');
assertEq(extractor.guessColumnType('Sponsors'), 'godparents', 'sponsors');
assertEq(extractor.guessColumnType('Priest'), 'priest', 'priest');
assertEq(extractor.guessColumnType('Officiating'), 'priest', 'officiating');
assertEq(extractor.guessColumnType('Place'), 'place', 'place');
assertEq(extractor.guessColumnType('Church'), 'place', 'church');
assertEq(extractor.guessColumnType('Remarks'), 'remarks', 'remarks');
assertEq(extractor.guessColumnType('Comments'), 'remarks', 'comments');
// Use a header with no substring overlaps with any of the check patterns.
// 'Unknown' contains 'no' which matches /no\.?/ → entryNumber (substring bug).
assertEq(extractor.guessColumnType('Xyz'), 'unknown', 'unrecognized → unknown');

// ============================================================================
// guessMarriageColumnType
// ============================================================================
console.log('\n── guessMarriageColumnType ───────────────────────────────');

assertEq(extractor.guessMarriageColumnType('Number'), 'entryNumber', 'number');
assertEq(extractor.guessMarriageColumnType('Date'), 'marriageDate', 'date');
assertEq(extractor.guessMarriageColumnType('Groom'), 'groomInfo', 'groom');
assertEq(extractor.guessMarriageColumnType('Bride'), 'brideInfo', 'bride');
assertEq(extractor.guessMarriageColumnType('Witnesses'), 'witnesses', 'witnesses');
assertEq(extractor.guessMarriageColumnType('License'), 'license', 'license');
assertEq(extractor.guessMarriageColumnType('Priest'), 'priest', 'priest');
assertEq(extractor.guessMarriageColumnType('Random'), 'unknown', 'unknown');

// ============================================================================
// isDataRow
// ============================================================================
console.log('\n── isDataRow ─────────────────────────────────────────────');

assert(extractor.isDataRow('John Doe | 1990-01-15 | Baptism'), 'valid data row');
assert(!extractor.isDataRow('----|-----|----'), 'dash separator → false');
assert(!extractor.isDataRow('|  |  |'), 'empty row → false');
assert(
  !extractor.isDataRow('ENTRY NO | CHILD NAME | DATE OF BIRTH'),
  'all-caps header → false'
);
assert(extractor.isDataRow('ABC'), 'short caps still OK (<=10 chars)');
assert(extractor.isDataRow('Mary Smith'), 'normal name');

// ============================================================================
// parsePersonName
// ============================================================================
console.log('\n── parsePersonName ───────────────────────────────────────');

{
  const r = extractor.parsePersonName('Doe, John');
  assertEq(r.lastName, 'Doe', 'Last,First: last');
  assertEq(r.firstName, 'John', 'Last,First: first');
}

{
  const r = extractor.parsePersonName('Doe, John Michael');
  assertEq(r.lastName, 'Doe', 'Last,First Middle: last');
  assertEq(r.firstName, 'John Michael', 'Last,First Middle: first (with middle)');
}

{
  const r = extractor.parsePersonName('John Doe');
  assertEq(r.firstName, 'John', 'First Last: first');
  assertEq(r.lastName, 'Doe', 'First Last: last');
  assertEq(r.middleName, undefined, 'First Last: no middle');
}

{
  const r = extractor.parsePersonName('John Michael Doe');
  assertEq(r.firstName, 'John', 'F M L: first');
  assertEq(r.middleName, 'Michael', 'F M L: middle');
  assertEq(r.lastName, 'Doe', 'F M L: last');
}

{
  const r = extractor.parsePersonName('John Michael Alexander Doe');
  assertEq(r.firstName, 'John', 'F M M L: first');
  assertEq(r.middleName, 'Michael Alexander', 'F M M L: multi-middle');
  assertEq(r.lastName, 'Doe', 'F M M L: last');
}

{
  const r = extractor.parsePersonName('Madonna');
  assertEq(r.firstName, 'Madonna', 'single name: first');
  assertEq(r.lastName, undefined, 'single name: no last');
}

{
  const r = extractor.parsePersonName('  John   Doe  ');
  assertEq(r.fullName, 'John   Doe', 'fullName preserved (trimmed only)');
  assertEq(r.firstName, 'John', 'whitespace normalized for split');
  assertEq(r.lastName, 'Doe', 'whitespace normalized for split');
}

// ============================================================================
// parseParentNames
// ============================================================================
console.log('\n── parseParentNames ──────────────────────────────────────');

{
  const r = extractor.parseParentNames('John Smith and Mary Smith');
  assertEq(r.father, 'John Smith', 'and: father');
  assertEq(r.mother, 'Mary Smith', 'and: mother');
}

{
  const r = extractor.parseParentNames('John Smith & Mary Smith');
  assertEq(r.father, 'John Smith', '& father');
  assertEq(r.mother, 'Mary Smith', '& mother');
}

{
  const r = extractor.parseParentNames('Иван Иванов и Мария Иванова');
  assertEq(r.father, 'Иван Иванов', 'Russian и: father');
  assertEq(r.mother, 'Мария Иванова', 'Russian и: mother');
}

{
  const r = extractor.parseParentNames('Γιάννης και Μαρία');
  assertEq(r.father, 'Γιάννης', 'Greek και: father');
  assertEq(r.mother, 'Μαρία', 'Greek και: mother');
}

{
  const r = extractor.parseParentNames('John Smith, Mary Smith');
  assertEq(r.father, 'John Smith', 'comma: father');
  assertEq(r.mother, 'Mary Smith', 'comma: mother');
}

{
  // No separator → whole thing is the father
  const r = extractor.parseParentNames('John Smith');
  assertEq(r.father, 'John Smith', 'no separator: entire as father');
  assertEq(r.mother, undefined, 'no separator: no mother');
}

// ============================================================================
// parseDate (OMD-874 regression + edge cases)
// ============================================================================
console.log('\n── parseDate ─────────────────────────────────────────────');

// OMD-874: ISO format must match FIRST, otherwise DD/MM regex greedily
// matches inside "2020-05-12"
assertEq(extractor.parseDate('2020-05-12'), '2020-05-12', 'ISO YYYY-MM-DD');
assertEq(extractor.parseDate('2020/05/12'), '2020-05-12', 'ISO YYYY/MM/DD');
assertEq(extractor.parseDate('1999-12-31'), '1999-12-31', 'end of century');

// DD/MM format (European) — first number > 12 forces DD
assertEq(extractor.parseDate('15-06-2020'), '2020-06-15', '15-06-2020 → DD-MM-YYYY');

// MM/DD format — second number > 12 forces MM/DD
assertEq(extractor.parseDate('06-15-2020'), '2020-06-15', '06-15-2020 → MM-DD-YYYY');

// Ambiguous: both <= 12, DD/MM preferred (European Orthodox tradition)
assertEq(extractor.parseDate('05-06-2020'), '2020-06-05', '05-06-2020 → DD-MM (European)');

// 2-digit year normalization
assertEq(extractor.parseDate('15-06-99'), '1999-06-15', '2-digit year 99 → 1999');
assertEq(extractor.parseDate('15-06-20'), '2020-06-15', '2-digit year 20 → 2020');
assertEq(extractor.parseDate('15-06-49'), '2049-06-15', '2-digit year 49 → 2049');
assertEq(extractor.parseDate('15-06-50'), '1950-06-15', '2-digit year 50 → 1950');

// Invalid inputs
assertEq(extractor.parseDate(null), null, 'null → null');
assertEq(extractor.parseDate(undefined), null, 'undefined → null');
assertEq(extractor.parseDate(''), null, 'empty → null');
assertEq(extractor.parseDate(12345), null, 'non-string → null');
assertEq(extractor.parseDate('not a date'), null, 'junk → null');

// Invalid month/day within parseable pattern
assertEq(extractor.parseDate('45-13-2020'), null, 'both invalid → null');
assertEq(extractor.parseDate('2020-13-45'), null, 'ISO invalid month/day → null');

// Year boundary
assertEq(extractor.parseDate('1800-01-01'), '1800-01-01', 'year 1800 lower bound');
assertEq(extractor.parseDate('2100-12-31'), '2100-12-31', 'year 2100 upper bound');

// ============================================================================
// mapCellToField
// ============================================================================
console.log('\n── mapCellToField ────────────────────────────────────────');

{
  const fields: any = {};
  extractor.mapCellToField('42', 'entryNumber', fields);
  assertEq(fields.entryNumber, 42, 'entryNumber parsed as int');
}

{
  const fields: any = {};
  extractor.mapCellToField('N/A', 'entryNumber', fields);
  assertEq(fields.entryNumber, 'N/A', 'non-numeric entry number kept as string');
}

{
  const fields: any = {};
  extractor.mapCellToField('Doe, John', 'childName', fields);
  assertEq(fields.childFirstName, 'John', 'childName → firstName');
  assertEq(fields.childLastName, 'Doe', 'childName → lastName');
}

{
  const fields: any = {};
  extractor.mapCellToField('2020-05-12', 'birthDate', fields);
  assertEq(fields.dateOfBirth, '2020-05-12', 'birthDate → dateOfBirth');
}

{
  const fields: any = {};
  extractor.mapCellToField('2020-05-12', 'baptismDate', fields);
  assertEq(fields.dateOfBaptism, '2020-05-12', 'baptismDate → dateOfBaptism');
}

{
  const fields: any = {};
  extractor.mapCellToField('2020-05-12', 'marriageDate', fields);
  assertEq(fields.dateOfMarriage, '2020-05-12', 'marriageDate → dateOfMarriage');
}

{
  const fields: any = {};
  extractor.mapCellToField('invalid', 'birthDate', fields);
  assertEq(fields.dateOfBirth, undefined, 'invalid date → no field');
}

{
  const fields: any = {};
  extractor.mapCellToField('John Smith and Mary Smith', 'parents', fields);
  assertEq(fields.fatherName, 'John Smith', 'parents → fatherName');
  assertEq(fields.motherName, 'Mary Smith', 'parents → motherName');
}

{
  const fields: any = {};
  extractor.mapCellToField('George Stavros', 'godparents', fields);
  assertEq(fields.godparents, 'George Stavros', 'godparents direct');
}

{
  const fields: any = {};
  extractor.mapCellToField('Fr. Nicholas', 'priest', fields);
  assertEq(fields.officiantName, 'Fr. Nicholas', 'priest → officiantName');
}

{
  const fields: any = {};
  extractor.mapCellToField('some value', 'customField', fields);
  assertEq(fields.customField, 'some value', 'unknown type stored as-is');
}

// ============================================================================
// extractRowData
// ============================================================================
console.log('\n── extractRowData ────────────────────────────────────────');

{
  const columns = [
    { index: 0, header: 'Entry', type: 'entryNumber' },
    { index: 1, header: 'Child Name', type: 'childName' },
    { index: 2, header: 'Birth', type: 'birthDate' },
    { index: 3, header: 'Parents', type: 'parents' },
    { index: 4, header: 'Priest', type: 'priest' },
  ];
  const row = '12 | Doe, John | 2020-05-12 | John Smith and Mary Smith | Fr. Nicholas';
  const fields = extractor.extractRowData(row, columns);
  assertEq(fields.entryNumber, 12, 'row: entryNumber');
  assertEq(fields.childFirstName, 'John', 'row: childFirstName');
  assertEq(fields.childLastName, 'Doe', 'row: childLastName');
  assertEq(fields.dateOfBirth, '2020-05-12', 'row: dateOfBirth');
  assertEq(fields.fatherName, 'John Smith', 'row: fatherName');
  assertEq(fields.motherName, 'Mary Smith', 'row: motherName');
  assertEq(fields.officiantName, 'Fr. Nicholas', 'row: officiantName');
}

{
  // Shorter row than columns — handles gracefully
  const columns = [
    { index: 0, header: 'Entry', type: 'entryNumber' },
    { index: 1, header: 'Child Name', type: 'childName' },
    { index: 2, header: 'Birth', type: 'birthDate' },
  ];
  const row = '5 | Smith, Jane';
  const fields = extractor.extractRowData(row, columns);
  assertEq(fields.entryNumber, 5, 'short row: entry');
  assertEq(fields.childFirstName, 'Jane', 'short row: child first');
  assertEq(fields.dateOfBirth, undefined, 'short row: no date');
}

// ============================================================================
// extractBaptismData / extractMarriageData — registry branch
// ============================================================================
console.log('\n── extract{Baptism,Marriage}Data ─────────────────────────');

quiet();
{
  // Not a registry → returns empty
  const result = await extractor.extractBaptismData('just plain text', 'en');
  loud();
  assertEq(result, {}, 'non-registry baptism → empty');
}

quiet();
{
  // Registry format with headers triggers extractRegistryData
  const text = 'Entry No. | Child Name | Date of Birth | Parents\n1 | Doe, John | 2020-05-12 | John and Mary';
  const result = await extractor.extractBaptismData(text, 'en');
  loud();
  // Registry data should have populated fields (best effort)
  assert(typeof result === 'object', 'registry baptism returns object');
}

quiet();
{
  const result = await extractor.extractMarriageData('just plain text', 'en');
  loud();
  assertEq(result, {}, 'non-registry marriage → empty');
}

// ============================================================================
// extractCommonData / extractFuneralData (stubs)
// ============================================================================
console.log('\n── extract{Common,Funeral}Data ───────────────────────────');

{
  const result = await extractor.extractCommonData('any text', 'en');
  assertEq(result, {}, 'extractCommonData returns {}');
}

{
  const result = await extractor.extractFuneralData('any text', 'en');
  assertEq(result, {}, 'extractFuneralData returns {}');
}

// ============================================================================
// storeExtractionResult (swallows errors)
// ============================================================================
console.log('\n── storeExtractionResult ─────────────────────────────────');

quiet();
{
  // Just verify it doesn't throw
  let threw = false;
  try {
    await extractor.storeExtractionResult({ recordType: 'baptism' }, 42);
  } catch (e) {
    threw = true;
  }
  loud();
  assert(!threw, 'storeExtractionResult does not throw');
}

// ============================================================================
// extractEntities — end-to-end async flow
// ============================================================================
console.log('\n── extractEntities ───────────────────────────────────────');

quiet();
{
  const result = await extractor.extractEntities(
    'This is a baptism record for John Doe, son of John Smith and Mary Smith.',
    null,
    'en',
    null
  );
  loud();
  assertEq(result.recordType, 'baptism', 'auto-detected record type');
  assertEq(result.metadata.language, 'en', 'language preserved');
  assert(typeof result.fields === 'object', 'fields object present');
  assert(typeof result.confidence === 'number', 'confidence is number');
  assert(!!result.metadata.extractionDate, 'extractionDate set');
  assertEq(result.metadata.churchId, null, 'churchId in metadata');
  assertEq(result.metadata.sourceText,
    'This is a baptism record for John Doe, son of John Smith and Mary Smith.',
    'sourceText is cleaned text'
  );
}

// With explicit recordType
quiet();
{
  const result = await extractor.extractEntities('text', 'marriage', 'en');
  loud();
  assertEq(result.recordType, 'marriage', 'explicit recordType honored');
}

// Auto-detect language via 'multi' — IMPORTANT: preprocessText uses \w
// which is ASCII-only in JS default regex, so non-ASCII characters get
// stripped BEFORE detectLanguage runs. Greek/Russian text therefore
// degrades to 'en'. This is current behavior; locking it in.
quiet();
{
  const result = await extractor.extractEntities(
    'Βάπτισμα Ιωάννου στην εκκλησία',
    null, 'multi'
  );
  loud();
  assertEq(result.metadata.language, 'en',
    'multi → en (non-ASCII stripped by preprocess)');
}

// funeral/death alias
quiet();
{
  const result = await extractor.extractEntities('text', 'death', 'en');
  loud();
  assertEq(result.recordType, 'death', 'death alias honored');
  assertEq(result.fields, {}, 'death path returns empty fields');
}

// Unknown record type → extractCommonData path
quiet();
{
  const result = await extractor.extractEntities(
    'random text with no orthodox keywords',
    null, 'en'
  );
  loud();
  assertEq(result.recordType, 'unknown', 'unknown type');
  assertEq(result.fields, {}, 'unknown → empty fields');
  assertEq(result.confidence, 0, '0 fields → 0 confidence');
}

// Error path — passing non-string ocrText makes preprocessText throw
quiet();
{
  const result = await extractor.extractEntities(null as any, 'baptism', 'en', 5);
  loud();
  assertEq(result.recordType, 'baptism', 'error: recordType preserved');
  assertEq(result.confidence, 0, 'error: confidence 0');
  assertEq(result.fields, {}, 'error: empty fields');
  assert(!!result.error, 'error: error field populated');
  assertEq(result.metadata.churchId, 5, 'error: churchId preserved');
}

// churchId → storeExtractionResult path exercised (no throw)
quiet();
{
  const result = await extractor.extractEntities(
    'baptism of child',
    'baptism', 'en', 42
  );
  loud();
  assertEq(result.metadata.churchId, 42, 'churchId stored in metadata');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
