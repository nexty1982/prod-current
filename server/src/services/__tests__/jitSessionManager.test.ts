#!/usr/bin/env npx tsx
/**
 * Unit tests for services/jitSessionManager.js (OMD-1085)
 *
 * Class-based in-memory session manager. Constructor starts a 60-second
 * cleanup interval and fires a background loadConfig() — both must be
 * neutralized before requiring the SUT:
 *   - Replace setInterval with a noop that records the callback (so we
 *     can invoke it manually) but doesn't actually schedule anything.
 *   - Stub fs.promises.readFile to always reject (so loadConfig falls
 *     through to default config), and fs.promises.mkdir / writeFile to
 *     resolve without touching disk.
 *
 * Coverage:
 *   - getConfig: returns default, updateConfig merges + validates
 *   - validateConfig: all 5 fields, happy + each error branch
 *   - createSession: generates hex id, sets expiresAt from timeoutMinutes
 *   - getSession: returns null for missing; returns shaped object with
 *                 ISO dates and timeRemaining; isActive flips when expired
 *   - getSessions: filters by userId, includeAll bypasses filter,
 *                  sorted by createdAt desc
 *   - getActiveSessions: filters out inactive / expired
 *   - updateSessionActivity: bumps lastActivity
 *   - terminateSession: sets isActive=false, terminatedAt set
 *   - cleanupExpiredSessions: flips isActive=false on expired sessions
 *   - getSystemStatus: counts active/expired
 *   - generateSessionId: 32-char hex
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

// ── Neutralize setInterval BEFORE requiring SUT ─────────────────────
const origSetInterval = global.setInterval;
const intervalCallbacks: Function[] = [];
(global as any).setInterval = (cb: Function, _ms: number) => {
  intervalCallbacks.push(cb);
  // Return a fake timer id that `clearInterval` can swallow
  return { unref: () => {}, ref: () => {} } as any;
};

// ── Stub fs.promises BEFORE requiring SUT ───────────────────────────
// jitSessionManager calls `require('fs').promises` at module load time;
// we replace the promises object on the already-cached fs module.
const fs = require('fs');
const origReadFile = fs.promises.readFile;
const origWriteFile = fs.promises.writeFile;
const origMkdir = fs.promises.mkdir;

let readFileShouldFail = true;
let readFileContent: string | null = null;
const writeFileCalls: Array<{ path: string; data: string }> = [];
const mkdirCalls: string[] = [];

fs.promises.readFile = async (p: string, _enc?: string) => {
  if (readFileShouldFail) {
    const err: any = new Error('ENOENT');
    err.code = 'ENOENT';
    throw err;
  }
  return readFileContent;
};
fs.promises.writeFile = async (p: string, data: string) => {
  writeFileCalls.push({ path: p, data });
};
fs.promises.mkdir = async (p: string, _opts?: any) => {
  mkdirCalls.push(p);
};

// Silence module load logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

quiet();
const JITSessionManager = require('../jitSessionManager');
loud();

// Restore global setInterval so our tests aren't affected (the SUT
// already grabbed its reference; new instances will use our stub if
// they call global.setInterval, which the constructor does).
// Leave it replaced for the entire test run.

async function main() {

// Allow the constructor's fire-and-forget loadConfig to settle before
// we start poking at config. (Promise queue drain.)
await new Promise(r => setImmediate(r));

// ============================================================================
// Constructor + default config
// ============================================================================
console.log('\n── constructor + default config ──────────────────────────');

quiet();
const mgr = new JITSessionManager();
await new Promise(r => setImmediate(r));
loud();

{
  const cfg = await mgr.getConfig();
  assertEq(cfg.enabled, true, 'default enabled=true');
  assertEq(cfg.maxConcurrentSessions, 5, 'default max=5');
  assertEq(cfg.defaultTimeoutMinutes, 30, 'default timeout=30');
  assertEq(cfg.requirePassword, false, 'default requirePassword=false');
  assertEq(cfg.allowInProduction, false, 'default allowInProduction=false');
  // getConfig returns a copy, not the internal reference
  cfg.enabled = false;
  const cfg2 = await mgr.getConfig();
  assertEq(cfg2.enabled, true, 'getConfig returns copy (not mutable)');
}

assert(intervalCallbacks.length >= 1, 'constructor registered cleanup interval');

// ============================================================================
// validateConfig
// ============================================================================
console.log('\n── validateConfig ────────────────────────────────────────');

{
  const ok = mgr.validateConfig({
    enabled: true, maxConcurrentSessions: 10, defaultTimeoutMinutes: 60,
    requirePassword: true, allowInProduction: false,
  });
  assertEq(ok.valid, true, 'all valid');
  assertEq(ok.errors.length, 0, 'no errors');
}

{
  const bad = mgr.validateConfig({
    enabled: 'yes',
    maxConcurrentSessions: 0,
    defaultTimeoutMinutes: -5,
    requirePassword: 1,
    allowInProduction: null,
  });
  assertEq(bad.valid, false, 'all invalid');
  assertEq(bad.errors.length, 5, '5 errors');
  assert(bad.errors.some((e: string) => e.includes('enabled')), 'enabled error');
  assert(bad.errors.some((e: string) => e.includes('maxConcurrentSessions')), 'max error');
  assert(bad.errors.some((e: string) => e.includes('defaultTimeoutMinutes')), 'timeout error');
  assert(bad.errors.some((e: string) => e.includes('requirePassword')), 'password error');
  assert(bad.errors.some((e: string) => e.includes('allowInProduction')), 'prod error');
}

// ============================================================================
// updateConfig
// ============================================================================
console.log('\n── updateConfig ──────────────────────────────────────────');

{
  writeFileCalls.length = 0;
  mkdirCalls.length = 0;
  quiet();
  const updated = await mgr.updateConfig(
    { maxConcurrentSessions: 20, defaultTimeoutMinutes: 120,
      enabled: true, requirePassword: true, allowInProduction: true },
    { id: 7, name: 'Alice' }
  );
  loud();
  assertEq(updated.maxConcurrentSessions, 20, 'max updated');
  assertEq(updated.defaultTimeoutMinutes, 120, 'timeout updated');
  assertEq(updated.requirePassword, true, 'password updated');
  assertEq(updated.allowInProduction, true, 'prod updated');
  assert(writeFileCalls.length === 1, 'saveConfig called writeFile');
  assert(writeFileCalls[0].path.includes('jit-config.json'), 'writes to jit-config.json');
  assert(mkdirCalls.length === 1, 'mkdir called to ensure dir');
}

// updateConfig rejects invalid config
{
  let caught: Error | null = null;
  try {
    quiet();
    await mgr.updateConfig(
      { enabled: 'nope', maxConcurrentSessions: 20,
        defaultTimeoutMinutes: 120, requirePassword: true, allowInProduction: true },
      { id: 7, name: 'Alice' }
    );
    loud();
  } catch (e: any) {
    loud();
    caught = e;
  }
  assert(caught !== null, 'updateConfig throws on invalid');
  assert(caught !== null && caught.message.includes('Invalid configuration'), 'error mentions invalid');
}

// ============================================================================
// generateSessionId
// ============================================================================
console.log('\n── generateSessionId ─────────────────────────────────────');

{
  const id = mgr.generateSessionId();
  assert(typeof id === 'string', 'string');
  assertEq(id.length, 32, '32 hex chars (16 bytes)');
  assert(/^[0-9a-f]{32}$/.test(id), 'hex format');
  const id2 = mgr.generateSessionId();
  assert(id !== id2, 'ids are unique');
}

// ============================================================================
// createSession
// ============================================================================
console.log('\n── createSession ─────────────────────────────────────────');

{
  quiet();
  const before = Date.now();
  const session = await mgr.createSession({
    userId: 42,
    userName: 'Alice',
    ipAddress: '10.0.0.1',
    userAgent: 'Mozilla/5.0',
    timeoutMinutes: 30,
  });
  loud();
  assert(typeof session.id === 'string', 'has id');
  assertEq(session.userId, 42, 'userId');
  assertEq(session.userName, 'Alice', 'userName');
  assertEq(session.ipAddress, '10.0.0.1', 'ipAddress');
  assertEq(session.userAgent, 'Mozilla/5.0', 'userAgent');
  assertEq(session.isActive, true, 'isActive');
  const expMs = session.expiresAt.getTime() - before;
  assert(expMs >= 30 * 60 * 1000 - 1000 && expMs <= 30 * 60 * 1000 + 1000,
    'expiresAt ≈ now + 30 min');
}

// ============================================================================
// getSession
// ============================================================================
console.log('\n── getSession ────────────────────────────────────────────');

{
  const missing = await mgr.getSession('nonexistent');
  assertEq(missing, null, 'missing → null');
}

{
  quiet();
  const s = await mgr.createSession({
    userId: 1, userName: 'Bob', ipAddress: '1.2.3.4',
    userAgent: 'UA', timeoutMinutes: 60,
  });
  loud();
  const got = await mgr.getSession(s.id);
  assertEq(got.id, s.id, 'id');
  assertEq(got.userId, 1, 'userId');
  assertEq(got.userName, 'Bob', 'userName');
  assert(typeof got.createdAt === 'string', 'createdAt is ISO string');
  assert(got.createdAt.includes('T'), 'createdAt ISO format');
  assert(got.timeRemaining >= 59 && got.timeRemaining <= 60, 'timeRemaining ≈ 60');
  assertEq(got.isActive, true, 'isActive true');
}

// Expired session → isActive false
{
  quiet();
  const s = await mgr.createSession({
    userId: 1, userName: 'Bob', ipAddress: '1.2.3.4',
    userAgent: 'UA', timeoutMinutes: 30,
  });
  loud();
  // Manually rewind expiration
  const internal = (mgr as any).sessions.get(s.id);
  internal.expiresAt = new Date(Date.now() - 1000);
  const got = await mgr.getSession(s.id);
  assertEq(got.isActive, false, 'expired → not active');
  assertEq(got.timeRemaining, 0, 'timeRemaining=0 when expired');
}

// ============================================================================
// getSessions + getActiveSessions
// ============================================================================
console.log('\n── getSessions ───────────────────────────────────────────');

// Fresh manager to get a clean session set
quiet();
const mgr2 = new JITSessionManager();
await new Promise(r => setImmediate(r));

// Create sessions for different users
const sAlice1 = await mgr2.createSession({
  userId: 1, userName: 'Alice', ipAddress: 'x', userAgent: 'ua', timeoutMinutes: 30,
});
await new Promise(r => setTimeout(r, 5)); // ensure distinct createdAt
const sAlice2 = await mgr2.createSession({
  userId: 1, userName: 'Alice', ipAddress: 'x', userAgent: 'ua', timeoutMinutes: 30,
});
await new Promise(r => setTimeout(r, 5));
const sBob = await mgr2.createSession({
  userId: 2, userName: 'Bob', ipAddress: 'y', userAgent: 'ua', timeoutMinutes: 30,
});
loud();

{
  const alice = await mgr2.getSessions(1);
  assertEq(alice.length, 2, 'Alice has 2 sessions');
  // Newer session first (sorted by createdAt desc)
  assertEq(alice[0].id, sAlice2.id, 'newer session first');
  assertEq(alice[1].id, sAlice1.id, 'older session second');
}

{
  const bob = await mgr2.getSessions(2);
  assertEq(bob.length, 1, 'Bob has 1 session');
  assertEq(bob[0].id, sBob.id, 'Bob session id');
}

// includeAll returns everything
{
  const all = await mgr2.getSessions(999, true);
  assertEq(all.length, 3, 'includeAll=true returns all 3');
}

// unknown userId with includeAll=false → empty
{
  const none = await mgr2.getSessions(999);
  assertEq(none.length, 0, 'unknown user → empty');
}

// ============================================================================
// getActiveSessions
// ============================================================================
console.log('\n── getActiveSessions ─────────────────────────────────────');

{
  // Expire one Alice session
  const internal = (mgr2 as any).sessions.get(sAlice1.id);
  internal.expiresAt = new Date(Date.now() - 1000);
  const active = await mgr2.getActiveSessions(1);
  assertEq(active.length, 1, 'only 1 active after expiry');
  assertEq(active[0].id, sAlice2.id, 'active is sAlice2');
}

// ============================================================================
// updateSessionActivity
// ============================================================================
console.log('\n── updateSessionActivity ─────────────────────────────────');

{
  const internalBefore = (mgr2 as any).sessions.get(sAlice2.id);
  const beforeActivity = internalBefore.lastActivity.getTime();
  await new Promise(r => setTimeout(r, 5));
  await mgr2.updateSessionActivity(sAlice2.id);
  const internalAfter = (mgr2 as any).sessions.get(sAlice2.id);
  assert(internalAfter.lastActivity.getTime() > beforeActivity, 'lastActivity bumped');
}

// No-op on missing session (doesn't throw)
{
  await mgr2.updateSessionActivity('nonexistent');
  assert(true, 'missing session → no error');
}

// ============================================================================
// terminateSession
// ============================================================================
console.log('\n── terminateSession ──────────────────────────────────────');

{
  quiet();
  const s = await mgr2.createSession({
    userId: 3, userName: 'Carol', ipAddress: 'z', userAgent: 'ua', timeoutMinutes: 30,
  });
  const result = await mgr2.terminateSession(s.id);
  loud();
  assertEq(result, true, 'terminate returns true');
  const internal = (mgr2 as any).sessions.get(s.id);
  assertEq(internal.isActive, false, 'isActive=false');
  assert(internal.terminatedAt instanceof Date, 'terminatedAt set');
}

// Terminate missing → still returns true (no-op)
{
  quiet();
  const result = await mgr2.terminateSession('nonexistent');
  loud();
  assertEq(result, true, 'missing → true (no-op)');
}

// ============================================================================
// cleanupExpiredSessions
// ============================================================================
console.log('\n── cleanupExpiredSessions ────────────────────────────────');

{
  // Fresh manager
  quiet();
  const m3 = new JITSessionManager();
  await new Promise(r => setImmediate(r));

  const a = await m3.createSession({ userId: 1, userName: 'A', ipAddress: '', userAgent: '', timeoutMinutes: 30 });
  const b = await m3.createSession({ userId: 1, userName: 'B', ipAddress: '', userAgent: '', timeoutMinutes: 30 });
  const c = await m3.createSession({ userId: 1, userName: 'C', ipAddress: '', userAgent: '', timeoutMinutes: 30 });
  loud();

  // Expire a and c
  (m3 as any).sessions.get(a.id).expiresAt = new Date(Date.now() - 1000);
  (m3 as any).sessions.get(c.id).expiresAt = new Date(Date.now() - 1000);

  quiet();
  m3.cleanupExpiredSessions();
  loud();

  assertEq((m3 as any).sessions.get(a.id).isActive, false, 'a flipped inactive');
  assertEq((m3 as any).sessions.get(b.id).isActive, true, 'b still active');
  assertEq((m3 as any).sessions.get(c.id).isActive, false, 'c flipped inactive');
  assert((m3 as any).sessions.get(a.id).terminatedAt instanceof Date, 'a terminatedAt set');

  // Second cleanup run: nothing to flip (already inactive)
  const activeCountBefore = Array.from((m3 as any).sessions.values())
    .filter((s: any) => s.isActive).length;
  m3.cleanupExpiredSessions();
  const activeCountAfter = Array.from((m3 as any).sessions.values())
    .filter((s: any) => s.isActive).length;
  assertEq(activeCountAfter, activeCountBefore, 'second run no change');
}

// Interval callback invokes cleanup
{
  quiet();
  const m4 = new JITSessionManager();
  await new Promise(r => setImmediate(r));
  const s = await m4.createSession({ userId: 1, userName: 'X', ipAddress: '', userAgent: '', timeoutMinutes: 30 });
  loud();

  (m4 as any).sessions.get(s.id).expiresAt = new Date(Date.now() - 1000);

  // Grab the latest interval callback and invoke
  const cb = intervalCallbacks[intervalCallbacks.length - 1];
  assert(typeof cb === 'function', 'interval cb is function');
  quiet();
  cb();
  loud();
  assertEq((m4 as any).sessions.get(s.id).isActive, false, 'cb cleans up');
}

// ============================================================================
// getSystemStatus
// ============================================================================
console.log('\n── getSystemStatus ───────────────────────────────────────');

{
  quiet();
  const m5 = new JITSessionManager();
  await new Promise(r => setImmediate(r));
  // 2 active + 1 expired
  const s1 = await m5.createSession({ userId: 1, userName: 'A', ipAddress: '', userAgent: '', timeoutMinutes: 30 });
  await m5.createSession({ userId: 1, userName: 'B', ipAddress: '', userAgent: '', timeoutMinutes: 30 });
  const s3 = await m5.createSession({ userId: 1, userName: 'C', ipAddress: '', userAgent: '', timeoutMinutes: 30 });
  loud();
  (m5 as any).sessions.get(s3.id).expiresAt = new Date(Date.now() - 1000);

  const status = await m5.getSystemStatus();
  assertEq(status.totalSessions, 3, 'total=3');
  assertEq(status.activeSessions, 2, 'active=2');
  assertEq(status.expiredSessions, 1, 'expired=1');
  assertEq(status.enabled, true, 'enabled from config');
  assertEq(status.maxConcurrentSessions, 5, 'max from config');
  assertEq(status.defaultTimeoutMinutes, 30, 'timeout from config');
  assert(status.lastCleanup instanceof Date, 'lastCleanup is Date');
}

// ============================================================================
// loadConfig — successful read merges
// ============================================================================
console.log('\n── loadConfig: successful read ───────────────────────────');

{
  readFileShouldFail = false;
  readFileContent = JSON.stringify({ maxConcurrentSessions: 99, requirePassword: true });
  quiet();
  const m6 = new JITSessionManager();
  await new Promise(r => setImmediate(r));
  loud();
  const cfg = await m6.getConfig();
  assertEq(cfg.maxConcurrentSessions, 99, 'merged max');
  assertEq(cfg.requirePassword, true, 'merged password');
  assertEq(cfg.enabled, true, 'default enabled still present');
  readFileShouldFail = true;
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);

// Restore fs
fs.promises.readFile = origReadFile;
fs.promises.writeFile = origWriteFile;
fs.promises.mkdir = origMkdir;
(global as any).setInterval = origSetInterval;

if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
