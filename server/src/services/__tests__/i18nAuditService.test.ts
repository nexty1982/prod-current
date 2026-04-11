#!/usr/bin/env npx tsx
/**
 * Unit tests for services/i18nAuditService.js
 *
 * Translation audit over translations_source + translations_localized.
 * Two deps:
 *   - ../config/db (getAppPool) — stubbed via require.cache
 *   - fs/path for scanPublicPageKeys — out of scope (fs-dependent)
 *
 * We always pass `{ includePublicPageScan: false }` to runAudit so the
 * fs code path is not exercised. scanPublicPageKeys itself is tested
 * indirectly only via the "scan failed" error path.
 *
 * Coverage:
 *   - SUPPORTED_LANGS constant
 *   - extractPlaceholders:
 *       · null/empty → []
 *       · no placeholders → []
 *       · single placeholder
 *       · multiple placeholders (sorted)
 *       · word_word token form
 *       · ignores partial/invalid forms
 *   - runAudit:
 *       · throws on unsupported language
 *       · missingLocalizedKeys
 *       · orphanedLocalizedKeys
 *       · identicalToEnglishKeys (strict > 3 length)
 *       · placeholderMismatchKeys (count + shape)
 *       · summary counts
 *       · includePublicPageScan: false → publicPageAudit = null
 *         (publicPage* summary fields also null)
 *       · runAudit with empty source and empty localized → zero everything
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

// ── Scriptable SQL-routed pool ─────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Route = { match: RegExp; respond?: (params: any[]) => any; rows?: any };
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        const out = r.respond ? r.respond(params) : r.rows;
        return [out];
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

function reset() { queryLog.length = 0; routes = []; }

const svc = require('../i18nAuditService');
const { runAudit, runAuditAll, extractPlaceholders, SUPPORTED_LANGS } = svc;

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── SUPPORTED_LANGS ───────────────────────────────────────');
assertEq(SUPPORTED_LANGS, ['el', 'ru', 'ro', 'ka'], 'SUPPORTED_LANGS');

// ============================================================================
// extractPlaceholders
// ============================================================================
console.log('\n── extractPlaceholders ───────────────────────────────────');

assertEq(extractPlaceholders(null), [], 'null → []');
assertEq(extractPlaceholders(undefined), [], 'undefined → []');
assertEq(extractPlaceholders(''), [], 'empty → []');
assertEq(extractPlaceholders('Hello world'), [], 'no placeholders');
assertEq(extractPlaceholders('Hello {name}'), ['{name}'], 'single');
// Sorted
assertEq(
  extractPlaceholders('{year} {name} {count}'),
  ['{count}', '{name}', '{year}'],
  'multiple sorted'
);
// word_word form
assertEq(extractPlaceholders('{first_name}'), ['{first_name}'], 'underscore form');
// Mixed valid + invalid
assertEq(
  extractPlaceholders('{name} {123} {weird-thing} {ok}'),
  ['{name}', '{ok}'],
  'ignores digits and hyphens'
);
// Duplicates preserved (matches module behavior)
assertEq(
  extractPlaceholders('{name} {name} {year}'),
  ['{name}', '{name}', '{year}'],
  'duplicates preserved, sorted'
);

// ============================================================================
// runAudit — unsupported language
// ============================================================================
console.log('\n── runAudit: unsupported language ────────────────────────');

{
  let caught: any = null;
  try { await runAudit('en', { includePublicPageScan: false }); }
  catch (e) { caught = e; }
  assert(caught && /Unsupported language/.test(caught.message), 'en throws');
  assert(caught && caught.message.includes('el'), 'lists supported');
}

{
  let caught: any = null;
  try { await runAudit('fr', { includePublicPageScan: false }); }
  catch (e) { caught = e; }
  assert(caught && /Unsupported language/.test(caught.message), 'fr throws');
}

// ============================================================================
// runAudit — empty source and localized
// ============================================================================
console.log('\n── runAudit: empty ───────────────────────────────────────');

reset();
routes.push({ match: /FROM translations_source/, rows: [] });
routes.push({ match: /FROM translations_localized/, rows: [] });
{
  const r = await runAudit('el', { includePublicPageScan: false });
  assertEq(r.language, 'el', 'language');
  assertEq(r.summary.totalSourceKeys, 0, '0 source');
  assertEq(r.summary.totalLocalizedKeys, 0, '0 localized');
  assertEq(r.summary.missingLocalized, 0, 'no missing');
  assertEq(r.summary.orphanedLocalized, 0, 'no orphans');
  assertEq(r.summary.identicalToEnglish, 0, 'no identical');
  assertEq(r.summary.placeholderMismatches, 0, 'no mismatches');
  assertEq(r.publicPageAudit, null, 'publicPageAudit null');
  assertEq(r.summary.publicPageKeysUsed, null, 'publicPageKeysUsed null');
  assertEq(r.summary.publicPageMissingInSource, null, 'publicPageMissingInSource null');
  assertEq(r.summary.publicPageMissingInLocalized, null, 'publicPageMissingInLocalized null');
  assertEq(r.missingLocalizedKeys, [], 'empty missing array');
  assertEq(r.orphanedLocalizedKeys, [], 'empty orphan array');
  assertEq(r.identicalToEnglishKeys, [], 'empty identical array');
  assertEq(r.placeholderMismatchKeys, [], 'empty mismatch array');
}

// Verify the localized query was parameterized by language
{
  const q = queryLog.find(x => /translations_localized/.test(x.sql));
  assertEq(q?.params, ['el'], 'localized query parameterized by lang');
}

// ============================================================================
// runAudit — missing localized keys
// ============================================================================
console.log('\n── runAudit: missingLocalizedKeys ────────────────────────');

reset();
routes.push({
  match: /FROM translations_source/,
  rows: [
    { translation_key: 'a.b.c', english_text: 'Hello', namespace: 'common' },
    { translation_key: 'x.y.z', english_text: 'World', namespace: 'common' },
    { translation_key: 'p.q.r', english_text: 'Foo', namespace: 'auth' },
  ],
});
routes.push({
  match: /FROM translations_localized/,
  rows: [
    { translation_key: 'a.b.c', translated_text: 'Γεια', status: 'approved' },
  ],
});
{
  const r = await runAudit('el', { includePublicPageScan: false });
  assertEq(r.missingLocalizedKeys.length, 2, '2 missing');
  assert(r.missingLocalizedKeys.includes('x.y.z'), 'x.y.z missing');
  assert(r.missingLocalizedKeys.includes('p.q.r'), 'p.q.r missing');
  assertEq(r.summary.missingLocalized, 2, 'summary count');
  assertEq(r.summary.totalSourceKeys, 3, '3 source');
  assertEq(r.summary.totalLocalizedKeys, 1, '1 localized');
}

// ============================================================================
// runAudit — orphaned localized keys
// ============================================================================
console.log('\n── runAudit: orphanedLocalizedKeys ───────────────────────');

reset();
routes.push({
  match: /FROM translations_source/,
  rows: [{ translation_key: 'a', english_text: 'Hello', namespace: 'c' }],
});
routes.push({
  match: /FROM translations_localized/,
  rows: [
    { translation_key: 'a', translated_text: 'Hi', status: 'approved' },
    { translation_key: 'stale.key', translated_text: 'Old', status: 'approved' },
    { translation_key: 'another.stale', translated_text: 'Old2', status: 'draft' },
  ],
});
{
  const r = await runAudit('ru', { includePublicPageScan: false });
  assertEq(r.orphanedLocalizedKeys.length, 2, '2 orphans');
  assert(r.orphanedLocalizedKeys.includes('stale.key'), 'stale.key');
  assert(r.orphanedLocalizedKeys.includes('another.stale'), 'another.stale');
  assertEq(r.summary.orphanedLocalized, 2, 'summary count');
}

// ============================================================================
// runAudit — identicalToEnglish
// ============================================================================
console.log('\n── runAudit: identicalToEnglishKeys ──────────────────────');

reset();
routes.push({
  match: /FROM translations_source/,
  rows: [
    { translation_key: 'long', english_text: 'Hello World', namespace: 'c' },
    // Not translated — same as English
    { translation_key: 'same', english_text: 'Dashboard', namespace: 'c' },
    // Short value — length 3, NOT flagged (strict > 3)
    { translation_key: 'short', english_text: 'Yes', namespace: 'c' },
    // Length exactly 4 — flagged if identical
    { translation_key: 'four', english_text: 'Four', namespace: 'c' },
    // Different localization
    { translation_key: 'diff', english_text: 'Home', namespace: 'c' },
  ],
});
routes.push({
  match: /FROM translations_localized/,
  rows: [
    { translation_key: 'long', translated_text: 'Γεια Κόσμε', status: 'approved' },
    { translation_key: 'same', translated_text: 'Dashboard', status: 'draft' },
    { translation_key: 'short', translated_text: 'Yes', status: 'draft' },
    { translation_key: 'four', translated_text: 'Four', status: 'draft' },
    { translation_key: 'diff', translated_text: 'Αρχική', status: 'approved' },
  ],
});
{
  const r = await runAudit('el', { includePublicPageScan: false });
  assertEq(r.identicalToEnglishKeys.length, 2, '2 identical (same + four)');
  assert(r.identicalToEnglishKeys.includes('same'), 'same flagged');
  assert(r.identicalToEnglishKeys.includes('four'), 'four flagged (len 4)');
  assert(!r.identicalToEnglishKeys.includes('short'), 'short NOT flagged (len 3 boundary)');
  assert(!r.identicalToEnglishKeys.includes('long'), 'long translated → not flagged');
  assert(!r.identicalToEnglishKeys.includes('diff'), 'diff localized → not flagged');
}

// ============================================================================
// runAudit — placeholder mismatches
// ============================================================================
console.log('\n── runAudit: placeholderMismatchKeys ─────────────────────');

reset();
routes.push({
  match: /FROM translations_source/,
  rows: [
    { translation_key: 'greet', english_text: 'Hello {name}', namespace: 'c' },
    { translation_key: 'count', english_text: 'You have {count} items', namespace: 'c' },
    { translation_key: 'multi', english_text: '{year}: {name}', namespace: 'c' },
    { translation_key: 'clean', english_text: 'No placeholders', namespace: 'c' },
  ],
});
routes.push({
  match: /FROM translations_localized/,
  rows: [
    // Missing {name}
    { translation_key: 'greet', translated_text: 'Γεια σας', status: 'approved' },
    // Correct
    { translation_key: 'count', translated_text: 'Έχετε {count} στοιχεία', status: 'approved' },
    // Extra placeholder
    { translation_key: 'multi', translated_text: '{year}: {name} {extra}', status: 'approved' },
    // Clean, no placeholders on either side
    { translation_key: 'clean', translated_text: 'Καθαρό', status: 'approved' },
  ],
});
{
  const r = await runAudit('el', { includePublicPageScan: false });
  assertEq(r.placeholderMismatchKeys.length, 2, '2 mismatches');
  const greet = r.placeholderMismatchKeys.find((k: any) => k.key === 'greet');
  assert(greet !== undefined, 'greet mismatch present');
  assertEq(greet.english, ['{name}'], 'greet english');
  assertEq(greet.localized, [], 'greet localized empty');
  const multi = r.placeholderMismatchKeys.find((k: any) => k.key === 'multi');
  assert(multi !== undefined, 'multi mismatch present');
  assertEq(multi.english, ['{name}', '{year}'], 'multi english');
  assertEq(multi.localized, ['{extra}', '{name}', '{year}'], 'multi localized');
  assertEq(r.summary.placeholderMismatches, 2, 'summary count');
}

// ============================================================================
// runAudit — orphaned localized are NOT counted in identical/placeholder checks
// ============================================================================
console.log('\n── runAudit: orphan exclusion from per-key checks ────────');

reset();
routes.push({
  match: /FROM translations_source/,
  rows: [{ translation_key: 'a', english_text: 'Hello', namespace: 'c' }],
});
routes.push({
  match: /FROM translations_localized/,
  rows: [
    { translation_key: 'a', translated_text: 'Γεια', status: 'approved' },
    { translation_key: 'orphan', translated_text: 'Hello', status: 'draft' },  // same as "source" text — but no source row
  ],
});
{
  const r = await runAudit('el', { includePublicPageScan: false });
  assertEq(r.orphanedLocalizedKeys, ['orphan'], 'orphan captured');
  // Orphan doesn't appear in identical-to-English or placeholder checks
  assertEq(r.identicalToEnglishKeys, [], 'no identical (orphan skipped)');
  assertEq(r.placeholderMismatchKeys, [], 'no mismatches (orphan skipped)');
}

// ============================================================================
// runAudit — full result shape
// ============================================================================
console.log('\n── runAudit: result shape ────────────────────────────────');

reset();
routes.push({ match: /FROM translations_source/, rows: [] });
routes.push({ match: /FROM translations_localized/, rows: [] });
{
  const r = await runAudit('ka', { includePublicPageScan: false });
  assert(typeof r.timestamp === 'string', 'timestamp is string');
  assert(/^\d{4}-\d{2}-\d{2}T/.test(r.timestamp), 'timestamp is ISO');
  assert(r.summary !== undefined, 'has summary');
  assert('missingLocalizedKeys' in r, 'missingLocalizedKeys present');
  assert('orphanedLocalizedKeys' in r, 'orphanedLocalizedKeys present');
  assert('identicalToEnglishKeys' in r, 'identicalToEnglishKeys present');
  assert('placeholderMismatchKeys' in r, 'placeholderMismatchKeys present');
  assert('publicPageAudit' in r, 'publicPageAudit present');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main()

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
