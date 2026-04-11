#!/usr/bin/env npx tsx
/**
 * Unit tests for services/i18nAuditService.js (OMD-1199)
 *
 * Read-only audit service — no mutation. Deps:
 *   - ../config/db → getAppPool   (stubbed via require.cache)
 *   - fs             → scanPublicPageKeys uses existsSync/readdirSync/readFileSync
 *                      (patched in-place on the cached fs module object;
 *                      the SUT stores `const fs = require('fs')` so patched
 *                      methods are visible to it)
 *
 * Coverage:
 *   - extractPlaceholders: empty/null, no placeholders, single, multiple
 *                          sorted, underscores, duplicates
 *   - SUPPORTED_LANGS constant
 *   - runAudit: throws on unsupported lang
 *   - runAudit happy path with stubbed fs (disables public page scan
 *     OR returns empty for scanned dirs):
 *       · missingLocalizedKeys
 *       · orphanedLocalizedKeys
 *       · identicalToEnglishKeys (filtered by length > 3)
 *       · placeholderMismatchKeys
 *       · summary counts
 *   - runAudit with includePublicPageScan=false → publicPageAudit = null
 *   - runAudit with includePublicPageScan=true (stub fs to return keys) →
 *       · publicPageAudit populated
 *       · missingInSource / missingInLocalized computed
 *   - scanPublicPageKeys: dedup + sort, reads only .tsx/.ts, honors missing dirs
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

// ── Fake db pool ────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

// Two-stage response queue: (rows for translations_source, rows for localized)
// by language. Caller sets up before each test.
let sourceRowsByCall: any[][] = [];
let localizedRowsByLang: Map<string, any[]> = new Map();

const fakePool = {
  query: async (sql: string, params: any[] = []): Promise<[any]> => {
    queryLog.push({ sql, params });
    if (/FROM translations_source/i.test(sql)) {
      // Pull next source rows
      const rows = sourceRowsByCall.shift() || [];
      return [rows];
    }
    if (/FROM translations_localized/i.test(sql)) {
      const lang = params[0];
      return [localizedRowsByLang.get(lang) || []];
    }
    return [[]] as [any];
  },
};

const dbStub = { getAppPool: () => fakePool };

// ── Patch fs BEFORE requiring SUT ───────────────────────────────────
// The SUT stores `const fs = require('fs')` and later calls fs.existsSync,
// fs.readdirSync, fs.readFileSync. Patching the cached fs module object's
// methods in place makes them visible to the SUT (which holds a reference).
const fsMod = require('fs');
const origExistsSync = fsMod.existsSync;
const origReaddirSync = fsMod.readdirSync;
const origReadFileSync = fsMod.readFileSync;

// In-memory virtual filesystem for SUT's scan dirs.
// For paths under the real front-end/src tree, we force isolation:
//   - existsSync returns true ONLY if the dir is in vfsDirs
//   - readdirSync returns seeded file basenames for vfsDirs, else []
// Paths outside front-end/src (node_modules, tsx runtime, etc.) fall through
// to the real fs so the test harness continues to work.
const vfsDirs = new Set<string>();
const vfsFiles = new Map<string, string>();

// Front-end src root — computed the same way the SUT does it.
const FRONTEND_SRC_ROOT = (() => {
  const p = require('path');
  return p.resolve(require('path').dirname(require.resolve('../i18nAuditService')),
    '..', '..', '..', 'front-end', 'src');
})();

function isUnderFrontendSrc(p: any): boolean {
  return typeof p === 'string' && p.startsWith(FRONTEND_SRC_ROOT);
}

fsMod.existsSync = (p: any) => {
  if (typeof p !== 'string') return origExistsSync(p);
  if (vfsDirs.has(p) || vfsFiles.has(p)) return true;
  if (isUnderFrontendSrc(p)) return false;   // isolate front-end scan
  return origExistsSync(p);
};

fsMod.readdirSync = (p: any, opts?: any) => {
  if (typeof p === 'string' && vfsDirs.has(p)) {
    const prefix = p.endsWith('/') ? p : p + '/';
    const names: string[] = [];
    for (const key of vfsFiles.keys()) {
      if (key.startsWith(prefix)) {
        const rest = key.slice(prefix.length);
        if (!rest.includes('/')) names.push(rest);
      }
    }
    return names;
  }
  if (isUnderFrontendSrc(p)) return [];       // isolate front-end scan
  return origReaddirSync(p, opts);
};

fsMod.readFileSync = (p: any, enc?: any) => {
  if (typeof p === 'string' && vfsFiles.has(p)) {
    return vfsFiles.get(p)!;
  }
  return origReadFileSync(p, enc);
};

// ── Install db stub ────────────────────────────────────────────────
const nodePath = require('path');
const sutPath = require.resolve('../i18nAuditService');
const sutDir = nodePath.dirname(sutPath);
const dbPath = require.resolve(nodePath.join(sutDir, '..', 'config', 'db'));

require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: dbStub,
} as any;

const {
  runAudit,
  runAuditAll,
  scanPublicPageKeys,
  extractPlaceholders,
  SUPPORTED_LANGS,
} = require('../i18nAuditService');

function reset() {
  queryLog.length = 0;
  sourceRowsByCall = [];
  localizedRowsByLang = new Map();
  vfsDirs.clear();
  vfsFiles.clear();
}

// ============================================================================
// extractPlaceholders
// ============================================================================
console.log('\n── extractPlaceholders ──────────────────────────────────');

assertEq(extractPlaceholders(''), [], 'empty string → []');
assertEq(extractPlaceholders(null), [], 'null → []');
assertEq(extractPlaceholders(undefined), [], 'undefined → []');
assertEq(extractPlaceholders('No placeholders here'), [], 'no placeholders → []');
assertEq(extractPlaceholders('Hello {name}'), ['{name}'], 'single placeholder');
assertEq(
  extractPlaceholders('{year} came after {month}'),
  ['{month}', '{year}'],
  'multiple sorted'
);
assertEq(
  extractPlaceholders('Hi {user_name}, you have {count} items'),
  ['{count}', '{user_name}'],
  'underscore allowed, sorted'
);
// Duplicate tokens — each occurrence captured & sorted
assertEq(
  extractPlaceholders('{name} and {name}'),
  ['{name}', '{name}'],
  'duplicates preserved'
);
// Digits NOT in the charset — should not match
assertEq(extractPlaceholders('{123}'), [], 'digits not in token charset');

// ============================================================================
// SUPPORTED_LANGS
// ============================================================================
console.log('\n── SUPPORTED_LANGS ──────────────────────────────────────');

assertEq(SUPPORTED_LANGS, ['el', 'ru', 'ro', 'ka'], 'SUPPORTED_LANGS constant');

async function main() {

// ============================================================================
// runAudit: unsupported language
// ============================================================================
console.log('\n── runAudit: unsupported language ───────────────────────');

reset();
{
  let caught: Error | null = null;
  try {
    await runAudit('xx');
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'unsupported lang throws');
  assert(caught !== null && /xx/.test(caught.message), 'message mentions bad lang');
  assert(caught !== null && /el, ru, ro, ka/.test(caught.message), 'message lists supported');
}

// ============================================================================
// runAudit: missing + orphaned + identical + placeholder mismatch
// ============================================================================
console.log('\n── runAudit: core checks ────────────────────────────────');

reset();
{
  // Source has 5 keys
  sourceRowsByCall = [[
    { translation_key: 'app.hello', english_text: 'Hello', namespace: 'app' },
    { translation_key: 'app.welcome', english_text: 'Welcome {name}', namespace: 'app' },
    { translation_key: 'app.count', english_text: '{count} items', namespace: 'app' },
    { translation_key: 'app.short', english_text: 'OK', namespace: 'app' },       // short → not flagged
    { translation_key: 'app.longer', english_text: 'Hello world', namespace: 'app' },
  ]];
  // Localized: has 4 of them (missing app.count), one orphan, one identical-to-english, one placeholder mismatch
  localizedRowsByLang.set('el', [
    { translation_key: 'app.hello',   translated_text: 'Γειά',         status: 'approved' },
    { translation_key: 'app.welcome', translated_text: 'Καλώς {wrong}',status: 'approved' }, // placeholder mismatch
    { translation_key: 'app.short',   translated_text: 'OK',           status: 'approved' }, // identical but length 2 → NOT flagged
    { translation_key: 'app.longer',  translated_text: 'Hello world',  status: 'approved' }, // identical, length > 3 → flagged
    { translation_key: 'app.orphan',  translated_text: 'ορφανό',       status: 'approved' }, // not in source
  ]);

  const result = await runAudit('el', { includePublicPageScan: false });

  assertEq(result.language, 'el', 'language echoed');
  assertEq(result.summary.totalSourceKeys, 5, 'totalSourceKeys');
  assertEq(result.summary.totalLocalizedKeys, 5, 'totalLocalizedKeys');

  // Missing localized: app.count is the only source key without a localized row
  assertEq(result.missingLocalizedKeys, ['app.count'], 'missing localized');
  assertEq(result.summary.missingLocalized, 1, 'summary missingLocalized count');

  // Orphan: app.orphan
  assertEq(result.orphanedLocalizedKeys, ['app.orphan'], 'orphaned localized');
  assertEq(result.summary.orphanedLocalized, 1, 'summary orphanedLocalized count');

  // Identical-to-English (length > 3): only app.longer ('Hello world')
  // app.short ('OK') is too short to flag
  assertEq(result.identicalToEnglishKeys, ['app.longer'], 'identical to english');
  assertEq(result.summary.identicalToEnglish, 1, 'summary identicalToEnglish');

  // Placeholder mismatch: app.welcome (english {name}, localized {wrong})
  assertEq(result.placeholderMismatchKeys.length, 1, 'one placeholder mismatch');
  assertEq(result.placeholderMismatchKeys[0].key, 'app.welcome', 'mismatch key');
  assertEq(result.placeholderMismatchKeys[0].english, ['{name}'], 'english placeholders');
  assertEq(result.placeholderMismatchKeys[0].localized, ['{wrong}'], 'localized placeholders');
  assertEq(result.summary.placeholderMismatches, 1, 'summary placeholder count');

  // public page scan disabled
  assertEq(result.publicPageAudit, null, 'publicPageAudit null when disabled');
  assertEq(result.summary.publicPageKeysUsed, null, 'summary publicPageKeysUsed null');

  // Timestamp ISO string
  assert(typeof result.timestamp === 'string', 'timestamp is string');
  assert(/^\d{4}-\d{2}-\d{2}T/.test(result.timestamp), 'ISO timestamp');
}

// Placeholder match when both have same placeholders — no mismatch
console.log('\n── runAudit: matching placeholders ──────────────────────');

reset();
{
  sourceRowsByCall = [[
    { translation_key: 'app.k', english_text: 'Hello {name}, you have {count}', namespace: 'app' },
  ]];
  localizedRowsByLang.set('ru', [
    { translation_key: 'app.k', translated_text: 'Привет {name}, у вас {count}', status: 'approved' },
  ]);
  const result = await runAudit('ru', { includePublicPageScan: false });
  assertEq(result.placeholderMismatchKeys.length, 0, 'matching placeholders → no mismatch');
  assertEq(result.identicalToEnglishKeys.length, 0, 'translated → not identical');
}

// Identical short strings NOT flagged (length <= 3)
console.log('\n── runAudit: short identical not flagged ────────────────');

reset();
{
  sourceRowsByCall = [[
    { translation_key: 'k.1', english_text: '#',   namespace: 'k' },
    { translation_key: 'k.2', english_text: 'OK',  namespace: 'k' },
    { translation_key: 'k.3', english_text: 'ABC', namespace: 'k' },  // length 3 → boundary, NOT flagged
    { translation_key: 'k.4', english_text: 'ABCD',namespace: 'k' },  // length 4 → flagged
  ]];
  localizedRowsByLang.set('ro', [
    { translation_key: 'k.1', translated_text: '#',    status: 'approved' },
    { translation_key: 'k.2', translated_text: 'OK',   status: 'approved' },
    { translation_key: 'k.3', translated_text: 'ABC',  status: 'approved' },
    { translation_key: 'k.4', translated_text: 'ABCD', status: 'approved' },
  ]);
  const result = await runAudit('ro', { includePublicPageScan: false });
  assertEq(result.identicalToEnglishKeys, ['k.4'], 'only length > 3 flagged');
}

// ============================================================================
// runAudit: public page scan
// ============================================================================
console.log('\n── runAudit: public page scan ───────────────────────────');

reset();
{
  // Compute the frontend src base the SUT uses and seed a scan dir
  const frontendSrc = nodePath.resolve(sutDir, '..', '..', '..', 'front-end', 'src');
  const scanDir = nodePath.join(frontendSrc, 'features/pages/frontend-pages');

  vfsDirs.add(scanDir);
  vfsFiles.set(
    nodePath.join(scanDir, 'Home.tsx'),
    `import { useTranslation } from 'react-i18next';
     const { t } = useTranslation();
     return <div>{t('home.title')} {t('home.subtitle')} {t('app.welcome')}</div>;`
  );
  vfsFiles.set(
    nodePath.join(scanDir, 'About.ts'),
    `// t('about.heading') should still be picked up
     const x = t('about.body');`
  );
  // Non-ts/tsx file — should be ignored
  vfsFiles.set(
    nodePath.join(scanDir, 'README.md'),
    `t('should.be.ignored')`
  );

  sourceRowsByCall = [[
    { translation_key: 'home.title', english_text: 'Home', namespace: 'home' },
    { translation_key: 'app.welcome', english_text: 'Welcome', namespace: 'app' },
    // home.subtitle, about.heading, about.body missing from source
  ]];
  localizedRowsByLang.set('ka', [
    { translation_key: 'home.title', translated_text: 'მთავარი', status: 'approved' },
    // app.welcome missing from localized
  ]);

  const result = await runAudit('ka');
  assert(result.publicPageAudit !== null, 'publicPageAudit populated');
  // Keys used in the page (sorted): about.body, about.heading, app.welcome, home.subtitle, home.title
  const used = result.publicPageAudit.totalKeysUsed;
  assertEq(used, 5, '5 keys used');
  // Missing in source: about.body, about.heading, home.subtitle (3)
  assertEq(
    result.publicPageAudit.missingInSource.sort(),
    ['about.body', 'about.heading', 'home.subtitle'],
    'missingInSource'
  );
  // Missing in localized (but in source): app.welcome
  assertEq(
    result.publicPageAudit.missingInLocalized,
    ['app.welcome'],
    'missingInLocalized'
  );
  // README.md ignored — 'should.be.ignored' not in results
  assert(
    !result.publicPageAudit.missingInSource.includes('should.be.ignored'),
    'non-tsx/ts files ignored'
  );
  // Summary numbers
  assertEq(result.summary.publicPageKeysUsed, 5, 'summary publicPageKeysUsed');
  assertEq(result.summary.publicPageMissingInSource, 3, 'summary missingInSource count');
  assertEq(result.summary.publicPageMissingInLocalized, 1, 'summary missingInLocalized count');
}

// ============================================================================
// scanPublicPageKeys: dedup + sort
// ============================================================================
console.log('\n── scanPublicPageKeys: dedup + sort ─────────────────────');

reset();
{
  const frontendSrc = nodePath.resolve(sutDir, '..', '..', '..', 'front-end', 'src');
  const scanDir = nodePath.join(frontendSrc, 'components/frontend-pages/homepage');
  vfsDirs.add(scanDir);
  vfsFiles.set(
    nodePath.join(scanDir, 'a.tsx'),
    `t('z.last') t('a.first') t('m.middle')`
  );
  vfsFiles.set(
    nodePath.join(scanDir, 'b.tsx'),
    `t('a.first') t('m.middle')` // duplicates of previous file
  );

  const keys = scanPublicPageKeys();
  assert(keys.includes('a.first'), 'includes a.first');
  assert(keys.includes('m.middle'), 'includes m.middle');
  assert(keys.includes('z.last'), 'includes z.last');
  // Sorted
  const subset = keys.filter((k: string) => ['a.first', 'm.middle', 'z.last'].includes(k));
  assertEq(subset, ['a.first', 'm.middle', 'z.last'], 'sorted');
  // Dedup: a.first should appear exactly once
  const count = keys.filter((k: string) => k === 'a.first').length;
  assertEq(count, 1, 'deduped');
}

// scanPublicPageKeys returns empty (only) when dirs are truly empty
reset();
{
  // Don't seed vfs — real fs handles scan dirs, but we can at least ensure
  // the call doesn't throw. We don't assert on exact keys since real
  // frontend state is unknown from the test's perspective.
  const keys = scanPublicPageKeys();
  assert(Array.isArray(keys), 'returns array');
}

// ============================================================================
// runAudit: public page scan error caught
// ============================================================================
console.log('\n── runAudit: public page scan error swallowed ───────────');

reset();
{
  // Force scanPublicPageKeys to throw by making readdirSync throw on a dir
  // we've registered in the vfs.
  const frontendSrc = nodePath.resolve(sutDir, '..', '..', '..', 'front-end', 'src');
  const scanDir = nodePath.join(frontendSrc, 'features/auth/authentication');
  vfsDirs.add(scanDir);
  // Override readdirSync to throw for this specific dir
  const prevReaddir = fsMod.readdirSync;
  fsMod.readdirSync = (p: any, opts?: any) => {
    if (p === scanDir) throw new Error('boom');
    return prevReaddir(p, opts);
  };

  sourceRowsByCall = [[]];
  localizedRowsByLang.set('el', []);

  const result = await runAudit('el');
  assert(result.publicPageAudit !== null, 'publicPageAudit not null');
  assert(
    typeof result.publicPageAudit.error === 'string',
    'error field populated when scan fails'
  );
  assert(/boom/.test(result.publicPageAudit.error), 'error message preserved');

  fsMod.readdirSync = prevReaddir;
}

// ============================================================================
// runAuditAll
// ============================================================================
console.log('\n── runAuditAll ──────────────────────────────────────────');

reset();
{
  // Seed 4 calls — one per supported lang
  for (let i = 0; i < SUPPORTED_LANGS.length; i++) {
    sourceRowsByCall.push([
      { translation_key: 'k', english_text: 'V', namespace: 'n' },
    ]);
  }
  for (const lang of SUPPORTED_LANGS) {
    localizedRowsByLang.set(lang, [
      { translation_key: 'k', translated_text: 'Tr', status: 'approved' },
    ]);
  }

  const results = await runAuditAll();
  assertEq(results.length, SUPPORTED_LANGS.length, '4 results');
  assertEq(
    results.map((r: any) => r.language),
    SUPPORTED_LANGS,
    'one per language in order'
  );
  for (const r of results) {
    assertEq(r.summary.totalSourceKeys, 1, `${r.language}: total source`);
    assertEq(r.summary.totalLocalizedKeys, 1, `${r.language}: total localized`);
  }
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
