#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRegistryService.js (OMD-1167)
 *
 * CRUD for execution agents (anthropic/openai/google/local).
 * Dependencies: config/db.getAppPool, uuid.v4 (both stubbed via require.cache).
 *
 * Coverage:
 *   - VALID_STATUSES, VALID_PROVIDERS exported
 *   - listAgents: no filters, filter by status, provider, capability, combined
 *                 ORDER BY default_priority ASC, name ASC
 *                 JSON parsing via _parseAgent
 *   - getAgent: found / not found
 *   - getAgentByName: case-insensitive lookup
 *   - getByCapability: active only + JSON_CONTAINS
 *   - createAgent: validation (missing field, invalid provider),
 *                  INSERT params, default_priority/capabilities/config defaults
 *   - updateAgent: field whitelist, JSON serialization for capabilities/config,
 *                  no fields → error, affectedRows=0 → not found
 *   - setStatus: valid/invalid status, not found
 *   - _parseAgent: handles invalid JSON gracefully
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

// ── Fake pool ────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];
let responders: Array<{ match: RegExp; response: any }> = [];

function resetResponders() {
  queryLog.length = 0;
  responders = [];
}

function on(match: RegExp, response: any) {
  responders.push({ match, response });
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of responders) {
      if (r.match.test(sql)) return r.response;
    }
    return [[]];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// ── Stub uuid ───────────────────────────────────────────────────────
let nextUuid = 'uuid-fixed-0001';
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: { v4: () => nextUuid },
} as any;

const svc = require('../agentRegistryService');

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');

assertEq(svc.VALID_STATUSES, ['active', 'inactive', 'deprecated'], 'VALID_STATUSES');
assertEq(svc.VALID_PROVIDERS, ['anthropic', 'openai', 'google', 'local'], 'VALID_PROVIDERS');

// ============================================================================
// listAgents — no filters
// ============================================================================
console.log('\n── listAgents: no filters ────────────────────────────────');

resetResponders();
on(/SELECT \* FROM agent_registry/i, [[
  { id: 'a1', name: 'Claude', provider: 'anthropic', model_id: 'claude-4-6',
    capabilities: '["code","chat"]', default_priority: 10, config: null, status: 'active' },
  { id: 'a2', name: 'GPT', provider: 'openai', model_id: 'gpt-5',
    capabilities: '["chat"]', default_priority: 20, config: '{"temperature":0.2}', status: 'active' },
]]);
{
  const rows = await svc.listAgents();
  assertEq(rows.length, 2, '2 rows');
  assertEq(rows[0].capabilities, ['code', 'chat'], 'capabilities parsed');
  assertEq(rows[1].config, { temperature: 0.2 }, 'config parsed');
  assertEq(rows[0].config, null, 'null config stays null');
  // Verify WHERE 1=1 (no extra filters) and ORDER BY
  assert(/WHERE 1=1/.test(queryLog[0].sql), 'WHERE 1=1 base clause');
  assert(/ORDER BY default_priority ASC, name ASC/.test(queryLog[0].sql), 'order clause');
  assertEq(queryLog[0].params, [], 'no params');
}

// ============================================================================
// listAgents — filter by status
// ============================================================================
console.log('\n── listAgents: status filter ─────────────────────────────');

resetResponders();
on(/SELECT \* FROM agent_registry/i, [[]]);
await svc.listAgents({ status: 'active' });
{
  assert(/status = \?/.test(queryLog[0].sql), 'status clause');
  assertEq(queryLog[0].params, ['active'], 'status param');
}

// ============================================================================
// listAgents — filter by provider
// ============================================================================
console.log('\n── listAgents: provider filter ───────────────────────────');

resetResponders();
on(/SELECT \* FROM agent_registry/i, [[]]);
await svc.listAgents({ provider: 'anthropic' });
{
  assert(/provider = \?/.test(queryLog[0].sql), 'provider clause');
  assertEq(queryLog[0].params, ['anthropic'], 'provider param');
}

// ============================================================================
// listAgents — filter by capability
// ============================================================================
console.log('\n── listAgents: capability filter ─────────────────────────');

resetResponders();
on(/SELECT \* FROM agent_registry/i, [[]]);
await svc.listAgents({ capability: 'code' });
{
  assert(/JSON_CONTAINS\(capabilities, \?\)/.test(queryLog[0].sql), 'JSON_CONTAINS');
  assertEq(queryLog[0].params[0], JSON.stringify('code'), 'capability JSON-stringified');
}

// Combined filters
resetResponders();
on(/SELECT \* FROM agent_registry/i, [[]]);
await svc.listAgents({ status: 'active', provider: 'anthropic', capability: 'chat' });
{
  assertEq(queryLog[0].params.length, 3, '3 params');
  assertEq(queryLog[0].params[0], 'active', 'status');
  assertEq(queryLog[0].params[1], 'anthropic', 'provider');
  assertEq(queryLog[0].params[2], JSON.stringify('chat'), 'capability');
}

// ============================================================================
// getAgent
// ============================================================================
console.log('\n── getAgent ──────────────────────────────────────────────');

resetResponders();
on(/SELECT \* FROM agent_registry WHERE id = \?/i, [[]]);
{
  const r = await svc.getAgent('missing');
  assertEq(r, null, 'not found → null');
}

resetResponders();
on(/SELECT \* FROM agent_registry WHERE id = \?/i, [[
  { id: 'a1', name: 'Claude', capabilities: '["code"]', config: null },
]]);
{
  const r = await svc.getAgent('a1');
  assertEq(r!.id, 'a1', 'id');
  assertEq(r!.capabilities, ['code'], 'capabilities parsed');
  assertEq(queryLog[0].params, ['a1'], 'id param');
}

// ============================================================================
// getAgentByName
// ============================================================================
console.log('\n── getAgentByName ────────────────────────────────────────');

resetResponders();
on(/LOWER\(name\) = LOWER\(\?\)/i, [[
  { id: 'a1', name: 'Claude', capabilities: '[]', config: null },
]]);
{
  const r = await svc.getAgentByName('CLAUDE');
  assertEq(r!.name, 'Claude', 'found case-insensitive');
  assertEq(queryLog[0].params, ['CLAUDE'], 'name param as-is');
}

resetResponders();
on(/LOWER\(name\) = LOWER\(\?\)/i, [[]]);
{
  const r = await svc.getAgentByName('none');
  assertEq(r, null, 'not found');
}

// ============================================================================
// getByCapability
// ============================================================================
console.log('\n── getByCapability ───────────────────────────────────────');

resetResponders();
on(/WHERE status = 'active' AND JSON_CONTAINS/i, [[
  { id: 'a1', capabilities: '["code"]', config: null },
  { id: 'a2', capabilities: '["code","chat"]', config: null },
]]);
{
  const rows = await svc.getByCapability('code');
  assertEq(rows.length, 2, '2 rows');
  assertEq(queryLog[0].params[0], JSON.stringify('code'), 'JSON-stringified param');
  assert(/default_priority ASC/.test(queryLog[0].sql), 'ordered');
}

// ============================================================================
// createAgent — validation
// ============================================================================
console.log('\n── createAgent: validation ───────────────────────────────');

// Missing name
{
  let caught: any = null;
  try {
    await svc.createAgent({ provider: 'anthropic', model_id: 'm' });
  } catch (e) { caught = e; }
  assert(caught !== null, 'throws on missing name');
  assert(/required/.test(caught.message), 'required message');
}

// Missing provider
{
  let caught: any = null;
  try {
    await svc.createAgent({ name: 'n', model_id: 'm' });
  } catch (e) { caught = e; }
  assert(caught !== null, 'throws on missing provider');
}

// Missing model_id
{
  let caught: any = null;
  try {
    await svc.createAgent({ name: 'n', provider: 'anthropic' });
  } catch (e) { caught = e; }
  assert(caught !== null, 'throws on missing model_id');
}

// Invalid provider
{
  let caught: any = null;
  try {
    await svc.createAgent({ name: 'n', provider: 'bogus', model_id: 'm' });
  } catch (e) { caught = e; }
  assert(caught !== null, 'throws on invalid provider');
  assert(/Invalid provider/.test(caught.message), 'invalid provider message');
}

// ============================================================================
// createAgent — happy path with defaults
// ============================================================================
console.log('\n── createAgent: happy path ───────────────────────────────');

resetResponders();
on(/INSERT INTO agent_registry/i, [{}]);
nextUuid = 'uuid-test-A';
{
  const r = await svc.createAgent({
    name: 'TestAgent', provider: 'anthropic', model_id: 'claude-4-6',
  });
  assertEq(r.agent_id, 'uuid-test-A', 'agent_id from uuid');
  assertEq(r.name, 'TestAgent', 'returned name');
  const q = queryLog[0];
  assertEq(q.params[0], 'uuid-test-A', 'id param');
  assertEq(q.params[1], 'TestAgent', 'name param');
  assertEq(q.params[2], 'anthropic', 'provider');
  assertEq(q.params[3], 'claude-4-6', 'model_id');
  assertEq(q.params[4], '[]', 'default capabilities []');
  assertEq(q.params[5], 50, 'default priority 50');
  assertEq(q.params[6], null, 'default config null');
  assertEq(q.params[7], null, 'default cost_input null');
  assertEq(q.params[8], null, 'default cost_output null');
}

// With full options
resetResponders();
on(/INSERT INTO agent_registry/i, [{}]);
nextUuid = 'uuid-test-B';
{
  await svc.createAgent({
    name: 'Full', provider: 'openai', model_id: 'gpt-5',
    capabilities: ['code', 'vision'],
    default_priority: 5,
    config: { temperature: 0.3 },
    cost_per_1k_input: 0.01,
    cost_per_1k_output: 0.03,
  });
  const q = queryLog[0];
  assertEq(q.params[4], JSON.stringify(['code', 'vision']), 'capabilities JSON');
  assertEq(q.params[5], 5, 'custom priority');
  assertEq(q.params[6], JSON.stringify({ temperature: 0.3 }), 'config JSON');
  assertEq(q.params[7], 0.01, 'cost_input');
  assertEq(q.params[8], 0.03, 'cost_output');
}

// All valid providers accepted
for (const p of ['anthropic', 'openai', 'google', 'local']) {
  resetResponders();
  on(/INSERT INTO agent_registry/i, [{}]);
  nextUuid = `uuid-${p}`;
  const r = await svc.createAgent({ name: p, provider: p, model_id: 'm' });
  assertEq(r.agent_id, `uuid-${p}`, `provider ${p} accepted`);
}

// ============================================================================
// updateAgent
// ============================================================================
console.log('\n── updateAgent ───────────────────────────────────────────');

// No valid fields → throws
{
  let caught: any = null;
  try { await svc.updateAgent('id-1', { bogus: 'x' }); }
  catch (e) { caught = e; }
  assert(caught !== null, 'throws on no valid fields');
  assert(/No valid fields/.test(caught.message), 'error message');
}

// affectedRows=0 → not found
resetResponders();
on(/^UPDATE agent_registry/i, [{ affectedRows: 0 }]);
{
  let caught: any = null;
  try { await svc.updateAgent('missing', { name: 'X' }); }
  catch (e) { caught = e; }
  assert(caught !== null, 'throws when not found');
  assert(/Agent not found/.test(caught.message), 'not found message');
}

// Happy path with JSON fields
resetResponders();
on(/^UPDATE agent_registry/i, [{ affectedRows: 1 }]);
{
  const r = await svc.updateAgent('a1', {
    name: 'NewName',
    capabilities: ['code'],
    config: { k: 'v' },
    cost_per_1k_input: 0.02,
  });
  assertEq(r.success, true, 'success');
  const q = queryLog[0];
  assert(/SET name = \?/.test(q.sql), 'name in SET');
  assert(/capabilities = \?/.test(q.sql), 'capabilities in SET');
  assert(/config = \?/.test(q.sql), 'config in SET');
  assert(/cost_per_1k_input = \?/.test(q.sql), 'cost in SET');
  // Verify JSON serialization order
  assertEq(q.params[0], 'NewName', 'name val');
  assertEq(q.params[1], JSON.stringify(['code']), 'caps JSON');
  assertEq(q.params[2], JSON.stringify({ k: 'v' }), 'config JSON');
  assertEq(q.params[3], 0.02, 'cost val');
  assertEq(q.params[4], 'a1', 'id at end');
}

// Whitelist: unknown keys ignored
resetResponders();
on(/^UPDATE agent_registry/i, [{ affectedRows: 1 }]);
{
  await svc.updateAgent('a1', { name: 'X', evil: 'DROP TABLE' });
  const q = queryLog[0];
  assert(!/evil/.test(q.sql), 'evil key not in SQL');
  assert(!q.params.includes('DROP TABLE'), 'evil value not in params');
}

// ============================================================================
// setStatus
// ============================================================================
console.log('\n── setStatus ─────────────────────────────────────────────');

// Invalid status
{
  let caught: any = null;
  try { await svc.setStatus('a1', 'bogus'); }
  catch (e) { caught = e; }
  assert(caught !== null, 'throws on invalid status');
  assert(/Invalid status/.test(caught.message), 'invalid status message');
}

// Not found
resetResponders();
on(/UPDATE agent_registry SET status/i, [{ affectedRows: 0 }]);
{
  let caught: any = null;
  try { await svc.setStatus('missing', 'active'); }
  catch (e) { caught = e; }
  assert(caught !== null, 'throws when not found');
}

// Happy path — each valid status
for (const status of ['active', 'inactive', 'deprecated']) {
  resetResponders();
  on(/UPDATE agent_registry SET status/i, [{ affectedRows: 1 }]);
  const r = await svc.setStatus('a1', status);
  assertEq(r.success, true, `setStatus ${status} success`);
  assertEq(queryLog[0].params, [status, 'a1'], `params for ${status}`);
}

// ============================================================================
// _parseAgent — invalid JSON handled
// ============================================================================
console.log('\n── _parseAgent: malformed JSON ───────────────────────────');

resetResponders();
on(/SELECT \* FROM agent_registry WHERE id = \?/i, [[
  { id: 'broken', name: 'X', capabilities: '{not json', config: '{"valid":true}' },
]]);
{
  const r = await svc.getAgent('broken');
  assertEq(r!.capabilities, [], 'malformed capabilities → default []');
  assertEq(r!.config, { valid: true }, 'valid config parsed');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
