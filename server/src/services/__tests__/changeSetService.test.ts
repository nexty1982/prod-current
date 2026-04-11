#!/usr/bin/env npx tsx
/**
 * Unit tests for services/changeSetService.js (OMD-1198)
 *
 * Singleton instance export. Stubs three deps via require.cache / core-module
 * patching BEFORE the SUT is required:
 *   - ../config/db-compat → fake pool + fake connection (regex-dispatch)
 *   - ./omDailyItemHydrator → fetchByIds + hydrateRows
 *   - child_process → execSync (core module patched in-place before require)
 *
 * Coverage:
 *   - generateCode (via create → CS-NNNN zero-padding)
 *   - canTransition (via transition error path)
 *   - create: happy path, git_branch conflict, migration_files JSON,
 *             has_db_changes coercion
 *   - getById / getByCode: hydration, not-found
 *   - list: defaults, filters (single/array status, change_type, priority),
 *           pagination, count
 *   - update: status lockouts, allowed-field filtering, git_branch conflict
 *   - transition: invalid, ready_for_staging (branch+items validation),
 *                 staged (slot check + required metadata),
 *                 approved (review_notes for db changes, commit-sha lock),
 *                 rejected (reason + clears staging),
 *                 promoted (SHA drift + snapshot + non-fatal snapshot failure),
 *                 active from rejected clears rejection
 *   - addItem: locked, not found, already-in-other-CS, duplicate, happy
 *   - removeItem: locked, not-in-CS, happy
 *   - getChangeSetForItem / getChangeSetMemberships: empty, happy, null
 *   - getEvents / addNote
 *   - fastForward: locked, no branch, partial metadata, happy (snapshot+event)
 *   - getReleaseHistory
 *
 * Run: npx tsx server/src/services/__tests__/changeSetService.test.ts
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

// ── Fake pool + connection ──────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];
const txLog: string[] = [];
let releaseCount = 0;

type Responder = { match: RegExp; respond: (params: any[], sql: string) => any };
let responders: Responder[] = [];

function addResponder(match: RegExp, respond: (params: any[], sql: string) => any) {
  responders.push({ match, respond });
}

async function runQuery(sql: string, params: any[] = []): Promise<[any]> {
  queryLog.push({ sql, params });
  for (const r of responders) {
    if (r.match.test(sql)) {
      const result = r.respond(params, sql);
      return [result] as [any];
    }
  }
  return [[]] as [any];
}

const fakeConnection = {
  beginTransaction: async () => { txLog.push('begin'); },
  commit: async () => { txLog.push('commit'); },
  rollback: async () => { txLog.push('rollback'); },
  release: () => { releaseCount++; },
  query: runQuery,
};

const fakePool = {
  getConnection: async () => fakeConnection,
  query: runQuery,
};

// ── Stub deps ────────────────────────────────────────────────────────
const dbCompatStub = { getAppPool: () => fakePool };

let fetchByIdsResult: Map<number, any> = new Map();
let hydrateRowsFn: (rows: any[], opts?: any) => any[] = (rows) => rows;

const hydratorStub = {
  fetchByIds: async (_ids: number[], _fields?: string[]) => fetchByIdsResult,
  hydrateRows: async (rows: any[], opts?: any) => hydrateRowsFn(rows, opts),
};

// Patch core module child_process BEFORE requiring SUT.
// The SUT destructures { execSync } from require('child_process') at load time,
// so replacing cp.execSync on the cached module object means the SUT captures
// the stub when it requires the module.
const execSyncCalls: Array<{ cmd: string; opts?: any }> = [];
let execSyncImpl: (cmd: string, opts?: any) => string =
  () => 'Snapshot saved: snap-abc123\n';

const cp = require('child_process');
const origExecSync = cp.execSync;
cp.execSync = (cmd: string, opts?: any) => {
  execSyncCalls.push({ cmd, opts });
  return execSyncImpl(cmd, opts);
};

// Install stubs in require.cache using absolute paths resolved from the SUT.
const nodePath = require('path');
const sutPath = require.resolve('../changeSetService');
const sutDir = nodePath.dirname(sutPath);

const dbCompatPath = require.resolve(nodePath.join(sutDir, '..', 'config', 'db-compat'));
require.cache[dbCompatPath] = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: dbCompatStub,
} as any;

const hydratorPath = require.resolve(nodePath.join(sutDir, 'omDailyItemHydrator'));
require.cache[hydratorPath] = {
  id: hydratorPath,
  filename: hydratorPath,
  loaded: true,
  exports: hydratorStub,
} as any;

const changeSetService = require('../changeSetService');

// ── Reset helper ─────────────────────────────────────────────────────
function reset() {
  queryLog.length = 0;
  txLog.length = 0;
  releaseCount = 0;
  responders = [];
  fetchByIdsResult = new Map();
  hydrateRowsFn = (rows) => rows;
  execSyncCalls.length = 0;
  execSyncImpl = () => 'Snapshot saved: snap-abc123\n';
}

// Silence noisy logs
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
function loud() {
  console.log = origLog;
  console.warn = origWarn;
  console.error = origError;
}

async function main() {

// ============================================================================
// create / code generation
// ============================================================================
console.log('\n── create: happy path / code generation ─────────────────');

reset();
{
  addResponder(/SELECT id, code, status FROM change_sets/i, () => []);
  addResponder(/INSERT INTO change_sets\b/i, () => ({ insertId: 42 }));
  addResponder(/UPDATE change_sets SET code = \?/i, () => ({ affectedRows: 1 }));
  addResponder(/INSERT INTO change_set_events/i, () => ({ insertId: 1 }));
  addResponder(/SELECT cs\.\*/i, () => [
    { id: 42, code: 'CS-0042', status: 'draft', has_db_changes: 0 },
  ]);
  addResponder(/SELECT csi\.\*/i, () => []);
  addResponder(/SELECT cse\.\*/i, () => []);

  const result = await changeSetService.create(
    { title: 'First change set', change_type: 'feature', git_branch: 'feature/x' },
    7
  );
  assertEq(result.id, 42, 'create returns getById result');
  assertEq(result.code, 'CS-0042', 'code zero-padded');

  const insertCall = queryLog.find(q => /INSERT INTO change_sets\b/i.test(q.sql));
  assert(!!insertCall, 'INSERT change_sets called');
  assertEq(insertCall!.params[0], 'First change set', 'title param');
  assertEq(insertCall!.params[2], 'feature', 'change_type param');
  assertEq(insertCall!.params[4], 'feature/x', 'git_branch param');
  assertEq(insertCall!.params[10], 7, 'created_by param');

  const updateCall = queryLog.find(q => /UPDATE change_sets SET code = \?/i.test(q.sql));
  assertEq(updateCall!.params[0], 'CS-0042', 'code updated to CS-0042');
  assertEq(updateCall!.params[1], 42, 'id param for update');

  assertEq(txLog, ['begin', 'commit'], 'transaction committed');
  assertEq(releaseCount, 1, 'connection released');
}

// Code padding edge cases
console.log('\n── create: code padding ─────────────────────────────────');

reset();
{
  addResponder(/SELECT id, code, status FROM change_sets/i, () => []);
  addResponder(/INSERT INTO change_sets\b/i, () => ({ insertId: 5 }));
  addResponder(/UPDATE change_sets SET code = \?/i, () => ({}));
  addResponder(/INSERT INTO change_set_events/i, () => ({}));
  addResponder(/SELECT cs\.\*/i, () => [{ id: 5 }]);
  addResponder(/SELECT csi\.\*/i, () => []);
  addResponder(/SELECT cse\.\*/i, () => []);
  await changeSetService.create({ title: 'Pad' }, 1);
  const updateCall = queryLog.find(q => /UPDATE change_sets SET code = \?/i.test(q.sql));
  assertEq(updateCall!.params[0], 'CS-0005', 'id 5 → CS-0005');
}

reset();
{
  addResponder(/SELECT id, code, status FROM change_sets/i, () => []);
  addResponder(/INSERT INTO change_sets\b/i, () => ({ insertId: 12345 }));
  addResponder(/UPDATE change_sets SET code = \?/i, () => ({}));
  addResponder(/INSERT INTO change_set_events/i, () => ({}));
  addResponder(/SELECT cs\.\*/i, () => [{ id: 12345 }]);
  addResponder(/SELECT csi\.\*/i, () => []);
  addResponder(/SELECT cse\.\*/i, () => []);
  await changeSetService.create({ title: 'Pad' }, 1);
  const updateCall = queryLog.find(q => /UPDATE change_sets SET code = \?/i.test(q.sql));
  assertEq(updateCall!.params[0], 'CS-12345', 'id >9999 still renders (no trunc)');
}

// migration_files JSON serialization + has_db_changes coercion
console.log('\n── create: migration_files / has_db_changes ─────────────');

reset();
{
  addResponder(/SELECT id, code, status FROM change_sets/i, () => []);
  addResponder(/INSERT INTO change_sets\b/i, () => ({ insertId: 1 }));
  addResponder(/UPDATE change_sets SET code = \?/i, () => ({}));
  addResponder(/INSERT INTO change_set_events/i, () => ({}));
  addResponder(/SELECT cs\.\*/i, () => [{ id: 1 }]);
  addResponder(/SELECT csi\.\*/i, () => []);
  addResponder(/SELECT cse\.\*/i, () => []);
  await changeSetService.create(
    { title: 'WithDb', has_db_changes: true, migration_files: ['001.sql', '002.sql'] },
    3
  );
  const insertCall = queryLog.find(q => /INSERT INTO change_sets\b/i.test(q.sql));
  assertEq(insertCall!.params[6], 1, 'has_db_changes coerced to 1');
  assertEq(insertCall!.params[7], JSON.stringify(['001.sql', '002.sql']), 'migration_files JSON');
}

reset();
{
  addResponder(/SELECT id, code, status FROM change_sets/i, () => []);
  addResponder(/INSERT INTO change_sets\b/i, () => ({ insertId: 1 }));
  addResponder(/UPDATE change_sets SET code = \?/i, () => ({}));
  addResponder(/INSERT INTO change_set_events/i, () => ({}));
  addResponder(/SELECT cs\.\*/i, () => [{ id: 1 }]);
  addResponder(/SELECT csi\.\*/i, () => []);
  addResponder(/SELECT cse\.\*/i, () => []);
  await changeSetService.create({ title: 'NoDb' }, 3);
  const insertCall = queryLog.find(q => /INSERT INTO change_sets\b/i.test(q.sql));
  assertEq(insertCall!.params[6], 0, 'has_db_changes falsy → 0');
  assertEq(insertCall!.params[7], null, 'migration_files absent → null');
  assertEq(insertCall!.params[2], 'feature', 'change_type defaults to feature');
  assertEq(insertCall!.params[3], 'medium', 'priority defaults to medium');
  assertEq(insertCall!.params[5], 'stage_then_promote', 'deployment_strategy default');
}

// Branch conflict
console.log('\n── create: branch conflict ──────────────────────────────');

reset();
{
  addResponder(/SELECT id, code, status FROM change_sets/i, () => [
    { id: 99, code: 'CS-0099', status: 'active' },
  ]);
  let caught: any = null;
  try {
    await changeSetService.create({ title: 'X', git_branch: 'taken-branch' }, 1);
  } catch (e) {
    caught = e;
  }
  assert(caught !== null, 'branch conflict throws');
  assertEq(caught.status, 409, 'error status 409');
  assert(/CS-0099/.test(caught.message), 'error mentions existing code');
  assert(/taken-branch/.test(caught.message), 'error mentions branch');
}

// ============================================================================
// getById / getByCode
// ============================================================================
console.log('\n── getById ──────────────────────────────────────────────');

reset();
{
  addResponder(/SELECT cs\.\*/i, () => [
    { id: 10, code: 'CS-0010', status: 'active', has_db_changes: 1 },
  ]);
  addResponder(/SELECT csi\.\*/i, () => [
    { id: 100, change_set_id: 10, om_daily_item_id: 1, is_required: 1 },
    { id: 101, change_set_id: 10, om_daily_item_id: 2, is_required: 0 },
  ]);
  addResponder(/SELECT cse\.\*/i, () => [
    { id: 1, event_type: 'created' },
  ]);

  const result = await changeSetService.getById(10);
  assertEq(result.id, 10, 'returns row');
  assertEq(result.item_count, 2, 'item_count');
  assertEq(result.required_item_count, 1, 'required_item_count');
  assertEq(result.events.length, 1, 'events attached');
  assertEq(result.items.length, 2, 'items attached');
}

reset();
{
  addResponder(/SELECT cs\.\*/i, () => []);
  const result = await changeSetService.getById(9999);
  assertEq(result, null, 'not found → null');
}

console.log('\n── getByCode ────────────────────────────────────────────');

reset();
{
  addResponder(/SELECT id FROM change_sets WHERE code = \?/i, (params) => {
    assertEq(params[0], 'CS-0050', 'getByCode passes code param');
    return [{ id: 50 }];
  });
  addResponder(/SELECT cs\.\*/i, () => [{ id: 50, code: 'CS-0050' }]);
  addResponder(/SELECT csi\.\*/i, () => []);
  addResponder(/SELECT cse\.\*/i, () => []);
  const result = await changeSetService.getByCode('CS-0050');
  assertEq(result.id, 50, 'getByCode returns row via getById');
}

reset();
{
  addResponder(/SELECT id FROM change_sets WHERE code = \?/i, () => []);
  const result = await changeSetService.getByCode('CS-9999');
  assertEq(result, null, 'getByCode not found → null');
}

// ============================================================================
// list
// ============================================================================
console.log('\n── list: defaults ───────────────────────────────────────');

reset();
{
  addResponder(/FROM change_sets cs\s+LEFT JOIN users u_created/i, () => [
    { id: 1, code: 'CS-0001', status: 'active', item_count: 3 },
    { id: 2, code: 'CS-0002', status: 'draft', item_count: 0 },
  ]);
  addResponder(/SELECT COUNT\(\*\) AS total FROM change_sets/i, () => [{ total: 5 }]);

  const result = await changeSetService.list();
  assertEq(result.items.length, 2, 'list returns items');
  assertEq(result.total, 5, 'total from count query');

  const selectCall = queryLog.find(q => /LIMIT \? OFFSET \?/i.test(q.sql));
  const p = selectCall!.params;
  assertEq(p[p.length - 2], 50, 'default limit 50');
  assertEq(p[p.length - 1], 0, 'default offset 0');
}

console.log('\n── list: filters ────────────────────────────────────────');

reset();
{
  addResponder(/FROM change_sets cs\s+LEFT JOIN users u_created/i, () => []);
  addResponder(/SELECT COUNT\(\*\) AS total/i, () => [{ total: 0 }]);
  await changeSetService.list({ status: 'active', limit: 10, offset: 5 });
  const selectCall = queryLog.find(q => /LIMIT \? OFFSET \?/i.test(q.sql));
  assertEq(selectCall!.params[0], 'active', 'status param');
  assertEq(selectCall!.params[1], 10, 'custom limit');
  assertEq(selectCall!.params[2], 5, 'custom offset');
  assert(/cs\.status = \?/.test(selectCall!.sql), 'single status = ?');
}

reset();
{
  addResponder(/FROM change_sets cs\s+LEFT JOIN users u_created/i, () => []);
  addResponder(/SELECT COUNT\(\*\) AS total/i, () => [{ total: 0 }]);
  await changeSetService.list({ status: ['draft', 'active'] });
  const selectCall = queryLog.find(q => /LIMIT \? OFFSET \?/i.test(q.sql));
  assert(/cs\.status IN \(\?,\?\)/.test(selectCall!.sql), 'status IN (?,?)');
  assertEq(selectCall!.params[0], 'draft', 'first status');
  assertEq(selectCall!.params[1], 'active', 'second status');
}

reset();
{
  addResponder(/FROM change_sets cs\s+LEFT JOIN users u_created/i, () => []);
  addResponder(/SELECT COUNT\(\*\) AS total/i, () => [{ total: 0 }]);
  await changeSetService.list({ status: 'active', change_type: 'bugfix', priority: 'high' });
  const selectCall = queryLog.find(q => /LIMIT \? OFFSET \?/i.test(q.sql));
  assert(/cs\.change_type = \?/.test(selectCall!.sql), 'change_type filter');
  assert(/cs\.priority = \?/.test(selectCall!.sql), 'priority filter');
}

// ============================================================================
// update
// ============================================================================
console.log('\n── update: locked status ────────────────────────────────');

reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, code: 'CS-0005', status: 'staged' },
  ]);
  let caught: any = null;
  try {
    await changeSetService.update(5, { title: 'New' }, 1);
  } catch (e) { caught = e; }
  assert(caught !== null, 'update on staged throws');
  assertEq(caught.status, 400, '400');
  assert(/staged/.test(caught.message), 'message mentions status');
}

console.log('\n── update: no valid fields ──────────────────────────────');

reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'draft' },
  ]);
  let caught: any = null;
  try {
    await changeSetService.update(5, { unknown_field: 'x' }, 1);
  } catch (e) { caught = e; }
  assert(caught !== null, 'no fields throws');
  assertEq(caught.status, 400, '400');
}

console.log('\n── update: happy path ───────────────────────────────────');

reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'active', git_branch: 'old', has_db_changes: 0 },
  ]);
  addResponder(/UPDATE change_sets SET/i, () => ({ affectedRows: 1 }));
  addResponder(/SELECT cs\.\*/i, () => [{ id: 5, status: 'active' }]);
  addResponder(/SELECT csi\.\*/i, () => []);
  addResponder(/SELECT cse\.\*/i, () => []);

  await changeSetService.update(5, {
    title: 'New',
    has_db_changes: true,
    migration_files: ['a.sql'],
  }, 1);

  const updateCall = queryLog.find(q =>
    /UPDATE change_sets SET/i.test(q.sql) && !/code = \?/.test(q.sql)
  );
  assert(!!updateCall, 'UPDATE called');
  assert(/title = \?/.test(updateCall!.sql), 'title in SET');
  assert(/has_db_changes = \?/.test(updateCall!.sql), 'has_db_changes in SET');
  assert(/migration_files = \?/.test(updateCall!.sql), 'migration_files in SET');
  assertEq(updateCall!.params[0], 'New', 'title param');
  assertEq(updateCall!.params[1], 1, 'has_db_changes coerced to 1');
  assertEq(updateCall!.params[2], JSON.stringify(['a.sql']), 'migration_files JSON');
  assertEq(updateCall!.params[3], 5, 'id at end');
}

console.log('\n── update: git_branch change triggers check ─────────────');

reset();
{
  let branchCheckCount = 0;
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'active', git_branch: 'old-branch' },
  ]);
  addResponder(/SELECT id, code, status FROM change_sets/i, () => {
    branchCheckCount++;
    return [];
  });
  addResponder(/UPDATE change_sets SET/i, () => ({ affectedRows: 1 }));
  addResponder(/SELECT cs\.\*/i, () => [{ id: 5 }]);
  addResponder(/SELECT csi\.\*/i, () => []);
  addResponder(/SELECT cse\.\*/i, () => []);

  await changeSetService.update(5, { git_branch: 'new-branch' }, 1);
  assertEq(branchCheckCount, 1, 'branch availability checked');
}

// ============================================================================
// transition: invalid
// ============================================================================
console.log('\n── transition: invalid ──────────────────────────────────');

reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'draft' },
  ]);
  let caught: any = null;
  try {
    await changeSetService.transition(5, 'promoted', 1);
  } catch (e) { caught = e; }
  assert(caught !== null, 'invalid transition throws');
  assertEq(caught.status, 400, '400');
  assert(/draft/.test(caught.message), 'mentions current status');
  assert(/active/.test(caught.message), 'lists allowed targets');
}

// ============================================================================
// transition: ready_for_staging
// ============================================================================
console.log('\n── transition: ready_for_staging ─────────────────────────');

// Missing git_branch
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'active', git_branch: null },
  ]);
  addResponder(/SELECT csi\.om_daily_item_id, csi\.is_required/i, () => [
    { om_daily_item_id: 1, is_required: 1 },
  ]);
  hydrateRowsFn = (rows) => rows.map((r: any) => ({ ...r, title: 'T', item_status: 'done' }));

  let caught: any = null;
  try {
    await changeSetService.transition(5, 'ready_for_staging', 1);
  } catch (e) { caught = e; }
  assert(caught !== null, 'no git_branch throws');
  assert(/git_branch/.test(caught.message), 'mentions git_branch');
}

// Empty change_set
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'active', git_branch: 'feature/x' },
  ]);
  addResponder(/SELECT csi\.om_daily_item_id, csi\.is_required/i, () => []);
  let caught: any = null;
  try {
    await changeSetService.transition(5, 'ready_for_staging', 1);
  } catch (e) { caught = e; }
  assert(caught !== null, 'empty throws');
  assert(/empty/.test(caught.message), 'mentions empty');
}

// Blocked items
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'active', git_branch: 'feature/x' },
  ]);
  addResponder(/SELECT csi\.om_daily_item_id, csi\.is_required/i, () => [
    { om_daily_item_id: 1, is_required: 1 },
    { om_daily_item_id: 2, is_required: 1 },
  ]);
  hydrateRowsFn = (rows) => [
    { ...rows[0], title: 'DoneItem', item_status: 'done' },
    { ...rows[1], title: 'BlockedItem', item_status: 'in_progress' },
  ];
  let caught: any = null;
  try {
    await changeSetService.transition(5, 'ready_for_staging', 1);
  } catch (e) { caught = e; }
  assert(caught !== null, 'blockers throw');
  assert(/not ready/.test(caught.message), 'mentions not ready');
  assert(/BlockedItem/.test(caught.message), 'mentions blocker title');
}

// Non-required items not blockers
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'active', git_branch: 'feature/x' },
  ]);
  addResponder(/SELECT csi\.om_daily_item_id, csi\.is_required/i, () => [
    { om_daily_item_id: 1, is_required: 1 },
    { om_daily_item_id: 2, is_required: 0 },
  ]);
  hydrateRowsFn = (rows) => [
    { ...rows[0], title: 'Done', item_status: 'done' },
    { ...rows[1], title: 'Optional', item_status: 'in_progress' },
  ];
  addResponder(/UPDATE change_sets SET status = \?/i, () => ({}));
  addResponder(/INSERT INTO change_set_events/i, () => ({}));
  addResponder(/SELECT cs\.\*/i, () => [{ id: 5, status: 'ready_for_staging' }]);
  addResponder(/SELECT csi\.\*/i, () => []);
  addResponder(/SELECT cse\.\*/i, () => []);

  const result = await changeSetService.transition(5, 'ready_for_staging', 1);
  assertEq(result.status, 'ready_for_staging', 'non-required in_progress not blocking');
}

// Happy
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'active', git_branch: 'feature/x' },
  ]);
  addResponder(/SELECT csi\.om_daily_item_id, csi\.is_required/i, () => [
    { om_daily_item_id: 1, is_required: 1 },
  ]);
  hydrateRowsFn = (rows) => rows.map((r: any) => ({ ...r, title: 'Done', item_status: 'done' }));
  addResponder(/UPDATE change_sets SET status = \?/i, () => ({ affectedRows: 1 }));
  addResponder(/INSERT INTO change_set_events/i, () => ({ insertId: 1 }));
  addResponder(/SELECT cs\.\*/i, () => [{ id: 5, status: 'ready_for_staging' }]);
  addResponder(/SELECT csi\.\*/i, () => []);
  addResponder(/SELECT cse\.\*/i, () => []);

  const result = await changeSetService.transition(5, 'ready_for_staging', 7);
  assertEq(result.status, 'ready_for_staging', 'transitioned');
  assertEq(txLog, ['begin', 'commit'], 'atomic commit');
  assertEq(releaseCount, 1, 'connection released');
}

// ============================================================================
// transition: staged
// ============================================================================
console.log('\n── transition: staged ────────────────────────────────────');

// Missing build_run_id
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'ready_for_staging' },
  ]);
  let caught: any = null;
  try {
    await changeSetService.transition(5, 'staged', 1, { staging_commit_sha: 'abc' });
  } catch (e) { caught = e; }
  assert(caught !== null, 'missing build_run_id throws');
  assert(/staging_build_run_id/.test(caught.message), 'mentions field');
}

// Missing commit_sha
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'ready_for_staging' },
  ]);
  let caught: any = null;
  try {
    await changeSetService.transition(5, 'staged', 1, { staging_build_run_id: 'run' });
  } catch (e) { caught = e; }
  assert(caught !== null, 'missing commit_sha throws');
  assert(/staging_commit_sha/.test(caught.message), 'mentions field');
}

// Staging slot occupied
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'ready_for_staging' },
  ]);
  addResponder(/SELECT id, code FROM change_sets/i, () => [
    { id: 99, code: 'CS-0099' },
  ]);
  let caught: any = null;
  try {
    await changeSetService.transition(5, 'staged', 1, {
      staging_build_run_id: 'run-1',
      staging_commit_sha: 'sha-1',
    });
  } catch (e) { caught = e; }
  assert(caught !== null, 'slot occupied throws');
  assertEq(caught.status, 409, '409');
  assert(/CS-0099/.test(caught.message), 'mentions occupier');
}

// Happy
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'ready_for_staging' },
  ]);
  addResponder(/SELECT id, code FROM change_sets/i, () => []);
  addResponder(/UPDATE change_sets SET status = \?/i, () => ({ affectedRows: 1 }));
  addResponder(/INSERT INTO change_set_events/i, () => ({ insertId: 1 }));
  addResponder(/SELECT cs\.\*/i, () => [{ id: 5, status: 'staged' }]);
  addResponder(/SELECT csi\.\*/i, () => []);
  addResponder(/SELECT cse\.\*/i, () => []);

  await changeSetService.transition(5, 'staged', 7, {
    staging_build_run_id: 'run-1',
    staging_commit_sha: 'sha-1',
  });
  const updateCall = queryLog.find(q => /UPDATE change_sets SET status = \?/i.test(q.sql));
  assert(/staging_build_run_id = \?/.test(updateCall!.sql), 'staging_build_run_id SET');
  assert(/staged_at = \?/.test(updateCall!.sql), 'staged_at SET');
  assertEq(updateCall!.params[0], 'staged', 'status param');
  assertEq(updateCall!.params[1], 'run-1', 'build_run_id');
  assertEq(updateCall!.params[2], 'sha-1', 'commit_sha');
  // Event metadata includes build info
  const eventCall = queryLog.find(q => /INSERT INTO change_set_events/i.test(q.sql));
  const metadata = JSON.parse(eventCall!.params[6] as string);
  assertEq(metadata.staging_build_run_id, 'run-1', 'metadata build_run_id');
  assertEq(metadata.staging_commit_sha, 'sha-1', 'metadata commit_sha');
}

// ============================================================================
// transition: approved
// ============================================================================
console.log('\n── transition: approved ──────────────────────────────────');

// Missing review_notes when has_db_changes
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'in_review', has_db_changes: 1 },
  ]);
  let caught: any = null;
  try {
    await changeSetService.transition(5, 'approved', 1);
  } catch (e) { caught = e; }
  assert(caught !== null, 'missing notes with db changes throws');
  assert(/Review notes/.test(caught.message), 'message mentions review notes');
}

// No db changes — no notes needed
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'in_review', has_db_changes: 0, staging_commit_sha: 'sha-no-db' },
  ]);
  addResponder(/UPDATE change_sets SET status = \?/i, () => ({}));
  addResponder(/INSERT INTO change_set_events/i, () => ({}));
  addResponder(/SELECT cs\.\*/i, () => [{ id: 5, status: 'approved' }]);
  addResponder(/SELECT csi\.\*/i, () => []);
  addResponder(/SELECT cse\.\*/i, () => []);

  const result = await changeSetService.transition(5, 'approved', 9);
  assertEq(result.status, 'approved', 'no review notes needed when no db changes');
}

// Happy with notes: locks approved_commit_sha
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'in_review', has_db_changes: 1, staging_commit_sha: 'sha-locked' },
  ]);
  addResponder(/UPDATE change_sets SET status = \?/i, () => ({}));
  addResponder(/INSERT INTO change_set_events/i, () => ({}));
  addResponder(/SELECT cs\.\*/i, () => [{ id: 5, status: 'approved' }]);
  addResponder(/SELECT csi\.\*/i, () => []);
  addResponder(/SELECT cse\.\*/i, () => []);

  await changeSetService.transition(5, 'approved', 9, { review_notes: 'LGTM' });
  const updateCall = queryLog.find(q => /UPDATE change_sets SET status = \?/i.test(q.sql));
  assert(/approved_commit_sha = \?/.test(updateCall!.sql), 'approved_commit_sha SET');
  assertEq(updateCall!.params[1], 'sha-locked', 'locks staging commit');
  assert(updateCall!.params.includes(9), 'reviewed_by = userId');
  assert(updateCall!.params.includes('LGTM'), 'review_notes stored');
}

// ============================================================================
// transition: rejected
// ============================================================================
console.log('\n── transition: rejected ──────────────────────────────────');

// Missing reason
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'in_review' },
  ]);
  let caught: any = null;
  try {
    await changeSetService.transition(5, 'rejected', 1);
  } catch (e) { caught = e; }
  assert(caught !== null, 'missing reason throws');
  assert(/rejection_reason/.test(caught.message), 'mentions reason');
}

// Happy: clears staging + approved
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'in_review' },
  ]);
  addResponder(/UPDATE change_sets SET status = \?/i, () => ({}));
  addResponder(/INSERT INTO change_set_events/i, () => ({}));
  addResponder(/SELECT cs\.\*/i, () => [{ id: 5, status: 'rejected' }]);
  addResponder(/SELECT csi\.\*/i, () => []);
  addResponder(/SELECT cse\.\*/i, () => []);

  await changeSetService.transition(5, 'rejected', 3, { rejection_reason: 'broken' });
  const updateCall = queryLog.find(q => /UPDATE change_sets SET status = \?/i.test(q.sql));
  assert(/staging_build_run_id = \?/.test(updateCall!.sql), 'clears build_run_id');
  assert(/approved_commit_sha = \?/.test(updateCall!.sql), 'clears approved_commit_sha');
  assert(/staging_commit_sha = \?/.test(updateCall!.sql), 'clears staging_commit_sha');
  assert(updateCall!.params.includes('broken'), 'rejection_reason stored');
  const nullCount = updateCall!.params.filter((p: any) => p === null).length;
  assert(nullCount >= 5, 'clears many fields to null');
}

// ============================================================================
// transition: promoted
// ============================================================================
console.log('\n── transition: promoted ──────────────────────────────────');

// Missing prod_build_run_id
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'approved', code: 'CS-0005', approved_commit_sha: 'sha-a' },
  ]);
  let caught: any = null;
  try {
    await changeSetService.transition(5, 'promoted', 1, { prod_commit_sha: 'sha-a' });
  } catch (e) { caught = e; }
  assert(caught !== null, 'missing prod_build_run_id throws');
  assert(/prod_build_run_id/.test(caught.message), 'mentions field');
}

// Missing prod_commit_sha
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'approved', code: 'CS-0005', approved_commit_sha: 'sha-a' },
  ]);
  let caught: any = null;
  try {
    await changeSetService.transition(5, 'promoted', 1, { prod_build_run_id: 'run' });
  } catch (e) { caught = e; }
  assert(caught !== null, 'missing prod_commit_sha throws');
  assert(/prod_commit_sha/.test(caught.message), 'mentions field');
}

// SHA drift
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'approved', code: 'CS-0005', approved_commit_sha: 'sha-approved' },
  ]);
  let caught: any = null;
  try {
    await changeSetService.transition(5, 'promoted', 1, {
      prod_build_run_id: 'run-prod',
      prod_commit_sha: 'sha-different',
    });
  } catch (e) { caught = e; }
  assert(caught !== null, 'drift throws');
  assertEq(caught.status, 409, '409');
  assert(/drift/i.test(caught.message), 'mentions drift');
  assert(/sha-approved/.test(caught.message), 'shows approved sha');
  assert(/sha-different/.test(caught.message), 'shows promoted sha');
}

// Happy: snapshot created
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'approved', code: 'CS-0005', approved_commit_sha: 'sha-locked' },
  ]);
  addResponder(/UPDATE change_sets SET status = \?/i, () => ({}));
  addResponder(/INSERT INTO change_set_events/i, () => ({}));
  addResponder(/SELECT cs\.\*/i, () => [{ id: 5, status: 'promoted' }]);
  addResponder(/SELECT csi\.\*/i, () => []);
  addResponder(/SELECT cse\.\*/i, () => []);
  execSyncImpl = () => 'Snapshot saved: snap-promo-123\n';
  quiet();

  await changeSetService.transition(5, 'promoted', 7, {
    prod_build_run_id: 'run-prod',
    prod_commit_sha: 'sha-locked',
  });
  loud();
  assertEq(execSyncCalls.length, 1, 'execSync called once');
  assert(/pre-promote-CS-0005/.test(execSyncCalls[0].cmd), 'snapshot label includes code');
  const updateCall = queryLog.find(q => /UPDATE change_sets SET status = \?/i.test(q.sql));
  assert(/pre_promote_snapshot_id = \?/.test(updateCall!.sql), 'snapshot id SET');
  assert(updateCall!.params.includes('snap-promo-123'), 'snapshot id stored');
}

// Snapshot failure is non-fatal
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'approved', code: 'CS-0005', approved_commit_sha: null },
  ]);
  addResponder(/UPDATE change_sets SET status = \?/i, () => ({}));
  addResponder(/INSERT INTO change_set_events/i, () => ({}));
  addResponder(/SELECT cs\.\*/i, () => [{ id: 5, status: 'promoted' }]);
  addResponder(/SELECT csi\.\*/i, () => []);
  addResponder(/SELECT cse\.\*/i, () => []);
  execSyncImpl = () => { throw new Error('git uncommitted'); };
  quiet();

  const result = await changeSetService.transition(5, 'promoted', 1, {
    prod_build_run_id: 'run',
    prod_commit_sha: 'sha',
  });
  loud();
  assertEq(result.status, 'promoted', 'still transitions despite snapshot fail');
}

// Snapshot returns null (no match) — non-fatal, no snapshot id set
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'approved', code: 'CS-0005', approved_commit_sha: null },
  ]);
  addResponder(/UPDATE change_sets SET status = \?/i, () => ({}));
  addResponder(/INSERT INTO change_set_events/i, () => ({}));
  addResponder(/SELECT cs\.\*/i, () => [{ id: 5, status: 'promoted' }]);
  addResponder(/SELECT csi\.\*/i, () => []);
  addResponder(/SELECT cse\.\*/i, () => []);
  execSyncImpl = () => 'No snapshot created\n';
  quiet();

  await changeSetService.transition(5, 'promoted', 1, {
    prod_build_run_id: 'run',
    prod_commit_sha: 'sha',
  });
  loud();
  const updateCall = queryLog.find(q => /UPDATE change_sets SET status = \?/i.test(q.sql));
  assert(!/pre_promote_snapshot_id/.test(updateCall!.sql), 'no snapshot_id column when null');
}

// ============================================================================
// transition: active from rejected
// ============================================================================
console.log('\n── transition: active from rejected ──────────────────────');

reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'rejected', rejection_reason: 'was broken' },
  ]);
  addResponder(/UPDATE change_sets SET status = \?/i, () => ({}));
  addResponder(/INSERT INTO change_set_events/i, () => ({}));
  addResponder(/SELECT cs\.\*/i, () => [{ id: 5, status: 'active' }]);
  addResponder(/SELECT csi\.\*/i, () => []);
  addResponder(/SELECT cse\.\*/i, () => []);

  await changeSetService.transition(5, 'active', 1);
  const updateCall = queryLog.find(q => /UPDATE change_sets SET status = \?/i.test(q.sql));
  assert(/rejected_at = \?/.test(updateCall!.sql), 'clears rejected_at');
  assert(/rejection_reason = \?/.test(updateCall!.sql), 'clears rejection_reason');
}

// ============================================================================
// addItem
// ============================================================================
console.log('\n── addItem: locked status ───────────────────────────────');

reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'staged' },
  ]);
  let caught: any = null;
  try {
    await changeSetService.addItem(5, 100, {}, 1);
  } catch (e) { caught = e; }
  assert(caught !== null, 'locked status throws');
  assertEq(caught.status, 400, '400');
}

console.log('\n── addItem: item not found ──────────────────────────────');

reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'draft' },
  ]);
  fetchByIdsResult = new Map();
  let caught: any = null;
  try {
    await changeSetService.addItem(5, 100, {}, 1);
  } catch (e) { caught = e; }
  assert(caught !== null, 'missing item throws');
  assertEq(caught.status, 404, '404');
}

console.log('\n── addItem: already in another CS ───────────────────────');

reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'draft' },
  ]);
  fetchByIdsResult = new Map([[100, { id: 100, title: 'T', status: 'done' }]]);
  addResponder(/SELECT csi\.change_set_id, cs2\.code, cs2\.status/i, () => [
    { change_set_id: 9, code: 'CS-0009', status: 'active' },
  ]);
  let caught: any = null;
  try {
    await changeSetService.addItem(5, 100, {}, 1);
  } catch (e) { caught = e; }
  assert(caught !== null, 'already in other CS throws');
  assertEq(caught.status, 409, '409');
  assert(/CS-0009/.test(caught.message), 'mentions other CS');
}

console.log('\n── addItem: happy path ──────────────────────────────────');

reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'draft' },
  ]);
  fetchByIdsResult = new Map([[100, { id: 100, title: 'My task', status: 'done' }]]);
  addResponder(/SELECT csi\.change_set_id, cs2\.code, cs2\.status/i, () => []);
  addResponder(/INSERT INTO change_set_items/i, () => ({ insertId: 200 }));
  addResponder(/INSERT INTO change_set_events/i, () => ({ insertId: 1 }));
  addResponder(/SELECT csi\.\*/i, () => [
    { id: 200, change_set_id: 5, om_daily_item_id: 100 },
  ]);

  const items = await changeSetService.addItem(
    5, 100,
    { sort_order: 3, is_required: false, notes: 'note' },
    9
  );
  assertEq(items.length, 1, 'returns items list');
  const insertCall = queryLog.find(q => /INSERT INTO change_set_items/i.test(q.sql));
  assertEq(insertCall!.params[0], 5, 'change_set_id');
  assertEq(insertCall!.params[1], 100, 'om_daily_item_id');
  assertEq(insertCall!.params[2], 3, 'sort_order');
  assertEq(insertCall!.params[3], 0, 'is_required false → 0');
  assertEq(insertCall!.params[4], 'note', 'notes');
  const eventCall = queryLog.find(q => /INSERT INTO change_set_events/i.test(q.sql));
  assert(!!eventCall, 'event logged');
  assert(/My task/.test(eventCall!.params[5] as string), 'event message includes title');
}

// Defaults
reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'draft' },
  ]);
  fetchByIdsResult = new Map([[100, { id: 100, title: 'T', status: 'done' }]]);
  addResponder(/SELECT csi\.change_set_id, cs2\.code, cs2\.status/i, () => []);
  addResponder(/INSERT INTO change_set_items/i, () => ({ insertId: 200 }));
  addResponder(/INSERT INTO change_set_events/i, () => ({}));
  addResponder(/SELECT csi\.\*/i, () => []);

  await changeSetService.addItem(5, 100, {}, 9);
  const insertCall = queryLog.find(q => /INSERT INTO change_set_items/i.test(q.sql));
  assertEq(insertCall!.params[2], 0, 'default sort_order 0');
  assertEq(insertCall!.params[3], 1, 'default is_required true → 1');
  assertEq(insertCall!.params[4], null, 'default notes null');
}

console.log('\n── addItem: duplicate in same CS ────────────────────────');

reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'draft' },
  ]);
  fetchByIdsResult = new Map([[100, { id: 100, title: 'T', status: 'done' }]]);
  addResponder(/SELECT csi\.change_set_id, cs2\.code, cs2\.status/i, () => []);
  addResponder(/INSERT INTO change_set_items/i, () => {
    const e: any = new Error('dup');
    e.code = 'ER_DUP_ENTRY';
    throw e;
  });

  let caught: any = null;
  try {
    await changeSetService.addItem(5, 100, {}, 1);
  } catch (e) { caught = e; }
  assert(caught !== null, 'duplicate throws');
  assertEq(caught.status, 409, '409');
  assert(/already in this change_set/.test(caught.message), 'dup message');
}

// ============================================================================
// removeItem
// ============================================================================
console.log('\n── removeItem: locked ───────────────────────────────────');

reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'staged' },
  ]);
  let caught: any = null;
  try {
    await changeSetService.removeItem(5, 100, 1);
  } catch (e) { caught = e; }
  assert(caught !== null, 'locked throws');
  assertEq(caught.status, 400, '400');
}

console.log('\n── removeItem: not in CS ────────────────────────────────');

reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'draft' },
  ]);
  fetchByIdsResult = new Map();
  addResponder(/DELETE FROM change_set_items/i, () => ({ affectedRows: 0 }));
  let caught: any = null;
  try {
    await changeSetService.removeItem(5, 100, 1);
  } catch (e) { caught = e; }
  assert(caught !== null, 'not in CS throws');
  assertEq(caught.status, 404, '404');
}

console.log('\n── removeItem: happy ────────────────────────────────────');

reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'active' },
  ]);
  fetchByIdsResult = new Map([[100, { id: 100, title: 'Gone' }]]);
  addResponder(/DELETE FROM change_set_items/i, () => ({ affectedRows: 1 }));
  addResponder(/INSERT INTO change_set_events/i, () => ({}));
  addResponder(/SELECT csi\.\*/i, () => []);

  const items = await changeSetService.removeItem(5, 100, 9);
  assertEq(items.length, 0, 'returns empty items');
  const eventCall = queryLog.find(q => /INSERT INTO change_set_events/i.test(q.sql));
  assert(/Gone/.test(eventCall!.params[5] as string), 'event mentions title');
}

// ============================================================================
// membership lookups
// ============================================================================
console.log('\n── getChangeSetForItem ──────────────────────────────────');

reset();
{
  addResponder(/SELECT cs\.id, cs\.code, cs\.title, cs\.status, cs\.git_branch/i, () => [
    { id: 10, code: 'CS-0010', title: 'Release X', status: 'active', git_branch: 'feature/x' },
  ]);
  const result = await changeSetService.getChangeSetForItem(50);
  assertEq(result.code, 'CS-0010', 'returns change set');
  assertEq(result.git_branch, 'feature/x', 'includes branch');
}

reset();
{
  addResponder(/SELECT cs\.id, cs\.code, cs\.title, cs\.status, cs\.git_branch/i, () => []);
  const result = await changeSetService.getChangeSetForItem(999);
  assertEq(result, null, 'null when none');
}

console.log('\n── getChangeSetMemberships ──────────────────────────────');

reset();
{
  const result = await changeSetService.getChangeSetMemberships([]);
  assertEq(result, {}, 'empty input → {}');
  assertEq(queryLog.length, 0, 'no query on empty');
}

reset();
{
  addResponder(/SELECT csi\.om_daily_item_id, cs\.id AS change_set_id/i, () => [
    { om_daily_item_id: 1, change_set_id: 10, code: 'CS-0010', title: 'A', status: 'active' },
    { om_daily_item_id: 2, change_set_id: 11, code: 'CS-0011', title: 'B', status: 'staged' },
  ]);
  const result = await changeSetService.getChangeSetMemberships([1, 2, 3]);
  assertEq(result[1].code, 'CS-0010', 'item 1 mapped');
  assertEq(result[2].code, 'CS-0011', 'item 2 mapped');
  assertEq(result[3], undefined, 'item 3 unmapped');
}

// ============================================================================
// getEvents / addNote
// ============================================================================
console.log('\n── getEvents ────────────────────────────────────────────');

reset();
{
  addResponder(/SELECT cse\.\*/i, () => [
    { id: 1, event_type: 'note_added', message: 'hello' },
  ]);
  const events = await changeSetService.getEvents(5);
  assertEq(events.length, 1, 'returns events');
  const call = queryLog.find(q => /SELECT cse\.\*/i.test(q.sql));
  assertEq(call!.params[0], 5, 'change_set_id');
  assertEq(call!.params[1], 100, 'default limit 100');
}

console.log('\n── addNote ──────────────────────────────────────────────');

reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'draft' },
  ]);
  addResponder(/INSERT INTO change_set_events/i, () => ({ insertId: 1 }));
  addResponder(/SELECT cse\.\*/i, () => [{ id: 1, message: 'hi' }]);

  await changeSetService.addNote(5, 7, 'hi');
  const insertCall = queryLog.find(q => /INSERT INTO change_set_events/i.test(q.sql));
  assertEq(insertCall!.params[1], 'note_added', 'event_type note_added');
  assertEq(insertCall!.params[5], 'hi', 'message');
  assertEq(insertCall!.params[4], 7, 'user_id');
}

// ============================================================================
// fastForward
// ============================================================================
console.log('\n── fastForward: locked ──────────────────────────────────');

reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'staged' },
  ]);
  let caught: any = null;
  try {
    await changeSetService.fastForward(5, 1, {});
  } catch (e) { caught = e; }
  assert(caught !== null, 'locked throws');
}

console.log('\n── fastForward: no git_branch ───────────────────────────');

reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'active', git_branch: null },
  ]);
  let caught: any = null;
  try {
    await changeSetService.fastForward(5, 1, {});
  } catch (e) { caught = e; }
  assert(caught !== null, 'no branch throws');
  assert(/git_branch/.test(caught.message), 'mentions branch');
}

console.log('\n── fastForward: partial metadata ────────────────────────');

reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, status: 'active', git_branch: 'feature/x' },
  ]);
  let caught: any = null;
  try {
    await changeSetService.fastForward(5, 1, { staging_build_run_id: 'r1' });
  } catch (e) { caught = e; }
  assert(caught !== null, 'partial metadata throws');
  assert(/required/.test(caught.message), 'mentions required');
}

console.log('\n── fastForward: happy ───────────────────────────────────');

reset();
{
  addResponder(/SELECT \* FROM change_sets WHERE id = \?/i, () => [
    { id: 5, code: 'CS-0005', status: 'active', git_branch: 'feature/x' },
  ]);
  addResponder(/SELECT csi\.om_daily_item_id, csi\.is_required/i, () => [
    { om_daily_item_id: 1, is_required: 1 },
  ]);
  hydrateRowsFn = (rows) => rows.map((r: any) => ({ ...r, title: 'T', item_status: 'done' }));
  addResponder(/SELECT id, code FROM change_sets/i, () => []);
  addResponder(/UPDATE change_sets SET\s+status = 'promoted'/i, () => ({ affectedRows: 1 }));
  addResponder(/INSERT INTO change_set_events/i, () => ({ insertId: 1 }));
  addResponder(/SELECT cs\.\*/i, () => [{ id: 5, status: 'promoted' }]);
  addResponder(/SELECT csi\.\*/i, () => []);
  addResponder(/SELECT cse\.\*/i, () => []);
  execSyncImpl = () => 'Snapshot saved: snap-ff-1\n';
  quiet();

  const result = await changeSetService.fastForward(5, 9, {
    staging_build_run_id: 'sr',
    staging_commit_sha: 'sc',
    prod_build_run_id: 'pr',
    prod_commit_sha: 'pc',
  });
  loud();
  assertEq(result.status, 'promoted', 'fast-forwarded');
  assertEq(execSyncCalls.length, 1, 'snapshot taken');
  const eventCall = queryLog.find(q => /INSERT INTO change_set_events/i.test(q.sql));
  // fastForward uses a literal 'fast_forwarded' in SQL, not a ? param
  assert(/fast_forwarded/.test(eventCall!.sql), 'event type fast_forwarded in SQL');
  assertEq(eventCall!.params[0], 5, 'change_set_id param');
  assertEq(eventCall!.params[1], 'active', 'from_status is old status');
  // params layout: [id, from_status, user_id, message, metadataJson]
  const metadata = JSON.parse(eventCall!.params[4] as string);
  assertEq(metadata.staging_build_run_id, 'sr', 'metadata staging build');
  assertEq(metadata.prod_commit_sha, 'pc', 'metadata prod sha');
  assert(Array.isArray(metadata.skipped_statuses), 'skipped_statuses array');
  assertEq(txLog, ['begin', 'commit'], 'atomic');
  assertEq(releaseCount, 1, 'released');
}

// ============================================================================
// getReleaseHistory
// ============================================================================
console.log('\n── getReleaseHistory ────────────────────────────────────');

reset();
{
  addResponder(/FROM change_sets cs\s+LEFT JOIN users u_created/i, () => [
    { id: 1, code: 'CS-0001', status: 'promoted' },
    { id: 2, code: 'CS-0002', status: 'rolled_back' },
  ]);
  addResponder(/SELECT COUNT\(\*\) AS total FROM change_sets WHERE status IN/i, () => [{ total: 2 }]);
  const result = await changeSetService.getReleaseHistory(5, 10);
  assertEq(result.items.length, 2, 'items');
  assertEq(result.total, 2, 'total');
  const selectCall = queryLog.find(q =>
    /LIMIT \? OFFSET \?/i.test(q.sql) && /promoted/.test(q.sql)
  );
  assertEq(selectCall!.params[0], 5, 'limit');
  assertEq(selectCall!.params[1], 10, 'offset');
}

// Defaults
reset();
{
  addResponder(/FROM change_sets cs\s+LEFT JOIN users u_created/i, () => []);
  addResponder(/SELECT COUNT\(\*\) AS total FROM change_sets WHERE status IN/i, () => [{ total: 0 }]);
  await changeSetService.getReleaseHistory();
  const selectCall = queryLog.find(q => /LIMIT \? OFFSET \?/i.test(q.sql) && /promoted/.test(q.sql));
  assertEq(selectCall!.params[0], 25, 'default limit 25');
  assertEq(selectCall!.params[1], 0, 'default offset 0');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
// Restore execSync for cleanliness
cp.execSync = origExecSync;
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
