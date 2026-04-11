#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRegistryService.js (OMD-991)
 *
 * Coverage:
 *   - VALID_STATUSES / VALID_PROVIDERS constants
 *   - listAgents: no filters, status filter, provider filter,
 *     capability filter (JSON_CONTAINS), JSON parse of capabilities/config
 *   - getAgent: found / not found
 *   - getAgentByName: case-insensitive
 *   - getByCapability: active-only, capability param
 *   - createAgent: validation (required fields, provider),
 *     defaults (capabilities=[], default_priority=50, config=null),
 *     uuid generated, JSON stringification
 *   - updateAgent: allowed field list, JSON re-stringify for
 *     capabilities/config, affectedRows=0 throws
 *   - setStatus: status validation, affectedRows=0 throws
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

// ── Stub db + uuid ─────────────────────────────────────────────────────
type QCall = { sql: string; params: any[] };
let qCalls: QCall[] = [];
let qRoutes: Array<{ match: RegExp; rows?: any[]; result?: any }> = [];

const pool = {
  query: async (sql: string, params: any[] = []) => {
    qCalls.push({ sql, params });
    for (const r of qRoutes) {
      if (r.match.test(sql)) {
        if (r.rows !== undefined) return [r.rows, []];
        return [r.result ?? { affectedRows: 1 }, []];
      }
    }
    return [[], []];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => pool },
} as any;

// Stub uuid for deterministic tests
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: { v4: () => 'test-uuid-1234' },
} as any;

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
// listAgents: no filters
// ============================================================================
console.log('\n── listAgents: no filters ────────────────────────────────');

qCalls = [];
qRoutes = [{ match: /SELECT[\s\S]*FROM agent_registry/i, rows: [
  { id: 'a1', name: 'Claude', provider: 'anthropic', capabilities: '["plan","execute"]', config: '{"foo":"bar"}', default_priority: 10 },
  { id: 'a2', name: 'GPT', provider: 'openai', capabilities: null, config: null, default_priority: 20 },
]}];
{
  const agents = await listAgents();
  assertEq(agents.length, 2, '2 agents returned');
  assertEq(agents[0].capabilities, ['plan', 'execute'], 'capabilities parsed');
  assertEq(agents[0].config, { foo: 'bar' }, 'config parsed');
  assertEq(agents[1].capabilities, [], 'null capabilities → []');
  assertEq(agents[1].config, null, 'null config → null');
  assertEq(qCalls[0].params, [], 'no filter params');
  assert(/ORDER BY default_priority ASC, name ASC/.test(qCalls[0].sql), 'order by priority, name');
}

// ============================================================================
// listAgents: with filters
// ============================================================================
console.log('\n── listAgents: with filters ──────────────────────────────');

qCalls = [];
qRoutes = [{ match: /SELECT[\s\S]*FROM agent_registry/i, rows: [] }];
{
  await listAgents({ status: 'active', provider: 'anthropic', capability: 'plan' });
  const sql = qCalls[0].sql;
  const params = qCalls[0].params;
  assert(sql.includes('status = ?'), 'status filter');
  assert(sql.includes('provider = ?'), 'provider filter');
  assert(sql.includes('JSON_CONTAINS(capabilities, ?)'), 'capability JSON_CONTAINS');
  assertEq(params[0], 'active', 'status param');
  assertEq(params[1], 'anthropic', 'provider param');
  assertEq(params[2], JSON.stringify('plan'), 'capability JSON stringified');
}

// Partial filter
qCalls = [];
qRoutes = [{ match: /SELECT/i, rows: [] }];
{
  await listAgents({ provider: 'openai' });
  assert(qCalls[0].sql.includes('provider = ?'), 'provider filter only');
  assert(!qCalls[0].sql.includes('status = ?'), 'no status filter');
  assertEq(qCalls[0].params, ['openai'], 'only provider param');
}

// ============================================================================
// getAgent
// ============================================================================
console.log('\n── getAgent ──────────────────────────────────────────────');

qCalls = [];
qRoutes = [{ match: /SELECT \* FROM agent_registry WHERE id = \?/i, rows: [
  { id: 'x1', name: 'Test', capabilities: '["skill"]', config: '{"k":1}' },
]}];
{
  const agent = await getAgent('x1');
  assertEq(agent.id, 'x1', 'id');
  assertEq(agent.capabilities, ['skill'], 'capabilities parsed');
  assertEq(agent.config, { k: 1 }, 'config parsed');
  assertEq(qCalls[0].params, ['x1'], 'id param');
}

// Not found
qCalls = [];
qRoutes = [{ match: /SELECT/i, rows: [] }];
{
  const agent = await getAgent('missing');
  assertEq(agent, null, 'not found → null');
}

// ============================================================================
// getAgentByName
// ============================================================================
console.log('\n── getAgentByName ────────────────────────────────────────');

qCalls = [];
qRoutes = [{ match: /LOWER\(name\) = LOWER\(\?\)/i, rows: [
  { id: 'n1', name: 'Claude', capabilities: '[]', config: null },
]}];
{
  const agent = await getAgentByName('claude');
  assertEq(agent.name, 'Claude', 'case-insensitive match');
  assertEq(qCalls[0].params, ['claude'], 'name param');
}

// Not found
qCalls = [];
qRoutes = [{ match: /LOWER\(name\)/i, rows: [] }];
{
  const agent = await getAgentByName('nope');
  assertEq(agent, null, 'not found → null');
}

// ============================================================================
// getByCapability
// ============================================================================
console.log('\n── getByCapability ───────────────────────────────────────');

qCalls = [];
qRoutes = [{ match: /status = 'active'[\s\S]*JSON_CONTAINS/i, rows: [
  { id: 'c1', name: 'A1', capabilities: '["review"]', config: null },
]}];
{
  const agents = await getByCapability('review');
  assertEq(agents.length, 1, '1 agent');
  assertEq(agents[0].id, 'c1', 'correct agent');
  assertEq(qCalls[0].params, [JSON.stringify('review')], 'capability JSON stringified');
  assert(/ORDER BY default_priority ASC/.test(qCalls[0].sql), 'order by priority');
}

// ============================================================================
// createAgent: validation
// ============================================================================
console.log('\n── createAgent: validation ───────────────────────────────');

async function expectThrow(fn: () => Promise<any>, expectedMsg: string, label: string) {
  let thrown = false;
  let err: any = null;
  try { await fn(); } catch (e) { thrown = true; err = e; }
  assert(thrown, `${label}: throws`);
  if (thrown) assert(err.message.includes(expectedMsg), `${label}: error mentions "${expectedMsg}"`);
}

await expectThrow(
  () => createAgent({ provider: 'anthropic', model_id: 'claude-4' }),
  'name, provider, and model_id', 'missing name'
);

await expectThrow(
  () => createAgent({ name: 'X', model_id: 'y' }),
  'name, provider, and model_id', 'missing provider'
);

await expectThrow(
  () => createAgent({ name: 'X', provider: 'anthropic' }),
  'name, provider, and model_id', 'missing model_id'
);

await expectThrow(
  () => createAgent({ name: 'X', provider: 'BOGUS', model_id: 'm' }),
  'Invalid provider', 'invalid provider'
);

// ============================================================================
// createAgent: success + defaults
// ============================================================================
console.log('\n── createAgent: defaults ─────────────────────────────────');

qCalls = [];
qRoutes = [{ match: /INSERT INTO agent_registry/i, result: { affectedRows: 1 } }];
{
  const result = await createAgent({
    name: 'Claude',
    provider: 'anthropic',
    model_id: 'claude-opus-4-6',
  });
  assertEq(result.agent_id, 'test-uuid-1234', 'uuid from stub');
  assertEq(result.name, 'Claude', 'name returned');
  const insert = qCalls[0];
  assertEq(insert.params[0], 'test-uuid-1234', 'id param');
  assertEq(insert.params[1], 'Claude', 'name');
  assertEq(insert.params[2], 'anthropic', 'provider');
  assertEq(insert.params[3], 'claude-opus-4-6', 'model_id');
  assertEq(insert.params[4], JSON.stringify([]), 'default capabilities []');
  assertEq(insert.params[5], 50, 'default priority 50');
  assertEq(insert.params[6], null, 'default config null');
  assertEq(insert.params[7], null, 'default cost_per_1k_input null');
  assertEq(insert.params[8], null, 'default cost_per_1k_output null');
}

// With all custom fields
qCalls = [];
qRoutes = [{ match: /INSERT/i, result: {} }];
{
  await createAgent({
    name: 'GPT-4',
    provider: 'openai',
    model_id: 'gpt-4',
    capabilities: ['plan', 'code'],
    default_priority: 10,
    config: { temperature: 0.7 },
    cost_per_1k_input: 0.01,
    cost_per_1k_output: 0.03,
  });
  const insert = qCalls[0];
  assertEq(insert.params[4], JSON.stringify(['plan', 'code']), 'capabilities JSON');
  assertEq(insert.params[5], 10, 'custom priority 10');
  assertEq(insert.params[6], JSON.stringify({ temperature: 0.7 }), 'config JSON');
  assertEq(insert.params[7], 0.01, 'cost input');
  assertEq(insert.params[8], 0.03, 'cost output');
}

// ============================================================================
// updateAgent
// ============================================================================
console.log('\n── updateAgent ───────────────────────────────────────────');

qCalls = [];
qRoutes = [{ match: /UPDATE agent_registry/i, result: { affectedRows: 1 } }];
{
  const result = await updateAgent('a1', {
    name: 'New Name',
    default_priority: 5,
    capabilities: ['x', 'y'],
    config: { a: 1 },
  });
  assertEq(result, { success: true }, 'success true');
  const sql = qCalls[0].sql;
  assert(sql.includes('name = ?'), 'sets name');
  assert(sql.includes('default_priority = ?'), 'sets priority');
  assert(sql.includes('capabilities = ?'), 'sets capabilities');
  assert(sql.includes('config = ?'), 'sets config');
  assert(sql.includes('WHERE id = ?'), 'has WHERE id');
  const params = qCalls[0].params;
  // Last param is id
  assertEq(params[params.length - 1], 'a1', 'id is last param');
  // capabilities/config are JSON stringified
  assert(params.includes(JSON.stringify(['x', 'y'])), 'capabilities JSON stringified');
  assert(params.includes(JSON.stringify({ a: 1 })), 'config JSON stringified');
  assert(params.includes('New Name'), 'name in params');
  assert(params.includes(5), 'priority in params');
}

// Non-allowed field is ignored
qCalls = [];
qRoutes = [{ match: /UPDATE/i, result: { affectedRows: 1 } }];
{
  await updateAgent('a1', { name: 'X', bogus: 'Y' } as any);
  const sql = qCalls[0].sql;
  assert(sql.includes('name = ?'), 'name updated');
  assert(!sql.includes('bogus'), 'bogus field ignored');
}

// No valid fields → throws
await expectThrow(
  () => updateAgent('a1', { nonAllowed: 'x' } as any),
  'No valid fields', 'no valid fields'
);

// affectedRows 0 → throws
qCalls = [];
qRoutes = [{ match: /UPDATE/i, result: { affectedRows: 0 } }];
await expectThrow(
  () => updateAgent('missing', { name: 'X' }),
  'Agent not found', 'update not found'
);

// ============================================================================
// setStatus
// ============================================================================
console.log('\n── setStatus ─────────────────────────────────────────────');

qCalls = [];
qRoutes = [{ match: /UPDATE agent_registry SET status/i, result: { affectedRows: 1 } }];
{
  const result = await setStatus('a1', 'inactive');
  assertEq(result, { success: true }, 'success');
  assertEq(qCalls[0].params, ['inactive', 'a1'], 'status, id params');
}

// All valid statuses
for (const s of VALID_STATUSES) {
  qCalls = [];
  qRoutes = [{ match: /UPDATE/i, result: { affectedRows: 1 } }];
  await setStatus('a1', s);
  assertEq(qCalls[0].params[0], s, `setStatus accepts ${s}`);
}

// Invalid status throws
await expectThrow(
  () => setStatus('a1', 'BOGUS'),
  'Invalid status', 'invalid status'
);

// Not found
qCalls = [];
qRoutes = [{ match: /UPDATE/i, result: { affectedRows: 0 } }];
await expectThrow(
  () => setStatus('missing', 'active'),
  'Agent not found', 'status not found'
);

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
