#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowCostService.js (OMD-977)
 *
 * Tests the pure cost-calculation logic of:
 *   - getWorkflowCost(workflowId)  — per-workflow cost breakdown
 *   - getCostReport()              — system-wide aggregate report
 *
 * Both functions read from MariaDB; we stub `../config/db` getAppPool with
 * a fake pool that routes SQL by regex and returns canned rows. The test
 * focus is on the deterministic computations the service does AFTER the
 * SQL results come back: token→USD math, rounding, success rate, win rate,
 * wasted-execution counting, etc.
 *
 * Run: npx tsx server/src/services/__tests__/workflowCostService.test.ts
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

function assertNear(actual: number, expected: number, tol: number, message: string): void {
  if (Math.abs(actual - expected) <= tol) {
    console.log(`  PASS: ${message}`); passed++;
  } else {
    console.error(`  FAIL: ${message}\n         expected: ~${expected} (±${tol})\n         actual:   ${actual}`);
    failed++;
  }
}

// ── Fake pool factory ────────────────────────────────────────────────
type Route = { match: RegExp; rows: any[] };

function makePool(routes: Route[]) {
  const calls: Array<{ sql: string; params: any[] }> = [];
  return {
    calls,
    query: async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      for (const r of routes) {
        if (r.match.test(sql)) return [r.rows];
      }
      return [[]];
    },
  };
}

// ── Stub ../config/db BEFORE requiring SUT ───────────────────────────
let activePool: any = makePool([]);
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => activePool },
} as any;

const { getWorkflowCost, getCostReport } = require('../workflowCostService');

async function main() {

// ============================================================================
// getWorkflowCost — basic cost computation
// ============================================================================
console.log('\n── getWorkflowCost: basic ──────────────────────────────');

activePool = makePool([
  {
    match: /FROM\s+prompt_workflows\s+WHERE\s+id/i,
    rows: [{ id: 5, name: 'My Workflow', component: 'records', status: 'active', step_count: 3 }],
  },
  {
    match: /FROM\s+prompt_execution_results\s+r/i,
    rows: [
      // First execution: 1000 in / 500 out @ $0.001/k in / $0.002/k out → 0.001 + 0.001 = $0.002
      {
        prompt_plan_step_id: 1, agent_id: 10, execution_duration_ms: 1500,
        token_count_input: 1000, token_count_output: 500, was_selected: 1,
        completion_status: 'success', evaluator_status: 'passed',
        agent_name: 'gpt-4', cost_per_1k_input: '0.001', cost_per_1k_output: '0.002',
      },
      // Second execution: 2000 in / 1000 out → 0.002 + 0.002 = $0.004 (not selected → wasted)
      {
        prompt_plan_step_id: 1, agent_id: 11, execution_duration_ms: 2500,
        token_count_input: 2000, token_count_output: 1000, was_selected: 0,
        completion_status: 'success', evaluator_status: 'passed',
        agent_name: 'claude', cost_per_1k_input: '0.001', cost_per_1k_output: '0.002',
      },
      // Third: 3000 in / 1500 out → 0.003 + 0.003 = $0.006 (also not selected → wasted)
      {
        prompt_plan_step_id: 2, agent_id: 11, execution_duration_ms: 3500,
        token_count_input: 3000, token_count_output: 1500, was_selected: 0,
        completion_status: 'success', evaluator_status: 'passed',
        agent_name: 'claude', cost_per_1k_input: '0.001', cost_per_1k_output: '0.002',
      },
    ],
  },
]);

const r = await getWorkflowCost(5);
assertEq(r.workflow_id, 5, 'workflow_id');
assertEq(r.workflow_name, 'My Workflow', 'workflow_name');
assertEq(r.status, 'active', 'status');
assertEq(r.step_count, 3, 'step_count');
assertEq(r.cost.total_input_tokens, 6000, 'total_input_tokens summed');
assertEq(r.cost.total_output_tokens, 3000, 'total_output_tokens summed');
assertNear(r.cost.total_usd, 0.012, 0.0001, 'total_usd: 0.002+0.004+0.006');
assertEq(r.cost.total_duration_ms, 7500, 'total_duration_ms summed');
assertEq(r.cost.execution_count, 3, 'execution_count');
// Wasted: counts !was_selected when count > 1, so #2 and #3 → 2
assertEq(r.cost.wasted_executions, 2, 'wasted_executions');
assertEq(r.cost.wasted_pct, 67, 'wasted_pct rounded (2/3=66.67→67)');

// SQL params
assertEq(activePool.calls[0].params, [5], 'workflow lookup param');
assertEq(activePool.calls[1].params, [5], 'execution lookup param');

// ============================================================================
// getWorkflowCost — workflow not found
// ============================================================================
console.log('\n── getWorkflowCost: not found ─────────────────────────');

activePool = makePool([
  { match: /FROM\s+prompt_workflows/i, rows: [] },
]);
let caught: Error | null = null;
try {
  await getWorkflowCost(999);
} catch (e: any) {
  caught = e;
}
assert(caught !== null, 'throws when workflow missing');
assert(caught !== null && caught.message.includes('999'), 'error message includes id');

// ============================================================================
// getWorkflowCost — empty results
// ============================================================================
console.log('\n── getWorkflowCost: empty results ─────────────────────');

activePool = makePool([
  {
    match: /FROM\s+prompt_workflows/i,
    rows: [{ id: 1, name: 'Empty', component: 'x', status: 'draft', step_count: 0 }],
  },
  { match: /FROM\s+prompt_execution_results/i, rows: [] },
]);

const empty = await getWorkflowCost(1);
assertEq(empty.cost.total_usd, 0, 'empty: total_usd=0');
assertEq(empty.cost.execution_count, 0, 'empty: execution_count=0');
assertEq(empty.cost.wasted_executions, 0, 'empty: wasted_executions=0');
assertEq(empty.cost.wasted_pct, 0, 'empty: wasted_pct=0 (no div by zero)');

// ============================================================================
// getWorkflowCost — handles null tokens and missing rates
// ============================================================================
console.log('\n── getWorkflowCost: nulls ─────────────────────────────');

activePool = makePool([
  {
    match: /FROM\s+prompt_workflows/i,
    rows: [{ id: 2, name: 'N', component: 'x', status: 'active', step_count: 1 }],
  },
  {
    match: /FROM\s+prompt_execution_results/i,
    rows: [
      {
        prompt_plan_step_id: 1, agent_id: 10, execution_duration_ms: null,
        token_count_input: null, token_count_output: null, was_selected: 1,
        completion_status: 'success', evaluator_status: 'passed',
        agent_name: 'x', cost_per_1k_input: null, cost_per_1k_output: null,
      },
    ],
  },
]);

const nullsRes = await getWorkflowCost(2);
assertEq(nullsRes.cost.total_input_tokens, 0, 'null tokens → 0');
assertEq(nullsRes.cost.total_output_tokens, 0, 'null tokens → 0');
assertEq(nullsRes.cost.total_usd, 0, 'null cost → 0');
assertEq(nullsRes.cost.total_duration_ms, 0, 'null duration → 0');
assertEq(nullsRes.cost.execution_count, 1, 'execution_count still 1');

// ============================================================================
// getWorkflowCost — rounding to 4 decimals
// ============================================================================
console.log('\n── getWorkflowCost: rounding ──────────────────────────');

activePool = makePool([
  {
    match: /FROM\s+prompt_workflows/i,
    rows: [{ id: 3, name: 'R', component: 'x', status: 'active', step_count: 1 }],
  },
  {
    match: /FROM\s+prompt_execution_results/i,
    rows: [
      // 333 input / 666 output @ 0.0003 / 0.0006 →
      //   inputCost = 0.333*0.0003 = 0.0000999
      //   outputCost = 0.666*0.0006 = 0.0003996
      //   total = 0.0004995 → rounded to 4 places = 0.0005
      {
        prompt_plan_step_id: 1, agent_id: 10, execution_duration_ms: 100,
        token_count_input: 333, token_count_output: 666, was_selected: 1,
        completion_status: 'success', evaluator_status: 'passed',
        agent_name: 'x', cost_per_1k_input: '0.0003', cost_per_1k_output: '0.0006',
      },
    ],
  },
]);

const rounded = await getWorkflowCost(3);
assertEq(rounded.cost.total_usd, 0.0005, 'cost rounded to 4 decimals');

// ============================================================================
// getCostReport — agent_distribution computation
// ============================================================================
console.log('\n── getCostReport: agent_distribution ──────────────────');

activePool = makePool([
  {
    // Agent usage query
    match: /FROM\s+agent_registry\s+a\s+LEFT JOIN\s+prompt_execution_results/i,
    rows: [
      {
        agent_id: 10, agent_name: 'gpt-4', provider: 'openai',
        cost_per_1k_input: '0.01', cost_per_1k_output: '0.03',
        execution_count: 10,
        total_input_tokens: '100000', total_output_tokens: '50000',
        avg_duration_ms: 1234.7,
        selected_count: '7',
        success_count: '8', failure_count: '2',
      },
      {
        agent_id: 11, agent_name: 'claude', provider: 'anthropic',
        cost_per_1k_input: '0.005', cost_per_1k_output: '0.015',
        execution_count: 4,
        total_input_tokens: '20000', total_output_tokens: '10000',
        avg_duration_ms: 800,
        selected_count: '4',
        success_count: '4', failure_count: '0',
      },
      // Zero-execution agent — exercise win/success rate divide-by-zero guards
      {
        agent_id: 12, agent_name: 'idle', provider: 'x',
        cost_per_1k_input: '0', cost_per_1k_output: '0',
        execution_count: 0,
        total_input_tokens: null, total_output_tokens: null,
        avg_duration_ms: null,
        selected_count: null,
        success_count: null, failure_count: null,
      },
    ],
  },
  {
    match: /FROM\s+prompt_agent_comparisons/i,
    rows: [{ total_comparisons: '5', tie_breaker_count: '2', unique_groups: '3' }],
  },
  {
    match: /FROM\s+prompt_workflows\s+w/i,
    rows: [
      {
        id: 100, name: 'WF-A', component: 'records', status: 'active', step_count: 5,
        execution_count: 12,
        total_input_tokens: '50000', total_output_tokens: '20000',
      },
      {
        id: 101, name: 'WF-B', component: 'ocr', status: 'draft', step_count: 2,
        execution_count: 0,
        total_input_tokens: null, total_output_tokens: null,
      },
    ],
  },
  {
    // prompt_type query
    match: /GROUP BY s\.prompt_type/i,
    rows: [
      { prompt_type: 'system', execution_count: 5, input_tokens: '10000', output_tokens: '4000' },
      { prompt_type: 'user', execution_count: 3, input_tokens: null, output_tokens: null },
    ],
  },
]);

const report = await getCostReport();

// gpt-4: 100k in @ 0.01 = $1.00 + 50k out @ 0.03 = $1.50 → $2.50
// claude: 20k in @ 0.005 = $0.10 + 10k out @ 0.015 = $0.15 → $0.25
// idle: 0
// Total cost: $2.75
assertNear(report.summary.total_cost_usd, 2.75, 0.001, 'summary.total_cost_usd');
assertEq(report.summary.total_executions, 14, 'summary.total_executions (10+4+0)');
assertEq(report.summary.total_tokens, 180000, 'summary.total_tokens (150k+30k+0)');
assertNear(report.summary.avg_cost_per_execution, 0.1964, 0.001, 'avg_cost_per_execution');

// gpt-4 entry
const gpt = report.agent_distribution[0];
assertEq(gpt.agent_id, 10, 'gpt agent_id');
assertEq(gpt.execution_count, 10, 'gpt execution_count');
assertEq(gpt.total_input_tokens, 100000, 'gpt input tokens (Number-coerced)');
assertEq(gpt.total_output_tokens, 50000, 'gpt output tokens');
assertNear(gpt.total_cost_usd, 2.5, 0.001, 'gpt total_cost_usd');
assertEq(gpt.avg_duration_ms, 1235, 'gpt avg_duration_ms rounded');
assertEq(gpt.selected_count, 7, 'gpt selected_count');
assertEq(gpt.success_rate, 80, 'gpt success_rate (8/10=80%)');
assertEq(gpt.win_rate, 70, 'gpt win_rate (7/10=70%)');

// idle entry — zero-execution edge case
const idle = report.agent_distribution[2];
assertEq(idle.execution_count, 0, 'idle execution_count');
assertEq(idle.total_input_tokens, 0, 'idle null → 0');
assertEq(idle.total_cost_usd, 0, 'idle cost 0');
assertEq(idle.success_rate, 0, 'idle success_rate=0 (no div by zero)');
assertEq(idle.win_rate, 0, 'idle win_rate=0');
assertEq(idle.selected_count, 0, 'idle selected_count=0 (null → 0)');
assertEq(idle.avg_duration_ms, 0, 'idle avg_duration_ms=0 (null → 0)');

// multi_agent
assertEq(report.multi_agent.total_comparisons, 5, 'multi_agent.total_comparisons');
assertEq(report.multi_agent.tie_breaker_count, 2, 'multi_agent.tie_breaker_count');

// most_expensive_workflows
assertEq(report.most_expensive_workflows.length, 2, '2 workflows');
const wfA = report.most_expensive_workflows[0];
assertEq(wfA.workflow_id, 100, 'wfA id');
assertEq(wfA.total_tokens, 70000, 'wfA total_tokens (50k+20k)');
const wfB = report.most_expensive_workflows[1];
assertEq(wfB.execution_count, 0, 'wfB execution_count');
assertEq(wfB.total_tokens, 0, 'wfB total_tokens (nulls → 0)');

// cost_by_prompt_type
assertEq(report.cost_by_prompt_type.length, 2, '2 prompt types');
assertEq(report.cost_by_prompt_type[0].prompt_type, 'system', 'first prompt_type');
assertEq(report.cost_by_prompt_type[0].total_tokens, 14000, 'system total_tokens');
assertEq(report.cost_by_prompt_type[1].total_tokens, 0, 'user total_tokens (nulls)');

// generated_at is ISO
assert(typeof report.generated_at === 'string', 'generated_at is string');
assert(/^\d{4}-\d{2}-\d{2}T/.test(report.generated_at), 'generated_at is ISO format');

// ============================================================================
// getCostReport — empty system
// ============================================================================
console.log('\n── getCostReport: empty system ────────────────────────');

activePool = makePool([
  { match: /FROM\s+agent_registry/i, rows: [] },
  { match: /FROM\s+prompt_agent_comparisons/i, rows: [{}] },
  { match: /FROM\s+prompt_workflows/i, rows: [] },
  { match: /GROUP BY s\.prompt_type/i, rows: [] },
]);

const emptyReport = await getCostReport();
assertEq(emptyReport.summary.total_cost_usd, 0, 'empty: total_cost_usd=0');
assertEq(emptyReport.summary.total_executions, 0, 'empty: total_executions=0');
assertEq(emptyReport.summary.avg_cost_per_execution, 0, 'empty: avg_cost_per_execution=0');
assertEq(emptyReport.agent_distribution, [], 'empty: agent_distribution=[]');
assertEq(emptyReport.multi_agent.total_comparisons, 0, 'empty: 0 comparisons');
assertEq(emptyReport.most_expensive_workflows, [], 'empty: most_expensive_workflows');
assertEq(emptyReport.cost_by_prompt_type, [], 'empty: cost_by_prompt_type');

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
