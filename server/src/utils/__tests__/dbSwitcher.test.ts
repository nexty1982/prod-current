#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/dbSwitcher.js (OMD-941)
 *
 * Two functions:
 *   - getChurchDbConnection(dbName)  Cached pool factory; tests connection
 *                                    via getConnection()/release()
 *   - closeAllConnections()          Calls .end() on every cached pool and
 *                                    clears the cache
 *
 * Strategy: pre-populate require.cache for `mysql2/promise` and `dotenv`
 * with stubs BEFORE requiring the SUT. The mysql stub records every
 * createPool config and returns pool objects whose .getConnection()/.end()
 * are tracked.
 *
 * Run from server/: npx tsx src/utils/__tests__/dbSwitcher.test.ts
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

// ── Stub mysql2/promise + dotenv BEFORE requiring SUT ────────────────────

const createPoolCalls: any[] = [];
const releasedConnections: number[] = [];
const endedPools: number[] = [];
let nextPoolId = 0;
let createPoolThrows = false;
let getConnectionThrows = false;

function makePool() {
  const id = ++nextPoolId;
  return {
    _id: id,
    getConnection: async () => {
      if (getConnectionThrows) throw new Error('connect failed');
      return {
        release: () => { releasedConnections.push(id); }
      };
    },
    end: async () => { endedPools.push(id); }
  };
}

const mysqlStub = {
  createPool: (config: any) => {
    createPoolCalls.push(config);
    if (createPoolThrows) throw new Error('createPool failed');
    return makePool();
  }
};

const mysqlPath = require.resolve('mysql2/promise');
require.cache[mysqlPath] = {
  id: mysqlPath, filename: mysqlPath, loaded: true,
  exports: mysqlStub
} as any;

// dotenv: noop config()
const dotenvPath = require.resolve('dotenv');
require.cache[dotenvPath] = {
  id: dotenvPath, filename: dotenvPath, loaded: true,
  exports: { config: () => ({ parsed: {} }) }
} as any;

// Set known env vars BEFORE requiring SUT (default fallbacks otherwise)
process.env.DB_HOST = 'test-host';
process.env.DB_USER = 'test-user';
process.env.DB_PASSWORD = 'test-pass';

// Now require the SUT
const { getChurchDbConnection, closeAllConnections } = require('../dbSwitcher');

function resetTracking() {
  createPoolCalls.length = 0;
  releasedConnections.length = 0;
  endedPools.length = 0;
  createPoolThrows = false;
  getConnectionThrows = false;
}

(async () => {

// ============================================================================
// getChurchDbConnection: first call creates pool
// ============================================================================
console.log('\n── getChurchDbConnection: create + cache ─────────────────');

resetTracking();
await closeAllConnections(); // start clean

{
  const pool = await getChurchDbConnection('om_church_46');
  assert(pool && (pool as any)._id, 'returned a pool object');
  assertEq(createPoolCalls.length, 1, 'createPool called once');
  const cfg = createPoolCalls[0];
  assertEq(cfg.host, 'test-host', 'host from env');
  assertEq(cfg.user, 'test-user', 'user from env');
  assertEq(cfg.password, 'test-pass', 'password from env');
  assertEq(cfg.database, 'om_church_46', 'database from arg');
  assertEq(cfg.waitForConnections, true, 'waitForConnections: true');
  assertEq(cfg.connectionLimit, 10, 'connectionLimit: 10');
  assertEq(cfg.queueLimit, 0, 'queueLimit: 0');
  assertEq(releasedConnections.length, 1, 'connection probed and released');
}

// ============================================================================
// Cache hit: second call for same dbName
// ============================================================================
console.log('\n── getChurchDbConnection: cache hit ──────────────────────');

resetTracking();
await closeAllConnections();

{
  const a = await getChurchDbConnection('om_church_99');
  const b = await getChurchDbConnection('om_church_99');
  assertEq(a, b, 'same pool reference returned (cached)');
  assertEq(createPoolCalls.length, 1, 'createPool called only once for repeat dbName');
  assertEq(releasedConnections.length, 1, 'connection probe only on first call');
}

// ============================================================================
// Different dbName → different pool
// ============================================================================
console.log('\n── getChurchDbConnection: distinct dbNames ───────────────');

resetTracking();
await closeAllConnections();

{
  const a = await getChurchDbConnection('om_church_1');
  const b = await getChurchDbConnection('om_church_2');
  assert(a !== b, 'different dbName → distinct pool');
  assertEq(createPoolCalls.length, 2, 'createPool called twice');
  assertEq(createPoolCalls[0].database, 'om_church_1', 'first db arg');
  assertEq(createPoolCalls[1].database, 'om_church_2', 'second db arg');
}

// ============================================================================
// Connection probe failure → throws, pool stays cached (per source)
// ============================================================================
console.log('\n── getChurchDbConnection: connect failure ────────────────');

resetTracking();
await closeAllConnections();

{
  getConnectionThrows = true;
  let caught: Error | null = null;
  try {
    await getChurchDbConnection('om_church_failtest');
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'getChurchDbConnection throws on connect failure');
  assertEq(caught?.message, 'connect failed', 'original error message preserved');
  // Source: dbPool[dbName] was assigned BEFORE the probe; the failure does not
  // remove it. Documented quirk — second call returns the cached, untested pool.
  getConnectionThrows = false;
  resetTracking();
  const pool = await getChurchDbConnection('om_church_failtest');
  assert(pool && (pool as any)._id, 'second call returns cached pool (no new createPool)');
  assertEq(createPoolCalls.length, 0, 'no new createPool call (cached from failed attempt)');
}

// ============================================================================
// closeAllConnections: ends every cached pool and clears the cache
// ============================================================================
console.log('\n── closeAllConnections ───────────────────────────────────');

await closeAllConnections(); // drain leftover pools from prior tests
resetTracking();              // then reset counters AFTER the drain

{
  await getChurchDbConnection('db_a');
  await getChurchDbConnection('db_b');
  await getChurchDbConnection('db_c');
  assertEq(createPoolCalls.length, 3, '3 pools created');

  await closeAllConnections();
  assertEq(endedPools.length, 3, 'end() called on every pool');

  // After close, cache is empty → next call creates fresh
  resetTracking();
  await getChurchDbConnection('db_a');
  assertEq(createPoolCalls.length, 1, 'after close, db_a is recreated (cache cleared)');
}

// closeAllConnections is safe to call when cache is empty
resetTracking();
await closeAllConnections(); // already empty (db_a got recreated, then we never closed)
await closeAllConnections(); // fully empty now
assertEq(endedPools.length, 1, 'only the still-open pool was closed (idempotent on empty)');

// closeAllConnections logs but does not throw if .end() throws
resetTracking();
await closeAllConnections();
{
  const pool = await getChurchDbConnection('throwy');
  // Replace its end() to throw
  (pool as any).end = async () => { throw new Error('end failed'); };
  let threw = false;
  try {
    await closeAllConnections();
  } catch (e) { threw = true; }
  assertEq(threw, false, 'closeAllConnections swallows .end() errors');
}

// ============================================================================
// Default config values when env vars are unset
// ============================================================================
console.log('\n── default env fallbacks ─────────────────────────────────');

// Save and unset env vars
const savedHost = process.env.DB_HOST;
const savedUser = process.env.DB_USER;
const savedPass = process.env.DB_PASSWORD;
delete process.env.DB_HOST;
delete process.env.DB_USER;
delete process.env.DB_PASSWORD;

resetTracking();
await closeAllConnections();

{
  await getChurchDbConnection('default_test');
  const cfg = createPoolCalls[0];
  assertEq(cfg.host, 'localhost', 'default host: localhost');
  assertEq(cfg.user, 'orthodoxapps', 'default user: orthodoxapps');
  assert(typeof cfg.password === 'string' && cfg.password.length > 0, 'default password is set');
}

// Restore
process.env.DB_HOST = savedHost;
process.env.DB_USER = savedUser;
process.env.DB_PASSWORD = savedPass;

// ============================================================================
// Summary
// ============================================================================
await closeAllConnections();

console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

})();
