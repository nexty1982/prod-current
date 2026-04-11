#!/usr/bin/env npx tsx
/**
 * Unit tests for services/churchSetupService.js (OMD-1124)
 *
 * Church setup orchestrator with template integration. Singleton instance.
 *
 * OUT OF SCOPE (broken in production):
 *   - setupNewChurch: calls `this.createChurchDatabase` which isn't defined
 *   - generateRecordComponents, generateRecordViewer, generateRecordEditor:
 *     call `templateService.writeComponentFile` / `getTemplateByRecordType`
 *     which don't exist, plus `this.generateSupportingFiles` (undefined)
 *
 * IN SCOPE (testable):
 *   - getDefaultFields: baptism/marriage/funeral/unknown
 *   - getNextSteps: templates_setup flag + setup_step
 *   - generateViewerComponentCode: string output with template substitution
 *   - generateEditorComponentCode: string output with template substitution
 *   - getChurchSetupStatus: not found, found with/without setup_status
 *   - updateChurchSetupStatus: query shape
 *   - setupChurchTemplates: global-only, autoSetupStandard, errors
 *   - completeTemplateSetup: not found, already setup, happy path
 *
 * Deps stubbed via require.cache:
 *   - ../config/db-compat (getAppPool + promisePool)
 *   - ../utils/dbSwitcher (getChurchDbConnection)
 *   - ./templateService (getGlobalTemplates, duplicateGlobalTemplate,
 *                        getTemplatesForChurch)
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

async function assertThrows(fn: () => Promise<any>, pattern: RegExp, message: string): Promise<void> {
  try {
    await fn();
    console.error(`  FAIL: ${message} — did not throw`);
    failed++;
  } catch (e: any) {
    if (pattern.test(e.message)) { console.log(`  PASS: ${message}`); passed++; }
    else { console.error(`  FAIL: ${message}\n         got: ${e.message}`); failed++; }
  }
}

// ── Route-dispatch fake pool ─────────────────────────────────────────
type Route = { match: RegExp; handler: (params: any[], sql: string) => any };
const queryLog: Array<{ sql: string; params: any[] }> = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) if (r.match.test(sql)) return r.handler(params, sql);
    return [[]];
  },
};

// promisePool has the same query interface plus getConnection
const fakeConnection = {
  query: fakePool.query,
  release: () => {},
  beginTransaction: async () => {},
  commit: async () => {},
  rollback: async () => {},
};

const fakePromisePool = {
  ...fakePool,
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

// ── dbSwitcher stub ──────────────────────────────────────────────────
const dbSwitcherStub = {
  getChurchDbConnection: async (_n: string) => ({ getConnection: async () => fakeConnection }),
};
const dbSwitcherPath = require.resolve('../../utils/dbSwitcher');
require.cache[dbSwitcherPath] = {
  id: dbSwitcherPath, filename: dbSwitcherPath, loaded: true, exports: dbSwitcherStub,
} as any;

// ── templateService stub ─────────────────────────────────────────────
type DupCall = { name: string; churchId: number; newName: string; opts: any };
const dupCalls: DupCall[] = [];
let globalTemplatesReturn: any[] = [];
let duplicateReturn: any = { filePath: '/x/y/z.tsx' };
let duplicateThrows: Error | null = null;
let getTemplatesForChurchReturn: any[] = [];

const templateServiceStub = {
  getGlobalTemplates: async () => globalTemplatesReturn,
  duplicateGlobalTemplate: async (name: string, churchId: number, newName: string, opts: any) => {
    dupCalls.push({ name, churchId, newName, opts });
    if (duplicateThrows) throw duplicateThrows;
    return duplicateReturn;
  },
  getTemplatesForChurch: async (_id: number) => getTemplatesForChurchReturn,
};
const templateServicePath = require.resolve('../templateService');
require.cache[templateServicePath] = {
  id: templateServicePath, filename: templateServicePath, loaded: true,
  exports: templateServiceStub,
} as any;

function resetAll() {
  queryLog.length = 0;
  routes = [];
  dupCalls.length = 0;
  globalTemplatesReturn = [];
  duplicateReturn = { filePath: '/x/y/z.tsx' };
  duplicateThrows = null;
  getTemplatesForChurchReturn = [];
}

const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const svc = require('../churchSetupService');

async function main() {

// ============================================================================
// getDefaultFields
// ============================================================================
console.log('\n── getDefaultFields ──────────────────────────────────────');

{
  const b = svc.getDefaultFields('baptism');
  assertEq(b.length, 8, 'baptism has 8 fields');
  assert(b.some((f: any) => f.field === 'first_name' && f.required), 'baptism first_name required');
  assert(b.some((f: any) => f.field === 'date_of_baptism' && f.type === 'date'), 'date_of_baptism is date type');
  assert(b.some((f: any) => f.field === 'godparents'), 'has godparents');

  const m = svc.getDefaultFields('marriage');
  assertEq(m.length, 7, 'marriage has 7 fields');
  assert(m.some((f: any) => f.field === 'groom_name' && f.required), 'groom_name required');
  assert(m.some((f: any) => f.field === 'bride_name'), 'has bride_name');

  const f = svc.getDefaultFields('funeral');
  assertEq(f.length, 6, 'funeral has 6 fields');
  assert(f.some((x: any) => x.field === 'deceased_name' && x.required), 'deceased_name required');
  assert(f.some((x: any) => x.field === 'age_at_death' && x.type === 'number'), 'age_at_death is number type');

  assertEq(svc.getDefaultFields('unknown'), [], 'unknown type → []');
}

// ============================================================================
// getNextSteps
// ============================================================================
console.log('\n── getNextSteps ──────────────────────────────────────────');

{
  // Templates not set up, not complete
  let steps = svc.getNextSteps({ templates_setup: false, setup_step: 'pending' });
  assertEq(steps.length, 1, '1 step when templates not set');
  assertEq(steps[0].step, 'setup_templates', 'setup_templates step');
  assertEq(steps[0].optional, true, 'optional');

  // Templates set up, complete
  steps = svc.getNextSteps({ templates_setup: true, setup_step: 'complete' });
  assertEq(steps.length, 1, '1 step when complete');
  assertEq(steps[0].step, 'start_using', 'start_using step');

  // Templates not set up, complete → 2 steps
  steps = svc.getNextSteps({ templates_setup: false, setup_step: 'complete' });
  assertEq(steps.length, 2, '2 steps when incomplete + complete');
}

// ============================================================================
// generateViewerComponentCode
// ============================================================================
console.log('\n── generateViewerComponentCode ───────────────────────────');

{
  const fields = [
    { field: 'first_name', label: 'First Name' },
    { field: 'last_name', label: 'Last Name' },
  ];
  const code = svc.generateViewerComponentCode('BaptismRecordViewer', fields, 'baptism', 'orthodox_traditional');
  assert(typeof code === 'string', 'returns string');
  assert(code.includes('const BaptismRecordViewer'), 'uses template name');
  assert(code.includes("field: 'first_name'"), 'includes field 1');
  assert(code.includes("field: 'last_name'"), 'includes field 2');
  assert(code.includes("headerName: 'First Name'"), 'includes label 1');
  assert(code.includes('/api/church/${churchId}/baptism-records'), 'api path has recordType');
  assert(code.includes('<h2>Baptism Records'), 'capitalized heading');
  assert(code.includes('export default BaptismRecordViewer'), 'export default');
  assert(code.includes('pagination: true'), 'has pagination');
}

// ============================================================================
// generateEditorComponentCode
// ============================================================================
console.log('\n── generateEditorComponentCode ───────────────────────────');

{
  const fields = [
    { field: 'groom_name', label: 'Groom' },
    { field: 'bride_name', label: 'Bride' },
  ];
  const code = svc.generateEditorComponentCode('MarriageRecordEditor', fields, 'marriage', 'orthodox_traditional');
  assert(code.includes('const MarriageRecordEditor'), 'uses template name');
  assert(code.includes("field: 'groom_name'"), 'groom_name field');
  assert(code.includes("field: 'bride_name'"), 'bride_name field');
  assert(code.includes('editable: !isLocked'), 'editable toggle');
  assert(code.includes('Add New Marriage Record'), 'add button for marriage');
  assert(code.includes('export default MarriageRecordEditor'), 'export default');
}

// ============================================================================
// getChurchSetupStatus
// ============================================================================
console.log('\n── getChurchSetupStatus ──────────────────────────────────');

resetAll();
routes = [
  { match: /SELECT \* FROM churches WHERE id = \?/i, handler: () => [[]] },
];
{
  const r = await svc.getChurchSetupStatus(99);
  assertEq(r, null, 'not found → null');
}

resetAll();
routes = [
  {
    match: /SELECT \* FROM churches WHERE id = \?/i,
    handler: () => [[{
      id: 46, name: 'Holy Trinity',
      setup_status: '{"templates_setup":true,"setup_step":"complete"}',
    }]],
  },
];
{
  const r = await svc.getChurchSetupStatus(46);
  assertEq(r.id, 46, 'id returned');
  assertEq(r.setup_status.templates_setup, true, 'JSON parsed');
  assertEq(r.setup_status.setup_step, 'complete', 'setup_step parsed');
}

resetAll();
routes = [
  {
    match: /SELECT \* FROM churches WHERE id = \?/i,
    handler: () => [[{ id: 46, name: 'X', setup_status: null }]],
  },
];
{
  const r = await svc.getChurchSetupStatus(46);
  assertEq(r.setup_status, {}, 'null setup_status → {}');
}

// ============================================================================
// updateChurchSetupStatus
// ============================================================================
console.log('\n── updateChurchSetupStatus ───────────────────────────────');

resetAll();
{
  let capturedSql = '';
  let capturedParams: any[] = [];
  routes = [
    {
      match: /UPDATE churches SET setup_status/i,
      handler: (params, sql) => {
        capturedSql = sql;
        capturedParams = params;
        return [{ affectedRows: 1 }];
      },
    },
  ];
  await svc.updateChurchSetupStatus(fakeConnection, 46, { templates_setup: true });
  assert(/UPDATE churches SET setup_status/.test(capturedSql), 'updates setup_status');
  assert(/updated_at = NOW\(\)/.test(capturedSql), 'sets updated_at');
  const parsed = JSON.parse(capturedParams[0]);
  assertEq(parsed.templates_setup, true, 'status JSON-stringified');
  assertEq(capturedParams[1], 46, 'church id param');
}

// ============================================================================
// setupChurchTemplates
// ============================================================================
console.log('\n── setupChurchTemplates ──────────────────────────────────');

// Global-only, no autoSetup
resetAll();
globalTemplatesReturn = [
  { name: 'BaptismGlobal', record_type: 'baptism' },
  { name: 'MarriageGlobal', record_type: 'marriage' },
  { name: 'OtherGlobal', record_type: 'other' },
];
{
  const r = await svc.setupChurchTemplates(46, {});
  assertEq(r.global_templates_available.length, 2, '2 matching templates (excludes "other")');
  assertEq(r.duplicated_templates.length, 0, 'no duplicates without autoSetup');
  assertEq(r.custom_templates.length, 0, 'no custom');
  assertEq(r.generated_components.length, 0, 'no components');
}

// autoSetupStandard duplicates matching record types
resetAll();
globalTemplatesReturn = [
  { name: 'BaptismGlobal', record_type: 'baptism' },
  { name: 'MarriageGlobal', record_type: 'marriage' },
  { name: 'FuneralGlobal', record_type: 'funeral' },
];
{
  const r = await svc.setupChurchTemplates(46, { autoSetupStandard: true });
  assertEq(r.duplicated_templates.length, 3, '3 duplicates');
  assertEq(dupCalls.length, 3, '3 duplicate calls');
  assertEq(dupCalls[0].name, 'BaptismGlobal', 'first = BaptismGlobal');
  assertEq(dupCalls[0].churchId, 46, 'churchId = 46');
  assertEq(dupCalls[0].newName, 'BaptismGlobal_Church46', 'new name format');
  assertEq(dupCalls[0].opts.auto_generated, true, 'auto_generated flag');
  assert(/baptism template/.test(dupCalls[0].opts.description), 'description mentions baptism');
}

// Custom recordTypes filter
resetAll();
globalTemplatesReturn = [
  { name: 'BaptismGlobal', record_type: 'baptism' },
  { name: 'MarriageGlobal', record_type: 'marriage' },
  { name: 'FuneralGlobal', record_type: 'funeral' },
];
{
  const r = await svc.setupChurchTemplates(46, {
    autoSetupStandard: true,
    recordTypes: ['baptism'],
  });
  assertEq(r.duplicated_templates.length, 1, 'only 1 for filtered recordTypes');
  assertEq(dupCalls.length, 1, '1 dup call');
  assertEq(dupCalls[0].name, 'BaptismGlobal', 'only baptism duplicated');
}

// includeGlobalTemplates = false → skip global lookup
resetAll();
globalTemplatesReturn = [{ name: 'BaptismGlobal', record_type: 'baptism' }];
{
  const r = await svc.setupChurchTemplates(46, { includeGlobalTemplates: false });
  assertEq(r.global_templates_available.length, 0, 'global skipped');
}

// Error during duplicate → thrown wrapped
resetAll();
globalTemplatesReturn = [{ name: 'BaptismGlobal', record_type: 'baptism' }];
duplicateThrows = new Error('db failure');
quiet();
await assertThrows(
  () => svc.setupChurchTemplates(46, { autoSetupStandard: true }),
  /Template setup failed: db failure/,
  'duplicate error wrapped'
);
loud();

// ============================================================================
// completeTemplateSetup
// ============================================================================
console.log('\n── completeTemplateSetup ─────────────────────────────────');

// Church not found
resetAll();
routes = [
  { match: /SELECT \* FROM churches WHERE id = \?/i, handler: () => [[]] },
];
quiet();
await assertThrows(
  () => svc.completeTemplateSetup(99),
  /Church not found/,
  'not found throws'
);
loud();

// Already setup
resetAll();
routes = [
  {
    match: /SELECT \* FROM churches WHERE id = \?/i,
    handler: () => [[{
      id: 46,
      setup_status: '{"templates_setup":true}',
    }]],
  },
];
getTemplatesForChurchReturn = [{ id: 1, name: 'X' }];
{
  const r = await svc.completeTemplateSetup(46);
  assertEq(r.success, true, 'success');
  assert(/already set up/i.test(r.message), 'already set up message');
  assertEq(r.templates.length, 1, 'returns existing templates');
}

// Happy path: setup + status update
resetAll();
routes = [
  {
    match: /SELECT \* FROM churches WHERE id = \?/i,
    handler: () => [[{
      id: 46,
      setup_status: '{"templates_setup":false,"setup_step":"pending"}',
    }]],
  },
  {
    match: /UPDATE churches SET setup_status/i,
    handler: () => [{ affectedRows: 1 }],
  },
];
globalTemplatesReturn = [{ name: 'BaptismGlobal', record_type: 'baptism' }];
{
  const r = await svc.completeTemplateSetup(46, { autoSetupStandard: true });
  assertEq(r.success, true, 'success');
  assert(/completed successfully/i.test(r.message), 'completed message');
  assertEq(r.templates.duplicated_templates.length, 1, 'duplicated baptism');
  // Final status update should have been called
  const updateCalls = queryLog.filter(q => /UPDATE churches SET setup_status/.test(q.sql));
  assert(updateCalls.length >= 1, 'status update called');
  const lastUpdate = updateCalls[updateCalls.length - 1];
  const statusObj = JSON.parse(lastUpdate.params[0]);
  assertEq(statusObj.templates_setup, true, 'status marked templates_setup=true');
  assertEq(statusObj.setup_step, 'complete', 'setup_step=complete');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
