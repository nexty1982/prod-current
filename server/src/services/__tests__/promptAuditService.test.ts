#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptAuditService.js (OMD-1079)
 *
 * Guardrail enforcement layer. Pure `auditPromptText` + DB-backed
 * `runAudit`/`getAuditResult`/`enforceAuditPass`/`resetAudit`.
 *
 * The only external dep is `../config/db.getAppPool()`. We stub it via
 * require.cache with a SQL-routed fake pool BEFORE requiring the SUT.
 *
 * Coverage:
 *   Pure:
 *     - auditPromptText:
 *         · all sections present + good content → pass
 *         · missing sections → fail with notes naming each
 *         · prohibited language (single + multiple) → fail with phrases listed
 *         · OUTPUT REQUIREMENTS / PROHIBITIONS / TASK content length checks
 *         · empty text → fail
 *         · case-insensitive section detection
 *         · context string captured around prohibited match
 *         · section_count / total_required accurate
 *
 *   With stubbed pool:
 *     - runAudit:
 *         · prompt not found → throw
 *         · status='verified' → throw (immutable)
 *         · guardrails_applied=false → forces fail
 *         · pass path: draft → audited transition + pass log
 *         · fail path: audited → draft revert + WARN log
 *         · neither draft nor audited: no extra transition
 *     - getAuditResult: not found → throw; row → parses audit_result JSON
 *     - enforceAuditPass: not found throws; 'fail'/'pending' throw with hint;
 *       'pass' returns (no-op success)
 *     - resetAudit: issues correct UPDATE with NULL fields
 *     - REQUIRED_SECTIONS / PROHIBITED_PHRASES exports (string arrays)
 *
 * Run: npx tsx server/src/services/__tests__/promptAuditService.test.ts
 */

import * as pathMod from 'path';

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

// ── SQL-routed fake pool ────────────────────────────────────────────
type Route = { match: RegExp; respond: (params: any[], sql: string) => any };
const routes: Route[] = [];
const queryLog: Array<{ sql: string; params: any[] }> = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) return r.respond(params, sql);
    }
    // Default: treat UPDATE as success, SELECT as empty
    if (/^\s*UPDATE/i.test(sql)) return [{ affectedRows: 1 }, []];
    if (/^\s*INSERT/i.test(sql)) return [{ insertId: 1 }, []];
    return [[], []];
  },
};

const dbStub = { getAppPool: () => fakePool };

function stubModule(relFromSrc: string, exports: any) {
  const base = pathMod.resolve(__dirname, '..', '..', relFromSrc);
  for (const candidate of [base, base + '.js', base + '.ts']) {
    try {
      const resolved = require.resolve(candidate);
      require.cache[resolved] = {
        id: resolved,
        filename: resolved,
        loaded: true,
        exports,
      } as any;
    } catch { /* not resolvable */ }
  }
}
stubModule('config/db', dbStub);

function resetRoutes() {
  routes.length = 0;
  queryLog.length = 0;
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

// ── Helper: build a valid prompt text ────────────────────────────────
function validPromptText(): string {
  return `[METADATA]
title: Sample
owner: test

---

CRITICAL EXECUTION RULES
Execute all steps in strict order. Do not skip any.

SYSTEM PRIORITIES
1. Correctness
2. Safety
3. Reliability

TASK:
Build a new module that validates user sessions and returns an authenticated user object with full permissions inline.

REQUIREMENTS:
- Must pass all existing tests
- Must include new unit tests covering edge cases
- Must update documentation

OUTPUT REQUIREMENTS:
- Complete source files committed to the repo
- Test suite passing in CI
- API documentation updated with new endpoints

PROHIBITIONS:
- Do not modify any authentication flow outside the scoped files
- Do not introduce new external dependencies without approval
- Do not weaken any existing security controls

FINAL REQUIREMENT:
All items above must be completed end-to-end before declaring the task done.`;
}

async function main() {

  // ========================================================================
  // auditPromptText: happy path
  // ========================================================================
  console.log('\n── auditPromptText: happy path ───────────────────────────');

  {
    const r = auditPromptText(validPromptText());
    assertEq(r.pass, true, 'valid prompt passes');
    assertEq(r.missing_sections.length, 0, 'no missing');
    assertEq(r.prohibited_language.length, 0, 'no prohibited');
    assertEq(r.notes.length, 0, 'no notes');
    assertEq(r.section_count, 8, '8 sections');
    assertEq(r.total_required, 8, 'total required 8');
    assert(typeof r.checked_at === 'string', 'checked_at ISO');

    // Every section marked present
    for (const key of REQUIRED_SECTIONS) {
      assertEq(r.sections[key], true, `section ${key} present`);
    }
  }

  // ========================================================================
  // auditPromptText: missing sections
  // ========================================================================
  console.log('\n── auditPromptText: missing sections ─────────────────────');

  {
    const text = 'Just some random text with no structure at all.';
    const r = auditPromptText(text);
    assertEq(r.pass, false, 'fails');
    assertEq(r.missing_sections.length, 8, 'all 8 missing');
    assert(
      r.notes.some((n: string) => n.includes('MISSING REQUIRED SECTIONS')),
      'note: missing sections',
    );
    assert(
      r.notes[0].includes('[METADATA]'),
      'note lists [METADATA]',
    );
    assertEq(r.section_count, 0, '0 sections');
  }

  // Missing just one (TASK)
  {
    const text = validPromptText().replace(/TASK:[\s\S]*?REQUIREMENTS/, 'REQUIREMENTS');
    const r = auditPromptText(text);
    assertEq(r.pass, false, 'missing TASK fails');
    assert(r.missing_sections.includes('TASK'), 'TASK in missing');
    assertEq(r.sections['TASK'], false, 'TASK marked absent');
    assertEq(r.sections['REQUIREMENTS'], true, 'REQUIREMENTS still present');
  }

  // ========================================================================
  // auditPromptText: prohibited language
  // ========================================================================
  console.log('\n── auditPromptText: prohibited language ──────────────────');

  {
    const text = validPromptText() + '\n\nNote: use a workaround for now.';
    const r = auditPromptText(text);
    assertEq(r.pass, false, 'prohibited fails');
    assert(r.prohibited_language.length >= 2, 'at least 2 prohibited');
    const phrases = r.prohibited_language.map((p: any) => p.phrase);
    assert(phrases.includes('workaround'), 'workaround detected');
    assert(phrases.includes('for now'), 'for now detected');
    assert(
      r.notes.some((n: string) => n.includes('PROHIBITED LANGUAGE')),
      'note: prohibited',
    );
    // Context captured around match
    const wa = r.prohibited_language.find((p: any) => p.phrase === 'workaround');
    assert(typeof wa.context === 'string', 'context string');
    assert(wa.context.length > 0, 'context non-empty');
    assert(typeof wa.index === 'number', 'index number');
  }

  {
    const text = validPromptText().replace(
      /FINAL REQUIREMENT:/,
      'Add a placeholder and quick fix then FINAL REQUIREMENT:',
    );
    const r = auditPromptText(text);
    const phrases = r.prohibited_language.map((p: any) => p.phrase);
    assert(phrases.includes('placeholder'), 'placeholder caught');
    assert(phrases.includes('quick fix'), 'quick fix caught');
  }

  // Case-insensitive
  {
    const text = validPromptText() + '\n\nConsider a FALLBACK plan.';
    const r = auditPromptText(text);
    assertEq(r.pass, false, 'uppercase FALLBACK caught');
    assert(
      r.prohibited_language.some((p: any) => p.phrase === 'fallback'),
      'fallback in list',
    );
  }

  // ========================================================================
  // auditPromptText: content length checks
  // ========================================================================
  console.log('\n── auditPromptText: content length ───────────────────────');

  // Thin OUTPUT REQUIREMENTS (less than 20 chars in section)
  {
    const text = validPromptText().replace(
      /OUTPUT REQUIREMENTS:[\s\S]*?PROHIBITIONS:/,
      'OUTPUT REQUIREMENTS:\nok\n\nPROHIBITIONS:',
    );
    const r = auditPromptText(text);
    assertEq(r.pass, false, 'thin output fails');
    assert(
      r.notes.some((n: string) => n.includes('OUTPUT REQUIREMENTS section exists but has insufficient content')),
      'note mentions output req',
    );
  }

  // Thin PROHIBITIONS
  {
    const text = validPromptText().replace(
      /PROHIBITIONS:[\s\S]*?FINAL REQUIREMENT:/,
      'PROHIBITIONS:\nnone\n\nFINAL REQUIREMENT:',
    );
    const r = auditPromptText(text);
    assertEq(r.pass, false, 'thin prohibitions fails');
    assert(
      r.notes.some((n: string) => n.includes('PROHIBITIONS section exists but has insufficient content')),
      'note mentions prohibitions',
    );
  }

  // Thin TASK
  {
    const text = validPromptText().replace(
      /TASK:[\s\S]*?REQUIREMENTS:/,
      'TASK:\ndo it\n\nREQUIREMENTS:',
    );
    const r = auditPromptText(text);
    assertEq(r.pass, false, 'thin TASK fails');
    assert(
      r.notes.some((n: string) => n.includes('TASK section is too brief')),
      'note mentions TASK',
    );
  }

  // Empty text
  {
    const r = auditPromptText('');
    assertEq(r.pass, false, 'empty fails');
    assertEq(r.missing_sections.length, 8, '8 missing');
  }

  // ========================================================================
  // runAudit: prompt not found
  // ========================================================================
  console.log('\n── runAudit: not found ───────────────────────────────────');

  {
    resetRoutes();
    routes.push({
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
      respond: () => [[], []],
    });
    let err: Error | null = null;
    try { await runAudit('missing-id', 'tester'); }
    catch (e: any) { err = e; }
    assert(err !== null, 'throws');
    assert(err?.message.includes('not found'), 'correct msg');
  }

  // ========================================================================
  // runAudit: verified → immutable
  // ========================================================================
  console.log('\n── runAudit: verified immutable ──────────────────────────');

  {
    resetRoutes();
    routes.push({
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
      respond: () => [[{
        id: 'p1',
        status: 'verified',
        prompt_text: validPromptText(),
        guardrails_applied: 1,
      }], []],
    });
    let err: Error | null = null;
    try { await runAudit('p1', 'tester'); }
    catch (e: any) { err = e; }
    assert(err !== null, 'throws');
    assert(err?.message.includes('immutable'), 'immutable msg');
  }

  // ========================================================================
  // runAudit: pass path (draft → audited)
  // ========================================================================
  console.log('\n── runAudit: pass draft→audited ──────────────────────────');

  {
    resetRoutes();
    let selectCount = 0;
    routes.push({
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
      respond: () => {
        selectCount++;
        if (selectCount === 1) {
          // Initial load
          return [[{
            id: 'p2',
            status: 'draft',
            prompt_text: validPromptText(),
            guardrails_applied: 1,
          }], []];
        }
        // Final reload (after UPDATE)
        return [[{
          id: 'p2',
          status: 'audited',
          prompt_text: validPromptText(),
          audit_status: 'pass',
        }], []];
      },
    });

    const r = await runAudit('p2', 'alice');
    assertEq(r.audit.pass, true, 'pass');
    assertEq(r.audit_status, 'pass', 'audit_status pass');
    assertEq(r.prompt.status, 'audited', 'prompt now audited');

    // Verify the expected queries fired
    const updates = queryLog.filter(q => /UPDATE om_prompt_registry SET/i.test(q.sql));
    assertEq(updates.length, 2, '2 updates (audit + status transition)');
    // First update: audit_status/result/notes
    assert(updates[0].sql.includes('audit_status'), 'first UPDATE sets audit_status');
    assertEq(updates[0].params[0], 'pass', 'first UPDATE: pass');
    assertEq(updates[0].params[3], 'alice', 'first UPDATE: audited_by');
    // Second update: status → audited
    assert(/status = 'audited'/.test(updates[1].sql), 'second UPDATE: → audited');

    const inserts = queryLog.filter(q => /INSERT INTO system_logs/i.test(q.sql));
    assertEq(inserts.length, 1, '1 log');
    assertEq(inserts[0].params[0], 'SUCCESS', 'SUCCESS level');
    assert(inserts[0].params[1].includes('AUDIT_PASS'), 'msg tag AUDIT_PASS');
    assertEq(inserts[0].params[3], 'alice', 'user_email in log');
  }

  // ========================================================================
  // runAudit: fail path (audited → draft revert + WARN log)
  // ========================================================================
  console.log('\n── runAudit: fail audited→draft ──────────────────────────');

  {
    resetRoutes();
    let sel = 0;
    routes.push({
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
      respond: () => {
        sel++;
        if (sel === 1) {
          return [[{
            id: 'p3',
            status: 'audited',
            prompt_text: 'nonsense with no structure and uses a workaround',
            guardrails_applied: 1,
          }], []];
        }
        return [[{ id: 'p3', status: 'draft' }], []];
      },
    });

    const r = await runAudit('p3', 'bob');
    assertEq(r.audit.pass, false, 'fails');
    assertEq(r.audit_status, 'fail', 'audit_status fail');

    const updates = queryLog.filter(q => /UPDATE om_prompt_registry SET/i.test(q.sql));
    assertEq(updates.length, 2, '2 updates (audit + revert)');
    assert(/status = 'draft'/.test(updates[1].sql), 'reverts to draft');

    const inserts = queryLog.filter(q => /INSERT INTO system_logs/i.test(q.sql));
    assertEq(inserts[0].params[0], 'WARN', 'WARN level');
    assert(inserts[0].params[1].includes('AUDIT_FAIL'), 'msg AUDIT_FAIL');
  }

  // ========================================================================
  // runAudit: guardrails_applied=false forces fail
  // ========================================================================
  console.log('\n── runAudit: guardrails not applied ──────────────────────');

  {
    resetRoutes();
    let sel = 0;
    routes.push({
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
      respond: () => {
        sel++;
        if (sel === 1) {
          return [[{
            id: 'p4',
            status: 'draft',
            prompt_text: validPromptText(), // structurally valid
            guardrails_applied: 0,          // but flag is false
          }], []];
        }
        return [[{ id: 'p4', status: 'draft' }], []];
      },
    });

    const r = await runAudit('p4', 'carol');
    assertEq(r.audit.pass, false, 'fails due to guardrails');
    assertEq(r.audit_status, 'fail', 'audit_status fail');
    assert(
      r.audit.notes.some((n: string) => n.includes('GUARDRAILS NOT APPLIED')),
      'note mentions guardrails',
    );
  }

  // ========================================================================
  // runAudit: no draft↔audited transition when already in another status
  // ========================================================================
  console.log('\n── runAudit: no transition from unrelated status ─────────');

  {
    resetRoutes();
    let sel = 0;
    routes.push({
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
      respond: () => {
        sel++;
        if (sel === 1) {
          return [[{
            id: 'p5',
            status: 'approved',
            prompt_text: validPromptText(),
            guardrails_applied: 1,
          }], []];
        }
        return [[{ id: 'p5', status: 'approved' }], []];
      },
    });

    await runAudit('p5', 'dave');
    const updates = queryLog.filter(q => /UPDATE om_prompt_registry SET/i.test(q.sql));
    // Only the audit UPDATE, no status transition
    assertEq(updates.length, 1, '1 update (no transition)');
  }

  // ========================================================================
  // getAuditResult
  // ========================================================================
  console.log('\n── getAuditResult ────────────────────────────────────────');

  {
    resetRoutes();
    routes.push({
      match: /FROM om_prompt_registry WHERE id = \?/i,
      respond: () => [[{
        id: 'q1',
        audit_status: 'pass',
        audit_result: JSON.stringify({ pass: true, sections: {} }),
        audit_notes: null,
        audited_at: '2026-04-11T10:00:00Z',
        audited_by: 'alice',
      }], []],
    });

    const r = await getAuditResult('q1');
    assertEq(r.prompt_id, 'q1', 'id');
    assertEq(r.audit_status, 'pass', 'status');
    assertEq(r.audit_result.pass, true, 'parsed JSON');
    assertEq(r.audited_by, 'alice', 'audited_by');
  }

  // Not found
  {
    resetRoutes();
    routes.push({
      match: /FROM om_prompt_registry WHERE id = \?/i,
      respond: () => [[], []],
    });
    let err: Error | null = null;
    try { await getAuditResult('nope'); }
    catch (e: any) { err = e; }
    assert(err !== null, 'throws');
  }

  // Null audit_result: should return null (not crash)
  {
    resetRoutes();
    routes.push({
      match: /FROM om_prompt_registry WHERE id = \?/i,
      respond: () => [[{
        id: 'q2',
        audit_status: 'pending',
        audit_result: null,
        audit_notes: null,
        audited_at: null,
        audited_by: null,
      }], []],
    });
    const r = await getAuditResult('q2');
    assertEq(r.audit_result, null, 'null handled');
  }

  // ========================================================================
  // enforceAuditPass
  // ========================================================================
  console.log('\n── enforceAuditPass ──────────────────────────────────────');

  // Not found → throw
  {
    resetRoutes();
    routes.push({
      match: /SELECT audit_status FROM om_prompt_registry WHERE id = \?/i,
      respond: () => [[], []],
    });
    let err: Error | null = null;
    try { await enforceAuditPass('nope'); }
    catch (e: any) { err = e; }
    assert(err !== null, 'not found throws');
  }

  // 'pending' → throws with hint to run audit
  {
    resetRoutes();
    routes.push({
      match: /SELECT audit_status FROM om_prompt_registry WHERE id = \?/i,
      respond: () => [[{ audit_status: 'pending' }], []],
    });
    let err: Error | null = null;
    try { await enforceAuditPass('p'); }
    catch (e: any) { err = e; }
    assert(err !== null, 'pending throws');
    assert(err?.message.includes('POST /api/prompts/:id/audit'), 'hint present');
  }

  // 'fail' → throws with fix hint
  {
    resetRoutes();
    routes.push({
      match: /SELECT audit_status FROM om_prompt_registry WHERE id = \?/i,
      respond: () => [[{ audit_status: 'fail' }], []],
    });
    let err: Error | null = null;
    try { await enforceAuditPass('p'); }
    catch (e: any) { err = e; }
    assert(err !== null, 'fail throws');
    assert(err?.message.includes('Fix the prompt'), 'fix hint');
  }

  // 'pass' → no throw
  {
    resetRoutes();
    routes.push({
      match: /SELECT audit_status FROM om_prompt_registry WHERE id = \?/i,
      respond: () => [[{ audit_status: 'pass' }], []],
    });
    let err: Error | null = null;
    try { await enforceAuditPass('p'); }
    catch (e: any) { err = e; }
    assertEq(err, null, 'pass: no throw');
  }

  // ========================================================================
  // resetAudit
  // ========================================================================
  console.log('\n── resetAudit ────────────────────────────────────────────');

  {
    resetRoutes();
    await resetAudit('r1');
    const updates = queryLog.filter(q => /UPDATE om_prompt_registry SET/i.test(q.sql));
    assertEq(updates.length, 1, '1 update');
    assert(updates[0].sql.includes("audit_status = 'pending'"), 'sets pending');
    assert(updates[0].sql.includes('audit_result = NULL'), 'nulls result');
    assert(updates[0].sql.includes('audit_notes = NULL'), 'nulls notes');
    assert(updates[0].sql.includes('audited_at = NULL'), 'nulls audited_at');
    assertEq(updates[0].params[0], 'r1', 'id param');
  }

  // ========================================================================
  // Exports: REQUIRED_SECTIONS / PROHIBITED_PHRASES
  // ========================================================================
  console.log('\n── exports ───────────────────────────────────────────────');

  assert(Array.isArray(REQUIRED_SECTIONS), 'REQUIRED_SECTIONS array');
  assertEq(REQUIRED_SECTIONS.length, 8, '8 required sections');
  assert(REQUIRED_SECTIONS.includes('METADATA'), 'has METADATA');
  assert(REQUIRED_SECTIONS.includes('CRITICAL EXECUTION RULES'), 'has CRITICAL');
  assert(REQUIRED_SECTIONS.includes('FINAL REQUIREMENT'), 'has FINAL');

  assert(Array.isArray(PROHIBITED_PHRASES), 'PROHIBITED_PHRASES array');
  assert(PROHIBITED_PHRASES.length >= 14, '14+ phrases');
  assert(PROHIBITED_PHRASES.includes('fallback'), 'has fallback');
  assert(PROHIBITED_PHRASES.includes('workaround'), 'has workaround');
  assert(PROHIBITED_PHRASES.includes('hack'), 'has hack');

  // ========================================================================
  // Summary
  // ========================================================================
  console.log(`\n──────────────────────────────────────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error('Unhandled:', e);
  process.exit(1);
});
