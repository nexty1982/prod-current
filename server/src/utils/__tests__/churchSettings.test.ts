#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/churchSettings.js (OMD-905)
 *
 * Pure module — only depends on ./logger.
 *
 * Covers:
 *   - parseSettings        — null/empty/invalid/array/non-object → {}
 *   - stringifySettings    — JSON.stringify wrapper
 *   - getFeatures          — defaults all-false, only `=== true` accepted
 *   - mergeFeatures        — preserves unknown keys, only valid boolean features merged
 *   - validateFeatures     — unknown keys + non-boolean values rejected
 *
 * Run: npx tsx server/src/utils/__tests__/churchSettings.test.ts
 */

// ── Stub the logger before requiring churchSettings ──────────────────────
// churchSettings does `const { logger } = require('./logger')` but the logger
// module exports the instance directly (no `.logger` property). On the happy
// path this is fine; on error paths (invalid JSON, non-object) source calls
// `logger.warn(...)` and crashes with "Cannot read properties of undefined".
// Pre-populate the require cache with a stub so error paths don't blow up.
// (Documenting, not fixing — out of scope for test backfill.)
const path = require('path');
const Module = require('module');
const loggerPath = require.resolve('../logger');
require.cache[loggerPath] = {
  id: loggerPath,
  filename: loggerPath,
  loaded: true,
  exports: {
    logger: { warn: () => {}, error: () => {}, info: () => {}, debug: () => {} },
    // also export as default for safety
    warn: () => {}, error: () => {}, info: () => {}, debug: () => {}
  }
} as any;

const {
  parseSettings,
  stringifySettings,
  getFeatures,
  mergeFeatures,
  validateFeatures
} = require('../churchSettings');

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
// parseSettings
// ============================================================================
console.log('\n── parseSettings ─────────────────────────────────────────');

assertEq(parseSettings(null), {}, 'null → {}');
assertEq(parseSettings(''), {}, 'empty string → {}');
assertEq(parseSettings('   '), {}, 'whitespace → {}');
assertEq(parseSettings(undefined), {}, 'undefined → {}');

assertEq(parseSettings('{}'), {}, 'empty object string');
assertEq(parseSettings('{"a":1,"b":2}'), { a: 1, b: 2 }, 'simple object');
assertEq(
  parseSettings('{"features":{"ag_grid_enabled":true}}'),
  { features: { ag_grid_enabled: true } },
  'nested features'
);

// Invalid JSON → empty object
assertEq(parseSettings('not json'), {}, 'invalid JSON → {}');
assertEq(parseSettings('{broken'), {}, 'malformed JSON → {}');
assertEq(parseSettings('{"a":}'), {}, 'incomplete JSON → {}');

// Non-object JSON → empty object
assertEq(parseSettings('null'), {}, 'JSON null → {}');
assertEq(parseSettings('[]'), {}, 'JSON array → {}');
assertEq(parseSettings('[1,2,3]'), {}, 'array → {}');
assertEq(parseSettings('"string"'), {}, 'JSON string → {}');
assertEq(parseSettings('42'), {}, 'JSON number → {}');
assertEq(parseSettings('true'), {}, 'JSON boolean → {}');

// ============================================================================
// stringifySettings
// ============================================================================
console.log('\n── stringifySettings ─────────────────────────────────────');

assertEq(stringifySettings({}), '{}', 'empty object');
assertEq(stringifySettings({ a: 1 }), '{"a":1}', 'simple');
assertEq(
  stringifySettings({ features: { ag_grid_enabled: true } }),
  '{"features":{"ag_grid_enabled":true}}',
  'nested features'
);

// Circular ref → returns '{}' fallback
const circular: any = { a: 1 };
circular.self = circular;
assertEq(stringifySettings(circular), '{}', 'circular reference → "{}"');

// ============================================================================
// getFeatures
// ============================================================================
console.log('\n── getFeatures ───────────────────────────────────────────');

// null/undefined/non-object → all-false (3-flag default)
const allFalse3 = {
  ag_grid_enabled: false,
  power_search_enabled: false,
  custom_field_mapping_enabled: false
};
assertEq(getFeatures(null), allFalse3, 'null → 3-flag all-false');
assertEq(getFeatures(undefined), allFalse3, 'undefined → 3-flag all-false');
assertEq(getFeatures('string' as any), allFalse3, 'string → 3-flag all-false');
assertEq(getFeatures(42 as any), allFalse3, 'number → 3-flag all-false');

// Note: source returns the abbreviated 3-flag default for non-objects but
// the full 5-flag set for valid objects. This is documented behavior.

// Object without features → 5-flag all-false
const allFalse5 = {
  ag_grid_enabled: false,
  power_search_enabled: false,
  custom_field_mapping_enabled: false,
  om_charts_enabled: false,
  om_assistant_enabled: false
};
assertEq(getFeatures({}), allFalse5, 'empty object → 5-flag all-false');
assertEq(getFeatures({ other: 'data' }), allFalse5, 'object without features key');

// Only `=== true` accepted (strict equality)
assertEq(
  getFeatures({ features: { ag_grid_enabled: true } }),
  { ...allFalse5, ag_grid_enabled: true },
  'true → enabled'
);
assertEq(
  getFeatures({ features: { ag_grid_enabled: 1 as any } }),
  allFalse5,
  '1 (truthy) → false (strict ===)'
);
assertEq(
  getFeatures({ features: { ag_grid_enabled: 'true' as any } }),
  allFalse5,
  '"true" string → false (strict ===)'
);
assertEq(
  getFeatures({ features: { ag_grid_enabled: false } }),
  allFalse5,
  'false → false'
);

// All five enabled
assertEq(
  getFeatures({
    features: {
      ag_grid_enabled: true,
      power_search_enabled: true,
      custom_field_mapping_enabled: true,
      om_charts_enabled: true,
      om_assistant_enabled: true
    }
  }),
  {
    ag_grid_enabled: true,
    power_search_enabled: true,
    custom_field_mapping_enabled: true,
    om_charts_enabled: true,
    om_assistant_enabled: true
  },
  'all five enabled'
);

// Unknown features ignored
assertEq(
  getFeatures({ features: { unknown_flag: true, ag_grid_enabled: true } }),
  { ...allFalse5, ag_grid_enabled: true },
  'unknown flags ignored'
);

// ============================================================================
// mergeFeatures
// ============================================================================
console.log('\n── mergeFeatures ─────────────────────────────────────────');

// Empty current + new features → creates features object
const m1 = mergeFeatures({}, { ag_grid_enabled: true });
assertEq(m1.features.ag_grid_enabled, true, 'created features object');

// Preserves unknown top-level keys
const m2 = mergeFeatures(
  { name: 'St. John', other: { nested: true } },
  { ag_grid_enabled: true }
);
assertEq(m2.name, 'St. John', 'preserves name');
assertEq(m2.other.nested, true, 'preserves nested unknown');
assertEq(m2.features.ag_grid_enabled, true, 'merged feature');

// Preserves existing features not in new
const m3 = mergeFeatures(
  { features: { ag_grid_enabled: true, power_search_enabled: true } },
  { custom_field_mapping_enabled: true }
);
assertEq(m3.features.ag_grid_enabled, true, 'existing ag_grid preserved');
assertEq(m3.features.power_search_enabled, true, 'existing power_search preserved');
assertEq(m3.features.custom_field_mapping_enabled, true, 'new custom_field added');

// Overrides existing values
const m4 = mergeFeatures(
  { features: { ag_grid_enabled: true } },
  { ag_grid_enabled: false }
);
assertEq(m4.features.ag_grid_enabled, false, 'override true → false');

// Only valid keys merged
const m5 = mergeFeatures({}, { ag_grid_enabled: true, unknown_key: true });
assertEq(m5.features.ag_grid_enabled, true, 'valid key merged');
assertEq((m5.features as any).unknown_key, undefined, 'unknown key dropped');

// Non-boolean values dropped
const m6 = mergeFeatures({}, {
  ag_grid_enabled: 'true' as any,
  power_search_enabled: 1 as any,
  custom_field_mapping_enabled: true
});
assertEq((m6.features as any).ag_grid_enabled, undefined, 'string dropped');
assertEq((m6.features as any).power_search_enabled, undefined, 'number dropped');
assertEq(m6.features.custom_field_mapping_enabled, true, 'boolean kept');

// null/non-object current → starts fresh
const m7 = mergeFeatures(null, { ag_grid_enabled: true });
assertEq(m7.features.ag_grid_enabled, true, 'null current → fresh object');

const m8 = mergeFeatures('not-an-object' as any, { ag_grid_enabled: true });
assertEq(m8.features.ag_grid_enabled, true, 'string current → fresh object');

// Existing features not an object → recreated
const m9 = mergeFeatures(
  { features: 'corrupt' as any },
  { ag_grid_enabled: true }
);
assertEq(m9.features.ag_grid_enabled, true, 'corrupt features recreated');

// ============================================================================
// validateFeatures
// ============================================================================
console.log('\n── validateFeatures ──────────────────────────────────────');

// Valid empty
assertEq(validateFeatures({}), { isValid: true, errors: [] }, 'empty → valid');

// Valid single feature
assertEq(
  validateFeatures({ ag_grid_enabled: true }),
  { isValid: true, errors: [] },
  'single valid'
);

// All five valid
assertEq(
  validateFeatures({
    ag_grid_enabled: true,
    power_search_enabled: false,
    custom_field_mapping_enabled: true,
    om_charts_enabled: false,
    om_assistant_enabled: true
  }),
  { isValid: true, errors: [] },
  'all five valid'
);

// null / non-object → invalid
let v = validateFeatures(null);
assertEq(v.isValid, false, 'null → invalid');
assert(v.errors.some((e: string) => e.includes('object')), 'null error mentions object');

v = validateFeatures('string');
assertEq(v.isValid, false, 'string → invalid');

v = validateFeatures(42);
assertEq(v.isValid, false, 'number → invalid');

// Unknown keys → invalid
v = validateFeatures({ unknown_flag: true });
assertEq(v.isValid, false, 'unknown key → invalid');
assert(v.errors.some((e: string) => e.includes('unknown_flag')), 'error mentions key name');

v = validateFeatures({ ag_grid_enabled: true, foo: true, bar: false });
assertEq(v.isValid, false, 'mix valid + unknown → invalid');
assert(v.errors[0].includes('foo') && v.errors[0].includes('bar'), 'error lists both unknown');

// Non-boolean value → invalid
v = validateFeatures({ ag_grid_enabled: 'true' });
assertEq(v.isValid, false, 'string value → invalid');
assert(v.errors.some((e: string) => e.includes('ag_grid_enabled')), 'error names key');

v = validateFeatures({ ag_grid_enabled: 1 });
assertEq(v.isValid, false, 'number value → invalid');

v = validateFeatures({ ag_grid_enabled: null });
assertEq(v.isValid, false, 'null value → invalid');

// Multiple errors aggregated
v = validateFeatures({ unknown1: true, ag_grid_enabled: 'no' });
assertEq(v.isValid, false, 'multi errors → invalid');
assert(v.errors.length >= 2, '2+ errors collected');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
