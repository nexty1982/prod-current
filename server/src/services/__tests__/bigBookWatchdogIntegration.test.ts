#!/usr/bin/env npx tsx
/**
 * Unit tests for services/bigBookWatchdogIntegration.js (OMD-1041)
 *
 * Covers the pure/analytics methods that don't touch the filesystem:
 *   - getTopEntry
 *   - calculateHealthScore
 *   - generateSummaryAnalytics  (integrates getTopEntry, calculateHealthScore, generateRecommendations)
 *   - generateRecommendations
 *   - detectPatterns
 *   - detectAnomalies
 *   - generateTrendRecommendations
 *
 * fs-dependent methods (storeAlert, createIndex, generateMarkdownReport,
 * updateStatistics, getAlertsByDateRange, generateTrendAnalysis, getStatistics,
 * searchAlerts) are out of scope — they would require mocking fs.promises and
 * are integration tests.
 *
 * The constructor fires `this.initialize()` async which tries to create
 * directories under /mnt/bigbook_secure/... — errors are caught and logged.
 * We stub `../utils/logger` via require.cache to silence that noise.
 *
 * Run from server/: npx tsx src/services/__tests__/bigBookWatchdogIntegration.test.ts
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

// ── Silence logger BEFORE requiring the SUT ───────────────────────────
const loggerPath = require.resolve('../../utils/logger');
require.cache[loggerPath] = {
  id: loggerPath, filename: loggerPath, loaded: true,
  exports: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
} as any;

const BigBookWatchdogIntegration = require('../bigBookWatchdogIntegration');
const instance = new BigBookWatchdogIntegration();

async function main() {

// ============================================================================
// getTopEntry
// ============================================================================
console.log('\n── getTopEntry ───────────────────────────────────────────');

assertEq(instance.getTopEntry(null), null, 'null → null');
assertEq(instance.getTopEntry({}), null, 'empty → null');
assertEq(instance.getTopEntry({ auth: 5 }), { name: 'auth', count: 5 }, 'single entry');
assertEq(
  instance.getTopEntry({ auth: 5, db: 10, cache: 3 }),
  { name: 'db', count: 10 },
  'picks max'
);
assertEq(
  instance.getTopEntry({ a: 1, b: 1 }),
  { name: 'a', count: 1 },
  'ties: insertion order first'
);

// ============================================================================
// calculateHealthScore
// ============================================================================
console.log('\n── calculateHealthScore ──────────────────────────────────');

assertEq(
  instance.calculateHealthScore({ critical: 0, error: 0, warning: 0, info: 0 }),
  100,
  'no events → 100'
);

// All critical → worst case → 0
assertEq(
  instance.calculateHealthScore({ critical: 10, error: 0, warning: 0, info: 0 }),
  0,
  'all critical → 0'
);

// All info → weight 1 of max 10 → 100 - (1/10 * 100) = 90
assertEq(
  instance.calculateHealthScore({ critical: 0, error: 0, warning: 0, info: 10 }),
  90,
  'all info → 90'
);

// All warning → weight 2 of max 10 → 100 - 20 = 80
assertEq(
  instance.calculateHealthScore({ critical: 0, error: 0, warning: 10, info: 0 }),
  80,
  'all warning → 80'
);

// All error → weight 5 of max 10 → 100 - 50 = 50
assertEq(
  instance.calculateHealthScore({ critical: 0, error: 10, warning: 0, info: 0 }),
  50,
  'all error → 50'
);

// Mixed: 1 critical, 1 error, 1 warning, 1 info = 4 events
// weighted = 10+5+2+1 = 18
// max = 4 * 10 = 40
// score = 100 - (18/40 * 100) = 100 - 45 = 55
assertEq(
  instance.calculateHealthScore({ critical: 1, error: 1, warning: 1, info: 1 }),
  55,
  'mixed → 55'
);

// Clamped at 0 (shouldn't happen with valid inputs, but weighted can't exceed max here)
{
  const score = instance.calculateHealthScore({ critical: 100, error: 50, warning: 20, info: 10 });
  assert(score >= 0 && score <= 100, `clamped to 0-100 (got ${score})`);
}

// ============================================================================
// generateRecommendations
// ============================================================================
console.log('\n── generateRecommendations ───────────────────────────────');

// No issues → empty
{
  const recs = instance.generateRecommendations({
    events: { critical: 0, error: 0, warning: 0, info: 0 },
    categories: {},
    services: {},
    topIPs: {},
  });
  assertEq(recs.length, 0, 'clean slate → no recommendations');
}

// Critical issues → high priority
{
  const recs = instance.generateRecommendations({
    events: { critical: 3, error: 0, warning: 0, info: 0 },
    categories: {},
    services: {},
    topIPs: {},
  });
  assertEq(recs.length, 1, 'one recommendation');
  assertEq(recs[0].priority, 'high', 'high priority');
  assertEq(recs[0].type, 'critical_issues', 'type = critical_issues');
  assert(recs[0].message.includes('3'), 'message includes count');
}

// Error volume > 50
{
  const recs = instance.generateRecommendations({
    events: { critical: 0, error: 75, warning: 0, info: 0 },
    categories: {},
    services: {},
    topIPs: {},
  });
  assertEq(recs.length, 1, 'one recommendation');
  assertEq(recs[0].type, 'error_volume', 'type = error_volume');
  assertEq(recs[0].priority, 'medium', 'medium priority');
}

// Error count exactly 50 → NOT triggered (strictly greater than)
{
  const recs = instance.generateRecommendations({
    events: { critical: 0, error: 50, warning: 0, info: 0 },
    categories: {},
    services: {},
    topIPs: {},
  });
  assertEq(recs.length, 0, 'error=50 → no recommendation (strict >)');
}

// Suspicious IPs
{
  const recs = instance.generateRecommendations({
    events: { critical: 0, error: 0, warning: 0, info: 0 },
    categories: {},
    services: {},
    topIPs: { '1.2.3.4': 25, '5.6.7.8': 21, '9.9.9.9': 5 },
  });
  assertEq(recs.length, 1, 'security rec');
  assertEq(recs[0].type, 'security', 'type = security');
  assert(recs[0].message.includes('2'), 'message counts 2 suspicious');
}

// High authentication activity
{
  const recs = instance.generateRecommendations({
    events: { critical: 0, error: 0, warning: 0, info: 0 },
    categories: { authentication: 25 },
    services: {},
    topIPs: {},
  });
  assertEq(recs.length, 1, 'auth rec');
  assertEq(recs[0].type, 'authentication', 'type = authentication');
}

// Top service > 100 events
{
  const recs = instance.generateRecommendations({
    events: { critical: 0, error: 0, warning: 0, info: 0 },
    categories: {},
    services: { 'api-gateway': 150, 'db': 50 },
    topIPs: {},
  });
  assertEq(recs.length, 1, 'service monitoring rec');
  assertEq(recs[0].type, 'service_monitoring', 'type = service_monitoring');
  assertEq(recs[0].priority, 'low', 'low priority');
  assert(recs[0].message.includes('api-gateway'), 'message includes service');
  assert(recs[0].message.includes('150'), 'message includes count');
}

// All triggers → 5 recommendations
{
  const recs = instance.generateRecommendations({
    events: { critical: 5, error: 75, warning: 0, info: 0 },
    categories: { authentication: 30 },
    services: { 'api': 200 },
    topIPs: { '1.2.3.4': 50 },
  });
  assertEq(recs.length, 5, 'all 5 triggers fire');
}

// ============================================================================
// generateSummaryAnalytics (integrates all the above)
// ============================================================================
console.log('\n── generateSummaryAnalytics ──────────────────────────────');

{
  const summary = {
    events: { critical: 2, error: 20, warning: 10, info: 5 },
    categories: { authentication: 10, database: 5 },
    services: { api: 30, worker: 7 },
    topIPs: { '1.2.3.4': 25, '5.5.5.5': 10 },
  };
  const analytics = instance.generateSummaryAnalytics(summary);

  assertEq(analytics.totalEvents, 37, 'total events summed');
  // errorRate = (2+20)/37 * 100 = 59.459... → "59.46"
  assertEq(analytics.errorRate, '59.46', 'errorRate formatted to 2 decimals');
  assertEq(analytics.topCategory, { name: 'authentication', count: 10 }, 'top category');
  assertEq(analytics.topService, { name: 'api', count: 30 }, 'top service');
  assertEq(analytics.suspiciousActivity.highVolumeIPs.length, 1, '1 suspicious IP (>20)');
  assertEq(analytics.suspiciousActivity.highVolumeIPs[0].ip, '1.2.3.4', 'suspicious IP value');
  assertEq(analytics.suspiciousActivity.criticalAlerts, 2, 'critical count');
  assertEq(analytics.suspiciousActivity.errorSpikes, false, 'errorSpikes false (error=20 ≤ 50)');
  assert(typeof analytics.healthScore === 'number', 'healthScore is number');
  assert(Array.isArray(analytics.recommendations), 'recommendations is array');
}

// Zero events → errorRate = 0 (not NaN), all zero safe
{
  const analytics = instance.generateSummaryAnalytics({
    events: { critical: 0, error: 0, warning: 0, info: 0 },
    categories: {},
    services: {},
    topIPs: {},
  });
  assertEq(analytics.totalEvents, 0, '0 total');
  assertEq(analytics.errorRate, 0, 'errorRate 0 (no div-by-zero)');
  assertEq(analytics.topCategory, null, 'null topCategory');
  assertEq(analytics.topService, null, 'null topService');
  assertEq(analytics.healthScore, 100, '100 healthScore');
  assertEq(analytics.recommendations.length, 0, 'no recommendations');
}

// errorSpikes true when error > 50
{
  const analytics = instance.generateSummaryAnalytics({
    events: { critical: 0, error: 60, warning: 0, info: 0 },
    categories: {},
    services: {},
    topIPs: {},
  });
  assertEq(analytics.suspiciousActivity.errorSpikes, true, 'errorSpikes true when error>50');
}

// ============================================================================
// detectPatterns
// ============================================================================
console.log('\n── detectPatterns ────────────────────────────────────────');

{
  const alerts = [
    {
      timestamp: '2026-04-10T09:30:00.000Z',
      category: 'auth',
      details: { service: 'api', ip: '1.1.1.1' },
    },
    {
      timestamp: '2026-04-10T09:45:00.000Z',
      category: 'auth',
      details: { service: 'api', ip: '1.1.1.1' },
    },
    {
      timestamp: '2026-04-10T14:20:00.000Z',
      category: 'db',
      details: { service: 'worker', ip: '2.2.2.2' },
    },
    {
      // alert without details object — should not crash
      timestamp: '2026-04-10T15:00:00.000Z',
      category: 'system',
    },
  ];

  const patterns = instance.detectPatterns(alerts, {});

  // Peak hours: 9 → 2, 14 → 1, 15 → 1 (UTC hours, but getHours is local)
  // Don't assert exact hour keys since Date().getHours() is local — just check totals
  const totalHourCounts = Object.values(patterns.peakHours).reduce((a: number, b: any) => a + b, 0);
  assertEq(totalHourCounts, 4, 'all 4 alerts counted in peakHours');

  assertEq(patterns.categories.auth, 2, 'auth: 2');
  assertEq(patterns.categories.db, 1, 'db: 1');
  assertEq(patterns.categories.system, 1, 'system: 1');

  assertEq(patterns.services.api, 2, 'api: 2');
  assertEq(patterns.services.worker, 1, 'worker: 1');

  assertEq(patterns.ipPatterns['1.1.1.1'], 2, 'IP 1.1.1.1: 2');
  assertEq(patterns.ipPatterns['2.2.2.2'], 1, 'IP 2.2.2.2: 1');
}

// Empty alerts → empty objects (no crash)
{
  const patterns = instance.detectPatterns([], {});
  assertEq(patterns.peakHours, {}, 'empty peakHours');
  assertEq(patterns.categories, {}, 'empty categories');
  assertEq(patterns.services, {}, 'empty services');
  assertEq(patterns.ipPatterns, {}, 'empty ipPatterns');
}

// ============================================================================
// detectAnomalies
// ============================================================================
console.log('\n── detectAnomalies ───────────────────────────────────────');

// Threshold is 2x average
{
  const dailyData = {
    '2026-04-01': { critical: 2, total: 50 },
    '2026-04-02': { critical: 3, total: 60 },
    '2026-04-03': { critical: 15, total: 300 },  // 5x critical avg, 5x total avg → both flagged
    '2026-04-04': { critical: 1, total: 40 },
  };
  const averages = { critical: 2, total: 50 };

  const anomalies = instance.detectAnomalies(dailyData, averages);
  // Day 03: critical 15 > 2*2=4 ✓, total 300 > 50*2=100 ✓
  // Day 02: critical 3, total 60 — neither exceeds 2x
  // But day 01 total=50 NOT > 100; day 04 not > 100
  assertEq(anomalies.length, 2, '2 anomalies on day 03');
  assertEq(anomalies[0].date, '2026-04-03', 'critical spike date');
  assertEq(anomalies[0].type, 'critical_spike', 'critical_spike type');
  assertEq(anomalies[0].severity, 'high', 'critical → high severity');
  assertEq(anomalies[0].value, 15, 'value');
  assertEq(anomalies[0].expected, 2, 'expected');
  assertEq(anomalies[1].type, 'volume_spike', 'volume_spike type');
  assertEq(anomalies[1].severity, 'medium', 'volume → medium severity');
}

// No anomalies
{
  const anomalies = instance.detectAnomalies(
    { '2026-04-01': { critical: 1, total: 10 } },
    { critical: 5, total: 50 }
  );
  assertEq(anomalies.length, 0, 'no anomalies below threshold');
}

// Empty daily data
{
  const anomalies = instance.detectAnomalies({}, { critical: 5, total: 50 });
  assertEq(anomalies.length, 0, 'empty daily data → no anomalies');
}

// ============================================================================
// generateTrendRecommendations
// ============================================================================
console.log('\n── generateTrendRecommendations ──────────────────────────');

// Low averages, no anomalies, no peak → no recs
{
  const recs = instance.generateTrendRecommendations({
    dailyAverages: { critical: 2, total: 10 },
    anomalies: [],
    patterns: { peakHours: {} },
    totalAlerts: 0,
  });
  assertEq(recs.length, 0, 'quiet trends → no recommendations');
}

// High critical average
{
  const recs = instance.generateTrendRecommendations({
    dailyAverages: { critical: 8, total: 20 },
    anomalies: [],
    patterns: { peakHours: {} },
    totalAlerts: 0,
  });
  assertEq(recs.length, 1, 'one rec');
  assertEq(recs[0].type, 'critical_trend', 'critical_trend type');
  assertEq(recs[0].priority, 'high', 'high priority');
  assert(recs[0].message.includes('8.0'), 'message includes formatted average');
}

// Anomalies present
{
  const recs = instance.generateTrendRecommendations({
    dailyAverages: { critical: 0, total: 0 },
    anomalies: [{}, {}, {}],
    patterns: { peakHours: {} },
    totalAlerts: 0,
  });
  assertEq(recs.length, 1, 'anomaly rec');
  assertEq(recs[0].type, 'anomaly_detection', 'type');
  assert(recs[0].message.includes('3'), 'message includes count');
}

// Peak hour concentration: hour 14 has 30 alerts, total 100 → 30 > 20 ✓
{
  const recs = instance.generateTrendRecommendations({
    dailyAverages: { critical: 0, total: 0 },
    anomalies: [],
    patterns: { peakHours: { '9': 5, '14': 30, '20': 10 } },
    totalAlerts: 100,
  });
  assertEq(recs.length, 1, 'peak hour rec');
  assertEq(recs[0].type, 'peak_hours', 'type');
  assertEq(recs[0].priority, 'low', 'low priority');
  assert(recs[0].message.includes('14'), 'message mentions hour 14');
}

// Peak hour NOT concentrated (30/200 = 15% < 20%) → no rec
{
  const recs = instance.generateTrendRecommendations({
    dailyAverages: { critical: 0, total: 0 },
    anomalies: [],
    patterns: { peakHours: { '14': 30 } },
    totalAlerts: 200,
  });
  assertEq(recs.length, 0, 'peak not concentrated → no rec');
}

// All three triggers
{
  const recs = instance.generateTrendRecommendations({
    dailyAverages: { critical: 10, total: 50 },
    anomalies: [{}, {}],
    patterns: { peakHours: { '10': 50 } },
    totalAlerts: 100,
  });
  assertEq(recs.length, 3, 'all 3 trend recs');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
