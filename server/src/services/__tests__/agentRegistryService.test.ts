#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRegistryService.js (OMD-1088)
 *
 * Simple CRUD service for the agent_registry table. External deps:
 * uuid + config/db. Both stubbed via require.cache before requiring
 * the SUT.
 *
 * Coverage:
 *   - VALID_STATUSES, VALID_PROVIDERS constants
 *   - listAgents: no filters, each individual filter, combined
 *   - getAgent: found / missing
 *   - getAgentByName: found / missing (case-insensitive clause)
 *   - getByCapability: filters by active + JSON_CONTAINS
 *   - createAgent: missing-field errors, invalid provider, happy path
 *     with uuid + default priority + optional costs
 *   - updateAgent: no fields throws, whitelist enforcement,
 *                  JSON-serializes capabilities/config, affectedRows=0 throws
 *   - setStatus: invalid status throws, affectedRows=0 throws, happy path
 *
 * Run: npx tsx server/src/services/__tests__/agentRegistryService.test.ts
 */

import * as pathMod from 'path';

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

// ── SQL-routed fake pool ────────────────────────────────────────────
type Route = { match: RegExp; respond: (params: any[], sql: string) => any };
type ExecuteCall = { sql: string; params: any[] };
const queryLog: ExecuteCall[] = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        return [r.respond(params, sql), []];
      }
    }
    if (/^\s*SELECT/i.test(sql)) return [[], []];
    return [{ affectedRows: 1 }, []];
  },
};

// ── Stubs ───────────────────────────────────────────────────────────
function stubModule(relFromSrc: string, exports: any) {
  const absWithoutExt = pathMod.resolve(__dirname, '..', '..', relFromSrc);
  const resolved = require.resolve(absWithoutExt);
  require.cache[resolved] = {
    id: resolved, filename: resolved, loaded: true, exports,
  } as any;
}

stubModule('config/db', { getAppPool: () => fakePool });

let uuidCounter = 1;
const uuidResolved = require.resolve('uuid');
require.cache[uuidResolved] = {
  id: uuidResolved, filename: uuidResolved, loaded: true,
  exports: { v4: () => `uuid-${uuidCounter++}` },
} as any;

function resetDb() {
  queryLog.length = 0;
  routes = [];
  uuidCounter = 1;
}

const svc = require('../agentRegistryService');
const {
  VALID_STATUSES, VALID_PROVIDERS,
  listAgents, getAgent, getAgentByName, getByCapability,
  createAgent, updateAgent, setStatus,
} = svc;

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
console.log('\n── listAgents ────────────────────────────────────────────');

{
  resetDb();
  routes = [
    {
      match: /FROM agent_registry/i,
      respond: () => [
        { id: 'a1', name: 'Claude', capabilities: '["plan","implement"]', config: '{"temp":0}' },
        { id: 'a2', name: 'GPT', capabilities: null, config: null },
      ],
    },
  ];
  const all = await listAgents();
  assertEq(all.length, 2, '2 agents');
  assertEq(all[0].capabilities, ['plan', 'implement'], 'capabilities parsed');
  assertEq(all[0].config, { temp: 0 }, 'config parsed');
  assertEq(all[1].capabilities, [], 'null caps → []');
  assertEq(all[1].config, null, 'null config → null');
  assert(/WHERE 1=1/.test(queryLog[0].sql), 'no-filter WHERE 1=1');
  assertEq(queryLog[0].params, [], 'no params');
}

// Status filter
{
  resetDb();
  routes = [{ match: /FROM agent_registry/i, respond: () => [] }];
  await listAgents({ status: 'active' });
  assert(/status = \?/.test(queryLog[0].sql), 'status clause');
  assertEq(queryLog[0].params, ['active'], 'status param');
}

// Provider filter
{
  resetDb();
  routes = [{ match: /FROM agent_registry/i, respond: () => [] }];
  await listAgents({ provider: 'anthropic' });
  assert(/provider = \?/.test(queryLog[0].sql), 'provider clause');
  assertEq(queryLog[0].params, ['anthropic'], 'provider param');
}

// Capability filter
{
  resetDb();
  routes = [{ match: /FROM agent_registry/i, respond: () => [] }];
  await listAgents({ capability: 'plan' });
  assert(/JSON_CONTAINS\(capabilities, \?\)/.test(queryLog[0].sql), 'JSON_CONTAINS clause');
  assertEq(queryLog[0].params, [JSON.stringify('plan')], 'capability JSON-stringified');
}

// Combined filters
{
  resetDb();
  routes = [{ match: /FROM agent_registry/i, respond: () => [] }];
  await listAgents({ status: 'active', provider: 'anthropic', capability: 'plan' });
  const sql = queryLog[0].sql;
  assert(/status = \?/.test(sql), 'status');
  assert(/provider = \?/.test(sql), 'provider');
  assert(/JSON_CONTAINS/.test(sql), 'capability');
  assertEq(queryLog[0].params, ['active', 'anthropic', JSON.stringify('plan')], 'all params');
}

// Order clause
{
  resetDb();
  routes = [{ match: /FROM agent_registry/i, respond: () => [] }];
  await listAgents();
  assert(/ORDER BY default_priority ASC, name ASC/.test(queryLog[0].sql), 'order by priority');
}

// ============================================================================
// getAgent
// ============================================================================
console.log('\n── getAgent ──────────────────────────────────────────────');

{
  resetDb();
  routes = [
    {
      match: /FROM agent_registry WHERE id = \?/i,
      respond: (p) => p[0] === 'a1'
        ? [{ id: 'a1', name: 'Claude', capabilities: '["plan"]', config: null }]
        : [],
    },
  ];
  const found = await getAgent('a1');
  assertEq(found.id, 'a1', 'found id');
  assertEq(found.capabilities, ['plan'], 'caps parsed');
  const missing = await getAgent('nope');
  assertEq(missing, null, 'missing → null');
}

// ============================================================================
// getAgentByName
// ============================================================================
console.log('\n── getAgentByName ────────────────────────────────────────');

{
  resetDb();
  routes = [
    {
      match: /LOWER\(name\) = LOWER\(\?\)/i,
      respond: (p) => p[0] === 'claude'
        ? [{ id: 'a1', name: 'Claude', capabilities: '[]', config: null }]
        : [],
    },
  ];
  const found = await getAgentByName('claude');
  assertEq(found?.name, 'Claude', 'case-insensitive match');
  const missing = await getAgentByName('nope');
  assertEq(missing, null, 'missing → null');
}

// ============================================================================
// getByCapability
// ============================================================================
console.log('\n── getByCapability ───────────────────────────────────────');

{
  resetDb();
  routes = [
    {
      match: /status = 'active' AND JSON_CONTAINS/i,
      respond: () => [
        { id: 'a1', name: 'Claude', capabilities: '["plan"]', config: null },
      ],
    },
  ];
  const rows = await getByCapability('plan');
  assertEq(rows.length, 1, '1 result');
  assertEq(rows[0].name, 'Claude', 'name');
  assertEq(queryLog[0].params[0], JSON.stringify('plan'), 'capability JSON-stringified');
  assert(/ORDER BY default_priority/.test(queryLog[0].sql), 'orders by priority');
}

// ============================================================================
// createAgent — validation
// ============================================================================
console.log('\n── createAgent: validation ───────────────────────────────');

// Missing name
{
  let caught: Error | null = null;
  try { await createAgent({ provider: 'anthropic', model_id: 'claude-4-5' } as any); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('required'), 'missing name throws');
}

// Missing provider
{
  let caught: Error | null = null;
  try { await createAgent({ name: 'X', model_id: 'm' } as any); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('required'), 'missing provider throws');
}

// Missing model_id
{
  let caught: Error | null = null;
  try { await createAgent({ name: 'X', provider: 'anthropic' } as any); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('required'), 'missing model_id throws');
}

// Invalid provider
{
  let caught: Error | null = null;
  try { await createAgent({ name: 'X', provider: 'bogus', model_id: 'm' } as any); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Invalid provider'), 'invalid provider throws');
}

// Happy path
{
  resetDb();
  uuidCounter = 100;
  routes = [{ match: /INSERT INTO agent_registry/i, respond: () => ({ affectedRows: 1 }) }];
  const r = await createAgent({
    name: 'Claude',
    provider: 'anthropic',
    model_id: 'claude-opus-4-6',
    capabilities: ['plan', 'implement'],
    default_priority: 10,
    config: { temp: 0 },
    cost_per_1k_input: 0.015,
    cost_per_1k_output: 0.075,
  } as any);
  assertEq(r.agent_id, 'uuid-100', 'returns uuid id');
  assertEq(r.name, 'Claude', 'returns name');

  const insert = queryLog[0];
  assert(/INSERT INTO agent_registry/.test(insert.sql), 'INSERT issued');
  assertEq(insert.params[0], 'uuid-100', 'uuid param');
  assertEq(insert.params[1], 'Claude', 'name');
  assertEq(insert.params[2], 'anthropic', 'provider');
  assertEq(insert.params[3], 'claude-opus-4-6', 'model_id');
  assertEq(insert.params[4], JSON.stringify(['plan', 'implement']), 'capabilities serialized');
  assertEq(insert.params[5], 10, 'priority');
  assertEq(insert.params[6], JSON.stringify({ temp: 0 }), 'config serialized');
  assertEq(insert.params[7], 0.015, 'cost in');
  assertEq(insert.params[8], 0.075, 'cost out');
}

// Defaults: priority 50, empty capabilities, null config/costs
{
  resetDb();
  uuidCounter = 200;
  routes = [{ match: /INSERT INTO agent_registry/i, respond: () => ({ affectedRows: 1 }) }];
  await createAgent({
    name: 'Basic', provider: 'openai', model_id: 'gpt-5',
  } as any);
  const insert = queryLog[0];
  assertEq(insert.params[4], JSON.stringify([]), 'default empty capabilities');
  assertEq(insert.params[5], 50, 'default priority 50');
  assertEq(insert.params[6], null, 'null config');
  assertEq(insert.params[7], null, 'null cost in');
  assertEq(insert.params[8], null, 'null cost out');
}

// ============================================================================
// updateAgent
// ============================================================================
console.log('\n── updateAgent ───────────────────────────────────────────');

// No fields
{
  let caught: Error | null = null;
  try { await updateAgent('a1', {}); } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('No valid fields'), 'no fields throws');
}

// Single field
{
  resetDb();
  routes = [{ match: /UPDATE agent_registry/i, respond: () => ({ affectedRows: 1 }) }];
  const r = await updateAgent('a1', { name: 'New' });
  assertEq(r.success, true, 'success');
  assert(/SET name = \?/.test(queryLog[0].sql), 'SET name');
  assertEq(queryLog[0].params, ['New', 'a1'], 'params');
}

// Multi field with JSON serialization
{
  resetDb();
  routes = [{ match: /UPDATE agent_registry/i, respond: () => ({ affectedRows: 1 }) }];
  await updateAgent('a1', {
    capabilities: ['plan', 'verify'],
    config: { temp: 0.5 },
    default_priority: 20,
  });
  const sql = queryLog[0].sql;
  assert(/capabilities = \?/.test(sql), 'capabilities clause');
  assert(/config = \?/.test(sql), 'config clause');
  assert(/default_priority = \?/.test(sql), 'priority clause');
  // SUT iterates the `allowed` array, so the order is:
  // capabilities, default_priority, config (fields in that array order).
  assertEq(queryLog[0].params, [
    JSON.stringify(['plan', 'verify']),
    20,
    JSON.stringify({ temp: 0.5 }),
    'a1',
  ], 'params with JSON serialization (allowed-array order)');
}

// Unknown field ignored
{
  resetDb();
  routes = [{ match: /UPDATE agent_registry/i, respond: () => ({ affectedRows: 1 }) }];
  await updateAgent('a1', { name: 'X', bogus_field: 'ignored' } as any);
  assert(!/bogus_field/.test(queryLog[0].sql), 'unknown field not in SQL');
  assertEq(queryLog[0].params, ['X', 'a1'], 'only known fields');
}

// Not found
{
  resetDb();
  routes = [{ match: /UPDATE agent_registry/i, respond: () => ({ affectedRows: 0 }) }];
  let caught: Error | null = null;
  try { await updateAgent('nope', { name: 'X' }); } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('not found'), 'not found throws');
}

// ============================================================================
// setStatus
// ============================================================================
console.log('\n── setStatus ─────────────────────────────────────────────');

// Invalid status
{
  let caught: Error | null = null;
  try { await setStatus('a1', 'bogus'); } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Invalid status'), 'invalid status throws');
}

// Happy path — each valid status
for (const status of ['active', 'inactive', 'deprecated']) {
  resetDb();
  routes = [{ match: /UPDATE agent_registry SET status/i, respond: () => ({ affectedRows: 1 }) }];
  const r = await setStatus('a1', status);
  assertEq(r.success, true, `setStatus ${status} returns success`);
  assertEq(queryLog[0].params, [status, 'a1'], `params for ${status}`);
}

// Not found
{
  resetDb();
  routes = [{ match: /UPDATE agent_registry SET status/i, respond: () => ({ affectedRows: 0 }) }];
  let caught: Error | null = null;
  try { await setStatus('nope', 'active'); } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('not found'), 'not found throws');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
