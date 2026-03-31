/**
 * page-snapshots.js — Page-aware Git history browsing & restore API
 *
 * Translates raw Git log/show/diff into a page-centric view so the
 * OMAI "Page Snapshot Manager" can browse, preview, compare, and
 * restore prior versions of any page without touching the CLI.
 */

const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../../..');

// ─── Page Registry ─────────────────────────────────────────────
// Maps every meaningful page to its source file(s) and metadata.
// "system" = om | omai | shared

const PAGE_REGISTRY = [
  // ── OrthodoxMetrics Public Pages ──
  { id: 'om-homepage',     title: 'Homepage',              route: '/frontend-pages/homepage',  system: 'om', category: 'public', files: ['front-end/src/features/pages/frontend-pages/Homepage.tsx'] },
  { id: 'om-about',        title: 'About',                 route: '/frontend-pages/about',     system: 'om', category: 'public', files: ['front-end/src/features/pages/frontend-pages/About.tsx'] },
  { id: 'om-contact',      title: 'Contact',               route: '/frontend-pages/contact',   system: 'om', category: 'public', files: ['front-end/src/features/pages/frontend-pages/Contact.tsx'] },
  { id: 'om-tour',         title: 'Tour',                  route: '/tour',                     system: 'om', category: 'public', files: ['front-end/src/features/pages/frontend-pages/Tour.tsx'] },
  { id: 'om-pricing',      title: 'Pricing',               route: '/frontend-pages/pricing',   system: 'om', category: 'public', files: ['front-end/src/features/pages/frontend-pages/Pricing.tsx'] },
  { id: 'om-faq',          title: 'FAQ',                   route: '/frontend-pages/faq',       system: 'om', category: 'public', files: ['front-end/src/features/pages/frontend-pages/Faq.tsx'] },
  { id: 'om-blog',         title: 'Blog',                  route: '/frontend-pages/blog',      system: 'om', category: 'public', files: ['front-end/src/features/pages/frontend-pages/Blog.tsx'] },
  { id: 'om-samples',      title: 'Samples',               route: '/samples',                  system: 'om', category: 'public', files: ['front-end/src/features/pages/frontend-pages/Samples.tsx'] },
  { id: 'om-portfolio',    title: 'Portfolio',              route: '/frontend-pages/portfolio', system: 'om', category: 'public', files: ['front-end/src/features/pages/frontend-pages/Portfolio.tsx'] },
  { id: 'om-oca-timeline', title: 'OCA Timeline',          route: '/frontend-pages/oca-timeline', system: 'om', category: 'public', files: ['front-end/src/features/pages/frontend-pages/OCATimeline.tsx'] },

  // ── OrthodoxMetrics Public Layout / Shared Components ──
  { id: 'om-public-layout', title: 'Public Layout',        route: '(layout)',                  system: 'om', category: 'layout', files: ['front-end/src/layouts/public/PublicLayout.tsx'] },
  { id: 'om-public-header', title: 'Public Header',        route: '(layout)',                  system: 'om', category: 'layout', files: ['front-end/src/features/pages/frontend-pages/Header.tsx'] },
  { id: 'om-public-footer', title: 'Public Footer',        route: '(layout)',                  system: 'om', category: 'layout', files: ['front-end/src/features/pages/frontend-pages/Footer.tsx'] },

  // ── OrthodoxMetrics Tour Components ──
  { id: 'om-tour-demo',    title: 'Tour Interactive Demo',  route: '/tour',                    system: 'om', category: 'component', files: [
    'front-end/src/components/frontend-pages/tour/TourInteractiveDemo.tsx',
    'front-end/src/components/frontend-pages/tour/DemoStepDigitize.tsx',
    'front-end/src/components/frontend-pages/tour/DemoStepOrganize.tsx',
    'front-end/src/components/frontend-pages/tour/DemoStepSearch.tsx',
    'front-end/src/components/frontend-pages/tour/DemoStepAnalytics.tsx',
    'front-end/src/components/frontend-pages/tour/tourDemoData.ts',
  ]},

  // ── OrthodoxMetrics Shared Sections ──
  { id: 'om-shared-sections', title: 'Shared Page Sections', route: '(shared)', system: 'om', category: 'component', files: [
    'front-end/src/components/frontend-pages/shared/sections/HeroSection.tsx',
    'front-end/src/components/frontend-pages/shared/sections/CTASection.tsx',
    'front-end/src/components/frontend-pages/shared/sections/index.ts',
  ]},

  // ── OrthodoxMetrics Admin ──
  { id: 'om-admin-control', title: 'Admin Control Panel',   route: '/admin/control-panel',     system: 'om', category: 'admin', files: ['front-end/src/features/admin/control-panel/AdminControlPanelPage.tsx'] },
  { id: 'om-admin-main',    title: 'Admin Main',            route: '/admin',                   system: 'om', category: 'admin', files: ['front-end/src/features/admin/AdminControlPanel.tsx'] },

  // ── OrthodoxMetrics Portal ──
  { id: 'om-portal-hub',   title: 'Church Portal Hub',      route: '/portal',                  system: 'om', category: 'portal', files: ['front-end/src/features/portal/ChurchPortalHub.tsx'] },
  { id: 'om-portal-records', title: 'Portal Records',       route: '/portal/records',          system: 'om', category: 'portal', files: ['front-end/src/features/records-centralized/PortalRecordsPage.tsx'] },

  // ── OrthodoxMetrics Auth ──
  { id: 'om-login',        title: 'Login',                  route: '/auth/login',              system: 'om', category: 'auth', files: ['front-end/src/features/auth/login/Login2.tsx'] },

  // ── OrthodoxMetrics Router / Config ──
  { id: 'om-router',       title: 'Router',                 route: '(config)',                 system: 'om', category: 'config', files: ['front-end/src/routes/Router.tsx'] },
  { id: 'om-public-routes', title: 'Public Routes Config',  route: '(config)',                 system: 'om', category: 'config', files: ['front-end/src/config/publicRoutes.ts'] },
  { id: 'om-feature-registry', title: 'Feature Registry',   route: '(config)',                 system: 'om', category: 'config', files: ['front-end/src/config/featureRegistry.ts'] },

  // ── Backend Routes ──
  { id: 'om-be-index',     title: 'Backend Entry',          route: '(backend)',                system: 'om', category: 'backend', files: ['server/src/index.ts'] },
  { id: 'om-be-snapshots', title: 'Snapshots API',          route: '/api/snapshots',           system: 'om', category: 'backend', files: ['server/src/routes/snapshots.js'] },
  { id: 'om-be-records',   title: 'Records API',            route: '/api/records',             system: 'om', category: 'backend', files: ['server/src/routes/records.js'] },
  { id: 'om-be-ocr',       title: 'OCR Routes',             route: '/api/church/:id/ocr',      system: 'om', category: 'backend', files: ['server/src/routes/ocr/index.ts'] },
];

// Helper: safely exec git
function git(cmd, opts = {}) {
  return execSync(`git ${cmd}`, {
    cwd: PROJECT_ROOT,
    encoding: 'utf-8',
    timeout: opts.timeout || 15000,
    ...opts,
  }).trim();
}

// ─── GET /registry ──────────────────────────────────────────────
// Returns the full page registry with file-existence checks.
router.get('/registry', (req, res) => {
  try {
    const registry = PAGE_REGISTRY.map(p => {
      const filesExist = p.files.map(f => ({
        path: f,
        exists: fs.existsSync(path.join(PROJECT_ROOT, f)),
      }));
      return { ...p, filesExist };
    });
    res.json({ pages: registry });
  } catch (err) {
    console.error('page-snapshots /registry error:', err);
    res.status(500).json({ error: 'Failed to load registry' });
  }
});

// ─── GET /history/:pageId ───────────────────────────────────────
// Git log for a page's source files, paginated.
router.get('/history/:pageId', (req, res) => {
  try {
    const page = PAGE_REGISTRY.find(p => p.id === req.params.pageId);
    if (!page) return res.status(404).json({ error: 'Page not found in registry' });

    const limit  = Math.min(parseInt(req.query.limit) || 25, 100);
    const offset = parseInt(req.query.skip) || 0;

    // Build file list for git log
    const fileArgs = page.files.map(f => `"${f}"`).join(' ');

    // Get total count first
    let total = 0;
    try {
      const countOut = git(`log --oneline -- ${fileArgs} | wc -l`, { timeout: 10000 });
      total = parseInt(countOut) || 0;
    } catch { total = 0; }

    if (total === 0) {
      return res.json({ page: { id: page.id, title: page.title }, commits: [], total: 0, limit, offset });
    }

    // Get paginated commits with details
    const format = '%H|%an|%ae|%aI|%s';
    const raw = git(`log --skip=${offset} -n ${limit} --pretty=format:"${format}" -- ${fileArgs}`);

    const commits = raw.split('\n').filter(Boolean).map(line => {
      const [hash, author, email, date, ...msgParts] = line.split('|');
      const message = msgParts.join('|'); // message may contain |
      return { hash, author, email, date, message };
    });

    // For each commit, get the list of changed files (only the page's files)
    const enriched = commits.map(c => {
      try {
        const changedRaw = git(`diff-tree --no-commit-id --name-only -r ${c.hash} -- ${fileArgs}`);
        const changedFiles = changedRaw ? changedRaw.split('\n').filter(Boolean) : [];
        return { ...c, changedFiles };
      } catch {
        return { ...c, changedFiles: [] };
      }
    });

    res.json({
      page: { id: page.id, title: page.title, route: page.route, system: page.system },
      commits: enriched,
      total,
      limit,
      offset,
    });
  } catch (err) {
    console.error('page-snapshots /history error:', err);
    res.status(500).json({ error: 'Failed to load history' });
  }
});

// ─── GET /file-content ──────────────────────────────────────────
// Returns file content at a specific commit.
// Query: ?commit=abc123&file=front-end/src/.../About.tsx
router.get('/file-content', (req, res) => {
  try {
    const { commit, file } = req.query;
    if (!commit || !file) return res.status(400).json({ error: 'commit and file params required' });

    // Validate file is in registry
    const isRegistered = PAGE_REGISTRY.some(p => p.files.includes(file));
    if (!isRegistered) return res.status(403).json({ error: 'File not in page registry' });

    let content;
    if (commit === 'current') {
      const fullPath = path.join(PROJECT_ROOT, file);
      if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not found on disk' });
      content = fs.readFileSync(fullPath, 'utf-8');
    } else {
      content = git(`show ${commit}:${file}`);
    }

    res.json({ commit, file, content, lines: content.split('\n').length });
  } catch (err) {
    if (err.message && err.message.includes('does not exist')) {
      return res.status(404).json({ error: 'File did not exist at that commit' });
    }
    console.error('page-snapshots /file-content error:', err);
    res.status(500).json({ error: 'Failed to get file content' });
  }
});

// ─── GET /diff ──────────────────────────────────────────────────
// Returns unified diff between two commits for a file.
// Query: ?file=...&from=commitA&to=commitB  (to=current for working tree)
router.get('/diff', (req, res) => {
  try {
    const { file, from, to } = req.query;
    if (!file || !from) return res.status(400).json({ error: 'file and from params required' });

    const isRegistered = PAGE_REGISTRY.some(p => p.files.includes(file));
    if (!isRegistered) return res.status(403).json({ error: 'File not in page registry' });

    const toRef = (!to || to === 'current') ? 'HEAD' : to;
    let diff;
    try {
      diff = git(`diff ${from}..${toRef} -- "${file}"`, { timeout: 10000 });
    } catch {
      diff = '';
    }

    // Also get the two versions' content for side-by-side
    let oldContent = '', newContent = '';
    try { oldContent = git(`show ${from}:"${file}"`); } catch { /* file didn't exist */ }
    try {
      if (!to || to === 'current') {
        const fullPath = path.join(PROJECT_ROOT, file);
        newContent = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf-8') : '';
      } else {
        newContent = git(`show ${toRef}:"${file}"`);
      }
    } catch { /* file doesn't exist */ }

    res.json({ file, from, to: toRef, diff, oldContent, newContent });
  } catch (err) {
    console.error('page-snapshots /diff error:', err);
    res.status(500).json({ error: 'Failed to generate diff' });
  }
});

// ─── POST /restore ──────────────────────────────────────────────
// Restores a file from a specific commit. Creates a safety backup first.
// Body: { commit, file, dryRun? }
router.post('/restore', (req, res) => {
  try {
    const { commit, file, dryRun } = req.body;
    if (!commit || !file) return res.status(400).json({ error: 'commit and file required' });

    const isRegistered = PAGE_REGISTRY.some(p => p.files.includes(file));
    if (!isRegistered) return res.status(403).json({ error: 'File not in page registry' });

    // Get the old content
    let oldContent;
    try {
      oldContent = git(`show ${commit}:"${file}"`);
    } catch {
      return res.status(404).json({ error: 'File did not exist at that commit' });
    }

    const fullPath = path.join(PROJECT_ROOT, file);
    const currentContent = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf-8') : null;

    if (dryRun) {
      return res.json({
        dryRun: true,
        file,
        commit,
        currentLines: currentContent ? currentContent.split('\n').length : 0,
        restoreLines: oldContent.split('\n').length,
        identical: currentContent === oldContent,
      });
    }

    // Create backup directory
    const backupDir = path.join(PROJECT_ROOT, '.page-snapshot-backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    // Save current version as backup
    if (currentContent !== null) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `${path.basename(file)}.${ts}.bak`;
      fs.writeFileSync(path.join(backupDir, backupName), currentContent);
    }

    // Write the restored content
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, oldContent);

    res.json({
      success: true,
      file,
      commit,
      restoredLines: oldContent.split('\n').length,
      backupCreated: currentContent !== null,
    });
  } catch (err) {
    console.error('page-snapshots /restore error:', err);
    res.status(500).json({ error: 'Failed to restore file', details: err.message });
  }
});

// ─── GET /search ────────────────────────────────────────────────
// Search commits by message, author, date range, or file keywords.
router.get('/search', (req, res) => {
  try {
    const { q, author, since, until, page: pageId } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);

    let fileArgs = '';
    if (pageId) {
      const page = PAGE_REGISTRY.find(p => p.id === pageId);
      if (page) fileArgs = '-- ' + page.files.map(f => `"${f}"`).join(' ');
    }

    const parts = [`log -n ${limit} --pretty=format:"%H|%an|%ae|%aI|%s"`];
    if (q)      parts.push(`--grep="${q.replace(/"/g, '\\"')}" -i`);
    if (author) parts.push(`--author="${author.replace(/"/g, '\\"')}"`);
    if (since)  parts.push(`--since="${since}"`);
    if (until)  parts.push(`--until="${until}"`);
    if (fileArgs) parts.push(fileArgs);

    const raw = git(parts.join(' '));
    const commits = raw ? raw.split('\n').filter(Boolean).map(line => {
      const [hash, authorName, email, date, ...msgParts] = line.split('|');
      return { hash, author: authorName, email, date, message: msgParts.join('|') };
    }) : [];

    res.json({ commits, query: { q, author, since, until, pageId } });
  } catch (err) {
    console.error('page-snapshots /search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ─── GET /sections/:pageId/:commit ──────────────────────────────
// Attempts to extract named sections/components from a page at a
// given commit.  Uses simple heuristic: JSX comment blocks, named
// <section> wrappers, or component imports.
router.get('/sections/:pageId/:commit', (req, res) => {
  try {
    const page = PAGE_REGISTRY.find(p => p.id === req.params.pageId);
    if (!page) return res.status(404).json({ error: 'Page not found' });

    const mainFile = page.files[0]; // Primary file
    let content;
    try {
      content = req.params.commit === 'current'
        ? fs.readFileSync(path.join(PROJECT_ROOT, mainFile), 'utf-8')
        : git(`show ${req.params.commit}:"${mainFile}"`);
    } catch {
      return res.status(404).json({ error: 'File not available at that commit' });
    }

    const lines = content.split('\n');
    const sections = [];

    // Strategy 1: Find JSX comment markers like {/* Hero */}, {/* Features */}
    const commentPattern = /\{\/\*\s*(.+?)\s*\*\/\}/;
    // Strategy 2: Find <section ...> blocks
    const sectionPattern = /<section\b/;
    // Strategy 3: Find component tags at top-level JSX
    const componentPattern = /^\s*<([A-Z][A-Za-z]+)/;

    let currentSection = null;
    let sectionStart = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const commentMatch = line.match(commentPattern);
      const sectionMatch = line.match(sectionPattern);
      const componentMatch = line.match(componentPattern);

      if (commentMatch || sectionMatch) {
        if (currentSection) {
          sections.push({
            name: currentSection,
            startLine: sectionStart + 1,
            endLine: i,
            content: lines.slice(sectionStart, i).join('\n'),
          });
        }
        currentSection = commentMatch ? commentMatch[1] : `Section at line ${i + 1}`;
        sectionStart = i;
      } else if (componentMatch && !currentSection) {
        // Track standalone component tags
        currentSection = componentMatch[1];
        sectionStart = i;
      }
    }

    // Close final section
    if (currentSection) {
      sections.push({
        name: currentSection,
        startLine: sectionStart + 1,
        endLine: lines.length,
        content: lines.slice(sectionStart).join('\n'),
      });
    }

    res.json({
      page: { id: page.id, title: page.title },
      commit: req.params.commit,
      file: mainFile,
      totalLines: lines.length,
      sections,
    });
  } catch (err) {
    console.error('page-snapshots /sections error:', err);
    res.status(500).json({ error: 'Failed to extract sections' });
  }
});

module.exports = router;
