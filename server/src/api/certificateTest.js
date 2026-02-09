/**
 * Certificate PDF Generator Test Endpoint
 * 
 * Use this to verify the new deterministic PDF generator produces
 * pixel-perfect output with embedded fonts and explicit coordinates.
 */

const express = require('express');
const router = express.Router();
const { generateCertificatePDF } = require('../certificates/pdf-generator');
const { getCoordinateMap } = require('../certificates/coordinate-maps');

/**
 * GET /api/certificate-test/baptism
 * Generate a test baptism certificate with sample data
 */
router.get('/baptism', async (req, res) => {
  try {
    // Sample baptism record data
    const sampleRecord = {
      id: 999,
      first_name: 'John',
      last_name: 'Doe',
      birth_date: '1990-05-15',
      birthplace: 'New York, NY',
      reception_date: '2024-01-20',
      baptism_date: '2024-01-20',
      sponsors: 'Michael Smith, Sarah Johnson',
      godparents: 'Michael Smith, Sarah Johnson',
      clergy: 'Fr. Peter Anderson',
      churchName: 'St. Nicholas Orthodox Church',
    };
    
    // Generate PDF with default positions
    const pdfBytes = await generateCertificatePDF('baptism', sampleRecord, {
      customPositions: null,
      hiddenFields: [],
    });
    
    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="test_baptism_certificate.pdf"');
    res.send(Buffer.from(pdfBytes));
    
  } catch (err) {
    console.error('Test baptism certificate error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack,
    });
  }
});

/**
 * GET /api/certificate-test/marriage
 * Generate a test marriage certificate with sample data
 */
router.get('/marriage', async (req, res) => {
  try {
    // Sample marriage record data
    const sampleRecord = {
      id: 999,
      fname_groom: 'Alexander',
      lname_groom: 'Thompson',
      groom_first: 'Alexander',
      groom_last: 'Thompson',
      fname_bride: 'Elizabeth',
      lname_bride: 'Williams',
      bride_first: 'Elizabeth',
      bride_last: 'Williams',
      marriage_date: '2024-06-15',
      marriage_place: 'St. Nicholas Orthodox Church',
      parentsg: 'Robert and Mary Thompson',
      parents_groom: 'Robert and Mary Thompson',
      parentsb: 'James and Patricia Williams',
      parents_bride: 'James and Patricia Williams',
      witnesses: 'David Brown, Jennifer Davis',
      clergy: 'Fr. Peter Anderson',
      churchName: 'St. Nicholas Orthodox Church',
    };
    
    // Generate PDF with default positions
    const pdfBytes = await generateCertificatePDF('marriage', sampleRecord, {
      customPositions: null,
      hiddenFields: [],
    });
    
    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="test_marriage_certificate.pdf"');
    res.send(Buffer.from(pdfBytes));
    
  } catch (err) {
    console.error('Test marriage certificate error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack,
    });
  }
});

/**
 * GET /api/certificate-test/coordinates/:type
 * View the coordinate map for a certificate type
 */
router.get('/coordinates/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const coordinateMap = getCoordinateMap(type);
    
    res.json({
      success: true,
      certificateType: type,
      coordinateMap,
    });
    
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/certificate-test/baptism/custom
 * Test baptism certificate with custom positions
 */
router.post('/baptism/custom', async (req, res) => {
  try {
    const { record, customPositions, hiddenFields } = req.body;
    
    if (!record) {
      return res.status(400).json({
        success: false,
        error: 'Record data is required',
      });
    }
    
    const pdfBytes = await generateCertificatePDF('baptism', record, {
      customPositions: customPositions || null,
      hiddenFields: hiddenFields || [],
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="custom_baptism_certificate.pdf"');
    res.send(Buffer.from(pdfBytes));
    
  } catch (err) {
    console.error('Custom baptism certificate error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/certificate-test/marriage/custom
 * Test marriage certificate with custom positions
 */
router.post('/marriage/custom', async (req, res) => {
  try {
    const { record, customPositions, hiddenFields } = req.body;
    
    if (!record) {
      return res.status(400).json({
        success: false,
        error: 'Record data is required',
      });
    }
    
    const pdfBytes = await generateCertificatePDF('marriage', record, {
      customPositions: customPositions || null,
      hiddenFields: hiddenFields || [],
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="custom_marriage_certificate.pdf"');
    res.send(Buffer.from(pdfBytes));
    
  } catch (err) {
    console.error('Custom marriage certificate error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/certificate-test/info
 * Get information about the test endpoints
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    message: 'Certificate PDF Generator Test Endpoints',
    endpoints: [
      {
        method: 'GET',
        path: '/api/certificate-test/baptism',
        description: 'Generate test baptism certificate with sample data',
      },
      {
        method: 'GET',
        path: '/api/certificate-test/marriage',
        description: 'Generate test marriage certificate with sample data',
      },
      {
        method: 'GET',
        path: '/api/certificate-test/coordinates/:type',
        description: 'View coordinate map for certificate type (baptism or marriage)',
      },
      {
        method: 'POST',
        path: '/api/certificate-test/baptism/custom',
        description: 'Test baptism certificate with custom record data and positions',
        body: {
          record: { first_name: 'John', last_name: 'Doe', /* ... */ },
          customPositions: { fullName: { x: 306, y: 520 }, /* ... */ },
          hiddenFields: ['birthplace', /* ... */],
        },
      },
      {
        method: 'POST',
        path: '/api/certificate-test/marriage/custom',
        description: 'Test marriage certificate with custom record data and positions',
        body: {
          record: { fname_groom: 'John', lname_groom: 'Doe', /* ... */ },
          customPositions: { groomName: { x: 306, y: 520 }, /* ... */ },
          hiddenFields: ['marriagePlace', /* ... */],
        },
      },
    ],
    notes: [
      'These endpoints use the new deterministic PDF generator',
      'PDF output is pixel-perfect and stable across machines',
      'Fonts are embedded (StandardFonts.TimesRoman)',
      'Coordinates are from coordinate-maps.js',
      'No HTML/Canvas involved - pure PDF primitives',
    ],
  });
});

module.exports = router;
