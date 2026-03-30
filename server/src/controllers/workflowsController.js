/**
 * Workflows Controller
 *
 * HTTP handlers for prompt workflow management.
 * All routes require super_admin role.
 */

const workflowService = require('../services/workflowService');
const workflowGenerationService = require('../services/workflowGenerationService');
const dashboardService = require('../services/workflowDashboardService');

function getActor(req) {
  return req.user?.email || req.user?.username || 'unknown';
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

async function create(req, res) {
  try {
    const { name, description, component, steps } = req.body;
    const workflow = await workflowService.createWorkflow(
      { name, description, component, steps },
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
    const { name, description, component } = req.body;
    const workflow = await workflowService.updateWorkflow(
      req.params.id, { name, description, component }, getActor(req)
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

module.exports = {
  create, list, getById, update,
  setSteps,
  approve, activate, complete, cancel, reopen,
  preview, generatePrompts,
  getStatus, validate,
  dashboard, dashboardExceptions, dashboardReady,
};
