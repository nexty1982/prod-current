#!/usr/bin/env npx tsx
/**
 * Unit tests for services/omaiCommandService.js (OMD-1068)
 *
 * Database-backed replacement for omai-commands.json. Exports a class
 * (not a singleton) with in-memory 5-minute cache for getAllCommands.
 *
 * Coverage:
 *   - Constructor: cache, cacheTimeout
 *   - getAllCommands: happy path (category/security assembly), cache hit,
 *     parses patterns + requires_parameters JSON, error → fallback
 *   - getContextualSuggestions: found, not found (defaults), error path
 *   - setContextualSuggestions: UPSERT shape, error swallowing
 *   - getAllContextualSuggestions: map building, error → {}
 *   - findMatchingCommands: pattern matching, confidence sort, no-match, error → []
 *   - calculateConfidence (pure): exact/substring/reverse/fuzzy scoring
 *   - clearCache: empties the Map
 *   - getFallbackCommands: shape & static content
 *
 * External deps stubbed via require.cache BEFORE requiring the SUT:
 *   - ../config/db-compat   (getAppPool, promisePool)
 *
 * Run: npx tsx server/src/services/__tests__/omaiCommandService.test.ts
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

// ─── SQL-routed fake pool ───────────────────────────────────────────────────

type Route = { match: RegExp; rows?: any[]; respond?: (params: any[]) => any };
let routes: Route[] = [];
const queryLog: { sql: string; params: any[] }[] = [];
let queryThrows: Error | null = null;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (queryThrows) throw queryThrows;
    for (const r of routes) {
      if (r.match.test(sql)) {
        const rows = r.respond ? r.respond(params) : (r.rows || []);
        return [rows];
      }
    }
    return [[]];
  },
};

const dbCompatStub = {
  getAppPool: () => fakePool,
  promisePool: fakePool,
};

const dbCompatPath = require.resolve('../../config/db-compat');
require.cache[dbCompatPath] = {
  id: dbCompatPath, filename: dbCompatPath, loaded: true, exports: dbCompatStub,
} as any;

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const OmaiCommandService = require('../omaiCommandService');

function resetState() {
  routes = [];
  queryLog.length = 0;
  queryThrows = null;
}

async function main() {

// ============================================================================
// Constructor
// ============================================================================
console.log('\n── constructor ───────────────────────────────────────────');

{
  const svc = new OmaiCommandService();
  assert(svc.cache instanceof Map, 'cache is Map');
  assertEq(svc.cache.size, 0, 'cache empty on init');
  assertEq(svc.cacheTimeout, 5 * 60 * 1000, 'cacheTimeout = 5min');
}

// ============================================================================
// getAllCommands — happy path
// ============================================================================
console.log('\n── getAllCommands: happy path ────────────────────────────');

resetState();
routes = [{
  match: /SELECT command_key, category, patterns, description/,
  rows: [
    {
      command_key: 'restart_backend',
      category: 'system',
      patterns: '["restart","backend"]',
      description: 'Restart backend',
      action: 'systemctl restart',
      safety: 'moderate',
      context_aware: false,
      requires_hands_on: true,
      requires_confirmation: true,
      requires_parameters: null,
      allowed_roles: '["super_admin"]',
    },
    {
      command_key: 'help',
      category: 'system',
      patterns: '["help"]',
      description: 'Show help',
      action: 'show_help',
      safety: 'safe',
      context_aware: false,
      requires_hands_on: false,
      requires_confirmation: false,
      requires_parameters: '{"topic":"string"}',
      allowed_roles: '["super_admin"]',
    },
    {
      command_key: 'status',
      category: 'monitoring',
      patterns: '["status"]',
      description: 'Show status',
      action: 'get_status',
      safety: 'safe',
      context_aware: true,
      requires_hands_on: false,
      requires_confirmation: false,
      requires_parameters: null,
      allowed_roles: null,
    },
  ],
}];
{
  const svc = new OmaiCommandService();
  const r = await svc.getAllCommands();

  assertEq(r.version, '1.0.0', 'version');
  assert(r.settings.allowedRoles.includes('super_admin'), 'allowedRoles');
  assertEq(r.settings.timeoutSeconds, 30, 'timeoutSeconds');
  assertEq(r.logging.retention_days, 30, 'logging retention');

  // Categories
  assert(r.categories.system !== undefined, 'system category');
  assert(r.categories.monitoring !== undefined, 'monitoring category');
  assertEq(r.categories.system.description, 'System commands', 'system description');
  assertEq(r.categories.monitoring.description, 'Monitoring commands', 'monitoring description');

  // Commands in categories
  const restart = r.categories.system.commands.restart_backend;
  assert(restart !== undefined, 'restart_backend command');
  assertEq(restart.patterns, ['restart', 'backend'], 'patterns parsed');
  assertEq(restart.description, 'Restart backend', 'description');
  assertEq(restart.safety, 'moderate', 'safety');
  assertEq(restart.requires_hands_on, true, 'requires_hands_on');
  assertEq(restart.requires_confirmation, true, 'requires_confirmation');

  const help = r.categories.system.commands.help;
  assertEq(help.requires_parameters, { topic: 'string' }, 'requires_parameters parsed');

  const status = r.categories.monitoring.commands.status;
  assertEq(status.context_aware, true, 'context_aware true');
  assertEq(status.requires_parameters, undefined, 'no requires_parameters key when null');

  // Security lists
  assert(r.security.hands_on_required.includes('restart_backend'), 'hands_on_required');
  assert(r.security.confirmation_required.includes('restart_backend'), 'confirmation_required');
  assert(r.security.destructive_commands.includes('restart_backend'), 'destructive includes moderate');
  assert(!r.security.destructive_commands.includes('help'), 'safe not in destructive');

  // Cache populated
  assertEq(svc.cache.size, 1, 'cache has 1 entry');
}

// Cache hit — second call does NOT issue new query
resetState();
routes = [{
  match: /SELECT command_key, category, patterns, description/,
  rows: [{
    command_key: 'a', category: 'x', patterns: '[]',
    description: 'a', action: 'a', safety: 'safe',
    context_aware: false, requires_hands_on: false,
    requires_confirmation: false, requires_parameters: null, allowed_roles: null,
  }],
}];
{
  const svc = new OmaiCommandService();
  await svc.getAllCommands();
  assertEq(queryLog.length, 1, '1 query on first call');
  await svc.getAllCommands();
  assertEq(queryLog.length, 1, 'cached on second call');
}

// Cache expired → re-query
resetState();
routes = [{
  match: /SELECT command_key, category, patterns, description/,
  rows: [],
}];
{
  const svc = new OmaiCommandService();
  svc.cacheTimeout = 1; // 1ms → expires immediately
  await svc.getAllCommands();
  assertEq(queryLog.length, 1, 'first query');
  await new Promise(r => setTimeout(r, 5));
  await svc.getAllCommands();
  assertEq(queryLog.length, 2, 'expired → re-query');
}

// ============================================================================
// getAllCommands — error → fallback
// ============================================================================
console.log('\n── getAllCommands: error → fallback ──────────────────────');

resetState();
queryThrows = new Error('db down');
quiet();
{
  const svc = new OmaiCommandService();
  const r = await svc.getAllCommands();
  loud();
  assertEq(r.version, '1.0.0', 'fallback version');
  assert(r.description.includes('Fallback'), 'fallback description');
  assert(r.categories.system.commands.help !== undefined, 'fallback help command');
  assert(r.categories.system.commands.status !== undefined, 'fallback status command');
  assertEq(r.categories.system.commands.help.safety, 'safe', 'fallback help safety');
}

// ============================================================================
// getContextualSuggestions
// ============================================================================
console.log('\n── getContextualSuggestions ──────────────────────────────');

// Found
resetState();
routes = [{
  match: /FROM omai_command_contexts[\s\S]*WHERE page_path/,
  respond: (params) => {
    assertEq(params[0], '/dashboard', 'page_path param');
    return [{ suggested_commands: '["restart","status","help"]' }];
  },
}];
{
  const svc = new OmaiCommandService();
  const r = await svc.getContextualSuggestions('/dashboard');
  assertEq(r, ['restart', 'status', 'help'], 'parsed suggestions');
}

// Not found → defaults
resetState();
routes = [{ match: /FROM omai_command_contexts/, rows: [] }];
{
  const svc = new OmaiCommandService();
  const r = await svc.getContextualSuggestions('/unknown');
  assertEq(r, ['help', 'status', 'explain this page'], 'default suggestions');
}

// Error → minimal fallback
resetState();
queryThrows = new Error('boom');
quiet();
{
  const svc = new OmaiCommandService();
  const r = await svc.getContextualSuggestions('/x');
  loud();
  assertEq(r, ['help', 'status'], 'error fallback');
}

// ============================================================================
// setContextualSuggestions
// ============================================================================
console.log('\n── setContextualSuggestions ──────────────────────────────');

resetState();
routes = [{ match: /INSERT INTO omai_command_contexts/, rows: [{ affectedRows: 1 }] }];
quiet();
{
  const svc = new OmaiCommandService();
  await svc.setContextualSuggestions('/admin', ['a', 'b', 'c']);
  loud();
  assertEq(queryLog.length, 1, '1 query');
  assert(/INSERT INTO omai_command_contexts/.test(queryLog[0].sql), 'INSERT SQL');
  assert(/ON DUPLICATE KEY UPDATE/.test(queryLog[0].sql), 'upsert clause');
  assertEq(queryLog[0].params[0], '/admin', 'page_path param');
  assertEq(queryLog[0].params[1], '["a","b","c"]', 'suggestions JSON');
}

// Error swallowed
resetState();
queryThrows = new Error('boom');
quiet();
{
  const svc = new OmaiCommandService();
  await svc.setContextualSuggestions('/admin', ['x']); // should not throw
  loud();
  assert(true, 'error swallowed');
}

// ============================================================================
// getAllContextualSuggestions
// ============================================================================
console.log('\n── getAllContextualSuggestions ───────────────────────────');

resetState();
routes = [{
  match: /SELECT page_path, suggested_commands[\s\S]*FROM omai_command_contexts/,
  rows: [
    { page_path: '/dashboard', suggested_commands: '["help","status"]' },
    { page_path: '/admin', suggested_commands: '["restart"]' },
    { page_path: '/empty', suggested_commands: null },
  ],
}];
{
  const svc = new OmaiCommandService();
  const r = await svc.getAllContextualSuggestions();
  assertEq(r['/dashboard'], ['help', 'status'], 'dashboard suggestions');
  assertEq(r['/admin'], ['restart'], 'admin suggestions');
  assertEq(r['/empty'], [], 'null → []');
}

// Error → {}
resetState();
queryThrows = new Error('boom');
quiet();
{
  const svc = new OmaiCommandService();
  const r = await svc.getAllContextualSuggestions();
  loud();
  assertEq(r, {}, 'error → {}');
}

// ============================================================================
// findMatchingCommands
// ============================================================================
console.log('\n── findMatchingCommands ──────────────────────────────────');

resetState();
routes = [{
  match: /SELECT command_key, category, patterns, description/,
  rows: [
    {
      command_key: 'restart_backend', category: 'system',
      patterns: '["restart","restart backend"]',
      description: 'Restart the backend service',
      action: 'restart_backend', safety: 'moderate',
      context_aware: false, requires_hands_on: true, requires_confirmation: true,
    },
    {
      command_key: 'show_logs', category: 'monitoring',
      patterns: '["logs","show logs"]',
      description: 'Show recent logs',
      action: 'show_logs', safety: 'safe',
      context_aware: false, requires_hands_on: false, requires_confirmation: false,
    },
    {
      command_key: 'help', category: 'system',
      patterns: '["help"]',
      description: 'Show help',
      action: 'show_help', safety: 'safe',
      context_aware: false, requires_hands_on: false, requires_confirmation: false,
    },
  ],
}];
{
  const svc = new OmaiCommandService();
  const r = await svc.findMatchingCommands('restart');
  assert(r.length >= 1, 'at least 1 match');
  assertEq(r[0].command_key, 'restart_backend', 'highest match is restart_backend');
  assertEq(r[0].confidence, 1.0, 'exact pattern match → 1.0');
  assertEq(r[0].safety, 'moderate', 'safety preserved');
}

// Sorted by confidence — exact vs substring
resetState();
routes = [{
  match: /SELECT command_key, category, patterns, description/,
  rows: [
    // "restart now".includes("restart") → 0.8
    { command_key: 'partial', category: 'x', patterns: '["restart"]',
      description: 'a', action: 'a', safety: 'safe',
      context_aware: false, requires_hands_on: false, requires_confirmation: false },
    // "restart now".includes("restart now") → exact 1.0
    { command_key: 'exact', category: 'x', patterns: '["restart now"]',
      description: 'b', action: 'b', safety: 'safe',
      context_aware: false, requires_hands_on: false, requires_confirmation: false },
  ],
}];
{
  const svc = new OmaiCommandService();
  const r = await svc.findMatchingCommands('restart now');
  assertEq(r.length, 2, '2 matches');
  assertEq(r[0].command_key, 'exact', 'exact wins');
  assertEq(r[0].confidence, 1.0, 'exact confidence');
  assertEq(r[1].command_key, 'partial', 'partial second');
  assert(r[0].confidence >= r[1].confidence, 'sorted descending');
}

// No matches
resetState();
routes = [{
  match: /SELECT command_key, category, patterns, description/,
  rows: [
    { command_key: 'a', category: 'x', patterns: '["alpha"]',
      description: 'a', action: 'a', safety: 'safe',
      context_aware: false, requires_hands_on: false, requires_confirmation: false },
  ],
}];
{
  const svc = new OmaiCommandService();
  const r = await svc.findMatchingCommands('zzzzzz');
  assertEq(r, [], 'no matches → []');
}

// Error → []
resetState();
queryThrows = new Error('boom');
quiet();
{
  const svc = new OmaiCommandService();
  const r = await svc.findMatchingCommands('anything');
  loud();
  assertEq(r, [], 'error → []');
}

// ============================================================================
// calculateConfidence (pure)
// ============================================================================
console.log('\n── calculateConfidence ───────────────────────────────────');

{
  const svc = new OmaiCommandService();

  // Exact match → 1.0
  assertEq(svc.calculateConfidence('restart', ['restart']), 1.0, 'exact → 1.0');

  // Input includes pattern → 0.8
  assertEq(svc.calculateConfidence('please restart now', ['restart']), 0.8, 'input superset → 0.8');

  // Pattern includes input (reverse) → 0.6
  assertEq(svc.calculateConfidence('restart', ['restart the backend service']), 0.6, 'pattern superset → 0.6');

  // No overlap → 0.2 (fuzzy baseline)
  assertEq(svc.calculateConfidence('xyz', ['abc']), 0.2, 'no overlap → 0.2');

  // Multiple patterns → max wins
  assertEq(
    svc.calculateConfidence('restart', ['unrelated', 'restart', 'other']),
    1.0,
    'max across patterns',
  );

  // Empty patterns
  assertEq(svc.calculateConfidence('anything', []), 0, 'empty patterns → 0');
}

// ============================================================================
// clearCache
// ============================================================================
console.log('\n── clearCache ────────────────────────────────────────────');

{
  const svc = new OmaiCommandService();
  svc.cache.set('k', { data: {}, timestamp: Date.now() });
  assertEq(svc.cache.size, 1, 'cache primed');
  quiet();
  svc.clearCache();
  loud();
  assertEq(svc.cache.size, 0, 'cache empty after clear');
}

// ============================================================================
// getFallbackCommands
// ============================================================================
console.log('\n── getFallbackCommands ───────────────────────────────────');

{
  const svc = new OmaiCommandService();
  const r = svc.getFallbackCommands();
  assertEq(r.version, '1.0.0', 'version');
  assert(r.description.includes('Fallback'), 'Fallback label');
  assert(r.categories.system.commands.help !== undefined, 'help command');
  assert(r.categories.system.commands.status !== undefined, 'status command');
  assertEq(r.settings.allowedRoles, ['super_admin'], 'allowedRoles');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
