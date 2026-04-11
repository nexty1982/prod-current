#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRoutingService.js (OMD-978)
 *
 * Tests the deterministic routing logic that selects which agent should
 * execute a prompt based on (component, prompt_type) pairs against a
 * priority-ordered ruleset.
 *
 * Stubs:
 *   - ../config/db getAppPool → fake pool routed by SQL regex
 *   - ./agentRegistryService getAgent → fake by id
 *
 * Coverage:
 *   - resolveAgent: exact match, component-only, type-only, catch-all,
 *     priority ordering, multi-agent comparison resolution + filtering of
 *     inactive comparison agents, malformed comparison_agent_ids JSON
 *   - resolveAgent fallback: when no rules match, picks lowest
 *     default_priority active agent, parses capabilities/config JSON,
 *     throws when zero agents
 *   - previewRoute: shape with primary/comparison subset
 *   - listRules: with/without filters
 *   - createRule: validation (rule_name + agent_id required, prompt_type
 *     enum, agent existence, comparison agent existence), defaults
 *     (priority=50, is_multi_agent flag, JSON-serialized comparison_ids)
 *   - updateRule: whitelist, JSON serialization, boolean coercion,
 *     "no fields" error, "rule not found" error
 *   - deleteRule: success + not found
 *   - VALID_PROMPT_TYPES export
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

// ── Fake pool with SQL routing ───────────────────────────────────────
type Route = { match: RegExp; rows?: any[]; result?: any };

function makePool(routes: Route[]) {
  const calls: Array<{ sql: string; params: any[] }> = [];
  return {
    calls,
    query: async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      for (const r of routes) {
        if (r.match.test(sql)) {
          if (r.result !== undefined) return [r.result];
          return [r.rows || []];
        }
      }
      return [[]];
    },
  };
}

let activePool: any = makePool([]);
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => activePool },
} as any;

// ── Stub agentRegistryService ────────────────────────────────────────
const agentDb: Record<string, any> = {
  'a1': { id: 'a1', name: 'gpt-4', provider: 'openai', status: 'active' },
  'a2': { id: 'a2', name: 'claude', provider: 'anthropic', status: 'active' },
  'a3': { id: 'a3', name: 'gemini', provider: 'google', status: 'inactive' },
};
const registryPath = require.resolve('../agentRegistryService');
require.cache[registryPath] = {
  id: registryPath,
  filename: registryPath,
  loaded: true,
  exports: {
    getAgent: async (id: string) => agentDb[id] || null,
  },
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
console.log('\n── VALID_PROMPT_TYPES ─────────────────────────────────');

assertEq(
  VALID_PROMPT_TYPES,
  ['plan', 'implementation', 'verification', 'correction', 'migration', 'docs'],
  'exported list'
);

// ============================================================================
// resolveAgent — exact match wins
// ============================================================================
console.log('\n── resolveAgent: exact match ──────────────────────────');

activePool = makePool([
  {
    match: /agent_routing_rules/i,
    rows: [
      // priority 10: catch-all → would match anything
      { id: 'r1', component: null, prompt_type: null, agent_id: 'a1',
        priority: 10, is_multi_agent: 0, comparison_agent_ids: null,
        rule_name: 'catchall', active: 1 },
      // priority 20: exact match for backend/implementation
      { id: 'r2', component: 'backend', prompt_type: 'implementation', agent_id: 'a2',
        priority: 20, is_multi_agent: 0, comparison_agent_ids: null,
        rule_name: 'be-impl', active: 1 },
    ],
  },
]);

// Note: results returned in priority ASC order, so r1 comes first.
// SUT iterates rules and breaks on FIRST match — so for any input, r1 wins
// because catch-all matches everything. This test verifies that.
const r1 = await resolveAgent('backend', 'implementation');
assertEq(r1.primary_agent.id, 'a1', 'first matching rule wins (catchall priority 10)');
assertEq(r1.rule.id, 'r1', 'rule id is r1');
assertEq(r1.is_multi_agent, false, 'not multi-agent');
assertEq(r1.comparison_agents, [], 'no comparison agents');

// ============================================================================
// resolveAgent — priority ordering (without catch-all)
// ============================================================================
console.log('\n── resolveAgent: priority ordering ────────────────────');

activePool = makePool([
  {
    match: /agent_routing_rules/i,
    rows: [
      // priority 10 — won't match
      { id: 'r1', component: 'frontend', prompt_type: 'plan', agent_id: 'a1',
        priority: 10, is_multi_agent: 0, comparison_agent_ids: null,
        rule_name: 'fe-plan', active: 1 },
      // priority 20 — matches backend/* (component-only)
      { id: 'r2', component: 'backend', prompt_type: null, agent_id: 'a2',
        priority: 20, is_multi_agent: 0, comparison_agent_ids: null,
        rule_name: 'be-any', active: 1 },
      // priority 30 — also matches but lower priority
      { id: 'r3', component: 'backend', prompt_type: 'implementation', agent_id: 'a1',
        priority: 30, is_multi_agent: 0, comparison_agent_ids: null,
        rule_name: 'be-impl', active: 1 },
    ],
  },
]);

const r2 = await resolveAgent('backend', 'implementation');
assertEq(r2.primary_agent.id, 'a2', 'priority 20 component-only beats priority 30 exact');
assertEq(r2.rule.rule_name, 'be-any', 'rule name');

// ============================================================================
// resolveAgent — type-only match
// ============================================================================
console.log('\n── resolveAgent: type-only match ──────────────────────');

activePool = makePool([
  {
    match: /agent_routing_rules/i,
    rows: [
      { id: 'r1', component: null, prompt_type: 'verification', agent_id: 'a2',
        priority: 10, is_multi_agent: 0, comparison_agent_ids: null,
        rule_name: 'verify-any', active: 1 },
    ],
  },
]);

const r3 = await resolveAgent('frontend', 'verification');
assertEq(r3.primary_agent.id, 'a2', 'type-only matches across components');

// Type mismatch → no match → fallback
activePool = makePool([
  {
    match: /agent_routing_rules/i,
    rows: [
      { id: 'r1', component: null, prompt_type: 'verification', agent_id: 'a2',
        priority: 10, is_multi_agent: 0, comparison_agent_ids: null,
        rule_name: 'verify-any', active: 1 },
    ],
  },
  {
    match: /FROM\s+agent_registry\s+WHERE/i,
    rows: [
      { id: 'a1', name: 'gpt-4', provider: 'openai', status: 'active',
        capabilities: '["code","reason"]', config: '{"temp":0.5}', default_priority: 1 },
    ],
  },
]);
const r3miss = await resolveAgent('frontend', 'plan');
assertEq(r3miss.primary_agent.id, 'a1', 'type mismatch → fallback default');
assertEq(r3miss.rule, null, 'no rule on fallback');

// ============================================================================
// resolveAgent — multi-agent resolution
// ============================================================================
console.log('\n── resolveAgent: multi-agent ──────────────────────────');

activePool = makePool([
  {
    match: /agent_routing_rules/i,
    rows: [
      { id: 'r1', component: 'backend', prompt_type: 'implementation', agent_id: 'a1',
        priority: 10, is_multi_agent: 1,
        comparison_agent_ids: '["a2","a3"]',  // a3 is inactive → filtered
        rule_name: 'multi', active: 1 },
    ],
  },
]);

const r4 = await resolveAgent('backend', 'implementation');
assertEq(r4.primary_agent.id, 'a1', 'multi: primary');
assertEq(r4.comparison_agents.length, 1, 'multi: 1 active comparison (a3 filtered)');
assertEq(r4.comparison_agents[0].id, 'a2', 'multi: a2 included');
assertEq(r4.is_multi_agent, true, 'is_multi_agent true');

// is_multi_agent flag set but no active comparison agents → false
activePool = makePool([
  {
    match: /agent_routing_rules/i,
    rows: [
      { id: 'r1', component: 'backend', prompt_type: 'implementation', agent_id: 'a1',
        priority: 10, is_multi_agent: 1,
        comparison_agent_ids: '["a3"]',  // only inactive
        rule_name: 'multi-empty', active: 1 },
    ],
  },
]);

const r4b = await resolveAgent('backend', 'implementation');
assertEq(r4b.is_multi_agent, false, 'no active comparisons → not multi-agent');
assertEq(r4b.comparison_agents.length, 0, 'comparison agents empty');

// Malformed JSON in comparison_agent_ids → fallback to []
activePool = makePool([
  {
    match: /agent_routing_rules/i,
    rows: [
      { id: 'r1', component: 'backend', prompt_type: 'implementation', agent_id: 'a1',
        priority: 10, is_multi_agent: 1,
        comparison_agent_ids: '{not json',
        rule_name: 'bad', active: 1 },
    ],
  },
]);

const r4c = await resolveAgent('backend', 'implementation');
assertEq(r4c.comparison_agents.length, 0, 'malformed JSON → empty comparisons');

// ============================================================================
// resolveAgent — fallback path
// ============================================================================
console.log('\n── resolveAgent: fallback ─────────────────────────────');

activePool = makePool([
  { match: /agent_routing_rules/i, rows: [] },
  {
    match: /FROM\s+agent_registry\s+WHERE/i,
    rows: [
      { id: 'a1', name: 'default', provider: 'openai', status: 'active',
        capabilities: '["code"]', config: '{"a":1}', default_priority: 1 },
    ],
  },
]);

const fb = await resolveAgent('any', 'any');
assertEq(fb.primary_agent.id, 'a1', 'fallback agent id');
assertEq(fb.primary_agent.capabilities, ['code'], 'capabilities parsed from JSON');
assertEq(fb.primary_agent.config, { a: 1 }, 'config parsed from JSON');
assertEq(fb.rule, null, 'rule null');
assertEq(fb.is_multi_agent, false, 'not multi-agent');

// Fallback with null/missing JSON
activePool = makePool([
  { match: /agent_routing_rules/i, rows: [] },
  {
    match: /FROM\s+agent_registry\s+WHERE/i,
    rows: [
      { id: 'a1', name: 'default', provider: 'openai', status: 'active',
        capabilities: null, config: null, default_priority: 1 },
    ],
  },
]);
const fb2 = await resolveAgent('any', 'any');
assertEq(fb2.primary_agent.capabilities, [], 'null capabilities → []');
assertEq(fb2.primary_agent.config, null, 'null config → null');

// No active agents → throws
activePool = makePool([
  { match: /agent_routing_rules/i, rows: [] },
  { match: /FROM\s+agent_registry\s+WHERE/i, rows: [] },
]);

let caught: Error | null = null;
try {
  await resolveAgent('any', 'any');
} catch (e: any) { caught = e; }
assert(caught !== null, 'throws when no agents');
assert(caught !== null && caught.message.includes('No active agents'), 'error message');

// ============================================================================
// previewRoute
// ============================================================================
console.log('\n── previewRoute ───────────────────────────────────────');

activePool = makePool([
  {
    match: /agent_routing_rules/i,
    rows: [
      { id: 'r1', component: 'backend', prompt_type: 'plan', agent_id: 'a1',
        priority: 10, is_multi_agent: 1,
        comparison_agent_ids: '["a2"]',
        rule_name: 'preview', active: 1 },
    ],
  },
]);

const prev = await previewRoute('backend', 'plan');
assertEq(prev.component, 'backend', 'component echoed');
assertEq(prev.prompt_type, 'plan', 'prompt_type echoed');
assertEq(prev.primary_agent.id, 'a1', 'primary id');
assertEq(prev.primary_agent.name, 'gpt-4', 'primary name');
assertEq(prev.primary_agent.provider, 'openai', 'primary provider');
assertEq(prev.comparison_agents.length, 1, '1 comparison');
assertEq(prev.comparison_agents[0].id, 'a2', 'comparison id');
assertEq(prev.matched_rule.rule_name, 'preview', 'matched_rule name');
assertEq(prev.matched_rule.priority, 10, 'matched_rule priority');
assertEq(prev.is_multi_agent, true, 'is_multi_agent');

// previewRoute with no matched rule → matched_rule is null
activePool = makePool([
  { match: /agent_routing_rules/i, rows: [] },
  {
    match: /FROM\s+agent_registry\s+WHERE/i,
    rows: [
      { id: 'a1', name: 'default', provider: 'openai', status: 'active',
        capabilities: '[]', config: 'null', default_priority: 1 },
    ],
  },
]);
const prev2 = await previewRoute('any', 'any');
assertEq(prev2.matched_rule, null, 'no rule → matched_rule null');

// ============================================================================
// listRules
// ============================================================================
console.log('\n── listRules ──────────────────────────────────────────');

activePool = makePool([
  {
    match: /agent_routing_rules/i,
    rows: [
      { id: 'r1', rule_name: 'foo', agent_id: 'a1', priority: 10,
        component: 'backend', prompt_type: null,
        comparison_agent_ids: '["a2"]', active: 1 },
    ],
  },
]);

const rules1 = await listRules();
assertEq(rules1.length, 1, '1 rule returned');
assertEq(rules1[0].comparison_agent_ids, ['a2'], 'comparison_agent_ids parsed');
const sql1 = activePool.calls[0].sql;
assert(sql1.includes('1=1'), 'no filters → 1=1');
assertEq(activePool.calls[0].params, [], 'no params');

// With filters
activePool = makePool([
  { match: /agent_routing_rules/i, rows: [] },
]);
await listRules({ active: true, component: 'backend' });
assertEq(activePool.calls[0].params, [1, 'backend'], 'filter params (active=1, component)');
assert(activePool.calls[0].sql.includes('r.active = ?'), 'active filter in SQL');
assert(activePool.calls[0].sql.includes('r.component = ?'), 'component filter in SQL');

// active=false
activePool = makePool([{ match: /agent_routing_rules/i, rows: [] }]);
await listRules({ active: false });
assertEq(activePool.calls[0].params, [0], 'active=false → 0');

// ============================================================================
// createRule
// ============================================================================
console.log('\n── createRule ─────────────────────────────────────────');

// Validation: missing rule_name
let cErr: Error | null = null;
try { await createRule({ agent_id: 'a1' } as any); } catch (e: any) { cErr = e; }
assert(cErr !== null && cErr.message.includes('required'), 'missing rule_name throws');

// Missing agent_id
cErr = null;
try { await createRule({ rule_name: 'x' } as any); } catch (e: any) { cErr = e; }
assert(cErr !== null && cErr.message.includes('required'), 'missing agent_id throws');

// Invalid prompt_type
cErr = null;
try {
  await createRule({ rule_name: 'x', agent_id: 'a1', prompt_type: 'bogus' } as any);
} catch (e: any) { cErr = e; }
assert(cErr !== null && cErr.message.includes('Invalid prompt_type'), 'invalid prompt_type throws');

// Agent doesn't exist
cErr = null;
try {
  await createRule({ rule_name: 'x', agent_id: 'nope' } as any);
} catch (e: any) { cErr = e; }
assert(cErr !== null && cErr.message.includes('Agent not found'), 'unknown agent throws');

// Comparison agent doesn't exist
cErr = null;
try {
  await createRule({
    rule_name: 'x', agent_id: 'a1', is_multi_agent: true,
    comparison_agent_ids: ['nope'],
  } as any);
} catch (e: any) { cErr = e; }
assert(cErr !== null && cErr.message.includes('Comparison agent not found'), 'unknown comparison agent throws');

// Happy path with defaults
activePool = makePool([
  { match: /INSERT INTO agent_routing_rules/i, result: { affectedRows: 1 } },
]);
const created = await createRule({
  rule_name: 'happy', agent_id: 'a1',
} as any);
assert(typeof created.rule_id === 'string', 'rule_id is string');
assert(created.rule_id.length > 10, 'rule_id is uuid-like');

const insertCall = activePool.calls[0];
assertEq(insertCall.params[1], 'happy', 'rule_name passed');
assertEq(insertCall.params[2], null, 'component defaults to null');
assertEq(insertCall.params[3], null, 'prompt_type defaults to null');
assertEq(insertCall.params[4], 'a1', 'agent_id passed');
assertEq(insertCall.params[5], 50, 'priority defaults to 50');
assertEq(insertCall.params[6], 0, 'is_multi_agent defaults to 0');
assertEq(insertCall.params[7], null, 'comparison_agent_ids defaults to null');

// Happy path multi-agent
activePool = makePool([
  { match: /INSERT INTO agent_routing_rules/i, result: { affectedRows: 1 } },
]);
await createRule({
  rule_name: 'multi', component: 'backend', prompt_type: 'implementation',
  agent_id: 'a1', priority: 25, is_multi_agent: true,
  comparison_agent_ids: ['a2'],
} as any);
const insertCall2 = activePool.calls[0];
assertEq(insertCall2.params[2], 'backend', 'component');
assertEq(insertCall2.params[3], 'implementation', 'prompt_type');
assertEq(insertCall2.params[5], 25, 'priority custom');
assertEq(insertCall2.params[6], 1, 'is_multi_agent → 1');
assertEq(insertCall2.params[7], '["a2"]', 'comparison_agent_ids JSON-stringified');

// ============================================================================
// updateRule
// ============================================================================
console.log('\n── updateRule ─────────────────────────────────────────');

// No fields → throws
let uErr: Error | null = null;
try { await updateRule('r1', {}); } catch (e: any) { uErr = e; }
assert(uErr !== null && uErr.message.includes('No valid fields'), 'empty updates throw');

// Bogus field → ignored, throws "no valid fields"
uErr = null;
try { await updateRule('r1', { bogus: 'x' } as any); } catch (e: any) { uErr = e; }
assert(uErr !== null, 'bogus-only updates throw');

// Whitelisted update — happy path
activePool = makePool([
  { match: /UPDATE agent_routing_rules/i, result: { affectedRows: 1 } },
]);
await updateRule('r1', {
  rule_name: 'renamed',
  is_multi_agent: true,
  active: false,
  comparison_agent_ids: ['a2'],
} as any);
const upd = activePool.calls[0];
assert(upd.sql.includes('rule_name = ?'), 'rule_name in SET');
assert(upd.sql.includes('is_multi_agent = ?'), 'is_multi_agent in SET');
assert(upd.sql.includes('active = ?'), 'active in SET');
assert(upd.sql.includes('comparison_agent_ids = ?'), 'comparison_agent_ids in SET');
assert(!upd.sql.includes('bogus'), 'no bogus field');
// allowed list order: rule_name, ..., is_multi_agent, comparison_agent_ids, active
// → params: rule_name, is_multi_agent, comparison_agent_ids, active, id
assertEq(upd.params[0], 'renamed', 'rule_name param');
assertEq(upd.params[1], 1, 'is_multi_agent → 1');
assertEq(upd.params[2], '["a2"]', 'comparison_agent_ids JSON-stringified');
assertEq(upd.params[3], 0, 'active=false → 0');
assertEq(upd.params[4], 'r1', 'id last');

// comparison_agent_ids null/undefined → JSON null
activePool = makePool([
  { match: /UPDATE agent_routing_rules/i, result: { affectedRows: 1 } },
]);
await updateRule('r1', { comparison_agent_ids: null } as any);
assertEq(activePool.calls[0].params[0], null, 'null comparison_agent_ids → null');

// Rule not found
activePool = makePool([
  { match: /UPDATE agent_routing_rules/i, result: { affectedRows: 0 } },
]);
uErr = null;
try { await updateRule('r1', { rule_name: 'x' } as any); } catch (e: any) { uErr = e; }
assert(uErr !== null && uErr.message.includes('Rule not found'), 'rule not found throws');

// ============================================================================
// deleteRule
// ============================================================================
console.log('\n── deleteRule ─────────────────────────────────────────');

activePool = makePool([
  { match: /DELETE FROM agent_routing_rules/i, result: { affectedRows: 1 } },
]);
const del = await deleteRule('r1');
assertEq(del.success, true, 'delete success');
assertEq(activePool.calls[0].params, ['r1'], 'delete param');

activePool = makePool([
  { match: /DELETE FROM agent_routing_rules/i, result: { affectedRows: 0 } },
]);
let dErr: Error | null = null;
try { await deleteRule('r1'); } catch (e: any) { dErr = e; }
assert(dErr !== null && dErr.message.includes('Rule not found'), 'delete not found throws');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
