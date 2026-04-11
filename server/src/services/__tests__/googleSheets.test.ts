#!/usr/bin/env npx tsx
/**
 * Unit tests for services/googleSheets.ts (OMD-1189)
 *
 * Google Sheets API wrapper for agent task tracking. We stub `googleapis`
 * via require.cache before requiring the SUT.
 *
 * Coverage:
 *   - init: calls GoogleAuth, caches sheets client, idempotent
 *   - ensureTasksSheet: skips when sheet present; creates sheet + headers
 *     when absent
 *   - logAgentTask: appends row; parses row number from updatedRange;
 *     defaults optional fields to ''
 *   - markTaskCompleteByDescription: bottom-up search; skips COMPLETE/FAILED;
 *     returns false when not found; writes D column (status) + G column (notes)
 *   - getAllTasks: skips header row; defaults missing cells
 *   - syncFromMarkdown: parses [ ]/[x] checkboxes; adds new, updates existing
 *
 * Run: npx tsx server/src/services/__tests__/googleSheets.test.ts
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

// ── googleapis stub ──────────────────────────────────────────────────

type ApiCall = { method: string; args: any };
const apiCalls: ApiCall[] = [];

let getResponse: any = {
  data: { sheets: [{ properties: { title: 'Tasks' } }] }, // sheet exists by default
};
let batchUpdateResponse: any = { data: {} };
let valuesUpdateResponse: any = { data: {} };
let valuesAppendResponse: any = { data: { updates: { updatedRange: 'Tasks!A42:G42' } } };
let valuesGetResponse: any = {
  data: {
    values: [
      ['Timestamp', 'Agent', 'Description', 'Status', 'Branch', 'Commit SHA', 'Notes'],
    ],
  },
};
let valuesBatchUpdateResponse: any = { data: {} };

let authGetClientCalls = 0;
let sheetsFactoryCalls = 0;

const sheetsClient = {
  spreadsheets: {
    get: async (args: any) => {
      apiCalls.push({ method: 'spreadsheets.get', args });
      return getResponse;
    },
    batchUpdate: async (args: any) => {
      apiCalls.push({ method: 'spreadsheets.batchUpdate', args });
      return batchUpdateResponse;
    },
    values: {
      get: async (args: any) => {
        apiCalls.push({ method: 'values.get', args });
        return valuesGetResponse;
      },
      update: async (args: any) => {
        apiCalls.push({ method: 'values.update', args });
        return valuesUpdateResponse;
      },
      append: async (args: any) => {
        apiCalls.push({ method: 'values.append', args });
        return valuesAppendResponse;
      },
      batchUpdate: async (args: any) => {
        apiCalls.push({ method: 'values.batchUpdate', args });
        return valuesBatchUpdateResponse;
      },
    },
  },
};

const googleStub = {
  auth: {
    GoogleAuth: class {
      constructor(opts: any) {
        apiCalls.push({ method: 'GoogleAuth.new', args: opts });
      }
      async getClient() {
        authGetClientCalls++;
        return { __mockAuthClient: true };
      }
    },
  },
  sheets: (opts: any) => {
    sheetsFactoryCalls++;
    apiCalls.push({ method: 'google.sheets', args: opts });
    return sheetsClient;
  },
};

const googleapisStub: any = { google: googleStub, default: { google: googleStub } };

function stubModule(relative: string, exports: any) {
  try {
    const p = require.resolve(relative);
    require.cache[p] = { id: p, filename: p, loaded: true, exports } as any;
  } catch {}
}
stubModule('googleapis', googleapisStub);

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// ── Require SUT ──────────────────────────────────────────────────────
const { googleSheetsService } = require('../googleSheets');

function resetApiCalls() {
  apiCalls.length = 0;
}

function resetInit() {
  // Force re-init by clearing singleton state
  (googleSheetsService as any).initialized = false;
  (googleSheetsService as any).sheets = null;
  authGetClientCalls = 0;
  sheetsFactoryCalls = 0;
}

async function main() {

// ============================================================================
// init — first call loads sheets client
// ============================================================================
console.log('\n── init ──────────────────────────────────────────────────');

resetInit();
resetApiCalls();
quiet();
await googleSheetsService.init();
loud();
assertEq(authGetClientCalls, 1, 'authClient loaded once');
assertEq(sheetsFactoryCalls, 1, 'sheets() factory called once');
assert(apiCalls.some(c => c.method === 'GoogleAuth.new'), 'GoogleAuth constructed');
const authCall = apiCalls.find(c => c.method === 'GoogleAuth.new')!;
assert(authCall.args.keyFile.includes('agenttasks'), 'credentials keyFile path');
assertEq(authCall.args.scopes, ['https://www.googleapis.com/auth/spreadsheets'], 'scopes');

// Second init is a no-op
resetApiCalls();
quiet();
await googleSheetsService.init();
loud();
assertEq(authGetClientCalls, 1, 'init idempotent (no new getClient call)');
assertEq(apiCalls.length, 0, 'no API calls on second init');

// ============================================================================
// ensureTasksSheet — sheet already exists
// ============================================================================
console.log('\n── ensureTasksSheet: exists ──────────────────────────────');

resetApiCalls();
getResponse = { data: { sheets: [{ properties: { title: 'Tasks' } }] } };
quiet();
await googleSheetsService.ensureTasksSheet();
loud();
const getCalls = apiCalls.filter(c => c.method === 'spreadsheets.get');
assertEq(getCalls.length, 1, 'spreadsheets.get called');
const batchCalls = apiCalls.filter(c => c.method === 'spreadsheets.batchUpdate');
assertEq(batchCalls.length, 0, 'no batchUpdate when sheet exists');

// ============================================================================
// ensureTasksSheet — sheet missing → create + headers
// ============================================================================
console.log('\n── ensureTasksSheet: missing ─────────────────────────────');

resetApiCalls();
getResponse = { data: { sheets: [{ properties: { title: 'Other' } }] } };
quiet();
await googleSheetsService.ensureTasksSheet();
loud();
const batchCreate = apiCalls.find(c => c.method === 'spreadsheets.batchUpdate');
assert(batchCreate !== undefined, 'batchUpdate called to create');
assert(
  batchCreate.args.requestBody.requests[0].addSheet.properties.title === 'Tasks',
  'addSheet with title=Tasks'
);
const headerUpdate = apiCalls.find(c => c.method === 'values.update');
assert(headerUpdate !== undefined, 'values.update for headers');
assertEq(headerUpdate.args.range, 'Tasks!A1:G1', 'header range');
assertEq(
  headerUpdate.args.requestBody.values,
  [['Timestamp', 'Agent', 'Description', 'Status', 'Branch', 'Commit SHA', 'Notes']],
  'header row'
);

// Restore default
getResponse = { data: { sheets: [{ properties: { title: 'Tasks' } }] } };

// ============================================================================
// logAgentTask — appends row, extracts row number
// ============================================================================
console.log('\n── logAgentTask ──────────────────────────────────────────');

resetApiCalls();
valuesAppendResponse = { data: { updates: { updatedRange: 'Tasks!A17:G17' } } };
quiet();
{
  const row = await googleSheetsService.logAgentTask({
    agent: 'claude_cli',
    description: 'Do the thing',
    status: 'IN_PROGRESS',
    branch: 'feature/x',
    commitSha: 'abc123',
    notes: 'testing',
  });
  loud();
  assertEq(row, 17, 'returns row number parsed from updatedRange');
  const append = apiCalls.find(c => c.method === 'values.append');
  assert(append !== undefined, 'values.append called');
  assertEq(append.args.range, 'Tasks!A:G', 'append range');
  assertEq(append.args.valueInputOption, 'RAW', 'valueInputOption RAW');
  assertEq(append.args.insertDataOption, 'INSERT_ROWS', 'INSERT_ROWS');
  const vals = append.args.requestBody.values[0];
  assert(typeof vals[0] === 'string' && vals[0].length > 0, 'timestamp set');
  assertEq(vals[1], 'claude_cli', 'agent column');
  assertEq(vals[2], 'Do the thing', 'description column');
  assertEq(vals[3], 'IN_PROGRESS', 'status column');
  assertEq(vals[4], 'feature/x', 'branch column');
  assertEq(vals[5], 'abc123', 'commitSha column');
  assertEq(vals[6], 'testing', 'notes column');
}

// Defaults for optional fields
resetApiCalls();
valuesAppendResponse = { data: { updates: { updatedRange: 'Tasks!A5:G5' } } };
quiet();
{
  await googleSheetsService.logAgentTask({
    agent: 'cursor',
    description: 'Minimal task',
    status: 'PENDING',
  });
  loud();
  const append = apiCalls.find(c => c.method === 'values.append')!;
  const vals = append.args.requestBody.values[0];
  assertEq(vals[4], '', 'default branch empty');
  assertEq(vals[5], '', 'default commitSha empty');
  assertEq(vals[6], '', 'default notes empty');
}

// Missing updatedRange → -1
resetApiCalls();
valuesAppendResponse = { data: { updates: {} } };
quiet();
{
  const row = await googleSheetsService.logAgentTask({
    agent: 'x',
    description: 'y',
    status: 'PENDING',
  });
  loud();
  assertEq(row, -1, 'missing updatedRange → -1');
}

// ============================================================================
// markTaskCompleteByDescription — found + updated
// ============================================================================
console.log('\n── markTaskCompleteByDescription: found ──────────────────');

resetApiCalls();
valuesGetResponse = {
  data: {
    values: [
      ['Timestamp', 'Agent', 'Description', 'Status', 'Branch', 'Commit SHA', 'Notes'],
      ['2026-01-01', 'claude', 'Task A', 'IN_PROGRESS', '', '', ''],
      ['2026-01-02', 'claude', 'Task B', 'PENDING', '', '', ''],
      ['2026-01-03', 'claude', 'Task A', 'COMPLETE', '', '', ''], // should be skipped (COMPLETE)
      ['2026-01-04', 'claude', 'Task C', 'IN_PROGRESS', '', '', ''],
    ],
  },
};
quiet();
{
  const r = await googleSheetsService.markTaskCompleteByDescription('Task A', 'COMPLETE', 'done!');
  loud();
  assertEq(r, true, 'returns true when found');
  const bu = apiCalls.find(c => c.method === 'values.batchUpdate')!;
  assert(bu !== undefined, 'values.batchUpdate called');
  assertEq(bu.args.requestBody.valueInputOption, 'RAW', 'RAW');
  const data = bu.args.requestBody.data;
  assertEq(data.length, 2, 'status + notes updates');
  assertEq(data[0].range, 'Tasks!D2', 'status col D row 2 (1-indexed, skip header)');
  assertEq(data[0].values, [['COMPLETE']], 'status value');
  assertEq(data[1].range, 'Tasks!G2', 'notes col G row 2');
  assertEq(data[1].values, [['done!']], 'notes value');
}

// Only status (no notes)
resetApiCalls();
quiet();
{
  const r = await googleSheetsService.markTaskCompleteByDescription('Task B', 'FAILED');
  loud();
  assertEq(r, true, 'returns true');
  const bu = apiCalls.find(c => c.method === 'values.batchUpdate')!;
  assertEq(bu.args.requestBody.data.length, 1, 'only status update');
  assertEq(bu.args.requestBody.data[0].range, 'Tasks!D3', 'row 3 (Task B)');
  assertEq(bu.args.requestBody.data[0].values, [['FAILED']], 'FAILED status');
}

// Not found (all completed or no match)
resetApiCalls();
valuesGetResponse = {
  data: {
    values: [
      ['Timestamp', 'Agent', 'Description', 'Status', 'Branch', 'Commit SHA', 'Notes'],
      ['2026-01-01', 'claude', 'Task A', 'COMPLETE', '', '', ''],
    ],
  },
};
quiet();
{
  const r = await googleSheetsService.markTaskCompleteByDescription('Task A');
  loud();
  assertEq(r, false, 'already COMPLETE → false');
  const bu = apiCalls.find(c => c.method === 'values.batchUpdate');
  assert(bu === undefined, 'no update when not found');
}

// No matching description at all
resetApiCalls();
quiet();
{
  const r = await googleSheetsService.markTaskCompleteByDescription('Missing Task');
  loud();
  assertEq(r, false, 'unknown description → false');
}

// ============================================================================
// getAllTasks
// ============================================================================
console.log('\n── getAllTasks ───────────────────────────────────────────');

resetApiCalls();
valuesGetResponse = {
  data: {
    values: [
      ['Timestamp', 'Agent', 'Description', 'Status', 'Branch', 'Commit SHA', 'Notes'],
      ['2026-01-01', 'claude', 'Task A', 'IN_PROGRESS', 'br-a', 'sha-a', 'n-a'],
      ['2026-01-02', 'cursor', 'Task B', 'COMPLETE', '', '', ''],
      ['2026-01-03', 'windsurf', 'Task C'],
    ],
  },
};
quiet();
{
  const tasks = await googleSheetsService.getAllTasks();
  loud();
  assertEq(tasks.length, 3, '3 tasks returned (header skipped)');
  assertEq(tasks[0].timestamp, '2026-01-01', 'task0 timestamp');
  assertEq(tasks[0].agent, 'claude', 'task0 agent');
  assertEq(tasks[0].description, 'Task A', 'task0 description');
  assertEq(tasks[0].status, 'IN_PROGRESS', 'task0 status');
  assertEq(tasks[0].branch, 'br-a', 'task0 branch');
  assertEq(tasks[0].commitSha, 'sha-a', 'task0 sha');
  assertEq(tasks[0].notes, 'n-a', 'task0 notes');
  assertEq(tasks[1].status, 'COMPLETE', 'task1 status');
  assertEq(tasks[1].branch, undefined, 'task1 empty branch → undefined');
  assertEq(tasks[1].notes, undefined, 'task1 empty notes → undefined');
  assertEq(tasks[2].status, 'PENDING', 'task2 missing status → PENDING default');
  assertEq(tasks[2].branch, undefined, 'task2 missing branch → undefined');
}

// Empty sheet
resetApiCalls();
valuesGetResponse = { data: { values: [] } };
quiet();
{
  const tasks = await googleSheetsService.getAllTasks();
  loud();
  assertEq(tasks.length, 0, 'empty sheet → empty array');
}

// Missing values field
resetApiCalls();
valuesGetResponse = { data: {} };
quiet();
{
  const tasks = await googleSheetsService.getAllTasks();
  loud();
  assertEq(tasks.length, 0, 'missing values → empty array');
}

// ============================================================================
// syncFromMarkdown
// ============================================================================
console.log('\n── syncFromMarkdown ──────────────────────────────────────');

// Set existing tasks to contain "Existing Task" only
valuesGetResponse = {
  data: {
    values: [
      ['Timestamp', 'Agent', 'Description', 'Status', 'Branch', 'Commit SHA', 'Notes'],
      ['2026-01-01', 'claude', 'Existing Task', 'IN_PROGRESS', '', '', ''],
    ],
  },
};
valuesAppendResponse = { data: { updates: { updatedRange: 'Tasks!A10:G10' } } };

resetApiCalls();

const markdown = `
# Tasks
- [ ] New Pending Task
- [x] New Completed Task
- [x] Existing Task
- [ ] Another New One
`;

quiet();
await googleSheetsService.syncFromMarkdown(markdown, 'sync-agent');
loud();

// Two new tasks should have been appended (New Pending + New Completed + Another New One)
const appendCalls = apiCalls.filter(c => c.method === 'values.append');
assertEq(appendCalls.length, 3, '3 new tasks appended');
// Verify the first is "New Pending Task" with PENDING status
assertEq(appendCalls[0].args.requestBody.values[0][2], 'New Pending Task', 'first append description');
assertEq(appendCalls[0].args.requestBody.values[0][3], 'PENDING', 'first append status PENDING');
assertEq(appendCalls[0].args.requestBody.values[0][1], 'sync-agent', 'agent=sync-agent');
assertEq(appendCalls[1].args.requestBody.values[0][2], 'New Completed Task', 'second append description');
assertEq(appendCalls[1].args.requestBody.values[0][3], 'COMPLETE', 'second append status COMPLETE');
assertEq(appendCalls[2].args.requestBody.values[0][2], 'Another New One', 'third append description');
assertEq(appendCalls[2].args.requestBody.values[0][3], 'PENDING', 'third append status PENDING');

// Existing Task (completed in markdown) → markTaskCompleteByDescription → batchUpdate
const bus = apiCalls.filter(c => c.method === 'values.batchUpdate');
assert(bus.length >= 1, 'batchUpdate for existing completed task');
assert(
  bus.some(c => c.args.requestBody.data.some((d: any) => d.values[0][0] === 'COMPLETE')),
  'existing task marked COMPLETE'
);

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
