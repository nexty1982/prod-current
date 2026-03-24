# OCR Layout Template Authoring Guide

## Overview

Layout templates tell the OCR pipeline how to extract structured data from scanned pages. Each template targets a specific document format (e.g., a particular church's marriage ledger style) and defines where fields are located on the page.

Templates are stored in the `ocr_extractors` table (platform DB) with associated field definitions in `ocr_extractor_fields`.

## Extraction Modes

Choose the mode that matches your document layout:

| Mode | When to Use | Example |
|------|-------------|---------|
| **tabular** | Printed forms with column grid layout | Church ledger books, tabular registers |
| **form** | Single record per page with labeled fields | Baptism certificates, individual forms |
| **multi_form** | Multiple records per page | Pages with 2–4 entries in distinct regions |
| **auto** | Unknown layout | Tries form detection first, falls back to table extraction |

## Creating a Template

### Via Admin UI

Navigate to `/devel/ocr-studio/layout-editor` (super_admin only):

1. Click "New Template"
2. Set **Name**, **Record Type** (baptism/marriage/funeral/custom), **Extraction Mode**
3. Configure mode-specific settings (see below)
4. Add field definitions
5. Use "Preview" with a reference job to test extraction
6. Save

### Via API

```bash
POST /api/ocr/layout-templates
Content-Type: application/json

{
  "name": "St. Nicholas Marriage Ledger",
  "record_type": "marriage",
  "extraction_mode": "tabular",
  "column_bands": [[0.02, 0.06], [0.06, 0.13], [0.13, 0.29], ...],
  "header_y_threshold": 0.295
}
```

## Tabular Mode Configuration

For documents with a fixed column grid (most church ledgers).

### Column Bands

Define where each column starts and ends as fractions of page width (0.0 = left edge, 1.0 = right edge).

```json
{
  "column_bands": [
    [0.020, 0.060],   // Column 0: Record number
    [0.060, 0.125],   // Column 1: Date
    [0.125, 0.290],   // Column 2: Name
    [0.290, 0.500],   // Column 3: Parents
    [0.500, 0.650],   // Column 4: Witnesses
    [0.650, 1.000]    // Column 5: Notes
  ]
}
```

**How to measure column bands:**
1. Open a representative scan in an image editor
2. Note the pixel X positions of each column separator
3. Divide by image width to get fractions
4. Add ~2% margin on each side for tolerance

**Rules:**
- Bands should be contiguous (no gaps between columns)
- Bands should NOT overlap
- First band starts near 0.0, last band ends near 1.0
- Wider bands for fields with more text (names, notes)

### Header Y Threshold

Fraction of page height below which content is treated as data rows (everything above is headers/titles).

```json
{
  "header_y_threshold": 0.295
}
```

- Marriage ledgers: typically 0.25–0.30
- Baptism records: typically 0.15–0.20
- Too high → table headers get included as data
- Too low → first data rows get excluded

### How Row Detection Works

1. Tokens from Vision API are clustered by Y-position
2. Clusters within `median_token_height × 1.2` merge into the same row
3. Date tokens in date columns trigger new record boundaries
4. Lines without left-margin content merge into the previous row (continuation lines)

## Form Mode Configuration

For single-record pages where fields are labeled with keywords (e.g., "Date of Baptism:").

### Anchor Phrases

Each field has keywords that appear as labels in the document:

```json
{
  "fields": [
    {
      "key": "date_of_baptism",
      "name": "Date of Baptism",
      "anchor_phrases": ["Date of Baptism:", "Baptism Date:", "Date:"],
      "anchor_direction": "right",
      "search_zone": {
        "padding": { "right": 0.3, "bottom": 0.05 },
        "extent": { "width": 0.4, "height": 0.08 }
      }
    }
  ]
}
```

**Anchor Direction:**
- `right` — Look right of the anchor text (most common for label: value layouts)
- `below` — Look below the anchor (for stacked layouts)
- `inline` — Same line as anchor, to the right
- `auto` — Try right first, then below

**Search Zone:**
- `padding` — How far from anchor center to start looking
- `extent` — Maximum area to search (fractions of page width/height)

**Tips:**
- List anchors from most specific to most general
- Include variations ("Father:", "Father Name:", "Parent:")
- The system stops at the first matching anchor

## Multi-Form Mode Configuration

For pages with multiple records in distinct rectangular regions.

### Record Regions

Define bounding boxes for each record area (all values 0.0–1.0):

```json
{
  "record_regions": [
    { "id": "top", "x": 0.05, "y": 0.05, "width": 0.90, "height": 0.45, "label": "Record 1" },
    { "id": "bottom", "x": 0.05, "y": 0.50, "width": 0.90, "height": 0.45, "label": "Record 2" }
  ]
}
```

Each region is extracted independently using anchor-based detection. Combine with anchor phrases on each field for best results.

## Field Definitions

Fields map extracted content to database columns. Add via API or admin UI.

```bash
POST /api/ocr/layout-templates/:id/fields
{
  "key": "groom_name",
  "name": "Groom Name",
  "field_type": "text",
  "column_index": 2,
  "sort_order": 3,
  "instructions": "Full name of the groom"
}
```

| Property | Purpose |
|----------|---------|
| `key` | Machine key — maps to DB column (e.g., `groom_name`) |
| `name` | Display name shown in review UI |
| `field_type` | `text`, `number`, `date`, or `group` |
| `column_index` | Column position for tabular mode (0-based) |
| `anchor_phrases` | Keywords for form/multi_form modes |
| `anchor_direction` | `right`, `below`, `inline`, `auto` |
| `search_zone` | Bounding box for anchor search area |
| `sort_order` | Display ordering in review UI |
| `multiple` | Allow multiple values (e.g., witnesses) |
| `instructions` | Extraction hints for auto mode |

### Nested Fields

Fields can be nested using `parent_field_id` for grouped data:

```
group: "Parents"
  ├── father_name
  └── mother_name
```

## Column Mapping

The column mapper (`columnMapper.ts`) connects extracted columns to record fields. For tabular mode:

1. **Named layouts** (e.g., `marriage_ledger_v1`) have hard-coded mappings
2. **Generic layouts** use header text analysis against hint dictionaries:
   - `BAPTISM_HEADER_HINTS`: child, date of birth, baptism, sponsor, etc.
   - `MARRIAGE_HEADER_HINTS`: groom, bride, date, license, witness, etc.
   - `FUNERAL_HEADER_HINTS`: name, date of death, burial, cause, age, etc.

The mapper matches column header text to the closest hint and assigns the corresponding field key.

## Template Scoping

| `church_id` | `is_default` | Behavior |
|-------------|-------------|----------|
| NULL | true | Global default for record type |
| NULL | false | Available to all churches |
| Set | true | Default for that church's record type |
| Set | false | Available only to that church |

Church-specific templates override global defaults.

## Learned Parameters

The system stores learned adjustments in `learned_params` JSON:

```json
{
  "anchor_adjustments": {
    "date_of_baptism": {
      "add_phrases": ["Baptism:"],
      "zone_extend_width": 0.05,
      "zone_extend_height": 0.02
    }
  }
}
```

These are applied automatically during extraction to improve accuracy based on user corrections.

## Testing & Calibration Workflow

1. **Upload a representative page** via OCR Studio
2. **Create template** with estimated column bands / anchors
3. **Preview extraction** using the template editor's preview feature
4. **Adjust**:
   - Move column band boundaries if fields bleed into adjacent columns
   - Adjust header_y_threshold if headers are captured as data
   - Add/modify anchor phrases if fields aren't detected
5. **Process a batch** (3–5 pages) and review accuracy
6. **Check learning stats**: `GET /api/ocr/layout-templates/:id/learning-stats`
7. **Iterate** based on per-field accuracy percentages

## API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ocr/layout-templates` | GET | List all templates |
| `/api/ocr/layout-templates` | POST | Create template |
| `/api/ocr/layout-templates/:id` | GET | Get template details |
| `/api/ocr/layout-templates/:id` | PUT | Update template |
| `/api/ocr/layout-templates/:id` | DELETE | Delete template |
| `/api/ocr/layout-templates/:id/fields` | GET | List fields |
| `/api/ocr/layout-templates/:id/fields` | POST | Add field |
| `/api/ocr/layout-templates/:id/fields/:fid` | PUT | Update field |
| `/api/ocr/layout-templates/:id/fields/:fid` | DELETE | Delete field |
| `/api/ocr/layout-templates/:id/preview` | POST | Preview extraction |
| `/api/ocr/layout-templates/:id/learning-stats` | GET | Field accuracy stats |
