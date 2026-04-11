#!/usr/bin/env npx tsx
/**
 * Unit tests for services/i18nAuditService.js (OMD-1190)
 *
 * Read-only translation audit against translations_source +
 * translations_localized. Also scans frontend .tsx files for `t('key')`
 * calls (public-page scan).
 *
 * Stubs:
 *   - `../config/db` via require.cache (getAppPool → fake pool)
 *   - `fs` via direct property assignment (existsSync/readdirSync/readFileSync)
 *     so we can exercise scanPublicPageKeys without real disk access
 *
 * Coverage:
 *   - extractPlaceholders (pure): extracts sorted {name} tokens; empty/no-match
 *   - SUPPORTED_LANGS export
 *   - scanPublicPageKeys: collects all t('key') matches across stubbed dirs;
 *                         dedupes + sorts; skips missing dirs
 *   - runAudit:
 *       · invalid language → throws
 *       · missing localized keys
 *       · orphaned localized keys
 *       · identical-to-english (length > 3)
 *       · placeholder mismatches
 *       · public-page scan plumbed into result
 *       · includePublicPageScan=false bypass
 *       · public-page scan error → captured in publicPageAudit.error
 *   - runAuditAll: runs all 4 langs
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

// Two lookup responses keyed by SQL pattern
let sourceRows: any[] = [];
let localizedRows: Record<string, any[]> = {}; // keyed by language code

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (/translations_source/.test(sql)) {
      return [sourceRows];
    }
    if (/translations_localized/.test(sql)) {
      const lang = params[0];
      return [localizedRows[lang] || []];
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };

const nodePath = require('path');
// Resolve SUT module absolute path, then derive config/db path from it
const sutAbs = require.resolve('../i18nAuditService');
const sutDir = nodePath.dirname(sutAbs);          // .../server/src/services
const dbAbs = require.resolve(nodePath.resolve(sutDir, '..', 'config', 'db'));

require.cache[dbAbs] = {
  id: dbAbs,
  filename: dbAbs,
  loaded: true,
  exports: dbStub,
} as any;

// ── fs stub (monkey-patch) ───────────────────────────────────────────
const fs = require('fs');
const origFsExistsSync = fs.existsSync;
const origFsReaddirSync = fs.readdirSync;
const origFsReadFileSync = fs.readFileSync;

let fsDirs: Record<string, string[]> = {};   // dir path → filenames
let fsFiles: Record<string, string> = {};    // file path → content
let fsShouldThrowOnReaddir = false;

// Note: readFileSync must fall through to the real impl for paths we don't
// own, or Node's CJS module loader (which uses fs.readFileSync internally to
// read .js files) will return '' for every module, breaking require().
// existsSync / readdirSync only govern the SUT's public-page scan, so we
// keep them strict: only paths we seeded return results.
fs.existsSync = (p: string) => {
  if (p in fsDirs) return true;
  if (p in fsFiles) return true;
  return false;
};
fs.readdirSync = (p: string) => {
  if (fsShouldThrowOnReaddir && p in fsDirs) throw new Error('readdir blew up');
  return fsDirs[p] || [];
};
fs.readFileSync = (p: string, ...rest: any[]) => {
  if (typeof p === 'string' && p in fsFiles) return fsFiles[p];
  return origFsReadFileSync(p, ...rest);
};

function resetFs() {
  fsDirs = {};
  fsFiles = {};
  fsShouldThrowOnReaddir = false;
}

function resetDb() {
  queryLog.length = 0;
  sourceRows = [];
  localizedRows = {};
}

// ── Require SUT ──────────────────────────────────────────────────────
const {
  runAudit,
  runAuditAll,
  scanPublicPageKeys,
  extractPlaceholders,
  SUPPORTED_LANGS,
} = require('../i18nAuditService');

// Silence noisy logs (there aren't many, but be safe)
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

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

assertEq(extractPlaceholders('Hello {name}, you have {count} messages'), ['{count}', '{name}'], 'sorted placeholders');
assertEq(extractPlaceholders('No placeholders here'), [], 'none');
assertEq(extractPlaceholders(''), [], 'empty string');
assertEq(extractPlaceholders(null), [], 'null input');
assertEq(extractPlaceholders(undefined), [], 'undefined input');
assertEq(extractPlaceholders('{year}'), ['{year}'], 'single placeholder');
assertEq(extractPlaceholders('{a} and {a}'), ['{a}', '{a}'], 'duplicates preserved');
assertEq(extractPlaceholders('{user_name} and {user_id}'), ['{user_id}', '{user_name}'], 'underscores allowed');
assertEq(extractPlaceholders('{123}'), [], 'digits-only not matched');

// ============================================================================
// scanPublicPageKeys
// ============================================================================
console.log('\n── scanPublicPageKeys ────────────────────────────────────');

resetFs();

// Use relative paths — we need to match what the SUT's path.resolve builds.
// SUT: frontendSrc = path.resolve(__dirname, '..', '..', '..', 'front-end', 'src')
// __dirname = .../server/src/services
// resolve → .../front-end/src
const path = require('path');
const frontendSrc = path.resolve(
  require.resolve('../i18nAuditService').replace(/[/\\][^/\\]+$/, ''),
  '..',
  '..',
  '..',
  'front-end',
  'src'
);

// Wire a couple of scan directories
const dir1 = path.join(frontendSrc, 'features/pages/frontend-pages');
const dir2 = path.join(frontendSrc, 'components/frontend-pages/homepage');

fsDirs[dir1] = ['Landing.tsx', 'About.tsx', 'ignore.md'];
fsDirs[dir2] = ['Hero.tsx'];

fsFiles[path.join(dir1, 'Landing.tsx')] = `
import React from 'react';
const Landing = () => (
  <div>
    <h1>{t('landing.hero.title')}</h1>
    <p>{t('landing.hero.subtitle')}</p>
    <span>{t('common.learn_more')}</span>
  </div>
);
`;
fsFiles[path.join(dir1, 'About.tsx')] = `
const About = () => <div>{t("about.title")}</div>;
// Duplicate of one from Landing
const Extra = () => <span>{t('common.learn_more')}</span>;
`;
fsFiles[path.join(dir2, 'Hero.tsx')] = `
<Hero>{t('home.hero.cta')}</Hero>
`;

{
  const keys = scanPublicPageKeys();
  // Dedup + sorted
  const expected = [
    'about.title',
    'common.learn_more',
    'home.hero.cta',
    'landing.hero.subtitle',
    'landing.hero.title',
  ];
  assertEq(keys, expected, 'collected keys deduped + sorted');
}

// Missing dir should be skipped (existsSync returns false)
resetFs();
{
  const keys = scanPublicPageKeys();
  assertEq(keys, [], 'empty when no dirs exist');
}

// ============================================================================
// runAudit — invalid language
// ============================================================================
console.log('\n── runAudit: invalid language ────────────────────────────');

{
  let caught: any = null;
  try { await runAudit('xx'); } catch (e) { caught = e; }
  assert(caught !== null, 'throws on unsupported lang');
  assert(caught && /Unsupported language/.test(caught.message), 'error mentions unsupported');
}

// ============================================================================
// runAudit — missing / orphaned / identical / placeholder mismatch
// ============================================================================
console.log('\n── runAudit: all diff categories ─────────────────────────');

resetDb();
resetFs(); // public-page scan returns empty

sourceRows = [
  { translation_key: 'common.ok', english_text: 'OK', namespace: 'common' },
  { translation_key: 'common.cancel', english_text: 'Cancel', namespace: 'common' },
  { translation_key: 'greeting.hello', english_text: 'Hello {name}', namespace: 'greeting' },
  { translation_key: 'footer.copyright', english_text: 'Copyright {year}', namespace: 'footer' },
  { translation_key: 'msg.short', english_text: 'Hi', namespace: 'msg' }, // length <= 3, skip identical check
];

localizedRows['el'] = [
  // common.ok — present
  { translation_key: 'common.ok', translated_text: 'Εντάξει', status: 'approved' },
  // common.cancel — MISSING (so 'cancel' appears in missingLocalizedKeys)
  // greeting.hello — identical to English (length > 3 → flagged)
  { translation_key: 'greeting.hello', translated_text: 'Hello {name}', status: 'approved' },
  // footer.copyright — placeholder mismatch: missing {year}
  { translation_key: 'footer.copyright', translated_text: 'Πνευματικά δικαιώματα', status: 'approved' },
  // msg.short — identical but length <= 3, should NOT flag
  { translation_key: 'msg.short', translated_text: 'Hi', status: 'approved' },
  // ORPHAN: key exists in localized but not in source
  { translation_key: 'removed.key', translated_text: 'παλιό', status: 'draft' },
];

{
  const result = await runAudit('el', { includePublicPageScan: false });
  assertEq(result.language, 'el', 'language in result');
  assertEq(result.summary.totalSourceKeys, 5, 'source count');
  assertEq(result.summary.totalLocalizedKeys, 5, 'localized count');

  assertEq(result.missingLocalizedKeys, ['common.cancel'], 'missing keys');
  assertEq(result.summary.missingLocalized, 1, 'missing summary');

  assertEq(result.orphanedLocalizedKeys, ['removed.key'], 'orphaned keys');
  assertEq(result.summary.orphanedLocalized, 1, 'orphaned summary');

  assertEq(result.identicalToEnglishKeys, ['greeting.hello'], 'identical keys (length > 3 only)');
  assertEq(result.summary.identicalToEnglish, 1, 'identical summary');

  assertEq(result.placeholderMismatchKeys.length, 1, 'one placeholder mismatch');
  assertEq(result.placeholderMismatchKeys[0].key, 'footer.copyright', 'mismatch key');
  assertEq(result.placeholderMismatchKeys[0].english, ['{year}'], 'english placeholders');
  assertEq(result.placeholderMismatchKeys[0].localized, [], 'localized placeholders empty');

  assertEq(result.publicPageAudit, null, 'publicPageAudit null when skipped');
  assertEq(result.summary.publicPageKeysUsed, null, 'summary publicPageKeysUsed null');
}

// ============================================================================
// runAudit — includePublicPageScan (default) with empty fs
// ============================================================================
console.log('\n── runAudit: public-page scan (empty) ────────────────────');

resetDb();
resetFs();
sourceRows = [{ translation_key: 'a.b', english_text: 'A', namespace: 'a' }];
localizedRows['ru'] = [{ translation_key: 'a.b', translated_text: 'А', status: 'approved' }];

{
  const result = await runAudit('ru');
  assert(result.publicPageAudit !== null, 'publicPageAudit present');
  assertEq(result.publicPageAudit.totalKeysUsed, 0, 'no keys scanned (empty fs)');
  assertEq(result.publicPageAudit.missingInSource, [], 'missingInSource empty');
  assertEq(result.publicPageAudit.missingInLocalized, [], 'missingInLocalized empty');
  assertEq(result.summary.publicPageKeysUsed, 0, 'summary publicPageKeysUsed');
}

// ============================================================================
// runAudit — public-page scan with stubbed directory
// ============================================================================
console.log('\n── runAudit: public-page keys missing ────────────────────');

resetDb();
resetFs();

// Re-wire frontend dir with 3 keys used in pages
fsDirs[dir1] = ['Page.tsx'];
fsFiles[path.join(dir1, 'Page.tsx')] = `
${"`"}t('page.title')${"`"}
{t('page.subtitle')}
{t('page.missing_everywhere')}
`;

sourceRows = [
  { translation_key: 'page.title', english_text: 'Title', namespace: 'page' },
  // 'page.subtitle' missing from source
  // 'page.missing_everywhere' missing from source
];
localizedRows['ro'] = [
  // 'page.title' missing from localized
];

{
  const result = await runAudit('ro');
  assertEq(result.publicPageAudit.totalKeysUsed, 3, 'scanned 3 keys');
  // page.subtitle and page.missing_everywhere are missing in source
  assert(result.publicPageAudit.missingInSource.includes('page.subtitle'), 'missing subtitle in source');
  assert(result.publicPageAudit.missingInSource.includes('page.missing_everywhere'), 'missing _everywhere in source');
  // page.title is in source but missing in localized
  assertEq(result.publicPageAudit.missingInLocalized, ['page.title'], 'missingInLocalized contains page.title only');
  assertEq(result.summary.publicPageMissingInSource, 2, 'summary missingInSource count');
  assertEq(result.summary.publicPageMissingInLocalized, 1, 'summary missingInLocalized count');
}

// ============================================================================
// runAudit — public-page scan error captured
// ============================================================================
console.log('\n── runAudit: public-page scan error ──────────────────────');

resetDb();
resetFs();
sourceRows = [];
localizedRows['ka'] = [];
fsDirs[dir1] = ['Page.tsx']; // triggers existsSync → true, then readdir throws
fsShouldThrowOnReaddir = true;

{
  const result = await runAudit('ka');
  assert(result.publicPageAudit !== null, 'publicPageAudit present');
  assert('error' in result.publicPageAudit, 'error field set');
  assert(
    result.publicPageAudit.error.includes('readdir blew up'),
    'error message preserved'
  );
}

// ============================================================================
// runAuditAll — runs all 4 languages
// ============================================================================
console.log('\n── runAuditAll ───────────────────────────────────────────');

resetDb();
resetFs();
sourceRows = [{ translation_key: 'k', english_text: 'v', namespace: 'ns' }];
// Each language returns empty
localizedRows = { el: [], ru: [], ro: [], ka: [] };

{
  const results = await runAuditAll();
  assertEq(results.length, 4, '4 audits');
  assertEq(results[0].language, 'el', 'el first');
  assertEq(results[1].language, 'ru', 'ru second');
  assertEq(results[2].language, 'ro', 'ro third');
  assertEq(results[3].language, 'ka', 'ka fourth');
  for (const r of results) {
    assertEq(r.summary.missingLocalized, 1, `${r.language}: 1 missing`);
  }
}

// ── Restore fs ───────────────────────────────────────────────────────
fs.existsSync = origFsExistsSync;
fs.readdirSync = origFsReaddirSync;
fs.readFileSync = origFsReadFileSync;

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
