# OCR Enhanced Uploader - Complete Workflow Documentation

**Date:** December 18, 2024  
**Version:** 1.0  
**Status:** Production Implementation Guide

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Complete Workflow](#complete-workflow)
4. [Component Breakdown](#component-breakdown)
5. [Data Flow](#data-flow)
6. [API Endpoints](#api-endpoints)
7. [Database Schema](#database-schema)
8. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
9. [Testing Checklist](#testing-checklist)

---

## Overview

The **OCR Enhanced Uploader** is a production-grade system for digitizing Orthodox Church sacramental records (baptism, marriage, funeral) from scanned images. It provides a complete workflow from image upload to final database record creation.

### Key Features

- **Batch Image Upload**: Drag & drop multiple images (JPG, PNG, TIFF)
- **Multi-Church Support**: SuperAdmin can select target church database
- **OCR Processing**: Google Vision AI for text extraction
- **Field Mapping**: Manual and auto-mapping of OCR text to database fields
- **Fusion Workflow**: Advanced multi-entry detection and structured extraction
- **Review & Finalize**: Validation, finalization, and commit to database
- **Sticky Defaults**: Restrict mapping to default database columns
- **Progress Tracking**: Real-time status updates for uploads and processing

---

## Architecture

### Component Hierarchy

```
EnhancedOCRUploader (Main Container)
├── Upload Zone (Drag & Drop)
├── Advanced Options (OCR Settings + Sticky Defaults)
├── Upload Queue (File Cards with Progress)
├── Processed Images Table
│   └── InspectionPanel (Opens on row click)
│       ├── Text Tab (Raw OCR text)
│       ├── Structured Tab (JSON view)
│       ├── Mapping Tab (Field mapping UI)
│       ├── Fusion Tab (Multi-entry workflow)
│       └── Review & Finalize Tab (Final validation & commit)
└── Church Selector (SuperAdmin only)
```

### State Management

- **Local State**: React `useState` for UI state
- **API State**: `useOcrJobs` hook for job listing
- **Persistence**: `localStorage` for sticky defaults
- **Session**: Cookie-based authentication

---

## Complete Workflow

### Phase 1: Image Upload

**User Actions:**
1. Navigate to `/devel/enhanced-ocr-uploader`
2. Select target church (SuperAdmin) or use default church
3. Drag & drop images or click to browse
4. Configure Advanced Options (optional):
   - Auto-detect language
   - Force grayscale
   - Deskew images
   - OCR language selection
   - Sticky defaults (restrict to default columns)

**System Actions:**
1. Validate file types (JPG, PNG, TIFF) and size (max 10MB)
2. Create `UploadFile` objects with status `'queued'`
3. Display files in upload queue with progress indicators
4. On "Start Upload" click:
   - Change status to `'uploading'`
   - POST to `/api/church/:churchId/ocr/upload`
   - Update progress (0-100%)
   - On completion: status → `'processing'` → `'complete'`

**Backend Processing:**
```
POST /api/church/:churchId/ocr/upload
├── Save file to: prod/uploads/om_church_##/uploaded/
├── Create ocr_jobs record (status: 'pending')
├── Queue OCR processing job
└── Return job ID
```

**File Movement:**
```
uploaded/ → que/ → processed/ (on success) OR failed/ (on error)
```

---

### Phase 2: OCR Processing

**System Actions (Backend):**
1. Background job picks up pending OCR jobs
2. Move image from `uploaded/` to `que/`
3. Call Google Vision API with OCR settings:
   - Language (from settings or auto-detect)
   - DPI (default: 300)
   - Confidence threshold (default: 85%)
   - Preprocessing (grayscale, deskew if enabled)
4. Store results:
   - `ocr_text`: Full text string
   - `ocr_result`: JSON (LONGTEXT) with bounding boxes
   - `confidence_score`: Average confidence
   - Update status: `'pending'` → `'processing'` → `'completed'` or `'failed'`

**Database Updates:**
```sql
UPDATE ocr_jobs SET
  status = 'completed',
  ocr_text = '...',
  ocr_result = '...',
  confidence_score = 0.88,
  updated_at = NOW()
WHERE id = ?
```

---

### Phase 3: Field Mapping (Two Paths)

#### Path A: Simple Mapping Tab

**User Actions:**
1. Click processed image row → Opens InspectionPanel
2. Click "Mapping" tab
3. View detected text (left column) and record fields (right column)
4. Map fields:
   - Click detected text to insert into selected field
   - Type manually
   - Use "Auto-Map" for heuristic extraction
5. Click "Save Mapping" → Saves to `ocr_mappings` table
6. Click "Send to Review & Finalize":
   - Creates fusion draft
   - Marks as ready for review
   - Switches to Review & Finalize tab

**Data Flow:**
```
MappingTab
├── POST /api/church/:churchId/ocr/jobs/:jobId/mapping
│   └── Saves mapping_json to ocr_mappings table
├── POST /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts
│   └── Creates draft in ocr_fused_drafts table
└── POST /api/church/:churchId/ocr/jobs/:jobId/fusion/ready-for-review
    └── Updates workflow_status to 'in_review'
```

**Field Mapping Logic:**
- Field keys (UI) → Database columns via `FIELD_TO_COLUMN_MAP`
- Example: `first_name` (UI) → `first_name` (DB)
- Example: `priest` (UI) → `clergy` (DB)
- Example: `dob` (UI) → `birth_date` (DB)

**Sticky Defaults:**
- If enabled: Only show fields that map to default columns
- Auto-map only populates default columns
- Prevents mapping to custom/undefined columns

#### Path B: Fusion Workflow

**User Actions:**
1. Click processed image → Opens InspectionPanel
2. Click "Fusion" tab → Opens full-screen dialog
3. **Step 1: Detect Entries**
   - Auto-detects number of records on page
   - Manual override available
   - Shows bounding boxes on image
4. **Step 2: Anchor Labels**
   - Detects form labels (NAME OF CHILD, DATE OF BIRTH, etc.)
   - User can manually anchor labels
5. **Step 3: Map Fields**
   - Auto-map or manual entry
   - Shows confidence scores
   - Auto-save enabled
6. **Step 4: Save & Commit**
   - "Save Current Draft" or "Save All Drafts"
   - "Send to Review & Finalize"

**Entry Detection Algorithm:**
```
1. Parse Vision JSON → Extract blocks/lines
2. Score candidates (area, text density, anchor labels)
3. Apply Non-Maximum Suppression (NMS):
   - IoU ≥ 0.5 OR containment ≥ 80% → merge
   - Keep highest scoring box
4. Check single-record dominance:
   - If one box covers >40% of page and overlaps all others → collapse to 1
5. Apply hard filters:
   - Minimum area (5% of page)
   - Aspect ratio (0.2-5.0)
6. Return final entries
```

---

### Phase 4: Review & Finalize

**User Actions:**
1. Navigate to "Review & Finalize" tab (should auto-switch after "Send to Review")
2. View list of drafts in review
3. Select a draft entry
4. Review mapped fields in right panel
5. Click "Validate" → Checks for missing required fields
6. Fix any validation errors
7. Click "Finalize" → Marks draft as finalized
8. Click "Commit to Database" → Creates actual record

**Data Flow:**
```
ReviewFinalizeTab
├── GET /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts
│   └── Loads drafts with workflow_status = 'in_review' or 'finalized'
├── POST /api/church/:churchId/ocr/jobs/:jobId/review/validate
│   └── Returns missing_fields, warnings, normalized payload
├── POST /api/church/:churchId/ocr/jobs/:jobId/review/finalize
│   └── Updates workflow_status = 'finalized', writes to ocr_finalize_history
└── POST /api/church/:churchId/ocr/jobs/:jobId/review/commit
    ├── Validates payload
    ├── Maps to record table (baptism_records, marriage_records, funeral_records)
    ├── Inserts into database
    ├── Updates workflow_status = 'committed'
    └── Returns created_record_id
```

**Validation Rules:**
- **Baptism**: `first_name`, `last_name`, `reception_date`, `clergy` required
- **Marriage**: `mdate`, `fname_groom`, `lname_groom`, `fname_bride`, `lname_bride`, `clergy` required
- **Funeral**: `burial_date`, `name`, `clergy` required

**Commit Process:**
1. Validate all required fields present
2. Normalize dates (MM/DD/YYYY → YYYY-MM-DD)
3. Map payload keys to database columns
4. Begin transaction
5. Insert into `om_church_##.{record_type}_records`
6. Append note: "Finalized via Review & Finalize on MM/DD/YYYY"
7. Update draft: `workflow_status = 'committed'`, `committed_record_id = ?`
8. Commit transaction

---

## Component Breakdown

### EnhancedOCRUploader.tsx

**Purpose:** Main container component

**Key State:**
- `files`: Upload queue
- `selectedChurchId`: Target church database
- `selectedJobDetail`: Currently viewed OCR job
- `showMappingTab`: Toggle between MappingTab and InspectionPanel
- `stickyDefaults`: Persisted to localStorage

**Key Functions:**
- `handleFileSelect`: Add files to queue
- `handleUpload`: Upload files to backend
- `handleSelectFile`: Load job detail and show InspectionPanel

**Props Passed:**
- `onSendToReview`: Callback to switch to Review tab
- `initialTab`: Tab index to show in InspectionPanel

---

### InspectionPanel.tsx

**Purpose:** Side-by-side image and results viewer

**Tabs:**
1. **Text** (index 0): Raw OCR text with search
2. **Structured** (index 1): JSON view of OCR result
3. **Mapping** (index 2): Field mapping UI
4. **Fusion** (index 3): Opens full-screen Fusion dialog
5. **Review & Finalize** (index 4): Final validation and commit

**Key State:**
- `activeTab`: Current tab index
- `jobOcrText`: Parsed OCR text
- `jobOcrResult`: Parsed Vision JSON

**Tab Switching Logic:**
- `initialTab` prop triggers `useEffect` to switch tabs
- Fallback: Directly clicks tab button if state update fails

---

### MappingTab.tsx

**Purpose:** Simple field mapping interface

**Features:**
- Left: Detected text tokens (click to insert)
- Right: Record fields (text inputs)
- Auto-Map: Heuristic pattern matching
- Sticky Defaults: Filters fields based on localStorage setting

**Key Functions:**
- `handleAutoMap`: Pattern-based extraction
- `handleSaveMapping`: Save to `ocr_mappings`
- `handleSendToReview`: Create fusion draft and switch to Review tab

**Field Mapping:**
```typescript
FIELD_TO_COLUMN_MAP = {
  baptism: {
    'first_name': 'first_name',
    'priest': 'clergy',
    'dob': 'birth_date',
    // ...
  }
}
```

**Required Field Validation:**
- Checks `REQUIRED_COLUMNS_BY_TABLE[recordType]`
- Maps UI field keys to DB columns
- Shows error if missing

---

### FusionTab.tsx

**Purpose:** Advanced multi-entry extraction workflow

**Steps:**
1. **Detect Entries**: Vision-based segmentation
2. **Anchor Labels**: Find form labels
3. **Map Fields**: Extract values using label anchors
4. **Save & Commit**: Save drafts, send to review

**Key State:**
- `entries`: Detected entry objects
- `selectedEntryIndex`: Currently editing entry
- `entryData`: Map of entry_index → {labels, fields, recordType}
- `drafts`: Saved drafts from server

**Auto-Save:**
- Debounced save on field changes
- Saves to `/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts/:entryIndex`

**Entry Detection:**
- Uses `detectEntries()` from `visionParser.ts`
- Applies NMS to collapse duplicates
- Scores candidates by area, text density, anchor labels

---

### ReviewFinalizeTab.tsx

**Purpose:** Final validation and database commit

**Features:**
- Draft list (left): Shows all drafts in review
- Review panel (right): Field grid for selected draft
- Validation: Checks required fields
- Finalize: Marks draft as finalized
- Commit: Inserts into database

**Workflow States:**
- `draft`: Initial save
- `in_review`: Sent to review
- `finalized`: Validated and finalized
- `committed`: Written to database

**Key Functions:**
- `loadDrafts`: Fetch drafts from API
- `handleValidate`: Validate selected draft
- `handleFinalize`: Mark as finalized
- `handleCommit`: Insert into record table

---

## Data Flow

### Upload Flow

```
User selects files
  ↓
EnhancedOCRUploader creates UploadFile objects
  ↓
User clicks "Start Upload"
  ↓
POST /api/church/:churchId/ocr/upload
  ↓
Backend saves to uploaded/ directory
  ↓
Creates ocr_jobs record (status: 'pending')
  ↓
Background job processes OCR
  ↓
Updates ocr_jobs (status: 'completed', ocr_text, ocr_result)
  ↓
Frontend polls/refreshes → Shows in Processed Images table
```

### Mapping Flow

```
User clicks processed image
  ↓
InspectionPanel opens
  ↓
User clicks "Mapping" tab
  ↓
MappingTab loads existing mapping (if any)
  ↓
User maps fields (manual or auto-map)
  ↓
User clicks "Send to Review & Finalize"
  ↓
POST /api/church/:churchId/ocr/jobs/:jobId/mapping (save mapping)
  ↓
POST /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts (create draft)
  ↓
POST /api/church/:churchId/ocr/jobs/:jobId/fusion/ready-for-review
  ↓
InspectionPanel switches to "Review & Finalize" tab (index 4)
  ↓
ReviewFinalizeTab loads drafts
```

### Review & Commit Flow

```
ReviewFinalizeTab loads drafts (workflow_status = 'in_review')
  ↓
User selects draft entry
  ↓
User clicks "Validate"
  ↓
POST /api/church/:churchId/ocr/jobs/:jobId/review/validate
  ↓
Shows missing fields / warnings
  ↓
User fixes issues
  ↓
User clicks "Finalize"
  ↓
POST /api/church/:churchId/ocr/jobs/:jobId/review/finalize
  ↓
Updates workflow_status = 'finalized'
  ↓
User clicks "Commit to Database"
  ↓
POST /api/church/:churchId/ocr/jobs/:jobId/review/commit
  ↓
Backend inserts into om_church_##.{record_type}_records
  ↓
Updates draft: workflow_status = 'committed', committed_record_id = ?
```

---

## API Endpoints

### Upload & Processing

```
POST /api/church/:churchId/ocr/upload
Body: FormData { image: File }
Response: { jobId: number, filename: string }

GET /api/church/:churchId/ocr/jobs?limit=100
Response: { jobs: OCRJobRow[] }

GET /api/church/:churchId/ocr/jobs/:jobId
Response: { job: JobDetail }
```

### Mapping

```
POST /api/church/:churchId/ocr/jobs/:jobId/mapping
Body: { record_type: string, mapping_json: object }
Response: { success: boolean }

GET /api/church/:churchId/ocr/jobs/:jobId/mapping
Response: { mapping_json: object, record_type: string }
```

### Fusion Workflow

```
GET /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts
Response: { drafts: DraftEntry[] }

POST /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts
Body: { entries: [{ entry_index, record_type, payload_json, bbox_json }] }
Response: { drafts: DraftEntry[] }

PUT /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts/:entryIndex
Body: { payload_json: object, bbox_json: object }
Response: { draft: DraftEntry }

POST /api/church/:churchId/ocr/jobs/:jobId/fusion/ready-for-review
Body: { entry_indexes: number[] }
Response: { success: boolean }
```

### Review & Finalize

```
POST /api/church/:churchId/ocr/jobs/:jobId/review/validate
Response: { 
  entry_index: number,
  missing_fields: string[],
  warnings: string[],
  normalized_payload: object
}

POST /api/church/:churchId/ocr/jobs/:jobId/review/finalize
Body: { entry_index: number }
Response: { success: boolean, finalized_at: string }

POST /api/church/:churchId/ocr/jobs/:jobId/review/commit
Body: { draft_ids: number[] }
Response: { 
  success: boolean,
  committed_records: [{ draft_id, record_id }]
}
```

---

## Database Schema

### ocr_jobs (per church database: om_church_##)

```sql
CREATE TABLE ocr_jobs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  filename VARCHAR(255),
  original_filename VARCHAR(255),
  status ENUM('pending', 'processing', 'completed', 'failed'),
  record_type ENUM('baptism', 'marriage', 'funeral'),
  language VARCHAR(10),
  confidence_score DECIMAL(5,2),
  ocr_text LONGTEXT,
  ocr_result LONGTEXT,  -- JSON string
  file_size INT,
  mime_type VARCHAR(50),
  pages INT,
  church_id INT,
  error TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### ocr_mappings (per church database)

```sql
CREATE TABLE ocr_mappings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ocr_job_id INT,
  church_id INT,
  record_type ENUM('baptism', 'marriage', 'funeral'),
  mapping_json JSON,
  bbox_links JSON,
  created_by VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (ocr_job_id) REFERENCES ocr_jobs(id)
);
```

### ocr_fused_drafts (per church database)

```sql
CREATE TABLE ocr_fused_drafts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ocr_job_id INT,
  entry_index INT,
  record_type ENUM('baptism', 'marriage', 'funeral'),
  record_number VARCHAR(50),
  payload_json LONGTEXT,  -- JSON string
  bbox_json LONGTEXT,     -- JSON string
  workflow_status ENUM('draft', 'in_review', 'finalized', 'committed'),
  last_saved_at TIMESTAMP,
  finalized_at TIMESTAMP,
  finalized_by VARCHAR(255),
  committed_record_id INT,
  commit_error TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE KEY (ocr_job_id, entry_index),
  FOREIGN KEY (ocr_job_id) REFERENCES ocr_jobs(id)
);
```

### ocr_finalize_history (per church database)

```sql
CREATE TABLE ocr_finalize_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ocr_job_id INT,
  entry_index INT,
  record_type ENUM('baptism', 'marriage', 'funeral'),
  record_number VARCHAR(50),
  created_record_id INT,
  finalized_by VARCHAR(255),
  finalized_at TIMESTAMP,
  committed_at TIMESTAMP,
  source_filename VARCHAR(255),
  created_at TIMESTAMP
);
```

---

## Common Issues & Troubleshooting

### Issue 1: "Send to Review & Finalize" doesn't switch tabs

**Symptoms:**
- Success message appears
- Tab doesn't switch to Review & Finalize
- Console shows: `[MappingTab] onSendToReview callback not provided`

**Root Causes:**
1. MappingTab used without `onSendToReview` prop
2. InspectionPanel `initialTab` prop not working
3. State update not triggering re-render

**Solutions:**
- ✅ Ensure `onSendToReview` callback is passed to MappingTab
- ✅ Check `initialTab` prop is set correctly (value: 4)
- ✅ Verify `useEffect` in InspectionPanel is firing
- ✅ Check console for `[InspectionPanel] initialTab prop changed` log
- ✅ Fallback: Tab button click should work if state fails

**Debug Steps:**
```javascript
// In browser console:
// 1. Check if callback exists
console.log(document.querySelector('[data-testid="mapping-tab"]')?.props);

// 2. Check activeTab state
// Look for: [InspectionPanel] Current activeTab: X

// 3. Manually trigger tab switch
document.querySelectorAll('[role="tab"]')[4].click();
```

---

### Issue 2: Drafts not appearing in Review & Finalize

**Symptoms:**
- "Send to Review" succeeds
- Review tab shows "No drafts"
- Console shows draft was created

**Root Causes:**
1. `workflow_status` not set to `'in_review'`
2. Draft query filtering incorrectly
3. `churchId` or `jobId` mismatch

**Solutions:**
- ✅ Verify `POST /fusion/ready-for-review` returns success
- ✅ Check database: `SELECT * FROM ocr_fused_drafts WHERE workflow_status = 'in_review'`
- ✅ Verify `churchId` and `jobId` match in API calls
- ✅ Check ReviewFinalizeTab `loadDrafts` function is called

**Debug Steps:**
```sql
-- Check drafts exist
SELECT id, ocr_job_id, entry_index, workflow_status 
FROM ocr_fused_drafts 
WHERE ocr_job_id = ? AND workflow_status = 'in_review';

-- Check API response
-- In browser Network tab, check:
GET /api/church/46/ocr/jobs/130/fusion/drafts
```

---

### Issue 3: Field mapping not saving

**Symptoms:**
- User maps fields
- Clicks "Save Mapping"
- Success message appears
- Fields empty on reload

**Root Causes:**
1. Mapping not persisted to database
2. Mapping not loaded on component mount
3. Field key → column mapping incorrect

**Solutions:**
- ✅ Check `POST /mapping` returns 200
- ✅ Verify `mapping_json` in `ocr_mappings` table
- ✅ Check `useEffect` in MappingTab loads mapping
- ✅ Verify `FIELD_TO_COLUMN_MAP` is correct for record type

**Debug Steps:**
```sql
-- Check mapping exists
SELECT mapping_json FROM ocr_mappings WHERE ocr_job_id = ?;

-- Check API response
POST /api/church/46/ocr/jobs/130/mapping
-- Should return: { success: true }
```

---

### Issue 4: Sticky Defaults not filtering fields

**Symptoms:**
- Sticky Defaults enabled
- All fields still visible
- Auto-map populates non-default fields

**Root Causes:**
1. localStorage not loading
2. `isStickyEnabled` not calculated correctly
3. Field filtering logic not applied

**Solutions:**
- ✅ Check localStorage: `localStorage.getItem('om.enhancedOcrUploader.stickyDefaults.v1')`
- ✅ Verify `getStickyDefault()` returns correct value
- ✅ Check `fields` useMemo filters correctly
- ✅ Verify `FIELD_TO_COLUMN_MAP` has all field keys

**Debug Steps:**
```javascript
// In browser console:
// 1. Check localStorage
JSON.parse(localStorage.getItem('om.enhancedOcrUploader.stickyDefaults.v1'));

// 2. Check filtered fields
// Look for: [MappingTab] Filtered fields count: X
```

---

### Issue 5: Commit fails with validation errors

**Symptoms:**
- Click "Commit to Database"
- Error: "Missing required fields"
- Fields appear filled in UI

**Root Causes:**
1. Field key → column mapping mismatch
2. Required fields not in payload
3. Date format incorrect

**Solutions:**
- ✅ Check `FIELD_TO_COLUMN_MAP` for record type
- ✅ Verify payload contains all required columns
- ✅ Check date normalization (MM/DD/YYYY → YYYY-MM-DD)
- ✅ Review validation response: `POST /review/validate`

**Debug Steps:**
```javascript
// Check payload before commit
console.log('[Review] Payload:', payload);

// Check validation response
POST /api/church/46/ocr/jobs/130/review/validate
// Should return: { missing_fields: [], warnings: [] }
```

---

## Testing Checklist

### Upload Flow
- [ ] Drag & drop single image
- [ ] Drag & drop multiple images (max 50)
- [ ] Click to browse files
- [ ] File type validation (JPG, PNG, TIFF only)
- [ ] File size validation (max 10MB)
- [ ] Upload progress shows correctly
- [ ] Files move to processed/failed after OCR
- [ ] Error handling for failed uploads

### OCR Processing
- [ ] Job appears in Processed Images table
- [ ] Status updates: pending → processing → completed
- [ ] Confidence score displays
- [ ] OCR text available in Text tab
- [ ] OCR result JSON available in Structured tab

### Mapping Tab
- [ ] Detected text displays in left column
- [ ] Record fields display in right column
- [ ] Click text to insert into field works
- [ ] Manual typing works
- [ ] Auto-Map populates fields
- [ ] Save Mapping persists to database
- [ ] Mapping loads on component mount
- [ ] Required fields marked with *
- [ ] Sticky Defaults filters fields when enabled
- [ ] Send to Review switches to Review tab

### Fusion Workflow
- [ ] Detect Entries finds correct number
- [ ] Manual entry count override works
- [ ] Anchor Labels detects form labels
- [ ] Map Fields shows field inputs
- [ ] Auto-save triggers on field changes
- [ ] Save Draft creates draft in database
- [ ] Send to Review marks as ready
- [ ] Hide completed toggle works
- [ ] In Progress chip shows correctly

### Review & Finalize
- [ ] Drafts load from database
- [ ] Draft list shows correct entries
- [ ] Select draft shows fields in right panel
- [ ] Validate checks required fields
- [ ] Validation errors display correctly
- [ ] Finalize marks draft as finalized
- [ ] Commit inserts into record table
- [ ] Commit updates draft status
- [ ] History tab shows finalized records

### Sticky Defaults
- [ ] Checkbox persists to localStorage
- [ ] Survives page refresh
- [ ] Filters fields in Mapping tab
- [ ] Filters fields in Fusion workflow
- [ ] Auto-map respects sticky defaults
- [ ] Info popover shows on hover

### Error Handling
- [ ] Network errors show user-friendly messages
- [ ] Validation errors display clearly
- [ ] Failed uploads show retry option
- [ ] Console logs help debug issues

---

## Known Limitations

1. **Tab Switching**: Sometimes requires manual click if state update fails
2. **Auto-Save**: May not trigger on rapid field changes
3. **Entry Detection**: May incorrectly detect multiple entries on single-record pages
4. **Field Mapping**: Some field keys may not map correctly for all record types
5. **Date Formats**: Assumes MM/DD/YYYY input, may fail on other formats

---

## Future Improvements

1. **Real-time Collaboration**: Multiple users editing same job
2. **Batch Operations**: Process multiple drafts at once
3. **Template System**: Save field mappings as templates
4. **Export Functionality**: Export drafts to CSV/Excel
5. **Advanced Validation**: Custom validation rules per church
6. **Audit Trail**: Track all changes to drafts
7. **Image Annotation**: Draw bounding boxes directly on image
8. **Multi-language Support**: UI translations

---

## Support & Debugging

### Console Logging

All components log key actions with prefixes:
- `[EnhancedOCRUploader]`: Main container actions
- `[MappingTab]`: Field mapping operations
- `[FusionTab]`: Fusion workflow steps
- `[ReviewFinalizeTab]`: Review and commit operations
- `[InspectionPanel]`: Tab switching and panel operations

### Network Tab

Monitor these endpoints:
- `POST /api/church/:churchId/ocr/upload`
- `GET /api/church/:churchId/ocr/jobs`
- `POST /api/church/:churchId/ocr/jobs/:jobId/mapping`
- `POST /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts`
- `POST /api/church/:churchId/ocr/jobs/:jobId/fusion/ready-for-review`
- `GET /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts`
- `POST /api/church/:churchId/ocr/jobs/:jobId/review/commit`

### Database Queries

```sql
-- Check job status
SELECT id, status, confidence_score, created_at 
FROM ocr_jobs 
WHERE church_id = ? 
ORDER BY created_at DESC;

-- Check drafts
SELECT id, entry_index, workflow_status, finalized_at 
FROM ocr_fused_drafts 
WHERE ocr_job_id = ?;

-- Check committed records
SELECT id, first_name, last_name, created_at 
FROM baptism_records 
WHERE id IN (
  SELECT committed_record_id 
  FROM ocr_fused_drafts 
  WHERE ocr_job_id = ? AND workflow_status = 'committed'
);
```

---

**End of Documentation**

