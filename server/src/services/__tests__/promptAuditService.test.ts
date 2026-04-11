#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptAuditService.js (OMD-1180)
 *
 * Stubs ../config/db getAppPool with a route-dispatch fake pool.
 *
 * Coverage:
 *   - auditPromptText (pure):
 *       · valid prompt → pass with all sections
 *       · missing sections → fail with MISSING REQUIRED SECTIONS note
 *       · prohibited phrase detection (each of 14 phrases as sample)
 *       · insufficient OUTPUT REQUIREMENTS content
 *       · insufficient PROHIBITIONS content
 *       · insufficient TASK content
 *       · result shape: section_count, total_required, checked_at ISO
 *   - runAudit:
 *       · prompt not found → throws
 *       · verified prompt → throws (immutable)
 *       · guardrails_applied=false → force pass=false, note added
 *       · passing + status='draft' → UPDATE status='audited'
 *       · failing + status='audited' → UPDATE status='draft'
 *       · failing + status='draft' → no revert UPDATE
 *       · persists audit_status/audit_result/audit_notes/audited_by
 *       · writes system_logs row with SUCCESS/WARN level
 *   - getAuditResult:
 *       · not found → throws
 *       · JSON audit_result parsed
 *       · null audit_result → null field
 *   - enforceAuditPass:
 *       · not found → throws
 *       · audit_status='pass' → no throw
 *       · 'pending' → throws with "Run POST" hint
 *       · 'fail' → throws with "Fix the prompt" hint
 *   - resetAudit:
 *       · UPDATE resets all 5 audit fields
 *   - Exports: REQUIRED_SECTIONS, PROHIBITED_PHRASES are string arrays
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

// ── Fake pool ──────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

let promptRow: any = null;
let reFetchRow: any = null;
let auditRow: any = null;
let enforceStatus: string | null = null;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });

    // enforceAuditPass
    if (/SELECT audit_status FROM om_prompt_registry/i.test(sql)) {
      return [enforceStatus === null ? [] : [{ audit_status: enforceStatus }]];
    }

    // getAuditResult
    if (/SELECT id, audit_status, audit_result/i.test(sql)) {
      return [auditRow === null ? [] : [auditRow]];
    }

    // runAudit initial + final SELECT *
    if (/SELECT \* FROM om_prompt_registry WHERE id = \?/i.test(sql)) {
      // Return promptRow on first call, reFetchRow on subsequent (if set)
      if (reFetchRow !== null && queryLog.filter(c => /SELECT \* FROM om_prompt_registry/i.test(c.sql)).length >= 2) {
        return [[reFetchRow]];
      }
      return [promptRow === null ? [] : [promptRow]];
    }

    // UPDATEs and INSERTs: always succeed
    return [{ affectedRows: 1 }];
  },
};

function resetState() {
  queryLog.length = 0;
  promptRow = null;
  reFetchRow = null;
  auditRow = null;
  enforceStatus = null;
}

// ── Silence console ────────────────────────────────────────────
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// ── Stub ../config/db ──────────────────────────────────────────
const dbStub = { getAppPool: () => fakePool };
try {
  const dbJs = require.resolve('../../config/db');
  require.cache[dbJs] = {
    id: dbJs, filename: dbJs, loaded: true, exports: dbStub,
  } as any;
} catch {}

const {
  runAudit,
  getAuditResult,
  enforceAuditPass,
  resetAudit,
  REQUIRED_SECTIONS,
  PROHIBITED_PHRASES,
  auditPromptText,
} = require('../promptAuditService');

// ── Valid prompt fixture ───────────────────────────────────────
const VALID_PROMPT = `[METADATA]
title: Example

CRITICAL EXECUTION RULES:
- Follow all instructions exactly.

SYSTEM PRIORITIES:
1. Correctness
2. Completeness

TASK:
Implement a working widget that renders data and handles errors properly without cutting corners.

REQUIREMENTS:
- Full implementation
- Tests included

OUTPUT REQUIREMENTS:
Produce complete working code with tests and documentation.

PROHIBITIONS:
No incomplete code, no skipping tests, no cutting corners or shortcuts.

FINAL REQUIREMENT:
Ship production-ready code.`;

async function main() {

// ============================================================================
// auditPromptText — valid prompt
// ============================================================================
console.log('\n── auditPromptText: valid prompt ─────────────────────────');
{
  const r = auditPromptText(VALID_PROMPT);
  assertEq(r.pass, true, 'valid prompt passes');
  assertEq(r.missing_sections, [], 'no missing sections');
  assertEq(r.prohibited_language, [], 'no prohibited phrases');
  assertEq(r.notes, [], 'no notes');
  assertEq(r.section_count, 8, '8 sections found');
  assertEq(r.total_required, 8, '8 required');
  assert(typeof r.checked_at === 'string', 'checked_at is string');
  assert(/^\d{4}-\d{2}-\d{2}T/.test(r.checked_at), 'checked_at ISO format');
  for (const key of REQUIRED_SECTIONS) {
    assertEq(r.sections[key], true, `section found: ${key}`);
  }
}

// ============================================================================
// auditPromptText — missing sections
// ============================================================================
console.log('\n── auditPromptText: missing sections ─────────────────────');
{
  const r = auditPromptText('just some random text');
  assertEq(r.pass, false, 'random text fails');
  assert(r.missing_sections.length >= 7, 'multiple missing sections');
  assert(r.notes.some(n => n.includes('MISSING REQUIRED SECTIONS')), 'missing-sections note');
  assertEq(r.section_count, 0, 'zero sections found');
}

// One section present, others missing
{
  const r = auditPromptText('[METADATA] only');
  assertEq(r.pass, false, 'one-section prompt fails');
  assertEq(r.sections.METADATA, true, 'METADATA found');
  assert(r.missing_sections.includes('TASK'), 'TASK listed missing');
}

// ============================================================================
// auditPromptText — prohibited phrases
// ============================================================================
console.log('\n── auditPromptText: prohibited phrases ───────────────────');

// Sample prohibited phrases — insert each into an otherwise-valid prompt
const PROHIBITED_SAMPLES = [
  { text: 'fallback', display: 'fallback' },
  { text: 'temporary fix', display: 'temporary fix' },
  { text: 'workaround', display: 'workaround' },
  { text: 'just use', display: 'just use' },
  { text: 'for now', display: 'for now' },
  { text: 'good enough', display: 'good enough' },
  { text: 'partial implementation', display: 'partial implementation' },
  { text: 'simplified version', display: 'simplified version' },
  { text: 'placeholder', display: 'placeholder' },
  { text: 'skip for now', display: 'skip for now' },
  { text: 'hack', display: 'hack' },
  { text: 'quick fix', display: 'quick fix' },
  { text: 'mock it for now', display: 'mock it for now' },
  { text: 'if this fails, do X', display: 'if this fails, do X instead' },
];

for (const sample of PROHIBITED_SAMPLES) {
  // Inject into TASK section (which has to be >= 30 chars for content check to pass)
  const txt = VALID_PROMPT.replace(
    'Implement a working widget that renders data and handles errors properly without cutting corners.',
    `Implement a working widget with ${sample.text} approach that handles everything properly.`
  );
  const r = auditPromptText(txt);
  assertEq(r.pass, false, `"${sample.display}" → fail`);
  assert(
    r.prohibited_language.some((p: any) => p.phrase === sample.display),
    `"${sample.display}" reported`
  );
}

// Prohibited context captured
{
  const txt = VALID_PROMPT + '\nplaceholder somewhere';
  const r = auditPromptText(txt);
  const p = r.prohibited_language.find((x: any) => x.phrase === 'placeholder');
  assert(!!p, 'placeholder captured');
  assert(typeof p.context === 'string' && p.context.length > 0, 'context populated');
  assert(typeof p.index === 'number', 'index populated');
}

// ============================================================================
// auditPromptText — insufficient content
// ============================================================================
console.log('\n── auditPromptText: insufficient section content ─────────');

// Empty OUTPUT REQUIREMENTS section
{
  const txt = VALID_PROMPT.replace(
    'OUTPUT REQUIREMENTS:\nProduce complete working code with tests and documentation.',
    'OUTPUT REQUIREMENTS:\nshort'
  );
  const r = auditPromptText(txt);
  assertEq(r.pass, false, 'short OUTPUT REQUIREMENTS fails');
  assert(r.notes.some(n => n.includes('OUTPUT REQUIREMENTS')), 'notes mention section');
}

// Short PROHIBITIONS
{
  const txt = VALID_PROMPT.replace(
    'PROHIBITIONS:\nNo incomplete code, no skipping tests, no cutting corners or shortcuts.',
    'PROHIBITIONS:\nno.'
  );
  const r = auditPromptText(txt);
  assertEq(r.pass, false, 'short PROHIBITIONS fails');
  assert(r.notes.some(n => n.includes('PROHIBITIONS section exists')), 'notes mention section');
}

// Short TASK
{
  const txt = VALID_PROMPT.replace(
    'Implement a working widget that renders data and handles errors properly without cutting corners.',
    'Do it.'
  );
  const r = auditPromptText(txt);
  assertEq(r.pass, false, 'short TASK fails');
  assert(r.notes.some(n => n.includes('TASK section')), 'notes mention TASK');
}

// ============================================================================
// runAudit — prompt not found
// ============================================================================
console.log('\n── runAudit: not found ───────────────────────────────────');
resetState();
{
  let caught: Error | null = null;
  try { await runAudit('missing-id', 'tester'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught !== null && caught.message.includes('Prompt not found'), 'correct message');
}

// ============================================================================
// runAudit — verified is immutable
// ============================================================================
console.log('\n── runAudit: verified immutable ──────────────────────────');
resetState();
promptRow = { id: 'p1', status: 'verified', prompt_text: VALID_PROMPT, guardrails_applied: 1 };
{
  let caught: Error | null = null;
  try { await runAudit('p1', 'tester'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught !== null && caught.message.includes('immutable'), 'mentions immutable');
}

// ============================================================================
// runAudit — passing draft → audited
// ============================================================================
console.log('\n── runAudit: passing draft → audited ─────────────────────');
resetState();
promptRow = { id: 'p1', status: 'draft', prompt_text: VALID_PROMPT, guardrails_applied: 1 };
reFetchRow = { id: 'p1', status: 'audited', audit_status: 'pass' };
{
  const r = await runAudit('p1', 'tester');
  assertEq(r.audit_status, 'pass', 'audit_status = pass');
  assertEq(r.audit.pass, true, 'audit.pass = true');

  // Verify status transition happened
  const statusTransition = queryLog.find(c =>
    /UPDATE om_prompt_registry SET status = 'audited'/i.test(c.sql)
  );
  assert(!!statusTransition, 'status transitioned to audited');

  // Verify persistence
  const persist = queryLog.find(c =>
    /UPDATE om_prompt_registry SET[\s\S]*audit_status/i.test(c.sql)
  );
  assert(!!persist, 'audit fields persisted');
  assertEq(persist!.params[0], 'pass', 'param audit_status');
  assertEq(persist!.params[3], 'tester', 'param actor');
  assertEq(persist!.params[4], 'p1', 'param promptId');

  // Verify system_logs
  const sysLog = queryLog.find(c => /INSERT INTO system_logs/i.test(c.sql));
  assert(!!sysLog, 'system_logs insert');
  assertEq(sysLog!.params[0], 'SUCCESS', 'level = SUCCESS on pass');
  assert((sysLog!.params[1] as string).includes('AUDIT_PASS'), 'message mentions AUDIT_PASS');

  assertEq(r.prompt, reFetchRow, 'returns refreshed prompt');
}

// ============================================================================
// runAudit — failing prompt + previously audited → revert to draft
// ============================================================================
console.log('\n── runAudit: failing audited → draft ─────────────────────');
resetState();
promptRow = {
  id: 'p2', status: 'audited',
  prompt_text: 'only random text, no sections',
  guardrails_applied: 1,
};
reFetchRow = { id: 'p2', status: 'draft' };
{
  const r = await runAudit('p2', 'tester');
  assertEq(r.audit_status, 'fail', 'audit_status = fail');

  const revert = queryLog.find(c =>
    /UPDATE om_prompt_registry SET status = 'draft'/i.test(c.sql)
  );
  assert(!!revert, 'status reverted to draft');

  const sysLog = queryLog.find(c => /INSERT INTO system_logs/i.test(c.sql));
  assertEq(sysLog!.params[0], 'WARN', 'level = WARN on fail');
  assert((sysLog!.params[1] as string).includes('AUDIT_FAIL'), 'message mentions AUDIT_FAIL');
}

// ============================================================================
// runAudit — failing draft → no status transition
// ============================================================================
console.log('\n── runAudit: failing draft (no transition) ──────────────');
resetState();
promptRow = {
  id: 'p3', status: 'draft',
  prompt_text: 'only random text',
  guardrails_applied: 1,
};
reFetchRow = { id: 'p3', status: 'draft' };
{
  await runAudit('p3', 'tester');
  const revert = queryLog.find(c =>
    /UPDATE om_prompt_registry SET status = 'draft' WHERE id/i.test(c.sql)
  );
  assert(!revert, 'no revert UPDATE');
  const promote = queryLog.find(c =>
    /UPDATE om_prompt_registry SET status = 'audited'/i.test(c.sql)
  );
  assert(!promote, 'no promotion UPDATE');
}

// ============================================================================
// runAudit — guardrails_applied=false forces fail
// ============================================================================
console.log('\n── runAudit: guardrails not applied ──────────────────────');
resetState();
promptRow = {
  id: 'p4', status: 'draft',
  prompt_text: VALID_PROMPT,
  guardrails_applied: 0,
};
reFetchRow = { id: 'p4', status: 'draft' };
{
  const r = await runAudit('p4', 'tester');
  assertEq(r.audit_status, 'fail', 'fail due to guardrails');
  assertEq(r.audit.pass, false, 'audit.pass forced to false');
  assert(
    r.audit.notes.some((n: string) => n.includes('GUARDRAILS NOT APPLIED')),
    'guardrails note present'
  );
}

// ============================================================================
// getAuditResult
// ============================================================================
console.log('\n── getAuditResult ────────────────────────────────────────');

// Not found
resetState();
{
  let caught: Error | null = null;
  try { await getAuditResult('missing'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'not found throws');
}

// JSON parsed
resetState();
auditRow = {
  id: 'p1', audit_status: 'pass',
  audit_result: JSON.stringify({ pass: true, sections: {} }),
  audit_notes: 'all good', audited_at: '2026-04-01', audited_by: 'tester',
};
{
  const r = await getAuditResult('p1');
  assertEq(r.prompt_id, 'p1', 'prompt_id');
  assertEq(r.audit_status, 'pass', 'audit_status');
  assertEq((r.audit_result as any).pass, true, 'audit_result parsed');
  assertEq(r.audit_notes, 'all good', 'audit_notes');
  assertEq(r.audited_by, 'tester', 'audited_by');
}

// Null audit_result
resetState();
auditRow = {
  id: 'p2', audit_status: 'pending',
  audit_result: null, audit_notes: null, audited_at: null, audited_by: null,
};
{
  const r = await getAuditResult('p2');
  assertEq(r.audit_result, null, 'null audit_result preserved');
}

// ============================================================================
// enforceAuditPass
// ============================================================================
console.log('\n── enforceAuditPass ──────────────────────────────────────');

// Not found
resetState();
{
  let caught: Error | null = null;
  try { await enforceAuditPass('missing'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Prompt not found'), 'not found throws');
}

// Pass → no throw
resetState();
enforceStatus = 'pass';
{
  let caught: Error | null = null;
  try { await enforceAuditPass('p1'); }
  catch (e: any) { caught = e; }
  assert(caught === null, 'pass → no throw');
}

// Pending → throw with "Run POST" hint
resetState();
enforceStatus = 'pending';
{
  let caught: Error | null = null;
  try { await enforceAuditPass('p1'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'pending throws');
  assert(caught !== null && caught.message.includes('Run POST'), 'mentions Run POST');
}

// Fail → throw with "Fix the prompt" hint
resetState();
enforceStatus = 'fail';
{
  let caught: Error | null = null;
  try { await enforceAuditPass('p1'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'fail throws');
  assert(caught !== null && caught.message.includes('Fix the prompt'), 'mentions Fix the prompt');
}

// ============================================================================
// resetAudit
// ============================================================================
console.log('\n── resetAudit ────────────────────────────────────────────');
resetState();
{
  await resetAudit('p1');
  const q = queryLog[0];
  assert(/UPDATE om_prompt_registry SET/i.test(q.sql), 'UPDATE executed');
  assert(/audit_status = 'pending'/i.test(q.sql), 'resets audit_status');
  assert(/audit_result = NULL/i.test(q.sql), 'nulls audit_result');
  assert(/audit_notes = NULL/i.test(q.sql), 'nulls audit_notes');
  assert(/audited_at = NULL/i.test(q.sql), 'nulls audited_at');
  assert(/audited_by = NULL/i.test(q.sql), 'nulls audited_by');
  assertEq(q.params[0], 'p1', 'promptId param');
}

// ============================================================================
// Exported arrays
// ============================================================================
console.log('\n── Exports ───────────────────────────────────────────────');
assert(Array.isArray(REQUIRED_SECTIONS), 'REQUIRED_SECTIONS is array');
assertEq(REQUIRED_SECTIONS.length, 8, '8 required sections');
assert(REQUIRED_SECTIONS.every((s: any) => typeof s === 'string'), 'all strings');
assert(REQUIRED_SECTIONS.includes('METADATA'), 'includes METADATA');
assert(REQUIRED_SECTIONS.includes('TASK'), 'includes TASK');

assert(Array.isArray(PROHIBITED_PHRASES), 'PROHIBITED_PHRASES is array');
assertEq(PROHIBITED_PHRASES.length, 14, '14 prohibited phrases');
assert(PROHIBITED_PHRASES.every((s: any) => typeof s === 'string'), 'all strings');
assert(PROHIBITED_PHRASES.includes('fallback'), 'includes fallback');
assert(PROHIBITED_PHRASES.includes('hack'), 'includes hack');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

}

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
