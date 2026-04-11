#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRegistryService.js (OMD-1114)
 *
 * CRUD for execution agents. One external dep: `../config/db.getAppPool`.
 *
 * Strategy: stub config/db via require.cache with a fake pool that dispatches
 * SQL → handler via a Route[] array (first match wins). Each test resets
 * state and installs routes for the SQL it cares about.
 *
 * Coverage:
 *   - VALID_STATUSES / VALID_PROVIDERS exports
 *   - listAgents: no filters, status, provider, capability, combined
 *   - getAgent: found (with JSON parse), null
 *   - getAgentByName: found, null, LOWER case-insensitivity
 *   - getByCapability: status='active' filter + JSON_CONTAINS
 *   - createAgent: missing required fields, invalid provider, happy path
 *                  defaults (priority=50, empty capabilities), full insert
 *   - updateAgent: no valid fields throws, not-found throws, JSON serialization
 *                  for capabilities/config, plain passthrough for others
 *   - setStatus: invalid status throws, not-found throws, happy path
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

async function assertThrows(fn: () => Promise<any>, substring: string, message: string): Promise<void> {
  try {
    await fn();
    console.error(`  FAIL: ${message} (did not throw)`);
    failed++;
  } catch (e: any) {
    if (e.message && e.message.includes(substring)) {
      console.log(`  PASS: ${message}`); passed++;
    } else {
      console.error(`  FAIL: ${message}\n         expected error containing: ${substring}\n         got: ${e.message}`);
      failed++;
    }
  }
}

// ── Fake pool with route dispatch ───────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
type Route = { match: RegExp; handler: (params: any[]) => any };

const queryCalls: QueryCall[] = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryCalls.push({ sql, params });
    for (const route of routes) {
      if (route.match.test(sql)) {
        return route.handler(params);
      }
    }
    throw new Error(`No route matched SQL: ${sql.slice(0, 100)}`);
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

function resetAll() {
  queryCalls.length = 0;
  routes = [];
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
// listAgents
// ============================================================================
console.log('\n── listAgents: no filters ────────────────────────────────');

resetAll();
routes = [
  {
    match: /SELECT \* FROM agent_registry/i,
    handler: () => [[
      { id: 'a1', name: 'Claude', capabilities: '["code","docs"]', config: '{"temp":0.5}', default_priority: 10 },
      { id: 'a2', name: 'GPT', capabilities: null, config: null, default_priority: 20 },
    ]],
  },
];
{
  const rows = await listAgents();
  assertEq(rows.length, 2, '2 agents returned');
  assertEq(rows[0].capabilities, ['code', 'docs'], 'capabilities JSON parsed');
  assertEq(rows[0].config, { temp: 0.5 }, 'config JSON parsed');
  assertEq(rows[1].capabilities, [], 'null capabilities → []');
  assertEq(rows[1].config, null, 'null config → null');
  assertEq(queryCalls[0].params, [], 'no params');
  assert(/WHERE 1=1/.test(queryCalls[0].sql), 'WHERE 1=1 base');
  assert(/ORDER BY default_priority ASC, name ASC/.test(queryCalls[0].sql), 'ordered');
}

// Status filter
console.log('\n── listAgents: status filter ─────────────────────────────');
resetAll();
routes = [{ match: /agent_registry/i, handler: () => [[]] }];
{
  await listAgents({ status: 'active' });
  assert(/status = \?/.test(queryCalls[0].sql), 'status clause');
  assertEq(queryCalls[0].params, ['active'], 'status param');
}

// Provider filter
resetAll();
routes = [{ match: /agent_registry/i, handler: () => [[]] }];
{
  await listAgents({ provider: 'anthropic' });
  assert(/provider = \?/.test(queryCalls[0].sql), 'provider clause');
  assertEq(queryCalls[0].params, ['anthropic'], 'provider param');
}

// Capability filter (JSON_CONTAINS)
resetAll();
routes = [{ match: /agent_registry/i, handler: () => [[]] }];
{
  await listAgents({ capability: 'code' });
  assert(/JSON_CONTAINS\(capabilities, \?\)/.test(queryCalls[0].sql), 'JSON_CONTAINS clause');
  assertEq(queryCalls[0].params, ['"code"'], 'capability JSON-serialized');
}

// Combined filters
resetAll();
routes = [{ match: /agent_registry/i, handler: () => [[]] }];
{
  await listAgents({ status: 'active', provider: 'openai', capability: 'docs' });
  assertEq(
    queryCalls[0].params,
    ['active', 'openai', '"docs"'],
    'combined params in order'
  );
  assert(/status = \? AND provider = \? AND JSON_CONTAINS/.test(queryCalls[0].sql), 'clauses joined with AND');
}

// ============================================================================
// getAgent
// ============================================================================
console.log('\n── getAgent ──────────────────────────────────────────────');

// Found
resetAll();
routes = [
  {
    match: /WHERE id = \?/i,
    handler: (params) => [[
      { id: params[0], name: 'Claude', capabilities: '["code"]', config: '{"k":"v"}' },
    ]],
  },
];
{
  const agent = await getAgent('abc-123');
  assertEq(agent.id, 'abc-123', 'id');
  assertEq(agent.name, 'Claude', 'name');
  assertEq(agent.capabilities, ['code'], 'capabilities parsed');
  assertEq(agent.config, { k: 'v' }, 'config parsed');
}

// Not found
resetAll();
routes = [{ match: /WHERE id = \?/i, handler: () => [[]] }];
{
  const agent = await getAgent('missing');
  assertEq(agent, null, 'null when not found');
}

// ============================================================================
// getAgentByName
// ============================================================================
console.log('\n── getAgentByName ────────────────────────────────────────');

// Found
resetAll();
routes = [
  {
    match: /LOWER\(name\) = LOWER\(\?\)/i,
    handler: (params) => [[
      { id: 'id1', name: 'Claude', capabilities: '[]', config: null },
    ]],
  },
];
{
  const agent = await getAgentByName('Claude');
  assertEq(agent.name, 'Claude', 'found by name');
  assertEq(queryCalls[0].params, ['Claude'], 'name param passed');
  assert(/LOWER\(name\) = LOWER\(\?\)/.test(queryCalls[0].sql), 'LOWER case-insensitive');
}

// Not found
resetAll();
routes = [{ match: /LOWER\(name\)/i, handler: () => [[]] }];
{
  const agent = await getAgentByName('NoSuchAgent');
  assertEq(agent, null, 'null when name not found');
}

// ============================================================================
// getByCapability
// ============================================================================
console.log('\n── getByCapability ───────────────────────────────────────');

resetAll();
routes = [
  {
    match: /status = 'active' AND JSON_CONTAINS/i,
    handler: () => [[
      { id: 'id1', name: 'Claude', capabilities: '["code"]', config: null },
      { id: 'id2', name: 'GPT', capabilities: '["code"]', config: null },
    ]],
  },
];
{
  const agents = await getByCapability('code');
  assertEq(agents.length, 2, '2 agents with capability');
  assertEq(queryCalls[0].params, ['"code"'], 'capability JSON-serialized');
  assert(/status = 'active'/.test(queryCalls[0].sql), 'filters to active only');
  assert(/ORDER BY default_priority ASC/.test(queryCalls[0].sql), 'ordered by priority');
  assertEq(agents[0].capabilities, ['code'], 'capabilities parsed');
}

// ============================================================================
// createAgent — validation
// ============================================================================
console.log('\n── createAgent: validation ───────────────────────────────');

resetAll();
await assertThrows(
  () => createAgent({ provider: 'anthropic', model_id: 'claude-3' }),
  'name, provider, and model_id are required',
  'missing name throws'
);

await assertThrows(
  () => createAgent({ name: 'X', model_id: 'x' }),
  'name, provider, and model_id are required',
  'missing provider throws'
);

await assertThrows(
  () => createAgent({ name: 'X', provider: 'anthropic' }),
  'name, provider, and model_id are required',
  'missing model_id throws'
);

await assertThrows(
  () => createAgent({ name: 'X', provider: 'bogus', model_id: 'x' }),
  'Invalid provider',
  'invalid provider throws'
);

assertEq(queryCalls.length, 0, 'no DB calls on validation failures');

// ============================================================================
// createAgent — happy path with defaults
// ============================================================================
console.log('\n── createAgent: defaults ─────────────────────────────────');

resetAll();
routes = [{ match: /INSERT INTO agent_registry/i, handler: () => [{ affectedRows: 1 }] }];
{
  const result = await createAgent({
    name: 'Claude-3',
    provider: 'anthropic',
    model_id: 'claude-3-opus',
  });
  assert(typeof result.agent_id === 'string' && result.agent_id.length > 0, 'returns agent_id');
  assertEq(result.name, 'Claude-3', 'returns name');
  assertEq(queryCalls[0].params[1], 'Claude-3', 'name param');
  assertEq(queryCalls[0].params[2], 'anthropic', 'provider param');
  assertEq(queryCalls[0].params[3], 'claude-3-opus', 'model_id param');
  assertEq(queryCalls[0].params[4], '[]', 'capabilities defaults to []');
  assertEq(queryCalls[0].params[5], 50, 'priority defaults to 50');
  assertEq(queryCalls[0].params[6], null, 'config defaults to null');
  assertEq(queryCalls[0].params[7], null, 'cost_per_1k_input defaults null');
  assertEq(queryCalls[0].params[8], null, 'cost_per_1k_output defaults null');
}

// createAgent — full field set
resetAll();
routes = [{ match: /INSERT INTO agent_registry/i, handler: () => [{ affectedRows: 1 }] }];
{
  const result = await createAgent({
    name: 'Claude-Full',
    provider: 'anthropic',
    model_id: 'claude-3',
    capabilities: ['code', 'docs', 'vision'],
    default_priority: 5,
    config: { temp: 0.7, max_tokens: 4096 },
    cost_per_1k_input: 0.015,
    cost_per_1k_output: 0.075,
  });
  assertEq(queryCalls[0].params[4], JSON.stringify(['code', 'docs', 'vision']), 'capabilities serialized');
  assertEq(queryCalls[0].params[5], 5, 'priority explicit');
  assertEq(queryCalls[0].params[6], JSON.stringify({ temp: 0.7, max_tokens: 4096 }), 'config serialized');
  assertEq(queryCalls[0].params[7], 0.015, 'cost_per_1k_input set');
  assertEq(queryCalls[0].params[8], 0.075, 'cost_per_1k_output set');
  assert(typeof result.agent_id === 'string', 'returns agent_id');
}

// createAgent — provider='local' is valid
resetAll();
routes = [{ match: /INSERT INTO agent_registry/i, handler: () => [{ affectedRows: 1 }] }];
{
  const result = await createAgent({ name: 'Local', provider: 'local', model_id: 'llama' });
  assert(result.agent_id, 'local provider accepted');
}

// createAgent — all 4 valid providers accepted
for (const provider of ['anthropic', 'openai', 'google', 'local']) {
  resetAll();
  routes = [{ match: /INSERT/i, handler: () => [{ affectedRows: 1 }] }];
  const result = await createAgent({ name: 'X', provider, model_id: 'x' });
  assert(result.agent_id, `provider ${provider} accepted`);
}

// ============================================================================
// updateAgent
// ============================================================================
console.log('\n── updateAgent: validation ───────────────────────────────');

// No valid fields
resetAll();
await assertThrows(
  () => updateAgent('id', {}),
  'No valid fields to update',
  'empty updates throws'
);

await assertThrows(
  () => updateAgent('id', { status: 'active', random: 'x' }),
  'No valid fields to update',
  'only non-allowed fields throws'
);

assertEq(queryCalls.length, 0, 'no DB calls on validation failures');

// Not found
console.log('\n── updateAgent: not found ────────────────────────────────');
resetAll();
routes = [{ match: /UPDATE agent_registry/i, handler: () => [{ affectedRows: 0 }] }];
await assertThrows(
  () => updateAgent('missing', { name: 'X' }),
  'Agent not found',
  'affectedRows=0 throws'
);

// Happy path — JSON serialization
console.log('\n── updateAgent: JSON serialization ───────────────────────');
resetAll();
routes = [{ match: /UPDATE agent_registry/i, handler: () => [{ affectedRows: 1 }] }];
{
  const result = await updateAgent('id1', {
    capabilities: ['code', 'vision'],
    config: { temp: 0.5 },
    name: 'NewName',
    default_priority: 25,
  });
  assertEq(result, { success: true }, 'success result');
  // Order follows allowed-list: name, provider, model_id, capabilities,
  // default_priority, config, cost_per_1k_input, cost_per_1k_output
  // Active updates (in order): name, capabilities, default_priority, config
  const params = queryCalls[0].params;
  assertEq(params[0], 'NewName', 'name raw');
  assertEq(params[1], JSON.stringify(['code', 'vision']), 'capabilities serialized');
  assertEq(params[2], 25, 'default_priority raw');
  assertEq(params[3], JSON.stringify({ temp: 0.5 }), 'config serialized');
  assertEq(params[4], 'id1', 'id is last param');
  assert(/name = \?/.test(queryCalls[0].sql), 'SET name');
  assert(/capabilities = \?/.test(queryCalls[0].sql), 'SET capabilities');
  assert(/config = \?/.test(queryCalls[0].sql), 'SET config');
  assert(/default_priority = \?/.test(queryCalls[0].sql), 'SET default_priority');
  assert(/WHERE id = \?/.test(queryCalls[0].sql), 'WHERE clause');
}

// Update only provider/model_id/costs (non-JSON fields)
resetAll();
routes = [{ match: /UPDATE agent_registry/i, handler: () => [{ affectedRows: 1 }] }];
{
  await updateAgent('id2', {
    provider: 'openai',
    model_id: 'gpt-4',
    cost_per_1k_input: 0.03,
    cost_per_1k_output: 0.06,
  });
  const params = queryCalls[0].params;
  assertEq(params[0], 'openai', 'provider');
  assertEq(params[1], 'gpt-4', 'model_id');
  assertEq(params[2], 0.03, 'cost_per_1k_input');
  assertEq(params[3], 0.06, 'cost_per_1k_output');
  assertEq(params[4], 'id2', 'id last');
}

// Non-allowed fields silently dropped
resetAll();
routes = [{ match: /UPDATE agent_registry/i, handler: () => [{ affectedRows: 1 }] }];
{
  await updateAgent('id3', { name: 'X', status: 'inactive', created_at: 'now' });
  // Only name should be in SET
  const params = queryCalls[0].params;
  assertEq(params.length, 2, 'only name + id (status/created_at dropped)');
  assertEq(params[0], 'X', 'name only');
  assertEq(params[1], 'id3', 'id');
}

// ============================================================================
// setStatus
// ============================================================================
console.log('\n── setStatus: validation ─────────────────────────────────');

resetAll();
await assertThrows(
  () => setStatus('id', 'bogus'),
  'Invalid status',
  'invalid status throws'
);

assertEq(queryCalls.length, 0, 'no DB call on invalid status');

// Not found
console.log('\n── setStatus: not found ──────────────────────────────────');
resetAll();
routes = [{ match: /UPDATE agent_registry SET status/i, handler: () => [{ affectedRows: 0 }] }];
await assertThrows(
  () => setStatus('missing', 'active'),
  'Agent not found',
  'affectedRows=0 throws'
);

// Happy path
console.log('\n── setStatus: happy path ─────────────────────────────────');
for (const status of ['active', 'inactive', 'deprecated']) {
  resetAll();
  routes = [{ match: /UPDATE agent_registry SET status/i, handler: () => [{ affectedRows: 1 }] }];
  const result = await setStatus('id1', status);
  assertEq(result, { success: true }, `setStatus ${status} returns success`);
  assertEq(queryCalls[0].params, [status, 'id1'], `params [${status}, id1]`);
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => {
  console.error('Unhandled:', e);
  process.exit(1);
});
