#!/usr/bin/env npx tsx
/**
 * Unit tests for services/omaiCommandService.js (OMD-1153)
 *
 * Dependency: ../config/db-compat. Module imports `getAppPool` AND
 * `promisePool` from the same module. Stub exposes both; methods use
 * getAppPool() at call-time.
 *
 * Coverage:
 *   - getAllCommands: categorizes, parses patterns JSON, builds security
 *     lists (hands_on_required, confirmation_required, destructive),
 *     caches result (second call skips DB), TTL expiry triggers re-fetch,
 *     DB error returns fallback
 *   - getContextualSuggestions: parses JSON, default when not found,
 *     error returns fallback
 *   - setContextualSuggestions: JSON-stringifies and upserts, error
 *     swallowed (no throw)
 *   - getAllContextualSuggestions: transforms rows to map, error → {}
 *   - findMatchingCommands: pattern matching (case-insensitive, both
 *     directions), confidence scoring, sorted by confidence, error → []
 *   - calculateConfidence: exact=1.0, input-contains-pattern=0.8,
 *     pattern-contains-input=0.6, no-match=0.2, returns max across patterns
 *   - clearCache
 *   - getFallbackCommands: shape
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

// ── db-compat stub ───────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const dbQueries: QueryCall[] = [];
let commandRows: any[] = [];
let contextRows: any[] = [];
let allContextRows: any[] = [];
let throwOnPattern: RegExp | null = null;

const fakeAppPool = {
  query: async (sql: string, params: any[] = []) => {
    dbQueries.push({ sql, params });
    if (throwOnPattern && throwOnPattern.test(sql)) {
      throw new Error('fake db failure');
    }
    if (/FROM omai_commands/i.test(sql)) {
      return [commandRows];
    }
    if (/FROM omai_command_contexts[\s\S]*WHERE page_path/i.test(sql)) {
      return [contextRows];
    }
    if (/INSERT INTO omai_command_contexts/i.test(sql)) {
      return [{ affectedRows: 1 }];
    }
    if (/FROM omai_command_contexts/i.test(sql)) {
      return [allContextRows];
    }
    return [[]];
  },
};

const dbCompatStub = {
  getAppPool: () => fakeAppPool,
  promisePool: fakeAppPool,
};

// Install stubs
function installStub(relPath: string, exports: any): void {
  const tsxResolved = require.resolve(relPath);
  const alt = tsxResolved.endsWith('.ts')
    ? tsxResolved.replace(/\.ts$/, '.js')
    : tsxResolved.replace(/\.js$/, '.ts');
  for (const p of [tsxResolved, alt]) {
    require.cache[p] = { id: p, filename: p, loaded: true, exports } as any;
  }
}

installStub('../../config/db-compat', dbCompatStub);

function resetState() {
  dbQueries.length = 0;
  commandRows = [];
  contextRows = [];
  allContextRows = [];
  throwOnPattern = null;
}

// Silence logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const OmaiCommandService = require('../omaiCommandService');

async function main() {

// ============================================================================
// getAllCommands — happy path + categorization
// ============================================================================
console.log('\n── getAllCommands: happy path ────────────────────────────');

{
  const svc = new OmaiCommandService();
  resetState();
  commandRows = [
    {
      command_key: 'help',
      category: 'system',
      patterns: JSON.stringify(['help', 'commands']),
      description: 'Show help',
      action: 'show_help',
      safety: 'safe',
      context_aware: false,
      requires_hands_on: false,
      requires_confirmation: false,
      requires_parameters: null,
      allowed_roles: 'super_admin',
    },
    {
      command_key: 'restart',
      category: 'system',
      patterns: JSON.stringify(['restart server']),
      description: 'Restart backend',
      action: 'restart_backend',
      safety: 'moderate',
      context_aware: false,
      requires_hands_on: true,
      requires_confirmation: true,
      requires_parameters: null,
      allowed_roles: 'super_admin',
    },
    {
      command_key: 'drop_db',
      category: 'database',
      patterns: JSON.stringify(['drop database']),
      description: 'Drops DB',
      action: 'drop_db',
      safety: 'dangerous',
      context_aware: false,
      requires_hands_on: true,
      requires_confirmation: true,
      requires_parameters: JSON.stringify(['db_name']),
      allowed_roles: 'super_admin',
    },
  ];

  const result = await svc.getAllCommands();
  assertEq(result.version, '1.0.0', 'version');
  assert(result.categories.system !== undefined, 'system category present');
  assert(result.categories.database !== undefined, 'database category present');
  assertEq(Object.keys(result.categories.system.commands).length, 2, '2 system commands');
  assertEq(
    result.categories.system.commands.help.patterns,
    ['help', 'commands'],
    'patterns parsed'
  );
  assert(
    result.categories.database.commands.drop_db.requires_parameters !== undefined,
    'requires_parameters present when set'
  );
  assertEq(
    result.categories.database.commands.drop_db.requires_parameters,
    ['db_name'],
    'requires_parameters parsed'
  );
  assert(
    result.categories.system.commands.help.requires_parameters === undefined,
    'requires_parameters absent when null'
  );
  // Security lists
  assertEq(
    result.security.hands_on_required.sort(),
    ['drop_db', 'restart'],
    'hands_on_required'
  );
  assertEq(
    result.security.confirmation_required.sort(),
    ['drop_db', 'restart'],
    'confirmation_required'
  );
  assertEq(
    result.security.destructive_commands.sort(),
    ['drop_db', 'restart'],
    'destructive_commands (moderate+dangerous)'
  );
}

// ============================================================================
// getAllCommands — cache
// ============================================================================
console.log('\n── getAllCommands: cache ─────────────────────────────────');

{
  const svc = new OmaiCommandService();
  resetState();
  commandRows = [
    { command_key: 'help', category: 'sys', patterns: '[]', description: '', action: '',
      safety: 'safe', context_aware: false, requires_hands_on: false,
      requires_confirmation: false, requires_parameters: null, allowed_roles: null },
  ];
  await svc.getAllCommands();
  const firstCount = dbQueries.length;
  await svc.getAllCommands(); // second call
  assertEq(dbQueries.length, firstCount, 'cached: no new queries');
}

// TTL expiry triggers re-fetch
{
  const svc = new OmaiCommandService();
  resetState();
  commandRows = [];
  await svc.getAllCommands();
  const firstCount = dbQueries.length;
  // Force cache expiry by rewinding timestamp
  const entry = svc.cache.get('all_commands');
  entry.timestamp = Date.now() - (10 * 60 * 1000); // 10 min ago
  await svc.getAllCommands();
  assert(dbQueries.length > firstCount, 'expired cache → re-fetches');
}

// ============================================================================
// getAllCommands — DB error → fallback
// ============================================================================
console.log('\n── getAllCommands: error fallback ────────────────────────');

{
  const svc = new OmaiCommandService();
  resetState();
  throwOnPattern = /FROM omai_commands/;
  quiet();
  const result = await svc.getAllCommands();
  loud();
  assertEq(result.version, '1.0.0', 'fallback has version');
  assertEq(result.description, 'Fallback OMAI commands (database unavailable)', 'fallback desc');
  assert(result.categories.system !== undefined, 'fallback has system category');
  assert(result.categories.system.commands.help !== undefined, 'fallback help');
  assert(result.categories.system.commands.status !== undefined, 'fallback status');
}

// ============================================================================
// getContextualSuggestions
// ============================================================================
console.log('\n── getContextualSuggestions ──────────────────────────────');

{
  const svc = new OmaiCommandService();
  resetState();
  contextRows = [{ suggested_commands: JSON.stringify(['foo', 'bar']) }];
  const out = await svc.getContextualSuggestions('/dashboard');
  assertEq(out, ['foo', 'bar'], 'parsed suggestions');
  assertEq(dbQueries[0].params, ['/dashboard'], 'page_path passed');
}

// Not found → default
{
  const svc = new OmaiCommandService();
  resetState();
  contextRows = [];
  const out = await svc.getContextualSuggestions('/unknown');
  assertEq(out, ['help', 'status', 'explain this page'], 'default suggestions');
}

// DB error → fallback
{
  const svc = new OmaiCommandService();
  resetState();
  throwOnPattern = /omai_command_contexts/;
  quiet();
  const out = await svc.getContextualSuggestions('/err');
  loud();
  assertEq(out, ['help', 'status'], 'error fallback');
}

// ============================================================================
// setContextualSuggestions
// ============================================================================
console.log('\n── setContextualSuggestions ──────────────────────────────');

{
  const svc = new OmaiCommandService();
  resetState();
  quiet();
  await svc.setContextualSuggestions('/foo', ['a', 'b']);
  loud();
  const insert = dbQueries.find(q => /INSERT INTO omai_command_contexts/.test(q.sql));
  assert(insert !== undefined, 'INSERT executed');
  assertEq(insert!.params[0], '/foo', 'page_path');
  assertEq(insert!.params[1], JSON.stringify(['a', 'b']), 'JSON suggestions');
}

// Error swallowed
{
  const svc = new OmaiCommandService();
  resetState();
  throwOnPattern = /INSERT INTO omai_command_contexts/;
  quiet();
  let caught: Error | null = null;
  try { await svc.setContextualSuggestions('/x', ['y']); } catch (e: any) { caught = e; }
  loud();
  assertEq(caught, null, 'error swallowed — no throw');
}

// ============================================================================
// getAllContextualSuggestions
// ============================================================================
console.log('\n── getAllContextualSuggestions ───────────────────────────');

{
  const svc = new OmaiCommandService();
  resetState();
  // Can't use contextRows (the fake dispatches on WHERE page_path).
  // Override via the generic branch — need a new path match.
  // Since the SQL "FROM omai_command_contexts" (without WHERE page_path)
  // falls through to the allContextRows branch at the end.
  allContextRows = [
    { page_path: '/a', suggested_commands: JSON.stringify(['x', 'y']) },
    { page_path: '/b', suggested_commands: null },
  ];
  quiet();
  const out = await svc.getAllContextualSuggestions();
  loud();
  assertEq(out['/a'], ['x', 'y'], '/a parsed');
  assertEq(out['/b'], [], '/b null → []');
}

// Error → {}
{
  const svc = new OmaiCommandService();
  resetState();
  throwOnPattern = /FROM omai_command_contexts/;
  quiet();
  const out = await svc.getAllContextualSuggestions();
  loud();
  assertEq(out, {}, 'error → empty object');
}

// ============================================================================
// findMatchingCommands + calculateConfidence
// ============================================================================
console.log('\n── findMatchingCommands ──────────────────────────────────');

{
  const svc = new OmaiCommandService();
  resetState();
  commandRows = [
    { command_key: 'help', category: 'sys', patterns: JSON.stringify(['help', 'commands']),
      description: 'Help', action: 'show_help', safety: 'safe', context_aware: false,
      requires_hands_on: false, requires_confirmation: false },
    { command_key: 'restart', category: 'sys', patterns: JSON.stringify(['restart server']),
      description: 'Restart', action: 'restart', safety: 'moderate', context_aware: false,
      requires_hands_on: true, requires_confirmation: true },
    { command_key: 'backup', category: 'db', patterns: JSON.stringify(['backup database']),
      description: 'Backup', action: 'backup', safety: 'safe', context_aware: false,
      requires_hands_on: false, requires_confirmation: false },
  ];
  quiet();
  const matches = await svc.findMatchingCommands('help');
  loud();
  assertEq(matches.length, 1, 'help matches one');
  assertEq(matches[0].command_key, 'help', 'matched help');
  assertEq(matches[0].confidence, 1.0, 'exact match confidence');
}

// Case insensitivity + input contains pattern
{
  const svc = new OmaiCommandService();
  resetState();
  commandRows = [
    { command_key: 'help', category: 'sys', patterns: JSON.stringify(['help']),
      description: '', action: '', safety: 'safe', context_aware: false,
      requires_hands_on: false, requires_confirmation: false },
  ];
  quiet();
  const matches = await svc.findMatchingCommands('SHOW ME HELP PLEASE');
  loud();
  assertEq(matches.length, 1, 'case-insensitive match');
  assertEq(matches[0].confidence, 0.8, 'input contains pattern → 0.8');
}

// Pattern contains input
{
  const svc = new OmaiCommandService();
  resetState();
  commandRows = [
    { command_key: 'help', category: 'sys', patterns: JSON.stringify(['help me now']),
      description: '', action: '', safety: 'safe', context_aware: false,
      requires_hands_on: false, requires_confirmation: false },
  ];
  quiet();
  const matches = await svc.findMatchingCommands('me');
  loud();
  assertEq(matches.length, 1, 'pattern contains input match');
  assertEq(matches[0].confidence, 0.6, 'pattern contains input → 0.6');
}

// Multi-match sorted by confidence
{
  const svc = new OmaiCommandService();
  resetState();
  commandRows = [
    { command_key: 'weak', category: 'sys', patterns: JSON.stringify(['status or help']),
      description: '', action: '', safety: 'safe', context_aware: false,
      requires_hands_on: false, requires_confirmation: false },
    { command_key: 'strong', category: 'sys', patterns: JSON.stringify(['help']),
      description: '', action: '', safety: 'safe', context_aware: false,
      requires_hands_on: false, requires_confirmation: false },
  ];
  quiet();
  const matches = await svc.findMatchingCommands('help');
  loud();
  assertEq(matches.length, 2, 'two matches');
  assertEq(matches[0].command_key, 'strong', 'strong first (exact > contains)');
  assertEq(matches[0].confidence, 1.0, 'strong=1.0');
  assertEq(matches[1].command_key, 'weak', 'weak second');
  assertEq(matches[1].confidence, 0.6, 'weak=0.6 (pattern contains input)');
}

// DB error → []
{
  const svc = new OmaiCommandService();
  resetState();
  throwOnPattern = /FROM omai_commands/;
  quiet();
  const matches = await svc.findMatchingCommands('anything');
  loud();
  assertEq(matches, [], 'DB error → empty');
}

// ============================================================================
// calculateConfidence (direct)
// ============================================================================
console.log('\n── calculateConfidence ───────────────────────────────────');

{
  const svc = new OmaiCommandService();
  assertEq(svc.calculateConfidence('help', ['help']), 1.0, 'exact = 1.0');
  assertEq(svc.calculateConfidence('show me help', ['help']), 0.8, 'input contains pattern = 0.8');
  assertEq(svc.calculateConfidence('me', ['help me now']), 0.6, 'pattern contains input = 0.6');
  assertEq(svc.calculateConfidence('xyz', ['abc']), 0.2, 'no match = 0.2');
  // Max across patterns
  assertEq(
    svc.calculateConfidence('help', ['xyz', 'help', 'no']),
    1.0,
    'max across patterns'
  );
}

// ============================================================================
// clearCache
// ============================================================================
console.log('\n── clearCache ────────────────────────────────────────────');

{
  const svc = new OmaiCommandService();
  svc.cache.set('x', { data: 1, timestamp: Date.now() });
  assertEq(svc.cache.size, 1, 'cache has entry');
  quiet();
  svc.clearCache();
  loud();
  assertEq(svc.cache.size, 0, 'cache cleared');
}

// ============================================================================
// getFallbackCommands
// ============================================================================
console.log('\n── getFallbackCommands ───────────────────────────────────');

{
  const svc = new OmaiCommandService();
  const fallback = svc.getFallbackCommands();
  assertEq(fallback.version, '1.0.0', 'version');
  assert(fallback.categories.system !== undefined, 'has system category');
  assertEq(fallback.settings.allowedRoles, ['super_admin'], 'allowedRoles');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
