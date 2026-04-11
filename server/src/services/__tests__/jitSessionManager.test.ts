#!/usr/bin/env npx tsx
/**
 * Unit tests for services/jitSessionManager.js (OMD-1012)
 *
 * JIT terminal session manager. In-memory Map<sessionId, session>.
 * Pure except for constructor-level setInterval (cleanup every 60s) and
 * fs-based loadConfig/saveConfig. We avoid fs by never calling saveConfig
 * in tests except for one explicit case where we stub fs.promises.
 *
 * Note: constructor starts a setInterval(60000). Left unchecked, it keeps
 * the event loop alive and the test process never exits. We work around
 * this with `process.exit(0)` at the end of main().
 *
 * Coverage:
 *   - validateConfig: all error branches + valid path
 *   - constructor defaults (config shape)
 *   - getConfig returns a copy (not reference)
 *   - generateSessionId: 32-char hex (16 bytes × 2)
 *   - createSession: assigns id, expiresAt = now + timeoutMinutes, isActive=true
 *   - getSession: null when missing; timeRemaining calculation; isActive
 *     flag flips false after expiresAt
 *   - getSessions: filtered by userId; includeAll toggle; sorted desc by
 *     createdAt
 *   - getActiveSessions: filters out !isActive
 *   - updateSessionActivity: bumps lastActivity; no-op for missing
 *   - terminateSession: sets isActive=false + terminatedAt; returns true
 *     even for missing sessionId
 *   - getSystemStatus: totals/active/expired aggregation
 *   - cleanupExpiredSessions: flips expired+active → inactive
 *   - updateConfig: merges valid config; throws on invalid
 *     (saveConfig side-effect stubbed)
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

// Stub fs.promises to prevent loadConfig noise and allow saveConfig test
const writeLog: { path: string; data: string }[] = [];
const mkdirLog: string[] = [];
let fsReadThrows = true; // default: simulate no config file
let fsWriteThrows = false;

const fsPromisesStub = {
  readFile: async (_p: string) => {
    if (fsReadThrows) {
      const err: any = new Error('ENOENT');
      err.code = 'ENOENT';
      throw err;
    }
    return JSON.stringify({ enabled: false, maxConcurrentSessions: 10 });
  },
  writeFile: async (p: string, data: string) => {
    writeLog.push({ path: p, data });
    if (fsWriteThrows) throw new Error('EACCES');
  },
  mkdir: async (p: string, _opts: any) => {
    mkdirLog.push(p);
  },
};

// Replace fs.promises methods in-place before require.
// (fs.promises is defined via getter — can't be reassigned wholesale)
const realFs = require('fs');
const origReadFile = realFs.promises.readFile;
const origWriteFile = realFs.promises.writeFile;
const origMkdir = realFs.promises.mkdir;
realFs.promises.readFile = fsPromisesStub.readFile;
realFs.promises.writeFile = fsPromisesStub.writeFile;
realFs.promises.mkdir = fsPromisesStub.mkdir;

// Silence console
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
function loud() {
  console.log = origLog;
  console.warn = origWarn;
  console.error = origError;
}

// Require SUT (constructor will kick off setInterval + loadConfig)
quiet();
const JITSessionManager = require('../jitSessionManager');
loud();

async function main() {

// ============================================================================
// validateConfig
// ============================================================================
console.log('\n── validateConfig ────────────────────────────────────────');

quiet();
const mgr = new JITSessionManager();
loud();

{
  const v = mgr.validateConfig({
    enabled: true,
    maxConcurrentSessions: 5,
    defaultTimeoutMinutes: 30,
    requirePassword: false,
    allowInProduction: false,
  });
  assertEq(v.valid, true, 'valid config passes');
  assertEq(v.errors, [], 'no errors');
}

{
  const v = mgr.validateConfig({
    enabled: 'yes' as any,
    maxConcurrentSessions: 5,
    defaultTimeoutMinutes: 30,
    requirePassword: false,
    allowInProduction: false,
  });
  assertEq(v.valid, false, 'non-boolean enabled invalid');
  assert(v.errors.some((e: string) => e.includes('enabled')), 'enabled error');
}

{
  const v = mgr.validateConfig({
    enabled: true,
    maxConcurrentSessions: 0,
    defaultTimeoutMinutes: 30,
    requirePassword: false,
    allowInProduction: false,
  });
  assertEq(v.valid, false, 'maxConcurrentSessions=0 invalid');
  assert(v.errors.some((e: string) => e.includes('maxConcurrentSessions')),
    'maxConcurrentSessions error');
}

{
  const v = mgr.validateConfig({
    enabled: true,
    maxConcurrentSessions: 5,
    defaultTimeoutMinutes: 'thirty' as any,
    requirePassword: false,
    allowInProduction: false,
  });
  assertEq(v.valid, false, 'non-numeric defaultTimeoutMinutes invalid');
  assert(v.errors.some((e: string) => e.includes('defaultTimeoutMinutes')),
    'defaultTimeoutMinutes error');
}

{
  const v = mgr.validateConfig({
    enabled: true,
    maxConcurrentSessions: 5,
    defaultTimeoutMinutes: 30,
    requirePassword: null as any,
    allowInProduction: false,
  });
  assertEq(v.valid, false, 'null requirePassword invalid');
  assert(v.errors.some((e: string) => e.includes('requirePassword')),
    'requirePassword error');
}

{
  const v = mgr.validateConfig({
    enabled: true,
    maxConcurrentSessions: 5,
    defaultTimeoutMinutes: 30,
    requirePassword: false,
    allowInProduction: 1 as any,
  });
  assertEq(v.valid, false, 'numeric allowInProduction invalid');
  assert(v.errors.some((e: string) => e.includes('allowInProduction')),
    'allowInProduction error');
}

// Multiple errors aggregated
{
  const v = mgr.validateConfig({
    enabled: 1 as any,
    maxConcurrentSessions: -1,
    defaultTimeoutMinutes: 0,
    requirePassword: 'no' as any,
    allowInProduction: 'yes' as any,
  });
  assertEq(v.valid, false, 'multi-error invalid');
  assertEq(v.errors.length, 5, 'all 5 errors captured');
}

// ============================================================================
// getConfig (returns copy)
// ============================================================================
console.log('\n── getConfig ─────────────────────────────────────────────');

{
  const cfg = await mgr.getConfig();
  assertEq(cfg.enabled, true, 'default enabled=true');
  assertEq(cfg.maxConcurrentSessions, 5, 'default max=5');
  assertEq(cfg.defaultTimeoutMinutes, 30, 'default timeout=30');
  assertEq(cfg.requirePassword, false, 'default requirePassword=false');
  assertEq(cfg.allowInProduction, false, 'default allowInProduction=false');

  // Mutation of returned object should not affect internal state
  cfg.enabled = false;
  const cfg2 = await mgr.getConfig();
  assertEq(cfg2.enabled, true, 'returned config is a copy');
}

// ============================================================================
// generateSessionId
// ============================================================================
console.log('\n── generateSessionId ─────────────────────────────────────');

{
  const id1 = mgr.generateSessionId();
  const id2 = mgr.generateSessionId();
  assertEq(typeof id1, 'string', 'id is string');
  assertEq(id1.length, 32, '16 bytes hex = 32 chars');
  assert(/^[0-9a-f]{32}$/.test(id1), 'hex format');
  assert(id1 !== id2, 'ids are unique');
}

// ============================================================================
// createSession + getSession
// ============================================================================
console.log('\n── createSession / getSession ────────────────────────────');

quiet();
const s1 = await mgr.createSession({
  userId: 'user-1',
  userName: 'Alice',
  ipAddress: '1.2.3.4',
  userAgent: 'agent-A',
  timeoutMinutes: 60,
});
loud();

assertEq(typeof s1.id, 'string', 'session has id');
assertEq(s1.id.length, 32, 'id is 32 chars');
assertEq(s1.userId, 'user-1', 'userId set');
assertEq(s1.isActive, true, 'isActive=true');
assert(s1.createdAt instanceof Date, 'createdAt is Date');
assert(s1.expiresAt instanceof Date, 'expiresAt is Date');
assert(
  (s1.expiresAt as any) - (s1.createdAt as any) >= 60 * 60 * 1000 - 100,
  'expiresAt ≈ createdAt + 60min'
);

{
  const g = await mgr.getSession(s1.id);
  assert(g !== null, 'session found');
  assertEq(g.id, s1.id, 'getSession returns same id');
  assertEq(g.userId, 'user-1', 'userId in output');
  assertEq(typeof g.createdAt, 'string', 'createdAt serialized to string');
  assertEq(typeof g.expiresAt, 'string', 'expiresAt serialized');
  assertEq(typeof g.lastActivity, 'string', 'lastActivity serialized');
  assert(g.timeRemaining >= 59 && g.timeRemaining <= 60, 'timeRemaining ≈ 60min');
  assertEq(g.isActive, true, 'session isActive (not expired)');
}

{
  const g = await mgr.getSession('no-such-session');
  assertEq(g, null, 'missing session → null');
}

// ============================================================================
// getSession on expired session → isActive=false, timeRemaining=0
// ============================================================================
console.log('\n── getSession: expired ───────────────────────────────────');

quiet();
const sExpired = await mgr.createSession({
  userId: 'user-2',
  userName: 'Bob',
  ipAddress: '5.6.7.8',
  userAgent: 'agent-B',
  timeoutMinutes: 30,
});
loud();

// Forcibly expire it
(mgr as any).sessions.get(sExpired.id).expiresAt = new Date(Date.now() - 1000);

{
  const g = await mgr.getSession(sExpired.id);
  assertEq(g.timeRemaining, 0, 'timeRemaining=0 for expired');
  assertEq(g.isActive, false, 'isActive flips false when past expiresAt');
}

// ============================================================================
// getSessions / getActiveSessions
// ============================================================================
console.log('\n── getSessions / getActiveSessions ───────────────────────');

quiet();
// Create two more for user-1 (with small delays for sort stability)
const s1b = await mgr.createSession({
  userId: 'user-1',
  userName: 'Alice',
  ipAddress: '1.2.3.4',
  userAgent: 'agent-A2',
  timeoutMinutes: 30,
});
await new Promise(r => setTimeout(r, 2));
const s1c = await mgr.createSession({
  userId: 'user-1',
  userName: 'Alice',
  ipAddress: '1.2.3.4',
  userAgent: 'agent-A3',
  timeoutMinutes: 30,
});
loud();

{
  const list = await mgr.getSessions('user-1');
  // user-1 has s1, s1b, s1c
  assertEq(list.length, 3, 'user-1 has 3 sessions');
  // Most recent first
  assertEq(list[0].id, s1c.id, 'newest first');
  // All belong to user-1
  assert(list.every((s: any) => s.userId === 'user-1'), 'all user-1');
}

{
  const listAll = await mgr.getSessions('user-1', true);
  // All users: user-1 (3) + user-2 (1 expired) = 4
  assertEq(listAll.length, 4, 'includeAll=true returns all sessions');
}

{
  const other = await mgr.getSessions('nobody');
  assertEq(other.length, 0, 'no sessions for unknown user');
}

{
  const active = await mgr.getActiveSessions('user-1');
  assertEq(active.length, 3, '3 active for user-1');
  assert(active.every((s: any) => s.isActive), 'all isActive');
}

// user-2's only session is expired
{
  const active2 = await mgr.getActiveSessions('user-2');
  assertEq(active2.length, 0, 'user-2 has 0 active (1 expired)');
}

// ============================================================================
// updateSessionActivity
// ============================================================================
console.log('\n── updateSessionActivity ─────────────────────────────────');

{
  const before = (mgr as any).sessions.get(s1.id).lastActivity;
  await new Promise(r => setTimeout(r, 5));
  await mgr.updateSessionActivity(s1.id);
  const after = (mgr as any).sessions.get(s1.id).lastActivity;
  assert(after > before, 'lastActivity bumped');
}

// Missing id → no-op, no throw
{
  let threw = false;
  try {
    await mgr.updateSessionActivity('no-such');
  } catch { threw = true; }
  assertEq(threw, false, 'missing id: no throw');
}

// ============================================================================
// terminateSession
// ============================================================================
console.log('\n── terminateSession ──────────────────────────────────────');

quiet();
const sKill = await mgr.createSession({
  userId: 'user-3',
  userName: 'Carol',
  ipAddress: '9.9.9.9',
  userAgent: 'agent-C',
  timeoutMinutes: 30,
});
loud();

{
  quiet();
  const r = await mgr.terminateSession(sKill.id);
  loud();
  assertEq(r, true, 'terminateSession returns true');
  const internal = (mgr as any).sessions.get(sKill.id);
  assertEq(internal.isActive, false, 'isActive=false after terminate');
  assert(internal.terminatedAt instanceof Date, 'terminatedAt set');
}

// Missing id still returns true (no-op)
{
  const r = await mgr.terminateSession('no-such');
  assertEq(r, true, 'missing id returns true');
}

// ============================================================================
// cleanupExpiredSessions
// ============================================================================
console.log('\n── cleanupExpiredSessions ────────────────────────────────');

// Create a fresh manager to get a controlled count
quiet();
const mgr2 = new JITSessionManager();
loud();

quiet();
const a = await mgr2.createSession({
  userId: 'u', userName: 'U', ipAddress: 'x', userAgent: 'y', timeoutMinutes: 30,
});
const b = await mgr2.createSession({
  userId: 'u', userName: 'U', ipAddress: 'x', userAgent: 'y', timeoutMinutes: 30,
});
const c = await mgr2.createSession({
  userId: 'u', userName: 'U', ipAddress: 'x', userAgent: 'y', timeoutMinutes: 30,
});
loud();

// Expire a and b
(mgr2 as any).sessions.get(a.id).expiresAt = new Date(Date.now() - 5000);
(mgr2 as any).sessions.get(b.id).expiresAt = new Date(Date.now() - 5000);

quiet();
mgr2.cleanupExpiredSessions();
loud();

{
  assertEq((mgr2 as any).sessions.get(a.id).isActive, false, 'a expired → inactive');
  assertEq((mgr2 as any).sessions.get(b.id).isActive, false, 'b expired → inactive');
  assertEq((mgr2 as any).sessions.get(c.id).isActive, true, 'c still active');
  assert(
    (mgr2 as any).sessions.get(a.id).terminatedAt instanceof Date,
    'a has terminatedAt'
  );
}

// No-op when nothing expired
quiet();
mgr2.cleanupExpiredSessions();
loud();
// No assertion needed — just ensure no throw and no double-mark

// ============================================================================
// getSystemStatus
// ============================================================================
console.log('\n── getSystemStatus ───────────────────────────────────────');

{
  const status = await mgr2.getSystemStatus();
  assertEq(status.enabled, true, 'enabled from config');
  assertEq(status.totalSessions, 3, 'totalSessions=3');
  assertEq(status.activeSessions, 1, '1 active (c)');
  assertEq(status.expiredSessions, 2, '2 expired (a, b)');
  assertEq(status.maxConcurrentSessions, 5, 'maxConcurrentSessions');
  assertEq(status.defaultTimeoutMinutes, 30, 'defaultTimeoutMinutes');
  assertEq(status.requirePassword, false, 'requirePassword');
  assertEq(status.allowInProduction, false, 'allowInProduction');
  assert(status.lastCleanup instanceof Date, 'lastCleanup is Date');
}

// ============================================================================
// updateConfig
// ============================================================================
console.log('\n── updateConfig ──────────────────────────────────────────');

// Invalid config → throws
{
  let threw: Error | null = null;
  try {
    await mgr2.updateConfig({ enabled: 'bad' }, { id: 1, name: 'admin' });
  } catch (e: any) { threw = e; }
  assert(threw !== null, 'invalid config throws');
  assert(
    threw !== null && threw.message.includes('Invalid configuration'),
    'error mentions invalid configuration'
  );
}

// Valid config → merges and saves
writeLog.length = 0;
mkdirLog.length = 0;
{
  quiet();
  const updated = await mgr2.updateConfig(
    {
      enabled: false,
      maxConcurrentSessions: 10,
      defaultTimeoutMinutes: 60,
      requirePassword: true,
      allowInProduction: true,
    },
    { id: 1, name: 'admin' }
  );
  loud();
  assertEq(updated.enabled, false, 'enabled updated');
  assertEq(updated.maxConcurrentSessions, 10, 'max updated');
  assertEq(updated.defaultTimeoutMinutes, 60, 'timeout updated');
  assertEq(updated.requirePassword, true, 'requirePassword updated');
  assertEq(updated.allowInProduction, true, 'allowInProduction updated');
  assertEq(writeLog.length, 1, 'writeFile called once');
  assertEq(mkdirLog.length, 1, 'mkdir called once');
  assert(
    writeLog[0].path.endsWith('jit-config.json'),
    'writes to jit-config.json'
  );
  const saved = JSON.parse(writeLog[0].data);
  assertEq(saved.enabled, false, 'saved payload enabled');
  assertEq(saved.maxConcurrentSessions, 10, 'saved payload max');
}

// saveConfig swallows fs errors
writeLog.length = 0;
fsWriteThrows = true;
{
  quiet();
  // Should not throw even though writeFile throws
  const updated = await mgr2.updateConfig(
    {
      enabled: true,
      maxConcurrentSessions: 3,
      defaultTimeoutMinutes: 15,
      requirePassword: false,
      allowInProduction: false,
    },
    { id: 1, name: 'admin' }
  );
  loud();
  assertEq(updated.enabled, true, 'config still updated despite save failure');
  assertEq(updated.maxConcurrentSessions, 3, 'max still updated');
}
fsWriteThrows = false;

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);

// Force exit — the constructor's setInterval would otherwise keep the
// event loop alive forever.
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
