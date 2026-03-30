/**
 * Prompt Evaluation Service
 *
 * Evaluates the result of a completed prompt against its stated requirements.
 * Produces structured evaluation: classification, completion status, violations,
 * issues, blockers, and remaining work.
 *
 * This is server-side, deterministic evaluation — not conversational judgment.
 *
 * Evaluation rules:
 *   - evaluator_status = pass only if requirements met with no disqualifying violations
 *   - completion_status = complete only if ALL required outcomes present
 *   - completion_status = partial if some outcomes missing but real progress
 *   - completion_status = failed if materially incorrect or violates constraints
 *   - completion_status = blocked if stopped due to external dependency
 *
 * Violation detection:
 *   - Shortcut/fallback behavior
 *   - Alternate implementations instead of required approach
 *   - Partial implementations marked as complete
 *   - Missing required outputs
 *   - System drift (new patterns instead of reusing existing)
 */

const { getAppPool } = require('../config/db');

// ─── Violation Patterns ────────────────────────────────────────────────────
// Patterns that indicate shortcuts, workarounds, or incomplete implementation
// in execution results. Each has a key, description, and regex for detection.

const VIOLATION_PATTERNS = [
  { key: 'fallback_behavior',     desc: 'Fallback or workaround used instead of proper implementation', pattern: /\b(fallback|workaround|temporary fix|quick fix|hack)\b/i },
  { key: 'partial_implementation', desc: 'Partial implementation flagged as complete', pattern: /\b(partial(ly)?|incomplete|not yet|TODO|FIXME|stub(bed)?)\b/i },
  { key: 'placeholder_content',   desc: 'Placeholder content left in output', pattern: /\b(placeholder|lorem ipsum|example\.com|foo|bar|baz|dummy)\b/i },
  { key: 'skipped_requirement',   desc: 'Requirement explicitly skipped', pattern: /\b(skip(ped|ping)?|deferred|later|for now|good enough)\b/i },
  { key: 'mock_data',             desc: 'Mock or fake data used in non-test context', pattern: /\b(mock(ed|ing)?|fake|simulated|hardcoded)\b/i },
  { key: 'alternate_approach',    desc: 'Used a different approach than specified', pattern: /\b(instead|alternatively|different approach|opted for|chose to)\b/i },
  { key: 'simplified_version',    desc: 'Simplified version instead of full implementation', pattern: /\b(simplified|basic version|minimal|stripped down)\b/i },
  { key: 'error_suppression',     desc: 'Errors suppressed or silently handled', pattern: /\b(suppress(ed|ing)?|swall?ow(ed|ing)?|ignor(ed|ing) error|catch\s*\(\s*\)\s*\{?\s*\})/i },
];

// ─── Result Type Classification ────────────────────────────────────────────

const RESULT_TYPE_SIGNALS = {
  plan:           [/\b(plan|design|architect|proposal|strategy|roadmap)\b/i, /\b(will (create|build|implement))\b/i],
  implementation: [/\b(created?|built|implemented|added|wrote|developed)\b/i, /\b(file(s)?\s+(created|modified|added))\b/i],
  verification:   [/\b(verified|tested|confirmed|validated|checked)\b/i, /\b(all\s+tests?\s+pass)\b/i],
  correction:     [/\b(fixed|corrected|repaired|resolved|patched)\b/i, /\b(bug\s*fix|regression)\b/i],
  unblock:        [/\b(unblocked|resolved\s+blocker|dependency\s+(added|installed|resolved))\b/i],
  continuation:   [/\b(continued|resumed|picked up|remaining)\b/i],
  remediation:    [/\b(remediat|rework|rewrit|refactor|redo)\b/i],
};

// ─── Requirement Extraction ────────────────────────────────────────────────

/**
 * Extract explicit requirements from prompt_text.
 * Looks for REQUIREMENTS, OUTPUT REQUIREMENTS, and TASK sections.
 */
function extractRequirements(promptText) {
  const requirements = [];

  // Extract REQUIREMENTS section items
  const reqMatch = promptText.match(/REQUIREMENTS\s*:?\s*\n([\s\S]*?)(?=\n---|\nOUTPUT\s+REQUIREMENTS|\nPROHIBITIONS|\nFINAL\s+REQUIREMENT|$)/i);
  if (reqMatch) {
    const lines = reqMatch[1].split('\n').filter(l => l.trim());
    for (const line of lines) {
      const cleaned = line.replace(/^\s*[-*\d.]+\s*/, '').trim();
      if (cleaned.length > 5) {
        requirements.push({ source: 'REQUIREMENTS', text: cleaned });
      }
    }
  }

  // Extract OUTPUT REQUIREMENTS section items
  const outMatch = promptText.match(/OUTPUT\s+REQUIREMENTS\s*:?\s*\n([\s\S]*?)(?=\n---|\nPROHIBITIONS|\nFINAL\s+REQUIREMENT|$)/i);
  if (outMatch) {
    const lines = outMatch[1].split('\n').filter(l => l.trim());
    for (const line of lines) {
      const cleaned = line.replace(/^\s*[-*\d.]+\s*/, '').trim();
      if (cleaned.length > 5) {
        requirements.push({ source: 'OUTPUT_REQUIREMENTS', text: cleaned });
      }
    }
  }

  // Extract TASK section as high-level requirement
  const taskMatch = promptText.match(/TASK\s*:?\s*\n([\s\S]*?)(?=\n---|\nREQUIREMENTS|$)/i);
  if (taskMatch) {
    const taskText = taskMatch[1].trim();
    if (taskText.length > 10) {
      requirements.push({ source: 'TASK', text: taskText.substring(0, 500) });
    }
  }

  return requirements;
}

/**
 * Extract prohibitions from prompt_text.
 */
function extractProhibitions(promptText) {
  const prohibitions = [];
  const match = promptText.match(/PROHIBITIONS\s*:?\s*\n([\s\S]*?)(?=\n---|\nFINAL\s+REQUIREMENT|$)/i);
  if (match) {
    const lines = match[1].split('\n').filter(l => l.trim());
    for (const line of lines) {
      const cleaned = line.replace(/^\s*[-*\d.]+\s*/, '').trim();
      if (cleaned.length > 5) {
        prohibitions.push(cleaned);
      }
    }
  }
  return prohibitions;
}

// ─── Core Evaluation Engine ────────────────────────────────────────────────

/**
 * Evaluate execution result against prompt requirements.
 * Returns structured evaluation with no vague assessments.
 *
 * @param {string} promptText - The original prompt text
 * @param {object|string} executionResult - The execution output
 * @param {object|string} verificationResult - The verification output (if any)
 * @returns {object} Structured evaluation
 */
function evaluateResult(promptText, executionResult, verificationResult) {
  const resultStr = typeof executionResult === 'string'
    ? executionResult
    : JSON.stringify(executionResult || {});

  const verifyStr = typeof verificationResult === 'string'
    ? verificationResult
    : JSON.stringify(verificationResult || {});

  const requirements = extractRequirements(promptText);
  const prohibitions = extractProhibitions(promptText);

  // ─── 1. Classify result_type ───────────────────────────────────────
  let result_type = 'implementation'; // default
  let maxSignals = 0;

  for (const [type, patterns] of Object.entries(RESULT_TYPE_SIGNALS)) {
    let signals = 0;
    for (const pat of patterns) {
      if (pat.test(resultStr)) signals++;
    }
    if (signals > maxSignals) {
      maxSignals = signals;
      result_type = type;
    }
  }

  // ─── 2. Detect violations ─────────────────────────────────────────
  const violations_found = [];

  for (const vp of VIOLATION_PATTERNS) {
    const match = resultStr.match(vp.pattern);
    if (match) {
      // Extract surrounding context
      const idx = match.index;
      const context = resultStr.substring(
        Math.max(0, idx - 50),
        Math.min(resultStr.length, idx + match[0].length + 50)
      ).trim();

      violations_found.push({
        key: vp.key,
        description: vp.desc,
        matched: match[0],
        context: context,
      });
    }
  }

  // Check prohibitions against execution result
  for (const prohibition of prohibitions) {
    // Create a simple keyword pattern from the prohibition
    const keywords = prohibition.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);

    if (keywords.length >= 2) {
      // Check if multiple prohibition keywords appear in the result
      const matchingKeywords = keywords.filter(kw =>
        resultStr.toLowerCase().includes(kw)
      );
      if (matchingKeywords.length >= Math.ceil(keywords.length * 0.6)) {
        violations_found.push({
          key: 'prohibition_match',
          description: `Potential prohibition violation: "${prohibition}"`,
          matched: matchingKeywords.join(', '),
          context: `Prohibition keywords found in result: ${matchingKeywords.join(', ')}`,
        });
      }
    }
  }

  // ─── 3. Evaluate requirement completion ───────────────────────────
  const completed_outcomes = [];
  const remaining_outcomes = [];
  const issues_found = [];

  for (const req of requirements) {
    // Build keywords from the requirement
    const reqKeywords = req.text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);

    if (reqKeywords.length === 0) continue;

    // Check how many keywords from this requirement appear in the result
    const matchCount = reqKeywords.filter(kw =>
      resultStr.toLowerCase().includes(kw)
    ).length;

    const matchRatio = matchCount / reqKeywords.length;

    if (matchRatio >= 0.5) {
      completed_outcomes.push({
        source: req.source,
        requirement: req.text.substring(0, 200),
        confidence: Math.round(matchRatio * 100),
      });
    } else {
      remaining_outcomes.push({
        source: req.source,
        requirement: req.text.substring(0, 200),
        confidence: Math.round(matchRatio * 100),
      });
    }
  }

  // ─── 4. Extract changed files ─────────────────────────────────────
  const changed_files = [];
  // Look for file paths in execution result
  const filePatterns = [
    /(?:created?|modified|updated|wrote|added|deleted|removed)\s*:?\s*[`"']?([a-zA-Z0-9_/.-]+\.[a-zA-Z]{1,5})[`"']?/gi,
    /[`"']([a-zA-Z0-9_/.-]+\/[a-zA-Z0-9_.-]+\.[a-zA-Z]{1,5})[`"']/g,
  ];

  const seenFiles = new Set();
  for (const pat of filePatterns) {
    let m;
    while ((m = pat.exec(resultStr)) !== null) {
      const file = m[1];
      if (!seenFiles.has(file) && file.length > 3 && file.length < 200) {
        seenFiles.add(file);
        changed_files.push(file);
      }
    }
  }

  // ─── 5. Detect blockers ───────────────────────────────────────────
  const blockers_found = [];
  const blockerPatterns = [
    { pattern: /\b(blocked\s+by|waiting\s+on|depends\s+on|requires|prerequisite|need(s|ed)?\s+(to|first))\b/i, type: 'dependency' },
    { pattern: /\b(permission\s+denied|access\s+denied|unauthorized|forbidden)\b/i, type: 'access' },
    { pattern: /\b(not\s+found|missing\s+(file|module|package|dependency))\b/i, type: 'missing_resource' },
    { pattern: /\b(timeout|timed?\s*out|connection\s+(refused|failed))\b/i, type: 'infrastructure' },
  ];

  for (const bp of blockerPatterns) {
    const match = resultStr.match(bp.pattern);
    if (match) {
      const idx = match.index;
      const context = resultStr.substring(
        Math.max(0, idx - 40),
        Math.min(resultStr.length, idx + match[0].length + 40)
      ).trim();
      blockers_found.push({
        type: bp.type,
        matched: match[0],
        context: context,
      });
    }
  }

  // ─── 6. Determine completion_status ───────────────────────────────
  let completion_status;

  if (blockers_found.length > 0 && completed_outcomes.length < requirements.length * 0.3) {
    completion_status = 'blocked';
  } else if (violations_found.some(v => ['fallback_behavior', 'partial_implementation', 'placeholder_content', 'simplified_version'].includes(v.key))) {
    // Material violations → failed
    completion_status = 'failed';
  } else if (remaining_outcomes.length === 0 && requirements.length > 0) {
    completion_status = 'complete';
  } else if (completed_outcomes.length > 0 && remaining_outcomes.length > 0) {
    completion_status = 'partial';
  } else if (requirements.length === 0) {
    // No extractable requirements — if result exists, treat as complete
    completion_status = resultStr.length > 50 ? 'complete' : 'failed';
  } else {
    completion_status = remaining_outcomes.length > completed_outcomes.length ? 'failed' : 'partial';
  }

  // ─── 7. Determine evaluator_status ────────────────────────────────
  let evaluator_status;

  // Disqualifying violations → fail regardless
  const disqualifyingViolations = violations_found.filter(v =>
    ['fallback_behavior', 'partial_implementation', 'placeholder_content', 'mock_data', 'simplified_version', 'error_suppression'].includes(v.key)
  );

  if (disqualifyingViolations.length > 0) {
    evaluator_status = 'fail';
  } else if (completion_status === 'failed') {
    evaluator_status = 'fail';
  } else if (completion_status === 'blocked') {
    evaluator_status = 'fail';
  } else if (completion_status === 'complete') {
    evaluator_status = 'pass';
  } else if (completion_status === 'partial') {
    // Partial can pass if no violations and real progress made
    evaluator_status = violations_found.length === 0 ? 'pass' : 'fail';
  } else {
    evaluator_status = 'fail';
  }

  // ─── 8. Build evaluator notes ─────────────────────────────────────
  const notes = [];
  notes.push(`Result type: ${result_type}`);
  notes.push(`Completion: ${completion_status} (${completed_outcomes.length}/${requirements.length} outcomes met)`);
  notes.push(`Evaluator: ${evaluator_status}`);

  if (violations_found.length > 0) {
    notes.push(`\nVIOLATIONS (${violations_found.length}):`);
    for (const v of violations_found) {
      notes.push(`  - [${v.key}] ${v.description}: "${v.matched}"`);
    }
  }

  if (blockers_found.length > 0) {
    notes.push(`\nBLOCKERS (${blockers_found.length}):`);
    for (const b of blockers_found) {
      notes.push(`  - [${b.type}] ${b.matched}`);
    }
  }

  if (remaining_outcomes.length > 0) {
    notes.push(`\nREMAINING OUTCOMES (${remaining_outcomes.length}):`);
    for (const r of remaining_outcomes) {
      notes.push(`  - [${r.source}] ${r.requirement.substring(0, 100)}`);
    }
  }

  if (issues_found.length > 0) {
    notes.push(`\nISSUES (${issues_found.length}):`);
    for (const i of issues_found) {
      notes.push(`  - ${i}`);
    }
  }

  return {
    result_type,
    completion_status,
    evaluator_status,
    evaluator_notes: notes.join('\n'),
    issues_found,
    blockers_found,
    violations_found,
    completed_outcomes,
    remaining_outcomes,
    changed_files,
    evaluated_at: new Date().toISOString(),
    requirements_count: requirements.length,
    prohibitions_count: prohibitions.length,
  };
}

// ─── Database Operations ────────────────────────────────────────────────────

/**
 * Run evaluation on a completed prompt and persist results.
 * Can only evaluate prompts in 'complete' or 'verified' status.
 */
async function runEvaluation(promptId, actor) {
  const pool = getAppPool();

  const [rows] = await pool.query(
    'SELECT * FROM om_prompt_registry WHERE id = ?',
    [promptId]
  );
  if (rows.length === 0) {
    throw new Error(`Prompt not found: ${promptId}`);
  }

  const prompt = rows[0];

  // Can only evaluate complete or verified prompts
  if (!['complete', 'verified'].includes(prompt.status)) {
    throw new Error(
      `Cannot evaluate: prompt is "${prompt.status}", must be "complete" or "verified". ` +
      'Evaluation requires execution to have finished.'
    );
  }

  // Must have execution_result
  if (!prompt.execution_result) {
    throw new Error(
      'Cannot evaluate: no execution_result found. ' +
      'The prompt must have been executed with a recorded result.'
    );
  }

  // Parse execution and verification results
  let execResult;
  try { execResult = JSON.parse(prompt.execution_result); } catch { execResult = prompt.execution_result; }
  let verifyResult;
  try { verifyResult = prompt.verification_result ? JSON.parse(prompt.verification_result) : null; } catch { verifyResult = prompt.verification_result; }

  // Run evaluation engine
  const evaluation = evaluateResult(prompt.prompt_text, execResult, verifyResult);

  // Persist evaluation
  await pool.query(
    `UPDATE om_prompt_registry SET
       result_type = ?,
       completion_status = ?,
       evaluator_status = ?,
       evaluator_notes = ?,
       issues_found = ?,
       blockers_found = ?,
       violations_found = ?,
       completed_outcomes = ?,
       remaining_outcomes = ?,
       changed_files = ?,
       evaluated_at = NOW(),
       evaluated_by = ?
     WHERE id = ?`,
    [
      evaluation.result_type,
      evaluation.completion_status,
      evaluation.evaluator_status,
      evaluation.evaluator_notes,
      JSON.stringify(evaluation.issues_found),
      JSON.stringify(evaluation.blockers_found),
      JSON.stringify(evaluation.violations_found),
      JSON.stringify(evaluation.completed_outcomes),
      JSON.stringify(evaluation.remaining_outcomes),
      JSON.stringify(evaluation.changed_files),
      actor,
      promptId,
    ]
  );

  // Log evaluation
  await pool.query(
    `INSERT INTO system_logs
       (timestamp, level, source, message, meta, user_email, service, source_component)
     VALUES (NOW(), ?, 'prompt_evaluation', ?, ?, ?, 'omai', 'prompt_registry')`,
    [
      evaluation.evaluator_status === 'pass' ? 'SUCCESS' : 'WARN',
      `[EVAL_${evaluation.evaluator_status.toUpperCase()}] prompt=${promptId} completion=${evaluation.completion_status} violations=${evaluation.violations_found.length}`,
      JSON.stringify({
        prompt_id: promptId,
        result_type: evaluation.result_type,
        completion_status: evaluation.completion_status,
        evaluator_status: evaluation.evaluator_status,
        violations_count: evaluation.violations_found.length,
        blockers_count: evaluation.blockers_found.length,
        completed_count: evaluation.completed_outcomes.length,
        remaining_count: evaluation.remaining_outcomes.length,
      }),
      actor,
    ]
  );

  // Return full result with updated prompt
  const [updated] = await pool.query(
    'SELECT * FROM om_prompt_registry WHERE id = ?',
    [promptId]
  );

  return {
    evaluation,
    prompt: updated[0],
  };
}

/**
 * Get the current evaluation result for a prompt.
 */
async function getEvaluation(promptId) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT id, evaluator_status, evaluator_notes, result_type, completion_status,
            issues_found, blockers_found, violations_found,
            completed_outcomes, remaining_outcomes, changed_files,
            evaluated_at, evaluated_by, next_prompt_id
     FROM om_prompt_registry WHERE id = ?`,
    [promptId]
  );
  if (rows.length === 0) {
    throw new Error(`Prompt not found: ${promptId}`);
  }

  const row = rows[0];
  const parseField = (val) => {
    if (!val) return null;
    try { return JSON.parse(val); } catch { return val; }
  };

  return {
    prompt_id: row.id,
    evaluator_status: row.evaluator_status,
    evaluator_notes: row.evaluator_notes,
    result_type: row.result_type,
    completion_status: row.completion_status,
    issues_found: parseField(row.issues_found),
    blockers_found: parseField(row.blockers_found),
    violations_found: parseField(row.violations_found),
    completed_outcomes: parseField(row.completed_outcomes),
    remaining_outcomes: parseField(row.remaining_outcomes),
    changed_files: parseField(row.changed_files),
    evaluated_at: row.evaluated_at,
    evaluated_by: row.evaluated_by,
    next_prompt_id: row.next_prompt_id,
  };
}

/**
 * Enforce that a prompt has been evaluated with a pass.
 * Used as a gate before next-prompt generation.
 */
async function enforceEvaluated(promptId) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    'SELECT evaluator_status, completion_status FROM om_prompt_registry WHERE id = ?',
    [promptId]
  );
  if (rows.length === 0) {
    throw new Error(`Prompt not found: ${promptId}`);
  }

  if (!rows[0].evaluator_status) {
    throw new Error(
      'Evaluation required: this prompt has not been evaluated yet. ' +
      'Run POST /api/prompts/:id/evaluate first.'
    );
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  runEvaluation,
  getEvaluation,
  enforceEvaluated,
  // Pure functions for testing
  evaluateResult,
  extractRequirements,
  extractProhibitions,
  // Constants for transparency
  VIOLATION_PATTERNS: VIOLATION_PATTERNS.map(v => ({ key: v.key, desc: v.desc })),
};
