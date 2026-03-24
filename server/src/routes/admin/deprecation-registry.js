/**
 * Admin Deprecation Registry Routes
 *
 * Manages the deprecation pipeline: risk analysis, stage advancement,
 * and dependency scanning (Router.tsx, MenuItems.ts, source imports).
 *
 * All endpoints require super_admin role.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getAppPool } = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth');

const FRONTEND_SRC = path.resolve(__dirname, '../../../../front-end/src');
const ROUTER_FILE = path.join(FRONTEND_SRC, 'routes/Router.tsx');
const MENU_FILE = path.join(FRONTEND_SRC, 'layouts/full/vertical/sidebar/MenuItems.ts');

// ── Auth middleware ──────────────────────────────────────────

router.use(requireAuth);
router.use(requireRole(['super_admin']));

// ── Helpers ─────────────────────────────────────────────────

/** Read a file safely, return empty string on failure */
function readFileSafe(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
}

/** Recursively collect .ts/.tsx/.js/.jsx source files */
function collectSourceFiles(dir, results = []) {
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
        collectSourceFiles(full, results);
      } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
        results.push(full);
      }
    }
  } catch { /* skip unreadable dirs */ }
  return results;
}

/**
 * Analyze a deprecated component's risk by scanning:
 * 1. Router.tsx — route definitions and lazy imports
 * 2. MenuItems.ts — sidebar menu href references
 * 3. All source files — import statements referencing the component's files
 */
function analyzeComponent(entry) {
  const routerContent = readFileSafe(ROUTER_FILE);
  const menuContent = readFileSafe(MENU_FILE);

  // Build search terms — only the DEPRECATED component's own route, not the replacement
  const routePatterns = [];
  if (entry.originalRoute) routePatterns.push(entry.originalRoute);

  // Extract component/file basenames for import scanning
  const fileBaseNames = (entry.files || []).map(f => {
    const base = path.basename(f).replace(/\.(tsx?|jsx?)$/, '');
    return base;
  }).filter(Boolean);

  // File paths relative to front-end/src/ for import matching
  const relPaths = (entry.files || []).map(f => f.replace(/\.(tsx?|jsx?)$/, '').replace(/\/$/, ''));

  // 1. Router.tsx analysis
  const routerLines = routerContent.split('\n');
  const routerRefs = [];
  for (let i = 0; i < routerLines.length; i++) {
    const line = routerLines[i];
    // Check for route path references (not just Navigate/redirect lines)
    // Redirect detection: check current line AND the next line (path + element often on adjacent lines)
    const nextLine = routerLines[i + 1] || '';
    const isRedirect = /Navigate\s+to=/.test(line) || /Navigate\s+to=/.test(nextLine);
    for (const rp of routePatterns) {
      if (line.includes(rp)) {
        routerRefs.push({ line: i + 1, text: line.trim(), isRedirect, pattern: rp });
      }
    }
    // Check for lazy import of the component file
    for (const base of fileBaseNames) {
      if (line.includes(base) && /import|lazy|Loadable/.test(line)) {
        routerRefs.push({ line: i + 1, text: line.trim(), isRedirect: false, pattern: base });
      }
    }
  }
  // Deduplicate by line number
  const uniqueRouterRefs = [...new Map(routerRefs.map(r => [r.line, r])).values()];
  // Active router refs = non-redirect references (redirects are expected in stage 1)
  const activeRouterRefs = uniqueRouterRefs.filter(r => !r.isRedirect);

  // 2. MenuItems.ts analysis
  const menuLines = menuContent.split('\n');
  const menuRefs = [];
  for (let i = 0; i < menuLines.length; i++) {
    const line = menuLines[i];
    for (const rp of routePatterns) {
      if (line.includes(rp)) {
        menuRefs.push({ line: i + 1, text: line.trim(), pattern: rp });
      }
    }
    for (const base of fileBaseNames) {
      if (line.includes(base)) {
        menuRefs.push({ line: i + 1, text: line.trim(), pattern: base });
      }
    }
  }
  const uniqueMenuRefs = [...new Map(menuRefs.map(r => [r.line, r])).values()];

  // 3. Full source import scan
  const allFiles = collectSourceFiles(FRONTEND_SRC);
  const importRefs = [];
  const dependentComponents = [];

  for (const filePath of allFiles) {
    // Skip the deprecated component's own files
    const relFromSrc = path.relative(FRONTEND_SRC, filePath);
    const isOwnFile = (entry.files || []).some(f => {
      const cleanF = f.replace(/\/$/, '');
      return relFromSrc.startsWith(cleanF) || relFromSrc.replace(/\.(tsx?|jsx?)$/, '').startsWith(cleanF.replace(/\.(tsx?|jsx?)$/, ''));
    });
    if (isOwnFile) continue;

    const content = readFileSafe(filePath);
    if (!content) continue;

    for (const base of fileBaseNames) {
      // Match import/require statements referencing the component
      const importPattern = new RegExp(`(?:import\\s.*from\\s+['"][^'"]*${base}['"]|require\\(['"][^'"]*${base}['"]\\))`, 'g');
      const matches = content.match(importPattern);
      if (matches) {
        for (const match of matches) {
          importRefs.push({
            file: relFromSrc,
            match: match.trim(),
            component: base,
          });
        }
        // Track this as a dependent component
        const depName = path.basename(filePath).replace(/\.(tsx?|jsx?)$/, '');
        if (!dependentComponents.includes(depName)) {
          dependentComponents.push(depName);
        }
      }
    }

    // Also check for path-based imports
    for (const relP of relPaths) {
      if (relP.endsWith('/')) continue; // directory, skip
      const shortPath = relP.split('/').slice(-2).join('/');
      const importPattern = new RegExp(`(?:import\\s.*from\\s+['"][^'"]*${shortPath}['"]|require\\(['"][^'"]*${shortPath}['"]\\))`, 'g');
      const matches = content.match(importPattern);
      if (matches) {
        for (const match of matches) {
          const already = importRefs.some(r => r.file === path.relative(FRONTEND_SRC, filePath) && r.match === match.trim());
          if (!already) {
            importRefs.push({
              file: relFromSrc,
              match: match.trim(),
              component: shortPath,
            });
            const depName = path.basename(filePath).replace(/\.(tsx?|jsx?)$/, '');
            if (!dependentComponents.includes(depName)) {
              dependentComponents.push(depName);
            }
          }
        }
      }
    }
  }

  // Calculate risk level based on active references
  const totalActiveRefs = activeRouterRefs.length + uniqueMenuRefs.length + importRefs.length;
  let riskLevel;
  if (totalActiveRefs === 0) {
    riskLevel = 'no_risk';
  } else if (totalActiveRefs <= 2 && dependentComponents.length <= 1) {
    riskLevel = 'low';
  } else if (totalActiveRefs <= 5 && dependentComponents.length <= 3) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }

  return {
    riskLevel,
    routerRefs: uniqueRouterRefs,
    activeRouterRefs,
    menuRefs: uniqueMenuRefs,
    importRefs,
    dependentComponents,
    totalActiveRefs,
    routerRemoved: activeRouterRefs.length === 0,
    menuRemoved: uniqueMenuRefs.length === 0,
  };
}

/**
 * Check whether files still exist on disk
 */
function checkFilesExist(entry) {
  return (entry.files || []).map(f => {
    const fullPath = path.join(FRONTEND_SRC, f);
    const exists = fs.existsSync(fullPath);
    return { file: f, exists };
  });
}

// ── Routes ──────────────────────────────────────────────────

/**
 * GET / — List all entries merged from static registry + DB overrides
 */
router.get('/', async (req, res) => {
  try {
    const pool = getAppPool();
    const [dbRows] = await pool.query('SELECT * FROM deprecation_tracking');
    const dbMap = new Map(dbRows.map(r => [r.id, r]));

    // Return DB rows plus metadata
    res.json({
      success: true,
      tracking: dbRows,
      trackingMap: Object.fromEntries(dbMap),
    });
  } catch (err) {
    console.error('[deprecation-registry] GET / error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch tracking data' });
  }
});

/**
 * GET /:id/analysis — Run dependency/risk analysis for a component
 */
router.get('/:id/analysis', async (req, res) => {
  try {
    const { id } = req.params;

    // We need the entry data from the request (since registry is in frontend)
    // Accept entry data as query params or look up from DB
    const entryData = {
      id,
      files: req.query.files ? JSON.parse(req.query.files) : [],
      originalRoute: req.query.originalRoute || null,
      redirectTo: req.query.redirectTo || null,
    };

    const analysis = analyzeComponent(entryData);
    const fileStatus = checkFilesExist(entryData);

    // Persist analysis results to DB
    const pool = getAppPool();
    await pool.query(
      `INSERT INTO deprecation_tracking (id, risk_level, router_refs, menu_refs, import_refs, dependent_components, last_analysis_at, last_analysis_by, router_removed, menu_removed)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         risk_level = VALUES(risk_level),
         router_refs = VALUES(router_refs),
         menu_refs = VALUES(menu_refs),
         import_refs = VALUES(import_refs),
         dependent_components = VALUES(dependent_components),
         last_analysis_at = NOW(),
         last_analysis_by = VALUES(last_analysis_by),
         router_removed = VALUES(router_removed),
         menu_removed = VALUES(menu_removed)`,
      [
        id,
        analysis.riskLevel,
        analysis.activeRouterRefs.length,
        analysis.menuRefs.length,
        analysis.importRefs.length,
        JSON.stringify(analysis.dependentComponents),
        req.user.email,
        analysis.routerRemoved ? 1 : 0,
        analysis.menuRemoved ? 1 : 0,
      ]
    );

    // Log the analysis
    await pool.query(
      `INSERT INTO deprecation_history (entry_id, from_stage, to_stage, action, details, performed_by)
       VALUES (?, 0, 0, 'run_analysis', ?, ?)`,
      [id, JSON.stringify({ riskLevel: analysis.riskLevel, totalActiveRefs: analysis.totalActiveRefs }), req.user.email]
    );

    res.json({
      success: true,
      analysis: {
        riskLevel: analysis.riskLevel,
        totalActiveRefs: analysis.totalActiveRefs,
        router: {
          total: analysis.routerRefs.length,
          active: analysis.activeRouterRefs.length,
          redirects: analysis.routerRefs.length - analysis.activeRouterRefs.length,
          refs: analysis.routerRefs,
        },
        menu: {
          total: analysis.menuRefs.length,
          refs: analysis.menuRefs,
        },
        imports: {
          total: analysis.importRefs.length,
          refs: analysis.importRefs.slice(0, 50), // Cap at 50 for response size
        },
        dependentComponents: analysis.dependentComponents,
        files: fileStatus,
      },
    });
  } catch (err) {
    console.error('[deprecation-registry] GET /:id/analysis error:', err);
    res.status(500).json({ success: false, error: 'Analysis failed', details: err.message });
  }
});

/**
 * POST /:id/advance — Advance a component to the next deprecation stage
 *
 * Body: { currentStage: number, entryData: { files, originalRoute, redirectTo } }
 *
 * Validates prerequisites before allowing advancement:
 *   1→2: route must redirect (or be removed), menu entry removed
 *   2→3: zero active imports confirmed by analysis
 *   3→4: files must be deleted from disk
 *   4→5: just an archive confirmation
 */
router.post('/:id/advance', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentStage, entryData } = req.body;

    if (!currentStage || currentStage < 1 || currentStage >= 5) {
      return res.status(400).json({ success: false, error: 'Invalid stage or already at final stage' });
    }

    const nextStage = currentStage + 1;
    const pool = getAppPool();

    // Get current tracking data
    const [existing] = await pool.query('SELECT * FROM deprecation_tracking WHERE id = ?', [id]);
    const tracking = existing[0] || null;

    // Run fresh analysis if we have entry data
    let analysis = null;
    if (entryData) {
      analysis = analyzeComponent(entryData);
    }

    // Stage-specific validation
    const blockers = [];

    if (currentStage === 1) {
      // Stage 1→2 (Deprecated → Quarantined): routes must redirect, menu must be removed
      if (analysis) {
        if (analysis.activeRouterRefs.length > 0) {
          blockers.push({
            type: 'router',
            message: `${analysis.activeRouterRefs.length} active route reference(s) still in Router.tsx (redirects are OK, active routes are not)`,
            refs: analysis.activeRouterRefs,
          });
        }
        if (analysis.menuRefs.length > 0) {
          blockers.push({
            type: 'menu',
            message: `${analysis.menuRefs.length} menu reference(s) still in MenuItems.ts`,
            refs: analysis.menuRefs,
          });
        }
      }
    } else if (currentStage === 2) {
      // Stage 2→3 (Quarantined → Verified): zero imports
      if (analysis && analysis.importRefs.length > 0) {
        blockers.push({
          type: 'imports',
          message: `${analysis.importRefs.length} import reference(s) found across ${analysis.dependentComponents.length} component(s)`,
          refs: analysis.importRefs.slice(0, 20),
          dependentComponents: analysis.dependentComponents,
        });
      }
      // Also check router and menu are clean
      if (analysis && analysis.activeRouterRefs.length > 0) {
        blockers.push({
          type: 'router',
          message: `${analysis.activeRouterRefs.length} active route reference(s) still in Router.tsx`,
          refs: analysis.activeRouterRefs,
        });
      }
      if (analysis && analysis.menuRefs.length > 0) {
        blockers.push({
          type: 'menu',
          message: `${analysis.menuRefs.length} menu reference(s) still in MenuItems.ts`,
          refs: analysis.menuRefs,
        });
      }
    } else if (currentStage === 3) {
      // Stage 3→4 (Verified → Removed): auto-delete dead-code files
      // Re-verify zero imports before deleting
      if (entryData) {
        const freshAnalysis = analyzeComponent(entryData);
        if (freshAnalysis.importRefs.length > 0) {
          blockers.push({
            type: 'imports',
            message: `${freshAnalysis.importRefs.length} import reference(s) still exist — cannot delete files`,
            refs: freshAnalysis.importRefs,
          });
        } else {
          // Safe to delete — zero imports confirmed
          const fileStatus = checkFilesExist(entryData);
          const deletedFiles = [];
          const failedFiles = [];
          for (const f of fileStatus) {
            if (f.exists) {
              try {
                const fullPath = path.join(FRONTEND_SRC, f.file);
                fs.unlinkSync(fullPath);
                deletedFiles.push(f.file);
              } catch (err) {
                failedFiles.push({ file: f.file, error: err.message });
              }
            }
          }
          if (failedFiles.length > 0) {
            blockers.push({
              type: 'files',
              message: `Failed to delete ${failedFiles.length} file(s)`,
              refs: failedFiles,
            });
          }
          // Store deletion details for the history record
          req._deletedFiles = deletedFiles;
        }
      }
    }
    // Stage 4→5: no blockers, just archive confirmation

    if (blockers.length > 0) {
      return res.status(422).json({
        success: false,
        error: 'Cannot advance — prerequisites not met',
        blockers,
        nextStage,
      });
    }

    // All clear — update the stage
    const fileStatus = entryData ? checkFilesExist(entryData) : [];
    const filesDeleted = entryData ? fileStatus.every(f => !f.exists) : false;

    await pool.query(
      `INSERT INTO deprecation_tracking (id, stage, router_removed, menu_removed, files_deleted, risk_level, router_refs, menu_refs, import_refs, dependent_components, last_analysis_at, last_analysis_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
       ON DUPLICATE KEY UPDATE
         stage = VALUES(stage),
         router_removed = VALUES(router_removed),
         menu_removed = VALUES(menu_removed),
         files_deleted = VALUES(files_deleted),
         risk_level = VALUES(risk_level),
         router_refs = VALUES(router_refs),
         menu_refs = VALUES(menu_refs),
         import_refs = VALUES(import_refs),
         dependent_components = VALUES(dependent_components),
         last_analysis_at = NOW(),
         last_analysis_by = VALUES(last_analysis_by)`,
      [
        id,
        nextStage,
        analysis ? (analysis.routerRemoved ? 1 : 0) : (tracking?.router_removed || 0),
        analysis ? (analysis.menuRemoved ? 1 : 0) : (tracking?.menu_removed || 0),
        filesDeleted ? 1 : 0,
        analysis?.riskLevel || tracking?.risk_level || null,
        analysis?.activeRouterRefs.length ?? tracking?.router_refs ?? 0,
        analysis?.menuRefs.length ?? tracking?.menu_refs ?? 0,
        analysis?.importRefs.length ?? tracking?.import_refs ?? 0,
        JSON.stringify(analysis?.dependentComponents || []),
        req.user.email,
      ]
    );

    // Record history
    await pool.query(
      `INSERT INTO deprecation_history (entry_id, from_stage, to_stage, action, details, performed_by)
       VALUES (?, ?, ?, 'advance_stage', ?, ?)`,
      [
        id,
        currentStage,
        nextStage,
        JSON.stringify({
          riskLevel: analysis?.riskLevel,
          blockers: [],
          analysis: analysis ? { totalActiveRefs: analysis.totalActiveRefs } : null,
          deletedFiles: req._deletedFiles || null,
        }),
        req.user.email,
      ]
    );

    res.json({
      success: true,
      message: `Advanced ${id} from stage ${currentStage} to stage ${nextStage}`,
      newStage: nextStage,
    });
  } catch (err) {
    console.error('[deprecation-registry] POST /:id/advance error:', err);
    res.status(500).json({ success: false, error: 'Advancement failed', details: err.message });
  }
});

/**
 * POST /:id/plan — Generate an automated action plan for the next stage transition.
 *
 * Orchestrates OMTrace (reverse dependency analysis) and Refactor Console
 * (dead code classification) to produce specific, actionable steps.
 *
 * Body: { currentStage: number, entryData: { files, originalRoute, redirectTo, name } }
 *
 * Returns a plan with ordered steps, each containing:
 *   - action: what to do
 *   - tool: which tool determined this (analysis | omtrace | refactor-console)
 *   - file: which file to edit
 *   - line: line number (if applicable)
 *   - detail: the exact code/content to change
 *   - status: 'pending' | 'done' (done if already resolved)
 */
router.post('/:id/plan', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentStage, entryData } = req.body;

    if (!currentStage || currentStage < 1 || currentStage >= 5) {
      return res.status(400).json({ success: false, error: 'Invalid stage or already at final stage' });
    }

    const nextStage = currentStage + 1;
    const steps = [];
    const analysis = entryData ? analyzeComponent(entryData) : null;
    const fileStatus = entryData ? checkFilesExist(entryData) : [];

    // ── Build the OMTrace reverse-dependency map ───────────
    let omtraceData = null;
    if (currentStage <= 3 && entryData?.files?.length > 0) {
      try {
        // Call OMTrace internally — same logic as the API endpoint
        const omtraceModule = require('../../api/omtrace');
        const omtraceFn = omtraceModule._analyzeInternal || null;

        // If internal fn isn't exported, use the file-based analysis we already have
        // plus enrich with line-level detail from reading the actual importing files
        if (!omtraceFn) {
          // Enrich import refs with line numbers by re-reading importing files
          if (analysis) {
            for (const ref of analysis.importRefs) {
              const fullPath = path.join(FRONTEND_SRC, ref.file);
              const content = readFileSafe(fullPath);
              if (!content) continue;
              const lines = content.split('\n');
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(ref.match.substring(0, 30)) || lines[i].includes(ref.component)) {
                  ref.line = i + 1;
                  ref.lineText = lines[i].trim();
                  break;
                }
              }
            }
          }
        }
      } catch (err) {
        console.log('[plan] OMTrace enrichment skipped:', err.message);
      }
    }

    // ── Refactor Console classification for file status ────
    let refactorClassification = null;
    if (currentStage >= 2 && entryData?.files?.length > 0) {
      try {
        // Check each file's dead-code status by looking for import refs
        refactorClassification = entryData.files.map(f => {
          const fullPath = path.join(FRONTEND_SRC, f);
          const exists = fs.existsSync(fullPath);
          // If file has zero imports from other components, it's dead code
          const refsToFile = analysis ? analysis.importRefs.filter(r =>
            r.component === path.basename(f).replace(/\.(tsx?|jsx?)$/, '')
          ).length : 0;
          return {
            file: f,
            exists,
            importCount: refsToFile,
            classification: !exists ? 'deleted' : refsToFile === 0 ? 'dead_code' : 'still_referenced',
          };
        });
      } catch (err) {
        console.log('[plan] Refactor classification skipped:', err.message);
      }
    }

    // ── Stage 1 → 2: Deprecated → Quarantined ────────────
    if (currentStage === 1 && analysis) {
      const componentName = entryData.name || id;

      // Step group: Router.tsx changes
      for (const ref of analysis.activeRouterRefs) {
        if (/Loadable|lazy|import/.test(ref.text)) {
          steps.push({
            action: `Remove lazy import for ${componentName}`,
            tool: 'analysis',
            file: 'front-end/src/routes/Router.tsx',
            line: ref.line,
            detail: ref.text,
            instruction: 'Delete this line entirely. The component should no longer be loaded.',
            status: 'pending',
            category: 'router',
          });
        } else {
          // Active route definition — needs to become a redirect or be removed
          const routerLines = readFileSafe(ROUTER_FILE).split('\n');
          // Look for the route block (path + element lines)
          const prevLine = routerLines[ref.line - 2]?.trim() || '';
          const nextLine = routerLines[ref.line]?.trim() || '';
          const hasElement = /element:/.test(nextLine);

          if (entryData.redirectTo) {
            steps.push({
              action: `Replace route element with redirect`,
              tool: 'analysis',
              file: 'front-end/src/routes/Router.tsx',
              line: ref.line,
              detail: ref.text,
              instruction: hasElement
                ? `Change the element on L${ref.line + 1} to: element: <Navigate to="${entryData.redirectTo}" replace />`
                : `Add redirect: element: <Navigate to="${entryData.redirectTo}" replace />`,
              status: 'pending',
              category: 'router',
            });
          } else {
            steps.push({
              action: `Remove route definition for ${entryData.originalRoute || componentName}`,
              tool: 'analysis',
              file: 'front-end/src/routes/Router.tsx',
              line: ref.line,
              detail: ref.text,
              instruction: 'Delete the entire route object ({ path: ..., element: ... }).',
              status: 'pending',
              category: 'router',
            });
          }
        }
      }

      // Already-done router items (redirects in place)
      const redirectRefs = analysis.routerRefs.filter(r => r.isRedirect);
      if (redirectRefs.length > 0) {
        steps.push({
          action: `Redirect already in place`,
          tool: 'analysis',
          file: 'front-end/src/routes/Router.tsx',
          line: redirectRefs[0].line,
          detail: redirectRefs.map(r => `L${r.line}: ${r.text}`).join('\n'),
          instruction: 'No action needed — redirect is already configured.',
          status: 'done',
          category: 'router',
        });
      }

      // Step group: MenuItems.ts changes
      if (analysis.menuRefs.length > 0) {
        // Read surrounding context to identify the full menu item block
        const menuLines = readFileSafe(MENU_FILE).split('\n');
        for (const ref of analysis.menuRefs) {
          // Find the enclosing menu item object (look backwards for { and forward for })
          let blockStart = ref.line - 1;
          let blockEnd = ref.line - 1;
          let braceDepth = 0;

          // Scan backwards for the opening { of the menu item
          for (let i = ref.line - 1; i >= Math.max(0, ref.line - 15); i--) {
            if (menuLines[i].includes('{')) { blockStart = i; break; }
          }
          // Scan forward for the closing }
          for (let i = ref.line - 1; i < Math.min(menuLines.length, ref.line + 15); i++) {
            if (menuLines[i].includes('},') || menuLines[i].trim() === '}') { blockEnd = i; break; }
          }

          const blockContent = menuLines.slice(blockStart, blockEnd + 1).map((l, i) => `L${blockStart + i + 1}: ${l}`).join('\n');

          steps.push({
            action: `Remove menu entry for ${entryData.originalRoute || componentName}`,
            tool: 'analysis',
            file: 'front-end/src/layouts/full/vertical/sidebar/MenuItems.ts',
            line: ref.line,
            detail: blockContent,
            instruction: `Delete the menu item object at lines ${blockStart + 1}–${blockEnd + 1}. This removes the sidebar navigation entry.`,
            status: 'pending',
            category: 'menu',
          });
        }
      } else {
        steps.push({
          action: 'Menu entry already removed',
          tool: 'analysis',
          file: 'front-end/src/layouts/full/vertical/sidebar/MenuItems.ts',
          line: null,
          detail: 'No references found in MenuItems.ts',
          instruction: 'No action needed.',
          status: 'done',
          category: 'menu',
        });
      }

      // If there are also import refs from other components, warn about them
      if (analysis.importRefs.length > 0) {
        steps.push({
          action: `Warning: ${analysis.importRefs.length} source import(s) from other components`,
          tool: 'omtrace',
          file: null,
          line: null,
          detail: analysis.importRefs.slice(0, 10).map(r =>
            `${r.file}${r.line ? `:${r.line}` : ''} — ${r.lineText || r.match}`
          ).join('\n'),
          instruction: 'These imports should be addressed in Stage 2→3. Not blocking for Stage 1→2.',
          status: 'info',
          category: 'imports',
        });
      }
    }

    // ── Stage 2 → 3: Quarantined → Verified ──────────────
    if (currentStage === 2 && analysis) {
      // Verify router + menu are clean
      if (analysis.activeRouterRefs.length === 0 && analysis.menuRefs.length === 0) {
        steps.push({
          action: 'Router and menu references confirmed clean',
          tool: 'analysis',
          file: null, line: null,
          detail: 'No active router or menu references found.',
          instruction: 'No action needed.',
          status: 'done',
          category: 'router',
        });
      } else {
        if (analysis.activeRouterRefs.length > 0) {
          steps.push({
            action: `Remove ${analysis.activeRouterRefs.length} remaining router reference(s)`,
            tool: 'analysis',
            file: 'front-end/src/routes/Router.tsx',
            line: analysis.activeRouterRefs[0].line,
            detail: analysis.activeRouterRefs.map(r => `L${r.line}: ${r.text}`).join('\n'),
            instruction: 'These should have been removed in Stage 1→2. Remove them now.',
            status: 'pending',
            category: 'router',
          });
        }
        if (analysis.menuRefs.length > 0) {
          steps.push({
            action: `Remove ${analysis.menuRefs.length} remaining menu reference(s)`,
            tool: 'analysis',
            file: 'front-end/src/layouts/full/vertical/sidebar/MenuItems.ts',
            line: analysis.menuRefs[0].line,
            detail: analysis.menuRefs.map(r => `L${r.line}: ${r.text}`).join('\n'),
            instruction: 'These should have been removed in Stage 1→2. Remove them now.',
            status: 'pending',
            category: 'menu',
          });
        }
      }

      // Main task: sever all import references
      if (analysis.importRefs.length === 0) {
        steps.push({
          action: 'Zero import references confirmed',
          tool: 'omtrace',
          file: null, line: null,
          detail: 'No files import this component. Safe to advance.',
          instruction: 'No action needed.',
          status: 'done',
          category: 'imports',
        });
      } else {
        // Group by importing file
        const byFile = {};
        for (const ref of analysis.importRefs) {
          if (!byFile[ref.file]) byFile[ref.file] = [];
          byFile[ref.file].push(ref);
        }

        for (const [file, refs] of Object.entries(byFile)) {
          steps.push({
            action: `Remove import(s) from ${path.basename(file)}`,
            tool: 'omtrace',
            file: `front-end/src/${file}`,
            line: refs[0].line || null,
            detail: refs.map(r =>
              `${r.line ? `L${r.line}: ` : ''}${r.lineText || r.match}`
            ).join('\n'),
            instruction: `Remove the import statement(s) referencing ${refs[0].component} and any usage of the imported symbols. If the importing file only existed to re-export this component, the importing file may also be dead code.`,
            status: 'pending',
            category: 'imports',
          });
        }
      }
    }

    // ── Stage 3 → 4: Verified → Removed ──────────────────
    if (currentStage === 3) {
      // Final import check
      if (analysis && analysis.importRefs.length > 0) {
        steps.push({
          action: `Blocked: ${analysis.importRefs.length} import reference(s) still exist`,
          tool: 'omtrace',
          file: null, line: null,
          detail: analysis.importRefs.slice(0, 10).map(r =>
            `${r.file}${r.line ? `:${r.line}` : ''} — ${r.lineText || r.match}`
          ).join('\n'),
          instruction: 'Cannot delete files while imports exist. Go back and sever imports first.',
          status: 'blocked',
          category: 'imports',
        });
      }

      // File deletion steps
      if (refactorClassification) {
        for (const fc of refactorClassification) {
          if (!fc.exists) {
            steps.push({
              action: `File already deleted: ${fc.file}`,
              tool: 'refactor-console',
              file: `front-end/src/${fc.file}`,
              line: null,
              detail: 'File no longer exists on disk.',
              instruction: 'No action needed.',
              status: 'done',
              category: 'files',
            });
          } else if (fc.classification === 'dead_code') {
            steps.push({
              action: `Will auto-delete: ${fc.file}`,
              tool: 'refactor-console',
              file: `front-end/src/${fc.file}`,
              line: null,
              detail: `Classification: dead code (0 imports from other components). Safe to delete.`,
              instruction: `This file will be automatically deleted when you advance. Recoverable from git history or Refactor Console backup snapshots.`,
              status: 'done',
              category: 'files',
            });
          } else {
            steps.push({
              action: `Warning: ${fc.file} still has ${fc.importCount} import reference(s)`,
              tool: 'refactor-console',
              file: `front-end/src/${fc.file}`,
              line: null,
              detail: `Classification: ${fc.classification}. Not safe to delete until imports are severed.`,
              instruction: 'Resolve remaining imports before deleting.',
              status: 'blocked',
              category: 'files',
            });
          }
        }
      } else {
        // At stage 3, imports are already verified clean — safe for auto-delete
        const zeroImports = !analysis || analysis.importRefs.length === 0;
        for (const fs of fileStatus) {
          steps.push({
            action: fs.exists
              ? (zeroImports ? `Will auto-delete: ${fs.file}` : `Delete file: ${fs.file}`)
              : `Already deleted: ${fs.file}`,
            tool: 'refactor-console',
            file: `front-end/src/${fs.file}`,
            line: null,
            detail: fs.exists
              ? (zeroImports ? 'Zero imports confirmed. File will be auto-deleted on advance.' : 'File exists on disk.')
              : 'File already removed.',
            instruction: fs.exists
              ? (zeroImports ? 'This file will be automatically deleted when you advance.' : 'Resolve imports first.')
              : 'No action needed.',
            status: fs.exists ? (zeroImports ? 'done' : 'blocked') : 'done',
            category: 'files',
          });
        }
      }
    }

    // ── Stage 4 → 5: Removed → Archived ──────────────────
    if (currentStage === 4) {
      // Verify files are actually gone
      const allDeleted = fileStatus.every(f => !f.exists);
      steps.push({
        action: allDeleted ? 'Files confirmed deleted' : 'Warning: Some files still exist on disk',
        tool: 'refactor-console',
        file: null, line: null,
        detail: fileStatus.map(f => `${f.file}: ${f.exists ? 'EXISTS' : 'deleted'}`).join('\n'),
        instruction: allDeleted
          ? 'All files have been removed. This component can be archived.'
          : 'Remove remaining files before archiving.',
        status: allDeleted ? 'done' : 'pending',
        category: 'files',
      });

      steps.push({
        action: 'Archive in deprecation history',
        tool: 'analysis',
        file: null, line: null,
        detail: `${entryData?.name || id} will be recorded as fully deprecated and archived.`,
        instruction: 'Confirm to finalize. The component entry remains in the registry as a historical record. Recovery is possible via git history or Refactor Console backups.',
        status: allDeleted ? 'pending' : 'blocked',
        category: 'archive',
      });
    }

    // ── Summary ───────────────────────────────────────────
    const pendingSteps = steps.filter(s => s.status === 'pending');
    const doneSteps = steps.filter(s => s.status === 'done');
    const blockedSteps = steps.filter(s => s.status === 'blocked');
    const canAdvance = pendingSteps.length === 0 && blockedSteps.length === 0 && doneSteps.length > 0;

    res.json({
      success: true,
      plan: {
        id,
        currentStage,
        nextStage,
        nextStageLabel: STAGE_LABELS[nextStage] || `Stage ${nextStage}`,
        riskLevel: analysis?.riskLevel || null,
        canAdvance,
        summary: {
          total: steps.length,
          pending: pendingSteps.length,
          done: doneSteps.length,
          blocked: blockedSteps.length,
          info: steps.filter(s => s.status === 'info').length,
        },
        steps,
      },
    });
  } catch (err) {
    console.error('[deprecation-registry] POST /:id/plan error:', err);
    res.status(500).json({ success: false, error: 'Plan generation failed', details: err.message });
  }
});

const STAGE_LABELS = { 1: 'Deprecated', 2: 'Quarantined', 3: 'Verified', 4: 'Removed', 5: 'Archived' };

/**
 * GET /:id/history — Get advancement history for a component
 */
router.get('/:id/history', async (req, res) => {
  try {
    const pool = getAppPool();
    const [rows] = await pool.query(
      'SELECT * FROM deprecation_history WHERE entry_id = ? ORDER BY performed_at DESC LIMIT 50',
      [req.params.id]
    );
    res.json({ success: true, history: rows });
  } catch (err) {
    console.error('[deprecation-registry] GET /:id/history error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

module.exports = router;
