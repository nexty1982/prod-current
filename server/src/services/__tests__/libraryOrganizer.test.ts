#!/usr/bin/env npx tsx
/**
 * Unit tests for services/libraryOrganizer.js (OMD-1061)
 *
 * Organizes loose files in prod root by moving them to docs/* subtrees.
 * Sole external dep: fs-extra (readdir/stat/createReadStream/pathExists/
 * ensureDir/move/readJson/writeJson). We stub fs-extra via require.cache
 * BEFORE requiring the SUT.
 *
 * Coverage:
 *   - constructor: validateRoot (allowed/disallowed), validateMode
 *   - getSafeExtensions: mode → extension list
 *   - scanRootDirectory: skips directories + excluded names, returns shape
 *   - categorizeFile: daily/artifacts/inbox patterns
 *   - planFileMove: protected, unsafe ext, safe with collision resolution
 *   - findAvailablePath: -1/-2 suffix
 *   - planCleanup: aggregates moved + skipped + errors
 *   - applyCleanup: empty-plan short-circuit, success + failure breakdown,
 *                   writes manifest
 *   - writeManifest: new manifest + appends to existing
 *   - getStats: counts rootFiles/safe/protected/unsafe
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

// ─── Fake fs-extra ───────────────────────────────────────────────────────────

type FakeDirent = { name: string; isDirectory: () => boolean };
type FakeStat = { size: number; mtime: Date };

// Virtual filesystem state
let fakeDirents: FakeDirent[] = [];
let fakeStats: Record<string, FakeStat> = {};
let existingPaths: Set<string> = new Set();
let existingManifest: any = null;
let fakeFileContents: Record<string, Buffer> = {};

// Call log
const fsCalls: { method: string; args: any[] }[] = [];
const moveCalls: { from: string; to: string; options: any }[] = [];
const writeJsonCalls: { path: string; data: any; options: any }[] = [];
const ensureDirCalls: string[] = [];

let readdirThrows: Error | null = null;
let moveThrowsFor: string | null = null;  // throw when 'from' matches

const fakeFs = {
  readdir: async (dir: string, opts: any) => {
    fsCalls.push({ method: 'readdir', args: [dir, opts] });
    if (readdirThrows) throw readdirThrows;
    return fakeDirents;
  },
  stat: async (p: string) => {
    fsCalls.push({ method: 'stat', args: [p] });
    const base = p.split('/').pop()!;
    return fakeStats[base] || { size: 0, mtime: new Date('2026-01-01') };
  },
  pathExists: async (p: string) => {
    fsCalls.push({ method: 'pathExists', args: [p] });
    return existingPaths.has(p);
  },
  ensureDir: async (p: string) => {
    ensureDirCalls.push(p);
  },
  move: async (from: string, to: string, options: any) => {
    moveCalls.push({ from, to, options });
    if (moveThrowsFor && from.includes(moveThrowsFor)) {
      throw new Error('fake move failure');
    }
  },
  readJson: async (p: string) => {
    fsCalls.push({ method: 'readJson', args: [p] });
    return existingManifest;
  },
  writeJson: async (p: string, data: any, options: any) => {
    writeJsonCalls.push({ path: p, data, options });
  },
  createReadStream: (p: string) => {
    const content = fakeFileContents[p.split('/').pop()!] || Buffer.from('');
    // Minimal EventEmitter-ish stream
    const handlers: Record<string, Function[]> = {};
    const stream = {
      on: (event: string, cb: Function) => {
        (handlers[event] = handlers[event] || []).push(cb);
        // Schedule async emit
        if (event === 'end') {
          setImmediate(() => {
            (handlers['data'] || []).forEach(h => h(content));
            (handlers['end'] || []).forEach(h => h());
          });
        }
        return stream;
      },
    };
    return stream;
  },
};

const fsExtraPath = require.resolve('fs-extra');
require.cache[fsExtraPath] = {
  id: fsExtraPath,
  filename: fsExtraPath,
  loaded: true,
  exports: fakeFs,
} as any;

function resetFs() {
  fakeDirents = [];
  fakeStats = {};
  existingPaths = new Set();
  existingManifest = null;
  fakeFileContents = {};
  fsCalls.length = 0;
  moveCalls.length = 0;
  writeJsonCalls.length = 0;
  ensureDirCalls.length = 0;
  readdirThrows = null;
  moveThrowsFor = null;
}

// Silence logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const LibraryOrganizer = require('../libraryOrganizer');

// Helper to build a file entry
function makeFile(name: string, size = 100, mtime = '2026-04-10T00:00:00Z') {
  fakeDirents.push({ name, isDirectory: () => false });
  fakeStats[name] = { size, mtime: new Date(mtime) };
  fakeFileContents[name] = Buffer.from(`content of ${name}`);
}

async function main() {

// ============================================================================
// constructor: validateRoot
// ============================================================================
console.log('\n── constructor: validateRoot ─────────────────────────────');

{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  assertEq(o.rootPath, '/var/www/orthodoxmetrics/prod', 'stores rootPath');
  assertEq(o.mode, 'documentation', 'stores mode');
}

{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod/docs/sub', 'documentation');
  assertEq(o.rootPath, '/var/www/orthodoxmetrics/prod/docs/sub', 'subpath allowed');
}

{
  let caught: Error | null = null;
  try {
    new LibraryOrganizer('/etc/passwd', 'documentation');
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'disallowed root throws');
  assert(caught !== null && caught.message.includes('not allowed'), 'error mentions allowed');
}

// ============================================================================
// constructor: validateMode
// ============================================================================
console.log('\n── constructor: validateMode ─────────────────────────────');

{
  let caught: Error | null = null;
  try {
    new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'bogus');
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'invalid mode throws');
  assert(caught !== null && caught.message.includes('Invalid cleanup mode'), 'error message');
}

// All valid modes accepted
for (const mode of ['documentation', 'artifacts', 'scripts', 'all']) {
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', mode);
  assertEq(o.mode, mode, `${mode} mode accepted`);
}

// ============================================================================
// getSafeExtensions
// ============================================================================
console.log('\n── getSafeExtensions ─────────────────────────────────────');

{
  const docs = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  const exts = docs.getSafeExtensions();
  assert(exts.includes('.md'), 'documentation: .md');
  assert(exts.includes('.pdf'), 'documentation: .pdf');
  assert(!exts.includes('.zip'), 'documentation: no .zip');
}

{
  const artifacts = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'artifacts');
  const exts = artifacts.getSafeExtensions();
  assert(exts.includes('.zip'), 'artifacts: .zip');
  assert(exts.includes('.sql'), 'artifacts: .sql');
  assert(!exts.includes('.md'), 'artifacts: no .md');
}

{
  const scripts = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'scripts');
  const exts = scripts.getSafeExtensions();
  assertEq(exts, ['.sh', '.py', '.js'], 'scripts: sh/py/js');
}

{
  const all = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'all');
  const exts = all.getSafeExtensions();
  assert(exts.length > 10, 'all: >10 extensions');
  assert(exts.includes('.md') && exts.includes('.zip') && exts.includes('.sh'), 'all: includes all types');
}

// ============================================================================
// scanRootDirectory
// ============================================================================
console.log('\n── scanRootDirectory ─────────────────────────────────────');

resetFs();
fakeDirents = [
  { name: 'notes.md', isDirectory: () => false },
  { name: 'data.csv', isDirectory: () => false },
  { name: 'node_modules', isDirectory: () => true }, // dir → skipped
  { name: 'src', isDirectory: () => true },           // dir → skipped
  { name: 'plain.txt', isDirectory: () => false },
];
fakeStats = {
  'notes.md': { size: 500, mtime: new Date('2026-04-01') },
  'data.csv': { size: 1000, mtime: new Date('2026-04-02') },
  'plain.txt': { size: 200, mtime: new Date('2026-04-03') },
};
{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  const files = await o.scanRootDirectory();
  assertEq(files.length, 3, '3 files returned (dirs skipped)');
  assertEq(files[0].name, 'notes.md', 'first file');
  assertEq(files[0].ext, '.md', 'ext lowercase');
  assertEq(files[0].size, 500, 'size');
  assert(files[0].path.endsWith('notes.md'), 'path joined');
  assertEq(files[2].ext, '.txt', '.txt ext');
}

// Directory excluded by name
resetFs();
fakeDirents = [
  { name: 'dist', isDirectory: () => true },
  { name: '.git', isDirectory: () => true },
  { name: 'good.md', isDirectory: () => false },
];
fakeStats = { 'good.md': { size: 1, mtime: new Date() } };
{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  const files = await o.scanRootDirectory();
  assertEq(files.length, 1, 'dirs skipped regardless of allow list');
}

// ============================================================================
// categorizeFile
// ============================================================================
console.log('\n── categorizeFile ────────────────────────────────────────');

{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  assertEq(o.categorizeFile('task_123.md'), 'daily', 'task_ → daily');
  assertEq(o.categorizeFile('daily_notes.md'), 'daily', 'daily → daily');
  assertEq(o.categorizeFile('report_summary.md'), 'daily', '_summary → daily');
  assertEq(o.categorizeFile('build_status.md'), 'daily', '_status → daily');
  assertEq(o.categorizeFile('2026-04-10-notes.md'), 'daily', 'date prefix → daily');

  assertEq(o.categorizeFile('archive.zip'), 'artifacts', '.zip → artifacts');
  assertEq(o.categorizeFile('dump.sql'), 'artifacts', '.sql → artifacts');
  assertEq(o.categorizeFile('output.log'), 'artifacts', '.log → artifacts');
  assertEq(o.categorizeFile('my-backup.txt'), 'artifacts', 'backup keyword → artifacts');
  assertEq(o.categorizeFile('data-dump.txt'), 'artifacts', 'dump keyword → artifacts');

  assertEq(o.categorizeFile('random.md'), 'inbox', 'default → inbox');
  assertEq(o.categorizeFile('notes.pdf'), 'inbox', 'plain pdf → inbox');
}

// ============================================================================
// planFileMove
// ============================================================================
console.log('\n── planFileMove ──────────────────────────────────────────');

// Protected file → skip
resetFs();
{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'all');
  const moveInfo = await o.planFileMove({
    name: 'package.json',
    path: '/var/www/orthodoxmetrics/prod/package.json',
    size: 1,
    mtime: new Date(),
    ext: '.json',
  });
  assertEq(moveInfo.shouldMove, false, 'protected file → no move');
  assertEq(moveInfo.reason, 'protected file', 'reason');
}

// Unsafe extension for mode → skip
resetFs();
{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  const moveInfo = await o.planFileMove({
    name: 'archive.zip',
    path: '/var/www/orthodoxmetrics/prod/archive.zip',
    size: 1,
    mtime: new Date(),
    ext: '.zip',
  });
  assertEq(moveInfo.shouldMove, false, '.zip not safe for documentation mode');
  assert(moveInfo.reason.includes('unsafe extension'), 'reason mentions unsafe');
}

// Safe file → moves (inbox category)
resetFs();
{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  const moveInfo = await o.planFileMove({
    name: 'random.md',
    path: '/var/www/orthodoxmetrics/prod/random.md',
    size: 1,
    mtime: new Date('2026-04-10'),
    ext: '.md',
  });
  assertEq(moveInfo.shouldMove, true, 'safe file → moves');
  assertEq(moveInfo.category, 'inbox', 'categorized as inbox');
  assert(moveInfo.to.includes('docs/_inbox'), 'dest is docs/_inbox');
  assert(moveInfo.to.endsWith('random.md'), 'preserves filename');
  assert(moveInfo.sha256 !== null, 'sha256 calculated');
  assertEq(moveInfo.sha256.length, 64, 'sha256 is 64 hex chars');
  assert(moveInfo.toRelative.startsWith('docs/_inbox'), 'toRelative');
}

// Daily category
resetFs();
{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  const moveInfo = await o.planFileMove({
    name: 'task_123.md',
    path: '/var/www/orthodoxmetrics/prod/task_123.md',
    size: 1,
    mtime: new Date(),
    ext: '.md',
  });
  assertEq(moveInfo.category, 'daily', 'daily category');
  assert(moveInfo.to.includes('docs/daily'), 'dest is docs/daily');
}

// Collision → -1 suffix
resetFs();
{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  // Pre-populate so pathExists returns true for the naive dest
  const dateStr = new Date().toISOString().split('T')[0];
  const baseDest = `/var/www/orthodoxmetrics/prod/docs/_inbox/${dateStr}/notes.md`;
  existingPaths.add(baseDest);

  const moveInfo = await o.planFileMove({
    name: 'notes.md',
    path: '/var/www/orthodoxmetrics/prod/notes.md',
    size: 1,
    mtime: new Date(),
    ext: '.md',
  });
  assertEq(moveInfo.shouldMove, true, 'collision still moves');
  assert(moveInfo.to.endsWith('notes-1.md'), 'suffix -1 appended');
}

// Multiple collisions → -2 suffix
resetFs();
{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  const dateStr = new Date().toISOString().split('T')[0];
  const dir = `/var/www/orthodoxmetrics/prod/docs/_inbox/${dateStr}`;
  existingPaths.add(`${dir}/notes.md`);
  existingPaths.add(`${dir}/notes-1.md`);

  const moveInfo = await o.planFileMove({
    name: 'notes.md',
    path: '/var/www/orthodoxmetrics/prod/notes.md',
    size: 1,
    mtime: new Date(),
    ext: '.md',
  });
  assert(moveInfo.to.endsWith('notes-2.md'), 'suffix -2 appended');
}

// ============================================================================
// findAvailablePath
// ============================================================================
console.log('\n── findAvailablePath ─────────────────────────────────────');

resetFs();
{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  existingPaths.add('/tmp/dir/file.txt');
  const p = await o.findAvailablePath('/tmp/dir', 'file.txt');
  assertEq(p, '/tmp/dir/file-1.txt', 'first collision');
}

resetFs();
{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  // No collision
  const p = await o.findAvailablePath('/tmp/dir', 'new.txt');
  assertEq(p, '/tmp/dir/new.txt', 'no collision → unchanged');
}

// ============================================================================
// planCleanup
// ============================================================================
console.log('\n── planCleanup ───────────────────────────────────────────');

resetFs();
makeFile('notes.md');
makeFile('task_1.md');
makeFile('package.json');        // protected
makeFile('archive.zip');         // unsafe for documentation
quiet();
{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  const plan = await o.planCleanup();
  loud();
  assertEq(plan.plannedMoves.length, 2, '2 files planned');
  assertEq(plan.skipped.length, 2, '2 files skipped');
  assertEq(plan.errors.length, 0, 'no errors');
  assertEq(plan.mode, 'documentation', 'mode in plan');
  assertEq(plan.rootPath, '/var/www/orthodoxmetrics/prod', 'root in plan');

  const skipReasons = plan.skipped.map((s: any) => s.reason);
  assert(skipReasons.includes('protected file'), 'protected skipped');
  assert(skipReasons.some((r: string) => r.includes('unsafe extension')), 'unsafe skipped');
}

// scanRootDirectory error → planCleanup re-throws
resetFs();
readdirThrows = new Error('disk error');
quiet();
{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  let caught: Error | null = null;
  try {
    await o.planCleanup();
  } catch (e: any) {
    caught = e;
  }
  loud();
  assert(caught !== null, 'scan error propagates');
  assert(caught !== null && caught.message.includes('disk error'), 'original error message');
}

// ============================================================================
// applyCleanup
// ============================================================================
console.log('\n── applyCleanup ──────────────────────────────────────────');

// Empty plan → short-circuit (no manifest)
resetFs();
fakeDirents = [];  // nothing to scan
quiet();
{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  const result = await o.applyCleanup();
  loud();
  assertEq(result.moved.length, 0, 'nothing moved');
  assertEq(result.failed.length, 0, 'nothing failed');
  assertEq(result.manifest, null, 'no manifest written');
  assertEq(writeJsonCalls.length, 0, 'writeJson not called');
}

// Success path
resetFs();
makeFile('notes.md');
makeFile('report.txt');
quiet();
{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  const result = await o.applyCleanup();
  loud();
  assertEq(result.moved.length, 2, '2 moved');
  assertEq(result.failed.length, 0, 'none failed');
  assertEq(moveCalls.length, 2, '2 move calls');
  assertEq(moveCalls[0].options.overwrite, false, 'overwrite:false');
  assert(ensureDirCalls.length >= 2, 'ensureDir called for destination dirs');
  assertEq(writeJsonCalls.length, 1, 'manifest written once');
  assert(result.manifest !== null, 'manifest path returned');
}

// One move fails → recorded in `failed`
resetFs();
makeFile('good.md');
makeFile('bad.md');
moveThrowsFor = 'bad.md';
quiet();
{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  const result = await o.applyCleanup();
  loud();
  assertEq(result.moved.length, 1, '1 succeeded');
  assertEq(result.failed.length, 1, '1 failed');
  assert(result.failed[0].error.includes('fake move failure'), 'error captured');
  assert(result.failed[0].from.includes('bad.md'), 'failed has from');
}

// ============================================================================
// writeManifest: new vs append
// ============================================================================
console.log('\n── writeManifest ─────────────────────────────────────────');

// New manifest (no existing)
resetFs();
{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  const result = {
    timestamp: '2026-04-11T00:00:00Z',
    rootPath: '/var/www/orthodoxmetrics/prod',
    moved: [{ from: 'a', to: 'b' }, { from: 'c', to: 'd' }],
    failed: [],
  };
  const p = await o.writeManifest(result);
  assert(p.includes('_moves-'), 'manifest path contains _moves-');
  assert(p.endsWith('.json'), 'ends with .json');
  assertEq(writeJsonCalls.length, 1, 'writeJson called once');
  const written = writeJsonCalls[0].data;
  assertEq(written.totalMoved, 2, 'totalMoved = 2');
  assertEq(written.moves.length, 2, '2 moves in manifest');
  assertEq(writeJsonCalls[0].options.spaces, 2, 'pretty printed');
}

// Existing manifest → append
resetFs();
{
  const dateStr = new Date().toISOString().split('T')[0];
  const manifestPath = `/var/www/orthodoxmetrics/prod/docs/_inbox/_moves-${dateStr}.json`;
  existingPaths.add(manifestPath);
  existingManifest = { moves: [{ from: 'old-a', to: 'old-b' }] };

  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  const result = {
    timestamp: '2026-04-11T00:00:00Z',
    rootPath: '/var/www/orthodoxmetrics/prod',
    moved: [{ from: 'new-a', to: 'new-b' }],
    failed: [],
  };
  await o.writeManifest(result);

  const written = writeJsonCalls[0].data;
  assertEq(written.moves.length, 2, 'existing + new moves');
  assertEq(written.totalMoved, 2, 'totalMoved counts both');
  assertEq(written.moves[0].from, 'old-a', 'old entries first');
  assertEq(written.moves[1].from, 'new-a', 'new entries appended');
}

// Existing manifest with no moves array
resetFs();
{
  const dateStr = new Date().toISOString().split('T')[0];
  const manifestPath = `/var/www/orthodoxmetrics/prod/docs/_inbox/_moves-${dateStr}.json`;
  existingPaths.add(manifestPath);
  existingManifest = {};  // no moves key

  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  const result = {
    timestamp: 't',
    rootPath: '/var/www/orthodoxmetrics/prod',
    moved: [{ from: 'x', to: 'y' }],
    failed: [],
  };
  await o.writeManifest(result);
  const written = writeJsonCalls[0].data;
  assertEq(written.moves.length, 1, 'falls back to empty, only new added');
}

// ============================================================================
// getStats
// ============================================================================
console.log('\n── getStats ──────────────────────────────────────────────');

resetFs();
makeFile('notes.md');           // safe
makeFile('task.md');            // safe
makeFile('package.json');       // protected
makeFile('archive.zip');        // unsafe for documentation
makeFile('random.exe');         // unsafe
quiet();
{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  const stats = await o.getStats();
  loud();
  assertEq(stats.rootFiles, 5, '5 total');
  assertEq(stats.safeFiles, 2, '2 safe');
  assertEq(stats.protectedFiles, 1, '1 protected');
  assertEq(stats.unsafeFiles, 2, '2 unsafe');
  assertEq(stats.mode, 'documentation', 'mode');
  assert(stats.safeExtensions.includes('.md'), 'safe extensions included');
}

// scan error → stats still returned (error logged, fields stay at defaults)
resetFs();
readdirThrows = new Error('scan boom');
quiet();
{
  const o = new LibraryOrganizer('/var/www/orthodoxmetrics/prod', 'documentation');
  const stats = await o.getStats();
  loud();
  assertEq(stats.rootFiles, 0, '0 root files on error');
  assertEq(stats.safeFiles, 0, '0 safe');
  assertEq(stats.mode, 'documentation', 'mode still present');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
