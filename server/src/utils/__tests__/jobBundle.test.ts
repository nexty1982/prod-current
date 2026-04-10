#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/jobBundle.ts (OMD-884)
 *
 * Covers:
 *   - getJobBundleDir       (with UPLOAD_BASE_PATH override)
 *   - tryReadManifest       (returns null when missing)
 *   - readManifest          (creates default when missing)
 *   - writeManifest         (partial updates, status preservation)
 *   - readDrafts            (creates default when missing)
 *   - writeDrafts           (recalculates draftCounts)
 *   - upsertDraftEntries    (insert, update by entry_index, sort,
 *                            preserve committed_record_id/commit_error)
 *
 * Tests use UPLOAD_BASE_PATH env override pointing to a tmp directory.
 *
 * Run: npx tsx server/src/utils/__tests__/jobBundle.test.ts
 *
 * Exits non-zero on any failure.
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';

// Set UPLOAD_BASE_PATH BEFORE importing the module so getJobBundleDir
// resolves to the tmp directory.
const tmpRoot = path.join(os.tmpdir(), `omd-884-jobbundle-${Date.now()}-${Math.random().toString(36).slice(2)}`);
fsSync.mkdirSync(tmpRoot, { recursive: true });
process.env.UPLOAD_BASE_PATH = tmpRoot;

import {
  getJobBundleDir,
  tryReadManifest,
  readManifest,
  writeManifest,
  readDrafts,
  writeDrafts,
  upsertDraftEntries,
  Manifest,
  DraftEntry,
  DraftsFile,
} from '../jobBundle';

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

async function runAsyncTests() {
  // ──────────────────────────────────────────────────────────────────────
  // getJobBundleDir
  // ──────────────────────────────────────────────────────────────────────
  console.log('\n── getJobBundleDir ───────────────────────────────────────');

  const dir1 = getJobBundleDir(46, 100);
  assertEq(
    dir1,
    path.join(tmpRoot, 'om_church_46', 'jobs', '100'),
    'church 46 / job 100 → tmpRoot/om_church_46/jobs/100'
  );

  // String jobId
  const dir2 = getJobBundleDir(7, 'abc-123');
  assertEq(
    dir2,
    path.join(tmpRoot, 'om_church_7', 'jobs', 'abc-123'),
    'string jobId works'
  );

  // Numeric jobId converts to string in path
  const dir3 = getJobBundleDir(1, 42);
  assert(dir3.endsWith(path.join('jobs', '42')), 'numeric jobId → string in path');

  // ──────────────────────────────────────────────────────────────────────
  // tryReadManifest — missing
  // ──────────────────────────────────────────────────────────────────────
  console.log('\n── tryReadManifest ───────────────────────────────────────');

  const missingManifest = await tryReadManifest(99, 'never-existed');
  assertEq(missingManifest, null, 'missing manifest → null');

  // ──────────────────────────────────────────────────────────────────────
  // readManifest — creates default
  // ──────────────────────────────────────────────────────────────────────
  console.log('\n── readManifest ──────────────────────────────────────────');

  const churchA = 100;
  const jobA = 'job-A';
  const manifestA = await readManifest(churchA, jobA);
  assertEq(manifestA.jobId, 'job-A', 'default: jobId');
  assertEq(manifestA.churchId, 100, 'default: churchId');
  assertEq(manifestA.recordType, 'baptism', 'default: recordType baptism');
  assertEq(manifestA.status, 'pending', 'default: status pending');
  assertEq(manifestA.page_year, null, 'default: page_year null');
  assertEq(
    manifestA.draftCounts,
    { draft: 0, in_review: 0, finalized: 0, committed: 0 },
    'default: draftCounts all zero'
  );
  assertEq(
    manifestA.paths,
    { drafts: 'drafts.json', header: 'header_ocr.json', layout: 'layout.json' },
    'default: paths'
  );
  assert(typeof manifestA.updatedAt === 'string' && manifestA.updatedAt.includes('T'), 'default: updatedAt is ISO');

  // Creating default also creates the bundle dir + stub files
  const bundleDirA = getJobBundleDir(churchA, jobA);
  assert(fsSync.existsSync(path.join(bundleDirA, 'manifest.json')), 'manifest.json created');
  assert(fsSync.existsSync(path.join(bundleDirA, 'header_ocr.json')), 'header_ocr.json stub created');
  assert(fsSync.existsSync(path.join(bundleDirA, 'layout.json')), 'layout.json stub created');

  // tryReadManifest now returns the existing one
  const reread = await tryReadManifest(churchA, jobA);
  assert(reread !== null, 'tryReadManifest after default creation → not null');
  assertEq(reread?.jobId, 'job-A', 'reread: jobId matches');

  // readManifest with custom defaults
  const churchB = 200;
  const jobB = 'job-B';
  const manifestB = await readManifest(churchB, jobB, {
    recordType: 'marriage',
    page_year: 1925,
  });
  assertEq(manifestB.recordType, 'marriage', 'custom default: recordType marriage');
  assertEq(manifestB.page_year, 1925, 'custom default: page_year');
  assertEq(manifestB.status, 'pending', 'custom default: status still pending');

  // readManifest reads existing instead of creating new (idempotent)
  const manifestBAgain = await readManifest(churchB, jobB);
  assertEq(manifestBAgain.recordType, 'marriage', 'idempotent: still marriage');
  assertEq(manifestBAgain.page_year, 1925, 'idempotent: page_year preserved');

  // ──────────────────────────────────────────────────────────────────────
  // writeManifest — partial updates
  // ──────────────────────────────────────────────────────────────────────
  console.log('\n── writeManifest ─────────────────────────────────────────');

  // Update status on existing manifest
  const updatedB = await writeManifest(churchB, jobB, { status: 'processing' });
  assertEq(updatedB.status, 'processing', 'writeManifest: status updated to processing');
  assertEq(updatedB.recordType, 'marriage', 'writeManifest: recordType preserved');
  assertEq(updatedB.page_year, 1925, 'writeManifest: page_year preserved');
  assertEq(updatedB.churchId, 200, 'writeManifest: churchId preserved');

  // Verify persisted
  const reReadB = await tryReadManifest(churchB, jobB);
  assertEq(reReadB?.status, 'processing', 'persisted: status processing');

  // Update draftCounts
  const updatedB2 = await writeManifest(churchB, jobB, {
    draftCounts: { draft: 5, in_review: 2, finalized: 1, committed: 0 },
  });
  assertEq(
    updatedB2.draftCounts,
    { draft: 5, in_review: 2, finalized: 1, committed: 0 },
    'writeManifest: draftCounts updated'
  );
  assertEq(updatedB2.status, 'processing', 'writeManifest: status preserved when only draftCounts updated');

  // writeManifest creates the manifest if it doesn't exist (using updates as defaults)
  const churchC = 300;
  const jobC = 'job-C';
  const newC = await writeManifest(churchC, jobC, { recordType: 'funeral', status: 'completed' });
  assertEq(newC.recordType, 'funeral', 'create-on-write: recordType from updates');
  assertEq(newC.status, 'completed', 'create-on-write: status from updates');
  assertEq(newC.churchId, 300, 'create-on-write: churchId from arg');

  // ──────────────────────────────────────────────────────────────────────
  // readDrafts — creates default
  // ──────────────────────────────────────────────────────────────────────
  console.log('\n── readDrafts ────────────────────────────────────────────');

  const churchD = 400;
  const jobD = 'job-D';
  const draftsD = await readDrafts(churchD, jobD);
  assertEq(draftsD.jobId, 'job-D', 'default drafts: jobId');
  assertEq(draftsD.churchId, 400, 'default drafts: churchId');
  assertEq(draftsD.recordType, 'baptism', 'default drafts: recordType baptism');
  assertEq(draftsD.entries, [], 'default drafts: empty entries');

  // drafts.json file exists
  assert(fsSync.existsSync(path.join(getJobBundleDir(churchD, jobD), 'drafts.json')), 'drafts.json created');

  // readDrafts is idempotent
  const draftsDAgain = await readDrafts(churchD, jobD);
  assertEq(draftsDAgain.entries, [], 'readDrafts idempotent');

  // ──────────────────────────────────────────────────────────────────────
  // writeDrafts — recalculates draftCounts
  // ──────────────────────────────────────────────────────────────────────
  console.log('\n── writeDrafts ───────────────────────────────────────────');

  const churchE = 500;
  const jobE = 'job-E';
  // Initialize manifest first
  await readManifest(churchE, jobE);

  const draftsE: DraftsFile = {
    jobId: String(jobE),
    churchId: churchE,
    recordType: 'baptism',
    entries: [
      {
        entry_index: 0,
        workflow_status: 'draft',
        record_number: '001',
        payload: { name: 'John' },
        bbox: {},
        updatedAt: new Date().toISOString(),
      },
      {
        entry_index: 1,
        workflow_status: 'in_review',
        record_number: '002',
        payload: { name: 'Jane' },
        bbox: {},
        updatedAt: new Date().toISOString(),
      },
      {
        entry_index: 2,
        workflow_status: 'finalized',
        record_number: '003',
        payload: { name: 'Bob' },
        bbox: {},
        updatedAt: new Date().toISOString(),
      },
      {
        entry_index: 3,
        workflow_status: 'committed',
        record_number: '004',
        payload: { name: 'Alice' },
        bbox: {},
        updatedAt: new Date().toISOString(),
      },
      {
        entry_index: 4,
        workflow_status: 'draft',
        record_number: '005',
        payload: { name: 'Charlie' },
        bbox: {},
        updatedAt: new Date().toISOString(),
      },
    ],
  };
  await writeDrafts(churchE, jobE, draftsE);

  // Verify drafts written
  const reReadDrafts = await readDrafts(churchE, jobE);
  assertEq(reReadDrafts.entries.length, 5, 'writeDrafts: 5 entries persisted');

  // Verify manifest draftCounts updated
  const manifestE = await tryReadManifest(churchE, jobE);
  assertEq(
    manifestE?.draftCounts,
    { draft: 2, in_review: 1, finalized: 1, committed: 1 },
    'writeDrafts: draftCounts recalculated correctly'
  );

  // ──────────────────────────────────────────────────────────────────────
  // upsertDraftEntries — insert, update, sort, preserve commit fields
  // ──────────────────────────────────────────────────────────────────────
  console.log('\n── upsertDraftEntries ────────────────────────────────────');

  const churchF = 600;
  const jobF = 'job-F';

  // Insert two new entries
  const insertResult = await upsertDraftEntries(churchF, jobF, [
    {
      entry_index: 5,
      record_number: 'r-5',
      payload_json: { name: 'Eve' },
      bbox_json: { entryBbox: { x: 0.1, y: 0.1, w: 0.5, h: 0.2 } },
    },
    {
      entry_index: 1,
      record_number: 'r-1',
      payload_json: { name: 'Adam' },
    },
  ]);
  assertEq(insertResult.entries.length, 2, 'insert: 2 entries');
  // Sorted by entry_index ascending
  assertEq(insertResult.entries[0].entry_index, 1, 'sorted: entry_index 1 first');
  assertEq(insertResult.entries[1].entry_index, 5, 'sorted: entry_index 5 second');
  assertEq(insertResult.entries[0].workflow_status, 'draft', 'default workflow_status: draft');
  assertEq(insertResult.entries[0].record_number, 'r-1', 'record_number set');
  assertEq(insertResult.entries[1].bbox.entryBbox?.x, 0.1, 'bbox preserved');

  // Update existing entry (entry_index 1)
  const updateResult = await upsertDraftEntries(churchF, jobF, [
    {
      entry_index: 1,
      payload_json: { name: 'Adam Updated' },
      workflow_status: 'in_review',
    },
  ]);
  assertEq(updateResult.entries.length, 2, 'update: still 2 entries (no insert)');
  const entry1 = updateResult.entries.find(e => e.entry_index === 1);
  assertEq(entry1?.workflow_status, 'in_review', 'update: workflow_status changed');
  assertEq(entry1?.payload.name, 'Adam Updated', 'update: payload changed');

  // Add committed_record_id to entry 1 manually, then verify upsert preserves it
  const draftsF = await readDrafts(churchF, jobF);
  const e1 = draftsF.entries.find(e => e.entry_index === 1)!;
  e1.committed_record_id = 12345;
  e1.commit_error = null;
  await writeDrafts(churchF, jobF, draftsF);

  // Update entry 1 again — committed_record_id must be preserved
  const preserveResult = await upsertDraftEntries(churchF, jobF, [
    {
      entry_index: 1,
      payload_json: { name: 'Adam Updated Again' },
    },
  ]);
  const e1After = preserveResult.entries.find(e => e.entry_index === 1);
  assertEq(e1After?.committed_record_id, 12345, 'upsert preserves committed_record_id');
  assertEq(e1After?.payload.name, 'Adam Updated Again', 'upsert applies new payload');

  // Insert another entry to trigger sort
  const sortResult = await upsertDraftEntries(churchF, jobF, [
    { entry_index: 3, payload_json: { name: 'Mid' } },
    { entry_index: 0, payload_json: { name: 'First' } },
  ]);
  assertEq(sortResult.entries.length, 4, 'after inserts: 4 entries');
  assertEq(
    sortResult.entries.map(e => e.entry_index),
    [0, 1, 3, 5],
    'entries sorted by entry_index'
  );

  // After all upserts, all 4 entries are 'draft'.
  // QUIRK: upsertDraftEntries does NOT preserve workflow_status across updates —
  // it defaults to 'draft' if not explicitly passed. The third upsert to entry 1
  // only passed payload_json, so its workflow_status was reset from 'in_review'
  // to 'draft'. (committed_record_id IS preserved; workflow_status is not.)
  const manifestF = await tryReadManifest(churchF, jobF);
  assertEq(
    manifestF?.draftCounts,
    { draft: 4, in_review: 0, finalized: 0, committed: 0 },
    'draftCounts after upserts (workflow_status not preserved across updates)'
  );

  // Cleanup
  fsSync.rmSync(tmpRoot, { recursive: true, force: true });
}

runAsyncTests()
  .then(() => {
    console.log(`\n──────────────────────────────────────────────────────────`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  })
  .catch((err) => {
    console.error('Test runner crashed:', err);
    try { fsSync.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
    process.exit(2);
  });
