#!/usr/bin/env npx tsx
/**
 * Unit tests for services/kanbanIntegrationService.js (OMD-1062)
 *
 * In-memory Kanban board with CRUD, search, move, task sync, batch sync,
 * orphan cleanup, statistics, and sync health.
 *
 * Only external dep: ../utils/logger — stubbed to no-op via require.cache.
 *
 * Note: constructor calls initialize() → setupDemoBoard() which seeds 2
 * cards. Those microtask-async createCard calls complete on the next tick,
 * so tests either await a microtask or clear the cards Map before asserting.
 *
 * Coverage:
 *   - constructor + demo seeding
 *   - createCard: defaults, full metadata, tags/assignee/dueDate/taskId/sourceFile
 *   - updateCard: existing + not-found throw + metadata merge + updated ts
 *   - deleteCard: existing + not-found throw
 *   - getCard: returns copy + null on missing
 *   - getAllCards: board filter + newest-first sort
 *   - getCardsByColumn: column filter + sort
 *   - moveCard: valid + invalid column throws
 *   - searchCards: column/priority/tags/text/taskId filters + compound
 *   - syncTaskToCard: new, existing by cardId, found by taskId, assignee
 *   - syncCardToTask: happy + not-found
 *   - getBoardStatistics: totals, byColumn, byPriority, recentActivity, syncedTasks
 *   - validateCardData: title missing, invalid column, invalid priority, valid
 *   - batchSyncTasks: creates/updates/errors breakdown
 *   - cleanupOrphanedCards: deletes orphans only
 *   - exportBoardData: shape
 *   - getSyncHealth: healthy/fair/poor thresholds
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

// ─── Stub logger ─────────────────────────────────────────────────────────────
const loggerStub = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

const loggerPath = require.resolve('../../utils/logger');
require.cache[loggerPath] = {
  id: loggerPath, filename: loggerPath, loaded: true, exports: loggerStub,
} as any;

const KanbanIntegrationService = require('../kanbanIntegrationService');

// Helper: create a fresh instance with cleared demo cards
async function fresh() {
  const svc = new KanbanIntegrationService();
  // Let demo seeding microtasks settle
  await new Promise(r => setImmediate(r));
  // Clear for deterministic state
  svc.cards.clear();
  svc.nextCardId = 1;
  return svc;
}

async function main() {

// ============================================================================
// constructor + demo seeding
// ============================================================================
console.log('\n── constructor + demo seeding ────────────────────────────');

{
  const svc = new KanbanIntegrationService();
  assertEq(svc.boardId, 'dev', 'boardId default');
  assert(svc.cards instanceof Map, 'cards is a Map');
  assertEq(Object.keys(svc.columns).length, 4, '4 columns');
  assert('To Do' in svc.columns, 'To Do column');
  assert('Done' in svc.columns, 'Done column');

  // Wait for async demo seeding
  await new Promise(r => setImmediate(r));
  assertEq(svc.cards.size, 2, 'demo seeded 2 cards');
  const titles = Array.from(svc.cards.values()).map((c: any) => c.title);
  assert(titles.includes('Setup Authentication System'), 'auth demo card');
  assert(titles.includes('Database Optimization'), 'database demo card');
}

// ============================================================================
// createCard
// ============================================================================
console.log('\n── createCard ────────────────────────────────────────────');

{
  const svc = await fresh();
  const card = await svc.createCard({
    title: 'First Card',
    description: 'Test desc',
    column: 'To Do',
    priority: 'high',
    tags: ['test', 'example'],
    assignee: 'alice',
    dueDate: '2026-05-01',
    taskId: 'TASK-1',
    sourceFile: '/tmp/task-1.md',
  });

  assertEq(card.id, 'card_1', 'id generated');
  assertEq(card.title, 'First Card', 'title');
  assertEq(card.description, 'Test desc', 'description');
  assertEq(card.column, 'To Do', 'column');
  assertEq(card.priority, 'high', 'priority');
  assertEq(card.tags, ['test', 'example'], 'tags');
  assertEq(card.assignee, 'alice', 'assignee');
  assertEq(card.dueDate, '2026-05-01', 'dueDate');
  assertEq(card.boardId, 'dev', 'boardId');
  assertEq(card.metadata.taskId, 'TASK-1', 'metadata.taskId');
  assertEq(card.metadata.sourceFile, '/tmp/task-1.md', 'metadata.sourceFile');
  assert(card.created instanceof Date, 'created is Date');
  assert(card.updated instanceof Date, 'updated is Date');
  assertEq(svc.cards.size, 1, 'card stored in map');
}

// Defaults when optional fields missing
{
  const svc = await fresh();
  const card = await svc.createCard({ title: 'Minimal' });
  assertEq(card.description, '', 'default empty description');
  assertEq(card.column, 'To Do', 'default column');
  assertEq(card.priority, 'medium', 'default priority');
  assertEq(card.tags, [], 'default empty tags');
  assertEq(card.assignee, null, 'null assignee');
  assertEq(card.dueDate, null, 'null dueDate');
  assertEq(card.metadata.taskId, null, 'null taskId');
  assertEq(card.metadata.sourceFile, null, 'null sourceFile');
}

// nextCardId increments
{
  const svc = await fresh();
  const c1 = await svc.createCard({ title: 'a' });
  const c2 = await svc.createCard({ title: 'b' });
  const c3 = await svc.createCard({ title: 'c' });
  assertEq(c1.id, 'card_1', 'card_1');
  assertEq(c2.id, 'card_2', 'card_2');
  assertEq(c3.id, 'card_3', 'card_3');
}

// ============================================================================
// updateCard
// ============================================================================
console.log('\n── updateCard ────────────────────────────────────────────');

{
  const svc = await fresh();
  const card = await svc.createCard({ title: 'Orig', priority: 'low' });
  const origTime = card.created;

  // Small delay so updated timestamp is different
  await new Promise(r => setTimeout(r, 2));

  const updated = await svc.updateCard(card.id, { title: 'New', priority: 'high' });
  assertEq(updated.title, 'New', 'title updated');
  assertEq(updated.priority, 'high', 'priority updated');
  assertEq(updated.created.getTime(), origTime.getTime(), 'created preserved');
  assert(updated.updated.getTime() >= origTime.getTime(), 'updated timestamp refreshed');
  assert(updated.metadata.syncTimestamp instanceof Date, 'metadata.syncTimestamp refreshed');
}

// Not-found → throws
{
  const svc = await fresh();
  let caught: Error | null = null;
  try { await svc.updateCard('bogus', { title: 'X' }); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'not found throws');
  assert(caught !== null && caught.message.includes('Card not found'), 'error message');
}

// Metadata merge preserves existing keys
{
  const svc = await fresh();
  const card = await svc.createCard({ title: 'X', taskId: 'TASK-99' });
  await svc.updateCard(card.id, { description: 'new desc' });
  const updated = svc.cards.get(card.id);
  assertEq(updated.metadata.taskId, 'TASK-99', 'metadata.taskId preserved');
}

// ============================================================================
// deleteCard
// ============================================================================
console.log('\n── deleteCard ────────────────────────────────────────────');

{
  const svc = await fresh();
  const c = await svc.createCard({ title: 'ToDelete' });
  const result = await svc.deleteCard(c.id);
  assertEq(result, true, 'returns true');
  assertEq(svc.cards.size, 0, 'removed from map');
}

{
  const svc = await fresh();
  let caught: Error | null = null;
  try { await svc.deleteCard('bogus'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'not found throws');
}

// ============================================================================
// getCard
// ============================================================================
console.log('\n── getCard ───────────────────────────────────────────────');

{
  const svc = await fresh();
  const c = await svc.createCard({ title: 'X' });
  const found = await svc.getCard(c.id);
  assertEq(found.id, c.id, 'found by id');
  // Returns a copy (spread) — but top-level only, nested refs shared
  assert(found !== svc.cards.get(c.id), 'returns a new object (copy)');

  const missing = await svc.getCard('bogus');
  assertEq(missing, null, 'null on miss');
}

// ============================================================================
// getAllCards
// ============================================================================
console.log('\n── getAllCards ───────────────────────────────────────────');

{
  const svc = await fresh();
  const a = await svc.createCard({ title: 'A' });
  await new Promise(r => setTimeout(r, 2));
  const b = await svc.createCard({ title: 'B' });
  await new Promise(r => setTimeout(r, 2));
  const c = await svc.createCard({ title: 'C' });

  const all = await svc.getAllCards();
  assertEq(all.length, 3, '3 cards');
  // Newest first (C → B → A)
  assertEq(all[0].title, 'C', 'newest first');
  assertEq(all[2].title, 'A', 'oldest last');
}

// Board filter: cards with different boardId excluded
{
  const svc = await fresh();
  await svc.createCard({ title: 'Ours' });
  // Inject a card with different boardId directly
  svc.cards.set('other', { id: 'other', boardId: 'other-board', title: 'Other', created: new Date(), updated: new Date(), column: 'To Do', priority: 'medium', tags: [], metadata: {} });

  const all = await svc.getAllCards();
  assertEq(all.length, 1, 'only our board returned');
  assertEq(all[0].title, 'Ours', 'correct card');
}

// ============================================================================
// getCardsByColumn
// ============================================================================
console.log('\n── getCardsByColumn ──────────────────────────────────────');

{
  const svc = await fresh();
  await svc.createCard({ title: 'T1', column: 'To Do' });
  await svc.createCard({ title: 'T2', column: 'To Do' });
  await svc.createCard({ title: 'I1', column: 'In Progress' });

  const todo = await svc.getCardsByColumn('To Do');
  assertEq(todo.length, 2, '2 in To Do');
  assert(todo.every((c: any) => c.column === 'To Do'), 'all To Do');

  const inProg = await svc.getCardsByColumn('In Progress');
  assertEq(inProg.length, 1, '1 in progress');

  const done = await svc.getCardsByColumn('Done');
  assertEq(done.length, 0, 'none done');
}

// ============================================================================
// moveCard
// ============================================================================
console.log('\n── moveCard ──────────────────────────────────────────────');

{
  const svc = await fresh();
  const c = await svc.createCard({ title: 'Movable', column: 'To Do' });
  const moved = await svc.moveCard(c.id, 'In Progress');
  assertEq(moved.column, 'In Progress', 'column updated');

  // Invalid column
  let caught: Error | null = null;
  try { await svc.moveCard(c.id, 'Bogus'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'invalid column throws');
  assert(caught !== null && caught.message.includes('Invalid column'), 'error message');
}

// ============================================================================
// searchCards
// ============================================================================
console.log('\n── searchCards ───────────────────────────────────────────');

async function seedSearchFixtures(svc: any) {
  await svc.createCard({ title: 'Auth System', description: 'OAuth2 setup', column: 'To Do', priority: 'high', tags: ['auth', 'security'], taskId: 'TASK-1' });
  await svc.createCard({ title: 'Database Fix', description: 'Index tuning', column: 'In Progress', priority: 'medium', tags: ['database'], taskId: 'TASK-2' });
  await svc.createCard({ title: 'Login Form', description: 'Frontend auth UI', column: 'Review', priority: 'high', tags: ['auth', 'ui'], taskId: 'TASK-3' });
  await svc.createCard({ title: 'Logging', description: 'Add structured logs', column: 'Done', priority: 'low', tags: ['ops'] });
}

// Column filter
{
  const svc = await fresh();
  await seedSearchFixtures(svc);
  const r = await svc.searchCards({ column: 'To Do' });
  assertEq(r.length, 1, '1 in To Do');
  assertEq(r[0].title, 'Auth System', 'correct card');
}

// Priority filter
{
  const svc = await fresh();
  await seedSearchFixtures(svc);
  const r = await svc.searchCards({ priority: 'high' });
  assertEq(r.length, 2, '2 high priority');
}

// Tag filter (any match)
{
  const svc = await fresh();
  await seedSearchFixtures(svc);
  const r = await svc.searchCards({ tags: ['auth'] });
  assertEq(r.length, 2, 'both auth-tagged');
}

// Empty tags array → no filter
{
  const svc = await fresh();
  await seedSearchFixtures(svc);
  const r = await svc.searchCards({ tags: [] });
  assertEq(r.length, 4, 'empty tags → all 4');
}

// Text search
{
  const svc = await fresh();
  await seedSearchFixtures(svc);
  const r = await svc.searchCards({ search: 'auth' });
  // Matches title "Auth System" and description "Frontend auth UI"
  assertEq(r.length, 2, '2 matches for "auth"');
}

// Text search case-insensitive
{
  const svc = await fresh();
  await seedSearchFixtures(svc);
  const r = await svc.searchCards({ search: 'DATABASE' });
  assertEq(r.length, 1, 'case insensitive');
}

// taskId filter
{
  const svc = await fresh();
  await seedSearchFixtures(svc);
  const r = await svc.searchCards({ taskId: 'TASK-2' });
  assertEq(r.length, 1, 'found by taskId');
  assertEq(r[0].title, 'Database Fix', 'correct card');
}

// Compound filter
{
  const svc = await fresh();
  await seedSearchFixtures(svc);
  const r = await svc.searchCards({ priority: 'high', tags: ['auth'] });
  assertEq(r.length, 2, '2 high priority + auth-tagged');
}

// No criteria → all
{
  const svc = await fresh();
  await seedSearchFixtures(svc);
  const r = await svc.searchCards({});
  assertEq(r.length, 4, 'all 4');
}

// ============================================================================
// syncTaskToCard
// ============================================================================
console.log('\n── syncTaskToCard ────────────────────────────────────────');

// Create new card
{
  const svc = await fresh();
  const card = await svc.syncTaskToCard({
    id: 'TASK-100',
    title: 'New Task',
    description: 'Desc',
    priority: 'high',
    tags: ['sync'],
    filename: '/tmp/task-100.md',
    kanban: { cardId: null, column: 'To Do' },
  });
  assertEq(card.title, 'New Task', 'title set');
  assertEq(card.metadata.taskId, 'TASK-100', 'taskId stored');
  assertEq(svc.cards.size, 1, '1 card in map');
}

// Update via existing cardId
{
  const svc = await fresh();
  const c1 = await svc.createCard({ title: 'Old', taskId: 'TASK-1' });
  const updated = await svc.syncTaskToCard({
    id: 'TASK-1',
    title: 'Updated',
    description: '',
    priority: 'medium',
    tags: [],
    filename: 'f',
    kanban: { cardId: c1.id, column: 'In Progress' },
  });
  assertEq(updated.id, c1.id, 'same card id');
  assertEq(updated.title, 'Updated', 'title updated');
  assertEq(svc.cards.size, 1, 'no duplicate');
}

// Found by taskId (no cardId given)
{
  const svc = await fresh();
  const c1 = await svc.createCard({ title: 'Orig', taskId: 'TASK-9' });
  const updated = await svc.syncTaskToCard({
    id: 'TASK-9',
    title: 'Found',
    description: '',
    priority: 'medium',
    tags: [],
    filename: 'f',
    kanban: { cardId: null, column: 'To Do' },
  });
  assertEq(updated.id, c1.id, 'reuses existing card by taskId');
  assertEq(updated.title, 'Found', 'updated title');
  assertEq(svc.cards.size, 1, 'no duplicate');
}

// ============================================================================
// syncCardToTask
// ============================================================================
console.log('\n── syncCardToTask ────────────────────────────────────────');

{
  const svc = await fresh();
  const c = await svc.createCard({
    title: 'Card',
    description: 'Desc',
    column: 'In Progress',
    priority: 'high',
    tags: ['a'],
    taskId: 'TASK-50',
  });
  const task = await svc.syncCardToTask(c.id);
  assertEq(task.id, 'TASK-50', 'taskId from metadata');
  assertEq(task.title, 'Card', 'title');
  assertEq(task.status, 'In Progress', 'status = column');
  assertEq(task.priority, 'high', 'priority');
  assertEq(task.tags, ['a'], 'tags');
  assertEq(task.kanban.cardId, c.id, 'kanban.cardId');
  assertEq(task.kanban.synced, true, 'synced flag');
  assert(task.kanban.lastSync instanceof Date, 'lastSync Date');
}

// Not found → throws
{
  const svc = await fresh();
  let caught: Error | null = null;
  try { await svc.syncCardToTask('bogus'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'not found throws');
}

// ============================================================================
// getBoardStatistics
// ============================================================================
console.log('\n── getBoardStatistics ────────────────────────────────────');

{
  const svc = await fresh();
  await svc.createCard({ title: 'A', column: 'To Do', priority: 'high', taskId: 'T1' });
  await new Promise(r => setTimeout(r, 2));
  await svc.createCard({ title: 'B', column: 'To Do', priority: 'low' });
  await new Promise(r => setTimeout(r, 2));
  await svc.createCard({ title: 'C', column: 'In Progress', priority: 'high', taskId: 'T2' });
  await new Promise(r => setTimeout(r, 2));
  await svc.createCard({ title: 'D', column: 'Done', priority: 'medium', taskId: 'T3' });

  const stats = await svc.getBoardStatistics();
  assertEq(stats.totalCards, 4, '4 total');
  assertEq(stats.byColumn['To Do'], 2, '2 in To Do');
  assertEq(stats.byColumn['In Progress'], 1, '1 in progress');
  assertEq(stats.byColumn['Done'], 1, '1 done');
  assertEq(stats.byColumn['Review'], 0, '0 review');
  assertEq(stats.byPriority['high'], 2, '2 high');
  assertEq(stats.byPriority['low'], 1, '1 low');
  assertEq(stats.byPriority['medium'], 1, '1 medium');
  assertEq(stats.syncedTasks, 3, '3 synced');
  assert(stats.recentActivity.length === 4, 'recent activity includes all (<10)');
  assertEq(stats.recentActivity[0].title, 'D', 'most recent first');
}

// ============================================================================
// validateCardData
// ============================================================================
console.log('\n── validateCardData ──────────────────────────────────────');

{
  const svc = await fresh();

  // Missing title
  let errors = svc.validateCardData({});
  assert(errors.includes('Title is required'), 'missing title');

  // Whitespace title
  errors = svc.validateCardData({ title: '   ' });
  assert(errors.includes('Title is required'), 'whitespace title');

  // Invalid column
  errors = svc.validateCardData({ title: 'X', column: 'Bogus' });
  assert(errors.some((e: string) => e.includes('Invalid column')), 'invalid column');

  // Invalid priority
  errors = svc.validateCardData({ title: 'X', priority: 'urgent' });
  assert(errors.some((e: string) => e.includes('Invalid priority')), 'invalid priority');

  // Valid
  errors = svc.validateCardData({ title: 'X', column: 'To Do', priority: 'high' });
  assertEq(errors.length, 0, 'valid data → no errors');
}

// ============================================================================
// batchSyncTasks
// ============================================================================
console.log('\n── batchSyncTasks ────────────────────────────────────────');

{
  const svc = await fresh();
  // Pre-create one card for TASK-EXIST
  const existing = await svc.createCard({ title: 'Existing', taskId: 'TASK-EXIST' });

  const tasks = [
    { id: 'TASK-NEW-1', title: 'New 1', description: '', priority: 'high', tags: [], filename: 'f', kanban: { cardId: null, column: 'To Do' } },
    { id: 'TASK-NEW-2', title: 'New 2', description: '', priority: 'medium', tags: [], filename: 'f', kanban: { cardId: null, column: 'To Do' } },
    { id: 'TASK-EXIST', title: 'Updated', description: '', priority: 'low', tags: [], filename: 'f', kanban: { cardId: existing.id, column: 'Done' } },
  ];

  const result = await svc.batchSyncTasks(tasks);
  assertEq(result.created, 2, '2 created');
  assertEq(result.updated, 1, '1 updated');
  assertEq(result.errors.length, 0, 'no errors');
}

// With an error (task missing required kanban.cardId field → no — let's force one by using a task that breaks during sync)
{
  const svc = await fresh();
  // Make syncTaskToCard throw for task with title null via getCard lookup issue
  // Simpler: provide a task with cardId pointing to a card we'll delete mid-way... easier: just provide a task that ends up calling updateCard with a bogus card.
  // Since updateCard throws on not found, supply kanban.cardId = 'bogus'
  const tasks = [
    { id: 'TASK-OK', title: 'OK', description: '', priority: 'medium', tags: [], filename: 'f', kanban: { cardId: null, column: 'To Do' } },
    { id: 'TASK-BROKEN', title: 'Broken', description: '', priority: 'medium', tags: [], filename: 'f', kanban: { cardId: 'bogus-id', column: 'To Do' } },
  ];
  // The second task: cardId is provided, getCard returns null, then search by taskId returns nothing → creates a new card → succeeds
  // So that path doesn't throw. Let's instead break by using undefined task (no kanban field)
  const brokenTasks = [
    { id: 'TASK-OK', title: 'OK', description: '', priority: 'medium', tags: [], filename: 'f', kanban: { cardId: null, column: 'To Do' } },
    { id: 'TASK-NOKANBAN', title: 'NoKanban' } as any,  // no kanban field → throws on access
  ];

  const result = await svc.batchSyncTasks(brokenTasks);
  assertEq(result.created, 1, '1 created');
  assertEq(result.errors.length, 1, '1 error');
  assertEq(result.errors[0].taskId, 'TASK-NOKANBAN', 'error has taskId');
}

// ============================================================================
// cleanupOrphanedCards
// ============================================================================
console.log('\n── cleanupOrphanedCards ─────────────────────────────────');

{
  const svc = await fresh();
  await svc.createCard({ title: 'Valid', taskId: 'TASK-1' });
  await svc.createCard({ title: 'Orphan1', taskId: 'TASK-X' });
  await svc.createCard({ title: 'Orphan2', taskId: 'TASK-Y' });
  await svc.createCard({ title: 'NoTask' });  // metadata.taskId is null — NOT orphan

  const count = await svc.cleanupOrphanedCards(['TASK-1', 'TASK-2']);
  assertEq(count, 2, '2 orphans deleted');
  assertEq(svc.cards.size, 2, '2 cards remain');
  const remaining = Array.from(svc.cards.values()).map((c: any) => c.title);
  assert(remaining.includes('Valid'), 'Valid remains');
  assert(remaining.includes('NoTask'), 'NoTask (no taskId) remains');
}

// ============================================================================
// exportBoardData
// ============================================================================
console.log('\n── exportBoardData ───────────────────────────────────────');

{
  const svc = await fresh();
  await svc.createCard({ title: 'A', taskId: 'T1' });
  await svc.createCard({ title: 'B' });

  const data = await svc.exportBoardData();
  assertEq(data.boardId, 'dev', 'boardId');
  assert(data.exportTimestamp instanceof Date, 'timestamp Date');
  assertEq(data.cards.length, 2, '2 cards');
  assertEq(data.statistics.totalCards, 2, 'statistics included');
  assertEq(Object.keys(data.columns).length, 4, 'columns included');
}

// ============================================================================
// getSyncHealth
// ============================================================================
console.log('\n── getSyncHealth ─────────────────────────────────────────');

// Healthy: ≥80% synced
{
  const svc = await fresh();
  await svc.createCard({ title: 'A', taskId: 'T1' });
  await svc.createCard({ title: 'B', taskId: 'T2' });
  await svc.createCard({ title: 'C', taskId: 'T3' });
  await svc.createCard({ title: 'D', taskId: 'T4' });
  await svc.createCard({ title: 'E' });

  const h = await svc.getSyncHealth();
  assertEq(h.totalCards, 5, '5 total');
  assertEq(h.syncedCards, 4, '4 synced');
  assertEq(h.status, 'healthy', '80% → healthy');
}

// Fair: 50% ≤ ratio < 80%
{
  const svc = await fresh();
  await svc.createCard({ title: 'A', taskId: 'T1' });
  await svc.createCard({ title: 'B', taskId: 'T2' });
  await svc.createCard({ title: 'C' });
  await svc.createCard({ title: 'D' });

  const h = await svc.getSyncHealth();
  assertEq(h.syncedCards, 2, '2 synced');
  assertEq(h.status, 'fair', '50% → fair');
}

// Poor: <50%
{
  const svc = await fresh();
  await svc.createCard({ title: 'A', taskId: 'T1' });
  await svc.createCard({ title: 'B' });
  await svc.createCard({ title: 'C' });
  await svc.createCard({ title: 'D' });

  const h = await svc.getSyncHealth();
  assertEq(h.syncedCards, 1, '1 synced');
  assertEq(h.status, 'poor', '25% → poor');
}

// recentlyUpdated & staleSyncs
{
  const svc = await fresh();
  const c = await svc.createCard({ title: 'Recent', taskId: 'T1' });
  const h = await svc.getSyncHealth();
  assert(h.recentlyUpdated >= 1, 'freshly created = recently updated');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
