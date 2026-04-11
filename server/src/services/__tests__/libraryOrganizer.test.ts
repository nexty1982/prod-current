#!/usr/bin/env npx tsx
/**
 * Unit tests for services/libraryOrganizer.js (OMD-1106)
 *
 * LibraryOrganizer moves loose files from a project root into structured
 * archive directories. External dependency: fs-extra (plus crypto for hash).
 *
 * Strategy: stub fs-extra via require.cache BEFORE requiring the SUT.
 * Virtual filesystem backs readdir/stat/readJson/writeJson/pathExists/
 * ensureDir/move/createReadStream.
 *
 * Coverage:
 *   - constructor: validateRoot (allowed/disallowed), validateMode
 *   - getSafeExtensions
 *   - scanRootDirectory: directories skipped, files returned with metadata
 *   - categorizeFile: daily patterns, artifacts, default inbox
 *   - findAvailablePath: collision handling with -N suffix
 *   - calculateSHA256: deterministic hash from streamed chunks
 *   - planFileMove: protected file, unsafe extension, happy path categorization
 *   - planCleanup: plannedMoves, skipped, errors captured
 *   - applyCleanup: execution, failed move capture, empty plan
 *   - writeManifest: new + existing (append)
 *   - getStats: file classification counts
 *
 * Run: npx tsx server/src/services/__tests__/libraryOrganizer.test.ts
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

// ── Virtual filesystem ──────────────────────────────────────────────
type VEntry =
  | { type: 'file'; content: string; size: number; mtime: Date }
  | { type: 'dir' };

const vfs = new Map<string, VEntry>();
const moveLog: Array<{ from: string; to: string; overwrite: boolean }> = [];
const ensureLog: string[] = [];

function resetVfs() {
  vfs.clear();
  moveLog.length = 0;
  ensureLog.length = 0;
}

function addFile(p: string, content: string, mtime = new Date('2026-04-01T00:00:00Z')) {
  vfs.set(p, { type: 'file', content, size: content.length, mtime });
}

function addDir(p: string) {
  vfs.set(p, { type: 'dir' });
}

// Fake Dirent
function dirent(name: string, isDir: boolean) {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
  };
}

// Fake stream for createReadStream
const { EventEmitter } = require('events');
function makeFakeStream(content: string) {
  const emitter = new EventEmitter() as any;
  // Emit data and end asynchronously (next tick)
  setImmediate(() => {
    if (content === '__ERROR__') {
      emitter.emit('error', new Error('read failed'));
      return;
    }
    emitter.emit('data', Buffer.from(content, 'utf-8'));
    emitter.emit('end');
  });
  return emitter;
}

// fs-extra stub
const path = require('path');
const fsExtraStub = {
  readdir: async (p: string, opts?: any) => {
    // Return Dirent objects for files/dirs whose parent is p
    const children: any[] = [];
    for (const [key, val] of vfs.entries()) {
      if (path.dirname(key) !== p) continue;
      children.push(dirent(path.basename(key), val.type === 'dir'));
    }
    return children;
  },
  stat: async (p: string) => {
    const entry = vfs.get(p);
    if (!entry || entry.type !== 'file') {
      throw Object.assign(new Error(`ENOENT: ${p}`), { code: 'ENOENT' });
    }
    return { size: entry.size, mtime: entry.mtime };
  },
  pathExists: async (p: string) => vfs.has(p),
  ensureDir: async (p: string) => {
    ensureLog.push(p);
    if (!vfs.has(p)) addDir(p);
  },
  move: async (from: string, to: string, opts: any = {}) => {
    moveLog.push({ from, to, overwrite: !!opts.overwrite });
    if (!opts.overwrite && vfs.has(to)) {
      throw new Error('destination exists');
    }
    const entry = vfs.get(from);
    if (!entry) throw new Error(`source missing: ${from}`);
    vfs.delete(from);
    vfs.set(to, entry);
  },
  createReadStream: (p: string) => {
    const entry = vfs.get(p);
    const content = entry && entry.type === 'file' ? entry.content : '';
    return makeFakeStream(content);
  },
  readJson: async (p: string) => {
    const entry = vfs.get(p);
    if (!entry || entry.type !== 'file') throw new Error(`not found: ${p}`);
    return JSON.parse(entry.content);
  },
  writeJson: async (p: string, data: any, _opts?: any) => {
    addFile(p, JSON.stringify(data));
  },
};

const fsExtraPath = require.resolve('fs-extra');
require.cache[fsExtraPath] = {
  id: fsExtraPath,
  filename: fsExtraPath,
  loaded: true,
  exports: fsExtraStub,
} as any;

// Silence noisy logs from the SUT
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const LibraryOrganizer = require('../libraryOrganizer');
const crypto = require('crypto');

async function main() {

// ============================================================================
// Constructor: validateRoot
// ============================================================================
console.log('\n── constructor: validateRoot ─────────────────────────────');

{
  // Allowed
  let ok = false;
  try {
    new LibraryOrganizer('/var/www/orthodoxmetrics/prod');
    ok = true;
  } catch { /* no */ }
  assert(ok, 'allows /var/www/orthodoxmetrics/prod');
}
{
  // Allowed: docs subtree
  let ok = false;
  try {
    new LibraryOrganizer('/var/www/orthodoxmetrics/prod/docs');
    ok = true;
  } catch { /* no */ }
  assert(ok, 'allows docs subdir');
}
{
  // Disallowed
  let caught: any = null;
  try {
    new LibraryOrganizer('/etc');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'rejects /etc');
  assert(caught.message.includes('not allowed'), 'error mentions not allowed');
}

// ============================================================================
// Constructor: validateMode
// ============================================================================
console.log('\n── constructor: validateMode ─────────────────────────────');

{
  // Valid modes
  for (const mode of ['documentation', 'artifacts', 'scripts', 'all']) {
    const org = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', mode);
    assertEq(org.mode, mode, `mode ${mode}`);
  }
}
{
  // Invalid mode
  let caught: any = null;
  try {
    new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'bogus');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'rejects bogus mode');
  assert(caught.message.includes('Invalid cleanup mode'), 'error mentions mode');
}

// ============================================================================
// getSafeExtensions
// ============================================================================
console.log('\n── getSafeExtensions ─────────────────────────────────────');

{
  const docMode = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  assertEq(
    docMode.getSafeExtensions(),
    ['.md', '.txt', '.docx', '.xlsx', '.pdf'],
    'documentation extensions'
  );
}
{
  const artMode = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'artifacts');
  const ext = artMode.getSafeExtensions();
  assert(ext.includes('.zip'), 'artifacts includes .zip');
  assert(ext.includes('.sql'), 'artifacts includes .sql');
  assert(!ext.includes('.md'), 'artifacts excludes .md');
}

// ============================================================================
// categorizeFile (pure)
// ============================================================================
console.log('\n── categorizeFile ────────────────────────────────────────');

{
  const org = new LibraryOrganizer('/var/www/orthodoxmetrics/prod');
  assertEq(org.categorizeFile('task_foo.md'), 'daily', 'task_ → daily');
  assertEq(org.categorizeFile('daily_report.md'), 'daily', 'daily → daily');
  assertEq(org.categorizeFile('end_of_day_summary.md'), 'daily', 'summary → daily');
  assertEq(org.categorizeFile('system_status.md'), 'daily', 'status → daily');
  assertEq(org.categorizeFile('2026-04-10-notes.md'), 'daily', 'date prefix → daily');
  assertEq(org.categorizeFile('archive.zip'), 'artifacts', 'zip → artifacts');
  assertEq(org.categorizeFile('schema.sql'), 'artifacts', 'sql → artifacts');
  assertEq(org.categorizeFile('server.log'), 'artifacts', 'log → artifacts');
  assertEq(org.categorizeFile('db_backup.json'), 'artifacts', 'backup in name → artifacts');
  assertEq(org.categorizeFile('mysql_dump.txt'), 'artifacts', 'dump in name → artifacts');
  assertEq(org.categorizeFile('NOTES.md'), 'inbox', 'default → inbox');
}

// ============================================================================
// findAvailablePath (collision handling)
// ============================================================================
console.log('\n── findAvailablePath ─────────────────────────────────────');

resetVfs();
{
  const org = new LibraryOrganizer('/var/www/orthodoxmetrics/prod');
  // No collision → returns original
  const p1 = await org.findAvailablePath('/tmp/a', 'file.md');
  assertEq(p1, '/tmp/a/file.md', 'no collision');

  // One collision → -1 suffix
  addFile('/tmp/a/file.md', 'x');
  const p2 = await org.findAvailablePath('/tmp/a', 'file.md');
  assertEq(p2, '/tmp/a/file-1.md', 'collision → -1');

  // Two collisions → -2 suffix
  addFile('/tmp/a/file-1.md', 'x');
  const p3 = await org.findAvailablePath('/tmp/a', 'file.md');
  assertEq(p3, '/tmp/a/file-2.md', 'second collision → -2');
}

// ============================================================================
// calculateSHA256 (streamed)
// ============================================================================
console.log('\n── calculateSHA256 ───────────────────────────────────────');

resetVfs();
{
  const org = new LibraryOrganizer('/var/www/orthodoxmetrics/prod');
  addFile('/tmp/hashme.md', 'hello world');
  const expected = crypto.createHash('sha256').update(Buffer.from('hello world', 'utf-8')).digest('hex');
  const h = await org.calculateSHA256('/tmp/hashme.md');
  assertEq(h, expected, 'sha256 matches expected');
}

// Error propagation
resetVfs();
{
  const org = new LibraryOrganizer('/var/www/orthodoxmetrics/prod');
  // Use the sentinel that fakeStream treats as error
  addFile('/tmp/bad.md', '__ERROR__');
  let caught: any = null;
  try {
    await org.calculateSHA256('/tmp/bad.md');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'stream error rejected');
}

// ============================================================================
// scanRootDirectory
// ============================================================================
console.log('\n── scanRootDirectory ─────────────────────────────────────');

resetVfs();
{
  const root = '/var/www/orthodoxmetrics/prod';
  addDir(root);
  addFile(path.join(root, 'a.md'), 'A');
  addFile(path.join(root, 'b.txt'), 'BB');
  addDir(path.join(root, 'docs'));
  addDir(path.join(root, 'node_modules'));

  const org = new LibraryOrganizer(root);
  quiet();
  const files = await org.scanRootDirectory();
  loud();

  assertEq(files.length, 2, 'two files');
  const names = files.map((f: any) => f.name).sort();
  assertEq(names, ['a.md', 'b.txt'], 'names');
  const aFile = files.find((f: any) => f.name === 'a.md');
  assertEq(aFile.ext, '.md', 'ext');
  assertEq(aFile.size, 1, 'size');
}

// ============================================================================
// planFileMove
// ============================================================================
console.log('\n── planFileMove ──────────────────────────────────────────');

// Protected file → not moved
resetVfs();
{
  const root = '/var/www/orthodoxmetrics/prod';
  const org = new LibraryOrganizer(root);
  const file = {
    name: 'package.json',
    path: path.join(root, 'package.json'),
    size: 10, mtime: new Date('2026-04-01T00:00:00Z'), ext: '.json',
  };
  const info = await org.planFileMove(file);
  assertEq(info.shouldMove, false, 'protected not moved');
  assertEq(info.reason, 'protected file', 'reason');
}

// Unsafe extension for documentation mode
resetVfs();
{
  const root = '/var/www/orthodoxmetrics/prod';
  const org = new LibraryOrganizer(root, 'documentation');
  const file = {
    name: 'script.sh',
    path: path.join(root, 'script.sh'),
    size: 10, mtime: new Date('2026-04-01T00:00:00Z'), ext: '.sh',
  };
  const info = await org.planFileMove(file);
  assertEq(info.shouldMove, false, 'unsafe ext skipped');
  assert(info.reason.includes('unsafe extension'), 'reason');
}

// Happy path: .md file categorized as inbox
resetVfs();
{
  const root = '/var/www/orthodoxmetrics/prod';
  addFile(path.join(root, 'NOTES.md'), 'hello');
  const org = new LibraryOrganizer(root);
  const file = {
    name: 'NOTES.md',
    path: path.join(root, 'NOTES.md'),
    size: 5, mtime: new Date('2026-04-01T00:00:00Z'), ext: '.md',
  };
  const info = await org.planFileMove(file);
  assertEq(info.shouldMove, true, 'should move');
  assertEq(info.category, 'inbox', 'category inbox');
  assert(info.to.includes('docs/_inbox'), 'dest under _inbox');
  assert(info.sha256.length === 64, 'sha256 computed (hex)');
  assertEq(info.reason, 'categorized as inbox', 'reason');
}

// Happy path: task_*.md categorized as daily
resetVfs();
{
  const root = '/var/www/orthodoxmetrics/prod';
  addFile(path.join(root, 'task_42.md'), 'T');
  const org = new LibraryOrganizer(root);
  const file = {
    name: 'task_42.md',
    path: path.join(root, 'task_42.md'),
    size: 1, mtime: new Date('2026-04-01T00:00:00Z'), ext: '.md',
  };
  const info = await org.planFileMove(file);
  assertEq(info.category, 'daily', 'daily category');
  assert(info.to.includes('docs/daily'), 'dest under docs/daily');
}

// Collision → -1 suffix
resetVfs();
{
  const root = '/var/www/orthodoxmetrics/prod';
  addFile(path.join(root, 'NOTES.md'), 'hello');
  const dateStr = new Date().toISOString().split('T')[0];
  addFile(path.join(root, 'docs/_inbox', dateStr, 'NOTES.md'), 'existing');
  const org = new LibraryOrganizer(root);
  const file = {
    name: 'NOTES.md',
    path: path.join(root, 'NOTES.md'),
    size: 5, mtime: new Date('2026-04-01T00:00:00Z'), ext: '.md',
  };
  const info = await org.planFileMove(file);
  assertEq(info.shouldMove, true, 'still moves');
  assert(info.to.includes('NOTES-1.md'), 'collision suffix');
}

// ============================================================================
// planCleanup
// ============================================================================
console.log('\n── planCleanup ───────────────────────────────────────────');

resetVfs();
{
  const root = '/var/www/orthodoxmetrics/prod';
  addDir(root);
  addFile(path.join(root, 'a.md'), 'A');
  addFile(path.join(root, 'package.json'), '{}');
  addFile(path.join(root, 'b.sh'), '#!/bin/sh');
  const org = new LibraryOrganizer(root, 'documentation');
  quiet();
  const plan = await org.planCleanup();
  loud();
  assertEq(plan.mode, 'documentation', 'mode');
  assertEq(plan.plannedMoves.length, 1, '1 planned move (a.md)');
  assertEq(plan.plannedMoves[0].fromRelative, 'a.md', 'relative path');
  assertEq(plan.skipped.length, 2, '2 skipped');
  // Protected file and .sh unsafe extension
  const reasons = plan.skipped.map((s: any) => s.reason).sort();
  assert(reasons.some((r: string) => r === 'protected file'), 'protected captured');
  assert(reasons.some((r: string) => r.includes('unsafe extension')), 'unsafe captured');
}

// ============================================================================
// applyCleanup: empty plan
// ============================================================================
console.log('\n── applyCleanup: empty ───────────────────────────────────');

resetVfs();
{
  const root = '/var/www/orthodoxmetrics/prod';
  addDir(root);
  const org = new LibraryOrganizer(root);
  quiet();
  const result = await org.applyCleanup();
  loud();
  assertEq(result.moved.length, 0, 'nothing moved');
  assertEq(result.failed.length, 0, 'nothing failed');
  assertEq(result.manifest, null, 'no manifest');
}

// ============================================================================
// applyCleanup: executes moves and writes manifest
// ============================================================================
console.log('\n── applyCleanup: executes ────────────────────────────────');

resetVfs();
{
  const root = '/var/www/orthodoxmetrics/prod';
  addDir(root);
  addFile(path.join(root, 'notes.md'), 'N');
  addFile(path.join(root, 'plan.txt'), 'P');
  const org = new LibraryOrganizer(root, 'documentation');
  quiet();
  const result = await org.applyCleanup();
  loud();
  assertEq(result.moved.length, 2, '2 moved');
  assertEq(result.failed.length, 0, 'no failures');
  assertEq(moveLog.length, 2, 'fs.move called twice');
  assert(result.manifest !== null, 'manifest path set');
  assert(result.manifest.includes('_moves-'), 'manifest filename');
  // Source files gone, destinations present
  assert(!vfs.has(path.join(root, 'notes.md')), 'notes.md moved from root');
  assert(!vfs.has(path.join(root, 'plan.txt')), 'plan.txt moved from root');
}

// ============================================================================
// applyCleanup: failed move captured
// ============================================================================
console.log('\n── applyCleanup: failed move ─────────────────────────────');

resetVfs();
{
  const root = '/var/www/orthodoxmetrics/prod';
  addDir(root);
  addFile(path.join(root, 'a.md'), 'A');
  // Monkey-patch fs-extra.move to throw once
  const origMove = fsExtraStub.move;
  let called = 0;
  fsExtraStub.move = async (from: string, to: string, opts: any) => {
    called++;
    if (called === 1) throw new Error('simulated failure');
    return origMove(from, to, opts);
  };
  const org = new LibraryOrganizer(root, 'documentation');
  quiet();
  const result = await org.applyCleanup();
  loud();
  fsExtraStub.move = origMove;
  assertEq(result.moved.length, 0, 'none moved');
  assertEq(result.failed.length, 1, '1 failed');
  assert(result.failed[0].error.includes('simulated failure'), 'error preserved');
}

// ============================================================================
// writeManifest: appends when existing
// ============================================================================
console.log('\n── writeManifest: append ─────────────────────────────────');

resetVfs();
{
  const root = '/var/www/orthodoxmetrics/prod';
  addDir(root);
  // Pre-existing manifest
  const dateStr = new Date().toISOString().split('T')[0];
  const manifestPath = path.join(root, 'docs/_inbox', `_moves-${dateStr}.json`);
  addFile(manifestPath, JSON.stringify({
    date: dateStr, moves: [{ from: 'old.md', to: 'old-archive.md' }], totalMoved: 1, failed: [],
  }));

  const org = new LibraryOrganizer(root);
  const result = {
    timestamp: '2026-04-10T00:00:00Z',
    rootPath: root,
    moved: [{ from: 'new.md', to: 'new-archive.md' }],
    failed: [],
  };
  const outPath = await org.writeManifest(result);
  assertEq(outPath, manifestPath, 'same path');
  // Read back
  const data = JSON.parse((vfs.get(manifestPath) as any).content);
  assertEq(data.totalMoved, 2, 'appended');
  assertEq(data.moves.length, 2, 'has both moves');
  assertEq(data.moves[0].from, 'old.md', 'old entry first');
  assertEq(data.moves[1].from, 'new.md', 'new entry second');
}

// ============================================================================
// getStats
// ============================================================================
console.log('\n── getStats ──────────────────────────────────────────────');

resetVfs();
{
  const root = '/var/www/orthodoxmetrics/prod';
  addDir(root);
  addFile(path.join(root, 'a.md'), 'A');           // safe (.md)
  addFile(path.join(root, 'b.txt'), 'B');           // safe (.txt)
  addFile(path.join(root, 'package.json'), '{}');   // protected
  addFile(path.join(root, 'c.sh'), '#!');           // unsafe for doc mode
  const org = new LibraryOrganizer(root, 'documentation');
  quiet();
  const stats = await org.getStats();
  loud();
  assertEq(stats.rootFiles, 4, '4 files');
  assertEq(stats.safeFiles, 2, '2 safe');
  assertEq(stats.protectedFiles, 1, '1 protected');
  assertEq(stats.unsafeFiles, 1, '1 unsafe');
  assertEq(stats.mode, 'documentation', 'mode');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
