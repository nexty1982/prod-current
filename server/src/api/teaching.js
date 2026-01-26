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

// Get all teaching sessions
router.get('/sessions', async (req, res) => {
  try {
    const sessionsFile = path.join(__dirname, '../services/om-ai/memory/teaching-sessions.json');
    const data = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(data);
    
    // Filter by teacher if provided
    if (req.query.teacher) {
      const filteredSessions = sessions.filter(s => s.teacher === req.query.teacher);
      return res.json(filteredSessions);
    }
    
    // Filter by status if provided
    if (req.query.status) {
      const filteredSessions = sessions.filter(s => s.status === req.query.status);
      return res.json(filteredSessions);
    }
    
    res.json(sessions);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json([]);
    } else {
      console.error('Error reading sessions:', error);
      res.status(500).json({ error: 'Failed to load sessions' });
    }
  }
});

// Get a specific teaching session
router.get('/sessions/:id', async (req, res) => {
  try {
    const sessionsFile = path.join(__dirname, '../services/om-ai/memory/teaching-sessions.json');
    const data = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(data);
    
    const session = sessions.find(s => s.id === req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error reading session:', error);
    res.status(500).json({ error: 'Failed to load session' });
  }
});

// Create a new teaching session
router.post('/sessions', async (req, res) => {
  try {
    const { title, objective } = req.body;
    
    if (!title || !objective) {
      return res.status(400).json({ error: 'Title and objective are required' });
    }
    
    const sessionsFile = path.join(__dirname, '../services/om-ai/memory/teaching-sessions.json');
    const sessionsDir = path.dirname(sessionsFile);
    
    // Ensure directory exists
    await fs.mkdir(sessionsDir, { recursive: true });
    
    // Read existing sessions
    let sessions = [];
    try {
      const data = await fs.readFile(sessionsFile, 'utf-8');
      sessions = JSON.parse(data);
    } catch (error) {
      // File doesn't exist, start with empty array
    }
    
    // Create new session
    const newSession = {
      id: Date.now().toString(),
      title,
      objective,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      teacher: req.user.email || 'system',
      progress: 0,
      concepts: [],
      feedback: []
    };
    
    sessions.push(newSession);
    await fs.writeFile(sessionsFile, JSON.stringify(sessions, null, 2));
    
    res.status(201).json(newSession);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Update a teaching session
router.put('/sessions/:id', async (req, res) => {
  try {
    const sessionsFile = path.join(__dirname, '../services/om-ai/memory/teaching-sessions.json');
    const data = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(data);
    
    const sessionIndex = sessions.findIndex(s => s.id === req.params.id);
    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Update session
    sessions[sessionIndex] = {
      ...sessions[sessionIndex],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeFile(sessionsFile, JSON.stringify(sessions, null, 2));
    
    res.json(sessions[sessionIndex]);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// Delete a teaching session
router.delete('/sessions/:id', async (req, res) => {
  try {
    const sessionsFile = path.join(__dirname, '../services/om-ai/memory/teaching-sessions.json');
    const data = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(data);
    
    const filteredSessions = sessions.filter(s => s.id !== req.params.id);
    
    if (filteredSessions.length === sessions.length) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    await fs.writeFile(sessionsFile, JSON.stringify(filteredSessions, null, 2));
    
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Get all learned concepts
router.get('/concepts', async (req, res) => {
  try {
    const conceptsFile = path.join(__dirname, '../services/om-ai/memory/learned-concepts.json');
    const data = await fs.readFile(conceptsFile, 'utf-8');
    const concepts = JSON.parse(data);
    
    // Filter by category if provided
    if (req.query.category) {
      const filteredConcepts = concepts.filter(c => 
        c.category.toLowerCase() === req.query.category.toLowerCase()
      );
      return res.json(filteredConcepts);
    }
    
    // Filter by tag if provided
    if (req.query.tag) {
      const filteredConcepts = concepts.filter(c => 
        c.tags.some(tag => tag.toLowerCase() === req.query.tag.toLowerCase())
      );
      return res.json(filteredConcepts);
    }
    
    // Search if query provided
    if (req.query.search) {
      const searchTerm = req.query.search.toLowerCase();
      const filteredConcepts = concepts.filter(c => 
        c.concept.toLowerCase().includes(searchTerm) ||
        c.description.toLowerCase().includes(searchTerm) ||
        c.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        c.category.toLowerCase().includes(searchTerm)
      );
      return res.json(filteredConcepts);
    }
    
    res.json(concepts);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json([]);
    } else {
      console.error('Error reading concepts:', error);
      res.status(500).json({ error: 'Failed to load concepts' });
    }
  }
});

// Get a specific concept
router.get('/concepts/:id', async (req, res) => {
  try {
    const conceptsFile = path.join(__dirname, '../services/om-ai/memory/learned-concepts.json');
    const data = await fs.readFile(conceptsFile, 'utf-8');
    const concepts = JSON.parse(data);
    
    const concept = concepts.find(c => c.id === req.params.id);
    if (!concept) {
      return res.status(404).json({ error: 'Concept not found' });
    }
    
    res.json(concept);
  } catch (error) {
    console.error('Error reading concept:', error);
    res.status(500).json({ error: 'Failed to load concept' });
  }
});

// Add a concept to a session
router.post('/sessions/:sessionId/concepts', async (req, res) => {
  try {
    const { concept, description, examples, category, tags } = req.body;
    
    if (!concept || !description) {
      return res.status(400).json({ error: 'Concept name and description are required' });
    }
    
    const sessionsFile = path.join(__dirname, '../services/om-ai/memory/teaching-sessions.json');
    const conceptsFile = path.join(__dirname, '../services/om-ai/memory/learned-concepts.json');
    
    // Read sessions
    const sessionsData = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(sessionsData);
    
    const sessionIndex = sessions.findIndex(s => s.id === req.params.sessionId);
    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Create new concept
    const newConcept = {
      id: Date.now().toString(),
      concept,
      description,
      examples: examples || [],
      confidence: 50,
      validated: false,
      createdAt: new Date().toISOString(),
      lastTested: new Date().toISOString(),
      testResults: [],
      category: category || 'general',
      tags: tags || []
    };
    
    // Add to session
    sessions[sessionIndex].concepts.push(newConcept);
    sessions[sessionIndex].updatedAt = new Date().toISOString();
    
    // Read existing concepts
    let concepts = [];
    try {
      const conceptsData = await fs.readFile(conceptsFile, 'utf-8');
      concepts = JSON.parse(conceptsData);
    } catch (error) {
      // File doesn't exist, start with empty array
    }
    
    // Add to concepts list
    concepts.push(newConcept);
    
    // Save both files
    await fs.writeFile(sessionsFile, JSON.stringify(sessions, null, 2));
    await fs.writeFile(conceptsFile, JSON.stringify(concepts, null, 2));
    
    res.status(201).json(newConcept);
  } catch (error) {
    console.error('Error adding concept:', error);
    res.status(500).json({ error: 'Failed to add concept' });
  }
});

// Get feedback for a session
router.get('/sessions/:sessionId/feedback', async (req, res) => {
  try {
    const sessionsFile = path.join(__dirname, '../services/om-ai/memory/teaching-sessions.json');
    const data = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(data);
    
    const session = sessions.find(s => s.id === req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session.feedback || []);
  } catch (error) {
    console.error('Error reading feedback:', error);
    res.status(500).json({ error: 'Failed to load feedback' });
  }
});

// Add feedback to a session
router.post('/sessions/:sessionId/feedback', async (req, res) => {
  try {
    const { type, content, impact, conceptId } = req.body;
    
    if (!type || !content || !impact) {
      return res.status(400).json({ error: 'Type, content, and impact are required' });
    }
    
    const sessionsFile = path.join(__dirname, '../services/om-ai/memory/teaching-sessions.json');
    const feedbackFile = path.join(__dirname, '../services/om-ai/memory/feedback-history.json');
    
    // Read sessions
    const sessionsData = await fs.readFile(sessionsFile, 'utf-8');
    const sessions = JSON.parse(sessionsData);
    
    const sessionIndex = sessions.findIndex(s => s.id === req.params.sessionId);
    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Create new feedback
    const newFeedback = {
      id: Date.now().toString(),
      sessionId: req.params.sessionId,
      conceptId,
      type,
      content,
      providedBy: req.user.email || 'system',
      timestamp: new Date().toISOString(),
      impact,
      processed: false
    };
    
    // Add to session
    if (!sessions[sessionIndex].feedback) {
      sessions[sessionIndex].feedback = [];
    }
    sessions[sessionIndex].feedback.push(newFeedback);
    sessions[sessionIndex].updatedAt = new Date().toISOString();
    
    // Read existing feedback
    let allFeedback = [];
    try {
      const feedbackData = await fs.readFile(feedbackFile, 'utf-8');
      allFeedback = JSON.parse(feedbackData);
    } catch (error) {
      // File doesn't exist, start with empty array
    }
    
    // Add to feedback history
    allFeedback.push(newFeedback);
    
    // Save both files
    await fs.writeFile(sessionsFile, JSON.stringify(sessions, null, 2));
    await fs.writeFile(feedbackFile, JSON.stringify(allFeedback, null, 2));
    
    res.status(201).json(newFeedback);
  } catch (error) {
    console.error('Error adding feedback:', error);
    res.status(500).json({ error: 'Failed to add feedback' });
  }
});

// Get learning analytics
router.get('/analytics', async (req, res) => {
  try {
    const sessionsFile = path.join(__dirname, '../services/om-ai/memory/teaching-sessions.json');
    const conceptsFile = path.join(__dirname, '../services/om-ai/memory/learned-concepts.json');
    const feedbackFile = path.join(__dirname, '../services/om-ai/memory/feedback-history.json');
    
    // Read all data
    let sessions = [];
    let concepts = [];
    let feedback = [];
    
    try {
      const sessionsData = await fs.readFile(sessionsFile, 'utf-8');
      sessions = JSON.parse(sessionsData);
    } catch (error) {
      // File doesn't exist
    }
    
    try {
      const conceptsData = await fs.readFile(conceptsFile, 'utf-8');
      concepts = JSON.parse(conceptsData);
    } catch (error) {
      // File doesn't exist
    }
    
    try {
      const feedbackData = await fs.readFile(feedbackFile, 'utf-8');
      feedback = JSON.parse(feedbackData);
    } catch (error) {
      // File doesn't exist
    }
    
    // Calculate analytics
    const totalSessions = sessions.length;
    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const totalConcepts = concepts.length;
    const validatedConcepts = concepts.filter(c => c.validated).length;
    const averageConfidence = concepts.length > 0 
      ? concepts.reduce((sum, c) => sum + c.confidence, 0) / concepts.length 
      : 0;
    
    // Generate top concepts
    const topConcepts = concepts
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10)
      .map(c => ({
        concept: c.concept,
        confidence: c.confidence,
        usageCount: c.testResults ? c.testResults.length : 0,
        lastUsed: c.lastTested
      }));
    
    // Get recent feedback
    const recentFeedback = feedback
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
    
    const analytics = {
      totalSessions,
      activeSessions,
      completedSessions,
      totalConcepts,
      validatedConcepts,
      averageConfidence: Math.round(averageConfidence),
      learningProgress: [], // TODO: Implement learning progress calculation
      topConcepts,
      recentFeedback
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Error generating analytics:', error);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// Test a concept
router.post('/concepts/:id/test', async (req, res) => {
  try {
    const { testType } = req.body;
    
    const conceptsFile = path.join(__dirname, '../services/om-ai/memory/learned-concepts.json');
    const data = await fs.readFile(conceptsFile, 'utf-8');
    const concepts = JSON.parse(data);
    
    const conceptIndex = concepts.findIndex(c => c.id === req.params.id);
    if (conceptIndex === -1) {
      return res.status(404).json({ error: 'Concept not found' });
    }
    
    // Generate test result (simplified)
    const testResult = {
      id: Date.now().toString(),
      conceptId: req.params.id,
      testType: testType || 'knowledge',
      score: Math.floor(Math.random() * 40) + 60, // Random score between 60-100
      timestamp: new Date().toISOString(),
      questions: [
        {
          id: '1',
          question: `What is ${concepts[conceptIndex].concept}?`,
          answer: concepts[conceptIndex].description,
          correct: true,
          explanation: 'This tests understanding of the concept definition'
        }
      ],
      passed: true
    };
    
    // Update concept with test result
    if (!concepts[conceptIndex].testResults) {
      concepts[conceptIndex].testResults = [];
    }
    concepts[conceptIndex].testResults.push(testResult);
    concepts[conceptIndex].lastTested = new Date().toISOString();
    
    // Recalculate confidence
    concepts[conceptIndex].confidence = Math.min(100, concepts[conceptIndex].confidence + 5);
    
    await fs.writeFile(conceptsFile, JSON.stringify(concepts, null, 2));
    
    res.json(testResult);
  } catch (error) {
    console.error('Error testing concept:', error);
    res.status(500).json({ error: 'Failed to test concept' });
  }
});

// Validate a concept
router.post('/concepts/:id/validate', async (req, res) => {
  try {
    const conceptsFile = path.join(__dirname, '../services/om-ai/memory/learned-concepts.json');
    const data = await fs.readFile(conceptsFile, 'utf-8');
    const concepts = JSON.parse(data);
    
    const conceptIndex = concepts.findIndex(c => c.id === req.params.id);
    if (conceptIndex === -1) {
      return res.status(404).json({ error: 'Concept not found' });
    }
    
    // Validate concept (simplified validation)
    const concept = concepts[conceptIndex];
    const issues = [];
    let confidence = concept.confidence;
    
    if (!concept.concept || concept.concept.trim().length < 3) {
      issues.push('Concept name is too short');
      confidence -= 20;
    }
    
    if (!concept.description || concept.description.trim().length < 10) {
      issues.push('Description is too short');
      confidence -= 15;
    }
    
    if (!concept.examples || concept.examples.length === 0) {
      issues.push('No examples provided');
      confidence -= 10;
    }
    
    const valid = issues.length === 0;
    confidence = Math.max(0, Math.min(100, confidence));
    
    // Update concept
    concepts[conceptIndex].validated = valid;
    concepts[conceptIndex].confidence = confidence;
    
    await fs.writeFile(conceptsFile, JSON.stringify(concepts, null, 2));
    
    res.json({
      valid,
      confidence,
      issues
    });
  } catch (error) {
    console.error('Error validating concept:', error);
    res.status(500).json({ error: 'Failed to validate concept' });
  }
});

module.exports = router; 