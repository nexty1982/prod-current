/**
 * Rollback v1 — Phase 5.2
 *
 * Pure functions for computing rollback plans from autocommit results.
 * No DB access, no side effects.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface RollbackTarget {
  recordId: number;
  table: string;
  recordType: string;
}

export interface RollbackPlan {
  method: 'autocommit_rollback_v1';
  batch_id: string;
  targets: RollbackTarget[];
  by_table: Record<string, number[]>;
  total_targets: number;
}

export interface RollbackVerification {
  existing: Record<string, number[]>;
  missing: Record<string, number[]>;
  deleted_counts: Record<string, number>;
  missing_counts: Record<string, number>;
  total_existing: number;
  total_missing: number;
}

export interface RollbackResult {
  method: 'autocommit_rollback_v1';
  batch_id: string;
  job_id: number;
  church_id: number;
  deleted: Record<string, number>;
  missing: Record<string, number>;
  deleted_ids: Record<string, number[]>;
  missing_ids: Record<string, number[]>;
  total_deleted: number;
  total_missing: number;
  rolled_back_by: string;
  rolled_back_at: string;
  force: boolean;
}

// ── Pure functions ──────────────────────────────────────────────────────────

/**
 * Extract rollback targets from autocommit_results.json data.
 * Only committed rows with valid recordId and table are included.
 */
export function extractRollbackTargets(resultsData: any, batchId: string): RollbackPlan {
  const targets: RollbackTarget[] = [];

  for (const row of resultsData?.rows || []) {
    if (row.outcome === 'committed' && row.recordId != null && row.table) {
      targets.push({
        recordId: row.recordId,
        table: row.table,
        recordType: row.recordType || 'unknown',
      });
    }
  }

  // Group by table
  const byTable: Record<string, number[]> = {};
  for (const t of targets) {
    if (!byTable[t.table]) byTable[t.table] = [];
    byTable[t.table].push(t.recordId);
  }

  return {
    method: 'autocommit_rollback_v1',
    batch_id: batchId,
    targets,
    by_table: byTable,
    total_targets: targets.length,
  };
}

/**
 * Verify which target IDs still exist vs. missing.
 * existingIdsByTable: { "baptism_records": [100, 101], ... }
 */
export function verifyTargets(
  plan: RollbackPlan,
  existingIdsByTable: Record<string, number[]>,
): RollbackVerification {
  const existing: Record<string, number[]> = {};
  const missing: Record<string, number[]> = {};
  const deletedCounts: Record<string, number> = {};
  const missingCounts: Record<string, number> = {};
  let totalExisting = 0;
  let totalMissing = 0;

  for (const [table, ids] of Object.entries(plan.by_table)) {
    const foundSet = new Set(existingIdsByTable[table] || []);
    const found = ids.filter(id => foundSet.has(id));
    const notFound = ids.filter(id => !foundSet.has(id));

    existing[table] = found;
    missing[table] = notFound;
    deletedCounts[table] = found.length;
    missingCounts[table] = notFound.length;
    totalExisting += found.length;
    totalMissing += notFound.length;
  }

  return {
    existing,
    missing,
    deleted_counts: deletedCounts,
    missing_counts: missingCounts,
    total_existing: totalExisting,
    total_missing: totalMissing,
  };
}

/**
 * Build the rollback result artifact.
 */
export function buildRollbackResult(
  verification: RollbackVerification,
  batchId: string,
  jobId: number,
  churchId: number,
  userEmail: string,
  force: boolean,
): RollbackResult {
  return {
    method: 'autocommit_rollback_v1',
    batch_id: batchId,
    job_id: jobId,
    church_id: churchId,
    deleted: verification.deleted_counts,
    missing: verification.missing_counts,
    deleted_ids: verification.existing,
    missing_ids: verification.missing,
    total_deleted: verification.total_existing,
    total_missing: verification.total_missing,
    rolled_back_by: userEmail,
    rolled_back_at: new Date().toISOString(),
    force,
  };
}
