#!/usr/bin/env npx tsx
/**
 * Unit tests for services/constraintInjectionEngine.js (OMD-974)
 *
 * Pure constraint-injection helper. Stubs `./workflowLearningService` via
 * require.cache with controllable getConstraints() and a recording
 * recordInjection() spy.
 *
 * Coverage:
 *   - buildConstraintBlock: empty constraints → empty text + no-op recordAll
 *   - buildConstraintBlock: passes step.component to getConstraints
 *   - buildConstraintBlock: falls back to workflow.component when step has none
 *   - buildConstraintBlock: passes null when neither has component
 *   - buildConstraintBlock: dedups by constraint_text (case-insensitive,
 *     trim-insensitive)
 *   - buildConstraintBlock: text format with header + bullet + source line
 *   - buildConstraintBlock: severity uppercased
 *   - buildConstraintBlock: recordAll iterates unique constraints,
 *     passing learning_id/prompt_id/workflow_id/constraint_text/injection_reason
 *   - previewConstraints: empty case
 *   - previewConstraints: dedup behavior
 *   - previewConstraints: preview_text format
 *
 * Run: npx tsx server/src/services/__tests__/constraintInjectionEngine.test.ts
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

// ── Stub ./workflowLearningService BEFORE requiring SUT ──────────────
type GetCall = { component: string | null };
type RecordCall = any;

const getCalls: GetCall[] = [];
const recordCalls: RecordCall[] = [];
let nextConstraints: any[] = [];

function reset(constraints: any[] = []) {
  getCalls.length = 0;
  recordCalls.length = 0;
  nextConstraints = constraints;
}

const learningSvcPath = require.resolve('../workflowLearningService');
require.cache[learningSvcPath] = {
  id: learningSvcPath,
  filename: learningSvcPath,
  loaded: true,
  exports: {
    getConstraints: async (component: string | null) => {
      getCalls.push({ component });
      return nextConstraints;
    },
    recordInjection: async (entry: any) => {
      recordCalls.push(entry);
    },
  },
} as any;

const { buildConstraintBlock, previewConstraints } = require('../constraintInjectionEngine');

async function main() {

// ============================================================================
// buildConstraintBlock — empty
// ============================================================================
console.log('\n── buildConstraintBlock: empty ───────────────────────────');

reset([]);
{
  const block = await buildConstraintBlock({ component: 'foo' }, { id: 1, component: 'foo' });
  assertEq(block.text, '', 'empty text');
  assertEq(block.constraints, [], 'empty constraints');
  assertEq(typeof block.recordAll, 'function', 'recordAll is fn');
  // No-op recordAll
  await block.recordAll('p-1');
  assertEq(recordCalls.length, 0, 'recordAll no-op');
}

// ============================================================================
// buildConstraintBlock — component resolution
// ============================================================================
console.log('\n── buildConstraintBlock: component resolution ────────────');

reset([]);
{
  await buildConstraintBlock({ component: 'foo' }, { id: 1, component: 'bar' });
  assertEq(getCalls[0].component, 'foo', 'step.component wins');
}

reset([]);
{
  await buildConstraintBlock({ component: null }, { id: 1, component: 'bar' });
  assertEq(getCalls[0].component, 'bar', 'fallback to workflow.component');
}

reset([]);
{
  await buildConstraintBlock({}, { id: 1, component: 'bar' });
  assertEq(getCalls[0].component, 'bar', 'missing step.component → workflow.component');
}

reset([]);
{
  await buildConstraintBlock({}, { id: 1 });
  assertEq(getCalls[0].component, null, 'neither set → null');
}

// ============================================================================
// buildConstraintBlock — dedup by constraint_text
// ============================================================================
console.log('\n── buildConstraintBlock: dedup ───────────────────────────');

reset([
  { learning_id: 1, constraint_text: 'Always validate input', severity: 'high',
    title: 'L1', occurrences: 5, injection_reason: 'high-priority' },
  { learning_id: 2, constraint_text: '  always VALIDATE input  ', severity: 'medium',
    title: 'L2', occurrences: 3, injection_reason: 'medium' },
  { learning_id: 3, constraint_text: 'Never trust user input', severity: 'critical',
    title: 'L3', occurrences: 10, injection_reason: 'critical' },
]);
{
  const block = await buildConstraintBlock({ component: 'auth' }, { id: 99 });
  assertEq(block.constraints.length, 2, 'deduped to 2');
  assertEq(block.constraints[0].learning_id, 1, 'first occurrence kept');
  assertEq(block.constraints[1].learning_id, 3, 'unique constraint kept');
}

// ============================================================================
// buildConstraintBlock — text format
// ============================================================================
console.log('\n── buildConstraintBlock: text format ─────────────────────');

reset([
  { learning_id: 1, constraint_text: 'Validate all dates', severity: 'high',
    title: 'Date learning', occurrences: 7, injection_reason: 'high' },
  { learning_id: 2, constraint_text: 'Use parameterized queries', severity: 'critical',
    title: 'SQL learning', occurrences: 12, injection_reason: 'critical' },
]);
{
  const block = await buildConstraintBlock({ component: 'records' }, { id: 5 });
  const text = block.text;
  assert(text.startsWith('LEARNED CONSTRAINTS'), 'starts with header');
  assert(text.includes('cross-workflow analysis'), 'header subtitle');
  assert(text.includes('- [HIGH] Validate all dates'), 'first bullet uppercased severity');
  assert(text.includes('  (Source: Date learning, 7 occurrences)'), 'first source line');
  assert(text.includes('- [CRITICAL] Use parameterized queries'), 'second bullet');
  assert(text.includes('  (Source: SQL learning, 12 occurrences)'), 'second source line');
}

// ============================================================================
// buildConstraintBlock — recordAll iterates
// ============================================================================
console.log('\n── buildConstraintBlock: recordAll iterates ──────────────');

reset([
  { learning_id: 10, constraint_text: 'A', severity: 'high', title: 'TA',
    occurrences: 1, injection_reason: 'reason-a' },
  { learning_id: 20, constraint_text: 'B', severity: 'low', title: 'TB',
    occurrences: 1, injection_reason: 'reason-b' },
]);
{
  const block = await buildConstraintBlock({ component: 'x' }, { id: 42 });
  await block.recordAll('prompt-XYZ');
  assertEq(recordCalls.length, 2, '2 record calls');
  assertEq(recordCalls[0].learning_id, 10, 'rec 0: learning_id');
  assertEq(recordCalls[0].prompt_id, 'prompt-XYZ', 'rec 0: prompt_id');
  assertEq(recordCalls[0].workflow_id, 42, 'rec 0: workflow_id');
  assertEq(recordCalls[0].constraint_text, 'A', 'rec 0: constraint_text');
  assertEq(recordCalls[0].injection_reason, 'reason-a', 'rec 0: injection_reason');
  assertEq(recordCalls[1].learning_id, 20, 'rec 1: learning_id');
  assertEq(recordCalls[1].constraint_text, 'B', 'rec 1: constraint_text');
}

// recordAll on deduped output records only unique
reset([
  { learning_id: 1, constraint_text: 'same', severity: 'high', title: 'a',
    occurrences: 1, injection_reason: 'r1' },
  { learning_id: 2, constraint_text: 'SAME', severity: 'low', title: 'b',
    occurrences: 1, injection_reason: 'r2' },
]);
{
  const block = await buildConstraintBlock({ component: 'x' }, { id: 1 });
  await block.recordAll('p1');
  assertEq(recordCalls.length, 1, 'only unique recorded');
  assertEq(recordCalls[0].learning_id, 1, 'first kept (id=1)');
}

// ============================================================================
// previewConstraints — empty
// ============================================================================
console.log('\n── previewConstraints: empty ─────────────────────────────');

reset([]);
{
  const r = await previewConstraints('foo');
  assertEq(r.constraints, [], 'empty constraints');
  assertEq(r.preview_text, '', 'empty preview_text');
  assertEq(getCalls[0].component, 'foo', 'component passed through');
}

// ============================================================================
// previewConstraints — dedup
// ============================================================================
console.log('\n── previewConstraints: dedup ─────────────────────────────');

reset([
  { learning_id: 1, constraint_text: 'do x', severity: 'high', title: 'A', occurrences: 5 },
  { learning_id: 2, constraint_text: '  DO X  ', severity: 'low', title: 'B', occurrences: 1 },
  { learning_id: 3, constraint_text: 'do y', severity: 'medium', title: 'C', occurrences: 3 },
]);
{
  const r = await previewConstraints('comp');
  assertEq(r.constraints.length, 2, 'deduped to 2');
  assertEq(r.constraints[0].learning_id, 1, 'first kept');
  assertEq(r.constraints[1].learning_id, 3, 'unique kept');
}

// ============================================================================
// previewConstraints — preview_text format
// ============================================================================
console.log('\n── previewConstraints: preview_text ──────────────────────');

reset([
  { learning_id: 1, constraint_text: 'Foo', severity: 'high', title: 'T1', occurrences: 5 },
  { learning_id: 2, constraint_text: 'Bar', severity: 'critical', title: 'T2', occurrences: 8 },
]);
{
  const r = await previewConstraints();
  assertEq(getCalls[0].component, undefined, 'no component passed → undefined');
  const expected = '[HIGH] Foo — T1 (5x)\n[CRITICAL] Bar — T2 (8x)';
  assertEq(r.preview_text, expected, 'preview_text format');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
} // end main

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
