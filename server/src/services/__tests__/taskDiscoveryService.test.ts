#!/usr/bin/env npx tsx
/**
 * Unit tests for services/taskDiscoveryService.js (OMD-1074)
 *
 * Class-based service that walks the filesystem for `task_*.md` files,
 * parses YAML frontmatter, extracts Kanban metadata, and supports
 * create/update/search. External deps:
 *   - fs.promises  (readdir, readFile, writeFile, stat, mkdir)
 *   - path, js-yaml
 *   - ../utils/logger
 *
 * Strategy:
 *   - Stub logger via require.cache (both .js and .ts keys).
 *   - Patch fs.promises methods to simulate an in-memory filesystem
 *     (readdir from a map, readFile from a map, stat with mtime, etc.),
 *     save originals and restore on teardown.
 *   - No real files touched (writeFile collects into a map).
 *
 * Coverage:
 *   - shouldSkipDirectory: skip list + dot-prefix
 *   - mapStatusToColumn: direct + alias mapping
 *   - generateTaskId: base64-ish, deterministic, alnum-only
 *   - deduplicateTasks: prefer Big Book variant
 *   - getNestedValue: dotted path traversal
 *   - validateTaskData: title required, status/priority validation
 *   - parseFrontmatter: extraction, bad YAML tolerated
 *   - parseContent: title from heading, fallback from filename;
 *                   description from Objective section / first paragraph;
 *                   status inference from markers; tag extraction
 *   - extractKanbanMetadata: synced flag, cardId override
 *   - extractTaskMetadata: reads content+stats
 *   - searchDirectory: recursive walk, skip dirs, pattern filter,
 *                      ENOENT tolerated
 *   - discoverTasks: aggregates + dedupes across both roots
 *   - searchTasks: filter/sort/limit
 *   - getTaskStatistics: totals, byStatus/byPriority, locations
 *   - createTaskFile: mkdir + writeFile + metadata round-trip
 *   - updateTaskMetadata: syncs kanban fields, writes back
 *   - updateTaskFile: replaces existing FM, adds if missing
 *
 * Run: npx tsx server/src/services/__tests__/taskDiscoveryService.test.ts
 */

import * as pathMod from 'path';

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

// ── Stub logger ──────────────────────────────────────────────────────
const loggerStub = {
  info: (..._args: any[]) => {},
  warn: (..._args: any[]) => {},
  error: (..._args: any[]) => {},
  debug: (..._args: any[]) => {},
};

function stubRequireDual(relFromSUT: string, exports: any) {
  // SUT is at server/src/services/, test is at server/src/services/__tests__/
  const base = pathMod.resolve(__dirname, '..', relFromSUT);
  for (const ext of ['.js', '.ts', '']) {
    const key = base + ext;
    require.cache[key] = {
      id: key, filename: key, loaded: true, exports,
    } as any;
  }
}
stubRequireDual('../utils/logger', loggerStub);

// ── Stub js-yaml (not installed in server/node_modules) ──────────────
// Minimal parser/dumper covering the subset the SUT uses.
const yamlStub = {
  load: (str: string) => {
    const result: any = {};
    if (typeof str !== 'string') return {};
    const lines = str.split('\n');
    let currentArrayKey: string | null = null;
    for (const line of lines) {
      if (!line.trim()) { currentArrayKey = null; continue; }
      // Array item under current key
      const arrItem = line.match(/^\s+-\s*(.*)$/);
      if (arrItem && currentArrayKey) {
        result[currentArrayKey].push(arrItem[1].trim());
        continue;
      }
      currentArrayKey = null;
      const kv = line.match(/^([\w_-]+):\s*(.*)$/);
      if (!kv) continue;
      const key = kv[1];
      let rawVal = kv[2];
      if (rawVal === '') {
        result[key] = [];
        currentArrayKey = key;
      } else if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
        const inner = rawVal.slice(1, -1);
        result[key] = inner.split(',').map(s => s.trim()).filter(Boolean);
      } else if (rawVal === 'null' || rawVal === '~') {
        result[key] = null;
      } else if (/^-?\d+$/.test(rawVal)) {
        result[key] = parseInt(rawVal, 10);
      } else if (rawVal === 'true') {
        result[key] = true;
      } else if (rawVal === 'false') {
        result[key] = false;
      } else {
        if ((rawVal.startsWith('"') && rawVal.endsWith('"')) ||
            (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
          rawVal = rawVal.slice(1, -1);
        }
        result[key] = rawVal;
      }
    }
    return result;
  },
  dump: (obj: any, _opts?: any) => {
    if (!obj || typeof obj !== 'object') return '';
    let s = '';
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined) { s += `${k}: null\n`; continue; }
      if (Array.isArray(v)) {
        if (v.length === 0) s += `${k}: []\n`;
        else {
          s += `${k}:\n`;
          for (const item of v) s += `  - ${item}\n`;
        }
      } else if (v instanceof Date) {
        s += `${k}: ${v.toISOString()}\n`;
      } else if (typeof v === 'object') {
        s += `${k}:\n`;
        for (const [sk, sv] of Object.entries(v as any)) {
          s += `  ${sk}: ${sv === null ? 'null' : sv}\n`;
        }
      } else {
        s += `${k}: ${v}\n`;
      }
    }
    return s;
  },
};

// Override Module._resolveFilename so `require('js-yaml')` finds our stub
const Module = require('module');
const origResolveFilename = Module._resolveFilename;
const jsYamlStubPath = pathMod.resolve(__dirname, '__js_yaml_stub__');
Module._resolveFilename = function (request: string, ...args: any[]) {
  if (request === 'js-yaml') return jsYamlStubPath;
  return origResolveFilename.call(this, request, ...args);
};
require.cache[jsYamlStubPath] = {
  id: jsYamlStubPath, filename: jsYamlStubPath, loaded: true, exports: yamlStub,
} as any;

// ── In-memory FS state ───────────────────────────────────────────────
type Entry = { name: string; isDirectory: () => boolean; isFile: () => boolean };

// dir -> list of entries
let fsDirs: Record<string, Entry[]> = {};
// filepath -> content
let fsFiles: Record<string, string> = {};
// writes captured
let fsWrites: { path: string; content: string }[] = [];
// mkdir calls captured
let fsMkdirs: { path: string; opts: any }[] = [];

function dirEntry(name: string): Entry {
  return { name, isDirectory: () => true, isFile: () => false };
}
function fileEntry(name: string): Entry {
  return { name, isDirectory: () => false, isFile: () => true };
}

// Save originals
const fs = require('fs');
const origMkdir = fs.promises.mkdir;
const origReaddir = fs.promises.readdir;
const origReadFile = fs.promises.readFile;
const origWriteFile = fs.promises.writeFile;
const origStat = fs.promises.stat;

function patchFs() {
  fs.promises.readdir = async (p: string, opts?: any) => {
    const entries = fsDirs[p];
    if (!entries) {
      const err: any = new Error('ENOENT: no such dir ' + p);
      err.code = 'ENOENT';
      throw err;
    }
    if (opts && opts.withFileTypes) return entries;
    return entries.map(e => e.name);
  };
  fs.promises.readFile = async (p: string, _enc?: any) => {
    if (p in fsFiles) return fsFiles[p];
    const err: any = new Error('ENOENT: no such file ' + p);
    err.code = 'ENOENT';
    throw err;
  };
  fs.promises.stat = async (p: string) => {
    if (p in fsFiles) {
      return {
        birthtime: new Date('2026-01-01T00:00:00Z'),
        mtime: new Date('2026-02-01T00:00:00Z'),
        size: fsFiles[p].length,
        isFile: () => true,
        isDirectory: () => false,
      };
    }
    const err: any = new Error('ENOENT stat ' + p);
    err.code = 'ENOENT';
    throw err;
  };
  fs.promises.writeFile = async (p: string, content: string, _enc?: any) => {
    fsWrites.push({ path: p, content });
    fsFiles[p] = content;
  };
  fs.promises.mkdir = async (p: string, opts?: any) => {
    fsMkdirs.push({ path: p, opts });
    return undefined;
  };
}

function restoreFs() {
  fs.promises.mkdir = origMkdir;
  fs.promises.readdir = origReaddir;
  fs.promises.readFile = origReadFile;
  fs.promises.writeFile = origWriteFile;
  fs.promises.stat = origStat;
}

function resetFs() {
  fsDirs = {};
  fsFiles = {};
  fsWrites = [];
  fsMkdirs = [];
}

const TaskDiscoveryService = require('../taskDiscoveryService');

async function main() {
  patchFs();

// ============================================================================
// shouldSkipDirectory
// ============================================================================
console.log('\n── shouldSkipDirectory ───────────────────────────────────');
const svc = new TaskDiscoveryService();

assertEq(svc.shouldSkipDirectory('node_modules'), true, 'node_modules');
assertEq(svc.shouldSkipDirectory('.git'), true, '.git');
assertEq(svc.shouldSkipDirectory('dist'), true, 'dist');
assertEq(svc.shouldSkipDirectory('build'), true, 'build');
assertEq(svc.shouldSkipDirectory('logs'), true, 'logs');
assertEq(svc.shouldSkipDirectory('.hidden'), true, 'dot-prefix');
assertEq(svc.shouldSkipDirectory('src'), false, 'src kept');
assertEq(svc.shouldSkipDirectory('Tasks'), false, 'Tasks kept');

// ============================================================================
// mapStatusToColumn
// ============================================================================
console.log('\n── mapStatusToColumn ─────────────────────────────────────');

assertEq(svc.mapStatusToColumn('To Do'), 'To Do', 'To Do direct');
assertEq(svc.mapStatusToColumn('In Progress'), 'In Progress', 'In Progress direct');
assertEq(svc.mapStatusToColumn('Review'), 'Review', 'Review direct');
assertEq(svc.mapStatusToColumn('Done'), 'Done', 'Done direct');
assertEq(svc.mapStatusToColumn('Completed'), 'Done', 'Completed → Done');
assertEq(svc.mapStatusToColumn('Finished'), 'Done', 'Finished → Done');
assertEq(svc.mapStatusToColumn('Unknown'), 'To Do', 'Unknown → To Do');

// ============================================================================
// generateTaskId
// ============================================================================
console.log('\n── generateTaskId ────────────────────────────────────────');

const id1 = svc.generateTaskId('/var/www/orthodoxmetrics/prod/tasks/task_hello.md');
const id2 = svc.generateTaskId('/var/www/orthodoxmetrics/prod/tasks/task_hello.md');
const id3 = svc.generateTaskId('/var/www/orthodoxmetrics/prod/tasks/task_world.md');

assertEq(id1, id2, 'deterministic');
assert(id1 !== id3, 'different paths → different ids');
assert(/^[a-zA-Z0-9]{1,16}$/.test(id1), 'alnum chars only, ≤16');

// ============================================================================
// deduplicateTasks
// ============================================================================
console.log('\n── deduplicateTasks ──────────────────────────────────────');

const tasksDup = [
  { filename: 'task_foo.md', filepath: '/var/www/orthodoxmetrics/prod/task_foo.md' },
  { filename: 'task_foo.md', filepath: '/mnt/bigbook_secure/Tasks/task_foo.md' },
  { filename: 'task_bar.md', filepath: '/var/www/orthodoxmetrics/prod/task_bar.md' },
];
const unique = svc.deduplicateTasks(tasksDup);
assertEq(unique.length, 2, '2 unique');
const foo = unique.find((t: any) => t.filename === 'task_foo.md');
assert(foo.filepath.includes('bigbook_secure'), 'prefers Big Book variant');

// Reverse order (project-root first, then bigbook) also prefers bigbook
const tasksDup2 = [
  { filename: 'task_a.md', filepath: '/mnt/bigbook_secure/task_a.md' },
  { filename: 'task_a.md', filepath: '/var/www/orthodoxmetrics/prod/task_a.md' },
];
const u2 = svc.deduplicateTasks(tasksDup2);
assertEq(u2.length, 1, '1 unique');
assert(u2[0].filepath.includes('bigbook_secure'), 'keeps bigbook when seen first');

// Case-insensitive match
const tasksDup3 = [
  { filename: 'Task_X.md', filepath: '/a' },
  { filename: 'task_x.md', filepath: '/b' },
];
const u3 = svc.deduplicateTasks(tasksDup3);
assertEq(u3.length, 1, 'case-insensitive dedupe');

// ============================================================================
// getNestedValue
// ============================================================================
console.log('\n── getNestedValue ────────────────────────────────────────');

const obj = { kanban: { column: 'To Do', nested: { deep: 42 } }, title: 'Hi' };
assertEq(svc.getNestedValue(obj, 'title'), 'Hi', 'top-level');
assertEq(svc.getNestedValue(obj, 'kanban.column'), 'To Do', 'nested 1');
assertEq(svc.getNestedValue(obj, 'kanban.nested.deep'), 42, 'nested 2');
assertEq(svc.getNestedValue(obj, 'missing.path'), undefined, 'missing → undefined');

// ============================================================================
// validateTaskData
// ============================================================================
console.log('\n── validateTaskData ──────────────────────────────────────');

assertEq(svc.validateTaskData({ title: 'Hello' }), [], 'valid minimal');
assertEq(svc.validateTaskData({ title: '' }).length, 1, 'empty title');
assertEq(svc.validateTaskData({}).length, 1, 'missing title');
assertEq(svc.validateTaskData({ title: '   ' }).length, 1, 'whitespace title');

const badStatus = svc.validateTaskData({ title: 'X', status: 'Bogus' });
assertEq(badStatus.length, 1, '1 error for bad status');
assert(badStatus[0].includes('Invalid status'), 'error mentions status');

const badPri = svc.validateTaskData({ title: 'X', priority: 'urgent' });
assertEq(badPri.length, 1, '1 error for bad priority');
assert(badPri[0].includes('Invalid priority'), 'error mentions priority');

const multipleErrs = svc.validateTaskData({ title: '', priority: 'urgent' });
assertEq(multipleErrs.length, 2, '2 errors');

assertEq(
  svc.validateTaskData({ title: 'OK', status: 'To Do', priority: 'high' }),
  [],
  'all valid'
);

// ============================================================================
// parseFrontmatter
// ============================================================================
console.log('\n── parseFrontmatter ──────────────────────────────────────');

{
  const content = `---
title: Test Task
status: In Progress
priority: high
tags:
  - foo
  - bar
description: hello world
---
body
`;
  const md: any = { frontmatter: {}, tags: [] };
  svc.parseFrontmatter(content, md);
  assertEq(md.title, 'Test Task', 'title from FM');
  assertEq(md.status, 'In Progress', 'status from FM');
  assertEq(md.priority, 'high', 'priority from FM');
  assertEq(md.description, 'hello world', 'description from FM');
  assertEq(md.tags, ['foo', 'bar'], 'tags array');
}

// Single tag (not array)
{
  const md: any = { frontmatter: {}, tags: [] };
  svc.parseFrontmatter('---\ntags: solo\n---\nx', md);
  assertEq(md.tags, ['solo'], 'single tag wrapped');
}

// No frontmatter → no-op
{
  const md: any = { frontmatter: {}, tags: [], title: 'original' };
  svc.parseFrontmatter('just body no frontmatter', md);
  assertEq(md.title, 'original', 'no FM → untouched');
}

// Malformed YAML: logged warn, caught
{
  const md: any = { frontmatter: {}, tags: [] };
  svc.parseFrontmatter('---\n  invalid: [unclosed\n---\n', md);
  assert(true, 'malformed YAML does not throw');
}

// ============================================================================
// parseContent
// ============================================================================
console.log('\n── parseContent ──────────────────────────────────────────');

// Title from H1
{
  const md: any = { title: '', description: '', status: 'To Do', tags: [], filename: 'task_foo.md' };
  svc.parseContent('# My Task\n\nSome desc\n', md);
  assertEq(md.title, 'My Task', 'title from H1');
}

// Title fallback from filename
{
  const md: any = { title: '', description: '', status: 'To Do', tags: [], filename: 'task_my_cool_thing.md' };
  svc.parseContent('no heading, just text', md);
  assertEq(md.title, 'My Cool Thing', 'title from filename fallback');
}

// Description from Objective section
{
  const md: any = { title: 'T', description: '', status: 'To Do', tags: [], filename: 'task_x.md' };
  svc.parseContent('# T\n\n## Objective\n\nThis is the goal.\n\n# Next', md);
  assertEq(md.description, 'This is the goal.', 'description from Objective');
}

// Description from first paragraph fallback
{
  const md: any = { title: 'T', description: '', status: 'To Do', tags: [], filename: 'task_x.md' };
  svc.parseContent('# T\n\nFirst para here.\n\nSecond para.', md);
  assertEq(md.description, 'First para here.', 'first paragraph fallback');
}

// Status inference: Done from ✅
{
  const md: any = { title: 'T', description: 'D', status: 'To Do', tags: [], filename: 'task_x.md' };
  svc.parseContent('# T\n\nD\n\nTask ✅ completed', md);
  assertEq(md.status, 'Done', 'Done from ✅');
}

// Status inference: In Progress
{
  const md: any = { title: 'T', description: 'D', status: 'To Do', tags: [], filename: 'task_x.md' };
  svc.parseContent('# T\n\nD\n\n🔄 in progress now', md);
  assertEq(md.status, 'In Progress', 'In Progress inferred');
}

// Status inference: Review
{
  const md: any = { title: 'T', description: 'D', status: 'To Do', tags: [], filename: 'task_x.md' };
  svc.parseContent('# T\n\nD\n\n👀 needs review', md);
  assertEq(md.status, 'Review', 'Review inferred');
}

// Status override skipped if already set (not To Do)
{
  const md: any = { title: 'T', description: 'D', status: 'Done', tags: [], filename: 'task_x.md' };
  svc.parseContent('# T\n\nD\n\n🔄 in progress', md);
  assertEq(md.status, 'Done', 'non-To Do status untouched');
}

// Tag extraction from content
{
  const md: any = { title: 'T', description: 'D', status: 'To Do', tags: ['existing'], filename: 'task_x.md' };
  svc.parseContent('# T\n\nD\n\nTags: #backend #urgent', md);
  assert(md.tags.includes('backend'), 'backend tag');
  assert(md.tags.includes('urgent'), 'urgent tag');
  assert(md.tags.includes('existing'), 'existing preserved');
}

// Deduped tag merge
{
  const md: any = { title: 'T', description: 'D', status: 'To Do', tags: ['foo'], filename: 'task_x.md' };
  svc.parseContent('# T\n\nContent with #foo tag', md);
  assertEq(md.tags.filter((t: string) => t === 'foo').length, 1, 'no dup tags');
}

// ============================================================================
// extractKanbanMetadata
// ============================================================================
console.log('\n── extractKanbanMetadata ─────────────────────────────────');

{
  const md: any = {
    status: 'In Progress',
    frontmatter: {
      kanbanCardId: 'card-42',
      kanbanBoard: 'qa',
      kanbanStatus: 'Review',
    },
    kanban: { synced: false, cardId: null, boardId: 'dev', column: 'To Do', lastSync: null, syncErrors: [] },
  };
  svc.extractKanbanMetadata(md);
  assertEq(md.kanban.cardId, 'card-42', 'cardId from FM');
  assertEq(md.kanban.boardId, 'qa', 'boardId from FM');
  assertEq(md.kanban.column, 'Review', 'column from FM (kept since cardId set)');
  assertEq(md.kanban.synced, true, 'synced with cardId');
}

// No cardId → column mapped from status
{
  const md: any = {
    status: 'Done',
    frontmatter: {},
    kanban: { synced: false, cardId: null, boardId: 'dev', column: 'To Do', lastSync: null, syncErrors: [] },
  };
  svc.extractKanbanMetadata(md);
  assertEq(md.kanban.column, 'Done', 'column mapped from status');
  assertEq(md.kanban.synced, false, 'unsynced without cardId');
}

// Legacy kanban object in FM merged
{
  const md: any = {
    status: 'To Do',
    frontmatter: { kanban: { boardId: 'legacy', cardId: 'old' } },
    kanban: { synced: false, cardId: null, boardId: 'dev', column: 'To Do', lastSync: null, syncErrors: [] },
  };
  svc.extractKanbanMetadata(md);
  assertEq(md.kanban.boardId, 'legacy', 'legacy boardId merged');
  assertEq(md.kanban.cardId, 'old', 'legacy cardId merged');
}

// ============================================================================
// extractTaskMetadata
// ============================================================================
console.log('\n── extractTaskMetadata ───────────────────────────────────');

resetFs();
fsFiles['/var/www/orthodoxmetrics/prod/task_hello.md'] =
  '---\ntitle: Hello World\npriority: high\n---\n\n# Hello World\n\n## Objective\n\nDo stuff.\n';

{
  const md = await svc.extractTaskMetadata('/var/www/orthodoxmetrics/prod/task_hello.md');
  assert(md !== null, 'not null');
  assertEq(md.title, 'Hello World', 'title');
  assertEq(md.priority, 'high', 'priority');
  assertEq(md.description, 'Do stuff.', 'description from Objective');
  assertEq(md.filename, 'task_hello.md', 'filename');
  assertEq(md.kanban.synced, false, 'not synced');
  assert(typeof md.id === 'string' && md.id.length > 0, 'has id');
}

// ENOENT → null
{
  const md = await svc.extractTaskMetadata('/nonexistent/task_x.md');
  assertEq(md, null, 'missing file → null');
}

// ============================================================================
// searchDirectory
// ============================================================================
console.log('\n── searchDirectory ───────────────────────────────────────');

resetFs();
fsDirs['/root'] = [
  fileEntry('task_a.md'),
  fileEntry('readme.md'),         // not a task_
  dirEntry('sub'),
  dirEntry('node_modules'),       // skipped
  dirEntry('.git'),               // skipped
];
fsDirs['/root/sub'] = [
  fileEntry('task_b.md'),
  fileEntry('notes.txt'),
];
fsDirs['/root/node_modules'] = [fileEntry('task_evil.md')];
fsDirs['/root/.git'] = [fileEntry('task_evil2.md')];
fsFiles['/root/task_a.md'] = '# A\n';
fsFiles['/root/sub/task_b.md'] = '# B\n';

{
  const found = await svc.searchDirectory('/root');
  assertEq(found.length, 2, '2 task files');
  const names = found.map((t: any) => t.filename).sort();
  assertEq(names, ['task_a.md', 'task_b.md'], 'task_a and task_b found');
}

// ENOENT dir tolerated
{
  const found = await svc.searchDirectory('/nonexistent');
  assertEq(found, [], 'missing dir → empty');
}

// ============================================================================
// discoverTasks
// ============================================================================
console.log('\n── discoverTasks ─────────────────────────────────────────');

resetFs();
// Project root has task_foo.md
fsDirs['/var/www/orthodoxmetrics/prod'] = [fileEntry('task_foo.md'), dirEntry('src')];
fsDirs['/var/www/orthodoxmetrics/prod/src'] = [];
fsFiles['/var/www/orthodoxmetrics/prod/task_foo.md'] = '# Foo\n';
// Big Book has task_foo.md (dup) and task_bar.md
fsDirs['/mnt/bigbook_secure'] = [fileEntry('task_foo.md'), fileEntry('task_bar.md')];
fsFiles['/mnt/bigbook_secure/task_foo.md'] = '# Foo BB\n';
fsFiles['/mnt/bigbook_secure/task_bar.md'] = '# Bar\n';

{
  const all = await svc.discoverTasks();
  assertEq(all.length, 2, '2 unique');
  const foo = all.find((t: any) => t.filename === 'task_foo.md');
  assert(foo.filepath.includes('bigbook_secure'), 'foo from Big Book preferred');
}

// ============================================================================
// searchTasks
// ============================================================================
console.log('\n── searchTasks ───────────────────────────────────────────');

resetFs();
fsDirs['/var/www/orthodoxmetrics/prod'] = [
  fileEntry('task_alpha.md'),
  fileEntry('task_beta.md'),
  fileEntry('task_gamma.md'),
];
fsDirs['/mnt/bigbook_secure'] = [];
fsFiles['/var/www/orthodoxmetrics/prod/task_alpha.md'] =
  '---\ntitle: Alpha Task\nstatus: Done\npriority: high\ntags: [backend]\n---\n# Alpha\n';
fsFiles['/var/www/orthodoxmetrics/prod/task_beta.md'] =
  '---\ntitle: Beta Task\nstatus: In Progress\npriority: medium\ntags: [frontend]\n---\n# Beta\n';
fsFiles['/var/www/orthodoxmetrics/prod/task_gamma.md'] =
  '---\ntitle: Gamma Task\nstatus: Done\npriority: low\ntags: [backend, devops]\n---\n# Gamma\n';

// status filter
{
  const r = await svc.searchTasks({ status: 'Done' });
  assertEq(r.length, 2, '2 Done');
}

// priority filter
{
  const r = await svc.searchTasks({ priority: 'high' });
  assertEq(r.length, 1, '1 high');
  assertEq(r[0].title, 'Alpha Task', 'Alpha');
}

// tags filter (any-of)
{
  const r = await svc.searchTasks({ tags: ['devops'] });
  assertEq(r.length, 1, '1 with devops');
  assertEq(r[0].title, 'Gamma Task', 'Gamma');
}

// synced filter
{
  const r = await svc.searchTasks({ synced: false });
  assertEq(r.length, 3, 'all unsynced');
}

// text search
{
  const r = await svc.searchTasks({ search: 'alpha' });
  assertEq(r.length, 1, '1 match');
}

// sortBy title asc
{
  const r = await svc.searchTasks({ sortBy: 'title' });
  assertEq(r[0].title, 'Alpha Task', 'first Alpha');
  assertEq(r[2].title, 'Gamma Task', 'last Gamma');
}

// sortBy desc
{
  const r = await svc.searchTasks({ sortBy: 'title', sortOrder: 'desc' });
  assertEq(r[0].title, 'Gamma Task', 'first Gamma');
  assertEq(r[2].title, 'Alpha Task', 'last Alpha');
}

// limit
{
  const r = await svc.searchTasks({ limit: 2 });
  assertEq(r.length, 2, 'limited to 2');
}

// ============================================================================
// getTaskStatistics
// ============================================================================
console.log('\n── getTaskStatistics ─────────────────────────────────────');

{
  const stats = await svc.getTaskStatistics();
  assertEq(stats.total, 3, 'total 3');
  assertEq(stats.byStatus['Done'], 2, '2 Done');
  assertEq(stats.byStatus['In Progress'], 1, '1 In Progress');
  assertEq(stats.byPriority['high'], 1, '1 high');
  assertEq(stats.byPriority['medium'], 1, '1 medium');
  assertEq(stats.byPriority['low'], 1, '1 low');
  assertEq(stats.syncStatus.synced, 0, '0 synced');
  assertEq(stats.syncStatus.unsynced, 3, '3 unsynced');
  assertEq(stats.locations.projectRoot, 3, '3 in project root');
  assertEq(stats.locations.bigBook, 0, '0 in BB');
}

// ============================================================================
// createTaskFile
// ============================================================================
console.log('\n── createTaskFile ────────────────────────────────────────');

resetFs();
fsDirs['/mnt/bigbook_secure'] = [];
{
  const result = await svc.createTaskFile({
    title: 'Do the Thing',
    description: 'Must be done',
    status: 'To Do',
    priority: 'high',
    tags: ['urgent'],
  });
  assert(result !== null, 'result returned');
  assertEq(result.title, 'Do the Thing', 'title round-trip');
  assertEq(result.priority, 'high', 'priority round-trip');
  // mkdir called for Tasks subdir
  assertEq(fsMkdirs.length, 1, 'one mkdir');
  assert(fsMkdirs[0].path.includes('Tasks'), 'mkdir Tasks');
  assertEq(fsMkdirs[0].opts.recursive, true, 'recursive');
  // writeFile called
  assertEq(fsWrites.length, 1, 'one writeFile');
  assert(fsWrites[0].path.includes('task_do_the_thing.md'), 'sanitized filename');
  assert(fsWrites[0].content.includes('# Do the Thing'), 'content has heading');
  assert(fsWrites[0].content.includes('---\n'), 'has frontmatter');
}

// Sanitization: punctuation stripped, spaces → underscores
resetFs();
fsDirs['/mnt/bigbook_secure'] = [];
{
  await svc.createTaskFile({ title: 'Fix! the: bug?', description: 'x' });
  assert(
    fsWrites[0].path.includes('task_fix_the_bug.md'),
    'punctuation stripped'
  );
}

// ============================================================================
// updateTaskFile (direct)
// ============================================================================
console.log('\n── updateTaskFile ────────────────────────────────────────');

// Replaces existing FM
resetFs();
{
  const task: any = {
    content: '---\ntitle: Old\n---\n\n# Old\n',
    filepath: '/tmp/task_x.md',
    frontmatter: { title: 'Old' },
    title: 'New',
    status: 'Done',
    priority: 'high',
    tags: ['a'],
    kanban: { column: 'Done', boardId: 'dev', cardId: 'c1', lastSync: null },
  };
  await svc.updateTaskFile(task);
  assertEq(fsWrites.length, 1, 'one write');
  const written = fsWrites[0].content;
  assert(written.includes('title: New'), 'new title');
  assert(written.includes('kanbanCardId: c1'), 'kanban cardId');
  assert(written.includes('# Old'), 'body preserved');
}

// Adds FM when missing
resetFs();
{
  const task: any = {
    content: '# Just a body\n\nNo frontmatter here.\n',
    filepath: '/tmp/task_y.md',
    frontmatter: {},
    title: 'Y',
    status: 'To Do',
    priority: 'medium',
    tags: [],
    kanban: { column: 'To Do', boardId: 'dev', cardId: null, lastSync: null },
  };
  await svc.updateTaskFile(task);
  const written = fsWrites[0].content;
  assert(written.startsWith('---\n'), 'prepended FM');
  assert(written.includes('# Just a body'), 'body preserved');
}

// ============================================================================
// updateTaskMetadata
// ============================================================================
console.log('\n── updateTaskMetadata ────────────────────────────────────');

resetFs();
fsDirs['/var/www/orthodoxmetrics/prod'] = [fileEntry('task_u.md')];
fsDirs['/mnt/bigbook_secure'] = [];
fsFiles['/var/www/orthodoxmetrics/prod/task_u.md'] =
  '---\ntitle: U\n---\n# U\n';

{
  // discover once so we know the id
  const all = await svc.discoverTasks();
  const id = all[0].id;
  const updated = await svc.updateTaskMetadata(id, { cardId: 'card-99', column: 'Done' });
  assertEq(updated.kanban.cardId, 'card-99', 'cardId set');
  assertEq(updated.kanban.column, 'Done', 'column set');
  assertEq(updated.kanban.synced, true, 'synced flag set');
  assert(updated.kanban.lastSync instanceof Date, 'lastSync is Date');
}

// Missing id throws
{
  let err: Error | null = null;
  try {
    await svc.updateTaskMetadata('nosuchid', { cardId: 'x' });
  } catch (e: any) { err = e; }
  assert(err !== null, 'throws');
  assert(err !== null && err.message.includes('not found'), 'error mentions not found');
}

// ============================================================================
// Summary
// ============================================================================
restoreFs();
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main()

main().catch((e) => {
  restoreFs();
  console.error('Unhandled test error:', e);
  process.exit(1);
});
