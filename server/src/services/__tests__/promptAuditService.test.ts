#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptAuditService.js (OMD-985)
 *
 * Mandatory structural + language audit for prompts.
 * `auditPromptText` is a pure function (no DB) — it's the core testing target.
 * DB-touching methods (runAudit, getAuditResult, etc.) are out of scope.
 *
 * Stubs `../config/db` with a no-op pool so require() succeeds.
 *
 * Coverage:
 *   - Exported constants: REQUIRED_SECTIONS keys, PROHIBITED_PHRASES
 *   - auditPromptText:
 *       · Empty/minimal text: all sections missing, pass=false
 *       · Fully valid prompt: pass=true, notes empty
 *       · Each required section detected (8 sections)
 *       · Missing sections produce note listing them
 *       · Each prohibited phrase caught (sample across the 14)
 *       · Prohibited language includes context snippet + index
 *       · OUTPUT REQUIREMENTS under 20 chars → fail
 *       · PROHIBITIONS under 20 chars → fail
 *       · TASK section under 30 chars → fail
 *       · section_count / total_required accuracy
 *       · checked_at is ISO timestamp
 *       · Case-insensitive section matching
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

// ── Stub ../config/db ────────────────────────────────────────────────────
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => ({ query: async () => [[], []] }) },
} as any;

const svc = require('../promptAuditService');

// ── Helper: build a fully valid prompt ───────────────────────────────────
function validPrompt(): string {
  return `[METADATA]
prompt_id: test-001
created_at: 2026-04-10

---

CRITICAL EXECUTION RULES:
- Follow all instructions exactly as written
- Do not deviate from the specified approach

---

SYSTEM PRIORITIES:
- Correctness over speed
- Completeness over brevity

---

TASK:
Implement a comprehensive user authentication system with JWT tokens, refresh tokens, and proper session management for the platform.

---

REQUIREMENTS:
- Must use bcrypt for password hashing
- Must validate JWT on every request
- Must support refresh token rotation

---

OUTPUT REQUIREMENTS:
- auth middleware module with full test coverage
- login/logout/refresh API endpoints
- documented session schema with migration SQL

---

PROHIBITIONS:
- Do not store passwords in plain text
- Do not skip token validation for convenience
- Do not rely on client-side session storage alone

---

FINAL REQUIREMENT:
All code must pass linting, type-checking, and unit tests before merge.
`;
}

// ============================================================================
// Exported constants
// ============================================================================
console.log('\n── Exported constants ────────────────────────────────────');

assert(Array.isArray(svc.REQUIRED_SECTIONS), 'REQUIRED_SECTIONS is array');
assertEq(svc.REQUIRED_SECTIONS.length, 8, '8 required sections');
assert(svc.REQUIRED_SECTIONS.includes('METADATA'), 'has METADATA');
assert(svc.REQUIRED_SECTIONS.includes('CRITICAL EXECUTION RULES'), 'has CRITICAL EXECUTION RULES');
assert(svc.REQUIRED_SECTIONS.includes('SYSTEM PRIORITIES'), 'has SYSTEM PRIORITIES');
assert(svc.REQUIRED_SECTIONS.includes('TASK'), 'has TASK');
assert(svc.REQUIRED_SECTIONS.includes('REQUIREMENTS'), 'has REQUIREMENTS');
assert(svc.REQUIRED_SECTIONS.includes('OUTPUT REQUIREMENTS'), 'has OUTPUT REQUIREMENTS');
assert(svc.REQUIRED_SECTIONS.includes('PROHIBITIONS'), 'has PROHIBITIONS');
assert(svc.REQUIRED_SECTIONS.includes('FINAL REQUIREMENT'), 'has FINAL REQUIREMENT');

assert(Array.isArray(svc.PROHIBITED_PHRASES), 'PROHIBITED_PHRASES is array');
assertEq(svc.PROHIBITED_PHRASES.length, 14, '14 prohibited phrases');
assert(svc.PROHIBITED_PHRASES.includes('fallback'), 'has fallback');
assert(svc.PROHIBITED_PHRASES.includes('workaround'), 'has workaround');
assert(svc.PROHIBITED_PHRASES.includes('placeholder'), 'has placeholder');
assert(svc.PROHIBITED_PHRASES.includes('hack'), 'has hack');
assert(svc.PROHIBITED_PHRASES.includes('quick fix'), 'has quick fix');

// ============================================================================
// auditPromptText: empty/minimal
// ============================================================================
console.log('\n── auditPromptText: empty/minimal ────────────────────────');

{
  const r = svc.auditPromptText('');
  assertEq(r.pass, false, 'empty → fail');
  assertEq(r.section_count, 0, 'empty: 0 sections found');
  assertEq(r.total_required, 8, 'total_required=8');
  assertEq(r.missing_sections.length, 8, 'all 8 missing');
  assertEq(r.prohibited_language, [], 'no prohibited');
  assert(r.notes.length > 0, 'has notes');
  assert(r.notes[0].includes('MISSING REQUIRED SECTIONS'), 'notes mention missing');
  assert(typeof r.checked_at === 'string', 'checked_at is string');
  assert(/^\d{4}-\d{2}-\d{2}T/.test(r.checked_at), 'checked_at is ISO');
}

// A prompt with only METADATA
{
  const r = svc.auditPromptText('[METADATA]\nfoo: bar');
  assertEq(r.pass, false, 'partial → fail');
  assertEq(r.sections.METADATA, true, 'METADATA found');
  assertEq(r.sections.TASK, false, 'TASK not found');
  assertEq(r.section_count, 1, '1 section found');
  assertEq(r.missing_sections.length, 7, '7 missing');
}

// ============================================================================
// auditPromptText: fully valid
// ============================================================================
console.log('\n── auditPromptText: fully valid ──────────────────────────');

{
  const r = svc.auditPromptText(validPrompt());
  assertEq(r.pass, true, 'valid prompt passes');
  assertEq(r.section_count, 8, 'all 8 sections found');
  assertEq(r.missing_sections, [], 'none missing');
  assertEq(r.prohibited_language, [], 'no prohibited language');
  assertEq(r.notes, [], 'no notes');
  assertEq(r.sections.METADATA, true, 'METADATA present');
  assertEq(r.sections.TASK, true, 'TASK present');
  assertEq(r.sections['OUTPUT REQUIREMENTS'], true, 'OUTPUT REQUIREMENTS present');
  assertEq(r.sections['FINAL REQUIREMENT'], true, 'FINAL REQUIREMENT present');
}

// Case insensitive
{
  const lowered = validPrompt().toLowerCase();
  const r = svc.auditPromptText(lowered);
  assertEq(r.pass, true, 'lowercased prompt still passes (case-insensitive)');
}

// ============================================================================
// auditPromptText: missing individual sections
// ============================================================================
console.log('\n── auditPromptText: missing sections ─────────────────────');

{
  // Remove FINAL REQUIREMENT
  const text = validPrompt().replace(/FINAL REQUIREMENT:[\s\S]*$/, '');
  const r = svc.auditPromptText(text);
  assertEq(r.pass, false, 'missing FINAL REQUIREMENT → fail');
  assertEq(r.sections['FINAL REQUIREMENT'], false, 'FINAL REQUIREMENT flag false');
  assert(r.missing_sections.includes('FINAL REQUIREMENT'), 'missing_sections lists it');
  assert(r.notes.some((n: string) => n.includes('FINAL REQUIREMENT')), 'notes mention it');
}

{
  // Remove METADATA
  const text = validPrompt().replace(/\[METADATA\][\s\S]*?---/, '---');
  const r = svc.auditPromptText(text);
  assertEq(r.sections.METADATA, false, 'METADATA missing');
  assert(r.missing_sections.includes('METADATA'), 'METADATA in missing list');
}

// ============================================================================
// auditPromptText: prohibited language detection
// ============================================================================
console.log('\n── auditPromptText: prohibited language ──────────────────');

{
  const text = validPrompt() + '\nExtra: add a fallback in case the API is down.';
  const r = svc.auditPromptText(text);
  assertEq(r.pass, false, 'fallback → fail');
  assertEq(r.prohibited_language.length, 1, 'one prohibited match');
  assertEq(r.prohibited_language[0].phrase, 'fallback', 'phrase=fallback');
  assert(r.prohibited_language[0].matched.toLowerCase() === 'fallback', 'matched fallback');
  assert(typeof r.prohibited_language[0].index === 'number', 'has index');
  assert(r.prohibited_language[0].context.length > 0, 'has context');
  assert(r.prohibited_language[0].context.includes('fallback'), 'context includes match');
  assert(r.notes.some((n: string) => n.includes('PROHIBITED LANGUAGE')), 'notes header');
}

// Multiple prohibited phrases
{
  const text = validPrompt() + '\nUse a workaround for now — it\'s a hack but good enough.';
  const r = svc.auditPromptText(text);
  assertEq(r.pass, false, 'multiple prohibited → fail');
  assert(r.prohibited_language.length >= 4, 'multiple matches');
  const phrases = r.prohibited_language.map((p: any) => p.phrase);
  assert(phrases.includes('workaround'), 'workaround caught');
  assert(phrases.includes('for now'), 'for now caught');
  assert(phrases.includes('hack'), 'hack caught');
  assert(phrases.includes('good enough'), 'good enough caught');
}

// Individual phrase checks — sample
{
  const cases: { text: string; phrase: string }[] = [
    { text: 'a temporary fix for this', phrase: 'temporary fix' },
    { text: 'just use the old one', phrase: 'just use' },
    { text: 'partial implementation acceptable', phrase: 'partial implementation' },
    { text: 'mock it for now please', phrase: 'mock it for now' },
    { text: 'simplified version only', phrase: 'simplified version' },
    { text: 'add a placeholder here', phrase: 'placeholder' },
    { text: 'skip for now and come back', phrase: 'skip for now' },
    { text: 'a quick fix will suffice', phrase: 'quick fix' },
    { text: 'if this fails, do something else', phrase: 'if this fails, do X instead' },
  ];
  for (const tc of cases) {
    const r = svc.auditPromptText(validPrompt() + '\n' + tc.text);
    const matched = r.prohibited_language.some((p: any) => p.phrase === tc.phrase);
    assert(matched, `detected: ${tc.phrase}`);
  }
}

// Word-boundary: "hackathon" should NOT trip "hack"
{
  const text = validPrompt() + '\nWe held a hackathon last week.';
  const r = svc.auditPromptText(text);
  const hackMatch = r.prohibited_language.find((p: any) => p.phrase === 'hack');
  assertEq(hackMatch, undefined, 'hackathon does NOT match hack (word boundary)');
}

// ============================================================================
// auditPromptText: insufficient section content
// ============================================================================
console.log('\n── auditPromptText: insufficient content ─────────────────');

// OUTPUT REQUIREMENTS under 20 chars
{
  const text = validPrompt().replace(
    /OUTPUT REQUIREMENTS:[\s\S]*?(?=---)/,
    'OUTPUT REQUIREMENTS:\nshort\n\n'
  );
  const r = svc.auditPromptText(text);
  assertEq(r.pass, false, 'short OUTPUT REQUIREMENTS → fail');
  assert(r.notes.some((n: string) => n.includes('OUTPUT REQUIREMENTS section exists but has insufficient content')), 'OUTPUT REQUIREMENTS note');
}

// PROHIBITIONS under 20 chars
{
  const text = validPrompt().replace(
    /PROHIBITIONS:[\s\S]*?(?=---)/,
    'PROHIBITIONS:\ntoo short\n\n'
  );
  const r = svc.auditPromptText(text);
  assertEq(r.pass, false, 'short PROHIBITIONS → fail');
  assert(r.notes.some((n: string) => n.includes('PROHIBITIONS section exists but has insufficient content')), 'PROHIBITIONS note');
}

// TASK under 30 chars
{
  const text = validPrompt().replace(
    /TASK:[\s\S]*?(?=---)/,
    'TASK:\ntiny\n\n'
  );
  const r = svc.auditPromptText(text);
  assertEq(r.pass, false, 'short TASK → fail');
  assert(r.notes.some((n: string) => n.includes('TASK section is too brief')), 'TASK note');
}

// ============================================================================
// auditPromptText: result shape
// ============================================================================
console.log('\n── auditPromptText: result shape ─────────────────────────');

{
  const r = svc.auditPromptText(validPrompt());
  const expectedKeys = [
    'pass', 'sections', 'missing_sections', 'prohibited_language',
    'notes', 'checked_at', 'section_count', 'total_required',
  ];
  for (const k of expectedKeys) {
    assert(k in r, `result has key: ${k}`);
  }
  assert(typeof r.sections === 'object', 'sections is object');
  assert(Array.isArray(r.missing_sections), 'missing_sections is array');
  assert(Array.isArray(r.prohibited_language), 'prohibited_language is array');
  assert(Array.isArray(r.notes), 'notes is array');
}

// Pass=true requires zero missing + zero prohibited + sufficient content
{
  // Only prohibited → fail but sections all present
  const text = validPrompt() + '\nThis is a hack.';
  const r = svc.auditPromptText(text);
  assertEq(r.pass, false, 'only prohibited → still fail');
  assertEq(r.missing_sections.length, 0, 'no missing sections');
  assert(r.prohibited_language.length > 0, 'has prohibited');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
