const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const INDEX_FILE = path.join(__dirname, '../../.analysis/library-index.json');

router.get('/status', async (req, res) => {
  try {
    const indexExists = fs.existsSync(INDEX_FILE);
    
    if (!indexExists) {
      return res.json({
        online: false,
        message: 'Library index not found',
        filesIndexed: 0
      });
    }

    const indexData = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    const files = Object.values(indexData);
    
    res.json({
      online: true,
      filesIndexed: files.length,
      lastUpdate: new Date().toISOString(),
      categories: {
        technical: files.filter(f => f.category === 'technical').length,
        ops: files.filter(f => f.category === 'ops').length,
        recovery: files.filter(f => f.category === 'recovery').length
      }
    });
  } catch (error) {
    console.error('Library status error:', error);
    res.status(500).json({
      online: false,
      error: error.message,
      filesIndexed: 0
    });
  }
});

router.get('/documents', async (req, res) => {
  try {
    const indexExists = fs.existsSync(INDEX_FILE);
    
    if (!indexExists) {
      return res.json({
        success: false,
        documents: []
      });
    }

    const indexData = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    const documents = Object.values(indexData);

    res.json({
      success: true,
      documents,
      total: documents.length
    });
  } catch (error) {
    console.error('Library documents error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      documents: []
    });
  }
});

router.post('/search', async (req, res) => {
  try {
    const { query, category } = req.body;
    const indexExists = fs.existsSync(INDEX_FILE);
    
    if (!indexExists) {
      return res.json({
        success: false,
        results: []
      });
    }

    const indexData = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    let results = Object.values(indexData);

    if (category && category !== 'all') {
      results = results.filter(file => file.category === category);
    }

    if (query && query.trim()) {
      const searchTerm = query.toLowerCase();
      results = results.filter(file => {
        const filenameMatch = file.filename.toLowerCase().includes(searchTerm);
        const titleMatch = file.title && file.title.toLowerCase().includes(searchTerm);
        return filenameMatch || titleMatch;
      });
    }

    res.json({
      success: true,
      results,
      total: results.length
    });
  } catch (error) {
    console.error('Library search error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      results: []
    });
  }
});

module.exports = router;
