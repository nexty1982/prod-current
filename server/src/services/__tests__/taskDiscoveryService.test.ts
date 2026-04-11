#!/usr/bin/env npx tsx
/**
 * Unit tests for services/taskDiscoveryService.js (OMD-1132)
 *
 * Covers TaskDiscoveryService: file discovery with dedup, frontmatter/
 * content parsing, Kanban metadata extraction, task file CRUD,
 * statistics, and search filtering.
 *
 * Strategy:
 *   - Monkey-patch fs.promises with a virtual filesystem (vfs Map)
 *   - Stub logger via require.cache to silence output
 *   - Hardcoded paths `/var/www/orthodoxmetrics/prod` and
 *     `/mnt/bigbook_secure` are used as vfs keys
 *
 * Run from server/: npx tsx src/services/__tests__/taskDiscoveryService.test.ts
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

// ── Logger stub ──────────────────────────────────────────────────────
const loggerPath = require.resolve('../../utils/logger');
require.cache[loggerPath] = {
  id: loggerPath,
  filename: loggerPath,
  loaded: true,
  exports: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
} as any;

// ── js-yaml stub (minimal parser sufficient for test fixtures) ───────
// Supports: `key: value`, `key:\n  - item` (list under key), and throws on `: `-leading lines.
const yamlModuleId = 'js-yaml';
const yamlStub = {
  load: (src: string): any => {
    if (/^\s*:\s/m.test(src)) throw new Error('malformed yaml');
    const out: any = {};
    const lines = src.split('\n');
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
      // key-only line followed by indented list items
      const keyOnlyMatch = line.match(/^(\w[\w_]*)\s*:\s*$/);
      if (keyOnlyMatch) {
        const key = keyOnlyMatch[1];
        const items: any[] = [];
        i++;
        while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s+-\s+/, '').trim());
          i++;
        }
        out[key] = items;
        continue;
      }
      const kvMatch = line.match(/^(\w[\w_]*)\s*:\s*(.+)$/);
      if (kvMatch) {
        const key = kvMatch[1];
        let val: any = kvMatch[2].trim();
        if (val === 'null' || val === '') val = null;
        else if (val === 'true') val = true;
        else if (val === 'false') val = false;
        else if (/^-?\d+$/.test(val)) val = parseInt(val, 10);
        out[key] = val;
        i++;
        continue;
      }
      i++;
    }
    return out;
  },
  dump: (obj: any, _opts?: any): string => {
    const lines: string[] = [];
    for (const [k, v] of Object.entries(obj || {})) {
      if (Array.isArray(v)) {
        lines.push(`${k}:`);
        for (const item of v) lines.push(`  - ${item}`);
      } else if (v === null || v === undefined) {
        lines.push(`${k}: null`);
      } else if (typeof v === 'object') {
        lines.push(`${k}: ${JSON.stringify(v)}`);
      } else {
        lines.push(`${k}: ${v}`);
      }
    }
    return lines.join('\n') + '\n';
  },
};
// Register under the bare name so `require('js-yaml')` resolves it
require.cache[yamlModuleId] = {
  id: yamlModuleId,
  filename: yamlModuleId,
  loaded: true,
  exports: yamlStub,
} as any;
// Also patch Module._resolveFilename so resolution returns our cache id
const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request: string, ...rest: any[]) {
  if (request === 'js-yaml') return yamlModuleId;
  return origResolve.call(this, request, ...rest);
};

// ── Virtual filesystem ───────────────────────────────────────────────
type Entry = { type: 'file' | 'dir'; content?: string };
const vfs = new Map<string, Entry>();

function vfsReset(): void {
  vfs.clear();
}

function vfsAddDir(p: string): void {
  vfs.set(p, { type: 'dir' });
}

function vfsAddFile(p: string, content: string): void {
  // Ensure parent dirs exist
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

fsRaw.promises.readdir = async (dir: string, opts?: any): Promise<any> => {
  const entry = vfs.get(dir);
  if (!entry) throw enoent(dir);
  if (entry.type !== 'dir') throw enoent(dir);
  const names = new Set<string>();
  const dirPrefix = dir.endsWith('/') ? dir : dir + '/';
  for (const key of vfs.keys()) {
    if (key.startsWith(dirPrefix)) {
      const rest = key.slice(dirPrefix.length);
      const first = rest.split('/')[0];
      if (first) names.add(first);
    }
  }
  if (opts && opts.withFileTypes) {
    return Array.from(names).map(name => {
      const full = dirPrefix + name;
      const e = vfs.get(full);
      return {
        name,
        isDirectory: () => e?.type === 'dir',
        isFile: () => e?.type === 'file',
      };
    });
  }
  return Array.from(names);
};

fsRaw.promises.readFile = async (p: string, _enc?: any): Promise<string> => {
  const entry = vfs.get(p);
  if (!entry) throw enoent(p);
  if (entry.type !== 'file') throw enoent(p);
  return entry.content ?? '';
};

fsRaw.promises.stat = async (p: string): Promise<any> => {
  const entry = vfs.get(p);
  if (!entry) throw enoent(p);
  const now = new Date('2026-04-11T10:00:00Z');
  return {
    birthtime: now,
    mtime: now,
    size: entry.content?.length ?? 0,
    isFile: () => entry.type === 'file',
    isDirectory: () => entry.type === 'dir',
  };
};

fsRaw.promises.mkdir = async (p: string, _opts?: any): Promise<void> => {
  // Recursive: create all parent dirs
  const parts = p.split('/').filter(Boolean);
  let acc = '';
  for (const part of parts) {
    acc += '/' + part;
    if (!vfs.has(acc)) vfs.set(acc, { type: 'dir' });
  }
};

fsRaw.promises.writeFile = async (p: string, content: string): Promise<void> => {
  vfsAddFile(p, content);
};

// ── Require SUT ───────────────────────────────────────────────────────
const TaskDiscoveryService = require('../taskDiscoveryService');

const PROJECT_ROOT = '/var/www/orthodoxmetrics/prod';
const BIG_BOOK = '/mnt/bigbook_secure';

async function main() {

// ============================================================================
// Pure helpers
// ============================================================================
console.log('\n── pure helpers ───────────────────────────────────────');

const svc = new TaskDiscoveryService();

// shouldSkipDirectory
assertEq(svc.shouldSkipDirectory('node_modules'), true, 'skip node_modules');
assertEq(svc.shouldSkipDirectory('.git'), true, 'skip .git');
assertEq(svc.shouldSkipDirectory('.hidden'), true, 'skip dotfiles');
assertEq(svc.shouldSkipDirectory('dist'), true, 'skip dist');
assertEq(svc.shouldSkipDirectory('build'), true, 'skip build');
assertEq(svc.shouldSkipDirectory('logs'), true, 'skip logs');
assertEq(svc.shouldSkipDirectory('src'), false, 'do not skip src');
assertEq(svc.shouldSkipDirectory('server'), false, 'do not skip server');

// mapStatusToColumn
assertEq(svc.mapStatusToColumn('To Do'), 'To Do', 'To Do → To Do');
assertEq(svc.mapStatusToColumn('In Progress'), 'In Progress', 'In Progress');
assertEq(svc.mapStatusToColumn('Review'), 'Review', 'Review');
assertEq(svc.mapStatusToColumn('Done'), 'Done', 'Done');
assertEq(svc.mapStatusToColumn('Completed'), 'Done', 'Completed → Done');
assertEq(svc.mapStatusToColumn('Finished'), 'Done', 'Finished → Done');
assertEq(svc.mapStatusToColumn('Unknown'), 'To Do', 'unknown → To Do');

// generateTaskId
const id1 = svc.generateTaskId('/var/www/orthodoxmetrics/prod/tasks/task_foo.md');
assert(typeof id1 === 'string', 'generateTaskId returns string');
assert(id1.length <= 16, 'generateTaskId length ≤ 16');
assert(/^[a-zA-Z0-9]+$/.test(id1), 'generateTaskId alphanumeric only');
const id2 = svc.generateTaskId('/var/www/orthodoxmetrics/prod/tasks/task_bar.md');
assert(id1 !== id2, 'different paths → different ids');

// getNestedValue
assertEq(svc.getNestedValue({ a: { b: { c: 42 } } }, 'a.b.c'), 42, 'nested path');
assertEq(svc.getNestedValue({ a: 1 }, 'a'), 1, 'single key');
assertEq(svc.getNestedValue({ a: 1 }, 'missing'), undefined, 'missing path');

// validateTaskData
assertEq(
  svc.validateTaskData({ title: '' }),
  ['Title is required'],
  'empty title'
);
assertEq(
  svc.validateTaskData({ title: '   ' }),
  ['Title is required'],
  'whitespace title'
);
{
  const errs = svc.validateTaskData({ title: 'ok', status: 'bogus' });
  assert(errs.length === 1 && /Invalid status/.test(errs[0]), 'invalid status');
}
{
  const errs = svc.validateTaskData({ title: 'ok', priority: 'urgent' });
  assert(errs.length === 1 && /Invalid priority/.test(errs[0]), 'invalid priority');
}
assertEq(
  svc.validateTaskData({ title: 'ok', status: 'To Do', priority: 'high' }),
  [],
  'valid task'
);

// ============================================================================
// parseFrontmatter
// ============================================================================
console.log('\n── parseFrontmatter ──────────────────────────────────');

{
  const meta: any = { title: '', status: 'To Do', priority: 'medium', tags: [], description: '', frontmatter: {} };
  const content = `---
title: My Task
status: Done
priority: high
tags:
  - foo
  - bar
description: A task description
---

# Content here
`;
  svc.parseFrontmatter(content, meta);
  assertEq(meta.title, 'My Task', 'title from frontmatter');
  assertEq(meta.status, 'Done', 'status from frontmatter');
  assertEq(meta.priority, 'high', 'priority from frontmatter');
  assertEq(meta.tags, ['foo', 'bar'], 'tags array');
  assertEq(meta.description, 'A task description', 'description from frontmatter');
}

// No frontmatter → no-op
{
  const meta: any = { title: 'original', frontmatter: {} };
  svc.parseFrontmatter('# Just a heading\n\nBody.', meta);
  assertEq(meta.title, 'original', 'no frontmatter → preserved');
  assertEq(meta.frontmatter, {}, 'empty frontmatter');
}

// Single tag coerced to array
{
  const meta: any = { title: '', tags: [], frontmatter: {} };
  svc.parseFrontmatter('---\ntags: single\n---\n\n', meta);
  assertEq(meta.tags, ['single'], 'single tag → array');
}

// Malformed frontmatter swallowed
{
  const meta: any = { title: '', tags: [], frontmatter: {} };
  svc.parseFrontmatter('---\n: invalid yaml: [\n---\n\n', meta);
  assertEq(meta.title, '', 'malformed yaml → title unchanged');
}

// ============================================================================
// parseContent
// ============================================================================
console.log('\n── parseContent ──────────────────────────────────────');

// Title from H1
{
  const meta: any = { title: '', description: '', status: 'To Do', tags: [], filename: 'task_foo.md' };
  svc.parseContent('# Heading One\n\nSome body text.', meta);
  assertEq(meta.title, 'Heading One', 'title from H1');
}

// Title fallback from filename
{
  const meta: any = { title: '', description: '', status: 'To Do', tags: [], filename: 'task_my_cool_thing.md' };
  svc.parseContent('No heading here.', meta);
  assertEq(meta.title, 'My Cool Thing', 'title from filename');
}

// Description from ## Objective
{
  const meta: any = { title: 'T', description: '', status: 'To Do', tags: [], filename: 'task_x.md' };
  svc.parseContent('# T\n\n## Objective\n\nThis is the objective.\n\n## Other\n\nMore.', meta);
  assertEq(meta.description, 'This is the objective.', 'description from Objective');
}

// Description from first paragraph
{
  const meta: any = { title: 'T', description: '', status: 'To Do', tags: [], filename: 'task_x.md' };
  svc.parseContent('# T\n\nFirst paragraph body.\n\nSecond.', meta);
  assertEq(meta.description, 'First paragraph body.', 'description from first para');
}

// Status detection — Done
{
  const meta: any = { title: 'T', description: '', status: 'To Do', tags: [], filename: 'task_x.md' };
  svc.parseContent('# T\n\n✅ completed successfully', meta);
  assertEq(meta.status, 'Done', 'detect Done from ✅');
}

// Status detection — In Progress
{
  const meta: any = { title: 'T', description: '', status: 'To Do', tags: [], filename: 'task_x.md' };
  svc.parseContent('# T\n\n🔄 working on it', meta);
  assertEq(meta.status, 'In Progress', 'detect In Progress');
}

// Status detection — Review
{
  const meta: any = { title: 'T', description: '', status: 'To Do', tags: [], filename: 'task_x.md' };
  svc.parseContent('# T\n\n👀 needs review', meta);
  assertEq(meta.status, 'Review', 'detect Review');
}

// Don't override non-default status
{
  const meta: any = { title: 'T', description: '', status: 'In Progress', tags: [], filename: 'task_x.md' };
  svc.parseContent('# T\n\n✅ completed', meta);
  assertEq(meta.status, 'In Progress', 'non-default status preserved');
}

// Tag extraction
{
  const meta: any = { title: 'T', description: '', status: 'To Do', tags: ['existing'], filename: 'task_x.md' };
  svc.parseContent('# T\n\nThis has #backend and #urgent tags.', meta);
  assert(meta.tags.includes('backend'), 'tag backend extracted');
  assert(meta.tags.includes('urgent'), 'tag urgent extracted');
  assert(meta.tags.includes('existing'), 'existing tag preserved');
}

// ============================================================================
// extractKanbanMetadata
// ============================================================================
console.log('\n── extractKanbanMetadata ─────────────────────────────');

{
  const meta: any = {
    status: 'Done',
    frontmatter: {},
    kanban: { synced: false, cardId: null, boardId: 'dev', column: 'To Do', lastSync: null, syncErrors: [] },
  };
  svc.extractKanbanMetadata(meta);
  assertEq(meta.kanban.column, 'Done', 'column mapped from status');
  assertEq(meta.kanban.synced, false, 'unsynced without cardId');
}

{
  const meta: any = {
    status: 'To Do',
    frontmatter: { kanbanCardId: 'card-123', kanbanBoard: 'custom', kanbanStatus: 'Review' },
    kanban: { synced: false, cardId: null, boardId: 'dev', column: 'To Do', lastSync: null, syncErrors: [] },
  };
  svc.extractKanbanMetadata(meta);
  assertEq(meta.kanban.cardId, 'card-123', 'cardId from frontmatter');
  assertEq(meta.kanban.boardId, 'custom', 'boardId from frontmatter');
  assertEq(meta.kanban.column, 'Review', 'column from frontmatter overrides mapping');
  assertEq(meta.kanban.synced, true, 'synced when cardId present');
}

// kanban block merge
{
  const meta: any = {
    status: 'To Do',
    frontmatter: { kanban: { cardId: 'abc', customField: 'x' } },
    kanban: { synced: false, cardId: null, boardId: 'dev', column: 'To Do', lastSync: null, syncErrors: [] },
  };
  svc.extractKanbanMetadata(meta);
  assertEq(meta.kanban.cardId, 'abc', 'kanban block cardId');
  assertEq((meta.kanban as any).customField, 'x', 'kanban block merged');
}

// ============================================================================
// deduplicateTasks
// ============================================================================
console.log('\n── deduplicateTasks ──────────────────────────────────');

{
  const tasks = [
    { filename: 'task_a.md', filepath: '/var/www/orthodoxmetrics/prod/task_a.md' },
    { filename: 'task_b.md', filepath: '/var/www/orthodoxmetrics/prod/task_b.md' },
    { filename: 'task_a.md', filepath: '/mnt/bigbook_secure/task_a.md' },
  ];
  const result = svc.deduplicateTasks(tasks);
  assertEq(result.length, 2, '2 unique');
  const taskA = result.find((t: any) => t.filename === 'task_a.md');
  assert(taskA.filepath.includes('bigbook_secure'), 'bigbook preferred');
}

{
  const tasks = [
    { filename: 'task_x.md', filepath: '/mnt/bigbook_secure/task_x.md' },
    { filename: 'task_x.md', filepath: '/var/www/orthodoxmetrics/prod/task_x.md' },
  ];
  const result = svc.deduplicateTasks(tasks);
  assertEq(result.length, 1, 'dedup');
  assert(result[0].filepath.includes('bigbook_secure'), 'bigbook kept');
}

// ============================================================================
// discoverTasks (fs-backed)
// ============================================================================
console.log('\n── discoverTasks ──────────────────────────────────────');

vfsReset();
vfsAddDir(PROJECT_ROOT);
vfsAddDir(BIG_BOOK);
vfsAddFile(`${PROJECT_ROOT}/task_one.md`, '# Task One\n\nBody.');
vfsAddFile(`${PROJECT_ROOT}/README.md`, '# Not a task');
vfsAddDir(`${PROJECT_ROOT}/node_modules`);
vfsAddFile(`${PROJECT_ROOT}/node_modules/task_skipped.md`, '# Skipped');
vfsAddDir(`${PROJECT_ROOT}/tasks`);
vfsAddFile(`${PROJECT_ROOT}/tasks/task_nested.md`, '# Nested Task');
vfsAddFile(`${BIG_BOOK}/task_big.md`, '# Big Book Task');
{
  const tasks = await svc.discoverTasks();
  assertEq(tasks.length, 3, '3 tasks discovered');
  const filenames = tasks.map((t: any) => t.filename).sort();
  assertEq(filenames, ['task_big.md', 'task_nested.md', 'task_one.md'], 'found all');
}

// With dedup: same filename in both locations
vfsReset();
vfsAddDir(PROJECT_ROOT);
vfsAddDir(BIG_BOOK);
vfsAddFile(`${PROJECT_ROOT}/task_same.md`, '# From Prod');
vfsAddFile(`${BIG_BOOK}/task_same.md`, '# From Bigbook');
{
  const tasks = await svc.discoverTasks();
  assertEq(tasks.length, 1, 'deduped to 1');
  assert(tasks[0].filepath.includes('bigbook_secure'), 'kept bigbook version');
}

// Missing directories swallowed
vfsReset();
vfsAddDir(PROJECT_ROOT);
vfsAddFile(`${PROJECT_ROOT}/task_only.md`, '# Only');
// /mnt/bigbook_secure does NOT exist
{
  const tasks = await svc.discoverTasks();
  assertEq(tasks.length, 1, 'missing bigbook dir OK');
}

// ============================================================================
// searchDirectory: skip dirs respected
// ============================================================================
console.log('\n── searchDirectory: skip dirs ────────────────────────');

vfsReset();
vfsAddDir(PROJECT_ROOT);
vfsAddDir(`${PROJECT_ROOT}/dist`);
vfsAddFile(`${PROJECT_ROOT}/dist/task_skip.md`, '# Skipped');
vfsAddDir(`${PROJECT_ROOT}/build`);
vfsAddFile(`${PROJECT_ROOT}/build/task_build.md`, '# Skipped');
vfsAddFile(`${PROJECT_ROOT}/task_keep.md`, '# Keep');
{
  const found = await svc.searchDirectory(PROJECT_ROOT);
  assertEq(found.length, 1, 'only task_keep.md');
  assertEq(found[0].filename, 'task_keep.md', 'kept file');
}

// ============================================================================
// extractTaskMetadata
// ============================================================================
console.log('\n── extractTaskMetadata ───────────────────────────────');

vfsReset();
vfsAddDir(PROJECT_ROOT);
const fullContent = `---
title: Extracted Task
status: In Progress
priority: high
tags:
  - backend
---

# Extracted Task

## Objective

Implement the thing.
`;
vfsAddFile(`${PROJECT_ROOT}/task_extract.md`, fullContent);
{
  const meta = await svc.extractTaskMetadata(`${PROJECT_ROOT}/task_extract.md`);
  assertEq(meta.title, 'Extracted Task', 'title extracted');
  assertEq(meta.status, 'In Progress', 'status extracted');
  assertEq(meta.priority, 'high', 'priority extracted');
  assertEq(meta.tags, ['backend'], 'tags extracted');
  assertEq(meta.description, 'Implement the thing.', 'description from Objective');
  assertEq(meta.filename, 'task_extract.md', 'filename');
  assert(typeof meta.id === 'string' && meta.id.length > 0, 'id generated');
  assertEq(meta.kanban.synced, false, 'not synced');
}

// Error → returns null
{
  const meta = await svc.extractTaskMetadata(`${PROJECT_ROOT}/does_not_exist.md`);
  assertEq(meta, null, 'missing file → null');
}

// ============================================================================
// createTaskFile
// ============================================================================
console.log('\n── createTaskFile ────────────────────────────────────');

vfsReset();
vfsAddDir(BIG_BOOK);
{
  const result = await svc.createTaskFile({
    title: 'New Feature',
    description: 'Build something cool',
    status: 'To Do',
    priority: 'high',
    tags: ['frontend'],
  });
  assert(result !== null, 'returns metadata');
  assertEq(result.title, 'New Feature', 'title');
  assert(result.filename.startsWith('task_'), 'filename prefixed');
  assert(result.filename.includes('new_feature'), 'title in filename');
  assert(result.filepath.includes('bigbook_secure/Tasks'), 'in Tasks dir');
  // File actually written to vfs
  assert(vfs.has(result.filepath), 'file written to vfs');
}

// ============================================================================
// updateTaskFile
// ============================================================================
console.log('\n── updateTaskFile ────────────────────────────────────');

vfsReset();
vfsAddDir(PROJECT_ROOT);
// File without existing frontmatter
vfsAddFile(`${PROJECT_ROOT}/task_new.md`, '# Bare Task\n\nBody only.');
{
  const task: any = {
    filepath: `${PROJECT_ROOT}/task_new.md`,
    content: '# Bare Task\n\nBody only.',
    title: 'Bare Task',
    status: 'In Progress',
    priority: 'medium',
    tags: [],
    frontmatter: {},
    kanban: {
      column: 'In Progress',
      boardId: 'dev',
      cardId: 'card-42',
      lastSync: new Date('2026-04-11T10:00:00Z'),
      created: null,
      completed: null,
    },
  };
  await svc.updateTaskFile(task);
  const updated = vfs.get(`${PROJECT_ROOT}/task_new.md`)!.content!;
  assert(updated.startsWith('---\n'), 'frontmatter prepended');
  assert(updated.includes('title: Bare Task'), 'title in frontmatter');
  assert(updated.includes('kanbanCardId: card-42'), 'cardId in frontmatter');
}

// File with existing frontmatter
{
  vfsAddFile(
    `${PROJECT_ROOT}/task_has.md`,
    '---\ntitle: Old\n---\n\n# Body'
  );
  const task: any = {
    filepath: `${PROJECT_ROOT}/task_has.md`,
    content: '---\ntitle: Old\n---\n\n# Body',
    title: 'New Title',
    status: 'Done',
    priority: 'low',
    tags: ['t1'],
    frontmatter: { title: 'Old' },
    kanban: { column: 'Done', boardId: 'dev', cardId: null, lastSync: null, created: null, completed: null },
  };
  await svc.updateTaskFile(task);
  const updated = vfs.get(`${PROJECT_ROOT}/task_has.md`)!.content!;
  assert(updated.includes('title: New Title'), 'title replaced');
  assert(!updated.includes('title: Old'), 'old title gone');
  assert(updated.includes('# Body'), 'body preserved');
}

// ============================================================================
// updateTaskMetadata
// ============================================================================
console.log('\n── updateTaskMetadata ────────────────────────────────');

vfsReset();
vfsAddDir(PROJECT_ROOT);
vfsAddFile(
  `${PROJECT_ROOT}/task_update.md`,
  '---\ntitle: Task To Update\n---\n\n# Task To Update\n\nBody.'
);
{
  // Discover first to get the ID
  const tasks = await svc.discoverTasks();
  const t = tasks.find((x: any) => x.filename === 'task_update.md');
  assert(t !== undefined, 'task found pre-update');

  const updated = await svc.updateTaskMetadata(t.id, { cardId: 'card-new', column: 'Done' });
  assertEq(updated.kanban.cardId, 'card-new', 'cardId updated');
  assertEq(updated.kanban.synced, true, 'synced flag set');
  assert(updated.kanban.lastSync !== null, 'lastSync populated');
}

// Missing task
await assertThrows(
  () => svc.updateTaskMetadata('nonexistent', { cardId: 'x' }),
  /not found/i,
  'missing id throws'
);

// ============================================================================
// getTaskStatistics
// ============================================================================
console.log('\n── getTaskStatistics ─────────────────────────────────');

vfsReset();
vfsAddDir(PROJECT_ROOT);
vfsAddDir(BIG_BOOK);
vfsAddFile(
  `${PROJECT_ROOT}/task_s1.md`,
  '---\ntitle: S1\nstatus: To Do\npriority: high\n---\n\n# S1'
);
vfsAddFile(
  `${PROJECT_ROOT}/task_s2.md`,
  '---\ntitle: S2\nstatus: Done\npriority: low\n---\n\n# S2'
);
vfsAddFile(
  `${BIG_BOOK}/task_s3.md`,
  '---\ntitle: S3\nstatus: Done\npriority: high\nkanbanCardId: c1\n---\n\n# S3'
);
{
  const stats = await svc.getTaskStatistics();
  assertEq(stats.total, 3, 'total=3');
  assertEq(stats.byStatus['To Do'], 1, '1 To Do');
  assertEq(stats.byStatus['Done'], 2, '2 Done');
  assertEq(stats.byPriority['high'], 2, '2 high');
  assertEq(stats.byPriority['low'], 1, '1 low');
  assertEq(stats.syncStatus.synced, 1, '1 synced');
  assertEq(stats.syncStatus.unsynced, 2, '2 unsynced');
  assertEq(stats.locations.bigBook, 1, '1 in bigbook');
  assertEq(stats.locations.projectRoot, 2, '2 in prod');
}

// ============================================================================
// searchTasks
// ============================================================================
console.log('\n── searchTasks ───────────────────────────────────────');

vfsReset();
vfsAddDir(PROJECT_ROOT);
vfsAddFile(
  `${PROJECT_ROOT}/task_a.md`,
  '---\ntitle: Alpha feature\nstatus: To Do\npriority: high\ntags:\n  - frontend\n---\n\n# Alpha'
);
vfsAddFile(
  `${PROJECT_ROOT}/task_b.md`,
  '---\ntitle: Beta bug\nstatus: Done\npriority: low\ntags:\n  - backend\n---\n\n# Beta'
);
vfsAddFile(
  `${PROJECT_ROOT}/task_c.md`,
  '---\ntitle: Gamma refactor\nstatus: In Progress\npriority: medium\ntags:\n  - backend\n  - urgent\n---\n\n# Gamma'
);

// Filter by status
{
  const r = await svc.searchTasks({ status: 'Done' });
  assertEq(r.length, 1, 'status=Done → 1');
  assertEq(r[0].title, 'Beta bug', 'Beta bug matched');
}

// Filter by priority
{
  const r = await svc.searchTasks({ priority: 'high' });
  assertEq(r.length, 1, 'priority=high → 1');
}

// Filter by tags (any match)
{
  const r = await svc.searchTasks({ tags: ['backend'] });
  assertEq(r.length, 2, 'backend → 2');
}

// Filter by synced
{
  const r = await svc.searchTasks({ synced: false });
  assertEq(r.length, 3, 'unsynced → 3');
}

// Text search
{
  const r = await svc.searchTasks({ search: 'alpha' });
  assertEq(r.length, 1, 'search alpha → 1');
  assertEq(r[0].title, 'Alpha feature', 'matched');
}

// Sort
{
  const r = await svc.searchTasks({ sortBy: 'title' });
  assertEq(r[0].title, 'Alpha feature', 'asc first = Alpha');
}
{
  const r = await svc.searchTasks({ sortBy: 'title', sortOrder: 'desc' });
  assertEq(r[0].title, 'Gamma refactor', 'desc first = Gamma');
}

// Limit
{
  const r = await svc.searchTasks({ limit: 2 });
  assertEq(r.length, 2, 'limit 2');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);

// Restore fs.promises
fsRaw.promises.readdir = origPromises.readdir;
fsRaw.promises.readFile = origPromises.readFile;
fsRaw.promises.stat = origPromises.stat;
fsRaw.promises.mkdir = origPromises.mkdir;
fsRaw.promises.writeFile = origPromises.writeFile;

process.exit(failed > 0 ? 1 : 0);
} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
