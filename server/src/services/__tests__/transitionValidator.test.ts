#!/usr/bin/env npx tsx
/**
 * Unit tests for services/transitionValidator.js (OMD-964)
 *
 * Pure logic: validates SDLC status transitions, prerequisites, and
 * actor-ownership. One external dep (`./repoService`) used only for async
 * repo-level checks — stubbed via require.cache.
 *
 * Coverage:
 *   - STATUSES / STATUS_LABELS / STATUS_OWNERSHIP / ALLOWED_TRANSITIONS exports
 *   - validateTransition:
 *       · same-status no-op
 *       · invalid from/to status
 *       · matrix enforcement (each known transition)
 *       · prerequisite errors (in_progress needs repo_target,
 *         self_review/review/staging need github_branch,
 *         blocked needs _blocked_reason)
 *       · actor-ownership enforcement (agent owns in_progress/self_review,
 *         admin owns backlog/review/staging)
 *       · blocked/cancelled escape hatch (any actor)
 *       · repo check: branch-not-on-remote blocks review/done
 *       · repo check: dirty tree blocks done
 *       · skipRepoChecks bypass
 *       · git errors swallowed (logged, not thrown)
 *   - getValidNextStatuses (unfiltered + actor-filtered)
 *   - resolveActorType (explicit body > source field > default admin)
 *
 * Run: npx tsx server/src/services/__tests__/transitionValidator.test.ts
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

// ── repoService stub ─────────────────────────────────────────────────
let repoExistsRemote = true;
let repoSnapshot: any = { current_branch: 'main', is_clean: true };
let repoExistsThrows = false;
let repoSnapshotThrows = false;

const repoServiceStub = {
  branchExistsRemote: (_repo: string, _branch: string) => {
    if (repoExistsThrows) throw new Error('git failed');
    return repoExistsRemote;
  },
  getSnapshot: (_repo: string) => {
    if (repoSnapshotThrows) throw new Error('git snapshot failed');
    return repoSnapshot;
  },
};

const repoPath = require.resolve('../repoService');
require.cache[repoPath] = {
  id: repoPath,
  filename: repoPath,
  loaded: true,
  exports: repoServiceStub,
} as any;

// Silence warnings from repo check try/catch
const origWarn = console.warn;
function quiet() { console.warn = () => {}; }
function loud() { console.warn = origWarn; }

const {
  STATUSES,
  STATUS_LABELS,
  STATUS_OWNERSHIP,
  ALLOWED_TRANSITIONS,
  validateTransition,
  getValidNextStatuses,
  resolveActorType,
} = require('../transitionValidator');

async function main() {

// ============================================================================
// Exports / constants
// ============================================================================
console.log('\n── exports ───────────────────────────────────────────────');

assertEq(STATUSES.length, 9, '9 canonical statuses');
assert(STATUSES.includes('draft'), 'draft included');
assert(STATUSES.includes('done'), 'done included');
assert(STATUSES.includes('cancelled'), 'cancelled included');

assertEq(STATUS_LABELS.in_progress, 'In Progress', 'in_progress label');
assertEq(STATUS_LABELS.self_review, 'Self Review', 'self_review label');
assertEq(STATUS_LABELS.draft, 'Draft', 'draft label');

assertEq(STATUS_OWNERSHIP.in_progress.owner, 'agent', 'in_progress owned by agent');
assertEq(STATUS_OWNERSHIP.in_progress.exit_by, 'agent', 'in_progress exit_by agent');
assertEq(STATUS_OWNERSHIP.self_review.exit_by, 'agent', 'self_review exit_by agent');
assertEq(STATUS_OWNERSHIP.backlog.exit_by, 'admin', 'backlog exit_by admin');
assertEq(STATUS_OWNERSHIP.review.exit_by, 'admin', 'review exit_by admin');
assertEq(STATUS_OWNERSHIP.staging.exit_by, 'admin', 'staging exit_by admin');
assertEq(STATUS_OWNERSHIP.blocked.exit_by, 'any', 'blocked exit_by any');

assert(ALLOWED_TRANSITIONS.backlog.includes('in_progress'), 'backlog → in_progress');
assert(ALLOWED_TRANSITIONS.in_progress.includes('self_review'), 'in_progress → self_review');
assert(ALLOWED_TRANSITIONS.self_review.includes('review'), 'self_review → review');
assert(ALLOWED_TRANSITIONS.review.includes('staging'), 'review → staging');
assert(ALLOWED_TRANSITIONS.staging.includes('done'), 'staging → done');
assert(ALLOWED_TRANSITIONS.done.includes('backlog'), 'done → backlog (reopening)');
assert(!ALLOWED_TRANSITIONS.backlog.includes('review'), 'backlog NOT → review (skip)');
assert(!ALLOWED_TRANSITIONS.backlog.includes('done'), 'backlog NOT → done (skip)');

// ============================================================================
// validateTransition: same-status no-op
// ============================================================================
console.log('\n── validateTransition: same-status no-op ─────────────────');

{
  const r = await validateTransition('in_progress', 'in_progress', {}, { skipRepoChecks: true });
  assertEq(r.valid, true, 'same status → valid');
  assertEq(r.errors, [], 'no errors');
  assertEq(r.fromLabel, 'In Progress', 'fromLabel');
  assertEq(r.toLabel, 'In Progress', 'toLabel');
}

// ============================================================================
// validateTransition: invalid statuses
// ============================================================================
console.log('\n── validateTransition: invalid status values ─────────────');

{
  const r = await validateTransition('nonsense', 'in_progress', {}, { skipRepoChecks: true });
  assertEq(r.valid, false, 'invalid from → invalid');
  assert(r.errors[0].includes('Invalid current status'), 'invalid from msg');
}

{
  const r = await validateTransition('backlog', 'nonsense', {}, { skipRepoChecks: true });
  assertEq(r.valid, false, 'invalid to → invalid');
  assert(r.errors[0].includes('Invalid target status'), 'invalid to msg');
}

// ============================================================================
// validateTransition: matrix enforcement
// ============================================================================
console.log('\n── validateTransition: matrix enforcement ────────────────');

// Disallowed transition: backlog → review (skip)
{
  const r = await validateTransition(
    'backlog', 'review',
    { repo_target: 'orthodoxmetrics', github_branch: 'x' },
    { skipRepoChecks: true, actorType: 'admin' }
  );
  assertEq(r.valid, false, 'backlog → review blocked');
  assert(r.errors[0].includes('Cannot transition'), 'transition error msg');
  assert(r.errors[0].includes('Backlog'), 'msg mentions Backlog');
  assert(r.errors[0].includes('Review'), 'msg mentions Review');
}

// Disallowed: draft → in_progress (must go through backlog)
{
  const r = await validateTransition(
    'draft', 'in_progress', { repo_target: 'orthodoxmetrics' },
    { skipRepoChecks: true, actorType: 'admin' }
  );
  assertEq(r.valid, false, 'draft → in_progress blocked');
}

// Allowed: draft → backlog
{
  const r = await validateTransition('draft', 'backlog', {}, { skipRepoChecks: true, actorType: 'admin' });
  assertEq(r.valid, true, 'draft → backlog allowed');
}

// Allowed: backlog → in_progress (with admin + repo_target)
{
  const r = await validateTransition(
    'backlog', 'in_progress',
    { repo_target: 'orthodoxmetrics' },
    { skipRepoChecks: true, actorType: 'admin' }
  );
  assertEq(r.valid, true, 'backlog → in_progress (admin, repo set) allowed');
}

// Done → backlog (reopening)
{
  const r = await validateTransition('done', 'backlog', {}, { skipRepoChecks: true, actorType: 'admin' });
  assertEq(r.valid, true, 'done → backlog reopening allowed');
}

// Cancelled → backlog (reopening)
{
  const r = await validateTransition('cancelled', 'backlog', {}, { skipRepoChecks: true, actorType: 'admin' });
  assertEq(r.valid, true, 'cancelled → backlog reopening allowed');
}

// ============================================================================
// validateTransition: item prerequisites
// ============================================================================
console.log('\n── validateTransition: item prerequisites ────────────────');

// in_progress requires repo_target
{
  const r = await validateTransition(
    'backlog', 'in_progress',
    { /* missing repo_target */ },
    { skipRepoChecks: true, actorType: 'admin' }
  );
  assertEq(r.valid, false, 'in_progress without repo_target blocked');
  assert(r.errors.some((e: string) => e.includes('repo_target')), 'repo_target error');
}

// self_review requires github_branch
{
  const r = await validateTransition(
    'in_progress', 'self_review',
    { repo_target: 'orthodoxmetrics' /* no branch */ },
    { skipRepoChecks: true, actorType: 'agent' }
  );
  assertEq(r.valid, false, 'self_review without branch blocked');
  assert(r.errors.some((e: string) => e.includes('no branch')), 'no branch error');
}

// review requires github_branch
{
  const r = await validateTransition(
    'self_review', 'review',
    { repo_target: 'orthodoxmetrics' },
    { skipRepoChecks: true, actorType: 'admin' }
  );
  assertEq(r.valid, false, 'review without branch blocked');
}

// staging requires github_branch
{
  const r = await validateTransition(
    'review', 'staging',
    { repo_target: 'orthodoxmetrics' },
    { skipRepoChecks: true, actorType: 'admin' }
  );
  assertEq(r.valid, false, 'staging without branch blocked');
}

// blocked requires _blocked_reason
{
  const r = await validateTransition(
    'in_progress', 'blocked',
    { repo_target: 'orthodoxmetrics', github_branch: 'x' },
    { skipRepoChecks: true, actorType: 'admin' }
  );
  assertEq(r.valid, false, 'blocked without reason blocked');
  assert(r.errors.some((e: string) => e.includes('blocked_reason')), 'blocked_reason error');
}

// blocked WITH reason is allowed
{
  const r = await validateTransition(
    'in_progress', 'blocked',
    { repo_target: 'orthodoxmetrics', github_branch: 'x', _blocked_reason: 'waiting on API' },
    { skipRepoChecks: true, actorType: 'admin' }
  );
  assertEq(r.valid, true, 'blocked with reason allowed');
}

// ============================================================================
// validateTransition: actor-ownership enforcement
// ============================================================================
console.log('\n── validateTransition: actor ownership ───────────────────');

// Agent can exit in_progress → self_review
{
  const r = await validateTransition(
    'in_progress', 'self_review',
    { repo_target: 'orthodoxmetrics', github_branch: 'x' },
    { skipRepoChecks: true, actorType: 'agent' }
  );
  assertEq(r.valid, true, 'agent exits in_progress → self_review');
}

// Admin CANNOT exit in_progress → self_review (agent-owned)
{
  const r = await validateTransition(
    'in_progress', 'self_review',
    { repo_target: 'orthodoxmetrics', github_branch: 'x' },
    { skipRepoChecks: true, actorType: 'admin' }
  );
  assertEq(r.valid, false, 'admin blocked from in_progress → self_review');
  assert(r.errors.some((e: string) => e.includes('agent') || e.includes('AI')), 'owner msg mentions agent');
}

// Agent CANNOT exit backlog → in_progress (admin-owned)
{
  const r = await validateTransition(
    'backlog', 'in_progress',
    { repo_target: 'orthodoxmetrics' },
    { skipRepoChecks: true, actorType: 'agent' }
  );
  assertEq(r.valid, false, 'agent blocked from backlog → in_progress');
  assert(r.errors.some((e: string) => e.includes('super_admin') || e.includes('admin')), 'owner msg mentions admin');
}

// Agent CANNOT exit review → staging (admin-owned)
{
  const r = await validateTransition(
    'review', 'staging',
    { repo_target: 'orthodoxmetrics', github_branch: 'x' },
    { skipRepoChecks: true, actorType: 'agent' }
  );
  assertEq(r.valid, false, 'agent blocked from review → staging');
}

// blocked escape hatch: any actor can mark blocked (with reason)
{
  const r1 = await validateTransition(
    'in_progress', 'blocked',
    { repo_target: 'r', github_branch: 'x', _blocked_reason: 'r' },
    { skipRepoChecks: true, actorType: 'admin' }
  );
  assertEq(r1.valid, true, 'admin can block from in_progress');

  const r2 = await validateTransition(
    'backlog', 'blocked',
    { _blocked_reason: 'r' },
    { skipRepoChecks: true, actorType: 'agent' }
  );
  assertEq(r2.valid, true, 'agent can block from backlog');
}

// cancelled escape hatch: any actor can cancel
{
  const r1 = await validateTransition(
    'in_progress', 'cancelled',
    { repo_target: 'r', github_branch: 'x' },
    { skipRepoChecks: true, actorType: 'admin' }
  );
  assertEq(r1.valid, true, 'admin can cancel in_progress');

  const r2 = await validateTransition(
    'backlog', 'cancelled', {},
    { skipRepoChecks: true, actorType: 'agent' }
  );
  assertEq(r2.valid, true, 'agent can cancel backlog');
}

// Default actorType (no opts) = admin
{
  const r = await validateTransition(
    'in_progress', 'self_review',
    { repo_target: 'r', github_branch: 'x' },
    { skipRepoChecks: true } // no actorType
  );
  assertEq(r.valid, false, 'default actorType=admin cannot exit in_progress');
}

// ============================================================================
// validateTransition: repo-level checks
// ============================================================================
console.log('\n── validateTransition: repo checks ───────────────────────');

// self_review → review: branch must be on remote
// Note: self_review is agent-owned, so actorType must be 'agent' to pass ownership
repoExistsRemote = false;
{
  const r = await validateTransition(
    'self_review', 'review',
    { repo_target: 'orthodoxmetrics', github_branch: 'feat/x' },
    { actorType: 'agent' } // repo checks NOT skipped
  );
  assertEq(r.valid, false, 'review blocked when branch not on remote');
  assert(r.errors.some((e: string) => e.includes('not been pushed')), 'not-pushed error');
}

// Branch on remote: review passes
repoExistsRemote = true;
{
  const r = await validateTransition(
    'self_review', 'review',
    { repo_target: 'orthodoxmetrics', github_branch: 'feat/x' },
    { actorType: 'agent' }
  );
  assertEq(r.valid, true, 'review passes when branch on remote');
}

// staging → done: dirty tree blocks
repoExistsRemote = true;
repoSnapshot = { current_branch: 'feat/x', is_clean: false };
{
  const r = await validateTransition(
    'staging', 'done',
    { repo_target: 'orthodoxmetrics', github_branch: 'feat/x' },
    { actorType: 'admin' }
  );
  assertEq(r.valid, false, 'done blocked on dirty tree (matching branch)');
  assert(r.errors.some((e: string) => e.includes('dirty')), 'dirty tree error');
}

// Clean tree + on remote: done passes
repoSnapshot = { current_branch: 'feat/x', is_clean: true };
{
  const r = await validateTransition(
    'staging', 'done',
    { repo_target: 'orthodoxmetrics', github_branch: 'feat/x' },
    { actorType: 'admin' }
  );
  assertEq(r.valid, true, 'done passes with clean tree + remote');
}

// Done check: dirty tree on DIFFERENT branch → does NOT block
repoSnapshot = { current_branch: 'other-branch', is_clean: false };
{
  const r = await validateTransition(
    'staging', 'done',
    { repo_target: 'orthodoxmetrics', github_branch: 'feat/x' },
    { actorType: 'admin' }
  );
  assertEq(r.valid, true, 'done passes — dirty on non-matching branch');
}

// Done check: branch not on remote → blocks
repoSnapshot = { current_branch: 'feat/x', is_clean: true };
repoExistsRemote = false;
{
  const r = await validateTransition(
    'staging', 'done',
    { repo_target: 'orthodoxmetrics', github_branch: 'feat/x' },
    { actorType: 'admin' }
  );
  assertEq(r.valid, false, 'done blocked when branch not on remote');
  assert(r.errors.some((e: string) => e.includes('not been pushed')), 'not-pushed error for done');
}
repoExistsRemote = true;

// skipRepoChecks bypasses repo checks
repoExistsRemote = false;
{
  const r = await validateTransition(
    'self_review', 'review',
    { repo_target: 'orthodoxmetrics', github_branch: 'feat/x' },
    { skipRepoChecks: true, actorType: 'agent' }
  );
  assertEq(r.valid, true, 'skipRepoChecks bypasses remote check');
}
repoExistsRemote = true;

// Repo check skipped when repo_target or github_branch missing
{
  const r = await validateTransition(
    'self_review', 'review',
    { github_branch: 'feat/x' /* no repo_target */ },
    { actorType: 'agent' }
  );
  assertEq(r.valid, true, 'repo check skipped when repo_target missing');
}

// Git errors in repo check are swallowed (not thrown, not added to errors)
repoExistsThrows = true;
quiet();
{
  const r = await validateTransition(
    'self_review', 'review',
    { repo_target: 'orthodoxmetrics', github_branch: 'feat/x' },
    { actorType: 'agent' }
  );
  loud();
  assertEq(r.valid, true, 'git error swallowed — transition allowed');
}
repoExistsThrows = false;

// ============================================================================
// getValidNextStatuses
// ============================================================================
console.log('\n── getValidNextStatuses ──────────────────────────────────');

// Unfiltered (no actor) — all from backlog
{
  const nexts = getValidNextStatuses('backlog');
  assertEq(nexts.length, 3, 'backlog has 3 next options');
  const names = nexts.map((n: any) => n.status).sort();
  assertEq(names, ['blocked', 'cancelled', 'in_progress'], 'backlog options');
}

// With actorType=admin on backlog
{
  const nexts = getValidNextStatuses('backlog', 'admin');
  const names = nexts.map((n: any) => n.status).sort();
  assertEq(names, ['blocked', 'cancelled', 'in_progress'], 'admin from backlog');
}

// With actorType=agent on backlog — agent cannot exit backlog normally,
// but can still blocked/cancelled (escape hatch)
{
  const nexts = getValidNextStatuses('backlog', 'agent');
  const names = nexts.map((n: any) => n.status).sort();
  assertEq(names, ['blocked', 'cancelled'], 'agent from backlog only escape hatches');
}

// Agent on in_progress: all options (agent owns it)
{
  const nexts = getValidNextStatuses('in_progress', 'agent');
  const names = nexts.map((n: any) => n.status).sort();
  assertEq(names, ['backlog', 'blocked', 'cancelled', 'self_review'], 'agent from in_progress');
}

// Admin on in_progress: only escape hatches (agent-owned)
{
  const nexts = getValidNextStatuses('in_progress', 'admin');
  const names = nexts.map((n: any) => n.status).sort();
  assertEq(names, ['blocked', 'cancelled'], 'admin from in_progress escape hatches only');
}

// Labels present
{
  const nexts = getValidNextStatuses('backlog');
  const ip = nexts.find((n: any) => n.status === 'in_progress');
  assertEq(ip.label, 'In Progress', 'in_progress label present');
}

// ============================================================================
// resolveActorType
// ============================================================================
console.log('\n── resolveActorType ──────────────────────────────────────');

// Explicit agent in body
assertEq(resolveActorType({ actor_type: 'agent' }, {}), 'agent', 'explicit agent');

// Explicit admin in body
assertEq(resolveActorType({ actor_type: 'admin' }, {}), 'admin', 'explicit admin');

// Body.source = agent (no explicit actor_type)
assertEq(resolveActorType({ source: 'agent' }, {}), 'agent', 'body.source=agent');

// Item.source=agent, no actor_type in body → 'admin' (UI overriding agent item)
assertEq(
  resolveActorType({}, { source: 'agent' }),
  'admin',
  'item.source=agent + no actor_type → admin (UI override)'
);

// Default: no body, no item → 'admin'
assertEq(resolveActorType({}, {}), 'admin', 'default admin');

// Explicit actor_type trumps item.source
assertEq(
  resolveActorType({ actor_type: 'agent' }, { source: 'admin' }),
  'agent',
  'explicit beats item.source'
);

// null body handled
assertEq(resolveActorType(null as any, { source: 'agent' }), 'admin', 'null body, item agent → admin');

// Random actor_type value → falls through to default
assertEq(resolveActorType({ actor_type: 'robot' }, {}), 'admin', 'unknown actor_type → admin');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
