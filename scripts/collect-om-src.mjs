#!/usr/bin/env node
/**
 * Collect OM Frontend Source from prod/front-end/src
 * - Copies only whitelisted OM app paths (excludes demo/vendor/mock) into a staging folder, preserving structure
 * - Produces om-src-manifest.json with relative path (from src/), size, sha256
 * - Prints summary: counts by top-level dir and total files
 *
 * Usage examples:
 *   node scripts/collect-om-src.mjs
 *   node scripts/collect-om-src.mjs --root "Z:\\prod\\front-end\\src" --out "Z:\\prod\\front-end\\om-src-staging"
 *   node scripts/collect-om-src.mjs --root "/var/www/orthodoxmetrics/prod/front-end/src" --out "./om-src-staging"
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';

// Resolve project root (directory containing this script assumed to be .../scripts)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { root: undefined, out: undefined, verbose: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--root' && i + 1 < args.length) out.root = args[++i];
    else if (a === '--out' && i + 1 < args.length) out.out = args[++i];
    else if (a === '--verbose') out.verbose = true;
  }
  return out;
}

// Issue includes/excludes as provided. Patterns are relative to the src/ folder.
const INCLUDE_PATTERNS_SRC = [
  'auth/**',
  'core/api/**',
  'core/logging/**',
  'core/hooks/**',
  'core/store/**',
  'core/utils/**',
  'theme/**',
  'layout/**',
  'config/menu/MenuItems.ts',
  'routes/Router.tsx',
  'features/records/**',
  'features/theme/**',
  'features/devel/**',
  'features/admin/**',
  'components/**/records/**',
  'components/**/shared/**',
  'assets/rails/**',
  'assets/**/headimage.png',
];

const EXCLUDE_PATTERNS_SRC = [
  'pages/demo/**',
  'pages/samples/**',
  'examples/**',
  'mock/**',
  'stories/**',
  '**/__mocks__/**',
  '**/__tests__/**',
];

function ensureSrcBase(rootArg) {
  // Accept either a path ending with src or the front-end directory containing src
  if (!rootArg) return path.join(projectRoot, 'front-end', 'src');
  let p = path.resolve(rootArg);
  const base = path.basename(p).toLowerCase();
  if (base !== 'src') {
    // Try appending src
    const candidate = path.join(p, 'src');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return candidate;
  }
  return p;
}

function defaultOutFolder(srcBase) {
  // place alongside the front-end directory if possible, else inside projectRoot
  const frontEndDir = path.resolve(srcBase, '..');
  return path.join(frontEndDir, 'om-src-staging');
}

async function sha256(file) {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    const s = fs.createReadStream(file);
    s.on('error', reject);
    s.on('data', (chunk) => h.update(chunk));
    s.on('end', () => resolve(h.digest('hex')));
  });
}

async function copyFilePreserve(src, dest) {
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  await fsp.copyFile(src, dest);
}

function toForwardSlash(p) {
  return p.replace(/\\/g, '/');
}

async function main() {
  const args = parseArgs();
  const srcBase = ensureSrcBase(args.root);
  const outDir = args.out ? path.resolve(args.out) : defaultOutFolder(srcBase);

  await fsp.mkdir(outDir, { recursive: true });

  // Build absolute glob patterns by prefixing with srcBase
  const includeAbs = INCLUDE_PATTERNS_SRC.map((p) => toForwardSlash(path.join(srcBase, p)));
  const ignoreAbs = EXCLUDE_PATTERNS_SRC.map((p) => toForwardSlash(path.join(srcBase, p)));

  // Resolve file list
  const matched = new Set();
  for (const pat of includeAbs) {
    const files = await glob(pat, { nodir: true, ignore: ignoreAbs, windowsPathsNoEscape: true, dot: false });
    for (const f of files) matched.add(path.resolve(f));
  }

  const files = Array.from(matched).sort();

  if (files.length === 0) {
    console.log('No files matched. Check your --root path.');
    console.log('Root (src):', srcBase);
    return;
  }

  console.log('OM Source Collector');
  console.log('Source (src):', srcBase);
  console.log('Staging out:', outDir);
  console.log('Matched files:', files.length);

  // Copy and build manifest
  const manifest = [];
  const countsByTop = new Map();

  for (const abs of files) {
    const relFromSrc = toForwardSlash(path.relative(srcBase, abs)); // e.g., core/api/x.ts
    const top = relFromSrc.split('/')[0] || '';
    countsByTop.set(top, (countsByTop.get(top) || 0) + 1);

    const dest = path.join(outDir, 'src', relFromSrc); // preserve leading src/
    await copyFilePreserve(abs, dest);

    const st = await fsp.stat(abs);
    const hash = await sha256(abs);
    manifest.push({ path: `src/${relFromSrc}`, size: st.size, sha256: hash });
  }

  // Write manifest at the staging root
  const manifestPath = path.join(outDir, 'om-src-manifest.json');
  await fsp.writeFile(manifestPath, JSON.stringify({
    createdAt: new Date().toISOString(),
    sourceRoot: toForwardSlash(srcBase),
    totalFiles: manifest.length,
    files: manifest,
  }, null, 2));

  // Print short summary
  console.log('\nSummary (by top-level dir under src):');
  const sorted = Array.from(countsByTop.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [k, v] of sorted) {
    console.log(` - ${k}: ${v}`);
  }
  console.log(`Total files: ${manifest.length}`);
  console.log(`Manifest: ${manifestPath}`);
}

main().catch((err) => {
  console.error('Error during collection:', err);
  process.exitCode = 1;
});
