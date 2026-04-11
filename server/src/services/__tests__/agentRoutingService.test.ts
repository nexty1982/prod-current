#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRoutingService.js (OMD-1111)
 *
 * Deterministic agent routing. Two external deps, both stubbed via
 * require.cache BEFORE loading the SUT:
 *   - ../config/db             → fake getAppPool with route-dispatched query()
 *   - ./agentRegistryService   → scriptable getAgent(id)
 *
 * Coverage:
 *   resolveAgent:
 *     · exact match (component + prompt_type)
 *     · component-only match (rule with null prompt_type)
 *     · type-only match (rule with null component)
 *     · catch-all (null, null)
 *     · priority order: lowest priority rule wins
 *     · no rule matches → fallback to lowest default_priority active agent
 *     · no rules AND no active agents → throws
 *     · multi-agent: comparison agents loaded from rule
 *     · multi-agent: inactive comparison agents filtered out
 *     · is_multi_agent=1 but comparison_agents list empty → is_multi_agent=false
 *
 *   previewRoute:
 *     · returns shape { component, prompt_type, primary_agent, comparison_agents[], matched_rule, is_multi_agent }
 *     · matched_rule null when fallback used
 *
 *   listRules:
 *     · no filters
 *     · active filter (true + false)
 *     · component filter
 *     · combined filters
 *
 *   createRule:
 *     · missing rule_name → throws
 *     · missing agent_id → throws
 *     · invalid prompt_type → throws
 *     · agent not found → throws
 *     · comparison agent not found → throws
 *     · happy path default priority 50
 *     · happy path with all fields
 *     · comparison_agent_ids serialized to JSON
 *
 *   updateRule:
 *     · no valid fields → throws
 *     · not found → throws
 *     · comparison_agent_ids serialized
 *     · booleans coerced to 0/1
 *     · rejects unknown keys
 *
 *   deleteRule:
 *     · happy path
 *     · not found → throws
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

async function assertThrows(fn: () => Promise<any>, matcher: RegExp | string, message: string) {
  try {
    await fn();
    console.error(`  FAIL: ${message} (no throw)`); failed++;
  } catch (e: any) {
    const matches = typeof matcher === 'string'
      ? e.message.includes(matcher)
      : matcher.test(e.message);
    if (matches) { console.log(`  PASS: ${message}`); passed++; }
    else {
      console.error(`  FAIL: ${message}\n         message: ${e.message}`); failed++;
    }
  }
}

// ── Route-dispatch fake pool ─────────────────────────────────────────────────
type Route = { match: (sql: string, params: any[]) => boolean; handler: (params: any[], sql: string) => any };
const routes: Route[] = [];
const queryLog: { sql: string; params: any[] }[] = [];

function addRoute(match: RegExp | ((sql: string, params: any[]) => boolean), handler: (params: any[], sql: string) => any) {
  const matchFn = typeof match === 'function' ? match : (sql: string) => match.test(sql);
  routes.push({ match: matchFn, handler });
}

function resetRoutes() {
  routes.length = 0;
  queryLog.length = 0;
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match(sql, params)) {
        return [r.handler(params, sql)];
      }
    }
    return [[]];
  },
};

// ── agentRegistry stub ───────────────────────────────────────────────────────
const agentsById: Record<string, any> = {};
const getAgentCalls: string[] = [];

const agentRegistryStub = {
  getAgent: async (id: string) => {
    getAgentCalls.push(id);
    return agentsById[id] || null;
  },
};

// ── db stub ──────────────────────────────────────────────────────────────────
const dbStub = { getAppPool: () => fakePool };

// ── Install stubs BEFORE requiring SUT ──────────────────────────────────────
function stubAt(relPath: string, exports: any) {
  const p = require.resolve(relPath);
  require.cache[p] = { id: p, filename: p, loaded: true, exports } as any;
}

stubAt('../../config/db', dbStub);
stubAt('../agentRegistryService', agentRegistryStub);

const routing = require('../agentRoutingService');
const {
  VALID_PROMPT_TYPES,
  resolveAgent,
  previewRoute,
  listRules,
  createRule,
  updateRule,
  deleteRule,
} = routing;

// Silence noisy logs if the SUT logs anything on error
const origError = console.error;
function quiet() { console.error = () => {}; }
function loud() { console.error = origError; }

function resetAll() {
  resetRoutes();
  for (const k of Object.keys(agentsById)) delete agentsById[k];
  getAgentCalls.length = 0;
}

// Agents
function makeAgent(id: string, overrides: any = {}) {
  return {
    id, name: `Agent-${id}`, provider: 'anthropic', status: 'active',
    default_priority: 100, capabilities: [], config: null,
    ...overrides,
  };
}

async function main() {

// ============================================================================
// VALID_PROMPT_TYPES exposure
// ============================================================================
console.log('\n── exports ───────────────────────────────────────────────');
assert(Array.isArray(VALID_PROMPT_TYPES), 'VALID_PROMPT_TYPES is array');
assert(VALID_PROMPT_TYPES.includes('implementation'), 'includes implementation');
assert(VALID_PROMPT_TYPES.includes('verification'), 'includes verification');
assert(VALID_PROMPT_TYPES.length === 6, '6 valid types');

// ============================================================================
// resolveAgent: exact match
// ============================================================================
console.log('\n── resolveAgent: exact match ─────────────────────────────');

resetAll();
agentsById['a1'] = makeAgent('a1', { name: 'Claude' });
addRoute(/FROM agent_routing_rules/i, () => [
  { id: 'r1', rule_name: 'exact-rule', component: 'backend', prompt_type: 'implementation',
    agent_id: 'a1', priority: 10, is_multi_agent: 0, comparison_agent_ids: null,
    agent_name: 'Claude', agent_status: 'active' },
]);
{
  const r = await resolveAgent('backend', 'implementation');
  assertEq(r.primary_agent.id, 'a1', 'primary is a1');
  assertEq(r.primary_agent.name, 'Claude', 'primary name');
  assertEq(r.comparison_agents, [], 'no comparison agents');
  assertEq(r.is_multi_agent, false, 'not multi-agent');
  assert(r.rule !== null, 'rule populated');
  assertEq(r.rule.rule_name, 'exact-rule', 'rule name');
  assertEq(r.rule.comparison_agent_ids, [], 'parsed empty comparison ids');
}

// ============================================================================
// resolveAgent: component-only match (null prompt_type in rule)
// ============================================================================
console.log('\n── resolveAgent: component-only ──────────────────────────');

resetAll();
agentsById['a2'] = makeAgent('a2');
addRoute(/FROM agent_routing_rules/i, () => [
  { id: 'r2', rule_name: 'component-rule', component: 'backend', prompt_type: null,
    agent_id: 'a2', priority: 20, is_multi_agent: 0, comparison_agent_ids: null,
    agent_name: 'Agent-a2', agent_status: 'active' },
]);
{
  const r = await resolveAgent('backend', 'implementation');
  assertEq(r.primary_agent.id, 'a2', 'matched component-only rule');
  assertEq(r.rule.component, 'backend', 'rule component');
}

// component mismatch → no match
resetAll();
agentsById['a2'] = makeAgent('a2');
agentsById['default'] = makeAgent('default', { default_priority: 1 });
addRoute(/FROM agent_routing_rules/i, () => [
  { id: 'r2', rule_name: 'component-rule', component: 'frontend', prompt_type: null,
    agent_id: 'a2', priority: 20, is_multi_agent: 0, comparison_agent_ids: null,
    agent_name: 'Agent-a2', agent_status: 'active' },
]);
addRoute(/FROM agent_registry.*ORDER BY default_priority/i, () => [
  { id: 'default', name: 'DefaultAgent', status: 'active', default_priority: 1,
    capabilities: '["a","b"]', config: '{"x":1}' },
]);
{
  const r = await resolveAgent('backend', 'implementation');
  assertEq(r.primary_agent.id, 'default', 'fell through to default');
  assertEq(r.rule, null, 'no rule matched');
}

// ============================================================================
// resolveAgent: type-only match (null component in rule)
// ============================================================================
console.log('\n── resolveAgent: type-only ───────────────────────────────');

resetAll();
agentsById['a3'] = makeAgent('a3');
addRoute(/FROM agent_routing_rules/i, () => [
  { id: 'r3', rule_name: 'type-rule', component: null, prompt_type: 'verification',
    agent_id: 'a3', priority: 30, is_multi_agent: 0, comparison_agent_ids: null,
    agent_name: 'Agent-a3', agent_status: 'active' },
]);
{
  const r = await resolveAgent('whatever', 'verification');
  assertEq(r.primary_agent.id, 'a3', 'matched type-only rule');
}

// ============================================================================
// resolveAgent: catch-all (null + null)
// ============================================================================
console.log('\n── resolveAgent: catch-all ───────────────────────────────');

resetAll();
agentsById['a4'] = makeAgent('a4');
addRoute(/FROM agent_routing_rules/i, () => [
  { id: 'r4', rule_name: 'catch-all', component: null, prompt_type: null,
    agent_id: 'a4', priority: 90, is_multi_agent: 0, comparison_agent_ids: null,
    agent_name: 'Agent-a4', agent_status: 'active' },
]);
{
  const r = await resolveAgent('anything', 'anything');
  assertEq(r.primary_agent.id, 'a4', 'catch-all matched');
}

// ============================================================================
// resolveAgent: priority order — first in list wins (SQL already orders)
// ============================================================================
console.log('\n── resolveAgent: priority first-wins ─────────────────────');

resetAll();
agentsById['high'] = makeAgent('high');
agentsById['low'] = makeAgent('low');
// SQL returns ORDER BY priority ASC — simulate that
addRoute(/FROM agent_routing_rules/i, () => [
  { id: 'rh', rule_name: 'high-prio', component: 'backend', prompt_type: 'implementation',
    agent_id: 'high', priority: 5, is_multi_agent: 0, comparison_agent_ids: null,
    agent_name: 'High', agent_status: 'active' },
  { id: 'rl', rule_name: 'low-prio', component: 'backend', prompt_type: 'implementation',
    agent_id: 'low', priority: 50, is_multi_agent: 0, comparison_agent_ids: null,
    agent_name: 'Low', agent_status: 'active' },
]);
{
  const r = await resolveAgent('backend', 'implementation');
  assertEq(r.primary_agent.id, 'high', 'first listed wins (priority 5)');
  assertEq(r.rule.priority, 5, 'rule has priority 5');
}

// ============================================================================
// resolveAgent: no rules at all → fallback
// ============================================================================
console.log('\n── resolveAgent: no rules → fallback ─────────────────────');

resetAll();
addRoute(/FROM agent_routing_rules/i, () => []);
addRoute(/FROM agent_registry.*ORDER BY default_priority/i, () => [
  { id: 'fallback', name: 'Fallback', status: 'active', provider: 'openai',
    default_priority: 1, capabilities: '["code"]', config: null },
]);
{
  const r = await resolveAgent('anything', 'anything');
  assertEq(r.primary_agent.id, 'fallback', 'fallback agent');
  assertEq(r.primary_agent.name, 'Fallback', 'fallback name');
  assertEq(r.primary_agent.capabilities, ['code'], 'capabilities JSON-parsed');
  assertEq(r.primary_agent.config, null, 'config null');
  assertEq(r.rule, null, 'no rule');
  assertEq(r.is_multi_agent, false, 'not multi-agent');
  assertEq(r.comparison_agents, [], 'no comparison agents');
}

// No rules AND no active agents → throws
resetAll();
addRoute(/FROM agent_routing_rules/i, () => []);
addRoute(/FROM agent_registry.*ORDER BY default_priority/i, () => []);
await assertThrows(
  () => resolveAgent('backend', 'implementation'),
  /No active agents configured/,
  'throws when no fallback agent'
);

// ============================================================================
// resolveAgent: multi-agent mode
// ============================================================================
console.log('\n── resolveAgent: multi-agent ─────────────────────────────');

resetAll();
agentsById['primary'] = makeAgent('primary');
agentsById['cmp1'] = makeAgent('cmp1');
agentsById['cmp2'] = makeAgent('cmp2');
addRoute(/FROM agent_routing_rules/i, () => [
  { id: 'mr', rule_name: 'multi', component: 'backend', prompt_type: 'implementation',
    agent_id: 'primary', priority: 10,
    is_multi_agent: 1,
    comparison_agent_ids: JSON.stringify(['cmp1', 'cmp2']),
    agent_name: 'primary', agent_status: 'active' },
]);
{
  const r = await resolveAgent('backend', 'implementation');
  assertEq(r.primary_agent.id, 'primary', 'primary');
  assertEq(r.comparison_agents.length, 2, '2 comparison agents');
  assertEq(r.comparison_agents[0].id, 'cmp1', 'cmp1 loaded');
  assertEq(r.comparison_agents[1].id, 'cmp2', 'cmp2 loaded');
  assertEq(r.is_multi_agent, true, 'is_multi_agent true');
}

// Inactive comparison agent filtered out
resetAll();
agentsById['primary'] = makeAgent('primary');
agentsById['cmp1'] = makeAgent('cmp1');
agentsById['cmp2'] = makeAgent('cmp2', { status: 'inactive' });
addRoute(/FROM agent_routing_rules/i, () => [
  { id: 'mr', rule_name: 'multi', component: null, prompt_type: null,
    agent_id: 'primary', priority: 10,
    is_multi_agent: 1,
    comparison_agent_ids: JSON.stringify(['cmp1', 'cmp2']),
    agent_name: 'primary', agent_status: 'active' },
]);
{
  const r = await resolveAgent('backend', 'implementation');
  assertEq(r.comparison_agents.length, 1, '1 active comparison (inactive filtered)');
  assertEq(r.comparison_agents[0].id, 'cmp1', 'kept cmp1');
}

// is_multi_agent=1 with all comparison agents inactive → is_multi_agent=false
resetAll();
agentsById['primary'] = makeAgent('primary');
agentsById['cmp'] = makeAgent('cmp', { status: 'inactive' });
addRoute(/FROM agent_routing_rules/i, () => [
  { id: 'mr', rule_name: 'multi', component: null, prompt_type: null,
    agent_id: 'primary', priority: 10,
    is_multi_agent: 1,
    comparison_agent_ids: JSON.stringify(['cmp']),
    agent_name: 'primary', agent_status: 'active' },
]);
{
  const r = await resolveAgent('a', 'b');
  assertEq(r.is_multi_agent, false, 'no active comparisons → not multi');
  assertEq(r.comparison_agents, [], 'empty');
}

// Missing comparison agent (getAgent returns null) → skipped
resetAll();
agentsById['primary'] = makeAgent('primary');
// cmp-missing not registered
addRoute(/FROM agent_routing_rules/i, () => [
  { id: 'mr', rule_name: 'multi', component: null, prompt_type: null,
    agent_id: 'primary', priority: 10,
    is_multi_agent: 1,
    comparison_agent_ids: JSON.stringify(['cmp-missing']),
    agent_name: 'primary', agent_status: 'active' },
]);
{
  const r = await resolveAgent('a', 'b');
  assertEq(r.comparison_agents, [], 'missing agent skipped');
  assertEq(r.is_multi_agent, false, 'not multi');
}

// is_multi_agent=1 but comparison_agent_ids is null → no comparisons
resetAll();
agentsById['primary'] = makeAgent('primary');
addRoute(/FROM agent_routing_rules/i, () => [
  { id: 'mr', rule_name: 'multi-no-ids', component: null, prompt_type: null,
    agent_id: 'primary', priority: 10,
    is_multi_agent: 1,
    comparison_agent_ids: null,
    agent_name: 'primary', agent_status: 'active' },
]);
{
  const r = await resolveAgent('a', 'b');
  assertEq(r.comparison_agents, [], 'no ids → no comparisons');
  assertEq(r.is_multi_agent, false, 'not multi without comparisons');
}

// ============================================================================
// previewRoute
// ============================================================================
console.log('\n── previewRoute ──────────────────────────────────────────');

resetAll();
agentsById['p1'] = makeAgent('p1', { name: 'PrimaryP', provider: 'anthropic' });
agentsById['c1'] = makeAgent('c1', { name: 'CompC', provider: 'openai' });
addRoute(/FROM agent_routing_rules/i, () => [
  { id: 'pr1', rule_name: 'preview-rule', component: 'backend', prompt_type: 'plan',
    agent_id: 'p1', priority: 25,
    is_multi_agent: 1,
    comparison_agent_ids: JSON.stringify(['c1']),
    agent_name: 'PrimaryP', agent_status: 'active' },
]);
{
  const p = await previewRoute('backend', 'plan');
  assertEq(p.component, 'backend', 'component echoed');
  assertEq(p.prompt_type, 'plan', 'prompt_type echoed');
  assertEq(p.primary_agent.id, 'p1', 'primary id');
  assertEq(p.primary_agent.name, 'PrimaryP', 'primary name');
  assertEq(p.primary_agent.provider, 'anthropic', 'primary provider');
  assertEq(p.comparison_agents.length, 1, '1 comparison');
  assertEq(p.comparison_agents[0].id, 'c1', 'comparison id');
  assertEq(p.comparison_agents[0].provider, 'openai', 'comparison provider');
  assertEq(p.matched_rule.rule_name, 'preview-rule', 'rule name');
  assertEq(p.matched_rule.priority, 25, 'rule priority');
  assertEq(p.is_multi_agent, true, 'multi-agent');
}

// previewRoute: fallback → matched_rule null
resetAll();
addRoute(/FROM agent_routing_rules/i, () => []);
addRoute(/FROM agent_registry.*ORDER BY default_priority/i, () => [
  { id: 'fb', name: 'FB', status: 'active', provider: 'openai',
    default_priority: 1, capabilities: '[]', config: null },
]);
{
  const p = await previewRoute('backend', 'plan');
  assertEq(p.matched_rule, null, 'no matched rule');
  assertEq(p.primary_agent.id, 'fb', 'fallback agent');
  assertEq(p.is_multi_agent, false, 'not multi');
}

// ============================================================================
// listRules
// ============================================================================
console.log('\n── listRules ─────────────────────────────────────────────');

// no filters
resetAll();
let lastListSql = '';
let lastListParams: any[] = [];
addRoute(/FROM agent_routing_rules r[\s\S]*JOIN agent_registry/i, (params, sql) => {
  lastListSql = sql; lastListParams = params;
  return [
    { id: 'r1', rule_name: 'A', component: 'backend', prompt_type: null, agent_id: 'a1',
      priority: 10, is_multi_agent: 0, active: 1, comparison_agent_ids: null,
      agent_name: 'Claude', agent_provider: 'anthropic' },
  ];
});
{
  const rules = await listRules();
  assertEq(rules.length, 1, '1 rule');
  assertEq(rules[0].rule_name, 'A', 'rule name');
  assertEq(rules[0].comparison_agent_ids, [], 'parsed empty array');
  assertEq(lastListParams, [], 'no params when no filters');
  assert(/WHERE 1=1/.test(lastListSql), 'base WHERE 1=1');
}

// filter: active=true
resetAll();
addRoute(/FROM agent_routing_rules r[\s\S]*JOIN agent_registry/i, (params, sql) => {
  lastListSql = sql; lastListParams = params;
  return [];
});
{
  await listRules({ active: true });
  assertEq(lastListParams, [1], 'active=true → params=[1]');
  assert(/r.active = \?/.test(lastListSql), 'SQL filters active');
}

// filter: active=false
resetAll();
addRoute(/FROM agent_routing_rules r[\s\S]*JOIN agent_registry/i, (params, sql) => {
  lastListSql = sql; lastListParams = params;
  return [];
});
{
  await listRules({ active: false });
  assertEq(lastListParams, [0], 'active=false → params=[0]');
}

// filter: component
resetAll();
addRoute(/FROM agent_routing_rules r[\s\S]*JOIN agent_registry/i, (params, sql) => {
  lastListSql = sql; lastListParams = params;
  return [];
});
{
  await listRules({ component: 'frontend' });
  assertEq(lastListParams, ['frontend'], 'component param');
  assert(/r.component = \?/.test(lastListSql), 'SQL filters component');
}

// combined filters
resetAll();
addRoute(/FROM agent_routing_rules r[\s\S]*JOIN agent_registry/i, (params, sql) => {
  lastListSql = sql; lastListParams = params;
  return [];
});
{
  await listRules({ active: true, component: 'backend' });
  assertEq(lastListParams, [1, 'backend'], 'combined params');
}

// ============================================================================
// createRule
// ============================================================================
console.log('\n── createRule: validation ────────────────────────────────');

resetAll();
await assertThrows(
  () => createRule({ agent_id: 'a1' }),
  /rule_name and agent_id are required/,
  'missing rule_name → throws'
);

resetAll();
await assertThrows(
  () => createRule({ rule_name: 'x' }),
  /rule_name and agent_id are required/,
  'missing agent_id → throws'
);

resetAll();
agentsById['a1'] = makeAgent('a1');
await assertThrows(
  () => createRule({ rule_name: 'x', agent_id: 'a1', prompt_type: 'bogus' }),
  /Invalid prompt_type/,
  'invalid prompt_type → throws'
);

// Agent not found
resetAll();
// agentsById empty, so getAgent returns null
await assertThrows(
  () => createRule({ rule_name: 'x', agent_id: 'missing' }),
  /Agent not found/,
  'agent not found → throws'
);

// Comparison agent not found
resetAll();
agentsById['primary'] = makeAgent('primary');
// 'cmp-missing' not registered
await assertThrows(
  () => createRule({
    rule_name: 'x', agent_id: 'primary',
    is_multi_agent: true,
    comparison_agent_ids: ['cmp-missing'],
  }),
  /Comparison agent not found/,
  'comparison agent not found → throws'
);

console.log('\n── createRule: happy path ────────────────────────────────');

// Happy path — defaults
resetAll();
agentsById['a1'] = makeAgent('a1');
let lastInsertParams: any[] = [];
addRoute(/INSERT INTO agent_routing_rules/i, (params) => {
  lastInsertParams = params;
  return { affectedRows: 1 };
});
{
  const r = await createRule({ rule_name: 'NewRule', agent_id: 'a1' });
  assert(typeof r.rule_id === 'string' && r.rule_id.length > 0, 'returns rule_id');
  // params: [id, rule_name, component, prompt_type, agent_id, priority, is_multi_agent, comparison_agent_ids]
  assertEq(lastInsertParams[1], 'NewRule', 'rule_name');
  assertEq(lastInsertParams[2], null, 'component defaults null');
  assertEq(lastInsertParams[3], null, 'prompt_type defaults null');
  assertEq(lastInsertParams[4], 'a1', 'agent_id');
  assertEq(lastInsertParams[5], 50, 'priority defaults to 50');
  assertEq(lastInsertParams[6], 0, 'is_multi_agent defaults 0');
  assertEq(lastInsertParams[7], null, 'comparison_agent_ids defaults null');
}

// Happy path with all fields
resetAll();
agentsById['a1'] = makeAgent('a1');
agentsById['c1'] = makeAgent('c1');
agentsById['c2'] = makeAgent('c2');
addRoute(/INSERT INTO agent_routing_rules/i, (params) => {
  lastInsertParams = params;
  return { affectedRows: 1 };
});
{
  await createRule({
    rule_name: 'Full',
    component: 'backend',
    prompt_type: 'implementation',
    agent_id: 'a1',
    priority: 7,
    is_multi_agent: true,
    comparison_agent_ids: ['c1', 'c2'],
  });
  assertEq(lastInsertParams[1], 'Full', 'rule_name');
  assertEq(lastInsertParams[2], 'backend', 'component');
  assertEq(lastInsertParams[3], 'implementation', 'prompt_type');
  assertEq(lastInsertParams[5], 7, 'priority 7');
  assertEq(lastInsertParams[6], 1, 'is_multi_agent = 1');
  assertEq(lastInsertParams[7], JSON.stringify(['c1', 'c2']), 'comparison ids serialized');
}

// ============================================================================
// updateRule
// ============================================================================
console.log('\n── updateRule ────────────────────────────────────────────');

// No valid fields
resetAll();
await assertThrows(
  () => updateRule('r1', {}),
  /No valid fields to update/,
  'empty updates → throws'
);

resetAll();
await assertThrows(
  () => updateRule('r1', { unknown_field: 'x' }),
  /No valid fields to update/,
  'unknown field → throws'
);

// Happy path: multiple fields
resetAll();
let lastUpdateSql = '';
let lastUpdateParams: any[] = [];
addRoute(/UPDATE agent_routing_rules SET/i, (params, sql) => {
  lastUpdateSql = sql; lastUpdateParams = params;
  return { affectedRows: 1 };
});
{
  const r = await updateRule('r1', {
    rule_name: 'Renamed',
    priority: 99,
    is_multi_agent: true,
    active: false,
    comparison_agent_ids: ['x', 'y'],
  });
  assertEq(r.success, true, 'returns success');
  // Last param is id
  assertEq(lastUpdateParams[lastUpdateParams.length - 1], 'r1', 'id last');
  // is_multi_agent should be 1 (coerced)
  assert(lastUpdateParams.includes(1), 'is_multi_agent = 1');
  // active should be 0 (coerced)
  assert(lastUpdateParams.includes(0), 'active = 0');
  // comparison_agent_ids serialized
  assert(lastUpdateParams.includes(JSON.stringify(['x', 'y'])), 'comparison_agent_ids serialized');
  assert(/rule_name = \?/.test(lastUpdateSql), 'SQL has rule_name');
  assert(/priority = \?/.test(lastUpdateSql), 'SQL has priority');
}

// Not found
resetAll();
addRoute(/UPDATE agent_routing_rules SET/i, () => ({ affectedRows: 0 }));
await assertThrows(
  () => updateRule('missing', { rule_name: 'x' }),
  /Rule not found/,
  'not found → throws'
);

// comparison_agent_ids null
resetAll();
addRoute(/UPDATE agent_routing_rules SET/i, (params) => {
  lastUpdateParams = params;
  return { affectedRows: 1 };
});
{
  await updateRule('r1', { comparison_agent_ids: null });
  assert(lastUpdateParams.includes(null), 'null passed through');
}

// ============================================================================
// deleteRule
// ============================================================================
console.log('\n── deleteRule ────────────────────────────────────────────');

resetAll();
let lastDeleteParams: any[] = [];
addRoute(/DELETE FROM agent_routing_rules/i, (params) => {
  lastDeleteParams = params;
  return { affectedRows: 1 };
});
{
  const r = await deleteRule('r1');
  assertEq(r.success, true, 'returns success');
  assertEq(lastDeleteParams, ['r1'], 'id passed');
}

resetAll();
addRoute(/DELETE FROM agent_routing_rules/i, () => ({ affectedRows: 0 }));
await assertThrows(
  () => deleteRule('missing'),
  /Rule not found/,
  'delete not found → throws'
);

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
