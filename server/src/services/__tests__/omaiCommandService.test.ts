#!/usr/bin/env npx tsx
/**
 * Unit tests for services/omaiCommandService.js (OMD-1096)
 *
 * Class-based service backed by MariaDB. Only dep is `../config/db-compat`
 * (getAppPool). We stub that via require.cache with a SQL-routed fake pool
 * and then require the SUT.
 *
 * Coverage:
 *   - getAllCommands:
 *       · happy path (multiple commands across categories)
 *       · category structure building with auto-generated description
 *       · security lists: destructive_commands (moderate/dangerous),
 *         confirmation_required, hands_on_required
 *       · requires_parameters parsing when present
 *       · cache hit returns cached data
 *       · cache TTL expiry refetches
 *       · DB error → getFallbackCommands()
 *       · empty patterns string handled via || '[]'
 *   - getContextualSuggestions:
 *       · page-specific returns parsed suggestions
 *       · missing row returns generic defaults
 *       · DB error returns minimal fallback
 *       · empty suggested_commands handled via || '[]'
 *   - setContextualSuggestions:
 *       · INSERT ... ON DUPLICATE KEY with JSON-stringified array
 *       · DB error caught (no throw)
 *   - getAllContextualSuggestions:
 *       · returns path → array map
 *       · DB error returns {}
 *   - findMatchingCommands:
 *       · matches when input contains pattern
 *       · matches when pattern contains input
 *       · no match → excluded
 *       · results sorted by confidence (desc)
 *       · DB error returns []
 *   - calculateConfidence (private, accessed via class instance):
 *       · exact match → 1.0
 *       · input contains pattern → 0.8
 *       · pattern contains input → 0.6
 *       · no overlap → 0.2
 *   - clearCache: invalidates the cache
 *   - getFallbackCommands: has expected shape
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

// ── SQL-routed fake pool ────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Handler = (sql: string, params: any[]) => any;
let handler: Handler | null = null;
let throwNext = false;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (throwNext) {
      throwNext = false;
      throw new Error('fake db failure');
    }
    if (handler) {
      const result = handler(sql, params);
      return [result, []];
    }
    return [[], []];
  },
};

function resetDb() {
  queryLog.length = 0;
  handler = null;
  throwNext = false;
}

// Stub config/db-compat BEFORE requiring the SUT
const dbPath = require.resolve('../../config/db-compat');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool, promisePool: fakePool },
} as any;

const OmaiCommandService = require('../omaiCommandService');

// Silence noisy logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

async function main() {

// ============================================================================
// Instantiation
// ============================================================================
console.log('\n── constructor ───────────────────────────────────────────');

const svc = new OmaiCommandService();
assert(svc instanceof OmaiCommandService, 'creates instance');
assert(svc.cache instanceof Map, 'has Map cache');
assertEq(svc.cacheTimeout, 5 * 60 * 1000, 'cacheTimeout = 5min');

// ============================================================================
// getAllCommands — happy path
// ============================================================================
console.log('\n── getAllCommands: happy path ────────────────────────────');

resetDb();
handler = (sql: string) => {
  if (/FROM omai_commands/.test(sql) && /is_active = TRUE/.test(sql)) {
    return [
      {
        command_key: 'help',
        category: 'system',
        patterns: '["help","commands"]',
        description: 'Show help',
        action: 'show_help',
        safety: 'safe',
        context_aware: 0,
        requires_hands_on: 0,
        requires_confirmation: 0,
        requires_parameters: null,
        allowed_roles: '["super_admin"]',
      },
      {
        command_key: 'restart',
        category: 'system',
        patterns: '["restart","reboot"]',
        description: 'Restart service',
        action: 'restart_service',
        safety: 'dangerous',
        context_aware: 0,
        requires_hands_on: 1,
        requires_confirmation: 1,
        requires_parameters: '["service_name"]',
        allowed_roles: '["super_admin"]',
      },
      {
        command_key: 'deploy',
        category: 'deployment',
        patterns: '["deploy","push"]',
        description: 'Deploy app',
        action: 'deploy_app',
        safety: 'moderate',
        context_aware: 1,
        requires_hands_on: 0,
        requires_confirmation: 1,
        requires_parameters: null,
        allowed_roles: '["super_admin"]',
      },
    ];
  }
  return [];
};

{
  const svc2 = new OmaiCommandService();
  const r = await svc2.getAllCommands();
  assertEq(r.version, '1.0.0', 'version');
  assert(r.description.includes('Global'), 'description present');
  assertEq(r.settings.allowedRoles, ['super_admin'], 'settings.allowedRoles');
  assertEq(r.settings.requireConfirmation, true, 'settings.requireConfirmation');

  // Categories built
  assert(r.categories.system !== undefined, 'system category');
  assert(r.categories.deployment !== undefined, 'deployment category');
  assertEq(r.categories.system.description, 'System commands', 'system category desc');
  assertEq(r.categories.deployment.description, 'Deployment commands', 'deployment desc');

  // System commands
  const help = r.categories.system.commands.help;
  assertEq(help.patterns, ['help', 'commands'], 'help patterns parsed');
  assertEq(help.description, 'Show help', 'help description');
  assertEq(help.action, 'show_help', 'help action');
  assertEq(help.safety, 'safe', 'help safety');
  // SUT uses `cmd.context_aware || false`, so falsy 0 becomes false
  assertEq(help.context_aware, false, 'help context_aware (0 || false)');
  assertEq(help.requires_hands_on, false, 'help requires_hands_on (0 || false)');
  assertEq(help.requires_confirmation, false, 'help requires_confirmation (0 || false)');
  assert(!('requires_parameters' in help), 'help has no requires_parameters');

  const restart = r.categories.system.commands.restart;
  assertEq(restart.requires_parameters, ['service_name'], 'restart requires_parameters');
  assertEq(restart.requires_hands_on, 1, 'restart requires_hands_on (truthy 1 kept)');
  assertEq(restart.requires_confirmation, 1, 'restart requires_confirmation (truthy 1 kept)');

  // Security lists
  assert(r.security.hands_on_required.includes('restart'), 'restart in hands_on_required');
  assert(r.security.confirmation_required.includes('restart'), 'restart in confirmation_required');
  assert(r.security.confirmation_required.includes('deploy'), 'deploy in confirmation_required');
  assert(r.security.destructive_commands.includes('restart'), 'restart in destructive_commands (dangerous)');
  assert(r.security.destructive_commands.includes('deploy'), 'deploy in destructive_commands (moderate)');
  assert(!r.security.destructive_commands.includes('help'), 'help NOT in destructive_commands (safe)');

  // Logging defaults
  assertEq(r.logging.enabled, true, 'logging.enabled');
  assertEq(r.logging.retention_days, 30, 'logging.retention_days');
}

// ============================================================================
// getAllCommands — cache hit
// ============================================================================
console.log('\n── getAllCommands: cache ─────────────────────────────────');

{
  const svc2 = new OmaiCommandService();
  svc2.cache.set('all_commands', {
    data: { version: 'cached', categories: {} },
    timestamp: Date.now(),
  });
  resetDb();
  const r = await svc2.getAllCommands();
  assertEq(r.version, 'cached', 'returns cached data');
  assertEq(queryLog.length, 0, 'no DB query on cache hit');
}

// Expired cache refetches
{
  const svc2 = new OmaiCommandService();
  svc2.cache.set('all_commands', {
    data: { version: 'stale', categories: {} },
    timestamp: Date.now() - (6 * 60 * 1000), // 6 min ago, past 5-min TTL
  });
  resetDb();
  handler = () => [];
  const r = await svc2.getAllCommands();
  assertEq(r.version, '1.0.0', 'expired cache refetches');
  assertEq(queryLog.length, 1, 'DB queried');
}

// ============================================================================
// getAllCommands — empty patterns handled via || '[]'
// ============================================================================
console.log('\n── getAllCommands: null/empty patterns ───────────────────');

resetDb();
handler = () => [{
  command_key: 'k1', category: 'c1', patterns: null, description: 'd',
  action: 'a', safety: 'safe', context_aware: 0,
  requires_hands_on: 0, requires_confirmation: 0, requires_parameters: null,
}];
{
  const svc2 = new OmaiCommandService();
  const r = await svc2.getAllCommands();
  assertEq(r.categories.c1.commands.k1.patterns, [], 'null patterns → []');
}

// ============================================================================
// getAllCommands — DB error falls back
// ============================================================================
console.log('\n── getAllCommands: DB error ──────────────────────────────');

resetDb();
throwNext = true;
quiet();
{
  const svc2 = new OmaiCommandService();
  const r = await svc2.getAllCommands();
  loud();
  assert(r.description.includes('Fallback'), 'fallback description');
  assert(r.categories.system.commands.help !== undefined, 'fallback has help');
  assert(r.categories.system.commands.status !== undefined, 'fallback has status');
  assertEq(r.categories.system.commands.help.safety, 'safe', 'fallback help safety');
}

// ============================================================================
// getContextualSuggestions
// ============================================================================
console.log('\n── getContextualSuggestions ──────────────────────────────');

resetDb();
handler = (sql: string, params: any[]) => {
  if (/FROM omai_command_contexts/.test(sql) && /WHERE page_path/.test(sql)) {
    if (params[0] === '/records') {
      return [{ suggested_commands: '["view_records","export_records"]' }];
    }
  }
  return [];
};
{
  const svc2 = new OmaiCommandService();
  const r = await svc2.getContextualSuggestions('/records');
  assertEq(r, ['view_records', 'export_records'], 'page-specific suggestions');
}

// Missing page → generic defaults
resetDb();
handler = () => [];
{
  const svc2 = new OmaiCommandService();
  const r = await svc2.getContextualSuggestions('/unknown');
  assertEq(r, ['help', 'status', 'explain this page'], 'default suggestions');
}

// Empty suggested_commands → [] (via || '[]')
resetDb();
handler = () => [{ suggested_commands: null }];
{
  const svc2 = new OmaiCommandService();
  const r = await svc2.getContextualSuggestions('/records');
  assertEq(r, [], 'null suggested_commands → []');
}

// DB error → minimal fallback
resetDb();
throwNext = true;
quiet();
{
  const svc2 = new OmaiCommandService();
  const r = await svc2.getContextualSuggestions('/anything');
  loud();
  assertEq(r, ['help', 'status'], 'DB error fallback');
}

// ============================================================================
// setContextualSuggestions
// ============================================================================
console.log('\n── setContextualSuggestions ──────────────────────────────');

resetDb();
handler = () => ({});
quiet();
{
  const svc2 = new OmaiCommandService();
  await svc2.setContextualSuggestions('/dashboard', ['a', 'b']);
  loud();
  assertEq(queryLog.length, 1, '1 query');
  assert(/INSERT INTO omai_command_contexts/.test(queryLog[0].sql), 'INSERT');
  assert(/ON DUPLICATE KEY UPDATE/.test(queryLog[0].sql), 'ON DUPLICATE KEY');
  assertEq(queryLog[0].params[0], '/dashboard', 'page_path param');
  assertEq(queryLog[0].params[1], '["a","b"]', 'JSON-stringified array');
}

// DB error → caught, no throw
resetDb();
throwNext = true;
quiet();
{
  const svc2 = new OmaiCommandService();
  let threw = false;
  try { await svc2.setContextualSuggestions('/x', []); }
  catch { threw = true; }
  loud();
  assertEq(threw, false, 'DB error caught (no throw)');
}

// ============================================================================
// getAllContextualSuggestions
// ============================================================================
console.log('\n── getAllContextualSuggestions ───────────────────────────');

resetDb();
handler = () => [
  { page_path: '/a', suggested_commands: '["cmd1"]' },
  { page_path: '/b', suggested_commands: '["cmd2","cmd3"]' },
  { page_path: '/c', suggested_commands: null },
];
{
  const svc2 = new OmaiCommandService();
  const r = await svc2.getAllContextualSuggestions();
  assertEq(r['/a'], ['cmd1'], '/a suggestions');
  assertEq(r['/b'], ['cmd2', 'cmd3'], '/b suggestions');
  assertEq(r['/c'], [], '/c null → []');
}

// DB error → {}
resetDb();
throwNext = true;
quiet();
{
  const svc2 = new OmaiCommandService();
  const r = await svc2.getAllContextualSuggestions();
  loud();
  assertEq(r, {}, 'DB error → {}');
}

// ============================================================================
// findMatchingCommands
// ============================================================================
console.log('\n── findMatchingCommands ──────────────────────────────────');

resetDb();
handler = () => [
  {
    command_key: 'restart',
    category: 'system',
    patterns: '["restart","reboot"]',
    description: 'Restart',
    action: 'restart_svc',
    safety: 'dangerous',
    context_aware: 0,
    requires_hands_on: 1,
    requires_confirmation: 1,
  },
  {
    command_key: 'deploy',
    category: 'deployment',
    patterns: '["deploy","ship"]',
    description: 'Deploy',
    action: 'deploy_app',
    safety: 'moderate',
    context_aware: 0,
    requires_hands_on: 0,
    requires_confirmation: 1,
  },
  {
    command_key: 'help',
    category: 'system',
    patterns: '["help"]',
    description: 'Help',
    action: 'show_help',
    safety: 'safe',
    context_aware: 0,
    requires_hands_on: 0,
    requires_confirmation: 0,
  },
];

{
  const svc2 = new OmaiCommandService();

  // Exact match
  const r = await svc2.findMatchingCommands('restart');
  assertEq(r[0].command_key, 'restart', 'restart matches restart');
  assertEq(r[0].confidence, 1.0, 'exact match → 1.0');

  // Input contains pattern
  const r2 = await svc2.findMatchingCommands('please restart the server');
  const restart = r2.find((m: any) => m.command_key === 'restart');
  assert(restart !== undefined, '"please restart..." matches restart');
  assertEq(restart.confidence, 0.8, 'input contains pattern → 0.8');

  // Pattern contains input
  const r3 = await svc2.findMatchingCommands('dep');
  const deploy = r3.find((m: any) => m.command_key === 'deploy');
  assert(deploy !== undefined, '"dep" matches deploy');
  assertEq(deploy.confidence, 0.6, 'pattern contains input → 0.6');

  // No match
  const r4 = await svc2.findMatchingCommands('xyzzy foobar');
  assertEq(r4.length, 0, 'no match → []');

  // Sort by confidence
  const r5 = await svc2.findMatchingCommands('help');
  assertEq(r5[0].command_key, 'help', 'help top result');
  for (let i = 1; i < r5.length; i++) {
    assert(r5[i - 1].confidence >= r5[i].confidence, `sorted: ${i - 1} >= ${i}`);
  }
}

// DB error → []
resetDb();
throwNext = true;
quiet();
{
  const svc2 = new OmaiCommandService();
  const r = await svc2.findMatchingCommands('anything');
  loud();
  assertEq(r, [], 'DB error → []');
}

// ============================================================================
// calculateConfidence (private)
// ============================================================================
console.log('\n── calculateConfidence ───────────────────────────────────');

{
  const svc2 = new OmaiCommandService();
  assertEq(svc2.calculateConfidence('restart', ['restart']), 1.0, 'exact → 1.0');
  assertEq(svc2.calculateConfidence('please restart now', ['restart']), 0.8, 'input contains → 0.8');
  assertEq(svc2.calculateConfidence('dep', ['deploy']), 0.6, 'pattern contains → 0.6');
  assertEq(svc2.calculateConfidence('xyzzy', ['deploy']), 0.2, 'no overlap → 0.2');
  // Multiple patterns: takes max
  assertEq(svc2.calculateConfidence('help', ['xyz', 'help']), 1.0, 'max across patterns');
  // Patterns are lowercased but input is not — callers (findMatchingCommands)
  // are responsible for pre-lowercasing input
  assertEq(svc2.calculateConfidence('HELP', ['help']), 0.2, 'input not lowercased by helper');
}

// ============================================================================
// clearCache
// ============================================================================
console.log('\n── clearCache ────────────────────────────────────────────');

{
  const svc2 = new OmaiCommandService();
  svc2.cache.set('k1', 'v1');
  svc2.cache.set('k2', 'v2');
  assertEq(svc2.cache.size, 2, 'cache has 2 entries');
  quiet();
  svc2.clearCache();
  loud();
  assertEq(svc2.cache.size, 0, 'cache empty after clear');
}

// ============================================================================
// getFallbackCommands
// ============================================================================
console.log('\n── getFallbackCommands ───────────────────────────────────');

{
  const svc2 = new OmaiCommandService();
  const r = svc2.getFallbackCommands();
  assertEq(r.version, '1.0.0', 'version');
  assert(r.description.includes('Fallback'), 'description');
  assert(r.categories.system !== undefined, 'system category');
  assert(r.categories.system.commands.help !== undefined, 'help command');
  assert(r.categories.system.commands.status !== undefined, 'status command');
  assertEq(r.categories.system.commands.help.safety, 'safe', 'help safety');
  assertEq(r.settings.allowedRoles, ['super_admin'], 'settings.allowedRoles');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
