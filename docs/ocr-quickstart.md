# OCR Quick Start Guide

## What is OCR?

The OCR (Optical Character Recognition) system lets you digitize historical church records by scanning pages and extracting structured data. It supports baptism, marriage, and funeral records in English, Greek, and Russian.

## Getting Started

### Step 1: Access OCR Studio

Navigate to **Portal → OCR Studio** (or `/portal/ocr`) in your church's management panel.

> If you don't see OCR Studio, ask your church administrator to enable it.

### Step 2: Upload a Scan

1. Click **Upload** or drag and drop files into the upload area
2. Supported formats: **JPEG, PNG, TIFF, BMP, PDF**
3. For best results:
   - Scan at **300 DPI or higher**
   - Use **color or grayscale** (not black & white)
   - Keep pages **flat and straight** (minimal skew)
   - Ensure **good contrast** between text and background

### Step 3: Configure the Job

1. Select the **Record Type**: Baptism, Marriage, or Funeral
2. Choose the **Language** of the source document
3. The system will auto-detect a layout template, or you can select one manually

### Step 4: Process

Click **Process** to start OCR. The pipeline runs through these stages:

1. **Preprocessing** — Image enhancement, deskew, border trim
2. **OCR Recognition** — Google Vision API extracts text
3. **Field Extraction** — Text is mapped to structured fields
4. **Validation** — Data quality scoring and review flagging

Processing typically takes 10–30 seconds per page.

### Step 5: Review & Correct

After processing, you'll see the **Workbench** view:

- **Left panel**: Original scanned image with bounding box overlays
- **Right panel**: Extracted fields organized by record

For each record:
- Fields with **green** confidence are likely correct
- Fields with **yellow/red** confidence need review
- Click any field to edit the extracted value
- Use zoom/pan controls to inspect the original image

### Step 6: Commit Records

Once you've reviewed and corrected the extracted data:

1. Click **Finalize** to prepare records for commit
2. Review the summary showing which records will be created
3. Click **Commit** to save records to your church's database

Committed records appear in your church's record management pages (Baptisms, Marriages, Funerals).

## Tips for Best Results

| Tip | Why |
|-----|-----|
| Use consistent scan settings | Helps the layout template match reliably |
| Scan one ledger page per file | Multi-page PDFs process but single pages are more reliable |
| Upload 2–3 test pages first | Verify extraction quality before processing a large batch |
| Review the first few records carefully | Your corrections train the system to improve |

## Understanding Confidence Scores

| Score | Meaning | Action |
|-------|---------|--------|
| 85–100% | High confidence | Usually correct, spot-check |
| 70–84% | Medium confidence | Review recommended |
| Below 70% | Low confidence | Manual review required |

Records above the auto-accept threshold (default 85%) can be auto-committed without manual review.

## Common Issues

| Problem | Solution |
|---------|----------|
| "No text detected" | Image may be too dark, blurry, or inverted. Try a better scan. |
| Wrong fields extracted | Try a different layout template, or create a custom one. |
| Poor accuracy on handwriting | Handwritten text is harder for OCR. Review and correct manually. |
| Mixed languages on page | Set the primary language; the system includes multi-language hints. |

## Need Help?

- **Troubleshooting**: See [OCR Troubleshooting Guide](ocr-troubleshooting.md)
- **Layout Templates**: See [Layout Template Authoring Guide](ocr-layout-templates.md)
- **Pipeline Details**: See [OCR Pipeline Documentation](ocr-pipeline.md)
