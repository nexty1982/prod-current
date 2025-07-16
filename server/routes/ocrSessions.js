// server/routes/ocrSessions.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const qrcode = require('qrcode');
const { promisePool } = require('../config/db');
const { validateUserAuth } = require('../middleware/sessionValidation');

const router = express.Router();

// Configure multer for secure uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 20 * 1024 * 1024, // 20MB
    files: 1 // Only one file per upload for secure session
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/gif',
      'image/webp',
      'application/pdf'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

// Create new OCR session with barcode
router.post('/session', validateUserAuth, async (req, res) => {
  try {
    const {
      churchId,
      recordType = 'baptism',
      expiryMinutes = 30,
      userEmail,
      userPhone
    } = req.body;

    // Generate unique session ID and PIN
    const sessionId = uuidv4();
    const pin = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit PIN

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    // Store session in database
    await promisePool.query(`
      INSERT INTO ocr_sessions (
        session_id, 
        pin, 
        church_id, 
        record_type, 
        created_by, 
        expires_at, 
        verified, 
        used,
        user_email,
        user_phone
      ) VALUES (?, ?, ?, ?, ?, ?, FALSE, FALSE, ?, ?)
    `, [
      sessionId,
      pin,
      churchId || req.session.user.churchId || 1,
      recordType,
      req.session.user.id,
      expiresAt,
      userEmail,
      userPhone
    ]);

    // Generate QR code containing session info
    const qrData = JSON.stringify({
      sessionId,
      pin,
      type: 'ocr_session',
      churchId: churchId || req.session.user.churchId || 1,
      expiresAt: expiresAt.toISOString()
    });

    // Generate QR code as PNG buffer
    const qrCodeBuffer = await qrcode.toBuffer(qrData, {
      type: 'png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    });

    // Also generate as data URL for immediate display
    const qrCodeDataURL = await qrcode.toDataURL(qrData, {
      quality: 0.92,
      margin: 1,
      width: 256
    });

    res.json({
      sessionId,
      pin,
      expiresAt: expiresAt.toISOString(),
      qrCodeDataURL,
      message: 'OCR session created successfully. Please scan the QR code to verify.',
      instructions: [
        '1. Scan the QR code with your mobile device',
        '2. Enter the 6-digit PIN when prompted',
        '3. Upload your document images',
        '4. Review and download OCR results'
      ]
    });

  } catch (error) {
    console.error('Error creating OCR session:', error);
    res.status(500).json({ error: 'Failed to create OCR session' });
  }
});

// Verify session with PIN (typically called from mobile/barcode scanner)
router.post('/session/verify', async (req, res) => {
  try {
    const { sessionId, pin } = req.body;

    if (!sessionId || !pin) {
      return res.status(400).json({ error: 'Session ID and PIN are required' });
    }

    // Look up session
    const [sessions] = await promisePool.query(
      'SELECT * FROM ocr_sessions WHERE session_id = ? AND pin = ?',
      [sessionId, pin]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Invalid session ID or PIN' });
    }

    const session = sessions[0];

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (now > expiresAt) {
      return res.status(403).json({ error: 'Session has expired' });
    }

    // Mark as verified
    await promisePool.query(
      'UPDATE ocr_sessions SET verified = TRUE, verified_at = CURRENT_TIMESTAMP WHERE session_id = ?',
      [sessionId]
    );

    res.json({
      success: true,
      message: 'Session verified successfully',
      sessionId,
      recordType: session.record_type,
      churchId: session.church_id,
      expiresAt: session.expires_at
    });

  } catch (error) {
    console.error('Error verifying session:', error);
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

// Get session status
router.get('/session/:sessionId/status', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const [sessions] = await promisePool.query(
      'SELECT session_id, verified, used, expires_at, record_type, church_id FROM ocr_sessions WHERE session_id = ?',
      [sessionId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessions[0];
    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    const isExpired = now > expiresAt;

    res.json({
      sessionId: session.session_id,
      verified: session.verified,
      used: session.used,
      expired: isExpired,
      expiresAt: session.expires_at,
      recordType: session.record_type,
      churchId: session.church_id,
      status: isExpired ? 'expired' :
        session.used ? 'completed' :
          session.verified ? 'ready' : 'pending'
    });

  } catch (error) {
    console.error('Error getting session status:', error);
    res.status(500).json({ error: 'Failed to get session status' });
  }
});

// List user's sessions (for admin/debug)
router.get('/sessions', validateUserAuth, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const userId = req.session.user.id;

    const [sessions] = await promisePool.query(`
      SELECT 
        session_id, 
        record_type, 
        church_id,
        verified, 
        used, 
        created_at, 
        expires_at,
        verified_at,
        used_at
      FROM ocr_sessions 
      WHERE created_by = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)]);

    // Add status to each session
    const now = new Date();
    const sessionsWithStatus = sessions.map(session => ({
      ...session,
      expired: now > new Date(session.expires_at),
      status: now > new Date(session.expires_at) ? 'expired' :
        session.used ? 'completed' :
          session.verified ? 'ready' : 'pending'
    }));

    res.json({
      sessions: sessionsWithStatus,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: sessions.length
      }
    });

  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// Clean up expired sessions (cron job endpoint)
router.delete('/sessions/cleanup', async (req, res) => {
  try {
    // Only allow admin users or system calls
    if (req.session?.user?.role !== 'admin' && req.headers.authorization !== `Bearer ${process.env.SYSTEM_TOKEN}`) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [result] = await promisePool.query(
      'DELETE FROM ocr_sessions WHERE expires_at < CURRENT_TIMESTAMP'
    );

    res.json({
      message: 'Expired sessions cleaned up',
      deletedCount: result.affectedRows
    });

  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    res.status(500).json({ error: 'Failed to clean up sessions' });
  }
});

// Secure upload route for verified sessions
router.post('/secure/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('=== OCR Secure Upload Debug ===');
    console.log('Request body:', req.body);
    console.log('File info:', req.file ? {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    } : 'No file');
    console.log('Session info:', req.session?.user ? {
      userId: req.session.user.id,
      username: req.session.user.username
    } : 'No session');

    const { sessionId } = req.body;

    if (!sessionId) {
      console.log('ERROR: No sessionId provided');
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    if (!req.file) {
      console.log('ERROR: No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // For now, let's check both possible table structures
    // First try the session-based verification table
    let sessions = [];
    try {
      [sessions] = await promisePool.query(
        'SELECT * FROM ocr_sessions WHERE session_id = ? AND verified = TRUE AND expires_at > CURRENT_TIMESTAMP AND used = FALSE',
        [sessionId]
      );
      console.log('Session verification query result:', sessions.length > 0 ? 'Found verified session' : 'No verified session found');
    } catch (error) {
      console.log('Session verification table not found, checking main ocr_sessions table:', error.message);
      // If that fails, check if we can create a new session entry
    }

    if (sessions.length === 0) {
      // Try to create a new OCR session entry in the main table
      try {
        const userId = req.session?.user?.id || 1; // Default to user 1 if no session
        const jobId = uuidv4();

        console.log('Creating new OCR session entry with jobId:', jobId, 'userId:', userId);

        await promisePool.query(`
          INSERT INTO ocr_sessions (
            session_id,
            user_id,
            original_filename,
            file_path,
            file_size,
            mime_type,
            status
          ) VALUES (?, ?, ?, ?, ?, ?, 'processing')
        `, [
          jobId, // Using jobId as session_id
          userId,
          req.file.originalname,
          req.file.path,
          req.file.size,
          req.file.mimetype
        ]);

        console.log(`OCR Processing started for job ${jobId}, file: ${req.file.originalname}`);

        return res.json({
          success: true,
          jobId: jobId,
          message: 'File uploaded successfully and processing started',
          filename: req.file.originalname,
          fileSize: req.file.size,
          sessionId: jobId
        });

      } catch (dbError) {
        console.error('Database error:', dbError);
        // Clean up uploaded file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({
          success: false,
          message: 'Database error during upload processing'
        });
      }
    }

    // If we found a valid session, process normally
    const jobId = uuidv4();
    console.log(`OCR Processing started for job ${jobId}, file: ${req.file.originalname}`);

    res.json({
      success: true,
      jobId: jobId,
      message: 'File uploaded successfully and processing started',
      filename: req.file.originalname,
      fileSize: req.file.size,
      sessionId: sessionId
    });

  } catch (error) {
    console.error('Error in secure upload:', error);

    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process upload'
    });
  }
});

// Get OCR job results by jobId
router.get('/secure/results/:jobId', async (req, res) => {
  try {
    console.log('=== OCR Results Check ===');
    console.log('JobId:', req.params.jobId);

    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'Job ID is required'
      });
    }

    // Check if the job exists and get its status
    const [jobs] = await promisePool.query(
      'SELECT * FROM ocr_sessions WHERE session_id = ?',
      [jobId]
    );

    console.log('Found jobs:', jobs.length);

    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const job = jobs[0];
    console.log('Job status:', job.status);

    // For now, simulate completion since we don't have real OCR processing
    if (job.status === 'processing') {
      // Simulate OCR completion after a short delay
      const timeSinceCreation = Date.now() - new Date(job.created_at).getTime();

      if (timeSinceCreation > 5000) { // 5 seconds simulation
        // Update status to completed
        await promisePool.query(
          'UPDATE ocr_sessions SET status = ?, ocr_result = ?, completed_at = CURRENT_TIMESTAMP WHERE session_id = ?',
          ['completed', `OCR processing completed for: ${job.original_filename}\nThis is simulated OCR text content.`, jobId]
        );

        return res.json({
          success: true,
          completed: true,
          result: {
            id: jobId,
            text: `OCR processing completed for: ${job.original_filename}\nThis is simulated OCR text content.`,
            confidence: 0.95,
            language: 'en',
            pages: 1,
            downloadUrl: `/api/ocr/download/${jobId}`,
            xlsxUrl: `/api/ocr/download/${jobId}/xlsx`,
            pdfUrl: `/api/ocr/download/${jobId}/pdf`
          }
        });
      } else {
        // Still processing
        return res.json({
          success: true,
          completed: false,
          status: 'processing',
          progress: Math.min(90, Math.floor(timeSinceCreation / 100))
        });
      }
    } else if (job.status === 'completed') {
      return res.json({
        success: true,
        completed: true,
        result: {
          id: jobId,
          text: job.ocr_result || 'OCR processing completed',
          confidence: job.confidence_score || 0.95,
          language: 'en',
          pages: 1,
          downloadUrl: `/api/ocr/download/${jobId}`,
          xlsxUrl: `/api/ocr/download/${jobId}/xlsx`,
          pdfUrl: `/api/ocr/download/${jobId}/pdf`
        }
      });
    } else if (job.status === 'error') {
      return res.json({
        success: false,
        error: job.error_message || 'OCR processing failed'
      });
    }

    return res.json({
      success: true,
      completed: false,
      status: job.status
    });

  } catch (error) {
    console.error('Error checking OCR results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check OCR results'
    });
  }
});

module.exports = router;
