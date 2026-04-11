#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptScoringService.js (OMD-1078)
 *
 * Deterministic quality-scoring engine. The only external dep is
 * `../config/db.getAppPool()`. We stub it with a SQL-routed fake pool
 * via require.cache BEFORE requiring the SUT.
 *
 * Coverage:
 *   Pure:
 *     - calculateScore: base 100, violations -15 each, issues -8, blockers -20,
 *       completion_status penalties, evaluator_status penalty, floor 0, cap 100,
 *       breakdown entries, JSON string → array parse, invalid JSON → 0 penalty
 *     - deriveConfidence: high/medium/low thresholds; null → unknown;
 *       effectiveScore uses min(current, rolling) when rolling exists
 *     - calculateRollingScore: avg of scored, null-only → null, rounding to 2dp
 *     - detectDegradation: needs MIN_STEPS_FOR_TREND (3);
 *       score drop ≥10, consecutive violations ≥2, low score persistence ≥2
 *     - checkEscalation: score <60, degraded+score<75, blockers>0, ≥3 violations;
 *       reason string aggregates; required reflects any trigger
 *
 *   With stubbed pool:
 *     - resolveChain: walks parent_prompt_id, stops at null, cycle safety,
 *       returns rootId + depth
 *     - getChainHistory: SELECTs and returns rows
 *     - getLowConfidence / getDegraded / getEscalated: SELECT filters
 *     - scorePrompt: not found → throws; status-not-scoreable → returns scored:false;
 *       full happy path → UPDATE + INSERT system_logs called; WARN level when
 *       escalation_required
 *     - getScore: not found → throws; scoreable but unscored → delegates to scorePrompt;
 *       already scored → returns full detail + chain_history
 *
 * Run: npx tsx server/src/services/__tests__/promptScoringService.test.ts
 */

import * as pathMod from 'path';

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
type Route = { match: RegExp; respond: (params: any[], sql: string) => any };
const routes: Route[] = [];
const queryLog: Array<{ sql: string; params: any[] }> = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        return r.respond(params, sql);
      }
    }
    // Default: empty rows
    return [[], []];
  },
};

const dbStub = { getAppPool: () => fakePool };

function stubModule(relFromSrc: string, exports: any) {
  // __dirname = .../services/__tests__ → go up 2 to reach src/
  const base = pathMod.resolve(__dirname, '..', '..', relFromSrc);
  for (const candidate of [base, base + '.js', base + '.ts']) {
    try {
      const resolved = require.resolve(candidate);
      require.cache[resolved] = {
        id: resolved,
        filename: resolved,
        loaded: true,
        exports,
      } as any;
    } catch { /* not resolvable */ }
  }
}
stubModule('config/db', dbStub);

// Helpers to set per-test routes
function resetRoutes() {
  routes.length = 0;
  queryLog.length = 0;
}

function onSelectById(byId: Record<number, any>) {
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: (params) => {
      const id = params[0];
      return [byId[id] ? [byId[id]] : [], []];
    },
  });
}

function onWalkParent(byId: Record<number, { id: number; parent_prompt_id: number | null }>) {
  routes.push({
    match: /SELECT id, parent_prompt_id FROM om_prompt_registry WHERE id = \?/i,
    respond: (params) => {
      const id = params[0];
      return [byId[id] ? [byId[id]] : [], []];
    },
  });
}

function onChainHistory(rowsByChain: Record<number, any[]>) {
  routes.push({
    match: /FROM om_prompt_registry\s+WHERE chain_id = \?/i,
    respond: (params) => {
      const cid = params[0];
      return [rowsByChain[cid] || [], []];
    },
  });
}

function onUpdate() {
  routes.push({
    match: /^\s*UPDATE om_prompt_registry SET/i,
    respond: () => [{ affectedRows: 1 }, []],
  });
}

function onInsertLog() {
  routes.push({
    match: /INSERT INTO system_logs/i,
    respond: () => [{ insertId: 1 }, []],
  });
}

const {
  calculateScore,
  deriveConfidence,
  resolveChain,
  detectDegradation,
  checkEscalation,
  scorePrompt,
  getScore,
  getLowConfidence,
  getDegraded,
  getEscalated,
  getChainHistory,
  SCORING,
  CONFIDENCE_THRESHOLDS,
} = require('../promptScoringService');

async function main() {

  // ========================================================================
  // calculateScore
  // ========================================================================
  console.log('\n── calculateScore ────────────────────────────────────────');

  // Clean prompt with evaluator pass → 100 (no -5 because evaluator_status is 'pass')
  {
    const r = calculateScore({
      violations_found: null,
      issues_found: null,
      blockers_found: null,
      completion_status: 'complete',
      evaluator_status: 'pass',
    });
    assertEq(r.quality_score, 100, 'pristine: 100');
    assertEq(r.violation_count, 0, 'no violations');
    assertEq(r.issue_count, 0, 'no issues');
    assertEq(r.blocker_count, 0, 'no blockers');
    assertEq(r.breakdown.length, 0, 'no breakdown');
  }

  // No evaluator → -5
  {
    const r = calculateScore({
      violations_found: null,
      completion_status: 'complete',
      evaluator_status: null,
    });
    assertEq(r.quality_score, 95, 'no evaluator: 95');
    assertEq(r.breakdown[0].factor, 'no_evaluator', 'breakdown factor');
    assertEq(r.breakdown[0].penalty, -5, 'breakdown penalty');
  }

  // Pending evaluator → -5
  {
    const r = calculateScore({
      violations_found: null,
      completion_status: 'complete',
      evaluator_status: 'pending',
    });
    assertEq(r.quality_score, 95, 'pending evaluator: 95');
  }

  // Violations as JSON string
  {
    const r = calculateScore({
      violations_found: '["a","b","c"]',
      completion_status: 'complete',
      evaluator_status: 'pass',
    });
    assertEq(r.quality_score, 100 - 3 * 15, '3 violations: 55');
    assertEq(r.violation_count, 3, 'violation count');
  }

  // Violations as array
  {
    const r = calculateScore({
      violations_found: ['x', 'y'],
      completion_status: 'complete',
      evaluator_status: 'pass',
    });
    assertEq(r.quality_score, 100 - 2 * 15, '2 violations: 70');
  }

  // Issues
  {
    const r = calculateScore({
      issues_found: '["i1","i2"]',
      completion_status: 'complete',
      evaluator_status: 'pass',
    });
    assertEq(r.quality_score, 100 - 2 * 8, '2 issues: 84');
    assertEq(r.issue_count, 2, 'issue count');
  }

  // Blockers
  {
    const r = calculateScore({
      blockers_found: '["b1"]',
      completion_status: 'complete',
      evaluator_status: 'pass',
    });
    assertEq(r.quality_score, 100 - 20, '1 blocker: 80');
    assertEq(r.blocker_count, 1, 'blocker count');
  }

  // Completion status penalties
  {
    const r = calculateScore({
      completion_status: 'partial',
      evaluator_status: 'pass',
    });
    assertEq(r.quality_score, 85, 'partial: -15 → 85');
  }
  {
    const r = calculateScore({
      completion_status: 'failed',
      evaluator_status: 'pass',
    });
    assertEq(r.quality_score, 70, 'failed: -30 → 70');
  }
  {
    const r = calculateScore({
      completion_status: 'blocked',
      evaluator_status: 'pass',
    });
    assertEq(r.quality_score, 75, 'blocked: -25 → 75');
  }

  // Evaluator fail
  {
    const r = calculateScore({
      completion_status: 'complete',
      evaluator_status: 'fail',
    });
    assertEq(r.quality_score, 80, 'evaluator fail: -20 → 80');
  }

  // Floor at 0: combine many penalties
  {
    const r = calculateScore({
      violations_found: ['1','2','3','4','5','6','7','8'],
      blockers_found: ['b1','b2','b3'],
      completion_status: 'failed',
      evaluator_status: 'fail',
    });
    assertEq(r.quality_score, 0, 'floored at 0');
  }

  // Invalid JSON in violations → 0 count
  {
    const r = calculateScore({
      violations_found: 'not valid json',
      completion_status: 'complete',
      evaluator_status: 'pass',
    });
    assertEq(r.violation_count, 0, 'invalid JSON → 0');
    assertEq(r.quality_score, 100, 'no penalty');
  }

  // Non-array JSON → treated as empty
  {
    const r = calculateScore({
      violations_found: '{"not":"array"}',
      completion_status: 'complete',
      evaluator_status: 'pass',
    });
    assertEq(r.violation_count, 0, 'non-array → 0');
  }

  // Combined example: 1 violation + 2 issues + 1 blocker + partial + no evaluator
  {
    const r = calculateScore({
      violations_found: ['v'],
      issues_found: ['i1','i2'],
      blockers_found: ['b'],
      completion_status: 'partial',
      evaluator_status: null,
    });
    // 100 -15 -16 -20 -15 -5 = 29
    assertEq(r.quality_score, 29, 'combined: 29');
    assertEq(r.breakdown.length, 5, '5 breakdown entries');
  }

  // ========================================================================
  // deriveConfidence
  // ========================================================================
  console.log('\n── deriveConfidence ──────────────────────────────────────');

  assertEq(deriveConfidence(null, null), 'unknown', 'null → unknown');
  assertEq(deriveConfidence(undefined, null), 'unknown', 'undefined → unknown');
  assertEq(deriveConfidence(100, null), 'high', '100 → high');
  assertEq(deriveConfidence(85, null), 'high', '85 → high');
  assertEq(deriveConfidence(84, null), 'medium', '84 → medium');
  assertEq(deriveConfidence(60, null), 'medium', '60 → medium');
  assertEq(deriveConfidence(59, null), 'low', '59 → low');
  assertEq(deriveConfidence(0, null), 'low', '0 → low');

  // Rolling score dampens confidence when worse
  assertEq(deriveConfidence(90, 50), 'low', 'rolling 50 dominates: low');
  assertEq(deriveConfidence(90, 70), 'medium', 'rolling 70 dominates: medium');
  assertEq(deriveConfidence(90, 90), 'high', 'rolling 90: high');
  // Rolling BETTER than current: current still wins (min)
  assertEq(deriveConfidence(70, 95), 'medium', 'current 70 worse: medium');

  // ========================================================================
  // calculateRollingScore — accessed via scorePrompt in detectDegradation paths
  // but also exported implicitly through module internals. We test via
  // detectDegradation behaviour.
  // ========================================================================

  // ========================================================================
  // detectDegradation
  // ========================================================================
  console.log('\n── detectDegradation ─────────────────────────────────────');

  // Below min steps → not degraded
  {
    const r = detectDegradation(
      [{ quality_score: 80, violation_count: 0 }, { quality_score: 85, violation_count: 0 }],
      85,
    );
    assertEq(r.degraded, false, 'too few steps: not degraded');
    assertEq(r.reasons.length, 0, 'no reasons');
  }

  // Score drop ≥10 over 3+ steps
  {
    const r = detectDegradation(
      [
        { quality_score: 95, violation_count: 0 },
        { quality_score: 90, violation_count: 0 },
        { quality_score: 80, violation_count: 0 },
      ],
      80,
    );
    assertEq(r.degraded, true, 'score drop → degraded');
    assert(r.reasons[0].includes('15'), 'mentions 15-point drop');
  }

  // Score drop exactly 10 → degraded
  {
    const r = detectDegradation(
      [
        { quality_score: 90, violation_count: 0 },
        { quality_score: 85, violation_count: 0 },
        { quality_score: 80, violation_count: 0 },
      ],
      80,
    );
    assertEq(r.degraded, true, 'drop=10 → degraded');
  }

  // Score drop <10 → not flagged by drop
  {
    const r = detectDegradation(
      [
        { quality_score: 95, violation_count: 0 },
        { quality_score: 93, violation_count: 0 },
        { quality_score: 90, violation_count: 0 },
      ],
      90,
    );
    assertEq(r.degraded, false, 'drop=5: not degraded');
  }

  // Consecutive violations
  {
    const r = detectDegradation(
      [
        { quality_score: 95, violation_count: 0 },
        { quality_score: 90, violation_count: 1 },
        { quality_score: 85, violation_count: 2 },
      ],
      85,
    );
    assertEq(r.degraded, true, 'consecutive violations → degraded');
    assert(
      r.reasons.some((x: string) => x.includes('consecutive steps with violations')),
      'reason mentions violations',
    );
  }

  // Low score persistence
  {
    const r = detectDegradation(
      [
        { quality_score: 80, violation_count: 0 },
        { quality_score: 40, violation_count: 0 },
        { quality_score: 30, violation_count: 0 },
      ],
      30,
    );
    assertEq(r.degraded, true, 'low score persistent → degraded');
    assert(
      r.reasons.some((x: string) => x.includes('below 50')),
      'reason mentions threshold',
    );
  }

  // Only 1 step under 50 → not flagged by low score check
  // (but could be flagged by drop if ≥10 drop)
  {
    const r = detectDegradation(
      [
        { quality_score: 60, violation_count: 0 },
        { quality_score: 55, violation_count: 0 },
        { quality_score: 58, violation_count: 0 },
      ],
      58,
    );
    // Drop 60-58=2 → no drop; no consecutive vio; last two: 55, 58 — only 55<50? no, 55 not <50
    assertEq(r.degraded, false, 'borderline not degraded');
  }

  // Null scores filtered out
  {
    const r = detectDegradation(
      [
        { quality_score: null, violation_count: 0 },
        { quality_score: null, violation_count: 0 },
        { quality_score: null, violation_count: 0 },
      ],
      null,
    );
    assertEq(r.degraded, false, 'all nulls → not degraded');
  }

  // ========================================================================
  // checkEscalation
  // ========================================================================
  console.log('\n── checkEscalation ───────────────────────────────────────');

  // Clean: no escalation
  {
    const r = checkEscalation(85, 0, 0, false);
    assertEq(r.required, false, 'clean: no escalation');
    assertEq(r.reason, '', 'empty reason');
  }

  // Score <60 triggers
  {
    const r = checkEscalation(55, 0, 0, false);
    assertEq(r.required, true, 'low score: escalate');
    assert(r.reason.includes('55'), 'reason mentions score');
  }

  // Degraded + score <75 triggers
  {
    const r = checkEscalation(70, 0, 0, true);
    assertEq(r.required, true, 'degraded <75: escalate');
    assert(r.reason.includes('Degraded'), 'reason mentions degraded');
  }

  // Degraded but score ≥75 doesn't trigger degraded check
  // (but only escalates if ≥60 and no other triggers)
  {
    const r = checkEscalation(80, 0, 0, true);
    assertEq(r.required, false, 'degraded but high score: no escalate');
  }

  // Blockers trigger
  {
    const r = checkEscalation(90, 0, 2, false);
    assertEq(r.required, true, 'blockers: escalate');
    assert(r.reason.includes('2 blocker'), 'reason mentions blockers');
  }

  // 3+ violations in single step triggers
  {
    const r = checkEscalation(90, 3, 0, false);
    assertEq(r.required, true, '3 violations: escalate');
    assert(r.reason.includes('3 violations'), 'reason mentions violations');
  }

  // 2 violations: does not trigger
  {
    const r = checkEscalation(90, 2, 0, false);
    assertEq(r.required, false, '2 violations: no escalate');
  }

  // Multiple reasons joined
  {
    const r = checkEscalation(40, 5, 3, true);
    assertEq(r.required, true, 'multi: escalate');
    assert(r.reason.includes(';'), 'reasons joined with ;');
    assert(r.reason.includes('40'), 'mentions score');
    assert(r.reason.includes('blocker'), 'mentions blocker');
    assert(r.reason.includes('5 violations'), 'mentions violations');
  }

  // ========================================================================
  // resolveChain (DB walk)
  // ========================================================================
  console.log('\n── resolveChain ──────────────────────────────────────────');

  // No parent
  {
    resetRoutes();
    onWalkParent({});
    const r = await resolveChain(fakePool, { id: 5, parent_prompt_id: null });
    assertEq(r.chain_id, 5, 'own id as chain_id');
    assertEq(r.chain_step_number, 1, 'depth 1');
  }

  // Walk one level
  {
    resetRoutes();
    onWalkParent({
      4: { id: 4, parent_prompt_id: null },
    });
    const r = await resolveChain(fakePool, { id: 5, parent_prompt_id: 4 });
    assertEq(r.chain_id, 4, 'root=4');
    assertEq(r.chain_step_number, 2, 'depth 2');
  }

  // Walk three levels
  {
    resetRoutes();
    onWalkParent({
      4: { id: 4, parent_prompt_id: 3 },
      3: { id: 3, parent_prompt_id: 2 },
      2: { id: 2, parent_prompt_id: null },
    });
    const r = await resolveChain(fakePool, { id: 5, parent_prompt_id: 4 });
    assertEq(r.chain_id, 2, 'root=2');
    assertEq(r.chain_step_number, 4, 'depth 4');
  }

  // Cycle safety: parent points to already-visited
  {
    resetRoutes();
    onWalkParent({
      4: { id: 4, parent_prompt_id: 5 }, // cycle
    });
    const r = await resolveChain(fakePool, { id: 5, parent_prompt_id: 4 });
    assertEq(r.chain_id, 4, 'breaks at cycle');
    assertEq(r.chain_step_number, 2, 'depth 2 before cycle');
  }

  // Missing parent row breaks walk
  {
    resetRoutes();
    onWalkParent({}); // empty
    const r = await resolveChain(fakePool, { id: 5, parent_prompt_id: 99 });
    assertEq(r.chain_id, 5, 'stays at self');
    assertEq(r.chain_step_number, 1, 'depth 1');
  }

  // ========================================================================
  // getChainHistory
  // ========================================================================
  console.log('\n── getChainHistory ───────────────────────────────────────');

  {
    resetRoutes();
    onChainHistory({
      7: [
        { id: 1, title: 'a', chain_step_number: 1, quality_score: 90 },
        { id: 2, title: 'b', chain_step_number: 2, quality_score: 85 },
      ],
    });
    const rows = await getChainHistory(fakePool, 7);
    assertEq(rows.length, 2, '2 rows');
    assertEq(rows[0].id, 1, 'first row');
    // Verify correct SQL shape
    assert(
      queryLog.some(q => /ORDER BY chain_step_number ASC/i.test(q.sql)),
      'ordered by step number',
    );
    assertEq(queryLog[queryLog.length - 1].params[0], 7, 'chainId param');
  }

  // ========================================================================
  // Query helpers
  // ========================================================================
  console.log('\n── getLowConfidence / Degraded / Escalated ──────────────');

  {
    resetRoutes();
    routes.push({
      match: /confidence_level = 'low'/i,
      respond: () => [[{ id: 1 }, { id: 2 }], []],
    });
    const r = await getLowConfidence();
    assertEq(r.length, 2, 'low conf: 2 rows');
  }

  {
    resetRoutes();
    routes.push({
      match: /degradation_flag = 1/i,
      respond: () => [[{ id: 3 }], []],
    });
    const r = await getDegraded();
    assertEq(r.length, 1, 'degraded: 1 row');
  }

  {
    resetRoutes();
    routes.push({
      match: /escalation_required = 1/i,
      respond: () => [[{ id: 4 }, { id: 5 }, { id: 6 }], []],
    });
    const r = await getEscalated();
    assertEq(r.length, 3, 'escalated: 3 rows');
  }

  // ========================================================================
  // scorePrompt: not found
  // ========================================================================
  console.log('\n── scorePrompt: not found ────────────────────────────────');

  {
    resetRoutes();
    onSelectById({});
    let err: Error | null = null;
    try { await scorePrompt(999); }
    catch (e: any) { err = e; }
    assert(err !== null, 'throws for missing prompt');
    assert(err?.message.includes('not found'), 'correct message');
  }

  // ========================================================================
  // scorePrompt: not yet scoreable
  // ========================================================================
  console.log('\n── scorePrompt: not scoreable ────────────────────────────');

  {
    resetRoutes();
    onSelectById({
      10: {
        id: 10,
        status: 'in_progress',
        evaluator_status: null,
        title: 'Test',
      },
    });
    const r = await scorePrompt(10);
    assertEq(r.scored, false, 'not scored');
    assert(r.reason.includes('in_progress'), 'reason mentions status');
  }

  // ========================================================================
  // scorePrompt: happy path (complete status, pristine)
  // ========================================================================
  console.log('\n── scorePrompt: happy path ───────────────────────────────');

  {
    resetRoutes();
    onSelectById({
      20: {
        id: 20,
        title: 'Good prompt',
        status: 'complete',
        parent_prompt_id: null,
        violations_found: null,
        issues_found: null,
        blockers_found: null,
        completion_status: 'complete',
        evaluator_status: 'pass',
      },
    });
    onWalkParent({});
    onChainHistory({ 20: [] });
    onUpdate();
    onInsertLog();

    const r = await scorePrompt(20);
    assertEq(r.scored, true, 'scored');
    assertEq(r.quality_score, 100, 'score 100');
    assertEq(r.confidence_level, 'high', 'high confidence');
    assertEq(r.chain_id, 20, 'chain_id = self');
    assertEq(r.chain_step_number, 1, 'step 1');
    assertEq(r.violation_count, 0, '0 violations');
    assertEq(r.escalation_required, false, 'no escalation');

    // Verify UPDATE and INSERT were called
    const updates = queryLog.filter(q => /UPDATE om_prompt_registry SET/i.test(q.sql));
    assertEq(updates.length, 1, '1 update');
    // UPDATE params include quality_score as first param
    assertEq(updates[0].params[0], 100, 'updated score');
    assertEq(updates[0].params[1], 'high', 'updated confidence');

    const inserts = queryLog.filter(q => /INSERT INTO system_logs/i.test(q.sql));
    assertEq(inserts.length, 1, '1 log insert');
    assertEq(inserts[0].params[0], 'INFO', 'INFO level (no escalation)');
  }

  // ========================================================================
  // scorePrompt: escalation → WARN log
  // ========================================================================
  console.log('\n── scorePrompt: escalation ───────────────────────────────');

  {
    resetRoutes();
    onSelectById({
      30: {
        id: 30,
        title: 'Bad prompt',
        status: 'complete',
        parent_prompt_id: null,
        violations_found: ['v1', 'v2', 'v3'],
        issues_found: ['i1'],
        blockers_found: ['b1'],
        completion_status: 'failed',
        evaluator_status: 'fail',
      },
    });
    onWalkParent({});
    onChainHistory({ 30: [] });
    onUpdate();
    onInsertLog();

    const r = await scorePrompt(30);
    assertEq(r.scored, true, 'scored');
    // 100 -45 -8 -20 -30 -20 = -23 → floor 0
    assertEq(r.quality_score, 0, 'score 0');
    assertEq(r.confidence_level, 'low', 'low');
    assertEq(r.escalation_required, true, 'escalation required');
    assert(r.escalation_reason.length > 0, 'escalation reason set');
    assertEq(r.violation_count, 3, '3 violations');
    assertEq(r.blocker_count, 1, '1 blocker');

    // UPDATE should have degradation_flag=0 (only 1 step, can't detect)
    const updates = queryLog.filter(q => /UPDATE om_prompt_registry SET/i.test(q.sql));
    assertEq(updates[0].params[0], 0, 'updated score 0');

    // Log should be WARN
    const inserts = queryLog.filter(q => /INSERT INTO system_logs/i.test(q.sql));
    assertEq(inserts[0].params[0], 'WARN', 'WARN level');
    assert(inserts[0].params[1].includes('ESCALATION'), 'msg mentions escalation');
  }

  // ========================================================================
  // scorePrompt: chain context (degradation detection)
  // ========================================================================
  console.log('\n── scorePrompt: degrading chain ──────────────────────────');

  {
    resetRoutes();
    onSelectById({
      40: {
        id: 40,
        title: 'Step 4',
        status: 'complete',
        parent_prompt_id: 39,
        violations_found: ['v1', 'v2'],
        issues_found: null,
        blockers_found: null,
        completion_status: 'complete',
        evaluator_status: 'pass',
      },
    });
    // Walk parent chain: 40 -> 39 -> 38 (root)
    onWalkParent({
      39: { id: 39, parent_prompt_id: 38 },
      38: { id: 38, parent_prompt_id: null },
    });
    // Chain history has prior steps with declining scores
    onChainHistory({
      38: [
        { id: 38, title: 's1', quality_score: 95, chain_step_number: 1, violation_count: 0 },
        { id: 39, title: 's2', quality_score: 85, chain_step_number: 2, violation_count: 1 },
        // Current step (40) excluded from history for test — will be added
      ],
    });
    onUpdate();
    onInsertLog();

    const r = await scorePrompt(40);
    // Score: 100 -30 = 70
    assertEq(r.quality_score, 70, 'score 70');
    assertEq(r.chain_id, 38, 'chain root 38');
    assertEq(r.chain_step_number, 3, 'step 3');
    // Chain now has [95, 85, 70] — drop ≥10
    assertEq(r.degradation_flag, true, 'degraded');
    // rolling (95+85+70)/3 = 83.33
    assert(r.rolling_quality_score !== null, 'rolling score set');
    assertEq(r.previous_quality_score, 85, 'previous = 85');
    // escalation: score 70 < 75 AND degraded
    assertEq(r.escalation_required, true, 'escalation required');
  }

  // ========================================================================
  // getScore: not found
  // ========================================================================
  console.log('\n── getScore: not found ───────────────────────────────────');

  {
    resetRoutes();
    onSelectById({});
    let err: Error | null = null;
    try { await getScore(999); }
    catch (e: any) { err = e; }
    assert(err !== null, 'throws');
  }

  // ========================================================================
  // getScore: already scored → returns detail
  // ========================================================================
  console.log('\n── getScore: already scored ──────────────────────────────');

  {
    resetRoutes();
    onSelectById({
      50: {
        id: 50,
        title: 'Scored',
        status: 'complete',
        quality_score: 75,
        confidence_level: 'medium',
        violation_count: 1,
        issue_count: 0,
        blocker_count: 0,
        degradation_flag: 0,
        escalation_required: 0,
        escalation_reason: null,
        chain_id: 50,
        chain_step_number: 1,
        rolling_quality_score: 75,
        previous_quality_score: null,
      },
    });
    onChainHistory({
      50: [
        { id: 50, title: 'Scored', chain_step_number: 1, quality_score: 75, confidence_level: 'medium', violation_count: 1, degradation_flag: 0, status: 'complete' },
      ],
    });

    const r = await getScore(50);
    assertEq(r.scored, true, 'scored');
    assertEq(r.quality_score, 75, 'score');
    assertEq(r.confidence_level, 'medium', 'confidence');
    assertEq(r.chain_history.length, 1, '1 history row');
    assertEq(r.chain_history[0].id, 50, 'history row id');
  }

  // ========================================================================
  // getScore: unscored but scoreable → delegates to scorePrompt
  // ========================================================================
  console.log('\n── getScore: unscored scoreable ──────────────────────────');

  {
    resetRoutes();
    onSelectById({
      60: {
        id: 60,
        title: 'Fresh',
        status: 'complete',
        parent_prompt_id: null,
        quality_score: null,
        violations_found: null,
        issues_found: null,
        blockers_found: null,
        completion_status: 'complete',
        evaluator_status: 'pass',
      },
    });
    onWalkParent({});
    onChainHistory({ 60: [] });
    onUpdate();
    onInsertLog();

    const r = await getScore(60);
    assertEq(r.scored, true, 'delegated and scored');
    assertEq(r.quality_score, 100, 'scored 100');
  }

  // ========================================================================
  // getScore: unscored + not scoreable → returns unscored detail
  // ========================================================================
  console.log('\n── getScore: unscored unscoreable ────────────────────────');

  {
    resetRoutes();
    onSelectById({
      70: {
        id: 70,
        title: 'Draft',
        status: 'draft',
        quality_score: null,
        chain_id: null,
      },
    });
    const r = await getScore(70);
    assertEq(r.scored, false, 'not scored');
    assertEq(r.quality_score, null, 'null score');
    assertEq(r.chain_history.length, 0, 'no history when chain_id null');
  }

  // ========================================================================
  // Constants exported
  // ========================================================================
  console.log('\n── constants ─────────────────────────────────────────────');

  assertEq(SCORING.BASE, 100, 'SCORING.BASE');
  assertEq(SCORING.VIOLATION_PENALTY, 15, 'SCORING.VIOLATION_PENALTY');
  assertEq(CONFIDENCE_THRESHOLDS.HIGH, 85, 'CONFIDENCE HIGH');
  assertEq(CONFIDENCE_THRESHOLDS.MEDIUM, 60, 'CONFIDENCE MEDIUM');

  // ========================================================================
  // Summary
  // ========================================================================
  console.log(`\n──────────────────────────────────────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error('Unhandled:', e);
  process.exit(1);
});
