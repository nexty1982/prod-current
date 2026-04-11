#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRegistryService.js (OMD-1009)
 *
 * Covers:
 *   - listAgents           no filters, status, provider, capability,
 *                           combined filters, JSON param for JSON_CONTAINS,
 *                           _parseAgent JSON handling in returned rows
 *   - getAgent             found returns parsed, not-found returns null
 *   - getAgentByName       LOWER case-insensitive SQL
 *   - getByCapability      active-only + capability filter
 *   - createAgent          required field validation, provider enum validation,
 *                           uuid assigned, defaults (priority=50, capabilities=[],
 *                           config=null), JSON serialization
 *   - updateAgent          field allowlist filtering, JSON serialization for
 *                           capabilities/config, affectedRows=0 → throws,
 *                           no-valid-fields → throws
 *   - setStatus            status enum validation, affectedRows=0 → throws
 *   - VALID_STATUSES / VALID_PROVIDERS exports
 *   - _parseJSON           null/invalid/valid/fallback via end-to-end row
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

// ── Stub uuid BEFORE requiring SUT ──────────────────────────────────────
let uuidCounter = 0;
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: { v4: () => `agent-uuid-${++uuidCounter}` },
} as any;

// ── Stub config/db BEFORE requiring SUT ─────────────────────────────────
type Call = { sql: string; params: any[] };
const poolCalls: Call[] = [];
type Route = { match: RegExp; rows: any[]; result?: any; throws?: Error };
const poolRoutes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    poolCalls.push({ sql, params });
    for (const r of poolRoutes) {
      if (r.match.test(sql)) {
        if (r.throws) throw r.throws;
        return [r.rows, r.result ?? {}] as any;
      }
    }
    return [[], {}] as any;
  },
};

function resetPool() {
  poolCalls.length = 0;
  poolRoutes.length = 0;
}

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
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
// VALID_STATUSES / VALID_PROVIDERS exports
// ============================================================================
console.log('\n── exports sanity ────────────────────────────────────────');

assertEq(VALID_STATUSES, ['active', 'inactive', 'deprecated'], 'VALID_STATUSES');
assertEq(VALID_PROVIDERS, ['anthropic', 'openai', 'google', 'local'], 'VALID_PROVIDERS');

// ============================================================================
// listAgents — no filters
// ============================================================================
console.log('\n── listAgents: no filters ────────────────────────────────');

resetPool();
poolRoutes.push({
  match: /SELECT \* FROM agent_registry/i,
  rows: [
    {
      id: 'a1', name: 'Claude', provider: 'anthropic', model_id: 'claude-opus',
      capabilities: JSON.stringify(['code', 'chat']),
      config: JSON.stringify({ temp: 0.7 }),
      default_priority: 10, status: 'active',
    },
  ],
});
{
  const agents = await listAgents();
  assertEq(agents.length, 1, '1 agent');
  assertEq(agents[0].capabilities, ['code', 'chat'], 'capabilities parsed from JSON');
  assertEq(agents[0].config, { temp: 0.7 }, 'config parsed from JSON');
  assertEq(agents[0].name, 'Claude', 'name preserved');
  assert(/WHERE 1=1/i.test(poolCalls[0].sql), 'WHERE 1=1 base');
  assert(/ORDER BY default_priority ASC, name ASC/i.test(poolCalls[0].sql), 'sort clause');
  assertEq(poolCalls[0].params, [], 'no params');
}

// ============================================================================
// listAgents — filters
// ============================================================================
console.log('\n── listAgents: filters ───────────────────────────────────');

resetPool();
poolRoutes.push({ match: /SELECT \* FROM agent_registry/i, rows: [] });
{
  await listAgents({ status: 'active', provider: 'anthropic', capability: 'code' });
  assert(/status = \?/i.test(poolCalls[0].sql), 'status clause');
  assert(/provider = \?/i.test(poolCalls[0].sql), 'provider clause');
  assert(/JSON_CONTAINS\(capabilities, \?\)/i.test(poolCalls[0].sql), 'JSON_CONTAINS clause');
  assertEq(
    poolCalls[0].params,
    ['active', 'anthropic', JSON.stringify('code')],
    'params bound in order',
  );
}

// Partial filters
resetPool();
poolRoutes.push({ match: /SELECT \* FROM agent_registry/i, rows: [] });
{
  await listAgents({ provider: 'openai' });
  assertEq(poolCalls[0].params, ['openai'], 'only provider param');
  assert(!/status = \?/i.test(poolCalls[0].sql), 'no status clause');
}

// Bad JSON in capabilities → falls back to []
resetPool();
poolRoutes.push({
  match: /SELECT \*/i,
  rows: [{ id: 'a1', name: 'Broken', capabilities: 'not-json{', config: null }],
});
{
  const agents = await listAgents();
  assertEq(agents[0].capabilities, [], 'bad JSON → [] fallback');
  assertEq(agents[0].config, null, 'null config → null');
}

// ============================================================================
// getAgent
// ============================================================================
console.log('\n── getAgent ──────────────────────────────────────────────');

// Found
resetPool();
poolRoutes.push({
  match: /SELECT \* FROM agent_registry WHERE id = \?/i,
  rows: [{ id: 'a1', name: 'X', capabilities: '["cap1"]', config: null }],
});
{
  const a = await getAgent('a1');
  assert(a !== null, 'returns agent');
  assertEq(a.capabilities, ['cap1'], 'capabilities parsed');
  assertEq(poolCalls[0].params, ['a1'], 'id param');
}

// Not found
resetPool();
poolRoutes.push({ match: /SELECT \*/i, rows: [] });
{
  const a = await getAgent('missing');
  assertEq(a, null, 'not found → null');
}

// ============================================================================
// getAgentByName
// ============================================================================
console.log('\n── getAgentByName ────────────────────────────────────────');

resetPool();
poolRoutes.push({
  match: /WHERE LOWER\(name\) = LOWER\(\?\)/i,
  rows: [{ id: 'a1', name: 'Claude', capabilities: '[]', config: null }],
});
{
  const a = await getAgentByName('CLAUDE');
  assert(a !== null && a.id === 'a1', 'case-insensitive lookup');
  assertEq(poolCalls[0].params, ['CLAUDE'], 'name param preserved (SQL does LOWER)');
}

// Not found
resetPool();
poolRoutes.push({ match: /LOWER/i, rows: [] });
{
  const a = await getAgentByName('Nope');
  assertEq(a, null, 'not found → null');
}

// ============================================================================
// getByCapability
// ============================================================================
console.log('\n── getByCapability ───────────────────────────────────────');

resetPool();
poolRoutes.push({
  match: /status = 'active'[\s\S]*JSON_CONTAINS/i,
  rows: [
    { id: 'a1', name: 'A', capabilities: '["vision"]', config: null },
    { id: 'a2', name: 'B', capabilities: '["vision"]', config: null },
  ],
});
{
  const agents = await getByCapability('vision');
  assertEq(agents.length, 2, '2 agents matched');
  assertEq(poolCalls[0].params, [JSON.stringify('vision')], 'capability param JSON-stringified');
  assert(/default_priority ASC/i.test(poolCalls[0].sql), 'sorted by priority');
}

// ============================================================================
// createAgent — validation
// ============================================================================
console.log('\n── createAgent: validation ───────────────────────────────');

resetPool();
{
  let caught: Error | null = null;
  try { await createAgent({} as any); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /required/i.test(caught!.message), 'missing fields → throws');
}

resetPool();
{
  let caught: Error | null = null;
  try { await createAgent({ name: 'x', provider: 'x' } as any); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /required/i.test(caught!.message), 'missing model_id → throws');
}

resetPool();
{
  let caught: Error | null = null;
  try {
    await createAgent({ name: 'x', provider: 'bogus', model_id: 'x' } as any);
  } catch (e: any) { caught = e; }
  assert(caught !== null && /Invalid provider/i.test(caught!.message), 'bad provider → throws');
  assert(caught !== null && /anthropic/.test(caught!.message), 'lists valid providers');
}

// ============================================================================
// createAgent — happy path with defaults
// ============================================================================
console.log('\n── createAgent: defaults ─────────────────────────────────');

resetPool();
poolRoutes.push({ match: /^INSERT INTO agent_registry/i, rows: [] });
{
  uuidCounter = 0;
  const r = await createAgent({
    name: 'Opus',
    provider: 'anthropic',
    model_id: 'claude-opus-4-6',
  } as any);
  assertEq(r.agent_id, 'agent-uuid-1', 'uuid assigned');
  assertEq(r.name, 'Opus', 'name returned');
  // INSERT params
  const ins = poolCalls[0];
  assertEq(ins.params[0], 'agent-uuid-1', 'id = uuid');
  assertEq(ins.params[1], 'Opus', 'name');
  assertEq(ins.params[2], 'anthropic', 'provider');
  assertEq(ins.params[3], 'claude-opus-4-6', 'model_id');
  assertEq(ins.params[4], JSON.stringify([]), 'capabilities default = []');
  assertEq(ins.params[5], 50, 'default_priority = 50');
  assertEq(ins.params[6], null, 'config default = null');
  assertEq(ins.params[7], null, 'cost_per_1k_input default null');
  assertEq(ins.params[8], null, 'cost_per_1k_output default null');
}

// With full fields
resetPool();
poolRoutes.push({ match: /^INSERT/i, rows: [] });
{
  await createAgent({
    name: 'X', provider: 'openai', model_id: 'gpt-4',
    capabilities: ['code', 'vision'],
    default_priority: 5,
    config: { temp: 0.5 },
    cost_per_1k_input: 0.01,
    cost_per_1k_output: 0.03,
  } as any);
  const ins = poolCalls[0];
  assertEq(ins.params[4], JSON.stringify(['code', 'vision']), 'capabilities serialized');
  assertEq(ins.params[5], 5, 'priority = 5');
  assertEq(ins.params[6], JSON.stringify({ temp: 0.5 }), 'config serialized');
  assertEq(ins.params[7], 0.01, 'cost_per_1k_input');
  assertEq(ins.params[8], 0.03, 'cost_per_1k_output');
}

// ============================================================================
// updateAgent — field allowlist
// ============================================================================
console.log('\n── updateAgent ───────────────────────────────────────────');

// No valid fields → throws
resetPool();
{
  let caught: Error | null = null;
  try { await updateAgent('a1', { bogus: 'x' } as any); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /No valid fields/i.test(caught!.message), 'no fields → throws');
}

// Happy path — only allowed fields set
resetPool();
// Service destructures `const [result] = ...` — put affectedRows in first slot
poolRoutes.push({
  match: /^UPDATE agent_registry SET/i,
  rows: { affectedRows: 1 } as any,
});
{
  const r = await updateAgent('a1', {
    name: 'New',
    provider: 'google',
    capabilities: ['chat'],
    config: { x: 1 },
    bogus_field: 'ignored',
    cost_per_1k_input: 0.002,
  } as any);
  assertEq(r, { success: true }, 'returns success');
  const upd = poolCalls[0];
  // Fields should appear in allowed-order, not update-order
  assert(/name = \?/i.test(upd.sql), 'name in SET');
  assert(/provider = \?/i.test(upd.sql), 'provider in SET');
  assert(/capabilities = \?/i.test(upd.sql), 'capabilities in SET');
  assert(/config = \?/i.test(upd.sql), 'config in SET');
  assert(/cost_per_1k_input = \?/i.test(upd.sql), 'cost_per_1k_input in SET');
  assert(!/bogus/i.test(upd.sql), 'bogus_field NOT in SET');
  // Last param is id
  assertEq(upd.params[upd.params.length - 1], 'a1', 'id last');
  // capabilities and config should be JSON
  const capIdx = upd.params.findIndex(p => p === JSON.stringify(['chat']));
  assert(capIdx !== -1, 'capabilities JSON param present');
  const cfgIdx = upd.params.findIndex(p => p === JSON.stringify({ x: 1 }));
  assert(cfgIdx !== -1, 'config JSON param present');
}

// Not found → throws
resetPool();
poolRoutes.push({
  match: /^UPDATE/i,
  rows: { affectedRows: 0 } as any,
});
{
  let caught: Error | null = null;
  try { await updateAgent('missing', { name: 'x' }); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /Agent not found/i.test(caught!.message), 'not found → throws');
}

// ============================================================================
// setStatus — validation
// ============================================================================
console.log('\n── setStatus ─────────────────────────────────────────────');

// Bad status
resetPool();
{
  let caught: Error | null = null;
  try { await setStatus('a1', 'disabled'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /Invalid status/i.test(caught!.message), 'bad status → throws');
  assert(caught !== null && /active/.test(caught!.message), 'lists valid statuses');
}

// Happy path
resetPool();
poolRoutes.push({
  match: /^UPDATE agent_registry SET status/i,
  rows: { affectedRows: 1 } as any,
});
{
  const r = await setStatus('a1', 'deprecated');
  assertEq(r, { success: true }, 'success');
  assertEq(poolCalls[0].params, ['deprecated', 'a1'], 'params [status, id]');
}

// Not found
resetPool();
poolRoutes.push({
  match: /^UPDATE agent_registry SET status/i,
  rows: { affectedRows: 0 } as any,
});
{
  let caught: Error | null = null;
  try { await setStatus('missing', 'active'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /Agent not found/i.test(caught!.message), 'not found → throws');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main()

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
