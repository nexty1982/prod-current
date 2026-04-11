#!/usr/bin/env npx tsx
/**
 * Unit tests for services/omaiCommandService.js (OMD-1229)
 *
 * DB-backed service for OMAI commands. One external dep:
 * `../config/db-compat` which exports both `getAppPool` and `promisePool`.
 * Stub it via require.cache BEFORE requiring the SUT.
 *
 * Coverage:
 *   - getAllCommands:
 *       · organizes rows by category
 *       · parses JSON patterns / requires_parameters
 *       · populates security.hands_on_required / confirmation_required
 *       · populates security.destructive_commands for moderate/dangerous
 *       · caches result (second call doesn't re-query)
 *       · cache miss after clearCache
 *       · DB error → falls back to getFallbackCommands
 *   - getContextualSuggestions:
 *       · found row → parsed array
 *       · no row → generic defaults
 *       · DB error → minimal defaults
 *   - setContextualSuggestions:
 *       · upsert query + params
 *       · error swallowed (no throw)
 *   - getAllContextualSuggestions:
 *       · map by page_path
 *       · error → {}
 *   - findMatchingCommands:
 *       · substring match both directions (input ↔ pattern)
 *       · non-matching commands excluded
 *       · sort by confidence desc
 *       · DB error → []
 *   - calculateConfidence: exact=1.0, substring cases, fallback 0.2
 *   - clearCache: clears internal map
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
const queryLog: QueryCall[] = [];

type Responder = { match: RegExp; respond: (params: any[]) => any };
let responders: Responder[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of responders) {
      if (r.match.test(sql)) return [r.respond(params)];
    }
    return [[]];
  },
};

const dbStub = {
  getAppPool: () => fakePool,
  promisePool: fakePool,
};

const path = require('path');
const dbDir = path.resolve(__dirname, '..', '..', 'config');
for (const ext of ['.js', '.ts']) {
  const p = path.join(dbDir, 'db-compat' + ext);
  require.cache[p] = { id: p, filename: p, loaded: true, exports: dbStub } as any;
}

function resetState() {
  queryLog.length = 0;
  responders = [];
}

// Silence
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const OmaiCommandService = require('../omaiCommandService');

async function main() {

// ============================================================================
// getAllCommands: organization + JSON parsing + security lists
// ============================================================================
console.log('\n── getAllCommands: organization ──────────────────────────');

resetState();
responders = [
  {
    match: /FROM omai_commands/,
    respond: () => [
      {
        command_key: 'restart_backend',
        category: 'system',
        patterns: JSON.stringify(['restart backend', 'restart server']),
        description: 'Restart backend',
        action: 'exec_restart',
        safety: 'dangerous',
        context_aware: false,
        requires_hands_on: true,
        requires_confirmation: true,
        requires_parameters: null,
        allowed_roles: JSON.stringify(['super_admin']),
      },
      {
        command_key: 'help',
        category: 'system',
        patterns: JSON.stringify(['help', '?']),
        description: 'Show help',
        action: 'show_help',
        safety: 'safe',
        context_aware: true,
        requires_hands_on: false,
        requires_confirmation: false,
        requires_parameters: JSON.stringify([{ name: 'topic' }]),
        allowed_roles: JSON.stringify(['super_admin']),
      },
      {
        command_key: 'delete_thing',
        category: 'data',
        patterns: JSON.stringify(['delete thing']),
        description: 'Delete',
        action: 'del',
        safety: 'moderate',
        context_aware: false,
        requires_hands_on: false,
        requires_confirmation: true,
        requires_parameters: null,
        allowed_roles: null,
      },
    ],
  },
];

const svc = new OmaiCommandService();
{
  const r = await svc.getAllCommands();
  assertEq(r.version, '1.0.0', 'version');
  assert(r.categories.system !== undefined, 'system category');
  assert(r.categories.data !== undefined, 'data category');
  assertEq(r.categories.system.description, 'System commands', 'category description Titled');
  assertEq(Object.keys(r.categories.system.commands).length, 2, '2 system commands');
  assertEq(r.categories.system.commands.help.patterns, ['help', '?'], 'patterns parsed');
  assertEq(r.categories.system.commands.help.requires_parameters, [{ name: 'topic' }], 'requires_parameters parsed');
  assert(r.categories.system.commands.restart_backend.requires_parameters === undefined, 'no requires_parameters field when null');

  // Security lists
  assert(r.security.hands_on_required.includes('restart_backend'), 'hands-on list');
  assert(r.security.confirmation_required.includes('restart_backend'), 'confirmation list includes restart');
  assert(r.security.confirmation_required.includes('delete_thing'), 'confirmation list includes delete');
  assert(r.security.destructive_commands.includes('restart_backend'), 'destructive: dangerous');
  assert(r.security.destructive_commands.includes('delete_thing'), 'destructive: moderate');
  assert(!r.security.destructive_commands.includes('help'), 'help not destructive');
}

// ============================================================================
// getAllCommands: caching
// ============================================================================
console.log('\n── getAllCommands: caching ───────────────────────────────');

{
  const before = queryLog.length;
  await svc.getAllCommands();
  assertEq(queryLog.length, before, 'no new query on cached call');

  svc.clearCache();
  quiet();
  await svc.getAllCommands();
  loud();
  assert(queryLog.length > before, 'query re-run after clearCache');
}

// ============================================================================
// getAllCommands: DB error → fallback
// ============================================================================
console.log('\n── getAllCommands: fallback on error ─────────────────────');

const svc2 = new OmaiCommandService();
resetState();
responders = [
  {
    match: /FROM omai_commands/,
    respond: () => { throw new Error('db down'); },
  },
];
quiet();
{
  const r = await svc2.getAllCommands();
  loud();
  assertEq(r.description, 'Fallback OMAI commands (database unavailable)', 'fallback description');
  assert(r.categories.system.commands.help !== undefined, 'fallback help');
  assert(r.categories.system.commands.status !== undefined, 'fallback status');
}

// ============================================================================
// getContextualSuggestions
// ============================================================================
console.log('\n── getContextualSuggestions ──────────────────────────────');

resetState();
responders = [
  {
    match: /FROM omai_command_contexts/,
    respond: () => [
      { suggested_commands: JSON.stringify(['cmd1', 'cmd2']) },
    ],
  },
];
{
  const out = await svc.getContextualSuggestions('/admin');
  assertEq(out, ['cmd1', 'cmd2'], 'parsed array');
  assertEq(queryLog[0].params, ['/admin'], 'page_path bound');
}

// No row → defaults
resetState();
responders = [
  { match: /FROM omai_command_contexts/, respond: () => [] },
];
{
  const out = await svc.getContextualSuggestions('/unknown');
  assertEq(out, ['help', 'status', 'explain this page'], 'generic defaults');
}

// DB error → minimal defaults
resetState();
responders = [
  { match: /FROM omai_command_contexts/, respond: () => { throw new Error('x'); } },
];
quiet();
{
  const out = await svc.getContextualSuggestions('/x');
  loud();
  assertEq(out, ['help', 'status'], 'minimal defaults');
}

// ============================================================================
// setContextualSuggestions
// ============================================================================
console.log('\n── setContextualSuggestions ──────────────────────────────');

resetState();
responders = [
  { match: /INSERT INTO omai_command_contexts/, respond: () => ({ affectedRows: 1 }) },
];
quiet();
await svc.setContextualSuggestions('/page', ['cmd1', 'cmd2']);
loud();
{
  const ins = queryLog.find(q => /INSERT INTO omai_command_contexts/.test(q.sql));
  assert(ins !== undefined, 'insert query');
  assertEq(ins!.params[0], '/page', 'page_path');
  assertEq(ins!.params[1], JSON.stringify(['cmd1', 'cmd2']), 'suggestions JSON');
}

// Error swallowed
resetState();
responders = [
  { match: /INSERT INTO omai_command_contexts/, respond: () => { throw new Error('x'); } },
];
quiet();
{
  let err: Error | null = null;
  try { await svc.setContextualSuggestions('/page', []); } catch (e: any) { err = e; }
  loud();
  assert(err === null, 'error swallowed');
}

// ============================================================================
// getAllContextualSuggestions
// ============================================================================
console.log('\n── getAllContextualSuggestions ───────────────────────────');

resetState();
responders = [
  {
    match: /FROM omai_command_contexts/,
    respond: () => [
      { page_path: '/a', suggested_commands: JSON.stringify(['x']) },
      { page_path: '/b', suggested_commands: JSON.stringify(['y', 'z']) },
    ],
  },
];
{
  const out = await svc.getAllContextualSuggestions();
  assertEq(out, { '/a': ['x'], '/b': ['y', 'z'] }, 'map by path');
}

resetState();
responders = [
  { match: /FROM omai_command_contexts/, respond: () => { throw new Error('x'); } },
];
quiet();
{
  const out = await svc.getAllContextualSuggestions();
  loud();
  assertEq(out, {}, 'error → {}');
}

// ============================================================================
// findMatchingCommands
// ============================================================================
console.log('\n── findMatchingCommands ──────────────────────────────────');

resetState();
responders = [
  {
    match: /FROM omai_commands/,
    respond: () => [
      {
        command_key: 'restart',
        category: 'sys',
        patterns: JSON.stringify(['restart backend', 'reboot server']),
        description: 'Restart',
        action: 'restart',
        safety: 'dangerous',
        context_aware: 0,
        requires_hands_on: 1,
        requires_confirmation: 1,
      },
      {
        command_key: 'status',
        category: 'sys',
        patterns: JSON.stringify(['status', 'health']),
        description: 'Status',
        action: 'status',
        safety: 'safe',
        context_aware: 0,
        requires_hands_on: 0,
        requires_confirmation: 0,
      },
      {
        command_key: 'nothing',
        category: 'sys',
        patterns: JSON.stringify(['abc', 'xyz']),
        description: 'nothing matches',
        action: '',
        safety: 'safe',
        context_aware: 0,
        requires_hands_on: 0,
        requires_confirmation: 0,
      },
    ],
  },
];
{
  const matches = await svc.findMatchingCommands('restart backend please');
  assertEq(matches.length, 1, 'one match');
  assertEq(matches[0].command_key, 'restart', 'correct command');
  // Input "restart backend please" contains pattern "restart backend" → 0.8
  assertEq(matches[0].confidence, 0.8, 'substring confidence');
}

// Exact match → 1.0
{
  const matches = await svc.findMatchingCommands('status');
  assertEq(matches.length, 1, 'one match');
  assertEq(matches[0].command_key, 'status', 'status');
  assertEq(matches[0].confidence, 1.0, 'exact = 1.0');
}

// Pattern contains input → 0.6
{
  const matches = await svc.findMatchingCommands('restart');
  assertEq(matches.length, 1, 'one match');
  assertEq(matches[0].confidence, 0.6, 'pattern-contains-input');
}

// Sort by confidence descending
resetState();
responders = [
  {
    match: /FROM omai_commands/,
    respond: () => [
      { command_key: 'a', category: 'c', patterns: JSON.stringify(['foo']), description: '', action: '', safety: 'safe', context_aware: 0, requires_hands_on: 0, requires_confirmation: 0 },
      { command_key: 'b', category: 'c', patterns: JSON.stringify(['foo bar baz']), description: '', action: '', safety: 'safe', context_aware: 0, requires_hands_on: 0, requires_confirmation: 0 },
    ],
  },
];
{
  // input "foo" : a's pattern "foo" → exact 1.0; b's pattern "foo bar baz" contains "foo" → 0.6
  const matches = await svc.findMatchingCommands('foo');
  assertEq(matches.length, 2, 'both match');
  assertEq(matches[0].command_key, 'a', 'higher confidence first');
  assertEq(matches[1].command_key, 'b', 'lower confidence second');
}

// DB error → []
resetState();
responders = [
  { match: /FROM omai_commands/, respond: () => { throw new Error('x'); } },
];
quiet();
{
  const matches = await svc.findMatchingCommands('foo');
  loud();
  assertEq(matches, [], 'error → []');
}

// ============================================================================
// calculateConfidence (direct)
// ============================================================================
console.log('\n── calculateConfidence ───────────────────────────────────');

assertEq(svc.calculateConfidence('help', ['help']), 1.0, 'exact = 1.0');
assertEq(svc.calculateConfidence('help me please', ['help']), 0.8, 'input contains pattern = 0.8');
assertEq(svc.calculateConfidence('help', ['help me please']), 0.6, 'pattern contains input = 0.6');
assertEq(svc.calculateConfidence('xyz', ['help']), 0.2, 'no overlap = 0.2');
// Max of multiple patterns
assertEq(svc.calculateConfidence('xyz', ['help', 'xyz']), 1.0, 'max across patterns');

// ============================================================================
// clearCache
// ============================================================================
console.log('\n── clearCache ────────────────────────────────────────────');

const svc3 = new OmaiCommandService();
svc3.cache.set('foo', { data: 'x', timestamp: Date.now() });
assertEq(svc3.cache.size, 1, 'has entry');
quiet();
svc3.clearCache();
loud();
assertEq(svc3.cache.size, 0, 'cleared');

// ============================================================================
// getFallbackCommands (direct)
// ============================================================================
console.log('\n── getFallbackCommands ───────────────────────────────────');

{
  const fb = svc.getFallbackCommands();
  assertEq(fb.version, '1.0.0', 'version');
  assert(/unavailable/.test(fb.description), 'description mentions unavailable');
  assert(fb.categories.system.commands.help !== undefined, 'has help');
  assert(fb.categories.system.commands.status !== undefined, 'has status');
  assertEq(fb.categories.system.commands.help.safety, 'safe', 'safe');
  assertEq(fb.settings.allowedRoles, ['super_admin'], 'allowedRoles');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

}

main().catch((e) => {
  loud();
  console.error('Unhandled:', e);
  process.exit(1);
});
