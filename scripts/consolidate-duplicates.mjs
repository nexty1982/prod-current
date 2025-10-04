#!/usr/bin/env node
/*
  Consolidate duplicate files and directories under front-end\\src into front-end\\src\\consolidate.
  - Detect duplicate files by content hash.
  - Detect duplicate directories by structure+content hash (roll-up of child hashes).
  - Do NOT refactor or move originals; we only COPY a single representative of each duplicate group into consolidate.
  - Optionally skip files considered "pinned" (widely imported across many files). Pinned files are not consolidated to avoid any temptation to refactor them.

  Outputs:
  - front-end\\src\\consolidate\\report.json (detailed machine-readable report)
  - front-end\\src\\consolidate\\report.txt (summary)
  - Copies of duplicates to front-end\\src\\consolidate\\files and ...\\dirs

  Usage:
    node scripts/consolidate-duplicates.mjs [--root Z:\\prod\\front-end\\src] [--threshold 5] [--dry]

  Notes:
    - Default root is the repository's front-end\\src relative to the current working directory of the script execution (project root).
    - This script is Windows-path aware but works cross-platform if paths are normalized.
*/

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import os from 'os';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const defaultRoot = path.resolve(projectRoot, '..', 'front-end', 'src');

function toNative(p) {
  // Convert to current OS separators for consistency in outputs
  return p.split(/[\\/]+/).join(path.sep);
}

function sha1(buf) {
  const h = crypto.createHash('sha1');
  h.update(buf);
  return h.digest('hex');
}

async function hashFile(absPath) {
  const h = crypto.createHash('sha1');
  await new Promise((resolve, reject) => {
    const s = fs.createReadStream(absPath);
    s.on('data', d => h.update(d));
    s.on('error', reject);
    s.on('end', resolve);
  });
  return h.digest('hex');
}

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
}

function isCodeFile(p) {
  return /\.(?:tsx?|jsx?)$/i.test(p);
}

function isTextFile(p) {
  return /\.(?:md|txt|json|ya?ml|tsx?|jsx?|css|scss|less|html?)$/i.test(p);
}

async function readTextSafe(p) {
  try {
    return await fsp.readFile(p, 'utf8');
  } catch {
    return '';
  }
}

function parseImports(source) {
  const imports = [];
  // Handle ES imports: import ... from '...'; and dynamic import('...') and require('...')
  const importRegex = /import\s+[^'"\n]*?from\s*['\"]([^'\"]+)['\"];?|import\s*\(\s*['\"]([^'\"]+)['\"]\s*\)|require\(\s*['\"]([^'\"]+)['\"]\s*\)/g;
  let m;
  while ((m = importRegex.exec(source))) {
    const spec = m[1] || m[2] || m[3];
    if (spec) imports.push(spec);
  }
  return imports;
}

function resolveImport(fromFile, spec, root) {
  if (!spec.startsWith('.') && !spec.startsWith('/')) return null; // skip aliased or package imports
  const base = path.dirname(fromFile);
  const candidates = [];
  const tryExts = ['', '.ts', '.tsx', '.js', '.jsx', '.json'];
  const tryIndexes = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];
  for (const ext of tryExts) {
    candidates.push(path.resolve(base, spec + ext));
  }
  const asDir = path.resolve(base, spec);
  for (const idx of tryIndexes) {
    candidates.push(path.join(asDir, idx));
  }
  for (const c of candidates) {
    if (c.startsWith(root) && fs.existsSync(c) && fs.statSync(c).isFile()) return path.normalize(c);
  }
  return null;
}

async function computeImportCounts(allFiles, root) {
  const counts = new Map();
  for (const file of allFiles) {
    if (!isCodeFile(file)) continue;
    const src = await readTextSafe(file);
    if (!src) continue;
    const specs = parseImports(src);
    for (const spec of specs) {
      const resolved = resolveImport(file, spec, root);
      if (!resolved) continue;
      counts.set(resolved, (counts.get(resolved) || 0) + 1);
    }
  }
  return counts;
}

async function walkFiles(root, options = {}) {
  const ignore = options.ignore || [];
  const patterns = [
    toNative(path.join(root, '**', '*')),
  ];
  const entries = await glob(patterns, { nodir: true, dot: true, windowsPathsNoEscape: true });
  const files = entries
    .map(e => path.resolve(e))
    .filter(p => !ignore.some(ig => p.startsWith(ig)));
  return files;
}

async function buildFileHashIndex(files) {
  const index = new Map(); // hash -> [paths]
  for (const file of files) {
    try {
      const h = await hashFile(file);
      if (!index.has(h)) index.set(h, []);
      index.get(h).push(file);
    } catch {
      // ignore unreadable
    }
  }
  return index;
}

async function buildDirHashes(root, fileHashIndex) {
  // Build a directory hash based on child file relative paths + file content hashes.
  // For scalability, we derive from file hashes. Two directories are equal if they contain the same set of files (relative paths) with the same hashes.
  const dirMap = new Map(); // dirPath -> dirHash
  const files = Array.from(fileHashIndex.entries())
    .flatMap(([h, paths]) => paths.map(p => ({ path: p, hash: h })));
  const relEntries = files.map(({ path: p, hash }) => ({ rel: path.relative(root, p), dir: path.dirname(path.relative(root, p)), hash }));
  const byDir = new Map();
  for (const e of relEntries) {
    const key = path.join(root, e.dir);
    if (!byDir.has(key)) byDir.set(key, []);
    byDir.get(key).push({ rel: e.rel, hash: e.hash });
  }
  for (const [dir, items] of byDir.entries()) {
    const sorted = items.sort((a, b) => a.rel.localeCompare(b.rel));
    const canon = sorted.map(it => `${it.rel}:${it.hash}`).join('\n');
    const h = sha1(Buffer.from(canon, 'utf8'));
    dirMap.set(dir, h);
  }

  // Group by hash -> [dirs]
  const groups = new Map();
  for (const [dir, h] of dirMap.entries()) {
    if (!groups.has(h)) groups.set(h, []);
    groups.get(h).push(dir);
  }
  return { dirHashByPath: dirMap, dirGroups: groups };
}

async function writeText(p, txt) {
  await ensureDir(path.dirname(p));
  await fsp.writeFile(p, txt, 'utf8');
}

async function copyFileSafe(src, dest, dry) {
  await ensureDir(path.dirname(dest));
  if (dry) return;
  await fsp.copyFile(src, dest);
}

async function copyDirRepresentative(srcDir, destDir, dry) {
  // Copy directory tree preserving relative structure under destDir
  const entries = await glob(toNative(path.join(srcDir, '**', '*')), { nodir: true, dot: true, windowsPathsNoEscape: true });
  for (const abs of entries) {
    const rel = path.relative(srcDir, abs);
    const dst = path.join(destDir, rel);
    await copyFileSafe(abs, dst, dry);
  }
}

function pickRepresentative(paths) {
  // Deterministic choice: shortest path, then lexicographically
  return paths.slice().sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
}

function parseArgs(argv) {
  const args = { root: defaultRoot, threshold: 5, dry: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry') args.dry = true;
    else if (a === '--root') { args.root = path.resolve(argv[++i]); }
    else if (a === '--threshold') { args.threshold = parseInt(argv[++i], 10) || 5; }
  }
  return args;
}

async function main() {
  const { root, threshold, dry } = parseArgs(process.argv);
  const consolidateRoot = path.join(root, 'consolidate');
  const outFiles = path.join(consolidateRoot, 'files');
  const outDirs = path.join(consolidateRoot, 'dirs');
  const reportsDir = consolidateRoot;

  const t0 = Date.now();
  console.log(`Scanning for duplicates in: ${root}`);
  console.log(`Consolidate destination: ${consolidateRoot}`);
  if (dry) console.log('DRY RUN: no files will be copied.');

  const ignore = [path.join(root, 'consolidate')];
  const allFiles = await walkFiles(root, { ignore });

  // Import counts
  console.log('Analyzing imports to detect pinned files...');
  const importCounts = await computeImportCounts(allFiles, root);

  const pinned = new Set(Array.from(importCounts.entries())
    .filter(([, c]) => c >= threshold)
    .map(([p]) => p));

  console.log(`Pinned files (imported >= ${threshold} times): ${pinned.size}`);

  // File hashes and duplicate groups
  console.log('Hashing files...');
  const fileHashIndex = await buildFileHashIndex(allFiles);
  const fileGroups = Array.from(fileHashIndex.entries())
    .map(([hash, paths]) => ({ hash, paths }))
    .filter(g => g.paths.length > 1);

  // Directory hashes and duplicate groups
  console.log('Hashing directories...');
  const { dirHashByPath, dirGroups } = await buildDirHashes(root, fileHashIndex);
  const dupDirGroups = Array.from(dirGroups.entries())
    .map(([hash, dirs]) => ({ hash, dirs: dirs.filter(d => d !== root) }))
    .filter(g => g.dirs.length > 1);

  // Prepare outputs
  await ensureDir(consolidateRoot);
  await ensureDir(outFiles);
  await ensureDir(outDirs);

  const report = {
    root,
    consolidateRoot,
    threshold,
    pinnedCount: pinned.size,
    files: {
      duplicateGroups: fileGroups.map(g => ({ hash: g.hash, count: g.paths.length, paths: g.paths })),
    },
    dirs: {
      duplicateGroups: dupDirGroups.map(g => ({ hash: g.hash, count: g.dirs.length, dirs: g.dirs })),
    },
    actions: { files: [], dirs: [] },
    dry,
    generatedAt: new Date().toISOString(),
    host: os.hostname(),
    durationsMs: {},
  };

  // Consolidate files (skip pinned)
  console.log('Consolidating duplicate files...');
  for (const g of fileGroups) {
    const nonPinned = g.paths.filter(p => !pinned.has(p));
    if (nonPinned.length < 2) continue; // either none or only one eligible
    const rep = pickRepresentative(nonPinned);
    const destDir = path.join(outFiles, g.hash);
    const dest = path.join(destDir, path.basename(rep));
    await copyFileSafe(rep, dest, dry);
    report.actions.files.push({ hash: g.hash, representative: rep, dest, skippedPinned: g.paths.length - nonPinned.length, total: g.paths.length });
  }

  // Consolidate directories (skip if any file inside dir is pinned)
  console.log('Consolidating duplicate directories...');
  for (const g of dupDirGroups) {
    // Determine if dir contains any pinned file
    let candidates = g.dirs.filter(d => d && d !== root);
    candidates = candidates.filter(d => {
      const filesUnder = allFiles.filter(f => f.startsWith(d + path.sep));
      return !filesUnder.some(f => pinned.has(f));
    });
    if (candidates.length < 2) continue;
    const rep = pickRepresentative(candidates);
    const dest = path.join(outDirs, g.hash);
    await copyDirRepresentative(rep, dest, dry);
    report.actions.dirs.push({ hash: g.hash, representative: rep, dest, total: g.dirs.length, consolidated: candidates.length });
  }

  // Reports
  const elapsedMs = Date.now() - t0;
  report.durationsMs.total = elapsedMs;

  const reportJson = path.join(reportsDir, 'report.json');
  const reportTxt = path.join(reportsDir, 'report.txt');

  const fileGroupsSummary = report.files.duplicateGroups.map(g => `  - ${g.hash}: ${g.count} files`).join('\n');
  const dirGroupsSummary = report.dirs.duplicateGroups.map(g => `  - ${g.hash}: ${g.count} dirs`).join('\n');

  const txt = [
    `Duplicate consolidation report`,
    `Root: ${root}`,
    `Consolidate: ${consolidateRoot}`,
    `Pinned threshold: ${threshold}`,
    `Pinned files: ${report.pinnedCount}`,
    `Duplicate file groups: ${report.files.duplicateGroups.length}`,
    fileGroupsSummary,
    `Duplicate dir groups: ${report.dirs.duplicateGroups.length}`,
    dirGroupsSummary,
    `Actions (files): ${report.actions.files.length}`,
    `Actions (dirs): ${report.actions.dirs.length}`,
    `Dry: ${dry}`,
    `Elapsed: ${(elapsedMs/1000).toFixed(1)}s`,
  ].join('\n');

  await writeText(reportJson, JSON.stringify(report, null, 2));
  await writeText(reportTxt, txt + '\n');

  console.log('Report written to:');
  console.log('  ' + reportJson);
  console.log('  ' + reportTxt);
  console.log('Done.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
