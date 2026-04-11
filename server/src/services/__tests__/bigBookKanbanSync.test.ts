#!/usr/bin/env npx tsx
/**
 * Unit tests for services/bigBookKanbanSync.js (OMD-1134)
 *
 * Covers BigBookKanbanSync orchestration: full bidirectional sync,
 * single-task/card sync, conflict detection/resolution, health scoring,
 * log management, metadata updates, and export.
 *
 * Strategy:
 *   - Stub TaskDiscoveryService + KanbanIntegrationService with fakes
 *     that expose scriptable state and track calls
 *   - Stub dbLogger and utils/logger via require.cache
 *   - Monkey-patch fs.promises with a virtual filesystem
 *
 * NOTE on known bug: `detectSyncConflicts` references
 * `this.comparTaskAndCard` (typo) but the method is defined as
 * `compareTaskAndCard`. The typo path is only hit when a conflict is
 * actually detected. We test it via the throw behavior.
 *
 * Run: npx tsx src/services/__tests__/bigBookKanbanSync.test.ts
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

async function assertThrows(
  fn: () => Promise<any>,
  match: RegExp,
  message: string
): Promise<void> {
  try {
    await fn();
    console.error(`  FAIL: ${message} (no throw)`);
    failed++;
  } catch (e: any) {
    if (match.test(e.message)) { console.log(`  PASS: ${message}`); passed++; }
    else {
      console.error(`  FAIL: ${message}\n         expected match: ${match}\n         actual: ${e.message}`);
      failed++;
    }
  }
}

// ── Logger stubs ──────────────────────────────────────────────────────
const loggerPath = require.resolve('../../utils/logger');
require.cache[loggerPath] = {
  id: loggerPath,
  filename: loggerPath,
  loaded: true,
  exports: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
} as any;

const dbLoggerPath = require.resolve('../../utils/dbLogger');
const dbLoggerCalls: any[] = [];
require.cache[dbLoggerPath] = {
  id: dbLoggerPath,
  filename: dbLoggerPath,
  loaded: true,
  exports: {
    info: async (...args: any[]) => { dbLoggerCalls.push({ level: 'INFO', args }); },
    warn: async (...args: any[]) => { dbLoggerCalls.push({ level: 'WARN', args }); },
    error: async (...args: any[]) => { dbLoggerCalls.push({ level: 'ERROR', args }); },
    debug: async (...args: any[]) => { dbLoggerCalls.push({ level: 'DEBUG', args }); },
  },
} as any;

// ── Virtual fs ────────────────────────────────────────────────────────
type Entry = { type: 'file' | 'dir'; content?: string };
const vfs = new Map<string, Entry>();

function vfsReset(): void { vfs.clear(); }
function vfsAddDir(p: string): void { vfs.set(p, { type: 'dir' }); }
function vfsAddFile(p: string, content: string): void {
  const parts = p.split('/').filter(Boolean);
  let acc = '';
  for (let i = 0; i < parts.length - 1; i++) {
    acc += '/' + parts[i];
    if (!vfs.has(acc)) vfs.set(acc, { type: 'dir' });
  }
  vfs.set(p, { type: 'file', content });
}
function enoent(p: string): Error {
  const e: any = new Error(`ENOENT: ${p}`);
  e.code = 'ENOENT';
  return e;
}

const fsRaw = require('fs');
const origPromises = { ...fsRaw.promises };

fsRaw.promises.readFile = async (p: string, _enc?: any): Promise<string> => {
  const entry = vfs.get(p);
  if (!entry || entry.type !== 'file') throw enoent(p);
  return entry.content ?? '';
};
fsRaw.promises.writeFile = async (p: string, content: string): Promise<void> => {
  vfsAddFile(p, content);
};
fsRaw.promises.mkdir = async (p: string, _opts?: any): Promise<void> => {
  const parts = p.split('/').filter(Boolean);
  let acc = '';
  for (const part of parts) {
    acc += '/' + part;
    if (!vfs.has(acc)) vfs.set(acc, { type: 'dir' });
  }
};

// ── TaskDiscoveryService fake ────────────────────────────────────────
class FakeTaskDiscoveryService {
  tasks: any[] = [];
  statsToReturn: any = { total: 0, syncStatus: { synced: 0, unsynced: 0, errors: 0 } };
  updateMetadataCalls: any[] = [];

  async initialize(): Promise<void> { /* no-op */ }

  async discoverTasks(): Promise<any[]> {
    return this.tasks;
  }

  async updateTaskMetadata(taskId: string, data: any): Promise<any> {
    this.updateMetadataCalls.push({ taskId, data });
    const t = this.tasks.find((x) => x.id === taskId);
    if (!t) throw new Error(`Task not found: ${taskId}`);
    t.kanban = { ...t.kanban, ...data };
    return t;
  }

  async getTaskStatistics(): Promise<any> {
    return this.statsToReturn;
  }
}

// ── KanbanIntegrationService fake ────────────────────────────────────
class FakeKanbanIntegrationService {
  cards: any[] = [];
  nextCardId = 1;
  syncCalls: any[] = [];
  cleanupCalls: string[][] = [];
  cleanupReturn = 0;
  boardStats: any = { totalCards: 0, columns: {} };

  async initialize(): Promise<void> { /* no-op */ }

  async syncTaskToCard(task: any): Promise<any> {
    this.syncCalls.push(task);
    let card = this.cards.find((c) => c.metadata?.taskId === task.id);
    if (!card) {
      card = {
        id: `card-${this.nextCardId++}`,
        title: task.title,
        column: task.status || 'To Do',
        priority: task.priority,
        tags: task.tags || [],
        description: task.description,
        updated: new Date().toISOString(),
        metadata: { taskId: task.id },
      };
      this.cards.push(card);
    } else {
      card.title = task.title;
      card.column = task.status || card.column;
    }
    return card;
  }

  async getAllCards(): Promise<any[]> {
    return this.cards;
  }

  async getCard(cardId: string): Promise<any> {
    return this.cards.find((c) => c.id === cardId) || null;
  }

  async cleanupOrphanedCards(validTaskIds: string[]): Promise<number> {
    this.cleanupCalls.push(validTaskIds);
    return this.cleanupReturn;
  }

  async getBoardStatistics(): Promise<any> {
    return this.boardStats;
  }

  async exportBoardData(): Promise<any> {
    return { cards: this.cards, columns: [] };
  }
}

// Stub the require paths
const taskDiscoveryPath = require.resolve('../taskDiscoveryService');
require.cache[taskDiscoveryPath] = {
  id: taskDiscoveryPath,
  filename: taskDiscoveryPath,
  loaded: true,
  exports: FakeTaskDiscoveryService,
} as any;

const kanbanPath = require.resolve('../kanbanIntegrationService');
require.cache[kanbanPath] = {
  id: kanbanPath,
  filename: kanbanPath,
  loaded: true,
  exports: FakeKanbanIntegrationService,
} as any;

// ── Require SUT ───────────────────────────────────────────────────────
const BigBookKanbanSync = require('../bigBookKanbanSync');

function makeTask(overrides: any = {}): any {
  return {
    id: 'task-' + Math.random().toString(36).slice(2, 8),
    filename: 'task_x.md',
    title: 'Default Task',
    status: 'To Do',
    priority: 'medium',
    description: 'desc',
    tags: [],
    modifiedAt: new Date('2026-04-11T10:00:00Z'),
    kanban: {
      cardId: null,
      column: 'To Do',
      synced: false,
      lastSync: null,
      syncErrors: [],
    },
    ...overrides,
  };
}

async function main() {

// ============================================================================
// Initialization + log
// ============================================================================
console.log('\n── initialize ────────────────────────────────────────');

{
  vfsReset();
  dbLoggerCalls.length = 0;
  const svc = new BigBookKanbanSync();
  await svc.initialize();
  assert(vfs.has('/var/log/omai'), 'log dir created');
  // dbLogger was called for "initialized" message
  assert(dbLoggerCalls.some((c) => /initialized/.test(c.args[1])), 'initialized logged');
}

// log() maps levels
{
  dbLoggerCalls.length = 0;
  const svc = new BigBookKanbanSync();
  await svc.log('test msg', 'INFO');
  await svc.log('warn msg', 'WARN');
  await svc.log('error msg', 'ERROR');
  await svc.log('debug msg', 'DEBUG');
  const levels = dbLoggerCalls.map((c) => c.level);
  assert(levels.includes('INFO'), 'INFO logged');
  assert(levels.includes('WARN'), 'WARN logged');
  assert(levels.includes('ERROR'), 'ERROR logged');
  assert(levels.includes('DEBUG'), 'DEBUG logged');
}

// log() with unknown level falls back to info
{
  dbLoggerCalls.length = 0;
  const svc = new BigBookKanbanSync();
  await svc.log('unk', 'UNKNOWN');
  assertEq(dbLoggerCalls[0].level, 'INFO', 'unknown level → INFO');
}

// ============================================================================
// compareTaskAndCard (pure)
// ============================================================================
console.log('\n── compareTaskAndCard ────────────────────────────────');

{
  const svc = new BigBookKanbanSync();
  const task = { title: 'A', status: 'To Do', priority: 'high', description: 'd' };
  const card = { title: 'A', column: 'To Do', priority: 'high', description: 'd' };
  const noDiff = svc.compareTaskAndCard(task, card);
  assertEq(noDiff.length, 0, 'identical → no diff');

  const diff = svc.compareTaskAndCard(
    { title: 'A', status: 'To Do', priority: 'high', description: 'd' },
    { title: 'B', column: 'Done', priority: 'low', description: 'd2' }
  );
  assertEq(diff.length, 4, '4 diffs');
  const fields = diff.map((d: any) => d.field).sort();
  assertEq(fields, ['description', 'priority', 'status', 'title'], 'all fields');
}

// ============================================================================
// calculateSyncHealth (pure)
// ============================================================================
console.log('\n── calculateSyncHealth ───────────────────────────────');

{
  const svc = new BigBookKanbanSync();

  // Perfect
  const perfect = svc.calculateSyncHealth(
    { total: 10, syncStatus: { synced: 10, unsynced: 0, errors: 0 } },
    {},
    []
  );
  assertEq(perfect.score, 100, 'perfect=100');
  assertEq(perfect.status, 'excellent', 'excellent');

  // Half unsynced → -15
  const half = svc.calculateSyncHealth(
    { total: 10, syncStatus: { synced: 5, unsynced: 5, errors: 0 } },
    {},
    []
  );
  assertEq(half.score, 85, 'half unsynced');

  // With errors
  const errors = svc.calculateSyncHealth(
    { total: 10, syncStatus: { synced: 10, unsynced: 0, errors: 2 } },
    {},
    []
  );
  assertEq(errors.score, 90, '2 errors → 100 - 10 = 90');

  // Conflicts
  const conflicts = svc.calculateSyncHealth(
    { total: 10, syncStatus: { synced: 10, unsynced: 0, errors: 0 } },
    {},
    [{}, {}, {}]
  );
  assertEq(conflicts.score, 70, '3 conflicts → -30');

  // Conflict cap at 30
  const manyConflicts = svc.calculateSyncHealth(
    { total: 10, syncStatus: { synced: 10, unsynced: 0, errors: 0 } },
    {},
    [{}, {}, {}, {}, {}]
  );
  assertEq(manyConflicts.score, 70, 'conflict cap at 30');

  // Status tiers
  const good = svc.calculateSyncHealth(
    { total: 10, syncStatus: { synced: 7, unsynced: 3, errors: 0 } },
    {},
    []
  );
  assert(['good', 'excellent'].includes(good.status), 'status good/excellent');

  const poor = svc.calculateSyncHealth(
    { total: 10, syncStatus: { synced: 0, unsynced: 10, errors: 10 } },
    {},
    [{}, {}, {}, {}, {}]
  );
  assert(poor.status === 'poor' || poor.status === 'fair', 'poor range');
}

// ============================================================================
// syncTasksToKanban
// ============================================================================
console.log('\n── syncTasksToKanban ─────────────────────────────────');

{
  const svc = new BigBookKanbanSync();
  const tasks = [
    makeTask({ id: 't1', filename: 't1.md', title: 'Task 1' }),
    makeTask({ id: 't2', filename: 't2.md', title: 'Task 2' }),
  ];
  svc.taskDiscovery.tasks = tasks;

  const result = await svc.syncTasksToKanban(tasks);
  assertEq(result.synced, 2, '2 synced');
  assertEq(result.created, 2, 'both new → 2 created');
  assertEq(result.updated, 0, '0 updated');
  assertEq(result.errors.length, 0, 'no errors');
  assertEq(svc.kanbanIntegration.syncCalls.length, 2, 'syncTaskToCard called twice');
}

// Existing cardId → updated
{
  const svc = new BigBookKanbanSync();
  const tasks = [
    makeTask({ id: 't1', filename: 't1.md', kanban: { cardId: 'card-x', column: 'To Do', synced: true, lastSync: null, syncErrors: [] } }),
  ];
  svc.taskDiscovery.tasks = tasks;
  const result = await svc.syncTasksToKanban(tasks);
  assertEq(result.created, 0, '0 created');
  assertEq(result.updated, 1, '1 updated');
}

// Error during sync swallowed into errors list
{
  const svc = new BigBookKanbanSync();
  const tasks = [makeTask({ id: 't1', filename: 'boom.md' })];
  svc.taskDiscovery.tasks = tasks;
  svc.kanbanIntegration.syncTaskToCard = async () => { throw new Error('kaboom'); };
  const result = await svc.syncTasksToKanban(tasks);
  assertEq(result.synced, 0, '0 synced');
  assertEq(result.errors.length, 1, '1 error');
  assertEq(result.errors[0].filename, 'boom.md', 'error record has filename');
}

// ============================================================================
// syncKanbanToTasks
// ============================================================================
console.log('\n── syncKanbanToTasks ─────────────────────────────────');

{
  const svc = new BigBookKanbanSync();
  // Task with linked cardId, card newer than task → update
  const task = makeTask({
    id: 't1',
    filename: 't1.md',
    modifiedAt: new Date('2026-04-11T09:00:00Z'),
    kanban: { cardId: 'card-1', column: 'To Do', synced: true, lastSync: null, syncErrors: [] },
  });
  const card = {
    id: 'card-1',
    column: 'Done',
    priority: 'high',
    tags: ['updated'],
    updated: '2026-04-11T11:00:00Z',
    metadata: { taskId: 't1' },
  };
  svc.taskDiscovery.tasks = [task];
  const result = await svc.syncKanbanToTasks([card], [task]);
  assertEq(result.updated, 1, '1 updated');
  assertEq(result.synced, 1, '1 synced');
}

// Card older than task → no update but counted as synced
{
  const svc = new BigBookKanbanSync();
  const task = makeTask({
    id: 't1',
    modifiedAt: new Date('2026-04-11T11:00:00Z'),
    kanban: { cardId: 'card-1', column: 'To Do', synced: true, lastSync: null, syncErrors: [] },
  });
  const card = {
    id: 'card-1',
    updated: '2026-04-11T09:00:00Z',
    metadata: { taskId: 't1' },
  };
  svc.taskDiscovery.tasks = [task];
  const result = await svc.syncKanbanToTasks([card], [task]);
  assertEq(result.updated, 0, '0 updated');
  assertEq(result.synced, 1, 'still synced');
}

// Card without taskId link → skipped
{
  const svc = new BigBookKanbanSync();
  const card = { id: 'card-1', metadata: {} };
  const result = await svc.syncKanbanToTasks([card], []);
  assertEq(result.synced, 0, 'no sync on unlinked card');
  assertEq(result.updated, 0, 'no update');
}

// Card references missing task → warn and skip
{
  const svc = new BigBookKanbanSync();
  const card = {
    id: 'card-999',
    updated: '2026-04-11T11:00:00Z',
    metadata: { taskId: 'missing-task' },
  };
  const result = await svc.syncKanbanToTasks([card], []);
  assertEq(result.synced, 0, 'no sync');
}

// ============================================================================
// performFullSync
// ============================================================================
console.log('\n── performFullSync ───────────────────────────────────');

{
  const svc = new BigBookKanbanSync();
  const task = makeTask({ id: 't1', filename: 'full.md' });
  svc.taskDiscovery.tasks = [task];
  svc.kanbanIntegration.cleanupReturn = 3;

  const result = await svc.performFullSync();
  assertEq(result.success, true, 'success');
  assertEq(result.tasks.discovered, 1, 'discovered');
  assertEq(result.tasks.synced, 1, 'synced');
  assertEq(result.tasks.created, 1, 'created');
  assertEq(result.kanban.orphaned, 3, 'orphaned count');
  assert(result.startTime !== null, 'startTime');
  assert(result.endTime !== null, 'endTime');
  assertEq(svc.syncStatistics.totalSyncs, 1, 'stats totalSyncs');
  assertEq(svc.syncStatistics.successfulSyncs, 1, 'successfulSyncs');
  assert(svc.lastSyncTime !== null, 'lastSyncTime set');
  assertEq(svc.syncInProgress, false, 'syncInProgress cleared');
}

// Concurrent call blocked
{
  const svc = new BigBookKanbanSync();
  svc.syncInProgress = true;
  const result = await svc.performFullSync();
  assertEq(result.success, false, 'blocked');
  assertEq(result.inProgress, true, 'inProgress flag');
}

// Error during sync
{
  const svc = new BigBookKanbanSync();
  svc.taskDiscovery.discoverTasks = async () => { throw new Error('discover failed'); };
  const result = await svc.performFullSync();
  assertEq(result.success, false, 'failed');
  assert(/discover failed/.test(result.error), 'error message');
  assertEq(svc.syncStatistics.errorCount, 1, 'errorCount incremented');
  assertEq(svc.syncInProgress, false, 'flag cleared on error');
}

// ============================================================================
// syncSingleTask / syncSingleCard
// ============================================================================
console.log('\n── syncSingleTask ────────────────────────────────────');

{
  const svc = new BigBookKanbanSync();
  const task = makeTask({ id: 't1' });
  svc.taskDiscovery.tasks = [task];
  const result = await svc.syncSingleTask('t1');
  assertEq(result.success, true, 'success');
  assert(result.card !== null, 'card returned');
  assertEq(svc.kanbanIntegration.syncCalls.length, 1, 'sync called');
}

// Missing task → throws
{
  const svc = new BigBookKanbanSync();
  svc.taskDiscovery.tasks = [];
  await assertThrows(() => svc.syncSingleTask('missing'), /not found/i, 'missing task throws');
}

console.log('\n── syncSingleCard ────────────────────────────────────');

{
  const svc = new BigBookKanbanSync();
  const task = makeTask({ id: 't1' });
  svc.taskDiscovery.tasks = [task];
  svc.kanbanIntegration.cards = [{
    id: 'card-1',
    column: 'Done',
    updated: new Date().toISOString(),
    metadata: { taskId: 't1' },
  }];
  const result = await svc.syncSingleCard('card-1');
  assertEq(result.success, true, 'success');
}

// Card not found
{
  const svc = new BigBookKanbanSync();
  await assertThrows(() => svc.syncSingleCard('missing'), /not found/i, 'missing card throws');
}

// Card without taskId link
{
  const svc = new BigBookKanbanSync();
  svc.kanbanIntegration.cards = [{ id: 'card-x', metadata: {} }];
  await assertThrows(() => svc.syncSingleCard('card-x'), /not linked/i, 'unlinked card throws');
}

// Card linked but task missing
{
  const svc = new BigBookKanbanSync();
  svc.kanbanIntegration.cards = [{
    id: 'card-y',
    column: 'To Do',
    metadata: { taskId: 'ghost' },
  }];
  svc.taskDiscovery.tasks = [];
  await assertThrows(() => svc.syncSingleCard('card-y'), /not found/i, 'ghost task throws');
}

// ============================================================================
// detectSyncConflicts (no conflicts path)
// ============================================================================
console.log('\n── detectSyncConflicts ───────────────────────────────');

{
  const svc = new BigBookKanbanSync();
  svc.taskDiscovery.tasks = [];
  svc.kanbanIntegration.cards = [];
  const conflicts = await svc.detectSyncConflicts();
  assertEq(conflicts.length, 0, 'empty → no conflicts');
}

// Cards without taskId skipped
{
  const svc = new BigBookKanbanSync();
  svc.kanbanIntegration.cards = [{ id: 'x', metadata: {} }];
  const conflicts = await svc.detectSyncConflicts();
  assertEq(conflicts.length, 0, 'unlinked skipped');
}

// Within sync tolerance (same mtime) → no conflict
{
  const svc = new BigBookKanbanSync();
  const stamp = '2026-04-11T10:00:00Z';
  const task = makeTask({
    id: 't1',
    modifiedAt: new Date(stamp),
    kanban: { cardId: 'card-1', column: 'To Do', synced: true, lastSync: new Date(stamp), syncErrors: [] },
  });
  const card = {
    id: 'card-1',
    updated: stamp,
    metadata: { taskId: 't1' },
  };
  svc.taskDiscovery.tasks = [task];
  svc.kanbanIntegration.cards = [card];
  const conflicts = await svc.detectSyncConflicts();
  assertEq(conflicts.length, 0, 'identical timestamps → no conflict');
}

// Known bug: detectSyncConflicts calls `this.comparTaskAndCard` (typo).
// When a conflict IS detected, it throws TypeError.
{
  const svc = new BigBookKanbanSync();
  const task = makeTask({
    id: 't1',
    modifiedAt: new Date('2026-04-11T12:00:00Z'),
    kanban: {
      cardId: 'card-1',
      column: 'To Do',
      synced: true,
      lastSync: new Date('2026-04-11T09:00:00Z'),
      syncErrors: [],
    },
  });
  const card = {
    id: 'card-1',
    title: 'A',
    column: 'Done',
    priority: 'high',
    description: 'd',
    updated: '2026-04-11T14:00:00Z', // 2 hours apart from task mtime
    metadata: { taskId: 't1' },
  };
  svc.taskDiscovery.tasks = [task];
  svc.kanbanIntegration.cards = [card];
  await assertThrows(
    () => svc.detectSyncConflicts(),
    /comparTaskAndCard|is not a function/,
    'typo bug thrown on conflict'
  );
}

// ============================================================================
// resolveSyncConflict
// ============================================================================
console.log('\n── resolveSyncConflict ───────────────────────────────');

{
  const svc = new BigBookKanbanSync();
  svc.taskDiscovery.tasks = [makeTask({ id: 't1' })];
  const r = await svc.resolveSyncConflict('t1', 'card-1', 'task');
  assertEq(r.success, true, 'task source resolved');
  assertEq(r.resolution, 'task', 'resolution=task');
}

{
  const svc = new BigBookKanbanSync();
  svc.taskDiscovery.tasks = [makeTask({ id: 't1' })];
  svc.kanbanIntegration.cards = [{
    id: 'card-1',
    column: 'Done',
    updated: new Date().toISOString(),
    metadata: { taskId: 't1' },
  }];
  const r = await svc.resolveSyncConflict('t1', 'card-1', 'card');
  assertEq(r.success, true, 'card source resolved');
}

{
  const svc = new BigBookKanbanSync();
  await assertThrows(
    () => svc.resolveSyncConflict('t1', 'c1', 'bogus'),
    /Invalid conflict resolution source/,
    'invalid source throws'
  );
}

// ============================================================================
// updateSyncMetadata
// ============================================================================
console.log('\n── updateSyncMetadata ────────────────────────────────');

{
  vfsReset();
  const svc = new BigBookKanbanSync();
  const syncResult = {
    startTime: new Date(),
    endTime: new Date(),
    tasks: { synced: 1 },
    kanban: { synced: 1 },
  };
  await svc.updateSyncMetadata(syncResult);
  assert(vfs.has('/var/log/omai/sync-metadata.json'), 'metadata file written');
  const data = JSON.parse(vfs.get('/var/log/omai/sync-metadata.json')!.content!);
  assert(data.lastSync !== undefined, 'lastSync set');
  assert(data.syncResults !== undefined, 'syncResults');
  assert(data.statistics !== undefined, 'statistics');
}

// ============================================================================
// getSyncStatus (requires non-conflict state to avoid typo bug)
// ============================================================================
console.log('\n── getSyncStatus ─────────────────────────────────────');

{
  const svc = new BigBookKanbanSync();
  svc.taskDiscovery.tasks = [];
  svc.taskDiscovery.statsToReturn = {
    total: 5,
    syncStatus: { synced: 5, unsynced: 0, errors: 0 },
  };
  svc.kanbanIntegration.cards = [];
  svc.kanbanIntegration.boardStats = { totalCards: 5, columns: {} };

  const status = await svc.getSyncStatus();
  assertEq(status.isActive, false, 'not active');
  assertEq(status.tasks.total, 5, 'tasks forwarded');
  assertEq(status.kanban.totalCards, 5, 'kanban forwarded');
  assertEq(status.conflicts, 0, 'no conflicts');
  assert(status.health.score > 0, 'health score present');
}

// ============================================================================
// getSyncLogs / clearSyncLogs
// ============================================================================
console.log('\n── getSyncLogs ───────────────────────────────────────');

{
  vfsReset();
  vfsAddFile(
    '/var/log/omai/bigbook-kanban-sync.log',
    '[2026-04-11T10:00:00Z] [INFO] started\n[2026-04-11T10:01:00Z] [ERROR] boom\n[2026-04-11T10:02:00Z] [INFO] done\n'
  );
  const svc = new BigBookKanbanSync();
  const logs = await svc.getSyncLogs();
  assertEq(logs.length, 3, '3 log lines');
  // Reversed → most recent first
  assertEq(logs[0].message, 'done', 'most recent first');
  assertEq(logs[0].level, 'INFO', 'level parsed');
  assertEq(logs[1].level, 'ERROR', 'ERROR level');
}

// limit
{
  vfsReset();
  const lines = [];
  for (let i = 0; i < 10; i++) {
    lines.push(`[2026-04-11T10:0${i}:00Z] [INFO] msg ${i}`);
  }
  vfsAddFile('/var/log/omai/bigbook-kanban-sync.log', lines.join('\n') + '\n');
  const svc = new BigBookKanbanSync();
  const logs = await svc.getSyncLogs(3);
  assertEq(logs.length, 3, 'limit=3');
}

// missing file → empty
{
  vfsReset();
  const svc = new BigBookKanbanSync();
  const logs = await svc.getSyncLogs();
  assertEq(logs.length, 0, 'missing file → empty array');
}

console.log('\n── clearSyncLogs ─────────────────────────────────────');

{
  vfsReset();
  vfsAddFile('/var/log/omai/bigbook-kanban-sync.log', 'old content');
  const svc = new BigBookKanbanSync();
  const result = await svc.clearSyncLogs();
  assertEq(result, true, 'cleared');
  assertEq(vfs.get('/var/log/omai/bigbook-kanban-sync.log')!.content, '', 'file emptied');
}

// ============================================================================
// exportSyncData
// ============================================================================
console.log('\n── exportSyncData ────────────────────────────────────');

{
  vfsReset();
  const svc = new BigBookKanbanSync();
  svc.taskDiscovery.tasks = [makeTask({ id: 't1' })];
  svc.taskDiscovery.statsToReturn = {
    total: 1,
    syncStatus: { synced: 1, unsynced: 0, errors: 0 },
  };
  svc.kanbanIntegration.cards = [];
  svc.kanbanIntegration.boardStats = { totalCards: 0, columns: {} };

  const exported = await svc.exportSyncData();
  assert(exported.exportTimestamp !== undefined, 'exportTimestamp');
  assertEq(exported.tasks.length, 1, '1 task in export');
  assert(exported.kanban !== undefined, 'kanban data');
  assert(exported.syncStatus !== undefined, 'syncStatus');
  assert(Array.isArray(exported.logs), 'logs array');
  assertEq(exported.metadata.version, '1.0.0', 'version');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);

// Restore fs.promises
fsRaw.promises.readFile = origPromises.readFile;
fsRaw.promises.writeFile = origPromises.writeFile;
fsRaw.promises.mkdir = origPromises.mkdir;

process.exit(failed > 0 ? 1 : 0);
} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
