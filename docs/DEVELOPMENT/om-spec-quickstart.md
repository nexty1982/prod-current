# OM Specification Documentation - Quick Start Guide

**For Developers**

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Running the System](#running-the-system)
5. [Basic Usage](#basic-usage)
6. [Development Workflow](#development-workflow)
7. [Testing](#testing)
8. [Common Tasks](#common-tasks)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Minimum Version | Purpose |
|----------|----------------|---------|
| **Node.js** | 16.x or higher | Backend runtime |
| **npm** | 8.x or higher | Package manager |
| **React** | 18.x | Frontend framework |
| **TypeScript** | 5.x | Type safety |

### Required Knowledge

- JavaScript/TypeScript
- React hooks and components
- Express.js backend development
- REST API concepts
- File upload/download mechanisms

---

## Installation

### 1. Backend Setup

#### Install Dependencies

```bash
cd server
npm install multer  # File upload handling
```

#### Verify Installation

```bash
# Check if multer is installed
npm list multer
```

**Expected Output:**
```
server@1.0.0 /path/to/server
└── multer@1.4.x
```

---

### 2. Frontend Setup

#### Dependencies Already Included

The frontend uses existing dependencies:
- `@mui/material` - UI components
- `@tabler/icons-react` - Icons
- `react` - Framework

No additional installation required.

---

### 3. File Storage Setup

#### Create Docs Directory

**Production:**
```bash
mkdir -p /var/www/orthodoxmetrics/prod/front-end/public/docs
chmod 755 /var/www/orthodoxmetrics/prod/front-end/public/docs
chown -R www-data:www-data /var/www/orthodoxmetrics/prod/front-end/public/docs
```

**Development:**
```bash
cd /path/to/project
mkdir -p front-end/public/docs
chmod 755 front-end/public/docs
```

#### Verify Directory

```bash
# Check directory exists and permissions
ls -la front-end/public/docs
```

**Expected Output:**
```
drwxr-xr-x 2 www-data www-data 4096 Jan 26 15:30 .
drwxr-xr-x 5 www-data www-data 4096 Jan 26 15:30 ..
-rw-r--r-- 1 www-data www-data  123 Jan 26 15:30 README.md
```

---

### 4. Backend Route Integration

#### Add Route to Server

**File:** `server/index.js` or `server/src/index.ts`

```javascript
// Add docs route
const docsRouter = require('./routes/docs');
app.use('/api/docs', docsRouter);
```

**Full Example:**
```javascript
const express = require('express');
const app = express();

// ... other middleware ...

// Documentation routes
const docsRouter = require('./routes/docs');
app.use('/api/docs', docsRouter);

// ... other routes ...

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

#### Verify Route

```bash
# Start server
npm start

# Test endpoint
curl http://localhost:3000/api/docs/
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OM Specification Documentation API is working",
  "docsDir": "/path/to/docs",
  "nodeEnv": "development",
  "exists": true
}
```

---

### 5. Frontend Route Integration

#### Add to Router

**File:** `Router.tsx` or routing configuration

```typescript
import OMSpecDocumentation from '@/features/devel-tools/system-documentation/om-spec';

// In route configuration
{
  path: '/church/om-spec',
  element: <OMSpecDocumentation />
}
```

**Full Example (React Router v6):**
```typescript
import { createBrowserRouter } from 'react-router-dom';
import OMSpecDocumentation from '@/features/devel-tools/system-documentation/om-spec';

const router = createBrowserRouter([
  {
    path: '/church',
    children: [
      {
        path: 'om-spec',
        element: <OMSpecDocumentation />
      }
    ]
  }
]);
```

---

## Configuration

### Environment Variables

Create or update `.env` file:

```bash
# Backend Configuration
NODE_ENV=development
PORT=3000

# Custom docs directory (optional)
# DOCS_DIR=/custom/path/to/docs
```

### Configuration File

**File:** `front-end/src/features/devel-tools/system-documentation/om-spec.config.ts`

**Default Configuration:**
```typescript
export const omSpecConfig = {
  api: {
    baseUrl: '/api/docs',
    endpoints: {
      list: '/files',
      upload: '/upload',
    },
  },
  storage: {
    production: '/var/www/orthodoxmetrics/prod/front-end/public/docs',
    development: 'front-end/public/docs',
  },
  allowedTypes: ['.docx', '.xlsx', '.md', '.json', '.txt', '.pdf', '.tsx', '.ts', '.html', '.js'],
  maxFileSize: 50 * 1024 * 1024, // 50MB
  publicPath: '/docs',
};
```

**Customization Example:**
```typescript
// Increase file size limit to 100MB
export const omSpecConfig = {
  // ... other config ...
  maxFileSize: 100 * 1024 * 1024, // 100MB
};
```

---

## Running the System

### Development Mode

#### Start Backend

```bash
cd server
npm run dev  # or npm start
```

**Expected Output:**
```
Server running on port 3000
Docs directory ensured: /path/to/front-end/public/docs
```

#### Start Frontend

```bash
cd front-end
npm run dev  # or npm start
```

**Expected Output:**
```
VITE v4.x.x  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.100:5173/
```

---

### Production Mode

#### Build Frontend

```bash
cd front-end
npm run build
```

#### Start Backend

```bash
cd server
NODE_ENV=production npm start
```

---

## Basic Usage

### 1. Access the Interface

Open browser and navigate to:
```
http://localhost:5173/church/om-spec  (development)
http://yourdomain.com/church/om-spec  (production)
```

---

### 2. Upload a File

**Via UI:**
1. Click **"Upload Documentation"** button
2. Click **"Select Files"**
3. Choose file(s)
4. Click **"Upload X File(s)"**

**Via API (cURL):**
```bash
curl -X POST http://localhost:3000/api/docs/upload \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -F "file=@/path/to/document.docx"
```

**Via API (JavaScript):**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/docs/upload', {
  method: 'POST',
  credentials: 'include',
  body: formData
});

const data = await response.json();
console.log('Upload result:', data);
```

---

### 3. List Files

**Via UI:**
- Files automatically displayed after page load
- Use sort dropdown to change order

**Via API (cURL):**
```bash
curl http://localhost:3000/api/docs/files \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Via API (JavaScript):**
```javascript
const response = await fetch('/api/docs/files', {
  credentials: 'include'
});

const data = await response.json();
console.log('Files:', data.files);
```

---

### 4. Download a File

**Via UI:**
1. Navigate to file in carousel or table
2. Click **"Download"** button

**Via API (cURL):**
```bash
curl -O http://localhost:3000/api/docs/download/FILENAME \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Via API (JavaScript):**
```javascript
const filename = '2026-01-26T15-30-45-123Z_document.docx';
window.open(`/api/docs/download/${encodeURIComponent(filename)}`, '_blank');
```

---

## Development Workflow

### 1. Adding New File Types

#### Step 1: Update Backend

**File:** `server/routes/docs.js`

```javascript
const ALLOWED_TYPES = [
  '.docx', '.xlsx', '.md', '.json', '.txt',
  '.pdf', '.tsx', '.ts', '.html', '.js',
  '.py'  // Add Python
];
```

#### Step 2: Update Frontend Component

**File:** `front-end/src/features/devel-tools/system-documentation/om-spec/OMSpecDocumentation.tsx`

```typescript
// Update allowed types
const allowedTypes = [
  '.docx', '.xlsx', '.md', '.json', '.txt',
  '.pdf', '.tsx', '.ts', '.html', '.js',
  '.py'  // Add Python
];

// Update file icon function
const getFileIcon = (type: string, size: number = 64) => {
  switch (type) {
    case 'py':
      return <IconCode size={size} />;
    // ... other cases ...
  }
};

// Update file color function
const getFileTypeColor = (type: string) => {
  switch (type) {
    case 'py':
      return '#3776AB';  // Python blue
    // ... other cases ...
  }
};
```

#### Step 3: Update Configuration

**File:** `front-end/src/features/devel-tools/system-documentation/om-spec.config.ts`

```typescript
export const omSpecConfig = {
  // ... other config ...
  allowedTypes: [
    '.docx', '.xlsx', '.md', '.json', '.txt',
    '.pdf', '.tsx', '.ts', '.html', '.js',
    '.py'  // Add Python
  ],
  fileTypeIcons: {
    // ... other types ...
    py: 'IconCode',
  },
  fileTypeColors: {
    // ... other types ...
    py: '#3776AB',
  },
};
```

#### Step 4: Test

```bash
# Upload a Python file via UI or API
# Verify icon and color display correctly
```

---

### 2. Modifying File Size Limit

#### Backend

**File:** `server/routes/docs.js`

```javascript
const MAX_FILE_SIZE = 100 * 1024 * 1024; // Change to 100MB
```

#### Frontend

**File:** `front-end/src/features/devel-tools/system-documentation/om-spec/OMSpecDocumentation.tsx`

```typescript
// Update validation
if (file.size > 100 * 1024 * 1024) {  // 100MB
  errors.push(`${file.name}: File size must be less than 100MB`);
  return;
}
```

#### Configuration

**File:** `om-spec.config.ts`

```typescript
maxFileSize: 100 * 1024 * 1024, // 100MB
```

#### Test

```bash
# Try uploading a file larger than old limit but smaller than new limit
# Verify it succeeds
```

---

### 3. Customizing UI Theme

**File:** `OMSpecDocumentation.tsx`

```typescript
// Change upload button color
<Button
  variant="contained"
  startIcon={<IconUpload size={20} />}
  onClick={handleOpenUploadDialog}
  sx={{
    backgroundColor: '#YOUR_COLOR',  // Change this
    color: '#1a1a1a',
    '&:hover': {
      backgroundColor: '#YOUR_HOVER_COLOR',  // And this
    },
  }}
>
  Upload Documentation
</Button>
```

---

## Testing

### Manual Testing Checklist

#### Upload Functionality
- [ ] Upload single file
- [ ] Upload multiple files
- [ ] Upload with each allowed file type
- [ ] Try uploading disallowed file type (should fail)
- [ ] Try uploading file >50MB (should fail)
- [ ] Verify progress bar works
- [ ] Verify error messages display correctly

#### File Listing
- [ ] Files display after page load
- [ ] Carousel navigation works
- [ ] Grid view displays correctly
- [ ] Table view displays correctly
- [ ] Sort by date works
- [ ] Sort by name works
- [ ] Sort by size works
- [ ] Sort by type works

#### Download Functionality
- [ ] Download from carousel
- [ ] Download from table view
- [ ] Downloaded file opens correctly
- [ ] Filename is correct (timestamp removed)

#### Error Handling
- [ ] No files uploaded shows empty state
- [ ] Upload errors display messages
- [ ] Download errors display messages
- [ ] API errors are caught and logged

---

### Automated Testing

#### Backend API Tests

**File:** `server/tests/docs.test.js`

```javascript
const request = require('supertest');
const app = require('../index');

describe('Docs API', () => {
  test('GET /api/docs/ should return success', async () => {
    const response = await request(app).get('/api/docs/');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('GET /api/docs/files should return array', async () => {
    const response = await request(app).get('/api/docs/files');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.files)).toBe(true);
  });

  test('POST /api/docs/upload without file should fail', async () => {
    const response = await request(app).post('/api/docs/upload');
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
```

**Run Tests:**
```bash
cd server
npm test
```

---

#### Frontend Component Tests

**File:** `front-end/src/features/devel-tools/system-documentation/om-spec/__tests__/OMSpecDocumentation.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import OMSpecDocumentation from '../OMSpecDocumentation';

describe('OMSpecDocumentation', () => {
  test('renders title', () => {
    render(<OMSpecDocumentation />);
    expect(screen.getByText('OM Specification Documentation')).toBeInTheDocument();
  });

  test('renders upload button', () => {
    render(<OMSpecDocumentation />);
    expect(screen.getByText('Upload Documentation')).toBeInTheDocument();
  });

  test('renders empty state when no files', () => {
    render(<OMSpecDocumentation />);
    expect(screen.getByText('No documentation files')).toBeInTheDocument();
  });
});
```

**Run Tests:**
```bash
cd front-end
npm test
```

---

## Common Tasks

### Task 1: Clear All Uploaded Files

**For Development:**
```bash
rm -rf front-end/public/docs/*
# Keep README
echo "# Documentation (Non-Canonical)" > front-end/public/docs/README.md
```

**For Production:**
```bash
cd /var/www/orthodoxmetrics/prod/front-end/public/docs
rm -f *.docx *.xlsx *.md *.json *.txt *.pdf *.tsx *.ts *.html *.js
```

---

### Task 2: Backup Uploaded Files

```bash
# Create backup directory
mkdir -p backups/docs_$(date +%Y%m%d)

# Copy files
cp -r front-end/public/docs/* backups/docs_$(date +%Y%m%d)/

# Create compressed archive
tar -czf backups/docs_$(date +%Y%m%d).tar.gz backups/docs_$(date +%Y%m%d)/
```

---

### Task 3: Monitor Disk Usage

```bash
# Check docs directory size
du -sh front-end/public/docs

# List files by size
ls -lhS front-end/public/docs
```

---

### Task 4: View Backend Logs

**Development:**
```bash
# Logs appear in terminal
npm run dev
```

**Production (PM2):**
```bash
# View logs
pm2 logs server

# View specific log file
tail -f ~/.pm2/logs/server-out.log
```

---

### Task 5: Debug Upload Issues

**Check File Permissions:**
```bash
ls -la front-end/public/docs
```

**Check Disk Space:**
```bash
df -h
```

**Check Backend Logs:**
```bash
# Look for error messages starting with ❌
pm2 logs server | grep "❌"
```

**Test Upload via cURL:**
```bash
curl -X POST http://localhost:3000/api/docs/upload \
  -F "file=@test.txt" \
  -v  # Verbose output
```

---

## Troubleshooting

### Issue: Files Not Uploading

**Symptoms:**
- Upload button does nothing
- "No file uploaded" error
- Upload fails silently

**Solutions:**

1. **Check directory exists:**
   ```bash
   ls -la front-end/public/docs
   ```

2. **Check permissions:**
   ```bash
   chmod 755 front-end/public/docs
   ```

3. **Check disk space:**
   ```bash
   df -h
   ```

4. **Check backend logs:**
   ```bash
   # Look for errors
   pm2 logs server
   ```

5. **Verify route is registered:**
   ```javascript
   // In server/index.js
   console.log(app._router.stack.filter(r => r.route));
   ```

---

### Issue: Files Not Listed

**Symptoms:**
- "No documentation files" shows but files exist
- Empty file list
- Uploaded files not visible

**Solutions:**

1. **Verify API endpoint:**
   ```bash
   curl http://localhost:3000/api/docs/files
   ```

2. **Check file extensions:**
   ```bash
   # List all files
   ls front-end/public/docs
   # Should have allowed extensions
   ```

3. **Check file permissions:**
   ```bash
   ls -l front-end/public/docs/*
   # Should be readable
   ```

4. **Restart backend:**
   ```bash
   pm2 restart server
   ```

---

### Issue: Download Not Working

**Symptoms:**
- Download button does nothing
- 404 error
- File corrupted

**Solutions:**

1. **Verify filename:**
   ```bash
   ls front-end/public/docs/[filename]
   ```

2. **Test download endpoint:**
   ```bash
   curl -O http://localhost:3000/api/docs/download/[filename]
   ```

3. **Check for special characters:**
   ```bash
   # URL-encode filename
   encodeURIComponent(filename)
   ```

4. **Clear browser cache**

---

### Issue: CORS Errors

**Symptoms:**
- "CORS policy blocked" in console
- API calls fail from frontend
- Authentication not working

**Solutions:**

1. **Enable CORS in backend:**
   ```javascript
   const cors = require('cors');
   app.use(cors({
     origin: 'http://localhost:5173',
     credentials: true
   }));
   ```

2. **Use `credentials: 'include'` in fetch:**
   ```javascript
   fetch('/api/docs/files', {
     credentials: 'include'
   });
   ```

3. **Check proxy configuration:**
   ```javascript
   // vite.config.ts
   export default {
     server: {
       proxy: {
         '/api': 'http://localhost:3000'
       }
     }
   };
   ```

---

## Next Steps

After completing this quick start:

1. **Read Full Documentation:**
   - [OM Specification Documentation](../FEATURES/om-specification-documentation.md)
   - [API Reference](../REFERENCE/om-spec-api.md)

2. **Explore Advanced Features:**
   - OMAI Tasks integration
   - Custom styling
   - Additional file types

3. **Deploy to Production:**
   - [Deployment Guide](./om-spec-deployment.md)
   - Security hardening
   - Performance optimization

---

## Getting Help

- **Documentation:** Check `docs/FEATURES/` folder
- **API Reference:** See `docs/REFERENCE/om-spec-api.md`
- **Issues:** Create ticket in project tracker
- **Questions:** Ask in development Slack channel

---

**Guide Version:** 1.0.0  
**Last Updated:** January 26, 2026  
**For System Version:** OM Spec 1.0.0
