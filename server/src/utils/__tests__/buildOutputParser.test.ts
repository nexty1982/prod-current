#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/buildOutputParser.js (OMD-892)
 *
 * Pure regex-based class — no DB, no I/O.
 * Covers all public/important methods of BuildOutputParser:
 *   - parse() (full output processing)
 *   - categorizeLine
 *   - getCategoryKey
 *   - getSeverity
 *   - cleanMessage
 *   - isBuildMessage
 *   - isImportantMessage
 *   - generateSummary
 *   - addDeploymentSummary
 *   - addTestSummary
 *
 * Run: npx tsx server/src/utils/__tests__/buildOutputParser.test.ts
 *
 * Exits non-zero on any failure.
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
// getSeverity
// ============================================================================
console.log('\n── getSeverity ───────────────────────────────────────────');

assertEq(parser.getSeverity('critical issue here'), 'high', 'critical → high');
assertEq(parser.getSeverity('this is a SEVERE bug'), 'high', 'SEVERE → high');
assertEq(parser.getSeverity('major change'), 'high', 'major → high');
assertEq(parser.getSeverity('fatal error'), 'high', 'fatal → high');
assertEq(parser.getSeverity('urgent fix'), 'high', 'urgent → high');
assertEq(parser.getSeverity('breaking change'), 'high', 'breaking → high');

assertEq(parser.getSeverity('warning: thing'), 'medium', 'warning → medium');
assertEq(parser.getSeverity('moderate impact'), 'medium', 'moderate → medium');
assertEq(parser.getSeverity('minor cleanup'), 'medium', 'minor → medium');
assertEq(parser.getSeverity('this is deprecated'), 'medium', 'deprecated → medium');

assertEq(parser.getSeverity('info: starting'), 'low', 'info → low');
assertEq(parser.getSeverity('notice: see this'), 'low', 'notice → low');
assertEq(parser.getSeverity('suggestion: do x'), 'low', 'suggestion → low');
assertEq(parser.getSeverity('helpful tip'), 'low', 'tip → low');

assertEq(parser.getSeverity('plain text line'), 'low', 'no match → low default');

// ============================================================================
// cleanMessage
// ============================================================================
console.log('\n── cleanMessage ──────────────────────────────────────────');

assertEq(parser.cleanMessage('hello world'), 'hello world', 'plain unchanged');
assertEq(parser.cleanMessage('  spaced  '), 'spaced', 'trims whitespace');
assertEq(parser.cleanMessage('[2026-01-01] message'), 'message', 'strips timestamp prefix');
assertEq(parser.cleanMessage('> arrow message'), 'arrow message', 'strips arrow prefix');
assertEq(parser.cleanMessage('\x1b[32mgreen\x1b[0m text'), 'green text', 'strips ANSI');
// Both prefix replacements chain (timestamp then arrow), then ANSI strip
assertEq(
  parser.cleanMessage('  [info]   > red\x1b[31malert\x1b[0m'),
  'redalert',
  'combined prefix+arrow+ansi all stripped'
);

// ============================================================================
// isBuildMessage
// ============================================================================
console.log('\n── isBuildMessage ────────────────────────────────────────');

assert(parser.isBuildMessage('webpack compiled successfully'), 'webpack detected');
assert(parser.isBuildMessage('using babel'), 'babel detected');
assert(parser.isBuildMessage('typescript check'), 'typescript detected');
assert(parser.isBuildMessage('eslint passed'), 'eslint detected');
assert(parser.isBuildMessage('vite build'), 'vite detected');
assert(parser.isBuildMessage('compiled in 2s'), 'compiled detected');
assert(parser.isBuildMessage('bundling complete'), 'bundling detected');
assert(parser.isBuildMessage('app.js generated'), '.js extension detected');
assert(parser.isBuildMessage('foo.tsx compiled'), '.tsx extension detected');
assert(parser.isBuildMessage('style.css'), '.css extension detected');
assert(!parser.isBuildMessage('hello world'), 'plain text → not build');

// ============================================================================
// isImportantMessage
// ============================================================================
console.log('\n── isImportantMessage ────────────────────────────────────');

assert(parser.isImportantMessage('this is a long enough message'), 'long line important');
assert(!parser.isImportantMessage('short'), 'short line not important');
assert(!parser.isImportantMessage('exact10ch'), 'exactly 10 chars NOT important (length must be > 10)');
assert(!parser.isImportantMessage('   '), 'whitespace not important');
assert(!parser.isImportantMessage('---------'), 'separator not important');
assert(!parser.isImportantMessage('======='), 'equals separator not important');
assert(!parser.isImportantMessage('foo node_modules bar'), 'node_modules excluded');
assert(!parser.isImportantMessage('webpack:// source'), 'webpack:// excluded');

// ============================================================================
// getCategoryKey
// ============================================================================
console.log('\n── getCategoryKey ────────────────────────────────────────');

assertEq(parser.getCategoryKey('bug'), 'bugsFixed', 'bug → bugsFixed');
assertEq(parser.getCategoryKey('feature'), 'featuresAdded', 'feature → featuresAdded');
assertEq(parser.getCategoryKey('intelligence'), 'intelligenceUpdates', 'intelligence → intelligenceUpdates');
assertEq(parser.getCategoryKey('package'), 'packageUpdates', 'package → packageUpdates');
assertEq(parser.getCategoryKey('test'), 'testResults', 'test → testResults');
assertEq(parser.getCategoryKey('deploy'), 'deploymentDetails', 'deploy → deploymentDetails');
assertEq(parser.getCategoryKey('comment'), 'developerComments', 'comment → developerComments');
assertEq(parser.getCategoryKey('unknown'), 'other', 'unknown → other');

// ============================================================================
// categorizeLine
// ============================================================================
console.log('\n── categorizeLine ────────────────────────────────────────');

// Empty / too short
assertEq(parser.categorizeLine('', 0), null, 'empty → null');
assertEq(parser.categorizeLine('abc', 0), null, 'too short → null');
assertEq(parser.categorizeLine('abcd', 0), null, '4 chars → null (< 5)');

// Bug
const bug = parser.categorizeLine('fix: null pointer crash', 5);
assert(bug !== null, 'bug match returns object');
assertEq(bug.category, 'bugsFixed', 'bug → bugsFixed category');
assertEq(bug.data.type, 'bug', 'bug type');
assertEq(bug.data.lineNumber, 6, 'lineNumber index+1');
assert(typeof bug.data.timestamp === 'string', 'timestamp string');

// Feature
const feat = parser.categorizeLine('feat: add new endpoint', 0);
assertEq(feat.category, 'featuresAdded', 'feat → featuresAdded');
assertEq(feat.data.type, 'feature', 'feature type');

// Intelligence
const ai = parser.categorizeLine('omai started learning', 0);
assertEq(ai.category, 'intelligenceUpdates', 'omai → intelligenceUpdates');
assertEq(ai.data.type, 'intelligence', 'intelligence type');

// Package
const pkg = parser.categorizeLine('npm install completed', 0);
assertEq(pkg.category, 'packageUpdates', 'npm → packageUpdates');
assertEq(pkg.data.type, 'package', 'package type');

// Test
// QUIRK: 'intelligence' pattern includes /ai/ which matches "failed", "trail",
// etc. — and intelligence is iterated before test in Object.entries order.
// So a line containing "failed" or "ai" would mis-categorize as intelligence.
// Use a clean test line that contains none of those substrings.
const tst = parser.categorizeLine('test: 5 passed 0 errors', 0);
assertEq(tst.category, 'testResults', 'test → testResults');

// Deploy
const dep = parser.categorizeLine('deploy: production ready', 0);
assertEq(dep.category, 'deploymentDetails', 'deploy → deploymentDetails');

// Comment
const cmt = parser.categorizeLine('// TODO: refactor this', 0);
assertEq(cmt.category, 'developerComments', '// → developerComments');

// Build message fallthrough → deploymentDetails
const buildLine = parser.categorizeLine('webpack compiled with 0 errors', 0);
assertEq(buildLine.category, 'deploymentDetails', 'webpack line → deploymentDetails fallthrough');
assertEq(buildLine.data.type, 'deploy', 'build fallthrough type=deploy');
assertEq(buildLine.data.severity, 'low', 'build fallthrough severity=low');

// Important message fallthrough → other
// Need a line that doesn't match any category but is "important"
const otherLine = parser.categorizeLine('mysterious unrelated production line', 0);
assert(otherLine !== null, 'mysterious line categorized');
// "production" matches deploy pattern, so it's deploy. Pick another:
const otherLine2 = parser.categorizeLine('something happened in space here', 0);
// May be null or other — categorizeLine only returns 'other' if isImportantMessage true
// Length is > 10, no patterns match → other
assert(otherLine2 === null || otherLine2.category === 'other', 'random line → null or other');

// ============================================================================
// generateSummary
// ============================================================================
console.log('\n── generateSummary ───────────────────────────────────────');

const emptyCats = {
  bugsFixed: [],
  featuresAdded: [],
  intelligenceUpdates: [],
  packageUpdates: [],
  testResults: [],
  deploymentDetails: [],
  developerComments: [],
  other: []
};

const sumEmpty = parser.generateSummary(emptyCats, true, 0);
assertEq(sumEmpty.bugsFixed, 0, 'empty: bugsFixed=0');
assertEq(sumEmpty.featuresAdded, 0, 'empty: featuresAdded=0');
assertEq(sumEmpty.deploymentStatus, 'success', 'empty success: status=success');
assertEq(sumEmpty.totalTime, 0, 'empty: totalTime=0');
assertEq(sumEmpty.linesProcessed, 0, 'empty: linesProcessed=0');
assert(typeof sumEmpty.buildTime === 'string', 'buildTime is string');

const sumFail = parser.generateSummary(emptyCats, false, 5000);
assertEq(sumFail.deploymentStatus, 'error', 'fail: status=error');
assertEq(sumFail.totalTime, 5000, 'fail: totalTime preserved');

const popCats = {
  bugsFixed: [{ x: 1 }, { x: 2 }],
  featuresAdded: [{ x: 1 }],
  intelligenceUpdates: [],
  packageUpdates: [{ x: 1 }, { x: 2 }, { x: 3 }],
  testResults: [{ x: 1 }],
  deploymentDetails: [{ x: 1 }],
  developerComments: [],
  other: [{ x: 1 }]
};
const sumPop = parser.generateSummary(popCats, true, 1000);
assertEq(sumPop.bugsFixed, 2, 'populated: bugsFixed count');
assertEq(sumPop.featuresAdded, 1, 'populated: featuresAdded count');
assertEq(sumPop.packageUpdates, 3, 'populated: packageUpdates count');
assertEq(sumPop.testsRun, 1, 'populated: testsRun count');
assertEq(sumPop.linesProcessed, 9, 'populated: linesProcessed=2+1+0+3+1+1+0+1');

// ============================================================================
// addDeploymentSummary
// ============================================================================
console.log('\n── addDeploymentSummary ──────────────────────────────────');

const cats1: any = {
  bugsFixed: [], featuresAdded: [], intelligenceUpdates: [], packageUpdates: [],
  testResults: [], deploymentDetails: [], developerComments: [], other: []
};
parser.addDeploymentSummary(cats1, 'plain output text', 2500);
// 1 duration message + 1 always-ready message (no chunks in output)
assertEq(cats1.deploymentDetails.length, 2, 'duration > 0 → 2 entries (time + ready)');
assert(cats1.deploymentDetails[0].message.includes('2.5s'), 'duration message format');
assert(cats1.deploymentDetails[1].message.includes('ready'), 'ready message present');

const cats2: any = {
  bugsFixed: [], featuresAdded: [], intelligenceUpdates: [], packageUpdates: [],
  testResults: [], deploymentDetails: [], developerComments: [], other: []
};
parser.addDeploymentSummary(cats2, 'chunk a chunk b chunk c', 0);
// duration=0 → no duration entry; chunkCount=3 → 1 entry; always 1 ready
assertEq(cats2.deploymentDetails.length, 2, 'no duration but chunks → 2 entries');
assert(cats2.deploymentDetails[0].message.includes('3 chunks'), 'chunk count formatted');

const cats3: any = {
  bugsFixed: [], featuresAdded: [], intelligenceUpdates: [], packageUpdates: [],
  testResults: [], deploymentDetails: [], developerComments: [], other: []
};
parser.addDeploymentSummary(cats3, '', 0);
// only the always-ready message
assertEq(cats3.deploymentDetails.length, 1, 'empty output → 1 entry (just ready)');
assert(cats3.deploymentDetails[0].message.includes('ready'), 'ready message');

// ============================================================================
// addTestSummary
// ============================================================================
console.log('\n── addTestSummary ────────────────────────────────────────');

const tcats1: any = { testResults: [] };
parser.addTestSummary(tcats1, 'no test info here');
assertEq(tcats1.testResults.length, 0, 'no test pattern → no summary');

const tcats2: any = { testResults: [] };
parser.addTestSummary(tcats2, '5 passed, 2 failed, 7 total');
assertEq(tcats2.testResults.length, 1, '5p/2f/7t → 1 entry');
assert(tcats2.testResults[0].message.includes('5 passed'), 'passed count in message');
assert(tcats2.testResults[0].message.includes('2 failed'), 'failed count in message');
assert(tcats2.testResults[0].message.includes('7 total'), 'total count in message');
assertEq(tcats2.testResults[0].severity, 'medium', 'failures > 0 → medium severity');

const tcats3: any = { testResults: [] };
parser.addTestSummary(tcats3, '10 passed, 0 failed');
assertEq(tcats3.testResults.length, 1, 'p+f path → 1 entry');
assertEq(tcats3.testResults[0].severity, 'low', 'no failures → low severity');

const tcats4: any = { testResults: [] };
parser.addTestSummary(tcats4, '0 passed, 0 failed, 0 total');
// total=0 → no entry pushed
assertEq(tcats4.testResults.length, 0, 'all zeros → no entry');

// ============================================================================
// parse — full integration
// ============================================================================
console.log('\n── parse: full integration ───────────────────────────────');

// Note: "failed" matches the intelligence /ai/ regex (intelligence is iterated
// before test in pattern order). Use a clean test line without "failed".
const fullOutput = `
[2026-01-01] Build started
fix: resolve null pointer in user.js
feat: add new dashboard endpoint
npm install completed
test: 8 specs ran successfully
omai analyzer started
deploy: production build complete
// TODO: review this later
webpack compiled successfully
random unrelated text
`.trim();

const parsed = parser.parse(fullOutput, true, 3000);
assert(parsed.summary.bugsFixed >= 1, 'parse: at least 1 bug');
assert(parsed.summary.featuresAdded >= 1, 'parse: at least 1 feature');
assert(parsed.summary.packageUpdates >= 1, 'parse: at least 1 package');
assert(parsed.summary.testsRun >= 1, 'parse: at least 1 test');
assert(parsed.summary.intelligenceUpdates >= 1, 'parse: at least 1 intelligence');
assertEq(parsed.summary.deploymentStatus, 'success', 'parse: success status');
assertEq(parsed.summary.totalTime, 3000, 'parse: totalTime preserved');
assertEq(parsed.rawOutput, fullOutput, 'parse: rawOutput preserved');
assert(Array.isArray(parsed.bugsFixed), 'parse: bugsFixed array');
assert(Array.isArray(parsed.deploymentDetails), 'parse: deploymentDetails array');

// Failure parse
const failParsed = parser.parse('error: build failed\nsomething bad', false, 100);
assertEq(failParsed.summary.deploymentStatus, 'error', 'failure: status=error');
assert(failParsed.summary.bugsFixed >= 1, 'failure: bug detected (error pattern)');
// addDeploymentSummary not called when success=false
assertEq(failParsed.deploymentDetails.length, 0, 'failure: no deploymentDetails added');

// Empty input
const emptyParsed = parser.parse('', true, 0);
assertEq(emptyParsed.summary.linesProcessed, 0, 'empty input: 0 lines');
// addDeploymentSummary still adds the ready message even on empty input with success
assert(emptyParsed.deploymentDetails.length >= 1, 'empty success: ready message added');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
