#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/generateCredentials.js — pure exports only (OMD-907)
 *
 * Covers the two pure exported functions:
 *   - generateSecurePassword(length)  — random password generator
 *   - validatePasswordStrength(pwd)   — strength scorer
 *
 * Out of scope (DB-bound, require getAppPool/connection):
 *   generateCredentials, resetUserPassword, generateAPIKey,
 *   initializeCredentialTables
 *
 * Run: npx tsx server/src/utils/__tests__/generateCredentials.test.ts
 */

const {
  generateSecurePassword,
  validatePasswordStrength
} = require('../generateCredentials');

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
// generateSecurePassword
// ============================================================================
console.log('\n── generateSecurePassword ────────────────────────────────');

// Default length
const defPw = generateSecurePassword();
assertEq(defPw.length, 16, 'default length 16');

// Custom lengths
assertEq(generateSecurePassword(12).length, 12, 'length=12');
assertEq(generateSecurePassword(20).length, 20, 'length=20');
assertEq(generateSecurePassword(32).length, 32, 'length=32');

// Generates unique passwords (effectively, with 60+ char alphabet × 16 chars
// the collision probability is astronomically low)
const pw1 = generateSecurePassword(16);
const pw2 = generateSecurePassword(16);
assert(pw1 !== pw2, 'two consecutive calls produce different passwords');

// Character class invariants — source guarantees at least one of each type
// in the first 4 chars before shuffling, so any output of length ≥ 4 has all
// four classes (verified across multiple samples).
function hasUpper(s: string): boolean { return /[A-Z]/.test(s); }
function hasLower(s: string): boolean { return /[a-z]/.test(s); }
function hasDigit(s: string): boolean { return /[0-9]/.test(s); }
function hasSpecial(s: string): boolean { return /[!@#$%^&*]/.test(s); }

// Sample 50 passwords and verify all four classes always present
let allPassed = true;
for (let i = 0; i < 50; i++) {
  const pw = generateSecurePassword(16);
  if (!hasUpper(pw) || !hasLower(pw) || !hasDigit(pw) || !hasSpecial(pw)) {
    allPassed = false;
    break;
  }
}
assert(allPassed, '50 samples: all contain upper/lower/digit/special');

// Even at length 4 (the minimum where source guarantees one of each), the
// loop doesn't add extras. So a length-4 password has exactly one upper,
// one lower, one digit, one special — verified by character class union.
const minPw = generateSecurePassword(4);
assertEq(minPw.length, 4, 'length=4 honored');
assert(hasUpper(minPw), 'len4: has upper');
assert(hasLower(minPw), 'len4: has lower');
assert(hasDigit(minPw), 'len4: has digit');
assert(hasSpecial(minPw), 'len4: has special');

// Only contains characters from the allowed charset
const pw3 = generateSecurePassword(64);
const validCharset = /^[A-Za-z0-9!@#$%^&*]+$/;
assert(validCharset.test(pw3), 'all chars from allowed charset');

// ============================================================================
// validatePasswordStrength — weak passwords
// ============================================================================
console.log('\n── validatePasswordStrength: weak ────────────────────────');

// Empty
let v = validatePasswordStrength('');
assertEq(v.valid, false, 'empty: invalid');
assertEq(v.strength, 'weak', 'empty: weak');

// Too short — just verify the length check, not overall strength.
// (A short password with U/L/D/S still passes 4-6 checks via vacuous
//  noSequential/noRepeating, so it can score medium or strong despite
//  failing the length requirement.)
v = validatePasswordStrength('Abc1!');
assertEq(v.checks.length, false, '5 chars: length check false');

// All lowercase
v = validatePasswordStrength('abcdefghijkl');
assertEq(v.strength, 'weak', 'all lowercase: weak');
assertEq(v.checks.uppercase, false, 'no uppercase');
assertEq(v.checks.numbers, false, 'no digits');
assertEq(v.checks.special, false, 'no special');

// Sequential characters
v = validatePasswordStrength('Abcdef123456');
assertEq(v.checks.noSequential, false, 'sequential abc → false');

// Repeating characters (3+ same)
v = validatePasswordStrength('Aaaa12345!bc');
assertEq(v.checks.noRepeating, false, 'aaaa → false');

// ============================================================================
// validatePasswordStrength — medium passwords
// ============================================================================
console.log('\n── validatePasswordStrength: medium ──────────────────────');

// Exactly 12 chars, has upper/lower/digit, no special, no sequential, no repeat
// → 5 checks pass = medium
v = validatePasswordStrength('Hkqwprtmnvxz');
// length=12 ✓, upper ✓, lower ✓, no digits ✗, no special ✗, no sequential ✓, no repeat ✓
// = 5 checks → medium (score < 6 = medium)
assertEq(v.strength, 'medium', '5 checks → medium');
assertEq(v.valid, true, 'medium → valid');

// ============================================================================
// validatePasswordStrength — strong passwords
// ============================================================================
console.log('\n── validatePasswordStrength: strong ──────────────────────');

// All 7 checks pass
v = validatePasswordStrength('Hk7@QwprtMv9!');
assertEq(v.strength, 'strong', 'all checks → strong');
assertEq(v.valid, true, 'strong → valid');
assertEq(v.score, 100, 'all 7 checks → score 100');
assertEq(v.checks.length, true, 'length ≥12');
assertEq(v.checks.uppercase, true, 'has uppercase');
assertEq(v.checks.lowercase, true, 'has lowercase');
assertEq(v.checks.numbers, true, 'has digit');
assertEq(v.checks.special, true, 'has special');
assertEq(v.checks.noSequential, true, 'no sequential');
assertEq(v.checks.noRepeating, true, 'no repeating');

// 6 checks → strong (score >= 6)
// Add a sequential pattern but keep everything else
v = validatePasswordStrength('Hk7@Qwprtmnabc');
// length=14 ✓, upper ✓, lower ✓, digit ✓, special ✓, seq abc ✗, no repeat ✓
// = 6 → strong
assertEq(v.strength, 'strong', '6 checks → strong');

// ============================================================================
// validatePasswordStrength — score calculation
// ============================================================================
console.log('\n── validatePasswordStrength: score ───────────────────────');

// Score is rounded percentage of 7 checks
v = validatePasswordStrength('Hk7@QwprtMv9!');
assertEq(v.score, 100, 'all 7 → 100');

// 6 of 7 checks → round(6/7*100) = round(85.71) = 86
v = validatePasswordStrength('Hk7@Qwprtmnabc');
assertEq(v.score, 86, '6 of 7 → 86');

// All zeros
v = validatePasswordStrength('');
// Empty: length✗, upper✗, lower✗, digit✗, special✗, noSequential✓ (vacuous),
// noRepeating✓ (vacuous) = 2 checks → round(2/7*100) = round(28.57) = 29 → weak
assertEq(v.score, 29, 'empty → score 29 (vacuous noSeq + noRepeat)');
assertEq(v.strength, 'weak', 'empty → weak');

// ============================================================================
// validatePasswordStrength — sequential detection
// ============================================================================
console.log('\n── validatePasswordStrength: sequential detection ────────');

// Various sequential patterns
const seqCases = ['abc', 'BCD', '123', '789', 'mno', 'xyz'];
for (const seq of seqCases) {
  const pw = `Hk7@${seq}rtMvxz`;
  v = validatePasswordStrength(pw);
  assertEq(v.checks.noSequential, false, `"${seq}" detected as sequential`);
}

// Non-sequential
v = validatePasswordStrength('Hk7@QwxrtMvxz');
assertEq(v.checks.noSequential, true, 'no sequential triple');

// ============================================================================
// validatePasswordStrength — repeating detection
// ============================================================================
console.log('\n── validatePasswordStrength: repeating detection ─────────');

// 3 same in a row
v = validatePasswordStrength('Hk7@Qwprtaaa9');
assertEq(v.checks.noRepeating, false, 'aaa detected as repeating');

// 4 same in a row
v = validatePasswordStrength('Hk7@QwprtMMMM');
assertEq(v.checks.noRepeating, false, 'MMMM detected');

// Exactly 2 same is fine
v = validatePasswordStrength('Hk7@Qwprtaa9!');
assertEq(v.checks.noRepeating, true, 'aa (2 only) → ok');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
