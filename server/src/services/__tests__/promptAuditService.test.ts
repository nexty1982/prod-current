#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptAuditService.js (OMD-1221)
 *
 * Server-side prompt audit engine.
 *
 * One external dep: `../config/db.getAppPool`. We stub it via require.cache
 * with a fake pool whose `query` method matches SQL by regex and returns
 * scriptable responses.
 *
 * Coverage:
 *   - auditPromptText (pure):
 *       · all required sections present + OK content → pass
 *       · missing sections → fail + missing_sections populated
 *       · prohibited phrases (fallback, workaround, hack, ...) → fail
 *       · OUTPUT REQUIREMENTS too short → fail
 *       · PROHIBITIONS too short → fail
 *       · TASK too short → fail
 *       · section_count / total_required counts
 *   - runAudit:
 *       · prompt not found → throws
 *       · verified prompt → throws (immutable)
 *       · guardrails_applied=false forces fail even if text passes
 *       · pass + status=draft → transitions to audited
 *       · fail + status=audited → reverts to draft
 *       · UPDATE om_prompt_registry audit columns written
 *       · INSERT system_logs row written
 *       · returns { audit, audit_status, prompt }
 *   - getAuditResult:
 *       · not found → throws
 *       · parses audit_result JSON
 *       · audit_result NULL → returns null
 *   - enforceAuditPass:
 *       · not found → throws
 *       · status=pass → no throw
 *       · status=pending → throws with "pending" hint
 *       · status=fail → throws with "re-run" hint
 *   - resetAudit: issues correct UPDATE
 *
 * Run: npx tsx server/src/services/__tests__/promptAuditService.test.ts
 */

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

// ── Fake pool ────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Responder = { match: RegExp; respond: (params: any[]) => any };
let responders: Responder[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of responders) {
      if (r.match.test(sql)) return r.respond(params);
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };

const path = require('path');
const dbDir = path.resolve(__dirname, '..', '..', 'config');
for (const ext of ['.js', '.ts']) {
  const p = path.join(dbDir, 'db' + ext);
  require.cache[p] = {
    id: p, filename: p, loaded: true, exports: dbStub,
  } as any;
}

function resetState() {
  queryLog.length = 0;
  responders = [];
}

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const {
  runAudit,
  getAuditResult,
  enforceAuditPass,
  resetAudit,
  REQUIRED_SECTIONS,
  PROHIBITED_PHRASES,
  auditPromptText,
} = require('../promptAuditService');

// ── Helpers ──────────────────────────────────────────────────────────
function validPromptText() {
  return [
    '[METADATA]',
    'author: tests',
    '',
    '---',
    'CRITICAL EXECUTION RULES',
    'Always follow instructions exactly.',
    '',
    '---',
    'SYSTEM PRIORITIES',
    'Correctness over speed.',
    '',
    '---',
    'TASK:',
    'Build a comprehensive unit test suite covering all edge cases.',
    '',
    '---',
    'REQUIREMENTS:',
    'Must cover every branch in the module.',
    '',
    '---',
    'OUTPUT REQUIREMENTS:',
    'Produce a single test file runnable via npx tsx.',
    '',
    '---',
    'PROHIBITIONS:',
    'Do not mutate production data structures during tests.',
    '',
    '---',
    'FINAL REQUIREMENT:',
    'All assertions must pass.',
  ].join('\n');
}

async function main() {

// ============================================================================
// Module exports
// ============================================================================
console.log('\n── module exports ─────────────────────────────────────────');

assert(typeof auditPromptText === 'function', 'auditPromptText exported');
assert(typeof runAudit === 'function', 'runAudit exported');
assert(typeof getAuditResult === 'function', 'getAuditResult exported');
assert(typeof enforceAuditPass === 'function', 'enforceAuditPass exported');
assert(typeof resetAudit === 'function', 'resetAudit exported');
assert(Array.isArray(REQUIRED_SECTIONS), 'REQUIRED_SECTIONS array');
assertEq(REQUIRED_SECTIONS.length, 8, '8 required sections');
assert(REQUIRED_SECTIONS.includes('METADATA'), 'METADATA in list');
assert(REQUIRED_SECTIONS.includes('FINAL REQUIREMENT'), 'FINAL REQUIREMENT in list');
assert(Array.isArray(PROHIBITED_PHRASES), 'PROHIBITED_PHRASES array');
assert(PROHIBITED_PHRASES.includes('fallback'), 'fallback in prohibited');
assert(PROHIBITED_PHRASES.includes('hack'), 'hack in prohibited');

// ============================================================================
// auditPromptText — all sections present, clean
// ============================================================================
console.log('\n── auditPromptText: happy path ────────────────────────────');

{
  const r = auditPromptText(validPromptText());
  assertEq(r.pass, true, 'pass=true on valid prompt');
  assertEq(r.missing_sections.length, 0, 'no missing sections');
  assertEq(r.prohibited_language.length, 0, 'no prohibited');
  assertEq(r.section_count, 8, 'section_count=8');
  assertEq(r.total_required, 8, 'total_required=8');
  assert(typeof r.checked_at === 'string', 'checked_at iso string');
  assertEq(r.sections['METADATA'], true, 'METADATA found');
  assertEq(r.sections['CRITICAL EXECUTION RULES'], true, 'CRITICAL EXECUTION RULES found');
  assertEq(r.sections['SYSTEM PRIORITIES'], true, 'SYSTEM PRIORITIES found');
  assertEq(r.sections['TASK'], true, 'TASK found');
  assertEq(r.sections['REQUIREMENTS'], true, 'REQUIREMENTS found');
  assertEq(r.sections['OUTPUT REQUIREMENTS'], true, 'OUTPUT REQUIREMENTS found');
  assertEq(r.sections['PROHIBITIONS'], true, 'PROHIBITIONS found');
  assertEq(r.sections['FINAL REQUIREMENT'], true, 'FINAL REQUIREMENT found');
}

// ============================================================================
// auditPromptText — missing sections
// ============================================================================
console.log('\n── auditPromptText: missing sections ──────────────────────');

{
  const r = auditPromptText('Some random text with no sections at all.');
  assertEq(r.pass, false, 'fail on empty');
  assertEq(r.missing_sections.length, 8, 'all 8 missing');
  assertEq(r.section_count, 0, 'section_count=0');
  assert(
    r.notes.some((n: string) => n.includes('MISSING REQUIRED SECTIONS')),
    'notes mention MISSING REQUIRED SECTIONS'
  );
}

// Partial: missing PROHIBITIONS + FINAL REQUIREMENT
{
  const text = [
    '[METADATA]',
    'CRITICAL EXECUTION RULES',
    'SYSTEM PRIORITIES',
    'TASK:',
    'REQUIREMENTS:',
    'OUTPUT REQUIREMENTS:',
  ].join('\n');
  const r = auditPromptText(text);
  assertEq(r.pass, false, 'partial fails');
  assert(r.missing_sections.includes('PROHIBITIONS'), 'PROHIBITIONS missing');
  assert(r.missing_sections.includes('FINAL REQUIREMENT'), 'FINAL REQUIREMENT missing');
  assertEq(r.missing_sections.length, 2, '2 missing');
  assertEq(r.section_count, 6, 'section_count=6');
}

// ============================================================================
// auditPromptText — prohibited phrases
// ============================================================================
console.log('\n── auditPromptText: prohibited language ───────────────────');

{
  const text = validPromptText() + '\n\nNote: use a fallback if the API is down.';
  const r = auditPromptText(text);
  assertEq(r.pass, false, 'fallback fails');
  assertEq(r.prohibited_language.length, 1, '1 prohibited found');
  assertEq(r.prohibited_language[0].phrase, 'fallback', 'fallback phrase');
  assert(typeof r.prohibited_language[0].context === 'string', 'context string');
  assert(typeof r.prohibited_language[0].index === 'number', 'index number');
  assert(
    r.notes.some((n: string) => n.includes('PROHIBITED LANGUAGE')),
    'notes mention PROHIBITED LANGUAGE'
  );
}

// Multiple phrases
{
  const text = validPromptText() +
    '\n\nThis is a quick fix — a hack really — but good enough for now.';
  const r = auditPromptText(text);
  assertEq(r.pass, false, 'multiple phrases fail');
  assert(r.prohibited_language.length >= 4, '>= 4 phrases matched');
  const phrases = r.prohibited_language.map((p: any) => p.phrase);
  assert(phrases.includes('quick fix'), 'quick fix detected');
  assert(phrases.includes('hack'), 'hack detected');
  assert(phrases.includes('good enough'), 'good enough detected');
  assert(phrases.includes('for now'), 'for now detected');
}

// Word-boundary: "hackathon" should NOT match "hack" due to \b
{
  const text = validPromptText() + '\n\nWe had a hackathon last week.';
  const r = auditPromptText(text);
  // \bhack\b matches "hack" but not "hackathon"
  const phrases = r.prohibited_language.map((p: any) => p.phrase);
  assert(!phrases.includes('hack'), 'hackathon does not trigger hack');
}

// Case insensitive: "FALLBACK" detected
{
  const text = validPromptText() + '\n\nFALLBACK behavior is acceptable.';
  const r = auditPromptText(text);
  assertEq(r.pass, false, 'case insensitive');
  assert(r.prohibited_language.some((p: any) => p.phrase === 'fallback'), 'FALLBACK matched');
}

// ============================================================================
// auditPromptText — insufficient content in sections
// ============================================================================
console.log('\n── auditPromptText: content length checks ─────────────────');

// OUTPUT REQUIREMENTS too short
{
  const text = [
    '[METADATA]',
    'CRITICAL EXECUTION RULES',
    'SYSTEM PRIORITIES',
    'TASK:',
    'Build a comprehensive test suite with all edge cases covered.',
    '---',
    'REQUIREMENTS:',
    'Meet all criteria without exception.',
    '---',
    'OUTPUT REQUIREMENTS:',
    'tiny',
    '---',
    'PROHIBITIONS:',
    'No shortcuts allowed in any form whatsoever.',
    '---',
    'FINAL REQUIREMENT:',
    'Be complete.',
  ].join('\n');
  const r = auditPromptText(text);
  assertEq(r.pass, false, 'short OUTPUT REQUIREMENTS fails');
  assert(
    r.notes.some((n: string) => n.includes('OUTPUT REQUIREMENTS') && n.includes('insufficient')),
    'notes mention OUTPUT REQUIREMENTS insufficient'
  );
}

// PROHIBITIONS too short
{
  const text = [
    '[METADATA]',
    'CRITICAL EXECUTION RULES',
    'SYSTEM PRIORITIES',
    'TASK:',
    'Build a comprehensive test suite with all edge cases covered.',
    '---',
    'REQUIREMENTS:',
    'Meet all criteria without exception.',
    '---',
    'OUTPUT REQUIREMENTS:',
    'Produce a single runnable test file with all assertions.',
    '---',
    'PROHIBITIONS:',
    'no',
    '---',
    'FINAL REQUIREMENT:',
    'Be complete.',
  ].join('\n');
  const r = auditPromptText(text);
  assertEq(r.pass, false, 'short PROHIBITIONS fails');
  assert(
    r.notes.some((n: string) => n.includes('PROHIBITIONS') && n.includes('insufficient')),
    'notes mention PROHIBITIONS insufficient'
  );
}

// TASK too short
{
  const text = [
    '[METADATA]',
    'CRITICAL EXECUTION RULES',
    'SYSTEM PRIORITIES',
    'TASK:',
    'do it',
    '---',
    'REQUIREMENTS:',
    'Meet all criteria without exception.',
    '---',
    'OUTPUT REQUIREMENTS:',
    'Produce a single runnable test file with all assertions.',
    '---',
    'PROHIBITIONS:',
    'No shortcuts allowed in any form whatsoever.',
    '---',
    'FINAL REQUIREMENT:',
    'Be complete.',
  ].join('\n');
  const r = auditPromptText(text);
  assertEq(r.pass, false, 'short TASK fails');
  assert(
    r.notes.some((n: string) => n.includes('TASK') && n.includes('unambiguous')),
    'notes mention TASK unambiguous'
  );
}

// ============================================================================
// runAudit — not found
// ============================================================================
console.log('\n── runAudit: not found ────────────────────────────────────');

resetState();
responders = [
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, respond: () => [[]] },
];
{
  let caught: Error | null = null;
  try {
    await runAudit('missing-id', 'tester');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on not found');
  assert(caught !== null && caught.message.includes('Prompt not found'), 'error mentions not found');
}

// ============================================================================
// runAudit — verified (immutable)
// ============================================================================
console.log('\n── runAudit: verified immutable ───────────────────────────');

resetState();
responders = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => [[{
      id: 'p1', status: 'verified', prompt_text: validPromptText(), guardrails_applied: 1,
    }]],
  },
];
{
  let caught: Error | null = null;
  try {
    await runAudit('p1', 'tester');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'verified throws');
  assert(caught !== null && caught.message.includes('immutable'), 'error mentions immutable');
}

// ============================================================================
// runAudit — pass, draft → audited
// ============================================================================
console.log('\n── runAudit: draft → audited ──────────────────────────────');

resetState();
let selectCount = 0;
responders = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => {
      selectCount++;
      // First call: original draft. Second call (end): updated record.
      if (selectCount === 1) {
        return [[{
          id: 'p2', status: 'draft', prompt_text: validPromptText(), guardrails_applied: 1,
        }]];
      }
      return [[{
        id: 'p2', status: 'audited', prompt_text: validPromptText(), guardrails_applied: 1,
        audit_status: 'pass',
      }]];
    },
  },
  { match: /UPDATE om_prompt_registry SET\s+audit_status/i, respond: () => [{}] },
  { match: /UPDATE om_prompt_registry SET status = 'audited'/, respond: () => [{}] },
  { match: /INSERT INTO system_logs/, respond: () => [{}] },
];

{
  const r = await runAudit('p2', 'tester');
  assertEq(r.audit_status, 'pass', 'status pass');
  assertEq(r.audit.pass, true, 'audit pass');
  assertEq(r.prompt.status, 'audited', 'prompt transitioned to audited');

  // Verify sequence of queries
  const sqls = queryLog.map(q => q.sql);
  assert(sqls.some(s => /UPDATE om_prompt_registry SET[\s\S]*audit_status/.test(s)), 'audit UPDATE issued');
  assert(sqls.some(s => /status = 'audited'/.test(s)), 'draft→audited UPDATE issued');
  assert(sqls.some(s => /INSERT INTO system_logs/.test(s)), 'system_logs INSERT issued');

  // Check UPDATE params include actor
  const updateCall = queryLog.find(q => /audit_status = \?/.test(q.sql));
  assert(updateCall !== undefined, 'found audit UPDATE');
  assertEq(updateCall!.params[0], 'pass', 'audit_status=pass');
  assertEq(updateCall!.params[3], 'tester', 'actor=tester');
  assertEq(updateCall!.params[4], 'p2', 'promptId');

  // system_logs call
  const logCall = queryLog.find(q => /system_logs/.test(q.sql));
  assert(logCall !== undefined, 'log call found');
  assertEq(logCall!.params[0], 'SUCCESS', 'SUCCESS level on pass');
}

// ============================================================================
// runAudit — fail, audited → draft revert
// ============================================================================
console.log('\n── runAudit: audited → draft revert ───────────────────────');

resetState();
selectCount = 0;
responders = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => {
      selectCount++;
      if (selectCount === 1) {
        return [[{
          id: 'p3', status: 'audited',
          prompt_text: 'No sections here — will fail audit.',
          guardrails_applied: 1,
        }]];
      }
      return [[{ id: 'p3', status: 'draft' }]];
    },
  },
  { match: /UPDATE om_prompt_registry SET\s+audit_status/i, respond: () => [{}] },
  { match: /UPDATE om_prompt_registry SET status = 'draft'/, respond: () => [{}] },
  { match: /INSERT INTO system_logs/, respond: () => [{}] },
];

{
  const r = await runAudit('p3', 'tester');
  assertEq(r.audit_status, 'fail', 'fail');
  assertEq(r.prompt.status, 'draft', 'reverted to draft');
  const sqls = queryLog.map(q => q.sql);
  assert(sqls.some(s => /status = 'draft'/.test(s)), 'draft revert UPDATE issued');

  const logCall = queryLog.find(q => /system_logs/.test(q.sql));
  assertEq(logCall!.params[0], 'WARN', 'WARN level on fail');
}

// ============================================================================
// runAudit — guardrails_applied=false forces fail
// ============================================================================
console.log('\n── runAudit: guardrails_applied=false ─────────────────────');

resetState();
selectCount = 0;
responders = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => {
      selectCount++;
      if (selectCount === 1) {
        return [[{
          id: 'p4', status: 'draft', prompt_text: validPromptText(), guardrails_applied: 0,
        }]];
      }
      return [[{ id: 'p4', status: 'draft' }]];
    },
  },
  { match: /UPDATE om_prompt_registry SET\s+audit_status/i, respond: () => [{}] },
  { match: /INSERT INTO system_logs/, respond: () => [{}] },
];

{
  const r = await runAudit('p4', 'tester');
  assertEq(r.audit_status, 'fail', 'guardrails false → fail');
  assertEq(r.audit.pass, false, 'audit.pass false');
  assert(
    r.audit.notes.some((n: string) => n.includes('GUARDRAILS NOT APPLIED')),
    'guardrails note added'
  );
  // Should NOT transition draft → audited
  const sqls = queryLog.map(q => q.sql);
  assert(!sqls.some(s => /status = 'audited'/.test(s)), 'no audited transition');
}

// ============================================================================
// getAuditResult — happy path
// ============================================================================
console.log('\n── getAuditResult ─────────────────────────────────────────');

resetState();
responders = [
  {
    match: /SELECT id, audit_status/,
    respond: () => [[{
      id: 'p5',
      audit_status: 'pass',
      audit_result: JSON.stringify({ pass: true, section_count: 8 }),
      audit_notes: 'all good',
      audited_at: '2026-04-10T00:00:00Z',
      audited_by: 'tester',
    }]],
  },
];

{
  const r = await getAuditResult('p5');
  assertEq(r.prompt_id, 'p5', 'prompt_id');
  assertEq(r.audit_status, 'pass', 'audit_status');
  assertEq(r.audit_result.pass, true, 'parsed audit_result');
  assertEq(r.audit_result.section_count, 8, 'parsed section_count');
  assertEq(r.audit_notes, 'all good', 'audit_notes');
  assertEq(r.audited_by, 'tester', 'audited_by');
}

// audit_result NULL
resetState();
responders = [
  {
    match: /SELECT id, audit_status/,
    respond: () => [[{
      id: 'p6', audit_status: 'pending', audit_result: null,
      audit_notes: null, audited_at: null, audited_by: null,
    }]],
  },
];
{
  const r = await getAuditResult('p6');
  assertEq(r.audit_result, null, 'null audit_result preserved');
}

// Not found
resetState();
responders = [{ match: /SELECT id, audit_status/, respond: () => [[]] }];
{
  let caught: Error | null = null;
  try { await getAuditResult('missing'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'getAuditResult throws on not found');
  assert(caught !== null && caught.message.includes('Prompt not found'), 'error message');
}

// ============================================================================
// enforceAuditPass
// ============================================================================
console.log('\n── enforceAuditPass ───────────────────────────────────────');

// Not found
resetState();
responders = [{ match: /SELECT audit_status/, respond: () => [[]] }];
{
  let caught: Error | null = null;
  try { await enforceAuditPass('missing'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on not found');
  assert(caught !== null && caught.message.includes('Prompt not found'), 'not found message');
}

// status=pass → no throw
resetState();
responders = [{ match: /SELECT audit_status/, respond: () => [[{ audit_status: 'pass' }]] }];
{
  let caught: Error | null = null;
  try { await enforceAuditPass('p7'); } catch (e: any) { caught = e; }
  assert(caught === null, 'pass → no throw');
}

// status=pending → throws with pending hint
resetState();
responders = [{ match: /SELECT audit_status/, respond: () => [[{ audit_status: 'pending' }]] }];
{
  let caught: Error | null = null;
  try { await enforceAuditPass('p8'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'pending throws');
  assert(caught !== null && caught.message.includes('pending'), 'mentions pending');
  assert(caught !== null && caught.message.includes('POST /api/prompts'), 'hints at audit endpoint');
}

// status=fail → throws with fix hint
resetState();
responders = [{ match: /SELECT audit_status/, respond: () => [[{ audit_status: 'fail' }]] }];
{
  let caught: Error | null = null;
  try { await enforceAuditPass('p9'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'fail throws');
  assert(caught !== null && caught.message.includes('Fix the prompt'), 'fix hint');
}

// ============================================================================
// resetAudit
// ============================================================================
console.log('\n── resetAudit ─────────────────────────────────────────────');

resetState();
responders = [{ match: /UPDATE om_prompt_registry SET/, respond: () => [{}] }];
{
  await resetAudit('p10');
  assertEq(queryLog.length, 1, 'one query');
  const sql = queryLog[0].sql;
  assert(/audit_status = 'pending'/.test(sql), 'sets pending');
  assert(/audit_result = NULL/.test(sql), 'clears audit_result');
  assert(/audit_notes = NULL/.test(sql), 'clears audit_notes');
  assert(/audited_at = NULL/.test(sql), 'clears audited_at');
  assert(/audited_by = NULL/.test(sql), 'clears audited_by');
  assertEq(queryLog[0].params[0], 'p10', 'promptId param');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => {
  loud();
  console.error('Unhandled test error:', e);
  process.exit(1);
});
