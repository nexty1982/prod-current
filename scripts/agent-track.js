#!/usr/bin/env node
/**
 * agent-track.js — Record AI agent commits to om_daily_items
 * Called by .git/hooks/post-commit when an AI-authored commit is detected.
 * Usage: node scripts/agent-track.js <commit-hash>
 */

const { execSync } = require('child_process');
const path = require('path');

const REPO_DIR = '/var/www/orthodoxmetrics/prod';

async function main() {
  const hash = process.argv[2];
  if (!hash) {
    console.error('[agent-track] No commit hash provided');
    process.exit(1);
  }

  // Read commit details
  const logLine = execSync(
    `git log -1 --pretty=format:"%an|%s|%b" ${hash}`,
    { cwd: REPO_DIR, encoding: 'utf-8' }
  ).trim();

  const pipeIdx = logLine.indexOf('|');
  const author = logLine.substring(0, pipeIdx);
  const rest = logLine.substring(pipeIdx + 1);
  const pipeIdx2 = rest.indexOf('|');
  const subject = rest.substring(0, pipeIdx2);
  const body = rest.substring(pipeIdx2 + 1);

  // Detect agent name from Co-Authored-By
  let agentName = 'unknown';
  const coAuthorMatch = body.match(/Co-Authored-By:\s*(.+?)(?:\s*<|$)/im);
  if (coAuthorMatch) {
    agentName = coAuthorMatch[1].trim();
  } else if (subject.startsWith('[CLAUDE]')) {
    agentName = 'Claude';
  } else if (subject.startsWith('[OMAI]')) {
    agentName = 'OMAI';
  } else if (subject.startsWith('[AGENT]')) {
    agentName = 'Agent';
  }

  // Get files changed
  let diffOutput = '';
  try {
    diffOutput = execSync(
      `git diff-tree --no-commit-id --name-only -r ${hash}`,
      { cwd: REPO_DIR, encoding: 'utf-8' }
    ).trim();
  } catch { /* empty */ }

  const files = diffOutput ? diffOutput.split('\n').filter(Boolean) : [];
  const filesChanged = files.length;

  // Auto-detect category from file paths
  let category = 'General';
  if (files.some(f => f.startsWith('front-end/'))) category = 'Frontend';
  if (files.some(f => f.startsWith('server/src/routes/') || f.startsWith('server/src/api/'))) category = 'Backend';
  if (files.some(f => f.startsWith('server/src/ocr/'))) category = 'OCR';
  if (files.some(f => f.startsWith('docs/'))) category = 'Docs';
  if (files.some(f => f.startsWith('scripts/'))) category = 'DevOps';

  // Get DB pool
  const { promisePool: pool } = require(path.join(REPO_DIR, 'server/dist/config/db'));

  const title = subject.substring(0, 255);
  const metadata = JSON.stringify({
    agent: agentName,
    commitHash: hash.substring(0, 7),
    filesChanged,
    timestamp: new Date().toISOString(),
  });

  // Check for duplicate (same commit hash)
  const [existing] = await pool.query(
    `SELECT id FROM om_daily_items WHERE source = 'agent' AND JSON_EXTRACT(metadata, '$.commitHash') = ?`,
    [hash.substring(0, 7)]
  );

  if (existing.length > 0) {
    console.log(`[agent-track] Commit ${hash.substring(0, 7)} already tracked (item #${existing[0].id})`);
    process.exit(0);
  }

  const [result] = await pool.query(
    `INSERT INTO om_daily_items (title, task_type, description, horizon, status, priority, category, source, metadata, completed_at)
     VALUES (?, 'task', ?, '7', 'done', 'medium', ?, 'agent', ?, NOW())`,
    [title, `Auto-tracked from commit ${hash.substring(0, 7)} by ${agentName}`, category, metadata]
  );

  console.log(`[agent-track] Created om_daily_items #${result.insertId} for commit ${hash.substring(0, 7)} (${agentName})`);
  process.exit(0);
}

main().catch(err => {
  console.error('[agent-track] Error:', err.message);
  process.exit(1);
});
