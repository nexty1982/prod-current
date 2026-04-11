#!/usr/bin/env npx tsx
/**
 * Unit tests for services/jitSessionManager.js (OMD-1052)
 *
 * Class-based JIT (Just-In-Time) terminal session manager. Sessions live
 * in an in-memory Map; fs is used only for persisting config (loadConfig
 * runs fire-and-forget from constructor, saveConfig is called on update).
 *
 * Strategy: stub `fs.promises` (readFile/writeFile/mkdir) via require.cache
 * BEFORE requiring the SUT so the constructor's loadConfig call is a no-op.
 * Each test block instantiates a fresh JITSessionManager and immediately
 * clears its internal setInterval handle (captured via globalThis hook).
 *
 * Coverage:
 *   - constructor defaults
 *   - generateSessionId (32 hex chars)
 *   - validateConfig: all 5 branches valid/invalid + accumulation
 *   - createSession: fields, expiresAt math, stored in map
 *   - getSession: null for unknown, ISO serialization, timeRemaining math,
 *                 isActive reflects both flag AND expiry
 *   - getSessions: filters by userId, includeAll, sorted newest first
 *   - getActiveSessions: excludes inactive + expired
 *   - updateSessionActivity: updates lastActivity, no-op on unknown
 *   - terminateSession: sets isActive=false, records terminatedAt, returns true
 *   - cleanupExpiredSessions: flips expired+active sessions to inactive
 *   - getSystemStatus: total/active/expired counts
 *   - getConfig: returns a shallow clone
 *   - updateConfig: valid merges + saves; invalid throws
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

// ── fs.promises stub ──────────────────────────────────────────────────
// JIT manager calls fs.promises.readFile in constructor (fire-and-forget)
// and fs.promises.writeFile/mkdir in saveConfig. We intercept all three.

type FsCall = { method: string; args: any[] };
const fsCalls: FsCall[] = [];
let readFileThrows = true;  // Default: config file doesn't exist
let writeFileThrows = false;

const fsStub = {
  promises: {
    readFile: async (...args: any[]) => {
      fsCalls.push({ method: 'readFile', args });
      if (readFileThrows) {
        const err: any = new Error('ENOENT');
        err.code = 'ENOENT';
        throw err;
      }
      return '{"enabled":true}';
    },
    writeFile: async (...args: any[]) => {
      fsCalls.push({ method: 'writeFile', args });
      if (writeFileThrows) throw new Error('write failed');
    },
    mkdir: async (...args: any[]) => {
      fsCalls.push({ method: 'mkdir', args });
    },
  },
};

// fs module has both sync API and .promises. We only need .promises.
const fsPath = require.resolve('fs');
require.cache[fsPath] = {
  id: fsPath,
  filename: fsPath,
  loaded: true,
  exports: fsStub,
} as any;

// Silence console noise from the SUT
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// Track intervals so we can clear them
const origSetInterval = global.setInterval;
const intervalHandles: NodeJS.Timeout[] = [];
(global as any).setInterval = (fn: any, ms: number) => {
  const h = origSetInterval(fn, ms);
  intervalHandles.push(h);
  return h;
};

quiet();
const JITSessionManager = require('../jitSessionManager');
loud();

function freshManager(): any {
  quiet();
  const mgr = new JITSessionManager();
  loud();
  return mgr;
}

function cleanupIntervals(): void {
  for (const h of intervalHandles) clearInterval(h);
  intervalHandles.length = 0;
}

async function main() {

// ============================================================================
// Constructor defaults
// ============================================================================
console.log('\n── constructor defaults ──────────────────────────────────');

{
  const mgr = freshManager();
  assertEq(mgr.config.enabled, true, 'enabled=true');
  assertEq(mgr.config.maxConcurrentSessions, 5, 'maxConcurrentSessions=5');
  assertEq(mgr.config.defaultTimeoutMinutes, 30, 'defaultTimeoutMinutes=30');
  assertEq(mgr.config.requirePassword, false, 'requirePassword=false');
  assertEq(mgr.config.allowInProduction, false, 'allowInProduction=false');
  assert(mgr.sessions instanceof Map, 'sessions is a Map');
  assertEq(mgr.sessions.size, 0, 'sessions empty');
}

// ============================================================================
// generateSessionId
// ============================================================================
console.log('\n── generateSessionId ─────────────────────────────────────');

{
  const mgr = freshManager();
  const id1 = mgr.generateSessionId();
  const id2 = mgr.generateSessionId();
  assert(typeof id1 === 'string', 'string');
  assertEq(id1.length, 32, '32 hex chars');
  assert(/^[0-9a-f]+$/.test(id1), 'hex only');
  assert(id1 !== id2, 'unique');
}

// ============================================================================
// validateConfig
// ============================================================================
console.log('\n── validateConfig ────────────────────────────────────────');

{
  const mgr = freshManager();

  // All valid
  const ok = mgr.validateConfig({
    enabled: true,
    maxConcurrentSessions: 5,
    defaultTimeoutMinutes: 30,
    requirePassword: false,
    allowInProduction: false,
  });
  assertEq(ok.valid, true, 'full valid');
  assertEq(ok.errors, [], 'no errors');

  // Bad enabled
  const badEnabled = mgr.validateConfig({
    enabled: 'yes',
    maxConcurrentSessions: 5,
    defaultTimeoutMinutes: 30,
    requirePassword: false,
    allowInProduction: false,
  });
  assertEq(badEnabled.valid, false, 'bad enabled invalid');
  assert(badEnabled.errors[0].includes('enabled'), 'mentions enabled');

  // Bad maxConcurrentSessions (not number)
  const badMax = mgr.validateConfig({
    enabled: true,
    maxConcurrentSessions: 'lots',
    defaultTimeoutMinutes: 30,
    requirePassword: false,
    allowInProduction: false,
  });
  assertEq(badMax.valid, false, 'bad max invalid');
  assert(badMax.errors[0].includes('maxConcurrentSessions'), 'mentions max');

  // maxConcurrentSessions = 0 → invalid
  const zeroMax = mgr.validateConfig({
    enabled: true,
    maxConcurrentSessions: 0,
    defaultTimeoutMinutes: 30,
    requirePassword: false,
    allowInProduction: false,
  });
  assertEq(zeroMax.valid, false, 'zero max invalid');

  // maxConcurrentSessions = 1 (boundary) → valid
  const oneMax = mgr.validateConfig({
    enabled: true,
    maxConcurrentSessions: 1,
    defaultTimeoutMinutes: 1,
    requirePassword: false,
    allowInProduction: false,
  });
  assertEq(oneMax.valid, true, '1 max valid (boundary)');

  // Bad defaultTimeoutMinutes
  const badTimeout = mgr.validateConfig({
    enabled: true,
    maxConcurrentSessions: 5,
    defaultTimeoutMinutes: 0,
    requirePassword: false,
    allowInProduction: false,
  });
  assertEq(badTimeout.valid, false, 'zero timeout invalid');

  // Bad requirePassword
  const badReq = mgr.validateConfig({
    enabled: true,
    maxConcurrentSessions: 5,
    defaultTimeoutMinutes: 30,
    requirePassword: 'nope',
    allowInProduction: false,
  });
  assertEq(badReq.valid, false, 'bad requirePassword invalid');

  // Bad allowInProduction
  const badProd = mgr.validateConfig({
    enabled: true,
    maxConcurrentSessions: 5,
    defaultTimeoutMinutes: 30,
    requirePassword: false,
    allowInProduction: 'nah',
  });
  assertEq(badProd.valid, false, 'bad allowInProduction invalid');

  // Multiple errors accumulate
  const multi = mgr.validateConfig({
    enabled: 'x',
    maxConcurrentSessions: -1,
    defaultTimeoutMinutes: 'long',
    requirePassword: 1,
    allowInProduction: null,
  });
  assertEq(multi.valid, false, 'multi invalid');
  assertEq(multi.errors.length, 5, 'all 5 errors');
}

// ============================================================================
// createSession
// ============================================================================
console.log('\n── createSession ─────────────────────────────────────────');

{
  const mgr = freshManager();
  quiet();
  const before = Date.now();
  const s = await mgr.createSession({
    userId: 10,
    userName: 'alice',
    ipAddress: '1.2.3.4',
    userAgent: 'ua',
    timeoutMinutes: 30,
  });
  loud();
  assert(typeof s.id === 'string', 'id is string');
  assertEq(s.id.length, 32, 'id is 32 hex');
  assertEq(s.userId, 10, 'userId stored');
  assertEq(s.userName, 'alice', 'userName stored');
  assertEq(s.ipAddress, '1.2.3.4', 'ipAddress stored');
  assertEq(s.userAgent, 'ua', 'userAgent stored');
  assertEq(s.isActive, true, 'active by default');
  assert(s.createdAt instanceof Date, 'createdAt Date');
  assert(s.expiresAt instanceof Date, 'expiresAt Date');
  assert(s.lastActivity instanceof Date, 'lastActivity Date');
  // expiresAt ≈ before + 30 min
  const delta = s.expiresAt.getTime() - before;
  assert(delta >= 30 * 60 * 1000 && delta < 30 * 60 * 1000 + 1000, 'expiresAt ≈ +30min');
  assertEq(mgr.sessions.size, 1, 'stored in map');
  assertEq(mgr.sessions.get(s.id).userId, 10, 'retrievable by id');
}

// ============================================================================
// getSession
// ============================================================================
console.log('\n── getSession ────────────────────────────────────────────');

{
  const mgr = freshManager();
  const missing = await mgr.getSession('nosuch');
  assertEq(missing, null, 'unknown → null');

  quiet();
  const raw = await mgr.createSession({
    userId: 1, userName: 'bob', ipAddress: '5.6.7.8', userAgent: 'ua', timeoutMinutes: 15,
  });
  loud();
  const s = await mgr.getSession(raw.id);
  assert(s !== null, 'found');
  assertEq(s.id, raw.id, 'id matches');
  assertEq(s.userId, 1, 'userId');
  assertEq(s.userName, 'bob', 'userName');
  assert(typeof s.createdAt === 'string', 'createdAt serialized as ISO string');
  assert(/T/.test(s.createdAt), 'ISO format');
  assert(typeof s.timeRemaining === 'number', 'timeRemaining number');
  assert(s.timeRemaining >= 14 && s.timeRemaining <= 15, 'timeRemaining ≈ 15 (floored)');
  assertEq(s.isActive, true, 'isActive true');
}

// isActive false when expired
{
  const mgr = freshManager();
  quiet();
  const raw = await mgr.createSession({
    userId: 1, userName: 'bob', ipAddress: '', userAgent: '', timeoutMinutes: 30,
  });
  loud();
  // Force expiry
  mgr.sessions.get(raw.id).expiresAt = new Date(Date.now() - 60000);
  const s = await mgr.getSession(raw.id);
  assertEq(s.isActive, false, 'expired → isActive false');
  assertEq(s.timeRemaining, 0, 'timeRemaining=0 after expiry');
}

// isActive false when terminated (isActive flag off)
{
  const mgr = freshManager();
  quiet();
  const raw = await mgr.createSession({
    userId: 1, userName: 'bob', ipAddress: '', userAgent: '', timeoutMinutes: 30,
  });
  loud();
  mgr.sessions.get(raw.id).isActive = false;
  const s = await mgr.getSession(raw.id);
  assertEq(s.isActive, false, 'isActive flag off → false');
}

// ============================================================================
// getSessions
// ============================================================================
console.log('\n── getSessions ───────────────────────────────────────────');

{
  const mgr = freshManager();
  quiet();
  const s1 = await mgr.createSession({
    userId: 1, userName: 'alice', ipAddress: 'a', userAgent: '', timeoutMinutes: 30,
  });
  await new Promise(r => setTimeout(r, 5));
  const s2 = await mgr.createSession({
    userId: 1, userName: 'alice', ipAddress: 'a', userAgent: '', timeoutMinutes: 30,
  });
  await new Promise(r => setTimeout(r, 5));
  const s3 = await mgr.createSession({
    userId: 2, userName: 'bob', ipAddress: 'b', userAgent: '', timeoutMinutes: 30,
  });
  loud();

  // By userId
  const alice = await mgr.getSessions(1);
  assertEq(alice.length, 2, 'alice has 2 sessions');
  // Sorted newest-first
  assert(alice[0].id === s2.id, 'alice[0] = newest (s2)');
  assert(alice[1].id === s1.id, 'alice[1] = older (s1)');

  // includeAll
  const all = await mgr.getSessions(null, true);
  assertEq(all.length, 3, 'includeAll → 3');

  // userId with no sessions
  const noone = await mgr.getSessions(999);
  assertEq(noone.length, 0, 'unknown userId → []');
}

// ============================================================================
// getActiveSessions
// ============================================================================
console.log('\n── getActiveSessions ─────────────────────────────────────');

{
  const mgr = freshManager();
  quiet();
  const s1 = await mgr.createSession({
    userId: 1, userName: 'alice', ipAddress: '', userAgent: '', timeoutMinutes: 30,
  });
  const s2 = await mgr.createSession({
    userId: 1, userName: 'alice', ipAddress: '', userAgent: '', timeoutMinutes: 30,
  });
  const s3 = await mgr.createSession({
    userId: 1, userName: 'alice', ipAddress: '', userAgent: '', timeoutMinutes: 30,
  });
  loud();
  // Expire s2, terminate s3
  mgr.sessions.get(s2.id).expiresAt = new Date(Date.now() - 60000);
  mgr.sessions.get(s3.id).isActive = false;

  const active = await mgr.getActiveSessions(1);
  assertEq(active.length, 1, 'only 1 active');
  assertEq(active[0].id, s1.id, 's1 is active');
}

// ============================================================================
// updateSessionActivity
// ============================================================================
console.log('\n── updateSessionActivity ─────────────────────────────────');

{
  const mgr = freshManager();
  quiet();
  const s = await mgr.createSession({
    userId: 1, userName: 'alice', ipAddress: '', userAgent: '', timeoutMinutes: 30,
  });
  loud();
  const before = mgr.sessions.get(s.id).lastActivity;
  await new Promise(r => setTimeout(r, 10));
  await mgr.updateSessionActivity(s.id);
  const after = mgr.sessions.get(s.id).lastActivity;
  assert(after.getTime() > before.getTime(), 'lastActivity updated');

  // Unknown session → no-op, no throw
  let threw = false;
  try { await mgr.updateSessionActivity('nosuch'); }
  catch { threw = true; }
  assertEq(threw, false, 'unknown id → no throw');
}

// ============================================================================
// terminateSession
// ============================================================================
console.log('\n── terminateSession ──────────────────────────────────────');

{
  const mgr = freshManager();
  quiet();
  const s = await mgr.createSession({
    userId: 1, userName: 'alice', ipAddress: '', userAgent: '', timeoutMinutes: 30,
  });
  const result = await mgr.terminateSession(s.id);
  loud();
  assertEq(result, true, 'returns true');
  const stored = mgr.sessions.get(s.id);
  assertEq(stored.isActive, false, 'isActive=false');
  assert(stored.terminatedAt instanceof Date, 'terminatedAt Date set');

  // Unknown id → still returns true, doesn't throw
  quiet();
  const result2 = await mgr.terminateSession('nosuch');
  loud();
  assertEq(result2, true, 'unknown id → true (idempotent)');
}

// ============================================================================
// cleanupExpiredSessions
// ============================================================================
console.log('\n── cleanupExpiredSessions ────────────────────────────────');

{
  const mgr = freshManager();
  quiet();
  const s1 = await mgr.createSession({
    userId: 1, userName: 'alice', ipAddress: '', userAgent: '', timeoutMinutes: 30,
  });
  const s2 = await mgr.createSession({
    userId: 1, userName: 'alice', ipAddress: '', userAgent: '', timeoutMinutes: 30,
  });
  const s3 = await mgr.createSession({
    userId: 1, userName: 'alice', ipAddress: '', userAgent: '', timeoutMinutes: 30,
  });
  loud();
  // Expire s1 and s3
  mgr.sessions.get(s1.id).expiresAt = new Date(Date.now() - 10000);
  mgr.sessions.get(s3.id).expiresAt = new Date(Date.now() - 10000);

  quiet();
  mgr.cleanupExpiredSessions();
  loud();

  assertEq(mgr.sessions.get(s1.id).isActive, false, 's1 expired → cleaned');
  assertEq(mgr.sessions.get(s2.id).isActive, true, 's2 still active');
  assertEq(mgr.sessions.get(s3.id).isActive, false, 's3 expired → cleaned');
  assert(mgr.sessions.get(s1.id).terminatedAt instanceof Date, 's1 terminatedAt set');
  assert(mgr.sessions.get(s3.id).terminatedAt instanceof Date, 's3 terminatedAt set');
}

// Already-inactive expired session → not touched (is in map but isActive=false)
{
  const mgr = freshManager();
  quiet();
  const s = await mgr.createSession({
    userId: 1, userName: 'alice', ipAddress: '', userAgent: '', timeoutMinutes: 30,
  });
  loud();
  mgr.sessions.get(s.id).expiresAt = new Date(Date.now() - 10000);
  mgr.sessions.get(s.id).isActive = false;
  // No terminatedAt yet
  mgr.cleanupExpiredSessions();
  assertEq(mgr.sessions.get(s.id).terminatedAt, undefined, 'already-inactive session not re-touched');
}

// ============================================================================
// getSystemStatus
// ============================================================================
console.log('\n── getSystemStatus ───────────────────────────────────────');

{
  const mgr = freshManager();
  quiet();
  const s1 = await mgr.createSession({
    userId: 1, userName: 'a', ipAddress: '', userAgent: '', timeoutMinutes: 30,
  });
  const s2 = await mgr.createSession({
    userId: 1, userName: 'a', ipAddress: '', userAgent: '', timeoutMinutes: 30,
  });
  const s3 = await mgr.createSession({
    userId: 1, userName: 'a', ipAddress: '', userAgent: '', timeoutMinutes: 30,
  });
  loud();
  // Expire s2
  mgr.sessions.get(s2.id).expiresAt = new Date(Date.now() - 10000);

  const status = await mgr.getSystemStatus();
  assertEq(status.enabled, true, 'enabled passed through');
  assertEq(status.totalSessions, 3, 'total=3');
  assertEq(status.activeSessions, 2, 'active=2');
  assertEq(status.expiredSessions, 1, 'expired=1');
  assertEq(status.maxConcurrentSessions, 5, 'max passed through');
  assertEq(status.defaultTimeoutMinutes, 30, 'timeout passed through');
  assert(status.lastCleanup instanceof Date, 'lastCleanup is Date');
}

// ============================================================================
// getConfig
// ============================================================================
console.log('\n── getConfig ─────────────────────────────────────────────');

{
  const mgr = freshManager();
  const cfg = await mgr.getConfig();
  assertEq(cfg.enabled, true, 'enabled');
  // Should be a copy, not a reference
  cfg.enabled = false;
  assertEq(mgr.config.enabled, true, 'mutations to returned copy do not affect internal');
}

// ============================================================================
// updateConfig
// ============================================================================
console.log('\n── updateConfig ──────────────────────────────────────────');

{
  const mgr = freshManager();
  fsCalls.length = 0;
  writeFileThrows = false;

  quiet();
  const newCfg = await mgr.updateConfig({
    enabled: false,
    maxConcurrentSessions: 10,
    defaultTimeoutMinutes: 60,
    requirePassword: true,
    allowInProduction: true,
  }, { id: 7, name: 'admin' });
  loud();

  assertEq(newCfg.enabled, false, 'enabled updated');
  assertEq(newCfg.maxConcurrentSessions, 10, 'max updated');
  assertEq(mgr.config.enabled, false, 'internal updated');
  // saveConfig called mkdir + writeFile
  const mkdirCalls = fsCalls.filter(c => c.method === 'mkdir');
  const writeCalls = fsCalls.filter(c => c.method === 'writeFile');
  assert(mkdirCalls.length >= 1, 'mkdir called');
  assert(writeCalls.length >= 1, 'writeFile called');
  // writeFile content is JSON-stringified config
  const written = JSON.parse(writeCalls[0].args[1]);
  assertEq(written.enabled, false, 'persisted enabled');
  assertEq(written.maxConcurrentSessions, 10, 'persisted max');
}

// Partial update merges (unspecified fields need to already be set in existing config)
{
  const mgr = freshManager();
  fsCalls.length = 0;
  // validateConfig requires all 5 fields, but updateConfig validates the *merged*
  // object only via validateConfig(newConfig), which is the INPUT not merged.
  // So we need to pass all fields in to pass validation.
  quiet();
  const result = await mgr.updateConfig({
    enabled: true,
    maxConcurrentSessions: 3,
    defaultTimeoutMinutes: 15,
    requirePassword: false,
    allowInProduction: false,
  }, { id: 1, name: 'u' });
  loud();
  assertEq(result.maxConcurrentSessions, 3, 'merged max');
}

// Invalid config → throws, config unchanged
{
  const mgr = freshManager();
  const prev = { ...mgr.config };
  let caught: any = null;
  quiet();
  try {
    await mgr.updateConfig({
      enabled: 'x',
      maxConcurrentSessions: 5,
      defaultTimeoutMinutes: 30,
      requirePassword: false,
      allowInProduction: false,
    }, { id: 1, name: 'u' });
  } catch (e) { caught = e; }
  loud();
  assert(caught instanceof Error, 'throws');
  assert(/Invalid configuration/.test(caught.message), 'mentions invalid');
  assertEq(mgr.config.enabled, prev.enabled, 'config unchanged');
}

// Write failure is swallowed by saveConfig (doesn't throw)
{
  const mgr = freshManager();
  writeFileThrows = true;
  quiet();
  let caught: any = null;
  try {
    await mgr.updateConfig({
      enabled: true,
      maxConcurrentSessions: 5,
      defaultTimeoutMinutes: 30,
      requirePassword: false,
      allowInProduction: false,
    }, { id: 1, name: 'u' });
  } catch (e) { caught = e; }
  loud();
  writeFileThrows = false;
  assertEq(caught, null, 'write failure swallowed (saveConfig catches)');
}

// ============================================================================
// Summary
// ============================================================================
cleanupIntervals();
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main()

main().catch((e) => { loud(); cleanupIntervals(); console.error('Unhandled:', e); process.exit(1); });
