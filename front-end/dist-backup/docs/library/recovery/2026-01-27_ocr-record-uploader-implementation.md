# OCR Record Uploader Implementation Documentation

**Date:** December 18, 2024  
**Author:** AI Assistant (Claude)  
**Project:** OrthodoxMetrics - OCR Record Digitization System

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Frontend Implementation](#frontend-implementation)
4. [Backend Implementation](#backend-implementation)
5. [Google Vision AI Configuration](#google-vision-ai-configuration)
6. [File Storage Structure](#file-storage-structure)
7. [API Endpoints](#api-endpoints)
8. [Database Schema](#database-schema)
9. [Configuration Parameters](#configuration-parameters)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The OCR Record Uploader is a production-ready system for digitizing Orthodox Church sacramental records (Baptisms, Marriages, Funerals). It enables users to:

- Upload scanned images of historical church records
- Process images using Google Vision AI for text extraction
- Review and map extracted text to structured database fields
- Support multi-tenant architecture (per-church databases)

### Key Features Implemented

- **Batch Upload**: Drag-and-drop or click-to-browse for multiple images
- **SuperAdmin Church Selector**: Select target church database for processing
- **Real-time Progress Tracking**: Individual file and batch progress indicators
- **Processed Images Table**: Blur-to-reveal previews with status indicators
- **OCR Result Inspection**: Side-by-side image and text viewer
- **Field Mapping**: Map extracted text to record fields
- **File-based Result Storage**: OCR results written to text/JSON files

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React/Vite)                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ EnhancedOCR     │  │ ProcessedImages │  │ InspectionPanel │  │
│  │ Uploader.tsx    │  │ Table.tsx       │  │ .tsx            │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │            │
│           └────────────────────┴────────────────────┘            │
│                                │                                 │
│                    ┌───────────┴───────────┐                     │
│                    │   useOcrJobs Hook     │                     │
│                    │   (Polling/Caching)   │                     │
│                    └───────────┬───────────┘                     │
└────────────────────────────────┼────────────────────────────────┘
                                 │ HTTP/REST
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (Node.js/Express)                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ server/src/     │  │ server/routes/  │  │ Google Vision   │  │
│  │ index.ts        │  │ ocr.js          │  │ AI Client       │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │            │
│           └────────────────────┴────────────────────┘            │
│                                │                                 │
└────────────────────────────────┼────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐  ┌─────────────────────┐  ┌─────────────────┐
│   MySQL DBs     │  │   File Storage      │  │  Google Cloud   │
│ om_church_##    │  │ uploads/om_church_##│  │  Vision API     │
│ .ocr_jobs       │  │ /uploaded/          │  │                 │
│                 │  │ /processed/         │  │                 │
└─────────────────┘  └─────────────────────┘  └─────────────────┘
```

---

## Frontend Implementation

### Files Created/Modified

#### 1. Type Definitions
**File:** `front-end/src/features/devel-tools/om-ocr/types/ocrJob.ts`

```typescript
export type OCRJobStatus = 'queued' | 'uploading' | 'processing' | 'completed' | 'failed';
export type RecordType = 'baptism' | 'marriage' | 'funeral';

export interface OCRJobRow {
  id: number;
  church_id: number;
  original_filename: string;
  filename?: string;
  status: OCRJobStatus;
  record_type: RecordType;
  confidence_score?: number | null;
  language?: string | null;
  created_at?: string;
  updated_at?: string;
  ocr_text_preview?: string | null;
  has_ocr_text?: boolean;
  error_message?: string | null;
}

export interface OCRJobDetail extends OCRJobRow {
  ocr_text: string | null;
  ocr_result: any | null;
  file_path?: string;
  mapping?: any | null;
}
```

#### 2. OCR Jobs Hook
**File:** `front-end/src/features/devel-tools/om-ocr/hooks/useOcrJobs.ts`

**Purpose:** Manages OCR job list fetching, polling, and caching.

**Features:**
- Automatic polling every 3 seconds when jobs are processing
- AbortController for request cleanup on unmount
- Detail caching to avoid redundant fetches
- Optimistic UI updates for record type changes

**Key Functions:**
- `fetchJobs()`: Fetches lightweight job list
- `fetchJobDetail(jobId)`: Fetches full job details with OCR text
- `updateRecordType(jobId, type)`: PATCH record type
- `retryJob(jobId)`: Retry failed jobs

#### 3. Processed Images Table
**File:** `front-end/src/features/devel-tools/om-ocr/components/ProcessedImagesTable.tsx`

**Features:**
- MUI Table with blur-to-reveal functionality
- Thumbnail and OCR text preview blur (10px) with 250ms transition
- "Reveal All / Hide All" toggle
- Status chips with icons (CircularProgress for processing)
- Record type dropdown with PATCH on change
- Preview dialog with full image and OCR text
- Copy to clipboard functionality

**Blur-to-Reveal CSS:**
```css
filter: blur(10px);
transition: filter 250ms ease;
```

#### 4. Enhanced OCR Uploader (Modified)
**File:** `front-end/src/features/devel-tools/om-ocr/EnhancedOCRUploader.tsx`

**Changes:**
- Integrated `useOcrJobs` hook
- Added `ProcessedImagesTable` component
- Calls `refreshOcrJobs()` after each upload completes
- Removed inline job list display

---

## Backend Implementation

### Files Modified

#### 1. Main Server Routes
**File:** `server/src/index.ts`

**New/Updated Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/church/:churchId/ocr/jobs` | List jobs (lightweight) |
| GET | `/api/church/:churchId/ocr/jobs/:jobId` | Job detail with OCR text from files |
| GET | `/api/church/:churchId/ocr/jobs/:jobId/image` | Stream job image |
| PATCH | `/api/church/:churchId/ocr/jobs/:jobId` | Update record_type |
| POST | `/api/church/:churchId/ocr/jobs/:jobId/retry` | Retry failed job |
| POST | `/api/church/:churchId/ocr/jobs/:jobId/mapping` | Save field mapping |
| GET | `/api/church/:churchId/ocr/jobs/:jobId/mapping` | Get saved mapping |

**Key Implementation Details:**

- **Dynamic Column Detection:** Queries use `SHOW COLUMNS FROM ocr_jobs` to build SELECT dynamically
- **File-based OCR Reading:** Detail endpoint reads `_ocr.txt` and `_ocr.json` files
- **Graceful Degradation:** Falls back to DB values if files don't exist

#### 2. OCR Processing Route
**File:** `server/routes/ocr.js`

**`processOcrJobAsync` Function:**

This async function handles OCR processing after upload:

1. Updates job status to 'processing'
2. Calls Google Vision AI
3. Extracts text and confidence scores
4. Writes results to files:
   - `{filename}_ocr.txt` - Human-readable text
   - `{filename}_ocr.json` - Full Vision API response (bounding boxes)
5. Moves image from `uploaded/` to `processed/`
6. Updates job status to 'completed' in database

---

## Google Vision AI Configuration

### Environment Variables

**File:** `server/.env` or `server/.env.production`

```bash
# Google Cloud Project ID
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Path to service account credentials JSON file
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Alternative credential path (if different)
GOOGLE_VISION_KEY_PATH=/path/to/service-account-key.json
```

### Required Google Cloud Setup

1. **Create a Google Cloud Project**
2. **Enable Cloud Vision API**
   - Go to: APIs & Services > Library
   - Search for "Cloud Vision API"
   - Click Enable

3. **Create Service Account**
   - Go to: IAM & Admin > Service Accounts
   - Create new service account
   - Grant role: "Cloud Vision API User"
   - Create JSON key and download

4. **Upload Key to Server**
   ```bash
   # Place in server directory
   /var/www/orthodoxmetrics/prod/server/google-vision-key.json
   
   # Set permissions
   chmod 600 google-vision-key.json
   ```

5. **Update .env**
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/var/www/orthodoxmetrics/prod/server/google-vision-key.json
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   ```

### Vision API Request Configuration

**File:** `server/routes/ocr.js` (line ~896)

```javascript
const request = {
  image: { content: imageBuffer },
  imageContext: {
    languageHints: [language, 'en'], // Primary + English fallback
  },
  features: [
    { type: 'TEXT_DETECTION' },        // Word-level detection
    { type: 'DOCUMENT_TEXT_DETECTION' } // Full document with structure
  ]
};
```

### Vision Client Initialization

```javascript
const visionClientConfig = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
};

if (process.env.GOOGLE_VISION_KEY_PATH) {
  visionClientConfig.keyFilename = process.env.GOOGLE_VISION_KEY_PATH;
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  visionClientConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const client = new vision.ImageAnnotatorClient(visionClientConfig);
```

### Confidence Score Calculation

```javascript
// Try to get confidence from fullTextAnnotation pages
if (fullTextAnnotation.pages) {
  fullTextAnnotation.pages.forEach(page => {
    if (page.confidence !== undefined) {
      totalConfidence += page.confidence;
      count++;
    }
    // Also check blocks for confidence
    (page.blocks || []).forEach(block => {
      if (block.confidence !== undefined) {
        totalConfidence += block.confidence;
        count++;
      }
    });
  });
}

// Fallback to textAnnotations confidence
if (count === 0) {
  textAnnotations.forEach(annotation => {
    if (annotation.confidence !== undefined) {
      totalConfidence += annotation.confidence;
      count++;
    }
  });
}

const confidence = count > 0 ? totalConfidence / count : 0.85;
```

---

## File Storage Structure

```
/var/www/orthodoxmetrics/prod/uploads/
└── om_church_46/
    ├── uploaded/           # Initial upload location
    │   └── (empty after processing)
    │
    └── processed/          # After OCR completion
        ├── image1.jpg                    # Processed image
        ├── image1_ocr.txt               # Extracted text (human-readable)
        ├── image1_ocr.json              # Full Vision API response
        ├── image2.jpg
        ├── image2_ocr.txt
        └── image2_ocr.json
```

### OCR Text File Format (`_ocr.txt`)

```
=== OCR Result for Job 123 ===
File: IMG_2024_10_25_12_32_43S.jpg
Processed: 2024-12-18T01:34:55.000Z
Confidence: 77.2%
Processing Time: 1434ms

=== Extracted Text ===
18091
BAPTIZED
(KARAN) ANN KULINA - DAUGHTER OF
JOHN KULINA, JR AND VICTORIA (RICCARDO) RULL
155 So. 6TH AVENUE, MANVILLE, N.J.
BORN: OCT. 11, 1965
BAPTISM AND CHRISMATION - OCT 31, 1965
SS. PETER AND PAUL CHURCH, MANVILLE
GODPARENTS - NICHOLAS KULINA, STEPHANIE KACHEK
Father Theodore Salmay

=== End ===
```

### OCR JSON File Format (`_ocr.json`)

```json
{
  "textAnnotations": [
    {
      "description": "Full extracted text...",
      "boundingPoly": {
        "vertices": [
          {"x": 0, "y": 0},
          {"x": 1000, "y": 0},
          {"x": 1000, "y": 1500},
          {"x": 0, "y": 1500}
        ]
      },
      "confidence": 0.95
    },
    {
      "description": "BAPTIZED",
      "boundingPoly": {
        "vertices": [...]
      }
    }
  ],
  "fullTextAnnotation": {
    "pages": [...],
    "text": "Full extracted text..."
  }
}
```

---

## API Endpoints

### List OCR Jobs (Lightweight)

```
GET /api/church/:churchId/ocr/jobs?limit=200
```

**Response:**
```json
{
  "jobs": [
    {
      "id": "123",
      "church_id": "46",
      "original_filename": "IMG_2024_10_25.jpg",
      "filename": "ocr_1766021694118.jpg",
      "status": "completed",
      "confidence_score": 0.772,
      "record_type": "baptism",
      "language": "en",
      "created_at": "2024-12-18T01:34:54.000Z",
      "updated_at": "2024-12-18T01:34:56.000Z",
      "ocr_text_preview": "[OCR text available - click to view]",
      "has_ocr_text": true,
      "error_message": null
    }
  ]
}
```

### Get Job Detail (Full OCR Text)

```
GET /api/church/:churchId/ocr/jobs/:jobId
```

**Response:**
```json
{
  "id": "123",
  "original_filename": "IMG_2024_10_25.jpg",
  "filename": "ocr_1766021694118.jpg",
  "file_path": "/var/www/.../processed/ocr_1766021694118.jpg",
  "status": "completed",
  "record_type": "baptism",
  "language": "en",
  "confidence_score": 0.772,
  "created_at": "2024-12-18T01:34:54.000Z",
  "updated_at": "2024-12-18T01:34:56.000Z",
  "ocr_text": "18091\nBAPTIZED\n(KARAN) ANN KULINA...",
  "ocr_result": {
    "textAnnotations": [...],
    "fullTextAnnotation": {...}
  },
  "has_ocr_text": true,
  "mapping": null
}
```

### Stream Job Image

```
GET /api/church/:churchId/ocr/jobs/:jobId/image
```

**Response:** Binary image stream with appropriate Content-Type header.

### Update Job Record Type

```
PATCH /api/church/:churchId/ocr/jobs/:jobId
Content-Type: application/json

{
  "record_type": "marriage"
}
```

### Retry Failed Job

```
POST /api/church/:churchId/ocr/jobs/:jobId/retry
```

### Save Field Mapping

```
POST /api/church/:churchId/ocr/jobs/:jobId/mapping
Content-Type: application/json

{
  "record_type": "baptism",
  "mapping_json": {
    "first_name": { "value": "Ann", "line": 2 },
    "last_name": { "value": "Kulina", "line": 2 },
    "baptism_date": { "value": "Oct 31, 1965", "line": 7 }
  }
}
```

---

## Database Schema

### Table: `ocr_jobs` (per church database)

```sql
CREATE TABLE ocr_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  filename VARCHAR(255),
  original_filename VARCHAR(255),
  file_path VARCHAR(500),
  file_size INT,
  mime_type VARCHAR(100),
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  record_type ENUM('baptism', 'marriage', 'funeral') DEFAULT 'baptism',
  language VARCHAR(10) DEFAULT 'en',
  confidence_score DECIMAL(5,4),
  processing_time_ms INT,
  ocr_text LONGTEXT,           -- Optional: now stored in files
  ocr_result LONGTEXT,         -- Optional: now stored in files
  ocr_result_json JSON,        -- Optional: bounding box data
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_church_id (church_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

### Table: `ocr_mappings` (per church database)

```sql
CREATE TABLE ocr_mappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ocr_job_id INT NOT NULL,
  record_type VARCHAR(50) NOT NULL,
  mapping_json LONGTEXT NOT NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_ocr_job (ocr_job_id),
  FOREIGN KEY (ocr_job_id) REFERENCES ocr_jobs(id) ON DELETE CASCADE
);
```

---

## Configuration Parameters

### Frontend OCR Settings

| Parameter | Default | Description |
|-----------|---------|-------------|
| `engine` | `'Google Vision'` | OCR engine selection |
| `dpi` | `300` | Image DPI for processing |
| `confidenceThreshold` | `85` | Minimum confidence % |
| `autoDetectLanguage` | `true` | Auto-detect document language |
| `forceGrayscale` | `false` | Convert to grayscale before OCR |
| `deskewImages` | `true` | Auto-correct image skew |
| `language` | `'en'` | Primary language hint |

### Upload Limits

| Parameter | Value |
|-----------|-------|
| Max file size | 10MB per file |
| Max batch size | 50 files |
| Accepted formats | JPG, PNG, TIFF |

### Polling Configuration

| Parameter | Value |
|-----------|-------|
| Poll interval | 3000ms (3 seconds) |
| Poll condition | Any job with status: queued, uploading, processing |
| Auto-stop | When all jobs are completed/failed |

---

## Troubleshooting

### Common Issues

#### 1. "No processed images yet" in UI

**Cause:** Jobs exist but aren't being fetched or displayed.

**Solutions:**
- Click "Refresh" button on Processed Images section
- Check browser console for `[useOcrJobs]` logs
- Verify church is selected
- Check backend logs for API errors

#### 2. Google Vision credentials error

**Error:** `Could not load the default credentials`

**Solution:**
```bash
# Check .env file
cat /var/www/orthodoxmetrics/prod/server/.env | grep GOOGLE

# Verify file exists
ls -la /var/www/orthodoxmetrics/prod/server/google-vision-key.json

# Restart PM2
pm2 restart orthodox-backend
```

#### 3. OCR text not showing in detail view

**Cause:** Text files not being read properly.

**Check:**
```bash
# Verify files exist
ls -la /var/www/orthodoxmetrics/prod/uploads/om_church_46/processed/

# Check file content
cat /var/www/orthodoxmetrics/prod/uploads/om_church_46/processed/*_ocr.txt | head -20
```

#### 4. Images stuck in "uploaded" directory

**Cause:** OCR processing failed silently.

**Check:**
```bash
# Check PM2 logs
pm2 logs orthodox-backend --err --lines 100

# Look for Vision API errors
pm2 logs orthodox-backend | grep -i "vision\|ocr"
```

### Useful Commands

```bash
# Rebuild and restart server
cd /var/www/orthodoxmetrics/prod/server
npm run build
pm2 restart orthodox-backend

# Rebuild frontend
cd /var/www/orthodoxmetrics/prod/front-end
npm run build

# Check OCR job status in database
mysql -u orthodoxapps -p om_church_46 -e "SELECT id, original_filename, status, confidence_score FROM ocr_jobs ORDER BY created_at DESC LIMIT 10"

# Count processed files
ls -la /var/www/orthodoxmetrics/prod/uploads/om_church_46/processed/*.txt | wc -l
```

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2024-12-18 | 1.0.0 | Initial implementation with file-based OCR storage |

---

## Dependencies

### Backend (package.json)

```json
{
  "@google-cloud/vision": "^4.x",
  "google-auth-library": "^9.x",
  "multer": "^1.4.x",
  "express": "^4.x",
  "mysql2": "^3.x"
}
```

### Frontend (package.json)

```json
{
  "@mui/material": "^5.x",
  "@tabler/icons-react": "^2.x",
  "axios": "^1.x",
  "react": "^18.x"
}
```

---

*End of Documentation*

