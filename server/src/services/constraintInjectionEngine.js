/**
 * Constraint Injection Engine
 *
 * Integrates with the workflow generation pipeline to inject learned
 * constraints into generated prompts. All injections are:
 *   - deterministic (based on structured patterns, not heuristics)
 *   - traceable (recorded in workflow_learning_injections)
 *   - priority-based (high/critical always, medium if relevant, low if direct match)
 *
 * Usage in workflowGenerationService.buildPromptFromStep():
 *   const block = await injectionEngine.buildConstraintBlock(step, workflow);
 *   // Insert block.text into prompt, then call block.recordAll(promptId) after INSERT
 */

const learningService = require('./workflowLearningService');

// ─── Constraint Block Builder ──────────────────────────────────────────────

/**
 * Build the constraint injection block for a prompt step.
 * Returns the text to inject and a function to record all injections.
 *
 * @param {object} step - workflow step { component, prompt_type }
 * @param {object} workflow - workflow { id, component }
 * @returns {{ text: string, constraints: Array, recordAll: function(promptId) }}
 */
async function buildConstraintBlock(step, workflow) {
  const component = step.component || workflow.component || null;

  // Get applicable constraints
  const constraints = await learningService.getConstraints(component);

  if (constraints.length === 0) {
    return {
      text: '',
      constraints: [],
      recordAll: async () => {},
    };
  }

  // Deduplicate by constraint_text to avoid injecting the same constraint twice
  const seen = new Set();
  const unique = [];
  for (const c of constraints) {
    const key = c.constraint_text.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
    }
  }

  // Build the text block
  const lines = [
    'LEARNED CONSTRAINTS (from cross-workflow analysis):',
    '',
  ];

  for (const c of unique) {
    lines.push(`- [${c.severity.toUpperCase()}] ${c.constraint_text}`);
    lines.push(`  (Source: ${c.title}, ${c.occurrences} occurrences)`);
  }

  const text = lines.join('\n');

  // Return block with deferred recording
  return {
    text,
    constraints: unique,
    /**
     * Record all injections for traceability. Call after the prompt is created.
     * @param {string} promptId - the created prompt's ID
     */
    recordAll: async (promptId) => {
      for (const c of unique) {
        await learningService.recordInjection({
          learning_id: c.learning_id,
          prompt_id: promptId,
          workflow_id: workflow.id,
          constraint_text: c.constraint_text,
          injection_reason: c.injection_reason,
        });
      }
    },
  };
}

/**
 * Build a constraint summary for preview (no recording, just text).
 * Used by the preview endpoint to show what would be injected.
 *
 * @param {string} [component]
 * @returns {{ constraints: Array, preview_text: string }}
 */
async function previewConstraints(component) {
  const constraints = await learningService.getConstraints(component);

  if (constraints.length === 0) {
    return { constraints: [], preview_text: '' };
  }

  // Deduplicate
  const seen = new Set();
  const unique = [];
  for (const c of constraints) {
    const key = c.constraint_text.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
    }
  }

  const lines = unique.map(c =>
    `[${c.severity.toUpperCase()}] ${c.constraint_text} — ${c.title} (${c.occurrences}x)`
  );

  return {
    constraints: unique,
    preview_text: lines.join('\n'),
  };
}

// ─── Exports ───────────────────────────────────────────────────────────────

module.exports = {
  buildConstraintBlock,
  previewConstraints,
};
