# Backend API Implementation Instructions for OM Specification Documentation

## Overview

The front-end component requires two backend API endpoints to function:
- `GET /api/docs/files` - List all documentation files
- `POST /api/docs/upload` - Upload a new documentation file

## Quick Start

1. **Copy the route file:**
   - Copy `docs/12-9-25/backend-api-docs-routes.js` to your backend routes directory
   - Example: `backend/routes/docs.js`

2. **Install dependencies:**
   ```bash
   npm install multer
   ```

3. **Add to your Express app:**
   ```javascript
   // In your main server file (e.g., server.js, app.js)
   const docsRoutes = require('./routes/docs');
   app.use('/api/docs', docsRoutes);
   ```

4. **Ensure directory exists:**
   ```bash
   # Production
   mkdir -p /var/www/orthodoxmetrics/prod/front-end/public/docs
   chmod 755 /var/www/orthodoxmetrics/prod/front-end/public/docs
   
   # Development (adjust path as needed)
   mkdir -p ../front-end/public/docs
   ```

## File Storage Paths

- **Production:** `/var/www/orthodoxmetrics/prod/front-end/public/docs`
- **Development:** `front-end/public/docs` (relative to backend root, adjust as needed)

## API Endpoints

### GET /api/docs/files

Returns a list of all documentation files in the docs directory.

**Response:**
```json
{
  "files": [
    {
      "name": "document.docx",
      "path": "2024-12-09T10-30-45-123Z_document.docx",
      "type": "docx",
      "size": 12345,
      "uploadedAt": "2024-12-09T10:30:45.123Z",
      "timestamp": "2024-12-09T10-30-45-123Z"
    }
  ]
}
```

### POST /api/docs/upload

Uploads a documentation file.

**Request:**
- Content-Type: `multipart/form-data`
- Form field `file`: The file to upload
- Form field `timestamp`: ISO timestamp string (optional, will be generated if not provided)

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "name": "document.docx",
    "path": "2024-12-09T10-30-45-123Z_document.docx",
    "type": "docx",
    "size": 12345,
    "uploadedAt": "2024-12-09T10:30:45.123Z",
    "timestamp": "2024-12-09T10-30-45-123Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error type",
  "message": "Error message"
}
```

## File Naming Convention

Files are saved with the format: `{timestamp}_{originalFilename}`

Example: `2024-12-09T10-30-45-123Z_my-document.docx`

## Allowed File Types

- `.docx` - Microsoft Word documents
- `.xlsx` - Microsoft Excel spreadsheets
- `.md` - Markdown files
- `.json` - JSON files
- `.txt` - Plain text files
- `.pdf` - PDF documents
- `.tsx` - TypeScript React files
- `.ts` - TypeScript files
- `.html` - HTML files
- `.js` - JavaScript files

## File Size Limit

Maximum file size: 50MB

## Security Considerations

1. **Authentication:** Add authentication middleware to protect these routes:
   ```javascript
   const { requireAuth } = require('../middleware/auth');
   router.get('/files', requireAuth, ...);
   router.post('/upload', requireAuth, ...);
   ```

2. **Authorization:** Consider adding role-based access control:
   ```javascript
   const { requireRole } = require('../middleware/auth');
   router.post('/upload', requireAuth, requireRole(['admin', 'super_admin']), ...);
   ```

3. **File Validation:** The route already validates file types and sizes, but you may want to add additional virus scanning or content validation.

## Testing

After implementing, test the endpoints:

```bash
# List files
curl http://localhost:3001/api/docs/files

# Upload a file
curl -X POST http://localhost:3001/api/docs/upload \
  -F "file=@/path/to/document.docx" \
  -F "timestamp=2024-12-09T10-30-45-123Z"
```

## Troubleshooting

1. **Directory not found:** Ensure the docs directory exists and has proper permissions
2. **Upload fails:** Check file size and type restrictions
3. **Files not listing:** Verify the directory path is correct for your environment
4. **Permission errors:** Ensure the Node.js process has write permissions to the docs directory

