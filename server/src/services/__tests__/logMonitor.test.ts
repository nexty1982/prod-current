#!/usr/bin/env npx tsx
/**
 * Unit tests for services/logMonitor.js (OMD-973)
 *
 * LogMonitor extends EventEmitter. The pm2 spawn side effects in start()
 * and stop() are out of scope; we test the pure data-processing path:
 * processLogData, getLogBuffer, getStats, clearBuffer.
 *
 * The module exports a singleton, so each test resets state by calling
 * clearBuffer(). Listeners are reset with removeAllListeners('log-alert').
 *
 * Coverage:
 *   - processLogData: error pattern detection (error/exception/fail/fatal/crash)
 *   - processLogData: warning pattern detection (warn/warning/deprecated)
 *   - processLogData: case-insensitive matching
 *   - processLogData: ignores non-matching lines
 *   - processLogData: skips empty lines
 *   - processLogData: emits 'log-alert' event with normalized entry
 *   - processLogData: appends to buffer; buffer cap at maxBufferSize
 *   - processLogData: handles Buffer input (splits on newline)
 *   - getLogBuffer: returns copy (not reference)
 *   - getStats: total/errors/warnings/isMonitoring
 *   - clearBuffer: returns previous + empties
 *
 * Run: npx tsx server/src/services/__tests__/logMonitor.test.ts
 */

const logMonitor = require('../logMonitor');

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

function resetMonitor() {
  logMonitor.removeAllListeners('log-alert');
  logMonitor.clearBuffer();
}

// ============================================================================
// processLogData: error pattern detection
// ============================================================================
console.log('\n── processLogData: error patterns ────────────────────────');

resetMonitor();
{
  // Each of these should classify as error
  const errorLines = [
    'Database error occurred',
    'Uncaught Exception in handler',
    'fail to connect to redis',
    'Fatal error: cannot allocate',
    'Application crash detected',
    'ERROR: invalid token',
    'EXCEPTION thrown at line 42',
  ];
  for (const line of errorLines) {
    logMonitor.processLogData(Buffer.from(line));
  }
  const stats = logMonitor.getStats();
  assertEq(stats.errors, errorLines.length, `${errorLines.length} errors detected`);
  assertEq(stats.warnings, 0, '0 warnings');
}

// ============================================================================
// processLogData: warning pattern detection
// ============================================================================
console.log('\n── processLogData: warning patterns ──────────────────────');

resetMonitor();
{
  const warnLines = [
    'warn: deprecated API',
    'WARNING: nullable column',
    'this method is deprecated',
    'Warn about misconfiguration',
  ];
  for (const line of warnLines) {
    logMonitor.processLogData(Buffer.from(line));
  }
  const stats = logMonitor.getStats();
  assertEq(stats.warnings, warnLines.length, `${warnLines.length} warnings detected`);
  assertEq(stats.errors, 0, '0 errors');
}

// ============================================================================
// processLogData: error takes precedence over warning
// ============================================================================
console.log('\n── processLogData: error trumps warning ──────────────────');

resetMonitor();
{
  // Line contains both 'warn' and 'error' — error checked first
  logMonitor.processLogData(Buffer.from('warn: error in handler'));
  const stats = logMonitor.getStats();
  assertEq(stats.errors, 1, 'classified as error');
  assertEq(stats.warnings, 0, '0 warnings (precedence)');
}

// ============================================================================
// processLogData: ignores non-matching lines
// ============================================================================
console.log('\n── processLogData: non-matching ignored ──────────────────');

resetMonitor();
{
  logMonitor.processLogData(Buffer.from('regular info message'));
  logMonitor.processLogData(Buffer.from('user logged in successfully'));
  logMonitor.processLogData(Buffer.from('GET /api/users 200 50ms'));
  const stats = logMonitor.getStats();
  assertEq(stats.total, 0, 'no entries added');
}

// ============================================================================
// processLogData: skips empty lines
// ============================================================================
console.log('\n── processLogData: empty lines skipped ───────────────────');

resetMonitor();
{
  logMonitor.processLogData(Buffer.from('\n\n   \n'));
  const stats = logMonitor.getStats();
  assertEq(stats.total, 0, 'all empty lines skipped');
}

// ============================================================================
// processLogData: multi-line input split on \n
// ============================================================================
console.log('\n── processLogData: multi-line input ──────────────────────');

resetMonitor();
{
  const multiline = 'normal info\nerror: first\nwarn: second\nanother info\nfatal crash';
  logMonitor.processLogData(Buffer.from(multiline));
  const stats = logMonitor.getStats();
  assertEq(stats.total, 3, '3 matched (error, warn, fatal crash)');
  assertEq(stats.errors, 2, '2 errors');
  assertEq(stats.warnings, 1, '1 warning');
}

// ============================================================================
// processLogData: emits 'log-alert' with normalized entry
// ============================================================================
console.log('\n── processLogData: emits log-alert ───────────────────────');

resetMonitor();
{
  const captured: any[] = [];
  logMonitor.on('log-alert', (entry: any) => captured.push(entry));

  logMonitor.processLogData(Buffer.from('error: something broke'));
  assertEq(captured.length, 1, 'one event emitted');

  const entry = captured[0];
  assertEq(entry.type, 'error', 'entry.type=error');
  assertEq(entry.message, 'error: something broke', 'message trimmed');
  assert(typeof entry.timestamp === 'string', 'timestamp string');
  assert(/^\d{4}-\d{2}-\d{2}T/.test(entry.timestamp), 'ISO-ish timestamp');
  assert(typeof entry.id === 'string', 'id string');
  assert(/^\d+-[a-z0-9]{9}$/.test(entry.id), 'id format: ts-rand9');
}

// Multiple emissions
resetMonitor();
{
  const captured: any[] = [];
  logMonitor.on('log-alert', (entry: any) => captured.push(entry));

  logMonitor.processLogData(Buffer.from('error 1\nerror 2\nwarn 3'));
  assertEq(captured.length, 3, '3 events emitted');
  assertEq(captured[0].type, 'error', 'event 0 = error');
  assertEq(captured[1].type, 'error', 'event 1 = error');
  assertEq(captured[2].type, 'warning', 'event 2 = warning');
}

// ============================================================================
// processLogData: trims line in stored entry
// ============================================================================
console.log('\n── processLogData: trims message ─────────────────────────');

resetMonitor();
{
  logMonitor.processLogData(Buffer.from('   error: padded   '));
  const buffer = logMonitor.getLogBuffer();
  assertEq(buffer[0].message, 'error: padded', 'message trimmed');
}

// ============================================================================
// processLogData: buffer cap at maxBufferSize
// ============================================================================
console.log('\n── processLogData: buffer cap ────────────────────────────');

resetMonitor();
{
  // maxBufferSize = 500. Push 510 errors.
  for (let i = 0; i < 510; i++) {
    logMonitor.processLogData(Buffer.from(`error ${i}`));
  }
  const stats = logMonitor.getStats();
  assertEq(stats.total, 500, 'capped at 500');

  const buffer = logMonitor.getLogBuffer();
  // Oldest 10 dropped → first remaining is "error 10"
  assertEq(buffer[0].message, 'error 10', 'oldest entries dropped');
  assertEq(buffer[499].message, 'error 509', 'newest preserved');
}

// ============================================================================
// getLogBuffer: returns copy, not reference
// ============================================================================
console.log('\n── getLogBuffer: returns copy ────────────────────────────');

resetMonitor();
{
  logMonitor.processLogData(Buffer.from('error one'));
  const buf1 = logMonitor.getLogBuffer();
  buf1.push({ tampered: true });
  const buf2 = logMonitor.getLogBuffer();
  assertEq(buf2.length, 1, 'mutating returned array does not affect internal');
}

// ============================================================================
// getStats: shape
// ============================================================================
console.log('\n── getStats: shape ───────────────────────────────────────');

resetMonitor();
{
  logMonitor.processLogData(Buffer.from('error a\nerror b\nwarn c'));
  const stats = logMonitor.getStats();
  assertEq(stats.total, 3, 'total=3');
  assertEq(stats.errors, 2, 'errors=2');
  assertEq(stats.warnings, 1, 'warnings=1');
  // Singleton hasn't called start(), so isMonitoring is false
  assertEq(stats.isMonitoring, false, 'isMonitoring=false (start() not called)');
}

// ============================================================================
// clearBuffer: returns previous + empties
// ============================================================================
console.log('\n── clearBuffer ───────────────────────────────────────────');

resetMonitor();
{
  logMonitor.processLogData(Buffer.from('error x\nwarn y'));
  assertEq(logMonitor.getStats().total, 2, '2 entries before clear');

  const cleared = logMonitor.clearBuffer();
  assertEq(cleared.length, 2, 'returned 2 cleared entries');
  assertEq(cleared[0].type, 'error', 'cleared[0] = error');
  assertEq(cleared[1].type, 'warning', 'cleared[1] = warning');

  const after = logMonitor.getStats();
  assertEq(after.total, 0, 'buffer empty after clear');

  // Subsequent clear is empty
  const cleared2 = logMonitor.clearBuffer();
  assertEq(cleared2.length, 0, 'second clear returns empty');
}

// ============================================================================
// Cleanup
// ============================================================================
resetMonitor();

console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
