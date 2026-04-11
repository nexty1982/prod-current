#!/usr/bin/env npx tsx
/**
 * Unit tests for services/changeSetService.js (OMD-1119)
 *
 * Covers CRUD, status transitions with per-target validation, item
 * management, fast-forward, release history, and private helpers.
 *
 * Deps stubbed via require.cache BEFORE the SUT is required:
 *   - ../config/db-compat (getAppPool)            → route-dispatch fake pool + conn
 *   - ../services/omDailyItemHydrator             → scriptable fetch/hydrate
 *
 * child_process.execSync is stubbed for snapshot creation coverage.
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

async function assertThrows(fn: () => Promise<any>, needle: string, message: string): Promise<void> {
  try {
    await fn();
    console.error(`  FAIL: ${message} — did not throw`); failed++;
  } catch (e: any) {
    if (!needle || (e && e.message && e.message.includes(needle))) {
      console.log(`  PASS: ${message}`); passed++;
    } else {
      console.error(`  FAIL: ${message}\n         expected message to include: ${needle}\n         actual: ${e && e.message}`);
      failed++;
    }
  }
}

// ── child_process stub (for snapshot execSync) ──────────────────────
const cpPath = require.resolve('child_process');
const realCp = require('child_process');
let execSyncResponse: string = 'Snapshot saved: snap-abc123\n';
let execSyncThrows = false;
require.cache[cpPath] = {
  id: cpPath,
  filename: cpPath,
  loaded: true,
  exports: {
    ...realCp,
    execSync: (_cmd: string, _opts: any) => {
      if (execSyncThrows) throw new Error('no changes to snapshot');
      return execSyncResponse;
    },
  },
} as any;

// ── Route dispatch pool ─────────────────────────────────────────────
type Route = { match: RegExp; handler: (params: any[]) => any };
let routes: Route[] = [];
type QueryCall = { sql: string; params: any[]; via: 'pool' | 'conn' };
const queryLog: QueryCall[] = [];

let txBegan = 0;
let txCommitted = 0;
let txRolledBack = 0;
let connReleased = 0;

function dispatch(sql: string, params: any[] = [], via: 'pool' | 'conn'): any {
  queryLog.push({ sql, params, via });
  for (const r of routes) {
    if (r.match.test(sql)) {
      const res = r.handler(params);
      return res;
    }
  }
  // Default empty rows
  return [[], {}];
}

const fakeConnection = {
  beginTransaction: async () => { txBegan++; },
  commit: async () => { txCommitted++; },
  rollback: async () => { txRolledBack++; },
  release: () => { connReleased++; },
  query: async (sql: string, params: any[] = []) => dispatch(sql, params, 'conn'),
};

const fakePool = {
  query: async (sql: string, params: any[] = []) => dispatch(sql, params, 'pool'),
  getConnection: async () => fakeConnection,
};

// db-compat stub
const dbCompatPath = require.resolve('../../config/db-compat');
require.cache[dbCompatPath] = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// omDailyItemHydrator stub
let fetchByIdsResponse = new Map<number, any>();
let hydrateRowsResponse: any[] = [];
const hydratorPath = require.resolve('../omDailyItemHydrator');
require.cache[hydratorPath] = {
  id: hydratorPath,
  filename: hydratorPath,
  loaded: true,
  exports: {
    fetchByIds: async (_ids: number[], _fields?: string[]) => fetchByIdsResponse,
    hydrateRows: async (rows: any[], _opts?: any) => hydrateRowsResponse.length ? hydrateRowsResponse : rows,
  },
} as any;

function resetAll() {
  routes = [];
  queryLog.length = 0;
  txBegan = 0;
  txCommitted = 0;
  txRolledBack = 0;
  connReleased = 0;
  fetchByIdsResponse = new Map();
  hydrateRowsResponse = [];
  execSyncResponse = 'Snapshot saved: snap-abc123\n';
  execSyncThrows = false;
}

// Silence console
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

// SUT
const service = require('../changeSetService');

async function main() {

// ============================================================================
// create
// ============================================================================
console.log('\n── create ────────────────────────────────────────────────');

resetAll();
{
  // Branch availability check first, then INSERT, then UPDATE code, then INSERT event,
  // then getById (SELECT + items + events)
  routes.push({
    // _assertBranchAvailable
    match: /FROM change_sets\s+WHERE git_branch = \?/i,
    handler: () => [[]],
  });
  routes.push({
    match: /^\s*INSERT INTO change_sets/i,
    handler: () => [{ insertId: 77 }],
  });
  routes.push({
    match: /UPDATE change_sets SET code = \?/i,
    handler: () => [{}],
  });
  routes.push({
    match: /INSERT INTO change_set_events/i,
    handler: () => [{}],
  });
  // getById → SELECT cs.*, etc.
  routes.push({
    match: /SELECT cs\.\*[\s\S]*FROM change_sets cs[\s\S]*WHERE cs\.id = \?/i,
    handler: ([id]: any[]) => [[{
      id, code: 'CS-0077', title: 'Test', status: 'draft',
      git_branch: 'feature/x', has_db_changes: 0,
      created_by: 1, reviewed_by: null,
      staging_commit_sha: null, approved_commit_sha: null,
    }]],
  });
  // getItems
  routes.push({
    match: /FROM change_set_items csi[\s\S]*WHERE csi\.change_set_id = \?/i,
    handler: () => [[]],
  });
  // getEvents
  routes.push({
    match: /FROM change_set_events cse[\s\S]*WHERE cse\.change_set_id = \?/i,
    handler: () => [[{ id: 1, event_type: 'created' }]],
  });

  const cs = await service.create(
    {
      title: 'Test',
      git_branch: 'feature/x',
      migration_files: ['m1.sql', 'm2.sql'],
      has_db_changes: true,
    },
    42
  );

  assertEq(cs.id, 77, 'returns getById result');
  assertEq(cs.code, 'CS-0077', 'code generated CS-0077');
  assertEq(txBegan, 1, 'transaction began');
  assertEq(txCommitted, 1, 'transaction committed');
  assertEq(txRolledBack, 0, 'no rollback');
  assertEq(connReleased, 1, 'connection released');

  // Find INSERT call
  const insertCall = queryLog.find(c => /^\s*INSERT INTO change_sets/i.test(c.sql));
  assert(insertCall !== undefined, 'INSERT found');
  assertEq(insertCall!.params[0], 'Test', 'title param');
  assertEq(insertCall!.params[2], 'feature', 'default change_type');
  assertEq(insertCall!.params[3], 'medium', 'default priority');
  assertEq(insertCall!.params[5], 'stage_then_promote', 'default deployment_strategy');
  assertEq(insertCall!.params[6], 1, 'has_db_changes → 1');
  assertEq(insertCall!.params[7], JSON.stringify(['m1.sql', 'm2.sql']), 'migration_files JSON');
}

// create: branch conflict
resetAll();
{
  routes.push({
    match: /FROM change_sets\s+WHERE git_branch = \?/i,
    handler: () => [[{ id: 1, code: 'CS-0001', status: 'active' }]],
  });
  await assertThrows(
    () => service.create({ title: 'X', git_branch: 'feature/y' }, 1),
    'already assigned',
    'branch conflict throws'
  );
}

// create: rollback on error
resetAll();
{
  routes.push({
    match: /FROM change_sets\s+WHERE git_branch = \?/i,
    handler: () => [[]],
  });
  routes.push({
    match: /^\s*INSERT INTO change_sets/i,
    handler: () => { throw new Error('db exploded'); },
  });
  await assertThrows(
    () => service.create({ title: 'X', git_branch: 'feature/z' }, 1),
    'db exploded',
    'insert error surfaces'
  );
  assertEq(txRolledBack, 1, 'rolled back');
  assertEq(connReleased, 1, 'released after rollback');
}

// ============================================================================
// getById — not found
// ============================================================================
console.log('\n── getById ───────────────────────────────────────────────');

resetAll();
{
  routes.push({
    match: /SELECT cs\.\*[\s\S]*FROM change_sets cs[\s\S]*WHERE cs\.id = \?/i,
    handler: () => [[]],
  });
  const res = await service.getById(999);
  assertEq(res, null, 'null when not found');
}

// getById — with items and events
resetAll();
{
  routes.push({
    match: /SELECT cs\.\*[\s\S]*FROM change_sets cs[\s\S]*WHERE cs\.id = \?/i,
    handler: () => [[{ id: 5, code: 'CS-0005', status: 'active' }]],
  });
  routes.push({
    match: /FROM change_set_items csi[\s\S]*WHERE csi\.change_set_id = \?/i,
    handler: () => [[
      { id: 1, om_daily_item_id: 100, is_required: 1 },
      { id: 2, om_daily_item_id: 101, is_required: 0 },
    ]],
  });
  routes.push({
    match: /FROM change_set_events cse/i,
    handler: () => [[{ id: 1 }, { id: 2 }]],
  });
  const res = await service.getById(5);
  assertEq(res.id, 5, 'id');
  assertEq(res.item_count, 2, 'item_count');
  assertEq(res.required_item_count, 1, 'required_item_count');
  assertEq(res.events.length, 2, 'events attached');
}

// ============================================================================
// getByCode
// ============================================================================
console.log('\n── getByCode ─────────────────────────────────────────────');

resetAll();
{
  routes.push({
    match: /SELECT id FROM change_sets WHERE code = \?/i,
    handler: () => [[]],
  });
  const res = await service.getByCode('CS-9999');
  assertEq(res, null, 'not found → null');
}

resetAll();
{
  routes.push({
    match: /SELECT id FROM change_sets WHERE code = \?/i,
    handler: () => [[{ id: 33 }]],
  });
  routes.push({
    match: /SELECT cs\.\*[\s\S]*WHERE cs\.id = \?/i,
    handler: () => [[{ id: 33, code: 'CS-0033' }]],
  });
  routes.push({ match: /change_set_items/i, handler: () => [[]] });
  routes.push({ match: /change_set_events/i, handler: () => [[]] });
  const res = await service.getByCode('CS-0033');
  assertEq(res.id, 33, 'resolved via getById');
}

// ============================================================================
// list
// ============================================================================
console.log('\n── list ──────────────────────────────────────────────────');

resetAll();
{
  routes.push({
    match: /SELECT cs\.\*[\s\S]*ORDER BY[\s\S]*LIMIT \? OFFSET \?/i,
    handler: () => [[{ id: 1 }, { id: 2 }]],
  });
  routes.push({
    match: /SELECT COUNT\(\*\) AS total FROM change_sets cs/i,
    handler: () => [[{ total: 2 }]],
  });
  const res = await service.list({ status: 'active', priority: 'high', limit: 10, offset: 0 });
  assertEq(res.total, 2, 'total');
  assertEq(res.items.length, 2, 'items');
  const main = queryLog.find(c => /ORDER BY/i.test(c.sql));
  assert(/cs\.status = \?/i.test(main!.sql), 'single status clause');
}

// list: array status (IN clause)
resetAll();
{
  routes.push({ match: /ORDER BY/i, handler: () => [[]] });
  routes.push({ match: /COUNT/i, handler: () => [[{ total: 0 }]] });
  await service.list({ status: ['active', 'draft'] });
  const main = queryLog.find(c => /ORDER BY/i.test(c.sql));
  assert(/cs\.status IN \(\?,\?\)/i.test(main!.sql), 'IN clause for array');
  assert(main!.params.includes('active'), 'active in params');
  assert(main!.params.includes('draft'), 'draft in params');
}

// ============================================================================
// update
// ============================================================================
console.log('\n── update ────────────────────────────────────────────────');

// update: not draft/active → throws
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'staged', git_branch: 'b' }]],
  });
  await assertThrows(
    () => service.update(1, { title: 'x' }, 1),
    'Cannot update metadata',
    'status check throws'
  );
}

// update: no valid fields
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'draft' }]],
  });
  await assertThrows(
    () => service.update(1, { notAllowed: 'x' }, 1),
    'No valid fields',
    'empty update throws'
  );
}

// update: happy with branch change
resetAll();
{
  let getOrThrowCalls = 0;
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => {
      getOrThrowCalls++;
      return [[{ id: 1, status: 'draft', git_branch: 'old' }]];
    },
  });
  routes.push({
    // branch check on the new branch
    match: /FROM change_sets\s+WHERE git_branch = \?/i,
    handler: () => [[]],
  });
  routes.push({
    match: /^UPDATE change_sets SET/i,
    handler: () => [{ affectedRows: 1 }],
  });
  // getById after update
  routes.push({
    match: /SELECT cs\.\*[\s\S]*FROM change_sets cs[\s\S]*WHERE cs\.id = \?/i,
    handler: () => [[{ id: 1, git_branch: 'new' }]],
  });
  routes.push({ match: /change_set_items csi/i, handler: () => [[]] });
  routes.push({ match: /change_set_events cse/i, handler: () => [[]] });

  const res = await service.update(1, {
    title: 'updated',
    git_branch: 'new',
    has_db_changes: false,
    migration_files: ['a'],
  }, 1);
  assertEq(res.id, 1, 'returned');
  const upd = queryLog.find(c => /^UPDATE change_sets SET/i.test(c.sql));
  assert(upd!.sql.includes('title = ?'), 'title clause');
  assert(upd!.sql.includes('has_db_changes = ?'), 'has_db_changes clause');
  assert(upd!.params.includes(0), 'has_db_changes 0 coerced');
  assert(upd!.params.includes(JSON.stringify(['a'])), 'migration_files JSON');
}

// ============================================================================
// transition — invalid
// ============================================================================
console.log('\n── transition: invalid ──────────────────────────────────');

resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'draft' }]],
  });
  await assertThrows(
    () => service.transition(1, 'promoted', 1),
    'Cannot transition',
    'invalid transition throws'
  );
}

// transition: ready_for_staging needs items + branch
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'active', git_branch: null }]],
  });
  // _validateItemsReady will be called — stub csiRows
  routes.push({
    match: /csi\.om_daily_item_id, csi\.is_required/i,
    handler: () => [[{ om_daily_item_id: 100, is_required: 1 }]],
  });
  hydrateRowsResponse = [{ om_daily_item_id: 100, is_required: 1, title: 'Item', item_status: 'done' }];
  await assertThrows(
    () => service.transition(1, 'ready_for_staging', 1),
    'git_branch',
    'ready_for_staging without branch throws'
  );
}

// ready_for_staging: items not ready
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'active', git_branch: 'x' }]],
  });
  routes.push({
    match: /csi\.om_daily_item_id, csi\.is_required/i,
    handler: () => [[{ om_daily_item_id: 100, is_required: 1 }]],
  });
  hydrateRowsResponse = [{ om_daily_item_id: 100, is_required: 1, title: 'blocker', item_status: 'in_progress' }];
  await assertThrows(
    () => service.transition(1, 'ready_for_staging', 1),
    'not ready',
    'blocker throws'
  );
}

// ready_for_staging: empty set
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'active', git_branch: 'x' }]],
  });
  routes.push({
    match: /csi\.om_daily_item_id, csi\.is_required/i,
    handler: () => [[]],
  });
  hydrateRowsResponse = [];
  await assertThrows(
    () => service.transition(1, 'ready_for_staging', 1),
    'empty change_set',
    'empty throws'
  );
}

// transition: staged needs build_run_id + commit_sha
console.log('\n── transition: staged ───────────────────────────────────');

resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'ready_for_staging' }]],
  });
  await assertThrows(
    () => service.transition(1, 'staged', 1, {}),
    'staging_build_run_id',
    'missing build run id'
  );
}

resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'ready_for_staging' }]],
  });
  await assertThrows(
    () => service.transition(1, 'staged', 1, { staging_build_run_id: 'r1' }),
    'staging_commit_sha',
    'missing commit sha'
  );
}

// staged: slot occupied
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'ready_for_staging' }]],
  });
  routes.push({
    match: /WHERE status IN \('staged', 'in_review'\)/i,
    handler: () => [[{ id: 2, code: 'CS-0002' }]],
  });
  await assertThrows(
    () => service.transition(1, 'staged', 1, { staging_build_run_id: 'r', staging_commit_sha: 's' }),
    'Staging slot occupied',
    'slot conflict'
  );
}

// staged: happy
resetAll();
{
  let getCall = 0;
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => {
      getCall++;
      return [[{ id: 1, status: 'ready_for_staging' }]];
    },
  });
  routes.push({
    match: /WHERE status IN \('staged', 'in_review'\)/i,
    handler: () => [[]],
  });
  routes.push({
    match: /^UPDATE change_sets SET status = \?/i,
    handler: () => [{}],
  });
  routes.push({
    match: /INSERT INTO change_set_events/i,
    handler: () => [{}],
  });
  // getById after
  routes.push({
    match: /SELECT cs\.\*[\s\S]*FROM change_sets cs[\s\S]*WHERE cs\.id = \?/i,
    handler: () => [[{ id: 1, status: 'staged' }]],
  });
  routes.push({ match: /change_set_items csi/i, handler: () => [[]] });
  routes.push({ match: /change_set_events cse/i, handler: () => [[]] });

  const res = await service.transition(1, 'staged', 7, {
    staging_build_run_id: 'run-1', staging_commit_sha: 'abc123',
  });
  assertEq(res.id, 1, 'returned');
  const upd = queryLog.find(c => /^UPDATE change_sets SET status = \?/i.test(c.sql));
  assert(upd!.sql.includes('staging_build_run_id = ?'), 'SET staging_build_run_id');
  assert(upd!.sql.includes('staged_at = ?'), 'SET staged_at');
  assertEq(upd!.params[0], 'staged', 'status param');
  assertEq(txBegan, 1, 'tx began');
  assertEq(txCommitted, 1, 'tx committed');
}

// ============================================================================
// transition: approved
// ============================================================================
console.log('\n── transition: approved ─────────────────────────────────');

// approved: db changes without review notes throws
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'in_review', has_db_changes: 1 }]],
  });
  await assertThrows(
    () => service.transition(1, 'approved', 1),
    'Review notes are required',
    'db changes need notes'
  );
}

// approved: happy
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'in_review', has_db_changes: 0, staging_commit_sha: 'abc123' }]],
  });
  routes.push({ match: /^UPDATE change_sets SET status = \?/i, handler: () => [{}] });
  routes.push({ match: /INSERT INTO change_set_events/i, handler: () => [{}] });
  routes.push({
    match: /SELECT cs\.\*[\s\S]*WHERE cs\.id = \?/i,
    handler: () => [[{ id: 1 }]],
  });
  routes.push({ match: /change_set_items csi/i, handler: () => [[]] });
  routes.push({ match: /change_set_events cse/i, handler: () => [[]] });
  await service.transition(1, 'approved', 9, { review_notes: 'LGTM' });
  const upd = queryLog.find(c => /^UPDATE change_sets SET status = \?/i.test(c.sql));
  assert(upd!.sql.includes('approved_commit_sha = ?'), 'locks approved_commit_sha');
  assert(upd!.sql.includes('reviewed_by = ?'), 'reviewed_by');
  assert(upd!.params.includes('abc123'), 'copies staging_commit_sha');
  assert(upd!.params.includes(9), 'userId as reviewer');
}

// ============================================================================
// transition: rejected
// ============================================================================
console.log('\n── transition: rejected ─────────────────────────────────');

resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'in_review' }]],
  });
  await assertThrows(
    () => service.transition(1, 'rejected', 1),
    'rejection_reason',
    'needs rejection_reason'
  );
}

resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'in_review' }]],
  });
  routes.push({ match: /^UPDATE change_sets SET status = \?/i, handler: () => [{}] });
  routes.push({ match: /INSERT INTO change_set_events/i, handler: () => [{}] });
  routes.push({
    match: /SELECT cs\.\*[\s\S]*WHERE cs\.id = \?/i,
    handler: () => [[{ id: 1 }]],
  });
  routes.push({ match: /change_set_items csi/i, handler: () => [[]] });
  routes.push({ match: /change_set_events cse/i, handler: () => [[]] });
  await service.transition(1, 'rejected', 1, { rejection_reason: 'bad' });
  const upd = queryLog.find(c => /^UPDATE change_sets SET status = \?/i.test(c.sql));
  assert(upd!.sql.includes('staging_build_run_id = ?'), 'clears staging');
  assert(upd!.sql.includes('approved_commit_sha = ?'), 'clears approved');
}

// ============================================================================
// transition: promoted
// ============================================================================
console.log('\n── transition: promoted ─────────────────────────────────');

resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'approved', approved_commit_sha: 'abc' }]],
  });
  await assertThrows(
    () => service.transition(1, 'promoted', 1, { prod_build_run_id: 'r' }),
    'prod_commit_sha',
    'needs prod commit sha'
  );
}

// SHA drift
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'approved', approved_commit_sha: 'abc123', code: 'CS-0001' }]],
  });
  await assertThrows(
    () => service.transition(1, 'promoted', 1, {
      prod_build_run_id: 'r', prod_commit_sha: 'different',
    }),
    'drift detected',
    'SHA drift rejected'
  );
}

// promoted: happy + snapshot
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'approved', approved_commit_sha: 'abc', code: 'CS-0001' }]],
  });
  routes.push({ match: /^UPDATE change_sets SET status = \?/i, handler: () => [{}] });
  routes.push({ match: /INSERT INTO change_set_events/i, handler: () => [{}] });
  routes.push({
    match: /SELECT cs\.\*[\s\S]*WHERE cs\.id = \?/i,
    handler: () => [[{ id: 1 }]],
  });
  routes.push({ match: /change_set_items csi/i, handler: () => [[]] });
  routes.push({ match: /change_set_events cse/i, handler: () => [[]] });
  quiet();
  await service.transition(1, 'promoted', 1, {
    prod_build_run_id: 'r', prod_commit_sha: 'abc',
  });
  loud();
  const upd = queryLog.find(c => /^UPDATE change_sets SET status = \?/i.test(c.sql));
  assert(upd!.sql.includes('pre_promote_snapshot_id = ?'), 'snapshot id column');
  assert(upd!.params.includes('snap-abc123'), 'snapshot id from execSync');
}

// promoted: snapshot fails gracefully
resetAll();
execSyncThrows = true;
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'approved', approved_commit_sha: 'abc', code: 'CS-0001' }]],
  });
  routes.push({ match: /^UPDATE change_sets SET status = \?/i, handler: () => [{}] });
  routes.push({ match: /INSERT INTO change_set_events/i, handler: () => [{}] });
  routes.push({
    match: /SELECT cs\.\*[\s\S]*WHERE cs\.id = \?/i,
    handler: () => [[{ id: 1 }]],
  });
  routes.push({ match: /change_set_items csi/i, handler: () => [[]] });
  routes.push({ match: /change_set_events cse/i, handler: () => [[]] });
  quiet();
  const res = await service.transition(1, 'promoted', 1, {
    prod_build_run_id: 'r', prod_commit_sha: 'abc',
  });
  loud();
  assertEq(res.id, 1, 'still succeeds');
}

// ============================================================================
// addItem
// ============================================================================
console.log('\n── addItem ───────────────────────────────────────────────');

// status check
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'staged' }]],
  });
  await assertThrows(
    () => service.addItem(1, 100, {}, 1),
    'Cannot add items',
    'status check'
  );
}

// item not found
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'draft' }]],
  });
  fetchByIdsResponse = new Map();
  await assertThrows(
    () => service.addItem(1, 999, {}, 1),
    'not found',
    'item missing'
  );
}

// already in another active change_set
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'draft' }]],
  });
  fetchByIdsResponse = new Map([[100, { id: 100, title: 'X', status: 'done' }]]);
  routes.push({
    match: /FROM change_set_items csi[\s\S]*JOIN change_sets cs2/i,
    handler: () => [[{ change_set_id: 2, code: 'CS-0002', status: 'active' }]],
  });
  await assertThrows(
    () => service.addItem(1, 100, {}, 1),
    'already in active',
    'dup active conflict'
  );
}

// happy path
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'draft' }]],
  });
  fetchByIdsResponse = new Map([[100, { id: 100, title: 'Fix bug', status: 'done' }]]);
  routes.push({
    match: /FROM change_set_items csi[\s\S]*JOIN change_sets cs2/i,
    handler: () => [[]],
  });
  routes.push({
    match: /^\s*INSERT INTO change_set_items/i,
    handler: () => [{}],
  });
  routes.push({ match: /INSERT INTO change_set_events/i, handler: () => [{}] });
  // getItems after
  routes.push({
    match: /FROM change_set_items csi[\s\S]*WHERE csi\.change_set_id = \?/i,
    handler: () => [[{ id: 1, om_daily_item_id: 100 }]],
  });
  const items = await service.addItem(1, 100, { sort_order: 3, is_required: true, notes: 'x' }, 5);
  assertEq(items.length, 1, 'returns items after add');
  const ins = queryLog.find(c => /^\s*INSERT INTO change_set_items/i.test(c.sql));
  assertEq(ins!.params[0], 1, 'change_set_id');
  assertEq(ins!.params[1], 100, 'om_daily_item_id');
  assertEq(ins!.params[2], 3, 'sort_order');
  assertEq(ins!.params[3], 1, 'is_required 1');
  assertEq(ins!.params[4], 'x', 'notes');
}

// ER_DUP_ENTRY
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'draft' }]],
  });
  fetchByIdsResponse = new Map([[100, { id: 100, title: 'X', status: 'done' }]]);
  routes.push({
    match: /FROM change_set_items csi[\s\S]*JOIN change_sets cs2/i,
    handler: () => [[]],
  });
  routes.push({
    match: /^\s*INSERT INTO change_set_items/i,
    handler: () => {
      const e: any = new Error('dup');
      e.code = 'ER_DUP_ENTRY';
      throw e;
    },
  });
  await assertThrows(
    () => service.addItem(1, 100, {}, 1),
    'already in this change_set',
    'ER_DUP_ENTRY mapped'
  );
}

// ============================================================================
// removeItem
// ============================================================================
console.log('\n── removeItem ────────────────────────────────────────────');

// not in set
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'draft' }]],
  });
  fetchByIdsResponse = new Map([[100, { id: 100, title: 'X' }]]);
  routes.push({
    match: /DELETE FROM change_set_items/i,
    handler: () => [{ affectedRows: 0 }],
  });
  await assertThrows(
    () => service.removeItem(1, 100, 1),
    'not in this',
    'not in set'
  );
}

// happy
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'draft' }]],
  });
  fetchByIdsResponse = new Map([[100, { id: 100, title: 'X' }]]);
  routes.push({
    match: /DELETE FROM change_set_items/i,
    handler: () => [{ affectedRows: 1 }],
  });
  routes.push({ match: /INSERT INTO change_set_events/i, handler: () => [{}] });
  routes.push({
    match: /FROM change_set_items csi[\s\S]*WHERE csi\.change_set_id = \?/i,
    handler: () => [[]],
  });
  const items = await service.removeItem(1, 100, 1);
  assertEq(items.length, 0, 'empty after remove');
}

// ============================================================================
// getChangeSetForItem / memberships
// ============================================================================
console.log('\n── membership lookups ───────────────────────────────────');

resetAll();
{
  routes.push({
    match: /FROM change_set_items csi\s+JOIN change_sets cs/i,
    handler: () => [[]],
  });
  const res = await service.getChangeSetForItem(1);
  assertEq(res, null, 'null when none');
}

resetAll();
{
  routes.push({
    match: /FROM change_set_items csi\s+JOIN change_sets cs/i,
    handler: () => [[{ id: 1, code: 'CS-0001', title: 'X', status: 'active', git_branch: 'b' }]],
  });
  const res = await service.getChangeSetForItem(1);
  assertEq(res.code, 'CS-0001', 'returned row');
}

// getChangeSetMemberships: empty input
resetAll();
{
  const res = await service.getChangeSetMemberships([]);
  assertEq(res, {}, 'empty input → empty map');
  assertEq(queryLog.length, 0, 'no DB call');
}

resetAll();
{
  routes.push({
    match: /csi\.om_daily_item_id, cs\.id AS change_set_id/i,
    handler: () => [[
      { om_daily_item_id: 10, change_set_id: 1, code: 'CS-0001', title: 'A', status: 'active' },
      { om_daily_item_id: 20, change_set_id: 2, code: 'CS-0002', title: 'B', status: 'draft' },
    ]],
  });
  const res = await service.getChangeSetMemberships([10, 20]);
  assertEq(res[10].code, 'CS-0001', 'map[10]');
  assertEq(res[20].status, 'draft', 'map[20]');
}

// ============================================================================
// addNote
// ============================================================================
console.log('\n── addNote ───────────────────────────────────────────────');

resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'draft' }]],
  });
  routes.push({ match: /INSERT INTO change_set_events/i, handler: () => [{}] });
  routes.push({
    match: /FROM change_set_events cse/i,
    handler: () => [[{ id: 1, event_type: 'note_added' }]],
  });
  const events = await service.addNote(1, 5, 'hello');
  assertEq(events.length, 1, 'returned events');
  const ins = queryLog.find(c => /INSERT INTO change_set_events/i.test(c.sql));
  assertEq(ins!.params[1], 'note_added', 'event_type');
  assertEq(ins!.params[5], 'hello', 'message');
}

// ============================================================================
// fastForward
// ============================================================================
console.log('\n── fastForward ───────────────────────────────────────────');

// wrong status
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'staged', git_branch: 'b' }]],
  });
  await assertThrows(
    () => service.fastForward(1, 1, {
      staging_build_run_id: 'r1', staging_commit_sha: 's1',
      prod_build_run_id: 'r2', prod_commit_sha: 's2',
    }),
    'Only draft or active',
    'wrong status'
  );
}

// no branch
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'draft', git_branch: null }]],
  });
  await assertThrows(
    () => service.fastForward(1, 1, {
      staging_build_run_id: 'r', staging_commit_sha: 's',
      prod_build_run_id: 'r2', prod_commit_sha: 's2',
    }),
    'git_branch',
    'needs branch'
  );
}

// missing build params
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'draft', git_branch: 'b' }]],
  });
  await assertThrows(
    () => service.fastForward(1, 1, { staging_build_run_id: 'r' }),
    'all required',
    'missing build metadata'
  );
}

// happy fast-forward
resetAll();
{
  routes.push({
    match: /SELECT \* FROM change_sets WHERE id = \?/i,
    handler: () => [[{ id: 1, status: 'active', git_branch: 'b', code: 'CS-0001' }]],
  });
  routes.push({
    match: /csi\.om_daily_item_id, csi\.is_required/i,
    handler: () => [[{ om_daily_item_id: 100, is_required: 1 }]],
  });
  hydrateRowsResponse = [{ om_daily_item_id: 100, is_required: 1, title: 'X', item_status: 'done' }];
  routes.push({
    match: /WHERE status IN \('staged', 'in_review'\)/i,
    handler: () => [[]],
  });
  routes.push({
    match: /UPDATE change_sets SET[\s\S]*status = 'promoted'/i,
    handler: () => [{}],
  });
  routes.push({ match: /INSERT INTO change_set_events/i, handler: () => [{}] });
  // getById at end
  routes.push({
    match: /SELECT cs\.\*[\s\S]*WHERE cs\.id = \?/i,
    handler: () => [[{ id: 1, status: 'promoted' }]],
  });
  routes.push({ match: /change_set_items csi/i, handler: () => [[]] });
  routes.push({ match: /change_set_events cse/i, handler: () => [[]] });
  quiet();
  const res = await service.fastForward(1, 9, {
    staging_build_run_id: 'sr', staging_commit_sha: 'ssha',
    prod_build_run_id: 'pr', prod_commit_sha: 'psha',
  });
  loud();
  assertEq(res.status, 'promoted', 'status promoted');
  assertEq(txBegan, 1, 'tx began');
  assertEq(txCommitted, 1, 'tx committed');
  const ev = queryLog.find(c => /INSERT INTO change_set_events/i.test(c.sql));
  assert(ev!.sql.includes("'fast_forwarded'"), 'event type fast_forwarded');
  assertEq(ev!.params[1], 'active', 'from_status preserved');
}

// ============================================================================
// getReleaseHistory
// ============================================================================
console.log('\n── getReleaseHistory ─────────────────────────────────────');

resetAll();
{
  routes.push({
    match: /WHERE cs\.status IN \('promoted', 'rolled_back'\)[\s\S]*ORDER BY cs\.promoted_at DESC/i,
    handler: () => [[{ id: 1 }, { id: 2 }]],
  });
  routes.push({
    match: /SELECT COUNT\(\*\) AS total FROM change_sets WHERE status IN/i,
    handler: () => [[{ total: 2 }]],
  });
  const res = await service.getReleaseHistory(10, 0);
  assertEq(res.total, 2, 'total');
  assertEq(res.items.length, 2, 'items');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
