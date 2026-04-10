#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/formatTimestamp.js (OMD-900)
 *
 * Pure module — wraps dayjs.
 *
 * Coverage:
 *   - formatTimestamp     → 'YYYY-MM-DD HH:mm:ss' or '' for falsy
 *   - formatTimestampUser → 'MMM D, YYYY h:mm A' or '' for falsy
 *   - formatRelativeTime  → dayjs fromNow() or '' for falsy
 *
 * Run: npx tsx server/src/utils/__tests__/formatTimestamp.test.ts
 */

const {
  formatTimestamp,
  formatTimestampUser,
  formatRelativeTime,
} = require('../formatTimestamp');

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
// formatTimestamp — falsy → ''
// ============================================================================
console.log('\n── formatTimestamp: falsy ────────────────────────────────');

assertEq(formatTimestamp(null), '', 'null → ""');
assertEq(formatTimestamp(undefined), '', 'undefined → ""');
assertEq(formatTimestamp(''), '', 'empty string → ""');
assertEq(formatTimestamp(0), '', 'zero → ""');
assertEq(formatTimestamp(false), '', 'false → ""');

// ============================================================================
// formatTimestamp — formatting
// ============================================================================
console.log('\n── formatTimestamp: format ───────────────────────────────');

// Use a fixed Date object so timezone is consistent
const d = new Date(2025, 6, 3, 19, 5, 42); // July 3, 2025 19:05:42 local
const formatted = formatTimestamp(d);
assertEq(formatted, '2025-07-03 19:05:42', 'Date object → YYYY-MM-DD HH:mm:ss');

// Zero-padded month/day/hour/minute/second
const d2 = new Date(2025, 0, 5, 4, 7, 9);
assertEq(formatTimestamp(d2), '2025-01-05 04:07:09', 'zero-padding');

// String input parses
const s = formatTimestamp('2025-07-03T19:05:42');
assert(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s), `string input parses: ${s}`);

// Format regex
assert(
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(formatTimestamp(new Date())),
  'always 19 chars formatted'
);

// ============================================================================
// formatTimestampUser — falsy → ''
// ============================================================================
console.log('\n── formatTimestampUser: falsy ────────────────────────────');

assertEq(formatTimestampUser(null), '', 'null → ""');
assertEq(formatTimestampUser(undefined), '', 'undefined → ""');
assertEq(formatTimestampUser(''), '', 'empty → ""');
assertEq(formatTimestampUser(0), '', 'zero → ""');

// ============================================================================
// formatTimestampUser — formatting
// ============================================================================
console.log('\n── formatTimestampUser: format ───────────────────────────');

// July 3, 2025 19:05 → "Jul 3, 2025 7:05 PM"
const d3 = new Date(2025, 6, 3, 19, 5);
assertEq(formatTimestampUser(d3), 'Jul 3, 2025 7:05 PM', 'PM format');

// AM
const d4 = new Date(2025, 11, 25, 9, 30);
assertEq(formatTimestampUser(d4), 'Dec 25, 2025 9:30 AM', 'AM format');

// Midnight (12 AM)
const d5 = new Date(2025, 0, 1, 0, 0);
assertEq(formatTimestampUser(d5), 'Jan 1, 2025 12:00 AM', 'midnight = 12 AM');

// Noon (12 PM)
const d6 = new Date(2025, 5, 15, 12, 0);
assertEq(formatTimestampUser(d6), 'Jun 15, 2025 12:00 PM', 'noon = 12 PM');

// Day not zero-padded; month is 3-letter abbrev
const d7 = new Date(2025, 1, 5, 3, 7);
assertEq(formatTimestampUser(d7), 'Feb 5, 2025 3:07 AM', 'day not padded');

// ============================================================================
// formatRelativeTime — falsy → ''
// ============================================================================
console.log('\n── formatRelativeTime: falsy ─────────────────────────────');

assertEq(formatRelativeTime(null), '', 'null → ""');
assertEq(formatRelativeTime(undefined), '', 'undefined → ""');
assertEq(formatRelativeTime(''), '', 'empty → ""');
assertEq(formatRelativeTime(0), '', 'zero → ""');

// ============================================================================
// formatRelativeTime — non-empty for valid dates
// ============================================================================
console.log('\n── formatRelativeTime: returns string ────────────────────');

// dayjs fromNow returns strings like "a few seconds ago", "2 hours ago", etc.
// We assert format characteristics rather than exact strings to keep this stable.

const past = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
const pastResult = formatRelativeTime(past);
assertEq(typeof pastResult, 'string', 'past returns string');
assert(pastResult.length > 0, 'past non-empty');
assert(pastResult.includes('ago'), `past contains "ago": ${pastResult}`);

const future = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
const futureResult = formatRelativeTime(future);
assertEq(typeof futureResult, 'string', 'future returns string');
assert(futureResult.length > 0, 'future non-empty');
assert(futureResult.startsWith('in '), `future starts with "in ": ${futureResult}`);

// Day-scale
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
assert(formatRelativeTime(yesterday).includes('day'), 'yesterday mentions day');

// Now-ish
const now = new Date();
const nowResult = formatRelativeTime(now);
assert(nowResult.length > 0, 'now non-empty');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
