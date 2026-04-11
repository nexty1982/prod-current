#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptEvaluationService.js (OMD-1002)
 *
 * Covers:
 *   Pure functions:
 *     - extractRequirements    REQUIREMENTS / OUTPUT REQUIREMENTS / TASK sections
 *     - extractProhibitions    PROHIBITIONS section parsing
 *     - evaluateResult         result_type classification, violation detection,
 *                              prohibition matching, requirement keyword matching,
 *                              changed_files extraction, blocker detection,
 *                              completion_status + evaluator_status matrix
 *
 *   SQL-dependent (fake pool):
 *     - runEvaluation          not found / wrong status / no result / happy path
 *                              (UPDATE + INSERT + final SELECT)
 *     - getEvaluation          not found / JSON parse shape
 *     - enforceEvaluated       not found / no evaluator_status / passes silently
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

// ── SQL-routed fake pool ──────────────────────────────────────────────────
type Route = { match: RegExp; rows: any[]; result?: any };
let routes: Route[] = [];
const queryCalls: Array<{ sql: string; params: any[] }> = [];

function resetPool() {
  routes = [];
  queryCalls.length = 0;
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryCalls.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) return [r.rows, r.result ?? {}];
    }
    return [[], {}];
  },
};

// ── Stub ../config/db BEFORE requiring SUT ───────────────────────────────
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

const svc = require('../promptEvaluationService');
const {
  evaluateResult,
  extractRequirements,
  extractProhibitions,
  runEvaluation,
  getEvaluation,
  enforceEvaluated,
  VIOLATION_PATTERNS,
} = svc;

async function main() {

// ============================================================================
// extractRequirements
// ============================================================================
console.log('\n── extractRequirements ───────────────────────────────────');

// No sections → empty
{
  const r = extractRequirements('Just plain text, no sections here.');
  assertEq(r, [], 'no sections → []');
}

// REQUIREMENTS section
{
  const p = `TASK:
Do something useful

REQUIREMENTS:
- Must add authentication
- Must validate input
- Must write tests

---
`;
  const r = extractRequirements(p);
  const reqs = r.filter((x: any) => x.source === 'REQUIREMENTS');
  assertEq(reqs.length, 3, '3 REQUIREMENTS items parsed');
  assertEq(reqs[0].text, 'Must add authentication', 'dash stripped, text preserved');
  assertEq(reqs[2].text, 'Must write tests', 'third item');
}

// OUTPUT REQUIREMENTS section
{
  const p = `OUTPUT REQUIREMENTS:
- Return JSON
- Include status code
- Provide timestamp
`;
  const r = extractRequirements(p);
  const outs = r.filter((x: any) => x.source === 'OUTPUT_REQUIREMENTS');
  assertEq(outs.length, 3, '3 OUTPUT_REQUIREMENTS items');
}

// TASK section adds high-level requirement
{
  const p = `TASK:
Implement a proper rate limiter using Redis backend

REQUIREMENTS:
- Use sliding window
`;
  const r = extractRequirements(p);
  const task = r.find((x: any) => x.source === 'TASK');
  assert(task !== undefined, 'TASK entry extracted');
  assert(task.text.includes('rate limiter'), 'TASK text captured');
}

// Numbered list handling
{
  const p = `REQUIREMENTS:
1. First requirement item
2. Second requirement item
3. Third requirement item
`;
  const r = extractRequirements(p);
  const reqs = r.filter((x: any) => x.source === 'REQUIREMENTS');
  assertEq(reqs.length, 3, '3 numbered items');
  assertEq(reqs[0].text, 'First requirement item', 'numbered prefix stripped');
}

// Short lines (≤5 chars) skipped
{
  const p = `REQUIREMENTS:
- ok
- Must be long enough
`;
  const r = extractRequirements(p);
  const reqs = r.filter((x: any) => x.source === 'REQUIREMENTS');
  assertEq(reqs.length, 1, 'short line filtered out');
}

// ============================================================================
// extractProhibitions
// ============================================================================
console.log('\n── extractProhibitions ───────────────────────────────────');

{
  const p = `PROHIBITIONS:
- Do not use placeholder data
- Do not skip validation
`;
  const r = extractProhibitions(p);
  assertEq(r.length, 2, '2 prohibitions parsed');
  assertEq(r[0], 'Do not use placeholder data', 'first prohibition');
}

// No section → empty
{
  const r = extractProhibitions('plain text');
  assertEq(r, [], 'no section → []');
}

// ============================================================================
// evaluateResult — result_type classification
// ============================================================================
console.log('\n── evaluateResult: result_type ───────────────────────────');

// Implementation signals win
{
  const r = evaluateResult(
    'REQUIREMENTS:\n- Build feature X\n',
    'Created new file server/src/feature.js and wrote unit tests. Added 42 lines.',
    null,
  );
  assertEq(r.result_type, 'implementation', 'created/wrote/added → implementation');
}

// Verification signals
{
  const r = evaluateResult(
    'REQUIREMENTS:\n- Verify deployment works\n',
    'Verified all tests pass. Tested the endpoint. Confirmed functionality.',
    null,
  );
  assertEq(r.result_type, 'verification', 'verified/tested/confirmed → verification');
}

// Plan signals
{
  const r = evaluateResult(
    'REQUIREMENTS:\n- Design architecture\n',
    'Here is my plan: will create three components and architect the strategy. Proposal attached.',
    null,
  );
  assertEq(r.result_type, 'plan', 'plan/design/architect → plan');
}

// Default is implementation
{
  const r = evaluateResult(
    'REQUIREMENTS:\n- Do nothing specific\n',
    'something unrelated to any pattern',
    null,
  );
  assertEq(r.result_type, 'implementation', 'default → implementation');
}

// ============================================================================
// evaluateResult — violation detection
// ============================================================================
console.log('\n── evaluateResult: violations ────────────────────────────');

// Fallback violation
{
  const r = evaluateResult(
    'REQUIREMENTS:\n- Implement the feature properly\n',
    'Used a fallback for this part as a temporary fix until proper impl is ready.',
    null,
  );
  const keys = r.violations_found.map((v: any) => v.key);
  assert(keys.includes('fallback_behavior'), 'fallback_behavior detected');
  assertEq(r.evaluator_status, 'fail', 'fallback → fail');
}

// Partial implementation
{
  const r = evaluateResult(
    'REQUIREMENTS:\n- Complete the whole feature\n',
    'Partial implementation only — TODO remaining parts later',
    null,
  );
  const keys = r.violations_found.map((v: any) => v.key);
  assert(keys.includes('partial_implementation'), 'partial_implementation detected');
}

// Placeholder content
{
  const r = evaluateResult(
    'REQUIREMENTS:\n- Write production code\n',
    'Used placeholder example.com URLs and dummy foo bar values',
    null,
  );
  const keys = r.violations_found.map((v: any) => v.key);
  assert(keys.includes('placeholder_content'), 'placeholder detected');
}

// Mock data in non-test context
{
  const r = evaluateResult(
    'REQUIREMENTS:\n- Real integration\n',
    'Used hardcoded mocked values in the service',
    null,
  );
  const keys = r.violations_found.map((v: any) => v.key);
  assert(keys.includes('mock_data'), 'mock_data detected');
  assertEq(r.evaluator_status, 'fail', 'mock_data → fail');
}

// Clean result, no violations
{
  const r = evaluateResult(
    'REQUIREMENTS:\n- Must add feature X\n- Must add feature Y\n',
    'added feature X and implemented feature Y in the service.js file',
    null,
  );
  assertEq(r.violations_found.length, 0, 'no violations');
}

// Violation includes context snippet
{
  const r = evaluateResult(
    'REQUIREMENTS:\n- xyz\n',
    'prefix text before the fallback was used and suffix text after',
    null,
  );
  const v = r.violations_found.find((x: any) => x.key === 'fallback_behavior');
  assert(v !== undefined, 'fallback violation found');
  assert(v.context.length > 0, 'context snippet present');
  assert(v.matched.toLowerCase().includes('fallback'), 'matched text captured');
}

// ============================================================================
// evaluateResult — prohibition violations
// ============================================================================
console.log('\n── evaluateResult: prohibitions ──────────────────────────');

{
  const p = `REQUIREMENTS:
- Do something

PROHIBITIONS:
- Do not use external services
`;
  const r = evaluateResult(
    p,
    'Called external services to fetch data',
    null,
  );
  const prohibV = r.violations_found.filter((v: any) => v.key === 'prohibition_match');
  assert(prohibV.length > 0, 'prohibition match detected');
}

// Prohibition with too few keywords (≤1 long word) is skipped
{
  const p = `REQUIREMENTS:
- something

PROHIBITIONS:
- No hardcoding allowed here at all
`;
  const r = evaluateResult(
    p,
    'We renamed the file to things that don\'t match the prohibition keywords',
    null,
  );
  // This should NOT trigger prohibition_match
  const prohibV = r.violations_found.filter((v: any) => v.key === 'prohibition_match');
  assertEq(prohibV.length, 0, 'no prohibition match when keywords absent');
}

// ============================================================================
// evaluateResult — completion_status matrix
// ============================================================================
console.log('\n── evaluateResult: completion_status ─────────────────────');

// All requirements matched → complete
{
  const r = evaluateResult(
    `REQUIREMENTS:
- Must add authentication module
- Must validate user input correctly
`,
    'Added authentication module and validate user input correctly in the handler',
    null,
  );
  assertEq(r.completion_status, 'complete', 'all matched → complete');
  assertEq(r.evaluator_status, 'pass', 'complete + no violations → pass');
  assert(r.completed_outcomes.length >= 1, 'at least 1 completed outcome');
}

// Some matched, some missing → partial
{
  const r = evaluateResult(
    `REQUIREMENTS:
- Must add authentication module implementation
- Must add payment gateway integration somewhere
`,
    'Added authentication module implementation but nothing else',
    null,
  );
  assertEq(r.completion_status, 'partial', '1 of 2 → partial');
}

// No requirements, long result → complete
{
  const r = evaluateResult(
    'No structured requirements here',
    'a'.repeat(100) + ' some actual content here to pass the length gate',
    null,
  );
  assertEq(r.completion_status, 'complete', 'no reqs + long result → complete');
}

// No requirements, short result → failed
{
  const r = evaluateResult('No requirements', 'short', null);
  assertEq(r.completion_status, 'failed', 'no reqs + short result → failed');
}

// Fallback violation → failed regardless of match
{
  const r = evaluateResult(
    `REQUIREMENTS:
- Must add feature properly
`,
    'Added feature using a workaround temporary fix',
    null,
  );
  assertEq(r.completion_status, 'failed', 'fallback violation → failed');
}

// Blocker present + few completed → blocked
{
  const r = evaluateResult(
    `REQUIREMENTS:
- Must add auth module
- Must add billing module
- Must add email module
`,
    'Blocked by missing file — dependency required before we can proceed',
    null,
  );
  assertEq(r.completion_status, 'blocked', 'blocker + low completion → blocked');
  assertEq(r.evaluator_status, 'fail', 'blocked → fail');
  assert(r.blockers_found.length > 0, 'blockers extracted');
}

// ============================================================================
// evaluateResult — changed_files extraction
// ============================================================================
console.log('\n── evaluateResult: changed_files ─────────────────────────');

{
  const r = evaluateResult(
    'REQUIREMENTS:\n- something\n',
    'Created server/src/foo.js and modified server/src/bar.ts. Also wrote: `front-end/src/baz.tsx`',
    null,
  );
  assert(r.changed_files.length >= 2, 'at least 2 files extracted');
  assert(
    r.changed_files.some((f: string) => f.includes('foo.js')),
    'foo.js captured',
  );
  assert(
    r.changed_files.some((f: string) => f.includes('bar.ts')),
    'bar.ts captured',
  );
}

// Dedup
{
  const r = evaluateResult(
    'REQUIREMENTS:\n- x\n',
    'Created server/src/foo.js. Modified server/src/foo.js. Wrote `server/src/foo.js`',
    null,
  );
  const fooCount = r.changed_files.filter((f: string) => f === 'server/src/foo.js').length;
  assertEq(fooCount, 1, 'duplicate files deduped');
}

// ============================================================================
// evaluateResult — blocker detection
// ============================================================================
console.log('\n── evaluateResult: blockers ──────────────────────────────');

{
  const r = evaluateResult(
    'REQUIREMENTS:\n- a\n',
    'Permission denied on remote host',
    null,
  );
  const types = r.blockers_found.map((b: any) => b.type);
  assert(types.includes('access'), 'access blocker');
}

{
  const r = evaluateResult(
    'REQUIREMENTS:\n- a\n',
    'Missing module lodash - package not found',
    null,
  );
  const types = r.blockers_found.map((b: any) => b.type);
  assert(types.includes('missing_resource'), 'missing_resource blocker');
}

{
  const r = evaluateResult(
    'REQUIREMENTS:\n- a\n',
    'Connection refused — timed out after 30s',
    null,
  );
  const types = r.blockers_found.map((b: any) => b.type);
  assert(types.includes('infrastructure'), 'infrastructure blocker');
}

// ============================================================================
// evaluateResult — evaluator_notes structure
// ============================================================================
console.log('\n── evaluateResult: notes ─────────────────────────────────');

{
  const r = evaluateResult(
    'REQUIREMENTS:\n- Must add auth\n',
    'Added auth handler — all tests pass',
    null,
  );
  assert(r.evaluator_notes.includes('Result type:'), 'notes has result type');
  assert(r.evaluator_notes.includes('Completion:'), 'notes has completion');
  assert(r.evaluator_notes.includes('Evaluator:'), 'notes has evaluator');
}

{
  const r = evaluateResult(
    'REQUIREMENTS:\n- something\n',
    'Used a fallback hack',
    null,
  );
  assert(r.evaluator_notes.includes('VIOLATIONS'), 'notes has violations section');
}

// ============================================================================
// evaluateResult — returns proper shape
// ============================================================================
console.log('\n── evaluateResult: shape ─────────────────────────────────');

{
  const r = evaluateResult('REQUIREMENTS:\n- x\n', 'Created file.js', null);
  assert('result_type' in r, 'result_type key');
  assert('completion_status' in r, 'completion_status key');
  assert('evaluator_status' in r, 'evaluator_status key');
  assert('evaluator_notes' in r, 'evaluator_notes key');
  assert('violations_found' in r, 'violations_found key');
  assert('blockers_found' in r, 'blockers_found key');
  assert('completed_outcomes' in r, 'completed_outcomes key');
  assert('remaining_outcomes' in r, 'remaining_outcomes key');
  assert('changed_files' in r, 'changed_files key');
  assert('evaluated_at' in r, 'evaluated_at key');
  assert(typeof r.evaluated_at === 'string', 'evaluated_at is ISO string');
  assert(Array.isArray(r.issues_found), 'issues_found is array');
}

// ============================================================================
// evaluateResult — handles object execution result
// ============================================================================
console.log('\n── evaluateResult: object input ──────────────────────────');

{
  const r = evaluateResult(
    'REQUIREMENTS:\n- x\n',
    { output: 'Created server/src/foo.js and everything works' },
    null,
  );
  assert(r.changed_files.some((f: string) => f.includes('foo.js')), 'file extracted from object');
}

// Null execution result doesn't crash
{
  const r = evaluateResult('REQUIREMENTS:\n- x\n', null, null);
  assert(r.completion_status, 'handles null execution');
}

// ============================================================================
// runEvaluation: not found
// ============================================================================
console.log('\n── runEvaluation: not found ──────────────────────────────');

resetPool();
routes = [
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [] },
];
{
  let caught: Error | null = null;
  try { await runEvaluation(999, 'tester'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when not found');
  assert(caught !== null && caught.message.includes('999'), 'error mentions id');
}

// ============================================================================
// runEvaluation: wrong status
// ============================================================================
console.log('\n── runEvaluation: wrong status ───────────────────────────');

resetPool();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    rows: [{ id: 1, status: 'draft', execution_result: '{}' }],
  },
];
{
  let caught: Error | null = null;
  try { await runEvaluation(1, 'tester'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws for draft status');
  assert(caught !== null && caught.message.includes('draft'), 'error mentions draft');
}

// ============================================================================
// runEvaluation: no execution_result
// ============================================================================
console.log('\n── runEvaluation: no execution_result ────────────────────');

resetPool();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    rows: [{ id: 2, status: 'complete', execution_result: null }],
  },
];
{
  let caught: Error | null = null;
  try { await runEvaluation(2, 'tester'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws for missing execution_result');
  assert(caught !== null && caught.message.includes('execution_result'), 'error mentions field');
}

// ============================================================================
// runEvaluation: happy path
// ============================================================================
console.log('\n── runEvaluation: happy path ─────────────────────────────');

resetPool();
const prompt = {
  id: 5,
  status: 'complete',
  prompt_text: 'REQUIREMENTS:\n- Must add authentication module\n',
  execution_result: JSON.stringify({ msg: 'Added authentication module to server' }),
  verification_result: null,
};

let updateCalled = false;
let insertCalled = false;
let updateParams: any[] = [];

let selectCount = 0;
const origQuery = fakePool.query;
fakePool.query = async (sql: string, params: any[] = []) => {
  queryCalls.push({ sql, params });
  if (/^UPDATE om_prompt_registry/i.test(sql.trim())) {
    updateCalled = true;
    updateParams = params;
    return [{ affectedRows: 1 }, {}] as any;
  }
  if (/^INSERT INTO system_logs/i.test(sql.trim())) {
    insertCalled = true;
    return [{ insertId: 1 }, {}] as any;
  }
  if (/SELECT \* FROM om_prompt_registry WHERE id = \?/.test(sql)) {
    selectCount++;
    if (selectCount === 1) return [[prompt], {}] as any;
    // Second SELECT (updated row) — return updated
    return [[{ ...prompt, evaluator_status: 'pass', completion_status: 'complete' }], {}] as any;
  }
  return [[], {}] as any;
};

{
  const r = await runEvaluation(5, 'admin@test.com');
  assert(updateCalled, 'UPDATE called');
  assert(insertCalled, 'INSERT log called');
  assert(r.evaluation !== undefined, 'evaluation returned');
  assertEq(r.evaluation.completion_status, 'complete', 'completion_status persisted');
  assertEq(r.evaluation.evaluator_status, 'pass', 'pass evaluation');
  assertEq(r.prompt.id, 5, 'updated prompt returned');
  // UPDATE params: result_type, completion_status, evaluator_status, evaluator_notes,
  // issues, blockers, violations, completed, remaining, changed_files, actor, id
  assertEq(updateParams[1], 'complete', 'completion_status param');
  assertEq(updateParams[2], 'pass', 'evaluator_status param');
  assertEq(updateParams[10], 'admin@test.com', 'actor persisted');
  assertEq(updateParams[11], 5, 'id last in params');
}
fakePool.query = origQuery;

// ============================================================================
// runEvaluation: parses JSON verification_result, falls back to raw
// ============================================================================
console.log('\n── runEvaluation: verification_result parse ──────────────');

resetPool();
const prompt2 = {
  id: 6,
  status: 'verified',
  prompt_text: 'REQUIREMENTS:\n- implement something\n',
  execution_result: 'not json — raw string',
  verification_result: 'also not json',
};
fakePool.query = async (sql: string, params: any[] = []) => {
  queryCalls.push({ sql, params });
  if (/^UPDATE/i.test(sql.trim())) return [{ affectedRows: 1 }, {}] as any;
  if (/^INSERT/i.test(sql.trim())) return [{ insertId: 1 }, {}] as any;
  if (/SELECT \* FROM om_prompt_registry WHERE id = \?/.test(sql)) {
    return [[prompt2], {}] as any;
  }
  return [[], {}] as any;
};
{
  const r = await runEvaluation(6, 'tester');
  assert(r.evaluation !== undefined, 'handles non-JSON results gracefully');
}
fakePool.query = origQuery;

// ============================================================================
// getEvaluation
// ============================================================================
console.log('\n── getEvaluation ─────────────────────────────────────────');

// Not found
resetPool();
routes = [{ match: /FROM om_prompt_registry WHERE id/, rows: [] }];
{
  let caught: Error | null = null;
  try { await getEvaluation(42); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when not found');
}

// Happy path with JSON parsing
resetPool();
routes = [{
  match: /FROM om_prompt_registry WHERE id/,
  rows: [{
    id: 10,
    evaluator_status: 'pass',
    evaluator_notes: 'All good',
    result_type: 'implementation',
    completion_status: 'complete',
    issues_found: JSON.stringify(['issue1']),
    blockers_found: null,
    violations_found: JSON.stringify([]),
    completed_outcomes: JSON.stringify([{ source: 'REQ', requirement: 'r1' }]),
    remaining_outcomes: JSON.stringify([]),
    changed_files: JSON.stringify(['foo.js']),
    evaluated_at: '2026-04-10T12:00:00Z',
    evaluated_by: 'admin',
    next_prompt_id: null,
  }],
}];
{
  const r = await getEvaluation(10);
  assertEq(r.prompt_id, 10, 'prompt_id');
  assertEq(r.evaluator_status, 'pass', 'status');
  assertEq(r.issues_found, ['issue1'], 'issues parsed from JSON');
  assertEq(r.blockers_found, null, 'null field → null');
  assertEq(r.changed_files, ['foo.js'], 'files parsed');
  assertEq(r.completed_outcomes[0].source, 'REQ', 'outcomes parsed');
}

// Invalid JSON → returns raw
resetPool();
routes = [{
  match: /FROM om_prompt_registry WHERE id/,
  rows: [{
    id: 11,
    evaluator_status: 'fail',
    evaluator_notes: null,
    result_type: null,
    completion_status: 'failed',
    issues_found: 'not valid json',
    blockers_found: '{malformed',
    violations_found: null,
    completed_outcomes: null,
    remaining_outcomes: null,
    changed_files: null,
    evaluated_at: null,
    evaluated_by: null,
    next_prompt_id: 12,
  }],
}];
{
  const r = await getEvaluation(11);
  assertEq(r.issues_found, 'not valid json', 'invalid JSON → returned as-is');
  assertEq(r.blockers_found, '{malformed', 'malformed → returned as-is');
  assertEq(r.next_prompt_id, 12, 'next_prompt_id');
}

// ============================================================================
// enforceEvaluated
// ============================================================================
console.log('\n── enforceEvaluated ──────────────────────────────────────');

// Not found
resetPool();
routes = [{ match: /SELECT evaluator_status, completion_status/, rows: [] }];
{
  let caught: Error | null = null;
  try { await enforceEvaluated(99); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when not found');
}

// No evaluator_status
resetPool();
routes = [{
  match: /SELECT evaluator_status, completion_status/,
  rows: [{ evaluator_status: null, completion_status: null }],
}];
{
  let caught: Error | null = null;
  try { await enforceEvaluated(1); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when no evaluator_status');
  assert(caught !== null && caught.message.includes('Evaluation required'), 'specific error message');
}

// Has evaluator_status (pass) → no throw
resetPool();
routes = [{
  match: /SELECT evaluator_status, completion_status/,
  rows: [{ evaluator_status: 'pass', completion_status: 'complete' }],
}];
{
  let caught: Error | null = null;
  try { await enforceEvaluated(2); } catch (e: any) { caught = e; }
  assertEq(caught, null, 'no throw when evaluated');
}

// Has evaluator_status (even fail) → no throw (enforcement is just "was evaluated")
resetPool();
routes = [{
  match: /SELECT evaluator_status, completion_status/,
  rows: [{ evaluator_status: 'fail', completion_status: 'failed' }],
}];
{
  let caught: Error | null = null;
  try { await enforceEvaluated(3); } catch (e: any) { caught = e; }
  assertEq(caught, null, 'no throw even when fail (enforcement is existence only)');
}

// ============================================================================
// Exports / constants
// ============================================================================
console.log('\n── Exports ───────────────────────────────────────────────');
assert(Array.isArray(VIOLATION_PATTERNS), 'VIOLATION_PATTERNS exported');
assert(VIOLATION_PATTERNS.length >= 8, '8+ violation patterns');
assert(
  VIOLATION_PATTERNS.every((v: any) => typeof v.key === 'string' && typeof v.desc === 'string'),
  'each pattern has key and desc',
);

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
