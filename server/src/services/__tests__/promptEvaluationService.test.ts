#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptEvaluationService.js (OMD-1036)
 *
 * Deterministic prompt result evaluator. Pure evaluateResult() classifies
 * execution output into result_type + completion_status + evaluator_status
 * via regex pattern matching + keyword scoring.
 *
 * Strategy: SQL-routed fake pool stubs `../config/db` via require.cache.
 * Pure functions (evaluateResult, extractRequirements, extractProhibitions)
 * are tested with string fixtures directly.
 *
 * Coverage:
 *   - Constants exported: VIOLATION_PATTERNS as {key, desc} list
 *   - extractRequirements:
 *       · REQUIREMENTS section parsing (numbered/bulleted)
 *       · OUTPUT REQUIREMENTS parsing
 *       · TASK section captured
 *       · filters short lines (< 6 chars)
 *       · no sections → empty
 *   - extractProhibitions:
 *       · numbered prohibitions parsed
 *       · short lines filtered
 *       · no section → empty
 *   - evaluateResult:
 *       · happy path: requirements met → complete + pass
 *       · partial: some requirements missed → partial + pass (no violations)
 *       · violations: fallback/partial/placeholder → failed + fail
 *       · mock_data: disqualifying
 *       · blocker detected: blocked status
 *       · no requirements + result → complete (short), or complete/failed
 *       · result_type classification (plan, implementation, verification,
 *         correction, unblock)
 *       · changed_files extracted from "Created file: ..." pattern
 *       · evaluator_notes contains all sections
 *   - runEvaluation:
 *       · not found → throws
 *       · status not complete/verified → throws
 *       · no execution_result → throws
 *       · happy path: UPDATE + system log (SUCCESS/WARN) + return
 *       · execution_result as string not JSON → handled
 *   - getEvaluation:
 *       · not found → throws
 *       · happy path: parses JSON fields
 *       · null fields handled
 *   - enforceEvaluated:
 *       · not found → throws
 *       · no evaluator_status → throws
 *       · has evaluator_status → passes silently
 *
 * Run: npx tsx server/src/services/__tests__/promptEvaluationService.test.ts
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

// ── SQL-routed fake pool ────────────────────────────────────────────
type Route = { match: RegExp; rows?: any; respond?: (params: any[]) => any };
type Call = { sql: string; params: any[] };

const callLog: Call[] = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    callLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        if (r.respond) return [r.respond(params)];
        return [r.rows];
      }
    }
    return [[]];
  },
};

function resetRoutes() {
  callLog.length = 0;
  routes = [];
}

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool, promisePool: fakePool },
} as any;

const {
  runEvaluation,
  getEvaluation,
  enforceEvaluated,
  evaluateResult,
  extractRequirements,
  extractProhibitions,
  VIOLATION_PATTERNS,
} = require('../promptEvaluationService');

async function main() {

// ============================================================================
// VIOLATION_PATTERNS export
// ============================================================================
console.log('\n── VIOLATION_PATTERNS export ─────────────────────────────');

assert(Array.isArray(VIOLATION_PATTERNS), 'is array');
assert(VIOLATION_PATTERNS.length >= 8, '>= 8 patterns');
{
  const keys = VIOLATION_PATTERNS.map((v: any) => v.key);
  assert(keys.includes('fallback_behavior'), 'has fallback_behavior');
  assert(keys.includes('partial_implementation'), 'has partial_implementation');
  assert(keys.includes('placeholder_content'), 'has placeholder_content');
  assert(keys.includes('mock_data'), 'has mock_data');
  assert(keys.includes('error_suppression'), 'has error_suppression');
  // Each entry has key+desc only (pattern not exported)
  for (const vp of VIOLATION_PATTERNS) {
    assert(typeof vp.key === 'string', `${vp.key}: key is string`);
    assert(typeof vp.desc === 'string', `${vp.key}: desc is string`);
    assert(vp.pattern === undefined, `${vp.key}: pattern NOT exported (transparency-safe)`);
  }
}

// ============================================================================
// extractRequirements
// ============================================================================
console.log('\n── extractRequirements ───────────────────────────────────');

{
  const prompt = `TASK:
Build a widget framework for the app.

REQUIREMENTS:
1. Install the widget dependency
2. Configure connection settings
3. X

OUTPUT REQUIREMENTS:
- Provide evidence of each step
- Document any assumptions

PROHIBITIONS:
1. No fallback behavior
`;
  const reqs = extractRequirements(prompt);
  const texts = reqs.map((r: any) => r.text);
  const sources = reqs.map((r: any) => r.source);

  assert(texts.some((t: string) => t.includes('Install the widget dependency')), 'req 1');
  assert(texts.some((t: string) => t.includes('Configure connection settings')), 'req 2');
  assertEq(texts.includes('X'), false, 'short "X" filtered');
  assert(texts.some((t: string) => t.includes('Provide evidence')), 'output req 1');
  assert(texts.some((t: string) => t.includes('Document any assumptions')), 'output req 2');
  assert(texts.some((t: string) => t.includes('Build a widget framework')), 'TASK captured');
  assert(sources.includes('REQUIREMENTS'), 'REQUIREMENTS source');
  assert(sources.includes('OUTPUT_REQUIREMENTS'), 'OUTPUT_REQUIREMENTS source');
  assert(sources.includes('TASK'), 'TASK source');
}

// No sections → no reqs
{
  const reqs = extractRequirements('Random text with no sections');
  assertEq(reqs, [], 'empty when no sections');
}

// ============================================================================
// extractProhibitions
// ============================================================================
console.log('\n── extractProhibitions ───────────────────────────────────');

{
  const prompt = `PROHIBITIONS:
1. No fallback or workaround behavior
2. No partial implementations marked as complete
3. No mock data in production

FINAL REQUIREMENT:
Provide verification.
`;
  const prohibitions = extractProhibitions(prompt);
  assertEq(prohibitions.length, 3, '3 prohibitions');
  assert(prohibitions[0].includes('fallback'), 'p1');
  assert(prohibitions[2].includes('mock data'), 'p3');
}

// No section → []
{
  const prohibitions = extractProhibitions('Plain text');
  assertEq(prohibitions, [], 'empty');
}

// ============================================================================
// evaluateResult — complete + pass
// ============================================================================
console.log('\n── evaluateResult: complete + pass ───────────────────────');

{
  const prompt = `TASK:
Install widget framework for the application.

REQUIREMENTS:
1. Install widget framework dependency
2. Configure database connection
`;
  // Result mentions all requirement keywords and no violations
  const result = 'Installed widget framework dependency successfully. Configured database connection and verified the setup.';
  const ev = evaluateResult(prompt, result, null);

  assertEq(ev.completion_status, 'complete', 'complete');
  assertEq(ev.evaluator_status, 'pass', 'pass');
  assertEq(ev.violations_found.length, 0, 'no violations');
  assertEq(ev.blockers_found.length, 0, 'no blockers');
  assert(ev.completed_outcomes.length >= 2, 'outcomes met');
  assertEq(ev.remaining_outcomes.length, 0, 'none remaining');
  assert(ev.evaluated_at, 'timestamp set');
}

// ============================================================================
// evaluateResult — partial + pass (no violations)
// ============================================================================
console.log('\n── evaluateResult: partial ───────────────────────────────');

{
  const prompt = `REQUIREMENTS:
1. Install widget framework dependency
2. Configure database connection pooling
3. Setup authentication middleware routing
`;
  // Only matches reqs 1 & 2 keywords
  const result = 'Installed widget framework dependency and configured database connection pooling.';
  const ev = evaluateResult(prompt, result, null);

  assertEq(ev.completion_status, 'partial', 'partial');
  assertEq(ev.evaluator_status, 'pass', 'pass (no violations)');
  assert(ev.completed_outcomes.length >= 1, 'some complete');
  assert(ev.remaining_outcomes.length >= 1, 'some remaining');
}

// ============================================================================
// evaluateResult — violation → failed + fail
// ============================================================================
console.log('\n── evaluateResult: fallback violation ────────────────────');

{
  const prompt = `REQUIREMENTS:
1. Install widget framework
`;
  const result = 'Installed widget framework but used a workaround fallback for the config.';
  const ev = evaluateResult(prompt, result, null);

  assertEq(ev.evaluator_status, 'fail', 'fail');
  assert(ev.violations_found.length > 0, 'violations present');
  const codes = ev.violations_found.map((v: any) => v.key);
  assert(codes.includes('fallback_behavior'), 'fallback detected');
  assertEq(ev.completion_status, 'failed', 'failed');
}

// Placeholder content
{
  const prompt = `REQUIREMENTS:
1. Set the user name field
`;
  const result = 'Set user name to placeholder value.';
  const ev = evaluateResult(prompt, result, null);
  const codes = ev.violations_found.map((v: any) => v.key);
  assert(codes.includes('placeholder_content'), 'placeholder detected');
}

// Mock data is disqualifying
{
  const prompt = `REQUIREMENTS:
1. Integrate payment processor
`;
  const result = 'Integrated payment processor using mock data for the api calls.';
  const ev = evaluateResult(prompt, result, null);
  const codes = ev.violations_found.map((v: any) => v.key);
  assert(codes.includes('mock_data'), 'mock_data detected');
  assertEq(ev.evaluator_status, 'fail', 'mock_data disqualifies');
}

// ============================================================================
// evaluateResult — blocked
// ============================================================================
console.log('\n── evaluateResult: blocked ───────────────────────────────');

{
  // Requirements use keywords that don't appear in the blocked result,
  // so completed_outcomes stays below the 30% threshold → blocked status.
  const prompt = `REQUIREMENTS:
1. Generate quarterly sales report
2. Export customer records to CSV
3. Archive old transaction logs
`;
  const result = 'Halted — waiting on upstream service approval. Permission denied from the target endpoint.';
  const ev = evaluateResult(prompt, result, null);
  assert(ev.blockers_found.length > 0, 'blockers detected');
  assertEq(ev.completion_status, 'blocked', 'blocked');
  assertEq(ev.evaluator_status, 'fail', 'fail when blocked');
}

// ============================================================================
// evaluateResult — result_type classification
// ============================================================================
console.log('\n── evaluateResult: result_type ───────────────────────────');

// Verification dominant
{
  const ev = evaluateResult(
    'REQUIREMENTS:\n1. Verify the system works\n',
    'Verified the system. All tests pass. Confirmed and validated.',
    null
  );
  assertEq(ev.result_type, 'verification', 'verification classified');
}

// Correction dominant
{
  const ev = evaluateResult(
    'REQUIREMENTS:\n1. Fix the regression\n',
    'Fixed the regression. Patched the bug fix and corrected the issue.',
    null
  );
  assertEq(ev.result_type, 'correction', 'correction classified');
}

// Plan dominant
{
  const ev = evaluateResult(
    'REQUIREMENTS:\n1. Design something\n',
    'Here is the plan. The design proposal will create a new architecture. Roadmap included.',
    null
  );
  assertEq(ev.result_type, 'plan', 'plan classified');
}

// ============================================================================
// evaluateResult — changed files
// ============================================================================
console.log('\n── evaluateResult: changed files ─────────────────────────');

{
  const result = 'Created src/widget.ts and modified src/config.ts. Also added lib/helpers.ts for utilities.';
  const ev = evaluateResult('REQUIREMENTS:\n1. Do something\n', result, null);
  assert(ev.changed_files.length >= 2, 'at least 2 files');
  assert(ev.changed_files.includes('src/widget.ts'), 'widget.ts');
  assert(ev.changed_files.includes('src/config.ts'), 'config.ts');
}

// ============================================================================
// evaluateResult — no requirements
// ============================================================================
console.log('\n── evaluateResult: no requirements ───────────────────────');

// Short result with no reqs → failed
{
  const ev = evaluateResult('No sections here', 'ok', null);
  assertEq(ev.completion_status, 'failed', 'short result → failed');
}

// Long result with no reqs → complete
{
  const longResult = 'This is a long result that definitely exceeds fifty characters of content.';
  const ev = evaluateResult('No sections here', longResult, null);
  assertEq(ev.completion_status, 'complete', 'long result → complete');
}

// ============================================================================
// evaluateResult — evaluator notes
// ============================================================================
console.log('\n── evaluateResult: notes ─────────────────────────────────');

{
  const ev = evaluateResult(
    'REQUIREMENTS:\n1. Install widget framework dependency\n',
    'Installed widget framework dependency.',
    null
  );
  assert(ev.evaluator_notes.includes('Result type:'), 'notes: Result type');
  assert(ev.evaluator_notes.includes('Completion:'), 'notes: Completion');
  assert(ev.evaluator_notes.includes('Evaluator:'), 'notes: Evaluator');
}

// ============================================================================
// evaluateResult — accepts object execution result
// ============================================================================
console.log('\n── evaluateResult: object result ─────────────────────────');

{
  const ev = evaluateResult(
    'REQUIREMENTS:\n1. Install something\n',
    { output: 'Installed something successfully' },
    null
  );
  assert(ev.evaluator_status !== undefined, 'handles object result');
  assert(typeof ev.completion_status === 'string', 'has completion_status');
}

// ============================================================================
// runEvaluation — errors
// ============================================================================
console.log('\n── runEvaluation: errors ─────────────────────────────────');

// Not found
resetRoutes();
routes = [{ match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [] }];
{
  let caught: Error | null = null;
  try { await runEvaluation('missing', 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('not found'), 'not found throws');
}

// Wrong status
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [{ id: 'p1', status: 'draft', prompt_text: 'X', execution_result: '{}' }],
}];
{
  let caught: Error | null = null;
  try { await runEvaluation('p1', 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Cannot evaluate'), 'draft rejected');
}

// No execution result
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [{ id: 'p1', status: 'complete', prompt_text: 'X', execution_result: null }],
}];
{
  let caught: Error | null = null;
  try { await runEvaluation('p1', 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('no execution_result'), 'no exec result');
}

// ============================================================================
// runEvaluation — happy path
// ============================================================================
console.log('\n── runEvaluation: happy path ─────────────────────────────');

resetRoutes();
{
  const prompt = {
    id: 'p1',
    status: 'complete',
    prompt_text: 'REQUIREMENTS:\n1. Install widget framework dependency\n',
    execution_result: JSON.stringify('Installed widget framework dependency successfully.'),
    verification_result: null,
  };
  let selectIdx = 0;
  routes = [
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
      respond: () => {
        selectIdx++;
        if (selectIdx === 1) return [prompt];
        return [{ ...prompt, evaluator_status: 'pass', completion_status: 'complete' }];
      },
    },
    { match: /UPDATE om_prompt_registry SET/, rows: { affectedRows: 1 } },
    { match: /INSERT INTO system_logs/, rows: { insertId: 1 } },
  ];
  const result = await runEvaluation('p1', 'eval@x.com');
  assertEq(result.evaluation.completion_status, 'complete', 'evaluation complete');
  assertEq(result.evaluation.evaluator_status, 'pass', 'evaluation pass');
  assert(result.prompt !== undefined, 'prompt returned');

  // Verify UPDATE has all expected params
  const updateCall = callLog.find(c => /UPDATE om_prompt_registry SET/.test(c.sql));
  assert(updateCall !== undefined, 'update issued');
  assertEq(updateCall!.params[1], 'complete', 'completion_status param');
  assertEq(updateCall!.params[2], 'pass', 'evaluator_status param');
  assertEq(updateCall!.params[updateCall!.params.length - 2], 'eval@x.com', 'actor');
  assertEq(updateCall!.params[updateCall!.params.length - 1], 'p1', 'prompt id');

  // Verify log level SUCCESS on pass
  const logCall = callLog.find(c => /INSERT INTO system_logs/.test(c.sql));
  assert(logCall !== undefined, 'log inserted');
  assertEq(logCall!.params[0], 'SUCCESS', 'log level SUCCESS on pass');
}

// runEvaluation with violations → WARN log level
resetRoutes();
{
  const prompt = {
    id: 'p2',
    status: 'complete',
    prompt_text: 'REQUIREMENTS:\n1. Install widget\n',
    execution_result: JSON.stringify('Installed widget using a fallback workaround.'),
    verification_result: null,
  };
  let selectIdx = 0;
  routes = [
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
      respond: () => {
        selectIdx++;
        return [prompt];
      },
    },
    { match: /UPDATE om_prompt_registry SET/, rows: { affectedRows: 1 } },
    { match: /INSERT INTO system_logs/, rows: { insertId: 1 } },
  ];
  const result = await runEvaluation('p2', 'eval@x.com');
  assertEq(result.evaluation.evaluator_status, 'fail', 'fail with violation');

  const logCall = callLog.find(c => /INSERT INTO system_logs/.test(c.sql));
  assertEq(logCall!.params[0], 'WARN', 'log level WARN on fail');
}

// runEvaluation with non-JSON execution_result (plain string) handled
resetRoutes();
{
  const prompt = {
    id: 'p3',
    status: 'verified',
    prompt_text: 'REQUIREMENTS:\n1. Do the thing\n',
    execution_result: 'Plain string not JSON',
    verification_result: null,
  };
  routes = [
    { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [prompt] },
    { match: /UPDATE om_prompt_registry SET/, rows: { affectedRows: 1 } },
    { match: /INSERT INTO system_logs/, rows: { insertId: 1 } },
  ];
  const result = await runEvaluation('p3', 'actor');
  assert(result.evaluation !== undefined, 'handles non-JSON execution_result');
}

// ============================================================================
// getEvaluation
// ============================================================================
console.log('\n── getEvaluation ─────────────────────────────────────────');

// Not found
resetRoutes();
routes = [{ match: /SELECT id, evaluator_status/, rows: [] }];
{
  let caught: Error | null = null;
  try { await getEvaluation('missing'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('not found'), 'not found throws');
}

// Happy path with JSON fields
resetRoutes();
routes = [{
  match: /SELECT id, evaluator_status/,
  rows: [{
    id: 'p1',
    evaluator_status: 'pass',
    evaluator_notes: 'All good',
    result_type: 'implementation',
    completion_status: 'complete',
    issues_found: JSON.stringify([]),
    blockers_found: JSON.stringify([]),
    violations_found: JSON.stringify([{ key: 'v1' }]),
    completed_outcomes: JSON.stringify([{ source: 'REQ', requirement: 'a' }]),
    remaining_outcomes: null,
    changed_files: JSON.stringify(['src/a.ts']),
    evaluated_at: '2026-04-10T00:00:00Z',
    evaluated_by: 'eval@x.com',
    next_prompt_id: null,
  }],
}];
{
  const ev = await getEvaluation('p1');
  assertEq(ev.prompt_id, 'p1', 'prompt_id');
  assertEq(ev.evaluator_status, 'pass', 'evaluator_status');
  assertEq(ev.result_type, 'implementation', 'result_type');
  assertEq(ev.violations_found, [{ key: 'v1' }], 'violations parsed');
  assertEq(ev.completed_outcomes, [{ source: 'REQ', requirement: 'a' }], 'completed parsed');
  assertEq(ev.remaining_outcomes, null, 'null field → null');
  assertEq(ev.changed_files, ['src/a.ts'], 'changed_files parsed');
}

// ============================================================================
// enforceEvaluated
// ============================================================================
console.log('\n── enforceEvaluated ──────────────────────────────────────');

// Not found
resetRoutes();
routes = [{ match: /SELECT evaluator_status, completion_status/, rows: [] }];
{
  let caught: Error | null = null;
  try { await enforceEvaluated('missing'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('not found'), 'not found throws');
}

// Not evaluated
resetRoutes();
routes = [{
  match: /SELECT evaluator_status, completion_status/,
  rows: [{ evaluator_status: null, completion_status: null }],
}];
{
  let caught: Error | null = null;
  try { await enforceEvaluated('p1'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Evaluation required'), 'not evaluated throws');
}

// Evaluated → passes silently
resetRoutes();
routes = [{
  match: /SELECT evaluator_status, completion_status/,
  rows: [{ evaluator_status: 'pass', completion_status: 'complete' }],
}];
{
  let caught: Error | null = null;
  try { await enforceEvaluated('p1'); }
  catch (e: any) { caught = e; }
  assertEq(caught, null, 'passes silently');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
