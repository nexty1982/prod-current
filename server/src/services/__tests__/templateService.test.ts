#!/usr/bin/env npx tsx
/**
 * Unit tests for services/templateService.js (OMD-1164)
 *
 * A static class for managing record templates (Orthodox baptism/marriage/
 * funeral). Depends on `config/db-compat.getAppPool` and the `fs`/`path`
 * modules. We stub `db-compat` via require.cache before requiring the SUT.
 *
 * fs-heavy methods (generateTemplate, syncExistingTemplates, initializeDatabase,
 * updatePredefinedTemplate) write to a specific filesystem location and are
 * out of scope for pure unit testing. We cover:
 *
 *   - Pure helpers: validateFields, determineRecordType, inferFieldType,
 *                   getPredefinedTemplates, getPredefinedTemplateByType
 *   - extractFieldsFromTemplate (uses real temp file)
 *   - DB-dependent: saveTemplateToDatabase, getAllTemplates,
 *                   getTemplateByName, deleteTemplate, getTemplatesByType,
 *                   updateTemplate, getGlobalTemplates, getTemplatesForChurch
 *
 * Run: npx tsx server/src/services/__tests__/templateService.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
let responders: Array<{ match: RegExp; response: any }> = [];
let queryThrowsOnPattern: RegExp | null = null;

function resetResponders() {
  queryLog.length = 0;
  responders = [];
  queryThrowsOnPattern = null;
}

function on(match: RegExp, response: any) {
  responders.push({ match, response });
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (queryThrowsOnPattern && queryThrowsOnPattern.test(sql)) {
      throw new Error('fake db failure');
    }
    for (const r of responders) {
      if (r.match.test(sql)) {
        return typeof r.response === 'function' ? r.response(params) : r.response;
      }
    }
    return [[]]; // Default: empty rows
  },
};

const dbPath = require.resolve('../../config/db-compat');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool, promisePool: fakePool },
} as any;

const TemplateService = require('../templateService');

// Silence
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

async function main() {

// ============================================================================
// validateFields (pure)
// ============================================================================
console.log('\n── validateFields ────────────────────────────────────────');

assertEq(TemplateService.validateFields([]), false, 'empty array → false');
assertEq(TemplateService.validateFields(null as any), false, 'null → false');
assertEq(TemplateService.validateFields('not an array' as any), false, 'string → false');
assertEq(TemplateService.validateFields([
  { field: 'name', label: 'Name' },
]), true, 'single valid field → true');
assertEq(TemplateService.validateFields([
  { field: 'name', label: 'Name' },
  { field: 'age', label: 'Age' },
]), true, 'multiple valid → true');
assertEq(TemplateService.validateFields([
  { field: '', label: 'Name' },
]), false, 'empty field name → false');
assertEq(TemplateService.validateFields([
  { field: 'name', label: '' },
]), false, 'empty label → false');
assertEq(TemplateService.validateFields([
  { field: '   ', label: 'Name' },
]), false, 'whitespace-only field → false');
assertEq(TemplateService.validateFields([
  { field: 'name' },
]), false, 'missing label → false');
assertEq(TemplateService.validateFields([null]), false, 'null element → false');

// ============================================================================
// determineRecordType (pure)
// ============================================================================
console.log('\n── determineRecordType ───────────────────────────────────');

assertEq(TemplateService.determineRecordType('BaptismRecords'), 'baptism', 'Baptism → baptism');
assertEq(TemplateService.determineRecordType('MarriageRecords'), 'marriage', 'Marriage → marriage');
assertEq(TemplateService.determineRecordType('WeddingLog'), 'marriage', 'Wedding → marriage');
assertEq(TemplateService.determineRecordType('FuneralRecords'), 'funeral', 'Funeral → funeral');
assertEq(TemplateService.determineRecordType('BurialList'), 'funeral', 'Burial → funeral');
assertEq(TemplateService.determineRecordType('CustomRecords'), 'custom', 'unknown → custom');
assertEq(TemplateService.determineRecordType('baptism_records'), 'baptism', 'case-insensitive');

// ============================================================================
// inferFieldType (pure)
// ============================================================================
console.log('\n── inferFieldType ────────────────────────────────────────');

assertEq(TemplateService.inferFieldType('birth_date'), 'date', 'birth_date → date');
assertEq(TemplateService.inferFieldType('date_of_baptism'), 'date', 'date_of_baptism → date');
assertEq(TemplateService.inferFieldType('age'), 'number', 'age → number');
assertEq(TemplateService.inferFieldType('email'), 'email', 'email → email');
assertEq(TemplateService.inferFieldType('phone'), 'phone', 'phone → phone');
assertEq(TemplateService.inferFieldType('home_address'), 'text', 'address → text');
assertEq(TemplateService.inferFieldType('first_name'), 'string', 'name → string (default)');

// ============================================================================
// getPredefinedTemplates (pure)
// ============================================================================
console.log('\n── getPredefinedTemplates ────────────────────────────────');

const predefined = TemplateService.getPredefinedTemplates();
assert(predefined.baptism, 'baptism present');
assert(predefined.marriage, 'marriage present');
assert(predefined.funeral, 'funeral present');

assertEq(predefined.baptism.name, 'BaptismRecords', 'baptism name');
assertEq(predefined.baptism.recordType, 'baptism', 'baptism recordType');
assert(Array.isArray(predefined.baptism.fields), 'baptism fields array');
assert(predefined.baptism.fields.length >= 8, 'baptism has many fields');
assert(predefined.baptism.fields.some((f: any) => f.field === 'first_name'), 'baptism has first_name');
assert(predefined.baptism.fields.some((f: any) => f.field === 'date_of_baptism'), 'baptism has date_of_baptism');

assertEq(predefined.marriage.name, 'MarriageRecords', 'marriage name');
assert(predefined.marriage.fields.some((f: any) => f.field === 'groom_name'), 'marriage has groom_name');
assert(predefined.marriage.fields.some((f: any) => f.field === 'bride_name'), 'marriage has bride_name');

assertEq(predefined.funeral.name, 'FuneralRecords', 'funeral name');
assert(predefined.funeral.fields.some((f: any) => f.field === 'deceased_name'), 'funeral has deceased_name');

// getPredefinedTemplateByType
assertEq(
  TemplateService.getPredefinedTemplateByType('baptism').name,
  'BaptismRecords',
  'getPredefinedTemplateByType baptism'
);
assertEq(
  TemplateService.getPredefinedTemplateByType('unknown'),
  null,
  'unknown type → null'
);

// ============================================================================
// extractFieldsFromTemplate (uses real tmp file)
// ============================================================================
console.log('\n── extractFieldsFromTemplate ─────────────────────────────');

// Create a tmp .tsx file
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpl-'));
const tmpFile = path.join(tmpDir, 'Test.tsx');
fs.writeFileSync(tmpFile, `
import React from 'react';
const Test = () => {
  const columnDefs = [
    { headerName: 'Name', field: 'first_name', sortable: true },
    { headerName: 'Birth Date', field: 'birth_date', filter: true },
    { headerName: 'Email', field: 'email_address' }
  ];
  return null;
};
`);

const extracted = TemplateService.extractFieldsFromTemplate(tmpFile);
assertEq(extracted.length, 3, '3 fields extracted');
assertEq(extracted[0].field, 'first_name', 'first field name');
assertEq(extracted[0].label, 'Name', 'first field label');
assertEq(extracted[0].type, 'string', 'first field type');
assertEq(extracted[1].field, 'birth_date', 'second field');
assertEq(extracted[1].type, 'date', 'date type inferred');
assertEq(extracted[2].type, 'email', 'email type inferred');

// Non-existent file
{
  let caught: any = null;
  quiet();
  try {
    TemplateService.extractFieldsFromTemplate('/nonexistent/path.tsx');
  } catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'throws on missing file');
  assert(/not found/i.test(caught.message), 'error message mentions not found');
}

// File without columnDefs
const badFile = path.join(tmpDir, 'Bad.tsx');
fs.writeFileSync(badFile, 'const x = 1;');
{
  let caught: any = null;
  quiet();
  try {
    TemplateService.extractFieldsFromTemplate(badFile);
  } catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'throws when no columnDefs');
  assert(/columnDefs/i.test(caught.message), 'error mentions columnDefs');
}

// Cleanup tmp
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

// ============================================================================
// saveTemplateToDatabase
// ============================================================================
console.log('\n── saveTemplateToDatabase ────────────────────────────────');

resetResponders();
on(/INSERT INTO templates/i, [{ insertId: 1 }]);
await TemplateService.saveTemplateToDatabase(
  'BaptismRecords',
  [{ field: 'name', label: 'Name' }],
  '/some/path.tsx',
  {}
);
{
  assertEq(queryLog.length, 1, '1 query');
  const q = queryLog[0];
  assert(/INSERT INTO templates/.test(q.sql), 'INSERT INTO templates');
  // Params order: name, slug, recordType, description, fields (JSON),
  // grid_type, theme, layout_type, language_support (JSON),
  // is_editable, created_by, church_id, is_global
  assertEq(q.params[0], 'BaptismRecords', 'name');
  assert(typeof q.params[1] === 'string', 'slug string');
  assertEq(q.params[2], 'baptism', 'recordType determined from name');
  assert(/Baptism Records/.test(q.params[3]), 'description');
  assertEq(q.params[4], JSON.stringify([{ field: 'name', label: 'Name' }]), 'fields JSON');
  assertEq(q.params[5], 'aggrid', 'default grid_type');
  assertEq(q.params[6], 'liturgicalBlueGold', 'default theme');
  assertEq(q.params[7], 'table', 'default layout_type');
  assertEq(q.params[8], JSON.stringify({ en: true }), 'default language_support');
  assertEq(q.params[9], true, 'default is_editable');
  assertEq(q.params[10], null, 'default created_by');
  assertEq(q.params[11], null, 'default church_id');
  assertEq(q.params[12], false, 'default is_global');
}

// With custom options
resetResponders();
on(/INSERT INTO templates/i, [{ insertId: 2 }]);
await TemplateService.saveTemplateToDatabase(
  'CustomThing',
  [{ field: 'x', label: 'X' }],
  '/p.tsx',
  {
    recordType: 'custom',
    description: 'My custom',
    gridType: 'mui',
    theme: 'dark',
    layoutType: 'form',
    languageSupport: { en: true, gr: true },
    isEditable: false,
    createdBy: 99,
    churchId: 46,
    isGlobal: true,
  }
);
{
  const q = queryLog[0];
  assertEq(q.params[2], 'custom', 'custom recordType');
  assertEq(q.params[3], 'My custom', 'custom description');
  assertEq(q.params[5], 'mui', 'custom grid_type');
  assertEq(q.params[6], 'dark', 'custom theme');
  assertEq(q.params[7], 'form', 'custom layout_type');
  assertEq(q.params[8], JSON.stringify({ en: true, gr: true }), 'custom language_support');
  assertEq(q.params[9], false, 'custom is_editable=false');
  assertEq(q.params[10], 99, 'createdBy');
  assertEq(q.params[11], 46, 'churchId');
  assertEq(q.params[12], true, 'isGlobal');
}

// Error path
resetResponders();
queryThrowsOnPattern = /INSERT INTO templates/;
{
  let caught: any = null;
  quiet();
  try {
    await TemplateService.saveTemplateToDatabase('X', [{ field: 'a', label: 'A' }], '/p.tsx');
  } catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'error propagates');
}

// ============================================================================
// getAllTemplates
// ============================================================================
console.log('\n── getAllTemplates ───────────────────────────────────────');

// Default: no churchId
resetResponders();
on(/SELECT[\s\S]*FROM templates t[\s\S]*LEFT JOIN churches/i, [[
  {
    id: 1, name: 'BaptismRecords', slug: 'baptism-records', record_type: 'baptism',
    description: 'Baptism', fields: '[{"field":"name","label":"N"}]',
    grid_type: 'aggrid', theme: 'light', layout_type: 'table',
    language_support: '{"en":true}', is_editable: 1, created_by: null,
    created_at: '2026-01-01', updated_at: '2026-01-01', church_id: null,
    is_global: 1, church_name: null,
  },
]]);
{
  const rows = await TemplateService.getAllTemplates();
  assertEq(rows.length, 1, '1 row');
  assertEq(rows[0].name, 'BaptismRecords', 'name');
  assert(Array.isArray(rows[0].fields), 'fields parsed');
  assertEq(rows[0].fields[0].field, 'name', 'field parsed');
  assertEq(rows[0].languageSupport.en, true, 'lang parsed');
  assert(typeof rows[0].filePath === 'string', 'filePath set');
  assertEq(typeof rows[0].exists, 'boolean', 'exists boolean');
  assertEq(rows[0].scope, 'Global', 'global scope');
  // Default: no WHERE filter beyond WHERE 1=1
  assertEq(queryLog[0].params.length, 0, 'no params');
}

// With churchId, includeGlobal=true
resetResponders();
on(/SELECT[\s\S]*FROM templates t[\s\S]*LEFT JOIN churches/i, [[]]);
await TemplateService.getAllTemplates(46, true);
{
  const q = queryLog[0];
  assert(/church_id = \? OR t\.is_global = TRUE/.test(q.sql), 'includes global clause');
  assertEq(q.params[0], 46, 'churchId param');
}

// With churchId, includeGlobal=false
resetResponders();
on(/SELECT[\s\S]*FROM templates t[\s\S]*LEFT JOIN churches/i, [[]]);
await TemplateService.getAllTemplates(46, false);
{
  const q = queryLog[0];
  assert(/t\.church_id = \?/.test(q.sql), 'church-only clause');
  assert(!/is_global = TRUE/.test(q.sql), 'no global clause');
}

// No churchId, includeGlobal=false
resetResponders();
on(/SELECT[\s\S]*FROM templates t[\s\S]*LEFT JOIN churches/i, [[]]);
await TemplateService.getAllTemplates(null, false);
{
  assert(/is_global = FALSE/.test(queryLog[0].sql), 'exclude global');
}

// Non-global scope with church name
resetResponders();
on(/SELECT[\s\S]*FROM templates t[\s\S]*LEFT JOIN churches/i, [[
  {
    id: 2, name: 'X', slug: 'x', record_type: 'custom', description: 'D',
    fields: '[]', grid_type: 'aggrid', theme: 't', layout_type: 'table',
    language_support: null, is_editable: 1, created_at: '', updated_at: '',
    church_id: 46, is_global: 0, church_name: 'Holy Trinity',
  },
]]);
{
  const rows = await TemplateService.getAllTemplates();
  assertEq(rows[0].scope, 'Holy Trinity', 'church name scope');
  assertEq(rows[0].languageSupport.en, true, 'default lang when null');
}

// ============================================================================
// getTemplateByName
// ============================================================================
console.log('\n── getTemplateByName ─────────────────────────────────────');

resetResponders();
on(/SELECT[\s\S]*FROM templates t[\s\S]*LEFT JOIN churches c ON t\.church_id = c\.id[\s\S]*WHERE \(t\.name/i, [[]]);
{
  const r = await TemplateService.getTemplateByName('NoSuch');
  assertEq(r, null, 'not found → null');
  assertEq(queryLog[0].params[0], 'NoSuch', 'name param');
  assertEq(queryLog[0].params[1], 'NoSuch', 'slug param (same)');
}

resetResponders();
on(/SELECT[\s\S]*FROM templates t[\s\S]*LEFT JOIN churches c ON t\.church_id = c\.id[\s\S]*WHERE \(t\.name/i, [[
  {
    id: 1, name: 'BaptismRecords', slug: 'baptism-records', record_type: 'baptism',
    description: 'D', fields: '[{"field":"a","label":"A"}]',
    grid_type: 'aggrid', theme: 't', layout_type: 'table',
    language_support: '{"en":true}', is_editable: 1, created_at: '', updated_at: '',
    church_id: null, is_global: 1, church_name: null,
  },
]]);
{
  const r = await TemplateService.getTemplateByName('BaptismRecords', 46);
  assert(r !== null, 'found');
  assertEq(r.name, 'BaptismRecords', 'name');
  assert(Array.isArray(r.fields), 'fields parsed');
  assertEq(r.scope, 'Global', 'global scope');
  assertEq(queryLog[0].params[2], 46, 'church_id param');
}

// ============================================================================
// deleteTemplate
// ============================================================================
console.log('\n── deleteTemplate ────────────────────────────────────────');

// Not found
resetResponders();
on(/SELECT[\s\S]*FROM templates t[\s\S]*LEFT JOIN churches c ON t\.church_id = c\.id[\s\S]*WHERE \(t\.name/i, [[]]);
{
  let caught: any = null;
  quiet();
  try { await TemplateService.deleteTemplate('X'); }
  catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'throws when not found');
  assert(/not found/i.test(caught.message), 'error mentions not found');
}

// Global template → forbidden
resetResponders();
on(/SELECT[\s\S]*FROM templates t[\s\S]*LEFT JOIN churches c ON t\.church_id = c\.id[\s\S]*WHERE \(t\.name/i, [[
  {
    id: 1, name: 'G', slug: 'g', record_type: 'custom', description: '',
    fields: '[]', grid_type: 'aggrid', theme: '', layout_type: '',
    language_support: null, is_editable: 0, created_at: '', updated_at: '',
    church_id: null, is_global: 1, church_name: null,
  },
]]);
{
  let caught: any = null;
  quiet();
  try { await TemplateService.deleteTemplate('G'); }
  catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'throws on global');
  assert(/Cannot delete global/.test(caught.message), 'error mentions global');
}

// Different church → forbidden
resetResponders();
on(/SELECT[\s\S]*FROM templates t[\s\S]*LEFT JOIN churches c ON t\.church_id = c\.id[\s\S]*WHERE \(t\.name/i, [[
  {
    id: 2, name: 'OC', slug: 'oc', record_type: 'custom', description: '',
    fields: '[]', grid_type: 'aggrid', theme: '', layout_type: '',
    language_support: null, is_editable: 1, created_at: '', updated_at: '',
    church_id: 99, is_global: 0, church_name: 'Other',
  },
]]);
{
  let caught: any = null;
  quiet();
  try { await TemplateService.deleteTemplate('OC', 46); }
  catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'throws on cross-church');
  assert(/Permission denied/.test(caught.message), 'error mentions permission');
}

// Happy path
resetResponders();
on(/SELECT[\s\S]*FROM templates t[\s\S]*LEFT JOIN churches c ON t\.church_id = c\.id[\s\S]*WHERE \(t\.name/i, [[
  {
    id: 3, name: 'MC', slug: 'mc', record_type: 'custom', description: '',
    fields: '[]', grid_type: 'aggrid', theme: '', layout_type: '',
    language_support: null, is_editable: 1, created_at: '', updated_at: '',
    church_id: 46, is_global: 0, church_name: 'Mine',
  },
]]);
on(/DELETE FROM templates/i, [{ affectedRows: 1 }]);
{
  const r = await TemplateService.deleteTemplate('MC', 46);
  assertEq(r, true, 'returns true');
  const del = queryLog.find(q => /DELETE/.test(q.sql));
  assert(del !== undefined, 'delete query');
  assert(/church_id = \? OR church_id IS NULL/.test(del!.sql), 'includes church filter');
  assertEq(del!.params[0], 'MC', 'name param');
  assertEq(del!.params[1], 46, 'churchId param');
}

// ============================================================================
// getTemplatesByType
// ============================================================================
console.log('\n── getTemplatesByType ────────────────────────────────────');

resetResponders();
on(/FROM templates t[\s\S]+WHERE t\.record_type = \?/i, [[
  {
    id: 1, name: 'BR', slug: 'br', record_type: 'baptism', description: '',
    fields: '[]', grid_type: 'aggrid', theme: '', layout_type: '',
    language_support: null, is_editable: 1, created_at: '', updated_at: '',
    church_id: null, is_global: 1, church_name: null,
  },
]]);
{
  const rows = await TemplateService.getTemplatesByType('baptism');
  assertEq(rows.length, 1, '1 row');
  assertEq(queryLog[0].params[0], 'baptism', 'recordType param');
}

// With church filter
resetResponders();
on(/FROM templates t[\s\S]+WHERE t\.record_type = \?/i, [[]]);
await TemplateService.getTemplatesByType('marriage', 46, true);
{
  const q = queryLog[0];
  assertEq(q.params[0], 'marriage', 'recordType');
  assertEq(q.params[1], 46, 'churchId');
  assert(/church_id = \? OR t\.is_global = TRUE/.test(q.sql), 'global-or-church');
}

// Exclude globals, no church → is_global=FALSE clause
resetResponders();
on(/FROM templates t[\s\S]+WHERE t\.record_type = \?/i, [[]]);
await TemplateService.getTemplatesByType('funeral', null, false);
{
  assert(/is_global = FALSE/.test(queryLog[0].sql), 'exclude global');
}

// ============================================================================
// updateTemplate
// ============================================================================
console.log('\n── updateTemplate ────────────────────────────────────────');

// Not found
resetResponders();
on(/SELECT[\s\S]*FROM templates t[\s\S]*LEFT JOIN churches c ON t\.church_id = c\.id[\s\S]*WHERE \(t\.name/i, [[]]);
{
  let caught: any = null;
  quiet();
  try { await TemplateService.updateTemplate('X', { description: 'd' }); }
  catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'throws on not found');
}

// Global → forbidden
resetResponders();
on(/SELECT[\s\S]*FROM templates t[\s\S]*LEFT JOIN churches c ON t\.church_id = c\.id[\s\S]*WHERE \(t\.name/i, [[
  {
    id: 1, name: 'G', slug: 'g', record_type: 'custom', description: '',
    fields: '[]', grid_type: '', theme: '', layout_type: '',
    language_support: null, is_editable: 0, created_at: '', updated_at: '',
    church_id: null, is_global: 1, church_name: null,
  },
]]);
{
  let caught: any = null;
  quiet();
  try { await TemplateService.updateTemplate('G', { description: 'd' }); }
  catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'throws on global');
  assert(/Cannot modify global/.test(caught.message), 'error mentions global');
}

// Global with allowGlobalUpdate
resetResponders();
on(/SELECT[\s\S]*FROM templates t[\s\S]*LEFT JOIN churches c ON t\.church_id = c\.id[\s\S]*WHERE \(t\.name/i, [[
  {
    id: 1, name: 'G', slug: 'g', record_type: 'custom', description: '',
    fields: '[]', grid_type: '', theme: '', layout_type: '',
    language_support: null, is_editable: 0, created_at: '', updated_at: '',
    church_id: null, is_global: 1, church_name: null,
  },
]]);
on(/^UPDATE templates SET/i, [{ affectedRows: 1 }]);
{
  const r = await TemplateService.updateTemplate('G', {
    description: 'New',
    allowGlobalUpdate: true,
  });
  assertEq(r, true, 'global update with flag succeeds');
  const upd = queryLog.find(q => /^UPDATE templates/.test(q.sql));
  assert(upd !== undefined, 'update query issued');
  assert(/description = \?/.test(upd!.sql), 'description in set');
  assert(/updated_at = NOW\(\)/.test(upd!.sql), 'updated_at set');
}

// No valid fields
resetResponders();
on(/SELECT[\s\S]*FROM templates t[\s\S]*LEFT JOIN churches c ON t\.church_id = c\.id[\s\S]*WHERE \(t\.name/i, [[
  {
    id: 1, name: 'T', slug: 't', record_type: 'custom', description: '',
    fields: '[]', grid_type: '', theme: '', layout_type: '',
    language_support: null, is_editable: 1, created_at: '', updated_at: '',
    church_id: 46, is_global: 0, church_name: 'Mine',
  },
]]);
{
  let caught: any = null;
  quiet();
  try { await TemplateService.updateTemplate('T', { bogus: 'x' }); }
  catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'throws on no valid fields');
  assert(/No valid fields/.test(caught.message), 'error mentions no valid');
}

// Valid update with JSON fields
resetResponders();
on(/SELECT[\s\S]*FROM templates t[\s\S]*LEFT JOIN churches c ON t\.church_id = c\.id[\s\S]*WHERE \(t\.name/i, [[
  {
    id: 1, name: 'T', slug: 't', record_type: 'custom', description: '',
    fields: '[]', grid_type: '', theme: '', layout_type: '',
    language_support: null, is_editable: 1, created_at: '', updated_at: '',
    church_id: 46, is_global: 0, church_name: 'Mine',
  },
]]);
on(/^UPDATE templates SET/i, [{ affectedRows: 1 }]);
{
  const r = await TemplateService.updateTemplate('T', {
    fields: [{ field: 'x', label: 'X' }],
    language_support: { en: true },
    theme: 'dark',
  }, 46);
  assertEq(r, true, 'valid update succeeds');
  const upd = queryLog.find(q => /^UPDATE templates/.test(q.sql))!;
  // fields serialized
  assert(upd.params.some(p => p === JSON.stringify([{ field: 'x', label: 'X' }])), 'fields JSON');
  assert(upd.params.some(p => p === JSON.stringify({ en: true })), 'lang JSON');
  assert(upd.params.includes('dark'), 'theme value');
  assert(/church_id = \? OR church_id IS NULL/.test(upd.sql), 'church filter');
}

// ============================================================================
// getGlobalTemplates
// ============================================================================
console.log('\n── getGlobalTemplates ────────────────────────────────────');

resetResponders();
on(/FROM templates\s+WHERE is_global = TRUE/i, [[
  {
    id: 1, name: 'B', slug: 'b', record_type: 'baptism', description: '',
    fields: '[{"field":"a","label":"A"}]', grid_type: '', theme: '',
    layout_type: '', language_support: null, is_editable: 1,
    created_by: null, created_at: '', updated_at: '', is_global: 1,
  },
]]);
{
  const rows = await TemplateService.getGlobalTemplates();
  assertEq(rows.length, 1, '1 row');
  assert(Array.isArray(rows[0].fields), 'fields parsed');
  assertEq(rows[0].fields[0].field, 'a', 'field value');
  assertEq(rows[0].languageSupport.en, true, 'lang default');
}

// ============================================================================
// getTemplatesForChurch (delegates)
// ============================================================================
console.log('\n── getTemplatesForChurch ─────────────────────────────────');

resetResponders();
on(/SELECT[\s\S]*FROM templates t[\s\S]*LEFT JOIN churches/i, [[]]);
await TemplateService.getTemplatesForChurch(46);
{
  const q = queryLog[0];
  assertEq(q.params[0], 46, 'churchId param passed');
  assert(/is_global = TRUE/.test(q.sql), 'includes globals');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
