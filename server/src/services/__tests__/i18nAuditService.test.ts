#!/usr/bin/env npx tsx
/**
 * Unit tests for services/i18nAuditService.js (OMD-1091)
 *
 * Read-only translation auditor. Two external deps:
 *   - ../config/db  → getAppPool
 *   - node fs       → used by scanPublicPageKeys (stubbed)
 *
 * Strategy: stub config/db via require.cache with a scriptable pool,
 * and stub fs.existsSync/readdirSync/readFileSync so we can control
 * the public-page scan output without touching the real frontend tree.
 *
 * Coverage:
 *   - extractPlaceholders: empty/null, none, single, multiple, sorted
 *   - SUPPORTED_LANGS: exact list
 *   - scanPublicPageKeys: extracts t('ns.key') calls, dedupes, sorted;
 *                         skips missing directories; ignores non-.tsx/.ts
 *   - runAudit:
 *       · rejects unsupported language
 *       · happy path with mixed keys (missing, orphaned, identical, placeholder)
 *       · includePublicPageScan=false skips scan
 *       · publicPageAudit captures scan errors
 *       · summary counts match detail arrays
 *   - runAuditAll: runs all 4 languages
 *
 * Run: npx tsx server/src/services/__tests__/i18nAuditService.test.ts
 */

import * as pathMod from 'path';
// Use require() so mutations to the fs module are visible to the SUT.
// (import * as fsMod from 'fs' would create an esbuild namespace wrapper.)
const fsMod = require('fs');

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

// ── Fake db pool ─────────────────────────────────────────────────────
let sourceRows: any[] = [];
let localizedRowsByLang: Record<string, any[]> = {};
let queryThrowsOnSource = false;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    if (/FROM translations_source/i.test(sql)) {
      if (queryThrowsOnSource) throw new Error('db fail');
      return [sourceRows, []];
    }
    if (/FROM translations_localized/i.test(sql)) {
      const lang = params[0];
      return [localizedRowsByLang[lang] || [], []];
    }
    return [[], []];
  },
};

const fakeDbModule = { getAppPool: () => fakePool };

// ── Stub modules ─────────────────────────────────────────────────────
function stubModule(relFromSrc: string, exports: any) {
  const absWithoutExt = pathMod.resolve(__dirname, '..', '..', relFromSrc);
  const resolved = require.resolve(absWithoutExt);
  require.cache[resolved] = {
    id: resolved, filename: resolved, loaded: true, exports,
  } as any;
}

stubModule('config/db', fakeDbModule);

// ── fs stubs (monkeypatch in place) ──────────────────────────────────
let fsDirContents: Record<string, string[]> = {}; // dir → file list
let fsFileContents: Record<string, string> = {}; // full path → content
let fsReadThrows = false;

// Scope stubs to front-end/src paths so we don't break tsx/node internals
const origExistsSync = fsMod.existsSync;
const origReaddirSync = fsMod.readdirSync;
const origReadFileSync = fsMod.readFileSync;

function isFrontendPath(p: any): boolean {
  const s = typeof p === 'string' ? p : p.toString();
  return s.includes('front-end/src');
}

(fsMod as any).existsSync = (p: any) => {
  if (isFrontendPath(p)) {
    const s = typeof p === 'string' ? p : p.toString();
    return s in fsDirContents;
  }
  return origExistsSync.call(fsMod, p);
};
(fsMod as any).readdirSync = (p: any, opts?: any) => {
  if (isFrontendPath(p)) {
    const s = typeof p === 'string' ? p : p.toString();
    if (s in fsDirContents) return fsDirContents[s] as any;
    throw new Error(`ENOENT (stub): ${s}`);
  }
  return origReaddirSync.call(fsMod, p, opts as any);
};
(fsMod as any).readFileSync = (p: any, enc?: any) => {
  if (isFrontendPath(p)) {
    if (fsReadThrows) throw new Error('fs read boom');
    const s = typeof p === 'string' ? p : p.toString();
    if (s in fsFileContents) return fsFileContents[s];
    throw new Error(`ENOENT (stub): ${s}`);
  }
  return origReadFileSync.call(fsMod, p, enc);
};

function resetFs() {
  fsDirContents = {};
  fsFileContents = {};
  fsReadThrows = false;
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
// SUPPORTED_LANGS
// ============================================================================
console.log('\n── SUPPORTED_LANGS ───────────────────────────────────────');
assertEq(SUPPORTED_LANGS, ['el', 'ru', 'ro', 'ka'], 'exact list');

// ============================================================================
// extractPlaceholders
// ============================================================================
console.log('\n── extractPlaceholders ───────────────────────────────────');
assertEq(extractPlaceholders(''), [], 'empty string');
assertEq(extractPlaceholders(null), [], 'null input');
assertEq(extractPlaceholders(undefined), [], 'undefined input');
assertEq(extractPlaceholders('Hello world'), [], 'no placeholders');
assertEq(extractPlaceholders('Hello {name}'), ['{name}'], 'single placeholder');
assertEq(
  extractPlaceholders('{b} and {a} with {c}'),
  ['{a}', '{b}', '{c}'],
  'multiple placeholders sorted'
);
assertEq(extractPlaceholders('{user_name} was {last_login}'), ['{last_login}', '{user_name}'], 'underscores allowed sorted');
assertEq(extractPlaceholders('{123}'), [], 'numbers not allowed in placeholder');
assertEq(extractPlaceholders('{name} {name}'), ['{name}', '{name}'], 'duplicates preserved');

// ============================================================================
// scanPublicPageKeys
// ============================================================================
console.log('\n── scanPublicPageKeys ────────────────────────────────────');

// Compute the base directory the SUT uses
const servicesDir = pathMod.resolve(__dirname, '..');
const frontendSrc = pathMod.resolve(servicesDir, '..', '..', '..', 'front-end', 'src');

resetFs();
// Populate one of the scan dirs with a file containing t('foo.bar') calls
const homepageDir = pathMod.join(frontendSrc, 'components/frontend-pages/homepage');
const fileA = pathMod.join(homepageDir, 'A.tsx');
const fileB = pathMod.join(homepageDir, 'B.ts');
const fileC = pathMod.join(homepageDir, 'C.css'); // should be ignored

fsDirContents[homepageDir] = ['A.tsx', 'B.ts', 'C.css'];
fsFileContents[fileA] = `
  const title = t('hero.title');
  const sub = t("hero.subtitle");
  // another: t('hero.title') (dup)
  t('nav.home')
`;
fsFileContents[fileB] = `
  t('footer.copyright');
`;
fsFileContents[fileC] = `body { background: red; } t('should.not.match')`;

{
  const keys = scanPublicPageKeys();
  // Should include all 4 unique keys, sorted
  assert(keys.includes('hero.title'), 'captured hero.title');
  assert(keys.includes('hero.subtitle'), 'captured hero.subtitle (double quotes)');
  assert(keys.includes('nav.home'), 'captured nav.home');
  assert(keys.includes('footer.copyright'), 'captured footer.copyright (.ts file)');
  // CSS file ignored
  assert(!keys.includes('should.not.match'), 'ignored .css extension');
  // Sorted
  const sorted = [...keys].sort();
  assertEq(keys, sorted, 'returned sorted');
  // Dedup: hero.title appears only once
  const titleCount = keys.filter((k: string) => k === 'hero.title').length;
  assertEq(titleCount, 1, 'dedup: hero.title once');
}

// Missing directory just gets skipped (existsSync false)
resetFs();
{
  const keys = scanPublicPageKeys();
  assertEq(keys, [], 'no dirs → empty list');
}

// ============================================================================
// runAudit — unsupported language
// ============================================================================
console.log('\n── runAudit: unsupported language ────────────────────────');

{
  let caught: Error | null = null;
  try {
    await runAudit('fr');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on unsupported lang');
  assert(
    caught !== null && caught.message.includes('Unsupported language'),
    'error mentions unsupported'
  );
}

// ============================================================================
// runAudit — happy path
// ============================================================================
console.log('\n── runAudit: happy path ──────────────────────────────────');

resetFs();
sourceRows = [
  { translation_key: 'hero.title', english_text: 'Welcome home', namespace: 'hero' },
  { translation_key: 'hero.sub', english_text: 'A subtitle', namespace: 'hero' },
  { translation_key: 'form.name', english_text: 'Enter your {name}', namespace: 'form' },
  { translation_key: 'short.id', english_text: 'ID', namespace: 'short' }, // len <=3, won't flag identical
  { translation_key: 'missing.one', english_text: 'I am not localized', namespace: 'missing' },
];
localizedRowsByLang['el'] = [
  { translation_key: 'hero.title', translated_text: 'Καλώς ήρθες', status: 'approved' },
  { translation_key: 'hero.sub', translated_text: 'A subtitle', status: 'approved' }, // identical
  { translation_key: 'form.name', translated_text: 'Πληκτρολογήστε {wrong}', status: 'approved' }, // placeholder mismatch
  { translation_key: 'short.id', translated_text: 'ID', status: 'approved' }, // identical but short → NOT flagged
  { translation_key: 'orphan.key', translated_text: 'Orphan', status: 'approved' }, // orphan
];

quiet();
const r = await runAudit('el', { includePublicPageScan: false });
loud();

assertEq(r.language, 'el', 'language set');
assert(typeof r.timestamp === 'string', 'timestamp is string');

// Summary counts
assertEq(r.summary.totalSourceKeys, 5, 'totalSourceKeys');
assertEq(r.summary.totalLocalizedKeys, 5, 'totalLocalizedKeys');
assertEq(r.summary.missingLocalized, 1, '1 missing localized (missing.one)');
assertEq(r.summary.orphanedLocalized, 1, '1 orphan (orphan.key)');
assertEq(r.summary.identicalToEnglish, 1, '1 identical (hero.sub only; short.id excluded by length)');
assertEq(r.summary.placeholderMismatches, 1, '1 placeholder mismatch');
assertEq(r.summary.publicPageKeysUsed, null, 'publicPageKeysUsed null (scan disabled)');

// Detail arrays
assertEq(r.missingLocalizedKeys, ['missing.one'], 'missing detail');
assertEq(r.orphanedLocalizedKeys, ['orphan.key'], 'orphan detail');
assertEq(r.identicalToEnglishKeys, ['hero.sub'], 'identical detail');
assertEq(r.placeholderMismatchKeys.length, 1, '1 placeholder mismatch entry');
assertEq(r.placeholderMismatchKeys[0].key, 'form.name', 'mismatch key');
assertEq(r.placeholderMismatchKeys[0].english, ['{name}'], 'english placeholders');
assertEq(r.placeholderMismatchKeys[0].localized, ['{wrong}'], 'localized placeholders');
assertEq(r.publicPageAudit, null, 'publicPageAudit null when disabled');

// ============================================================================
// runAudit — with public page scan (succeeds)
// ============================================================================
console.log('\n── runAudit: with public page scan ───────────────────────');

resetFs();
// Minimal source: only one key present
sourceRows = [
  { translation_key: 'hero.title', english_text: 'Hi', namespace: 'hero' },
];
localizedRowsByLang['el'] = [];

// Setup fs: homepage dir contains file referencing 2 keys — one in source, one not
const homeDir2 = pathMod.join(frontendSrc, 'components/frontend-pages/homepage');
const f1 = pathMod.join(homeDir2, 'Home.tsx');
fsDirContents[homeDir2] = ['Home.tsx'];
fsFileContents[f1] = `
  t('hero.title');
  t('orphan.frontend');
`;

quiet();
const r2 = await runAudit('el', { includePublicPageScan: true });
loud();

assert(r2.publicPageAudit !== null, 'publicPageAudit populated');
assertEq(r2.publicPageAudit.totalKeysUsed, 2, '2 keys scanned');
// hero.title is in source → not missingInSource
// orphan.frontend is NOT in source → missingInSource
assert(
  r2.publicPageAudit.missingInSource.includes('orphan.frontend'),
  'orphan.frontend missing in source'
);
assert(
  !r2.publicPageAudit.missingInSource.includes('hero.title'),
  'hero.title not in missingInSource'
);
// hero.title is in source but not in localized → missingInLocalized
assert(
  r2.publicPageAudit.missingInLocalized.includes('hero.title'),
  'hero.title missing in localized'
);
// orphan.frontend is NOT in source → NOT in missingInLocalized (requires sourceMap.has)
assert(
  !r2.publicPageAudit.missingInLocalized.includes('orphan.frontend'),
  'orphan.frontend excluded from missingInLocalized'
);
assertEq(r2.summary.publicPageKeysUsed, 2, 'summary count matches');
assertEq(r2.summary.publicPageMissingInSource, 1, 'summary missingInSource count');
assertEq(r2.summary.publicPageMissingInLocalized, 1, 'summary missingInLocalized count');

// ============================================================================
// runAudit — public page scan error captured
// ============================================================================
console.log('\n── runAudit: scan error captured ─────────────────────────');

resetFs();
sourceRows = [];
localizedRowsByLang['el'] = [];

// Make fs.readFileSync throw — the scan enters a dir and tries to read
fsDirContents[homeDir2] = ['Home.tsx'];
fsFileContents[pathMod.join(homeDir2, 'Home.tsx')] = 'anything';
fsReadThrows = true;

quiet();
const r3 = await runAudit('el', { includePublicPageScan: true });
loud();

assert(r3.publicPageAudit !== null, 'publicPageAudit not null');
assert(typeof r3.publicPageAudit.error === 'string', 'error field is string');
assert(r3.publicPageAudit.error.includes('Public page scan failed'), 'error message prefix');
// When the scan errors, publicPageAudit is { error: "..." } — the summary
// reads .totalKeysUsed (undefined) and .missingInSource/.missingInLocalized
// (undefined → `|| []` → length 0). So the summary fields become undefined / 0.
assertEq(r3.summary.publicPageKeysUsed, undefined, 'keysUsed undefined when errored');
assertEq(r3.summary.publicPageMissingInSource, 0, 'missingInSource = 0 when errored');
assertEq(r3.summary.publicPageMissingInLocalized, 0, 'missingInLocalized = 0 when errored');

fsReadThrows = false;

// ============================================================================
// runAuditAll
// ============================================================================
console.log('\n── runAuditAll ───────────────────────────────────────────');

resetFs();
sourceRows = [
  { translation_key: 'a.b', english_text: 'Hello', namespace: 'a' },
];
localizedRowsByLang = {
  el: [{ translation_key: 'a.b', translated_text: 'Γεια', status: 'approved' }],
  ru: [],
  ro: [{ translation_key: 'a.b', translated_text: 'Salut', status: 'approved' }],
  ka: [],
};

quiet();
const all = await runAuditAll();
loud();

assertEq(all.length, 4, '4 audits returned');
assertEq(all[0].language, 'el', 'first: el');
assertEq(all[1].language, 'ru', 'second: ru');
assertEq(all[2].language, 'ro', 'third: ro');
assertEq(all[3].language, 'ka', 'fourth: ka');
// ru/ka had no localized rows → 1 missing each
assertEq(all[1].summary.missingLocalized, 1, 'ru: 1 missing');
assertEq(all[3].summary.missingLocalized, 1, 'ka: 1 missing');
// el/ro had the key → 0 missing
assertEq(all[0].summary.missingLocalized, 0, 'el: 0 missing');
assertEq(all[2].summary.missingLocalized, 0, 'ro: 0 missing');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
