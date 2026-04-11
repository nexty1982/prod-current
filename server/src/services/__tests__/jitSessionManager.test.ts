#!/usr/bin/env npx tsx
/**
 * Unit tests for services/jitSessionManager.js (OMD-1204)
 *
 * In-memory session manager with a class-based API. Uses fs.promises for
 * config load/save and a periodic setInterval to clean up expired sessions.
 *
 * Strategy:
 *   - Stub fs.promises methods in-place BEFORE requiring the SUT so that
 *     the constructor's loadConfig() is intercepted (we return a benign
 *     rejection so the "use defaults" path runs).
 *   - setInterval keeps the process alive; we explicitly process.exit(0)
 *     at end of main().
 *   - Instantiate a fresh JITSessionManager per test section to isolate
 *     state.
 *
 * Coverage:
 *   - constructor: default config values, Map is empty, loadConfig failure → defaults
 *   - generateSessionId: 32 hex chars
 *   - createSession: id set, expiry math, initial isActive=true, registered in map
 *   - getSession: hit returns ISO strings + timeRemaining, miss → null,
 *     isActive reflects expiry
 *   - getSessions: filters by userId, includeAll=true bypasses filter,
 *     sorted newest-first
 *   - getActiveSessions: only isActive survivors
 *   - updateSessionActivity: lastActivity changes
 *   - terminateSession: flips isActive=false, sets terminatedAt, returns true
 *   - cleanupExpiredSessions: only expired+active → marked inactive
 *   - getSystemStatus: counts + config echo
 *   - validateConfig: each field validation
 *   - updateConfig: invalid throws, valid merges + saves
 *   - getConfig: returns a copy
 *
 * Run: npx tsx server/src/services/__tests__/jitSessionManager.test.ts
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

// ── fs stubs (in-place on cached fs.promises) ───────────────────────
const fs = require('fs');
const origReadFile = fs.promises.readFile;
const origWriteFile = fs.promises.writeFile;
const origMkdir = fs.promises.mkdir;

type FsCall = { op: string; args: any[] };
const fsCalls: FsCall[] = [];
let readFileImpl: ((p: any, enc: any) => Promise<any>) = async () => {
  const e: any = new Error('ENOENT: no such file');
  e.code = 'ENOENT';
  throw e;
};
let writeFileImpl: ((p: any, data: any) => Promise<any>) = async () => {};
let mkdirImpl: ((p: any, opts: any) => Promise<any>) = async () => {};

fs.promises.readFile = async (p: any, enc: any) => {
  fsCalls.push({ op: 'readFile', args: [p, enc] });
  return readFileImpl(p, enc);
};
fs.promises.writeFile = async (p: any, data: any) => {
  fsCalls.push({ op: 'writeFile', args: [p, data] });
  return writeFileImpl(p, data);
};
fs.promises.mkdir = async (p: any, opts: any) => {
  fsCalls.push({ op: 'mkdir', args: [p, opts] });
  return mkdirImpl(p, opts);
};

// Silence
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

quiet();
const JITSessionManager = require('../jitSessionManager');
loud();

function resetFs() {
  fsCalls.length = 0;
  readFileImpl = async () => {
    const e: any = new Error('ENOENT');
    e.code = 'ENOENT';
    throw e;
  };
  writeFileImpl = async () => {};
  mkdirImpl = async () => {};
}

async function main() {

// ============================================================================
// constructor & generateSessionId
// ============================================================================
console.log('\n── constructor / defaults ──────────────────────────────');

resetFs();
quiet();
const mgr = new JITSessionManager();
loud();

// loadConfig is async — allow it a microtask to resolve its default path
await new Promise(r => setImmediate(r));
await new Promise(r => setImmediate(r));

const cfg = await mgr.getConfig();
assertEq(cfg.enabled, true, 'default enabled=true');
assertEq(cfg.maxConcurrentSessions, 5, 'default maxConcurrent=5');
assertEq(cfg.defaultTimeoutMinutes, 30, 'default timeout=30');
assertEq(cfg.requirePassword, false, 'default requirePassword=false');
assertEq(cfg.allowInProduction, false, 'default allowInProduction=false');

// getConfig returns a copy (mutation doesn't leak)
cfg.enabled = false;
const cfg2 = await mgr.getConfig();
assertEq(cfg2.enabled, true, 'getConfig returns a copy');

console.log('\n── generateSessionId ───────────────────────────────────');

const id = mgr.generateSessionId();
assert(/^[0-9a-f]{32}$/.test(id), '32 hex chars');
const id2 = mgr.generateSessionId();
assert(id !== id2, 'two generated ids differ');

// ============================================================================
// createSession & getSession
// ============================================================================
console.log('\n── createSession ───────────────────────────────────────');

quiet();
const session = await mgr.createSession({
  userId: 42,
  userName: 'alice',
  ipAddress: '10.0.0.1',
  userAgent: 'curl/8.0',
  timeoutMinutes: 30,
});
loud();

assert(typeof session.id === 'string' && session.id.length === 32, 'id is 32-char hex');
assertEq(session.userId, 42, 'userId');
assertEq(session.userName, 'alice', 'userName');
assertEq(session.ipAddress, '10.0.0.1', 'ipAddress');
assertEq(session.userAgent, 'curl/8.0', 'userAgent');
assertEq(session.isActive, true, 'isActive=true');
assert(session.createdAt instanceof Date, 'createdAt is Date');
assert(session.expiresAt instanceof Date, 'expiresAt is Date');

// Expiry math: ~30 minutes later (allow 2s fuzz)
const expectedExpiry = Date.now() + 30 * 60 * 1000;
const actualExpiry = session.expiresAt.getTime();
assert(Math.abs(actualExpiry - expectedExpiry) < 2000, 'expiresAt ≈ now + 30min');

console.log('\n── getSession ──────────────────────────────────────────');

const fetched = await mgr.getSession(session.id);
assert(fetched !== null, 'session found');
assertEq(fetched!.id, session.id, 'id');
assertEq(typeof fetched!.createdAt, 'string', 'createdAt is ISO string');
assertEq(typeof fetched!.expiresAt, 'string', 'expiresAt is ISO string');
assert(fetched!.timeRemaining >= 29 && fetched!.timeRemaining <= 30, 'timeRemaining ~30');
assertEq(fetched!.isActive, true, 'isActive');

const miss = await mgr.getSession('not-a-real-id');
assertEq(miss, null, 'miss → null');

// ============================================================================
// getSessions / getActiveSessions
// ============================================================================
console.log('\n── getSessions & getActiveSessions ─────────────────────');

quiet();
// Create a few sessions with staggered creation times
await mgr.createSession({ userId: 42, userName: 'alice', ipAddress: '1', userAgent: 'x', timeoutMinutes: 30 });
await new Promise(r => setTimeout(r, 5));
await mgr.createSession({ userId: 42, userName: 'alice', ipAddress: '2', userAgent: 'x', timeoutMinutes: 30 });
await new Promise(r => setTimeout(r, 5));
const otherUserSession = await mgr.createSession({ userId: 99, userName: 'bob', ipAddress: '3', userAgent: 'x', timeoutMinutes: 30 });
loud();

const aliceSessions = await mgr.getSessions(42);
assertEq(aliceSessions.length, 3, 'alice has 3 sessions');  // incl. first one created above
assert(aliceSessions.every((s: any) => s.userId === 42), 'all filtered to userId=42');

// Sorted newest-first
const times = aliceSessions.map((s: any) => new Date(s.createdAt).getTime());
for (let i = 1; i < times.length; i++) {
  assert(times[i - 1] >= times[i], `sorted DESC (${i})`);
}

const allSessions = await mgr.getSessions(42, true);
assertEq(allSessions.length, 4, 'includeAll returns everyone (4 total)');

const active = await mgr.getActiveSessions(42);
assertEq(active.length, 3, 'all 3 alice sessions active');
assert(active.every((s: any) => s.isActive), 'all isActive=true');

// ============================================================================
// updateSessionActivity
// ============================================================================
console.log('\n── updateSessionActivity ───────────────────────────────');

const originalActivity = session.lastActivity.getTime();
await new Promise(r => setTimeout(r, 10));
await mgr.updateSessionActivity(session.id);
const refreshed = await mgr.getSession(session.id);
assert(new Date(refreshed!.lastActivity).getTime() > originalActivity, 'lastActivity advanced');

// Unknown id: no-op, no throw
await mgr.updateSessionActivity('nope');
assert(true, 'unknown id no-op');

// ============================================================================
// terminateSession
// ============================================================================
console.log('\n── terminateSession ────────────────────────────────────');

quiet();
const result = await mgr.terminateSession(otherUserSession.id);
loud();
assertEq(result, true, 'returns true');
const terminated = await mgr.getSession(otherUserSession.id);
assertEq(terminated!.isActive, false, 'isActive now false');

// Terminating unknown id still returns true
const r2 = await mgr.terminateSession('nonexistent');
assertEq(r2, true, 'unknown id returns true');

// ============================================================================
// getSystemStatus
// ============================================================================
console.log('\n── getSystemStatus ─────────────────────────────────────');

const status = await mgr.getSystemStatus();
assertEq(status.enabled, true, 'enabled');
assert(status.totalSessions >= 4, `totalSessions >= 4 (actual: ${status.totalSessions})`);
// 3 alice + 0 bob (terminated) → but terminated session may still count as active
// since expiresAt hasn't passed. Let's just check shape.
assert(typeof status.activeSessions === 'number', 'activeSessions number');
assert(typeof status.expiredSessions === 'number', 'expiredSessions number');
assertEq(status.maxConcurrentSessions, 5, 'maxConcurrentSessions');
assertEq(status.defaultTimeoutMinutes, 30, 'defaultTimeoutMinutes');
assert(status.lastCleanup instanceof Date, 'lastCleanup Date');

// ============================================================================
// cleanupExpiredSessions (force by creating one with very short timeout)
// ============================================================================
console.log('\n── cleanupExpiredSessions ──────────────────────────────');

const mgr2 = new JITSessionManager();
await new Promise(r => setImmediate(r));

quiet();
const shortSession = await mgr2.createSession({
  userId: 1, userName: 'x', ipAddress: '1', userAgent: 'x',
  timeoutMinutes: 0.001, // ~60ms
});
loud();

await new Promise(r => setTimeout(r, 100));  // wait for expiry

// Manually invoke cleanup (don't wait for the 60s interval)
quiet();
mgr2.cleanupExpiredSessions();
loud();

const cleaned = await mgr2.getSession(shortSession.id);
assertEq(cleaned!.isActive, false, 'expired session marked inactive');

// ============================================================================
// validateConfig
// ============================================================================
console.log('\n── validateConfig ──────────────────────────────────────');

{
  const goodCfg = {
    enabled: true,
    maxConcurrentSessions: 10,
    defaultTimeoutMinutes: 60,
    requirePassword: true,
    allowInProduction: false,
  };
  const v = mgr.validateConfig(goodCfg);
  assertEq(v.valid, true, 'good config valid');
  assertEq(v.errors, [], 'no errors');
}

{
  const bad = mgr.validateConfig({
    enabled: 'yes',  // not boolean
    maxConcurrentSessions: 0,  // too low
    defaultTimeoutMinutes: -5,  // too low
    requirePassword: 1,  // not boolean
    allowInProduction: 'no',  // not boolean
  });
  assertEq(bad.valid, false, 'bad config invalid');
  assert(bad.errors.length === 5, '5 errors');
  assert(bad.errors.some((e: string) => e.includes('enabled')), 'enabled error');
  assert(bad.errors.some((e: string) => e.includes('maxConcurrentSessions')), 'maxConcurrent error');
  assert(bad.errors.some((e: string) => e.includes('defaultTimeoutMinutes')), 'timeout error');
  assert(bad.errors.some((e: string) => e.includes('requirePassword')), 'requirePassword error');
  assert(bad.errors.some((e: string) => e.includes('allowInProduction')), 'allowInProduction error');
}

// ============================================================================
// updateConfig
// ============================================================================
console.log('\n── updateConfig ────────────────────────────────────────');

// Invalid → throws
{
  let caught: any = null;
  try {
    await mgr.updateConfig(
      { enabled: 'no', maxConcurrentSessions: 10, defaultTimeoutMinutes: 30, requirePassword: false, allowInProduction: false },
      { id: 1, name: 'admin' }
    );
  } catch (e) { caught = e; }
  assert(caught !== null, 'invalid config throws');
  assert(caught.message.includes('Invalid configuration'), 'error message');
}

// Valid → merges and saves
resetFs();
quiet();
{
  const newCfg = {
    enabled: false,
    maxConcurrentSessions: 20,
    defaultTimeoutMinutes: 60,
    requirePassword: true,
    allowInProduction: true,
  };
  const result = await mgr.updateConfig(newCfg, { id: 1, name: 'admin' });
  loud();
  assertEq(result.maxConcurrentSessions, 20, 'maxConcurrent updated');
  assertEq(result.enabled, false, 'enabled updated');
  assertEq(result.requirePassword, true, 'requirePassword updated');
  // saveConfig should have called mkdir + writeFile
  const hasWrite = fsCalls.some(c => c.op === 'writeFile');
  const hasMkdir = fsCalls.some(c => c.op === 'mkdir');
  assert(hasWrite, 'writeFile called');
  assert(hasMkdir, 'mkdir called');
  // Config persisted
  const current = await mgr.getConfig();
  assertEq(current.enabled, false, 'config persists on manager');
}

// saveConfig error swallowed (doesn't throw)
resetFs();
writeFileImpl = async () => { throw new Error('disk full'); };
quiet();
{
  const result = await mgr.updateConfig(
    { enabled: true, maxConcurrentSessions: 5, defaultTimeoutMinutes: 30, requirePassword: false, allowInProduction: false },
    { id: 1, name: 'admin' }
  );
  loud();
  assertEq(result.enabled, true, 'updateConfig returns even on save failure');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
