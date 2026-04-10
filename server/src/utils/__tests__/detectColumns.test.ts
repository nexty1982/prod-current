#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/detectColumns.js (OMD-897)
 *
 * Tests the column-detection precedence logic against a stub pool
 * that mocks SHOW COLUMNS responses. No real DB required.
 *
 * Precedence rules under test:
 *   - baptismDate:  reception_date > baptism_date > null
 *   - birthDate:    birth_date | null
 *   - marriageDate: mdate > marriage_date > null
 *   - funeralDate:  burial_date > funeral_date > deceased_date > death_date > null
 *   - {sacrament}Clergy: 'clergy' | null
 *   - baptismName:  child_name > name > null
 *   - marriageName: groom_name > name > null
 *   - funeralName:  deceased_name > name > null
 *
 * Run: npx tsx server/src/utils/__tests__/detectColumns.test.ts
 */

const { detectColumns } = require('../detectColumns');

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

/**
 * Build a stub pool whose .query() returns rows in the SHOW COLUMNS shape
 * ([{Field: 'col1'}, {Field: 'col2'}, ...]) keyed off the table name
 * found in the query string.
 */
function makeStubPool(tableCols: Record<string, string[] | Error>) {
  return {
    query: async (sql: string) => {
      for (const [table, cols] of Object.entries(tableCols)) {
        if (sql.includes(table)) {
          if (cols instanceof Error) throw cols;
          return [cols.map(name => ({ Field: name }))];
        }
      }
      return [[]];
    }
  };
}

// ============================================================================
// baptismDate precedence
// ============================================================================
console.log('\n── baptismDate precedence ────────────────────────────────');

(async () => {
  // reception_date wins over baptism_date
  let pool = makeStubPool({
    baptism_records: ['reception_date', 'baptism_date'],
    marriage_records: [],
    funeral_records: [],
  });
  let r = await detectColumns(pool);
  assertEq(r.baptismDate, 'reception_date', 'reception > baptism');

  // baptism_date used when reception_date absent
  pool = makeStubPool({
    baptism_records: ['baptism_date'],
    marriage_records: [],
    funeral_records: [],
  });
  r = await detectColumns(pool);
  assertEq(r.baptismDate, 'baptism_date', 'baptism_date fallback');

  // null when neither present
  pool = makeStubPool({
    baptism_records: ['name'],
    marriage_records: [],
    funeral_records: [],
  });
  r = await detectColumns(pool);
  assertEq(r.baptismDate, null, 'no date columns → null');

  // ============================================================================
  // birthDate
  // ============================================================================
  console.log('\n── birthDate ─────────────────────────────────────────────');

  pool = makeStubPool({
    baptism_records: ['birth_date'],
    marriage_records: [],
    funeral_records: [],
  });
  r = await detectColumns(pool);
  assertEq(r.birthDate, 'birth_date', 'birth_date present');

  pool = makeStubPool({
    baptism_records: ['baptism_date'],
    marriage_records: [],
    funeral_records: [],
  });
  r = await detectColumns(pool);
  assertEq(r.birthDate, null, 'birth_date absent → null');

  // ============================================================================
  // marriageDate precedence
  // ============================================================================
  console.log('\n── marriageDate precedence ───────────────────────────────');

  pool = makeStubPool({
    baptism_records: [],
    marriage_records: ['mdate', 'marriage_date'],
    funeral_records: [],
  });
  r = await detectColumns(pool);
  assertEq(r.marriageDate, 'mdate', 'mdate wins over marriage_date');

  pool = makeStubPool({
    baptism_records: [],
    marriage_records: ['marriage_date'],
    funeral_records: [],
  });
  r = await detectColumns(pool);
  assertEq(r.marriageDate, 'marriage_date', 'marriage_date fallback');

  pool = makeStubPool({
    baptism_records: [],
    marriage_records: ['groom_name'],
    funeral_records: [],
  });
  r = await detectColumns(pool);
  assertEq(r.marriageDate, null, 'no marriage date columns → null');

  // ============================================================================
  // funeralDate precedence (4 levels)
  // ============================================================================
  console.log('\n── funeralDate precedence ────────────────────────────────');

  // burial wins over all
  pool = makeStubPool({
    baptism_records: [],
    marriage_records: [],
    funeral_records: ['burial_date', 'funeral_date', 'deceased_date', 'death_date'],
  });
  r = await detectColumns(pool);
  assertEq(r.funeralDate, 'burial_date', 'burial_date highest');

  // funeral_date when no burial
  pool = makeStubPool({
    baptism_records: [],
    marriage_records: [],
    funeral_records: ['funeral_date', 'deceased_date', 'death_date'],
  });
  r = await detectColumns(pool);
  assertEq(r.funeralDate, 'funeral_date', 'funeral_date second');

  // deceased_date when no burial/funeral
  pool = makeStubPool({
    baptism_records: [],
    marriage_records: [],
    funeral_records: ['deceased_date', 'death_date'],
  });
  r = await detectColumns(pool);
  assertEq(r.funeralDate, 'deceased_date', 'deceased_date third');

  // death_date last resort
  pool = makeStubPool({
    baptism_records: [],
    marriage_records: [],
    funeral_records: ['death_date'],
  });
  r = await detectColumns(pool);
  assertEq(r.funeralDate, 'death_date', 'death_date lowest');

  // null when none
  pool = makeStubPool({
    baptism_records: [],
    marriage_records: [],
    funeral_records: ['name'],
  });
  r = await detectColumns(pool);
  assertEq(r.funeralDate, null, 'no funeral date columns → null');

  // ============================================================================
  // Clergy columns
  // ============================================================================
  console.log('\n── clergy columns ────────────────────────────────────────');

  pool = makeStubPool({
    baptism_records: ['clergy'],
    marriage_records: ['clergy'],
    funeral_records: ['clergy'],
  });
  r = await detectColumns(pool);
  assertEq(r.baptismClergy, 'clergy', 'baptism clergy detected');
  assertEq(r.marriageClergy, 'clergy', 'marriage clergy detected');
  assertEq(r.funeralClergy, 'clergy', 'funeral clergy detected');

  pool = makeStubPool({
    baptism_records: [],
    marriage_records: [],
    funeral_records: [],
  });
  r = await detectColumns(pool);
  assertEq(r.baptismClergy, null, 'no baptism clergy → null');
  assertEq(r.marriageClergy, null, 'no marriage clergy → null');
  assertEq(r.funeralClergy, null, 'no funeral clergy → null');

  // Mixed: only baptism has clergy
  pool = makeStubPool({
    baptism_records: ['clergy'],
    marriage_records: ['name'],
    funeral_records: ['name'],
  });
  r = await detectColumns(pool);
  assertEq(r.baptismClergy, 'clergy', 'mixed: baptism has clergy');
  assertEq(r.marriageClergy, null, 'mixed: marriage no clergy');
  assertEq(r.funeralClergy, null, 'mixed: funeral no clergy');

  // ============================================================================
  // Name columns precedence
  // ============================================================================
  console.log('\n── name columns precedence ───────────────────────────────');

  // baptism: child_name > name
  pool = makeStubPool({
    baptism_records: ['child_name', 'name'],
    marriage_records: [],
    funeral_records: [],
  });
  r = await detectColumns(pool);
  assertEq(r.baptismName, 'child_name', 'child_name wins');

  pool = makeStubPool({
    baptism_records: ['name'],
    marriage_records: [],
    funeral_records: [],
  });
  r = await detectColumns(pool);
  assertEq(r.baptismName, 'name', 'baptism: name fallback');

  pool = makeStubPool({
    baptism_records: ['baptism_date'],
    marriage_records: [],
    funeral_records: [],
  });
  r = await detectColumns(pool);
  assertEq(r.baptismName, null, 'baptism: no name → null');

  // marriage: groom_name > name
  pool = makeStubPool({
    baptism_records: [],
    marriage_records: ['groom_name', 'name'],
    funeral_records: [],
  });
  r = await detectColumns(pool);
  assertEq(r.marriageName, 'groom_name', 'groom_name wins');

  pool = makeStubPool({
    baptism_records: [],
    marriage_records: ['name'],
    funeral_records: [],
  });
  r = await detectColumns(pool);
  assertEq(r.marriageName, 'name', 'marriage: name fallback');

  pool = makeStubPool({
    baptism_records: [],
    marriage_records: ['mdate'],
    funeral_records: [],
  });
  r = await detectColumns(pool);
  assertEq(r.marriageName, null, 'marriage: no name → null');

  // funeral: deceased_name > name
  pool = makeStubPool({
    baptism_records: [],
    marriage_records: [],
    funeral_records: ['deceased_name', 'name'],
  });
  r = await detectColumns(pool);
  assertEq(r.funeralName, 'deceased_name', 'deceased_name wins');

  pool = makeStubPool({
    baptism_records: [],
    marriage_records: [],
    funeral_records: ['name'],
  });
  r = await detectColumns(pool);
  assertEq(r.funeralName, 'name', 'funeral: name fallback');

  pool = makeStubPool({
    baptism_records: [],
    marriage_records: [],
    funeral_records: ['burial_date'],
  });
  r = await detectColumns(pool);
  assertEq(r.funeralName, null, 'funeral: no name → null');

  // ============================================================================
  // bCols/mCols/fCols passthrough
  // ============================================================================
  console.log('\n── raw column arrays passthrough ─────────────────────────');

  pool = makeStubPool({
    baptism_records: ['id', 'baptism_date', 'name'],
    marriage_records: ['id', 'mdate'],
    funeral_records: ['id', 'death_date', 'deceased_name'],
  });
  r = await detectColumns(pool);
  assertEq(r.bCols, ['id', 'baptism_date', 'name'], 'bCols passthrough');
  assertEq(r.mCols, ['id', 'mdate'], 'mCols passthrough');
  assertEq(r.fCols, ['id', 'death_date', 'deceased_name'], 'fCols passthrough');

  // ============================================================================
  // Empty schemas
  // ============================================================================
  console.log('\n── all-empty schemas ─────────────────────────────────────');

  pool = makeStubPool({
    baptism_records: [],
    marriage_records: [],
    funeral_records: [],
  });
  r = await detectColumns(pool);
  assertEq(r.baptismDate, null, 'empty: baptismDate null');
  assertEq(r.birthDate, null, 'empty: birthDate null');
  assertEq(r.marriageDate, null, 'empty: marriageDate null');
  assertEq(r.funeralDate, null, 'empty: funeralDate null');
  assertEq(r.baptismClergy, null, 'empty: baptismClergy null');
  assertEq(r.marriageClergy, null, 'empty: marriageClergy null');
  assertEq(r.funeralClergy, null, 'empty: funeralClergy null');
  assertEq(r.baptismName, null, 'empty: baptismName null');
  assertEq(r.marriageName, null, 'empty: marriageName null');
  assertEq(r.funeralName, null, 'empty: funeralName null');
  assertEq(r.bCols, [], 'empty: bCols []');
  assertEq(r.mCols, [], 'empty: mCols []');
  assertEq(r.fCols, [], 'empty: fCols []');

  // ============================================================================
  // SHOW COLUMNS query throws → caught, returns []
  // ============================================================================
  console.log('\n── query failure handled ─────────────────────────────────');

  pool = makeStubPool({
    baptism_records: new Error('table missing'),
    marriage_records: new Error('table missing'),
    funeral_records: new Error('table missing'),
  });
  r = await detectColumns(pool);
  assertEq(r.bCols, [], 'throw: bCols []');
  assertEq(r.mCols, [], 'throw: mCols []');
  assertEq(r.fCols, [], 'throw: fCols []');
  assertEq(r.baptismDate, null, 'throw: baptismDate null');
  assertEq(r.marriageDate, null, 'throw: marriageDate null');
  assertEq(r.funeralDate, null, 'throw: funeralDate null');

  // Mixed: only baptism throws, others succeed
  pool = makeStubPool({
    baptism_records: new Error('missing'),
    marriage_records: ['mdate'],
    funeral_records: ['burial_date'],
  });
  r = await detectColumns(pool);
  assertEq(r.bCols, [], 'mixed throw: bCols []');
  assertEq(r.marriageDate, 'mdate', 'mixed throw: marriage still works');
  assertEq(r.funeralDate, 'burial_date', 'mixed throw: funeral still works');

  // ============================================================================
  // Realistic full schema
  // ============================================================================
  console.log('\n── realistic full schema ─────────────────────────────────');

  pool = makeStubPool({
    baptism_records: [
      'id', 'church_id', 'reception_date', 'baptism_date', 'birth_date',
      'child_name', 'clergy', 'parents', 'sponsors'
    ],
    marriage_records: [
      'id', 'church_id', 'mdate', 'groom_name', 'bride_name', 'clergy', 'witnesses'
    ],
    funeral_records: [
      'id', 'church_id', 'burial_date', 'deceased_date', 'deceased_name',
      'clergy', 'cemetery'
    ],
  });
  r = await detectColumns(pool);
  assertEq(r.baptismDate, 'reception_date', 'realistic: baptism reception_date');
  assertEq(r.birthDate, 'birth_date', 'realistic: birth_date');
  assertEq(r.marriageDate, 'mdate', 'realistic: marriage mdate');
  assertEq(r.funeralDate, 'burial_date', 'realistic: funeral burial_date');
  assertEq(r.baptismClergy, 'clergy', 'realistic: baptism clergy');
  assertEq(r.marriageClergy, 'clergy', 'realistic: marriage clergy');
  assertEq(r.funeralClergy, 'clergy', 'realistic: funeral clergy');
  assertEq(r.baptismName, 'child_name', 'realistic: baptism child_name');
  assertEq(r.marriageName, 'groom_name', 'realistic: marriage groom_name');
  assertEq(r.funeralName, 'deceased_name', 'realistic: funeral deceased_name');

  // ============================================================================
  // Result shape includes exactly the documented keys
  // ============================================================================
  console.log('\n── result shape ──────────────────────────────────────────');

  pool = makeStubPool({
    baptism_records: [],
    marriage_records: [],
    funeral_records: [],
  });
  r = await detectColumns(pool);
  const expectedKeys = [
    'baptismDate', 'birthDate', 'marriageDate', 'funeralDate',
    'baptismClergy', 'marriageClergy', 'funeralClergy',
    'baptismName', 'marriageName', 'funeralName',
    'bCols', 'mCols', 'fCols'
  ].sort();
  assertEq(Object.keys(r).sort(), expectedKeys, 'result has exactly the documented keys');

  // ============================================================================
  // Summary
  // ============================================================================
  console.log(`\n──────────────────────────────────────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
