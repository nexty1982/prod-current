#!/usr/bin/env npx tsx
/**
 * Unit tests for services/jitSessionManager.js (OMD-1220)
 *
 * In-memory class managing JIT terminal sessions. Persists config to
 * disk via fs.promises.readFile/writeFile/mkdir and schedules a cleanup
 * interval in the constructor.
 *
 * Strategy:
 *   - Stub `fs` via require.cache so `fs.promises` is an in-memory vfs
 *     (Map<string, string>) backed by a small helper (readFile/writeFile/mkdir).
 *     Keep the real `fs` shape intact so other modules loaded by tsx
 *     (if any) don't break.
 *   - Constructor fire-and-forgets loadConfig() and sets a 60s interval.
 *     We await a microtask so loadConfig resolves, then process.exit(0)
 *     at the end to avoid hanging on the real setInterval handle.
 *
 * Coverage:
 *   - constructor: defaults loaded, sessions map empty
 *   - loadConfig: merges on-disk config; default fallback on missing file
 *   - validateConfig: all branches (booleans, positive numbers)
 *   - updateConfig: valid → saves + returns merged; invalid → throws
 *   - generateSessionId: hex length 32
 *   - createSession: writes to map with computed expiresAt
 *   - getSession: found / null / formats ISO strings / timeRemaining
 *   - getSessions: filter by userId + includeAll + sort desc
 *   - getActiveSessions: filters inactive/expired
 *   - updateSessionActivity: updates lastActivity; no-op on missing
 *   - terminateSession: isActive=false; no-op on missing; returns true
 *   - getSystemStatus: counts active/total/expired
 *   - cleanupExpiredSessions: marks expired-but-active as inactive
 *   - saveConfig: mkdir + writeFile path + JSON payload
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

// ── In-memory vfs ───────────────────────────────────────────────────
const vfs = new Map<string, string>();
const mkdirCalls: { path: string; opts: any }[] = [];

function enoent(p: string): Error {
  const e: any = new Error(`ENOENT: no such file or directory, open '${p}'`);
  e.code = 'ENOENT';
  return e;
}

const fsPromisesMock = {
  readFile: async (p: string, enc: string) => {
    if (!vfs.has(p)) throw enoent(p);
    return vfs.get(p)!;
  },
  writeFile: async (p: string, data: string) => {
    vfs.set(p, data);
  },
  mkdir: async (p: string, opts?: any) => {
    mkdirCalls.push({ path: p, opts });
  },
};

// Preserve real fs shape, override `.promises`.
const realFs = require('fs');
const fsPath = require.resolve('fs');
require.cache[fsPath] = {
  id: fsPath,
  filename: fsPath,
  loaded: true,
  exports: Object.assign({}, realFs, { promises: fsPromisesMock }),
} as any;

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// ── Load SUT ────────────────────────────────────────────────────────
const JITSessionManager = require('../jitSessionManager');

// Helper: fresh instance with loadConfig awaited
async function freshManager(): Promise<any> {
  quiet();
  const mgr = new JITSessionManager();
  // Wait for the loadConfig() microtask fired from constructor.
  await new Promise(r => setTimeout(r, 10));
  loud();
  return mgr;
}

async function main() {

// ============================================================================
// constructor defaults (no config file on disk)
// ============================================================================
console.log('\n── constructor: defaults ─────────────────────────────────');

{
  vfs.clear();
  mkdirCalls.length = 0;
  const mgr = await freshManager();
  const cfg = await mgr.getConfig();
  assertEq(cfg.enabled, true, 'enabled default true');
  assertEq(cfg.maxConcurrentSessions, 5, 'maxConcurrentSessions default 5');
  assertEq(cfg.defaultTimeoutMinutes, 30, 'defaultTimeoutMinutes default 30');
  assertEq(cfg.requirePassword, false, 'requirePassword default false');
  assertEq(cfg.allowInProduction, false, 'allowInProduction default false');
  assertEq(mgr.sessions.size, 0, 'sessions map empty');
}

// ============================================================================
// loadConfig: merges on-disk config
// ============================================================================
console.log('\n── loadConfig: merges on-disk ────────────────────────────');

{
  vfs.clear();
  mkdirCalls.length = 0;
  const path = require('path');
  const configPath = path.join(
    path.dirname(require.resolve('../jitSessionManager')),
    '../data/jit-config.json',
  );
  vfs.set(configPath, JSON.stringify({
    maxConcurrentSessions: 20,
    requirePassword: true,
  }));

  const mgr = await freshManager();
  const cfg = await mgr.getConfig();
  assertEq(cfg.maxConcurrentSessions, 20, 'merged: maxConcurrentSessions');
  assertEq(cfg.requirePassword, true, 'merged: requirePassword');
  // Defaults preserved
  assertEq(cfg.enabled, true, 'merged: enabled default preserved');
  assertEq(cfg.defaultTimeoutMinutes, 30, 'merged: defaultTimeoutMinutes default preserved');
}

// ============================================================================
// validateConfig
// ============================================================================
console.log('\n── validateConfig ────────────────────────────────────────');

{
  vfs.clear();
  const mgr = await freshManager();

  // Valid
  const good = mgr.validateConfig({
    enabled: true,
    maxConcurrentSessions: 10,
    defaultTimeoutMinutes: 60,
    requirePassword: false,
    allowInProduction: false,
  });
  assertEq(good.valid, true, 'valid config → valid');
  assertEq(good.errors, [], 'no errors');

  // All invalid
  const bad = mgr.validateConfig({
    enabled: 'yes',
    maxConcurrentSessions: 0,
    defaultTimeoutMinutes: -1,
    requirePassword: 'no',
    allowInProduction: 1,
  });
  assertEq(bad.valid, false, 'invalid config → invalid');
  assertEq(bad.errors.length, 5, '5 errors');
  assert(bad.errors.some((e: string) => /enabled/.test(e)), 'enabled error');
  assert(bad.errors.some((e: string) => /maxConcurrentSessions/.test(e)), 'max error');
  assert(bad.errors.some((e: string) => /defaultTimeoutMinutes/.test(e)), 'timeout error');
  assert(bad.errors.some((e: string) => /requirePassword/.test(e)), 'requirePassword error');
  assert(bad.errors.some((e: string) => /allowInProduction/.test(e)), 'allowInProduction error');
}

// ============================================================================
// updateConfig
// ============================================================================
console.log('\n── updateConfig ──────────────────────────────────────────');

{
  vfs.clear();
  const mgr = await freshManager();

  // Valid → saves
  quiet();
  const updated = await mgr.updateConfig({
    enabled: false,
    maxConcurrentSessions: 2,
    defaultTimeoutMinutes: 15,
    requirePassword: true,
    allowInProduction: true,
  }, { name: 'nick', id: 1 });
  loud();
  assertEq(updated.enabled, false, 'updated: enabled');
  assertEq(updated.maxConcurrentSessions, 2, 'updated: max');
  assertEq(updated.defaultTimeoutMinutes, 15, 'updated: timeout');

  // Saved to disk via vfs (note: JSON.stringify(_, null, 2) adds a space after ':')
  const saved = Array.from(vfs.values()).find(v => /"enabled":\s*false/.test(v));
  assert(saved !== undefined, 'config written to vfs');

  // Invalid → throws
  let caught: Error | null = null;
  try {
    await mgr.updateConfig({ enabled: 'nope' } as any, { name: 'x', id: 1 });
  } catch (e: any) { caught = e; }
  assert(
    caught !== null && /Invalid configuration/.test(caught.message),
    'invalid update throws',
  );
}

// ============================================================================
// generateSessionId
// ============================================================================
console.log('\n── generateSessionId ─────────────────────────────────────');

{
  vfs.clear();
  const mgr = await freshManager();
  const id1 = mgr.generateSessionId();
  const id2 = mgr.generateSessionId();
  assertEq(id1.length, 32, 'session id length 32 hex chars');
  assert(/^[0-9a-f]{32}$/.test(id1), 'hex only');
  assert(id1 !== id2, 'ids unique across calls');
}

// ============================================================================
// createSession + getSession
// ============================================================================
console.log('\n── createSession / getSession ────────────────────────────');

{
  vfs.clear();
  const mgr = await freshManager();
  quiet();
  const session = await mgr.createSession({
    userId: 7,
    userName: 'alice',
    ipAddress: '1.2.3.4',
    userAgent: 'jest',
    timeoutMinutes: 30,
  });
  loud();
  assertEq(session.userId, 7, 'userId');
  assertEq(session.userName, 'alice', 'userName');
  assertEq(session.isActive, true, 'isActive true');
  assert(session.createdAt instanceof Date, 'createdAt Date');
  assert(session.expiresAt instanceof Date, 'expiresAt Date');
  const deltaMs = (session.expiresAt as Date).getTime() - (session.createdAt as Date).getTime();
  // Should be ~30 minutes (allow 5s slack for test execution time)
  assert(deltaMs >= 29 * 60 * 1000 && deltaMs <= 31 * 60 * 1000, 'expiresAt ~30m from createdAt');

  // getSession formats fields
  const view = await mgr.getSession(session.id);
  assertEq(view.userName, 'alice', 'view.userName');
  assert(typeof view.createdAt === 'string', 'createdAt ISO string');
  assert(typeof view.expiresAt === 'string', 'expiresAt ISO string');
  assert(view.timeRemaining > 0 && view.timeRemaining <= 30, 'timeRemaining in range');
  assertEq(view.isActive, true, 'view isActive');

  // Missing id → null
  assertEq(await mgr.getSession('missing'), null, 'missing session null');
}

// ============================================================================
// getSessions (filter + sort)
// ============================================================================
console.log('\n── getSessions ───────────────────────────────────────────');

{
  vfs.clear();
  const mgr = await freshManager();
  quiet();
  const a = await mgr.createSession({ userId: 1, userName: 'u1', ipAddress: '1', userAgent: '', timeoutMinutes: 30 });
  // Delay so createdAt differs
  await new Promise(r => setTimeout(r, 5));
  const b = await mgr.createSession({ userId: 1, userName: 'u1', ipAddress: '2', userAgent: '', timeoutMinutes: 30 });
  await new Promise(r => setTimeout(r, 5));
  const c = await mgr.createSession({ userId: 2, userName: 'u2', ipAddress: '3', userAgent: '', timeoutMinutes: 30 });
  loud();

  const u1Sessions = await mgr.getSessions(1);
  assertEq(u1Sessions.length, 2, 'user 1: 2 sessions');
  // Newest first
  assertEq(u1Sessions[0].id, b.id, 'sorted desc: newest first');
  assertEq(u1Sessions[1].id, a.id, 'sorted desc: older second');

  const u2Sessions = await mgr.getSessions(2);
  assertEq(u2Sessions.length, 1, 'user 2: 1 session');

  const allSessions = await mgr.getSessions(999, true);
  assertEq(allSessions.length, 3, 'includeAll: 3 sessions');
}

// ============================================================================
// getActiveSessions
// ============================================================================
console.log('\n── getActiveSessions ─────────────────────────────────────');

{
  vfs.clear();
  const mgr = await freshManager();
  quiet();
  const a = await mgr.createSession({ userId: 5, userName: 'u', ipAddress: '', userAgent: '', timeoutMinutes: 30 });
  const b = await mgr.createSession({ userId: 5, userName: 'u', ipAddress: '', userAgent: '', timeoutMinutes: 30 });
  loud();

  // Terminate one
  quiet();
  await mgr.terminateSession(b.id);
  loud();

  const active = await mgr.getActiveSessions(5);
  assertEq(active.length, 1, '1 active session');
  assertEq(active[0].id, a.id, 'active is the non-terminated one');
}

// ============================================================================
// updateSessionActivity
// ============================================================================
console.log('\n── updateSessionActivity ─────────────────────────────────');

{
  vfs.clear();
  const mgr = await freshManager();
  quiet();
  const s = await mgr.createSession({ userId: 1, userName: 'u', ipAddress: '', userAgent: '', timeoutMinutes: 30 });
  loud();
  const origActivity = (mgr.sessions.get(s.id) as any).lastActivity.getTime();
  await new Promise(r => setTimeout(r, 5));
  await mgr.updateSessionActivity(s.id);
  const newActivity = (mgr.sessions.get(s.id) as any).lastActivity.getTime();
  assert(newActivity > origActivity, 'lastActivity advanced');

  // Missing id: no throw
  let threw = false;
  try { await mgr.updateSessionActivity('ghost'); } catch { threw = true; }
  assert(!threw, 'missing id: no throw');
}

// ============================================================================
// terminateSession
// ============================================================================
console.log('\n── terminateSession ──────────────────────────────────────');

{
  vfs.clear();
  const mgr = await freshManager();
  quiet();
  const s = await mgr.createSession({ userId: 1, userName: 'u', ipAddress: '', userAgent: '', timeoutMinutes: 30 });
  const r = await mgr.terminateSession(s.id);
  loud();
  assertEq(r, true, 'returns true');
  assertEq((mgr.sessions.get(s.id) as any).isActive, false, 'isActive false');

  // Missing id → returns true, no throw
  const r2 = await mgr.terminateSession('ghost');
  assertEq(r2, true, 'missing id also returns true');
}

// ============================================================================
// getSystemStatus
// ============================================================================
console.log('\n── getSystemStatus ───────────────────────────────────────');

{
  vfs.clear();
  const mgr = await freshManager();
  quiet();
  const a = await mgr.createSession({ userId: 1, userName: 'u', ipAddress: '', userAgent: '', timeoutMinutes: 30 });
  const b = await mgr.createSession({ userId: 1, userName: 'u', ipAddress: '', userAgent: '', timeoutMinutes: 30 });
  // Force-expire b
  (mgr.sessions.get(b.id) as any).expiresAt = new Date(Date.now() - 1000);
  loud();

  const status = await mgr.getSystemStatus();
  assertEq(status.enabled, true, 'status.enabled');
  assertEq(status.totalSessions, 2, 'totalSessions');
  assertEq(status.activeSessions, 1, 'activeSessions');
  assertEq(status.expiredSessions, 1, 'expiredSessions');
  assertEq(status.maxConcurrentSessions, 5, 'maxConcurrent passthrough');
  assertEq(status.defaultTimeoutMinutes, 30, 'timeout passthrough');
  assert(status.lastCleanup instanceof Date, 'lastCleanup Date');
}

// ============================================================================
// cleanupExpiredSessions
// ============================================================================
console.log('\n── cleanupExpiredSessions ────────────────────────────────');

{
  vfs.clear();
  const mgr = await freshManager();
  quiet();
  const a = await mgr.createSession({ userId: 1, userName: 'u', ipAddress: '', userAgent: '', timeoutMinutes: 30 });
  const b = await mgr.createSession({ userId: 1, userName: 'u', ipAddress: '', userAgent: '', timeoutMinutes: 30 });
  loud();
  // Force a expired
  (mgr.sessions.get(a.id) as any).expiresAt = new Date(Date.now() - 10000);
  (mgr.sessions.get(a.id) as any).isActive = true;

  quiet();
  mgr.cleanupExpiredSessions();
  loud();

  assertEq((mgr.sessions.get(a.id) as any).isActive, false, 'a marked inactive');
  assert((mgr.sessions.get(a.id) as any).terminatedAt instanceof Date, 'a.terminatedAt set');
  assertEq((mgr.sessions.get(b.id) as any).isActive, true, 'b untouched');
}

// ============================================================================
// saveConfig
// ============================================================================
console.log('\n── saveConfig ────────────────────────────────────────────');

{
  vfs.clear();
  mkdirCalls.length = 0;
  const mgr = await freshManager();
  quiet();
  await mgr.saveConfig();
  loud();
  assert(mkdirCalls.length >= 1, 'mkdir called');
  assertEq(mkdirCalls[0].opts, { recursive: true }, 'mkdir recursive');
  // Config file was written to vfs
  const entries = Array.from(vfs.entries());
  const jitEntry = entries.find(([k]) => k.includes('jit-config.json'));
  assert(jitEntry !== undefined, 'jit-config.json written');
  const parsed = JSON.parse(jitEntry![1]);
  assertEq(parsed.enabled, true, 'written: enabled');
  assertEq(parsed.maxConcurrentSessions, 5, 'written: max');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);

// Force exit to avoid hanging on real setInterval from constructor
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
