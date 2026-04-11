#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/restoreHistory.ts (OMD-950)
 *
 * Pure JSON-file-backed audit log. Named exports:
 *   logRestore, getHistory, getFileHistory, getUserHistory,
 *   getStatistics, clearHistory, exportToCSV
 *
 * Strategy: stub `fs-extra` via require.cache BEFORE requiring the SUT.
 * The stub uses an in-memory Map<string, any> to simulate JSON storage.
 *
 * Run from server/: npx tsx src/utils/__tests__/restoreHistory.test.ts
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

// ── fs-extra stub ────────────────────────────────────────────────────
const memFs = new Map<string, any>();
const memDirs = new Set<string>();

function resetFs() {
  memFs.clear();
  memDirs.clear();
}

const fsExtraStub = {
  pathExists: async (p: string) => memFs.has(p),
  ensureDir: async (p: string) => { memDirs.add(p); },
  readJson: async (p: string) => {
    if (!memFs.has(p)) {
      const e: any = new Error(`ENOENT: ${p}`);
      e.code = 'ENOENT';
      throw e;
    }
    // Deep clone so callers can't mutate stored copy
    return JSON.parse(JSON.stringify(memFs.get(p)));
  },
  writeJson: async (p: string, data: any, _opts?: any) => {
    memFs.set(p, JSON.parse(JSON.stringify(data)));
  },
};

// Install stub BEFORE requiring SUT
const fsExtraPath = require.resolve('fs-extra');
require.cache[fsExtraPath] = {
  id: fsExtraPath,
  filename: fsExtraPath,
  loaded: true,
  exports: fsExtraStub,
} as any;

const {
  logRestore,
  getHistory,
  getFileHistory,
  getUserHistory,
  getStatistics,
  clearHistory,
  exportToCSV,
} = require('../restoreHistory');

// Silence module's own console output
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

function mkEntry(overrides: any = {}): any {
  return {
    user: 'alice',
    userEmail: 'alice@x.com',
    relPath: 'src/foo.ts',
    sourcePath: '/snap/foo.ts',
    targetPath: '/repo/src/foo.ts',
    sourceType: 'local',
    snapshotId: 'snap-1',
    fileSize: 1024,
    success: true,
    error: null,
    ...overrides,
  };
}

async function main() {

// ============================================================================
// initializeHistoryFile (via logRestore)
// ============================================================================
console.log('\n── initializeHistoryFile ─────────────────────────────────');

resetFs();
quiet();
await logRestore(mkEntry());
loud();
{
  // After first call, exactly one file should exist
  assertEq(memFs.size, 1, 'history file created on first logRestore');
  // ensureDir should have been called for the dirname
  assert(memDirs.size >= 1, 'ensureDir called');
  const stored = Array.from(memFs.values())[0];
  assertEq(stored.version, '1.0.0', 'version 1.0.0');
  assertEq(stored.totalRestores, 1, 'totalRestores = 1');
  assertEq(stored.entries.length, 1, '1 entry');
  assert(typeof stored.createdAt === 'string', 'createdAt set');
}

// Second call should NOT re-initialize (file already exists)
resetFs();
quiet();
await logRestore(mkEntry());
const sizeAfterFirst = memFs.size;
await logRestore(mkEntry());
loud();
{
  assertEq(memFs.size, sizeAfterFirst, 'no extra files created on subsequent calls');
  const stored = Array.from(memFs.values())[0];
  assertEq(stored.totalRestores, 2, 'totalRestores incremented');
  assertEq(stored.entries.length, 2, 'entries appended');
}

// ============================================================================
// logRestore — id format, prepend, swallow errors
// ============================================================================
console.log('\n── logRestore ────────────────────────────────────────────');

resetFs();
quiet();
await logRestore(mkEntry({ relPath: 'first.ts' }));
await logRestore(mkEntry({ relPath: 'second.ts' }));
await logRestore(mkEntry({ relPath: 'third.ts' }));
loud();
{
  const stored = Array.from(memFs.values())[0];
  assertEq(stored.entries.length, 3, '3 entries logged');
  // Newest first (unshift)
  assertEq(stored.entries[0].relPath, 'third.ts', 'newest first');
  assertEq(stored.entries[1].relPath, 'second.ts', 'middle entry');
  assertEq(stored.entries[2].relPath, 'first.ts', 'oldest last');
  // ID format: restore-<timestamp>-<random>
  assert(/^restore-\d+-[a-z0-9]+$/.test(stored.entries[0].id), 'id matches restore-<ts>-<rand>');
  // timestamp is ISO 8601
  assert(/^\d{4}-\d{2}-\d{2}T/.test(stored.entries[0].timestamp), 'timestamp is ISO');
  // Original entry fields preserved
  assertEq(stored.entries[0].user, 'alice', 'user preserved');
  assertEq(stored.entries[0].fileSize, 1024, 'fileSize preserved');
  // lastUpdated reflects newest entry
  assertEq(stored.lastUpdated, stored.entries[0].timestamp, 'lastUpdated = newest entry');
}

// IDs are unique even for rapid successive calls
resetFs();
quiet();
for (let i = 0; i < 10; i++) await logRestore(mkEntry({ relPath: `f${i}.ts` }));
loud();
{
  const stored = Array.from(memFs.values())[0];
  const ids = stored.entries.map((e: any) => e.id);
  const uniqueIds = new Set(ids);
  assertEq(uniqueIds.size, 10, 'all 10 IDs unique');
}

// 1000-entry cap
resetFs();
quiet();
// Pre-seed history file with 1000 entries
const historyPath = Array.from(memFs.keys())[0] || '';
await logRestore(mkEntry({ relPath: 'seed.ts' })); // ensure file exists
const filePath = Array.from(memFs.keys())[0];
const seeded: any = {
  version: '1.0.0',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastUpdated: '2026-01-01T00:00:00.000Z',
  totalRestores: 1000,
  entries: Array.from({ length: 1000 }, (_, i) => ({
    id: `restore-seed-${i}`,
    timestamp: '2026-01-01T00:00:00.000Z',
    user: 'seed',
    userEmail: null,
    relPath: `seed-${i}.ts`,
    sourcePath: '/s',
    targetPath: '/t',
    sourceType: 'local',
    snapshotId: null,
    fileSize: 0,
    success: true,
    error: null,
  })),
};
memFs.set(filePath, seeded);
await logRestore(mkEntry({ relPath: 'overflow.ts' }));
loud();
{
  const stored = memFs.get(filePath);
  assertEq(stored.entries.length, 1000, 'capped at 1000 entries');
  assertEq(stored.entries[0].relPath, 'overflow.ts', 'newest entry kept (at front)');
  // Oldest seed entry (seed-999) should be dropped
  const ids = stored.entries.map((e: any) => e.relPath);
  assert(!ids.includes('seed-999'), 'oldest entry dropped');
  assertEq(stored.totalRestores, 1001, 'totalRestores still increments past cap');
}

// logRestore swallows errors (writeJson failure)
resetFs();
const brokenWrite = {
  ...fsExtraStub,
  writeJson: async () => { throw new Error('disk full'); },
};
require.cache[fsExtraPath]!.exports = brokenWrite;
quiet();
let threw = false;
try {
  await logRestore(mkEntry());
} catch (e) { threw = true; }
loud();
assertEq(threw, false, 'logRestore swallows write errors');
// Restore stub
require.cache[fsExtraPath]!.exports = fsExtraStub;

// readHistory error fallback (corrupted JSON simulated via readJson throw)
resetFs();
const corruptRead = {
  ...fsExtraStub,
  pathExists: async () => true, // pretend file exists
  readJson: async () => { throw new Error('parse error'); },
};
require.cache[fsExtraPath]!.exports = corruptRead;
quiet();
await logRestore(mkEntry({ relPath: 'after-corrupt.ts' }));
loud();
{
  // After corrupt read, logRestore proceeds with empty history baseline
  // The writeJson is the original stub still pointing to memFs, so let's verify
  // it fell through. Actually corruptRead has writeJson from fsExtraStub spread.
  // The history written should have totalRestores=1 and 1 entry.
  const stored = Array.from(memFs.values())[0];
  assertEq(stored.totalRestores, 1, 'after corrupt read, baseline 1');
  assertEq(stored.entries.length, 1, '1 entry written despite read failure');
  assertEq(stored.entries[0].relPath, 'after-corrupt.ts', 'correct entry');
}
require.cache[fsExtraPath]!.exports = fsExtraStub;

// ============================================================================
// getHistory — pagination
// ============================================================================
console.log('\n── getHistory ────────────────────────────────────────────');

resetFs();
quiet();
for (let i = 0; i < 25; i++) await logRestore(mkEntry({ relPath: `p${i}.ts` }));
loud();

{
  // Default limit = 50, offset = 0
  const result = await getHistory();
  assertEq(result.total, 25, 'total = 25');
  assertEq(result.limit, 50, 'default limit 50');
  assertEq(result.offset, 0, 'default offset 0');
  assertEq(result.entries.length, 25, '25 entries (under limit)');
}

{
  const result = await getHistory(5, 0);
  assertEq(result.entries.length, 5, 'limit 5');
  // Newest first — last logged was p24
  assertEq(result.entries[0].relPath, 'p24.ts', 'first page starts with newest');
}

{
  const result = await getHistory(5, 5);
  assertEq(result.entries.length, 5, 'second page limit 5');
  assertEq(result.entries[0].relPath, 'p19.ts', 'second page starts at offset 5');
}

{
  const result = await getHistory(10, 20);
  assertEq(result.entries.length, 5, 'partial last page');
  assertEq(result.total, 25, 'total still 25');
  assertEq(result.limit, 10, 'limit echoed');
  assertEq(result.offset, 20, 'offset echoed');
}

{
  const result = await getHistory(10, 100);
  assertEq(result.entries.length, 0, 'offset past end → empty');
  assertEq(result.total, 25, 'total preserved');
}

// ============================================================================
// getFileHistory
// ============================================================================
console.log('\n── getFileHistory ────────────────────────────────────────');

resetFs();
quiet();
await logRestore(mkEntry({ relPath: 'foo.ts' }));
await logRestore(mkEntry({ relPath: 'bar.ts' }));
await logRestore(mkEntry({ relPath: 'foo.ts' }));
await logRestore(mkEntry({ relPath: 'baz.ts' }));
await logRestore(mkEntry({ relPath: 'foo.ts' }));
loud();

{
  const fooHistory = await getFileHistory('foo.ts');
  assertEq(fooHistory.length, 3, '3 foo.ts entries');
  assert(fooHistory.every((e: any) => e.relPath === 'foo.ts'), 'all are foo.ts');
}

{
  const barHistory = await getFileHistory('bar.ts');
  assertEq(barHistory.length, 1, '1 bar.ts entry');
}

{
  const noneHistory = await getFileHistory('missing.ts');
  assertEq(noneHistory.length, 0, 'no matches → empty array');
}

// ============================================================================
// getUserHistory — matches user OR userEmail
// ============================================================================
console.log('\n── getUserHistory ────────────────────────────────────────');

resetFs();
quiet();
await logRestore(mkEntry({ user: 'alice', userEmail: 'alice@x.com', relPath: 'a1.ts' }));
await logRestore(mkEntry({ user: 'bob',   userEmail: 'bob@x.com',   relPath: 'b1.ts' }));
await logRestore(mkEntry({ user: 'alice', userEmail: 'alice@x.com', relPath: 'a2.ts' }));
await logRestore(mkEntry({ user: null,    userEmail: 'alice@x.com', relPath: 'a3.ts' }));
await logRestore(mkEntry({ user: 'carol', userEmail: null,          relPath: 'c1.ts' }));
loud();

{
  // Match by user
  const aliceByName = await getUserHistory('alice');
  assertEq(aliceByName.length, 2, 'alice matched by user');
  assert(aliceByName.every((e: any) => e.user === 'alice'), 'all have user=alice');
}

{
  // Match by email (string equals user OR userEmail)
  const aliceByEmail = await getUserHistory('alice@x.com');
  assertEq(aliceByEmail.length, 3, 'matches both user and userEmail fields (3 total)');
}

{
  const carol = await getUserHistory('carol');
  assertEq(carol.length, 1, 'carol matched by user (userEmail null)');
}

{
  const none = await getUserHistory('zzz');
  assertEq(none.length, 0, 'no match → empty');
}

// ============================================================================
// getStatistics
// ============================================================================
console.log('\n── getStatistics ─────────────────────────────────────────');

resetFs();
quiet();
await logRestore(mkEntry({ user: 'alice', relPath: 'f1.ts', success: true,  sourceType: 'local',  snapshotId: 'snap-A' }));
await logRestore(mkEntry({ user: 'alice', relPath: 'f2.ts', success: true,  sourceType: 'local',  snapshotId: 'snap-A' }));
await logRestore(mkEntry({ user: 'bob',   relPath: 'f1.ts', success: false, sourceType: 'remote', snapshotId: 'snap-B' }));
await logRestore(mkEntry({ user: null, userEmail: null, relPath: 'f3.ts', success: true, sourceType: 'remote', snapshotId: null }));
loud();

{
  const stats = await getStatistics();
  assertEq(stats.totalRestores, 4, 'totalRestores = 4');
  assertEq(stats.successfulRestores, 3, '3 successful');
  assertEq(stats.failedRestores, 1, '1 failed');
  assertEq(stats.uniqueFiles, 3, '3 unique files (f1, f2, f3)');
  // uniqueUsers maps each entry to (user || userEmail) and filters nulls.
  //   #1 alice/alice@x.com → 'alice'
  //   #2 alice/alice@x.com → 'alice'
  //   #3 bob/bob@x.com     → 'bob'
  //   #4 null/null         → null (filtered)
  // Set: {alice, bob} → size 2
  assertEq(stats.uniqueUsers, 2, 'uniqueUsers = 2 (null filtered, alice deduped)');
  assertEq(stats.restoresBySourceType.local, 2, 'local count');
  assertEq(stats.restoresBySourceType.remote, 2, 'remote count');
  assertEq(stats.restoresBySnapshot['snap-A'], 2, 'snap-A: 2 restores');
  assertEq(stats.restoresBySnapshot['snap-B'], 1, 'snap-B: 1 restore');
  assert(!('null' in stats.restoresBySnapshot), 'null snapshotId not counted');
  assert(stats.lastRestore !== null, 'lastRestore present');
  // lastRestore is entries[0] = newest = the 4th call (relPath f3.ts)
  assertEq(stats.lastRestore?.relPath, 'f3.ts', 'lastRestore is newest entry');
}

// uniqueUsers — re-verify with explicit case
{
  // The previous block's expectation of 3 was wrong — fix it.
  // Just re-assert the correct value here as a sanity check.
  const stats = await getStatistics();
  // alice appears twice (counted once), bob once, null filtered → 2
  assertEq(stats.uniqueUsers, 2, 'uniqueUsers actually = 2 (null filtered)');
}

// Empty statistics
resetFs();
{
  const stats = await getStatistics();
  assertEq(stats.totalRestores, 0, 'empty: totalRestores 0');
  assertEq(stats.successfulRestores, 0, 'empty: successful 0');
  assertEq(stats.failedRestores, 0, 'empty: failed 0');
  assertEq(stats.uniqueFiles, 0, 'empty: uniqueFiles 0');
  assertEq(stats.uniqueUsers, 0, 'empty: uniqueUsers 0');
  assertEq(stats.lastRestore, null, 'empty: lastRestore null');
  assertEq(stats.restoresBySourceType.local, 0, 'empty: local 0');
  assertEq(stats.restoresBySourceType.remote, 0, 'empty: remote 0');
  assertEq(stats.restoresBySnapshot, {}, 'empty: snapshot map empty');
}

// ============================================================================
// clearHistory
// ============================================================================
console.log('\n── clearHistory ──────────────────────────────────────────');

resetFs();
quiet();
await logRestore(mkEntry());
await logRestore(mkEntry());
await logRestore(mkEntry());
await clearHistory();
loud();
{
  const stored = Array.from(memFs.values())[0];
  assertEq(stored.entries.length, 0, 'entries cleared');
  assertEq(stored.totalRestores, 0, 'totalRestores reset to 0');
  assertEq(stored.version, '1.0.0', 'version preserved');
  assert(typeof stored.lastUpdated === 'string', 'lastUpdated set');
}

// After clear, getHistory returns empty
{
  const result = await getHistory();
  assertEq(result.total, 0, 'total = 0 after clear');
  assertEq(result.entries.length, 0, 'entries empty after clear');
}

// ============================================================================
// exportToCSV — pure function
// ============================================================================
console.log('\n── exportToCSV ───────────────────────────────────────────');

// Empty array
{
  const csv = exportToCSV([]);
  // Header row only
  assertEq(csv.split('\n').length, 1, 'empty entries → header only');
  assert(csv.startsWith('Timestamp,User,Email,File Path,'), 'header row starts correctly');
  assert(csv.includes('Success,Error'), 'header has all columns');
}

// Single entry
{
  const csv = exportToCSV([{
    id: 'r-1',
    timestamp: '2026-04-10T12:00:00.000Z',
    user: 'alice',
    userEmail: 'alice@x.com',
    relPath: 'foo.ts',
    sourcePath: '/s/foo.ts',
    targetPath: '/t/foo.ts',
    sourceType: 'local',
    snapshotId: 'snap-1',
    fileSize: 1024,
    success: true,
    error: null,
  }]);
  const lines = csv.split('\n');
  assertEq(lines.length, 2, '2 lines (header + 1 row)');
  assert(lines[1].includes('"alice"'), 'user quoted');
  assert(lines[1].includes('"alice@x.com"'), 'email quoted');
  assert(lines[1].includes('"foo.ts"'), 'relPath quoted');
  assert(lines[1].includes('"local"'), 'sourceType');
  assert(lines[1].includes('"snap-1"'), 'snapshotId');
  assert(lines[1].includes('"1024"'), 'fileSize as string');
  assert(lines[1].includes('"Yes"'), 'success → Yes');
}

// Failed entry maps to "No"
{
  const csv = exportToCSV([{
    id: 'r-2', timestamp: '2026-04-10T12:00:00.000Z',
    user: null, userEmail: null,
    relPath: 'bad.ts', sourcePath: '/s', targetPath: '/t',
    sourceType: 'remote', snapshotId: null, fileSize: 0,
    success: false, error: 'permission denied',
  }]);
  const lines = csv.split('\n');
  assert(lines[1].includes('"No"'), 'failed → No');
  assert(lines[1].includes('"permission denied"'), 'error included');
  // Null user → empty string
  assert(lines[1].includes('"",""'), 'null user/email → empty quoted strings');
}

// Quote escaping (double-double-quote)
{
  const csv = exportToCSV([{
    id: 'r-3', timestamp: '2026-04-10T12:00:00.000Z',
    user: 'a"lice', userEmail: 'a@b.com',
    relPath: 'has"quote.ts', sourcePath: '/s', targetPath: '/t',
    sourceType: 'local', snapshotId: null, fileSize: 1,
    success: true, error: 'msg with "quote"',
  }]);
  // Embedded quotes should be doubled
  assert(csv.includes('"a""lice"'), 'user quotes escaped');
  assert(csv.includes('"has""quote.ts"'), 'relPath quotes escaped');
  assert(csv.includes('"msg with ""quote"""'), 'error quotes escaped');
}

// Multiple entries
{
  const csv = exportToCSV([
    {
      id: 'r-1', timestamp: '2026-04-10T12:00:00.000Z',
      user: 'a', userEmail: null, relPath: 'f1', sourcePath: '/s', targetPath: '/t',
      sourceType: 'local', snapshotId: null, fileSize: 1, success: true, error: null,
    },
    {
      id: 'r-2', timestamp: '2026-04-10T13:00:00.000Z',
      user: 'b', userEmail: null, relPath: 'f2', sourcePath: '/s', targetPath: '/t',
      sourceType: 'remote', snapshotId: null, fileSize: 2, success: false, error: null,
    },
  ]);
  const lines = csv.split('\n');
  assertEq(lines.length, 3, 'header + 2 rows');
  assert(lines[1].includes('"a"'), 'first row has user a');
  assert(lines[2].includes('"b"'), 'second row has user b');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
