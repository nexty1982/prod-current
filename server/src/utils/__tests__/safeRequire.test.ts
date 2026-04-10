#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/safeRequire.js (OMD-904)
 *
 * Tiny pure module: safeRequire(modulePath, fallbackFactory, moduleName?)
 * - Returns require()'d module on success
 * - On MODULE_NOT_FOUND: returns fallbackFactory(), warns once per moduleName
 * - On other errors: re-throws
 *
 * Run: npx tsx server/src/utils/__tests__/safeRequire.test.ts
 */

const { safeRequire } = require('../safeRequire');

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

// ── Capture console.warn so we can verify dedup behavior ──────────────────
const warnLog: string[] = [];
const origWarn = console.warn;
console.warn = (...args: any[]) => { warnLog.push(args.join(' ')); };

// ============================================================================
// Successful require
// ============================================================================
console.log('\n── safeRequire: successful require ───────────────────────');

// 'path' is always available — built-in node module
const pathMod = safeRequire('path', () => ({ stub: true }), 'path');
assertEq(typeof pathMod.join, 'function', 'real module returned (path.join exists)');
assertEq((pathMod as any).stub, undefined, 'fallback NOT used for real module');

// fs-extra also available in repo
const fsMod = safeRequire('fs-extra', () => ({ stub: true }), 'fs-extra');
assertEq(typeof fsMod.pathExists, 'function', 'fs-extra loaded');

// ============================================================================
// MODULE_NOT_FOUND fallback
// ============================================================================
console.log('\n── safeRequire: MODULE_NOT_FOUND fallback ────────────────');

warnLog.length = 0;

const stub1 = safeRequire(
  './does-not-exist-zzz-1',
  () => ({ stub: 1, name: 'fallback1' }),
  'missing-module-1'
);
assertEq(stub1.stub, 1, 'fallback returned');
assertEq(stub1.name, 'fallback1', 'fallback name');
assertEq(warnLog.length, 1, 'warned once on first miss');
assert(warnLog[0].includes('does-not-exist-zzz-1'), 'warning includes path');
assert(warnLog[0].includes('SafeRequire'), 'warning has SafeRequire tag');

// Second call with same moduleName → no new warning
const stub2 = safeRequire(
  './does-not-exist-zzz-1',
  () => ({ stub: 2 }),
  'missing-module-1'
);
assertEq(stub2.stub, 2, 'second call still returns fallback');
assertEq(warnLog.length, 1, 'warning deduped (still 1)');

// Different moduleName → new warning
safeRequire(
  './does-not-exist-zzz-2',
  () => ({}),
  'missing-module-2'
);
assertEq(warnLog.length, 2, 'new moduleName → new warning');

// fallbackFactory called fresh every time (not cached)
let factoryCallCount = 0;
const factory = () => { factoryCallCount++; return { count: factoryCallCount }; };
safeRequire('./does-not-exist-zzz-3', factory, 'missing-module-3');
safeRequire('./does-not-exist-zzz-3', factory, 'missing-module-3');
assertEq(factoryCallCount, 2, 'factory called on each invocation (no caching)');

// ============================================================================
// moduleName defaults to modulePath
// ============================================================================
console.log('\n── safeRequire: moduleName default ───────────────────────');

warnLog.length = 0;

// No moduleName arg — should use modulePath as the dedup key
safeRequire('./does-not-exist-zzz-4', () => ({}));
assertEq(warnLog.length, 1, 'warned once');

safeRequire('./does-not-exist-zzz-4', () => ({}));
assertEq(warnLog.length, 1, 'deduped using modulePath as key');

// ============================================================================
// Non-MODULE_NOT_FOUND errors are re-thrown
// ============================================================================
console.log('\n── safeRequire: non-MODULE_NOT_FOUND re-thrown ───────────');

// Use a real file that throws on require — write a tiny temp module that
// throws synchronously. The error.code will not be MODULE_NOT_FOUND.
const fs = require('fs');
const path = require('path');
const tmpDir = '/tmp';
const tmpFile = path.join(tmpDir, `safeRequire-test-${Date.now()}.js`);
fs.writeFileSync(tmpFile, 'throw new Error("intentional test error");');

let caught: Error | null = null;
try {
  safeRequire(tmpFile, () => ({ stub: true }), 'will-throw');
} catch (e: any) {
  caught = e;
}
assert(caught !== null, 'non-MODULE_NOT_FOUND error re-thrown');
assert(
  caught !== null && caught.message.includes('intentional test error'),
  'original error message preserved'
);

// Cleanup
fs.unlinkSync(tmpFile);

// ============================================================================
// Restore console.warn and exit
// ============================================================================
console.warn = origWarn;

console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
