#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRegistryService.js (OMD-1216)
 *
 * CRUD over agent_registry table with JSON parsing.
 * Dependencies:
 *   - `uuid` (v4) — stub to return a deterministic id
 *   - `../config/db` — getAppPool() returns a pool with .query()
 *
 * Strategy: regex-dispatch fake pool recording every query call with
 * scripted row responses. Stub uuid to make insert params predictable.
 *
 * Coverage:
 *   - listAgents: no filters, status, provider, capability, combined
 *                 (SQL fragments + params), result mapping (JSON parse)
 *   - getAgent: found / not found
 *   - getAgentByName: LOWER comparison
 *   - getByCapability: status='active' + JSON_CONTAINS filter, sort
 *   - createAgent:
 *       · required fields validated (throws)
 *       · provider validated (throws)
 *       · uuid generated, capabilities/config JSON-stringified,
 *         defaults (priority=50, nulls) applied
 *       · returns { agent_id, name }
 *   - updateAgent:
 *       · empty updates → throws "No valid fields"
 *       · partial updates build SET + params in order
 *       · capabilities/config serialized
 *       · affectedRows=0 → throws "Agent not found"
 *   - setStatus:
 *       · invalid status → throws
 *       · affectedRows=0 → throws
 *       · success path
 *   - _parseAgent: malformed JSON → fallback ([], null)
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

// ── Fake pool ───────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryCalls: QueryCall[] = [];

// Regex-dispatch: first matching responder wins.
type Responder = { match: RegExp; respond: (params: any[]) => any };
let responders: Responder[] = [];

function respond(match: RegExp, respondOrResult: any) {
  const respond = typeof respondOrResult === 'function' ? respondOrResult : () => respondOrResult;
  responders.push({ match, respond });
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryCalls.push({ sql, params });
    for (const r of responders) {
      if (r.match.test(sql)) {
        const result = r.respond(params);
        return result;
      }
    }
    // Default: empty result
    return [[], []];
  },
};

// ── Stub ../config/db ───────────────────────────────────────────────
const dbStub = { getAppPool: () => fakePool };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: dbStub,
} as any;

// ── Stub uuid ───────────────────────────────────────────────────────
let nextUuid = 'uuid-fixed-1';
const uuidStub = { v4: () => nextUuid };
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: uuidStub,
} as any;

function resetState() {
  queryCalls.length = 0;
  responders = [];
  nextUuid = 'uuid-fixed-1';
}

// ── Load SUT ────────────────────────────────────────────────────────
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
// listAgents — no filters
// ============================================================================
console.log('\n── listAgents: no filters ────────────────────────────────');

resetState();
respond(/SELECT \* FROM agent_registry/, [[
  { id: 'a1', name: 'claude', capabilities: '["reasoning","code"]', config: '{"temp":0.2}' },
], []]);
{
  const rows = await listAgents();
  assertEq(queryCalls.length, 1, '1 query');
  assert(/WHERE 1=1/.test(queryCalls[0].sql), 'baseline WHERE 1=1');
  assert(/ORDER BY default_priority ASC, name ASC/.test(queryCalls[0].sql), 'order by priority then name');
  assertEq(queryCalls[0].params, [], 'no params');
  assertEq(rows.length, 1, 'one row');
  assertEq(rows[0].id, 'a1', 'row id');
  assertEq(rows[0].capabilities, ['reasoning', 'code'], 'capabilities JSON parsed');
  assertEq(rows[0].config, { temp: 0.2 }, 'config JSON parsed');
}

// ============================================================================
// listAgents — status filter
// ============================================================================
console.log('\n── listAgents: status filter ─────────────────────────────');

resetState();
respond(/SELECT \* FROM agent_registry/, [[], []]);
await listAgents({ status: 'active' });
assert(/status = \?/.test(queryCalls[0].sql), 'WHERE status = ?');
assertEq(queryCalls[0].params, ['active'], 'params include status');

// ============================================================================
// listAgents — provider filter
// ============================================================================
resetState();
respond(/SELECT \* FROM agent_registry/, [[], []]);
await listAgents({ provider: 'anthropic' });
assert(/provider = \?/.test(queryCalls[0].sql), 'WHERE provider = ?');
assertEq(queryCalls[0].params, ['anthropic'], 'params include provider');

// ============================================================================
// listAgents — capability filter (JSON_CONTAINS)
// ============================================================================
resetState();
respond(/SELECT \* FROM agent_registry/, [[], []]);
await listAgents({ capability: 'vision' });
assert(/JSON_CONTAINS\(capabilities, \?\)/.test(queryCalls[0].sql), 'JSON_CONTAINS clause');
assertEq(queryCalls[0].params, [JSON.stringify('vision')], 'capability JSON-serialized');

// ============================================================================
// listAgents — combined filters
// ============================================================================
resetState();
respond(/SELECT \* FROM agent_registry/, [[], []]);
await listAgents({ status: 'active', provider: 'anthropic', capability: 'code' });
{
  const sql = queryCalls[0].sql;
  assert(/status = \?/.test(sql), 'combined: status clause');
  assert(/provider = \?/.test(sql), 'combined: provider clause');
  assert(/JSON_CONTAINS/.test(sql), 'combined: JSON_CONTAINS clause');
  assertEq(
    queryCalls[0].params,
    ['active', 'anthropic', JSON.stringify('code')],
    'combined: params in order',
  );
}

// ============================================================================
// getAgent — found
// ============================================================================
console.log('\n── getAgent ──────────────────────────────────────────────');

resetState();
respond(/SELECT \* FROM agent_registry WHERE id = \?/, (p: any[]) => {
  if (p[0] === 'x1') return [[{ id: 'x1', name: 'gpt', capabilities: '[]', config: null }], []];
  return [[], []];
});
{
  const a = await getAgent('x1');
  assertEq((a as any).id, 'x1', 'returns agent');
  assertEq((a as any).capabilities, [], 'capabilities empty array');
  assertEq((a as any).config, null, 'config null fallback');
  assertEq(queryCalls[0].params, ['x1'], 'id param');
}

// not found
resetState();
respond(/SELECT \*/, [[], []]);
{
  const a = await getAgent('missing');
  assertEq(a, null, 'null when not found');
}

// ============================================================================
// getAgentByName — LOWER
// ============================================================================
console.log('\n── getAgentByName ────────────────────────────────────────');

resetState();
respond(/LOWER\(name\) = LOWER\(\?\)/, [[{ id: 'n1', name: 'Claude', capabilities: '[]', config: null }], []]);
{
  const a = await getAgentByName('CLAUDE');
  assert(/LOWER\(name\)/.test(queryCalls[0].sql), 'uses LOWER for case insensitive');
  assertEq((a as any).id, 'n1', 'found');
  assertEq(queryCalls[0].params, ['CLAUDE'], 'name param unchanged');
}

resetState();
respond(/LOWER/, [[], []]);
{
  const a = await getAgentByName('nope');
  assertEq(a, null, 'null when not found');
}

// ============================================================================
// getByCapability
// ============================================================================
console.log('\n── getByCapability ───────────────────────────────────────');

resetState();
respond(/SELECT \* FROM agent_registry/, [[
  { id: 'c1', name: 'claude', capabilities: '["vision"]', config: null },
  { id: 'c2', name: 'gpt', capabilities: '["vision"]', config: null },
], []]);
{
  const rows = await getByCapability('vision');
  assert(/status = 'active'/.test(queryCalls[0].sql), 'filters active only');
  assert(/JSON_CONTAINS\(capabilities, \?\)/.test(queryCalls[0].sql), 'JSON_CONTAINS');
  assert(/ORDER BY default_priority ASC/.test(queryCalls[0].sql), 'ordered by priority');
  assertEq(queryCalls[0].params, [JSON.stringify('vision')], 'capability serialized');
  assertEq(rows.length, 2, '2 rows');
  assertEq((rows as any[])[0].capabilities, ['vision'], 'capabilities parsed');
}

// ============================================================================
// createAgent — validation
// ============================================================================
console.log('\n── createAgent: validation ───────────────────────────────');

resetState();
{
  let caught: Error | null = null;
  try {
    await createAgent({ provider: 'anthropic', model_id: 'claude-4' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'missing name throws');
  assert(
    caught !== null && /name, provider, and model_id are required/.test(caught.message),
    'error mentions required fields',
  );
  assertEq(queryCalls.length, 0, 'no DB call');
}

resetState();
{
  let caught: Error | null = null;
  try {
    await createAgent({ name: 'x', provider: 'badprov', model_id: 'm' });
  } catch (e: any) { caught = e; }
  assert(caught !== null && /Invalid provider/.test(caught.message), 'invalid provider throws');
}

// ============================================================================
// createAgent — happy path
// ============================================================================
console.log('\n── createAgent: happy path ───────────────────────────────');

resetState();
nextUuid = 'agent-uuid-abc';
respond(/INSERT INTO agent_registry/, [{ affectedRows: 1 }, []]);
{
  const result = await createAgent({
    name: 'claude-opus-4',
    provider: 'anthropic',
    model_id: 'claude-opus-4-6',
    capabilities: ['reasoning', 'code'],
    default_priority: 10,
    config: { temp: 0.2 },
    cost_per_1k_input: 15,
    cost_per_1k_output: 75,
  });
  assertEq(result, { agent_id: 'agent-uuid-abc', name: 'claude-opus-4' }, 'returns id+name');
  assertEq(queryCalls.length, 1, 'one INSERT');
  const params = queryCalls[0].params;
  assertEq(params[0], 'agent-uuid-abc', 'uuid as id');
  assertEq(params[1], 'claude-opus-4', 'name');
  assertEq(params[2], 'anthropic', 'provider');
  assertEq(params[3], 'claude-opus-4-6', 'model_id');
  assertEq(params[4], JSON.stringify(['reasoning', 'code']), 'capabilities JSON-serialized');
  assertEq(params[5], 10, 'default_priority');
  assertEq(params[6], JSON.stringify({ temp: 0.2 }), 'config JSON-serialized');
  assertEq(params[7], 15, 'cost_per_1k_input');
  assertEq(params[8], 75, 'cost_per_1k_output');
}

// Defaults applied
resetState();
nextUuid = 'agent-uuid-defaults';
respond(/INSERT/, [{ affectedRows: 1 }, []]);
{
  await createAgent({ name: 'tiny', provider: 'local', model_id: 'llama' });
  const params = queryCalls[0].params;
  assertEq(params[4], JSON.stringify([]), 'capabilities defaults to []');
  assertEq(params[5], 50, 'default_priority defaults to 50');
  assertEq(params[6], null, 'config defaults to null');
  assertEq(params[7], null, 'cost_per_1k_input defaults to null');
  assertEq(params[8], null, 'cost_per_1k_output defaults to null');
}

// ============================================================================
// updateAgent
// ============================================================================
console.log('\n── updateAgent ───────────────────────────────────────────');

// No valid fields → throws
resetState();
{
  let caught: Error | null = null;
  try { await updateAgent('x', {}); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /No valid fields/.test(caught.message), 'empty update throws');
  assertEq(queryCalls.length, 0, 'no query issued');
}

// Partial update — capabilities + config serialized, scalars pass through
resetState();
respond(/UPDATE agent_registry SET/, [{ affectedRows: 1 }, []]);
{
  await updateAgent('agent-1', {
    name: 'renamed',
    capabilities: ['a', 'b'],
    config: { k: 1 },
    cost_per_1k_input: 20,
  });
  assertEq(queryCalls.length, 1, '1 query');
  const sql = queryCalls[0].sql;
  assert(/SET name = \?/.test(sql), 'SET name');
  assert(/capabilities = \?/.test(sql), 'SET capabilities');
  assert(/config = \?/.test(sql), 'SET config');
  assert(/cost_per_1k_input = \?/.test(sql), 'SET cost_per_1k_input');
  assert(/WHERE id = \?$/.test(sql), 'WHERE id last');
  const params = queryCalls[0].params;
  assertEq(params[0], 'renamed', 'name value');
  assertEq(params[1], JSON.stringify(['a', 'b']), 'capabilities serialized');
  assertEq(params[2], JSON.stringify({ k: 1 }), 'config serialized');
  assertEq(params[3], 20, 'cost passthrough');
  assertEq(params[4], 'agent-1', 'id last');
}

// Agent not found
resetState();
respond(/UPDATE agent_registry SET/, [{ affectedRows: 0 }, []]);
{
  let caught: Error | null = null;
  try { await updateAgent('ghost', { name: 'x' }); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /Agent not found/.test(caught.message), 'affectedRows=0 throws');
}

// ============================================================================
// setStatus
// ============================================================================
console.log('\n── setStatus ─────────────────────────────────────────────');

// Invalid status
resetState();
{
  let caught: Error | null = null;
  try { await setStatus('id', 'retired'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /Invalid status/.test(caught.message), 'invalid status throws');
  assertEq(queryCalls.length, 0, 'no DB call');
}

// Success
resetState();
respond(/UPDATE agent_registry SET status/, [{ affectedRows: 1 }, []]);
{
  const r = await setStatus('id-1', 'inactive');
  assertEq(r, { success: true }, 'returns success');
  assertEq(queryCalls[0].params, ['inactive', 'id-1'], 'params [status, id]');
}

// Not found
resetState();
respond(/UPDATE agent_registry SET status/, [{ affectedRows: 0 }, []]);
{
  let caught: Error | null = null;
  try { await setStatus('ghost', 'active'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /Agent not found/.test(caught.message), 'affectedRows=0 throws');
}

// ============================================================================
// _parseAgent fallback (via getAgent)
// ============================================================================
console.log('\n── JSON parse fallback ───────────────────────────────────');

resetState();
respond(/SELECT/, [[{ id: 'bad', capabilities: '{not-json', config: '{also-not' }], []]);
{
  const a = await getAgent('bad');
  assertEq((a as any).capabilities, [], 'bad capabilities → []');
  assertEq((a as any).config, null, 'bad config → null');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
