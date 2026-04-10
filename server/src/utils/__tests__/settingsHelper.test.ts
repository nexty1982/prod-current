#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/settingsHelper.js (OMD-908)
 *
 * Covers:
 *   - getEffectiveSetting   3-tier resolution: church → global → registry default
 *   - getEffectiveSetting   30s in-memory cache (hit, miss, expiry)
 *   - invalidateSettingCache   targeted + global key removal
 *
 * Strategy: pre-populate require.cache for ../config/db with a stub promisePool
 * whose .query() returns canned rows based on the SQL string. The stub also
 * counts query calls so we can verify the cache prevents repeat DB hits.
 *
 * Run: npx tsx server/src/utils/__tests__/settingsHelper.test.ts
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

// ── Stub the db module before requiring settingsHelper ───────────────────
// settingsHelper does `const { promisePool } = require('../config/db')`.
// We control the canned data via these maps; tests reset them as needed.
let queryCallCount = 0;
let churchOverrides: Record<string, Record<string | number, string>> = {};
let globalOverrides: Record<string, string> = {};
let registryDefaults: Record<string, string> = {};

const stubPool = {
  query: async (sql: string, params: any[]) => {
    queryCallCount++;
    const [key, scopeId] = params;

    if (sql.includes("scope = 'church'")) {
      const v = churchOverrides[key]?.[scopeId];
      return [v !== undefined ? [{ value: v }] : []];
    }
    if (sql.includes("scope = 'global'")) {
      const v = globalOverrides[key];
      return [v !== undefined ? [{ value: v }] : []];
    }
    if (sql.includes('settings_registry')) {
      const v = registryDefaults[key];
      return [v !== undefined ? [{ default_value: v }] : []];
    }
    return [[]];
  }
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { promisePool: stubPool }
} as any;

const {
  getEffectiveSetting,
  invalidateSettingCache,
  _settingsCache
} = require('../settingsHelper');

// Helper: clear cache + reset stub state between tests
function resetAll() {
  _settingsCache.clear();
  queryCallCount = 0;
  churchOverrides = {};
  globalOverrides = {};
  registryDefaults = {};
}

(async () => {
// ============================================================================
// 3-tier resolution
// ============================================================================
console.log('\n── getEffectiveSetting: 3-tier resolution ────────────────');

// 1. Church override wins
resetAll();
churchOverrides['key1'] = { 42: 'church-value' };
globalOverrides['key1'] = 'global-value';
registryDefaults['key1'] = 'default-value';
assertEq(
  await getEffectiveSetting('key1', { churchId: 42 }),
  'church-value',
  'church override wins'
);
assertEq(queryCallCount, 1, 'only 1 query (church hit, no fallthrough)');

// 2. Global override wins when no church override
resetAll();
globalOverrides['key2'] = 'global-value';
registryDefaults['key2'] = 'default-value';
assertEq(
  await getEffectiveSetting('key2', { churchId: 42 }),
  'global-value',
  'global override wins (no church)'
);
assertEq(queryCallCount, 2, '2 queries (church miss, global hit)');

// 3. Registry default when no overrides
resetAll();
registryDefaults['key3'] = 'default-value';
assertEq(
  await getEffectiveSetting('key3', { churchId: 42 }),
  'default-value',
  'registry default'
);
assertEq(queryCallCount, 3, '3 queries (church miss, global miss, registry hit)');

// 4. Unknown key → undefined
resetAll();
assertEq(
  await getEffectiveSetting('unknown', { churchId: 42 }),
  undefined,
  'unknown key → undefined'
);

// 5. No churchId → skip church query, start at global
resetAll();
globalOverrides['key5'] = 'global-only';
assertEq(
  await getEffectiveSetting('key5'),
  'global-only',
  'no churchId → global'
);
assertEq(queryCallCount, 1, '1 query (no church query attempted)');

resetAll();
registryDefaults['key6'] = 'default-only';
await getEffectiveSetting('key6');
assertEq(queryCallCount, 2, 'no churchId + no global → 2 queries (global, registry)');

// ============================================================================
// Cache behavior
// ============================================================================
console.log('\n── getEffectiveSetting: cache ────────────────────────────');

// Second call hits cache
resetAll();
churchOverrides['cached'] = { 42: 'value' };
await getEffectiveSetting('cached', { churchId: 42 });
const beforeSecond = queryCallCount;
await getEffectiveSetting('cached', { churchId: 42 });
assertEq(queryCallCount, beforeSecond, 'second call → cache hit, no new query');

// Different churchId → different cache key → new query
resetAll();
churchOverrides['shared'] = { 42: 'church42', 43: 'church43' };
const v42 = await getEffectiveSetting('shared', { churchId: 42 });
const v43 = await getEffectiveSetting('shared', { churchId: 43 });
assertEq(v42, 'church42', 'churchId=42 → church42');
assertEq(v43, 'church43', 'churchId=43 → church43');
assertEq(queryCallCount, 2, '2 queries (different cache keys)');

// undefined values are also cached
resetAll();
await getEffectiveSetting('missing', { churchId: 99 });
const afterFirst = queryCallCount;
await getEffectiveSetting('missing', { churchId: 99 });
assertEq(queryCallCount, afterFirst, 'undefined cached too — no repeat query');

// Cache TTL: manually expire a cached entry
resetAll();
registryDefaults['ttl'] = 'first';
await getEffectiveSetting('ttl');
const cacheKey = 'ttl:global';
const entry = _settingsCache.get(cacheKey);
assert(entry !== undefined, 'cache entry created');
assert(entry.expires > Date.now(), 'cache entry has future expiry');
// Force expiry
_settingsCache.set(cacheKey, { value: entry.value, expires: Date.now() - 1 });
registryDefaults['ttl'] = 'second';
const second = await getEffectiveSetting('ttl');
assertEq(second, 'second', 'expired entry refetches');

// ============================================================================
// invalidateSettingCache
// ============================================================================
console.log('\n── invalidateSettingCache ────────────────────────────────');

resetAll();
churchOverrides['inv'] = { 42: 'v1' };
await getEffectiveSetting('inv', { churchId: 42 });
assert(_settingsCache.has('inv:42'), 'cache key inv:42 set');

invalidateSettingCache('inv', 42);
assertEq(_settingsCache.has('inv:42'), false, 'inv:42 removed');

// invalidate also removes the global variant
resetAll();
globalOverrides['inv2'] = 'g';
await getEffectiveSetting('inv2');
assert(_settingsCache.has('inv2:global'), 'inv2:global set');

invalidateSettingCache('inv2');
assertEq(_settingsCache.has('inv2:global'), false, 'inv2:global removed (no scopeId)');

// invalidate with scopeId removes both scoped AND global
resetAll();
churchOverrides['both'] = { 7: 'churchval' };
globalOverrides['both'] = 'globalval';
await getEffectiveSetting('both', { churchId: 7 });
await getEffectiveSetting('both');
assert(_settingsCache.has('both:7'), 'both:7 set');
assert(_settingsCache.has('both:global'), 'both:global set');

invalidateSettingCache('both', 7);
assertEq(_settingsCache.has('both:7'), false, 'both:7 removed');
assertEq(_settingsCache.has('both:global'), false, 'both:global also removed');

// invalidate non-existent key is a no-op (does not throw)
resetAll();
let threw = false;
try {
  invalidateSettingCache('does-not-exist');
  invalidateSettingCache('does-not-exist', 42);
} catch (e) {
  threw = true;
}
assertEq(threw, false, 'invalidate non-existent → no throw');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
})();
