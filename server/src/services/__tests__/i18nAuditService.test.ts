#!/usr/bin/env npx tsx
/**
 * Unit tests for services/i18nAuditService.js (OMD-1168)
 *
 * Deterministic translation audit: reads from translations_source +
 * translations_localized, scans public-page .tsx files for t('key') calls.
 *
 * Strategy:
 *   - Stub config/db via require.cache with a fake pool whose query() dispatches
 *     by SQL regex to scriptable rows.
 *   - For scanPublicPageKeys: since the SUT resolves paths from __dirname, we
 *     let it run against the actual frontend tree (read-only) OR pass
 *     includePublicPageScan=false and test scanPublicPageKeys separately by
 *     creating a tmp directory structure.
 *
 * Coverage:
 *   - SUPPORTED_LANGS constant
 *   - extractPlaceholders: null/empty, none, single, multiple, sorted, non-matching
 *   - runAudit:
 *     · unsupported language → throws
 *     · happy path with all categories populated
 *     · missing localized detection
 *     · orphaned localized detection
 *     · identical-to-English (with length > 3 guard)
 *     · placeholder mismatch detection
 *     · includePublicPageScan=false → publicPageAudit null
 *     · publicPageAudit error captured gracefully
 *   - runAuditAll: runs for all 4 languages
 *   - scanPublicPageKeys: returns sorted dedup array
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

// ── Fake DB pool via require.cache ───────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

// Scriptable rows
let sourceRows: Array<{ translation_key: string; english_text: string; namespace: string }> = [];
let localizedRows: Array<{ translation_key: string; translated_text: string; status: string }> = [];
let queryThrowsOnPattern: RegExp | null = null;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });

    if (queryThrowsOnPattern && queryThrowsOnPattern.test(sql)) {
      throw new Error('fake db failure');
    }

    if (/FROM translations_source/i.test(sql)) {
      return [sourceRows];
    }
    if (/FROM translations_localized/i.test(sql)) {
      return [localizedRows];
    }
    return [[]];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

function resetState() {
  queryLog.length = 0;
  sourceRows = [];
  localizedRows = [];
  queryThrowsOnPattern = null;
}

// Silence noisy logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

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

assertEq(SUPPORTED_LANGS, ['el', 'ru', 'ro', 'ka'], 'exact list');

// ============================================================================
// extractPlaceholders
// ============================================================================
console.log('\n── extractPlaceholders ───────────────────────────────────');

assertEq(extractPlaceholders(null), [], 'null → []');
assertEq(extractPlaceholders(undefined), [], 'undefined → []');
assertEq(extractPlaceholders(''), [], 'empty → []');
assertEq(extractPlaceholders('no placeholders here'), [], 'no match → []');
assertEq(extractPlaceholders('Hello {name}'), ['{name}'], 'single');
assertEq(
  extractPlaceholders('{year} from {name}'),
  ['{name}', '{year}'],
  'multiple sorted'
);
assertEq(
  extractPlaceholders('{count} items by {user_name}'),
  ['{count}', '{user_name}'],
  'underscore placeholders'
);
assertEq(
  extractPlaceholders('{a} {b} {a}'),
  ['{a}', '{a}', '{b}'],
  'duplicates preserved, sorted'
);
// Non-matching braces (numbers, symbols) should be ignored
assertEq(extractPlaceholders('{123} {x}'), ['{x}'], 'numeric ignored');

// ============================================================================
// runAudit: unsupported language
// ============================================================================
console.log('\n── runAudit: unsupported language ────────────────────────');

{
  let caught: Error | null = null;
  try {
    await runAudit('zz', { includePublicPageScan: false });
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'throws on unsupported');
  assert(caught !== null && caught.message.includes('Unsupported language code'), 'error message');
  assert(caught !== null && caught.message.includes('zz'), 'mentions the bad code');
}

// ============================================================================
// runAudit: happy path (all categories)
// ============================================================================
console.log('\n── runAudit: happy path ──────────────────────────────────');

resetState();
sourceRows = [
  { translation_key: 'home.title', english_text: 'Welcome', namespace: 'home' },
  { translation_key: 'home.greeting', english_text: 'Hello {name}', namespace: 'home' },
  { translation_key: 'home.count', english_text: 'You have {count} items', namespace: 'home' },
  { translation_key: 'home.orphan_source', english_text: 'Only in source', namespace: 'home' },
  { translation_key: 'home.copy', english_text: 'Copy this text', namespace: 'home' },
  { translation_key: 'home.short', english_text: 'OK', namespace: 'home' },
];
localizedRows = [
  { translation_key: 'home.title', translated_text: 'Καλώς ήρθατε', status: 'translated' },
  { translation_key: 'home.greeting', translated_text: 'Γεια {name}', status: 'translated' },
  // placeholder mismatch: missing {count}
  { translation_key: 'home.count', translated_text: 'You have items', status: 'translated' },
  // identical to English, length > 3
  { translation_key: 'home.copy', translated_text: 'Copy this text', status: 'translated' },
  // identical to English but length <= 3 → should NOT be flagged
  { translation_key: 'home.short', translated_text: 'OK', status: 'translated' },
  // orphaned: not in source
  { translation_key: 'home.orphan_localized', translated_text: 'Orphan', status: 'translated' },
];

{
  const r = await runAudit('el', { includePublicPageScan: false });

  assertEq(r.language, 'el', 'language');
  assert(typeof r.timestamp === 'string', 'timestamp string');

  // Summary
  assertEq(r.summary.totalSourceKeys, 6, 'total source');
  assertEq(r.summary.totalLocalizedKeys, 6, 'total localized');
  assertEq(r.summary.missingLocalized, 1, 'missing count');
  assertEq(r.summary.orphanedLocalized, 1, 'orphaned count');
  assertEq(r.summary.identicalToEnglish, 1, 'identical count (short excluded)');
  assertEq(r.summary.placeholderMismatches, 1, 'placeholder mismatch count');
  assertEq(r.summary.publicPageKeysUsed, null, 'publicPageKeysUsed null when disabled');

  // Detail arrays
  assertEq(r.missingLocalizedKeys, ['home.orphan_source'], 'missing key');
  assertEq(r.orphanedLocalizedKeys, ['home.orphan_localized'], 'orphaned key');
  assertEq(r.identicalToEnglishKeys, ['home.copy'], 'identical key');
  assertEq(r.placeholderMismatchKeys.length, 1, '1 mismatch');
  assertEq(r.placeholderMismatchKeys[0].key, 'home.count', 'mismatch key');
  assertEq(r.placeholderMismatchKeys[0].english, ['{count}'], 'english placeholders');
  assertEq(r.placeholderMismatchKeys[0].localized, [], 'localized empty');
  assertEq(r.publicPageAudit, null, 'publicPageAudit null');

  // Query verification
  assert(/FROM translations_source/i.test(queryLog[0].sql), 'first: source query');
  assert(/is_active = 1/i.test(queryLog[0].sql), 'filters active');
  assert(/FROM translations_localized/i.test(queryLog[1].sql), 'second: localized query');
  assertEq(queryLog[1].params[0], 'el', 'language param');
}

// ============================================================================
// runAudit: all localized present, no issues
// ============================================================================
console.log('\n── runAudit: clean slate ─────────────────────────────────');

resetState();
sourceRows = [
  { translation_key: 'a.b', english_text: 'Hello', namespace: 'a' },
];
localizedRows = [
  { translation_key: 'a.b', translated_text: 'Γεια', status: 'translated' },
];

{
  const r = await runAudit('el', { includePublicPageScan: false });
  assertEq(r.summary.missingLocalized, 0, 'no missing');
  assertEq(r.summary.orphanedLocalized, 0, 'no orphaned');
  assertEq(r.summary.identicalToEnglish, 0, 'no identical');
  assertEq(r.summary.placeholderMismatches, 0, 'no mismatch');
}

// ============================================================================
// runAudit: empty source and localized
// ============================================================================
console.log('\n── runAudit: empty DB ────────────────────────────────────');

resetState();
{
  const r = await runAudit('ka', { includePublicPageScan: false });
  assertEq(r.language, 'ka', 'ka language');
  assertEq(r.summary.totalSourceKeys, 0, 'empty source');
  assertEq(r.summary.totalLocalizedKeys, 0, 'empty localized');
  assertEq(r.missingLocalizedKeys, [], 'empty missing');
  assertEq(r.orphanedLocalizedKeys, [], 'empty orphaned');
}

// ============================================================================
// runAudit: identical-to-English length guard
// ============================================================================
console.log('\n── runAudit: length > 3 guard for identical ──────────────');

resetState();
sourceRows = [
  { translation_key: 'k.short3', english_text: 'YES', namespace: 'k' },     // len 3 → skip
  { translation_key: 'k.short4', english_text: 'YESS', namespace: 'k' },    // len 4 → flag
];
localizedRows = [
  { translation_key: 'k.short3', translated_text: 'YES', status: 'translated' },
  { translation_key: 'k.short4', translated_text: 'YESS', status: 'translated' },
];

{
  const r = await runAudit('ru', { includePublicPageScan: false });
  assertEq(r.summary.identicalToEnglish, 1, 'only > 3 flagged');
  assertEq(r.identicalToEnglishKeys, ['k.short4'], 'only short4');
}

// ============================================================================
// runAudit: placeholder mismatch variations
// ============================================================================
console.log('\n── runAudit: placeholder variations ──────────────────────');

resetState();
sourceRows = [
  { translation_key: 'a.same', english_text: 'Hi {name}', namespace: 'a' },
  { translation_key: 'a.extra', english_text: 'Hi {name}', namespace: 'a' },
  { translation_key: 'a.different', english_text: 'Hi {name} {year}', namespace: 'a' },
  { translation_key: 'a.none_src', english_text: 'Plain text', namespace: 'a' },
];
localizedRows = [
  // same placeholders → OK
  { translation_key: 'a.same', translated_text: 'Γεια {name}', status: 'translated' },
  // localized has extra placeholder → mismatch
  { translation_key: 'a.extra', translated_text: 'Γεια {name} {extra}', status: 'translated' },
  // localized missing one → mismatch
  { translation_key: 'a.different', translated_text: 'Γεια {name}', status: 'translated' },
  // source has none, localized has one → mismatch
  { translation_key: 'a.none_src', translated_text: 'Plain {x}', status: 'translated' },
];

{
  const r = await runAudit('ro', { includePublicPageScan: false });
  assertEq(r.summary.placeholderMismatches, 3, '3 mismatches');
  const keys = r.placeholderMismatchKeys.map((p: any) => p.key).sort();
  assertEq(keys, ['a.different', 'a.extra', 'a.none_src'], 'mismatch keys');
}

// ============================================================================
// runAudit: orphaned keys are excluded from identical/placeholder checks
// ============================================================================
console.log('\n── runAudit: orphaned skipped in identical/placeholder ───');

resetState();
sourceRows = [];  // empty source
localizedRows = [
  { translation_key: 'x.y', translated_text: 'Some translation', status: 'translated' },
];

{
  const r = await runAudit('el', { includePublicPageScan: false });
  assertEq(r.summary.orphanedLocalized, 1, '1 orphaned');
  // Should NOT throw when computing identical/placeholder (src undefined)
  assertEq(r.summary.identicalToEnglish, 0, 'no identical');
  assertEq(r.summary.placeholderMismatches, 0, 'no mismatch');
}

// ============================================================================
// runAudit: publicPageAudit runs and returns structure
// ============================================================================
console.log('\n── runAudit: publicPageAudit enabled ─────────────────────');

resetState();
sourceRows = [];
localizedRows = [];
{
  // Real filesystem scan — may return [] if frontend dirs missing, but must
  // not throw and must populate the audit structure.
  const r = await runAudit('el');
  assert(r.publicPageAudit !== null, 'publicPageAudit set');
  assert(
    r.publicPageAudit !== null &&
    (typeof r.publicPageAudit.totalKeysUsed === 'number' || 'error' in r.publicPageAudit),
    'has totalKeysUsed or error'
  );
  // summary.publicPageKeysUsed should be numeric (or null only if error)
  assert(
    r.summary.publicPageKeysUsed === null || typeof r.summary.publicPageKeysUsed === 'number',
    'publicPageKeysUsed is null or number'
  );
}

// ============================================================================
// runAuditAll — iterates all SUPPORTED_LANGS
// ============================================================================
console.log('\n── runAuditAll ───────────────────────────────────────────');

resetState();
sourceRows = [
  { translation_key: 'k.a', english_text: 'Hello', namespace: 'k' },
];
localizedRows = [
  { translation_key: 'k.a', translated_text: 'Γεια', status: 'translated' },
];

{
  // Monkey-patch runAudit's pool calls — since localizedRows is shared,
  // each lang will query the same localized data. We only want to verify
  // that it runs once per lang with the right language param.
  const r = await runAuditAll();
  assertEq(r.length, 4, '4 languages');
  assertEq(r[0].language, 'el', 'first: el');
  assertEq(r[1].language, 'ru', 'second: ru');
  assertEq(r[2].language, 'ro', 'third: ro');
  assertEq(r[3].language, 'ka', 'fourth: ka');

  // Query count: 2 per language (source + localized), plus publicPageAudit
  // does filesystem not DB, so exactly 8 queries
  assertEq(queryLog.length, 8, '8 queries (2 per lang × 4)');
  // Verify language params
  const localizedCalls = queryLog.filter(c => /FROM translations_localized/i.test(c.sql));
  assertEq(localizedCalls.length, 4, '4 localized queries');
  assertEq(localizedCalls[0].params[0], 'el', 'el param');
  assertEq(localizedCalls[1].params[0], 'ru', 'ru param');
  assertEq(localizedCalls[2].params[0], 'ro', 'ro param');
  assertEq(localizedCalls[3].params[0], 'ka', 'ka param');
}

// ============================================================================
// scanPublicPageKeys — runs without throwing
// ============================================================================
console.log('\n── scanPublicPageKeys ────────────────────────────────────');

{
  const keys = scanPublicPageKeys();
  assert(Array.isArray(keys), 'returns array');
  // Sorted check
  const sorted = [...keys].sort();
  assertEq(keys, sorted, 'sorted');
  // Dedup check
  assertEq(new Set(keys).size, keys.length, 'deduplicated');
  // Each key should match the pattern namespace.key or namespace.sub.key
  const allValid = keys.every((k: string) => /^[a-zA-Z_]+\.[a-zA-Z0-9_.]+$/.test(k));
  assert(allValid, 'all keys match pattern');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
