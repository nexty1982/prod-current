#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/writeSacramentHistory.ts pure helpers (OMD-883)
 *
 * Covers private helpers (via __test__):
 *   - normalizeValue
 *   - valuesEqual       (primitives, dates, arrays, objects, null/undefined)
 *   - computeDiff       (changed fields + patch map)
 *   - safeJsonStringify (circular refs, undefined, dates)
 *   - generateRequestId (UUID format)
 *
 * The DB-dependent writeSacramentHistory function itself is NOT tested —
 * it requires mocking getChurchDbConnection and would be an integration test.
 *
 * Run: npx tsx server/src/utils/__tests__/writeSacramentHistory.test.ts
 *
 * Exits non-zero on any failure.
 */

import { __test__ } from '../writeSacramentHistory';

const { normalizeValue, valuesEqual, computeDiff, safeJsonStringify, generateRequestId } = __test__;

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
// normalizeValue
// ============================================================================
console.log('\n── normalizeValue ────────────────────────────────────────');

assertEq(normalizeValue(null), null, 'null → null');
assertEq(normalizeValue(undefined), null, 'undefined → null');
assertEq(normalizeValue(0), 0, 'zero → 0');
assertEq(normalizeValue(''), '', 'empty string → empty string');
assertEq(normalizeValue(false), false, 'false → false');
assertEq(normalizeValue('hello'), 'hello', 'string → unchanged');
assertEq(normalizeValue(42), 42, 'number → unchanged');
assertEq(normalizeValue([1, 2]), [1, 2], 'array → unchanged');

// ============================================================================
// valuesEqual — primitives
// ============================================================================
console.log('\n── valuesEqual: primitives ───────────────────────────────');

assertEq(valuesEqual(null, null), true, 'null == null');
assertEq(valuesEqual(undefined, undefined), true, 'undefined == undefined');
assertEq(valuesEqual(null, undefined), true, 'null == undefined (normalized)');
assertEq(valuesEqual(undefined, null), true, 'undefined == null (normalized)');
assertEq(valuesEqual(42, 42), true, '42 == 42');
assertEq(valuesEqual(0, 0), true, '0 == 0');
assertEq(valuesEqual('foo', 'foo'), true, 'foo == foo');
assertEq(valuesEqual('', ''), true, 'empty == empty');
assertEq(valuesEqual(true, true), true, 'true == true');

// Inequality
assertEq(valuesEqual(42, 43), false, '42 != 43');
assertEq(valuesEqual('foo', 'bar'), false, 'foo != bar');
assertEq(valuesEqual(0, ''), false, '0 != "" (no type coercion)');
assertEq(valuesEqual(0, false), false, '0 != false (no type coercion)');
assertEq(valuesEqual(null, 0), false, 'null != 0');
assertEq(valuesEqual(null, ''), false, 'null != ""');

// ============================================================================
// valuesEqual — dates
// ============================================================================
console.log('\n── valuesEqual: dates ────────────────────────────────────');

const d1 = new Date('2025-09-15T12:00:00Z');
const d2 = new Date('2025-09-15T12:00:00Z');
const d3 = new Date('2025-09-16T12:00:00Z');

assertEq(valuesEqual(d1, d2), true, 'identical dates equal');
assertEq(valuesEqual(d1, d3), false, 'different dates not equal');
assertEq(valuesEqual(new Date('2025-01-01'), new Date('2025-01-01')), true, 'same iso → equal');

// ============================================================================
// valuesEqual — arrays
// ============================================================================
console.log('\n── valuesEqual: arrays ───────────────────────────────────');

assertEq(valuesEqual([], []), true, 'empty arrays equal');
assertEq(valuesEqual([1, 2, 3], [1, 2, 3]), true, '[1,2,3] == [1,2,3]');
assertEq(valuesEqual(['a', 'b'], ['a', 'b']), true, 'string arrays equal');
assertEq(valuesEqual([1, 2], [1, 2, 3]), false, 'different lengths not equal');
assertEq(valuesEqual([1, 2, 3], [1, 2]), false, 'different lengths reversed');
assertEq(valuesEqual([1, 2, 3], [1, 3, 2]), false, 'different order not equal');
assertEq(valuesEqual([null], [undefined]), true, '[null] == [undefined] (normalized)');

// Nested arrays
assertEq(valuesEqual([[1, 2], [3, 4]], [[1, 2], [3, 4]]), true, 'nested arrays equal');
assertEq(valuesEqual([[1, 2]], [[1, 3]]), false, 'nested array diff');

// ============================================================================
// valuesEqual — objects
// ============================================================================
console.log('\n── valuesEqual: objects ──────────────────────────────────');

assertEq(valuesEqual({}, {}), true, 'empty objects equal');
assertEq(valuesEqual({ a: 1 }, { a: 1 }), true, '{a:1} == {a:1}');
assertEq(valuesEqual({ a: 1, b: 2 }, { a: 1, b: 2 }), true, 'two-key objects equal');
assertEq(valuesEqual({ a: 1, b: 2 }, { b: 2, a: 1 }), true, 'key order does not matter');

// Different
assertEq(valuesEqual({ a: 1 }, { a: 2 }), false, 'different value');
assertEq(valuesEqual({ a: 1 }, { b: 1 }), false, 'different key');
assertEq(valuesEqual({ a: 1 }, { a: 1, b: 2 }), false, 'extra key');
assertEq(valuesEqual({ a: 1, b: 2 }, { a: 1 }), false, 'missing key');

// Nested
assertEq(valuesEqual({ a: { b: 1 } }, { a: { b: 1 } }), true, 'nested object equal');
assertEq(valuesEqual({ a: { b: 1 } }, { a: { b: 2 } }), false, 'nested diff');
assertEq(
  valuesEqual({ a: [1, 2], b: { c: 3 } }, { a: [1, 2], b: { c: 3 } }),
  true,
  'mixed array+object nested'
);

// null/undefined fields treated equivalently
assertEq(valuesEqual({ a: null }, { a: undefined }), true, 'null == undefined inside object');

// ============================================================================
// computeDiff
// ============================================================================
console.log('\n── computeDiff ───────────────────────────────────────────');

// No before (create)
const created = computeDiff(null, { name: 'John', age: 30 });
assertEq(created.changedFields.sort(), ['age', 'name'], 'create: all fields changed');
assertEq(created.patch.name, { before: null, after: 'John' }, 'create: name patch');
assertEq(created.patch.age, { before: null, after: 30 }, 'create: age patch');

// No after (delete)
const deleted = computeDiff({ name: 'John', age: 30 }, null);
assertEq(deleted.changedFields.sort(), ['age', 'name'], 'delete: all fields changed');
assertEq(deleted.patch.name, { before: 'John', after: null }, 'delete: name patch');

// Both null
const bothNull = computeDiff(null, null);
assertEq(bothNull.changedFields, [], 'both null: no changes');
assertEq(bothNull.patch, {}, 'both null: empty patch');

// No changes
const same = computeDiff({ name: 'John', age: 30 }, { name: 'John', age: 30 });
assertEq(same.changedFields, [], 'identical: no changed fields');
assertEq(same.patch, {}, 'identical: empty patch');

// Single field change
const single = computeDiff({ name: 'John', age: 30 }, { name: 'John', age: 31 });
assertEq(single.changedFields, ['age'], 'single change: only age');
assertEq(single.patch.age, { before: 30, after: 31 }, 'single change: age patch');

// Multiple field changes
const multi = computeDiff({ name: 'John', age: 30, city: 'NYC' }, { name: 'Jane', age: 30, city: 'LA' });
assertEq(multi.changedFields.sort(), ['city', 'name'], 'multi: name and city changed');
assertEq(multi.patch.name, { before: 'John', after: 'Jane' }, 'multi: name patch');
assertEq(multi.patch.city, { before: 'NYC', after: 'LA' }, 'multi: city patch');
assert(!('age' in multi.patch), 'multi: unchanged age not in patch');

// Field added
const added = computeDiff({ name: 'John' }, { name: 'John', age: 30 });
assertEq(added.changedFields, ['age'], 'added field detected');
assertEq(added.patch.age, { before: null, after: 30 }, 'added field: before is null');

// Field removed
const removed = computeDiff({ name: 'John', age: 30 }, { name: 'John' });
assertEq(removed.changedFields, ['age'], 'removed field detected');
assertEq(removed.patch.age, { before: 30, after: null }, 'removed field: after is null');

// null/undefined treated as equivalent (no diff)
const nullEquiv = computeDiff({ a: null }, { a: undefined });
assertEq(nullEquiv.changedFields, [], 'null/undefined: not a change');

// Date diff
const dateDiff = computeDiff(
  { date: new Date('2025-01-01') },
  { date: new Date('2025-01-02') }
);
assertEq(dateDiff.changedFields, ['date'], 'date diff detected');

// ============================================================================
// safeJsonStringify
// ============================================================================
console.log('\n── safeJsonStringify ─────────────────────────────────────');

// Basic types
assertEq(safeJsonStringify({ a: 1, b: 'foo' }), '{"a":1,"b":"foo"}', 'simple object');
assertEq(safeJsonStringify([1, 2, 3]), '[1,2,3]', 'simple array');
assertEq(safeJsonStringify('hello'), '"hello"', 'string');
assertEq(safeJsonStringify(42), '42', 'number');
assertEq(safeJsonStringify(true), 'true', 'boolean');
assertEq(safeJsonStringify(null), 'null', 'null');

// undefined → null
assertEq(safeJsonStringify({ a: undefined }), '{"a":null}', 'undefined value → null');
assertEq(safeJsonStringify({ a: 1, b: undefined, c: 3 }), '{"a":1,"b":null,"c":3}', 'mixed undefined');

// Date → ISO string
const dateObj = { date: new Date('2025-09-15T12:00:00.000Z') };
const dateJson = safeJsonStringify(dateObj);
assert(dateJson.includes('"2025-09-15T12:00:00.000Z"'), 'date serialized to ISO');

// Circular references
const circular: any = { name: 'a' };
circular.self = circular;
const circularJson = safeJsonStringify(circular);
assert(circularJson.includes('"[Circular]"'), 'circular ref → [Circular]');
assert(circularJson.includes('"name":"a"'), 'circular: other fields preserved');

// Nested circular
const parent: any = { name: 'parent' };
const child: any = { name: 'child', parent };
parent.child = child;
const nestedCircular = safeJsonStringify(parent);
assert(nestedCircular.includes('[Circular]'), 'nested circular handled');

// ============================================================================
// generateRequestId
// ============================================================================
console.log('\n── generateRequestId ─────────────────────────────────────');

const id1 = generateRequestId();
const id2 = generateRequestId();

// UUID v4 format: 8-4-4-4-12 hex characters
const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
assert(uuidV4Regex.test(id1), `id1 matches UUID v4 format (got ${id1})`);
assert(uuidV4Regex.test(id2), `id2 matches UUID v4 format (got ${id2})`);
assert(id1 !== id2, 'consecutive ids are unique');
assertEq(typeof id1, 'string', 'returns a string');
assertEq(id1.length, 36, 'length 36 (incl. hyphens)');

// Generate many to spot-check uniqueness
const set = new Set<string>();
for (let i = 0; i < 100; i++) {
  set.add(generateRequestId());
}
assertEq(set.size, 100, '100 generated → 100 unique');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
