#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRegistryService.js
 *
 * CRUD wrapper over the `agent_registry` table. Only dep is `../config/db`
 * (getAppPool) and `uuid` (for createAgent id). Both stubbed via require.cache.
 *
 * Coverage:
 *   - VALID_STATUSES / VALID_PROVIDERS constants
 *   - listAgents: filter composition (status, provider, capability) + ORDER BY
 *                 + row parsing (_parseAgent)
 *   - getAgent: hit → parsed row; miss → null
 *   - getAgentByName: case-insensitive SQL shape + null on miss
 *   - getByCapability: JSON_CONTAINS + active-only + ordering
 *   - createAgent:
 *       · throws without name/provider/model_id
 *       · throws on invalid provider
 *       · INSERT columns + JSON-serializes capabilities/config
 *       · default priority 50, null config when absent
 *       · returns { agent_id, name }
 *   - updateAgent:
 *       · only whitelisted fields; unknown ignored
 *       · capabilities/config JSON-serialized, others pass through
 *       · throws when no valid fields
 *       · throws when affectedRows=0
 *   - setStatus:
 *       · throws on invalid status
 *       · throws when affectedRows=0
 *       · success on whitelisted status
 *
 * Run: npx tsx server/src/services/__tests__/agentRegistryService.test.ts
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

// ── Scriptable fake pool (SQL-routed) ───────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Route = { match: RegExp; respond?: (params: any[]) => any; rows?: any };
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        const out = r.respond ? r.respond(params) : r.rows;
        return [out];
      }
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: dbStub,
} as any;

// Stub uuid
const uuidStub = { v4: () => 'test-uuid-1234' };
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: uuidStub,
} as any;

function resetQueries() { queryLog.length = 0; routes = []; }

const svc = require('../agentRegistryService');
const {
  VALID_STATUSES,
  VALID_PROVIDERS,
  listAgents,
  getAgent,
  getAgentByName,
  getByCapability,
  createAgent,
  updateAgent,
  setStatus,
} = svc;

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');

assertEq(VALID_STATUSES, ['active', 'inactive', 'deprecated'], 'VALID_STATUSES');
assertEq(VALID_PROVIDERS, ['anthropic', 'openai', 'google', 'local'], 'VALID_PROVIDERS');

// ============================================================================
// listAgents — no filters
// ============================================================================
console.log('\n── listAgents: no filters ────────────────────────────────');

resetQueries();
routes.push({
  match: /FROM agent_registry/,
  rows: [
    { id: 'a1', name: 'Claude', capabilities: '["code","chat"]', config: '{"k":1}' },
    { id: 'a2', name: 'GPT', capabilities: null, config: null },
  ],
});
{
  const result = await listAgents();
  assertEq(queryLog.length, 1, 'one query');
  assert(/WHERE 1=1/.test(queryLog[0].sql), 'WHERE 1=1');
  assert(/ORDER BY default_priority ASC, name ASC/.test(queryLog[0].sql), 'ORDER BY clause');
  assertEq(queryLog[0].params, [], 'no params');
  assertEq(result.length, 2, '2 rows');
  assertEq(result[0].capabilities, ['code', 'chat'], 'capabilities parsed');
  assertEq(result[0].config, { k: 1 }, 'config parsed');
  assertEq(result[1].capabilities, [], 'null capabilities → []');
  assertEq(result[1].config, null, 'null config → null');
}

// ============================================================================
// listAgents — status filter
// ============================================================================
console.log('\n── listAgents: status filter ─────────────────────────────');

resetQueries();
routes.push({ match: /FROM agent_registry/, rows: [] });
{
  await listAgents({ status: 'active' });
  assert(/status = \?/.test(queryLog[0].sql), 'status clause');
  assertEq(queryLog[0].params, ['active'], 'status param');
}

// provider filter
resetQueries();
routes.push({ match: /FROM agent_registry/, rows: [] });
{
  await listAgents({ provider: 'anthropic' });
  assert(/provider = \?/.test(queryLog[0].sql), 'provider clause');
  assertEq(queryLog[0].params, ['anthropic'], 'provider param');
}

// capability filter
resetQueries();
routes.push({ match: /FROM agent_registry/, rows: [] });
{
  await listAgents({ capability: 'code' });
  assert(/JSON_CONTAINS\(capabilities, \?\)/.test(queryLog[0].sql), 'JSON_CONTAINS');
  assertEq(queryLog[0].params, ['"code"'], 'JSON-stringified capability');
}

// combined filters
resetQueries();
routes.push({ match: /FROM agent_registry/, rows: [] });
{
  await listAgents({ status: 'active', provider: 'openai', capability: 'vision' });
  assertEq(queryLog[0].params, ['active', 'openai', '"vision"'], 'all 3 params in order');
}

// ============================================================================
// getAgent
// ============================================================================
console.log('\n── getAgent ──────────────────────────────────────────────');

// Hit
resetQueries();
routes.push({
  match: /WHERE id = \?/,
  rows: [{ id: 'a1', name: 'Claude', capabilities: '["x"]', config: null }],
});
{
  const r = await getAgent('a1');
  assertEq(queryLog[0].params, ['a1'], 'id param');
  assertEq(r.name, 'Claude', 'returns parsed agent');
  assertEq(r.capabilities, ['x'], 'capabilities parsed');
}

// Miss → null
resetQueries();
routes.push({ match: /WHERE id = \?/, rows: [] });
{
  const r = await getAgent('missing');
  assertEq(r, null, 'miss → null');
}

// ============================================================================
// getAgentByName
// ============================================================================
console.log('\n── getAgentByName ────────────────────────────────────────');

resetQueries();
routes.push({
  match: /LOWER\(name\) = LOWER\(\?\)/,
  rows: [{ id: 'a1', name: 'Claude', capabilities: null, config: null }],
});
{
  const r = await getAgentByName('claude');
  assertEq(queryLog[0].params, ['claude'], 'name param');
  assertEq(r.name, 'Claude', 'returns agent');
}

resetQueries();
routes.push({ match: /LOWER\(name\)/, rows: [] });
{
  const r = await getAgentByName('nope');
  assertEq(r, null, 'miss → null');
}

// ============================================================================
// getByCapability
// ============================================================================
console.log('\n── getByCapability ───────────────────────────────────────');

resetQueries();
routes.push({
  match: /status = 'active'/,
  rows: [
    { id: 'a1', name: 'Claude', capabilities: '["code"]', config: null },
    { id: 'a2', name: 'GPT', capabilities: '["code","chat"]', config: null },
  ],
});
{
  const r = await getByCapability('code');
  assert(/status = 'active'/.test(queryLog[0].sql), 'active only');
  assert(/JSON_CONTAINS\(capabilities, \?\)/.test(queryLog[0].sql), 'JSON_CONTAINS');
  assert(/ORDER BY default_priority ASC/.test(queryLog[0].sql), 'ORDER BY');
  assertEq(queryLog[0].params, ['"code"'], 'JSON-stringified capability');
  assertEq(r.length, 2, '2 rows');
  assertEq(r[0].capabilities, ['code'], 'capabilities parsed');
}

// ============================================================================
// createAgent — validation
// ============================================================================
console.log('\n── createAgent: validation ───────────────────────────────');

// missing name
{
  let caught: any = null;
  try { await createAgent({ provider: 'anthropic', model_id: 'claude-4' }); }
  catch (e) { caught = e; }
  assert(caught && /required/.test(caught.message), 'missing name throws');
}

// missing provider
{
  let caught: any = null;
  try { await createAgent({ name: 'X', model_id: 'm' }); }
  catch (e) { caught = e; }
  assert(caught && /required/.test(caught.message), 'missing provider throws');
}

// missing model_id
{
  let caught: any = null;
  try { await createAgent({ name: 'X', provider: 'anthropic' }); }
  catch (e) { caught = e; }
  assert(caught && /required/.test(caught.message), 'missing model_id throws');
}

// invalid provider
{
  let caught: any = null;
  try { await createAgent({ name: 'X', provider: 'badprov', model_id: 'm' }); }
  catch (e) { caught = e; }
  assert(caught && /Invalid provider/.test(caught.message), 'invalid provider throws');
  assert(caught && caught.message.includes('anthropic'), 'error lists valid providers');
}

// ============================================================================
// createAgent — happy path
// ============================================================================
console.log('\n── createAgent: happy path ───────────────────────────────');

resetQueries();
routes.push({ match: /INSERT INTO agent_registry/, rows: {} });
{
  const result = await createAgent({
    name: 'Claude',
    provider: 'anthropic',
    model_id: 'claude-opus',
    capabilities: ['code', 'chat'],
    default_priority: 10,
    config: { temp: 0.5 },
    cost_per_1k_input: 15,
    cost_per_1k_output: 75,
  });
  assertEq(result, { agent_id: 'test-uuid-1234', name: 'Claude' }, 'returns id + name');
  assertEq(queryLog.length, 1, 'one INSERT');
  assert(/INSERT INTO agent_registry/.test(queryLog[0].sql), 'INSERT SQL');
  const p = queryLog[0].params;
  assertEq(p[0], 'test-uuid-1234', 'uuid param');
  assertEq(p[1], 'Claude', 'name param');
  assertEq(p[2], 'anthropic', 'provider param');
  assertEq(p[3], 'claude-opus', 'model_id param');
  assertEq(p[4], JSON.stringify(['code', 'chat']), 'capabilities JSON');
  assertEq(p[5], 10, 'priority');
  assertEq(p[6], JSON.stringify({ temp: 0.5 }), 'config JSON');
  assertEq(p[7], 15, 'cost_per_1k_input');
  assertEq(p[8], 75, 'cost_per_1k_output');
}

// defaults: missing capabilities/config/priority
resetQueries();
routes.push({ match: /INSERT INTO agent_registry/, rows: {} });
{
  await createAgent({ name: 'GPT', provider: 'openai', model_id: 'gpt-4' });
  const p = queryLog[0].params;
  assertEq(p[4], '[]', 'default capabilities = "[]"');
  assertEq(p[5], 50, 'default priority = 50');
  assertEq(p[6], null, 'default config = null');
  assertEq(p[7], null, 'default cost_per_1k_input = null');
  assertEq(p[8], null, 'default cost_per_1k_output = null');
}

// ============================================================================
// updateAgent
// ============================================================================
console.log('\n── updateAgent ───────────────────────────────────────────');

// partial update with mixed fields
resetQueries();
routes.push({ match: /UPDATE agent_registry/, rows: { affectedRows: 1 } });
{
  const r = await updateAgent('a1', {
    name: 'NewName',
    capabilities: ['x', 'y'],
    config: { a: 1 },
    default_priority: 5,
    unknown_field: 'ignored',
  });
  assertEq(r, { success: true }, 'returns success');
  assertEq(queryLog.length, 1, 'one UPDATE');
  const sql = queryLog[0].sql;
  assert(/UPDATE agent_registry SET/.test(sql), 'UPDATE SQL');
  assert(/name = \?/.test(sql), 'name SET');
  assert(/capabilities = \?/.test(sql), 'capabilities SET');
  assert(/config = \?/.test(sql), 'config SET');
  assert(/default_priority = \?/.test(sql), 'priority SET');
  assert(!/unknown_field/.test(sql), 'unknown field skipped');
  assert(/WHERE id = \?/.test(sql), 'WHERE id clause');
  // params order follows `allowed` array: name, provider, model_id, capabilities,
  // default_priority, config, ... then id last
  const p = queryLog[0].params;
  assertEq(p[p.length - 1], 'a1', 'id is last param');
  // capabilities and config should be JSON-stringified
  assert(p.includes(JSON.stringify(['x', 'y'])), 'capabilities JSON-serialized');
  assert(p.includes(JSON.stringify({ a: 1 })), 'config JSON-serialized');
  assert(p.includes('NewName'), 'name passed through');
  assert(p.includes(5), 'priority passed through');
}

// no valid fields
{
  let caught: any = null;
  try { await updateAgent('a1', { unknown: 'x' }); }
  catch (e) { caught = e; }
  assert(caught && /No valid fields/.test(caught.message), 'no valid fields throws');
}

// empty updates
{
  let caught: any = null;
  try { await updateAgent('a1', {}); }
  catch (e) { caught = e; }
  assert(caught && /No valid fields/.test(caught.message), 'empty updates throws');
}

// affectedRows = 0 → not found
resetQueries();
routes.push({ match: /UPDATE agent_registry/, rows: { affectedRows: 0 } });
{
  let caught: any = null;
  try { await updateAgent('missing', { name: 'X' }); }
  catch (e) { caught = e; }
  assert(caught && /not found/.test(caught.message), '0 affected → Agent not found');
}

// only allowed fields: provider + model_id
resetQueries();
routes.push({ match: /UPDATE agent_registry/, rows: { affectedRows: 1 } });
{
  await updateAgent('a1', { provider: 'google', model_id: 'gemini' });
  const sql = queryLog[0].sql;
  assert(/provider = \?/.test(sql), 'provider SET');
  assert(/model_id = \?/.test(sql), 'model_id SET');
  assertEq(queryLog[0].params, ['google', 'gemini', 'a1'], 'params in allowed order');
}

// cost fields
resetQueries();
routes.push({ match: /UPDATE agent_registry/, rows: { affectedRows: 1 } });
{
  await updateAgent('a1', { cost_per_1k_input: 5, cost_per_1k_output: 25 });
  assertEq(queryLog[0].params, [5, 25, 'a1'], 'cost params (raw, not JSON)');
}

// ============================================================================
// setStatus
// ============================================================================
console.log('\n── setStatus ─────────────────────────────────────────────');

// valid status
resetQueries();
routes.push({ match: /UPDATE agent_registry SET status/, rows: { affectedRows: 1 } });
{
  const r = await setStatus('a1', 'active');
  assertEq(r, { success: true }, 'returns success');
  assertEq(queryLog[0].params, ['active', 'a1'], 'status, id params');
}

// inactive
resetQueries();
routes.push({ match: /UPDATE agent_registry SET status/, rows: { affectedRows: 1 } });
{
  await setStatus('a1', 'inactive');
  assertEq(queryLog[0].params[0], 'inactive', 'inactive ok');
}

// deprecated
resetQueries();
routes.push({ match: /UPDATE agent_registry SET status/, rows: { affectedRows: 1 } });
{
  await setStatus('a1', 'deprecated');
  assertEq(queryLog[0].params[0], 'deprecated', 'deprecated ok');
}

// invalid status
{
  let caught: any = null;
  try { await setStatus('a1', 'archived'); }
  catch (e) { caught = e; }
  assert(caught && /Invalid status/.test(caught.message), 'invalid status throws');
  assert(caught && caught.message.includes('active'), 'error lists valid statuses');
}

// not found
resetQueries();
routes.push({ match: /UPDATE agent_registry SET status/, rows: { affectedRows: 0 } });
{
  let caught: any = null;
  try { await setStatus('missing', 'active'); }
  catch (e) { caught = e; }
  assert(caught && /not found/.test(caught.message), '0 affected → Agent not found');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main()

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
