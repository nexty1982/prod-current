/**
 * Shared Repo Service — dual-repo git operations layer
 *
 * Supports both repo targets:
 *   omai          → /var/www/omai
 *   orthodoxmetrics → /var/www/orthodoxmetrics/prod
 *
 * Used by om-daily.js and admin/ops.js for all git operations.
 */

const { execSync } = require('child_process');

// ── Repo paths ──────────────────────────────────────────────────
const REPO_PATHS = {
  omai: '/var/www/omai',
  orthodoxmetrics: '/var/www/orthodoxmetrics/prod',
};

const DEFAULT_TIMEOUT = 10000; // 10s
const FETCH_TIMEOUT = 30000;   // 30s for network ops

// ── Helpers ─────────────────────────────────────────────────────

function getRepoPath(repoTarget) {
  const p = REPO_PATHS[repoTarget];
  if (!p) throw new Error(`Unknown repo_target: ${repoTarget}. Must be 'omai' or 'orthodoxmetrics'`);
  return p;
}

function git(cmd, repoTarget, opts = {}) {
  const cwd = getRepoPath(repoTarget);
  const timeout = opts.timeout || DEFAULT_TIMEOUT;
  return execSync(cmd, {
    cwd,
    encoding: 'utf-8',
    timeout,
    stdio: opts.stdio || 'pipe',
    maxBuffer: 2 * 1024 * 1024, // 2MB
  }).trim();
}

// ── Status & Health ─────────────────────────────────────────────

/**
 * Get current branch name
 */
function getCurrentBranch(repoTarget) {
  return git('git rev-parse --abbrev-ref HEAD', repoTarget);
}

/**
 * Check if working tree is clean
 */
function isClean(repoTarget) {
  const status = git('git status --porcelain', repoTarget);
  return status.length === 0;
}

/**
 * Get porcelain status lines
 */
function getStatusLines(repoTarget) {
  const out = git('git status --porcelain', repoTarget);
  return out ? out.split('\n') : [];
}

/**
 * Get ahead/behind counts relative to tracking branch
 */
function getAheadBehind(repoTarget) {
  try {
    const out = git('git rev-list --left-right --count HEAD...@{upstream}', repoTarget);
    const [ahead, behind] = out.split('\t').map(Number);
    return { ahead: ahead || 0, behind: behind || 0 };
  } catch {
    return { ahead: 0, behind: 0 };
  }
}

/**
 * Get last commit info
 */
function getLastCommit(repoTarget) {
  try {
    const out = git('git log -1 --format=%H|%s|%aI', repoTarget);
    const [sha, message, date] = out.split('|');
    return { sha, message, date };
  } catch {
    return { sha: null, message: null, date: null };
  }
}

/**
 * Full repo snapshot — all health info in one call
 */
function getSnapshot(repoTarget) {
  const branch = getCurrentBranch(repoTarget);
  const statusLines = getStatusLines(repoTarget);
  const clean = statusLines.length === 0;
  const { ahead, behind } = getAheadBehind(repoTarget);
  const lastCommit = getLastCommit(repoTarget);

  return {
    repo_target: repoTarget,
    current_branch: branch,
    is_clean: clean,
    uncommitted_count: statusLines.length,
    ahead,
    behind,
    last_commit_sha: lastCommit.sha,
    last_commit_message: lastCommit.message,
    last_commit_at: lastCommit.date,
    changed_files: statusLines.map(l => ({
      status: l.substring(0, 2).trim(),
      file: l.substring(3),
    })),
    snapshot_at: new Date().toISOString(),
  };
}

// ── Branch Operations ───────────────────────────────────────────

/**
 * Fetch from origin
 */
function fetchOrigin(repoTarget, branch) {
  if (branch) {
    git(`git fetch origin ${branch}`, repoTarget, { timeout: FETCH_TIMEOUT });
  } else {
    git('git fetch origin', repoTarget, { timeout: FETCH_TIMEOUT });
  }
}

/**
 * Check if a branch exists locally
 */
function branchExistsLocal(repoTarget, branchName) {
  try {
    git(`git rev-parse --verify ${branchName}`, repoTarget);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a branch exists on remote
 */
function branchExistsRemote(repoTarget, branchName) {
  try {
    git(`git rev-parse --verify origin/${branchName}`, repoTarget);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a new branch from origin/main and push it
 * Returns { branchName, stashed }
 */
function createBranch(repoTarget, branchName) {
  const cwd = getRepoPath(repoTarget);

  // Fetch latest main
  fetchOrigin(repoTarget, 'main');

  // Stash uncommitted changes
  const status = git('git status --porcelain', repoTarget);
  let didStash = false;
  if (status.length > 0) {
    git('git stash push -m "start-work auto-stash"', repoTarget);
    didStash = true;
  }

  try {
    // Create and switch to new branch from origin/main
    git(`git checkout -b ${branchName} origin/main`, repoTarget);

    // Push to origin with tracking
    git(`git push -u origin ${branchName}`, repoTarget, { timeout: FETCH_TIMEOUT });
  } catch (err) {
    // Restore if failed
    if (didStash) {
      try { git('git stash pop', repoTarget); } catch { /* ignore */ }
    }
    throw err;
  }

  // Pop stash onto new branch
  if (didStash) {
    try {
      git('git stash pop', repoTarget);
    } catch {
      console.warn(`[repoService] Stash pop conflicts on ${branchName} — changes in stash`);
    }
  }

  return { branchName, stashed: didStash };
}

/**
 * Checkout an existing branch (from remote if needed)
 */
function checkoutBranch(repoTarget, branchName) {
  if (branchExistsLocal(repoTarget, branchName)) {
    git(`git checkout ${branchName}`, repoTarget);
    return 'checked_out_local';
  }
  // Try from remote
  fetchOrigin(repoTarget);
  git(`git checkout -b ${branchName} origin/${branchName}`, repoTarget);
  return 'checked_out_remote';
}

/**
 * Commit all changes with a message
 */
function commitAll(repoTarget, message) {
  git('git add -A', repoTarget);
  // Check if there's anything to commit
  if (isClean(repoTarget)) {
    return { committed: false, message: 'Nothing to commit — working tree clean' };
  }
  const safeMsg = message.replace(/"/g, '\\"');
  git(`git commit -m "${safeMsg}"`, repoTarget);
  const lastCommit = getLastCommit(repoTarget);
  return { committed: true, sha: lastCommit.sha, message: lastCommit.message };
}

/**
 * Push current branch to origin
 */
function pushBranch(repoTarget, branchName) {
  if (!branchName) {
    branchName = getCurrentBranch(repoTarget);
  }
  git(`git push origin ${branchName}`, repoTarget, { timeout: FETCH_TIMEOUT });
  return { pushed: true, branch: branchName };
}

/**
 * Fast-forward merge branch into main, push main, delete branch
 * Returns merge result or throws on failure
 */
function mergeToMain(repoTarget, branchName) {
  const cwd = getRepoPath(repoTarget);

  // Ensure clean tree
  if (!isClean(repoTarget)) {
    throw new Error('Working tree is dirty — commit all changes before completing');
  }

  // Push branch first
  git(`git push origin ${branchName}`, repoTarget, { timeout: FETCH_TIMEOUT });

  // Switch to main
  git('git checkout main', repoTarget);
  git('git pull origin main', repoTarget, { timeout: FETCH_TIMEOUT });

  // Fast-forward only merge
  try {
    git(`git merge --ff-only ${branchName}`, repoTarget);
  } catch (err) {
    // Switch back to branch so user isn't stranded on main
    try { git(`git checkout ${branchName}`, repoTarget); } catch { /* */ }
    const error = new Error('Fast-forward merge not possible — main has diverged. Rebase required.');
    error.code = 'FF_FAILED';
    error.branch = branchName;
    throw error;
  }

  // Get merge commit
  const commitSha = git('git rev-parse HEAD', repoTarget);

  // Push main
  git('git push origin main', repoTarget, { timeout: FETCH_TIMEOUT });

  // Delete branch (local + remote)
  try { git(`git branch -d ${branchName}`, repoTarget); } catch { /* already gone */ }
  try { git(`git push origin --delete ${branchName}`, repoTarget, { timeout: FETCH_TIMEOUT }); } catch { /* already gone */ }

  return {
    merged: true,
    branch: branchName,
    merged_to: 'main',
    merge_type: 'fast-forward',
    commit: commitSha,
    branch_deleted: true,
  };
}

// ── Snapshot Persistence ────────────────────────────────────────

/**
 * Take a snapshot and save to DB
 */
async function saveSnapshot(pool, repoTarget) {
  const snap = getSnapshot(repoTarget);
  await pool.query(
    `INSERT INTO repo_snapshots
     (repo_target, current_branch, is_clean, uncommitted_count, ahead, behind_count,
      last_commit_sha, last_commit_message, last_commit_at, changed_files)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      snap.repo_target,
      snap.current_branch,
      snap.is_clean ? 1 : 0,
      snap.uncommitted_count,
      snap.ahead,
      snap.behind,
      snap.last_commit_sha,
      snap.last_commit_message,
      snap.last_commit_at,
      JSON.stringify(snap.changed_files),
    ]
  );
  return snap;
}

/**
 * Get the latest saved snapshot for a repo
 */
async function getLatestSnapshot(pool, repoTarget) {
  const [rows] = await pool.query(
    'SELECT * FROM repo_snapshots WHERE repo_target = ? ORDER BY snapshot_at DESC LIMIT 1',
    [repoTarget]
  );
  return rows[0] || null;
}

// ── Event & Artifact Helpers ────────────────────────────────────

/**
 * Record an item event
 */
async function recordEvent(pool, itemId, eventType, data = {}) {
  await pool.query(
    `INSERT INTO om_daily_item_events (item_id, event_type, from_status, to_status, actor, message, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      itemId,
      eventType,
      data.from_status || null,
      data.to_status || null,
      data.actor || 'system',
      data.message || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]
  );
}

/**
 * Create an artifact for an item
 */
async function createArtifact(pool, itemId, artifactType, title, payload, createdBy) {
  const [result] = await pool.query(
    `INSERT INTO om_daily_artifacts (item_id, artifact_type, title, payload, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [itemId, artifactType, title, JSON.stringify(payload), createdBy || 'system']
  );
  return result.insertId;
}

// ── Exports ─────────────────────────────────────────────────────

module.exports = {
  REPO_PATHS,
  getRepoPath,
  getCurrentBranch,
  isClean,
  getStatusLines,
  getAheadBehind,
  getLastCommit,
  getSnapshot,
  fetchOrigin,
  branchExistsLocal,
  branchExistsRemote,
  createBranch,
  checkoutBranch,
  commitAll,
  pushBranch,
  mergeToMain,
  saveSnapshot,
  getLatestSnapshot,
  recordEvent,
  createArtifact,
};
