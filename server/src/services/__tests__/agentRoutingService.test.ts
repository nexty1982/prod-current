#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRoutingService.js (OMD-1172)
 *
 * Deterministic agent routing: given component/promptType, pick the best
 * agent based on active routing rules + fallback default.
 *
 * External deps stubbed via require.cache:
 *   - ../config/db (getAppPool)
 *   - ./agentRegistryService (getAgent)
 *   - uuid (v4)
 *
 * Coverage:
 *   - VALID_PROMPT_TYPES constant
 *   - resolveAgent:
 *       · exact match (both component AND prompt_type)
 *       · component-only match (rule has null prompt_type)
 *       · type-only match (rule has null component)
 *       · catch-all (both null)
 *       · priority ordering (first-match-wins at DB level)
 *       · multi-agent mode with comparison agents
 *       · multi-agent mode where comparison agents are inactive
 *       · no rule matches → system default
 *       · no rules + no active agents → throws
 *   - previewRoute: returns compact structure
 *   - listRules: no filters, active filter, component filter, combined
 *   - createRule: validation (missing fields, invalid prompt_type, unknown
 *     agent, unknown comparison agent), happy path, default priority/flags
 *   - updateRule: no fields, affectedRows=0, whitelist, JSON/boolean coercion
 *   - deleteRule: not found, happy path
 *   - _parseJSON (indirectly via comparison_agent_ids parsing)
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

// ── Fake DB pool with route-based dispatch ───────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

// Scriptable responses
let rulesRows: any[] = [];
let defaultsRows: any[] = [];
let listRulesRows: any[] = [];
let insertResult: any = { affectedRows: 1 };
let updateAffectedRows = 1;
let deleteAffectedRows = 1;
let queryThrowsOnPattern: RegExp | null = null;

const fakeAppPool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });

    if (queryThrowsOnPattern && queryThrowsOnPattern.test(sql)) {
      throw new Error('fake db failure');
    }

    // resolveAgent: SELECT rules (detected by WHERE r.active = 1)
    if (/FROM agent_routing_rules r[\s\S]*JOIN agent_registry a[\s\S]*r\.active = 1/i.test(sql)) {
      return [rulesRows];
    }

    // resolveAgent fallback: SELECT * FROM agent_registry WHERE status = 'active' ORDER BY default_priority
    if (/FROM agent_registry WHERE status = 'active'[\s\S]*default_priority/i.test(sql)) {
      return [defaultsRows];
    }

    // listRules: similar JOIN query but without the active = 1 guard (uses where clause with 1=1)
    if (/FROM agent_routing_rules r[\s\S]*JOIN agent_registry a/i.test(sql)) {
      return [listRulesRows];
    }

    if (/^\s*INSERT INTO agent_routing_rules/i.test(sql)) {
      return [insertResult];
    }

    if (/^\s*UPDATE agent_routing_rules/i.test(sql)) {
      return [{ affectedRows: updateAffectedRows }];
    }

    if (/^\s*DELETE FROM agent_routing_rules/i.test(sql)) {
      return [{ affectedRows: deleteAffectedRows }];
    }

    return [[]];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakeAppPool },
} as any;

// ── Fake agentRegistryService ────────────────────────────────────────
const agentStore: Record<string, any> = {};
let getAgentCalls: string[] = [];

const agentRegistryStub = {
  getAgent: async (id: string) => {
    getAgentCalls.push(id);
    return agentStore[id] || null;
  },
};

const agentRegistryPath = require.resolve('../agentRegistryService');
require.cache[agentRegistryPath] = {
  id: agentRegistryPath,
  filename: agentRegistryPath,
  loaded: true,
  exports: agentRegistryStub,
} as any;

// ── Fake uuid ────────────────────────────────────────────────────────
let nextUuid = 'rule-uuid-0001';
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: { v4: () => nextUuid },
} as any;

function resetState() {
  queryLog.length = 0;
  rulesRows = [];
  defaultsRows = [];
  listRulesRows = [];
  insertResult = { affectedRows: 1 };
  updateAffectedRows = 1;
  deleteAffectedRows = 1;
  queryThrowsOnPattern = null;
  getAgentCalls = [];
  for (const key in agentStore) delete agentStore[key];
  nextUuid = 'rule-uuid-0001';
}

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
  'constant list'
);

// ============================================================================
// resolveAgent: exact match
// ============================================================================
console.log('\n── resolveAgent: exact match ─────────────────────────────');

resetState();
agentStore['agent-a'] = { id: 'agent-a', name: 'A', provider: 'anthropic', status: 'active' };
rulesRows = [{
  id: 'rule-1',
  rule_name: 'exact match',
  component: 'backend',
  prompt_type: 'implementation',
  agent_id: 'agent-a',
  priority: 10,
  is_multi_agent: 0,
  comparison_agent_ids: null,
  active: 1,
  agent_name: 'A',
  agent_status: 'active',
}];
{
  const r = await resolveAgent('backend', 'implementation');
  assertEq(r.primary_agent.id, 'agent-a', 'picks agent-a');
  assertEq(r.comparison_agents, [], 'no comparison');
  assertEq(r.is_multi_agent, false, 'not multi');
  assert(r.rule !== null, 'rule present');
  assertEq(r.rule.id, 'rule-1', 'rule id');
  assertEq(r.rule.rule_name, 'exact match', 'rule name');
  // DB query should only run once
  assertEq(queryLog.length, 1, '1 query');
}

// ============================================================================
// resolveAgent: component-only match (rule has null prompt_type)
// ============================================================================
console.log('\n── resolveAgent: component-only match ────────────────────');

resetState();
agentStore['agent-b'] = { id: 'agent-b', name: 'B', provider: 'openai', status: 'active' };
rulesRows = [{
  id: 'rule-2',
  rule_name: 'backend catch-all',
  component: 'backend',
  prompt_type: null,
  agent_id: 'agent-b',
  priority: 50,
  is_multi_agent: 0,
  comparison_agent_ids: null,
  active: 1,
}];
{
  const r = await resolveAgent('backend', 'docs');
  assertEq(r.primary_agent.id, 'agent-b', 'matches component-only rule');
}

// ============================================================================
// resolveAgent: type-only match (rule has null component)
// ============================================================================
console.log('\n── resolveAgent: type-only match ─────────────────────────');

resetState();
agentStore['agent-c'] = { id: 'agent-c', name: 'C', provider: 'google', status: 'active' };
rulesRows = [{
  id: 'rule-3',
  rule_name: 'verification-everywhere',
  component: null,
  prompt_type: 'verification',
  agent_id: 'agent-c',
  priority: 50,
  is_multi_agent: 0,
  comparison_agent_ids: null,
}];
{
  const r = await resolveAgent('frontend', 'verification');
  assertEq(r.primary_agent.id, 'agent-c', 'matches type-only rule');
}

// ============================================================================
// resolveAgent: catch-all (both null)
// ============================================================================
console.log('\n── resolveAgent: catch-all ───────────────────────────────');

resetState();
agentStore['agent-d'] = { id: 'agent-d', name: 'D', provider: 'anthropic', status: 'active' };
rulesRows = [{
  id: 'rule-4',
  rule_name: 'catch all',
  component: null,
  prompt_type: null,
  agent_id: 'agent-d',
  priority: 999,
  is_multi_agent: 0,
  comparison_agent_ids: null,
}];
{
  const r = await resolveAgent('anything', 'anything');
  assertEq(r.primary_agent.id, 'agent-d', 'catch-all matches');
}

// ============================================================================
// resolveAgent: priority order — first matching rule wins
// ============================================================================
console.log('\n── resolveAgent: priority order ──────────────────────────');

resetState();
agentStore['high-pri'] = { id: 'high-pri', name: 'High', provider: 'anthropic', status: 'active' };
agentStore['low-pri'] = { id: 'low-pri', name: 'Low', provider: 'openai', status: 'active' };
// SQL already ORDERs BY priority ASC, so the fake returns in priority order.
rulesRows = [
  {
    id: 'rule-high',
    rule_name: 'high pri catch-all',
    component: null,
    prompt_type: null,
    agent_id: 'high-pri',
    priority: 1,
    is_multi_agent: 0,
    comparison_agent_ids: null,
  },
  {
    id: 'rule-low',
    rule_name: 'exact but lower pri',
    component: 'backend',
    prompt_type: 'implementation',
    agent_id: 'low-pri',
    priority: 100,
    is_multi_agent: 0,
    comparison_agent_ids: null,
  },
];
{
  // Even though rule-low is more specific, rule-high comes first
  const r = await resolveAgent('backend', 'implementation');
  assertEq(r.primary_agent.id, 'high-pri', 'first-match-wins regardless of specificity');
}

// ============================================================================
// resolveAgent: multi-agent mode
// ============================================================================
console.log('\n── resolveAgent: multi-agent ─────────────────────────────');

resetState();
agentStore['primary'] = { id: 'primary', name: 'P', provider: 'anthropic', status: 'active' };
agentStore['comp-1'] = { id: 'comp-1', name: 'C1', provider: 'openai', status: 'active' };
agentStore['comp-2'] = { id: 'comp-2', name: 'C2', provider: 'google', status: 'active' };
rulesRows = [{
  id: 'rule-multi',
  rule_name: 'multi',
  component: null,
  prompt_type: null,
  agent_id: 'primary',
  priority: 10,
  is_multi_agent: 1,
  comparison_agent_ids: JSON.stringify(['comp-1', 'comp-2']),
}];
{
  const r = await resolveAgent('x', 'plan');
  assertEq(r.primary_agent.id, 'primary', 'primary');
  assertEq(r.comparison_agents.length, 2, '2 comparison');
  assertEq(r.comparison_agents[0].id, 'comp-1', 'comp-1');
  assertEq(r.comparison_agents[1].id, 'comp-2', 'comp-2');
  assertEq(r.is_multi_agent, true, 'is_multi_agent true');
}

// Multi-agent where one comparison agent is inactive → filtered out
resetState();
agentStore['primary'] = { id: 'primary', name: 'P', provider: 'anthropic', status: 'active' };
agentStore['comp-active'] = { id: 'comp-active', name: 'A', provider: 'openai', status: 'active' };
agentStore['comp-inactive'] = { id: 'comp-inactive', name: 'I', provider: 'google', status: 'inactive' };
rulesRows = [{
  id: 'rule-multi',
  rule_name: 'multi',
  component: null,
  prompt_type: null,
  agent_id: 'primary',
  priority: 10,
  is_multi_agent: 1,
  comparison_agent_ids: JSON.stringify(['comp-active', 'comp-inactive']),
}];
{
  const r = await resolveAgent('x', 'plan');
  assertEq(r.comparison_agents.length, 1, 'inactive filtered out');
  assertEq(r.comparison_agents[0].id, 'comp-active', 'only active');
}

// Multi-agent with invalid JSON for comparison_agent_ids
resetState();
agentStore['primary'] = { id: 'primary', status: 'active' };
rulesRows = [{
  id: 'rule-bad-json',
  rule_name: 'bad json',
  component: null,
  prompt_type: null,
  agent_id: 'primary',
  priority: 10,
  is_multi_agent: 1,
  comparison_agent_ids: '{invalid json',
}];
{
  const r = await resolveAgent('x', 'plan');
  assertEq(r.comparison_agents, [], 'bad JSON → empty');
  assertEq(r.is_multi_agent, false, 'no comps → not multi');
}

// ============================================================================
// resolveAgent: no rule matches → fallback to default
// ============================================================================
console.log('\n── resolveAgent: fallback default ────────────────────────');

resetState();
// No rules returned from DB
rulesRows = [];
defaultsRows = [{
  id: 'default-agent',
  name: 'Default',
  provider: 'anthropic',
  model_id: 'claude-3',
  status: 'active',
  default_priority: 10,
  capabilities: JSON.stringify(['plan', 'implementation']),
  config: JSON.stringify({ temp: 0.7 }),
}];
{
  const r = await resolveAgent('unknown', 'unknown');
  assertEq(r.primary_agent.id, 'default-agent', 'default agent used');
  assertEq(r.rule, null, 'no rule');
  assertEq(r.is_multi_agent, false, 'not multi');
  assertEq(r.comparison_agents, [], 'no comparison');
  // Capabilities and config parsed
  assertEq(r.primary_agent.capabilities, ['plan', 'implementation'], 'capabilities parsed');
  assertEq(r.primary_agent.config, { temp: 0.7 }, 'config parsed');
  // 2 queries: rules fetch + defaults fetch
  assertEq(queryLog.length, 2, '2 queries');
}

// Default agent with null JSON fields
resetState();
rulesRows = [];
defaultsRows = [{
  id: 'default-null',
  name: 'DN',
  provider: 'openai',
  status: 'active',
  capabilities: null,
  config: null,
}];
{
  const r = await resolveAgent('x', 'y');
  assertEq(r.primary_agent.capabilities, [], 'null capabilities → []');
  assertEq(r.primary_agent.config, null, 'null config → null');
}

// No rules AND no default agents → throws
resetState();
rulesRows = [];
defaultsRows = [];
{
  let caught: Error | null = null;
  try {
    await resolveAgent('x', 'y');
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'throws when no agents');
  assert(caught !== null && caught.message.includes('No active agents'), 'error message');
}

// ============================================================================
// previewRoute
// ============================================================================
console.log('\n── previewRoute ──────────────────────────────────────────');

resetState();
agentStore['a1'] = { id: 'a1', name: 'A1', provider: 'anthropic', status: 'active' };
agentStore['a2'] = { id: 'a2', name: 'A2', provider: 'openai', status: 'active' };
rulesRows = [{
  id: 'r',
  rule_name: 'test rule',
  component: 'backend',
  prompt_type: 'plan',
  agent_id: 'a1',
  priority: 5,
  is_multi_agent: 1,
  comparison_agent_ids: JSON.stringify(['a2']),
}];
{
  const p = await previewRoute('backend', 'plan');
  assertEq(p.component, 'backend', 'component echoed');
  assertEq(p.prompt_type, 'plan', 'prompt_type echoed');
  assertEq(p.primary_agent.id, 'a1', 'primary id');
  assertEq(p.primary_agent.name, 'A1', 'primary name');
  assertEq(p.primary_agent.provider, 'anthropic', 'primary provider');
  assertEq(p.comparison_agents.length, 1, '1 comparison');
  assertEq(p.comparison_agents[0].id, 'a2', 'comparison id');
  assertEq(p.matched_rule.id, 'r', 'matched rule id');
  assertEq(p.matched_rule.rule_name, 'test rule', 'matched rule name');
  assertEq(p.matched_rule.priority, 5, 'priority');
  assertEq(p.is_multi_agent, true, 'is_multi_agent');
}

// Preview fallback → matched_rule null
resetState();
rulesRows = [];
defaultsRows = [{ id: 'def', name: 'Def', provider: 'anthropic', status: 'active', capabilities: null, config: null }];
{
  const p = await previewRoute('x', 'y');
  assertEq(p.matched_rule, null, 'no matched rule');
  assertEq(p.primary_agent.id, 'def', 'default primary');
}

// ============================================================================
// listRules
// ============================================================================
console.log('\n── listRules ─────────────────────────────────────────────');

resetState();
listRulesRows = [
  { id: 'r1', rule_name: 'a', component: null, prompt_type: null, agent_id: 'agent-1', agent_name: 'A', agent_provider: 'anthropic', priority: 10, is_multi_agent: 0, comparison_agent_ids: null, active: 1 },
  { id: 'r2', rule_name: 'b', component: 'backend', prompt_type: 'plan', agent_id: 'agent-2', agent_name: 'B', agent_provider: 'openai', priority: 20, is_multi_agent: 1, comparison_agent_ids: JSON.stringify(['agent-1']), active: 1 },
];

// No filters
{
  const r = await listRules();
  assertEq(r.length, 2, '2 rules');
  assertEq(r[0].id, 'r1', 'first');
  assertEq(r[1].id, 'r2', 'second');
  assertEq(r[1].comparison_agent_ids, ['agent-1'], 'comparison_agent_ids parsed');
  // Verify SQL has default 1=1 WHERE
  assert(/WHERE 1=1/.test(queryLog[0].sql), 'default WHERE 1=1');
  assertEq(queryLog[0].params, [], 'no params');
}

// active filter
resetState();
listRulesRows = [];
{
  await listRules({ active: true });
  assert(/r\.active = \?/.test(queryLog[0].sql), 'active in WHERE');
  assertEq(queryLog[0].params, [1], 'active 1');
}

resetState();
listRulesRows = [];
{
  await listRules({ active: false });
  assertEq(queryLog[0].params, [0], 'active 0');
}

// component filter
resetState();
listRulesRows = [];
{
  await listRules({ component: 'backend' });
  assert(/r\.component = \?/.test(queryLog[0].sql), 'component in WHERE');
  assertEq(queryLog[0].params, ['backend'], 'component param');
}

// combined
resetState();
listRulesRows = [];
{
  await listRules({ active: true, component: 'frontend' });
  assertEq(queryLog[0].params, [1, 'frontend'], 'both params');
}

// ============================================================================
// createRule: validation
// ============================================================================
console.log('\n── createRule: validation ────────────────────────────────');

resetState();
{
  let caught: Error | null = null;
  try {
    await createRule({ rule_name: 'x' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'missing agent_id throws');
  assert(caught !== null && caught.message.includes('required'), 'error mentions required');
}

resetState();
{
  let caught: Error | null = null;
  try {
    await createRule({ agent_id: 'x' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'missing rule_name throws');
}

resetState();
{
  let caught: Error | null = null;
  try {
    await createRule({ rule_name: 'x', agent_id: 'x', prompt_type: 'bogus' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid prompt_type throws');
  assert(
    caught !== null && caught.message.includes('Invalid prompt_type'),
    'error message'
  );
}

// Agent not found
resetState();
{
  let caught: Error | null = null;
  try {
    await createRule({ rule_name: 'x', agent_id: 'missing' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'missing agent throws');
  assert(caught !== null && caught.message.includes('Agent not found'), 'error message');
}

// Comparison agent not found
resetState();
agentStore['primary'] = { id: 'primary', status: 'active' };
{
  let caught: Error | null = null;
  try {
    await createRule({
      rule_name: 'multi',
      agent_id: 'primary',
      is_multi_agent: true,
      comparison_agent_ids: ['missing-comp'],
    });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'missing comparison agent throws');
  assert(
    caught !== null && caught.message.includes('Comparison agent not found'),
    'error message'
  );
}

// ============================================================================
// createRule: happy path (defaults)
// ============================================================================
console.log('\n── createRule: happy path ────────────────────────────────');

resetState();
agentStore['a1'] = { id: 'a1', status: 'active' };
nextUuid = 'new-rule-uuid';
{
  const r = await createRule({ rule_name: 'r', agent_id: 'a1' });
  assertEq(r.rule_id, 'new-rule-uuid', 'returns uuid');
  assert(/INSERT INTO agent_routing_rules/.test(queryLog[0].sql), 'INSERT SQL');
  const params = queryLog[0].params;
  assertEq(params[0], 'new-rule-uuid', 'id');
  assertEq(params[1], 'r', 'rule_name');
  assertEq(params[2], null, 'component default null');
  assertEq(params[3], null, 'prompt_type default null');
  assertEq(params[4], 'a1', 'agent_id');
  assertEq(params[5], 50, 'default priority 50');
  assertEq(params[6], 0, 'is_multi_agent default 0');
  assertEq(params[7], null, 'comparison_agent_ids default null');
}

// createRule: full options
resetState();
agentStore['a1'] = { id: 'a1', status: 'active' };
agentStore['a2'] = { id: 'a2', status: 'active' };
{
  await createRule({
    rule_name: 'full',
    component: 'backend',
    prompt_type: 'plan',
    agent_id: 'a1',
    priority: 5,
    is_multi_agent: true,
    comparison_agent_ids: ['a2'],
  });
  const params = queryLog[queryLog.length - 1].params;
  assertEq(params[2], 'backend', 'component');
  assertEq(params[3], 'plan', 'prompt_type');
  assertEq(params[5], 5, 'priority');
  assertEq(params[6], 1, 'is_multi_agent 1');
  assertEq(params[7], JSON.stringify(['a2']), 'JSON serialized comps');
}

// Each valid prompt_type accepted
for (const t of ['plan', 'implementation', 'verification', 'correction', 'migration', 'docs']) {
  resetState();
  agentStore['a1'] = { id: 'a1', status: 'active' };
  await createRule({ rule_name: `t-${t}`, agent_id: 'a1', prompt_type: t });
  assert(true, `prompt_type ${t} accepted`);
}

// ============================================================================
// updateRule
// ============================================================================
console.log('\n── updateRule ────────────────────────────────────────────');

resetState();
{
  let caught: Error | null = null;
  try {
    await updateRule('r1', {});
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'no valid fields throws');
  assert(caught !== null && caught.message.includes('No valid fields'), 'error message');
}

// Not found
resetState();
updateAffectedRows = 0;
{
  let caught: Error | null = null;
  try {
    await updateRule('r1', { rule_name: 'x' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'not found throws');
  assert(caught !== null && caught.message.includes('Rule not found'), 'error message');
}

// Happy path — whitelist + coercion
resetState();
{
  const r = await updateRule('r1', {
    rule_name: 'new',
    component: 'frontend',
    prompt_type: 'plan',
    agent_id: 'new-agent',
    priority: 99,
    is_multi_agent: true,
    comparison_agent_ids: ['a', 'b'],
    active: false,
    evil: 'should be ignored',
  });
  assertEq(r.success, true, 'success');
  assert(/UPDATE agent_routing_rules SET/.test(queryLog[0].sql), 'UPDATE SQL');
  assert(/rule_name = \?/.test(queryLog[0].sql), 'rule_name in SET');
  assert(/component = \?/.test(queryLog[0].sql), 'component in SET');
  assert(!/evil/.test(queryLog[0].sql), 'evil key excluded');
  const params = queryLog[0].params;
  // Last param is the id
  assertEq(params[params.length - 1], 'r1', 'id at end');
  // is_multi_agent and active coerced to 0/1
  assert(params.includes(1), 'is_multi_agent coerced to 1');
  assert(params.includes(0), 'active coerced to 0');
  assert(params.includes(JSON.stringify(['a', 'b'])), 'comparison_agent_ids serialized');
}

// Single field update works
resetState();
{
  await updateRule('r1', { priority: 10 });
  assert(/priority = \?/.test(queryLog[0].sql), 'single field');
  assertEq(queryLog[0].params, [10, 'r1'], 'single param + id');
}

// comparison_agent_ids=null → passes null
resetState();
{
  await updateRule('r1', { comparison_agent_ids: null });
  const params = queryLog[0].params;
  assertEq(params[0], null, 'null comparison_agent_ids');
}

// ============================================================================
// deleteRule
// ============================================================================
console.log('\n── deleteRule ────────────────────────────────────────────');

resetState();
deleteAffectedRows = 0;
{
  let caught: Error | null = null;
  try {
    await deleteRule('r1');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'not found throws');
  assert(caught !== null && caught.message.includes('Rule not found'), 'error message');
}

resetState();
deleteAffectedRows = 1;
{
  const r = await deleteRule('r1');
  assertEq(r.success, true, 'success');
  assert(/DELETE FROM agent_routing_rules WHERE id = \?/.test(queryLog[0].sql), 'DELETE SQL');
  assertEq(queryLog[0].params, ['r1'], 'id param');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
