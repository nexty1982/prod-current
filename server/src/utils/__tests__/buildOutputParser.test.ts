#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/buildOutputParser.js (OMD-903)
 *
 * BuildOutputParser categorizes build output lines into 7 buckets via regex.
 * Pure module — only depends on ./formatTimestamp (also pure).
 *
 * Coverage:
 *   - categorizeLine        — line < 5 chars rejected, 7 category patterns,
 *                             build-message fallback, important-message fallback
 *   - getCategoryKey        — bug→bugsFixed, feature→featuresAdded, ...
 *   - getSeverity           — high/medium/low + default low
 *   - cleanMessage          — timestamp prefix, arrow prefix, ANSI codes
 *   - isBuildMessage        — webpack/babel/vite/etc and file-extension matches
 *   - isImportantMessage    — length > 10, excludes node_modules / webpack://
 *   - generateSummary       — count aggregation, success → 'success'
 *   - addDeploymentSummary  — chunk count, duration, always-on ready message
 *   - addTestSummary        — N passed / N failed / N total parsing
 *   - parse                 — end-to-end integration
 *
 * Known regex quirks (documented, NOT fixed — out of scope):
 *   - intelligence pattern includes /ai/ which matches the substring "ai"
 *     anywhere (e.g., "fail", "trail", "main", "available", "again"). Object.entries
 *     iterates patterns in insertion order, and intelligence comes BEFORE test/deploy,
 *     so a deploy line like "build available" gets categorized as intelligenceUpdates.
 *   - bug pattern includes "failure:" so test outputs containing "failure:"
 *     bucket as bugsFixed, not testResults.
 *   - isBuildMessage matches any line containing ".js", ".tsx", ".css", etc.,
 *     so messages mentioning filenames are treated as build messages.
 *
 * Run: npx tsx server/src/utils/__tests__/buildOutputParser.test.ts
 */

const BuildOutputParser = require('../buildOutputParser');

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

const parser = new BuildOutputParser();

// ============================================================================
// categorizeLine — length filter
// ============================================================================
console.log('\n── categorizeLine: length filter ─────────────────────────');

assertEq(parser.categorizeLine('', 0), null, 'empty → null');
assertEq(parser.categorizeLine('abc', 0), null, '3 chars → null');
assertEq(parser.categorizeLine('abcd', 0), null, '4 chars → null');
// 5 chars is the boundary — but content must also match a pattern, so use a known match
const fiveOk = parser.categorizeLine('fix: ', 0);
assert(fiveOk !== null, '5 chars + match → not null');

// ============================================================================
// categorizeLine — bug
// ============================================================================
console.log('\n── categorizeLine: bug category ──────────────────────────');

let entry = parser.categorizeLine('fix: null pointer dereference', 0);
assertEq(entry.category, 'bugsFixed', 'fix: → bugsFixed');
assertEq(entry.data.type, 'bug', 'fix: type=bug');

entry = parser.categorizeLine('bug: handler crashes', 1);
assertEq(entry.category, 'bugsFixed', 'bug: → bugsFixed');

entry = parser.categorizeLine('error: cannot read property', 2);
assertEq(entry.category, 'bugsFixed', 'error: → bugsFixed');

entry = parser.categorizeLine('hotfix: revert breaking change', 3);
assertEq(entry.category, 'bugsFixed', 'hotfix: → bugsFixed');

entry = parser.categorizeLine('memory leak: in worker pool', 4);
assertEq(entry.category, 'bugsFixed', 'memory leak: → bugsFixed');

entry = parser.categorizeLine('exception: thrown unexpectedly', 5);
assertEq(entry.category, 'bugsFixed', 'exception: → bugsFixed');

// ============================================================================
// categorizeLine — feature
// ============================================================================
console.log('\n── categorizeLine: feature category ──────────────────────');

entry = parser.categorizeLine('feat: new dashboard widget', 0);
assertEq(entry.category, 'featuresAdded', 'feat: → featuresAdded');
assertEq(entry.data.type, 'feature', 'feat: type=feature');

entry = parser.categorizeLine('component: ButtonGroup', 1);
assertEq(entry.category, 'featuresAdded', 'component: → featuresAdded');

entry = parser.categorizeLine('endpoint: POST /users', 2);
assertEq(entry.category, 'featuresAdded', 'endpoint: → featuresAdded');

entry = parser.categorizeLine('upgrade: bump version 2.0', 3);
assertEq(entry.category, 'featuresAdded', 'upgrade: → featuresAdded');

// ============================================================================
// categorizeLine — intelligence
// ============================================================================
console.log('\n── categorizeLine: intelligence category ─────────────────');

entry = parser.categorizeLine('omai pattern recognition update', 0);
assertEq(entry.category, 'intelligenceUpdates', 'omai → intelligenceUpdates');
assertEq(entry.data.type, 'intelligence', 'omai type=intelligence');

entry = parser.categorizeLine('neural network retrained', 1);
assertEq(entry.category, 'intelligenceUpdates', 'neural → intelligenceUpdates');

entry = parser.categorizeLine('smart suggestion engine ready', 2);
assertEq(entry.category, 'intelligenceUpdates', 'smart → intelligenceUpdates');

entry = parser.categorizeLine('algorithm: tuned heuristics', 3);
assertEq(entry.category, 'intelligenceUpdates', 'algorithm: → intelligenceUpdates');

// ============================================================================
// categorizeLine — package
// ============================================================================
console.log('\n── categorizeLine: package category ──────────────────────');

// Note: many package keywords (npm, yarn, "audit", "vulnerability") avoid the
// "ai" trap. But "package" itself contains nothing that hits intelligence first.
entry = parser.categorizeLine('npm WARN deprecated foo@1.0', 0);
assertEq(entry.category, 'packageUpdates', 'npm → packageUpdates');
assertEq(entry.data.type, 'package', 'npm type=package');

entry = parser.categorizeLine('yarn lockfile updated', 1);
assertEq(entry.category, 'packageUpdates', 'yarn → packageUpdates');

// "vulnerability" contains no "ai", "audit" does not either
entry = parser.categorizeLine('audit: 0 vulnerabilities', 2);
assertEq(entry.category, 'packageUpdates', 'audit → packageUpdates');

// ============================================================================
// categorizeLine — test
// ============================================================================
console.log('\n── categorizeLine: test category ─────────────────────────');

// IMPORTANT: avoid "passed:" because intelligence /ai/ does NOT match "passed",
// but bug pattern includes "failure:" which would beat us. Use clean test wording.
entry = parser.categorizeLine('test: button component', 0);
assertEq(entry.category, 'testResults', 'test: → testResults');
assertEq(entry.data.type, 'test', 'test: type=test');

entry = parser.categorizeLine('jest: running suite', 1);
assertEq(entry.category, 'testResults', 'jest: → testResults');

entry = parser.categorizeLine('coverage: 87 percent', 2);
assertEq(entry.category, 'testResults', 'coverage: → testResults');

// ============================================================================
// categorizeLine — deploy
// ============================================================================
console.log('\n── categorizeLine: deploy category ───────────────────────');

// "deploy:" — does not contain "ai" substring
entry = parser.categorizeLine('deploy: production push', 0);
assertEq(entry.category, 'deploymentDetails', 'deploy: → deploymentDetails');
assertEq(entry.data.type, 'deploy', 'deploy: type=deploy');

entry = parser.categorizeLine('deployment: complete', 1);
assertEq(entry.category, 'deploymentDetails', 'deployment: → deploymentDetails');

// "bundle" — no "ai"
entry = parser.categorizeLine('bundle size 2.3MB', 2);
assertEq(entry.category, 'deploymentDetails', 'bundle → deploymentDetails');

// ============================================================================
// categorizeLine — comment
// ============================================================================
console.log('\n── categorizeLine: comment category ──────────────────────');

entry = parser.categorizeLine('// inline comment text', 0);
assertEq(entry.category, 'developerComments', '// → developerComments');
assertEq(entry.data.type, 'comment', '// type=comment');

entry = parser.categorizeLine('todo: refactor this', 1);
assertEq(entry.category, 'developerComments', 'todo: → developerComments');

entry = parser.categorizeLine('@deprecated use new method', 2);
assertEq(entry.category, 'developerComments', '@deprecated → developerComments');

// ============================================================================
// categorizeLine — known regex quirks (documented, not fixed)
// ============================================================================
console.log('\n── categorizeLine: documented quirks ─────────────────────');

// /ai/ in intelligence pattern catches "fail" anywhere
entry = parser.categorizeLine('build did not fail today', 0);
assertEq(entry.category, 'intelligenceUpdates',
  'QUIRK: "fail" matches intelligence /ai/ → intelligenceUpdates');

// "trail" contains "ai" → intelligence
entry = parser.categorizeLine('trail of breadcrumbs added', 1);
assertEq(entry.category, 'intelligenceUpdates',
  'QUIRK: "trail" matches /ai/ → intelligenceUpdates');

// "available" — also "ai"
entry = parser.categorizeLine('build available now', 2);
assertEq(entry.category, 'intelligenceUpdates',
  'QUIRK: "available" matches /ai/ → intelligenceUpdates');

// "failure:" matches bug FIRST (bug iterates before intelligence)
entry = parser.categorizeLine('failure: assertion did not match', 3);
assertEq(entry.category, 'bugsFixed',
  'QUIRK: "failure:" matches bug before intelligence /ai/');

// ============================================================================
// categorizeLine — fallback to build / important / null
// ============================================================================
console.log('\n── categorizeLine: fallbacks ─────────────────────────────');

// isBuildMessage match without category match — use webpack
entry = parser.categorizeLine('webpack output here', 0);
assertEq(entry.category, 'deploymentDetails', 'webpack → deploymentDetails (build fallback)');
assertEq(entry.data.severity, 'low', 'build fallback severity=low');

// .json file match → isBuildMessage (use a name without "package" to avoid package match)
entry = parser.categorizeLine('emitted config.json', 1);
assertEq(entry.category, 'deploymentDetails', '.json → deploymentDetails');

// Important message fallback: long line, no category match, no build keywords.
// Carefully crafted to dodge: bug, feature, intelligence (/ai/), package, test,
// deploy, comment, isBuildMessage. Use words with no "ai", no file extensions.
entry = parser.categorizeLine('Hello world here is some unrelated text', 2);
assertEq(entry.category, 'other', 'long unrelated → other');

// Short uncategorized line → null (length≤10)
assertEq(parser.categorizeLine('hello!', 3), null, 'short uncategorized → null');

// ============================================================================
// getCategoryKey
// ============================================================================
console.log('\n── getCategoryKey ────────────────────────────────────────');

assertEq(parser.getCategoryKey('bug'), 'bugsFixed', 'bug');
assertEq(parser.getCategoryKey('feature'), 'featuresAdded', 'feature');
assertEq(parser.getCategoryKey('intelligence'), 'intelligenceUpdates', 'intelligence');
assertEq(parser.getCategoryKey('package'), 'packageUpdates', 'package');
assertEq(parser.getCategoryKey('test'), 'testResults', 'test');
assertEq(parser.getCategoryKey('deploy'), 'deploymentDetails', 'deploy');
assertEq(parser.getCategoryKey('comment'), 'developerComments', 'comment');
assertEq(parser.getCategoryKey('unknown'), 'other', 'unknown → other');
assertEq(parser.getCategoryKey(''), 'other', 'empty → other');

// ============================================================================
// getSeverity
// ============================================================================
console.log('\n── getSeverity ───────────────────────────────────────────');

assertEq(parser.getSeverity('critical issue here'), 'high', 'critical → high');
assertEq(parser.getSeverity('FATAL error'), 'high', 'FATAL → high (case-insensitive)');
assertEq(parser.getSeverity('breaking change'), 'high', 'breaking → high');
assertEq(parser.getSeverity('warning: deprecated'), 'medium', 'warning → medium');
assertEq(parser.getSeverity('moderate concern'), 'medium', 'moderate → medium');
assertEq(parser.getSeverity('minor issue'), 'medium', 'minor → medium');
assertEq(parser.getSeverity('info message'), 'low', 'info → low');
assertEq(parser.getSeverity('notice the change'), 'low', 'notice → low');
assertEq(parser.getSeverity('plain text without keyword'), 'low', 'no match → low default');

// ============================================================================
// cleanMessage
// ============================================================================
console.log('\n── cleanMessage ──────────────────────────────────────────');

assertEq(parser.cleanMessage('[2026-04-10] hello world'), 'hello world', 'timestamp prefix');
assertEq(parser.cleanMessage('  [info]   message body'), 'message body', 'leading spaces + bracket');
assertEq(parser.cleanMessage('> arrow prefix line'), 'arrow prefix line', 'arrow prefix');
assertEq(parser.cleanMessage('   >   nested arrow'), 'nested arrow', 'spaced arrow');
assertEq(parser.cleanMessage('\x1b[31mred text\x1b[0m'), 'red text', 'ANSI codes stripped');
assertEq(parser.cleanMessage('  trim me  '), 'trim me', 'trim whitespace');
assertEq(parser.cleanMessage('plain'), 'plain', 'plain unchanged');

// ============================================================================
// isBuildMessage
// ============================================================================
console.log('\n── isBuildMessage ────────────────────────────────────────');

assertEq(parser.isBuildMessage('webpack output'), true, 'webpack');
assertEq(parser.isBuildMessage('babel transpiled'), true, 'babel');
assertEq(parser.isBuildMessage('typescript compile'), true, 'typescript');
assertEq(parser.isBuildMessage('vite build'), true, 'vite');
assertEq(parser.isBuildMessage('rollup bundle'), true, 'rollup');
assertEq(parser.isBuildMessage('compiled successfully'), true, 'compiled');
assertEq(parser.isBuildMessage('minified output'), true, 'minified');
assertEq(parser.isBuildMessage('emitted asset'), true, 'asset');
assertEq(parser.isBuildMessage('foo.js generated'), true, '.js extension');
assertEq(parser.isBuildMessage('Component.tsx loaded'), true, '.tsx extension');
assertEq(parser.isBuildMessage('styles.css'), true, '.css extension');
assertEq(parser.isBuildMessage('config.json'), true, '.json extension');
assertEq(parser.isBuildMessage('plain text only'), false, 'no match → false');

// ============================================================================
// isImportantMessage
// ============================================================================
console.log('\n── isImportantMessage ────────────────────────────────────');

assertEq(parser.isImportantMessage('this is a long line'), true, 'long line');
assertEq(parser.isImportantMessage('short'), false, 'short → false (length<=10)');
assertEq(parser.isImportantMessage('exactly10!'), false, 'exactly 10 → false (strict gt)');
assertEq(parser.isImportantMessage('exactly11!?'), true, '11 chars → true');
assertEq(parser.isImportantMessage('              '), false, 'whitespace only → false');
assertEq(parser.isImportantMessage('-----------'), false, 'dashes only → false');
assertEq(parser.isImportantMessage('==========='), false, 'equals only → false');
assertEq(parser.isImportantMessage('------ * ------'), false, 'separator chars → false');
assertEq(
  parser.isImportantMessage('reading node_modules/foo'),
  false,
  'node_modules excluded'
);
assertEq(
  parser.isImportantMessage('webpack:// internal source'),
  false,
  'webpack:// excluded'
);

// ============================================================================
// generateSummary
// ============================================================================
console.log('\n── generateSummary ───────────────────────────────────────');

const cats = {
  bugsFixed: [{ a: 1 }, { b: 2 }],
  featuresAdded: [{ c: 3 }],
  intelligenceUpdates: [],
  packageUpdates: [{ d: 4 }, { e: 5 }, { f: 6 }],
  testResults: [{ g: 7 }],
  deploymentDetails: [],
  developerComments: [{ h: 8 }],
  other: [{ i: 9 }]
};

const sum = parser.generateSummary(cats, true, 1234);
assertEq(sum.bugsFixed, 2, 'sum.bugsFixed=2');
assertEq(sum.featuresAdded, 1, 'sum.featuresAdded=1');
assertEq(sum.intelligenceUpdates, 0, 'sum.intelligenceUpdates=0');
assertEq(sum.packageUpdates, 3, 'sum.packageUpdates=3');
assertEq(sum.testsRun, 1, 'sum.testsRun=1');
assertEq(sum.deploymentStatus, 'success', 'success → success');
assertEq(sum.totalTime, 1234, 'totalTime passthrough');
assertEq(sum.linesProcessed, 9, 'linesProcessed=9 total');
assert(typeof sum.buildTime === 'string' && sum.buildTime.length > 0, 'buildTime is string');

const errSum = parser.generateSummary(cats, false, 0);
assertEq(errSum.deploymentStatus, 'error', '!success → error');
assertEq(errSum.totalTime, 0, 'totalTime=0');

// ============================================================================
// addDeploymentSummary
// ============================================================================
console.log('\n── addDeploymentSummary ──────────────────────────────────');

let depCats = {
  bugsFixed: [], featuresAdded: [], intelligenceUpdates: [],
  packageUpdates: [], testResults: [], deploymentDetails: [],
  developerComments: [], other: []
};

parser.addDeploymentSummary(depCats, 'chunk1 chunk2 chunk3 asset1', 5500);
// 3 entries: duration message, chunk message, ready message
assertEq(depCats.deploymentDetails.length, 3, 'duration+chunks+ready=3 entries');
assert(
  depCats.deploymentDetails[0].message.includes('5.5s'),
  'duration message has 5.5s'
);
// /chunk/gi matches chunk1, chunk2, chunk3 → 3 occurrences
assert(
  depCats.deploymentDetails[1].message.includes('3 chunks'),
  '3 chunks counted'
);
assert(
  depCats.deploymentDetails[2].message.includes('🚀'),
  'always-on ready message present'
);

// No duration → skip duration message
depCats = {
  bugsFixed: [], featuresAdded: [], intelligenceUpdates: [],
  packageUpdates: [], testResults: [], deploymentDetails: [],
  developerComments: [], other: []
};
parser.addDeploymentSummary(depCats, 'no chunky output here', 0);
// Only ready message; "chunky" contains "chunk" so chunkCount=1 → also chunk message
assertEq(depCats.deploymentDetails.length, 2, 'no duration → 2 entries (chunk + ready)');

// No chunks, no duration → only ready message
depCats = {
  bugsFixed: [], featuresAdded: [], intelligenceUpdates: [],
  packageUpdates: [], testResults: [], deploymentDetails: [],
  developerComments: [], other: []
};
parser.addDeploymentSummary(depCats, 'plain output text', 0);
assertEq(depCats.deploymentDetails.length, 1, 'no chunks/duration → 1 entry (ready only)');
assert(depCats.deploymentDetails[0].message.includes('🚀'), 'ready message');

// ============================================================================
// addTestSummary
// ============================================================================
console.log('\n── addTestSummary ────────────────────────────────────────');

let testCats = {
  bugsFixed: [], featuresAdded: [], intelligenceUpdates: [],
  packageUpdates: [], testResults: [], deploymentDetails: [],
  developerComments: [], other: []
};

parser.addTestSummary(testCats, 'Tests: 42 passed, 3 failed, 45 total');
assertEq(testCats.testResults.length, 1, '1 summary entry added');
assert(testCats.testResults[0].message.includes('42 passed'), '42 passed');
assert(testCats.testResults[0].message.includes('3 failed'), '3 failed');
assert(testCats.testResults[0].message.includes('45 total'), '45 total');
assertEq(testCats.testResults[0].severity, 'medium', 'failed>0 → medium');

// All passed → severity=low
testCats = {
  bugsFixed: [], featuresAdded: [], intelligenceUpdates: [],
  packageUpdates: [], testResults: [], deploymentDetails: [],
  developerComments: [], other: []
};
parser.addTestSummary(testCats, '10 passed, 0 failed, 10 total');
assertEq(testCats.testResults[0].severity, 'low', '0 failed → low');

// No total → derived from passed+failed
testCats = {
  bugsFixed: [], featuresAdded: [], intelligenceUpdates: [],
  packageUpdates: [], testResults: [], deploymentDetails: [],
  developerComments: [], other: []
};
parser.addTestSummary(testCats, '7 passed, 2 failed');
assertEq(testCats.testResults.length, 1, 'derived total → 1 entry');
assert(testCats.testResults[0].message.includes('9 total'), '7+2=9 derived');

// No test patterns → no entry added
testCats = {
  bugsFixed: [], featuresAdded: [], intelligenceUpdates: [],
  packageUpdates: [], testResults: [], deploymentDetails: [],
  developerComments: [], other: []
};
parser.addTestSummary(testCats, 'no test output here');
assertEq(testCats.testResults.length, 0, 'no patterns → no entries');

// total=0 → no entry (guard)
testCats = {
  bugsFixed: [], featuresAdded: [], intelligenceUpdates: [],
  packageUpdates: [], testResults: [], deploymentDetails: [],
  developerComments: [], other: []
};
parser.addTestSummary(testCats, '0 passed, 0 failed, 0 total');
assertEq(testCats.testResults.length, 0, 'total=0 → no entry');

// ============================================================================
// parse — end-to-end integration
// ============================================================================
console.log('\n── parse: integration ────────────────────────────────────');

const sample = [
  'fix: null pointer in renderer',
  'feat: new dashboard component',
  'omai: model retrained',
  'npm install completed',
  'webpack compiled successfully',
  '',
  'short'
].join('\n');

const result = parser.parse(sample, true, 2000);
assert(result.summary !== undefined, 'has summary');
assert(Array.isArray(result.bugsFixed), 'bugsFixed array');
assertEq(result.bugsFixed.length, 1, '1 bug');
assertEq(result.featuresAdded.length, 1, '1 feature');
assertEq(result.intelligenceUpdates.length, 1, '1 intelligence');
// "npm install completed" — npm matches package, but install also matches
assertEq(result.packageUpdates.length, 1, '1 package');
assertEq(result.summary.deploymentStatus, 'success', 'deploymentStatus=success');
assertEq(result.rawOutput, sample, 'rawOutput preserved');

// Failed build
const failResult = parser.parse('error: build broke', false, 100);
assertEq(failResult.summary.deploymentStatus, 'error', 'failed → error');
// addDeploymentSummary NOT called when !success → no auto-added "🚀 ready" entry
assertEq(failResult.deploymentDetails.length, 0, '!success → no deploy summary added');

// Empty output
const emptyResult = parser.parse('', true, 0);
assertEq(emptyResult.bugsFixed, [], 'empty bugsFixed');
// success=true so addDeploymentSummary still adds ready message
assertEq(emptyResult.deploymentDetails.length, 1, 'empty + success → 1 ready entry');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
