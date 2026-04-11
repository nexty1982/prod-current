#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowTemplateService.js (OMD-1101)
 *
 * CRUD, validation, and versioning for reusable workflow templates.
 *
 * Deps stubbed via require.cache:
 *   - ../config/db  → fake pool with SQL-routed query()
 *   - uuid          → deterministic v4 stub
 *
 * Coverage:
 *   - Enum constants exported
 *   - validateTemplate (pure):
 *       · name required
 *       · category must be in VALID_CATEGORIES
 *       · steps required, at least one
 *       · each step: title, purpose, prompt_type required
 *       · step_number duplicates
 *       · step_number sequence from 1
 *       · dependency_type validation
 *       · explicit dependency requires earlier step reference
 *       · parameters: name (lowercase identifier), label, type, uniqueness
 *   - createTemplate:
 *       · validation failure → throws
 *       · invalid release_mode → throws
 *       · INSERT into workflow_templates + workflow_template_steps + snapshot
 *       · returns created template
 *   - updateTemplate:
 *       · not found → throws
 *       · validation failure on merged → throws
 *       · invalid release_mode → throws
 *       · UPDATE row + DELETE+INSERT steps when steps provided
 *       · skip step replacement when not provided
 *   - getTemplateById:
 *       · null when missing
 *       · parses JSON parameters
 *       · loads steps
 *   - listTemplates:
 *       · filters: category, is_active, search
 *       · parses parameters for each row
 *   - deleteTemplate: soft delete (is_active=0)
 *   - publishNewVersion: bumps version + creates snapshot
 *   - getVersionSnapshot: null when missing, parses JSON
 *   - listVersions: returns rows
 *
 * Run: npx tsx server/src/services/__tests__/workflowTemplateService.test.ts
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

// ── Stub helper ─────────────────────────────────────────────────────
function stubModule(fromPath: string, relPath: string, exports: any): void {
  const { createRequire } = require('module');
  const path = require('path');
  const fromFile = require.resolve(fromPath);
  const fromDir = path.dirname(fromFile);
  const scopedRequire = createRequire(path.join(fromDir, 'noop.js'));
  try {
    const resolved = scopedRequire.resolve(relPath);
    require.cache[resolved] = {
      id: resolved,
      filename: resolved,
      loaded: true,
      exports,
    } as any;
  } catch {}
}

// ── Fake pool with SQL routing ──────────────────────────────────────
type Row = Record<string, any>;
type Call = { sql: string; params: any[] };

const poolCalls: Call[] = [];
let templateRows: Row[] = [];
let stepRowsById: Record<string, Row[]> = {};
let listRows: Row[] = [];
let versionRows: Row[] = [];
let versionsList: Row[] = [];

function normalize(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

async function poolQuery(sql: string, params: any[] = []): Promise<any> {
  poolCalls.push({ sql: normalize(sql), params });
  const n = normalize(sql);
  if (/^SELECT \* FROM workflow_templates WHERE id = \?/i.test(n)) {
    return [templateRows];
  }
  if (/FROM workflow_template_steps WHERE template_id = \?/i.test(n)) {
    const id = params[0];
    return [stepRowsById[id] || []];
  }
  if (/^SELECT id, name, description, category, parameters, version/i.test(n)) {
    return [listRows];
  }
  if (/FROM workflow_template_versions WHERE template_id = \? AND version = \?/i.test(n)) {
    return [versionRows];
  }
  if (/SELECT id, version, created_by, created_at FROM workflow_template_versions/i.test(n)) {
    return [versionsList];
  }
  if (/^INSERT INTO/i.test(n)) return [{ insertId: 0, affectedRows: 1 }];
  if (/^UPDATE/i.test(n)) return [{ affectedRows: 1 }];
  if (/^DELETE/i.test(n)) return [{ affectedRows: 1 }];
  return [[]];
}

const fakePool = { query: poolQuery };

function resetState() {
  poolCalls.length = 0;
  templateRows = [];
  stepRowsById = {};
  listRows = [];
  versionRows = [];
  versionsList = [];
}

// ── uuid stub ───────────────────────────────────────────────────────
let uuidCounter = 0;
function nextUuid(): string { return `uuid-${++uuidCounter}`; }
function resetUuid() { uuidCounter = 0; }
stubModule('../workflowTemplateService', '../config/db', { getAppPool: () => fakePool });
stubModule('../workflowTemplateService', 'uuid', { v4: nextUuid });

const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const svc = require('../workflowTemplateService');
const {
  VALID_CATEGORIES,
  VALID_PROMPT_TYPES,
  VALID_DEPENDENCY_TYPES,
  VALID_PARAM_TYPES,
  validateTemplate,
  createTemplate,
  updateTemplate,
  getTemplateById,
  listTemplates,
  deleteTemplate,
  publishNewVersion,
  getVersionSnapshot,
  listVersions,
} = svc;

async function main() {

// ============================================================================
// Enum exports
// ============================================================================
console.log('\n── Enum exports ──────────────────────────────────────────');

assert(Array.isArray(VALID_CATEGORIES) && VALID_CATEGORIES.length > 0, 'VALID_CATEGORIES');
assert(VALID_CATEGORIES.includes('backend'), 'has backend');
assert(VALID_CATEGORIES.includes('frontend'), 'has frontend');
assert(Array.isArray(VALID_PROMPT_TYPES) && VALID_PROMPT_TYPES.length === 6, '6 prompt types');
assert(VALID_PROMPT_TYPES.includes('plan'), 'has plan');
assertEq(VALID_DEPENDENCY_TYPES, ['sequential', 'explicit', 'none'], 'dependency types');
assertEq(VALID_PARAM_TYPES, ['string', 'enum', 'boolean', 'number'], 'param types');

// ============================================================================
// validateTemplate — pure
// ============================================================================
console.log('\n── validateTemplate: valid minimal ───────────────────────');

{
  const t = {
    name: 'Test',
    category: 'backend',
    steps: [
      { step_number: 1, title: 'Plan', purpose: 'p', prompt_type: 'plan' },
    ],
  };
  const r = validateTemplate(t);
  assertEq(r.valid, true, 'valid');
  assertEq(r.errors, [], 'no errors');
}

console.log('\n── validateTemplate: name required ───────────────────────');

{
  const r = validateTemplate({ category: 'backend', steps: [{ step_number: 1, title: 't', purpose: 'p', prompt_type: 'plan' }] });
  assertEq(r.valid, false, 'invalid');
  assert(r.errors.some((e: string) => /name is required/i.test(e)), 'name error');
}

{
  const r = validateTemplate({ name: '   ', category: 'backend', steps: [{ step_number: 1, title: 't', purpose: 'p', prompt_type: 'plan' }] });
  assert(r.errors.some((e: string) => /name is required/i.test(e)), 'blank name');
}

{
  const r = validateTemplate({ name: 123 as any, category: 'backend', steps: [{ step_number: 1, title: 't', purpose: 'p', prompt_type: 'plan' }] });
  assert(r.errors.some((e: string) => /name is required/i.test(e)), 'non-string name');
}

console.log('\n── validateTemplate: category ────────────────────────────');

{
  const r = validateTemplate({
    name: 'T', category: 'invalid_cat',
    steps: [{ step_number: 1, title: 't', purpose: 'p', prompt_type: 'plan' }],
  });
  assert(r.errors.some((e: string) => /Invalid category/i.test(e)), 'invalid category');
}

{
  const r = validateTemplate({
    name: 'T',
    steps: [{ step_number: 1, title: 't', purpose: 'p', prompt_type: 'plan' }],
  });
  assert(r.errors.some((e: string) => /Invalid category/i.test(e)), 'missing category');
}

console.log('\n── validateTemplate: steps required ──────────────────────');

{
  const r = validateTemplate({ name: 'T', category: 'backend' });
  assertEq(r.valid, false, 'invalid');
  assert(r.errors.some((e: string) => /at least one step/i.test(e)), 'needs steps');
}

{
  const r = validateTemplate({ name: 'T', category: 'backend', steps: [] });
  assert(r.errors.some((e: string) => /at least one step/i.test(e)), 'empty array');
}

{
  const r = validateTemplate({ name: 'T', category: 'backend', steps: 'not-an-array' });
  assert(r.errors.some((e: string) => /at least one step/i.test(e)), 'non-array');
}

console.log('\n── validateTemplate: step fields ─────────────────────────');

{
  const r = validateTemplate({
    name: 'T', category: 'backend',
    steps: [{ step_number: 1 }],
  });
  assert(r.errors.some((e: string) => /title is required/i.test(e)), 'title required');
  assert(r.errors.some((e: string) => /purpose is required/i.test(e)), 'purpose required');
  assert(r.errors.some((e: string) => /invalid prompt_type/i.test(e)), 'prompt_type invalid');
}

{
  const r = validateTemplate({
    name: 'T', category: 'backend',
    steps: [{ step_number: 1, title: 't', purpose: 'p', prompt_type: 'bogus' }],
  });
  assert(r.errors.some((e: string) => /invalid prompt_type "bogus"/i.test(e)), 'unknown type');
}

console.log('\n── validateTemplate: duplicate step_number ───────────────');

{
  const r = validateTemplate({
    name: 'T', category: 'backend',
    steps: [
      { step_number: 1, title: 't', purpose: 'p', prompt_type: 'plan' },
      { step_number: 1, title: 't', purpose: 'p', prompt_type: 'plan' },
    ],
  });
  assert(r.errors.some((e: string) => /duplicate step_number 1/i.test(e)), 'dup');
}

console.log('\n── validateTemplate: sequential step numbers ─────────────');

{
  const r = validateTemplate({
    name: 'T', category: 'backend',
    steps: [
      { step_number: 1, title: 't', purpose: 'p', prompt_type: 'plan' },
      { step_number: 3, title: 't', purpose: 'p', prompt_type: 'plan' },
    ],
  });
  assert(r.errors.some((e: string) => /sequential starting from 1/i.test(e)), 'non-sequential');
}

{
  // Starts from 2
  const r = validateTemplate({
    name: 'T', category: 'backend',
    steps: [
      { step_number: 2, title: 't', purpose: 'p', prompt_type: 'plan' },
    ],
  });
  assert(r.errors.some((e: string) => /sequential starting from 1/i.test(e)), 'does not start at 1');
}

{
  // Index fallback when step_number missing
  const r = validateTemplate({
    name: 'T', category: 'backend',
    steps: [
      { title: 't', purpose: 'p', prompt_type: 'plan' },
      { title: 't', purpose: 'p', prompt_type: 'plan' },
    ],
  });
  assertEq(r.valid, true, 'index fallback works');
}

console.log('\n── validateTemplate: dependency_type ─────────────────────');

{
  const r = validateTemplate({
    name: 'T', category: 'backend',
    steps: [
      { step_number: 1, title: 't', purpose: 'p', prompt_type: 'plan', dependency_type: 'bogus' },
    ],
  });
  assert(r.errors.some((e: string) => /invalid dependency_type/i.test(e)), 'invalid dep type');
}

{
  // Explicit without depends_on_step
  const r = validateTemplate({
    name: 'T', category: 'backend',
    steps: [
      { step_number: 1, title: 't', purpose: 'p', prompt_type: 'plan' },
      { step_number: 2, title: 't', purpose: 'p', prompt_type: 'plan', dependency_type: 'explicit' },
    ],
  });
  assert(r.errors.some((e: string) => /explicit dependency requires depends_on_step/i.test(e)), 'explicit missing dep');
}

{
  // Explicit with valid earlier reference
  const r = validateTemplate({
    name: 'T', category: 'backend',
    steps: [
      { step_number: 1, title: 't', purpose: 'p', prompt_type: 'plan' },
      { step_number: 2, title: 't', purpose: 'p', prompt_type: 'plan', dependency_type: 'explicit', depends_on_step: 1 },
    ],
  });
  assertEq(r.valid, true, 'explicit with earlier step OK');
}

console.log('\n── validateTemplate: parameters ──────────────────────────');

{
  const r = validateTemplate({
    name: 'T', category: 'backend',
    steps: [{ step_number: 1, title: 't', purpose: 'p', prompt_type: 'plan' }],
    parameters: [
      { name: 'feature_name', label: 'Feature Name', type: 'string' },
      { name: 'count', label: 'Count', type: 'number' },
    ],
  });
  assertEq(r.valid, true, 'valid params');
}

{
  const r = validateTemplate({
    name: 'T', category: 'backend',
    steps: [{ step_number: 1, title: 't', purpose: 'p', prompt_type: 'plan' }],
    parameters: [{ label: 'X', type: 'string' }],
  });
  assert(r.errors.some((e: string) => /name is required/i.test(e)), 'param name required');
}

{
  const r = validateTemplate({
    name: 'T', category: 'backend',
    steps: [{ step_number: 1, title: 't', purpose: 'p', prompt_type: 'plan' }],
    parameters: [{ name: 'Bad-Name', label: 'X', type: 'string' }],
  });
  assert(r.errors.some((e: string) => /lowercase identifier/i.test(e)), 'must be lowercase identifier');
}

{
  const r = validateTemplate({
    name: 'T', category: 'backend',
    steps: [{ step_number: 1, title: 't', purpose: 'p', prompt_type: 'plan' }],
    parameters: [
      { name: 'x', label: 'X', type: 'string' },
      { name: 'x', label: 'Y', type: 'string' },
    ],
  });
  assert(r.errors.some((e: string) => /duplicate parameter name/i.test(e)), 'duplicate param');
}

{
  const r = validateTemplate({
    name: 'T', category: 'backend',
    steps: [{ step_number: 1, title: 't', purpose: 'p', prompt_type: 'plan' }],
    parameters: [{ name: 'x', type: 'string' }],
  });
  assert(r.errors.some((e: string) => /label is required/i.test(e)), 'label required');
}

{
  const r = validateTemplate({
    name: 'T', category: 'backend',
    steps: [{ step_number: 1, title: 't', purpose: 'p', prompt_type: 'plan' }],
    parameters: [{ name: 'x', label: 'X', type: 'weird' }],
  });
  assert(r.errors.some((e: string) => /invalid type "weird"/i.test(e)), 'bad param type');
}

// ============================================================================
// createTemplate
// ============================================================================
console.log('\n── createTemplate: validation failure ────────────────────');

resetState();
resetUuid();
quiet();
{
  let caught: Error | null = null;
  try { await createTemplate({ name: '', category: 'backend', steps: [] }, 'alice'); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws');
  assert(caught !== null && /validation failed/i.test(caught.message), 'msg');
}

console.log('\n── createTemplate: invalid release_mode ──────────────────');

resetState();
resetUuid();
quiet();
{
  let caught: Error | null = null;
  try {
    await createTemplate({
      name: 'T', category: 'backend',
      steps: [{ step_number: 1, title: 't', purpose: 'p', prompt_type: 'plan' }],
      release_mode: 'bogus_mode',
    }, 'alice');
  } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws');
  assert(caught !== null && /release_mode/i.test(caught.message), 'mentions release_mode');
}

console.log('\n── createTemplate: happy path ────────────────────────────');

resetState();
resetUuid();
// After INSERTs, getTemplateById is called. Set up its response.
templateRows = [{
  id: 'uuid-1',
  name: 'My Template',
  description: 'desc',
  category: 'backend',
  parameters: '[{"name":"x","label":"X","type":"string"}]',
  version: 1,
  is_active: 1,
  created_by: 'alice',
  release_mode: 'manual',
}];
stepRowsById['uuid-1'] = [
  { id: 'uuid-2', step_number: 1, title: 'Plan', purpose: 'plan purpose' },
  { id: 'uuid-3', step_number: 2, title: 'Build', purpose: 'build purpose' },
];
{
  const result = await createTemplate({
    name: '  My Template  ',
    description: 'desc',
    category: 'backend',
    parameters: [{ name: 'x', label: 'X', type: 'string' }],
    steps: [
      { step_number: 1, title: 'Plan', purpose: 'plan purpose', prompt_type: 'plan' },
      { step_number: 2, title: 'Build', purpose: 'build purpose', prompt_type: 'implementation', component: 'CompA' },
    ],
    release_mode: 'manual',
  }, 'alice');

  // First INSERT: workflow_templates
  const tInsert = poolCalls.find(c => /INSERT INTO workflow_templates/i.test(c.sql));
  assert(tInsert !== undefined, 'template insert');
  if (tInsert) {
    assertEq(tInsert.params[1], 'My Template', 'name trimmed');
    assertEq(tInsert.params[2], 'desc', 'description');
    assertEq(tInsert.params[3], 'backend', 'category');
    assertEq(tInsert.params[4], '[{"name":"x","label":"X","type":"string"}]', 'parameters JSON');
    assertEq(tInsert.params[5], 'alice', 'actor');
    assertEq(tInsert.params[6], 'manual', 'release_mode');
  }
  // 2 step INSERTs
  const stepInserts = poolCalls.filter(c => /INSERT INTO workflow_template_steps/i.test(c.sql));
  assertEq(stepInserts.length, 2, '2 step inserts');
  assertEq(stepInserts[0].params[2], 1, 'step 1 number');
  assertEq(stepInserts[0].params[3], 'Plan', 'step 1 title');
  assertEq(stepInserts[1].params[2], 2, 'step 2 number');
  assertEq(stepInserts[1].params[5], 'CompA', 'step 2 component');

  // Version snapshot: INSERT INTO workflow_template_versions
  const vInsert = poolCalls.find(c => /INSERT INTO workflow_template_versions/i.test(c.sql));
  assert(vInsert !== undefined, 'version snapshot inserted');
  if (vInsert) {
    assertEq(vInsert.params[2], 1, 'version = 1');
    const snap = JSON.parse(vInsert.params[3]);
    assertEq(snap.name, 'My Template', 'snapshot name');
    assertEq(snap.category, 'backend', 'snapshot category');
    assert(Array.isArray(snap.steps), 'snapshot has steps');
  }

  // Returns template
  assertEq(result.id, 'uuid-1', 'returns template with id');
  assertEq(result.name, 'My Template', 'template name');
}

// Without parameters / release_mode
console.log('\n── createTemplate: minimal (no params, no release_mode) ─');

resetState();
resetUuid();
templateRows = [{
  id: 'uuid-1', name: 'Minimal', description: null, category: 'backend',
  parameters: null, version: 1, is_active: 1, created_by: 'bob',
}];
stepRowsById['uuid-1'] = [{ id: 'uuid-2', step_number: 1, title: 'T', purpose: 'p' }];
{
  const result = await createTemplate({
    name: 'Minimal',
    category: 'backend',
    steps: [{ step_number: 1, title: 'T', purpose: 'p', prompt_type: 'plan' }],
  }, 'bob');

  const tInsert = poolCalls.find(c => /INSERT INTO workflow_templates/i.test(c.sql));
  if (tInsert) {
    assertEq(tInsert.params[2], null, 'description null');
    assertEq(tInsert.params[4], null, 'parameters null');
    assertEq(tInsert.params[6], null, 'release_mode null');
  }
  assertEq(result.parameters, [], 'empty params array');
}

// ============================================================================
// getTemplateById
// ============================================================================
console.log('\n── getTemplateById: not found ────────────────────────────');

resetState();
templateRows = [];
{
  const r = await getTemplateById('missing');
  assertEq(r, null, 'returns null');
}

console.log('\n── getTemplateById: parses JSON parameters ───────────────');

resetState();
templateRows = [{
  id: 't1', name: 'N', parameters: '[{"name":"y","label":"Y","type":"number"}]', version: 2,
}];
stepRowsById['t1'] = [{ id: 's1', step_number: 1 }];
{
  const r = await getTemplateById('t1');
  assertEq(r.parameters[0].name, 'y', 'parsed param');
  assertEq(r.steps.length, 1, 'loaded steps');
}

console.log('\n── getTemplateById: null parameters → [] ─────────────────');

resetState();
templateRows = [{ id: 't2', name: 'N', parameters: null, version: 1 }];
stepRowsById['t2'] = [];
{
  const r = await getTemplateById('t2');
  assertEq(r.parameters, [], 'null → []');
  assertEq(r.steps, [], 'no steps');
}

console.log('\n── getTemplateById: object parameters (already parsed) ──');

resetState();
templateRows = [{
  id: 't3', name: 'N',
  parameters: [{ name: 'z', label: 'Z', type: 'boolean' }],
  version: 1,
}];
stepRowsById['t3'] = [];
{
  const r = await getTemplateById('t3');
  assertEq(r.parameters[0].name, 'z', 'passes through object');
}

// ============================================================================
// updateTemplate
// ============================================================================
console.log('\n── updateTemplate: not found ─────────────────────────────');

resetState();
templateRows = [];
quiet();
{
  let caught: Error | null = null;
  try { await updateTemplate('missing', { name: 'X' }, 'alice'); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws');
  assert(caught !== null && /not found/i.test(caught.message), 'msg');
}

console.log('\n── updateTemplate: validation failure on merged ──────────');

resetState();
templateRows = [{
  id: 't1', name: 'Old', description: 'd', category: 'backend',
  parameters: null, version: 1, release_mode: null,
}];
stepRowsById['t1'] = [{ id: 's1', step_number: 1, title: 'T', purpose: 'p', prompt_type: 'plan' }];
quiet();
{
  let caught: Error | null = null;
  try {
    await updateTemplate('t1', { category: 'bogus' }, 'alice');
  } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws');
  assert(caught !== null && /validation failed/i.test(caught.message), 'validation message');
}

console.log('\n── updateTemplate: invalid release_mode ──────────────────');

resetState();
templateRows = [{
  id: 't1', name: 'Old', description: 'd', category: 'backend',
  parameters: null, version: 1, release_mode: null,
}];
stepRowsById['t1'] = [{ id: 's1', step_number: 1, title: 'T', purpose: 'p', prompt_type: 'plan' }];
quiet();
{
  let caught: Error | null = null;
  try {
    await updateTemplate('t1', { release_mode: 'bogus' }, 'alice');
  } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws');
  assert(caught !== null && /release_mode/i.test(caught.message), 'message');
}

console.log('\n── updateTemplate: updates without step replacement ──────');

resetState();
resetUuid();
templateRows = [{
  id: 't1', name: 'Old', description: 'd', category: 'backend',
  parameters: null, version: 1, release_mode: 'manual',
}];
stepRowsById['t1'] = [{ id: 's1', step_number: 1, title: 'T', purpose: 'p', prompt_type: 'plan' }];
{
  await updateTemplate('t1', { name: 'New Name', description: 'new' }, 'alice');
  const update = poolCalls.find(c => /^UPDATE workflow_templates SET/i.test(c.sql));
  assert(update !== undefined, 'UPDATE called');
  if (update) {
    assertEq(update.params[0], 'New Name', 'new name');
    assertEq(update.params[1], 'new', 'new description');
  }
  // No DELETE since steps not provided
  const del = poolCalls.find(c => /^DELETE FROM workflow_template_steps/i.test(c.sql));
  assertEq(del, undefined, 'no step delete');
}

console.log('\n── updateTemplate: replaces steps when provided ──────────');

resetState();
resetUuid();
templateRows = [{
  id: 't1', name: 'Old', description: 'd', category: 'backend',
  parameters: null, version: 1, release_mode: 'manual',
}];
stepRowsById['t1'] = [
  { id: 's1', step_number: 1, title: 'T', purpose: 'p', prompt_type: 'plan' },
];
{
  await updateTemplate('t1', {
    steps: [
      { step_number: 1, title: 'New1', purpose: 'p1', prompt_type: 'plan' },
      { step_number: 2, title: 'New2', purpose: 'p2', prompt_type: 'implementation' },
    ],
  }, 'alice');
  const del = poolCalls.find(c => /^DELETE FROM workflow_template_steps/i.test(c.sql));
  assert(del !== undefined, 'DELETE steps');
  const inserts = poolCalls.filter(c => /^INSERT INTO workflow_template_steps/i.test(c.sql));
  assertEq(inserts.length, 2, '2 new step inserts');
  assertEq(inserts[0].params[3], 'New1', 'step 1 title');
  assertEq(inserts[1].params[3], 'New2', 'step 2 title');
}

// ============================================================================
// listTemplates
// ============================================================================
console.log('\n── listTemplates: no filters ─────────────────────────────');

resetState();
listRows = [
  { id: 't1', name: 'A', parameters: '[{"name":"x","label":"X","type":"string"}]' },
  { id: 't2', name: 'B', parameters: null },
];
{
  const r = await listTemplates();
  assertEq(r.length, 2, '2 rows');
  assertEq(r[0].parameters[0].name, 'x', 'parsed params');
  assertEq(r[1].parameters, [], 'null → []');
  const call = poolCalls[0];
  assert(/WHERE 1=1/i.test(call.sql), 'default where');
  assertEq(call.params, [], 'no params');
}

console.log('\n── listTemplates: with filters ───────────────────────────');

resetState();
listRows = [];
{
  await listTemplates({ category: 'backend', is_active: true, search: 'foo' });
  const call = poolCalls[0];
  assert(/category = \?/i.test(call.sql), 'category filter');
  assert(/is_active = \?/i.test(call.sql), 'is_active filter');
  assert(/name LIKE \?/i.test(call.sql), 'search filter');
  assertEq(call.params, ['backend', 1, '%foo%', '%foo%'], 'filter params');
}

console.log('\n── listTemplates: is_active=false → 0 ─────────────────────');

resetState();
listRows = [];
{
  await listTemplates({ is_active: false });
  assertEq(poolCalls[0].params, [0], 'is_active=false → 0');
}

// ============================================================================
// deleteTemplate (soft)
// ============================================================================
console.log('\n── deleteTemplate ────────────────────────────────────────');

resetState();
{
  await deleteTemplate('t1');
  const update = poolCalls.find(c => /UPDATE workflow_templates SET is_active = 0/i.test(c.sql));
  assert(update !== undefined, 'soft delete via UPDATE');
  if (update) assertEq(update.params, ['t1'], 'id param');
}

// ============================================================================
// publishNewVersion
// ============================================================================
console.log('\n── publishNewVersion: not found ──────────────────────────');

resetState();
templateRows = [];
quiet();
{
  let caught: Error | null = null;
  try { await publishNewVersion('missing', 'alice'); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws');
}

console.log('\n── publishNewVersion: bumps version + snapshot ───────────');

resetState();
resetUuid();
templateRows = [{
  id: 't1', name: 'T', category: 'backend', parameters: null, version: 3, description: null,
}];
stepRowsById['t1'] = [];
{
  const r = await publishNewVersion('t1', 'alice');
  assertEq(r.version, 4, 'bumped to 4');
  assertEq(r.template_id, 't1', 'template id');
  const vUpdate = poolCalls.find(c => /UPDATE workflow_templates SET version = \?/i.test(c.sql));
  assert(vUpdate !== undefined, 'UPDATE version');
  if (vUpdate) assertEq(vUpdate.params[0], 4, 'new version');
  const vInsert = poolCalls.find(c => /INSERT INTO workflow_template_versions/i.test(c.sql));
  assert(vInsert !== undefined, 'snapshot created');
  if (vInsert) assertEq(vInsert.params[2], 4, 'snapshot version');
}

// ============================================================================
// getVersionSnapshot
// ============================================================================
console.log('\n── getVersionSnapshot: missing ───────────────────────────');

resetState();
versionRows = [];
{
  const r = await getVersionSnapshot('t1', 1);
  assertEq(r, null, 'null when missing');
}

console.log('\n── getVersionSnapshot: parses JSON ───────────────────────');

resetState();
versionRows = [{
  id: 'v1', template_id: 't1', version: 1,
  snapshot: '{"name":"N","steps":[]}',
  created_by: 'alice',
}];
{
  const r = await getVersionSnapshot('t1', 1);
  assertEq(r.snapshot.name, 'N', 'snapshot parsed');
}

console.log('\n── getVersionSnapshot: object passthrough ────────────────');

resetState();
versionRows = [{
  id: 'v1', template_id: 't1', version: 1,
  snapshot: { name: 'N', steps: [] },
}];
{
  const r = await getVersionSnapshot('t1', 1);
  assertEq(r.snapshot.name, 'N', 'object passthrough');
}

// ============================================================================
// listVersions
// ============================================================================
console.log('\n── listVersions ──────────────────────────────────────────');

resetState();
versionsList = [
  { id: 'v3', version: 3 },
  { id: 'v2', version: 2 },
  { id: 'v1', version: 1 },
];
{
  const r = await listVersions('t1');
  assertEq(r.length, 3, '3 versions');
  assertEq(r[0].version, 3, 'DESC order');
  const call = poolCalls[0];
  assertEq(call.params, ['t1'], 'template id param');
  assert(/ORDER BY version DESC/i.test(call.sql), 'DESC');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
