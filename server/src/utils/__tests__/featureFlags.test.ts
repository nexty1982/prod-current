#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/featureFlags.js (OMD-888)
 *
 * Covers:
 *   - resolveFeatures            (pure: override > global > false fallback)
 *   - getGlobalFeatureDefaults   (with mock dbConn, cache TTL behavior)
 *   - getChurchFeatureOverrides  (with mock dbConn, JSON parse, errors)
 *   - getEffectiveFeatures       (composes the above)
 *   - clearCache
 *   - KNOWN_FEATURES constant
 *
 * The DB functions accept `dbConn` as a parameter so we mock with a
 * stub object whose `query()` returns canned results — no real DB needed.
 *
 * Run: npx tsx server/src/utils/__tests__/featureFlags.test.ts
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const featureFlags: any = require('../featureFlags');

const {
  KNOWN_FEATURES,
  resolveFeatures,
  getGlobalFeatureDefaults,
  getChurchFeatureOverrides,
  getEffectiveFeatures,
  clearCache,
} = featureFlags;

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
// KNOWN_FEATURES
// ============================================================================
console.log('\n── KNOWN_FEATURES ────────────────────────────────────────');

assertEq(
  KNOWN_FEATURES,
  [
    'ag_grid_enabled',
    'power_search_enabled',
    'custom_field_mapping_enabled',
    'om_charts_enabled',
    'om_assistant_enabled',
  ],
  '5 known features in expected order'
);

// All disabled defaults
const allDisabled: Record<string, boolean> = {};
KNOWN_FEATURES.forEach((f: string) => { allDisabled[f] = false; });

// All enabled
const allEnabled: Record<string, boolean> = {};
KNOWN_FEATURES.forEach((f: string) => { allEnabled[f] = true; });

// ============================================================================
// resolveFeatures
// ============================================================================
async function runAsyncTests() {
console.log('\n── resolveFeatures ───────────────────────────────────────');

// Empty global + empty override → all false
const r1 = resolveFeatures({ global: {}, override: {} });
assertEq(r1, allDisabled, 'empty global + override → all false');

// Global all true, no override → all true
const r2 = resolveFeatures({ global: allEnabled, override: {} });
assertEq(r2, allEnabled, 'global all true + no override → all true');

// Override true takes precedence over global false
const r3 = resolveFeatures({
  global: { ag_grid_enabled: false, power_search_enabled: false },
  override: { ag_grid_enabled: true },
});
assertEq(r3.ag_grid_enabled, true, 'override true beats global false');
assertEq(r3.power_search_enabled, false, 'global false preserved');
assertEq(r3.custom_field_mapping_enabled, false, 'absent feature → false fallback');

// Override false takes precedence over global true
const r4 = resolveFeatures({
  global: { ag_grid_enabled: true },
  override: { ag_grid_enabled: false },
});
assertEq(r4.ag_grid_enabled, false, 'override false beats global true');

// Override with non-boolean values is ignored (falls through to global)
const r5 = resolveFeatures({
  global: { ag_grid_enabled: true },
  override: { ag_grid_enabled: 'yes' as any }, // not boolean
});
assertEq(r5.ag_grid_enabled, true, 'non-boolean override falls through to global');

const r6 = resolveFeatures({
  global: { ag_grid_enabled: true },
  override: { ag_grid_enabled: 1 as any },
});
assertEq(r6.ag_grid_enabled, true, 'numeric override (1) ignored, falls through');

// Override with null ignored
const r7 = resolveFeatures({
  global: { ag_grid_enabled: true },
  override: { ag_grid_enabled: null as any },
});
assertEq(r7.ag_grid_enabled, true, 'null override ignored, falls through');

// Mixed: each feature handled independently
const r8 = resolveFeatures({
  global: {
    ag_grid_enabled: true,
    power_search_enabled: false,
    om_charts_enabled: true,
  },
  override: {
    ag_grid_enabled: false,           // overridden to false
    custom_field_mapping_enabled: true, // overridden to true (no global)
    // om_charts_enabled not overridden
  },
});
assertEq(r8.ag_grid_enabled, false, 'mixed: ag_grid override false');
assertEq(r8.power_search_enabled, false, 'mixed: power_search global false');
assertEq(r8.custom_field_mapping_enabled, true, 'mixed: custom_field override true');
assertEq(r8.om_charts_enabled, true, 'mixed: om_charts global true preserved');
assertEq(r8.om_assistant_enabled, false, 'mixed: om_assistant absent → false');

// Override with feature NOT in KNOWN_FEATURES is silently ignored
const r9 = resolveFeatures({
  global: {},
  override: { unknown_feature: true } as any,
});
assert(!('unknown_feature' in r9), 'unknown feature in override is filtered out');

// ============================================================================
// getGlobalFeatureDefaults — with mock dbConn
// ============================================================================
console.log('\n── getGlobalFeatureDefaults ──────────────────────────────');

// Helper: mock dbConn that returns canned rows
function mockDb(rows: any) {
  return {
    query: async (_sql: string) => rows,
  };
}

// Test 1: empty result → all features default to false
clearCache();
const g1 = await getGlobalFeatureDefaults(mockDb([[], []]));
assertEq(g1, allDisabled, 'empty rows → all false');

// Test 2: mysql2 [rows, fields] shape
clearCache();
const g2 = await getGlobalFeatureDefaults(
  mockDb([
    [
      { key_name: 'features.ag_grid_enabled', value: 'true' },
      { key_name: 'features.power_search_enabled', value: 'false' },
    ],
    [],
  ])
);
assertEq(g2.ag_grid_enabled, true, 'mysql2 shape: ag_grid true');
assertEq(g2.power_search_enabled, false, 'mysql2 shape: power_search false');
assertEq(g2.om_charts_enabled, false, 'mysql2 shape: missing → false');

// Test 3: plain array shape (some drivers)
clearCache();
const g3 = await getGlobalFeatureDefaults(
  mockDb([
    { key_name: 'features.om_charts_enabled', value: '1' },
    { key_name: 'features.om_assistant_enabled', value: 'yes' },
  ])
);
assertEq(g3.om_charts_enabled, true, 'plain array: numeric 1 → true');
assertEq(g3.om_assistant_enabled, true, 'plain array: yes → true');

// Test 4: { rows: [...] } shape
clearCache();
const g4 = await getGlobalFeatureDefaults({
  query: async () => ({
    rows: [
      { key_name: 'features.custom_field_mapping_enabled', value: 'TRUE' },
    ],
  }),
});
assertEq(g4.custom_field_mapping_enabled, true, '{rows} shape: TRUE → true');

// Test 5: parseBoolean accepts boolean true
clearCache();
const g5 = await getGlobalFeatureDefaults(
  mockDb([[{ key_name: 'features.ag_grid_enabled', value: true }], []])
);
assertEq(g5.ag_grid_enabled, true, 'parseBoolean accepts native boolean');

// Test 6: parseBoolean rejects "false"
clearCache();
const g6 = await getGlobalFeatureDefaults(
  mockDb([[{ key_name: 'features.ag_grid_enabled', value: 'false' }], []])
);
assertEq(g6.ag_grid_enabled, false, 'parseBoolean: "false" → false');

// Test 7: unknown feature key in DB is ignored
clearCache();
const g7 = await getGlobalFeatureDefaults(
  mockDb([
    [
      { key_name: 'features.fake_feature', value: 'true' },
      { key_name: 'features.ag_grid_enabled', value: 'true' },
    ],
    [],
  ])
);
assert(!('fake_feature' in g7), 'unknown feature filtered out');
assertEq(g7.ag_grid_enabled, true, 'real feature still loaded');

// Test 8: cache TTL — second call returns cached result without re-querying
clearCache();
let queryCount = 0;
const cachedDb = {
  query: async () => {
    queryCount++;
    return [[{ key_name: 'features.ag_grid_enabled', value: 'true' }], []];
  },
};
await getGlobalFeatureDefaults(cachedDb);
await getGlobalFeatureDefaults(cachedDb);
await getGlobalFeatureDefaults(cachedDb);
assertEq(queryCount, 1, 'cache: 3 calls within TTL → 1 query');

// Test 9: clearCache forces re-query
clearCache();
queryCount = 0;
await getGlobalFeatureDefaults(cachedDb);
clearCache();
await getGlobalFeatureDefaults(cachedDb);
assertEq(queryCount, 2, 'clearCache → next call re-queries');

// Test 10: query error returns all-disabled fallback
clearCache();
const errDb = {
  query: async () => { throw new Error('connection failed'); },
};
const gErr = await getGlobalFeatureDefaults(errDb);
assertEq(gErr, allDisabled, 'query error → all-disabled fallback');

// Test 11: result with non-array shape
clearCache();
const g11 = await getGlobalFeatureDefaults({
  query: async () => null,
});
assertEq(g11, allDisabled, 'null result → all-disabled');

// ============================================================================
// getChurchFeatureOverrides
// ============================================================================
console.log('\n── getChurchFeatureOverrides ─────────────────────────────');

// Helper: church row response (mysql2 shape: [rows, fields])
function mockChurchDb(rows: any[]) {
  return {
    query: async (_sql: string, _params: any) => [rows, []],
  };
}

// Test 1: church not found
const o1 = await getChurchFeatureOverrides(mockChurchDb([]), 999);
assertEq(o1, {}, 'church not found → empty overrides');

// Test 2: NULL settings → empty
const o2 = await getChurchFeatureOverrides(
  mockChurchDb([{ id: 1, name: 'St. X', settings: null }]),
  1
);
assertEq(o2, {}, 'NULL settings → empty');

// Test 3: empty string settings → empty
const o3 = await getChurchFeatureOverrides(
  mockChurchDb([{ id: 1, name: 'St. X', settings: '' }]),
  1
);
assertEq(o3, {}, 'empty settings → empty');

// Test 4: whitespace-only settings → empty
const o4 = await getChurchFeatureOverrides(
  mockChurchDb([{ id: 1, name: 'St. X', settings: '   ' }]),
  1
);
assertEq(o4, {}, 'whitespace-only settings → empty');

// Test 5: invalid JSON → empty (logged as warning)
const o5 = await getChurchFeatureOverrides(
  mockChurchDb([{ id: 1, name: 'St. X', settings: '{not valid json' }]),
  1
);
assertEq(o5, {}, 'invalid JSON → empty');

// Test 6: settings without features key → empty
const o6 = await getChurchFeatureOverrides(
  mockChurchDb([{ id: 1, name: 'St. X', settings: '{"foo": "bar"}' }]),
  1
);
assertEq(o6, {}, 'no features key → empty');

// Test 7: features but only known boolean values are kept
const o7 = await getChurchFeatureOverrides(
  mockChurchDb([
    {
      id: 1,
      name: 'St. X',
      settings: JSON.stringify({
        features: {
          ag_grid_enabled: true,
          power_search_enabled: false,
          fake_feature: true,           // unknown → filtered
          om_charts_enabled: 'yes' as any, // not boolean → filtered
          custom_field_mapping_enabled: 1 as any, // not boolean → filtered
          om_assistant_enabled: null as any, // not boolean → filtered
        },
      }),
    },
  ]),
  1
);
assertEq(o7.ag_grid_enabled, true, 'boolean true kept');
assertEq(o7.power_search_enabled, false, 'boolean false kept');
assert(!('fake_feature' in o7), 'unknown feature filtered');
assert(!('om_charts_enabled' in o7), 'string "yes" filtered');
assert(!('custom_field_mapping_enabled' in o7), 'numeric 1 filtered');
assert(!('om_assistant_enabled' in o7), 'null filtered');

// Test 8: all booleans valid
const o8 = await getChurchFeatureOverrides(
  mockChurchDb([
    {
      id: 1,
      name: 'St. X',
      settings: JSON.stringify({
        features: {
          ag_grid_enabled: true,
          power_search_enabled: true,
          custom_field_mapping_enabled: false,
          om_charts_enabled: true,
          om_assistant_enabled: false,
        },
      }),
    },
  ]),
  1
);
assertEq(
  o8,
  {
    ag_grid_enabled: true,
    power_search_enabled: true,
    custom_field_mapping_enabled: false,
    om_charts_enabled: true,
    om_assistant_enabled: false,
  },
  'all 5 features kept'
);

// Test 9: query throws → empty
const errChurchDb = {
  query: async () => { throw new Error('connection failed'); },
};
const o9 = await getChurchFeatureOverrides(errChurchDb, 1);
assertEq(o9, {}, 'query error → empty');

// ============================================================================
// getEffectiveFeatures (composition)
// ============================================================================
console.log('\n── getEffectiveFeatures ──────────────────────────────────');

// Combined dbConn that handles both queries
function makeCombinedDb(globalRows: any[], churchRows: any[]) {
  return {
    query: async (sql: string, _params?: any) => {
      if (sql.includes('settings')) {
        if (sql.includes('churches')) {
          return [churchRows, []];
        }
        return [globalRows, []];
      }
      return [[], []];
    },
  };
}

// Test 1: no overrides → effective = global
clearCache();
const ef1 = await getEffectiveFeatures(
  makeCombinedDb(
    [{ key_name: 'features.ag_grid_enabled', value: 'true' }],
    [{ id: 1, name: 'St. X', settings: null }]
  ),
  1
);
assertEq(ef1.global.ag_grid_enabled, true, 'effective: global ag_grid true');
assertEq(ef1.overrides, {}, 'effective: no overrides');
assertEq(ef1.effective.ag_grid_enabled, true, 'effective: ag_grid true');
assertEq(ef1.effective.power_search_enabled, false, 'effective: power_search default false');

// Test 2: override beats global
clearCache();
const ef2 = await getEffectiveFeatures(
  makeCombinedDb(
    [{ key_name: 'features.ag_grid_enabled', value: 'true' }],
    [
      {
        id: 1,
        name: 'St. X',
        settings: JSON.stringify({
          features: { ag_grid_enabled: false },
        }),
      },
    ]
  ),
  1
);
assertEq(ef2.global.ag_grid_enabled, true, 'global: ag_grid true');
assertEq(ef2.overrides.ag_grid_enabled, false, 'override: ag_grid false');
assertEq(ef2.effective.ag_grid_enabled, false, 'effective: override wins (false)');

// Test 3: result shape includes all 3 keys
assertEq(Object.keys(ef2).sort(), ['effective', 'global', 'overrides'], 'result has 3 keys');

// ============================================================================
// clearCache
// ============================================================================
console.log('\n── clearCache ────────────────────────────────────────────');

// Already tested above as part of caching tests; just verify it returns nothing
const clearResult = clearCache();
assertEq(clearResult, undefined, 'clearCache returns undefined');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
}

runAsyncTests().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(2);
});
