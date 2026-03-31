/**
 * Prompt Scoring Service
 *
 * Deterministic quality scoring, confidence tracking, chain management,
 * degradation detection, and escalation routing.
 *
 * Scoring Formula (deterministic — same input always produces same score):
 *   Start at 100, subtract:
 *     - Each violation:  -15 points
 *     - Each issue:      -8 points
 *     - Each blocker:    -20 points
 *     - Partial completion: -15
 *     - Failed completion:  -30
 *     - Blocked completion: -25
 *     - Evaluator fail:     -20
 *     - No evaluator run:   -5 (unknown quality)
 *   Floor at 0, cap at 100.
 *
 * Confidence Levels (derived from score + trend):
 *   85–100 → high
 *   60–84  → medium
 *   0–59   → low
 *   null   → unknown (not yet scored)
 *
 * Degradation Detection:
 *   Flag set when rolling_quality_score drops by ≥10 points over 3+ steps,
 *   OR when 2+ consecutive steps have violations, OR quality < 50 for 2+ steps.
 *
 * Escalation Triggers:
 *   - quality_score < 60
 *   - degradation_flag = true AND quality_score < 75
 *   - blocker_count > 0
 *   - 3+ violations in a single step
 */

const { getAppPool } = require('../config/db');

// ─── Constants ─────────────────────────────────────────────────────────────

const SCORING = {
  BASE: 100,
  VIOLATION_PENALTY: 15,
  ISSUE_PENALTY: 8,
  BLOCKER_PENALTY: 20,
  PARTIAL_COMPLETION_PENALTY: 15,
  FAILED_COMPLETION_PENALTY: 30,
  BLOCKED_COMPLETION_PENALTY: 25,
  EVALUATOR_FAIL_PENALTY: 20,
  NO_EVALUATOR_PENALTY: 5,
};

const CONFIDENCE_THRESHOLDS = {
  HIGH: 85,
  MEDIUM: 60,
};

const DEGRADATION = {
  SCORE_DROP_THRESHOLD: 10,    // points of decline to trigger
  MIN_STEPS_FOR_TREND: 3,     // minimum chain steps to detect trend
  CONSECUTIVE_VIOLATIONS: 2,  // consecutive steps with violations
  LOW_SCORE_THRESHOLD: 50,    // score below this for 2+ steps = degraded
  LOW_SCORE_STEPS: 2,
};

const ESCALATION = {
  SCORE_THRESHOLD: 60,              // auto-escalate below this
  DEGRADED_SCORE_THRESHOLD: 75,     // escalate if degraded AND below this
  MAX_VIOLATIONS_SINGLE_STEP: 3,    // escalate if this many violations in one step
};

// ─── Scoring Engine ────────────────────────────────────────────────────────

/**
 * Calculate quality_score for a prompt. Deterministic: same input → same output.
 * Returns { quality_score, violation_count, issue_count, blocker_count, breakdown }
 */
function calculateScore(prompt) {
  let score = SCORING.BASE;
  const breakdown = [];

  // Count violations
  const violations = parseJsonArray(prompt.violations_found);
  const violationCount = violations.length;
  if (violationCount > 0) {
    const penalty = violationCount * SCORING.VIOLATION_PENALTY;
    score -= penalty;
    breakdown.push({ factor: 'violations', count: violationCount, penalty: -penalty });
  }

  // Count issues
  const issues = parseJsonArray(prompt.issues_found);
  const issueCount = issues.length;
  if (issueCount > 0) {
    const penalty = issueCount * SCORING.ISSUE_PENALTY;
    score -= penalty;
    breakdown.push({ factor: 'issues', count: issueCount, penalty: -penalty });
  }

  // Count blockers
  const blockers = parseJsonArray(prompt.blockers_found);
  const blockerCount = blockers.length;
  if (blockerCount > 0) {
    const penalty = blockerCount * SCORING.BLOCKER_PENALTY;
    score -= penalty;
    breakdown.push({ factor: 'blockers', count: blockerCount, penalty: -penalty });
  }

  // Completion status
  if (prompt.completion_status === 'partial') {
    score -= SCORING.PARTIAL_COMPLETION_PENALTY;
    breakdown.push({ factor: 'partial_completion', penalty: -SCORING.PARTIAL_COMPLETION_PENALTY });
  } else if (prompt.completion_status === 'failed') {
    score -= SCORING.FAILED_COMPLETION_PENALTY;
    breakdown.push({ factor: 'failed_completion', penalty: -SCORING.FAILED_COMPLETION_PENALTY });
  } else if (prompt.completion_status === 'blocked') {
    score -= SCORING.BLOCKED_COMPLETION_PENALTY;
    breakdown.push({ factor: 'blocked_completion', penalty: -SCORING.BLOCKED_COMPLETION_PENALTY });
  }

  // Evaluator status
  if (prompt.evaluator_status === 'fail') {
    score -= SCORING.EVALUATOR_FAIL_PENALTY;
    breakdown.push({ factor: 'evaluator_fail', penalty: -SCORING.EVALUATOR_FAIL_PENALTY });
  } else if (!prompt.evaluator_status || prompt.evaluator_status === 'pending') {
    score -= SCORING.NO_EVALUATOR_PENALTY;
    breakdown.push({ factor: 'no_evaluator', penalty: -SCORING.NO_EVALUATOR_PENALTY });
  }

  // Floor and cap
  score = Math.max(0, Math.min(100, score));

  return {
    quality_score: score,
    violation_count: violationCount,
    issue_count: issueCount,
    blocker_count: blockerCount,
    breakdown,
  };
}

// ─── Confidence Level ──────────────────────────────────────────────────────

/**
 * Derive confidence_level from quality_score and chain context.
 */
function deriveConfidence(qualityScore, rollingScore) {
  if (qualityScore === null || qualityScore === undefined) return 'unknown';

  // Use the worse of current and rolling score if rolling exists
  const effectiveScore = (rollingScore !== null && rollingScore !== undefined)
    ? Math.min(qualityScore, rollingScore)
    : qualityScore;

  if (effectiveScore >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
  if (effectiveScore >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

// ─── Chain Tracking ────────────────────────────────────────────────────────

/**
 * Resolve chain_id and chain_step_number for a prompt.
 * chain_id = root parent's ID (the prompt that started the chain).
 * chain_step_number = depth from root (1-based).
 */
async function resolveChain(pool, prompt) {
  // Walk up parent chain to find root
  let rootId = prompt.id;
  let depth = 1;
  let currentId = prompt.parent_prompt_id;
  const visited = new Set([prompt.id]);

  while (currentId && depth < 50) {
    if (visited.has(currentId)) break; // safety
    visited.add(currentId);

    const [rows] = await pool.query(
      'SELECT id, parent_prompt_id FROM om_prompt_registry WHERE id = ?',
      [currentId]
    );
    if (rows.length === 0) break;

    rootId = rows[0].id;
    depth++;
    currentId = rows[0].parent_prompt_id;
  }

  return { chain_id: rootId, chain_step_number: depth };
}

/**
 * Get all prompts in a chain ordered by step number.
 */
async function getChainHistory(pool, chainId) {
  const [rows] = await pool.query(
    `SELECT id, title, sequence_order, chain_step_number, quality_score,
            confidence_level, violation_count, issue_count, blocker_count,
            degradation_flag, escalation_required, rolling_quality_score,
            status, evaluator_status, completion_status
     FROM om_prompt_registry
     WHERE chain_id = ?
     ORDER BY chain_step_number ASC, sequence_order ASC`,
    [chainId]
  );
  return rows;
}

/**
 * Calculate rolling quality score (moving average over chain).
 */
function calculateRollingScore(chainHistory) {
  const scored = chainHistory.filter(s => s.quality_score !== null);
  if (scored.length === 0) return null;
  const sum = scored.reduce((acc, s) => acc + s.quality_score, 0);
  return Math.round((sum / scored.length) * 100) / 100;
}

// ─── Degradation Detection ─────────────────────────────────────────────────

/**
 * Detect degradation in a chain. Returns { degraded, reasons }.
 * Requires measurable change, not single failure.
 */
function detectDegradation(chainHistory, currentScore) {
  const scored = chainHistory.filter(s => s.quality_score !== null);
  const reasons = [];

  // Need minimum steps for trend analysis
  if (scored.length < DEGRADATION.MIN_STEPS_FOR_TREND) {
    return { degraded: false, reasons: [] };
  }

  // Check 1: Rolling score declining by threshold
  const recentScores = scored.slice(-DEGRADATION.MIN_STEPS_FOR_TREND).map(s => s.quality_score);
  if (recentScores.length >= DEGRADATION.MIN_STEPS_FOR_TREND) {
    const first = recentScores[0];
    const last = recentScores[recentScores.length - 1];
    if (first - last >= DEGRADATION.SCORE_DROP_THRESHOLD) {
      reasons.push(`Quality declined ${first - last} points over last ${recentScores.length} steps (${first} → ${last})`);
    }
  }

  // Check 2: Consecutive steps with violations
  const recentViolations = scored.slice(-DEGRADATION.CONSECUTIVE_VIOLATIONS - 1);
  const consecutiveWithViolations = recentViolations.filter(s => s.violation_count > 0);
  if (consecutiveWithViolations.length >= DEGRADATION.CONSECUTIVE_VIOLATIONS) {
    reasons.push(`${consecutiveWithViolations.length} consecutive steps with violations`);
  }

  // Check 3: Low score persisting
  const recentLow = scored.slice(-DEGRADATION.LOW_SCORE_STEPS);
  const lowScoreSteps = recentLow.filter(s => s.quality_score < DEGRADATION.LOW_SCORE_THRESHOLD);
  if (lowScoreSteps.length >= DEGRADATION.LOW_SCORE_STEPS) {
    reasons.push(`${lowScoreSteps.length} consecutive steps below ${DEGRADATION.LOW_SCORE_THRESHOLD}`);
  }

  return { degraded: reasons.length > 0, reasons };
}

// ─── Escalation System ─────────────────────────────────────────────────────

/**
 * Determine if escalation is required. Returns { required, reason }.
 */
function checkEscalation(score, violationCount, blockerCount, degraded) {
  const reasons = [];

  if (score < ESCALATION.SCORE_THRESHOLD) {
    reasons.push(`Quality score ${score} below threshold (${ESCALATION.SCORE_THRESHOLD})`);
  }

  if (degraded && score < ESCALATION.DEGRADED_SCORE_THRESHOLD) {
    reasons.push(`Degraded chain with score ${score} below ${ESCALATION.DEGRADED_SCORE_THRESHOLD}`);
  }

  if (blockerCount > 0) {
    reasons.push(`${blockerCount} blocker(s) found`);
  }

  if (violationCount >= ESCALATION.MAX_VIOLATIONS_SINGLE_STEP) {
    reasons.push(`${violationCount} violations in single step (threshold: ${ESCALATION.MAX_VIOLATIONS_SINGLE_STEP})`);
  }

  return {
    required: reasons.length > 0,
    reason: reasons.join('; '),
  };
}

// ─── Main: Score a Prompt ──────────────────────────────────────────────────

/**
 * Score a prompt: calculate quality, resolve chain, detect degradation, check escalation.
 * Persists all computed fields. Idempotent — safe to call multiple times.
 */
async function scorePrompt(promptId) {
  const pool = getAppPool();
  const [rows] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [promptId]);
  if (rows.length === 0) throw new Error(`Prompt not found: ${promptId}`);

  const prompt = rows[0];

  // Only score prompts that have been through execution (complete+ or evaluated)
  if (!['complete', 'verified'].includes(prompt.status) && !prompt.evaluator_status) {
    return {
      prompt_id: promptId,
      scored: false,
      reason: `Prompt status "${prompt.status}" — not yet scoreable`,
    };
  }

  // 1. Calculate score
  const scoreResult = calculateScore(prompt);

  // 2. Resolve chain
  const chain = await resolveChain(pool, prompt);

  // 3. Get chain history (before updating current)
  const chainHistory = await getChainHistory(pool, chain.chain_id);

  // 4. Calculate rolling score (include current)
  const historyWithCurrent = [
    ...chainHistory.filter(h => h.id !== promptId),
    { ...prompt, quality_score: scoreResult.quality_score, violation_count: scoreResult.violation_count },
  ];
  const rollingScore = calculateRollingScore(historyWithCurrent);

  // 5. Get previous step's score
  const previousStep = chainHistory
    .filter(h => h.id !== promptId && h.quality_score !== null)
    .pop();
  const previousScore = previousStep ? previousStep.quality_score : null;

  // 6. Detect degradation
  const degradation = detectDegradation(historyWithCurrent, scoreResult.quality_score);

  // 7. Check escalation
  const escalation = checkEscalation(
    scoreResult.quality_score,
    scoreResult.violation_count,
    scoreResult.blocker_count,
    degradation.degraded
  );

  // 8. Derive confidence
  const confidence = deriveConfidence(scoreResult.quality_score, rollingScore);

  // 9. Persist
  await pool.query(
    `UPDATE om_prompt_registry SET
       quality_score = ?, confidence_level = ?,
       violation_count = ?, issue_count = ?, blocker_count = ?,
       degradation_flag = ?, escalation_required = ?, escalation_reason = ?,
       chain_id = ?, chain_step_number = ?,
       rolling_quality_score = ?, previous_quality_score = ?
     WHERE id = ?`,
    [
      scoreResult.quality_score, confidence,
      scoreResult.violation_count, scoreResult.issue_count, scoreResult.blocker_count,
      degradation.degraded ? 1 : 0,
      escalation.required ? 1 : 0,
      escalation.required ? escalation.reason : null,
      chain.chain_id, chain.chain_step_number,
      rollingScore, previousScore,
      promptId,
    ]
  );

  // 10. Log
  await pool.query(
    `INSERT INTO system_logs
       (timestamp, level, source, message, meta, user_email, service, source_component)
     VALUES (NOW(), ?, 'prompt_scoring', ?, ?, 'system', 'omai', 'prompt_registry')`,
    [
      escalation.required ? 'WARN' : 'INFO',
      `Scored prompt "${prompt.title}": ${scoreResult.quality_score}/100 (${confidence})${escalation.required ? ' — ESCALATION REQUIRED' : ''}`,
      JSON.stringify({
        prompt_id: promptId,
        quality_score: scoreResult.quality_score,
        confidence,
        violation_count: scoreResult.violation_count,
        degradation: degradation.degraded,
        escalation: escalation.required,
        chain_id: chain.chain_id,
        chain_step: chain.chain_step_number,
      }),
    ]
  );

  return {
    prompt_id: promptId,
    scored: true,
    quality_score: scoreResult.quality_score,
    confidence_level: confidence,
    violation_count: scoreResult.violation_count,
    issue_count: scoreResult.issue_count,
    blocker_count: scoreResult.blocker_count,
    breakdown: scoreResult.breakdown,
    chain_id: chain.chain_id,
    chain_step_number: chain.chain_step_number,
    rolling_quality_score: rollingScore,
    previous_quality_score: previousScore,
    degradation_flag: degradation.degraded,
    degradation_reasons: degradation.reasons,
    escalation_required: escalation.required,
    escalation_reason: escalation.reason,
  };
}

// ─── Query Functions ───────────────────────────────────────────────────────

/**
 * Get full score details for a prompt, recalculating if stale.
 */
async function getScore(promptId) {
  const pool = getAppPool();
  const [rows] = await pool.query('SELECT * FROM om_prompt_registry WHERE id = ?', [promptId]);
  if (rows.length === 0) throw new Error(`Prompt not found: ${promptId}`);

  const prompt = rows[0];

  // If scoreable but not yet scored, score now
  if (prompt.quality_score === null && ['complete', 'verified'].includes(prompt.status)) {
    return scorePrompt(promptId);
  }

  // Get chain history for context
  const chainHistory = prompt.chain_id
    ? await getChainHistory(pool, prompt.chain_id)
    : [];

  return {
    prompt_id: promptId,
    title: prompt.title,
    status: prompt.status,
    scored: prompt.quality_score !== null,
    quality_score: prompt.quality_score,
    confidence_level: prompt.confidence_level,
    violation_count: prompt.violation_count,
    issue_count: prompt.issue_count,
    blocker_count: prompt.blocker_count,
    degradation_flag: !!prompt.degradation_flag,
    escalation_required: !!prompt.escalation_required,
    escalation_reason: prompt.escalation_reason,
    chain_id: prompt.chain_id,
    chain_step_number: prompt.chain_step_number,
    rolling_quality_score: prompt.rolling_quality_score,
    previous_quality_score: prompt.previous_quality_score,
    chain_history: chainHistory.map(h => ({
      id: h.id,
      title: h.title,
      step: h.chain_step_number,
      quality_score: h.quality_score,
      confidence_level: h.confidence_level,
      violation_count: h.violation_count,
      degradation_flag: !!h.degradation_flag,
      status: h.status,
    })),
  };
}

/**
 * Get prompts with low confidence (confidence_level = 'low').
 */
async function getLowConfidence() {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT * FROM om_prompt_registry
     WHERE confidence_level = 'low'
     ORDER BY quality_score ASC, FIELD(priority, 'critical','high','normal','low')`
  );
  return rows;
}

/**
 * Get degraded chains (prompts with degradation_flag = true).
 */
async function getDegraded() {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT * FROM om_prompt_registry
     WHERE degradation_flag = 1
     ORDER BY quality_score ASC, FIELD(priority, 'critical','high','normal','low')`
  );
  return rows;
}

/**
 * Get escalated prompts (escalation_required = true).
 */
async function getEscalated() {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT * FROM om_prompt_registry
     WHERE escalation_required = 1
     ORDER BY quality_score ASC, FIELD(priority, 'critical','high','normal','low')`
  );
  return rows;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseJsonArray(val) {
  if (!val) return [];
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Exports ───────────────────────────────────────────────────────────────

module.exports = {
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
  DEGRADATION,
  ESCALATION,
};
