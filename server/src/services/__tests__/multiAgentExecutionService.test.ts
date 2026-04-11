#!/usr/bin/env npx tsx
/**
 * Unit tests for services/multiAgentExecutionService.js (OMD-1108)
 *
 * Orchestrates single or multi-agent prompt execution. External deps:
 *   - uuid (v4)
 *   - ../config/db (getAppPool)
 *   - ./agentRoutingService (resolveAgent)
 *   - ./resultSelectionService (selectBestResult, getComparison, evaluateResult)
 *   - /var/www/orthodoxmetrics/prod/misc/omai/services/index.js
 *     (askOMAIWithMetadata — called dynamically inside _callAnthropic)
 *
 * Strategy: stub each via require.cache BEFORE requiring the SUT. The db
 * pool is SQL-routed. agentRoutingService / resultSelectionService are
 * scriptable (return values captured per call).
 *
 * Coverage:
 *   - Config cache: getConfig uses cache on second call; setConfig
 *     invalidates; getAllConfig returns map; invalidateConfigCache
 *   - executePrompt:
 *       · missing stepId / promptText → throws
 *       · single-agent happy path (forceSingle)
 *       · multi-agent happy path (forceMulti) — all agents executed
 *       · multi-agent smart-skip — high-confidence primary skips comparison
 *       · forceSingle overrides forceMulti
 *       · unsupported provider → error captured, execution still recorded
 *   - getExecutionGroup: query routed, violations_found parsed
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

// ── Helpers ─────────────────────────────────────────────────────────
function stubModule(fromPath: string, relPath: string, exports: any): void {
  const { createRequire } = require('module');
  const path = require('path');
  const fromFile = require.resolve(fromPath);
  const fromDir = path.dirname(fromFile);
  const scopedRequire = createRequire(path.join(fromDir, 'noop.js'));
  try {
    const resolved = scopedRequire.resolve(relPath);
    require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports } as any;
  } catch {}
}

// ── uuid stub ───────────────────────────────────────────────────────
let uuidCounter = 0;
function nextUuid() { return `uuid-${++uuidCounter}`; }
stubModule('../multiAgentExecutionService', 'uuid', { v4: nextUuid });

// ── DB pool stub (SQL-routed) ───────────────────────────────────────
type Route = { pattern: RegExp; response: any; once?: boolean; consumed?: boolean };
let routes: Route[] = [];
const queryLog: Array<{ sql: string; params: any[] }> = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.consumed) continue;
      if (r.pattern.test(sql)) {
        if (r.once) r.consumed = true;
        return r.response;
      }
    }
    // Default: INSERTs return ok, SELECTs return empty
    if (/^\s*INSERT/i.test(sql) || /^\s*UPDATE/i.test(sql)) return [{ affectedRows: 1 }];
    return [[]];
  },
};

function resetRoutes() {
  routes = [];
  queryLog.length = 0;
}

stubModule('../multiAgentExecutionService', '../config/db', {
  getAppPool: () => fakePool,
});

// ── agentRoutingService stub ────────────────────────────────────────
let nextRouting: any = null;
stubModule('../multiAgentExecutionService', './agentRoutingService', {
  resolveAgent: async (_component: any, _type: any) => nextRouting,
});

// ── resultSelectionService stub ─────────────────────────────────────
const evaluations: Array<{ resultId: string; data: any }> = [];
let nextSelection: any = null;
let nextComparison: any = null;
let selectionThrows = false;
stubModule('../multiAgentExecutionService', './resultSelectionService', {
  evaluateResult: async (resultId: string, data: any) => {
    evaluations.push({ resultId, data });
    return { ok: true };
  },
  selectBestResult: async (_groupId: string) => {
    if (selectionThrows) throw new Error('not all evaluated');
    return nextSelection;
  },
  getComparison: async (_groupId: string) => nextComparison,
});

// ── Anthropic module stub (dynamic require inside _callAnthropic) ───
const anthropicPath = '/var/www/orthodoxmetrics/prod/misc/omai/services/index.js';
let anthropicResponseQueue: any[] = [];
require.cache[anthropicPath] = {
  id: anthropicPath,
  filename: anthropicPath,
  loaded: true,
  exports: {
    askOMAIWithMetadata: async (_prompt: string, _ctx: any) => {
      if (anthropicResponseQueue.length === 0) {
        return {
          response: 'Default response: a reasonably long string that passes the insufficient_output heuristic easily.',
          usage: { input_tokens: 100, output_tokens: 200 },
        };
      }
      return anthropicResponseQueue.shift();
    },
  },
} as any;

// ── Load SUT ────────────────────────────────────────────────────────
const svc = require('../multiAgentExecutionService');

async function main() {

// ============================================================================
// Config cache: getConfig / setConfig / getAllConfig / invalidate
// ============================================================================
console.log('\n── config cache ──────────────────────────────────────────');

resetRoutes();
svc.invalidateConfigCache();
{
  // First read loads cache
  routes.push({
    pattern: /SELECT config_key.*FROM agent_config/i,
    response: [[
      { config_key: 'multi_agent_enabled', config_value: 'true' },
      { config_key: 'auto_evaluate', config_value: 'true' },
      { config_key: 'confidence_threshold', config_value: '0.7' },
      { config_key: 'comparison_timeout_ms', config_value: '60000' },
    ]],
    once: true,
  });

  const v = await svc.getConfig('multi_agent_enabled');
  assertEq(v, 'true', 'first read hits DB');
  assertEq(queryLog.length, 1, 'one query so far');

  // Second read uses cache — no new query
  const v2 = await svc.getConfig('auto_evaluate');
  assertEq(v2, 'true', 'second read cached');
  assertEq(queryLog.length, 1, 'still one query');

  // Unknown key returns null
  const v3 = await svc.getConfig('nonexistent_key');
  assertEq(v3, null, 'unknown key → null');
}

// getAllConfig returns full map
{
  const all = await svc.getAllConfig();
  assertEq(all.multi_agent_enabled, 'true', 'getAllConfig.multi_agent');
  assertEq(all.auto_evaluate, 'true', 'getAllConfig.auto_evaluate');
  assertEq(all.confidence_threshold, '0.7', 'getAllConfig.threshold');
  assertEq(queryLog.length, 1, 'still one query (cached)');
}

// setConfig invalidates cache
resetRoutes();
{
  // setConfig runs INSERT
  const r = await svc.setConfig('multi_agent_enabled', 'false');
  assertEq(r.success, true, 'set ok');
  assert(queryLog.some(q => /INSERT INTO agent_config/i.test(q.sql)), 'INSERT called');

  // Next getConfig re-queries
  routes.push({
    pattern: /SELECT config_key.*FROM agent_config/i,
    response: [[{ config_key: 'multi_agent_enabled', config_value: 'false' }]],
    once: true,
  });
  const v = await svc.getConfig('multi_agent_enabled');
  assertEq(v, 'false', 'reflects new write');
}

// invalidateConfigCache manual
resetRoutes();
svc.invalidateConfigCache();
{
  routes.push({
    pattern: /SELECT config_key.*FROM agent_config/i,
    response: [[]],
    once: true,
  });
  const v = await svc.getConfig('x');
  assertEq(v, null, 'empty after invalidate');
  assertEq(queryLog.length, 1, 'one query fired');
}

// ============================================================================
// executePrompt: validation
// ============================================================================
console.log('\n── executePrompt: validation ─────────────────────────────');

{
  let caught: any = null;
  try {
    await svc.executePrompt({ stepId: null, promptText: 'hi' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on missing stepId');
  assert(caught.message.includes('required'), 'error mentions required');
}

{
  let caught: any = null;
  try {
    await svc.executePrompt({ stepId: 1, promptText: '' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on empty promptText');
}

// ============================================================================
// executePrompt: single-agent happy path (forceSingleAgent)
// ============================================================================
console.log('\n── executePrompt: single agent ───────────────────────────');

resetRoutes();
svc.invalidateConfigCache();
anthropicResponseQueue = [];
{
  // Config says multi enabled but we force single
  routes.push({
    pattern: /SELECT config_key.*FROM agent_config/i,
    response: [[
      { config_key: 'multi_agent_enabled', config_value: 'true' },
      { config_key: 'auto_evaluate', config_value: 'false' },
    ]],
    once: true,
  });

  nextRouting = {
    primary_agent: { id: 'agent-p1', name: 'Primary Agent', provider: 'anthropic' },
    comparison_agents: [
      { id: 'agent-c1', name: 'Comparison A', provider: 'anthropic' },
    ],
    is_multi_agent: true,
    rule: { rule_name: 'backend-impl' },
  };

  const r = await svc.executePrompt({
    stepId: 42,
    promptText: 'Do the thing',
    component: 'backend',
    promptType: 'implementation',
    forceSingleAgent: true,
  });

  assertEq(r.mode, 'single', 'mode=single');
  assertEq(r.results.length, 1, '1 result');
  assertEq(r.results[0].agent_id, 'agent-p1', 'primary agent ran');
  assertEq(r.routing.matched_rule, 'backend-impl', 'rule captured');
  assertEq(r.routing.primary_agent, 'Primary Agent', 'primary name');
  assertEq(r.routing.comparison_agents, ['Comparison A'], 'comparison list');
  assert(r.selected !== null, 'selected set');
  assertEq(r.selected.reason, 'Single agent execution', 'selected reason');
  // INSERT for result should be in queryLog
  assert(queryLog.some(q => /INSERT INTO prompt_execution_results/i.test(q.sql)), 'result inserted');
}

// ============================================================================
// executePrompt: multi-agent without smart-skip (autoEval=false)
// ============================================================================
console.log('\n── executePrompt: multi agent (no skip) ──────────────────');

resetRoutes();
svc.invalidateConfigCache();
anthropicResponseQueue = [];
{
  routes.push({
    pattern: /SELECT config_key.*FROM agent_config/i,
    response: [[
      { config_key: 'multi_agent_enabled', config_value: 'true' },
      { config_key: 'auto_evaluate', config_value: 'false' },
    ]],
    once: true,
  });

  nextRouting = {
    primary_agent: { id: 'p1', name: 'P1', provider: 'anthropic' },
    comparison_agents: [
      { id: 'c1', name: 'C1', provider: 'anthropic' },
      { id: 'c2', name: 'C2', provider: 'anthropic' },
    ],
    is_multi_agent: true,
    rule: null,
  };

  nextSelection = {
    selected_result_id: 'uuid-sel',
    selected_agent_id: 'p1',
    selection_reason: 'best quality',
    comparison: { total: 3 },
  };
  nextComparison = null;

  const r = await svc.executePrompt({
    stepId: 10,
    promptText: 'Multi-agent test',
    forceMultiAgent: true,
  });

  assertEq(r.mode, 'multi', 'mode=multi');
  assertEq(r.results.length, 3, '3 results (primary + 2 comparison)');
  assertEq(r.routing.matched_rule, 'system default', 'default rule label');
  assertEq(r.selected.reason, 'best quality', 'selection reason');
  assertEq(r.selected.agent_id, 'p1', 'selection agent');
}

// ============================================================================
// executePrompt: multi-agent with smart-skip (high confidence primary)
// ============================================================================
console.log('\n── executePrompt: multi agent (smart skip) ───────────────');

resetRoutes();
svc.invalidateConfigCache();
anthropicResponseQueue = [];
evaluations.length = 0;
{
  routes.push({
    pattern: /SELECT config_key.*FROM agent_config/i,
    response: [[
      { config_key: 'multi_agent_enabled', config_value: 'true' },
      { config_key: 'auto_evaluate', config_value: 'true' },
      { config_key: 'confidence_threshold', config_value: '0.7' },
    ]],
    once: true,
  });

  // Two reads of the result evaluation: both return "passed" so skip triggers.
  // First _getEvaluation call: after primary ran (smart-skip check)
  routes.push({
    pattern: /SELECT evaluator_status.*prompt_execution_results/i,
    response: [[{
      evaluator_status: 'evaluated',
      completion_status: 'success',
      confidence: 0.9,
      violation_count: 0,
    }]],
    once: false, // allow multiple
  });

  // _autoEvaluate selects the full row
  routes.push({
    pattern: /SELECT \* FROM prompt_execution_results/i,
    response: [[{
      id: 'uuid-p',
      result_text: 'a nice long successful result text that comfortably exceeds fifty characters so no insufficient violation is raised',
      completion_status: null,
    }]],
    once: false,
  });

  nextRouting = {
    primary_agent: { id: 'p1', name: 'P1', provider: 'anthropic' },
    comparison_agents: [
      { id: 'c1', name: 'C1', provider: 'anthropic' },
      { id: 'c2', name: 'C2', provider: 'anthropic' },
    ],
    is_multi_agent: true,
    rule: null,
  };

  // Only primary will be selected since comparison is skipped
  nextSelection = null;
  nextComparison = null;

  const r = await svc.executePrompt({
    stepId: 11,
    promptText: 'smart skip test',
  });

  assertEq(r.mode, 'multi', 'mode=multi');
  assertEq(r.results.length, 1, 'only primary ran (skipped)');
  // selected set via "single result in multi (filter < 2)" fallback path → null
  // because r.results.length is 1 and the condition `results.length === 1 && result_id` picks it
  assertEq(r.selected.agent_id, 'p1', 'selected is primary');
  assertEq(r.selected.reason, 'Single agent execution', 'single-agent fallback reason');
}

// ============================================================================
// executePrompt: forceSingleAgent wins over forceMultiAgent
// ============================================================================
console.log('\n── executePrompt: force single overrides multi ──────────');

resetRoutes();
svc.invalidateConfigCache();
anthropicResponseQueue = [];
{
  routes.push({
    pattern: /SELECT config_key.*FROM agent_config/i,
    response: [[]],
    once: true,
  });

  nextRouting = {
    primary_agent: { id: 'p1', name: 'P1', provider: 'anthropic' },
    comparison_agents: [{ id: 'c1', name: 'C1', provider: 'anthropic' }],
    is_multi_agent: true,
    rule: null,
  };

  const r = await svc.executePrompt({
    stepId: 99,
    promptText: 'override test',
    forceSingleAgent: true,
    forceMultiAgent: true,
  });

  // forceSingleAgent branches first
  assertEq(r.mode, 'single', 'single wins');
  assertEq(r.results.length, 1, '1 result');
}

// ============================================================================
// executePrompt: unsupported provider → error captured
// ============================================================================
console.log('\n── executePrompt: unsupported provider ───────────────────');

resetRoutes();
svc.invalidateConfigCache();
{
  routes.push({
    pattern: /SELECT config_key.*FROM agent_config/i,
    response: [[]],
    once: true,
  });

  nextRouting = {
    primary_agent: { id: 'px', name: 'Mystery', provider: 'claude-via-holographic-tv' },
    comparison_agents: [],
    is_multi_agent: false,
    rule: null,
  };

  const r = await svc.executePrompt({
    stepId: 77,
    promptText: 'bad provider',
    forceSingleAgent: true,
  });

  assertEq(r.mode, 'single', 'mode single');
  assertEq(r.results.length, 1, '1 result');
  assert(r.results[0].error !== null, 'error captured');
  assert(r.results[0].error.includes('Unsupported provider'), 'error text');
  // Result was still recorded (INSERT)
  assert(queryLog.some(q => /INSERT INTO prompt_execution_results/i.test(q.sql)), 'still inserted');
}

// ============================================================================
// getExecutionGroup
// ============================================================================
console.log('\n── getExecutionGroup ─────────────────────────────────────');

resetRoutes();
{
  const gid = 'group-abc';
  routes.push({
    pattern: /FROM prompt_execution_results r[\s\S]*JOIN agent_registry/i,
    response: [[
      {
        id: 'r1', agent_id: 'p1', agent_name: 'P1', agent_provider: 'anthropic',
        violations_found: JSON.stringify([{ type: 'insufficient_output' }]),
      },
      {
        id: 'r2', agent_id: 'c1', agent_name: 'C1', agent_provider: 'anthropic',
        violations_found: null,
      },
    ]],
    once: true,
  });
  nextComparison = { summary: { total: 2 } };

  const r = await svc.getExecutionGroup(gid);
  assertEq(r.execution_group_id, gid, 'group id passed through');
  assertEq(r.results.length, 2, '2 results');
  assertEq(r.results[0].violations_found[0].type, 'insufficient_output', 'r1 violations parsed');
  assertEq(r.results[1].violations_found, [], 'r2 empty default');
  assertEq(r.comparison, { summary: { total: 2 } }, 'comparison passed through');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
