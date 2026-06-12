/**
 * onboarding_phase column is display-only after workflow catalog B-PR12 cutover.
 * Derive phase from church state; block routine writes unless explicitly enabled.
 */

function isPhaseWriteFrozen() {
  if (process.env.ONBOARDING_PHASE_WRITES === 'true') return false;
  return process.env.EXECUTION_READ_PRIMARY === 'true';
}

/**
 * Derive legacy display phase (1–5) from operational signals.
 * @param {object|null} church
 */
function deriveOnboardingPhase(church) {
  if (!church) return null;
  if (Number(church.onboarding_phase) >= 5) return 5;
  if (church.setup_complete === 1 || church.client_status === 'active_paid') return 5;
  if (church.setup_complete === 0 && church.is_active === 1 && church.database_name) {
    const hasRecords = church.has_baptism_records || church.has_marriage_records || church.has_funeral_records;
    if (hasRecords) return 4;
    return 3;
  }
  if (church.database_name || church.db_name) return 2;
  if (church.onboarding_phase != null) return Number(church.onboarding_phase);
  return 1;
}

function isSuperAdmin(req) {
  return req?.user?.role === 'super_admin' || req?.session?.user?.role === 'super_admin';
}

/**
 * Apply onboarding_phase write with freeze policy.
 * @returns {Promise<{ written: boolean, phase: number|null, frozen?: boolean, forced?: boolean }>}
 */
async function applyOnboardingPhaseWrite(pool, churchId, nextPhase, { force = false, req, source } = {}) {
  const phase = Number(nextPhase);
  if (!Number.isFinite(phase)) {
    return { written: false, phase: null };
  }

  if (!isPhaseWriteFrozen()) {
    await pool.query('UPDATE churches SET onboarding_phase = ? WHERE id = ?', [phase, churchId]);
    return { written: true, phase };
  }

  if (force && isSuperAdmin(req)) {
    await pool.query('UPDATE churches SET onboarding_phase = ? WHERE id = ?', [phase, churchId]);
    console.warn(`[onboarding_phase] forced write church=${churchId} phase=${phase} source=${source || 'unknown'}`);
    return { written: true, phase, forced: true };
  }

  const [rows] = await pool.query(
    `SELECT setup_complete, database_name, db_name, is_active, client_status, onboarding_phase,
            has_baptism_records, has_marriage_records, has_funeral_records
     FROM churches WHERE id = ? LIMIT 1`,
    [churchId]
  );
  const derived = rows.length ? deriveOnboardingPhase(rows[0]) : phase;
  return { written: false, phase: derived, frozen: true };
}

module.exports = {
  isPhaseWriteFrozen,
  deriveOnboardingPhase,
  applyOnboardingPhaseWrite,
};
