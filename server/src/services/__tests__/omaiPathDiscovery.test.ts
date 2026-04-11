#!/usr/bin/env npx tsx
/**
 * Unit tests for services/omaiPathDiscovery.js (OMD-1130)
 *
 * Non-standalone variant of omaiPathDiscoveryStandalone that adds
 * EncryptedStorage initialization + a scheduleDiscovery method.
 *
 * Same core classifier + fs-backed logic as standalone; we also cover:
 *   - constructor wires encryptedStorage
 *   - initialize calls encryptedStorage.initialize()
 *   - scheduleDiscovery runs initial + sets interval
 *
 * Stubs:
 *   - utils/logger via require.cache
 *   - utils/encryptedStorage via require.cache (constructor + init)
 *   - fs.promises monkey-patched with in-memory vfs
 *
 * OUT OF SCOPE: scanDirectory/discoverFiles/processFile (Dirent stubbing)
 *
 * Run: npx tsx server/src/services/__tests__/omaiPathDiscovery.test.ts
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

// ── Stub EncryptedStorage ────────────────────────────────────────────
let encryptedInitCalls = 0;
class FakeEncryptedStorage {
  async initialize() { encryptedInitCalls++; }
}
const esPath = require.resolve('../../utils/encryptedStorage');
require.cache[esPath] = {
  id: esPath, filename: esPath, loaded: true, exports: FakeEncryptedStorage,
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
  encryptedInitCalls = 0;
}

const OMAIPathDiscovery = require('../omaiPathDiscovery');

async function main() {

// ============================================================================
// Constructor
// ============================================================================
console.log('\n── constructor ───────────────────────────────────────────');

{
  const s = new OMAIPathDiscovery();
  assertEq(s.productionRoot, '/var/www/orthodoxmetrics/prod', 'productionRoot');
  assert(s.bigBookRoot.endsWith('bigbook'), 'bigBookRoot');
  assert(s.indexPath.endsWith('bigbook-index.json'), 'indexPath');
  assert(s.encryptedStorage !== undefined, 'encryptedStorage instantiated');
  assert(s.classifications !== undefined, 'classifications set');
  assert(s.securityPatterns.length > 0, 'security patterns set');
}

// ============================================================================
// initialize → createBigBookStructure + encryptedStorage.initialize
// ============================================================================
console.log('\n── initialize ────────────────────────────────────────────');

resetFs();
{
  const s = new OMAIPathDiscovery();
  const result = await s.initialize();
  assertEq(result, true, 'returns true');
  assert(mkdirCalls.length >= 6, '≥6 mkdir calls');
  assertEq(encryptedInitCalls, 1, 'encrypted storage initialized');
}

// ============================================================================
// isSupportedFile
// ============================================================================
console.log('\n── isSupportedFile ───────────────────────────────────────');

{
  const s = new OMAIPathDiscovery();
  assertEq(s.isSupportedFile('foo.md'), true, '.md');
  assertEq(s.isSupportedFile('foo.js'), true, '.js');
  assertEq(s.isSupportedFile('foo.ts'), true, '.ts');
  assertEq(s.isSupportedFile('foo.json'), true, '.json');
  assertEq(s.isSupportedFile('foo.sql'), true, '.sql');
  assertEq(s.isSupportedFile('foo.png'), false, '.png not');
  assertEq(s.isSupportedFile('foo'), false, 'no ext');
}

// ============================================================================
// generateFileId
// ============================================================================
console.log('\n── generateFileId ────────────────────────────────────────');

{
  const s = new OMAIPathDiscovery();
  const id = s.generateFileId('/x/y.js');
  assertEq(id.length, 12, '12 chars');
  assert(/^[a-f0-9]+$/.test(id), 'hex');
  assertEq(s.generateFileId('/x/y.js'), id, 'deterministic');
}

// ============================================================================
// classifyFile
// ============================================================================
console.log('\n── classifyFile ──────────────────────────────────────────');

{
  const s = new OMAIPathDiscovery();
  assertEq(s.classifyFile({ path: '/x/build.js', name: 'build.js' }, 'npm run').type, 'Build Scripts', 'build');
  assertEq(s.classifyFile({ path: '/x/test.js', name: 'test.js' }, 'describe(').type, 'Testing Scripts', 'test');
  assertEq(s.classifyFile({ path: '/x/schema.sql', name: 'schema.sql' }, 'CREATE TABLE').type, 'Database Scripts', 'sql');
  assertEq(s.classifyFile({ path: '/x/readme.md', name: 'readme.md' }, '# Title').type, 'Documentation', 'md');
  const other = s.classifyFile({ path: '/x/unk.xyz', name: 'unk.xyz' }, 'nothing');
  assertEq(other.type, 'Other', 'fallback');
  assertEq(other.confidence, 0, 'zero confidence');
}

// ============================================================================
// extractDependencies
// ============================================================================
console.log('\n── extractDependencies ───────────────────────────────────');

{
  const s = new OMAIPathDiscovery();
  const d1 = s.extractDependencies({ extension: '.js' }, `import React from 'react';\nrequire('fs');`);
  assertEq(d1.length, 2, '2 deps');
  assert(d1.some((d: any) => d.name === 'react'), 'react');
  assert(d1.some((d: any) => d.name === 'fs'), 'fs');

  // Relative skipped
  const d2 = s.extractDependencies({ extension: '.js' }, `require('./local');`);
  assertEq(d2.length, 0, 'relative skipped');

  // Shell
  const d3 = s.extractDependencies({ extension: '.sh' }, `apt install\nnpm ci\n`);
  assert(d3.some((d: any) => d.name === 'apt'), 'apt');
  assert(d3.some((d: any) => d.name === 'npm'), 'npm');
}

// ============================================================================
// analyzeSecurityContent
// ============================================================================
console.log('\n── analyzeSecurityContent ────────────────────────────────');

{
  const s = new OMAIPathDiscovery();
  const clean = s.analyzeSecurityContent('const x = 1;');
  assertEq(clean.hasSecurityIssues, false, 'clean');
  assertEq(clean.redactedContent, null, 'no redaction');

  const bad = s.analyzeSecurityContent(`const password = 'secret123';`);
  assertEq(bad.hasSecurityIssues, true, 'flagged');
  assert(bad.redactedContent.includes('[REDACTED]'), 'redacted');
  assert(!bad.redactedContent.includes('secret123'), 'value removed');

  const env = s.analyzeSecurityContent(`const x = process.env.API_KEY;`);
  assertEq(env.hasSecurityIssues, true, 'process.env flagged');
}

// ============================================================================
// analyzeComplexity
// ============================================================================
console.log('\n── analyzeComplexity ─────────────────────────────────────');

{
  const s = new OMAIPathDiscovery();
  const content = `// c1\nconst x = 1;\n/* block */\nfunction f() {}\n`;
  const r = s.analyzeComplexity(content);
  assert(r.totalLines > 0, 'total > 0');
  assert(r.commentLines >= 2, 'comments counted');
  assert(r.codeLines >= 1, 'code counted');
  assert(r.averageLineLength > 0, 'avg > 0');
}

// ============================================================================
// generateDiscoverySummary
// ============================================================================
console.log('\n── generateDiscoverySummary ──────────────────────────────');

{
  const s = new OMAIPathDiscovery();
  const files = [
    { classification: { type: 'Build Scripts', category: 'DevOps > Build' }, size: 100 },
    { classification: { type: 'Documentation', category: 'Documentation' }, size: 200 },
  ];
  const sum = s.generateDiscoverySummary(files);
  assertEq(sum.totalFiles, 2, '2 files');
  assertEq(sum.totalSize, 300, 'total size');
  assertEq(sum.averageFileSize, 150, 'avg');
  assert(sum.topCategories.length === 2, '2 top');
}

// Empty
{
  const s = new OMAIPathDiscovery();
  const sum = s.generateDiscoverySummary([]);
  assertEq(sum.totalFiles, 0, 'empty');
  assertEq(sum.averageFileSize, 0, 'zero avg');
}

// ============================================================================
// createBigBookStructure
// ============================================================================
console.log('\n── createBigBookStructure ────────────────────────────────');

resetFs();
{
  const s = new OMAIPathDiscovery();
  await s.createBigBookStructure();
  assertEq(mkdirCalls.length, 6, '6 dirs');
  assert(mkdirCalls.some((p) => p.includes('metadata')), 'metadata');
  assert(mkdirCalls.some((p) => p.includes('categories')), 'categories');
}

// EEXIST swallowed
resetFs();
{
  const orig = fsRaw.promises.mkdir;
  fsRaw.promises.mkdir = async () => {
    const e: any = new Error('EEXIST');
    e.code = 'EEXIST';
    throw e;
  };
  const s = new OMAIPathDiscovery();
  await s.createBigBookStructure();
  assert(true, 'EEXIST swallowed');
  fsRaw.promises.mkdir = orig;
}

// ============================================================================
// saveFileReference
// ============================================================================
console.log('\n── saveFileReference ─────────────────────────────────────');

resetFs();
{
  const s = new OMAIPathDiscovery();
  const ref = {
    id: 'id1', originalPath: '/x/f.js', relativePath: 'f.js', name: 'f.js',
    extension: '.js', size: 100, modified: new Date(), created: new Date(),
    classification: { type: 'Build Scripts', category: 'DevOps > Build' },
    metadata: {}, contentHash: 'h', discoveredAt: '2026-01-01',
  };
  await s.saveFileReference(ref);
  assert(writeCalls.some((p) => p.includes('metadata') && p.includes('id1')), 'metadata file');
  assert(writeCalls.some((p) => p.includes('categories') && p.includes('id1')), 'category file');
}

// ============================================================================
// createBigBookIndex
// ============================================================================
console.log('\n── createBigBookIndex ────────────────────────────────────');

resetFs();
{
  const s = new OMAIPathDiscovery();
  const files = [
    {
      id: 'a', name: 'a.js', originalPath: '/x/a.js', relativePath: 'a.js',
      size: 10, modified: new Date(), contentHash: 'h', discoveredAt: '2026',
      classification: { type: 'Build Scripts', category: 'DevOps > Build' },
    },
    {
      id: 'b', name: 'b.md', originalPath: '/x/b.md', relativePath: 'b.md',
      size: 20, modified: new Date(), contentHash: 'h', discoveredAt: '2026',
      classification: { type: 'Documentation', category: 'Documentation' },
    },
  ];
  await s.createBigBookIndex(files);
  const idx = JSON.parse(vfs.get(s.indexPath)!);
  assertEq(idx.version, '1.0.0', 'version');
  assertEq(idx.totalFiles, 2, 'total');
  assert(idx.categories['DevOps > Build'], 'build cat');
  assert(idx.files.a, 'a in files');
  assert(idx.files.b, 'b in files');
}

// ============================================================================
// saveSummary
// ============================================================================
console.log('\n── saveSummary ───────────────────────────────────────────');

resetFs();
{
  const s = new OMAIPathDiscovery();
  await s.saveSummary({ totalFiles: 1, categories: {}, types: {}, topCategories: [], averageFileSize: 0, totalSize: 0, timestamp: 'x' });
  assert(writeCalls.some((p) => p.includes('discovery-summary.json')), 'summary written');
  assert(writeCalls.some((p) => p.includes('logs/discovery-')), 'log written');
}

// ============================================================================
// getStatus
// ============================================================================
console.log('\n── getStatus ─────────────────────────────────────────────');

// Not initialized
resetFs();
{
  const s = new OMAIPathDiscovery();
  assertEq((await s.getStatus()).status, 'not_initialized', 'not initialized');
}

// Ready
resetFs();
{
  const s = new OMAIPathDiscovery();
  vfs.set(s.indexPath, JSON.stringify({
    version: '1.0.0', createdAt: '2026-04-10', totalFiles: 5,
    categories: { 'A': {}, 'B': {} }, files: {},
  }));
  const st = await s.getStatus();
  assertEq(st.status, 'ready', 'ready');
  assertEq(st.totalFiles, 5, 'totalFiles');
  assertEq(st.categories, 2, 'category count');
}

// Error
resetFs();
{
  const s = new OMAIPathDiscovery();
  vfs.set(s.indexPath, 'bogus');
  const st = await s.getStatus();
  assertEq(st.status, 'error', 'error status');
  assert(st.error !== undefined, 'has error');
}

// ============================================================================
// scheduleDiscovery (minimal: runs initial then setInterval)
// ============================================================================
console.log('\n── scheduleDiscovery ─────────────────────────────────────');

// We can't fully exercise the interval without waiting; we verify it:
// 1) calls discoverFiles once via the initial run
// 2) schedules setInterval (which we monkey-patch to capture)
{
  // Monkey-patch setInterval to capture and NOT keep the loop alive
  const origSetInterval = global.setInterval;
  let intervalSet = false;
  let intervalMs = 0;
  (global as any).setInterval = ((fn: any, ms: number) => {
    intervalSet = true;
    intervalMs = ms;
    return { unref: () => {} };
  }) as any;

  const s = new OMAIPathDiscovery();
  // Stub discoverFiles
  let discoverCalls = 0;
  s.discoverFiles = async () => { discoverCalls++; return { totalFiles: 0 }; };

  await s.scheduleDiscovery(1); // 1 hour
  assertEq(discoverCalls, 1, 'initial discovery ran');
  assertEq(intervalSet, true, 'setInterval called');
  assertEq(intervalMs, 60 * 60 * 1000, 'correct interval ms');

  // Also test error swallowed
  s.discoverFiles = async () => { throw new Error('boom'); };
  // Rerun the initial via schedule — should not throw
  await s.scheduleDiscovery(2);
  assert(true, 'error swallowed');

  (global as any).setInterval = origSetInterval;
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main()

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
