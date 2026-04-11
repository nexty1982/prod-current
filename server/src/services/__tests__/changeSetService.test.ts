#!/usr/bin/env npx tsx
/**
 * Unit tests for services/changeSetService.js (OMD-1057)
 *
 * Core business logic for change_set delivery containers.
 * External deps (stubbed via require.cache BEFORE SUT require):
 *   - ../config/db-compat  → getAppPool
 *   - ./omDailyItemHydrator → fetchByIds, hydrateRows
 *   - child_process        → execSync (for pre-promote snapshot)
 *
 * Coverage target: CRUD, status transitions, item management, events,
 * release history, validation helpers.
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

// ── Fake pool with SQL routing ──────────────────────────────────────
type SqlRoute = {
  match: RegExp;
  respond?: (params: any[]) => any;
  rows?: any;
  throws?: Error;
};

let poolRoutes: SqlRoute[] = [];
type QueryCall = { sql: string; params: any[]; via: 'pool' | 'conn' };
let queryLog: QueryCall[] = [];
let connLog: string[] = [];

function setPoolRoutes(rs: SqlRoute[]) { poolRoutes = rs; }

function routeQuery(sql: string, params: any[]): any {
  for (const r of poolRoutes) {
    if (r.match.test(sql)) {
      if (r.throws) throw r.throws;
      if (r.respond) return r.respond(params);
      return r.rows ?? [[]];
    }
  }
  // Default: empty rows for SELECT, 0 affectedRows for INSERT/UPDATE/DELETE
  if (/^\s*SELECT/i.test(sql)) return [[]];
  return [{ insertId: 0, affectedRows: 0 }];
}

function makeConnection() {
  return {
    beginTransaction: async () => { connLog.push('begin'); },
    query: async (sql: string, params: any[] = []) => {
      queryLog.push({ sql, params, via: 'conn' });
      return routeQuery(sql, params);
    },
    commit: async () => { connLog.push('commit'); },
    rollback: async () => { connLog.push('rollback'); },
    release: () => { connLog.push('release'); },
  };
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params, via: 'pool' });
    return routeQuery(sql, params);
  },
  getConnection: async () => makeConnection(),
};

function resetAll() {
  queryLog.length = 0;
  connLog.length = 0;
  poolRoutes = [];
  itemMapStore.clear();
  hydrateRowsStore.length = 0;
  execSyncOutput = '';
  execSyncThrows = null;
}

// ── Stub db-compat ──────────────────────────────────────────────────
const dbCompatPath = require.resolve('../../config/db-compat');
require.cache[dbCompatPath] = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// ── Stub omDailyItemHydrator ────────────────────────────────────────
const itemMapStore: Map<number, any> = new Map();
let hydrateRowsStore: any[] = [];

const hydratorPath = require.resolve('../omDailyItemHydrator');
require.cache[hydratorPath] = {
  id: hydratorPath,
  filename: hydratorPath,
  loaded: true,
  exports: {
    fetchByIds: async (ids: number[], _fields: string[]) => {
      const m = new Map();
      for (const id of ids) {
        if (itemMapStore.has(id)) m.set(id, itemMapStore.get(id));
      }
      return m;
    },
    hydrateRows: async (rows: any[], _opts?: any) => {
      // Return pre-seeded hydrated rows if set, else merge from itemMapStore
      if (hydrateRowsStore.length) return hydrateRowsStore;
      return rows.map(r => {
        const item = itemMapStore.get(r.om_daily_item_id) || {};
        return { ...r, ...item };
      });
    },
  },
} as any;

// ── Stub child_process ──────────────────────────────────────────────
let execSyncOutput = '';
let execSyncThrows: Error | null = null;
const execSyncCalls: string[] = [];

const cpPath = require.resolve('child_process');
const realCp = require('child_process');
require.cache[cpPath] = {
  id: cpPath,
  filename: cpPath,
  loaded: true,
  exports: {
    ...realCp,
    execSync: (cmd: string, _opts: any) => {
      execSyncCalls.push(cmd);
      if (execSyncThrows) throw execSyncThrows;
      return execSyncOutput;
    },
  },
} as any;

// Silence console
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

const service = require('../changeSetService');

async function main() {

// ============================================================================
// create — happy path
// ============================================================================
console.log('\n── create: happy path ────────────────────────────────────');

resetAll();
// No existing change_set with the given branch
setPoolRoutes([
  { match: /git_branch = \? AND status NOT IN/, rows: [[]] },   // branch available
  { match: /INSERT INTO change_sets/, rows: [{ insertId: 7, affectedRows: 1 }] },
  { match: /UPDATE change_sets SET code = \?/, rows: [{ affectedRows: 1 }] },
  { match: /INSERT INTO change_set_events/, rows: [{ insertId: 1, affectedRows: 1 }] },
  // getById after create
  { match: /SELECT cs\.\*[\s\S]*FROM change_sets cs[\s\S]*WHERE cs\.id = \?/, rows: [[{ id: 7, code: 'CS-0007', title: 'T', status: 'draft' }]] },
  { match: /SELECT csi\.\*/, rows: [[]] },                       // getItems (empty)
  { match: /SELECT cse\.\*/, rows: [[]] },                       // getEvents (empty)
]);
{
  const cs = await service.create({
    title: 'T',
    description: 'D',
    change_type: 'feature',
    priority: 'high',
    git_branch: 'feature/x',
    has_db_changes: true,
    migration_files: ['a.sql'],
  }, 99);
  assertEq(cs.id, 7, 'returns created cs with id');
  assertEq(cs.code, 'CS-0007', 'code generated with id padding');
  assertEq(cs.item_count, 0, 'item_count=0');
  // Verify transaction lifecycle
  assert(connLog.includes('begin'), 'begin transaction');
  assert(connLog.includes('commit'), 'commit transaction');
  assert(connLog.includes('release'), 'release connection');
  assert(!connLog.includes('rollback'), 'no rollback');
  // Verify INSERT params
  const insert = queryLog.find(q => /INSERT INTO change_sets/.test(q.sql))!;
  assertEq(insert.params[0], 'T', 'title');
  assertEq(insert.params[1], 'D', 'description');
  assertEq(insert.params[2], 'feature', 'change_type');
  assertEq(insert.params[3], 'high', 'priority');
  assertEq(insert.params[4], 'feature/x', 'git_branch');
  assertEq(insert.params[5], 'stage_then_promote', 'deployment_strategy default');
  assertEq(insert.params[6], 1, 'has_db_changes=1');
  assertEq(insert.params[7], '["a.sql"]', 'migration_files JSON');
  assertEq(insert.params[10], 99, 'created_by userId');
  // Verify event insertion
  const event = queryLog.find(q => /INSERT INTO change_set_events/.test(q.sql))!;
  assert(event !== undefined, 'event logged');
}

// create with no optional fields — defaults applied
resetAll();
setPoolRoutes([
  { match: /INSERT INTO change_sets/, rows: [{ insertId: 1, affectedRows: 1 }] },
  { match: /UPDATE change_sets SET code = \?/, rows: [{ affectedRows: 1 }] },
  { match: /INSERT INTO change_set_events/, rows: [{ insertId: 1, affectedRows: 1 }] },
  { match: /SELECT cs\.\*[\s\S]*WHERE cs\.id = \?/, rows: [[{ id: 1, code: 'CS-0001', status: 'draft' }]] },
  { match: /SELECT csi\.\*/, rows: [[]] },
  { match: /SELECT cse\.\*/, rows: [[]] },
]);
{
  await service.create({ title: 'Minimal' }, 1);
  const insert = queryLog.find(q => /INSERT INTO change_sets/.test(q.sql))!;
  assertEq(insert.params[1], null, 'description default null');
  assertEq(insert.params[2], 'feature', 'change_type default feature');
  assertEq(insert.params[3], 'medium', 'priority default medium');
  assertEq(insert.params[4], null, 'git_branch default null');
  assertEq(insert.params[6], 0, 'has_db_changes default 0');
  assertEq(insert.params[7], null, 'migration_files default null');
}

// create — branch conflict throws
resetAll();
setPoolRoutes([
  { match: /git_branch = \? AND status NOT IN/, rows: [[{ id: 5, code: 'CS-0005', status: 'active' }]] },
]);
{
  let caught: any = null;
  try { await service.create({ title: 'T', git_branch: 'feature/x' }, 1); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'branch conflict throws');
  assert(caught?.message.includes('already assigned'), 'error mentions already assigned');
  assertEq(caught?.status, 409, '409 status');
}

// create — transaction rollback on INSERT failure
resetAll();
setPoolRoutes([
  { match: /INSERT INTO change_sets/, throws: new Error('db failure') },
]);
{
  let caught: Error | null = null;
  try { await service.create({ title: 'T' }, 1); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'INSERT failure rethrows');
  assert(connLog.includes('rollback'), 'transaction rolled back');
  assert(connLog.includes('release'), 'connection released on failure');
}

// ============================================================================
// getById
// ============================================================================
console.log('\n── getById ───────────────────────────────────────────────');

resetAll();
setPoolRoutes([
  { match: /SELECT cs\.\*[\s\S]*WHERE cs\.id = \?/, rows: [[{ id: 42, code: 'CS-0042', status: 'active' }]] },
  { match: /SELECT csi\.\*/, rows: [[{ id: 1, om_daily_item_id: 100, is_required: 1 }, { id: 2, om_daily_item_id: 101, is_required: 0 }]] },
  { match: /SELECT cse\.\*/, rows: [[{ id: 1, event_type: 'created' }]] },
]);
{
  const cs = await service.getById(42);
  assertEq(cs.id, 42, 'found');
  assertEq(cs.items.length, 2, '2 items attached');
  assertEq(cs.events.length, 1, '1 event');
  assertEq(cs.item_count, 2, 'item_count');
  assertEq(cs.required_item_count, 1, 'required_item_count counts is_required=1');
}

// Not found → null
resetAll();
setPoolRoutes([
  { match: /SELECT cs\.\*/, rows: [[]] },
]);
{
  const cs = await service.getById(999);
  assertEq(cs, null, 'not found → null');
}

// ============================================================================
// getByCode
// ============================================================================
console.log('\n── getByCode ─────────────────────────────────────────────');

resetAll();
setPoolRoutes([
  { match: /SELECT id FROM change_sets WHERE code = \?/, rows: [[{ id: 5 }]] },
  { match: /SELECT cs\.\*[\s\S]*WHERE cs\.id = \?/, rows: [[{ id: 5, code: 'CS-0005' }]] },
  { match: /SELECT csi\.\*/, rows: [[]] },
  { match: /SELECT cse\.\*/, rows: [[]] },
]);
{
  const cs = await service.getByCode('CS-0005');
  assertEq(cs.id, 5, 'found by code');
}

resetAll();
setPoolRoutes([{ match: /SELECT id FROM change_sets WHERE code = \?/, rows: [[]] }]);
{
  const cs = await service.getByCode('CS-9999');
  assertEq(cs, null, 'not found → null');
}

// ============================================================================
// list — filters
// ============================================================================
console.log('\n── list ──────────────────────────────────────────────────');

resetAll();
setPoolRoutes([
  { match: /SELECT cs\.\*[\s\S]*FROM change_sets cs[\s\S]*LIMIT/, rows: [[{ id: 1 }, { id: 2 }]] },
  { match: /SELECT COUNT/, rows: [[{ total: 2 }]] },
]);
{
  const r = await service.list();
  assertEq(r.items.length, 2, '2 items');
  assertEq(r.total, 2, 'total from count query');
  // Default limit/offset
  const listQuery = queryLog.find(q => /LIMIT \? OFFSET \?/.test(q.sql))!;
  assertEq(listQuery.params[0], 50, 'default limit 50');
  assertEq(listQuery.params[1], 0, 'default offset 0');
}

// Filter: status string
resetAll();
setPoolRoutes([
  { match: /SELECT cs\.\*/, rows: [[]] },
  { match: /SELECT COUNT/, rows: [[{ total: 0 }]] },
]);
{
  await service.list({ status: 'active', change_type: 'feature', priority: 'high', limit: 10, offset: 5 });
  const listQuery = queryLog.find(q => /LIMIT \? OFFSET \?/.test(q.sql))!;
  assert(listQuery.sql.includes('cs.status = ?'), 'status filter in WHERE');
  assert(listQuery.sql.includes('cs.change_type = ?'), 'change_type filter');
  assert(listQuery.sql.includes('cs.priority = ?'), 'priority filter');
  // Params: [status, change_type, priority, limit, offset]
  assertEq(listQuery.params[0], 'active', 'status param');
  assertEq(listQuery.params[1], 'feature', 'change_type param');
  assertEq(listQuery.params[2], 'high', 'priority param');
  assertEq(listQuery.params[3], 10, 'limit param');
  assertEq(listQuery.params[4], 5, 'offset param');
}

// Filter: status array
resetAll();
setPoolRoutes([
  { match: /SELECT cs\.\*/, rows: [[]] },
  { match: /SELECT COUNT/, rows: [[{ total: 0 }]] },
]);
{
  await service.list({ status: ['active', 'staged'] });
  const listQuery = queryLog.find(q => /LIMIT \? OFFSET \?/.test(q.sql))!;
  assert(/cs\.status IN \(\?,\?\)/.test(listQuery.sql), 'status IN clause');
  assertEq(listQuery.params[0], 'active', 'first status');
  assertEq(listQuery.params[1], 'staged', 'second status');
}

// ============================================================================
// update
// ============================================================================
console.log('\n── update ────────────────────────────────────────────────');

// Happy path — draft status allows update
resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'draft', git_branch: 'old-branch' }]] },
  { match: /git_branch = \? AND status NOT IN/, rows: [[]] },  // new branch available
  { match: /UPDATE change_sets SET/, rows: [{ affectedRows: 1 }] },
  { match: /SELECT cs\.\*[\s\S]*WHERE cs\.id = \?/, rows: [[{ id: 1, title: 'New Title', status: 'draft' }]] },
  { match: /SELECT csi\.\*/, rows: [[]] },
  { match: /SELECT cse\.\*/, rows: [[]] },
]);
{
  const cs = await service.update(1, {
    title: 'New Title',
    git_branch: 'new-branch',
    has_db_changes: true,
    migration_files: ['m1.sql'],
  }, 99);
  assertEq(cs.title, 'New Title', 'title updated');
  const updateQuery = queryLog.find(q => /^\s*UPDATE change_sets SET/.test(q.sql))!;
  assert(/title = \?/.test(updateQuery.sql), 'title set');
  assert(/git_branch = \?/.test(updateQuery.sql), 'git_branch set');
  assert(/has_db_changes = \?/.test(updateQuery.sql), 'has_db_changes set');
  // Verify has_db_changes coerced to 1
  assert(updateQuery.params.includes(1), 'has_db_changes=1');
  // Verify migration_files JSON
  assert(updateQuery.params.includes('["m1.sql"]'), 'migration_files JSON');
}

// Update disallowed when status not draft/active
resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'staged' }]] },
]);
{
  let caught: any = null;
  try { await service.update(1, { title: 'X' }, 1); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'staged status blocks update');
  assertEq(caught?.status, 400, '400 status');
}

// No valid fields to update
resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'draft' }]] },
]);
{
  let caught: any = null;
  try { await service.update(1, { bogus: 'x' }, 1); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'no valid fields throws');
  assertEq(caught?.status, 400, '400 status');
  assert(caught?.message.includes('No valid fields'), 'error message');
}

// ============================================================================
// transition — invalid transition
// ============================================================================
console.log('\n── transition: invalid ───────────────────────────────────');

resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'draft' }]] },
]);
{
  let caught: any = null;
  try { await service.transition(1, 'promoted', 99); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'draft → promoted blocked');
  assertEq(caught?.status, 400, '400 status');
  assert(caught?.message.includes('Cannot transition'), 'error mentions transition');
}

// Valid: draft → active
resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'draft' }]] },
  { match: /^\s*UPDATE change_sets SET status/, rows: [{ affectedRows: 1 }] },
  { match: /INSERT INTO change_set_events/, rows: [{ insertId: 1, affectedRows: 1 }] },
  { match: /SELECT cs\.\*[\s\S]*WHERE cs\.id = \?/, rows: [[{ id: 1, status: 'active' }]] },
  { match: /SELECT csi\.\*/, rows: [[]] },
  { match: /SELECT cse\.\*/, rows: [[]] },
]);
{
  const cs = await service.transition(1, 'active', 99);
  assertEq(cs.status, 'active', 'transitioned to active');
  assert(connLog.includes('commit'), 'committed');
}

// ============================================================================
// transition: ready_for_staging requires git_branch
// ============================================================================
console.log('\n── transition: ready_for_staging validation ──────────────');

resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'active', git_branch: null }]] },
  { match: /SELECT csi\.om_daily_item_id/, rows: [[{ om_daily_item_id: 100, is_required: 1 }]] },
]);
itemMapStore.set(100, { id: 100, title: 'Item', status: 'done' });
hydrateRowsStore = [{ om_daily_item_id: 100, is_required: 1, title: 'Item', item_status: 'done' }];
{
  let caught: any = null;
  try { await service.transition(1, 'ready_for_staging', 99); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'no git_branch blocks ready_for_staging');
  assert(caught?.message.includes('git_branch'), 'error mentions git_branch');
}

// ready_for_staging with empty change set
resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'active', git_branch: 'feature/x' }]] },
  { match: /SELECT csi\.om_daily_item_id/, rows: [[]] },
]);
hydrateRowsStore = [];
{
  let caught: any = null;
  try { await service.transition(1, 'ready_for_staging', 99); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'empty change set blocks staging');
  assert(caught?.message.includes('empty'), 'error mentions empty');
}

// ready_for_staging with items not ready
resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'active', git_branch: 'feature/x' }]] },
  { match: /SELECT csi\.om_daily_item_id/, rows: [[{ om_daily_item_id: 100, is_required: 1 }]] },
]);
hydrateRowsStore = [{ om_daily_item_id: 100, is_required: 1, title: 'Stuck', item_status: 'in_progress' }];
{
  let caught: any = null;
  try { await service.transition(1, 'ready_for_staging', 99); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'non-ready item blocks staging');
  assert(caught?.message.includes('not ready'), 'error mentions not ready');
}

// ready_for_staging — non-required items allowed to be incomplete
resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'active', git_branch: 'feature/x' }]] },
  { match: /SELECT csi\.om_daily_item_id/, rows: [[{ om_daily_item_id: 100, is_required: 0 }]] },
  { match: /^\s*UPDATE change_sets SET status/, rows: [{ affectedRows: 1 }] },
  { match: /INSERT INTO change_set_events/, rows: [{ insertId: 1, affectedRows: 1 }] },
  { match: /SELECT cs\.\*[\s\S]*WHERE cs\.id = \?/, rows: [[{ id: 1, status: 'ready_for_staging' }]] },
  { match: /SELECT csi\.\*/, rows: [[]] },
  { match: /SELECT cse\.\*/, rows: [[]] },
]);
hydrateRowsStore = [{ om_daily_item_id: 100, is_required: 0, title: 'Skip', item_status: 'in_progress' }];
{
  const cs = await service.transition(1, 'ready_for_staging', 99);
  assertEq(cs.status, 'ready_for_staging', 'non-required item passes');
}

// ============================================================================
// transition: staged requires build info
// ============================================================================
console.log('\n── transition: staged validation ─────────────────────────');

resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'ready_for_staging' }]] },
]);
{
  let caught: any = null;
  try { await service.transition(1, 'staged', 99); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'missing build id blocks');
  assert(caught?.message.includes('staging_build_run_id'), 'error mentions build id');
}

// Missing commit
resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'ready_for_staging' }]] },
]);
{
  let caught: any = null;
  try { await service.transition(1, 'staged', 99, { staging_build_run_id: 'b1' }); }
  catch (e: any) { caught = e; }
  assert(caught?.message.includes('staging_commit_sha'), 'error mentions commit sha');
}

// Slot occupied
resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'ready_for_staging' }]] },
  { match: /status IN \('staged', 'in_review'\)/, rows: [[{ id: 2, code: 'CS-0002' }]] },
]);
{
  let caught: any = null;
  try {
    await service.transition(1, 'staged', 99, {
      staging_build_run_id: 'b1',
      staging_commit_sha: 'abc',
    });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'occupied slot blocks');
  assertEq(caught?.status, 409, '409 status');
  assert(caught?.message.includes('CS-0002'), 'error mentions occupier');
}

// Staged success
resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'ready_for_staging' }]] },
  { match: /status IN \('staged', 'in_review'\)/, rows: [[]] },
  { match: /^\s*UPDATE change_sets SET status/, rows: [{ affectedRows: 1 }] },
  { match: /INSERT INTO change_set_events/, rows: [{ insertId: 1, affectedRows: 1 }] },
  { match: /SELECT cs\.\*[\s\S]*WHERE cs\.id = \?/, rows: [[{ id: 1, status: 'staged' }]] },
  { match: /SELECT csi\.\*/, rows: [[]] },
  { match: /SELECT cse\.\*/, rows: [[]] },
]);
{
  const cs = await service.transition(1, 'staged', 99, {
    staging_build_run_id: 'b1',
    staging_commit_sha: 'abc',
  });
  assertEq(cs.status, 'staged', 'staged');
}

// ============================================================================
// transition: approved with db_changes requires review notes
// ============================================================================
console.log('\n── transition: approved validation ───────────────────────');

resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'in_review', has_db_changes: 1 }]] },
]);
{
  let caught: any = null;
  try { await service.transition(1, 'approved', 99); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'db_changes without review_notes blocks');
  assert(caught?.message.includes('Review notes'), 'error mentions review notes');
}

// Approved — no db changes, no notes required
resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'in_review', has_db_changes: 0, staging_commit_sha: 'abc' }]] },
  { match: /^\s*UPDATE change_sets SET status/, rows: [{ affectedRows: 1 }] },
  { match: /INSERT INTO change_set_events/, rows: [{ insertId: 1, affectedRows: 1 }] },
  { match: /SELECT cs\.\*[\s\S]*WHERE cs\.id = \?/, rows: [[{ id: 1, status: 'approved' }]] },
  { match: /SELECT csi\.\*/, rows: [[]] },
  { match: /SELECT cse\.\*/, rows: [[]] },
]);
{
  const cs = await service.transition(1, 'approved', 99);
  assertEq(cs.status, 'approved', 'approved without notes OK');
}

// ============================================================================
// transition: rejected requires rejection_reason
// ============================================================================
console.log('\n── transition: rejected validation ───────────────────────');

resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'in_review' }]] },
]);
{
  let caught: any = null;
  try { await service.transition(1, 'rejected', 99); }
  catch (e: any) { caught = e; }
  assert(caught?.message.includes('rejection_reason'), 'error mentions rejection_reason');
}

// ============================================================================
// transition: promoted SHA drift
// ============================================================================
console.log('\n── transition: promoted SHA drift ────────────────────────');

resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'approved', approved_commit_sha: 'abc' }]] },
]);
{
  let caught: any = null;
  try {
    await service.transition(1, 'promoted', 99, {
      prod_build_run_id: 'b1',
      prod_commit_sha: 'different',
    });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'SHA drift blocks');
  assertEq(caught?.status, 409, '409 status');
  assert(caught?.message.includes('drift'), 'error mentions drift');
}

// Promoted happy path — execSync snapshot success
resetAll();
execSyncOutput = 'Snapshot saved: snap-123';
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, code: 'CS-0001', status: 'approved', approved_commit_sha: 'abc' }]] },
  { match: /^\s*UPDATE change_sets SET status/, rows: [{ affectedRows: 1 }] },
  { match: /INSERT INTO change_set_events/, rows: [{ insertId: 1, affectedRows: 1 }] },
  { match: /SELECT cs\.\*[\s\S]*WHERE cs\.id = \?/, rows: [[{ id: 1, status: 'promoted' }]] },
  { match: /SELECT csi\.\*/, rows: [[]] },
  { match: /SELECT cse\.\*/, rows: [[]] },
]);
quiet();
{
  const cs = await service.transition(1, 'promoted', 99, {
    prod_build_run_id: 'b1',
    prod_commit_sha: 'abc',
  });
  loud();
  assertEq(cs.status, 'promoted', 'promoted');
  // Verify snapshot was attempted
  assert(execSyncCalls.some(c => /pre-promote-CS-0001/.test(c)), 'pre-promote snapshot invoked');
  // Verify snapshot ID captured in UPDATE
  const updateQuery = queryLog.find(q => /UPDATE change_sets SET status/.test(q.sql))!;
  assert(updateQuery.params.includes('snap-123'), 'snapshot id in UPDATE params');
}

// Promoted with snapshot failure — non-fatal
resetAll();
execSyncThrows = new Error('no changes to snapshot');
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, code: 'CS-0001', status: 'approved', approved_commit_sha: 'abc' }]] },
  { match: /^\s*UPDATE change_sets SET status/, rows: [{ affectedRows: 1 }] },
  { match: /INSERT INTO change_set_events/, rows: [{ insertId: 1, affectedRows: 1 }] },
  { match: /SELECT cs\.\*[\s\S]*WHERE cs\.id = \?/, rows: [[{ id: 1, status: 'promoted' }]] },
  { match: /SELECT csi\.\*/, rows: [[]] },
  { match: /SELECT cse\.\*/, rows: [[]] },
]);
quiet();
{
  const cs = await service.transition(1, 'promoted', 99, {
    prod_build_run_id: 'b1',
    prod_commit_sha: 'abc',
  });
  loud();
  assertEq(cs.status, 'promoted', 'promoted despite snapshot failure');
}

// ============================================================================
// addItem
// ============================================================================
console.log('\n── addItem ───────────────────────────────────────────────');

resetAll();
itemMapStore.set(100, { id: 100, title: 'My Item', status: 'done' });
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'draft' }]] },
  // no conflict from other change sets
  { match: /SELECT csi\.change_set_id/, rows: [[]] },
  { match: /INSERT INTO change_set_items/, rows: [{ insertId: 1, affectedRows: 1 }] },
  { match: /INSERT INTO change_set_events/, rows: [{ insertId: 1, affectedRows: 1 }] },
  // getItems afterwards
  { match: /SELECT csi\.\*/, rows: [[{ id: 1, om_daily_item_id: 100 }]] },
]);
{
  const items = await service.addItem(1, 100, { sort_order: 5, is_required: true, notes: 'test' }, 99);
  assertEq(items.length, 1, 'item added, returns items');
  const insert = queryLog.find(q => /INSERT INTO change_set_items/.test(q.sql))!;
  assertEq(insert.params[0], 1, 'change_set_id');
  assertEq(insert.params[1], 100, 'om_daily_item_id');
  assertEq(insert.params[2], 5, 'sort_order');
  assertEq(insert.params[3], 1, 'is_required=1');
  assertEq(insert.params[4], 'test', 'notes');
}

// Item not found in omai_db
resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'draft' }]] },
]);
{
  let caught: any = null;
  try { await service.addItem(1, 999, {}, 99); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'missing item throws');
  assertEq(caught?.status, 404, '404 status');
}

// Item already in another change set
resetAll();
itemMapStore.set(100, { id: 100, title: 'My Item', status: 'done' });
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'draft' }]] },
  { match: /SELECT csi\.change_set_id/, rows: [[{ change_set_id: 2, code: 'CS-0002', status: 'active' }]] },
]);
{
  let caught: any = null;
  try { await service.addItem(1, 100, {}, 99); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'dup in other change set blocks');
  assertEq(caught?.status, 409, '409 status');
  assert(caught?.message.includes('CS-0002'), 'error mentions conflict');
}

// Disallowed status (not draft/active)
resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'staged' }]] },
]);
{
  let caught: any = null;
  try { await service.addItem(1, 100, {}, 99); }
  catch (e: any) { caught = e; }
  assertEq(caught?.status, 400, '400 status');
  assert(caught?.message.includes('add items'), 'error mentions add items');
}

// Duplicate in same change set (ER_DUP_ENTRY)
resetAll();
itemMapStore.set(100, { id: 100, title: 'My Item' });
{
  const dupErr = new Error('dup');
  (dupErr as any).code = 'ER_DUP_ENTRY';
  setPoolRoutes([
    { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'draft' }]] },
    { match: /SELECT csi\.change_set_id/, rows: [[]] },
    { match: /INSERT INTO change_set_items/, throws: dupErr },
  ]);
  let caught: any = null;
  try { await service.addItem(1, 100, {}, 99); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'dup entry throws');
  assertEq(caught?.status, 409, '409 status');
  assert(caught?.message.includes('already in this'), 'error mentions already in this');
}

// ============================================================================
// removeItem
// ============================================================================
console.log('\n── removeItem ────────────────────────────────────────────');

resetAll();
itemMapStore.set(100, { id: 100, title: 'My Item' });
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'draft' }]] },
  { match: /DELETE FROM change_set_items/, rows: [{ affectedRows: 1 }] },
  { match: /INSERT INTO change_set_events/, rows: [{ insertId: 1, affectedRows: 1 }] },
  { match: /SELECT csi\.\*/, rows: [[]] },
]);
{
  const items = await service.removeItem(1, 100, 99);
  assertEq(items.length, 0, 'empty after removal');
  const del = queryLog.find(q => /DELETE FROM change_set_items/.test(q.sql))!;
  assertEq(del.params[0], 1, 'change_set_id');
  assertEq(del.params[1], 100, 'om_daily_item_id');
}

// Item not in change set
resetAll();
itemMapStore.set(100, { id: 100, title: 'My Item' });
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'draft' }]] },
  { match: /DELETE FROM change_set_items/, rows: [{ affectedRows: 0 }] },
]);
{
  let caught: any = null;
  try { await service.removeItem(1, 100, 99); }
  catch (e: any) { caught = e; }
  assertEq(caught?.status, 404, '404 status');
}

// ============================================================================
// getChangeSetForItem / getChangeSetMemberships
// ============================================================================
console.log('\n── getChangeSetForItem / memberships ─────────────────────');

resetAll();
setPoolRoutes([
  { match: /SELECT cs\.id, cs\.code, cs\.title, cs\.status, cs\.git_branch[\s\S]*WHERE csi\.om_daily_item_id = \?/, rows: [[{ id: 5, code: 'CS-0005', title: 'T', status: 'active' }]] },
]);
{
  const cs = await service.getChangeSetForItem(100);
  assertEq(cs?.id, 5, 'returns membership');
  assertEq(cs?.code, 'CS-0005', 'code');
}

resetAll();
setPoolRoutes([{ match: /SELECT cs\.id, cs\.code, cs\.title, cs\.status/, rows: [[]] }]);
{
  const cs = await service.getChangeSetForItem(100);
  assertEq(cs, null, 'no membership → null');
}

// Empty array shortcut
resetAll();
{
  const map = await service.getChangeSetMemberships([]);
  assertEq(map, {}, 'empty array → empty map');
  assertEq(queryLog.length, 0, 'no query made');
}

// Bulk lookup
resetAll();
setPoolRoutes([
  {
    match: /SELECT csi\.om_daily_item_id, cs\.id AS change_set_id/,
    rows: [[
      { om_daily_item_id: 100, change_set_id: 5, code: 'CS-0005', title: 'T', status: 'active' },
      { om_daily_item_id: 101, change_set_id: 6, code: 'CS-0006', title: 'U', status: 'staged' },
    ]],
  },
]);
{
  const map = await service.getChangeSetMemberships([100, 101, 102]);
  assertEq(map[100]?.code, 'CS-0005', 'item 100 mapped');
  assertEq(map[101]?.code, 'CS-0006', 'item 101 mapped');
  assertEq(map[102], undefined, 'item 102 not in result');
}

// ============================================================================
// addNote
// ============================================================================
console.log('\n── addNote ───────────────────────────────────────────────');

resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'active' }]] },
  { match: /INSERT INTO change_set_events/, rows: [{ insertId: 1, affectedRows: 1 }] },
  { match: /SELECT cse\.\*/, rows: [[{ id: 1, event_type: 'note_added' }]] },
]);
{
  const events = await service.addNote(1, 99, 'Important note');
  assertEq(events.length, 1, 'returns events');
  const eventInsert = queryLog.find(q => /INSERT INTO change_set_events/.test(q.sql))!;
  assertEq(eventInsert.params[1], 'note_added', 'event_type');
  assertEq(eventInsert.params[5], 'Important note', 'message');
}

// ============================================================================
// fastForward
// ============================================================================
console.log('\n── fastForward ───────────────────────────────────────────');

// Disallowed status
resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'staged' }]] },
]);
{
  let caught: any = null;
  try { await service.fastForward(1, 99, {}); }
  catch (e: any) { caught = e; }
  assertEq(caught?.status, 400, '400 status');
  assert(caught?.message.includes('Cannot fast-forward'), 'error mentions cannot fast-forward');
}

// Missing branch
resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'active', git_branch: null }]] },
]);
{
  let caught: any = null;
  try { await service.fastForward(1, 99, {}); }
  catch (e: any) { caught = e; }
  assert(caught?.message.includes('git_branch'), 'error mentions git_branch');
}

// Missing build metadata
resetAll();
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, status: 'active', git_branch: 'feature/x' }]] },
]);
{
  let caught: any = null;
  try { await service.fastForward(1, 99, { staging_build_run_id: 'b' }); }
  catch (e: any) { caught = e; }
  assert(caught?.message.includes('prod_build_run_id') || caught?.message.includes('prod_commit_sha') || caught?.message.includes('required'),
    'error mentions required metadata');
}

// Happy path
resetAll();
itemMapStore.set(100, { id: 100, title: 'Ready', status: 'done' });
hydrateRowsStore = [{ om_daily_item_id: 100, is_required: 1, title: 'Ready', item_status: 'done' }];
execSyncOutput = 'Snapshot saved: snap-ff';
setPoolRoutes([
  { match: /SELECT \* FROM change_sets WHERE id = \?/, rows: [[{ id: 1, code: 'CS-0001', status: 'active', git_branch: 'feature/x' }]] },
  { match: /SELECT csi\.om_daily_item_id/, rows: [[{ om_daily_item_id: 100, is_required: 1 }]] },
  { match: /status IN \('staged', 'in_review'\)/, rows: [[]] },
  { match: /^\s*UPDATE change_sets SET/, rows: [{ affectedRows: 1 }] },
  { match: /INSERT INTO change_set_events/, rows: [{ insertId: 1, affectedRows: 1 }] },
  { match: /SELECT cs\.\*[\s\S]*WHERE cs\.id = \?/, rows: [[{ id: 1, status: 'promoted' }]] },
  { match: /SELECT csi\.\*/, rows: [[]] },
  { match: /SELECT cse\.\*/, rows: [[]] },
]);
quiet();
{
  const cs = await service.fastForward(1, 99, {
    staging_build_run_id: 'sb',
    staging_commit_sha: 'sha1',
    prod_build_run_id: 'pb',
    prod_commit_sha: 'sha1',
  });
  loud();
  assertEq(cs.status, 'promoted', 'fast-forwarded to promoted');
  assert(connLog.includes('commit'), 'transaction committed');
  const eventInsert = queryLog.find(q => /INSERT INTO change_set_events/.test(q.sql))!;
  assert(/fast_forwarded/.test(eventInsert.sql), 'event type fast_forwarded in SQL');
}

// ============================================================================
// getReleaseHistory
// ============================================================================
console.log('\n── getReleaseHistory ─────────────────────────────────────');

resetAll();
setPoolRoutes([
  { match: /WHERE cs\.status IN \('promoted', 'rolled_back'\)[\s\S]*LIMIT/, rows: [[{ id: 1, status: 'promoted' }, { id: 2, status: 'rolled_back' }]] },
  { match: /SELECT COUNT.*WHERE status IN \('promoted', 'rolled_back'\)/, rows: [[{ total: 2 }]] },
]);
{
  const r = await service.getReleaseHistory(10, 5);
  assertEq(r.items.length, 2, '2 items');
  assertEq(r.total, 2, 'total from count');
  const listQuery = queryLog.find(q => /WHERE cs\.status IN \('promoted'/.test(q.sql))!;
  assertEq(listQuery.params[0], 10, 'limit param');
  assertEq(listQuery.params[1], 5, 'offset param');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
