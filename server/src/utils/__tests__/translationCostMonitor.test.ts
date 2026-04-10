#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/translationCostMonitor.js calculateCost (OMD-896)
 *
 * Tests the pure calculateCost method of TranslationCostMonitor.
 * The fs-dependent methods (logCost, checkLimits, getUsageStats) are out
 * of scope — they read/write a JSON file and would require fs mocking.
 *
 * Pricing model under test:
 *   - Google Cloud Translation API
 *   - First 500,000 characters per month: free
 *   - Beyond free tier: $20 per million characters
 *
 * Run: npx tsx server/src/utils/__tests__/translationCostMonitor.test.ts
 */

const TranslationCostMonitor = require('../translationCostMonitor');

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

function assertNear(actual: number, expected: number, tol: number, message: string): void {
  if (Math.abs(actual - expected) <= tol) {
    console.log(`  PASS: ${message}`); passed++;
  } else {
    console.error(`  FAIL: ${message}\n         expected: ~${expected} (±${tol})\n         actual:   ${actual}`);
    failed++;
  }
}

const monitor = new TranslationCostMonitor();

// ============================================================================
// calculateCost — within free tier
// ============================================================================
console.log('\n── calculateCost: within free tier ───────────────────────');

const zero = monitor.calculateCost(0);
assertEq(zero.totalCharacters, 0, 'zero: totalCharacters=0');
assertEq(zero.freeCharacters, 0, 'zero: freeCharacters=0');
assertEq(zero.chargeableCharacters, 0, 'zero: chargeableCharacters=0');
assertEq(zero.cost, 0, 'zero: cost=0');
assertEq(zero.formattedCost, '$0.0000', 'zero: formattedCost');

const small = monitor.calculateCost(1000);
assertEq(small.totalCharacters, 1000, '1k: totalCharacters');
assertEq(small.freeCharacters, 1000, '1k: all free');
assertEq(small.chargeableCharacters, 0, '1k: 0 chargeable');
assertEq(small.cost, 0, '1k: cost=0');

const halfFree = monitor.calculateCost(250000);
assertEq(halfFree.freeCharacters, 250000, '250k: all free');
assertEq(halfFree.chargeableCharacters, 0, '250k: 0 chargeable');
assertEq(halfFree.cost, 0, '250k: cost=0');

// Exactly at the free tier boundary
const exactFree = monitor.calculateCost(500000);
assertEq(exactFree.totalCharacters, 500000, 'exact: total=500k');
assertEq(exactFree.freeCharacters, 500000, 'exact: 500k free');
assertEq(exactFree.chargeableCharacters, 0, 'exact: 0 chargeable');
assertEq(exactFree.cost, 0, 'exact: cost=0');

// ============================================================================
// calculateCost — beyond free tier
// ============================================================================
console.log('\n── calculateCost: beyond free tier ───────────────────────');

// Just past free tier
const justPast = monitor.calculateCost(500001);
assertEq(justPast.totalCharacters, 500001, 'just past: total');
assertEq(justPast.freeCharacters, 500000, 'just past: 500k free (capped)');
assertEq(justPast.chargeableCharacters, 1, 'just past: 1 chargeable');
assertNear(justPast.cost, 0.00002, 0.000001, 'just past: 1 char × $20/M');

// 1 million chars: 500k free + 500k chargeable = $10
const oneMillion = monitor.calculateCost(1000000);
assertEq(oneMillion.totalCharacters, 1000000, '1M: total');
assertEq(oneMillion.freeCharacters, 500000, '1M: 500k free');
assertEq(oneMillion.chargeableCharacters, 500000, '1M: 500k chargeable');
assertNear(oneMillion.cost, 10, 0.0001, '1M: $10');
assertEq(oneMillion.formattedCost, '$10.0000', '1M: formatted');

// 1.5 million: 500k free + 1M chargeable = $20
const oneAndHalf = monitor.calculateCost(1500000);
assertEq(oneAndHalf.chargeableCharacters, 1000000, '1.5M: 1M chargeable');
assertNear(oneAndHalf.cost, 20, 0.0001, '1.5M: $20');

// 5.5 million: 500k free + 5M chargeable = $100
const fiveAndHalf = monitor.calculateCost(5500000);
assertEq(fiveAndHalf.chargeableCharacters, 5000000, '5.5M: 5M chargeable');
assertNear(fiveAndHalf.cost, 100, 0.0001, '5.5M: $100');

// Very large: 100M chars
const huge = monitor.calculateCost(100_000_000);
assertEq(huge.chargeableCharacters, 99_500_000, '100M: 99.5M chargeable');
assertNear(huge.cost, 1990, 0.001, '100M: ~$1990');

// ============================================================================
// calculateCost — formattedCost format
// ============================================================================
console.log('\n── calculateCost: formattedCost format ───────────────────');

assert(/^\$\d+\.\d{4}$/.test(monitor.calculateCost(0).formattedCost), 'zero: $X.XXXX');
assert(/^\$\d+\.\d{4}$/.test(monitor.calculateCost(1000000).formattedCost), '1M: $X.XXXX');
assert(/^\$\d+\.\d{4}$/.test(monitor.calculateCost(99999999).formattedCost), 'huge: $X.XXXX');

// Verify exact decimal places (4)
assertEq(monitor.calculateCost(750000).formattedCost, '$5.0000', '750k: $5.0000');
assertEq(monitor.calculateCost(550000).formattedCost, '$1.0000', '550k: $1.0000');

// ============================================================================
// constructor: limits from env or defaults
// ============================================================================
console.log('\n── constructor: limits ───────────────────────────────────');

// Default limits when env vars unset
delete process.env.MONTHLY_TRANSLATION_LIMIT;
delete process.env.DAILY_TRANSLATION_LIMIT;
const defaultMon = new TranslationCostMonitor();
assertEq(defaultMon.monthlyLimit, 10.0, 'default monthly limit $10');
assertEq(defaultMon.dailyLimit, 2.0, 'default daily limit $2');

// Env-overridden
process.env.MONTHLY_TRANSLATION_LIMIT = '50';
process.env.DAILY_TRANSLATION_LIMIT = '5';
const envMon = new TranslationCostMonitor();
assertEq(envMon.monthlyLimit, 50, 'env monthly limit $50');
assertEq(envMon.dailyLimit, 5, 'env daily limit $5');

// Cleanup
delete process.env.MONTHLY_TRANSLATION_LIMIT;
delete process.env.DAILY_TRANSLATION_LIMIT;

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
