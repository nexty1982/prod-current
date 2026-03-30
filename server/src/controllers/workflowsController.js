/**
 * Workflows Controller
 *
 * HTTP handlers for prompt workflow management.
 * All routes require super_admin role.
 */

const workflowService = require('../services/workflowService');
const workflowGenerationService = require('../services/workflowGenerationService');
const dashboardService = require('../services/workflowDashboardService');
const decisionEngine = require('../services/decisionEngineService');
const autoExecutionPolicy = require('../services/autoExecutionPolicyService');
const autoExecutionService = require('../services/autoExecutionService');
const costService = require('../services/workflowCostService');
const autonomyPolicy = require('../services/autonomyPolicyService');
const autonomousAdvance = require('../services/autonomousAdvanceService');
const promptProgression = require('../services/promptProgressionService');

function getActor(req) {
  return req.user?.email || req.user?.username || 'unknown';
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

async function create(req, res) {
  try {
    const { name, description, component, steps, release_mode } = req.body;
    const workflow = await workflowService.createWorkflow(
      { name, description, component, steps, release_mode },
      getActor(req)
    );
    res.status(201).json({ success: true, workflow });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function list(req, res) {
  try {
    const { status, component, created_by } = req.query;
    const workflows = await workflowService.listWorkflows({ status, component, created_by });
    res.json({ success: true, workflows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getById(req, res) {
  try {
    const workflow = await workflowService.getWorkflowById(req.params.id);
    res.json({ success: true, workflow });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

async function update(req, res) {
  try {
    const { name, description, component, release_mode } = req.body;
    const workflow = await workflowService.updateWorkflow(
      req.params.id, { name, description, component, release_mode }, getActor(req)
    );
    res.json({ success: true, workflow });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 :
                   err.message.includes('Cannot edit') ? 409 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
}

// ─── Steps ──────────────────────────────────────────────────────────────────

async function setSteps(req, res) {
  try {
    const { steps } = req.body;
    if (!steps || !Array.isArray(steps)) {
      return res.status(400).json({ success: false, error: 'steps array is required.' });
    }
    const workflow = await workflowService.setSteps(req.params.id, steps, getActor(req));
    res.json({ success: true, workflow });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 :
                   err.message.includes('Cannot modify') ? 409 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
}

// ─── Status Transitions ─────────────────────────────────────────────────────

async function approve(req, res) {
  try {
    const workflow = await workflowService.approveWorkflow(req.params.id, getActor(req));
    res.json({ success: true, workflow });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 :
                   err.message.includes('validation failed') ? 422 :
                   err.message.includes('Invalid workflow transition') ? 409 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
}

async function activate(req, res) {
  try {
    const workflow = await workflowService.activateWorkflow(req.params.id, getActor(req));
    res.json({ success: true, workflow });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 :
                   err.message.includes('Cannot activate') ? 409 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
}

async function complete(req, res) {
  try {
    const workflow = await workflowService.completeWorkflow(req.params.id, getActor(req));
    res.json({ success: true, workflow });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 :
                   err.message.includes('Cannot complete') ? 409 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
}

async function cancel(req, res) {
  try {
    const { reason } = req.body;
    const workflow = await workflowService.cancelWorkflow(req.params.id, reason, getActor(req));
    res.json({ success: true, workflow });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
}

async function reopen(req, res) {
  try {
    const workflow = await workflowService.reopenWorkflow(req.params.id, getActor(req));
    res.json({ success: true, workflow });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
}

// ─── Generation & Preview ───────────────────────────────────────────────────

async function preview(req, res) {
  try {
    const preview = await workflowGenerationService.previewGeneration(req.params.id);
    res.json({ success: true, preview });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
}

async function generatePrompts(req, res) {
  try {
    const result = await workflowGenerationService.generatePrompts(req.params.id, getActor(req));
    res.json({
      success: true,
      already_existed: result.already_existed,
      prompt_count: result.prompts.length,
      prompts: result.prompts,
    });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 :
                   err.message.includes('Cannot generate') ? 409 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

// ─── Status ─────────────────────────────────────────────────────────────────

async function getStatus(req, res) {
  try {
    const status = await workflowService.getWorkflowStatus(req.params.id);
    res.json({ success: true, ...status });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

// ─── Validation ─────────────────────────────────────────────────────────────

async function validate(req, res) {
  try {
    const workflow = await workflowService.getWorkflowById(req.params.id);
    const result = workflowService.validateWorkflow(workflow);
    res.json({ success: true, ...result });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

// ─── Dashboard ─────────────────────────────────────────────────────────────

async function dashboard(req, res) {
  try {
    const { type, component, workflow_id, activity_limit } = req.query;
    const data = await dashboardService.getDashboard({
      type, component, workflow_id,
      activity_limit: activity_limit ? parseInt(activity_limit) : undefined,
    });
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function dashboardExceptions(req, res) {
  try {
    const { type, component, workflow_id } = req.query;
    const exceptions = await dashboardService.getExceptionFeed({ type, component, workflow_id });
    res.json({ success: true, exceptions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function dashboardReady(req, res) {
  try {
    const ready = await dashboardService.getReadyToRelease();
    res.json({ success: true, ready });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function dashboardRecommendations(req, res) {
  try {
    const recommendations = await decisionEngine.getRecommendations();
    res.json({ success: true, ...recommendations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ─── Auto-Execution ───────────────────────────────────────────────────────

async function autoExecEnable(req, res) {
  try {
    const status = await autoExecutionPolicy.enable();
    autoExecutionService.start(); // start loop when enabled
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function autoExecDisable(req, res) {
  try {
    const status = await autoExecutionPolicy.disable();
    autoExecutionService.stop(); // stop loop when disabled
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function autoExecSetMode(req, res) {
  try {
    const { mode } = req.body;
    if (!mode) {
      return res.status(400).json({ success: false, error: 'mode is required (OFF, SAFE, FULL)' });
    }
    const status = await autoExecutionPolicy.setMode(mode.toUpperCase());
    if (mode.toUpperCase() === 'OFF') {
      autoExecutionService.stop();
    }
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function autoExecStatus(req, res) {
  try {
    const status = await autoExecutionPolicy.getStatus();
    res.json({
      success: true,
      ...status,
      loop_running: autoExecutionService.isLoopRunning(),
      executing_now: autoExecutionService.isExecuting(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function autoExecLogs(req, res) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const logs = await autoExecutionService.getLogs(limit);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function autoExecRunOnce(req, res) {
  try {
    const result = await autoExecutionService.runOnce();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ─── Cost Reporting ──────────────────────────────────────────────────────

async function costReport(req, res) {
  try {
    const report = await costService.getCostReport();
    res.json({ success: true, ...report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function workflowCost(req, res) {
  try {
    const cost = await costService.getWorkflowCost(req.params.id);
    res.json({ success: true, ...cost });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

// ─── Autonomy ──────────────────────────────────────────────────────────────

async function autonomySetMode(req, res) {
  try {
    const { mode } = req.body;
    if (!mode) {
      return res.status(400).json({ success: false, error: 'mode is required (OFF, RELEASE_ONLY, SAFE_ADVANCE, SUPERVISED_FLOW)' });
    }
    const status = await autonomyPolicy.setMode(mode.toUpperCase());
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function autonomyStatus(req, res) {
  try {
    const status = await autonomyPolicy.getStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function autonomyLogs(req, res) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const logs = await autonomyPolicy.getLogs(limit);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function autonomyPause(req, res) {
  try {
    const { reason } = req.body;
    await autonomyPolicy.pauseWorkflow(req.params.id, reason || 'Paused by operator');
    res.json({ success: true, message: `Workflow ${req.params.id} autonomy paused` });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
}

async function autonomyResume(req, res) {
  try {
    await autonomyPolicy.resumeWorkflow(req.params.id);
    res.json({ success: true, message: `Workflow ${req.params.id} autonomy resumed` });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
}

async function setManualOnly(req, res) {
  try {
    const { target_type, manual_only } = req.body;
    const type = target_type || 'workflow';
    if (manual_only === undefined) {
      return res.status(400).json({ success: false, error: 'manual_only (boolean) is required' });
    }
    await autonomyPolicy.setManualOnly(type, req.params.id, !!manual_only);
    res.json({ success: true, message: `${type} ${req.params.id} manual_only set to ${!!manual_only}` });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 :
                   err.message.includes('Invalid') ? 400 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

async function autonomyDashboard(req, res) {
  try {
    const data = await autonomousAdvance.getAutonomyDashboard();
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ─── Progression ────────────────────────────────────────────────────────────

async function progressionRun(req, res) {
  try {
    const results = await promptProgression.advanceAll();
    res.json({ success: true, ...results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function progressionPipeline(req, res) {
  try {
    const summary = await promptProgression.getPipelineSummary();
    res.json({ success: true, ...summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  create, list, getById, update,
  setSteps,
  approve, activate, complete, cancel, reopen,
  preview, generatePrompts,
  getStatus, validate,
  dashboard, dashboardExceptions, dashboardReady, dashboardRecommendations,
  autoExecEnable, autoExecDisable, autoExecSetMode, autoExecStatus, autoExecLogs, autoExecRunOnce,
  costReport, workflowCost,
  autonomySetMode, autonomyStatus, autonomyLogs, autonomyPause, autonomyResume, setManualOnly, autonomyDashboard,
  progressionRun, progressionPipeline,
};
