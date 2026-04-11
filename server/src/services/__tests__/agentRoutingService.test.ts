#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRoutingService.js (OMD-1191)
 *
 * Deterministic routing layer: given (component, prompt_type), resolve
 * which agent(s) execute a prompt. Rules evaluated in priority order.
 *
 * External deps stubbed via require.cache:
 *   - ../config/db      → fake pool (absolute path to avoid env validation)
 *   - ./agentRegistryService → { getAgent: id => fake }
 *   - uuid              → { v4: () => deterministic id }
 *
 * Coverage:
 *   - VALID_PROMPT_TYPES export
 *   - resolveAgent:
 *       · exact match (component + type)
 *       · component-only match
 *       · type-only match
 *       · catch-all
 *       · first-match-wins ordering
 *       · multi-agent resolution (loads comparison agents)
 *       · multi-agent with inactive comparison agent filtered
 *       · is_multi_agent flag false when comparison list empty
 *       · fallback to system default (lowest default_priority)
 *       · throws when no agents exist
 *   - previewRoute: picks only id/name/provider fields
 *   - listRules: plain, with filters (active, component), _parseRule
 *   - createRule:
 *       · throws on missing rule_name/agent_id
 *       · throws on invalid prompt_type
 *       · throws if agent not found
 *       · throws if comparison agent not found (when multi-agent)
 *       · happy path: insert SQL + generated uuid
 *       · null component/prompt_type preserved
 *       · default priority 50
 *   - updateRule:
 *       · throws when no valid fields
 *       · builds dynamic SET clause
 *       · handles comparison_agent_ids JSON and booleans (is_multi_agent/active)
 *       · throws "Rule not found" when affectedRows=0
 *   - deleteRule: happy path + not-found
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

// ── db stub ──────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

// Scriptable responses
let rulesRows: any[] = [];
let defaultAgentRows: any[] = [];
let listRulesRows: any[] = [];
let updateAffectedRows = 1;
let deleteAffectedRows = 1;
let insertShouldThrow = false;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });

    // SELECT active rules (ordered by priority) for resolveAgent
    if (/FROM agent_routing_rules r/.test(sql) && /r\.active = 1/.test(sql) && !/a\.provider/.test(sql)) {
      return [rulesRows];
    }
    // SELECT default agent for fallback
    if (/FROM agent_registry WHERE status = 'active' ORDER BY default_priority/.test(sql)) {
      return [defaultAgentRows];
    }
    // listRules
    if (/FROM agent_routing_rules r/.test(sql) && /a\.provider as agent_provider/.test(sql)) {
      return [listRulesRows];
    }
    // INSERT
    if (/^INSERT INTO agent_routing_rules/.test(sql.trim())) {
      if (insertShouldThrow) throw new Error('insert failed');
      return [{ insertId: 0 }];
    }
    // UPDATE
    if (/^UPDATE agent_routing_rules/.test(sql.trim())) {
      return [{ affectedRows: updateAffectedRows }];
    }
    // DELETE
    if (/^DELETE FROM agent_routing_rules/.test(sql.trim())) {
      return [{ affectedRows: deleteAffectedRows }];
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };

// Absolute-path stub to avoid config/db env validation
const nodePath = require('path');
const sutAbs = require.resolve('../agentRoutingService');
const sutDir = nodePath.dirname(sutAbs);
const dbAbs = require.resolve(nodePath.resolve(sutDir, '..', 'config', 'db'));

require.cache[dbAbs] = {
  id: dbAbs,
  filename: dbAbs,
  loaded: true,
  exports: dbStub,
} as any;

// ── agentRegistryService stub ───────────────────────────────────────
let agentRegistryStore: Record<string, any> = {};

const agentRegistryStub = {
  getAgent: async (id: string) => agentRegistryStore[id] || null,
};

const agentRegAbs = require.resolve(nodePath.resolve(sutDir, 'agentRegistryService'));
require.cache[agentRegAbs] = {
  id: agentRegAbs,
  filename: agentRegAbs,
  loaded: true,
  exports: agentRegistryStub,
} as any;

// ── uuid stub (deterministic) ───────────────────────────────────────
let uuidCounter = 0;
const uuidStub = { v4: () => `uuid-${++uuidCounter}` };

const uuidAbs = require.resolve('uuid');
require.cache[uuidAbs] = {
  id: uuidAbs,
  filename: uuidAbs,
  loaded: true,
  exports: uuidStub,
} as any;

function resetState() {
  queryLog.length = 0;
  rulesRows = [];
  defaultAgentRows = [];
  listRulesRows = [];
  updateAffectedRows = 1;
  deleteAffectedRows = 1;
  insertShouldThrow = false;
  agentRegistryStore = {};
  uuidCounter = 0;
}

// ── Require SUT ──────────────────────────────────────────────────────
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
  'valid prompt types'
);

// ============================================================================
// resolveAgent — exact match
// ============================================================================
console.log('\n── resolveAgent: exact match ─────────────────────────────');

resetState();
agentRegistryStore['agent-be'] = { id: 'agent-be', name: 'Backend Agent', status: 'active' };

rulesRows = [
  { id: 'r1', rule_name: 'backend-impl', component: 'backend', prompt_type: 'implementation',
    agent_id: 'agent-be', priority: 10, is_multi_agent: 0, comparison_agent_ids: null },
  { id: 'r2', rule_name: 'catch-all', component: null, prompt_type: null,
    agent_id: 'agent-be', priority: 100, is_multi_agent: 0, comparison_agent_ids: null },
];

{
  const res = await resolveAgent('backend', 'implementation');
  assertEq(res.primary_agent.id, 'agent-be', 'primary agent id');
  assertEq(res.rule.rule_name, 'backend-impl', 'matched rule name');
  assertEq(res.comparison_agents, [], 'no comparison agents');
  assertEq(res.is_multi_agent, false, 'not multi-agent');
}

// ============================================================================
// resolveAgent — component-only match
// ============================================================================
console.log('\n── resolveAgent: component-only ──────────────────────────');

resetState();
agentRegistryStore['agent-fe'] = { id: 'agent-fe', name: 'FE', status: 'active' };
rulesRows = [
  { id: 'r1', rule_name: 'frontend-any', component: 'frontend', prompt_type: null,
    agent_id: 'agent-fe', priority: 20, is_multi_agent: 0, comparison_agent_ids: null },
];

{
  const res = await resolveAgent('frontend', 'docs');
  assertEq(res.rule.rule_name, 'frontend-any', 'component-only match');
}

// ============================================================================
// resolveAgent — type-only match
// ============================================================================
console.log('\n── resolveAgent: type-only ───────────────────────────────');

resetState();
agentRegistryStore['agent-v'] = { id: 'agent-v', name: 'V', status: 'active' };
rulesRows = [
  { id: 'r1', rule_name: 'verify', component: null, prompt_type: 'verification',
    agent_id: 'agent-v', priority: 30, is_multi_agent: 0, comparison_agent_ids: null },
];

{
  const res = await resolveAgent('ocr', 'verification');
  assertEq(res.rule.rule_name, 'verify', 'type-only match');
}

// ============================================================================
// resolveAgent — catch-all
// ============================================================================
console.log('\n── resolveAgent: catch-all ───────────────────────────────');

resetState();
agentRegistryStore['agent-c'] = { id: 'agent-c', name: 'C', status: 'active' };
rulesRows = [
  { id: 'r1', rule_name: 'fallback', component: null, prompt_type: null,
    agent_id: 'agent-c', priority: 999, is_multi_agent: 0, comparison_agent_ids: null },
];

{
  const res = await resolveAgent('whatever', 'whatever');
  assertEq(res.rule.rule_name, 'fallback', 'catch-all matched');
}

// ============================================================================
// resolveAgent — first-match-wins ordering
// ============================================================================
console.log('\n── resolveAgent: first-match wins ────────────────────────');

resetState();
agentRegistryStore['agent-a'] = { id: 'agent-a', name: 'A', status: 'active' };
agentRegistryStore['agent-b'] = { id: 'agent-b', name: 'B', status: 'active' };
// The DB ordering (priority ASC) is simulated by array order
rulesRows = [
  { id: 'r1', rule_name: 'high-prio-catch-all', component: null, prompt_type: null,
    agent_id: 'agent-a', priority: 1, is_multi_agent: 0, comparison_agent_ids: null },
  { id: 'r2', rule_name: 'specific', component: 'backend', prompt_type: 'implementation',
    agent_id: 'agent-b', priority: 50, is_multi_agent: 0, comparison_agent_ids: null },
];

{
  const res = await resolveAgent('backend', 'implementation');
  assertEq(res.primary_agent.id, 'agent-a', 'highest priority wins (first-match)');
  assertEq(res.rule.rule_name, 'high-prio-catch-all', 'first-match rule');
}

// ============================================================================
// resolveAgent — multi-agent (comparison agents loaded)
// ============================================================================
console.log('\n── resolveAgent: multi-agent ─────────────────────────────');

resetState();
agentRegistryStore['primary'] = { id: 'primary', name: 'P', status: 'active' };
agentRegistryStore['cmp1'] = { id: 'cmp1', name: 'C1', status: 'active' };
agentRegistryStore['cmp2'] = { id: 'cmp2', name: 'C2', status: 'active' };
agentRegistryStore['cmp3'] = { id: 'cmp3', name: 'C3', status: 'inactive' };

rulesRows = [
  { id: 'r1', rule_name: 'multi', component: null, prompt_type: null,
    agent_id: 'primary', priority: 1, is_multi_agent: 1,
    comparison_agent_ids: JSON.stringify(['cmp1', 'cmp2', 'cmp3']) },
];

{
  const res = await resolveAgent('x', 'y');
  assertEq(res.primary_agent.id, 'primary', 'primary');
  assertEq(res.comparison_agents.length, 2, '2 active comparison agents (cmp3 filtered)');
  assertEq(res.comparison_agents[0].id, 'cmp1', 'cmp1 first');
  assertEq(res.comparison_agents[1].id, 'cmp2', 'cmp2 second');
  assertEq(res.is_multi_agent, true, 'is_multi_agent true');
}

// Multi-agent flag false when no comparison agents resolved
resetState();
agentRegistryStore['primary'] = { id: 'primary', name: 'P', status: 'active' };
// All comparison agents missing (getAgent → null)
rulesRows = [
  { id: 'r1', rule_name: 'multi-empty', component: null, prompt_type: null,
    agent_id: 'primary', priority: 1, is_multi_agent: 1,
    comparison_agent_ids: JSON.stringify(['ghost1', 'ghost2']) },
];

{
  const res = await resolveAgent('x', 'y');
  assertEq(res.comparison_agents, [], 'no comparison agents (all missing)');
  assertEq(res.is_multi_agent, false, 'is_multi_agent false when list empty');
}

// ============================================================================
// resolveAgent — fallback to system default
// ============================================================================
console.log('\n── resolveAgent: system default fallback ─────────────────');

resetState();
rulesRows = [];
defaultAgentRows = [
  { id: 'default', name: 'Default', provider: 'claude', status: 'active',
    capabilities: JSON.stringify(['plan', 'impl']), config: JSON.stringify({ model: 'opus' }) },
];

{
  const res = await resolveAgent('any', 'any');
  assertEq(res.primary_agent.id, 'default', 'fallback agent id');
  assertEq(res.primary_agent.capabilities, ['plan', 'impl'], 'capabilities parsed');
  assertEq(res.primary_agent.config, { model: 'opus' }, 'config parsed');
  assertEq(res.rule, null, 'rule null on fallback');
  assertEq(res.is_multi_agent, false, 'not multi-agent');
}

// Fallback with malformed JSON → still works
resetState();
rulesRows = [];
defaultAgentRows = [
  { id: 'd', name: 'D', status: 'active', capabilities: 'not-json', config: null },
];
{
  const res = await resolveAgent('a', 'b');
  assertEq(res.primary_agent.capabilities, [], 'malformed capabilities → []');
  assertEq(res.primary_agent.config, null, 'null config → null');
}

// No rules, no default → throws
resetState();
rulesRows = [];
defaultAgentRows = [];
{
  let caught: Error | null = null;
  try { await resolveAgent('x', 'y'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when no agents configured');
  assert(caught !== null && /No active agents/.test(caught.message), 'error mentions agents');
}

// ============================================================================
// previewRoute
// ============================================================================
console.log('\n── previewRoute ──────────────────────────────────────────');

resetState();
agentRegistryStore['p'] = { id: 'p', name: 'Primary', provider: 'claude', status: 'active', extra: 'hidden' };
agentRegistryStore['c1'] = { id: 'c1', name: 'Cmp1', provider: 'gpt', status: 'active' };
rulesRows = [
  { id: 'r1', rule_name: 'rule1', component: 'backend', prompt_type: 'plan',
    agent_id: 'p', priority: 5, is_multi_agent: 1, comparison_agent_ids: JSON.stringify(['c1']) },
];

{
  const preview = await previewRoute('backend', 'plan');
  assertEq(preview.component, 'backend', 'component echoed');
  assertEq(preview.prompt_type, 'plan', 'prompt_type echoed');
  assertEq(preview.primary_agent, { id: 'p', name: 'Primary', provider: 'claude' }, 'primary picks id/name/provider only');
  assertEq(preview.comparison_agents, [{ id: 'c1', name: 'Cmp1', provider: 'gpt' }], 'comparison picks minimal fields');
  assertEq(preview.matched_rule, { id: 'r1', rule_name: 'rule1', priority: 5 }, 'matched_rule minimal');
  assertEq(preview.is_multi_agent, true, 'multi-agent');
}

// previewRoute with fallback → matched_rule null
resetState();
rulesRows = [];
defaultAgentRows = [
  { id: 'def', name: 'Def', provider: 'x', status: 'active', capabilities: null, config: null },
];
{
  const preview = await previewRoute(null, null);
  assertEq(preview.matched_rule, null, 'matched_rule null on fallback');
  assertEq(preview.primary_agent.id, 'def', 'fallback primary');
}

// ============================================================================
// listRules
// ============================================================================
console.log('\n── listRules ─────────────────────────────────────────────');

resetState();
listRulesRows = [
  { id: 'r1', rule_name: 'one', comparison_agent_ids: JSON.stringify(['a', 'b']),
    agent_name: 'Agent', agent_provider: 'claude' },
  { id: 'r2', rule_name: 'two', comparison_agent_ids: null,
    agent_name: 'Agent2', agent_provider: 'gpt' },
];

{
  const rules = await listRules();
  assertEq(rules.length, 2, '2 rules');
  assertEq(rules[0].comparison_agent_ids, ['a', 'b'], 'parsed JSON');
  assertEq(rules[1].comparison_agent_ids, [], 'null → []');
  assertEq(rules[0].agent_name, 'Agent', 'agent_name preserved');
  // No filters → WHERE 1=1 only
  assert(!queryLog[0].sql.includes('r.active = ?'), 'no active filter');
  assert(!queryLog[0].sql.includes('r.component = ?'), 'no component filter');
}

// With filters
resetState();
listRulesRows = [];
await listRules({ active: true, component: 'backend' });
{
  const q = queryLog[0];
  assert(q.sql.includes('r.active = ?'), 'active filter added');
  assert(q.sql.includes('r.component = ?'), 'component filter added');
  assertEq(q.params, [1, 'backend'], 'filter params');
}

// active: false → 0
resetState();
listRulesRows = [];
await listRules({ active: false });
assertEq(queryLog[0].params, [0], 'active: false → 0');

// ============================================================================
// createRule — validation
// ============================================================================
console.log('\n── createRule: validation ────────────────────────────────');

resetState();
{
  let caught: any = null;
  try { await createRule({}); } catch (e) { caught = e; }
  assert(caught && /rule_name and agent_id are required/.test(caught.message), 'throws on missing fields');
}

resetState();
{
  let caught: any = null;
  try { await createRule({ rule_name: 'x', agent_id: 'a', prompt_type: 'BOGUS' }); } catch (e) { caught = e; }
  assert(caught && /Invalid prompt_type/.test(caught.message), 'invalid prompt_type');
}

// Agent not found
resetState();
agentRegistryStore = {};
{
  let caught: any = null;
  try { await createRule({ rule_name: 'x', agent_id: 'ghost' }); } catch (e) { caught = e; }
  assert(caught && /Agent not found: ghost/.test(caught.message), 'agent not found');
}

// Comparison agent not found (multi)
resetState();
agentRegistryStore['real'] = { id: 'real', name: 'R', status: 'active' };
{
  let caught: any = null;
  try {
    await createRule({
      rule_name: 'x', agent_id: 'real', is_multi_agent: true,
      comparison_agent_ids: ['ghost-cmp'],
    });
  } catch (e) { caught = e; }
  assert(caught && /Comparison agent not found: ghost-cmp/.test(caught.message), 'comparison agent not found');
}

// ============================================================================
// createRule — happy path
// ============================================================================
console.log('\n── createRule: happy path ────────────────────────────────');

resetState();
agentRegistryStore['a1'] = { id: 'a1', name: 'A1', status: 'active' };
agentRegistryStore['a2'] = { id: 'a2', name: 'A2', status: 'active' };

{
  const r = await createRule({
    rule_name: 'my-rule',
    component: 'backend',
    prompt_type: 'plan',
    agent_id: 'a1',
    priority: 15,
    is_multi_agent: true,
    comparison_agent_ids: ['a2'],
  });
  assertEq(r.rule_id, 'uuid-1', 'returns generated uuid');
  // Last call should be the INSERT
  const last = queryLog[queryLog.length - 1];
  assert(/INSERT INTO agent_routing_rules/.test(last.sql), 'INSERT query');
  assertEq(last.params[0], 'uuid-1', 'id param');
  assertEq(last.params[1], 'my-rule', 'rule_name');
  assertEq(last.params[2], 'backend', 'component');
  assertEq(last.params[3], 'plan', 'prompt_type');
  assertEq(last.params[4], 'a1', 'agent_id');
  assertEq(last.params[5], 15, 'priority');
  assertEq(last.params[6], 1, 'is_multi_agent = 1');
  assertEq(last.params[7], JSON.stringify(['a2']), 'comparison_agent_ids JSON');
}

// Defaults: null component/type, priority 50, is_multi_agent 0
resetState();
agentRegistryStore['a1'] = { id: 'a1', name: 'A1', status: 'active' };
{
  const r = await createRule({ rule_name: 'min', agent_id: 'a1' });
  assertEq(r.rule_id, 'uuid-1', 'uuid returned');
  const last = queryLog[queryLog.length - 1];
  assertEq(last.params[2], null, 'component null');
  assertEq(last.params[3], null, 'prompt_type null');
  assertEq(last.params[5], 50, 'default priority 50');
  assertEq(last.params[6], 0, 'is_multi_agent 0');
  assertEq(last.params[7], null, 'comparison_agent_ids null');
}

// ============================================================================
// updateRule
// ============================================================================
console.log('\n── updateRule ────────────────────────────────────────────');

resetState();
{
  let caught: any = null;
  try { await updateRule('r1', {}); } catch (e) { caught = e; }
  assert(caught && /No valid fields/.test(caught.message), 'throws on no fields');
}

// Unknown fields ignored
resetState();
{
  let caught: any = null;
  try { await updateRule('r1', { bogus: 1, fake: 2 }); } catch (e) { caught = e; }
  assert(caught && /No valid fields/.test(caught.message), 'unknown fields ignored → throws');
}

// Happy path with mixed types
resetState();
updateAffectedRows = 1;
{
  const r = await updateRule('r1', {
    rule_name: 'renamed',
    is_multi_agent: true,
    active: false,
    comparison_agent_ids: ['x', 'y'],
  });
  assertEq(r, { success: true }, 'success');
  const last = queryLog[queryLog.length - 1];
  assert(/^UPDATE agent_routing_rules SET/.test(last.sql.trim()), 'UPDATE SQL');
  assert(last.sql.includes('rule_name = ?'), 'has rule_name');
  assert(last.sql.includes('is_multi_agent = ?'), 'has is_multi_agent');
  assert(last.sql.includes('active = ?'), 'has active');
  assert(last.sql.includes('comparison_agent_ids = ?'), 'has comparison_agent_ids');
  // Params: [rule_name, is_multi_agent(1), comparison_agent_ids(json), active(0), id]
  assertEq(last.params[0], 'renamed', 'rule_name param');
  assertEq(last.params[1], 1, 'is_multi_agent → 1');
  assertEq(last.params[2], JSON.stringify(['x', 'y']), 'comparison_agent_ids JSON');
  assertEq(last.params[3], 0, 'active → 0');
  assertEq(last.params[4], 'r1', 'id last');
}

// comparison_agent_ids = null
resetState();
updateAffectedRows = 1;
{
  await updateRule('r1', { comparison_agent_ids: null });
  const last = queryLog[queryLog.length - 1];
  assertEq(last.params[0], null, 'comparison_agent_ids null');
}

// Not found
resetState();
updateAffectedRows = 0;
{
  let caught: any = null;
  try { await updateRule('ghost', { rule_name: 'x' }); } catch (e) { caught = e; }
  assert(caught && /Rule not found/.test(caught.message), 'not found');
}

// ============================================================================
// deleteRule
// ============================================================================
console.log('\n── deleteRule ────────────────────────────────────────────');

resetState();
deleteAffectedRows = 1;
{
  const r = await deleteRule('r1');
  assertEq(r, { success: true }, 'success');
  const last = queryLog[queryLog.length - 1];
  assert(/DELETE FROM agent_routing_rules/.test(last.sql), 'DELETE SQL');
  assertEq(last.params, ['r1'], 'id param');
}

resetState();
deleteAffectedRows = 0;
{
  let caught: any = null;
  try { await deleteRule('ghost'); } catch (e) { caught = e; }
  assert(caught && /Rule not found/.test(caught.message), 'not found');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
