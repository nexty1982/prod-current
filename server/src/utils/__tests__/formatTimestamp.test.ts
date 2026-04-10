#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/formatTimestamp.js (OMD-893)
 *
 * Tiny pure helpers wrapping dayjs.
 *
 * Run: npx tsx server/src/utils/__tests__/formatTimestamp.test.ts
 */

const { formatTimestamp, formatTimestampUser, formatRelativeTime } = require('../formatTimestamp');

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
// formatTimestamp
// ============================================================================
console.log('\n── formatTimestamp ───────────────────────────────────────');

// Falsy inputs return ''
assertEq(formatTimestamp(null), '', 'null → empty string');
assertEq(formatTimestamp(undefined), '', 'undefined → empty string');
assertEq(formatTimestamp(''), '', 'empty string → empty string');
assertEq(formatTimestamp(0), '', 'zero → empty string');

// Date object
const d = new Date('2025-09-15T12:34:56Z');
const formatted = formatTimestamp(d);
assert(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(formatted), 'date → YYYY-MM-DD HH:mm:ss');

// String input
const fromStr = formatTimestamp('2025-09-15T12:34:56Z');
assert(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(fromStr), 'iso string → YYYY-MM-DD HH:mm:ss');

// Specific date check (year extracted)
assert(formatTimestamp('2025-01-01T00:00:00Z').startsWith('20'), 'starts with century');
assert(formatTimestamp('2025-09-15T12:00:00Z').includes('2025'), 'contains year');

// ============================================================================
// formatTimestampUser
// ============================================================================
console.log('\n── formatTimestampUser ───────────────────────────────────');

assertEq(formatTimestampUser(null), '', 'null → empty');
assertEq(formatTimestampUser(undefined), '', 'undefined → empty');
assertEq(formatTimestampUser(''), '', 'empty → empty');

const userFmt = formatTimestampUser(new Date('2025-09-15T12:00:00Z'));
// Format: 'MMM D, YYYY h:mm A' — e.g. "Sep 15, 2025 12:00 PM"
assert(/^[A-Z][a-z]{2} \d{1,2}, \d{4} \d{1,2}:\d{2} [AP]M$/.test(userFmt), `user format pattern (got "${userFmt}")`);
assert(userFmt.includes('2025'), 'user format includes year');

// ============================================================================
// formatRelativeTime
// ============================================================================
console.log('\n── formatRelativeTime ────────────────────────────────────');

assertEq(formatRelativeTime(null), '', 'null → empty');
assertEq(formatRelativeTime(undefined), '', 'undefined → empty');
assertEq(formatRelativeTime(''), '', 'empty → empty');

// "a few seconds ago" or similar for now
const justNow = formatRelativeTime(new Date());
assert(justNow.length > 0, 'now produces non-empty string');
assert(justNow.includes('ago') || justNow.includes('seconds') || justNow.includes('second'), `now is recent (got "${justNow}")`);

// Past date
const longAgo = formatRelativeTime(new Date('2020-01-01'));
assert(longAgo.includes('ago') || longAgo.includes('year'), `2020 is "ago" or "year" (got "${longAgo}")`);

// Future date — dayjs returns "in X" form
const future = formatRelativeTime(new Date(Date.now() + 86400_000 * 365));
assert(future.includes('in') || future.includes('year'), `future is "in" or "year" (got "${future}")`);

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
