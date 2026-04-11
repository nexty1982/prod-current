#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptAuditService.js (OMD-1029)
 *
 * Guardrail enforcement layer — audits prompt_text for required sections,
 * prohibited language, and guardrail flags.
 *
 * Single dependency: ../config/db. Stubbed via require.cache with SQL-routed
 * fake pool.
 *
 * Coverage:
 *   - Constants export shape
 *   - auditPromptText (pure):
 *       · full valid prompt → pass
 *       · missing sections → fail + list
 *       · prohibited phrases → fail + context
 *       · OUTPUT REQUIREMENTS too short → fail
 *       · PROHIBITIONS too short → fail
 *       · TASK too brief → fail
 *       · section_count / total_required math
 *   - runAudit:
 *       · prompt not found → throw
 *       · verified prompt → cannot audit (throw)
 *       · guardrails_applied false → force fail
 *       · passing audit of draft → status → audited
 *       · failing audit of audited → status → draft
 *       · persists audit_status/result/notes
 *       · logs to system_logs
 *   - getAuditResult:
 *       · not found → throw
 *       · parses audit_result JSON
 *       · null audit_result → null
 *   - enforceAuditPass:
 *       · not found → throw
 *       · audit_status != pass → throw (pending variant + generic)
 *       · audit_status == pass → silent
 *   - resetAudit: issues UPDATE clearing fields
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

// ── SQL-routed fake pool ─────────────────────────────────────────────────
type Route = { match: RegExp; rows?: any; throws?: Error };
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        if (r.throws) throw r.throws;
        return [r.rows !== undefined ? r.rows : []];
      }
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true, exports: dbStub,
} as any;

function resetState() {
  queryLog.length = 0;
  routes = [];
}

const {
  runAudit,
  getAuditResult,
  enforceAuditPass,
  resetAudit,
  REQUIRED_SECTIONS,
  PROHIBITED_PHRASES,
  auditPromptText,
} = require('../promptAuditService');

// ── Valid prompt fixture ─────────────────────────────────────────────────

const VALID_PROMPT = `
[METADATA]
author: tests
version: 1.0

CRITICAL EXECUTION RULES:
Follow these rules without deviation.

SYSTEM PRIORITIES:
1. Correctness
2. Safety

TASK:
Build a durable storage system with idempotent writes and atomic updates.

REQUIREMENTS:
- Strong consistency
- Audit log

OUTPUT REQUIREMENTS:
- Produce a fully tested module with at least 80 percent coverage.

PROHIBITIONS:
- Must not bypass authentication or authorization checks.

FINAL REQUIREMENT:
All code must be reviewed before merge.
`.trim();

async function main() {

// ============================================================================
// Constants export
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');

assertEq(REQUIRED_SECTIONS.length, 8, '8 required sections');
assert(REQUIRED_SECTIONS.includes('METADATA'), 'METADATA listed');
assert(REQUIRED_SECTIONS.includes('FINAL REQUIREMENT'), 'FINAL REQUIREMENT listed');
assert(PROHIBITED_PHRASES.length >= 14, 'at least 14 prohibited phrases');
assert(PROHIBITED_PHRASES.includes('fallback'), 'fallback listed');
assert(PROHIBITED_PHRASES.includes('hack'), 'hack listed');

// ============================================================================
// auditPromptText — valid prompt
// ============================================================================
console.log('\n── auditPromptText: valid prompt ─────────────────────────');

{
  const r = auditPromptText(VALID_PROMPT);
  assertEq(r.pass, true, 'valid prompt passes');
  assertEq(r.missing_sections, [], 'no missing sections');
  assertEq(r.prohibited_language, [], 'no prohibited language');
  assertEq(r.section_count, 8, 'all 8 sections found');
  assertEq(r.total_required, 8, 'total_required=8');
  assert(r.checked_at.length > 0, 'has checked_at');
  assert(typeof r.sections === 'object', 'sections object');
  assertEq(r.sections['METADATA'], true, 'METADATA true');
  assertEq(r.sections['FINAL REQUIREMENT'], true, 'FINAL REQUIREMENT true');
}

// ============================================================================
// auditPromptText — missing sections
// ============================================================================
console.log('\n── auditPromptText: missing sections ─────────────────────');

{
  // Empty text → everything missing
  const r = auditPromptText('');
  assertEq(r.pass, false, 'empty → fail');
  assertEq(r.section_count, 0, '0 sections found');
  assertEq(r.missing_sections.length, 8, 'all 8 missing');
  assert(r.notes.some((n: string) => n.includes('MISSING REQUIRED SECTIONS')), 'note about missing');
}

{
  // Only metadata → 7 missing
  const r = auditPromptText('[METADATA]');
  assertEq(r.pass, false, 'partial → fail');
  assertEq(r.section_count, 1, 'only metadata found');
  assertEq(r.missing_sections.length, 7, '7 missing');
  assertEq(r.sections['METADATA'], true, 'metadata present');
  assertEq(r.sections['TASK'], false, 'task missing');
}

// ============================================================================
// auditPromptText — prohibited language
// ============================================================================
console.log('\n── auditPromptText: prohibited language ──────────────────');

{
  const bad = VALID_PROMPT + '\n\nNote: we can add a fallback if needed.';
  const r = auditPromptText(bad);
  assertEq(r.pass, false, 'prohibited → fail');
  assertEq(r.prohibited_language.length, 1, '1 prohibited match');
  assertEq(r.prohibited_language[0].phrase, 'fallback', 'phrase=fallback');
  assert(r.prohibited_language[0].context.includes('fallback'), 'context contains match');
  assert(typeof r.prohibited_language[0].index === 'number', 'has index');
  assert(r.notes.some((n: string) => n.includes('PROHIBITED LANGUAGE')), 'note about prohibited');
}

{
  // Multiple prohibited phrases
  const bad = VALID_PROMPT + '\n\nHack together a quick fix for now.';
  const r = auditPromptText(bad);
  assertEq(r.pass, false, 'multi-prohibited → fail');
  assert(r.prohibited_language.length >= 3, '3+ prohibited matches (hack, quick fix, for now)');
  const phrases = r.prohibited_language.map((p: any) => p.phrase);
  assert(phrases.includes('hack'), 'hack detected');
  assert(phrases.includes('quick fix'), 'quick fix detected');
  assert(phrases.includes('for now'), 'for now detected');
}

// ============================================================================
// auditPromptText — OUTPUT REQUIREMENTS too short
// ============================================================================
console.log('\n── auditPromptText: section content length ──────────────');

{
  // Replace OUTPUT REQUIREMENTS content with tiny content
  const short = VALID_PROMPT.replace(
    /OUTPUT REQUIREMENTS:[\s\S]*?(?=\n\nPROHIBITIONS)/,
    'OUTPUT REQUIREMENTS:\n- x'
  );
  const r = auditPromptText(short);
  assertEq(r.pass, false, 'short OUTPUT → fail');
  assert(r.notes.some((n: string) => n.includes('OUTPUT REQUIREMENTS')), 'note about OUTPUT');
}

{
  // Short PROHIBITIONS section
  const short = VALID_PROMPT.replace(
    /PROHIBITIONS:[\s\S]*?(?=\n\nFINAL REQUIREMENT)/,
    'PROHIBITIONS:\n- no'
  );
  const r = auditPromptText(short);
  assertEq(r.pass, false, 'short PROHIBITIONS → fail');
  assert(r.notes.some((n: string) => n.includes('PROHIBITIONS')), 'note about PROHIBITIONS');
}

{
  // Short TASK section
  const short = VALID_PROMPT.replace(
    /TASK:[\s\S]*?(?=\n\nREQUIREMENTS)/,
    'TASK:\nshort'
  );
  const r = auditPromptText(short);
  assertEq(r.pass, false, 'short TASK → fail');
  assert(r.notes.some((n: string) => n.includes('TASK')), 'note about TASK');
}

// ============================================================================
// runAudit — prompt not found
// ============================================================================
console.log('\n── runAudit: not found ───────────────────────────────────');

{
  resetState();
  routes = [{ match: /SELECT \* FROM om_prompt_registry/i, rows: [] }];
  let caught: Error | null = null;
  try {
    await runAudit('nonexistent', 'tester');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on not found');
  assert(caught !== null && caught.message.includes('Prompt not found'), 'error message');
}

// ============================================================================
// runAudit — verified prompt cannot be audited
// ============================================================================
console.log('\n── runAudit: verified immutable ──────────────────────────');

{
  resetState();
  routes = [{
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    rows: [{
      id: 'p1', prompt_text: VALID_PROMPT, status: 'verified', guardrails_applied: 1,
    }],
  }];
  let caught: Error | null = null;
  try {
    await runAudit('p1', 'tester');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on verified');
  assert(caught !== null && caught.message.includes('verified'), 'error mentions verified');
}

// ============================================================================
// runAudit — guardrails_applied false forces fail
// ============================================================================
console.log('\n── runAudit: guardrails enforcement ──────────────────────');

{
  resetState();
  const promptRow = {
    id: 'p2', prompt_text: VALID_PROMPT, status: 'draft', guardrails_applied: 0,
  };
  routes = [
    { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i, rows: [promptRow] },
    { match: /UPDATE om_prompt_registry SET\s+audit_status/i, rows: { affectedRows: 1 } },
    { match: /INSERT INTO system_logs/i, rows: { insertId: 1 } },
  ];
  const r = await runAudit('p2', 'tester');
  assertEq(r.audit_status, 'fail', 'fail due to guardrails');
  assertEq(r.audit.pass, false, 'pass=false');
  assert(r.audit.notes.some((n: string) => n.includes('GUARDRAILS NOT APPLIED')), 'guardrails note');
}

// ============================================================================
// runAudit — passing draft transitions to audited
// ============================================================================
console.log('\n── runAudit: draft → audited on pass ─────────────────────');

{
  resetState();
  const promptRow = {
    id: 'p3', prompt_text: VALID_PROMPT, status: 'draft', guardrails_applied: 1,
  };
  const statusUpdates: string[] = [];
  routes = [
    { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i, rows: [promptRow] },
    { match: /UPDATE om_prompt_registry SET\s+audit_status/i, rows: { affectedRows: 1 } },
    { match: /UPDATE om_prompt_registry SET status = 'audited'/i, rows: { affectedRows: 1 } },
    { match: /INSERT INTO system_logs/i, rows: { insertId: 1 } },
  ];
  const r = await runAudit('p3', 'tester');
  assertEq(r.audit.pass, true, 'audit passed');
  assertEq(r.audit_status, 'pass', 'audit_status=pass');
  // Verify the transition query was issued
  const transitionCall = queryLog.find(c => /SET status = 'audited'/i.test(c.sql));
  assert(transitionCall !== undefined, 'transition query issued');
  assertEq(transitionCall?.params, ['p3'], 'transition params');
  // Verify audit_status persisted
  const persistCall = queryLog.find(c => /UPDATE om_prompt_registry SET\s+audit_status/i.test(c.sql));
  assert(persistCall !== undefined, 'persist query issued');
  assertEq(persistCall?.params[0], 'pass', 'audit_status=pass in UPDATE');
  assertEq(persistCall?.params[3], 'tester', 'audited_by=tester');
  // System log emitted
  const logCall = queryLog.find(c => /INSERT INTO system_logs/i.test(c.sql));
  assert(logCall !== undefined, 'system_logs insert');
  assertEq(logCall?.params[0], 'SUCCESS', 'SUCCESS level');
  assert(logCall?.params[1].includes('AUDIT_PASS'), 'AUDIT_PASS tag');
}

// ============================================================================
// runAudit — failing audited reverts to draft
// ============================================================================
console.log('\n── runAudit: audited → draft on fail ─────────────────────');

{
  resetState();
  const promptRow = {
    id: 'p4', prompt_text: '[METADATA]', status: 'audited', guardrails_applied: 1,
  };
  routes = [
    { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i, rows: [promptRow] },
    { match: /UPDATE om_prompt_registry SET\s+audit_status/i, rows: { affectedRows: 1 } },
    { match: /UPDATE om_prompt_registry SET status = 'draft'/i, rows: { affectedRows: 1 } },
    { match: /INSERT INTO system_logs/i, rows: { insertId: 1 } },
  ];
  const r = await runAudit('p4', 'tester');
  assertEq(r.audit.pass, false, 'audit failed');
  assertEq(r.audit_status, 'fail', 'audit_status=fail');
  const revertCall = queryLog.find(c => /SET status = 'draft'/i.test(c.sql));
  assert(revertCall !== undefined, 'revert query issued');
  assertEq(revertCall?.params, ['p4'], 'revert params');
  // Log is WARN on fail
  const logCall = queryLog.find(c => /INSERT INTO system_logs/i.test(c.sql));
  assertEq(logCall?.params[0], 'WARN', 'WARN level on fail');
  assert(logCall?.params[1].includes('AUDIT_FAIL'), 'AUDIT_FAIL tag');
}

// ============================================================================
// getAuditResult
// ============================================================================
console.log('\n── getAuditResult ────────────────────────────────────────');

{
  resetState();
  const auditObj = { pass: true, sections: {}, notes: ['ok'] };
  routes = [{
    match: /SELECT id, audit_status/i,
    rows: [{
      id: 'pa', audit_status: 'pass',
      audit_result: JSON.stringify(auditObj),
      audit_notes: 'notes', audited_at: '2026-04-10', audited_by: 'a',
    }],
  }];
  const r = await getAuditResult('pa');
  assertEq(r.prompt_id, 'pa', 'prompt_id');
  assertEq(r.audit_status, 'pass', 'audit_status');
  assertEq(r.audit_result, auditObj, 'audit_result parsed');
  assertEq(r.audited_by, 'a', 'audited_by');
}

// null audit_result
{
  resetState();
  routes = [{
    match: /SELECT id, audit_status/i,
    rows: [{
      id: 'pb', audit_status: 'pending', audit_result: null,
      audit_notes: null, audited_at: null, audited_by: null,
    }],
  }];
  const r = await getAuditResult('pb');
  assertEq(r.audit_result, null, 'null → null (not parsed)');
  assertEq(r.audit_status, 'pending', 'pending status');
}

// not found
{
  resetState();
  routes = [{ match: /SELECT id, audit_status/i, rows: [] }];
  let caught: Error | null = null;
  try {
    await getAuditResult('missing');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on not found');
}

// ============================================================================
// enforceAuditPass
// ============================================================================
console.log('\n── enforceAuditPass ──────────────────────────────────────');

// Passing
{
  resetState();
  routes = [{
    match: /SELECT audit_status FROM om_prompt_registry/i,
    rows: [{ audit_status: 'pass' }],
  }];
  let caught: Error | null = null;
  try {
    await enforceAuditPass('p5');
  } catch (e: any) { caught = e; }
  assertEq(caught, null, 'pass → no throw');
}

// Pending → specific error message
{
  resetState();
  routes = [{
    match: /SELECT audit_status FROM om_prompt_registry/i,
    rows: [{ audit_status: 'pending' }],
  }];
  let caught: Error | null = null;
  try {
    await enforceAuditPass('p6');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'pending → throw');
  assert(caught !== null && caught.message.includes('POST /api/prompts'), 'pending hint');
}

// Fail → generic
{
  resetState();
  routes = [{
    match: /SELECT audit_status FROM om_prompt_registry/i,
    rows: [{ audit_status: 'fail' }],
  }];
  let caught: Error | null = null;
  try {
    await enforceAuditPass('p7');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'fail → throw');
  assert(caught !== null && caught.message.includes('Fix the prompt'), 'fix hint');
}

// Not found
{
  resetState();
  routes = [{ match: /SELECT audit_status/i, rows: [] }];
  let caught: Error | null = null;
  try {
    await enforceAuditPass('missing');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'not found → throw');
  assert(caught !== null && caught.message.includes('not found'), 'not found msg');
}

// ============================================================================
// resetAudit
// ============================================================================
console.log('\n── resetAudit ────────────────────────────────────────────');

{
  resetState();
  routes = [{ match: /UPDATE om_prompt_registry SET\s+audit_status = 'pending'/i, rows: { affectedRows: 1 } }];
  await resetAudit('p8');
  assertEq(queryLog.length, 1, 'one UPDATE');
  assert(/audit_status = 'pending'/i.test(queryLog[0].sql), 'sets pending');
  assert(/audit_result = NULL/i.test(queryLog[0].sql), 'clears result');
  assert(/audit_notes = NULL/i.test(queryLog[0].sql), 'clears notes');
  assert(/audited_at = NULL/i.test(queryLog[0].sql), 'clears audited_at');
  assert(/audited_by = NULL/i.test(queryLog[0].sql), 'clears audited_by');
  assertEq(queryLog[0].params, ['p8'], 'id param');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
