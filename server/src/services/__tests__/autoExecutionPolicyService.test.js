/**
 * Auto-Execution Policy Service — Tests
 *
 * Tests the deterministic eligibility rules and policy functions:
 *   - Eligibility rule enforcement (E1-E10)
 *   - Blocked auto-execution scenarios
 *   - Successful eligibility (all rules pass)
 *   - Mode differences (SAFE vs FULL)
 *   - No execution when OFF
 *   - Degradation/escalation blocking
 *   - Edge cases
 *
 * Run:  node server/src/services/__tests__/autoExecutionPolicyService.test.js
 */

// ─── Mock DB ──────────────────────────────────────────────────────────────
const mockDb = { query: async () => [[]] };
require('../../config/db').getAppPool = () => mockDb;

const {
  MODE, SAFE_RULES, FULL_RULES,
  evaluateEligibility,
} = require('../autoExecutionPolicyService');

// ─── Test Harness ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) { passed++; } else {
    failed++;
    failures.push(label);
    console.error(`  ✗ ${label}`);
  }
}

function eq(actual, expected, label) {
  if (actual === expected) { passed++; } else {
    failed++;
    failures.push(`${label} — expected "${expected}", got "${actual}"`);
    console.error(`  ✗ ${label} — expected "${expected}", got "${actual}"`);
  }
}

function section(name) { console.log(`\n── ${name} ──`); }

// ─── Factories ────────────────────────────────────────────────────────────

function makeRec(overrides = {}) {
  return {
    action: 'RELEASE_NOW',
    rule_id: 'R6',
    priority: 'medium',
    reason: 'Safe to release',
    ...overrides,
  };
}

function makePrompt(overrides = {}) {
  return {
    id: 'test-prompt-1',
    title: 'Test Prompt',
    component: 'saints',
    status: 'approved',
    queue_status: 'ready_for_release',
    priority: 'normal',
    confidence_level: 'high',
    evaluator_status: 'pass',
    completion_status: 'complete',
    escalation_required: 0,
    degradation_flag: 0,
    release_mode: 'auto_safe',
    blocked_reasons: null,
    chain_id: null,
    chain_step_number: null,
    _has_chain_failure: false,
    _auto_execute_excluded: false,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. SUCCESSFUL ELIGIBILITY — all rules pass
// ═══════════════════════════════════════════════════════════════════════════

section('1. Successful Eligibility');

{
  const result = evaluateEligibility(makeRec(), makePrompt(), MODE.SAFE);
  eq(result.eligible, true, 'All rules pass → eligible');
  eq(result.failures.length, 0, 'No failures');
  eq(result.passed_count, SAFE_RULES.length, `All ${SAFE_RULES.length} rules passed`);
  eq(result.total_rules, SAFE_RULES.length, 'Total rules count correct');
  eq(result.mode, 'SAFE', 'Mode is SAFE');
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. INDIVIDUAL RULE BLOCKING — each rule independently fails
// ═══════════════════════════════════════════════════════════════════════════

section('2. Individual Rule Blocking');

// E1: Action not RELEASE_NOW
{
  const result = evaluateEligibility(makeRec({ action: 'FIX_REQUIRED' }), makePrompt());
  eq(result.eligible, false, 'E1: non-RELEASE action → ineligible');
  assert(result.failures.some(f => f.id === 'E1'), 'E1: failure includes E1');
}

// E2: Confidence not high
{
  const result = evaluateEligibility(makeRec(), makePrompt({ confidence_level: 'medium' }));
  eq(result.eligible, false, 'E2: medium confidence → ineligible (SAFE)');
  assert(result.failures.some(f => f.id === 'E2'), 'E2: failure includes E2');
}

{
  const result = evaluateEligibility(makeRec(), makePrompt({ confidence_level: 'low' }));
  eq(result.eligible, false, 'E2: low confidence → ineligible');
}

{
  const result = evaluateEligibility(makeRec(), makePrompt({ confidence_level: 'unknown' }));
  eq(result.eligible, false, 'E2: unknown confidence → ineligible');
}

// E3: Evaluator not pass
{
  const result = evaluateEligibility(makeRec(), makePrompt({ evaluator_status: 'fail' }));
  eq(result.eligible, false, 'E3: evaluator fail → ineligible');
  assert(result.failures.some(f => f.id === 'E3'), 'E3: failure includes E3');
}

{
  const result = evaluateEligibility(makeRec(), makePrompt({ evaluator_status: 'pending' }));
  eq(result.eligible, false, 'E3: evaluator pending → ineligible');
}

{
  const result = evaluateEligibility(makeRec(), makePrompt({ evaluator_status: null }));
  eq(result.eligible, false, 'E3: evaluator null → ineligible');
}

// E4: Completion not complete
{
  const result = evaluateEligibility(makeRec(), makePrompt({ completion_status: 'partial' }));
  eq(result.eligible, false, 'E4: partial completion → ineligible');
  assert(result.failures.some(f => f.id === 'E4'), 'E4: failure includes E4');
}

{
  const result = evaluateEligibility(makeRec(), makePrompt({ completion_status: 'failed' }));
  eq(result.eligible, false, 'E4: failed completion → ineligible');
}

{
  const result = evaluateEligibility(makeRec(), makePrompt({ completion_status: null }));
  eq(result.eligible, false, 'E4: null completion → ineligible');
}

// E5: Escalation required
{
  const result = evaluateEligibility(makeRec(), makePrompt({ escalation_required: 1 }));
  eq(result.eligible, false, 'E5: escalation → ineligible');
  assert(result.failures.some(f => f.id === 'E5'), 'E5: failure includes E5');
}

// E6: Degradation flag
{
  const result = evaluateEligibility(makeRec(), makePrompt({ degradation_flag: 1 }));
  eq(result.eligible, false, 'E6: degradation → ineligible');
  assert(result.failures.some(f => f.id === 'E6'), 'E6: failure includes E6');
}

// E7: Dependencies not satisfied
{
  const result = evaluateEligibility(makeRec(), makePrompt({ queue_status: 'blocked' }));
  eq(result.eligible, false, 'E7: blocked queue → ineligible');
  assert(result.failures.some(f => f.id === 'E7'), 'E7: failure includes E7');
}

{
  const result = evaluateEligibility(makeRec(), makePrompt({ queue_status: 'pending' }));
  eq(result.eligible, false, 'E7: pending queue → ineligible');
}

{
  const result = evaluateEligibility(makeRec(), makePrompt({ queue_status: 'scheduled' }));
  eq(result.eligible, false, 'E7: scheduled queue → ineligible');
}

// E7: overdue is also eligible
{
  const result = evaluateEligibility(makeRec(), makePrompt({ queue_status: 'overdue' }));
  eq(result.eligible, true, 'E7: overdue queue → eligible (overdue is valid)');
}

// E8: Release mode doesn't allow auto
{
  const result = evaluateEligibility(makeRec(), makePrompt({ release_mode: 'manual' }));
  eq(result.eligible, false, 'E8: manual release mode → ineligible');
  assert(result.failures.some(f => f.id === 'E8'), 'E8: failure includes E8');
}

// E8: auto_full is also allowed
{
  const result = evaluateEligibility(makeRec(), makePrompt({ release_mode: 'auto_full' }));
  eq(result.eligible, true, 'E8: auto_full release mode → eligible');
}

// E9: Chain failure
{
  const result = evaluateEligibility(makeRec(), makePrompt({ _has_chain_failure: true }));
  eq(result.eligible, false, 'E9: chain failure → ineligible');
  assert(result.failures.some(f => f.id === 'E9'), 'E9: failure includes E9');
}

// E10: Excluded by operator
{
  const result = evaluateEligibility(makeRec(), makePrompt({ _auto_execute_excluded: true }));
  eq(result.eligible, false, 'E10: excluded → ineligible');
  assert(result.failures.some(f => f.id === 'E10'), 'E10: failure includes E10');
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. MULTIPLE FAILURES — all failures reported
// ═══════════════════════════════════════════════════════════════════════════

section('3. Multiple Failures');

{
  const result = evaluateEligibility(
    makeRec({ action: 'FIX_REQUIRED' }),
    makePrompt({
      confidence_level: 'low',
      evaluator_status: 'fail',
      completion_status: 'failed',
      escalation_required: 1,
      degradation_flag: 1,
      queue_status: 'blocked',
      release_mode: 'manual',
      _has_chain_failure: true,
      _auto_execute_excluded: true,
    })
  );
  eq(result.eligible, false, 'All rules fail → ineligible');
  eq(result.failures.length, SAFE_RULES.length, `All ${SAFE_RULES.length} rules reported as failures`);
  eq(result.passed_count, 0, 'Zero passed');
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. SAFE vs FULL MODE — confidence relaxation
// ═══════════════════════════════════════════════════════════════════════════

section('4. SAFE vs FULL Mode');

// Medium confidence: fails SAFE, passes FULL
{
  const prompt = makePrompt({ confidence_level: 'medium' });
  const safeResult = evaluateEligibility(makeRec(), prompt, MODE.SAFE);
  const fullResult = evaluateEligibility(makeRec(), prompt, MODE.FULL);

  eq(safeResult.eligible, false, 'SAFE mode: medium confidence → ineligible');
  eq(fullResult.eligible, true, 'FULL mode: medium confidence → eligible');
  eq(safeResult.mode, 'SAFE', 'Result reports SAFE mode');
  eq(fullResult.mode, 'FULL', 'Result reports FULL mode');
}

// Low confidence: fails both
{
  const prompt = makePrompt({ confidence_level: 'low' });
  const safeResult = evaluateEligibility(makeRec(), prompt, MODE.SAFE);
  const fullResult = evaluateEligibility(makeRec(), prompt, MODE.FULL);

  eq(safeResult.eligible, false, 'SAFE mode: low confidence → ineligible');
  eq(fullResult.eligible, false, 'FULL mode: low confidence → ineligible');
}

// High confidence: passes both
{
  const prompt = makePrompt({ confidence_level: 'high' });
  const safeResult = evaluateEligibility(makeRec(), prompt, MODE.SAFE);
  const fullResult = evaluateEligibility(makeRec(), prompt, MODE.FULL);

  eq(safeResult.eligible, true, 'SAFE mode: high confidence → eligible');
  eq(fullResult.eligible, true, 'FULL mode: high confidence → eligible');
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. SAFETY GUARDS — escalation/degradation always block
// ═══════════════════════════════════════════════════════════════════════════

section('5. Safety Guards');

// Escalation blocks even with everything else perfect
{
  const result = evaluateEligibility(makeRec(), makePrompt({ escalation_required: 1 }), MODE.FULL);
  eq(result.eligible, false, 'FULL mode: escalation still blocks');
}

// Degradation blocks even in FULL mode
{
  const result = evaluateEligibility(makeRec(), makePrompt({ degradation_flag: 1 }), MODE.FULL);
  eq(result.eligible, false, 'FULL mode: degradation still blocks');
}

// Blocked queue blocks in all modes
{
  const result = evaluateEligibility(makeRec(), makePrompt({ queue_status: 'blocked' }), MODE.FULL);
  eq(result.eligible, false, 'FULL mode: blocked queue still blocks');
}

// Non-RELEASE action blocked in all modes
{
  const result = evaluateEligibility(makeRec({ action: 'REVIEW_REQUIRED' }), makePrompt(), MODE.FULL);
  eq(result.eligible, false, 'FULL mode: REVIEW_REQUIRED still blocked');
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. DETERMINISM — same input → same output
// ═══════════════════════════════════════════════════════════════════════════

section('6. Determinism');

{
  const rec = makeRec();
  const prompt = makePrompt({ confidence_level: 'low', escalation_required: 1 });
  const r1 = evaluateEligibility(rec, prompt, MODE.SAFE);
  const r2 = evaluateEligibility(rec, prompt, MODE.SAFE);
  const r3 = evaluateEligibility(rec, prompt, MODE.SAFE);

  eq(r1.eligible, r2.eligible, 'Determinism: same eligible result (1=2)');
  eq(r2.eligible, r3.eligible, 'Determinism: same eligible result (2=3)');
  eq(r1.failures.length, r2.failures.length, 'Determinism: same failure count');
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. OUTPUT STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

section('7. Output Structure');

{
  const result = evaluateEligibility(makeRec(), makePrompt({ confidence_level: 'low' }));

  assert(typeof result.eligible === 'boolean', 'Output: eligible is boolean');
  assert(result.prompt_id === 'test-prompt-1', 'Output: prompt_id present');
  assert(result.title === 'Test Prompt', 'Output: title present');
  assert(result.mode === 'SAFE', 'Output: mode present');
  assert(Array.isArray(result.passed_rules), 'Output: passed_rules is array');
  assert(Array.isArray(result.failures), 'Output: failures is array');
  assert(typeof result.passed_count === 'number', 'Output: passed_count is number');
  assert(typeof result.total_rules === 'number', 'Output: total_rules is number');

  // Failure structure
  const f = result.failures[0];
  assert(f.id !== undefined, 'Failure: has id');
  assert(f.name !== undefined, 'Failure: has name');
  assert(typeof f.reason === 'string', 'Failure: has reason string');
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. RULE COVERAGE
// ═══════════════════════════════════════════════════════════════════════════

section('8. Rule Coverage');

{
  eq(SAFE_RULES.length, 10, 'SAFE mode: 10 rules');
  eq(FULL_RULES.length, 10, 'FULL mode: 10 rules');

  const safeIds = SAFE_RULES.map(r => r.id);
  for (let i = 1; i <= 10; i++) {
    assert(safeIds.includes(`E${i}`), `Rule E${i} exists`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. MODE CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

section('9. Mode Constants');

{
  eq(MODE.OFF, 'OFF', 'MODE.OFF');
  eq(MODE.SAFE, 'SAFE', 'MODE.SAFE');
  eq(MODE.FULL, 'FULL', 'MODE.FULL');
  eq(Object.keys(MODE).length, 3, 'Exactly 3 modes');
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════

section('10. Edge Cases');

// Truthy/falsy escalation (0 vs 1 vs false vs true)
{
  eq(evaluateEligibility(makeRec(), makePrompt({ escalation_required: 0 })).eligible, true, 'escalation_required=0 → eligible');
  eq(evaluateEligibility(makeRec(), makePrompt({ escalation_required: false })).eligible, true, 'escalation_required=false → eligible');
  eq(evaluateEligibility(makeRec(), makePrompt({ escalation_required: 1 })).eligible, false, 'escalation_required=1 → ineligible');
  eq(evaluateEligibility(makeRec(), makePrompt({ escalation_required: true })).eligible, false, 'escalation_required=true → ineligible');
}

// Truthy/falsy degradation
{
  eq(evaluateEligibility(makeRec(), makePrompt({ degradation_flag: 0 })).eligible, true, 'degradation_flag=0 → eligible');
  eq(evaluateEligibility(makeRec(), makePrompt({ degradation_flag: 1 })).eligible, false, 'degradation_flag=1 → ineligible');
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════════════

console.log(`\n${'═'.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);

if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  process.exit(1);
} else {
  console.log('All tests passed ✓');
  process.exit(0);
}
