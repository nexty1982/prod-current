#!/usr/bin/env npx tsx
/**
 * Unit tests for services/jitSessionManager.js (OMD-1154)
 *
 * JIT session manager is a class with an in-memory Map of sessions and
 * an fs-backed config. Constructor starts a 60s cleanup setInterval — we
 * force process.exit at the end to terminate. fs.promises is stubbed so
 * loadConfig silently uses defaults and saveConfig is observable.
 *
 * Coverage:
 *   - constructor: default config, sessions Map empty
 *   - generateSessionId: 32-char hex
 *   - validateConfig: all field checks, happy path
 *   - getConfig / updateConfig: happy, validation errors, invoked saveConfig
 *   - createSession: populates fields, computes expiresAt from timeoutMinutes,
 *       stored in Map
 *   - getSession: not found → null, timeRemaining computed, isActive false
 *       when expired, active when in the future
 *   - getSessions: filter by userId, includeAll flag, sort desc by createdAt
 *   - getActiveSessions: filters isActive
 *   - updateSessionActivity: updates lastActivity, noop on missing
 *   - terminateSession: sets isActive=false + terminatedAt
 *   - cleanupExpiredSessions: flips isActive for expired, leaves active
 *   - getSystemStatus: counts
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

// ── fs.promises stub ─────────────────────────────────────────────────
const writtenFiles: Record<string, string> = {};
const mkdirCalls: Array<{ dir: string }> = [];
let readFileThrows = true; // default: file doesn't exist

const fakeFsPromises = {
  readFile: async (_p: string, _enc: string) => {
    if (readFileThrows) throw new Error('ENOENT');
    return '{}';
  },
  mkdir: async (dir: string, _opts: any) => {
    mkdirCalls.push({ dir });
  },
  writeFile: async (p: string, data: string) => {
    writtenFiles[p] = data;
  },
};

const realFs = require('fs');
const fsStub = { ...realFs, promises: fakeFsPromises };

// Replace fs in the module cache
const fsPath = require.resolve('fs');
require.cache[fsPath] = {
  id: fsPath,
  filename: fsPath,
  loaded: true,
  exports: fsStub,
} as any;

// Silence logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const JITSessionManager = require('../jitSessionManager');

async function main() {

quiet();

// ============================================================================
// constructor / defaults
// ============================================================================
loud();
console.log('\n── constructor ───────────────────────────────────────────');

const mgr = new JITSessionManager();
assert(mgr.sessions instanceof Map, 'sessions is a Map');
assertEq(mgr.sessions.size, 0, 'sessions empty');
assertEq(mgr.config.enabled, true, 'enabled default true');
assertEq(mgr.config.maxConcurrentSessions, 5, 'maxConcurrent default 5');
assertEq(mgr.config.defaultTimeoutMinutes, 30, 'defaultTimeout default 30');
assertEq(mgr.config.requirePassword, false, 'requirePassword default false');
assertEq(mgr.config.allowInProduction, false, 'allowInProduction default false');

// ============================================================================
// generateSessionId
// ============================================================================
console.log('\n── generateSessionId ─────────────────────────────────────');

{
  const id = mgr.generateSessionId();
  assertEq(typeof id, 'string', 'returns string');
  assertEq(id.length, 32, '32 chars (16 bytes hex)');
  assert(/^[0-9a-f]{32}$/.test(id), 'hex only');
  const id2 = mgr.generateSessionId();
  assert(id !== id2, 'unique');
}

// ============================================================================
// validateConfig
// ============================================================================
console.log('\n── validateConfig ────────────────────────────────────────');

{
  const good = {
    enabled: true,
    maxConcurrentSessions: 10,
    defaultTimeoutMinutes: 60,
    requirePassword: false,
    allowInProduction: false,
  };
  const r = mgr.validateConfig(good);
  assertEq(r.valid, true, 'good config valid');
  assertEq(r.errors, [], 'no errors');
}

// All fields wrong
{
  const bad = {
    enabled: 'yes',
    maxConcurrentSessions: 0,
    defaultTimeoutMinutes: -1,
    requirePassword: 'no',
    allowInProduction: 'maybe',
  };
  const r = mgr.validateConfig(bad);
  assertEq(r.valid, false, 'bad config invalid');
  assertEq(r.errors.length, 5, 'all five errors');
}

// Missing enabled
{
  const r = mgr.validateConfig({
    maxConcurrentSessions: 5,
    defaultTimeoutMinutes: 30,
    requirePassword: false,
    allowInProduction: false,
  });
  assertEq(r.valid, false, 'missing enabled invalid');
  assert(r.errors[0].includes('enabled'), 'enabled error');
}

// ============================================================================
// getConfig / updateConfig
// ============================================================================
console.log('\n── getConfig / updateConfig ──────────────────────────────');

{
  const cfg = await mgr.getConfig();
  assertEq(cfg.enabled, true, 'getConfig returns current');
  // Immutable clone — mutating doesn't affect mgr
  cfg.enabled = false;
  assertEq(mgr.config.enabled, true, 'getConfig returns a copy');
}

// updateConfig happy
{
  quiet();
  const result = await mgr.updateConfig(
    {
      enabled: true,
      maxConcurrentSessions: 20,
      defaultTimeoutMinutes: 45,
      requirePassword: true,
      allowInProduction: true,
    },
    { id: 1, name: 'admin' }
  );
  loud();
  assertEq(result.maxConcurrentSessions, 20, 'maxConcurrent updated');
  assertEq(result.requirePassword, true, 'requirePassword updated');
  // saveConfig writes file
  const writtenKeys = Object.keys(writtenFiles);
  assert(writtenKeys.length > 0, 'config written');
  const written = JSON.parse(writtenFiles[writtenKeys[0]]);
  assertEq(written.maxConcurrentSessions, 20, 'written config has update');
}

// updateConfig validation failure
{
  let caught: Error | null = null;
  try {
    await mgr.updateConfig({ enabled: 'x' as any }, { id: 1, name: 'admin' });
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid config throws');
  assert(caught !== null && caught.message.includes('Invalid configuration'), 'error message');
}

// ============================================================================
// createSession
// ============================================================================
console.log('\n── createSession ─────────────────────────────────────────');

{
  quiet();
  const session = await mgr.createSession({
    userId: 42,
    userName: 'alice',
    ipAddress: '10.0.0.1',
    userAgent: 'Mozilla',
    timeoutMinutes: 15,
  });
  loud();
  assert(typeof session.id === 'string' && session.id.length === 32, 'session.id hex');
  assertEq(session.userId, 42, 'userId');
  assertEq(session.userName, 'alice', 'userName');
  assertEq(session.ipAddress, '10.0.0.1', 'ipAddress');
  assertEq(session.userAgent, 'Mozilla', 'userAgent');
  assertEq(session.isActive, true, 'isActive');
  assert(session.expiresAt instanceof Date, 'expiresAt is Date');
  assert(session.createdAt instanceof Date, 'createdAt is Date');
  // expiresAt ≈ createdAt + 15min
  const diffMs = session.expiresAt.getTime() - session.createdAt.getTime();
  assert(Math.abs(diffMs - 15 * 60 * 1000) < 1000, 'expiresAt ≈ +15min');
  // Stored in Map
  assert(mgr.sessions.has(session.id), 'stored in Map');
}

// ============================================================================
// getSession
// ============================================================================
console.log('\n── getSession ────────────────────────────────────────────');

// Not found
{
  const s = await mgr.getSession('nonexistent');
  assertEq(s, null, 'not found → null');
}

// Active
{
  quiet();
  const created = await mgr.createSession({
    userId: 1, userName: 'bob', ipAddress: '1.1.1.1',
    userAgent: 'UA', timeoutMinutes: 30,
  });
  loud();
  const s = await mgr.getSession(created.id);
  assert(s !== null, 'session returned');
  assertEq(s.id, created.id, 'id matches');
  assertEq(s.userId, 1, 'userId');
  assertEq(s.isActive, true, 'active');
  assert(s.timeRemaining > 25 && s.timeRemaining <= 30, 'timeRemaining ≈ 30 min');
  assert(typeof s.createdAt === 'string', 'createdAt serialized as ISO string');
}

// Expired session
{
  const id = mgr.generateSessionId();
  mgr.sessions.set(id, {
    id,
    userId: 2,
    userName: 'expired',
    ipAddress: '2.2.2.2',
    userAgent: 'UA',
    createdAt: new Date(Date.now() - 3600000),
    expiresAt: new Date(Date.now() - 1800000), // 30 min ago
    lastActivity: new Date(Date.now() - 3000000),
    isActive: true,
  });
  const s = await mgr.getSession(id);
  assertEq(s.isActive, false, 'expired → isActive false');
  assertEq(s.timeRemaining, 0, 'timeRemaining 0');
}

// ============================================================================
// getSessions (by user + includeAll)
// ============================================================================
console.log('\n── getSessions ───────────────────────────────────────────');

{
  // Clear and add sessions for multiple users
  mgr.sessions.clear();
  const now = Date.now();

  const s1 = {
    id: 'id1', userId: 10, userName: 'u10', ipAddress: '1',
    userAgent: '', createdAt: new Date(now - 3000), expiresAt: new Date(now + 60000),
    lastActivity: new Date(now), isActive: true,
  };
  const s2 = {
    id: 'id2', userId: 10, userName: 'u10', ipAddress: '1',
    userAgent: '', createdAt: new Date(now - 1000), expiresAt: new Date(now + 60000),
    lastActivity: new Date(now), isActive: true,
  };
  const s3 = {
    id: 'id3', userId: 20, userName: 'u20', ipAddress: '2',
    userAgent: '', createdAt: new Date(now - 2000), expiresAt: new Date(now + 60000),
    lastActivity: new Date(now), isActive: true,
  };
  mgr.sessions.set('id1', s1);
  mgr.sessions.set('id2', s2);
  mgr.sessions.set('id3', s3);

  const u10 = await mgr.getSessions(10);
  assertEq(u10.length, 2, 'two sessions for user 10');
  // Sorted desc by createdAt → id2 first (most recent), then id1
  assertEq(u10[0].id, 'id2', 'sorted desc by createdAt');
  assertEq(u10[1].id, 'id1', 'second entry');

  const all = await mgr.getSessions(0, true);
  assertEq(all.length, 3, 'includeAll returns all');

  const u30 = await mgr.getSessions(30);
  assertEq(u30.length, 0, 'user 30 has no sessions');
}

// ============================================================================
// getActiveSessions
// ============================================================================
console.log('\n── getActiveSessions ─────────────────────────────────────');

{
  mgr.sessions.clear();
  const now = Date.now();
  mgr.sessions.set('a', {
    id: 'a', userId: 50, userName: '', ipAddress: '', userAgent: '',
    createdAt: new Date(now - 5000), expiresAt: new Date(now + 60000),
    lastActivity: new Date(), isActive: true,
  });
  mgr.sessions.set('b', {
    id: 'b', userId: 50, userName: '', ipAddress: '', userAgent: '',
    createdAt: new Date(now - 3000), expiresAt: new Date(now - 1000), // expired
    lastActivity: new Date(), isActive: true,
  });
  mgr.sessions.set('c', {
    id: 'c', userId: 50, userName: '', ipAddress: '', userAgent: '',
    createdAt: new Date(now - 1000), expiresAt: new Date(now + 60000),
    lastActivity: new Date(), isActive: false, // explicitly terminated
  });

  const active = await mgr.getActiveSessions(50);
  assertEq(active.length, 1, 'one active session');
  assertEq(active[0].id, 'a', 'only a is active');
}

// ============================================================================
// updateSessionActivity
// ============================================================================
console.log('\n── updateSessionActivity ─────────────────────────────────');

{
  mgr.sessions.clear();
  const now = Date.now();
  const old = new Date(now - 60000);
  mgr.sessions.set('sx', {
    id: 'sx', userId: 1, userName: '', ipAddress: '', userAgent: '',
    createdAt: old, expiresAt: new Date(now + 60000),
    lastActivity: old, isActive: true,
  });
  await mgr.updateSessionActivity('sx');
  const updated = mgr.sessions.get('sx');
  assert(updated.lastActivity.getTime() > old.getTime(), 'lastActivity advanced');

  // Noop on missing
  await mgr.updateSessionActivity('missing'); // no throw
  assert(true, 'missing id is a noop');
}

// ============================================================================
// terminateSession
// ============================================================================
console.log('\n── terminateSession ──────────────────────────────────────');

{
  mgr.sessions.clear();
  const now = Date.now();
  mgr.sessions.set('t1', {
    id: 't1', userId: 1, userName: '', ipAddress: '', userAgent: '',
    createdAt: new Date(now), expiresAt: new Date(now + 60000),
    lastActivity: new Date(now), isActive: true,
  });
  quiet();
  const result = await mgr.terminateSession('t1');
  loud();
  assertEq(result, true, 'returns true');
  const t = mgr.sessions.get('t1');
  assertEq(t.isActive, false, 'isActive false');
  assert(t.terminatedAt instanceof Date, 'terminatedAt set');

  // Missing → still true
  const result2 = await mgr.terminateSession('missing');
  assertEq(result2, true, 'missing → true');
}

// ============================================================================
// cleanupExpiredSessions
// ============================================================================
console.log('\n── cleanupExpiredSessions ────────────────────────────────');

{
  mgr.sessions.clear();
  const now = Date.now();
  mgr.sessions.set('exp1', {
    id: 'exp1', userId: 1, userName: '', ipAddress: '', userAgent: '',
    createdAt: new Date(now - 120000), expiresAt: new Date(now - 60000),
    lastActivity: new Date(now - 90000), isActive: true,
  });
  mgr.sessions.set('exp2', {
    id: 'exp2', userId: 1, userName: '', ipAddress: '', userAgent: '',
    createdAt: new Date(now - 120000), expiresAt: new Date(now - 30000),
    lastActivity: new Date(now - 90000), isActive: true,
  });
  mgr.sessions.set('active', {
    id: 'active', userId: 1, userName: '', ipAddress: '', userAgent: '',
    createdAt: new Date(now), expiresAt: new Date(now + 60000),
    lastActivity: new Date(now), isActive: true,
  });

  quiet();
  mgr.cleanupExpiredSessions();
  loud();

  assertEq(mgr.sessions.get('exp1').isActive, false, 'exp1 marked inactive');
  assertEq(mgr.sessions.get('exp2').isActive, false, 'exp2 marked inactive');
  assertEq(mgr.sessions.get('active').isActive, true, 'active untouched');
  assert(mgr.sessions.get('exp1').terminatedAt instanceof Date, 'terminatedAt set');
}

// ============================================================================
// getSystemStatus
// ============================================================================
console.log('\n── getSystemStatus ───────────────────────────────────────');

{
  mgr.sessions.clear();
  const now = Date.now();
  mgr.sessions.set('a', {
    id: 'a', userId: 1, userName: '', ipAddress: '', userAgent: '',
    createdAt: new Date(now), expiresAt: new Date(now + 60000),
    lastActivity: new Date(now), isActive: true,
  });
  mgr.sessions.set('b', {
    id: 'b', userId: 1, userName: '', ipAddress: '', userAgent: '',
    createdAt: new Date(now), expiresAt: new Date(now - 1000),
    lastActivity: new Date(now), isActive: false,
  });

  const status = await mgr.getSystemStatus();
  assertEq(status.enabled, true, 'enabled');
  assertEq(status.totalSessions, 2, 'total=2');
  assertEq(status.activeSessions, 1, 'active=1');
  assertEq(status.expiredSessions, 1, 'expired=1');
  assert(status.maxConcurrentSessions >= 5, 'maxConcurrent exposed');
  assert(status.lastCleanup instanceof Date, 'lastCleanup is Date');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
