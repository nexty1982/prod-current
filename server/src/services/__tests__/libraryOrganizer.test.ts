#!/usr/bin/env npx tsx
/**
 * Unit tests for services/libraryOrganizer.js (OMD-1031)
 *
 * File-moving utility that categorizes and archives loose files. Uses real
 * fs-extra in an isolated /tmp sandbox. validateRoot is patched on the
 * prototype to allow arbitrary root paths during testing.
 *
 * Coverage:
 *   - Constructor: invalid mode throws; invalid root throws (un-patched)
 *   - getSafeExtensions for each mode
 *   - scanRootDirectory: reads files, skips subdirectories
 *   - categorizeFile: daily patterns (task_, daily, _summary, _status, YYYY-MM-DD.md),
 *                     artifacts (.zip/.sql/.log/backup/dump), inbox default
 *   - findAvailablePath: no collision returns original, with collision returns -1/-2 suffix
 *   - calculateSHA256: hashes real file deterministically
 *   - planFileMove: protected file rejected, unsafe extension rejected, happy path
 *   - planCleanup: plans + skips + errors aggregation
 *   - applyCleanup: actually moves files, writes manifest, idempotent manifest append
 *   - getStats: counts safe/protected/unsafe correctly
 *
 * Run: npx tsx server/src/services/__tests__/libraryOrganizer.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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

// Silence noisy logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const LibraryOrganizer = require('../libraryOrganizer');

// Patch validateRoot to allow /tmp sandboxes
const origValidateRoot = LibraryOrganizer.prototype.validateRoot;
LibraryOrganizer.prototype.validateRoot = function () {};

// ── Sandbox helpers ─────────────────────────────────────────────────────

const SANDBOX_BASE = `/tmp/libraryOrganizer-test-${process.pid}-${Date.now()}`;

function makeSandbox(suffix: string): string {
  const dir = path.join(SANDBOX_BASE, suffix);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeFile(dir: string, name: string, content: string = 'hello world'): void {
  fs.writeFileSync(path.join(dir, name), content);
}

function cleanupSandbox() {
  try {
    fs.rmSync(SANDBOX_BASE, { recursive: true, force: true });
  } catch {}
}

async function main() {
try {

// ============================================================================
// Constructor — invalid mode
// ============================================================================
console.log('\n── Constructor: invalid mode ─────────────────────────────');

{
  const dir = makeSandbox('invalid-mode');
  let caught: Error | null = null;
  try {
    new LibraryOrganizer(dir, 'bogus');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid mode throws');
  assert(caught !== null && caught.message.includes('Invalid cleanup mode'), 'error message');
  assert(caught !== null && caught.message.includes('documentation'), 'lists valid modes');
}

// ============================================================================
// Constructor — invalid root (with original validator)
// ============================================================================
console.log('\n── Constructor: invalid root ─────────────────────────────');

{
  // Temporarily restore validateRoot to test it
  LibraryOrganizer.prototype.validateRoot = origValidateRoot;
  let caught: Error | null = null;
  try {
    new LibraryOrganizer('/nonexistent/bogus', 'documentation');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid root throws');
  assert(caught !== null && caught.message.includes('not allowed'), 'not-allowed msg');
  // Re-patch
  LibraryOrganizer.prototype.validateRoot = function () {};
}

// ============================================================================
// getSafeExtensions — all modes
// ============================================================================
console.log('\n── getSafeExtensions ─────────────────────────────────────');

{
  const dir = makeSandbox('get-safe-ext');

  const docOrg = new LibraryOrganizer(dir, 'documentation');
  assertEq(docOrg.getSafeExtensions(), ['.md', '.txt', '.docx', '.xlsx', '.pdf'], 'documentation');

  const artOrg = new LibraryOrganizer(dir, 'artifacts');
  assertEq(artOrg.getSafeExtensions(), ['.zip', '.sql', '.log', '.csv', '.json', '.yaml', '.yml'], 'artifacts');

  const scrOrg = new LibraryOrganizer(dir, 'scripts');
  assertEq(scrOrg.getSafeExtensions(), ['.sh', '.py', '.js'], 'scripts');

  const allOrg = new LibraryOrganizer(dir, 'all');
  assert(allOrg.getSafeExtensions().length === 15, 'all has 15 extensions');
  assert(allOrg.getSafeExtensions().includes('.md'), 'all includes .md');
  assert(allOrg.getSafeExtensions().includes('.zip'), 'all includes .zip');
}

// ============================================================================
// scanRootDirectory
// ============================================================================
console.log('\n── scanRootDirectory ─────────────────────────────────────');

{
  const dir = makeSandbox('scan');
  writeFile(dir, 'a.md', 'file a');
  writeFile(dir, 'b.txt', 'file b');
  writeFile(dir, 'c.log', 'file c');
  // Subdirectory — should be skipped
  fs.mkdirSync(path.join(dir, 'subdir'));
  writeFile(path.join(dir, 'subdir'), 'nested.md');

  const org = new LibraryOrganizer(dir, 'all');
  const files = await org.scanRootDirectory();

  assertEq(files.length, 3, '3 files found (subdir skipped)');
  const names = files.map((f: any) => f.name).sort();
  assertEq(names, ['a.md', 'b.txt', 'c.log'], 'correct filenames');
  assertEq(files[0].ext, path.extname(files[0].name), 'ext populated');
  assert(typeof files[0].size === 'number', 'size numeric');
  assert(files[0].mtime instanceof Date, 'mtime is Date');
}

// ============================================================================
// categorizeFile
// ============================================================================
console.log('\n── categorizeFile ────────────────────────────────────────');

{
  const dir = makeSandbox('categorize');
  const org = new LibraryOrganizer(dir, 'all');

  // Daily patterns
  assertEq(org.categorizeFile('task_42.md'), 'daily', 'task_ prefix → daily');
  assertEq(org.categorizeFile('daily_notes.txt'), 'daily', 'daily prefix → daily');
  assertEq(org.categorizeFile('report_summary.md'), 'daily', '_summary → daily');
  assertEq(org.categorizeFile('work_status.md'), 'daily', '_status → daily');
  assertEq(org.categorizeFile('2026-04-10-report.md'), 'daily', 'YYYY-MM-DD.md → daily');

  // Artifacts
  assertEq(org.categorizeFile('archive.zip'), 'artifacts', '.zip → artifacts');
  assertEq(org.categorizeFile('dump.sql'), 'artifacts', '.sql → artifacts');
  assertEq(org.categorizeFile('server.log'), 'artifacts', '.log → artifacts');
  assertEq(org.categorizeFile('backup-data.md'), 'artifacts', 'backup keyword → artifacts');
  assertEq(org.categorizeFile('prod-dump.json'), 'artifacts', 'dump keyword → artifacts');

  // Inbox default
  assertEq(org.categorizeFile('notes.md'), 'inbox', 'generic .md → inbox');
  assertEq(org.categorizeFile('something.txt'), 'inbox', 'generic .txt → inbox');
  assertEq(org.categorizeFile('config.yaml'), 'inbox', 'generic .yaml → inbox');
}

// ============================================================================
// findAvailablePath
// ============================================================================
console.log('\n── findAvailablePath ─────────────────────────────────────');

{
  const dir = makeSandbox('collisions');
  const org = new LibraryOrganizer(dir, 'all');

  // No collision → original
  const p1 = await org.findAvailablePath(dir, 'unique.md');
  assertEq(p1, path.join(dir, 'unique.md'), 'no collision returns original');

  // With collision → suffix
  writeFile(dir, 'taken.md');
  const p2 = await org.findAvailablePath(dir, 'taken.md');
  assertEq(p2, path.join(dir, 'taken-1.md'), 'collision → -1 suffix');

  // Double collision → -2
  writeFile(dir, 'taken-1.md');
  const p3 = await org.findAvailablePath(dir, 'taken.md');
  assertEq(p3, path.join(dir, 'taken-2.md'), 'double collision → -2');
}

// ============================================================================
// calculateSHA256
// ============================================================================
console.log('\n── calculateSHA256 ───────────────────────────────────────');

{
  const dir = makeSandbox('sha256');
  writeFile(dir, 'hello.txt', 'hello world');
  const org = new LibraryOrganizer(dir, 'all');

  const hash = await org.calculateSHA256(path.join(dir, 'hello.txt'));
  const expected = crypto.createHash('sha256').update('hello world').digest('hex');
  assertEq(hash, expected, 'matches sha256 of "hello world"');
  assertEq(hash.length, 64, 'hash is 64 hex chars');
}

// ============================================================================
// planFileMove — protected, unsafe, happy
// ============================================================================
console.log('\n── planFileMove ──────────────────────────────────────────');

{
  const dir = makeSandbox('plan-move');
  writeFile(dir, 'notes.md', 'safe to move');
  writeFile(dir, 'package.json', 'protected');
  writeFile(dir, 'weird.xyz', 'unsafe ext');

  const org = new LibraryOrganizer(dir, 'documentation');
  const files = await org.scanRootDirectory();
  const byName = Object.fromEntries(files.map((f: any) => [f.name, f]));

  // Protected
  const protectedMove = await org.planFileMove(byName['package.json']);
  assertEq(protectedMove.shouldMove, false, 'protected not moved');
  assertEq(protectedMove.reason, 'protected file', 'reason=protected');
  assertEq(protectedMove.sha256, null, 'no sha256 for protected');

  // Unsafe ext
  const unsafeMove = await org.planFileMove(byName['weird.xyz']);
  assertEq(unsafeMove.shouldMove, false, 'unsafe not moved');
  assert(unsafeMove.reason.includes('unsafe extension'), 'reason=unsafe ext');

  // Safe .md → inbox
  const safeMove = await org.planFileMove(byName['notes.md']);
  assertEq(safeMove.shouldMove, true, 'safe should move');
  assertEq(safeMove.category, 'inbox', 'categorized as inbox');
  assert(safeMove.sha256!.length === 64, 'sha256 computed');
  assert(safeMove.to.includes('docs/_inbox/'), 'destination in _inbox');
  assert(safeMove.to.includes('notes.md'), 'preserves filename');
}

// Daily categorization → docs/daily
{
  const dir = makeSandbox('plan-daily');
  writeFile(dir, 'task_42.md');
  const org = new LibraryOrganizer(dir, 'documentation');
  const files = await org.scanRootDirectory();
  const move = await org.planFileMove(files[0]);
  assertEq(move.shouldMove, true, 'daily should move');
  assertEq(move.category, 'daily', 'daily category');
  assert(move.to.includes('docs/daily/'), 'destination in docs/daily');
}

// ============================================================================
// planCleanup — aggregates moves + skipped
// ============================================================================
console.log('\n── planCleanup ───────────────────────────────────────────');

{
  const dir = makeSandbox('plan-cleanup');
  writeFile(dir, 'a.md', 'A');
  writeFile(dir, 'b.md', 'B');
  writeFile(dir, 'README.md', 'protected');
  writeFile(dir, 'binary.bin', 'unsafe');
  quiet();
  const org = new LibraryOrganizer(dir, 'documentation');
  const plan = await org.planCleanup();
  loud();

  assertEq(plan.mode, 'documentation', 'mode in plan');
  assertEq(plan.rootPath, dir, 'rootPath in plan');
  assertEq(plan.plannedMoves.length, 2, '2 planned moves');
  assertEq(plan.skipped.length, 2, '2 skipped');
  assertEq(plan.errors.length, 0, 'no errors');
  assert(plan.timestamp.length > 0, 'has timestamp');

  const skippedNames = plan.skipped.map((s: any) => s.file).sort();
  assertEq(skippedNames, ['README.md', 'binary.bin'], 'skipped set');
}

// ============================================================================
// applyCleanup — actually moves files + manifest
// ============================================================================
console.log('\n── applyCleanup ──────────────────────────────────────────');

{
  const dir = makeSandbox('apply');
  writeFile(dir, 'report.md', 'content');
  writeFile(dir, 'task_99.md', 'daily');
  writeFile(dir, 'README.md', 'protected');
  quiet();
  const org = new LibraryOrganizer(dir, 'documentation');
  const result = await org.applyCleanup();
  loud();

  assertEq(result.moved.length, 2, '2 moved');
  assertEq(result.failed.length, 0, 'none failed');
  assert(result.manifest !== null, 'manifest path set');

  // Verify files moved off root
  assert(!fs.existsSync(path.join(dir, 'report.md')), 'report.md gone from root');
  assert(!fs.existsSync(path.join(dir, 'task_99.md')), 'task_99.md gone from root');
  assert(fs.existsSync(path.join(dir, 'README.md')), 'README.md still present (protected)');

  // Verify files exist in new locations
  const movedPaths = result.moved.map((m: any) => m.to);
  for (const p of movedPaths) {
    assert(fs.existsSync(p), `moved file exists at ${p.replace(dir, '')}`);
  }

  // Verify manifest
  const manifest = JSON.parse(fs.readFileSync(result.manifest, 'utf8'));
  assertEq(manifest.totalMoved, 2, 'manifest totalMoved=2');
  assertEq(manifest.moves.length, 2, 'manifest has 2 moves');
  assertEq(manifest.rootPath, dir, 'manifest rootPath');
}

// Apply on empty dir returns early
{
  const dir = makeSandbox('apply-empty');
  quiet();
  const org = new LibraryOrganizer(dir, 'documentation');
  const result = await org.applyCleanup();
  loud();
  assertEq(result.moved.length, 0, 'no files moved');
  assertEq(result.manifest, null, 'no manifest written');
}

// Second applyCleanup appends to manifest
{
  const dir = makeSandbox('apply-append');
  writeFile(dir, 'first.md', '1');
  quiet();
  const org = new LibraryOrganizer(dir, 'documentation');
  await org.applyCleanup();

  // Add more files, run again
  writeFile(dir, 'second.md', '2');
  const result2 = await org.applyCleanup();
  loud();

  assertEq(result2.moved.length, 1, 'second run moved 1');
  const manifest = JSON.parse(fs.readFileSync(result2.manifest, 'utf8'));
  assertEq(manifest.totalMoved, 2, 'manifest appended (1 + 1 = 2)');
  assertEq(manifest.moves.length, 2, 'both moves in manifest');
}

// ============================================================================
// getStats
// ============================================================================
console.log('\n── getStats ──────────────────────────────────────────────');

{
  const dir = makeSandbox('stats');
  writeFile(dir, 'a.md');
  writeFile(dir, 'b.md');
  writeFile(dir, 'c.txt');
  writeFile(dir, 'package.json', 'protected');
  writeFile(dir, 'weird.bin', 'unsafe');

  const org = new LibraryOrganizer(dir, 'documentation');
  const stats = await org.getStats();

  assertEq(stats.rootFiles, 5, '5 total');
  assertEq(stats.safeFiles, 3, '3 safe (.md, .md, .txt)');
  assertEq(stats.protectedFiles, 1, '1 protected');
  assertEq(stats.unsafeFiles, 1, '1 unsafe');
  assertEq(stats.mode, 'documentation', 'mode reported');
  assert(stats.safeExtensions.includes('.md'), 'safeExtensions listed');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);

} finally {
  cleanupSandbox();
  LibraryOrganizer.prototype.validateRoot = origValidateRoot;
}

if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => {
  cleanupSandbox();
  LibraryOrganizer.prototype.validateRoot = origValidateRoot;
  console.error('Unhandled:', e);
  process.exit(1);
});
