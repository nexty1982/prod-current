#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRoutingService.js (OMD-1043)
 *
 * Covers:
 *   - resolveAgent — first-match-wins with catch-all rule, null-component and
 *     null-prompt_type handling, multi-agent comparison expansion, fallback
 *     to system default when no rules match, throw when no active agents
 *   - previewRoute — shape of UI-facing preview
 *   - listRules — filter composition (active, component)
 *   - createRule — validation (required fields, prompt_type whitelist,
 *     missing agent, missing comparison agent), INSERT params
 *   - updateRule — partial update, field translation (boolean→0/1, JSON
 *     serialization), no-fields → throw, no rows affected → throw
 *   - deleteRule — success + not-found
 *
 * Stubs `../config/db`, `./agentRegistryService`, and `uuid` via require.cache
 * before requiring the SUT.
 *
 * Run from server/: npx tsx src/services/__tests__/agentRoutingService.test.ts
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

// ── agentRegistry stub ────────────────────────────────────────────────
type AgentRec = { id: string; name: string; status: string; provider?: string; capabilities?: any; config?: any };
const agentMap: Record<string, AgentRec | null> = {};
let getAgentCalls: string[] = [];

function resetAgents() {
  for (const k of Object.keys(agentMap)) delete agentMap[k];
  getAgentCalls = [];
}

const agentRegistryPath = require.resolve('../agentRegistryService');
require.cache[agentRegistryPath] = {
  id: agentRegistryPath, filename: agentRegistryPath, loaded: true,
  exports: {
    getAgent: async (id: string) => {
      getAgentCalls.push(id);
      return agentMap[id] ?? null;
    },
  },
} as any;

// ── uuid stub ─────────────────────────────────────────────────────────
let nextUuid = 'uuid-1';
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath, filename: uuidPath, loaded: true,
  exports: { v4: () => nextUuid },
} as any;

const {
  VALID_PROMPT_TYPES,
  resolveAgent,
  previewRoute,
  listRules,
  createRule,
  updateRule,
  deleteRule,
} = require('../agentRoutingService');

async function main() {

// ============================================================================
// VALID_PROMPT_TYPES
// ============================================================================
console.log('\n── VALID_PROMPT_TYPES ────────────────────────────────────');

assert(Array.isArray(VALID_PROMPT_TYPES), 'is array');
assert(VALID_PROMPT_TYPES.includes('plan'), 'includes plan');
assert(VALID_PROMPT_TYPES.includes('implementation'), 'includes implementation');
assert(VALID_PROMPT_TYPES.includes('verification'), 'includes verification');
assert(VALID_PROMPT_TYPES.includes('correction'), 'includes correction');
assert(VALID_PROMPT_TYPES.includes('migration'), 'includes migration');
assert(VALID_PROMPT_TYPES.includes('docs'), 'includes docs');
assertEq(VALID_PROMPT_TYPES.length, 6, '6 valid types');

// ============================================================================
// resolveAgent
// ============================================================================
console.log('\n── resolveAgent: exact match (component + type) ─────────');

resetDb(); resetAgents();
agentMap['agent-a'] = { id: 'agent-a', name: 'Claude', status: 'active', provider: 'anthropic', capabilities: [], config: null };
agentMap['agent-b'] = { id: 'agent-b', name: 'GPT', status: 'active', provider: 'openai', capabilities: [], config: null };

routes = [
  {
    match: /FROM agent_routing_rules/i,
    rows: [
      { id: 'r1', rule_name: 'catch-all', component: null, prompt_type: null, agent_id: 'agent-b', priority: 100, is_multi_agent: 0, comparison_agent_ids: null },
      { id: 'r2', rule_name: 'backend-impl', component: 'backend', prompt_type: 'implementation', agent_id: 'agent-a', priority: 10, is_multi_agent: 0, comparison_agent_ids: null },
    ].sort((a, b) => a.priority - b.priority),
  },
];

{
  const r = await resolveAgent('backend', 'implementation');
  assertEq(r.primary_agent.id, 'agent-a', 'picks r2 agent-a (priority 10 < 100)');
  assertEq(r.rule.id, 'r2', 'matched rule r2');
  assertEq(r.is_multi_agent, false, 'not multi-agent');
  assertEq(r.comparison_agents.length, 0, 'no comparison agents');
}

console.log('\n── resolveAgent: component-only match ────────────────────');

resetDb(); resetAgents();
agentMap['agent-a'] = { id: 'agent-a', name: 'Claude', status: 'active' };

routes = [{
  match: /FROM agent_routing_rules/i,
  rows: [
    { id: 'r3', rule_name: 'any-backend', component: 'backend', prompt_type: null, agent_id: 'agent-a', priority: 20, is_multi_agent: 0, comparison_agent_ids: null },
  ],
}];

{
  const r = await resolveAgent('backend', 'verification');
  assertEq(r.primary_agent.id, 'agent-a', 'component-only match works');
  assertEq(r.rule.rule_name, 'any-backend', 'rule name');
}

console.log('\n── resolveAgent: type-only match ─────────────────────────');

resetDb(); resetAgents();
agentMap['agent-a'] = { id: 'agent-a', name: 'Claude', status: 'active' };

routes = [{
  match: /FROM agent_routing_rules/i,
  rows: [
    { id: 'r4', rule_name: 'any-plan', component: null, prompt_type: 'plan', agent_id: 'agent-a', priority: 30, is_multi_agent: 0, comparison_agent_ids: null },
  ],
}];

{
  const r = await resolveAgent('frontend', 'plan');
  assertEq(r.primary_agent.id, 'agent-a', 'type-only match');
}

console.log('\n── resolveAgent: multi-agent expansion ───────────────────');

resetDb(); resetAgents();
agentMap['agent-a'] = { id: 'agent-a', name: 'Claude', status: 'active' };
agentMap['agent-b'] = { id: 'agent-b', name: 'GPT', status: 'active' };
agentMap['agent-c'] = { id: 'agent-c', name: 'Gemini', status: 'active' };
agentMap['agent-d'] = { id: 'agent-d', name: 'Offline', status: 'inactive' };

routes = [{
  match: /FROM agent_routing_rules/i,
  rows: [
    {
      id: 'r5', rule_name: 'multi', component: null, prompt_type: null,
      agent_id: 'agent-a', priority: 50, is_multi_agent: 1,
      comparison_agent_ids: JSON.stringify(['agent-b', 'agent-c', 'agent-d']),
    },
  ],
}];

{
  const r = await resolveAgent(null, null);
  assertEq(r.primary_agent.id, 'agent-a', 'primary');
  assertEq(r.comparison_agents.length, 2, 'only active comparison agents');
  assertEq(r.comparison_agents[0].id, 'agent-b', 'first comparison');
  assertEq(r.comparison_agents[1].id, 'agent-c', 'second comparison');
  assertEq(r.is_multi_agent, true, 'multi-agent true');
  assertEq(r.rule.comparison_agent_ids, ['agent-b', 'agent-c', 'agent-d'], 'rule parsed');
}

// is_multi_agent=1 but no valid comparisons → is_multi_agent becomes false
console.log('\n── resolveAgent: multi-agent with all inactive → not multi ─');

resetDb(); resetAgents();
agentMap['agent-a'] = { id: 'agent-a', name: 'Claude', status: 'active' };
agentMap['agent-dead'] = { id: 'agent-dead', name: 'Dead', status: 'inactive' };

routes = [{
  match: /FROM agent_routing_rules/i,
  rows: [
    {
      id: 'r6', rule_name: 'multi-dead', component: null, prompt_type: null,
      agent_id: 'agent-a', priority: 50, is_multi_agent: 1,
      comparison_agent_ids: JSON.stringify(['agent-dead']),
    },
  ],
}];

{
  const r = await resolveAgent(null, null);
  assertEq(r.is_multi_agent, false, 'no active comparisons → not multi-agent');
  assertEq(r.comparison_agents.length, 0, 'empty comparisons');
}

console.log('\n── resolveAgent: no rules → fallback to default ──────────');

resetDb(); resetAgents();

routes = [
  { match: /FROM agent_routing_rules/i, rows: [] },
  {
    match: /FROM agent_registry.*ORDER BY default_priority/i,
    rows: [{
      id: 'default-agent', name: 'Default', status: 'active',
      capabilities: '["chat","code"]', config: '{"temp":0.5}',
    }],
  },
];

{
  const r = await resolveAgent('nothing', 'nothing');
  assertEq(r.primary_agent.id, 'default-agent', 'fallback agent');
  assertEq(r.primary_agent.capabilities, ['chat', 'code'], 'capabilities parsed');
  assertEq(r.primary_agent.config, { temp: 0.5 }, 'config parsed');
  assertEq(r.rule, null, 'no rule matched');
  assertEq(r.is_multi_agent, false, 'not multi-agent');
}

console.log('\n── resolveAgent: no rules + no defaults → throw ──────────');

resetDb(); resetAgents();
routes = [
  { match: /FROM agent_routing_rules/i, rows: [] },
  { match: /FROM agent_registry/i, rows: [] },
];

{
  let caught: Error | null = null;
  try { await resolveAgent(null, null); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when no agents');
  assert(caught !== null && /No active agents/i.test(caught.message), 'error mentions no agents');
}

// ============================================================================
// previewRoute
// ============================================================================
console.log('\n── previewRoute ──────────────────────────────────────────');

resetDb(); resetAgents();
agentMap['a1'] = { id: 'a1', name: 'Alpha', status: 'active', provider: 'anthropic' };
agentMap['a2'] = { id: 'a2', name: 'Beta', status: 'active', provider: 'openai' };

routes = [{
  match: /FROM agent_routing_rules/i,
  rows: [{
    id: 'pr1', rule_name: 'preview', component: 'backend', prompt_type: null,
    agent_id: 'a1', priority: 15, is_multi_agent: 1,
    comparison_agent_ids: JSON.stringify(['a2']),
  }],
}];

{
  const p = await previewRoute('backend', 'implementation');
  assertEq(p.component, 'backend', 'echoes component');
  assertEq(p.prompt_type, 'implementation', 'echoes prompt_type');
  assertEq(p.primary_agent.id, 'a1', 'primary id');
  assertEq(p.primary_agent.name, 'Alpha', 'primary name');
  assertEq(p.primary_agent.provider, 'anthropic', 'primary provider');
  assertEq(p.comparison_agents.length, 1, '1 comparison');
  assertEq(p.comparison_agents[0].id, 'a2', 'comparison id');
  assertEq(p.matched_rule.id, 'pr1', 'matched rule id');
  assertEq(p.matched_rule.rule_name, 'preview', 'rule name');
  assertEq(p.matched_rule.priority, 15, 'rule priority');
  assertEq(p.is_multi_agent, true, 'multi-agent');
}

// previewRoute with no rule → null matched_rule
resetDb(); resetAgents();
routes = [
  { match: /FROM agent_routing_rules/i, rows: [] },
  { match: /FROM agent_registry/i, rows: [{ id: 'def', name: 'Def', status: 'active', provider: 'x', capabilities: null, config: null }] },
];

{
  const p = await previewRoute(null, null);
  assertEq(p.matched_rule, null, 'no matched_rule');
  assertEq(p.primary_agent.id, 'def', 'fallback primary');
}

// ============================================================================
// listRules
// ============================================================================
console.log('\n── listRules ─────────────────────────────────────────────');

// No filters
resetDb();
routes = [{
  match: /FROM agent_routing_rules/i,
  rows: [
    { id: 'x1', rule_name: 'A', comparison_agent_ids: null, agent_name: 'Alpha', agent_provider: 'anthropic' },
    { id: 'x2', rule_name: 'B', comparison_agent_ids: JSON.stringify(['b1']), agent_name: 'Beta', agent_provider: 'openai' },
  ],
}];

{
  const rules = await listRules();
  assertEq(rules.length, 2, '2 rules');
  assertEq(rules[0].comparison_agent_ids, [], 'first: parsed empty');
  assertEq(rules[1].comparison_agent_ids, ['b1'], 'second: parsed array');
  // No filters → SQL has only 1=1
  assert(/WHERE 1=1/.test(calls[0].sql), 'WHERE 1=1 default');
  assertEq(calls[0].params.length, 0, 'no params');
}

// active filter
resetDb();
routes = [{ match: /FROM agent_routing_rules/i, rows: [] }];
{
  await listRules({ active: true });
  assert(/r\.active = \?/.test(calls[0].sql), 'active condition added');
  assertEq(calls[0].params, [1], 'active=true → 1');
}

resetDb();
routes = [{ match: /FROM agent_routing_rules/i, rows: [] }];
{
  await listRules({ active: false });
  assertEq(calls[0].params, [0], 'active=false → 0');
}

// component filter
resetDb();
routes = [{ match: /FROM agent_routing_rules/i, rows: [] }];
{
  await listRules({ component: 'frontend' });
  assert(/r\.component = \?/.test(calls[0].sql), 'component condition added');
  assertEq(calls[0].params, ['frontend'], 'component param');
}

// Both filters
resetDb();
routes = [{ match: /FROM agent_routing_rules/i, rows: [] }];
{
  await listRules({ active: true, component: 'backend' });
  assertEq(calls[0].params, [1, 'backend'], 'both params');
}

// ============================================================================
// createRule
// ============================================================================
console.log('\n── createRule ────────────────────────────────────────────');

// Missing rule_name
resetDb(); resetAgents();
{
  let caught: Error | null = null;
  try { await createRule({ agent_id: 'a' } as any); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on missing rule_name');
  assert(caught !== null && /rule_name.*required/i.test(caught.message), 'error mentions rule_name');
}

// Missing agent_id
{
  let caught: Error | null = null;
  try { await createRule({ rule_name: 'r' } as any); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on missing agent_id');
}

// Invalid prompt_type
resetDb(); resetAgents();
{
  let caught: Error | null = null;
  try {
    await createRule({ rule_name: 'r', agent_id: 'a', prompt_type: 'bogus' } as any);
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on invalid prompt_type');
  assert(caught !== null && /Invalid prompt_type/.test(caught.message), 'error mentions prompt_type');
}

// Valid prompt_type but agent not found
resetDb(); resetAgents();
{
  let caught: Error | null = null;
  try {
    await createRule({ rule_name: 'r', agent_id: 'missing', prompt_type: 'plan' } as any);
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when agent not found');
  assert(caught !== null && /Agent not found/.test(caught.message), 'error mentions agent');
}

// is_multi_agent + missing comparison agent
resetDb(); resetAgents();
agentMap['a1'] = { id: 'a1', name: 'A', status: 'active' };
{
  let caught: Error | null = null;
  try {
    await createRule({
      rule_name: 'r', agent_id: 'a1', is_multi_agent: true,
      comparison_agent_ids: ['a1', 'missing-one'],
    } as any);
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when comparison agent missing');
  assert(caught !== null && /Comparison agent not found/.test(caught.message), 'error mentions comparison');
}

// Happy path: minimal valid insert
resetDb(); resetAgents();
agentMap['a1'] = { id: 'a1', name: 'A', status: 'active' };
nextUuid = 'new-uuid-1';
routes = [{ match: /INSERT INTO agent_routing_rules/i, rows: {} }];

{
  const result = await createRule({ rule_name: 'new', agent_id: 'a1' } as any);
  assertEq(result.rule_id, 'new-uuid-1', 'returns generated id');
  const insertCall = calls.find(c => /INSERT INTO agent_routing_rules/.test(c.sql))!;
  assertEq(insertCall.params[0], 'new-uuid-1', 'id param');
  assertEq(insertCall.params[1], 'new', 'rule_name param');
  assertEq(insertCall.params[2], null, 'component defaults to null');
  assertEq(insertCall.params[3], null, 'prompt_type defaults to null');
  assertEq(insertCall.params[4], 'a1', 'agent_id param');
  assertEq(insertCall.params[5], 50, 'priority defaults to 50');
  assertEq(insertCall.params[6], 0, 'is_multi_agent defaults to 0');
  assertEq(insertCall.params[7], null, 'comparison_agent_ids null');
}

// Full insert with multi-agent + comparison
resetDb(); resetAgents();
agentMap['a1'] = { id: 'a1', name: 'A', status: 'active' };
agentMap['a2'] = { id: 'a2', name: 'B', status: 'active' };
agentMap['a3'] = { id: 'a3', name: 'C', status: 'active' };
nextUuid = 'new-uuid-2';
routes = [{ match: /INSERT INTO agent_routing_rules/i, rows: {} }];

{
  await createRule({
    rule_name: 'full', component: 'backend', prompt_type: 'implementation',
    agent_id: 'a1', priority: 5, is_multi_agent: true,
    comparison_agent_ids: ['a2', 'a3'],
  } as any);

  const insertCall = calls.find(c => /INSERT INTO agent_routing_rules/.test(c.sql))!;
  assertEq(insertCall.params[2], 'backend', 'component');
  assertEq(insertCall.params[3], 'implementation', 'prompt_type');
  assertEq(insertCall.params[5], 5, 'priority');
  assertEq(insertCall.params[6], 1, 'is_multi_agent=1');
  assertEq(insertCall.params[7], JSON.stringify(['a2', 'a3']), 'comparison serialized');
}

// ============================================================================
// updateRule
// ============================================================================
console.log('\n── updateRule ────────────────────────────────────────────');

// No valid fields
resetDb();
{
  let caught: Error | null = null;
  try { await updateRule('x', {}); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on empty updates');
  assert(caught !== null && /No valid fields/i.test(caught.message), 'mentions no fields');
}

// Partial update with boolean + JSON fields
resetDb();
routes = [{
  match: /UPDATE agent_routing_rules/i,
  rows: { affectedRows: 1 },
}];
{
  const r = await updateRule('rule-x', {
    rule_name: 'renamed',
    is_multi_agent: true,
    active: false,
    comparison_agent_ids: ['a', 'b'],
  });
  assertEq(r.success, true, 'success');
  const updateCall = calls[0];
  assert(/SET rule_name = \?/.test(updateCall.sql), 'sets rule_name');
  assert(/is_multi_agent = \?/.test(updateCall.sql), 'sets is_multi_agent');
  assert(/active = \?/.test(updateCall.sql), 'sets active');
  assert(/comparison_agent_ids = \?/.test(updateCall.sql), 'sets comparison_agent_ids');
  // Params iterate `allowed` order: rule_name, is_multi_agent, comparison_agent_ids, active, id
  assertEq(updateCall.params[0], 'renamed', 'rule_name param');
  assertEq(updateCall.params[1], 1, 'is_multi_agent → 1');
  assertEq(updateCall.params[2], JSON.stringify(['a', 'b']), 'comparison serialized');
  assertEq(updateCall.params[3], 0, 'active false → 0');
  assertEq(updateCall.params[4], 'rule-x', 'id at end');
}

// comparison_agent_ids set to null/undefined-falsy
resetDb();
routes = [{
  match: /UPDATE agent_routing_rules/i,
  rows: { affectedRows: 1 },
}];
{
  await updateRule('rule-y', { comparison_agent_ids: null });
  const call = calls[0];
  assertEq(call.params[0], null, 'null serialized as null');
}

// Not found → throws
resetDb();
routes = [{
  match: /UPDATE agent_routing_rules/i,
  rows: { affectedRows: 0 },
}];
{
  let caught: Error | null = null;
  try { await updateRule('nope', { rule_name: 'x' }); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when not found');
  assert(caught !== null && /not found/i.test(caught.message), 'mentions not found');
}

// ============================================================================
// deleteRule
// ============================================================================
console.log('\n── deleteRule ────────────────────────────────────────────');

resetDb();
routes = [{ match: /DELETE FROM agent_routing_rules/i, rows: { affectedRows: 1 } }];
{
  const r = await deleteRule('rule-1');
  assertEq(r.success, true, 'success');
  assertEq(calls[0].params, ['rule-1'], 'id passed');
}

// Not found
resetDb();
routes = [{ match: /DELETE FROM agent_routing_rules/i, rows: { affectedRows: 0 } }];
{
  let caught: Error | null = null;
  try { await deleteRule('gone'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when missing');
  assert(caught !== null && /not found/i.test(caught.message), 'mentions not found');
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
