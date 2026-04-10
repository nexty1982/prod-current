#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/library-helpers.js (OMD-895)
 *
 * Pure helpers — no DB, no I/O.
 * Covers all 8 exports:
 *   - jaroWinklerSimilarity
 *   - normalizeFilename
 *   - extractWords
 *   - calculateFilenameSimilarity
 *   - findRelatedFiles
 *   - groupFilesByTime
 *   - paginate
 *   - sortItems
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

assertEq(jaroWinklerSimilarity('', ''), 1.0, 'empty == empty → 1.0');
assertEq(jaroWinklerSimilarity('hello', 'hello'), 1.0, 'identical → 1.0');
assertEq(jaroWinklerSimilarity('', 'hello'), 0.0, 'empty vs non-empty → 0');
assertEq(jaroWinklerSimilarity('hello', ''), 0.0, 'non-empty vs empty → 0');
assertEq(jaroWinklerSimilarity('abc', 'xyz'), 0.0, 'no overlap → 0');

// Known Jaro-Winkler values
// MARTHA vs MARHTA → ~0.961 (classic example)
assertNear(
  jaroWinklerSimilarity('MARTHA', 'MARHTA'),
  0.961,
  0.01,
  'MARTHA vs MARHTA ~ 0.961'
);
// DIXON vs DICKSONX → ~0.813
assertNear(
  jaroWinklerSimilarity('DIXON', 'DICKSONX'),
  0.813,
  0.02,
  'DIXON vs DICKSONX ~ 0.813'
);

// Prefix bonus — strings sharing a 4-char prefix get a boost
const noPrefix = jaroWinklerSimilarity('xxhello', 'xxworld');
const withPrefix = jaroWinklerSimilarity('hello world', 'hello earth');
assert(withPrefix > noPrefix, 'shared prefix yields higher score');

// Symmetry for similar (not necessarily exact under JW prefix asymmetry)
const ab = jaroWinklerSimilarity('foobar', 'foobat');
assert(ab > 0.8, 'foobar/foobat > 0.8 (close strings)');

// ============================================================================
// normalizeFilename
// ============================================================================
console.log('\n── normalizeFilename ─────────────────────────────────────');

assertEq(normalizeFilename('Hello World.md'), 'hello world', 'simple .md');
assertEq(normalizeFilename('UPPER.TXT'), 'upper', 'uppercase + ext');
assertEq(normalizeFilename('2025-09-15_my-doc.pdf'), 'my doc', 'date prefix + ext');
assertEq(normalizeFilename('2024-01-01-report.docx'), 'report', 'date hyphen-prefix');
assertEq(normalizeFilename('foo_bar_baz.md'), 'foo bar baz', 'underscores → spaces');
assertEq(normalizeFilename('foo-bar-baz.md'), 'foo bar baz', 'hyphens → spaces');
assertEq(normalizeFilename('foo   bar.md'), 'foo bar', 'multi-space collapsed');
assertEq(normalizeFilename('doc (copy).md'), 'doc', 'remove (copy)');
assertEq(normalizeFilename('doc (DUPLICATE).md'), 'doc', 'remove (DUPLICATE) case-insensitive');
assertEq(normalizeFilename('doc (old).md'), 'doc', 'remove (old)');
assertEq(normalizeFilename('doc (backup).md'), 'doc', 'remove (backup)');
assertEq(normalizeFilename('report v2.md'), 'report', 'remove version suffix v2');
assertEq(normalizeFilename('report v2.5.md'), 'report', 'remove version v2.5');
assertEq(normalizeFilename('report 1.0.0.md'), 'report', 'remove 1.0.0');
assertEq(normalizeFilename('plain.md'), 'plain', 'plain name');

// ============================================================================
// extractWords
// ============================================================================
console.log('\n── extractWords ──────────────────────────────────────────');

// minWordLength is 3 (from library-config.relationships.minWordLength)
assertEq(extractWords('hello world'), ['hello', 'world'], 'two long words');
assertEq(extractWords('a be cat dog'), ['cat', 'dog'], 'short words filtered (< 3)');
assertEq(extractWords(''), [], 'empty string');
assertEq(extractWords('   '), [], 'whitespace only');
assertEq(
  extractWords('the quick brown fox'),
  ['the', 'quick', 'brown', 'fox'],
  'all words >= 3'
);
assertEq(extractWords('foo'), ['foo'], 'single 3-char word');
assertEq(extractWords('ab cd ef'), [], 'all 2-char filtered');

// ============================================================================
// calculateFilenameSimilarity
// ============================================================================
console.log('\n── calculateFilenameSimilarity ───────────────────────────');

assertEq(
  calculateFilenameSimilarity('hello.md', 'hello.md'),
  1.0,
  'identical → 1.0'
);
assertEq(
  calculateFilenameSimilarity('hello world.md', 'hello world.md'),
  1.0,
  'identical multi-word → 1.0'
);
assertEq(
  calculateFilenameSimilarity('hello.md', 'HELLO.md'),
  1.0,
  'case-insensitive identical → 1.0'
);
assertEq(
  calculateFilenameSimilarity('2025-01-01_doc.md', 'doc.md'),
  1.0,
  'date prefix removed → identical → 1.0'
);

// Different files, no shared words
const diff = calculateFilenameSimilarity('apples.md', 'banana.md');
assert(diff < 0.5, `unrelated files low score (got ${diff})`);

// Partial overlap — share one word
const partial = calculateFilenameSimilarity('quarterly report.md', 'annual report.md');
assert(partial > 0 && partial < 1, `partial overlap mid score (got ${partial})`);

// Different cases of normalization
const sim1 = calculateFilenameSimilarity('Project Plan.md', 'project_plan.pdf');
assertEq(sim1, 1.0, 'different separators + ext → 1.0 after normalize');

// Empty word sets
const empty = calculateFilenameSimilarity('a.md', 'b.md');
// After normalization: 'a' and 'b' both have 0 words >= 3 chars → 0
assertEq(empty, 0.0, 'empty word sets → 0.0');

// ============================================================================
// findRelatedFiles
// ============================================================================
console.log('\n── findRelatedFiles ──────────────────────────────────────');

const target = { id: 1, filename: 'quarterly report.md', category: 'technical' };
const allFiles = [
  { id: 1, filename: 'quarterly report.md', category: 'technical' },     // self — skip
  { id: 2, filename: 'quarterly report v2.md', category: 'technical' },  // very similar
  { id: 3, filename: 'annual report.md', category: 'technical' },        // partial
  { id: 4, filename: 'quarterly report.md', category: 'ops' },           // diff category
  { id: 5, filename: 'banana smoothie recipe.md', category: 'technical' },// unrelated
];

const related = findRelatedFiles(target, allFiles);
// Self skipped, diff category skipped → max 3 candidates
assert(related.every((r: any) => r.fileId !== 1), 'self excluded');
assert(related.every((r: any) => r.fileId !== 4), 'different category excluded');
// File 2 (quarterly report v2) should be in results — almost identical
assert(
  related.some((r: any) => r.fileId === 2),
  'very similar file included'
);

// Sort order: highest score first
for (let i = 0; i < related.length - 1; i++) {
  assert(related[i].score >= related[i + 1].score, `sorted desc at index ${i}`);
}

// Score field is rounded
for (const r of related) {
  assert(typeof r.score === 'number', 'score is number');
  assert(r.score >= 0 && r.score <= 1, 'score in [0,1]');
}

// Custom threshold = 0.99 → only near-identical
const strict = findRelatedFiles(target, allFiles, 0.99);
assert(strict.length <= related.length, 'strict threshold ≤ default');
for (const r of strict) {
  assert(r.score >= 0.99, 'all results meet strict threshold');
}

// Empty file list
const empty2 = findRelatedFiles(target, []);
assertEq(empty2, [], 'empty file list → []');

// All filtered (only self)
const onlySelf = findRelatedFiles(target, [target]);
assertEq(onlySelf, [], 'only self → []');

// ============================================================================
// groupFilesByTime
// ============================================================================
console.log('\n── groupFilesByTime ──────────────────────────────────────');

const now = Date.now();
const day = 86400_000;

const files = [
  { id: 'a', modified: new Date(now - 1000).toISOString() },           // <1s ago → today
  { id: 'b', modified: new Date(now - 2 * day).toISOString() },        // 2 days → yesterday bucket
  { id: 'c', modified: new Date(now - 10 * day).toISOString() },       // 10 days → thisWeek bucket
  { id: 'd', modified: new Date(now - 20 * day).toISOString() },       // 20 days → lastWeek bucket
  { id: 'e', modified: new Date(now - 45 * day).toISOString() },       // 45 days → thisMonth bucket
  { id: 'f', modified: new Date(now - 365 * day).toISOString() },      // 1 year → older
];

const grouped = groupFilesByTime(files);
// Should have 6 non-empty groups
assertEq(grouped.length, 6, '6 distinct buckets');
assert(grouped.every((g: any) => g.count >= 1), 'all groups non-empty');
assert(
  grouped.some((g: any) => g.key === 'today' && g.items.some((it: any) => it.id === 'a')),
  'today contains a'
);
assert(
  grouped.some((g: any) => g.key === 'yesterday' && g.items.some((it: any) => it.id === 'b')),
  'yesterday contains b'
);
assert(
  grouped.some((g: any) => g.key === 'thisWeek' && g.items.some((it: any) => it.id === 'c')),
  'thisWeek contains c'
);
assert(
  grouped.some((g: any) => g.key === 'lastWeek' && g.items.some((it: any) => it.id === 'd')),
  'lastWeek contains d'
);
assert(
  grouped.some((g: any) => g.key === 'thisMonth' && g.items.some((it: any) => it.id === 'e')),
  'thisMonth contains e'
);
assert(
  grouped.some((g: any) => g.key === 'older' && g.items.some((it: any) => it.id === 'f')),
  'older contains f'
);

// Empty input → empty result (no groups)
assertEq(groupFilesByTime([]), [], 'empty files → []');

// All in same bucket → only that group returned
const allOld = groupFilesByTime([
  { id: 'x', modified: new Date(now - 365 * day).toISOString() },
  { id: 'y', modified: new Date(now - 400 * day).toISOString() },
]);
assertEq(allOld.length, 1, 'all old → 1 group');
assertEq(allOld[0].key, 'older', 'group is older');
assertEq(allOld[0].count, 2, 'count is 2');
assertEq(allOld[0].label, 'Older', 'label is "Older"');

// Labels match expected
const labelMap: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  thisWeek: 'Earlier this week',
  lastWeek: 'Last week',
  thisMonth: 'Last month',
  older: 'Older',
};
for (const g of grouped) {
  assertEq(g.label, labelMap[g.key], `label for ${g.key}`);
}

// ============================================================================
// paginate
// ============================================================================
console.log('\n── paginate ──────────────────────────────────────────────');

const items = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));

const p1 = paginate(items, 1, 25);
assertEq(p1.total, 100, 'page1: total=100');
assertEq(p1.page, 1, 'page1: page=1');
assertEq(p1.pageSize, 25, 'page1: pageSize=25');
assertEq(p1.totalPages, 4, 'page1: totalPages=4');
assertEq(p1.items.length, 25, 'page1: 25 items');
assertEq(p1.items[0].id, 1, 'page1: first id=1');
assertEq(p1.items[24].id, 25, 'page1: last id=25');
assertEq(p1.hasNext, true, 'page1: hasNext');
assertEq(p1.hasPrev, false, 'page1: !hasPrev');

const p2 = paginate(items, 2, 25);
assertEq(p2.items[0].id, 26, 'page2: first id=26');
assertEq(p2.hasPrev, true, 'page2: hasPrev');
assertEq(p2.hasNext, true, 'page2: hasNext');

const p4 = paginate(items, 4, 25);
assertEq(p4.items[24].id, 100, 'page4: last id=100');
assertEq(p4.hasNext, false, 'page4: !hasNext');
assertEq(p4.hasPrev, true, 'page4: hasPrev');

// Out-of-range page clamped to last
const overshoot = paginate(items, 99, 25);
assertEq(overshoot.page, 4, 'overshoot clamped to 4');

// Page < 1 clamped to 1
const under = paginate(items, 0, 25);
assertEq(under.page, 1, 'page=0 clamped to 1');
const negative = paginate(items, -5, 25);
assertEq(negative.page, 1, 'negative page clamped to 1');

// Defaults (page=1, pageSize=25)
const defaults = paginate(items);
assertEq(defaults.page, 1, 'default page=1');
assertEq(defaults.pageSize, 25, 'default pageSize=25');

// Empty array
const empty3 = paginate([]);
assertEq(empty3.total, 0, 'empty: total=0');
assertEq(empty3.totalPages, 0, 'empty: totalPages=0');
assertEq(empty3.page, 1, 'empty: page=1 (clamped to totalPages || 1)');
assertEq(empty3.items, [], 'empty: items=[]');
assertEq(empty3.hasNext, false, 'empty: !hasNext');
assertEq(empty3.hasPrev, false, 'empty: !hasPrev');

// Smaller page size
const small = paginate(items, 1, 10);
assertEq(small.totalPages, 10, 'pageSize=10 → 10 pages');
assertEq(small.items.length, 10, 'pageSize=10 → 10 items');

// Last page partial
const partial2 = paginate(Array.from({ length: 23 }, (_, i) => ({ id: i + 1 })), 3, 10);
assertEq(partial2.items.length, 3, 'last page has 3 items (23 % 10)');

// ============================================================================
// sortItems
// ============================================================================
console.log('\n── sortItems ─────────────────────────────────────────────');

const data = [
  { name: 'Charlie', age: 30, modified: '2025-01-01' },
  { name: 'alice',   age: 25, modified: '2025-03-01' },
  { name: 'Bob',     age: 35, modified: '2025-02-01' },
];

// Default: modified desc
const def = sortItems(data);
assertEq(def[0].modified, '2025-03-01', 'default: most recent first');
assertEq(def[2].modified, '2025-01-01', 'default: oldest last');

// Doesn't mutate original
assertEq(data[0].name, 'Charlie', 'original not mutated');

// String sort (case-insensitive)
const byName = sortItems(data, 'name', 'asc');
assertEq(byName[0].name, 'alice', 'name asc: alice first (case-insensitive)');
assertEq(byName[1].name, 'Bob', 'name asc: Bob second');
assertEq(byName[2].name, 'Charlie', 'name asc: Charlie last');

// Numeric sort
const byAgeAsc = sortItems(data, 'age', 'asc');
assertEq(byAgeAsc.map((x: any) => x.age), [25, 30, 35], 'age asc');
const byAgeDesc = sortItems(data, 'age', 'desc');
assertEq(byAgeDesc.map((x: any) => x.age), [35, 30, 25], 'age desc');

// Missing values
const withNulls = [
  { id: 1, value: 'b' },
  { id: 2, value: null },
  { id: 3, value: 'a' },
  { id: 4 }, // value: undefined
];
const sortedNull = sortItems(withNulls, 'value', 'asc');
// null/undefined → '' which sorts before any non-empty string
assertEq(sortedNull[0].id, 2, 'null comes first (asc)');

// Empty array
assertEq(sortItems([]), [], 'empty array');

// Single item
assertEq(sortItems([{ id: 1 }], 'id', 'asc'), [{ id: 1 }], 'single item');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
