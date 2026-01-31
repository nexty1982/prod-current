# Gallery Image Paths - Current Setup Documentation

**Date**: January 23, 2026  
**Route**: `/apps/gallery`  
**Component**: `front-end/src/features/devel-tools/om-gallery/Gallery.tsx`  
**Backend Routes**: `server/routes/gallery.js`

## The Six Canonical Image Directories

The Gallery feature uses **six canonical directories** for organizing images:

1. **logos** - `/front-end/public/images/logos/`
2. **backgrounds** - `/front-end/public/images/backgrounds/`
3. **icons** - `/front-end/public/images/icons/`
4. **ui** - `/front-end/public/images/ui/`
5. **records** - `/front-end/public/images/records/`
6. **misc** - `/front-end/public/images/misc/`

### Where They Are Defined

**Frontend**: `front-end/src/features/devel-tools/om-gallery/Gallery.tsx` (line 1865)
```typescript
const DEFAULT_DIRECTORIES = ['logos', 'backgrounds', 'icons', 'ui', 'records', 'misc'];
```

**Current Issue**: This constant is only used for visual styling (highlighting default directories), not as a single source of truth for path resolution.

## Base Image Root

**UI Assumes**: `/images/` (served from `front-end/public/images/`)

**Actual Server Filesystem Locations**:
- **Production**: `/var/www/orthodoxmetrics/prod/front-end/public/images/`
- **Development**: `{project-root}/front-end/public/images/`

## Current Filesystem Structure (Server)

Verified on server `192.168.1.239` at `/var/www/orthodoxmetrics/prod/front-end/public/images/`:

```
images/
├── backgrounds/     (6 files: bgtiled1.png, bgtiled2.png, etc.)
├── banner/          (1 file: profilebg.png) - NOT canonical
├── buttons/         (3 files) - NOT canonical
├── header/          (4 files: 1.mp4, 2.mp4, 3.mp4, 46-header.png) - NOT canonical
├── icons/           (5 files: baptism.png, default.png, funeral.png, H.png, marriage.png)
├── logos/           (2 files: biz-logo.png, orthodox-metrics-logo.svg)
├── main/            (1 file: export (2).csv) - NOT canonical
├── misc/            (100+ files) - large directory
├── profile/         (empty, .gitkeep) - NOT canonical
├── records/         (15 files: baptism.png, funeral.png, marriage.png, etc.)
└── ui/              (4 files: components.png, GE-buttons-1.png, etc.)
```

## Current Image Path Resolution

### Backend (`server/routes/gallery.js`)

**GET /api/gallery/images** (lines 749, 760, 772):
- Correctly constructs paths as: `/images/{directory}/{filename}`
- Example: `/images/logos/biz-logo.png`
- Uses `relativePath` from directory traversal

**POST /api/gallery/upload** (line 292):
- Hardcoded fallback: `/images/gallery/${filename}`
- **Issue**: Should use the actual target directory, not hardcoded "gallery"

### Frontend (`front-end/src/features/devel-tools/om-gallery/Gallery.tsx`)

**Image URL Resolution** (line 569):
```typescript
url: file.url || file.path || `/images/gallery/${file.name}`,
```

**Issues Identified**:
1. Fallback uses hardcoded `/images/gallery/` instead of deriving from `file.path`
2. No single source of truth for the 6 canonical directories
3. Missing directory handling - no graceful degradation if a canonical directory doesn't exist

## What Was Broken and Why

### Broken Image URLs

**Example Broken URL**: `/images/gallery/biz-logo.png`  
**Expected URL**: `/images/logos/biz-logo.png`

**Root Cause**:
1. Frontend fallback (line 569) uses hardcoded `/images/gallery/` when `file.url` and `file.path` are missing
2. Upload endpoint (line 292) hardcodes `/images/gallery/` regardless of target directory
3. The 6 canonical directories are defined but not used consistently for path resolution

### Network Tab Example

When viewing images from the `logos` directory:
- **Requested**: `/images/gallery/biz-logo.png` (404 Not Found)
- **Should be**: `/images/logos/biz-logo.png` (200 OK)

## Current API Response Format

**GET /api/gallery/images?path=logos&recursive=0**:
```json
{
  "success": true,
  "count": 2,
  "path": "logos",
  "recursive": false,
  "images": [
    {
      "name": "biz-logo.png",
      "path": "/images/logos/biz-logo.png",
      "url": "/images/logos/biz-logo.png?v=1765335848613",
      "size": 500215,
      "type": "png",
      "metadataStatus": "ok"
    }
  ]
}
```

**Note**: The API correctly returns `path` and `url` fields, but the frontend fallback is incorrect.

## Image Serving

**Static Assets**: Served directly by Vite dev server or production web server from `front-end/public/images/`

**No Proxy Needed**: Vite config (line 160-162) explicitly does NOT proxy `/images/*` - files are served directly from `public/` directory.

## Fixes Implemented

### 1. Single Source of Truth for Canonical Directories

**File**: `front-end/src/features/devel-tools/system-documentation/gallery.config.ts`

- Added `CANONICAL_IMAGE_DIRECTORIES` constant as the single source of truth
- Added helper functions: `isCanonicalDirectory()`, `buildImageUrl()`, `extractDirectoryFromPath()`
- Updated `galleryConfig` to include `canonicalDirectories` property

### 2. Fixed Frontend Image URL Resolution

**File**: `front-end/src/features/devel-tools/om-gallery/Gallery.tsx`

**Changes**:
- Replaced hardcoded `/images/gallery/` fallback with proper path resolution
- Uses `buildImageUrl()` and `extractDirectoryFromPath()` helpers from config
- Falls back to first canonical directory only as last resort
- Updated `DEFAULT_DIRECTORIES` to use `CANONICAL_IMAGE_DIRECTORIES` from config

**Before**:
```typescript
url: file.url || file.path || `/images/gallery/${file.name}`,
```

**After**:
```typescript
let imageUrl = file.url;
if (!imageUrl && file.path) {
  imageUrl = file.path.startsWith('/') ? file.path : `${IMAGES_BASE_PATH}/${file.path}`;
}
if (!imageUrl && file.name) {
  const directory = file.path ? extractDirectoryFromPath(file.path) : null;
  if (directory) {
    imageUrl = buildImageUrl(directory, file.name);
  } else {
    imageUrl = `${IMAGES_BASE_PATH}/${CANONICAL_IMAGE_DIRECTORIES[0]}/${file.name}`;
  }
}
```

### 3. Fixed Backend Upload URL Construction

**File**: `server/routes/gallery.js`

**Changes**:
- Extract target directory from file path instead of hardcoding `/images/gallery/`
- Uses `publicImagesFs.getImagesRoot()` and `path.relative()` to build correct URL
- Falls back to `targetDir` from request body if path extraction fails

**Before**:
```javascript
const imageUrl = `/images/gallery/${filename}?v=${cacheBuster}`;
```

**After**:
```javascript
let imageUrl;
try {
  const imagesRoot = publicImagesFs.getImagesRoot();
  const relativePath = path.relative(imagesRoot, filePath);
  const normalizedPath = relativePath.replace(/\\/g, '/');
  imageUrl = `/images/${normalizedPath}`;
} catch (error) {
  const targetDir = req.body?.targetDir || 'gallery';
  imageUrl = `/images/${targetDir}/${filename}`;
}
imageUrl = `${imageUrl}?v=${cacheBuster}`;
```

### 4. Fixed Backend Delete Path Resolution

**File**: `server/routes/gallery.js`

- Updated to use `publicImagesFs.resolveSafePath()` instead of hardcoded `galleryDir`
- Properly handles paths like `/images/logos/image.png`

### 5. Fixed Backend Usage Check Path Resolution

**File**: `server/routes/gallery.js`

- Removed hardcoded `/images/gallery/` fallback
- Uses actual `image.path` from API response

### 6. Added Graceful Handling for Missing Directories

**File**: `front-end/src/features/devel-tools/om-gallery/Gallery.tsx`

- Canonical directories are always shown in sidebar, even if empty
- Empty canonical directories are displayed with "(empty)" label and disabled state
- Visual distinction: empty directories have reduced opacity and "Empty" chip

### 7. Added Automated Sanity Check Script

**File**: `scripts/check-gallery-directories.mjs`

**Features**:
- Verifies all 6 canonical directories exist
- Checks that sample images in each directory return HTTP 200
- Validates Content-Type is `image/*`
- Prints clear pass/fail report per directory
- Exit code 0 on success, 1 on failure

**Usage**:
```bash
node scripts/check-gallery-directories.mjs [--base-url=http://localhost:5174]
```

## Verification Steps

### Manual Verification

1. **Test Image Loading from Each Directory**:
   - Navigate to `/apps/gallery`
   - Click each canonical directory in sidebar
   - Verify images load correctly (check Network tab for 200 responses)

2. **Test Upload to Canonical Directory**:
   - Upload an image to `logos` directory
   - Verify URL is `/images/logos/filename.png` (not `/images/gallery/...`)

3. **Test Empty Directory Handling**:
   - If a canonical directory is empty, verify it shows "(empty)" label
   - Verify it's disabled but still visible

### Automated Verification

Run the sanity check script:
```bash
node scripts/check-gallery-directories.mjs --base-url=http://localhost:5174
```

Expected output:
```
✅ logos: 200 image/png
✅ backgrounds: 200 image/png
✅ icons: 200 image/png
✅ ui: 200 image/png
✅ records: 200 image/png
✅ misc: 200 image/png
✅ All directory checks passed!
```

## Testing Checklist

- [ ] Images from `logos` directory load correctly
- [ ] Images from `backgrounds` directory load correctly
- [ ] Images from `icons` directory load correctly
- [ ] Images from `ui` directory load correctly
- [ ] Images from `records` directory load correctly
- [ ] Images from `misc` directory load correctly
- [ ] Upload to canonical directory creates correct URL
- [ ] Empty canonical directories show "(empty)" label
- [ ] Sanity check script passes all checks
- [ ] Network tab shows 200 responses for image requests
- [ ] Content-Type headers are `image/*` for image requests
