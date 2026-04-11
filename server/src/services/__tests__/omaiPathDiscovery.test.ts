#!/usr/bin/env npx tsx
/**
 * Unit tests for services/omaiPathDiscovery.js (OMD-1070)
 *
 * File discovery / classification / Big Book indexing service. Deps:
 *   - fs.promises (mkdir, readdir, stat, readFile, writeFile, access)
 *   - ../utils/logger
 *   - ../utils/encryptedStorage (class, instantiated in constructor)
 *   - path, crypto
 *
 * Strategy: stub logger + EncryptedStorage via require.cache BEFORE
 * requiring the SUT. Patch fs.promises methods at runtime with a
 * save/restore pattern and scriptable fakes.
 *
 * Coverage:
 *   - constructor shape (roots, classifications, security patterns)
 *   - isSupportedFile (pure)
 *   - generateFileId (pure, deterministic md5 prefix)
 *   - classifyFile (patterns + keywords scoring, best-match selection)
 *   - extractDependencies (JS/TS imports, shell commands)
 *   - analyzeSecurityContent (redaction, findings, no-issue path)
 *   - analyzeComplexity (line counts, comment ratio, averages)
 *   - generateDiscoverySummary (category/type stats, top-10, averages)
 *   - generateFileMetadata (composition)
 *   - createBigBookStructure (mkdir calls, EEXIST tolerated)
 *   - scanDirectory (recursion, skips, stat population, readdir error)
 *   - processFile (happy + read error → null)
 *   - saveFileReference (writeFile calls)
 *   - createBigBookIndex (category grouping, files index, write)
 *   - saveSummary (primary + log copy)
 *   - getStatus (not-initialized, ready, error)
 *   - initialize (orchestrates createBigBookStructure + encryptedStorage.initialize)
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

// ── logger stub ──────────────────────────────────────────
const loggerStub = {
  info: (..._args: any[]) => {},
  warn: (..._args: any[]) => {},
  error: (..._args: any[]) => {},
  debug: (..._args: any[]) => {},
};

const pathMod = require('path');
function stubCache(relFromSUT: string, exp: any) {
  const base = pathMod.resolve(__dirname, '../..', relFromSUT);
  for (const ext of ['.js', '.ts']) {
    const full = base + ext;
    require.cache[full] = { id: full, filename: full, loaded: true, exports: exp } as any;
  }
}

stubCache('utils/logger', loggerStub);

// ── EncryptedStorage stub ────────────────────────────────
const encStorageInitCalls: any[] = [];
class FakeEncryptedStorage {
  constructor() {}
  async initialize() {
    encStorageInitCalls.push(Date.now());
    return true;
  }
}
// Module exports the class as default via module.exports = EncryptedStorage
const encPath = pathMod.resolve(__dirname, '../../utils/encryptedStorage');
for (const ext of ['.js', '.ts']) {
  const full = encPath + ext;
  require.cache[full] = { id: full, filename: full, loaded: true, exports: FakeEncryptedStorage } as any;
}

// ── fs.promises patches ──────────────────────────────────
const fs = require('fs');
const realMkdir = fs.promises.mkdir;
const realReaddir = fs.promises.readdir;
const realReadFile = fs.promises.readFile;
const realWriteFile = fs.promises.writeFile;
const realStat = fs.promises.stat;
const realAccess = fs.promises.access;

type W = { p: string; data: string };
const writeCalls: W[] = [];
const mkdirCalls: Array<{ p: string; opts: any }> = [];

let mkdirThrow: (p: string) => Error | null = () => null;
let readdirMap: Record<string, any[]> = {};
let readdirThrowOn: Set<string> = new Set();
let statMap: Record<string, any> = {};
let readFileMap: Record<string, string> = {};
let readFileThrowOn: Set<string> = new Set();
let accessThrowOn: Set<string> = new Set();

function installFs() {
  fs.promises.mkdir = async (p: string, opts: any) => {
    mkdirCalls.push({ p, opts });
    const err = mkdirThrow(p);
    if (err) throw err;
    return undefined;
  };
  fs.promises.readdir = async (p: string, _opts: any) => {
    if (readdirThrowOn.has(p)) throw new Error(`readdir fail: ${p}`);
    return readdirMap[p] || [];
  };
  fs.promises.stat = async (p: string) => {
    return statMap[p] || { size: 100, mtime: new Date('2026-01-01'), birthtime: new Date('2025-12-01') };
  };
  fs.promises.readFile = async (p: string, _enc: any) => {
    if (readFileThrowOn.has(p)) throw new Error(`readFile fail: ${p}`);
    return readFileMap[p] ?? '';
  };
  fs.promises.writeFile = async (p: string, data: string) => {
    writeCalls.push({ p, data });
  };
  fs.promises.access = async (p: string) => {
    if (accessThrowOn.has(p)) throw new Error('ENOENT');
  };
}

function restoreFs() {
  fs.promises.mkdir = realMkdir;
  fs.promises.readdir = realReaddir;
  fs.promises.readFile = realReadFile;
  fs.promises.writeFile = realWriteFile;
  fs.promises.stat = realStat;
  fs.promises.access = realAccess;
}

function resetFs() {
  writeCalls.length = 0;
  mkdirCalls.length = 0;
  mkdirThrow = () => null;
  readdirMap = {};
  readdirThrowOn = new Set();
  statMap = {};
  readFileMap = {};
  readFileThrowOn = new Set();
  accessThrowOn = new Set();
}

installFs();

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

function ent(name: string, kind: 'dir' | 'file') {
  return { name, isDirectory: () => kind === 'dir', isFile: () => kind === 'file' };
}

const OMAIPathDiscovery = require('../omaiPathDiscovery');

async function main() {

// ============================================================================
// constructor
// ============================================================================
console.log('\n── constructor ───────────────────────────────────────────');

const svc = new OMAIPathDiscovery();
assertEq(svc.productionRoot, '/var/www/orthodoxmetrics/prod', 'productionRoot');
assert(svc.bigBookRoot.endsWith('/bigbook'), 'bigBookRoot');
assert(svc.indexPath.endsWith('bigbook-index.json'), 'indexPath');
assert(svc.encryptedStorage instanceof FakeEncryptedStorage, 'encryptedStorage instance');
assert(Object.keys(svc.classifications).length === 9, '9 classifications');
assert(Array.isArray(svc.securityPatterns), 'securityPatterns array');
assert(svc.securityPatterns.length >= 6, 'at least 6 security patterns');
assert(svc.classifications['Build Scripts'], 'Build Scripts class');
assert(svc.classifications['Testing Scripts'], 'Testing Scripts class');
assert(svc.classifications['Documentation'], 'Documentation class');

// ============================================================================
// isSupportedFile (pure)
// ============================================================================
console.log('\n── isSupportedFile ───────────────────────────────────────');

assert(svc.isSupportedFile('a.md'), '.md supported');
assert(svc.isSupportedFile('a.js'), '.js supported');
assert(svc.isSupportedFile('a.ts'), '.ts supported');
assert(svc.isSupportedFile('a.json'), '.json supported');
assert(svc.isSupportedFile('a.sh'), '.sh supported');
assert(svc.isSupportedFile('a.ps1'), '.ps1 supported');
assert(svc.isSupportedFile('a.sql'), '.sql supported');
assert(svc.isSupportedFile('a.yaml'), '.yaml supported');
assert(svc.isSupportedFile('a.yml'), '.yml supported');
assert(!svc.isSupportedFile('a.png'), '.png not supported');
assert(!svc.isSupportedFile('a.jpg'), '.jpg not supported');
assert(!svc.isSupportedFile('Dockerfile'), 'no ext not supported');
assert(svc.isSupportedFile('/path/to/FILE.JS'), 'case-insensitive');

// ============================================================================
// generateFileId (pure)
// ============================================================================
console.log('\n── generateFileId ────────────────────────────────────────');

const id1 = svc.generateFileId('/a/b/c.js');
const id2 = svc.generateFileId('/a/b/c.js');
const id3 = svc.generateFileId('/a/b/d.js');
assertEq(id1.length, 12, 'id length 12');
assertEq(id1, id2, 'deterministic');
assert(id1 !== id3, 'different paths → different ids');
assert(/^[a-f0-9]{12}$/.test(id1), 'hex chars');

// ============================================================================
// classifyFile (pure)
// ============================================================================
console.log('\n── classifyFile ──────────────────────────────────────────');

// Test file — matches "Testing Scripts"
{
  const file = { path: '/foo/test.spec.js', name: 'test.spec.js' };
  const content = "describe('x', () => { it('works', () => expect(1).toBe(1)); });";
  const c = svc.classifyFile(file, content);
  assertEq(c.type, 'Testing Scripts', 'testing spec classified');
  assertEq(c.category, 'DevOps > Test', 'testing category');
  assert(c.confidence >= 2, 'confidence > 0');
}

// Docs file
{
  const file = { path: '/docs/guide.md', name: 'guide.md' };
  const content = '# Guide\n## Section\n- [x] done\n- [ ] todo';
  const c = svc.classifyFile(file, content);
  assertEq(c.type, 'Documentation', 'docs classified');
}

// No match → Other
{
  const file = { path: '/zzz.xyz', name: 'zzz.xyz' };
  const c = svc.classifyFile(file, 'nothing interesting');
  assertEq(c.type, 'Other', 'no match → Other');
  assertEq(c.category, 'Uncategorized', 'Uncategorized');
  assertEq(c.confidence, 0, 'confidence 0');
}

// Server script
{
  const file = { path: '/server/api/route.js', name: 'route.js' };
  const content = "const express = require('express');\nconst router = express.Router();\napp.use(router);";
  const c = svc.classifyFile(file, content);
  assertEq(c.type, 'Server Scripts', 'server classified');
}

// Database script
{
  const file = { path: '/sql/schema.sql', name: 'schema.sql' };
  const content = 'CREATE TABLE users (id INT);';
  const c = svc.classifyFile(file, content);
  assertEq(c.type, 'Database Scripts', 'db classified');
}

// ============================================================================
// extractDependencies (pure)
// ============================================================================
console.log('\n── extractDependencies ───────────────────────────────────');

{
  const content = `import React from 'react';\nimport { useState } from 'react';\nconst x = require('lodash');\nimport './local.css';\nconst y = require('./relative');`;
  const deps = svc.extractDependencies({ extension: '.js' }, content);
  const names = deps.map((d: any) => d.name);
  assert(names.includes('react'), 'react dep');
  assert(names.includes('lodash'), 'lodash dep');
  assert(!names.includes('./local.css'), 'local excluded');
  assert(!names.includes('./relative'), 'relative excluded');
  assert(deps.every((d: any) => d.type === 'npm_package'), 'all npm_package');
  assert(deps.every((d: any) => typeof d.line === 'number'), 'line numbers');
}

// Shell commands
{
  const content = '#!/bin/bash\napt install x\nnpm install y\ndocker build .';
  const deps = svc.extractDependencies({ extension: '.sh' }, content);
  const names = deps.map((d: any) => d.name);
  assert(names.includes('apt'), 'apt');
  assert(names.includes('npm'), 'npm');
  assert(names.includes('docker'), 'docker');
  assert(deps.some((d: any) => d.type === 'system_command'), 'system_command type');
}

// ============================================================================
// analyzeSecurityContent (pure)
// ============================================================================
console.log('\n── analyzeSecurityContent ────────────────────────────────');

// Clean content
{
  const r = svc.analyzeSecurityContent('const x = 1;\nconsole.log(x);');
  assertEq(r.hasSecurityIssues, false, 'no issues');
  assertEq(r.findings.length, 0, '0 findings');
  assertEq(r.redactedContent, null, 'null redacted content');
}

// Content with password
{
  const r = svc.analyzeSecurityContent('const password = "supersecret123";\nconst apikey = "abc123";');
  assert(r.hasSecurityIssues, 'has issues');
  assert(r.findings.length >= 2, '2+ findings');
  assert(r.redactedContent !== null, 'redacted content set');
  assert(r.redactedContent.includes('[REDACTED]'), 'contains REDACTED');
  assert(!r.redactedContent.includes('supersecret123'), 'secret removed');
}

// process.env access
{
  const r = svc.analyzeSecurityContent('const k = process.env.API_KEY;');
  assert(r.hasSecurityIssues, 'env access flagged');
}

// ============================================================================
// analyzeComplexity (pure)
// ============================================================================
console.log('\n── analyzeComplexity ─────────────────────────────────────');

{
  const content = `// comment 1\n// comment 2\nconst x = 1;\nconst y = 2;\n\nconst z = 3;`;
  const c = svc.analyzeComplexity(content);
  assertEq(c.totalLines, 6, 'total lines');
  assertEq(c.commentLines, 2, '2 comment lines');
  // nonEmptyLines: 5 (skip the empty line), codeLines = 5 - 2 = 3
  assertEq(c.codeLines, 3, 'code lines');
  assert(c.commentRatio > 0, 'comment ratio > 0');
  assert(c.averageLineLength > 0, 'avg line length > 0');
}

// Empty content → defaults
{
  const c = svc.analyzeComplexity('');
  assertEq(c.totalLines, 1, 'empty → 1 total line');
  assertEq(c.codeLines, 0, '0 code lines');
  assertEq(c.commentRatio, 0, 'comment ratio 0');
  assertEq(c.averageLineLength, 0, 'avg length 0');
}

// ============================================================================
// generateFileMetadata
// ============================================================================
console.log('\n── generateFileMetadata ──────────────────────────────────');

{
  const file = { path: '/test.js', name: 'test.js', extension: '.js' };
  const content = "import x from 'foo';\nconst p = 'hi';";
  const classification = { type: 'Server Scripts', category: 'Backend > Server', confidence: 5 };
  const meta = await svc.generateFileMetadata(file, content, classification);
  assertEq(meta.fileStats.lines, 2, 'lines');
  assertEq(meta.fileStats.characters, content.length, 'characters');
  assert(meta.fileStats.words > 0, 'words > 0');
  assertEq(meta.classification, classification, 'classification');
  assert(Array.isArray(meta.dependencies), 'dependencies array');
  assert(meta.security !== undefined, 'security set');
  assert(meta.complexity !== undefined, 'complexity set');
  assert(typeof meta.lastAnalyzed === 'string', 'lastAnalyzed');
}

// ============================================================================
// generateDiscoverySummary (pure)
// ============================================================================
console.log('\n── generateDiscoverySummary ──────────────────────────────');

{
  const processed = [
    { classification: { category: 'A', type: 'Ta' }, size: 100 },
    { classification: { category: 'A', type: 'Ta' }, size: 200 },
    { classification: { category: 'B', type: 'Tb' }, size: 300 },
  ];
  const s = svc.generateDiscoverySummary(processed);
  assertEq(s.totalFiles, 3, 'total files');
  assertEq(s.categories.A, 2, 'A count');
  assertEq(s.categories.B, 1, 'B count');
  assertEq(s.types.Ta, 2, 'Ta count');
  assertEq(s.types.Tb, 1, 'Tb count');
  assertEq(s.topCategories.length, 2, '2 top categories');
  assertEq(s.topCategories[0].category, 'A', 'A is top');
  assertEq(s.averageFileSize, 200, 'avg 200');
  assertEq(s.totalSize, 600, 'total 600');
}

// Empty
{
  const s = svc.generateDiscoverySummary([]);
  assertEq(s.totalFiles, 0, 'empty total');
  assertEq(s.averageFileSize, 0, 'empty avg');
  assertEq(s.totalSize, 0, 'empty total size');
}

// ============================================================================
// createBigBookStructure
// ============================================================================
console.log('\n── createBigBookStructure ────────────────────────────────');

resetFs();
quiet();
await svc.createBigBookStructure();
loud();
assertEq(mkdirCalls.length, 6, '6 mkdir calls (root + 5 subs)');
assert(mkdirCalls.every(c => c.opts && c.opts.recursive === true), 'all recursive');

// EEXIST tolerated
resetFs();
mkdirThrow = () => {
  const err: any = new Error('EEXIST');
  err.code = 'EEXIST';
  return err;
};
quiet();
let eexistThrew = false;
try { await svc.createBigBookStructure(); } catch (e) { eexistThrew = true; }
loud();
assert(!eexistThrew, 'EEXIST tolerated');

// Non-EEXIST propagates
resetFs();
mkdirThrow = () => {
  const err: any = new Error('EACCES');
  err.code = 'EACCES';
  return err;
};
quiet();
let accesThrew = false;
try { await svc.createBigBookStructure(); } catch (e) { accesThrew = true; }
loud();
assert(accesThrew, 'non-EEXIST propagates');

// ============================================================================
// scanDirectory
// ============================================================================
console.log('\n── scanDirectory ─────────────────────────────────────────');

resetFs();
readdirMap = {
  '/root': [
    ent('a.js', 'file'),
    ent('b.md', 'file'),
    ent('sub', 'dir'),
    ent('node_modules', 'dir'),
    ent('.git', 'dir'),
    ent('dist', 'dir'),
    ent('build', 'dir'),
    ent('.next', 'dir'),
    ent('coverage', 'dir'),
    ent('logs', 'dir'),
  ],
  '/root/sub': [ent('c.ts', 'file')],
};
statMap = {
  '/root/a.js': { size: 10, mtime: new Date(), birthtime: new Date() },
  '/root/b.md': { size: 20, mtime: new Date(), birthtime: new Date() },
  '/root/sub/c.ts': { size: 30, mtime: new Date(), birthtime: new Date() },
};
const files: any[] = [];
quiet();
await svc.scanDirectory('/root', files);
loud();
assertEq(files.length, 3, '3 files discovered');
assert(files.some(f => f.name === 'a.js'), 'a.js');
assert(files.some(f => f.name === 'b.md'), 'b.md');
assert(files.some(f => f.name === 'c.ts'), 'c.ts (nested)');
assert(files.every(f => typeof f.size === 'number'), 'size from stat');
assert(files.every(f => f.extension && f.extension.startsWith('.')), 'extension set');
assert(files.every(f => typeof f.relativePath === 'string'), 'relativePath set');

// readdir error → swallowed, returns what it has
resetFs();
readdirThrowOn.add('/bad');
const files2: any[] = [];
quiet();
await svc.scanDirectory('/bad', files2);
loud();
assertEq(files2.length, 0, 'error → 0 files');

// ============================================================================
// processFile
// ============================================================================
console.log('\n── processFile ───────────────────────────────────────────');

resetFs();
const testFile = {
  path: '/foo/bar.js',
  relativePath: 'bar.js',
  name: 'bar.js',
  extension: '.js',
  size: 42,
  modified: new Date('2026-01-01'),
  created: new Date('2025-12-01'),
};
readFileMap[testFile.path] = "const x = require('express');";
quiet();
const pf = await svc.processFile(testFile);
loud();
assert(pf !== null, 'processFile returns reference');
assertEq(pf.id.length, 12, 'id set');
assertEq(pf.originalPath, testFile.path, 'originalPath');
assert(pf.classification, 'classification set');
assert(pf.metadata, 'metadata set');
assert(pf.contentHash, 'contentHash set');
assertEq(pf.contentHash.length, 64, 'sha256 hex length');
assert(typeof pf.discoveredAt === 'string', 'discoveredAt');
// saveFileReference was called → writeFile for metadata + ref
assert(writeCalls.length >= 2, 'writeFile called for save');

// Read error → null
resetFs();
readFileThrowOn.add('/no/file.js');
const badFile = { ...testFile, path: '/no/file.js' };
quiet();
const pfBad = await svc.processFile(badFile);
loud();
assertEq(pfBad, null, 'read error → null');

// ============================================================================
// saveFileReference
// ============================================================================
console.log('\n── saveFileReference ─────────────────────────────────────');

resetFs();
const ref = {
  id: 'abc123',
  name: 'test.js',
  originalPath: '/test.js',
  classification: { type: 'Server Scripts', category: 'Backend > Server' },
};
quiet();
await svc.saveFileReference(ref);
loud();
// metadata file + category file = 2 writes; also mkdir for category dir
assert(writeCalls.length >= 2, 'at least 2 writes');
assert(writeCalls.some(w => w.p.includes('metadata') && w.p.endsWith('abc123.json')), 'metadata json');
assert(writeCalls.some(w => w.p.includes('categories') && w.p.endsWith('abc123.ref')), 'category ref');
assert(mkdirCalls.some(m => m.p.includes('categories')), 'mkdir for category dir');

// ============================================================================
// createBigBookIndex
// ============================================================================
console.log('\n── createBigBookIndex ────────────────────────────────────');

resetFs();
const processed = [
  {
    id: 'f1', name: 'a.js', relativePath: 'a.js', originalPath: '/a.js',
    size: 100, modified: new Date(),
    classification: { type: 'Server Scripts', category: 'Backend > Server' },
    contentHash: 'hash1',
    discoveredAt: '2026-01-01',
  },
  {
    id: 'f2', name: 'b.js', relativePath: 'b.js', originalPath: '/b.js',
    size: 200, modified: new Date(),
    classification: { type: 'Server Scripts', category: 'Backend > Server' },
    contentHash: 'hash2',
    discoveredAt: '2026-01-01',
  },
  {
    id: 'f3', name: 'c.md', relativePath: 'c.md', originalPath: '/c.md',
    size: 50, modified: new Date(),
    classification: { type: 'Documentation', category: 'Documentation' },
    contentHash: 'hash3',
    discoveredAt: '2026-01-01',
  },
];
quiet();
await svc.createBigBookIndex(processed);
loud();
assertEq(writeCalls.length, 1, '1 write (index file)');
assert(writeCalls[0].p.endsWith('bigbook-index.json'), 'writes index file');
const idx = JSON.parse(writeCalls[0].data);
assertEq(idx.version, '1.0.0', 'version');
assertEq(idx.totalFiles, 3, 'totalFiles');
assertEq(idx.categories['Backend > Server'].count, 2, 'server count');
assertEq(idx.categories['Documentation'].count, 1, 'doc count');
assert(idx.files.f1, 'f1 indexed');
assert(idx.files.f2, 'f2 indexed');
assert(idx.files.f3, 'f3 indexed');
assertEq(idx.files.f1.category, 'Backend > Server', 'f1 category');

// ============================================================================
// saveSummary
// ============================================================================
console.log('\n── saveSummary ───────────────────────────────────────────');

resetFs();
quiet();
await svc.saveSummary({ totalFiles: 5, categories: {}, types: {} });
loud();
assertEq(writeCalls.length, 2, '2 writes (summary + log)');
assert(writeCalls[0].p.endsWith('discovery-summary.json'), 'summary json');
assert(writeCalls[1].p.includes('logs/discovery-'), 'log file');

// ============================================================================
// getStatus
// ============================================================================
console.log('\n── getStatus ─────────────────────────────────────────────');

// Not initialized
resetFs();
accessThrowOn.add(svc.indexPath);
{
  const s = await svc.getStatus();
  assertEq(s.status, 'not_initialized', 'not_initialized');
  assert(s.message.includes('not found'), 'message');
}

// Ready
resetFs();
readFileMap[svc.indexPath] = JSON.stringify({
  version: '1.0.0',
  totalFiles: 42,
  createdAt: '2026-01-01',
  categories: { A: {}, B: {} },
});
{
  const s = await svc.getStatus();
  assertEq(s.status, 'ready', 'ready status');
  assertEq(s.version, '1.0.0', 'version');
  assertEq(s.totalFiles, 42, 'totalFiles');
  assertEq(s.categories, 2, 'categories count');
  assertEq(s.lastDiscovery, '2026-01-01', 'lastDiscovery');
}

// Error — readFile returns invalid JSON
resetFs();
readFileMap[svc.indexPath] = 'not-json{';
{
  const s = await svc.getStatus();
  assertEq(s.status, 'error', 'error status');
  assert(typeof s.error === 'string', 'error message');
}

// ============================================================================
// initialize
// ============================================================================
console.log('\n── initialize ────────────────────────────────────────────');

resetFs();
encStorageInitCalls.length = 0;
quiet();
{
  const ok = await svc.initialize();
  loud();
  assertEq(ok, true, 'initialize returns true');
  assert(mkdirCalls.length >= 6, 'createBigBookStructure called');
  assertEq(encStorageInitCalls.length, 1, 'encryptedStorage.initialize called');
}

// initialize throws → rethrows
resetFs();
mkdirThrow = () => {
  const err: any = new Error('EACCES');
  err.code = 'EACCES';
  return err;
};
quiet();
let initThrew = false;
try { await svc.initialize(); } catch (e) { initThrew = true; }
loud();
assert(initThrew, 'initialize rethrows on failure');

// ============================================================================
// Cleanup + Summary
// ============================================================================
restoreFs();

console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); restoreFs(); console.error('Unhandled:', e); process.exit(1); });
