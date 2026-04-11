#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRoutingService.js (OMD-1000)
 *
 * Exports: VALID_PROMPT_TYPES, resolveAgent, previewRoute, listRules,
 *          createRule, updateRule, deleteRule
 *
 * Stubs:
 *   - ../config/db       (getAppPool with SQL-routed rows/results)
 *   - ./agentRegistryService (getAgent)
 *   - uuid               (fixed id)
 *
 * Run: npx tsx server/src/services/__tests__/agentRoutingService.test.ts
 */

// ── stubs ─────────────────────────────────────────────────────────────
type QCall = { sql: string; params: any[] };
let qCalls: QCall[] = [];
type Route = { match: RegExp; rows: any[]; result?: any };
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    qCalls.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        return [r.rows, r.result ?? {}];
      }
    }
    return [[], {}];
  },
};
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// agentRegistry stub
let getAgentLookup: Record<string, any> = {};
let getAgentCalls: string[] = [];
const agentRegistryPath = require.resolve('../agentRegistryService');
require.cache[agentRegistryPath] = {
  id: agentRegistryPath,
  filename: agentRegistryPath,
  loaded: true,
  exports: {
    getAgent: async (id: string) => {
      getAgentCalls.push(id);
      return getAgentLookup[id] || null;
    },
  },
} as any;

// uuid stub — deterministic
let uuidCounter = 0;
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: {
    v4: () => `uuid-${++uuidCounter}`,
  },
} as any;

const svc = require('../agentRoutingService');

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

function resetAll() {
  qCalls = [];
  routes = [];
  getAgentLookup = {};
  getAgentCalls = [];
  uuidCounter = 0;
}

async function main() {

// ============================================================================
// VALID_PROMPT_TYPES
// ============================================================================
console.log('\n── VALID_PROMPT_TYPES ───────────────────────────────────');

assertEq(
  svc.VALID_PROMPT_TYPES,
  ['plan', 'implementation', 'verification', 'correction', 'migration', 'docs'],
  'prompt type list'
);

// Helper: build a minimal rule row
function rule(overrides: any) {
  return {
    id: 'r',
    rule_name: 'r',
    component: null,
    prompt_type: null,
    agent_id: 'a',
    priority: 50,
    is_multi_agent: 0,
    comparison_agent_ids: null,
    active: 1,
    ...overrides,
  };
}

// ============================================================================
// resolveAgent — first match in priority-sorted list wins
// Stub returns rows in the order the test provides, mirroring SQL ORDER BY ASC.
// ============================================================================
console.log('\n── resolveAgent: first match wins ───────────────────────');

{
  resetAll();
  // Put rows in priority-ASC order (as SQL would return them)
  routes = [{
    match: /FROM agent_routing_rules/i,
    rows: [
      // Priority 10: type-only 'plan' — matches ('backend','plan') first
      rule({
        id: 'r-type-only', rule_name: 'type-only',
        component: null, prompt_type: 'plan',
        agent_id: 'agent-planner', priority: 10,
      }),
      // Priority 20: exact match — comes second, loses
      rule({
        id: 'r-exact', rule_name: 'exact',
        component: 'backend', prompt_type: 'plan',
        agent_id: 'agent-exact', priority: 20,
      }),
    ],
  }];
  getAgentLookup['agent-planner'] = {
    id: 'agent-planner', name: 'Planner', provider: 'claude', status: 'active',
  };
  const r = await svc.resolveAgent('backend', 'plan');
  assertEq(r.rule.id, 'r-type-only', 'first matching rule in priority ASC wins');
  assertEq(r.primary_agent.id, 'agent-planner', 'primary from first match');
  assertEq(r.is_multi_agent, false, 'not multi-agent');
  assertEq(r.comparison_agents, [], 'no comparison agents');
}

// ============================================================================
// resolveAgent — skips non-matching rules
// ============================================================================
console.log('\n── resolveAgent: skips non-matching ─────────────────────');

{
  resetAll();
  routes = [{
    match: /FROM agent_routing_rules/i,
    rows: [
      // component mismatch — should be skipped
      rule({
        id: 'r-skip-1', component: 'frontend', prompt_type: 'plan',
        agent_id: 'agent-a', priority: 10,
      }),
      // type mismatch — should be skipped
      rule({
        id: 'r-skip-2', component: 'backend', prompt_type: 'verification',
        agent_id: 'agent-b', priority: 20,
      }),
      // exact match — should win
      rule({
        id: 'r-match', component: 'backend', prompt_type: 'plan',
        agent_id: 'agent-c', priority: 30,
      }),
    ],
  }];
  getAgentLookup['agent-c'] = {
    id: 'agent-c', name: 'C', provider: 'claude', status: 'active',
  };
  const r = await svc.resolveAgent('backend', 'plan');
  assertEq(r.rule.id, 'r-match', 'non-matching rules skipped');
  assertEq(r.primary_agent.id, 'agent-c', 'correct primary');
}

// ============================================================================
// resolveAgent — type-only match (component=null in rule)
// ============================================================================
console.log('\n── resolveAgent: type-only match ────────────────────────');

{
  resetAll();
  routes = [{
    match: /FROM agent_routing_rules/i,
    rows: [
      rule({
        id: 'r-plans',
        component: null, prompt_type: 'plan',
        agent_id: 'ag1', priority: 50,
      }),
    ],
  }];
  getAgentLookup['ag1'] = { id: 'ag1', name: 'Planner', provider: 'claude', status: 'active' };

  const r = await svc.resolveAgent('frontend', 'plan');
  assertEq(r.rule.id, 'r-plans', 'type-only rule matched for any component');
  assertEq(r.primary_agent.id, 'ag1', 'agent matched');
}

// ============================================================================
// resolveAgent — component-only match
// ============================================================================
console.log('\n── resolveAgent: component-only match ───────────────────');

{
  resetAll();
  routes = [{
    match: /FROM agent_routing_rules/i,
    rows: [
      {
        id: 'r2',
        rule_name: 'backend all',
        component: 'backend',
        prompt_type: null,
        agent_id: 'ag2',
        priority: 50,
        is_multi_agent: 0,
      },
    ],
  }];
  getAgentLookup['ag2'] = { id: 'ag2', name: 'BE', provider: 'claude', status: 'active' };

  const r = await svc.resolveAgent('backend', 'implementation');
  assertEq(r.rule.id, 'r2', 'component-only rule matched');
  assertEq(r.primary_agent.id, 'ag2', 'agent matches');
}

// ============================================================================
// resolveAgent — no rule matches → falls back to default agent
// ============================================================================
console.log('\n── resolveAgent: fallback to default ────────────────────');

{
  resetAll();
  routes = [
    { match: /FROM agent_routing_rules/i, rows: [] }, // no rules
    {
      match: /FROM agent_registry/i,
      rows: [
        {
          id: 'default-agent',
          name: 'Default',
          provider: 'claude',
          status: 'active',
          default_priority: 1,
          capabilities: '["code","review"]',
          config: '{"key":"value"}',
        },
      ],
    },
  ];

  const r = await svc.resolveAgent('unknown', 'unknown');
  assertEq(r.rule, null, 'no rule');
  assertEq(r.primary_agent.id, 'default-agent', 'default agent');
  assertEq(r.primary_agent.capabilities, ['code', 'review'], 'JSON capabilities parsed');
  assertEq(r.primary_agent.config, { key: 'value' }, 'JSON config parsed');
  assertEq(r.is_multi_agent, false, 'not multi');
  // SQL should include ORDER BY default_priority ASC LIMIT 1
  const defaultQuery = qCalls.find((c) => /FROM agent_registry/i.test(c.sql));
  assert(defaultQuery !== undefined, 'queries agent_registry');
  assert(/ORDER BY default_priority ASC/i.test(defaultQuery!.sql), 'orders by default_priority');
  assert(/LIMIT 1/i.test(defaultQuery!.sql), 'limit 1');
}

// ============================================================================
// resolveAgent — no default agents → throws
// ============================================================================
console.log('\n── resolveAgent: no agents → throws ─────────────────────');

{
  resetAll();
  routes = [
    { match: /FROM agent_routing_rules/i, rows: [] },
    { match: /FROM agent_registry/i, rows: [] },
  ];
  let thrown = false;
  try {
    await svc.resolveAgent('x', 'y');
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('No active agents'), 'error message');
  }
  assert(thrown, 'throws when no agents');
}

// ============================================================================
// resolveAgent — multi-agent mode
// ============================================================================
console.log('\n── resolveAgent: multi-agent ────────────────────────────');

{
  resetAll();
  routes = [{
    match: /FROM agent_routing_rules/i,
    rows: [{
      id: 'r-multi',
      rule_name: 'multi',
      component: 'critical',
      prompt_type: null,
      agent_id: 'primary-agent',
      priority: 10,
      is_multi_agent: 1,
      comparison_agent_ids: '["cmp-1","cmp-2","cmp-inactive"]',
    }],
  }];
  getAgentLookup['primary-agent'] = {
    id: 'primary-agent', name: 'Primary', provider: 'claude', status: 'active',
  };
  getAgentLookup['cmp-1'] = { id: 'cmp-1', name: 'C1', provider: 'openai', status: 'active' };
  getAgentLookup['cmp-2'] = { id: 'cmp-2', name: 'C2', provider: 'gemini', status: 'active' };
  getAgentLookup['cmp-inactive'] = { id: 'cmp-inactive', name: 'CI', provider: 'openai', status: 'inactive' };

  const r = await svc.resolveAgent('critical', 'plan');
  assertEq(r.primary_agent.id, 'primary-agent', 'primary');
  assertEq(r.comparison_agents.length, 2, 'inactive filtered out');
  const cmpIds = r.comparison_agents.map((a: any) => a.id);
  assertEq(cmpIds, ['cmp-1', 'cmp-2'], 'active cmps kept');
  assertEq(r.is_multi_agent, true, 'multi-agent true');
  assertEq(r.rule.comparison_agent_ids, ['cmp-1', 'cmp-2', 'cmp-inactive'], 'rule has parsed ids');
}

// Multi-agent flag set but no comparison ids → is_multi_agent false (no cmps)
{
  resetAll();
  routes = [{
    match: /FROM agent_routing_rules/i,
    rows: [{
      id: 'r-lonely',
      rule_name: 'lonely',
      component: null,
      prompt_type: null,
      agent_id: 'p',
      priority: 10,
      is_multi_agent: 1,
      comparison_agent_ids: null,
    }],
  }];
  getAgentLookup['p'] = { id: 'p', name: 'P', provider: 'claude', status: 'active' };
  const r = await svc.resolveAgent(null, null);
  assertEq(r.is_multi_agent, false, 'multi true but no cmps → false');
}

// ============================================================================
// previewRoute — shape
// ============================================================================
console.log('\n── previewRoute ─────────────────────────────────────────');

{
  resetAll();
  routes = [{
    match: /FROM agent_routing_rules/i,
    rows: [{
      id: 'r-prev',
      rule_name: 'prev-rule',
      component: 'backend',
      prompt_type: 'implementation',
      agent_id: 'prev-agent',
      priority: 20,
      is_multi_agent: 0,
    }],
  }];
  getAgentLookup['prev-agent'] = {
    id: 'prev-agent', name: 'Preview', provider: 'claude', status: 'active',
  };

  const preview = await svc.previewRoute('backend', 'implementation');
  assertEq(preview.component, 'backend', 'component');
  assertEq(preview.prompt_type, 'implementation', 'prompt_type');
  assertEq(preview.primary_agent, { id: 'prev-agent', name: 'Preview', provider: 'claude' }, 'primary agent slim');
  assertEq(preview.comparison_agents, [], 'no cmps');
  assertEq(preview.matched_rule.id, 'r-prev', 'matched rule id');
  assertEq(preview.matched_rule.rule_name, 'prev-rule', 'matched rule name');
  assertEq(preview.matched_rule.priority, 20, 'matched rule priority');
  assertEq(preview.is_multi_agent, false, 'not multi');
}

// previewRoute when no rule matches
{
  resetAll();
  routes = [
    { match: /FROM agent_routing_rules/i, rows: [] },
    {
      match: /FROM agent_registry/i,
      rows: [{
        id: 'fb', name: 'Fallback', provider: 'claude', status: 'active',
        default_priority: 1, capabilities: '[]', config: null,
      }],
    },
  ];
  const preview = await svc.previewRoute('x', 'y');
  assertEq(preview.matched_rule, null, 'matched_rule null');
  assertEq(preview.primary_agent.id, 'fb', 'fallback agent');
}

// ============================================================================
// listRules — no filters
// ============================================================================
console.log('\n── listRules ────────────────────────────────────────────');

{
  resetAll();
  routes = [{
    match: /FROM agent_routing_rules/i,
    rows: [
      {
        id: 'r1', rule_name: 'A', component: 'backend', prompt_type: 'plan',
        agent_id: 'a1', priority: 10, is_multi_agent: 0,
        comparison_agent_ids: null, active: 1,
      },
      {
        id: 'r2', rule_name: 'B', component: null, prompt_type: null,
        agent_id: 'a2', priority: 20, is_multi_agent: 1,
        comparison_agent_ids: '["c1","c2"]', active: 1,
      },
    ],
  }];

  const rules = await svc.listRules();
  assertEq(rules.length, 2, '2 rules');
  assertEq(rules[0].comparison_agent_ids, [], 'null ids → []');
  assertEq(rules[1].comparison_agent_ids, ['c1', 'c2'], 'parsed ids');
  assertEq(qCalls[0].params, [], 'no filter params');
  assert(/ORDER BY r\.priority ASC/i.test(qCalls[0].sql), 'orders by priority');
}

// listRules — active filter
{
  resetAll();
  routes = [{ match: /FROM agent_routing_rules/i, rows: [] }];
  await svc.listRules({ active: true });
  assertEq(qCalls[0].params, [1], 'active=true → 1');
  assert(/r\.active = \?/i.test(qCalls[0].sql), 'active where');
}
{
  resetAll();
  routes = [{ match: /FROM agent_routing_rules/i, rows: [] }];
  await svc.listRules({ active: false });
  assertEq(qCalls[0].params, [0], 'active=false → 0');
}

// listRules — component filter
{
  resetAll();
  routes = [{ match: /FROM agent_routing_rules/i, rows: [] }];
  await svc.listRules({ component: 'backend' });
  assertEq(qCalls[0].params, ['backend'], 'component param');
  assert(/r\.component = \?/i.test(qCalls[0].sql), 'component where');
}

// Combined
{
  resetAll();
  routes = [{ match: /FROM agent_routing_rules/i, rows: [] }];
  await svc.listRules({ active: true, component: 'backend' });
  assertEq(qCalls[0].params, [1, 'backend'], 'combined params');
}

// ============================================================================
// createRule — validation
// ============================================================================
console.log('\n── createRule: validation ───────────────────────────────');

// Missing rule_name
{
  let thrown = false;
  try {
    await svc.createRule({ agent_id: 'a' });
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('rule_name'), 'mentions rule_name');
  }
  assert(thrown, 'missing rule_name throws');
}

// Missing agent_id
{
  let thrown = false;
  try {
    await svc.createRule({ rule_name: 'x' });
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('agent_id'), 'mentions agent_id');
  }
  assert(thrown, 'missing agent_id throws');
}

// Invalid prompt_type
{
  let thrown = false;
  try {
    await svc.createRule({ rule_name: 'x', agent_id: 'a', prompt_type: 'nonsense' });
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('Invalid prompt_type'), 'invalid prompt_type');
    assert(e.message.includes('nonsense'), 'mentions value');
  }
  assert(thrown, 'invalid prompt_type throws');
}

// Agent not found
{
  resetAll();
  getAgentLookup = {}; // no agents
  let thrown = false;
  try {
    await svc.createRule({ rule_name: 'x', agent_id: 'missing' });
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('Agent not found'), 'agent not found');
  }
  assert(thrown, 'missing agent throws');
}

// Comparison agent not found
{
  resetAll();
  getAgentLookup['a1'] = { id: 'a1', name: 'A', status: 'active' };
  let thrown = false;
  try {
    await svc.createRule({
      rule_name: 'x',
      agent_id: 'a1',
      is_multi_agent: true,
      comparison_agent_ids: ['missing-cmp'],
    });
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('Comparison agent not found'), 'cmp not found');
  }
  assert(thrown, 'missing cmp throws');
}

// ============================================================================
// createRule — happy path (with defaults)
// ============================================================================
console.log('\n── createRule: happy path ───────────────────────────────');

{
  resetAll();
  getAgentLookup['a1'] = { id: 'a1', name: 'A', status: 'active' };
  routes = [{ match: /INSERT INTO agent_routing_rules/i, rows: [], result: { insertId: 1 } }];

  const result = await svc.createRule({ rule_name: 'simple', agent_id: 'a1' });
  assertEq(result.rule_id, 'uuid-1', 'uuid returned');

  const ins = qCalls.find((c) => /INSERT INTO agent_routing_rules/i.test(c.sql));
  assert(ins !== undefined, 'INSERT called');
  // [id, rule_name, component, prompt_type, agent_id, priority, is_multi_agent, comparison_agent_ids]
  assertEq(
    ins!.params,
    ['uuid-1', 'simple', null, null, 'a1', 50, 0, null],
    'INSERT params with defaults'
  );
}

// With full options
{
  resetAll();
  getAgentLookup['a1'] = { id: 'a1', status: 'active' };
  getAgentLookup['c1'] = { id: 'c1', status: 'active' };
  getAgentLookup['c2'] = { id: 'c2', status: 'active' };
  routes = [{ match: /INSERT INTO agent_routing_rules/i, rows: [] }];

  await svc.createRule({
    rule_name: 'full',
    component: 'backend',
    prompt_type: 'plan',
    agent_id: 'a1',
    priority: 15,
    is_multi_agent: true,
    comparison_agent_ids: ['c1', 'c2'],
  });

  const ins = qCalls.find((c) => /INSERT INTO agent_routing_rules/i.test(c.sql));
  assertEq(
    ins!.params,
    ['uuid-1', 'full', 'backend', 'plan', 'a1', 15, 1, '["c1","c2"]'],
    'INSERT params full'
  );
}

// ============================================================================
// updateRule
// ============================================================================
console.log('\n── updateRule ───────────────────────────────────────────');

// No valid fields
{
  resetAll();
  let thrown = false;
  try {
    await svc.updateRule('r1', { foo: 'bar' }); // not in allowed list
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('No valid fields'), 'no valid fields');
  }
  assert(thrown, 'throws with no allowed fields');
}

// affectedRows = 0
// NOTE: service destructures `const [result] = await pool.query(...)` — takes
// the FIRST array element. For UPDATE/DELETE, mysql2 returns the OK packet as
// the first element, so we put `{affectedRows: N}` in the `rows` slot.
{
  resetAll();
  routes = [{
    match: /UPDATE agent_routing_rules/i,
    rows: { affectedRows: 0 } as any,
  }];
  let thrown = false;
  try {
    await svc.updateRule('missing', { rule_name: 'x' });
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('Rule not found'), 'rule not found');
  }
  assert(thrown, 'throws when not found');
}

// Happy path — mix of allowed fields + serialization
{
  resetAll();
  routes = [{
    match: /UPDATE agent_routing_rules/i,
    rows: { affectedRows: 1 } as any,
  }];
  const result = await svc.updateRule('r1', {
    rule_name: 'new-name',
    priority: 5,
    is_multi_agent: true,
    comparison_agent_ids: ['c1'],
    active: false,
    not_allowed: 'ignored',
  });
  assertEq(result, { success: true }, 'returns success');
  const call = qCalls[0];
  // Verify serialization: is_multi_agent → 1, active → 0, ids → JSON
  assert(call.params.includes('new-name'), 'rule_name param');
  assert(call.params.includes(5), 'priority param');
  assert(call.params.includes(1), 'is_multi_agent → 1');
  assert(call.params.includes(0), 'active → 0');
  assert(call.params.includes('["c1"]'), 'ids JSON');
  assert(call.params[call.params.length - 1] === 'r1', 'id is last param');
  // Verify non-allowed field NOT in SQL
  assert(!/not_allowed/i.test(call.sql), 'not_allowed excluded from SQL');
}

// comparison_agent_ids = null serializes to null
{
  resetAll();
  routes = [{
    match: /UPDATE agent_routing_rules/i,
    rows: { affectedRows: 1 } as any,
  }];
  await svc.updateRule('r1', { comparison_agent_ids: null });
  assert(qCalls[0].params.includes(null), 'null ids → null');
}

// ============================================================================
// deleteRule
// ============================================================================
console.log('\n── deleteRule ───────────────────────────────────────────');

{
  resetAll();
  routes = [{
    match: /DELETE FROM agent_routing_rules/i,
    rows: { affectedRows: 1 } as any,
  }];
  const result = await svc.deleteRule('r1');
  assertEq(result, { success: true }, 'success');
  assertEq(qCalls[0].params, ['r1'], 'id param');
  assert(/WHERE id = \?/i.test(qCalls[0].sql), 'WHERE id');
}

// Not found
{
  resetAll();
  routes = [{
    match: /DELETE FROM agent_routing_rules/i,
    rows: { affectedRows: 0 } as any,
  }];
  let thrown = false;
  try {
    await svc.deleteRule('missing');
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('Rule not found'), 'rule not found');
  }
  assert(thrown, 'deleteRule throws when not found');
}

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
