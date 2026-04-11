#!/usr/bin/env npx tsx
/**
 * Unit tests for services/i18nAuditService.js (OMD-1227)
 *
 * Deterministic translation audit service. Reads from translations_source
 * and translations_localized; also scans frontend .tsx files for t('key')
 * calls to validate public-page coverage.
 *
 * Strategy:
 *   - Stub ../config/db (getAppPool → fake pool with regex-keyed responders)
 *   - Stub fs.readdirSync / fs.readFileSync / fs.existsSync to simulate a
 *     tiny, in-memory frontend tree without touching the real filesystem.
 *   - Dual .js + .ts require.cache installation (tsx can resolve either).
 *
 * Coverage:
 *   - extractPlaceholders (pure): empty, none, single, multiple, sorted
 *   - scanPublicPageKeys: finds t('key') in .tsx files, dedupes, sorts
 *   - runAudit:
 *       · invalid language → throws
 *       · empty DB → zero missing/orphaned/identical/placeholder
 *       · missingLocalized (source has key, no localized row)
 *       · orphanedLocalized (localized row with no source)
 *       · identical-to-English (length > 3)
 *       · identical-to-English ignored when length <= 3
 *       · placeholder mismatch (different token sets)
 *       · placeholder match (same tokens → not flagged)
 *       · publicPageAudit: missing in source / missing in localized
 *       · includePublicPageScan=false skips scan
 *       · summary counts match arrays
 *   - runAuditAll: iterates SUPPORTED_LANGS
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

// ── config/db stub ───────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];
let sourceRows: any[] = [];
let localizedRows: any[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (/FROM translations_source/i.test(sql)) return [sourceRows];
    if (/FROM translations_localized/i.test(sql)) return [localizedRows];
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
const path = require('path');
const dbDir = path.resolve(__dirname, '..', '..', 'config');
for (const ext of ['.js', '.ts']) {
  const p = path.join(dbDir, 'db' + ext);
  require.cache[p] = { id: p, filename: p, loaded: true, exports: dbStub } as any;
}

// ── fs stub (installed BEFORE SUT require) ───────────────────────────
//
// The SUT's scanPublicPageKeys walks a frontend directory that actually
// exists on disk. We cannot let real readdirSync return real files — that
// would make the test non-deterministic. Instead we intercept ANY path
// under the computed `sutFrontendSrc` root and serve only the in-memory
// fake tree. Paths outside that root fall through to real fs.
const realFs = require('fs');
type FakeFile = { path: string; content: string };
let fakeFiles: FakeFile[] = [];
let fakeDirs: Set<string> = new Set();

// Resolved below after we compute sutFrontendSrc
let sutFrontendSrcForStub = '';
function underFrontend(p: string): boolean {
  return sutFrontendSrcForStub !== '' && p.startsWith(sutFrontendSrcForStub);
}

const fsStub = {
  ...realFs,
  existsSync: (p: string): boolean => {
    if (underFrontend(p)) return fakeDirs.has(p);
    try { return realFs.existsSync(p); } catch { return false; }
  },
  readdirSync: (p: string, ...rest: any[]): any => {
    if (underFrontend(p)) {
      if (!fakeDirs.has(p)) return [];
      return fakeFiles
        .filter(f => path.dirname(f.path) === p)
        .map(f => path.basename(f.path));
    }
    return realFs.readdirSync(p, ...rest);
  },
  readFileSync: (p: string, enc?: any): any => {
    if (underFrontend(p)) {
      const match = fakeFiles.find(f => f.path === p);
      if (match) return match.content;
      return '';
    }
    return realFs.readFileSync(p, enc);
  },
};

const fsPath = require.resolve('fs');
require.cache[fsPath] = { id: fsPath, filename: fsPath, loaded: true, exports: fsStub } as any;

function resetState() {
  queryLog.length = 0;
  sourceRows = [];
  localizedRows = [];
  fakeFiles = [];
  fakeDirs = new Set();
}

// Silence
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
// extractPlaceholders (pure)
// ============================================================================
console.log('\n── extractPlaceholders ────────────────────────────────────');

assertEq(extractPlaceholders(''), [], 'empty string → []');
assertEq(extractPlaceholders(null), [], 'null → []');
assertEq(extractPlaceholders(undefined), [], 'undefined → []');
assertEq(extractPlaceholders('Hello world'), [], 'no tokens → []');
assertEq(extractPlaceholders('Hello {name}'), ['{name}'], 'single token');
assertEq(
  extractPlaceholders('Hi {name}, you have {count} new items'),
  ['{count}', '{name}'],
  'multiple tokens sorted'
);
assertEq(
  extractPlaceholders('{year} / {name} / {year}'),
  ['{name}', '{year}', '{year}'],
  'duplicates preserved (sorted)'
);
// Underscore allowed in names
assertEq(
  extractPlaceholders('User {user_name} on {event_date}'),
  ['{event_date}', '{user_name}'],
  'underscore tokens'
);
// Digits / hyphens should NOT match per PLACEHOLDER_RE
assertEq(extractPlaceholders('Number: {123}'), [], 'digits-only not matched');
assertEq(extractPlaceholders('Foo: {bar-baz}'), [], 'hyphen not matched');

// ============================================================================
// SUPPORTED_LANGS exported
// ============================================================================
console.log('\n── SUPPORTED_LANGS ────────────────────────────────────────');
assertEq(SUPPORTED_LANGS, ['el', 'ru', 'ro', 'ka'], 'supported languages');

// ============================================================================
// runAudit: invalid language
// ============================================================================
console.log('\n── runAudit: invalid language ─────────────────────────────');

resetState();
{
  let err: Error | null = null;
  try { await runAudit('xx'); } catch (e: any) { err = e; }
  assert(err !== null, 'invalid lang throws');
  assert(err !== null && /Unsupported language/.test(err.message), 'error mentions unsupported');
}

// ============================================================================
// runAudit: empty DB, no public-page scan
// ============================================================================
console.log('\n── runAudit: empty DB ─────────────────────────────────────');

resetState();
sourceRows = [];
localizedRows = [];
{
  const r = await runAudit('ka', { includePublicPageScan: false });
  assertEq(r.language, 'ka', 'language in result');
  assertEq(r.summary.totalSourceKeys, 0, '0 source');
  assertEq(r.summary.totalLocalizedKeys, 0, '0 localized');
  assertEq(r.summary.missingLocalized, 0, '0 missing');
  assertEq(r.summary.orphanedLocalized, 0, '0 orphaned');
  assertEq(r.summary.identicalToEnglish, 0, '0 identical');
  assertEq(r.summary.placeholderMismatches, 0, '0 mismatches');
  assertEq(r.publicPageAudit, null, 'public-page scan skipped');
  assertEq(r.missingLocalizedKeys, [], 'arrays empty');
  assertEq(r.orphanedLocalizedKeys, [], 'arrays empty');
  assertEq(r.identicalToEnglishKeys, [], 'arrays empty');
  assertEq(r.placeholderMismatchKeys, [], 'arrays empty');
}

// ============================================================================
// runAudit: missingLocalized
// ============================================================================
console.log('\n── runAudit: missing localized ────────────────────────────');

resetState();
sourceRows = [
  { translation_key: 'a.b', english_text: 'Hello', namespace: 'ns' },
  { translation_key: 'a.c', english_text: 'World', namespace: 'ns' },
];
localizedRows = [
  { translation_key: 'a.b', translated_text: 'გამარჯობა', status: 'verified' },
  // a.c missing
];
{
  const r = await runAudit('ka', { includePublicPageScan: false });
  assertEq(r.summary.missingLocalized, 1, '1 missing');
  assertEq(r.missingLocalizedKeys, ['a.c'], 'correct missing key');
  assertEq(r.summary.totalSourceKeys, 2, '2 source total');
  assertEq(r.summary.totalLocalizedKeys, 1, '1 localized total');
}

// ============================================================================
// runAudit: orphanedLocalized
// ============================================================================
console.log('\n── runAudit: orphaned localized ───────────────────────────');

resetState();
sourceRows = [
  { translation_key: 'a.b', english_text: 'Hello', namespace: 'ns' },
];
localizedRows = [
  { translation_key: 'a.b', translated_text: 'გამარჯობა', status: 'verified' },
  { translation_key: 'zombie', translated_text: 'orphaned', status: 'verified' },
];
{
  const r = await runAudit('ka', { includePublicPageScan: false });
  assertEq(r.summary.orphanedLocalized, 1, '1 orphaned');
  assertEq(r.orphanedLocalizedKeys, ['zombie'], 'correct orphan key');
}

// ============================================================================
// runAudit: identical-to-English (length > 3)
// ============================================================================
console.log('\n── runAudit: identical-to-English ─────────────────────────');

resetState();
sourceRows = [
  { translation_key: 'long.same', english_text: 'Greetings', namespace: 'ns' },
  { translation_key: 'short.same', english_text: 'Hi', namespace: 'ns' },  // length 2 → ignored
  { translation_key: 'diff', english_text: 'Bonjour', namespace: 'ns' },
];
localizedRows = [
  { translation_key: 'long.same', translated_text: 'Greetings', status: 'verified' },
  { translation_key: 'short.same', translated_text: 'Hi', status: 'verified' },
  { translation_key: 'diff', translated_text: 'გამარჯობა', status: 'verified' },
];
{
  const r = await runAudit('ka', { includePublicPageScan: false });
  assertEq(r.summary.identicalToEnglish, 1, '1 identical (length > 3)');
  assertEq(r.identicalToEnglishKeys, ['long.same'], 'only long key flagged');
}

// ============================================================================
// runAudit: placeholder mismatch / match
// ============================================================================
console.log('\n── runAudit: placeholder mismatches ───────────────────────');

resetState();
sourceRows = [
  { translation_key: 'greet.user', english_text: 'Hi {name}, {count} new', namespace: 'ns' },
  { translation_key: 'ok.match', english_text: 'Count: {n}', namespace: 'ns' },
  { translation_key: 'extra', english_text: 'Static', namespace: 'ns' },
];
localizedRows = [
  // Missing {count}
  { translation_key: 'greet.user', translated_text: 'გამარჯობა {name}', status: 'verified' },
  // Same placeholder
  { translation_key: 'ok.match', translated_text: 'რაოდენობა: {n}', status: 'verified' },
  // Static text, no placeholders on either side → no mismatch
  { translation_key: 'extra', translated_text: 'სტატიკური', status: 'verified' },
];
{
  const r = await runAudit('ka', { includePublicPageScan: false });
  assertEq(r.summary.placeholderMismatches, 1, '1 mismatch');
  assertEq(r.placeholderMismatchKeys.length, 1, 'array length 1');
  assertEq(r.placeholderMismatchKeys[0].key, 'greet.user', 'correct key');
  assertEq(r.placeholderMismatchKeys[0].english, ['{count}', '{name}'], 'english tokens');
  assertEq(r.placeholderMismatchKeys[0].localized, ['{name}'], 'localized tokens');
}

// ============================================================================
// runAudit: public-page scan
// ============================================================================
console.log('\n── runAudit: public-page scan ─────────────────────────────');

resetState();
// The SUT computes frontendSrc from __dirname of i18nAuditService.js:
//   path.resolve(__dirname, '..', '..', '..', 'front-end', 'src')
// We compute the exact same path here and tell the fs stub to sandbox it.
const sutFrontendSrc = path.resolve(
  path.join(path.dirname(require.resolve('../i18nAuditService')), '..', '..', '..'),
  'front-end', 'src'
);
sutFrontendSrcForStub = sutFrontendSrc;
const scanDir = path.join(sutFrontendSrc, 'features/pages/frontend-pages');
fakeDirs.add(scanDir);
fakeFiles.push({
  path: path.join(scanDir, 'Home.tsx'),
  content: `
    import { useTranslation } from 'react-i18next';
    const { t } = useTranslation();
    return <>
      <h1>{t('home.title')}</h1>
      <p>{t('home.subtitle')}</p>
      <p>{t('common.hello')}</p>
    </>;
  `,
});
fakeFiles.push({
  path: path.join(scanDir, 'About.tsx'),
  content: `
    const title = t("about.title");  // double quotes
    return <p>{t('home.title')}</p>;  // duplicate
  `,
});

sourceRows = [
  { translation_key: 'home.title', english_text: 'Home', namespace: 'home' },
  { translation_key: 'home.subtitle', english_text: 'Welcome', namespace: 'home' },
  // about.title and common.hello missing from source
];
localizedRows = [
  { translation_key: 'home.title', translated_text: 'მთავარი', status: 'verified' },
  // home.subtitle missing from localized
];
{
  const r = await runAudit('ka', { includePublicPageScan: true });
  assert(r.publicPageAudit !== null, 'public page audit present');
  assertEq(r.publicPageAudit.totalKeysUsed, 4, '4 unique keys used');
  // missing in source: about.title, common.hello
  assertEq(
    r.publicPageAudit.missingInSource.sort(),
    ['about.title', 'common.hello'],
    'missing-in-source'
  );
  // missing in localized: home.subtitle (in source but not localized)
  assertEq(
    r.publicPageAudit.missingInLocalized,
    ['home.subtitle'],
    'missing-in-localized'
  );
  assertEq(r.summary.publicPageKeysUsed, 4, 'summary publicPageKeysUsed');
  assertEq(r.summary.publicPageMissingInSource, 2, 'summary public-missing-source');
  assertEq(r.summary.publicPageMissingInLocalized, 1, 'summary public-missing-localized');
}

// ============================================================================
// runAudit: includePublicPageScan=false
// ============================================================================
console.log('\n── runAudit: public-page scan disabled ────────────────────');

resetState();
sourceRows = [{ translation_key: 'a', english_text: 'X', namespace: 'ns' }];
localizedRows = [{ translation_key: 'a', translated_text: 'Y', status: 'verified' }];
{
  const r = await runAudit('el', { includePublicPageScan: false });
  assertEq(r.publicPageAudit, null, 'publicPageAudit null');
  assertEq(r.summary.publicPageKeysUsed, null, 'summary publicPageKeysUsed null');
  assertEq(r.summary.publicPageMissingInSource, null, 'summary publicPageMissingInSource null');
  assertEq(r.summary.publicPageMissingInLocalized, null, 'summary publicPageMissingInLocalized null');
}

// ============================================================================
// scanPublicPageKeys (direct)
// ============================================================================
console.log('\n── scanPublicPageKeys direct ──────────────────────────────');

resetState();
const scanDir2 = path.join(sutFrontendSrc, 'features/auth/authentication');
fakeDirs.add(scanDir2);
fakeFiles.push({
  path: path.join(scanDir2, 'Login.tsx'),
  content: `t('auth.login'); t('auth.login'); t('auth.logout');`,
});
{
  const keys = scanPublicPageKeys();
  // Should include auth.login + auth.logout (dedupe), sorted
  assert(keys.includes('auth.login'), 'includes auth.login');
  assert(keys.includes('auth.logout'), 'includes auth.logout');
  // Deduped
  const loginCount = keys.filter((k: string) => k === 'auth.login').length;
  assertEq(loginCount, 1, 'dedupes');
  // Sorted
  const sorted = [...keys].sort();
  assertEq(keys, sorted, 'sorted output');
}

// ============================================================================
// runAuditAll: iterates all supported languages
// ============================================================================
console.log('\n── runAuditAll ────────────────────────────────────────────');

resetState();
sourceRows = [{ translation_key: 'k', english_text: 'V', namespace: 'n' }];
localizedRows = [];
{
  const results = await runAuditAll();
  assertEq(results.length, 4, '4 language results');
  const langs = results.map((r: any) => r.language);
  assertEq(langs, ['el', 'ru', 'ro', 'ka'], 'all langs in order');
  for (const r of results) {
    assertEq(r.summary.missingLocalized, 1, `${r.language}: 1 missing`);
  }
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

}

main().catch((e) => {
  loud();
  console.error('Unhandled:', e);
  process.exit(1);
});
