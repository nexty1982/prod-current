#!/usr/bin/env npx tsx
/**
 * Unit tests for services/churchSetupService.js (OMD-1065)
 *
 * Singleton ChurchSetupService that orchestrates multi-tenant church creation:
 *   - setupNewChurch (transaction wrapper: createChurchDatabase +
 *     setupChurchTemplates + updateChurchSetupStatus + commit/rollback)
 *   - setupChurchTemplates (fetch globals → filter → duplicate → generate)
 *   - completeTemplateSetup (retry template setup on existing church)
 *   - getChurchSetupStatus / updateChurchSetupStatus (DB helpers)
 *   - generateRecordComponents + generateRecordViewer/Editor (file writers)
 *   - Pure helpers: getNextSteps, getDefaultFields
 *   - Code generators: generateViewerComponentCode, generateEditorComponentCode
 *
 * External deps stubbed via require.cache BEFORE requiring the SUT:
 *   - ../config/db-compat       (getAppPool, promisePool)
 *   - ../utils/dbSwitcher       (getChurchDbConnection — unused, stubbed anyway)
 *   - ./templateService         (getGlobalTemplates, duplicateGlobalTemplate,
 *                                getTemplateByRecordType, writeComponentFile,
 *                                getTemplatesForChurch)
 *
 * Note: the SUT calls `this.createChurchDatabase` and `this.generateSupportingFiles`
 * which are NOT defined on the class. We patch them onto the singleton instance
 * at test time to exercise setupNewChurch/generateRecordComponents.
 *
 * Run: npx tsx server/src/services/__tests__/churchSetupService.test.ts
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

// ─── Stubs ──────────────────────────────────────────────────────────────────

// SQL-routed fake platform pool
type Route = { match: RegExp; rows?: any[]; respond?: (params: any[]) => any[] };
let routes: Route[] = [];
const queryLog: { sql: string; params: any[] }[] = [];
let queryThrows: Error | null = null;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (queryThrows) throw queryThrows;
    for (const r of routes) {
      if (r.match.test(sql)) {
        const rows = r.respond ? r.respond(params) : (r.rows || []);
        return [rows];
      }
    }
    return [[]];
  },
};

// Fake DB connection (transaction lifecycle)
const connLog: string[] = [];
let beginCount = 0;
let commitCount = 0;
let rollbackCount = 0;
let releaseCount = 0;
let beginThrows = false;
let commitThrows = false;

const fakeConnection = {
  beginTransaction: async () => {
    beginCount++;
    connLog.push('begin');
    if (beginThrows) throw new Error('begin failed');
  },
  commit: async () => {
    commitCount++;
    connLog.push('commit');
    if (commitThrows) throw new Error('commit failed');
  },
  rollback: async () => {
    rollbackCount++;
    connLog.push('rollback');
  },
  release: () => {
    releaseCount++;
    connLog.push('release');
  },
  query: async (sql: string, params: any[] = []) => fakePool.query(sql, params),
};

const fakePromisePool = {
  getConnection: async () => fakeConnection,
};

const dbCompatStub = {
  getAppPool: () => fakePool,
  promisePool: fakePromisePool,
};

const dbCompatPath = require.resolve('../../config/db-compat');
require.cache[dbCompatPath] = {
  id: dbCompatPath, filename: dbCompatPath, loaded: true, exports: dbCompatStub,
} as any;

// dbSwitcher stub (unused by SUT paths we test, but required to import)
const dbSwitcherStub = {
  getChurchDbConnection: async (_dbName: string) => null,
};
{
  const path = require('path');
  const utilsDir = path.resolve(__dirname, '../../utils');
  for (const fn of ['dbSwitcher.js', 'dbSwitcher.ts']) {
    const abs = path.join(utilsDir, fn);
    require.cache[abs] = {
      id: abs, filename: abs, loaded: true, exports: dbSwitcherStub,
    } as any;
  }
}

// templateService stub
type TsvcCall = { method: string; args: any[] };
const tsvcCalls: TsvcCall[] = [];
let globalTemplatesData: any[] = [];
let getTemplateByRecordTypeData: any = null;
let getTemplatesForChurchData: any[] = [];
let duplicateTemplateResult: any = { filePath: '/tmp/dup.json' };
const writeComponentFileLog: { filePath: string; content: string }[] = [];
let templateServiceThrowsOn: string | null = null;

const templateServiceStub = {
  getGlobalTemplates: async () => {
    tsvcCalls.push({ method: 'getGlobalTemplates', args: [] });
    if (templateServiceThrowsOn === 'getGlobalTemplates') {
      throw new Error('upstream failure');
    }
    return globalTemplatesData;
  },
  duplicateGlobalTemplate: async (...args: any[]) => {
    tsvcCalls.push({ method: 'duplicateGlobalTemplate', args });
    return duplicateTemplateResult;
  },
  getTemplateByRecordType: async (...args: any[]) => {
    tsvcCalls.push({ method: 'getTemplateByRecordType', args });
    return getTemplateByRecordTypeData;
  },
  writeComponentFile: async (filePath: string, content: string) => {
    tsvcCalls.push({ method: 'writeComponentFile', args: [filePath, content] });
    writeComponentFileLog.push({ filePath, content });
  },
  getTemplatesForChurch: async (churchId: number) => {
    tsvcCalls.push({ method: 'getTemplatesForChurch', args: [churchId] });
    return getTemplatesForChurchData;
  },
};

// templateService is a sibling — stub both .js and .ts paths to cover
// tsx's caller-relative module resolution quirk.
{
  const path = require('path');
  const servicesDir = path.resolve(__dirname, '..');
  for (const fn of ['templateService.js', 'templateService.ts']) {
    const abs = path.join(servicesDir, fn);
    require.cache[abs] = {
      id: abs, filename: abs, loaded: true, exports: templateServiceStub,
    } as any;
  }
}

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const churchSetupService = require('../churchSetupService');

// Patch broken `this.createChurchDatabase` and `this.generateSupportingFiles`
// onto the singleton — they are referenced by the SUT but not implemented.
let createChurchDatabaseCalls: any[] = [];
let createChurchDatabaseThrows = false;
(churchSetupService as any).createChurchDatabase = async (
  connection: any,
  churchData: any,
) => {
  createChurchDatabaseCalls.push({ churchData });
  if (createChurchDatabaseThrows) throw new Error('db create failed');
  return {
    churchId: 42,
    dbName: 'om_church_42',
    adminUserId: 100,
  };
};

let generateSupportingFilesCalls: any[] = [];
(churchSetupService as any).generateSupportingFiles = async (
  churchId: number,
  recordType: string,
) => {
  generateSupportingFilesCalls.push({ churchId, recordType });
  return { files_created: [`/fake/${recordType}/hooks.ts`] };
};

function resetState() {
  routes = [];
  queryLog.length = 0;
  queryThrows = null;
  connLog.length = 0;
  beginCount = 0;
  commitCount = 0;
  rollbackCount = 0;
  releaseCount = 0;
  beginThrows = false;
  commitThrows = false;
  tsvcCalls.length = 0;
  globalTemplatesData = [];
  getTemplateByRecordTypeData = null;
  getTemplatesForChurchData = [];
  duplicateTemplateResult = { filePath: '/tmp/dup.json' };
  writeComponentFileLog.length = 0;
  templateServiceThrowsOn = null;
  createChurchDatabaseCalls = [];
  createChurchDatabaseThrows = false;
  generateSupportingFilesCalls = [];
}

async function main() {

// ============================================================================
// getNextSteps (pure)
// ============================================================================
console.log('\n── getNextSteps ──────────────────────────────────────────');

{
  // Neither templates set up nor complete
  const s1 = churchSetupService.getNextSteps({ templates_setup: false, setup_step: 'templates_pending' });
  assertEq(s1.length, 1, 'only setup_templates step');
  assertEq(s1[0].step, 'setup_templates', 'step = setup_templates');
  assert(s1[0].optional === true, 'optional flag');
  assertEq(s1[0].url, '/admin/template-setup', 'setup url');

  // Templates set up but not complete → no steps
  const s2 = churchSetupService.getNextSteps({ templates_setup: true, setup_step: 'in_progress' });
  assertEq(s2.length, 0, 'templates_setup=true & incomplete → empty');

  // Complete → start_using only
  const s3 = churchSetupService.getNextSteps({ templates_setup: true, setup_step: 'complete' });
  assertEq(s3.length, 1, 'one step when complete');
  assertEq(s3[0].step, 'start_using', 'step = start_using');
  assertEq(s3[0].url, '/records', 'records url');

  // Edge: templates_setup=false AND complete → both steps
  const s4 = churchSetupService.getNextSteps({ templates_setup: false, setup_step: 'complete' });
  assertEq(s4.length, 2, 'both steps');
  assertEq(s4[0].step, 'setup_templates', 'first: setup_templates');
  assertEq(s4[1].step, 'start_using', 'second: start_using');
}

// ============================================================================
// getDefaultFields (pure)
// ============================================================================
console.log('\n── getDefaultFields ──────────────────────────────────────');

{
  const b = churchSetupService.getDefaultFields('baptism');
  assertEq(b.length, 8, 'baptism: 8 fields');
  assertEq(b[0].field, 'first_name', 'baptism: first_name');
  assertEq(b[0].required, true, 'first_name required');
  assert(b.some((f: any) => f.field === 'date_of_baptism' && f.type === 'date'), 'date_of_baptism date');
  assert(b.some((f: any) => f.field === 'godparents'), 'godparents present');

  const m = churchSetupService.getDefaultFields('marriage');
  assertEq(m.length, 7, 'marriage: 7 fields');
  assertEq(m[0].field, 'groom_name', 'marriage: groom_name');
  assertEq(m[1].field, 'bride_name', 'marriage: bride_name');
  assert(m.some((f: any) => f.field === 'marriage_date' && f.required === true), 'marriage_date required');
  assert(m.some((f: any) => f.field === 'best_man'), 'best_man present');

  const f = churchSetupService.getDefaultFields('funeral');
  assertEq(f.length, 6, 'funeral: 6 fields');
  assertEq(f[0].field, 'deceased_name', 'funeral: deceased_name');
  assert(f.some((x: any) => x.field === 'age_at_death' && x.type === 'number'), 'age_at_death number');

  const unknown = churchSetupService.getDefaultFields('chrismation');
  assertEq(unknown, [], 'unknown → []');

  const none = churchSetupService.getDefaultFields('');
  assertEq(none, [], 'empty → []');
}

// ============================================================================
// generateViewerComponentCode (pure)
// ============================================================================
console.log('\n── generateViewerComponentCode ───────────────────────────');

{
  const fields = [
    { field: 'first_name', label: 'First Name' },
    { field: 'last_name', label: 'Last Name' },
  ];
  const code = churchSetupService.generateViewerComponentCode(
    'BaptismRecordViewer', fields, 'baptism', 'orthodox_traditional'
  );
  assert(code.includes('const BaptismRecordViewer'), 'component name');
  assert(code.includes('export default BaptismRecordViewer'), 'default export');
  assert(code.includes("field: 'first_name'"), 'field key');
  assert(code.includes("headerName: 'First Name'"), 'header label');
  assert(code.includes("field: 'last_name'"), 'second field');
  assert(code.includes('ag-grid-react'), 'ag-grid import');
  assert(code.includes('/api/church/'), 'API URL');
  assert(code.includes('baptism-records'), 'record type in URL');
  assert(code.includes('Baptism Records'), 'title heading');
  assert(code.includes('paginationPageSize: 50'), 'pagination setting');
}

// Empty fields
{
  const code = churchSetupService.generateViewerComponentCode(
    'MarriageRecordViewer', [], 'marriage', 'minimal'
  );
  assert(code.includes('MarriageRecordViewer'), 'name');
  assert(code.includes('const columnDefs = [\n\n  ];') || code.includes('columnDefs = ['), 'empty columnDefs');
  assert(code.includes('Marriage Records'), 'title');
}

// ============================================================================
// generateEditorComponentCode (pure)
// ============================================================================
console.log('\n── generateEditorComponentCode ───────────────────────────');

{
  const fields = [
    { field: 'groom_name', label: 'Groom' },
    { field: 'bride_name', label: 'Bride' },
  ];
  const code = churchSetupService.generateEditorComponentCode(
    'MarriageRecordEditor', fields, 'marriage', 'orthodox_traditional'
  );
  assert(code.includes('const MarriageRecordEditor'), 'component name');
  assert(code.includes('export default MarriageRecordEditor'), 'default export');
  assert(code.includes("field: 'groom_name'"), 'field key');
  assert(code.includes("headerName: 'Groom'"), 'header label');
  assert(code.includes('editable: !isLocked'), 'editable honors lock');
  assert(code.includes('Marriage Records - Editor'), 'title');
  assert(code.includes('Add New Marriage Record'), 'add button text');
  assert(code.includes('useState'), 'react hooks');
}

// ============================================================================
// getChurchSetupStatus
// ============================================================================
console.log('\n── getChurchSetupStatus ──────────────────────────────────');

// Happy — church with setup_status JSON
resetState();
routes = [{
  match: /SELECT \* FROM churches/,
  respond: (params) => {
    assertEq(params[0], 46, 'churchId param');
    return [{
      id: 46,
      name: 'Holy Trinity',
      setup_status: JSON.stringify({ templates_setup: true, setup_step: 'complete' }),
    }];
  },
}];
{
  const r = await churchSetupService.getChurchSetupStatus(46);
  assertEq(r.id, 46, 'returns id');
  assertEq(r.name, 'Holy Trinity', 'returns name');
  assertEq(r.setup_status.templates_setup, true, 'parsed setup_status');
  assertEq(r.setup_status.setup_step, 'complete', 'parsed setup_step');
}

// Null setup_status → defaults to {}
resetState();
routes = [{
  match: /SELECT \* FROM churches/,
  rows: [{ id: 46, name: 'St. George', setup_status: null }],
}];
{
  const r = await churchSetupService.getChurchSetupStatus(46);
  assertEq(r.setup_status, {}, 'null setup_status → {}');
}

// Not found → null
resetState();
routes = [{ match: /SELECT \* FROM churches/, rows: [] }];
{
  const r = await churchSetupService.getChurchSetupStatus(999);
  assertEq(r, null, 'not found → null');
}

// ============================================================================
// updateChurchSetupStatus
// ============================================================================
console.log('\n── updateChurchSetupStatus ───────────────────────────────');

resetState();
routes = [{ match: /UPDATE churches SET setup_status/, rows: [{ affectedRows: 1 }] }];
{
  const status = { templates_setup: true, setup_step: 'complete' };
  await churchSetupService.updateChurchSetupStatus(fakeConnection, 46, status);
  assertEq(queryLog.length, 1, '1 query');
  assert(/UPDATE churches/.test(queryLog[0].sql), 'UPDATE churches');
  assert(/setup_status = \?/.test(queryLog[0].sql), 'setup_status param');
  assert(/updated_at = NOW\(\)/.test(queryLog[0].sql), 'updated_at NOW()');
  assertEq(queryLog[0].params[0], JSON.stringify(status), 'serialized status');
  assertEq(queryLog[0].params[1], 46, 'churchId');
}

// ============================================================================
// setupChurchTemplates
// ============================================================================
console.log('\n── setupChurchTemplates ──────────────────────────────────');

// includeGlobalTemplates only — just fetches & filters
resetState();
globalTemplatesData = [
  { name: 'std_baptism', record_type: 'baptism' },
  { name: 'std_marriage', record_type: 'marriage' },
  { name: 'std_pet', record_type: 'pet_blessing' }, // filtered out
];
{
  const r = await churchSetupService.setupChurchTemplates(1, {
    includeGlobalTemplates: true,
    recordTypes: ['baptism', 'marriage', 'funeral'],
  });
  assertEq(r.global_templates_available.length, 2, 'filtered: 2 matching');
  assertEq(r.duplicated_templates.length, 0, 'no duplication (autoSetupStandard=false)');
  assertEq(r.custom_templates.length, 0, 'no custom');
  assertEq(r.generated_components.length, 0, 'no components');
  assertEq(tsvcCalls.filter(c => c.method === 'getGlobalTemplates').length, 1, 'getGlobalTemplates called once');
}

// autoSetupStandard — duplicates templates
resetState();
globalTemplatesData = [
  { name: 'std_baptism', record_type: 'baptism' },
  { name: 'std_marriage', record_type: 'marriage' },
];
duplicateTemplateResult = { filePath: '/tmp/dup.json' };
{
  const r = await churchSetupService.setupChurchTemplates(46, {
    includeGlobalTemplates: true,
    autoSetupStandard: true,
    recordTypes: ['baptism', 'marriage', 'funeral'], // funeral has no match
  });
  // Only baptism + marriage get duplicated (funeral has no global template)
  assertEq(r.duplicated_templates.length, 2, '2 duplicated (funeral skipped)');
  assertEq(r.duplicated_templates[0].original, 'std_baptism', 'first: std_baptism');
  assertEq(r.duplicated_templates[0].new_name, 'std_baptism_Church46', 'new name includes churchId');
  assertEq(r.duplicated_templates[0].record_type, 'baptism', 'record_type');
  assertEq(r.duplicated_templates[0].file_path, '/tmp/dup.json', 'file_path');
  assertEq(r.duplicated_templates[1].record_type, 'marriage', 'second: marriage');

  // Verify duplicateGlobalTemplate calls
  const dupCalls = tsvcCalls.filter(c => c.method === 'duplicateGlobalTemplate');
  assertEq(dupCalls.length, 2, '2 duplicate calls');
  assertEq(dupCalls[0].args[0], 'std_baptism', 'arg: original name');
  assertEq(dupCalls[0].args[1], 46, 'arg: churchId');
  assertEq(dupCalls[0].args[2], 'std_baptism_Church46', 'arg: new name');
  assertEq(dupCalls[0].args[3].auto_generated, true, 'metadata.auto_generated');
  assert(dupCalls[0].args[3].description.includes('baptism'), 'metadata.description');
}

// generateComponents — triggers generateRecordComponents
resetState();
globalTemplatesData = [];
getTemplateByRecordTypeData = null; // forces default fields
quiet();
{
  const r = await churchSetupService.setupChurchTemplates(10, {
    includeGlobalTemplates: false,
    generateComponents: true,
    recordTypes: ['baptism'],
  });
  loud();
  assertEq(r.generated_components.length, 1, '1 component set');
  assertEq(r.generated_components[0].record_type, 'baptism', 'record_type');
  assert(r.generated_components[0].viewer_component, 'has viewer');
  assert(r.generated_components[0].editor_component, 'has editor');
  // Verify writeComponentFile was called for viewer + editor
  const writes = tsvcCalls.filter(c => c.method === 'writeComponentFile');
  assertEq(writes.length, 2, '2 file writes (viewer + editor)');
  // generateSupportingFiles stub invoked
  assertEq(generateSupportingFilesCalls.length, 1, 'generateSupportingFiles called');
  assertEq(generateSupportingFilesCalls[0].recordType, 'baptism', 'supporting files recordType');
}

// Error in upstream call → wrapped with "Template setup failed"
resetState();
templateServiceThrowsOn = 'getGlobalTemplates';
quiet();
{
  let caught: Error | null = null;
  try {
    await churchSetupService.setupChurchTemplates(1, { includeGlobalTemplates: true });
  } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws');
  assert(caught !== null && caught.message.includes('Template setup failed'), 'wrapped message');
  assert(caught !== null && caught.message.includes('upstream failure'), 'original cause included');
}

// ============================================================================
// generateRecordViewer / generateRecordEditor
// ============================================================================
console.log('\n── generateRecordViewer / Editor ─────────────────────────');

// Viewer — template exists
resetState();
getTemplateByRecordTypeData = {
  fields: [
    { field: 'first_name', label: 'First' },
    { field: 'last_name', label: 'Last' },
  ],
};
quiet();
{
  const v = await churchSetupService.generateRecordViewer(46, 'baptism', 'orthodox_traditional');
  loud();
  assertEq(v.name, 'BaptismRecordViewer', 'name');
  assertEq(v.component_type, 'viewer', 'type');
  assertEq(v.file_path, 'front-end/src/views/records/baptism/RecordViewer.jsx', 'file_path');
  assert(v.features.includes('ag_grid'), 'ag_grid feature');
  assert(v.features.includes('pagination'), 'pagination feature');
  // writeComponentFile called with generated code
  const write = tsvcCalls.find(c => c.method === 'writeComponentFile');
  assert(write !== undefined, 'writeComponentFile called');
  assertEq(write!.args[0], 'front-end/src/views/records/baptism/RecordViewer.jsx', 'write path');
  assert(write!.args[1].includes("field: 'first_name'"), 'write content has template field');
}

// Editor — template missing → falls back to default fields
resetState();
getTemplateByRecordTypeData = null;
quiet();
{
  const e = await churchSetupService.generateRecordEditor(46, 'marriage', 'minimal');
  loud();
  assertEq(e.name, 'MarriageRecordEditor', 'name');
  assertEq(e.component_type, 'editor', 'type');
  assert(e.features.includes('crud_operations'), 'crud feature');
  assert(e.features.includes('forms'), 'forms feature');
  assert(e.features.includes('lock_toggle'), 'lock_toggle feature');
  assertEq(e.file_path, 'front-end/src/views/records/marriage/RecordEditor.jsx', 'file path');
  // Default marriage fields appear in the generated code
  const write = tsvcCalls.find(c => c.method === 'writeComponentFile');
  assert(write !== undefined, 'writeComponentFile called');
  assert(write!.args[1].includes("field: 'groom_name'"), 'includes default groom_name');
  assert(write!.args[1].includes("field: 'bride_name'"), 'includes default bride_name');
}

// ============================================================================
// generateRecordComponents
// ============================================================================
console.log('\n── generateRecordComponents ──────────────────────────────');

resetState();
getTemplateByRecordTypeData = null;
quiet();
{
  const r = await churchSetupService.generateRecordComponents(
    77, ['baptism', 'funeral'], 'orthodox_traditional'
  );
  loud();
  assertEq(r.length, 2, '2 component sets');
  assertEq(r[0].record_type, 'baptism', 'first: baptism');
  assertEq(r[1].record_type, 'funeral', 'second: funeral');
  assert(r[0].viewer_component !== undefined, 'viewer present');
  assert(r[0].editor_component !== undefined, 'editor present');
  assert(r[0].supporting_files !== undefined, 'supporting_files present');
  // Each record type triggers viewer + editor + supporting files
  assertEq(generateSupportingFilesCalls.length, 2, '2 supporting files calls');
  const writes = tsvcCalls.filter(c => c.method === 'writeComponentFile');
  assertEq(writes.length, 4, '4 file writes (2 types × 2 components)');
}

// ============================================================================
// setupNewChurch — transaction wrapper
// ============================================================================
console.log('\n── setupNewChurch ────────────────────────────────────────');

// Happy path — full flow with template setup
resetState();
routes = [{ match: /UPDATE churches SET setup_status/, rows: [{ affectedRows: 1 }] }];
globalTemplatesData = [{ name: 'std_baptism', record_type: 'baptism' }];
quiet();
{
  const r = await churchSetupService.setupNewChurch(
    { name: 'New Parish' },
    { includeGlobalTemplates: true, recordTypes: ['baptism'] }
  );
  loud();
  assertEq(r.success, true, 'success');
  assertEq(r.church.id, 42, 'churchId from createChurchDatabase');
  assertEq(r.church.name, 'New Parish', 'church name');
  assertEq(r.church.database_name, 'om_church_42', 'db name');
  assertEq(r.church.admin_user_id, 100, 'admin id');
  assertEq(r.church.setup_status.church_created, true, 'church_created flag');
  assertEq(r.church.setup_status.admin_user_created, true, 'admin_user_created flag');
  assertEq(r.church.setup_status.templates_setup, true, 'templates_setup flag');
  assertEq(r.church.setup_status.setup_step, 'complete', 'setup_step');
  assert(r.templates !== null, 'templates result returned');
  assert(Array.isArray(r.next_steps), 'next_steps array');

  // Transaction lifecycle
  assertEq(beginCount, 1, 'begin called');
  assertEq(commitCount, 1, 'commit called');
  assertEq(rollbackCount, 0, 'no rollback');
  assertEq(releaseCount, 1, 'connection released');
  assertEq(connLog[0], 'begin', 'order: begin');
  assertEq(connLog[connLog.length - 1], 'release', 'last: release');
  assert(connLog.includes('commit'), 'commit in log');

  // createChurchDatabase invoked
  assertEq(createChurchDatabaseCalls.length, 1, 'createChurchDatabase called');
  assertEq(createChurchDatabaseCalls[0].churchData.name, 'New Parish', 'church data passed');
}

// Skip template setup
resetState();
routes = [{ match: /UPDATE churches SET setup_status/, rows: [{ affectedRows: 1 }] }];
quiet();
{
  const r = await churchSetupService.setupNewChurch(
    { name: 'Skip Templates' },
    { setupTemplates: false }
  );
  loud();
  assertEq(r.success, true, 'success');
  assertEq(r.templates, null, 'templates null when skipped');
  assertEq(r.church.setup_status.templates_setup, false, 'templates_setup false');
  assertEq(r.church.setup_status.setup_step, 'templates_pending', 'pending step');
  // getGlobalTemplates NOT called
  assertEq(tsvcCalls.filter(c => c.method === 'getGlobalTemplates').length, 0, 'no template fetch');
  assertEq(commitCount, 1, 'still committed');
}

// Error in createChurchDatabase → rollback + release + re-throw
resetState();
createChurchDatabaseThrows = true;
quiet();
{
  let caught: Error | null = null;
  try {
    await churchSetupService.setupNewChurch({ name: 'Broken' }, {});
  } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'error thrown');
  assert(caught !== null && caught.message.includes('db create failed'), 'original error');
  assertEq(beginCount, 1, 'begin called');
  assertEq(commitCount, 0, 'no commit');
  assertEq(rollbackCount, 1, 'rollback called');
  assertEq(releaseCount, 1, 'connection released in finally');
}

// ============================================================================
// completeTemplateSetup
// ============================================================================
console.log('\n── completeTemplateSetup ─────────────────────────────────');

// Church not found → throws
resetState();
routes = [{ match: /SELECT \* FROM churches/, rows: [] }];
quiet();
{
  let caught: Error | null = null;
  try { await churchSetupService.completeTemplateSetup(999); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws when church not found');
  assert(caught !== null && caught.message.includes('Church not found'), 'error message');
}

// Already set up → returns early
resetState();
routes = [{
  match: /SELECT \* FROM churches/,
  rows: [{
    id: 46,
    setup_status: JSON.stringify({ templates_setup: true, setup_step: 'complete' }),
  }],
}];
getTemplatesForChurchData = [
  { name: 'existing_template', record_type: 'baptism' },
];
{
  const r = await churchSetupService.completeTemplateSetup(46);
  assertEq(r.success, true, 'success');
  assert(r.message.includes('already set up'), 'already-setup message');
  assertEq(r.templates.length, 1, 'returns templates for church');
  assertEq(r.templates[0].name, 'existing_template', 'template name');
  // Did NOT call setupChurchTemplates flow
  assertEq(tsvcCalls.filter(c => c.method === 'getGlobalTemplates').length, 0, 'no globals fetched');
}

// Normal completion flow — runs setup and updates status
resetState();
routes = [
  { match: /SELECT \* FROM churches/, rows: [{
    id: 46,
    setup_status: JSON.stringify({ templates_setup: false, setup_step: 'pending' }),
  }] },
  { match: /UPDATE churches SET setup_status/, rows: [{ affectedRows: 1 }] },
];
globalTemplatesData = [];
quiet();
{
  const r = await churchSetupService.completeTemplateSetup(46, { includeGlobalTemplates: true });
  loud();
  assertEq(r.success, true, 'success');
  assert(r.message.includes('completed successfully'), 'success message');
  assert(r.templates !== null, 'templates result');
  // Connection acquired + released for status update
  assertEq(releaseCount, 1, 'connection released');
  // UPDATE query fired
  assert(queryLog.some(q => /UPDATE churches/.test(q.sql)), 'UPDATE fired');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
