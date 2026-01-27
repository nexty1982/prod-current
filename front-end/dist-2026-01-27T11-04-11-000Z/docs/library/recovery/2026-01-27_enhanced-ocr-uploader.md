# Enhanced OCR Uploader - Complete Documentation
**Date:** December 19, 2025  
**Feature:** Enhanced OCR Uploader (om-ocr)  
**Location:** `front-end/src/features/devel-tools/om-ocr/*` and `server/*`

---

## Table of Contents

1. [Overview](#overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Source Code](#source-code)
5. [API Endpoints](#api-endpoints)
6. [Database Schema](#database-schema)
7. [Workflow](#workflow)
8. [Key Features](#key-features)

---

## Overview

The Enhanced OCR Uploader is a production-ready system for digitizing Orthodox Church sacramental records (baptism, marriage, funeral) using Optical Character Recognition (OCR). It provides:

- **Batch image uploads** with progress tracking
- **Multi-record detection** from scanned pages
- **Interactive field mapping** with bounding box visualization
- **Fusion workflow** for structured data extraction
- **Review & Finalize** process before database commit
- **Google Vision AI** integration for OCR processing
- **Image preprocessing** (deskew, grayscale, noise reduction)

---

## Frontend Architecture

### Component Structure

```
front-end/src/features/devel-tools/om-ocr/
├── EnhancedOCRUploader.tsx          # Main uploader component
├── components/
│   ├── EditableBBox.tsx             # Interactive bounding box editor
│   ├── FusionOverlay.tsx            # Bounding box overlay renderer
│   ├── FusionTab.tsx                # 4-step Fusion workflow
│   ├── InspectionPanel.tsx          # Image + OCR results viewer
│   ├── MappingTab.tsx               # Manual field mapping UI
│   ├── ProcessedImagesTable.tsx     # Jobs list with blur-to-reveal
│   ├── RecordSchemaInfoPopover.tsx  # Schema preview popover
│   └── ReviewFinalizeTab.tsx       # Review & commit workflow
├── hooks/
│   └── useOcrJobs.ts                # OCR jobs lifecycle hook
├── types/
│   ├── fusion.ts                    # Fusion workflow types
│   └── ocrJob.ts                    # OCR job types
├── utils/
│   └── visionParser.ts              # Vision JSON parsing & entry detection
└── config/
    └── defaultRecordColumns.ts      # Database column definitions
```

### Key Frontend Concepts

#### 1. **UploadFile Interface**
Tracks client-side file state during upload:
```typescript
interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  recordType: 'baptism' | 'marriage' | 'funeral';
  status: 'queued' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
  thumbnail?: string;
  jobId?: string; // Backend job ID after upload
}
```

#### 2. **Fusion Workflow (4 Steps)**
1. **Detect Entries**: Segment multi-record images into individual record cards
2. **Anchor Labels**: Identify form labels (e.g., "NAME OF CHILD", "DATE OF BIRTH")
3. **Map Fields**: Extract values and map to database fields
4. **Save & Commit**: Save drafts, validate, and commit to database

#### 3. **Bounding Box (BBox) System**
- **Vision Coordinates**: Original image dimensions from Google Vision API
- **Screen Coordinates**: Rendered image dimensions in the browser
- **Conversion**: `visionToScreenBBox()` scales coordinates for overlay rendering

#### 4. **Sticky Defaults**
User preference stored in `localStorage` to restrict field mapping to default database columns:
```typescript
const stickyDefaults = {
  baptism: boolean,
  marriage: boolean,
  funeral: boolean
};
```

---

## Backend Architecture

### Server Structure

```
server/
├── routes/
│   └── ocr.js                      # Main OCR routes
├── controllers/
│   ├── ocrController.js            # Legacy OCR session management
│   ├── churchOcrController.js     # Church-specific OCR operations
│   └── OcrAdminTestController.js  # SuperAdmin testing endpoints
├── types/
│   ├── ocrTypes.ts                 # TypeScript type definitions
│   └── ocrUtils.ts                 # Utility functions
└── src/
    ├── index.ts                    # Fusion & review endpoints
    └── ocr-endpoints-reference.ts  # Endpoint reference documentation
```

### Key Backend Concepts

#### 1. **Dynamic Schema Handling**
The backend handles varying database schemas across church databases:
- Checks for column existence using `SHOW COLUMNS FROM ...`
- Uses `COALESCE` and conditional logic for missing columns
- Creates tables/columns if they don't exist (`CREATE TABLE IF NOT EXISTS`)

#### 2. **Church Database Routing**
- Each church has its own database: `om_church_##`
- Files stored in: `/var/www/orthodoxmetrics/prod/uploads/om_church_##/`
- Database connection via `dbSwitcher` utility

#### 3. **OCR Processing Pipeline**
1. Upload → `uploads/ocr/temp/`
2. Move to church directory → `uploads/om_church_##/uploaded/`
3. Process with Google Vision AI
4. Move to processed → `uploads/om_church_##/processed/`
5. Update `ocr_jobs` table

---

## Source Code

### Frontend: EnhancedOCRUploader.tsx

```typescript
/**
 * Enhanced OCR Record Uploader
 * Production-ready interface for Orthodox Church sacramental record digitization
 * 
 * Features:
 * - Batch image uploads with progress tracking
 * - SuperAdmin church database selector
 * - Individual and batch progress indicators
 * - Advanced OCR options
 * - Error handling with retry capability
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Switch,
  FormControlLabel,
  Collapse,
  Divider,
  alpha,
  useTheme
} from '@mui/material';
import {
  IconUpload,
  IconX,
  IconRefresh,
  IconCheck,
  IconAlertCircle,
  IconPlayerPlay,
  IconPlayerPause,
  IconTrash,
  IconChevronDown,
  IconChevronUp,
  IconSettings,
  IconDatabase,
  IconAlertTriangle,
  IconPhoto,
  IconClock,
  IconRotateClockwise
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/shared/lib/axiosInstance';
import { InspectionPanel, MappingTab, JobDetail, ProcessedImagesTable } from './components';
import { useOcrJobs } from './hooks/useOcrJobs';
import type { OCRJobRow } from './types/ocrJob';
import RecordSchemaInfoPopover from './components/RecordSchemaInfoPopover';
import { getDefaultColumns } from './config/defaultRecordColumns';

// Types
interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  recordType: 'baptism' | 'marriage' | 'funeral';
  status: 'queued' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
  thumbnail?: string;
  jobId?: string; // Backend job ID after upload
}

interface Church {
  id: number;
  name: string;
  database_name: string;
}

interface OCRSettings {
  engine: string;
  dpi: number;
  confidenceThreshold: number;
  autoDetectLanguage: boolean;
  forceGrayscale: boolean;
  deskewImages: boolean;
  language: string;
}

// Utility functions
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const generateId = (): string => Math.random().toString(36).substring(2, 11);

// ... (StatusBadge, RecordTypeBadge, FileCard, BatchProgress components)

// Main Component
const EnhancedOCRUploader: React.FC = () => {
  const theme = useTheme();
  const { user, isSuperAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showInspectionPanel, setShowInspectionPanel] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedJobDetail, setSelectedJobDetail] = useState<JobDetail | null>(null);
  const [loadingJobDetail, setLoadingJobDetail] = useState(false);
  const [showMappingTab, setShowMappingTab] = useState(false);
  const [inspectionPanelInitialTab, setInspectionPanelInitialTab] = useState<number | undefined>(undefined);
  
  // Use the OCR jobs hook for processed images table
  const {
    jobs: ocrJobs,
    loading: loadingOcrJobs,
    refresh: refreshOcrJobs,
    fetchJobDetail: fetchOcrJobDetail,
    updateRecordType,
    retryJob,
    deleteJobs,
    reprocessJobs,
    completedCount: ocrCompletedCount,
    failedCount: ocrFailedCount
  } = useOcrJobs({ churchId: selectedChurchId });
  
  const [settings, setSettings] = useState<OCRSettings>({
    engine: 'Google Vision',
    dpi: 300,
    confidenceThreshold: 85,
    autoDetectLanguage: true,
    forceGrayscale: false,
    deskewImages: true,
    language: 'en'
  });

  // Sticky defaults state with localStorage persistence
  const [stickyDefaults, setStickyDefaults] = useState<Record<'baptism' | 'marriage' | 'funeral', boolean>>(() => {
    try {
      const stored = localStorage.getItem('om.enhancedOcrUploader.stickyDefaults.v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          baptism: parsed.baptism_records || false,
          marriage: parsed.marriage_records || false,
          funeral: parsed.funeral_records || false,
        };
      }
    } catch (e) {
      console.warn('Failed to load sticky defaults from localStorage:', e);
    }
    return { baptism: false, marriage: false, funeral: false };
  });

  // Persist sticky defaults to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('om.enhancedOcrUploader.stickyDefaults.v1', JSON.stringify({
        baptism_records: stickyDefaults.baptism,
        marriage_records: stickyDefaults.marriage,
        funeral_records: stickyDefaults.funeral,
      }));
    } catch (e) {
      console.warn('Failed to save sticky defaults to localStorage:', e);
    }
  }, [stickyDefaults]);

  // Upload files
  const startUpload = useCallback(async () => {
    if (!selectedChurchId || files.length === 0) return;

    setIsUploading(true);
    setIsPaused(false);

    const queuedFiles = files.filter(f => f.status === 'queued' || f.status === 'error');

    for (const uploadFile of queuedFiles) {
      if (isPaused) break;

      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      try {
        const formData = new FormData();
        formData.append('files', uploadFile.file);
        formData.append('churchId', selectedChurchId.toString());
        formData.append('recordType', uploadFile.recordType);
        formData.append('language', settings.language);
        formData.append('settings', JSON.stringify({
          autoDetectLanguage: settings.autoDetectLanguage,
          forceGrayscale: settings.forceGrayscale,
          deskewImages: settings.deskewImages,
          dpi: settings.dpi
        }));

        // Simulate progress (real implementation would use XMLHttpRequest for progress)
        const progressInterval = setInterval(() => {
          setFiles(prev => prev.map(f => {
            if (f.id === uploadFile.id && f.progress < 90) {
              return { ...f, progress: f.progress + 10 };
            }
            return f;
          }));
        }, 200);

        const response: any = await apiClient.post('/api/ocr/jobs/upload', formData);

        clearInterval(progressInterval);

        // Extract jobId from response
        const jobs = response.data?.jobs || [];
        const jobId = jobs.length > 0 ? jobs[0].id : undefined;

        // Update to processing then complete
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, status: 'processing', progress: 95, jobId } : f
        ));

        await new Promise(resolve => setTimeout(resolve, 500));

        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, status: 'complete', progress: 100, jobId } : f
        ));

        // Refresh the processed images table to show new job
        refreshOcrJobs();

      } catch (error: any) {
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { 
            ...f, 
            status: 'error', 
            progress: 0,
            error: error.message || 'Upload failed'
          } : f
        ));
      }
    }

    setIsUploading(false);
    // Final refresh to ensure all jobs are shown
    refreshOcrJobs();
  }, [files, selectedChurchId, settings, isPaused, refreshOcrJobs]);

  // ... (render method with drag-and-drop, file queue, processed images table, inspection panel)
};

export default EnhancedOCRUploader;
```

**Key Features:**
- Drag-and-drop file upload
- Batch upload with progress tracking
- SuperAdmin church selector
- Advanced OCR settings (DPI, language, preprocessing)
- Sticky defaults for field filtering
- Integration with `ProcessedImagesTable` and `InspectionPanel`

---

### Frontend: FusionTab.tsx

The Fusion workflow component implements a 4-step process for extracting structured data from multi-record images.

**Step 1: Detect Entries**
- Auto-detects individual record cards using quadrant clustering, gap-based detection, or text-based fallback
- Uses Non-Maximum Suppression (NMS) to collapse overlapping entries
- Supports manual entry count for edge cases
- Allows editing bounding boxes with `EditableBBox`

**Step 2: Anchor Labels**
- Fuzzy matches OCR text against `LABEL_DICTIONARIES` for each record type
- Highlights detected labels on the image
- Stores label-to-field mappings

**Step 3: Map Fields**
- Auto-maps values based on detected labels
- Manual edit mode for corrections
- Real-time field highlighting on image
- Auto-save with 2-second debounce

**Step 4: Save & Commit**
- Saves drafts to `ocr_fused_drafts` table
- Validates required fields
- Commits to `baptism_records`, `marriage_records`, or `funeral_records` tables

**Key State Management:**
```typescript
const [entries, setEntries] = useState<FusionEntry[]>([]);
const [selectedEntryIndex, setSelectedEntryIndex] = useState<number | null>(null);
const [detectedLabels, setDetectedLabels] = useState<DetectedLabel[]>([]);
const [mappedFields, setMappedFields] = useState<Record<string, MappedField>>({});
const [drafts, setDrafts] = useState<FusionDraft[]>([]);
const [entryData, setEntryData] = useState<Map<number, {
  labels: DetectedLabel[];
  fields: Record<string, MappedField>;
  recordType: 'baptism' | 'marriage' | 'funeral';
}>>(new Map());
```

**Auto-save Implementation:**
```typescript
const triggerAutoSave = useCallback(() => {
  if (!autoSaveEnabled || selectedEntryIndex === null) return;

  if (autoSaveTimerRef.current) {
    clearTimeout(autoSaveTimerRef.current);
  }

  pendingSaveRef.current = true;

  autoSaveTimerRef.current = setTimeout(async () => {
    if (pendingSaveRef.current && selectedEntryIndex !== null) {
      await saveDraftForEntry(selectedEntryIndex, true);
      pendingSaveRef.current = false;
    }
  }, 2000);
}, [autoSaveEnabled, selectedEntryIndex, saveDraftForEntry]);
```

---

### Frontend: visionParser.ts

This utility file contains production-grade algorithms for parsing Google Vision API responses and detecting entries.

**Key Functions:**

1. **`parseVisionResponse(vision: VisionResponse): FusionLine[]`**
   - Converts Vision JSON into structured `FusionLine` objects with bounding boxes
   - Extracts text, tokens, and confidence scores

2. **`detectEntries(vision: VisionResponse, ocrText?: string): FusionEntry[]`**
   - Main entry detection function
   - Tries multiple strategies:
     - Quadrant clustering (for 4-card layouts)
     - Gap-based detection (for vertical layouts)
     - Single entry fallback
   - Applies Non-Maximum Suppression (NMS) to collapse duplicates
   - Uses scoring algorithm based on area, text density, anchor labels, and aspect ratio

3. **`detectLabels(entry: FusionEntry, recordType: string): DetectedLabel[]`**
   - Fuzzy matches OCR text against `LABEL_DICTIONARIES`
   - Uses Levenshtein distance for similarity scoring
   - Returns labels with confidence scores and bounding boxes

4. **`autoMapFields(entry: FusionEntry, labels: DetectedLabel[]): Record<string, MappedField>`**
   - Extracts values to the right or below detected labels
   - Maps to canonical field names
   - Returns confidence scores and bounding boxes for values

**NMS Algorithm:**
```typescript
function applyNMS(
  candidates: Array<{ entry: FusionEntry; score: CandidateScore }>,
  iouThreshold: number = 0.5,
  containmentThreshold: number = 0.8
): FusionEntry[] {
  // Sort by score descending
  const sorted = [...candidates].sort((a, b) => b.score.totalScore - a.score.totalScore);
  
  const kept: FusionEntry[] = [];
  const suppressed = new Set<number>();
  
  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue;
    
    const current = sorted[i];
    kept.push(current.entry);
    
    // Suppress overlapping candidates
    for (let j = i + 1; j < sorted.length; j++) {
      if (suppressed.has(j)) continue;
      
      const other = sorted[j];
      const iou = calculateIoU(current.entry.bbox, other.entry.bbox);
      const containment = calculateContainment(current.entry.bbox, other.entry.bbox);
      
      if (iou >= iouThreshold || containment >= containmentThreshold) {
        suppressed.add(j);
        // Merge lines from suppressed entry
        current.entry.lines.push(...other.entry.lines);
        current.entry.bbox = mergeBBoxes([current.entry.bbox, other.entry.bbox]);
      }
    }
  }
  
  return kept;
}
```

---

### Frontend: useOcrJobs.ts

Custom React hook for managing OCR job lifecycle:

```typescript
export function useOcrJobs({ churchId }: { churchId: number | null }) {
  const [jobs, setJobs] = useState<OCRJobRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [jobDetailCache, setJobDetailCache] = useState<Map<string, OCRJobDetail>>(new Map());
  
  const pollInterval = 5000; // 5 seconds
  
  const fetchJobs = useCallback(async () => {
    if (!churchId) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`/api/ocr/jobs?churchId=${churchId}`);
      const jobs = response.data?.jobs || [];
      setJobs(jobs);
    } catch (error) {
      console.error('Failed to fetch OCR jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [churchId]);
  
  // Poll for updates
  useEffect(() => {
    if (!churchId) return;
    
    fetchJobs();
    const interval = setInterval(fetchJobs, pollInterval);
    return () => clearInterval(interval);
  }, [churchId, fetchJobs]);
  
  const fetchJobDetail = useCallback(async (jobId: string | number): Promise<OCRJobDetail | null> => {
    if (!churchId) return null;
    
    const cacheKey = `${churchId}-${jobId}`;
    if (jobDetailCache.has(cacheKey)) {
      return jobDetailCache.get(cacheKey)!;
    }
    
    try {
      const response = await apiClient.get(`/api/ocr/jobs/${jobId}?churchId=${churchId}`);
      const detail = response.data;
      setJobDetailCache(prev => new Map(prev).set(cacheKey, detail));
      return detail;
    } catch (error) {
      console.error('Failed to fetch job detail:', error);
      return null;
    }
  }, [churchId, jobDetailCache]);
  
  // ... (updateRecordType, retryJob, deleteJobs, reprocessJobs)
  
  return {
    jobs,
    loading,
    refresh: fetchJobs,
    fetchJobDetail,
    updateRecordType,
    retryJob,
    deleteJobs,
    reprocessJobs,
    completedCount: jobs.filter(j => j.status === 'completed').length,
    failedCount: jobs.filter(j => j.status === 'failed').length,
  };
}
```

---

## Backend: routes/ocr.js

Main OCR routes file handling uploads, job management, and settings.

### POST /api/ocr/jobs/upload

Handles multiple file uploads for the Enhanced OCR Uploader:

```javascript
router.post('/jobs/upload', async (req, res) => {
  // Use temporary storage first
  const tempStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(__dirname, '..', 'uploads', 'ocr', 'temp');
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileHash = crypto.randomBytes(8).toString('hex');
      cb(null, `ocr_${uniqueSuffix}_${fileHash}${path.extname(file.originalname)}`);
    }
  });

  const tempUpload = multer({
    storage: tempStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff|webp|pdf/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only image and PDF files are allowed'));
      }
    }
  });

  tempUpload.fields([
    { name: 'files', maxCount: 10 },
    { name: 'churchId', maxCount: 1 },
    { name: 'settings', maxCount: 1 }
  ])(req, res, async () => {
    try {
      // Resolve churchId from form data, session, or database
      let churchId = req.body.churchId ? parseInt(req.body.churchId) : null;
      
      if (!churchId) {
        const sessionUser = req.session?.user;
        if (sessionUser?.church_id) {
          churchId = parseInt(sessionUser.church_id);
        } else if (sessionUser?.id) {
          const { promisePool } = require('../config/db');
          const [userRows] = await promisePool.query(
            'SELECT church_id FROM users WHERE id = ?',
            [sessionUser.id]
          );
          if (userRows.length > 0 && userRows[0].church_id) {
            churchId = parseInt(userRows[0].church_id);
          }
        }
      }
      
      // Validate churchId
      if (!churchId) {
        const userRole = req.session?.user?.role || req.user?.role;
        const isAdmin = userRole === 'admin' || userRole === 'super_admin';
        if (isAdmin) {
          return res.status(400).json({ 
            error: 'churchId is required. Please select a church.',
            jobs: []
          });
        }
      }

      const files = req.files?.files || [];
      
      // Move files to church-specific directory
      const baseUploadPath = process.env.UPLOAD_BASE_PATH || '/var/www/orthodoxmetrics/prod/uploads';
      const churchUploadDir = path.join(baseUploadPath, `om_church_${churchId}`, 'uploaded');
      await fs.mkdir(churchUploadDir, { recursive: true });
      
      for (const file of files) {
        const newPath = path.join(churchUploadDir, path.basename(file.filename));
        await fs.rename(file.path, newPath);
        file.path = newPath;
      }

      // Get church database connection
      const { promisePool } = require('../config/db');
      const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
      if (!churchRows.length) {
        return res.status(404).json({ error: 'Church not found', jobs: [] });
      }

      let dbSwitcherModule;
      try {
        dbSwitcherModule = require('../utils/dbSwitcher');
      } catch (e) {
        dbSwitcherModule = require('../src/utils/dbSwitcher');
      }
      const { getChurchDbConnection } = dbSwitcherModule;
      const db = await getChurchDbConnection(churchRows[0].database_name);

      // Process each uploaded file
      const jobs = [];
      for (const file of files) {
        try {
          const recordType = settings?.recordType || 'baptism';
          const language = settings?.language || 'en';

          // Create OCR job record (with dynamic column handling)
          let jobId;
          try {
            const [result] = await db.query(`
              INSERT INTO ocr_jobs (
                church_id, filename, original_filename, file_path, file_size, mime_type, status, 
                record_type, language, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW())
            `, [
              churchId,
              file.filename,
              file.originalname,
              file.path,
              file.size,
              file.mimetype,
              recordType,
              language
            ]);
            jobId = result.insertId;
          } catch (insertError) {
            // Fallback to alternative schema (file_name instead of filename)
            if (insertError.code === 'ER_BAD_FIELD_ERROR') {
              const [result] = await db.query(`
                INSERT INTO ocr_jobs (
                  church_id, file_name, file_path, status, 
                  record_type, language_detected, created_at
                ) VALUES (?, ?, ?, 'pending', ?, ?, NOW())
              `, [
                churchId,
                file.originalname || file.filename,
                file.path,
                recordType,
                language
              ]);
              jobId = result.insertId;
            } else {
              throw insertError;
            }
          }

          jobs.push({
            id: jobId.toString(),
            filename: file.filename,
            originalFilename: file.originalname,
            status: 'pending',
            churchId: churchId,
            createdAt: new Date().toISOString()
          });

          // Trigger background OCR processing
          processOcrJobAsync(db, jobId, file.path, {
            language: language,
            recordType: recordType,
            engine: settings?.engine || 'google-vision',
            churchId: churchId
          }).catch(error => {
            console.error(`❌ Background OCR processing failed for job ${jobId}:`, error);
          });

        } catch (fileError) {
          console.error(`Error processing file ${file.originalname}:`, fileError);
        }
      }

      res.json({
        success: true,
        jobs: jobs,
        message: `Successfully uploaded ${jobs.length} file(s) for OCR processing`
      });

    } catch (error) {
      console.error('Error in /api/ocr/jobs/upload:', error);
      res.status(500).json({ 
        error: 'Failed to upload files for OCR processing',
        details: error.message,
        jobs: []
      });
    }
  });
});
```

### processOcrJobAsync Function

Asynchronous OCR processing with Google Vision AI:

```javascript
async function processOcrJobAsync(db, jobId, imagePath, options = {}) {
  const startTime = Date.now();
  const { language = 'en', recordType = 'baptism', engine = 'google-vision' } = options;
  
  try {
    console.log(`🔍 Processing OCR job ${jobId} with ${engine}: ${imagePath}`);
    
    // Update job status to processing
    await db.query('UPDATE ocr_jobs SET status = ? WHERE id = ?', ['processing', jobId]);
    
    if (engine === 'google-vision') {
      const vision = require('@google-cloud/vision');
      
      // Initialize client
      const visionClientConfig = {
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
      };
      
      if (process.env.GOOGLE_VISION_KEY_PATH) {
        visionClientConfig.keyFilename = process.env.GOOGLE_VISION_KEY_PATH;
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        visionClientConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
      
      const client = new vision.ImageAnnotatorClient(visionClientConfig);
      
      // Read image
      const imageBuffer = await fs.readFile(imagePath);
      
      // Configure OCR request
      const request = {
        image: { content: imageBuffer },
        imageContext: {
          languageHints: [language, 'en'],
        },
        features: [
          { type: 'TEXT_DETECTION' },
          { type: 'DOCUMENT_TEXT_DETECTION' }
        ]
      };
      
      // Call Google Vision API
      const [result] = await client.annotateImage(request);
      
      const textAnnotations = result.textAnnotations || [];
      const fullTextAnnotation = result.fullTextAnnotation || {};
      
      // Extract text
      const extractedText = textAnnotations.length > 0 ? textAnnotations[0].description : '';
      
      // Calculate confidence
      let totalConfidence = 0;
      let count = 0;
      
      if (fullTextAnnotation.pages) {
        fullTextAnnotation.pages.forEach(page => {
          if (page.confidence !== undefined) {
            totalConfidence += page.confidence;
            count++;
          }
        });
      }
      
      const confidence = count > 0 ? totalConfidence / count : 0.85;
      
      // Prepare Vision result JSON for bounding box overlay support
      const visionResultJson = {
        textAnnotations: textAnnotations.map(a => ({
          description: a.description,
          boundingPoly: a.boundingPoly,
          confidence: a.confidence
        })),
        fullTextAnnotation: fullTextAnnotation
      };
      
      // Move to processed directory
      const churchId = options.churchId || 46;
      const serverRoot = path.resolve(__dirname, '..').replace('/dist/routes', '').replace('/dist', '');
      const baseUploadDir = path.join(serverRoot, 'uploads', `om_church_${churchId}`);
      const processedDir = path.join(baseUploadDir, 'processed');
      await fs.mkdir(processedDir, { recursive: true });
      
      const originalFilename = path.basename(imagePath);
      const filenameWithoutExt = path.parse(originalFilename).name;
      
      // Write OCR text result
      const textFilePath = path.join(processedDir, `${filenameWithoutExt}_ocr.txt`);
      const ocrOutput = [
        `=== OCR Result for Job ${jobId} ===`,
        `File: ${originalFilename}`,
        `Processed: ${new Date().toISOString()}`,
        `Confidence: ${(confidence * 100).toFixed(1)}%`,
        `Processing Time: ${Date.now() - startTime}ms`,
        ``,
        `=== Extracted Text ===`,
        extractedText,
        ``,
        `=== End ===`
      ].join('\n');
      
      await fs.writeFile(textFilePath, ocrOutput, 'utf8');
      
      // Write Vision JSON result
      const jsonFilePath = path.join(processedDir, `${filenameWithoutExt}_ocr.json`);
      await fs.writeFile(jsonFilePath, JSON.stringify(visionResultJson), 'utf8');
      
      // Move image to processed
      const processedImagePath = path.join(processedDir, originalFilename);
      try {
        await fs.rename(imagePath, processedImagePath);
      } catch (moveError) {
        if (moveError.code === 'EXDEV') {
          await fs.copyFile(imagePath, processedImagePath);
          await fs.unlink(imagePath);
        }
      }
      
      // Update job status
      try {
        await db.query(`
          UPDATE ocr_jobs SET 
            status = 'completed',
            file_path = ?,
            confidence_score = ?,
            ocr_text = ?,
            ocr_result_json = ?,
            updated_at = NOW()
          WHERE id = ?
        `, [processedImagePath, confidence, extractedText, JSON.stringify(visionResultJson), jobId]);
      } catch (dbError) {
        // Try with 'complete' status if 'completed' fails
        await db.query(`
          UPDATE ocr_jobs SET 
            status = 'complete',
            file_path = ?,
            confidence_score = ?,
            updated_at = NOW()
          WHERE id = ?
        `, [processedImagePath, confidence, jobId]);
      }
      
      return {
        success: true,
        jobId,
        extractedText,
        confidence,
        processingTime: Date.now() - startTime
      };
    }
  } catch (error) {
    console.error(`❌ OCR processing failed for job ${jobId}:`, error);
    
    // Update job with error status
    try {
      await db.query(`
        UPDATE ocr_jobs SET 
          status = 'failed',
          error = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [error.message || 'OCR processing failed', jobId]);
    } catch (updateError) {
      await db.query('UPDATE ocr_jobs SET status = ? WHERE id = ?', ['failed', jobId]);
    }
    
    throw error;
  }
}
```

### GET /api/ocr/jobs/:jobId

Returns detailed job information including full OCR result and Vision JSON:

```javascript
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const churchId = req.query.churchId ? parseInt(req.query.churchId) : null;
    
    if (!churchId) {
      return res.status(400).json({ error: 'churchId query parameter is required' });
    }
    
    // Get church database
    const { promisePool } = require('../config/db');
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }
    
    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('../utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('../src/utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);
    
    // Dynamically build SELECT based on available columns
    const [columns] = await db.query(`SHOW COLUMNS FROM ocr_jobs`);
    const columnNames = columns.map(c => c.Field);
    
    const baseColumns = [
      'id', 'filename', 'original_filename', 'file_path', 'status',
      'record_type', 'language', 'confidence_score', 'file_size', 
      'mime_type', 'pages', 'created_at', 'updated_at', 'church_id'
    ];
    
    const optionalColumns = ['ocr_result', 'ocr_text', 'ocr_result_json', 'error', 'processing_time_ms'];
    const selectColumns = baseColumns.filter(c => columnNames.includes(c));
    optionalColumns.forEach(c => {
      if (columnNames.includes(c)) selectColumns.push(c);
    });
    
    const [jobs] = await db.query(
      `SELECT ${selectColumns.join(', ')} FROM ocr_jobs WHERE id = ?`,
      [jobId]
    );
    
    if (!jobs.length) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const job = jobs[0];
    
    // Fetch any saved mapping
    let mapping = null;
    try {
      const [mappings] = await db.query(
        'SELECT * FROM ocr_mappings WHERE ocr_job_id = ?',
        [jobId]
      );
      if (mappings.length > 0) {
        mapping = {
          id: mappings[0].id,
          recordType: mappings[0].record_type,
          mappingJson: typeof mappings[0].mapping_json === 'string' 
            ? JSON.parse(mappings[0].mapping_json) 
            : mappings[0].mapping_json,
          bboxLinks: mappings[0].bbox_links ? (
            typeof mappings[0].bbox_links === 'string'
              ? JSON.parse(mappings[0].bbox_links)
              : mappings[0].bbox_links
          ) : null,
          status: mappings[0].status,
          createdAt: mappings[0].created_at,
          updatedAt: mappings[0].updated_at
        };
      }
    } catch (mappingError) {
      // Table might not exist, that's okay
    }
    
    // Parse OCR result JSON if available
    let ocrResultJson = null;
    if (job.ocr_result_json) {
      try {
        ocrResultJson = typeof job.ocr_result_json === 'string'
          ? JSON.parse(job.ocr_result_json)
          : job.ocr_result_json;
      } catch (e) {
        console.warn('Could not parse ocr_result_json:', e.message);
      }
    }
    
    // Build response
    const response = {
      id: job.id.toString(),
      filename: job.filename,
      originalFilename: job.original_filename,
      filePath: job.file_path,
      status: job.status,
      recordType: job.record_type || 'baptism',
      language: job.language || 'en',
      confidenceScore: job.confidence_score || 0,
      fileSize: job.file_size,
      mimeType: job.mime_type,
      pages: job.pages,
      churchId: job.church_id,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      processingTimeMs: job.processing_time_ms || null,
      error: job.error || null,
      ocrText: job.ocr_text || job.ocr_result || null,
      ocrResultJson: ocrResultJson,
      mapping: mapping
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching job detail:', error);
    res.status(500).json({ error: 'Failed to fetch job detail', details: error.message });
  }
});
```

---

## Backend: src/index.ts (Fusion & Review Endpoints)

### GET /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts

Fetches fusion drafts for a job with dynamic column handling:

```typescript
app.get('/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    
    // Get church database
    const { promisePool } = require('./config/db');
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }
    
    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('../utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);
    
    // Check if table exists
    const [tables] = await db.query(
      `SELECT COUNT(*) as count FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ocr_fused_drafts'`,
      [churchRows[0].database_name]
    );
    
    if (tables[0].count === 0) {
      return res.json({ drafts: [] });
    }
    
    // Check which columns exist
    let selectCols = 'id, ocr_job_id, entry_index, record_type, record_number, payload_json, bbox_json, status, committed_record_id, created_by, created_at, updated_at';
    let hasWorkflowStatus = false;
    try {
      const [cols] = await db.query(`SHOW COLUMNS FROM ocr_fused_drafts`);
      const colNames = cols.map((c: any) => c.Field);
      if (colNames.includes('workflow_status')) {
        selectCols += ', workflow_status';
        hasWorkflowStatus = true;
      }
      if (colNames.includes('last_saved_at')) selectCols += ', last_saved_at';
      if (colNames.includes('finalized_at')) selectCols += ', finalized_at';
      if (colNames.includes('finalized_by')) selectCols += ', finalized_by';
    } catch (e) { /* use default columns */ }
    
    // Support optional status filter
    const statusFilter = req.query.status as string | undefined;
    const recordTypeFilter = req.query.record_type as string | undefined;
    
    let whereClause = 'WHERE ocr_job_id = ?';
    const queryParams: any[] = [jobId];
    
    // Filter by workflow_status if status param is provided and column exists
    if (statusFilter && hasWorkflowStatus) {
      if (statusFilter === 'in_review' || statusFilter === 'draft' || statusFilter === 'finalized' || statusFilter === 'committed') {
        whereClause += ' AND workflow_status = ?';
        queryParams.push(statusFilter);
      }
    } else if (statusFilter && !hasWorkflowStatus) {
      // Fallback to status column if workflow_status doesn't exist
      whereClause += ' AND status = ?';
      queryParams.push(statusFilter);
    }
    
    // Filter by record_type if provided
    if (recordTypeFilter) {
      whereClause += ' AND record_type = ?';
      queryParams.push(recordTypeFilter);
    }
    
    // Check if church_id column exists and add filter
    let hasChurchId = false;
    try {
      const [cols] = await db.query(`SHOW COLUMNS FROM ocr_fused_drafts`);
      const colNames = cols.map((c: any) => c.Field);
      if (colNames.includes('church_id')) {
        hasChurchId = true;
        whereClause += ' AND (church_id = ? OR church_id IS NULL)';
        queryParams.push(churchId);
      }
    } catch (e) { /* ignore */ }
    
    const [drafts] = await db.query(
      `SELECT ${selectCols}
       FROM ocr_fused_drafts
       ${whereClause}
       ORDER BY entry_index ASC`,
      queryParams
    );
    
    // Parse JSON fields
    const parsedDrafts = drafts.map((d: any) => {
      try {
        return {
          ...d,
          payload_json: typeof d.payload_json === 'string' ? JSON.parse(d.payload_json) : d.payload_json,
          bbox_json: d.bbox_json ? (typeof d.bbox_json === 'string' ? JSON.parse(d.bbox_json) : d.bbox_json) : null,
        };
      } catch (parseError: any) {
        console.error(`Error parsing draft ${d.id}:`, parseError);
        return {
          ...d,
          payload_json: {},
          bbox_json: null,
        };
      }
    });
    
    res.json({ drafts: parsedDrafts });
  } catch (error: any) {
    console.error('[Fusion Drafts GET] Error:', error);
    res.status(500).json({ error: 'Failed to fetch drafts', message: error.message });
  }
});
```

### POST /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts

Saves/upserts fusion drafts:

```typescript
app.post('/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const { entries } = req.body; // Array of { entry_index, record_type, record_number, payload_json, bbox_json }
    const userEmail = req.session?.user?.email || req.user?.email || 'system';

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries array is required' });
    }

    // Get church database
    const { promisePool } = require('./config/db');
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('../utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS ocr_fused_drafts (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        ocr_job_id BIGINT NOT NULL,
        entry_index INT NOT NULL DEFAULT 0,
        record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL DEFAULT 'baptism',
        record_number VARCHAR(16) NULL,
        payload_json LONGTEXT NOT NULL,
        bbox_json LONGTEXT NULL,
        status ENUM('draft', 'committed') NOT NULL DEFAULT 'draft',
        committed_record_id BIGINT NULL,
        created_by VARCHAR(255) NOT NULL DEFAULT 'system',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_job_entry (ocr_job_id, entry_index),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Check if church_id and workflow_status columns exist
    let hasChurchId = false;
    let hasWorkflowStatus = false;
    try {
      const [cols] = await db.query(`SHOW COLUMNS FROM ocr_fused_drafts`);
      const colNames = cols.map((c: any) => c.Field);
      hasChurchId = colNames.includes('church_id');
      hasWorkflowStatus = colNames.includes('workflow_status');
    } catch (e) { /* ignore */ }

    const savedDrafts: any[] = [];

    for (const entry of entries) {
      const { entry_index, record_type, record_number, payload_json, bbox_json } = entry;

      // Build INSERT columns and values dynamically
      let insertCols = 'ocr_job_id, entry_index, record_type, record_number, payload_json, bbox_json, status, created_by';
      let insertValues = '?, ?, ?, ?, ?, ?, ?, ?';
      const insertParams: any[] = [
        jobId,
        entry_index,
        record_type || 'baptism',
        record_number || null,
        JSON.stringify(payload_json || {}),
        bbox_json ? JSON.stringify(bbox_json) : null,
        'draft',
        userEmail,
      ];

      // Add church_id if column exists
      if (hasChurchId) {
        insertCols += ', church_id';
        insertValues += ', ?';
        insertParams.push(churchId);
      }

      // Add workflow_status if column exists
      if (hasWorkflowStatus) {
        insertCols += ', workflow_status';
        insertValues += ', ?';
        insertParams.push('draft');
      }

      // Upsert: insert or update on duplicate key
      const [result] = await db.query(`
        INSERT INTO ocr_fused_drafts 
          (${insertCols})
        VALUES (${insertValues})
        ON DUPLICATE KEY UPDATE
          record_type = VALUES(record_type),
          record_number = VALUES(record_number),
          payload_json = VALUES(payload_json),
          bbox_json = VALUES(bbox_json),
          updated_at = CURRENT_TIMESTAMP
          ${hasChurchId ? ', church_id = VALUES(church_id)' : ''}
          ${hasWorkflowStatus ? ', workflow_status = COALESCE(VALUES(workflow_status), workflow_status)' : ''}
      `, insertParams);

      // Get the saved/updated draft
      const [saved] = await db.query(
        'SELECT * FROM ocr_fused_drafts WHERE ocr_job_id = ? AND entry_index = ?',
        [jobId, entry_index]
      );

      if (saved.length > 0) {
        savedDrafts.push({
          ...saved[0],
          payload_json: typeof saved[0].payload_json === 'string' ? JSON.parse(saved[0].payload_json) : saved[0].payload_json,
          bbox_json: saved[0].bbox_json ? (typeof saved[0].bbox_json === 'string' ? JSON.parse(saved[0].bbox_json) : saved[0].bbox_json) : null,
        });
      }
    }

    res.json({ success: true, drafts: savedDrafts });
  } catch (error: any) {
    console.error('[Fusion Drafts POST] Error:', error);
    res.status(500).json({ error: 'Failed to save drafts', message: error.message });
  }
});
```

### POST /api/church/:churchId/ocr/jobs/:jobId/fusion/validate

Validates drafts before commit:

```typescript
app.post('/api/church/:churchId/ocr/jobs/:jobId/fusion/validate', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);

    // Get church database
    const { promisePool } = require('./config/db');
    const [churchRows] = await promisePool.query('SELECT database_name, name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('../utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Fetch drafts
    const [drafts] = await db.query(
      `SELECT * FROM ocr_fused_drafts WHERE ocr_job_id = ? AND status = 'draft' ORDER BY entry_index`,
      [jobId]
    );

    if (drafts.length === 0) {
      return res.json({ valid: false, error: 'No drafts to validate', drafts: [] });
    }

    // Required fields per record type
    const requiredFields: Record<string, string[]> = {
      baptism: ['child_name'],
      marriage: ['groom_name', 'bride_name'],
      funeral: ['deceased_name'],
    };

    const validatedDrafts = drafts.map((draft: any) => {
      const payload = typeof draft.payload_json === 'string' 
        ? JSON.parse(draft.payload_json) 
        : draft.payload_json;
      
      const recordType = draft.record_type || 'baptism';
      const required = requiredFields[recordType] || [];
      const missingFields: string[] = [];
      const warnings: string[] = [];

      // Check required fields
      for (const field of required) {
        if (!payload[field] || payload[field].trim() === '') {
          missingFields.push(field);
        }
      }

      // Check for low confidence warnings
      if (draft.bbox_json) {
        const bboxData = typeof draft.bbox_json === 'string' 
          ? JSON.parse(draft.bbox_json) 
          : draft.bbox_json;
        
        if (bboxData.fieldBboxes) {
          for (const [fieldName, fieldData] of Object.entries(bboxData.fieldBboxes)) {
            const fd = fieldData as any;
            if (fd.confidence && fd.confidence < 0.6) {
              warnings.push(`Low OCR confidence on ${fieldName}`);
            }
          }
        }
      }

      // Check for very short values
      for (const [fieldName, value] of Object.entries(payload)) {
        if (typeof value === 'string' && value.length > 0 && value.length < 2) {
          warnings.push(`${fieldName} appears incomplete`);
        }
      }

      return {
        id: draft.id,
        entry_index: draft.entry_index,
        record_type: recordType,
        record_number: draft.record_number,
        missing_fields: missingFields,
        warnings,
        payload,
      };
    });

    const allValid = validatedDrafts.every((d: any) => d.missing_fields.length === 0);

    res.json({
      valid: allValid,
      church_name: churchRows[0].name || `Church ${churchId}`,
      church_id: churchId,
      drafts: validatedDrafts,
      summary: {
        total: validatedDrafts.length,
        valid: validatedDrafts.filter((d: any) => d.missing_fields.length === 0).length,
        invalid: validatedDrafts.filter((d: any) => d.missing_fields.length > 0).length,
        warnings: validatedDrafts.reduce((sum: number, d: any) => sum + d.warnings.length, 0),
      },
    });
  } catch (error: any) {
    console.error('[Fusion Validate] Error:', error);
    res.status(500).json({ error: 'Failed to validate drafts', message: error.message });
  }
});
```

### POST /api/church/:churchId/ocr/jobs/:jobId/review/commit

Commits finalized drafts to record tables:

```typescript
app.post('/api/church/:churchId/ocr/jobs/:jobId/review/commit', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const { entry_indexes } = req.body;
    const userEmail = req.session?.user?.email || req.user?.email || 'system';

    // Get church database
    const { promisePool } = require('./config/db');
    const [churchRows] = await promisePool.query('SELECT database_name, name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) return res.status(404).json({ error: 'Church not found' });

    let dbSwitcherModule;
    try { dbSwitcherModule = require('./utils/dbSwitcher'); } 
    catch (e) { dbSwitcherModule = require('../utils/dbSwitcher'); }
    const db = await dbSwitcherModule.getChurchDbConnection(churchRows[0].database_name);

    // Get finalized drafts
    let drafts;
    if (Array.isArray(entry_indexes) && entry_indexes.length > 0) {
      const placeholders = entry_indexes.map(() => '?').join(',');
      [drafts] = await db.query(
        `SELECT * FROM ocr_fused_drafts WHERE ocr_job_id = ? AND entry_index IN (${placeholders}) AND workflow_status = 'finalized'`,
        [jobId, ...entry_indexes]
      );
    } else {
      [drafts] = await db.query(
        `SELECT * FROM ocr_fused_drafts WHERE ocr_job_id = ? AND workflow_status = 'finalized'`,
        [jobId]
      );
    }

    if (drafts.length === 0) {
      return res.status(400).json({ error: 'No finalized drafts to commit' });
    }

    const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;
    const finalizeNote = `\nFinalized via Review & Finalize on ${dateStr}`;

    const committed: any[] = [];
    const errors: any[] = [];

    for (const draft of drafts) {
      try {
        const payload = typeof draft.payload_json === 'string' ? JSON.parse(draft.payload_json) : draft.payload_json;
        const recordType = draft.record_type;
        let recordId: number | null = null;

        // Append finalize note to notes field
        let notes = payload.notes || '';
        if (!notes.includes('Finalized via Review & Finalize')) {
          notes = notes + finalizeNote;
        }

        if (recordType === 'baptism') {
          if (!payload.child_name) {
            errors.push({ entry_index: draft.entry_index, error: 'child_name is required' });
            continue;
          }
          const [result] = await db.query(`
            INSERT INTO baptism_records 
              (church_id, child_name, date_of_birth, place_of_birth, father_name, mother_name, 
               address, date_of_baptism, godparents, performed_by, notes, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `, [churchId, payload.child_name, payload.date_of_birth, payload.place_of_birth,
              payload.father_name, payload.mother_name || payload.parents_name, payload.address,
              payload.date_of_baptism, payload.godparents, payload.performed_by, notes, userEmail]);
          recordId = result.insertId;

        } else if (recordType === 'marriage') {
          if (!payload.groom_name || !payload.bride_name) {
            errors.push({ entry_index: draft.entry_index, error: 'groom_name and bride_name required' });
            continue;
          }
          const [result] = await db.query(`
            INSERT INTO marriage_records 
              (church_id, groom_name, bride_name, date_of_marriage, place_of_marriage, 
               witnesses, officiant, notes, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `, [churchId, payload.groom_name, payload.bride_name, payload.date_of_marriage,
              payload.place_of_marriage, payload.witnesses, payload.officiant, notes, userEmail]);
          recordId = result.insertId;

        } else if (recordType === 'funeral') {
          if (!payload.deceased_name) {
            errors.push({ entry_index: draft.entry_index, error: 'deceased_name is required' });
            continue;
          }
          const [result] = await db.query(`
            INSERT INTO funeral_records 
              (church_id, deceased_name, date_of_death, date_of_funeral, date_of_burial,
               place_of_burial, age_at_death, cause_of_death, next_of_kin, officiant, notes, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `, [churchId, payload.deceased_name, payload.date_of_death, payload.date_of_funeral,
              payload.date_of_burial, payload.place_of_burial, payload.age_at_death,
              payload.cause_of_death, payload.next_of_kin, payload.officiant, notes, userEmail]);
          recordId = result.insertId;
        }

        if (recordId) {
          // Update draft
          await db.query(`
            UPDATE ocr_fused_drafts 
            SET workflow_status = 'committed', committed_record_id = ?, updated_at = NOW()
            WHERE ocr_job_id = ? AND entry_index = ?
          `, [recordId, jobId, draft.entry_index]);

          // Update history
          await db.query(`
            UPDATE ocr_finalize_history 
            SET created_record_id = ?, committed_at = NOW()
            WHERE ocr_job_id = ? AND entry_index = ?
          `, [recordId, jobId, draft.entry_index]);

          committed.push({ entry_index: draft.entry_index, record_type: recordType, record_id: recordId });
        }
      } catch (err: any) {
        console.error(`[Review Commit] Error for entry ${draft.entry_index}:`, err);
        await db.query(`UPDATE ocr_fused_drafts SET commit_error = ? WHERE ocr_job_id = ? AND entry_index = ?`,
          [err.message, jobId, draft.entry_index]);
        errors.push({ entry_index: draft.entry_index, error: err.message });
      }
    }

    res.json({ success: errors.length === 0, committed, errors, message: `Committed ${committed.length}, ${errors.length} errors` });
  } catch (error: any) {
    console.error('[Review Commit] Error:', error);
    res.status(500).json({ error: 'Failed to commit records', message: error.message });
  }
});
```

---

## API Endpoints

### Upload & Job Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ocr/jobs/upload` | Upload multiple files for OCR processing |
| `GET` | `/api/ocr/jobs` | Get list of OCR jobs for a church |
| `GET` | `/api/ocr/jobs/:jobId` | Get detailed job information including OCR result |
| `GET` | `/api/ocr/image/:jobId` | Serve the image file for an OCR job |
| `PATCH` | `/api/church/:churchId/ocr/jobs/:jobId` | Update OCR job fields |
| `POST` | `/api/church/:churchId/ocr/jobs/:jobId/retry` | Retry a failed OCR job |
| `DELETE` | `/api/church/:churchId/ocr/jobs` | Delete OCR jobs (bulk) |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ocr/settings` | Get OCR settings (global or church-specific) |
| `PUT` | `/api/ocr/settings` | Update OCR settings |

### Mapping

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ocr/jobs/:jobId/mapping` | Save field mapping for an OCR job |
| `GET` | `/api/church/:churchId/ocr/jobs/:jobId/mapping` | Get saved mapping |
| `POST` | `/api/ocr/jobs/:jobId/draft-record` | Create a draft sacramental record from mapping |

### Fusion Workflow

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts` | Get fusion drafts for a job |
| `POST` | `/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts` | Save/upsert fusion drafts |
| `PUT` | `/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts/:entryIndex` | Upsert single draft (autosave) |
| `PATCH` | `/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts/:draftId/entry-bbox` | Update entry bbox for a draft |
| `POST` | `/api/church/:churchId/ocr/jobs/:jobId/fusion/ready-for-review` | Mark drafts ready for review |
| `POST` | `/api/church/:churchId/ocr/jobs/:jobId/fusion/validate` | Validate drafts before commit |
| `POST` | `/api/church/:churchId/ocr/jobs/:jobId/fusion/commit` | Commit drafts to record tables |

### Review & Finalize

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/church/:churchId/ocr/jobs/:jobId/review/finalize` | Finalize drafts (create history snapshot) |
| `POST` | `/api/church/:churchId/ocr/jobs/:jobId/review/commit` | Commit finalized drafts to record tables |
| `GET` | `/api/church/:churchId/ocr/finalize-history` | Get finalization history |

---

## Database Schema

### ocr_jobs

Main table for OCR job tracking:

```sql
CREATE TABLE IF NOT EXISTS ocr_jobs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  status ENUM('pending', 'processing', 'completed', 'failed', 'complete') DEFAULT 'pending',
  record_type ENUM('baptism', 'marriage', 'funeral') DEFAULT 'baptism',
  language VARCHAR(10) DEFAULT 'en',
  confidence_score DECIMAL(5,2),
  ocr_text LONGTEXT,
  ocr_result LONGTEXT,
  ocr_result_json LONGTEXT,  -- Google Vision JSON with bounding boxes
  pages INT DEFAULT 1,
  processing_time_ms INT,
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_church (church_id),
  INDEX idx_status (status),
  INDEX idx_record_type (record_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Note:** The backend dynamically handles missing columns (e.g., `error`, `ocr_result_json`, `workflow_status`).

### ocr_fused_drafts

Stores fusion workflow drafts:

```sql
CREATE TABLE IF NOT EXISTS ocr_fused_drafts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ocr_job_id BIGINT NOT NULL,
  entry_index INT NOT NULL DEFAULT 0,
  record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL DEFAULT 'baptism',
  record_number VARCHAR(16) NULL,
  payload_json LONGTEXT NOT NULL,  -- Extracted field values
  bbox_json LONGTEXT NULL,         -- Bounding boxes for entry and fields
  status ENUM('draft', 'committed') NOT NULL DEFAULT 'draft',
  workflow_status ENUM('draft', 'in_review', 'finalized', 'committed') DEFAULT 'draft',
  committed_record_id BIGINT NULL,
  church_id INT NULL,  -- Added for backward compatibility
  created_by VARCHAR(255) NOT NULL DEFAULT 'system',
  last_saved_at DATETIME NULL,
  finalized_at DATETIME NULL,
  finalized_by VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_job_entry (ocr_job_id, entry_index),
  INDEX idx_status (status),
  INDEX idx_workflow_status (workflow_status),
  INDEX idx_church (church_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**bbox_json Structure:**
```json
{
  "entryBbox": { "x": 100, "y": 200, "w": 300, "h": 400 },
  "fieldBboxes": {
    "child_name": {
      "label": { "x": 100, "y": 200, "w": 150, "h": 20 },
      "value": { "x": 260, "y": 200, "w": 200, "h": 20 },
      "confidence": 0.95
    }
  }
}
```

### ocr_mappings

Legacy table for field mappings (used by MappingTab):

```sql
CREATE TABLE IF NOT EXISTS ocr_mappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ocr_job_id INT NOT NULL,
  church_id INT NOT NULL,
  record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL,
  mapping_json JSON NOT NULL,
  bbox_links JSON NULL,
  status ENUM('draft', 'reviewed', 'approved', 'rejected') DEFAULT 'draft',
  created_by INT NULL,
  reviewed_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ocr_job (ocr_job_id),
  INDEX idx_church (church_id),
  UNIQUE KEY unique_job_mapping (ocr_job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ocr_finalize_history

Tracks finalized records before commit:

```sql
CREATE TABLE IF NOT EXISTS ocr_finalize_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ocr_job_id BIGINT NOT NULL,
  entry_index INT NOT NULL DEFAULT 0,
  record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL DEFAULT 'baptism',
  record_number VARCHAR(16) NULL,
  payload_json LONGTEXT NOT NULL,
  created_record_id BIGINT NULL,
  finalized_by VARCHAR(255) NOT NULL DEFAULT 'system',
  finalized_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  committed_at DATETIME NULL,
  source_filename VARCHAR(255) NULL,
  INDEX idx_record_type (record_type),
  INDEX idx_finalized_at (finalized_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### ocr_settings

Church-specific OCR settings:

```sql
CREATE TABLE IF NOT EXISTS ocr_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  engine VARCHAR(50) DEFAULT 'google-vision',
  language VARCHAR(10) DEFAULT 'eng',
  dpi INT DEFAULT 300,
  deskew TINYINT(1) DEFAULT 1,
  remove_noise TINYINT(1) DEFAULT 1,
  preprocess_images TINYINT(1) DEFAULT 1,
  output_format VARCHAR(20) DEFAULT 'json',
  confidence_threshold DECIMAL(5,2) DEFAULT 0.75,
  default_language CHAR(2) DEFAULT 'en',
  preprocessing_enabled TINYINT(1) DEFAULT 1,
  auto_contrast TINYINT(1) DEFAULT 1,
  auto_rotate TINYINT(1) DEFAULT 1,
  noise_reduction TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_church_settings (church_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Workflow

### 1. Upload Flow

1. User selects/drops images in `EnhancedOCRUploader`
2. Files added to queue with `recordType` selection
3. User clicks "Start Upload"
4. Frontend sends `POST /api/ocr/jobs/upload` with FormData
5. Backend:
   - Moves files to `uploads/om_church_##/uploaded/`
   - Creates `ocr_jobs` entries with status `'pending'`
   - Triggers `processOcrJobAsync()` in background
6. Google Vision AI processes image
7. Results saved to `ocr_jobs` (status `'completed'`, `ocr_text`, `ocr_result_json`)
8. Image moved to `uploads/om_church_##/processed/`
9. Frontend polls for updates via `useOcrJobs` hook

### 2. Fusion Workflow

1. User opens `InspectionPanel` for a completed job
2. Clicks "Fusion" tab (opens `FusionTab` in dialog)
3. **Step 1: Detect Entries**
   - Clicks "Auto-Detect Entries"
   - `detectEntries()` parses Vision JSON and segments page
   - NMS collapses overlapping entries
   - User can edit bounding boxes
4. **Step 2: Anchor Labels**
   - For each entry, `detectLabels()` fuzzy matches against `LABEL_DICTIONARIES`
   - Highlights labels on image
5. **Step 3: Map Fields**
   - `autoMapFields()` extracts values based on labels
   - User can manually edit fields
   - Auto-save triggers every 2 seconds
6. **Step 4: Save & Commit**
   - Saves drafts to `ocr_fused_drafts`
   - Validates required fields
   - Commits to `baptism_records`/`marriage_records`/`funeral_records`

### 3. Review & Finalize Flow

1. User opens `ReviewFinalizeTab`
2. Views drafts from `ocr_fused_drafts` (status `'draft'` or `'in_review'`)
3. Clicks "Finalize" → `POST /api/church/:churchId/ocr/jobs/:jobId/review/finalize`
   - Creates snapshot in `ocr_finalize_history`
   - Updates `workflow_status` to `'finalized'`
4. Clicks "Commit" → `POST /api/church/:churchId/ocr/jobs/:jobId/review/commit`
   - Inserts into record tables
   - Updates `workflow_status` to `'committed'`
   - Updates `committed_record_id`

---

## Key Features

### 1. Dynamic Schema Handling

The backend gracefully handles varying database schemas:

```javascript
// Check if column exists
const [columns] = await db.query(`SHOW COLUMNS FROM ocr_jobs`);
const columnNames = columns.map(c => c.Field);

// Conditionally include columns
const selectColumns = baseColumns.filter(c => columnNames.includes(c));
optionalColumns.forEach(c => {
  if (columnNames.includes(c)) selectColumns.push(c);
});
```

### 2. Non-Maximum Suppression (NMS)

Production-grade entry detection with overlap suppression:

```typescript
function applyNMS(candidates, iouThreshold = 0.5, containmentThreshold = 0.8) {
  // Sort by score
  const sorted = [...candidates].sort((a, b) => b.score.totalScore - a.score.totalScore);
  
  const kept = [];
  const suppressed = new Set();
  
  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue;
    kept.push(sorted[i].entry);
    
    // Suppress overlapping candidates
    for (let j = i + 1; j < sorted.length; j++) {
      const iou = calculateIoU(sorted[i].entry.bbox, sorted[j].entry.bbox);
      if (iou >= iouThreshold) {
        suppressed.add(j);
      }
    }
  }
  
  return kept;
}
```

### 3. Auto-save with Debounce

Prevents excessive API calls:

```typescript
const triggerAutoSave = useCallback(() => {
  if (autoSaveTimerRef.current) {
    clearTimeout(autoSaveTimerRef.current);
  }
  
  pendingSaveRef.current = true;
  
  autoSaveTimerRef.current = setTimeout(async () => {
    if (pendingSaveRef.current && selectedEntryIndex !== null) {
      await saveDraftForEntry(selectedEntryIndex, true);
      pendingSaveRef.current = false;
    }
  }, 2000);
}, [autoSaveEnabled, selectedEntryIndex, saveDraftForEntry]);
```

### 4. Sticky Defaults

User preference to restrict field mapping:

```typescript
const [stickyDefaults, setStickyDefaults] = useState(() => {
  const stored = localStorage.getItem('om.enhancedOcrUploader.stickyDefaults.v1');
  if (stored) {
    return JSON.parse(stored);
  }
  return { baptism: false, marriage: false, funeral: false };
});
```

### 5. Bounding Box Coordinate Conversion

Converts Vision coordinates to screen coordinates:

```typescript
export function visionToScreenBBox(
  visionBbox: BBox,
  visionWidth: number,
  visionHeight: number,
  screenWidth: number,
  screenHeight: number
): BBox {
  const scaleX = screenWidth / visionWidth;
  const scaleY = screenHeight / visionHeight;
  
  return {
    x: visionBbox.x * scaleX,
    y: visionBbox.y * scaleY,
    w: visionBbox.w * scaleX,
    h: visionBbox.h * scaleY,
  };
}
```

---

## Environment Variables

Required for Google Vision AI:

```bash
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_VISION_KEY_PATH=/path/to/service-account-key.json
# OR
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

File storage:

```bash
UPLOAD_BASE_PATH=/var/www/orthodoxmetrics/prod/uploads
```

---

## Dependencies

### Frontend
- `@mui/material` - UI components
- `@tabler/icons-react` - Icons
- `axios` - HTTP client (via `apiClient`)

### Backend
- `@google-cloud/vision` - Google Vision AI client
- `multer` - File upload handling
- `sharp` - Image processing (via `ImagePreprocessor`)
- `express` - Web framework

---

## Testing

SuperAdmin test endpoints in `OcrAdminTestController.js`:

- `GET /api/admin/ocr/test/database` - Test database connections
- `GET /api/admin/ocr/test/schema` - Validate `ocr_jobs` schema
- `GET /api/admin/ocr/test/vision` - Test Google Vision API
- `GET /api/admin/ocr/test/queue` - Check OCR queue status
- `POST /api/admin/ocr/test/retry-failed` - Retry failed jobs

---

## Notes

1. **Backward Compatibility**: The backend handles missing columns and tables gracefully to support older installations.

2. **Multi-Database**: Each church has its own database (`om_church_##`), requiring dynamic database routing.

3. **Workflow Status**: The `ocr_fused_drafts` table supports both `status` (legacy ENUM) and `workflow_status` (new ENUM with `'in_review'` and `'finalized'`).

4. **File Storage**: Images are stored in church-specific directories and moved through the pipeline: `temp` → `uploaded` → `processed`.

5. **Polling**: Frontend polls for job updates every 5 seconds via `useOcrJobs` hook.

---

**End of Documentation**

