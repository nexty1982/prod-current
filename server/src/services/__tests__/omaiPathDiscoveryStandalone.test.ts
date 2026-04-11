#!/usr/bin/env npx tsx
/**
 * Unit tests for services/omaiPathDiscoveryStandalone.js (OMD-1129)
 *
 * Class wraps a filesystem-backed "Big Book" index for discovered files.
 * fs.promises is monkey-patched with an in-memory virtual filesystem.
 *
 * Coverage (pure helpers):
 *   - isSupportedFile: .md/.js/.ts/.json/.sh/.ps1/.sql/.yaml/.yml
 *     supported; others not
 *   - generateFileId: deterministic 12-char hex hash
 *   - classifyFile: pattern + keyword scoring, highest wins, 'Other'
 *     fallback
 *   - extractDependencies: JS imports, require calls, shell commands,
 *     relative paths ignored
 *   - analyzeSecurityContent: redacts passwords/api keys/tokens,
 *     findings list, hasSecurityIssues flag, clean → no redaction
 *   - analyzeComplexity: line/code/comment counts, ratios, averageLineLength
 *   - generateDiscoverySummary: totals, category/type stats, topCategories
 *     sort+slice, averages
 *
 * Coverage (fs-backed):
 *   - createBigBookStructure: calls mkdir on all required paths
 *   - saveFileReference: writes metadata + category file
 *   - createBigBookIndex: writes index file with shape
 *   - saveSummary: writes summary + per-day log
 *   - getStatus: not initialized (missing index) / ready / error
 *
 * OUT OF SCOPE:
 *   - scanDirectory/discoverFiles/processFile (require Dirent/readdir
 *     which is non-trivial to stub)
 *
 * Run: npx tsx server/src/services/__tests__/omaiPathDiscoveryStandalone.test.ts
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

// ── Silence logger ───────────────────────────────────────────────────
const loggerStub = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
const loggerPath = require.resolve('../../utils/logger');
require.cache[loggerPath] = {
  id: loggerPath, filename: loggerPath, loaded: true, exports: loggerStub,
} as any;

// ── Virtual filesystem ───────────────────────────────────────────────
const vfs = new Map<string, string>();
const dirs = new Set<string>();

function enoent(p: string): any {
  const e: any = new Error(`ENOENT: no such file or directory, ${p}`);
  e.code = 'ENOENT';
  return e;
}

const fsRaw = require('fs');
const mkdirCalls: string[] = [];
const writeCalls: string[] = [];

fsRaw.promises.mkdir = async (p: string, _opts?: any) => {
  mkdirCalls.push(p);
  dirs.add(p);
};
fsRaw.promises.access = async (p: string) => {
  if (!vfs.has(p) && !dirs.has(p)) throw enoent(p);
};
fsRaw.promises.readFile = async (p: string, _enc?: any) => {
  if (!vfs.has(p)) throw enoent(p);
  return vfs.get(p)!;
};
fsRaw.promises.writeFile = async (p: string, content: string) => {
  writeCalls.push(p);
  vfs.set(p, content);
};

function resetFs() {
  vfs.clear();
  dirs.clear();
  mkdirCalls.length = 0;
  writeCalls.length = 0;
}

const OMAIPathDiscoveryStandalone = require('../omaiPathDiscoveryStandalone');

async function main() {

// ============================================================================
// isSupportedFile
// ============================================================================
console.log('\n── isSupportedFile ───────────────────────────────────────');

{
  const s = new OMAIPathDiscoveryStandalone();
  assertEq(s.isSupportedFile('foo.md'), true, '.md supported');
  assertEq(s.isSupportedFile('foo.js'), true, '.js supported');
  assertEq(s.isSupportedFile('foo.ts'), true, '.ts supported');
  assertEq(s.isSupportedFile('foo.json'), true, '.json supported');
  assertEq(s.isSupportedFile('foo.sh'), true, '.sh supported');
  assertEq(s.isSupportedFile('foo.ps1'), true, '.ps1 supported');
  assertEq(s.isSupportedFile('foo.sql'), true, '.sql supported');
  assertEq(s.isSupportedFile('foo.yaml'), true, '.yaml supported');
  assertEq(s.isSupportedFile('foo.yml'), true, '.yml supported');
  assertEq(s.isSupportedFile('foo.png'), false, '.png not supported');
  assertEq(s.isSupportedFile('foo.exe'), false, '.exe not supported');
  assertEq(s.isSupportedFile('foo'), false, 'no extension not supported');
  assertEq(s.isSupportedFile('FOO.MD'), true, 'uppercase .MD (extname preserves case, tolower comparison)');
}

// ============================================================================
// generateFileId
// ============================================================================
console.log('\n── generateFileId ────────────────────────────────────────');

{
  const s = new OMAIPathDiscoveryStandalone();
  const id1 = s.generateFileId('/path/to/file.js');
  assertEq(id1.length, 12, '12 chars');
  assert(/^[a-f0-9]+$/.test(id1), 'hex only');
  const id2 = s.generateFileId('/path/to/file.js');
  assertEq(id1, id2, 'deterministic');
  const id3 = s.generateFileId('/different/path.js');
  assert(id1 !== id3, 'different inputs → different ids');
}

// ============================================================================
// classifyFile
// ============================================================================
console.log('\n── classifyFile ──────────────────────────────────────────');

{
  const s = new OMAIPathDiscoveryStandalone();

  // Build scripts: filename "build"
  const r1 = s.classifyFile(
    { path: '/x/build.js', name: 'build.js' },
    'npm run build'
  );
  assertEq(r1.type, 'Build Scripts', 'build → Build Scripts');
  assertEq(r1.category, 'DevOps > Build', 'Build category');
  assert(r1.confidence >= 2, 'pattern hit gives ≥2');

  // Test file
  const r2 = s.classifyFile(
    { path: '/x/foo.test.js', name: 'foo.test.js' },
    'describe("x", () => { it("works", () => expect(1).toBe(1)); });'
  );
  assertEq(r2.type, 'Testing Scripts', 'test → Testing Scripts');

  // Database
  const r3 = s.classifyFile(
    { path: '/x/migration.sql', name: 'migration.sql' },
    'CREATE TABLE users (id INT); ALTER TABLE users ADD ...;'
  );
  assertEq(r3.type, 'Database Scripts', 'sql → Database Scripts');

  // Config
  const r4 = s.classifyFile(
    { path: '/x/package.json', name: 'package.json' },
    '{"scripts":{},"dependencies":{}}'
  );
  assertEq(r4.type, 'Configuration', 'package.json → Configuration');

  // Documentation
  const r5 = s.classifyFile(
    { path: '/x/README.md', name: 'README.md' },
    '# Title\n## Section\n- [x] Task'
  );
  assertEq(r5.type, 'Documentation', 'readme.md → Documentation');

  // Other / fallback
  const r6 = s.classifyFile(
    { path: '/x/random.xyz', name: 'random.xyz' },
    'some unrelated content'
  );
  assertEq(r6.type, 'Other', 'unmatched → Other');
  assertEq(r6.category, 'Uncategorized', 'Uncategorized');
  assertEq(r6.confidence, 0, 'zero confidence');
}

// ============================================================================
// extractDependencies
// ============================================================================
console.log('\n── extractDependencies ───────────────────────────────────');

{
  const s = new OMAIPathDiscoveryStandalone();

  // ES imports
  const d1 = s.extractDependencies(
    { extension: '.js' },
    `import React from 'react';\nimport { x } from 'lodash';`
  );
  assertEq(d1.length, 2, '2 imports');
  assertEq(d1[0].name, 'react', 'react');
  assertEq(d1[0].type, 'npm_package', 'npm_package type');
  assertEq(d1[1].name, 'lodash', 'lodash');

  // Require
  const d2 = s.extractDependencies(
    { extension: '.js' },
    `const fs = require('fs');\nconst foo = require('./local');`
  );
  assertEq(d2.length, 1, 'relative paths skipped');
  assertEq(d2[0].name, 'fs', 'fs found');

  // Shell dependencies
  const d3 = s.extractDependencies(
    { extension: '.sh' },
    `#!/bin/bash\napt install nginx\nnpm install\ndocker build .\n`
  );
  assert(d3.some((x: any) => x.name === 'apt'), 'apt');
  assert(d3.some((x: any) => x.name === 'npm'), 'npm');
  assert(d3.some((x: any) => x.name === 'docker'), 'docker');

  // Empty content
  const d4 = s.extractDependencies({ extension: '.js' }, '');
  assertEq(d4.length, 0, 'empty → []');
}

// ============================================================================
// analyzeSecurityContent
// ============================================================================
console.log('\n── analyzeSecurityContent ────────────────────────────────');

{
  const s = new OMAIPathDiscoveryStandalone();

  // Clean content
  const r1 = s.analyzeSecurityContent('const x = 1;\nconsole.log(x);');
  assertEq(r1.hasSecurityIssues, false, 'clean → no issues');
  assertEq(r1.findings.length, 0, '0 findings');
  assertEq(r1.redactedContent, null, 'no redacted content');

  // Password
  const r2 = s.analyzeSecurityContent(`const password = 'secret123';`);
  assertEq(r2.hasSecurityIssues, true, 'password flagged');
  assert(r2.findings.length >= 1, '≥1 finding');
  assert(r2.redactedContent !== null, 'redacted content generated');
  assert(r2.redactedContent.includes('[REDACTED]'), 'REDACTED marker');
  assert(!r2.redactedContent.includes('secret123'), 'original value gone');

  // API key
  const r3 = s.analyzeSecurityContent(`const apiKey = 'abc123xyz';`);
  assertEq(r3.hasSecurityIssues, true, 'api key flagged');

  // process.env reference
  const r4 = s.analyzeSecurityContent(`const x = process.env.SECRET_KEY;`);
  assertEq(r4.hasSecurityIssues, true, 'process.env flagged');
}

// ============================================================================
// analyzeComplexity
// ============================================================================
console.log('\n── analyzeComplexity ─────────────────────────────────────');

{
  const s = new OMAIPathDiscoveryStandalone();

  const content = [
    '// comment line',
    'const x = 1;',
    'const y = 2;',
    '',
    '/* block comment',
    ' * continued',
    ' */',
    'function add(a, b) {',
    '  return a + b;',
    '}',
  ].join('\n');

  const r = s.analyzeComplexity(content);
  assertEq(r.totalLines, 10, '10 total lines');
  assert(r.commentLines >= 3, '≥3 comment lines');
  assert(r.codeLines > 0, 'code lines counted');
  assert(r.commentRatio > 0 && r.commentRatio < 1, 'ratio in range');
  assert(r.averageLineLength > 0, 'avg > 0');
}

// Empty content → zero ratios
{
  const s = new OMAIPathDiscoveryStandalone();
  const r = s.analyzeComplexity('');
  assertEq(r.totalLines, 1, 'empty → 1 line (split produces [""])');
  assertEq(r.commentRatio, 0, '0 ratio on empty');
}

// ============================================================================
// generateDiscoverySummary
// ============================================================================
console.log('\n── generateDiscoverySummary ──────────────────────────────');

{
  const s = new OMAIPathDiscoveryStandalone();
  const files = [
    { classification: { type: 'Build Scripts', category: 'DevOps > Build' }, size: 1000 },
    { classification: { type: 'Build Scripts', category: 'DevOps > Build' }, size: 2000 },
    { classification: { type: 'Documentation', category: 'Documentation' }, size: 500 },
    { classification: { type: 'Testing Scripts', category: 'DevOps > Test' }, size: 1500 },
  ];
  const summary = s.generateDiscoverySummary(files);
  assertEq(summary.totalFiles, 4, '4 files');
  assertEq(summary.categories['DevOps > Build'], 2, 'build count');
  assertEq(summary.categories['Documentation'], 1, 'docs count');
  assertEq(summary.types['Build Scripts'], 2, 'Build Scripts type');
  assertEq(summary.totalSize, 5000, 'total size');
  assertEq(summary.averageFileSize, 1250, 'avg size');
  assert(Array.isArray(summary.topCategories), 'topCategories array');
  assertEq(summary.topCategories[0].category, 'DevOps > Build', 'top is build (highest count)');
  assert(summary.topCategories.length <= 10, 'top ≤10');
}

// Empty list → zero averages
{
  const s = new OMAIPathDiscoveryStandalone();
  const summary = s.generateDiscoverySummary([]);
  assertEq(summary.totalFiles, 0, '0 files');
  assertEq(summary.averageFileSize, 0, '0 avg');
  assertEq(summary.totalSize, 0, '0 size');
}

// ============================================================================
// createBigBookStructure
// ============================================================================
console.log('\n── createBigBookStructure ────────────────────────────────');

resetFs();
{
  const s = new OMAIPathDiscoveryStandalone();
  await s.createBigBookStructure();
  assertEq(mkdirCalls.length, 6, '6 directories');
  assert(mkdirCalls.some((p) => p.includes('index')), 'index dir');
  assert(mkdirCalls.some((p) => p.includes('metadata')), 'metadata dir');
  assert(mkdirCalls.some((p) => p.includes('references')), 'references dir');
  assert(mkdirCalls.some((p) => p.includes('categories')), 'categories dir');
  assert(mkdirCalls.some((p) => p.includes('logs')), 'logs dir');
}

// EEXIST errors swallowed
resetFs();
{
  const origMkdir = fsRaw.promises.mkdir;
  fsRaw.promises.mkdir = async () => {
    const e: any = new Error('EEXIST');
    e.code = 'EEXIST';
    throw e;
  };
  const s = new OMAIPathDiscoveryStandalone();
  // Should not throw
  await s.createBigBookStructure();
  assert(true, 'EEXIST swallowed');
  fsRaw.promises.mkdir = origMkdir;
}

// ============================================================================
// saveFileReference
// ============================================================================
console.log('\n── saveFileReference ─────────────────────────────────────');

resetFs();
{
  const s = new OMAIPathDiscoveryStandalone();
  const ref = {
    id: 'abc123',
    originalPath: '/x/foo.js',
    relativePath: 'foo.js',
    name: 'foo.js',
    extension: '.js',
    size: 100,
    modified: new Date(),
    created: new Date(),
    classification: { type: 'Build Scripts', category: 'DevOps > Build' },
    metadata: {},
    contentHash: 'hash',
    discoveredAt: new Date().toISOString(),
  };
  await s.saveFileReference(ref);
  // metadata + category file
  assert(writeCalls.some((p) => p.includes('metadata') && p.includes('abc123.json')), 'metadata file');
  assert(writeCalls.some((p) => p.includes('categories') && p.includes('abc123.ref')), 'category file');
  // Category dir sanitized
  assert(mkdirCalls.some((p) => /DevOps.*Build/.test(p)), 'category dir with sanitized name');
}

// ============================================================================
// createBigBookIndex
// ============================================================================
console.log('\n── createBigBookIndex ────────────────────────────────────');

resetFs();
{
  const s = new OMAIPathDiscoveryStandalone();
  const files = [
    {
      id: 'id1', name: 'build.js', originalPath: '/a/build.js', relativePath: 'build.js',
      size: 100, modified: new Date(), contentHash: 'h1', discoveredAt: '2026-01-01',
      classification: { type: 'Build Scripts', category: 'DevOps > Build' },
    },
    {
      id: 'id2', name: 'readme.md', originalPath: '/a/readme.md', relativePath: 'readme.md',
      size: 50, modified: new Date(), contentHash: 'h2', discoveredAt: '2026-01-01',
      classification: { type: 'Documentation', category: 'Documentation' },
    },
  ];
  await s.createBigBookIndex(files);
  assert(writeCalls.some((p) => p.includes('bigbook-index.json')), 'index written');
  const indexContent = JSON.parse(vfs.get(s.indexPath)!);
  assertEq(indexContent.version, '1.0.0', 'version');
  assertEq(indexContent.totalFiles, 2, '2 files');
  assert(indexContent.categories['DevOps > Build'], 'build category');
  assertEq(indexContent.categories['DevOps > Build'].count, 1, 'build count');
  assert(indexContent.files.id1, 'id1 in files');
  assertEq(indexContent.files.id1.type, 'Build Scripts', 'id1 type');
}

// ============================================================================
// saveSummary
// ============================================================================
console.log('\n── saveSummary ───────────────────────────────────────────');

resetFs();
{
  const s = new OMAIPathDiscoveryStandalone();
  const summary = { totalFiles: 5, categories: {}, types: {}, topCategories: [], averageFileSize: 100, totalSize: 500, timestamp: '2026-01-01' };
  await s.saveSummary(summary);
  assert(writeCalls.some((p) => p.includes('discovery-summary.json')), 'summary file');
  assert(writeCalls.some((p) => p.includes('logs/discovery-') && p.endsWith('.log')), 'log file');
}

// ============================================================================
// getStatus
// ============================================================================
console.log('\n── getStatus ─────────────────────────────────────────────');

// Not initialized
resetFs();
{
  const s = new OMAIPathDiscoveryStandalone();
  const st = await s.getStatus();
  assertEq(st.status, 'not_initialized', 'not initialized');
}

// Ready
resetFs();
{
  const s = new OMAIPathDiscoveryStandalone();
  const idx = {
    version: '1.0.0',
    createdAt: '2026-04-10T00:00:00Z',
    totalFiles: 42,
    categories: { 'DevOps > Build': { files: [], count: 2 }, 'Documentation': { files: [], count: 5 } },
    files: {},
  };
  vfs.set(s.indexPath, JSON.stringify(idx));
  const st = await s.getStatus();
  assertEq(st.status, 'ready', 'ready');
  assertEq(st.version, '1.0.0', 'version');
  assertEq(st.totalFiles, 42, 'totalFiles');
  assertEq(st.categories, 2, '2 categories');
  assertEq(st.lastDiscovery, '2026-04-10T00:00:00Z', 'lastDiscovery');
}

// Error (corrupted JSON)
resetFs();
{
  const s = new OMAIPathDiscoveryStandalone();
  vfs.set(s.indexPath, 'not-valid-json');
  const st = await s.getStatus();
  assertEq(st.status, 'error', 'error');
  assert(st.error !== undefined, 'has error message');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main()

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
