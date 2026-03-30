/**
 * Prompt Audit Service
 *
 * Mandatory guardrail enforcement layer for the Prompt Workflow System.
 * Every prompt must pass this audit before it can be approved or executed.
 *
 * Validates:
 * 1. Required structural sections present in prompt_text
 * 2. No prohibited shortcut/fallback language
 * 3. guardrails_applied flag is set
 *
 * This is server-side enforcement — not advisory, not UI-only.
 */

const { getAppPool } = require('../config/db');

// ─── Required Sections ──────────────────────────────────────────────────────
// A valid prompt MUST contain ALL of these section markers.

const REQUIRED_SECTIONS = [
  { key: 'METADATA',                 pattern: /\[METADATA\]/i },
  { key: 'CRITICAL EXECUTION RULES', pattern: /CRITICAL\s+EXECUTION\s+RULES/i },
  { key: 'SYSTEM PRIORITIES',        pattern: /SYSTEM\s+PRIORITIES/i },
  { key: 'TASK',                     pattern: /\bTASK\s*:/i },
  { key: 'REQUIREMENTS',             pattern: /\bREQUIREMENTS\s*:/i },
  { key: 'OUTPUT REQUIREMENTS',      pattern: /OUTPUT\s+REQUIREMENTS\s*:/i },
  { key: 'PROHIBITIONS',             pattern: /\bPROHIBITIONS\s*:/i },
  { key: 'FINAL REQUIREMENT',        pattern: /FINAL\s+REQUIREMENT\s*:/i },
];

// ─── Prohibited Language ────────────────────────────────────────────────────
// Prompts containing these phrases are auto-rejected.
// Each entry: { phrase (display), pattern (regex) }

const PROHIBITED_PHRASES = [
  { phrase: 'fallback',                pattern: /\bfallback\b/i },
  { phrase: 'temporary fix',          pattern: /\btemporary\s+fix\b/i },
  { phrase: 'workaround',             pattern: /\bworkaround\b/i },
  { phrase: 'just use',               pattern: /\bjust\s+use\b/i },
  { phrase: 'if this fails, do X instead', pattern: /if\s+this\s+fails\s*,?\s*do/i },
  { phrase: 'for now',                pattern: /\bfor\s+now\b/i },
  { phrase: 'good enough',            pattern: /\bgood\s+enough\b/i },
  { phrase: 'partial implementation', pattern: /\bpartial\s+implementation\b/i },
  { phrase: 'mock it for now',        pattern: /\bmock\s+it\s+for\s+now\b/i },
  { phrase: 'simplified version',     pattern: /\bsimplified\s+version\b/i },
  { phrase: 'placeholder',            pattern: /\bplaceholder\b/i },
  { phrase: 'skip for now',           pattern: /\bskip\s+for\s+now\b/i },
  { phrase: 'hack',                   pattern: /\bhack\b/i },
  { phrase: 'quick fix',              pattern: /\bquick\s+fix\b/i },
];

// ─── Audit Engine ───────────────────────────────────────────────────────────

/**
 * Perform structural and language audit on a prompt's text.
 * Returns { pass: boolean, sections: {...}, prohibited: [...], notes: string[] }
 */
function auditPromptText(promptText) {
  const notes = [];
  let pass = true;

  // 1. Check required sections
  const sections = {};
  const missingSections = [];

  for (const sec of REQUIRED_SECTIONS) {
    const found = sec.pattern.test(promptText);
    sections[sec.key] = found;
    if (!found) {
      missingSections.push(sec.key);
    }
  }

  if (missingSections.length > 0) {
    pass = false;
    notes.push(
      `MISSING REQUIRED SECTIONS (${missingSections.length}): ${missingSections.join(', ')}. ` +
      'Every prompt must contain: [METADATA], CRITICAL EXECUTION RULES, SYSTEM PRIORITIES, ' +
      'TASK, REQUIREMENTS, OUTPUT REQUIREMENTS, PROHIBITIONS, FINAL REQUIREMENT.'
    );
  }

  // 2. Check for prohibited shortcut/fallback language
  const prohibitedFound = [];

  for (const rule of PROHIBITED_PHRASES) {
    const match = promptText.match(rule.pattern);
    if (match) {
      prohibitedFound.push({
        phrase: rule.phrase,
        matched: match[0],
        index: match.index,
        context: promptText.substring(
          Math.max(0, match.index - 30),
          Math.min(promptText.length, match.index + match[0].length + 30)
        ).trim(),
      });
    }
  }

  if (prohibitedFound.length > 0) {
    pass = false;
    const phrases = prohibitedFound.map(p => `"${p.phrase}"`).join(', ');
    notes.push(
      `PROHIBITED LANGUAGE DETECTED (${prohibitedFound.length}): ${phrases}. ` +
      'Prompts must not contain shortcut, fallback, or workaround language.'
    );
    for (const p of prohibitedFound) {
      notes.push(`  → "${p.matched}" found near: "...${p.context}..."`);
    }
  }

  // 3. Check OUTPUT REQUIREMENTS section has actual content (not just header)
  if (sections['OUTPUT REQUIREMENTS']) {
    const outputMatch = promptText.match(/OUTPUT\s+REQUIREMENTS\s*:?\s*\n([\s\S]*?)(?=\n---|\nPROHIBITIONS|\nFINAL\s+REQUIREMENT|$)/i);
    if (outputMatch) {
      const content = outputMatch[1].trim();
      if (content.length < 20) {
        pass = false;
        notes.push(
          'OUTPUT REQUIREMENTS section exists but has insufficient content ' +
          `(${content.length} chars). Must define explicit, measurable outputs.`
        );
      }
    }
  }

  // 4. Check PROHIBITIONS section has actual content
  if (sections['PROHIBITIONS']) {
    const prohibMatch = promptText.match(/PROHIBITIONS\s*:?\s*\n([\s\S]*?)(?=\n---|\nFINAL\s+REQUIREMENT|$)/i);
    if (prohibMatch) {
      const content = prohibMatch[1].trim();
      if (content.length < 20) {
        pass = false;
        notes.push(
          'PROHIBITIONS section exists but has insufficient content ' +
          `(${content.length} chars). Must define explicit prohibitions.`
        );
      }
    }
  }

  // 5. Check TASK section has explicit scope (not ambiguous)
  if (sections['TASK']) {
    const taskMatch = promptText.match(/TASK\s*:?\s*\n([\s\S]*?)(?=\n---|\nREQUIREMENTS|$)/i);
    if (taskMatch) {
      const content = taskMatch[1].trim();
      if (content.length < 30) {
        pass = false;
        notes.push(
          'TASK section is too brief to define unambiguous scope ' +
          `(${content.length} chars). Must clearly define what is being built.`
        );
      }
    }
  }

  // 6. Check guardrails flag (will be validated separately with the prompt record)

  return {
    pass,
    sections,
    missing_sections: missingSections,
    prohibited_language: prohibitedFound,
    notes,
    checked_at: new Date().toISOString(),
    section_count: Object.values(sections).filter(Boolean).length,
    total_required: REQUIRED_SECTIONS.length,
  };
}

// ─── Database Operations ────────────────────────────────────────────────────

/**
 * Run audit on a prompt and persist results.
 * @param {string} promptId - UUID of the prompt
 * @param {string} actor - who triggered the audit
 * @returns {object} - the audit result
 */
async function runAudit(promptId, actor) {
  const pool = getAppPool();

  // Get the prompt
  const [rows] = await pool.query(
    'SELECT * FROM om_prompt_registry WHERE id = ?',
    [promptId]
  );
  if (rows.length === 0) {
    throw new Error(`Prompt not found: ${promptId}`);
  }

  const prompt = rows[0];

  // Cannot audit verified prompts (immutable)
  if (prompt.status === 'verified') {
    throw new Error('Cannot audit a verified prompt — it is immutable');
  }

  // Run the audit engine
  const result = auditPromptText(prompt.prompt_text);

  // Additional check: guardrails_applied must be true
  if (!prompt.guardrails_applied) {
    result.pass = false;
    result.notes.push(
      'GUARDRAILS NOT APPLIED: guardrails_applied flag is false. ' +
      'All prompts must have guardrails enabled.'
    );
  }

  // Determine audit_status
  const auditStatus = result.pass ? 'pass' : 'fail';

  // Persist
  await pool.query(
    `UPDATE om_prompt_registry SET
       audit_status = ?,
       audit_result = ?,
       audit_notes = ?,
       audited_at = NOW(),
       audited_by = ?
     WHERE id = ?`,
    [
      auditStatus,
      JSON.stringify(result),
      result.notes.join('\n'),
      actor,
      promptId,
    ]
  );

  // If audit passed and prompt is in draft, transition to audited
  if (result.pass && prompt.status === 'draft') {
    await pool.query(
      `UPDATE om_prompt_registry SET status = 'audited' WHERE id = ?`,
      [promptId]
    );
  }

  // If audit failed and prompt was previously audited, revert to draft
  if (!result.pass && prompt.status === 'audited') {
    await pool.query(
      `UPDATE om_prompt_registry SET status = 'draft' WHERE id = ?`,
      [promptId]
    );
  }

  // Log audit to system_logs
  await pool.query(
    `INSERT INTO system_logs
       (timestamp, level, source, message, meta, user_email, service, source_component)
     VALUES (NOW(), ?, 'prompt_audit', ?, ?, ?, 'omai', 'prompt_registry')`,
    [
      result.pass ? 'SUCCESS' : 'WARN',
      `[AUDIT_${auditStatus.toUpperCase()}] prompt=${promptId} sections=${result.section_count}/${result.total_required} prohibited=${result.prohibited_language.length}`,
      JSON.stringify({
        prompt_id: promptId,
        pass: result.pass,
        missing: result.missing_sections,
        prohibited_count: result.prohibited_language.length,
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
    audit: result,
    audit_status: auditStatus,
    prompt: updated[0],
  };
}

/**
 * Get the current audit status and result for a prompt.
 */
async function getAuditResult(promptId) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT id, audit_status, audit_result, audit_notes, audited_at, audited_by
     FROM om_prompt_registry WHERE id = ?`,
    [promptId]
  );
  if (rows.length === 0) {
    throw new Error(`Prompt not found: ${promptId}`);
  }

  const row = rows[0];
  return {
    prompt_id: row.id,
    audit_status: row.audit_status,
    audit_result: row.audit_result ? JSON.parse(row.audit_result) : null,
    audit_notes: row.audit_notes,
    audited_at: row.audited_at,
    audited_by: row.audited_by,
  };
}

/**
 * Check if a prompt has passed audit. Used by workflow service for gate enforcement.
 * Throws if audit has not passed.
 */
async function enforceAuditPass(promptId) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    'SELECT audit_status FROM om_prompt_registry WHERE id = ?',
    [promptId]
  );
  if (rows.length === 0) {
    throw new Error(`Prompt not found: ${promptId}`);
  }

  const { audit_status } = rows[0];

  if (audit_status !== 'pass') {
    throw new Error(
      `Audit gate blocked: audit_status is "${audit_status}". ` +
      'Prompt must pass audit before it can proceed. ' +
      (audit_status === 'pending'
        ? 'Run POST /api/prompts/:id/audit first.'
        : 'Fix the prompt and re-run audit.')
    );
  }
}

/**
 * Reset audit status to pending. Called when prompt_text is edited.
 */
async function resetAudit(promptId) {
  const pool = getAppPool();
  await pool.query(
    `UPDATE om_prompt_registry SET
       audit_status = 'pending',
       audit_result = NULL,
       audit_notes = NULL,
       audited_at = NULL,
       audited_by = NULL
     WHERE id = ?`,
    [promptId]
  );
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  runAudit,
  getAuditResult,
  enforceAuditPass,
  resetAudit,
  // Exposed for transparency — what we check
  REQUIRED_SECTIONS: REQUIRED_SECTIONS.map(s => s.key),
  PROHIBITED_PHRASES: PROHIBITED_PHRASES.map(p => p.phrase),
  // Pure function for testing
  auditPromptText,
};
