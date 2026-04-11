#!/usr/bin/env npx tsx
/**
 * Unit tests for services/jitSessionManager.js (OMD-1175)
 *
 * Class-based JIT terminal session manager. No DB — stores sessions in
 * an in-memory Map and persists config to ../data/jit-config.json.
 *
 * Setup caveats:
 *   1. Constructor schedules `setInterval(cleanupExpiredSessions, 60_000)`.
 *      We monkey-patch global `setInterval` BEFORE requiring the SUT so the
 *      timer never fires and doesn't keep the process alive.
 *   2. Constructor fire-and-forgets `loadConfig()` which reads from disk.
 *      We patch `fs.promises.readFile` / writeFile / mkdir BEFORE requiring
 *      the SUT to intercept file I/O.
 *
 * Coverage:
 *   - constructor: default config, empty sessions, setInterval registered
 *   - getConfig: returns a copy (mutation does not leak)
 *   - updateConfig: valid merge + log, invalid throws, partial override
 *   - createSession: generates 32-char hex ID, sets expiresAt = now + tmin*60s
 *   - getSession: unknown → null; expired → isActive=false; timeRemaining
 *   - getSessions: user filter vs includeAll; sort desc by createdAt
 *   - getActiveSessions: filters inactive / expired
 *   - updateSessionActivity: updates lastActivity; no-op for unknown
 *   - terminateSession: isActive=false + terminatedAt; unknown still true
 *   - getSystemStatus: total / active / expired counts, config echoed
 *   - cleanupExpiredSessions: marks expired sessions inactive
 *   - generateSessionId: 32-char hex, unique across calls
 *   - validateConfig: type and range checks on all 5 fields
 *   - loadConfig: missing file silently uses default
 *   - saveConfig: calls mkdir recursive + writeFile JSON; error swallowed
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

// ── Patch setInterval so the SUT constructor doesn't keep the event
//    loop alive (60s cleanup timer). Capture the callback so we can
//    exercise cleanupExpiredSessions manually.
const origSetInterval = global.setInterval;
const intervalCallbacks: Array<() => void> = [];
(global as any).setInterval = (cb: () => void, _ms: number) => {
  intervalCallbacks.push(cb);
  // Return a fake timer handle
  return { unref: () => {}, ref: () => {} } as any;
};

// ── Patch fs.promises BEFORE requiring SUT. jitSessionManager uses
//    `require('fs').promises` to read/write `../data/jit-config.json`.
const fs = require('fs');
const origReadFile = fs.promises.readFile;
const origWriteFile = fs.promises.writeFile;
const origMkdir = fs.promises.mkdir;

type FsCall = { fn: string; args: any[] };
const fsLog: FsCall[] = [];
let readFileResult: any = null;         // set to string to succeed; null rejects
let readFileThrows = true;
let writeFileThrows = false;
let mkdirThrows = false;

fs.promises.readFile = async (...args: any[]) => {
  fsLog.push({ fn: 'readFile', args });
  if (readFileThrows) throw new Error('ENOENT: no such file');
  return readFileResult;
};
fs.promises.writeFile = async (...args: any[]) => {
  fsLog.push({ fn: 'writeFile', args });
  if (writeFileThrows) throw new Error('EIO');
  return undefined;
};
fs.promises.mkdir = async (...args: any[]) => {
  fsLog.push({ fn: 'mkdir', args });
  if (mkdirThrows) throw new Error('EIO');
  return undefined;
};

function resetFs() {
  fsLog.length = 0;
  readFileResult = null;
  readFileThrows = true;
  writeFileThrows = false;
  mkdirThrows = false;
}

// Silence noisy logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const JITSessionManager = require('../jitSessionManager');

async function main() {

// ============================================================================
// constructor
// ============================================================================
console.log('\n── constructor ───────────────────────────────────────────');

resetFs();
quiet();
{
  const mgr = new JITSessionManager();
  loud();
  assert(mgr.sessions instanceof Map, 'sessions is Map');
  assertEq(mgr.sessions.size, 0, 'sessions empty');
  assertEq(mgr.config.enabled, true, 'enabled default true');
  assertEq(mgr.config.maxConcurrentSessions, 5, 'maxConcurrentSessions default 5');
  assertEq(mgr.config.defaultTimeoutMinutes, 30, 'defaultTimeoutMinutes default 30');
  assertEq(mgr.config.requirePassword, false, 'requirePassword default false');
  assertEq(mgr.config.allowInProduction, false, 'allowInProduction default false');
  assert(intervalCallbacks.length >= 1, 'setInterval registered (cleanup timer)');
}

// ============================================================================
// getConfig — returns a copy
// ============================================================================
console.log('\n── getConfig ─────────────────────────────────────────────');

resetFs();
quiet();
{
  const mgr = new JITSessionManager();
  const cfg = await mgr.getConfig();
  loud();
  assertEq(cfg.enabled, true, 'copy has enabled');
  cfg.enabled = false;
  assertEq(mgr.config.enabled, true, 'mutation of copy does not affect original');
}

// ============================================================================
// updateConfig — valid merge + invalid throws
// ============================================================================
console.log('\n── updateConfig ──────────────────────────────────────────');

resetFs();
quiet();
{
  const mgr = new JITSessionManager();
  const updated = await mgr.updateConfig(
    { maxConcurrentSessions: 10, defaultTimeoutMinutes: 60, enabled: false, requirePassword: true, allowInProduction: true },
    { id: 7, name: 'admin' }
  );
  loud();
  assertEq(updated.maxConcurrentSessions, 10, 'merged maxConcurrentSessions');
  assertEq(updated.enabled, false, 'merged enabled');
  assertEq(updated.requirePassword, true, 'merged requirePassword');
  // saveConfig path uses mkdir + writeFile
  const wrote = fsLog.filter(c => c.fn === 'writeFile');
  assert(wrote.length >= 1, 'writeFile called');
  const written = JSON.parse(wrote[wrote.length - 1].args[1]);
  assertEq(written.maxConcurrentSessions, 10, 'persisted maxConcurrentSessions');
  assertEq(written.enabled, false, 'persisted enabled');
}

// Invalid config throws
resetFs();
quiet();
{
  const mgr = new JITSessionManager();
  let caught: any = null;
  try {
    await mgr.updateConfig(
      { enabled: 'yes', maxConcurrentSessions: -1, defaultTimeoutMinutes: 0, requirePassword: 1, allowInProduction: null },
      { id: 1, name: 'x' }
    );
  } catch (e) {
    caught = e;
  }
  loud();
  assert(caught !== null, 'invalid config throws');
  assert(caught.message.includes('Invalid configuration'), 'error prefix');
  assert(caught.message.includes('enabled must be a boolean'), 'enabled error');
  assert(caught.message.includes('maxConcurrentSessions must be a positive number'), 'max error');
  assert(caught.message.includes('defaultTimeoutMinutes must be a positive number'), 'timeout error');
  assert(caught.message.includes('requirePassword must be a boolean'), 'pw error');
  assert(caught.message.includes('allowInProduction must be a boolean'), 'prod error');
}

// ============================================================================
// createSession
// ============================================================================
console.log('\n── createSession ─────────────────────────────────────────');

resetFs();
quiet();
{
  const mgr = new JITSessionManager();
  const before = Date.now();
  const session = await mgr.createSession({
    userId: 42,
    userName: 'alice',
    ipAddress: '10.0.0.1',
    userAgent: 'test/1.0',
    timeoutMinutes: 15,
  });
  loud();
  assert(typeof session.id === 'string' && /^[a-f0-9]{32}$/.test(session.id), 'id is 32-char hex');
  assertEq(session.userId, 42, 'userId');
  assertEq(session.userName, 'alice', 'userName');
  assertEq(session.isActive, true, 'isActive true');
  const expMs = session.expiresAt.getTime() - before;
  assert(expMs >= 15 * 60 * 1000 && expMs <= 15 * 60 * 1000 + 1000, 'expiresAt ~= now + 15min');
  assertEq(mgr.sessions.size, 1, 'session stored');
  assert(mgr.sessions.has(session.id), 'stored under generated id');
}

// ============================================================================
// getSession — unknown returns null, known returns view with timeRemaining
// ============================================================================
console.log('\n── getSession ────────────────────────────────────────────');

resetFs();
quiet();
{
  const mgr = new JITSessionManager();
  const unknown = await mgr.getSession('no-such-id');
  assertEq(unknown, null, 'unknown → null');

  const s = await mgr.createSession({
    userId: 1, userName: 'a', ipAddress: '1.1.1.1', userAgent: 'ua', timeoutMinutes: 10,
  });
  const view = await mgr.getSession(s.id);
  loud();
  assertEq(view.id, s.id, 'id');
  assertEq(view.userId, 1, 'userId');
  assert(typeof view.createdAt === 'string', 'createdAt serialized to ISO');
  assert(typeof view.expiresAt === 'string', 'expiresAt serialized to ISO');
  assert(view.timeRemaining >= 9 && view.timeRemaining <= 10, 'timeRemaining ~= 10 minutes');
  assertEq(view.isActive, true, 'isActive');
}

// Expired session: manually backdate expiresAt
resetFs();
quiet();
{
  const mgr = new JITSessionManager();
  const s = await mgr.createSession({
    userId: 1, userName: 'a', ipAddress: '1.1.1.1', userAgent: 'ua', timeoutMinutes: 5,
  });
  // Force expiry by rewinding
  const stored = mgr.sessions.get(s.id);
  stored.expiresAt = new Date(Date.now() - 1000);
  mgr.sessions.set(s.id, stored);
  const view = await mgr.getSession(s.id);
  loud();
  assertEq(view.isActive, false, 'expired → isActive false');
  assertEq(view.timeRemaining, 0, 'timeRemaining clamped at 0');
}

// ============================================================================
// getSessions — filter by userId / includeAll / sort
// ============================================================================
console.log('\n── getSessions ───────────────────────────────────────────');

resetFs();
quiet();
{
  const mgr = new JITSessionManager();
  const a1 = await mgr.createSession({ userId: 1, userName: 'alice', ipAddress: '1', userAgent: 'u', timeoutMinutes: 10 });
  const a2 = await mgr.createSession({ userId: 1, userName: 'alice', ipAddress: '1', userAgent: 'u', timeoutMinutes: 10 });
  const b1 = await mgr.createSession({ userId: 2, userName: 'bob', ipAddress: '2', userAgent: 'u', timeoutMinutes: 10 });

  // Backdate a1 so a2 is newer
  const a1Stored = mgr.sessions.get(a1.id);
  a1Stored.createdAt = new Date(Date.now() - 60_000);
  mgr.sessions.set(a1.id, a1Stored);

  // Filtered by userId=1
  const user1 = await mgr.getSessions(1);
  loud();
  assertEq(user1.length, 2, '2 sessions for user 1');
  assertEq(user1[0].id, a2.id, 'newest first (sort desc by createdAt)');
  assertEq(user1[1].id, a1.id, 'oldest last');
  assert(user1.every(s => s.userId === 1), 'only user 1');

  // includeAll
  quiet();
  const all = await mgr.getSessions(0, true);
  loud();
  assertEq(all.length, 3, 'includeAll returns all');
}

// ============================================================================
// getActiveSessions — filters inactive / expired
// ============================================================================
console.log('\n── getActiveSessions ─────────────────────────────────────');

resetFs();
quiet();
{
  const mgr = new JITSessionManager();
  const s1 = await mgr.createSession({ userId: 1, userName: 'a', ipAddress: '1', userAgent: 'u', timeoutMinutes: 10 });
  const s2 = await mgr.createSession({ userId: 1, userName: 'a', ipAddress: '1', userAgent: 'u', timeoutMinutes: 10 });
  // Expire s2
  const s2Stored = mgr.sessions.get(s2.id);
  s2Stored.expiresAt = new Date(Date.now() - 1);
  mgr.sessions.set(s2.id, s2Stored);
  const active = await mgr.getActiveSessions(1);
  loud();
  assertEq(active.length, 1, '1 active');
  assertEq(active[0].id, s1.id, 's1 remains active');
}

// ============================================================================
// updateSessionActivity
// ============================================================================
console.log('\n── updateSessionActivity ─────────────────────────────────');

resetFs();
quiet();
{
  const mgr = new JITSessionManager();
  const s = await mgr.createSession({ userId: 1, userName: 'a', ipAddress: '1', userAgent: 'u', timeoutMinutes: 10 });
  const stored = mgr.sessions.get(s.id);
  const origActivity = stored.lastActivity;
  // Rewind lastActivity so update is observable
  stored.lastActivity = new Date(Date.now() - 10_000);
  mgr.sessions.set(s.id, stored);
  await mgr.updateSessionActivity(s.id);
  const updated = mgr.sessions.get(s.id);
  loud();
  assert(updated.lastActivity.getTime() > Date.now() - 1000, 'lastActivity refreshed');
  // Unknown session: no throw
  quiet();
  await mgr.updateSessionActivity('no-such-id');
  loud();
  assert(true, 'unknown id → no throw');
}

// ============================================================================
// terminateSession
// ============================================================================
console.log('\n── terminateSession ──────────────────────────────────────');

resetFs();
quiet();
{
  const mgr = new JITSessionManager();
  const s = await mgr.createSession({ userId: 1, userName: 'a', ipAddress: '1', userAgent: 'u', timeoutMinutes: 10 });
  const r = await mgr.terminateSession(s.id);
  loud();
  assertEq(r, true, 'returns true');
  const stored = mgr.sessions.get(s.id);
  assertEq(stored.isActive, false, 'isActive false');
  assert(stored.terminatedAt instanceof Date, 'terminatedAt set');

  // Unknown still returns true (per contract)
  quiet();
  const r2 = await mgr.terminateSession('no-such-id');
  loud();
  assertEq(r2, true, 'unknown → still returns true');
}

// ============================================================================
// getSystemStatus
// ============================================================================
console.log('\n── getSystemStatus ───────────────────────────────────────');

resetFs();
quiet();
{
  const mgr = new JITSessionManager();
  // Start with zero
  let stat = await mgr.getSystemStatus();
  assertEq(stat.totalSessions, 0, 'zero total');
  assertEq(stat.activeSessions, 0, 'zero active');
  assertEq(stat.expiredSessions, 0, 'zero expired');
  assertEq(stat.enabled, true, 'echoes enabled');
  assertEq(stat.maxConcurrentSessions, 5, 'echoes maxConcurrent');

  // 1 active + 1 expired + 1 terminated
  const active = await mgr.createSession({ userId: 1, userName: 'a', ipAddress: '1', userAgent: 'u', timeoutMinutes: 10 });
  const expired = await mgr.createSession({ userId: 2, userName: 'b', ipAddress: '2', userAgent: 'u', timeoutMinutes: 10 });
  const expStored = mgr.sessions.get(expired.id);
  expStored.expiresAt = new Date(Date.now() - 1);
  mgr.sessions.set(expired.id, expStored);

  stat = await mgr.getSystemStatus();
  loud();
  assertEq(stat.totalSessions, 2, 'total 2');
  assertEq(stat.activeSessions, 1, 'active 1');
  assertEq(stat.expiredSessions, 1, 'expired 1');
}

// ============================================================================
// cleanupExpiredSessions
// ============================================================================
console.log('\n── cleanupExpiredSessions ────────────────────────────────');

resetFs();
quiet();
{
  const mgr = new JITSessionManager();
  const s1 = await mgr.createSession({ userId: 1, userName: 'a', ipAddress: '1', userAgent: 'u', timeoutMinutes: 10 });
  const s2 = await mgr.createSession({ userId: 1, userName: 'a', ipAddress: '1', userAgent: 'u', timeoutMinutes: 10 });
  // Expire s2
  const s2Stored = mgr.sessions.get(s2.id);
  s2Stored.expiresAt = new Date(Date.now() - 1);
  mgr.sessions.set(s2.id, s2Stored);
  assertEq(mgr.sessions.get(s2.id).isActive, true, 'pre-cleanup: s2 still marked active');
  mgr.cleanupExpiredSessions();
  loud();
  assertEq(mgr.sessions.get(s1.id).isActive, true, 's1 still active');
  assertEq(mgr.sessions.get(s2.id).isActive, false, 's2 marked inactive');
  assert(mgr.sessions.get(s2.id).terminatedAt instanceof Date, 's2 terminatedAt set');

  // No-op when nothing to clean
  quiet();
  mgr.cleanupExpiredSessions();
  loud();
  assertEq(mgr.sessions.get(s1.id).isActive, true, 's1 still active on second pass');
}

// ============================================================================
// generateSessionId — 32-char hex and unique
// ============================================================================
console.log('\n── generateSessionId ─────────────────────────────────────');

resetFs();
quiet();
{
  const mgr = new JITSessionManager();
  const ids = new Set();
  for (let i = 0; i < 20; i++) {
    const id = mgr.generateSessionId();
    assert(/^[a-f0-9]{32}$/.test(id), `id[${i}] is 32-char hex`);
    ids.add(id);
  }
  loud();
  assertEq(ids.size, 20, '20 unique ids');
}

// ============================================================================
// validateConfig
// ============================================================================
console.log('\n── validateConfig ────────────────────────────────────────');

resetFs();
quiet();
{
  const mgr = new JITSessionManager();
  loud();
  const good = mgr.validateConfig({
    enabled: true,
    maxConcurrentSessions: 5,
    defaultTimeoutMinutes: 30,
    requirePassword: false,
    allowInProduction: false,
  });
  assertEq(good.valid, true, 'all good → valid');
  assertEq(good.errors, [], 'no errors');

  const bad = mgr.validateConfig({
    enabled: 'yes' as any,
    maxConcurrentSessions: 0,
    defaultTimeoutMinutes: -5,
    requirePassword: 1 as any,
    allowInProduction: 'no' as any,
  });
  assertEq(bad.valid, false, 'all bad → invalid');
  assertEq(bad.errors.length, 5, '5 errors collected');

  const partial = mgr.validateConfig({
    enabled: true,
    maxConcurrentSessions: 10,
    defaultTimeoutMinutes: 30,
    requirePassword: false,
    allowInProduction: 'hmm' as any,
  });
  assertEq(partial.valid, false, 'partial bad → invalid');
  assertEq(partial.errors.length, 1, 'only 1 error');
  assert(partial.errors[0].includes('allowInProduction'), 'correct error');
}

// ============================================================================
// loadConfig — missing file silently uses default
// ============================================================================
console.log('\n── loadConfig ────────────────────────────────────────────');

resetFs();
// readFileThrows = true by default
quiet();
{
  const mgr = new JITSessionManager();
  // Wait for fire-and-forget loadConfig to settle
  await new Promise(r => setImmediate(r));
  loud();
  assertEq(mgr.config.enabled, true, 'default enabled preserved');
  const reads = fsLog.filter(c => c.fn === 'readFile');
  assert(reads.length >= 1, 'readFile attempted');
  assert(reads[0].args[0].includes('jit-config.json'), 'reads jit-config.json');
}

// loadConfig — file exists with override
resetFs();
readFileThrows = false;
readFileResult = JSON.stringify({ maxConcurrentSessions: 99, requirePassword: true });
quiet();
{
  const mgr = new JITSessionManager();
  await new Promise(r => setImmediate(r));
  loud();
  assertEq(mgr.config.maxConcurrentSessions, 99, 'override applied');
  assertEq(mgr.config.requirePassword, true, 'override requirePassword');
  // Other defaults preserved
  assertEq(mgr.config.defaultTimeoutMinutes, 30, 'other defaults preserved');
}

// loadConfig — invalid JSON → swallowed, defaults retained
resetFs();
readFileThrows = false;
readFileResult = 'not json {{{';
quiet();
{
  const mgr = new JITSessionManager();
  await new Promise(r => setImmediate(r));
  loud();
  assertEq(mgr.config.enabled, true, 'invalid JSON → defaults retained');
}

// ============================================================================
// saveConfig — success + error swallowed
// ============================================================================
console.log('\n── saveConfig ────────────────────────────────────────────');

resetFs();
quiet();
{
  const mgr = new JITSessionManager();
  await mgr.saveConfig();
  loud();
  const mkdirs = fsLog.filter(c => c.fn === 'mkdir');
  const writes = fsLog.filter(c => c.fn === 'writeFile');
  assert(mkdirs.length >= 1, 'mkdir called');
  assertEq(mkdirs[0].args[1].recursive, true, 'mkdir recursive');
  assert(writes.length >= 1, 'writeFile called');
  assert(writes[0].args[0].includes('jit-config.json'), 'writes to jit-config.json');
  const written = JSON.parse(writes[0].args[1]);
  assertEq(written.enabled, true, 'writes config as JSON');
}

// saveConfig — error swallowed
resetFs();
writeFileThrows = true;
quiet();
{
  const mgr = new JITSessionManager();
  let caught: any = null;
  try {
    await mgr.saveConfig();
  } catch (e) {
    caught = e;
  }
  loud();
  assert(caught === null, 'saveConfig error swallowed');
}

// ============================================================================
// Summary
// ============================================================================
// Restore patched globals
(global as any).setInterval = origSetInterval;
fs.promises.readFile = origReadFile;
fs.promises.writeFile = origWriteFile;
fs.promises.mkdir = origMkdir;

console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
