#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/tokenUtils.js (OMD-900)
 *
 * Pure module — uses node:crypto only.
 *
 * Coverage:
 *   - generateToken: 64-char lowercase hex (32 random bytes), unique
 *   - hashToken:     SHA-256 hex, deterministic, matches known vectors
 *   - verifyToken:   roundtrip + tamper rejection
 *
 * Run: npx tsx server/src/utils/__tests__/tokenUtils.test.ts
 */

const { generateToken, hashToken, verifyToken } = require('../tokenUtils');
const crypto = require('crypto');

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
assertEq(t1.length, 64, 'length 64 (32 bytes hex)');
assert(/^[0-9a-f]{64}$/.test(t1), 'lowercase hex only');
assert(t1 !== t2, 'consecutive tokens differ');

// Spot check uniqueness across many
const set = new Set<string>();
for (let i = 0; i < 200; i++) {
  set.add(generateToken());
}
assertEq(set.size, 200, '200 generated → 200 unique');

// All match the format
let allHex = true;
for (const tok of set) {
  if (!/^[0-9a-f]{64}$/.test(tok)) { allHex = false; break; }
}
assert(allHex, 'all 200 tokens are 64-char lowercase hex');

// ============================================================================
// hashToken
// ============================================================================
console.log('\n── hashToken ─────────────────────────────────────────────');

// SHA-256 hex of "hello" — known reference
const helloHash = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';
assertEq(hashToken('hello'), helloHash, 'sha256("hello") known vector');

// SHA-256 hex of "" — known reference
const emptyHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
assertEq(hashToken(''), emptyHash, 'sha256("") known vector');

// Format
const h = hashToken('arbitrary input');
assertEq(typeof h, 'string', 'hash returns string');
assertEq(h.length, 64, 'hash length 64');
assert(/^[0-9a-f]{64}$/.test(h), 'hash is lowercase hex');

// Deterministic
assertEq(hashToken('foo'), hashToken('foo'), 'hash deterministic');
assertEq(hashToken('a'), hashToken('a'), 'hash deterministic 2');

// Different inputs → different hashes
assert(hashToken('a') !== hashToken('b'), 'different input → different hash');
assert(hashToken('hello') !== hashToken('Hello'), 'case-sensitive');

// Hash a generated token (typical use case)
const tok = generateToken();
const tokHash = hashToken(tok);
assertEq(tokHash.length, 64, 'token hash length 64');
assert(tokHash !== tok, 'hash differs from original token');

// ============================================================================
// verifyToken
// ============================================================================
console.log('\n── verifyToken ───────────────────────────────────────────');

// Roundtrip
const tk = generateToken();
const hk = hashToken(tk);
assertEq(verifyToken(tk, hk), true, 'roundtrip: token verifies against its hash');

// Wrong token rejected
const tk2 = generateToken();
assertEq(verifyToken(tk2, hk), false, 'wrong token → false');

// Tampered hash rejected
const tamperedHash = hk.substring(0, 63) + (hk[63] === 'a' ? 'b' : 'a');
assertEq(verifyToken(tk, tamperedHash), false, 'tampered hash → false');

// Wrong-length hash rejected
assertEq(verifyToken(tk, 'shorthash'), false, 'short hash → false');
assertEq(verifyToken(tk, ''), false, 'empty hash → false');

// Empty token: matches empty-string hash
assertEq(verifyToken('', emptyHash), true, 'empty token matches empty hash');

// Multiple roundtrips
for (let i = 0; i < 50; i++) {
  const t = generateToken();
  const h2 = hashToken(t);
  if (!verifyToken(t, h2)) {
    failed++;
    console.error(`  FAIL: roundtrip iteration ${i}`);
    break;
  }
}
console.log('  PASS: 50 roundtrips verify');
passed++;

// Cross-verify against node:crypto independently
const independent = crypto.createHash('sha256').update(tk).digest('hex');
assertEq(hashToken(tk), independent, 'matches independent crypto.sha256');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
