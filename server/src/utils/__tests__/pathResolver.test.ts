#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/pathResolver.ts (OMD-904) — sync exports only
 *
 * Covers the pure synchronous exports that don't depend on exec/fs:
 *   - isSambaPath           — host substring + mount point prefix
 *   - getMountPoint         — constant
 *   - getBaseSourcePath     — local vs remote branch
 *   - buildSnapshotPath     — path.join
 *   - CONFIG                — exported constants object
 *
 * Out of scope (require exec/fs mocking):
 *   - isMounted, verifySambaMount, resolvePath, getMountInfo
 *
 * Constants under test (matched by source):
 *   REMOTE_SAMBA_HOST = '192.168.1.221'
 *   REMOTE_SAMBA_PATH = '/var/refactor-src'
 *   MOUNT_POINT       = '/mnt/refactor-remote'
 *
 * Run: npx tsx server/src/utils/__tests__/pathResolver.test.ts
 */

import {
  isSambaPath,
  getMountPoint,
  getBaseSourcePath,
  buildSnapshotPath,
  CONFIG
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

assertEq(CONFIG.REMOTE_SAMBA_HOST, '192.168.1.221', 'REMOTE_SAMBA_HOST');
assertEq(CONFIG.REMOTE_SAMBA_PATH, '/var/refactor-src', 'REMOTE_SAMBA_PATH');
assertEq(CONFIG.REMOTE_SAMBA_FULL, '192.168.1.221:/var/refactor-src', 'REMOTE_SAMBA_FULL');
assertEq(CONFIG.MOUNT_POINT, '/mnt/refactor-remote', 'MOUNT_POINT');

// ============================================================================
// isSambaPath
// ============================================================================
console.log('\n── isSambaPath ───────────────────────────────────────────');

// Empty/falsy → false
assertEq(isSambaPath(''), false, 'empty → false');
assertEq(isSambaPath(null as any), false, 'null → false');
assertEq(isSambaPath(undefined as any), false, 'undefined → false');

// Path containing the host substring → true
assertEq(isSambaPath('192.168.1.221:/some/share'), true, 'host:path → true');
assertEq(
  isSambaPath('//192.168.1.221/share/folder'),
  true,
  'UNC-style with host → true'
);

// Path under mount point → true
assertEq(isSambaPath('/mnt/refactor-remote'), true, 'exact mount point');
assertEq(isSambaPath('/mnt/refactor-remote/sub/dir'), true, 'subdir of mount');
assertEq(
  isSambaPath('/mnt/refactor-remote/09-2025/prod'),
  true,
  'snapshot path under mount'
);

// Local paths → false
assertEq(isSambaPath('/var/www/orthodoxmetrics/prod'), false, 'local /var path');
assertEq(isSambaPath('/tmp/test'), false, '/tmp');
assertEq(isSambaPath('relative/path'), false, 'relative path');
assertEq(isSambaPath('/mnt/other-mount'), false, 'different mount → false');

// ============================================================================
// getMountPoint
// ============================================================================
console.log('\n── getMountPoint ─────────────────────────────────────────');

assertEq(getMountPoint(), '/mnt/refactor-remote', 'no arg');
assertEq(getMountPoint('whatever'), '/mnt/refactor-remote', 'arg ignored (constant)');
assertEq(getMountPoint(''), '/mnt/refactor-remote', 'empty arg');

// ============================================================================
// getBaseSourcePath
// ============================================================================
console.log('\n── getBaseSourcePath ─────────────────────────────────────');

assertEq(getBaseSourcePath('remote'), '/mnt/refactor-remote', 'remote → mount point');
assertEq(
  getBaseSourcePath('local'),
  '/var/www/orthodoxmetrics/prod/refactor-src',
  'local → hardcoded local path'
);

// ============================================================================
// buildSnapshotPath
// ============================================================================
console.log('\n── buildSnapshotPath ─────────────────────────────────────');

assertEq(
  buildSnapshotPath('/mnt/refactor-remote', '09-2025'),
  '/mnt/refactor-remote/09-2025/prod',
  'remote base + snapshot'
);
assertEq(
  buildSnapshotPath('/var/www/orthodoxmetrics/prod/refactor-src', '01-2024'),
  '/var/www/orthodoxmetrics/prod/refactor-src/01-2024/prod',
  'local base + snapshot'
);

// path.join normalizes — trailing slash handled
assertEq(
  buildSnapshotPath('/base/', '12-2025'),
  '/base/12-2025/prod',
  'trailing slash normalized'
);

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
