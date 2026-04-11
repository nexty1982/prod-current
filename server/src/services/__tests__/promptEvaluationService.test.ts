#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptEvaluationService.js (OMD-1071)
 *
 * Server-side deterministic evaluator for prompt execution results.
 * One external dep: `../config/db.getAppPool()`. Stub via require.cache
 * with a SQL-routed fake pool before loading the SUT.
 *
 * Coverage:
 *   - Pure functions:
 *       · extractRequirements (REQUIREMENTS / OUTPUT REQUIREMENTS / TASK sections)
 *       · extractProhibitions (PROHIBITIONS section)
 *       · evaluateResult:
 *           - result_type classification (plan, implementation, verification,
 *             correction, unblock, continuation, remediation)
 *           - violations_found (all 8 violation patterns)
 *           - prohibition matching (>=60% keyword overlap)
 *           - requirement completion (>=50% keyword match → completed)
 *           - changed_files extraction (2 file pattern regexes)
 *           - blockers_found (dependency / access / missing_resource / infrastructure)
 *           - completion_status: complete / partial / failed / blocked
 *           - evaluator_status: pass / fail (disqualifying violations)
 *           - Handles string or object execution/verification results
 *           - no-requirements fallback (short vs long result)
 *
 *   - DB operations (stubbed pool):
 *       · runEvaluation:
 *           - prompt not found → throws
 *           - wrong status → throws
 *           - missing execution_result → throws
 *           - happy path: UPDATE + system_logs INSERT + returns evaluation
 *       · getEvaluation:
 *           - not found → throws
 *           - parses JSON fields
 *           - tolerates non-JSON stored strings
 *       · enforceEvaluated:
 *           - not found → throws
 *           - not evaluated → throws
 *           - evaluated → returns silently
 *
 *   - Constants: VIOLATION_PATTERNS exported shape
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

// ── Fake pool ─────────────────────────────────────────────
type Route = { match: RegExp; rows?: any[]; respond?: (params: any[]) => any };
let routes: Route[] = [];
type QueryCall = { sql: string; params: any[] };
const queryCalls: QueryCall[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryCalls.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        if (r.respond) {
          const out = r.respond(params);
          return [out, []];
        }
        return [r.rows || [], []];
      }
    }
    return [[], []];
  },
};

const dbStub = { getAppPool: () => fakePool };

const pathMod = require('path');
const dbBase = pathMod.resolve(__dirname, '../../config/db');
for (const ext of ['.js', '.ts']) {
  const full = dbBase + ext;
  require.cache[full] = { id: full, filename: full, loaded: true, exports: dbStub } as any;
}

function resetRoutes() {
  routes = [];
  queryCalls.length = 0;
}

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

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

assert(Array.isArray(VIOLATION_PATTERNS), 'exported as array');
assertEq(VIOLATION_PATTERNS.length, 8, '8 patterns');
assert(VIOLATION_PATTERNS.every((v: any) => v.key && v.desc), 'each has key+desc');
assert(!VIOLATION_PATTERNS.some((v: any) => v.pattern), 'pattern not exposed');
const keys = VIOLATION_PATTERNS.map((v: any) => v.key);
assert(keys.includes('fallback_behavior'), 'fallback_behavior');
assert(keys.includes('mock_data'), 'mock_data');
assert(keys.includes('error_suppression'), 'error_suppression');

// ============================================================================
// extractRequirements
// ============================================================================
console.log('\n── extractRequirements ───────────────────────────────────');

// REQUIREMENTS section
{
  const text = `TASK:
Do something important.

REQUIREMENTS:
- Implement feature X with correct logic
- Add unit tests for feature X
- Update the API documentation

---
`;
  const reqs = extractRequirements(text);
  assert(reqs.length >= 4, '4+ requirements extracted (task + 3 lines)');
  assert(reqs.some((r: any) => r.source === 'REQUIREMENTS'), 'REQUIREMENTS source');
  assert(reqs.some((r: any) => r.source === 'TASK'), 'TASK source');
}

// OUTPUT REQUIREMENTS section
{
  const text = `OUTPUT REQUIREMENTS:
- Must return JSON object
- Must include status field
`;
  const reqs = extractRequirements(text);
  assert(reqs.some((r: any) => r.source === 'OUTPUT_REQUIREMENTS'), 'OUTPUT_REQUIREMENTS source');
  assert(reqs.length >= 2, 'output reqs extracted');
}

// No sections
{
  const reqs = extractRequirements('random text with no sections');
  assertEq(reqs.length, 0, 'no sections → []');
}

// Short lines filtered
{
  const text = `REQUIREMENTS:
- hi
- A proper requirement that is long enough
`;
  const reqs = extractRequirements(text);
  // "hi" too short, "A proper requirement..." kept
  assertEq(reqs.filter((r: any) => r.source === 'REQUIREMENTS').length, 1, 'short line filtered');
}

// ============================================================================
// extractProhibitions
// ============================================================================
console.log('\n── extractProhibitions ───────────────────────────────────');

{
  const text = `PROHIBITIONS:
- Do not use mock data in production
- Never suppress errors silently
`;
  const p = extractProhibitions(text);
  assertEq(p.length, 2, '2 prohibitions');
  assert(p[0].includes('mock data'), 'mock data prohibition');
}

{
  const p = extractProhibitions('no section here');
  assertEq(p.length, 0, 'no section → []');
}

// ============================================================================
// evaluateResult — classification
// ============================================================================
console.log('\n── evaluateResult: result_type ───────────────────────────');

{
  // Plan
  const r = evaluateResult('', 'This is a plan to build a new feature. will create the module first.', null);
  assertEq(r.result_type, 'plan', 'plan classified');
}

{
  // Implementation
  const r = evaluateResult('', 'I created the file and wrote the code.', null);
  assertEq(r.result_type, 'implementation', 'implementation classified');
}

{
  // Verification
  const r = evaluateResult('', 'Verified and tested the changes. All tests pass.', null);
  assertEq(r.result_type, 'verification', 'verification classified');
}

{
  // Correction
  const r = evaluateResult('', 'Fixed the regression bug fix in the handler.', null);
  assertEq(r.result_type, 'correction', 'correction classified');
}

// ============================================================================
// evaluateResult — violations
// ============================================================================
console.log('\n── evaluateResult: violations ────────────────────────────');

{
  const r = evaluateResult('', 'I used a fallback to handle this edge case.', null);
  assert(r.violations_found.some((v: any) => v.key === 'fallback_behavior'), 'fallback detected');
  assertEq(r.evaluator_status, 'fail', 'fallback → fail');
}

{
  const r = evaluateResult('', 'Implementation is partial, TODO next.', null);
  assert(r.violations_found.some((v: any) => v.key === 'partial_implementation'), 'partial detected');
}

{
  const r = evaluateResult('', 'Used mock data for the test.', null);
  assert(r.violations_found.some((v: any) => v.key === 'mock_data'), 'mock detected');
  assertEq(r.evaluator_status, 'fail', 'mock_data → fail');
}

{
  const r = evaluateResult('', 'Placeholder content foo bar baz.', null);
  assert(r.violations_found.some((v: any) => v.key === 'placeholder_content'), 'placeholder detected');
}

{
  const r = evaluateResult('', 'I chose to do it differently, opted for a new approach.', null);
  assert(r.violations_found.some((v: any) => v.key === 'alternate_approach'), 'alternate detected');
}

{
  const r = evaluateResult('', 'Created a simplified version for now.', null);
  assert(r.violations_found.some((v: any) => v.key === 'simplified_version'), 'simplified detected');
}

// Clean result — no violations
{
  const r = evaluateResult('REQUIREMENTS:\n- Do the thing properly\n', 'Do the thing properly', null);
  assertEq(r.violations_found.length, 0, 'no violations for clean result');
}

// ============================================================================
// evaluateResult — prohibitions
// ============================================================================
console.log('\n── evaluateResult: prohibitions ──────────────────────────');

{
  const prompt = `PROHIBITIONS:
- Do not use database mocks in production
`;
  const r = evaluateResult(prompt, 'I used database mocks in production code', null);
  assert(
    r.violations_found.some((v: any) => v.key === 'prohibition_match'),
    'prohibition keyword match triggers violation'
  );
}

// ============================================================================
// evaluateResult — completion_status
// ============================================================================
console.log('\n── evaluateResult: completion_status ─────────────────────');

// All requirements met → complete
{
  const prompt = `REQUIREMENTS:
- Build the authentication system properly
`;
  const result = 'I built the authentication system properly with all required features.';
  const r = evaluateResult(prompt, result, null);
  assertEq(r.completion_status, 'complete', 'all met → complete');
  assertEq(r.evaluator_status, 'pass', 'clean complete → pass');
}

// Violation → failed
{
  const prompt = `REQUIREMENTS:
- Build authentication system
`;
  // Use "partial" which is a material violation
  const r = evaluateResult(prompt, 'Built a partial version of authentication', null);
  assertEq(r.completion_status, 'failed', 'material violation → failed');
  assertEq(r.evaluator_status, 'fail', 'failed → fail');
}

// No requirements + long result → complete
{
  const r = evaluateResult('', 'A' + 'X'.repeat(100), null);
  assertEq(r.completion_status, 'complete', 'no reqs + long result → complete');
}

// No requirements + short result → failed
{
  const r = evaluateResult('', 'short', null);
  assertEq(r.completion_status, 'failed', 'no reqs + short → failed');
}

// Blocker with low completion → blocked
{
  const prompt = `REQUIREMENTS:
- Install the specialized database driver
- Configure connection to external service endpoint
- Run migration scripts against staging environment
`;
  const result = 'Blocked by missing dependency';
  const r = evaluateResult(prompt, result, null);
  assertEq(r.completion_status, 'blocked', 'blocker → blocked');
  assertEq(r.evaluator_status, 'fail', 'blocked → fail');
  assert(r.blockers_found.length > 0, 'blocker recorded');
}

// Partial progress
{
  const prompt = `REQUIREMENTS:
- Unique requirement alpha beta gamma delta
- Unique requirement epsilon zeta eta theta
`;
  const result = 'Completed: alpha beta gamma delta done. The other is pending.';
  const r = evaluateResult(prompt, result, null);
  assertEq(r.completion_status, 'partial', 'partial completion');
  // partial + no violations → pass
  assertEq(r.evaluator_status, 'pass', 'partial without violations → pass');
}

// ============================================================================
// evaluateResult — changed_files
// ============================================================================
console.log('\n── evaluateResult: changed_files ─────────────────────────');

{
  const result = "Created: server/src/routes/test.js and modified `front-end/src/App.tsx`";
  const r = evaluateResult('', result, null);
  assert(r.changed_files.length >= 2, 'at least 2 files');
  assert(r.changed_files.some((f: string) => f.endsWith('.js')), 'js file');
  assert(r.changed_files.some((f: string) => f.endsWith('.tsx')), 'tsx file');
}

// ============================================================================
// evaluateResult — blockers
// ============================================================================
console.log('\n── evaluateResult: blockers ──────────────────────────────');

{
  const r = evaluateResult('', 'permission denied when reading', null);
  assert(r.blockers_found.some((b: any) => b.type === 'access'), 'access blocker');
}

{
  const r = evaluateResult('', 'module not found', null);
  assert(r.blockers_found.some((b: any) => b.type === 'missing_resource'), 'missing_resource blocker');
}

{
  const r = evaluateResult('', 'connection refused', null);
  assert(r.blockers_found.some((b: any) => b.type === 'infrastructure'), 'infra blocker');
}

// ============================================================================
// evaluateResult — accepts strings and objects
// ============================================================================
console.log('\n── evaluateResult: input types ───────────────────────────');

{
  const r = evaluateResult('', { output: 'hello world indeed' }, { status: 'ok' });
  assert(r.result_type, 'accepts object inputs');
}

{
  const r = evaluateResult('', null, null);
  assert(r.completion_status !== undefined, 'accepts null inputs');
}

// ============================================================================
// evaluateResult — returned shape
// ============================================================================
console.log('\n── evaluateResult: returned shape ────────────────────────');

{
  const r = evaluateResult('REQUIREMENTS:\n- Do the thing correctly\n', 'Did the thing correctly', null);
  assert('result_type' in r, 'result_type');
  assert('completion_status' in r, 'completion_status');
  assert('evaluator_status' in r, 'evaluator_status');
  assert('evaluator_notes' in r, 'evaluator_notes');
  assert('issues_found' in r, 'issues_found');
  assert('blockers_found' in r, 'blockers_found');
  assert('violations_found' in r, 'violations_found');
  assert('completed_outcomes' in r, 'completed_outcomes');
  assert('remaining_outcomes' in r, 'remaining_outcomes');
  assert('changed_files' in r, 'changed_files');
  assert('evaluated_at' in r, 'evaluated_at');
  assertEq(r.requirements_count, 1, 'requirements_count');
  assertEq(r.prohibitions_count, 0, 'prohibitions_count');
}

// ============================================================================
// runEvaluation
// ============================================================================
console.log('\n── runEvaluation ─────────────────────────────────────────');

// Not found
resetRoutes();
routes = [{ match: /SELECT \* FROM om_prompt_registry/, rows: [] }];
{
  let thrown: Error | null = null;
  try { await runEvaluation(1, 'tester'); } catch (e: any) { thrown = e; }
  assert(thrown !== null, 'not found throws');
  assert(thrown !== null && thrown.message.includes('Prompt not found'), 'error message');
}

// Wrong status
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry/,
  rows: [{ id: 1, status: 'draft', execution_result: null, prompt_text: '' }],
}];
{
  let thrown: Error | null = null;
  try { await runEvaluation(1, 'tester'); } catch (e: any) { thrown = e; }
  assert(thrown !== null, 'wrong status throws');
  assert(thrown !== null && thrown.message.includes('must be'), 'error mentions required status');
}

// Missing execution_result
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry/,
  rows: [{ id: 1, status: 'complete', execution_result: null, prompt_text: 'x' }],
}];
{
  let thrown: Error | null = null;
  try { await runEvaluation(1, 'tester'); } catch (e: any) { thrown = e; }
  assert(thrown !== null, 'missing execution_result throws');
  assert(thrown !== null && thrown.message.includes('no execution_result'), 'error message');
}

// Happy path
resetRoutes();
let selectCount = 0;
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => {
      selectCount++;
      return [{
        id: 1,
        status: 'complete',
        prompt_text: 'REQUIREMENTS:\n- Build feature properly\n',
        execution_result: '"I built the feature properly with all required parts."',
        verification_result: null,
      }];
    },
  },
  { match: /UPDATE om_prompt_registry SET/, rows: [] },
  { match: /INSERT INTO system_logs/, rows: [] },
];
{
  const r = await runEvaluation(1, 'tester');
  assert(r.evaluation !== undefined, 'evaluation returned');
  assert(r.prompt !== undefined, 'prompt returned');
  // Select called twice (before + after update)
  assertEq(selectCount, 2, '2 SELECT calls');
  assert(
    queryCalls.some(q => /UPDATE om_prompt_registry/.test(q.sql)),
    'UPDATE called'
  );
  assert(
    queryCalls.some(q => /INSERT INTO system_logs/.test(q.sql)),
    'log insert called'
  );
  const updateCall = queryCalls.find(q => /UPDATE om_prompt_registry/.test(q.sql))!;
  assertEq(updateCall.params[updateCall.params.length - 2], 'tester', 'actor in update params');
  assertEq(updateCall.params[updateCall.params.length - 1], 1, 'promptId last');
}

// Happy path — JSON parse of execution_result (object-shaped)
resetRoutes();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry/,
    rows: [{
      id: 2,
      status: 'verified',
      prompt_text: 'TASK:\nTest parsing\n',
      execution_result: JSON.stringify({ summary: 'done ok long enough message here' }),
      verification_result: JSON.stringify({ ok: true }),
    }],
  },
  { match: /UPDATE om_prompt_registry SET/, rows: [] },
  { match: /INSERT INTO system_logs/, rows: [] },
];
{
  const r = await runEvaluation(2, 'tester');
  assert(r.evaluation.result_type, 'verified status accepted');
}

// Non-JSON execution_result tolerated (try/catch fallback)
resetRoutes();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry/,
    rows: [{
      id: 3,
      status: 'complete',
      prompt_text: '',
      execution_result: 'just a plain string',
      verification_result: null,
    }],
  },
  { match: /UPDATE om_prompt_registry SET/, rows: [] },
  { match: /INSERT INTO system_logs/, rows: [] },
];
{
  const r = await runEvaluation(3, 'tester');
  assert(r.evaluation !== undefined, 'non-JSON string tolerated');
}

// ============================================================================
// getEvaluation
// ============================================================================
console.log('\n── getEvaluation ─────────────────────────────────────────');

// Not found
resetRoutes();
routes = [{ match: /SELECT[\s\S]*FROM om_prompt_registry/, rows: [] }];
{
  let thrown: Error | null = null;
  try { await getEvaluation(99); } catch (e: any) { thrown = e; }
  assert(thrown !== null, 'not found throws');
}

// Parses JSON fields
resetRoutes();
routes = [{
  match: /SELECT[\s\S]*FROM om_prompt_registry/,
  rows: [{
    id: 5,
    evaluator_status: 'pass',
    evaluator_notes: 'all good',
    result_type: 'implementation',
    completion_status: 'complete',
    issues_found: '[]',
    blockers_found: '[]',
    violations_found: '[]',
    completed_outcomes: '[{"source":"REQUIREMENTS","requirement":"x","confidence":100}]',
    remaining_outcomes: '[]',
    changed_files: '["a.js"]',
    evaluated_at: '2026-01-01',
    evaluated_by: 'tester',
    next_prompt_id: null,
  }],
}];
{
  const r = await getEvaluation(5);
  assertEq(r.prompt_id, 5, 'prompt_id');
  assertEq(r.evaluator_status, 'pass', 'status');
  assert(Array.isArray(r.completed_outcomes), 'completed_outcomes parsed');
  assertEq(r.completed_outcomes[0].confidence, 100, 'parsed confidence');
  assertEq(r.changed_files[0], 'a.js', 'changed_files');
}

// Non-JSON stored value → tolerated (returns raw string)
resetRoutes();
routes = [{
  match: /SELECT[\s\S]*FROM om_prompt_registry/,
  rows: [{
    id: 6,
    evaluator_status: 'fail',
    evaluator_notes: 'oops',
    issues_found: 'not json',
    blockers_found: null,
    violations_found: null,
    completed_outcomes: null,
    remaining_outcomes: null,
    changed_files: null,
    result_type: 'correction',
    completion_status: 'failed',
    evaluated_at: null,
    evaluated_by: null,
    next_prompt_id: null,
  }],
}];
{
  const r = await getEvaluation(6);
  assertEq(r.issues_found, 'not json', 'non-JSON returned as-is');
  assertEq(r.blockers_found, null, 'null → null');
}

// ============================================================================
// enforceEvaluated
// ============================================================================
console.log('\n── enforceEvaluated ──────────────────────────────────────');

// Not found
resetRoutes();
routes = [{ match: /SELECT evaluator_status/, rows: [] }];
{
  let thrown: Error | null = null;
  try { await enforceEvaluated(1); } catch (e: any) { thrown = e; }
  assert(thrown !== null, 'not found throws');
  assert(thrown !== null && thrown.message.includes('Prompt not found'), 'not found msg');
}

// Not evaluated
resetRoutes();
routes = [{
  match: /SELECT evaluator_status/,
  rows: [{ evaluator_status: null, completion_status: null }],
}];
{
  let thrown: Error | null = null;
  try { await enforceEvaluated(1); } catch (e: any) { thrown = e; }
  assert(thrown !== null, 'not evaluated throws');
  assert(thrown !== null && thrown.message.includes('Evaluation required'), 'required msg');
}

// Evaluated → silent success
resetRoutes();
routes = [{
  match: /SELECT evaluator_status/,
  rows: [{ evaluator_status: 'pass', completion_status: 'complete' }],
}];
{
  let thrown: Error | null = null;
  try { await enforceEvaluated(1); } catch (e: any) { thrown = e; }
  assertEq(thrown, null, 'evaluated → no throw');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
