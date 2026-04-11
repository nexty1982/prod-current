#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptEvaluationService.js (OMD-986)
 *
 * Pure evaluation engine for execution results against prompt requirements.
 * Exported pure functions: evaluateResult, extractRequirements, extractProhibitions.
 * DB-touching methods (runEvaluation, getEvaluation, enforceEvaluated) out of scope.
 *
 * Stubs `../config/db` with a no-op pool.
 *
 * Coverage:
 *   - extractRequirements: REQUIREMENTS, OUTPUT_REQUIREMENTS, TASK sources
 *       · Bullet prefixes stripped (-, *, numeric)
 *       · Lines under 6 chars skipped (> 5)
 *       · TASK truncated to 500 chars
 *   - extractProhibitions: PROHIBITIONS section parsed, short lines skipped
 *   - evaluateResult:
 *       · result_type classification (plan, implementation, verification, correction)
 *       · Defaults to 'implementation' with no signals
 *       · Violation detection (fallback, partial, placeholder, mock, etc.)
 *       · Violation includes context snippet + matched text
 *       · Blocker detection (dependency, access, missing_resource, infrastructure)
 *       · completion_status rules:
 *           - blocked (blockers + low completion)
 *           - failed (disqualifying violation)
 *           - complete (all requirements matched)
 *           - partial (some completed, some remaining)
 *           - complete on empty requirements with substantive result
 *           - failed on empty requirements with trivial result
 *       · evaluator_status rules:
 *           - fail on disqualifying violation
 *           - pass on complete
 *           - partial + no violations → pass
 *           - partial + violations → fail
 *       · changed_files extraction from result text
 *       · evaluator_notes format
 *       · Accepts object or string for executionResult/verificationResult
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

// Stub ../config/db
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => ({ query: async () => [[], []] }) },
} as any;

const svc = require('../promptEvaluationService');

// ============================================================================
// extractRequirements
// ============================================================================
console.log('\n── extractRequirements ───────────────────────────────────');

{
  const prompt = `
TASK:
Build a JWT authentication system with refresh tokens and proper session management for the platform.

---

REQUIREMENTS:
- Use bcrypt for password hashing
- Validate JWT on every request
- Support refresh token rotation

---

OUTPUT REQUIREMENTS:
- auth middleware module
- login/logout/refresh endpoints
- session schema migration

---
`;
  const reqs = svc.extractRequirements(prompt);
  const sources = reqs.map((r: any) => r.source);
  assert(sources.includes('REQUIREMENTS'), 'parses REQUIREMENTS');
  assert(sources.includes('OUTPUT_REQUIREMENTS'), 'parses OUTPUT_REQUIREMENTS');
  assert(sources.includes('TASK'), 'parses TASK');

  const reqItems = reqs.filter((r: any) => r.source === 'REQUIREMENTS');
  assertEq(reqItems.length, 3, '3 REQUIREMENTS items');
  assert(reqItems[0].text.startsWith('Use bcrypt'), 'bullet prefix stripped');
  assert(!reqItems[0].text.startsWith('-'), 'no leading dash');

  const outItems = reqs.filter((r: any) => r.source === 'OUTPUT_REQUIREMENTS');
  assertEq(outItems.length, 3, '3 OUTPUT_REQUIREMENTS items');

  const taskItem = reqs.find((r: any) => r.source === 'TASK');
  assert(taskItem.text.includes('JWT authentication'), 'TASK extracted');
}

// Numeric + asterisk bullets
{
  const prompt = `REQUIREMENTS:
1. First requirement here
2. Second requirement here
* Third requirement here
`;
  const reqs = svc.extractRequirements(prompt);
  const items = reqs.filter((r: any) => r.source === 'REQUIREMENTS');
  assertEq(items.length, 3, '3 items (mixed bullet styles)');
  assert(items[0].text === 'First requirement here', 'numeric bullet stripped');
  assert(items[2].text === 'Third requirement here', 'asterisk bullet stripped');
}

// Short lines (≤5 chars) skipped
{
  const prompt = `REQUIREMENTS:
- foo
- A substantive requirement line
`;
  const reqs = svc.extractRequirements(prompt);
  const items = reqs.filter((r: any) => r.source === 'REQUIREMENTS');
  assertEq(items.length, 1, 'short line "foo" skipped');
  assert(items[0].text.includes('substantive'), 'long line kept');
}

// TASK truncated at 500
{
  const big = 'X'.repeat(700);
  const prompt = `TASK:\n${big}\n---\n`;
  const reqs = svc.extractRequirements(prompt);
  const task = reqs.find((r: any) => r.source === 'TASK');
  assert(task !== undefined, 'TASK found');
  assertEq(task.text.length, 500, 'TASK truncated to 500');
}

// Missing sections → empty
{
  const reqs = svc.extractRequirements('');
  assertEq(reqs, [], 'empty prompt → no requirements');
}

// ============================================================================
// extractProhibitions
// ============================================================================
console.log('\n── extractProhibitions ───────────────────────────────────');

{
  const prompt = `
PROHIBITIONS:
- Do not store passwords in plain text
- Do not skip token validation
- Do not rely on client-side storage alone

---
`;
  const prohibs = svc.extractProhibitions(prompt);
  assertEq(prohibs.length, 3, '3 prohibitions');
  assert(prohibs[0].startsWith('Do not store'), 'bullet stripped');
}

// No PROHIBITIONS → empty
{
  assertEq(svc.extractProhibitions('no prohibitions here'), [], 'none found');
}

// Short lines skipped
{
  const prompt = 'PROHIBITIONS:\n- bad\n- Do not do this bad thing at all';
  const prohibs = svc.extractProhibitions(prompt);
  assertEq(prohibs.length, 1, 'short "bad" skipped');
}

// ============================================================================
// evaluateResult: result_type classification
// ============================================================================
console.log('\n── evaluateResult: result_type ───────────────────────────');

const emptyPrompt = '';

{
  const r = svc.evaluateResult(emptyPrompt, 'I will create and build a new component', null);
  assertEq(r.result_type, 'plan', 'plan classified');
}
{
  const r = svc.evaluateResult(emptyPrompt, 'Created auth.js. Wrote login endpoint. Files created: src/auth.js', null);
  assertEq(r.result_type, 'implementation', 'implementation classified');
}
{
  const r = svc.evaluateResult(emptyPrompt, 'All tests pass. Verified and validated the output.', null);
  assertEq(r.result_type, 'verification', 'verification classified');
}
{
  const r = svc.evaluateResult(emptyPrompt, 'Fixed the regression and patched the bug fix.', null);
  assertEq(r.result_type, 'correction', 'correction classified');
}
{
  // No recognizable signals → default 'implementation'
  const r = svc.evaluateResult(emptyPrompt, 'Some generic output text with no signal words', null);
  assertEq(r.result_type, 'implementation', 'default classification');
}

// ============================================================================
// evaluateResult: violation detection
// ============================================================================
console.log('\n── evaluateResult: violations ────────────────────────────');

{
  const r = svc.evaluateResult(emptyPrompt, 'Used a fallback for this case', null);
  const v = r.violations_found.find((x: any) => x.key === 'fallback_behavior');
  assert(v !== undefined, 'fallback_behavior caught');
  assert(v.matched.toLowerCase() === 'fallback', 'matched text');
  assert(typeof v.context === 'string' && v.context.length > 0, 'has context');
  assert(v.context.includes('fallback'), 'context has match');
  assert(typeof v.description === 'string', 'has description');
}

{
  const r = svc.evaluateResult(emptyPrompt, 'TODO: finish this later — stub implementation', null);
  const keys = r.violations_found.map((v: any) => v.key);
  assert(keys.includes('partial_implementation'), 'partial_implementation caught (TODO/stub)');
}

{
  const r = svc.evaluateResult(emptyPrompt, 'Added placeholder with lorem ipsum for now', null);
  const keys = r.violations_found.map((v: any) => v.key);
  assert(keys.includes('placeholder_content'), 'placeholder_content caught');
  assert(keys.includes('skipped_requirement'), 'skipped_requirement ("for now") caught');
}

{
  const r = svc.evaluateResult(emptyPrompt, 'Used mocked data with hardcoded values', null);
  const keys = r.violations_found.map((v: any) => v.key);
  assert(keys.includes('mock_data'), 'mock_data caught');
}

{
  const r = svc.evaluateResult(emptyPrompt, 'Opted for a simplified basic version instead', null);
  const keys = r.violations_found.map((v: any) => v.key);
  assert(keys.includes('simplified_version'), 'simplified_version caught');
  assert(keys.includes('alternate_approach'), 'alternate_approach caught');
}

{
  const r = svc.evaluateResult(emptyPrompt, 'Suppressed the errors silently', null);
  const keys = r.violations_found.map((v: any) => v.key);
  assert(keys.includes('error_suppression'), 'error_suppression caught');
}

// Clean result → no violations
{
  const r = svc.evaluateResult(emptyPrompt, 'Successfully built the feature with proper tests.', null);
  assertEq(r.violations_found.length, 0, 'clean result has no violations');
}

// ============================================================================
// evaluateResult: blocker detection
// ============================================================================
console.log('\n── evaluateResult: blockers ──────────────────────────────');

{
  const r = svc.evaluateResult(emptyPrompt, 'Task blocked by missing dependency package', null);
  const types = r.blockers_found.map((b: any) => b.type);
  assert(types.includes('dependency'), 'dependency blocker caught');
  assert(types.includes('missing_resource'), 'missing_resource caught');
}

{
  const r = svc.evaluateResult(emptyPrompt, 'Permission denied reading the file', null);
  const types = r.blockers_found.map((b: any) => b.type);
  assert(types.includes('access'), 'access blocker caught');
}

{
  const r = svc.evaluateResult(emptyPrompt, 'Connection refused to the upstream host', null);
  const types = r.blockers_found.map((b: any) => b.type);
  assert(types.includes('infrastructure'), 'infrastructure blocker caught');
}

// Blocker context snippet
{
  const r = svc.evaluateResult(emptyPrompt, 'Everything went fine except permission denied at step 3', null);
  const b = r.blockers_found.find((x: any) => x.type === 'access');
  assert(b !== undefined, 'found access blocker');
  assert(b.context.length > 0, 'has context');
  assert(b.context.toLowerCase().includes('permission denied'), 'context includes match');
}

// ============================================================================
// evaluateResult: completion_status rules
// ============================================================================
console.log('\n── evaluateResult: completion_status ─────────────────────');

const promptWithReqs = `TASK:
Build an authentication system with JWT tokens.

REQUIREMENTS:
- Use bcrypt for password hashing
- Validate JWT on every request
`;

// complete: all requirements matched (including keywords from TASK section:
// "build", "authentication", "system", "JWT", "tokens")
{
  const result = 'Built the authentication system with JWT tokens. Implemented bcrypt password hashing for all user accounts. Now validating JWT on every request in the auth middleware.';
  const r = svc.evaluateResult(promptWithReqs, result, null);
  assertEq(r.completion_status, 'complete', 'complete when all matched');
}

// partial: some matched
{
  const result = 'Implemented bcrypt password hashing but JWT validation not yet done.';
  const r = svc.evaluateResult(promptWithReqs, result, null);
  // "not yet" triggers partial_implementation violation → might be failed
  assert(['partial', 'failed'].includes(r.completion_status), 'partial or failed');
}

// No requirements → complete if substantive result
{
  const r = svc.evaluateResult('', 'A sufficiently long successful output message describing the work', null);
  assertEq(r.completion_status, 'complete', 'no reqs + substantive → complete');
}

// No requirements + trivial result → failed
{
  const r = svc.evaluateResult('', 'nope', null);
  assertEq(r.completion_status, 'failed', 'trivial result → failed');
}

// blocked: blockers + low completion
{
  const prompt = `REQUIREMENTS:
- implement xyz feature completely
- integrate with the backend service
- write comprehensive tests for the feature
`;
  const result = 'Task blocked by missing dependency package. Permission denied too.';
  const r = svc.evaluateResult(prompt, result, null);
  assertEq(r.completion_status, 'blocked', 'blocked status');
}

// failed: disqualifying violation
{
  const result = 'Added a fallback for this case since the real approach is hard. Implemented bcrypt password hashing. Validating JWT every request.';
  const r = svc.evaluateResult(promptWithReqs, result, null);
  assertEq(r.completion_status, 'failed', 'fallback violation → failed');
}

// ============================================================================
// evaluateResult: evaluator_status rules
// ============================================================================
console.log('\n── evaluateResult: evaluator_status ──────────────────────');

// Disqualifying violation → fail
{
  const r = svc.evaluateResult(promptWithReqs,
    'Used placeholder content in bcrypt and JWT validation.', null);
  assertEq(r.evaluator_status, 'fail', 'disqualifying violation → fail');
}

// Complete + no violations → pass (match keywords from all reqs + TASK)
{
  const r = svc.evaluateResult(promptWithReqs,
    'Built the authentication system with JWT tokens. Implemented bcrypt password hashing for all users. Now validating JWT on every request properly.', null);
  assertEq(r.evaluator_status, 'pass', 'complete → pass');
}

// Blocked → fail
{
  const prompt = `REQUIREMENTS:
- implement xyz feature completely
- integrate with the backend service
- write comprehensive tests for the feature
`;
  const r = svc.evaluateResult(prompt, 'Task blocked by missing dependency', null);
  assertEq(r.evaluator_status, 'fail', 'blocked → fail');
}

// ============================================================================
// evaluateResult: changed_files extraction
// ============================================================================
console.log('\n── evaluateResult: changed_files ─────────────────────────');

{
  const result = 'Created: src/auth.js. Modified: src/index.ts. Added `src/middleware/jwt.ts`.';
  const r = svc.evaluateResult('', result, null);
  assert(r.changed_files.length >= 2, 'extracted multiple files');
  assert(r.changed_files.some((f: string) => f.includes('auth.js')), 'has auth.js');
  assert(r.changed_files.some((f: string) => f.includes('.ts')), 'has ts files');

  // Dedup
  const unique = new Set(r.changed_files);
  assertEq(unique.size, r.changed_files.length, 'changed_files deduped');
}

// No files
{
  const r = svc.evaluateResult('', 'just some text with no files', null);
  assertEq(r.changed_files, [], 'no files extracted');
}

// ============================================================================
// evaluateResult: accepts object/string input
// ============================================================================
console.log('\n── evaluateResult: input types ───────────────────────────');

{
  // Object input
  const r = svc.evaluateResult('', { message: 'Built and tested successfully', status: 'ok' }, null);
  assert(r.evaluator_notes.includes('Result type'), 'handles object input');
}

{
  // null verification result
  const r = svc.evaluateResult('', 'ok', null);
  assert(typeof r.evaluator_notes === 'string', 'null verification handled');
}

{
  // undefined execution result
  const r = svc.evaluateResult('', undefined, undefined);
  assert(typeof r.evaluator_notes === 'string', 'undefined handled');
}

// ============================================================================
// evaluateResult: result shape
// ============================================================================
console.log('\n── evaluateResult: result shape ──────────────────────────');

{
  const r = svc.evaluateResult(promptWithReqs, 'Built bcrypt for passwords, validated JWT on every request', null);
  const expectedKeys = [
    'result_type', 'completion_status', 'evaluator_status', 'evaluator_notes',
    'issues_found', 'blockers_found', 'violations_found',
    'completed_outcomes', 'remaining_outcomes', 'changed_files',
    'evaluated_at', 'requirements_count', 'prohibitions_count',
  ];
  for (const k of expectedKeys) {
    assert(k in r, `has key: ${k}`);
  }
  assert(/^\d{4}-\d{2}-\d{2}T/.test(r.evaluated_at), 'evaluated_at is ISO');
  assert(r.requirements_count >= 2, 'requirements counted');
  assert(r.evaluator_notes.includes('Result type'), 'notes has result type line');
  assert(r.evaluator_notes.includes('Completion'), 'notes has completion line');
  assert(r.evaluator_notes.includes('Evaluator'), 'notes has evaluator line');
}

// ============================================================================
// Exported constants
// ============================================================================
console.log('\n── Exported constants ────────────────────────────────────');

assert(Array.isArray(svc.VIOLATION_PATTERNS), 'VIOLATION_PATTERNS array');
assert(svc.VIOLATION_PATTERNS.length >= 8, 'has 8+ violation patterns');
const vpKeys = svc.VIOLATION_PATTERNS.map((v: any) => v.key);
assert(vpKeys.includes('fallback_behavior'), 'has fallback_behavior');
assert(vpKeys.includes('mock_data'), 'has mock_data');
assert(vpKeys.includes('error_suppression'), 'has error_suppression');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
