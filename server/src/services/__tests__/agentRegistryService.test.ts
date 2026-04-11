#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRegistryService.js (OMD-1147)
 *
 * CRUD service for execution agents (Claude, GPT, etc.). Dependencies:
 *   - `uuid` (v4): stubbed to return a deterministic id
 *   - `../config/db` (getAppPool): stubbed via route-dispatch fake pool
 *
 * Strategy: stub both via require.cache BEFORE requiring SUT. Fake pool
 * matches SQL patterns and returns scripted rows. Capture UPDATE/INSERT
 * params for assertion.
 *
 * Coverage:
 *   - Exported constants (VALID_STATUSES, VALID_PROVIDERS)
 *   - listAgents: no filter, status filter, provider filter, capability
 *                 filter, combined filters, JSON parsing of capabilities/config
 *   - getAgent: found → parsed; not found → null
 *   - getAgentByName: case-insensitive lookup; not found → null
 *   - getByCapability: status=active + JSON_CONTAINS filter
 *   - createAgent:
 *       · missing fields → throws
 *       · invalid provider → throws
 *       · happy path → returns {agent_id, name}, UUID used
 *       · capabilities default [], default_priority 50
 *       · config + costs nullable
 *   - updateAgent:
 *       · no valid fields → throws
 *       · affectedRows=0 → throws 'Agent not found'
 *       · stringifies capabilities/config
 *       · scalar fields passed through
 *   - setStatus:
 *       · invalid status → throws
 *       · affectedRows=0 → throws
 *       · happy path → success
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

// ── uuid stub ────────────────────────────────────────────────────────
let nextUuid = 'uuid-0001';
const uuidStub = { v4: () => nextUuid };

const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: uuidStub,
} as any;

// ── db stub ──────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

// Scriptable responses
let selectRows: any[] = [];
let insertResult: any = { insertId: 1 };
let updateResult: any = { affectedRows: 1 };
let throwOnPattern: RegExp | null = null;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });

    if (throwOnPattern && throwOnPattern.test(sql)) {
      throw new Error('fake db failure');
    }

    if (/^\s*SELECT/i.test(sql)) {
      return [selectRows];
    }
    if (/^\s*INSERT/i.test(sql)) {
      return [insertResult];
    }
    if (/^\s*UPDATE/i.test(sql)) {
      return [updateResult];
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

function resetState() {
  queryLog.length = 0;
  selectRows = [];
  insertResult = { insertId: 1 };
  updateResult = { affectedRows: 1 };
  throwOnPattern = null;
  nextUuid = 'uuid-0001';
}

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
console.log('\n── Constants ─────────────────────────────────────────────');

assertEq(VALID_STATUSES, ['active', 'inactive', 'deprecated'], 'VALID_STATUSES');
assertEq(VALID_PROVIDERS, ['anthropic', 'openai', 'google', 'local'], 'VALID_PROVIDERS');

// ============================================================================
// listAgents — no filter
// ============================================================================
console.log('\n── listAgents: no filter ─────────────────────────────────');

resetState();
selectRows = [
  {
    id: 'a1', name: 'Claude', provider: 'anthropic', model_id: 'claude-3',
    capabilities: '["chat","code"]',
    config: '{"temp":0.5}',
    default_priority: 10, status: 'active',
  },
  {
    id: 'a2', name: 'GPT-4', provider: 'openai', model_id: 'gpt-4',
    capabilities: null,
    config: null,
    default_priority: 20, status: 'active',
  },
];
{
  const r = await listAgents();
  assertEq(r.length, 2, '2 agents returned');
  assertEq(r[0].capabilities, ['chat', 'code'], 'capabilities parsed from JSON');
  assertEq(r[0].config, { temp: 0.5 }, 'config parsed from JSON');
  assertEq(r[1].capabilities, [], 'null capabilities → []');
  assertEq(r[1].config, null, 'null config → null');
  assertEq(queryLog.length, 1, 'one query');
  assert(/FROM agent_registry/i.test(queryLog[0].sql), 'queries agent_registry');
  assert(/WHERE 1=1/i.test(queryLog[0].sql), 'default WHERE 1=1');
  assert(/ORDER BY default_priority ASC, name ASC/i.test(queryLog[0].sql), 'orders by priority then name');
  assertEq(queryLog[0].params, [], 'no params');
}

// ============================================================================
// listAgents — status filter
// ============================================================================
console.log('\n── listAgents: status filter ─────────────────────────────');

resetState();
selectRows = [];
{
  await listAgents({ status: 'active' });
  assert(/status = \?/i.test(queryLog[0].sql), 'status in WHERE');
  assertEq(queryLog[0].params, ['active'], 'status param');
}

// Provider filter
resetState();
{
  await listAgents({ provider: 'anthropic' });
  assert(/provider = \?/i.test(queryLog[0].sql), 'provider in WHERE');
  assertEq(queryLog[0].params, ['anthropic'], 'provider param');
}

// Capability filter
resetState();
{
  await listAgents({ capability: 'vision' });
  assert(/JSON_CONTAINS\(capabilities, \?\)/i.test(queryLog[0].sql), 'JSON_CONTAINS in WHERE');
  assertEq(queryLog[0].params, ['"vision"'], 'capability JSON-stringified');
}

// Combined filters
resetState();
{
  await listAgents({ status: 'active', provider: 'openai', capability: 'chat' });
  assertEq(queryLog[0].params, ['active', 'openai', '"chat"'], 'all filter params');
  assert(/status = \? AND provider = \? AND JSON_CONTAINS/i.test(queryLog[0].sql), 'all clauses joined');
}

// ============================================================================
// getAgent
// ============================================================================
console.log('\n── getAgent ──────────────────────────────────────────────');

// Found
resetState();
selectRows = [{
  id: 'a1', name: 'Claude', provider: 'anthropic', model_id: 'claude-3',
  capabilities: '["chat"]', config: '{"k":1}', status: 'active',
}];
{
  const r = await getAgent('a1');
  assertEq(r.id, 'a1', 'returns agent');
  assertEq(r.capabilities, ['chat'], 'capabilities parsed');
  assertEq(r.config, { k: 1 }, 'config parsed');
  assert(/WHERE id = \?/i.test(queryLog[0].sql), 'WHERE id');
  assertEq(queryLog[0].params, ['a1'], 'id param');
}

// Not found
resetState();
selectRows = [];
{
  const r = await getAgent('nope');
  assertEq(r, null, 'not found → null');
}

// Invalid JSON in DB → fallback
resetState();
selectRows = [{ id: 'a1', name: 'X', capabilities: 'not json', config: 'also not json' }];
{
  const r = await getAgent('a1');
  assertEq(r.capabilities, [], 'invalid JSON capabilities → []');
  assertEq(r.config, null, 'invalid JSON config → null');
}

// ============================================================================
// getAgentByName
// ============================================================================
console.log('\n── getAgentByName ────────────────────────────────────────');

resetState();
selectRows = [{ id: 'a1', name: 'Claude', capabilities: '[]', config: null }];
{
  const r = await getAgentByName('CLAUDE');
  assertEq(r.id, 'a1', 'found');
  assert(/LOWER\(name\) = LOWER\(\?\)/i.test(queryLog[0].sql), 'case-insensitive');
  assertEq(queryLog[0].params, ['CLAUDE'], 'name param');
}

resetState();
selectRows = [];
{
  const r = await getAgentByName('nobody');
  assertEq(r, null, 'not found → null');
}

// ============================================================================
// getByCapability
// ============================================================================
console.log('\n── getByCapability ───────────────────────────────────────');

resetState();
selectRows = [
  { id: 'a1', name: 'C', capabilities: '["chat","vision"]', config: null },
  { id: 'a2', name: 'G', capabilities: '["chat"]', config: null },
];
{
  const r = await getByCapability('chat');
  assertEq(r.length, 2, 'returns matching agents');
  assert(/status = 'active'/i.test(queryLog[0].sql), 'filters active');
  assert(/JSON_CONTAINS\(capabilities, \?\)/i.test(queryLog[0].sql), 'JSON_CONTAINS');
  assertEq(queryLog[0].params, ['"chat"'], 'capability stringified');
  assert(/ORDER BY default_priority ASC/i.test(queryLog[0].sql), 'orders by priority');
}

// ============================================================================
// createAgent — validation
// ============================================================================
console.log('\n── createAgent: validation ───────────────────────────────');

// Missing name
resetState();
{
  let caught: Error | null = null;
  try {
    await createAgent({ provider: 'anthropic', model_id: 'claude-3' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'missing name throws');
  assert(caught !== null && caught.message.includes('required'), 'error mentions required');
}

// Missing provider
resetState();
{
  let caught: Error | null = null;
  try {
    await createAgent({ name: 'X', model_id: 'claude-3' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'missing provider throws');
}

// Missing model_id
resetState();
{
  let caught: Error | null = null;
  try {
    await createAgent({ name: 'X', provider: 'anthropic' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'missing model_id throws');
}

// Invalid provider
resetState();
{
  let caught: Error | null = null;
  try {
    await createAgent({ name: 'X', provider: 'bogus', model_id: 'm' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid provider throws');
  assert(caught !== null && caught.message.includes('Invalid provider'), 'error mentions invalid provider');
}

// ============================================================================
// createAgent — happy path
// ============================================================================
console.log('\n── createAgent: happy path ───────────────────────────────');

resetState();
nextUuid = 'new-uuid-xyz';
{
  const r = await createAgent({
    name: 'Claude 3.5',
    provider: 'anthropic',
    model_id: 'claude-3-5',
    capabilities: ['chat', 'code'],
    default_priority: 5,
    config: { temp: 0.3 },
    cost_per_1k_input: 0.003,
    cost_per_1k_output: 0.015,
  });
  assertEq(r, { agent_id: 'new-uuid-xyz', name: 'Claude 3.5' }, 'returns {agent_id, name}');
  assertEq(queryLog.length, 1, 'one INSERT');
  assert(/INSERT INTO agent_registry/i.test(queryLog[0].sql), 'INSERT into agent_registry');
  const params = queryLog[0].params;
  assertEq(params[0], 'new-uuid-xyz', 'id = uuid');
  assertEq(params[1], 'Claude 3.5', 'name');
  assertEq(params[2], 'anthropic', 'provider');
  assertEq(params[3], 'claude-3-5', 'model_id');
  assertEq(params[4], JSON.stringify(['chat', 'code']), 'capabilities stringified');
  assertEq(params[5], 5, 'default_priority');
  assertEq(params[6], JSON.stringify({ temp: 0.3 }), 'config stringified');
  assertEq(params[7], 0.003, 'cost_per_1k_input');
  assertEq(params[8], 0.015, 'cost_per_1k_output');
}

// Defaults applied
resetState();
nextUuid = 'default-uuid';
{
  await createAgent({
    name: 'Minimal',
    provider: 'openai',
    model_id: 'gpt-4',
  });
  const params = queryLog[0].params;
  assertEq(params[4], JSON.stringify([]), 'capabilities default []');
  assertEq(params[5], 50, 'default_priority = 50');
  assertEq(params[6], null, 'config default null');
  assertEq(params[7], null, 'cost_per_1k_input default null');
  assertEq(params[8], null, 'cost_per_1k_output default null');
}

// ============================================================================
// updateAgent — no valid fields
// ============================================================================
console.log('\n── updateAgent: no fields ────────────────────────────────');

resetState();
{
  let caught: Error | null = null;
  try {
    await updateAgent('a1', { not_allowed: 'ignore' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'no valid fields throws');
  assert(caught !== null && caught.message.includes('No valid fields'), 'error message');
}

// ============================================================================
// updateAgent — not found
// ============================================================================
console.log('\n── updateAgent: not found ────────────────────────────────');

resetState();
updateResult = { affectedRows: 0 };
{
  let caught: Error | null = null;
  try {
    await updateAgent('missing', { name: 'New' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'not found throws');
  assert(caught !== null && caught.message.includes('Agent not found'), 'error message');
}

// ============================================================================
// updateAgent — happy path
// ============================================================================
console.log('\n── updateAgent: happy path ───────────────────────────────');

resetState();
updateResult = { affectedRows: 1 };
{
  const r = await updateAgent('a1', {
    name: 'Updated',
    capabilities: ['chat', 'vision'],
    config: { temp: 0.1 },
    default_priority: 15,
  });
  assertEq(r, { success: true }, 'returns success');
  const params = queryLog[0].params;
  // Params order: name, capabilities (stringified), default_priority, config (stringified), id
  assertEq(params[0], 'Updated', 'name param');
  assertEq(params[1], JSON.stringify(['chat', 'vision']), 'capabilities stringified');
  assertEq(params[2], 15, 'default_priority');
  assertEq(params[3], JSON.stringify({ temp: 0.1 }), 'config stringified');
  assertEq(params[4], 'a1', 'id is last param');
  assert(/SET name = \?/i.test(queryLog[0].sql), 'SET clause includes name');
  assert(/SET.*capabilities = \?/i.test(queryLog[0].sql), 'SET includes capabilities');
}

// Ignores fields not in allowlist
resetState();
updateResult = { affectedRows: 1 };
{
  await updateAgent('a1', {
    name: 'N',
    status: 'active',       // NOT in allowed list (status uses setStatus)
    id: 'tampered',         // NOT allowed
    provider: 'openai',
  });
  // Should only update name + provider
  assertEq(queryLog[0].params.length, 3, '2 updates + id');
  assertEq(queryLog[0].params[2], 'a1', 'id unchanged');
  assert(!/status = \?/i.test(queryLog[0].sql), 'status not in SET');
}

// Scalar-only update (no JSON fields)
resetState();
updateResult = { affectedRows: 1 };
{
  await updateAgent('a1', { cost_per_1k_input: 0.01 });
  assertEq(queryLog[0].params[0], 0.01, 'scalar passed through');
  assertEq(queryLog[0].params[1], 'a1', 'id');
}

// ============================================================================
// setStatus
// ============================================================================
console.log('\n── setStatus ─────────────────────────────────────────────');

// Invalid status
resetState();
{
  let caught: Error | null = null;
  try {
    await setStatus('a1', 'bogus');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid status throws');
  assert(caught !== null && caught.message.includes('Invalid status'), 'error message');
}

// Not found
resetState();
updateResult = { affectedRows: 0 };
{
  let caught: Error | null = null;
  try {
    await setStatus('missing', 'active');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'not found throws');
}

// Happy path — each valid status
resetState();
updateResult = { affectedRows: 1 };
for (const status of ['active', 'inactive', 'deprecated']) {
  resetState();
  updateResult = { affectedRows: 1 };
  const r = await setStatus('a1', status);
  assertEq(r, { success: true }, `${status} → success`);
  assertEq(queryLog[0].params, [status, 'a1'], `${status} params`);
  assert(/UPDATE agent_registry SET status = \?/i.test(queryLog[0].sql), `${status} SQL`);
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
