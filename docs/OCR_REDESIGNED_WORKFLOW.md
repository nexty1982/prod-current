# OCR Redesigned Workflow - Based on Screenshots

## Overview
Based on the screenshots in `front-end/public/images/ss/ocr-redesigned/`, this document outlines the desired OCR workflow and how it should operate.

## Screenshot Sequence Analysis

### Screenshot Files Found:
- `enhanced-ocr-uploader-1.jpg` through `enhanced-ocr-uploader-7.jpg` (7-step workflow)
- `2.png` through `8.png` (numbered sequence)
- `landingpage.png`, `marriages-1.png`, `settings.png`, `toast-message.png`, `upload.png`

### Screenshot 1: Upload Interface (enhanced-ocr-uploader-1.jpg)
**What I see:**
- Clean upload interface with drag & drop zone
- Church database selector (yellow warning box)
- OCR settings chips: "Google Vision", "300 DPI", "85% Confidence"
- Advanced options (collapsible)
- Processed images table with filters (Completed/Failed)
- Table columns: Preview, Filename, Record Type, Status, OCR Result Preview, Actions

## Desired Workflow (Inferred from File Names)

### Phase 1: Upload & Processing
1. **Upload Interface** (enhanced-ocr-uploader-1.jpg)
   - Drag & drop or click to browse
   - Church database selection
   - OCR settings display
   - Batch upload support

2. **Processing Queue** (likely enhanced-ocr-uploader-2.jpg)
   - Show upload progress
   - Processing status
   - Queue management

### Phase 2: Workbench/Extraction (enhanced-ocr-uploader-3.jpg through 7.jpg)
Based on the custom extractor requirements, this should include:

3. **Select Extractor** (NEW - for custom extractors)
   - Choose from available extractors
   - Or create new extractor
   - Preview extractor schema

4. **Detect Entries** (Step 1)
   - Auto-detect or manual entry areas
   - Visual bounding boxes on image
   - Entry list/table

5. **Run Extraction** (NEW - custom extractor step)
   - Apply selected extractor
   - Show extraction progress
   - Display structured results

6. **Review & Edit** (Step 2-3)
   - Field-by-field review
   - Edit extracted values
   - Confidence indicators
   - Bounding box highlights

7. **Finalize** (Step 4)
   - Save as drafts
   - Commit to records
   - Batch operations

## Key Features to Implement

### 1. Custom Extractor Integration
- **Extractor Selection UI**: Add to workbench before "Detect Entries"
- **Extractor Builder**: Separate tool (already planned in Step 5)
- **Test Extractor**: Quick test on sample image
- **Run Extraction**: Button/action to execute extractor on detected entries

### 2. Workbench Workflow Updates
Current: Detect Entries → Anchor Labels → Map Fields → Review/Commit

**Desired (with Custom Extractors):**
1. **Select Extractor** (NEW)
   - Dropdown/selector for extractors
   - "Create New" button → opens Extractor Builder
   - "Test Extractor" button
   
2. **Detect Entries** (existing, keep)
   - Auto-detect or manual
   - Visual bounding boxes
   
3. **Run Extraction** (NEW)
   - Apply extractor to detected entries
   - Show structured output
   - Field confidence scores
   
4. **Review & Edit** (enhanced)
   - Tree view of extracted data
   - Field-by-field editing
   - Visual highlights on image
   
5. **Finalize** (existing, keep)
   - Save drafts
   - Commit to records

### 3. UI/UX Improvements
- **Sidebar Structure**: 
  - Left: Image viewer with overlays
  - Right: Workflow steps (vertical stepper)
  - Bottom: Extracted data tree/table
  
- **Visual Feedback**:
  - Color-coded confidence scores
  - Bounding box highlights
  - Field-to-image mapping
  - Progress indicators

- **Data Display**:
  - Tree view for nested groups
  - Table view for repeating groups
  - JSON view toggle
  - Field-by-field editor

## Implementation Plan

### Immediate Changes Needed

1. **Add Extractor Selection to Workbench**
   - Add step 0: "Select Extractor"
   - Integrate with extractor API (Step 3)
   - Show extractor schema preview

2. **Add "Run Extraction" Action**
   - Button in workbench after entries detected
   - Call `/api/ocr/jobs/:jobId/extract` endpoint
   - Display results in structured format

3. **Enhance Results Display**
   - Tree view component for nested data
   - Field editor with confidence scores
   - Visual mapping to image regions

4. **Update Workflow Steps**
   - Step 0: Select Extractor (NEW)
   - Step 1: Detect Entries (existing)
   - Step 2: Run Extraction (NEW)
   - Step 3: Review & Edit (enhanced)
   - Step 4: Finalize (existing)

## Next Steps

1. Review all screenshots to confirm workflow
2. Update WorkbenchStepper to include extractor selection
3. Add extraction results display component
4. Integrate with extractor API endpoints (Step 3)
5. Enhance field editing UI

## Questions for User

1. Should extractor selection be a separate step, or integrated into "Detect Entries"?
2. Should extraction run automatically after entries are detected, or require manual trigger?
3. What format should the results display use? (Tree, Table, JSON toggle?)
4. Should the workbench support multiple extractors per job, or one extractor per job?

