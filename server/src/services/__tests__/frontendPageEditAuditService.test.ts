#!/usr/bin/env npx tsx
/**
 * Unit tests for services/frontendPageEditAuditService.js (OMD-1143)
 *
 * Deterministic frontend page audit service. The module resolves a lot of
 * paths at require-time (ROUTER_FILE = path.join(FRONTEND_SRC, ...)), so
 * stubs for `../routes/page-content`, `../config/db`, and `fs` MUST be
 * installed before requiring the SUT.
 *
 * Strategy:
 *   - Virtual FS: Map<absolutePath, content>. fs.readFileSync/existsSync/
 *     readdirSync are patched to consult this map.
 *   - page-content stub provides FRONTEND_SRC = '/fake/src', a controllable
 *     PAGE_REGISTRY, and stub resolveLocalImports (returns [] — no import
 *     traversal) + resolveFilePath (identity).
 *   - db stub provides getAppPool() returning a fake pool whose .query
 *     responds to SQL prefixes.
 *
 * Coverage (focused on what's exportable + testable without re-implementing
 * the whole audit pipeline):
 *
 *   - derivePageKey (exported, pure)
 *   - Exported constants shape (APPROVED_SHARED_SECTIONS,
 *     NON_EDITABLE_BY_DESIGN, CANDIDATE_EXCLUDED_ROUTES,
 *     PAGE_KEY_PREFIX_EXEMPT, UNREGISTERED_KNOWN)
 *   - auditSinglePage('nonexistent-id') → null
 *   - auditAllPages: empty registry → summary.total_pages === 0
 *     (plus unregistered detection reads readdirSync but returns [])
 *   - auditAllPages: 1 registered page, existing file, in-router path,
 *     with EditableText → classification === 'editable-compliant'
 *   - auditAllPages: non-editable-by-design entry → classification set
 *   - deleteOrphanedOverrides: input validation (throws on empty pageKey,
 *     throws on empty keys) + "no-op" when keys not orphaned
 *   - getOrphanedOverrides: no rows → empty array
 *   - detectCandidates: excluded route flagged correctly
 *   - detectCandidates: minimal candidate flow with deterministic signals
 *
 * Run: npx tsx server/src/services/__tests__/frontendPageEditAuditService.test.ts
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

// ── Virtual FS ──────────────────────────────────────────────────────
const FRONTEND_SRC = '/fake/src';
const ROUTER_FILE = FRONTEND_SRC + '/routes/Router.tsx';
const PAGES_DIR = FRONTEND_SRC + '/features/pages/frontend-pages';

const vfs = new Map<string, string>();
const vdirs = new Map<string, string[]>();

function vfsReset() {
  vfs.clear();
  vdirs.clear();
  vdirs.set(PAGES_DIR, []);
}
vfsReset();

// ── fs stub ──────────────────────────────────────────────────────────
const fsPath = require.resolve('fs');
const origFs = require('fs');
const fsStub = {
  ...origFs,
  readFileSync: (p: string, enc?: any) => {
    if (vfs.has(p)) return vfs.get(p);
    // Fallback to real fs for node internals (tsx, etc.)
    return origFs.readFileSync(p, enc);
  },
  existsSync: (p: string) => {
    if (vfs.has(p)) return true;
    if (vdirs.has(p)) return true;
    return origFs.existsSync(p);
  },
  readdirSync: (p: string) => {
    if (vdirs.has(p)) return vdirs.get(p);
    return origFs.readdirSync(p);
  },
};
require.cache[fsPath] = {
  id: fsPath,
  filename: fsPath,
  loaded: true,
  exports: fsStub,
} as any;

// ── page-content stub ───────────────────────────────────────────────
// NOTE: SUT destructures PAGE_REGISTRY at require-time, capturing the array
// REFERENCE once. We must mutate this same array (splice/push) across tests,
// never reassign.
const pageContentPath = require.resolve('../../routes/page-content');
const pageRegistry: any[] = [];
function setRegistry(pages: any[]): void {
  pageRegistry.length = 0;
  for (const p of pages) pageRegistry.push(p);
}
require.cache[pageContentPath] = {
  id: pageContentPath,
  filename: pageContentPath,
  loaded: true,
  exports: {
    PAGE_REGISTRY: pageRegistry,
    resolveLocalImports: (_source: string, _dir: string) => [],
    // Smart stub: try exact path, then .tsx/.ts extensions (mirrors the real
    // resolveFilePath which probes extensions).
    resolveFilePath: (p: string) => {
      if (vfs.has(p)) return p;
      if (vfs.has(p + '.tsx')) return p + '.tsx';
      if (vfs.has(p + '.ts')) return p + '.ts';
      return p;
    },
    FRONTEND_SRC,
  },
} as any;

// ── db stub ─────────────────────────────────────────────────────────
type Row = Record<string, any>;
let pageContentRows: Row[] = [];
let translationStatusRows: Row[] = [];
let deletedRowsLog: any[] = [];
let insertedLogRows: any[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    const s = sql.toLowerCase();
    // SELECT page_key, content_key FROM page_content
    if (s.includes('from page_content') && s.includes('select') && !s.includes('content_value')) {
      if (params.length > 0) {
        // WHERE page_key = ?
        const pk = params[0];
        return [pageContentRows.filter(r => r.page_key === pk)];
      }
      return [pageContentRows];
    }
    // SELECT page_key, content_key, content_value FROM page_content (+ optional WHERE)
    if (s.includes('from page_content') && s.includes('content_value')) {
      if (s.includes('content_key in')) {
        // SELECT for pre-deletion capture
        const pk = params[0];
        const keys = params.slice(1);
        return [pageContentRows.filter(r => r.page_key === pk && keys.includes(r.content_key))];
      }
      if (params.length > 0) {
        return [pageContentRows.filter(r => r.page_key === params[0])];
      }
      return [pageContentRows];
    }
    // SELECT FROM translation_status
    if (s.includes('from translation_status')) {
      return [translationStatusRows];
    }
    // DELETE FROM page_content
    if (s.startsWith('delete from page_content')) {
      const pk = params[0];
      const keys = params.slice(1);
      const before = pageContentRows.length;
      const removed = pageContentRows.filter(r => r.page_key === pk && keys.includes(r.content_key));
      pageContentRows = pageContentRows.filter(r => !(r.page_key === pk && keys.includes(r.content_key)));
      deletedRowsLog.push({ pageKey: pk, keys, removed: before - pageContentRows.length });
      return [{ affectedRows: removed.length }];
    }
    // INSERT INTO system_logs
    if (s.startsWith('insert into system_logs')) {
      insertedLogRows.push(params);
      return [{ insertId: insertedLogRows.length }];
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

// Silence console during test runs
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
function loud() {
  console.log = origLog;
  console.warn = origWarn;
  console.error = origError;
}

// ── Import SUT ───────────────────────────────────────────────────────
const SUT = require('../frontendPageEditAuditService');
const {
  derivePageKey,
  APPROVED_SHARED_SECTIONS,
  NON_EDITABLE_BY_DESIGN,
  CANDIDATE_EXCLUDED_ROUTES,
  PAGE_KEY_PREFIX_EXEMPT,
  UNREGISTERED_KNOWN,
  auditSinglePage,
  auditAllPages,
  getOrphanedOverrides,
  deleteOrphanedOverrides,
  detectCandidates,
} = SUT;

async function main() {

// ============================================================================
// derivePageKey (pure, exported)
// ============================================================================
console.log('\n── derivePageKey ─────────────────────────────────────────');

assertEq(derivePageKey('/'), 'homepage', 'root → homepage');
assertEq(derivePageKey(''), 'homepage', 'empty → homepage');
assertEq(derivePageKey(null), 'homepage', 'null → homepage');
assertEq(derivePageKey(undefined), 'homepage', 'undefined → homepage');
assertEq(derivePageKey('/about'), 'about', 'simple single segment');
assertEq(derivePageKey('/about/'), 'about', 'trailing slash trimmed');
assertEq(derivePageKey('about'), 'about', 'no leading slash');
assertEq(derivePageKey('/frontend-pages/samples'), 'samples', 'last segment wins');
assertEq(derivePageKey('/blog/post/entry'), 'entry', 'deep path → last segment');
assertEq(derivePageKey('///'), 'homepage', 'slashes only → homepage');
assertEq(derivePageKey('/deeply/nested/path/final'), 'final', 'deep path last');

// ============================================================================
// Exported constants shape
// ============================================================================
console.log('\n── Exported constants ────────────────────────────────────');

assert(Array.isArray(APPROVED_SHARED_SECTIONS), 'APPROVED_SHARED_SECTIONS is array');
assert(
  APPROVED_SHARED_SECTIONS.includes('HeroSection'),
  'includes HeroSection'
);
assert(
  APPROVED_SHARED_SECTIONS.includes('CTASection'),
  'includes CTASection'
);
assert(
  APPROVED_SHARED_SECTIONS.includes('SectionHeader'),
  'includes SectionHeader'
);
assert(
  APPROVED_SHARED_SECTIONS.includes('FeatureCard'),
  'includes FeatureCard'
);
assert(
  APPROVED_SHARED_SECTIONS.includes('BulletList'),
  'includes BulletList'
);

assert(typeof NON_EDITABLE_BY_DESIGN === 'object', 'NON_EDITABLE_BY_DESIGN is object');
assert('login' in NON_EDITABLE_BY_DESIGN, 'NON_EDITABLE includes login');
assert('faq' in NON_EDITABLE_BY_DESIGN, 'NON_EDITABLE includes faq');
assert(
  typeof NON_EDITABLE_BY_DESIGN.login === 'string',
  'NON_EDITABLE entries are strings'
);

assert(
  typeof CANDIDATE_EXCLUDED_ROUTES === 'object',
  'CANDIDATE_EXCLUDED_ROUTES is object'
);
assert('auth' in CANDIDATE_EXCLUDED_ROUTES, 'excludes auth group');
assert('*' in CANDIDATE_EXCLUDED_ROUTES, 'excludes catch-all');
assert('/login' in CANDIDATE_EXCLUDED_ROUTES, 'excludes /login redirect');

assert(
  typeof PAGE_KEY_PREFIX_EXEMPT === 'object',
  'PAGE_KEY_PREFIX_EXEMPT is object'
);
assert('homepage' in PAGE_KEY_PREFIX_EXEMPT, 'homepage is prefix-exempt');

assert(typeof UNREGISTERED_KNOWN === 'object', 'UNREGISTERED_KNOWN is object');
assert('Footer' in UNREGISTERED_KNOWN, 'UNREGISTERED includes Footer');
assert('Header' in UNREGISTERED_KNOWN, 'UNREGISTERED includes Header');

// ============================================================================
// auditSinglePage: nonexistent id → null (no stubs needed, early return)
// ============================================================================
console.log('\n── auditSinglePage: miss ─────────────────────────────────');

setRegistry([]);
quiet();
{
  const r = await auditSinglePage('nope-not-here');
  loud();
  assertEq(r, null, 'missing page id → null');
}

// ============================================================================
// auditAllPages: empty registry + empty router
// ============================================================================
console.log('\n── auditAllPages: empty registry ─────────────────────────');

setRegistry([]);
vfsReset();
// Router.tsx missing → readFileSafe returns '' → everything empty
pageContentRows = [];
translationStatusRows = [];

quiet();
{
  const r = await auditAllPages();
  loud();
  assertEq(r.summary.total_pages, 0, 'no pages');
  assertEq(r.summary.total_issues, 0, 'no issues');
  assertEq(r.summary.total_warnings, 0, 'no warnings');
  assertEq(r.pages.length, 0, 'pages array empty');
}

// ============================================================================
// auditAllPages: 1 registered page with EditableText
// ============================================================================
console.log('\n── auditAllPages: editable-compliant page ────────────────');

setRegistry([
  { id: 'about', name: 'About', file: 'features/pages/frontend-pages/AboutPage.tsx', category: 'frontend-pages' },
]);

const routerSource = `
const AboutPage = Loadable(lazy(() => import('features/pages/frontend-pages/AboutPage')));

const Router = [
  {
    element: <BlankLayout />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/about', element: <AboutPage /> },
        ],
      },
    ],
  }
];
`;

const aboutSource = `
import { EditableText } from 'shared/editable/EditableText';
export const AboutPage = () => (
  <div>
    <EditableText contentKey="about.hero.title">About Us</EditableText>
    <EditableText contentKey="about.hero.subtitle">Our story</EditableText>
  </div>
);
`;

vfsReset();
vfs.set(ROUTER_FILE, routerSource);
vfs.set(FRONTEND_SRC + '/features/pages/frontend-pages/AboutPage.tsx', aboutSource);
vdirs.set(PAGES_DIR, ['AboutPage.tsx']);
pageContentRows = [];
translationStatusRows = [];

quiet();
{
  const r = await auditAllPages();
  loud();
  assertEq(r.summary.total_pages, 1, '1 page audited');
  const about = r.pages.find((p: any) => p.id === 'about');
  assert(about !== undefined, 'about page present');
  assertEq(about.route, '/about', 'route detected');
  assertEq(about.pageKey, 'about', 'pageKey derived');
  assertEq(about.classification, 'editable-compliant', 'classified editable-compliant');
  assert(about.editable_field_count >= 2, '2+ editable fields');
  assertEq(about.rules.PAGE_FILE_EXISTS.status, 'pass', 'file exists rule');
  assertEq(about.rules.PAGE_HAS_ROUTE.status, 'pass', 'route rule pass');
  assertEq(about.rules.PAGE_RENDERS_IN_PUBLIC_LAYOUT.status, 'pass', 'in public layout');
  assertEq(
    about.rules.PAGE_USES_EDITABLE_TEXT_OR_SHARED_SECTION.status,
    'pass',
    'editable text rule pass'
  );
  assertEq(
    about.rules.CONTENT_KEYS_MATCH_PAGE_KEY.status,
    'pass',
    'content keys match pageKey'
  );
  assertEq(
    about.rules.CONTENT_KEYS_VALID_PATTERN.status,
    'pass',
    'content keys valid pattern'
  );
}

// ============================================================================
// auditAllPages: page file missing → fail rule
// ============================================================================
console.log('\n── auditAllPages: missing source file ────────────────────');

setRegistry([
  { id: 'ghost', name: 'Ghost', file: 'features/pages/frontend-pages/GhostPage.tsx', category: 'frontend-pages' },
]);
vfsReset();
vfs.set(ROUTER_FILE, ''); // no router content
pageContentRows = [];
translationStatusRows = [];

quiet();
{
  const r = await auditAllPages();
  loud();
  const ghost = r.pages[0];
  assertEq(ghost.rules.PAGE_FILE_EXISTS.status, 'fail', 'missing file fail');
  assertEq(ghost.classification, 'broken-integration', 'broken-integration');
  assert(ghost.issues.length > 0, 'has issues');
}

// ============================================================================
// auditAllPages: non-editable-by-design entry
// ============================================================================
console.log('\n── auditAllPages: non-editable-by-design ─────────────────');

setRegistry([
  { id: 'login', name: 'Login', file: 'features/auth/LoginPage.tsx', category: 'auth' },
]);
vfsReset();
vfs.set(ROUTER_FILE, '');
vfs.set(FRONTEND_SRC + '/features/auth/LoginPage.tsx', 'export const LoginPage = () => null;');
pageContentRows = [];
translationStatusRows = [];

quiet();
{
  const r = await auditAllPages();
  loud();
  const login = r.pages[0];
  assertEq(login.classification, 'non-editable-by-design', 'login classified non-editable');
  assertEq(
    login.rules.PAGE_USES_EDITABLE_TEXT_OR_SHARED_SECTION.status,
    'skip',
    'rule skipped'
  );
  assertEq(
    login.rules.PAGE_CONTENT_OVERRIDE_COUNT?.status,
    'skip',
    'runtime rule skipped'
  );
}

// ============================================================================
// auditAllPages: unregistered file on disk → unknown
// ============================================================================
console.log('\n── auditAllPages: unregistered disk file ─────────────────');

setRegistry([]);
vfsReset();
vfs.set(ROUTER_FILE, '');
vfs.set(
  FRONTEND_SRC + '/features/pages/frontend-pages/MysteryPage.tsx',
  'export const MysteryPage = () => null;'
);
vdirs.set(PAGES_DIR, ['MysteryPage.tsx']);
pageContentRows = [];
translationStatusRows = [];

quiet();
{
  const r = await auditAllPages();
  loud();
  const mystery = r.pages.find((p: any) => p.name === 'MysteryPage');
  assert(mystery !== undefined, 'unregistered file surfaced');
  assertEq(mystery.classification, 'unknown', 'unknown classification');
  assertEq(mystery.rules.PAGE_IN_REGISTRY.status, 'fail', 'PAGE_IN_REGISTRY fails');
}

// ============================================================================
// auditAllPages: known unregistered file (Footer) → non-editable-by-design
// ============================================================================
console.log('\n── auditAllPages: known unregistered (Footer) ────────────');

setRegistry([]);
vfsReset();
vfs.set(ROUTER_FILE, '');
vfs.set(
  FRONTEND_SRC + '/features/pages/frontend-pages/Footer.tsx',
  'export const Footer = () => null;'
);
vdirs.set(PAGES_DIR, ['Footer.tsx']);

quiet();
{
  const r = await auditAllPages();
  loud();
  const footer = r.pages.find((p: any) => p.name === 'Footer');
  assert(footer !== undefined, 'Footer surfaced');
  assertEq(
    footer.classification,
    'non-editable-by-design',
    'Footer classified non-editable'
  );
  assertEq(
    footer.rules.PAGE_IN_REGISTRY.status,
    'skip',
    'PAGE_IN_REGISTRY skipped for known'
  );
}

// ============================================================================
// auditAllPages: runtime rules with override rows
// ============================================================================
console.log('\n── auditAllPages: runtime overrides ──────────────────────');

setRegistry([
  { id: 'about', name: 'About', file: 'features/pages/frontend-pages/AboutPage.tsx', category: 'frontend-pages' },
]);
vfsReset();
vfs.set(ROUTER_FILE, routerSource);
vfs.set(FRONTEND_SRC + '/features/pages/frontend-pages/AboutPage.tsx', aboutSource);
vdirs.set(PAGES_DIR, ['AboutPage.tsx']);
pageContentRows = [
  { page_key: 'about', content_key: 'about.hero.title' },
  { page_key: 'about', content_key: 'about.hero.subtitle' },
  { page_key: 'about', content_key: 'about.hero.stale_orphan' }, // orphaned
];
translationStatusRows = [
  { content_key: 'about.hero.title', lang_code: 'el', needs_update: 0 },
  { content_key: 'about.hero.subtitle', lang_code: 'el', needs_update: 1 },
];

quiet();
{
  const r = await auditAllPages();
  loud();
  const about = r.pages.find((p: any) => p.id === 'about');
  assertEq(about.runtime.override_count, 3, '3 overrides');
  assertEq(about.runtime.persisted_detected_key_count, 2, '2 persisted detected');
  assertEq(about.runtime.orphaned_override_count, 1, '1 orphaned');
  assertEq(about.runtime.translation_status_total, 2, '2 translation rows');
  assertEq(about.runtime.translation_needs_update_count, 1, '1 needs update');
  assertEq(
    about.rules.RUNTIME_PAGE_KEY_MATCH.status,
    'pass',
    'runtime pageKey match pass'
  );
}

// ============================================================================
// deleteOrphanedOverrides: input validation
// ============================================================================
console.log('\n── deleteOrphanedOverrides: validation ───────────────────');

{
  let caught: any = null;
  try {
    await deleteOrphanedOverrides('', ['k1'], { userId: 1 });
  } catch (e) { caught = e; }
  assert(caught !== null, 'empty pageKey throws');
  assert(
    caught && caught.message.includes('required'),
    'error mentions required'
  );
}

{
  let caught: any = null;
  try {
    await deleteOrphanedOverrides('homepage', [], { userId: 1 });
  } catch (e) { caught = e; }
  assert(caught !== null, 'empty keys array throws');
}

{
  let caught: any = null;
  try {
    await deleteOrphanedOverrides('homepage', null as any, { userId: 1 });
  } catch (e) { caught = e; }
  assert(caught !== null, 'null keys throws');
}

// ============================================================================
// deleteOrphanedOverrides: happy path — orphan present, gets deleted
// ============================================================================
console.log('\n── deleteOrphanedOverrides: happy path ───────────────────');

// Set up scenario: AboutPage has keys about.hero.{title,subtitle};
// DB has an orphan "about.hero.stale" that we want to delete.
setRegistry([
  { id: 'about', name: 'About', file: 'features/pages/frontend-pages/AboutPage.tsx', category: 'frontend-pages' },
]);
vfsReset();
vfs.set(ROUTER_FILE, routerSource);
vfs.set(FRONTEND_SRC + '/features/pages/frontend-pages/AboutPage.tsx', aboutSource);
vdirs.set(PAGES_DIR, ['AboutPage.tsx']);
pageContentRows = [
  { page_key: 'about', content_key: 'about.hero.title', content_value: 'About' },
  { page_key: 'about', content_key: 'about.hero.subtitle', content_value: 'sub' },
  { page_key: 'about', content_key: 'about.hero.stale', content_value: 'old' },
];
translationStatusRows = [];
deletedRowsLog = [];
insertedLogRows = [];

quiet();
{
  const result = await deleteOrphanedOverrides(
    'about',
    ['about.hero.stale'],
    { userId: 1, username: 'tester' }
  );
  loud();
  assertEq(result.deleted_count, 1, '1 deleted');
  assertEq(result.deleted_keys, ['about.hero.stale'], 'deleted_keys');
  assertEq(result.skipped_keys, [], 'no skipped');
  assert(deletedRowsLog.length > 0, 'DELETE query ran');
  assert(insertedLogRows.length > 0, 'audit log INSERT ran');
}

// ============================================================================
// deleteOrphanedOverrides: requested key not orphaned → all skipped
// ============================================================================
console.log('\n── deleteOrphanedOverrides: skipped (not orphaned) ──────');

setRegistry([
  { id: 'about', name: 'About', file: 'features/pages/frontend-pages/AboutPage.tsx', category: 'frontend-pages' },
]);
vfsReset();
vfs.set(ROUTER_FILE, routerSource);
vfs.set(FRONTEND_SRC + '/features/pages/frontend-pages/AboutPage.tsx', aboutSource);
vdirs.set(PAGES_DIR, ['AboutPage.tsx']);
// "about.hero.title" is detected; NOT an orphan
pageContentRows = [
  { page_key: 'about', content_key: 'about.hero.title', content_value: 'About' },
];
deletedRowsLog = [];

quiet();
{
  const result = await deleteOrphanedOverrides(
    'about',
    ['about.hero.title'],
    { userId: 1 }
  );
  loud();
  assertEq(result.deleted_count, 0, '0 deleted');
  assertEq(result.deleted_keys, [], 'nothing deleted');
  assertEq(result.skipped_keys, ['about.hero.title'], 'key in skipped');
  assert(
    typeof result.skipped_reason === 'string',
    'skipped_reason provided'
  );
  assertEq(deletedRowsLog.length, 0, 'no DELETE ran');
}

// ============================================================================
// getOrphanedOverrides: returns orphans only
// ============================================================================
console.log('\n── getOrphanedOverrides ──────────────────────────────────');

setRegistry([
  { id: 'about', name: 'About', file: 'features/pages/frontend-pages/AboutPage.tsx', category: 'frontend-pages' },
]);
vfsReset();
vfs.set(ROUTER_FILE, routerSource);
vfs.set(FRONTEND_SRC + '/features/pages/frontend-pages/AboutPage.tsx', aboutSource);
vdirs.set(PAGES_DIR, ['AboutPage.tsx']);
pageContentRows = [
  { page_key: 'about', content_key: 'about.hero.title', content_value: 'A' },
  { page_key: 'about', content_key: 'about.hero.subtitle', content_value: 'B' },
  { page_key: 'about', content_key: 'about.hero.ghost', content_value: 'G' },
];

quiet();
{
  const orphans = await getOrphanedOverrides('about');
  loud();
  assertEq(orphans.length, 1, '1 orphan');
  assertEq(orphans[0].content_key, 'about.hero.ghost', 'correct orphan key');
  assertEq(orphans[0].page_key, 'about', 'correct page_key');
  assertEq(orphans[0].content_value, 'G', 'value preserved');
}

// Empty when no orphans
pageContentRows = [
  { page_key: 'about', content_key: 'about.hero.title', content_value: 'A' },
];
quiet();
{
  const orphans = await getOrphanedOverrides('about');
  loud();
  assertEq(orphans.length, 0, 'no orphans');
}

// ============================================================================
// detectCandidates: missing router → error summary
// ============================================================================
console.log('\n── detectCandidates: missing router ──────────────────────');

setRegistry([]);
vfsReset();
// ROUTER_FILE not set in vfs → readFileSafe returns ''

quiet();
{
  const r = detectCandidates();
  loud();
  assert(r.summary.error !== undefined, 'error in summary');
  assertEq(r.candidates.length, 0, 'no candidates');
}

// ============================================================================
// detectCandidates: excluded route
// ============================================================================
console.log('\n── detectCandidates: excluded route ─────────────────────');

const routerWithLogin = `
const LoginPage = Loadable(lazy(() => import('features/auth/LoginPage')));

const Router = [
  {
    element: <BlankLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
    ],
  }
];
`;

setRegistry([]);
vfsReset();
vfs.set(ROUTER_FILE, routerWithLogin);

quiet();
{
  const r = detectCandidates();
  loud();
  const loginCandidate = r.candidates.find((c: any) => c.route === '/login');
  assert(loginCandidate !== undefined, '/login candidate present');
  assertEq(loginCandidate.classification, 'excluded', '/login excluded');
  assert(
    loginCandidate.rationale.includes('Excluded'),
    'rationale mentions excluded'
  );
  // Summary excludes `excluded` from evaluated_content_pages
  assertEq(r.summary.excluded_non_content, 1, '1 excluded route');
  assertEq(r.summary.evaluated_content_pages, 0, 'no content to evaluate');
}

// ============================================================================
// detectCandidates: already-compliant page
// ============================================================================
console.log('\n── detectCandidates: already-compliant ───────────────────');

const routerAbout = `
const AboutPage = Loadable(lazy(() => import('@/features/pages/frontend-pages/AboutPage')));

const Router = [
  {
    element: <BlankLayout />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/about', element: <AboutPage /> },
        ],
      },
    ],
  }
];
`;

setRegistry([]);
vfsReset();
vfs.set(ROUTER_FILE, routerAbout);
vfs.set(FRONTEND_SRC + '/features/pages/frontend-pages/AboutPage.tsx', aboutSource);

quiet();
{
  const r = detectCandidates();
  loud();
  const about = r.candidates.find((c: any) => c.route === '/about');
  assert(about !== undefined, '/about candidate present');
  assertEq(about.classification, 'already-compliant', 'classified compliant');
  assert(
    about.signals.editableTextCount >= 2,
    '2+ EditableText detected'
  );
  assertEq(r.summary.already_compliant, 1, 'summary already_compliant=1');
}

// ============================================================================
// detectCandidates: page with substantial hardcoded text → conversion-candidate
// ============================================================================
console.log('\n── detectCandidates: conversion-candidate ────────────────');

const plainPageSource = [
  "import { useTranslation } from 'react-i18next';",
  "export const PlainPage = () => {",
  "  const { t } = useTranslation();",
  "  return (",
  "    <div>",
  "      <h1>Welcome to Orthodox Metrics church software platform today</h1>",
  "      <p>We help Orthodox parishes manage sacramental records digitally</p>",
  "      <p>Baptism marriage and funeral registers are all supported here</p>",
  "      <p>Our i18n support covers many languages including Greek Russian Serbian</p>",
  "      <p>Translation happens automatically with our built-in services today</p>",
  "      <span>{t('homepage.title')}</span>",
  "      <span>{t('homepage.subtitle')}</span>",
  "    </div>",
  "  );",
  "};",
].join('\n');

const routerPlain = `
const PlainPage = Loadable(lazy(() => import('@/features/pages/frontend-pages/PlainPage')));

const Router = [
  {
    element: <BlankLayout />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/plain', element: <PlainPage /> },
        ],
      },
    ],
  }
];
`;

setRegistry([]);
vfsReset();
vfs.set(ROUTER_FILE, routerPlain);
vfs.set(FRONTEND_SRC + '/features/pages/frontend-pages/PlainPage.tsx', plainPageSource);

quiet();
{
  const r = detectCandidates();
  loud();
  const plain = r.candidates.find((c: any) => c.route === '/plain');
  assert(plain !== undefined, '/plain candidate present');
  assert(
    plain.classification === 'conversion-candidate' ||
    plain.classification === 'low-priority-candidate',
    'classified as candidate'
  );
  assert(plain.signals.usesI18n === true, 'detected useTranslation');
  assert(plain.signals.totalTranslatable >= 5, '5+ translatable strings');
  assert(plain.score >= 4, 'score ≥ 4 (substantial text + i18n + not data-driven + public layout)');
  assertEq(plain.inPublicLayout, true, 'in PublicLayout');
  assert(
    typeof plain.recommended_action === 'string',
    'recommended_action present'
  );
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => {
  loud();
  console.error('Unhandled test error:', e);
  process.exit(1);
});
