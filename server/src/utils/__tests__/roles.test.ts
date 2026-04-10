#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/roles.js (OMD-887)
 *
 * Covers the canonical role hierarchy and all helpers:
 *   - normalizeLegacyRole / isCanonicalRole
 *   - hasRole / hasAnyRole / hasExactRole / getUserLevel
 *   - canManageUser / canAssignRole / getAssignableRoles
 *   - getRoleInfo / validateRoleMigration
 *   - Convenience checkers (isSuperAdmin, isAdmin, isClergy, etc.)
 *   - Permission checkers (canManageRecords, canExportData, etc.)
 *   - requireRole middleware (with mock req/res/next)
 *
 * Run: npx tsx server/src/utils/__tests__/roles.test.ts
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const roles: any = require('../roles');

const {
  // Constants
  CANONICAL_ROLES,
  roleHierarchy,
  legacyRoleMap,
  // Core
  normalizeLegacyRole,
  isCanonicalRole,
  hasRole,
  hasAnyRole,
  hasExactRole,
  getUserLevel,
  canManageUser,
  canAssignRole,
  getAssignableRoles,
  getRoleInfo,
  validateRoleMigration,
  // Convenience
  isSuperAdmin,
  isAdmin,
  isChurchAdmin,
  isPriest,
  isDeacon,
  isEditor,
  isViewer,
  isClergy,
  // Permission
  canManageGlobalSystem,
  canManageGlobalConfig,
  canManageChurches,
  canManageUsers,
  canManageRecords,
  canViewDashboard,
  canAccessOCR,
  canGenerateCertificates,
  canManageCalendar,
  canExportData,
  canDeleteRecords,
  canManageProvisioning,
  canManageChurchSettings,
  canEditContent,
  canPerformSacraments,
  canAssistSacraments,
  // Middleware
  requireRole,
} = roles;

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

// Suppress noisy console.warn/log output during tests
const origWarn = console.warn;
const origLog = console.log;
console.warn = () => {};
function quiet<T>(fn: () => T): T {
  const saved = console.log;
  console.log = () => {};
  try { return fn(); } finally { console.log = saved; }
}

// ============================================================================
// Constants
// ============================================================================
origLog('\n── Constants ─────────────────────────────────────────────');

assertEq(CANONICAL_ROLES.length, 8, '8 canonical roles');
assertEq(
  CANONICAL_ROLES,
  ['super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor', 'viewer', 'guest'],
  'CANONICAL_ROLES order'
);
assertEq(roleHierarchy.super_admin, 7, 'super_admin = 7');
assertEq(roleHierarchy.admin, 6, 'admin = 6');
assertEq(roleHierarchy.church_admin, 5, 'church_admin = 5');
assertEq(roleHierarchy.priest, 4, 'priest = 4');
assertEq(roleHierarchy.deacon, 3, 'deacon = 3');
assertEq(roleHierarchy.editor, 2, 'editor = 2');
assertEq(roleHierarchy.viewer, 1, 'viewer = 1');
assertEq(roleHierarchy.guest, 0, 'guest = 0');

// ============================================================================
// normalizeLegacyRole
// ============================================================================
origLog('\n── normalizeLegacyRole ───────────────────────────────────');

// Canonical roles passthrough
CANONICAL_ROLES.forEach((r: string) => {
  assertEq(normalizeLegacyRole(r), r, `canonical "${r}" passthrough`);
});

// Legacy mappings
assertEq(normalizeLegacyRole('dev_admin'), 'admin', 'dev_admin → admin');
assertEq(normalizeLegacyRole('manager'), 'church_admin', 'manager → church_admin');
assertEq(normalizeLegacyRole('owner'), 'church_admin', 'owner → church_admin');
assertEq(normalizeLegacyRole('administrator'), 'church_admin', 'administrator → church_admin');
assertEq(normalizeLegacyRole('supervisor'), 'church_admin', 'supervisor → church_admin');
assertEq(normalizeLegacyRole('clergy'), 'priest', 'clergy → priest');
assertEq(normalizeLegacyRole('user'), 'editor', 'user → editor');
assertEq(normalizeLegacyRole('secretary'), 'editor', 'secretary → editor');
assertEq(normalizeLegacyRole('treasurer'), 'editor', 'treasurer → editor');
assertEq(normalizeLegacyRole('volunteer'), 'editor', 'volunteer → editor');
assertEq(normalizeLegacyRole('member'), 'editor', 'member → editor');
assertEq(normalizeLegacyRole('moderator'), 'editor', 'moderator → editor');
assertEq(normalizeLegacyRole('assistant'), 'editor', 'assistant → editor');
assertEq(normalizeLegacyRole('system'), 'admin', 'system → admin');
assertEq(normalizeLegacyRole('ai_agent'), 'admin', 'ai_agent → admin');
assertEq(normalizeLegacyRole('omai'), 'admin', 'omai → admin');
assertEq(normalizeLegacyRole('super'), 'super_admin', 'super → super_admin');

// Falsy → guest
assertEq(normalizeLegacyRole(null), 'guest', 'null → guest');
assertEq(normalizeLegacyRole(undefined), 'guest', 'undefined → guest');
assertEq(normalizeLegacyRole(''), 'guest', 'empty → guest');

// Unknown → viewer (with warning, suppressed)
assertEq(normalizeLegacyRole('martian_overlord'), 'viewer', 'unknown role → viewer');

// ============================================================================
// isCanonicalRole
// ============================================================================
origLog('\n── isCanonicalRole ───────────────────────────────────────');

CANONICAL_ROLES.forEach((r: string) => {
  assertEq(isCanonicalRole(r), true, `canonical "${r}" → true`);
});
assertEq(isCanonicalRole('manager'), false, 'manager (legacy) → false');
assertEq(isCanonicalRole('martian'), false, 'unknown → false');
assertEq(isCanonicalRole(null), false, 'null → false');
assertEq(isCanonicalRole(''), false, 'empty → false');

// ============================================================================
// hasRole
// ============================================================================
origLog('\n── hasRole ───────────────────────────────────────────────');

const superUser = { role: 'super_admin' };
const admin = { role: 'admin' };
const churchAdmin = { role: 'church_admin' };
const priest = { role: 'priest' };
const deacon = { role: 'deacon' };
const editor = { role: 'editor' };
const viewer = { role: 'viewer' };

// Higher meets lower
assertEq(hasRole(superUser, 'admin'), true, 'super_admin meets admin');
assertEq(hasRole(superUser, 'guest'), true, 'super_admin meets guest');
assertEq(hasRole(admin, 'church_admin'), true, 'admin meets church_admin');
assertEq(hasRole(churchAdmin, 'priest'), true, 'church_admin meets priest');
assertEq(hasRole(priest, 'deacon'), true, 'priest meets deacon');
assertEq(hasRole(deacon, 'editor'), true, 'deacon meets editor');
assertEq(hasRole(editor, 'viewer'), true, 'editor meets viewer');
assertEq(hasRole(viewer, 'guest'), true, 'viewer meets guest');

// Same level
assertEq(hasRole(admin, 'admin'), true, 'admin meets admin (equal)');
assertEq(hasRole(priest, 'priest'), true, 'priest meets priest (equal)');

// Lower fails higher
assertEq(hasRole(admin, 'super_admin'), false, 'admin does NOT meet super_admin');
assertEq(hasRole(priest, 'admin'), false, 'priest does NOT meet admin');
assertEq(hasRole(viewer, 'editor'), false, 'viewer does NOT meet editor');
assertEq(hasRole(editor, 'deacon'), false, 'editor does NOT meet deacon');

// Legacy role normalization in input
assertEq(hasRole({ role: 'manager' }, 'priest'), true, 'manager (=church_admin) meets priest');
assertEq(hasRole({ role: 'clergy' }, 'editor'), true, 'clergy (=priest) meets editor');
assertEq(hasRole({ role: 'dev_admin' }, 'admin'), true, 'dev_admin (=admin) meets admin');

// Null/undefined user
assertEq(hasRole(null, 'guest'), true, 'null user meets guest');
assertEq(hasRole(null, 'viewer'), false, 'null user does NOT meet viewer');
assertEq(hasRole({}, 'guest'), true, 'no role meets guest');
assertEq(hasRole({}, 'editor'), false, 'no role does NOT meet editor');
assertEq(hasRole(undefined, 'guest'), true, 'undefined user meets guest');

// Unrecognized roles → false (with warning)
assertEq(hasRole({ role: 'martian' }, 'admin'), false, 'unknown role → viewer, fails admin');
assertEq(hasRole({ role: 'martian' }, 'guest'), true, 'unknown role → viewer, meets guest');

// ============================================================================
// hasAnyRole
// ============================================================================
origLog('\n── hasAnyRole ────────────────────────────────────────────');

assertEq(hasAnyRole(priest, ['admin', 'priest', 'deacon']), true, 'priest in list');
assertEq(hasAnyRole(priest, ['super_admin', 'admin']), false, 'priest not in higher list');
assertEq(hasAnyRole(superUser, ['editor']), true, 'super_admin meets editor (hierarchy)');
assertEq(hasAnyRole(viewer, ['viewer', 'guest']), true, 'viewer in list');
assertEq(hasAnyRole(viewer, []), false, 'empty list → false');
assertEq(hasAnyRole(null, ['guest']), false, 'null user → false');
assertEq(hasAnyRole({}, ['guest']), true, 'empty user meets guest');

// ============================================================================
// hasExactRole
// ============================================================================
origLog('\n── hasExactRole ──────────────────────────────────────────');

assertEq(hasExactRole(admin, 'admin'), true, 'admin == admin');
assertEq(hasExactRole(superUser, 'admin'), false, 'super_admin != admin (no hierarchy)');
assertEq(hasExactRole(admin, 'super_admin'), false, 'admin != super_admin');
assertEq(hasExactRole({ role: 'manager' }, 'church_admin'), true, 'legacy manager == church_admin');
assertEq(hasExactRole({ role: 'clergy' }, 'priest'), true, 'legacy clergy == priest');
assertEq(hasExactRole(null, 'guest'), true, 'null user == guest');
assertEq(hasExactRole(null, 'admin'), false, 'null user != admin');
assertEq(hasExactRole({}, 'guest'), true, 'no role == guest');

// ============================================================================
// getUserLevel
// ============================================================================
origLog('\n── getUserLevel ──────────────────────────────────────────');

assertEq(getUserLevel(superUser), 7, 'super_admin = 7');
assertEq(getUserLevel(admin), 6, 'admin = 6');
assertEq(getUserLevel(churchAdmin), 5, 'church_admin = 5');
assertEq(getUserLevel(priest), 4, 'priest = 4');
assertEq(getUserLevel(deacon), 3, 'deacon = 3');
assertEq(getUserLevel(editor), 2, 'editor = 2');
assertEq(getUserLevel(viewer), 1, 'viewer = 1');
assertEq(getUserLevel({ role: 'guest' }), 0, 'guest = 0');
assertEq(getUserLevel(null), 0, 'null = 0');
assertEq(getUserLevel({}), 0, 'no role = 0');
assertEq(getUserLevel({ role: 'manager' }), 5, 'legacy manager = 5');

// ============================================================================
// canManageUser
// ============================================================================
origLog('\n── canManageUser ─────────────────────────────────────────');

const u1 = { id: 1, role: 'super_admin' };
const u2 = { id: 2, role: 'admin' };
const u3 = { id: 3, role: 'editor' };

assertEq(canManageUser(u1, u2), true, 'super_admin manages admin');
assertEq(canManageUser(u2, u1), false, 'admin does NOT manage super_admin');
assertEq(canManageUser(u2, u3), true, 'admin manages editor');
assertEq(canManageUser(u3, u2), false, 'editor does NOT manage admin');

// Self-management always allowed
assertEq(canManageUser(u3, { id: 3, role: 'editor' }), true, 'self-management allowed');
assertEq(canManageUser(u1, { id: 1, role: 'super_admin' }), true, 'super_admin self-manage');

// Equal level (different ids) → no
const u2b = { id: 99, role: 'admin' };
assertEq(canManageUser(u2, u2b), false, 'admin does NOT manage another admin (equal level)');

// Null
assertEq(canManageUser(null, u2), false, 'null current → false');
assertEq(canManageUser(u1, null), false, 'null target → false');

// ============================================================================
// canAssignRole
// ============================================================================
origLog('\n── canAssignRole ─────────────────────────────────────────');

assertEq(canAssignRole(superUser, 'admin'), true, 'super_admin assigns admin');
assertEq(canAssignRole(superUser, 'super_admin'), false, 'super_admin does NOT assign super_admin');
assertEq(canAssignRole(admin, 'church_admin'), true, 'admin assigns church_admin');
assertEq(canAssignRole(admin, 'admin'), false, 'admin does NOT assign admin (equal)');
assertEq(canAssignRole(admin, 'super_admin'), false, 'admin does NOT assign super_admin');
assertEq(canAssignRole(churchAdmin, 'editor'), true, 'church_admin assigns editor');
assertEq(canAssignRole(editor, 'viewer'), true, 'editor assigns viewer');
assertEq(canAssignRole(editor, 'admin'), false, 'editor does NOT assign admin');
assertEq(canAssignRole(null, 'editor'), false, 'null user → false');
assertEq(canAssignRole({}, 'editor'), false, 'no role → false');

// ============================================================================
// getAssignableRoles
// ============================================================================
origLog('\n── getAssignableRoles ────────────────────────────────────');

assertEq(
  getAssignableRoles(superUser),
  ['admin', 'church_admin', 'priest', 'deacon', 'editor', 'viewer', 'guest'],
  'super_admin can assign all but super_admin (sorted desc)'
);
assertEq(
  getAssignableRoles(admin),
  ['church_admin', 'priest', 'deacon', 'editor', 'viewer', 'guest'],
  'admin can assign down to guest'
);
assertEq(
  getAssignableRoles(deacon),
  ['editor', 'viewer', 'guest'],
  'deacon can assign editor/viewer/guest'
);
assertEq(getAssignableRoles({ role: 'guest' }), [], 'guest can assign nothing');
assertEq(getAssignableRoles(null), [], 'null user → empty');
assertEq(getAssignableRoles({}), [], 'no role → empty');

// ============================================================================
// Convenience checkers
// ============================================================================
origLog('\n── Convenience checkers ──────────────────────────────────');

assertEq(isSuperAdmin(superUser), true, 'isSuperAdmin: super_admin');
assertEq(isSuperAdmin(admin), false, 'isSuperAdmin: admin → false (exact)');
assertEq(isSuperAdmin(null), false, 'isSuperAdmin: null → false');

assertEq(isAdmin(admin), true, 'isAdmin: admin');
assertEq(isAdmin(superUser), true, 'isAdmin: super_admin (hierarchy)');
assertEq(isAdmin(churchAdmin), false, 'isAdmin: church_admin → false');

assertEq(isChurchAdmin(churchAdmin), true, 'isChurchAdmin: church_admin');
assertEq(isChurchAdmin(admin), true, 'isChurchAdmin: admin (hierarchy)');
assertEq(isChurchAdmin(priest), false, 'isChurchAdmin: priest → false');

assertEq(isPriest(priest), true, 'isPriest: priest');
assertEq(isPriest(churchAdmin), true, 'isPriest: church_admin (hierarchy)');
assertEq(isPriest(deacon), false, 'isPriest: deacon → false');

assertEq(isDeacon(deacon), true, 'isDeacon: deacon');
assertEq(isDeacon(priest), true, 'isDeacon: priest (hierarchy)');
assertEq(isDeacon(editor), false, 'isDeacon: editor → false');

assertEq(isEditor(editor), true, 'isEditor: editor');
assertEq(isEditor(deacon), true, 'isEditor: deacon (hierarchy)');
assertEq(isEditor(viewer), false, 'isEditor: viewer → false');

assertEq(isViewer(viewer), true, 'isViewer: viewer');
assertEq(isViewer({ role: 'guest' }), false, 'isViewer: guest → false');

assertEq(isClergy(priest), true, 'isClergy: priest');
assertEq(isClergy(deacon), true, 'isClergy: deacon');
assertEq(isClergy(editor), false, 'isClergy: editor → false');
assertEq(isClergy(churchAdmin), true, 'isClergy: church_admin (hierarchy)');

// ============================================================================
// Permission checkers
// ============================================================================
origLog('\n── Permission checkers ───────────────────────────────────');

assertEq(canManageGlobalSystem(superUser), true, 'canManageGlobalSystem: super_admin');
assertEq(canManageGlobalSystem(admin), false, 'canManageGlobalSystem: admin → false');

assertEq(canManageGlobalConfig(admin), true, 'canManageGlobalConfig: admin');
assertEq(canManageGlobalConfig(churchAdmin), false, 'canManageGlobalConfig: church_admin → false');

assertEq(canManageChurches(admin), true, 'canManageChurches: admin');
assertEq(canManageChurches(churchAdmin), false, 'canManageChurches: church_admin → false');

assertEq(canManageUsers(churchAdmin), true, 'canManageUsers: church_admin');
assertEq(canManageUsers(priest), false, 'canManageUsers: priest → false');

assertEq(canManageRecords(deacon), true, 'canManageRecords: deacon');
assertEq(canManageRecords(editor), false, 'canManageRecords: editor → false');

assertEq(canViewDashboard(viewer), true, 'canViewDashboard: viewer');
assertEq(canViewDashboard({ role: 'guest' }), false, 'canViewDashboard: guest → false');

assertEq(canAccessOCR(editor), true, 'canAccessOCR: editor');
assertEq(canAccessOCR(viewer), false, 'canAccessOCR: viewer → false');

assertEq(canGenerateCertificates(deacon), true, 'canGenerateCertificates: deacon');
assertEq(canGenerateCertificates(editor), false, 'canGenerateCertificates: editor → false');

assertEq(canManageCalendar(priest), true, 'canManageCalendar: priest');
assertEq(canManageCalendar(deacon), false, 'canManageCalendar: deacon → false');

assertEq(canExportData(deacon), true, 'canExportData: deacon');
assertEq(canExportData(editor), false, 'canExportData: editor → false');

assertEq(canDeleteRecords(priest), true, 'canDeleteRecords: priest');
assertEq(canDeleteRecords(deacon), false, 'canDeleteRecords: deacon → false');

assertEq(canManageProvisioning(admin), true, 'canManageProvisioning: admin');
assertEq(canManageProvisioning(churchAdmin), false, 'canManageProvisioning: church_admin → false');

assertEq(canManageChurchSettings(churchAdmin), true, 'canManageChurchSettings: church_admin');
assertEq(canManageChurchSettings(priest), false, 'canManageChurchSettings: priest → false');

assertEq(canEditContent(editor), true, 'canEditContent: editor');
assertEq(canEditContent(viewer), false, 'canEditContent: viewer → false');

assertEq(canPerformSacraments(priest), true, 'canPerformSacraments: priest');
assertEq(canPerformSacraments(deacon), false, 'canPerformSacraments: deacon → false');

assertEq(canAssistSacraments(deacon), true, 'canAssistSacraments: deacon');
assertEq(canAssistSacraments(editor), false, 'canAssistSacraments: editor → false');

// ============================================================================
// getRoleInfo
// ============================================================================
origLog('\n── getRoleInfo ───────────────────────────────────────────');

const superInfo = getRoleInfo('super_admin');
assertEq(superInfo.label, 'Super Administrator', 'super_admin label');
assertEq(superInfo.scope, 'Global', 'super_admin scope');
assert(typeof superInfo.color === 'string' && superInfo.color.startsWith('#'), 'super_admin color is hex');

assertEq(getRoleInfo('admin').label, 'Administrator', 'admin label');
assertEq(getRoleInfo('admin').scope, 'Global', 'admin scope');
assertEq(getRoleInfo('church_admin').label, 'Church Administrator', 'church_admin label');
assertEq(getRoleInfo('church_admin').scope, 'Per-church', 'church_admin scope');
assertEq(getRoleInfo('priest').label, 'Priest', 'priest label');
assertEq(getRoleInfo('deacon').label, 'Deacon', 'deacon label');
assertEq(getRoleInfo('editor').label, 'Editor', 'editor label');
assertEq(getRoleInfo('viewer').label, 'Viewer', 'viewer label');
assertEq(getRoleInfo('guest').label, 'Guest', 'guest label');
assertEq(getRoleInfo('guest').scope, 'Public', 'guest scope = Public');

// Legacy role
assertEq(getRoleInfo('manager').label, 'Church Administrator', 'manager → church_admin info');
assertEq(getRoleInfo('clergy').label, 'Priest', 'clergy → priest info');

// Unknown → normalizeLegacyRole fallback to 'viewer', so getRoleInfo returns viewer info
assertEq(getRoleInfo('martian').label, 'Viewer', 'unknown → viewer info (via normalizeLegacyRole fallback)');

// ============================================================================
// validateRoleMigration
// ============================================================================
origLog('\n── validateRoleMigration ─────────────────────────────────');

assertEq(validateRoleMigration('manager', 'church_admin'), true, 'manager → church_admin valid');
assertEq(validateRoleMigration('clergy', 'priest'), true, 'clergy → priest valid');
assertEq(validateRoleMigration('user', 'editor'), true, 'user → editor valid');
assertEq(validateRoleMigration('admin', 'admin'), true, 'admin → admin valid (canonical)');
assertEq(validateRoleMigration('super_admin', 'super_admin'), true, 'super_admin → super_admin valid');

// Invalid migrations
assertEq(validateRoleMigration('manager', 'admin'), false, 'manager → admin INVALID');
assertEq(validateRoleMigration('clergy', 'deacon'), false, 'clergy → deacon INVALID');

// ============================================================================
// requireRole middleware
// ============================================================================
origLog('\n── requireRole middleware ────────────────────────────────');

function makeMockRes() {
  const res: any = {
    statusCode: null,
    body: null,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: any) { this.body = payload; return this; },
  };
  return res;
}

// No session → 401
{
  const mw = requireRole('admin');
  const req: any = { session: null };
  const res = makeMockRes();
  let nextCalled = false;
  quiet(() => mw(req, res, () => { nextCalled = true; }));
  assertEq(res.statusCode, 401, 'no session → 401');
  assertEq(res.body.code, 'NO_SESSION', 'no session → NO_SESSION code');
  assertEq(nextCalled, false, 'no session → next NOT called');
}

// Session without user → 401
{
  const mw = requireRole('admin');
  const req: any = { session: {} };
  const res = makeMockRes();
  let nextCalled = false;
  quiet(() => mw(req, res, () => { nextCalled = true; }));
  assertEq(res.statusCode, 401, 'session without user → 401');
  assertEq(nextCalled, false, 'session without user → next NOT called');
}

// User with sufficient role → next() called
{
  const mw = requireRole('editor');
  const req: any = { session: { user: { role: 'admin' } } };
  const res = makeMockRes();
  let nextCalled = false;
  quiet(() => mw(req, res, () => { nextCalled = true; }));
  assertEq(nextCalled, true, 'admin meets editor → next called');
  assertEq(res.statusCode, null, 'admin meets editor → no error response');
}

// User with insufficient role → 403
{
  const mw = requireRole('admin');
  const req: any = { session: { user: { role: 'editor' } } };
  const res = makeMockRes();
  let nextCalled = false;
  quiet(() => mw(req, res, () => { nextCalled = true; }));
  assertEq(res.statusCode, 403, 'editor < admin → 403');
  assertEq(res.body.code, 'INSUFFICIENT_ROLE', '403 → INSUFFICIENT_ROLE code');
  assertEq(res.body.current, 'editor', '403 body includes current role');
  assertEq(res.body.required, ['admin'], '403 body includes required (array)');
  assertEq(nextCalled, false, '403 → next NOT called');
}

// Array of allowed roles — user matches one
{
  const mw = requireRole(['priest', 'deacon']);
  const req: any = { session: { user: { role: 'priest' } } };
  const res = makeMockRes();
  let nextCalled = false;
  quiet(() => mw(req, res, () => { nextCalled = true; }));
  assertEq(nextCalled, true, 'priest in [priest, deacon] → next called');
}

// Array of allowed roles — user does not match (and not above either)
{
  const mw = requireRole(['admin', 'super_admin']);
  const req: any = { session: { user: { role: 'editor' } } };
  const res = makeMockRes();
  let nextCalled = false;
  quiet(() => mw(req, res, () => { nextCalled = true; }));
  assertEq(res.statusCode, 403, 'editor not in [admin, super_admin] → 403');
  assertEq(nextCalled, false, '→ next NOT called');
}

// Legacy role normalization in session user
{
  const mw = requireRole('priest');
  const req: any = { session: { user: { role: 'manager' } } };
  const res = makeMockRes();
  let nextCalled = false;
  quiet(() => mw(req, res, () => { nextCalled = true; }));
  assertEq(nextCalled, true, 'manager (=church_admin) meets priest → next called');
}

// Restore console
console.warn = origWarn;

// ============================================================================
// Summary
// ============================================================================
origLog(`\n──────────────────────────────────────────────────────────`);
origLog(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
