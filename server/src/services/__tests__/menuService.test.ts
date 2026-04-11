#!/usr/bin/env npx tsx
/**
 * Unit tests for services/menuService.ts (OMD-1006)
 *
 * Covers:
 *   - normalizeMeta             null/undefined/empty/string-JSON/object/array/primitive/invalid
 *   - buildMenuTree             flat→tree, sorting by order_index, orphan handling
 *   - detectCycles              self-parent, two-node cycle, three-node cycle, clean tree
 *   - validateMenuItems         required fields, path allowlist, icon allowlist, meta keys,
 *                               order_index type, integrates cycle detection
 *   - getMenusByRole            active/inactive query shapes, params, sort, error path
 *   - upsertMenuItems           UPDATE branch (id present), INSERT branch (no id),
 *                               meta normalization, audit insert
 *   - resetMenusByRole          UPDATE + audit, returns affectedRows
 *   - deleteMenuItem            re-parent then delete, true/false, audit on success
 *   - logAudit                  swallows errors (doesn't throw)
 *
 * Run: npx tsx server/src/services/__tests__/menuService.test.ts
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

// ── Stub config/db BEFORE requiring SUT ─────────────────────────────────
type Call = { sql: string; params: any[] };
const poolCalls: Call[] = [];
type Route = { match: RegExp; rows: any[]; result?: any; throws?: Error };
const poolRoutes: Route[] = [];
let poolThrowAudit = false;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    poolCalls.push({ sql, params });
    // Audit-specific throw
    if (poolThrowAudit && /INSERT INTO menu_audit/i.test(sql)) {
      throw new Error('audit fail');
    }
    // Find first matching route
    for (const r of poolRoutes) {
      if (r.match.test(sql)) {
        if (r.throws) throw r.throws;
        return [r.rows, r.result ?? {}] as any;
      }
    }
    return [[], {}] as any;
  },
};

function resetPool() {
  poolCalls.length = 0;
  poolRoutes.length = 0;
  poolThrowAudit = false;
}

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    getAppPool: () => fakePool,
  },
} as any;

const svc = require('../menuService');
const {
  normalizeMeta,
  ALLOWED_ICONS,
  ALLOWED_META_KEYS,
  MenuService,
} = svc;

// Silence console
const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;
function quiet() {
  console.error = () => {};
  console.warn = () => {};
}
function loud() {
  console.error = origError;
  console.warn = origWarn;
}

async function main() {

// ============================================================================
// normalizeMeta
// ============================================================================
console.log('\n── normalizeMeta ─────────────────────────────────────────');

assertEq(normalizeMeta(null), null, 'null → null');
assertEq(normalizeMeta(undefined), null, 'undefined → null');
assertEq(normalizeMeta(''), null, 'empty string → null');
assertEq(normalizeMeta('   '), null, 'whitespace → null');
assertEq(
  normalizeMeta('{"badge":"new"}'),
  { badge: 'new' },
  'JSON string object → parsed',
);
assertEq(
  normalizeMeta({ chip: 'beta' }),
  { chip: 'beta' },
  'object → passed through',
);

// Invalid cases
{
  let threw = false;
  try { normalizeMeta('[1,2,3]'); } catch (e: any) {
    threw = /not array or primitive/i.test(e.message);
  }
  assert(threw, 'JSON array → throws');
}
{
  let threw = false;
  try { normalizeMeta('"just a string"'); } catch (e: any) {
    threw = /not array or primitive/i.test(e.message);
  }
  assert(threw, 'JSON primitive → throws');
}
{
  let threw = false;
  try { normalizeMeta('not json {'); } catch (e: any) {
    threw = /must be valid JSON/i.test(e.message);
  }
  assert(threw, 'invalid JSON → throws');
}
{
  let threw = false;
  try { normalizeMeta([1, 2]); } catch (e: any) {
    threw = /JSON string or object/i.test(e.message);
  }
  assert(threw, 'raw array → throws');
}
{
  let threw = false;
  try { normalizeMeta(42); } catch (e: any) {
    threw = /JSON string or object/i.test(e.message);
  }
  assert(threw, 'number → throws');
}

// ============================================================================
// buildMenuTree
// ============================================================================
console.log('\n── buildMenuTree ─────────────────────────────────────────');

// Flat array → nested tree, sorted
{
  const rows = [
    { id: 1, parent_id: null, key_name: 'root_a', label: 'Root A', role: 'default', is_active: 1, order_index: 2 },
    { id: 2, parent_id: null, key_name: 'root_b', label: 'Root B', role: 'default', is_active: 1, order_index: 1 },
    { id: 3, parent_id: 1, key_name: 'child_a1', label: 'Child A1', role: 'default', is_active: 1, order_index: 2 },
    { id: 4, parent_id: 1, key_name: 'child_a2', label: 'Child A2', role: 'default', is_active: 1, order_index: 1 },
  ];
  const tree = MenuService.buildMenuTree(rows);
  assertEq(tree.length, 2, '2 root items');
  assertEq(tree[0].id, 2, 'root B comes first (order_index 1)');
  assertEq(tree[1].id, 1, 'root A comes second (order_index 2)');
  assertEq(tree[1].children.length, 2, 'root A has 2 children');
  assertEq(tree[1].children[0].id, 4, 'child A2 first (order_index 1)');
  assertEq(tree[1].children[1].id, 3, 'child A1 second (order_index 2)');
}

// Orphan child (missing parent) → treated as root
{
  quiet();
  const rows = [
    { id: 1, parent_id: null, key_name: 'a', label: 'A', role: 'default', is_active: 1, order_index: 0 },
    { id: 2, parent_id: 999, key_name: 'orphan', label: 'Orphan', role: 'default', is_active: 1, order_index: 1 },
  ];
  const tree = MenuService.buildMenuTree(rows);
  loud();
  assertEq(tree.length, 2, 'orphan becomes root');
  assert(tree.some((t: any) => t.id === 2), 'orphan included in roots');
}

// Empty array
assertEq(MenuService.buildMenuTree([]), [], 'empty → []');

// ============================================================================
// detectCycles
// ============================================================================
console.log('\n── detectCycles ──────────────────────────────────────────');

// Clean tree — no cycles
{
  const items = [
    { id: 1, parent_id: null, key_name: 'a' },
    { id: 2, parent_id: 1, key_name: 'b' },
    { id: 3, parent_id: 2, key_name: 'c' },
  ];
  const errors = MenuService.detectCycles(items as any);
  assertEq(errors.length, 0, 'clean tree → no errors');
}

// Self-parent
{
  const items = [
    { id: 1, parent_id: 1, key_name: 'selfie' },
  ];
  const errors = MenuService.detectCycles(items as any);
  assertEq(errors.length, 1, 'self-parent → 1 error');
  assert(/cannot be its own parent/i.test(errors[0].message), 'self-parent message');
}

// Two-node cycle: 1 → 2 → 1
{
  const items = [
    { id: 1, parent_id: 2, key_name: 'a' },
    { id: 2, parent_id: 1, key_name: 'b' },
  ];
  const errors = MenuService.detectCycles(items as any);
  assert(errors.length >= 1, 'two-node cycle detected');
  assert(errors.some((e: any) => /cycle/i.test(e.message) || /own parent/i.test(e.message)), 'cycle error reported');
}

// Three-node cycle: 1 → 2 → 3 → 1
{
  const items = [
    { id: 1, parent_id: 3, key_name: 'a' },
    { id: 2, parent_id: 1, key_name: 'b' },
    { id: 3, parent_id: 2, key_name: 'c' },
  ];
  const errors = MenuService.detectCycles(items as any);
  assert(errors.length >= 1, 'three-node cycle detected');
}

// Items without parent_id → no cycle check
{
  const items = [
    { id: 1, parent_id: null, key_name: 'a' },
    { id: 2, parent_id: null, key_name: 'b' },
  ];
  const errors = MenuService.detectCycles(items as any);
  assertEq(errors.length, 0, 'no parent_id → no errors');
}

// ============================================================================
// validateMenuItems
// ============================================================================
console.log('\n── validateMenuItems ─────────────────────────────────────');

// Valid items
{
  const items = [
    {
      id: 1, parent_id: null, key_name: 'dash', label: 'Dashboard',
      icon: 'IconLayoutDashboard', path: '/dashboards/home',
      role: 'default', is_active: 1, order_index: 0,
      meta: null,
    },
  ];
  const errors = MenuService.validateMenuItems(items as any);
  assertEq(errors.length, 0, 'valid item → no errors');
}

// Missing key_name and label
{
  const items = [
    { id: 1, parent_id: null, key_name: '', label: '   ', role: 'default', is_active: 1, order_index: 0 },
  ];
  const errors = MenuService.validateMenuItems(items as any);
  assert(errors.some((e: any) => e.field === 'items[0].key_name'), 'key_name error');
  assert(errors.some((e: any) => e.field === 'items[0].label'), 'label error');
}

// Invalid path
{
  const items = [
    {
      id: 1, parent_id: null, key_name: 'k', label: 'L',
      path: '/not-allowed/xyz', role: 'default', is_active: 1, order_index: 0,
    },
  ];
  const errors = MenuService.validateMenuItems(items as any);
  assert(errors.some((e: any) => e.field === 'items[0].path'), 'invalid path error');
}

// Valid path "#" is allowed (placeholder)
{
  const items = [
    {
      id: 1, parent_id: null, key_name: 'k', label: 'L',
      path: '#', role: 'default', is_active: 1, order_index: 0,
    },
  ];
  const errors = MenuService.validateMenuItems(items as any);
  assertEq(errors.filter((e: any) => e.field.includes('path')).length, 0, '# path allowed');
}

// Invalid icon
{
  const items = [
    {
      id: 1, parent_id: null, key_name: 'k', label: 'L',
      icon: 'IconFakeDoesNotExist',
      role: 'default', is_active: 1, order_index: 0,
    },
  ];
  const errors = MenuService.validateMenuItems(items as any);
  assert(errors.some((e: any) => e.field === 'items[0].icon'), 'invalid icon error');
}

// Invalid meta keys
{
  const items = [
    {
      id: 1, parent_id: null, key_name: 'k', label: 'L',
      role: 'default', is_active: 1, order_index: 0,
      meta: { badge: 'x', badKey: 'y', anotherBad: 'z' },
    },
  ];
  const errors = MenuService.validateMenuItems(items as any);
  const metaErr = errors.find((e: any) => e.field === 'items[0].meta');
  assert(metaErr !== undefined, 'meta error present');
  assert(/badKey/.test(metaErr.message) && /anotherBad/.test(metaErr.message), 'lists invalid keys');
}

// Meta as invalid JSON string
{
  const items = [
    {
      id: 1, parent_id: null, key_name: 'k', label: 'L',
      role: 'default', is_active: 1, order_index: 0,
      meta: 'not json {',
    },
  ];
  const errors = MenuService.validateMenuItems(items as any);
  assert(errors.some((e: any) => e.field === 'items[0].meta'), 'invalid JSON meta error');
}

// Non-numeric order_index
{
  const items = [
    {
      id: 1, parent_id: null, key_name: 'k', label: 'L',
      role: 'default', is_active: 1, order_index: 'zero' as any,
    },
  ];
  const errors = MenuService.validateMenuItems(items as any);
  assert(errors.some((e: any) => e.field === 'items[0].order_index'), 'order_index type error');
}

// Cycle detection integrated
{
  const items = [
    { id: 1, parent_id: 1, key_name: 'cyclic', label: 'Cyclic', role: 'default', is_active: 1, order_index: 0 },
  ];
  const errors = MenuService.validateMenuItems(items as any);
  assert(errors.some((e: any) => e.field === 'parent_id'), 'cycle error surfaced from validate');
}

// ============================================================================
// getMenusByRole
// ============================================================================
console.log('\n── getMenusByRole ────────────────────────────────────────');

resetPool();
poolRoutes.push({
  match: /SELECT \* FROM menus/i,
  rows: [
    { id: 1, key_name: 'a', label: 'A', role: 'default', is_active: 1, order_index: 0 },
  ],
});
{
  const rows = await MenuService.getMenusByRole('default');
  assertEq(rows.length, 1, 'returned rows');
  assertEq(poolCalls.length, 1, '1 query');
  assert(/WHERE role = \?/i.test(poolCalls[0].sql), 'WHERE role clause');
  assert(/AND is_active = 1/i.test(poolCalls[0].sql), 'active filter when true');
  assert(/ORDER BY order_index/i.test(poolCalls[0].sql), 'sorted by order_index');
  assertEq(poolCalls[0].params, ['default'], 'role param');
}

// activeOnly = false
resetPool();
poolRoutes.push({ match: /SELECT \* FROM menus/i, rows: [] });
{
  await MenuService.getMenusByRole('super_admin', false);
  assert(!/AND is_active = 1/i.test(poolCalls[0].sql), 'no active filter when false');
  assertEq(poolCalls[0].params, ['super_admin'], 'super_admin param');
}

// Error propagation
resetPool();
poolRoutes.push({ match: /SELECT/i, rows: [], throws: new Error('db fail') });
quiet();
{
  let caught: Error | null = null;
  try { await MenuService.getMenusByRole('default'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message === 'db fail', 're-throws db error');
}
loud();

// ============================================================================
// upsertMenuItems — UPDATE branch
// ============================================================================
console.log('\n── upsertMenuItems: UPDATE branch ────────────────────────');

resetPool();
// UPDATE + audit insert
poolRoutes.push({ match: /^UPDATE menus/i, rows: [], result: { affectedRows: 1 } });
poolRoutes.push({ match: /INSERT INTO menu_audit/i, rows: [], result: { insertId: 1 } });
{
  const items = [
    {
      id: 42, parent_id: null, key_name: 'dash', label: 'Dashboard',
      icon: 'IconLayoutDashboard', path: '/dashboards/home',
      role: 'default' as any, is_active: 1, order_index: 0,
      meta: { badge: 'new' },
    },
  ];
  const { inserted, updated } = await MenuService.upsertMenuItems(items as any, 'user123');
  assertEq(inserted, 0, '0 inserted');
  assertEq(updated, 1, '1 updated');
  // Find update call
  const updateCall = poolCalls.find(c => /^UPDATE menus/i.test(c.sql));
  assert(updateCall !== undefined, 'UPDATE call fired');
  assertEq(updateCall!.params[0], null, 'parent_id null');
  assertEq(updateCall!.params[1], 'dash', 'key_name');
  assertEq(updateCall!.params[2], 'Dashboard', 'label');
  assertEq(updateCall!.params[9], JSON.stringify({ badge: 'new' }), 'meta serialized');
  assertEq(updateCall!.params[10], 'user123', 'updated_by');
  assertEq(updateCall!.params[11], 42, 'WHERE id');
  // Audit insert
  const auditCall = poolCalls.find(c => /INSERT INTO menu_audit/i.test(c.sql));
  assert(auditCall !== undefined, 'audit fired');
  assertEq(auditCall!.params[0], 'update', 'action=update');
  assertEq(auditCall!.params[1], 'user123', 'audit user');
}

// ============================================================================
// upsertMenuItems — INSERT branch
// ============================================================================
console.log('\n── upsertMenuItems: INSERT branch ────────────────────────');

resetPool();
poolRoutes.push({ match: /^INSERT INTO menus/i, rows: [], result: { insertId: 99, affectedRows: 1 } });
poolRoutes.push({ match: /INSERT INTO menu_audit/i, rows: [], result: { insertId: 1 } });
{
  const items = [
    {
      parent_id: null, key_name: 'new_item', label: 'New',
      icon: null, path: null,
      role: 'default' as any, is_active: 0, order_index: 5,
      meta: null,
    },
  ];
  const { inserted, updated } = await MenuService.upsertMenuItems(items as any, 'u1');
  assertEq(inserted, 1, '1 inserted');
  assertEq(updated, 0, '0 updated');
  const insertCall = poolCalls.find(c => /^INSERT INTO menus/i.test(c.sql));
  assert(insertCall !== undefined, 'INSERT call fired');
  assertEq(insertCall!.params[1], 'new_item', 'key_name');
  assertEq(insertCall!.params[7], 0, 'is_active = 0');
  assertEq(insertCall!.params[9], null, 'meta null');
}

// Invalid meta in upsert → logged + set to null, does NOT throw
resetPool();
poolRoutes.push({ match: /^INSERT INTO menus/i, rows: [], result: { insertId: 100 } });
poolRoutes.push({ match: /INSERT INTO menu_audit/i, rows: [], result: { insertId: 1 } });
quiet();
{
  const items = [
    {
      parent_id: null, key_name: 'meta_bad', label: 'X',
      role: 'default' as any, is_active: 1, order_index: 0,
      meta: 'not json {',
    },
  ];
  await MenuService.upsertMenuItems(items as any, 'u1');
  const insertCall = poolCalls.find(c => /^INSERT INTO menus/i.test(c.sql));
  assertEq(insertCall!.params[9], null, 'invalid meta → null');
}
loud();

// Error during upsert → throws
resetPool();
poolRoutes.push({ match: /^UPDATE menus/i, rows: [], throws: new Error('constraint fail') });
quiet();
{
  let caught: Error | null = null;
  try {
    await MenuService.upsertMenuItems(
      [{ id: 1, key_name: 'k', label: 'L', role: 'default', is_active: 1, order_index: 0 }] as any,
      'u1',
    );
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message === 'constraint fail', 'upsert re-throws');
}
loud();

// ============================================================================
// resetMenusByRole
// ============================================================================
console.log('\n── resetMenusByRole ──────────────────────────────────────');

resetPool();
// NOTE: menuService destructures `const [result] = await pool.query(...)` for
// UPDATE/DELETE — takes first tuple slot. Put OK packet in `rows` slot.
poolRoutes.push({ match: /^UPDATE menus SET is_active = 0/i, rows: { affectedRows: 7 } as any });
poolRoutes.push({ match: /INSERT INTO menu_audit/i, rows: [], result: { insertId: 1 } });
{
  const count = await MenuService.resetMenusByRole('default', 'u42');
  assertEq(count, 7, 'returns affectedRows');
  const upd = poolCalls.find(c => /UPDATE menus SET is_active = 0/i.test(c.sql));
  assert(upd !== undefined, 'UPDATE fired');
  assertEq(upd!.params, ['u42', 'default'], 'params [userId, role]');
  const audit = poolCalls.find(c => /INSERT INTO menu_audit/i.test(c.sql));
  assert(audit !== undefined, 'audit fired');
  assertEq(audit!.params[0], 'reset', 'action=reset');
}

// Error path
resetPool();
poolRoutes.push({ match: /^UPDATE menus/i, rows: [], throws: new Error('locked') });
quiet();
{
  let caught: Error | null = null;
  try { await MenuService.resetMenusByRole('default', 'u1'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /locked/.test(caught!.message), 'reset re-throws');
}
loud();

// ============================================================================
// deleteMenuItem
// ============================================================================
console.log('\n── deleteMenuItem ────────────────────────────────────────');

// Happy path — deletes and re-parents.
// NOTE: deleteMenuItem destructures `const [result] = ...` — OK packet in rows slot.
resetPool();
poolRoutes.push({ match: /^UPDATE menus SET parent_id = NULL/i, rows: { affectedRows: 2 } as any });
poolRoutes.push({ match: /^DELETE FROM menus/i, rows: { affectedRows: 1 } as any });
poolRoutes.push({ match: /INSERT INTO menu_audit/i, rows: [], result: { insertId: 1 } });
{
  const ok = await MenuService.deleteMenuItem(55, 'u1');
  assertEq(ok, true, 'returns true on delete');
  // Order: UPDATE (reparent), DELETE, INSERT audit
  assertEq(poolCalls.length, 3, '3 queries fired');
  assert(/UPDATE menus SET parent_id = NULL/i.test(poolCalls[0].sql), 'reparent first');
  assertEq(poolCalls[0].params, ['u1', 55], 'reparent params [userId, id]');
  assert(/^DELETE FROM menus/i.test(poolCalls[1].sql), 'delete second');
  assertEq(poolCalls[1].params, [55], 'delete params [id]');
  assert(/INSERT INTO menu_audit/i.test(poolCalls[2].sql), 'audit third');
  assertEq(poolCalls[2].params[0], 'delete', 'action=delete');
}

// Not found — affectedRows = 0 → returns false, NO audit
resetPool();
poolRoutes.push({ match: /^UPDATE menus/i, rows: { affectedRows: 0 } as any });
poolRoutes.push({ match: /^DELETE FROM menus/i, rows: { affectedRows: 0 } as any });
{
  const ok = await MenuService.deleteMenuItem(999, 'u1');
  assertEq(ok, false, 'not found → false');
  const audit = poolCalls.find(c => /INSERT INTO menu_audit/i.test(c.sql));
  assertEq(audit, undefined, 'no audit when nothing deleted');
}

// Error path
resetPool();
poolRoutes.push({ match: /^UPDATE menus/i, rows: [], throws: new Error('fk fail') });
quiet();
{
  let caught: Error | null = null;
  try { await MenuService.deleteMenuItem(1, 'u1'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /fk fail/.test(caught!.message), 'delete re-throws');
}
loud();

// ============================================================================
// logAudit — swallows errors
// ============================================================================
console.log('\n── logAudit ──────────────────────────────────────────────');

resetPool();
poolThrowAudit = true;
quiet();
{
  // Should NOT throw
  let threw = false;
  try {
    await MenuService.logAudit('test-action', 'u1', { foo: 'bar' });
  } catch { threw = true; }
  assert(!threw, 'logAudit swallows errors');
}
loud();
poolThrowAudit = false;

// Happy path audit
resetPool();
poolRoutes.push({ match: /INSERT INTO menu_audit/i, rows: [], result: { insertId: 1 } });
{
  await MenuService.logAudit('custom', 'u2', { a: 1 });
  assertEq(poolCalls.length, 1, '1 query');
  assertEq(poolCalls[0].params[0], 'custom', 'action');
  assertEq(poolCalls[0].params[1], 'u2', 'user');
  assertEq(poolCalls[0].params[2], JSON.stringify({ a: 1 }), 'changes JSON');
}

// ============================================================================
// Constant exports sanity
// ============================================================================
console.log('\n── constant exports ─────────────────────────────────────');

assert(Array.isArray(ALLOWED_ICONS) && ALLOWED_ICONS.length > 0, 'ALLOWED_ICONS exported');
assert(ALLOWED_ICONS.includes('IconLayoutDashboard'), 'contains IconLayoutDashboard');
assert(Array.isArray(ALLOWED_META_KEYS) && ALLOWED_META_KEYS.includes('badge'), 'ALLOWED_META_KEYS contains badge');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main()

main().catch((e) => {
  loud();
  console.error('Unhandled test error:', e);
  process.exit(1);
});
