# Gallery Application Documentation

**Last Updated**: January 2026  
**Route**: `/apps/gallery`  
**Component**: `front-end/src/features/devel-tools/om-gallery/Gallery.tsx` (2,653 lines)  
**Backend Routes**: `server/routes/gallery.js` (2,290 lines)

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [User Interface](#user-interface)
4. [Image Operations](#image-operations)
5. [Directory Management](#directory-management)
6. [Usage Tracking](#usage-tracking)
7. [Catalog Suggestions](#catalog-suggestions)
8. [API Reference](#api-reference)
9. [Status Codes and Error Handling](#status-codes-and-error-handling)
10. [Security Features](#security-features)
11. [Performance Considerations](#performance-considerations)
12. [Testing Checklist](#testing-checklist)

---

## Overview

The Gallery application (`/apps/gallery`) is a comprehensive image management system for OrthodoxMetrics. It provides a full-featured interface for managing images stored in `front-end/public/images/**`, including:

- **Image Management**: Upload, view, delete, move, and rename images
- **Directory Navigation**: Browse and organize images in a hierarchical directory structure
- **Usage Tracking**: Identify which images are actively used in the codebase
- **Smart Organization**: AI-powered catalog suggestions with dry-run validation
- **Bulk Operations**: Select and operate on multiple images simultaneously
- **Metadata Display**: File size, creation date, and modification date

### Scope

The gallery manages **ALL** images from:
- `/front-end/public/images/**` (all directories and subdirectories)

The system provides safe path resolution with protection against path traversal attacks.

---

## Features

### Core Features

1. **Image Viewing**
   - Grid view with thumbnails
   - Carousel view for detailed inspection
   - Full-screen image preview
   - Image metadata display (size, dates)

2. **Image Upload**
   - Single or multiple file upload
   - Target directory selection
   - Auto-naming modes (keep, slug, hash)
   - Upload progress tracking
   - Per-file upload status

3. **Image Operations**
   - Move images between directories
   - Rename images
   - Delete images (single or bulk)
   - Bulk selection with DataGrid

4. **Directory Management**
   - Navigate directory tree
   - Create new directories
   - Delete directories (with recursive option)
   - Filter images by directory

5. **Usage Tracking**
   - Tri-state usage status (Used / Not Used / Not Checked)
   - Codebase scanning for image references
   - Usage filter options
   - Visual indicators (light green for used images)
   - Export used images list

6. **Catalog Suggestions**
   - AI-powered organization suggestions
   - Dry-run validation
   - Batch apply with error handling
   - Per-item status tracking
   - Summary panel with detailed results

7. **Sorting and Filtering**
   - Sort by: date, name, size, type, location
   - Filter by usage status
   - Filter by directory

---

## User Interface

### Main Components

#### 1. Header Section
- **Title**: "Image Gallery"
- **Upload Button**: Opens upload dialog
- **Catalog Suggestions Button**: Generates and displays organization suggestions
- **Export Used Images Button**: Exports list of images used in codebase
- **Usage Filter Dropdown**: Filter by usage status (All / Used / Not Used / Not Checked)
- **Sort Controls**: Sort by date, name, size, type, or location

#### 2. Directory Tree Sidebar
- Hierarchical directory structure
- Click to navigate to directory
- "New Folder" button to create directories
- Shows directory names and file counts

#### 3. Image Display Area

**Grid View**:
- Responsive grid layout (4 columns on desktop, 2 on mobile)
- Image thumbnails with hover effects
- Visual indicators for used images (light green background and border)
- Click to open carousel view

**Carousel View**:
- Large image display (400px height on desktop)
- Navigation arrows (previous/next)
- Image metadata display
- Visual indicators for used images (light green background and border)
- Close button to return to grid

**Table View** (DataGrid):
- Sortable columns: Name, Path, Size, Modified Date, Usage Status
- Row selection for bulk operations
- Bulk delete functionality
- Pagination support

#### 4. Image Detail Dialog
- Full-size image preview
- Image metadata (name, path, size, dates)
- Action buttons (Move, Rename, Delete, Download)
- Usage status indicator

#### 5. Upload Dialog
- File selection (single or multiple)
- Target directory selector
- Auto-naming mode selector
- Upload progress bar
- Per-file status indicators
- Error messages for failed uploads

#### 6. Catalog Suggestions Dialog
- List of suggested moves/renames
- Per-item status pills (Pending / Valid / Invalid / Applied / Failed)
- Dry Run button
- Apply All button
- Show full summary checkbox
- Collapsible summary panel
- Copy summary to clipboard

---

## Image Operations

### Upload Images

**UI Flow**:
1. Click "Upload Image" button
2. Select file(s) from file picker
3. Choose target directory (default: "gallery")
4. Select auto-naming mode (keep, slug, hash)
5. Click "Upload"
6. Monitor progress and status

**Features**:
- Multiple file upload support
- Per-file progress tracking
- Error handling per file
- Automatic directory creation if needed
- Duplicate name handling

**API**: `POST /api/gallery/upload`

### Delete Images

**Single Delete**:
1. Click delete icon on image card
2. Confirm deletion
3. Image is removed from filesystem

**Bulk Delete**:
1. Select images in DataGrid
2. Click "Delete Selected" button
3. Confirm deletion
4. All selected images are deleted
5. Detailed success/failure summary displayed

**API**: `DELETE /api/gallery/file` (single) or `POST /api/gallery/delete` (bulk)

### Move Images

**UI Flow**:
1. Click move icon on image card or in detail dialog
2. Select target directory from dropdown
3. Click "Move"
4. Image is moved to new location

**Features**:
- Target directory validation
- Automatic directory creation
- Path conflict detection
- Updates directory tree after move

**API**: `POST /api/gallery/move`

### Rename Images

**UI Flow**:
1. Click rename icon on image card or in detail dialog
2. Enter new name in dialog
3. Click "Rename"
4. Image is renamed

**Features**:
- Extension preservation
- Duplicate name detection
- Path validation

**API**: `POST /api/gallery/rename`

---

## Directory Management

### Navigate Directories

**UI Flow**:
1. Click directory in sidebar tree
2. Images filter to selected directory
3. Directory path shown in header

**Features**:
- Recursive directory traversal
- Directory file counts
- Breadcrumb navigation

**API**: `GET /api/gallery/tree` and `GET /api/gallery/images?path=<dir>`

### Create Directory

**UI Flow**:
1. Click "New Folder" button
2. Enter directory name
3. Click "Create"
4. Directory appears in tree

**Features**:
- Path validation
- Duplicate detection
- Automatic parent creation

**API**: `POST /api/gallery/mkdir`

### Delete Directory

**UI Flow**:
1. Right-click or use context menu on directory
2. Select "Delete"
3. Confirm deletion
4. Directory is removed

**Features**:
- Recursive deletion option
- Empty directory check
- Safety confirmation

**API**: `POST /api/gallery/rmdir`

---

## Usage Tracking

### Tri-State System

Images have three possible usage states:

1. **Used** (`isUsed === true`): Image is actively referenced in the codebase
2. **Not Used** (`isUsed === false`): Image was checked and confirmed not referenced
3. **Not Checked** (`isUsed === undefined`): Usage status has not been determined yet

### Visual Indicators

- **Used Images**: Light green background gradient and border in:
  - Grid view (image cards)
  - Carousel view (image container)
  - Table view (row highlighting)

### Usage Filter Options

- **All Images**: Shows all images regardless of usage status
- **Used in Codebase**: Only shows images where `isUsed === true`
- **Not Used**: Only shows images where `isUsed === false` (excludes "Not Checked")
- **Not Checked**: Only shows images where `isUsed === undefined`

### Auto-Check Behavior

When the usage filter is changed from "All" to another value for the first time after navigating to `/apps/gallery`, the system automatically triggers a usage check if:
- There are images with `isUsed === undefined`
- The check hasn't been auto-triggered yet in this session
- The user hasn't manually triggered a check

This provides a seamless experience while avoiding unnecessary checks on page load.

### Manual Usage Check

**UI Flow**:
1. Click "Check Now" or "Refresh Usage" button
2. System scans codebase for image references
3. Updates all images with usage status
4. Shows progress and results

**Features**:
- Batch processing (500 images per request)
- Progress tracking
- Error handling
- Preserves undefined status for unchecked images

**API**: `POST /api/gallery/check-usage`

### Export Used Images

**UI Flow**:
1. Click "Export Used Images" button
2. Select format (JSON, CSV, TXT)
3. File is downloaded

**Features**:
- Multiple export formats
- Pagination support for large datasets
- Accurate counts (total, checked, used)
- No silent limits

**API**: `GET /api/gallery/used-images?format=<format>`

---

## Catalog Suggestions

### Overview

The Catalog Suggestions feature provides AI-powered recommendations for organizing images based on:
- Filename patterns (banner, logo, bg, pattern, icon, etc.)
- Custom rules in `/public/images/.catalog-rules.json`
- Current directory structure

### Generating Suggestions

**UI Flow**:
1. Click "Catalog Suggestions" button
2. System analyzes current images
3. Suggestions dialog opens with recommendations

**Features**:
- Confidence scores for each suggestion
- Suggested directory and filename
- Reasoning for each suggestion

**API**: `POST /api/gallery/suggest-destination`

### Dry-Run Validation

**Purpose**: Validate all suggested actions without performing any filesystem operations.

**UI Flow**:
1. Click "Dry Run" button in suggestions dialog
2. System validates each suggestion
3. Status pills update (Pending → Valid/Invalid)
4. Summary panel shows counts

**Features**:
- No filesystem modifications
- Per-item validation status
- Actionable error messages
- Detailed validation results

**API**: `POST /api/gallery/validate-actions`

**Validation Checks**:
- Path traversal protection
- Source file existence
- Target file existence (conflict detection)
- Parent directory existence
- Image extension validation
- Extension matching
- Same path detection

### Apply Actions

**Single Apply**:
1. Click "Apply" button on individual suggestion
2. Action is executed
3. Status updates (Applied/Failed)
4. Images reload if successful

**Apply All**:
1. Click "Apply All" button
2. System warns if invalid suggestions exist
3. All valid suggestions are applied
4. Per-item results displayed
5. Summary panel updated

**Features**:
- Batch processing with `continueOnError` support
- Per-item success/failure tracking
- Detailed error messages
- Automatic image reload after success

**API**: `POST /api/gallery/apply-actions`

### Status Pills

Each suggestion displays a status pill with color coding:

- **Pending** (gray): Default state, not yet validated
- **Valid** (green): Dry-run validation passed
- **Invalid** (red): Dry-run validation failed
- **Applied** (green): Successfully applied
- **Failed** (red): Application failed

### Summary Panel

**Features**:
- Collapsible panel at bottom of dialog
- Summary counts (Total / Valid / Invalid / Applied / Failed)
- Full summary toggle (show all or only failures)
- Detailed per-action results
- Copy summary to clipboard (JSON format)

---

## API Reference

### Image Operations

#### `GET /api/gallery/images`

Get list of images in a directory.

**Query Parameters**:
- `path` (string, optional): Relative path from images root (default: `"gallery"`)
- `recursive` (boolean, optional): Include subdirectories (default: `false`)

**Response**:
```json
{
  "success": true,
  "count": 98,
  "path": "gallery",
  "recursive": true,
  "scope": "all-images",
  "images": [
    {
      "name": "image.png",
      "path": "/images/gallery/image.png",
      "url": "/images/gallery/image.png?v=1234567890",
      "size": 12345,
      "created": "2026-01-18T12:00:00.000Z",
      "modified": "2026-01-18T12:00:00.000Z",
      "type": "png",
      "metadataStatus": "ok"
    }
  ]
}
```

#### `POST /api/gallery/upload`

Upload one or more images.

**Form Data**:
- `image` (File, multipart): Image file(s)
- `targetDir` (string, optional): Target directory (default: `"gallery"`)
- `autoNameMode` (string, optional): `"keep"` | `"slug"` | `"hash"` (default: `"keep"`)

**Response**:
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "name": "image.png",
    "path": "/images/gallery/image.png",
    "url": "/images/gallery/image.png?v=1234567890"
  }
}
```

#### `DELETE /api/gallery/file`

Delete a single file.

**Request Body**:
```json
{
  "path": "gallery/image.png"
}
```

**Response**:
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

#### `POST /api/gallery/delete`

Delete multiple files (bulk).

**Request Body**:
```json
{
  "paths": ["gallery/image1.png", "gallery/image2.png"]
}
```

**Response**:
```json
{
  "success": true,
  "deleted": 2,
  "failed": 0,
  "results": [
    { "path": "gallery/image1.png", "success": true },
    { "path": "gallery/image2.png", "success": true }
  ]
}
```

#### `POST /api/gallery/move`

Move a file to a new location.

**Request Body**:
```json
{
  "from": "gallery/image.png",
  "to": "logos/image.png",
  "overwrite": false
}
```

**Response**:
```json
{
  "success": true,
  "message": "File moved successfully",
  "from": "gallery/image.png",
  "to": "logos/image.png"
}
```

#### `POST /api/gallery/rename`

Rename a file.

**Request Body**:
```json
{
  "path": "gallery/image.png",
  "newName": "new-image.png"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Renamed successfully",
  "oldPath": "gallery/image.png",
  "newPath": "gallery/new-image.png"
}
```

### Directory Operations

#### `GET /api/gallery/tree`

Get directory tree structure.

**Query Parameters**:
- `path` (string, optional): Relative path from images root (default: `""`)
- `depth` (number, optional): Maximum depth to traverse (default: `2`)

**Response**:
```json
{
  "success": true,
  "path": "",
  "depth": 2,
  "directories": [
    { "name": "gallery", "path": "gallery", "childrenCount": 15 },
    { "name": "banners", "path": "banners", "childrenCount": 5 }
  ],
  "files": []
}
```

#### `POST /api/gallery/mkdir`

Create a new directory.

**Request Body**:
```json
{
  "path": "newdir"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Directory created successfully",
  "path": "newdir"
}
```

#### `POST /api/gallery/rmdir`

Delete a directory.

**Request Body**:
```json
{
  "path": "dir",
  "recursive": false
}
```

**Response**:
```json
{
  "success": true,
  "message": "Directory deleted successfully"
}
```

### Usage Tracking

#### `POST /api/gallery/check-usage`

Check if images are used in the codebase.

**Request Body**:
```json
{
  "images": [
    { "name": "image.png", "path": "/images/gallery/image.png" }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "usage": {
    "image.png": true
  },
  "checked": 1,
  "total": 1,
  "limited": false
}
```

#### `GET /api/gallery/used-images`

Get list of images used in codebase.

**Query Parameters**:
- `format` (string, optional): `"json"` | `"csv"` | `"txt"` (default: `"json"`)
- `offset` (number, optional): Pagination offset (default: `0`)
- `limit` (number, optional): Results per page (default: `200`)

**Response (JSON)**:
```json
{
  "success": true,
  "generated_at": "2026-01-18T12:00:00.000Z",
  "total_images": 98,
  "checked_images": 98,
  "used_images": 45,
  "unused_images": 53,
  "limited": false,
  "paginated": true,
  "offset": 0,
  "limit": 200,
  "has_more": false,
  "used": [
    {
      "name": "image.png",
      "path": "/images/gallery/image.png",
      "references": ["src/components/Header.tsx:45"]
    }
  ]
}
```

### Catalog Suggestions

#### `POST /api/gallery/suggest-destination`

Get catalog suggestions for organizing images.

**Request Body**:
```json
{
  "images": [
    { "path": "/images/gallery/banner.png", "name": "banner.png" }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "suggestions": [
    {
      "path": "/images/gallery/banner.png",
      "suggestedDir": "banners",
      "suggestedName": "banner.png",
      "confidence": 0.8,
      "reasons": ["Filename contains \"banner\""]
    }
  ]
}
```

#### `POST /api/gallery/validate-actions`

Dry-run validation for batch actions.

**Request Body**:
```json
{
  "actions": [
    { "type": "move", "from": "gallery/a.png", "to": "logos/a.png" },
    { "type": "rename", "path": "logos/a.png", "newName": "logo-a.png" }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "results": [
    {
      "action": { "type": "move", "from": "gallery/a.png", "to": "logos/a.png" },
      "ok": true,
      "code": "OK",
      "message": "Move from gallery/a.png to logos/a.png is valid",
      "details": {
        "absFrom": "/path/to/images/gallery/a.png",
        "absTo": "/path/to/images/logos/a.png",
        "existsFrom": true,
        "existsTo": false,
        "parentExists": true
      }
    }
  ],
  "summary": {
    "total": 1,
    "ok": 1,
    "failed": 0
  }
}
```

#### `POST /api/gallery/apply-actions`

Apply batch actions with structured results.

**Request Body**:
```json
{
  "actions": [
    { "type": "move", "from": "gallery/a.png", "to": "logos/a.png" }
  ],
  "continueOnError": true
}
```

**Response**: Same structure as `validate-actions`, with actual filesystem changes applied.

---

## Status Codes and Error Handling

### Validation Status Codes

Used in `validate-actions` and `apply-actions` responses:

- **`OK`**: Action is valid/applied successfully
- **`ENOENT`**: Source file does not exist
- **`EEXIST`**: Target file already exists
- **`EACCES`**: Permission denied or filesystem error
- **`INVALID_PATH`**: Path traversal detected or invalid path
- **`SAME_PATH`**: Source and target are the same
- **`NOT_IMAGE`**: File is not a recognized image format
- **`PARENT_MISSING`**: Target parent directory does not exist
- **`EXTENSION_MISMATCH`**: Extension mismatch between source and target
- **`INVALID_ACTION`**: Invalid action type or missing required fields
- **`VALIDATION_ERROR`**: Unexpected error during validation
- **`APPLY_ERROR`**: Unexpected error during application
- **`EISDIR`**: Source path is a directory, not a file

### Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { /* Optional additional context */ }
}
```

### Metadata Status

Image metadata may include:

- **`metadataStatus: "ok"`**: Metadata successfully retrieved
- **`metadataStatus: "error"`**: Error reading file stats
- **`statError`**: Error message when metadataStatus is "error"

---

## Security Features

### Path Traversal Protection

All path operations use `publicImagesFs.resolveSafePath()` which:

1. **Normalizes paths**: Removes leading/trailing slashes, converts backslashes
2. **Rejects path traversal**: Blocks paths containing `..`
3. **Rejects absolute paths**: Only allows relative paths from images root
4. **Validates containment**: Ensures resolved path stays within images root

**Example**:
```javascript
// ✅ Allowed
resolveSafePath("gallery/image.png")  // → /path/to/images/gallery/image.png

// ❌ Blocked
resolveSafePath("../../../etc/passwd")  // → Error: Path traversal detected
resolveSafePath("/absolute/path")        // → Error: Absolute paths not allowed
```

### File Type Validation

- Only recognized image extensions are processed
- Extensions: `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, `.tiff`, `.bmp`
- Extension matching enforced for move/rename operations

### Safe File Operations

- All operations stay within `front-end/public/images/` directory
- No access to files outside the designated images root
- Directory creation is validated before execution
- Overwrite protection (unless explicitly enabled)

---

## Performance Considerations

### Usage Scanning

- **File reading limit**: 200KB per source file (prevents memory issues)
- **Search depth**: 5 levels deep in directory structure
- **Batch size**: 500 images per usage check request
- **Sequential processing**: Backend processes sequentially to avoid overwhelming filesystem

### Image Loading

- **Lazy loading**: Images loaded on demand
- **Pagination**: Large datasets paginated in DataGrid
- **Caching**: Image URLs include version query params for cache busting

### Upload Performance

- **Multiple file support**: Parallel uploads where possible
- **Progress tracking**: Per-file progress indicators
- **Error isolation**: Failed uploads don't block others

### Directory Tree

- **Depth limit**: Default depth of 2 levels (configurable)
- **Caching**: Tree structure cached on client side
- **Incremental loading**: Tree updates incrementally after operations

---

## Testing Checklist

### Image Operations

- [ ] Upload single image to default directory
- [ ] Upload multiple images simultaneously
- [ ] Upload to specific directory
- [ ] Upload with different auto-naming modes
- [ ] Delete single image
- [ ] Delete multiple images (bulk)
- [ ] Move image between directories
- [ ] Rename image
- [ ] Verify path normalization (strip `/images/` prefix)

### Directory Management

- [ ] Navigate to different directories
- [ ] Create new directory
- [ ] Delete empty directory
- [ ] Delete directory with files (recursive)
- [ ] Filter images by directory

### Usage Tracking

- [ ] Check usage for single image
- [ ] Check usage for multiple images
- [ ] Verify tri-state system (Used / Not Used / Not Checked)
- [ ] Test usage filter options
- [ ] Verify auto-check on filter change
- [ ] Export used images (JSON, CSV, TXT formats)
- [ ] Verify visual indicators (light green for used images)

### Catalog Suggestions

- [ ] Generate catalog suggestions
- [ ] Run dry-run validation
- [ ] Verify status pills update correctly
- [ ] Apply single suggestion
- [ ] Apply all suggestions
- [ ] Verify error handling for invalid suggestions
- [ ] Test "Show full summary" checkbox
- [ ] Copy summary to clipboard
- [ ] Verify no filesystem changes during dry-run

### Security

- [ ] Verify path traversal protection (reject `../` paths)
- [ ] Verify absolute path rejection
- [ ] Verify operations stay within images root
- [ ] Test invalid file extensions
- [ ] Test duplicate name handling

### Error Handling

- [ ] Test missing source file errors
- [ ] Test target exists errors
- [ ] Test parent directory missing errors
- [ ] Test permission errors
- [ ] Test network errors
- [ ] Verify error messages are actionable

### UI/UX

- [ ] Verify responsive design (mobile, tablet, desktop)
- [ ] Test carousel navigation
- [ ] Test grid view
- [ ] Test table view with sorting
- [ ] Verify loading states
- [ ] Verify progress indicators
- [ ] Test modal dialogs
- [ ] Verify keyboard navigation

### Metadata

- [ ] Verify file size display
- [ ] Verify date modified display
- [ ] Verify date created display
- [ ] Test error handling for files with stat errors
- [ ] Verify "Error" tooltips show actual error messages

---

## File Locations

### Frontend

- **Component**: `front-end/src/features/devel-tools/om-gallery/Gallery.tsx` (2,653 lines)
- **Route**: Defined in frontend routing configuration

### Backend

- **Routes**: `server/routes/gallery.js` (2,290 lines)
- **Services**:
  - `server/src/services/publicImagesFs.js` - Path resolution and safety
  - `server/src/services/catalogSuggest.js` - Catalog suggestion logic

### Documentation

- **Usage and Metadata**: `docs/GALLERY_USAGE_AND_METADATA.md`
- **This Document**: `docs/1-20-26/gallery-documentation.md`

---

## Changelog

### January 2026

- **Enhanced Catalog Suggestions**: Added dry-run validation, batch apply, and detailed status tracking
- **Auto-Check Usage**: Automatically triggers usage check when filter changes for first time
- **Visual Indicators**: Used images now show light green background in grid, carousel, and table views
- **Improved Error Handling**: Enhanced delete operations with detailed per-item error reporting
- **Path Normalization**: Fixed path handling for images in subdirectories

### Previous Updates

- **Tri-State Usage System**: Implemented Used / Not Used / Not Checked states
- **Directory Management**: Full directory tree navigation and operations
- **Bulk Operations**: Multi-select and bulk delete functionality
- **Metadata Display**: File size and date information with error handling
- **Catalog Suggestions**: AI-powered organization recommendations

---

## Support and Troubleshooting

### Common Issues

**Images not loading**:
- Check that images exist in `front-end/public/images/`
- Verify path normalization (should not include `/images/` prefix in API calls)
- Check browser console for errors

**Usage check not working**:
- Verify backend can access codebase files
- Check file permissions
- Review server logs for errors

**Path traversal errors**:
- Ensure paths are relative (not absolute)
- Remove any `../` segments
- Use normalized paths (no leading `/images/`)

**Upload failures**:
- Check file size limits
- Verify target directory exists or can be created
- Check file permissions
- Review server logs for detailed errors

### Debug Mode

Add `?debug=1` to API requests to see detailed logging:
```
GET /api/gallery/images?path=gallery&recursive=1&debug=1
```

This will log sample image object structures to the server console.

---

## Future Enhancements

Potential improvements for future versions:

1. **Image Editing**: Basic image editing (crop, resize, rotate)
2. **Image Search**: Full-text search by filename and metadata
3. **Tags and Categories**: Tag-based organization system
4. **Image Optimization**: Automatic image compression and format conversion
5. **Batch Rename**: Pattern-based batch renaming
6. **Image Duplicates**: Detection and management of duplicate images
7. **Version History**: Track changes to images over time
8. **Access Control**: User permissions for image operations
9. **Image Analytics**: Usage statistics and reporting
10. **API Webhooks**: Notifications for image operations

---

**End of Documentation**
