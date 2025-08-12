const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Middleware to check if user is super_admin
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_super_admin) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

// Apply super admin middleware to all routes
router.use(requireSuperAdmin);

// Get NLP metrics
router.get('/metrics', async (req, res) => {
  try {
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'metrics.json'), 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.json({
      totalRequests: 0,
      averageResponseTime: 0,
      successRate: 0,
      activeSessions: 0,
      totalConversations: 0,
      totalDocuments: 0,
      languageModels: 0,
      lastUpdated: new Date().toISOString()
    });
  }
});

// Session Management
router.get('/sessions', async (req, res) => {
  try {
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'sessions.json'), 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.json([]);
  }
});

router.post('/sessions', async (req, res) => {
  try {
    const { type } = req.body;
    const userId = req.user.id;
    
    // This would typically call the NLP controller
    const session = {
      id: require('uuid').v4(),
      userId,
      type,
      status: 'active',
      startTime: new Date().toISOString(),
      metadata: {
        requestCount: 0,
        averageResponseTime: 0,
        lastActivity: new Date().toISOString()
      }
    };

    const sessions = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'sessions.json'), 'utf-8')
      .then(data => JSON.parse(data))
      .catch(() => []);
    
    sessions.push(session);
    await fs.writeFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'sessions.json'), JSON.stringify(sessions, null, 2));
    
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

router.get('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'sessions.json'), 'utf-8');
    const sessions = JSON.parse(data);
    const session = sessions.find(s => s.id === id);
    
    if (session) {
      res.json(session);
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to get session' });
  }
});

router.post('/sessions/:id/end', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'sessions.json'), 'utf-8');
    const sessions = JSON.parse(data);
    const sessionIndex = sessions.findIndex(s => s.id === id);
    
    if (sessionIndex !== -1) {
      sessions[sessionIndex].status = 'completed';
      sessions[sessionIndex].endTime = new Date().toISOString();
      await fs.writeFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'sessions.json'), JSON.stringify(sessions, null, 2));
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Conversation Management
router.get('/conversations', async (req, res) => {
  try {
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'conversations.json'), 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.json([]);
  }
});

router.post('/conversations', async (req, res) => {
  try {
    const { title, participants } = req.body;
    
    const conversation = {
      id: require('uuid').v4(),
      title,
      participants,
      messages: [],
      context: {
        topic: '',
        goals: [],
        constraints: [],
        preferences: {},
        history: [],
        currentState: {},
        variables: {}
      },
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const conversations = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'conversations.json'), 'utf-8')
      .then(data => JSON.parse(data))
      .catch(() => []);
    
    conversations.push(conversation);
    await fs.writeFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'conversations.json'), JSON.stringify(conversations, null, 2));
    
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

router.get('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'conversations.json'), 'utf-8');
    const conversations = JSON.parse(data);
    const conversation = conversations.find(c => c.id === id);
    
    if (conversation) {
      res.json(conversation);
    } else {
      res.status(404).json({ error: 'Conversation not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { sender, content } = req.body;
    
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'conversations.json'), 'utf-8');
    const conversations = JSON.parse(data);
    const conversationIndex = conversations.findIndex(c => c.id === id);
    
    if (conversationIndex !== -1) {
      const message = {
        id: require('uuid').v4(),
        conversationId: id,
        sender,
        content,
        type: 'text',
        timestamp: new Date().toISOString()
      };
      
      conversations[conversationIndex].messages.push(message);
      conversations[conversationIndex].updatedAt = new Date().toISOString();
      
      await fs.writeFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'conversations.json'), JSON.stringify(conversations, null, 2));
      
      res.json(message);
    } else {
      res.status(404).json({ error: 'Conversation not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to add message' });
  }
});

router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit } = req.query;
    
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'conversations.json'), 'utf-8');
    const conversations = JSON.parse(data);
    const conversation = conversations.find(c => c.id === id);
    
    if (conversation) {
      let messages = conversation.messages;
      if (limit) {
        messages = messages.slice(-parseInt(limit));
      }
      res.json(messages);
    } else {
      res.status(404).json({ error: 'Conversation not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Document Management
router.get('/documents', async (req, res) => {
  try {
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'documents.json'), 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.json([]);
  }
});

router.post('/documents', async (req, res) => {
  try {
    const { title, content, type, source } = req.body;
    
    const document = {
      id: require('uuid').v4(),
      title,
      content,
      type,
      source,
      metadata: {
        size: content.length,
        language: 'en',
        encoding: 'utf-8',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        tags: [],
        categories: []
      },
      processedAt: new Date().toISOString()
    };

    const documents = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'documents.json'), 'utf-8')
      .then(data => JSON.parse(data))
      .catch(() => []);
    
    documents.push(document);
    await fs.writeFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'documents.json'), JSON.stringify(documents, null, 2));
    
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process document' });
  }
});

router.get('/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'documents.json'), 'utf-8');
    const documents = JSON.parse(data);
    const document = documents.find(d => d.id === id);
    
    if (document) {
      res.json(document);
    } else {
      res.status(404).json({ error: 'Document not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to get document' });
  }
});

router.post('/documents/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;
    
    // This would typically call the document processor to analyze the document
    const analysis = {
      id: require('uuid').v4(),
      documentId: id,
      summary: 'Document analysis completed',
      keyPoints: ['Key point 1', 'Key point 2'],
      topics: [{ name: 'topic1', confidence: 0.8, keywords: ['keyword1'], frequency: 1 }],
      entities: [],
      sentiment: { overall: 'neutral', score: 0, sections: [], trends: [] },
      readability: {
        fleschKincaid: 0,
        gunningFog: 0,
        smog: 0,
        colemanLiau: 0,
        automatedReadability: 0,
        averageGrade: 0,
        complexity: 'moderate'
      },
      structure: { sections: [], headings: [], paragraphs: 0, sentences: 0, words: 0, characters: 0 },
      timestamp: new Date().toISOString()
    };

    // Update document with analysis
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'documents.json'), 'utf-8');
    const documents = JSON.parse(data);
    const documentIndex = documents.findIndex(d => d.id === id);
    
    if (documentIndex !== -1) {
      documents[documentIndex].analysis = analysis;
      await fs.writeFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'documents.json'), JSON.stringify(documents, null, 2));
      
      // Save analysis
      const analyses = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'document-analyses.json'), 'utf-8')
        .then(data => JSON.parse(data))
        .catch(() => []);
      
      analyses.push(analysis);
      await fs.writeFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'document-analyses.json'), JSON.stringify(analyses, null, 2));
      
      res.json(analysis);
    } else {
      res.status(404).json({ error: 'Document not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze document' });
  }
});

// Text Processing
router.post('/analyze', async (req, res) => {
  try {
    const { text } = req.body;
    
    // This would typically call the NLP engine to analyze text
    const analysis = {
      id: require('uuid').v4(),
      text,
      entities: [],
      sentiment: { overall: 'neutral', score: 0, emotions: { joy: 0, sadness: 0, anger: 0, fear: 0, surprise: 0 }, confidence: 0.7 },
      intent: { primary: 'unknown', confidence: 0.5, secondary: [], actions: [] },
      keywords: [],
      syntax: { tokens: [], pos: [], dependencies: [], structure: 'basic' },
      timestamp: new Date().toISOString()
    };
    
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze text' });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const { context, type } = req.body;
    
    // This would typically call the NLP engine to generate response
    const response = "Generated response based on context and type.";
    
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// Language Models
router.get('/models', async (req, res) => {
  try {
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'models.json'), 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.json([]);
  }
});

router.put('/models/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'models.json'), 'utf-8');
    const models = JSON.parse(data);
    const modelIndex = models.findIndex(m => m.id === id);
    
    if (modelIndex !== -1) {
      models[modelIndex] = { ...models[modelIndex], ...updates };
      await fs.writeFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'models.json'), JSON.stringify(models, null, 2));
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Model not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update model' });
  }
});

// Reports
router.get('/reports', async (req, res) => {
  try {
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'reports.json'), 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.json([]);
  }
});

router.post('/reports', async (req, res) => {
  try {
    const { sessionId, type } = req.body;
    
    // This would typically call the NLP controller to generate report
    const report = {
      id: require('uuid').v4(),
      sessionId,
      type,
      content: {},
      generatedAt: new Date().toISOString()
    };

    const reports = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'reports.json'), 'utf-8')
      .then(data => JSON.parse(data))
      .catch(() => []);
    
    reports.push(report);
    await fs.writeFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'reports.json'), JSON.stringify(reports, null, 2));
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Raw data endpoints for debugging
router.get('/raw/sessions', async (req, res) => {
  try {
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'sessions.json'), 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.json([]);
  }
});

router.get('/raw/conversations', async (req, res) => {
  try {
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'conversations.json'), 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.json([]);
  }
});

router.get('/raw/documents', async (req, res) => {
  try {
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'documents.json'), 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.json([]);
  }
});

router.get('/raw/analyses', async (req, res) => {
  try {
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'om-ai', 'nlp', 'document-analyses.json'), 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.json([]);
  }
});

module.exports = router; 