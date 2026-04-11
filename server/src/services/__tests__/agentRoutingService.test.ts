#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRoutingService.js (OMD-1228)
 *
 * Deterministic router: (component, prompt_type) → agent.
 * First-match-wins over priority-ordered rules, falls back to the active
 * agent with the lowest default_priority.
 *
 * External deps stubbed via require.cache BEFORE requiring the SUT:
 *   - uuid             → v4 returns "uuid-N" counter
 *   - ../config/db     → getAppPool with regex-dispatched responders
 *   - ./agentRegistryService → getAgent(id) from a scriptable map
 *
 * Coverage:
 *   - VALID_PROMPT_TYPES exported
 *   - resolveAgent:
 *       · exact match (component + prompt_type)
 *       · component-only match
 *       · type-only match
 *       · catch-all (both null)
 *       · first-match-wins (priority order)
 *       · multi-agent mode populates comparison_agents
 *       · inactive comparison agent is filtered out
 *       · is_multi_agent false when comparison list empty
 *       · no matching rule → system default fallback
 *       · fallback parses capabilities/config JSON
 *       · no rules + no default agents → throws
 *   - previewRoute: reshaped payload with matched_rule
 *   - listRules: filters by active/component
 *   - createRule:
 *       · missing rule_name/agent_id throws
 *       · invalid prompt_type throws
 *       · agent not found throws
 *       · comparison agent not found throws
 *       · happy path assigns uuid, defaults, JSON-encodes comparison ids
 *       · is_multi_agent false → comparison_agent_ids null
 *   - updateRule:
 *       · no valid fields throws
 *       · affectedRows=0 throws
 *       · happy path builds SET clause, JSON-encodes lists, booleanizes flags
 *   - deleteRule: affected 0 throws, happy path
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

// ── uuid stub ────────────────────────────────────────────────────────
let uuidCounter = 0;
const uuidStub = { v4: () => `uuid-${++uuidCounter}` };
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = { id: uuidPath, filename: uuidPath, loaded: true, exports: uuidStub } as any;

// ── config/db stub ───────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Responder = { match: RegExp; respond: (params: any[]) => any };
let responders: Responder[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of responders) {
      if (r.match.test(sql)) return [r.respond(params)];
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
const path = require('path');
const dbDir = path.resolve(__dirname, '..', '..', 'config');
for (const ext of ['.js', '.ts']) {
  const p = path.join(dbDir, 'db' + ext);
  require.cache[p] = { id: p, filename: p, loaded: true, exports: dbStub } as any;
}

// ── agentRegistryService stub ────────────────────────────────────────
const agentMap: Record<string, any> = {};
const agentRegistryStub = {
  getAgent: async (id: string) => agentMap[id] || null,
};
const servicesDir = path.resolve(__dirname, '..', '..', 'services');
for (const ext of ['.js', '.ts']) {
  const p = path.join(servicesDir, 'agentRegistryService' + ext);
  require.cache[p] = { id: p, filename: p, loaded: true, exports: agentRegistryStub } as any;
}

function resetState() {
  queryLog.length = 0;
  responders = [];
  uuidCounter = 0;
  for (const k of Object.keys(agentMap)) delete agentMap[k];
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
  'exported values'
);

// ============================================================================
// resolveAgent: exact match
// ============================================================================
console.log('\n── resolveAgent: exact match ──────────────────────────────');

resetState();
agentMap['a1'] = { id: 'a1', name: 'Agent One', provider: 'anthropic', status: 'active' };
responders = [
  {
    match: /FROM agent_routing_rules/,
    respond: () => [
      { id: 'r-exact', rule_name: 'exact', component: 'backend', prompt_type: 'implementation', agent_id: 'a1', priority: 10, is_multi_agent: 0, comparison_agent_ids: null, active: 1, agent_name: 'Agent One', agent_status: 'active' },
      { id: 'r-catchall', rule_name: 'catchall', component: null, prompt_type: null, agent_id: 'a1', priority: 100, is_multi_agent: 0, comparison_agent_ids: null, active: 1, agent_name: 'Agent One', agent_status: 'active' },
    ],
  },
];
{
  const r = await resolveAgent('backend', 'implementation');
  assertEq(r.primary_agent.id, 'a1', 'primary agent id');
  assertEq(r.comparison_agents, [], 'no comparison agents');
  assertEq(r.is_multi_agent, false, 'not multi-agent');
  assertEq(r.rule.id, 'r-exact', 'rule id matches first');
  assertEq(r.rule.rule_name, 'exact', 'rule name');
  assertEq(r.rule.comparison_agent_ids, [], 'parsed empty array');
}

// ============================================================================
// resolveAgent: component-only
// ============================================================================
console.log('\n── resolveAgent: component-only ───────────────────────────');

resetState();
agentMap['a1'] = { id: 'a1', name: 'A1', provider: 'p', status: 'active' };
responders = [
  {
    match: /FROM agent_routing_rules/,
    respond: () => [
      { id: 'r-comp', rule_name: 'comp', component: 'frontend', prompt_type: null, agent_id: 'a1', priority: 20, is_multi_agent: 0, comparison_agent_ids: null, active: 1 },
    ],
  },
];
{
  const r = await resolveAgent('frontend', 'plan');
  assertEq(r.rule.id, 'r-comp', 'component-only matches');
}

// ============================================================================
// resolveAgent: type-only
// ============================================================================
console.log('\n── resolveAgent: type-only ────────────────────────────────');

resetState();
agentMap['a1'] = { id: 'a1', name: 'A1', provider: 'p', status: 'active' };
responders = [
  {
    match: /FROM agent_routing_rules/,
    respond: () => [
      { id: 'r-type', rule_name: 'type', component: null, prompt_type: 'verification', agent_id: 'a1', priority: 30, is_multi_agent: 0, comparison_agent_ids: null, active: 1 },
    ],
  },
];
{
  const r = await resolveAgent('anything', 'verification');
  assertEq(r.rule.id, 'r-type', 'type-only matches');
}

// ============================================================================
// resolveAgent: catch-all
// ============================================================================
console.log('\n── resolveAgent: catch-all ────────────────────────────────');

resetState();
agentMap['a1'] = { id: 'a1', name: 'A1', provider: 'p', status: 'active' };
responders = [
  {
    match: /FROM agent_routing_rules/,
    respond: () => [
      { id: 'r-all', rule_name: 'all', component: null, prompt_type: null, agent_id: 'a1', priority: 100, is_multi_agent: 0, comparison_agent_ids: null, active: 1 },
    ],
  },
];
{
  const r = await resolveAgent('weird', 'unknown');
  assertEq(r.rule.id, 'r-all', 'catch-all matches when nothing else does');
}

// ============================================================================
// resolveAgent: first-match-wins (priority order)
// ============================================================================
console.log('\n── resolveAgent: first-match-wins ─────────────────────────');

resetState();
agentMap['a1'] = { id: 'a1', name: 'A1', provider: 'p', status: 'active' };
agentMap['a2'] = { id: 'a2', name: 'A2', provider: 'p', status: 'active' };
// Rules returned in priority-asc order by SUT's SQL
responders = [
  {
    match: /FROM agent_routing_rules/,
    respond: () => [
      { id: 'r1', rule_name: 'hi', component: 'backend', prompt_type: 'plan', agent_id: 'a1', priority: 5, is_multi_agent: 0, comparison_agent_ids: null, active: 1 },
      { id: 'r2', rule_name: 'lo', component: 'backend', prompt_type: 'plan', agent_id: 'a2', priority: 50, is_multi_agent: 0, comparison_agent_ids: null, active: 1 },
    ],
  },
];
{
  const r = await resolveAgent('backend', 'plan');
  assertEq(r.rule.id, 'r1', 'first (priority 5) wins');
  assertEq(r.primary_agent.id, 'a1', 'primary agent from first rule');
}

// ============================================================================
// resolveAgent: multi-agent
// ============================================================================
console.log('\n── resolveAgent: multi-agent ──────────────────────────────');

resetState();
agentMap['a1'] = { id: 'a1', name: 'A1', provider: 'p', status: 'active' };
agentMap['a2'] = { id: 'a2', name: 'A2', provider: 'p', status: 'active' };
agentMap['a3'] = { id: 'a3', name: 'A3', provider: 'p', status: 'inactive' };  // should be filtered
responders = [
  {
    match: /FROM agent_routing_rules/,
    respond: () => [
      {
        id: 'r-multi', rule_name: 'multi', component: 'backend', prompt_type: 'plan',
        agent_id: 'a1', priority: 10, is_multi_agent: 1,
        comparison_agent_ids: JSON.stringify(['a2', 'a3']), active: 1,
      },
    ],
  },
];
{
  const r = await resolveAgent('backend', 'plan');
  assertEq(r.primary_agent.id, 'a1', 'primary a1');
  assertEq(r.comparison_agents.length, 1, 'inactive filtered');
  assertEq(r.comparison_agents[0].id, 'a2', 'only a2 included');
  assertEq(r.is_multi_agent, true, 'is_multi_agent true');
  assertEq(r.rule.comparison_agent_ids, ['a2', 'a3'], 'rule comparison_agent_ids parsed');
}

// ============================================================================
// resolveAgent: multi-agent flag but no active comparisons → false
// ============================================================================
console.log('\n── resolveAgent: multi-agent w/o comparisons ──────────────');

resetState();
agentMap['a1'] = { id: 'a1', name: 'A1', provider: 'p', status: 'active' };
agentMap['a3'] = { id: 'a3', name: 'A3', provider: 'p', status: 'inactive' };
responders = [
  {
    match: /FROM agent_routing_rules/,
    respond: () => [
      {
        id: 'r', rule_name: 'x', component: 'backend', prompt_type: 'plan',
        agent_id: 'a1', priority: 10, is_multi_agent: 1,
        comparison_agent_ids: JSON.stringify(['a3']), active: 1,
      },
    ],
  },
];
{
  const r = await resolveAgent('backend', 'plan');
  assertEq(r.is_multi_agent, false, 'is_multi_agent false when no active comparisons');
}

// ============================================================================
// resolveAgent: fallback to default agent
// ============================================================================
console.log('\n── resolveAgent: fallback default ─────────────────────────');

resetState();
responders = [
  { match: /FROM agent_routing_rules/, respond: () => [] },
  {
    match: /FROM agent_registry WHERE status/,
    respond: () => [
      {
        id: 'def', name: 'Default', provider: 'p', status: 'active', default_priority: 1,
        capabilities: JSON.stringify(['plan', 'impl']),
        config: JSON.stringify({ temperature: 0.5 }),
      },
    ],
  },
];
{
  const r = await resolveAgent('anything', 'anything');
  assertEq(r.primary_agent.id, 'def', 'default agent id');
  assertEq(r.primary_agent.capabilities, ['plan', 'impl'], 'capabilities parsed');
  assertEq(r.primary_agent.config, { temperature: 0.5 }, 'config parsed');
  assertEq(r.rule, null, 'no rule matched');
  assertEq(r.is_multi_agent, false, 'not multi-agent');
}

// ============================================================================
// resolveAgent: no rules AND no default agents → throws
// ============================================================================
console.log('\n── resolveAgent: nothing configured ───────────────────────');

resetState();
responders = [
  { match: /FROM agent_routing_rules/, respond: () => [] },
  { match: /FROM agent_registry WHERE status/, respond: () => [] },
];
{
  let err: Error | null = null;
  try { await resolveAgent(null, null); } catch (e: any) { err = e; }
  assert(err !== null, 'throws');
  assert(err !== null && /No active agents/.test(err.message), 'error mentions missing agents');
}

// ============================================================================
// previewRoute
// ============================================================================
console.log('\n── previewRoute ───────────────────────────────────────────');

resetState();
agentMap['a1'] = { id: 'a1', name: 'A1', provider: 'anthropic', status: 'active' };
agentMap['a2'] = { id: 'a2', name: 'A2', provider: 'openai', status: 'active' };
responders = [
  {
    match: /FROM agent_routing_rules/,
    respond: () => [
      {
        id: 'r-prev', rule_name: 'preview rule', component: 'frontend', prompt_type: 'plan',
        agent_id: 'a1', priority: 15, is_multi_agent: 1,
        comparison_agent_ids: JSON.stringify(['a2']), active: 1,
      },
    ],
  },
];
{
  const out = await previewRoute('frontend', 'plan');
  assertEq(out.component, 'frontend', 'component echoed');
  assertEq(out.prompt_type, 'plan', 'prompt_type echoed');
  assertEq(out.primary_agent, { id: 'a1', name: 'A1', provider: 'anthropic' }, 'primary shape');
  assertEq(out.comparison_agents, [{ id: 'a2', name: 'A2', provider: 'openai' }], 'comparisons shape');
  assertEq(out.matched_rule, { id: 'r-prev', rule_name: 'preview rule', priority: 15 }, 'matched rule shape');
  assertEq(out.is_multi_agent, true, 'is_multi_agent');
}

// ============================================================================
// listRules: no filters
// ============================================================================
console.log('\n── listRules ──────────────────────────────────────────────');

resetState();
responders = [
  {
    match: /FROM agent_routing_rules/,
    respond: (params) => {
      // Sanity check: no WHERE binding beyond the default 1=1
      return [
        { id: 'x', rule_name: 'x', component: null, prompt_type: null, agent_id: 'a1', priority: 50, is_multi_agent: 0, comparison_agent_ids: null, active: 1, agent_name: 'A', agent_provider: 'p' },
      ];
    },
  },
];
{
  const rules = await listRules();
  assertEq(rules.length, 1, '1 rule returned');
  assertEq(rules[0].id, 'x', 'correct id');
  assertEq(rules[0].comparison_agent_ids, [], 'empty array parsed');
  // No params bound
  assertEq(queryLog[0].params, [], 'no params when no filters');
}

// listRules with active filter
resetState();
responders = [
  { match: /FROM agent_routing_rules/, respond: () => [] },
];
await listRules({ active: true });
assertEq(queryLog[0].params, [1], 'active=true → 1 bound');

resetState();
responders = [
  { match: /FROM agent_routing_rules/, respond: () => [] },
];
await listRules({ active: false });
assertEq(queryLog[0].params, [0], 'active=false → 0 bound');

resetState();
responders = [
  { match: /FROM agent_routing_rules/, respond: () => [] },
];
await listRules({ component: 'backend' });
assertEq(queryLog[0].params, ['backend'], 'component bound');

resetState();
responders = [
  { match: /FROM agent_routing_rules/, respond: () => [] },
];
await listRules({ active: true, component: 'backend' });
assertEq(queryLog[0].params, [1, 'backend'], 'both filters bound in order');

// ============================================================================
// createRule: validation
// ============================================================================
console.log('\n── createRule: validation ─────────────────────────────────');

resetState();
{
  let err: Error | null = null;
  try { await createRule({} as any); } catch (e: any) { err = e; }
  assert(err !== null && /rule_name and agent_id/.test(err.message), 'missing fields throws');
}

resetState();
{
  let err: Error | null = null;
  try {
    await createRule({ rule_name: 'x', agent_id: 'a1', prompt_type: 'bogus' } as any);
  } catch (e: any) { err = e; }
  assert(err !== null && /Invalid prompt_type/.test(err.message), 'invalid prompt_type throws');
}

// Agent not found
resetState();
{
  let err: Error | null = null;
  try {
    await createRule({ rule_name: 'x', agent_id: 'nope' } as any);
  } catch (e: any) { err = e; }
  assert(err !== null && /Agent not found/.test(err.message), 'unknown agent throws');
}

// Comparison agent not found
resetState();
agentMap['a1'] = { id: 'a1', name: 'A1' };
{
  let err: Error | null = null;
  try {
    await createRule({
      rule_name: 'x', agent_id: 'a1',
      is_multi_agent: true, comparison_agent_ids: ['ghost'],
    } as any);
  } catch (e: any) { err = e; }
  assert(err !== null && /Comparison agent not found/.test(err.message), 'unknown comparison throws');
}

// ============================================================================
// createRule: happy path
// ============================================================================
console.log('\n── createRule: happy path ─────────────────────────────────');

resetState();
agentMap['a1'] = { id: 'a1', name: 'A1' };
agentMap['a2'] = { id: 'a2', name: 'A2' };
responders = [
  { match: /INSERT INTO agent_routing_rules/, respond: () => ({}) },
];
{
  const out = await createRule({
    rule_name: 'test',
    component: 'backend',
    prompt_type: 'plan',
    agent_id: 'a1',
    priority: 25,
    is_multi_agent: true,
    comparison_agent_ids: ['a2'],
  } as any);
  assertEq(out, { rule_id: 'uuid-1' }, 'returns new rule_id');
  // The INSERT should have the correct params
  const insert = queryLog.find(q => /INSERT INTO agent_routing_rules/.test(q.sql));
  assert(insert !== undefined, 'INSERT executed');
  assertEq(insert!.params[0], 'uuid-1', 'id');
  assertEq(insert!.params[1], 'test', 'rule_name');
  assertEq(insert!.params[2], 'backend', 'component');
  assertEq(insert!.params[3], 'plan', 'prompt_type');
  assertEq(insert!.params[4], 'a1', 'agent_id');
  assertEq(insert!.params[5], 25, 'priority');
  assertEq(insert!.params[6], 1, 'is_multi_agent 1');
  assertEq(insert!.params[7], JSON.stringify(['a2']), 'comparison ids JSON');
}

// Defaults: priority=50, component/prompt_type null, is_multi_agent 0, ids null
resetState();
agentMap['a1'] = { id: 'a1', name: 'A1' };
responders = [
  { match: /INSERT INTO agent_routing_rules/, respond: () => ({}) },
];
{
  await createRule({ rule_name: 'defaults', agent_id: 'a1' } as any);
  const insert = queryLog.find(q => /INSERT INTO agent_routing_rules/.test(q.sql));
  assertEq(insert!.params[2], null, 'component default null');
  assertEq(insert!.params[3], null, 'prompt_type default null');
  assertEq(insert!.params[5], 50, 'priority default 50');
  assertEq(insert!.params[6], 0, 'is_multi_agent default 0');
  assertEq(insert!.params[7], null, 'comparison_ids default null');
}

// ============================================================================
// updateRule
// ============================================================================
console.log('\n── updateRule ─────────────────────────────────────────────');

// No valid fields
resetState();
{
  let err: Error | null = null;
  try { await updateRule('r1', { bogus: 'x' } as any); } catch (e: any) { err = e; }
  assert(err !== null && /No valid fields/.test(err.message), 'no-fields throws');
}

// Rule not found
resetState();
responders = [
  { match: /UPDATE agent_routing_rules/, respond: () => ({ affectedRows: 0 }) },
];
{
  let err: Error | null = null;
  try { await updateRule('ghost', { active: false }); } catch (e: any) { err = e; }
  assert(err !== null && /Rule not found/.test(err.message), 'affected=0 throws');
}

// Happy path with all field types
resetState();
responders = [
  { match: /UPDATE agent_routing_rules/, respond: () => ({ affectedRows: 1 }) },
];
{
  const out = await updateRule('r1', {
    rule_name: 'newname',
    component: 'backend',
    prompt_type: 'plan',
    priority: 5,
    is_multi_agent: true,
    comparison_agent_ids: ['a1'],
    active: false,
  });
  assertEq(out, { success: true }, 'returns success');
  const upd = queryLog.find(q => /UPDATE agent_routing_rules/.test(q.sql));
  assert(upd !== undefined, 'UPDATE executed');
  // Params: [rule_name, component, prompt_type, priority, is_multi_agent, comparison_ids, active, id]
  assertEq(upd!.params[0], 'newname', 'rule_name');
  assertEq(upd!.params[4], 1, 'is_multi_agent 1');
  assertEq(upd!.params[5], JSON.stringify(['a1']), 'comparison JSON');
  assertEq(upd!.params[6], 0, 'active 0');
  assertEq(upd!.params[7], 'r1', 'id at end');
  // SET clause contains expected keys
  assert(/rule_name = \?/.test(upd!.sql), 'rule_name in SET');
  assert(/active = \?/.test(upd!.sql), 'active in SET');
}

// Null comparison_agent_ids → null
resetState();
responders = [
  { match: /UPDATE agent_routing_rules/, respond: () => ({ affectedRows: 1 }) },
];
{
  await updateRule('r1', { comparison_agent_ids: null } as any);
  const upd = queryLog.find(q => /UPDATE agent_routing_rules/.test(q.sql));
  assertEq(upd!.params[0], null, 'null ids passed through');
}

// ============================================================================
// deleteRule
// ============================================================================
console.log('\n── deleteRule ─────────────────────────────────────────────');

// Not found
resetState();
responders = [
  { match: /DELETE FROM agent_routing_rules/, respond: () => ({ affectedRows: 0 }) },
];
{
  let err: Error | null = null;
  try { await deleteRule('ghost'); } catch (e: any) { err = e; }
  assert(err !== null && /Rule not found/.test(err.message), 'affected=0 throws');
}

// Happy path
resetState();
responders = [
  { match: /DELETE FROM agent_routing_rules/, respond: () => ({ affectedRows: 1 }) },
];
{
  const out = await deleteRule('r1');
  assertEq(out, { success: true }, 'success');
  assertEq(queryLog[0].params, ['r1'], 'id bound');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

}

main().catch((e) => {
  console.error('Unhandled:', e);
  process.exit(1);
});
