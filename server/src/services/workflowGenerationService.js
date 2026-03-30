/**
 * Workflow Generation Service
 *
 * Generates prompts for all steps in an approved workflow and inserts them
 * into om_prompt_registry. Atomic: all-or-nothing batch creation.
 *
 * Rules:
 *   - Workflow must be in "approved" status
 *   - Generation is deterministic and idempotent (re-running returns existing)
 *   - No partial workflow creation — transaction rolls back on any failure
 *   - Every generated prompt includes full 8 required sections
 *   - Generated prompts start in "draft" status (must pass audit before execution)
 *   - Dependency chain is set via parent_prompt_id + depends_on_prompt_id
 *   - Each prompt gets workflow_id + workflow_step_number for traceability
 */

const { v4: uuidv4 } = require('uuid');
const { getAppPool } = require('../config/db');

// ─── Prompt Type Labels ─────────────────────────────────────────────────────

const TYPE_LABELS = {
  plan:           'Planning & Architecture',
  implementation: 'Implementation',
  verification:   'Verification & Testing',
  correction:     'Correction & Fix',
  migration:      'Data Migration',
  docs:           'Documentation',
};

// ─── Prompt Text Builder ────────────────────────────────────────────────────

/**
 * Build a structurally complete prompt from a workflow step definition.
 * All 8 required sections are populated.
 */
function buildPromptFromStep(step, workflow, stepIndex, totalSteps) {
  const now = new Date().toISOString().split('T')[0];
  const typeLabel = TYPE_LABELS[step.prompt_type] || step.prompt_type;

  return `[METADATA]
ID: ${String(stepIndex + 1).padStart(3, '0')}
DATE: ${now}
TIME: AUTO
COMPONENT: ${step.component || workflow.component}
PURPOSE: ${step.purpose}
PARENT: ${workflow.id}
WORKFLOW: ${workflow.name} (step ${step.step_number} of ${totalSteps})
PROMPT_TYPE: ${step.prompt_type}

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

If any requirement cannot be met:
STOP, explain why, and do not produce partial output.

SYSTEM PRIORITIES:
- correctness over speed
- completeness over partial delivery
- strict adherence to requirements over creative interpretation
- reuse existing patterns over introducing new ones

---

TASK:

${step.title}

${step.purpose}

This is step ${step.step_number} of ${totalSteps} in workflow "${workflow.name}".
Type: ${typeLabel}
Component: ${step.component || workflow.component}
${step.depends_on_step ? `\nDepends on: Step ${step.depends_on_step} (must be completed first)` : ''}

---

REQUIREMENTS:

${step.requirements_summary || `1. Complete all objectives described in the task section\n2. Ensure output meets the expected outcome criteria\n3. Follow existing codebase patterns and conventions`}

---

OUTPUT REQUIREMENTS:

Expected Outcome:
${step.expected_outcome}

Provide:
1. All code changes with file paths
2. Explicit confirmation of each requirement met
3. List of all files created or modified
4. Any issues encountered and how they were resolved

---

PROHIBITIONS:

- No fallback or workaround behavior
- No partial implementations marked as complete
- No placeholder content
- No skipping requirements
- No mock or fake data in production context
- No simplified versions of required functionality
- No error suppression

---

FINAL REQUIREMENT:

Every output must be verifiable. Do not claim completion without evidence. Every requirement listed above must be addressed individually with explicit confirmation.`;
}

// ─── Preview (no side effects) ──────────────────────────────────────────────

/**
 * Preview what prompts would be generated for a workflow.
 * Returns the full prompt text for each step without creating anything.
 */
async function previewGeneration(workflowId) {
  const pool = getAppPool();

  const [wfRows] = await pool.query('SELECT * FROM prompt_workflows WHERE id = ?', [workflowId]);
  if (wfRows.length === 0) throw new Error(`Workflow not found: ${workflowId}`);
  const workflow = wfRows[0];

  const [steps] = await pool.query(
    'SELECT * FROM prompt_workflow_steps WHERE workflow_id = ? ORDER BY step_number',
    [workflowId]
  );

  if (steps.length === 0) throw new Error('Workflow has no steps.');

  return steps.map((step, i) => ({
    step_number: step.step_number,
    title: step.title,
    component: step.component || workflow.component,
    prompt_type: step.prompt_type,
    depends_on_step: step.depends_on_step,
    prompt_text: buildPromptFromStep(step, workflow, i, steps.length),
  }));
}

// ─── Batch Generation ───────────────────────────────────────────────────────

/**
 * Generate all prompts for an approved workflow.
 * Atomic: uses a transaction — all prompts created or none.
 * Idempotent: if prompts_generated is already true, returns existing.
 *
 * @param {string} workflowId - UUID
 * @param {string} actor - who triggered generation
 * @returns {{ prompts: object[], already_existed: boolean }}
 */
async function generatePrompts(workflowId, actor) {
  const pool = getAppPool();

  // Load workflow (include template release_mode for propagation chain)
  const [wfRows] = await pool.query(
    `SELECT pw.*, wt.release_mode AS template_release_mode
     FROM prompt_workflows pw
     LEFT JOIN workflow_templates wt ON wt.id COLLATE utf8mb4_general_ci = pw.template_id COLLATE utf8mb4_general_ci
     WHERE pw.id = ?`,
    [workflowId]
  );
  if (wfRows.length === 0) throw new Error(`Workflow not found: ${workflowId}`);
  const workflow = wfRows[0];

  // Resolve release_mode: workflow override > template default > system default (auto_safe)
  const resolvedReleaseMode = workflow.release_mode
    || workflow.template_release_mode
    || 'auto_safe';
  workflow._resolved_release_mode = resolvedReleaseMode;

  // Must be approved
  if (workflow.status !== 'approved') {
    throw new Error(
      `Cannot generate prompts: workflow is "${workflow.status}", must be "approved".`
    );
  }

  // Idempotent: if already generated, return existing prompts
  if (workflow.prompts_generated) {
    const [existing] = await pool.query(
      `SELECT p.*, s.step_number FROM om_prompt_registry p
       JOIN prompt_workflow_steps s ON s.prompt_id = p.id
       WHERE p.workflow_id = ? ORDER BY s.step_number`,
      [workflowId]
    );
    return { prompts: existing, already_existed: true };
  }

  // Load steps
  const [steps] = await pool.query(
    'SELECT * FROM prompt_workflow_steps WHERE workflow_id = ? ORDER BY step_number',
    [workflowId]
  );

  if (steps.length === 0) {
    throw new Error('Cannot generate: workflow has no steps.');
  }

  // Generate all prompts in a transaction
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Create a parent prompt ID for the workflow scope (used for sequence ordering)
    // We use the workflow's first prompt as the parent scope anchor
    const parentScopeId = null; // Workflow prompts use workflow_id instead of parent_prompt_id

    // Map step_number → prompt_id for dependency resolution
    const stepPromptMap = {};
    const generatedPrompts = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const promptId = uuidv4();
      stepPromptMap[step.step_number] = promptId;

      const promptText = buildPromptFromStep(step, workflow, i, steps.length);

      // Determine dependency: explicit step dep → that step's prompt, otherwise previous step's prompt
      let dependsOnPromptId = null;
      if (step.depends_on_step && stepPromptMap[step.depends_on_step]) {
        dependsOnPromptId = stepPromptMap[step.depends_on_step];
      } else if (i > 0) {
        dependsOnPromptId = stepPromptMap[steps[i - 1].step_number];
      }

      // Determine dependency type
      const depType = step.depends_on_step ? 'explicit' : (i > 0 ? 'sequence' : 'none');

      await conn.query(
        `INSERT INTO om_prompt_registry
           (id, created_by, title, purpose, component, parent_prompt_id,
            sequence_order, status, prompt_text, guardrails_applied, audit_status,
            auto_generated, generated_from_evaluation, released_for_execution,
            workflow_id, workflow_step_number, dependency_type, depends_on_prompt_id,
            priority, queue_status, release_mode)
         VALUES (?, ?, ?, ?, ?, NULL, ?, 'draft', ?, 1, 'pending', 1, 0, 0,
                 ?, ?, ?, ?, 'normal', 'pending', ?)`,
        [
          promptId,
          actor,
          step.title,
          step.purpose,
          step.component || workflow.component,
          step.step_number, // sequence_order = step_number
          promptText,
          workflowId,
          step.step_number,
          depType,
          dependsOnPromptId,
          workflow._resolved_release_mode,
        ]
      );

      // Link step → prompt
      await conn.query(
        'UPDATE prompt_workflow_steps SET prompt_id = ? WHERE id = ?',
        [promptId, step.id]
      );

      generatedPrompts.push({
        id: promptId,
        step_number: step.step_number,
        title: step.title,
        status: 'draft',
        dependency_type: depType,
        depends_on_prompt_id: dependsOnPromptId,
        release_mode: workflow._resolved_release_mode,
      });
    }

    // Mark workflow as prompts_generated
    await conn.query(
      `UPDATE prompt_workflows SET prompts_generated = 1, generation_error = NULL WHERE id = ?`,
      [workflowId]
    );

    await conn.commit();

    // Log outside transaction
    await logAction(pool, workflowId, 'PROMPTS_GENERATED', actor, {
      prompt_count: generatedPrompts.length,
      prompt_ids: generatedPrompts.map(p => p.id),
      release_mode: resolvedReleaseMode,
      release_mode_source: workflow.release_mode ? 'workflow' : (workflow.template_release_mode ? 'template' : 'system_default'),
    });

    return { prompts: generatedPrompts, already_existed: false };

  } catch (err) {
    await conn.rollback();

    // Record error on workflow
    await pool.query(
      'UPDATE prompt_workflows SET generation_error = ? WHERE id = ?',
      [err.message, workflowId]
    );

    throw new Error(`Batch generation failed (rolled back): ${err.message}`);
  } finally {
    conn.release();
  }
}

// ─── Logging ────────────────────────────────────────────────────────────────

async function logAction(pool, workflowId, action, actor, details = null) {
  try {
    await pool.query(
      `INSERT INTO system_logs
         (timestamp, level, source, message, meta, user_email, service, source_component)
       VALUES (NOW(), 'INFO', 'workflow_generation', ?, ?, ?, 'omai', 'prompt_workflows')`,
      [
        `[${action}] workflow=${workflowId}`,
        details ? JSON.stringify(details) : null,
        actor,
      ]
    );
  } catch (err) {
    console.error(`[workflow_gen] Failed to log ${action}:`, err.message);
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  previewGeneration,
  generatePrompts,
  // Exposed for testing
  buildPromptFromStep,
};
