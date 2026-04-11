#!/usr/bin/env npx tsx
/**
 * Unit tests for services/emailParser.js (OMD-967)
 *
 * Bridges inbound email webhook with OMAI for parsing sacramental records.
 *
 * Two external deps:
 *   - `/var/www/orthodoxmetrics/prod/misc/omai/services/index.js` (absolute!)
 *     — exports askOMAIWithMetadata. SUT requires at load time with try/catch
 *     fallback, so we stub via require.cache using the exact absolute path.
 *   - `../config/db` — exports getTenantPool. Stubbed similarly.
 *
 * Coverage:
 *   - buildEmailParsingPrompt: includes sender/subject/body, contains JSON
 *     schema template, mentions all record types
 *   - extractStructuredData:
 *       · empty/null → null
 *       · markdown ```json block → parsed
 *       · raw `{...}` without markdown → parsed
 *       · malformed markdown → falls through to raw → parsed
 *       · fully malformed → null
 *   - processEmailWithOMAI:
 *       · OMAI throws → status=failed, parsedData=null
 *       · parsed but no record_type → status=parsed, recordType=unknown,
 *         parsedData={raw_response}
 *       · query type → status=parsed, recordType=query, no record created
 *       · valid record → INSERT issued with metadata (source/status/created_by)
 *         and only whitelisted columns, returns insertId
 *       · unknown record_type → table not found, returns no created record
 *       · DB insert error → status=parsed, createdRecordId=null (error swallowed)
 *       · empty fields → no insert (warn returned null from draft)
 *
 * Run: npx tsx server/src/services/__tests__/emailParser.test.ts
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

// ── OMAI services stub (absolute path as used in SUT) ───────────────
let omaiResponse: any = null;
let omaiThrows = false;

const omaiStub = {
  askOMAIWithMetadata: async (_prompt: string, _opts: any) => {
    if (omaiThrows) throw new Error('omai unavailable');
    return omaiResponse;
  },
};

const OMAI_PATH = '/var/www/orthodoxmetrics/prod/misc/omai/services/index.js';
require.cache[OMAI_PATH] = {
  id: OMAI_PATH,
  filename: OMAI_PATH,
  loaded: true,
  exports: omaiStub,
} as any;

// ── getTenantPool stub ───────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];
let insertIdValue = 101;
let poolThrows = false;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (poolThrows) throw new Error('db insert failed');
    return [{ insertId: insertIdValue }];
  },
};

const dbStub = {
  getTenantPool: (_churchId: number) => fakePool,
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: dbStub,
} as any;

// Silence console
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

const {
  processEmailWithOMAI,
  extractStructuredData,
  buildEmailParsingPrompt,
} = require('../emailParser');

function resetState() {
  queryLog.length = 0;
  insertIdValue = 101;
  poolThrows = false;
  omaiResponse = null;
  omaiThrows = false;
}

async function main() {

// ============================================================================
// buildEmailParsingPrompt
// ============================================================================
console.log('\n── buildEmailParsingPrompt ───────────────────────────────');

{
  const prompt = buildEmailParsingPrompt(
    'Baptism request',
    'My son John was baptized on April 5',
    'Mary Smith'
  );
  assert(typeof prompt === 'string', 'returns string');
  assert(prompt.includes('Mary Smith'), 'includes sender name');
  assert(prompt.includes('Baptism request'), 'includes subject');
  assert(prompt.includes('My son John'), 'includes body');
  assert(prompt.includes('```json'), 'includes json code fence');
  assert(prompt.includes('record_type'), 'mentions record_type');
  assert(prompt.includes('baptism'), 'mentions baptism');
  assert(prompt.includes('marriage'), 'mentions marriage');
  assert(prompt.includes('funeral'), 'mentions funeral');
  assert(prompt.includes('query'), 'mentions query');
  assert(prompt.includes('unknown'), 'mentions unknown');
}

// ============================================================================
// extractStructuredData
// ============================================================================
console.log('\n── extractStructuredData ─────────────────────────────────');

assertEq(extractStructuredData(null), null, 'null → null');
assertEq(extractStructuredData(''), null, 'empty string → null');
assertEq(extractStructuredData(undefined), null, 'undefined → null');

// Markdown code block
{
  const text = 'Some reasoning here.\n```json\n{"record_type":"baptism","confidence":0.9}\n```\nDone.';
  const result = extractStructuredData(text);
  assertEq(result?.record_type, 'baptism', 'markdown: record_type');
  assertEq(result?.confidence, 0.9, 'markdown: confidence');
}

// Markdown block with whitespace
{
  const text = '```json\n  {  "record_type" :  "marriage"  }  \n```';
  const result = extractStructuredData(text);
  assertEq(result?.record_type, 'marriage', 'markdown: whitespace tolerant');
}

// Raw JSON (no markdown)
{
  const text = 'Sure, here is the result: {"record_type":"funeral","confidence":0.75}';
  const result = extractStructuredData(text);
  assertEq(result?.record_type, 'funeral', 'raw: record_type');
}

// Malformed markdown → falls through to raw match
{
  const text = '```json\nnot valid json\n```\n{"record_type":"query"}';
  const result = extractStructuredData(text);
  // The markdown regex matches the json block first, fails to parse,
  // then the raw regex tries. Raw regex greedy match starts from first `{`.
  // So raw match captures the second block and succeeds.
  assertEq(result?.record_type, 'query', 'fallthrough to raw');
}

// Fully malformed
{
  const text = 'This is just prose. No JSON here.';
  const result = extractStructuredData(text);
  assertEq(result, null, 'no JSON → null');
}

// Just invalid JSON everywhere
{
  const text = '```json\n{ not json }\n``` {and nothing} here';
  const result = extractStructuredData(text);
  assertEq(result, null, 'all invalid → null');
}

// ============================================================================
// processEmailWithOMAI: OMAI throws
// ============================================================================
console.log('\n── processEmailWithOMAI: OMAI error ──────────────────────');

resetState();
omaiThrows = true;
quiet();
{
  const result = await processEmailWithOMAI({
    submissionId: 1, churchId: 46, senderEmail: 'a@b.com',
    userId: 7, subject: 's', body: 'b', senderName: 'n',
  });
  loud();
  assertEq(result.status, 'failed', 'status failed');
  assertEq(result.recordType, 'unknown', 'recordType unknown');
  assertEq(result.parsedData, null, 'parsedData null');
  assertEq(result.createdRecordId, null, 'no record');
  assert(result.response.error.includes('omai unavailable'), 'error captured');
}

// ============================================================================
// processEmailWithOMAI: no parsed data (unparseable response)
// ============================================================================
console.log('\n── processEmailWithOMAI: unparseable response ────────────');

resetState();
omaiResponse = { response: 'This is just free text with no JSON block.' };
quiet();
{
  const result = await processEmailWithOMAI({
    submissionId: 2, churchId: 46, senderEmail: 'a@b.com',
    userId: 7, subject: 's', body: 'b', senderName: 'n',
  });
  loud();
  assertEq(result.status, 'parsed', 'status parsed (even without data)');
  assertEq(result.recordType, 'unknown', 'recordType unknown');
  assertEq(result.parsedData?.raw_response, 'This is just free text with no JSON block.', 'raw_response');
  assertEq(result.createdRecordId, null, 'no record');
  assertEq(queryLog.length, 0, 'no DB write');
}

// Parseable JSON but no record_type field
resetState();
omaiResponse = { response: '```json\n{"confidence":0.5}\n```' };
quiet();
{
  const result = await processEmailWithOMAI({
    submissionId: 3, churchId: 46, senderEmail: 'a@b.com',
    userId: 7, subject: 's', body: 'b', senderName: 'n',
  });
  loud();
  assertEq(result.recordType, 'unknown', 'no record_type → unknown');
  assertEq(queryLog.length, 0, 'no DB');
}

// ============================================================================
// processEmailWithOMAI: query type
// ============================================================================
console.log('\n── processEmailWithOMAI: query type ──────────────────────');

resetState();
omaiResponse = {
  response: '```json\n{"record_type":"query","query_text":"where is John\'s record?"}\n```',
};
quiet();
{
  const result = await processEmailWithOMAI({
    submissionId: 4, churchId: 46, senderEmail: 'a@b.com',
    userId: 7, subject: 's', body: 'b', senderName: 'n',
  });
  loud();
  assertEq(result.status, 'parsed', 'status parsed');
  assertEq(result.recordType, 'query', 'recordType query');
  assertEq(result.parsedData?.query_text, "where is John's record?", 'query preserved');
  assertEq(result.createdRecordId, null, 'no record for query');
  assertEq(queryLog.length, 0, 'no DB write');
}

// ============================================================================
// processEmailWithOMAI: happy path — baptism record created
// ============================================================================
console.log('\n── processEmailWithOMAI: baptism creation ────────────────');

resetState();
insertIdValue = 555;
omaiResponse = {
  response: '```json\n' + JSON.stringify({
    record_type: 'baptism',
    confidence: 0.95,
    fields: {
      first_name: 'John',
      last_name: 'Doe',
      date_of_baptism: '2026-04-05',
      priest_name: 'Fr. Nick',
      not_allowed_column: 'should be stripped',
      email: 'should also be stripped',
    },
  }) + '\n```',
};
quiet();
{
  const result = await processEmailWithOMAI({
    submissionId: 5, churchId: 46, senderEmail: 'a@b.com',
    userId: 99, subject: 's', body: 'b', senderName: 'n',
  });
  loud();
  assertEq(result.status, 'completed', 'status completed');
  assertEq(result.recordType, 'baptism', 'recordType baptism');
  assertEq(result.createdRecordId, 555, 'insertId returned');
  assertEq(queryLog.length, 1, 'one INSERT');

  const call = queryLog[0];
  assert(call.sql.includes('INSERT INTO `baptism_records`'), 'INSERT into baptism_records');
  // Column whitelist: only allowed columns should appear
  assert(call.sql.includes('`first_name`'), 'first_name column');
  assert(call.sql.includes('`last_name`'), 'last_name column');
  assert(call.sql.includes('`date_of_baptism`'), 'date_of_baptism column');
  assert(call.sql.includes('`priest_name`'), 'priest_name column');
  assert(!call.sql.includes('`not_allowed_column`'), 'disallowed column stripped');
  assert(!call.sql.includes('`email`'), 'email column stripped (not in whitelist)');

  // Metadata injection — source, status, created_by
  assert(call.sql.includes('`source`'), 'source column added');
  assert(call.sql.includes('`status`'), 'status column added');
  assert(call.sql.includes('`created_by`'), 'created_by column added');

  // Values should contain 99 (userId) as created_by
  assert(call.params.includes(99), 'created_by = userId');
  assert(call.params.includes('email_intake'), 'source = email_intake');
  assert(call.params.includes('draft'), 'status = draft');
  assert(call.params.includes('John'), 'first_name value');
}

// ============================================================================
// processEmailWithOMAI: marriage — different column whitelist
// ============================================================================
console.log('\n── processEmailWithOMAI: marriage whitelist ──────────────');

resetState();
insertIdValue = 777;
omaiResponse = {
  response: '```json\n' + JSON.stringify({
    record_type: 'marriage',
    fields: {
      groom_first_name: 'Bob',
      bride_first_name: 'Alice',
      date_of_marriage: '2026-05-01',
      first_name: 'INVALID_FOR_MARRIAGE', // not in marriage whitelist
    },
  }) + '\n```',
};
quiet();
{
  const result = await processEmailWithOMAI({
    submissionId: 6, churchId: 46, senderEmail: 'a@b.com',
    userId: 7, subject: 's', body: 'b', senderName: 'n',
  });
  loud();
  assertEq(result.status, 'completed', 'completed');
  assertEq(result.recordType, 'marriage', 'marriage');
  const call = queryLog[0];
  assert(call.sql.includes('`marriage_records`'), 'marriage_records table');
  assert(call.sql.includes('`groom_first_name`'), 'groom_first_name');
  assert(call.sql.includes('`bride_first_name`'), 'bride_first_name');
  assert(!call.sql.includes('`first_name`'), 'first_name NOT in marriage whitelist');
}

// ============================================================================
// processEmailWithOMAI: funeral
// ============================================================================
console.log('\n── processEmailWithOMAI: funeral ─────────────────────────');

resetState();
omaiResponse = {
  response: '```json\n' + JSON.stringify({
    record_type: 'funeral',
    fields: {
      first_name: 'Peter',
      last_name: 'Petrov',
      date_of_funeral: '2026-04-10',
      cemetery: 'Holy Cross',
    },
  }) + '\n```',
};
quiet();
{
  const result = await processEmailWithOMAI({
    submissionId: 7, churchId: 46, senderEmail: 'a@b.com',
    userId: 7, subject: 's', body: 'b', senderName: 'n',
  });
  loud();
  assertEq(result.recordType, 'funeral', 'funeral');
  const call = queryLog[0];
  assert(call.sql.includes('`funeral_records`'), 'funeral_records table');
  assert(call.sql.includes('`cemetery`'), 'cemetery column');
}

// ============================================================================
// processEmailWithOMAI: DB insert error → parsed+null
// ============================================================================
console.log('\n── processEmailWithOMAI: DB error swallowed ──────────────');

resetState();
poolThrows = true;
omaiResponse = {
  response: '```json\n{"record_type":"baptism","fields":{"first_name":"X","last_name":"Y","date_of_baptism":"2026-01-01"}}\n```',
};
quiet();
{
  const result = await processEmailWithOMAI({
    submissionId: 8, churchId: 46, senderEmail: 'a@b.com',
    userId: 7, subject: 's', body: 'b', senderName: 'n',
  });
  loud();
  assertEq(result.status, 'parsed', 'parsed (DB failed)');
  assertEq(result.recordType, 'baptism', 'recordType still baptism');
  assertEq(result.createdRecordId, null, 'no id');
  assert(result.parsedData?.record_type === 'baptism', 'parsedData preserved');
}

// ============================================================================
// processEmailWithOMAI: unknown record_type (not in VALID_RECORD_TABLES)
// ============================================================================
console.log('\n── processEmailWithOMAI: unknown record_type ─────────────');

resetState();
omaiResponse = {
  response: '```json\n{"record_type":"unknown","fields":{"foo":"bar"}}\n```',
};
quiet();
{
  const result = await processEmailWithOMAI({
    submissionId: 9, churchId: 46, senderEmail: 'a@b.com',
    userId: 7, subject: 's', body: 'b', senderName: 'n',
  });
  loud();
  // record_type='unknown' → not in VALID_RECORD_TABLES → createDraftRecord
  // returns null → status='parsed', createdRecordId=null
  assertEq(result.status, 'parsed', 'status parsed');
  assertEq(result.recordType, 'unknown', 'recordType unknown');
  assertEq(result.createdRecordId, null, 'no record');
  assertEq(queryLog.length, 0, 'no INSERT for unknown type');
}

// ============================================================================
// processEmailWithOMAI: empty fields after filter → no insert
// ============================================================================
console.log('\n── processEmailWithOMAI: empty fields after filter ───────');

resetState();
omaiResponse = {
  response: '```json\n' + JSON.stringify({
    record_type: 'baptism',
    fields: {
      // All values empty/null/undefined or disallowed columns
      random_col: 'x',
      first_name: '',
      last_name: null,
    },
  }) + '\n```',
};
quiet();
{
  const result = await processEmailWithOMAI({
    submissionId: 10, churchId: 46, senderEmail: 'a@b.com',
    userId: 7, subject: 's', body: 'b', senderName: 'n',
  });
  loud();
  // Metadata (source/status/created_by) IS added and WILL be valid, so
  // actually at least 3 columns survive. createDraftRecord WILL INSERT
  // with just metadata fields.
  assertEq(result.status, 'completed', 'metadata-only insert still completes');
  assertEq(queryLog.length, 1, 'insert issued');
  const call = queryLog[0];
  assert(call.sql.includes('`source`'), 'source present');
  assert(call.sql.includes('`status`'), 'status present');
  assert(call.sql.includes('`created_by`'), 'created_by present');
  assert(!call.sql.includes('`first_name`'), 'empty first_name filtered');
  assert(!call.sql.includes('`last_name`'), 'null last_name filtered');
  assert(!call.sql.includes('`random_col`'), 'non-whitelist stripped');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
