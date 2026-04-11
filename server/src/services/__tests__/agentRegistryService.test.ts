#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRegistryService.js (OMD-1044)
 *
 * Covers:
 *   - listAgents — filter composition (status, provider, capability JSON_CONTAINS)
 *   - getAgent — by id, returns null when missing
 *   - getAgentByName — case-insensitive SQL
 *   - getByCapability — active-only, JSON_CONTAINS
 *   - createAgent — required fields, provider whitelist, INSERT params,
 *     JSON serialization of capabilities/config, defaults for priority
 *   - updateAgent — partial update with JSON serialization, "No valid fields"
 *     and "not found" errors
 *   - setStatus — status whitelist + not-found
 *   - _parseAgent (indirectly) — capabilities/config JSON parsed
 *
 * Stubs ../config/db and uuid via require.cache.
 *
 * Run from server/: npx tsx src/services/__tests__/agentRegistryService.test.ts
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

// ── Scriptable SQL pool ───────────────────────────────────────────────
type Call = { sql: string; params: any[] };
const calls: Call[] = [];

type Route = { match: RegExp; respond?: (params: any[]) => any; rows?: any };
let routes: Route[] = [];

function resetDb() {
  calls.length = 0;
  routes = [];
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    calls.push({ sql, params });
    for (const route of routes) {
      if (route.match.test(sql)) {
        const result = route.respond ? route.respond(params) : route.rows;
        return [result];
      }
    }
    return [[]];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// ── uuid stub ─────────────────────────────────────────────────────────
let nextUuid = 'uuid-1';
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath, filename: uuidPath, loaded: true,
  exports: { v4: () => nextUuid },
} as any;

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
} = require('../agentRegistryService');

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── constants ─────────────────────────────────────────────');

assertEq(VALID_STATUSES, ['active', 'inactive', 'deprecated'], 'VALID_STATUSES');
assertEq(VALID_PROVIDERS, ['anthropic', 'openai', 'google', 'local'], 'VALID_PROVIDERS');

// ============================================================================
// listAgents
// ============================================================================
console.log('\n── listAgents ────────────────────────────────────────────');

// No filters
resetDb();
routes = [{
  match: /FROM agent_registry/i,
  rows: [
    { id: '1', name: 'A', capabilities: '["chat"]', config: null },
    { id: '2', name: 'B', capabilities: null, config: '{"temp":0.5}' },
  ],
}];

{
  const agents = await listAgents();
  assertEq(agents.length, 2, '2 agents');
  assertEq(agents[0].capabilities, ['chat'], 'A capabilities parsed');
  assertEq(agents[0].config, null, 'A null config');
  assertEq(agents[1].capabilities, [], 'B null capabilities → []');
  assertEq(agents[1].config, { temp: 0.5 }, 'B config parsed');
  assert(/WHERE 1=1/.test(calls[0].sql), 'WHERE 1=1 default');
  assertEq(calls[0].params.length, 0, 'no params default');
}

// status filter
resetDb();
routes = [{ match: /FROM agent_registry/i, rows: [] }];
{
  await listAgents({ status: 'active' });
  assert(/status = \?/.test(calls[0].sql), 'status condition');
  assertEq(calls[0].params, ['active'], 'status param');
}

// provider filter
resetDb();
routes = [{ match: /FROM agent_registry/i, rows: [] }];
{
  await listAgents({ provider: 'anthropic' });
  assert(/provider = \?/.test(calls[0].sql), 'provider condition');
  assertEq(calls[0].params, ['anthropic'], 'provider param');
}

// capability filter (JSON_CONTAINS)
resetDb();
routes = [{ match: /FROM agent_registry/i, rows: [] }];
{
  await listAgents({ capability: 'code-gen' });
  assert(/JSON_CONTAINS/.test(calls[0].sql), 'JSON_CONTAINS condition');
  assertEq(calls[0].params, [JSON.stringify('code-gen')], 'capability serialized');
}

// All filters
resetDb();
routes = [{ match: /FROM agent_registry/i, rows: [] }];
{
  await listAgents({ status: 'active', provider: 'openai', capability: 'docs' });
  assertEq(calls[0].params.length, 3, '3 params');
  assert(/ORDER BY default_priority ASC, name ASC/.test(calls[0].sql), 'ordering clause');
}

// ============================================================================
// getAgent
// ============================================================================
console.log('\n── getAgent ──────────────────────────────────────────────');

resetDb();
routes = [{
  match: /FROM agent_registry WHERE id/i,
  rows: [{ id: 'x', name: 'X', capabilities: '["a","b"]', config: null }],
}];
{
  const a = await getAgent('x');
  assertEq(a.id, 'x', 'id');
  assertEq(a.capabilities, ['a', 'b'], 'capabilities parsed');
  assertEq(calls[0].params, ['x'], 'id passed');
}

resetDb();
routes = [{ match: /FROM agent_registry WHERE id/i, rows: [] }];
{
  const a = await getAgent('missing');
  assertEq(a, null, 'missing → null');
}

// ============================================================================
// getAgentByName
// ============================================================================
console.log('\n── getAgentByName ────────────────────────────────────────');

resetDb();
routes = [{
  match: /LOWER\(name\) = LOWER\(\?\)/i,
  rows: [{ id: 'y', name: 'Claude', capabilities: null, config: null }],
}];
{
  const a = await getAgentByName('claude');
  assertEq(a.id, 'y', 'found');
  assertEq(calls[0].params, ['claude'], 'name passed');
}

resetDb();
routes = [{ match: /LOWER\(name\) = LOWER\(\?\)/i, rows: [] }];
{
  assertEq(await getAgentByName('nope'), null, 'missing → null');
}

// ============================================================================
// getByCapability
// ============================================================================
console.log('\n── getByCapability ───────────────────────────────────────');

resetDb();
routes = [{
  match: /status = 'active' AND JSON_CONTAINS/i,
  rows: [
    { id: '1', name: 'A', capabilities: '["code"]', config: null },
  ],
}];
{
  const agents = await getByCapability('code');
  assertEq(agents.length, 1, '1 matching');
  assertEq(agents[0].capabilities, ['code'], 'parsed');
  assertEq(calls[0].params, [JSON.stringify('code')], 'capability serialized');
}

// ============================================================================
// createAgent
// ============================================================================
console.log('\n── createAgent: validation ───────────────────────────────');

// Missing name
{
  let caught: Error | null = null;
  try { await createAgent({ provider: 'anthropic', model_id: 'claude-x' } as any); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'missing name throws');
  assert(caught !== null && /required/i.test(caught.message), 'mentions required');
}

// Missing provider
{
  let caught: Error | null = null;
  try { await createAgent({ name: 'x', model_id: 'm' } as any); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'missing provider throws');
}

// Missing model_id
{
  let caught: Error | null = null;
  try { await createAgent({ name: 'x', provider: 'anthropic' } as any); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'missing model_id throws');
}

// Invalid provider
{
  let caught: Error | null = null;
  try {
    await createAgent({ name: 'x', provider: 'bogus', model_id: 'm' } as any);
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid provider throws');
  assert(caught !== null && /Invalid provider/.test(caught.message), 'mentions provider');
}

console.log('\n── createAgent: happy path ───────────────────────────────');

// Minimal create
resetDb();
nextUuid = 'new-agent-1';
routes = [{ match: /INSERT INTO agent_registry/i, rows: {} }];
{
  const r = await createAgent({
    name: 'Claude', provider: 'anthropic', model_id: 'claude-3',
  } as any);
  assertEq(r.agent_id, 'new-agent-1', 'returns id');
  assertEq(r.name, 'Claude', 'returns name');
  const c = calls[0];
  assertEq(c.params[0], 'new-agent-1', 'id');
  assertEq(c.params[1], 'Claude', 'name');
  assertEq(c.params[2], 'anthropic', 'provider');
  assertEq(c.params[3], 'claude-3', 'model_id');
  assertEq(c.params[4], JSON.stringify([]), 'capabilities defaults to []');
  assertEq(c.params[5], 50, 'default_priority defaults to 50');
  assertEq(c.params[6], null, 'config defaults to null');
  assertEq(c.params[7], null, 'cost_per_1k_input defaults to null');
  assertEq(c.params[8], null, 'cost_per_1k_output defaults to null');
}

// Full create
resetDb();
nextUuid = 'new-agent-2';
routes = [{ match: /INSERT INTO agent_registry/i, rows: {} }];
{
  await createAgent({
    name: 'GPT', provider: 'openai', model_id: 'gpt-4',
    capabilities: ['code', 'chat'],
    default_priority: 10,
    config: { temp: 0.7 },
    cost_per_1k_input: 0.01,
    cost_per_1k_output: 0.03,
  } as any);
  const c = calls[0];
  assertEq(c.params[4], JSON.stringify(['code', 'chat']), 'capabilities JSON');
  assertEq(c.params[5], 10, 'priority');
  assertEq(c.params[6], JSON.stringify({ temp: 0.7 }), 'config JSON');
  assertEq(c.params[7], 0.01, 'cost input');
  assertEq(c.params[8], 0.03, 'cost output');
}

// ============================================================================
// updateAgent
// ============================================================================
console.log('\n── updateAgent ───────────────────────────────────────────');

// No fields
resetDb();
{
  let caught: Error | null = null;
  try { await updateAgent('x', {}); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on empty updates');
}

// Partial: name + capabilities JSON
resetDb();
routes = [{ match: /UPDATE agent_registry/i, rows: { affectedRows: 1 } }];
{
  const r = await updateAgent('id-1', {
    name: 'New Name',
    capabilities: ['plan', 'code'],
  });
  assertEq(r.success, true, 'success');
  const c = calls[0];
  assert(/SET name = \?/.test(c.sql), 'sets name');
  assert(/capabilities = \?/.test(c.sql), 'sets capabilities');
  // Order is allowed list: name, provider, model_id, capabilities, ...
  assertEq(c.params[0], 'New Name', 'name param');
  assertEq(c.params[1], JSON.stringify(['plan', 'code']), 'capabilities serialized');
  assertEq(c.params[2], 'id-1', 'id at end');
}

// config serialization
resetDb();
routes = [{ match: /UPDATE agent_registry/i, rows: { affectedRows: 1 } }];
{
  await updateAgent('id-2', { config: { x: 1 } });
  assertEq(calls[0].params[0], JSON.stringify({ x: 1 }), 'config serialized');
  assertEq(calls[0].params[1], 'id-2', 'id');
}

// Raw cost field (no serialization)
resetDb();
routes = [{ match: /UPDATE agent_registry/i, rows: { affectedRows: 1 } }];
{
  await updateAgent('id-3', { cost_per_1k_input: 0.02 });
  assertEq(calls[0].params[0], 0.02, 'cost passed through raw');
}

// Unknown field skipped
resetDb();
routes = [{ match: /UPDATE agent_registry/i, rows: { affectedRows: 1 } }];
{
  await updateAgent('id-4', { name: 'A', rogue_field: 'ignored' } as any);
  assert(!calls[0].sql.includes('rogue_field'), 'rogue_field not in SQL');
  assertEq(calls[0].params.length, 2, 'only name + id params');
}

// Not found → throws
resetDb();
routes = [{ match: /UPDATE agent_registry/i, rows: { affectedRows: 0 } }];
{
  let caught: Error | null = null;
  try { await updateAgent('gone', { name: 'x' }); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when not found');
  assert(caught !== null && /not found/i.test(caught.message), 'mentions not found');
}

// ============================================================================
// setStatus
// ============================================================================
console.log('\n── setStatus ─────────────────────────────────────────────');

// Invalid status
resetDb();
{
  let caught: Error | null = null;
  try { await setStatus('id', 'zombie'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid status throws');
  assert(caught !== null && /Invalid status/.test(caught.message), 'mentions status');
}

// Valid + found
resetDb();
routes = [{ match: /UPDATE agent_registry SET status/i, rows: { affectedRows: 1 } }];
{
  const r = await setStatus('id-1', 'inactive');
  assertEq(r.success, true, 'success');
  assertEq(calls[0].params, ['inactive', 'id-1'], 'status + id params');
}

// Valid + not found
resetDb();
routes = [{ match: /UPDATE agent_registry SET status/i, rows: { affectedRows: 0 } }];
{
  let caught: Error | null = null;
  try { await setStatus('ghost', 'active'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when not found');
  assert(caught !== null && /not found/i.test(caught.message), 'mentions not found');
}

// All valid statuses accepted
for (const s of ['active', 'inactive', 'deprecated']) {
  resetDb();
  routes = [{ match: /UPDATE agent_registry SET status/i, rows: { affectedRows: 1 } }];
  const r = await setStatus('id', s);
  assertEq(r.success, true, `status ${s} accepted`);
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
