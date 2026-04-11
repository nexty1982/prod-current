#!/usr/bin/env npx tsx
/**
 * Unit tests for services/om-seedlings/scopeMatrix.js (OMD-1245)
 *
 * Pure functions — no external deps.
 *
 * Coverage:
 *   - SIZE_PROFILES: required categories present, shape validation
 *   - LIFECYCLE_PHASES: ordering, boundaries
 *   - inferSizeFromName: cathedral/monastery/mission/chapel/default matching,
 *     case insensitive, empty/null input
 *   - getLifecyclePhase: each phase boundary (founding/growing/mature/aging),
 *     negative age, very old
 *   - computeTargetCounts: determinism with Math.random stub, totals = sum of
 *     byYear, year span calculation, recordTypes subset, varianceFactor=0
 *     yields base rates, invalid size category throws, option defaults
 *
 * Math.random() is stubbed to a deterministic sequence so counts are
 * reproducible across runs.
 *
 * Run: npx tsx server/src/services/__tests__/scopeMatrix.test.ts
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

// ─── Deterministic Math.random stub ────────────────────────────────
const origRandom = Math.random;
function stubRandom(value: number) {
  Math.random = () => value;
}
function restoreRandom() {
  Math.random = origRandom;
}

const {
  SIZE_PROFILES,
  LIFECYCLE_PHASES,
  inferSizeFromName,
  getLifecyclePhase,
  computeTargetCounts,
} = require('../om-seedlings/scopeMatrix');

// ============================================================================
// SIZE_PROFILES
// ============================================================================
console.log('\n── SIZE_PROFILES ─────────────────────────────────────────');

const expectedCategories = ['mission_small', 'parish_small', 'parish_medium', 'parish_large', 'cathedral_or_major'];
for (const cat of expectedCategories) {
  assert(SIZE_PROFILES[cat], `has ${cat}`);
  assert(typeof SIZE_PROFILES[cat].label === 'string', `${cat}: label`);
  assert(SIZE_PROFILES[cat].annualRates, `${cat}: annualRates`);
  const rates = SIZE_PROFILES[cat].annualRates;
  for (const phase of ['founding', 'growing', 'mature', 'aging']) {
    assert(rates[phase], `${cat}.${phase} present`);
    assert(typeof rates[phase].baptism === 'number', `${cat}.${phase}.baptism is number`);
    assert(typeof rates[phase].marriage === 'number', `${cat}.${phase}.marriage is number`);
    assert(typeof rates[phase].funeral === 'number', `${cat}.${phase}.funeral is number`);
  }
}

// Rates should generally increase by size (mature rate)
assert(
  SIZE_PROFILES.mission_small.annualRates.mature.baptism <
  SIZE_PROFILES.cathedral_or_major.annualRates.mature.baptism,
  'cathedral > mission baptism rate (mature)'
);
assert(
  SIZE_PROFILES.parish_small.annualRates.mature.baptism <
  SIZE_PROFILES.parish_large.annualRates.mature.baptism,
  'large parish > small parish baptism rate'
);

// ============================================================================
// LIFECYCLE_PHASES
// ============================================================================
console.log('\n── LIFECYCLE_PHASES ──────────────────────────────────────');

assertEq(LIFECYCLE_PHASES.length, 4, '4 phases');
assertEq(LIFECYCLE_PHASES[0].key, 'founding', 'phase 0: founding');
assertEq(LIFECYCLE_PHASES[1].key, 'growing', 'phase 1: growing');
assertEq(LIFECYCLE_PHASES[2].key, 'mature', 'phase 2: mature');
assertEq(LIFECYCLE_PHASES[3].key, 'aging', 'phase 3: aging');
assertEq(LIFECYCLE_PHASES[0].maxAge, 10, 'founding maxAge');
assertEq(LIFECYCLE_PHASES[1].maxAge, 30, 'growing maxAge');
assertEq(LIFECYCLE_PHASES[2].maxAge, 60, 'mature maxAge');
assertEq(LIFECYCLE_PHASES[3].maxAge, Infinity, 'aging maxAge');

// ============================================================================
// inferSizeFromName
// ============================================================================
console.log('\n── inferSizeFromName ─────────────────────────────────────');

assertEq(inferSizeFromName('Holy Trinity Cathedral'), 'cathedral_or_major', 'cathedral');
assertEq(inferSizeFromName('HOLY WISDOM CATHEDRAL'), 'cathedral_or_major', 'uppercase cathedral');
assertEq(inferSizeFromName('St John Cathedral of the Archangel'), 'cathedral_or_major', 'mid-phrase cathedral');
assertEq(inferSizeFromName('St Tikhon Monastery'), 'mission_small', 'monastery');
assertEq(inferSizeFromName('Holy Transfiguration Hermitage'), 'mission_small', 'hermitage');
assertEq(inferSizeFromName('Small Skete'), 'mission_small', 'skete');
assertEq(inferSizeFromName('New Mission Church'), 'mission_small', 'mission');
assertEq(inferSizeFromName('St Nicholas Chapel'), 'parish_small', 'chapel');
assertEq(inferSizeFromName('Holy Theotokos Parish'), 'parish_medium', 'default parish');
assertEq(inferSizeFromName(''), 'parish_medium', 'empty string default');
assertEq(inferSizeFromName(null as any), 'parish_medium', 'null default');
assertEq(inferSizeFromName(undefined as any), 'parish_medium', 'undefined default');

// Word boundaries — "cathedralesque" should NOT match cathedral
assertEq(inferSizeFromName('Cathedralesque Something'), 'parish_medium', 'word boundary respected');

// ============================================================================
// getLifecyclePhase
// ============================================================================
console.log('\n── getLifecyclePhase ─────────────────────────────────────');

// Founded 2000, target 2005 → age 5 → founding
assertEq(getLifecyclePhase(2000, 2005), 'founding', 'age 5 → founding');
assertEq(getLifecyclePhase(2000, 2000), 'founding', 'age 0 → founding');
assertEq(getLifecyclePhase(2000, 2010), 'founding', 'age 10 → founding (boundary)');
assertEq(getLifecyclePhase(2000, 2011), 'growing', 'age 11 → growing');
assertEq(getLifecyclePhase(2000, 2030), 'growing', 'age 30 → growing (boundary)');
assertEq(getLifecyclePhase(2000, 2031), 'mature', 'age 31 → mature');
assertEq(getLifecyclePhase(2000, 2060), 'mature', 'age 60 → mature (boundary)');
assertEq(getLifecyclePhase(2000, 2061), 'aging', 'age 61 → aging');
assertEq(getLifecyclePhase(1800, 2026), 'aging', 'very old → aging');

// ============================================================================
// computeTargetCounts — invalid size
// ============================================================================
console.log('\n── computeTargetCounts: invalid size ─────────────────────');

{
  let caught: Error | null = null;
  try {
    computeTargetCounts(2000, 'not_a_size');
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Unknown size category'), 'throws on invalid size');
  assert(caught!.message.includes('mission_small'), 'lists valid options');
}

// ============================================================================
// computeTargetCounts — deterministic with random=0
// ============================================================================
console.log('\n── computeTargetCounts: variance=0 ───────────────────────');

{
  // With varianceFactor=0, the variance multiplier is exactly 1
  // → adjusted = baseRate exactly
  // → count = floor(baseRate) + (Math.random() < (baseRate % 1) ? 1 : 0)
  // Stub random to 0.5 so floor(rate) + (0.5 < rate%1 ? 1 : 0)
  stubRandom(0.5);
  const result = computeTargetCounts(2020, 'parish_medium', {
    fromYear: 2020,
    toYear: 2022,
    varianceFactor: 0,
  });
  restoreRandom();

  assertEq(result.yearSpan.from, 2020, 'from year');
  assertEq(result.yearSpan.to, 2022, 'to year');
  assertEq(result.yearSpan.years, 3, 'year count');
  assertEq(result.sizeCategory, 'parish_medium', 'size echo');
  assertEq(result.sizeLabel, 'Medium Parish', 'size label');
  assertEq(result.establishedYear, 2020, 'established echo');

  // parish_medium founding: baptism=3.0, marriage=1.2, funeral=0.6
  // With variance=0, adjusted = 3.0, 1.2, 0.6
  // count = floor(3) + (0.5 < 0 ? 1 : 0) = 3 + 0 = 3 for baptism (3.0 % 1 = 0)
  // count = floor(1.2) + (0.5 < 0.2 ? 1 : 0) = 1 + 0 = 1 for marriage
  // count = floor(0.6) + (0.5 < 0.6 ? 1 : 0) = 0 + 1 = 1 for funeral
  assertEq(result.byYear[2020].baptism, 3, 'baptism 2020 = 3');
  assertEq(result.byYear[2020].marriage, 1, 'marriage 2020 = 1');
  assertEq(result.byYear[2020].funeral, 1, 'funeral 2020 = 1');
  // 3 years of same rate (all within founding phase)
  assertEq(result.byYear[2021].baptism, 3, 'baptism 2021');
  assertEq(result.byYear[2022].baptism, 3, 'baptism 2022');

  // totals = 3 years * rates
  assertEq(result.totals.baptism, 9, 'totals.baptism = 3*3');
  assertEq(result.totals.marriage, 3, 'totals.marriage = 3*1');
  assertEq(result.totals.funeral, 3, 'totals.funeral = 3*1');
}

// ============================================================================
// computeTargetCounts — totals == sum of byYear
// ============================================================================
console.log('\n── computeTargetCounts: sum invariant ────────────────────');

{
  stubRandom(0.3);
  const result = computeTargetCounts(1990, 'parish_large', {
    fromYear: 1990,
    toYear: 2020,
    varianceFactor: 0,
  });
  restoreRandom();

  // Verify: sum over byYear for each type equals totals
  let sumBap = 0, sumMar = 0, sumFun = 0;
  for (const y of Object.keys(result.byYear)) {
    sumBap += result.byYear[y].baptism;
    sumMar += result.byYear[y].marriage;
    sumFun += result.byYear[y].funeral;
  }
  assertEq(sumBap, result.totals.baptism, 'totals.baptism = sum of byYear');
  assertEq(sumMar, result.totals.marriage, 'totals.marriage = sum of byYear');
  assertEq(sumFun, result.totals.funeral, 'totals.funeral = sum of byYear');
}

// ============================================================================
// computeTargetCounts — phase transitions apply correct rates
// ============================================================================
console.log('\n── computeTargetCounts: phase transitions ────────────────');

{
  // Stub Math.random to always return 0.99 (never increments fractional part)
  stubRandom(0.99);
  const result = computeTargetCounts(2000, 'parish_medium', {
    fromYear: 2000,
    toYear: 2065,
    varianceFactor: 0,
  });
  restoreRandom();

  // parish_medium:
  //   founding (age 0-10):  baptism 3.0
  //   growing  (age 11-30): baptism 6.0
  //   mature   (age 31-60): baptism 8.0
  //   aging    (age 61+):   baptism 6.0
  // With variance 0 and random 0.99 > 0.0, floor(int) only:
  //   founding: 3, growing: 6, mature: 8, aging: 6
  assertEq(result.byYear[2000].baptism, 3, 'age 0 (founding) = 3');
  assertEq(result.byYear[2010].baptism, 3, 'age 10 (founding) = 3');
  assertEq(result.byYear[2011].baptism, 6, 'age 11 (growing) = 6');
  assertEq(result.byYear[2030].baptism, 6, 'age 30 (growing) = 6');
  assertEq(result.byYear[2031].baptism, 8, 'age 31 (mature) = 8');
  assertEq(result.byYear[2060].baptism, 8, 'age 60 (mature) = 8');
  assertEq(result.byYear[2061].baptism, 6, 'age 61 (aging) = 6');
}

// ============================================================================
// computeTargetCounts — recordTypes subset
// ============================================================================
console.log('\n── computeTargetCounts: recordTypes subset ───────────────');

{
  stubRandom(0.5);
  const result = computeTargetCounts(2020, 'parish_medium', {
    fromYear: 2020,
    toYear: 2020,
    recordTypes: ['baptism'],
    varianceFactor: 0,
  });
  restoreRandom();

  assert(result.byYear[2020].baptism !== undefined, 'baptism present');
  assertEq(result.byYear[2020].marriage, undefined, 'marriage not computed');
  assertEq(result.byYear[2020].funeral, undefined, 'funeral not computed');
  // totals still initialized to 0 for untracked types
  assertEq(result.totals.marriage, 0, 'totals.marriage = 0');
  assertEq(result.totals.funeral, 0, 'totals.funeral = 0');
  assert(result.totals.baptism > 0, 'totals.baptism accumulated');
}

// ============================================================================
// computeTargetCounts — default fromYear is establishedYear
// ============================================================================
console.log('\n── computeTargetCounts: default fromYear ─────────────────');

{
  stubRandom(0.5);
  const currentYear = new Date().getFullYear();
  const result = computeTargetCounts(currentYear - 5, 'parish_small', {
    varianceFactor: 0,
  });
  restoreRandom();
  assertEq(result.yearSpan.from, currentYear - 5, 'default from = establishedYear');
  assertEq(result.yearSpan.to, currentYear, 'default to = current year');
  assertEq(result.yearSpan.years, 6, 'year span');
}

// ============================================================================
// computeTargetCounts — all 5 size categories don't throw
// ============================================================================
console.log('\n── computeTargetCounts: all sizes ────────────────────────');

{
  stubRandom(0.5);
  for (const cat of expectedCategories) {
    const result = computeTargetCounts(2000, cat, {
      fromYear: 2000,
      toYear: 2010,
      varianceFactor: 0,
    });
    assert(result.totals.baptism >= 0, `${cat}: baptism >= 0`);
    assert(result.totals.marriage >= 0, `${cat}: marriage >= 0`);
    assert(result.totals.funeral >= 0, `${cat}: funeral >= 0`);
  }
  restoreRandom();
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
