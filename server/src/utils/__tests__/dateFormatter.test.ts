#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/dateFormatter.js (OMD-886)
 *
 * Covers:
 *   - formatDate              (Date object, YYYY-MM-DD, ISO with T,
 *                              MySQL datetime, fallback parse, invalid)
 *   - formatDateTime          (en-US localized format, invalid)
 *   - cleanRecord             (date + datetime field stripping)
 *   - cleanRecords            (array passthrough)
 *   - transformBaptismRecord  (snake/camel duals, parents split, defaults)
 *   - transformBaptismRecords (array form)
 *   - transformMarriageRecord (groom/bride duals, mdate triple-mapping)
 *   - transformMarriageRecords
 *   - transformFuneralRecord  (deceased + burial dates, location aliases)
 *   - transformFuneralRecords
 *
 * All functions are pure (no I/O, no DB). Run:
 *   npx tsx server/src/utils/__tests__/dateFormatter.test.ts
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dateFormatter: any = require('../dateFormatter');

const {
  formatDate,
  formatDateTime,
  cleanRecord,
  cleanRecords,
  transformBaptismRecord,
  transformBaptismRecords,
  transformMarriageRecord,
  transformMarriageRecords,
  transformFuneralRecord,
  transformFuneralRecords,
} = dateFormatter;

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
// formatDate
// ============================================================================
console.log('\n── formatDate ────────────────────────────────────────────');

// Falsy inputs
assertEq(formatDate(null), null, 'null → null');
assertEq(formatDate(undefined), null, 'undefined → null');
assertEq(formatDate(''), null, 'empty string → null');
assertEq(formatDate(0), null, 'zero → null');

// Date object — uses LOCAL methods (no UTC shift)
const localDate = new Date(2025, 7, 1); // August 1, 2025 local
assertEq(formatDate(localDate), '2025-08-01', 'Date object → YYYY-MM-DD via local methods');

const localDateZeroPad = new Date(2025, 0, 5); // Jan 5, 2025
assertEq(formatDate(localDateZeroPad), '2025-01-05', 'Date object: month and day zero-padded');

// Invalid Date object
const badDate = new Date('not a date');
assertEq(formatDate(badDate), null, 'invalid Date object → null');

// Already-formatted YYYY-MM-DD string
assertEq(formatDate('2025-08-01'), '2025-08-01', 'YYYY-MM-DD string passthrough');
assertEq(formatDate('1999-12-31'), '1999-12-31', 'YYYY-MM-DD historical');

// ISO datetime with T → split off date part
assertEq(formatDate('2025-08-01T04:00:00.000Z'), '2025-08-01', 'ISO with T → date part');
assertEq(formatDate('2025-12-25T23:59:59Z'), '2025-12-25', 'ISO Christmas → date part');

// MySQL datetime "YYYY-MM-DD HH:MM:SS"
assertEq(formatDate('2025-08-01 04:00:00'), '2025-08-01', 'MySQL datetime → date part');
assertEq(formatDate('2025-08-01 04:00:00.000'), '2025-08-01', 'MySQL datetime with ms → date part');

// Fallback Date parsing (e.g., "August 1, 2025")
const parsed = formatDate('August 1, 2025');
assertEq(parsed, '2025-08-01', 'human-readable string parsed via Date');

// Invalid string
assertEq(formatDate('not-a-date-at-all'), null, 'unparseable string → null');

// ============================================================================
// formatDateTime
// ============================================================================
console.log('\n── formatDateTime ────────────────────────────────────────');

// Falsy
assertEq(formatDateTime(null), null, 'null → null');
assertEq(formatDateTime(undefined), null, 'undefined → null');
assertEq(formatDateTime(''), null, 'empty → null');

// Invalid
assertEq(formatDateTime('not-a-date'), null, 'invalid string → null');

// Valid date — output is en-US locale, format depends on Node ICU but
// should always include the year, am/pm marker, and use "/" separators.
const dt = formatDateTime('2025-07-03T19:05:00');
assert(typeof dt === 'string' && dt.length > 0, 'valid string returns non-empty string');
assert(dt!.includes('2025'), 'output includes year 2025');
assert(/AM|PM/.test(dt!), 'output includes AM/PM marker (12-hour format)');

const dt2 = formatDateTime(new Date(2025, 6, 3, 19, 5));
assert(typeof dt2 === 'string' && dt2.length > 0, 'Date object → formatted string');
assert(dt2!.includes('2025'), 'Date object output includes year');

// ============================================================================
// cleanRecord
// ============================================================================
console.log('\n── cleanRecord ───────────────────────────────────────────');

// Non-objects passthrough
assertEq(cleanRecord(null), null, 'null passthrough');
assertEq(cleanRecord(undefined), undefined, 'undefined passthrough');
assertEq(cleanRecord('string'), 'string', 'string passthrough');
assertEq(cleanRecord(42), 42, 'number passthrough');

// Empty object
assertEq(cleanRecord({}), {}, 'empty object');

// Date fields stripped
const rec = cleanRecord({
  id: 1,
  name: 'John',
  birth_date: '2000-01-15T05:00:00.000Z',
  mdate: '2025-08-01 04:00:00',
  date: '2025-09-15',
  due_date: new Date(2025, 11, 25),
  start_date: '2025-01-01T00:00:00Z',
  end_date: '2025-12-31T23:59:59Z',
  trial_end: '2026-06-01',
});
assertEq(rec.birth_date, '2000-01-15', 'birth_date stripped');
assertEq(rec.mdate, '2025-08-01', 'mdate stripped');
assertEq(rec.date, '2025-09-15', 'date stripped');
assertEq(rec.due_date, '2025-12-25', 'due_date Date object → string');
assertEq(rec.start_date, '2025-01-01', 'start_date stripped');
assertEq(rec.end_date, '2025-12-31', 'end_date stripped');
assertEq(rec.trial_end, '2026-06-01', 'trial_end passthrough');
assertEq(rec.id, 1, 'non-date field preserved');
assertEq(rec.name, 'John', 'name preserved');

// Datetime fields formatted to readable form
const rec2 = cleanRecord({
  id: 1,
  created_at: '2025-08-01T12:00:00Z',
  updated_at: '2025-08-02T12:00:00Z',
  date_entered: '2025-08-03T12:00:00Z',
  last_login: '2025-08-04T12:00:00Z',
  cancelled_at: '2025-08-05T12:00:00Z',
  paid_at: '2025-08-06T12:00:00Z',
});
assert(typeof rec2.created_at === 'string' && rec2.created_at.includes('2025'), 'created_at formatted');
assert(typeof rec2.updated_at === 'string' && rec2.updated_at.includes('2025'), 'updated_at formatted');
assert(typeof rec2.date_entered === 'string' && rec2.date_entered.includes('2025'), 'date_entered formatted');
assert(typeof rec2.last_login === 'string' && rec2.last_login.includes('2025'), 'last_login formatted');
assert(typeof rec2.cancelled_at === 'string' && rec2.cancelled_at.includes('2025'), 'cancelled_at formatted');
assert(typeof rec2.paid_at === 'string' && rec2.paid_at.includes('2025'), 'paid_at formatted');

// Falsy fields ignored (truthy check in source: `if (cleaned[field])`)
const rec3 = cleanRecord({ birth_date: null, created_at: undefined, mdate: '' });
assertEq(rec3.birth_date, null, 'null date field unchanged');
assertEq(rec3.created_at, undefined, 'undefined datetime field unchanged');
assertEq(rec3.mdate, '', 'empty string date field unchanged');

// Original record not mutated (cleanRecord uses spread)
const original = { id: 1, birth_date: '2000-01-15' };
cleanRecord(original);
assertEq(original.birth_date, '2000-01-15', 'original record not mutated');

// ============================================================================
// cleanRecords
// ============================================================================
console.log('\n── cleanRecords ──────────────────────────────────────────');

assertEq(cleanRecords(null), null, 'null passthrough');
assertEq(cleanRecords('not-array'), 'not-array', 'non-array passthrough');
assertEq(cleanRecords([]), [], 'empty array');

const arr = cleanRecords([
  { id: 1, birth_date: '2000-01-15T05:00:00Z' },
  { id: 2, birth_date: '2001-02-20T05:00:00Z' },
]);
assertEq(arr.length, 2, 'cleanRecords: 2 entries');
assertEq(arr[0].birth_date, '2000-01-15', 'cleanRecords: first stripped');
assertEq(arr[1].birth_date, '2001-02-20', 'cleanRecords: second stripped');

// ============================================================================
// transformBaptismRecord
// ============================================================================
console.log('\n── transformBaptismRecord ────────────────────────────────');

// Non-objects passthrough
assertEq(transformBaptismRecord(null), null, 'null → null');
assertEq(transformBaptismRecord('s'), 's', 'string → string');

const baptism = transformBaptismRecord({
  id: 42,
  first_name: 'John',
  last_name: 'Doe',
  middle_name: 'Q',
  birth_date: '2000-01-15T00:00:00Z',
  reception_date: '2000-03-20T00:00:00Z',
  birthplace: 'NYC',
  sponsors: 'Mary Smith, Bob Jones',
  parents: 'Robert Doe, Jane Doe',
  clergy: 'Fr. Nicholas',
  entry_type: 'baptism',
  church_id: 46,
  registry_number: 'B-1001',
  church_name: 'St. Demetrios',
  notes: 'A note',
  created_at: '2025-08-01T12:00:00Z',
  updated_at: '2025-08-02T12:00:00Z',
  created_by: 'admin@x.com',
});

// Snake-case fields
assertEq(baptism.id, 42, 'id preserved');
assertEq(baptism.first_name, 'John', 'first_name');
assertEq(baptism.last_name, 'Doe', 'last_name');
assertEq(baptism.middle_name, 'Q', 'middle_name');
assertEq(baptism.birth_date, '2000-01-15', 'birth_date formatted');
assertEq(baptism.reception_date, '2000-03-20', 'reception_date formatted');
assertEq(baptism.birthplace, 'NYC', 'birthplace');
assertEq(baptism.sponsors, 'Mary Smith, Bob Jones', 'sponsors');
assertEq(baptism.parents, 'Robert Doe, Jane Doe', 'parents');
assertEq(baptism.clergy, 'Fr. Nicholas', 'clergy');
assertEq(baptism.entry_type, 'baptism', 'entry_type');
assertEq(baptism.church_id, 46, 'church_id');

// CamelCase duals
assertEq(baptism.firstName, 'John', 'firstName');
assertEq(baptism.lastName, 'Doe', 'lastName');
assertEq(baptism.middleName, 'Q', 'middleName');
assertEq(baptism.dateOfBirth, '2000-01-15', 'dateOfBirth');
assertEq(baptism.dateOfBaptism, '2000-03-20', 'dateOfBaptism');
assertEq(baptism.placeOfBirth, 'NYC', 'placeOfBirth');
assertEq(baptism.fatherName, 'Robert Doe', 'fatherName from parents[0]');
assertEq(baptism.motherName, 'Jane Doe', 'motherName from parents[1]');
assertEq(baptism.godparentNames, 'Mary Smith, Bob Jones', 'godparentNames');
assertEq(baptism.priest, 'Fr. Nicholas', 'priest');
assertEq(baptism.registryNumber, 'B-1001', 'registryNumber from registry_number');
assertEq(baptism.churchId, '46', 'churchId stringified');
assertEq(baptism.churchName, 'St. Demetrios', 'churchName');
assertEq(baptism.notes, 'A note', 'notes');
assert(typeof baptism.createdAt === 'string', 'createdAt formatted');
assert(typeof baptism.updatedAt === 'string', 'updatedAt formatted');
assertEq(baptism.createdBy, 'admin@x.com', 'createdBy');
assertEq(baptism.entryType, 'baptism', 'entryType');
assertEq(baptism.originalRecord.id, 42, 'originalRecord preserved');

// Defaults when fields missing
const baptismMin = transformBaptismRecord({
  id: 7,
  first_name: 'Jane',
  last_name: 'Smith',
  church_id: 1,
});
assertEq(baptismMin.middle_name, '', 'missing middle_name → ""');
assertEq(baptismMin.birthplace, '', 'missing birthplace → ""');
assertEq(baptismMin.sponsors, '', 'missing sponsors → ""');
assertEq(baptismMin.parents, '', 'missing parents → ""');
assertEq(baptismMin.clergy, '', 'missing clergy → ""');
assertEq(baptismMin.entry_type, null, 'missing entry_type → null');
assertEq(baptismMin.fatherName, '', 'missing parents → fatherName=""');
assertEq(baptismMin.motherName, '', 'missing parents → motherName=""');
assertEq(baptismMin.registryNumber, 'B-7', 'missing registry → fallback B-{id}');
assertEq(baptismMin.churchId, '1', 'churchId stringified from numeric');
assertEq(baptismMin.churchName, 'Saints Peter and Paul Orthodox Church', 'default churchName');
assertEq(baptismMin.notes, '', 'missing notes → ""');
assertEq(baptismMin.createdBy, 'admin@church.org', 'default createdBy');

// Single parent (no comma) — split[1] is undefined → motherName is undefined
// (NOT empty string; only the missing-parents branch returns "")
const baptismOneParent = transformBaptismRecord({ id: 8, parents: 'Solo Parent', church_id: 1 });
assertEq(baptismOneParent.fatherName, 'Solo Parent', 'single parent → fatherName');
assertEq(baptismOneParent.motherName, undefined, 'single parent → motherName=undefined');

// Search relevance metadata
const baptismScored = transformBaptismRecord({
  id: 9,
  church_id: 1,
  _matchScore: 0.95,
  _matchedFields: ['first_name'],
  _topMatchReason: 'name match',
});
assertEq(baptismScored._matchScore, 0.95, '_matchScore preserved');
assertEq(baptismScored._matchedFields, ['first_name'], '_matchedFields preserved');
assertEq(baptismScored._topMatchReason, 'name match', '_topMatchReason preserved');

const baptismNoScore = transformBaptismRecord({ id: 10, church_id: 1 });
assertEq(baptismNoScore._matchScore, null, 'missing _matchScore → null');
assertEq(baptismNoScore._matchedFields, null, 'missing _matchedFields → null');

// ============================================================================
// transformBaptismRecords
// ============================================================================
console.log('\n── transformBaptismRecords ───────────────────────────────');

assertEq(transformBaptismRecords(null), null, 'null passthrough');
assertEq(transformBaptismRecords('s'), 's', 'non-array passthrough');
assertEq(transformBaptismRecords([]), [], 'empty array');

const baps = transformBaptismRecords([
  { id: 1, first_name: 'A', church_id: 1 },
  { id: 2, first_name: 'B', church_id: 1 },
]);
assertEq(baps.length, 2, 'two records transformed');
assertEq(baps[0].firstName, 'A', 'first record');
assertEq(baps[1].firstName, 'B', 'second record');

// ============================================================================
// transformMarriageRecord
// ============================================================================
console.log('\n── transformMarriageRecord ───────────────────────────────');

assertEq(transformMarriageRecord(null), null, 'null → null');

const marriage = transformMarriageRecord({
  id: 100,
  fname_groom: 'John',
  lname_groom: 'Doe',
  parentsg: 'Robert Doe, Jane Doe',
  fname_bride: 'Mary',
  lname_bride: 'Smith',
  parentsb: 'Tom Smith, Sue Smith',
  witness: 'Bob Witness',
  mlicense: 'ML-2025-001',
  mdate: '2025-06-15',
  clergy: 'Fr. Athanasios',
  church_id: 46,
  notes: 'spring wedding',
  registry_number: 'M-100',
  created_at: '2025-06-15T12:00:00Z',
  updated_at: '2025-06-16T12:00:00Z',
  relevance_score: 0.88,
});

// Snake fields
assertEq(marriage.id, 100, 'id');
assertEq(marriage.fname_groom, 'John', 'fname_groom');
assertEq(marriage.lname_groom, 'Doe', 'lname_groom');
assertEq(marriage.parentsg, 'Robert Doe, Jane Doe', 'parentsg');
assertEq(marriage.fname_bride, 'Mary', 'fname_bride');
assertEq(marriage.lname_bride, 'Smith', 'lname_bride');
assertEq(marriage.parentsb, 'Tom Smith, Sue Smith', 'parentsb');
assertEq(marriage.witness, 'Bob Witness', 'witness');
assertEq(marriage.mlicense, 'ML-2025-001', 'mlicense');
assertEq(marriage.church_id, 46, 'church_id');

// Camel duals
assertEq(marriage.firstName, 'John', 'firstName=groom');
assertEq(marriage.lastName, 'Doe', 'lastName=groom');
assertEq(marriage.groomFirstName, 'John', 'groomFirstName');
assertEq(marriage.groomLastName, 'Doe', 'groomLastName');
assertEq(marriage.groomParents, 'Robert Doe, Jane Doe', 'groomParents');
assertEq(marriage.brideFirstName, 'Mary', 'brideFirstName');
assertEq(marriage.brideLastName, 'Smith', 'brideLastName');
assertEq(marriage.brideParents, 'Tom Smith, Sue Smith', 'brideParents');

// mdate triple-mapping
assertEq(marriage.mdate, '2025-06-15', 'mdate (snake)');
assertEq(marriage.marriageDate, '2025-06-15', 'marriageDate (camel)');
assertEq(marriage.dateOfBaptism, '2025-06-15', 'dateOfBaptism (table display)');

assertEq(marriage.witnesses, 'Bob Witness', 'witnesses');
assertEq(marriage.marriageLicense, 'ML-2025-001', 'marriageLicense');
assertEq(marriage.priest, 'Fr. Athanasios', 'priest');
assertEq(marriage.clergy, 'Fr. Athanasios', 'clergy');
assertEq(marriage.registryNumber, 'M-100', 'registryNumber');
assertEq(marriage.churchId, '46', 'churchId stringified');
assertEq(marriage.notes, 'spring wedding', 'notes');
assertEq(marriage._matchScore, 0.88, '_matchScore from relevance_score');
assertEq(marriage.originalRecord.id, 100, 'originalRecord');

// Missing mdate
const marriageNoDate = transformMarriageRecord({ id: 200, fname_groom: 'X', church_id: 1 });
assertEq(marriageNoDate.mdate, null, 'missing mdate → null');
assertEq(marriageNoDate.marriageDate, null, 'missing marriageDate → null');
assertEq(marriageNoDate.registryNumber, 'M-200', 'fallback registry M-{id}');

// ============================================================================
// transformMarriageRecords
// ============================================================================
console.log('\n── transformMarriageRecords ──────────────────────────────');

assertEq(transformMarriageRecords(null), null, 'null passthrough');
assertEq(transformMarriageRecords([]), [], 'empty');
const mars = transformMarriageRecords([
  { id: 1, fname_groom: 'A', church_id: 1 },
  { id: 2, fname_groom: 'B', church_id: 1 },
]);
assertEq(mars.length, 2, '2 marriages');
assertEq(mars[0].groomFirstName, 'A', 'first');
assertEq(mars[1].groomFirstName, 'B', 'second');

// ============================================================================
// transformFuneralRecord
// ============================================================================
console.log('\n── transformFuneralRecord ────────────────────────────────');

assertEq(transformFuneralRecord(null), null, 'null → null');

const funeral = transformFuneralRecord({
  id: 500,
  name: 'George',
  lastname: 'Papadopoulos',
  age: 82,
  deceased_date: '2025-09-01T00:00:00Z',
  burial_date: '2025-09-04T00:00:00Z',
  burial_location: 'St. John Cemetery',
  clergy: 'Fr. Demetrios',
  church_id: 46,
  notes: 'beloved father',
  registry_number: 'F-500',
  created_at: '2025-09-04T12:00:00Z',
  updated_at: '2025-09-05T12:00:00Z',
  relevance_score: 0.7,
});

// Snake
assertEq(funeral.id, 500, 'id');
assertEq(funeral.name, 'George', 'name');
assertEq(funeral.lastname, 'Papadopoulos', 'lastname');
assertEq(funeral.age, 82, 'age');
assertEq(funeral.deceased_date, '2025-09-01', 'deceased_date');
assertEq(funeral.burial_date, '2025-09-04', 'burial_date');
assertEq(funeral.burial_location, 'St. John Cemetery', 'burial_location');
assertEq(funeral.clergy, 'Fr. Demetrios', 'clergy');
assertEq(funeral.church_id, 46, 'church_id');
assertEq(funeral.notes, 'beloved father', 'notes');

// Camel duals
assertEq(funeral.firstName, 'George', 'firstName=name');
assertEq(funeral.lastName, 'Papadopoulos', 'lastName');
assertEq(funeral.dateOfDeath, '2025-09-01', 'dateOfDeath');
assertEq(funeral.dateOfFuneral, '2025-09-04', 'dateOfFuneral');
assertEq(funeral.dateOfBaptism, '2025-09-04', 'dateOfBaptism = burial (table display)');
assertEq(funeral.burialLocation, 'St. John Cemetery', 'burialLocation');
assertEq(funeral.placeOfBaptism, 'St. John Cemetery', 'placeOfBaptism = burial_location');
assertEq(funeral.priest, 'Fr. Demetrios', 'priest');
assertEq(funeral.registryNumber, 'F-500', 'registryNumber');
assertEq(funeral.churchId, '46', 'churchId stringified');
assertEq(funeral.burialDate, '2025-09-04', 'burialDate alias');
assertEq(funeral.funeralDate, '2025-09-04', 'funeralDate alias');
assertEq(funeral.deathDate, '2025-09-01', 'deathDate alias');
assertEq(funeral._matchScore, 0.7, '_matchScore from relevance_score');
assertEq(funeral.originalRecord.id, 500, 'originalRecord');

// Defaults
const funeralMin = transformFuneralRecord({ id: 7, church_id: 1 });
assertEq(funeralMin.burial_location, '', 'missing burial_location → ""');
assertEq(funeralMin.clergy, '', 'missing clergy → ""');
assertEq(funeralMin.notes, '', 'missing notes → ""');
assertEq(funeralMin.deceased_date, null, 'missing deceased_date → null');
assertEq(funeralMin.burial_date, null, 'missing burial_date → null');
assertEq(funeralMin.registryNumber, 'F-7', 'fallback registry F-{id}');
assertEq(funeralMin.churchName, 'Saints Peter and Paul Orthodox Church', 'default churchName');

// ============================================================================
// transformFuneralRecords
// ============================================================================
console.log('\n── transformFuneralRecords ───────────────────────────────');

assertEq(transformFuneralRecords(null), null, 'null passthrough');
assertEq(transformFuneralRecords([]), [], 'empty');
const funs = transformFuneralRecords([
  { id: 1, name: 'A', church_id: 1 },
  { id: 2, name: 'B', church_id: 1 },
]);
assertEq(funs.length, 2, '2 funerals');
assertEq(funs[0].firstName, 'A', 'first');
assertEq(funs[1].firstName, 'B', 'second');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
