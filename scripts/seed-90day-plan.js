#!/usr/bin/env node
/**
 * seed-90day-plan.js — Insert 200 OM Daily items for the 90-day OCR-focused plan
 */

const path = require('path');
const { promisePool: pool } = require(path.join('/var/www/orthodoxmetrics/prod', 'server/dist/config/db'));

const items = [

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 1: FOUNDATION (Days 1–14) — Horizon 7 & 14
  // Core OCR pipeline: replace stubs, get real Vision API working
  // ═══════════════════════════════════════════════════════════════════════

  // --- 1A: Vision API Integration (Days 1-5) ---
  { title: 'Integrate Google Cloud Vision API into ocrFeederWorker', description: 'Replace the stub in ocrFeederWorker.ts runOcr() with real Google Cloud Vision API call. Use documentTextDetection for full-page OCR. Store raw response JSON to disk at storage/feeder/job_{id}/page_0/vision_result.json.', horizon: '7', priority: 'critical', category: 'OCR' },
  { title: 'Add GOOGLE_APPLICATION_CREDENTIALS env var to server config', description: 'Add the service account JSON path to server/src/config/index.ts and .env. Validate it loads on startup. Log warning if missing.', horizon: '7', priority: 'critical', category: 'OCR' },
  { title: 'Create Vision API client wrapper with retry logic', description: 'New file server/src/ocr/visionClient.ts — wraps @google-cloud/vision with exponential backoff (3 retries), timeout (30s), and error classification (rate limit vs auth vs transient).', horizon: '7', priority: 'critical', category: 'OCR' },
  { title: 'Add Vision API rate limiting (QPS throttle)', description: 'Implement a token bucket rate limiter in visionClient.ts to stay under Google Vision API quotas. Default 10 QPS, configurable via env var VISION_QPS_LIMIT.', horizon: '7', priority: 'high', category: 'OCR' },
  { title: 'Add Vision API cost tracking per church', description: 'Log each Vision API call to a new ocr_api_usage table (church_id, job_id, page_count, api_cost_cents, timestamp). Display in admin monitor.', horizon: '7', priority: 'medium', category: 'OCR' },
  { title: 'Unit test: Vision API client wrapper', description: 'Tests for visionClient.ts — mock API responses, verify retry on 429/503, verify timeout handling, verify credential validation.', horizon: '7', priority: 'medium', category: 'OCR' },

  // --- 1B: Image Preprocessing (Days 3-7) ---
  { title: 'Implement real image preprocessing in ocrFeederWorker', description: 'Replace stub preprocessPage() with Sharp-based pipeline: resize to max 4000px, convert to grayscale, normalize contrast. Save to preprocessed.jpg.', horizon: '7', priority: 'critical', category: 'OCR' },
  { title: 'Add deskew preprocessing step using Sharp/OpenCV', description: 'Detect page rotation via Hough transform or Vision API rotation hint. Auto-correct skew up to ±15 degrees. Store correction angle in page metadata.', horizon: '7', priority: 'high', category: 'OCR' },
  { title: 'Add noise removal preprocessing for scanned documents', description: 'Implement adaptive threshold + morphological open/close for removing scanner noise and bleed-through from old ledger pages. Configurable via ocr_settings.remove_noise.', horizon: '7', priority: 'high', category: 'OCR' },
  { title: 'Add image quality assessment scoring', description: 'Calculate quality score from sharpness (Laplacian variance), contrast ratio, and resolution. Store in ocr_feeder_pages.quality_score. Flag pages below 0.4 for manual review.', horizon: '7', priority: 'medium', category: 'OCR' },
  { title: 'Add EXIF orientation correction for uploaded images', description: 'Read EXIF orientation tag before preprocessing. Auto-rotate to correct orientation. Handle iPhone/Android photo orientations.', horizon: '7', priority: 'medium', category: 'OCR' },
  { title: 'Add multi-page PDF splitting into individual page images', description: 'Use pdf-poppler or pdf2pic to extract pages from uploaded PDFs. Create one ocr_feeder_pages entry per page. Support up to 50 pages per PDF.', horizon: '14', priority: 'high', category: 'OCR' },

  // --- 1C: Record Parsing (Days 5-10) ---
  { title: 'Implement real record parsing in ocrFeederWorker', description: 'Replace stub parseRecords() with actual pipeline: extractTokensFromVision → layoutExtractor → columnMapper. Store parsed candidates to record_candidates.json.', horizon: '7', priority: 'critical', category: 'OCR' },
  { title: 'Wire extractTokensFromVision to feeder worker pipeline', description: 'Connect the existing token extraction module to the feeder worker so real Vision JSON is tokenized with bounding boxes, script detection, and line clustering.', horizon: '7', priority: 'critical', category: 'OCR' },
  { title: 'Wire layoutExtractor field extraction to feeder pipeline', description: 'After tokenization, run layoutExtractor with appropriate ROI config for detected record type. Map anchor phrases to fields. Store extraction result.', horizon: '7', priority: 'critical', category: 'OCR' },
  { title: 'Wire columnMapper to produce final record candidates', description: 'Take layoutExtractor output and run through columnMapper to produce structured record candidates with confidence scores and needsReview flags.', horizon: '7', priority: 'critical', category: 'OCR' },
  { title: 'Auto-create fusion drafts from parsed record candidates', description: 'After columnMapper produces candidates, auto-create ocr_fused_drafts entries with workflow_status=draft. One draft per detected record entry.', horizon: '14', priority: 'high', category: 'OCR' },

  // --- 1D: End-to-End Pipeline Testing (Days 8-14) ---
  { title: 'Create integration test: upload image → Vision API → parsed records', description: 'End-to-end test using a real baptism ledger scan. Verify: job created, page preprocessed, Vision API called, tokens extracted, fields mapped, drafts created.', horizon: '14', priority: 'critical', category: 'OCR' },
  { title: 'Create integration test: marriage ledger extraction pipeline', description: 'Use a real marriage ledger scan through the full pipeline. Verify two-table layout detection, date-based record boundaries, and field mapping.', horizon: '14', priority: 'high', category: 'OCR' },
  { title: 'Create integration test: funeral record extraction', description: 'End-to-end test with funeral record scan. Verify record type classification, field extraction (deceased, dates, cause of death), and draft creation.', horizon: '14', priority: 'high', category: 'OCR' },
  { title: 'Add pipeline timing metrics to ocrFeederWorker', description: 'Measure and log duration of each pipeline stage (preprocess, ocr, parse, score). Store in ocr_feeder_pages metadata. Show in admin monitor.', horizon: '14', priority: 'medium', category: 'OCR' },
  { title: 'Fix feeder worker SKIP LOCKED for MariaDB compatibility', description: 'MariaDB 10.6+ supports SKIP LOCKED but syntax differs from MySQL 8. Verify and fix the SELECT FOR UPDATE SKIP LOCKED query in ocrFeederWorker.', horizon: '14', priority: 'high', category: 'Backend' },
  { title: 'Add dead letter queue for permanently failed OCR jobs', description: 'After max retries (currently 2), move job to failed state with detailed error info. Add GET /admin/ocr/failed-jobs endpoint to list them.', horizon: '14', priority: 'medium', category: 'OCR' },

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 2: ACCURACY & QUALITY (Days 15–30) — Horizon 14 & 30
  // Improve extraction accuracy, add field validation, handle edge cases
  // ═══════════════════════════════════════════════════════════════════════

  // --- 2A: Baptism Record Improvements (Days 15-20) ---
  { title: 'Add ROI config for standard baptism certificate format', description: 'Define anchor phrases and search zones for printed baptism certificates (non-ledger format). Common format: single record per page with header/footer.', horizon: '14', priority: 'high', category: 'OCR' },
  { title: 'Add baptism date parsing with multiple date format support', description: 'Parse dates in formats: MM/DD/YYYY, Month DD YYYY, DD.MM.YYYY, Slavic month names. Handle partial dates (month+year only). Return ISO format.', horizon: '14', priority: 'high', category: 'OCR' },
  { title: 'Add baptism sponsor name extraction and normalization', description: 'Extract godparent/sponsor names from various label patterns (Sponsor, Godparent, Kum/Kuma, Nasha/Nasho). Handle multiple sponsors.', horizon: '14', priority: 'medium', category: 'OCR' },
  { title: 'Add baptism clergy name extraction with title handling', description: 'Extract priest names with title normalization: Fr., Father, Rev., Very Rev., Rt. Rev., Archbishop → standardized prefix + name.', horizon: '14', priority: 'medium', category: 'OCR' },
  { title: 'Implement quadrant-based fallback for baptism extraction', description: 'When anchor phrases are not found, fall back to quadrant-based extraction (upper-left=names, upper-right=dates, lower=sponsors/clergy) as noted TODO in layoutExtractor.ts.', horizon: '30', priority: 'medium', category: 'OCR' },
  { title: 'Add baptism record number sequence validation', description: 'Validate that extracted record numbers form a sequential series within a ledger page. Flag gaps or duplicates for review.', horizon: '30', priority: 'low', category: 'OCR' },

  // --- 2B: Marriage Record Improvements (Days 18-25) ---
  { title: 'Add ROI config for marriage records (currently marked TODO)', description: 'Define anchor phrases and search zones for marriage records. Include: groom/bride names, dates, witnesses, license info, clergy.', horizon: '14', priority: 'high', category: 'OCR' },
  { title: 'Improve marriage_ledger_v1 column band calibration', description: 'The current column bands are calibrated for one ledger format. Add adaptive band detection based on header row positions. Test with 5+ different ledger scans.', horizon: '30', priority: 'high', category: 'OCR' },
  { title: 'Add marriage license number extraction', description: 'Extract license/permit number from marriage records. Handle formats: numeric, alphanumeric, state-prefixed. Store in license_number field.', horizon: '30', priority: 'medium', category: 'OCR' },
  { title: 'Add witness name extraction for marriage records', description: 'Extract witness names (typically 2-4) from marriage records. Handle both labeled (Witness 1:) and positional (bottom of record) formats.', horizon: '30', priority: 'medium', category: 'OCR' },
  { title: 'Handle two-page marriage records (groom page + bride page)', description: 'Some ledgers split marriage records across two pages. Detect continuation markers and merge records across pages.', horizon: '30', priority: 'medium', category: 'OCR' },

  // --- 2C: Funeral Record Improvements (Days 20-28) ---
  { title: 'Add ROI config for funeral records (currently marked TODO)', description: 'Define anchor phrases and search zones for funeral records. Include: deceased name, dates (death/funeral/burial), cause, age, next of kin, officiant.', horizon: '14', priority: 'high', category: 'OCR' },
  { title: 'Add funeral cause of death text extraction', description: 'Extract cause of death field with medical terminology handling. Normalize common abbreviations and historical terms.', horizon: '30', priority: 'medium', category: 'OCR' },
  { title: 'Add funeral age-at-death calculation and validation', description: 'Extract age field. Cross-validate against birth/death dates when both available. Handle formats: years, years+months, infant/stillborn.', horizon: '30', priority: 'medium', category: 'OCR' },
  { title: 'Add funeral burial location extraction', description: 'Extract cemetery name and plot/section information. Build a lookup table of common Orthodox cemeteries per region.', horizon: '30', priority: 'low', category: 'OCR' },

  // --- 2D: Multi-Language Support (Days 22-30) ---
  { title: 'Add Greek OCR language support with character mapping', description: 'Configure Vision API for Greek script detection. Add Greek anchor phrases to layoutExtractor. Map Greek field labels to English canonical fields.', horizon: '30', priority: 'high', category: 'OCR' },
  { title: 'Add Russian/Church Slavonic OCR support', description: 'Configure Vision API for Cyrillic. Add Russian anchor phrases (already partially in ocrClassifier.ts). Handle pre-reform Russian orthography.', horizon: '30', priority: 'high', category: 'OCR' },
  { title: 'Add Arabic/Antiochian OCR language support', description: 'Configure Vision API for Arabic script. Add Arabic anchor phrases for Antiochian church records. RTL text handling in token extraction.', horizon: '30', priority: 'medium', category: 'OCR' },
  { title: 'Add Romanian OCR language support', description: 'Configure Vision API for Romanian. Add Romanian anchor phrases. Handle diacritics (ă, â, î, ș, ț) in text normalization.', horizon: '30', priority: 'medium', category: 'OCR' },
  { title: 'Add Serbian OCR support (Cyrillic + Latin)', description: 'Support both Serbian Cyrillic and Latin scripts. Add Serbian anchor phrases. Handle mixed-script documents.', horizon: '30', priority: 'low', category: 'OCR' },
  { title: 'Build language auto-detection from Vision API response', description: 'Use Vision API detectedLanguages field to auto-set OCR language. Fall back to church-level default language setting.', horizon: '30', priority: 'high', category: 'OCR' },
  { title: 'Create transliteration module for Cyrillic → Latin', description: 'Standardized transliteration for names: support GOST, BGN/PCGN, and scholarly systems. Allow per-church transliteration preference.', horizon: '30', priority: 'medium', category: 'OCR' },

  // --- 2E: Field Validation & Confidence (Days 25-30) ---
  { title: 'Add field-level confidence scoring', description: 'Track confidence per extracted field (not just per record). Factors: OCR word confidence, anchor proximity, expected format match. Store in draft payload_json.', horizon: '30', priority: 'high', category: 'OCR' },
  { title: 'Add date field format validation', description: 'Validate extracted dates against expected formats and reasonable ranges (1700-present for historical, last 150 years for modern). Flag invalid dates.', horizon: '14', priority: 'high', category: 'OCR' },
  { title: 'Add name field validation (capitalization, length, charset)', description: 'Validate extracted names: check capitalization, min/max length, expected character set for the language. Flag suspiciously short or numeric names.', horizon: '30', priority: 'medium', category: 'OCR' },
  { title: 'Add cross-field consistency validation', description: 'Validate relationships between fields: birth_date < baptism_date, death_date > birth_date, marriage date < death dates, age matches birth/death delta.', horizon: '30', priority: 'medium', category: 'OCR' },
  { title: 'Implement confidence threshold tuning per church', description: 'Allow churches to adjust their confidence threshold (default 75%) for auto-accept vs. manual review. Store in ocr_settings.confidence_threshold.', horizon: '30', priority: 'medium', category: 'OCR' },
  { title: 'Add OCR correction memory application', description: 'Use ocr_correction_memory table to improve future extractions. When a user corrects a field, store the correction pattern. Apply known corrections during parsing.', horizon: '30', priority: 'high', category: 'OCR' },
  { title: 'Add duplicate record detection during extraction', description: 'Before creating drafts, check for existing records with matching key fields (name + date). Flag potential duplicates with similarity score.', horizon: '30', priority: 'medium', category: 'OCR' },

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 3: FRONTEND UX (Days 20–45) — Horizon 30
  // OCR workbench improvements, review workflow, batch operations
  // ═══════════════════════════════════════════════════════════════════════

  // --- 3A: Upload & Job Management UX (Days 20-28) ---
  { title: 'Add drag-and-drop multi-file upload to OCR page', description: 'Replace single file upload with dropzone supporting multiple files (up to 20). Show upload progress per file. Auto-create one job per file.', horizon: '30', priority: 'high', category: 'Frontend' },
  { title: 'Add camera capture for mobile OCR uploads', description: 'Add camera button on mobile that opens device camera for direct photo capture. Auto-crop detected document edges before upload.', horizon: '30', priority: 'medium', category: 'Frontend' },
  { title: 'Add job list with real-time status updates via WebSocket', description: 'Connect OCR job list to existing WebSocket service. Push status updates (queued→processing→completed) without polling.', horizon: '30', priority: 'high', category: 'Frontend' },
  { title: 'Add job progress bar showing pipeline stage', description: 'Show which stage (preprocessing, OCR, parsing, scoring) each job is in. Use the timing metrics from the worker to estimate remaining time.', horizon: '30', priority: 'medium', category: 'Frontend' },
  { title: 'Add bulk job actions (retry all failed, delete completed)', description: 'Toolbar buttons for batch operations on the job list. Add corresponding backend endpoints POST /admin/ocr/jobs/bulk with action parameter.', horizon: '30', priority: 'medium', category: 'Frontend' },
  { title: 'Add job filtering by status, record type, date range', description: 'Filter controls on job list: status dropdown, record type chips, date range picker. Persist filter state in URL search params.', horizon: '30', priority: 'medium', category: 'Frontend' },

  // --- 3B: Workbench Improvements (Days 25-35) ---
  { title: 'Add side-by-side view: original image + extracted text', description: 'Split view in workbench showing original scan on left and extracted/parsed text on right. Highlight corresponding regions when hovering fields.', horizon: '30', priority: 'high', category: 'Frontend' },
  { title: 'Add zoom and pan controls to workbench image viewer', description: 'Mouse wheel zoom, click-drag pan, fit-to-width/fit-to-height buttons. Maintain zoom level across field selections.', horizon: '30', priority: 'high', category: 'Frontend' },
  { title: 'Add field confidence heat map overlay', description: 'Color-code bounding boxes by confidence: green (>85%), yellow (60-85%), red (<60%). Toggle overlay on/off.', horizon: '30', priority: 'medium', category: 'Frontend' },
  { title: 'Add inline field editing in workbench overlay', description: 'Click a bounding box to edit the extracted text directly. Changes auto-save to fusion draft. Show before/after comparison.', horizon: '30', priority: 'high', category: 'Frontend' },
  { title: 'Add keyboard shortcuts for workbench navigation', description: 'Tab/Shift+Tab to move between fields, Enter to confirm, Escape to cancel edit, Arrow keys to navigate entries, Ctrl+S to save.', horizon: '30', priority: 'medium', category: 'Frontend' },
  { title: 'Add undo/redo for workbench field edits', description: 'Track edit history per session. Ctrl+Z/Ctrl+Y to undo/redo field changes. Show edit history panel.', horizon: '30', priority: 'medium', category: 'Frontend' },
  { title: 'Add workbench entry navigation (prev/next record)', description: 'Navigate between detected records on a page. Show record index (3 of 12). Auto-scroll image to current record region.', horizon: '30', priority: 'medium', category: 'Frontend' },

  // --- 3C: Review & Commit Workflow (Days 30-40) ---
  { title: 'Add review queue page showing all drafts needing review', description: 'New page listing all fusion drafts with workflow_status=draft or in_review, sorted by confidence (lowest first). Filterable by record type and church.', horizon: '30', priority: 'high', category: 'Frontend' },
  { title: 'Add side-by-side diff view for corrected vs. original extraction', description: 'When a reviewer edits fields, show a diff highlighting what changed. Store original extraction for comparison.', horizon: '30', priority: 'medium', category: 'Frontend' },
  { title: 'Add batch approve/reject for high-confidence drafts', description: 'Select multiple drafts and approve all at once. Only available for drafts above confidence threshold. Show summary before committing.', horizon: '30', priority: 'high', category: 'Frontend' },
  { title: 'Add commit confirmation dialog with record preview', description: 'Before committing drafts to record tables, show a preview of what will be inserted. List all fields and their values. Require explicit confirmation.', horizon: '30', priority: 'medium', category: 'Frontend' },
  { title: 'Add post-commit success summary with links to new records', description: 'After committing, show summary: N records created with links to each new record in the church records system.', horizon: '30', priority: 'medium', category: 'Frontend' },
  { title: 'Add review assignment workflow (assign to specific reviewer)', description: 'Allow admins to assign drafts to specific users for review. Show assigned reviewer on draft. Send notification on assignment.', horizon: '30', priority: 'low', category: 'Frontend' },

  // --- 3D: Admin Monitor Improvements (Days 35-45) ---
  { title: 'Add OCR admin dashboard with aggregate stats', description: 'Dashboard showing: total jobs by status, avg processing time, success rate, API cost by church, jobs per day chart. Use existing admin monitor routes.', horizon: '30', priority: 'high', category: 'Frontend' },
  { title: 'Add per-church OCR usage statistics', description: 'Show each church: total pages processed, success rate, avg confidence, total API cost, last activity. Sortable table.', horizon: '30', priority: 'medium', category: 'Frontend' },
  { title: 'Add OCR job detail view in admin monitor', description: 'Expandable job detail: all pages with status, timing, confidence. Link to artifacts. Reprocess/delete buttons.', horizon: '30', priority: 'medium', category: 'Frontend' },
  { title: 'Add real-time processing log viewer in admin', description: 'Stream worker logs via WebSocket for currently processing jobs. Show pipeline stage, timing, errors in real-time.', horizon: '30', priority: 'low', category: 'Frontend' },

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 4: ADVANCED OCR (Days 30–60) — Horizon 30 & 60
  // Layout learning, handwriting, multi-page, templates
  // ═══════════════════════════════════════════════════════════════════════

  // --- 4A: Layout Template System (Days 30-40) ---
  { title: 'Implement layout template CRUD in admin UI', description: 'Build admin page for managing layout templates (already have backend CRUD). List templates, create new, edit column bands, preview with sample image.', horizon: '30', priority: 'high', category: 'Frontend' },
  { title: 'Add layout template auto-detection from uploaded images', description: 'When a new job is created, compare the page structure against known templates. Score match by column positions, header keywords, page dimensions.', horizon: '30', priority: 'high', category: 'OCR' },
  { title: 'Add layout template training from corrected extractions', description: 'After N successful extractions with corrections, auto-generate/refine a layout template. Store column band adjustments from user corrections.', horizon: '60', priority: 'high', category: 'OCR' },
  { title: 'Add layout template sharing between churches', description: 'Allow super_admin to publish templates to a shared library. Churches can browse and adopt templates from other churches with similar ledger formats.', horizon: '60', priority: 'medium', category: 'OCR' },
  { title: 'Add per-template accuracy tracking', description: 'Track extraction accuracy per layout template. Show: records processed, avg confidence, common error fields. Use for template quality ranking.', horizon: '60', priority: 'medium', category: 'OCR' },

  // --- 4B: Handwriting Recognition (Days 35-50) ---
  { title: 'Add handwriting vs. print detection per field', description: 'Analyze Vision API word-level features to classify each field as handwritten or printed. Use different confidence thresholds for handwritten fields.', horizon: '30', priority: 'high', category: 'OCR' },
  { title: 'Add handwriting-specific preprocessing pipeline', description: 'For detected handwritten regions: apply different contrast/threshold settings optimized for handwriting. Binarization with Sauvola method.', horizon: '60', priority: 'high', category: 'OCR' },
  { title: 'Build handwriting confidence model for common field types', description: 'Track per-field accuracy for handwritten content. Identify fields where handwriting recognition consistently fails (e.g., dates vs. names).', horizon: '60', priority: 'medium', category: 'OCR' },
  { title: 'Add manual transcription fallback UI for low-confidence handwriting', description: 'When handwriting confidence is below threshold, show enlarged field image and ask user to manually transcribe. Include common character palette.', horizon: '60', priority: 'medium', category: 'Frontend' },
  { title: 'Add historical handwriting style profiles (19th/20th century)', description: 'Different eras have different handwriting conventions. Create style profiles that adjust extraction parameters for era-appropriate expectations.', horizon: '60', priority: 'low', category: 'OCR' },

  // --- 4C: Multi-Page Document Support (Days 40-50) ---
  { title: 'Add multi-page job support in feeder worker', description: 'Process all pages in a job sequentially. Current worker processes page_0 only. Iterate ocr_feeder_pages and process each.', horizon: '30', priority: 'critical', category: 'OCR' },
  { title: 'Add page ordering and reordering UI', description: 'After multi-page PDF upload, show thumbnail strip of all pages. Allow drag-and-drop reordering. Mark pages to skip.', horizon: '30', priority: 'high', category: 'Frontend' },
  { title: 'Add cross-page record continuation detection', description: 'Detect when a record spans two pages (e.g., last entry on page continues to next). Merge tokens across page boundary.', horizon: '60', priority: 'high', category: 'OCR' },
  { title: 'Add page-level summary in job detail view', description: 'Show per-page: thumbnail, record count, avg confidence, status. Allow reprocessing individual pages.', horizon: '30', priority: 'medium', category: 'Frontend' },
  { title: 'Add batch page processing with parallel execution', description: 'Process up to 3 pages simultaneously per job. Requires careful Vision API rate limiting coordination.', horizon: '60', priority: 'medium', category: 'OCR' },

  // --- 4D: Advanced Table Extraction (Days 45-55) ---
  { title: 'Add adaptive column band detection from page content', description: 'Replace hard-coded column bands with dynamic detection. Use Vision API block/paragraph structure + X-gap histogram to find column boundaries.', horizon: '30', priority: 'high', category: 'OCR' },
  { title: 'Add row boundary detection from horizontal lines', description: 'Detect physical row separator lines in ledger pages. Use line detection to split records instead of Y-gap heuristic only.', horizon: '60', priority: 'high', category: 'OCR' },
  { title: 'Add merged cell detection and handling', description: 'Detect cells that span multiple columns (common in ledger headers). Handle by distributing content to appropriate fields.', horizon: '60', priority: 'medium', category: 'OCR' },
  { title: 'Add support for rotated/sideways text in table cells', description: 'Some ledger columns have vertical text labels. Detect rotation and correct before extraction.', horizon: '60', priority: 'medium', category: 'OCR' },
  { title: 'Add table header auto-detection and mapping', description: 'Use the first row of a detected table as column headers. Map header text to canonical field names using fuzzy matching + language-specific synonyms.', horizon: '30', priority: 'high', category: 'OCR' },
  { title: 'Add support for multi-row records (tall cells)', description: 'Handle records where text wraps within a cell, causing the cell to span multiple visual rows. Merge based on left-column alignment.', horizon: '60', priority: 'medium', category: 'OCR' },

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 5: DATA QUALITY & LEARNING (Days 45–70) — Horizon 60
  // Correction memory, accuracy tracking, smart suggestions
  // ═══════════════════════════════════════════════════════════════════════

  // --- 5A: Correction Memory System (Days 45-55) ---
  { title: 'Implement correction memory recording on draft save', description: 'When a user edits a fusion draft field, record the correction: original_value → corrected_value, field_name, record_type, church_id. Store in ocr_correction_memory.', horizon: '60', priority: 'high', category: 'OCR' },
  { title: 'Build correction pattern aggregation', description: 'Aggregate corrections to find common patterns: e.g., "Baptlsm" → "Baptism" appears 15 times. Rank by frequency. Store as template_key patterns.', horizon: '60', priority: 'high', category: 'OCR' },
  { title: 'Apply correction patterns during OCR parsing', description: 'After initial extraction, run correction memory patterns against extracted text. Auto-correct known OCR errors. Track auto-correction count.', horizon: '60', priority: 'high', category: 'OCR' },
  { title: 'Add per-church correction dictionary UI', description: 'Admin page showing all correction patterns for a church. Allow manual add/edit/delete. Import/export as JSON.', horizon: '60', priority: 'medium', category: 'Frontend' },
  { title: 'Add global correction dictionary (cross-church)', description: 'Super-admin can promote church-specific corrections to global. Global patterns apply to all churches as baseline.', horizon: '60', priority: 'medium', category: 'OCR' },
  { title: 'Build name dictionary from committed records', description: 'Extract all committed names (first, last) across churches. Use as spell-check dictionary for OCR name extraction. Suggest closest match for garbled names.', horizon: '60', priority: 'medium', category: 'OCR' },

  // --- 5B: Accuracy Tracking & Analytics (Days 50-60) ---
  { title: 'Add per-field accuracy tracking table', description: 'New table ocr_field_accuracy: field_name, record_type, correct_count, total_count, avg_confidence. Update on each commit.', horizon: '60', priority: 'high', category: 'OCR' },
  { title: 'Build accuracy dashboard showing field-level performance', description: 'Chart showing accuracy % per field across record types. Identify worst-performing fields. Filter by church, time range.', horizon: '60', priority: 'high', category: 'Frontend' },
  { title: 'Add accuracy trend tracking over time', description: 'Track weekly accuracy metrics. Show trend line: is OCR getting better with corrections? Compare pre/post correction memory.', horizon: '60', priority: 'medium', category: 'Frontend' },
  { title: 'Add error categorization for OCR failures', description: 'Classify extraction errors: wrong_field_mapping, ocr_misread, missing_field, layout_detection_error, language_error. Track frequency per category.', horizon: '60', priority: 'medium', category: 'OCR' },
  { title: 'Add church-level OCR health score', description: 'Composite score (0-100) per church: based on success rate, avg confidence, correction rate, throughput. Show in admin dashboard.', horizon: '60', priority: 'medium', category: 'Frontend' },

  // --- 5C: Smart Suggestions (Days 55-65) ---
  { title: 'Add field auto-complete from existing records', description: 'When editing a draft field, suggest values from existing committed records. E.g., clergy names, common locations, sponsor names.', horizon: '60', priority: 'high', category: 'Frontend' },
  { title: 'Add name normalization suggestions', description: 'Suggest normalized forms for names: "Jno." → "John", "Wm." → "William", "Geo." → "George". Support historical abbreviations.', horizon: '60', priority: 'medium', category: 'OCR' },
  { title: 'Add date format normalization with context', description: 'When OCR extracts ambiguous dates (01/02/1923), suggest correct interpretation based on locale and other records on same page.', horizon: '60', priority: 'medium', category: 'OCR' },
  { title: 'Add location/parish auto-suggestion from church profile', description: 'Pre-fill location fields from church profile (city, state, diocese). Suggest nearby parishes for multi-parish records.', horizon: '60', priority: 'low', category: 'OCR' },
  { title: 'Add record type suggestion from page content', description: 'Improve ocrClassifier.ts: use field structure + header analysis in addition to keyword matching. Weighted scoring with configurable thresholds.', horizon: '60', priority: 'medium', category: 'OCR' },

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 6: SCALE & PERFORMANCE (Days 50–75) — Horizon 60
  // Batch processing, caching, optimization, concurrent workers
  // ═══════════════════════════════════════════════════════════════════════

  // --- 6A: Batch Processing (Days 50-60) ---
  { title: 'Add batch upload endpoint for multiple files', description: 'POST /api/church/:churchId/ocr/batch/upload — accept up to 20 files, create one job per file, return array of job IDs. Queue all for processing.', horizon: '60', priority: 'high', category: 'Backend' },
  { title: 'Add batch status endpoint', description: 'GET /api/church/:churchId/ocr/batch/:batchId/status — aggregate status of all jobs in a batch. Show: total, completed, failed, in-progress counts.', horizon: '60', priority: 'high', category: 'Backend' },
  { title: 'Add batch processing UI with progress dashboard', description: 'Upload multiple files, show batch progress with per-file status. Estimated completion time based on average processing duration.', horizon: '60', priority: 'high', category: 'Frontend' },
  { title: 'Add batch commit workflow (approve/reject entire batch)', description: 'After all jobs in batch complete, show aggregate review. Approve all high-confidence records, flag low-confidence for individual review.', horizon: '60', priority: 'medium', category: 'Frontend' },
  { title: 'Add batch ID tracking in ocr_feeder_jobs', description: 'Add batch_id column to ocr_feeder_jobs. Group jobs by batch for status queries and UI display.', horizon: '60', priority: 'medium', category: 'Backend' },

  // --- 6B: Performance Optimization (Days 55-65) ---
  { title: 'Add Vision API response caching (Redis or file-based)', description: 'Cache Vision API responses by image SHA256 hash. Avoid re-processing identical images. TTL: 30 days. Save API costs on retries.', horizon: '60', priority: 'high', category: 'Backend' },
  { title: 'Add extraction result caching for unchanged images', description: 'Cache full extraction pipeline results. Invalidate only when layout template or config changes. Reduce reprocessing time.', horizon: '60', priority: 'medium', category: 'Backend' },
  { title: 'Optimize token clustering algorithm in extractTokensFromVision', description: 'Current line clustering is O(n²). Use spatial indexing (R-tree or grid) for O(n log n) performance on pages with 1000+ tokens.', horizon: '60', priority: 'medium', category: 'OCR' },
  { title: 'Add database indexes for OCR query performance', description: 'Add indexes: ocr_feeder_jobs(church_id, status), ocr_feeder_pages(job_id, status), ocr_fused_drafts(ocr_job_id, workflow_status). Analyze slow queries.', horizon: '60', priority: 'high', category: 'Backend' },
  { title: 'Optimize image preprocessing memory usage', description: 'Use Sharp streaming pipeline instead of loading full image into memory. Critical for large scans (>50MB TIFF files).', horizon: '60', priority: 'medium', category: 'OCR' },
  { title: 'Add concurrent worker support with configurable pool size', description: 'Allow multiple feeder worker instances (configurable via env var OCR_WORKER_COUNT, default 2). Coordinate via SKIP LOCKED.', horizon: '60', priority: 'high', category: 'Backend' },

  // --- 6C: Storage & Cleanup (Days 60-70) ---
  { title: 'Add artifact storage cleanup cron job', description: 'Delete processed artifacts older than configurable retention (default 30 days). Keep: vision_result.json for completed jobs. Clean: preprocessed images, raw text.', horizon: '60', priority: 'high', category: 'Backend' },
  { title: 'Add storage usage tracking per church', description: 'Track disk usage per church for OCR artifacts. Show in admin dashboard. Alert when approaching storage limit.', horizon: '60', priority: 'medium', category: 'Backend' },
  { title: 'Add S3/object storage option for OCR artifacts', description: 'Optional S3-compatible storage backend for artifacts. Configurable via env var OCR_STORAGE_BACKEND (local|s3). Useful for scaling.', horizon: '60', priority: 'low', category: 'Backend' },
  { title: 'Add failed job cleanup with configurable retention', description: 'Auto-delete failed jobs and their artifacts after N days (default 7). Keep failure logs/errors in ocr_feeder_jobs for debugging.', horizon: '60', priority: 'medium', category: 'Backend' },

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 7: EXPORT & INTEGRATION (Days 60–80) — Horizon 60 & 90
  // Data export, reporting, external integrations
  // ═══════════════════════════════════════════════════════════════════════

  // --- 7A: Export Features (Days 60-70) ---
  { title: 'Add CSV export for extracted records', description: 'Export committed records from OCR jobs as CSV. Include all fields, confidence scores, source file reference. One record per row.', horizon: '60', priority: 'high', category: 'Frontend' },
  { title: 'Add PDF report generation for OCR jobs', description: 'Generate PDF report: original image, extracted text overlay, field values table, confidence scores, correction history. Use puppeteer or pdfkit.', horizon: '60', priority: 'medium', category: 'Backend' },
  { title: 'Add Excel export with formatting', description: 'Export records as .xlsx with column headers, data validation, and conditional formatting (red for low-confidence fields). Use exceljs library.', horizon: '60', priority: 'medium', category: 'Backend' },
  { title: 'Add bulk export for entire church OCR history', description: 'Export all committed records for a church as a zip containing CSV files per record type. Include metadata summary.', horizon: '90', priority: 'medium', category: 'Backend' },
  { title: 'Add GEDCOM export for genealogical research', description: 'Export baptism + marriage + funeral records in GEDCOM format for family tree software compatibility. Map sacramental records to GEDCOM events.', horizon: '90', priority: 'low', category: 'Backend' },

  // --- 7B: Audit & History (Days 65-75) ---
  { title: 'Add complete audit trail for OCR record lifecycle', description: 'Track every state change: upload → process → extract → review → edit → commit → record created. Store in ocr_audit_log table with user, timestamp, action.', horizon: '60', priority: 'high', category: 'Backend' },
  { title: 'Add OCR job history view in frontend', description: 'Timeline view showing all events for a job: created, processed, fields edited, reviewed, committed. Show user + timestamp for each.', horizon: '60', priority: 'medium', category: 'Frontend' },
  { title: 'Add committed record traceability back to OCR source', description: 'From any committed record, link back to: OCR job, source image, extracted draft, corrections made. Add source_ocr_job_id to record tables.', horizon: '60', priority: 'high', category: 'Backend' },
  { title: 'Add OCR correction analytics (who corrected what)', description: 'Track corrections per user: fields corrected, accuracy improvement, time spent reviewing. Show in admin analytics.', horizon: '90', priority: 'medium', category: 'Frontend' },

  // --- 7C: Notification & Workflow Integration (Days 70-80) ---
  { title: 'Add email notification on OCR job completion', description: 'Send email to church admin when OCR job finishes processing. Include: record count, avg confidence, link to review page.', horizon: '60', priority: 'medium', category: 'Backend' },
  { title: 'Add notification for drafts awaiting review (daily digest)', description: 'Daily email to church admin listing drafts pending review. Group by record type, sort by confidence. Include direct review links.', horizon: '90', priority: 'medium', category: 'Backend' },
  { title: 'Add WebSocket push for OCR job status changes', description: 'Push real-time OCR job status updates to connected clients. Replace polling in ChurchOCRPage with WebSocket subscription.', horizon: '60', priority: 'high', category: 'Backend' },
  { title: 'Add Slack/webhook notification for OCR pipeline errors', description: 'Optional webhook URL in settings. Send POST on: job failure, API error, system health issue. Include error details and job context.', horizon: '90', priority: 'low', category: 'Backend' },

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 8: TESTING & RELIABILITY (Days 50–80) — Horizon 60 & 90
  // Test coverage, error handling, monitoring
  // ═══════════════════════════════════════════════════════════════════════

  // --- 8A: Unit Tests (Days 50-60) ---
  { title: 'Unit tests for ocrClassifier.ts', description: 'Test classification accuracy for baptism/marriage/funeral across English, Greek, Russian text samples. Test edge cases: empty text, mixed types, unknown types.', horizon: '60', priority: 'high', category: 'OCR' },
  { title: 'Unit tests for columnMapper.ts', description: 'Test both marriage_ledger_v1 and generic_table engines. Verify header inference, field mapping, confidence scoring, unmapped column handling.', horizon: '60', priority: 'high', category: 'OCR' },
  { title: 'Unit tests for layoutExtractor.ts', description: 'Test anchor phrase matching, search zone extraction, ROI config handling. Use synthetic token data to verify field extraction logic.', horizon: '60', priority: 'high', category: 'OCR' },
  { title: 'Unit tests for extractTokensFromVision.ts', description: 'Test Vision JSON parsing, token extraction, script detection, line clustering. Use sample Vision API responses.', horizon: '60', priority: 'medium', category: 'OCR' },
  { title: 'Unit tests for generic_table.js layout engine', description: 'Test auto-column detection, X-gap analysis, coverage histogram, row merging. Use synthetic coordinate data.', horizon: '60', priority: 'medium', category: 'OCR' },
  { title: 'Unit tests for marriage_ledger_v1.js', description: 'Test column band matching, date boundary detection, two-table output, Y-gap row merging. Use real-world coordinate samples.', horizon: '60', priority: 'medium', category: 'OCR' },
  { title: 'Unit tests for date parsing across formats', description: 'Test all supported date formats: US, European, ISO, Slavic months, partial dates. Verify normalization to ISO format.', horizon: '60', priority: 'medium', category: 'OCR' },
  { title: 'Unit tests for transliteration module', description: 'Test Cyrillic→Latin conversion: GOST, BGN/PCGN, scholarly. Verify handling of edge cases: soft/hard signs, yo/ye, special chars.', horizon: '60', priority: 'low', category: 'OCR' },

  // --- 8B: Integration Tests (Days 55-70) ---
  { title: 'Integration test: full pipeline with mocked Vision API', description: 'End-to-end test from job creation through draft creation, using pre-recorded Vision API responses. Verify all DB state transitions.', horizon: '60', priority: 'high', category: 'OCR' },
  { title: 'Integration test: fusion draft → review → commit workflow', description: 'Test the complete review workflow: create drafts, edit fields, finalize, commit to record tables. Verify records appear in church DB.', horizon: '60', priority: 'high', category: 'OCR' },
  { title: 'Integration test: correction memory roundtrip', description: 'Test: create draft → edit field → save correction → reprocess same image → verify correction applied automatically.', horizon: '60', priority: 'medium', category: 'OCR' },
  { title: 'Integration test: multi-page PDF processing', description: 'Upload a 5-page PDF, verify all pages extracted and processed. Check page ordering, cross-page record detection.', horizon: '60', priority: 'medium', category: 'OCR' },
  { title: 'Integration test: concurrent worker processing', description: 'Start 3 worker instances, submit 10 jobs. Verify: no duplicate processing, all jobs complete, SKIP LOCKED works correctly.', horizon: '60', priority: 'medium', category: 'Backend' },

  // --- 8C: Error Handling & Monitoring (Days 65-80) ---
  { title: 'Add structured error logging for OCR pipeline', description: 'Replace console.error with structured logger: include job_id, church_id, pipeline_stage, error_code, stack. Queryable in system_logs.', horizon: '60', priority: 'high', category: 'Backend' },
  { title: 'Add OCR health check endpoint', description: 'GET /api/admin/ocr/health — check: worker running, Vision API reachable, storage writable, pending job count, oldest queued job age.', horizon: '60', priority: 'high', category: 'Backend' },
  { title: 'Add stale job detection and auto-recovery', description: 'Detect jobs stuck in processing state for >10 minutes. Auto-reset to queued for retry. Log incident. Show in admin monitor.', horizon: '60', priority: 'high', category: 'Backend' },
  { title: 'Add Vision API quota monitoring', description: 'Track daily Vision API usage against quota. Alert at 80% usage. Show usage chart in admin dashboard.', horizon: '90', priority: 'medium', category: 'Backend' },
  { title: 'Add user-facing error messages for OCR failures', description: 'Map internal error codes to friendly messages: "Image too blurry", "Unsupported format", "Text not detected", "Processing timeout". Show in job status.', horizon: '60', priority: 'medium', category: 'Frontend' },
  { title: 'Add automatic retry with backoff for transient failures', description: 'Classify errors as transient (API timeout, rate limit) vs. permanent (bad image, unsupported format). Auto-retry transient with exponential backoff.', horizon: '60', priority: 'high', category: 'OCR' },

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 9: POLISH & DOCUMENTATION (Days 75–90) — Horizon 90
  // UI polish, documentation, onboarding, deployment
  // ═══════════════════════════════════════════════════════════════════════

  // --- 9A: Setup & Onboarding (Days 75-82) ---
  { title: 'Complete OCR setup wizard flow', description: 'Finish the setup wizard (setupWizard.ts exists): step 1=connect church, step 2=configure settings, step 3=upload test image, step 4=review results, step 5=activate.', horizon: '90', priority: 'high', category: 'Frontend' },
  { title: 'Add interactive tutorial for OCR workbench', description: 'Step-by-step guided tour of workbench features: upload, view results, edit fields, approve, commit. Use react-joyride or similar.', horizon: '90', priority: 'medium', category: 'Frontend' },
  { title: 'Add OCR quick-start guide in help center', description: 'Written guide with screenshots: how to upload, what to expect, how to review, how to correct errors, how to commit. Link from OCR page.', horizon: '90', priority: 'medium', category: 'Docs' },
  { title: 'Add sample images for each record type', description: 'Include 2-3 sample images per record type (baptism/marriage/funeral) for testing. Store in a public samples directory. Use in setup wizard.', horizon: '90', priority: 'medium', category: 'OCR' },
  { title: 'Add OCR settings explanation tooltips', description: 'Add info icons next to each OCR setting explaining what it does, recommended values, and impact on accuracy/speed.', horizon: '90', priority: 'low', category: 'Frontend' },

  // --- 9B: UI Polish (Days 78-85) ---
  { title: 'Add loading skeletons for OCR pages', description: 'Replace spinner-only loading states with MUI Skeleton components matching the page layout. Improve perceived performance.', horizon: '90', priority: 'medium', category: 'Frontend' },
  { title: 'Add empty states with illustrations for OCR pages', description: 'When no jobs exist, show friendly illustration + "Get Started" CTA. Same for empty review queue, empty batch list.', horizon: '90', priority: 'low', category: 'Frontend' },
  { title: 'Add dark mode support for OCR workbench overlays', description: 'Ensure bounding boxes, confidence colors, and text overlays are visible in both light and dark themes.', horizon: '90', priority: 'medium', category: 'Frontend' },
  { title: 'Add responsive design for OCR pages on tablet', description: 'Optimize OCR workbench layout for iPad-sized screens. Side-by-side → stacked layout below 1024px. Touch-friendly controls.', horizon: '90', priority: 'medium', category: 'Frontend' },
  { title: 'Add accessibility (a11y) audit for OCR components', description: 'Verify ARIA labels, keyboard navigation, screen reader support, color contrast for all OCR UI components. Fix identified issues.', horizon: '90', priority: 'medium', category: 'Frontend' },
  { title: 'Optimize OCR frontend bundle size', description: 'Analyze OCR-related chunk sizes. Lazy-load heavy components (workbench, overlay editor). Target: OCR initial load < 200KB gzipped.', horizon: '90', priority: 'medium', category: 'Frontend' },

  // --- 9C: Documentation (Days 80-88) ---
  { title: 'Update docs/ocr-pipeline.md with current architecture', description: 'Rewrite OCR pipeline documentation to reflect: real Vision API integration, preprocessing pipeline, correction memory, multi-page support.', horizon: '90', priority: 'high', category: 'Docs' },
  { title: 'Add OCR API reference to docs/api-reference.md', description: 'Document all OCR endpoints with request/response schemas, auth requirements, error codes. Include curl examples.', horizon: '90', priority: 'high', category: 'Docs' },
  { title: 'Create OCR layout template authoring guide', description: 'Guide for super_admin: how to create layout templates, calibrate column bands, test with sample images, publish to library.', horizon: '90', priority: 'medium', category: 'Docs' },
  { title: 'Create OCR troubleshooting guide', description: 'Common issues: blurry images, wrong language, low confidence, layout detection failures. Include solutions and recommended settings per issue.', horizon: '90', priority: 'medium', category: 'Docs' },
  { title: 'Add OCR database schema documentation', description: 'Document all OCR-related tables, columns, relationships, and indexes. Include ER diagram showing table relationships.', horizon: '90', priority: 'medium', category: 'Docs' },

  // --- 9D: Deployment & Operations (Days 82-90) ---
  { title: 'Add OCR feature flag for gradual rollout', description: 'Add OCR feature to featureRegistry.ts at stage 3 (Review). Allow testing with select churches before production rollout.', horizon: '90', priority: 'high', category: 'Backend' },
  { title: 'Add OCR processing metrics to system health endpoint', description: 'Extend /api/system/health to include: ocr_worker_status, pending_jobs_count, avg_processing_time_ms, vision_api_status.', horizon: '90', priority: 'high', category: 'Backend' },
  { title: 'Create OCR deployment runbook', description: 'Step-by-step deployment guide: env vars needed, Vision API setup, storage directory creation, worker startup, health verification.', horizon: '90', priority: 'high', category: 'Docs' },
  { title: 'Add OCR worker process management to pm2/systemd', description: 'Configure OCR worker as separate process (or confirm it runs within main server). Add restart policy, memory limits, log rotation.', horizon: '90', priority: 'high', category: 'DevOps' },
  { title: 'Add backup strategy for OCR artifacts and correction memory', description: 'Document backup procedure for: storage/feeder/ directory, ocr_correction_memory table, ocr_field_accuracy data. Add to backup cron.', horizon: '90', priority: 'medium', category: 'DevOps' },
  { title: 'Load test OCR pipeline with 100 concurrent jobs', description: 'Simulate 100 simultaneous job submissions. Measure: queue time, processing time, memory usage, API rate limiting behavior. Document findings.', horizon: '90', priority: 'medium', category: 'DevOps' },
  { title: 'Add OCR cost projection tool for church admins', description: 'Based on historical usage, project monthly Vision API cost per church. Show in settings page. Help churches budget for OCR digitization.', horizon: '90', priority: 'low', category: 'Frontend' },
  { title: 'Add rate limiting for OCR endpoints', description: 'Limit OCR API calls per church: max 50 jobs/hour, max 500 pages/day. Return 429 with retry-after header when exceeded.', horizon: '90', priority: 'high', category: 'Backend' },
  { title: 'Create OCR system monitoring Grafana dashboard template', description: 'JSON template for Grafana: panels for job throughput, error rate, API latency, queue depth, storage usage. Export for easy import.', horizon: '90', priority: 'low', category: 'DevOps' },
  { title: 'Final OCR pipeline end-to-end validation', description: 'Complete validation with real church data: upload 10 real ledger pages (baptism + marriage + funeral), process through full pipeline, review accuracy, fix any remaining issues.', horizon: '90', priority: 'critical', category: 'OCR' },
];

async function main() {
  console.log(`Inserting ${items.length} items...`);

  let inserted = 0;
  for (const item of items) {
    try {
      await pool.query(
        `INSERT INTO om_daily_items (title, description, horizon, status, priority, category, task_type, source, created_at)
         VALUES (?, ?, ?, 'todo', ?, ?, 'task', 'human', NOW())`,
        [item.title, item.description, item.horizon, item.priority, item.category]
      );
      inserted++;
    } catch (err) {
      console.error(`Failed to insert: ${item.title.substring(0, 50)}... — ${err.message}`);
    }
  }

  console.log(`Done: ${inserted}/${items.length} items inserted`);

  // Summary
  const [counts] = await pool.query(
    `SELECT horizon, priority, category, COUNT(*) as count
     FROM om_daily_items WHERE source = 'human' AND status = 'todo'
     GROUP BY horizon, priority, category
     ORDER BY FIELD(horizon,'7','14','30','60','90'), FIELD(priority,'critical','high','medium','low'), category`
  );

  console.log('\n--- Summary ---');
  const byHorizon = {};
  const byCategory = {};
  const byPriority = {};
  for (const row of counts) {
    byHorizon[row.horizon] = (byHorizon[row.horizon] || 0) + row.count;
    byCategory[row.category] = (byCategory[row.category] || 0) + row.count;
    byPriority[row.priority] = (byPriority[row.priority] || 0) + row.count;
  }
  console.log('By horizon:', byHorizon);
  console.log('By category:', byCategory);
  console.log('By priority:', byPriority);

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
