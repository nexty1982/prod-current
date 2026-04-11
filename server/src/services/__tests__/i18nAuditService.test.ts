#!/usr/bin/env npx tsx
/**
 * Unit tests for services/i18nAuditService.js (OMD-997)
 *
 * Read-only translation audit. Exports:
 *   - runAudit(lang, options?)
 *   - runAuditAll()
 *   - scanPublicPageKeys()
 *   - extractPlaceholders(text)
 *   - SUPPORTED_LANGS
 *
 * We stub:
 *   - ../config/db → getAppPool returns a fake pool with routed rows
 *   - fs → existsSync / readdirSync / readFileSync for scanPublicPageKeys
 *
 * Coverage:
 *   - extractPlaceholders: empty, no match, single, multi, underscores, sorted
 *   - SUPPORTED_LANGS constant
 *   - runAudit: unsupported language → throws
 *   - runAudit: happy path — missing, orphaned, identical, placeholder
 *               mismatches, all working together
 *   - runAudit: identical-to-english length threshold (> 3)
 *   - runAudit: includePublicPageScan option (true/false)
 *   - runAudit: public page scan error caught
 *   - runAuditAll: runs for all supported languages
 *   - scanPublicPageKeys: direct call with stubbed fs
 *
 * Run: npx tsx server/src/services/__tests__/i18nAuditService.test.ts
 */

// ── stub ../config/db ─────────────────────────────────────────────────
type PoolCall = { sql: string; params: any[] };
let poolCalls: PoolCall[] = [];

// Routed by SQL match
type Route = { match: RegExp; rows: any[] };
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    poolCalls.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        return [r.rows, {}];
      }
    }
    return [[], {}];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// ── stub fs for scanPublicPageKeys ────────────────────────────────────
const realFs = require('fs');
let fsDirs: Record<string, string[]> = {};    // dirPath (basename match) → files
let fsFiles: Record<string, string> = {};     // filePath → content
let fsExistsResult: (p: string) => boolean = () => false;
let fsReadDirResult: (p: string) => string[] = () => [];
let fsReadFileResult: (p: string, enc: string) => string = () => '';
let fsShouldThrow = false;

const fsStub: any = {
  ...realFs,
  existsSync: (p: string) => fsExistsResult(p),
  readdirSync: (p: string) => fsReadDirResult(p),
  readFileSync: (p: string, enc: any) => {
    if (fsShouldThrow) throw new Error('fs error');
    return fsReadFileResult(p, enc);
  },
};
const fsPath = require.resolve('fs');
require.cache[fsPath] = {
  id: fsPath,
  filename: fsPath,
  loaded: true,
  exports: fsStub,
} as any;

const svc = require('../i18nAuditService');

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

// Silence logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

function resetAll() {
  poolCalls = [];
  routes = [];
  fsDirs = {};
  fsFiles = {};
  fsShouldThrow = false;
  fsExistsResult = () => false;
  fsReadDirResult = () => [];
  fsReadFileResult = () => '';
}

async function main() {

// ============================================================================
// SUPPORTED_LANGS
// ============================================================================
console.log('\n── SUPPORTED_LANGS ──────────────────────────────────────');

assertEq(svc.SUPPORTED_LANGS, ['el', 'ru', 'ro', 'ka'], 'supported lang list');

// ============================================================================
// extractPlaceholders (pure)
// ============================================================================
console.log('\n── extractPlaceholders ──────────────────────────────────');

assertEq(svc.extractPlaceholders(''), [], 'empty string → []');
assertEq(svc.extractPlaceholders(null), [], 'null → []');
assertEq(svc.extractPlaceholders(undefined), [], 'undefined → []');
assertEq(svc.extractPlaceholders('no placeholders'), [], 'plain text → []');
assertEq(svc.extractPlaceholders('Hello {name}'), ['{name}'], 'single');
assertEq(
  svc.extractPlaceholders('{year} — {name}'),
  ['{name}', '{year}'],
  'multi sorted'
);
assertEq(
  svc.extractPlaceholders('{user_name} on {day_of_week}'),
  ['{day_of_week}', '{user_name}'],
  'underscores allowed, sorted'
);
// Repeated placeholder — match returns both occurrences
assertEq(
  svc.extractPlaceholders('{x} and {x}'),
  ['{x}', '{x}'],
  'repeat kept (both instances)'
);
// Invalid placeholders (digits, spaces) not matched
assertEq(svc.extractPlaceholders('{123}'), [], 'digits not matched');
assertEq(svc.extractPlaceholders('{ spaced }'), [], 'spaces not matched');

// ============================================================================
// runAudit — unsupported language
// ============================================================================
console.log('\n── runAudit: unsupported lang ───────────────────────────');

{
  let thrown = false;
  try {
    await svc.runAudit('fr');
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('Unsupported language'), 'error mentions unsupported');
    assert(e.message.includes('fr'), 'error includes the bad code');
    assert(e.message.includes('el'), 'error lists supported langs');
  }
  assert(thrown, 'throws on unsupported language');
}

// ============================================================================
// runAudit — happy path (no public scan)
// ============================================================================
console.log('\n── runAudit: happy path ─────────────────────────────────');

resetAll();
routes = [
  {
    match: /FROM translations_source/i,
    rows: [
      { translation_key: 'common.welcome', english_text: 'Welcome', namespace: 'common' },
      { translation_key: 'common.greet', english_text: 'Hello {name}', namespace: 'common' },
      { translation_key: 'home.title', english_text: 'Home Page', namespace: 'home' },
      { translation_key: 'home.subtitle', english_text: 'Identical', namespace: 'home' },
      { translation_key: 'home.short', english_text: 'OK', namespace: 'home' }, // len=2, won't flag
      { translation_key: 'only_in_source', english_text: 'Source only', namespace: 'misc' },
    ],
  },
  {
    match: /FROM translations_localized/i,
    rows: [
      { translation_key: 'common.welcome', translated_text: 'Bienvenido', status: 'approved' },
      { translation_key: 'common.greet', translated_text: 'Hola {nombre}', status: 'approved' }, // placeholder mismatch
      { translation_key: 'home.title', translated_text: 'Strona Główna', status: 'approved' },
      { translation_key: 'home.subtitle', translated_text: 'Identical', status: 'approved' }, // identical, len>3
      { translation_key: 'home.short', translated_text: 'OK', status: 'approved' }, // identical but len<=3
      { translation_key: 'orphan_key', translated_text: 'Sierota', status: 'approved' }, // orphan
    ],
  },
];

{
  const result = await svc.runAudit('el', { includePublicPageScan: false });

  assertEq(result.language, 'el', 'lang preserved');
  assert(typeof result.timestamp === 'string', 'timestamp set');

  // Source SQL — no params
  const srcCall = poolCalls.find((c) => /translations_source/i.test(c.sql));
  assert(srcCall !== undefined, 'source query made');
  // Localized SQL — lang param
  const locCall = poolCalls.find((c) => /translations_localized/i.test(c.sql));
  assert(locCall !== undefined, 'localized query made');
  assertEq(locCall!.params, ['el'], 'localized query parameterized with lang');

  // Missing — 'only_in_source' has no localized row
  assertEq(result.missingLocalizedKeys, ['only_in_source'], 'missing localized');

  // Orphan — 'orphan_key' has no source row
  assertEq(result.orphanedLocalizedKeys, ['orphan_key'], 'orphaned localized');

  // Identical-to-english — home.subtitle (len 9 > 3); home.short excluded (len 2)
  assertEq(result.identicalToEnglishKeys, ['home.subtitle'], 'identical filtered by length');

  // Placeholder mismatch — common.greet has {name} vs {nombre}
  assertEq(result.placeholderMismatchKeys.length, 1, '1 placeholder mismatch');
  assertEq(result.placeholderMismatchKeys[0].key, 'common.greet', 'mismatch key');
  assertEq(result.placeholderMismatchKeys[0].english, ['{name}'], 'mismatch english');
  assertEq(result.placeholderMismatchKeys[0].localized, ['{nombre}'], 'mismatch localized');

  // Summary counts
  assertEq(result.summary.totalSourceKeys, 6, 'total source keys');
  assertEq(result.summary.totalLocalizedKeys, 6, 'total localized keys');
  assertEq(result.summary.missingLocalized, 1, 'summary missing');
  assertEq(result.summary.orphanedLocalized, 1, 'summary orphaned');
  assertEq(result.summary.identicalToEnglish, 1, 'summary identical');
  assertEq(result.summary.placeholderMismatches, 1, 'summary placeholder');

  // No public page scan
  assertEq(result.publicPageAudit, null, 'publicPageAudit null when disabled');
  assertEq(result.summary.publicPageKeysUsed, null, 'summary public keys null');
  assertEq(result.summary.publicPageMissingInSource, null, 'summary missing in source null');
  assertEq(result.summary.publicPageMissingInLocalized, null, 'summary missing in localized null');
}

// ============================================================================
// runAudit — everything is clean
// ============================================================================
console.log('\n── runAudit: clean audit ────────────────────────────────');

resetAll();
routes = [
  {
    match: /FROM translations_source/i,
    rows: [
      { translation_key: 'a.key', english_text: 'Hello {name}', namespace: 'a' },
    ],
  },
  {
    match: /FROM translations_localized/i,
    rows: [
      { translation_key: 'a.key', translated_text: 'Γεια σου {name}', status: 'approved' },
    ],
  },
];

{
  const result = await svc.runAudit('el', { includePublicPageScan: false });
  assertEq(result.summary.missingLocalized, 0, 'clean: no missing');
  assertEq(result.summary.orphanedLocalized, 0, 'clean: no orphaned');
  assertEq(result.summary.identicalToEnglish, 0, 'clean: no identical');
  assertEq(result.summary.placeholderMismatches, 0, 'clean: no placeholder mismatch');
}

// ============================================================================
// runAudit — with public page scan (stubbed fs)
// ============================================================================
console.log('\n── runAudit: public page scan ───────────────────────────');

resetAll();
routes = [
  {
    match: /FROM translations_source/i,
    rows: [
      { translation_key: 'home.title', english_text: 'Home', namespace: 'home' },
      { translation_key: 'home.subtitle', english_text: 'Subtitle', namespace: 'home' },
    ],
  },
  {
    match: /FROM translations_localized/i,
    rows: [
      { translation_key: 'home.title', translated_text: 'სახლი', status: 'approved' },
      // home.subtitle NOT localized
    ],
  },
];

// Stub fs so one scan dir exists with a single file using two keys:
// - home.title (already in source + localized)
// - home.subtitle (in source, NOT localized)
// - homepage.cta (NOT in source at all)
fsExistsResult = (p: string) => {
  return p.includes('frontend-pages') || p.includes('authentication');
};
fsReadDirResult = (p: string) => {
  if (p.includes('frontend-pages')) return ['Home.tsx'];
  if (p.includes('authentication')) return ['Login.tsx'];
  return [];
};
fsReadFileResult = (p: string, _enc: string) => {
  if (p.includes('Home.tsx')) {
    return `const title = t('home.title'); const sub = t('home.subtitle'); const cta = t('homepage.cta');`;
  }
  if (p.includes('Login.tsx')) {
    return `const u = t('auth.login');`; // auth.login not in source
  }
  return '';
};

{
  const result = await svc.runAudit('ka'); // scan enabled by default
  assert(result.publicPageAudit !== null, 'publicPageAudit populated');
  assert(typeof result.publicPageAudit.totalKeysUsed === 'number', 'totalKeysUsed set');
  assert(
    result.publicPageAudit.totalKeysUsed >= 3,
    `>=3 keys used (got ${result.publicPageAudit.totalKeysUsed})`
  );

  // homepage.cta and auth.login are used but not in source
  assert(
    result.publicPageAudit.missingInSource.includes('homepage.cta'),
    'homepage.cta flagged as missing in source'
  );
  assert(
    result.publicPageAudit.missingInSource.includes('auth.login'),
    'auth.login flagged as missing in source'
  );

  // home.subtitle is in source but not localized
  assertEq(
    result.publicPageAudit.missingInLocalized,
    ['home.subtitle'],
    'home.subtitle missing in localized'
  );

  // Summary reflects counts
  assertEq(result.summary.publicPageKeysUsed, result.publicPageAudit.totalKeysUsed, 'summary match');
  assertEq(
    result.summary.publicPageMissingInSource,
    result.publicPageAudit.missingInSource.length,
    'summary missing in source count'
  );
  assertEq(result.summary.publicPageMissingInLocalized, 1, 'summary missing in localized count');
}

// ============================================================================
// runAudit — public page scan error caught
// ============================================================================
console.log('\n── runAudit: public page scan error ─────────────────────');

resetAll();
routes = [
  { match: /FROM translations_source/i, rows: [] },
  { match: /FROM translations_localized/i, rows: [] },
];
fsExistsResult = () => true;
fsReadDirResult = (_p: string) => { throw new Error('permission denied'); };

{
  quiet();
  const result = await svc.runAudit('ru');
  loud();
  assert(
    result.publicPageAudit && result.publicPageAudit.error,
    'publicPageAudit.error set'
  );
  assert(
    result.publicPageAudit.error.includes('Public page scan failed'),
    'error message prefix'
  );
  assert(
    result.publicPageAudit.error.includes('permission denied'),
    'error includes original message'
  );
}

// ============================================================================
// scanPublicPageKeys — direct
// ============================================================================
console.log('\n── scanPublicPageKeys ───────────────────────────────────');

resetAll();
fsExistsResult = (p: string) => p.includes('frontend-pages/homepage');
fsReadDirResult = (p: string) => {
  if (p.includes('homepage')) return ['Hero.tsx', 'notes.md', 'Cta.tsx'];
  return [];
};
fsReadFileResult = (p: string, _enc: string) => {
  if (p.includes('Hero.tsx')) return `t('hero.title'); t('hero.sub');`;
  if (p.includes('Cta.tsx')) return `t('cta.text');`;
  return '';
};

{
  const keys = svc.scanPublicPageKeys();
  assertEq(keys, ['cta.text', 'hero.sub', 'hero.title'], 'sorted dedup keys from .tsx only');
}

// scanPublicPageKeys — no dirs exist → empty
resetAll();
fsExistsResult = () => false;
{
  const keys = svc.scanPublicPageKeys();
  assertEq(keys, [], 'no dirs → empty array');
}

// scanPublicPageKeys — same key in multiple files → deduped
resetAll();
fsExistsResult = (p: string) => p.includes('frontend-pages');
fsReadDirResult = (_p: string) => ['A.tsx', 'B.tsx'];
fsReadFileResult = (p: string) => {
  if (p.includes('A.tsx')) return `t('shared.key'); t('a.only');`;
  if (p.includes('B.tsx')) return `t('shared.key'); t('b.only');`;
  return '';
};
{
  const keys = svc.scanPublicPageKeys();
  // Each scan dir reads the same files — across ~12 dirs we'd get 12 copies
  // but Set dedupes. Result should be just the 3 unique keys.
  assertEq(keys, ['a.only', 'b.only', 'shared.key'], 'deduped across files');
}

// ============================================================================
// runAuditAll — runs for all supported languages
// ============================================================================
console.log('\n── runAuditAll ──────────────────────────────────────────');

resetAll();
routes = [
  { match: /FROM translations_source/i, rows: [] },
  { match: /FROM translations_localized/i, rows: [] },
];
fsExistsResult = () => false;

{
  const all = await svc.runAuditAll();
  assertEq(all.length, 4, '4 results for 4 langs');
  const langs = all.map((r: any) => r.language);
  assertEq(langs, ['el', 'ru', 'ro', 'ka'], 'langs in order');

  // Each should have called 2 queries (source + localized) = 8 total
  const sourceCalls = poolCalls.filter((c) => /translations_source/i.test(c.sql));
  const localizedCalls = poolCalls.filter((c) => /translations_localized/i.test(c.sql));
  assertEq(sourceCalls.length, 4, '4 source queries');
  assertEq(localizedCalls.length, 4, '4 localized queries');
  // Verify each locale passed its code
  const locParams = localizedCalls.map((c) => c.params[0]);
  assertEq(locParams, ['el', 'ru', 'ro', 'ka'], 'each locale query parameterized');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
