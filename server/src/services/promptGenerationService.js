/**
 * Prompt Generation Service
 *
 * Generates the next prompt from evaluation results using deterministic rules.
 * Implements adaptive constraint injection: violations from prior evaluations
 * are encoded as hard constraints in the generated prompt.
 *
 * Decision logic (deterministic):
 *   complete + pass  → next sequential prompt
 *   partial  + pass  → continuation prompt (remaining outcomes only)
 *   failed           → correction prompt (root failures)
 *   blocked          → unblock prompt (blockers)
 *   evaluator fail   → remediation prompt (violations)
 *
 * Generated prompts:
 *   - Are structurally complete (all 8 required sections)
 *   - Preserve full lineage
 *   - Include adaptive constraints from prior violations
 *   - Are held in draft status (not auto-executed)
 *   - Must pass audit before execution
 */

const { v4: uuidv4 } = require('uuid');
const { getAppPool } = require('../config/db');

// ─── Decision Table ────────────────────────────────────────────────────────
// Maps (completion_status, evaluator_status) to the type of prompt to generate.

const DECISION_TABLE = {
  'complete:pass':   { type: 'continuation', label: 'Next Sequential Prompt' },
  'partial:pass':    { type: 'continuation', label: 'Continuation Prompt — Remaining Outcomes' },
  'partial:fail':    { type: 'remediation',  label: 'Remediation Prompt — Fix Violations Before Continuing' },
  'failed:pass':     { type: 'correction',   label: 'Correction Prompt — Root Failures' },
  'failed:fail':     { type: 'correction',   label: 'Correction Prompt — Failures + Violations' },
  'blocked:pass':    { type: 'unblock',      label: 'Unblock Prompt — Resolve Blockers' },
  'blocked:fail':    { type: 'unblock',      label: 'Unblock Prompt — Resolve Blockers + Violations' },
  'complete:fail':   { type: 'remediation',  label: 'Remediation Prompt — Fix Violations' },
};

// ─── Prompt Template Builder ───────────────────────────────────────────────

/**
 * Build a structurally complete prompt from evaluation data.
 * All 8 required sections are populated.
 */
function buildPromptText({
  parentPrompt,
  evaluation,
  generationType,
  decisionLabel,
  sequenceOrder,
  adaptiveConstraints,
}) {
  const now = new Date().toISOString();
  const parentTitle = parentPrompt.title;
  const parentComponent = parentPrompt.component;
  const parentPurpose = parentPrompt.purpose;

  // Parse evaluation fields
  const remaining = parseJson(evaluation.remaining_outcomes) || [];
  const violations = parseJson(evaluation.violations_found) || [];
  const blockers = parseJson(evaluation.blockers_found) || [];
  const issues = parseJson(evaluation.issues_found) || [];
  const completed = parseJson(evaluation.completed_outcomes) || [];
  const changedFiles = parseJson(evaluation.changed_files) || [];

  // ─── Build TASK section based on generation type ──────────────────
  let taskSection;
  let requirementsSection;
  let outputSection;

  switch (generationType) {
    case 'continuation': {
      if (remaining.length > 0) {
        taskSection = `Continue implementation from "${parentTitle}" (sequence ${parentPrompt.sequence_order}).\n\n` +
          `The prior prompt completed ${completed.length} outcomes. The following ${remaining.length} outcomes remain:\n\n` +
          remaining.map((r, i) => `${i + 1}. [${r.source}] ${r.requirement}`).join('\n');
        requirementsSection = remaining.map((r, i) => `${i + 1}. ${r.requirement}`).join('\n');
      } else {
        taskSection = `Continue to the next phase after successful completion of "${parentTitle}" (sequence ${parentPrompt.sequence_order}).\n\n` +
          `All ${completed.length} outcomes were met. Proceed to the next logical phase of the ${parentComponent} component.`;
        requirementsSection = `1. Build on the completed work from the prior prompt\n` +
          `2. Do not re-implement already completed outcomes\n` +
          `3. Extend the existing implementation with the next logical functionality`;
      }
      outputSection = `1. All remaining requirements must be fully implemented\n` +
        `2. Provide explicit confirmation of each completed requirement\n` +
        `3. List all files created or modified\n` +
        `4. No partial implementations — every requirement must be complete`;
      break;
    }

    case 'correction': {
      taskSection = `Correct the failed implementation from "${parentTitle}" (sequence ${parentPrompt.sequence_order}).\n\n` +
        `The prior execution failed. Root issues:\n\n`;
      if (violations.length > 0) {
        taskSection += `Violations:\n` + violations.map((v, i) => `${i + 1}. [${v.key}] ${v.description}`).join('\n') + '\n\n';
      }
      if (remaining.length > 0) {
        taskSection += `Unmet requirements:\n` + remaining.map((r, i) => `${i + 1}. ${r.requirement}`).join('\n');
      }
      requirementsSection = `1. Fix all identified failures from the prior execution\n` +
        (violations.length > 0 ? violations.map((v, i) => `${i + 2}. Resolve violation: ${v.description}`).join('\n') + '\n' : '') +
        (remaining.length > 0 ? remaining.map((r, i) => `${i + 2 + violations.length}. Complete: ${r.requirement}`).join('\n') : '');
      outputSection = `1. Each failure must be individually addressed and resolved\n` +
        `2. Provide evidence that each prior failure is fixed\n` +
        `3. List all files modified during correction\n` +
        `4. No new failures introduced`;
      break;
    }

    case 'unblock': {
      taskSection = `Resolve blockers preventing progress on "${parentTitle}" (sequence ${parentPrompt.sequence_order}).\n\n` +
        `The following blockers were identified:\n\n` +
        blockers.map((b, i) => `${i + 1}. [${b.type}] ${b.matched} — ${b.context}`).join('\n');
      requirementsSection = blockers.map((b, i) => `${i + 1}. Resolve blocker: ${b.matched}`).join('\n') +
        '\n' + (remaining.length > 0 ? `\nAfter unblocking, complete:\n` + remaining.map((r, i) => `${i + 1 + blockers.length}. ${r.requirement}`).join('\n') : '');
      outputSection = `1. Each blocker must be resolved with evidence\n` +
        `2. Confirm that the blocked work can now proceed\n` +
        `3. If a blocker cannot be resolved, explain why and propose alternative`;
      break;
    }

    case 'remediation': {
      taskSection = `Remediate violations found in "${parentTitle}" (sequence ${parentPrompt.sequence_order}) before any forward progress.\n\n` +
        `The evaluation found ${violations.length} violation(s) that must be fixed:\n\n` +
        violations.map((v, i) => `${i + 1}. [${v.key}] ${v.description}\n   Found: "${v.matched}"\n   Context: ${v.context}`).join('\n\n');
      requirementsSection = violations.map((v, i) => `${i + 1}. Remove or fix violation: ${v.description}`).join('\n') +
        '\n\nAfter remediation:\n' +
        (remaining.length > 0 ? remaining.map((r, i) => `${i + 1 + violations.length}. Complete: ${r.requirement}`).join('\n') : `${violations.length + 1}. Verify the implementation is correct and complete`);
      outputSection = `1. Each violation must be specifically addressed\n` +
        `2. Provide before/after evidence for each remediated violation\n` +
        `3. No new violations introduced\n` +
        `4. All prior completed work must be preserved`;
      break;
    }

    default:
      taskSection = `Continue from "${parentTitle}" (sequence ${parentPrompt.sequence_order}).`;
      requirementsSection = '1. Complete the next logical step';
      outputSection = '1. Provide explicit output of all work done';
  }

  // ─── Build adaptive constraints from prior violations ─────────────
  let prohibitionsSection = '';

  // Always include base prohibitions
  prohibitionsSection += `1. No fallback or workaround behavior\n`;
  prohibitionsSection += `2. No partial implementations marked as complete\n`;
  prohibitionsSection += `3. No placeholder content\n`;
  prohibitionsSection += `4. No skipping requirements\n`;
  prohibitionsSection += `5. No mock or fake data in production context\n`;
  prohibitionsSection += `6. No simplified versions of required functionality\n`;
  prohibitionsSection += `7. No error suppression\n`;

  // Inject specific constraints from prior violations (adaptive learning)
  if (adaptiveConstraints.length > 0) {
    prohibitionsSection += `\nADAPTIVE CONSTRAINTS (from prior evaluation failures):\n`;
    for (let i = 0; i < adaptiveConstraints.length; i++) {
      prohibitionsSection += `${8 + i}. ${adaptiveConstraints[i]}\n`;
    }
  }

  // ─── Build changed files context ──────────────────────────────────
  let filesContext = '';
  if (changedFiles.length > 0) {
    filesContext = `\nFiles modified in prior execution:\n` +
      changedFiles.map(f => `- ${f}`).join('\n') + '\n';
  }

  // ─── Assemble full prompt ─────────────────────────────────────────
  const promptText = `[METADATA]
ID: AUTO
DATE: ${now.split('T')[0]}
TIME: AUTO
COMPONENT: ${parentComponent}
PURPOSE: ${decisionLabel}
PARENT: ${parentPrompt.id}
GENERATED_FROM: evaluation of prompt ${parentPrompt.id} (seq ${parentPrompt.sequence_order})
GENERATION_TYPE: ${generationType}

---

CRITICAL EXECUTION RULES:

You are NOT allowed to:
- introduce fallback behavior or workarounds
- mark partial work as complete
- use placeholder or mock data
- skip any requirement listed below
- deviate from the specified approach
- suppress or ignore errors
- create new patterns when existing patterns should be reused
${adaptiveConstraints.length > 0 ? '\nLEARNED FROM PRIOR FAILURES:\n' + adaptiveConstraints.map(c => `- ${c}`).join('\n') + '\n' : ''}
If any requirement cannot be met:
STOP, explain why, and do not produce partial output.

SYSTEM PRIORITIES:
- correctness over speed
- completeness over partial delivery
- strict adherence to requirements over creative interpretation
- reuse existing patterns over introducing new ones

---

TASK:
${taskSection}
${filesContext}
REQUIREMENTS:
${requirementsSection}

OUTPUT REQUIREMENTS:
${outputSection}

PROHIBITIONS:
${prohibitionsSection}
FINAL REQUIREMENT:
Every output must be verifiable. Do not claim completion without evidence. Every requirement listed above must be addressed individually with explicit confirmation.`;

  return promptText;
}

// ─── Adaptive Constraint Builder ───────────────────────────────────────────

/**
 * Build adaptive constraints from evaluation violations.
 * These become hard rules in the next prompt's PROHIBITIONS section.
 *
 * Also walks the parent chain to accumulate constraints from prior failures.
 */
async function buildAdaptiveConstraints(pool, promptId) {
  const constraints = [];
  const seenKeys = new Set();

  // Walk up to 5 levels of parent chain to gather violation history
  let currentId = promptId;
  let depth = 0;

  while (currentId && depth < 5) {
    const [rows] = await pool.query(
      'SELECT violations_found, parent_prompt_id FROM om_prompt_registry WHERE id = ?',
      [currentId]
    );
    if (rows.length === 0) break;

    const violations = parseJson(rows[0].violations_found) || [];
    for (const v of violations) {
      if (!seenKeys.has(v.key)) {
        seenKeys.add(v.key);
        constraints.push(
          `DO NOT repeat: ${v.description} (detected in prior prompt chain)`
        );
      }
    }

    currentId = rows[0].parent_prompt_id;
    depth++;
  }

  return constraints;
}

// ─── Core Generation ────────────────────────────────────────────────────────

/**
 * Generate the next prompt from an evaluated prompt.
 * Idempotent: returns existing next prompt if already generated.
 *
 * @param {string} promptId - UUID of the evaluated parent prompt
 * @param {string} actor - who is generating
 * @returns {object} The generated next prompt
 */
async function generateNext(promptId, actor) {
  const pool = getAppPool();

  // Load parent prompt
  const [rows] = await pool.query(
    'SELECT * FROM om_prompt_registry WHERE id = ?',
    [promptId]
  );
  if (rows.length === 0) {
    throw new Error(`Prompt not found: ${promptId}`);
  }
  const parent = rows[0];

  // Must be complete or verified
  if (!['complete', 'verified'].includes(parent.status)) {
    throw new Error(
      `Cannot generate next: prompt is "${parent.status}", must be "complete" or "verified".`
    );
  }

  // Must have been evaluated
  if (!parent.evaluator_status) {
    throw new Error(
      'Cannot generate next: prompt has not been evaluated. ' +
      'Run POST /api/prompts/:id/evaluate first.'
    );
  }

  // Idempotent: if next_prompt_id already exists, return it
  if (parent.next_prompt_id) {
    const [existing] = await pool.query(
      'SELECT * FROM om_prompt_registry WHERE id = ?',
      [parent.next_prompt_id]
    );
    if (existing.length > 0) {
      return { prompt: existing[0], already_existed: true };
    }
    // If referenced prompt was deleted, clear the reference and regenerate
    await pool.query(
      'UPDATE om_prompt_registry SET next_prompt_id = NULL WHERE id = ?',
      [promptId]
    );
  }

  // Determine generation type from decision table
  const key = `${parent.completion_status}:${parent.evaluator_status}`;
  const decision = DECISION_TABLE[key];
  if (!decision) {
    throw new Error(
      `No generation rule for completion_status="${parent.completion_status}" ` +
      `evaluator_status="${parent.evaluator_status}". Cannot determine next prompt type.`
    );
  }

  // Build adaptive constraints from violation history
  const adaptiveConstraints = await buildAdaptiveConstraints(pool, promptId);

  // Determine next sequence order
  const parentScope = parent.parent_prompt_id || null;
  const [maxSeq] = await pool.query(
    `SELECT MAX(sequence_order) as max_seq FROM om_prompt_registry
     WHERE parent_prompt_id <=> ?`,
    [parentScope]
  );
  const nextSeq = (maxSeq[0].max_seq ?? -1) + 1;

  // Build the prompt text
  const promptText = buildPromptText({
    parentPrompt: parent,
    evaluation: parent,
    generationType: decision.type,
    decisionLabel: decision.label,
    sequenceOrder: nextSeq,
    adaptiveConstraints,
  });

  // Determine title
  const typeLabels = {
    continuation: 'Continue',
    correction: 'Correct',
    unblock: 'Unblock',
    remediation: 'Remediate',
  };
  const title = `${typeLabels[decision.type] || 'Next'}: ${parent.title} (seq ${nextSeq})`;

  // Create the next prompt in draft status
  const nextId = uuidv4();

  await pool.query(
    `INSERT INTO om_prompt_registry
       (id, created_by, title, purpose, component, parent_prompt_id,
        sequence_order, status, prompt_text, guardrails_applied, audit_status,
        auto_generated, generated_from_evaluation, released_for_execution)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, 1, 'pending', 1, 1, 0)`,
    [
      nextId,
      actor,
      title,
      decision.label,
      parent.component,
      parentScope,
      nextSeq,
      promptText,
    ]
  );

  // Link parent → child
  await pool.query(
    'UPDATE om_prompt_registry SET next_prompt_id = ? WHERE id = ?',
    [nextId, promptId]
  );

  // Log generation
  await pool.query(
    `INSERT INTO system_logs
       (timestamp, level, source, message, meta, user_email, service, source_component)
     VALUES (NOW(), 'INFO', 'prompt_generation', ?, ?, ?, 'omai', 'prompt_registry')`,
    [
      `[GENERATED] parent=${promptId} child=${nextId} type=${decision.type}`,
      JSON.stringify({
        parent_id: promptId,
        child_id: nextId,
        generation_type: decision.type,
        sequence_order: nextSeq,
        adaptive_constraints: adaptiveConstraints.length,
        completion_status: parent.completion_status,
        evaluator_status: parent.evaluator_status,
      }),
      actor,
    ]
  );

  // Return the generated prompt
  const [created] = await pool.query(
    'SELECT * FROM om_prompt_registry WHERE id = ?',
    [nextId]
  );

  return { prompt: created[0], already_existed: false };
}

/**
 * Release a generated next prompt for execution.
 * The prompt must exist, pass audit, and the parent must be verified + evaluated.
 */
async function releaseNext(promptId, actor) {
  const pool = getAppPool();

  // Load parent
  const [parentRows] = await pool.query(
    'SELECT * FROM om_prompt_registry WHERE id = ?',
    [promptId]
  );
  if (parentRows.length === 0) {
    throw new Error(`Prompt not found: ${promptId}`);
  }
  const parent = parentRows[0];

  // Parent must be verified
  if (parent.status !== 'verified') {
    throw new Error(
      `Cannot release next: parent prompt is "${parent.status}", must be "verified".`
    );
  }

  // Parent must be evaluated
  if (!parent.evaluator_status) {
    throw new Error(
      'Cannot release next: parent prompt has not been evaluated.'
    );
  }

  // Must have a next_prompt_id
  if (!parent.next_prompt_id) {
    throw new Error(
      'Cannot release next: no next prompt has been generated. ' +
      'Run POST /api/prompts/:id/generate-next first.'
    );
  }

  // Load child prompt
  const [childRows] = await pool.query(
    'SELECT * FROM om_prompt_registry WHERE id = ?',
    [parent.next_prompt_id]
  );
  if (childRows.length === 0) {
    throw new Error(`Next prompt not found: ${parent.next_prompt_id}`);
  }
  const child = childRows[0];

  // Child must pass audit before release
  if (child.audit_status !== 'pass') {
    throw new Error(
      `Cannot release: next prompt audit_status is "${child.audit_status}", must be "pass". ` +
      'Run audit on the generated prompt first.'
    );
  }

  // Mark as released
  await pool.query(
    'UPDATE om_prompt_registry SET released_for_execution = 1 WHERE id = ?',
    [child.id]
  );

  // Log release
  await pool.query(
    `INSERT INTO system_logs
       (timestamp, level, source, message, meta, user_email, service, source_component)
     VALUES (NOW(), 'INFO', 'prompt_generation', ?, ?, ?, 'omai', 'prompt_registry')`,
    [
      `[RELEASED] parent=${promptId} child=${child.id}`,
      JSON.stringify({ parent_id: promptId, child_id: child.id }),
      actor,
    ]
  );

  const [updated] = await pool.query(
    'SELECT * FROM om_prompt_registry WHERE id = ?',
    [child.id]
  );

  return { prompt: updated[0] };
}

/**
 * Get the next prompt linked to a parent.
 */
async function getNext(promptId) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    'SELECT next_prompt_id FROM om_prompt_registry WHERE id = ?',
    [promptId]
  );
  if (rows.length === 0) {
    throw new Error(`Prompt not found: ${promptId}`);
  }

  if (!rows[0].next_prompt_id) {
    return { next_prompt: null };
  }

  const [next] = await pool.query(
    'SELECT * FROM om_prompt_registry WHERE id = ?',
    [rows[0].next_prompt_id]
  );

  return { next_prompt: next.length > 0 ? next[0] : null };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseJson(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return null; }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  generateNext,
  releaseNext,
  getNext,
  // Exposed for transparency
  DECISION_TABLE,
  // Pure functions for testing
  buildPromptText,
  buildAdaptiveConstraints,
};
