#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRegistryService.js (OMD-979)
 *
 * Tests the agent CRUD module: listAgents, getAgent, getAgentByName,
 * getByCapability, createAgent, updateAgent, setStatus.
 *
 * Stubs `../config/db` getAppPool with a fake SQL-routed pool.
 *
 * Coverage:
 *   - Constants: VALID_STATUSES, VALID_PROVIDERS exports
 *   - listAgents: 1=1 default, status/provider/capability filters
 *     (additive AND), JSON_CONTAINS param shape, JSON parsing of
 *     capabilities/config in result rows
 *   - getAgent: returns parsed row, null when missing
 *   - getAgentByName: case-insensitive WHERE, parsed result, null
 *   - getByCapability: 'active' status filter, JSON_CONTAINS,
 *     ORDER BY default_priority ASC
 *   - createAgent: validation (required fields, provider enum),
 *     defaults (capabilities=[], default_priority=50, config/cost=null),
 *     UUID generation, JSON-stringified capabilities/config
 *   - updateAgent: whitelist enforcement, JSON serialization for
 *     capabilities/config, "no fields" error, "agent not found"
 *   - setStatus: validates status enum, "agent not found"
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
type Route = { match: RegExp; rows?: any[]; result?: any };

function makePool(routes: Route[]) {
  const calls: Array<{ sql: string; params: any[] }> = [];
  return {
    calls,
    query: async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      for (const r of routes) {
        if (r.match.test(sql)) {
          if (r.result !== undefined) return [r.result];
          return [r.rows || []];
        }
      }
      return [[]];
    },
  };
}

let activePool: any = makePool([]);
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => activePool },
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
console.log('\n── Constants ──────────────────────────────────────────');

assertEq(VALID_STATUSES, ['active', 'inactive', 'deprecated'], 'VALID_STATUSES');
assertEq(VALID_PROVIDERS, ['anthropic', 'openai', 'google', 'local'], 'VALID_PROVIDERS');

// ============================================================================
// listAgents — no filters
// ============================================================================
console.log('\n── listAgents: no filters ─────────────────────────────');

activePool = makePool([
  {
    match: /FROM agent_registry/i,
    rows: [
      { id: 'a1', name: 'gpt-4', provider: 'openai',
        capabilities: '["code","reason"]', config: '{"t":0.5}', status: 'active' },
      { id: 'a2', name: 'claude', provider: 'anthropic',
        capabilities: null, config: null, status: 'active' },
    ],
  },
]);

const list1 = await listAgents();
assertEq(list1.length, 2, '2 agents');
assertEq(list1[0].capabilities, ['code', 'reason'], 'capabilities parsed');
assertEq(list1[0].config, { t: 0.5 }, 'config parsed');
assertEq(list1[1].capabilities, [], 'null capabilities → []');
assertEq(list1[1].config, null, 'null config → null');
assert(activePool.calls[0].sql.includes('1=1'), 'no filters → 1=1');
assertEq(activePool.calls[0].params, [], 'no params');
assert(activePool.calls[0].sql.includes('default_priority ASC'), 'ORDER BY default_priority');

// ============================================================================
// listAgents — filters
// ============================================================================
console.log('\n── listAgents: filters ────────────────────────────────');

activePool = makePool([{ match: /FROM agent_registry/i, rows: [] }]);
await listAgents({ status: 'active', provider: 'openai', capability: 'code' });
const c1 = activePool.calls[0];
assert(c1.sql.includes('status = ?'), 'status filter');
assert(c1.sql.includes('provider = ?'), 'provider filter');
assert(c1.sql.includes('JSON_CONTAINS'), 'JSON_CONTAINS for capability');
assertEq(c1.params, ['active', 'openai', '"code"'], 'params include JSON-stringified capability');

// status only
activePool = makePool([{ match: /FROM agent_registry/i, rows: [] }]);
await listAgents({ status: 'inactive' });
assertEq(activePool.calls[0].params, ['inactive'], 'status only');

// ============================================================================
// getAgent
// ============================================================================
console.log('\n── getAgent ───────────────────────────────────────────');

activePool = makePool([
  {
    match: /FROM agent_registry WHERE id/i,
    rows: [{ id: 'a1', name: 'x', capabilities: '["c"]', config: '{}' }],
  },
]);
const g1 = await getAgent('a1');
assertEq(g1.id, 'a1', 'returns row');
assertEq(g1.capabilities, ['c'], 'capabilities parsed');
assertEq(g1.config, {}, 'config parsed (empty object)');
// _parseJSON returns fallback when parsed value is falsy → '{}' parses to {}
// which is truthy, so this should be {} not null
assertEq(activePool.calls[0].params, ['a1'], 'id param');

// Not found
activePool = makePool([{ match: /FROM agent_registry/i, rows: [] }]);
const g2 = await getAgent('nope');
assertEq(g2, null, 'null when missing');

// ============================================================================
// getAgentByName
// ============================================================================
console.log('\n── getAgentByName ─────────────────────────────────────');

activePool = makePool([
  {
    match: /LOWER\(name\) = LOWER\(\?\)/i,
    rows: [{ id: 'a1', name: 'GPT-4', capabilities: '[]', config: 'null' }],
  },
]);
const n1 = await getAgentByName('gpt-4');
assertEq(n1.id, 'a1', 'returns row');
assertEq(activePool.calls[0].params, ['gpt-4'], 'name param');

// Not found
activePool = makePool([{ match: /LOWER\(name\)/i, rows: [] }]);
const n2 = await getAgentByName('nope');
assertEq(n2, null, 'null when missing');

// ============================================================================
// getByCapability
// ============================================================================
console.log('\n── getByCapability ────────────────────────────────────');

activePool = makePool([
  {
    match: /JSON_CONTAINS/i,
    rows: [
      { id: 'a1', name: 'x', capabilities: '["code","reason"]', config: null },
    ],
  },
]);

const cap = await getByCapability('code');
assertEq(cap.length, 1, '1 result');
assertEq(cap[0].capabilities, ['code', 'reason'], 'capabilities parsed');
const capCall = activePool.calls[0];
assert(capCall.sql.includes("status = 'active'"), "filters active status");
assert(capCall.sql.includes('default_priority ASC'), 'ORDER BY priority');
assertEq(capCall.params, ['"code"'], 'JSON-stringified capability');

// ============================================================================
// createAgent — validation
// ============================================================================
console.log('\n── createAgent: validation ────────────────────────────');

let cErr: Error | null = null;

try { await createAgent({} as any); } catch (e: any) { cErr = e; }
assert(cErr !== null && cErr.message.includes('required'), 'missing all fields throws');

cErr = null;
try { await createAgent({ name: 'x' } as any); } catch (e: any) { cErr = e; }
assert(cErr !== null && cErr.message.includes('required'), 'missing provider+model_id throws');

cErr = null;
try {
  await createAgent({ name: 'x', provider: 'bogus', model_id: 'gpt-4' } as any);
} catch (e: any) { cErr = e; }
assert(cErr !== null && cErr.message.includes('Invalid provider'), 'invalid provider throws');

// ============================================================================
// createAgent — happy path with defaults
// ============================================================================
console.log('\n── createAgent: defaults ──────────────────────────────');

activePool = makePool([
  { match: /INSERT INTO agent_registry/i, result: { affectedRows: 1 } },
]);
const created = await createAgent({
  name: 'gpt-4', provider: 'openai', model_id: 'gpt-4-0125',
} as any);
assertEq(created.name, 'gpt-4', 'returned name');
assert(typeof created.agent_id === 'string', 'agent_id is string');
assert(created.agent_id.length > 10, 'agent_id is uuid-like');

const ic = activePool.calls[0];
assertEq(ic.params[1], 'gpt-4', 'name');
assertEq(ic.params[2], 'openai', 'provider');
assertEq(ic.params[3], 'gpt-4-0125', 'model_id');
assertEq(ic.params[4], '[]', 'capabilities defaults to "[]"');
assertEq(ic.params[5], 50, 'default_priority defaults to 50');
assertEq(ic.params[6], null, 'config defaults to null');
assertEq(ic.params[7], null, 'cost_per_1k_input defaults to null');
assertEq(ic.params[8], null, 'cost_per_1k_output defaults to null');

// Full opts
activePool = makePool([
  { match: /INSERT INTO agent_registry/i, result: { affectedRows: 1 } },
]);
await createAgent({
  name: 'claude', provider: 'anthropic', model_id: 'claude-opus-4',
  capabilities: ['code', 'reason'],
  default_priority: 10,
  config: { temp: 0.7 },
  cost_per_1k_input: '0.015',
  cost_per_1k_output: '0.075',
} as any);
const ic2 = activePool.calls[0];
assertEq(ic2.params[4], '["code","reason"]', 'capabilities JSON');
assertEq(ic2.params[5], 10, 'priority custom');
assertEq(ic2.params[6], '{"temp":0.7}', 'config JSON');
assertEq(ic2.params[7], '0.015', 'cost in');
assertEq(ic2.params[8], '0.075', 'cost out');

// ============================================================================
// updateAgent
// ============================================================================
console.log('\n── updateAgent ────────────────────────────────────────');

// No valid fields
let uErr: Error | null = null;
try { await updateAgent('a1', {}); } catch (e: any) { uErr = e; }
assert(uErr !== null && uErr.message.includes('No valid fields'), 'empty updates throw');

// Bogus only
uErr = null;
try { await updateAgent('a1', { bogus: 'x' } as any); } catch (e: any) { uErr = e; }
assert(uErr !== null, 'bogus updates throw');

// Happy path
activePool = makePool([
  { match: /UPDATE agent_registry/i, result: { affectedRows: 1 } },
]);
await updateAgent('a1', {
  name: 'renamed',
  capabilities: ['x', 'y'],
  config: { foo: 1 },
  default_priority: 5,
} as any);
const uc = activePool.calls[0];
// allowed order: name, provider, model_id, capabilities, default_priority, config, ...
// only updated: name, capabilities, default_priority, config
assert(uc.sql.includes('name = ?'), 'name in SET');
assert(uc.sql.includes('capabilities = ?'), 'capabilities in SET');
assert(uc.sql.includes('default_priority = ?'), 'default_priority in SET');
assert(uc.sql.includes('config = ?'), 'config in SET');
assertEq(uc.params[0], 'renamed', 'name first');
assertEq(uc.params[1], '["x","y"]', 'capabilities JSON');
assertEq(uc.params[2], 5, 'default_priority');
assertEq(uc.params[3], '{"foo":1}', 'config JSON');
assertEq(uc.params[4], 'a1', 'id last');

// Agent not found
activePool = makePool([
  { match: /UPDATE agent_registry/i, result: { affectedRows: 0 } },
]);
uErr = null;
try { await updateAgent('a1', { name: 'x' } as any); } catch (e: any) { uErr = e; }
assert(uErr !== null && uErr.message.includes('Agent not found'), 'not found throws');

// ============================================================================
// setStatus
// ============================================================================
console.log('\n── setStatus ──────────────────────────────────────────');

let sErr: Error | null = null;
try { await setStatus('a1', 'bogus'); } catch (e: any) { sErr = e; }
assert(sErr !== null && sErr.message.includes('Invalid status'), 'invalid status throws');

activePool = makePool([
  { match: /UPDATE agent_registry SET status/i, result: { affectedRows: 1 } },
]);
const ss = await setStatus('a1', 'active');
assertEq(ss.success, true, 'success');
assertEq(activePool.calls[0].params, ['active', 'a1'], 'status + id params');

// All valid statuses accepted
for (const status of VALID_STATUSES) {
  activePool = makePool([
    { match: /UPDATE agent_registry SET status/i, result: { affectedRows: 1 } },
  ]);
  await setStatus('a1', status);
  assertEq(activePool.calls[0].params[0], status, `accepts status: ${status}`);
}

// Not found
activePool = makePool([
  { match: /UPDATE agent_registry SET status/i, result: { affectedRows: 0 } },
]);
sErr = null;
try { await setStatus('a1', 'active'); } catch (e: any) { sErr = e; }
assert(sErr !== null && sErr.message.includes('Agent not found'), 'not found throws');

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
