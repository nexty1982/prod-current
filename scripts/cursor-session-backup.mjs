#!/usr/bin/env node
/**
 * Cursor session backup: snapshot all modified files, create diff, and categorize.
 * Run from repo root: node scripts/cursor-session-backup.mjs
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function now() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

/** Modified files from session (curated list if git unavailable). */
const FALLBACK_FILES = [
  'server/src/services/recordTableConfig.js',
  'server/src/routes/admin/churches-compat.js',
  'server/routes/admin/church.js',
  'server/src/index.ts',
  'server/config/session.js',
  'server/config/db.js',
  'server/src/config/schema.ts',
  'server/src/config/redact.ts',
  'server/src/config/index.ts',
  'server/config/db-compat.js',
  'front-end/src/utils/formatDate.ts',
  'front-end/src/utils/env.ts',
  'front-end/src/config/featureFlags.ts',
  'front-end/src/features/records-centralized/utils/adminEndpointCache.ts',
  'front-end/src/features/records-centralized/components/dynamic/cellRenderers.tsx',
  'front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx',
  'front-end/src/layouts/full/vertical/header/Header.tsx',
  'front-end/scripts/inject-build-info.js',
  'front-end/package.json',
  'front-end/vite.config.ts',
  'RECORD_TABLE_CONFIG_FINAL.md',
  'RECORD_TABLE_CONFIG_STANDARDIZATION.md',
  'ROUTE_COMPATIBILITY_FIX.md',
];

function gitModified() {
  try {
    execSync('git config --global --add safe.directory "' + ROOT.replace(/\\/g, '/') + '"', { stdio: 'ignore' });
  } catch (_) {}
  try {
    const out = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' });
    const paths = [];
    for (const line of out.split('\n')) {
      if (!line.trim()) continue;
      const s = line.slice(3).trim().replace(/^"(.*)"$/, '$1');
      if (s && !paths.includes(s)) paths.push(s);
    }
    return paths.length ? paths : null;
  } catch (_) {
    return null;
  }
}

function gitDiff() {
  try {
    const a = execSync('git diff', { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    const b = execSync('git diff --cached', { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    return (a || '') + (b ? '\n' + b : '');
  } catch (_) {
    return '# Git diff unavailable (e.g. safe.directory or network repo)\n';
  }
}

function main() {
  const stamp = now();
  const backupDir = path.join(ROOT, '_cursor_session_backup', stamp);
  ensureDir(backupDir);

  const files = gitModified() || FALLBACK_FILES;
  const copied = [];
  for (const rel of files) {
    const src = path.join(ROOT, rel);
    if (!fs.existsSync(src) || !fs.statSync(src).isFile()) continue;
    const dest = path.join(backupDir, rel);
    copyFile(src, dest);
    copied.push(rel);
  }

  const diffPath = path.join(backupDir, 'cursor_session.diff');
  fs.writeFileSync(diffPath, gitDiff(), 'utf8');

  const summaryPath = path.join(backupDir, 'CHANGE_SUMMARY.md');
  const summary = buildSummary(backupDir, stamp, copied);
  fs.writeFileSync(summaryPath, summary, 'utf8');

  console.log('Backup dir: ' + backupDir);
  console.log('Copied: ' + copied.length + ' files');
  console.log('Diff: ' + diffPath);
  console.log('Summary: ' + summaryPath);
}

function buildSummary(backupDir, stamp, copied) {
  const byGroup = {
    A: [],
    B: [],
    C: [],
    D: [],
    E: [],
    F: [],
    G: [],
  };
  for (const f of copied) {
    if (f.startsWith('server/') && (f.includes('recordTableConfig') || f.includes('churches-compat') || f.includes('church.js') || f.includes('config/') && (f.includes('schema') || f.includes('redact') || f.includes('index')))) byGroup.A.push(f);
    else if (f.startsWith('server/') && (f.includes('interactive') || f.includes('clientApi') || f.includes('migration'))) byGroup.B.push(f);
    else if (f.startsWith('front-end/') && (f.includes('records-centralized') || f.includes('formatDate') || f.includes('adminEndpointCache'))) byGroup.C.push(f);
    else if (f.startsWith('front-end/') && (f.includes('Header') || f.includes('ErrorBoundary') || f.includes('snackbar'))) byGroup.D.push(f);
    else if (f.endsWith('.md') || f.includes('CONFIG') || f.includes('SUMMARY') || f.includes('FIX') || f.includes('IMPLEMENTATION')) byGroup.E.push(f);
    else if (f.includes('scripts/') || f.includes('vite.config') || f.endsWith('.sql') || f.includes('build-copy') || f.includes('inject-build')) byGroup.F.push(f);
    else if (f.includes('package.json') || f.includes('env') || f.includes('featureFlags') || f.includes('session.js') || f.includes('db.js') || f.includes('db-compat')) byGroup.G.push(f);
    else {
      if (f.startsWith('server/')) byGroup.A.push(f);
      else if (f.startsWith('front-end/')) byGroup.C.push(f);
      else byGroup.E.push(f);
    }
  }

  let md = `# Cursor session backup – ${stamp}\n\n`;
  md += `**Backup directory:** \`${backupDir}\`\n\n`;
  md += `**Snapshot:** ${copied.length} files copied. \`cursor_session.diff\` contains full unified diff.\n\n`;
  md += `---\n\n## Categorized changes\n\n`;

  const groups = [
    ['A', 'Backend – Record Table Config / Canonical Endpoint', 'CORE', 'recordTableConfig service, churches-compat, getRecordTableBundle, canonical /record-table-config, /tables/:table, /tables/:table/columns, church alias'],
    ['B', 'Backend – Interactive Reports', 'SUPPORTING', 'interactive reports routes, migrations, clientApi'],
    ['C', 'Frontend – Records Grid / Field Mapper', 'CORE', 'BaptismRecordsPage, cellRenderers, formatDate, adminEndpointCache, column inference'],
    ['D', 'Frontend – UI / Snackbar / Error Boundaries', 'SUPPORTING', 'Header bgtile path, error boundaries, dev handlers'],
    ['E', 'Docs / Markdown / Guides', 'DOCUMENTATION ONLY', 'RECORD_TABLE_CONFIG_*, ROUTE_COMPATIBILITY_FIX, CONFIG, etc.'],
    ['F', 'Build / Scripts / SQL / Utilities', 'SUPPORTING', 'inject-build-info, build-copy, vite.config, verify-build'],
    ['G', 'Env / Config / Package changes', 'SUPPORTING', 'package.json, env.ts, featureFlags, session/db config'],
  ];

  for (const [key, title, defaultTag, desc] of groups) {
    const list = [...new Set(byGroup[key])];
    md += `### ${key}) ${title}\n\n`;
    md += `- **Tag:** ${defaultTag}\n`;
    md += `- **Description:** ${desc}\n\n`;
    if (list.length) {
      md += '| File |\n|------|\n';
      for (const f of list.sort()) md += `| ${f} |\n`;
    } else md += '*No files in this group from copied set.*\n';
    md += '\n';
  }

  md += `---\n\n## All copied files (${copied.length})\n\n`;
  for (const f of copied.sort()) md += `- ${f}\n`;

  return md;
}

main();
