#!/usr/bin/env npx tsx
/**
 * Unit tests for config/redact.ts (OMD-879)
 *
 * Covers:
 *   - shouldRedact      (private, via __test__)
 *   - redactValue       (private, via __test__)
 *   - redactObject      (private, via __test__)
 *   - redactConfig      (public)
 *   - formatConfigForLog (public)
 *
 * Run: npx tsx server/src/config/__tests__/redact.test.ts
 *
 * Exits non-zero on any failure.
 */

import { redactConfig, formatConfigForLog, __test__ } from '../redact';

const { shouldRedact, redactValue, redactObject, SECRET_FIELDS } = __test__;

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

// ============================================================================
// SECRET_FIELDS sanity
// ============================================================================
console.log('\n── SECRET_FIELDS ─────────────────────────────────────────');

assert(Array.isArray(SECRET_FIELDS), 'SECRET_FIELDS is an array');
assert(SECRET_FIELDS.includes('password'), 'includes password');
assert(SECRET_FIELDS.includes('secret'), 'includes secret');
assert(SECRET_FIELDS.includes('token'), 'includes token');
assert(SECRET_FIELDS.includes('key'), 'includes key');
assert(SECRET_FIELDS.includes('pass'), 'includes pass');
assert(SECRET_FIELDS.includes('auth'), 'includes auth');
assert(SECRET_FIELDS.includes('credential'), 'includes credential');

// ============================================================================
// shouldRedact
// ============================================================================
console.log('\n── shouldRedact ──────────────────────────────────────────');

// Exact matches
assertEq(shouldRedact('password'), true, 'exact: password');
assertEq(shouldRedact('secret'), true, 'exact: secret');
assertEq(shouldRedact('token'), true, 'exact: token');
assertEq(shouldRedact('key'), true, 'exact: key');
assertEq(shouldRedact('pass'), true, 'exact: pass');
assertEq(shouldRedact('auth'), true, 'exact: auth');
assertEq(shouldRedact('credential'), true, 'exact: credential');

// Case-insensitive
assertEq(shouldRedact('PASSWORD'), true, 'uppercase: PASSWORD');
assertEq(shouldRedact('Password'), true, 'mixed case: Password');
assertEq(shouldRedact('Secret'), true, 'mixed case: Secret');
assertEq(shouldRedact('TOKEN'), true, 'uppercase: TOKEN');

// Substring matches (these all contain a SECRET_FIELDS keyword)
assertEq(shouldRedact('db_password'), true, 'substring: db_password');
assertEq(shouldRedact('userPassword'), true, 'camelCase: userPassword');
assertEq(shouldRedact('api_key'), true, 'substring: api_key');
assertEq(shouldRedact('apiKey'), true, 'camelCase: apiKey');
assertEq(shouldRedact('jwt_secret'), true, 'substring: jwt_secret');
assertEq(shouldRedact('access_token'), true, 'substring: access_token');
assertEq(shouldRedact('refreshToken'), true, 'camelCase: refreshToken');
assertEq(shouldRedact('passphrase'), true, 'contains pass: passphrase');
assertEq(shouldRedact('authToken'), true, 'contains auth: authToken');
assertEq(shouldRedact('authorization'), true, 'contains auth: authorization');
assertEq(shouldRedact('credentials'), true, 'plural: credentials');
assertEq(shouldRedact('private_key'), true, 'contains key: private_key');
assertEq(shouldRedact('publicKey'), true, 'contains key: publicKey');

// Non-secrets
assertEq(shouldRedact('host'), false, 'non-secret: host');
assertEq(shouldRedact('port'), false, 'non-secret: port');
assertEq(shouldRedact('database'), false, 'non-secret: database');
assertEq(shouldRedact('user'), false, 'non-secret: user');
assertEq(shouldRedact('username'), false, 'non-secret: username');
assertEq(shouldRedact('name'), false, 'non-secret: name');
assertEq(shouldRedact('id'), false, 'non-secret: id');
assertEq(shouldRedact('url'), false, 'non-secret: url');
assertEq(shouldRedact('timeout'), false, 'non-secret: timeout');
assertEq(shouldRedact(''), false, 'empty string');

// ============================================================================
// redactValue
// ============================================================================
console.log('\n── redactValue ───────────────────────────────────────────');

assertEq(redactValue('hello'), '***5 chars***', 'string with 5 chars');
assertEq(redactValue('a'), '***1 chars***', 'string with 1 char');
assertEq(redactValue('this is a long secret value'), '***27 chars***', 'long string');
assertEq(redactValue(''), '***', 'empty string → ***');
assertEq(redactValue(null), '***', 'null → ***');
assertEq(redactValue(undefined), '***', 'undefined → ***');
assertEq(redactValue(123), '***', 'number → ***');
assertEq(redactValue(true), '***', 'boolean → ***');
assertEq(redactValue({}), '***', 'object → ***');
assertEq(redactValue([]), '***', 'array → ***');

// ============================================================================
// redactObject — primitives & null/undefined
// ============================================================================
console.log('\n── redactObject: primitives ──────────────────────────────');

assertEq(redactObject(null), null, 'null pass-through');
assertEq(redactObject(undefined), undefined, 'undefined pass-through');
assertEq(redactObject(42), 42, 'number pass-through');
assertEq(redactObject('hello'), 'hello', 'string pass-through');
assertEq(redactObject(true), true, 'boolean pass-through');
assertEq(redactObject(false), false, 'false pass-through');
assertEq(redactObject(0), 0, 'zero pass-through');

// ============================================================================
// redactObject — flat objects
// ============================================================================
console.log('\n── redactObject: flat objects ────────────────────────────');

assertEq(
  redactObject({ host: 'localhost', port: 3306 }),
  { host: 'localhost', port: 3306 },
  'no secrets → unchanged'
);

assertEq(
  redactObject({ host: 'localhost', password: 'secretpw' }),
  { host: 'localhost', password: '***8 chars***' },
  'redacts password field'
);

assertEq(
  redactObject({ user: 'admin', api_key: 'abc123', token: 'xyz' }),
  { user: 'admin', api_key: '***6 chars***', token: '***3 chars***' },
  'redacts multiple secrets, keeps user'
);

assertEq(
  redactObject({ DB_PASSWORD: 'pw', JWT_SECRET: 's' }),
  { DB_PASSWORD: '***2 chars***', JWT_SECRET: '***1 chars***' },
  'redacts uppercase secret keys'
);

// Empty string secret values still get redacted (via redactValue → '***')
assertEq(
  redactObject({ password: '' }),
  { password: '***' },
  'empty-string secret → ***'
);

// Non-string secret values
assertEq(
  redactObject({ secret: 42 }),
  { secret: '***' },
  'numeric secret → ***'
);
assertEq(
  redactObject({ token: null }),
  { token: '***' },
  'null secret → ***'
);

// ============================================================================
// redactObject — nested objects
// ============================================================================
console.log('\n── redactObject: nested objects ──────────────────────────');

assertEq(
  redactObject({
    db: { host: 'localhost', password: 'secret' },
    server: { port: 3001 },
  }),
  {
    db: { host: 'localhost', password: '***6 chars***' },
    server: { port: 3001 },
  },
  'one level deep — redacts nested password'
);

assertEq(
  redactObject({
    a: { b: { c: { token: 'xyz', name: 'foo' } } },
  }),
  {
    a: { b: { c: { token: '***3 chars***', name: 'foo' } } },
  },
  'three levels deep — redacts deep token'
);

// ============================================================================
// redactObject — arrays
// ============================================================================
console.log('\n── redactObject: arrays ──────────────────────────────────');

assertEq(
  redactObject([1, 2, 3]),
  [1, 2, 3],
  'array of primitives unchanged'
);

assertEq(
  redactObject([{ password: 'a' }, { password: 'bb' }]),
  [{ password: '***1 chars***' }, { password: '***2 chars***' }],
  'array of objects with secrets'
);

assertEq(
  redactObject(['public', 'data']),
  ['public', 'data'],
  'array of strings unchanged (no key context)'
);

assertEq(
  redactObject({ items: [{ secret: 'x' }, { secret: 'yy' }] }),
  { items: [{ secret: '***1 chars***' }, { secret: '***2 chars***' }] },
  'object with array of objects with secrets'
);

// ============================================================================
// redactObject — depth limit
// ============================================================================
console.log('\n── redactObject: depth limit ─────────────────────────────');

// Build a deeply nested object: { a: { a: { a: ... } } }
function buildDeep(depth: number): any {
  let obj: any = { value: 'leaf' };
  for (let i = 0; i < depth; i++) {
    obj = { a: obj };
  }
  return obj;
}

// Depth 10 — should still process the leaf
const deep10 = redactObject(buildDeep(10));
let cursor: any = deep10;
let levelsTraversed = 0;
while (cursor && typeof cursor === 'object' && 'a' in cursor) {
  cursor = cursor.a;
  levelsTraversed++;
  if (levelsTraversed > 15) break;
}
assert(levelsTraversed >= 10, `traverses at least 10 levels (got ${levelsTraversed})`);

// Depth > 10 — must hit MAX DEPTH guard
const deep15 = redactObject(buildDeep(15));
const deepStr = JSON.stringify(deep15);
assert(deepStr.includes('[MAX DEPTH]'), 'depth > 10 hits [MAX DEPTH] guard');

// Direct test of depth limit at boundary
assertEq(
  redactObject({ a: 1 }, 11),
  '[MAX DEPTH]',
  'starting at depth 11 → [MAX DEPTH]'
);
assertEq(
  redactObject({ a: 1 }, 10),
  { a: 1 },
  'starting at depth 10 → still processes'
);

// ============================================================================
// redactConfig — integration with realistic shapes
// ============================================================================
console.log('\n── redactConfig ──────────────────────────────────────────');

const cfg = {
  server: {
    port: 3001,
    host: '0.0.0.0',
  },
  database: {
    host: 'localhost',
    port: 3306,
    user: 'orthodoxapps',
    password: 'supersecret123',
    database: 'orthodoxmetrics_db',
  },
  session: {
    secret: 'session-secret-key',
    cookie: {
      secure: true,
      maxAge: 3600000,
    },
  },
  jwt: {
    secret: 'jwt-secret',
    expiresIn: '7d',
  },
};

const redacted = redactConfig(cfg);
assertEq(redacted.server.port, 3001, 'redactConfig: server.port unchanged');
assertEq(redacted.database.host, 'localhost', 'redactConfig: database.host unchanged');
assertEq(redacted.database.user, 'orthodoxapps', 'redactConfig: database.user unchanged');
assertEq(redacted.database.password, '***14 chars***', 'redactConfig: database.password redacted');
assertEq(redacted.session.secret, '***18 chars***', 'redactConfig: session.secret redacted');
assertEq(redacted.session.cookie.secure, true, 'redactConfig: session.cookie.secure unchanged');
assertEq(redacted.session.cookie.maxAge, 3600000, 'redactConfig: session.cookie.maxAge unchanged');
assertEq(redacted.jwt.secret, '***10 chars***', 'redactConfig: jwt.secret redacted');
assertEq(redacted.jwt.expiresIn, '7d', 'redactConfig: jwt.expiresIn unchanged');

// Original config not mutated
assertEq(cfg.database.password, 'supersecret123', 'original config not mutated');
assertEq(cfg.jwt.secret, 'jwt-secret', 'original jwt.secret not mutated');

// Empty config
assertEq(redactConfig({}), {}, 'redactConfig: empty object');

// Null/undefined config
assertEq(redactConfig(null), null, 'redactConfig: null');
assertEq(redactConfig(undefined), undefined, 'redactConfig: undefined');

// ============================================================================
// formatConfigForLog
// ============================================================================
console.log('\n── formatConfigForLog ────────────────────────────────────');

const formatted = formatConfigForLog({ host: 'localhost', password: 'pw' });
assert(typeof formatted === 'string', 'returns a string');
assert(formatted.includes('"host": "localhost"'), 'contains pretty-printed host');
assert(formatted.includes('"password": "***2 chars***"'), 'contains redacted password');
assert(formatted.includes('\n'), 'is multi-line (pretty-printed)');

// Two-space indentation
const lines = formatted.split('\n');
const hostLine = lines.find(l => l.includes('"host"'));
assert(hostLine?.startsWith('  "host"'), 'uses 2-space indentation');

// Round-trip parse
const parsed = JSON.parse(formatted);
assertEq(parsed.host, 'localhost', 'formatted output is valid JSON: host');
assertEq(parsed.password, '***2 chars***', 'formatted output is valid JSON: password');

// Empty
assertEq(formatConfigForLog({}), '{}', 'formatConfigForLog: empty object');

// Nested
const nestedFmt = formatConfigForLog({
  db: { user: 'admin', password: 'pw' },
});
const nestedParsed = JSON.parse(nestedFmt);
assertEq(nestedParsed.db.user, 'admin', 'nested format: user preserved');
assertEq(nestedParsed.db.password, '***2 chars***', 'nested format: password redacted');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
