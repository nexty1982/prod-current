#!/usr/bin/env npx tsx
/**
 * Unit tests for services/omaiCommandService.js (OMD-1016)
 *
 * ES class exported as module.exports = OmaiCommandService.
 * Dependencies: ../config/db-compat exports { getAppPool, promisePool }.
 *
 * Coverage:
 *   - calculateConfidence: exact=1.0, includes=0.8, contained=0.6,
 *     no-match=0.2, max across multiple patterns
 *   - getAllCommands: organizes by category, builds security lists
 *     (hands_on_required, confirmation_required, destructive), parses
 *     JSON fields, cache hit path, cache expiry, error → fallback
 *   - getContextualSuggestions: happy path, missing page → default list,
 *     error → short default list
 *   - setContextualSuggestions: writes upsert, swallows errors
 *   - getAllContextualSuggestions: happy, error → {}
 *   - findMatchingCommands: pattern matching in both directions, sorts
 *     by confidence desc, error → []
 *   - clearCache: empties cache
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

// ─── Stub db-compat ──────────────────────────────────────────────────
type Route = { match: RegExp; rows?: any; throws?: Error };
const queryLog: { sql: string; params: any[] }[] = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        if (r.throws) throw r.throws;
        return [r.rows ?? [], {}];
      }
    }
    return [[], {}];
  },
};

const dbCompatStub = {
  getAppPool: () => fakePool,
  promisePool: fakePool,
};

const dbPath = require.resolve('../../config/db-compat');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true, exports: dbCompatStub,
} as any;

function resetState() {
  queryLog.length = 0;
  routes = [];
}

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const OmaiCommandService = require('../omaiCommandService');

async function main() {

const svc = new OmaiCommandService();

// ============================================================================
// calculateConfidence
// ============================================================================
console.log('\n── calculateConfidence ───────────────────────────────────');

// Exact match → 1.0
assertEq(svc.calculateConfidence('help', ['help']), 1.0, 'exact → 1.0');
assertEq(svc.calculateConfidence('help', ['HELP']), 1.0, 'case-insensitive exact');

// Input contains pattern → 0.8
assertEq(
  svc.calculateConfidence('please show help', ['help']),
  0.8,
  'input includes pattern → 0.8'
);

// Pattern contains input → 0.6
assertEq(
  svc.calculateConfidence('help', ['help me please']),
  0.6,
  'pattern contains input → 0.6'
);

// No match → 0.2
assertEq(
  svc.calculateConfidence('xyz', ['completely', 'unrelated']),
  0.2,
  'no match → 0.2'
);

// Max across patterns — best wins
assertEq(
  svc.calculateConfidence('help', ['unrelated', 'help', 'other']),
  1.0,
  'max across multiple patterns'
);

// Empty patterns → 0
assertEq(svc.calculateConfidence('help', []), 0, 'empty patterns → 0');

// ============================================================================
// getAllCommands — happy path
// ============================================================================
console.log('\n── getAllCommands ────────────────────────────────────────');

resetState();
routes = [
  {
    match: /FROM omai_commands/,
    rows: [
      {
        command_key: 'help',
        category: 'system',
        patterns: JSON.stringify(['help', 'commands']),
        description: 'Show help',
        action: 'show_help',
        safety: 'safe',
        context_aware: 0,
        requires_hands_on: 0,
        requires_confirmation: 0,
        requires_parameters: null,
        allowed_roles: null,
      },
      {
        command_key: 'restart',
        category: 'system',
        patterns: JSON.stringify(['restart', 'reboot']),
        description: 'Restart service',
        action: 'restart_service',
        safety: 'dangerous',
        context_aware: 0,
        requires_hands_on: 1,
        requires_confirmation: 1,
        requires_parameters: JSON.stringify(['service']),
        allowed_roles: null,
      },
      {
        command_key: 'deploy',
        category: 'deployment',
        patterns: JSON.stringify(['deploy']),
        description: 'Deploy',
        action: 'deploy',
        safety: 'moderate',
        context_aware: 1,
        requires_hands_on: 0,
        requires_confirmation: 1,
        requires_parameters: null,
        allowed_roles: null,
      },
    ],
  },
];
{
  quiet();
  const r = await svc.getAllCommands();
  loud();
  assertEq(r.version, '1.0.0', 'version');
  assert(r.categories.system !== undefined, 'system category');
  assert(r.categories.deployment !== undefined, 'deployment category');
  assertEq(r.categories.system.description, 'System commands', 'system desc');
  assertEq(r.categories.deployment.description, 'Deployment commands', 'deployment desc');
  assert(r.categories.system.commands.help !== undefined, 'help command');
  assertEq(
    r.categories.system.commands.help.patterns,
    ['help', 'commands'],
    'help patterns parsed'
  );
  assertEq(r.categories.system.commands.help.action, 'show_help', 'help action');
  assertEq(
    r.categories.system.commands.restart.requires_parameters,
    ['service'],
    'restart params parsed'
  );
  assertEq(
    r.categories.system.commands.help.requires_parameters,
    undefined,
    'help has no requires_parameters key'
  );

  // Security lists
  assertEq(
    r.security.hands_on_required,
    ['restart'],
    'hands_on list'
  );
  assertEq(
    r.security.confirmation_required.sort(),
    ['deploy', 'restart'].sort(),
    'confirmation list'
  );
  assertEq(
    r.security.destructive_commands.sort(),
    ['deploy', 'restart'].sort(),
    'destructive list (moderate + dangerous)'
  );
}

// ============================================================================
// getAllCommands — cache hit
// ============================================================================
console.log('\n── getAllCommands: cache ─────────────────────────────────');

resetState();
svc.clearCache();
routes = [
  {
    match: /FROM omai_commands/,
    rows: [{
      command_key: 'x',
      category: 'test',
      patterns: '[]',
      description: 'x',
      action: 'x',
      safety: 'safe',
      context_aware: 0,
      requires_hands_on: 0,
      requires_confirmation: 0,
      requires_parameters: null,
      allowed_roles: null,
    }],
  },
];

{
  quiet();
  await svc.getAllCommands();
  await svc.getAllCommands(); // should hit cache
  loud();
  const dbCalls = queryLog.filter(q => /FROM omai_commands/.test(q.sql));
  assertEq(dbCalls.length, 1, 'only 1 DB call — cache hit');
}

// Expiry: set very short cacheTimeout
svc.clearCache();
svc.cacheTimeout = 1; // 1ms
await new Promise(r => setTimeout(r, 5));
resetState();
routes = [{ match: /FROM omai_commands/, rows: [] }];
{
  quiet();
  await svc.getAllCommands();
  await new Promise(r => setTimeout(r, 5));
  await svc.getAllCommands();
  loud();
  const dbCalls = queryLog.filter(q => /FROM omai_commands/.test(q.sql));
  assertEq(dbCalls.length, 2, 'cache expired → 2 DB calls');
}
svc.cacheTimeout = 5 * 60 * 1000;

// ============================================================================
// getAllCommands — error fallback
// ============================================================================
console.log('\n── getAllCommands: error fallback ────────────────────────');

svc.clearCache();
resetState();
routes = [
  { match: /FROM omai_commands/, throws: new Error('DB down') },
];
{
  quiet();
  const r = await svc.getAllCommands();
  loud();
  assert(
    r.description.includes('Fallback'),
    'fallback description'
  );
  assert(r.categories.system !== undefined, 'system in fallback');
  assert(r.categories.system.commands.help !== undefined, 'help in fallback');
}

// ============================================================================
// getContextualSuggestions
// ============================================================================
console.log('\n── getContextualSuggestions ──────────────────────────────');

// Happy path
resetState();
routes = [
  {
    match: /FROM omai_command_contexts/,
    rows: [{ suggested_commands: JSON.stringify(['deploy', 'restart']) }],
  },
];
{
  const s = await svc.getContextualSuggestions('/admin');
  assertEq(s, ['deploy', 'restart'], 'suggestions returned');
  assertEq(queryLog[0].params, ['/admin'], 'page_path param');
}

// Missing page → default suggestions
resetState();
routes = [{ match: /FROM omai_command_contexts/, rows: [] }];
{
  const s = await svc.getContextualSuggestions('/missing');
  assertEq(s, ['help', 'status', 'explain this page'], 'default suggestions');
}

// Error → short default list
resetState();
routes = [{ match: /FROM omai_command_contexts/, throws: new Error('fail') }];
{
  quiet();
  const s = await svc.getContextualSuggestions('/err');
  loud();
  assertEq(s, ['help', 'status'], 'error fallback list');
}

// Null suggested_commands column
resetState();
routes = [
  {
    match: /FROM omai_command_contexts/,
    rows: [{ suggested_commands: null }],
  },
];
{
  const s = await svc.getContextualSuggestions('/null');
  assertEq(s, [], 'null → empty array');
}

// ============================================================================
// setContextualSuggestions
// ============================================================================
console.log('\n── setContextualSuggestions ──────────────────────────────');

resetState();
routes = [{ match: /INSERT INTO omai_command_contexts/, rows: {} }];
{
  quiet();
  await svc.setContextualSuggestions('/dashboard', ['help', 'status']);
  loud();
  assertEq(queryLog[0].params[0], '/dashboard', 'path param');
  assertEq(
    queryLog[0].params[1],
    JSON.stringify(['help', 'status']),
    'suggestions JSON'
  );
}

// Error swallowed
resetState();
routes = [{ match: /INSERT INTO/, throws: new Error('fail') }];
{
  quiet();
  let threw = false;
  try {
    await svc.setContextualSuggestions('/x', ['a']);
  } catch { threw = true; }
  loud();
  assertEq(threw, false, 'error swallowed');
}

// ============================================================================
// getAllContextualSuggestions
// ============================================================================
console.log('\n── getAllContextualSuggestions ───────────────────────────');

resetState();
routes = [
  {
    match: /FROM omai_command_contexts/,
    rows: [
      { page_path: '/dash', suggested_commands: JSON.stringify(['a', 'b']) },
      { page_path: '/admin', suggested_commands: JSON.stringify(['c']) },
      { page_path: '/null', suggested_commands: null },
    ],
  },
];
{
  const r = await svc.getAllContextualSuggestions();
  assertEq(r['/dash'], ['a', 'b'], '/dash suggestions');
  assertEq(r['/admin'], ['c'], '/admin suggestions');
  assertEq(r['/null'], [], 'null → empty array');
}

// Error → {}
resetState();
routes = [{ match: /FROM omai_command_contexts/, throws: new Error('fail') }];
{
  quiet();
  const r = await svc.getAllContextualSuggestions();
  loud();
  assertEq(r, {}, 'error → empty object');
}

// ============================================================================
// findMatchingCommands
// ============================================================================
console.log('\n── findMatchingCommands ──────────────────────────────────');

resetState();
routes = [
  {
    match: /FROM omai_commands/,
    rows: [
      {
        command_key: 'help',
        category: 'system',
        patterns: JSON.stringify(['help', 'assistance']),
        description: 'Help',
        action: 'show_help',
        safety: 'safe',
        context_aware: 0,
        requires_hands_on: 0,
        requires_confirmation: 0,
      },
      {
        command_key: 'deploy',
        category: 'ops',
        patterns: JSON.stringify(['deploy', 'ship']),
        description: 'Deploy',
        action: 'deploy',
        safety: 'moderate',
        context_aware: 0,
        requires_hands_on: 0,
        requires_confirmation: 1,
      },
      {
        command_key: 'unrelated',
        category: 'misc',
        patterns: JSON.stringify(['xyz']),
        description: 'Unrelated',
        action: 'nothing',
        safety: 'safe',
        context_aware: 0,
        requires_hands_on: 0,
        requires_confirmation: 0,
      },
    ],
  },
];
{
  const r = await svc.findMatchingCommands('help');
  assertEq(r.length, 1, '1 match for "help"');
  assertEq(r[0].command_key, 'help', 'help matched');
  assertEq(r[0].confidence, 1.0, 'exact confidence 1.0');
}

resetState();
routes = [
  {
    match: /FROM omai_commands/,
    rows: [
      {
        command_key: 'help',
        category: 'system',
        patterns: JSON.stringify(['help']),
        description: 'Help',
        action: 'x',
        safety: 'safe',
        context_aware: 0,
        requires_hands_on: 0,
        requires_confirmation: 0,
      },
      {
        command_key: 'help_me',
        category: 'system',
        patterns: JSON.stringify(['help me please']),
        description: 'Help me',
        action: 'x',
        safety: 'safe',
        context_aware: 0,
        requires_hands_on: 0,
        requires_confirmation: 0,
      },
    ],
  },
];
{
  const r = await svc.findMatchingCommands('help');
  // Both should match; "help" = 1.0 (exact), "help me please" contains "help" = 0.6
  assertEq(r.length, 2, '2 matches');
  assertEq(r[0].command_key, 'help', 'exact match first (sorted by confidence)');
  assertEq(r[1].command_key, 'help_me', 'partial match second');
  assert(r[0].confidence > r[1].confidence, 'sorted desc by confidence');
}

// Error → []
resetState();
routes = [{ match: /FROM omai_commands/, throws: new Error('fail') }];
{
  quiet();
  const r = await svc.findMatchingCommands('help');
  loud();
  assertEq(r, [], 'error → empty array');
}

// ============================================================================
// clearCache
// ============================================================================
console.log('\n── clearCache ────────────────────────────────────────────');

svc.cache.set('foo', { data: 'x', timestamp: Date.now() });
assertEq(svc.cache.size, 1, 'cache has 1 entry');
quiet();
svc.clearCache();
loud();
assertEq(svc.cache.size, 0, 'cache cleared');

// ============================================================================
// getFallbackCommands
// ============================================================================
console.log('\n── getFallbackCommands ───────────────────────────────────');

{
  const r = svc.getFallbackCommands();
  assertEq(r.version, '1.0.0', 'version');
  assert(r.description.includes('Fallback'), 'fallback description');
  assert(r.categories.system !== undefined, 'system category');
  assert(r.categories.system.commands.help !== undefined, 'help command');
  assert(r.categories.system.commands.status !== undefined, 'status command');
  assertEq(r.settings.allowedRoles, ['super_admin'], 'super_admin allowed');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
