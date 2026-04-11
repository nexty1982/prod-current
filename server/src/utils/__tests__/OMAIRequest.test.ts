#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/OMAIRequest.js (OMD-946)
 *
 * OMAIRequest singleton class — module exports `new OMAIRequest()`.
 * Mostly pure helpers for OMAI task assignment links/email/logs.
 *
 * Coverage:
 *   - generateSecureToken      uuid v4 format check
 *   - validateEmail            valid + invalid + edge cases
 *   - validatePriority         valid set + fallback to 'medium'
 *   - sanitizeString           strips HTML tags + angle brackets, trims, truncates
 *   - sanitizeTasks            non-array → []; sanitizes title/desc/priority;
 *                              filters empty titles
 *   - getPriorityIcon          priority map + default
 *   - escapeHtml               &<>"' replacements
 *   - sanitizeLogData          removes password/token/authorization
 *   - getTaskAssignmentURL     env override + default
 *   - formatTasksForEmail      empty → italic; non-empty → ol
 *   - logAction                writes JSON line via fs.appendFile (stubbed)
 *   - ensureLogsDirectory      access then mkdir on miss
 *   - getRecentLogs            parses, slices, reverses; ENOENT → []
 *
 * Run from server/: npx tsx src/utils/__tests__/OMAIRequest.test.ts
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

// ── fs.promises stub for log methods ─────────────────────────────────
type Call = { method: string; args: any[] };
const fsCalls: Call[] = [];
let fsAccessSet = new Set<string>();
let fsReadFileResult: string | null = null;
let fsReadFileError: any = null;

const fs = require('fs');
const origFsPromises = fs.promises;
const fsPromisesStub = {
  access: async (p: string) => {
    fsCalls.push({ method: 'access', args: [p] });
    if (!fsAccessSet.has(p)) throw new Error('ENOENT');
    return undefined;
  },
  mkdir: async (p: string, opts: any) => {
    fsCalls.push({ method: 'mkdir', args: [p, opts] });
    fsAccessSet.add(p);
    return undefined;
  },
  appendFile: async (p: string, data: string) => {
    fsCalls.push({ method: 'appendFile', args: [p, data] });
    return undefined;
  },
  readFile: async (p: string, enc?: string) => {
    fsCalls.push({ method: 'readFile', args: [p, enc] });
    if (fsReadFileError) throw fsReadFileError;
    return fsReadFileResult ?? '';
  },
};
Object.defineProperty(fs, 'promises', {
  value: fsPromisesStub,
  configurable: true,
  writable: true,
});

const omai = require('../OMAIRequest');

// Silence console noise
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

async function main() {

// ============================================================================
// generateSecureToken
// ============================================================================
console.log('\n── generateSecureToken ───────────────────────────────────');
{
  const tok = omai.generateSecureToken();
  assert(typeof tok === 'string', 'returns string');
  assert(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tok),
    'uuid v4 format'
  );
  const tok2 = omai.generateSecureToken();
  assert(tok !== tok2, 'each call yields a different token');
}

// ============================================================================
// validateEmail
// ============================================================================
console.log('\n── validateEmail ─────────────────────────────────────────');
assertEq(omai.validateEmail('user@example.com'), true, 'simple valid');
assertEq(omai.validateEmail('a.b+c@sub.example.co.uk'), true, 'complex valid');
assertEq(omai.validateEmail('user@example'), false, 'no TLD invalid');
assertEq(omai.validateEmail('plainaddress'), false, 'no @ invalid');
assertEq(omai.validateEmail('@example.com'), false, 'no local part invalid');
assertEq(omai.validateEmail('user @example.com'), false, 'space invalid');
assertEq(omai.validateEmail(''), false, 'empty invalid');

// ============================================================================
// validatePriority
// ============================================================================
console.log('\n── validatePriority ──────────────────────────────────────');
assertEq(omai.validatePriority('high'), 'high', 'high valid');
assertEq(omai.validatePriority('medium'), 'medium', 'medium valid');
assertEq(omai.validatePriority('low'), 'low', 'low valid');
assertEq(omai.validatePriority('🔥'), '🔥', 'fire emoji valid');
assertEq(omai.validatePriority('⚠️'), '⚠️', 'warning emoji valid');
assertEq(omai.validatePriority('🧊'), '🧊', 'ice emoji valid');
assertEq(omai.validatePriority('critical'), 'medium', 'unknown → medium');
assertEq(omai.validatePriority(undefined), 'medium', 'undefined → medium');
assertEq(omai.validatePriority(null), 'medium', 'null → medium');

// ============================================================================
// sanitizeString
// ============================================================================
console.log('\n── sanitizeString ────────────────────────────────────────');
assertEq(omai.sanitizeString('  hello  '), 'hello', 'trims whitespace');
assertEq(omai.sanitizeString('hi <b>bold</b>'), 'hi bold', 'strips HTML tags');
assertEq(omai.sanitizeString('a<b>c</b>d'), 'acd', 'strips paired tags');
// Regex /<[^>]*>/g matches '< b >' as a tag-like span and removes it entirely;
// the .replace(/[<>]/g, '') final pass then strips any leftover angles.
assertEq(omai.sanitizeString('a < b > c'), 'a  c', 'angle-spans removed as tags');
// Truncation: default maxLength = 255
{
  const long = 'x'.repeat(300);
  const out = omai.sanitizeString(long);
  assertEq(out.length, 255, 'truncates to default 255');
}
{
  const out = omai.sanitizeString('hello world', 5);
  assertEq(out, 'hello', 'custom maxLength = 5');
}
assertEq(omai.sanitizeString(123 as any), '', 'non-string → empty');
assertEq(omai.sanitizeString(null as any), '', 'null → empty');
assertEq(omai.sanitizeString(undefined as any), '', 'undefined → empty');

// ============================================================================
// sanitizeTasks
// ============================================================================
console.log('\n── sanitizeTasks ─────────────────────────────────────────');
assertEq(omai.sanitizeTasks(null as any), [], 'null → []');
assertEq(omai.sanitizeTasks('not array' as any), [], 'string → []');
assertEq(omai.sanitizeTasks({} as any), [], 'object → []');
{
  const out = omai.sanitizeTasks([
    { title: 'Task 1', description: 'Do <b>thing</b>', priority: 'high' },
    { title: '  Task 2  ', description: '', priority: 'unknown' },
    { title: '', description: 'no title', priority: 'low' },
    { title: '   ', description: 'whitespace title', priority: 'low' },
  ]);
  assertEq(out.length, 2, 'filters empty / whitespace titles');
  assertEq(out[0].title, 'Task 1', 'title preserved');
  assertEq(out[0].description, 'Do thing', 'description sanitized');
  assertEq(out[0].priority, 'high', 'priority preserved');
  assertEq(out[1].title, 'Task 2', 'task 2 trimmed');
  assertEq(out[1].priority, 'medium', 'unknown priority → medium');
}
{
  // Truncation lengths: title 200, description 1000
  const longTitle = 'x'.repeat(300);
  const longDesc = 'y'.repeat(1500);
  const out = omai.sanitizeTasks([{ title: longTitle, description: longDesc, priority: 'low' }]);
  assertEq(out[0].title.length, 200, 'title truncated to 200');
  assertEq(out[0].description.length, 1000, 'description truncated to 1000');
}

// ============================================================================
// getPriorityIcon
// ============================================================================
console.log('\n── getPriorityIcon ───────────────────────────────────────');
assertEq(omai.getPriorityIcon('high'), '🔥 HIGH', 'high text');
assertEq(omai.getPriorityIcon('🔥'), '🔥 HIGH', 'fire emoji');
assertEq(omai.getPriorityIcon('medium'), '⚠️ MEDIUM', 'medium text');
assertEq(omai.getPriorityIcon('⚠️'), '⚠️ MEDIUM', 'warning emoji');
assertEq(omai.getPriorityIcon('low'), '🧊 LOW', 'low text');
assertEq(omai.getPriorityIcon('🧊'), '🧊 LOW', 'ice emoji');
assertEq(omai.getPriorityIcon('unknown'), '⚠️ MEDIUM', 'unknown → medium default');
assertEq(omai.getPriorityIcon(undefined), '⚠️ MEDIUM', 'undefined → medium default');

// ============================================================================
// escapeHtml
// ============================================================================
console.log('\n── escapeHtml ────────────────────────────────────────────');
assertEq(omai.escapeHtml('<b>'), '&lt;b&gt;', 'angle brackets');
assertEq(omai.escapeHtml('a & b'), 'a &amp; b', 'ampersand');
assertEq(omai.escapeHtml('"quoted"'), '&quot;quoted&quot;', 'double quote');
assertEq(omai.escapeHtml("it's"), 'it&#039;s', 'single quote');
assertEq(omai.escapeHtml('safe text'), 'safe text', 'no special chars');
assertEq(
  omai.escapeHtml('<script>alert("xss")</script>'),
  '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
  'xss-style input fully escaped'
);

// ============================================================================
// sanitizeLogData
// ============================================================================
console.log('\n── sanitizeLogData ───────────────────────────────────────');
{
  const out = omai.sanitizeLogData({
    email: 'a@b.com',
    password: 'secret',
    token: 'tok-123',
    authorization: 'Bearer xyz',
    safeField: 'keep',
  });
  assertEq(out.email, 'a@b.com', 'email preserved');
  assertEq(out.safeField, 'keep', 'safe field preserved');
  assertEq(out.password, undefined, 'password removed');
  assertEq(out.token, undefined, 'token removed');
  assertEq(out.authorization, undefined, 'authorization removed');
}
{
  // Does not mutate input
  const input = { password: 'p', email: 'e' };
  omai.sanitizeLogData(input);
  assertEq(input.password, 'p', 'input not mutated');
}

// ============================================================================
// getTaskAssignmentURL
// ============================================================================
console.log('\n── getTaskAssignmentURL ──────────────────────────────────');
{
  const orig = process.env.FRONTEND_URL;
  delete process.env.FRONTEND_URL;
  const out = omai.getTaskAssignmentURL('abc-123');
  assertEq(out, 'https://orthodoxmetrics.com/assign-task?token=abc-123', 'default base URL');
  if (orig !== undefined) process.env.FRONTEND_URL = orig;
}
{
  process.env.FRONTEND_URL = 'https://test.example.com';
  const out = omai.getTaskAssignmentURL('xyz');
  assertEq(out, 'https://test.example.com/assign-task?token=xyz', 'env override');
  delete process.env.FRONTEND_URL;
}

// ============================================================================
// formatTasksForEmail
// ============================================================================
console.log('\n── formatTasksForEmail ───────────────────────────────────');
assertEq(
  omai.formatTasksForEmail([]),
  '<p><em>No tasks provided</em></p>',
  'empty array → italic message'
);
assertEq(
  omai.formatTasksForEmail(null as any),
  '<p><em>No tasks provided</em></p>',
  'null → italic message'
);
{
  const html = omai.formatTasksForEmail([
    { title: 'Task A', description: 'desc A', priority: 'high' },
    { title: 'Task B', description: '', priority: 'low' },
  ]);
  assert(html.includes('<ol'), 'opens ol');
  assert(html.includes('</ol>'), 'closes ol');
  assert(html.includes('Task A'), 'includes title A');
  assert(html.includes('Task B'), 'includes title B');
  assert(html.includes('🔥 HIGH'), 'includes high priority icon');
  assert(html.includes('🧊 LOW'), 'includes low priority icon');
  assert(html.includes('desc A'), 'includes description A');
}
{
  // Escapes HTML in titles + descriptions
  const html = omai.formatTasksForEmail([
    { title: '<script>x</script>', description: '<b>bold</b>', priority: 'high' },
  ]);
  assert(html.includes('&lt;script&gt;'), 'title HTML-escaped');
  assert(html.includes('&lt;b&gt;bold&lt;/b&gt;'), 'description HTML-escaped');
  assert(!html.includes('<script>'), 'no raw script tag');
}

// ============================================================================
// logAction (writes via fs.appendFile)
// ============================================================================
console.log('\n── logAction ─────────────────────────────────────────────');

// Helper: reset fs tracking
function resetFs() {
  fsCalls.length = 0;
  fsAccessSet = new Set<string>();
  fsReadFileResult = null;
  fsReadFileError = null;
}

resetFs();
quiet();
fsAccessSet.add(require('path').dirname(omai.logsPath)); // dir exists
await omai.logAction('TEST_ACTION', { ip: '1.2.3.4', userAgent: 'jest' }, 'a@b.com', 'tok-12345678');
loud();

{
  const appendCall = fsCalls.find(c => c.method === 'appendFile');
  assert(appendCall !== undefined, 'appendFile called');
  const line = appendCall!.args[1] as string;
  assert(line.endsWith('\n'), 'line ends with newline');
  const obj = JSON.parse(line.trim());
  assertEq(obj.action, 'TEST_ACTION', 'action recorded');
  assertEq(obj.email, 'a@b.com', 'email recorded');
  assertEq(obj.token, 'tok-1234...', 'token truncated to 8 chars + ...');
  assertEq(obj.ip, '1.2.3.4', 'ip recorded');
  assertEq(obj.userAgent, 'jest', 'userAgent recorded');
  assert(typeof obj.timestamp === 'string', 'timestamp present');
}

// logAction with no token → token field is null
resetFs();
fsAccessSet.add(require('path').dirname(omai.logsPath));
quiet();
await omai.logAction('NO_TOKEN', {}, 'a@b.com');
loud();
{
  const appendCall = fsCalls.find(c => c.method === 'appendFile');
  const obj = JSON.parse((appendCall!.args[1] as string).trim());
  assertEq(obj.token, null, 'no token → null');
  assertEq(obj.ip, 'unknown', 'missing ip → "unknown"');
  assertEq(obj.userAgent, 'unknown', 'missing UA → "unknown"');
}

// logAction creates dir if missing (ensureLogsDirectory branch)
resetFs();
quiet();
await omai.logAction('CREATE_DIR', {}, 'a@b.com');
loud();
{
  const accessCall = fsCalls.find(c => c.method === 'access');
  const mkdirCall = fsCalls.find(c => c.method === 'mkdir');
  assert(accessCall !== undefined, 'access called');
  assert(mkdirCall !== undefined, 'mkdir called when dir missing');
  assertEq(mkdirCall!.args[1], { recursive: true }, 'mkdir recursive: true');
}

// logAction sanitizes data (password removed)
resetFs();
fsAccessSet.add(require('path').dirname(omai.logsPath));
quiet();
await omai.logAction('SENSITIVE', { password: 'secret', authorization: 'Bearer x', email: 'a@b.com' }, 'a@b.com');
loud();
{
  const appendCall = fsCalls.find(c => c.method === 'appendFile');
  const obj = JSON.parse((appendCall!.args[1] as string).trim());
  assertEq(obj.data.password, undefined, 'password sanitized out of data');
  assertEq(obj.data.authorization, undefined, 'authorization sanitized out');
}

// ============================================================================
// getRecentLogs
// ============================================================================
console.log('\n── getRecentLogs ─────────────────────────────────────────');

// File doesn't exist → []
resetFs();
fsReadFileError = Object.assign(new Error('not found'), { code: 'ENOENT' });
{
  const logs = await omai.getRecentLogs();
  assertEq(logs, [], 'ENOENT → []');
}

// Parses JSON lines, slices to limit, reverses
resetFs();
fsReadFileResult = [
  JSON.stringify({ id: 1, action: 'A' }),
  JSON.stringify({ id: 2, action: 'B' }),
  JSON.stringify({ id: 3, action: 'C' }),
  JSON.stringify({ id: 4, action: 'D' }),
  JSON.stringify({ id: 5, action: 'E' }),
].join('\n');
{
  const logs = await omai.getRecentLogs(3);
  assertEq(logs.length, 3, 'limit = 3');
  // Last 3 entries reversed → [E, D, C]
  assertEq(logs[0].action, 'E', 'most recent first');
  assertEq(logs[1].action, 'D', 'second most recent');
  assertEq(logs[2].action, 'C', 'third most recent');
}

// Default limit = 50
resetFs();
fsReadFileResult = Array.from({ length: 100 }, (_, i) =>
  JSON.stringify({ id: i, action: 'X' })
).join('\n');
{
  const logs = await omai.getRecentLogs();
  assertEq(logs.length, 50, 'default limit = 50');
}

// Skips unparseable lines
resetFs();
fsReadFileResult = [
  JSON.stringify({ id: 1, action: 'A' }),
  'not valid json',
  JSON.stringify({ id: 2, action: 'B' }),
  '',
].join('\n');
{
  const logs = await omai.getRecentLogs();
  assertEq(logs.length, 2, 'skips unparseable + empty lines');
}

// Non-ENOENT error re-thrown
resetFs();
fsReadFileError = new Error('permission denied');
{
  let caught: any = null;
  try {
    await omai.getRecentLogs();
  } catch (e) {
    caught = e;
  }
  assert(caught !== null, 'non-ENOENT error re-thrown');
  assert(caught.message.includes('permission denied'), 'original message preserved');
}

// ============================================================================
// Restore + summary
// ============================================================================
Object.defineProperty(fs, 'promises', {
  value: origFsPromises,
  configurable: true,
  writable: true,
});

console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main()

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
