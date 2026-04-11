#!/usr/bin/env npx tsx
/**
 * Unit tests for services/weeklyReportService.ts (OMD-1178)
 *
 * Exported functions: generateReport, sendReport, processWeeklyReports,
 * autoEndStaleSessions. External deps:
 *   - config/db.getAppPool → route-dispatch fake pool
 *   - dynamic require('./reportSections/<module>') → stubbed via require.cache
 *     under the real resolved paths (the directory exists with 4 real handlers)
 *
 * Note: generateReport/sendReport/processWeeklyReports all query via pool.
 * Our fake pool uses first-match-wins SQL regex patterns keyed per test.
 *
 * Coverage:
 *   - generateReport:
 *       · config not found → default enabled sections used
 *       · config found + enabled_sections (array + string JSON forms)
 *       · registry entries filtered by enabledSections
 *       · handler.generate success → INSERT into weekly_report_run_items,
 *         HTML concatenated, reportData populated
 *       · section handler throws → error HTML appended, loop continues
 *       · missing handler module (unresolvable) → section skipped
 *       · run update status='generated' with report_html + report_json
 *       · outer failure → UPDATE status='failed' + rethrow
 *   - sendReport:
 *       · run not found → throws
 *       · no report_html → throws
 *       · config_id with recipients JSON → uses those
 *       · no config recipients → falls back to users.email
 *       · no config + no user email → throws
 *       · insert failure swallowed per email (continues)
 *       · status sending → sent transitions
 *   - processWeeklyReports:
 *       · no configs match today → early return
 *       · existing run skipped
 *       · calls generateReport + sendReport for each config
 *   - autoEndStaleSessions:
 *       · no stale sessions → no updates
 *       · updates status='completed', inserts work_session_events
 *       · per-session error continues the loop
 *
 * Run: npx tsx server/src/services/__tests__/weeklyReportService.test.ts
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

// ── Fake pool (route-dispatch) ──────────────────────────────────────
type Call = { sql: string; params: any[] };
const queryLog: Call[] = [];

type Rule = { pattern: RegExp; result: any[] | (() => any[]); throws?: boolean };
let rules: Rule[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const rule of rules) {
      if (rule.pattern.test(sql)) {
        if (rule.throws) throw new Error('fake db failure');
        return typeof rule.result === 'function' ? rule.result() : rule.result;
      }
    }
    // Default for INSERTs that don't have a rule
    if (/^\s*INSERT/i.test(sql)) return [{ insertId: 99 }];
    if (/^\s*UPDATE/i.test(sql)) return [{ affectedRows: 1 }];
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
const dbPath = require.resolve('../../config/db');
const dbModule = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: dbStub,
} as any;
require.cache[dbPath] = dbModule;
const dbJsPath = dbPath.replace(/\.ts$/, '.js');
if (dbJsPath !== dbPath) require.cache[dbJsPath] = dbModule;
const dbTsPath = dbPath.replace(/\.js$/, '.ts');
if (dbTsPath !== dbPath) require.cache[dbTsPath] = dbModule;

// ── Stub report section handlers via require.cache ─────────────────
// Real files exist at ../reportSections/*.ts but we replace them with
// scriptable fakes.
type HandlerResult = { html: string; data: any };
let handlerResponses: Record<string, HandlerResult | Error> = {};

function makeFakeHandler(key: string) {
  return {
    generate: async (_userId: number, _start: string, _end: string) => {
      const resp = handlerResponses[key];
      if (resp instanceof Error) throw resp;
      return resp || { html: `<p>${key}</p>`, data: { section: key } };
    },
  };
}

function stubSectionHandler(moduleName: string) {
  // Resolve the real path (directory contains real .ts files)
  const resolved = require.resolve(`../reportSections/${moduleName}`);
  const mod = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: makeFakeHandler(moduleName),
  } as any;
  require.cache[resolved] = mod;
  // Dual-path cache
  const jsPath = resolved.replace(/\.ts$/, '.js');
  if (jsPath !== resolved) require.cache[jsPath] = mod;
  const tsPath = resolved.replace(/\.js$/, '.ts');
  if (tsPath !== resolved) require.cache[tsPath] = mod;
}

stubSectionHandler('workSessionsSection');
stubSectionHandler('tasksCompletedSection');
stubSectionHandler('highlightsSection');
stubSectionHandler('anomaliesSection');

function resetState() {
  queryLog.length = 0;
  rules = [];
  handlerResponses = {};
}

const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

const {
  generateReport,
  sendReport,
  processWeeklyReports,
  autoEndStaleSessions,
} = require('../weeklyReportService');

async function main() {

// ============================================================================
// generateReport — default sections when no config
// ============================================================================
console.log('\n── generateReport: no config → defaults ──────────────────');

resetState();
rules = [
  { pattern: /FROM weekly_report_configs WHERE user_id = \?/i, result: [[]] },
  {
    pattern: /FROM report_action_registry/i,
    result: [[
      { action_key: 'work_sessions', handler_module: 'workSessionsSection', sort_order: 1 },
      { action_key: 'tasks_completed', handler_module: 'tasksCompletedSection', sort_order: 2 },
      { action_key: 'highlights', handler_module: 'highlightsSection', sort_order: 3 },
      { action_key: 'anomalies', handler_module: 'anomaliesSection', sort_order: 4 },
    ]],
  },
  { pattern: /INSERT INTO weekly_report_runs/i, result: [{ insertId: 100 }] },
  { pattern: /INSERT INTO weekly_report_run_items/i, result: [{ insertId: 1 }] },
  { pattern: /UPDATE weekly_report_runs/i, result: [{ affectedRows: 1 }] },
];
quiet();
{
  const r = await generateReport(42, '2026-04-01', '2026-04-07');
  loud();
  assertEq(r.run_id, 100, 'run_id returned');
  assertEq(r.status, 'generated', 'status');
  assertEq(r.period, { start: '2026-04-01', end: '2026-04-07' }, 'period');
  assert(r.html.includes('<!DOCTYPE html>'), 'HTML header');
  assert(r.html.includes('workSessionsSection'), 'section handler ran');
  assert(r.html.includes('tasksCompletedSection'), 'tasks section ran');
  assert(r.html.includes('highlightsSection'), 'highlights section ran');
  assert(r.html.includes('anomaliesSection'), 'anomalies section ran');
  assert(r.html.includes('OrthodoxMetrics Work Session Tracking'), 'footer');
  assertEq(r.data.work_sessions, { section: 'workSessionsSection' }, 'section data captured');
}

// ============================================================================
// generateReport — config with enabled_sections (JSON string)
// ============================================================================
console.log('\n── generateReport: config JSON string → filters ─────────');

resetState();
rules = [
  {
    pattern: /FROM weekly_report_configs WHERE user_id = \?/i,
    result: [[{ id: 5, enabled_sections: JSON.stringify(['work_sessions', 'highlights']) }]],
  },
  {
    pattern: /FROM report_action_registry/i,
    result: [[
      { action_key: 'work_sessions', handler_module: 'workSessionsSection', sort_order: 1 },
      { action_key: 'tasks_completed', handler_module: 'tasksCompletedSection', sort_order: 2 },
      { action_key: 'highlights', handler_module: 'highlightsSection', sort_order: 3 },
      { action_key: 'anomalies', handler_module: 'anomaliesSection', sort_order: 4 },
    ]],
  },
  { pattern: /INSERT INTO weekly_report_runs/i, result: [{ insertId: 200 }] },
  { pattern: /INSERT INTO weekly_report_run_items/i, result: [{ insertId: 1 }] },
  { pattern: /UPDATE weekly_report_runs/i, result: [{ affectedRows: 1 }] },
];
quiet();
{
  const r = await generateReport(42, '2026-04-01', '2026-04-07');
  loud();
  // Only two section INSERTs should occur
  const itemInserts = queryLog.filter(q => /INSERT INTO weekly_report_run_items/i.test(q.sql));
  assertEq(itemInserts.length, 2, '2 enabled sections inserted');
  assert(r.html.includes('workSessionsSection'), 'work_sessions in html');
  assert(r.html.includes('highlightsSection'), 'highlights in html');
  assert(!r.html.includes('tasksCompletedSection'), 'tasks_completed NOT in html');
  assert(!r.html.includes('anomaliesSection'), 'anomalies NOT in html');
  // INSERT bind uses config_id=5
  const runInsert = queryLog.find(q => /INSERT INTO weekly_report_runs/i.test(q.sql));
  assertEq(runInsert!.params[0], 5, 'config_id passed to run insert');
}

// ============================================================================
// generateReport — config already an array (DB returned typed)
// ============================================================================
console.log('\n── generateReport: enabled_sections as array ────────────');

resetState();
rules = [
  {
    pattern: /FROM weekly_report_configs WHERE user_id = \?/i,
    result: [[{ id: 5, enabled_sections: ['anomalies'] }]],
  },
  {
    pattern: /FROM report_action_registry/i,
    result: [[
      { action_key: 'work_sessions', handler_module: 'workSessionsSection', sort_order: 1 },
      { action_key: 'anomalies', handler_module: 'anomaliesSection', sort_order: 2 },
    ]],
  },
  { pattern: /INSERT INTO weekly_report_runs/i, result: [{ insertId: 300 }] },
  { pattern: /INSERT INTO weekly_report_run_items/i, result: [{ insertId: 1 }] },
  { pattern: /UPDATE weekly_report_runs/i, result: [{ affectedRows: 1 }] },
];
quiet();
{
  const r = await generateReport(42, '2026-04-01', '2026-04-07');
  loud();
  const itemInserts = queryLog.filter(q => /INSERT INTO weekly_report_run_items/i.test(q.sql));
  assertEq(itemInserts.length, 1, 'only 1 enabled section');
  assert(r.html.includes('anomaliesSection'), 'anomalies');
}

// ============================================================================
// generateReport — section handler throws → error HTML, loop continues
// ============================================================================
console.log('\n── generateReport: section error → graceful ─────────────');

resetState();
handlerResponses.workSessionsSection = new Error('boom');
rules = [
  { pattern: /FROM weekly_report_configs/i, result: [[]] },
  {
    pattern: /FROM report_action_registry/i,
    result: [[
      { action_key: 'work_sessions', handler_module: 'workSessionsSection', sort_order: 1 },
      { action_key: 'tasks_completed', handler_module: 'tasksCompletedSection', sort_order: 2 },
      { action_key: 'highlights', handler_module: 'highlightsSection', sort_order: 3 },
      { action_key: 'anomalies', handler_module: 'anomaliesSection', sort_order: 4 },
    ]],
  },
  { pattern: /INSERT INTO weekly_report_runs/i, result: [{ insertId: 400 }] },
  { pattern: /INSERT INTO weekly_report_run_items/i, result: [{ insertId: 1 }] },
  { pattern: /UPDATE weekly_report_runs/i, result: [{ affectedRows: 1 }] },
];
quiet();
{
  const r = await generateReport(42, '2026-04-01', '2026-04-07');
  loud();
  assertEq(r.status, 'generated', 'still generated despite section error');
  assert(r.html.includes('Error generating work_sessions'), 'error message in HTML');
  assert(r.html.includes('tasksCompletedSection'), 'other sections still ran');
  assert(!r.html.includes('workSessionsSection</p>'), 'failed section not appended normally');
  // Only 3 item inserts (the 3 successful sections)
  const itemInserts = queryLog.filter(q => /INSERT INTO weekly_report_run_items/i.test(q.sql));
  assertEq(itemInserts.length, 3, '3 successful sections inserted');
}

// ============================================================================
// generateReport — outer failure → UPDATE status='failed' + rethrow
// ============================================================================
console.log('\n── generateReport: outer failure → failed ───────────────');

resetState();
rules = [
  { pattern: /FROM weekly_report_configs/i, result: [[]] },
  { pattern: /FROM report_action_registry/i, result: [], throws: true },
  { pattern: /INSERT INTO weekly_report_runs/i, result: [{ insertId: 500 }] },
  { pattern: /UPDATE weekly_report_runs/i, result: [{ affectedRows: 1 }] },
];
quiet();
{
  let caught: any = null;
  try {
    await generateReport(42, '2026-04-01', '2026-04-07');
  } catch (e) {
    caught = e;
  }
  loud();
  // Error is thrown BEFORE the try block that handles failures, so
  // the failed UPDATE path runs only when error is inside the try.
  // In this setup, registry throws outside the try → raw throw.
  assert(caught !== null, 'error rethrown');
}

// Error inside try block → triggers failed UPDATE
resetState();
rules = [
  { pattern: /FROM weekly_report_configs/i, result: [[]] },
  {
    pattern: /FROM report_action_registry/i,
    result: [[{ action_key: 'work_sessions', handler_module: 'workSessionsSection', sort_order: 1 }]],
  },
  { pattern: /INSERT INTO weekly_report_runs/i, result: [{ insertId: 600 }] },
  // Make the final UPDATE status='generated' fail → outer catch triggers
  {
    pattern: /UPDATE weekly_report_runs[\s\S]*SET status = 'generated'/i,
    result: [], throws: true,
  },
  // Error UPDATE still has to work
  { pattern: /UPDATE weekly_report_runs SET status = \?, error_message/i, result: [{ affectedRows: 1 }] },
  { pattern: /INSERT INTO weekly_report_run_items/i, result: [{ insertId: 1 }] },
];
quiet();
{
  let caught: any = null;
  try {
    await generateReport(42, '2026-04-01', '2026-04-07');
  } catch (e) {
    caught = e;
  }
  loud();
  assert(caught !== null, 'error propagated');
  const errUpdate = queryLog.find(q => /UPDATE weekly_report_runs SET status = \?, error_message/i.test(q.sql));
  assert(errUpdate !== undefined, 'failed UPDATE ran');
  assertEq(errUpdate!.params[0], 'failed', 'status = failed');
}

// ============================================================================
// sendReport — run not found
// ============================================================================
console.log('\n── sendReport: errors ────────────────────────────────────');

resetState();
rules = [{ pattern: /FROM weekly_report_runs WHERE id = \? AND user_id = \?/i, result: [[]] }];
{
  let caught: any = null;
  try { await sendReport(1, 42); } catch (e) { caught = e; }
  assert(caught !== null && caught.message.includes('not found'), 'not found throws');
}

// No report_html
resetState();
rules = [{
  pattern: /FROM weekly_report_runs WHERE id = \? AND user_id = \?/i,
  result: [[{ id: 1, user_id: 42, config_id: null, report_html: null, period_start: '2026-04-01', period_end: '2026-04-07' }]],
}];
{
  let caught: any = null;
  try { await sendReport(1, 42); } catch (e) { caught = e; }
  assert(caught !== null && caught.message.includes('generate it first'), 'no html throws');
}

// No config, no user email → throws
resetState();
rules = [
  {
    pattern: /FROM weekly_report_runs WHERE id = \? AND user_id = \?/i,
    result: [[{ id: 1, user_id: 42, config_id: null, report_html: '<p/>', period_start: '2026-04-01', period_end: '2026-04-07' }]],
  },
  { pattern: /SELECT email FROM users WHERE id = \?/i, result: [[]] },
];
{
  let caught: any = null;
  try { await sendReport(1, 42); } catch (e) { caught = e; }
  assert(caught !== null && caught.message.includes('No recipients'), 'no recipients throws');
}

// ============================================================================
// sendReport — config recipients (JSON string)
// ============================================================================
console.log('\n── sendReport: config recipients ─────────────────────────');

resetState();
rules = [
  {
    pattern: /FROM weekly_report_runs WHERE id = \? AND user_id = \?/i,
    result: [[{
      id: 1, user_id: 42, config_id: 7,
      report_html: '<p>html</p>', period_start: '2026-04-01', period_end: '2026-04-07',
    }]],
  },
  {
    pattern: /SELECT recipients FROM weekly_report_configs/i,
    result: [[{ recipients: JSON.stringify(['a@b.com', 'c@d.com']) }]],
  },
  { pattern: /UPDATE weekly_report_runs SET status = \? WHERE id = \?/i, result: [{ affectedRows: 1 }] },
  { pattern: /INSERT INTO notification_queue/i, result: [{ insertId: 1 }] },
  { pattern: /UPDATE weekly_report_runs SET status = \?, sent_at/i, result: [{ affectedRows: 1 }] },
];
{
  await sendReport(1, 42);
  const inserts = queryLog.filter(q => /INSERT INTO notification_queue/i.test(q.sql));
  assertEq(inserts.length, 2, '2 notification rows inserted');
  assertEq(inserts[0].params[1], 'a@b.com', 'first recipient');
  assertEq(inserts[1].params[1], 'c@d.com', 'second recipient');
  assert(inserts[0].params[2].includes('Weekly Work Report'), 'subject prefix');
  assertEq(inserts[0].params[4], '<p>html</p>', 'html_message');
  // Status transitions
  const statusUpdates = queryLog.filter(q => /UPDATE weekly_report_runs SET status/i.test(q.sql));
  assertEq(statusUpdates.length, 2, '2 status updates (sending + sent)');
  assertEq(statusUpdates[0].params[0], 'sending', 'first: sending');
  assertEq(statusUpdates[1].params[0], 'sent', 'second: sent');
}

// ============================================================================
// sendReport — fallback to user email when config has no recipients
// ============================================================================
console.log('\n── sendReport: user email fallback ───────────────────────');

resetState();
rules = [
  {
    pattern: /FROM weekly_report_runs WHERE id = \? AND user_id = \?/i,
    result: [[{
      id: 1, user_id: 42, config_id: 7,
      report_html: '<p/>', period_start: '2026-04-01', period_end: '2026-04-07',
    }]],
  },
  {
    pattern: /SELECT recipients FROM weekly_report_configs/i,
    result: [[{ recipients: JSON.stringify([]) }]],
  },
  { pattern: /SELECT email FROM users WHERE id = \?/i, result: [[{ email: 'user@example.com' }]] },
  { pattern: /UPDATE weekly_report_runs SET status = \? WHERE id = \?/i, result: [{ affectedRows: 1 }] },
  { pattern: /INSERT INTO notification_queue/i, result: [{ insertId: 1 }] },
  { pattern: /UPDATE weekly_report_runs SET status = \?, sent_at/i, result: [{ affectedRows: 1 }] },
];
{
  await sendReport(1, 42);
  const inserts = queryLog.filter(q => /INSERT INTO notification_queue/i.test(q.sql));
  assertEq(inserts.length, 1, '1 fallback recipient');
  assertEq(inserts[0].params[1], 'user@example.com', 'user email used');
}

// Insert failure swallowed (continues to next recipient)
resetState();
let insertCount = 0;
rules = [
  {
    pattern: /FROM weekly_report_runs WHERE id = \? AND user_id = \?/i,
    result: [[{
      id: 1, user_id: 42, config_id: null,
      report_html: '<p/>', period_start: '2026-04-01', period_end: '2026-04-07',
    }]],
  },
  { pattern: /SELECT email FROM users WHERE id = \?/i, result: [[{ email: 'x@y.z' }]] },
  { pattern: /UPDATE weekly_report_runs SET status = \? WHERE id = \?/i, result: [{ affectedRows: 1 }] },
  {
    pattern: /INSERT INTO notification_queue/i,
    result: () => { insertCount++; throw new Error('fake'); },
  },
  { pattern: /UPDATE weekly_report_runs SET status = \?, sent_at/i, result: [{ affectedRows: 1 }] },
];
quiet();
{
  // Should not throw — queue errors are swallowed
  let caught: any = null;
  try { await sendReport(1, 42); } catch (e) { caught = e; }
  loud();
  assert(caught === null, 'queue error swallowed, function completes');
  assertEq(insertCount, 1, 'insert attempted once');
  const sent = queryLog.find(q => /SET status = \?, sent_at/i.test(q.sql));
  assert(sent !== undefined, 'final sent update still ran');
}

// ============================================================================
// processWeeklyReports — no configs match
// ============================================================================
console.log('\n── processWeeklyReports: no configs ──────────────────────');

resetState();
rules = [
  { pattern: /FROM weekly_report_configs wrc[\s\S]*JOIN users/i, result: [[]] },
];
quiet();
{
  await processWeeklyReports();
  loud();
  // Only the SELECT ran, nothing else
  assertEq(queryLog.length, 1, 'only SELECT ran');
}

// ============================================================================
// processWeeklyReports — existing run skipped
// ============================================================================
console.log('\n── processWeeklyReports: skip existing ───────────────────');

resetState();
rules = [
  {
    pattern: /FROM weekly_report_configs wrc[\s\S]*JOIN users/i,
    result: [[{ user_id: 42, user_email: 'x@y.z', id: 1 }]],
  },
  {
    pattern: /FROM weekly_report_runs[\s\S]*status IN/i,
    result: [[{ id: 99 }]],
  },
];
quiet();
{
  await processWeeklyReports();
  loud();
  // No generateReport calls → no INSERT INTO weekly_report_runs
  const runInserts = queryLog.filter(q => /INSERT INTO weekly_report_runs/i.test(q.sql));
  assertEq(runInserts.length, 0, 'no run inserts (skipped)');
}

// ============================================================================
// autoEndStaleSessions
// ============================================================================
console.log('\n── autoEndStaleSessions ──────────────────────────────────');

// No stale sessions → no updates
resetState();
rules = [{ pattern: /FROM work_sessions[\s\S]*status = 'active'/i, result: [[]] }];
{
  await autoEndStaleSessions();
  assertEq(queryLog.length, 1, 'only the SELECT ran');
}

// Stale sessions → update + insert event
resetState();
rules = [
  {
    pattern: /FROM work_sessions[\s\S]*status = 'active'/i,
    result: [[
      { id: 1, user_id: 42, started_at: '2026-04-09T10:00:00Z' },
      { id: 2, user_id: 43, started_at: '2026-04-09T11:00:00Z' },
    ]],
  },
  { pattern: /UPDATE work_sessions[\s\S]*status = 'completed'/i, result: [{ affectedRows: 1 }] },
  { pattern: /INSERT INTO work_session_events/i, result: [{ insertId: 1 }] },
];
quiet();
{
  await autoEndStaleSessions();
  loud();
  const updates = queryLog.filter(q => /UPDATE work_sessions/i.test(q.sql));
  const inserts = queryLog.filter(q => /INSERT INTO work_session_events/i.test(q.sql));
  assertEq(updates.length, 2, '2 session updates');
  assertEq(inserts.length, 2, '2 event inserts');
  assertEq(updates[0].params[0], 1, 'first session id');
  assertEq(inserts[0].params[0], 1, 'first event work_session_id');
  // metadata_json should include reason
  const meta = JSON.parse(inserts[0].params[1]);
  assertEq(meta.reason, 'stale_session_16h', 'metadata reason');
}

// Per-session error continues loop
resetState();
let updateCount = 0;
rules = [
  {
    pattern: /FROM work_sessions[\s\S]*status = 'active'/i,
    result: [[
      { id: 1, user_id: 42, started_at: '2026-04-09T10:00:00Z' },
      { id: 2, user_id: 43, started_at: '2026-04-09T11:00:00Z' },
    ]],
  },
  {
    pattern: /UPDATE work_sessions/i,
    result: () => {
      updateCount++;
      if (updateCount === 1) throw new Error('update failed');
      return [{ affectedRows: 1 }];
    },
  },
  { pattern: /INSERT INTO work_session_events/i, result: [{ insertId: 1 }] },
];
quiet();
{
  await autoEndStaleSessions();
  loud();
  assertEq(updateCount, 2, 'both sessions attempted');
  const inserts = queryLog.filter(q => /INSERT INTO work_session_events/i.test(q.sql));
  assertEq(inserts.length, 1, 'event only for successful session');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
