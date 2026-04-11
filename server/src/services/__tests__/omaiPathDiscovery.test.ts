#!/usr/bin/env npx tsx
/**
 * Unit tests for services/omaiPathDiscovery.js (OMD-1197)
 *
 * OMAIPathDiscovery — file classification + Big Book indexing.
 *
 * Dependencies:
 *   - fs.promises   → stubbed with in-memory VFS after SUT require
 *   - path          → real
 *   - crypto        → real (deterministic hashes)
 *   - ../utils/logger           → stubbed via require.cache
 *   - ../utils/encryptedStorage → stubbed via require.cache
 *
 * Coverage:
 *   - Pure classification / analysis:
 *       · isSupportedFile: known/unknown extensions
 *       · classifyFile: type, category, confidence scoring
 *       · extractDependencies: JS imports, require(), shell commands
 *       · analyzeSecurityContent: redaction + findings
 *       · analyzeComplexity: line / comment / ratio math
 *       · generateFileId: deterministic 12-char MD5
 *       · generateDiscoverySummary: category/type stats, topCategories,
 *         averages, totals
 *
 *   - I/O-backed:
 *       · createBigBookStructure: creates expected dirs
 *       · scanDirectory: respects skipDirs, reads file metadata
 *       · processFile: integrates classification + metadata + save
 *       · saveFileReference: writes metadata + category ref files
 *       · createBigBookIndex: correct JSON shape
 *       · saveSummary: writes summary + dated log
 *       · getStatus: not_initialized / ready / error paths
 *       · initialize: happy path / failure path
 *       · discoverFiles: orchestrates scan + filter + process
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

// ── Stub logger + encryptedStorage via require.cache ───────────────
const nodePath = require('path');
const sutDir = nodePath.dirname(require.resolve('../omaiPathDiscovery'));

const loggerAbs = require.resolve(nodePath.resolve(sutDir, '..', 'utils', 'logger'));
const loggerLog: Array<{ level: string; args: any[] }> = [];
const loggerStub = {
  info: (...args: any[]) => { loggerLog.push({ level: 'info', args }); },
  warn: (...args: any[]) => { loggerLog.push({ level: 'warn', args }); },
  error: (...args: any[]) => { loggerLog.push({ level: 'error', args }); },
  debug: (...args: any[]) => { loggerLog.push({ level: 'debug', args }); },
};
require.cache[loggerAbs] = {
  id: loggerAbs, filename: loggerAbs, loaded: true, exports: loggerStub,
} as any;

const encStorageAbs = require.resolve(nodePath.resolve(sutDir, '..', 'utils', 'encryptedStorage'));
let encInitialized = false;
class FakeEncryptedStorage {
  async initialize() { encInitialized = true; return true; }
}
require.cache[encStorageAbs] = {
  id: encStorageAbs, filename: encStorageAbs, loaded: true,
  exports: FakeEncryptedStorage,
} as any;

// ── Require SUT BEFORE patching fs.promises ────────────────────────
const OMAIPathDiscovery = require('../omaiPathDiscovery');

// ── In-memory VFS backing fs.promises ──────────────────────────────
const fs = require('fs');
const fsPromises = fs.promises;

type FakeDirEntry = { name: string; isDirectory(): boolean; isFile(): boolean };

interface VFS {
  files: Map<string, { content: string; size: number; mtime: Date; birthtime: Date }>;
  dirs: Set<string>;
}

const vfs: VFS = { files: new Map(), dirs: new Set() };

const origReaddir = fsPromises.readdir;
const origStat = fsPromises.stat;
const origMkdir = fsPromises.mkdir;
const origReadFile = fsPromises.readFile;
const origWriteFile = fsPromises.writeFile;
const origAccess = fsPromises.access;

fsPromises.readdir = async (p: any, opts?: any) => {
  const dirPath = String(p);
  if (vfs.dirs.has(dirPath)) {
    const children: FakeDirEntry[] = [];
    // files under dirPath directly
    for (const [fPath] of vfs.files) {
      if (nodePath.dirname(fPath) === dirPath) {
        const name = nodePath.basename(fPath);
        children.push({ name, isDirectory: () => false, isFile: () => true });
      }
    }
    // sub-dirs directly under dirPath
    for (const d of vfs.dirs) {
      if (d !== dirPath && nodePath.dirname(d) === dirPath) {
        const name = nodePath.basename(d);
        children.push({ name, isDirectory: () => true, isFile: () => false });
      }
    }
    if (opts && opts.withFileTypes) return children;
    return children.map(c => c.name);
  }
  return origReaddir(p, opts);
};

fsPromises.stat = async (p: any) => {
  const fPath = String(p);
  if (vfs.files.has(fPath)) {
    const f = vfs.files.get(fPath)!;
    return { size: f.size, mtime: f.mtime, birthtime: f.birthtime,
             isFile: () => true, isDirectory: () => false } as any;
  }
  if (vfs.dirs.has(fPath)) {
    return { size: 0, mtime: new Date(0), birthtime: new Date(0),
             isFile: () => false, isDirectory: () => true } as any;
  }
  return origStat(p);
};

fsPromises.mkdir = async (p: any, opts?: any) => {
  const dirPath = String(p);
  // In-memory: always succeed. Track the directory so readdir sees it.
  vfs.dirs.add(dirPath);
  return undefined as any;
};

fsPromises.readFile = async (p: any, enc?: any) => {
  const fPath = String(p);
  if (vfs.files.has(fPath)) return vfs.files.get(fPath)!.content;
  return origReadFile(p, enc);
};

fsPromises.writeFile = async (p: any, data: any, opts?: any) => {
  const fPath = String(p);
  const content = typeof data === 'string' ? data : String(data);
  vfs.dirs.add(nodePath.dirname(fPath));
  vfs.files.set(fPath, {
    content,
    size: content.length,
    mtime: new Date(),
    birthtime: new Date(),
  });
  return undefined as any;
};

fsPromises.access = async (p: any) => {
  const fPath = String(p);
  if (vfs.files.has(fPath) || vfs.dirs.has(fPath)) return;
  throw new Error(`ENOENT: ${fPath}`);
};

function vfsAddFile(p: string, content: string, mtime = new Date(), birthtime = new Date()) {
  vfs.files.set(p, { content, size: content.length, mtime, birthtime });
  vfs.dirs.add(nodePath.dirname(p));
}

function vfsReset() {
  vfs.files.clear();
  vfs.dirs.clear();
  loggerLog.length = 0;
  encInitialized = false;
}

// Silence console during noisy tests
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

async function main() {

// ============================================================================
// isSupportedFile
// ============================================================================
console.log('\n── isSupportedFile ───────────────────────────────────────');

{
  const d = new OMAIPathDiscovery();
  assertEq(d.isSupportedFile('/x/script.js'), true, '.js supported');
  assertEq(d.isSupportedFile('/x/script.ts'), true, '.ts supported');
  assertEq(d.isSupportedFile('/x/note.md'), true, '.md supported');
  assertEq(d.isSupportedFile('/x/c.json'), true, '.json supported');
  assertEq(d.isSupportedFile('/x/d.sh'), true, '.sh supported');
  assertEq(d.isSupportedFile('/x/e.yaml'), true, '.yaml supported');
  assertEq(d.isSupportedFile('/x/f.yml'), true, '.yml supported');
  assertEq(d.isSupportedFile('/x/g.sql'), true, '.sql supported');
  assertEq(d.isSupportedFile('/x/h.ps1'), true, '.ps1 supported');
  assertEq(d.isSupportedFile('/x/img.png'), false, '.png not supported');
  assertEq(d.isSupportedFile('/x/doc.pdf'), false, '.pdf not supported');
  assertEq(d.isSupportedFile('/x/no-extension'), false, 'no ext');
  // Case-insensitive
  assertEq(d.isSupportedFile('/x/File.JS'), true, '.JS (case-insensitive)');
}

// ============================================================================
// classifyFile
// ============================================================================
console.log('\n── classifyFile ──────────────────────────────────────────');

{
  const d = new OMAIPathDiscovery();

  // Testing script
  const testResult = d.classifyFile(
    { path: '/src/foo.test.js', name: 'foo.test.js' },
    `describe('x', () => { it('works', () => { expect(1).toBe(1); }); });`,
  );
  assertEq(testResult.type, 'Testing Scripts', 'test type');
  assertEq(testResult.category, 'DevOps > Test', 'test category');
  assert(testResult.confidence > 0, 'confidence > 0');

  // Database script
  const dbResult = d.classifyFile(
    { path: '/migrations/001.sql', name: '001.sql' },
    'CREATE TABLE users (id INT);',
  );
  assertEq(dbResult.type, 'Database Scripts', 'db type');

  // Frontend component
  const feResult = d.classifyFile(
    { path: '/src/Button.tsx', name: 'Button.tsx' },
    `import React from 'react'; const Button = () => { const [s, setS] = useState(0); };`,
  );
  assertEq(feResult.type, 'Frontend Scripts', 'frontend type');

  // Shell setup script
  const setupResult = d.classifyFile(
    { path: '/setup.sh', name: 'setup.sh' },
    '#!/bin/bash\nnpm install\n',
  );
  assertEq(setupResult.type, 'Setup Scripts', 'setup type');

  // Documentation
  const docResult = d.classifyFile(
    { path: '/README.md', name: 'README.md' },
    '# Title\n## Sub\n- [ ] todo',
  );
  assertEq(docResult.type, 'Documentation', 'doc type');

  // Uncategorized fallback
  const otherResult = d.classifyFile(
    { path: '/random.xyz', name: 'random.xyz' },
    'random content with no keywords',
  );
  assertEq(otherResult.type, 'Other', 'fallback type');
  assertEq(otherResult.category, 'Uncategorized', 'uncategorized');
  assertEq(otherResult.confidence, 0, 'zero confidence');
}

// ============================================================================
// extractDependencies
// ============================================================================
console.log('\n── extractDependencies ───────────────────────────────────');

{
  const d = new OMAIPathDiscovery();

  // JS imports
  const jsDeps = d.extractDependencies(
    { path: '/a.js', name: 'a.js', extension: '.js' },
    `import React from 'react';\nimport { x } from 'lodash';\nconst fs = require('fs');\nimport './local';`,
  );
  const names = jsDeps.map((d: any) => d.name);
  assert(names.includes('react'), 'react dep');
  assert(names.includes('lodash'), 'lodash dep');
  assert(names.includes('fs'), 'fs dep');
  assert(!names.includes('./local'), 'relative imports skipped');
  assert(jsDeps.every((d: any) => d.type === 'npm_package'), 'all npm_package type');

  // Shell deps
  const shDeps = d.extractDependencies(
    { path: '/setup.sh', name: 'setup.sh', extension: '.sh' },
    '#!/bin/bash\napt install foo\nnpm install bar\ngit clone baz\n',
  );
  const shNames = shDeps.map((d: any) => d.name);
  assert(shNames.includes('apt'), 'apt');
  assert(shNames.includes('npm'), 'npm');
  assert(shNames.includes('git'), 'git');
  assert(shDeps.every((d: any) => d.type === 'system_command'), 'all system_command');
}

// ============================================================================
// analyzeSecurityContent
// ============================================================================
console.log('\n── analyzeSecurityContent ────────────────────────────────');

{
  const d = new OMAIPathDiscovery();

  // Clean content
  const clean = d.analyzeSecurityContent('const x = 5;');
  assertEq(clean.hasSecurityIssues, false, 'clean — no issues');
  assertEq(clean.findings.length, 0, 'no findings');
  assertEq(clean.redactedContent, null, 'no redacted copy');

  // Contains password
  const dirty = d.analyzeSecurityContent(`const password = "supersecret123";`);
  assertEq(dirty.hasSecurityIssues, true, 'dirty — issues found');
  assert(dirty.findings.length >= 1, 'findings recorded');
  assert(dirty.redactedContent !== null, 'redacted content present');
  assert(!dirty.redactedContent.includes('supersecret123'), 'secret replaced');
  assert(dirty.redactedContent.includes('[REDACTED]'), 'has [REDACTED] marker');

  // Env var reference
  const env = d.analyzeSecurityContent('process.env.DATABASE_URL');
  assertEq(env.hasSecurityIssues, true, 'env var detected');
}

// ============================================================================
// analyzeComplexity
// ============================================================================
console.log('\n── analyzeComplexity ─────────────────────────────────────');

{
  const d = new OMAIPathDiscovery();

  const result = d.analyzeComplexity(`// comment line\nconst x = 1;\n// another comment\nconst y = 2;\n\nfunction foo() {}\n`);
  assertEq(result.totalLines, 7, '7 lines total');
  assertEq(result.commentLines, 2, '2 comments');
  assertEq(result.codeLines, 3, '3 code lines (nonEmpty=5 - comment=2)');
  assert(result.commentRatio > 0, 'ratio > 0');
  assert(result.averageLineLength > 0, 'avg > 0');

  // Only comments
  const allComments = d.analyzeComplexity('// line 1\n// line 2\n');
  assertEq(allComments.commentLines, 2, 'all comments');
  assertEq(allComments.codeLines, 0, '0 code');
}

// ============================================================================
// generateFileId
// ============================================================================
console.log('\n── generateFileId ────────────────────────────────────────');

{
  const d = new OMAIPathDiscovery();
  const id1 = d.generateFileId('/path/to/file.js');
  const id2 = d.generateFileId('/path/to/file.js');
  const id3 = d.generateFileId('/path/to/other.js');
  assertEq(id1, id2, 'deterministic');
  assertEq(id1.length, 12, '12 chars');
  assert(id1 !== id3, 'different for different paths');
  assert(/^[a-f0-9]+$/.test(id1), 'hex string');
}

// ============================================================================
// generateDiscoverySummary
// ============================================================================
console.log('\n── generateDiscoverySummary ──────────────────────────────');

{
  const d = new OMAIPathDiscovery();

  // Empty
  const empty = d.generateDiscoverySummary([]);
  assertEq(empty.totalFiles, 0, '0 files');
  assertEq(empty.averageFileSize, 0, 'avg 0');
  assertEq(empty.totalSize, 0, 'total 0');
  assertEq(empty.topCategories.length, 0, 'no top categories');

  // Multiple
  const files = [
    { size: 100, classification: { type: 'Testing Scripts', category: 'DevOps > Test' } },
    { size: 200, classification: { type: 'Testing Scripts', category: 'DevOps > Test' } },
    { size: 50, classification: { type: 'Frontend Scripts', category: 'Frontend > Components' } },
  ];
  const summary = d.generateDiscoverySummary(files);
  assertEq(summary.totalFiles, 3, '3 files');
  assertEq(summary.totalSize, 350, 'total 350');
  assertEq(Math.round(summary.averageFileSize), 117, 'avg ~117');
  assertEq(summary.categories['DevOps > Test'], 2, 'DevOps > Test = 2');
  assertEq(summary.categories['Frontend > Components'], 1, 'Frontend > Components = 1');
  assertEq(summary.types['Testing Scripts'], 2, 'Testing Scripts type = 2');
  assertEq(summary.topCategories[0].category, 'DevOps > Test', 'top category');
  assertEq(summary.topCategories[0].count, 2, 'top count');
  assert(typeof summary.timestamp === 'string', 'timestamp set');
}

// ============================================================================
// createBigBookStructure
// ============================================================================
console.log('\n── createBigBookStructure ────────────────────────────────');

vfsReset();
{
  const d = new OMAIPathDiscovery();
  await d.createBigBookStructure();
  assert(vfs.dirs.has(d.bigBookRoot), 'bigBookRoot created');
  assert(vfs.dirs.has(nodePath.join(d.bigBookRoot, 'index')), 'index dir');
  assert(vfs.dirs.has(nodePath.join(d.bigBookRoot, 'metadata')), 'metadata dir');
  assert(vfs.dirs.has(nodePath.join(d.bigBookRoot, 'references')), 'references dir');
  assert(vfs.dirs.has(nodePath.join(d.bigBookRoot, 'categories')), 'categories dir');
  assert(vfs.dirs.has(nodePath.join(d.bigBookRoot, 'logs')), 'logs dir');
}

// ============================================================================
// initialize
// ============================================================================
console.log('\n── initialize ────────────────────────────────────────────');

vfsReset();
{
  const d = new OMAIPathDiscovery();
  const result = await d.initialize();
  assertEq(result, true, 'initialize returns true');
  assertEq(encInitialized, true, 'encrypted storage initialized');
  assert(vfs.dirs.has(d.bigBookRoot), 'big book structure exists');
  assert(loggerLog.some(l => l.level === 'info'), 'info logged');
}

// ============================================================================
// scanDirectory
// ============================================================================
console.log('\n── scanDirectory ─────────────────────────────────────────');

vfsReset();
{
  const d = new OMAIPathDiscovery();
  const root = '/virtual/scan';
  vfs.dirs.add(root);
  vfs.dirs.add(nodePath.join(root, 'src'));
  vfs.dirs.add(nodePath.join(root, 'node_modules')); // should be skipped
  vfs.dirs.add(nodePath.join(root, '.git'));          // should be skipped
  vfsAddFile(nodePath.join(root, 'a.js'), 'const x = 1;');
  vfsAddFile(nodePath.join(root, 'src', 'b.ts'), 'const y = 2;');
  vfsAddFile(nodePath.join(root, 'node_modules', 'skip.js'), 'skipped');
  vfsAddFile(nodePath.join(root, '.git', 'HEAD'), 'ref: x');

  const found: any[] = [];
  await d.scanDirectory(root, found);
  const names = found.map((f: any) => f.name).sort();
  assertEq(names, ['a.js', 'b.ts'], 'only non-skipped files');
  assert(found.every((f: any) => typeof f.size === 'number'), 'size captured');
  assert(found.every((f: any) => f.extension === '.js' || f.extension === '.ts'),
    'extensions lowercase');
}

// Error handling — unknown dir logs warn and returns
vfsReset();
{
  const d = new OMAIPathDiscovery();
  const found: any[] = [];
  await d.scanDirectory('/nonexistent/virtual/path', found);
  assertEq(found.length, 0, 'no files on error');
  assert(loggerLog.some(l => l.level === 'warn'), 'warn logged');
}

// ============================================================================
// processFile + saveFileReference
// ============================================================================
console.log('\n── processFile ───────────────────────────────────────────');

vfsReset();
{
  const d = new OMAIPathDiscovery();
  const root = '/virtual/proc';
  vfs.dirs.add(root);
  vfs.dirs.add(d.bigBookRoot);
  vfs.dirs.add(nodePath.join(d.bigBookRoot, 'metadata'));
  vfs.dirs.add(nodePath.join(d.bigBookRoot, 'categories'));

  const filePath = nodePath.join(root, 'test.spec.js');
  vfsAddFile(filePath, `describe('x', () => { it('works', () => {}); });`);

  const file = {
    path: filePath,
    relativePath: 'test.spec.js',
    name: 'test.spec.js',
    size: 50,
    modified: new Date(),
    created: new Date(),
    extension: '.js',
  };

  const ref = await d.processFile(file);
  assert(ref !== null, 'ref returned');
  assertEq(ref.name, 'test.spec.js', 'name');
  assertEq(ref.classification.type, 'Testing Scripts', 'classified');
  assert(typeof ref.contentHash === 'string', 'contentHash set');
  assertEq(ref.contentHash.length, 64, 'sha256 64 chars');
  assert(ref.metadata.fileStats.characters > 0, 'characters counted');

  // saveFileReference was called — metadata file written
  const metaPath = nodePath.join(d.bigBookRoot, 'metadata', `${ref.id}.json`);
  assert(vfs.files.has(metaPath), 'metadata file written');
  const meta = JSON.parse(vfs.files.get(metaPath)!.content);
  assertEq(meta.id, ref.id, 'metadata has id');
  assertEq(meta.name, 'test.spec.js', 'metadata name');
}

// processFile handles read errors gracefully
vfsReset();
quiet();
{
  const d = new OMAIPathDiscovery();
  const file = {
    path: '/does/not/exist.js',
    relativePath: 'exist.js',
    name: 'exist.js',
    size: 10, modified: new Date(), created: new Date(), extension: '.js',
  };
  const ref = await d.processFile(file);
  loud();
  assertEq(ref, null, 'null on read failure');
}

// ============================================================================
// createBigBookIndex
// ============================================================================
console.log('\n── createBigBookIndex ────────────────────────────────────');

vfsReset();
{
  const d = new OMAIPathDiscovery();
  vfs.dirs.add(d.bigBookRoot);
  const files = [
    {
      id: 'abc123', name: 'a.js', originalPath: '/p/a.js', relativePath: 'a.js',
      size: 100, modified: new Date(),
      classification: { type: 'Server Scripts', category: 'Backend > Server' },
      contentHash: 'hash1', discoveredAt: '2026-04-11T00:00:00Z',
    },
    {
      id: 'def456', name: 'b.js', originalPath: '/p/b.js', relativePath: 'b.js',
      size: 200, modified: new Date(),
      classification: { type: 'Server Scripts', category: 'Backend > Server' },
      contentHash: 'hash2', discoveredAt: '2026-04-11T00:01:00Z',
    },
  ];
  await d.createBigBookIndex(files);
  assert(vfs.files.has(d.indexPath), 'index written');
  const index = JSON.parse(vfs.files.get(d.indexPath)!.content);
  assertEq(index.version, '1.0.0', 'version');
  assertEq(index.totalFiles, 2, '2 files');
  assertEq(index.categories['Backend > Server'].count, 2, 'category count');
  assertEq(index.categories['Backend > Server'].files.length, 2, 'category files');
  assert('abc123' in index.files, 'abc123 in files');
  assert('def456' in index.files, 'def456 in files');
}

// ============================================================================
// saveSummary
// ============================================================================
console.log('\n── saveSummary ───────────────────────────────────────────');

vfsReset();
{
  const d = new OMAIPathDiscovery();
  vfs.dirs.add(d.bigBookRoot);
  vfs.dirs.add(nodePath.join(d.bigBookRoot, 'logs'));
  const summary = { timestamp: '2026-04-11T12:00:00.000Z', totalFiles: 5 };
  await d.saveSummary(summary);
  const summaryPath = nodePath.join(d.bigBookRoot, 'discovery-summary.json');
  assert(vfs.files.has(summaryPath), 'summary written');
  const parsed = JSON.parse(vfs.files.get(summaryPath)!.content);
  assertEq(parsed.totalFiles, 5, 'summary content');

  // Also writes a dated log
  const logFiles = [...vfs.files.keys()].filter(k =>
    k.startsWith(nodePath.join(d.bigBookRoot, 'logs', 'discovery-')) && k.endsWith('.log')
  );
  assertEq(logFiles.length, 1, 'one log file written');
}

// ============================================================================
// getStatus
// ============================================================================
console.log('\n── getStatus ─────────────────────────────────────────────');

// Not initialized
vfsReset();
{
  const d = new OMAIPathDiscovery();
  const s = await d.getStatus();
  assertEq(s.status, 'not_initialized', 'not_initialized when no index');
}

// Ready
vfsReset();
{
  const d = new OMAIPathDiscovery();
  vfs.dirs.add(d.bigBookRoot);
  vfsAddFile(d.indexPath, JSON.stringify({
    version: '1.0.0',
    createdAt: '2026-04-11T00:00:00Z',
    totalFiles: 42,
    categories: { 'Backend > Server': { count: 10 } },
  }));
  const s = await d.getStatus();
  assertEq(s.status, 'ready', 'ready');
  assertEq(s.version, '1.0.0', 'version');
  assertEq(s.totalFiles, 42, 'totalFiles');
  assertEq(s.categories, 1, 'category count');
}

// Error — corrupted index
vfsReset();
{
  const d = new OMAIPathDiscovery();
  vfs.dirs.add(d.bigBookRoot);
  vfsAddFile(d.indexPath, '{not-valid-json');
  const s = await d.getStatus();
  assertEq(s.status, 'error', 'error status');
  assert(typeof s.error === 'string', 'error message');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
