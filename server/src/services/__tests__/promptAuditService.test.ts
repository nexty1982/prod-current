#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptAuditService.js (OMD-1158)
 *
 * Coverage:
 *   - auditPromptText (pure):
 *       · all 8 required sections present → pass
 *       · missing sections → fail + notes list missing
 *       · prohibited phrases (all 14) detected
 *       · OUTPUT REQUIREMENTS with short content → fail
 *       · PROHIBITIONS with short content → fail
 *       · TASK section too brief → fail
 *       · section_count / total_required counts accurate
 *       · checked_at is ISO string
 *   - runAudit:
 *       · prompt not found → throws
 *       · verified prompt → throws (immutable)
 *       · pass + draft → status = audited
 *       · fail + audited → reverts to draft
 *       · guardrails_applied=false → forces fail
 *       · writes UPDATE with audit_status/audit_result/audit_notes
 *       · logs to system_logs
 *       · returns { audit, audit_status, prompt }
 *   - getAuditResult:
 *       · not found → throws
 *       · parses audit_result JSON
 *   - enforceAuditPass:
 *       · not found → throws
 *       · audit_status 'pending' → helpful message
 *       · audit_status 'fail' → blocked
 *       · audit_status 'pass' → no-op
 *   - resetAudit:
 *       · issues UPDATE setting all audit cols to null/pending
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

// ── require.cache stub helper ────────────────────────────────────────
function installStub(relPath: string, exports: any) {
  const tsxResolved = require.resolve(relPath);
  const jsPath = tsxResolved.replace(/\.ts$/, '.js');
  for (const p of [tsxResolved, jsPath]) {
    require.cache[p] = { id: p, filename: p, loaded: true, exports } as any;
  }
}

// ── Fake pool ────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

let promptRows: any[] = [];
let updatedRows: any[] = [];
let auditStatusRow: any[] = [];
let throwOnPattern: RegExp | null = null;

function resetState() {
  queryLog.length = 0;
  promptRows = [];
  updatedRows = [];
  auditStatusRow = [];
  throwOnPattern = null;
}

// Sequence of SELECT returns for runAudit (first call = prompt lookup, second = updated lookup)
let selectSequence: any[][] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (throwOnPattern && throwOnPattern.test(sql)) {
      throw new Error('fake db failure');
    }

    // UPDATE om_prompt_registry
    if (/^UPDATE\s+om_prompt_registry/i.test(sql)) {
      return [{ affectedRows: 1 }];
    }

    // INSERT system_logs
    if (/^INSERT\s+INTO\s+system_logs/i.test(sql)) {
      return [{ insertId: 555 }];
    }

    // SELECT audit_status only (enforceAuditPass)
    if (/SELECT\s+audit_status\s+FROM\s+om_prompt_registry/i.test(sql)) {
      return [auditStatusRow];
    }

    // SELECT specific audit columns (getAuditResult)
    if (/SELECT\s+id,\s*audit_status/i.test(sql)) {
      return [promptRows];
    }

    // SELECT * FROM om_prompt_registry — sequence (for runAudit: prompt then updated)
    if (/SELECT\s+\*\s+FROM\s+om_prompt_registry/i.test(sql)) {
      if (selectSequence.length > 0) {
        return [selectSequence.shift()!];
      }
      return [promptRows];
    }

    return [[]];
  },
};

installStub('../../config/db', { getAppPool: () => fakePool });

// ── SUT ──────────────────────────────────────────────────────────────
const {
  runAudit,
  getAuditResult,
  enforceAuditPass,
  resetAudit,
  REQUIRED_SECTIONS,
  PROHIBITED_PHRASES,
  auditPromptText,
} = require('../promptAuditService');

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// Build a valid prompt text with all sections present
function buildValidPrompt(overrides: Partial<{
  output: string; prohibitions: string; task: string;
}> = {}): string {
  return `[METADATA]
id: test-1
version: 1.0

CRITICAL EXECUTION RULES
- Rule one: execute the task as described.
- Rule two: do not deviate from requirements.

SYSTEM PRIORITIES
- P1: Correctness above all.
- P2: Safety before speed.

TASK:
${overrides.task || 'Build a fully-functional user authentication subsystem covering registration, login, and password reset with secure token handling and audit trails.'}

REQUIREMENTS:
- Must be production-grade.
- Must include tests and documentation.
- Must handle edge cases explicitly.

OUTPUT REQUIREMENTS:
${overrides.output || '- A working implementation.\n- Automated tests with 80% coverage.\n- Documentation of all public interfaces.'}

PROHIBITIONS:
${overrides.prohibitions || '- Do not hardcode secrets.\n- Do not skip validation.\n- Do not introduce regressions.'}

FINAL REQUIREMENT: All acceptance criteria above must be met without exception.`;
}

async function main() {

// ============================================================================
// auditPromptText — pure function
// ============================================================================
console.log('\n── auditPromptText: all sections present ────────────────');

{
  const r = auditPromptText(buildValidPrompt());
  assertEq(r.pass, true, 'valid prompt passes');
  assertEq(r.missing_sections.length, 0, 'no missing sections');
  assertEq(r.prohibited_language.length, 0, 'no prohibited language');
  assertEq(r.section_count, 8, '8 sections found');
  assertEq(r.total_required, 8, '8 total required');
  assert(typeof r.checked_at === 'string', 'checked_at is string');
  assert(/^\d{4}-\d{2}-\d{2}T/.test(r.checked_at), 'checked_at is ISO date');
  assertEq(r.sections['METADATA'], true, 'METADATA found');
  assertEq(r.sections['CRITICAL EXECUTION RULES'], true, 'CER found');
}

// ============================================================================
// auditPromptText — missing sections
// ============================================================================
console.log('\n── auditPromptText: missing sections ────────────────────');

{
  const r = auditPromptText('');
  assertEq(r.pass, false, 'empty → fails');
  assertEq(r.missing_sections.length, 8, 'all 8 missing');
  assertEq(r.section_count, 0, '0 sections found');
  assert(r.notes.some((n: string) => /MISSING REQUIRED SECTIONS/i.test(n)), 'missing note present');
}

// Only some sections
{
  const text = '[METADATA]\nCRITICAL EXECUTION RULES\nSYSTEM PRIORITIES';
  const r = auditPromptText(text);
  assertEq(r.pass, false, 'partial → fails');
  assertEq(r.section_count, 3, '3 sections found');
  assertEq(r.missing_sections.length, 5, '5 missing');
}

// ============================================================================
// auditPromptText — prohibited phrases
// ============================================================================
console.log('\n── auditPromptText: prohibited language ─────────────────');

const prohibitedTestCases = [
  { word: 'fallback', phrase: 'fallback' },
  { word: 'temporary fix', phrase: 'temporary fix' },
  { word: 'workaround', phrase: 'workaround' },
  { word: 'just use', phrase: 'just use' },
  { word: 'if this fails, do', phrase: 'if this fails, do X instead' },
  { word: 'for now', phrase: 'for now' },
  { word: 'good enough', phrase: 'good enough' },
  { word: 'partial implementation', phrase: 'partial implementation' },
  { word: 'mock it for now', phrase: 'mock it for now' },
  { word: 'simplified version', phrase: 'simplified version' },
  { word: 'placeholder', phrase: 'placeholder' },
  { word: 'skip for now', phrase: 'skip for now' },
  { word: 'hack', phrase: 'hack' },
  { word: 'quick fix', phrase: 'quick fix' },
];

for (const tc of prohibitedTestCases) {
  const text = buildValidPrompt({ task: 'Build an ' + tc.word + ' for the new login flow that must be robust and documented.' });
  const r = auditPromptText(text);
  assertEq(r.pass, false, `"${tc.phrase}" → fails`);
  const found = r.prohibited_language.some((p: any) => p.phrase === tc.phrase);
  assert(found, `"${tc.phrase}" detected`);
}

// Prohibited phrase context included
{
  const text = buildValidPrompt({ task: 'Build a fallback when the main system fails and document it thoroughly.' });
  const r = auditPromptText(text);
  const found = r.prohibited_language.find((p: any) => p.phrase === 'fallback')!;
  assert(found !== undefined, 'found fallback');
  assert(typeof found.context === 'string' && found.context.length > 0, 'has context');
  assert(typeof found.index === 'number', 'has index');
  assertEq(found.matched.toLowerCase(), 'fallback', 'matched text');
}

// ============================================================================
// auditPromptText — OUTPUT REQUIREMENTS insufficient content
// ============================================================================
console.log('\n── auditPromptText: short sections ──────────────────────');

{
  const text = buildValidPrompt({ output: 'tiny' });
  const r = auditPromptText(text);
  assertEq(r.pass, false, 'short OUTPUT → fails');
  assert(r.notes.some((n: string) => /OUTPUT REQUIREMENTS.*insufficient/i.test(n)), 'OUTPUT note present');
}

{
  const text = buildValidPrompt({ prohibitions: 'none' });
  const r = auditPromptText(text);
  assertEq(r.pass, false, 'short PROHIBITIONS → fails');
  assert(r.notes.some((n: string) => /PROHIBITIONS.*insufficient/i.test(n)), 'PROHIBITIONS note present');
}

{
  const text = buildValidPrompt({ task: 'do it' });
  const r = auditPromptText(text);
  assertEq(r.pass, false, 'brief TASK → fails');
  assert(r.notes.some((n: string) => /TASK.*too brief/i.test(n)), 'TASK note present');
}

// ============================================================================
// Exported arrays
// ============================================================================
console.log('\n── Exports ──────────────────────────────────────────────');

assertEq(REQUIRED_SECTIONS.length, 8, '8 required sections exported');
assertEq(REQUIRED_SECTIONS[0], 'METADATA', 'first section METADATA');
assertEq(PROHIBITED_PHRASES.length, 14, '14 prohibited phrases exported');
assert(PROHIBITED_PHRASES.includes('fallback'), 'fallback exported');
assert(PROHIBITED_PHRASES.includes('hack'), 'hack exported');

// ============================================================================
// runAudit — prompt not found
// ============================================================================
console.log('\n── runAudit: prompt not found ───────────────────────────');

resetState();
selectSequence = [[]]; // empty result
{
  let caught: Error | null = null;
  try { await runAudit('nonexistent', 'alice'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /not found/i.test(caught!.message), 'throws not found');
}

// ============================================================================
// runAudit — verified prompt is immutable
// ============================================================================
console.log('\n── runAudit: verified immutable ─────────────────────────');

resetState();
selectSequence = [[{
  id: 'p1', prompt_text: buildValidPrompt(), status: 'verified', guardrails_applied: true,
}]];
{
  let caught: Error | null = null;
  try { await runAudit('p1', 'alice'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /immutable/i.test(caught!.message), 'throws immutable');
}

// ============================================================================
// runAudit — draft passes → status becomes audited
// ============================================================================
console.log('\n── runAudit: draft passes → audited ─────────────────────');

resetState();
const validPrompt = buildValidPrompt();
selectSequence = [
  [{ id: 'p2', prompt_text: validPrompt, status: 'draft', guardrails_applied: true }],
  [{ id: 'p2', prompt_text: validPrompt, status: 'audited' }],
];
{
  const result = await runAudit('p2', 'alice');
  assertEq(result.audit_status, 'pass', 'audit_status pass');
  assertEq(result.audit.pass, true, 'audit.pass true');
  assertEq(result.prompt.status, 'audited', 'prompt returned as audited');

  const updates = queryLog.filter(q => /^UPDATE\s+om_prompt_registry/i.test(q.sql));
  assert(updates.length >= 2, 'at least 2 UPDATE queries');

  // First update writes audit_status
  assert(/audit_status = \?/.test(updates[0].sql), 'updates audit_status');
  assertEq(updates[0].params[0], 'pass', 'audit_status = pass');
  // audit_result is JSON-serialized
  assertEq(typeof updates[0].params[1], 'string', 'audit_result serialized');
  assertEq(updates[0].params[3], 'alice', 'audited_by = alice');
  assertEq(updates[0].params[4], 'p2', 'prompt id');

  // Second update transitions draft → audited
  assert(/status = 'audited'/.test(updates[1].sql), 'transitions to audited');

  // system_logs INSERT
  const log = queryLog.find(q => /INSERT\s+INTO\s+system_logs/i.test(q.sql))!;
  assert(log !== undefined, 'system_logs insert');
  assertEq(log.params[0], 'SUCCESS', 'log level SUCCESS');
}

// ============================================================================
// runAudit — fail + audited → revert to draft
// ============================================================================
console.log('\n── runAudit: fail + audited → draft ─────────────────────');

resetState();
selectSequence = [
  [{ id: 'p3', prompt_text: '', status: 'audited', guardrails_applied: true }],
  [{ id: 'p3', status: 'draft' }],
];
quiet();
{
  const result = await runAudit('p3', 'bob');
  loud();
  assertEq(result.audit_status, 'fail', 'audit_status fail');

  const updates = queryLog.filter(q => /^UPDATE\s+om_prompt_registry/i.test(q.sql));
  // Should have: SET audit_status=fail + SET status='draft'
  assert(/audit_status = \?/.test(updates[0].sql), 'writes audit status');
  assertEq(updates[0].params[0], 'fail', 'status fail');
  assert(updates.some(u => /status = 'draft'/.test(u.sql)), 'reverts to draft');

  const log = queryLog.find(q => /INSERT\s+INTO\s+system_logs/i.test(q.sql))!;
  assertEq(log.params[0], 'WARN', 'log level WARN on fail');
}

// ============================================================================
// runAudit — guardrails_applied=false forces fail
// ============================================================================
console.log('\n── runAudit: guardrails_applied false ───────────────────');

resetState();
selectSequence = [
  [{ id: 'p4', prompt_text: buildValidPrompt(), status: 'draft', guardrails_applied: false }],
  [{ id: 'p4', status: 'draft' }],
];
{
  const result = await runAudit('p4', 'carol');
  assertEq(result.audit_status, 'fail', 'guardrails false → fail');
  assert(result.audit.notes.some((n: string) => /GUARDRAILS NOT APPLIED/i.test(n)), 'guardrails note present');
  // Should NOT transition draft → audited
  const updates = queryLog.filter(q => /^UPDATE\s+om_prompt_registry/i.test(q.sql));
  assert(!updates.some(u => /status = 'audited'/.test(u.sql)), 'no audited transition');
}

// ============================================================================
// runAudit — draft fails → stays draft (no extra transition)
// ============================================================================
console.log('\n── runAudit: draft fail stays draft ─────────────────────');

resetState();
selectSequence = [
  [{ id: 'p5', prompt_text: '', status: 'draft', guardrails_applied: true }],
  [{ id: 'p5', status: 'draft' }],
];
quiet();
{
  const result = await runAudit('p5', 'dave');
  loud();
  assertEq(result.audit_status, 'fail', 'fail');
  const updates = queryLog.filter(q => /^UPDATE\s+om_prompt_registry/i.test(q.sql));
  // Should NOT transition draft → draft (revert only fires from audited)
  assert(
    updates.filter(u => /status = 'draft'/.test(u.sql)).length === 0,
    'no draft revert update when already draft'
  );
}

// ============================================================================
// getAuditResult
// ============================================================================
console.log('\n── getAuditResult ────────────────────────────────────────');

resetState();
promptRows = [];
{
  let caught: Error | null = null;
  try { await getAuditResult('missing'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /not found/i.test(caught!.message), 'throws not found');
}

resetState();
promptRows = [{
  id: 'p6',
  audit_status: 'pass',
  audit_result: JSON.stringify({ pass: true, section_count: 8 }),
  audit_notes: 'ok',
  audited_at: '2026-04-10T10:00:00Z',
  audited_by: 'alice',
}];
{
  const r = await getAuditResult('p6');
  assertEq(r.prompt_id, 'p6', 'prompt_id');
  assertEq(r.audit_status, 'pass', 'audit_status');
  assertEq(r.audit_result, { pass: true, section_count: 8 }, 'audit_result parsed');
  assertEq(r.audited_by, 'alice', 'audited_by');
}

// Null audit_result → returns null
resetState();
promptRows = [{
  id: 'p7', audit_status: 'pending',
  audit_result: null, audit_notes: null,
  audited_at: null, audited_by: null,
}];
{
  const r = await getAuditResult('p7');
  assertEq(r.audit_result, null, 'null audit_result preserved');
}

// ============================================================================
// enforceAuditPass
// ============================================================================
console.log('\n── enforceAuditPass ──────────────────────────────────────');

resetState();
auditStatusRow = [];
{
  let caught: Error | null = null;
  try { await enforceAuditPass('nope'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /not found/i.test(caught!.message), 'not found throws');
}

resetState();
auditStatusRow = [{ audit_status: 'pending' }];
{
  let caught: Error | null = null;
  try { await enforceAuditPass('p8'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'pending throws');
  assert(/POST \/api\/prompts/.test(caught!.message), 'hint mentions audit endpoint');
}

resetState();
auditStatusRow = [{ audit_status: 'fail' }];
{
  let caught: Error | null = null;
  try { await enforceAuditPass('p9'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /blocked/i.test(caught!.message), 'fail throws blocked');
  assert(/re-run audit/i.test(caught!.message), 'hint mentions re-run');
}

resetState();
auditStatusRow = [{ audit_status: 'pass' }];
{
  // Should not throw
  let threw = false;
  try { await enforceAuditPass('p10'); }
  catch { threw = true; }
  assertEq(threw, false, 'pass does not throw');
}

// ============================================================================
// resetAudit
// ============================================================================
console.log('\n── resetAudit ────────────────────────────────────────────');

resetState();
await resetAudit('p11');
{
  const update = queryLog.find(q => /^UPDATE\s+om_prompt_registry/i.test(q.sql))!;
  assert(update !== undefined, 'UPDATE fired');
  assert(/audit_status = 'pending'/.test(update.sql), 'resets audit_status');
  assert(/audit_result = NULL/.test(update.sql), 'nulls audit_result');
  assert(/audit_notes = NULL/.test(update.sql), 'nulls audit_notes');
  assert(/audited_at = NULL/.test(update.sql), 'nulls audited_at');
  assert(/audited_by = NULL/.test(update.sql), 'nulls audited_by');
  assertEq(update.params[0], 'p11', 'prompt id');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => {
  loud();
  console.error('Unhandled:', e);
  process.exit(1);
});
