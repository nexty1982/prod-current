#!/usr/bin/env npx tsx
/**
 * Unit tests for services/i18nAuditService.js (OMD-1207)
 *
 * Read-only translation audit. Two external deps:
 *   - `../config/db` getAppPool    → stubbed via require.cache with a
 *                                    scriptable fake pool
 *   - `fs` (readdirSync/existsSync/readFileSync) used by scanPublicPageKeys
 *                                    → stubbed in-place on the fs module
 *
 * Coverage:
 *   - extractPlaceholders (pure):
 *       · empty / null / no placeholders
 *       · single / multiple placeholders
 *       · sort order + deduplication behavior (matches only, not dedupe)
 *   - runAudit:
 *       · unsupported language code → throws
 *       · queries translations_source + translations_localized with correct lang
 *       · missingLocalizedKeys populated when source key has no localized row
 *       · orphanedLocalizedKeys populated when localized key has no source
 *       · identicalToEnglishKeys — matches only when length > 3
 *       · identicalToEnglishKeys — ignores short values ≤3 chars
 *       · placeholderMismatchKeys — detects divergence + preserves both lists
 *       · placeholderMismatchKeys — ignores match (same sorted order)
 *       · publicPageAudit — skipped when includePublicPageScan=false
 *       · publicPageAudit.error when scanner throws
 *       · summary counts match detail array lengths
 *   - runAuditAll: iterates all SUPPORTED_LANGS
 *   - SUPPORTED_LANGS export
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

// ── Fake pool with scripted responders ──────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Scenario = {
  sourceRows: Array<{ translation_key: string; english_text: string; namespace?: string }>;
  localizedRows: Array<{ translation_key: string; translated_text: string; status?: string }>;
};

let scenario: Scenario = { sourceRows: [], localizedRows: [] };
let throwOnSource = false;
let throwOnLocalized = false;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (/FROM translations_source/i.test(sql)) {
      if (throwOnSource) throw new Error('source query fail');
      return [scenario.sourceRows];
    }
    if (/FROM translations_localized/i.test(sql)) {
      if (throwOnLocalized) throw new Error('localized query fail');
      return [scenario.localizedRows];
    }
    return [[]];
  },
};

function resetState() {
  queryLog.length = 0;
  scenario = { sourceRows: [], localizedRows: [] };
  throwOnSource = false;
  throwOnLocalized = false;
}

// ── Stub db via require.cache ───────────────────────────────────────
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// CRITICAL: load the SUT BEFORE patching fs. The CJS loader itself uses
// fs.readFileSync to read module source — if we monkey-patch it first,
// the subsequent require() call returns an empty module.
const {
  runAudit,
  runAuditAll,
  extractPlaceholders,
  SUPPORTED_LANGS,
} = require('../i18nAuditService');

// ── Stub fs for scanPublicPageKeys in-place (AFTER SUT load) ────────
// Patches are gated by fsStubbingActive. When inactive (default), fs calls
// pass through to the real fs, so any lazy module loading keeps working.
const fs = require('fs');
const origExistsSync = fs.existsSync;
const origReaddirSync = fs.readdirSync;
const origReadFileSync = fs.readFileSync;

let fsStubbingActive = false;
let existsSyncImpl: (p: string) => boolean = () => false;
let readdirSyncImpl: (p: string) => string[] = () => [];
let readFileSyncImpl: (p: string, enc: any) => string = () => '';

fs.existsSync = (p: string) => {
  if (!fsStubbingActive) return origExistsSync.call(fs, p);
  return existsSyncImpl(p);
};
fs.readdirSync = (p: string, ...rest: any[]) => {
  if (!fsStubbingActive) return (origReaddirSync as any).call(fs, p, ...rest);
  return readdirSyncImpl(p);
};
fs.readFileSync = (p: string, enc: any) => {
  if (!fsStubbingActive) return origReadFileSync.call(fs, p, enc);
  return readFileSyncImpl(p, enc);
};

function enableFs() {
  fsStubbingActive = true;
  existsSyncImpl = () => false;
  readdirSyncImpl = () => [];
  readFileSyncImpl = () => '';
}
function resetFs() {
  enableFs();
}
function disableFs() {
  fsStubbingActive = false;
}

// Silence
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

async function main() {

// Enable fs stubbing now that the SUT is fully loaded. Defaults make
// the public-page scanner return an empty key set.
enableFs();

// ============================================================================
// SUPPORTED_LANGS export
// ============================================================================
console.log('\n── SUPPORTED_LANGS ───────────────────────────────────────');

assertEq(SUPPORTED_LANGS, ['el', 'ru', 'ro', 'ka'], 'supported langs');

// ============================================================================
// extractPlaceholders (pure)
// ============================================================================
console.log('\n── extractPlaceholders ───────────────────────────────────');

assertEq(extractPlaceholders(''), [], 'empty string → []');
assertEq(extractPlaceholders(null), [], 'null → []');
assertEq(extractPlaceholders(undefined), [], 'undefined → []');
assertEq(extractPlaceholders('no placeholders here'), [], 'plain text → []');
assertEq(extractPlaceholders('Hello {name}'), ['{name}'], 'single placeholder');
assertEq(
  extractPlaceholders('{year} records, {count} items'),
  ['{count}', '{year}'],
  'multiple, sorted'
);
assertEq(
  extractPlaceholders('{b} {a} {c}'),
  ['{a}', '{b}', '{c}'],
  'alphabetical sort'
);
// Underscore placeholder
assertEq(extractPlaceholders('{first_name}'), ['{first_name}'], 'snake_case ok');
// Duplicates preserved (it's .match, not a Set)
assertEq(
  extractPlaceholders('{name} and {name}'),
  ['{name}', '{name}'],
  'duplicates preserved in match'
);
// Digits are NOT matched by [a-zA-Z_]+
assertEq(extractPlaceholders('{var1}'), [], 'digit-containing placeholder not matched');

// ============================================================================
// runAudit — unsupported language throws
// ============================================================================
console.log('\n── runAudit: unsupported language ────────────────────────');

{
  let caught: Error | null = null;
  try {
    await runAudit('fr');
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'throws for unsupported lang');
  assert(
    caught !== null && caught.message.includes('Unsupported language code'),
    'error message mentions Unsupported'
  );
  assert(
    caught !== null && caught.message.includes('"fr"'),
    'error includes the bad code'
  );
}

// ============================================================================
// runAudit — happy path: all keys present & correct
// ============================================================================
console.log('\n── runAudit: clean state ─────────────────────────────────');

{
  resetState();
  resetFs();
  scenario = {
    sourceRows: [
      { translation_key: 'home.title', english_text: 'Welcome home', namespace: 'home' },
      { translation_key: 'home.subtitle', english_text: 'Short', namespace: 'home' },
    ],
    localizedRows: [
      { translation_key: 'home.title', translated_text: 'Καλώς ορίσατε', status: 'active' },
      { translation_key: 'home.subtitle', translated_text: 'Short', status: 'active' },
    ],
  };
  const result = await runAudit('el', { includePublicPageScan: false });

  assertEq(result.language, 'el', 'language field');
  assert(typeof result.timestamp === 'string', 'timestamp is ISO string');
  assertEq(result.summary.totalSourceKeys, 2, 'totalSourceKeys');
  assertEq(result.summary.totalLocalizedKeys, 2, 'totalLocalizedKeys');
  assertEq(result.summary.missingLocalized, 0, 'no missing');
  assertEq(result.summary.orphanedLocalized, 0, 'no orphans');
  // "Short" === "Short" but length 5 > 3 → should be flagged
  assertEq(result.summary.identicalToEnglish, 1, 'Short flagged (len 5 > 3)');
  assertEq(result.identicalToEnglishKeys, ['home.subtitle'], 'subtitle flagged');
  assertEq(result.summary.placeholderMismatches, 0, 'no placeholder mismatches');
  assertEq(result.publicPageAudit, null, 'publicPageAudit skipped');
  assertEq(result.summary.publicPageKeysUsed, null, 'summary null when skipped');

  // Verify correct query issued with lang param
  assertEq(queryLog.length, 2, '2 queries (source + localized)');
  assert(/FROM translations_source/.test(queryLog[0].sql), 'first: source');
  assert(/FROM translations_localized/.test(queryLog[1].sql), 'second: localized');
  assertEq(queryLog[1].params, ['el'], 'lang param');
}

// ============================================================================
// runAudit — missing localized keys
// ============================================================================
console.log('\n── runAudit: missing localized ───────────────────────────');

{
  resetState();
  scenario = {
    sourceRows: [
      { translation_key: 'a.key', english_text: 'Alpha' },
      { translation_key: 'b.key', english_text: 'Beta' },
      { translation_key: 'c.key', english_text: 'Gamma' },
    ],
    localizedRows: [
      { translation_key: 'a.key', translated_text: 'Άλφα' },
    ],
  };
  const result = await runAudit('el', { includePublicPageScan: false });
  assertEq(result.summary.missingLocalized, 2, '2 missing');
  assertEq(result.missingLocalizedKeys.sort(), ['b.key', 'c.key'], 'missing keys listed');
}

// ============================================================================
// runAudit — orphaned localized keys
// ============================================================================
console.log('\n── runAudit: orphaned localized ──────────────────────────');

{
  resetState();
  scenario = {
    sourceRows: [
      { translation_key: 'keep.me', english_text: 'Keep' },
    ],
    localizedRows: [
      { translation_key: 'keep.me', translated_text: 'Κρατήστε' },
      { translation_key: 'orphan.one', translated_text: 'Ορφανό 1' },
      { translation_key: 'orphan.two', translated_text: 'Ορφανό 2' },
    ],
  };
  const result = await runAudit('el', { includePublicPageScan: false });
  assertEq(result.summary.orphanedLocalized, 2, '2 orphans');
  assertEq(result.orphanedLocalizedKeys.sort(), ['orphan.one', 'orphan.two'], 'orphans listed');
}

// ============================================================================
// runAudit — identical-to-English only when length > 3
// ============================================================================
console.log('\n── runAudit: identical to English ────────────────────────');

{
  resetState();
  scenario = {
    sourceRows: [
      { translation_key: 'short', english_text: 'OK' },       // len 2 — ignored
      { translation_key: 'border', english_text: 'ABC' },     // len 3 — ignored (not > 3)
      { translation_key: 'flagged', english_text: 'Hello' },  // len 5 — flagged
      { translation_key: 'also', english_text: 'Continue' },  // len 8 — flagged
      { translation_key: 'translated', english_text: 'Accept' }, // translated differently
    ],
    localizedRows: [
      { translation_key: 'short', translated_text: 'OK' },
      { translation_key: 'border', translated_text: 'ABC' },
      { translation_key: 'flagged', translated_text: 'Hello' },
      { translation_key: 'also', translated_text: 'Continue' },
      { translation_key: 'translated', translated_text: 'Αποδέχομαι' },
    ],
  };
  const result = await runAudit('el', { includePublicPageScan: false });
  assertEq(result.summary.identicalToEnglish, 2, '2 flagged');
  assertEq(result.identicalToEnglishKeys.sort(), ['also', 'flagged'], 'long matches only');
}

// ============================================================================
// runAudit — placeholder mismatches
// ============================================================================
console.log('\n── runAudit: placeholder mismatches ──────────────────────');

{
  resetState();
  scenario = {
    sourceRows: [
      { translation_key: 'match', english_text: 'Hello {name}, you have {count} items' },
      { translation_key: 'mismatch', english_text: 'Welcome {name}' },
      { translation_key: 'missing_ph', english_text: 'Year {year}' },
      { translation_key: 'no_ph', english_text: 'Simple greeting' },
    ],
    localizedRows: [
      // Same placeholders, different order → should match (both sorted)
      { translation_key: 'match', translated_text: '{count} items for {name}' },
      // Different placeholder name → mismatch
      { translation_key: 'mismatch', translated_text: 'Καλώς ήρθες {user}' },
      // Missing placeholder → mismatch
      { translation_key: 'missing_ph', translated_text: 'Έτος' },
      // No placeholders either side → no mismatch
      { translation_key: 'no_ph', translated_text: 'Απλός χαιρετισμός' },
    ],
  };
  const result = await runAudit('el', { includePublicPageScan: false });
  assertEq(result.summary.placeholderMismatches, 2, '2 mismatches');
  const keys = result.placeholderMismatchKeys.map((p: any) => p.key).sort();
  assertEq(keys, ['mismatch', 'missing_ph'], 'correct keys flagged');
  const mismatchEntry = result.placeholderMismatchKeys.find((p: any) => p.key === 'mismatch');
  assertEq(mismatchEntry.english, ['{name}'], 'english placeholders');
  assertEq(mismatchEntry.localized, ['{user}'], 'localized placeholders');
  const missingEntry = result.placeholderMismatchKeys.find((p: any) => p.key === 'missing_ph');
  assertEq(missingEntry.english, ['{year}'], 'missing_ph english');
  assertEq(missingEntry.localized, [], 'missing_ph localized empty');
}

// ============================================================================
// runAudit — composite scenario with summary sanity
// ============================================================================
console.log('\n── runAudit: composite ───────────────────────────────────');

{
  resetState();
  scenario = {
    sourceRows: [
      { translation_key: 's.only', english_text: 'Source only' },
      { translation_key: 'both.ok', english_text: 'Hello there' },
      { translation_key: 'both.same', english_text: 'Continue' },
      { translation_key: 'both.phmis', english_text: 'You have {count} left' },
    ],
    localizedRows: [
      { translation_key: 'both.ok', translated_text: 'Γεια σου' },
      { translation_key: 'both.same', translated_text: 'Continue' },
      { translation_key: 'both.phmis', translated_text: 'You have left' },
      { translation_key: 'only.loc', translated_text: 'Μόνο τοπικό' },
    ],
  };
  const result = await runAudit('ru', { includePublicPageScan: false });
  assertEq(result.language, 'ru', 'ru');
  assertEq(result.summary.totalSourceKeys, 4, '4 source');
  assertEq(result.summary.totalLocalizedKeys, 4, '4 localized');
  assertEq(result.summary.missingLocalized, 1, '1 missing (s.only)');
  assertEq(result.missingLocalizedKeys, ['s.only'], 's.only missing');
  assertEq(result.summary.orphanedLocalized, 1, '1 orphan (only.loc)');
  assertEq(result.orphanedLocalizedKeys, ['only.loc'], 'only.loc orphan');
  assertEq(result.summary.identicalToEnglish, 1, '1 identical (both.same)');
  assertEq(result.identicalToEnglishKeys, ['both.same'], 'both.same identical');
  assertEq(result.summary.placeholderMismatches, 1, '1 placeholder mismatch');
  assertEq(result.placeholderMismatchKeys[0].key, 'both.phmis', 'correct mismatch key');
}

// ============================================================================
// runAudit — includePublicPageScan default + directory missing → empty scan
// ============================================================================
console.log('\n── runAudit: publicPageScan fs missing ───────────────────');

{
  resetState();
  resetFs();
  // existsSync defaults to false for all paths — scanner walks zero dirs
  scenario = {
    sourceRows: [{ translation_key: 'a', english_text: 'A' }],
    localizedRows: [{ translation_key: 'a', translated_text: 'Α' }],
  };
  const result = await runAudit('el'); // default includePublicPageScan=true
  assert(result.publicPageAudit !== null, 'publicPageAudit present');
  assertEq(result.publicPageAudit.totalKeysUsed, 0, '0 keys used (no dirs exist)');
  assertEq(result.publicPageAudit.missingInSource, [], 'none missing in source');
  assertEq(result.publicPageAudit.missingInLocalized, [], 'none missing in localized');
  assertEq(result.summary.publicPageKeysUsed, 0, 'summary count');
  assertEq(result.summary.publicPageMissingInSource, 0, 'summary missing-in-source');
  assertEq(result.summary.publicPageMissingInLocalized, 0, 'summary missing-in-localized');
}

// ============================================================================
// runAudit — publicPageScan captures keys from .tsx files
// ============================================================================
console.log('\n── runAudit: publicPageScan with files ───────────────────');

{
  resetState();
  resetFs();
  // Pretend one directory exists and contains two .tsx files
  const sampleFile1 = `
    import { useTranslation } from 'react-i18next';
    export default function A() {
      const { t } = useTranslation();
      return <div>{t('home.title')}</div>;
    }
  `;
  const sampleFile2 = `
    export default function B() {
      return <div>{t('home.missing')}</div>;
    }
  `;

  existsSyncImpl = (p: string) => p.includes('frontend-pages');
  readdirSyncImpl = (p: string) => {
    if (p.includes('frontend-pages')) return ['A.tsx', 'B.tsx', 'notes.md'];
    return [];
  };
  readFileSyncImpl = (p: string) => {
    if (p.endsWith('A.tsx')) return sampleFile1;
    if (p.endsWith('B.tsx')) return sampleFile2;
    return '';
  };

  scenario = {
    sourceRows: [
      { translation_key: 'home.title', english_text: 'Home' },
    ],
    localizedRows: [
      // home.title missing from localized
    ],
  };
  const result = await runAudit('el');
  assert(result.publicPageAudit !== null, 'audit object returned');
  // Scanner found both keys
  assert(result.publicPageAudit.totalKeysUsed >= 2, 'found ≥2 keys from fake .tsx');
  // home.missing is not in source
  assert(
    result.publicPageAudit.missingInSource.includes('home.missing'),
    'home.missing flagged as missing in source'
  );
  // home.title is in source but not localized
  assert(
    result.publicPageAudit.missingInLocalized.includes('home.title'),
    'home.title flagged as missing in localized'
  );
}

// ============================================================================
// runAudit — publicPageScan error → error field populated
// ============================================================================
console.log('\n── runAudit: publicPageScan error ────────────────────────');

{
  resetState();
  resetFs();
  existsSyncImpl = () => { throw new Error('fs blew up'); };
  scenario = {
    sourceRows: [{ translation_key: 'a', english_text: 'A' }],
    localizedRows: [{ translation_key: 'a', translated_text: 'Α' }],
  };
  const result = await runAudit('el');
  assert(result.publicPageAudit !== null, 'publicPageAudit present');
  assert(
    typeof result.publicPageAudit.error === 'string',
    'error field present'
  );
  assert(
    result.publicPageAudit.error.includes('fs blew up'),
    'error message preserved'
  );
}

// ============================================================================
// runAuditAll
// ============================================================================
console.log('\n── runAuditAll ───────────────────────────────────────────');

{
  resetState();
  resetFs();
  scenario = {
    sourceRows: [{ translation_key: 'a', english_text: 'A' }],
    localizedRows: [{ translation_key: 'a', translated_text: 'A' }],
  };
  const results = await runAuditAll();
  assertEq(results.length, SUPPORTED_LANGS.length, '4 results');
  // Each should carry the right lang field in order
  for (let i = 0; i < SUPPORTED_LANGS.length; i++) {
    assertEq(results[i].language, SUPPORTED_LANGS[i], `result ${i} lang = ${SUPPORTED_LANGS[i]}`);
  }
}

// ============================================================================
// Summary
// ============================================================================
disableFs();
// Restore original fs methods
fs.existsSync = origExistsSync;
fs.readdirSync = origReaddirSync;
fs.readFileSync = origReadFileSync;

console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
