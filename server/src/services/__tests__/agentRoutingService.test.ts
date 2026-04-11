#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRoutingService.js (OMD-1084)
 *
 * Covers:
 *   - VALID_PROMPT_TYPES constant
 *   - resolveAgent:
 *       · exact match (component + prompt_type)
 *       · component-only match (null prompt_type)
 *       · type-only match (null component)
 *       · catch-all rule (both null)
 *       · priority order: first match wins
 *       · multi-agent: pulls comparison_agent_ids
 *       · multi-agent: filters non-active comparison agents
 *       · fallback: no rules → lowest priority active agent
 *       · fallback: parses JSON fields
 *       · throws when no active agents exist
 *   - previewRoute: shape of returned object
 *   - listRules: base query, active filter, component filter, JSON parse
 *   - createRule:
 *       · missing rule_name / agent_id throws
 *       · invalid prompt_type throws
 *       · agent not found throws
 *       · comparison agent not found throws
 *       · happy path: uuid + INSERT with defaults
 *   - updateRule:
 *       · no fields throws
 *       · individual field handling (JSON, boolean, raw)
 *       · not found throws
 *   - deleteRule:
 *       · not found throws
 *       · success path
 *
 * Stubs config/db, uuid, and agentRegistryService.
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

// ── stubModule helper ───────────────────────────────────────────────
const pathMod = require('path');
function stubModule(relFromSrc: string, exports: any) {
  const absWithoutExt = pathMod.resolve(__dirname, '..', '..', relFromSrc);
  const resolved = require.resolve(absWithoutExt);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  } as any;
}

// ── Fake DB pool ────────────────────────────────────────────────────
type Route = { match: RegExp; respond: (params: any[], sql: string) => any };
const queryLog: { sql: string; params: any[] }[] = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) return r.respond(params, sql);
    }
    if (/^\s*SELECT/i.test(sql)) return [[], []];
    if (/^\s*UPDATE/i.test(sql)) return [{ affectedRows: 1 }, []];
    if (/^\s*INSERT/i.test(sql)) return [{ insertId: 1, affectedRows: 1 }, []];
    if (/^\s*DELETE/i.test(sql)) return [{ affectedRows: 1 }, []];
    return [[], []];
  },
};

stubModule('config/db', { getAppPool: () => fakePool });

// ── Stub agentRegistryService ───────────────────────────────────────
const agentRegistryMap: Record<string, any> = {};
let getAgentCalls: string[] = [];

stubModule('services/agentRegistryService', {
  getAgent: async (id: string) => {
    getAgentCalls.push(id);
    return agentRegistryMap[id] || null;
  },
});

// ── Stub uuid ───────────────────────────────────────────────────────
let nextUuid = 'fixed-uuid';
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: { v4: () => nextUuid },
} as any;

function resetAll() {
  queryLog.length = 0;
  routes = [];
  getAgentCalls.length = 0;
  for (const k of Object.keys(agentRegistryMap)) delete agentRegistryMap[k];
  nextUuid = 'fixed-uuid';
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
  VALID_PROMPT_TYPES.sort(),
  ['correction', 'docs', 'implementation', 'migration', 'plan', 'verification'],
  'all 6 types present'
);

// ============================================================================
// resolveAgent — exact match (component + prompt_type)
// ============================================================================
console.log('\n── resolveAgent: exact match ─────────────────────────────');

resetAll();
agentRegistryMap['agent-a'] = { id: 'agent-a', name: 'Claude', status: 'active' };
routes.push({
  match: /FROM agent_routing_rules/,
  respond: () => [[
    {
      id: 'rule-1',
      rule_name: 'Backend Implementation',
      component: 'backend',
      prompt_type: 'implementation',
      agent_id: 'agent-a',
      priority: 10,
      is_multi_agent: 0,
      comparison_agent_ids: null,
      active: 1,
      agent_name: 'Claude',
      agent_status: 'active',
    },
  ], []],
});
{
  const r = await resolveAgent('backend', 'implementation');
  assertEq(r.primary_agent.id, 'agent-a', 'primary agent id');
  assertEq(r.comparison_agents.length, 0, 'no comparison');
  assertEq(r.is_multi_agent, false, 'not multi-agent');
  assert(r.rule !== null, 'rule attached');
  assertEq(r.rule.id, 'rule-1', 'rule id');
}

// ============================================================================
// resolveAgent — component-only match
// ============================================================================
console.log('\n── resolveAgent: component-only ──────────────────────────');

resetAll();
agentRegistryMap['agent-b'] = { id: 'agent-b', name: 'Cursor', status: 'active' };
routes.push({
  match: /FROM agent_routing_rules/,
  respond: () => [[
    {
      id: 'rule-2',
      component: 'frontend',
      prompt_type: null,
      agent_id: 'agent-b',
      priority: 20,
      is_multi_agent: 0,
    },
  ], []],
});
{
  const r = await resolveAgent('frontend', 'verification');
  assertEq(r.primary_agent.id, 'agent-b', 'matched component-only');
}

// ============================================================================
// resolveAgent — type-only match
// ============================================================================
console.log('\n── resolveAgent: type-only ───────────────────────────────');

resetAll();
agentRegistryMap['agent-c'] = { id: 'agent-c', name: 'Windsurf', status: 'active' };
routes.push({
  match: /FROM agent_routing_rules/,
  respond: () => [[
    {
      id: 'rule-3',
      component: null,
      prompt_type: 'migration',
      agent_id: 'agent-c',
      priority: 30,
      is_multi_agent: 0,
    },
  ], []],
});
{
  const r = await resolveAgent('database', 'migration');
  assertEq(r.primary_agent.id, 'agent-c', 'matched type-only');
}

// ============================================================================
// resolveAgent — catch-all rule
// ============================================================================
console.log('\n── resolveAgent: catch-all ───────────────────────────────');

resetAll();
agentRegistryMap['agent-d'] = { id: 'agent-d', name: 'Default', status: 'active' };
routes.push({
  match: /FROM agent_routing_rules/,
  respond: () => [[
    {
      id: 'rule-catch',
      component: null,
      prompt_type: null,
      agent_id: 'agent-d',
      priority: 100,
      is_multi_agent: 0,
    },
  ], []],
});
{
  const r = await resolveAgent('anything', 'anything');
  assertEq(r.primary_agent.id, 'agent-d', 'catch-all matched');
}

// ============================================================================
// resolveAgent — priority order (first match wins)
// ============================================================================
console.log('\n── resolveAgent: priority order ──────────────────────────');

resetAll();
agentRegistryMap['agent-high'] = { id: 'agent-high', name: 'High', status: 'active' };
agentRegistryMap['agent-low'] = { id: 'agent-low', name: 'Low', status: 'active' };
routes.push({
  match: /FROM agent_routing_rules/,
  respond: () => [[
    // Returned in priority order (ASC) — first should win
    { id: 'high', component: 'backend', prompt_type: 'implementation', agent_id: 'agent-high', priority: 5 },
    { id: 'low', component: 'backend', prompt_type: 'implementation', agent_id: 'agent-low', priority: 50 },
  ], []],
});
{
  const r = await resolveAgent('backend', 'implementation');
  assertEq(r.primary_agent.id, 'agent-high', 'first priority match wins');
}

// ============================================================================
// resolveAgent — multi-agent mode
// ============================================================================
console.log('\n── resolveAgent: multi-agent ─────────────────────────────');

resetAll();
agentRegistryMap['agent-primary'] = { id: 'agent-primary', name: 'Primary', status: 'active' };
agentRegistryMap['agent-compare-1'] = { id: 'agent-compare-1', name: 'Compare1', status: 'active' };
agentRegistryMap['agent-compare-2'] = { id: 'agent-compare-2', name: 'Compare2', status: 'active' };
routes.push({
  match: /FROM agent_routing_rules/,
  respond: () => [[
    {
      id: 'rule-multi',
      component: 'backend',
      prompt_type: 'implementation',
      agent_id: 'agent-primary',
      priority: 10,
      is_multi_agent: 1,
      comparison_agent_ids: JSON.stringify(['agent-compare-1', 'agent-compare-2']),
    },
  ], []],
});
{
  const r = await resolveAgent('backend', 'implementation');
  assertEq(r.primary_agent.id, 'agent-primary', 'primary agent');
  assertEq(r.comparison_agents.length, 2, '2 comparison agents');
  assertEq(r.is_multi_agent, true, 'multi-agent true');
  assertEq(r.comparison_agents[0].id, 'agent-compare-1', 'compare 1');
  assertEq(r.comparison_agents[1].id, 'agent-compare-2', 'compare 2');
}

// ============================================================================
// resolveAgent — multi-agent filters non-active comparison
// ============================================================================
console.log('\n── resolveAgent: multi-agent non-active filter ───────────');

resetAll();
agentRegistryMap['agent-primary'] = { id: 'agent-primary', name: 'Primary', status: 'active' };
agentRegistryMap['agent-active'] = { id: 'agent-active', name: 'Active', status: 'active' };
agentRegistryMap['agent-inactive'] = { id: 'agent-inactive', name: 'Inactive', status: 'inactive' };
routes.push({
  match: /FROM agent_routing_rules/,
  respond: () => [[
    {
      id: 'r',
      component: null,
      prompt_type: null,
      agent_id: 'agent-primary',
      is_multi_agent: 1,
      comparison_agent_ids: JSON.stringify(['agent-active', 'agent-inactive', 'agent-missing']),
    },
  ], []],
});
{
  const r = await resolveAgent('x', 'y');
  assertEq(r.comparison_agents.length, 1, 'only active retained');
  assertEq(r.comparison_agents[0].id, 'agent-active', 'active kept');
}

// ============================================================================
// resolveAgent — no multi-agent flag keeps empty comparison
// ============================================================================
console.log('\n── resolveAgent: is_multi_agent=0 ignores comparison ─────');

resetAll();
agentRegistryMap['agent-p'] = { id: 'agent-p', name: 'P', status: 'active' };
routes.push({
  match: /FROM agent_routing_rules/,
  respond: () => [[
    {
      id: 'r',
      component: null,
      prompt_type: null,
      agent_id: 'agent-p',
      is_multi_agent: 0,
      comparison_agent_ids: JSON.stringify(['should-be-ignored']),
    },
  ], []],
});
{
  const r = await resolveAgent('a', 'b');
  assertEq(r.comparison_agents.length, 0, 'is_multi_agent=0 skips');
  assertEq(r.is_multi_agent, false, 'flag false');
}

// ============================================================================
// resolveAgent — no rule matches → fallback to default
// ============================================================================
console.log('\n── resolveAgent: fallback to default ─────────────────────');

resetAll();
routes.push({
  match: /FROM agent_routing_rules/,
  respond: () => [[], []],
});
routes.push({
  match: /FROM agent_registry WHERE status = 'active'/,
  respond: () => [[
    {
      id: 'fallback-agent',
      name: 'Default',
      provider: 'claude',
      status: 'active',
      default_priority: 1,
      capabilities: '["coding","testing"]',
      config: '{"temperature":0.7}',
    },
  ], []],
});
{
  const r = await resolveAgent('nowhere', 'nothing');
  assertEq(r.primary_agent.id, 'fallback-agent', 'fallback agent');
  assertEq(r.primary_agent.capabilities, ['coding', 'testing'], 'capabilities parsed');
  assertEq(r.primary_agent.config, { temperature: 0.7 }, 'config parsed');
  assertEq(r.rule, null, 'no rule');
  assertEq(r.is_multi_agent, false, 'not multi');
}

// Fallback with bad JSON → fallback values
resetAll();
routes.push({
  match: /FROM agent_routing_rules/,
  respond: () => [[], []],
});
routes.push({
  match: /FROM agent_registry WHERE status = 'active'/,
  respond: () => [[
    {
      id: 'bad-json',
      name: 'BadJson',
      capabilities: 'not json',
      config: 'also not',
    },
  ], []],
});
{
  const r = await resolveAgent('x', 'y');
  assertEq(r.primary_agent.capabilities, [], 'bad JSON → []');
  assertEq(r.primary_agent.config, null, 'bad config JSON → null');
}

// No agents at all → throws
resetAll();
{
  let caught: any = null;
  try { await resolveAgent('x', 'y'); } catch (e) { caught = e; }
  assert(caught !== null, 'no agents throws');
  assert(caught.message.includes('No active agents'), 'error message');
}

// ============================================================================
// previewRoute
// ============================================================================
console.log('\n── previewRoute ──────────────────────────────────────────');

resetAll();
agentRegistryMap['pa'] = { id: 'pa', name: 'PreviewAgent', provider: 'claude', status: 'active' };
agentRegistryMap['ca'] = { id: 'ca', name: 'CompareAgent', provider: 'cursor', status: 'active' };
routes.push({
  match: /FROM agent_routing_rules/,
  respond: () => [[
    {
      id: 'preview-rule',
      rule_name: 'Preview Test',
      component: 'frontend',
      prompt_type: 'plan',
      agent_id: 'pa',
      priority: 15,
      is_multi_agent: 1,
      comparison_agent_ids: JSON.stringify(['ca']),
    },
  ], []],
});
{
  const r = await previewRoute('frontend', 'plan');
  assertEq(r.component, 'frontend', 'component echoed');
  assertEq(r.prompt_type, 'plan', 'prompt_type echoed');
  assertEq(r.primary_agent.id, 'pa', 'primary id');
  assertEq(r.primary_agent.name, 'PreviewAgent', 'primary name');
  assertEq(r.comparison_agents.length, 1, '1 comparison');
  assertEq(r.comparison_agents[0].id, 'ca', 'comparison id');
  assertEq(r.matched_rule.id, 'preview-rule', 'matched rule id');
  assertEq(r.matched_rule.rule_name, 'Preview Test', 'matched rule name');
  assertEq(r.matched_rule.priority, 15, 'priority');
  assertEq(r.is_multi_agent, true, 'multi flag');
}

// previewRoute with fallback
resetAll();
routes.push({
  match: /FROM agent_routing_rules/,
  respond: () => [[], []],
});
routes.push({
  match: /FROM agent_registry WHERE status = 'active'/,
  respond: () => [[{ id: 'def', name: 'Def', provider: 'x' }], []],
});
{
  const r = await previewRoute('x', 'y');
  assertEq(r.matched_rule, null, 'no matched rule');
}

// ============================================================================
// listRules
// ============================================================================
console.log('\n── listRules ─────────────────────────────────────────────');

// No filters
resetAll();
routes.push({
  match: /FROM agent_routing_rules/,
  respond: () => [[
    { id: 'r1', rule_name: 'R1', comparison_agent_ids: '["x","y"]' },
    { id: 'r2', rule_name: 'R2', comparison_agent_ids: null },
  ], []],
});
{
  const r = await listRules();
  assertEq(r.length, 2, '2 rules');
  assertEq(r[0].comparison_agent_ids, ['x', 'y'], 'parsed JSON');
  assertEq(r[1].comparison_agent_ids, [], 'null → []');
}

// active filter
resetAll();
routes.push({
  match: /FROM agent_routing_rules/,
  respond: (params) => {
    return [[{ id: 'r1', comparison_agent_ids: null }], []];
  },
});
{
  await listRules({ active: true });
  const q = queryLog[0];
  assert(q.sql.includes('r.active = ?'), 'active clause');
  assertEq(q.params[0], 1, 'active=1');
}

// active false
resetAll();
routes.push({
  match: /FROM agent_routing_rules/,
  respond: () => [[], []],
});
{
  await listRules({ active: false });
  assertEq(queryLog[0].params[0], 0, 'active=0');
}

// component filter
resetAll();
routes.push({
  match: /FROM agent_routing_rules/,
  respond: () => [[], []],
});
{
  await listRules({ component: 'backend' });
  const q = queryLog[0];
  assert(q.sql.includes('r.component = ?'), 'component clause');
  assertEq(q.params[0], 'backend', 'component param');
}

// combined
resetAll();
routes.push({
  match: /FROM agent_routing_rules/,
  respond: () => [[], []],
});
{
  await listRules({ active: true, component: 'backend' });
  const q = queryLog[0];
  assertEq(q.params.length, 2, '2 params');
}

// ============================================================================
// createRule
// ============================================================================
console.log('\n── createRule: validation ────────────────────────────────');

// Missing rule_name
{
  let caught: any = null;
  try { await createRule({ agent_id: 'a' } as any); } catch (e) { caught = e; }
  assert(caught !== null, 'missing rule_name throws');
}

// Missing agent_id
{
  let caught: any = null;
  try { await createRule({ rule_name: 'x' } as any); } catch (e) { caught = e; }
  assert(caught !== null, 'missing agent_id throws');
}

// Invalid prompt_type
{
  let caught: any = null;
  try {
    await createRule({ rule_name: 'x', agent_id: 'a', prompt_type: 'bogus' } as any);
  } catch (e) { caught = e; }
  assert(caught !== null, 'invalid prompt_type throws');
  assert(caught.message.includes('Invalid prompt_type'), 'error message');
}

// Agent not found
resetAll();
{
  let caught: any = null;
  try {
    await createRule({ rule_name: 'x', agent_id: 'missing' } as any);
  } catch (e) { caught = e; }
  assert(caught !== null, 'agent not found throws');
  assert(caught.message.includes('Agent not found'), 'error message');
}

// Comparison agent not found
resetAll();
agentRegistryMap['primary'] = { id: 'primary', status: 'active' };
{
  let caught: any = null;
  try {
    await createRule({
      rule_name: 'x',
      agent_id: 'primary',
      is_multi_agent: true,
      comparison_agent_ids: ['missing'],
    } as any);
  } catch (e) { caught = e; }
  assert(caught !== null, 'comparison not found throws');
  assert(caught.message.includes('Comparison agent not found'), 'error message');
}

// Happy path
resetAll();
nextUuid = 'new-rule-id';
agentRegistryMap['primary'] = { id: 'primary', status: 'active' };
agentRegistryMap['compare1'] = { id: 'compare1', status: 'active' };
{
  const r = await createRule({
    rule_name: 'Test',
    component: 'backend',
    prompt_type: 'implementation',
    agent_id: 'primary',
    priority: 5,
    is_multi_agent: true,
    comparison_agent_ids: ['compare1'],
  } as any);
  assertEq(r.rule_id, 'new-rule-id', 'returned id');
  const insert = queryLog.find(q => /INSERT INTO agent_routing_rules/.test(q.sql));
  assert(insert !== undefined, 'INSERT issued');
  assertEq(insert!.params[0], 'new-rule-id', 'id param');
  assertEq(insert!.params[1], 'Test', 'rule_name');
  assertEq(insert!.params[2], 'backend', 'component');
  assertEq(insert!.params[3], 'implementation', 'prompt_type');
  assertEq(insert!.params[4], 'primary', 'agent_id');
  assertEq(insert!.params[5], 5, 'priority');
  assertEq(insert!.params[6], 1, 'is_multi_agent 1');
  assertEq(insert!.params[7], JSON.stringify(['compare1']), 'comparison_agent_ids serialized');
}

// Defaults (priority, null values)
resetAll();
agentRegistryMap['p'] = { id: 'p', status: 'active' };
{
  await createRule({ rule_name: 'Simple', agent_id: 'p' } as any);
  const insert = queryLog.find(q => /INSERT INTO agent_routing_rules/.test(q.sql));
  assertEq(insert!.params[2], null, 'component null');
  assertEq(insert!.params[3], null, 'prompt_type null');
  assertEq(insert!.params[5], 50, 'default priority 50');
  assertEq(insert!.params[6], 0, 'multi=0');
  assertEq(insert!.params[7], null, 'comparison null');
}

// ============================================================================
// updateRule
// ============================================================================
console.log('\n── updateRule ────────────────────────────────────────────');

// No fields
resetAll();
{
  let caught: any = null;
  try { await updateRule('id', {}); } catch (e) { caught = e; }
  assert(caught !== null, 'no fields throws');
  assert(caught.message.includes('No valid fields'), 'error message');
}

// Happy path: multi fields
resetAll();
{
  const r = await updateRule('id-1', {
    rule_name: 'New',
    priority: 5,
    is_multi_agent: true,
    active: false,
    comparison_agent_ids: ['a', 'b'],
    unknown_field: 'ignored',
  } as any);
  assertEq(r.success, true, 'success');
  const update = queryLog.find(q => /UPDATE agent_routing_rules/.test(q.sql));
  assert(update !== undefined, 'UPDATE issued');
  assert(update!.sql.includes('rule_name = ?'), 'rule_name');
  assert(update!.sql.includes('priority = ?'), 'priority');
  assert(update!.sql.includes('is_multi_agent = ?'), 'is_multi_agent');
  assert(update!.sql.includes('active = ?'), 'active');
  assert(update!.sql.includes('comparison_agent_ids = ?'), 'comparison');
  assert(!update!.sql.includes('unknown_field'), 'unknown field not included');
  // Last param is id
  assertEq(update!.params[update!.params.length - 1], 'id-1', 'id last param');
  // is_multi_agent coerced to 1
  const boolIdx = update!.sql.split(',').findIndex(s => s.includes('is_multi_agent'));
  assert(update!.params.includes(1), 'is_multi_agent=1 present');
  assert(update!.params.includes(0), 'active=0 present');
  assert(update!.params.includes(JSON.stringify(['a', 'b'])), 'comparison serialized');
}

// comparison_agent_ids null
resetAll();
{
  await updateRule('id-2', { comparison_agent_ids: null });
  const update = queryLog.find(q => /UPDATE agent_routing_rules/.test(q.sql));
  assertEq(update!.params[0], null, 'null comparison passed as null');
}

// Not found
resetAll();
routes.push({
  match: /UPDATE agent_routing_rules/,
  respond: () => [{ affectedRows: 0 }, []],
});
{
  let caught: any = null;
  try { await updateRule('missing', { rule_name: 'x' }); } catch (e) { caught = e; }
  assert(caught !== null, 'not found throws');
}

// ============================================================================
// deleteRule
// ============================================================================
console.log('\n── deleteRule ────────────────────────────────────────────');

// Success
resetAll();
{
  const r = await deleteRule('id-del');
  assertEq(r.success, true, 'success');
  const del = queryLog.find(q => /DELETE FROM agent_routing_rules/.test(q.sql));
  assert(del !== undefined, 'DELETE issued');
  assertEq(del!.params[0], 'id-del', 'id param');
}

// Not found
resetAll();
routes.push({
  match: /DELETE FROM agent_routing_rules/,
  respond: () => [{ affectedRows: 0 }, []],
});
{
  let caught: any = null;
  try { await deleteRule('missing'); } catch (e) { caught = e; }
  assert(caught !== null, 'not found throws');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
