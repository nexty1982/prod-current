/**
 * snapshots.js — API for the om-snapshot safety system
 * Provides read-only access to snapshot data for the admin UI.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const SNAPSHOT_DIR = path.resolve(__dirname, '../../../.snapshots');
const SNAPSHOT_SCRIPT = path.resolve(__dirname, '../../../scripts/om-snapshot.sh');
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

// ─── List all snapshots ───────────────────────────────────────
router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(SNAPSHOT_DIR)) {
      return res.json({ snapshots: [] });
    }

    const dirs = fs.readdirSync(SNAPSHOT_DIR).filter(d => {
      const meta = path.join(SNAPSHOT_DIR, d, 'metadata.txt');
      return fs.existsSync(meta);
    });

    const snapshots = dirs.map(d => {
      const metaPath = path.join(SNAPSHOT_DIR, d, 'metadata.txt');
      const raw = fs.readFileSync(metaPath, 'utf-8');
      const meta = {};
      raw.split('\n').forEach(line => {
        const idx = line.indexOf('=');
        if (idx > 0) meta[line.slice(0, idx)] = line.slice(idx + 1);
      });

      const filelistPath = path.join(SNAPSHOT_DIR, d, 'filelist.txt');
      const files = fs.existsSync(filelistPath)
        ? fs.readFileSync(filelistPath, 'utf-8').trim().split('\n').filter(Boolean)
        : [];

      return {
        id: meta.id || d,
        label: meta.label || 'unknown',
        branch: meta.branch || 'unknown',
        commit: meta.commit || 'unknown',
        timestamp: meta.timestamp || '',
        user: meta.user || '',
        fileCount: parseInt(meta.file_count) || files.length,
        files,
      };
    }).sort((a, b) => b.id.localeCompare(a.id));

    res.json({ snapshots });
  } catch (err) {
    console.error('Error listing snapshots:', err);
    res.status(500).json({ error: 'Failed to list snapshots' });
  }
});

// ─── Get snapshot detail with diff info ───────────────────────
router.get('/:id', (req, res) => {
  try {
    const snapDir = path.join(SNAPSHOT_DIR, req.params.id);
    if (!fs.existsSync(snapDir)) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    const metaPath = path.join(snapDir, 'metadata.txt');
    const raw = fs.readFileSync(metaPath, 'utf-8');
    const meta = {};
    raw.split('\n').forEach(line => {
      const idx = line.indexOf('=');
      if (idx > 0) meta[line.slice(0, idx)] = line.slice(idx + 1);
    });

    const filelistPath = path.join(snapDir, 'filelist.txt');
    const files = fs.existsSync(filelistPath)
      ? fs.readFileSync(filelistPath, 'utf-8').trim().split('\n').filter(Boolean)
      : [];

    // Build diff info for each file
    const fileDetails = files.map(f => {
      const snapFile = path.join(snapDir, 'files', f);
      const currFile = path.join(PROJECT_ROOT, f);
      const snapExists = fs.existsSync(snapFile);
      const currExists = fs.existsSync(currFile);

      let status = 'unknown';
      let snapLines = 0;
      let currLines = 0;

      if (snapExists) {
        snapLines = fs.readFileSync(snapFile, 'utf-8').split('\n').length;
      }
      if (currExists) {
        currLines = fs.readFileSync(currFile, 'utf-8').split('\n').length;
      }

      if (!snapExists && currExists) {
        status = 'current_only';
      } else if (snapExists && !currExists) {
        status = 'missing';
      } else if (snapExists && currExists) {
        const snapContent = fs.readFileSync(snapFile, 'utf-8');
        const currContent = fs.readFileSync(currFile, 'utf-8');
        status = snapContent === currContent ? 'identical' : 'differs';
      }

      return { path: f, status, snapLines, currLines };
    });

    res.json({
      id: meta.id || req.params.id,
      label: meta.label || 'unknown',
      branch: meta.branch || 'unknown',
      commit: meta.commit || 'unknown',
      timestamp: meta.timestamp || '',
      user: meta.user || '',
      fileCount: parseInt(meta.file_count) || files.length,
      files: fileDetails,
    });
  } catch (err) {
    console.error('Error reading snapshot:', err);
    res.status(500).json({ error: 'Failed to read snapshot' });
  }
});

// ─── Create a new snapshot ────────────────────────────────────
router.post('/', (req, res) => {
  try {
    const label = (req.body.label || 'manual-ui').replace(/[^a-zA-Z0-9_-]/g, '-');
    const output = execSync(`${SNAPSHOT_SCRIPT} save "${label}"`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      timeout: 10000,
    });
    // Extract snapshot ID from output
    const match = output.match(/Snapshot saved:\s*(\S+)/);
    const id = match ? match[1].replace(/\x1b\[[0-9;]*m/g, '') : null;
    res.json({ success: true, id, output: output.replace(/\x1b\[[0-9;]*m/g, '') });
  } catch (err) {
    console.error('Error creating snapshot:', err);
    res.status(500).json({ error: 'Failed to create snapshot', details: err.message });
  }
});

// ─── Delete a snapshot ────────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const snapDir = path.join(SNAPSHOT_DIR, req.params.id);
    if (!fs.existsSync(snapDir)) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    fs.rmSync(snapDir, { recursive: true, force: true });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting snapshot:', err);
    res.status(500).json({ error: 'Failed to delete snapshot' });
  }
});

// ─── Git status summary ───────────────────────────────────────
router.get('/system/git-status', (req, res) => {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim();
    const commitHash = execSync('git rev-parse --short HEAD', { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim();
    const commitMsg = execSync('git log -1 --pretty=%s', { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim();
    const uncommitted = execSync('git diff --name-only HEAD 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null', { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim();
    const uncommittedFiles = uncommitted ? uncommitted.split('\n').filter(Boolean) : [];

    res.json({
      branch,
      commitHash,
      commitMsg,
      uncommittedCount: uncommittedFiles.length,
      uncommittedFiles,
    });
  } catch (err) {
    console.error('Error getting git status:', err);
    res.status(500).json({ error: 'Failed to get git status' });
  }
});

module.exports = router;
