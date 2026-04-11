#!/usr/bin/env npx tsx
/**
 * Unit tests for services/bigBookWatchdogIntegration.js (OMD-1133)
 *
 * Covers BigBookWatchdogIntegration: directory init, index file creation,
 * alert/summary storage, markdown report generation, statistics tracking,
 * date-range queries, trend analysis (patterns + anomalies), and search.
 *
 * Strategy:
 *   - Monkey-patch fs.promises with a virtual filesystem (Map)
 *   - Stub logger via require.cache
 *   - Async freshSvc() that awaits the constructor's initialize() promise
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

function assertNear(actual: number, expected: number, tol: number, message: string): void {
  if (Math.abs(actual - expected) <= tol) {
    console.log(`  PASS: ${message}`); passed++;
  } else {
    console.error(`  FAIL: ${message}\n         expected: ~${expected} (±${tol})\n         actual:   ${actual}`);
    failed++;
  }
}

// ── Logger stub ──────────────────────────────────────────────────────
const loggerPath = require.resolve('../../utils/logger');
require.cache[loggerPath] = {
  id: loggerPath,
  filename: loggerPath,
  loaded: true,
  exports: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
} as any;

// ── Virtual filesystem ───────────────────────────────────────────────
type Entry = { type: 'file' | 'dir'; content?: string };
const vfs = new Map<string, Entry>();

function vfsReset(): void { vfs.clear(); }
function vfsAddDir(p: string): void { vfs.set(p, { type: 'dir' }); }
function vfsAddFile(p: string, content: string): void {
  const parts = p.split('/').filter(Boolean);
  let acc = '';
  for (let i = 0; i < parts.length - 1; i++) {
    acc += '/' + parts[i];
    if (!vfs.has(acc)) vfs.set(acc, { type: 'dir' });
  }
  vfs.set(p, { type: 'file', content });
}
function enoent(p: string): Error {
  const e: any = new Error(`ENOENT: ${p}`);
  e.code = 'ENOENT';
  return e;
}

const fsRaw = require('fs');
const origPromises = { ...fsRaw.promises };

fsRaw.promises.readdir = async (dir: string, _opts?: any): Promise<any> => {
  const entry = vfs.get(dir);
  if (!entry) throw enoent(dir);
  if (entry.type !== 'dir') throw enoent(dir);
  const names = new Set<string>();
  const dirPrefix = dir.endsWith('/') ? dir : dir + '/';
  for (const key of vfs.keys()) {
    if (key.startsWith(dirPrefix)) {
      const rest = key.slice(dirPrefix.length);
      const first = rest.split('/')[0];
      if (first) names.add(first);
    }
  }
  return Array.from(names);
};

fsRaw.promises.readFile = async (p: string, _enc?: any): Promise<string> => {
  const entry = vfs.get(p);
  if (!entry) throw enoent(p);
  if (entry.type !== 'file') throw enoent(p);
  return entry.content ?? '';
};

fsRaw.promises.mkdir = async (p: string, _opts?: any): Promise<void> => {
  const parts = p.split('/').filter(Boolean);
  let acc = '';
  for (const part of parts) {
    acc += '/' + part;
    if (!vfs.has(acc)) vfs.set(acc, { type: 'dir' });
  }
};

fsRaw.promises.writeFile = async (p: string, content: string): Promise<void> => {
  vfsAddFile(p, content);
};

// ── Require SUT ───────────────────────────────────────────────────────
const BigBookWatchdogIntegration = require('../bigBookWatchdogIntegration');

const BB_BASE = '/mnt/bigbook_secure/System_Logs/Watchdog';
const INDEX_PATH = `${BB_BASE}/index.json`;

async function drainInit(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setImmediate(r));
  }
}

async function freshSvc(): Promise<any> {
  vfsReset();
  const s = new BigBookWatchdogIntegration();
  await drainInit();
  return s;
}

async function main() {

// ============================================================================
// initialize: ensureDirectoryStructure + createIndex
// ============================================================================
console.log('\n── initialize ────────────────────────────────────────');

{
  const s = await freshSvc();
  assert(vfs.has(BB_BASE), 'base dir created');
  assert(vfs.has(`${BB_BASE}/alerts`), 'alerts dir');
  assert(vfs.has(`${BB_BASE}/daily_summaries`), 'summaries dir');
  assert(vfs.has(`${BB_BASE}/trends`), 'trends dir');
  assert(vfs.has(INDEX_PATH), 'index.json created');
  const idx = JSON.parse(vfs.get(INDEX_PATH)!.content!);
  assertEq(idx.statistics.totalAlerts, 0, 'fresh totalAlerts=0');
  assertEq(idx.statistics.totalSummaries, 0, 'fresh totalSummaries=0');
  assert(/Watchdog/.test(idx.description), 'description present');
}

// Existing index preserved
{
  vfsReset();
  vfsAddDir(BB_BASE);
  vfsAddFile(
    INDEX_PATH,
    JSON.stringify({
      created: '2025-01-01T00:00:00Z',
      statistics: { totalAlerts: 99, totalSummaries: 5, dateRange: { earliest: '2025-01-01', latest: '2026-01-01' } },
    })
  );
  const s = new BigBookWatchdogIntegration();
  await drainInit();
  const idx = JSON.parse(vfs.get(INDEX_PATH)!.content!);
  assertEq(idx.statistics.totalAlerts, 99, 'preserved totalAlerts');
  assertEq(idx.statistics.totalSummaries, 5, 'preserved totalSummaries');
  assert(idx.lastUpdated !== undefined, 'lastUpdated set');
}

// ============================================================================
// Pure helpers: getTopEntry
// ============================================================================
console.log('\n── getTopEntry ───────────────────────────────────────');

{
  const s = await freshSvc();
  assertEq(s.getTopEntry({}), null, 'empty → null');
  assertEq(s.getTopEntry(null), null, 'null → null');
  assertEq(s.getTopEntry({ a: 1, b: 5, c: 3 }), { name: 'b', count: 5 }, 'picks max');
  assertEq(s.getTopEntry({ only: 7 }), { name: 'only', count: 7 }, 'single entry');
}

// ============================================================================
// calculateHealthScore
// ============================================================================
console.log('\n── calculateHealthScore ──────────────────────────────');

{
  const s = await freshSvc();
  assertEq(s.calculateHealthScore({ critical: 0, error: 0, warning: 0, info: 0 }), 100, 'no events → 100');
  // All critical → weighted = count*10, max = count*10 → 0
  assertEq(s.calculateHealthScore({ critical: 10, error: 0, warning: 0, info: 0 }), 0, 'all critical → 0');
  // All info → weighted = count*1, max = count*10 → 100 - 10 = 90
  assertEq(s.calculateHealthScore({ critical: 0, error: 0, warning: 0, info: 10 }), 90, 'all info → 90');
  // Mixed
  const mixed = s.calculateHealthScore({ critical: 1, error: 1, warning: 1, info: 1 });
  assert(mixed >= 0 && mixed <= 100, 'mixed in range');
}

// ============================================================================
// generateRecommendations
// ============================================================================
console.log('\n── generateRecommendations ───────────────────────────');

{
  const s = await freshSvc();
  // No issues → empty
  const none = s.generateRecommendations({
    events: { critical: 0, error: 0, warning: 0, info: 0 },
    categories: {}, services: {}, topIPs: {},
  });
  assertEq(none.length, 0, 'no events → no recs');

  // Critical events → high priority rec
  const critical = s.generateRecommendations({
    events: { critical: 3, error: 0, warning: 0, info: 0 },
    categories: {}, services: {}, topIPs: {},
  });
  assert(critical.length >= 1, 'critical events → rec');
  assertEq(critical[0].priority, 'high', 'critical is high priority');
  assertEq(critical[0].type, 'critical_issues', 'type=critical_issues');
  assert(critical[0].message.includes('3'), 'count in message');

  // High error volume
  const errors = s.generateRecommendations({
    events: { critical: 0, error: 100, warning: 0, info: 0 },
    categories: {}, services: {}, topIPs: {},
  });
  const errorRec = errors.find((r: any) => r.type === 'error_volume');
  assert(errorRec !== undefined, 'error volume rec');
  assertEq(errorRec.priority, 'medium', 'medium priority');

  // Suspicious IPs
  const ips = s.generateRecommendations({
    events: { critical: 0, error: 0, warning: 0, info: 0 },
    categories: {}, services: {}, topIPs: { '1.2.3.4': 50, '5.6.7.8': 25 },
  });
  const secRec = ips.find((r: any) => r.type === 'security');
  assert(secRec !== undefined, 'security rec');
  assert(/2/.test(secRec.message), 'count of 2 ips');

  // Authentication spike
  const auth = s.generateRecommendations({
    events: { critical: 0, error: 0, warning: 0, info: 0 },
    categories: { authentication: 50 }, services: {}, topIPs: {},
  });
  const authRec = auth.find((r: any) => r.type === 'authentication');
  assert(authRec !== undefined, 'auth rec');

  // Top service > 100 events
  const svc_recs = s.generateRecommendations({
    events: { critical: 0, error: 0, warning: 0, info: 0 },
    categories: {}, services: { nginx: 150 }, topIPs: {},
  });
  const svcRec = svc_recs.find((r: any) => r.type === 'service_monitoring');
  assert(svcRec !== undefined, 'service rec');
  assert(svcRec.message.includes('nginx'), 'includes service name');
}

// ============================================================================
// generateSummaryAnalytics
// ============================================================================
console.log('\n── generateSummaryAnalytics ──────────────────────────');

{
  const s = await freshSvc();
  const summary = {
    events: { critical: 2, error: 8, warning: 15, info: 25 },
    categories: { authentication: 10, network: 5 },
    services: { nginx: 30, redis: 5 },
    topIPs: { '1.2.3.4': 25 },
  };
  const a = s.generateSummaryAnalytics(summary);
  assertEq(a.totalEvents, 50, 'totalEvents=50');
  assertEq(a.errorRate, '20.00', 'errorRate=(2+8)/50');
  assertEq(a.topCategory.name, 'authentication', 'topCategory');
  assertEq(a.topService.name, 'nginx', 'topService');
  assertEq(a.suspiciousActivity.highVolumeIPs.length, 1, '1 high-volume IP');
  assertEq(a.suspiciousActivity.criticalAlerts, 2, 'critical count');
  assertEq(a.suspiciousActivity.errorSpikes, false, 'error < 50 → no spike');
  assert(typeof a.healthScore === 'number', 'healthScore number');
  assert(Array.isArray(a.recommendations), 'recommendations array');

  // Error spike detection
  const spike = s.generateSummaryAnalytics({
    events: { critical: 0, error: 60, warning: 0, info: 0 },
    categories: {}, services: {}, topIPs: {},
  });
  assertEq(spike.suspiciousActivity.errorSpikes, true, 'error > 50 → spike');

  // Zero events → errorRate=0 (short-circuit)
  const zero = s.generateSummaryAnalytics({
    events: { critical: 0, error: 0, warning: 0, info: 0 },
    categories: {}, services: {}, topIPs: {},
  });
  assertEq(zero.totalEvents, 0, 'zero total');
  assertEq(zero.errorRate, 0, 'zero errorRate');
}

// ============================================================================
// storeAlert
// ============================================================================
console.log('\n── storeAlert ────────────────────────────────────────');

{
  const s = await freshSvc();
  const alert = {
    id: 'alert-123',
    timestamp: '2026-04-11T10:00:00.000Z',
    severity: 'critical',
    category: 'authentication',
    details: { service: 'nginx' },
  };
  await s.storeAlert(alert);

  const alertFile = `${BB_BASE}/alerts/2026-04-11/alert-123.json`;
  assert(vfs.has(alertFile), 'alert file written');
  const stored = JSON.parse(vfs.get(alertFile)!.content!);
  assertEq(stored.id, 'alert-123', 'id');
  assertEq(stored.bigBookMetadata.category, 'watchdog_alert', 'category');
  assertEq(stored.bigBookMetadata.severity, 'critical', 'severity');
  assert(stored.bigBookMetadata.tags.includes('authentication'), 'tag category');
  assert(stored.bigBookMetadata.tags.includes('critical'), 'tag severity');
  assert(stored.bigBookMetadata.tags.includes('nginx'), 'tag service');
  assert(stored.storedAt !== undefined, 'storedAt set');

  // Statistics updated
  const idx = JSON.parse(vfs.get(INDEX_PATH)!.content!);
  assertEq(idx.statistics.totalAlerts, 1, 'totalAlerts incremented');
}

// Alert without service details
{
  const s = await freshSvc();
  await s.storeAlert({
    id: 'alert-simple',
    timestamp: '2026-04-11T10:00:00.000Z',
    severity: 'warning',
    category: 'system',
  });
  const f = `${BB_BASE}/alerts/2026-04-11/alert-simple.json`;
  const stored = JSON.parse(vfs.get(f)!.content!);
  assertEq(stored.bigBookMetadata.tags.length, 2, 'only category+severity tags');
}

// ============================================================================
// storeDailySummary + generateMarkdownReport
// ============================================================================
console.log('\n── storeDailySummary ─────────────────────────────────');

{
  const s = await freshSvc();
  const summary = {
    date: '2026-04-11',
    events: { critical: 0, error: 5, warning: 10, info: 20 },
    categories: { auth: 10, db: 5 },
    services: { nginx: 25 },
    topIPs: { '1.2.3.4': 15 },
    narrative: 'Quiet day overall.',
  };
  await s.storeDailySummary(summary);

  const jsonFile = `${BB_BASE}/daily_summaries/2026-04-11.json`;
  const mdFile = `${BB_BASE}/daily_summaries/2026-04-11.md`;
  assert(vfs.has(jsonFile), 'json summary written');
  assert(vfs.has(mdFile), 'markdown report generated');

  const stored = JSON.parse(vfs.get(jsonFile)!.content!);
  assertEq(stored.date, '2026-04-11', 'date');
  assertEq(stored.bigBookMetadata.category, 'watchdog_summary', 'category');
  assert(stored.analytics !== undefined, 'analytics populated');
  assertEq(stored.analytics.totalEvents, 35, 'analytics totalEvents');

  const md = vfs.get(mdFile)!.content!;
  assert(md.includes('# OMAI Watchdog Daily Report - 2026-04-11'), 'markdown title');
  assert(md.includes('Health Score'), 'health score section');
  assert(/Error\s*\|\s*5/.test(md), 'error count in table');
  assert(md.includes('Quiet day overall'), 'narrative included');

  const idx = JSON.parse(vfs.get(INDEX_PATH)!.content!);
  assertEq(idx.statistics.totalSummaries, 1, 'totalSummaries incremented');
}

// ============================================================================
// updateStatistics
// ============================================================================
console.log('\n── updateStatistics ──────────────────────────────────');

{
  const s = await freshSvc();
  await s.updateStatistics('alert', { timestamp: '2026-04-10T10:00:00Z' });
  await s.updateStatistics('alert', { timestamp: '2026-04-11T10:00:00Z' });
  await s.updateStatistics('summary', { timestamp: '2026-04-09T10:00:00Z' });

  const idx = JSON.parse(vfs.get(INDEX_PATH)!.content!);
  assertEq(idx.statistics.totalAlerts, 2, 'totalAlerts=2');
  assertEq(idx.statistics.totalSummaries, 1, 'totalSummaries=1');
  assertEq(idx.statistics.dateRange.earliest, '2026-04-09T10:00:00Z', 'earliest');
  assertEq(idx.statistics.dateRange.latest, '2026-04-11T10:00:00Z', 'latest');
}

// ============================================================================
// getAlertsByDateRange
// ============================================================================
console.log('\n── getAlertsByDateRange ──────────────────────────────');

{
  const s = await freshSvc();
  // Store alerts on 3 different days
  await s.storeAlert({ id: 'a1', timestamp: '2026-04-09T10:00:00.000Z', severity: 'error', category: 'x' });
  await s.storeAlert({ id: 'a2', timestamp: '2026-04-10T10:00:00.000Z', severity: 'warning', category: 'x' });
  await s.storeAlert({ id: 'a3', timestamp: '2026-04-11T10:00:00.000Z', severity: 'critical', category: 'x' });

  const all = await s.getAlertsByDateRange('2026-04-09', '2026-04-11');
  assertEq(all.length, 3, '3 alerts in range');
  // Sorted descending by timestamp
  assertEq(all[0].id, 'a3', 'newest first');
  assertEq(all[2].id, 'a1', 'oldest last');

  const partial = await s.getAlertsByDateRange('2026-04-10', '2026-04-11');
  assertEq(partial.length, 2, '2 alerts in narrower range');

  const empty = await s.getAlertsByDateRange('2026-01-01', '2026-01-05');
  assertEq(empty.length, 0, 'empty range');
}

// ============================================================================
// detectPatterns
// ============================================================================
console.log('\n── detectPatterns ────────────────────────────────────');

{
  const s = await freshSvc();
  // Use local-time timestamps (no Z) so getHours() is deterministic
  const alerts = [
    { timestamp: '2026-04-11T10:00:00', category: 'auth', details: { service: 'nginx', ip: '1.1.1.1' } },
    { timestamp: '2026-04-11T10:30:00', category: 'auth', details: { service: 'nginx' } },
    { timestamp: '2026-04-11T14:00:00', category: 'db', details: { ip: '2.2.2.2' } },
  ];
  const patterns = s.detectPatterns(alerts, {});
  assertEq(patterns.categories.auth, 2, '2 auth');
  assertEq(patterns.categories.db, 1, '1 db');
  assertEq(patterns.services.nginx, 2, '2 nginx');
  assertEq(patterns.ipPatterns['1.1.1.1'], 1, '1.1.1.1 count');
  assertEq(patterns.ipPatterns['2.2.2.2'], 1, '2.2.2.2 count');
  assertEq(patterns.peakHours[10], 2, 'hour 10 has 2');
  assertEq(patterns.peakHours[14], 1, 'hour 14 has 1');
}

// ============================================================================
// detectAnomalies
// ============================================================================
console.log('\n── detectAnomalies ───────────────────────────────────');

{
  const s = await freshSvc();
  const dailyData = {
    '2026-04-01': { critical: 1, error: 5, warning: 10, info: 20, total: 36 },
    '2026-04-02': { critical: 1, error: 5, warning: 10, info: 20, total: 36 },
    '2026-04-03': { critical: 10, error: 5, warning: 10, info: 20, total: 45 }, // critical spike
    '2026-04-04': { critical: 1, error: 5, warning: 10, info: 200, total: 216 }, // volume spike
  };
  const averages = { critical: 3.25, error: 5, warning: 10, info: 65, total: 83.25 };
  const anomalies = s.detectAnomalies(dailyData, averages);
  const critSpikes = anomalies.filter((a: any) => a.type === 'critical_spike');
  const volSpikes = anomalies.filter((a: any) => a.type === 'volume_spike');
  assert(critSpikes.length >= 1, 'critical spike detected');
  assert(volSpikes.length >= 1, 'volume spike detected');
  assertEq(critSpikes[0].date, '2026-04-03', 'critical spike date');
  assertEq(volSpikes[0].date, '2026-04-04', 'volume spike date');
}

// ============================================================================
// generateTrendRecommendations
// ============================================================================
console.log('\n── generateTrendRecommendations ──────────────────────');

{
  const s = await freshSvc();
  // High critical average
  const highCrit = s.generateTrendRecommendations({
    dailyAverages: { critical: 8, error: 1, warning: 1, info: 1, total: 11 },
    anomalies: [],
    totalAlerts: 100,
    patterns: { peakHours: {} },
  });
  assert(highCrit.some((r: any) => r.type === 'critical_trend'), 'critical trend rec');

  // Anomalies present
  const withAnom = s.generateTrendRecommendations({
    dailyAverages: { critical: 1, error: 1, warning: 1, info: 1, total: 4 },
    anomalies: [{ date: 'x', type: 'critical_spike', value: 10, expected: 1, severity: 'high' }],
    totalAlerts: 100,
    patterns: { peakHours: {} },
  });
  assert(withAnom.some((r: any) => r.type === 'anomaly_detection'), 'anomaly rec');

  // Peak hour > 20% of total
  const peak = s.generateTrendRecommendations({
    dailyAverages: { critical: 0, error: 0, warning: 0, info: 0, total: 0 },
    anomalies: [],
    totalAlerts: 100,
    patterns: { peakHours: { 14: 30 } },
  });
  assert(peak.some((r: any) => r.type === 'peak_hours'), 'peak hour rec');

  // No recs when everything quiet
  const quiet = s.generateTrendRecommendations({
    dailyAverages: { critical: 1, error: 1, warning: 1, info: 1, total: 4 },
    anomalies: [],
    totalAlerts: 100,
    patterns: { peakHours: { 14: 5 } },
  });
  assertEq(quiet.length, 0, 'no recs when quiet');
}

// ============================================================================
// generateTrendAnalysis (fs-backed)
// ============================================================================
console.log('\n── generateTrendAnalysis ─────────────────────────────');

{
  const s = await freshSvc();
  // Seed alerts across several days
  await s.storeAlert({ id: 'ta1', timestamp: '2026-04-09T10:00:00.000Z', severity: 'critical', category: 'auth' });
  await s.storeAlert({ id: 'ta2', timestamp: '2026-04-10T10:00:00.000Z', severity: 'error', category: 'db' });
  await s.storeAlert({ id: 'ta3', timestamp: '2026-04-11T10:00:00.000Z', severity: 'warning', category: 'auth' });

  // generateTrendAnalysis uses "now" as end date — we seeded dates close to 2026-04-11
  // so a 30-day window covers them.
  const trends = await s.generateTrendAnalysis(30);
  assert(trends !== null, 'trends returned');
  assertEq(trends.totalAlerts, 3, '3 total');
  assert(trends.dailyAverages !== undefined, 'dailyAverages');
  assert(trends.patterns !== undefined, 'patterns');
  assert(Array.isArray(trends.anomalies), 'anomalies array');
  assert(Array.isArray(trends.recommendations), 'recommendations array');

  // File written to trends dir
  const trendFiles = Array.from(vfs.keys()).filter((k) => k.startsWith(`${BB_BASE}/trends/trend_30d_`));
  assert(trendFiles.length === 1, 'trend file written');
}

// ============================================================================
// getStatistics
// ============================================================================
console.log('\n── getStatistics ─────────────────────────────────────');

{
  const s = await freshSvc();
  await s.storeAlert({ id: 'gs1', timestamp: '2026-04-11T10:00:00.000Z', severity: 'error', category: 'x' });
  const stats = await s.getStatistics();
  assertEq(stats.totalAlerts, 1, 'totalAlerts=1');
}

// Missing index → null
{
  vfsReset();
  const s = new BigBookWatchdogIntegration();
  await drainInit();
  // Delete index
  vfs.delete(INDEX_PATH);
  const stats = await s.getStatistics();
  assertEq(stats, null, 'missing index → null');
}

// ============================================================================
// searchAlerts
// ============================================================================
console.log('\n── searchAlerts ──────────────────────────────────────');

{
  const s = await freshSvc();
  // Use dates close to "today" so default 7-day window catches them.
  // We'll seed with explicit dateFrom to be deterministic.
  await s.storeAlert({ id: 'sa1', timestamp: '2026-04-09T10:00:00.000Z', severity: 'critical', category: 'auth' });
  await s.storeAlert({ id: 'sa2', timestamp: '2026-04-10T10:00:00.000Z', severity: 'error', category: 'db' });
  await s.storeAlert({ id: 'sa3', timestamp: '2026-04-11T10:00:00.000Z', severity: 'critical', category: 'auth' });

  const allCrit = await s.searchAlerts({ severity: 'critical', dateFrom: '2026-04-09', dateTo: '2026-04-11' });
  assertEq(allCrit.length, 2, '2 critical');
  assert(allCrit.every((a: any) => a.severity === 'critical'), 'filter by severity');

  const auth = await s.searchAlerts({ category: 'auth', dateFrom: '2026-04-09', dateTo: '2026-04-11' });
  assertEq(auth.length, 2, '2 auth');

  const critAndAuth = await s.searchAlerts({
    severity: 'critical',
    category: 'auth',
    dateFrom: '2026-04-09',
    dateTo: '2026-04-11',
  });
  assertEq(critAndAuth.length, 2, 'critical+auth');

  const limited = await s.searchAlerts({
    dateFrom: '2026-04-09',
    dateTo: '2026-04-11',
    limit: 1,
  });
  assertEq(limited.length, 1, 'limit=1');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);

// Restore fs.promises
fsRaw.promises.readdir = origPromises.readdir;
fsRaw.promises.readFile = origPromises.readFile;
fsRaw.promises.mkdir = origPromises.mkdir;
fsRaw.promises.writeFile = origPromises.writeFile;

process.exit(failed > 0 ? 1 : 0);
} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
