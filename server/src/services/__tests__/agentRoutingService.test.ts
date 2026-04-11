#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRoutingService.js (OMD-1013)
 *
 * Deterministic agent routing. Depends on:
 *   - ../config/db.getAppPool — stubbed with SQL-routed fake pool
 *   - ./agentRegistryService.getAgent — stubbed
 *   - uuid.v4 — stubbed with counter
 *
 * Coverage:
 *   - resolveAgent:
 *       · exact match (component + prompt_type)
 *       · component-only match (prompt_type null)
 *       · type-only match (component null)
 *       · catch-all (both null)
 *       · priority ordering — first match wins
 *       · multi-agent resolution with comparison_agent_ids
 *       · multi-agent with inactive comparison agent filtered out
 *       · fallback to lowest priority default agent when no rule matches
 *       · throws when no active agents at all
 *       · JSON-parses capabilities/config in fallback path
 *   - previewRoute: shape + includes matched_rule info
 *   - listRules: no filters, active filter, component filter, combined
 *   - createRule:
 *       · throws on missing rule_name or agent_id
 *       · throws on invalid prompt_type
 *       · throws on missing agent
 *       · throws on missing comparison agent
 *       · assigns uuid
 *       · null defaults for optional fields
 *       · JSON-serializes comparison_agent_ids
 *       · default priority = 50
 *       · is_multi_agent boolean → 0/1
 *   - updateRule:
 *       · allowlist filters unknown fields
 *       · JSON-serializes comparison_agent_ids
 *       · 0/1 conversion for booleans
 *       · no-op empty throws
 *       · affectedRows=0 → not found
 *   - deleteRule: happy path + not found
 *
 * Run: npx tsx server/src/services/__tests__/agentRoutingService.test.ts
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

// ─── Fake pool with SQL-routed responses ─────────────────────────────
type Route = { match: RegExp; rows?: any; result?: any; throws?: Error };
const queryLog: { sql: string; params: any[] }[] = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        if (r.throws) throw r.throws;
        return [r.rows ?? [], r.result ?? {}];
      }
    }
    return [[], {}];
  },
};

const dbStub = {
  getAppPool: () => fakePool,
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: dbStub,
} as any;

// ─── Stub agentRegistryService ───────────────────────────────────────
const agentsById: Record<string, any> = {};
let getAgentCalls: string[] = [];

const agentRegistryStub = {
  getAgent: async (id: string) => {
    getAgentCalls.push(id);
    return agentsById[id] || null;
  },
};

const regPath = require.resolve('../agentRegistryService');
require.cache[regPath] = {
  id: regPath,
  filename: regPath,
  loaded: true,
  exports: agentRegistryStub,
} as any;

// ─── Stub uuid ───────────────────────────────────────────────────────
let uuidCounter = 0;
const uuidStub = { v4: () => `rule-uuid-${++uuidCounter}` };

const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: uuidStub,
} as any;

// ─── Helpers ─────────────────────────────────────────────────────────
function resetState() {
  queryLog.length = 0;
  routes = [];
  getAgentCalls = [];
  for (const k of Object.keys(agentsById)) delete agentsById[k];
}

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

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
assertEq(
  VALID_PROMPT_TYPES,
  ['plan', 'implementation', 'verification', 'correction', 'migration', 'docs'],
  'six valid prompt types'
);

// ============================================================================
// resolveAgent — exact match (component + prompt_type)
// ============================================================================
console.log('\n── resolveAgent: exact match ─────────────────────────────');

resetState();
agentsById['agent-A'] = {
  id: 'agent-A', name: 'Alpha', provider: 'anthropic', status: 'active',
};
routes = [
  {
    match: /SELECT r\.\*, a\.name as agent_name[\s\S]*agent_routing_rules/,
    rows: [
      {
        id: 'rule-1', rule_name: 'backend impl',
        component: 'backend', prompt_type: 'implementation',
        agent_id: 'agent-A', priority: 10,
        is_multi_agent: 0, comparison_agent_ids: null,
      },
    ],
  },
];
{
  const r = await resolveAgent('backend', 'implementation');
  assertEq(r.primary_agent.id, 'agent-A', 'primary agent');
  assertEq(r.comparison_agents.length, 0, 'no comparison agents');
  assertEq(r.is_multi_agent, false, 'not multi-agent');
  assert(r.rule !== null, 'rule present');
  assertEq(r.rule.id, 'rule-1', 'matched rule id');
}

// ============================================================================
// resolveAgent — component-only match (null prompt_type in rule)
// ============================================================================
console.log('\n── resolveAgent: component-only ──────────────────────────');

resetState();
agentsById['agent-B'] = {
  id: 'agent-B', name: 'Beta', provider: 'openai', status: 'active',
};
routes = [
  {
    match: /agent_routing_rules/,
    rows: [
      {
        id: 'rule-2', rule_name: 'frontend any',
        component: 'frontend', prompt_type: null,
        agent_id: 'agent-B', priority: 20,
        is_multi_agent: 0, comparison_agent_ids: null,
      },
    ],
  },
];
{
  const r = await resolveAgent('frontend', 'verification');
  assertEq(r.primary_agent.id, 'agent-B', 'component-only matches');
}

// ============================================================================
// resolveAgent — priority ordering (first match wins)
// ============================================================================
console.log('\n── resolveAgent: priority ────────────────────────────────');

resetState();
agentsById['agent-A'] = { id: 'agent-A', name: 'Alpha', provider: 'anthropic', status: 'active' };
agentsById['agent-B'] = { id: 'agent-B', name: 'Beta', provider: 'openai', status: 'active' };
routes = [
  {
    match: /agent_routing_rules/,
    // Note: rules already returned in priority order by the SQL
    rows: [
      {
        id: 'high', rule_name: 'specific',
        component: 'backend', prompt_type: 'plan',
        agent_id: 'agent-A', priority: 1,
        is_multi_agent: 0, comparison_agent_ids: null,
      },
      {
        id: 'low', rule_name: 'generic',
        component: null, prompt_type: null,
        agent_id: 'agent-B', priority: 100,
        is_multi_agent: 0, comparison_agent_ids: null,
      },
    ],
  },
];
{
  const r = await resolveAgent('backend', 'plan');
  assertEq(r.primary_agent.id, 'agent-A', 'higher priority rule wins');
  assertEq(r.rule.id, 'high', 'matched rule is "high"');
}

// Catch-all fires when nothing specific matches
{
  const r = await resolveAgent('other', 'docs');
  assertEq(r.primary_agent.id, 'agent-B', 'catch-all matches unmatched req');
}

// ============================================================================
// resolveAgent — multi-agent resolution
// ============================================================================
console.log('\n── resolveAgent: multi-agent ─────────────────────────────');

resetState();
agentsById['agent-A'] = { id: 'agent-A', name: 'Alpha', provider: 'anthropic', status: 'active' };
agentsById['agent-B'] = { id: 'agent-B', name: 'Beta', provider: 'openai', status: 'active' };
agentsById['agent-C'] = { id: 'agent-C', name: 'Gamma', provider: 'openai', status: 'inactive' };
routes = [
  {
    match: /agent_routing_rules/,
    rows: [
      {
        id: 'multi', rule_name: 'multi',
        component: 'backend', prompt_type: 'implementation',
        agent_id: 'agent-A', priority: 10,
        is_multi_agent: 1,
        comparison_agent_ids: JSON.stringify(['agent-B', 'agent-C']),
      },
    ],
  },
];
{
  const r = await resolveAgent('backend', 'implementation');
  assertEq(r.primary_agent.id, 'agent-A', 'primary agent');
  assertEq(r.comparison_agents.length, 1, 'only 1 comparison (inactive filtered)');
  assertEq(r.comparison_agents[0].id, 'agent-B', 'active comparison agent');
  assertEq(r.is_multi_agent, true, 'is_multi_agent true');
}

// Multi-agent flag but no comparison_agent_ids → not actually multi
resetState();
agentsById['agent-A'] = { id: 'agent-A', name: 'Alpha', provider: 'anthropic', status: 'active' };
routes = [
  {
    match: /agent_routing_rules/,
    rows: [
      {
        id: 'multi-empty', rule_name: 'multi-empty',
        component: 'backend', prompt_type: null,
        agent_id: 'agent-A', priority: 10,
        is_multi_agent: 1,
        comparison_agent_ids: null,
      },
    ],
  },
];
{
  const r = await resolveAgent('backend', 'plan');
  assertEq(r.is_multi_agent, false, 'no comparison agents → not multi');
}

// ============================================================================
// resolveAgent — no rule matches → fallback to default
// ============================================================================
console.log('\n── resolveAgent: fallback to default ─────────────────────');

resetState();
routes = [
  { match: /agent_routing_rules/, rows: [] }, // no rules
  {
    match: /agent_registry WHERE status = 'active'/,
    rows: [
      {
        id: 'default-1', name: 'DefaultBot', provider: 'anthropic',
        status: 'active', default_priority: 1,
        capabilities: JSON.stringify(['plan', 'implementation']),
        config: JSON.stringify({ model: 'claude-opus' }),
      },
    ],
  },
];
{
  const r = await resolveAgent('unknown', 'unknown');
  assertEq(r.primary_agent.id, 'default-1', 'default agent returned');
  assertEq(r.primary_agent.capabilities, ['plan', 'implementation'], 'capabilities parsed');
  assertEq(r.primary_agent.config.model, 'claude-opus', 'config parsed');
  assertEq(r.rule, null, 'no matched rule');
  assertEq(r.is_multi_agent, false, 'not multi');
}

// Fallback with null capabilities/config → should produce [] / null
resetState();
routes = [
  { match: /agent_routing_rules/, rows: [] },
  {
    match: /agent_registry WHERE status = 'active'/,
    rows: [
      {
        id: 'default-2', name: 'Plain', provider: 'openai',
        status: 'active', default_priority: 5,
        capabilities: null,
        config: null,
      },
    ],
  },
];
{
  const r = await resolveAgent('x', 'y');
  assertEq(r.primary_agent.capabilities, [], 'null capabilities → []');
  assertEq(r.primary_agent.config, null, 'null config → null');
}

// Fallback throws when no active agents
resetState();
routes = [
  { match: /agent_routing_rules/, rows: [] },
  { match: /agent_registry/, rows: [] },
];
{
  let caught: Error | null = null;
  try {
    await resolveAgent('x', 'y');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when no agents');
  assert(
    caught !== null && caught.message.includes('No active agents'),
    'error message mentions no agents'
  );
}

// ============================================================================
// previewRoute
// ============================================================================
console.log('\n── previewRoute ──────────────────────────────────────────');

resetState();
agentsById['agent-A'] = { id: 'agent-A', name: 'Alpha', provider: 'anthropic', status: 'active' };
routes = [
  {
    match: /agent_routing_rules/,
    rows: [
      {
        id: 'rule-p', rule_name: 'preview-rule',
        component: 'backend', prompt_type: 'plan',
        agent_id: 'agent-A', priority: 5,
        is_multi_agent: 0, comparison_agent_ids: null,
      },
    ],
  },
];
{
  const p = await previewRoute('backend', 'plan');
  assertEq(p.component, 'backend', 'component echoed');
  assertEq(p.prompt_type, 'plan', 'prompt_type echoed');
  assertEq(p.primary_agent.id, 'agent-A', 'primary_agent.id');
  assertEq(p.primary_agent.name, 'Alpha', 'primary_agent.name');
  assertEq(p.primary_agent.provider, 'anthropic', 'primary_agent.provider');
  assertEq(p.comparison_agents, [], 'no comparisons');
  assertEq(p.matched_rule.id, 'rule-p', 'matched_rule.id');
  assertEq(p.matched_rule.rule_name, 'preview-rule', 'rule_name');
  assertEq(p.is_multi_agent, false, 'not multi');
}

// previewRoute when fallback (no rule) → matched_rule null
resetState();
routes = [
  { match: /agent_routing_rules/, rows: [] },
  {
    match: /agent_registry WHERE status/,
    rows: [{
      id: 'def', name: 'Default', provider: 'anthropic',
      status: 'active', default_priority: 1,
      capabilities: null, config: null,
    }],
  },
];
{
  const p = await previewRoute(null, null);
  assertEq(p.matched_rule, null, 'matched_rule null on fallback');
}

// ============================================================================
// listRules
// ============================================================================
console.log('\n── listRules ─────────────────────────────────────────────');

// No filters
resetState();
routes = [
  {
    match: /agent_routing_rules/,
    rows: [
      {
        id: 'r1', rule_name: 'one', component: 'backend', prompt_type: 'plan',
        agent_id: 'a1', priority: 5, is_multi_agent: 0,
        comparison_agent_ids: null,
        agent_name: 'Alpha', agent_provider: 'anthropic',
      },
    ],
  },
];
{
  const list = await listRules();
  assertEq(list.length, 1, '1 rule');
  assertEq(list[0].id, 'r1', 'id');
  assertEq(list[0].comparison_agent_ids, [], 'null → []');
  // Verify SQL has no extra filter
  assert(/WHERE 1=1/.test(queryLog[0].sql), 'default WHERE 1=1');
}

// Active filter
resetState();
routes = [{ match: /agent_routing_rules/, rows: [] }];
await listRules({ active: true });
assert(/r\.active = \?/.test(queryLog[0].sql), 'active filter SQL');
assertEq(queryLog[0].params, [1], 'active=1 param');

// Component filter
resetState();
routes = [{ match: /agent_routing_rules/, rows: [] }];
await listRules({ component: 'frontend' });
assert(/r\.component = \?/.test(queryLog[0].sql), 'component filter SQL');
assertEq(queryLog[0].params, ['frontend'], 'component param');

// Both filters
resetState();
routes = [{ match: /agent_routing_rules/, rows: [] }];
await listRules({ active: false, component: 'ocr' });
assertEq(queryLog[0].params, [0, 'ocr'], 'active=0 + component');

// ============================================================================
// createRule
// ============================================================================
console.log('\n── createRule ────────────────────────────────────────────');

// Missing rule_name
{
  let caught: Error | null = null;
  try { await createRule({ agent_id: 'a1' }); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('rule_name and agent_id'),
    'missing rule_name throws');
}

// Missing agent_id
{
  let caught: Error | null = null;
  try { await createRule({ rule_name: 'x' }); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('rule_name and agent_id'),
    'missing agent_id throws');
}

// Invalid prompt_type
{
  let caught: Error | null = null;
  try {
    await createRule({ rule_name: 'x', agent_id: 'a1', prompt_type: 'BOGUS' });
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Invalid prompt_type'),
    'invalid prompt_type throws');
}

// Agent not found
resetState();
// no agents registered
{
  let caught: Error | null = null;
  try {
    await createRule({ rule_name: 'x', agent_id: 'missing', prompt_type: 'plan' });
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Agent not found'),
    'missing agent throws');
}

// Comparison agent not found
resetState();
agentsById['a1'] = { id: 'a1', name: 'A1', provider: 'x', status: 'active' };
// a2 NOT registered
{
  let caught: Error | null = null;
  try {
    await createRule({
      rule_name: 'x', agent_id: 'a1', prompt_type: 'plan',
      is_multi_agent: true, comparison_agent_ids: ['a2'],
    });
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Comparison agent not found'),
    'missing comparison agent throws');
}

// Happy path
resetState();
uuidCounter = 0;
agentsById['a1'] = { id: 'a1', name: 'A1', provider: 'x', status: 'active' };
routes = [
  { match: /INSERT INTO agent_routing_rules/, rows: { insertId: 1 } as any },
];
{
  const r = await createRule({
    rule_name: 'my-rule',
    agent_id: 'a1',
    component: 'backend',
    prompt_type: 'plan',
    priority: 25,
    is_multi_agent: false,
  });
  assertEq(r.rule_id, 'rule-uuid-1', 'uuid assigned');
  const insertCall = queryLog.find(q => /INSERT INTO agent_routing_rules/.test(q.sql))!;
  assertEq(insertCall.params[0], 'rule-uuid-1', 'param 0: id');
  assertEq(insertCall.params[1], 'my-rule', 'param 1: rule_name');
  assertEq(insertCall.params[2], 'backend', 'param 2: component');
  assertEq(insertCall.params[3], 'plan', 'param 3: prompt_type');
  assertEq(insertCall.params[4], 'a1', 'param 4: agent_id');
  assertEq(insertCall.params[5], 25, 'param 5: priority');
  assertEq(insertCall.params[6], 0, 'param 6: is_multi_agent=0');
  assertEq(insertCall.params[7], null, 'param 7: comparison_agent_ids null');
}

// Defaults: priority=50, null component/prompt_type, no is_multi_agent
resetState();
uuidCounter = 10;
agentsById['a1'] = { id: 'a1', name: 'A1', provider: 'x', status: 'active' };
routes = [{ match: /INSERT INTO agent_routing_rules/, rows: { insertId: 1 } as any }];
{
  await createRule({ rule_name: 'defaults', agent_id: 'a1' });
  const call = queryLog.find(q => /INSERT INTO/.test(q.sql))!;
  assertEq(call.params[2], null, 'default component = null');
  assertEq(call.params[3], null, 'default prompt_type = null');
  assertEq(call.params[5], 50, 'default priority = 50');
  assertEq(call.params[6], 0, 'default is_multi_agent = 0');
}

// Multi-agent rule with comparison_agent_ids
resetState();
uuidCounter = 20;
agentsById['a1'] = { id: 'a1', name: 'A1', provider: 'x', status: 'active' };
agentsById['a2'] = { id: 'a2', name: 'A2', provider: 'y', status: 'active' };
agentsById['a3'] = { id: 'a3', name: 'A3', provider: 'z', status: 'active' };
routes = [{ match: /INSERT INTO agent_routing_rules/, rows: { insertId: 1 } as any }];
{
  await createRule({
    rule_name: 'multi',
    agent_id: 'a1',
    is_multi_agent: true,
    comparison_agent_ids: ['a2', 'a3'],
  });
  const call = queryLog.find(q => /INSERT INTO/.test(q.sql))!;
  assertEq(call.params[6], 1, 'is_multi_agent=1');
  assertEq(call.params[7], JSON.stringify(['a2', 'a3']), 'comparison_agent_ids serialized');
}

// ============================================================================
// updateRule
// ============================================================================
console.log('\n── updateRule ────────────────────────────────────────────');

// No valid fields → throws
resetState();
{
  let caught: Error | null = null;
  try {
    await updateRule('r1', { bogus: 'field', another: 1 });
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('No valid fields'),
    'no-op update throws');
}

// Allowlist filters bogus + happy path
resetState();
routes = [{ match: /UPDATE agent_routing_rules/, rows: { affectedRows: 1 } as any }];
{
  await updateRule('r1', {
    rule_name: 'renamed',
    bogus: 'ignored',
    priority: 99,
  });
  const call = queryLog[0];
  assert(/rule_name = \?/.test(call.sql), 'rule_name in SET');
  assert(/priority = \?/.test(call.sql), 'priority in SET');
  assert(!/bogus/.test(call.sql), 'bogus field excluded');
  assertEq(call.params, ['renamed', 99, 'r1'], 'params in order');
}

// Boolean → 0/1
resetState();
routes = [{ match: /UPDATE agent_routing_rules/, rows: { affectedRows: 1 } as any }];
{
  await updateRule('r1', { active: false, is_multi_agent: true });
  // Iteration order follows the allowlist: is_multi_agent before active
  assertEq(queryLog[0].params, [1, 0, 'r1'], 'booleans coerced to 0/1');
}

// JSON-serializes comparison_agent_ids
resetState();
routes = [{ match: /UPDATE agent_routing_rules/, rows: { affectedRows: 1 } as any }];
{
  await updateRule('r1', { comparison_agent_ids: ['a2', 'a3'] });
  assertEq(queryLog[0].params[0], JSON.stringify(['a2', 'a3']), 'array serialized');
}

// Empty comparison_agent_ids → null
resetState();
routes = [{ match: /UPDATE agent_routing_rules/, rows: { affectedRows: 1 } as any }];
{
  await updateRule('r1', { comparison_agent_ids: null });
  assertEq(queryLog[0].params[0], null, 'null preserved');
}

// affectedRows=0 → not found
resetState();
routes = [{ match: /UPDATE agent_routing_rules/, rows: { affectedRows: 0 } as any }];
{
  let caught: Error | null = null;
  try {
    await updateRule('missing', { rule_name: 'x' });
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Rule not found'),
    'affectedRows=0 throws Rule not found');
}

// ============================================================================
// deleteRule
// ============================================================================
console.log('\n── deleteRule ────────────────────────────────────────────');

// Happy path
resetState();
routes = [{ match: /DELETE FROM agent_routing_rules/, rows: { affectedRows: 1 } as any }];
{
  const r = await deleteRule('r1');
  assertEq(r.success, true, 'success=true');
  assertEq(queryLog[0].params, ['r1'], 'param passed');
}

// Not found
resetState();
routes = [{ match: /DELETE FROM agent_routing_rules/, rows: { affectedRows: 0 } as any }];
{
  let caught: Error | null = null;
  try { await deleteRule('missing'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Rule not found'),
    'delete not-found throws');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
