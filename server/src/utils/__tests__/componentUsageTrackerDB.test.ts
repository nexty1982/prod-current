#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/componentUsageTrackerDB.js (OMD-954)
 *
 * ComponentUsageTrackerDB — replaces the file-based ComponentUsageTracker
 * with a MariaDB-backed version. Stubs `../config/db-compat` via require.cache
 * BEFORE requiring the SUT.
 *
 * Coverage:
 *   - constructor               cacheTimeout = 2min, summaryCache Map
 *   - logComponentUsage         INSERT INTO component_usage with right params;
 *                               calls updateSummaryTables; clears cache for
 *                               componentId + 'all_components'; swallows errors
 *   - updateSummaryTables       beginTransaction → 3 inserts → commit; rollback
 *                               on error; release connection in both paths
 *   - getUsageStatistics        cache hit; transforms rows; topComponents +
 *                               recentActivity attached; fallback {topComponents,
 *                               recentActivity} on error
 *   - getBatchComponentUsageStatus
 *                               empty input → {}; full cache hit (no query);
 *                               partial cache (only uncached fetched); status
 *                               'active' (≤1d), 'inactive' (≤30d), 'unused'
 *                               (>30d or never); caches results; fallback on
 *                               error returns 'unused' for all
 *   - getComponentUsageStatus   delegates to batch with one id
 *   - getUsageBreakdown         with componentId; without; fallback []
 *   - getTopComponents          with days; without days; fallback []
 *   - clearCache                empties Map
 *   - migrateFromJSON           reads JSON, iterates components.users, calls
 *                               logComponentUsage for each; returns count
 *
 * Run from server/: npx tsx src/utils/__tests__/componentUsageTrackerDB.test.ts
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

// ── db-compat stub ───────────────────────────────────────────────────
type Query = { sql: string; params: any[] };
const queries: Query[] = [];
let queryReturns: any[] = [];          // queue of [rows] returns
let queryErrorOnIndex: number | null = null;

function resetDb() {
  queries.length = 0;
  queryReturns = [];
  queryErrorOnIndex = null;
  txnState.commits = 0;
  txnState.rollbacks = 0;
  txnState.releases = 0;
  txnState.beginThrows = false;
  txnState.queryThrows = false;
}

function nextReturn(): any {
  return queryReturns.length > 0 ? queryReturns.shift() : [[]];
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queries.push({ sql, params });
    if (queryErrorOnIndex !== null && queries.length - 1 === queryErrorOnIndex) {
      throw new Error('pool query failure');
    }
    return nextReturn();
  },
};

const txnState = {
  commits: 0,
  rollbacks: 0,
  releases: 0,
  beginThrows: false,
  queryThrows: false,
};

const fakeConn = {
  beginTransaction: async () => {
    if (txnState.beginThrows) throw new Error('begin failure');
  },
  query: async (sql: string, params: any[] = []) => {
    queries.push({ sql, params });
    if (txnState.queryThrows) throw new Error('conn query failure');
    return [[]];
  },
  commit: async () => { txnState.commits++; },
  rollback: async () => { txnState.rollbacks++; },
  release: () => { txnState.releases++; },
};

const fakePromisePool = {
  getConnection: async () => fakeConn,
};

const dbCompatPath = require.resolve('../../config/db-compat');
require.cache[dbCompatPath] = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: {
    getAppPool: () => fakePool,
    promisePool: fakePromisePool,
    pool: fakePool,
    getAuthPool: () => fakePool,
    getOmaiPool: () => fakePool,
  },
} as any;

const ComponentUsageTrackerDB = require('../componentUsageTrackerDB');

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

async function main() {

// ============================================================================
// Constructor
// ============================================================================
console.log('\n── constructor ───────────────────────────────────────────');

{
  const t = new ComponentUsageTrackerDB();
  assertEq(t.cacheTimeout, 120000, 'cacheTimeout = 2 minutes (120000 ms)');
  assert(t.summaryCache instanceof Map, 'summaryCache is a Map');
  assertEq(t.summaryCache.size, 0, 'summaryCache initially empty');
}

// ============================================================================
// logComponentUsage
// ============================================================================
console.log('\n── logComponentUsage ─────────────────────────────────────');

{
  const t = new ComponentUsageTrackerDB();
  // Pre-populate cache to verify it gets cleared
  t.summaryCache.set('comp-1', { data: 'cached', timestamp: Date.now() });
  t.summaryCache.set('all_components', { data: 'cached', timestamp: Date.now() });

  resetDb();
  await t.logComponentUsage('comp-1', 'user-9', 'access', {
    sessionId: 'sess-1',
    ipAddress: '1.2.3.4',
    userAgent: 'Mozilla/5.0',
  });

  // 4 queries total: 1 INSERT into component_usage + 3 in updateSummaryTables
  assertEq(queries.length, 4, '4 queries issued');
  const insert = queries[0];
  assert(insert.sql.includes('INSERT INTO component_usage'), 'first query inserts usage');
  assertEq(insert.params[0], 'comp-1', 'param[0] = componentId');
  assertEq(insert.params[1], 'user-9', 'param[1] = userId');
  assertEq(insert.params[2], 'access', 'param[2] = action');
  assert(insert.params[3] instanceof Date, 'param[3] is timestamp Date');
  assertEq(insert.params[4], 'sess-1', 'param[4] = sessionId');
  assertEq(insert.params[5], '1.2.3.4', 'param[5] = ipAddress');
  assertEq(insert.params[6], 'Mozilla/5.0', 'param[6] = userAgent');

  // Cache should have been cleared for both keys
  assertEq(t.summaryCache.has('comp-1'), false, 'comp-1 cache cleared');
  assertEq(t.summaryCache.has('all_components'), false, 'all_components cache cleared');
}

// Default args (anonymous, access, no metadata)
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  await t.logComponentUsage('comp-2');
  const insert = queries[0];
  assertEq(insert.params[0], 'comp-2', 'componentId');
  assertEq(insert.params[1], 'anonymous', 'default userId = anonymous');
  assertEq(insert.params[2], 'access', 'default action = access');
  assertEq(insert.params[4], null, 'sessionId defaults null');
  assertEq(insert.params[5], null, 'ipAddress defaults null');
  assertEq(insert.params[6], null, 'userAgent defaults null');
}

// Error swallowing
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  queryErrorOnIndex = 0; // first query throws
  quiet();
  let threw = false;
  try {
    await t.logComponentUsage('comp-x', 'u');
  } catch {
    threw = true;
  }
  loud();
  assertEq(threw, false, 'logComponentUsage swallows errors (no throw)');
}

// ============================================================================
// updateSummaryTables — transaction lifecycle
// ============================================================================
console.log('\n── updateSummaryTables ───────────────────────────────────');

{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  const ts = new Date('2026-04-10T12:00:00.000Z');
  await t.updateSummaryTables('comp-3', 'user-1', 'access', ts);
  // 3 inserts via getAppPool().query (NOT connection.query — implementation
  // bug, but we test what the code does)
  assertEq(queries.length, 3, '3 summary inserts');
  assert(queries[0].sql.includes('component_usage_summary'), 'first: usage_summary');
  assert(queries[1].sql.includes('component_action_summary'), 'second: action_summary');
  assert(queries[2].sql.includes('user_component_summary'), 'third: user_component_summary');
  assertEq(txnState.commits, 1, 'commit called once');
  assertEq(txnState.rollbacks, 0, 'no rollback');
  assertEq(txnState.releases, 1, 'connection released');
}

// Rollback on error
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  queryErrorOnIndex = 1; // second insert throws
  let threw = false;
  try {
    await t.updateSummaryTables('comp-4', 'user-2', 'access', new Date());
  } catch {
    threw = true;
  }
  assertEq(threw, true, 're-throws on error');
  assertEq(txnState.commits, 0, 'no commit on error');
  assertEq(txnState.rollbacks, 1, 'rollback called');
  assertEq(txnState.releases, 1, 'connection released even on error');
}

// ============================================================================
// getUsageStatistics
// ============================================================================
console.log('\n── getUsageStatistics ────────────────────────────────────');

// Cache hit (no DB query)
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  const cached = { foo: 'bar' };
  t.summaryCache.set('all_components', { data: cached, timestamp: Date.now() });
  const r = await t.getUsageStatistics();
  assertEq(r as any, cached, 'returns cached data');
  assertEq(queries.length, 0, 'no DB query on cache hit');
}

// Stale cache → re-query
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  // Cache that is older than 2 minutes
  t.summaryCache.set('all_components', { data: { stale: true }, timestamp: Date.now() - 200000 });
  // Queue 4 returns: summaryRows, actionRows, getTopComponents, getUsageBreakdown
  queryReturns.push([[
    { component_id: 'a', first_used: new Date('2026-04-01'), last_used: new Date('2026-04-10'), total_accesses: 5, unique_users: 2 },
  ]]);
  queryReturns.push([[
    { component_id: 'a', action: 'access', count: 5 },
  ]]);
  queryReturns.push([[]]);  // getTopComponents
  queryReturns.push([[]]);  // getUsageBreakdown
  const r = await t.getUsageStatistics();
  assertEq(r.a.totalAccesses, 5, 'totalAccesses');
  assertEq(r.a.uniqueUsers, 2, 'uniqueUsers');
  assertEq(r.a.actions.access, 5, 'actions.access');
  assert(Array.isArray(r.topComponents), 'topComponents attached');
  assert(Array.isArray(r.recentActivity), 'recentActivity attached');
  // Should now be cached
  assert(t.summaryCache.has('all_components'), 'result cached');
}

// Error → fallback
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  queryErrorOnIndex = 0;
  quiet();
  const r = await t.getUsageStatistics();
  loud();
  assertEq(r.topComponents, [], 'fallback topComponents []');
  assertEq(r.recentActivity, [], 'fallback recentActivity []');
}

// ============================================================================
// getBatchComponentUsageStatus
// ============================================================================
console.log('\n── getBatchComponentUsageStatus ──────────────────────────');

// Empty input
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  const r = await t.getBatchComponentUsageStatus([]);
  assertEq(r, {}, 'empty array → {}');
  assertEq(queries.length, 0, 'no query');
  const r2 = await t.getBatchComponentUsageStatus(null);
  assertEq(r2, {}, 'null → {}');
}

// Full cache hit
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  t.summaryCache.set('a', { data: { status: 'active' }, timestamp: Date.now() });
  t.summaryCache.set('b', { data: { status: 'unused' }, timestamp: Date.now() });
  const r = await t.getBatchComponentUsageStatus(['a', 'b']);
  assertEq(r.a.status, 'active', 'a from cache');
  assertEq(r.b.status, 'unused', 'b from cache');
  assertEq(queries.length, 0, 'no query when all cached');
}

// Status: active (≤1 day)
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  const recent = new Date();
  recent.setHours(recent.getHours() - 1); // 1 hour ago
  queryReturns.push([[
    { component_id: 'a', first_used: recent, last_used: recent, total_accesses: 10, unique_users: 3 },
  ]]);
  const r = await t.getBatchComponentUsageStatus(['a']);
  assertEq(r.a.status, 'active', 'recent → active');
  assertEq(r.a.totalAccesses, 10, 'totalAccesses');
  assertEq(r.a.uniqueUsers, 3, 'uniqueUsers');
  assertEq(r.a.daysSinceLastUse, 0, 'daysSinceLastUse = 0');
}

// Status: inactive (>1 day, ≤30 days)
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  const fifteenDays = new Date();
  fifteenDays.setDate(fifteenDays.getDate() - 15);
  queryReturns.push([[
    { component_id: 'a', first_used: fifteenDays, last_used: fifteenDays, total_accesses: 5, unique_users: 1 },
  ]]);
  const r = await t.getBatchComponentUsageStatus(['a']);
  assertEq(r.a.status, 'inactive', '15d ago → inactive');
  assertEq(r.a.daysSinceLastUse, 15, 'daysSinceLastUse 15');
}

// Status: unused (>30 days)
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  const fortyDays = new Date();
  fortyDays.setDate(fortyDays.getDate() - 40);
  queryReturns.push([[
    { component_id: 'a', first_used: fortyDays, last_used: fortyDays, total_accesses: 2, unique_users: 1 },
  ]]);
  const r = await t.getBatchComponentUsageStatus(['a']);
  assertEq(r.a.status, 'unused', '40d ago → unused');
}

// Status: unused (no row at all)
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  queryReturns.push([[]]); // no summary row
  const r = await t.getBatchComponentUsageStatus(['ghost']);
  assertEq(r.ghost.status, 'unused', 'missing → unused');
  assertEq(r.ghost.lastUsed, null, 'lastUsed null');
  assertEq(r.ghost.totalAccesses, 0, 'totalAccesses 0');
  assertEq(r.ghost.daysSinceLastUse, null, 'daysSinceLastUse null');
  assertEq(r.ghost.uniqueUsers, 0, 'uniqueUsers 0');
}

// Partial cache: only uncached fetched
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  t.summaryCache.set('cached', { data: { status: 'active', cached: true }, timestamp: Date.now() });
  queryReturns.push([[]]);
  const r = await t.getBatchComponentUsageStatus(['cached', 'fresh']);
  assertEq(r.cached.status, 'active', 'cached returned from cache');
  assertEq((r.cached as any).cached, true, 'cached marker present');
  assertEq(r.fresh.status, 'unused', 'fresh fetched and unused');
  assertEq(queries.length, 1, 'only one query — for uncached id');
  assert(queries[0].params.includes('fresh'), 'param includes fresh');
  assert(!queries[0].params.includes('cached'), 'param does NOT include cached');
}

// Error → fallback for all uncached
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  queryErrorOnIndex = 0;
  quiet();
  const r = await t.getBatchComponentUsageStatus(['a', 'b']);
  loud();
  assertEq(r.a.status, 'unused', 'a fallback unused');
  assertEq(r.b.status, 'unused', 'b fallback unused');
  assertEq(r.a.totalAccesses, 0, 'a totalAccesses 0');
}

// Caching: subsequent call within TTL returns from cache
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  const recent = new Date();
  recent.setHours(recent.getHours() - 2);
  queryReturns.push([[
    { component_id: 'a', first_used: recent, last_used: recent, total_accesses: 1, unique_users: 1 },
  ]]);
  await t.getBatchComponentUsageStatus(['a']);
  assertEq(queries.length, 1, 'first call queries DB');
  // Second call — should hit cache
  await t.getBatchComponentUsageStatus(['a']);
  assertEq(queries.length, 1, 'second call hits cache (still 1 query)');
}

// ============================================================================
// getComponentUsageStatus (delegates)
// ============================================================================
console.log('\n── getComponentUsageStatus ───────────────────────────────');

{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  queryReturns.push([[
    { component_id: 'x', first_used: new Date(), last_used: new Date(), total_accesses: 3, unique_users: 1 },
  ]]);
  const r = await t.getComponentUsageStatus('x');
  assertEq(r.status, 'active', 'delegated to batch — active');
  assertEq(r.totalAccesses, 3, 'totalAccesses');
}

// Missing component → fallback object
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  queryReturns.push([[]]);
  const r = await t.getComponentUsageStatus('missing');
  assertEq(r.status, 'unused', 'missing → unused');
  assertEq(r.totalAccesses, 0, 'totalAccesses 0');
}

// ============================================================================
// getUsageBreakdown
// ============================================================================
console.log('\n── getUsageBreakdown ─────────────────────────────────────');

// Without componentId
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  queryReturns.push([[
    { date: '2026-04-10', accesses: 5, unique_users: 2, unique_components: 3 },
  ]]);
  const r = await t.getUsageBreakdown();
  assertEq(r.length, 1, 'one row');
  assertEq(r[0].accesses, 5, 'accesses');
  assertEq(r[0].uniqueUsers, 2, 'uniqueUsers');
  assertEq(r[0].uniqueComponents, 3, 'uniqueComponents');
  assertEq(queries[0].params, [30], 'default 30 days');
  assert(!queries[0].sql.includes('AND component_id'), 'no component_id filter when none given');
}

// With componentId
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  queryReturns.push([[]]);
  await t.getUsageBreakdown('my-comp', 7);
  assertEq(queries[0].params, ['my-comp', 7], 'params include componentId + days');
  assert(queries[0].sql.includes('component_id = ?'), 'sql filters component_id');
}

// Error → []
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  queryErrorOnIndex = 0;
  quiet();
  const r = await t.getUsageBreakdown();
  loud();
  assertEq(r, [], 'fallback []');
}

// ============================================================================
// getTopComponents
// ============================================================================
console.log('\n── getTopComponents ──────────────────────────────────────');

// Default
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  const lu = new Date('2026-04-10T00:00:00.000Z');
  queryReturns.push([[
    { component_id: 'a', total_accesses: 100, unique_users: 5, last_used: lu },
    { component_id: 'b', total_accesses: 50, unique_users: 3, last_used: null },
  ]]);
  const r = await t.getTopComponents();
  assertEq(r.length, 2, '2 rows');
  assertEq(r[0].componentId, 'a', 'first componentId');
  assertEq(r[0].totalAccesses, 100, 'totalAccesses');
  assertEq(r[0].lastUsed, lu.toISOString(), 'lastUsed ISO');
  assertEq(r[1].lastUsed, null, 'null lastUsed preserved');
  assertEq(queries[0].params, [10], 'default limit = 10');
  assert(!queries[0].sql.includes('DATE_SUB'), 'no DATE_SUB when days null');
}

// With days
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  queryReturns.push([[]]);
  await t.getTopComponents(5, 30);
  assertEq(queries[0].params, [30, 5], 'params [days, limit]');
  assert(queries[0].sql.includes('DATE_SUB'), 'includes DATE_SUB filter');
}

// Error → []
{
  const t = new ComponentUsageTrackerDB();
  resetDb();
  queryErrorOnIndex = 0;
  quiet();
  const r = await t.getTopComponents();
  loud();
  assertEq(r, [], 'fallback []');
}

// ============================================================================
// clearCache
// ============================================================================
console.log('\n── clearCache ────────────────────────────────────────────');

{
  const t = new ComponentUsageTrackerDB();
  t.summaryCache.set('a', { data: 'x', timestamp: Date.now() });
  t.summaryCache.set('b', { data: 'y', timestamp: Date.now() });
  assertEq(t.summaryCache.size, 2, '2 items before clear');
  quiet();
  t.clearCache();
  loud();
  assertEq(t.summaryCache.size, 0, 'cache empty after clear');
}

// ============================================================================
// migrateFromJSON
// ============================================================================
console.log('\n── migrateFromJSON ───────────────────────────────────────');

{
  // Create a tiny temp JSON file
  const fsReal = require('fs');
  const path = require('path');
  const tmpFile = path.join('/tmp', `migrate-test-${Date.now()}.json`);
  fsReal.writeFileSync(tmpFile, JSON.stringify({
    'comp-a': { users: { 'u1': {}, 'u2': {} } },
    'comp-b': { users: { 'u1': {} } },
    'comp-c': { /* no users */ },
  }));

  const t = new ComponentUsageTrackerDB();
  resetDb();
  quiet();
  const count = await t.migrateFromJSON(tmpFile);
  loud();
  assertEq(count, 3, '3 records migrated (2 + 1, comp-c skipped)');
  // Each migration call → 4 queries (logComponentUsage)
  assertEq(queries.length, 12, '12 total queries (3 × 4)');

  fsReal.unlinkSync(tmpFile);
}

// migrateFromJSON error → throws
{
  const t = new ComponentUsageTrackerDB();
  quiet();
  let threw = false;
  try {
    await t.migrateFromJSON('/tmp/does-not-exist-zzz.json');
  } catch {
    threw = true;
  }
  loud();
  assertEq(threw, true, 'throws on missing file');
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
