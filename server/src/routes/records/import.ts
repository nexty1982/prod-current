/**
 * Import API Routes for Sacrament Records
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { ImportService, ImportFormat, RecordType } from '../../modules/records/importService';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req: any, file, cb) => {
    const churchId = req.tenantId || req.user?.church_id || 'unknown';
    const uploadDir = path.join(__dirname, '../../../../uploads', String(churchId));
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: parseInt(process.env.IMPORT_MAX_BYTES || '52428800') // 50MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'application/json',
      'application/sql',
      'text/sql',
      'application/xml',
      'text/xml',
      'application/vnd.ms-excel'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: CSV, JSON, SQL, XML'));
    }
  }
});

/**
 * POST /api/records/import/upload
 * Upload a file and create an import job
 */
router.post('/api/records/import/upload', upload.single('file'), async (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const churchId = req.tenantId || req.user?.church_id;
    if (!churchId) {
      return res.status(403).json({ error: 'Church context required' });
    }

    const { type } = req.body;
    if (!['baptisms', 'marriages', 'funerals'].includes(type)) {
      return res.status(400).json({ error: 'Invalid record type' });
    }

    const format = ImportService.detectFormat(req.file.originalname, req.file.mimetype);

    // Create import job
    const jobId = await ImportService.createJob({
      church_id: churchId,
      type: type as RecordType,
      format,
      filename: req.file.originalname,
      size: req.file.size,
      status: 'pending',
      created_by: req.user?.id
    });

    // Store file metadata
    await ImportService.storeFile(
      jobId,
      req.file.path,
      req.file.originalname,
      req.file.mimetype
    );

    res.json({
      success: true,
      jobId,
      format,
      filename: req.file.originalname,
      size: req.file.size
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

/**
 * POST /api/records/import/preview
 * Parse file and return preview with field detection
 */
router.post('/api/records/import/preview', async (req: any, res: Response) => {
  try {
    const { jobId, limit = 100 } = req.body;
    
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID required' });
    }

    const churchId = req.tenantId || req.user?.church_id;
    if (!churchId) {
      return res.status(403).json({ error: 'Church context required' });
    }

    // Get job details
    const job = await ImportService.getJob(jobId);
    if (!job || job.church_id !== churchId) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get file path
    const uploadDir = path.join(__dirname, '../../../../uploads', String(churchId));
    const files = fs.readdirSync(uploadDir).filter(f => f.includes(String(jobId)));
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(uploadDir, files[0]);
    let preview: any[] = [];
    let detectedFields: string[] = [];

    // Parse based on format
    switch (job.format) {
      case 'csv':
        preview = await ImportService.parseCSVPreview(filePath, limit);
        break;
      case 'json':
        preview = await ImportService.parseJSONPreview(filePath, limit);
        break;
      case 'xml':
        preview = await ImportService.parseXMLPreview(filePath, limit);
        break;
      case 'sql':
        preview = await ImportService.parseSQLPreview(filePath, limit);
        break;
    }

    // Detect fields from first record
    if (preview.length > 0) {
      detectedFields = Object.keys(preview[0]);
    }

    // Suggest field mappings based on common patterns
    const suggestedMappings = suggestFieldMappings(job.type, detectedFields);

    res.json({
      success: true,
      jobId,
      type: job.type,
      format: job.format,
      detectedFields,
      suggestedMappings,
      preview: preview.slice(0, 10), // Return first 10 records
      totalPreviewRecords: preview.length
    });

  } catch (error: any) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message || 'Preview failed' });
  }
});

/**
 * POST /api/records/import/commit
 * Process the import with provided field mappings
 */
router.post('/api/records/import/commit', async (req: any, res: Response) => {
  try {
    const { jobId, mapping } = req.body;
    
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID required' });
    }

    const churchId = req.tenantId || req.user?.church_id;
    if (!churchId) {
      return res.status(403).json({ error: 'Church context required' });
    }

    // Get job details
    const job = await ImportService.getJob(jobId);
    if (!job || job.church_id !== churchId) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'pending') {
      return res.status(400).json({ error: 'Job already processed' });
    }

    // Get file path
    const uploadDir = path.join(__dirname, '../../../../uploads', String(churchId));
    const files = fs.readdirSync(uploadDir).filter(f => f.includes(String(jobId)));
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(uploadDir, files[0]);
    let records: any[] = [];

    // Parse entire file based on format
    switch (job.format) {
      case 'csv':
        records = await ImportService.parseCSVPreview(filePath, Number.MAX_SAFE_INTEGER);
        break;
      case 'json':
        records = await ImportService.parseJSONPreview(filePath, Number.MAX_SAFE_INTEGER);
        break;
      case 'xml':
        records = await ImportService.parseXMLPreview(filePath, Number.MAX_SAFE_INTEGER);
        break;
      case 'sql':
        records = await ImportService.parseSQLPreview(filePath, Number.MAX_SAFE_INTEGER);
        break;
    }

    // Start import process (async)
    ImportService.importRecords(jobId, churchId, job.type, records, mapping)
      .catch(error => {
        console.error('Import error:', error);
        ImportService.updateJob(jobId, {
          status: 'error',
          error_text: error.message
        });
      });

    res.json({
      success: true,
      message: 'Import started',
      jobId,
      totalRecords: records.length
    });

  } catch (error: any) {
    console.error('Commit error:', error);
    res.status(500).json({ error: error.message || 'Import failed' });
  }
});

/**
 * GET /api/records/import/status/:jobId
 * Get import job status
 */
router.get('/api/records/import/status/:jobId', async (req: any, res: Response) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const churchId = req.tenantId || req.user?.church_id;
    
    if (!churchId) {
      return res.status(403).json({ error: 'Church context required' });
    }

    const job = await ImportService.getJob(jobId);
    if (!job || job.church_id !== churchId) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      success: true,
      job
    });

  } catch (error: any) {
    console.error('Status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get status' });
  }
});

/**
 * GET /api/records/import/recent
 * Get recent import jobs
 */
router.get('/api/records/import/recent', async (req: any, res: Response) => {
  try {
    const churchId = req.tenantId || req.user?.church_id;
    
    if (!churchId) {
      return res.status(403).json({ error: 'Church context required' });
    }

    const jobs = await ImportService.getRecentJobs(churchId, 20);

    res.json({
      success: true,
      jobs
    });

  } catch (error: any) {
    console.error('Recent jobs error:', error);
    res.status(500).json({ error: error.message || 'Failed to get recent jobs' });
  }
});

/**
 * Suggest field mappings based on common patterns
 */
function suggestFieldMappings(type: RecordType, fields: string[]): any {
  const mappings: any = {};
  const fieldLower = fields.map(f => f.toLowerCase());

  if (type === 'baptisms') {
    fields.forEach((field, idx) => {
      const lower = fieldLower[idx];
      if (lower.includes('first') && lower.includes('name')) mappings[field] = 'first_name';
      else if (lower.includes('last') && lower.includes('name')) mappings[field] = 'last_name';
      else if (lower.includes('baptism') && lower.includes('date')) mappings[field] = 'baptism_date';
      else if (lower.includes('birth') && lower.includes('date')) mappings[field] = 'birth_date';
      else if (lower.includes('priest')) mappings[field] = 'priest_name';
      else if (lower.includes('sponsor') || lower.includes('godparent')) mappings[field] = 'sponsor_name';
      else if (lower.includes('parent')) mappings[field] = 'parents_names';
      else if (lower.includes('certificate')) mappings[field] = 'certificate_no';
      else if (lower.includes('book')) mappings[field] = 'book_no';
      else if (lower.includes('page')) mappings[field] = 'page_no';
      else if (lower.includes('entry')) mappings[field] = 'entry_no';
      else if (lower.includes('note')) mappings[field] = 'notes';
    });
  } else if (type === 'marriages') {
    fields.forEach((field, idx) => {
      const lower = fieldLower[idx];
      if (lower.includes('groom') && lower.includes('first')) mappings[field] = 'groom_first_name';
      else if (lower.includes('groom') && lower.includes('last')) mappings[field] = 'groom_last_name';
      else if (lower.includes('bride') && lower.includes('first')) mappings[field] = 'bride_first_name';
      else if (lower.includes('bride') && lower.includes('last')) mappings[field] = 'bride_last_name';
      else if (lower.includes('marriage') && lower.includes('date')) mappings[field] = 'marriage_date';
      else if (lower.includes('priest')) mappings[field] = 'priest_name';
      else if (lower.includes('witness')) mappings[field] = 'witnesses';
      else if (lower.includes('certificate')) mappings[field] = 'certificate_no';
      else if (lower.includes('book')) mappings[field] = 'book_no';
      else if (lower.includes('page')) mappings[field] = 'page_no';
      else if (lower.includes('entry')) mappings[field] = 'entry_no';
      else if (lower.includes('note')) mappings[field] = 'notes';
    });
  } else if (type === 'funerals') {
    fields.forEach((field, idx) => {
      const lower = fieldLower[idx];
      if (lower.includes('first') && lower.includes('name')) mappings[field] = 'first_name';
      else if (lower.includes('last') && lower.includes('name')) mappings[field] = 'last_name';
      else if (lower.includes('funeral') && lower.includes('date')) mappings[field] = 'funeral_date';
      else if (lower.includes('death') && lower.includes('date')) mappings[field] = 'death_date';
      else if (lower.includes('birth') && lower.includes('date')) mappings[field] = 'birth_date';
      else if (lower.includes('age')) mappings[field] = 'age_at_death';
      else if (lower.includes('priest')) mappings[field] = 'priest_name';
      else if (lower.includes('burial')) mappings[field] = 'burial_place';
      else if (lower.includes('certificate')) mappings[field] = 'certificate_no';
      else if (lower.includes('book')) mappings[field] = 'book_no';
      else if (lower.includes('page')) mappings[field] = 'page_no';
      else if (lower.includes('entry')) mappings[field] = 'entry_no';
      else if (lower.includes('note')) mappings[field] = 'notes';
    });
  }

  return mappings;
}

// GET /api/records/import/status/:jobId - Get import job status
router.get('/status/:jobId', requireAuth, async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const churchId = (req as any).user.church_id;

    if (!jobId || isNaN(jobId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid job ID'
      });
    }

    const pool = await getPool();
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
    ) as any;

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
  } catch (error: any) {
    console.error('Error getting import status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get import status'
    });
  }
});

export default router;
