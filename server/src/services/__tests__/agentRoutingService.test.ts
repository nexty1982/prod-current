#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRoutingService.js (OMD-1208)
 *
 * Routes prompts to agents via deterministic first-match-wins rules, with
 * fallback to the lowest-priority active agent in agent_registry.
 *
 * External deps (all stubbed via require.cache BEFORE loading the SUT):
 *   - `../config/db`          getAppPool → fake pool with regex-dispatched SQL
 *   - `./agentRegistryService` getAgent  → returns agents from an in-memory map
 *   - `uuid`                  v4        → returns a deterministic value
 *
 * Coverage:
 *   - VALID_PROMPT_TYPES export
 *   - resolveAgent:
 *       · exact match (component AND prompt_type)
 *       · component-only match
 *       · prompt_type-only match
 *       · catch-all rule
 *       · first-match-wins (priority ordering)
 *       · multi-agent mode: comparison agents resolved + filtered to active
 *       · multi-agent mode: falls back to single-agent when no active
 *         comparison agents remain
 *       · no matching rule → fallback to lowest-default-priority active agent
 *       · no rules + no active agents → throws
 *       · fallback parses capabilities/config JSON fields
 *   - previewRoute: shape check, maps rule + agents, honors multi-agent
 *   - listRules: no filters, active filter, component filter, both filters,
 *     _parseRule called (comparison_agent_ids parsed to array)
 *   - createRule:
 *       · validates rule_name + agent_id required
 *       · validates prompt_type against VALID_PROMPT_TYPES
 *       · verifies agent exists
 *       · verifies all comparison agents exist
 *       · inserts with default priority 50 / is_multi_agent coercion
 *       · stores comparison_agent_ids as JSON
 *       · assigns uuid
 *   - updateRule:
 *       · whitelist enforcement
 *       · JSON-serialization of comparison_agent_ids
 *       · boolean → 0/1 coercion for is_multi_agent / active
 *       · throws when no valid fields
 *       · throws when affectedRows === 0
 *   - deleteRule:
 *       · happy path
 *       · throws when not found
 *   - _parseJSON via rule round-trip (bad JSON → fallback)
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

// ── Fake pool ───────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Responder = { match: RegExp; respond: (params: any[]) => any };
let responders: Responder[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of responders) {
      if (r.match.test(sql)) {
        return [r.respond(params)];
      }
    }
    return [[]];
  },
};

function resetState() {
  queryLog.length = 0;
  responders = [];
}

// ── Fake agentRegistry ──────────────────────────────────────────────
const agentMap = new Map<string, any>();
const registryStub = {
  getAgent: async (id: string) => agentMap.get(id) || null,
};
function setAgent(id: string, agent: any) {
  agentMap.set(id, agent);
}
function clearAgents() {
  agentMap.clear();
}

// ── Stubs via require.cache (before SUT load) ───────────────────────
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

const registryPath = require.resolve('../agentRegistryService');
require.cache[registryPath] = {
  id: registryPath, filename: registryPath, loaded: true,
  exports: registryStub,
} as any;

let nextUuid = 'rule-uuid-001';
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

// Silence console
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

// ── Helpers ─────────────────────────────────────────────────────────
function makeRule(overrides: any = {}) {
  return {
    id: 'rule-1',
    rule_name: 'R1',
    component: null,
    prompt_type: null,
    agent_id: 'agent-1',
    priority: 50,
    active: 1,
    is_multi_agent: 0,
    comparison_agent_ids: null,
    agent_name: 'Claude',
    agent_status: 'active',
    ...overrides,
  };
}

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
// resolveAgent — exact match (component + prompt_type)
// ============================================================================
console.log('\n── resolveAgent: exact match ─────────────────────────────');

{
  resetState();
  clearAgents();
  setAgent('agent-1', { id: 'agent-1', name: 'Claude', provider: 'anthropic', status: 'active' });

  responders = [
    {
      match: /FROM agent_routing_rules/,
      respond: () => [
        makeRule({ id: 'r1', priority: 10, component: 'backend', prompt_type: 'implementation', agent_id: 'agent-1' }),
      ],
    },
  ];

  const result = await resolveAgent('backend', 'implementation');
  assertEq(result.primary_agent.id, 'agent-1', 'primary agent resolved');
  assertEq(result.rule.id, 'r1', 'matched rule id');
  assertEq(result.is_multi_agent, false, 'not multi-agent');
  assertEq(result.comparison_agents, [], 'no comparison agents');
}

// ============================================================================
// resolveAgent — component-only match
// ============================================================================
console.log('\n── resolveAgent: component-only ──────────────────────────');

{
  resetState();
  clearAgents();
  setAgent('agent-2', { id: 'agent-2', name: 'GPT', provider: 'openai', status: 'active' });

  responders = [
    {
      match: /FROM agent_routing_rules/,
      respond: () => [
        makeRule({ id: 'r2', priority: 20, component: 'frontend', prompt_type: null, agent_id: 'agent-2' }),
      ],
    },
  ];

  const result = await resolveAgent('frontend', 'plan');
  assertEq(result.primary_agent.id, 'agent-2', 'component-only match hits');
  assertEq(result.rule.id, 'r2', 'rule id');
}

// ============================================================================
// resolveAgent — prompt_type-only match
// ============================================================================
console.log('\n── resolveAgent: prompt_type-only ────────────────────────');

{
  resetState();
  clearAgents();
  setAgent('agent-3', { id: 'agent-3', name: 'Gemini', provider: 'google', status: 'active' });

  responders = [
    {
      match: /FROM agent_routing_rules/,
      respond: () => [
        makeRule({ id: 'r3', priority: 30, component: null, prompt_type: 'verification', agent_id: 'agent-3' }),
      ],
    },
  ];

  const result = await resolveAgent('any-comp', 'verification');
  assertEq(result.primary_agent.id, 'agent-3', 'type-only match hits');
}

// ============================================================================
// resolveAgent — catch-all rule
// ============================================================================
console.log('\n── resolveAgent: catch-all ───────────────────────────────');

{
  resetState();
  clearAgents();
  setAgent('agent-all', { id: 'agent-all', name: 'Catch', provider: 'local', status: 'active' });

  responders = [
    {
      match: /FROM agent_routing_rules/,
      respond: () => [
        makeRule({ id: 'r0', priority: 99, component: null, prompt_type: null, agent_id: 'agent-all' }),
      ],
    },
  ];

  const result = await resolveAgent('random', 'docs');
  assertEq(result.primary_agent.id, 'agent-all', 'catch-all matches everything');
}

// ============================================================================
// resolveAgent — first-match-wins by priority
// ============================================================================
console.log('\n── resolveAgent: first-match-wins ────────────────────────');

{
  resetState();
  clearAgents();
  setAgent('agent-hi', { id: 'agent-hi', name: 'High', provider: 'p', status: 'active' });
  setAgent('agent-lo', { id: 'agent-lo', name: 'Low', provider: 'p', status: 'active' });

  // SQL orders by priority ASC (lower number = higher priority)
  // Our fake pool returns rows in insertion order, so we mimic that ordering.
  responders = [
    {
      match: /FROM agent_routing_rules/,
      respond: () => [
        makeRule({ id: 'r10', priority: 10, component: 'backend', prompt_type: null, agent_id: 'agent-hi' }),
        makeRule({ id: 'r20', priority: 20, component: 'backend', prompt_type: 'plan', agent_id: 'agent-lo' }),
        makeRule({ id: 'r99', priority: 99, component: null, prompt_type: null, agent_id: 'agent-hi' }),
      ],
    },
  ];

  const result = await resolveAgent('backend', 'plan');
  // Both r10 and r20 could match. First in iteration order wins (r10 has priority 10).
  assertEq(result.primary_agent.id, 'agent-hi', 'highest-priority rule wins');
  assertEq(result.rule.id, 'r10', 'r10 selected');
}

// ============================================================================
// resolveAgent — multi-agent mode with active comparison agents
// ============================================================================
console.log('\n── resolveAgent: multi-agent mode ────────────────────────');

{
  resetState();
  clearAgents();
  setAgent('primary', { id: 'primary', name: 'P', provider: 'p', status: 'active' });
  setAgent('comp-1', { id: 'comp-1', name: 'C1', provider: 'p', status: 'active' });
  setAgent('comp-2', { id: 'comp-2', name: 'C2', provider: 'p', status: 'inactive' });
  setAgent('comp-3', { id: 'comp-3', name: 'C3', provider: 'p', status: 'active' });

  responders = [
    {
      match: /FROM agent_routing_rules/,
      respond: () => [
        makeRule({
          id: 'rmulti',
          component: 'backend',
          prompt_type: 'implementation',
          agent_id: 'primary',
          is_multi_agent: 1,
          comparison_agent_ids: JSON.stringify(['comp-1', 'comp-2', 'comp-3']),
        }),
      ],
    },
  ];

  const result = await resolveAgent('backend', 'implementation');
  assertEq(result.primary_agent.id, 'primary', 'primary');
  assertEq(result.comparison_agents.length, 2, '2 active comparison agents (comp-2 filtered)');
  assertEq(result.comparison_agents.map((a: any) => a.id), ['comp-1', 'comp-3'], 'correct comparison order');
  assertEq(result.is_multi_agent, true, 'is_multi_agent true');
}

// ============================================================================
// resolveAgent — multi-agent but all comparison agents inactive → single-agent
// ============================================================================
console.log('\n── resolveAgent: multi-agent with no active peers ────────');

{
  resetState();
  clearAgents();
  setAgent('primary', { id: 'primary', name: 'P', provider: 'p', status: 'active' });
  setAgent('c-dead', { id: 'c-dead', name: 'C', provider: 'p', status: 'inactive' });

  responders = [
    {
      match: /FROM agent_routing_rules/,
      respond: () => [
        makeRule({
          id: 'rmulti-dead',
          agent_id: 'primary',
          is_multi_agent: 1,
          comparison_agent_ids: JSON.stringify(['c-dead']),
        }),
      ],
    },
  ];

  const result = await resolveAgent('x', 'y');
  assertEq(result.is_multi_agent, false, 'downgrades to single when no active peers');
  assertEq(result.comparison_agents, [], 'empty comparison_agents');
}

// ============================================================================
// resolveAgent — no rule matches → fallback to default
// ============================================================================
console.log('\n── resolveAgent: fallback default ────────────────────────');

{
  resetState();
  clearAgents();
  // Default agent fetched directly (not through registry stub) — comes from
  // the SELECT FROM agent_registry fallback query.
  let idx = 0;
  responders = [
    {
      match: /FROM agent_routing_rules/,
      respond: () => {
        // Return a rule that matches nothing (component set, but we'll query with different)
        return [makeRule({ id: 'r-unmatch', component: 'zzz', prompt_type: 'implementation' })];
      },
    },
    {
      match: /FROM agent_registry WHERE status/,
      respond: () => [{
        id: 'default-agent',
        name: 'Default',
        provider: 'local',
        status: 'active',
        default_priority: 1,
        capabilities: '["planning","coding"]',
        config: '{"temperature":0.7}',
      }],
    },
  ];

  const result = await resolveAgent('other-component', 'docs');
  assertEq(result.primary_agent.id, 'default-agent', 'fallback agent id');
  assertEq(result.primary_agent.capabilities, ['planning', 'coding'], 'capabilities JSON-parsed');
  assertEq(result.primary_agent.config, { temperature: 0.7 }, 'config JSON-parsed');
  assertEq(result.rule, null, 'no rule matched');
  assertEq(result.is_multi_agent, false, 'single-agent fallback');
}

// ============================================================================
// resolveAgent — no rules + no active agents → throws
// ============================================================================
console.log('\n── resolveAgent: no agents configured ────────────────────');

{
  resetState();
  responders = [
    { match: /FROM agent_routing_rules/, respond: () => [] },
    { match: /FROM agent_registry/, respond: () => [] },
  ];

  let caught: Error | null = null;
  try {
    await resolveAgent('x', 'y');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when no agents');
  assert(
    caught !== null && caught.message.includes('No active agents configured'),
    'error message matches'
  );
}

// ============================================================================
// previewRoute
// ============================================================================
console.log('\n── previewRoute ──────────────────────────────────────────');

{
  resetState();
  clearAgents();
  setAgent('primary', { id: 'primary', name: 'P', provider: 'anthropic', status: 'active' });
  setAgent('cmp', { id: 'cmp', name: 'CMP', provider: 'openai', status: 'active' });

  responders = [
    {
      match: /FROM agent_routing_rules/,
      respond: () => [
        makeRule({
          id: 'rp',
          rule_name: 'Preview Rule',
          priority: 5,
          component: 'backend',
          prompt_type: 'plan',
          agent_id: 'primary',
          is_multi_agent: 1,
          comparison_agent_ids: JSON.stringify(['cmp']),
        }),
      ],
    },
  ];

  const preview = await previewRoute('backend', 'plan');
  assertEq(preview.component, 'backend', 'component');
  assertEq(preview.prompt_type, 'plan', 'prompt_type');
  assertEq(preview.primary_agent.id, 'primary', 'primary id');
  assertEq(preview.primary_agent.provider, 'anthropic', 'primary provider');
  assertEq(preview.comparison_agents.length, 1, '1 comparison');
  assertEq(preview.comparison_agents[0].id, 'cmp', 'comparison id');
  assertEq(preview.comparison_agents[0].provider, 'openai', 'comparison provider');
  assertEq(preview.matched_rule.id, 'rp', 'matched rule id');
  assertEq(preview.matched_rule.rule_name, 'Preview Rule', 'rule name');
  assertEq(preview.matched_rule.priority, 5, 'priority');
  assertEq(preview.is_multi_agent, true, 'is_multi_agent');
}

// previewRoute with fallback (no rule) → matched_rule = null
{
  resetState();
  clearAgents();
  responders = [
    { match: /FROM agent_routing_rules/, respond: () => [] },
    {
      match: /FROM agent_registry/,
      respond: () => [{
        id: 'd', name: 'D', provider: 'local', status: 'active',
        default_priority: 1, capabilities: null, config: null,
      }],
    },
  ];
  const preview = await previewRoute('x', 'y');
  assertEq(preview.matched_rule, null, 'no matched_rule when fallback');
  assertEq(preview.primary_agent.id, 'd', 'default agent in preview');
}

// ============================================================================
// listRules — no filters
// ============================================================================
console.log('\n── listRules: no filters ─────────────────────────────────');

{
  resetState();
  responders = [
    {
      match: /FROM agent_routing_rules/,
      respond: (params) => {
        return [
          { id: 'r1', rule_name: 'R1', comparison_agent_ids: null, priority: 10 },
          { id: 'r2', rule_name: 'R2', comparison_agent_ids: JSON.stringify(['a', 'b']), priority: 20 },
        ];
      },
    },
  ];
  const rules = await listRules();
  assertEq(rules.length, 2, '2 rules returned');
  assertEq(rules[0].comparison_agent_ids, [], 'null → empty array');
  assertEq(rules[1].comparison_agent_ids, ['a', 'b'], 'parsed JSON');
  assertEq(queryLog[0].params, [], 'no params with no filters');
}

// ============================================================================
// listRules — active + component filters
// ============================================================================
console.log('\n── listRules: filters ────────────────────────────────────');

{
  resetState();
  responders = [
    { match: /FROM agent_routing_rules/, respond: () => [] },
  ];
  await listRules({ active: true, component: 'backend' });
  const sql = queryLog[0].sql;
  assert(sql.includes('r.active = ?'), 'active clause');
  assert(sql.includes('r.component = ?'), 'component clause');
  assertEq(queryLog[0].params, [1, 'backend'], 'params order');

  resetState();
  responders = [{ match: /FROM agent_routing_rules/, respond: () => [] }];
  await listRules({ active: false });
  assertEq(queryLog[0].params, [0], 'active false → 0');
}

// ============================================================================
// createRule — validation
// ============================================================================
console.log('\n── createRule: validation ────────────────────────────────');

{
  // Missing rule_name
  let caught: Error | null = null;
  try {
    await createRule({ agent_id: 'a' });
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('rule_name and agent_id are required'), 'rejects missing rule_name');

  caught = null;
  try {
    await createRule({ rule_name: 'R' });
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('required'), 'rejects missing agent_id');

  // Invalid prompt_type
  caught = null;
  try {
    await createRule({ rule_name: 'R', agent_id: 'a', prompt_type: 'bogus' });
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Invalid prompt_type'), 'rejects bad prompt_type');

  // Agent not found
  clearAgents();
  caught = null;
  try {
    await createRule({ rule_name: 'R', agent_id: 'missing' });
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Agent not found'), 'rejects missing agent');

  // Comparison agent not found
  clearAgents();
  setAgent('a', { id: 'a', name: 'A', status: 'active' });
  caught = null;
  try {
    await createRule({
      rule_name: 'R',
      agent_id: 'a',
      is_multi_agent: true,
      comparison_agent_ids: ['missing'],
    });
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Comparison agent not found'), 'rejects missing comparison agent');
}

// ============================================================================
// createRule — happy path with defaults
// ============================================================================
console.log('\n── createRule: happy path ────────────────────────────────');

{
  resetState();
  clearAgents();
  setAgent('a', { id: 'a', name: 'A', status: 'active' });
  nextUuid = 'new-rule-uuid-42';
  responders = [
    { match: /INSERT INTO agent_routing_rules/, respond: () => ({ affectedRows: 1 }) },
  ];

  const result = await createRule({
    rule_name: 'R',
    agent_id: 'a',
    // priority omitted → default 50
    // is_multi_agent omitted → 0
  });
  assertEq(result.rule_id, 'new-rule-uuid-42', 'uuid used as rule_id');
  assertEq(queryLog.length, 1, '1 INSERT query');
  const params = queryLog[0].params;
  // [id, rule_name, component, prompt_type, agent_id, priority, is_multi_agent, comparison_agent_ids]
  assertEq(params[0], 'new-rule-uuid-42', 'id param');
  assertEq(params[1], 'R', 'rule_name');
  assertEq(params[2], null, 'component null');
  assertEq(params[3], null, 'prompt_type null');
  assertEq(params[4], 'a', 'agent_id');
  assertEq(params[5], 50, 'priority default 50');
  assertEq(params[6], 0, 'is_multi_agent coerced to 0');
  assertEq(params[7], null, 'comparison_agent_ids null');
}

// ============================================================================
// createRule — with comparison_agent_ids serialized
// ============================================================================
console.log('\n── createRule: with comparison agents ────────────────────');

{
  resetState();
  clearAgents();
  setAgent('primary', { id: 'primary', name: 'P', status: 'active' });
  setAgent('c1', { id: 'c1', name: 'C1', status: 'active' });
  setAgent('c2', { id: 'c2', name: 'C2', status: 'active' });
  nextUuid = 'uuid-multi';
  responders = [
    { match: /INSERT INTO agent_routing_rules/, respond: () => ({ affectedRows: 1 }) },
  ];

  await createRule({
    rule_name: 'Multi',
    component: 'backend',
    prompt_type: 'implementation',
    agent_id: 'primary',
    priority: 5,
    is_multi_agent: true,
    comparison_agent_ids: ['c1', 'c2'],
  });
  const p = queryLog[0].params;
  assertEq(p[2], 'backend', 'component');
  assertEq(p[3], 'implementation', 'prompt_type');
  assertEq(p[5], 5, 'priority');
  assertEq(p[6], 1, 'is_multi_agent coerced to 1');
  assertEq(p[7], JSON.stringify(['c1', 'c2']), 'comparison ids JSON-serialized');
}

// ============================================================================
// updateRule — whitelist + coercion + affectedRows
// ============================================================================
console.log('\n── updateRule: whitelist ─────────────────────────────────');

{
  resetState();
  responders = [
    { match: /UPDATE agent_routing_rules/, respond: () => ({ affectedRows: 1 }) },
  ];
  const result = await updateRule('rid', {
    rule_name: 'Renamed',
    is_multi_agent: true,
    active: false,
    comparison_agent_ids: ['x', 'y'],
    bogus: 'ignored',
  });
  assertEq(result, { success: true }, 'success return');
  const sql = queryLog[0].sql;
  assert(sql.includes('rule_name = ?'), 'rule_name set');
  assert(sql.includes('is_multi_agent = ?'), 'is_multi_agent set');
  assert(sql.includes('active = ?'), 'active set');
  assert(sql.includes('comparison_agent_ids = ?'), 'comparison set');
  assert(!sql.includes('bogus'), 'bogus ignored');
  // The SUT walks `allowed` in declaration order: [rule_name, component,
  // prompt_type, agent_id, priority, is_multi_agent, comparison_agent_ids, active]
  // For this input the pushed params are:
  // [rule_name='Renamed', is_multi_agent=1, comparison_agent_ids=JSON, active=0, id]
  const p = queryLog[0].params;
  assertEq(p[0], 'Renamed', 'rule_name param (first in allowed)');
  assertEq(p[1], 1, 'is_multi_agent → 1');
  assertEq(p[2], JSON.stringify(['x', 'y']), 'comparison JSON (before active)');
  assertEq(p[3], 0, 'active false → 0 (last whitelisted field)');
  assertEq(p[4], 'rid', 'where id param');
}

// updateRule — comparison_agent_ids = null stays null
{
  resetState();
  responders = [{ match: /UPDATE agent_routing_rules/, respond: () => ({ affectedRows: 1 }) }];
  await updateRule('rid', { comparison_agent_ids: null });
  assertEq(queryLog[0].params, [null, 'rid'], 'null comparison passed through');
}

// updateRule — no valid fields → throws
{
  resetState();
  let caught: Error | null = null;
  try {
    await updateRule('rid', { bogus_only: 'x' });
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('No valid fields'), 'throws for empty whitelist');
  assertEq(queryLog.length, 0, 'no query emitted');
}

// updateRule — affectedRows 0 → throws 'Rule not found'
{
  resetState();
  responders = [{ match: /UPDATE agent_routing_rules/, respond: () => ({ affectedRows: 0 }) }];
  let caught: Error | null = null;
  try {
    await updateRule('rid', { rule_name: 'X' });
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Rule not found'), 'throws when not found');
}

// ============================================================================
// deleteRule
// ============================================================================
console.log('\n── deleteRule ────────────────────────────────────────────');

{
  resetState();
  responders = [
    { match: /DELETE FROM agent_routing_rules/, respond: () => ({ affectedRows: 1 }) },
  ];
  const result = await deleteRule('rid');
  assertEq(result, { success: true }, 'success');
  assertEq(queryLog[0].params, ['rid'], 'id param');
}

{
  resetState();
  responders = [
    { match: /DELETE FROM agent_routing_rules/, respond: () => ({ affectedRows: 0 }) },
  ];
  let caught: Error | null = null;
  try {
    await deleteRule('missing');
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Rule not found'), 'throws when not found');
}

// ============================================================================
// _parseJSON via listRules — malformed JSON returns fallback
// ============================================================================
console.log('\n── _parseJSON: malformed fallback ────────────────────────');

{
  resetState();
  responders = [
    {
      match: /FROM agent_routing_rules/,
      respond: () => [
        { id: 'r', rule_name: 'R', comparison_agent_ids: '{not json' },
      ],
    },
  ];
  const rules = await listRules();
  assertEq(rules[0].comparison_agent_ids, [], 'malformed → []');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
