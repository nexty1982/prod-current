#!/usr/bin/env npx tsx
/**
 * Unit tests for services/jitSessionManager.js (OMD-992)
 *
 * Class-based in-memory session store. Constructor loads config from
 * disk (fire-and-forget) and sets up a cleanup setInterval. We stub
 * setInterval before requiring the SUT so tests don't hang.
 *
 * Coverage:
 *   - generateSessionId: hex, unique
 *   - validateConfig: all 5 rules
 *   - createSession: basic + expires calculation
 *   - getSession: found / not found, timeRemaining, isActive flag
 *   - getSessions: filter by userId, includeAll, sorting
 *   - getActiveSessions: filters out expired
 *   - updateSessionActivity: lastActivity updated
 *   - terminateSession: sets isActive=false
 *   - cleanupExpiredSessions: marks expired as inactive
 *   - getSystemStatus: counts + config passthrough
 *   - getConfig: returns copy
 *   - updateConfig: validates, merges, saves
 *
 * Run: npx tsx server/src/services/__tests__/jitSessionManager.test.ts
 */

// Stub setInterval before loading SUT — prevents test hang
const origSetInterval = global.setInterval;
(global as any).setInterval = (fn: any, ms: number) => {
  const t = origSetInterval(fn, ms);
  // @ts-ignore
  t.unref?.();
  return t;
};

// Stub fs to avoid writing to disk in updateConfig tests
const fsPath = require.resolve('fs');
const realFs = require('fs');
const fsStub = {
  ...realFs,
  promises: {
    ...realFs.promises,
    readFile: async () => { throw new Error('ENOENT'); },
    writeFile: async () => {},
    mkdir: async () => {},
  },
};
require.cache[fsPath] = {
  id: fsPath,
  filename: fsPath,
  loaded: true,
  exports: fsStub,
} as any;

const JITSessionManager = require('../jitSessionManager');

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

// Silence SUT logs
const origLog = console.log;
function quiet() { console.log = () => {}; }
function loud() { console.log = origLog; }

async function main() {

// ============================================================================
// generateSessionId
// ============================================================================
console.log('\n── generateSessionId ─────────────────────────────────────');

quiet();
const mgr = new JITSessionManager();
loud();

{
  const id1 = mgr.generateSessionId();
  const id2 = mgr.generateSessionId();
  assert(typeof id1 === 'string', 'returns string');
  assertEq(id1.length, 32, '32 hex chars (16 bytes)');
  assert(/^[0-9a-f]{32}$/.test(id1), 'hex format');
  assert(id1 !== id2, 'unique IDs');
}

// ============================================================================
// validateConfig
// ============================================================================
console.log('\n── validateConfig ────────────────────────────────────────');

{
  const good = {
    enabled: true,
    maxConcurrentSessions: 5,
    defaultTimeoutMinutes: 30,
    requirePassword: false,
    allowInProduction: false,
  };
  const result = mgr.validateConfig(good);
  assertEq(result.valid, true, 'all valid');
  assertEq(result.errors.length, 0, 'no errors');
}

// Bad enabled
{
  const r = mgr.validateConfig({
    enabled: 'true' as any,
    maxConcurrentSessions: 5,
    defaultTimeoutMinutes: 30,
    requirePassword: false,
    allowInProduction: false,
  });
  assertEq(r.valid, false, 'enabled string → invalid');
  assert(r.errors.some((e: string) => e.includes('enabled')), 'error mentions enabled');
}

// Bad maxConcurrentSessions
{
  const r = mgr.validateConfig({
    enabled: true,
    maxConcurrentSessions: 0,
    defaultTimeoutMinutes: 30,
    requirePassword: false,
    allowInProduction: false,
  });
  assertEq(r.valid, false, 'maxConcurrent 0 → invalid');
  assert(r.errors.some((e: string) => e.includes('maxConcurrentSessions')), 'error mentions maxConcurrentSessions');
}

// Bad defaultTimeoutMinutes
{
  const r = mgr.validateConfig({
    enabled: true,
    maxConcurrentSessions: 5,
    defaultTimeoutMinutes: -1,
    requirePassword: false,
    allowInProduction: false,
  });
  assertEq(r.valid, false, 'negative timeout → invalid');
}

// Bad requirePassword
{
  const r = mgr.validateConfig({
    enabled: true,
    maxConcurrentSessions: 5,
    defaultTimeoutMinutes: 30,
    requirePassword: 1 as any,
    allowInProduction: false,
  });
  assertEq(r.valid, false, 'requirePassword number → invalid');
}

// Bad allowInProduction
{
  const r = mgr.validateConfig({
    enabled: true,
    maxConcurrentSessions: 5,
    defaultTimeoutMinutes: 30,
    requirePassword: false,
    allowInProduction: 'no' as any,
  });
  assertEq(r.valid, false, 'allowInProduction string → invalid');
}

// Multiple errors
{
  const r = mgr.validateConfig({
    enabled: 'bad' as any,
    maxConcurrentSessions: -5,
    defaultTimeoutMinutes: 'x' as any,
    requirePassword: null as any,
    allowInProduction: 0 as any,
  });
  assertEq(r.valid, false, 'multi-bad');
  assertEq(r.errors.length, 5, '5 errors');
}

// ============================================================================
// createSession
// ============================================================================
console.log('\n── createSession ─────────────────────────────────────────');

quiet();
{
  const before = Date.now();
  const session = await mgr.createSession({
    userId: 42,
    userName: 'alice',
    ipAddress: '10.0.0.1',
    userAgent: 'UA',
    timeoutMinutes: 30,
  });
  loud();
  assert(typeof session.id === 'string' && session.id.length === 32, 'session id hex');
  assertEq(session.userId, 42, 'userId');
  assertEq(session.userName, 'alice', 'userName');
  assertEq(session.ipAddress, '10.0.0.1', 'ipAddress');
  assertEq(session.userAgent, 'UA', 'userAgent');
  assertEq(session.isActive, true, 'isActive');
  assert(session.createdAt instanceof Date, 'createdAt Date');
  assert(session.expiresAt instanceof Date, 'expiresAt Date');
  // 30 min → ~1800000ms
  const diff = session.expiresAt.getTime() - before;
  assert(diff >= 29 * 60 * 1000 && diff <= 31 * 60 * 1000, 'expires ~30min later');
  quiet();
}
loud();

// ============================================================================
// getSession
// ============================================================================
console.log('\n── getSession ────────────────────────────────────────────');

quiet();
const s1 = await mgr.createSession({ userId: 1, userName: 'u1', ipAddress: '1.1.1.1', userAgent: 'ua', timeoutMinutes: 30 });
loud();

{
  const got = await mgr.getSession(s1.id);
  assertEq(got.id, s1.id, 'correct id');
  assertEq(got.userId, 1, 'userId');
  assertEq(got.isActive, true, 'active');
  assert(typeof got.createdAt === 'string', 'createdAt ISO string');
  assert(typeof got.expiresAt === 'string', 'expiresAt ISO string');
  assert(got.timeRemaining > 25 && got.timeRemaining <= 30, 'timeRemaining ~30');
}

// Not found
{
  const got = await mgr.getSession('nonexistent');
  assertEq(got, null, 'not found → null');
}

// Expired session: isActive should be false
quiet();
const expired = await mgr.createSession({ userId: 1, userName: 'u1', ipAddress: '1.1.1.1', userAgent: 'ua', timeoutMinutes: 1 });
loud();
// Manually expire by setting expiresAt in the past
const internalMap: Map<string, any> = (mgr as any).sessions;
const expiredRaw = internalMap.get(expired.id);
expiredRaw.expiresAt = new Date(Date.now() - 10000);
{
  const got = await mgr.getSession(expired.id);
  assertEq(got.isActive, false, 'expired → isActive false');
  assertEq(got.timeRemaining, 0, 'timeRemaining 0');
}

// ============================================================================
// getSessions
// ============================================================================
console.log('\n── getSessions ───────────────────────────────────────────');

// Clear existing sessions
internalMap.clear();

quiet();
const a1 = await mgr.createSession({ userId: 1, userName: 'u1', ipAddress: '1.1.1.1', userAgent: 'ua', timeoutMinutes: 30 });
await new Promise(r => setTimeout(r, 10));
const a2 = await mgr.createSession({ userId: 1, userName: 'u1', ipAddress: '1.1.1.1', userAgent: 'ua', timeoutMinutes: 30 });
const b1 = await mgr.createSession({ userId: 2, userName: 'u2', ipAddress: '2.2.2.2', userAgent: 'ua', timeoutMinutes: 30 });
loud();

{
  const u1Sessions = await mgr.getSessions(1);
  assertEq(u1Sessions.length, 2, '2 sessions for user 1');
  // Sorted by createdAt DESC — newer (a2) first
  assertEq(u1Sessions[0].id, a2.id, 'newer session first');
  assertEq(u1Sessions[1].id, a1.id, 'older session second');
}

{
  const u2Sessions = await mgr.getSessions(2);
  assertEq(u2Sessions.length, 1, '1 session for user 2');
  assertEq(u2Sessions[0].id, b1.id, 'correct session');
}

// includeAll
{
  const all = await mgr.getSessions(999, true);
  assertEq(all.length, 3, 'includeAll returns all 3');
}

// ============================================================================
// getActiveSessions
// ============================================================================
console.log('\n── getActiveSessions ─────────────────────────────────────');

// Expire a1 manually
const a1Raw = internalMap.get(a1.id);
a1Raw.expiresAt = new Date(Date.now() - 1000);

{
  const active = await mgr.getActiveSessions(1);
  assertEq(active.length, 1, 'only 1 active for user 1');
  assertEq(active[0].id, a2.id, 'a2 is still active');
}

// ============================================================================
// updateSessionActivity
// ============================================================================
console.log('\n── updateSessionActivity ─────────────────────────────────');

{
  const before = internalMap.get(a2.id).lastActivity.getTime();
  await new Promise(r => setTimeout(r, 10));
  await mgr.updateSessionActivity(a2.id);
  const after = internalMap.get(a2.id).lastActivity.getTime();
  assert(after > before, 'lastActivity updated');
}

// Unknown session is no-op
{
  await mgr.updateSessionActivity('nonexistent');
  assert(true, 'no throw on unknown id');
}

// ============================================================================
// terminateSession
// ============================================================================
console.log('\n── terminateSession ──────────────────────────────────────');

quiet();
{
  const result = await mgr.terminateSession(a2.id);
  loud();
  assertEq(result, true, 'returns true');
  const raw = internalMap.get(a2.id);
  assertEq(raw.isActive, false, 'isActive false');
  assert(raw.terminatedAt instanceof Date, 'terminatedAt set');
}

// Unknown session — returns true but no-op
{
  const result = await mgr.terminateSession('nonexistent');
  assertEq(result, true, 'unknown returns true');
}

// ============================================================================
// cleanupExpiredSessions
// ============================================================================
console.log('\n── cleanupExpiredSessions ────────────────────────────────');

internalMap.clear();
quiet();
const c1 = await mgr.createSession({ userId: 1, userName: 'u', ipAddress: '1.1.1.1', userAgent: 'ua', timeoutMinutes: 30 });
const c2 = await mgr.createSession({ userId: 1, userName: 'u', ipAddress: '1.1.1.1', userAgent: 'ua', timeoutMinutes: 30 });
const c3 = await mgr.createSession({ userId: 1, userName: 'u', ipAddress: '1.1.1.1', userAgent: 'ua', timeoutMinutes: 30 });
loud();
// Expire c1 and c2
internalMap.get(c1.id).expiresAt = new Date(Date.now() - 1000);
internalMap.get(c2.id).expiresAt = new Date(Date.now() - 1000);

quiet();
mgr.cleanupExpiredSessions();
loud();

assertEq(internalMap.get(c1.id).isActive, false, 'c1 marked inactive');
assertEq(internalMap.get(c2.id).isActive, false, 'c2 marked inactive');
assertEq(internalMap.get(c3.id).isActive, true, 'c3 still active');
assert(internalMap.get(c1.id).terminatedAt instanceof Date, 'c1 has terminatedAt');

// ============================================================================
// getSystemStatus
// ============================================================================
console.log('\n── getSystemStatus ───────────────────────────────────────');

{
  const status = await mgr.getSystemStatus();
  assertEq(status.enabled, true, 'enabled');
  assertEq(status.totalSessions, 3, '3 total');
  assertEq(status.activeSessions, 1, '1 active (c3)');
  assertEq(status.expiredSessions, 2, '2 expired (c1, c2)');
  assertEq(status.maxConcurrentSessions, 5, 'max 5');
  assertEq(status.defaultTimeoutMinutes, 30, 'timeout 30');
  assertEq(status.requirePassword, false, 'requirePassword');
  assertEq(status.allowInProduction, false, 'allowInProduction');
  assert(status.lastCleanup instanceof Date, 'lastCleanup Date');
}

// ============================================================================
// getConfig / updateConfig
// ============================================================================
console.log('\n── getConfig / updateConfig ──────────────────────────────');

{
  const cfg = await mgr.getConfig();
  assertEq(cfg.enabled, true, 'default enabled');
  assertEq(cfg.maxConcurrentSessions, 5, 'default max');
  assertEq(cfg.defaultTimeoutMinutes, 30, 'default timeout');
  // Returns a copy — mutating shouldn't affect internal
  cfg.enabled = false;
  const cfg2 = await mgr.getConfig();
  assertEq(cfg2.enabled, true, 'copy does not leak mutation');
}

// updateConfig success. Note: validateConfig requires all 5 fields
// present in the update payload — it doesn't validate the merged config.
quiet();
{
  const result = await mgr.updateConfig(
    {
      enabled: true,
      maxConcurrentSessions: 10,
      defaultTimeoutMinutes: 60,
      requirePassword: false,
      allowInProduction: false,
    },
    { id: 1, name: 'admin' }
  );
  loud();
  assertEq(result.maxConcurrentSessions, 10, 'max updated to 10');
  assertEq(result.defaultTimeoutMinutes, 60, 'timeout updated to 60');
  assertEq(result.enabled, true, 'enabled unchanged');
  quiet();
}
loud();

// updateConfig invalid throws
{
  let thrown = false;
  try {
    await mgr.updateConfig(
      {
        enabled: true,
        maxConcurrentSessions: 0,
        defaultTimeoutMinutes: 60,
        requirePassword: false,
        allowInProduction: false,
      },
      { id: 1, name: 'admin' }
    );
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('Invalid configuration'), 'error mentions Invalid configuration');
  }
  assert(thrown, 'updateConfig with invalid throws');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
// setInterval keeps process alive — explicit exit
process.exit(failed > 0 ? 1 : 0);
} // end main

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
