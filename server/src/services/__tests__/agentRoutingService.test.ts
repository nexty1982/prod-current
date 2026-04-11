#!/usr/bin/env npx tsx
/**
 * Unit tests for services/agentRoutingService.js (OMD-1152)
 *
 * Dependencies stubbed via require.cache BEFORE requiring SUT:
 *   - uuid:                     v4() returns sequential 'uuid-N' tokens
 *   - ../config/db:             getAppPool → route-dispatch fake pool
 *   - ./agentRegistryService:   getAgent returns from a map
 *
 * Coverage:
 *   - VALID_PROMPT_TYPES exposed
 *   - resolveAgent: first-match-wins ordering, component-null/type-null
 *       catch-all rules, multi-agent mode with filtered inactive agents,
 *       fallback to system default (lowest default_priority), throws when
 *       no active agents and no rules
 *   - previewRoute: shape (id/name/provider), matched_rule shape, null rule
 *   - listRules: no filters, active/component filters, composite, SQL ORDER
 *       BY priority
 *   - createRule: required-field validation, prompt_type whitelist, agent
 *       existence check, comparison agent existence check, defaults
 *       (priority=50, is_multi_agent=0), JSON-stringified comparison ids,
 *       uuid generation
 *   - updateRule: no fields → throws, not-found throws, allowlist, JSON
 *       stringification, boolean flag conversion
 *   - deleteRule: happy path, not found throws
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
const uuidStub = {
  v4: () => {
    uuidCounter++;
    return `uuid-${uuidCounter}`;
  },
};

// ── db stub (route-dispatch fake pool) ───────────────────────────────
type QueryCall = { sql: string; params: any[] };
const dbQueries: QueryCall[] = [];
let rulesRows: any[] = [];
let defaultAgentRows: any[] = [];
let listRulesRows: any[] = [];
let updateAffectedRows = 1;
let deleteAffectedRows = 1;

const fakeAppPool = {
  query: async (sql: string, params: any[] = []) => {
    dbQueries.push({ sql, params });
    // resolveAgent: rules JOIN active
    if (/FROM agent_routing_rules r[\s\S]+WHERE r\.active = 1/i.test(sql)) {
      return [rulesRows];
    }
    // Fallback agent query
    if (/FROM agent_registry WHERE status = 'active'[\s\S]*ORDER BY default_priority/i.test(sql)) {
      return [defaultAgentRows];
    }
    // listRules with dynamic WHERE
    if (/FROM agent_routing_rules r[\s\S]+JOIN agent_registry a/i.test(sql)) {
      return [listRulesRows];
    }
    // INSERT
    if (/^INSERT INTO agent_routing_rules/i.test(sql)) {
      return [{ insertId: 1, affectedRows: 1 }];
    }
    // UPDATE
    if (/^UPDATE agent_routing_rules/i.test(sql)) {
      return [{ affectedRows: updateAffectedRows }];
    }
    // DELETE
    if (/^DELETE FROM agent_routing_rules/i.test(sql)) {
      return [{ affectedRows: deleteAffectedRows }];
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakeAppPool };

// ── agentRegistryService stub ────────────────────────────────────────
let agentMap: Record<string, any> = {};
const registryCalls: Array<{ method: string; args: any[] }> = [];

const agentRegistryStub = {
  getAgent: async (id: string) => {
    registryCalls.push({ method: 'getAgent', args: [id] });
    return agentMap[id] || null;
  },
};

// Install stubs — handle both .ts and .js resolutions
function installStub(relPath: string, exports: any): void {
  const tsxResolved = require.resolve(relPath);
  const alt = tsxResolved.endsWith('.ts')
    ? tsxResolved.replace(/\.ts$/, '.js')
    : tsxResolved.replace(/\.js$/, '.ts');
  for (const p of [tsxResolved, alt]) {
    require.cache[p] = { id: p, filename: p, loaded: true, exports } as any;
  }
}

installStub('uuid', uuidStub);
installStub('../../config/db', dbStub);
installStub('../agentRegistryService', agentRegistryStub);

function resetState() {
  dbQueries.length = 0;
  registryCalls.length = 0;
  uuidCounter = 0;
  rulesRows = [];
  defaultAgentRows = [];
  listRulesRows = [];
  agentMap = {};
  updateAffectedRows = 1;
  deleteAffectedRows = 1;
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
  'exposed constant'
);

// ============================================================================
// resolveAgent — exact match wins
// ============================================================================
console.log('\n── resolveAgent: exact match ─────────────────────────────');

resetState();
rulesRows = [
  { id: 'r1', agent_id: 'a1', component: 'backend', prompt_type: 'plan', priority: 10,
    is_multi_agent: 0, comparison_agent_ids: null, agent_name: 'A1', agent_status: 'active' },
  { id: 'r2', agent_id: 'a2', component: null, prompt_type: null, priority: 20,
    is_multi_agent: 0, comparison_agent_ids: null, agent_name: 'A2', agent_status: 'active' },
];
agentMap = {
  a1: { id: 'a1', name: 'A1', provider: 'anthropic', status: 'active' },
};
{
  const r = await resolveAgent('backend', 'plan');
  assertEq(r.primary_agent.id, 'a1', 'primary = a1');
  assertEq(r.is_multi_agent, false, 'not multi-agent');
  assertEq(r.comparison_agents, [], 'no comparison agents');
  assert(r.rule !== null, 'rule returned');
  assertEq(r.rule.id, 'r1', 'matched r1');
}

// Component-only match (prompt_type mismatched → r1 fails)
resetState();
rulesRows = [
  { id: 'r1', agent_id: 'a1', component: 'backend', prompt_type: 'plan', priority: 10,
    is_multi_agent: 0, comparison_agent_ids: null, agent_name: 'A1', agent_status: 'active' },
  { id: 'r2', agent_id: 'a2', component: 'backend', prompt_type: null, priority: 20,
    is_multi_agent: 0, comparison_agent_ids: null, agent_name: 'A2', agent_status: 'active' },
];
agentMap = {
  a2: { id: 'a2', name: 'A2', provider: 'openai', status: 'active' },
};
{
  const r = await resolveAgent('backend', 'verification');
  assertEq(r.primary_agent.id, 'a2', 'falls through to component-only rule');
  assertEq(r.rule.id, 'r2', 'matched r2');
}

// Catch-all (both null)
resetState();
rulesRows = [
  { id: 'r1', agent_id: 'a1', component: 'backend', prompt_type: 'plan', priority: 10,
    is_multi_agent: 0, comparison_agent_ids: null, agent_name: 'A1', agent_status: 'active' },
  { id: 'r2', agent_id: 'a2', component: null, prompt_type: null, priority: 100,
    is_multi_agent: 0, comparison_agent_ids: null, agent_name: 'A2', agent_status: 'active' },
];
agentMap = {
  a2: { id: 'a2', name: 'A2', provider: 'openai', status: 'active' },
};
{
  const r = await resolveAgent('frontend', 'docs');
  assertEq(r.primary_agent.id, 'a2', 'catch-all hit');
}

// ============================================================================
// resolveAgent — multi-agent mode
// ============================================================================
console.log('\n── resolveAgent: multi-agent ─────────────────────────────');

resetState();
rulesRows = [
  { id: 'r1', agent_id: 'a1', component: 'backend', prompt_type: null, priority: 10,
    is_multi_agent: 1, comparison_agent_ids: JSON.stringify(['a2', 'a3', 'a4']),
    agent_name: 'A1', agent_status: 'active' },
];
agentMap = {
  a1: { id: 'a1', name: 'A1', provider: 'anthropic', status: 'active' },
  a2: { id: 'a2', name: 'A2', provider: 'openai', status: 'active' },
  a3: { id: 'a3', name: 'A3', provider: 'openai', status: 'disabled' }, // filtered
  a4: { id: 'a4', name: 'A4', provider: 'google', status: 'active' },
};
{
  const r = await resolveAgent('backend', 'plan');
  assertEq(r.is_multi_agent, true, 'multi-agent');
  assertEq(r.comparison_agents.length, 2, '2 active comparison agents');
  assertEq(r.comparison_agents[0].id, 'a2', 'a2 included');
  assertEq(r.comparison_agents[1].id, 'a4', 'a4 included (a3 filtered)');
}

// Multi-agent flag but no active comparison agents → is_multi_agent false
resetState();
rulesRows = [
  { id: 'r1', agent_id: 'a1', component: null, prompt_type: null, priority: 10,
    is_multi_agent: 1, comparison_agent_ids: JSON.stringify(['a2']),
    agent_name: 'A1', agent_status: 'active' },
];
agentMap = {
  a1: { id: 'a1', name: 'A1', provider: 'anthropic', status: 'active' },
  a2: { id: 'a2', name: 'A2', provider: 'openai', status: 'disabled' },
};
{
  const r = await resolveAgent('x', 'y');
  assertEq(r.is_multi_agent, false, 'flag set but no active comps → false');
  assertEq(r.comparison_agents.length, 0, 'no comparisons');
}

// ============================================================================
// resolveAgent — fallback to system default
// ============================================================================
console.log('\n── resolveAgent: fallback default ────────────────────────');

resetState();
rulesRows = []; // no rules
defaultAgentRows = [{
  id: 'default-agent',
  name: 'Default',
  provider: 'anthropic',
  status: 'active',
  default_priority: 1,
  capabilities: JSON.stringify(['coding']),
  config: null,
}];
{
  const r = await resolveAgent('x', 'y');
  assertEq(r.primary_agent.id, 'default-agent', 'fallback agent');
  assertEq(r.primary_agent.capabilities, ['coding'], 'capabilities parsed');
  assertEq(r.primary_agent.config, null, 'config parsed null');
  assertEq(r.rule, null, 'no rule');
  assertEq(r.is_multi_agent, false, 'not multi-agent');
}

// No active agents at all → throws
resetState();
rulesRows = [];
defaultAgentRows = [];
{
  let caught: Error | null = null;
  try { await resolveAgent('x', 'y'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on no agents');
  assert(caught !== null && caught.message.includes('No active agents'), 'error message');
}

// ============================================================================
// previewRoute
// ============================================================================
console.log('\n── previewRoute ──────────────────────────────────────────');

resetState();
rulesRows = [
  { id: 'r1', rule_name: 'backend-plan', agent_id: 'a1', component: 'backend', prompt_type: 'plan',
    priority: 5, is_multi_agent: 0, comparison_agent_ids: null,
    agent_name: 'A1', agent_status: 'active' },
];
agentMap = {
  a1: { id: 'a1', name: 'A1', provider: 'anthropic', status: 'active' },
};
{
  const p = await previewRoute('backend', 'plan');
  assertEq(p.component, 'backend', 'component');
  assertEq(p.prompt_type, 'plan', 'prompt_type');
  assertEq(p.primary_agent.id, 'a1', 'primary_agent.id');
  assertEq(p.primary_agent.name, 'A1', 'primary_agent.name');
  assertEq(p.primary_agent.provider, 'anthropic', 'primary_agent.provider');
  assertEq(p.comparison_agents, [], 'no comparisons');
  assert(p.matched_rule !== null, 'matched_rule set');
  assertEq(p.matched_rule.id, 'r1', 'matched_rule.id');
  assertEq(p.matched_rule.rule_name, 'backend-plan', 'matched_rule.rule_name');
  assertEq(p.matched_rule.priority, 5, 'matched_rule.priority');
  assertEq(p.is_multi_agent, false, 'is_multi_agent');
}

// Fallback preview → matched_rule null
resetState();
rulesRows = [];
defaultAgentRows = [{
  id: 'd1', name: 'D', provider: 'x', status: 'active', default_priority: 1,
  capabilities: null, config: null,
}];
{
  const p = await previewRoute('x', 'y');
  assertEq(p.matched_rule, null, 'no matched_rule');
}

// ============================================================================
// listRules
// ============================================================================
console.log('\n── listRules ─────────────────────────────────────────────');

resetState();
listRulesRows = [
  { id: 'r1', rule_name: 'backend', priority: 10, comparison_agent_ids: JSON.stringify(['a2']) },
  { id: 'r2', rule_name: 'frontend', priority: 20, comparison_agent_ids: null },
];
{
  const rows = await listRules();
  assertEq(rows.length, 2, '2 rows');
  assertEq(rows[0].comparison_agent_ids, ['a2'], 'first row JSON parsed');
  assertEq(rows[1].comparison_agent_ids, [], 'second row null → []');
  const lastQuery = dbQueries[0];
  assert(/1=1/.test(lastQuery.sql), 'no filter SQL');
  assertEq(lastQuery.params, [], 'no params');
}

// With active filter
resetState();
listRulesRows = [];
await listRules({ active: true });
assertEq(dbQueries[0].params, [1], 'active=1 param');
assert(/r\.active = \?/.test(dbQueries[0].sql), 'active filter in SQL');

resetState();
await listRules({ active: false });
assertEq(dbQueries[0].params, [0], 'active=0 param');

// With component filter
resetState();
await listRules({ component: 'backend' });
assertEq(dbQueries[0].params, ['backend'], 'component param');
assert(/r\.component = \?/.test(dbQueries[0].sql), 'component filter in SQL');

// Composite
resetState();
await listRules({ active: true, component: 'frontend' });
assertEq(dbQueries[0].params, [1, 'frontend'], 'both params');

// ============================================================================
// createRule — validation
// ============================================================================
console.log('\n── createRule: validation ────────────────────────────────');

resetState();
{
  let caught: Error | null = null;
  try { await createRule({} as any); } catch (e: any) { caught = e; }
  assert(caught !== null, 'missing rule_name throws');
  assert(caught !== null && caught.message.includes('required'), 'mentions required');
}

resetState();
{
  let caught: Error | null = null;
  try { await createRule({ rule_name: 'x' } as any); } catch (e: any) { caught = e; }
  assert(caught !== null, 'missing agent_id throws');
}

resetState();
{
  let caught: Error | null = null;
  try { await createRule({ rule_name: 'x', agent_id: 'a1', prompt_type: 'bogus' } as any); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid prompt_type throws');
  assert(caught !== null && caught.message.includes('Invalid prompt_type'), 'mentions prompt_type');
}

// agent not found
resetState();
agentMap = {}; // a1 not present
{
  let caught: Error | null = null;
  try { await createRule({ rule_name: 'x', agent_id: 'a1' } as any); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'missing agent throws');
  assert(caught !== null && caught.message.includes('Agent not found'), 'mentions agent');
}

// comparison agent not found
resetState();
agentMap = { a1: { id: 'a1', status: 'active' } };
{
  let caught: Error | null = null;
  try {
    await createRule({
      rule_name: 'x', agent_id: 'a1',
      is_multi_agent: true,
      comparison_agent_ids: ['a2'],
    } as any);
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'missing comparison agent throws');
  assert(caught !== null && caught.message.includes('Comparison agent not found'), 'mentions comparison');
}

// ============================================================================
// createRule — happy path
// ============================================================================
console.log('\n── createRule: happy path ────────────────────────────────');

resetState();
agentMap = {
  a1: { id: 'a1', status: 'active' },
  a2: { id: 'a2', status: 'active' },
  a3: { id: 'a3', status: 'active' },
};
{
  const r = await createRule({
    rule_name: 'backend-plan',
    component: 'backend',
    prompt_type: 'plan',
    agent_id: 'a1',
    priority: 5,
    is_multi_agent: true,
    comparison_agent_ids: ['a2', 'a3'],
  } as any);
  assertEq(r.rule_id, 'uuid-1', 'returns uuid');
  const insertCall = dbQueries.find(q => /^INSERT INTO agent_routing_rules/i.test(q.sql));
  assert(insertCall !== undefined, 'INSERT executed');
  assertEq(insertCall!.params[0], 'uuid-1', 'id = uuid-1');
  assertEq(insertCall!.params[1], 'backend-plan', 'rule_name');
  assertEq(insertCall!.params[2], 'backend', 'component');
  assertEq(insertCall!.params[3], 'plan', 'prompt_type');
  assertEq(insertCall!.params[4], 'a1', 'agent_id');
  assertEq(insertCall!.params[5], 5, 'priority');
  assertEq(insertCall!.params[6], 1, 'is_multi_agent=1');
  assertEq(insertCall!.params[7], JSON.stringify(['a2', 'a3']), 'comparison_agent_ids JSON');
}

// Defaults: priority=50, is_multi_agent=0, comparison_agent_ids=null
resetState();
agentMap = { a1: { id: 'a1', status: 'active' } };
{
  await createRule({
    rule_name: 'simple',
    agent_id: 'a1',
  } as any);
  const insertCall = dbQueries.find(q => /^INSERT INTO agent_routing_rules/i.test(q.sql));
  assertEq(insertCall!.params[2], null, 'component null default');
  assertEq(insertCall!.params[3], null, 'prompt_type null default');
  assertEq(insertCall!.params[5], 50, 'priority default 50');
  assertEq(insertCall!.params[6], 0, 'is_multi_agent default 0');
  assertEq(insertCall!.params[7], null, 'comparison_agent_ids default null');
}

// ============================================================================
// updateRule
// ============================================================================
console.log('\n── updateRule ────────────────────────────────────────────');

// No fields
resetState();
{
  let caught: Error | null = null;
  try { await updateRule('r1', {}); } catch (e: any) { caught = e; }
  assert(caught !== null, 'no fields throws');
  assert(caught !== null && caught.message.includes('No valid fields'), 'error message');
}

// Allowlist: unknown fields ignored
resetState();
{
  let caught: Error | null = null;
  try { await updateRule('r1', { bogus: 'x' } as any); } catch (e: any) { caught = e; }
  assert(caught !== null, 'only unknown fields → no valid fields throws');
}

// Happy path with multiple fields
resetState();
updateAffectedRows = 1;
{
  await updateRule('r1', {
    rule_name: 'new',
    priority: 100,
    is_multi_agent: true,
    active: false,
    comparison_agent_ids: ['x', 'y'],
  } as any);
  const upd = dbQueries.find(q => /^UPDATE agent_routing_rules/i.test(q.sql));
  assert(upd !== undefined, 'UPDATE executed');
  const sql = upd!.sql;
  assert(/rule_name = \?/.test(sql), 'rule_name set');
  assert(/priority = \?/.test(sql), 'priority set');
  assert(/is_multi_agent = \?/.test(sql), 'is_multi_agent set');
  assert(/active = \?/.test(sql), 'active set');
  assert(/comparison_agent_ids = \?/.test(sql), 'comparison set');
  // Params order follows allowed array: rule_name, priority, is_multi_agent, comparison_agent_ids, active
  // Plus trailing id
  assertEq(upd!.params[0], 'new', 'rule_name param');
  assertEq(upd!.params[1], 100, 'priority param');
  assertEq(upd!.params[2], 1, 'is_multi_agent → 1');
  assertEq(upd!.params[3], JSON.stringify(['x', 'y']), 'comparison JSON');
  assertEq(upd!.params[4], 0, 'active → 0');
  assertEq(upd!.params[5], 'r1', 'id trailing');
}

// Not found
resetState();
updateAffectedRows = 0;
{
  let caught: Error | null = null;
  try { await updateRule('r1', { rule_name: 'x' }); } catch (e: any) { caught = e; }
  assert(caught !== null, 'not found throws');
  assert(caught !== null && caught.message.includes('Rule not found'), 'error message');
}

// comparison_agent_ids = null preserves null
resetState();
updateAffectedRows = 1;
{
  await updateRule('r1', { comparison_agent_ids: null } as any);
  const upd = dbQueries.find(q => /^UPDATE agent_routing_rules/i.test(q.sql));
  assertEq(upd!.params[0], null, 'null comparison preserved');
}

// ============================================================================
// deleteRule
// ============================================================================
console.log('\n── deleteRule ────────────────────────────────────────────');

resetState();
deleteAffectedRows = 1;
{
  const r = await deleteRule('r1');
  assertEq(r.success, true, 'success');
  const del = dbQueries.find(q => /^DELETE FROM agent_routing_rules/i.test(q.sql));
  assertEq(del!.params, ['r1'], 'param is id');
}

// Not found
resetState();
deleteAffectedRows = 0;
{
  let caught: Error | null = null;
  try { await deleteRule('r1'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'not found throws');
  assert(caught !== null && caught.message.includes('Rule not found'), 'error');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
