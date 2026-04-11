#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptEvaluationService.js (OMD-1117)
 *
 * Deterministic evaluation engine for prompt execution results.
 * One external dep: `../config/db.getAppPool`.
 *
 * Strategy: stub config/db via require.cache with a fake pool using
 * Route[] dispatch. Test pure extractors + evaluateResult engine,
 * then DB-orchestrated wrappers.
 *
 * Coverage:
 *   - extractRequirements:
 *       · REQUIREMENTS section parsed into items
 *       · OUTPUT REQUIREMENTS parsed
 *       · TASK section extracted
 *       · absent section → empty
 *       · bullet/number markers stripped
 *       · short lines filtered out
 *   - extractProhibitions:
 *       · PROHIBITIONS parsed
 *       · absent → empty
 *   - evaluateResult:
 *       · result_type classification (plan/implementation/verification)
 *       · violation detection (fallback, partial, placeholder, etc.)
 *       · completion_status: complete, partial, failed, blocked
 *       · evaluator_status: pass, fail
 *       · disqualifying violations force fail
 *       · requirements matching (>=50% keyword ratio)
 *       · changed_files extraction
 *       · blockers_found detection
 *       · evaluator_notes contains violation/blocker summary
 *       · shape: requirements_count, prohibitions_count, evaluated_at
 *   - runEvaluation:
 *       · prompt not found → throws
 *       · wrong status (draft) → throws
 *       · missing execution_result → throws
 *       · happy path: persists evaluation, logs, returns updated prompt
 *       · SUCCESS vs WARN log level
 *       · JSON-parsing of stored execution_result
 *   - getEvaluation:
 *       · not found → throws
 *       · returns parsed JSON fields
 *   - enforceEvaluated:
 *       · not found → throws
 *       · evaluator_status null → throws
 *       · evaluated → no-op
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

async function assertThrows(fn: () => Promise<any>, substring: string, message: string): Promise<void> {
  try {
    await fn();
    console.error(`  FAIL: ${message} (did not throw)`);
    failed++;
  } catch (e: any) {
    if (e.message && e.message.includes(substring)) {
      console.log(`  PASS: ${message}`); passed++;
    } else {
      console.error(`  FAIL: ${message}\n         expected error containing: ${substring}\n         got: ${e.message}`);
      failed++;
    }
  }
}

// ── Fake pool ───────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
type Route = { match: RegExp; handler: (params: any[]) => any };

const queryCalls: QueryCall[] = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryCalls.push({ sql, params });
    for (const route of routes) {
      if (route.match.test(sql)) return route.handler(params);
    }
    throw new Error(`No route matched SQL: ${sql.slice(0, 100)}`);
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

function resetAll() {
  queryCalls.length = 0;
  routes = [];
}

const {
  runEvaluation,
  getEvaluation,
  enforceEvaluated,
  evaluateResult,
  extractRequirements,
  extractProhibitions,
  VIOLATION_PATTERNS,
} = require('../promptEvaluationService');

// Sample prompt text
const SAMPLE_PROMPT = `
TASK:
Build the login form component with email validation and password strength indicator.

---

REQUIREMENTS:
- React function component using hooks
- Email field with validation
- Password field with strength indicator
- Submit button posts to /api/auth/login

---

OUTPUT REQUIREMENTS:
- LoginForm.tsx file with typed props
- Error display area for API failures
- Loading spinner during submission

---

PROHIBITIONS:
- No inline styles
- No class components
- No deprecated lifecycle methods

---

FINAL REQUIREMENT:
Must compile and render without console errors.
`;

async function main() {

// ============================================================================
// VIOLATION_PATTERNS export
// ============================================================================
console.log('\n── VIOLATION_PATTERNS export ─────────────────────────────');

assert(Array.isArray(VIOLATION_PATTERNS), 'VIOLATION_PATTERNS is array');
assert(VIOLATION_PATTERNS.length >= 8, '>=8 violation patterns');
assert(VIOLATION_PATTERNS.every((v: any) => v.key && v.desc), 'each has key + desc');
assert(!VIOLATION_PATTERNS.some((v: any) => v.pattern), 'pattern regex NOT exposed');

// ============================================================================
// extractRequirements
// ============================================================================
console.log('\n── extractRequirements ───────────────────────────────────');

{
  const reqs = extractRequirements(SAMPLE_PROMPT);
  // Should extract REQUIREMENTS items, OUTPUT REQUIREMENTS items, and TASK
  assert(reqs.length >= 7, 'extracted multiple requirements');
  assert(reqs.some((r: any) => r.source === 'REQUIREMENTS'), 'has REQUIREMENTS source');
  assert(reqs.some((r: any) => r.source === 'OUTPUT_REQUIREMENTS'), 'has OUTPUT_REQUIREMENTS source');
  assert(reqs.some((r: any) => r.source === 'TASK'), 'has TASK source');
  // Bullet markers stripped
  const reqText = reqs.find((r: any) => r.source === 'REQUIREMENTS').text;
  assert(!reqText.startsWith('-'), 'bullet stripped');
  // Short lines filtered
  assert(reqs.every((r: any) => r.text.length >= 6), 'min length filter');
}

// No requirements section
{
  const reqs = extractRequirements('Just some free text with no sections.');
  assertEq(reqs, [], 'no section → empty');
}

// Only TASK
{
  const text = 'TASK:\nBuild a form with validation and a submit button.';
  const reqs = extractRequirements(text);
  assertEq(reqs.length, 1, '1 task requirement');
  assertEq(reqs[0].source, 'TASK', 'task source');
  assert(reqs[0].text.includes('Build a form'), 'task content');
}

// TASK too short → omitted
{
  const text = 'TASK:\nX';
  const reqs = extractRequirements(text);
  assertEq(reqs, [], 'short task omitted');
}

// Numbered list in REQUIREMENTS
{
  const text = 'REQUIREMENTS:\n1. First requirement here\n2. Second requirement item\n3. Third thing to build';
  const reqs = extractRequirements(text);
  assertEq(reqs.length, 3, '3 numbered items');
  assert(!reqs[0].text.startsWith('1'), 'number prefix stripped');
}

// ============================================================================
// extractProhibitions
// ============================================================================
console.log('\n── extractProhibitions ───────────────────────────────────');

{
  const p = extractProhibitions(SAMPLE_PROMPT);
  assertEq(p.length, 3, '3 prohibitions');
  assert(p[0].includes('No inline styles'), 'first prohibition');
  assert(p[1].includes('No class components'), 'second prohibition');
  assert(p[2].includes('No deprecated'), 'third prohibition');
}

// No prohibitions section
{
  const p = extractProhibitions('No prohibitions here at all.');
  assertEq(p, [], 'empty when absent');
}

// ============================================================================
// evaluateResult — happy path: complete, pass
// ============================================================================
console.log('\n── evaluateResult: complete + pass ───────────────────────');

{
  const execResult =
    'Created LoginForm.tsx with React function component using hooks. ' +
    'Built email field with validation and password field with strength indicator. ' +
    'Implemented submit button that posts to /api/auth/login endpoint. ' +
    'Added error display area for API failures and loading spinner during submission. ' +
    'Modified: front-end/src/features/auth/LoginForm.tsx';
  const r = evaluateResult(SAMPLE_PROMPT, execResult, null);
  assertEq(r.result_type, 'implementation', 'result_type');
  assert(['complete', 'partial'].includes(r.completion_status), 'completion complete or partial');
  assert(r.completed_outcomes.length > 0, 'has completed outcomes');
  assertEq(r.violations_found, [], 'no violations');
  assertEq(r.blockers_found, [], 'no blockers');
  assert(r.requirements_count > 0, 'requirements counted');
  assertEq(r.prohibitions_count, 3, 'prohibitions counted');
  assert(typeof r.evaluated_at === 'string', 'evaluated_at set');
  assert(r.evaluator_notes.includes('Result type: implementation'), 'notes include result_type');
}

// ============================================================================
// evaluateResult — violation detection
// ============================================================================
console.log('\n── evaluateResult: violations ────────────────────────────');

{
  const result = 'Used a fallback implementation for the validation logic. Added TODO comments for edge cases.';
  const r = evaluateResult(SAMPLE_PROMPT, result, null);
  assert(r.violations_found.length >= 2, 'multiple violations');
  const keys = r.violations_found.map((v: any) => v.key);
  assert(keys.includes('fallback_behavior'), 'fallback detected');
  assert(keys.includes('partial_implementation'), 'partial detected (TODO)');
  // Disqualifying violation → fail
  assertEq(r.evaluator_status, 'fail', 'fail due to disqualifying violations');
}

// Placeholder content
{
  const result = 'Created LoginForm with email field. Used placeholder for the API endpoint.';
  const r = evaluateResult(SAMPLE_PROMPT, result, null);
  const keys = r.violations_found.map((v: any) => v.key);
  assert(keys.includes('placeholder_content'), 'placeholder detected');
  assertEq(r.evaluator_status, 'fail', 'placeholder disqualifies');
}

// Mock data
{
  const result = 'Wrote the component using mocked API responses for now.';
  const r = evaluateResult(SAMPLE_PROMPT, result, null);
  const keys = r.violations_found.map((v: any) => v.key);
  assert(keys.includes('mock_data'), 'mock_data detected');
  assertEq(r.evaluator_status, 'fail', 'mock disqualifies');
}

// Context captured
{
  const result = 'Some other stuff and a hack to work around the issue, then more text';
  const r = evaluateResult('TASK:\nBuild something reasonable for users.', result, null);
  const violation = r.violations_found.find((v: any) => v.key === 'fallback_behavior');
  assert(violation, 'fallback found');
  assert(violation.context.length > 0, 'has context');
  assert(violation.matched.toLowerCase() === 'hack', 'matched text');
}

// ============================================================================
// evaluateResult — result_type classification
// ============================================================================
console.log('\n── evaluateResult: result_type ───────────────────────────');

{
  const r = evaluateResult('TASK:\nPlan the architecture.', 'Will create a plan and design the architecture with proposal.', null);
  assertEq(r.result_type, 'plan', 'plan classified');
}

{
  const r = evaluateResult('TASK:\nVerify everything works.', 'All tests pass. Verified the code and confirmed expected behavior.', null);
  assertEq(r.result_type, 'verification', 'verification classified');
}

{
  const r = evaluateResult('TASK:\nFix the bug.', 'Fixed the bug by patching the regression and corrected the logic.', null);
  assertEq(r.result_type, 'correction', 'correction classified');
}

// ============================================================================
// evaluateResult — blockers
// ============================================================================
console.log('\n── evaluateResult: blockers ──────────────────────────────');

{
  const result = 'Cannot proceed: permission denied on the config file. Blocked by missing dependency.';
  const r = evaluateResult(SAMPLE_PROMPT, result, null);
  assert(r.blockers_found.length >= 2, 'multiple blockers detected');
  const types = r.blockers_found.map((b: any) => b.type);
  assert(types.includes('access'), 'access blocker');
  assert(types.includes('dependency'), 'dependency blocker');
}

{
  const result = 'Connection refused when calling the service. Operation timed out.';
  const r = evaluateResult('TASK:\nDo something big here with many features.', result, null);
  const types = r.blockers_found.map((b: any) => b.type);
  assert(types.includes('infrastructure'), 'infrastructure blocker');
  assertEq(r.completion_status, 'blocked', 'completion=blocked');
  assertEq(r.evaluator_status, 'fail', 'blocked → fail');
}

// ============================================================================
// evaluateResult — changed_files extraction
// ============================================================================
console.log('\n── evaluateResult: changed_files ─────────────────────────');

{
  const result =
    'Created: src/components/LoginForm.tsx\n' +
    'Modified: src/api/auth.ts\n' +
    'Also updated `front-end/src/utils/validation.ts` for the checks.';
  const r = evaluateResult('TASK:\nBuild login form with all the features.', result, null);
  assert(r.changed_files.length >= 2, 'files extracted');
  assert(r.changed_files.some((f: string) => f.includes('LoginForm.tsx')), 'LoginForm.tsx');
  assert(r.changed_files.some((f: string) => f.includes('auth.ts')), 'auth.ts');
}

// No duplicates
{
  const result = 'Created: file.ts and also modified: file.ts again.';
  const r = evaluateResult('TASK:\nEdit a file here.', result, null);
  const fileTs = r.changed_files.filter((f: string) => f === 'file.ts');
  assert(fileTs.length <= 1, 'no duplicates');
}

// ============================================================================
// evaluateResult — executionResult passed as object
// ============================================================================
console.log('\n── evaluateResult: object input ──────────────────────────');

{
  const r = evaluateResult(
    'TASK:\nDo the thing properly with correct structure.',
    { output: 'created the file', status: 'done' },
    { status: 'verified' }
  );
  assertEq(typeof r.result_type, 'string', 'result_type string');
  assert(r.evaluator_notes.length > 0, 'notes produced');
}

// Null/undefined execution result
{
  const r = evaluateResult('TASK:\nSomething long enough to be a requirement.', null, null);
  assert(typeof r.result_type === 'string', 'handles null execution');
}

// ============================================================================
// evaluateResult — completion_status: complete path
// ============================================================================
console.log('\n── evaluateResult: complete path ─────────────────────────');

{
  // Carefully craft a result so all requirement keywords appear
  const prompt = 'REQUIREMENTS:\n- React function component with hooks and validation\n- Email field validation logic';
  const result = 'Created React function component with hooks and email field validation logic.';
  const r = evaluateResult(prompt, result, null);
  // Should hit high match ratio → complete
  assert(r.completed_outcomes.length > 0, 'outcomes matched');
}

// Empty requirements → long result → complete
{
  const r = evaluateResult('just some random text without sections', 'A significant result with more than fifty characters worth of content explaining what was built.', null);
  assertEq(r.completion_status, 'complete', 'no reqs + long result → complete');
}

// Empty requirements → short result → failed
{
  const r = evaluateResult('no sections at all', 'short', null);
  assertEq(r.completion_status, 'failed', 'no reqs + short result → failed');
}

// ============================================================================
// evaluateResult — evaluator_notes structure
// ============================================================================
console.log('\n── evaluateResult: notes structure ───────────────────────');

{
  const result = 'Used a hack with mock data and placeholder content. permission denied on file.';
  const r = evaluateResult(SAMPLE_PROMPT, result, null);
  assert(r.evaluator_notes.includes('VIOLATIONS'), 'notes include violations section');
  assert(r.evaluator_notes.includes('BLOCKERS'), 'notes include blockers section');
  assert(r.evaluator_notes.includes('REMAINING OUTCOMES'), 'notes include remaining section');
  assert(r.evaluator_notes.includes('Result type:'), 'notes include result_type');
  assert(r.evaluator_notes.includes('Completion:'), 'notes include completion');
  assert(r.evaluator_notes.includes('Evaluator:'), 'notes include evaluator');
}

// ============================================================================
// runEvaluation — not found
// ============================================================================
console.log('\n── runEvaluation: not found ──────────────────────────────');

resetAll();
routes = [{ match: /SELECT \* FROM om_prompt_registry/i, handler: () => [[]] }];
await assertThrows(
  () => runEvaluation('missing', 'actor'),
  'Prompt not found',
  'missing throws'
);

// ============================================================================
// runEvaluation — wrong status
// ============================================================================
console.log('\n── runEvaluation: wrong status ───────────────────────────');

resetAll();
routes = [{
  match: /SELECT \* FROM om_prompt_registry/i,
  handler: () => [[{
    id: 'p1', status: 'draft', prompt_text: SAMPLE_PROMPT, execution_result: '{}',
  }]],
}];
await assertThrows(
  () => runEvaluation('p1', 'a'),
  'must be "complete" or "verified"',
  'draft status throws'
);

// ============================================================================
// runEvaluation — missing execution_result
// ============================================================================
console.log('\n── runEvaluation: missing result ─────────────────────────');

resetAll();
routes = [{
  match: /SELECT \* FROM om_prompt_registry/i,
  handler: () => [[{
    id: 'p2', status: 'complete', prompt_text: SAMPLE_PROMPT, execution_result: null,
  }]],
}];
await assertThrows(
  () => runEvaluation('p2', 'a'),
  'no execution_result',
  'null execution_result throws'
);

// ============================================================================
// runEvaluation — happy path
// ============================================================================
console.log('\n── runEvaluation: happy path ─────────────────────────────');

resetAll();
let updated = false;
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id/i,
    handler: (params) => {
      if (updated) {
        return [[{
          id: params[0], status: 'complete', prompt_text: SAMPLE_PROMPT,
          execution_result: '{"output":"done"}',
          evaluator_status: 'pass',
        }]];
      }
      return [[{
        id: params[0], status: 'complete', prompt_text: SAMPLE_PROMPT,
        execution_result: JSON.stringify({ output: 'Created LoginForm.tsx with all the required features and passed verification tests.' }),
        verification_result: null,
      }]];
    },
  },
  {
    match: /UPDATE om_prompt_registry SET\s+result_type/i,
    handler: () => { updated = true; return [{ affectedRows: 1 }]; },
  },
  {
    match: /INSERT INTO system_logs/i,
    handler: () => [{ insertId: 1 }],
  },
];
{
  const result = await runEvaluation('p3', 'nick');
  assert(result.evaluation, 'evaluation returned');
  assertEq(typeof result.evaluation.evaluator_status, 'string', 'evaluator_status set');
  assert(result.prompt, 'updated prompt returned');

  // Verify UPDATE executed with all fields
  const update = queryCalls.find(c => /UPDATE om_prompt_registry SET\s+result_type/.test(c.sql))!;
  assertEq(update.params[0], result.evaluation.result_type, 'result_type persisted');
  assertEq(update.params[1], result.evaluation.completion_status, 'completion_status persisted');
  assertEq(update.params[2], result.evaluation.evaluator_status, 'evaluator_status persisted');
  // JSON-serialized fields
  assert(typeof update.params[4] === 'string', 'issues_found serialized');
  assert(typeof update.params[5] === 'string', 'blockers_found serialized');
  assert(typeof update.params[6] === 'string', 'violations_found serialized');
  assertEq(update.params[10], 'nick', 'evaluated_by = actor');
  assertEq(update.params[11], 'p3', 'prompt id in WHERE');

  // Log entry
  const logInsert = queryCalls.find(c => /INSERT INTO system_logs/.test(c.sql))!;
  assert(/EVAL_/.test(logInsert.params[1]), 'log message has EVAL_');
  assertEq(logInsert.params[3], 'nick', 'log user_email');
}

// Fail log level
console.log('\n── runEvaluation: WARN log on fail ───────────────────────');
resetAll();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry/i,
    handler: (params) => [[{
      id: params[0], status: 'complete', prompt_text: SAMPLE_PROMPT,
      execution_result: 'used a fallback hack with placeholder content and TODO markers',
    }]],
  },
  {
    match: /UPDATE om_prompt_registry/i,
    handler: () => [{ affectedRows: 1 }],
  },
  {
    match: /INSERT INTO system_logs/i,
    handler: () => [{ insertId: 1 }],
  },
];
{
  const result = await runEvaluation('p4', 'nick');
  const logInsert = queryCalls.find(c => /INSERT INTO system_logs/.test(c.sql))!;
  assertEq(logInsert.params[0], 'WARN', 'WARN level on fail');
  assert(/EVAL_FAIL/.test(logInsert.params[1]), 'EVAL_FAIL in message');
}

// SUCCESS log level when evaluator passes
console.log('\n── runEvaluation: SUCCESS log on pass ────────────────────');
resetAll();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry/i,
    handler: (params) => [[{
      id: params[0], status: 'complete',
      prompt_text: 'just a bare prompt with no extractable sections at all',
      execution_result: 'A reasonably detailed output describing what was done with many characters here over 50 total.',
    }]],
  },
  { match: /UPDATE om_prompt_registry/i, handler: () => [{ affectedRows: 1 }] },
  { match: /INSERT INTO system_logs/i, handler: () => [{ insertId: 1 }] },
];
{
  await runEvaluation('p5', 'nick');
  const logInsert = queryCalls.find(c => /INSERT INTO system_logs/.test(c.sql))!;
  assertEq(logInsert.params[0], 'SUCCESS', 'SUCCESS level on pass');
}

// ============================================================================
// runEvaluation — verified status accepted
// ============================================================================
console.log('\n── runEvaluation: verified status ────────────────────────');
resetAll();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry/i,
    handler: (params) => [[{
      id: params[0], status: 'verified',
      prompt_text: 'bare text',
      execution_result: 'a reasonably detailed output with many characters explaining the result in detail',
      verification_result: '{"ok":true}',
    }]],
  },
  { match: /UPDATE om_prompt_registry/i, handler: () => [{ affectedRows: 1 }] },
  { match: /INSERT INTO system_logs/i, handler: () => [{ insertId: 1 }] },
];
{
  const result = await runEvaluation('p6', 'a');
  assert(result.evaluation, 'verified status also evaluable');
}

// ============================================================================
// getEvaluation
// ============================================================================
console.log('\n── getEvaluation ─────────────────────────────────────────');

// Not found
resetAll();
routes = [{ match: /SELECT id, evaluator_status/i, handler: () => [[]] }];
await assertThrows(
  () => getEvaluation('missing'),
  'Prompt not found',
  'missing throws'
);

// Found with parsed JSON fields
resetAll();
routes = [{
  match: /SELECT id, evaluator_status/i,
  handler: () => [[{
    id: 'p7',
    evaluator_status: 'pass',
    evaluator_notes: 'all good',
    result_type: 'implementation',
    completion_status: 'complete',
    issues_found: '[]',
    blockers_found: '[]',
    violations_found: '[]',
    completed_outcomes: JSON.stringify([{ source: 'REQUIREMENTS', requirement: 'x' }]),
    remaining_outcomes: '[]',
    changed_files: JSON.stringify(['a.ts', 'b.ts']),
    evaluated_at: '2026-04-10T00:00:00Z',
    evaluated_by: 'nick',
    next_prompt_id: null,
  }]],
}];
{
  const r = await getEvaluation('p7');
  assertEq(r.prompt_id, 'p7', 'prompt_id');
  assertEq(r.evaluator_status, 'pass', 'status');
  assertEq(r.issues_found, [], 'issues parsed');
  assertEq(r.changed_files, ['a.ts', 'b.ts'], 'files parsed');
  assertEq(r.completed_outcomes, [{ source: 'REQUIREMENTS', requirement: 'x' }], 'outcomes parsed');
}

// Null JSON fields
resetAll();
routes = [{
  match: /SELECT id, evaluator_status/i,
  handler: () => [[{
    id: 'p8', evaluator_status: null, evaluator_notes: null,
    result_type: null, completion_status: null,
    issues_found: null, blockers_found: null, violations_found: null,
    completed_outcomes: null, remaining_outcomes: null, changed_files: null,
    evaluated_at: null, evaluated_by: null, next_prompt_id: null,
  }]],
}];
{
  const r = await getEvaluation('p8');
  assertEq(r.issues_found, null, 'null fields → null');
  assertEq(r.changed_files, null, 'null changed_files');
}

// ============================================================================
// enforceEvaluated
// ============================================================================
console.log('\n── enforceEvaluated ──────────────────────────────────────');

// Not found
resetAll();
routes = [{ match: /SELECT evaluator_status, completion_status/i, handler: () => [[]] }];
await assertThrows(
  () => enforceEvaluated('missing'),
  'Prompt not found',
  'missing throws'
);

// Not evaluated
resetAll();
routes = [{
  match: /SELECT evaluator_status, completion_status/i,
  handler: () => [[{ evaluator_status: null, completion_status: null }]],
}];
await assertThrows(
  () => enforceEvaluated('p9'),
  'Evaluation required',
  'null evaluator_status throws'
);

// Evaluated → no-op
resetAll();
routes = [{
  match: /SELECT evaluator_status, completion_status/i,
  handler: () => [[{ evaluator_status: 'pass', completion_status: 'complete' }]],
}];
{
  const r = await enforceEvaluated('p10');
  assertEq(r, undefined, 'pass → undefined');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => {
  console.error('Unhandled:', e);
  process.exit(1);
});
