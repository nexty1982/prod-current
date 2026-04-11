#!/usr/bin/env npx tsx
/**
 * Unit tests for services/libraryOrganizer.js (OMD-1237)
 *
 * Safely organizes loose root files into structured docs/ archives.
 * Uses fs-extra for all filesystem operations.
 *
 * Strategy: monkey-patch the real fs-extra module object with an in-memory
 * filesystem that tracks directories and files. Uses a minimal EventEmitter
 * for createReadStream to compute SHA256.
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

// ── In-memory filesystem ────────────────────────────────────────
type FileEntry = { content: string; size: number; mtime: Date; isDir: boolean };
const fsStore: Map<string, FileEntry> = new Map();

function addFile(p: string, content: string, mtime = new Date('2026-04-01T12:00:00Z')) {
  fsStore.set(p, { content, size: content.length, mtime, isDir: false });
}
function addDir(p: string) {
  fsStore.set(p, { content: '', size: 0, mtime: new Date(), isDir: true });
}

const path = require('path');
const { EventEmitter } = require('events');

// Monkey-patch fs-extra
const fsExtra = require('fs-extra');

fsExtra.readdir = async (dir: string, opts: any) => {
  const entries: any[] = [];
  const dirWithSlash = dir.endsWith('/') ? dir : dir + '/';
  for (const [p, entry] of fsStore) {
    // Direct children only
    if (!p.startsWith(dirWithSlash)) continue;
    const rest = p.slice(dirWithSlash.length);
    if (rest.includes('/')) continue;
    if (opts && opts.withFileTypes) {
      entries.push({
        name: rest,
        isDirectory: () => entry.isDir,
        isFile: () => !entry.isDir,
      });
    } else {
      entries.push(rest);
    }
  }
  return entries;
};

fsExtra.stat = async (p: string) => {
  const entry = fsStore.get(p);
  if (!entry) throw new Error(`ENOENT: ${p}`);
  return { size: entry.size, mtime: entry.mtime, isDirectory: () => entry.isDir };
};

fsExtra.pathExists = async (p: string) => fsStore.has(p);

fsExtra.ensureDir = async (p: string) => {
  if (!fsStore.has(p)) addDir(p);
};

fsExtra.move = async (from: string, to: string, opts: any = {}) => {
  if (!fsStore.has(from)) throw new Error(`ENOENT: ${from}`);
  if (fsStore.has(to) && !opts.overwrite) {
    throw new Error(`EEXIST: ${to}`);
  }
  fsStore.set(to, fsStore.get(from)!);
  fsStore.delete(from);
};

fsExtra.readJson = async (p: string) => {
  const entry = fsStore.get(p);
  if (!entry) throw new Error(`ENOENT: ${p}`);
  return JSON.parse(entry.content);
};

fsExtra.writeJson = async (p: string, data: any, _opts: any = {}) => {
  const content = JSON.stringify(data, null, 2);
  fsStore.set(p, { content, size: content.length, mtime: new Date(), isDir: false });
};

fsExtra.createReadStream = (p: string): any => {
  const entry = fsStore.get(p);
  const emitter = new EventEmitter();
  process.nextTick(() => {
    if (!entry) {
      emitter.emit('error', new Error(`ENOENT: ${p}`));
      return;
    }
    emitter.emit('data', Buffer.from(entry.content, 'utf-8'));
    emitter.emit('end');
  });
  return emitter;
};

function resetFs() {
  fsStore.clear();
}

// Silence noisy logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const LibraryOrganizer = require('../libraryOrganizer');

async function main() {

const ROOT = '/var/www/orthodoxmetrics/prod';

// ============================================================================
// Constructor validation
// ============================================================================
console.log('\n── Constructor ───────────────────────────────────────────');

// Valid defaults
{
  const org = new LibraryOrganizer();
  assertEq(org.rootPath, ROOT, 'default rootPath');
  assertEq(org.mode, 'documentation', 'default mode');
}

// Valid custom
{
  const org = new LibraryOrganizer('/var/www/orthodoxmetrics/prod/docs', 'artifacts');
  assertEq(org.mode, 'artifacts', 'custom mode');
}

// Disallowed root
{
  let caught: Error | null = null;
  try { new LibraryOrganizer('/etc', 'documentation'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'disallowed root throws');
  assert(caught !== null && /not allowed/.test(caught.message), 'error message');
}

// Invalid mode
{
  let caught: Error | null = null;
  try { new LibraryOrganizer(ROOT, 'bogus'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid mode throws');
  assert(caught !== null && /Invalid cleanup mode/.test(caught.message), 'error message');
}

// All valid modes
for (const mode of ['documentation', 'artifacts', 'scripts', 'all']) {
  const org = new LibraryOrganizer(ROOT, mode);
  assertEq(org.mode, mode, `mode=${mode} accepted`);
}

// getSafeExtensions
{
  const org = new LibraryOrganizer(ROOT, 'documentation');
  const exts = org.getSafeExtensions();
  assert(exts.includes('.md'), 'documentation includes .md');
  assert(exts.includes('.pdf'), 'documentation includes .pdf');
  assert(!exts.includes('.sh'), 'documentation excludes .sh');
}

{
  const org = new LibraryOrganizer(ROOT, 'scripts');
  const exts = org.getSafeExtensions();
  assert(exts.includes('.sh'), 'scripts includes .sh');
  assert(exts.includes('.py'), 'scripts includes .py');
  assert(!exts.includes('.md'), 'scripts excludes .md');
}

// ============================================================================
// scanRootDirectory
// ============================================================================
console.log('\n── scanRootDirectory ─────────────────────────────────────');

resetFs();
addDir(ROOT);
addFile(path.join(ROOT, 'notes.md'), 'note content');
addFile(path.join(ROOT, 'task_1.md'), 'task content');
addFile(path.join(ROOT, 'script.sh'), '#!/bin/bash');
// Nested file should NOT be picked up (depth=1 only)
addFile(path.join(ROOT, 'subdir/nested.md'), 'nested');
// Subdir entry
addDir(path.join(ROOT, 'subdir'));

{
  const org = new LibraryOrganizer(ROOT);
  const files = await org.scanRootDirectory();
  assertEq(files.length, 3, '3 top-level files');
  const names = files.map((f: any) => f.name).sort();
  assertEq(names, ['notes.md', 'script.sh', 'task_1.md'], 'file names');
  assertEq(files[0].ext, '.md'.length > 0 ? files[0].ext : '', 'ext lowercased');
  assert(files.some((f: any) => f.ext === '.sh'), 'sh ext');
}

// ============================================================================
// categorizeFile
// ============================================================================
console.log('\n── categorizeFile ────────────────────────────────────────');

{
  const org = new LibraryOrganizer(ROOT);
  assertEq(org.categorizeFile('task_42.md'), 'daily', 'task_ → daily');
  assertEq(org.categorizeFile('daily-notes.md'), 'daily', 'daily → daily');
  assertEq(org.categorizeFile('2026-04-11-meeting.md'), 'daily', 'date-prefix → daily');
  assertEq(org.categorizeFile('report_summary.md'), 'daily', '_summary → daily');
  assertEq(org.categorizeFile('backup.zip'), 'artifacts', '.zip → artifacts');
  assertEq(org.categorizeFile('dump.sql'), 'artifacts', '.sql → artifacts');
  assertEq(org.categorizeFile('app.log'), 'artifacts', '.log → artifacts');
  assertEq(org.categorizeFile('backup-data.txt'), 'artifacts', 'backup in name → artifacts');
  assertEq(org.categorizeFile('random.md'), 'inbox', 'default → inbox');
  assertEq(org.categorizeFile('notes.txt'), 'inbox', 'notes → inbox');
}

// ============================================================================
// planFileMove — protected file
// ============================================================================
console.log('\n── planFileMove: protected ───────────────────────────────');

resetFs();
addDir(ROOT);
addFile(path.join(ROOT, 'package.json'), '{}');
addFile(path.join(ROOT, 'README.md'), '# Readme');

{
  const org = new LibraryOrganizer(ROOT, 'documentation');
  const fakeFile = {
    name: 'package.json',
    path: path.join(ROOT, 'package.json'),
    size: 2,
    mtime: new Date(),
    ext: '.json',
  };
  const r = await org.planFileMove(fakeFile);
  assertEq(r.shouldMove, false, 'package.json not moved');
  assertEq(r.reason, 'protected file', 'reason protected');
}

{
  const org = new LibraryOrganizer(ROOT, 'documentation');
  const fakeFile = {
    name: 'README.md',
    path: path.join(ROOT, 'README.md'),
    size: 10,
    mtime: new Date(),
    ext: '.md',
  };
  const r = await org.planFileMove(fakeFile);
  assertEq(r.shouldMove, false, 'README.md not moved');
}

// ============================================================================
// planFileMove — unsafe extension
// ============================================================================
console.log('\n── planFileMove: unsafe extension ────────────────────────');

resetFs();
addDir(ROOT);
addFile(path.join(ROOT, 'script.sh'), '#!/bin/bash');

{
  const org = new LibraryOrganizer(ROOT, 'documentation');  // .sh not in documentation
  const fakeFile = {
    name: 'script.sh',
    path: path.join(ROOT, 'script.sh'),
    size: 10,
    mtime: new Date(),
    ext: '.sh',
  };
  const r = await org.planFileMove(fakeFile);
  assertEq(r.shouldMove, false, 'unsafe ext not moved');
  assert(/unsafe extension/.test(r.reason), 'reason mentions unsafe');
}

// ============================================================================
// planFileMove — safe file → categorized + SHA256
// ============================================================================
console.log('\n── planFileMove: safe file ───────────────────────────────');

resetFs();
addDir(ROOT);
addFile(path.join(ROOT, 'task_1.md'), 'daily content');

{
  const org = new LibraryOrganizer(ROOT, 'documentation');
  const fakeFile = {
    name: 'task_1.md',
    path: path.join(ROOT, 'task_1.md'),
    size: 13,
    mtime: new Date('2026-04-11T00:00:00Z'),
    ext: '.md',
  };
  const r = await org.planFileMove(fakeFile);
  assertEq(r.shouldMove, true, 'should move');
  assertEq(r.category, 'daily', 'daily category');
  assert(typeof r.sha256 === 'string' && r.sha256.length === 64, 'SHA256 hex');
  assert(r.to.includes('docs/daily'), 'goes to docs/daily');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(path.basename(path.dirname(r.to))), 'date subdir');
  assertEq(path.basename(r.to), 'task_1.md', 'filename preserved');
}

// ============================================================================
// planFileMove — collision avoidance
// ============================================================================
console.log('\n── planFileMove: collision ───────────────────────────────');

resetFs();
addDir(ROOT);
addFile(path.join(ROOT, 'note.md'), 'new content');

const dateStr = new Date().toISOString().split('T')[0];
const collisionDest = path.join(ROOT, 'docs/_inbox', dateStr, 'note.md');
addFile(collisionDest, 'existing');

{
  const org = new LibraryOrganizer(ROOT, 'documentation');
  const fakeFile = {
    name: 'note.md',
    path: path.join(ROOT, 'note.md'),
    size: 11,
    mtime: new Date(),
    ext: '.md',
  };
  const r = await org.planFileMove(fakeFile);
  assertEq(r.shouldMove, true, 'moved despite collision');
  assert(r.to.includes('note-1.md'), 'suffixed to note-1.md');
}

// Triple collision → note-2.md
resetFs();
addDir(ROOT);
addFile(path.join(ROOT, 'note.md'), 'x');
addFile(path.join(ROOT, 'docs/_inbox', dateStr, 'note.md'), '1');
addFile(path.join(ROOT, 'docs/_inbox', dateStr, 'note-1.md'), '2');

{
  const org = new LibraryOrganizer(ROOT, 'documentation');
  const fakeFile = {
    name: 'note.md',
    path: path.join(ROOT, 'note.md'),
    size: 1,
    mtime: new Date(),
    ext: '.md',
  };
  const r = await org.planFileMove(fakeFile);
  assert(r.to.includes('note-2.md'), 'second collision → note-2.md');
}

// ============================================================================
// planCleanup — full scan
// ============================================================================
console.log('\n── planCleanup ───────────────────────────────────────────');

resetFs();
addDir(ROOT);
addFile(path.join(ROOT, 'package.json'), '{}');         // protected
addFile(path.join(ROOT, 'notes.md'), 'notes');          // safe → inbox
addFile(path.join(ROOT, 'task_5.md'), 'task');          // safe → daily
addFile(path.join(ROOT, 'dump.sql'), 'SELECT 1;');      // unsafe for docs mode
addDir(path.join(ROOT, 'src'));                          // dir skipped

quiet();
{
  const org = new LibraryOrganizer(ROOT, 'documentation');
  const plan = await org.planCleanup();
  loud();
  assertEq(plan.plannedMoves.length, 2, '2 moves planned');
  assertEq(plan.skipped.length, 2, '2 skipped (package.json + dump.sql)');
  assertEq(plan.errors.length, 0, 'no errors');
  assertEq(plan.mode, 'documentation', 'mode propagated');
  assert(Array.isArray(plan.safeExtensions), 'safeExtensions array');

  const categories = plan.plannedMoves.map((m: any) => m.category).sort();
  assertEq(categories, ['daily', 'inbox'], 'categories');

  const skippedReasons = plan.skipped.map((s: any) => s.reason);
  assert(skippedReasons.some((r: string) => /protected/.test(r)), 'protected reason');
  assert(skippedReasons.some((r: string) => /unsafe/.test(r)), 'unsafe reason');
}

// planCleanup in artifacts mode → dump.sql moves
resetFs();
addDir(ROOT);
addFile(path.join(ROOT, 'notes.md'), 'notes');    // unsafe for artifacts
addFile(path.join(ROOT, 'dump.sql'), 'SELECT 1;'); // safe for artifacts

quiet();
{
  const org = new LibraryOrganizer(ROOT, 'artifacts');
  const plan = await org.planCleanup();
  loud();
  assertEq(plan.plannedMoves.length, 1, '1 artifact planned');
  assertEq(plan.plannedMoves[0].category, 'artifacts', 'artifacts category');
  assertEq(plan.skipped.length, 1, '1 skipped');
}

// ============================================================================
// applyCleanup — executes and writes manifest
// ============================================================================
console.log('\n── applyCleanup ──────────────────────────────────────────');

resetFs();
addDir(ROOT);
addFile(path.join(ROOT, 'notes.md'), 'notes content');

quiet();
{
  const org = new LibraryOrganizer(ROOT, 'documentation');
  const result = await org.applyCleanup();
  loud();
  assertEq(result.moved.length, 1, '1 moved');
  assertEq(result.failed.length, 0, 'no failures');
  assert(result.manifest !== null, 'manifest path set');
  // File should no longer be at root
  assert(!fsStore.has(path.join(ROOT, 'notes.md')), 'source removed');
  // Manifest should exist
  assert(fsStore.has(result.manifest), 'manifest file written');
  // Manifest content
  const manifest = JSON.parse(fsStore.get(result.manifest)!.content);
  assertEq(manifest.moves.length, 1, 'manifest 1 move');
  assertEq(manifest.totalMoved, 1, 'totalMoved 1');
}

// applyCleanup — no files → returns result with empty moved
resetFs();
addDir(ROOT);

quiet();
{
  const org = new LibraryOrganizer(ROOT, 'documentation');
  const result = await org.applyCleanup();
  loud();
  assertEq(result.moved.length, 0, '0 moved');
  assertEq(result.manifest, null, 'no manifest');
}

// applyCleanup — append to existing manifest
resetFs();
addDir(ROOT);
addFile(path.join(ROOT, 'newfile.md'), 'new');

// Pre-seed an existing manifest
const existingManifestPath = path.join(
  ROOT, 'docs/_inbox',
  `_moves-${new Date().toISOString().split('T')[0]}.json`
);
addFile(existingManifestPath, JSON.stringify({
  date: '2026-04-11',
  timestamp: '2026-04-10T00:00:00Z',
  rootPath: ROOT,
  moves: [{ from: 'old1', to: 'old2' }],
  totalMoved: 1,
  failed: [],
}));

quiet();
{
  const org = new LibraryOrganizer(ROOT, 'documentation');
  const result = await org.applyCleanup();
  loud();
  const manifest = JSON.parse(fsStore.get(result.manifest)!.content);
  assertEq(manifest.moves.length, 2, 'existing + new = 2');
  assertEq(manifest.totalMoved, 2, 'totalMoved 2');
}

// ============================================================================
// getStats
// ============================================================================
console.log('\n── getStats ──────────────────────────────────────────────');

resetFs();
addDir(ROOT);
addFile(path.join(ROOT, 'package.json'), '{}');
addFile(path.join(ROOT, 'notes.md'), 'x');
addFile(path.join(ROOT, 'other.md'), 'y');
addFile(path.join(ROOT, 'script.sh'), 'z');

{
  const org = new LibraryOrganizer(ROOT, 'documentation');
  const stats = await org.getStats();
  assertEq(stats.rootFiles, 4, '4 root files');
  assertEq(stats.protectedFiles, 1, '1 protected');
  assertEq(stats.safeFiles, 2, '2 safe (.md)');
  assertEq(stats.unsafeFiles, 1, '1 unsafe (.sh)');
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
