const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { promisePool } = require('../config/db');
const { requireAuth } = require('../middleware/requireAuth');
const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../storage/feeder/uploads'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'), false);
    }
  }
});

// Helper: Get user and church from session
const getSessionContext = (req) => {
  // Auth middleware ensures req.session.user exists, but check for safety
  const user = req.session?.user || req.user;
  if (!user) {
    throw new Error('Authentication required');
  }
  const userId = user.id;
  const churchId = req.body.churchId || req.params.churchId || req.query.churchId || user.church_id;
  
  if (!churchId) {
    throw new Error('churchId is required');
  }
  
  return { userId, churchId: parseInt(churchId) };
};

// Ensure storage directories exist
const storageBase = path.join(__dirname, '../storage/feeder');
const uploadsDir = path.join(storageBase, 'uploads');
[storageBase, uploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper: Get church database name (schema-tolerant)
const getChurchDb = async (churchId) => {
  try {
    const [churches] = await promisePool.execute(
      'SELECT database_name FROM churches WHERE id = ?',
      [churchId]
    );
    if (churches.length === 0) {
      throw new Error(`Church ${churchId} not found`);
    }
    return churches[0].database_name || `om_church_${churchId}`;
  } catch (error) {
    // Fallback to default pattern
    return `om_church_${churchId}`;
  }
};

// Helper: Schema-tolerant query execution
const executeQuery = async (query, params, churchDb = null) => {
  if (churchDb) {
    // Use church-specific database
    const db = require('../config/db');
    const [rows] = await db.promisePool.execute(
      query.replace(/FROM\s+(\w+)/gi, `FROM ${churchDb}.$1`).replace(/INTO\s+(\w+)/gi, `INTO ${churchDb}.$1`)
    , params);
    return rows;
  }
  const [rows] = await promisePool.execute(query, params);
  return rows;
};

// POST /api/feeder/ingest
// Creates a new feeder job and pages from uploaded files or file paths
router.post('/ingest', upload.array('files', 50), async (req, res) => {
  try {
    const { userId, churchId } = getSessionContext(req);
    const { sourceType = 'upload', recordType, options = {} } = req.body;
    
    // Get files from upload or file paths
    const files = req.files || [];
    const filePaths = req.body.filePaths ? JSON.parse(req.body.filePaths) : [];
    
    if (files.length === 0 && filePaths.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }
    
    const churchDb = await getChurchDb(churchId);
    const storageBase = path.join(__dirname, '../storage/feeder');
    
    // Create job
    const [jobResult] = await promisePool.execute(
      `INSERT INTO ocr_feeder_jobs 
       (church_id, source_type, status, created_by, options_json, stats_json)
       VALUES (?, ?, 'queued', ?, ?, ?)`,
      [
        churchId,
        sourceType,
        userId,
        JSON.stringify(options),
        JSON.stringify({ totalPages: files.length + filePaths.length, processedPages: 0 })
      ]
    );
    const jobId = jobResult.insertId;
    
    // Create storage directory for job
    const jobDir = path.join(storageBase, `job_${jobId}`);
    fs.mkdirSync(jobDir, { recursive: true });
    
    // Create pages
    const pageInserts = [];
    let pageIndex = 0;
    
    // Process uploaded files
    for (const file of files) {
      const pageDir = path.join(jobDir, `page_${pageIndex}`);
      fs.mkdirSync(pageDir, { recursive: true });
      
      const finalPath = path.join(pageDir, file.originalname);
      fs.renameSync(file.path, finalPath);
      
      pageInserts.push([
        jobId,
        pageIndex,
        'queued',
        finalPath,
        null, // preproc_path
        null, // thumb_path
        0,    // rotation
        null, // dpi
        null, // bbox_crop_json
        null, // quality_score
        null, // ocr_confidence
        0,    // retry_count
        null  // last_error
      ]);
      pageIndex++;
    }
    
    // Process file paths
    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) {
        console.warn(`File path does not exist: ${filePath}`);
        continue;
      }
      
      const pageDir = path.join(jobDir, `page_${pageIndex}`);
      fs.mkdirSync(pageDir, { recursive: true });
      
      const fileName = path.basename(filePath);
      const destPath = path.join(pageDir, fileName);
      fs.copyFileSync(filePath, destPath);
      
      pageInserts.push([
        jobId,
        pageIndex,
        'queued',
        destPath,
        null, null, 0, null, null, null, null, 0, null
      ]);
      pageIndex++;
    }
    
    if (pageInserts.length > 0) {
      await promisePool.execute(
        `INSERT INTO ocr_feeder_pages 
         (job_id, page_index, status, input_path, preproc_path, thumb_path, 
          rotation, dpi, bbox_crop_json, quality_score, ocr_confidence, retry_count, last_error)
         VALUES ?`,
        [pageInserts]
      );
    }
    
    res.json({ success: true, jobId });
  } catch (error) {
    console.error('Feeder ingest error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/feeder/jobs/:jobId
// Returns job details with page counts and status summary
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const { userId, churchId } = getSessionContext(req);
    const jobId = parseInt(req.params.jobId);
    
    // Get job
    const [jobs] = await promisePool.execute(
      `SELECT * FROM ocr_feeder_jobs WHERE id = ? AND church_id = ?`,
      [jobId, churchId]
    );
    
    if (jobs.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const job = jobs[0];
    
    // Get page counts by status
    const [pageStats] = await promisePool.execute(
      `SELECT status, COUNT(*) as count 
       FROM ocr_feeder_pages 
       WHERE job_id = ? 
       GROUP BY status`,
      [jobId]
    );
    
    // Get total pages
    const [totalResult] = await promisePool.execute(
      `SELECT COUNT(*) as total FROM ocr_feeder_pages WHERE job_id = ?`,
      [jobId]
    );
    
    const stats = {
      ...job,
      pageStats: pageStats.reduce((acc, stat) => {
        acc[stat.status] = stat.count;
        return acc;
      }, {}),
      totalPages: totalResult[0].total
    };
    
    res.json({ success: true, job: stats });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/feeder/pages/:pageId
// Returns page details with artifact list
router.get('/pages/:pageId', async (req, res) => {
  try {
    const { userId, churchId } = getSessionContext(req);
    const pageId = parseInt(req.params.pageId);
    
    // Get page (with job to verify church access)
    const [pages] = await promisePool.execute(
      `SELECT p.*, j.church_id 
       FROM ocr_feeder_pages p
       INNER JOIN ocr_feeder_jobs j ON p.job_id = j.id
       WHERE p.id = ? AND j.church_id = ?`,
      [pageId, churchId]
    );
    
    if (pages.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    const page = pages[0];
    
    // Get artifacts
    const [artifacts] = await promisePool.execute(
      `SELECT id, type, storage_path, json_blob, meta_json, created_at
       FROM ocr_feeder_artifacts 
       WHERE page_id = ?
       ORDER BY created_at DESC`,
      [pageId]
    );
    
    res.json({
      success: true,
      page: {
        ...page,
        artifacts: artifacts.map(a => ({
          id: a.id,
          type: a.type,
          storagePath: a.storage_path,
          jsonBlob: a.json_blob ? JSON.parse(a.json_blob) : null,
          metaJson: a.meta_json ? JSON.parse(a.meta_json) : null,
          createdAt: a.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Get page error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/feeder/pages/:pageId/retry
// Resets page status to queued and increments retry count (bounded to 2)
router.post('/pages/:pageId/retry', async (req, res) => {
  try {
    const { userId, churchId } = getSessionContext(req);
    const pageId = parseInt(req.params.pageId);
    
    // Verify page belongs to church
    const [pages] = await promisePool.execute(
      `SELECT p.*, j.church_id 
       FROM ocr_feeder_pages p
       INNER JOIN ocr_feeder_jobs j ON p.job_id = j.id
       WHERE p.id = ? AND j.church_id = ?`,
      [pageId, churchId]
    );
    
    if (pages.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    const page = pages[0];
    
    if (page.retry_count >= 2) {
      return res.status(400).json({ error: 'Maximum retry count reached' });
    }
    
    // Reset to queued and increment retry count
    await promisePool.execute(
      `UPDATE ocr_feeder_pages 
       SET status = 'queued', retry_count = retry_count + 1, last_error = NULL, updated_at = NOW()
       WHERE id = ?`,
      [pageId]
    );
    
    res.json({ success: true, message: 'Page queued for retry' });
  } catch (error) {
    console.error('Retry page error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/feeder/pages/:pageId/correction (optional phase 3)
// Stores correction diff and updates correction memory
router.post('/pages/:pageId/correction', async (req, res) => {
  try {
    const { userId, churchId } = getSessionContext(req);
    const pageId = parseInt(req.params.pageId);
    const { recordType, before, after, notes, templateKey } = req.body;
    
    if (!recordType || !after) {
      return res.status(400).json({ error: 'recordType and after are required' });
    }
    
    // Verify page belongs to church
    const [pages] = await promisePool.execute(
      `SELECT p.*, j.church_id 
       FROM ocr_feeder_pages p
       INNER JOIN ocr_feeder_jobs j ON p.job_id = j.id
       WHERE p.id = ? AND j.church_id = ?`,
      [pageId, churchId]
    );
    
    if (pages.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    // Store correction as artifact
    const correctionArtifact = {
      recordType,
      before,
      after,
      notes,
      correctedBy: userId,
      correctedAt: new Date().toISOString()
    };
    
    const artifactPath = path.join(
      __dirname,
      `../storage/feeder/job_${pages[0].job_id}/page_${pages[0].page_index}/correction_${Date.now()}.json`
    );
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.writeFileSync(artifactPath, JSON.stringify(correctionArtifact, null, 2));
    
    await promisePool.execute(
      `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, json_blob, meta_json)
       VALUES (?, 'correction', ?, ?, ?)`,
      [
        pageId,
        artifactPath,
        JSON.stringify(correctionArtifact),
        JSON.stringify({ templateKey, recordType })
      ]
    );
    
    // Update correction memory if templateKey provided
    if (templateKey) {
      const key = templateKey || `default_${recordType}`;
      
      // Get existing memory or create new
      const [existing] = await promisePool.execute(
        `SELECT * FROM ocr_correction_memory 
         WHERE church_id = ? AND record_type = ? AND template_key = ?`,
        [churchId, recordType, key]
      );
      
      const examples = existing.length > 0 
        ? JSON.parse(existing[0].examples_json || '[]')
        : [];
      
      examples.push({
        before: before?.rawText || before?.fields,
        after: after.fields,
        correctedAt: new Date().toISOString()
      });
      
      // Keep only last 10 examples
      if (examples.length > 10) {
        examples.shift();
      }
      
      await promisePool.execute(
        `INSERT INTO ocr_correction_memory 
         (church_id, record_type, template_key, value_json, examples_json)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           value_json = VALUES(value_json),
           examples_json = VALUES(examples_json),
           updated_at = NOW()`,
        [churchId, recordType, key, JSON.stringify(after.fields), JSON.stringify(examples)]
      );
    }
    
    res.json({ success: true, message: 'Correction saved' });
  } catch (error) {
    console.error('Correction error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

