/**
 * Decision Engine Service
 *
 * Deterministic action recommendation engine for the Workflow Execution Dashboard.
 * Consumes dashboard aggregation data + prompt state and produces prioritized,
 * actionable recommendations with zero ambiguity.
 *
 * DESIGN PRINCIPLES:
 *   1. Every recommendation is derived from explicit, documented rules
 *   2. One primary action per prompt — no conflicting recommendations
 *   3. Every action includes: what, why, clear condition, priority, blocking status
 *   4. Rules are non-overlapping — evaluated in strict priority order
 *   5. Same input always produces same output (deterministic)
 *
 * ACTION TYPES (in evaluation order — first match wins):
 *   FIX_REQUIRED            — escalated or evaluator failed; must fix before progress
 *   UNBLOCK_REQUIRED        — blocked by unmet dependency; must resolve predecessor
 *   INVESTIGATE_DEGRADATION — chain quality declining; needs human review
 *   RELEASE_NOW             — all constraints met, ready for immediate release
 *   REVIEW_REQUIRED         — low confidence or needs manual attention before release
 *   WAIT                    — not ready, no issues, on track
 *   NO_ACTION               — terminal state (verified/complete) or cancelled
 *
 * PRIORITIZATION (within same action type):
 *   1. Blocking critical path (part of active workflow)
 *   2. Escalation severity
 *   3. Overdue status
 *   4. Priority enum (critical > high > normal > low)
 *   5. Sequence order (earlier steps first)
 */

const { getAppPool } = require('../config/db');

// ─── Action Types ──────────────────────────────────────────────────────────

const ACTION = {
  RELEASE_NOW: 'RELEASE_NOW',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  FIX_REQUIRED: 'FIX_REQUIRED',
  UNBLOCK_REQUIRED: 'UNBLOCK_REQUIRED',
  INVESTIGATE_DEGRADATION: 'INVESTIGATE_DEGRADATION',
  WAIT: 'WAIT',
  NO_ACTION: 'NO_ACTION',
};

const ACTION_LABELS = {
  [ACTION.RELEASE_NOW]: 'Release Now',
  [ACTION.REVIEW_REQUIRED]: 'Review Required',
  [ACTION.FIX_REQUIRED]: 'Fix Required',
  [ACTION.UNBLOCK_REQUIRED]: 'Unblock Required',
  [ACTION.INVESTIGATE_DEGRADATION]: 'Investigate Degradation',
  [ACTION.WAIT]: 'Wait',
  [ACTION.NO_ACTION]: 'No Action',
};

// Strict priority ordering for action types (lower = more urgent)
const ACTION_SEVERITY = {
  [ACTION.FIX_REQUIRED]: 0,
  [ACTION.UNBLOCK_REQUIRED]: 1,
  [ACTION.INVESTIGATE_DEGRADATION]: 2,
  [ACTION.RELEASE_NOW]: 3,
  [ACTION.REVIEW_REQUIRED]: 4,
  [ACTION.WAIT]: 5,
  [ACTION.NO_ACTION]: 6,
};

const PRIORITY_WEIGHT = { critical: 0, high: 1, normal: 2, low: 3 };

// ─── Decision Rules ────────────────────────────────────────────────────────
//
// Rules are evaluated in strict order. First matching rule wins.
// Each rule is a pure function: (prompt) => action | null
//
// RULE TABLE:
// ┌────┬──────────────────────────────────┬────────────────────────────┬──────────┐
// │ #  │ Condition                        │ Action                     │ Priority │
// ├────┼──────────────────────────────────┼────────────────────────────┼──────────┤
// │ R1 │ status ∈ {verified,complete}     │ NO_ACTION                  │ —        │
// │ R2 │ escalation_required = true       │ FIX_REQUIRED               │ critical │
// │ R3 │ evaluator_status = fail          │ FIX_REQUIRED               │ high     │
// │ R4 │ queue_status = blocked           │ UNBLOCK_REQUIRED           │ high     │
// │ R5 │ degradation_flag = true          │ INVESTIGATE_DEGRADATION    │ medium   │
// │    │   AND NOT already escalated      │                            │          │
// │ R6 │ queue_status = ready_for_release │ RELEASE_NOW (if eligible)  │ medium   │
// │    │   AND confidence = high          │ or REVIEW_REQUIRED         │          │
// │    │   AND no escalation              │                            │          │
// │ R7 │ queue_status = overdue           │ RELEASE_NOW (overdue)      │ high     │
// │    │   AND eligible                   │                            │          │
// │ R8 │ queue_status = ready_for_release │ REVIEW_REQUIRED            │ medium   │
// │    │   AND (low confidence            │                            │          │
// │    │   OR degradation OR escalation)  │                            │          │
// │ R9 │ confidence = low                 │ REVIEW_REQUIRED            │ medium   │
// │    │   AND NOT blocked/escalated      │                            │          │
// │R10 │ status ∈ {draft,audited,ready}   │ WAIT (not yet in pipeline) │ low      │
// │R11 │ status = approved, scheduled     │ WAIT (scheduled)           │ low      │
// │R12 │ fallback                         │ NO_ACTION                  │ —        │
// └────┴──────────────────────────────────┴────────────────────────────┴──────────┘

const RULES = [
  // R1: Terminal states — no action needed
  {
    id: 'R1',
    name: 'terminal_state',
    test: (p) => ['verified', 'complete'].includes(p.status),
    action: ACTION.NO_ACTION,
    priority: null,
    reason: (p) => `Prompt is "${p.status}" — terminal state, no action needed`,
    clear_condition: () => null,
    ignore_safe: true,
  },

  // R2: Escalated — must fix
  {
    id: 'R2',
    name: 'escalation_required',
    test: (p) => !!p.escalation_required,
    action: ACTION.FIX_REQUIRED,
    priority: 'critical',
    reason: (p) => p.escalation_reason || `Escalation required — quality score ${p.quality_score}/100`,
    clear_condition: () => 'Fix the underlying quality issues and re-score. Escalation clears when quality_score >= 60 and blockers are resolved.',
    ignore_safe: false,
  },

  // R3: Evaluator failed — must fix
  {
    id: 'R3',
    name: 'evaluator_failed',
    test: (p) => p.evaluator_status === 'fail',
    action: ACTION.FIX_REQUIRED,
    priority: 'high',
    reason: (p) => `Evaluator status is "fail" — prompt output did not pass evaluation`,
    clear_condition: () => 'Re-execute the prompt and pass evaluation, or manually mark as verified.',
    ignore_safe: false,
  },

  // R4: Blocked by dependency — must unblock
  {
    id: 'R4',
    name: 'blocked_dependency',
    test: (p) => p.queue_status === 'blocked',
    action: ACTION.UNBLOCK_REQUIRED,
    priority: 'high',
    reason: (p) => {
      const reasons = parseBlockedReasons(p.blocked_reasons);
      if (reasons.length > 0) {
        return reasons.map(r => r.detail || r.code).join('; ');
      }
      return 'Blocked by unmet dependencies or constraints';
    },
    clear_condition: (p) => {
      const reasons = parseBlockedReasons(p.blocked_reasons);
      const codes = reasons.map(r => r.code);
      if (codes.includes('sequence_not_verified') || codes.includes('explicit_dep_not_verified')) {
        return 'Verify the blocking predecessor prompt. Once predecessor reaches "verified" status, this prompt will unblock automatically.';
      }
      if (codes.includes('audit_not_passed')) {
        return 'Run audit on this prompt. Once audit_status = "pass", the block clears.';
      }
      if (codes.includes('outside_release_window')) {
        return 'Wait for the release window to open, or adjust the release_window_start.';
      }
      return 'Resolve the blocking conditions listed above.';
    },
    ignore_safe: false,
  },

  // R5: Degradation detected (but not already escalated — R2 catches that)
  {
    id: 'R5',
    name: 'degradation_detected',
    test: (p) => !!p.degradation_flag && !p.escalation_required,
    action: ACTION.INVESTIGATE_DEGRADATION,
    priority: 'medium',
    reason: (p) => `Chain quality degrading — rolling score trending down across recent steps`,
    clear_condition: () => 'Review the chain history for the root cause. Fix the degrading step, re-score. Degradation flag clears when rolling quality stabilizes.',
    ignore_safe: false,
  },

  // R6: Ready + high confidence + no issues → release immediately
  {
    id: 'R6',
    name: 'ready_clean_release',
    test: (p) =>
      (p.queue_status === 'ready_for_release') &&
      (p.confidence_level === 'high' || p.confidence_level === 'unknown') &&
      !p.escalation_required &&
      !p.degradation_flag,
    action: ACTION.RELEASE_NOW,
    priority: 'medium',
    reason: (p) => `All dependencies verified, confidence is ${p.confidence_level}, no escalation or degradation — safe to release`,
    clear_condition: () => 'Release the prompt via POST /prompts/:id/release. Status transitions to "executing".',
    ignore_safe: false,
  },

  // R7: Overdue + eligible → release urgently
  {
    id: 'R7',
    name: 'overdue_release',
    test: (p) => p.queue_status === 'overdue',
    action: ACTION.RELEASE_NOW,
    priority: 'high',
    reason: (p) => `Overdue since ${p.overdue_since || 'scheduled time'} — eligible for release but not yet released`,
    clear_condition: () => 'Release the prompt immediately. It is past its scheduled/window time.',
    ignore_safe: false,
  },

  // R8: Ready but needs review (low confidence, degradation, or escalation flags)
  {
    id: 'R8',
    name: 'ready_needs_review',
    test: (p) =>
      p.queue_status === 'ready_for_release' &&
      (p.confidence_level === 'low' || p.confidence_level === 'medium' ||
       p.degradation_flag || p.escalation_required),
    action: ACTION.REVIEW_REQUIRED,
    priority: 'medium',
    reason: (p) => {
      const flags = [];
      if (p.confidence_level === 'low') flags.push(`confidence is low (score: ${p.quality_score})`);
      if (p.confidence_level === 'medium') flags.push(`confidence is medium (score: ${p.quality_score})`);
      if (p.degradation_flag) flags.push('degradation detected in chain');
      return `Ready for release but requires manual review: ${flags.join(', ')}`;
    },
    clear_condition: () => 'Review the prompt quality, confirm acceptable, then release manually.',
    ignore_safe: false,
  },

  // R9: Low confidence but not blocked/escalated
  {
    id: 'R9',
    name: 'low_confidence_review',
    test: (p) =>
      p.confidence_level === 'low' &&
      p.queue_status !== 'blocked' &&
      !p.escalation_required,
    action: ACTION.REVIEW_REQUIRED,
    priority: 'medium',
    reason: (p) => `Low confidence (score: ${p.quality_score}/100) — review quality before proceeding`,
    clear_condition: () => 'Re-score or re-evaluate the prompt. Confidence improves when quality_score >= 60.',
    ignore_safe: false,
  },

  // R10: Pre-pipeline states
  {
    id: 'R10',
    name: 'pre_pipeline',
    test: (p) => ['draft', 'audited', 'ready'].includes(p.status),
    action: ACTION.WAIT,
    priority: 'low',
    reason: (p) => `Prompt is "${p.status}" — not yet approved for pipeline execution`,
    clear_condition: (p) => {
      if (p.status === 'draft') return 'Complete audit to advance to "audited".';
      if (p.status === 'audited') return 'Mark as ready after review.';
      return 'Approve the prompt to enter the queue.';
    },
    ignore_safe: true,
  },

  // R11: Approved + scheduled
  {
    id: 'R11',
    name: 'scheduled_waiting',
    test: (p) => p.status === 'approved' && p.queue_status === 'scheduled',
    action: ACTION.WAIT,
    priority: 'low',
    reason: (p) => `Scheduled for ${p.scheduled_at || 'future'} — waiting for release window`,
    clear_condition: () => 'The scheduled time will arrive. No action needed.',
    ignore_safe: true,
  },

  // R12: Fallback
  {
    id: 'R12',
    name: 'fallback',
    test: () => true,
    action: ACTION.NO_ACTION,
    priority: null,
    reason: (p) => `Status "${p.status}", queue "${p.queue_status}" — no action required`,
    clear_condition: () => null,
    ignore_safe: true,
  },
];

// ─── Core: Classify a Single Prompt ────────────────────────────────────────

/**
 * Apply decision rules to a single prompt. Returns first matching action.
 * Deterministic: same prompt state → same action, every time.
 */
function classifyPrompt(prompt) {
  for (const rule of RULES) {
    if (rule.test(prompt)) {
      return {
        action: rule.action,
        action_label: ACTION_LABELS[rule.action],
        rule_id: rule.id,
        rule_name: rule.name,
        priority: rule.priority || prompt.priority || 'low',
        reason: rule.reason(prompt),
        clear_condition: rule.clear_condition(prompt),
        ignore_safe: rule.ignore_safe,
        target: {
          prompt_id: prompt.id,
          title: prompt.title,
          component: prompt.component,
          workflow_id: prompt.workflow_id || null,
          workflow_step_number: prompt.workflow_step_number || null,
        },
        context: {
          status: prompt.status,
          queue_status: prompt.queue_status,
          quality_score: prompt.quality_score,
          confidence_level: prompt.confidence_level,
          release_mode: prompt.release_mode,
          overdue: !!prompt.overdue,
          overdue_since: prompt.overdue_since || null,
          escalation_required: !!prompt.escalation_required,
          degradation_flag: !!prompt.degradation_flag,
          blocked_reasons: parseBlockedReasons(prompt.blocked_reasons),
        },
        blocking_pipeline: isBlockingPipeline(prompt),
      };
    }
  }
  // Should never reach here due to R12 fallback, but safety net
  return null;
}

// ─── Pipeline Blocking Detection ───────────────────────────────────────────

/**
 * Determine if a prompt is blocking pipeline progress.
 * A prompt blocks the pipeline if:
 *   - It is part of an active workflow
 *   - Other prompts depend on it (sequence or explicit)
 *   - It is not in a terminal state
 */
function isBlockingPipeline(prompt) {
  // Active workflow prompts that aren't done are potentially blocking
  if (prompt.workflow_id && !['verified', 'complete'].includes(prompt.status)) {
    return true;
  }
  // Blocked or escalated prompts with dependencies downstream
  if (['blocked', 'overdue'].includes(prompt.queue_status) && prompt.workflow_id) {
    return true;
  }
  return false;
}

// ─── Prioritization Engine ─────────────────────────────────────────────────

/**
 * Sort actions by deterministic priority:
 *   1. Action severity (FIX > UNBLOCK > DEGRADE > RELEASE > REVIEW > WAIT > NONE)
 *   2. Blocking pipeline (blocking first)
 *   3. Overdue status (overdue first)
 *   4. Priority enum (critical > high > normal > low)
 *   5. Sequence order (lower step first)
 */
function prioritizeActions(actions) {
  return actions.sort((a, b) => {
    // 1. Action severity
    const sevA = ACTION_SEVERITY[a.action] ?? 99;
    const sevB = ACTION_SEVERITY[b.action] ?? 99;
    if (sevA !== sevB) return sevA - sevB;

    // 2. Blocking pipeline
    const blockA = a.blocking_pipeline ? 0 : 1;
    const blockB = b.blocking_pipeline ? 0 : 1;
    if (blockA !== blockB) return blockA - blockB;

    // 3. Overdue
    const overdueA = a.context.overdue ? 0 : 1;
    const overdueB = b.context.overdue ? 0 : 1;
    if (overdueA !== overdueB) return overdueA - overdueB;

    // 4. Priority enum
    const priA = PRIORITY_WEIGHT[a.priority] ?? 99;
    const priB = PRIORITY_WEIGHT[b.priority] ?? 99;
    if (priA !== priB) return priA - priB;

    // 5. Workflow step number (earlier steps first)
    const stepA = a.target.workflow_step_number ?? 999;
    const stepB = b.target.workflow_step_number ?? 999;
    return stepA - stepB;
  });
}

// ─── Full Recommendations ──────────────────────────────────────────────────

/**
 * Generate full recommendations from all prompts in the system.
 * Queries all non-terminal prompts, classifies each, prioritizes, groups.
 */
async function getRecommendations() {
  const pool = getAppPool();

  // Get all prompts that might need action (exclude verified — terminal)
  const [prompts] = await pool.query(
    `SELECT id, title, component, status, queue_status, priority,
            quality_score, confidence_level, degradation_flag,
            escalation_required, escalation_reason,
            evaluator_status, completion_status,
            overdue, overdue_since, blocked_reasons,
            release_mode, scheduled_at,
            workflow_id, workflow_step_number,
            sequence_order, depends_on_prompt_id, dependency_type
     FROM om_prompt_registry
     ORDER BY sequence_order ASC`
  );

  // Classify every prompt
  const allActions = [];
  const seen = new Set(); // conflict guard — one action per prompt

  for (const prompt of prompts) {
    if (seen.has(prompt.id)) continue; // safety: no duplicates
    seen.add(prompt.id);

    const recommendation = classifyPrompt(prompt);
    if (recommendation) {
      allActions.push(recommendation);
    }
  }

  // Prioritize
  prioritizeActions(allActions);

  // Split: actionable vs safe-to-ignore
  const actionable = allActions.filter(a => !a.ignore_safe);
  const ignorable = allActions.filter(a => a.ignore_safe);

  // Group actionable by type
  const grouped = {};
  for (const type of Object.values(ACTION)) {
    const items = actionable.filter(a => a.action === type);
    if (items.length > 0) {
      grouped[type] = items;
    }
  }

  // Summary counts
  const counts = {};
  for (const a of actionable) {
    counts[a.action] = (counts[a.action] || 0) + 1;
  }

  return {
    generated_at: new Date().toISOString(),
    total_prompts: prompts.length,
    total_actionable: actionable.length,
    total_ignorable: ignorable.length,
    counts,
    actions: actionable,
    grouped,
    ignorable_count: ignorable.length,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseBlockedReasons(val) {
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
  ACTION,
  ACTION_LABELS,
  ACTION_SEVERITY,
  RULES,
  classifyPrompt,
  isBlockingPipeline,
  prioritizeActions,
  getRecommendations,
};
