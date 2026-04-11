#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/ocrPaths.ts (OMD-940)
 *
 * Pure path helpers for OCR uploads with fs side effects (mkdir/exists).
 * Strategy: monkey-patch fs.existsSync + fs.mkdirSync on the singleton fs
 * module BEFORE requiring ocrPaths, so the compiled `import fs from 'fs'`
 * sees our stubs. Restore originals at the end.
 *
 * Covers:
 *   - getOcrDbPath          pure string template
 *   - getOcrUploadDir       returns canonical path; mkdirs if missing
 *   - resolveUploadDir      canonical helper, identical shape
 *   - getUploadsTempDir     returns /var/.../uploads/temp; mkdirs if missing
 *   - resolveOcrFilePath    candidate ordering: absolute /var/, /uploads/,
 *                           church uploaded/, church root, church processed/
 *   - UPLOADS_ROOT/UPLOADS_TEMP exports
 *
 * Run from server/: npx tsx src/utils/__tests__/ocrPaths.test.ts
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

// ── Stub fs.existsSync + fs.mkdirSync BEFORE requiring ocrPaths ──────────
// Compiled `import fs from 'fs'` resolves to the singleton fs module, so
// monkey-patching its methods works for the SUT.

const fs = require('fs');
const origExistsSync = fs.existsSync;
const origMkdirSync = fs.mkdirSync;

// Track calls + control existsSync return value via a Map
const existsCalls: string[] = [];
const mkdirCalls: Array<{ path: string; opts: any }> = [];
let existsMap = new Map<string, boolean>();

fs.existsSync = (p: string): boolean => {
  existsCalls.push(p);
  return existsMap.has(p) ? existsMap.get(p)! : false;
};
fs.mkdirSync = (p: string, opts: any) => {
  mkdirCalls.push({ path: p, opts });
  // creating it makes subsequent existsSync calls return true
  existsMap.set(p, true);
  return undefined;
};

function resetFsMocks() {
  existsCalls.length = 0;
  mkdirCalls.length = 0;
  existsMap = new Map<string, boolean>();
}

// Now safe to require the SUT
const {
  getOcrUploadDir,
  getOcrDbPath,
  resolveUploadDir,
  getUploadsTempDir,
  resolveOcrFilePath,
  UPLOADS_ROOT,
  UPLOADS_TEMP,
} = require('../ocrPaths');

// ============================================================================
// Constants
// ============================================================================
console.log('\n── exports ───────────────────────────────────────────────');

assertEq(UPLOADS_ROOT, '/var/www/orthodoxmetrics/prod/uploads', 'UPLOADS_ROOT canonical');
assertEq(UPLOADS_TEMP, '/var/www/orthodoxmetrics/prod/uploads/temp', 'UPLOADS_TEMP canonical');

// ============================================================================
// getOcrDbPath — pure string template, no fs
// ============================================================================
console.log('\n── getOcrDbPath ──────────────────────────────────────────');

assertEq(
  getOcrDbPath(46, 'scan_001.jpg'),
  '/uploads/om_church_46/uploaded/scan_001.jpg',
  'church 46, simple filename'
);
assertEq(
  getOcrDbPath(1, 'a.png'),
  '/uploads/om_church_1/uploaded/a.png',
  'church 1, png'
);
assertEq(
  getOcrDbPath(999, 'baptism record - 1923.tiff'),
  '/uploads/om_church_999/uploaded/baptism record - 1923.tiff',
  'spaces in filename pass through'
);
assertEq(
  getOcrDbPath(0, 'x.jpg'),
  '/uploads/om_church_0/uploaded/x.jpg',
  'churchId=0 still produces path'
);

// ============================================================================
// getOcrUploadDir — returns dir, mkdirs if missing
// ============================================================================
console.log('\n── getOcrUploadDir ───────────────────────────────────────');

// Missing → mkdir called
resetFsMocks();
{
  const dir = getOcrUploadDir(46);
  assertEq(dir, '/var/www/orthodoxmetrics/prod/uploads/om_church_46/uploaded', 'returns canonical path');
  assertEq(mkdirCalls.length, 1, 'mkdir called once');
  assertEq(mkdirCalls[0].path, dir, 'mkdir on the same path');
  assertEq(mkdirCalls[0].opts.recursive, true, 'mkdir recursive: true');
}

// Already exists → no mkdir
resetFsMocks();
existsMap.set('/var/www/orthodoxmetrics/prod/uploads/om_church_46/uploaded', true);
{
  const dir = getOcrUploadDir(46);
  assertEq(dir, '/var/www/orthodoxmetrics/prod/uploads/om_church_46/uploaded', 'still returns path');
  assertEq(mkdirCalls.length, 0, 'mkdir NOT called when exists');
}

// Different churchId → different dir
resetFsMocks();
{
  const a = getOcrUploadDir(1);
  const b = getOcrUploadDir(2);
  assert(a !== b, 'different church → different dir');
  assert(a.includes('om_church_1'), 'dir includes om_church_1');
  assert(b.includes('om_church_2'), 'dir includes om_church_2');
}

// ============================================================================
// resolveUploadDir — same canonical shape as getOcrUploadDir
// ============================================================================
console.log('\n── resolveUploadDir ──────────────────────────────────────');

resetFsMocks();
{
  const dir = resolveUploadDir(51);
  assertEq(dir, '/var/www/orthodoxmetrics/prod/uploads/om_church_51/uploaded', 'church 51 canonical path');
  assertEq(mkdirCalls.length, 1, 'mkdir called for missing dir');
  assertEq(mkdirCalls[0].opts.recursive, true, 'recursive');
}

resetFsMocks();
existsMap.set('/var/www/orthodoxmetrics/prod/uploads/om_church_51/uploaded', true);
{
  resolveUploadDir(51);
  assertEq(mkdirCalls.length, 0, 'no mkdir when exists');
}

// resolveUploadDir and getOcrUploadDir return the same path for the same input
resetFsMocks();
existsMap.set('/var/www/orthodoxmetrics/prod/uploads/om_church_77/uploaded', true);
assertEq(getOcrUploadDir(77), resolveUploadDir(77), 'getOcrUploadDir and resolveUploadDir agree');

// ============================================================================
// getUploadsTempDir
// ============================================================================
console.log('\n── getUploadsTempDir ─────────────────────────────────────');

resetFsMocks();
{
  const tmp = getUploadsTempDir();
  assertEq(tmp, '/var/www/orthodoxmetrics/prod/uploads/temp', 'canonical temp path');
  assertEq(mkdirCalls.length, 1, 'mkdir called when missing');
  assertEq(mkdirCalls[0].path, tmp, 'mkdir on temp path');
  assertEq(mkdirCalls[0].opts.recursive, true, 'recursive');
}

resetFsMocks();
existsMap.set('/var/www/orthodoxmetrics/prod/uploads/temp', true);
{
  getUploadsTempDir();
  assertEq(mkdirCalls.length, 0, 'no mkdir when temp dir exists');
}

// ============================================================================
// resolveOcrFilePath — candidate ordering & nulls
// ============================================================================
console.log('\n── resolveOcrFilePath ────────────────────────────────────');

// Empty input → null (no candidate scan)
resetFsMocks();
assertEq(resolveOcrFilePath(''), null, 'empty path → null');
assertEq(resolveOcrFilePath(null as any), null, 'null path → null');
assertEq(resolveOcrFilePath(undefined as any), null, 'undefined path → null');
assertEq(existsCalls.length, 0, 'no fs calls for empty input');

// Absolute /var/ path that exists → returned as-is (candidate 1)
resetFsMocks();
existsMap.set('/var/www/orthodoxmetrics/prod/uploads/om_church_46/uploaded/scan.jpg', true);
assertEq(
  resolveOcrFilePath('/var/www/orthodoxmetrics/prod/uploads/om_church_46/uploaded/scan.jpg'),
  '/var/www/orthodoxmetrics/prod/uploads/om_church_46/uploaded/scan.jpg',
  'existing absolute /var/ path returned'
);

// Absolute /var/ path that does NOT exist → falls through; without churchId → null
resetFsMocks();
assertEq(
  resolveOcrFilePath('/var/www/orthodoxmetrics/prod/uploads/missing.jpg'),
  null,
  'missing absolute path + no churchId → null'
);

// Absolute /var/ path missing, but church variant exists → falls through to church
resetFsMocks();
existsMap.set('/var/www/orthodoxmetrics/prod/uploads/om_church_46/uploaded/scan.jpg', true);
assertEq(
  resolveOcrFilePath('/var/www/orthodoxmetrics/prod/uploads/anything/scan.jpg', 46),
  '/var/www/orthodoxmetrics/prod/uploads/om_church_46/uploaded/scan.jpg',
  'falls through to church uploaded/ when absolute miss'
);

// /uploads/ relative → mapped under UPLOADS_ROOT (candidate 2)
resetFsMocks();
existsMap.set('/var/www/orthodoxmetrics/prod/uploads/om_church_51/uploaded/baptism.png', true);
assertEq(
  resolveOcrFilePath('/uploads/om_church_51/uploaded/baptism.png'),
  '/var/www/orthodoxmetrics/prod/uploads/om_church_51/uploaded/baptism.png',
  '/uploads/ resolves under UPLOADS_ROOT'
);

// Church variant 1: om_church_<id>/uploaded/<file> (candidate 3)
resetFsMocks();
existsMap.set('/var/www/orthodoxmetrics/prod/uploads/om_church_46/uploaded/foo.jpg', true);
assertEq(
  resolveOcrFilePath('foo.jpg', 46),
  '/var/www/orthodoxmetrics/prod/uploads/om_church_46/uploaded/foo.jpg',
  'bare filename + churchId → uploaded/ candidate'
);

// Church variant 2: om_church_<id>/<file> (candidate 4) — uploaded/ misses
resetFsMocks();
existsMap.set('/var/www/orthodoxmetrics/prod/uploads/om_church_46/foo.jpg', true);
assertEq(
  resolveOcrFilePath('foo.jpg', 46),
  '/var/www/orthodoxmetrics/prod/uploads/om_church_46/foo.jpg',
  'falls through to no-subdir candidate'
);

// Church variant 3: om_church_<id>/processed/<file> (candidate 5)
resetFsMocks();
existsMap.set('/var/www/orthodoxmetrics/prod/uploads/om_church_46/processed/foo.jpg', true);
assertEq(
  resolveOcrFilePath('foo.jpg', 46),
  '/var/www/orthodoxmetrics/prod/uploads/om_church_46/processed/foo.jpg',
  'falls through to processed/ candidate'
);

// First existing candidate wins (uploaded/ before processed/)
resetFsMocks();
existsMap.set('/var/www/orthodoxmetrics/prod/uploads/om_church_46/uploaded/foo.jpg', true);
existsMap.set('/var/www/orthodoxmetrics/prod/uploads/om_church_46/processed/foo.jpg', true);
assertEq(
  resolveOcrFilePath('foo.jpg', 46),
  '/var/www/orthodoxmetrics/prod/uploads/om_church_46/uploaded/foo.jpg',
  'uploaded/ wins over processed/ when both exist'
);

// /uploads/ candidate wins over church candidates when both exist
resetFsMocks();
existsMap.set('/var/www/orthodoxmetrics/prod/uploads/om_church_46/uploaded/foo.jpg', true);
assertEq(
  resolveOcrFilePath('/uploads/om_church_46/uploaded/foo.jpg', 46),
  '/var/www/orthodoxmetrics/prod/uploads/om_church_46/uploaded/foo.jpg',
  '/uploads/ candidate ordering still finds the file'
);

// None exist → null
resetFsMocks();
assertEq(
  resolveOcrFilePath('/uploads/om_church_46/uploaded/missing.jpg', 46),
  null,
  'no candidate exists → null'
);

// Bare filename without churchId → no candidates considered, null
resetFsMocks();
assertEq(
  resolveOcrFilePath('orphan.jpg'),
  null,
  'bare filename + no churchId → null'
);
assertEq(existsCalls.length, 0, 'no fs.existsSync calls when no candidates produced');

// Filename basename is extracted from any input form
resetFsMocks();
existsMap.set('/var/www/orthodoxmetrics/prod/uploads/om_church_46/uploaded/scan.jpg', true);
assertEq(
  resolveOcrFilePath('/some/random/dir/scan.jpg', 46),
  '/var/www/orthodoxmetrics/prod/uploads/om_church_46/uploaded/scan.jpg',
  'basename extracted for church candidates'
);

// churchId=0 is falsy → treated as "no churchId" — church candidates skipped
resetFsMocks();
existsMap.set('/var/www/orthodoxmetrics/prod/uploads/om_church_0/uploaded/foo.jpg', true);
assertEq(
  resolveOcrFilePath('foo.jpg', 0),
  null,
  'churchId=0 is falsy: church candidates skipped (documented quirk)'
);

// ============================================================================
// Restore fs and exit
// ============================================================================
fs.existsSync = origExistsSync;
fs.mkdirSync = origMkdirSync;

console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
