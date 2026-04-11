#!/usr/bin/env npx tsx
/**
 * Unit tests for services/i18nAuditService.js (OMD-1030)
 *
 * Deterministic translation audit — compares translations_source vs
 * translations_localized and runs static code scan for public-page keys.
 *
 * Dependencies: ../config/db, fs, path. Stub db via require.cache.
 * fs is left alone (scanPublicPageKeys returns empty if dirs don't exist,
 * which is the expected test environment).
 *
 * Coverage:
 *   - SUPPORTED_LANGS export
 *   - extractPlaceholders: empty, none, single, multiple, dedup-via-sort
 *   - scanPublicPageKeys: runs without throwing (dirs may not exist)
 *   - runAudit:
 *       · unsupported lang → throw
 *       · missingLocalizedKeys list
 *       · orphanedLocalizedKeys list
 *       · identicalToEnglishKeys (only for length > 3)
 *       · placeholderMismatchKeys with english/localized arrays
 *       · summary counts
 *       · includePublicPageScan=false → publicPageAudit null
 *       · includePublicPageScan=true → publicPageAudit object with totals
 *   - runAuditAll: iterates all SUPPORTED_LANGS
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

// ── SQL-routed fake pool ─────────────────────────────────────────────────
type Route = { match: RegExp; rows?: any; throws?: Error };
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        if (r.throws) throw r.throws;
        return [r.rows !== undefined ? r.rows : []];
      }
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true, exports: dbStub,
} as any;

function resetState() {
  queryLog.length = 0;
  routes = [];
}

const {
  runAudit,
  runAuditAll,
  scanPublicPageKeys,
  extractPlaceholders,
  SUPPORTED_LANGS,
} = require('../i18nAuditService');

async function main() {

// ============================================================================
// SUPPORTED_LANGS
// ============================================================================
console.log('\n── SUPPORTED_LANGS ───────────────────────────────────────');

assertEq(SUPPORTED_LANGS, ['el', 'ru', 'ro', 'ka'], 'supported languages');

// ============================================================================
// extractPlaceholders (pure)
// ============================================================================
console.log('\n── extractPlaceholders ───────────────────────────────────');

assertEq(extractPlaceholders(''), [], 'empty → []');
assertEq(extractPlaceholders(null), [], 'null → []');
assertEq(extractPlaceholders(undefined), [], 'undefined → []');
assertEq(extractPlaceholders('no placeholders here'), [], 'no matches → []');
assertEq(extractPlaceholders('Hello {name}'), ['{name}'], 'single placeholder');
assertEq(
  extractPlaceholders('Hello {name}, you are {age} years old'),
  ['{age}', '{name}'],
  'multiple placeholders sorted'
);
assertEq(
  extractPlaceholders('{b_name} and {a_name}'),
  ['{a_name}', '{b_name}'],
  'underscore placeholders sorted'
);
assertEq(
  extractPlaceholders('{zzz} comes after {aaa}'),
  ['{aaa}', '{zzz}'],
  'alpha sort'
);
// Invalid placeholder patterns (digits, hyphens) not matched
assertEq(extractPlaceholders('{123}'), [], 'digits rejected');
assertEq(extractPlaceholders('{name-foo}'), [], 'hyphen rejected');

// ============================================================================
// scanPublicPageKeys — runs without crashing
// ============================================================================
console.log('\n── scanPublicPageKeys ────────────────────────────────────');

{
  // The function walks frontend dirs; in isolated test env some may not exist.
  // Verify it returns an array and doesn't throw.
  const keys = scanPublicPageKeys();
  assert(Array.isArray(keys), 'returns array');
  // Sorted
  const sorted = [...keys].sort();
  assertEq(keys, sorted, 'sorted output');
}

// ============================================================================
// runAudit — unsupported lang
// ============================================================================
console.log('\n── runAudit: unsupported lang ────────────────────────────');

{
  let caught: Error | null = null;
  try {
    await runAudit('xx');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught !== null && caught.message.includes('Unsupported'), 'error mentions unsupported');
  assert(caught !== null && caught.message.includes('el'), 'error lists valid langs');
}

// ============================================================================
// runAudit — happy path with all 6 check types
// ============================================================================
console.log('\n── runAudit: comprehensive ──────────────────────────────');

{
  resetState();
  routes = [
    {
      match: /FROM translations_source/i,
      rows: [
        { translation_key: 'key.welcome', english_text: 'Welcome, {name}!', namespace: 'common' },
        { translation_key: 'key.goodbye', english_text: 'Goodbye', namespace: 'common' },
        { translation_key: 'key.missing', english_text: 'Not translated yet', namespace: 'common' },
        { translation_key: 'key.copythrough', english_text: 'English text here', namespace: 'common' },
        { translation_key: 'key.short', english_text: 'Hi', namespace: 'common' },
        { translation_key: 'key.placeholder', english_text: 'You have {count} items', namespace: 'common' },
      ],
    },
    {
      match: /FROM translations_localized WHERE language_code = \?/i,
      rows: [
        { translation_key: 'key.welcome', translated_text: 'Benvenuto, {name}!', status: 'translated' },
        { translation_key: 'key.goodbye', translated_text: 'Addio', status: 'translated' },
        // key.missing intentionally absent
        { translation_key: 'key.copythrough', translated_text: 'English text here', status: 'translated' }, // identical
        { translation_key: 'key.short', translated_text: 'Hi', status: 'translated' }, // identical but short → NOT flagged
        { translation_key: 'key.placeholder', translated_text: 'You have items', status: 'translated' }, // missing {count}
        { translation_key: 'key.orphaned', translated_text: 'Old value', status: 'translated' }, // not in source
      ],
    },
  ];

  const r = await runAudit('el', { includePublicPageScan: false });

  assertEq(r.language, 'el', 'language');
  assert(r.timestamp.length > 0, 'timestamp set');

  // Summary
  assertEq(r.summary.totalSourceKeys, 6, 'totalSourceKeys=6');
  assertEq(r.summary.totalLocalizedKeys, 6, 'totalLocalizedKeys=6');
  assertEq(r.summary.missingLocalized, 1, '1 missing');
  assertEq(r.summary.orphanedLocalized, 1, '1 orphaned');
  assertEq(r.summary.identicalToEnglish, 1, '1 identical (only long one)');
  assertEq(r.summary.placeholderMismatches, 1, '1 placeholder mismatch');

  // Detailed lists
  assertEq(r.missingLocalizedKeys, ['key.missing'], 'missing list');
  assertEq(r.orphanedLocalizedKeys, ['key.orphaned'], 'orphaned list');
  assertEq(r.identicalToEnglishKeys, ['key.copythrough'], 'identical list (short excluded)');
  assertEq(r.placeholderMismatchKeys.length, 1, '1 placeholder mismatch entry');
  assertEq(r.placeholderMismatchKeys[0].key, 'key.placeholder', 'mismatch key');
  assertEq(r.placeholderMismatchKeys[0].english, ['{count}'], 'english placeholders');
  assertEq(r.placeholderMismatchKeys[0].localized, [], 'localized placeholders empty');

  // includePublicPageScan=false → null
  assertEq(r.publicPageAudit, null, 'publicPageAudit null when disabled');
  assertEq(r.summary.publicPageKeysUsed, null, 'summary null');
  assertEq(r.summary.publicPageMissingInSource, null, 'source null');
  assertEq(r.summary.publicPageMissingInLocalized, null, 'localized null');

  // Query was called with lang param
  const localizedCall = queryLog.find(c => /translations_localized/.test(c.sql));
  assertEq(localizedCall?.params, ['el'], 'lang param passed');
}

// ============================================================================
// runAudit — all keys translated cleanly (nothing flagged)
// ============================================================================
console.log('\n── runAudit: clean ───────────────────────────────────────');

{
  resetState();
  routes = [
    {
      match: /FROM translations_source/i,
      rows: [
        { translation_key: 'a', english_text: 'Hello', namespace: 'c' },
        { translation_key: 'b', english_text: 'World', namespace: 'c' },
      ],
    },
    {
      match: /FROM translations_localized/i,
      rows: [
        { translation_key: 'a', translated_text: 'Γεια', status: 'translated' },
        { translation_key: 'b', translated_text: 'Κόσμος', status: 'translated' },
      ],
    },
  ];
  const r = await runAudit('el', { includePublicPageScan: false });
  assertEq(r.summary.missingLocalized, 0, 'none missing');
  assertEq(r.summary.orphanedLocalized, 0, 'none orphaned');
  assertEq(r.summary.identicalToEnglish, 0, 'none identical');
  assertEq(r.summary.placeholderMismatches, 0, 'no placeholder mismatches');
}

// ============================================================================
// runAudit — empty DB
// ============================================================================
console.log('\n── runAudit: empty ───────────────────────────────────────');

{
  resetState();
  routes = [
    { match: /FROM translations_source/i, rows: [] },
    { match: /FROM translations_localized/i, rows: [] },
  ];
  const r = await runAudit('ru', { includePublicPageScan: false });
  assertEq(r.summary.totalSourceKeys, 0, 'zero source');
  assertEq(r.summary.totalLocalizedKeys, 0, 'zero localized');
  assertEq(r.missingLocalizedKeys, [], 'empty missing');
}

// ============================================================================
// runAudit — includePublicPageScan=true
// ============================================================================
console.log('\n── runAudit: public page scan ────────────────────────────');

{
  resetState();
  routes = [
    {
      match: /FROM translations_source/i,
      rows: [{ translation_key: 'a.b', english_text: 'x', namespace: 'c' }],
    },
    {
      match: /FROM translations_localized/i,
      rows: [],
    },
  ];
  const r = await runAudit('ro', { includePublicPageScan: true });
  // publicPageAudit should be non-null (even if scanned keys is [])
  assert(r.publicPageAudit !== null, 'publicPageAudit present');
  assert(typeof r.summary.publicPageKeysUsed === 'number', 'count is number');
  assertEq(typeof r.summary.publicPageMissingInSource, 'number', 'source count numeric');
  assertEq(typeof r.summary.publicPageMissingInLocalized, 'number', 'localized count numeric');
}

// ============================================================================
// runAudit — placeholder extraction with multiple and different
// ============================================================================
console.log('\n── runAudit: placeholder mismatch detailed ──────────────');

{
  resetState();
  routes = [
    {
      match: /FROM translations_source/i,
      rows: [
        { translation_key: 'k1', english_text: 'Hello {name}, you have {count} items', namespace: 'c' },
        { translation_key: 'k2', english_text: 'Match this {exact}', namespace: 'c' },
      ],
    },
    {
      match: /FROM translations_localized/i,
      rows: [
        // Different placeholder order → should still match after sort
        { translation_key: 'k1', translated_text: '{count} items for {name}', status: 'translated' },
        // Exact placeholder match
        { translation_key: 'k2', translated_text: 'Matches {exact}', status: 'translated' },
      ],
    },
  ];
  const r = await runAudit('ka', { includePublicPageScan: false });
  assertEq(r.summary.placeholderMismatches, 0, 'sorted placeholders match → no mismatch');
}

// ============================================================================
// runAuditAll — iterates all languages
// ============================================================================
console.log('\n── runAuditAll ───────────────────────────────────────────');

{
  resetState();
  routes = [
    { match: /FROM translations_source/i, rows: [] },
    { match: /FROM translations_localized/i, rows: [] },
  ];
  const results = await runAuditAll();
  assertEq(results.length, 4, '4 language results');
  assertEq(results[0].language, 'el', 'first = el');
  assertEq(results[1].language, 'ru', 'second = ru');
  assertEq(results[2].language, 'ro', 'third = ro');
  assertEq(results[3].language, 'ka', 'fourth = ka');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
