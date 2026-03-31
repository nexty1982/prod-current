/**
 * Tests for Workflow Dashboard Service — Prompt 026 enhancements
 *
 * Covers:
 *   - Classification correctness (workflow, exception, ready items)
 *   - Priority sorting
 *   - Activity stream classification
 *   - Resume action inference
 */

const {
  classifyWorkflow,
  classifyException,
  classifyReadyItem,
  classifyActivity,
  _inferResumeAction,
} = require('../workflowDashboardService');

// ─── classifyWorkflow ──────────────────────────────────────────────────────

describe('classifyWorkflow', () => {
  const base = {
    id: 1, name: 'Test', component: 'x', status: 'active',
    step_count: 4, verified: 0, executing: 0, blocked: 0,
    progress_pct: 0, has_exceptions: false,
    autonomy_paused: false, autonomy_pause_reason: null, manual_only: false,
    current_step: null, steps: [],
  };

  test('blocked steps → action_required', () => {
    expect(classifyWorkflow({ ...base, blocked: 2 })).toBe('action_required');
  });

  test('has_exceptions → action_required', () => {
    expect(classifyWorkflow({ ...base, has_exceptions: true })).toBe('action_required');
  });

  test('autonomy_paused → action_required', () => {
    expect(classifyWorkflow({ ...base, autonomy_paused: true })).toBe('action_required');
  });

  test('manual_only → action_required', () => {
    expect(classifyWorkflow({ ...base, manual_only: true })).toBe('action_required');
  });

  test('executing steps → monitor', () => {
    expect(classifyWorkflow({ ...base, executing: 1 })).toBe('monitor');
  });

  test('partial progress → monitor', () => {
    expect(classifyWorkflow({ ...base, verified: 2, progress_pct: 50 })).toBe('monitor');
  });

  test('100% verified → safe_to_ignore', () => {
    expect(classifyWorkflow({ ...base, verified: 4, progress_pct: 100 })).toBe('safe_to_ignore');
  });

  test('approved + not manual → safe_to_ignore', () => {
    expect(classifyWorkflow({ ...base, status: 'approved' })).toBe('safe_to_ignore');
  });

  test('approved + manual_only → action_required (manual takes precedence)', () => {
    expect(classifyWorkflow({ ...base, status: 'approved', manual_only: true })).toBe('action_required');
  });

  test('no progress, no flags → monitor (default)', () => {
    expect(classifyWorkflow({ ...base })).toBe('monitor');
  });
});

// ─── classifyException ─────────────────────────────────────────────────────

describe('classifyException', () => {
  const base = {
    id: 1, title: 'Test', component: 'x',
    queue_status: 'pending', escalation_required: false,
    degradation_flag: false, overdue: false,
    confidence_level: 'high', classification: 'monitor',
    exception_types: [], blocked_reasons: [],
  };

  test('escalation_required → action_required', () => {
    expect(classifyException({ ...base, escalation_required: true })).toBe('action_required');
  });

  test('blocked → action_required', () => {
    expect(classifyException({ ...base, queue_status: 'blocked' })).toBe('action_required');
  });

  test('overdue → action_required', () => {
    expect(classifyException({ ...base, overdue: true })).toBe('action_required');
  });

  test('degradation_flag → monitor', () => {
    expect(classifyException({ ...base, degradation_flag: true })).toBe('monitor');
  });

  test('low confidence → monitor', () => {
    expect(classifyException({ ...base, confidence_level: 'low' })).toBe('monitor');
  });

  test('escalation takes priority over degradation', () => {
    expect(classifyException({ ...base, escalation_required: true, degradation_flag: true })).toBe('action_required');
  });

  test('no flags → monitor (default)', () => {
    expect(classifyException({ ...base })).toBe('monitor');
  });
});

// ─── classifyReadyItem ─────────────────────────────────────────────────────

describe('classifyReadyItem', () => {
  const base = {
    id: 1, title: 'Test', component: 'x',
    queue_status: 'ready_for_release', release_mode: 'auto_full',
    can_auto_release: true, needs_review: false, is_overdue: false,
    classification: 'safe_to_ignore',
  };

  test('needs_review → action_required', () => {
    expect(classifyReadyItem({ ...base, needs_review: true })).toBe('action_required');
  });

  test('release_mode=manual → action_required', () => {
    expect(classifyReadyItem({ ...base, release_mode: 'manual' })).toBe('action_required');
  });

  test('overdue → action_required', () => {
    expect(classifyReadyItem({ ...base, is_overdue: true })).toBe('action_required');
  });

  test('can_auto_release → safe_to_ignore', () => {
    expect(classifyReadyItem({ ...base })).toBe('safe_to_ignore');
  });

  test('not auto-releasable, not needing review → monitor', () => {
    expect(classifyReadyItem({ ...base, can_auto_release: false })).toBe('monitor');
  });
});

// ─── classifyActivity ──────────────────────────────────────────────────────

describe('classifyActivity', () => {
  test('pause events marked high importance', () => {
    const events = [{ message: 'Autonomy PAUSED on step 3', timestamp: new Date().toISOString(), level: 'WARN', source: 'autonomous_advance' }];
    const result = classifyActivity(events);
    expect(result[0].importance).toBe('high');
  });

  test('release events marked high importance', () => {
    const events = [{ message: 'Prompt released for execution', timestamp: new Date().toISOString(), level: 'INFO', source: 'prompt_release' }];
    const result = classifyActivity(events);
    expect(result[0].importance).toBe('high');
  });

  test('failure events marked high importance', () => {
    const events = [{ message: 'Execution failed with error', timestamp: new Date().toISOString(), level: 'ERROR', source: 'prompt_execution' }];
    const result = classifyActivity(events);
    expect(result[0].importance).toBe('high');
  });

  test('blocked events marked high importance', () => {
    const events = [{ message: 'Prompt blocked by dependency', timestamp: new Date().toISOString(), level: 'WARN', source: 'prompt_queue' }];
    const result = classifyActivity(events);
    expect(result[0].importance).toBe('high');
  });

  test('success/complete events marked medium importance', () => {
    const events = [{ message: 'Step completed successfully', timestamp: new Date().toISOString(), level: 'INFO', source: 'prompt_scoring' }];
    const result = classifyActivity(events);
    expect(result[0].importance).toBe('medium');
  });

  test('generic events marked normal importance', () => {
    const events = [{ message: 'Checking workflow status', timestamp: new Date().toISOString(), level: 'INFO', source: 'prompt_audit' }];
    const result = classifyActivity(events);
    expect(result[0].importance).toBe('normal');
  });

  test('empty array returns empty array', () => {
    expect(classifyActivity([])).toEqual([]);
  });
});

// ─── _inferResumeAction ────────────────────────────────────────────────────

describe('_inferResumeAction', () => {
  test('G1 → confidence guidance', () => {
    expect(_inferResumeAction({ gate_id: 'G1' })).toMatch(/confidence/i);
  });

  test('G5 → escalation guidance', () => {
    expect(_inferResumeAction({ gate_id: 'G5' })).toMatch(/escalation/i);
  });

  test('G10 → resume workflow', () => {
    expect(_inferResumeAction({ gate_id: 'G10' })).toMatch(/resume/i);
  });

  test('G13 → release_mode guidance', () => {
    expect(_inferResumeAction({ gate_id: 'G13' })).toMatch(/release_mode/i);
  });

  test('nested failed_gates → uses first gate', () => {
    expect(_inferResumeAction({ failed_gates: [{ id: 'G4' }] })).toMatch(/degradation/i);
  });

  test('null meta → generic guidance', () => {
    expect(_inferResumeAction(null)).toMatch(/resolve/i);
  });

  test('unknown gate → generic guidance', () => {
    expect(_inferResumeAction({ gate_id: 'G99' })).toMatch(/resolve/i);
  });

  test('all 13 gates have specific guidance', () => {
    for (let i = 1; i <= 13; i++) {
      const gateId = `G${i}`;
      const action = _inferResumeAction({ gate_id: gateId });
      expect(action).not.toBe('Resolve the blocking condition');
    }
  });
});

// ─── Priority Sorting ──────────────────────────────────────────────────────

describe('Priority Sorting', () => {
  test('action_required sorts before monitor', () => {
    const items = [
      { classification: 'monitor' },
      { classification: 'action_required' },
      { classification: 'safe_to_ignore' },
    ];
    const classOrder = { action_required: 0, monitor: 1, safe_to_ignore: 2 };
    const sorted = [...items].sort((a, b) => classOrder[a.classification] - classOrder[b.classification]);
    expect(sorted[0].classification).toBe('action_required');
    expect(sorted[1].classification).toBe('monitor');
    expect(sorted[2].classification).toBe('safe_to_ignore');
  });

  test('multiple action_required items stay together', () => {
    const items = [
      { classification: 'monitor', name: 'B' },
      { classification: 'action_required', name: 'C' },
      { classification: 'safe_to_ignore', name: 'A' },
      { classification: 'action_required', name: 'D' },
    ];
    const classOrder = { action_required: 0, monitor: 1, safe_to_ignore: 2 };
    const sorted = [...items].sort((a, b) => classOrder[a.classification] - classOrder[b.classification]);
    expect(sorted[0].classification).toBe('action_required');
    expect(sorted[1].classification).toBe('action_required');
    expect(sorted[2].classification).toBe('monitor');
    expect(sorted[3].classification).toBe('safe_to_ignore');
  });
});
