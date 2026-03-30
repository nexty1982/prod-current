/**
 * Prompts Controller
 *
 * HTTP request handling for the Prompt Workflow System.
 * All business logic delegated to promptWorkflowService.
 */

const promptWorkflowService = require('../services/promptWorkflowService');
const promptAuditService = require('../services/promptAuditService');
const promptEvaluationService = require('../services/promptEvaluationService');
const promptGenerationService = require('../services/promptGenerationService');

class PromptsController {

  // POST /api/prompts
  async create(req, res) {
    try {
      const {
        title, purpose, component, parent_prompt_id,
        sequence_order, prompt_text, guardrails_applied,
      } = req.body;

      const created_by = req.user?.email || req.user?.username || 'unknown';

      const prompt = await promptWorkflowService.createPrompt({
        created_by,
        title,
        purpose,
        component,
        parent_prompt_id: parent_prompt_id || null,
        sequence_order: parseInt(sequence_order, 10),
        prompt_text,
        guardrails_applied: !!guardrails_applied,
      });

      res.status(201).json({ success: true, data: prompt });
    } catch (error) {
      const status = error.message.includes('required') ? 400
        : error.message.includes('already exists') ? 409
        : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  // GET /api/prompts
  async list(req, res) {
    try {
      const { status, component, parent_prompt_id } = req.query;

      const prompts = await promptWorkflowService.getAllPrompts({
        status: status || undefined,
        component: component || undefined,
        parent_prompt_id: parent_prompt_id !== undefined ? parent_prompt_id : undefined,
      });

      res.json({ success: true, data: prompts, count: prompts.length });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // GET /api/prompts/:id
  async getById(req, res) {
    try {
      const prompt = await promptWorkflowService.getPromptById(req.params.id);
      res.json({ success: true, data: prompt });
    } catch (error) {
      const status = error.message.includes('not found') ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  // PUT /api/prompts/:id
  async update(req, res) {
    try {
      const actor = req.user?.email || req.user?.username || 'unknown';
      const prompt = await promptWorkflowService.updatePrompt(
        req.params.id,
        req.body,
        actor
      );
      res.json({ success: true, data: prompt });
    } catch (error) {
      const status = error.message.includes('not found') ? 404
        : error.message.includes('Cannot update') ? 409
        : error.message.includes('already exists') ? 409
        : error.message.includes('No valid') ? 400
        : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  // POST /api/prompts/:id/ready
  async markReady(req, res) {
    try {
      const actor = req.user?.email || req.user?.username || 'unknown';
      const prompt = await promptWorkflowService.markReady(req.params.id, actor);
      res.json({ success: true, data: prompt, message: 'Prompt marked ready for review' });
    } catch (error) {
      const status = error.message.includes('not found') ? 404
        : error.message.includes('Cannot') ? 409
        : error.message.includes('Invalid transition') ? 409
        : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  // POST /api/prompts/:id/approve
  async approve(req, res) {
    try {
      const actor = req.user?.email || req.user?.username || 'unknown';
      const prompt = await promptWorkflowService.approvePrompt(req.params.id, actor);
      res.json({ success: true, data: prompt, message: 'Prompt approved' });
    } catch (error) {
      const status = error.message.includes('not found') ? 404
        : error.message.includes('Cannot approve') ? 409
        : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  // POST /api/prompts/:id/reject
  async reject(req, res) {
    try {
      const actor = req.user?.email || req.user?.username || 'unknown';
      const { reason } = req.body;
      const prompt = await promptWorkflowService.rejectPrompt(req.params.id, actor, reason);
      res.json({ success: true, data: prompt, message: 'Prompt rejected' });
    } catch (error) {
      const status = error.message.includes('not found') ? 404
        : error.message.includes('Cannot reject') ? 409
        : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  // POST /api/prompts/:id/execute
  async execute(req, res) {
    try {
      const actor = req.user?.email || req.user?.username || 'unknown';
      const prompt = await promptWorkflowService.executePrompt(req.params.id, actor);
      res.json({ success: true, data: prompt, message: 'Prompt execution started' });
    } catch (error) {
      const status = error.message.includes('not found') ? 404
        : error.message.includes('Cannot execute') ? 409
        : error.message.includes('predecessor') ? 409
        : error.message.includes('Audit gate') ? 403
        : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  // POST /api/prompts/:id/complete
  async complete(req, res) {
    try {
      const actor = req.user?.email || req.user?.username || 'unknown';
      const { execution_result } = req.body;
      const prompt = await promptWorkflowService.completeExecution(
        req.params.id,
        actor,
        execution_result
      );
      res.json({ success: true, data: prompt, message: 'Execution completed' });
    } catch (error) {
      const status = error.message.includes('not found') ? 404
        : error.message.includes('Cannot complete') ? 409
        : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  // POST /api/prompts/:id/verify
  async verify(req, res) {
    try {
      const actor = req.user?.email || req.user?.username || 'unknown';
      const { system_state_modified, guardrails_followed, notes } = req.body;

      const prompt = await promptWorkflowService.verifyPrompt(
        req.params.id,
        actor,
        { system_state_modified, guardrails_followed, notes }
      );
      res.json({ success: true, data: prompt, message: 'Prompt verified' });
    } catch (error) {
      const status = error.message.includes('not found') ? 404
        : error.message.includes('Cannot verify') ? 409
        : error.message.includes('Verification failed') ? 422
        : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  // POST /api/prompts/:id/audit
  async runAudit(req, res) {
    try {
      const actor = req.user?.email || req.user?.username || 'unknown';
      const result = await promptAuditService.runAudit(req.params.id, actor);
      const status = result.audit_status === 'pass' ? 200 : 422;
      res.status(status).json({
        success: true,
        data: result,
        message: result.audit_status === 'pass'
          ? 'Audit passed — prompt may proceed'
          : 'Audit failed — see audit_notes for required corrections',
      });
    } catch (error) {
      const status = error.message.includes('not found') ? 404
        : error.message.includes('immutable') ? 409
        : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  // GET /api/prompts/:id/audit
  async getAudit(req, res) {
    try {
      const result = await promptAuditService.getAuditResult(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error.message.includes('not found') ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  // POST /api/prompts/:id/reset
  async resetToDraft(req, res) {
    try {
      const actor = req.user?.email || req.user?.username || 'unknown';
      const prompt = await promptWorkflowService.resetToDraft(req.params.id, actor);
      res.json({ success: true, data: prompt, message: 'Prompt reset to draft' });
    } catch (error) {
      const status = error.message.includes('not found') ? 404
        : error.message.includes('Cannot reset') ? 409
        : error.message.includes('conflict') ? 409
        : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }
  // POST /api/prompts/:id/evaluate
  async evaluate(req, res) {
    try {
      const actor = req.user?.email || req.user?.username || 'unknown';
      const result = await promptEvaluationService.runEvaluation(req.params.id, actor);
      res.json({ success: true, data: result, message: 'Evaluation complete' });
    } catch (error) {
      const status = error.message.includes('not found') ? 404
        : error.message.includes('Cannot evaluate') ? 409
        : error.message.includes('must be complete') ? 409
        : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  // GET /api/prompts/:id/evaluation
  async getEvaluation(req, res) {
    try {
      const result = await promptEvaluationService.getEvaluation(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error.message.includes('not found') ? 404
        : error.message.includes('not been evaluated') ? 404
        : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  // POST /api/prompts/:id/generate-next
  async generateNext(req, res) {
    try {
      const actor = req.user?.email || req.user?.username || 'unknown';
      const result = await promptGenerationService.generateNext(req.params.id, actor);
      res.status(201).json({ success: true, data: result, message: 'Next prompt generated' });
    } catch (error) {
      const status = error.message.includes('not found') ? 404
        : error.message.includes('already has') ? 409
        : error.message.includes('not been evaluated') ? 409
        : error.message.includes('No generation') ? 422
        : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  // POST /api/prompts/:id/release-next
  async releaseNext(req, res) {
    try {
      const actor = req.user?.email || req.user?.username || 'unknown';
      const result = await promptGenerationService.releaseNext(req.params.id, actor);
      res.json({ success: true, data: result, message: 'Next prompt released for execution' });
    } catch (error) {
      const status = error.message.includes('not found') ? 404
        : error.message.includes('No next prompt') ? 404
        : error.message.includes('Already released') ? 409
        : error.message.includes('must be verified') ? 409
        : error.message.includes('must pass audit') ? 409
        : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }

  // GET /api/prompts/:id/next
  async getNextPrompt(req, res) {
    try {
      const result = await promptGenerationService.getNext(req.params.id);
      if (!result) {
        return res.status(404).json({ success: false, error: 'No next prompt linked' });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error.message.includes('not found') ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  }
}

module.exports = new PromptsController();
