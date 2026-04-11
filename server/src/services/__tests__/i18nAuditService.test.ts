#!/usr/bin/env npx tsx
/**
 * Unit tests for services/i18nAuditService.js (OMD-1010)
 *
 * Covers:
 *   - extractPlaceholders       empty/null, no placeholders, single, multiple
 *                                (sorted), underscores, non-matching braces
 *   - runAudit                  unsupported lang throws, missing keys detection,
 *                                orphaned keys, identical-to-english (length > 3
 *                                gate), placeholder mismatches (missing/extra/
 *                                reordered), includePublicPageScan=false skips
 *                                fs, summary counts, return shape
 *   - runAuditAll               iterates over all SUPPORTED_LANGS
 *   - SUPPORTED_LANGS           exports
 *
 * Run: npx tsx server/src/services/__tests__/i18nAuditService.test.ts
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

// ── Stub config/db BEFORE requiring SUT ─────────────────────────────────
type Call = { sql: string; params: any[] };
const poolCalls: Call[] = [];
type Route = { match: RegExp; rows: any[]; result?: any };
const poolRoutes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    poolCalls.push({ sql, params });
    for (const r of poolRoutes) {
      if (r.match.test(sql)) {
        return [r.rows, r.result ?? {}] as any;
      }
    }
    return [[], {}] as any;
  },
};

function resetPool() {
  poolCalls.length = 0;
  poolRoutes.length = 0;
}

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

const svc = require('../i18nAuditService');
const {
  extractPlaceholders,
  runAudit,
  runAuditAll,
  SUPPORTED_LANGS,
} = svc;

async function main() {

// ============================================================================
// extractPlaceholders
// ============================================================================
console.log('\n── extractPlaceholders ───────────────────────────────────');

assertEq(extractPlaceholders(null), [], 'null → []');
assertEq(extractPlaceholders(undefined), [], 'undefined → []');
assertEq(extractPlaceholders(''), [], 'empty → []');
assertEq(extractPlaceholders('No placeholders here'), [], 'no matches → []');
assertEq(extractPlaceholders('Hello {name}'), ['{name}'], 'single placeholder');
assertEq(
  extractPlaceholders('{year} — {name} ({count})'),
  ['{count}', '{name}', '{year}'],
  'sorted alphabetically',
);
assertEq(
  extractPlaceholders('Welcome {user_name} to {church_name}'),
  ['{church_name}', '{user_name}'],
  'underscores allowed',
);
// Non-matching: digits or special chars in braces
assertEq(extractPlaceholders('{123}'), [], 'digits in braces → no match');
assertEq(extractPlaceholders('{a b}'), [], 'space in braces → no match');

// ============================================================================
// SUPPORTED_LANGS
// ============================================================================
console.log('\n── SUPPORTED_LANGS ───────────────────────────────────────');

assertEq(SUPPORTED_LANGS, ['el', 'ru', 'ro', 'ka'], 'supported langs');

// ============================================================================
// runAudit — unsupported language
// ============================================================================
console.log('\n── runAudit: unsupported lang ────────────────────────────');

{
  let caught: Error | null = null;
  try { await runAudit('fr'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /Unsupported language/i.test(caught!.message), 'rejects fr');
  assert(caught !== null && /el, ru, ro, ka/.test(caught!.message), 'lists supported');
}

// ============================================================================
// runAudit — clean happy path
// ============================================================================
console.log('\n── runAudit: clean ───────────────────────────────────────');

resetPool();
// Source keys
poolRoutes.push({
  match: /FROM translations_source WHERE is_active = 1/i,
  rows: [
    { translation_key: 'a.greeting', english_text: 'Hello {name}', namespace: 'common' },
    { translation_key: 'a.count', english_text: 'You have {count} items', namespace: 'common' },
    { translation_key: 'a.short', english_text: 'No', namespace: 'common' },
  ],
});
// Localized keys — all present, all distinct from english, placeholders match
poolRoutes.push({
  match: /FROM translations_localized WHERE language_code = \?/i,
  rows: [
    { translation_key: 'a.greeting', translated_text: 'Γεια σου {name}', status: 'active' },
    { translation_key: 'a.count', translated_text: 'Έχετε {count} στοιχεία', status: 'active' },
    { translation_key: 'a.short', translated_text: 'No', status: 'active' },
  ],
});

{
  const r = await runAudit('el', { includePublicPageScan: false });
  assertEq(r.language, 'el', 'language echoed');
  assertEq(r.missingLocalizedKeys, [], 'no missing');
  assertEq(r.orphanedLocalizedKeys, [], 'no orphans');
  assertEq(r.identicalToEnglishKeys, [], 'no identical (short "No" excluded by length gate)');
  assertEq(r.placeholderMismatchKeys, [], 'no placeholder mismatches');
  assertEq(r.publicPageAudit, null, 'public page scan skipped');
  assertEq(r.summary.totalSourceKeys, 3, 'summary: 3 source');
  assertEq(r.summary.totalLocalizedKeys, 3, 'summary: 3 localized');
  assertEq(r.summary.missingLocalized, 0, 'summary: 0 missing');
  assert(typeof r.timestamp === 'string', 'timestamp ISO string');
  assertEq(r.summary.publicPageKeysUsed, null, 'publicPageKeysUsed null when skipped');
  // Verify SQL was actually called
  assert(poolCalls.length === 2, '2 queries fired');
  assertEq(poolCalls[1].params, ['el'], 'lang param bound');
}

// ============================================================================
// runAudit — missing localized keys
// ============================================================================
console.log('\n── runAudit: missing localized ───────────────────────────');

resetPool();
poolRoutes.push({
  match: /FROM translations_source/i,
  rows: [
    { translation_key: 'k1', english_text: 'Hello', namespace: 'a' },
    { translation_key: 'k2', english_text: 'Goodbye', namespace: 'a' },
    { translation_key: 'k3', english_text: 'Welcome', namespace: 'a' },
  ],
});
poolRoutes.push({
  match: /FROM translations_localized/i,
  rows: [
    { translation_key: 'k1', translated_text: 'Γεια', status: 'active' },
  ],
});
{
  const r = await runAudit('el', { includePublicPageScan: false });
  assertEq(r.missingLocalizedKeys.sort(), ['k2', 'k3'], 'k2 and k3 missing');
  assertEq(r.summary.missingLocalized, 2, 'summary count = 2');
}

// ============================================================================
// runAudit — orphaned localized keys
// ============================================================================
console.log('\n── runAudit: orphaned localized ──────────────────────────');

resetPool();
poolRoutes.push({
  match: /FROM translations_source/i,
  rows: [
    { translation_key: 'k1', english_text: 'Hello', namespace: 'a' },
  ],
});
poolRoutes.push({
  match: /FROM translations_localized/i,
  rows: [
    { translation_key: 'k1', translated_text: 'Γεια', status: 'active' },
    { translation_key: 'k_removed', translated_text: 'Απολέστηκε', status: 'active' },
    { translation_key: 'k_old', translated_text: 'Παλιό', status: 'active' },
  ],
});
{
  const r = await runAudit('el', { includePublicPageScan: false });
  assertEq(r.orphanedLocalizedKeys.sort(), ['k_old', 'k_removed'], 'orphans detected');
  assertEq(r.summary.orphanedLocalized, 2, 'summary count = 2');
  assertEq(r.missingLocalizedKeys, [], 'no missing (k1 is localized)');
}

// ============================================================================
// runAudit — identical-to-english (copy-through)
// ============================================================================
console.log('\n── runAudit: identical-to-english ────────────────────────');

resetPool();
poolRoutes.push({
  match: /FROM translations_source/i,
  rows: [
    { translation_key: 'long.key', english_text: 'This is a long English sentence', namespace: 'a' },
    { translation_key: 'short.key', english_text: 'Hi', namespace: 'a' },
    { translation_key: 'translated.key', english_text: 'Hello', namespace: 'a' },
    { translation_key: 'boundary.key', english_text: 'abcd', namespace: 'a' }, // length = 4, > 3
    { translation_key: 'at.boundary', english_text: 'abc', namespace: 'a' },  // length = 3, NOT > 3
  ],
});
poolRoutes.push({
  match: /FROM translations_localized/i,
  rows: [
    // Identical, length > 3 → flagged
    { translation_key: 'long.key', translated_text: 'This is a long English sentence', status: 'active' },
    // Identical but short → NOT flagged
    { translation_key: 'short.key', translated_text: 'Hi', status: 'active' },
    // Actually translated → not flagged
    { translation_key: 'translated.key', translated_text: 'Γεια', status: 'active' },
    // Boundary: length 4, identical → flagged
    { translation_key: 'boundary.key', translated_text: 'abcd', status: 'active' },
    // At boundary: length 3 → NOT flagged
    { translation_key: 'at.boundary', translated_text: 'abc', status: 'active' },
  ],
});
{
  const r = await runAudit('el', { includePublicPageScan: false });
  const sorted = [...r.identicalToEnglishKeys].sort();
  assertEq(sorted, ['boundary.key', 'long.key'], 'only length>3 identical flagged');
  assertEq(r.summary.identicalToEnglish, 2, 'summary count');
}

// ============================================================================
// runAudit — placeholder mismatches
// ============================================================================
console.log('\n── runAudit: placeholder mismatches ──────────────────────');

resetPool();
poolRoutes.push({
  match: /FROM translations_source/i,
  rows: [
    { translation_key: 'k1.ok', english_text: 'Hello {name}', namespace: 'a' },
    { translation_key: 'k2.missing', english_text: 'You have {count} items', namespace: 'a' },
    { translation_key: 'k3.extra', english_text: 'Welcome', namespace: 'a' },
    { translation_key: 'k4.different', english_text: 'On {date} at {time}', namespace: 'a' },
  ],
});
poolRoutes.push({
  match: /FROM translations_localized/i,
  rows: [
    { translation_key: 'k1.ok', translated_text: 'Γεια {name}', status: 'active' },
    // Missing placeholder
    { translation_key: 'k2.missing', translated_text: 'Έχετε στοιχεία', status: 'active' },
    // Extra placeholder
    { translation_key: 'k3.extra', translated_text: 'Welcome {user}', status: 'active' },
    // Different placeholders
    { translation_key: 'k4.different', translated_text: 'On {day} at {hour}', status: 'active' },
  ],
});
{
  const r = await runAudit('el', { includePublicPageScan: false });
  assertEq(r.placeholderMismatchKeys.length, 3, '3 mismatches (k2, k3, k4)');
  const keys = r.placeholderMismatchKeys.map((m: any) => m.key).sort();
  assertEq(keys, ['k2.missing', 'k3.extra', 'k4.different'], 'correct keys flagged');
  const k2 = r.placeholderMismatchKeys.find((m: any) => m.key === 'k2.missing');
  assertEq(k2.english, ['{count}'], 'k2 english placeholders');
  assertEq(k2.localized, [], 'k2 localized has no placeholders');
  const k3 = r.placeholderMismatchKeys.find((m: any) => m.key === 'k3.extra');
  assertEq(k3.english, [], 'k3 english no placeholders');
  assertEq(k3.localized, ['{user}'], 'k3 has extra placeholder');
}

// ============================================================================
// runAudit — return shape
// ============================================================================
console.log('\n── runAudit: return shape ────────────────────────────────');

resetPool();
poolRoutes.push({ match: /FROM translations_source/i, rows: [] });
poolRoutes.push({ match: /FROM translations_localized/i, rows: [] });
{
  const r = await runAudit('ru', { includePublicPageScan: false });
  assert('language' in r, 'has language');
  assert('timestamp' in r, 'has timestamp');
  assert('summary' in r, 'has summary');
  assert('missingLocalizedKeys' in r, 'has missingLocalizedKeys');
  assert('orphanedLocalizedKeys' in r, 'has orphanedLocalizedKeys');
  assert('identicalToEnglishKeys' in r, 'has identicalToEnglishKeys');
  assert('placeholderMismatchKeys' in r, 'has placeholderMismatchKeys');
  assert('publicPageAudit' in r, 'has publicPageAudit');
  assertEq(r.summary.totalSourceKeys, 0, 'empty source → 0');
  assertEq(r.summary.totalLocalizedKeys, 0, 'empty localized → 0');
}

// ============================================================================
// runAuditAll
// ============================================================================
console.log('\n── runAuditAll ───────────────────────────────────────────');

resetPool();
// Will be called 4 times (once per lang), both source and localized each
// Use persistent routes
poolRoutes.push({ match: /FROM translations_source/i, rows: [] });
poolRoutes.push({ match: /FROM translations_localized/i, rows: [] });

{
  // NOTE: runAuditAll calls runAudit without explicit options, so it DOES
  // include public page scan. That scan does fs reads — but if dirs don't
  // exist, it silently skips. The scan sits in a try/catch so it won't throw.
  // We just verify we get 4 results, one per supported lang.
  const results = await runAuditAll();
  assertEq(results.length, 4, '4 results (one per supported lang)');
  const langs = results.map((r: any) => r.language).sort();
  assertEq(langs, ['el', 'ka', 'ro', 'ru'], 'all supported langs audited');
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
