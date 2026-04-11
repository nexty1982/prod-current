#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRoutingService.js
 *
 * Deterministic routing service. Deps:
 *   - ../config/db         (getAppPool)
 *   - ./agentRegistryService (getAgent)
 *   - uuid                 (v4)
 *
 * All three stubbed via require.cache before requiring the SUT.
 * A scriptable SQL-routed pool captures every query and returns
 * scriptable rows keyed by regex match.
 *
 * Coverage:
 *   - VALID_PROMPT_TYPES constant
 *   - resolveAgent
 *       · exact match (component + prompt_type)
 *       · component-only match (null prompt_type)
 *       · type-only match (null component)
 *       · catch-all (both null)
 *       · first-match-wins by priority order
 *       · multi-agent expansion (includes comparison agents)
 *       · inactive comparison agents filtered
 *       · multi-agent without comparison ids
 *       · fallback to system default when no rule matches
 *       · throws when no active agents
 *   - previewRoute
 *       · strips to { id, name, provider } + matched rule
 *   - listRules
 *       · no filter
 *       · active filter (true/false → 1/0)
 *       · component filter
 *       · combined filters
 *   - createRule
 *       · throws without rule_name or agent_id
 *       · throws on invalid prompt_type
 *       · throws when agent not found
 *       · throws when comparison agent not found
 *       · INSERT params, defaults (priority=50, nulls), JSON serialization
 *       · is_multi_agent boolean → 1/0
 *   - updateRule
 *       · whitelist enforcement
 *       · JSON serialization for comparison_agent_ids (truthy and null)
 *       · boolean coercion for is_multi_agent/active
 *       · empty/unknown → throws
 *       · affectedRows=0 → throws
 *   - deleteRule
 *       · affectedRows=1 → success
 *       · affectedRows=0 → throws
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

// ── Scriptable pool ─────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Route = { match: RegExp; respond?: (params: any[]) => any; rows?: any };
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        const out = r.respond ? r.respond(params) : r.rows;
        return [out];
      }
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true, exports: dbStub,
} as any;

// ── Stub agentRegistryService ──────────────────────────────────────
const agentsById: Record<string, any> = {};
const getAgentCalls: string[] = [];

const agentRegistryStub = {
  getAgent: async (id: string) => {
    getAgentCalls.push(id);
    return agentsById[id] || null;
  },
};
const registryPath = require.resolve('../agentRegistryService');
require.cache[registryPath] = {
  id: registryPath, filename: registryPath, loaded: true, exports: agentRegistryStub,
} as any;

// ── Stub uuid ──────────────────────────────────────────────────────
const uuidStub = { v4: () => 'gen-uuid-xyz' };
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath, filename: uuidPath, loaded: true, exports: uuidStub,
} as any;

function reset() {
  queryLog.length = 0;
  routes = [];
  getAgentCalls.length = 0;
  for (const k of Object.keys(agentsById)) delete agentsById[k];
}

const svc = require('../agentRoutingService');
const {
  VALID_PROMPT_TYPES,
  resolveAgent,
  previewRoute,
  listRules,
  createRule,
  updateRule,
  deleteRule,
} = svc;

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');

assertEq(
  VALID_PROMPT_TYPES,
  ['plan', 'implementation', 'verification', 'correction', 'migration', 'docs'],
  'VALID_PROMPT_TYPES'
);

// ============================================================================
// resolveAgent — exact match
// ============================================================================
console.log('\n── resolveAgent: exact match ─────────────────────────────');

reset();
agentsById['agent-1'] = { id: 'agent-1', name: 'Claude', provider: 'anthropic', status: 'active' };
routes.push({
  match: /FROM agent_routing_rules/,
  rows: [
    { id: 'r1', rule_name: 'exact-be-impl', component: 'backend', prompt_type: 'implementation',
      agent_id: 'agent-1', priority: 10, is_multi_agent: 0, comparison_agent_ids: null },
  ],
});
{
  const r = await resolveAgent('backend', 'implementation');
  assertEq(r.primary_agent.id, 'agent-1', 'primary agent');
  assertEq(r.comparison_agents, [], 'no comparison agents');
  assertEq(r.is_multi_agent, false, 'not multi-agent');
  assert(r.rule !== null, 'rule matched');
  assertEq(r.rule.rule_name, 'exact-be-impl', 'rule name');
  assertEq(getAgentCalls, ['agent-1'], 'fetched primary agent');
}

// ============================================================================
// resolveAgent — first-match-wins by priority
// ============================================================================
console.log('\n── resolveAgent: priority ordering ───────────────────────');

reset();
agentsById['agent-a'] = { id: 'agent-a', name: 'A', provider: 'anthropic', status: 'active' };
agentsById['agent-b'] = { id: 'agent-b', name: 'B', provider: 'openai', status: 'active' };
routes.push({
  match: /FROM agent_routing_rules/,
  rows: [
    // First in ORDER BY priority ASC → lowest priority wins
    { id: 'r1', rule_name: 'low-prio', component: 'backend', prompt_type: null,
      agent_id: 'agent-a', priority: 10, is_multi_agent: 0, comparison_agent_ids: null },
    { id: 'r2', rule_name: 'hi-prio', component: 'backend', prompt_type: 'implementation',
      agent_id: 'agent-b', priority: 20, is_multi_agent: 0, comparison_agent_ids: null },
  ],
});
{
  const r = await resolveAgent('backend', 'implementation');
  assertEq(r.primary_agent.id, 'agent-a', 'first rule wins by priority');
  assertEq(r.rule.rule_name, 'low-prio', 'matched low-prio');
}

// ============================================================================
// resolveAgent — component-only match
// ============================================================================
console.log('\n── resolveAgent: component-only ──────────────────────────');

reset();
agentsById['agent-x'] = { id: 'agent-x', name: 'X', provider: 'openai', status: 'active' };
routes.push({
  match: /FROM agent_routing_rules/,
  rows: [
    { id: 'r1', rule_name: 'type-only', component: null, prompt_type: 'plan',
      agent_id: 'agent-x', priority: 5, is_multi_agent: 0, comparison_agent_ids: null },
    { id: 'r2', rule_name: 'be-any', component: 'backend', prompt_type: null,
      agent_id: 'agent-x', priority: 10, is_multi_agent: 0, comparison_agent_ids: null },
  ],
});
{
  // Looking for backend + implementation: r1 fails (type≠plan), r2 matches (component=backend, any type)
  const r = await resolveAgent('backend', 'implementation');
  assertEq(r.rule.rule_name, 'be-any', 'component-only matches');
}

// ============================================================================
// resolveAgent — type-only match
// ============================================================================
console.log('\n── resolveAgent: type-only ───────────────────────────────');

reset();
agentsById['agent-t'] = { id: 'agent-t', name: 'T', provider: 'openai', status: 'active' };
routes.push({
  match: /FROM agent_routing_rules/,
  rows: [
    { id: 'r1', rule_name: 'plan-any', component: null, prompt_type: 'plan',
      agent_id: 'agent-t', priority: 10, is_multi_agent: 0, comparison_agent_ids: null },
  ],
});
{
  const r = await resolveAgent('frontend', 'plan');
  assertEq(r.rule.rule_name, 'plan-any', 'type-only matches');
}

// ============================================================================
// resolveAgent — catch-all
// ============================================================================
console.log('\n── resolveAgent: catch-all ───────────────────────────────');

reset();
agentsById['agent-c'] = { id: 'agent-c', name: 'C', provider: 'anthropic', status: 'active' };
routes.push({
  match: /FROM agent_routing_rules/,
  rows: [
    { id: 'r1', rule_name: 'catch-all', component: null, prompt_type: null,
      agent_id: 'agent-c', priority: 100, is_multi_agent: 0, comparison_agent_ids: null },
  ],
});
{
  const r = await resolveAgent('anything', 'whatever');
  assertEq(r.rule.rule_name, 'catch-all', 'catch-all matches');
}

// ============================================================================
// resolveAgent — multi-agent expansion
// ============================================================================
console.log('\n── resolveAgent: multi-agent ─────────────────────────────');

reset();
agentsById['agent-p'] = { id: 'agent-p', name: 'Primary', provider: 'anthropic', status: 'active' };
agentsById['agent-c1'] = { id: 'agent-c1', name: 'Comp1', provider: 'openai', status: 'active' };
agentsById['agent-c2'] = { id: 'agent-c2', name: 'Comp2', provider: 'google', status: 'inactive' };
agentsById['agent-c3'] = { id: 'agent-c3', name: 'Comp3', provider: 'local', status: 'active' };
routes.push({
  match: /FROM agent_routing_rules/,
  rows: [
    { id: 'r1', rule_name: 'multi', component: 'backend', prompt_type: null,
      agent_id: 'agent-p', priority: 10, is_multi_agent: 1,
      comparison_agent_ids: JSON.stringify(['agent-c1', 'agent-c2', 'agent-c3']) },
  ],
});
{
  const r = await resolveAgent('backend', 'impl');
  assertEq(r.primary_agent.id, 'agent-p', 'primary');
  assertEq(r.comparison_agents.length, 2, '2 active comparison agents (c2 inactive filtered)');
  assertEq(r.comparison_agents[0].id, 'agent-c1', 'c1 included');
  assertEq(r.comparison_agents[1].id, 'agent-c3', 'c3 included');
  assertEq(r.is_multi_agent, true, 'is_multi_agent true');
}

// Multi-agent with no comparison ids → not actually multi
reset();
agentsById['agent-p'] = { id: 'agent-p', name: 'P', provider: 'anthropic', status: 'active' };
routes.push({
  match: /FROM agent_routing_rules/,
  rows: [
    { id: 'r1', rule_name: 'multi-empty', component: null, prompt_type: null,
      agent_id: 'agent-p', priority: 10, is_multi_agent: 1, comparison_agent_ids: null },
  ],
});
{
  const r = await resolveAgent('x', 'y');
  assertEq(r.comparison_agents, [], 'empty comparison');
  assertEq(r.is_multi_agent, false, 'not multi when no comps');
}

// ============================================================================
// resolveAgent — fallback to system default
// ============================================================================
console.log('\n── resolveAgent: fallback default ────────────────────────');

reset();
// No matching rules, but fallback query returns one
routes.push({ match: /FROM agent_routing_rules/, rows: [] });
routes.push({
  match: /WHERE status = 'active' ORDER BY default_priority/,
  rows: [
    { id: 'default-agent', name: 'Default', provider: 'anthropic', status: 'active',
      capabilities: '["code"]', config: null, default_priority: 1 },
  ],
});
{
  const r = await resolveAgent('unknown', 'unknown');
  assertEq(r.primary_agent.id, 'default-agent', 'default agent');
  assertEq(r.primary_agent.capabilities, ['code'], 'capabilities parsed');
  assertEq(r.rule, null, 'no rule');
  assertEq(r.is_multi_agent, false, 'not multi');
  assertEq(r.comparison_agents, [], 'no comparisons');
}

// No active agents at all → throws
reset();
routes.push({ match: /FROM agent_routing_rules/, rows: [] });
routes.push({ match: /WHERE status = 'active'/, rows: [] });
{
  let caught: any = null;
  try { await resolveAgent('x', 'y'); }
  catch (e) { caught = e; }
  assert(caught && /No active agents/.test(caught.message), 'no agents throws');
}

// ============================================================================
// previewRoute
// ============================================================================
console.log('\n── previewRoute ──────────────────────────────────────────');

reset();
agentsById['agent-1'] = { id: 'agent-1', name: 'Claude', provider: 'anthropic', status: 'active',
  model_id: 'opus', capabilities: ['code'] };
agentsById['agent-2'] = { id: 'agent-2', name: 'GPT', provider: 'openai', status: 'active',
  model_id: 'gpt-4', capabilities: ['code'] };
routes.push({
  match: /FROM agent_routing_rules/,
  rows: [
    { id: 'r1', rule_name: 'multi', component: 'backend', prompt_type: 'plan',
      agent_id: 'agent-1', priority: 5, is_multi_agent: 1,
      comparison_agent_ids: JSON.stringify(['agent-2']) },
  ],
});
{
  const r = await previewRoute('backend', 'plan');
  assertEq(r.component, 'backend', 'component echoed');
  assertEq(r.prompt_type, 'plan', 'prompt_type echoed');
  // Primary stripped to id/name/provider only
  assertEq(
    r.primary_agent,
    { id: 'agent-1', name: 'Claude', provider: 'anthropic' },
    'primary stripped'
  );
  assertEq(r.comparison_agents.length, 1, '1 comparison');
  assertEq(
    r.comparison_agents[0],
    { id: 'agent-2', name: 'GPT', provider: 'openai' },
    'comparison stripped'
  );
  assertEq(r.matched_rule.rule_name, 'multi', 'rule name');
  assertEq(r.matched_rule.priority, 5, 'rule priority');
  assertEq(r.is_multi_agent, true, 'multi');
}

// previewRoute with no rule → matched_rule null
reset();
routes.push({ match: /FROM agent_routing_rules/, rows: [] });
routes.push({
  match: /WHERE status = 'active'/,
  rows: [{ id: 'd1', name: 'D', provider: 'anthropic', capabilities: null, config: null }],
});
{
  const r = await previewRoute('x', 'y');
  assertEq(r.matched_rule, null, 'no rule → null');
  assertEq(r.is_multi_agent, false, 'default is not multi');
}

// ============================================================================
// listRules
// ============================================================================
console.log('\n── listRules ─────────────────────────────────────────────');

// No filter
reset();
routes.push({
  match: /FROM agent_routing_rules/,
  rows: [
    { id: 'r1', rule_name: 'a', comparison_agent_ids: null },
    { id: 'r2', rule_name: 'b', comparison_agent_ids: '["x"]' },
  ],
});
{
  const r = await listRules();
  assertEq(r.length, 2, '2 rules');
  assertEq(r[0].comparison_agent_ids, [], 'r1 empty (null → [])');
  assertEq(r[1].comparison_agent_ids, ['x'], 'r2 parsed');
  assert(/WHERE 1=1/.test(queryLog[0].sql), 'WHERE 1=1');
  assert(/ORDER BY r\.priority ASC/.test(queryLog[0].sql), 'ORDER BY priority');
  assertEq(queryLog[0].params, [], 'no params');
}

// active filter (true)
reset();
routes.push({ match: /FROM agent_routing_rules/, rows: [] });
{
  await listRules({ active: true });
  assert(/r\.active = \?/.test(queryLog[0].sql), 'active clause');
  assertEq(queryLog[0].params, [1], 'active = 1');
}

// active filter (false)
reset();
routes.push({ match: /FROM agent_routing_rules/, rows: [] });
{
  await listRules({ active: false });
  assertEq(queryLog[0].params, [0], 'active = 0');
}

// component filter
reset();
routes.push({ match: /FROM agent_routing_rules/, rows: [] });
{
  await listRules({ component: 'frontend' });
  assert(/r\.component = \?/.test(queryLog[0].sql), 'component clause');
  assertEq(queryLog[0].params, ['frontend'], 'component param');
}

// combined
reset();
routes.push({ match: /FROM agent_routing_rules/, rows: [] });
{
  await listRules({ active: true, component: 'backend' });
  assertEq(queryLog[0].params, [1, 'backend'], 'combined params');
}

// ============================================================================
// createRule — validation
// ============================================================================
console.log('\n── createRule: validation ────────────────────────────────');

// missing rule_name
{
  let caught: any = null;
  try { await createRule({ agent_id: 'a1' }); }
  catch (e) { caught = e; }
  assert(caught && /required/.test(caught.message), 'missing rule_name throws');
}

// missing agent_id
{
  let caught: any = null;
  try { await createRule({ rule_name: 'r' }); }
  catch (e) { caught = e; }
  assert(caught && /required/.test(caught.message), 'missing agent_id throws');
}

// invalid prompt_type
reset();
agentsById['a1'] = { id: 'a1', name: 'A' };
{
  let caught: any = null;
  try { await createRule({ rule_name: 'r', agent_id: 'a1', prompt_type: 'bogus' }); }
  catch (e) { caught = e; }
  assert(caught && /Invalid prompt_type/.test(caught.message), 'invalid type throws');
  assert(caught && caught.message.includes('plan'), 'lists valid types');
}

// agent not found
reset();
{
  let caught: any = null;
  try { await createRule({ rule_name: 'r', agent_id: 'missing' }); }
  catch (e) { caught = e; }
  assert(caught && /Agent not found/.test(caught.message), 'agent not found throws');
}

// comparison agent not found
reset();
agentsById['a1'] = { id: 'a1', name: 'A' };
{
  let caught: any = null;
  try {
    await createRule({
      rule_name: 'r', agent_id: 'a1',
      is_multi_agent: true, comparison_agent_ids: ['a1', 'missing'],
    });
  } catch (e) { caught = e; }
  assert(caught && /Comparison agent not found/.test(caught.message), 'comp agent not found');
}

// ============================================================================
// createRule — happy path
// ============================================================================
console.log('\n── createRule: happy path ────────────────────────────────');

reset();
agentsById['a1'] = { id: 'a1', name: 'A' };
agentsById['a2'] = { id: 'a2', name: 'B' };
routes.push({ match: /INSERT INTO agent_routing_rules/, rows: {} });
{
  const r = await createRule({
    rule_name: 'my-rule',
    component: 'backend',
    prompt_type: 'implementation',
    agent_id: 'a1',
    priority: 15,
    is_multi_agent: true,
    comparison_agent_ids: ['a2'],
  });
  assertEq(r, { rule_id: 'gen-uuid-xyz' }, 'returns rule_id');
  const insert = queryLog.find(q => /INSERT INTO/.test(q.sql))!;
  assert(insert !== undefined, 'INSERT called');
  const p = insert.params;
  assertEq(p[0], 'gen-uuid-xyz', 'id');
  assertEq(p[1], 'my-rule', 'rule_name');
  assertEq(p[2], 'backend', 'component');
  assertEq(p[3], 'implementation', 'prompt_type');
  assertEq(p[4], 'a1', 'agent_id');
  assertEq(p[5], 15, 'priority');
  assertEq(p[6], 1, 'is_multi_agent = 1');
  assertEq(p[7], JSON.stringify(['a2']), 'comparison_agent_ids JSON');
}

// Defaults: component/prompt_type null, priority 50, is_multi_agent 0
reset();
agentsById['a1'] = { id: 'a1', name: 'A' };
routes.push({ match: /INSERT INTO agent_routing_rules/, rows: {} });
{
  await createRule({ rule_name: 'r', agent_id: 'a1' });
  const insert = queryLog.find(q => /INSERT INTO/.test(q.sql))!;
  const p = insert.params;
  assertEq(p[2], null, 'default component null');
  assertEq(p[3], null, 'default prompt_type null');
  assertEq(p[5], 50, 'default priority 50');
  assertEq(p[6], 0, 'default is_multi_agent 0');
  assertEq(p[7], null, 'default comparison_agent_ids null');
}

// ============================================================================
// updateRule
// ============================================================================
console.log('\n── updateRule ────────────────────────────────────────────');

// Partial update — note: params order follows `allowed` array, not input order
// allowed = ['rule_name','component','prompt_type','agent_id','priority','is_multi_agent','comparison_agent_ids','active']
reset();
routes.push({ match: /UPDATE agent_routing_rules/, rows: { affectedRows: 1 } });
{
  const r = await updateRule('rule-1', {
    rule_name: 'renamed',
    is_multi_agent: true,
    active: false,
    comparison_agent_ids: ['x', 'y'],
  });
  assertEq(r, { success: true }, 'returns success');
  const sql = queryLog[0].sql;
  assert(/rule_name = \?/.test(sql), 'rule_name SET');
  assert(/is_multi_agent = \?/.test(sql), 'is_multi_agent SET');
  assert(/comparison_agent_ids = \?/.test(sql), 'comparison_agent_ids SET');
  assert(/active = \?/.test(sql), 'active SET');
  // Order per allowed: rule_name, is_multi_agent, comparison_agent_ids, active
  const p = queryLog[0].params;
  assertEq(p[0], 'renamed', 'rule_name first');
  assertEq(p[1], 1, 'is_multi_agent = 1 (coerced)');
  assertEq(p[2], JSON.stringify(['x', 'y']), 'comparison_agent_ids JSON');
  assertEq(p[3], 0, 'active = 0 (coerced)');
  assertEq(p[4], 'rule-1', 'id last');
}

// comparison_agent_ids = null → null (not JSON.stringify)
reset();
routes.push({ match: /UPDATE agent_routing_rules/, rows: { affectedRows: 1 } });
{
  await updateRule('rule-1', { comparison_agent_ids: null });
  const p = queryLog[0].params;
  assertEq(p[0], null, 'null stays null (not stringified)');
}

// component + prompt_type + agent_id + priority (order by `allowed`)
reset();
routes.push({ match: /UPDATE agent_routing_rules/, rows: { affectedRows: 1 } });
{
  await updateRule('rule-1', {
    priority: 99,
    component: 'frontend',
    agent_id: 'new-agent',
    prompt_type: 'docs',
  });
  // allowed order: rule_name, component, prompt_type, agent_id, priority, ...
  const p = queryLog[0].params;
  assertEq(p[0], 'frontend', 'component first among provided');
  assertEq(p[1], 'docs', 'prompt_type second');
  assertEq(p[2], 'new-agent', 'agent_id third');
  assertEq(p[3], 99, 'priority fourth');
  assertEq(p[4], 'rule-1', 'id last');
}

// Unknown field skipped
reset();
routes.push({ match: /UPDATE agent_routing_rules/, rows: { affectedRows: 1 } });
{
  await updateRule('rule-1', { rule_name: 'x', unknown: 'y' });
  const sql = queryLog[0].sql;
  assert(!/unknown/.test(sql), 'unknown skipped');
  assertEq(queryLog[0].params, ['x', 'rule-1'], 'only rule_name + id');
}

// No valid fields
{
  let caught: any = null;
  try { await updateRule('r', {}); }
  catch (e) { caught = e; }
  assert(caught && /No valid fields/.test(caught.message), 'empty throws');
}

// Unknown-only
{
  let caught: any = null;
  try { await updateRule('r', { bogus: 1 }); }
  catch (e) { caught = e; }
  assert(caught && /No valid fields/.test(caught.message), 'unknown-only throws');
}

// Not found
reset();
routes.push({ match: /UPDATE agent_routing_rules/, rows: { affectedRows: 0 } });
{
  let caught: any = null;
  try { await updateRule('missing', { rule_name: 'x' }); }
  catch (e) { caught = e; }
  assert(caught && /not found/.test(caught.message), '0 affected → Rule not found');
}

// ============================================================================
// deleteRule
// ============================================================================
console.log('\n── deleteRule ────────────────────────────────────────────');

reset();
routes.push({ match: /DELETE FROM agent_routing_rules/, rows: { affectedRows: 1 } });
{
  const r = await deleteRule('rule-1');
  assertEq(r, { success: true }, 'success');
  assertEq(queryLog[0].params, ['rule-1'], 'id param');
}

reset();
routes.push({ match: /DELETE FROM agent_routing_rules/, rows: { affectedRows: 0 } });
{
  let caught: any = null;
  try { await deleteRule('missing'); }
  catch (e) { caught = e; }
  assert(caught && /not found/.test(caught.message), '0 affected → Rule not found');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main()

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
