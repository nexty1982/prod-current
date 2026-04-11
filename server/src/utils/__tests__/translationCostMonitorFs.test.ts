#!/usr/bin/env npx tsx
/**
 * Unit tests for translationCostMonitor.js fs-dependent methods (OMD-953)
 *
 * The pure calculateCost helper is already covered by translationCostMonitor.test.ts
 * (OMD-896). This file fills the gap by testing the methods that read and
 * write the JSON cost log on disk: logCost, checkLimits, getUsageStats.
 *
 * Strategy: stub fs.promises via Object.defineProperty with an in-memory
 * Map BEFORE requiring the SUT.
 *
 * Coverage:
 *   - logCost        creates log, appends entries, 1000-entry cap,
 *                    swallows write errors (returns null)
 *   - checkLimits    no-log baseline; within-limits; daily limit exceeded;
 *                    monthly limit exceeded; read error → fail-safe allow
 *   - getUsageStats  empty baseline; totals; daily/monthly; 30-day rolling;
 *                    limits field
 *   - constructor    env-var limits + defaults
 *
 * Run from server/: npx tsx src/utils/__tests__/translationCostMonitorFs.test.ts
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

function assertNear(actual: number, expected: number, tol: number, message: string): void {
  if (Math.abs(actual - expected) <= tol) {
    console.log(`  PASS: ${message}`); passed++;
  } else {
    console.error(`  FAIL: ${message}\n         expected: ~${expected} (±${tol})\n         actual:   ${actual}`);
    failed++;
  }
}

// ── fs.promises stub (install BEFORE requiring SUT) ──────────────────
const memFs = new Map<string, string>();
let forceReadError = false;
let forceWriteError = false;

function resetFs() {
  memFs.clear();
  forceReadError = false;
  forceWriteError = false;
}

const fsPromisesStub = {
  readFile: async (p: string, _enc?: any) => {
    if (forceReadError) throw new Error('read failed');
    if (!memFs.has(p)) {
      const e: any = new Error(`ENOENT: ${p}`);
      e.code = 'ENOENT';
      throw e;
    }
    return memFs.get(p)!;
  },
  writeFile: async (p: string, data: string, _enc?: any) => {
    if (forceWriteError) throw new Error('write failed');
    memFs.set(p, data);
  },
};

const fs = require('fs');
Object.defineProperty(fs, 'promises', {
  value: fsPromisesStub,
  configurable: true,
  writable: true,
});

const TranslationCostMonitor = require('../translationCostMonitor');

// Silence module's own console output
const origError = console.error;
function quiet() { console.error = () => {}; }
function loud() { console.error = origError; }

async function main() {

const monitor = new TranslationCostMonitor();

// ============================================================================
// logCost
// ============================================================================
console.log('\n── logCost ───────────────────────────────────────────────');

resetFs();
{
  const entry = await monitor.logCost('job-1', 1_000_000, 10, 'en', 'el');
  assert(entry !== null, 'returns entry object');
  assertEq(entry.jobId, 'job-1', 'jobId');
  assertEq(entry.characterCount, 1_000_000, 'characterCount');
  assertEq(entry.cost, 10, 'cost');
  assertEq(entry.sourceLanguage, 'en', 'sourceLanguage');
  assertEq(entry.targetLanguage, 'el', 'targetLanguage');
  assert(typeof entry.timestamp === 'string', 'timestamp string');
  assert(/^\d{4}-\d{2}-\d{2}T/.test(entry.timestamp), 'timestamp ISO');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(entry.date), 'date YYYY-MM-DD');
  // File should now exist with 1 entry
  assertEq(memFs.size, 1, 'log file created');
  const stored = JSON.parse(Array.from(memFs.values())[0]);
  assertEq(stored.length, 1, '1 entry in file');
  assertEq(stored[0].jobId, 'job-1', 'entry persisted');
}

// Subsequent call appends
{
  const entry = await monitor.logCost('job-2', 500_000, 5, 'en', 'ru');
  assert(entry !== null, 'second entry returned');
  const stored = JSON.parse(Array.from(memFs.values())[0]);
  assertEq(stored.length, 2, '2 entries');
  assertEq(stored[0].jobId, 'job-1', 'first entry still there');
  assertEq(stored[1].jobId, 'job-2', 'second entry appended (order preserved)');
}

// 1000-entry cap
resetFs();
{
  // Seed file with 1000 entries
  await monitor.logCost('seed-init', 100, 0, 'en', 'el');
  const filePath = Array.from(memFs.keys())[0];
  const seeded = Array.from({ length: 1000 }, (_, i) => ({
    timestamp: '2026-01-01T00:00:00.000Z',
    jobId: `seed-${i}`,
    characterCount: 100,
    cost: 0,
    sourceLanguage: 'en',
    targetLanguage: 'el',
    date: '2026-01-01',
  }));
  memFs.set(filePath, JSON.stringify(seeded));

  await monitor.logCost('overflow', 100, 0, 'en', 'el');
  const stored = JSON.parse(memFs.get(filePath)!);
  // slice(-1000) keeps the last 1000 after push
  assertEq(stored.length, 1000, 'capped at 1000');
  assertEq(stored[stored.length - 1].jobId, 'overflow', 'newest kept (at end)');
  assertEq(stored[0].jobId, 'seed-1', 'seed-0 dropped, seed-1 now oldest');
}

// Error swallowing (write fails)
resetFs();
forceWriteError = true;
quiet();
{
  const entry = await monitor.logCost('fail', 100, 0, 'en', 'el');
  loud();
  assertEq(entry, null, 'returns null on write failure');
}
forceWriteError = false;

// ============================================================================
// checkLimits
// ============================================================================
console.log('\n── checkLimits ───────────────────────────────────────────');

// No log exists → allowed (baseline)
resetFs();
{
  const r = await monitor.checkLimits(1_000_000);
  assertEq(r.allowed, true, 'no log → allowed');
  assertEq(r.reason, 'No previous usage', 'reason: No previous usage');
}

// Within limits — small proposed + small existing
resetFs();
{
  const today = new Date().toISOString().split('T')[0];
  await monitor.logCost('seed-init', 100, 0, 'en', 'el');
  const filePath = Array.from(memFs.keys())[0];
  // Overwrite with a single $0.50 entry for today
  memFs.set(filePath, JSON.stringify([
    { timestamp: new Date().toISOString(), jobId: 'x', characterCount: 1000, cost: 0.5, sourceLanguage: 'en', targetLanguage: 'el', date: today },
  ]));
  // Propose 10_000 chars (all free tier → $0 cost). Under both limits.
  const r = await monitor.checkLimits(10_000);
  assertEq(r.allowed, true, 'within limits');
  assertEq(r.reason, 'Within limits', 'reason: Within limits');
  assertEq(r.usage.daily, 0.5, 'daily usage');
  assertEq(r.usage.monthly, 0.5, 'monthly usage');
  assertEq(r.proposedCost, 0, 'proposed cost = 0 (free tier)');
}

// Monthly limit exceeded (but daily NOT exceeded — daily is checked first)
resetFs();
{
  await monitor.logCost('seed-init', 100, 0, 'en', 'el');
  const filePath = Array.from(memFs.keys())[0];
  // Build a timestamp from earlier this month so it counts toward monthly
  // but not today's daily total. Use day 1 of the current month.
  const now = new Date();
  const earlierThisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0);
  const earlierIso = earlierThisMonth.toISOString();
  const earlierDate = earlierIso.split('T')[0];
  // Monthly already at $9.99, today's daily is $0.
  memFs.set(filePath, JSON.stringify([
    { timestamp: earlierIso, jobId: 'x', characterCount: 1000, cost: 9.99, sourceLanguage: 'en', targetLanguage: 'el', date: earlierDate },
  ]));
  // Propose 501_000 chars → 1_000 chargeable → $0.02.
  // Daily: 0 + 0.02 = 0.02 ≤ $2 (OK). Monthly: 9.99 + 0.02 > $10 (FAIL).
  const r = await monitor.checkLimits(501_000);
  assertEq(r.allowed, false, 'monthly limit exceeded');
  assert(r.reason.includes('Monthly limit'), 'reason mentions Monthly limit');
  assert(r.reason.includes('$10'), 'reason includes $10 limit');
}

// Daily limit exceeded but monthly OK
resetFs();
{
  const today = new Date().toISOString().split('T')[0];
  await monitor.logCost('seed-init', 100, 0, 'en', 'el');
  const filePath = Array.from(memFs.keys())[0];
  // Daily already $1.90; propose $0.20 → total $2.10 > $2 daily limit
  memFs.set(filePath, JSON.stringify([
    { timestamp: new Date().toISOString(), jobId: 'x', characterCount: 1000, cost: 1.90, sourceLanguage: 'en', targetLanguage: 'el', date: today },
  ]));
  // 510_000 chars → 10_000 chargeable → $0.20
  const r = await monitor.checkLimits(510_000);
  assertEq(r.allowed, false, 'daily limit exceeded');
  assert(r.reason.includes('Daily limit'), 'reason mentions Daily limit');
  assertEq(r.usage.daily, 1.9, 'daily usage in response');
}

// Read error → caught by inner try, treated as no-existing-log, returns allowed
// (The outer catch only fires for errors AFTER the read, e.g. malformed entries
// that crash the reduce. Read errors specifically are swallowed by the inner
// try/catch.)
resetFs();
await monitor.logCost('seed-init', 100, 0, 'en', 'el');
forceReadError = true;
quiet();
{
  const r = await monitor.checkLimits(1000);
  loud();
  assertEq(r.allowed, true, 'read error → allowed via inner catch');
  assertEq(r.reason, 'No previous usage', 'read error treated as no log');
}
forceReadError = false;

// Outer catch fail-safe: corrupt entries (entry.timestamp not a string) →
// .startsWith throws → outer catch fires
resetFs();
await monitor.logCost('seed-init', 100, 0, 'en', 'el');
{
  const filePath = Array.from(memFs.keys())[0];
  // entry.timestamp is null → .startsWith() throws TypeError → outer catch
  memFs.set(filePath, JSON.stringify([
    { timestamp: null, jobId: 'bad', characterCount: 100, cost: 0.1, sourceLanguage: 'en', targetLanguage: 'el', date: '2026-04-10' },
  ]));
  quiet();
  const r = await monitor.checkLimits(1000);
  loud();
  assertEq(r.allowed, true, 'fail-safe allow on internal error');
  assertEq(r.reason, 'Limit check failed, allowing', 'fail-safe reason');
}

// ============================================================================
// getUsageStats
// ============================================================================
console.log('\n── getUsageStats ─────────────────────────────────────────');

// Empty log (ENOENT) → empty baseline
resetFs();
{
  const stats = await monitor.getUsageStats();
  assertEq(stats.totalCost, 0, 'totalCost 0');
  assertEq(stats.totalCharacters, 0, 'totalCharacters 0');
  assertEq(stats.totalTranslations, 0, 'totalTranslations 0');
  assertEq(stats.dailyCost, 0, 'dailyCost 0');
  assertEq(stats.monthlyCost, 0, 'monthlyCost 0');
  assertEq(stats.lastMonth, [], 'lastMonth []');
}

// Populated log
resetFs();
{
  const today = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();
  await monitor.logCost('seed-init', 100, 0, 'en', 'el');
  const filePath = Array.from(memFs.keys())[0];
  memFs.set(filePath, JSON.stringify([
    { timestamp: nowIso, jobId: 'j1', characterCount: 1000, cost: 0.1, sourceLanguage: 'en', targetLanguage: 'el', date: today },
    { timestamp: nowIso, jobId: 'j2', characterCount: 2000, cost: 0.2, sourceLanguage: 'en', targetLanguage: 'ru', date: today },
    // Far-past entry: not in this month or today
    { timestamp: '2025-01-15T00:00:00.000Z', jobId: 'old', characterCount: 5000, cost: 0.5, sourceLanguage: 'en', targetLanguage: 'el', date: '2025-01-15' },
  ]));

  const stats = await monitor.getUsageStats();
  assertNear(stats.totalCost, 0.8, 1e-9, 'totalCost 0.8');
  assertEq(stats.totalCharacters, 8000, 'totalCharacters 8000');
  assertEq(stats.totalTranslations, 3, '3 translations');
  assertNear(stats.dailyCost, 0.3, 1e-9, 'dailyCost 0.3');
  assertNear(stats.monthlyCost, 0.3, 1e-9, 'monthlyCost 0.3 (old excluded)');
  assertEq(stats.limits.daily, 2, 'daily limit default');
  assertEq(stats.limits.monthly, 10, 'monthly limit default');
  assertEq(stats.lastMonth.length, 30, 'lastMonth: 30 days rolling');

  // Today's entry
  const todayEntry = stats.lastMonth.find((d: any) => d.date === today);
  assert(todayEntry !== undefined, 'today in lastMonth');
  assertNear(todayEntry.cost, 0.3, 1e-9, 'today cost 0.3');
  assertEq(todayEntry.translations, 2, 'today: 2 translations');

  // Every entry in lastMonth has shape {date, cost, translations}
  for (const d of stats.lastMonth) {
    assert(typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date), 'lastMonth date format');
    assert(typeof d.cost === 'number', 'lastMonth cost is number');
    assert(typeof d.translations === 'number', 'lastMonth translations is number');
  }

  // Days without entries have zero values
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split('T')[0];
  const yEntry = stats.lastMonth.find((d: any) => d.date === yesterday);
  if (yEntry) {
    assertEq(yEntry.cost, 0, 'yesterday cost 0');
    assertEq(yEntry.translations, 0, 'yesterday translations 0');
  }
}

// ============================================================================
// Constructor — env-var limits
// ============================================================================
console.log('\n── constructor env vars ──────────────────────────────────');

{
  const original = {
    monthly: process.env.MONTHLY_TRANSLATION_LIMIT,
    daily: process.env.DAILY_TRANSLATION_LIMIT,
  };
  process.env.MONTHLY_TRANSLATION_LIMIT = '25.5';
  process.env.DAILY_TRANSLATION_LIMIT = '3.75';
  const m = new TranslationCostMonitor();
  assertEq(m.monthlyLimit, 25.5, 'monthlyLimit from env');
  assertEq(m.dailyLimit, 3.75, 'dailyLimit from env');
  // Restore
  if (original.monthly === undefined) delete process.env.MONTHLY_TRANSLATION_LIMIT;
  else process.env.MONTHLY_TRANSLATION_LIMIT = original.monthly;
  if (original.daily === undefined) delete process.env.DAILY_TRANSLATION_LIMIT;
  else process.env.DAILY_TRANSLATION_LIMIT = original.daily;
}

// Default limits (no env)
{
  delete process.env.MONTHLY_TRANSLATION_LIMIT;
  delete process.env.DAILY_TRANSLATION_LIMIT;
  const m = new TranslationCostMonitor();
  assertEq(m.monthlyLimit, 10, 'monthly default $10');
  assertEq(m.dailyLimit, 2, 'daily default $2');
}

// costLogFile path is inside the utils dir
{
  const m = new TranslationCostMonitor();
  assert(typeof m.costLogFile === 'string', 'costLogFile is string');
  assert(m.costLogFile.endsWith('translation-costs.json'), 'costLogFile name');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
