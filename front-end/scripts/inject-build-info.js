/**
 * Inject build information into index.html
 * Adds build version (git SHA + timestamp) for cache-busting verification
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../dist');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');
const ROOT_DIR = path.resolve(__dirname, '..');

// Get git SHA (short)
let gitSha = 'unknown';
try {
  gitSha = execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
} catch (e) {
  console.warn('Could not get git SHA:', e.message);
}

// Get build timestamp
const buildTime = new Date().toISOString();
const buildTimestamp = Date.now();

// Create build info object
const buildInfo = {
  gitSha,
  buildTime,
  buildTimestamp,
  version: process.env.npm_package_version || '1.0.0'
};

// Read index.html
if (!fs.existsSync(INDEX_HTML)) {
  console.error('index.html not found at:', INDEX_HTML);
  process.exit(1);
}

let html = fs.readFileSync(INDEX_HTML, 'utf8');

// Inject build info as a script tag in the head
const buildInfoScript = `
<script>
  // Build information injected at build time
  window.__BUILD_INFO__ = ${JSON.stringify(buildInfo, null, 2)};
</script>`;

// Insert before closing </head> tag
if (html.includes('</head>')) {
  html = html.replace('</head>', `${buildInfoScript}\n</head>`);
} else {
  // Fallback: insert at the beginning of <body>
  html = html.replace('<body>', `<body>${buildInfoScript}`);
}

// Write back
fs.writeFileSync(INDEX_HTML, html, 'utf8');

// Also write to a separate JSON file for API access
const buildInfoPath = path.join(DIST_DIR, 'build-info.json');
fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2), 'utf8');

console.log('✅ Build info injected:', buildInfo);
