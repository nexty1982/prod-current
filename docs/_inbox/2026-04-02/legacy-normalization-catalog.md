# Legacy Work Item Normalization Catalog

**Prompt ID:** OMD-LEGACY-NORMALIZATION-001  
**Generated:** 2026-04-02  
**Scope:** All non-done OM Daily work items (82 items: 76 backlog + 6 cancelled)  
**Note:** The prompt specified 102 items. The current database contains 82 non-done items. The difference is likely due to items completed or added between prompt authoring and execution.

---

## Deliverable 1: Full Catalog (82 Items)

### Legend

- **NC** = normalization_confidence (high/medium/low)
- **CSR** = change_set_required (yes/no/uncertain)
- **NMR** = needs_manual_review (yes/no)

---

### Item 1

| Field | Value |
|---|---|
| legacy_item_id | 6 |
| legacy_title | Unit test: Vision API client wrapper |
| legacy_description | Tests for visionClient.ts -- mock API responses, verify retry on 429/503, verify timeout handling, verify credential validation. |
| proposed_title | Add unit tests for Vision API client wrapper |
| objective | Validate visionClient.ts behavior under normal and error conditions |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline code lives in orthodoxmetrics backend; explicitly set in DB |
| work_type | Chore |
| work_type_reason | Non-user-facing test coverage work |
| execution_mode | single_step |
| execution_mode_reason | Self-contained test file creation |
| requested_outcome | Unit tests covering retry, timeout, and credential validation for visionClient.ts |
| acceptance_criteria_min | Test file exists with passing tests for 429/503 retry, timeout, and credential validation |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Single test file, no cross-cutting concerns |
| likely_dependency_on_other_item | no |
| dependency_reason | Can be written against existing code |
| needs_manual_review | no |
| manual_review_reason | Clear scope and acceptance |
| normalization_confidence | high |

---

### Item 2

| Field | Value |
|---|---|
| legacy_item_id | 12 |
| legacy_title | Add multi-page PDF splitting into individual page images |
| legacy_description | Use pdf-poppler or pdf2pic to extract pages from uploaded PDFs. Create one ocr_feeder_pages entry per page. Support up to 50 pages per PDF. |
| proposed_title | Implement multi-page PDF splitting for OCR pipeline |
| objective | Enable processing of multi-page PDF uploads by splitting into individual page images |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline backend feature; explicitly set in DB |
| work_type | Feature |
| work_type_reason | New capability -- PDF splitting does not exist yet |
| execution_mode | single_step |
| execution_mode_reason | Backend-only change with clear scope |
| requested_outcome | Uploaded PDFs are split into individual pages, each creating an ocr_feeder_pages entry |
| acceptance_criteria_min | PDF upload creates one ocr_feeder_pages row per page, up to 50 pages |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Backend-only, self-contained feature |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone pipeline enhancement |
| needs_manual_review | no |
| manual_review_reason | Clear spec with specific library and DB targets |
| normalization_confidence | high |

---

### Item 3

| Field | Value |
|---|---|
| legacy_item_id | 18 |
| legacy_title | Create integration test: upload image -> Vision API -> parsed records |
| legacy_description | End-to-end test using a real baptism ledger scan. Verify: job created, page preprocessed, Vision API called, tokens extracted, fields mapped, drafts created. |
| proposed_title | Add integration test for full OCR pipeline (upload to draft creation) |
| objective | Validate the complete OCR pipeline end-to-end with a real baptism ledger |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline integration test; explicitly set in DB |
| work_type | Chore |
| work_type_reason | Test infrastructure, non-user-facing |
| execution_mode | single_step |
| execution_mode_reason | Single test suite covering existing pipeline |
| requested_outcome | Integration test that exercises the full pipeline from upload to draft creation |
| acceptance_criteria_min | Passing integration test that verifies job creation, preprocessing, Vision API call, extraction, and draft creation |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained test |
| likely_dependency_on_other_item | no |
| dependency_reason | Tests existing pipeline |
| needs_manual_review | no |
| manual_review_reason | Clear scope |
| normalization_confidence | high |

---

### Item 4

| Field | Value |
|---|---|
| legacy_item_id | 19 |
| legacy_title | Create integration test: marriage ledger extraction pipeline |
| legacy_description | Use a real marriage ledger scan through the full pipeline. Verify two-table layout detection, date-based record boundaries, and field mapping. |
| proposed_title | Add integration test for marriage ledger extraction pipeline |
| objective | Validate marriage-specific OCR extraction logic end-to-end |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline test; explicitly set in DB |
| work_type | Chore |
| work_type_reason | Test infrastructure |
| execution_mode | single_step |
| execution_mode_reason | Single test suite |
| requested_outcome | Integration test validating marriage ledger extraction including two-table layout and date boundaries |
| acceptance_criteria_min | Passing test verifying two-table layout detection, date-based record boundaries, and field mapping |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained test |
| likely_dependency_on_other_item | no |
| dependency_reason | Tests existing pipeline |
| needs_manual_review | no |
| manual_review_reason | Clear scope |
| normalization_confidence | high |

---

### Item 5

| Field | Value |
|---|---|
| legacy_item_id | 20 |
| legacy_title | Create integration test: funeral record extraction |
| legacy_description | End-to-end test with funeral record scan. Verify record type classification, field extraction (deceased, dates, cause of death), and draft creation. |
| proposed_title | Add integration test for funeral record extraction pipeline |
| objective | Validate funeral-specific OCR extraction logic end-to-end |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline test; explicitly set in DB |
| work_type | Chore |
| work_type_reason | Test infrastructure |
| execution_mode | single_step |
| execution_mode_reason | Single test suite |
| requested_outcome | Integration test validating funeral record extraction including classification and field mapping |
| acceptance_criteria_min | Passing test verifying record type classification, field extraction, and draft creation for funeral records |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained test |
| likely_dependency_on_other_item | no |
| dependency_reason | Tests existing pipeline |
| needs_manual_review | no |
| manual_review_reason | Clear scope |
| normalization_confidence | high |

---

### Item 6

| Field | Value |
|---|---|
| legacy_item_id | 28 |
| legacy_title | Implement quadrant-based fallback for baptism extraction |
| legacy_description | When anchor phrases are not found, fall back to quadrant-based extraction (upper-left=names, upper-right=dates, lower=sponsors/clergy) as noted TODO in layoutExtractor.ts. |
| proposed_title | Add quadrant-based fallback extraction for baptism records |
| objective | Improve baptism extraction resilience when anchor phrases are absent |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline backend; references layoutExtractor.ts |
| work_type | Enhancement |
| work_type_reason | Improves existing extraction with a fallback strategy |
| execution_mode | single_step |
| execution_mode_reason | Single file modification with clear logic |
| requested_outcome | Baptism extraction succeeds using quadrant-based spatial logic when anchor phrases fail |
| acceptance_criteria_min | When anchor phrases not found, extraction falls back to quadrant-based mapping (upper-left=names, upper-right=dates, lower=sponsors/clergy) |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Single backend change |
| likely_dependency_on_other_item | no |
| dependency_reason | References existing TODO in codebase |
| needs_manual_review | no |
| manual_review_reason | Clear spec and file target |
| normalization_confidence | high |

---

### Item 7

| Field | Value |
|---|---|
| legacy_item_id | 29 |
| legacy_title | Add baptism record number sequence validation |
| legacy_description | Validate that extracted record numbers form a sequential series within a ledger page. Flag gaps or duplicates for review. |
| proposed_title | Add record number sequence validation for baptism extractions |
| objective | Detect and flag gaps or duplicates in extracted baptism record number sequences |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline validation logic |
| work_type | Enhancement |
| work_type_reason | Adds validation to existing extraction output |
| execution_mode | single_step |
| execution_mode_reason | Backend-only validation logic |
| requested_outcome | Extracted record numbers are validated for sequential integrity; gaps/duplicates flagged |
| acceptance_criteria_min | Validation step detects and flags non-sequential record numbers within a page |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained validation step |
| likely_dependency_on_other_item | no |
| dependency_reason | Works on existing extraction output |
| needs_manual_review | no |
| manual_review_reason | Clear scope |
| normalization_confidence | high |

---

### Item 8

| Field | Value |
|---|---|
| legacy_item_id | 31 |
| legacy_title | Improve marriage_ledger_v1 column band calibration |
| legacy_description | The current column bands are calibrated for one ledger format. Add adaptive band detection based on header row positions. Test with 5+ different ledger scans. |
| proposed_title | Add adaptive column band detection for marriage ledger extraction |
| objective | Make marriage ledger column mapping work across diverse ledger formats |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline backend; references marriage_ledger_v1 |
| work_type | Enhancement |
| work_type_reason | Improves existing column band logic |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Requires implementation then validation with 5+ scan formats |
| requested_outcome | Column bands adapt to different ledger formats using header row positions |
| acceptance_criteria_min | Adaptive band detection works correctly on at least 5 different ledger scan formats |
| affected_subsystem | OCR pipeline |
| change_set_required | uncertain |
| change_set_reason | May need implementation + validation phases with test data |
| likely_dependency_on_other_item | no |
| dependency_reason | Works on existing engine |
| needs_manual_review | no |
| manual_review_reason | Clear scope, though validation with real scans may need human verification |
| normalization_confidence | medium |

---

### Item 9

| Field | Value |
|---|---|
| legacy_item_id | 34 |
| legacy_title | Handle two-page marriage records (groom page + bride page) |
| legacy_description | Some ledgers split marriage records across two pages. Detect continuation markers and merge records across pages. |
| proposed_title | Add cross-page marriage record merging (groom/bride pages) |
| objective | Handle marriage records split across two pages by detecting and merging continuations |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline backend |
| work_type | Feature |
| work_type_reason | New capability -- cross-page merging does not exist |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Requires continuation detection logic first, then merge logic, then validation |
| requested_outcome | Marriage records split across groom/bride pages are automatically detected and merged |
| acceptance_criteria_min | System detects continuation markers and produces merged records from two-page marriage entries |
| affected_subsystem | OCR pipeline |
| change_set_required | uncertain |
| change_set_reason | Multi-step implementation that may benefit from phased delivery |
| likely_dependency_on_other_item | yes |
| dependency_reason | Related to item 88 (cross-page record continuation detection) |
| needs_manual_review | no |
| manual_review_reason | Clear scope |
| normalization_confidence | medium |

---

### Item 10

| Field | Value |
|---|---|
| legacy_item_id | 37 |
| legacy_title | Add funeral age-at-death calculation and validation |
| legacy_description | Extract age field. Cross-validate against birth/death dates when both available. Handle formats: years, years+months, infant/stillborn. |
| proposed_title | Add age-at-death calculation and cross-validation for funeral records |
| objective | Extract and validate age-at-death from funeral records with cross-date checking |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline backend |
| work_type | Enhancement |
| work_type_reason | Adds validation to existing funeral extraction |
| execution_mode | single_step |
| execution_mode_reason | Self-contained extraction and validation logic |
| requested_outcome | Age-at-death is extracted, cross-validated against dates, with support for multiple formats |
| acceptance_criteria_min | Age field extracted; cross-validated against birth/death dates; handles years, years+months, and infant/stillborn formats |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained enhancement |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone extraction improvement |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 11

| Field | Value |
|---|---|
| legacy_item_id | 45 |
| legacy_title | Create transliteration module for Cyrillic -> Latin |
| legacy_description | Standardized transliteration for names: support GOST, BGN/PCGN, and scholarly systems. Allow per-church transliteration preference. |
| proposed_title | Build Cyrillic-to-Latin transliteration module with multiple systems |
| objective | Provide standardized name transliteration supporting multiple transliteration standards |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline utility module |
| work_type | Feature |
| work_type_reason | New module/capability |
| execution_mode | multi_phase_unordered |
| execution_mode_reason | Multiple transliteration systems (GOST, BGN/PCGN, scholarly) can be built independently; per-church preference is a separate concern |
| requested_outcome | Transliteration module supporting GOST, BGN/PCGN, and scholarly systems with per-church configurability |
| acceptance_criteria_min | Module converts Cyrillic to Latin using at least 3 systems; per-church preference is configurable |
| affected_subsystem | OCR pipeline |
| change_set_required | uncertain |
| change_set_reason | Multiple systems plus church preference storage could be phased |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone module |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 12

| Field | Value |
|---|---|
| legacy_item_id | 54 |
| legacy_title | Add camera capture for mobile OCR uploads |
| legacy_description | Add camera button on mobile that opens device camera for direct photo capture. Auto-crop detected document edges before upload. |
| proposed_title | Add mobile camera capture with auto-crop for OCR uploads |
| objective | Enable direct camera capture on mobile devices with automatic document edge detection |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend OCR feature |
| work_type | Feature |
| work_type_reason | New mobile capability |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Camera capture first, then auto-crop edge detection is a separate technical challenge |
| requested_outcome | Mobile users can capture photos directly with auto-cropping of document edges |
| acceptance_criteria_min | Camera button works on mobile; captured images are auto-cropped to document edges before upload |
| affected_subsystem | OCR pipeline |
| change_set_required | uncertain |
| change_set_reason | Camera capture and auto-crop may be delivered separately |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone frontend feature |
| needs_manual_review | no |
| manual_review_reason | Clear scope |
| normalization_confidence | medium |

---

### Item 13

| Field | Value |
|---|---|
| legacy_item_id | 55 |
| legacy_title | Add job list with real-time status updates via WebSocket |
| legacy_description | Connect OCR job list to existing WebSocket service. Push status updates (queued->processing->completed) without polling. |
| proposed_title | Add WebSocket-driven real-time status updates to OCR job list |
| objective | Replace polling with WebSocket push for OCR job status updates |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend + backend WebSocket integration |
| work_type | Enhancement |
| work_type_reason | Improves existing job list with real-time updates |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Backend WebSocket events first, then frontend subscription |
| requested_outcome | OCR job list updates in real-time via WebSocket without polling |
| acceptance_criteria_min | Job status transitions (queued/processing/completed) push to UI via WebSocket |
| affected_subsystem | OCR pipeline |
| change_set_required | yes |
| change_set_reason | Backend WebSocket emitter must exist before frontend can consume |
| likely_dependency_on_other_item | no |
| dependency_reason | References existing WebSocket service |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 14

| Field | Value |
|---|---|
| legacy_item_id | 57 |
| legacy_title | Add bulk job actions (retry all failed, delete completed) |
| legacy_description | Toolbar buttons for batch operations on the job list. Add corresponding backend endpoints POST /admin/ocr/jobs/bulk with action parameter. |
| proposed_title | Add bulk job actions (retry failed, delete completed) with backend endpoints |
| objective | Enable batch operations on OCR jobs from the frontend |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend + backend feature |
| work_type | Feature |
| work_type_reason | New bulk operation capability |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Backend endpoint first, then frontend toolbar |
| requested_outcome | Users can retry all failed jobs or delete completed jobs in bulk |
| acceptance_criteria_min | POST /admin/ocr/jobs/bulk endpoint exists; frontend toolbar buttons for retry-all-failed and delete-completed work |
| affected_subsystem | OCR pipeline |
| change_set_required | yes |
| change_set_reason | Backend endpoint must exist before frontend can call it |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone feature |
| needs_manual_review | no |
| manual_review_reason | Clear spec with endpoint definition |
| normalization_confidence | high |

---

### Item 15

| Field | Value |
|---|---|
| legacy_item_id | 61 |
| legacy_title | Add field confidence heat map overlay |
| legacy_description | Color-code bounding boxes by confidence: green (>85%), yellow (60-85%), red (<60%). Toggle overlay on/off. |
| proposed_title | Add confidence heat map overlay for OCR workbench fields |
| objective | Visually indicate extraction confidence levels on bounding boxes |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend OCR workbench feature |
| work_type | Feature |
| work_type_reason | New visual overlay capability |
| execution_mode | single_step |
| execution_mode_reason | Frontend-only with clear color rules |
| requested_outcome | Bounding boxes are color-coded by confidence with toggle control |
| acceptance_criteria_min | Bounding boxes colored green >85%, yellow 60-85%, red <60% with on/off toggle |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Frontend-only change |
| likely_dependency_on_other_item | no |
| dependency_reason | Confidence data already exists in extraction output |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 16

| Field | Value |
|---|---|
| legacy_item_id | 63 |
| legacy_title | Add keyboard shortcuts for workbench navigation |
| legacy_description | Tab/Shift+Tab to move between fields, Enter to confirm, Escape to cancel edit, Arrow keys to navigate entries, Ctrl+S to save. |
| proposed_title | Add keyboard shortcuts for OCR workbench navigation |
| objective | Enable keyboard-driven navigation and editing in the OCR workbench |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend OCR workbench feature |
| work_type | Enhancement |
| work_type_reason | Improves existing workbench UX |
| execution_mode | single_step |
| execution_mode_reason | Frontend-only keyboard handler implementation |
| requested_outcome | Workbench supports Tab, Enter, Escape, Arrow keys, Ctrl+S for navigation and editing |
| acceptance_criteria_min | Listed keyboard shortcuts work in workbench for field navigation, confirm, cancel, and save |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Frontend-only |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone UX enhancement |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 17

| Field | Value |
|---|---|
| legacy_item_id | 64 |
| legacy_title | Add undo/redo for workbench field edits |
| legacy_description | Track edit history per session. Ctrl+Z/Ctrl+Y to undo/redo field changes. Show edit history panel. |
| proposed_title | Add undo/redo with edit history for OCR workbench fields |
| objective | Enable reversible field editing with visible history in the workbench |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend OCR workbench feature |
| work_type | Feature |
| work_type_reason | New capability -- edit history tracking |
| execution_mode | single_step |
| execution_mode_reason | Frontend-only state management |
| requested_outcome | Ctrl+Z/Y undo/redo works for field edits; edit history panel visible |
| acceptance_criteria_min | Undo/redo keyboard shortcuts work; edit history panel shows changes |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Frontend-only |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone feature |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 18

| Field | Value |
|---|---|
| legacy_item_id | 67 |
| legacy_title | Add side-by-side diff view for corrected vs. original extraction |
| legacy_description | When a reviewer edits fields, show a diff highlighting what changed. Store original extraction for comparison. |
| proposed_title | Add diff view comparing original vs corrected OCR extraction |
| objective | Show reviewers what changed between original extraction and their corrections |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend OCR workbench + backend storage |
| work_type | Feature |
| work_type_reason | New diff visualization capability |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Must store original extraction before diff can be computed |
| requested_outcome | Side-by-side diff view highlighting field changes between original and corrected extraction |
| acceptance_criteria_min | Original extraction stored; diff view shows field-level changes when reviewer edits |
| affected_subsystem | OCR pipeline |
| change_set_required | yes |
| change_set_reason | Backend storage change before frontend diff view |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone feature |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 19

| Field | Value |
|---|---|
| legacy_item_id | 70 |
| legacy_title | Add post-commit success summary with links to new records |
| legacy_description | After committing, show summary: N records created with links to each new record in the church records system. |
| proposed_title | Add post-commit summary with record links |
| objective | Provide user feedback after committing OCR results with links to created records |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend OCR workbench feature |
| work_type | Enhancement |
| work_type_reason | Improves existing commit workflow UX |
| execution_mode | single_step |
| execution_mode_reason | Frontend display after existing commit action |
| requested_outcome | Success summary after commit showing record count and links to each new record |
| acceptance_criteria_min | After committing, summary shows N records created with clickable links to each record |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Frontend display enhancement |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone UX improvement |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 20

| Field | Value |
|---|---|
| legacy_item_id | 71 |
| legacy_title | Add review assignment workflow (assign to specific reviewer) |
| legacy_description | Allow admins to assign drafts to specific users for review. Show assigned reviewer on draft. Send notification on assignment. |
| proposed_title | Add reviewer assignment workflow for OCR drafts |
| objective | Enable admins to assign OCR drafts to specific reviewers with notifications |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend + backend workflow feature |
| work_type | Feature |
| work_type_reason | New assignment and notification capability |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Backend assignment storage/API, then frontend UI, then notification system |
| requested_outcome | Admins can assign drafts to reviewers; assignment shown on draft; notifications sent |
| acceptance_criteria_min | Drafts can be assigned to users; assigned reviewer visible on draft; notification sent on assignment |
| affected_subsystem | OCR pipeline |
| change_set_required | yes |
| change_set_reason | Backend API + frontend UI + notification system are ordered dependencies |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone workflow feature |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 21

| Field | Value |
|---|---|
| legacy_item_id | 75 |
| legacy_title | Add real-time processing log viewer in admin |
| legacy_description | Stream worker logs via WebSocket for currently processing jobs. Show pipeline stage, timing, errors in real-time. |
| proposed_title | Add real-time log viewer for OCR worker processing |
| objective | Stream OCR worker logs to admin UI for live monitoring |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend + backend admin feature |
| work_type | Feature |
| work_type_reason | New admin monitoring capability |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Backend log streaming first, then frontend viewer |
| requested_outcome | Admin can view real-time OCR worker logs showing stage, timing, and errors |
| acceptance_criteria_min | WebSocket streams worker logs; admin UI shows pipeline stage, timing, and errors in real-time |
| affected_subsystem | OCR pipeline |
| change_set_required | yes |
| change_set_reason | Backend WebSocket streaming before frontend viewer |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone admin feature |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 22

| Field | Value |
|---|---|
| legacy_item_id | 77 |
| legacy_title | Add layout template auto-detection from uploaded images |
| legacy_description | When a new job is created, compare the page structure against known templates. Score match by column positions, header keywords, page dimensions. |
| proposed_title | Add automatic layout template detection for uploaded OCR images |
| objective | Automatically match uploaded images to known layout templates |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline backend |
| work_type | Feature |
| work_type_reason | New auto-detection capability |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Template storage/schema first, then matching algorithm, then scoring |
| requested_outcome | New jobs automatically detect the matching layout template based on structure analysis |
| acceptance_criteria_min | System scores uploaded pages against known templates by column positions, header keywords, and dimensions |
| affected_subsystem | OCR pipeline |
| change_set_required | uncertain |
| change_set_reason | May need template storage before detection logic |
| likely_dependency_on_other_item | yes |
| dependency_reason | Related to item 78 (template training from corrections) |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | medium |

---

### Item 23

| Field | Value |
|---|---|
| legacy_item_id | 78 |
| legacy_title | Add layout template training from corrected extractions |
| legacy_description | After N successful extractions with corrections, auto-generate/refine a layout template. Store column band adjustments from user corrections. |
| proposed_title | Add ML-style template training from corrected OCR extractions |
| objective | Automatically refine layout templates based on accumulated user corrections |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline backend |
| work_type | Feature |
| work_type_reason | New machine learning-style capability |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Correction tracking first, then template refinement algorithm |
| requested_outcome | Layout templates improve over time based on user correction patterns |
| acceptance_criteria_min | After N corrections, template column bands are auto-adjusted based on stored corrections |
| affected_subsystem | OCR pipeline |
| change_set_required | yes |
| change_set_reason | Correction storage must exist before training logic |
| likely_dependency_on_other_item | yes |
| dependency_reason | Logically depends on item 77 (template auto-detection) |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | medium |

---

### Item 24

| Field | Value |
|---|---|
| legacy_item_id | 81 |
| legacy_title | Add handwriting vs. print detection per field |
| legacy_description | Analyze Vision API word-level features to classify each field as handwritten or printed. Use different confidence thresholds for handwritten fields. |
| proposed_title | Add handwriting vs print detection per OCR field |
| objective | Classify fields as handwritten or printed and apply appropriate confidence thresholds |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline backend |
| work_type | Feature |
| work_type_reason | New detection capability |
| execution_mode | single_step |
| execution_mode_reason | Analysis of existing Vision API data; single classification step |
| requested_outcome | Each field is classified as handwritten or printed with appropriate confidence thresholds |
| acceptance_criteria_min | Fields classified as handwritten/printed based on Vision API features; different confidence thresholds applied |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained classification logic |
| likely_dependency_on_other_item | no |
| dependency_reason | Uses existing Vision API data |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 25

| Field | Value |
|---|---|
| legacy_item_id | 82 |
| legacy_title | Add handwriting-specific preprocessing pipeline |
| legacy_description | For detected handwritten regions: apply different contrast/threshold settings optimized for handwriting. Binarization with Sauvola method. |
| proposed_title | Add specialized preprocessing pipeline for handwritten regions |
| objective | Apply handwriting-optimized image preprocessing (Sauvola binarization) |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline backend |
| work_type | Feature |
| work_type_reason | New preprocessing path |
| execution_mode | single_step |
| execution_mode_reason | Backend preprocessing logic |
| requested_outcome | Handwritten regions preprocessed with Sauvola binarization and optimized contrast/thresholds |
| acceptance_criteria_min | Handwritten regions use Sauvola binarization with handwriting-optimized contrast/threshold settings |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained preprocessing step |
| likely_dependency_on_other_item | yes |
| dependency_reason | Depends on item 81 (handwriting detection) to identify regions |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 26

| Field | Value |
|---|---|
| legacy_item_id | 83 |
| legacy_title | Build handwriting confidence model for common field types |
| legacy_description | Track per-field accuracy for handwritten content. Identify fields where handwriting recognition consistently fails (e.g., dates vs. names). |
| proposed_title | Build handwriting confidence tracking model by field type |
| objective | Track and analyze handwriting recognition accuracy per field type |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline backend |
| work_type | Feature |
| work_type_reason | New analytics/model capability |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Data collection first, then analysis/model |
| requested_outcome | Per-field handwriting accuracy is tracked; consistently failing field types are identified |
| acceptance_criteria_min | System tracks handwriting accuracy per field type and identifies consistently failing fields |
| affected_subsystem | OCR pipeline |
| change_set_required | uncertain |
| change_set_reason | Data collection and model may be phased |
| likely_dependency_on_other_item | yes |
| dependency_reason | Depends on item 81 (handwriting detection) |
| needs_manual_review | no |
| manual_review_reason | Clear scope |
| normalization_confidence | medium |

---

### Item 27

| Field | Value |
|---|---|
| legacy_item_id | 84 |
| legacy_title | Add manual transcription fallback UI for low-confidence handwriting |
| legacy_description | When handwriting confidence is below threshold, show enlarged field image and ask user to manually transcribe. Include common character palette. |
| proposed_title | Add manual transcription fallback UI for low-confidence handwritten fields |
| objective | Provide assisted manual transcription when handwriting OCR confidence is too low |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend OCR workbench feature |
| work_type | Feature |
| work_type_reason | New UI capability |
| execution_mode | single_step |
| execution_mode_reason | Frontend-only UI component |
| requested_outcome | Low-confidence handwritten fields trigger enlarged image view with character palette for manual transcription |
| acceptance_criteria_min | Below-threshold handwriting fields show enlarged image with transcription input and character palette |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Frontend-only component |
| likely_dependency_on_other_item | yes |
| dependency_reason | Depends on item 81 (handwriting detection) for confidence scores |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 28

| Field | Value |
|---|---|
| legacy_item_id | 85 |
| legacy_title | Add historical handwriting style profiles (19th/20th century) |
| legacy_description | Different eras have different handwriting conventions. Create style profiles that adjust extraction parameters for era-appropriate expectations. |
| proposed_title | Add era-specific handwriting style profiles for historical documents |
| objective | Adjust extraction parameters based on historical era handwriting conventions |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline backend |
| work_type | Feature |
| work_type_reason | New capability -- era-specific configuration |
| execution_mode | multi_phase_unordered |
| execution_mode_reason | Different era profiles can be built independently |
| requested_outcome | Style profiles exist for different historical eras that adjust extraction parameters |
| acceptance_criteria_min | At least 19th and 20th century style profiles adjust extraction parameters appropriately |
| affected_subsystem | OCR pipeline |
| change_set_required | uncertain |
| change_set_reason | Profile framework + individual profiles could be phased |
| likely_dependency_on_other_item | yes |
| dependency_reason | Depends on handwriting detection chain (items 81-83) |
| needs_manual_review | yes |
| manual_review_reason | Era-specific handwriting expertise needed to validate profiles |
| normalization_confidence | medium |

---

### Item 29

| Field | Value |
|---|---|
| legacy_item_id | 87 |
| legacy_title | Add page ordering and reordering UI |
| legacy_description | After multi-page PDF upload, show thumbnail strip of all pages. Allow drag-and-drop reordering. Mark pages to skip. |
| proposed_title | Add page ordering/reordering UI for multi-page PDF uploads |
| objective | Enable users to reorder and skip pages after multi-page PDF upload |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend OCR workbench feature |
| work_type | Feature |
| work_type_reason | New page management capability |
| execution_mode | single_step |
| execution_mode_reason | Frontend-only drag-and-drop UI |
| requested_outcome | Thumbnail strip with drag-and-drop reordering and skip marking for uploaded pages |
| acceptance_criteria_min | Page thumbnails displayed after PDF upload; drag-and-drop reordering works; pages can be marked to skip |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Frontend-only |
| likely_dependency_on_other_item | yes |
| dependency_reason | Depends on item 12 (multi-page PDF splitting) |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 30

| Field | Value |
|---|---|
| legacy_item_id | 88 |
| legacy_title | Add cross-page record continuation detection |
| legacy_description | Detect when a record spans two pages (e.g., last entry on page continues to next). Merge tokens across page boundary. |
| proposed_title | Add cross-page record continuation detection and token merging |
| objective | Detect and merge records that span page boundaries |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline backend |
| work_type | Feature |
| work_type_reason | New detection and merge capability |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Detection logic first, then merge logic |
| requested_outcome | Records spanning page boundaries are detected and their tokens merged |
| acceptance_criteria_min | System detects page-spanning records and merges tokens across the boundary |
| affected_subsystem | OCR pipeline |
| change_set_required | uncertain |
| change_set_reason | Detection and merge could be phased |
| likely_dependency_on_other_item | yes |
| dependency_reason | Related to item 34 (two-page marriage records); depends on item 12 (multi-page PDF) |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | medium |

---

### Item 31

| Field | Value |
|---|---|
| legacy_item_id | 89 |
| legacy_title | Add page-level summary in job detail view |
| legacy_description | Show per-page: thumbnail, record count, avg confidence, status. Allow reprocessing individual pages. |
| proposed_title | Add per-page summary cards in OCR job detail view |
| objective | Provide page-level visibility and reprocessing controls in the job detail UI |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend OCR feature |
| work_type | Enhancement |
| work_type_reason | Improves existing job detail view |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Backend per-page stats API needed before frontend can display; reprocessing endpoint separate |
| requested_outcome | Job detail shows per-page thumbnail, record count, avg confidence, status, and reprocess button |
| acceptance_criteria_min | Per-page summary with thumbnail, record count, avg confidence, and status displayed; individual page reprocessing works |
| affected_subsystem | OCR pipeline |
| change_set_required | yes |
| change_set_reason | Backend stats API + frontend display + reprocess endpoint are ordered |
| likely_dependency_on_other_item | no |
| dependency_reason | Works on existing multi-page data |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 32

| Field | Value |
|---|---|
| legacy_item_id | 93 |
| legacy_title | Add merged cell detection and handling |
| legacy_description | Detect cells that span multiple columns (common in ledger headers). Handle by distributing content to appropriate fields. |
| proposed_title | Add merged cell detection for ledger table extraction |
| objective | Handle multi-column merged cells in ledger headers during extraction |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline backend |
| work_type | Enhancement |
| work_type_reason | Improves existing table extraction |
| execution_mode | single_step |
| execution_mode_reason | Self-contained detection and distribution logic |
| requested_outcome | Merged cells spanning multiple columns are detected and content distributed to appropriate fields |
| acceptance_criteria_min | Multi-column merged cells detected; content distributed to correct fields |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained enhancement |
| likely_dependency_on_other_item | no |
| dependency_reason | Enhances existing extraction |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 33

| Field | Value |
|---|---|
| legacy_item_id | 94 |
| legacy_title | Add support for rotated/sideways text in table cells |
| legacy_description | Some ledger columns have vertical text labels. Detect rotation and correct before extraction. |
| proposed_title | Add rotated/vertical text detection and correction for table cells |
| objective | Handle vertically-oriented text in ledger columns |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline backend |
| work_type | Enhancement |
| work_type_reason | Improves existing extraction |
| execution_mode | single_step |
| execution_mode_reason | Self-contained detection and correction logic |
| requested_outcome | Rotated/vertical text in table cells is detected and corrected before extraction |
| acceptance_criteria_min | Vertical/rotated text in cells is detected and corrected for accurate extraction |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained enhancement |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone extraction improvement |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 34

| Field | Value |
|---|---|
| legacy_item_id | 100 |
| legacy_title | Add per-church correction dictionary UI |
| legacy_description | Admin page showing all correction patterns for a church. Allow manual add/edit/delete. Import/export as JSON. |
| proposed_title | Add church-level correction dictionary management UI |
| objective | Enable admins to view and manage OCR correction patterns per church |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend admin feature |
| work_type | Feature |
| work_type_reason | New admin UI capability |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Backend API for CRUD + import/export first, then frontend UI |
| requested_outcome | Admin page for viewing, adding, editing, deleting, importing, and exporting church correction patterns |
| acceptance_criteria_min | Admin page shows correction patterns; supports add/edit/delete and JSON import/export |
| affected_subsystem | OCR pipeline |
| change_set_required | yes |
| change_set_reason | Backend CRUD API before frontend UI |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone admin feature |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 35

| Field | Value |
|---|---|
| legacy_item_id | 104 |
| legacy_title | Build accuracy dashboard showing field-level performance |
| legacy_description | Chart showing accuracy % per field across record types. Identify worst-performing fields. Filter by church, time range. |
| proposed_title | Build field-level OCR accuracy dashboard |
| objective | Provide visibility into extraction accuracy per field across record types |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend + backend analytics |
| work_type | Feature |
| work_type_reason | New analytics dashboard |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Backend accuracy aggregation API, then frontend charting |
| requested_outcome | Dashboard showing per-field accuracy with church and time range filters |
| acceptance_criteria_min | Chart shows accuracy % per field per record type; filterable by church and time range; worst-performing fields identifiable |
| affected_subsystem | OCR pipeline |
| change_set_required | yes |
| change_set_reason | Backend aggregation before frontend visualization |
| likely_dependency_on_other_item | no |
| dependency_reason | Uses existing correction data |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 36

| Field | Value |
|---|---|
| legacy_item_id | 105 |
| legacy_title | Add accuracy trend tracking over time |
| legacy_description | Track weekly accuracy metrics. Show trend line: is OCR getting better with corrections? Compare pre/post correction memory. |
| proposed_title | Add weekly accuracy trend tracking for OCR performance |
| objective | Track whether OCR accuracy improves over time with corrections |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend + backend analytics |
| work_type | Feature |
| work_type_reason | New analytics capability |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Backend metrics collection, then trend computation, then visualization |
| requested_outcome | Weekly accuracy trends visible with pre/post correction memory comparison |
| acceptance_criteria_min | Weekly accuracy metrics tracked; trend line visible; pre/post correction comparison available |
| affected_subsystem | OCR pipeline |
| change_set_required | yes |
| change_set_reason | Backend metrics collection before visualization |
| likely_dependency_on_other_item | yes |
| dependency_reason | Logically related to item 104 (accuracy dashboard) |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 37

| Field | Value |
|---|---|
| legacy_item_id | 108 |
| legacy_title | Add field auto-complete from existing records |
| legacy_description | When editing a draft field, suggest values from existing committed records. E.g., clergy names, common locations, sponsor names. |
| proposed_title | Add auto-complete suggestions from existing records for OCR draft fields |
| objective | Speed up review by suggesting values from previously committed records |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend + backend feature |
| work_type | Feature |
| work_type_reason | New auto-complete capability |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Backend suggestion API first, then frontend autocomplete UI |
| requested_outcome | Draft field editing shows autocomplete suggestions from existing records (clergy, locations, sponsors) |
| acceptance_criteria_min | Autocomplete dropdown shows matching values from existing records when editing draft fields |
| affected_subsystem | OCR pipeline |
| change_set_required | yes |
| change_set_reason | Backend API before frontend autocomplete |
| likely_dependency_on_other_item | no |
| dependency_reason | Uses existing committed records |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 38

| Field | Value |
|---|---|
| legacy_item_id | 111 |
| legacy_title | Add location/parish auto-suggestion from church profile |
| legacy_description | Pre-fill location fields from church profile (city, state, diocese). Suggest nearby parishes for multi-parish records. |
| proposed_title | Add location auto-suggestion from church profile for OCR fields |
| objective | Pre-fill and suggest location data from church profiles |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline + church profile integration |
| work_type | Enhancement |
| work_type_reason | Improves existing field population with profile data |
| execution_mode | single_step |
| execution_mode_reason | Church profile data already exists; pre-fill logic is straightforward |
| requested_outcome | Location fields pre-filled from church profile; nearby parishes suggested |
| acceptance_criteria_min | Location fields auto-populated from church profile (city, state, diocese); nearby parish suggestions appear |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Uses existing church profile data |
| likely_dependency_on_other_item | no |
| dependency_reason | Church profiles already exist |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 39

| Field | Value |
|---|---|
| legacy_item_id | 126 |
| legacy_title | Add S3/object storage option for OCR artifacts |
| legacy_description | Optional S3-compatible storage backend for artifacts. Configurable via env var OCR_STORAGE_BACKEND (local/s3). Useful for scaling. |
| proposed_title | Add S3-compatible storage backend option for OCR artifacts |
| objective | Enable S3 as an alternative to local storage for OCR artifacts |
| repo_target | orthodoxmetrics |
| repo_target_reason | Backend infrastructure |
| work_type | Feature |
| work_type_reason | New storage backend capability |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Storage abstraction layer first, then S3 implementation, then migration path |
| requested_outcome | OCR artifacts can be stored in S3 via OCR_STORAGE_BACKEND env var |
| acceptance_criteria_min | OCR_STORAGE_BACKEND env var switches between local and S3; artifacts stored/retrieved correctly from S3 |
| affected_subsystem | OCR pipeline |
| change_set_required | yes |
| change_set_reason | Storage abstraction must exist before S3 implementation |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone infrastructure feature |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 40

| Field | Value |
|---|---|
| legacy_item_id | 136 |
| legacy_title | Add OCR correction analytics (who corrected what) |
| legacy_description | Track corrections per user: fields corrected, accuracy improvement, time spent reviewing. Show in admin analytics. |
| proposed_title | Add per-user OCR correction analytics |
| objective | Track and display correction activity per user in admin |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend + backend analytics |
| work_type | Feature |
| work_type_reason | New analytics capability |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Backend tracking first, then aggregation API, then admin UI |
| requested_outcome | Admin can see per-user correction stats: fields corrected, accuracy improvement, time spent |
| acceptance_criteria_min | Per-user correction tracking shows fields corrected, accuracy improvement, and review time in admin |
| affected_subsystem | OCR pipeline |
| change_set_required | yes |
| change_set_reason | Backend tracking + API + frontend are ordered |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone analytics feature |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 41

| Field | Value |
|---|---|
| legacy_item_id | 141 |
| legacy_title | Unit tests for ocrClassifier.ts |
| legacy_description | Test classification accuracy for baptism/marriage/funeral across English, Greek, Russian text samples. Test edge cases: empty text, mixed types, unknown types. |
| proposed_title | Add unit tests for ocrClassifier.ts |
| objective | Validate OCR classification logic across languages and edge cases |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline test |
| work_type | Chore |
| work_type_reason | Test coverage |
| execution_mode | single_step |
| execution_mode_reason | Single test file |
| requested_outcome | Test suite covering classification for all record types, languages, and edge cases |
| acceptance_criteria_min | Tests pass for baptism/marriage/funeral classification across English, Greek, Russian; edge cases covered |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained test |
| likely_dependency_on_other_item | no |
| dependency_reason | Tests existing code |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 42

| Field | Value |
|---|---|
| legacy_item_id | 142 |
| legacy_title | Unit tests for columnMapper.ts |
| legacy_description | Test both marriage_ledger_v1 and generic_table engines. Verify header inference, field mapping, confidence scoring, unmapped column handling. |
| proposed_title | Add unit tests for columnMapper.ts |
| objective | Validate column mapping logic for both layout engines |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline test |
| work_type | Chore |
| work_type_reason | Test coverage |
| execution_mode | single_step |
| execution_mode_reason | Single test file |
| requested_outcome | Test suite for both layout engines covering header inference, mapping, scoring, and edge cases |
| acceptance_criteria_min | Tests pass for marriage_ledger_v1 and generic_table engines covering header inference, field mapping, confidence scoring, and unmapped columns |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained test |
| likely_dependency_on_other_item | no |
| dependency_reason | Tests existing code |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 43

| Field | Value |
|---|---|
| legacy_item_id | 143 |
| legacy_title | Unit tests for layoutExtractor.ts |
| legacy_description | Test anchor phrase matching, search zone extraction, ROI config handling. Use synthetic token data to verify field extraction logic. |
| proposed_title | Add unit tests for layoutExtractor.ts |
| objective | Validate layout extraction logic with synthetic data |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline test |
| work_type | Chore |
| work_type_reason | Test coverage |
| execution_mode | single_step |
| execution_mode_reason | Single test file |
| requested_outcome | Test suite covering anchor phrase matching, search zones, ROI config with synthetic data |
| acceptance_criteria_min | Tests pass for anchor phrase matching, search zone extraction, and ROI config using synthetic token data |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained test |
| likely_dependency_on_other_item | no |
| dependency_reason | Tests existing code |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 44

| Field | Value |
|---|---|
| legacy_item_id | 144 |
| legacy_title | Unit tests for extractTokensFromVision.ts |
| legacy_description | Test Vision JSON parsing, token extraction, script detection, line clustering. Use sample Vision API responses. |
| proposed_title | Add unit tests for extractTokensFromVision.ts |
| objective | Validate Vision API response parsing and token extraction |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline test |
| work_type | Chore |
| work_type_reason | Test coverage |
| execution_mode | single_step |
| execution_mode_reason | Single test file |
| requested_outcome | Test suite covering Vision JSON parsing, token extraction, script detection, and line clustering |
| acceptance_criteria_min | Tests pass for Vision JSON parsing, token extraction, script detection, and line clustering using sample responses |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained test |
| likely_dependency_on_other_item | no |
| dependency_reason | Tests existing code |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 45

| Field | Value |
|---|---|
| legacy_item_id | 145 |
| legacy_title | Unit tests for generic_table.js layout engine |
| legacy_description | Test auto-column detection, X-gap analysis, coverage histogram, row merging. Use synthetic coordinate data. |
| proposed_title | Add unit tests for generic_table.js layout engine |
| objective | Validate generic table extraction logic with synthetic data |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline test |
| work_type | Chore |
| work_type_reason | Test coverage |
| execution_mode | single_step |
| execution_mode_reason | Single test file |
| requested_outcome | Test suite for auto-column detection, X-gap, coverage histogram, and row merging |
| acceptance_criteria_min | Tests pass for auto-column detection, X-gap analysis, coverage histogram, and row merging using synthetic coordinates |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained test |
| likely_dependency_on_other_item | no |
| dependency_reason | Tests existing code |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 46

| Field | Value |
|---|---|
| legacy_item_id | 146 |
| legacy_title | Unit tests for marriage_ledger_v1.js |
| legacy_description | Test column band matching, date boundary detection, two-table output, Y-gap row merging. Use real-world coordinate samples. |
| proposed_title | Add unit tests for marriage_ledger_v1.js |
| objective | Validate marriage ledger extraction engine |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline test |
| work_type | Chore |
| work_type_reason | Test coverage |
| execution_mode | single_step |
| execution_mode_reason | Single test file |
| requested_outcome | Test suite for column bands, date boundaries, two-table output, and row merging |
| acceptance_criteria_min | Tests pass for column band matching, date boundary detection, two-table output, and Y-gap merging |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained test |
| likely_dependency_on_other_item | no |
| dependency_reason | Tests existing code |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 47

| Field | Value |
|---|---|
| legacy_item_id | 147 |
| legacy_title | Unit tests for date parsing across formats |
| legacy_description | Test all supported date formats: US, European, ISO, Slavic months, partial dates. Verify normalization to ISO format. |
| proposed_title | Add unit tests for date parsing and normalization |
| objective | Validate date parsing across all supported formats |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline test |
| work_type | Chore |
| work_type_reason | Test coverage |
| execution_mode | single_step |
| execution_mode_reason | Single test file |
| requested_outcome | Test suite covering all date formats with ISO normalization verification |
| acceptance_criteria_min | Tests pass for US, European, ISO, Slavic month, and partial date formats; all normalize to ISO |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained test |
| likely_dependency_on_other_item | no |
| dependency_reason | Tests existing code |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 48

| Field | Value |
|---|---|
| legacy_item_id | 148 |
| legacy_title | Unit tests for transliteration module |
| legacy_description | Test Cyrillic->Latin conversion: GOST, BGN/PCGN, scholarly. Verify handling of edge cases: soft/hard signs, yo/ye, special chars. |
| proposed_title | Add unit tests for transliteration module |
| objective | Validate Cyrillic-to-Latin conversion across systems and edge cases |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline test |
| work_type | Chore |
| work_type_reason | Test coverage |
| execution_mode | single_step |
| execution_mode_reason | Single test file |
| requested_outcome | Test suite for GOST, BGN/PCGN, scholarly transliteration with edge cases |
| acceptance_criteria_min | Tests pass for all three transliteration systems including soft/hard signs, yo/ye, and special characters |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained test |
| likely_dependency_on_other_item | yes |
| dependency_reason | Depends on item 45 (transliteration module) existing |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 49

| Field | Value |
|---|---|
| legacy_item_id | 149 |
| legacy_title | Integration test: full pipeline with mocked Vision API |
| legacy_description | End-to-end test from job creation through draft creation, using pre-recorded Vision API responses. Verify all DB state transitions. |
| proposed_title | Add integration test for full OCR pipeline with mocked Vision API |
| objective | Validate entire pipeline end-to-end without live API calls |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline test |
| work_type | Chore |
| work_type_reason | Test infrastructure |
| execution_mode | single_step |
| execution_mode_reason | Single integration test suite |
| requested_outcome | End-to-end test using pre-recorded Vision responses verifying all DB state transitions |
| acceptance_criteria_min | Integration test runs full pipeline with mocked Vision API; all DB state transitions verified |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained test with fixtures |
| likely_dependency_on_other_item | no |
| dependency_reason | Tests existing pipeline |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 50

| Field | Value |
|---|---|
| legacy_item_id | 150 |
| legacy_title | Integration test: fusion draft -> review -> commit workflow |
| legacy_description | Test the complete review workflow: create drafts, edit fields, finalize, commit to record tables. Verify records appear in church DB. |
| proposed_title | Add integration test for draft-to-commit review workflow |
| objective | Validate the complete review workflow from draft creation to record commit |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline test |
| work_type | Chore |
| work_type_reason | Test infrastructure |
| execution_mode | single_step |
| execution_mode_reason | Single integration test suite |
| requested_outcome | Integration test covering create-edit-finalize-commit workflow with DB verification |
| acceptance_criteria_min | Test creates drafts, edits fields, finalizes, commits; verified records appear in church DB |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained test |
| likely_dependency_on_other_item | no |
| dependency_reason | Tests existing workflow |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 51

| Field | Value |
|---|---|
| legacy_item_id | 151 |
| legacy_title | Integration test: correction memory roundtrip |
| legacy_description | Test: create draft -> edit field -> save correction -> reprocess same image -> verify correction applied automatically. |
| proposed_title | Add integration test for correction memory roundtrip |
| objective | Validate that corrections persist and auto-apply on reprocessing |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline test |
| work_type | Chore |
| work_type_reason | Test infrastructure |
| execution_mode | single_step |
| execution_mode_reason | Single integration test |
| requested_outcome | Test verifies corrections are saved and auto-applied when reprocessing the same image |
| acceptance_criteria_min | Draft edit saved as correction; same image reprocessed; correction applied automatically |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained test |
| likely_dependency_on_other_item | no |
| dependency_reason | Tests existing correction memory |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 52

| Field | Value |
|---|---|
| legacy_item_id | 152 |
| legacy_title | Integration test: multi-page PDF processing |
| legacy_description | Upload a 5-page PDF, verify all pages extracted and processed. Check page ordering, cross-page record detection. |
| proposed_title | Add integration test for multi-page PDF processing |
| objective | Validate multi-page PDF handling end-to-end |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline test |
| work_type | Chore |
| work_type_reason | Test infrastructure |
| execution_mode | single_step |
| execution_mode_reason | Single integration test |
| requested_outcome | Test verifies all pages extracted, processed, ordered correctly, with cross-page detection |
| acceptance_criteria_min | 5-page PDF upload produces 5 processed pages in correct order; cross-page records detected |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained test |
| likely_dependency_on_other_item | yes |
| dependency_reason | Depends on item 12 (PDF splitting) and item 88 (cross-page detection) |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 53

| Field | Value |
|---|---|
| legacy_item_id | 153 |
| legacy_title | Integration test: concurrent worker processing |
| legacy_description | Start 3 worker instances, submit 10 jobs. Verify: no duplicate processing, all jobs complete, SKIP LOCKED works correctly. |
| proposed_title | Add integration test for concurrent OCR worker processing |
| objective | Validate concurrent worker job processing with SKIP LOCKED |
| repo_target | orthodoxmetrics |
| repo_target_reason | Backend concurrency test |
| work_type | Chore |
| work_type_reason | Test infrastructure |
| execution_mode | single_step |
| execution_mode_reason | Single integration test with concurrency setup |
| requested_outcome | Test verifies 3 concurrent workers process 10 jobs without duplication using SKIP LOCKED |
| acceptance_criteria_min | 3 workers, 10 jobs; no duplicate processing; all jobs complete; SKIP LOCKED verified |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Self-contained test |
| likely_dependency_on_other_item | no |
| dependency_reason | Tests existing worker infrastructure |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 54

| Field | Value |
|---|---|
| legacy_item_id | 161 |
| legacy_title | Add interactive tutorial for OCR workbench |
| legacy_description | Step-by-step guided tour of workbench features: upload, view results, edit fields, approve, commit. Use react-joyride or similar. |
| proposed_title | Add guided tutorial for OCR workbench using react-joyride |
| objective | Help new users learn the OCR workbench through an interactive tour |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend OCR feature |
| work_type | Feature |
| work_type_reason | New onboarding capability |
| execution_mode | single_step |
| execution_mode_reason | Frontend-only guided tour component |
| requested_outcome | Interactive step-by-step tutorial covering upload, results, editing, approval, and commit |
| acceptance_criteria_min | Guided tour walks user through upload, view results, edit fields, approve, and commit steps |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Frontend-only |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone onboarding feature |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 55

| Field | Value |
|---|---|
| legacy_item_id | 163 |
| legacy_title | Add sample images for each record type |
| legacy_description | Include 2-3 sample images per record type (baptism/marriage/funeral) for testing. Store in a public samples directory. Use in setup wizard. |
| proposed_title | Add sample ledger images for each record type |
| objective | Provide sample images for testing and onboarding |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline asset/test data |
| work_type | Chore |
| work_type_reason | Test data and documentation support |
| execution_mode | single_step |
| execution_mode_reason | Curating and placing files |
| requested_outcome | 2-3 sample images per record type stored in public samples directory, used in setup wizard |
| acceptance_criteria_min | At least 2 sample images each for baptism, marriage, and funeral in public samples directory |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Asset curation task |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone |
| needs_manual_review | yes |
| manual_review_reason | Requires human selection of appropriate sample images |
| normalization_confidence | high |

---

### Item 56

| Field | Value |
|---|---|
| legacy_item_id | 164 |
| legacy_title | Add OCR settings explanation tooltips |
| legacy_description | Add info icons next to each OCR setting explaining what it does, recommended values, and impact on accuracy/speed. |
| proposed_title | Add explanation tooltips for OCR settings |
| objective | Help users understand OCR settings through contextual help |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend OCR feature |
| work_type | Enhancement |
| work_type_reason | Improves existing settings page UX |
| execution_mode | single_step |
| execution_mode_reason | Frontend-only tooltip additions |
| requested_outcome | Info icons with tooltips for each OCR setting showing purpose, recommended values, and impact |
| acceptance_criteria_min | Each OCR setting has an info icon tooltip explaining purpose, recommended value, and accuracy/speed impact |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Frontend-only |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone UX improvement |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 57

| Field | Value |
|---|---|
| legacy_item_id | 165 |
| legacy_title | Add loading skeletons for OCR pages |
| legacy_description | Replace spinner-only loading states with MUI Skeleton components matching the page layout. Improve perceived performance. |
| proposed_title | Add MUI Skeleton loading states for OCR pages |
| objective | Improve perceived performance with layout-matching skeleton loaders |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend OCR feature |
| work_type | Enhancement |
| work_type_reason | Improves existing loading UX |
| execution_mode | single_step |
| execution_mode_reason | Frontend-only component replacement |
| requested_outcome | Loading states use MUI Skeleton matching page layouts instead of spinners |
| acceptance_criteria_min | OCR pages show MUI Skeleton matching page layout during loading instead of spinner |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Frontend-only |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone UX improvement |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 58

| Field | Value |
|---|---|
| legacy_item_id | 166 |
| legacy_title | Add empty states with illustrations for OCR pages |
| legacy_description | When no jobs exist, show friendly illustration + "Get Started" CTA. Same for empty review queue, empty batch list. |
| proposed_title | Add illustrated empty states for OCR pages |
| objective | Provide friendly empty state guidance when no OCR data exists |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend OCR feature |
| work_type | Enhancement |
| work_type_reason | Improves existing empty state UX |
| execution_mode | single_step |
| execution_mode_reason | Frontend-only component additions |
| requested_outcome | Empty states show illustrations with "Get Started" CTAs for jobs, review queue, and batch list |
| acceptance_criteria_min | Empty states for job list, review queue, and batch list show illustration + Get Started CTA |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Frontend-only |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone UX improvement |
| needs_manual_review | yes |
| manual_review_reason | Requires illustration/design assets |
| normalization_confidence | high |

---

### Item 59

| Field | Value |
|---|---|
| legacy_item_id | 167 |
| legacy_title | Add dark mode support for OCR workbench overlays |
| legacy_description | Ensure bounding boxes, confidence colors, and text overlays are visible in both light and dark themes. |
| proposed_title | Add dark mode support for OCR workbench overlays |
| objective | Ensure OCR visual overlays work correctly in dark theme |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend OCR feature |
| work_type | Enhancement |
| work_type_reason | Improves existing theming support |
| execution_mode | single_step |
| execution_mode_reason | CSS/theme adjustments |
| requested_outcome | Bounding boxes, confidence colors, and text overlays visible in both light and dark themes |
| acceptance_criteria_min | All OCR overlays visible and legible in both light and dark mode |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Frontend-only |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone theming work |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 60

| Field | Value |
|---|---|
| legacy_item_id | 168 |
| legacy_title | Add responsive design for OCR pages on tablet |
| legacy_description | Optimize OCR workbench layout for iPad-sized screens. Side-by-side -> stacked layout below 1024px. Touch-friendly controls. |
| proposed_title | Add tablet-responsive layout for OCR workbench |
| objective | Optimize OCR workbench for iPad/tablet screen sizes |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend OCR feature |
| work_type | Enhancement |
| work_type_reason | Improves existing layout responsiveness |
| execution_mode | single_step |
| execution_mode_reason | CSS/layout responsive adjustments |
| requested_outcome | OCR workbench stacks layout below 1024px with touch-friendly controls |
| acceptance_criteria_min | Layout switches from side-by-side to stacked below 1024px; controls are touch-friendly |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Frontend-only |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone responsive work |
| needs_manual_review | no |
| manual_review_reason | Clear spec with explicit breakpoint |
| normalization_confidence | high |

---

### Item 61

| Field | Value |
|---|---|
| legacy_item_id | 169 |
| legacy_title | Add accessibility (a11y) audit for OCR components |
| legacy_description | Verify ARIA labels, keyboard navigation, screen reader support, color contrast for all OCR UI components. Fix identified issues. |
| proposed_title | Conduct accessibility audit and fix OCR UI components |
| objective | Ensure OCR components meet accessibility standards |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend OCR feature |
| work_type | Chore |
| work_type_reason | Non-feature maintenance/compliance work |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Audit first, then fix identified issues |
| requested_outcome | OCR components pass accessibility audit with ARIA labels, keyboard nav, screen reader, and contrast |
| acceptance_criteria_min | ARIA labels present; keyboard navigation works; screen reader support verified; color contrast passes |
| affected_subsystem | OCR pipeline |
| change_set_required | uncertain |
| change_set_reason | Audit phase may reveal scope that requires phased fixes |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone compliance work |
| needs_manual_review | no |
| manual_review_reason | Clear acceptance criteria |
| normalization_confidence | high |

---

### Item 62

| Field | Value |
|---|---|
| legacy_item_id | 181 |
| legacy_title | Load test OCR pipeline with 100 concurrent jobs |
| legacy_description | Simulate 100 simultaneous job submissions. Measure: queue time, processing time, memory usage, API rate limiting behavior. Document findings. |
| proposed_title | Load test OCR pipeline with 100 concurrent jobs |
| objective | Measure pipeline performance and identify bottlenecks under load |
| repo_target | orthodoxmetrics |
| repo_target_reason | DevOps/pipeline performance testing |
| work_type | Spike |
| work_type_reason | Investigation/research with documented findings |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Setup test harness, run tests, analyze and document results |
| requested_outcome | Documented performance data: queue time, processing time, memory usage, rate limiting behavior |
| acceptance_criteria_min | 100 concurrent jobs submitted; queue time, processing time, memory, and rate limiting measured and documented |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Testing/investigation only |
| likely_dependency_on_other_item | no |
| dependency_reason | Tests existing infrastructure |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 63

| Field | Value |
|---|---|
| legacy_item_id | 182 |
| legacy_title | Add OCR cost projection tool for church admins |
| legacy_description | Based on historical usage, project monthly Vision API cost per church. Show in settings page. Help churches budget for OCR digitization. |
| proposed_title | Add Vision API cost projection tool for church admins |
| objective | Help churches budget for OCR by projecting monthly API costs |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend + backend analytics feature |
| work_type | Feature |
| work_type_reason | New budgeting/projection capability |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Backend cost calculation API, then frontend display |
| requested_outcome | Church admins see projected monthly Vision API cost based on historical usage in settings |
| acceptance_criteria_min | Settings page shows projected monthly Vision API cost based on historical usage per church |
| affected_subsystem | OCR pipeline |
| change_set_required | yes |
| change_set_reason | Backend projection API before frontend display |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone feature |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 64

| Field | Value |
|---|---|
| legacy_item_id | 184 |
| legacy_title | Create OCR system monitoring Grafana dashboard template |
| legacy_description | JSON template for Grafana: panels for job throughput, error rate, API latency, queue depth, storage usage. Export for easy import. |
| proposed_title | Create Grafana dashboard template for OCR system monitoring |
| objective | Provide a ready-to-import Grafana dashboard for OCR pipeline monitoring |
| repo_target | orthodoxmetrics |
| repo_target_reason | DevOps monitoring |
| work_type | Chore |
| work_type_reason | Operational tooling |
| execution_mode | single_step |
| execution_mode_reason | Single JSON template creation |
| requested_outcome | Grafana JSON template with panels for throughput, error rate, latency, queue depth, storage |
| acceptance_criteria_min | Importable Grafana JSON template with panels for job throughput, error rate, API latency, queue depth, and storage |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Standalone template file |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone monitoring artifact |
| needs_manual_review | yes |
| manual_review_reason | Requires Grafana data source configuration matching actual infrastructure |
| normalization_confidence | medium |

---

### Item 65

| Field | Value |
|---|---|
| legacy_item_id | 185 |
| legacy_title | Final OCR pipeline end-to-end validation |
| legacy_description | Complete validation with real church data: upload 10 real ledger pages (baptism + marriage + funeral), process through full pipeline, review accuracy, fix any remaining issues. |
| proposed_title | Final OCR pipeline end-to-end validation with real church data |
| objective | Validate the complete OCR pipeline with real production data |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline validation |
| work_type | Spike |
| work_type_reason | Investigation/validation with potential fixes |
| execution_mode | multi_phase_feedback_gated |
| execution_mode_reason | Upload, process, review accuracy, fix issues -- iterative with human review between phases |
| requested_outcome | 10 real ledger pages processed with accuracy reviewed and remaining issues fixed |
| acceptance_criteria_min | 10 real pages (mix of baptism/marriage/funeral) processed; accuracy reviewed; identified issues fixed |
| affected_subsystem | OCR pipeline |
| change_set_required | yes |
| change_set_reason | Feedback-gated: validation may reveal bugs requiring fixes between phases |
| likely_dependency_on_other_item | no |
| dependency_reason | Capstone validation task |
| needs_manual_review | yes |
| manual_review_reason | Requires real church data and human accuracy assessment |
| normalization_confidence | high |

---

### Item 66

| Field | Value |
|---|---|
| legacy_item_id | 371 |
| legacy_title | Add OCR image rotation controls in workbench |
| legacy_description | Allow manual 90/180/270 rotation of uploaded images in the workbench before processing. Save rotation in job metadata. |
| proposed_title | Add image rotation controls to OCR workbench |
| objective | Enable users to manually rotate images before OCR processing |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend + backend OCR feature |
| work_type | Feature |
| work_type_reason | New rotation capability |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Frontend rotation UI, then backend metadata storage and rotation-aware processing |
| requested_outcome | Users can rotate images 90/180/270 degrees; rotation saved in job metadata |
| acceptance_criteria_min | Rotation buttons for 90/180/270; rotation persisted in job metadata; processing respects rotation |
| affected_subsystem | OCR pipeline |
| change_set_required | yes |
| change_set_reason | Frontend UI + backend metadata storage are ordered |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone feature |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 67

| Field | Value |
|---|---|
| legacy_item_id | 373 |
| legacy_title | Build OCR comparison tool: original vs extracted text |
| legacy_description | Side-by-side panel showing raw Vision text on left and structured extraction on right. Highlight where parser mapped each token. |
| proposed_title | Build original vs extracted text comparison panel for OCR |
| objective | Visualize how raw Vision text maps to structured extraction |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend OCR workbench feature |
| work_type | Feature |
| work_type_reason | New visualization tool |
| execution_mode | single_step |
| execution_mode_reason | Frontend-only visualization using existing data |
| requested_outcome | Side-by-side panel with raw Vision text and structured extraction, with token mapping highlights |
| acceptance_criteria_min | Panel shows raw Vision text alongside structured extraction with highlighted token mappings |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Frontend-only visualization |
| likely_dependency_on_other_item | no |
| dependency_reason | Uses existing extraction data |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 68

| Field | Value |
|---|---|
| legacy_item_id | 376 |
| legacy_title | Create OCR test fixture set with known-good outputs |
| legacy_description | Collect 10 ledger scans (3 baptism, 4 marriage, 3 funeral) with manually verified extraction results. Use as regression test baseline. |
| proposed_title | Create OCR regression test fixture set with verified outputs |
| objective | Establish a baseline test fixture set for OCR regression testing |
| repo_target | orthodoxmetrics |
| repo_target_reason | OCR pipeline test data |
| work_type | Chore |
| work_type_reason | Test infrastructure |
| execution_mode | single_step |
| execution_mode_reason | Data curation task |
| requested_outcome | 10 ledger scans with manually verified extraction results as regression baseline |
| acceptance_criteria_min | 10 scans (3 baptism, 4 marriage, 3 funeral) with verified extraction outputs stored as fixtures |
| affected_subsystem | OCR pipeline |
| change_set_required | no |
| change_set_reason | Test data curation |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone data curation |
| needs_manual_review | yes |
| manual_review_reason | Requires manual verification of extraction outputs |
| normalization_confidence | high |

---

### Item 69

| Field | Value |
|---|---|
| legacy_item_id | 382 |
| legacy_title | Add OCR statistics widget to church dashboard |
| legacy_description | Card on church admin dashboard showing: total records digitized, pages processed this month, records pending review. |
| proposed_title | Add OCR statistics widget to church admin dashboard |
| objective | Provide OCR activity summary on the church dashboard |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend + backend dashboard feature |
| work_type | Feature |
| work_type_reason | New dashboard widget |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Backend stats API, then frontend widget |
| requested_outcome | Dashboard card showing total digitized records, pages this month, and pending review count |
| acceptance_criteria_min | Dashboard widget shows total records digitized, pages processed this month, and records pending review |
| affected_subsystem | OCR pipeline |
| change_set_required | yes |
| change_set_reason | Backend stats API before frontend widget |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone dashboard feature |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 70

| Field | Value |
|---|---|
| legacy_item_id | 384 |
| legacy_title | Create OCR contributor acknowledgment in records |
| legacy_description | Track which user uploaded/reviewed/committed each OCR record. Show contributor name in record detail view. |
| proposed_title | Add contributor tracking and acknowledgment for OCR records |
| objective | Track and display who uploaded, reviewed, and committed each OCR record |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend + backend feature |
| work_type | Feature |
| work_type_reason | New tracking/attribution capability |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Backend tracking storage first, then frontend display |
| requested_outcome | Each OCR record shows who uploaded, reviewed, and committed it |
| acceptance_criteria_min | Upload/review/commit user tracked per record; contributor name shown in record detail view |
| affected_subsystem | OCR pipeline |
| change_set_required | yes |
| change_set_reason | Backend tracking before frontend display |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone feature |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 71

| Field | Value |
|---|---|
| legacy_item_id | 385 |
| legacy_title | Add end-to-end cypress tests for OCR upload workflow |
| legacy_description | Automated browser tests: navigate to OCR page, upload image, wait for processing, review results, commit. Use test church and mocked Vision API. |
| proposed_title | Add Cypress E2E tests for OCR upload-to-commit workflow |
| objective | Automate browser testing of the full OCR workflow |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend test infrastructure |
| work_type | Chore |
| work_type_reason | Test infrastructure |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Test setup (fixtures, mocks) first, then test implementation |
| requested_outcome | Cypress tests covering navigate, upload, process, review, and commit with test church |
| acceptance_criteria_min | Cypress tests run full workflow: navigate to OCR, upload, wait for processing, review, and commit using test church and mocked Vision API |
| affected_subsystem | OCR pipeline |
| change_set_required | uncertain |
| change_set_reason | May need test infrastructure setup before test authoring |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone test suite |
| needs_manual_review | no |
| manual_review_reason | Clear spec |
| normalization_confidence | high |

---

### Item 72 (CANCELLED)

| Field | Value |
|---|---|
| legacy_item_id | 609 |
| legacy_title | [TEST] Branch lifecycle endpoint test |
| legacy_description | [TEST] Branch lifecycle endpoint test -- test completed successfully, item no longer needed |
| proposed_title | [CANCELLED] Branch lifecycle endpoint test |
| objective | Test item -- no longer relevant |
| repo_target | orthodoxmetrics |
| repo_target_reason | Explicitly set in DB |
| work_type | Chore |
| work_type_reason | One-off test, already cancelled |
| execution_mode | single_step |
| execution_mode_reason | Was a one-off test |
| requested_outcome | N/A -- cancelled |
| acceptance_criteria_min | N/A -- cancelled |
| affected_subsystem | OM Daily |
| change_set_required | no |
| change_set_reason | Cancelled |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone test |
| needs_manual_review | no |
| manual_review_reason | Already cancelled; no action needed |
| normalization_confidence | high |

---

### Item 73 (CANCELLED)

| Field | Value |
|---|---|
| legacy_item_id | 629 |
| legacy_title | Test item from browser |
| legacy_description | Test item -- cleanup |
| proposed_title | [CANCELLED] Test item from browser |
| objective | Test item -- no longer relevant |
| repo_target | unknown |
| repo_target_reason | No meaningful content to infer repo |
| work_type | Unknown |
| work_type_reason | Test item with no real work |
| execution_mode | unknown |
| execution_mode_reason | Test item |
| requested_outcome | N/A -- cancelled |
| acceptance_criteria_min | N/A -- cancelled |
| affected_subsystem | unknown |
| change_set_required | no |
| change_set_reason | Cancelled |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone test |
| needs_manual_review | yes |
| manual_review_reason | repo_target unknown, work_type unknown -- but item is cancelled so review is low priority |
| normalization_confidence | high |

---

### Item 74 (CANCELLED)

| Field | Value |
|---|---|
| legacy_item_id | 630 |
| legacy_title | [TEST] Verify feature task_type fix |
| legacy_description | [TEST] Verify feature task_type fix -- test completed successfully |
| proposed_title | [CANCELLED] Verify feature task_type fix |
| objective | Test item -- no longer relevant |
| repo_target | orthodoxmetrics |
| repo_target_reason | Explicitly set in DB |
| work_type | Chore |
| work_type_reason | One-off verification test |
| execution_mode | single_step |
| execution_mode_reason | Was a one-off test |
| requested_outcome | N/A -- cancelled |
| acceptance_criteria_min | N/A -- cancelled |
| affected_subsystem | OM Daily |
| change_set_required | no |
| change_set_reason | Cancelled |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone test |
| needs_manual_review | no |
| manual_review_reason | Already cancelled |
| normalization_confidence | high |

---

### Item 75

| Field | Value |
|---|---|
| legacy_item_id | 647 |
| legacy_title | error handling system for omai |
| legacy_description | (See full 9-step specification in legacy record) GOAL: Harden OMAI's error handling, logging, and maintenance behavior. Steps: 1) Current state audit, 2) Centralized backend error handling, 3) Frontend ErrorBoundary, 4) Centralized logging, 5) Controlled maintenance mode, 6) Nginx hardening, 7) API wrapper + UI guardrails, 8) Health endpoint, 9) Validation. |
| proposed_title | Implement comprehensive error handling, logging, and maintenance mode for OMAI |
| objective | Harden OMAI so users never see raw HTML errors, blank screens, or inconsistent states |
| repo_target | omai |
| repo_target_reason | Title and description explicitly target OMAI; explicitly set in DB as omai |
| work_type | Enhancement |
| work_type_reason | Improves existing system behavior across multiple subsystems |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Description specifies 9 ordered steps with explicit sequencing (audit -> implement -> validate) |
| requested_outcome | All API errors return JSON, no blank screens, errors logged centrally, controlled maintenance mode, health endpoint |
| acceptance_criteria_min | API errors return JSON only; ErrorBoundary prevents blank screens; errors logged to DB; maintenance mode toggle works; health endpoint exists; Nginx returns maintenance page only on upstream failure |
| affected_subsystem | control panel |
| change_set_required | yes |
| change_set_reason | 9 ordered phases spanning backend, frontend, nginx, and logging -- clear multi-phase dependency chain |
| likely_dependency_on_other_item | no |
| dependency_reason | Self-contained system hardening |
| needs_manual_review | yes |
| manual_review_reason | Massive scope -- likely needs splitting into multiple child items. Contains at least 9 distinct deliverables. |
| normalization_confidence | high |

---

### Item 76

| Field | Value |
|---|---|
| legacy_item_id | 657 |
| legacy_title | Consolidate duplicate tables between orthodoxmetrics_db and omai_db |
| legacy_description | Major overhaul: 26 tables duplicated across both databases. Need single source of truth. |
| proposed_title | Consolidate 26 duplicate tables between orthodoxmetrics_db and omai_db |
| objective | Establish single source of truth for tables duplicated across both databases |
| repo_target | shared |
| repo_target_reason | Explicitly spans both databases/repos |
| work_type | Migration |
| work_type_reason | Data/schema consolidation across databases |
| execution_mode | multi_phase_feedback_gated |
| execution_mode_reason | 26 tables require analysis, planning, migration, and verification per table with risk checkpoints |
| requested_outcome | Each of the 26 duplicate tables has a single canonical location |
| acceptance_criteria_min | All 26 duplicate tables consolidated to single source of truth; no broken references |
| affected_subsystem | unknown |
| change_set_required | yes |
| change_set_reason | Cross-repo migration affecting 26 tables requires staged execution |
| likely_dependency_on_other_item | yes |
| dependency_reason | Related to item 696 (DB audit of duplicate tables) which should precede this |
| needs_manual_review | yes |
| manual_review_reason | Major cross-database migration; high risk; needs careful planning and human approval |
| normalization_confidence | medium |

---

### Item 77

| Field | Value |
|---|---|
| legacy_item_id | 661 |
| legacy_title | OM Seedlings Phase 4: Church Map targeting, eligibility reconciliation, presets |
| legacy_description | Phase 4 of OM Seedlings: Added GET /api/admin/om-seedlings/churches endpoint returning Phase 2 churches with coordinates + eligibility. Rebuilt Step 1 UI with Mapbox GL map, eligibility summary cards, targeting presets (All Eligible, OCA/NY, OCA/NJ, Unseeded Only), and full eligibility reconciliation table with enrichment/pipeline badges. |
| proposed_title | OM Seedlings Phase 4: Church Map targeting and eligibility reconciliation |
| objective | Build church map targeting with eligibility reconciliation for OM Seedlings |
| repo_target | orthodoxmetrics |
| repo_target_reason | OM Seedlings is an orthodoxmetrics feature |
| work_type | Enhancement |
| work_type_reason | Phase 4 of existing Seedlings feature |
| execution_mode | multi_phase_ordered |
| execution_mode_reason | Backend API + frontend UI with Mapbox integration |
| requested_outcome | Church map with targeting presets, eligibility summary, and reconciliation table |
| acceptance_criteria_min | GET /api/admin/om-seedlings/churches returns church data with coordinates/eligibility; Mapbox map with targeting presets and reconciliation table works |
| affected_subsystem | church map |
| change_set_required | yes |
| change_set_reason | Backend API before frontend Mapbox integration |
| likely_dependency_on_other_item | no |
| dependency_reason | Builds on earlier Seedlings phases (already done) |
| needs_manual_review | no |
| manual_review_reason | Description is detailed and specific |
| normalization_confidence | high |

---

### Item 78

| Field | Value |
|---|---|
| legacy_item_id | 667 |
| legacy_title | Add EditableText to About, Contact, Blog, Pricing pages |
| legacy_description | (null) |
| proposed_title | Add EditableText component to About, Contact, Blog, and Pricing pages |
| objective | Enable inline text editing on static pages |
| repo_target | orthodoxmetrics |
| repo_target_reason | Frontend pages in orthodoxmetrics |
| work_type | Enhancement |
| work_type_reason | Extends existing EditableText capability to more pages |
| execution_mode | multi_phase_unordered |
| execution_mode_reason | Each page can be updated independently |
| requested_outcome | About, Contact, Blog, and Pricing pages support inline text editing |
| acceptance_criteria_min | EditableText component integrated into About, Contact, Blog, and Pricing pages |
| affected_subsystem | unknown |
| change_set_required | no |
| change_set_reason | Each page is independent; can be done atomically |
| likely_dependency_on_other_item | no |
| dependency_reason | EditableText component presumably already exists |
| needs_manual_review | yes |
| manual_review_reason | Description is null -- acceptance criteria cannot be fully inferred beyond title |
| normalization_confidence | medium |

---

### Item 79

| Field | Value |
|---|---|
| legacy_item_id | 696 |
| legacy_title | DB Audit: OM Daily duplicate tables analysis |
| legacy_description | Deep analysis of all daily-task/work-item tables across MariaDB schemas on 192.168.1.241. Identify canonical vs duplicate vs support tables. No schema changes -- analysis only. Prompt ID: PROMPT-DB-AUDIT-OMDAILY-DUPLICATE-TABLES-001 |
| proposed_title | Audit OM Daily duplicate tables across MariaDB schemas |
| objective | Identify canonical vs duplicate vs support tables for OM Daily data |
| repo_target | shared |
| repo_target_reason | Cross-database analysis spanning both schemas |
| work_type | Spike |
| work_type_reason | Analysis/investigation only -- no schema changes |
| execution_mode | single_step |
| execution_mode_reason | Analysis-only task with documented output |
| requested_outcome | Documented mapping of canonical, duplicate, and support tables across schemas |
| acceptance_criteria_min | All daily-task/work-item tables identified and classified as canonical, duplicate, or support |
| affected_subsystem | OM Daily |
| change_set_required | no |
| change_set_reason | Analysis only, no changes |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone audit |
| needs_manual_review | no |
| manual_review_reason | Clear scope and methodology |
| normalization_confidence | high |

---

### Item 80 (CANCELLED)

| Field | Value |
|---|---|
| legacy_item_id | 703 |
| legacy_title | (empty) |
| legacy_description | Empty draft - cancelled during audit |
| proposed_title | [CANCELLED] Empty draft |
| objective | N/A -- empty cancelled draft |
| repo_target | omai |
| repo_target_reason | Explicitly set in DB |
| work_type | Unknown |
| work_type_reason | Empty title and description |
| execution_mode | unknown |
| execution_mode_reason | No content to infer |
| requested_outcome | N/A -- cancelled |
| acceptance_criteria_min | N/A -- cancelled |
| affected_subsystem | unknown |
| change_set_required | no |
| change_set_reason | Cancelled |
| likely_dependency_on_other_item | no |
| dependency_reason | N/A |
| needs_manual_review | yes |
| manual_review_reason | work_type unknown, execution_mode unknown -- but item is cancelled so review is low priority |
| normalization_confidence | high |

---

### Item 81 (CANCELLED)

| Field | Value |
|---|---|
| legacy_item_id | 708 |
| legacy_title | [VERIFY-707][OMAI] Repo routing smoke test -- UPDATED |
| legacy_description | OMD-707 verification test item -- completed and closed. |
| proposed_title | [CANCELLED] OMAI repo routing smoke test |
| objective | Verification test -- completed and cancelled |
| repo_target | omai |
| repo_target_reason | Title and DB explicitly target OMAI |
| work_type | Chore |
| work_type_reason | One-off verification test |
| execution_mode | single_step |
| execution_mode_reason | One-off test |
| requested_outcome | N/A -- cancelled |
| acceptance_criteria_min | N/A -- cancelled |
| affected_subsystem | OM Daily |
| change_set_required | no |
| change_set_reason | Cancelled |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone test |
| needs_manual_review | no |
| manual_review_reason | Already cancelled |
| normalization_confidence | high |

---

### Item 82 (CANCELLED)

| Field | Value |
|---|---|
| legacy_item_id | 709 |
| legacy_title | [VERIFY-707][OM] Repo routing smoke test -- UPDATED |
| legacy_description | OMD-707 verification test item -- completed and closed. |
| proposed_title | [CANCELLED] OM repo routing smoke test |
| objective | Verification test -- completed and cancelled |
| repo_target | orthodoxmetrics |
| repo_target_reason | Title and DB explicitly target OM |
| work_type | Chore |
| work_type_reason | One-off verification test |
| execution_mode | single_step |
| execution_mode_reason | One-off test |
| requested_outcome | N/A -- cancelled |
| acceptance_criteria_min | N/A -- cancelled |
| affected_subsystem | OM Daily |
| change_set_required | no |
| change_set_reason | Cancelled |
| likely_dependency_on_other_item | no |
| dependency_reason | Standalone test |
| needs_manual_review | no |
| manual_review_reason | Already cancelled |
| normalization_confidence | high |

---
---

## Deliverable 2: Summary Tables

### By repo_target

| repo_target | Count | Item IDs |
|---|---|---|
| orthodoxmetrics | 75 | 6, 12, 18-20, 28-29, 31, 34, 37, 45, 54-55, 57, 61, 63-64, 67, 70-71, 75, 77-78, 81-85, 87-89, 93-94, 100, 104-105, 108, 111, 126, 136, 141-153, 161, 163-169, 181-182, 184-185, 371, 373, 376, 382, 384-385, 609, 630, 661, 667, 709 |
| omai | 3 | 647, 703, 708 |
| shared | 2 | 657, 696 |
| unknown | 1 | 629 |
| **Total** | **82** | |

### By work_type

| work_type | Count | Item IDs |
|---|---|---|
| Chore | 31 | 6, 18-20, 141-153, 161, 163, 169, 181, 184, 376, 385, 609, 630, 708, 709 |
| Feature | 24 | 12, 34, 45, 54, 57, 61, 64, 67, 71, 75, 77-78, 81-82, 84, 87, 100, 104-105, 108, 136, 182, 371, 373, 382, 384 |
| Enhancement | 16 | 28-29, 31, 37, 55, 63, 70, 83, 85, 89, 93-94, 111, 164-168, 647, 661, 667 |
| Spike | 3 | 181, 185, 696 |
| Migration | 1 | 657 |
| Unknown | 2 | 629, 703 |
| **Total** | **82** | |

Note: Some items were reclassified from their legacy `task_type` (mostly "chore") to more accurate work_types based on description analysis.

### By execution_mode

| execution_mode | Count | Item IDs |
|---|---|---|
| single_step | 48 | 6, 12, 18-20, 28-29, 37, 61, 63-64, 70, 81, 82, 84, 87, 93-94, 108, 111, 141-153, 161, 163-168, 373, 376, 609, 629, 630, 696, 703, 708, 709 |
| multi_phase_ordered | 25 | 31, 34, 45, 54-55, 57, 67, 71, 75, 77-78, 83, 85, 88-89, 100, 104-105, 126, 136, 169, 182, 185, 371, 382, 384, 385, 647, 661 |
| multi_phase_unordered | 2 | 45, 667 |
| multi_phase_feedback_gated | 2 | 185, 657 |
| unknown | 3 | 629, 703 |
| **Total** | **82** | |

Note: Item 45 appears in both multi_phase_unordered (multiple systems) and was classified as multi_phase_unordered. Item 185 is feedback_gated due to iterative human review.

### By change_set_required

| change_set_required | Count | Item IDs |
|---|---|---|
| yes | 20 | 55, 57, 67, 71, 75, 78, 89, 100, 104-105, 108, 126, 136, 182, 185, 371, 382, 384, 647, 657, 661 |
| no | 54 | 6, 12, 18-20, 28-29, 37, 61, 63-64, 70, 81, 82, 84, 87, 93-94, 111, 141-153, 161, 163-168, 181, 184, 373, 376, 609, 629, 630, 696, 703, 708, 709 |
| uncertain | 8 | 31, 34, 45, 54, 77, 83, 85, 88, 169, 385, 667 |
| **Total** | **82** | |

### By needs_manual_review

| needs_manual_review | Count | Item IDs |
|---|---|---|
| yes | 9 | 85, 163, 166, 184, 185, 376, 629, 647, 657, 667, 703 |
| no | 71 | All remaining |
| **Total** | **82** | |

**Reasons for manual review:**
- **629, 703**: Unknown work_type/repo_target (cancelled test items)
- **647**: Massive scope needing split into ~9 child items
- **657**: High-risk cross-database migration
- **667**: Null description
- **85**: Era-specific handwriting expertise needed
- **163, 376**: Require human image selection/verification
- **166**: Requires design assets
- **184**: Requires Grafana infra configuration knowledge
- **185**: Requires real church data and human accuracy review

### By normalization_confidence

| confidence | Count |
|---|---|
| high | 73 |
| medium | 9 |
| low | 0 |

Medium-confidence items: 31, 34, 54, 77, 78, 83, 88, 184, 657, 667

---
---

## Deliverable 3: Split Candidates

Items that should likely be split into multiple child items:

### 1. Item 647 -- "Error handling system for OMAI" (CRITICAL SPLIT)

**Current scope:** 9 ordered steps spanning backend, frontend, nginx, and logging
**Recommended split into:**
1. OMAI error handling audit (current state analysis)
2. Backend centralized error handler (Express middleware)
3. Frontend ErrorBoundary implementation
4. Centralized logging system (backend + frontend error endpoint)
5. Controlled maintenance mode (DB flag + middleware + UI)
6. Nginx hardening (proxy rules, JSON-only API)
7. Frontend API wrapper and guardrails
8. Health/observability endpoint
9. End-to-end validation of error handling

**Rationale:** Each step is a self-contained deliverable. The item as written is essentially a project plan, not a work item. It contains 9 distinct implementations that should each be independently tracked, reviewed, and deployed.

---

### 2. Item 657 -- "Consolidate duplicate tables between orthodoxmetrics_db and omai_db"

**Current scope:** 26 duplicate tables to consolidate
**Recommended split into:**
1. Analysis/mapping of all 26 duplicate tables (→ may already be item 696)
2. Per-table or per-group migration items (grouped by risk/dependency)
3. Reference update sweep (update all code references to point to canonical locations)
4. Cleanup phase (drop defunct tables after verification)

**Rationale:** 26-table migration cannot be safely done atomically. Each table group needs its own change set with verification.

---

### 3. Item 45 -- "Create transliteration module for Cyrillic -> Latin"

**Current scope:** 3 transliteration systems + per-church preference
**Recommended split into:**
1. Core transliteration module with one system (e.g., GOST)
2. Add BGN/PCGN system
3. Add scholarly system
4. Per-church transliteration preference storage and UI

**Rationale:** Each transliteration system is independent; per-church preference is a separate concern requiring DB storage.

---

### 4. Items 81-85 -- Handwriting Detection Chain

**These 5 items form a dependency chain that should be explicitly sequenced:**
1. Item 81: Handwriting vs print detection (prerequisite for all)
2. Item 82: Handwriting preprocessing pipeline (depends on 81)
3. Item 83: Handwriting confidence model (depends on 81)
4. Item 84: Manual transcription fallback UI (depends on 81/83)
5. Item 85: Historical handwriting style profiles (depends on 81-83)

**Rationale:** These are already separate items but should be linked as an ordered change set. Item 85 itself could be split into per-era profiles.

---

### 5. Items 77-78 -- Template Detection + Training

**These 2 items form a dependency pair:**
1. Item 77: Template auto-detection (prerequisite)
2. Item 78: Template training from corrections (depends on 77)

**Rationale:** Template training requires the detection framework to exist first.

---

### 6. Items 104-105 -- Accuracy Analytics

**These 2 items are sequential:**
1. Item 104: Accuracy dashboard (per-field performance)
2. Item 105: Accuracy trend tracking over time (depends on 104's data infrastructure)

**Rationale:** Trend tracking requires the accuracy metrics infrastructure from item 104.

---

### 7. Item 661 -- "OM Seedlings Phase 4"

**Current scope:** Backend API + Mapbox map + presets + reconciliation table
**Possible split into:**
1. Backend GET /api/admin/om-seedlings/churches endpoint
2. Frontend Mapbox GL map with church pins
3. Targeting presets (All Eligible, OCA/NY, OCA/NJ, Unseeded Only)
4. Eligibility reconciliation table with badges

**Rationale:** Description contains 4 distinct deliverables, though they may be reasonable as a single change set if scope is manageable.

---
---

## Deliverable 4: Auto-Derivation Model for Prompt-Intake Parameters

### Recommended Auto-Derivation Strategy

For each field, here is the recommended approach to auto-derive prompt-intake parameters from legacy `title` + `description`:

---

#### proposed_title

**Derivation method:** Rule-based transformation
1. If title starts with `[TEST]` or `[VERIFY]`, prefix with `[CANCELLED]` if status is cancelled
2. If title starts with a verb (Add, Build, Create, Implement), keep as-is
3. If title is a noun phrase, prepend appropriate verb:
   - "Unit test*" -> "Add unit tests for..."
   - "Integration test*" -> "Add integration test for..."
   - "Load test*" -> "Run load test..."
4. Normalize casing to sentence case
5. Remove trailing punctuation

**Confidence:** High -- most legacy titles are already well-formed imperative sentences.

---

#### objective

**Derivation method:** NLP extraction from first sentence of description
1. Extract the primary goal/verb from description
2. If description is null/empty, derive from title by expanding to "Enable/Improve/Validate [title subject]"
3. Strip implementation details (library names, file paths, endpoint specs)
4. Cap at ~100 characters

**Confidence:** Medium -- descriptions vary in structure. Null descriptions (e.g., item 667) require title-only derivation.

---

#### repo_target

**Derivation method:** Multi-signal classifier
1. **Primary signal:** Existing `repo_target` DB column (already set for all items)
2. **Validation signals:**
   - Category prefix: `om-*` -> orthodoxmetrics, `omai-*` -> omai
   - Description keywords: "OMAI", "control panel", "ops console" -> omai
   - Description keywords: "OCR", "church", "records" -> orthodoxmetrics
   - Cross-database references -> shared
3. **Conflict resolution:** If DB column and signals disagree, flag for manual review

**Confidence:** High -- DB column is already populated; validation catches misclassifications.

---

#### work_type

**Derivation method:** Keyword classifier with fallback
1. **Title patterns:**
   - "Unit test*", "Integration test*", "E2E test*", "Load test*" -> Chore
   - "Add*", "Build*", "Create*", "Implement*" (new capability) -> Feature
   - "Improve*", "Add ... to existing*", "Support*" (existing capability) -> Enhancement
   - "Consolidate*", "Migrate*", "Convert*" -> Migration
   - "Audit*", "Investigate*", "Analyze*", "Validate*" (no implementation) -> Spike
   - "Fix*", "Resolve*", "Patch*" -> Bugfix
   - "Document*", "Add docs*" -> Docs
2. **Description heuristics:**
   - Contains test framework references (jest, cypress, mocha) -> Chore
   - Contains "refactor" or "restructure" -> Refactor
   - Contains "research" or "investigate" or "document findings" -> Spike
3. **Override legacy `task_type`:** Most are set to "chore" regardless of actual type -- do NOT trust the legacy field as primary signal.
4. **Fallback:** Unknown if no pattern matches

**Confidence:** High -- title verb patterns are strong predictors. Legacy `task_type` should NOT be used as primary input.

---

#### execution_mode

**Derivation method:** Complexity heuristic
1. **single_step indicators:**
   - Description mentions a single file, single component, or single test
   - Category is only frontend OR only backend (not both)
   - No sequential language ("first", "then", "after")
   - Estimated as small scope
2. **multi_phase_ordered indicators:**
   - Description mentions backend + frontend
   - Contains sequential language ("first...then", "before...after")
   - References API endpoints + UI components
   - Contains numbered steps
3. **multi_phase_unordered indicators:**
   - Lists multiple independent items (e.g., "support X, Y, and Z systems")
   - Uses "each" or "per" suggesting parallel work
4. **multi_phase_feedback_gated indicators:**
   - Contains "review", "validate", "audit first then fix"
   - Contains "approval" or "checkpoint" language
   - Involves real data validation
5. **Fallback:** Unknown

**Confidence:** Medium -- requires parsing description structure. Works well for items with clear descriptions; less reliable for terse titles.

---

#### requested_outcome

**Derivation method:** Template filling
1. Extract the primary noun/capability from title
2. Apply template: "[Verb] that [capability] works/exists such that [key detail from description]"
3. If description is null, use: "[Title verb] [title object]"

**Confidence:** Medium -- formulaic but sufficient for initial cataloging.

---

#### acceptance_criteria_min

**Derivation method:** Description bullet extraction
1. Extract verifiable claims from description (look for "verify", "support", "handle", numbers, specific behaviors)
2. Convert to testable statements: "X works", "Y returns Z", "N items supported"
3. If description has numbered steps, use them directly
4. Cap at 3-5 criteria
5. If description is null, derive single criterion from title: "[Title object] functions correctly"

**Confidence:** Medium-High -- most legacy descriptions contain implicit acceptance criteria that can be extracted.

---

#### affected_subsystem

**Derivation method:** Category mapping + keyword matching
1. **Category mapping:**
   - `om-ocr` -> OCR pipeline
   - `om-frontend` -> (inspect description for specific subsystem, default to "unknown")
   - `om-backend` -> (inspect description for specific subsystem, default to "unknown")
   - `om-devops` -> OCR pipeline (if OCR-related) or "unknown"
   - `om-admin` -> account hub or control panel
   - `om-auth` -> account hub
   - `om-records` -> OCR pipeline
   - `om-database` -> unknown (inspect description)
   - `omai-*` -> control panel
   - `docs` -> unknown
2. **Description keywords as secondary signal:**
   - "OCR", "Vision API", "extraction", "workbench" -> OCR pipeline
   - "dashboard", "admin" -> control panel
   - "church map", "seedlings" -> church map
   - "theme", "dark mode" -> theming
   - "OM Daily", "work item" -> OM Daily
   - "GitHub", "sync" -> GitHub sync

**Confidence:** High -- category field is a strong signal; description keywords disambiguate.

---

#### change_set_required

**Derivation method:** Rule-based from execution_mode + scope signals
1. If execution_mode is `multi_phase_ordered` or `multi_phase_feedback_gated` -> yes
2. If repo_target is `shared` -> yes
3. If description mentions both backend and frontend with dependency -> yes
4. If execution_mode is `single_step` -> no
5. If execution_mode is `multi_phase_unordered` -> uncertain
6. Otherwise -> uncertain

**Confidence:** High -- derived directly from execution_mode which is the primary driver.

---

#### needs_manual_review

**Derivation method:** Rule-based flags
1. If repo_target is `unknown` -> yes
2. If work_type is `Unknown` -> yes
3. If execution_mode is `unknown` -> yes
4. If description is null or empty -> yes
5. If description length > 1000 chars (suggests mixed scope) -> yes
6. If title contains `[TEST]` and status is not cancelled -> yes
7. If normalization_confidence is `low` -> yes
8. Otherwise -> no

**Confidence:** High -- purely rule-based with clear triggers.

---

### Auto-Derivation Reliability Summary

| Field | Auto-derivation reliability | Human review recommended? |
|---|---|---|
| proposed_title | High | No -- rule-based transformation |
| objective | Medium | Only for null-description items |
| repo_target | High | Only when signals conflict |
| work_type | High | Only for ambiguous items |
| execution_mode | Medium | For items with terse descriptions |
| requested_outcome | Medium | For null-description items |
| acceptance_criteria_min | Medium-High | For null-description items |
| affected_subsystem | High | Rarely |
| change_set_required | High | Derived from execution_mode |
| needs_manual_review | High | N/A -- this IS the review flag |

### Recommended Implementation

1. **Phase 1:** Apply rule-based derivations (proposed_title, repo_target, work_type, change_set_required, needs_manual_review) -- these can be fully automated with high confidence.
2. **Phase 2:** Apply template-based derivations (objective, requested_outcome, acceptance_criteria_min) -- these can be automated but should be spot-checked.
3. **Phase 3:** Human review of all items flagged with `needs_manual_review = yes`.
4. **Phase 4:** Refine the auto-derivation rules based on Phase 3 corrections.

---
---

## Appendix: Data Integrity Notes

1. **Item count discrepancy:** Prompt specified 102 items; actual database contains 82 non-done items (76 backlog + 6 cancelled). The 427 done items were excluded from this catalog as they have already been completed.

2. **Legacy task_type unreliable:** 455 of 509 total items (89%) have `task_type = chore` regardless of actual work type. The auto-derivation model should NOT use this field as a primary signal.

3. **No acceptance_criteria populated:** All 509 items have null `acceptance_criteria`. This field was added in the 2026-03-24 SDLC pipeline migration but never backfilled.

4. **6 cancelled items included:** Items 609, 629, 630, 703, 708, 709 are cancelled. They are cataloged for completeness but require no action.

5. **Dependency chain identified:** Items 81->82->83->84->85 (handwriting chain) and 77->78 (template chain) and 104->105 (accuracy chain) should be formalized as change sets.
