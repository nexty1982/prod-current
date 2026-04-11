#!/usr/bin/env npx tsx
/**
 * Unit tests for services/omaiCommandService.js (OMD-1174)
 *
 * Class-based service that reads omai_commands + omai_command_contexts
 * from the app DB pool. We stub `../config/db-compat` via require.cache
 * BEFORE requiring the SUT so `getAppPool()` returns our fake pool.
 *
 * Coverage:
 *   - constructor: Map cache + 5-min timeout
 *   - getAllCommands: happy path (organizes by category, builds security
 *     lists for hands_on/confirmation/destructive, parses JSON patterns +
 *     requires_parameters), caching (returns cached on second call),
 *     cache expiry after timeout, error → getFallbackCommands()
 *   - getContextualSuggestions: found row, missing row → default list,
 *     null suggested_commands → empty array, error → ['help','status']
 *   - setContextualSuggestions: INSERT ... ON DUPLICATE KEY UPDATE,
 *     suggestions JSON-stringified, error swallowed
 *   - getAllContextualSuggestions: builds path→array dict, error → {}
 *   - findMatchingCommands: empty input, exact match, substring match
 *     (both directions), no match → skipped, confidence sort order,
 *     error → []
 *   - calculateConfidence: 1.0 exact, 0.8 input⊇pattern, 0.6 pattern⊇input
 *   - clearCache: clears the Map
 *   - getFallbackCommands: shape + help/status keys
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

// ── Fake pool with scriptable responses ─────────────────────────────
type Call = { sql: string; params: any[] };
const queryLog: Call[] = [];

// Scriptable results — first match wins
type Rule = { pattern: RegExp; result: any[] | (() => any[]); throws?: boolean };
let rules: Rule[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const rule of rules) {
      if (rule.pattern.test(sql)) {
        if (rule.throws) throw new Error('fake db failure');
        const r = typeof rule.result === 'function' ? rule.result() : rule.result;
        return r;
      }
    }
    // default: empty rowset
    return [[]];
  },
};

const dbCompatStub = {
  getAppPool: () => fakePool,
  promisePool: fakePool,
};

const dbCompatPath = require.resolve('../../config/db-compat');
const dbCompatModule = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: dbCompatStub,
} as any;
require.cache[dbCompatPath] = dbCompatModule;
// Dual-path cache: tsx may resolve .js / .ts differently between test (.ts)
// and SUT (.js) files.
const dbCompatJsPath = dbCompatPath.replace(/\.ts$/, '.js');
if (dbCompatJsPath !== dbCompatPath) require.cache[dbCompatJsPath] = dbCompatModule;
const dbCompatTsPath = dbCompatPath.replace(/\.js$/, '.ts');
if (dbCompatTsPath !== dbCompatPath) require.cache[dbCompatTsPath] = dbCompatModule;

function resetState() {
  queryLog.length = 0;
  rules = [];
}

// Silence noisy logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const OmaiCommandService = require('../omaiCommandService');

async function main() {

// ============================================================================
// constructor
// ============================================================================
console.log('\n── constructor ───────────────────────────────────────────');

{
  const svc = new OmaiCommandService();
  assert(svc.cache instanceof Map, 'cache is a Map');
  assertEq(svc.cache.size, 0, 'cache starts empty');
  assertEq(svc.cacheTimeout, 5 * 60 * 1000, 'cacheTimeout = 5min');
}

// ============================================================================
// getAllCommands — happy path with multiple categories + security flags
// ============================================================================
console.log('\n── getAllCommands: happy path ────────────────────────────');

resetState();
rules = [
  {
    pattern: /FROM omai_commands/i,
    result: [[
      {
        command_key: 'help',
        category: 'system',
        patterns: JSON.stringify(['help', 'commands']),
        description: 'Show available commands',
        action: 'show_help',
        safety: 'safe',
        context_aware: false,
        requires_hands_on: false,
        requires_confirmation: false,
        requires_parameters: null,
        allowed_roles: null,
      },
      {
        command_key: 'delete_database',
        category: 'admin',
        patterns: JSON.stringify(['drop db', 'wipe']),
        description: 'Delete database',
        action: 'drop_db',
        safety: 'dangerous',
        context_aware: false,
        requires_hands_on: true,
        requires_confirmation: true,
        requires_parameters: JSON.stringify(['db_name']),
        allowed_roles: null,
      },
      {
        command_key: 'restart_service',
        category: 'admin',
        patterns: JSON.stringify(['restart', 'reboot']),
        description: 'Restart service',
        action: 'restart',
        safety: 'moderate',
        context_aware: true,
        requires_hands_on: false,
        requires_confirmation: true,
        requires_parameters: null,
        allowed_roles: null,
      },
    ]],
  },
];
{
  const svc = new OmaiCommandService();
  const r = await svc.getAllCommands();
  assertEq(r.version, '1.0.0', 'version');
  assertEq(typeof r.categories, 'object', 'categories is object');
  assertEq(typeof r.categories.system, 'object', 'system category');
  assertEq(typeof r.categories.admin, 'object', 'admin category');
  assertEq(r.categories.system.description, 'System commands', 'system desc capitalized');
  assertEq(r.categories.admin.description, 'Admin commands', 'admin desc capitalized');
  // help command structure
  const help = r.categories.system.commands.help;
  assertEq(help.patterns, ['help', 'commands'], 'help patterns parsed');
  assertEq(help.description, 'Show available commands', 'help description');
  assertEq(help.action, 'show_help', 'help action');
  assertEq(help.safety, 'safe', 'help safety');
  assertEq(help.context_aware, false, 'help context_aware');
  assertEq(help.requires_hands_on, false, 'help requires_hands_on');
  assert(help.requires_parameters === undefined, 'help no requires_parameters');
  // delete_database with requires_parameters
  const del = r.categories.admin.commands.delete_database;
  assertEq(del.requires_parameters, ['db_name'], 'delete_database requires_parameters parsed');
  // security lists
  assertEq(r.security.hands_on_required, ['delete_database'], 'hands_on_required list');
  assertEq(
    r.security.confirmation_required.sort(),
    ['delete_database', 'restart_service'].sort(),
    'confirmation_required list'
  );
  assertEq(
    r.security.destructive_commands.sort(),
    ['delete_database', 'restart_service'].sort(),
    'destructive_commands (moderate + dangerous)'
  );
  // settings
  assertEq(r.settings.allowedRoles, ['super_admin'], 'settings.allowedRoles');
  assertEq(r.settings.requireConfirmation, true, 'requireConfirmation');
}

// ============================================================================
// getAllCommands — caching
// ============================================================================
console.log('\n── getAllCommands: caching ───────────────────────────────');

resetState();
let queryCount = 0;
rules = [
  {
    pattern: /FROM omai_commands/i,
    result: () => {
      queryCount++;
      return [[
        {
          command_key: 'help',
          category: 'system',
          patterns: JSON.stringify(['help']),
          description: 'help',
          action: 'show_help',
          safety: 'safe',
          context_aware: false,
          requires_hands_on: false,
          requires_confirmation: false,
          requires_parameters: null,
          allowed_roles: null,
        },
      ]];
    },
  },
];
{
  const svc = new OmaiCommandService();
  await svc.getAllCommands();
  await svc.getAllCommands();
  await svc.getAllCommands();
  assertEq(queryCount, 1, 'second + third call return cached (1 query total)');

  // Manual cache expiry — mutate timestamp to simulate timeout
  const entry = svc.cache.get('all_commands');
  entry.timestamp = Date.now() - (6 * 60 * 1000);
  await svc.getAllCommands();
  assertEq(queryCount, 2, 'query re-executes after cache expiry');

  // clearCache forces refetch
  quiet();
  svc.clearCache();
  loud();
  assertEq(svc.cache.size, 0, 'cache cleared');
  await svc.getAllCommands();
  assertEq(queryCount, 3, 'query re-executes after clearCache');
}

// ============================================================================
// getAllCommands — error path → fallback
// ============================================================================
console.log('\n── getAllCommands: error fallback ────────────────────────');

resetState();
rules = [{ pattern: /FROM omai_commands/i, result: [], throws: true }];
quiet();
{
  const svc = new OmaiCommandService();
  const r = await svc.getAllCommands();
  loud();
  assertEq(r.description, 'Fallback OMAI commands (database unavailable)', 'fallback description');
  assert(r.categories.system.commands.help !== undefined, 'fallback has help');
  assert(r.categories.system.commands.status !== undefined, 'fallback has status');
  assertEq(r.categories.system.commands.help.action, 'show_help', 'fallback help action');
  // Not cached on error — next call still errors
  const r2 = await svc.getAllCommands();
  assertEq(r2.description, 'Fallback OMAI commands (database unavailable)', 'error path not cached');
}

// ============================================================================
// getAllCommands — empty result
// ============================================================================
console.log('\n── getAllCommands: empty ─────────────────────────────────');

resetState();
rules = [{ pattern: /FROM omai_commands/i, result: [[]] }];
{
  const svc = new OmaiCommandService();
  const r = await svc.getAllCommands();
  assertEq(r.categories, {}, 'empty categories');
  assertEq(r.security.hands_on_required, [], 'empty hands_on_required');
  assertEq(r.security.destructive_commands, [], 'empty destructive');
}

// ============================================================================
// getContextualSuggestions
// ============================================================================
console.log('\n── getContextualSuggestions ──────────────────────────────');

// Found row
resetState();
rules = [{
  pattern: /FROM omai_command_contexts/i,
  result: [[{ suggested_commands: JSON.stringify(['restart', 'status']) }]],
}];
{
  const svc = new OmaiCommandService();
  const r = await svc.getContextualSuggestions('/admin');
  assertEq(r, ['restart', 'status'], 'returns parsed suggestions');
  assertEq(queryLog[0].params[0], '/admin', 'page path param');
}

// Null suggested_commands → []
resetState();
rules = [{
  pattern: /FROM omai_command_contexts/i,
  result: [[{ suggested_commands: null }]],
}];
{
  const svc = new OmaiCommandService();
  const r = await svc.getContextualSuggestions('/admin');
  assertEq(r, [], 'null suggested_commands → []');
}

// Not found → default general suggestions
resetState();
rules = [{ pattern: /FROM omai_command_contexts/i, result: [[]] }];
{
  const svc = new OmaiCommandService();
  const r = await svc.getContextualSuggestions('/unknown');
  assertEq(r, ['help', 'status', 'explain this page'], 'default general suggestions');
}

// Error → ['help', 'status']
resetState();
rules = [{ pattern: /FROM omai_command_contexts/i, result: [], throws: true }];
quiet();
{
  const svc = new OmaiCommandService();
  const r = await svc.getContextualSuggestions('/admin');
  loud();
  assertEq(r, ['help', 'status'], 'error fallback');
}

// ============================================================================
// setContextualSuggestions
// ============================================================================
console.log('\n── setContextualSuggestions ──────────────────────────────');

resetState();
rules = [{ pattern: /INSERT INTO omai_command_contexts/i, result: [{}] }];
quiet();
{
  const svc = new OmaiCommandService();
  await svc.setContextualSuggestions('/admin', ['restart', 'status']);
  loud();
  assertEq(queryLog.length, 1, '1 query');
  assert(/INSERT INTO omai_command_contexts/i.test(queryLog[0].sql), 'INSERT statement');
  assert(/ON DUPLICATE KEY UPDATE/i.test(queryLog[0].sql), 'upsert clause');
  assertEq(queryLog[0].params[0], '/admin', 'page_path param');
  assertEq(queryLog[0].params[1], JSON.stringify(['restart', 'status']), 'JSON-serialized');
}

// Error swallowed
resetState();
rules = [{ pattern: /INSERT INTO omai_command_contexts/i, result: [], throws: true }];
quiet();
{
  const svc = new OmaiCommandService();
  let caught = null;
  try {
    await svc.setContextualSuggestions('/admin', ['x']);
  } catch (e) {
    caught = e;
  }
  loud();
  assert(caught === null, 'error swallowed (no throw)');
}

// ============================================================================
// getAllContextualSuggestions
// ============================================================================
console.log('\n── getAllContextualSuggestions ───────────────────────────');

resetState();
rules = [{
  pattern: /FROM omai_command_contexts/i,
  result: [[
    { page_path: '/admin', suggested_commands: JSON.stringify(['restart']) },
    { page_path: '/records', suggested_commands: JSON.stringify(['export', 'import']) },
    { page_path: '/empty', suggested_commands: null },
  ]],
}];
{
  const svc = new OmaiCommandService();
  const r = await svc.getAllContextualSuggestions();
  assertEq(r['/admin'], ['restart'], 'admin suggestions');
  assertEq(r['/records'], ['export', 'import'], 'records suggestions');
  assertEq(r['/empty'], [], 'null → []');
  assertEq(Object.keys(r).length, 3, '3 entries');
}

// Error → {}
resetState();
rules = [{ pattern: /FROM omai_command_contexts/i, result: [], throws: true }];
quiet();
{
  const svc = new OmaiCommandService();
  const r = await svc.getAllContextualSuggestions();
  loud();
  assertEq(r, {}, 'error → empty dict');
}

// ============================================================================
// findMatchingCommands
// ============================================================================
console.log('\n── findMatchingCommands ──────────────────────────────────');

const makeCmdRow = (key: string, patterns: string[], safety = 'safe') => ({
  command_key: key,
  category: 'test',
  patterns: JSON.stringify(patterns),
  description: `${key} description`,
  action: `do_${key}`,
  safety,
  context_aware: false,
  requires_hands_on: false,
  requires_confirmation: false,
});

// Exact + substring match sorting
resetState();
rules = [{
  pattern: /FROM omai_commands/i,
  result: [[
    makeCmdRow('help', ['help', 'commands']),
    makeCmdRow('restart', ['restart service', 'reboot']),
    makeCmdRow('unrelated', ['foobar', 'baz']),
  ]],
}];
{
  const svc = new OmaiCommandService();
  const matches = await svc.findMatchingCommands('help');
  // Only 'help' matches: exact → 1.0; 'restart service' / 'reboot' / 'foobar' don't
  // contain 'help' and 'help' doesn't contain them — no match for others.
  assertEq(matches.length, 1, 'only "help" matches');
  assertEq(matches[0].command_key, 'help', 'help key');
  assertEq(matches[0].confidence, 1.0, 'exact match confidence 1.0');
  assertEq(matches[0].description, 'help description', 'description passed through');
  assertEq(matches[0].action, 'do_help', 'action passed through');
}

// Input-contains-pattern (0.8)
resetState();
rules = [{
  pattern: /FROM omai_commands/i,
  result: [[ makeCmdRow('restart', ['restart']) ]],
}];
{
  const svc = new OmaiCommandService();
  const matches = await svc.findMatchingCommands('please restart now');
  assertEq(matches.length, 1, '1 match');
  assertEq(matches[0].confidence, 0.8, 'input⊇pattern = 0.8');
}

// Pattern-contains-input (0.6)
resetState();
rules = [{
  pattern: /FROM omai_commands/i,
  result: [[ makeCmdRow('restart', ['restart the service please']) ]],
}];
{
  const svc = new OmaiCommandService();
  const matches = await svc.findMatchingCommands('restart');
  assertEq(matches.length, 1, '1 match');
  assertEq(matches[0].confidence, 0.6, 'pattern⊇input = 0.6');
}

// Same-case exact: input === pattern → 1.0
resetState();
rules = [{
  pattern: /FROM omai_commands/i,
  result: [[ makeCmdRow('reboot', ['REBOOT']) ]],
}];
{
  const svc = new OmaiCommandService();
  const matches = await svc.findMatchingCommands('reboot');
  assertEq(matches.length, 1, '1 match (case-insensitive)');
  assertEq(matches[0].confidence, 1.0, 'case-insensitive exact = 1.0');
}

// Confidence sort order: two matches, higher confidence first
resetState();
rules = [{
  pattern: /FROM omai_commands/i,
  result: [[
    makeCmdRow('fuzzy', ['restart the entire service stack']),    // 0.6 pattern⊇input
    makeCmdRow('exact', ['restart']),                                // 1.0 exact
  ]],
}];
{
  const svc = new OmaiCommandService();
  const matches = await svc.findMatchingCommands('restart');
  assertEq(matches.length, 2, '2 matches');
  assertEq(matches[0].command_key, 'exact', 'higher confidence first');
  assertEq(matches[0].confidence, 1.0, 'exact 1.0');
  assertEq(matches[1].command_key, 'fuzzy', 'fuzzy second');
  assertEq(matches[1].confidence, 0.6, 'pattern⊇input = 0.6');
}

// No matches
resetState();
rules = [{
  pattern: /FROM omai_commands/i,
  result: [[ makeCmdRow('help', ['help', 'commands']) ]],
}];
{
  const svc = new OmaiCommandService();
  const matches = await svc.findMatchingCommands('xyzzy');
  assertEq(matches, [], 'no matches');
}

// Error → []
resetState();
rules = [{ pattern: /FROM omai_commands/i, result: [], throws: true }];
quiet();
{
  const svc = new OmaiCommandService();
  const r = await svc.findMatchingCommands('help');
  loud();
  assertEq(r, [], 'error → []');
}

// ============================================================================
// calculateConfidence (direct)
// ============================================================================
console.log('\n── calculateConfidence ───────────────────────────────────');

{
  const svc = new OmaiCommandService();
  assertEq(svc.calculateConfidence('help', ['help']), 1.0, 'exact = 1.0');
  assertEq(svc.calculateConfidence('help', ['HELP']), 1.0, 'case-insensitive exact');
  // Note: input === pattern only matches if equal. Otherwise includes checks run.
  // For "please help" vs ["help"]: input.includes(patternLower) → true → 0.8
  assertEq(svc.calculateConfidence('please help', ['help']), 0.8, 'input⊇pattern = 0.8');
  // For "help" vs ["help me please"]: input.includes(patternLower) → false,
  // patternLower.includes(input) → true → 0.6
  assertEq(svc.calculateConfidence('help', ['help me please']), 0.6, 'pattern⊇input = 0.6');
  // No relation → 0.2
  assertEq(svc.calculateConfidence('help', ['xyzzy']), 0.2, 'unrelated = 0.2');
  // Max across patterns
  assertEq(svc.calculateConfidence('help', ['xyzzy', 'help']), 1.0, 'max over patterns');
  assertEq(svc.calculateConfidence('please help', ['xyzzy', 'help']), 0.8, 'best = 0.8');
}

// ============================================================================
// clearCache
// ============================================================================
console.log('\n── clearCache ────────────────────────────────────────────');

{
  const svc = new OmaiCommandService();
  svc.cache.set('foo', { data: 1, timestamp: Date.now() });
  svc.cache.set('bar', { data: 2, timestamp: Date.now() });
  assertEq(svc.cache.size, 2, 'cache has entries');
  quiet();
  svc.clearCache();
  loud();
  assertEq(svc.cache.size, 0, 'cache cleared');
}

// ============================================================================
// getFallbackCommands (direct)
// ============================================================================
console.log('\n── getFallbackCommands ───────────────────────────────────');

{
  const svc = new OmaiCommandService();
  const fb = svc.getFallbackCommands();
  assertEq(fb.version, '1.0.0', 'version');
  assertEq(fb.description, 'Fallback OMAI commands (database unavailable)', 'description');
  assert(fb.categories.system !== undefined, 'system category');
  assert(fb.categories.system.commands.help !== undefined, 'help command');
  assert(fb.categories.system.commands.status !== undefined, 'status command');
  assertEq(fb.categories.system.commands.help.action, 'show_help', 'help action');
  assertEq(fb.categories.system.commands.help.safety, 'safe', 'help safety');
  assertEq(fb.categories.system.commands.status.action, 'get_system_status', 'status action');
  assertEq(fb.settings.allowedRoles, ['super_admin'], 'settings.allowedRoles');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
