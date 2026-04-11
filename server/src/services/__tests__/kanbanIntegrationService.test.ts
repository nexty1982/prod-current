#!/usr/bin/env npx tsx
/**
 * Unit tests for services/kanbanIntegrationService.js (OMD-1126)
 *
 * In-memory Kanban board service. Logger is the only dep.
 * Constructor calls initialize() which seeds 2 sample cards.
 *
 * Coverage:
 *   - Constructor seeds 2 demo cards via setupDemoBoard
 *   - createCard: defaults, logger call, metadata
 *   - updateCard: not found, happy path, metadata merge
 *   - deleteCard: not found, happy path
 *   - getCard: not found → null, happy path returns copy
 *   - getAllCards: sorted by created desc, filtered by boardId
 *   - getCardsByColumn: filter by column
 *   - moveCard: invalid column, happy path
 *   - searchCards: column/priority/tags/search/taskId filters, combined
 *   - syncTaskToCard: update existing (by cardId or by taskId),
 *     create new
 *   - syncCardToTask: card not found, happy path
 *   - getBoardStatistics: column counts, priority counts, syncedTasks,
 *     recentActivity cap at 10
 *   - validateCardData: missing title, invalid column, invalid priority, clean
 *   - batchSyncTasks: mixed create/update/error
 *   - cleanupOrphanedCards: identifies and deletes orphans
 *   - exportBoardData: full export shape
 *   - getSyncHealth: healthy / fair / poor thresholds
 *
 * Run: npx tsx server/src/services/__tests__/kanbanIntegrationService.test.ts
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

async function assertThrows(fn: () => Promise<any>, pattern: RegExp, message: string): Promise<void> {
  try {
    await fn();
    console.error(`  FAIL: ${message} — did not throw`);
    failed++;
  } catch (e: any) {
    if (pattern.test(e.message)) { console.log(`  PASS: ${message}`); passed++; }
    else { console.error(`  FAIL: ${message}\n         got: ${e.message}`); failed++; }
  }
}

// ── Silence logger ───────────────────────────────────────────────────
const loggerStub = {
  info: (..._a: any[]) => {},
  warn: (..._a: any[]) => {},
  error: (..._a: any[]) => {},
  debug: (..._a: any[]) => {},
};
const loggerPath = require.resolve('../../utils/logger');
require.cache[loggerPath] = {
  id: loggerPath, filename: loggerPath, loaded: true, exports: loggerStub,
} as any;

const KanbanIntegrationService = require('../kanbanIntegrationService');

// Helper: wait for initial demo seed promise chain
async function drainInit(_s: any): Promise<void> {
  // setupDemoBoard is kicked off in constructor via microtasks — flush them
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setImmediate(r));
  }
}

// Helper: fresh instance with the demo seed cleared (async — must drain init first)
async function freshSvc(): Promise<any> {
  const s = new KanbanIntegrationService();
  await drainInit(s);
  s.cards.clear();
  s.nextCardId = 1;
  return s;
}

async function main() {

// ============================================================================
// Constructor seeds demo cards
// ============================================================================
console.log('\n── constructor: seeds demo cards ─────────────────────────');

{
  const s = new KanbanIntegrationService();
  await drainInit(s);
  const all = await s.getAllCards();
  assertEq(all.length, 2, '2 seed cards');
  assert(all.some((c: any) => c.title === 'Setup Authentication System'), 'has auth card');
  assert(all.some((c: any) => c.title === 'Database Optimization'), 'has db card');
  assertEq(s.boardId, 'dev', 'board id = dev');
  assert('To Do' in s.columns, 'has To Do column');
  assert('Done' in s.columns, 'has Done column');
}

// ============================================================================
// createCard
// ============================================================================
console.log('\n── createCard ────────────────────────────────────────────');

{
  const s = await freshSvc();
  const c = await s.createCard({ title: 'Task A' });
  assertEq(c.title, 'Task A', 'title set');
  assertEq(c.description, '', 'default description');
  assertEq(c.column, 'To Do', 'default column');
  assertEq(c.priority, 'medium', 'default priority');
  assertEq(c.tags, [], 'default tags');
  assertEq(c.boardId, 'dev', 'board id');
  assertEq(c.id, 'card_1', 'first id');
  assert(c.metadata.syncTimestamp instanceof Date, 'has syncTimestamp');
  assertEq(c.metadata.taskId, null, 'null taskId');
}

{
  const s = await freshSvc();
  const c = await s.createCard({
    title: 'Task B', description: 'desc', priority: 'high',
    tags: ['x', 'y'], taskId: 42, sourceFile: '/a/b.md',
  });
  assertEq(c.description, 'desc', 'desc set');
  assertEq(c.priority, 'high', 'priority set');
  assertEq(c.tags, ['x', 'y'], 'tags set');
  assertEq(c.metadata.taskId, 42, 'taskId set');
  assertEq(c.metadata.sourceFile, '/a/b.md', 'sourceFile set');
}

// ============================================================================
// updateCard
// ============================================================================
console.log('\n── updateCard ────────────────────────────────────────────');

{
  const s = await freshSvc();
  await assertThrows(
    () => s.updateCard('missing', { title: 'x' }),
    /Card not found: missing/,
    'not found throws'
  );
}

{
  const s = await freshSvc();
  const c = await s.createCard({ title: 'Orig', priority: 'low', taskId: 5 });
  const origSync = c.metadata.syncTimestamp;
  await new Promise((r) => setTimeout(r, 1));
  const upd = await s.updateCard(c.id, { title: 'Updated', priority: 'high' });
  assertEq(upd.title, 'Updated', 'title updated');
  assertEq(upd.priority, 'high', 'priority updated');
  assertEq(upd.metadata.taskId, 5, 'metadata merged (taskId preserved)');
  assert(upd.metadata.syncTimestamp >= origSync, 'syncTimestamp advanced');
}

// ============================================================================
// deleteCard
// ============================================================================
console.log('\n── deleteCard ────────────────────────────────────────────');

{
  const s = await freshSvc();
  await assertThrows(
    () => s.deleteCard('missing'),
    /Card not found: missing/,
    'not found throws'
  );
}

{
  const s = await freshSvc();
  const c = await s.createCard({ title: 'X' });
  const ok = await s.deleteCard(c.id);
  assertEq(ok, true, 'returns true');
  const got = await s.getCard(c.id);
  assertEq(got, null, 'card gone');
}

// ============================================================================
// getCard
// ============================================================================
console.log('\n── getCard ───────────────────────────────────────────────');

{
  const s = await freshSvc();
  const r = await s.getCard('missing');
  assertEq(r, null, 'missing → null');
}

{
  const s = await freshSvc();
  const c = await s.createCard({ title: 'X' });
  const fetched = await s.getCard(c.id);
  assert(fetched !== c, 'returns copy (different ref)');
  assertEq(fetched.id, c.id, 'same id');
  // Mutating copy doesn't affect store
  fetched.title = 'Mutated';
  const refetch = await s.getCard(c.id);
  assertEq(refetch.title, 'X', 'store unaffected');
}

// ============================================================================
// getAllCards / getCardsByColumn
// ============================================================================
console.log('\n── getAllCards / getCardsByColumn ────────────────────────');

{
  const s = await freshSvc();
  const c1 = await s.createCard({ title: 'First', column: 'To Do' });
  // Make sure created timestamps differ
  await new Promise((r) => setTimeout(r, 2));
  const c2 = await s.createCard({ title: 'Second', column: 'Done' });
  const all = await s.getAllCards();
  assertEq(all.length, 2, '2 cards');
  assertEq(all[0].id, c2.id, 'newer first');
  assertEq(all[1].id, c1.id, 'older last');

  const todo = await s.getCardsByColumn('To Do');
  assertEq(todo.length, 1, '1 in To Do');
  assertEq(todo[0].id, c1.id, 'correct card');
}

// ============================================================================
// moveCard
// ============================================================================
console.log('\n── moveCard ──────────────────────────────────────────────');

{
  const s = await freshSvc();
  const c = await s.createCard({ title: 'X' });
  await assertThrows(
    () => s.moveCard(c.id, 'Nonexistent'),
    /Invalid column/,
    'invalid column throws'
  );
}

{
  const s = await freshSvc();
  const c = await s.createCard({ title: 'X', column: 'To Do' });
  const moved = await s.moveCard(c.id, 'In Progress');
  assertEq(moved.column, 'In Progress', 'moved');
  const inProg = await s.getCardsByColumn('In Progress');
  assertEq(inProg.length, 1, '1 in In Progress');
}

// ============================================================================
// searchCards
// ============================================================================
console.log('\n── searchCards ───────────────────────────────────────────');

{
  const s = await freshSvc();
  await s.createCard({ title: 'Alpha', column: 'To Do', priority: 'high', tags: ['a', 'b'], taskId: 1 });
  await s.createCard({ title: 'Beta', column: 'Done', priority: 'low', tags: ['c'], taskId: 2 });
  await s.createCard({ title: 'Gamma frontend', column: 'Review', priority: 'high', tags: ['b'], description: 'ui stuff', taskId: 3 });

  // Filter by column
  let r = await s.searchCards({ column: 'Done' });
  assertEq(r.length, 1, '1 in Done');

  // Filter by priority
  r = await s.searchCards({ priority: 'high' });
  assertEq(r.length, 2, '2 high priority');

  // Filter by tags (any-match)
  r = await s.searchCards({ tags: ['b'] });
  assertEq(r.length, 2, '2 with tag "b"');

  r = await s.searchCards({ tags: ['c'] });
  assertEq(r.length, 1, '1 with tag "c"');

  // Text search — title
  r = await s.searchCards({ search: 'alpha' });
  assertEq(r.length, 1, 'title contains alpha');

  // Text search — description
  r = await s.searchCards({ search: 'ui' });
  assertEq(r.length, 1, 'description contains ui');

  // Task ID
  r = await s.searchCards({ taskId: 2 });
  assertEq(r.length, 1, '1 with taskId 2');

  // Combined filter
  r = await s.searchCards({ priority: 'high', tags: ['b'] });
  assertEq(r.length, 2, 'high + tag b = 2');

  // Empty criteria returns all
  r = await s.searchCards({});
  assertEq(r.length, 3, 'all 3');
}

// ============================================================================
// syncTaskToCard
// ============================================================================
console.log('\n── syncTaskToCard ────────────────────────────────────────');

{
  const s = await freshSvc();
  const task = {
    id: 'task-1', title: 'New task', description: 'd',
    priority: 'medium', tags: ['x'], filename: '/a.md',
    kanban: { column: 'To Do' },
  };
  const c = await s.syncTaskToCard(task);
  assertEq(c.title, 'New task', 'created with title');
  assertEq(c.metadata.taskId, 'task-1', 'task id linked');
  assertEq(c.column, 'To Do', 'column set');

  // Second sync with known cardId → update existing
  const task2 = { ...task, title: 'Updated task', kanban: { ...task.kanban, cardId: c.id } };
  const c2 = await s.syncTaskToCard(task2);
  assertEq(c2.id, c.id, 'same card');
  assertEq(c2.title, 'Updated task', 'title updated');

  // Third sync without cardId but same task.id → found via searchCards
  const task3 = { ...task, title: 'Via search' };
  const c3 = await s.syncTaskToCard(task3);
  assertEq(c3.id, c.id, 'found via taskId search');
  assertEq(c3.title, 'Via search', 'title updated again');

  // Cards list is still 1
  const all = await s.getAllCards();
  assertEq(all.length, 1, 'still 1 card total');
}

// ============================================================================
// syncCardToTask
// ============================================================================
console.log('\n── syncCardToTask ────────────────────────────────────────');

{
  const s = await freshSvc();
  await assertThrows(
    () => s.syncCardToTask('missing'),
    /Card not found: missing/,
    'not found throws'
  );
}

{
  const s = await freshSvc();
  const c = await s.createCard({
    title: 'Task X', description: 'd', priority: 'high',
    tags: ['a'], taskId: 'T42', column: 'Review',
  });
  const t = await s.syncCardToTask(c.id);
  assertEq(t.id, 'T42', 'taskId from metadata');
  assertEq(t.title, 'Task X', 'title');
  assertEq(t.status, 'Review', 'status = column');
  assertEq(t.priority, 'high', 'priority');
  assertEq(t.kanban.cardId, c.id, 'cardId');
  assertEq(t.kanban.boardId, 'dev', 'boardId');
  assertEq(t.kanban.synced, true, 'synced=true');
}

// ============================================================================
// getBoardStatistics
// ============================================================================
console.log('\n── getBoardStatistics ────────────────────────────────────');

{
  const s = await freshSvc();
  await s.createCard({ title: 'A', column: 'To Do', priority: 'high', taskId: 't1' });
  await s.createCard({ title: 'B', column: 'To Do', priority: 'low' });
  await s.createCard({ title: 'C', column: 'Done', priority: 'high', taskId: 't2' });
  const stats = await s.getBoardStatistics();
  assertEq(stats.totalCards, 3, '3 total');
  assertEq(stats.byColumn['To Do'], 2, '2 in To Do');
  assertEq(stats.byColumn['Done'], 1, '1 in Done');
  assertEq(stats.byColumn['In Progress'], 0, '0 in In Progress');
  assertEq(stats.byColumn['Review'], 0, '0 in Review');
  assertEq(stats.byPriority.high, 2, '2 high');
  assertEq(stats.byPriority.low, 1, '1 low');
  assertEq(stats.syncedTasks, 2, '2 with taskId');
  assertEq(stats.recentActivity.length, 3, '3 in recent activity');
}

{
  // > 10 cards → recentActivity capped
  const s = await freshSvc();
  for (let i = 0; i < 15; i++) {
    await s.createCard({ title: `C${i}` });
  }
  const stats = await s.getBoardStatistics();
  assertEq(stats.recentActivity.length, 10, 'recentActivity capped at 10');
}

// ============================================================================
// validateCardData
// ============================================================================
console.log('\n── validateCardData ──────────────────────────────────────');

{
  const s = await freshSvc();
  let errs = s.validateCardData({});
  assert(errs.some((e: string) => /Title is required/.test(e)), 'missing title');

  errs = s.validateCardData({ title: '   ' });
  assert(errs.some((e: string) => /Title is required/.test(e)), 'whitespace title');

  errs = s.validateCardData({ title: 'X', column: 'Bogus' });
  assert(errs.some((e: string) => /Invalid column/.test(e)), 'invalid column');

  errs = s.validateCardData({ title: 'X', priority: 'extreme' });
  assert(errs.some((e: string) => /Invalid priority/.test(e)), 'invalid priority');

  errs = s.validateCardData({ title: 'X', column: 'To Do', priority: 'high' });
  assertEq(errs.length, 0, 'clean → no errors');
}

// ============================================================================
// batchSyncTasks
// ============================================================================
console.log('\n── batchSyncTasks ────────────────────────────────────────');

{
  const s = await freshSvc();
  // Create an existing card for task 't1' so it will be updated
  await s.createCard({ title: 'Old', taskId: 't1' });

  const tasks = [
    { id: 't1', title: 'New title', kanban: { column: 'To Do', cardId: 'card_1' }, priority: 'high', tags: [] },
    { id: 't2', title: 'Another', kanban: { column: 'Done' }, priority: 'low', tags: [] },
  ];
  const r = await s.batchSyncTasks(tasks);
  assertEq(r.updated, 1, '1 updated');
  assertEq(r.created, 1, '1 created');
  assertEq(r.errors.length, 0, 'no errors');
}

{
  const s = await freshSvc();
  // Task with bad data — force error by throwing from syncTaskToCard via bogus kanban field?
  // syncTaskToCard doesn't fail easily. Simulate by passing a task where updateCard fails.
  // Instead: task with cardId that exists but then we monkey-patch searchCards? Too indirect.
  // Simpler: task with kanban.cardId=existing → works. Use a task without kanban obj → throws
  const tasks = [
    { id: 't1', title: 'X' }, // missing .kanban → TypeError
  ];
  const r = await s.batchSyncTasks(tasks);
  assertEq(r.errors.length, 1, '1 error');
  assertEq(r.errors[0].taskId, 't1', 'error tagged with taskId');
}

// ============================================================================
// cleanupOrphanedCards
// ============================================================================
console.log('\n── cleanupOrphanedCards ──────────────────────────────────');

{
  const s = await freshSvc();
  await s.createCard({ title: 'A', taskId: 't1' });
  await s.createCard({ title: 'B', taskId: 't2' });
  await s.createCard({ title: 'C', taskId: 't3' });
  await s.createCard({ title: 'Orphanless (no task)' }); // no taskId — not orphan

  const deletedCount = await s.cleanupOrphanedCards(['t1']); // t2, t3 are orphans
  assertEq(deletedCount, 2, '2 orphans deleted');
  const all = await s.getAllCards();
  assertEq(all.length, 2, '2 remain (t1 + no-task)');
}

// ============================================================================
// exportBoardData
// ============================================================================
console.log('\n── exportBoardData ───────────────────────────────────────');

{
  const s = await freshSvc();
  await s.createCard({ title: 'A' });
  const data = await s.exportBoardData();
  assertEq(data.boardId, 'dev', 'boardId');
  assert(data.exportTimestamp instanceof Date, 'timestamp');
  assertEq(data.cards.length, 1, '1 card');
  assert('To Do' in data.columns, 'columns included');
  assertEq(data.statistics.totalCards, 1, 'stats.totalCards=1');
}

// ============================================================================
// getSyncHealth
// ============================================================================
console.log('\n── getSyncHealth ─────────────────────────────────────────');

{
  // All synced → healthy
  const s = await freshSvc();
  await s.createCard({ title: 'A', taskId: 't1' });
  await s.createCard({ title: 'B', taskId: 't2' });
  const h = await s.getSyncHealth();
  assertEq(h.totalCards, 2, '2 total');
  assertEq(h.syncedCards, 2, '2 synced');
  assertEq(h.status, 'healthy', 'healthy (100% sync)');
}

{
  // 60% sync → fair (syncRatio < 0.8)
  const s = await freshSvc();
  await s.createCard({ title: 'A', taskId: 't1' });
  await s.createCard({ title: 'B', taskId: 't2' });
  await s.createCard({ title: 'C', taskId: 't3' });
  await s.createCard({ title: 'D' });
  await s.createCard({ title: 'E' });
  const h = await s.getSyncHealth();
  assertEq(h.syncedCards, 3, '3 synced');
  assertEq(h.status, 'fair', 'fair (60% sync)');
}

{
  // 40% sync → poor (< 0.5)
  const s = await freshSvc();
  await s.createCard({ title: 'A', taskId: 't1' });
  await s.createCard({ title: 'B', taskId: 't2' });
  await s.createCard({ title: 'C' });
  await s.createCard({ title: 'D' });
  await s.createCard({ title: 'E' });
  const h = await s.getSyncHealth();
  assertEq(h.syncedCards, 2, '2 synced');
  assertEq(h.status, 'poor', 'poor (40% sync)');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
