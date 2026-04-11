#!/usr/bin/env npx tsx
/**
 * Unit tests for services/multiAgentExecutionService.js (OMD-1066)
 *
 * Orchestrates prompt execution across one or more agents:
 *   - getConfig / setConfig / getAllConfig / invalidateConfigCache
 *     (agent_config cache with 30s TTL)
 *   - executePrompt (single vs multi mode, force flags, result recording,
 *     auto-evaluation hooks, best-result selection)
 *   - getExecutionGroup (query + violations_found JSON parse)
 *
 * External deps stubbed via require.cache BEFORE requiring the SUT:
 *   - ../config/db                (getAppPool)
 *   - ./agentRoutingService       (resolveAgent)
 *   - ./resultSelectionService    (evaluateResult, selectBestResult,
 *                                  getComparison)
 *   - uuid                        (v4 — deterministic ids for assertions)
 *
 * Note: _callAnthropic uses a runtime require of an absolute path to the
 * OMAI services module. We seed require.cache with that absolute path so
 * the "anthropic" provider returns scripted responses in tests without
 * needing the real module.
 *
 * Run: npx tsx server/src/services/__tests__/multiAgentExecutionService.test.ts
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

// ─── Fake pool (SQL-routed) ─────────────────────────────────────────────────

type Route = { match: RegExp; rows?: any[]; respond?: (params: any[]) => any[] | any };
let routes: Route[] = [];
const queryLog: { sql: string; params: any[] }[] = [];
let queryThrows: Error | null = null;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (queryThrows) throw queryThrows;
    for (const r of routes) {
      if (r.match.test(sql)) {
        const rows = r.respond ? r.respond(params) : (r.rows || []);
        return [rows];
      }
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
{
  const path = require('path');
  const configDir = path.resolve(__dirname, '../../config');
  for (const fn of ['db.js', 'db.ts']) {
    const abs = path.join(configDir, fn);
    require.cache[abs] = {
      id: abs, filename: abs, loaded: true, exports: dbStub,
    } as any;
  }
}

// ─── uuid stub (deterministic) ──────────────────────────────────────────────

let uuidSeq = 0;
const uuidStub = {
  v4: () => `uuid-${++uuidSeq}`,
};
{
  const uuidPath = require.resolve('uuid');
  require.cache[uuidPath] = {
    id: uuidPath, filename: uuidPath, loaded: true, exports: uuidStub,
  } as any;
}

// ─── agentRoutingService stub ───────────────────────────────────────────────

type Agent = { id: number; name: string; provider: string; model_id?: string };
let nextRouting: any = null;

const agentRoutingStub = {
  resolveAgent: async (_component: string | null, _promptType: string | null) => nextRouting,
};
{
  const path = require('path');
  const servicesDir = path.resolve(__dirname, '..');
  for (const fn of ['agentRoutingService.js', 'agentRoutingService.ts']) {
    const abs = path.join(servicesDir, fn);
    require.cache[abs] = {
      id: abs, filename: abs, loaded: true, exports: agentRoutingStub,
    } as any;
  }
}

// ─── resultSelectionService stub ────────────────────────────────────────────

type RsvcCall = { method: string; args: any[] };
const rsvcCalls: RsvcCall[] = [];
let selectBestResultReturn: any = null;
let selectBestResultThrows = false;
let getComparisonReturn: any = null;

const resultSelectionStub = {
  evaluateResult: async (resultId: string, payload: any) => {
    rsvcCalls.push({ method: 'evaluateResult', args: [resultId, payload] });
    return { success: true };
  },
  selectBestResult: async (groupId: string) => {
    rsvcCalls.push({ method: 'selectBestResult', args: [groupId] });
    if (selectBestResultThrows) throw new Error('selection failed');
    return selectBestResultReturn;
  },
  getComparison: async (groupId: string) => {
    rsvcCalls.push({ method: 'getComparison', args: [groupId] });
    return getComparisonReturn;
  },
};
{
  const path = require('path');
  const servicesDir = path.resolve(__dirname, '..');
  for (const fn of ['resultSelectionService.js', 'resultSelectionService.ts']) {
    const abs = path.join(servicesDir, fn);
    require.cache[abs] = {
      id: abs, filename: abs, loaded: true, exports: resultSelectionStub,
    } as any;
  }
}

// ─── OMAI services stub (absolute path require inside _callAnthropic) ──────

let askOMAIReturn: any = {
  response: 'stubbed omai response',
  usage: { input_tokens: 100, output_tokens: 50 },
};
let askOMAIThrows = false;

const omaiStub = {
  askOMAIWithMetadata: async (_text: string, _ctx: any) => {
    if (askOMAIThrows) throw new Error('omai failed');
    return askOMAIReturn;
  },
};
{
  const omaiPath = '/var/www/orthodoxmetrics/prod/misc/omai/services/index.js';
  require.cache[omaiPath] = {
    id: omaiPath, filename: omaiPath, loaded: true, exports: omaiStub,
  } as any;
}

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const {
  getConfig,
  setConfig,
  getAllConfig,
  invalidateConfigCache,
  executePrompt,
  getExecutionGroup,
} = require('../multiAgentExecutionService');

function resetState() {
  routes = [];
  queryLog.length = 0;
  queryThrows = null;
  uuidSeq = 0;
  nextRouting = null;
  rsvcCalls.length = 0;
  selectBestResultReturn = null;
  selectBestResultThrows = false;
  getComparisonReturn = null;
  askOMAIReturn = {
    response: 'stubbed omai response',
    usage: { input_tokens: 100, output_tokens: 50 },
  };
  askOMAIThrows = false;
  invalidateConfigCache(); // flush SUT cache
}

async function main() {

// ============================================================================
// Config cache: getConfig / getAllConfig / setConfig / invalidateConfigCache
// ============================================================================
console.log('\n── getConfig / cache ─────────────────────────────────────');

// First read loads from DB; second read within TTL hits cache
resetState();
routes = [{
  match: /SELECT config_key, config_value FROM agent_config/,
  rows: [
    { config_key: 'multi_agent_enabled', config_value: 'true' },
    { config_key: 'comparison_timeout_ms', config_value: '60000' },
    { config_key: 'auto_evaluate', config_value: 'false' },
  ],
}];
{
  const v1 = await getConfig('multi_agent_enabled');
  assertEq(v1, 'true', 'cache miss: returns value');
  assertEq(queryLog.length, 1, '1 DB query');

  const v2 = await getConfig('comparison_timeout_ms');
  assertEq(v2, '60000', 'cache hit: other key');
  assertEq(queryLog.length, 1, 'still 1 query (cached)');

  const missing = await getConfig('nonexistent_key');
  assertEq(missing, null, 'missing key → null');
}

// getAllConfig returns object form
resetState();
routes = [{
  match: /SELECT config_key, config_value FROM agent_config/,
  rows: [
    { config_key: 'a', config_value: '1' },
    { config_key: 'b', config_value: '2' },
  ],
}];
{
  const all = await getAllConfig();
  assertEq(all.a, '1', 'key a');
  assertEq(all.b, '2', 'key b');
  assertEq(Object.keys(all).length, 2, '2 keys total');
}

// setConfig writes + invalidates
resetState();
routes = [
  { match: /INSERT INTO agent_config/, rows: [{ affectedRows: 1 }] },
  { match: /SELECT config_key, config_value FROM agent_config/,
    rows: [{ config_key: 'new_key', config_value: 'new_val' }] },
];
{
  const r = await setConfig('new_key', 'new_val');
  assertEq(r.success, true, 'setConfig success');
  assertEq(queryLog.length, 1, '1 query from setConfig');
  assert(/INSERT INTO agent_config/.test(queryLog[0].sql), 'INSERT SQL');
  assert(/ON DUPLICATE KEY UPDATE/.test(queryLog[0].sql), 'upsert clause');
  assertEq(queryLog[0].params, ['new_key', 'new_val', 'new_val'], 'params');

  // Next getConfig should query again (cache invalidated)
  const v = await getConfig('new_key');
  assertEq(v, 'new_val', 'cache reloaded after setConfig');
  assertEq(queryLog.length, 2, '2 queries total (reload)');
}

// invalidateConfigCache forces reload
resetState();
routes = [{
  match: /SELECT config_key, config_value FROM agent_config/,
  rows: [{ config_key: 'k', config_value: 'v1' }],
}];
{
  await getConfig('k');
  assertEq(queryLog.length, 1, 'first load');
  await getConfig('k');
  assertEq(queryLog.length, 1, 'cache hit');
  invalidateConfigCache();
  await getConfig('k');
  assertEq(queryLog.length, 2, 'reload after invalidate');
}

// ============================================================================
// executePrompt — input validation
// ============================================================================
console.log('\n── executePrompt: validation ─────────────────────────────');

resetState();
{
  let caught: Error | null = null;
  try {
    await executePrompt({ promptText: 'hi' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'missing stepId throws');
  assert(caught !== null && caught.message.includes('stepId and promptText'), 'error mentions params');
}

resetState();
{
  let caught: Error | null = null;
  try {
    await executePrompt({ stepId: 1 });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'missing promptText throws');
}

// ============================================================================
// executePrompt — single-agent mode (happy path)
// ============================================================================
console.log('\n── executePrompt: single-agent happy ─────────────────────');

resetState();
routes = [
  { match: /SELECT config_key, config_value FROM agent_config/, rows: [
    { config_key: 'multi_agent_enabled', config_value: 'false' },
    { config_key: 'auto_evaluate', config_value: 'false' },
    { config_key: 'comparison_timeout_ms', config_value: '120000' },
  ]},
  { match: /INSERT INTO prompt_execution_results/, rows: [{ affectedRows: 1 }] },
];
nextRouting = {
  primary_agent: { id: 1, name: 'claude-sonnet', provider: 'anthropic' },
  comparison_agents: [],
  is_multi_agent: false,
  rule: { rule_name: 'default_sonnet' },
};
{
  const r = await executePrompt({
    stepId: 10, promptText: 'Test prompt', component: 'backend', promptType: 'chore',
  });
  assertEq(r.mode, 'single', 'mode = single');
  assert(r.execution_group_id.startsWith('uuid-'), 'uuid group id');
  assertEq(r.routing.primary_agent, 'claude-sonnet', 'primary name');
  assertEq(r.routing.comparison_agents, [], 'no comparison');
  assertEq(r.routing.matched_rule, 'default_sonnet', 'rule name');
  assertEq(r.results.length, 1, '1 result');
  assertEq(r.results[0].agent_name, 'claude-sonnet', 'result agent_name');
  assertEq(r.results[0].error, null, 'no error');
  assertEq(r.selected.agent_id, 1, 'selected agent');
  assertEq(r.selected.reason, 'Single agent execution', 'single reason');
  // Verify INSERT was made for result
  const inserts = queryLog.filter(q => /INSERT INTO prompt_execution_results/.test(q.sql));
  assertEq(inserts.length, 1, '1 result row inserted');
  assertEq(inserts[0].params[1], 10, 'stepId param');
  assertEq(inserts[0].params[3], 1, 'agent_id param');
  assertEq(inserts[0].params[5], 'Test prompt', 'prompt_text param');
  assertEq(inserts[0].params[6], 'stubbed omai response', 'result_text param');
  assertEq(inserts[0].params[10], 100, 'token_count_input param');
  assertEq(inserts[0].params[11], 50, 'token_count_output param');
  assertEq(inserts[0].params[13], null, 'completion_status null (success)');
}

// ============================================================================
// executePrompt — single mode with agent execution error
// ============================================================================
console.log('\n── executePrompt: single-agent error ─────────────────────');

resetState();
askOMAIThrows = true;
routes = [
  { match: /SELECT config_key, config_value FROM agent_config/, rows: [
    { config_key: 'multi_agent_enabled', config_value: 'false' },
    { config_key: 'auto_evaluate', config_value: 'false' },
  ]},
  { match: /INSERT INTO prompt_execution_results/, rows: [{ affectedRows: 1 }] },
];
nextRouting = {
  primary_agent: { id: 2, name: 'claude-opus', provider: 'anthropic' },
  comparison_agents: [],
  is_multi_agent: false,
  rule: null, // triggers 'system default' label
};
quiet();
{
  const r = await executePrompt({
    stepId: 20, promptText: 'Failing prompt',
  });
  loud();
  assertEq(r.mode, 'single', 'mode = single');
  assertEq(r.routing.matched_rule, 'system default', 'default rule name');
  assertEq(r.results.length, 1, '1 result recorded');
  assert(r.results[0].error !== null, 'error present');
  assert(r.results[0].error.includes('Anthropic execution failed'), 'anthropic error wrapped');
  // The INSERT should have completion_status = 'failure'
  const inserts = queryLog.filter(q => /INSERT INTO prompt_execution_results/.test(q.sql));
  assertEq(inserts.length, 1, '1 insert');
  assertEq(inserts[0].params[13], 'failure', 'completion_status = failure');
  assertEq(inserts[0].params[6], null, 'result_text null');
}

// ============================================================================
// executePrompt — unsupported provider
// ============================================================================
console.log('\n── executePrompt: unsupported provider ───────────────────');

resetState();
routes = [
  { match: /SELECT config_key, config_value FROM agent_config/, rows: [] },
  { match: /INSERT INTO prompt_execution_results/, rows: [{ affectedRows: 1 }] },
];
nextRouting = {
  primary_agent: { id: 3, name: 'mock-agent', provider: 'mystery' },
  comparison_agents: [],
  is_multi_agent: false,
  rule: null,
};
quiet();
{
  const r = await executePrompt({ stepId: 30, promptText: 'x' });
  loud();
  assert(r.results[0].error !== null, 'error present');
  assert(r.results[0].error.includes('Unsupported provider: mystery'), 'unsupported provider error');
}

// ============================================================================
// executePrompt — forceSingleAgent overrides multi config
// ============================================================================
console.log('\n── executePrompt: force single ───────────────────────────');

resetState();
routes = [
  { match: /SELECT config_key, config_value FROM agent_config/, rows: [
    { config_key: 'multi_agent_enabled', config_value: 'true' },
    { config_key: 'auto_evaluate', config_value: 'false' },
  ]},
  { match: /INSERT INTO prompt_execution_results/, rows: [{ affectedRows: 1 }] },
];
nextRouting = {
  primary_agent: { id: 1, name: 'primary', provider: 'anthropic' },
  comparison_agents: [
    { id: 2, name: 'compare-a', provider: 'anthropic' },
    { id: 3, name: 'compare-b', provider: 'anthropic' },
  ],
  is_multi_agent: true,
  rule: { rule_name: 'multi_rule' },
};
{
  const r = await executePrompt({
    stepId: 40, promptText: 'p', forceSingleAgent: true,
  });
  assertEq(r.mode, 'single', 'force single wins over multi config');
  assertEq(r.results.length, 1, 'only primary executed');
}

// ============================================================================
// executePrompt — multi-agent mode (3 agents, selection success)
// ============================================================================
console.log('\n── executePrompt: multi-agent ────────────────────────────');

resetState();
routes = [
  { match: /SELECT config_key, config_value FROM agent_config/, rows: [
    { config_key: 'multi_agent_enabled', config_value: 'true' },
    { config_key: 'auto_evaluate', config_value: 'false' },
    { config_key: 'confidence_threshold', config_value: '0.7' },
  ]},
  { match: /INSERT INTO prompt_execution_results/, rows: [{ affectedRows: 1 }] },
];
nextRouting = {
  primary_agent: { id: 1, name: 'primary', provider: 'anthropic' },
  comparison_agents: [
    { id: 2, name: 'compare-a', provider: 'anthropic' },
    { id: 3, name: 'compare-b', provider: 'anthropic' },
  ],
  is_multi_agent: true,
  rule: { rule_name: 'multi_rule' },
};
selectBestResultReturn = {
  selected_result_id: 'uuid-1', // primary gets uuid-1 (executionGroup is uuid-1? check)
  selected_agent_id: 1,
  selection_reason: 'highest confidence',
  comparison: { scores: [80, 75, 70] },
};
{
  const r = await executePrompt({
    stepId: 50, promptText: 'multi prompt', forceMultiAgent: true,
  });
  assertEq(r.mode, 'multi', 'mode = multi');
  assertEq(r.results.length, 3, '3 results (1 primary + 2 comparison)');
  assertEq(r.routing.comparison_agents, ['compare-a', 'compare-b'], 'comparison names');
  assertEq(r.selected.agent_id, 1, 'selected from selectBestResult');
  assertEq(r.selected.reason, 'highest confidence', 'selection reason');
  assertEq(r.comparison.scores, [80, 75, 70], 'comparison passed through');
  // Verify selectBestResult was called
  const selCalls = rsvcCalls.filter(c => c.method === 'selectBestResult');
  assertEq(selCalls.length, 1, 'selectBestResult called');
  // Verify 3 inserts
  const inserts = queryLog.filter(q => /INSERT INTO prompt_execution_results/.test(q.sql));
  assertEq(inserts.length, 3, '3 rows inserted');
}

// ============================================================================
// executePrompt — multi-agent, selection throws → error reported
// ============================================================================
console.log('\n── executePrompt: multi-agent selection error ────────────');

resetState();
routes = [
  { match: /SELECT config_key, config_value FROM agent_config/, rows: [
    { config_key: 'multi_agent_enabled', config_value: 'true' },
    { config_key: 'auto_evaluate', config_value: 'false' },
  ]},
  { match: /INSERT INTO prompt_execution_results/, rows: [{ affectedRows: 1 }] },
];
nextRouting = {
  primary_agent: { id: 1, name: 'primary', provider: 'anthropic' },
  comparison_agents: [{ id: 2, name: 'compare', provider: 'anthropic' }],
  is_multi_agent: true,
  rule: null,
};
selectBestResultThrows = true;
{
  const r = await executePrompt({
    stepId: 60, promptText: 'p', forceMultiAgent: true,
  });
  assertEq(r.mode, 'multi', 'mode = multi');
  assertEq(r.results.length, 2, '2 results');
  assert(r.selected !== null, 'selected is not null');
  assert(r.selected.error !== undefined, 'selection error captured');
  assert(r.selected.error.includes('selection failed'), 'error message');
}

// ============================================================================
// executePrompt — auto-evaluate flag triggers evaluateResult
// ============================================================================
console.log('\n── executePrompt: auto-evaluate ──────────────────────────');

resetState();
routes = [
  { match: /SELECT config_key, config_value FROM agent_config/, rows: [
    { config_key: 'multi_agent_enabled', config_value: 'false' },
    { config_key: 'auto_evaluate', config_value: 'true' },
  ]},
  { match: /INSERT INTO prompt_execution_results/, rows: [{ affectedRows: 1 }] },
  // _autoEvaluate will SELECT the row → return the full record
  { match: /SELECT \* FROM prompt_execution_results WHERE id = \?/,
    respond: (params) => [{
      id: params[0],
      result_text: 'this is a detailed successful response from the agent more than fifty chars long',
      completion_status: null,
    }],
  },
  // _getEvaluation reads evaluator_status columns
  { match: /SELECT evaluator_status, completion_status, confidence, violation_count/,
    rows: [{
      evaluator_status: 'pending',
      completion_status: null,
      confidence: 0,
      violation_count: 0,
    }],
  },
];
nextRouting = {
  primary_agent: { id: 1, name: 'primary', provider: 'anthropic' },
  comparison_agents: [],
  is_multi_agent: false,
  rule: null,
};
{
  const r = await executePrompt({ stepId: 70, promptText: 'p' });
  assertEq(r.mode, 'single', 'single mode');
  // evaluateResult should have been called once
  const evalCalls = rsvcCalls.filter(c => c.method === 'evaluateResult');
  assert(evalCalls.length >= 1, 'evaluateResult invoked');
  assertEq(evalCalls[0].args[1].completion_status, 'success', 'success status');
  assert(evalCalls[0].args[1].confidence > 0, 'positive confidence');
}

// ============================================================================
// executePrompt — auto-evaluate detects short output
// ============================================================================
console.log('\n── executePrompt: auto-evaluate short output ─────────────');

resetState();
askOMAIReturn = { response: 'short', usage: { input_tokens: 10, output_tokens: 2 } };
routes = [
  { match: /SELECT config_key, config_value FROM agent_config/, rows: [
    { config_key: 'multi_agent_enabled', config_value: 'false' },
    { config_key: 'auto_evaluate', config_value: 'true' },
  ]},
  { match: /INSERT INTO prompt_execution_results/, rows: [{ affectedRows: 1 }] },
  { match: /SELECT \* FROM prompt_execution_results WHERE id = \?/,
    respond: (params) => [{
      id: params[0],
      result_text: 'short',
      completion_status: null,
    }],
  },
  { match: /SELECT evaluator_status, completion_status, confidence, violation_count/,
    rows: [{ evaluator_status: 'pending', completion_status: null, confidence: 0, violation_count: 0 }],
  },
];
nextRouting = {
  primary_agent: { id: 1, name: 'primary', provider: 'anthropic' },
  comparison_agents: [],
  is_multi_agent: false,
  rule: null,
};
{
  await executePrompt({ stepId: 80, promptText: 'p' });
  const evalCalls = rsvcCalls.filter(c => c.method === 'evaluateResult');
  assert(evalCalls.length >= 1, 'evaluated');
  const payload = evalCalls[0].args[1];
  assert(
    payload.violations.some((v: any) => v.type === 'insufficient_output'),
    'insufficient_output violation detected',
  );
}

// ============================================================================
// getExecutionGroup
// ============================================================================
console.log('\n── getExecutionGroup ─────────────────────────────────────');

resetState();
getComparisonReturn = { winner: 'uuid-1', scores: { 'uuid-1': 85 } };
routes = [{
  match: /FROM prompt_execution_results r[\s\S]*JOIN agent_registry/,
  respond: (params) => {
    assertEq(params[0], 'group-abc', 'groupId param');
    return [
      { id: 'r1', agent_name: 'primary', agent_provider: 'anthropic',
        violations_found: '[{"type":"minor","description":"x"}]', was_selected: 1 },
      { id: 'r2', agent_name: 'compare', agent_provider: 'anthropic',
        violations_found: null, was_selected: 0 },
    ];
  },
}];
{
  const g = await getExecutionGroup('group-abc');
  assertEq(g.execution_group_id, 'group-abc', 'groupId echoed');
  assertEq(g.results.length, 2, '2 results');
  assertEq(g.results[0].id, 'r1', 'first result id');
  assertEq(g.results[0].violations_found.length, 1, 'parsed violations');
  assertEq(g.results[0].violations_found[0].type, 'minor', 'violation type');
  assertEq(g.results[1].violations_found, [], 'null violations_found → []');
  assertEq(g.comparison.winner, 'uuid-1', 'comparison from resultSelection');
  // getComparison was called with groupId
  const compCalls = rsvcCalls.filter(c => c.method === 'getComparison');
  assertEq(compCalls.length, 1, 'getComparison called');
  assertEq(compCalls[0].args[0], 'group-abc', 'getComparison arg');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
