# Gallery Usage and Metadata Documentation

## Overview

The `/apps/gallery` feature provides image management with usage tracking and accurate metadata display. This document explains how usage scanning works, the tri-state usage filter, and metadata handling.

**Last Updated**: January 2026
- Fixed module path resolution for production builds (`../services/` instead of `../src/services/`)
- Updated icon usage (`IconArrowsExchange` for move operations)
- Improved path resolution with production defaults

## Scope

**Updated**: The gallery system now manages **ALL** images from:
- `/public/images/**` (all directories and subdirectories)

The system provides:
- **Directory tree navigation**: Browse and filter by directory
- **Full directory management**: Create, rename, delete directories
- **File operations**: Move, rename, delete files across directories
- **Safe path resolution**: Protection against path traversal attacks
- **Catalog suggestions**: AI-powered suggestions for organizing images

### Backward Compatibility

The default view still shows the `gallery` directory for backward compatibility, but users can navigate to any directory under `/public/images/`.

## Usage Status (Tri-State)

Images have three possible usage states:

1. **Used** (`isUsed === true`): Image is actively referenced in the codebase
2. **Not Used** (`isUsed === false`): Image was checked and confirmed not referenced
3. **Not Checked** (`isUsed === undefined`): Usage status has not been determined yet

### Initial State

**Usage status is NOT auto-checked on page load.** When images are first loaded:
- All images have `isUsed: undefined` (Not Checked)
- A banner appears at the top of the page prompting users to click "Refresh Usage" or "Check Now"
- Users must manually trigger usage checking via the "Refresh Usage" button

This prevents slow page loads and timeouts for large image collections.

### Usage Filter Options

- **All Images**: Shows all images regardless of usage status
- **Used in Codebase**: Only shows images where `isUsed === true`
- **Not Used**: Only shows images where `isUsed === false` (excludes "Not Checked")
- **Not Checked**: Only shows images where `isUsed === undefined`

### Why Tri-State?

This prevents confusion where "Not Used" would include images that haven't been checked yet. Users can now:
- See which images are confirmed unused
- Identify images that need usage checking
- Get accurate counts for used vs unused images

## Usage Scanning

### Backend Implementation

**Endpoint**: `POST /api/gallery/check-usage`

- **No hard limits**: All images in the request are checked
- **Efficient file system search**: Searches only `src/` directory, max depth 5 levels
- **File reading**: Reads up to 200KB per file (full file if smaller)
- **Search patterns**: Looks for filename, full path, and relative path patterns

**Endpoint**: `GET /api/gallery/used-images`

- **Pagination support**: Query params `offset` and `limit` (default: offset=0, limit=200)
- **Complete scanning**: No hard limits - processes all images via pagination
- **Response metadata**: Includes `total_images`, `checked_images`, `used_images`, `has_more`

### Frontend Implementation

**Refresh Usage Button**:
- Processes images in batches of 500 (backend batch size)
- Sends sequential requests to avoid overwhelming the server
- Updates all images with usage results
- Preserves `undefined` status for images not included in any batch

**Export Used Images List**:
- Fetches all pages if pagination is used
- Combines results before generating the export file
- Shows accurate counts: total, checked, used
- Indicates if scanning was limited (should not happen with pagination)

## Metadata (Date Modified & File Size)

### Backend Behavior

**Endpoint**: `GET /api/gallery/images`

- **Always returns metadata**: Every image includes `size`, `created`, `modified` fields
- **Error handling**: If `fs.statSync()` fails, image is included with:
  - `metadataStatus: 'error'`
  - `statError: <error message>`
  - `size: null`, `created: null`, `modified: null`
- **Never skips files**: All images are returned, even if stats can't be read
- **Debug mode**: Add `?debug=1` query param to see sample image object structure in server logs

### Frontend Display

- **Date Modified**: 
  - Shows formatted date (e.g., "1/18/2026, 12:00:00 PM") when available
  - Shows "Error" (red text) with tooltip if `metadataStatus === 'error'`
  - Shows "Unknown" only when field is truly missing (should not happen with proper error handling)
- **File Size**: 
  - Shows formatted size (e.g., "123.45 KB" or "1.23 MB") when available
  - Shows "Error" (red text) with tooltip if `metadataStatus === 'error'`
  - Shows "Unknown" only when field is truly missing (should not happen with proper error handling)
- **Error tooltips**: Hover over "Error" to see the actual error message from `statError`

## Operational Limits

### Current Limits

- **File reading**: 200KB per source file (prevents memory issues on large files)
- **Search depth**: 5 levels deep in directory structure
- **Batch size**: 500 images per usage check request (frontend batching)
- **Pagination**: 200 images per page for used-images export (configurable via query params)

### Performance Considerations

- Usage scanning is CPU and I/O intensive for large codebases
- Frontend batches requests to avoid timeouts
- Backend processes sequentially to avoid overwhelming the file system
- No arbitrary caps that silently limit results

## API Reference

### POST /api/gallery/check-usage

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

### GET /api/gallery/used-images

**Query Params**:
- `format`: `json` | `csv` | `txt` (default: `json`)
- `offset`: Number (default: `0`)
- `limit`: Number (default: `200`)

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
  "used": [...]
}
```

### GET /api/gallery/tree

**Query Params**:
- `path`: Relative path from images root (default: `""`)
- `depth`: Maximum depth to traverse (default: `2`)

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
  "files": [
    {
      "name": "image.png",
      "path": "/images/gallery/image.png",
      "url": "/images/gallery/image.png?v=1234567890",
      "size": 12345,
      "created": "2026-01-18T12:00:00.000Z",
      "modified": "2026-01-18T12:00:00.000Z",
      "ext": "png",
      "metadataStatus": "ok"
    }
  ]
}
```

### GET /api/gallery/images

**Query Params**:
- `path`: Relative path from images root (default: `"gallery"` for backward compatibility)
- `recursive`: `1` or `true` to include subdirectories (default: `false`)

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
    },
    {
      "name": "error.png",
      "path": "/images/gallery/error.png",
      "url": "/images/gallery/error.png?v=1234567890",
      "size": null,
      "created": null,
      "modified": null,
      "type": "png",
      "metadataStatus": "error",
      "statError": "ENOENT: no such file or directory"
    }
  ]
}
```

## File Operations API

### POST /api/gallery/mkdir
Create a new directory.

**Body**:
```json
{ "path": "newdir" }
```

### POST /api/gallery/rmdir
Delete a directory.

**Body**:
```json
{ "path": "dir", "recursive": false }
```

### POST /api/gallery/move
Move or rename a file/directory.

**Body**:
```json
{ "from": "old/path.png", "to": "new/path.png", "overwrite": false }
```

### POST /api/gallery/rename
Rename a file or directory.

**Body**:
```json
{ "path": "dir/or/file", "newName": "newname.png" }
```

### DELETE /api/gallery/file
Delete a file.

**Body**:
```json
{ "path": "dir/file.png" }
```

### POST /api/gallery/upload
Upload images with target directory support.

**Form Data**:
- `image`: File (multipart)
- `targetDir`: Relative path (default: `"gallery"`)
- `autoNameMode`: `"keep"` | `"slug"` | `"hash"` (default: `"keep"`)

### POST /api/gallery/suggest-destination
Get catalog suggestions for organizing images.

**Body**:
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

## Catalog Suggestions

The system provides intelligent suggestions for organizing images based on:
- Filename patterns (banner, logo, bg, pattern, icon, etc.)
- Custom rules in `/public/images/.catalog-rules.json`
- Current directory structure

Custom rules file format:
```json
[
  {
    "pattern": "custom-pattern",
    "suggestedDir": "custom-dir",
    "confidence": 0.7,
    "reason": "Custom rule description"
  }
]
```

## Testing Checklist

- [ ] Upload an image, verify size and modified date show immediately
- [ ] Upload to specific directory using targetDir parameter
- [ ] Directory tree loads and displays correctly
- [ ] Clicking directory filters images to that directory
- [ ] Create new directory via "New Folder" button
- [ ] Move image between directories
- [ ] Rename image
- [ ] Delete image (single and bulk)
- [ ] Catalog suggestions generate correctly
- [ ] Apply catalog suggestions moves images correctly
- [ ] Refresh Usage: verify counts match export results
- [ ] Usage Filter: "Not Used" does not include "Not Checked"
- [ ] Usage Filter: "Not Checked" shows only undefined status images
- [ ] Export Used Images: output reports total_images and checked_images
- [ ] Export Used Images: output is not limited silently
- [ ] Date Modified shows "Error" with tooltip for files with stat errors
- [ ] File Size shows "Error" with tooltip for files with stat errors
- [ ] All images are included in results, even if metadata can't be read
- [ ] Banner appears when images have undefined usage status
- [ ] Scope is clearly indicated: "Browse images from /public/images/**"
- [ ] Path traversal attempts are rejected (e.g., `../../../etc/passwd`)
- [ ] Debug mode (?debug=1) shows sample image object structure in console
