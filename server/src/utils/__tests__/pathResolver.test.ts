#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/pathResolver.ts pure helpers (OMD-894)
 *
 * Covers the synchronous, side-effect-free exports:
 *   - isSambaPath
 *   - getMountPoint
 *   - getBaseSourcePath
 *   - buildSnapshotPath
 *   - CONFIG (constant export)
 *
 * The fs/exec-dependent helpers (isMounted, verifySambaMount, resolvePath,
 * getMountInfo) are out of scope for this test backfill — they require real
 * mount points or shell mocking.
 *
 * Run: npx tsx server/src/utils/__tests__/pathResolver.test.ts
 */

import {
  isSambaPath,
  getMountPoint,
  getBaseSourcePath,
  buildSnapshotPath,
  CONFIG,
} from '../pathResolver';

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

// ============================================================================
// CONFIG
// ============================================================================
console.log('\n── CONFIG ────────────────────────────────────────────────');

assertEq(CONFIG.REMOTE_SAMBA_HOST, '192.168.1.221', 'host constant');
assertEq(CONFIG.REMOTE_SAMBA_PATH, '/var/refactor-src', 'path constant');
assertEq(CONFIG.REMOTE_SAMBA_FULL, '192.168.1.221:/var/refactor-src', 'full constant');
assertEq(CONFIG.MOUNT_POINT, '/mnt/refactor-remote', 'mount point constant');

// ============================================================================
// isSambaPath
// ============================================================================
console.log('\n── isSambaPath ───────────────────────────────────────────');

// Empty / null inputs
assertEq(isSambaPath(''), false, 'empty string → false');
assertEq(isSambaPath(null as any), false, 'null → false');
assertEq(isSambaPath(undefined as any), false, 'undefined → false');

// Paths containing host
assert(isSambaPath('192.168.1.221:/some/path'), 'host-prefixed path → true');
assert(isSambaPath('//192.168.1.221/share'), 'host as UNC-style → true');
assert(isSambaPath('foo 192.168.1.221 bar'), 'host substring anywhere → true');

// Paths under the mount point
assert(isSambaPath('/mnt/refactor-remote'), 'mount point itself → true');
assert(isSambaPath('/mnt/refactor-remote/sub/dir'), 'subpath of mount → true');
assert(isSambaPath('/mnt/refactor-remote/file.txt'), 'file under mount → true');

// Paths NOT under the mount and not containing host
assertEq(isSambaPath('/var/www/foo'), false, 'unrelated absolute → false');
assertEq(isSambaPath('/mnt/other'), false, 'sibling mount → false');
assertEq(isSambaPath('relative/path'), false, 'relative path → false');
assertEq(isSambaPath('/home/user'), false, 'home dir → false');

// Edge case — similar but distinct mount name
assertEq(
  isSambaPath('/mnt/refactor-remotex/file'),
  true,
  '/mnt/refactor-remotex starts with /mnt/refactor-remote → true (substring match)'
);

// ============================================================================
// getMountPoint
// ============================================================================
console.log('\n── getMountPoint ─────────────────────────────────────────');

assertEq(getMountPoint(), '/mnt/refactor-remote', 'no arg → mount point');
assertEq(getMountPoint('anything'), '/mnt/refactor-remote', 'arg ignored → mount point');
assertEq(getMountPoint('/some/other/path'), '/mnt/refactor-remote', 'unused path arg');

// ============================================================================
// getBaseSourcePath
// ============================================================================
console.log('\n── getBaseSourcePath ─────────────────────────────────────');

assertEq(
  getBaseSourcePath('remote'),
  '/mnt/refactor-remote',
  'remote → mount point'
);
assertEq(
  getBaseSourcePath('local'),
  '/var/www/orthodoxmetrics/prod/refactor-src',
  'local → prod refactor-src'
);

// ============================================================================
// buildSnapshotPath
// ============================================================================
console.log('\n── buildSnapshotPath ─────────────────────────────────────');

assertEq(
  buildSnapshotPath('/var/www/snapshots', '09-2025'),
  '/var/www/snapshots/09-2025/prod',
  'simple base + id'
);
assertEq(
  buildSnapshotPath('/mnt/refactor-remote', '01-2024'),
  '/mnt/refactor-remote/01-2024/prod',
  'remote base + id'
);
assertEq(
  buildSnapshotPath('relative/base', '12-2023'),
  'relative/base/12-2023/prod',
  'relative base preserved (path.join)'
);
assertEq(
  buildSnapshotPath('/base/', '06-2025'),
  '/base/06-2025/prod',
  'trailing slash on base normalized'
);
assertEq(
  buildSnapshotPath('', '01-2026'),
  '01-2026/prod',
  'empty base → just id/prod'
);

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
