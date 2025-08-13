// JavaScript wrapper for TypeScript import routes
const express = require('express');
const router = express.Router();

// Import the compiled TypeScript routes
let importRoutes;
try {
  // Try to load compiled TypeScript routes
  importRoutes = require('../dist/routes/records/import').default;
  console.log('✅ Loaded compiled TypeScript import routes');
} catch (error) {
  console.log('⚠️ TypeScript import routes not compiled, using fallback implementation');
  
  // Fallback implementation for development
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs').promises;
  const crypto = require('crypto');
  const { getAppPool } = require('../config/db');
  
  // Configure multer for file uploads
  const upload = multer({
    dest: path.join(__dirname, '../../uploads/imports/'),
    limits: { fileSize: 52428800 }, // 50MB
    fileFilter: (req, file, cb) => {
      const allowedExts = ['.csv', '.json', '.xml', '.sql'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedExts.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type'));
      }
    }
  });

  // Middleware to check authentication
  const requireAuth = (req, res, next) => {
    if (!req.session?.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    next();
  };

  // POST /api/records/import/upload
  router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const { type } = req.body;
      const churchId = req.session.user.church_id || 1; // Default to church 1 if not set
      
      if (!['baptisms', 'marriages', 'funerals'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid record type'
        });
      }

      // Calculate file hash
      const fileBuffer = await fs.readFile(req.file.path);
      const hash = crypto.createHash('sha1').update(fileBuffer).digest('hex');
      
      // Detect format from extension
      const ext = path.extname(req.file.originalname).toLowerCase();
      const formatMap = {
        '.csv': 'csv',
        '.json': 'json',
        '.xml': 'xml',
        '.sql': 'sql'
      };
      const format = formatMap[ext] || 'csv';

      // Create import job
      const pool = await getAppPool();
      const [result] = await pool.execute(
        `INSERT INTO import_jobs (
          church_id, type, format, filename, size_bytes, 
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
        [churchId, type, format, req.file.originalname, req.file.size]
      );

      const jobId = result.insertId;

      // Store file info
      await pool.execute(
        `INSERT INTO import_files (
          job_id, storage_path, original_name, mime_type, sha1_hash, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())`,
        [jobId, req.file.path, req.file.originalname, req.file.mimetype, hash]
      );

      res.json({
        success: true,
        jobId,
        message: 'File uploaded successfully'
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Upload failed'
      });
    }
  });

  // POST /api/records/import/preview
  router.post('/preview', requireAuth, async (req, res) => {
    try {
      const { jobId, limit = 10 } = req.body;
      const churchId = req.session.user.church_id || 1;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          error: 'Job ID required'
        });
      }

      const pool = await getAppPool();
      
      // Get job and file info
      const [jobs] = await pool.execute(
        `SELECT j.*, f.storage_path 
         FROM import_jobs j
         JOIN import_files f ON j.id = f.job_id
         WHERE j.id = ? AND j.church_id = ?`,
        [jobId, churchId]
      );

      if (jobs.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Import job not found'
        });
      }

      const job = jobs[0];
      const fileContent = await fs.readFile(job.storage_path, 'utf-8');
      
      let preview = [];
      let detectedFields = [];
      let suggestedMappings = {};

      // Parse based on format
      if (job.format === 'json') {
        const data = JSON.parse(fileContent);
        const records = Array.isArray(data) ? data : data.records || [data];
        preview = records.slice(0, limit);
        if (preview.length > 0) {
          detectedFields = Object.keys(preview[0]);
        }
      } else if (job.format === 'csv') {
        const lines = fileContent.split('\n').filter(l => l.trim());
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          detectedFields = headers;
          
          for (let i = 1; i < Math.min(lines.length, limit + 1); i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const record = {};
            headers.forEach((h, idx) => {
              record[h] = values[idx] || '';
            });
            preview.push(record);
          }
        }
      }

      // Suggest field mappings
      const fieldMap = {
        'first_name': ['first_name', 'firstname', 'fname', 'given_name'],
        'last_name': ['last_name', 'lastname', 'lname', 'surname', 'family_name'],
        'baptism_date': ['baptism_date', 'date_baptized', 'baptized', 'date'],
        'marriage_date': ['marriage_date', 'date_married', 'married', 'date'],
        'funeral_date': ['funeral_date', 'date_funeral', 'burial_date', 'date'],
        'priest_name': ['priest_name', 'priest', 'clergy', 'officiant'],
        'notes': ['notes', 'comments', 'remarks', 'note']
      };

      detectedFields.forEach(field => {
        const lowerField = field.toLowerCase();
        for (const [canonical, variations] of Object.entries(fieldMap)) {
          if (variations.some(v => lowerField.includes(v))) {
            suggestedMappings[field] = canonical;
            break;
          }
        }
      });

      res.json({
        success: true,
        preview,
        detectedFields,
        suggestedMappings,
        totalRecords: job.format === 'csv' ? 
          fileContent.split('\n').filter(l => l.trim()).length - 1 : 
          preview.length
      });
    } catch (error) {
      console.error('Preview error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Preview failed'
      });
    }
  });

  // POST /api/records/import/commit
  router.post('/commit', requireAuth, async (req, res) => {
    try {
      const { jobId, mapping } = req.body;
      const churchId = req.session.user.church_id || 1;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          error: 'Job ID required'
        });
      }

      const pool = await getAppPool();
      
      // Update job status to running
      await pool.execute(
        `UPDATE import_jobs 
         SET status = 'running', started_at = NOW() 
         WHERE id = ? AND church_id = ?`,
        [jobId, churchId]
      );

      // Process import asynchronously
      processImport(jobId, mapping, churchId).catch(error => {
        console.error('Import processing error:', error);
        pool.execute(
          `UPDATE import_jobs 
           SET status = 'error', error_text = ?, finished_at = NOW() 
           WHERE id = ?`,
          [error.message, jobId]
        );
      });

      res.json({
        success: true,
        message: 'Import started',
        jobId
      });
    } catch (error) {
      console.error('Commit error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to start import'
      });
    }
  });

  // GET /api/records/import/status/:jobId
  router.get('/status/:jobId', requireAuth, async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const churchId = req.session.user.church_id || 1;

      if (!jobId || isNaN(jobId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid job ID'
        });
      }

      const pool = await getAppPool();
      const [jobs] = await pool.execute(
        `SELECT 
          id, church_id, type, format, filename, size_bytes,
          status, total_rows, processed_rows, imported_rows as inserted_rows,
          skipped_rows, 
          COALESCE(imported_rows - skipped_rows, 0) as updated_rows,
          0 as error_rows,
          error_text, started_at, finished_at,
          created_at, updated_at
        FROM import_jobs 
        WHERE id = ? AND church_id = ?`,
        [jobId, churchId]
      );

      if (jobs.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Import job not found'
        });
      }

      res.json({
        success: true,
        job: jobs[0]
      });
    } catch (error) {
      console.error('Status error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get status'
      });
    }
  });

  // Async import processor
  async function processImport(jobId, mapping, churchId) {
    const pool = await getAppPool();
    
    try {
      // Get job and file info
      const [jobs] = await pool.execute(
        `SELECT j.*, f.storage_path 
         FROM import_jobs j
         JOIN import_files f ON j.id = f.job_id
         WHERE j.id = ?`,
        [jobId]
      );

      if (jobs.length === 0) {
        throw new Error('Job not found');
      }

      const job = jobs[0];
      const fileContent = await fs.readFile(job.storage_path, 'utf-8');
      
      let records = [];
      
      // Parse file based on format
      if (job.format === 'json') {
        const data = JSON.parse(fileContent);
        records = Array.isArray(data) ? data : data.records || [data];
      } else if (job.format === 'csv') {
        const lines = fileContent.split('\n').filter(l => l.trim());
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const record = {};
            headers.forEach((h, idx) => {
              record[h] = values[idx] || '';
            });
            records.push(record);
          }
        }
      }

      // Update total rows
      await pool.execute(
        `UPDATE import_jobs SET total_rows = ? WHERE id = ?`,
        [records.length, jobId]
      );

      let imported = 0;
      let skipped = 0;
      let processed = 0;

      // Process each record
      for (const record of records) {
        try {
          // Map fields
          const mappedRecord = {};
          if (mapping) {
            for (const [source, target] of Object.entries(mapping)) {
              if (target && record[source] !== undefined) {
                mappedRecord[target] = record[source];
              }
            }
          } else {
            Object.assign(mappedRecord, record);
          }

          // Insert based on type
          const table = job.type === 'baptisms' ? 'baptism_records' :
                       job.type === 'marriages' ? 'marriage_records' :
                       'funeral_records';

          // Build insert query dynamically
          const fields = Object.keys(mappedRecord);
          const values = Object.values(mappedRecord);
          
          // Add church_id
          fields.push('church_id');
          values.push(churchId);

          // Generate source hash for deduplication
          const sourceHash = crypto.createHash('sha1')
            .update(JSON.stringify(mappedRecord))
            .digest('hex');
          
          fields.push('source_hash');
          values.push(sourceHash);

          const placeholders = fields.map(() => '?').join(', ');
          const fieldList = fields.join(', ');
          
          const [result] = await pool.execute(
            `INSERT INTO ${table} (${fieldList}) VALUES (${placeholders})
             ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
            values
          );

          if (result.affectedRows > 0) {
            imported++;
          } else {
            skipped++;
          }
        } catch (error) {
          console.error('Record import error:', error);
          skipped++;
        }

        processed++;

        // Update progress every 10 records
        if (processed % 10 === 0) {
          await pool.execute(
            `UPDATE import_jobs 
             SET processed_rows = ?, imported_rows = ?, skipped_rows = ?
             WHERE id = ?`,
            [processed, imported, skipped, jobId]
          );
        }
      }

      // Final update
      await pool.execute(
        `UPDATE import_jobs 
         SET status = 'done', processed_rows = ?, imported_rows = ?, 
             skipped_rows = ?, finished_at = NOW()
         WHERE id = ?`,
        [processed, imported, skipped, jobId]
      );

    } catch (error) {
      console.error('Import processing error:', error);
      await pool.execute(
        `UPDATE import_jobs 
         SET status = 'error', error_text = ?, finished_at = NOW()
         WHERE id = ?`,
        [error.message, jobId]
      );
      throw error;
    }
  }

  importRoutes = router;
}

// Mount the routes
if (importRoutes) {
  router.use('/', importRoutes);
}

module.exports = router;
