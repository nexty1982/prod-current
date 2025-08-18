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

// Get analytics metrics
router.get('/metrics', async (req, res) => {
  try {
    const analyticsDir = path.join(__dirname, '../omai/servic../omai/servic../omai/services/memory');
    const metricsFile = path.join(analyticsDir, 'analytics-metrics.json');
    
    const data = await fs.readFile(metricsFile, 'utf-8');
    const metrics = JSON.parse(data);
    
    res.json(metrics);
  } catch (error) {
    console.error('Error reading analytics metrics:', error);
    res.status(500).json({ error: 'Failed to load analytics metrics' });
  }
});

// Get all analytics sessions
router.get('/sessions', async (req, res) => {
  try {
    const analyticsDir = path.join(__dirname, '../omai/servic../omai/services/memory');
    const sessionsFile = path.join(analyticsDir, 'analytics-sessions.json');
    
    const data = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(data);
    
    res.json(sessions);
  } catch (error) {
    console.error('Error reading analytics sessions:', error);
    res.status(500).json({ error: 'Failed to load analytics sessions' });
  }
});

// Get a specific analytics session
router.get('/sessions/:id', async (req, res) => {
  try {
    const analyticsDir = path.join(__dirname, '../omai/servic../omai/services/memory');
    const sessionsFile = path.join(analyticsDir, 'analytics-sessions.json');
    
    const data = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(data);
    
    const session = sessions.find(s => s.id === req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Analytics session not found' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error reading analytics session:', error);
    res.status(500).json({ error: 'Failed to load analytics session' });
  }
});

// Start a new analytics session
router.post('/sessions', async (req, res) => {
  try {
    const { name, description, targets } = req.body;
    
    if (!name || !targets || !Array.isArray(targets)) {
      return res.status(400).json({ error: 'Invalid session data' });
    }
    
    const analyticsDir = path.join(__dirname, '../omai/servic../omai/services/memory');
    const sessionsFile = path.join(analyticsDir, 'analytics-sessions.json');
    
    const data = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(data);
    
    const newSession = {
      id: Date.now().toString(),
      name,
      description: description || '',
      targets,
      status: 'running',
      startedAt: new Date().toISOString(),
      results: {
        predictions: [],
        forecasts: [],
        trends: [],
        anomalies: [],
        correlations: [],
        insights: []
      }
    };
    
    sessions.push(newSession);
    await fs.writeFile(sessionsFile, JSON.stringify(sessions, null, 2));
    
    res.json(newSession);
  } catch (error) {
    console.error('Error creating analytics session:', error);
    res.status(500).json({ error: 'Failed to create analytics session' });
  }
});

// Run analytics cycle for a session
router.post('/sessions/:id/cycle', async (req, res) => {
  try {
    const analyticsDir = path.join(__dirname, '../omai/servic../omai/services/memory');
    const sessionsFile = path.join(analyticsDir, 'analytics-sessions.json');
    
    const data = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(data);
    
    const sessionIndex = sessions.findIndex(s => s.id === req.params.id);
    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Analytics session not found' });
    }
    
    const session = sessions[sessionIndex];
    if (session.status !== 'running') {
      return res.status(400).json({ error: 'Session is not running' });
    }
    
    // Simulate analytics cycle execution
    session.results.insights.push(`Analytics cycle completed at ${new Date().toISOString()}`);
    
    sessions[sessionIndex] = session;
    await fs.writeFile(sessionsFile, JSON.stringify(sessions, null, 2));
    
    res.json({ success: true, message: 'Analytics cycle completed' });
  } catch (error) {
    console.error('Error running analytics cycle:', error);
    res.status(500).json({ error: 'Failed to run analytics cycle' });
  }
});

// Generate report for a session
router.post('/sessions/:id/report', async (req, res) => {
  try {
    const analyticsDir = path.join(__dirname, '../omai/servic../omai/services/memory');
    const sessionsFile = path.join(analyticsDir, 'analytics-sessions.json');
    const reportsFile = path.join(analyticsDir, 'analytics-reports.json');
    
    const sessionsData = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(sessionsData);
    
    const session = sessions.find(s => s.id === req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Analytics session not found' });
    }
    
    // Generate report
    const report = {
      id: Date.now().toString(),
      sessionId: session.id,
      summary: {
        totalPredictions: session.results.predictions.length,
        totalForecasts: session.results.forecasts.length,
        totalTrends: session.results.trends.length,
        totalAnomalies: session.results.anomalies.length,
        totalCorrelations: session.results.correlations.length,
        accuracy: 0.85,
        confidence: 0.92
      },
      insights: session.results.insights,
      recommendations: [
        'Implement proactive monitoring',
        'Scale resources based on forecasts',
        'Optimize system performance'
      ],
      generatedAt: new Date().toISOString()
    };
    
    // Save report
    const reportsData = await fs.readFile(reportsFile, 'utf-8');
    const reports = JSON.parse(reportsData);
    reports.push(report);
    await fs.writeFile(reportsFile, JSON.stringify(reports, null, 2));
    
    res.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Get all analytics reports
router.get('/reports', async (req, res) => {
  try {
    const analyticsDir = path.join(__dirname, '../omai/servic../omai/services/memory');
    const reportsFile = path.join(analyticsDir, 'analytics-reports.json');
    
    const data = await fs.readFile(reportsFile, 'utf-8');
    const reports = JSON.parse(data);
    
    res.json(reports);
  } catch (error) {
    console.error('Error reading analytics reports:', error);
    res.status(500).json({ error: 'Failed to load analytics reports' });
  }
});

// Get a specific analytics report
router.get('/reports/:id', async (req, res) => {
  try {
    const analyticsDir = path.join(__dirname, '../omai/servic../omai/services/memory');
    const reportsFile = path.join(analyticsDir, 'analytics-reports.json');
    
    const data = await fs.readFile(reportsFile, 'utf-8');
    const reports = JSON.parse(data);
    
    const report = reports.find(r => r.id === req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Analytics report not found' });
    }
    
    res.json(report);
  } catch (error) {
    console.error('Error reading analytics report:', error);
    res.status(500).json({ error: 'Failed to load analytics report' });
  }
});

// Get anomaly alerts
router.get('/alerts', async (req, res) => {
  try {
    const { acknowledged } = req.query;
    const analyticsDir = path.join(__dirname, '../omai/servic../omai/services/memory');
    const alertsFile = path.join(analyticsDir, 'anomaly-alerts.json');
    
    const data = await fs.readFile(alertsFile, 'utf-8');
    let alerts = JSON.parse(data);
    
    if (acknowledged !== undefined) {
      const acknowledgedBool = acknowledged === 'true';
      alerts = alerts.filter(alert => alert.acknowledged === acknowledgedBool);
    }
    
    res.json(alerts);
  } catch (error) {
    console.error('Error reading anomaly alerts:', error);
    res.status(500).json({ error: 'Failed to load anomaly alerts' });
  }
});

// Acknowledge an anomaly alert
router.post('/alerts/:id/acknowledge', async (req, res) => {
  try {
    const { acknowledgedBy } = req.body;
    
    if (!acknowledgedBy) {
      return res.status(400).json({ error: 'acknowledgedBy is required' });
    }
    
    const analyticsDir = path.join(__dirname, '../omai/servic../omai/services/memory');
    const alertsFile = path.join(analyticsDir, 'anomaly-alerts.json');
    
    const data = await fs.readFile(alertsFile, 'utf-8');
    const alerts = JSON.parse(data);
    
    const alertIndex = alerts.findIndex(a => a.id === req.params.id);
    if (alertIndex === -1) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    alerts[alertIndex].acknowledged = true;
    alerts[alertIndex].acknowledgedBy = acknowledgedBy;
    alerts[alertIndex].acknowledgedAt = new Date().toISOString();
    
    await fs.writeFile(alertsFile, JSON.stringify(alerts, null, 2));
    
    res.json({ success: true, message: 'Alert acknowledged' });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Get predictive models
router.get('/models', async (req, res) => {
  try {
    const analyticsDir = path.join(__dirname, '../omai/servic../omai/services/memory');
    const modelsFile = path.join(analyticsDir, 'predictive-models.json');
    
    const data = await fs.readFile(modelsFile, 'utf-8');
    const models = JSON.parse(data);
    
    res.json(models);
  } catch (error) {
    console.error('Error reading predictive models:', error);
    res.status(500).json({ error: 'Failed to load predictive models' });
  }
});

// Create a new predictive model
router.post('/models', async (req, res) => {
  try {
    const { name, type, target, features } = req.body;
    
    if (!name || !type || !target || !features) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const analyticsDir = path.join(__dirname, '../omai/servic../omai/services/memory');
    const modelsFile = path.join(analyticsDir, 'predictive-models.json');
    
    const data = await fs.readFile(modelsFile, 'utf-8');
    const models = JSON.parse(data);
    
    const newModel = {
      id: Date.now().toString(),
      name,
      type,
      target,
      features,
      accuracy: 0,
      lastTrained: new Date().toISOString(),
      status: 'training'
    };
    
    models.push(newModel);
    await fs.writeFile(modelsFile, JSON.stringify(models, null, 2));
    
    res.json(newModel);
  } catch (error) {
    console.error('Error creating predictive model:', error);
    res.status(500).json({ error: 'Failed to create predictive model' });
  }
});

// Train a predictive model
router.post('/models/:id/train', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Training data is required' });
    }
    
    const analyticsDir = path.join(__dirname, '../omai/servic../omai/services/memory');
    const modelsFile = path.join(analyticsDir, 'predictive-models.json');
    
    const modelsData = await fs.readFile(modelsFile, 'utf-8');
    const models = JSON.parse(modelsData);
    
    const modelIndex = models.findIndex(m => m.id === req.params.id);
    if (modelIndex === -1) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    // Simulate model training
    models[modelIndex].accuracy = Math.random() * 0.3 + 0.7;
    models[modelIndex].lastTrained = new Date().toISOString();
    models[modelIndex].status = 'ready';
    
    await fs.writeFile(modelsFile, JSON.stringify(models, null, 2));
    
    res.json({ success: true, message: 'Model training completed' });
  } catch (error) {
    console.error('Error training model:', error);
    res.status(500).json({ error: 'Failed to train model' });
  }
});

// Make a prediction using a model
router.post('/models/:id/predict', async (req, res) => {
  try {
    const { features } = req.body;
    
    if (!features || typeof features !== 'object') {
      return res.status(400).json({ error: 'Features are required' });
    }
    
    const analyticsDir = path.join(__dirname, '../omai/servic../omai/services/memory');
    const modelsFile = path.join(analyticsDir, 'predictive-models.json');
    const predictionsFile = path.join(analyticsDir, 'predictions.json');
    
    const modelsData = await fs.readFile(modelsFile, 'utf-8');
    const models = JSON.parse(modelsData);
    
    const model = models.find(m => m.id === req.params.id);
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    if (model.status !== 'ready') {
      return res.status(400).json({ error: 'Model is not ready for predictions' });
    }
    
    // Simulate prediction
    const prediction = {
      id: Date.now().toString(),
      modelId: model.id,
      target: model.target,
      predictedValue: Math.random() * 100,
      confidence: Math.random() * 0.3 + 0.7,
      timestamp: new Date().toISOString(),
      metadata: { features }
    };
    
    // Save prediction
    const predictionsData = await fs.readFile(predictionsFile, 'utf-8');
    const predictions = JSON.parse(predictionsData);
    predictions.push(prediction);
    await fs.writeFile(predictionsFile, JSON.stringify(predictions, null, 2));
    
    res.json(prediction);
  } catch (error) {
    console.error('Error making prediction:', error);
    res.status(500).json({ error: 'Failed to make prediction' });
  }
});

// Get trend analyses
router.get('/trends', async (req, res) => {
  try {
    const { target } = req.query;
    const analyticsDir = path.join(__dirname, '../omai/servic../omai/services/memory');
    const trendsFile = path.join(analyticsDir, 'trend-analyses.json');
    
    const data = await fs.readFile(trendsFile, 'utf-8');
    let trends = JSON.parse(data);
    
    if (target) {
      trends = trends.filter(t => t.target === target);
    }
    
    res.json(trends);
  } catch (error) {
    console.error('Error reading trend analyses:', error);
    res.status(500).json({ error: 'Failed to load trend analyses' });
  }
});

// Get correlation analyses
router.get('/correlations', async (req, res) => {
  try {
    const analyticsDir = path.join(__dirname, '../omai/servic../omai/services/memory');
    const correlationsFile = path.join(analyticsDir, 'correlation-analyses.json');
    
    const data = await fs.readFile(correlationsFile, 'utf-8');
    const correlations = JSON.parse(data);
    
    res.json(correlations);
  } catch (error) {
    console.error('Error reading correlation analyses:', error);
    res.status(500).json({ error: 'Failed to load correlation analyses' });
  }
});

// Get anomaly detections
router.get('/anomalies', async (req, res) => {
  try {
    const { target } = req.query;
    const analyticsDir = path.join(__dirname, '../omai/servic../omai/services/memory');
    const anomaliesFile = path.join(analyticsDir, 'anomalies.json');
    
    const data = await fs.readFile(anomaliesFile, 'utf-8');
    let anomalies = JSON.parse(data);
    
    if (target) {
      anomalies = anomalies.filter(a => a.target === target);
    }
    
    res.json(anomalies);
  } catch (error) {
    console.error('Error reading anomaly detections:', error);
    res.status(500).json({ error: 'Failed to load anomaly detections' });
  }
});

// Get forecasts
router.get('/forecasts', async (req, res) => {
  try {
    const { target } = req.query;
    const analyticsDir = path.join(__dirname, '../omai/servic../omai/services/memory');
    const forecastsFile = path.join(analyticsDir, 'forecasts.json');
    
    const data = await fs.readFile(forecastsFile, 'utf-8');
    let forecasts = JSON.parse(data);
    
    if (target) {
      forecasts = forecasts.filter(f => f.target === target);
    }
    
    res.json(forecasts);
  } catch (error) {
    console.error('Error reading forecasts:', error);
    res.status(500).json({ error: 'Failed to load forecasts' });
  }
});

module.exports = router; 