#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/library-helpers.js (OMD-901)
 *
 * Pure module — depends only on config/library-config (also pure).
 *
 * Coverage:
 *   - jaroWinklerSimilarity     known reference values
 *   - normalizeFilename         date/version/copy/duplicate/backup stripping
 *   - extractWords              minWordLength filter (3 from LIBRARY_CONFIG)
 *   - calculateFilenameSimilarity  Jaccard + JW weighted average
 *   - findRelatedFiles          self-skip, category filter, threshold,
 *                               sort by score descending
 *   - groupFilesByTime          time bucket precedence (today → older)
 *   - paginate                  clamping, empty input, page out of range
 *   - sortItems                 asc/desc, case-insensitive, null/undefined,
 *                               non-mutation
 *
 * Run: npx tsx server/src/utils/__tests__/library-helpers.test.ts
 */

const {
  jaroWinklerSimilarity,
  normalizeFilename,
  extractWords,
  calculateFilenameSimilarity,
  findRelatedFiles,
  groupFilesByTime,
  paginate,
  sortItems,
} = require('../library-helpers');

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

function assertNear(actual: number, expected: number, tol: number, message: string): void {
  if (Math.abs(actual - expected) <= tol) {
    console.log(`  PASS: ${message}`); passed++;
  } else {
    console.error(`  FAIL: ${message}\n         expected: ~${expected} (±${tol})\n         actual:   ${actual}`);
    failed++;
  }
}

// ============================================================================
// jaroWinklerSimilarity
// ============================================================================
console.log('\n── jaroWinklerSimilarity ─────────────────────────────────');

// Identical strings → 1.0
assertEq(jaroWinklerSimilarity('hello', 'hello'), 1.0, 'identical strings → 1.0');
assertEq(jaroWinklerSimilarity('', ''), 1.0, 'empty strings → 1.0 (early return)');

// Empty input → 0.0
assertEq(jaroWinklerSimilarity('', 'hello'), 0.0, 'empty vs nonempty → 0');
assertEq(jaroWinklerSimilarity('hello', ''), 0.0, 'nonempty vs empty → 0');

// Known reference values from Jaro-Winkler literature
// MARTHA / MARHTA → ~0.961
assertNear(jaroWinklerSimilarity('MARTHA', 'MARHTA'), 0.961, 0.01, 'MARTHA/MARHTA ~0.961');

// DIXON / DICKSONX → ~0.813
assertNear(jaroWinklerSimilarity('DIXON', 'DICKSONX'), 0.813, 0.02, 'DIXON/DICKSONX ~0.813');

// Symmetric (or close to it) for completely different strings
const ab = jaroWinklerSimilarity('abcdef', 'xyzwvu');
assert(ab >= 0 && ab <= 1, 'similarity in [0,1] for distinct strings');

// High similarity for prefix-share + small edit
const sim = jaroWinklerSimilarity('orthodox', 'orthadox');
assert(sim > 0.9, `prefix-share + 1-char-diff > 0.9: ${sim}`);

// Range [0, 1]
for (const [a, b] of [['foo', 'bar'], ['abc', 'abcd'], ['hello world', 'hi world']]) {
  const s = jaroWinklerSimilarity(a, b);
  assert(s >= 0 && s <= 1, `JW(${a},${b})=${s} in [0,1]`);
}

// ============================================================================
// normalizeFilename
// ============================================================================
console.log('\n── normalizeFilename ─────────────────────────────────────');

// Lowercase
assertEq(normalizeFilename('HELLO.MD'), 'hello', 'lowercase + ext stripped');

// Date prefix removed
assertEq(normalizeFilename('2025-01-15_report.md'), 'report', 'date prefix removed');
assertEq(normalizeFilename('2025-01-15-notes.txt'), 'notes', 'date prefix with hyphen');

// Extension stripped
assertEq(normalizeFilename('file.pdf'), 'file', 'pdf ext stripped');
assertEq(normalizeFilename('file.docx'), 'file', 'docx ext stripped');

// Underscores/hyphens → spaces (then collapsed)
assertEq(normalizeFilename('my_file_name.md'), 'my file name', 'underscores → spaces');
assertEq(normalizeFilename('my-file-name.md'), 'my file name', 'hyphens → spaces');
assertEq(normalizeFilename('mixed_file-name.txt'), 'mixed file name', 'mixed separators');

// Multiple spaces collapsed
assertEq(normalizeFilename('a  b   c.md'), 'a b c', 'collapse multiple spaces');

// Copy/duplicate/old/backup tags removed
assertEq(normalizeFilename('report (copy).md'), 'report', '(copy) removed');
assertEq(normalizeFilename('report (Copy).md'), 'report', '(Copy) removed (case-insensitive)');
assertEq(normalizeFilename('report (duplicate).md'), 'report', '(duplicate) removed');
assertEq(normalizeFilename('report (old).md'), 'report', '(old) removed');
assertEq(normalizeFilename('report (backup).md'), 'report', '(backup) removed');

// Version suffixes removed
assertEq(normalizeFilename('report v2.md'), 'report', 'v2 suffix removed');
assertEq(normalizeFilename('report v1.0.md'), 'report', 'v1.0 suffix removed');
assertEq(normalizeFilename('report 1.0.0.md'), 'report', '1.0.0 suffix removed');

// Trim
assertEq(normalizeFilename('  spaced.md  '), 'spaced', 'trimmed');

// All-together
assertEq(
  normalizeFilename('2025-01-15_my-report (copy) v2.md'),
  'my report',
  'date + separators + copy + version'
);

// ============================================================================
// extractWords
// ============================================================================
console.log('\n── extractWords ──────────────────────────────────────────');

// LIBRARY_CONFIG.relationships.minWordLength = 3
assertEq(extractWords('hello world foo bar'), ['hello', 'world', 'foo', 'bar'], 'all >=3 chars kept');

// Short words filtered
assertEq(extractWords('a bb ccc dddd'), ['ccc', 'dddd'], '<3 chars filtered');
assertEq(extractWords('to be or it is'), [], 'all 2-letter filtered');
assertEq(extractWords('to be or not to be'), ['not'], '3-letter "not" kept (minWordLength=3)');

// Empty input
assertEq(extractWords(''), [], 'empty string → []');
assertEq(extractWords('   '), [], 'whitespace → []');

// Single word
assertEq(extractWords('hello'), ['hello'], 'single word kept');
assertEq(extractWords('hi'), [], 'single short word filtered');

// Multiple spaces handled
assertEq(extractWords('foo   bar'), ['foo', 'bar'], 'multiple spaces');

// ============================================================================
// calculateFilenameSimilarity
// ============================================================================
console.log('\n── calculateFilenameSimilarity ───────────────────────────');

// Identical filenames → 1.0
assertEq(calculateFilenameSimilarity('report.md', 'report.md'), 1.0, 'identical → 1.0');

// Same after normalization (e.g., date prefix + version differ)
assertEq(
  calculateFilenameSimilarity('2025-01-15_report v1.md', '2025-02-20_report v2.md'),
  1.0,
  'normalize-equal → 1.0'
);

// Completely unrelated → low score
const low = calculateFilenameSimilarity('apple-pie.md', 'rocket-launch.txt');
assert(low < 0.5, `unrelated low: ${low}`);

// Some overlap → mid range
const mid = calculateFilenameSimilarity('user-auth-flow.md', 'auth-system.md');
assert(mid > 0 && mid < 1, `partial: ${mid} in (0,1)`);

// Empty word sets — both files have only short words
const empty = calculateFilenameSimilarity('a b c.md', 'd e f.md');
assertEq(empty, 0.0, 'no extractable words → 0');

// Output range
for (const [a, b] of [['foo.md', 'foo.md'], ['foo.md', 'bar.md'], ['quick brown.md', 'lazy dog.md']]) {
  const s = calculateFilenameSimilarity(a, b);
  assert(s >= 0 && s <= 1, `score in [0,1]: ${a} vs ${b} = ${s}`);
}

// ============================================================================
// findRelatedFiles
// ============================================================================
console.log('\n── findRelatedFiles ──────────────────────────────────────');

const target = { id: 1, filename: 'user-auth-flow.md', category: 'technical' };
const allFiles = [
  { id: 1, filename: 'user-auth-flow.md', category: 'technical' },          // self
  { id: 2, filename: 'user-auth-system.md', category: 'technical' },         // related
  { id: 3, filename: 'auth-flow-diagram.md', category: 'technical' },        // related
  { id: 4, filename: 'random-other-file.md', category: 'technical' },        // unrelated
  { id: 5, filename: 'user-auth-flow-v2.md', category: 'ops' },              // wrong category
];

let related = findRelatedFiles(target, allFiles, 0.3);

// Self skipped
assert(!related.find((r: any) => r.fileId === 1), 'self skipped');

// Wrong category skipped
assert(!related.find((r: any) => r.fileId === 5), 'wrong category skipped');

// Related includes
assert(related.length > 0, 'has related files');

// Sorted by score descending
for (let i = 0; i < related.length - 1; i++) {
  assert(related[i].score >= related[i + 1].score, `sorted desc at ${i}`);
}

// Score is rounded to 4 decimals
for (const r of related) {
  const decimals = (r.score.toString().split('.')[1] || '').length;
  assert(decimals <= 4, `score ${r.score} has ≤4 decimals`);
}

// High threshold → fewer results
const strict = findRelatedFiles(target, allFiles, 0.99);
assert(strict.length === 0, 'threshold 0.99 → none');

// Empty all-files
related = findRelatedFiles(target, [], 0.3);
assertEq(related, [], 'empty all-files → []');

// Default threshold (uses LIBRARY_CONFIG.relationships.filenameSimilarityThreshold = 0.6)
related = findRelatedFiles(target, allFiles);
assert(Array.isArray(related), 'default threshold returns array');

// ============================================================================
// groupFilesByTime
// ============================================================================
console.log('\n── groupFilesByTime ──────────────────────────────────────');

const now = Date.now();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const files = [
  { id: 'a', modified: new Date(now - 1 * HOUR).toISOString() },     // today
  { id: 'b', modified: new Date(now - 12 * HOUR).toISOString() },    // today
  { id: 'c', modified: new Date(now - 3 * DAY).toISOString() },      // yesterday bucket
  { id: 'd', modified: new Date(now - 10 * DAY).toISOString() },     // thisWeek bucket
  { id: 'e', modified: new Date(now - 20 * DAY).toISOString() },     // lastWeek bucket
  { id: 'f', modified: new Date(now - 45 * DAY).toISOString() },     // thisMonth bucket
  { id: 'g', modified: new Date(now - 365 * DAY).toISOString() },    // older bucket
];

const grouped = groupFilesByTime(files);

// Result is array of { key, label, items, count } objects
assert(Array.isArray(grouped), 'returns array');
for (const g of grouped) {
  assert('key' in g, `group has key: ${g.key}`);
  assert('label' in g, `group has label: ${g.label}`);
  assert('items' in g, `group has items: ${g.key}`);
  assert('count' in g, `group has count: ${g.key}`);
  assertEq(g.count, g.items.length, `count matches items length: ${g.key}`);
}

// Find each expected bucket
const byKey: Record<string, any> = {};
for (const g of grouped) byKey[g.key] = g;

assert(byKey.today && byKey.today.count === 2, 'today bucket has 2 (a, b)');
assert(byKey.yesterday && byKey.yesterday.count === 1, 'yesterday bucket has 1 (c)');
assert(byKey.thisWeek && byKey.thisWeek.count === 1, 'thisWeek bucket has 1 (d)');
assert(byKey.lastWeek && byKey.lastWeek.count === 1, 'lastWeek bucket has 1 (e)');
assert(byKey.thisMonth && byKey.thisMonth.count === 1, 'thisMonth bucket has 1 (f)');
assert(byKey.older && byKey.older.count === 1, 'older bucket has 1 (g)');

// Labels
assertEq(byKey.today.label, 'Today', 'today label');
assertEq(byKey.yesterday.label, 'Yesterday', 'yesterday label');
assertEq(byKey.thisWeek.label, 'Earlier this week', 'thisWeek label');
assertEq(byKey.lastWeek.label, 'Last week', 'lastWeek label');
assertEq(byKey.thisMonth.label, 'Last month', 'thisMonth label');
assertEq(byKey.older.label, 'Older', 'older label');

// Empty input
const emptyGrouped = groupFilesByTime([]);
assertEq(emptyGrouped, [], 'empty input → []');

// Only-today input → only today returned
const onlyToday = groupFilesByTime([
  { id: 'a', modified: new Date(now - HOUR).toISOString() },
]);
assertEq(onlyToday.length, 1, 'only today → 1 group');
assertEq(onlyToday[0].key, 'today', 'only today: key');

// ============================================================================
// paginate
// ============================================================================
console.log('\n── paginate ──────────────────────────────────────────────');

const items = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));

// Default page 1, pageSize 25
let p = paginate(items);
assertEq(p.items.length, 25, 'default: 25 items');
assertEq(p.total, 100, 'total 100');
assertEq(p.page, 1, 'page 1');
assertEq(p.pageSize, 25, 'pageSize 25');
assertEq(p.totalPages, 4, 'totalPages 4');
assertEq(p.hasNext, true, 'hasNext true on page 1');
assertEq(p.hasPrev, false, 'hasPrev false on page 1');
assertEq(p.items[0].id, 1, 'first item id 1');
assertEq(p.items[24].id, 25, 'last item id 25');

// Last page
p = paginate(items, 4, 25);
assertEq(p.items.length, 25, 'page 4: 25 items');
assertEq(p.hasNext, false, 'page 4: hasNext false');
assertEq(p.hasPrev, true, 'page 4: hasPrev true');
assertEq(p.items[0].id, 76, 'page 4: first item id 76');
assertEq(p.items[24].id, 100, 'page 4: last item id 100');

// Middle page
p = paginate(items, 2, 25);
assertEq(p.items[0].id, 26, 'page 2: first item id 26');
assertEq(p.hasNext, true, 'page 2: hasNext');
assertEq(p.hasPrev, true, 'page 2: hasPrev');

// Out-of-range page → clamped
p = paginate(items, 99, 25);
assertEq(p.page, 4, 'page 99 clamped to 4');

p = paginate(items, 0, 25);
assertEq(p.page, 1, 'page 0 clamped to 1');

p = paginate(items, -5, 25);
assertEq(p.page, 1, 'page -5 clamped to 1');

// Custom pageSize
p = paginate(items, 1, 10);
assertEq(p.items.length, 10, 'pageSize 10: 10 items');
assertEq(p.totalPages, 10, 'pageSize 10: 10 pages');

// Partial last page
p = paginate(items, 1, 30);
assertEq(p.items.length, 30, 'pageSize 30 page 1: 30 items');
p = paginate(items, 4, 30);
assertEq(p.items.length, 10, 'pageSize 30 page 4: 10 items (partial)');
assertEq(p.totalPages, 4, 'pageSize 30: 4 pages total');

// Empty input
p = paginate([], 1, 25);
assertEq(p.items, [], 'empty: items []');
assertEq(p.total, 0, 'empty: total 0');
assertEq(p.totalPages, 0, 'empty: totalPages 0');
assertEq(p.page, 1, 'empty: page clamped to 1 (via totalPages || 1)');
assertEq(p.hasNext, false, 'empty: hasNext false');
assertEq(p.hasPrev, false, 'empty: hasPrev false');

// Single page (fewer items than pageSize)
p = paginate([{ id: 1 }, { id: 2 }], 1, 25);
assertEq(p.items.length, 2, 'fewer than pageSize: all returned');
assertEq(p.totalPages, 1, '1 page total');
assertEq(p.hasNext, false, 'single page: no next');

// ============================================================================
// sortItems
// ============================================================================
console.log('\n── sortItems ─────────────────────────────────────────────');

// Default: modified desc
const dated = [
  { id: 1, modified: '2025-01-01' },
  { id: 2, modified: '2025-03-01' },
  { id: 3, modified: '2025-02-01' },
];

let sorted = sortItems(dated);
assertEq(sorted.map((x: any) => x.id), [2, 3, 1], 'default: modified desc');

// Asc
sorted = sortItems(dated, 'modified', 'asc');
assertEq(sorted.map((x: any) => x.id), [1, 3, 2], 'modified asc');

// Sort by string field, case-insensitive
const words = [
  { id: 1, title: 'Banana' },
  { id: 2, title: 'apple' },
  { id: 3, title: 'Cherry' },
];
sorted = sortItems(words, 'title', 'asc');
assertEq(sorted.map((x: any) => x.id), [2, 1, 3], 'title asc case-insensitive');

sorted = sortItems(words, 'title', 'desc');
assertEq(sorted.map((x: any) => x.id), [3, 1, 2], 'title desc case-insensitive');

// Numeric sort
const nums = [{ id: 1, size: 30 }, { id: 2, size: 10 }, { id: 3, size: 20 }];
sorted = sortItems(nums, 'size', 'asc');
assertEq(sorted.map((x: any) => x.id), [2, 3, 1], 'size asc');

// Null/undefined treated as ''
const withMissing = [
  { id: 1, name: 'foo' },
  { id: 2, name: null },
  { id: 3, name: undefined },
  { id: 4, name: 'bar' },
];
sorted = sortItems(withMissing, 'name', 'asc');
// '' < 'bar' < 'foo' — both null/undefined become '', so they come first (stable order varies)
assertEq(sorted[2].id, 4, 'after missing: bar');
assertEq(sorted[3].id, 1, 'after missing: foo');
assert(sorted[0].name == null && sorted[1].name == null, 'null/undefined first');

// Non-mutation
const original = [{ id: 1, x: 3 }, { id: 2, x: 1 }];
sortItems(original, 'x', 'asc');
assertEq(original[0].id, 1, 'non-mutating: original[0]');
assertEq(original[1].id, 2, 'non-mutating: original[1]');

// Empty
assertEq(sortItems([]), [], 'empty input → []');

// Single element
assertEq(sortItems([{ id: 1 }]).length, 1, 'single element preserved');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
