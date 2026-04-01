#!/usr/bin/env node
/**
 * om-daily-reconcile.js — OM Daily Work Item Git Reconciliation Engine
 *
 * Matches historical OM Daily work items to Git branches and commits
 * across both OrthodoxMetrics and OMAI repositories, then optionally
 * backfills trusted metadata into the database.
 *
 * Usage:
 *   node scripts/reconciliation/om-daily-reconcile.js                  # dry-run, all items
 *   node scripts/reconciliation/om-daily-reconcile.js --item 632       # single item
 *   node scripts/reconciliation/om-daily-reconcile.js --repo omai      # one repo only
 *   node scripts/reconciliation/om-daily-reconcile.js --apply          # backfill trusted matches
 *   node scripts/reconciliation/om-daily-reconcile.js --format csv     # CSV output
 *   node scripts/reconciliation/om-daily-reconcile.js --status done    # filter by status
 *
 * Confidence Tiers:
 *   Tier 1 (95-100): Exact branch name contains item ID
 *   Tier 2 (80-94):  Commit messages reference item ID
 *   Tier 3 (70-79):  PR/merge commit references item ID
 *   Tier 4 (50-69):  Semantic fallback (slug similarity + timestamps)
 *
 * Classification Buckets:
 *   auto_update_safe  — Confidence >= 80, no conflicts
 *   review_required   — Confidence 50-79, or conflicts present
 *   no_evidence       — No matching Git evidence found
 */

'use strict';

const { execSync } = require('child_process');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const REPOS = {
  orthodoxmetrics: { root: '/var/www/orthodoxmetrics/prod', defaultBranch: 'main' },
  omai:            { root: '/var/www/omai',                  defaultBranch: 'main' },
};

const DB_CONFIG = {
  host: '192.168.1.241',
  user: 'orthodoxapps',
  password: 'Summerof1982@!',
  database: 'omai_db',
  connectionLimit: 3,
  charset: 'utf8mb4',
};

const ARTIFACT_DIR = path.join(__dirname, 'artifacts');

const CONFIDENCE_THRESHOLDS = {
  AUTO_APPLY: 80,
  REVIEW:     50,
};

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    mode: 'dry-run',
    itemId: null,
    repo: null,
    format: 'json',
    status: null,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--apply':       opts.mode = 'apply'; break;
      case '--dry-run':     opts.mode = 'dry-run'; break;
      case '--item':        opts.itemId = parseInt(args[++i], 10); break;
      case '--repo':        opts.repo = args[++i]; break;
      case '--format':      opts.format = args[++i]; break;
      case '--status':      opts.status = args[++i]; break;
      case '--verbose':
      case '-v':            opts.verbose = true; break;
      case '--help':
      case '-h':
        console.log(`
OM Daily Git Reconciliation Engine

Usage:
  node om-daily-reconcile.js [options]

Options:
  --apply          Apply trusted (auto_update_safe) matches to DB
  --dry-run        Assessment only, no DB writes (default)
  --item <id>      Reconcile a single item
  --repo <name>    Filter by repo (orthodoxmetrics | omai)
  --status <s>     Filter by item status (done, in_progress, etc.)
  --format <fmt>   Output format: json (default), csv
  --verbose, -v    Verbose output
  --help, -h       Show this help
`);
        process.exit(0);
      default:
        if (!args[i].startsWith('-')) break;
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  return opts;
}

// ============================================================================
// Git Evidence Collection
// ============================================================================

function gitCmd(repoRoot, cmd) {
  try {
    return execSync(`git -C "${repoRoot}" ${cmd}`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
    }).trim();
  } catch (e) {
    return '';
  }
}

/**
 * Collect all branch names (local + remote) for a repo.
 * Returns array of { name, isRemote, fullRef }
 */
function collectBranches(repoRoot) {
  const branches = [];

  // Local branches
  const localRaw = gitCmd(repoRoot, 'branch --list --format="%(refname:short)"');
  if (localRaw) {
    for (const b of localRaw.split('\n').filter(Boolean)) {
      branches.push({ name: b, isRemote: false, fullRef: b });
    }
  }

  // Remote branches
  const remoteRaw = gitCmd(repoRoot, 'branch -r --format="%(refname:short)"');
  if (remoteRaw) {
    for (const b of remoteRaw.split('\n').filter(Boolean)) {
      const shortName = b.replace(/^origin\//, '');
      if (shortName === 'HEAD') continue;
      // Don't duplicate if already in local
      if (!branches.find(lb => lb.name === shortName)) {
        branches.push({ name: shortName, isRemote: true, fullRef: b });
      }
    }
  }

  return branches;
}

/**
 * Collect commit evidence from a repo.
 * Returns array of { sha, shortSha, subject, author, date, branchRefs }
 */
function collectCommits(repoRoot, maxCount = 500) {
  const raw = gitCmd(repoRoot,
    `log --all --oneline --format="%H|%h|%s|%aN|%aI" -${maxCount}`
  );
  if (!raw) return [];

  return raw.split('\n').filter(Boolean).map(line => {
    const [sha, shortSha, subject, author, date] = line.split('|');
    return { sha, shortSha, subject: subject || '', author: author || '', date: date || '' };
  });
}

/**
 * Collect merge commits on the default branch.
 */
function collectMergeCommits(repoRoot, defaultBranch, maxCount = 200) {
  const raw = gitCmd(repoRoot,
    `log ${defaultBranch} --merges --oneline --format="%H|%h|%s|%aN|%aI" -${maxCount}`
  );
  if (!raw) return [];

  return raw.split('\n').filter(Boolean).map(line => {
    const [sha, shortSha, subject, author, date] = line.split('|');
    return { sha, shortSha, subject: subject || '', author: author || '', date: date || '', isMerge: true };
  });
}

/**
 * Get commits on a specific branch (not on default branch).
 */
function getBranchCommits(repoRoot, branchRef, defaultBranch) {
  const raw = gitCmd(repoRoot,
    `log ${defaultBranch}..${branchRef} --oneline --format="%H|%h|%s|%aN|%aI" 2>/dev/null`
  );
  if (!raw) return [];

  return raw.split('\n').filter(Boolean).map(line => {
    const [sha, shortSha, subject, author, date] = line.split('|');
    return { sha, shortSha, subject: subject || '', author: author || '', date: date || '' };
  });
}

/**
 * Build full Git evidence index for a repo.
 */
function buildRepoEvidence(repoName) {
  const config = REPOS[repoName];
  if (!config) throw new Error(`Unknown repo: ${repoName}`);

  const branches = collectBranches(config.root);
  const commits = collectCommits(config.root, 1000);
  const mergeCommits = collectMergeCommits(config.root, config.defaultBranch, 300);

  return {
    repoName,
    root: config.root,
    defaultBranch: config.defaultBranch,
    branches,
    commits,
    mergeCommits,
    branchIndex: buildBranchIndex(branches),
  };
}

/**
 * Build a lookup index from branch names to item IDs.
 * Extracts item references from various branch naming conventions.
 */
function buildBranchIndex(branches) {
  const index = {}; // itemId -> [{ branch, matchType }]

  for (const branch of branches) {
    const name = branch.name;

    // Standard format: feature/omd-NNN/date/slug
    let match = name.match(/^(?:feature|fix|chore)\/omd-(\d+)\//i);
    if (match) {
      const id = parseInt(match[1], 10);
      if (!index[id]) index[id] = [];
      index[id].push({ branch, matchType: 'standard_omd_prefix', confidence: 98 });
      continue;
    }

    // Legacy agent format: EF_agent_date_NNN or EF_agent_date (no ID)
    match = name.match(/^(?:EF|NF|BF|PA)_[a-z0-9-]+_\d{4}-\d{2}-\d{2}_(\d+)$/i);
    if (match) {
      const id = parseInt(match[1], 10);
      if (!index[id]) index[id] = [];
      index[id].push({ branch, matchType: 'legacy_agent_with_id', confidence: 95 });
      continue;
    }

    // Legacy short form: feat/NNN-slug or fix/NNN-slug
    match = name.match(/^(?:feat|enh|fix|ref|mig|chore|spike|docs)\/(\d+)-/i);
    if (match) {
      const id = parseInt(match[1], 10);
      if (!index[id]) index[id] = [];
      index[id].push({ branch, matchType: 'legacy_numeric_prefix', confidence: 90 });
      continue;
    }

    // PR branch with issue number: feature/.../NNN/slug
    match = name.match(/\/(\d+)\//);
    if (match) {
      const id = parseInt(match[1], 10);
      if (id > 0 && id < 10000) { // reasonable range for OM Daily IDs
        if (!index[id]) index[id] = [];
        index[id].push({ branch, matchType: 'embedded_numeric_segment', confidence: 70 });
      }
    }
  }

  return index;
}

// ============================================================================
// Matching Engine
// ============================================================================

/**
 * Normalize a title to a slug for comparison.
 */
function slugify(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

/**
 * Extract potential item ID references from a commit message.
 * Returns array of { id, refType }
 */
function extractItemRefs(text) {
  const refs = [];
  if (!text) return refs;

  // OMD-NNN or omd-NNN
  for (const match of text.matchAll(/\bOMD-(\d+)\b/gi)) {
    refs.push({ id: parseInt(match[1], 10), refType: 'omd_ref' });
  }

  // #NNN (common GitHub/issue style)
  for (const match of text.matchAll(/\b#(\d+)\b/g)) {
    const id = parseInt(match[1], 10);
    if (id > 0 && id < 10000) {
      refs.push({ id, refType: 'hash_ref' });
    }
  }

  // "item NNN" or "item-NNN"
  for (const match of text.matchAll(/\bitem[- ]?(\d+)\b/gi)) {
    refs.push({ id: parseInt(match[1], 10), refType: 'item_ref' });
  }

  return refs;
}

/**
 * Compute slug similarity between two strings (Jaccard on trigrams).
 */
function slugSimilarity(a, b) {
  const trigramsA = new Set();
  const trigramsB = new Set();
  const sa = slugify(a);
  const sb = slugify(b);

  for (let i = 0; i <= sa.length - 3; i++) trigramsA.add(sa.substring(i, i + 3));
  for (let i = 0; i <= sb.length - 3; i++) trigramsB.add(sb.substring(i, i + 3));

  if (trigramsA.size === 0 || trigramsB.size === 0) return 0;

  let intersection = 0;
  for (const t of trigramsA) { if (trigramsB.has(t)) intersection++; }

  const union = trigramsA.size + trigramsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Match a single OM Daily item against Git evidence from one repo.
 * Returns a match candidate or null.
 */
function matchItemToRepo(item, repoEvidence) {
  const result = {
    repo: repoEvidence.repoName,
    branch: null,
    branchConfidence: 0,
    matchedCommits: [],
    mergeCommit: null,
    matchBasis: [],
    conflictReasons: [],
  };

  const itemId = item.id;
  const itemTitle = item.title || '';
  const itemSlug = slugify(itemTitle);

  // ── Tier 1: Branch name contains item ID ──
  const branchMatches = repoEvidence.branchIndex[itemId] || [];

  // Also check if the item's stored github_branch exists in this repo
  if (item.github_branch) {
    const storedBranch = repoEvidence.branches.find(b => b.name === item.github_branch);
    if (storedBranch && !branchMatches.find(m => m.branch.name === storedBranch.name)) {
      branchMatches.push({
        branch: storedBranch,
        matchType: 'stored_branch_verified',
        confidence: 97,
      });
    }
  }

  if (branchMatches.length > 0) {
    // Pick highest confidence branch match
    branchMatches.sort((a, b) => b.confidence - a.confidence);
    const best = branchMatches[0];
    result.branch = best.branch.name;
    result.branchConfidence = best.confidence;
    result.matchBasis.push(`tier1_branch:${best.matchType}(${best.branch.name})`);

    if (branchMatches.length > 1) {
      result.conflictReasons.push(
        `multiple_branch_matches:${branchMatches.map(m => m.branch.name).join(',')}`
      );
      // Reduce confidence when ambiguous
      result.branchConfidence = Math.min(result.branchConfidence, 75);
    }

    // Get commits on the matched branch
    const branchCommits = getBranchCommits(
      repoEvidence.root,
      best.branch.fullRef,
      repoEvidence.defaultBranch
    );
    if (branchCommits.length > 0) {
      result.matchedCommits = branchCommits;
      result.matchBasis.push(`branch_commits:${branchCommits.length}`);
    }
  }

  // ── Tier 1b: Item's stored github_branch (even if branch no longer exists) ──
  // If the item already has a branch value that was set by the start-work endpoint,
  // trust it as evidence even if the branch was merged/deleted.
  // Only apply in the item's designated repo to avoid false multi-repo conflicts.
  // Must run BEFORE tier 2/3 so the stored branch is authoritative.
  if (!result.branch && item.github_branch && repoEvidence.repoName === (item.repo_target || 'orthodoxmetrics')) {
    const storedName = item.github_branch;
    const looksLikeAgent = /^(EF|NF|BF|PA)_/.test(storedName);
    const looksLikeStandard = /^(feature|fix|chore)\//.test(storedName);
    const looksLikeLegacy = /^(feat|enh|fix|ref|mig|spike|docs)\//.test(storedName);

    if (looksLikeAgent || looksLikeStandard || looksLikeLegacy) {
      result.branch = storedName;
      result.branchConfidence = 85; // High — stored by workflow, but unverifiable
      result.matchBasis.push(`tier1b_stored_branch:${storedName}(branch_deleted_or_merged)`);
    }
  }

  // ── Tier 2: Commit messages reference item ID ──
  const commitMatches = [];
  for (const commit of repoEvidence.commits) {
    const refs = extractItemRefs(commit.subject);
    if (refs.some(r => r.id === itemId)) {
      commitMatches.push(commit);
    }
  }

  if (commitMatches.length > 0) {
    result.matchBasis.push(`tier2_commit_refs:${commitMatches.length}`);
    // Add commit evidence if we don't already have branch commits
    if (result.matchedCommits.length === 0) {
      result.matchedCommits = commitMatches;
    }
    // Boost confidence if we have both branch and commit evidence
    if (result.branch) {
      result.branchConfidence = Math.min(100, result.branchConfidence + 5);
    } else {
      // Commit-only match
      result.branchConfidence = Math.max(result.branchConfidence, 82);
    }
  }

  // ── Tier 3: Merge commit references ──
  for (const mc of repoEvidence.mergeCommits) {
    const refs = extractItemRefs(mc.subject);
    if (refs.some(r => r.id === itemId)) {
      result.mergeCommit = mc;
      result.matchBasis.push(`tier3_merge:${mc.shortSha}`);
      if (!result.branch) {
        // Try to extract branch from merge message — only if no branch set yet
        const branchMatch = mc.subject.match(/Merge branch '([^']+)'/)
          || mc.subject.match(/Merge pull request #\d+ from \S+\/(.+)/)
          || mc.subject.match(/Merge[: ]+([^\s]+)/);
        if (branchMatch) {
          result.branch = branchMatch[1];
          result.branchConfidence = Math.max(result.branchConfidence, 75);
        }
      }
      break;
    }

    // Also check for branch name in merge message that matches stored branch
    if (item.github_branch && mc.subject.includes(item.github_branch)) {
      result.mergeCommit = mc;
      result.matchBasis.push(`tier3_merge_branch_ref:${mc.shortSha}`);
      break;
    }
  }

  // ── Tier 4: Semantic fallback ──
  if (result.matchedCommits.length === 0 && !result.branch) {
    // Check branch slugs
    for (const branch of repoEvidence.branches) {
      const branchSlug = slugify(branch.name.replace(/^[^/]+\//, ''));
      const sim = slugSimilarity(itemTitle, branchSlug);
      if (sim > 0.45) {
        result.branch = branch.name;
        result.branchConfidence = Math.min(65, Math.round(sim * 100));
        result.matchBasis.push(`tier4_slug_similarity:${sim.toFixed(2)}(${branch.name})`);
        result.conflictReasons.push('semantic_match_only');

        // Check if dates align
        const branchDate = branch.name.match(/\d{4}-\d{2}-\d{2}/);
        if (branchDate && item.created_at) {
          const branchDay = branchDate[0];
          const itemDay = new Date(item.created_at).toISOString().split('T')[0];
          const dayDiff = Math.abs(
            (new Date(branchDay) - new Date(itemDay)) / 86400000
          );
          if (dayDiff <= 3) {
            result.branchConfidence = Math.min(69, result.branchConfidence + 10);
            result.matchBasis.push(`tier4_date_proximity:${dayDiff}d`);
          }
        }
        break;
      }
    }

    // Check commit subjects for high similarity
    for (const commit of repoEvidence.commits) {
      const sim = slugSimilarity(itemTitle, commit.subject);
      if (sim > 0.5) {
        result.matchedCommits.push(commit);
        if (result.matchedCommits.length === 1) {
          result.matchBasis.push(`tier4_commit_similarity:${sim.toFixed(2)}`);
          result.branchConfidence = Math.max(result.branchConfidence, Math.min(60, Math.round(sim * 85)));
          result.conflictReasons.push('semantic_match_only');
        }
        if (result.matchedCommits.length >= 3) break; // cap
      }
    }
  }

  return result;
}

/**
 * Classify a reconciliation result.
 */
function classify(confidence, conflictReasons) {
  if (conflictReasons.length > 0 && confidence < CONFIDENCE_THRESHOLDS.AUTO_APPLY) {
    return 'review_required';
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.AUTO_APPLY) {
    return conflictReasons.length > 0 ? 'review_required' : 'auto_update_safe';
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.REVIEW) {
    return 'review_required';
  }
  if (confidence > 0) {
    return 'review_required';
  }
  return 'no_evidence';
}

/**
 * Reconcile a single item against all repo evidence.
 */
function reconcileItem(item, allRepoEvidence) {
  const candidates = [];

  // If item has a repo_target, check that repo first (with priority)
  const targetRepo = item.repo_target || 'orthodoxmetrics';
  const repoOrder = [targetRepo, ...Object.keys(REPOS).filter(r => r !== targetRepo)];

  for (const repoName of repoOrder) {
    if (!allRepoEvidence[repoName]) continue;
    const match = matchItemToRepo(item, allRepoEvidence[repoName]);
    if (match.branch || match.matchedCommits.length > 0 || match.mergeCommit) {
      candidates.push(match);
    }
  }

  // Pick best candidate
  let best = null;
  let conflictReasons = [];

  if (candidates.length === 0) {
    return buildResultRow(item, null, 'no_evidence', []);
  }

  if (candidates.length === 1) {
    best = candidates[0];
  } else {
    // Multiple repos have evidence — check for conflicts
    candidates.sort((a, b) => b.branchConfidence - a.branchConfidence);
    best = candidates[0];

    if (candidates[1].branchConfidence >= CONFIDENCE_THRESHOLDS.REVIEW) {
      conflictReasons.push(
        `multi_repo_evidence:${candidates.map(c => `${c.repo}(${c.branchConfidence})`).join(',')}`
      );
      // If target repo matches, prefer it
      if (best.repo !== targetRepo && candidates[1].repo === targetRepo) {
        const targetCandidate = candidates.find(c => c.repo === targetRepo);
        if (targetCandidate && targetCandidate.branchConfidence >= best.branchConfidence - 10) {
          best = targetCandidate;
        }
      }
    }
  }

  conflictReasons = [...conflictReasons, ...best.conflictReasons];

  const confidence = best.branchConfidence;
  const classification = classify(confidence, conflictReasons);

  return buildResultRow(item, best, classification, conflictReasons);
}

function buildResultRow(item, match, classification, conflictReasons) {
  const commits = match ? match.matchedCommits : [];
  const firstCommit = commits.length > 0 ? commits[commits.length - 1] : null;
  const lastCommit = commits.length > 0 ? commits[0] : null;

  return {
    work_item_id: item.id,
    title: item.title,
    status: item.status,
    task_type: item.task_type,
    current_repo_value: item.repo_target || null,
    inferred_repo: match ? match.repo : null,
    repo_confidence: match ? (match.repo === item.repo_target ? 100 : match.branchConfidence) : 0,
    current_github_branch: item.github_branch || null,
    inferred_branch: match ? match.branch : null,
    branch_confidence: match ? match.branchConfidence : 0,
    matched_commit_count: commits.length,
    first_commit_sha: firstCommit ? firstCommit.sha : null,
    first_commit_at: firstCommit ? firstCommit.date : null,
    last_commit_sha: lastCommit ? lastCommit.sha : null,
    last_commit_at: lastCommit ? lastCommit.date : null,
    merge_commit_sha: match && match.mergeCommit ? match.mergeCommit.sha : null,
    matched_pr_number: null, // TODO: gh CLI integration
    match_basis: match ? match.matchBasis.join('; ') : '',
    confidence_score: match ? match.branchConfidence : 0,
    classification,
    needs_review: classification === 'review_required',
    review_reason: conflictReasons.join('; ') || null,
    evidence_summary: match
      ? `${match.matchBasis.length} signal(s): ${match.matchBasis.join(', ')}`
      : 'No Git evidence found',
    // Internal: for apply mode
    _item: item,
    _match: match,
  };
}

// ============================================================================
// Database Operations
// ============================================================================

async function getPool() {
  return mysql.createPool(DB_CONFIG);
}

async function fetchItems(pool, opts) {
  let where = '1=1';
  const params = [];

  if (opts.itemId) {
    where += ' AND id = ?';
    params.push(opts.itemId);
  }
  if (opts.repo) {
    where += ' AND repo_target = ?';
    params.push(opts.repo);
  }
  if (opts.status) {
    where += ' AND status = ?';
    params.push(opts.status);
  }

  const [rows] = await pool.query(
    `SELECT id, title, task_type, description, status, priority, category,
            repo_target, github_branch, github_issue_number, agent_tool,
            branch_type, source, progress, created_by, created_at, updated_at,
            completed_at, metadata
     FROM om_daily_items
     WHERE ${where}
     ORDER BY id`,
    params
  );

  return rows;
}

async function ensureReconciliationTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS om_daily_reconciliation_runs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mode ENUM('dry_run','apply') NOT NULL DEFAULT 'dry_run',
      started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME DEFAULT NULL,
      total_items INT NOT NULL DEFAULT 0,
      auto_update_count INT NOT NULL DEFAULT 0,
      review_required_count INT NOT NULL DEFAULT 0,
      no_evidence_count INT NOT NULL DEFAULT 0,
      applied_count INT NOT NULL DEFAULT 0,
      error_count INT NOT NULL DEFAULT 0,
      filters_json LONGTEXT DEFAULT NULL,
      summary_json LONGTEXT DEFAULT NULL,
      artifact_path VARCHAR(500) DEFAULT NULL,
      created_by VARCHAR(100) DEFAULT 'system'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS om_daily_reconciliation_results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      run_id INT NOT NULL,
      item_id INT NOT NULL,
      classification ENUM('auto_update_safe','review_required','no_evidence') NOT NULL,
      confidence_score INT NOT NULL DEFAULT 0,
      inferred_repo VARCHAR(50) DEFAULT NULL,
      inferred_branch VARCHAR(255) DEFAULT NULL,
      matched_commit_count INT NOT NULL DEFAULT 0,
      first_commit_sha VARCHAR(40) DEFAULT NULL,
      last_commit_sha VARCHAR(40) DEFAULT NULL,
      merge_commit_sha VARCHAR(40) DEFAULT NULL,
      match_basis TEXT DEFAULT NULL,
      evidence_summary TEXT DEFAULT NULL,
      review_reason TEXT DEFAULT NULL,
      was_applied TINYINT(1) NOT NULL DEFAULT 0,
      old_repo_target VARCHAR(50) DEFAULT NULL,
      new_repo_target VARCHAR(50) DEFAULT NULL,
      old_github_branch VARCHAR(255) DEFAULT NULL,
      new_github_branch VARCHAR(255) DEFAULT NULL,
      applied_at DATETIME DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_run (run_id),
      KEY idx_item (item_id),
      KEY idx_classification (classification),
      CONSTRAINT fk_recon_run FOREIGN KEY (run_id)
        REFERENCES om_daily_reconciliation_runs(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function createRun(pool, mode, filters) {
  const [result] = await pool.query(
    `INSERT INTO om_daily_reconciliation_runs (mode, filters_json, created_by)
     VALUES (?, ?, 'claude_cli')`,
    [mode === 'apply' ? 'apply' : 'dry_run', JSON.stringify(filters)]
  );
  return result.insertId;
}

async function saveResult(pool, runId, row) {
  await pool.query(
    `INSERT INTO om_daily_reconciliation_results
     (run_id, item_id, classification, confidence_score, inferred_repo, inferred_branch,
      matched_commit_count, first_commit_sha, last_commit_sha, merge_commit_sha,
      match_basis, evidence_summary, review_reason,
      old_repo_target, old_github_branch)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      runId, row.work_item_id, row.classification, row.confidence_score,
      row.inferred_repo, row.inferred_branch, row.matched_commit_count,
      row.first_commit_sha, row.last_commit_sha, row.merge_commit_sha,
      row.match_basis, row.evidence_summary, row.review_reason,
      row.current_repo_value, row.current_github_branch,
    ]
  );
}

async function applyResult(pool, runId, row) {
  if (row.classification !== 'auto_update_safe') return false;

  const updates = [];
  const params = [];

  // Only update github_branch if we found one and current is missing/different
  if (row.inferred_branch && row.inferred_branch !== row.current_github_branch) {
    updates.push('github_branch = ?');
    params.push(row.inferred_branch);
  }

  // Only update repo_target if evidence strongly disagrees with current
  if (row.inferred_repo && row.inferred_repo !== row.current_repo_value && row.repo_confidence >= 90) {
    updates.push('repo_target = ?');
    params.push(row.inferred_repo);
  }

  if (updates.length === 0) return false;

  params.push(row.work_item_id);
  await pool.query(
    `UPDATE om_daily_items SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
    params
  );

  // Record what was applied
  await pool.query(
    `UPDATE om_daily_reconciliation_results
     SET was_applied = 1,
         new_repo_target = ?,
         new_github_branch = ?,
         applied_at = NOW()
     WHERE run_id = ? AND item_id = ?`,
    [
      row.inferred_repo || row.current_repo_value,
      row.inferred_branch || row.current_github_branch,
      runId,
      row.work_item_id,
    ]
  );

  // Log event
  await pool.query(
    `INSERT INTO om_daily_item_events
     (item_id, event_type, actor, message, metadata)
     VALUES (?, 'status_changed', 'reconciliation_engine', ?, ?)`,
    [
      row.work_item_id,
      `Reconciliation run #${runId}: backfilled Git metadata`,
      JSON.stringify({
        run_id: runId,
        old_branch: row.current_github_branch,
        new_branch: row.inferred_branch,
        old_repo: row.current_repo_value,
        new_repo: row.inferred_repo,
        confidence: row.confidence_score,
        match_basis: row.match_basis,
      }),
    ]
  );

  return true;
}

async function completeRun(pool, runId, summary, artifactPath) {
  await pool.query(
    `UPDATE om_daily_reconciliation_runs
     SET completed_at = NOW(),
         total_items = ?,
         auto_update_count = ?,
         review_required_count = ?,
         no_evidence_count = ?,
         applied_count = ?,
         summary_json = ?,
         artifact_path = ?
     WHERE id = ?`,
    [
      summary.total,
      summary.auto_update_safe,
      summary.review_required,
      summary.no_evidence,
      summary.applied,
      JSON.stringify(summary),
      artifactPath,
      runId,
    ]
  );
}

// ============================================================================
// Report Generation
// ============================================================================

function generateSummary(results) {
  const summary = {
    total: results.length,
    auto_update_safe: 0,
    review_required: 0,
    no_evidence: 0,
    applied: 0,
    matched_to_om: 0,
    matched_to_omai: 0,
    with_existing_branch: 0,
    with_existing_incorrect_branch: 0,
    missing_branch: 0,
    with_commit_evidence: 0,
    with_branch_evidence_only: 0,
    with_commit_evidence_only: 0,
  };

  for (const r of results) {
    summary[r.classification]++;

    if (r.inferred_repo === 'orthodoxmetrics') summary.matched_to_om++;
    if (r.inferred_repo === 'omai') summary.matched_to_omai++;

    if (r.current_github_branch) {
      summary.with_existing_branch++;
      if (r.inferred_branch && r.inferred_branch !== r.current_github_branch) {
        summary.with_existing_incorrect_branch++;
      }
    } else {
      summary.missing_branch++;
    }

    if (r.matched_commit_count > 0) summary.with_commit_evidence++;
    if (r.inferred_branch && r.matched_commit_count === 0) summary.with_branch_evidence_only++;
    if (!r.inferred_branch && r.matched_commit_count > 0) summary.with_commit_evidence_only++;
  }

  return summary;
}

function toCSV(results) {
  const headers = [
    'work_item_id', 'title', 'status', 'task_type',
    'current_repo_value', 'inferred_repo', 'repo_confidence',
    'current_github_branch', 'inferred_branch', 'branch_confidence',
    'matched_commit_count', 'first_commit_sha', 'last_commit_sha',
    'merge_commit_sha', 'confidence_score', 'classification',
    'needs_review', 'review_reason', 'match_basis',
  ];

  const escape = (val) => {
    if (val == null) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const lines = [headers.join(',')];
  for (const r of results) {
    lines.push(headers.map(h => escape(r[h])).join(','));
  }

  return lines.join('\n');
}

function writeArtifacts(runId, summary, results, format) {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const prefix = `${ARTIFACT_DIR}/run-${runId}-${timestamp}`;

  // Summary JSON
  const summaryPath = `${prefix}-summary.json`;
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  // Detailed JSON (strip internal fields)
  const detailPath = `${prefix}-detail.json`;
  const clean = results.map(r => {
    const { _item, _match, ...rest } = r;
    return rest;
  });
  fs.writeFileSync(detailPath, JSON.stringify(clean, null, 2));

  // CSV
  const csvPath = `${prefix}-results.csv`;
  fs.writeFileSync(csvPath, toCSV(clean));

  return { summaryPath, detailPath, csvPath };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const opts = parseArgs();
  const pool = await getPool();

  console.log('================================================');
  console.log('  OM Daily Git Reconciliation Engine');
  console.log('================================================');
  console.log(`  Mode:     ${opts.mode}`);
  console.log(`  Item:     ${opts.itemId || 'all'}`);
  console.log(`  Repo:     ${opts.repo || 'all'}`);
  console.log(`  Status:   ${opts.status || 'all'}`);
  console.log(`  Format:   ${opts.format}`);
  console.log('');

  try {
    // Ensure reconciliation tables exist
    await ensureReconciliationTables(pool);
    console.log('[1/5] Reconciliation tables ready');

    // Fetch items
    const items = await fetchItems(pool, opts);
    console.log(`[2/5] Fetched ${items.length} OM Daily items`);

    if (items.length === 0) {
      console.log('\nNo items to reconcile.');
      await pool.end();
      return;
    }

    // Build Git evidence for each repo
    console.log('[3/5] Collecting Git evidence...');
    const allRepoEvidence = {};

    for (const repoName of Object.keys(REPOS)) {
      if (opts.repo && opts.repo !== repoName) continue;
      process.stdout.write(`  Scanning ${repoName}...`);
      const evidence = buildRepoEvidence(repoName);
      allRepoEvidence[repoName] = evidence;
      console.log(` ${evidence.branches.length} branches, ${evidence.commits.length} commits`);
    }

    // If filtering by repo, still scan both for cross-repo detection
    if (opts.repo) {
      for (const repoName of Object.keys(REPOS)) {
        if (allRepoEvidence[repoName]) continue;
        process.stdout.write(`  Scanning ${repoName} (cross-check)...`);
        const evidence = buildRepoEvidence(repoName);
        allRepoEvidence[repoName] = evidence;
        console.log(` ${evidence.branches.length} branches, ${evidence.commits.length} commits`);
      }
    }

    // Create reconciliation run
    const runId = await createRun(pool, opts.mode, {
      itemId: opts.itemId,
      repo: opts.repo,
      status: opts.status,
    });
    console.log(`[4/5] Reconciliation run #${runId} created`);

    // Reconcile each item
    console.log('[5/5] Matching items to Git evidence...');
    const results = [];
    let applied = 0;

    for (const item of items) {
      const result = reconcileItem(item, allRepoEvidence);
      results.push(result);

      // Persist result
      await saveResult(pool, runId, result);

      // Apply if mode=apply and classification is safe
      if (opts.mode === 'apply' && result.classification === 'auto_update_safe') {
        const didApply = await applyResult(pool, runId, result);
        if (didApply) applied++;
      }

      if (opts.verbose) {
        const icon = result.classification === 'auto_update_safe' ? '+'
          : result.classification === 'review_required' ? '?'
          : '-';
        console.log(`  [${icon}] #${item.id} (${result.confidence_score}) ${result.classification} | ${item.title.substring(0, 50)}`);
      }
    }

    // Generate summary
    const summary = generateSummary(results);
    summary.applied = applied;
    summary.run_id = runId;
    summary.mode = opts.mode;
    summary.timestamp = new Date().toISOString();

    // Write artifacts
    const artifacts = writeArtifacts(runId, summary, results, opts.format);
    await completeRun(pool, runId, summary, artifacts.summaryPath);

    // Print summary
    console.log('\n================================================');
    console.log('  Reconciliation Summary');
    console.log('================================================');
    console.log(`  Run ID:                    ${runId}`);
    console.log(`  Mode:                      ${opts.mode}`);
    console.log(`  Total items scanned:       ${summary.total}`);
    console.log('');
    console.log(`  Auto-update safe:          ${summary.auto_update_safe}`);
    console.log(`  Review required:           ${summary.review_required}`);
    console.log(`  No evidence:               ${summary.no_evidence}`);
    console.log('');
    console.log(`  Matched to OM:             ${summary.matched_to_om}`);
    console.log(`  Matched to OMAI:           ${summary.matched_to_omai}`);
    console.log('');
    console.log(`  Items with existing branch: ${summary.with_existing_branch}`);
    console.log(`  Existing incorrect branch:  ${summary.with_existing_incorrect_branch}`);
    console.log(`  Missing branch:             ${summary.missing_branch}`);
    console.log('');
    console.log(`  With commit evidence:       ${summary.with_commit_evidence}`);
    console.log(`  Branch evidence only:       ${summary.with_branch_evidence_only}`);
    console.log(`  Commit evidence only:       ${summary.with_commit_evidence_only}`);

    if (opts.mode === 'apply') {
      console.log('');
      console.log(`  Applied updates:            ${applied}`);
    }

    console.log('');
    console.log('  Artifacts:');
    console.log(`    Summary:  ${artifacts.summaryPath}`);
    console.log(`    Detail:   ${artifacts.detailPath}`);
    console.log(`    CSV:      ${artifacts.csvPath}`);
    console.log('');

    // If single item, print detail
    if (opts.itemId && results.length === 1) {
      const r = results[0];
      console.log('  Item Detail:');
      console.log(`    Title:            ${r.title}`);
      console.log(`    Status:           ${r.status}`);
      console.log(`    Current repo:     ${r.current_repo_value}`);
      console.log(`    Inferred repo:    ${r.inferred_repo || '(none)'}`);
      console.log(`    Current branch:   ${r.current_github_branch || '(none)'}`);
      console.log(`    Inferred branch:  ${r.inferred_branch || '(none)'}`);
      console.log(`    Confidence:       ${r.confidence_score}`);
      console.log(`    Classification:   ${r.classification}`);
      console.log(`    Commits matched:  ${r.matched_commit_count}`);
      console.log(`    Match basis:      ${r.match_basis || '(none)'}`);
      console.log(`    Review reason:    ${r.review_reason || '(none)'}`);
      console.log('');
    }

    await pool.end();
  } catch (err) {
    console.error('\nFATAL:', err.message);
    if (opts.verbose) console.error(err.stack);
    await pool.end();
    process.exit(1);
  }
}

main();
