#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/componentUsageTracker.js (OMD-948)
 *
 * ComponentUsageTracker singleton — module exports `new ComponentUsageTracker()`.
 * File-backed JSON usage log with caching, atomic write, and corruption recovery.
 *
 * Coverage:
 *   - constructor             defaults (cacheTimeout = 5min)
 *   - loadUsageData           cache hit; ENOENT → creates file; corrupted file
 *                             (empty/missing braces/mismatched braces) → backup
 *                             + reset; recovery failure → throws
 *   - saveUsageData           validates non-object; atomic write (temp + rename);
 *                             invalid temp file → cleanup + throw
 *   - logComponentUsage       initializes new component; updates lastUsed +
 *                             totalAccesses; tracks actions + users; clears cache
 *   - getComponentUsageStatus unused; today=active; <=1d=active; <=30d=inactive;
 *                             >30d=unused
 *   - getUsageStatistics      total/active/inactive/unused tallies; topComponents
 *                             sorted desc; recentActivity within 24h
 *   - cleanOldUsageData       deletes records older than maxAge; default 365d
 *   - formatTimeSinceLastUse  static: 'Never used', 'Just now', m/h/d/w/mo/y
 *
 * Strategy: stub fs.promises via Object.defineProperty BEFORE require.
 * In-memory file content map; readFile returns stored content; writeFile + rename
 * update the map.
 *
 * Run from server/: npx tsx src/utils/__tests__/componentUsageTracker.test.ts
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

// ── fs.promises stub ─────────────────────────────────────────────────
type Call = { method: string; args: any[] };
const fsCalls: Call[] = [];
const fileMap = new Map<string, string>();
let readFileError: any = null;
let writeFileError: any = null;
let renameError: any = null;
let copyFileError: any = null;

function resetFs() {
  fsCalls.length = 0;
  fileMap.clear();
  readFileError = null;
  writeFileError = null;
  renameError = null;
  copyFileError = null;
}

const fs = require('fs');
const origFsPromises = fs.promises;
const fsPromisesStub = {
  readFile: async (p: string, enc?: string) => {
    fsCalls.push({ method: 'readFile', args: [p, enc] });
    if (readFileError) throw readFileError;
    if (!fileMap.has(p)) {
      const e: any = new Error('ENOENT');
      e.code = 'ENOENT';
      throw e;
    }
    return fileMap.get(p)!;
  },
  writeFile: async (p: string, data: string, enc?: any) => {
    fsCalls.push({ method: 'writeFile', args: [p, data, enc] });
    if (writeFileError) throw writeFileError;
    fileMap.set(p, data);
    return undefined;
  },
  mkdir: async (p: string, opts: any) => {
    fsCalls.push({ method: 'mkdir', args: [p, opts] });
    return undefined;
  },
  rename: async (a: string, b: string) => {
    fsCalls.push({ method: 'rename', args: [a, b] });
    if (renameError) throw renameError;
    if (fileMap.has(a)) {
      fileMap.set(b, fileMap.get(a)!);
      fileMap.delete(a);
    }
    return undefined;
  },
  copyFile: async (a: string, b: string) => {
    fsCalls.push({ method: 'copyFile', args: [a, b] });
    if (copyFileError) throw copyFileError;
    if (fileMap.has(a)) fileMap.set(b, fileMap.get(a)!);
    return undefined;
  },
  unlink: async (p: string) => {
    fsCalls.push({ method: 'unlink', args: [p] });
    fileMap.delete(p);
    return undefined;
  },
};
Object.defineProperty(fs, 'promises', {
  value: fsPromisesStub,
  configurable: true,
  writable: true,
});

const tracker = require('../componentUsageTracker');

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// Reset tracker's in-memory cache between tests
function resetCache() {
  tracker.usageCache = null;
  tracker.cacheExpiry = null;
}

const PATH = tracker.usageFilePath;

async function main() {

// ============================================================================
// constructor
// ============================================================================
console.log('\n── constructor ───────────────────────────────────────────');
assert(typeof tracker.usageFilePath === 'string', 'usageFilePath set');
assert(tracker.usageFilePath.endsWith('componentUsage.json'), 'path ends with componentUsage.json');
assertEq(tracker.cacheTimeout, 5 * 60 * 1000, 'cacheTimeout = 5 min');

// ============================================================================
// formatTimeSinceLastUse (static)
// ============================================================================
console.log('\n── formatTimeSinceLastUse (static) ───────────────────────');
const ComponentUsageTracker = tracker.constructor;

assertEq(ComponentUsageTracker.formatTimeSinceLastUse(null), 'Never used', 'null');
assertEq(ComponentUsageTracker.formatTimeSinceLastUse(undefined), 'Never used', 'undefined');
assertEq(ComponentUsageTracker.formatTimeSinceLastUse(''), 'Never used', 'empty');

const now = Date.now();
const minutesAgo = (m: number) => new Date(now - m * 60 * 1000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();
const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString();

assertEq(ComponentUsageTracker.formatTimeSinceLastUse(minutesAgo(0.5)), 'Just now', '< 1 min → Just now');
assertEq(ComponentUsageTracker.formatTimeSinceLastUse(minutesAgo(5)), '5m ago', '5 minutes');
assertEq(ComponentUsageTracker.formatTimeSinceLastUse(minutesAgo(45)), '45m ago', '45 minutes');
assertEq(ComponentUsageTracker.formatTimeSinceLastUse(hoursAgo(2)), '2h ago', '2 hours');
assertEq(ComponentUsageTracker.formatTimeSinceLastUse(hoursAgo(23)), '23h ago', '23 hours');
assertEq(ComponentUsageTracker.formatTimeSinceLastUse(daysAgo(3)), '3d ago', '3 days');
assertEq(ComponentUsageTracker.formatTimeSinceLastUse(daysAgo(10)), '1w ago', '10 days → 1w');
assertEq(ComponentUsageTracker.formatTimeSinceLastUse(daysAgo(60)), '2mo ago', '60 days → 2mo');
assertEq(ComponentUsageTracker.formatTimeSinceLastUse(daysAgo(400)), '1y ago', '400 days → 1y');

// ============================================================================
// loadUsageData
// ============================================================================
console.log('\n── loadUsageData ─────────────────────────────────────────');

// ENOENT → creates empty file
resetFs();
resetCache();
quiet();
{
  const data = await tracker.loadUsageData();
  loud();
  assertEq(data, {}, 'returns empty object');
  assert(fileMap.has(PATH), 'file created');
  assertEq(fileMap.get(PATH)!.trim(), '{}', 'empty {} written');
}

// Cache hit (within 5 min)
resetFs();
resetCache();
fileMap.set(PATH, JSON.stringify({ foo: { totalAccesses: 5 } }));
{
  await tracker.loadUsageData(); // populate cache
  const callsBefore = fsCalls.length;
  const data2 = await tracker.loadUsageData(); // should hit cache
  assertEq(fsCalls.length, callsBefore, 'cache hit: no additional fs calls');
  assertEq(data2.foo.totalAccesses, 5, 'cached data returned');
}

// Cache expiry → re-reads
resetFs();
resetCache();
fileMap.set(PATH, JSON.stringify({ a: { totalAccesses: 1 } }));
{
  await tracker.loadUsageData();
  // Force expiry
  tracker.cacheExpiry = Date.now() - 1000;
  fileMap.set(PATH, JSON.stringify({ b: { totalAccesses: 99 } }));
  const data2 = await tracker.loadUsageData();
  assert(data2.b !== undefined, 'reload after expiry');
}

// Empty file → corruption recovery
resetFs();
resetCache();
fileMap.set(PATH, '');
quiet();
{
  const data = await tracker.loadUsageData();
  loud();
  assertEq(data, {}, 'empty file → empty object after recovery');
  // Should have backed up
  const backupCall = fsCalls.find(c => c.method === 'copyFile');
  assert(backupCall !== undefined, 'corruption backup attempted');
}

// Missing braces (just text) → corruption recovery
resetFs();
resetCache();
fileMap.set(PATH, 'not-json');
quiet();
{
  const data = await tracker.loadUsageData();
  loud();
  assertEq(data, {}, 'invalid → empty after recovery');
}

// Mismatched braces
resetFs();
resetCache();
fileMap.set(PATH, '{{{ broken }');
quiet();
{
  const data = await tracker.loadUsageData();
  loud();
  assertEq(data, {}, 'mismatched braces → empty after recovery');
}

// Recovery failure (saveUsageData throws) → outer throw
resetFs();
resetCache();
fileMap.set(PATH, ''); // corrupt
writeFileError = new Error('write failed');
quiet();
{
  let caught: any = null;
  try {
    await tracker.loadUsageData();
  } catch (e) {
    caught = e;
  }
  loud();
  assert(caught !== null, 'recovery failure throws');
  assert(caught.message.includes('Usage data corrupted'), 'wrapped error');
}
writeFileError = null;

// ============================================================================
// saveUsageData
// ============================================================================
console.log('\n── saveUsageData ─────────────────────────────────────────');

// Non-object → throws
resetFs();
resetCache();
quiet();
{
  let caught: any = null;
  try {
    await tracker.saveUsageData(null);
  } catch (e) {
    caught = e;
  }
  loud();
  assert(caught !== null, 'null throws');
  assert(caught.message.includes('Invalid usage data'), 'invalid data error');
}

resetFs();
resetCache();
quiet();
{
  let caught: any = null;
  try {
    await tracker.saveUsageData('string' as any);
  } catch (e) {
    caught = e;
  }
  loud();
  assert(caught !== null, 'string throws');
}

// Atomic write: writes temp, then renames
resetFs();
resetCache();
{
  await tracker.saveUsageData({ comp1: { totalAccesses: 3 } });
  const writeCall = fsCalls.find(c => c.method === 'writeFile');
  assert(writeCall !== undefined, 'writeFile called');
  assert((writeCall!.args[0] as string).endsWith('.tmp'), 'writes to .tmp');
  const renameCall = fsCalls.find(c => c.method === 'rename');
  assert(renameCall !== undefined, 'rename called');
  assertEq(renameCall!.args[1], PATH, 'rename target = real path');
  // Final file present
  assert(fileMap.has(PATH), 'final file in place');
  // Cache updated
  assertEq(tracker.usageCache.comp1.totalAccesses, 3, 'cache updated');
}

// ============================================================================
// logComponentUsage
// ============================================================================
console.log('\n── logComponentUsage ─────────────────────────────────────');

resetFs();
resetCache();
fileMap.set(PATH, JSON.stringify({}));
quiet();
await tracker.logComponentUsage('comp-A', 'user-1', 'view');
loud();
{
  const stored = JSON.parse(fileMap.get(PATH)!);
  assert(stored['comp-A'] !== undefined, 'comp-A initialized');
  assertEq(stored['comp-A'].totalAccesses, 1, 'totalAccesses = 1');
  assertEq(stored['comp-A'].actions.view, 1, 'view action recorded');
  assert(stored['comp-A'].users['user-1'] !== undefined, 'user tracked');
  assertEq(stored['comp-A'].users['user-1'].accessCount, 1, 'user accessCount = 1');
  assert(stored['comp-A'].firstUsed !== undefined, 'firstUsed set');
  assert(stored['comp-A'].lastUsed !== undefined, 'lastUsed set');
}

// Second access — increments existing
resetCache();
fileMap.set(PATH, JSON.stringify({}));
quiet();
await tracker.logComponentUsage('c', 'u1', 'view');
resetCache();
await tracker.logComponentUsage('c', 'u1', 'toggle');
resetCache();
await tracker.logComponentUsage('c', 'u2', 'view');
loud();
{
  const stored = JSON.parse(fileMap.get(PATH)!);
  assertEq(stored.c.totalAccesses, 3, 'three total accesses');
  assertEq(stored.c.actions.view, 2, '2 view actions');
  assertEq(stored.c.actions.toggle, 1, '1 toggle action');
  assertEq(Object.keys(stored.c.users).length, 2, '2 unique users');
  assertEq(stored.c.users.u1.accessCount, 2, 'u1 accessCount = 2');
  assertEq(stored.c.users.u2.accessCount, 1, 'u2 accessCount = 1');
}

// Default args
resetFs();
resetCache();
fileMap.set(PATH, JSON.stringify({}));
quiet();
await tracker.logComponentUsage('cd');
loud();
{
  const stored = JSON.parse(fileMap.get(PATH)!);
  assert(stored.cd.users.anonymous !== undefined, 'default user = anonymous');
  assertEq(stored.cd.actions.access, 1, 'default action = access');
}

// Errors swallowed (don't throw)
resetFs();
resetCache();
fileMap.set(PATH, JSON.stringify({}));
writeFileError = new Error('disk full');
quiet();
{
  // Should NOT throw
  await tracker.logComponentUsage('xx');
  loud();
  assert(true, 'logComponentUsage swallows errors');
}
writeFileError = null;

// ============================================================================
// getComponentUsageStatus
// ============================================================================
console.log('\n── getComponentUsageStatus ───────────────────────────────');

// Unused (component not in data)
resetFs();
resetCache();
fileMap.set(PATH, JSON.stringify({}));
{
  const s = await tracker.getComponentUsageStatus('nope');
  assertEq(s.status, 'unused', 'missing → unused');
  assertEq(s.lastUsed, null, 'no lastUsed');
  assertEq(s.totalAccesses, 0, '0 accesses');
  assertEq(s.daysSinceLastUse, null, 'null daysSinceLastUse');
}

// Used today → active
resetFs();
resetCache();
fileMap.set(PATH, JSON.stringify({
  recent: {
    firstUsed: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
    totalAccesses: 5,
    actions: { view: 5 },
    users: { u1: {}, u2: {} },
  },
}));
{
  const s = await tracker.getComponentUsageStatus('recent');
  assertEq(s.status, 'active', 'today → active');
  assertEq(s.totalAccesses, 5, 'totalAccesses');
  assertEq(s.uniqueUsers, 2, '2 unique users');
}

// 5 days ago → inactive
resetFs();
resetCache();
fileMap.set(PATH, JSON.stringify({
  mid: {
    firstUsed: daysAgo(10),
    lastUsed: daysAgo(5),
    totalAccesses: 1,
    actions: {},
    users: {},
  },
}));
{
  const s = await tracker.getComponentUsageStatus('mid');
  assertEq(s.status, 'inactive', '5d ago → inactive');
  assertEq(s.daysSinceLastUse, 5, 'days = 5');
}

// 60 days ago → unused
resetFs();
resetCache();
fileMap.set(PATH, JSON.stringify({
  old: {
    firstUsed: daysAgo(100),
    lastUsed: daysAgo(60),
    totalAccesses: 1,
    actions: {},
    users: {},
  },
}));
{
  const s = await tracker.getComponentUsageStatus('old');
  assertEq(s.status, 'unused', '60d ago → unused');
}

// ============================================================================
// getUsageStatistics
// ============================================================================
console.log('\n── getUsageStatistics ────────────────────────────────────');

resetFs();
resetCache();
fileMap.set(PATH, JSON.stringify({
  c1: { firstUsed: daysAgo(1), lastUsed: new Date().toISOString(), totalAccesses: 100, actions: {}, users: {} },
  c2: { firstUsed: daysAgo(50), lastUsed: daysAgo(50), totalAccesses: 5, actions: {}, users: {} },
  c3: { firstUsed: daysAgo(10), lastUsed: daysAgo(5), totalAccesses: 50, actions: {}, users: {} },
}));
{
  const stats = await tracker.getUsageStatistics();
  assertEq(stats.total, 3, 'total = 3');
  assertEq(stats.totalAccesses, 155, 'totalAccesses summed');
  assertEq(stats.active, 1, '1 active');
  assertEq(stats.inactive, 1, '1 inactive');
  assertEq(stats.unused, 1, '1 unused (>30d)');
  assertEq(stats.topComponents.length, 3, 'topComponents has 3');
  assertEq(stats.topComponents[0].id, 'c1', 'top = c1 (100 accesses)');
  assertEq(stats.topComponents[1].id, 'c3', 'second = c3 (50)');
  assertEq(stats.topComponents[2].id, 'c2', 'third = c2 (5)');
  // Recent activity = used in last 24h
  assert(stats.recentActivity.length >= 1, 'recentActivity has c1');
  assertEq(stats.recentActivity[0].id, 'c1', 'recent = c1');
}

// ============================================================================
// cleanOldUsageData
// ============================================================================
console.log('\n── cleanOldUsageData ─────────────────────────────────────');

resetFs();
resetCache();
fileMap.set(PATH, JSON.stringify({
  fresh: { firstUsed: daysAgo(5), lastUsed: daysAgo(5), totalAccesses: 1, actions: {}, users: {} },
  old1: { firstUsed: daysAgo(400), lastUsed: daysAgo(400), totalAccesses: 1, actions: {}, users: {} },
  old2: { firstUsed: daysAgo(500), lastUsed: daysAgo(500), totalAccesses: 1, actions: {}, users: {} },
}));
quiet();
{
  const count = await tracker.cleanOldUsageData(365);
  loud();
  assertEq(count, 2, 'cleaned 2 old records');
  const stored = JSON.parse(fileMap.get(PATH)!);
  assert(stored.fresh !== undefined, 'fresh kept');
  assertEq(stored.old1, undefined, 'old1 removed');
  assertEq(stored.old2, undefined, 'old2 removed');
}

// Default daysToKeep = 365
resetFs();
resetCache();
fileMap.set(PATH, JSON.stringify({
  recent: { firstUsed: daysAgo(100), lastUsed: daysAgo(100), totalAccesses: 1, actions: {}, users: {} },
}));
quiet();
{
  const count = await tracker.cleanOldUsageData();
  loud();
  assertEq(count, 0, 'within 365 default → 0 removed');
}

// Error path → returns 0
resetFs();
resetCache();
readFileError = new Error('boom');
quiet();
{
  const count = await tracker.cleanOldUsageData();
  loud();
  assertEq(count, 0, 'error → 0');
}
readFileError = null;

// ============================================================================
// Restore + summary
// ============================================================================
Object.defineProperty(fs, 'promises', {
  value: origFsPromises,
  configurable: true,
  writable: true,
});

console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main()

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
