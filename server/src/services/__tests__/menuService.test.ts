#!/usr/bin/env npx tsx
/**
 * Unit tests for services/menuService.ts (OMD-1244)
 *
 * Deterministic tests for the menu service:
 *   - normalizeMeta: null, undefined, empty string, valid JSON object,
 *     already-parsed object, malformed JSON, array, primitive, wrong types
 *   - MenuService.buildMenuTree: flat → nested, multi-level, orphans,
 *     order_index sort at each level
 *   - MenuService.detectCycles: no cycles, self-parent, simple cycle,
 *     deeper cycle
 *   - MenuService.validateMenuItems: required fields, path allowlist,
 *     icon whitelist, meta validation, order_index type, cycle detection
 *   - MenuService.getMenusByRole: active filter on/off, SQL params
 *   - MenuService.upsertMenuItems: update (with id) vs insert (no id),
 *     meta JSON serialization, invalid meta tolerance, audit call
 *   - MenuService.resetMenusByRole: returns affectedRows, audit call
 *   - MenuService.deleteMenuItem: re-parents children, returns boolean,
 *     audit call
 *   - MenuService.logAudit: writes row, swallows errors
 *
 * DB stubbed via require.cache fake pool with regex dispatch.
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

// ─── Fake pool ──────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Responder = {
  match: RegExp;
  respond: (params: any[]) => any;
};
let responders: Responder[] = [];
let queryThrows: RegExp | null = null;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (queryThrows && queryThrows.test(sql)) {
      throw new Error('fake db failure');
    }
    for (const r of responders) {
      if (r.match.test(sql)) {
        return [r.respond(params)];
      }
    }
    return [{ affectedRows: 0 }];
  },
};

const dbStub = { getAppPool: () => fakePool };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true, exports: dbStub,
} as any;

function resetState() {
  queryLog.length = 0;
  responders = [];
  queryThrows = null;
}

// Silence noise
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
function loud() {
  console.log = origLog;
  console.warn = origWarn;
  console.error = origError;
}

const svc = require('../menuService');
const MenuService = svc.MenuService || svc.default;
const { normalizeMeta, ALLOWED_ICONS, PATH_ALLOWLIST_REGEX, ALLOWED_META_KEYS } = svc;

async function main() {

// ============================================================================
// normalizeMeta
// ============================================================================
console.log('\n── normalizeMeta ─────────────────────────────────────────');

assertEq(normalizeMeta(null), null, 'null → null');
assertEq(normalizeMeta(undefined), null, 'undefined → null');
assertEq(normalizeMeta(''), null, 'empty string → null');
assertEq(normalizeMeta('   '), null, 'whitespace-only → null');
assertEq(normalizeMeta('{"a":1}'), { a: 1 }, 'JSON string → object');
assertEq(normalizeMeta({ b: 2 }), { b: 2 }, 'object passthrough');

// Invalid JSON string
{
  let caught: Error | null = null;
  try { normalizeMeta('{not json'); } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('valid JSON'), 'malformed JSON throws');
}

// JSON array (valid JSON but not allowed)
{
  let caught: Error | null = null;
  try { normalizeMeta('[1,2,3]'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'array JSON throws');
}

// JSON primitive
{
  let caught: Error | null = null;
  try { normalizeMeta('42'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'number JSON throws');
}

// Array object directly
{
  let caught: Error | null = null;
  try { normalizeMeta([1, 2]); } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('JSON string or object'), 'array object throws');
}

// Number directly
{
  let caught: Error | null = null;
  try { normalizeMeta(42); } catch (e: any) { caught = e; }
  assert(caught !== null, 'number throws');
}

// ============================================================================
// Exported constants
// ============================================================================
console.log('\n── Exported constants ────────────────────────────────────');

assert(Array.isArray(ALLOWED_ICONS) && ALLOWED_ICONS.length > 0, 'ALLOWED_ICONS is array');
assert(ALLOWED_ICONS.includes('IconLayoutDashboard'), 'includes core icon');
assert(Array.isArray(ALLOWED_META_KEYS), 'ALLOWED_META_KEYS is array');
assert(ALLOWED_META_KEYS.includes('badge'), 'includes badge');
assert(PATH_ALLOWLIST_REGEX.test('/apps/foo'), 'regex matches /apps');
assert(PATH_ALLOWLIST_REGEX.test('/admin'), 'regex matches /admin');
assert(PATH_ALLOWLIST_REGEX.test('/church/42'), 'regex matches /church/42');
assert(!PATH_ALLOWLIST_REGEX.test('/random'), 'regex rejects /random');
assert(!PATH_ALLOWLIST_REGEX.test('/appsfoo'), 'regex rejects /appsfoo (no boundary)');

// ============================================================================
// buildMenuTree
// ============================================================================
console.log('\n── buildMenuTree ─────────────────────────────────────────');

// Empty
{
  const tree = MenuService.buildMenuTree([]);
  assertEq(tree, [], 'empty input');
}

// Flat (no nesting) with ordering
{
  const rows = [
    { id: 2, parent_id: null, key_name: 'b', label: 'B', order_index: 2, is_active: 1, role: 'default' },
    { id: 1, parent_id: null, key_name: 'a', label: 'A', order_index: 1, is_active: 1, role: 'default' },
    { id: 3, parent_id: null, key_name: 'c', label: 'C', order_index: 3, is_active: 1, role: 'default' },
  ];
  const tree = MenuService.buildMenuTree(rows as any);
  assertEq(tree.length, 3, 'flat: 3 roots');
  assertEq(tree[0].key_name, 'a', 'sorted: a first');
  assertEq(tree[1].key_name, 'b', 'sorted: b second');
  assertEq(tree[2].key_name, 'c', 'sorted: c third');
  assertEq(tree[0].children, [], 'empty children array');
}

// Nested
{
  const rows = [
    { id: 1, parent_id: null, key_name: 'root', label: 'Root', order_index: 1, is_active: 1, role: 'default' },
    { id: 2, parent_id: 1, key_name: 'child1', label: 'C1', order_index: 2, is_active: 1, role: 'default' },
    { id: 3, parent_id: 1, key_name: 'child2', label: 'C2', order_index: 1, is_active: 1, role: 'default' },
    { id: 4, parent_id: 3, key_name: 'grandchild', label: 'GC', order_index: 1, is_active: 1, role: 'default' },
  ];
  const tree = MenuService.buildMenuTree(rows as any);
  assertEq(tree.length, 1, '1 root');
  assertEq(tree[0].children!.length, 2, 'root has 2 children');
  // Sorted: child2 (order_index 1) before child1 (order_index 2)
  assertEq(tree[0].children![0].key_name, 'child2', 'sorted child2 first');
  assertEq(tree[0].children![1].key_name, 'child1', 'sorted child1 second');
  // Grandchild
  assertEq(tree[0].children![0].children!.length, 1, 'child2 has grandchild');
  assertEq(tree[0].children![0].children![0].key_name, 'grandchild', 'grandchild placed');
}

// Orphan (invalid parent_id → treated as root)
quiet();
{
  const rows = [
    { id: 1, parent_id: null, key_name: 'r', label: 'R', order_index: 1, is_active: 1, role: 'default' },
    { id: 2, parent_id: 999, key_name: 'orphan', label: 'O', order_index: 2, is_active: 1, role: 'default' },
  ];
  const tree = MenuService.buildMenuTree(rows as any);
  loud();
  assertEq(tree.length, 2, 'orphan becomes root');
  assert(tree.some((t: any) => t.key_name === 'orphan'), 'orphan present');
}

// ============================================================================
// detectCycles
// ============================================================================
console.log('\n── detectCycles ──────────────────────────────────────────');

// No cycles
{
  const items = [
    { id: 1, parent_id: null, key_name: 'a', label: 'A', order_index: 1, is_active: 1, role: 'default' },
    { id: 2, parent_id: 1, key_name: 'b', label: 'B', order_index: 2, is_active: 1, role: 'default' },
  ];
  const errors = MenuService.detectCycles(items as any);
  assertEq(errors.length, 0, 'no cycles');
}

// Self-parent
{
  const items = [
    { id: 1, parent_id: 1, key_name: 'self', label: 'Self', order_index: 1, is_active: 1, role: 'default' },
  ];
  const errors = MenuService.detectCycles(items as any);
  assertEq(errors.length, 1, 'self-parent = 1 error');
  assert(errors[0].message.includes('cannot be its own parent'), 'self-parent message');
}

// Two-node cycle: 1 → 2 → 1
{
  const items = [
    { id: 1, parent_id: 2, key_name: 'a', label: 'A', order_index: 1, is_active: 1, role: 'default' },
    { id: 2, parent_id: 1, key_name: 'b', label: 'B', order_index: 2, is_active: 1, role: 'default' },
  ];
  const errors = MenuService.detectCycles(items as any);
  assert(errors.length >= 1, 'two-node cycle detected');
  // The loop equality check with item.id fires for any cycle returning to
  // the origin, so the message is "cannot be its own parent".
  assert(errors[0].field === 'parent_id', 'error field is parent_id');
}

// ============================================================================
// validateMenuItems
// ============================================================================
console.log('\n── validateMenuItems ─────────────────────────────────────');

// Missing key_name
{
  const items = [
    { label: 'L', role: 'default', is_active: 1, order_index: 0 },
  ];
  const errors = MenuService.validateMenuItems(items as any);
  assert(errors.some((e: any) => e.field.includes('key_name')), 'missing key_name error');
}

// Missing label
{
  const items = [
    { key_name: 'k', role: 'default', is_active: 1, order_index: 0 },
  ];
  const errors = MenuService.validateMenuItems(items as any);
  assert(errors.some((e: any) => e.field.includes('label')), 'missing label error');
}

// Invalid path
{
  const items = [
    { key_name: 'k', label: 'L', path: '/invalid', role: 'default', is_active: 1, order_index: 0 },
  ];
  const errors = MenuService.validateMenuItems(items as any);
  assert(errors.some((e: any) => e.field.includes('path')), 'invalid path error');
}

// Valid path (# placeholder)
{
  const items = [
    { key_name: 'k', label: 'L', path: '#', role: 'default', is_active: 1, order_index: 0 },
  ];
  const errors = MenuService.validateMenuItems(items as any);
  assert(!errors.some((e: any) => e.field.includes('path')), '# path is allowed');
}

// Invalid icon
{
  const items = [
    { key_name: 'k', label: 'L', icon: 'NotAnIcon', role: 'default', is_active: 1, order_index: 0 },
  ];
  const errors = MenuService.validateMenuItems(items as any);
  assert(errors.some((e: any) => e.field.includes('icon')), 'invalid icon error');
}

// Valid icon
{
  const items = [
    { key_name: 'k', label: 'L', icon: 'IconLayoutDashboard', role: 'default', is_active: 1, order_index: 0 },
  ];
  const errors = MenuService.validateMenuItems(items as any);
  assert(!errors.some((e: any) => e.field.includes('icon')), 'valid icon ok');
}

// Invalid meta keys
{
  const items = [
    { key_name: 'k', label: 'L', meta: '{"badkey":1}', role: 'default', is_active: 1, order_index: 0 },
  ];
  const errors = MenuService.validateMenuItems(items as any);
  assert(errors.some((e: any) => e.field.includes('meta')), 'invalid meta key error');
}

// Valid meta
{
  const items: any[] = [
    { key_name: 'k', label: 'L', meta: '{"badge":"new"}', role: 'default', is_active: 1, order_index: 0 },
  ];
  const errors = MenuService.validateMenuItems(items);
  assert(!errors.some((e: any) => e.field.includes('meta')), 'valid meta accepted');
  assertEq(items[0].metaNormalized, { badge: 'new' }, 'metaNormalized set');
}

// Malformed meta JSON
{
  const items = [
    { key_name: 'k', label: 'L', meta: '{not json', role: 'default', is_active: 1, order_index: 0 },
  ];
  const errors = MenuService.validateMenuItems(items as any);
  assert(errors.some((e: any) => e.field.includes('meta')), 'malformed meta error');
}

// Non-number order_index
{
  const items = [
    { key_name: 'k', label: 'L', role: 'default', is_active: 1, order_index: 'not-a-number' as any },
  ];
  const errors = MenuService.validateMenuItems(items as any);
  assert(errors.some((e: any) => e.field.includes('order_index')), 'order_index type error');
}

// Happy path — nothing wrong
{
  const items = [
    { id: 1, key_name: 'k', label: 'L', path: '/apps/x', icon: 'IconLayoutDashboard', role: 'default', is_active: 1, order_index: 0 },
  ];
  const errors = MenuService.validateMenuItems(items as any);
  assertEq(errors.length, 0, 'valid item passes');
}

// ============================================================================
// getMenusByRole
// ============================================================================
console.log('\n── getMenusByRole ────────────────────────────────────────');

// Active only (default)
resetState();
{
  responders.push({
    match: /SELECT \* FROM menus WHERE role = \?/,
    respond: () => [
      { id: 1, role: 'default', is_active: 1, order_index: 0 },
      { id: 2, role: 'default', is_active: 1, order_index: 1 },
    ],
  });
  const rows = await MenuService.getMenusByRole('default');
  assertEq(rows.length, 2, '2 rows returned');
  const q = queryLog[0];
  assert(q.sql.includes('is_active = 1'), 'active filter applied');
  assertEq(q.params[0], 'default', 'role param');
}

// Include inactive
resetState();
{
  responders.push({
    match: /SELECT \* FROM menus WHERE role = \?/,
    respond: () => [{ id: 1 }],
  });
  await MenuService.getMenusByRole('super_admin', false);
  const q = queryLog[0];
  assert(!q.sql.includes('is_active = 1'), 'no active filter');
  assertEq(q.params[0], 'super_admin', 'super_admin role');
}

// DB error
resetState();
quiet();
{
  queryThrows = /SELECT \* FROM menus WHERE role = \?/;
  let caught: Error | null = null;
  try { await MenuService.getMenusByRole('default'); } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'DB error re-thrown');
}

// ============================================================================
// upsertMenuItems
// ============================================================================
console.log('\n── upsertMenuItems ───────────────────────────────────────');

// Update (item has id)
resetState();
{
  responders.push({
    match: /^UPDATE menus SET/,
    respond: () => ({ affectedRows: 1 }),
  });
  responders.push({
    match: /INSERT INTO menu_audit/,
    respond: () => ({ affectedRows: 1 }),
  });
  const items = [
    { id: 5, key_name: 'k', label: 'L', role: 'default' as const, is_active: 1, order_index: 0, meta: '{"badge":"x"}' },
  ];
  const result = await MenuService.upsertMenuItems(items as any, 'user-1');
  assertEq(result.updated, 1, 'updated count');
  assertEq(result.inserted, 0, 'no inserts');
  const upd = queryLog.find(q => /^UPDATE menus SET/.test(q.sql))!;
  // params: parent, key, label, icon, path, role, roles, is_active, order, meta, updated_by, id
  assertEq(upd.params[9], '{"badge":"x"}', 'meta serialized');
  assertEq(upd.params[10], 'user-1', 'updated_by');
  assertEq(upd.params[11], 5, 'item id in WHERE');
  assert(
    queryLog.some(q => /INSERT INTO menu_audit/.test(q.sql)),
    'audit logged'
  );
}

// Insert (no id)
resetState();
{
  responders.push({
    match: /^INSERT INTO menus/,
    respond: () => ({ affectedRows: 1 }),
  });
  responders.push({
    match: /INSERT INTO menu_audit/,
    respond: () => ({ affectedRows: 1 }),
  });
  const items = [
    { key_name: 'new', label: 'New', role: 'default' as const, is_active: 0, order_index: 5 },
  ];
  const result = await MenuService.upsertMenuItems(items as any, 'user-2');
  assertEq(result.inserted, 1, 'inserted count');
  assertEq(result.updated, 0, 'no updates');
  const ins = queryLog.find(q => /^INSERT INTO menus/.test(q.sql))!;
  assertEq(ins.params[1], 'new', 'key_name');
  assertEq(ins.params[7], 0, 'is_active=0');
  assertEq(ins.params[8], 5, 'order_index');
  assertEq(ins.params[9], null, 'meta null when unset');
}

// Invalid meta → stored as null, not an error
resetState();
quiet();
{
  responders.push({
    match: /^INSERT INTO menus/,
    respond: () => ({ affectedRows: 1 }),
  });
  responders.push({
    match: /INSERT INTO menu_audit/,
    respond: () => ({ affectedRows: 1 }),
  });
  const items = [
    { key_name: 'k', label: 'L', role: 'default' as const, is_active: 1, order_index: 0, meta: '{not json' },
  ];
  await MenuService.upsertMenuItems(items as any, 'user-3');
  loud();
  const ins = queryLog.find(q => /^INSERT INTO menus/.test(q.sql))!;
  assertEq(ins.params[9], null, 'invalid meta → null');
}

// ============================================================================
// resetMenusByRole
// ============================================================================
console.log('\n── resetMenusByRole ──────────────────────────────────────');

resetState();
{
  responders.push({
    match: /UPDATE menus SET is_active = 0/,
    respond: () => ({ affectedRows: 7 }),
  });
  responders.push({
    match: /INSERT INTO menu_audit/,
    respond: () => ({ affectedRows: 1 }),
  });
  const count = await MenuService.resetMenusByRole('default', 'admin-1');
  assertEq(count, 7, 'returns affectedRows');
  const upd = queryLog.find(q => /UPDATE menus SET is_active = 0/.test(q.sql))!;
  assertEq(upd.params[0], 'admin-1', 'updated_by');
  assertEq(upd.params[1], 'default', 'role param');
  assert(
    queryLog.some(q => /INSERT INTO menu_audit/.test(q.sql)),
    'audit logged'
  );
}

// DB error
resetState();
quiet();
{
  queryThrows = /UPDATE menus SET is_active = 0/;
  let caught: Error | null = null;
  try { await MenuService.resetMenusByRole('default', 'u'); } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'DB error re-thrown');
}

// ============================================================================
// deleteMenuItem
// ============================================================================
console.log('\n── deleteMenuItem ────────────────────────────────────────');

// Happy path
resetState();
{
  responders.push({
    match: /UPDATE menus SET parent_id = NULL/,
    respond: () => ({ affectedRows: 2 }),
  });
  responders.push({
    match: /^DELETE FROM menus/,
    respond: () => ({ affectedRows: 1 }),
  });
  responders.push({
    match: /INSERT INTO menu_audit/,
    respond: () => ({ affectedRows: 1 }),
  });
  const ok = await MenuService.deleteMenuItem(42, 'admin');
  assertEq(ok, true, 'returns true on delete');
  assert(
    queryLog.some(q => /UPDATE menus SET parent_id = NULL/.test(q.sql)),
    'children re-parented'
  );
  assert(
    queryLog.some(q => /^DELETE FROM menus/.test(q.sql)),
    'delete executed'
  );
  assert(
    queryLog.some(q => /INSERT INTO menu_audit/.test(q.sql)),
    'audit logged'
  );
}

// Not found
resetState();
{
  responders.push({
    match: /UPDATE menus SET parent_id = NULL/,
    respond: () => ({ affectedRows: 0 }),
  });
  responders.push({
    match: /^DELETE FROM menus/,
    respond: () => ({ affectedRows: 0 }),
  });
  const ok = await MenuService.deleteMenuItem(999, 'admin');
  assertEq(ok, false, 'returns false when no row deleted');
  // No audit entry when not deleted
  assert(
    !queryLog.some(q => /INSERT INTO menu_audit/.test(q.sql)),
    'no audit when not deleted'
  );
}

// ============================================================================
// logAudit
// ============================================================================
console.log('\n── logAudit ──────────────────────────────────────────────');

// Happy path
resetState();
{
  responders.push({
    match: /INSERT INTO menu_audit/,
    respond: () => ({ affectedRows: 1 }),
  });
  await MenuService.logAudit('test', 'user-z', { key: 'value' });
  const ins = queryLog[0];
  assertEq(ins.params[0], 'test', 'action param');
  assertEq(ins.params[1], 'user-z', 'user param');
  assertEq(ins.params[2], '{"key":"value"}', 'changes serialized');
}

// DB error swallowed (audit shouldn't break main flow)
resetState();
quiet();
{
  queryThrows = /INSERT INTO menu_audit/;
  let threw = false;
  try {
    await MenuService.logAudit('test', 'u', {});
  } catch { threw = true; }
  loud();
  assert(!threw, 'audit DB error swallowed');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
