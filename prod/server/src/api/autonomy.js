const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Middleware to check if user is super_admin
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Access denied. Super admin required.' });
  }
  next();
};

// Apply super admin middleware to all routes
router.use(requireSuperAdmin);

// Get autonomy status
router.get('/status', async (req, res) => {
  try {
    const statusFile = path.join(__dirname, '../../services/om-ai/memory/autonomy-status.json');
    const data = await fs.readFile(statusFile, 'utf-8');
    const status = JSON.parse(data);
    res.json(status);
  } catch (error) {
    console.error('Error reading autonomy status:', error);
    res.status(500).json({ error: 'Failed to get autonomy status' });
  }
});

// Get all autonomy sessions
router.get('/sessions', async (req, res) => {
  try {
    const sessionsFile = path.join(__dirname, '../../services/om-ai/memory/autonomy-sessions.json');
    const data = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(data);
    res.json(sessions);
  } catch (error) {
    console.error('Error reading autonomy sessions:', error);
    res.status(500).json({ error: 'Failed to get autonomy sessions' });
  }
});

// Get a specific autonomy session
router.get('/sessions/:id', async (req, res) => {
  try {
    const sessionsFile = path.join(__dirname, '../../services/om-ai/memory/autonomy-sessions.json');
    const data = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(data);
    const session = sessions.find(s => s.id === req.params.id);
    
    if (!session) {
      return res.status(404).json({ error: 'Autonomy session not found' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error reading autonomy session:', error);
    res.status(500).json({ error: 'Failed to get autonomy session' });
  }
});

// Start a new autonomy session
router.post('/sessions/start', async (req, res) => {
  try {
    // Simulate starting a new autonomy session
    const newSession = {
      id: `session-${Date.now()}`,
      status: 'active',
      startTime: new Date().toISOString(),
      decisions: [],
      goals: [],
      improvements: [],
      metaAnalysis: [],
      performance: {
        decisionsExecuted: 0,
        decisionsSuccessful: 0,
        goalsCompleted: 0,
        goalsActive: 0,
        improvementsInitiated: 0,
        improvementsCompleted: 0,
        overallEfficiency: 0,
        learningRate: 0,
        adaptationSpeed: 0
      }
    };

    const sessionsFile = path.join(__dirname, '../../services/om-ai/memory/autonomy-sessions.json');
    const data = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(data);
    sessions.push(newSession);
    await fs.writeFile(sessionsFile, JSON.stringify(sessions, null, 2));

    // Update status
    const statusFile = path.join(__dirname, '../../services/om-ai/memory/autonomy-status.json');
    const status = {
      isActive: true,
      currentSession: newSession.id,
      lastActivity: new Date().toISOString(),
      performance: newSession.performance,
      health: 'good',
      recommendations: ['Monitor initial autonomy performance', 'Adjust parameters as needed']
    };
    await fs.writeFile(statusFile, JSON.stringify(status, null, 2));

    res.json(newSession);
  } catch (error) {
    console.error('Error starting autonomy session:', error);
    res.status(500).json({ error: 'Failed to start autonomy session' });
  }
});

// Pause an autonomy session
router.post('/sessions/:id/pause', async (req, res) => {
  try {
    const sessionsFile = path.join(__dirname, '../../services/om-ai/memory/autonomy-sessions.json');
    const data = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(data);
    const sessionIndex = sessions.findIndex(s => s.id === req.params.id);
    
    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Autonomy session not found' });
    }
    
    sessions[sessionIndex].status = 'paused';
    await fs.writeFile(sessionsFile, JSON.stringify(sessions, null, 2));

    // Update status
    const statusFile = path.join(__dirname, '../../services/om-ai/memory/autonomy-status.json');
    const status = {
      isActive: false,
      currentSession: req.params.id,
      lastActivity: new Date().toISOString(),
      performance: sessions[sessionIndex].performance,
      health: 'good',
      recommendations: ['Session paused - resume when ready']
    };
    await fs.writeFile(statusFile, JSON.stringify(status, null, 2));

    res.json({ message: 'Autonomy session paused successfully' });
  } catch (error) {
    console.error('Error pausing autonomy session:', error);
    res.status(500).json({ error: 'Failed to pause autonomy session' });
  }
});

// Resume an autonomy session
router.post('/sessions/:id/resume', async (req, res) => {
  try {
    const sessionsFile = path.join(__dirname, '../../services/om-ai/memory/autonomy-sessions.json');
    const data = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(data);
    const sessionIndex = sessions.findIndex(s => s.id === req.params.id);
    
    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Autonomy session not found' });
    }
    
    sessions[sessionIndex].status = 'active';
    await fs.writeFile(sessionsFile, JSON.stringify(sessions, null, 2));

    // Update status
    const statusFile = path.join(__dirname, '../../services/om-ai/memory/autonomy-status.json');
    const status = {
      isActive: true,
      currentSession: req.params.id,
      lastActivity: new Date().toISOString(),
      performance: sessions[sessionIndex].performance,
      health: 'good',
      recommendations: ['Session resumed - monitor performance']
    };
    await fs.writeFile(statusFile, JSON.stringify(status, null, 2));

    res.json({ message: 'Autonomy session resumed successfully' });
  } catch (error) {
    console.error('Error resuming autonomy session:', error);
    res.status(500).json({ error: 'Failed to resume autonomy session' });
  }
});

// Stop an autonomy session
router.post('/sessions/:id/stop', async (req, res) => {
  try {
    const sessionsFile = path.join(__dirname, '../../services/om-ai/memory/autonomy-sessions.json');
    const data = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(data);
    const sessionIndex = sessions.findIndex(s => s.id === req.params.id);
    
    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Autonomy session not found' });
    }
    
    sessions[sessionIndex].status = 'completed';
    sessions[sessionIndex].endTime = new Date().toISOString();
    await fs.writeFile(sessionsFile, JSON.stringify(sessions, null, 2));

    // Update status
    const statusFile = path.join(__dirname, '../../services/om-ai/memory/autonomy-status.json');
    const status = {
      isActive: false,
      lastActivity: new Date().toISOString(),
      performance: sessions[sessionIndex].performance,
      health: 'good',
      recommendations: ['Session completed - review results and start new session if needed']
    };
    await fs.writeFile(statusFile, JSON.stringify(status, null, 2));

    res.json({ message: 'Autonomy session stopped successfully' });
  } catch (error) {
    console.error('Error stopping autonomy session:', error);
    res.status(500).json({ error: 'Failed to stop autonomy session' });
  }
});

// Execute autonomy cycle
router.post('/sessions/:id/cycle', async (req, res) => {
  try {
    const sessionsFile = path.join(__dirname, '../../services/om-ai/memory/autonomy-sessions.json');
    const data = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(data);
    const sessionIndex = sessions.findIndex(s => s.id === req.params.id);
    
    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Autonomy session not found' });
    }
    
    const session = sessions[sessionIndex];
    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Can only execute cycle on active sessions' });
    }

    // Simulate autonomy cycle execution
    const newDecision = {
      id: `dec-${Date.now()}`,
      type: ['learning', 'optimization', 'improvement', 'maintenance'][Math.floor(Math.random() * 4)],
      priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
      status: 'completed',
      success: Math.random() > 0.3,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };

    session.decisions.push(newDecision);
    session.performance.decisionsExecuted++;
    if (newDecision.success) {
      session.performance.decisionsSuccessful++;
    }

    // Update efficiency
    session.performance.overallEfficiency = session.performance.decisionsExecuted > 0 
      ? session.performance.decisionsSuccessful / session.performance.decisionsExecuted 
      : 0;

    await fs.writeFile(sessionsFile, JSON.stringify(sessions, null, 2));

    res.json({ 
      message: 'Autonomy cycle executed successfully',
      decision: newDecision,
      updatedPerformance: session.performance
    });
  } catch (error) {
    console.error('Error executing autonomy cycle:', error);
    res.status(500).json({ error: 'Failed to execute autonomy cycle' });
  }
});

// Get autonomy performance
router.get('/sessions/:id/performance', async (req, res) => {
  try {
    const sessionsFile = path.join(__dirname, '../../services/om-ai/memory/autonomy-sessions.json');
    const data = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(data);
    const session = sessions.find(s => s.id === req.params.id);
    
    if (!session) {
      return res.status(404).json({ error: 'Autonomy session not found' });
    }
    
    res.json(session.performance);
  } catch (error) {
    console.error('Error reading autonomy performance:', error);
    res.status(500).json({ error: 'Failed to get autonomy performance' });
  }
});

// Generate autonomy report
router.get('/sessions/:id/report', async (req, res) => {
  try {
    const sessionsFile = path.join(__dirname, '../../services/om-ai/memory/autonomy-sessions.json');
    const data = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(data);
    const session = sessions.find(s => s.id === req.params.id);
    
    if (!session) {
      return res.status(404).json({ error: 'Autonomy session not found' });
    }
    
    // Generate report
    const report = {
      sessionId: session.id,
      timestamp: new Date().toISOString(),
      summary: `Autonomy session ${session.id} executed ${session.decisions.length} decisions, managed ${session.goals.length} goals, and initiated ${session.improvements.length} improvements.`,
      decisions: {
        total: session.decisions.length,
        successful: session.decisions.filter(d => d.success).length,
        failed: session.decisions.filter(d => !d.success).length,
        byType: session.decisions.reduce((acc, d) => {
          acc[d.type] = (acc[d.type] || 0) + 1;
          return acc;
        }, {}),
        byPriority: session.decisions.reduce((acc, d) => {
          acc[d.priority] = (acc[d.priority] || 0) + 1;
          return acc;
        }, {}),
        averageImpact: session.decisions.length > 0 ? session.decisions.filter(d => d.success).length / session.decisions.length : 0
      },
      goals: {
        total: session.goals.length,
        completed: session.goals.filter(g => g.status === 'completed').length,
        active: session.goals.filter(g => g.status === 'active').length,
        byCategory: session.goals.reduce((acc, g) => {
          acc[g.category] = (acc[g.category] || 0) + 1;
          return acc;
        }, {}),
        averageProgress: session.goals.length > 0 ? session.goals.reduce((sum, g) => sum + g.progress, 0) / session.goals.length : 0,
        successRate: session.goals.length > 0 ? session.goals.filter(g => g.status === 'completed').length / session.goals.length : 0
      },
      improvements: {
        total: session.improvements.length,
        completed: session.improvements.filter(i => i.status === 'completed').length,
        failed: session.improvements.filter(i => i.status === 'failed').length,
        byType: session.improvements.reduce((acc, i) => {
          acc[i.type] = (acc[i.type] || 0) + 1;
          return acc;
        }, {}),
        averageImpact: 0.75, // Simulated
        successRate: session.improvements.length > 0 ? session.improvements.filter(i => i.status === 'completed').length / session.improvements.length : 0
      },
      metaAnalysis: {
        selfAwarenessLevel: 'medium',
        confidenceLevel: session.performance.overallEfficiency,
        limitationsCount: 3,
        uncertaintiesCount: 2,
        learningEffectiveness: session.performance.learningRate
      },
      recommendations: [
        'Continue monitoring autonomy performance',
        'Adjust parameters based on results',
        'Consider scaling successful strategies'
      ],
      nextSteps: [
        'Implement recommendations from meta-analysis',
        'Scale successful strategies to broader system',
        'Plan next autonomy session'
      ]
    };
    
    res.json(report);
  } catch (error) {
    console.error('Error generating autonomy report:', error);
    res.status(500).json({ error: 'Failed to generate autonomy report' });
  }
});

// Get autonomy parameters
router.get('/parameters', async (req, res) => {
  try {
    const parametersFile = path.join(__dirname, '../../services/om-ai/memory/autonomy-parameters.json');
    const data = await fs.readFile(parametersFile, 'utf-8');
    const parameters = JSON.parse(data);
    res.json(parameters);
  } catch (error) {
    console.error('Error reading autonomy parameters:', error);
    // Return default parameters if file doesn't exist
    const defaultParameters = {
      decisionThreshold: 0.7,
      goalPriority: 'balanced',
      improvementFrequency: 5,
      metaAnalysisInterval: 10,
      safetyConstraints: ['No system modifications', 'Preserve user data'],
      learningRate: 0.1
    };
    res.json(defaultParameters);
  }
});

// Update autonomy parameters
router.put('/parameters', async (req, res) => {
  try {
    const parameters = req.body;
    const parametersFile = path.join(__dirname, '../../services/om-ai/memory/autonomy-parameters.json');
    await fs.writeFile(parametersFile, JSON.stringify(parameters, null, 2));
    res.json({ message: 'Autonomy parameters updated successfully' });
  } catch (error) {
    console.error('Error updating autonomy parameters:', error);
    res.status(500).json({ error: 'Failed to update autonomy parameters' });
  }
});

// Get autonomous decisions
router.get('/decisions', async (req, res) => {
  try {
    const decisionsFile = path.join(__dirname, '../../services/om-ai/memory/autonomous-decisions.json');
    const data = await fs.readFile(decisionsFile, 'utf-8');
    const decisions = JSON.parse(data);
    res.json(decisions);
  } catch (error) {
    console.error('Error reading autonomous decisions:', error);
    res.json([]);
  }
});

// Get autonomous goals
router.get('/goals', async (req, res) => {
  try {
    const goalsFile = path.join(__dirname, '../../services/om-ai/memory/autonomous-goals.json');
    const data = await fs.readFile(goalsFile, 'utf-8');
    const goals = JSON.parse(data);
    res.json(goals);
  } catch (error) {
    console.error('Error reading autonomous goals:', error);
    res.json([]);
  }
});

// Get improvement cycles
router.get('/improvements', async (req, res) => {
  try {
    const improvementsFile = path.join(__dirname, '../../services/om-ai/memory/improvement-cycles.json');
    const data = await fs.readFile(improvementsFile, 'utf-8');
    const improvements = JSON.parse(data);
    res.json(improvements);
  } catch (error) {
    console.error('Error reading improvement cycles:', error);
    res.json([]);
  }
});

// Get meta-cognitive analysis
router.get('/meta-analysis', async (req, res) => {
  try {
    const metaFile = path.join(__dirname, '../../services/om-ai/memory/meta-cognitive-history.json');
    const data = await fs.readFile(metaFile, 'utf-8');
    const metaAnalysis = JSON.parse(data);
    res.json(metaAnalysis);
  } catch (error) {
    console.error('Error reading meta-cognitive analysis:', error);
    res.json([]);
  }
});

module.exports = router; 