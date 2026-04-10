#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/tokenUtils.js (OMD-893)
 *
 * Tiny pure helpers wrapping crypto.
 *
 * Run: npx tsx server/src/utils/__tests__/tokenUtils.test.ts
 */

const { generateToken, hashToken, verifyToken } = require('../tokenUtils');

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
// generateToken
// ============================================================================
console.log('\n── generateToken ─────────────────────────────────────────');

const t1 = generateToken();
const t2 = generateToken();

assertEq(typeof t1, 'string', 'returns string');
assertEq(t1.length, 64, '32 bytes hex → 64 chars');
assertEq(t2.length, 64, 't2 also 64 chars');
assert(/^[0-9a-f]{64}$/.test(t1), 'lowercase hex format');
assert(t1 !== t2, 'consecutive tokens differ');

// Spot-check uniqueness across many generations
const seen = new Set<string>();
for (let i = 0; i < 200; i++) {
  seen.add(generateToken());
}
assertEq(seen.size, 200, '200 generated → 200 unique');

// ============================================================================
// hashToken
// ============================================================================
console.log('\n── hashToken ─────────────────────────────────────────────');

const h1 = hashToken('hello');
const h2 = hashToken('hello');
const h3 = hashToken('world');

assertEq(typeof h1, 'string', 'returns string');
assertEq(h1.length, 64, 'sha256 hex → 64 chars');
assert(/^[0-9a-f]{64}$/.test(h1), 'lowercase hex format');
assertEq(h1, h2, 'deterministic: same input → same hash');
assert(h1 !== h3, 'different input → different hash');

// Known SHA-256 of "hello"
assertEq(
  hashToken('hello'),
  '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
  'sha256("hello") matches known value'
);

// Empty string
assertEq(
  hashToken(''),
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'sha256("") matches known value'
);

// ============================================================================
// verifyToken
// ============================================================================
console.log('\n── verifyToken ───────────────────────────────────────────');

const token = generateToken();
const hash = hashToken(token);

assertEq(verifyToken(token, hash), true, 'matching token/hash → true');
assertEq(verifyToken('wrong', hash), false, 'wrong token → false');
assertEq(verifyToken(token, 'deadbeef'), false, 'wrong hash → false');
assertEq(verifyToken('hello', hashToken('hello')), true, 'manual hello/hash → true');
assertEq(verifyToken('Hello', hashToken('hello')), false, 'case-sensitive: Hello vs hello → false');

// Roundtrip with multiple tokens
for (let i = 0; i < 10; i++) {
  const tk = generateToken();
  const hs = hashToken(tk);
  assertEq(verifyToken(tk, hs), true, `roundtrip ${i + 1}`);
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
