#!/usr/bin/env npx tsx
/**
 * Unit tests for services/i18nAuditService.js (OMD-1149)
 *
 * Read-only audit of the DB-backed i18n system. Dependencies:
 *   - `../config/db.getAppPool`: scripted translations_source +
 *        translations_localized queries
 *   - `fs`: virtual FS map for scanPublicPageKeys
 *   - `path`: untouched (real implementation)
 *
 * Strategy: stub db + fs via require.cache BEFORE requiring SUT.
 * For fs we layer over the real module so untouched fs methods still
 * work (path normalization, etc.).
 *
 * Coverage:
 *   - Exports + SUPPORTED_LANGS constant
 *   - extractPlaceholders: empty/null/no placeholders/single/multi/
 *                          sorted output/underscored names
 *   - scanPublicPageKeys: missing dirs tolerated; non-tsx/ts skipped;
 *                         deduped; sorted; keys extracted from t('...')
 *   - runAudit:
 *       · unsupported lang → throws
 *       · all the branches (missing, orphan, identical, placeholder)
 *       · public-page scan included / skipped by option
 *       · scan failure wrapped as publicPageAudit.error
 *       · summary counts correct
 *   - runAuditAll: iterates all supported langs
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

// ── db stub ──────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

let sourceRows: any[] = [];
let localizedRowsByLang: Record<string, any[]> = {};
let throwOnSourceQuery = false;
let throwOnLocalizedQuery = false;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (/FROM translations_source/i.test(sql)) {
      if (throwOnSourceQuery) throw new Error('source query failed');
      return [sourceRows];
    }
    if (/FROM translations_localized/i.test(sql)) {
      if (throwOnLocalizedQuery) throw new Error('localized query failed');
      const lang = params[0];
      return [localizedRowsByLang[lang] || []];
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: dbStub,
} as any;

// ── fs stub (layered over real fs) ──────────────────────────────────
// Map absolute path → content (for files)
// Map absolute path → string[] (for dirs)
const virtualFiles = new Map<string, string>();
const virtualDirs = new Map<string, string[]>();
let throwOnFsPattern: RegExp | null = null;

const realFs = require('fs');

const fsStub = {
  ...realFs,
  existsSync: (p: string) => {
    if (virtualDirs.has(p) || virtualFiles.has(p)) return true;
    // Absent paths return false, rather than delegating to real fs
    return false;
  },
  readdirSync: (p: string) => {
    if (throwOnFsPattern && throwOnFsPattern.test(p)) {
      throw new Error('fake readdirSync failure');
    }
    if (virtualDirs.has(p)) return virtualDirs.get(p);
    throw new Error(`ENOENT: ${p}`);
  },
  readFileSync: (p: string, _enc?: string) => {
    if (virtualFiles.has(p)) return virtualFiles.get(p);
    throw new Error(`ENOENT: ${p}`);
  },
};

const fsPath = require.resolve('fs');
require.cache[fsPath] = {
  id: fsPath,
  filename: fsPath,
  loaded: true,
  exports: fsStub,
} as any;

// ── helpers ──────────────────────────────────────────────────────────
function resetState() {
  queryLog.length = 0;
  sourceRows = [];
  localizedRowsByLang = {};
  throwOnSourceQuery = false;
  throwOnLocalizedQuery = false;
  virtualFiles.clear();
  virtualDirs.clear();
  throwOnFsPattern = null;
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

// Compute the resolved frontend src path as the SUT does.
const path = require('path');
const sutFile = require.resolve('../i18nAuditService');
const frontendSrc = path.resolve(path.dirname(sutFile), '..', '..', '..', 'front-end', 'src');

async function main() {

// ============================================================================
// Exports + constants
// ============================================================================
console.log('\n── Exports + constants ───────────────────────────────────');

assertEq(SUPPORTED_LANGS, ['el', 'ru', 'ro', 'ka'], 'SUPPORTED_LANGS');
assert(typeof runAudit === 'function', 'runAudit exported');
assert(typeof runAuditAll === 'function', 'runAuditAll exported');
assert(typeof scanPublicPageKeys === 'function', 'scanPublicPageKeys exported');
assert(typeof extractPlaceholders === 'function', 'extractPlaceholders exported');

// ============================================================================
// extractPlaceholders
// ============================================================================
console.log('\n── extractPlaceholders ───────────────────────────────────');

assertEq(extractPlaceholders(''), [], 'empty string → []');
assertEq(extractPlaceholders(null), [], 'null → []');
assertEq(extractPlaceholders(undefined), [], 'undefined → []');
assertEq(extractPlaceholders('no placeholders'), [], 'no placeholders');
assertEq(extractPlaceholders('Hello {name}'), ['{name}'], 'single placeholder');
assertEq(extractPlaceholders('Hi {first} {last}'), ['{first}', '{last}'], 'multiple');
// Sorted output
assertEq(extractPlaceholders('{z} {a} {m}'), ['{a}', '{m}', '{z}'], 'sorted');
// Underscored placeholders
assertEq(extractPlaceholders('{first_name} sent {file_count}'), ['{file_count}', '{first_name}'], 'underscored names');
// Non-letter placeholders skipped
assertEq(extractPlaceholders('{123} and {valid}'), ['{valid}'], 'numeric placeholder skipped');
// Duplicates preserved (then sorted)
assertEq(extractPlaceholders('{a} {a} {b}'), ['{a}', '{a}', '{b}'], 'duplicates preserved');

// ============================================================================
// scanPublicPageKeys — empty (no dirs)
// ============================================================================
console.log('\n── scanPublicPageKeys: empty ─────────────────────────────');

resetState();
{
  // No virtualDirs set → existsSync returns false for all → empty result
  const keys = scanPublicPageKeys();
  assertEq(keys, [], 'no dirs → empty result');
}

// ============================================================================
// scanPublicPageKeys — extracts keys, dedupes, sorts
// ============================================================================
console.log('\n── scanPublicPageKeys: extraction ────────────────────────');

resetState();
{
  const dir1 = path.join(frontendSrc, 'features/pages/frontend-pages');
  const dir2 = path.join(frontendSrc, 'components/frontend-pages/homepage');

  virtualDirs.set(dir1, ['Home.tsx', 'About.ts', 'readme.md']); // readme skipped
  virtualDirs.set(dir2, ['Banner.tsx']);

  virtualFiles.set(path.join(dir1, 'Home.tsx'), `
    import { useTranslation } from 'react-i18next';
    const f = () => t('home.title');
    const g = () => t("home.subtitle");
    const h = () => t('home.title'); // duplicate
  `);
  virtualFiles.set(path.join(dir1, 'About.ts'), `
    const x = t('about.intro');
  `);
  virtualFiles.set(path.join(dir1, 'readme.md'), 'not scanned');
  virtualFiles.set(path.join(dir2, 'Banner.tsx'), `
    t('home.cta.text')
    t('home.title') // duplicate across files
  `);

  const keys = scanPublicPageKeys();
  // Should contain 4 unique keys, sorted
  assertEq(keys, ['about.intro', 'home.cta.text', 'home.subtitle', 'home.title'], 'keys extracted + sorted + deduped');
}

// Malformed keys (no dot) are not matched by the pattern
resetState();
{
  const dir = path.join(frontendSrc, 'features/pages/frontend-pages');
  virtualDirs.set(dir, ['Bad.tsx']);
  virtualFiles.set(path.join(dir, 'Bad.tsx'), `t('nodotkey') t('good.key')`);
  const keys = scanPublicPageKeys();
  assertEq(keys, ['good.key'], 'only keys with dot matched');
}

// ============================================================================
// runAudit — unsupported language
// ============================================================================
console.log('\n── runAudit: unsupported lang ────────────────────────────');

resetState();
{
  let caught: Error | null = null;
  try {
    await runAudit('xx');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'unsupported lang throws');
  assert(caught !== null && caught.message.includes('xx'), 'error includes lang');
}

// ============================================================================
// runAudit — all clean (identical keys, matching placeholders)
// ============================================================================
console.log('\n── runAudit: all clean ───────────────────────────────────');

resetState();
sourceRows = [
  { translation_key: 'k1', english_text: 'Hello', namespace: 'common' },
  { translation_key: 'k2', english_text: 'Welcome {name}', namespace: 'common' },
];
localizedRowsByLang = {
  el: [
    { translation_key: 'k1', translated_text: 'Γεια', status: 'translated' },
    { translation_key: 'k2', translated_text: 'Καλώς {name}', status: 'translated' },
  ],
};
{
  const r = await runAudit('el', { includePublicPageScan: false });
  assertEq(r.language, 'el', 'language');
  assertEq(r.summary.totalSourceKeys, 2, '2 source keys');
  assertEq(r.summary.totalLocalizedKeys, 2, '2 localized keys');
  assertEq(r.summary.missingLocalized, 0, 'none missing');
  assertEq(r.summary.orphanedLocalized, 0, 'none orphaned');
  assertEq(r.summary.identicalToEnglish, 0, 'none identical');
  assertEq(r.summary.placeholderMismatches, 0, 'no mismatches');
  assertEq(r.publicPageAudit, null, 'publicPageAudit skipped');
  assertEq(r.summary.publicPageKeysUsed, null, 'null when skipped');
  assert(typeof r.timestamp === 'string', 'timestamp set');
}

// ============================================================================
// runAudit — missing localized
// ============================================================================
console.log('\n── runAudit: missing localized ───────────────────────────');

resetState();
sourceRows = [
  { translation_key: 'a', english_text: 'A', namespace: 'n' },
  { translation_key: 'b', english_text: 'B', namespace: 'n' },
  { translation_key: 'c', english_text: 'C', namespace: 'n' },
];
localizedRowsByLang = {
  ka: [{ translation_key: 'a', translated_text: 'A-ka', status: 'translated' }],
};
{
  const r = await runAudit('ka', { includePublicPageScan: false });
  assertEq(r.summary.missingLocalized, 2, '2 missing');
  assertEq(r.missingLocalizedKeys.sort(), ['b', 'c'], 'b and c missing');
}

// ============================================================================
// runAudit — orphaned localized
// ============================================================================
console.log('\n── runAudit: orphaned localized ──────────────────────────');

resetState();
sourceRows = [{ translation_key: 'a', english_text: 'A', namespace: 'n' }];
localizedRowsByLang = {
  ru: [
    { translation_key: 'a', translated_text: 'A-ru', status: 'translated' },
    { translation_key: 'orphan1', translated_text: 'O1', status: 'translated' },
    { translation_key: 'orphan2', translated_text: 'O2', status: 'translated' },
  ],
};
{
  const r = await runAudit('ru', { includePublicPageScan: false });
  assertEq(r.summary.orphanedLocalized, 2, '2 orphaned');
  assertEq(r.orphanedLocalizedKeys.sort(), ['orphan1', 'orphan2'], 'orphan list');
}

// ============================================================================
// runAudit — identical-to-English
// ============================================================================
console.log('\n── runAudit: identical-to-English ────────────────────────');

resetState();
sourceRows = [
  { translation_key: 'long', english_text: 'Hello World', namespace: 'n' },
  { translation_key: 'short', english_text: 'Hi', namespace: 'n' },     // < 4 chars, not flagged
  { translation_key: 'symb', english_text: 'NO!', namespace: 'n' },     // 3 chars, not flagged
  { translation_key: 'ok', english_text: 'Goodbye', namespace: 'n' },
];
localizedRowsByLang = {
  ro: [
    { translation_key: 'long', translated_text: 'Hello World', status: 'translated' },  // identical + long
    { translation_key: 'short', translated_text: 'Hi', status: 'translated' },           // identical but short
    { translation_key: 'symb', translated_text: 'NO!', status: 'translated' },           // identical but <=3
    { translation_key: 'ok', translated_text: 'La revedere', status: 'translated' },     // different
  ],
};
{
  const r = await runAudit('ro', { includePublicPageScan: false });
  assertEq(r.summary.identicalToEnglish, 1, 'only 1 identical flagged');
  assertEq(r.identicalToEnglishKeys, ['long'], 'only long key flagged');
}

// ============================================================================
// runAudit — placeholder mismatch
// ============================================================================
console.log('\n── runAudit: placeholder mismatch ────────────────────────');

resetState();
sourceRows = [
  { translation_key: 'ok', english_text: 'Hi {name}', namespace: 'n' },
  { translation_key: 'mismatch', english_text: 'Hi {name} ({count})', namespace: 'n' },
  { translation_key: 'swapped', english_text: 'From {a} to {b}', namespace: 'n' },
];
localizedRowsByLang = {
  el: [
    { translation_key: 'ok', translated_text: 'Γεια {name}', status: 'translated' },
    { translation_key: 'mismatch', translated_text: 'Γεια {name}', status: 'translated' }, // missing {count}
    { translation_key: 'swapped', translated_text: 'Από {b} σε {a}', status: 'translated' }, // same set, different order
  ],
};
{
  const r = await runAudit('el', { includePublicPageScan: false });
  assertEq(r.summary.placeholderMismatches, 1, 'only 1 true mismatch');
  assertEq(r.placeholderMismatchKeys.length, 1, 'one entry');
  assertEq(r.placeholderMismatchKeys[0].key, 'mismatch', 'key identified');
  assertEq(r.placeholderMismatchKeys[0].english, ['{count}', '{name}'], 'english placeholders sorted');
  assertEq(r.placeholderMismatchKeys[0].localized, ['{name}'], 'localized placeholders sorted');
}

// ============================================================================
// runAudit — public page scan included + skipped
// ============================================================================
console.log('\n── runAudit: public page scan ────────────────────────────');

resetState();
sourceRows = [
  { translation_key: 'home.title', english_text: 'Home', namespace: 'common' },
];
localizedRowsByLang = {
  ka: [{ translation_key: 'home.title', translated_text: 'მთავარი', status: 'translated' }],
};

// Set up virtual FS with one public page using an unregistered key
const scanDir = path.join(frontendSrc, 'features/pages/frontend-pages');
virtualDirs.set(scanDir, ['Home.tsx']);
virtualFiles.set(path.join(scanDir, 'Home.tsx'), `
  t('home.title')
  t('home.cta.button')   // not in source
`);

{
  const r = await runAudit('ka'); // default includePublicPageScan = true
  assert(r.publicPageAudit !== null, 'publicPageAudit populated');
  assertEq(r.publicPageAudit.totalKeysUsed, 2, '2 keys scanned');
  assertEq(r.publicPageAudit.missingInSource, ['home.cta.button'], 'missing in source');
  assertEq(r.publicPageAudit.missingInLocalized, [], 'none missing in localized (only home.title is in source)');
  assertEq(r.summary.publicPageKeysUsed, 2, 'summary count');
  assertEq(r.summary.publicPageMissingInSource, 1, 'summary missing in source');
  assertEq(r.summary.publicPageMissingInLocalized, 0, 'summary missing in localized');
}

// Includes missing-in-localized case
resetState();
sourceRows = [
  { translation_key: 'home.title', english_text: 'Home', namespace: 'common' },
  { translation_key: 'home.missing', english_text: 'Missing', namespace: 'common' },
];
localizedRowsByLang = {
  ka: [{ translation_key: 'home.title', translated_text: 'მთავარი', status: 'translated' }],
};
virtualDirs.set(path.join(frontendSrc, 'features/pages/frontend-pages'), ['Home.tsx']);
virtualFiles.set(path.join(frontendSrc, 'features/pages/frontend-pages', 'Home.tsx'), `
  t('home.title')
  t('home.missing')
`);
{
  const r = await runAudit('ka');
  assertEq(r.publicPageAudit.missingInLocalized, ['home.missing'], 'key in source but missing localized');
}

// Scan failure → error captured
resetState();
sourceRows = [];
localizedRowsByLang = { ka: [] };
// Force scanPublicPageKeys to throw by setting a dir that throws
virtualDirs.set(path.join(frontendSrc, 'features/pages/frontend-pages'), ['x.tsx']);
throwOnFsPattern = /features\/pages\/frontend-pages/;
{
  const r = await runAudit('ka');
  assert(r.publicPageAudit.error !== undefined, 'error captured');
  assert(r.publicPageAudit.error.includes('Public page scan failed'), 'error message');
}

// includePublicPageScan: false — skips entirely
resetState();
sourceRows = [];
localizedRowsByLang = { ka: [] };
{
  const r = await runAudit('ka', { includePublicPageScan: false });
  assertEq(r.publicPageAudit, null, 'no public page audit when skipped');
}

// ============================================================================
// runAuditAll
// ============================================================================
console.log('\n── runAuditAll ───────────────────────────────────────────');

resetState();
sourceRows = [{ translation_key: 'k', english_text: 'K', namespace: 'n' }];
localizedRowsByLang = {
  el: [{ translation_key: 'k', translated_text: 'K-el', status: 'translated' }],
  ru: [{ translation_key: 'k', translated_text: 'K-ru', status: 'translated' }],
  ro: [{ translation_key: 'k', translated_text: 'K-ro', status: 'translated' }],
  ka: [{ translation_key: 'k', translated_text: 'K-ka', status: 'translated' }],
};
{
  const results = await runAuditAll();
  assertEq(results.length, 4, '4 languages audited');
  const langs = results.map((r: any) => r.language).sort();
  assertEq(langs, ['el', 'ka', 'ro', 'ru'], 'all langs covered');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
