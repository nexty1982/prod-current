/**
 * Internal Workflow Execution endpoint.
 * Called by OMAI backend to trigger workflow execution on the OM backend
 * where the workflow engine and DB pools are available.
 *
 * POST /api/internal/workflows/execute
 *
 * Security: localhost-only (no auth middleware needed for internal calls).
 */

const express = require('express');
const router = express.Router();

router.post('/workflows/execute', async (req, res) => {
  // Localhost-only guard
  const ip = req.ip || req.connection?.remoteAddress || '';
  if (!ip.includes('127.0.0.1') && !ip.includes('::1') && !ip.includes('::ffff:127.0.0.1')) {
    return res.status(403).json({ error: 'Internal only' });
  }

  try {
    const { executeWorkflow } = require('../../services/workflowEngine');
    const { workflowId, triggerSource, triggerEventId, context } = req.body;

    if (!workflowId) {
      return res.status(400).json({ error: 'workflowId required' });
    }

    // Fire-and-forget execution
    executeWorkflow({
      workflowId,
      triggerSource: triggerSource || 'manual',
      triggerEventId: triggerEventId || null,
      context: context || null,
    }).catch(err => {
      console.error('[Internal/Workflows] Execution error:', err.message);
    });

    res.json({ success: true, message: 'Workflow execution queued' });
  } catch (err) {
    console.error('[Internal/Workflows] Error:', err.message);
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

module.exports = router;
