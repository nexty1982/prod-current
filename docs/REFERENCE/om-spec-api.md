# OM Specification Documentation API Reference

**API Version:** 1.0.0  
**Base URL:** `/api/docs`  
**Authentication:** Cookie-based (session required)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Data Models](#data-models)
5. [Error Codes](#error-codes)
6. [Examples](#examples)
7. [Rate Limiting](#rate-limiting)
8. [Changelog](#changelog)

---

## Overview

The OM Specification Documentation API provides programmatic access to document management functionality, including:

- **List Documents**: Retrieve all stored documentation files
- **Upload Documents**: Upload new documentation files
- **Download Documents**: Download specific files
- **Health Check**: Verify API availability

### Base Information

| Property | Value |
|----------|-------|
| **Base URL** | `/api/docs` |
| **Protocol** | HTTP/HTTPS |
| **Format** | JSON (except file downloads) |
| **Authentication** | Required (Cookie-based) |
| **Content Encoding** | UTF-8 |

---

## Authentication

### Method

All endpoints require authentication via session cookies.

### Headers

```http
Cookie: connect.sid=s%3A[session-id]
```

### Authentication Flow

1. User logs into system
2. Session cookie set by server
3. Cookie automatically sent with requests
4. Backend validates session
5. Request processed or rejected

### Unauthenticated Requests

**Response:**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

**Status Code:** `401 Unauthorized`

---

## Endpoints

### 1. Health Check

**GET** `/api/docs/`

Test endpoint to verify API is operational.

#### Request

```http
GET /api/docs/ HTTP/1.1
Host: your-domain.com
Cookie: connect.sid=s%3A[session-id]
```

#### Response

**Success (200 OK):**
```json
{
  "success": true,
  "message": "OM Specification Documentation API is working",
  "docsDir": "/var/www/orthodoxmetrics/prod/front-end/public/docs",
  "nodeEnv": "production",
  "exists": true
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` for successful response |
| `message` | string | Status message |
| `docsDir` | string | Absolute path to docs directory |
| `nodeEnv` | string | Node environment (`production` or `development`) |
| `exists` | boolean | Whether docs directory exists |

#### Example

```bash
curl http://localhost:3000/api/docs/ \
  -H "Cookie: connect.sid=s%3A[session-id]"
```

---

### 2. List Files

**GET** `/api/docs/files`

Retrieve list of all documentation files with metadata.

#### Request

```http
GET /api/docs/files HTTP/1.1
Host: your-domain.com
Cookie: connect.sid=s%3A[session-id]
```

#### Response

**Success (200 OK):**
```json
{
  "files": [
    {
      "name": "specification.docx",
      "path": "2026-01-26T15-30-45-123Z_specification.docx",
      "type": "docx",
      "size": 102400,
      "uploadedAt": "2026-01-26T15:30:45.123Z",
      "timestamp": "2026-01-26T15-30-45-123Z"
    },
    {
      "name": "api-reference.md",
      "path": "2026-01-25T10-15-30-456Z_api-reference.md",
      "type": "md",
      "size": 51200,
      "uploadedAt": "2026-01-25T10:15:30.456Z",
      "timestamp": "2026-01-25T10-15-30-456Z"
    }
  ]
}
```

**Empty Directory (200 OK):**
```json
{
  "files": []
}
```

**Directory Not Found (500 Internal Server Error):**
```json
{
  "success": false,
  "error": "Directory creation failed",
  "message": "EACCES: permission denied, mkdir '/path/to/docs'",
  "docsDir": "/var/www/orthodoxmetrics/prod/front-end/public/docs"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `files` | array | Array of file objects |
| `files[].name` | string | Original filename (without timestamp prefix) |
| `files[].path` | string | Stored filename (with timestamp prefix) |
| `files[].type` | string | File extension (without dot) |
| `files[].size` | number | File size in bytes |
| `files[].uploadedAt` | string | ISO 8601 timestamp of upload |
| `files[].timestamp` | string | Formatted timestamp (YYYY-MM-DDTHH-MM-SS-sssZ) |

#### Sorting

Files are automatically sorted by timestamp (newest first).

#### Example

```bash
curl http://localhost:3000/api/docs/files \
  -H "Cookie: connect.sid=s%3A[session-id]"
```

**Response Processing:**
```javascript
const response = await fetch('/api/docs/files', {
  credentials: 'include'
});

const data = await response.json();
console.log(`Found ${data.files.length} documents`);

data.files.forEach(file => {
  console.log(`${file.name} (${file.size} bytes)`);
});
```

---

### 3. Upload File

**POST** `/api/docs/upload`

Upload a documentation file to the server.

#### Request

```http
POST /api/docs/upload HTTP/1.1
Host: your-domain.com
Cookie: connect.sid=s%3A[session-id]
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="spec.docx"
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document

[binary file data]
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="timestamp"

2026-01-26T15-30-45-123Z
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

#### Request Parameters

**Form Data Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | The file to upload |
| `timestamp` | string | No | ISO timestamp for file organization (auto-generated if not provided) |

**File Constraints:**
- **Maximum Size:** 50MB (52,428,800 bytes)
- **Allowed Types:** `.docx`, `.xlsx`, `.md`, `.json`, `.txt`, `.pdf`, `.tsx`, `.ts`, `.html`, `.js`

#### Response

**Success (200 OK):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "name": "spec.docx",
    "path": "2026-01-26T15-30-45-123Z_spec.docx",
    "type": "docx",
    "size": 102400,
    "uploadedAt": "2026-01-26T15:30:45.123Z",
    "timestamp": "2026-01-26T15-30-45-123Z"
  }
}
```

**No File (400 Bad Request):**
```json
{
  "success": false,
  "error": "No file uploaded",
  "message": "Please select a file to upload",
  "code": "NO_FILE"
}
```

**File Too Large (400 Bad Request):**
```json
{
  "success": false,
  "error": "Maximum file size is 50MB",
  "code": "FILE_TOO_LARGE"
}
```

**Invalid File Type (400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid file type. Allowed types: .docx, .xlsx, .md, .json, .txt, .pdf, .tsx, .ts, .html, .js",
  "code": "UPLOAD_ERROR"
}
```

**Unexpected Field Name (400 Bad Request):**
```json
{
  "success": false,
  "error": "Unexpected field name. Expected field name: \"file\"",
  "code": "UNEXPECTED_FIELD"
}
```

**Server Error (500 Internal Server Error):**
```json
{
  "success": false,
  "error": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

#### Example

**Using cURL:**
```bash
curl -X POST http://localhost:3000/api/docs/upload \
  -H "Cookie: connect.sid=s%3A[session-id]" \
  -F "file=@/path/to/specification.docx" \
  -F "timestamp=2026-01-26T15-30-45-123Z"
```

**Using JavaScript (Fetch API):**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('timestamp', new Date().toISOString().replace(/[:.]/g, '-'));

const response = await fetch('/api/docs/upload', {
  method: 'POST',
  credentials: 'include',
  body: formData
});

const data = await response.json();
if (data.success) {
  console.log('Upload successful:', data.file);
} else {
  console.error('Upload failed:', data.error);
}
```

**Using XHR with Progress:**
```javascript
const xhr = new XMLHttpRequest();
const formData = new FormData();
formData.append('file', file);
formData.append('timestamp', new Date().toISOString().replace(/[:.]/g, '-'));

// Track upload progress
xhr.upload.addEventListener('progress', (e) => {
  if (e.lengthComputable) {
    const percentComplete = (e.loaded / e.total) * 100;
    console.log(`Upload progress: ${percentComplete}%`);
  }
});

// Handle completion
xhr.addEventListener('load', () => {
  if (xhr.status === 200) {
    const data = JSON.parse(xhr.responseText);
    console.log('Upload successful:', data.file);
  } else {
    console.error('Upload failed:', xhr.status);
  }
});

xhr.open('POST', '/api/docs/upload');
xhr.withCredentials = true;
xhr.send(formData);
```

---

### 4. Download File

**GET** `/api/docs/download/:filename`

Download a specific documentation file.

#### Request

```http
GET /api/docs/download/2026-01-26T15-30-45-123Z_spec.docx HTTP/1.1
Host: your-domain.com
Cookie: connect.sid=s%3A[session-id]
```

#### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filename` | string | Yes | Full filename including timestamp prefix |

#### Response

**Success (200 OK):**
```http
HTTP/1.1 200 OK
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="spec.docx"
Content-Length: 102400
Cache-Control: no-cache

[binary file data]
```

**Invalid Filename (400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid filename",
  "message": "Filename contains invalid characters"
}
```

**Invalid Path (403 Forbidden):**
```json
{
  "success": false,
  "error": "Invalid path",
  "message": "Cannot access files outside docs directory"
}
```

**File Not Found (404 Not Found):**
```json
{
  "success": false,
  "error": "File not found",
  "message": "Document not found: 2026-01-26T15-30-45-123Z_spec.docx"
}
```

**Server Error (500 Internal Server Error):**
```json
{
  "success": false,
  "error": "Failed to download file",
  "message": "EACCES: permission denied, open '/path/to/file'"
}
```

#### Security

**Directory Traversal Protection:**
- Filenames containing `..`, `/`, or `\` are rejected
- Resolved path must be within docs directory
- Path validation prevents access to files outside allowed directory

#### Example

**Using cURL:**
```bash
curl -O http://localhost:3000/api/docs/download/2026-01-26T15-30-45-123Z_spec.docx \
  -H "Cookie: connect.sid=s%3A[session-id]"
```

**Using JavaScript:**
```javascript
// Trigger browser download
const filename = '2026-01-26T15-30-45-123Z_spec.docx';
window.open(`/api/docs/download/${encodeURIComponent(filename)}`, '_blank');
```

**Programmatic Download:**
```javascript
const response = await fetch(`/api/docs/download/${filename}`, {
  credentials: 'include'
});

if (response.ok) {
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'spec.docx'; // Original filename
  a.click();
  URL.revokeObjectURL(url);
} else {
  console.error('Download failed:', response.status);
}
```

---

## Data Models

### File Object

Represents a documentation file with metadata.

```typescript
interface DocumentFile {
  name: string;           // Original filename (without timestamp)
  path: string;           // Stored filename (with timestamp prefix)
  type: string;           // File extension (without dot): 'docx', 'md', etc.
  size: number;           // File size in bytes
  uploadedAt: string;     // ISO 8601 timestamp: '2026-01-26T15:30:45.123Z'
  timestamp: string;      // Formatted timestamp: '2026-01-26T15-30-45-123Z'
}
```

**Example:**
```json
{
  "name": "api-specification.docx",
  "path": "2026-01-26T15-30-45-123Z_api-specification.docx",
  "type": "docx",
  "size": 102400,
  "uploadedAt": "2026-01-26T15:30:45.123Z",
  "timestamp": "2026-01-26T15-30-45-123Z"
}
```

### File Type Enum

Allowed file extensions (without dot).

```typescript
type FileType = 
  | 'docx'    // Microsoft Word
  | 'xlsx'    // Microsoft Excel
  | 'md'      // Markdown
  | 'json'    // JSON
  | 'txt'     // Plain text
  | 'pdf'     // PDF
  | 'tsx'     // TypeScript JSX
  | 'ts'      // TypeScript
  | 'html'    // HTML
  | 'js';     // JavaScript
```

### Error Response

Standard error response format.

```typescript
interface ErrorResponse {
  success: false;
  error: string;         // Error type/category
  message?: string;      // Detailed error message
  code?: string;         // Machine-readable error code
}
```

**Example:**
```json
{
  "success": false,
  "error": "File too large",
  "message": "File size exceeds maximum of 50MB",
  "code": "FILE_TOO_LARGE"
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Name | Description |
|------|------|-------------|
| `200` | OK | Request successful |
| `400` | Bad Request | Invalid request parameters |
| `401` | Unauthorized | Authentication required |
| `403` | Forbidden | Access denied |
| `404` | Not Found | Resource not found |
| `500` | Internal Server Error | Server-side error |

### Application Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `NO_FILE` | 400 | No file uploaded in request |
| `FILE_TOO_LARGE` | 400 | File exceeds 50MB limit |
| `UNEXPECTED_FIELD` | 400 | Wrong form field name (expected "file") |
| `UPLOAD_ERROR` | 400 | Generic upload error (file type, etc.) |
| `INVALID_FILENAME` | 400 | Filename contains invalid characters |
| `INVALID_PATH` | 403 | Directory traversal attempt |
| `FILE_NOT_FOUND` | 404 | Requested file doesn't exist |
| `INTERNAL_ERROR` | 500 | Unspecified server error |

---

## Examples

### Complete Upload Flow

```javascript
/**
 * Upload a documentation file with full error handling
 */
async function uploadDocument(file) {
  try {
    // Validate file client-side
    const allowedTypes = ['.docx', '.xlsx', '.md', '.json', '.txt', '.pdf', '.tsx', '.ts', '.html', '.js'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
    }
    
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('File size must be less than 50MB');
    }
    
    // Prepare form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('timestamp', new Date().toISOString().replace(/[:.]/g, '-'));
    
    // Upload with progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          console.log(`Upload progress: ${percentComplete.toFixed(2)}%`);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            resolve(response.file);
          } else {
            reject(new Error(response.error || 'Upload failed'));
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            reject(new Error(errorResponse.message || errorResponse.error || 'Upload failed'));
          } catch (e) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });
      
      xhr.open('POST', '/api/docs/upload');
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// Usage
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async () => {
  if (fileInput.files.length > 0) {
    try {
      const file = await uploadDocument(fileInput.files[0]);
      console.log('Upload successful:', file);
      alert(`File uploaded: ${file.name}`);
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.message}`);
    }
  }
});
```

### Complete Download Flow

```javascript
/**
 * Download a documentation file with error handling
 */
async function downloadDocument(filename) {
  try {
    const response = await fetch(`/api/docs/download/${encodeURIComponent(filename)}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      // Try to parse JSON error response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Download failed');
      } else {
        throw new Error(`Download failed with status ${response.status}`);
      }
    }
    
    // Get blob from response
    const blob = await response.blob();
    
    // Extract original filename from timestamp-prefixed name
    const originalFilename = filename.replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_/, '');
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = originalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Download successful:', originalFilename);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

// Usage
downloadDocument('2026-01-26T15-30-45-123Z_specification.docx')
  .then(() => console.log('Download complete'))
  .catch(error => alert(`Download failed: ${error.message}`));
```

### List and Filter Files

```javascript
/**
 * List files and filter by type and date
 */
async function listAndFilterFiles(filterType = null, fromDate = null) {
  try {
    const response = await fetch('/api/docs/files', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.status}`);
    }
    
    const data = await response.json();
    let files = data.files || [];
    
    // Filter by type
    if (filterType) {
      files = files.filter(file => file.type === filterType);
    }
    
    // Filter by date
    if (fromDate) {
      const filterDate = new Date(fromDate);
      files = files.filter(file => new Date(file.uploadedAt) >= filterDate);
    }
    
    return files;
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
}

// Usage examples
// Get all Markdown files
listAndFilterFiles('md').then(files => {
  console.log(`Found ${files.length} Markdown files`);
});

// Get files uploaded in last 7 days
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
listAndFilterFiles(null, sevenDaysAgo).then(files => {
  console.log(`Found ${files.length} files from last week`);
});

// Get recent TypeScript files
listAndFilterFiles('tsx', sevenDaysAgo).then(files => {
  console.log(`Found ${files.length} recent TypeScript files`);
});
```

---

## Rate Limiting

### Current Implementation

**Status:** ⚠️ Not implemented

**Recommendations:**
- Implement rate limiting for upload endpoint
- Suggested limit: 100 requests per hour per user
- Suggested limit: 1GB total uploads per day per user

### Future Implementation

```javascript
// Suggested middleware
const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour
  message: {
    success: false,
    error: 'Too many upload requests',
    message: 'Please try again later'
  }
});

router.post('/upload', uploadLimiter, upload.single('file'), ...);
```

---

## Changelog

### Version 1.0.0 (Current)

**Released:** January 2026

**Features:**
- List files endpoint
- Upload file endpoint
- Download file endpoint
- Health check endpoint
- Cookie-based authentication
- File type validation
- File size validation (50MB)
- Directory traversal protection
- Comprehensive error handling
- Detailed logging

**Known Limitations:**
- No pagination for file list
- No file deletion endpoint
- No file search/filter endpoint
- No rate limiting
- No user-specific permissions
- No file versioning

---

## Support

For API-related issues:
- **Documentation**: Refer to this reference
- **Technical Issues**: Check backend logs
- **Bug Reports**: Create issue in project tracker
- **Feature Requests**: Document in OMAI tasks

---

**API Version:** 1.0.0  
**Last Updated:** January 26, 2026  
**Maintained By:** OrthodoxMetrics Development Team
