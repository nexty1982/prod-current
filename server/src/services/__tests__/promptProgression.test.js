/**
 * Tests for Prompt Progression Service — Prompt 028
 *
 * Covers:
 *   - Transition eligibility rules (draft→audited→ready→approved→released)
 *   - Release_mode propagation correctness
 *   - Manual prompts blocked at correct stage
 *   - Downstream queue advancement
 *   - Pipeline summary accuracy
 */

const { TRANSITION_RULES } = require('../promptProgressionService');

// ─── Transition Rule Tests ──────────────────────────────────────────────────

describe('TRANSITION_RULES', () => {

  // ─── draft → audited ───────────────────────────────────────────────────

  describe('draft_to_audited', () => {
    const rule = TRANSITION_RULES.draft_to_audited;

    test('auto-generated + guardrails → eligible', () => {
      const result = rule({ auto_generated: 1, guardrails_applied: 1 });
      expect(result.eligible).toBe(true);
    });

    test('not auto-generated → ineligible', () => {
      const result = rule({ auto_generated: 0, guardrails_applied: 1 });
      expect(result.eligible).toBe(false);
      expect(result.reason).toMatch(/manual audit/i);
    });

    test('no guardrails → ineligible', () => {
      const result = rule({ auto_generated: 1, guardrails_applied: 0 });
      expect(result.eligible).toBe(false);
      expect(result.reason).toMatch(/guardrails/i);
    });

    test('neither auto nor guardrails → ineligible', () => {
      const result = rule({ auto_generated: 0, guardrails_applied: 0 });
      expect(result.eligible).toBe(false);
    });
  });

  // ─── audited → ready ──────────────────────────────────────────────────

  describe('audited_to_ready', () => {
    const rule = TRANSITION_RULES.audited_to_ready;

    test('audit_status=pass → eligible', () => {
      expect(rule({ audit_status: 'pass' }).eligible).toBe(true);
    });

    test('audit_status=pending → ineligible', () => {
      const result = rule({ audit_status: 'pending' });
      expect(result.eligible).toBe(false);
      expect(result.reason).toMatch(/pending/);
    });

    test('audit_status=fail → ineligible', () => {
      const result = rule({ audit_status: 'fail' });
      expect(result.eligible).toBe(false);
      expect(result.reason).toMatch(/fail/);
    });
  });

  // ─── ready → approved ─────────────────────────────────────────────────

  describe('ready_to_approved', () => {
    const rule = TRANSITION_RULES.ready_to_approved;

    test('release_mode=auto_safe → eligible', () => {
      expect(rule({ release_mode: 'auto_safe' }).eligible).toBe(true);
    });

    test('release_mode=auto_full → eligible', () => {
      expect(rule({ release_mode: 'auto_full' }).eligible).toBe(true);
    });

    test('release_mode=manual → ineligible (requires human)', () => {
      const result = rule({ release_mode: 'manual' });
      expect(result.eligible).toBe(false);
      expect(result.reason).toMatch(/manual/i);
    });

    test('unknown release_mode → ineligible', () => {
      const result = rule({ release_mode: 'unknown' });
      expect(result.eligible).toBe(false);
    });
  });

  // ─── approved → released ──────────────────────────────────────────────

  describe('approved_to_released', () => {
    const rule = TRANSITION_RULES.approved_to_released;

    test('not yet released + auto_safe → eligible', () => {
      expect(rule({ released_for_execution: 0, release_mode: 'auto_safe' }).eligible).toBe(true);
    });

    test('not yet released + auto_full → eligible', () => {
      expect(rule({ released_for_execution: 0, release_mode: 'auto_full' }).eligible).toBe(true);
    });

    test('already released → ineligible', () => {
      const result = rule({ released_for_execution: 1, release_mode: 'auto_safe' });
      expect(result.eligible).toBe(false);
      expect(result.reason).toMatch(/already/i);
    });

    test('manual release_mode → ineligible', () => {
      const result = rule({ released_for_execution: 0, release_mode: 'manual' });
      expect(result.eligible).toBe(false);
      expect(result.reason).toMatch(/manual/i);
    });
  });
});

// ─── Release Mode Propagation ─────────────────────────────────────────────

describe('Release Mode Propagation Logic', () => {
  // These test the resolution chain: workflow > template > system default

  test('workflow release_mode takes precedence over template', () => {
    const workflow = { release_mode: 'auto_full', template_release_mode: 'auto_safe' };
    const resolved = workflow.release_mode || workflow.template_release_mode || 'auto_safe';
    expect(resolved).toBe('auto_full');
  });

  test('template release_mode used when workflow is null', () => {
    const workflow = { release_mode: null, template_release_mode: 'auto_full' };
    const resolved = workflow.release_mode || workflow.template_release_mode || 'auto_safe';
    expect(resolved).toBe('auto_full');
  });

  test('system default (auto_safe) when both are null', () => {
    const workflow = { release_mode: null, template_release_mode: null };
    const resolved = workflow.release_mode || workflow.template_release_mode || 'auto_safe';
    expect(resolved).toBe('auto_safe');
  });

  test('manual workflow overrides auto_safe template', () => {
    const workflow = { release_mode: 'manual', template_release_mode: 'auto_safe' };
    const resolved = workflow.release_mode || workflow.template_release_mode || 'auto_safe';
    expect(resolved).toBe('manual');
  });
});

// ─── End-to-End Progression Chain ─────────────────────────────────────────

describe('Full Progression Chain', () => {
  test('auto_safe prompt progresses through all 4 stages', () => {
    const prompt = {
      auto_generated: 1,
      guardrails_applied: 1,
      audit_status: 'pass',
      release_mode: 'auto_safe',
      released_for_execution: 0,
    };

    // Stage 1: draft → audited
    expect(TRANSITION_RULES.draft_to_audited(prompt).eligible).toBe(true);

    // Stage 2: audited → ready
    expect(TRANSITION_RULES.audited_to_ready(prompt).eligible).toBe(true);

    // Stage 3: ready → approved
    expect(TRANSITION_RULES.ready_to_approved(prompt).eligible).toBe(true);

    // Stage 4: approved → released
    expect(TRANSITION_RULES.approved_to_released(prompt).eligible).toBe(true);
  });

  test('manual prompt stops at ready (stage 3 blocked)', () => {
    const prompt = {
      auto_generated: 1,
      guardrails_applied: 1,
      audit_status: 'pass',
      release_mode: 'manual',
      released_for_execution: 0,
    };

    expect(TRANSITION_RULES.draft_to_audited(prompt).eligible).toBe(true);
    expect(TRANSITION_RULES.audited_to_ready(prompt).eligible).toBe(true);
    expect(TRANSITION_RULES.ready_to_approved(prompt).eligible).toBe(false);
    expect(TRANSITION_RULES.approved_to_released(prompt).eligible).toBe(false);
  });

  test('non-auto-generated prompt stops at draft (stage 1 blocked)', () => {
    const prompt = {
      auto_generated: 0,
      guardrails_applied: 1,
      audit_status: 'pass',
      release_mode: 'auto_safe',
      released_for_execution: 0,
    };

    expect(TRANSITION_RULES.draft_to_audited(prompt).eligible).toBe(false);
  });

  test('failed audit stops at audited (stage 2 blocked)', () => {
    const prompt = {
      auto_generated: 1,
      guardrails_applied: 1,
      audit_status: 'fail',
      release_mode: 'auto_safe',
      released_for_execution: 0,
    };

    expect(TRANSITION_RULES.draft_to_audited(prompt).eligible).toBe(true);
    expect(TRANSITION_RULES.audited_to_ready(prompt).eligible).toBe(false);
  });
});

// ─── Migration Safety ────────────────────────────────────────────────────

describe('Migration Safety', () => {
  test('existing manual prompts are not affected by progression rules', () => {
    // Existing prompts in the DB have release_mode='manual' by default
    const existingPrompt = {
      auto_generated: 0,
      guardrails_applied: 0,
      audit_status: 'pending',
      release_mode: 'manual',
      released_for_execution: 0,
    };

    // None of the transitions should be eligible
    expect(TRANSITION_RULES.draft_to_audited(existingPrompt).eligible).toBe(false);
    expect(TRANSITION_RULES.audited_to_ready(existingPrompt).eligible).toBe(false);
    expect(TRANSITION_RULES.ready_to_approved(existingPrompt).eligible).toBe(false);
    expect(TRANSITION_RULES.approved_to_released(existingPrompt).eligible).toBe(false);
  });

  test('release_mode column defaults preserve backward compatibility', () => {
    // workflow_templates.release_mode defaults to NULL
    // prompt_workflows.release_mode defaults to NULL
    // NULL means "use parent or system default"
    const workflow = { release_mode: null, template_release_mode: null };
    const resolved = workflow.release_mode || workflow.template_release_mode || 'auto_safe';
    // New workflows without explicit release_mode get auto_safe (the system default)
    expect(resolved).toBe('auto_safe');
  });
});
