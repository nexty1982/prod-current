/**
 * Page Content API — Source Code Text Editor
 *
 * Scans frontend TSX/TS files for text content (Typography, data arrays, etc.)
 * and allows super_admin to edit text directly in the source code.
 *
 * Mounted at /api/page-content
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Lazy-load change logger (avoid circular deps at startup)
let _logContentChange = null;
function getLogContentChange() {
  if (!_logContentChange) {
    try {
      _logContentChange = require('./page-content-builds').logContentChange;
    } catch (e) {
      console.warn('[page-content] Could not load change logger:', e.message);
      _logContentChange = () => Promise.resolve(null);
    }
  }
  return _logContentChange;
}

const FRONTEND_SRC = path.resolve(__dirname, '../../..', 'front-end/src');

// ── Import resolution — follow local component imports ──

/**
 * Parse import statements from TSX/TS source and resolve local paths.
 * Returns array of absolute file paths for local component imports.
 */
function resolveLocalImports(source, currentFileDir) {
  const imports = [];
  // Match: import Foo from '@/path' or import Foo from './path' or import { Foo } from '@/path'
  const importRe = /import\s+(?:\w+|{[^}]+})\s+from\s+['"](@\/[^'"]+|\.\.?\/[^'"]+)['"]/g;
  let match;
  while ((match = importRe.exec(source)) !== null) {
    let importPath = match[1];

    // Resolve @/ alias to FRONTEND_SRC
    if (importPath.startsWith('@/')) {
      importPath = path.join(FRONTEND_SRC, importPath.slice(2));
    } else {
      importPath = path.resolve(currentFileDir, importPath);
    }

    // Try common file extensions and index patterns
    const resolved = resolveFilePath(importPath);
    if (resolved) {
      imports.push(resolved);
    }
  }
  return imports;
}

/**
 * Given a bare import path, try to find the actual file on disk.
 * Handles: exact file, .tsx, .ts, .jsx, .js, /index.tsx, /index.ts
 */
function resolveFilePath(importPath) {
  const extensions = ['.tsx', '.ts', '.jsx', '.js'];

  // Already has extension?
  if (fs.existsSync(importPath)) {
    const stat = fs.statSync(importPath);
    if (stat.isFile()) return importPath;
    // It's a directory — look for index
    for (const ext of extensions) {
      const idx = path.join(importPath, `index${ext}`);
      if (fs.existsSync(idx)) return idx;
    }
    return null;
  }

  // Try adding extensions
  for (const ext of extensions) {
    if (fs.existsSync(importPath + ext)) return importPath + ext;
  }

  // Try as directory with index
  for (const ext of extensions) {
    const idx = path.join(importPath, `index${ext}`);
    if (fs.existsSync(idx)) return idx;
  }

  return null;
}

/**
 * Recursively scan a file and its local imports for text items.
 * Returns items tagged with their sourceFile (relative to FRONTEND_SRC).
 * visited set prevents infinite loops.
 */
function scanFileWithImports(absolutePath, visited = new Set()) {
  if (visited.has(absolutePath)) return [];
  visited.add(absolutePath);

  if (!fs.existsSync(absolutePath)) return [];

  const source = fs.readFileSync(absolutePath, 'utf-8');
  const relPath = path.relative(FRONTEND_SRC, absolutePath);
  const items = extractTextItems(source, relPath);

  // Tag each item with its source file
  for (const item of items) {
    item.sourceFile = relPath;
  }

  // Follow local imports (only within frontend-pages and components dirs)
  const dir = path.dirname(absolutePath);
  const localImports = resolveLocalImports(source, dir);
  for (const importedFile of localImports) {
    // Only follow imports within FRONTEND_SRC (skip node_modules, etc.)
    if (!importedFile.startsWith(FRONTEND_SRC)) continue;
    // Skip shared UI components that aren't content-heavy (PageContainer, etc.)
    const rel = path.relative(FRONTEND_SRC, importedFile);
    if (rel.startsWith('shared/') || rel.startsWith('api/') || rel.startsWith('hooks/') || rel.startsWith('store/') || rel.startsWith('utils/') || rel.startsWith('context/') || rel.startsWith('config/') || rel.startsWith('routes/') || rel.startsWith('layouts/') || rel.startsWith('theme/')) continue;
    const subItems = scanFileWithImports(importedFile, visited);
    items.push(...subItems);
  }

  return items;
}

// ── Page Registry — maps logical names to source files ──

const PAGE_REGISTRY = [
  // ── Frontend Pages (public-facing) ──────────────────────────
  {
    id: 'homepage',
    name: 'Homepage',
    file: 'features/pages/frontend-pages/Homepage.tsx',
    description: 'Public homepage — hero section, features, pricing, testimonials',
    category: 'frontend-pages',
  },
  {
    id: 'about',
    name: 'About',
    file: 'features/pages/frontend-pages/About.tsx',
    description: 'About page — mission, team, story',
    category: 'frontend-pages',
  },
  {
    id: 'contact',
    name: 'Contact',
    file: 'features/pages/frontend-pages/Contact.tsx',
    description: 'Contact page — form, address, support info',
    category: 'frontend-pages',
  },
  {
    id: 'pricing',
    name: 'Pricing',
    file: 'features/pages/frontend-pages/Pricing.tsx',
    description: 'Pricing page — plans, features, comparison',
    category: 'frontend-pages',
  },
  {
    id: 'faq',
    name: 'FAQ',
    file: 'features/pages/frontend-pages/Faq.tsx',
    description: 'Frequently Asked Questions',
    category: 'frontend-pages',
  },
  {
    id: 'blog',
    name: 'Blog',
    file: 'features/pages/frontend-pages/Blog.tsx',
    description: 'Blog listing page',
    category: 'frontend-pages',
  },
  {
    id: 'tour',
    name: 'Tour / How it Works',
    file: 'features/pages/frontend-pages/Tour.tsx',
    description: 'Product tour — how Orthodox Metrics works',
    category: 'frontend-pages',
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    file: 'features/pages/frontend-pages/Portfolio.tsx',
    description: 'Portfolio / showcase page',
    category: 'frontend-pages',
  },
  {
    id: 'welcome-message',
    name: 'Welcome Message',
    file: 'features/pages/frontend-pages/WelcomeMessage.tsx',
    description: 'Welcome message page for new users',
    category: 'frontend-pages',
  },
  {
    id: 'oca-timeline',
    name: 'OCA Timeline',
    file: 'features/pages/frontend-pages/OCATimeline.tsx',
    description: 'Orthodox Church in America historical timeline',
    category: 'frontend-pages',
  },
  {
    id: 'samples',
    name: 'Samples',
    file: 'features/pages/frontend-pages/Samples.tsx',
    description: 'Sample records / demo page',
    category: 'frontend-pages',
  },
  {
    id: 'sacramental-restrictions-public',
    name: 'Sacramental Restrictions (Public)',
    file: 'features/pages/frontend-pages/SacramentalRestrictionsPublicPage.tsx',
    description: 'Public page for sacramental date restrictions',
    category: 'frontend-pages',
  },
  // ── Shared Components (header, footer, etc.) ────────────────
  {
    id: 'shared-header',
    name: 'Header',
    file: 'features/pages/frontend-pages/Header.tsx',
    description: 'Shared page header component',
    category: 'shared-components',
  },
  {
    id: 'shared-footer',
    name: 'Footer',
    file: 'components/frontend-pages/shared/footer/index.tsx',
    description: 'Shared site footer — links, copyright, social',
    category: 'shared-components',
  },
  {
    id: 'shared-header-nav',
    name: 'Header Navigation',
    file: 'components/frontend-pages/shared/header/Navigations.tsx',
    description: 'Main navigation links in the header',
    category: 'shared-components',
  },
  {
    id: 'shared-c2a',
    name: 'Call to Action',
    file: 'components/frontend-pages/shared/c2a/index.tsx',
    description: 'Shared call-to-action banner component',
    category: 'shared-components',
  },
  {
    id: 'shared-pricing',
    name: 'Pricing Cards',
    file: 'components/frontend-pages/shared/pricing/index.tsx',
    description: 'Pricing card components',
    category: 'shared-components',
  },
  // ── Login & Auth ────────────────────────────────────────────
  {
    id: 'login',
    name: 'Login Page',
    file: 'features/auth/authentication/auth1/OrthodoxLogin.tsx',
    description: 'Login page with branding, features list, and sign-in form',
    category: 'auth',
  },
  // ── Admin / Portal Pages ────────────────────────────────────
  {
    id: 'admin-control-panel',
    name: 'Admin Control Panel',
    file: 'features/admin/control-panel/AdminControlPanel.tsx',
    description: 'Super admin hub with 7 category tiles',
    category: 'admin',
  },
  {
    id: 'church-portal',
    name: 'Church Portal Hub',
    file: 'features/portal/ChurchPortalHub.tsx',
    description: 'Portal landing page for church staff (records, tools, account)',
    category: 'admin',
  },
];

// ── Text extraction patterns ──

function extractTextItems(source, filePath) {
  const items = [];
  const lines = source.split('\n');

  // Pattern 1: Typography/Button text content — >text here<
  // Match: <Typography ...>text</Typography> or <Button ...>text</Button>
  const jsxTextRe = /(<(?:Typography|Button|Chip|Tab|DialogTitle|AlertTitle)[^>]*>)\s*([^<{][^<]*?)\s*(<\/(?:Typography|Button|Chip|Tab|DialogTitle|AlertTitle)>)/g;
  let match;
  while ((match = jsxTextRe.exec(source)) !== null) {
    const text = match[2].trim();
    if (text.length < 2 || /^[{(]/.test(text) || /[.]\w+\(/.test(text) || /=>\s*/.test(text) || /\bfunction\b/.test(text) || /getElementById|querySelector|console\./.test(text)) continue;
    const lineNum = source.substring(0, match.index).split('\n').length;
    items.push({
      id: `jsx-${lineNum}`,
      type: 'jsx-text',
      text,
      line: lineNum,
      context: getTagName(match[1]),
      original: match[0],
      matchStart: match.index,
      matchEnd: match.index + match[0].length,
    });
  }

  // Pattern 2: JSX props — title="text", description="text", label="text", alt="text"
  const propRe = /\b(title|description|label|alt|placeholder|helperText)=["']([^"']{2,})["']/g;
  while ((match = propRe.exec(source)) !== null) {
    const text = match[2].trim();
    const lineNum = source.substring(0, match.index).split('\n').length;
    items.push({
      id: `prop-${lineNum}-${match[1]}`,
      type: 'jsx-prop',
      text,
      line: lineNum,
      context: match[1],
      propName: match[1],
      original: match[0],
      matchStart: match.index,
      matchEnd: match.index + match[0].length,
    });
  }

  // Pattern 3: Object property strings — title: 'text' or description: 'text' etc.
  const objPropRe = /\b(title|description|desc|label|name|sectionTitle|message|subtitle|heading)\s*:\s*['"]([^'"]{2,})['"]/g;
  while ((match = objPropRe.exec(source)) !== null) {
    const text = match[2].trim();
    const lineNum = source.substring(0, match.index).split('\n').length;
    // Skip if it's a TypeScript type definition
    const lineBefore = lines[lineNum - 1] || '';
    if (lineBefore.includes('interface ') || lineBefore.includes('type ')) continue;
    items.push({
      id: `obj-${lineNum}-${match[1]}`,
      type: 'object-prop',
      text,
      line: lineNum,
      context: match[1],
      propName: match[1],
      original: match[0],
      matchStart: match.index,
      matchEnd: match.index + match[0].length,
    });
  }

  // Pattern 4: Multi-line JSX text (indented text between JSX tags on separate lines)
  // e.g.:  >
  //           Some long text here.
  //        </Typography>
  const multiLineRe = /(<(?:Typography|Box)[^>]*>\s*\n)([ \t]+)([^\n<{][^\n<]*)\n/g;
  while ((match = multiLineRe.exec(source)) !== null) {
    const text = match[3].trim();
    if (text.length < 3 || /^[{(\/]/.test(text) || /^(sx|variant|color|className|onClick)/.test(text)) continue;
    const lineNum = source.substring(0, match.index).split('\n').length + 1;
    // Avoid duplicates with Pattern 1
    if (items.some(i => i.text === text && Math.abs(i.line - lineNum) <= 1)) continue;
    items.push({
      id: `ml-${lineNum}`,
      type: 'jsx-text',
      text,
      line: lineNum,
      context: 'Typography (multiline)',
      original: match[3], // just the text line for replacement
      matchStart: match.index + match[1].length + match[2].length,
      matchEnd: match.index + match[1].length + match[2].length + match[3].length,
    });
  }

  // De-duplicate by text+line proximity
  const unique = [];
  for (const item of items) {
    const isDupe = unique.some(u => u.text === item.text && Math.abs(u.line - item.line) <= 2);
    if (!isDupe) unique.push(item);
  }

  // Sort by line number
  unique.sort((a, b) => a.line - b.line);
  return unique;
}

function getTagName(openTag) {
  const m = openTag.match(/<(\w+)/);
  return m ? m[1] : 'unknown';
}

// ── GET /api/page-content/pages — List all registered pages ──
router.get('/pages', requireAuth, requireRole(['super_admin']), (req, res) => {
  const pages = PAGE_REGISTRY.map(p => {
    const fullPath = path.join(FRONTEND_SRC, p.file);
    const exists = fs.existsSync(fullPath);
    return { ...p, exists, fullPath };
  });
  res.json({ success: true, data: pages });
});

// ── GET /api/page-content/scan/:pageId — Scan a page file and extract text ──
router.get('/scan/:pageId', requireAuth, requireRole(['super_admin']), (req, res) => {
  try {
    const page = PAGE_REGISTRY.find(p => p.id === req.params.pageId);
    if (!page) return res.status(404).json({ success: false, error: 'Page not found in registry' });

    const fullPath = path.join(FRONTEND_SRC, page.file);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, error: `File not found: ${page.file}` });
    }

    // Scan the main file + all its local imports recursively
    const items = scanFileWithImports(fullPath);

    // Collect unique source files scanned
    const sourceFiles = [...new Set(items.map(i => i.sourceFile))];
    const mainSource = fs.readFileSync(fullPath, 'utf-8');

    res.json({
      success: true,
      page: { id: page.id, name: page.name, file: page.file, description: page.description },
      items,
      totalLines: mainSource.split('\n').length,
      sourceFiles,
    });
  } catch (err) {
    console.error('[page-content] scan error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/page-content/update/:pageId — Update text in source file ──
router.put('/update/:pageId', requireAuth, requireRole(['super_admin']), (req, res) => {
  try {
    const page = PAGE_REGISTRY.find(p => p.id === req.params.pageId);
    if (!page) return res.status(404).json({ success: false, error: 'Page not found in registry' });

    const { items } = req.body; // Array of { id, oldText, newText, sourceFile? }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items array required' });
    }

    let updatedCount = 0;

    // Group edits by source file
    const editsByFile = {};
    for (const item of items) {
      const file = item.sourceFile || page.file;
      if (!editsByFile[file]) editsByFile[file] = [];
      editsByFile[file].push(item);
    }

    // Apply edits to each file
    for (const [relFile, fileItems] of Object.entries(editsByFile)) {
      const fullPath = path.join(FRONTEND_SRC, relFile);
      if (!fs.existsSync(fullPath)) {
        console.warn(`[page-content] File not found for update: ${relFile}`);
        continue;
      }

      let source = fs.readFileSync(fullPath, 'utf-8');
      let fileUpdated = 0;

      for (const item of fileItems) {
        const { oldText, newText } = item;
        if (!oldText || !newText || oldText === newText) continue;

        const idx = source.indexOf(oldText);
        if (idx === -1) {
          console.warn(`[page-content] Text not found in ${relFile}: "${oldText.substring(0, 50)}..."`);
          continue;
        }

        source = source.substring(0, idx) + newText + source.substring(idx + oldText.length);
        fileUpdated++;
      }

      if (fileUpdated > 0) {
        fs.writeFileSync(fullPath, source, 'utf-8');
        updatedCount += fileUpdated;
      }
    }

    // Log change and notify admins (fire-and-forget)
    if (updatedCount > 0) {
      const userId = req.session?.user?.id || req.user?.id;
      const filesChanged = Object.keys(editsByFile);
      getLogContentChange()(userId, page.id, page.name, filesChanged, updatedCount)
        .catch(err => console.error('[page-content] change log error:', err.message));
    }

    res.json({ success: true, updated: updatedCount });
  } catch (err) {
    console.error('[page-content] update error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/page-content/register — Add a new page to the registry ──
router.post('/register', requireAuth, requireRole(['super_admin']), (req, res) => {
  const { id, name, file, description } = req.body;
  if (!id || !name || !file) {
    return res.status(400).json({ success: false, error: 'id, name, and file are required' });
  }

  // Check for duplicates
  if (PAGE_REGISTRY.some(p => p.id === id)) {
    return res.status(409).json({ success: false, error: 'Page ID already registered' });
  }

  // Verify file exists
  const fullPath = path.join(FRONTEND_SRC, file);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ success: false, error: `File not found: ${file}` });
  }

  PAGE_REGISTRY.push({ id, name, file, description: description || '' });
  res.json({ success: true });
});

// ── GET /api/page-content/source/:pageId — Get raw source for a page ──
router.get('/source/:pageId', requireAuth, requireRole(['super_admin']), (req, res) => {
  try {
    const page = PAGE_REGISTRY.find(p => p.id === req.params.pageId);
    if (!page) return res.status(404).json({ success: false, error: 'Page not found in registry' });

    const fullPath = path.join(FRONTEND_SRC, page.file);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, error: `File not found: ${page.file}` });
    }

    const source = fs.readFileSync(fullPath, 'utf-8');
    res.json({ success: true, source, file: page.file });
  } catch (err) {
    console.error('[page-content] source error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
