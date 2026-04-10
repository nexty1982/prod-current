#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/snapshotScanner.ts (OMD-882)
 *
 * Covers:
 *   - parseSnapshotId       (private, via __test__)
 *   - generateLabel         (private, via __test__)
 *   - createDate            (private, via __test__)
 *   - isValidSnapshotId     (public)
 *   - scanForSnapshots      (public) — tmp directory
 *   - getMostRecentSnapshot (public)
 *   - getSnapshotById       (public)
 *   - getSnapshotsInRange   (public)
 *   - getSnapshotStats      (public)
 *
 * Run: npx tsx server/src/utils/__tests__/snapshotScanner.test.ts
 *
 * Exits non-zero on any failure.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

import {
  isValidSnapshotId,
  scanForSnapshots,
  getMostRecentSnapshot,
  getSnapshotById,
  getSnapshotsInRange,
  getSnapshotStats,
  __test__,
} from '../snapshotScanner';

const { parseSnapshotId, generateLabel, createDate } = __test__;

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
// parseSnapshotId
// ============================================================================
console.log('\n── parseSnapshotId ───────────────────────────────────────');

// Valid
assertEq(parseSnapshotId('01-2024'), { month: 1, year: 2024 }, 'valid: 01-2024');
assertEq(parseSnapshotId('09-2025'), { month: 9, year: 2025 }, 'valid: 09-2025');
assertEq(parseSnapshotId('12-2099'), { month: 12, year: 2099 }, 'valid: 12-2099');
assertEq(parseSnapshotId('06-2050'), { month: 6, year: 2050 }, 'valid: 06-2050');
assertEq(parseSnapshotId('01-2020'), { month: 1, year: 2020 }, 'valid: 01-2020 (lower bound year)');
assertEq(parseSnapshotId('01-2100'), { month: 1, year: 2100 }, 'valid: 01-2100 (upper bound year)');

// Invalid format
assertEq(parseSnapshotId(''), null, 'empty string → null');
assertEq(parseSnapshotId('1-2024'), null, 'single-digit month → null');
assertEq(parseSnapshotId('01-24'), null, 'two-digit year → null');
assertEq(parseSnapshotId('01/2024'), null, 'slash separator → null');
assertEq(parseSnapshotId('012024'), null, 'no separator → null');
assertEq(parseSnapshotId('foo-bar'), null, 'non-digits → null');
assertEq(parseSnapshotId('01-2024-extra'), null, 'extra suffix → null');
assertEq(parseSnapshotId('prefix-01-2024'), null, 'extra prefix → null');

// Out-of-range month
assertEq(parseSnapshotId('00-2024'), null, 'month 00 → null');
assertEq(parseSnapshotId('13-2024'), null, 'month 13 → null');
assertEq(parseSnapshotId('99-2024'), null, 'month 99 → null');

// Out-of-range year
assertEq(parseSnapshotId('01-2019'), null, 'year 2019 (below 2020) → null');
assertEq(parseSnapshotId('01-2101'), null, 'year 2101 (above 2100) → null');
assertEq(parseSnapshotId('01-1999'), null, 'year 1999 → null');

// ============================================================================
// generateLabel
// ============================================================================
console.log('\n── generateLabel ─────────────────────────────────────────');

assertEq(generateLabel(1, 2024), 'January 2024', 'January');
assertEq(generateLabel(2, 2024), 'February 2024', 'February');
assertEq(generateLabel(3, 2024), 'March 2024', 'March');
assertEq(generateLabel(4, 2024), 'April 2024', 'April');
assertEq(generateLabel(5, 2024), 'May 2024', 'May');
assertEq(generateLabel(6, 2024), 'June 2024', 'June');
assertEq(generateLabel(7, 2024), 'July 2024', 'July');
assertEq(generateLabel(8, 2024), 'August 2024', 'August');
assertEq(generateLabel(9, 2025), 'September 2025', 'September 2025');
assertEq(generateLabel(10, 2024), 'October 2024', 'October');
assertEq(generateLabel(11, 2024), 'November 2024', 'November');
assertEq(generateLabel(12, 2024), 'December 2024', 'December');

// ============================================================================
// createDate
// ============================================================================
console.log('\n── createDate ────────────────────────────────────────────');

const d1 = createDate(9, 2025);
assertEq(d1.getFullYear(), 2025, 'createDate: year');
assertEq(d1.getMonth(), 8, 'createDate: month index (0-based, Sept = 8)');
assertEq(d1.getDate(), 1, 'createDate: day of month is 1');

const d2 = createDate(1, 2024);
assertEq(d2.getMonth(), 0, 'createDate: January → month 0');

const d3 = createDate(12, 2024);
assertEq(d3.getMonth(), 11, 'createDate: December → month 11');

// Ordering check
assert(createDate(9, 2025) > createDate(1, 2024), 'createDate: 09-2025 > 01-2024');
assert(createDate(1, 2025) > createDate(12, 2024), 'createDate: 01-2025 > 12-2024');

// ============================================================================
// isValidSnapshotId
// ============================================================================
console.log('\n── isValidSnapshotId ─────────────────────────────────────');

assertEq(isValidSnapshotId('01-2024'), true, 'valid: 01-2024');
assertEq(isValidSnapshotId('09-2025'), true, 'valid: 09-2025');
assertEq(isValidSnapshotId('12-2099'), true, 'valid: 12-2099');
assertEq(isValidSnapshotId(''), false, 'invalid: empty');
assertEq(isValidSnapshotId('1-2024'), false, 'invalid: single-digit month');
assertEq(isValidSnapshotId('00-2024'), false, 'invalid: month 00');
assertEq(isValidSnapshotId('13-2024'), false, 'invalid: month 13');
assertEq(isValidSnapshotId('foo'), false, 'invalid: non-numeric');

// ============================================================================
// scanForSnapshots / getMostRecentSnapshot / getSnapshotById /
// getSnapshotsInRange / getSnapshotStats
// ============================================================================

const tmpRoot = path.join(os.tmpdir(), `omd-882-snapshots-${Date.now()}-${Math.random().toString(36).slice(2)}`);
fs.mkdirSync(tmpRoot, { recursive: true });

// Set up fixture: a few valid snapshots, one invalid (no prod), one bad-format
fs.mkdirSync(path.join(tmpRoot, '01-2024/prod'), { recursive: true });
fs.mkdirSync(path.join(tmpRoot, '06-2024/prod'), { recursive: true });
fs.mkdirSync(path.join(tmpRoot, '09-2025/prod'), { recursive: true });
fs.mkdirSync(path.join(tmpRoot, '12-2025/prod'), { recursive: true });
// Invalid snapshot: dir exists but no /prod subdir
fs.mkdirSync(path.join(tmpRoot, '03-2025'), { recursive: true });
// Bad format folders should be ignored entirely
fs.mkdirSync(path.join(tmpRoot, 'random-folder'), { recursive: true });
fs.mkdirSync(path.join(tmpRoot, '99-2025/prod'), { recursive: true }); // bad month
// A file (not a directory) — should be skipped
fs.writeFileSync(path.join(tmpRoot, 'README.txt'), 'hello');

async function runAsyncTests() {
  // ──────────────────────────────────────────────────────────────────────
  // scanForSnapshots
  // ──────────────────────────────────────────────────────────────────────
  console.log('\n── scanForSnapshots ──────────────────────────────────────');

  const all = await scanForSnapshots(tmpRoot);
  // Expected: 5 snapshots — 4 valid (01-2024, 06-2024, 09-2025, 12-2025) + 1 invalid (03-2025)
  // Bad-format folders (random-folder, 99-2025) are filtered out
  assertEq(all.length, 5, 'scanForSnapshots: 5 valid-format snapshots found');

  // Sorted descending by date — newest first
  assertEq(all[0].id, '12-2025', 'scanForSnapshots: newest is 12-2025');
  assertEq(all[1].id, '09-2025', 'scanForSnapshots: second is 09-2025');
  assertEq(all[2].id, '03-2025', 'scanForSnapshots: third is 03-2025 (invalid)');
  assertEq(all[3].id, '06-2024', 'scanForSnapshots: fourth is 06-2024');
  assertEq(all[4].id, '01-2024', 'scanForSnapshots: oldest is 01-2024');

  // Validity flags
  assertEq(all[0].isValid, true, '12-2025 isValid');
  assertEq(all[2].isValid, false, '03-2025 isInvalid (no prod subdir)');
  assertEq(all[2].exists, false, '03-2025 exists=false (no prod subdir)');

  // Labels
  assertEq(all[0].label, 'December 2025', '12-2025 label');
  assertEq(all[1].label, 'September 2025', '09-2025 label');
  assertEq(all[4].label, 'January 2024', '01-2024 label');

  // Path uses /prod
  assert(all[0].path.endsWith('/12-2025/prod'), '12-2025 path ends with /12-2025/prod');

  // Non-existent source path → empty array (warning logged)
  const missing = await scanForSnapshots(path.join(tmpRoot, 'does-not-exist'));
  assertEq(missing, [], 'non-existent source → empty array');

  // ──────────────────────────────────────────────────────────────────────
  // getMostRecentSnapshot
  // ──────────────────────────────────────────────────────────────────────
  console.log('\n── getMostRecentSnapshot ─────────────────────────────────');

  const recent = await getMostRecentSnapshot(tmpRoot);
  assert(recent !== null, 'getMostRecentSnapshot: not null');
  assertEq(recent?.id, '12-2025', 'most recent valid is 12-2025');
  assertEq(recent?.isValid, true, 'most recent is valid');

  // Empty directory → null
  const emptyDir = path.join(tmpRoot, 'empty');
  fs.mkdirSync(emptyDir, { recursive: true });
  const noneRecent = await getMostRecentSnapshot(emptyDir);
  assertEq(noneRecent, null, 'empty directory → null');

  // ──────────────────────────────────────────────────────────────────────
  // getSnapshotById
  // ──────────────────────────────────────────────────────────────────────
  console.log('\n── getSnapshotById ───────────────────────────────────────');

  const byId = await getSnapshotById(tmpRoot, '09-2025');
  assert(byId !== null, 'getSnapshotById: 09-2025 not null');
  assertEq(byId?.id, '09-2025', 'getSnapshotById: id matches');
  assertEq(byId?.label, 'September 2025', 'getSnapshotById: label');
  assertEq(byId?.isValid, true, 'getSnapshotById: isValid');
  assertEq(byId?.month, 9, 'getSnapshotById: month');
  assertEq(byId?.year, 2025, 'getSnapshotById: year');

  // Invalid format ID
  const badFormat = await getSnapshotById(tmpRoot, 'foo-bar');
  assertEq(badFormat, null, 'invalid format ID → null');

  // Out-of-range month
  const badMonth = await getSnapshotById(tmpRoot, '13-2025');
  assertEq(badMonth, null, 'out-of-range month → null');

  // Valid format but no prod subdirectory
  const noProd = await getSnapshotById(tmpRoot, '03-2025');
  assertEq(noProd, null, 'valid format but no prod subdir → null');

  // Valid format but folder doesn't exist at all
  const ghost = await getSnapshotById(tmpRoot, '07-2030');
  assertEq(ghost, null, 'non-existent snapshot → null');

  // ──────────────────────────────────────────────────────────────────────
  // getSnapshotsInRange
  // ──────────────────────────────────────────────────────────────────────
  console.log('\n── getSnapshotsInRange ───────────────────────────────────');

  // Range covering 06-2024 to 09-2025 → should include 06-2024 and 09-2025 (not 12-2025, not 01-2024)
  const range1 = await getSnapshotsInRange(
    tmpRoot,
    new Date(2024, 5, 1),  // June 1, 2024
    new Date(2025, 8, 1)   // Sept 1, 2025
  );
  assertEq(range1.length, 2, 'range 06-2024..09-2025: 2 valid');
  assertEq(range1.map(s => s.id), ['09-2025', '06-2024'], 'range: ids in date order (newest first)');

  // Range covering nothing
  const range2 = await getSnapshotsInRange(
    tmpRoot,
    new Date(2030, 0, 1),
    new Date(2031, 0, 1)
  );
  assertEq(range2.length, 0, 'future range: 0 results');

  // Range covering everything (only valid snapshots returned)
  const range3 = await getSnapshotsInRange(
    tmpRoot,
    new Date(2020, 0, 1),
    new Date(2030, 0, 1)
  );
  assertEq(range3.length, 4, 'broad range: 4 valid (excludes 03-2025 invalid)');
  // Should not include the invalid 03-2025
  assert(!range3.some(s => s.id === '03-2025'), 'range excludes invalid 03-2025');

  // Range filters by isValid
  for (const s of range3) {
    assertEq(s.isValid, true, `range result ${s.id} is valid`);
  }

  // ──────────────────────────────────────────────────────────────────────
  // getSnapshotStats
  // ──────────────────────────────────────────────────────────────────────
  console.log('\n── getSnapshotStats ──────────────────────────────────────');

  const stats = await getSnapshotStats(tmpRoot);
  assertEq(stats.total, 5, 'stats: total 5 (4 valid + 1 invalid)');
  assertEq(stats.valid, 4, 'stats: valid 4');
  assertEq(stats.invalid, 1, 'stats: invalid 1');
  assertEq(stats.newest?.id, '12-2025', 'stats: newest is 12-2025');
  assertEq(stats.oldest?.id, '01-2024', 'stats: oldest is 01-2024');
  assertEq(stats.yearCounts, { 2024: 2, 2025: 2 }, 'stats: yearCounts');

  // Empty directory stats
  const emptyStats = await getSnapshotStats(emptyDir);
  assertEq(emptyStats.total, 0, 'empty stats: total 0');
  assertEq(emptyStats.valid, 0, 'empty stats: valid 0');
  assertEq(emptyStats.invalid, 0, 'empty stats: invalid 0');
  assertEq(emptyStats.newest, null, 'empty stats: newest null');
  assertEq(emptyStats.oldest, null, 'empty stats: oldest null');
  assertEq(emptyStats.yearCounts, {}, 'empty stats: yearCounts {}');

  // Cleanup
  fs.removeSync(tmpRoot);
}

runAsyncTests()
  .then(() => {
    console.log(`\n──────────────────────────────────────────────────────────`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  })
  .catch((err) => {
    console.error('Test runner crashed:', err);
    try { fs.removeSync(tmpRoot); } catch {}
    process.exit(2);
  });
