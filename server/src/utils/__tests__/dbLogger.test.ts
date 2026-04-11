#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/dbLogger.js (OMD-962)
 *
 * DatabaseLogger singleton that writes to om_logging_db.errors with
 * hash-based deduplication and a file fallback. The SUT creates a real
 * mysql.createPool at module load, so we stub mysql2/promise via
 * require.cache BEFORE loading the SUT.
 *
 * Stubs:
 *   - mysql2/promise.createPool → fake pool capturing {sql, params}
 *   - fs.promises → in-memory file map (for fallback writes)
 *   - ../services/websocketService → no-op broadcast
 *
 * Coverage:
 *   - module exports           dbLogger + convenience functions
 *   - initializeDatabase       sets isInitialized; handles missing
 *                              table gracefully
 *   - log() → writeToDatabase  new entry: INSERT; dedup: UPDATE
 *                              occurrences; INSERT into error_events
 *   - typeMapping              source='frontend' → type=frontend,
 *                              'browser' → frontend, unknown → backend
 *   - message sanitization     strips <script> tags
 *   - meta JSON handling       stringified in entry; parsed into
 *                              error_events additional_context
 *   - fallback path            writeToDatabase throws → file fallback
 *                              + re-buffered
 *   - convenience methods      info/warn/error/debug/success map levels
 *   - migrateFromWinston       forwards level + source + meta
 *   - getLogs                  filter SQL construction (level single/
 *                              multi, source, service/source_component,
 *                              startDate/endDate, limit/offset)
 *   - cleanupOldLogs           DELETE with cutoff; returns affectedRows
 *   - writeToFallbackFile      mkdir + appendFile; swallows errors
 *   - logToConsole             color per level; routes ERROR to
 *                              console.error, WARN to console.warn
 *
 * Run from server/: npx tsx src/utils/__tests__/dbLogger.test.ts
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

// ── mysql2/promise stub (install BEFORE loading SUT) ────────────────
type Query = { sql: string; params: any[] };
const queries: Query[] = [];
let selectExistsRows: any[] = [];
let insertId = 100;
let insertRows = 1;
let throwOnSqlMatch: RegExp | null = null;
let initThrows = false;

function resetDb() {
  queries.length = 0;
  selectExistsRows = [];
  insertId = 100;
  insertRows = 1;
  throwOnSqlMatch = null;
  initThrows = false;
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queries.push({ sql, params });
    if (throwOnSqlMatch && throwOnSqlMatch.test(sql)) {
      throw new Error('forced query failure');
    }
    // SELECT 1 FROM errors LIMIT 1 during init
    if (/SELECT 1 FROM errors/i.test(sql)) {
      if (initThrows) throw new Error('no table');
      return [[{ '1': 1 }]];
    }
    // SELECT existing by hash
    if (/FROM errors WHERE hash/i.test(sql)) {
      return [selectExistsRows];
    }
    // SELECT getLogs
    if (/FROM errors WHERE 1=1/i.test(sql)) {
      return [[
        {
          id: 1, hash: 'abc', type: 'backend', source: 'server',
          message: 'hi', first_seen: new Date(), last_seen: new Date(),
          occurrences: 1, status: 'open', severity: 'low',
          level: 'INFO', origin: 'server', source_component: 'svc',
          auto_tracked: false, timestamp: new Date(),
        },
      ]];
    }
    // DELETE
    if (/DELETE FROM errors/i.test(sql)) {
      return [{ affectedRows: 7 }];
    }
    // UPDATE
    if (/UPDATE errors/i.test(sql)) {
      return [{ affectedRows: 1 }];
    }
    // INSERT INTO errors
    if (/INSERT INTO errors/i.test(sql)) {
      return [{ insertId, affectedRows: insertRows }];
    }
    // INSERT INTO error_events
    if (/INSERT INTO error_events/i.test(sql)) {
      return [{ insertId: insertId + 1, affectedRows: 1 }];
    }
    return [[]];
  },
};

const mysqlPath = require.resolve('mysql2/promise');
require.cache[mysqlPath] = {
  id: mysqlPath,
  filename: mysqlPath,
  loaded: true,
  exports: {
    createPool: () => fakePool,
  },
} as any;

// ── fs.promises stub ─────────────────────────────────────────────────
const fileMap = new Map<string, string>();
let fsMkdirThrows = false;
let fsAppendThrows = false;

function resetFs() {
  fileMap.clear();
  fsMkdirThrows = false;
  fsAppendThrows = false;
}

const fsPromisesStub = {
  mkdir: async (_p: string, _opts?: any) => {
    if (fsMkdirThrows) throw new Error('mkdir failed');
  },
  appendFile: async (p: string, data: string) => {
    if (fsAppendThrows) throw new Error('append failed');
    fileMap.set(p, (fileMap.get(p) || '') + data);
  },
  readFile: async () => '',
  writeFile: async () => {},
};

const fs = require('fs');
Object.defineProperty(fs, 'promises', {
  value: fsPromisesStub,
  configurable: true,
  writable: true,
});

// ── websocketService stub (used from within writeToDatabase in setImmediate) ─
const wsPath = require.resolve('../../services/websocketService');
const wsBroadcasts: any[] = [];
require.cache[wsPath] = {
  id: wsPath,
  filename: wsPath,
  loaded: true,
  exports: {
    broadcastLogEntry: (entry: any) => { wsBroadcasts.push(entry); },
  },
} as any;

// ── db-compat stub (imported by dbLogger) ────────────────────────────
const dbCompatPath = require.resolve('../../config/db-compat');
require.cache[dbCompatPath] = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// Silence noisy console during init + log calls
const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;
function quiet() { console.log = () => {}; console.error = () => {}; console.warn = () => {}; }
function loud() { console.log = origLog; console.error = origError; console.warn = origWarn; }

quiet();
const dbLoggerModule = require('../dbLogger');
loud();

const { dbLogger, log, info, warn, error, debug, success, getLogs, cleanupOldLogs } = dbLoggerModule;

async function main() {

// Wait for initializeDatabase to settle
await new Promise((r) => setImmediate(r));
await new Promise((r) => setImmediate(r));

// ============================================================================
// module exports
// ============================================================================
console.log('\n── module exports ────────────────────────────────────────');

assert(dbLogger && typeof dbLogger === 'object', 'dbLogger exported');
assert(typeof log === 'function', 'log fn exported');
assert(typeof info === 'function', 'info fn exported');
assert(typeof warn === 'function', 'warn fn exported');
assert(typeof error === 'function', 'error fn exported');
assert(typeof debug === 'function', 'debug fn exported');
assert(typeof success === 'function', 'success fn exported');
assert(typeof getLogs === 'function', 'getLogs fn exported');
assert(typeof cleanupOldLogs === 'function', 'cleanupOldLogs fn exported');
assertEq(dbLogger.isInitialized, true, 'singleton initialized');

// ============================================================================
// log → writeToDatabase (new entry path)
// ============================================================================
console.log('\n── log / writeToDatabase new entry ───────────────────────');

quiet();
resetDb();
selectExistsRows = []; // no existing → INSERT path
await dbLogger.log('INFO', 'server', 'hello world', { foo: 'bar' }, { email: 'u@x.com' });
loud();

{
  // Expected: SELECT (hash check), INSERT errors, INSERT error_events
  assert(queries.length >= 3, 'at least 3 queries executed');
  const selectQ = queries.find(q => /FROM errors WHERE hash/i.test(q.sql));
  assert(selectQ !== undefined, 'SELECT errors by hash');
  const insertQ = queries.find(q => /INSERT INTO errors/i.test(q.sql));
  assert(insertQ !== undefined, 'INSERT INTO errors');
  // Hash in params[0], type params[1], source params[2]
  assertEq(insertQ!.params[2], 'server', 'source in params');
  assertEq(insertQ!.params[4], 'INFO', 'log_level uppercase');
  assertEq(insertQ!.params[1], 'backend', 'type mapping: server → backend');
  assertEq(insertQ!.params[9], 1, 'occurrences = 1 on new entry');
  const eventQ = queries.find(q => /INSERT INTO error_events/i.test(q.sql));
  assert(eventQ !== undefined, 'INSERT error_events');
  const contextJson = eventQ!.params[4];
  const ctx = JSON.parse(contextJson);
  assertEq(ctx.meta.foo, 'bar', 'meta preserved in context');
  assertEq(ctx.user_email, 'u@x.com', 'user_email in context');
  assertEq(ctx.requestType, 'dbLogger', 'requestType stamp');
}

// ============================================================================
// log → writeToDatabase (dedup path — UPDATE occurrences)
// ============================================================================
console.log('\n── log / writeToDatabase dedup ───────────────────────────');

quiet();
resetDb();
selectExistsRows = [{ id: 42, occurrences: 5 }];
await dbLogger.log('ERROR', 'server', 'already seen');
loud();

{
  const updateQ = queries.find(q => /UPDATE errors/i.test(q.sql));
  assert(updateQ !== undefined, 'UPDATE executed');
  assertEq(updateQ!.params[1], 6, 'occurrences incremented');
  assertEq(updateQ!.params[2], 42, 'updates existing id');
  const insertErr = queries.find(q => /INSERT INTO errors/i.test(q.sql));
  assertEq(insertErr, undefined, 'no INSERT on dedup path');
  // Still logs the event
  const eventQ = queries.find(q => /INSERT INTO error_events/i.test(q.sql));
  assert(eventQ !== undefined, 'event still logged');
  assertEq(eventQ!.params[0], 42, 'event linked to existing id');
}

// ============================================================================
// typeMapping
// ============================================================================
console.log('\n── typeMapping ───────────────────────────────────────────');

// frontend → frontend
quiet();
resetDb();
await dbLogger.log('INFO', 'frontend', 'msg');
loud();
{
  const insertQ = queries.find(q => /INSERT INTO errors/i.test(q.sql));
  assertEq(insertQ!.params[1], 'frontend', 'frontend → frontend');
}

// browser → frontend
quiet();
resetDb();
await dbLogger.log('INFO', 'browser', 'msg');
loud();
{
  const insertQ = queries.find(q => /INSERT INTO errors/i.test(q.sql));
  assertEq(insertQ!.params[1], 'frontend', 'browser → frontend');
}

// nginx → nginx
quiet();
resetDb();
await dbLogger.log('INFO', 'nginx', 'msg');
loud();
{
  const insertQ = queries.find(q => /INSERT INTO errors/i.test(q.sql));
  assertEq(insertQ!.params[1], 'nginx', 'nginx → nginx');
}

// Unknown → backend
quiet();
resetDb();
await dbLogger.log('INFO', 'unknown-thing', 'msg');
loud();
{
  const insertQ = queries.find(q => /INSERT INTO errors/i.test(q.sql));
  assertEq(insertQ!.params[1], 'backend', 'unknown → backend default');
}

// ============================================================================
// Message sanitization (strips <script> tags)
// ============================================================================
console.log('\n── sanitization ──────────────────────────────────────────');

quiet();
resetDb();
await dbLogger.log('INFO', 'server', 'safe <script>alert(1)</script> text');
loud();
{
  const insertQ = queries.find(q => /INSERT INTO errors/i.test(q.sql));
  const sanitized = insertQ!.params[3];
  assert(!sanitized.includes('<script>'), 'script tags stripped');
  assert(sanitized.includes('safe'), 'leading text preserved');
  assert(sanitized.includes('text'), 'trailing text preserved');
}

// ============================================================================
// Convenience methods map to correct levels
// ============================================================================
console.log('\n── convenience methods ───────────────────────────────────');

const levels: Array<[string, Function]> = [
  ['INFO', dbLogger.info.bind(dbLogger)],
  ['WARN', dbLogger.warn.bind(dbLogger)],
  ['ERROR', dbLogger.error.bind(dbLogger)],
  ['DEBUG', dbLogger.debug.bind(dbLogger)],
  ['SUCCESS', dbLogger.success.bind(dbLogger)],
];
for (const [lvl, fn] of levels) {
  quiet();
  resetDb();
  await (fn as any)('server', 'msg');
  loud();
  const insertQ = queries.find(q => /INSERT INTO errors/i.test(q.sql));
  assertEq(insertQ!.params[4], lvl, `${lvl} level set`);
}

// ============================================================================
// migrateFromWinston
// ============================================================================
console.log('\n── migrateFromWinston ────────────────────────────────────');

quiet();
resetDb();
await dbLogger.migrateFromWinston({
  timestamp: '2026-01-01',
  level: 'WARN',
  message: 'legacy msg',
  service: 'old-service',
  user_email: 'a@b.com',
});
loud();
{
  const insertQ = queries.find(q => /INSERT INTO errors/i.test(q.sql));
  assertEq(insertQ!.params[4], 'WARN', 'level');
  assertEq(insertQ!.params[6], 'old-service', 'service as source_component');
}

// Default level when missing
quiet();
resetDb();
await dbLogger.migrateFromWinston({ message: 'no level' });
loud();
{
  const insertQ = queries.find(q => /INSERT INTO errors/i.test(q.sql));
  assertEq(insertQ!.params[4], 'INFO', 'defaults to INFO');
  assertEq(insertQ!.params[2], 'winston-migration', 'default source');
}

// ============================================================================
// getLogs — filter SQL construction
// ============================================================================
console.log('\n── getLogs filters ───────────────────────────────────────');

// No filters
quiet();
resetDb();
{
  const rows = await dbLogger.getLogs();
  loud();
  assertEq(rows.length, 1, '1 row returned');
  const sel = queries.find(q => /FROM errors WHERE 1=1/i.test(q.sql))!;
  assert(sel.sql.includes('ORDER BY last_seen DESC'), 'order by');
  assert(sel.sql.includes('LIMIT ? OFFSET ?'), 'limit/offset');
  // Default limit=100, offset=0
  assertEq(sel.params[sel.params.length - 2], 100, 'default limit');
  assertEq(sel.params[sel.params.length - 1], 0, 'default offset');
  // Row transformation
  assert('meta' in rows[0], 'transformed has meta');
  assert('hash' in rows[0].meta, 'meta.hash');
}

// Single level
quiet();
resetDb();
await dbLogger.getLogs({ level: 'ERROR' });
loud();
{
  const sel = queries.find(q => /FROM errors WHERE 1=1/i.test(q.sql))!;
  assert(sel.sql.includes('log_level = ?'), 'single level filter');
  assertEq(sel.params[0], 'ERROR', 'level param');
}

// Multiple levels
quiet();
resetDb();
await dbLogger.getLogs({ level: 'ERROR,WARN,INFO' });
loud();
{
  const sel = queries.find(q => /FROM errors WHERE 1=1/i.test(q.sql))!;
  assert(sel.sql.includes('log_level IN (?,?,?)'), 'multi level IN clause');
  assertEq(sel.params[0], 'ERROR', 'first level');
  assertEq(sel.params[1], 'WARN', 'second level');
  assertEq(sel.params[2], 'INFO', 'third level');
}

// Source filter
quiet();
resetDb();
await dbLogger.getLogs({ source: 'api' });
loud();
{
  const sel = queries.find(q => /FROM errors WHERE 1=1/i.test(q.sql))!;
  assert(sel.sql.includes('source LIKE ? OR origin LIKE ?'), 'source and origin');
  assertEq(sel.params[0], '%api%', 'source like param');
  assertEq(sel.params[1], '%api%', 'origin like param');
}

// Service filter
quiet();
resetDb();
await dbLogger.getLogs({ service: 'auth' });
loud();
{
  const sel = queries.find(q => /FROM errors WHERE 1=1/i.test(q.sql))!;
  assert(sel.sql.includes('source_component LIKE ?'), 'source_component filter');
  assertEq(sel.params[0], '%auth%', 'service like param');
}

// Date range
quiet();
resetDb();
await dbLogger.getLogs({ startDate: '2026-01-01', endDate: '2026-02-01' });
loud();
{
  const sel = queries.find(q => /FROM errors WHERE 1=1/i.test(q.sql))!;
  assert(sel.sql.includes('last_seen >= ?'), 'startDate');
  assert(sel.sql.includes('last_seen <= ?'), 'endDate');
}

// Custom limit/offset
quiet();
resetDb();
await dbLogger.getLogs({ limit: 25, offset: 50 });
loud();
{
  const sel = queries.find(q => /FROM errors WHERE 1=1/i.test(q.sql))!;
  assertEq(sel.params[sel.params.length - 2], 25, 'custom limit');
  assertEq(sel.params[sel.params.length - 1], 50, 'custom offset');
}

// ============================================================================
// cleanupOldLogs
// ============================================================================
console.log('\n── cleanupOldLogs ────────────────────────────────────────');

quiet();
resetDb();
{
  const affected = await dbLogger.cleanupOldLogs(7);
  loud();
  assertEq(affected, 7, 'returns affectedRows');
  const del = queries.find(q => /DELETE FROM errors/i.test(q.sql));
  assert(del !== undefined, 'DELETE executed');
  assert(del!.params[0] instanceof Date, 'cutoff Date param');
}

// Default daysToKeep = 30
quiet();
resetDb();
await dbLogger.cleanupOldLogs();
loud();
{
  const del = queries.find(q => /DELETE FROM errors/i.test(q.sql))!;
  const cutoff = del.params[0] as Date;
  const expectedCutoff = new Date();
  expectedCutoff.setDate(expectedCutoff.getDate() - 30);
  // Should be within ~1 second of expected
  const diff = Math.abs(cutoff.getTime() - expectedCutoff.getTime());
  assert(diff < 2000, 'default cutoff ≈ 30 days ago');
}

// ============================================================================
// writeToFallbackFile
// ============================================================================
console.log('\n── writeToFallbackFile ───────────────────────────────────');

{
  resetFs();
  quiet();
  const entry = {
    timestamp: new Date(),
    level: 'ERROR',
    source: 'server',
    message: 'fallback test',
    meta: '{}',
  };
  await dbLogger.writeToFallbackFile(entry, new Error('db down'));
  loud();
  const files = Array.from(fileMap.keys());
  assert(files.length > 0, 'fallback file created');
  const content = fileMap.get(files[0])!;
  assert(content.includes('fallback test'), 'message in file');
  assert(content.includes('db down'), 'error reason included');
  assert(content.includes('"fallback_reason"'), 'fallback_reason field');
}

// Swallows mkdir error
{
  resetFs();
  fsMkdirThrows = true;
  quiet();
  let threw = false;
  try {
    await dbLogger.writeToFallbackFile({ timestamp: new Date(), level: 'INFO', source: 's', message: 'm', meta: '{}' }, new Error('x'));
  } catch { threw = true; }
  loud();
  assertEq(threw, false, 'mkdir error swallowed');
}

// ============================================================================
// writeToDatabase failure → fallback triggered via log()
// ============================================================================
console.log('\n── db failure → fallback ─────────────────────────────────');

{
  resetDb();
  resetFs();
  selectExistsRows = []; // so INSERT path runs
  throwOnSqlMatch = /INSERT INTO errors/;
  quiet();
  const bufferBefore = dbLogger.buffer.length;
  await dbLogger.log('ERROR', 'server', 'will fail');
  loud();
  const files = Array.from(fileMap.keys());
  assert(files.length > 0, 'fallback file created on db failure');
  assert(dbLogger.buffer.length > bufferBefore, 'entry re-buffered for retry');
}

// ============================================================================
// logToConsole — color / stream routing
// ============================================================================
console.log('\n── logToConsole ──────────────────────────────────────────');

{
  const captured: Array<{ stream: string; msg: string }> = [];
  const origL = console.log;
  const origE = console.error;
  const origW = console.warn;
  console.log = (m: any) => captured.push({ stream: 'log', msg: String(m) });
  console.error = (m: any) => captured.push({ stream: 'error', msg: String(m) });
  console.warn = (m: any) => captured.push({ stream: 'warn', msg: String(m) });

  const base = {
    timestamp: new Date(),
    source: 'svc',
    message: 'test',
    meta: '{}',
  };
  dbLogger.logToConsole({ ...base, level: 'ERROR' });
  dbLogger.logToConsole({ ...base, level: 'WARN' });
  dbLogger.logToConsole({ ...base, level: 'INFO' });
  dbLogger.logToConsole({ ...base, level: 'DEBUG' });
  dbLogger.logToConsole({ ...base, level: 'SUCCESS' });

  console.log = origL;
  console.error = origE;
  console.warn = origW;

  // ERROR → console.error
  assert(captured.find(c => c.stream === 'error' && c.msg.includes('test')) !== undefined,
    'ERROR routed to console.error');
  assert(captured.find(c => c.stream === 'warn' && c.msg.includes('test')) !== undefined,
    'WARN routed to console.warn');
  // INFO/DEBUG/SUCCESS → console.log
  const logEntries = captured.filter(c => c.stream === 'log' && c.msg.includes('test'));
  assertEq(logEntries.length, 3, 'INFO/DEBUG/SUCCESS → console.log');
  // Meta shown when non-empty
  captured.length = 0;
  console.log = (m: any) => captured.push({ stream: 'log', msg: String(m) });
  console.error = (m: any) => captured.push({ stream: 'error', msg: String(m) });
  console.warn = (m: any) => captured.push({ stream: 'warn', msg: String(m) });
  dbLogger.logToConsole({ ...base, level: 'INFO', meta: '{"key":"value"}' });
  console.log = origL;
  console.error = origE;
  console.warn = origW;
  const metaLine = captured.find(c => c.msg.includes('Meta:'));
  assert(metaLine !== undefined, 'Meta line shown for non-empty meta');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main()

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
