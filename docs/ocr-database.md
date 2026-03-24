# OCR Database Schema

## Overview

OCR data is split between the platform database and tenant databases:

- **Platform DB** (`orthodoxmetrics_db`) — Job queue, global settings, extractors, correction memory
- **Tenant DBs** (`om_church_##`) — Per-church pages, artifacts, and draft records

```
orthodoxmetrics_db                    om_church_##
├── ocr_jobs ◄─────────────────────►  ├── ocr_feeder_pages
│     ↕                                │     ↕
├── ocr_job_history                    ├── ocr_feeder_artifacts
├── ocr_global_settings                └── ocr_fused_drafts
├── ocr_extractors
│     ↕
├── ocr_extractor_fields
└── ocr_correction_log
```

## Platform Database Tables

### ocr_jobs

Main job queue. One row per OCR processing request.

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | int | PRI | Auto-increment job ID |
| church_id | int | IDX | FK to churches.id |
| uploaded_by | int | | User who uploaded |
| filename | varchar(255) | | Original filename |
| status | enum | IDX | `pending`, `processing`, `complete`, `completed`, `error`, `failed` |
| review_status | enum | | `uploaded`, `pending_review`, `in_review`, `processed`, `returned` |
| review_notes | text | | Notes from reviewer |
| record_type | enum | | `baptism`, `marriage`, `funeral`, `custom` |
| language | char(2) | | ISO language code (e.g., `en`, `el`, `ru`) |
| confidence_score | decimal(5,2) | | Overall OCR confidence (0-100) |
| error_regions | text | | JSON array of error bounding boxes |
| ocr_result | longtext | | Raw OCR JSON (typically NULL for feeder jobs — stored on disk) |
| ocr_text | longtext | | Plain text extraction |
| source_pipeline | enum | | `studio`, `uploader`, `worker`, `batch_import` |
| classifier_suggested_type | varchar(32) | | Auto-detected record type |
| classifier_confidence | decimal(5,3) | | Classification confidence |
| layout_template_id | int | | FK to ocr_extractors.id |
| progress_percent | tinyint unsigned | | 0-100 progress indicator |
| current_stage | varchar(50) | IDX | Current pipeline stage |
| started_at | timestamp | | Processing start time |
| completed_at | timestamp | | Processing completion time |
| created_by | int | IDX | FK to users.id |
| resume_token | varchar(64) | | Token for resuming interrupted jobs |
| last_activity_at | timestamp | IDX | Last heartbeat/update |
| archived_at | timestamp | | When job was archived |
| created_at | timestamp | | Record creation time |
| processing_started_at | timestamp | | When processing began |

**Indexes:**
- `idx_church_status (church_id, status)` — Worker polling, admin dashboards
- `idx_status_created (status, created_at)` — Stale detection, queue ordering
- `idx_created_by (created_by)` — User audit trail
- `idx_church_record_type (church_id, record_type)` — Type-filtered queries
- `idx_current_stage (current_stage)` — Stage-based filtering
- `idx_last_activity (last_activity_at)` — Stale job detection

### ocr_job_history

Audit trail of job state transitions.

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | bigint | PRI | Auto-increment |
| job_id | bigint | IDX | FK to ocr_jobs.id |
| stage | varchar(50) | IDX | Pipeline stage name |
| status | varchar(20) | | Stage status |
| message | text | | Human-readable description |
| duration_ms | int | | Stage duration in milliseconds |
| created_at | timestamp | IDX | When this entry was created |

### ocr_global_settings

Platform-wide OCR configuration. Worker reads these at startup and periodically.

| Column | Type | Description |
|--------|------|-------------|
| id | int | PRI |
| engine | varchar(50) | OCR engine (default: `tesseract`) |
| language | varchar(10) | Default language (default: `eng`) |
| dpi | int | Target DPI (default: 300) |
| deskew | tinyint(1) | Auto-deskew enabled |
| remove_noise | tinyint(1) | Noise removal enabled |
| preprocess_images | tinyint(1) | Image preprocessing enabled |
| output_format | varchar(20) | Output format (default: `json`) |
| confidence_threshold | decimal(5,2) | Minimum confidence (default: 0.75) |

### ocr_extractors

Layout template definitions for table extraction.

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | int | PRI | Auto-increment |
| name | varchar(255) | | Template name |
| description | text | | Template description |
| record_type | varchar(50) | IDX | Target record type |
| page_mode | enum | | `single` or `variable` |
| extraction_mode | enum | | `tabular`, `form`, `multi_form`, `auto` |
| column_bands | longtext | | JSON column band definitions |
| header_y_threshold | float | | Y position below which is data (not headers) |
| record_regions | longtext | | JSON region definitions |
| learned_params | longtext | | Machine-learned adjustments |
| preview_job_id | int | | Job used for preview |
| is_default | tinyint(1) | | Default template for record type |
| church_id | int | | NULL = global, otherwise church-specific |

### ocr_extractor_fields

Field definitions within extractors.

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | int | PRI | Auto-increment |
| extractor_id | int | IDX | FK to ocr_extractors.id |
| parent_field_id | int | IDX | FK for nested fields |
| name | varchar(255) | | Display name |
| key | varchar(255) | | Machine key (maps to DB column) |
| field_type | enum | | `text`, `number`, `date`, `group` |
| multiple | tinyint(1) | | Allows multiple values |
| instructions | text | | Extraction instructions |
| anchor_phrases | longtext | | JSON array of anchor phrases |
| anchor_direction | enum | | `below`, `right`, `auto` |
| search_zone | longtext | | JSON bounding box for search area |
| column_index | int | | Column position in table layout |
| sort_order | int | | Display ordering |

### ocr_correction_log

Records user corrections for accuracy improvement (correction memory).

| Column | Type | Key | Description |
|--------|------|-----|-------------|
| id | int | PRI | Auto-increment |
| church_id | int | IDX | FK to churches.id |
| job_id | int | | FK to ocr_jobs.id |
| extractor_id | int | IDX | FK to ocr_extractors.id |
| record_type | varchar(50) | IDX | Record type context |
| field_key | varchar(255) | | Which field was corrected |
| extracted_value | text | | What OCR extracted |
| corrected_value | text | | What user corrected it to |
| anchor_matched | varchar(255) | | Anchor phrase that was matched |
| bbox_json | longtext | | Bounding box of corrected region |

## Tenant Database Tables

Auto-created by `assertTenantOcrTablesExist()` when a tenant pool is first accessed.

### ocr_feeder_pages

Individual pages within a job.

| Column | Type | Description |
|--------|------|-------------|
| id | bigint unsigned | PRI |
| job_id | bigint unsigned | FK to platform ocr_jobs.id |
| page_index | int | Page number (0-based) |
| status | enum | `queued`, `preprocessing`, `ocr`, `parsing`, `scoring`, `accepted`, `review`, `failed`, `retry` |
| input_path | varchar(512) | Path to uploaded image |
| preproc_path | varchar(512) | Path to preprocessed image |
| thumb_path | varchar(512) | Path to thumbnail |
| rotation | smallint | Detected/applied rotation degrees |
| dpi | int | Detected DPI |
| bbox_crop | text | JSON crop coordinates |
| quality_score | decimal(5,3) | Image quality score |
| ocr_confidence | decimal(5,3) | Vision API confidence |
| retry_count | tinyint unsigned | Number of retries |
| last_error | text | Most recent error message |

### ocr_feeder_artifacts

Artifacts produced during processing.

| Column | Type | Description |
|--------|------|-------------|
| id | bigint unsigned | PRI |
| page_id | bigint unsigned | FK to ocr_feeder_pages.id |
| artifact_type | varchar(64) | `raw_text`, `tokens`, `layout`, `record_candidates`, `border_geometry`, `deskew_geometry`, etc. |
| storage_path | varchar(512) | File path on disk |
| json_blob | longtext | Inline JSON data |
| meta_json | longtext | Additional metadata |
| mime_type | varchar(128) | Content type |

### ocr_fused_drafts

Draft records created from OCR extraction, pending human review.

| Column | Type | Description |
|--------|------|-------------|
| id | bigint unsigned | PRI |
| ocr_job_id | bigint unsigned | FK to platform ocr_jobs.id |
| record_type | varchar(50) | `baptism`, `marriage`, `funeral` |
| field_data | longtext | JSON of extracted field values |
| confidence | decimal(5,3) | Overall confidence for this draft |
| workflow_status | varchar(20) | `draft`, `in_review`, `approved`, `rejected`, `committed` |
| reviewed_by | int | User ID of reviewer |
| reviewed_at | timestamp | Review timestamp |
| committed_record_id | int | FK to committed record (after commit) |

## Storage

On-disk artifacts stored under `storage/feeder/`:
```
storage/feeder/
  job_<id>/
    page_<index>/
      vision_result.json     # Raw Vision API response
      preprocessed.jpg       # Preprocessed image
      border_trimmed.jpg     # Border-trimmed image
      deskew_geometry.json   # Deskew parameters
      metrics.json           # Quality metrics
```

## Access Patterns

```js
// Platform DB
const pool = getAppPool();
const [jobs] = await pool.query('SELECT * FROM ocr_jobs WHERE church_id = ? AND status = ?', [churchId, 'pending']);

// Tenant DB
const tenantPool = getTenantPool(churchId);  // om_church_##
const [pages] = await tenantPool.query('SELECT * FROM ocr_feeder_pages WHERE job_id = ?', [jobId]);
```
