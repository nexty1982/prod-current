#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRegistryService.js (OMD-1201)
 *
 * CRUD for execution agents. Deps: config/db.getAppPool, uuid.v4.
 *
 * Strategy: stub db-compat via require.cache with a regex-dispatch fake
 * pool that scripts responses keyed by SQL. Stub uuid to return a
 * deterministic id.
 *
 * Coverage:
 *   - VALID_STATUSES / VALID_PROVIDERS exported constants
 *   - listAgents: no filters, status filter, provider filter, capability
 *     filter, multi-filter AND composition, _parseAgent JSON handling
 *   - getAgent: hit / miss
 *   - getAgentByName: case-insensitive SQL lookup
 *   - getByCapability: JSON_CONTAINS + status='active'
 *   - createAgent: required field validation, provider validation,
 *     default capabilities [], default priority 50, JSON.stringify,
 *     returns { agent_id, name }
 *   - updateAgent: field whitelist, capabilities/config JSON.stringify,
 *     no valid fields → throws, affectedRows=0 → throws
 *   - setStatus: status validation, affectedRows=0 → throws
 *   - _parseJSON fallback: null/invalid/empty → fallback
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

type Responder = { match: RegExp; respond: (params: any[]) => any };
let responders: Responder[] = [];

function runQuery(sql: string, params: any[] = []) {
  queryLog.push({ sql, params });
  for (const r of responders) {
    if (r.match.test(sql)) return Promise.resolve(r.respond(params));
  }
  return Promise.resolve([[]]);
}

const fakePool = { query: runQuery };

const dbCompatPath = require.resolve('../../config/db');
require.cache[dbCompatPath] = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: {
    getAppPool: () => fakePool,
    getTenantPool: () => fakePool,
  },
} as any;

// ── uuid stub (replace cached module entirely) ──────────────────────
let nextUuid = 'fixed-uuid-0001';
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: { v4: () => nextUuid },
} as any;

function reset() {
  queryLog.length = 0;
  responders = [];
  nextUuid = 'fixed-uuid-0001';
}

// Silence
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const svc = require('../agentRegistryService');

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── exported constants ───────────────────────────────────');

assertEq(svc.VALID_STATUSES, ['active', 'inactive', 'deprecated'], 'VALID_STATUSES');
assertEq(svc.VALID_PROVIDERS, ['anthropic', 'openai', 'google', 'local'], 'VALID_PROVIDERS');

// ============================================================================
// listAgents
// ============================================================================
console.log('\n── listAgents: no filters ───────────────────────────────');

reset();
responders = [
  { match: /SELECT \* FROM agent_registry/i, respond: () => [[
    { id: 'a1', name: 'Claude', provider: 'anthropic', capabilities: '["code","chat"]', config: '{"temp":0.5}' },
    { id: 'a2', name: 'GPT',    provider: 'openai',    capabilities: null, config: null },
  ]] },
];
{
  const result = await svc.listAgents();
  assertEq(result.length, 2, 'two agents returned');
  assertEq(result[0].id, 'a1', 'first id');
  assertEq(result[0].capabilities, ['code', 'chat'], 'capabilities parsed');
  assertEq(result[0].config, { temp: 0.5 }, 'config parsed');
  assertEq(result[1].capabilities, [], 'null capabilities → []');
  assertEq(result[1].config, null, 'null config → null');
  // The SQL should contain "1=1" (no filter) and ORDER BY
  assert(/1=1/.test(queryLog[0].sql), 'base 1=1 present');
  assert(/ORDER BY default_priority ASC, name ASC/.test(queryLog[0].sql), 'order by priority');
  assertEq(queryLog[0].params, [], 'no params');
}

console.log('\n── listAgents: status filter ────────────────────────────');

reset();
responders = [{ match: /SELECT \* FROM agent_registry/i, respond: () => [[]] }];
{
  await svc.listAgents({ status: 'active' });
  assert(/status = \?/.test(queryLog[0].sql), 'status clause');
  assertEq(queryLog[0].params, ['active'], 'status param');
}

console.log('\n── listAgents: provider filter ──────────────────────────');

reset();
responders = [{ match: /SELECT \* FROM agent_registry/i, respond: () => [[]] }];
{
  await svc.listAgents({ provider: 'openai' });
  assert(/provider = \?/.test(queryLog[0].sql), 'provider clause');
  assertEq(queryLog[0].params, ['openai'], 'provider param');
}

console.log('\n── listAgents: capability filter ────────────────────────');

reset();
responders = [{ match: /SELECT \* FROM agent_registry/i, respond: () => [[]] }];
{
  await svc.listAgents({ capability: 'ocr' });
  assert(/JSON_CONTAINS\(capabilities, \?\)/.test(queryLog[0].sql), 'JSON_CONTAINS clause');
  assertEq(queryLog[0].params, ['"ocr"'], 'capability stringified');
}

console.log('\n── listAgents: multi-filter AND composition ─────────────');

reset();
responders = [{ match: /SELECT \* FROM agent_registry/i, respond: () => [[]] }];
{
  await svc.listAgents({ status: 'active', provider: 'anthropic', capability: 'code' });
  const sql = queryLog[0].sql;
  assert(/1=1/.test(sql), 'base');
  assert(/status = \?/.test(sql), 'status');
  assert(/provider = \?/.test(sql), 'provider');
  assert(/JSON_CONTAINS/.test(sql), 'capability');
  assertEq(queryLog[0].params, ['active', 'anthropic', '"code"'], 'all three params in order');
}

// ============================================================================
// getAgent
// ============================================================================
console.log('\n── getAgent ─────────────────────────────────────────────');

reset();
responders = [
  { match: /WHERE id = \?/, respond: (p) => (p[0] === 'hit'
    ? [[{ id: 'hit', name: 'X', capabilities: '[]', config: null }]]
    : [[]])
  },
];
{
  const hit = await svc.getAgent('hit');
  assertEq(hit?.id, 'hit', 'found agent');
  assertEq(hit?.capabilities, [], 'capabilities parsed');
  const miss = await svc.getAgent('nope');
  assertEq(miss, null, 'not found → null');
}

// ============================================================================
// getAgentByName
// ============================================================================
console.log('\n── getAgentByName ───────────────────────────────────────');

reset();
responders = [
  { match: /LOWER\(name\) = LOWER\(\?\)/, respond: (p) => (p[0].toLowerCase() === 'claude'
    ? [[{ id: 'c', name: 'Claude', capabilities: '[]', config: null }]]
    : [[]])
  },
];
{
  const hit = await svc.getAgentByName('CLAUDE');
  assertEq(hit?.id, 'c', 'case-insensitive hit');
  assert(/LOWER\(name\) = LOWER\(\?\)/.test(queryLog[0].sql), 'SQL uses LOWER');
  const miss = await svc.getAgentByName('nope');
  assertEq(miss, null, 'miss → null');
}

// ============================================================================
// getByCapability
// ============================================================================
console.log('\n── getByCapability ──────────────────────────────────────');

reset();
responders = [{ match: /status = 'active'/, respond: () => [[
  { id: 'a', name: 'A', capabilities: '["ocr"]', config: null },
]] }];
{
  const result = await svc.getByCapability('ocr');
  assertEq(result.length, 1, 'one match');
  assertEq(result[0].capabilities, ['ocr'], 'capabilities');
  assert(/JSON_CONTAINS\(capabilities, \?\)/.test(queryLog[0].sql), 'JSON_CONTAINS');
  assertEq(queryLog[0].params, ['"ocr"'], 'stringified param');
  assert(/ORDER BY default_priority ASC/.test(queryLog[0].sql), 'priority order');
}

// ============================================================================
// createAgent
// ============================================================================
console.log('\n── createAgent: validation ──────────────────────────────');

reset();
{
  let caught: any = null;
  try { await svc.createAgent({}); } catch (e) { caught = e; }
  assert(caught !== null, 'missing fields throws');
  assert(caught.message.includes('required'), 'error mentions required');

  caught = null;
  try { await svc.createAgent({ name: 'X', provider: 'bogus', model_id: 'm' }); } catch (e) { caught = e; }
  assert(caught !== null, 'invalid provider throws');
  assert(caught.message.includes('Invalid provider'), 'error mentions Invalid provider');
}

console.log('\n── createAgent: happy path with defaults ────────────────');

reset();
nextUuid = 'new-uuid-42';
responders = [{ match: /INSERT INTO agent_registry/, respond: () => [{ affectedRows: 1 }] }];
{
  const result = await svc.createAgent({
    name: 'Sonnet',
    provider: 'anthropic',
    model_id: 'claude-sonnet-4-6',
  });
  assertEq(result, { agent_id: 'new-uuid-42', name: 'Sonnet' }, 'returns agent_id + name');
  assertEq(queryLog[0].params[0], 'new-uuid-42', 'uuid as id');
  assertEq(queryLog[0].params[1], 'Sonnet', 'name');
  assertEq(queryLog[0].params[2], 'anthropic', 'provider');
  assertEq(queryLog[0].params[3], 'claude-sonnet-4-6', 'model_id');
  assertEq(queryLog[0].params[4], '[]', 'capabilities default []');
  assertEq(queryLog[0].params[5], 50, 'default_priority 50');
  assertEq(queryLog[0].params[6], null, 'config null');
  assertEq(queryLog[0].params[7], null, 'cost_per_1k_input null');
  assertEq(queryLog[0].params[8], null, 'cost_per_1k_output null');
}

console.log('\n── createAgent: explicit caps + config + costs ──────────');

reset();
nextUuid = 'u2';
responders = [{ match: /INSERT INTO agent_registry/, respond: () => [{ affectedRows: 1 }] }];
{
  await svc.createAgent({
    name: 'Opus',
    provider: 'anthropic',
    model_id: 'claude-opus-4-6',
    capabilities: ['code', 'long-context'],
    default_priority: 10,
    config: { max_tokens: 8000 },
    cost_per_1k_input: 0.015,
    cost_per_1k_output: 0.075,
  });
  assertEq(queryLog[0].params[4], JSON.stringify(['code', 'long-context']), 'capabilities JSON');
  assertEq(queryLog[0].params[5], 10, 'custom priority');
  assertEq(queryLog[0].params[6], JSON.stringify({ max_tokens: 8000 }), 'config JSON');
  assertEq(queryLog[0].params[7], 0.015, 'input cost');
  assertEq(queryLog[0].params[8], 0.075, 'output cost');
}

// ============================================================================
// updateAgent
// ============================================================================
console.log('\n── updateAgent: field whitelist ─────────────────────────');

reset();
responders = [{ match: /UPDATE agent_registry/, respond: () => [{ affectedRows: 1 }] }];
{
  const result = await svc.updateAgent('a1', {
    name: 'NewName',
    capabilities: ['a', 'b'],
    config: { x: 1 },
    bogusField: 'ignored',  // should be dropped
    status: 'active',       // not in whitelist → dropped
  });
  assertEq(result, { success: true }, 'returns success');
  const sql = queryLog[0].sql;
  assert(/name = \?/.test(sql), 'name in SET');
  assert(/capabilities = \?/.test(sql), 'capabilities in SET');
  assert(/config = \?/.test(sql), 'config in SET');
  assert(!/bogusField/.test(sql), 'bogus not in SET');
  assert(!/status = \?/.test(sql), 'status (not in whitelist) not in SET');
  // Params: [name, capsJSON, configJSON, id]
  assertEq(queryLog[0].params[0], 'NewName', 'name param');
  assertEq(queryLog[0].params[1], JSON.stringify(['a', 'b']), 'caps stringified');
  assertEq(queryLog[0].params[2], JSON.stringify({ x: 1 }), 'config stringified');
  assertEq(queryLog[0].params[3], 'a1', 'id last');
}

console.log('\n── updateAgent: no valid fields → throws ────────────────');

reset();
{
  let caught: any = null;
  try { await svc.updateAgent('a1', { bogus: 1 }); } catch (e) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught.message.includes('No valid fields'), 'error message');
  assertEq(queryLog.length, 0, 'no SQL executed');
}

console.log('\n── updateAgent: affectedRows=0 → throws ─────────────────');

reset();
responders = [{ match: /UPDATE agent_registry/, respond: () => [{ affectedRows: 0 }] }];
{
  let caught: any = null;
  try { await svc.updateAgent('missing', { name: 'x' }); } catch (e) { caught = e; }
  assert(caught !== null, 'throws on not found');
  assert(caught.message.includes('Agent not found'), 'error mentions not found');
}

// ============================================================================
// setStatus
// ============================================================================
console.log('\n── setStatus ────────────────────────────────────────────');

reset();
{
  let caught: any = null;
  try { await svc.setStatus('a1', 'bogus'); } catch (e) { caught = e; }
  assert(caught !== null, 'invalid status throws');
  assert(caught.message.includes('Invalid status'), 'error mentions Invalid status');
}

reset();
responders = [{ match: /UPDATE agent_registry SET status/, respond: () => [{ affectedRows: 1 }] }];
{
  const result = await svc.setStatus('a1', 'deprecated');
  assertEq(result, { success: true }, 'returns success');
  assertEq(queryLog[0].params, ['deprecated', 'a1'], 'params [status, id]');
}

reset();
responders = [{ match: /UPDATE agent_registry SET status/, respond: () => [{ affectedRows: 0 }] }];
{
  let caught: any = null;
  try { await svc.setStatus('nope', 'active'); } catch (e) { caught = e; }
  assert(caught !== null, 'not found throws');
  assert(caught.message.includes('Agent not found'), 'error message');
}

// ============================================================================
// _parseJSON fallback (indirectly via _parseAgent on listAgents)
// ============================================================================
console.log('\n── _parseJSON fallback ──────────────────────────────────');

reset();
responders = [{ match: /SELECT \* FROM agent_registry/i, respond: () => [[
  { id: 'bad', capabilities: 'not-json', config: '{{invalid' },
  { id: 'empty', capabilities: '', config: '' },
]] }];
{
  const result = await svc.listAgents();
  assertEq(result[0].capabilities, [], 'invalid JSON caps → []');
  assertEq(result[0].config, null, 'invalid JSON config → null');
  assertEq(result[1].capabilities, [], 'empty string caps → []');
  assertEq(result[1].config, null, 'empty string config → null');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
