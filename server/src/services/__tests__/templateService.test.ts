#!/usr/bin/env npx tsx
/**
 * Unit tests for services/templateService.js (OMD-1121)
 *
 * Covers pure helpers (validateFields, determineRecordType, inferFieldType,
 * getPredefinedTemplates, getPredefinedTemplateByType), plus DB-orchestrated
 * CRUD and generation/deletion/duplication with in-memory fs and
 * route-dispatch pool stubs.
 *
 * Stubs installed BEFORE the SUT is required:
 *   - fs                     → in-memory file system
 *   - ../config/db-compat    → getAppPool + promisePool returning fake pool
 *
 * Run: npx tsx server/src/services/__tests__/templateService.test.ts
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

async function assertThrows(fn: () => Promise<any>, needle: string, message: string): Promise<void> {
  try {
    await fn();
    console.error(`  FAIL: ${message} — did not throw`); failed++;
  } catch (e: any) {
    if (!needle || (e && e.message && e.message.includes(needle))) {
      console.log(`  PASS: ${message}`); passed++;
    } else {
      console.error(`  FAIL: ${message}\n         expected message to include: ${needle}\n         actual: ${e && e.message}`);
      failed++;
    }
  }
}

// ── In-memory fs ─────────────────────────────────────────────────────
const realFs = require('fs');
const vfs: Record<string, string> = {};
const vdirs = new Set<string>();

const fakeFs = {
  ...realFs,
  existsSync: (p: string) => p in vfs || vdirs.has(p),
  mkdirSync: (p: string, _opts?: any) => { vdirs.add(p); },
  writeFileSync: (p: string, content: string, _enc?: any) => { vfs[p] = content; },
  readFileSync: (p: string, _enc?: any) => {
    if (p in vfs) return vfs[p];
    throw new Error(`ENOENT: ${p}`);
  },
  unlinkSync: (p: string) => { delete vfs[p]; },
  readdirSync: (p: string) => {
    const prefix = p.endsWith('/') ? p : p + '/';
    return Object.keys(vfs)
      .filter(f => f.startsWith(prefix))
      .map(f => f.slice(prefix.length))
      .filter(f => !f.includes('/'));
  },
};

const fsPath = require.resolve('fs');
require.cache[fsPath] = {
  id: fsPath,
  filename: fsPath,
  loaded: true,
  exports: fakeFs,
} as any;

// ── Route dispatch pool ─────────────────────────────────────────────
type Route = { match: RegExp; handler: (params: any[]) => any };
let routes: Route[] = [];
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

function dispatch(sql: string, params: any[] = []): any {
  queryLog.push({ sql, params });
  for (const r of routes) {
    if (r.match.test(sql)) return r.handler(params);
  }
  return [[], {}];
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => dispatch(sql, params),
};

const dbCompatPath = require.resolve('../../config/db-compat');
require.cache[dbCompatPath] = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: {
    getAppPool: () => fakePool,
    promisePool: fakePool,
  },
} as any;

function resetAll() {
  routes = [];
  queryLog.length = 0;
  for (const k of Object.keys(vfs)) delete vfs[k];
  vdirs.clear();
}

// Silence console
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

const TemplateService = require('../templateService');

async function main() {

// ============================================================================
// Pure helpers
// ============================================================================
console.log('\n── validateFields ────────────────────────────────────────');

assertEq(TemplateService.validateFields([]), false, 'empty array → false');
assertEq(TemplateService.validateFields(null), false, 'null → false');
assertEq(TemplateService.validateFields('not array'), false, 'string → false');
assertEq(
  TemplateService.validateFields([{ field: 'a', label: 'A' }]),
  true,
  'minimal valid'
);
assertEq(
  TemplateService.validateFields([{ field: '', label: 'A' }]),
  false,
  'empty field name → false'
);
assertEq(
  TemplateService.validateFields([{ field: 'a', label: '' }]),
  false,
  'empty label → false'
);
assertEq(
  TemplateService.validateFields([{ field: 'a' }]),
  false,
  'missing label → false'
);
assertEq(
  TemplateService.validateFields([
    { field: 'a', label: 'A' },
    { field: 'b', label: 'B' },
    { field: 'c', label: 'C' },
  ]),
  true,
  'multiple valid'
);

console.log('\n── determineRecordType ───────────────────────────────────');

assertEq(TemplateService.determineRecordType('BaptismRecords'), 'baptism', 'baptism');
assertEq(TemplateService.determineRecordType('MarriageRecords'), 'marriage', 'marriage');
assertEq(TemplateService.determineRecordType('WeddingTable'), 'marriage', 'wedding → marriage');
assertEq(TemplateService.determineRecordType('FuneralRecords'), 'funeral', 'funeral');
assertEq(TemplateService.determineRecordType('BurialSet'), 'funeral', 'burial → funeral');
assertEq(TemplateService.determineRecordType('ChurchDirectory'), 'custom', 'unknown → custom');

console.log('\n── inferFieldType ────────────────────────────────────────');

assertEq(TemplateService.inferFieldType('birth_date'), 'date', 'date');
assertEq(TemplateService.inferFieldType('age_at_death'), 'number', 'age');
assertEq(TemplateService.inferFieldType('contact_email'), 'email', 'email');
assertEq(TemplateService.inferFieldType('home_phone'), 'phone', 'phone');
assertEq(TemplateService.inferFieldType('mailing_address'), 'text', 'address');
assertEq(TemplateService.inferFieldType('first_name'), 'string', 'default string');

console.log('\n── getPredefinedTemplates ────────────────────────────────');

{
  const t = TemplateService.getPredefinedTemplates();
  assertEq(Object.keys(t).sort(), ['baptism', 'funeral', 'marriage'], 'three keys');
  assertEq(t.baptism.name, 'BaptismRecords', 'baptism name');
  assert(t.marriage.fields.length >= 10, 'marriage has many fields');
  assertEq(t.funeral.recordType, 'funeral', 'funeral recordType');
}

console.log('\n── getPredefinedTemplateByType ───────────────────────────');

{
  const b = TemplateService.getPredefinedTemplateByType('baptism');
  assertEq(b.name, 'BaptismRecords', 'baptism lookup');
  const x = TemplateService.getPredefinedTemplateByType('bogus');
  assertEq(x, null, 'unknown → null');
}

// ============================================================================
// generateTemplate
// ============================================================================
console.log('\n── generateTemplate ──────────────────────────────────────');

// Invalid input
resetAll();
quiet();
await assertThrows(
  () => TemplateService.generateTemplate('', []),
  'Invalid template',
  'empty name throws'
);
await assertThrows(
  () => TemplateService.generateTemplate('X', null),
  'Invalid template',
  'null fields throws'
);
loud();

// Happy path
resetAll();
{
  routes.push({
    match: /^\s*INSERT INTO templates/i,
    handler: () => [{}],
  });
  quiet();
  const filePath = await TemplateService.generateTemplate(
    'MyRecords',
    [
      { field: 'name', label: 'Name' },
      { field: 'date_of_birth', label: 'Date of Birth' },
    ],
    { churchId: 7, recordType: 'custom' }
  );
  loud();
  assert(filePath.endsWith('MyRecords.tsx'), 'path ends with MyRecords.tsx');
  assert(filePath in vfs, 'file written to vfs');
  const content = vfs[filePath];
  assert(content.includes("const MyRecords ="), 'component name');
  assert(content.includes("headerName: 'Name'"), 'column header');
  assert(content.includes("field: 'date_of_birth'"), 'column field');
  // DB insert
  const ins = queryLog.find(c => /^\s*INSERT INTO templates/i.test(c.sql));
  assertEq(ins!.params[0], 'MyRecords', 'name param');
  assertEq(ins!.params[2], 'custom', 'recordType param');
  assertEq(ins!.params[11], 7, 'churchId param');
}

// ============================================================================
// getAllTemplates
// ============================================================================
console.log('\n── getAllTemplates ───────────────────────────────────────');

resetAll();
{
  routes.push({
    match: /FROM templates t[\s\S]*LEFT JOIN churches/i,
    handler: () => [[{
      id: 1, name: 'A', fields: '[{"field":"x","label":"X"}]',
      language_support: '{"en":true}', is_global: 1, church_name: null,
    }]],
  });
  const r = await TemplateService.getAllTemplates();
  assertEq(r.length, 1, 'one template');
  assertEq(r[0].fields[0].field, 'x', 'fields parsed');
  assertEq(r[0].scope, 'Global', 'global scope');
}

// Church-scoped
resetAll();
{
  routes.push({
    match: /FROM templates t[\s\S]*t\.church_id = \? OR t\.is_global = TRUE/i,
    handler: () => [[{
      id: 1, name: 'A', fields: '[]', language_support: null,
      is_global: 0, church_name: 'Holy Trinity',
    }]],
  });
  const r = await TemplateService.getAllTemplates(5, true);
  assertEq(r[0].scope, 'Holy Trinity', 'church scope');
  assertEq(r[0].languageSupport, { en: true }, 'default language support');
}

// churchId with includeGlobal false
resetAll();
{
  routes.push({
    match: /FROM templates t[\s\S]*AND t\.church_id = \?/i,
    handler: () => [[]],
  });
  await TemplateService.getAllTemplates(5, false);
  const call = queryLog.find(c => /FROM templates/i.test(c.sql));
  assert(!/t\.is_global = TRUE/.test(call!.sql), 'no global clause');
}

// No church, exclude global
resetAll();
{
  routes.push({
    match: /FROM templates t[\s\S]*t\.is_global = FALSE/i,
    handler: () => [[]],
  });
  await TemplateService.getAllTemplates(null, false);
  const call = queryLog.find(c => /FROM templates/i.test(c.sql));
  assert(/is_global = FALSE/i.test(call!.sql), 'exclude global clause');
}

// ============================================================================
// getTemplateByName
// ============================================================================
console.log('\n── getTemplateByName ─────────────────────────────────────');

resetAll();
{
  routes.push({
    match: /WHERE \(t\.name = \? OR t\.slug = \?\)/i,
    handler: () => [[]],
  });
  const r = await TemplateService.getTemplateByName('Nothing');
  assertEq(r, null, 'not found → null');
}

resetAll();
{
  routes.push({
    match: /WHERE \(t\.name = \? OR t\.slug = \?\)/i,
    handler: () => [[{
      id: 1, name: 'BaptismRecords', fields: '[]', language_support: null,
      is_global: 1, church_name: null,
    }]],
  });
  const r = await TemplateService.getTemplateByName('BaptismRecords');
  assertEq(r.scope, 'Global', 'global scope');
  assertEq(r.fields, [] as any, 'parsed fields');
  assertEq(r.exists, false, 'file not on disk');
}

// ============================================================================
// deleteTemplate
// ============================================================================
console.log('\n── deleteTemplate ────────────────────────────────────────');

// Not found
resetAll();
{
  routes.push({
    match: /WHERE \(t\.name = \? OR t\.slug = \?\)/i,
    handler: () => [[]],
  });
  quiet();
  await assertThrows(
    () => TemplateService.deleteTemplate('Ghost'),
    'not found',
    'missing throws'
  );
  loud();
}

// Global → cannot delete
resetAll();
{
  routes.push({
    match: /WHERE \(t\.name = \? OR t\.slug = \?\)/i,
    handler: () => [[{
      id: 1, name: 'G', fields: '[]', language_support: null, is_global: 1,
    }]],
  });
  quiet();
  await assertThrows(
    () => TemplateService.deleteTemplate('G'),
    'global',
    'global blocked'
  );
  loud();
}

// Wrong church
resetAll();
{
  routes.push({
    match: /WHERE \(t\.name = \? OR t\.slug = \?\)/i,
    handler: () => [[{
      id: 1, name: 'T', fields: '[]', language_support: null, is_global: 0,
      church_id: 2,
    }]],
  });
  quiet();
  await assertThrows(
    () => TemplateService.deleteTemplate('T', 5),
    'Permission denied',
    'other church'
  );
  loud();
}

// Happy delete
resetAll();
{
  routes.push({
    match: /WHERE \(t\.name = \? OR t\.slug = \?\)/i,
    handler: () => [[{
      id: 1, name: 'T', fields: '[]', language_support: null, is_global: 0,
      church_id: 5,
    }]],
  });
  routes.push({
    match: /^DELETE FROM templates/i,
    handler: () => [{}],
  });
  // Seed a file to delete
  const filePath = require('path').resolve(__dirname, '../../../front-end/src/views/records/T.tsx');
  vfs[filePath] = 'old';
  quiet();
  const r = await TemplateService.deleteTemplate('T', 5);
  loud();
  assertEq(r, true, 'returns true');
  assert(!(filePath in vfs), 'file removed');
}

// ============================================================================
// getTemplatesByType
// ============================================================================
console.log('\n── getTemplatesByType ────────────────────────────────────');

resetAll();
{
  routes.push({
    match: /WHERE t\.record_type = \?/i,
    handler: () => [[{
      id: 1, name: 'A', fields: '[{"field":"x","label":"X"}]',
      language_support: '{"en":true,"gr":false}', is_global: 1, church_name: null,
    }]],
  });
  const r = await TemplateService.getTemplatesByType('baptism');
  assertEq(r[0].fields[0].field, 'x', 'fields parsed');
  assertEq(r[0].languageSupport.gr, false, 'languageSupport parsed');
}

// With churchId
resetAll();
{
  routes.push({
    match: /WHERE t\.record_type = \?[\s\S]*t\.church_id = \? OR t\.is_global = TRUE/i,
    handler: () => [[]],
  });
  await TemplateService.getTemplatesByType('marriage', 5, true);
  const call = queryLog.find(c => /WHERE t\.record_type/i.test(c.sql));
  assert(/church_id = \?/.test(call!.sql), 'church clause');
}

// ============================================================================
// extractFieldsFromTemplate
// ============================================================================
console.log('\n── extractFieldsFromTemplate ─────────────────────────────');

resetAll();
quiet();
await assertThrows(
  async () => TemplateService.extractFieldsFromTemplate('/nope/missing.tsx'),
  'not found',
  'missing file'
);
loud();

// Happy
resetAll();
{
  const p = '/t/TestRecords.tsx';
  vfs[p] = `
    const columnDefs = [
      { headerName: 'First Name', field: 'first_name', sortable: true },
      { headerName: 'Birth Date', field: 'birth_date', sortable: true },
    ];
  `;
  const fields = TemplateService.extractFieldsFromTemplate(p);
  assertEq(fields.length, 2, 'two fields');
  assertEq(fields[0].label, 'First Name', 'label 1');
  assertEq(fields[0].field, 'first_name', 'field 1');
  assertEq(fields[1].type, 'date', 'inferred date type');
}

// No columnDefs
resetAll();
{
  const p = '/t/Bad.tsx';
  vfs[p] = 'no columnDefs here';
  quiet();
  try {
    TemplateService.extractFieldsFromTemplate(p);
    assert(false, 'should have thrown');
  } catch (e: any) {
    assert(e.message.includes('Could not find'), 'no columnDefs error');
  }
  loud();
}

// ============================================================================
// updateTemplate
// ============================================================================
console.log('\n── updateTemplate ────────────────────────────────────────');

// Not found
resetAll();
{
  routes.push({
    match: /WHERE \(t\.name = \? OR t\.slug = \?\)/i,
    handler: () => [[]],
  });
  quiet();
  await assertThrows(
    () => TemplateService.updateTemplate('X', { description: 'new' }),
    'not found',
    'missing throws'
  );
  loud();
}

// Global blocked
resetAll();
{
  routes.push({
    match: /WHERE \(t\.name = \? OR t\.slug = \?\)/i,
    handler: () => [[{ name: 'G', fields: '[]', is_global: 1, language_support: null }]],
  });
  quiet();
  await assertThrows(
    () => TemplateService.updateTemplate('G', { description: 'new' }),
    'Cannot modify global',
    'global blocked'
  );
  loud();
}

// Wrong church
resetAll();
{
  routes.push({
    match: /WHERE \(t\.name = \? OR t\.slug = \?\)/i,
    handler: () => [[{ name: 'T', fields: '[]', is_global: 0, church_id: 2, language_support: null }]],
  });
  quiet();
  await assertThrows(
    () => TemplateService.updateTemplate('T', { description: 'new' }, 5),
    'Permission denied',
    'wrong church'
  );
  loud();
}

// No valid fields
resetAll();
{
  routes.push({
    match: /WHERE \(t\.name = \? OR t\.slug = \?\)/i,
    handler: () => [[{ name: 'T', fields: '[]', is_global: 0, language_support: null }]],
  });
  quiet();
  await assertThrows(
    () => TemplateService.updateTemplate('T', { notAllowed: 'x' }),
    'No valid fields',
    'empty update'
  );
  loud();
}

// Happy — updates with JSON serialization
resetAll();
{
  routes.push({
    match: /WHERE \(t\.name = \? OR t\.slug = \?\)/i,
    handler: () => [[{ name: 'T', fields: '[]', is_global: 0, language_support: null }]],
  });
  routes.push({
    match: /^UPDATE templates SET/i,
    handler: () => [{}],
  });
  const r = await TemplateService.updateTemplate('T', {
    description: 'new desc',
    fields: [{ field: 'x', label: 'X' }],
    language_support: { en: true, es: true },
  });
  assertEq(r, true, 'returns true');
  const upd = queryLog.find(c => /^UPDATE templates SET/i.test(c.sql));
  assert(upd!.sql.includes('description = ?'), 'description in SET');
  assert(upd!.sql.includes('fields = ?'), 'fields in SET');
  assert(upd!.sql.includes('updated_at = NOW()'), 'updated_at appended');
  // fields should be JSON serialized
  assert(upd!.params.some(p => typeof p === 'string' && p.includes('"field":"x"')), 'fields JSON');
  assert(upd!.params.some(p => typeof p === 'string' && p.includes('"es":true')), 'language_support JSON');
}

// Global update with allowGlobalUpdate flag
resetAll();
{
  routes.push({
    match: /WHERE \(t\.name = \? OR t\.slug = \?\)/i,
    handler: () => [[{ name: 'G', fields: '[]', is_global: 1, language_support: null }]],
  });
  routes.push({ match: /^UPDATE templates SET/i, handler: () => [{}] });
  const r = await TemplateService.updateTemplate('G', {
    description: 'new',
    allowGlobalUpdate: true,
  });
  assertEq(r, true, 'global allowed');
}

// ============================================================================
// getGlobalTemplates
// ============================================================================
console.log('\n── getGlobalTemplates ────────────────────────────────────');

resetAll();
{
  routes.push({
    match: /WHERE is_global = TRUE/i,
    handler: () => [[
      { id: 1, name: 'A', fields: '[{"f":1}]', language_support: null },
      { id: 2, name: 'B', fields: '[]', language_support: '{"en":true}' },
    ]],
  });
  const r = await TemplateService.getGlobalTemplates();
  assertEq(r.length, 2, 'two rows');
  assertEq(r[0].languageSupport, { en: true } as any, 'default language');
  assertEq(r[1].languageSupport.en, true, 'parsed language');
}

// ============================================================================
// duplicateGlobalTemplate
// ============================================================================
console.log('\n── duplicateGlobalTemplate ───────────────────────────────');

// Source not found
resetAll();
{
  routes.push({
    match: /WHERE \(t\.name = \? OR t\.slug = \?\)/i,
    handler: () => [[]],
  });
  quiet();
  await assertThrows(
    () => TemplateService.duplicateGlobalTemplate('Ghost', 5, 'New'),
    'not found',
    'missing source'
  );
  loud();
}

// Source not global
resetAll();
{
  routes.push({
    match: /WHERE \(t\.name = \? OR t\.slug = \?\)/i,
    handler: () => [[{ name: 'X', fields: '[]', is_global: 0, language_support: null }]],
  });
  quiet();
  await assertThrows(
    () => TemplateService.duplicateGlobalTemplate('X', 5, 'New'),
    'only duplicate global',
    'not global'
  );
  loud();
}

// Target name taken
resetAll();
{
  let call = 0;
  routes.push({
    match: /WHERE \(t\.name = \? OR t\.slug = \?\)/i,
    handler: () => {
      call++;
      if (call === 1) return [[{ name: 'G', fields: '[]', is_global: 1, language_support: null, description: 'x' }]];
      return [[{ name: 'New', fields: '[]', is_global: 0, language_support: null }]];
    },
  });
  quiet();
  await assertThrows(
    () => TemplateService.duplicateGlobalTemplate('G', 5, 'New'),
    'already exists',
    'target taken'
  );
  loud();
}

// Happy duplicate
resetAll();
{
  let call = 0;
  routes.push({
    match: /WHERE \(t\.name = \? OR t\.slug = \?\)/i,
    handler: () => {
      call++;
      if (call === 1) {
        return [[{
          name: 'G', fields: '[{"field":"x","label":"X"}]',
          is_global: 1, language_support: '{"en":true}',
          record_type: 'baptism', grid_type: 'aggrid',
          theme: 'liturgicalBlueGold', layout_type: 'table',
          description: 'original',
        }]];
      }
      return [[]];
    },
  });
  routes.push({ match: /^\s*INSERT INTO templates/i, handler: () => [{}] });
  quiet();
  const p = await TemplateService.duplicateGlobalTemplate('G', 5, 'NewCopy');
  loud();
  assert(p.endsWith('NewCopy.tsx'), 'file path ok');
  assert(p in vfs, 'file written');
  const ins = queryLog.find(c => /^\s*INSERT INTO templates/i.test(c.sql));
  assertEq(ins!.params[0], 'NewCopy', 'new name');
  assertEq(ins!.params[11], 5, 'churchId');
}

// ============================================================================
// initializePredefinedTemplates
// ============================================================================
console.log('\n── initializePredefinedTemplates ─────────────────────────');

resetAll();
{
  // All three do not exist yet
  routes.push({
    match: /WHERE \(t\.name = \? OR t\.slug = \?\)/i,
    handler: () => [[]],
  });
  routes.push({ match: /^\s*INSERT INTO templates/i, handler: () => [{}] });
  quiet();
  await TemplateService.initializePredefinedTemplates();
  loud();
  const inserts = queryLog.filter(c => /^\s*INSERT INTO templates/i.test(c.sql));
  assertEq(inserts.length, 3, '3 inserts');
  // All three files written
  const files = Object.keys(vfs).filter(k => k.endsWith('.tsx'));
  assertEq(files.length, 3, '3 files written');
}

// ============================================================================
// updatePredefinedTemplate
// ============================================================================
console.log('\n── updatePredefinedTemplate ──────────────────────────────');

// Invalid type
resetAll();
quiet();
await assertThrows(
  () => TemplateService.updatePredefinedTemplate('bogus', { fields: [] }),
  'Invalid record type',
  'bad type'
);
loud();

// Missing fields
resetAll();
quiet();
await assertThrows(
  () => TemplateService.updatePredefinedTemplate('baptism', {}),
  'fields array',
  'missing fields'
);
loud();

// Happy: no existing template → goes through generateTemplate path
resetAll();
{
  routes.push({
    match: /WHERE \(t\.name = \? OR t\.slug = \?\)/i,
    handler: () => [[]],
  });
  routes.push({ match: /^\s*INSERT INTO templates/i, handler: () => [{}] });
  quiet();
  const r = await TemplateService.updatePredefinedTemplate('baptism', {
    fields: [{ field: 'x', label: 'X' }],
    description: 'new',
  });
  loud();
  assertEq(r.success, true, 'success flag');
  assertEq(r.recordType, 'baptism', 'recordType');
  assertEq(r.fieldsCount, 1, 'fields count');
  assertEq(r.templateName, 'BaptismRecords', 'template name');
}

// ============================================================================
// initializeDatabase
// ============================================================================
console.log('\n── initializeDatabase ────────────────────────────────────');

resetAll();
{
  // Table does not exist → CREATE
  routes.push({
    match: /information_schema\.tables/i,
    handler: () => [[{ count: 0 }]],
  });
  routes.push({
    match: /CREATE TABLE templates/i,
    handler: () => [{}],
  });
  // syncExistingTemplates runs after; records dir won't exist in vfs
  quiet();
  await TemplateService.initializeDatabase();
  loud();
  const created = queryLog.find(c => /CREATE TABLE templates/i.test(c.sql));
  assert(created !== undefined, 'CREATE executed');
}

resetAll();
{
  // Table exists
  routes.push({
    match: /information_schema\.tables/i,
    handler: () => [[{ count: 1 }]],
  });
  quiet();
  await TemplateService.initializeDatabase();
  loud();
  const created = queryLog.find(c => /CREATE TABLE templates/i.test(c.sql));
  assertEq(created, undefined, 'no CREATE when table exists');
}

// ============================================================================
// getTemplatesForChurch (thin wrapper)
// ============================================================================
console.log('\n── getTemplatesForChurch ─────────────────────────────────');

resetAll();
{
  routes.push({
    match: /FROM templates t[\s\S]*WHERE 1=1/i,
    handler: () => [[{ id: 1, name: 'T', fields: '[]', language_support: null, is_global: 0, church_name: 'Church A' }]],
  });
  const r = await TemplateService.getTemplatesForChurch(5);
  assertEq(r.length, 1, 'one row');
  assertEq(r[0].scope, 'Church A', 'church scope');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
