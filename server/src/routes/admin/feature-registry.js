/**
 * Admin Feature Registry Routes
 *
 * Manages the feature promotion pipeline: readiness analysis, stage advancement,
 * and featureRegistry.ts file updates.
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
const REGISTRY_FILE = path.join(FRONTEND_SRC, 'config/featureRegistry.ts');
const ROUTER_FILE = path.join(FRONTEND_SRC, 'routes/Router.tsx');
const MENU_FILE = path.join(FRONTEND_SRC, 'layouts/full/vertical/sidebar/MenuItems.ts');

const STAGE_LABELS = { 1: 'Prototype', 2: 'Development', 3: 'Review', 4: 'Stabilizing', 5: 'Production' };

// ── Auth middleware ──────────────────────────────────────────

router.use(requireAuth);
router.use(requireRole(['super_admin']));

// ── Helpers ─────────────────────────────────────────────────

function readFileSafe(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
}

/**
 * Analyze a feature's readiness for promotion by scanning:
 * 1. Router.tsx — route definition, ProtectedRoute wrapping, EnvironmentAwarePage
 * 2. MenuItems.ts — sidebar menu entry
 * 3. featureRegistry.ts — current stage
 * 4. Change set status (if linked)
 */
function analyzeFeature(featureData) {
  const { id, route, changeSetCode } = featureData;
  const routerContent = readFileSafe(ROUTER_FILE);
  const routerLines = routerContent.split('\n');
  const menuContent = readFileSafe(MENU_FILE);
  const menuLines = menuContent.split('\n');
  const registryContent = readFileSafe(REGISTRY_FILE);

  // ── Router analysis ────────────────────────
  const routeRefs = [];
  let routeExists = false;
  let isProtected = false;
  let isEnvAwareWrapped = false;

  if (route) {
    // Clean route for matching (strip :params)
    const cleanRoute = route.replace(/\/:[^/]+/g, '');
    for (let i = 0; i < routerLines.length; i++) {
      const line = routerLines[i];
      // Check for path= or path: containing this route (JSX or JS object syntax)
      if ((line.includes('path:') || line.includes('path="')) && (line.includes(cleanRoute) || line.includes(route))) {
        routeExists = true;
        routeRefs.push({ line: i + 1, text: line.trim(), type: 'route' });

        // Look backwards for ProtectedRoute and EnvironmentAwarePage
        for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
          if (routerLines[j].includes('ProtectedRoute')) {
            isProtected = true;
          }
          if (routerLines[j].includes('EnvironmentAwarePage')) {
            isEnvAwareWrapped = true;
          }
        }
        // Also look forward
        for (let j = i + 1; j < Math.min(routerLines.length, i + 5); j++) {
          if (routerLines[j].includes('EnvironmentAwarePage')) {
            isEnvAwareWrapped = true;
          }
        }
      }
    }

    // Also check for featureId in EnvironmentAwarePage
    for (let i = 0; i < routerLines.length; i++) {
      if (routerLines[i].includes(`featureId="${id}"`)) {
        isEnvAwareWrapped = true;
        if (!routeRefs.some(r => r.line === i + 1)) {
          routeRefs.push({ line: i + 1, text: routerLines[i].trim(), type: 'env-aware' });
        }
      }
    }
  }

  // ── Menu analysis ──────────────────────────
  const menuRefs = [];
  if (route) {
    for (let i = 0; i < menuLines.length; i++) {
      const line = menuLines[i];
      if (line.includes(route) || line.includes(route.replace(/\/:[^/]+/g, ''))) {
        menuRefs.push({ line: i + 1, text: line.trim() });
      }
    }
  }

  // ── Registry stage ─────────────────────────
  let registryStage = null;
  const stageMatch = registryContent.match(new RegExp(`id:\\s*['"]${id}['"][^}]*stage:\\s*(\\d)`, 's'));
  if (stageMatch) registryStage = parseInt(stageMatch[1]);

  return {
    routeExists,
    isProtected,
    isEnvAwareWrapped,
    routeRefs,
    menuRefs,
    registryStage,
    hasMenu: menuRefs.length > 0,
  };
}

/**
 * Update featureRegistry.ts on disk to change a feature's stage number
 */
function updateRegistryStage(featureId, newStage) {
  const content = readFileSafe(REGISTRY_FILE);
  if (!content) throw new Error('Cannot read featureRegistry.ts');

  // Match the entry block for this feature and update the stage
  // Pattern: id: 'featureId' ... stage: N
  const pattern = new RegExp(
    `(\\{[^}]*id:\\s*['"]${featureId}['"][^}]*stage:\\s*)([1-5])`,
    's'
  );
  const match = content.match(pattern);
  if (!match) throw new Error(`Feature "${featureId}" not found in featureRegistry.ts`);

  const oldStage = parseInt(match[2]);
  if (oldStage === newStage) return { changed: false, oldStage, newStage };

  const newContent = content.replace(pattern, `$1${newStage}`);
  fs.writeFileSync(REGISTRY_FILE, newContent, 'utf8');
  return { changed: true, oldStage, newStage };
}

// ── Routes ──────────────────────────────────────────────────

/**
 * GET / — List all tracking data from DB
 */
router.get('/', async (req, res) => {
  try {
    const pool = getAppPool();
    const [dbRows] = await pool.query('SELECT * FROM feature_tracking');
    const dbMap = new Map(dbRows.map(r => [r.id, r]));

    res.json({
      success: true,
      tracking: dbRows,
      trackingMap: Object.fromEntries(dbMap),
    });
  } catch (err) {
    console.error('[feature-registry] GET / error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch tracking data' });
  }
});

/**
 * GET /:id/analysis — Analyze feature readiness
 */
router.get('/:id/analysis', async (req, res) => {
  try {
    const { id } = req.params;
    const route = req.query.route || null;
    const changeSetCode = req.query.changeSetCode || null;

    const analysis = analyzeFeature({ id, route, changeSetCode });

    // Look up change set status if linked
    let changeSetStatus = null;
    if (changeSetCode) {
      try {
        const pool = getAppPool();
        const [csRows] = await pool.query(
          'SELECT status FROM change_sets WHERE code = ?', [changeSetCode]
        );
        if (csRows.length > 0) changeSetStatus = csRows[0].status;
      } catch { /* ignore */ }
    }

    // Persist analysis to DB
    const pool = getAppPool();
    await pool.query(
      `INSERT INTO feature_tracking (id, stage, route_exists, route_protected, env_aware_wrapped, change_set_status)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         route_exists = VALUES(route_exists),
         route_protected = VALUES(route_protected),
         env_aware_wrapped = VALUES(env_aware_wrapped),
         change_set_status = VALUES(change_set_status)`,
      [
        id,
        analysis.registryStage || 1,
        analysis.routeExists ? 1 : 0,
        analysis.isProtected ? 1 : 0,
        analysis.isEnvAwareWrapped ? 1 : 0,
        changeSetStatus,
      ]
    );

    res.json({
      success: true,
      analysis: {
        ...analysis,
        changeSetStatus,
      },
    });
  } catch (err) {
    console.error('[feature-registry] GET /:id/analysis error:', err);
    res.status(500).json({ success: false, error: 'Analysis failed', details: err.message });
  }
});

/**
 * POST /:id/plan — Generate promotion plan for stage advancement
 */
router.post('/:id/plan', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentStage, featureData } = req.body;
    const nextStage = currentStage + 1;

    if (nextStage > 5) {
      return res.json({
        success: true,
        plan: { id, currentStage, nextStage: null, canAdvance: false, steps: [],
          summary: { total: 0, pending: 0, done: 0, blocked: 0, info: 0 } },
      });
    }

    // Run analysis
    const analysis = analyzeFeature({
      id,
      route: featureData?.route || null,
      changeSetCode: featureData?.changeSetCode || null,
    });

    // Look up change set status
    let changeSetStatus = null;
    if (featureData?.changeSetCode) {
      try {
        const pool = getAppPool();
        const [csRows] = await pool.query(
          'SELECT status FROM change_sets WHERE code = ?', [featureData.changeSetCode]
        );
        if (csRows.length > 0) changeSetStatus = csRows[0].status;
      } catch { /* ignore */ }
    }

    const steps = [];

    // ── Common checks for all promotions ──────────────────

    // Route existence check
    if (featureData?.route) {
      if (analysis.routeExists) {
        steps.push({
          action: 'Route defined in Router.tsx',
          tool: 'analysis',
          file: 'front-end/src/routes/Router.tsx',
          line: analysis.routeRefs[0]?.line || null,
          detail: analysis.routeRefs.map(r => `L${r.line}: ${r.text}`).join('\n'),
          instruction: 'Route exists. No action needed.',
          status: 'done',
          category: 'router',
        });
      } else {
        steps.push({
          action: 'Route not found in Router.tsx',
          tool: 'analysis',
          file: 'front-end/src/routes/Router.tsx',
          line: null,
          detail: `Expected route: ${featureData.route}`,
          instruction: 'Add route definition to Router.tsx before promoting.',
          status: currentStage >= 2 ? 'blocked' : 'info',
          category: 'router',
        });
      }
    } else {
      steps.push({
        action: 'No route defined for this feature',
        tool: 'analysis',
        file: null, line: null,
        detail: 'Backend-only or headless feature — no route needed.',
        instruction: 'No action needed if this is intentionally headless.',
        status: 'info',
        category: 'router',
      });
    }

    // ── Stage-specific checks ─────────────────────────────

    if (currentStage === 1) {
      // Stage 1→2 (Prototype → Development): basic structure needed
      steps.push({
        action: 'Prototype validated — moving to active development',
        tool: 'analysis',
        file: null, line: null,
        detail: 'Prototype concept has been explored. Moving to Development means committing to building the feature.',
        instruction: 'Confirm the feature concept is worth developing.',
        status: 'done',
        category: 'readiness',
      });
    }

    if (currentStage === 2) {
      // Stage 2→3 (Development → Review): must be functionally complete
      // Check EnvironmentAwarePage wrapping
      if (featureData?.route) {
        if (analysis.isEnvAwareWrapped) {
          steps.push({
            action: 'Wrapped with EnvironmentAwarePage',
            tool: 'analysis',
            file: 'front-end/src/routes/Router.tsx',
            line: analysis.routeRefs.find(r => r.type === 'env-aware')?.line || null,
            detail: `Feature "${id}" has EnvironmentAwarePage wrapper for dev banner display.`,
            instruction: 'No action needed.',
            status: 'done',
            category: 'env-aware',
          });
        } else {
          steps.push({
            action: 'Missing EnvironmentAwarePage wrapper',
            tool: 'analysis',
            file: 'front-end/src/routes/Router.tsx',
            line: analysis.routeRefs[0]?.line || null,
            detail: 'Feature should be wrapped with EnvironmentAwarePage for proper SDLC banner display.',
            instruction: 'Wrap the route with <EnvironmentAwarePage featureId="' + id + '"> in Router.tsx.',
            status: 'info',
            category: 'env-aware',
          });
        }
      }

      // Check route protection
      if (featureData?.route && analysis.routeExists) {
        if (analysis.isProtected) {
          steps.push({
            action: 'Route has ProtectedRoute guard',
            tool: 'analysis',
            file: 'front-end/src/routes/Router.tsx',
            line: null,
            detail: 'Route is wrapped with ProtectedRoute for role-based access control.',
            instruction: 'No action needed.',
            status: 'done',
            category: 'router',
          });
        } else {
          steps.push({
            action: 'Route missing ProtectedRoute guard',
            tool: 'analysis',
            file: 'front-end/src/routes/Router.tsx',
            line: analysis.routeRefs[0]?.line || null,
            detail: 'Route should have a ProtectedRoute wrapper for access control.',
            instruction: 'Add ProtectedRoute wrapping to the route definition.',
            status: 'pending',
            category: 'router',
          });
        }
      }

      // Change set check
      if (changeSetStatus) {
        const csOk = ['active', 'in_review', 'approved', 'promoted'].includes(changeSetStatus);
        steps.push({
          action: `Change set: ${featureData.changeSetCode} (${changeSetStatus})`,
          tool: 'analysis',
          file: null, line: null,
          detail: `Linked change set is in "${changeSetStatus}" status.`,
          instruction: csOk ? 'Change set is active. No action needed.' : 'Change set may need attention before promotion.',
          status: csOk ? 'done' : 'info',
          category: 'change-set',
        });
      }

      steps.push({
        action: 'Feature functionally complete for review',
        tool: 'analysis',
        file: null, line: null,
        detail: 'Moving to Review means the feature is functionally complete and ready for stakeholder evaluation.',
        instruction: 'Confirm all core functionality is implemented and testable.',
        status: 'done',
        category: 'readiness',
      });
    }

    if (currentStage === 3) {
      // Stage 3→4 (Review → Stabilizing): review passed
      steps.push({
        action: 'Stakeholder review passed',
        tool: 'analysis',
        file: null, line: null,
        detail: 'Moving to Stabilizing means the feature has been reviewed and approved. Focus shifts to error handling, edge cases, and performance.',
        instruction: 'Confirm review feedback has been addressed.',
        status: 'done',
        category: 'readiness',
      });
    }

    if (currentStage === 4) {
      // Stage 4→5 (Stabilizing → Production): going live to all users
      if (featureData?.route && !analysis.routeExists) {
        steps.push({
          action: 'Route must exist before going to Production',
          tool: 'analysis',
          file: 'front-end/src/routes/Router.tsx',
          line: null,
          detail: `Route ${featureData.route} not found in Router.tsx.`,
          instruction: 'Add the route to Router.tsx before promoting to Production.',
          status: 'blocked',
          category: 'router',
        });
      }

      // Check menu entry for production features
      if (featureData?.route) {
        if (analysis.hasMenu) {
          steps.push({
            action: 'Sidebar menu entry exists',
            tool: 'analysis',
            file: 'front-end/src/layouts/full/vertical/sidebar/MenuItems.ts',
            line: analysis.menuRefs[0]?.line || null,
            detail: analysis.menuRefs.map(r => `L${r.line}: ${r.text}`).join('\n'),
            instruction: 'Menu entry found. Users will be able to navigate to this feature.',
            status: 'done',
            category: 'menu',
          });
        } else {
          steps.push({
            action: 'No sidebar menu entry found',
            tool: 'analysis',
            file: 'front-end/src/layouts/full/vertical/sidebar/MenuItems.ts',
            line: null,
            detail: 'Production features typically need a menu entry for discoverability.',
            instruction: 'Consider adding a menu entry in MenuItems.ts, or confirm the feature is accessible through other navigation.',
            status: 'info',
            category: 'menu',
          });
        }
      }

      steps.push({
        action: 'Promote to Production — visible to all users',
        tool: 'analysis',
        file: 'front-end/src/config/featureRegistry.ts',
        line: null,
        detail: `Promoting "${featureData?.name || id}" to Stage 5 will make it visible to ALL users (not just super_admin). The stage number in featureRegistry.ts will be updated automatically. A frontend rebuild will be needed for the change to take effect.`,
        instruction: 'Confirm the feature is stable and ready for general availability.',
        status: 'done',
        category: 'readiness',
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
    console.error('[feature-registry] POST /:id/plan error:', err);
    res.status(500).json({ success: false, error: 'Plan generation failed', details: err.message });
  }
});

/**
 * POST /:id/promote — Promote feature to next stage
 * Updates featureRegistry.ts on disk and records in DB.
 */
router.post('/:id/promote', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentStage, featureData } = req.body;
    const nextStage = currentStage + 1;

    if (nextStage > 5) {
      return res.status(400).json({ success: false, error: 'Already at maximum stage' });
    }

    // Run analysis to check blockers
    const analysis = analyzeFeature({
      id,
      route: featureData?.route || null,
      changeSetCode: featureData?.changeSetCode || null,
    });

    // Check for hard blockers
    const blockers = [];
    if (currentStage >= 2 && featureData?.route && !analysis.routeExists) {
      blockers.push({ type: 'router', message: `Route ${featureData.route} not found in Router.tsx` });
    }
    if (currentStage === 2 && featureData?.route && analysis.routeExists && !analysis.isProtected) {
      blockers.push({ type: 'router', message: 'Route missing ProtectedRoute guard' });
    }

    if (blockers.length > 0) {
      return res.status(422).json({
        success: false,
        error: 'Cannot promote — prerequisites not met',
        blockers,
      });
    }

    // Update featureRegistry.ts on disk
    const result = updateRegistryStage(id, nextStage);
    if (!result.changed) {
      return res.status(400).json({
        success: false,
        error: `Feature already at stage ${nextStage} in featureRegistry.ts`,
      });
    }

    // Update DB tracking
    const pool = getAppPool();
    await pool.query(
      `INSERT INTO feature_tracking (id, stage, previous_stage, last_promoted_at, last_promoted_by, route_exists, route_protected, env_aware_wrapped)
       VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         stage = VALUES(stage),
         previous_stage = VALUES(previous_stage),
         last_promoted_at = NOW(),
         last_promoted_by = VALUES(last_promoted_by),
         route_exists = VALUES(route_exists),
         route_protected = VALUES(route_protected),
         env_aware_wrapped = VALUES(env_aware_wrapped)`,
      [
        id, nextStage, currentStage, req.user.email,
        analysis.routeExists ? 1 : 0,
        analysis.isProtected ? 1 : 0,
        analysis.isEnvAwareWrapped ? 1 : 0,
      ]
    );

    // Record history
    await pool.query(
      `INSERT INTO feature_history (entry_id, from_stage, to_stage, action, details, performed_by)
       VALUES (?, ?, ?, 'promote', ?, ?)`,
      [
        id, currentStage, nextStage,
        JSON.stringify({
          featureName: featureData?.name || id,
          routeExists: analysis.routeExists,
          isProtected: analysis.isProtected,
          registryUpdated: result.changed,
        }),
        req.user.email,
      ]
    );

    res.json({
      success: true,
      message: `Promoted "${featureData?.name || id}" from Stage ${currentStage} to Stage ${nextStage}`,
      fromStage: currentStage,
      toStage: nextStage,
      registryUpdated: result.changed,
      needsRebuild: true,
    });
  } catch (err) {
    console.error('[feature-registry] POST /:id/promote error:', err);
    res.status(500).json({ success: false, error: 'Promotion failed', details: err.message });
  }
});

/**
 * POST /:id/demote — Demote feature to previous stage
 */
router.post('/:id/demote', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentStage, featureData } = req.body;
    const prevStage = currentStage - 1;

    if (prevStage < 1) {
      return res.status(400).json({ success: false, error: 'Already at minimum stage' });
    }

    const result = updateRegistryStage(id, prevStage);
    if (!result.changed) {
      return res.status(400).json({
        success: false,
        error: `Feature already at stage ${prevStage} in featureRegistry.ts`,
      });
    }

    const pool = getAppPool();
    await pool.query(
      `INSERT INTO feature_tracking (id, stage, previous_stage, last_promoted_at, last_promoted_by)
       VALUES (?, ?, ?, NOW(), ?)
       ON DUPLICATE KEY UPDATE
         stage = VALUES(stage),
         previous_stage = VALUES(previous_stage),
         last_promoted_at = NOW(),
         last_promoted_by = VALUES(last_promoted_by)`,
      [id, prevStage, currentStage, req.user.email]
    );

    await pool.query(
      `INSERT INTO feature_history (entry_id, from_stage, to_stage, action, details, performed_by)
       VALUES (?, ?, ?, 'demote', ?, ?)`,
      [
        id, currentStage, prevStage,
        JSON.stringify({ featureName: featureData?.name || id, registryUpdated: result.changed }),
        req.user.email,
      ]
    );

    res.json({
      success: true,
      message: `Demoted "${featureData?.name || id}" from Stage ${currentStage} to Stage ${prevStage}`,
      fromStage: currentStage,
      toStage: prevStage,
      registryUpdated: result.changed,
      needsRebuild: true,
    });
  } catch (err) {
    console.error('[feature-registry] POST /:id/demote error:', err);
    res.status(500).json({ success: false, error: 'Demotion failed', details: err.message });
  }
});

/**
 * GET /:id/history — Audit trail for a feature
 */
router.get('/:id/history', async (req, res) => {
  try {
    const pool = getAppPool();
    const [rows] = await pool.query(
      'SELECT * FROM feature_history WHERE entry_id = ? ORDER BY performed_at DESC LIMIT 50',
      [req.params.id]
    );
    res.json({ success: true, history: rows });
  } catch (err) {
    console.error('[feature-registry] GET /:id/history error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

module.exports = router;
