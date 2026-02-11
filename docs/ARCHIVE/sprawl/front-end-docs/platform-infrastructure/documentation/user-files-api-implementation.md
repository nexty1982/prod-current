# User Files API Implementation

**Date:** December 17, 2025  
**Status:** ✅ Implemented

## Overview

The User Files API has been implemented to handle user profile files (avatar, banner, images, profile data) stored securely outside the web root.

## Routes Implemented

### 1. `GET /api/user-files/:id`

**Purpose:** Stream or list user files (avatar, banner, images, profile)

**Query Parameters:**
- `type` (optional): File type - `'avatar'` | `'banner'` | `'images'` | `'profile'` (default: `'images'`)
- `filename` (optional): Specific filename to stream. If not provided, returns directory listing
- `churchId` (optional): Church ID (uses user's church if not provided)
- `username` (optional): Username (uses current user if not provided)

**Response (with filename):**
- Streams the file with appropriate Content-Type header

**Response (without filename - directory listing):**
```json
{
  "success": true,
  "files": [
    {
      "name": "avatar_1234567890.jpg",
      "size": 12345,
      "modified": "2025-12-17T10:30:45.123Z",
      "url": "/api/user-files/123?type=avatar&filename=avatar_1234567890.jpg"
    }
  ],
  "directory": "/var/www/orthodoxmetrics/data/church/46/users/john/avatar",
  "count": 1
}
```

**Authentication:** Required (uses `requireAuth` middleware)

**Access Control:**
- Users can access their own files
- Admins can access files in their church
- Super admins can access all files

### 2. `POST /api/user-files/upload`

**Purpose:** Upload user files (avatar, banner, images, profile)

**Form Data:**
- `file` (required): The file to upload
- `type` (optional): File type - `'avatar'` | `'banner'` | `'images'` | `'profile'` (default: `'images'`)
- `churchId` (optional): Church ID (uses user's church if not provided)
- `username` (optional): Username (uses current user if not provided)

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "name": "original-name.jpg",
    "filename": "original_name_1234567890.jpg",
    "path": "/var/www/orthodoxmetrics/data/church/46/users/john/avatar/original_name_1234567890.jpg",
    "size": 12345,
    "type": "avatar",
    "url": "/api/user-files/123?type=avatar&filename=original_name_1234567890.jpg"
  }
}
```

**Authentication:** Required (uses `requireAuth` middleware)

**File Restrictions:**
- Allowed extensions: `.jpg`, `.jpeg`, `.png`, `.gif`, `.svg`, `.webp`
- Maximum file size: 10MB

## Storage Structure

Files are stored outside the web root for security:

```
/var/www/orthodoxmetrics/data/
└── church
    ├── 007
    │   ├── banner
    │   ├── images
    │   ├── profile
    │   └── super_admins
    │       └── next
    │           ├── avatar
    │           ├── banner
    │           ├── images
    │           └── profile
    └── 46
        ├── images
        ├── banner
        ├── profile
        └── users
            └── frjames
                ├── avatar
                ├── banner
                ├── images
                └── profile
```

**Storage Paths:**
- **Super admin (church 007):** `/var/www/orthodoxmetrics/data/church/007/super_admins/next/{type}/`
- **Regular users:** `/var/www/orthodoxmetrics/data/church/<id>/users/<username>/{type}/`
- **Church files:** `/var/www/orthodoxmetrics/data/church/<id>/{type}/`

## Security Features

1. **Authentication Required:** All routes require authentication via `requireAuth` middleware
2. **Access Control:** 
   - Users can only access their own files
   - Admins can access files in their church
   - Super admins can access all files
3. **Outside Web Root:** Files stored in `/var/www/orthodoxmetrics/data/` (not in `front-end/public/`)
4. **Path Sanitization:** Prevents directory traversal attacks
5. **File Type Validation:** Only allows image file types
6. **File Size Limits:** Maximum 10MB per file

## Files Created

1. **`server/routes/user-files.js`** - Main route file with all endpoints
2. **`server/src/index.ts`** - Updated to register `/api/user-files` routes

## Next Steps

1. **Create Storage Directories:** Ensure directories exist on the server:
   ```bash
   mkdir -p /var/www/orthodoxmetrics/data/church/{007,46}/users
   mkdir -p /var/www/orthodoxmetrics/data/church/007/super_admins/next
   chmod -R 755 /var/www/orthodoxmetrics/data
   ```

2. **Rebuild Server:** 
   ```bash
   cd /var/www/orthodoxmetrics/prod/server
   npm run build
   pm2 restart orthodox-backend
   ```

3. **Test Endpoints:**
   - Test GET endpoint with and without filename
   - Test POST endpoint with different file types
   - Verify access control (users can't access other users' files)
   - Verify super admin can access all files

## Usage Examples

### Upload Avatar
```bash
curl -X POST http://localhost:3001/api/user-files/upload \
  -H "Cookie: connect.sid=<session-id>" \
  -F "file=@avatar.jpg" \
  -F "type=avatar"
```

### Get Avatar
```bash
curl http://localhost:3001/api/user-files/123?type=avatar&filename=avatar_1234567890.jpg \
  -H "Cookie: connect.sid=<session-id>"
```

### List User Files
```bash
curl http://localhost:3001/api/user-files/123?type=avatar \
  -H "Cookie: connect.sid=<session-id>"
```

## Error Handling

The API returns appropriate HTTP status codes:
- `200` - Success
- `400` - Bad request (invalid file type, file too large, etc.)
- `401` - Unauthenticated
- `403` - Access denied
- `404` - File not found
- `500` - Internal server error

All errors return JSON:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Notes

- Files are automatically renamed with timestamps to prevent overwrites
- Directory structure is created automatically if it doesn't exist
- The `:id` parameter in GET route is currently not used for routing but kept for API consistency
- File access is verified before streaming to ensure security

