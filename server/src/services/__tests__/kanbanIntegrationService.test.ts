#!/usr/bin/env npx tsx
/**
 * Unit tests for services/kanbanIntegrationService.js (OMD-1212)
 *
 * Class-based in-memory Kanban service. Only external dep is the logger,
 * which we stub via require.cache to silence output. The constructor
 * fire-and-forgets `initialize()` → `setupDemoBoard()` which seeds 2 sample
 * cards; tests await a microtask then clear the card map for deterministic
 * starting state per scenario.
 *
 * Coverage:
 *   - constructor + initial demo-board seeding (2 cards)
 *   - createCard: happy path, defaults applied, shape
 *   - updateCard: happy + not found
 *   - deleteCard: happy + not found
 *   - getCard: happy (returns copy), not found → null
 *   - getAllCards: sort desc, boardId filter
 *   - getCardsByColumn
 *   - moveCard: valid + invalid column
 *   - searchCards: column, priority, tags, search text, taskId, combined
 *   - syncTaskToCard: existing cardId, find by taskId, create new
 *   - syncCardToTask: happy + not found
 *   - getBoardStatistics: totals, byColumn, byPriority, syncedTasks, recent
 *   - validateCardData: missing title, invalid column, invalid priority,
 *     valid → no errors
 *   - batchSyncTasks: mixed create/update + errors captured
 *   - cleanupOrphanedCards: deletes non-whitelisted taskId cards
 *   - exportBoardData: shape
 *   - getSyncHealth: healthy/fair/poor tiers
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

// ── logger stub ────────────────────────────────────────────────────────
const loggerStub = {
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {},
};
const loggerPath = require.resolve('../../utils/logger');
require.cache[loggerPath] = {
  id: loggerPath,
  filename: loggerPath,
  loaded: true,
  exports: loggerStub,
} as any;

const KanbanIntegrationService = require('../kanbanIntegrationService');

// Helper: create a fresh service instance with the card map cleared.
async function freshService(): Promise<any> {
  const svc = new KanbanIntegrationService();
  // Wait for fire-and-forget initialize() to complete
  await new Promise(r => setTimeout(r, 10));
  svc.cards.clear();
  svc.nextCardId = 1;
  return svc;
}

async function main() {

// ============================================================================
// constructor + demo board seeding
// ============================================================================
console.log('\n── constructor + demo board seeding ──────────────────────');

{
  const svc = new KanbanIntegrationService();
  assertEq(svc.boardId, 'dev', 'boardId = dev');
  assertEq(Object.keys(svc.columns).length, 4, '4 columns');
  assert(svc.columns['To Do'] === 'todo', 'To Do column');
  assert(svc.columns['In Progress'] === 'in_progress', 'In Progress column');
  assert(svc.columns['Review'] === 'review', 'Review column');
  assert(svc.columns['Done'] === 'done', 'Done column');
  assert(svc.cards instanceof Map, 'cards is Map');

  // Wait for initialize to complete
  await new Promise(r => setTimeout(r, 10));
  assertEq(svc.cards.size, 2, 'setupDemoBoard seeded 2 cards');
  const all = await svc.getAllCards();
  assert(all.some((c: any) => c.title === 'Setup Authentication System'), 'auth card seeded');
  assert(all.some((c: any) => c.title === 'Database Optimization'), 'db card seeded');
}

// ============================================================================
// createCard
// ============================================================================
console.log('\n── createCard ────────────────────────────────────────────');

{
  const svc = await freshService();
  const card = await svc.createCard({
    title: 'My task',
    description: 'Do the thing',
    column: 'In Progress',
    priority: 'high',
    tags: ['urgent'],
    assignee: 'alice',
    dueDate: '2026-05-01',
    taskId: 'TASK-1',
    sourceFile: '/tmp/src.md',
  });
  assertEq(card.id, 'card_1', 'first card id');
  assertEq(card.title, 'My task', 'title');
  assertEq(card.description, 'Do the thing', 'description');
  assertEq(card.column, 'In Progress', 'column');
  assertEq(card.priority, 'high', 'priority');
  assertEq(card.tags, ['urgent'], 'tags');
  assertEq(card.assignee, 'alice', 'assignee');
  assertEq(card.dueDate, '2026-05-01', 'dueDate');
  assertEq(card.boardId, 'dev', 'boardId');
  assertEq(card.metadata.taskId, 'TASK-1', 'metadata.taskId');
  assertEq(card.metadata.sourceFile, '/tmp/src.md', 'metadata.sourceFile');
  assert(card.created instanceof Date, 'created is Date');
  assert(card.updated instanceof Date, 'updated is Date');
  assertEq(svc.cards.size, 1, '1 card stored');
}

// Defaults
{
  const svc = await freshService();
  const card = await svc.createCard({ title: 'Bare' });
  assertEq(card.description, '', 'default description empty');
  assertEq(card.column, 'To Do', 'default column To Do');
  assertEq(card.priority, 'medium', 'default priority medium');
  assertEq(card.tags, [], 'default tags empty');
  assertEq(card.assignee, null, 'default assignee null');
  assertEq(card.dueDate, null, 'default dueDate null');
  assertEq(card.metadata.taskId, null, 'default taskId null');
}

// ID increments
{
  const svc = await freshService();
  const c1 = await svc.createCard({ title: 'one' });
  const c2 = await svc.createCard({ title: 'two' });
  const c3 = await svc.createCard({ title: 'three' });
  assertEq(c1.id, 'card_1', 'card_1');
  assertEq(c2.id, 'card_2', 'card_2');
  assertEq(c3.id, 'card_3', 'card_3');
}

// ============================================================================
// updateCard
// ============================================================================
console.log('\n── updateCard ────────────────────────────────────────────');

{
  const svc = await freshService();
  const card = await svc.createCard({ title: 'original' });
  // Sleep a bit so `updated` moves forward
  await new Promise(r => setTimeout(r, 5));
  const updated = await svc.updateCard(card.id, { title: 'changed', priority: 'critical' });
  assertEq(updated.title, 'changed', 'title updated');
  assertEq(updated.priority, 'critical', 'priority updated');
  assert(updated.updated.getTime() >= card.created.getTime(), 'updated advanced');
  assertEq(svc.cards.get(card.id).title, 'changed', 'stored updated');
}

// Not found
{
  const svc = await freshService();
  let caught: Error | null = null;
  try { await svc.updateCard('card_missing', { title: 'x' }); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'update missing throws');
  assert(caught !== null && /Card not found/.test(caught.message), 'error message');
}

// ============================================================================
// deleteCard
// ============================================================================
console.log('\n── deleteCard ────────────────────────────────────────────');

{
  const svc = await freshService();
  const card = await svc.createCard({ title: 'delete me' });
  const r = await svc.deleteCard(card.id);
  assertEq(r, true, 'delete returns true');
  assertEq(svc.cards.size, 0, 'card removed');
}

{
  const svc = await freshService();
  let caught: Error | null = null;
  try { await svc.deleteCard('nope'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'delete missing throws');
  assert(caught !== null && /Card not found/.test(caught.message), 'error message');
}

// ============================================================================
// getCard
// ============================================================================
console.log('\n── getCard ───────────────────────────────────────────────');

{
  const svc = await freshService();
  const card = await svc.createCard({ title: 'get me', tags: ['t'] });
  const fetched = await svc.getCard(card.id);
  assertEq(fetched.title, 'get me', 'fetched title');

  // Returned object is a copy — mutating it should not affect stored card
  fetched.title = 'mutated';
  const again = await svc.getCard(card.id);
  assertEq(again.title, 'get me', 'stored unchanged after mutation of copy');
}

{
  const svc = await freshService();
  const r = await svc.getCard('missing');
  assertEq(r, null, 'not found → null');
}

// ============================================================================
// getAllCards / getCardsByColumn
// ============================================================================
console.log('\n── getAllCards / getCardsByColumn ────────────────────────');

{
  const svc = await freshService();
  const a = await svc.createCard({ title: 'a', column: 'To Do' });
  await new Promise(r => setTimeout(r, 5));
  const b = await svc.createCard({ title: 'b', column: 'In Progress' });
  await new Promise(r => setTimeout(r, 5));
  const c = await svc.createCard({ title: 'c', column: 'To Do' });

  const all = await svc.getAllCards();
  assertEq(all.length, 3, '3 cards');
  // Newest first
  assertEq(all[0].title, 'c', 'newest first');
  assertEq(all[2].title, 'a', 'oldest last');

  const todo = await svc.getCardsByColumn('To Do');
  assertEq(todo.length, 2, '2 in To Do');
  assertEq(todo[0].title, 'c', 'col: newest first');

  const inProg = await svc.getCardsByColumn('In Progress');
  assertEq(inProg.length, 1, '1 in In Progress');
  assertEq(inProg[0].title, 'b', 'inProg card');
}

// ============================================================================
// moveCard
// ============================================================================
console.log('\n── moveCard ──────────────────────────────────────────────');

{
  const svc = await freshService();
  const card = await svc.createCard({ title: 'x', column: 'To Do' });
  const moved = await svc.moveCard(card.id, 'Review');
  assertEq(moved.column, 'Review', 'moved to Review');
}

{
  const svc = await freshService();
  const card = await svc.createCard({ title: 'x' });
  let caught: Error | null = null;
  try { await svc.moveCard(card.id, 'Invalid Col'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid column throws');
  assert(caught !== null && /Invalid column/.test(caught.message), 'error message');
}

// ============================================================================
// searchCards
// ============================================================================
console.log('\n── searchCards ───────────────────────────────────────────');

{
  const svc = await freshService();
  await svc.createCard({ title: 'Auth', description: 'OAuth2', column: 'To Do', priority: 'high', tags: ['auth', 'security'], taskId: 'T1' });
  await new Promise(r => setTimeout(r, 5));
  await svc.createCard({ title: 'DB tune', description: 'Indexes', column: 'In Progress', priority: 'medium', tags: ['db'], taskId: 'T2' });
  await new Promise(r => setTimeout(r, 5));
  await svc.createCard({ title: 'Docs', description: 'Write README', column: 'To Do', priority: 'low', tags: ['docs'] });

  const byCol = await svc.searchCards({ column: 'To Do' });
  assertEq(byCol.length, 2, 'column filter');

  const byPri = await svc.searchCards({ priority: 'high' });
  assertEq(byPri.length, 1, 'priority filter');
  assertEq(byPri[0].title, 'Auth', 'priority match');

  const byTag = await svc.searchCards({ tags: ['auth'] });
  assertEq(byTag.length, 1, 'single tag filter');

  const byMultiTag = await svc.searchCards({ tags: ['auth', 'docs'] });
  assertEq(byMultiTag.length, 2, 'multi tag filter (OR)');

  const bySearch = await svc.searchCards({ search: 'OAuth' });
  assertEq(bySearch.length, 1, 'text search (desc)');

  const bySearch2 = await svc.searchCards({ search: 'docs' });
  assertEq(bySearch2.length, 1, 'text search case-insensitive');

  const byTaskId = await svc.searchCards({ taskId: 'T1' });
  assertEq(byTaskId.length, 1, 'taskId filter');
  assertEq(byTaskId[0].title, 'Auth', 'taskId match');

  const combined = await svc.searchCards({ column: 'To Do', priority: 'high' });
  assertEq(combined.length, 1, 'combined filters');

  const empty = await svc.searchCards({});
  assertEq(empty.length, 3, 'empty criteria → all cards');
}

// ============================================================================
// syncTaskToCard
// ============================================================================
console.log('\n── syncTaskToCard ────────────────────────────────────────');

// Create new (no existing cardId, no matching taskId)
{
  const svc = await freshService();
  const result = await svc.syncTaskToCard({
    id: 'T-100',
    title: 'New task',
    description: 'desc',
    priority: 'medium',
    tags: ['x'],
    filename: '/t.md',
    kanban: { column: 'To Do' },
  });
  assertEq(result.title, 'New task', 'created card title');
  assertEq(result.metadata.taskId, 'T-100', 'taskId linked');
  assertEq(svc.cards.size, 1, '1 card');
}

// Find by taskId when kanban.cardId is missing
{
  const svc = await freshService();
  const existing = await svc.createCard({ title: 'Existing', taskId: 'T-200' });
  const result = await svc.syncTaskToCard({
    id: 'T-200',
    title: 'Updated title',
    description: 'new desc',
    priority: 'high',
    tags: [],
    filename: null,
    kanban: { column: 'Review' },
  });
  assertEq(result.id, existing.id, 'found and updated same card');
  assertEq(result.title, 'Updated title', 'title updated');
  assertEq(svc.cards.size, 1, 'still 1 card');
}

// Use explicit kanban.cardId
{
  const svc = await freshService();
  const existing = await svc.createCard({ title: 'Named' });
  const result = await svc.syncTaskToCard({
    id: 'T-300',
    title: 'Renamed',
    description: '',
    priority: 'low',
    tags: [],
    filename: null,
    kanban: { cardId: existing.id, column: 'Done' },
  });
  assertEq(result.id, existing.id, 'updates by explicit cardId');
  assertEq(result.title, 'Renamed', 'renamed');
}

// ============================================================================
// syncCardToTask
// ============================================================================
console.log('\n── syncCardToTask ────────────────────────────────────────');

{
  const svc = await freshService();
  const card = await svc.createCard({
    title: 'Card',
    description: 'desc',
    column: 'Review',
    priority: 'high',
    tags: ['a'],
    taskId: 'T-1',
  });
  const task = await svc.syncCardToTask(card.id);
  assertEq(task.id, 'T-1', 'task.id from metadata');
  assertEq(task.status, 'Review', 'task.status = card.column');
  assertEq(task.priority, 'high', 'priority');
  assertEq(task.kanban.cardId, card.id, 'kanban.cardId');
  assertEq(task.kanban.boardId, 'dev', 'kanban.boardId');
  assertEq(task.kanban.synced, true, 'synced flag');
}

// Not found
{
  const svc = await freshService();
  let caught: Error | null = null;
  try { await svc.syncCardToTask('nope'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on missing card');
}

// ============================================================================
// getBoardStatistics
// ============================================================================
console.log('\n── getBoardStatistics ────────────────────────────────────');

{
  const svc = await freshService();
  await svc.createCard({ title: 'a', column: 'To Do', priority: 'high', taskId: 'T-a' });
  await svc.createCard({ title: 'b', column: 'To Do', priority: 'medium' });
  await svc.createCard({ title: 'c', column: 'In Progress', priority: 'high', taskId: 'T-c' });
  await svc.createCard({ title: 'd', column: 'Done', priority: 'low' });

  const stats = await svc.getBoardStatistics();
  assertEq(stats.totalCards, 4, 'totalCards');
  assertEq(stats.byColumn['To Do'], 2, 'To Do count');
  assertEq(stats.byColumn['In Progress'], 1, 'In Progress count');
  assertEq(stats.byColumn['Done'], 1, 'Done count');
  assertEq(stats.byColumn['Review'], 0, 'Review count 0');
  assertEq(stats.byPriority.high, 2, 'high priority count');
  assertEq(stats.byPriority.medium, 1, 'medium priority count');
  assertEq(stats.byPriority.low, 1, 'low priority count');
  assertEq(stats.syncedTasks, 2, 'syncedTasks (those with taskId)');
  assert(Array.isArray(stats.recentActivity), 'recentActivity array');
  assert(stats.recentActivity.length <= 10, 'recentActivity capped at 10');
  assertEq(stats.recentActivity.length, 4, '4 recent activity entries');
}

// ============================================================================
// validateCardData
// ============================================================================
console.log('\n── validateCardData ──────────────────────────────────────');

{
  const svc = await freshService();

  assertEq(svc.validateCardData({ title: 'Valid' }), [], 'valid minimal');
  assertEq(
    svc.validateCardData({ title: 'Valid', column: 'To Do', priority: 'medium' }),
    [],
    'valid full'
  );

  const missing = svc.validateCardData({ title: '' });
  assert(missing.some((e: string) => /Title is required/.test(e)), 'empty title error');

  const whitespace = svc.validateCardData({ title: '   ' });
  assert(whitespace.some((e: string) => /Title is required/.test(e)), 'whitespace-only title error');

  const noTitle = svc.validateCardData({});
  assert(noTitle.some((e: string) => /Title is required/.test(e)), 'missing title error');

  const badCol = svc.validateCardData({ title: 'ok', column: 'Bogus' });
  assert(badCol.some((e: string) => /Invalid column/.test(e)), 'invalid column error');

  const badPri = svc.validateCardData({ title: 'ok', priority: 'ultra' });
  assert(badPri.some((e: string) => /Invalid priority/.test(e)), 'invalid priority error');

  const multi = svc.validateCardData({ title: '', column: 'X', priority: 'Y' });
  assertEq(multi.length, 3, 'multiple errors collected');
}

// ============================================================================
// batchSyncTasks
// ============================================================================
console.log('\n── batchSyncTasks ────────────────────────────────────────');

{
  const svc = await freshService();
  const tasks = [
    // New task — created
    {
      id: 'T1', title: 'one', description: '', priority: 'medium', tags: [], filename: null,
      kanban: { column: 'To Do' }
    },
    // Another new task
    {
      id: 'T2', title: 'two', description: '', priority: 'medium', tags: [], filename: null,
      kanban: { column: 'To Do' }
    },
  ];
  const r = await svc.batchSyncTasks(tasks);
  assertEq(r.created, 2, '2 created');
  assertEq(r.updated, 0, '0 updated');
  assertEq(r.errors.length, 0, 'no errors');
}

// With update path (pre-existing cardId)
{
  const svc = await freshService();
  const preCard = await svc.createCard({ title: 'pre', taskId: 'T-up' });
  const tasks = [
    {
      id: 'T-up', title: 'updated', description: '', priority: 'medium', tags: [], filename: null,
      kanban: { cardId: preCard.id, column: 'Review' }
    },
  ];
  const r = await svc.batchSyncTasks(tasks);
  assertEq(r.updated, 1, '1 updated');
  assertEq(r.created, 0, '0 created');
}

// With an error (task that breaks sync)
{
  const svc = await freshService();
  const tasks = [
    // Missing kanban key entirely → will throw inside syncTaskToCard
    { id: 'bad', title: 't', description: '', priority: 'medium', tags: [] },
    { id: 'ok', title: 'ok', description: '', priority: 'medium', tags: [], kanban: { column: 'To Do' } },
  ];
  const r = await svc.batchSyncTasks(tasks as any);
  assertEq(r.errors.length, 1, '1 error captured');
  assertEq(r.errors[0].taskId, 'bad', 'error taskId');
  assertEq(r.created, 1, '1 created (ok task)');
}

// ============================================================================
// cleanupOrphanedCards
// ============================================================================
console.log('\n── cleanupOrphanedCards ─────────────────────────────────');

{
  const svc = await freshService();
  await svc.createCard({ title: 'keep', taskId: 'T-keep' });
  await svc.createCard({ title: 'orphan1', taskId: 'T-orphan1' });
  await svc.createCard({ title: 'orphan2', taskId: 'T-orphan2' });
  await svc.createCard({ title: 'no-task' }); // no taskId → not orphaned

  const deleted = await svc.cleanupOrphanedCards(['T-keep']);
  assertEq(deleted, 2, '2 orphans deleted');
  assertEq(svc.cards.size, 2, '2 cards remain (keep + no-task)');
  const remaining = await svc.getAllCards();
  assert(remaining.some((c: any) => c.title === 'keep'), 'keep retained');
  assert(remaining.some((c: any) => c.title === 'no-task'), 'no-task retained');
}

// ============================================================================
// exportBoardData
// ============================================================================
console.log('\n── exportBoardData ───────────────────────────────────────');

{
  const svc = await freshService();
  await svc.createCard({ title: 'e1', column: 'To Do' });
  const exp = await svc.exportBoardData();
  assertEq(exp.boardId, 'dev', 'boardId in export');
  assert(exp.exportTimestamp instanceof Date, 'exportTimestamp is Date');
  assert(exp.statistics !== undefined, 'statistics included');
  assert(Array.isArray(exp.cards), 'cards array');
  assertEq(exp.cards.length, 1, '1 card exported');
  assertEq(Object.keys(exp.columns).length, 4, '4 columns exported');
}

// ============================================================================
// getSyncHealth
// ============================================================================
console.log('\n── getSyncHealth ─────────────────────────────────────────');

// 100% synced → healthy
{
  const svc = await freshService();
  await svc.createCard({ title: 'a', taskId: 'T1' });
  await svc.createCard({ title: 'b', taskId: 'T2' });
  const h = await svc.getSyncHealth();
  assertEq(h.totalCards, 2, 'totalCards');
  assertEq(h.syncedCards, 2, 'syncedCards');
  assertEq(h.status, 'healthy', 'status healthy at 100%');
}

// 50% synced → fair (boundary check: ratio 0.5 is NOT < 0.5, so fair)
{
  const svc = await freshService();
  await svc.createCard({ title: 'a', taskId: 'T1' });
  await svc.createCard({ title: 'b' }); // unsynced
  const h = await svc.getSyncHealth();
  assertEq(h.syncedCards, 1, 'syncedCards');
  // 0.5 < 0.8 → fair
  assertEq(h.status, 'fair', 'status fair at 50%');
}

// <50% → poor
{
  const svc = await freshService();
  await svc.createCard({ title: 'a', taskId: 'T1' });
  await svc.createCard({ title: 'b' });
  await svc.createCard({ title: 'c' });
  await svc.createCard({ title: 'd' });
  const h = await svc.getSyncHealth();
  // 1/4 = 0.25 < 0.5 → poor
  assertEq(h.status, 'poor', 'status poor at 25%');
}

// 80%+ → healthy
{
  const svc = await freshService();
  await svc.createCard({ title: 'a', taskId: 'T1' });
  await svc.createCard({ title: 'b', taskId: 'T2' });
  await svc.createCard({ title: 'c', taskId: 'T3' });
  await svc.createCard({ title: 'd', taskId: 'T4' });
  await svc.createCard({ title: 'e' });
  // 4/5 = 0.8 → NOT < 0.8, so healthy
  const h = await svc.getSyncHealth();
  assertEq(h.status, 'healthy', 'status healthy at 80%');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
