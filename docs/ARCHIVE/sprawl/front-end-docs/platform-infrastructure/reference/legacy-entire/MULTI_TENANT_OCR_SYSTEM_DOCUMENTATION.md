# Multi-Tenant OCR System Documentation

**Orthodox Metrics Platform - OCR Pipeline**  
*Version: 1.0*  
*Date: July 10, 2025*

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Design](#database-design)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Setup & Configuration](#setup--configuration)
7. [API Reference](#api-reference)
8. [File Management](#file-management)
9. [Multi-Language Support](#multi-language-support)
10. [Monitoring & Debugging](#monitoring--debugging)
11. [Maintenance & Troubleshooting](#maintenance--troubleshooting)
12. [Security Considerations](#security-considerations)

---

## System Overview

### Purpose
The Multi-Tenant OCR System enables Orthodox churches to digitize historical records (baptism certificates, marriage records, death certificates, etc.) with automatic text extraction using Google Vision AI. Each church operates in complete isolation with its own database and file storage.

### Key Features
- ✅ **Multi-Tenant Architecture**: Complete data isolation per church
- ✅ **Multi-Language OCR**: Supports Greek, Russian, Romanian, Georgian, Serbian, and more
- ✅ **Dual Storage**: Results saved to both database and filesystem
- ✅ **Real-Time Processing**: Automatic queue processing every 30 seconds
- ✅ **High Accuracy**: Google Vision API with language-specific optimization
- ✅ **Error Detection**: Confidence scoring and error region identification
- ✅ **Comprehensive UI**: Upload, review, and manage OCR jobs through web interface

### System Requirements
- **Backend**: Node.js 16+, Express.js
- **Database**: MariaDB/MySQL with per-church databases
- **Storage**: Local filesystem for images and text files
- **OCR Engine**: Google Vision API
- **Frontend**: React with TypeScript

---

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Databases     │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ OCX Data    │ │◄──►│ │ OCR Router  │ │    │ │ Central DB  │ │
│ │ Panel       │ │    │ │             │ │    │ │ (churches)  │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │        │        │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Church      │ │◄──►│ │ OCR         │ │◄──►│ │ Church 1 DB │ │
│ │ Admin Panel │ │    │ │ Controller  │ │    │ │ (ocr_jobs)  │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │        │        │    │                 │
└─────────────────┘    │ ┌─────────────┐ │    │ ┌─────────────┐ │
                       │ │ DB Switcher │ │◄──►│ │ Church N DB │ │
                       │ │             │ │    │ │ (isolated)  │ │
                       │ └─────────────┘ │    │ └─────────────┘ │
                       │        │        │    └─────────────────┘
                       │ ┌─────────────┐ │
                       │ │ OCR         │ │
                       │ │ Processing  │ │
                       │ │ Service     │ │
                       │ └─────────────┘ │
                       │        │        │
                       └─────────────────┘
                                │
                      ┌─────────────────┐
                      │ Google Vision   │
                      │ API             │
                      └─────────────────┘
```

### Component Breakdown

#### 1. Database Switcher (`utils/dbSwitcher.js`)
- **Purpose**: Dynamically switches between church-specific databases
- **Key Function**: `getChurchDbConnection(dbName)`
- **Features**: Connection pooling, caching, error handling

#### 2. OCR Controller (`controllers/churchOcrController.js`)
- **Purpose**: Handles OCR-related API requests
- **Functions**: Upload, job management, result retrieval
- **Security**: Church-specific data isolation

#### 3. OCR Processing Service (`services/ocrProcessingService.js`)
- **Purpose**: Background processing of OCR jobs
- **Features**: Queue management, Google Vision integration, file generation
- **Scheduling**: Runs every 30 seconds automatically

#### 4. Frontend Components
- **OCXDataPanel**: Main OCR management interface
- **ChurchAdminPanel**: Church administration and OCR access

---

## Database Design

### Central Database (`orthodox_metrics`)

```sql
-- Churches table (central registry)
CREATE TABLE churches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    database_name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Church-Specific Databases

Each church has its own isolated database with the following OCR tables:

```sql
-- OCR Jobs table (per church)
CREATE TABLE ocr_jobs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    church_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    record_type ENUM('baptism', 'marriage', 'death', 'other') DEFAULT 'other',
    language VARCHAR(10) DEFAULT 'en',
    status ENUM('pending', 'processing', 'complete', 'error') DEFAULT 'pending',
    confidence_score DECIMAL(3,2),
    ocr_result LONGTEXT,
    error_regions JSON,
    description TEXT,
    processing_log TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_church_status (church_id, status),
    INDEX idx_created_at (created_at)
);

-- OCR Settings table (per church)
CREATE TABLE ocr_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    church_id INT NOT NULL,
    default_language VARCHAR(10) DEFAULT 'en',
    auto_process BOOLEAN DEFAULT TRUE,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.60,
    max_file_size BIGINT DEFAULT 10485760,
    allowed_formats JSON DEFAULT ('["jpg", "jpeg", "png", "pdf"]'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- OCR Queue table (per church)
CREATE TABLE ocr_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id INT NOT NULL,
    priority INT DEFAULT 1,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    next_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES ocr_jobs(id) ON DELETE CASCADE
);
```

---

## Backend Implementation

### 1. Database Switching Logic

```javascript
// utils/dbSwitcher.js
const mysql = require('mysql2/promise');
const dbConnections = new Map();

async function getChurchDbConnection(dbName) {
    // Check cache first
    if (dbConnections.has(dbName)) {
        return dbConnections.get(dbName);
    }
    
    // Create new connection pool
    const connection = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    
    // Cache and return
    dbConnections.set(dbName, connection);
    return connection;
}
```

### 2. OCR Processing Workflow

```javascript
// Automatic Processing Flow
1. processQueue() → runs every 30 seconds
2. processChurchQueue(church) → for each active church
3. processOcrJob(db, job) → individual job processing
4. performOcr(imagePath, language) → Google Vision API
5. saveOcrResultFile(job, text) → save to filesystem
6. Update database with results
```

### 3. File Upload Handler

```javascript
// File upload with church isolation
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const churchId = req.params.id;
        const uploadDir = path.join('uploads', 'ocr', `church_${churchId}`);
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `ocr_${Date.now()}-${Math.random().toString().substr(2, 9)}_${generateHash()}.${getFileExtension(file.originalname)}`;
        cb(null, uniqueName);
    }
});
```

### 4. API Routes Structure

```javascript
// routes/church/ocr.js
router.post('/upload', upload.array('images', 10), uploadOcrImages);
router.get('/jobs', getOcrJobs);
router.get('/jobs/:jobId', getOcrJob);
router.delete('/jobs/:jobId', deleteOcrJob);
router.get('/settings', getOcrSettings);
router.put('/settings', updateOcrSettings);
router.get('/stats', getOcrStats);
```

---

## Frontend Implementation

### 1. OCXDataPanel Component Structure

```typescript
interface OCXDataPanelProps {
    churchId: string;
}

interface OcrJob {
    id: number;
    filename: string;
    originalFilename: string;
    status: 'pending' | 'processing' | 'complete' | 'error';
    confidenceScore: number;
    ocrResult?: string;
    recordType: string;
    language: string;
    createdAt: string;
    hasResult: boolean;
}
```

### 2. Key Features

- **File Upload**: Drag-and-drop with multiple file support
- **Language Selection**: Dropdown with Orthodox languages
- **Record Type Classification**: Baptism, Marriage, Death, Other
- **Progress Tracking**: Real-time status updates
- **Result Viewing**: Modal with OCR text display
- **Batch Operations**: Multiple file processing

### 3. State Management

```typescript
const [jobs, setJobs] = useState<OcrJob[]>([]);
const [uploading, setUploading] = useState(false);
const [selectedLanguage, setSelectedLanguage] = useState('en');
const [selectedRecordType, setSelectedRecordType] = useState('other');
```

---

## Setup & Configuration

### 1. Environment Variables

```bash
# .env.production
DB_HOST=localhost
DB_USER=orthodoxapp
DB_PASSWORD=your_password
DB_NAME=orthodox_metrics

# Google Vision API
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id
```

### 2. Church Database Creation

```bash
# Add new church
node utils/add-church.js "Church Name" "church_database_name"

# Setup OCR tables
node utils/setup-ocr-tables.js church_database_name

# Grant permissions
mysql < fix-church-permissions.sql
```

### 3. Google Vision API Setup

```bash
# Configure credentials
node setup-google-vision.js

# Test API connection
node test-google-vision.js
```

### 4. Server Startup

```javascript
// index.js - OCR service integration
const ocrProcessingService = require('./services/ocrProcessingService');

// Start OCR processing when server starts
ocrProcessingService.start();

// Graceful shutdown
process.on('SIGTERM', () => {
    ocrProcessingService.stop();
});
```

---

## API Reference

### OCR Upload Endpoint

```http
POST /api/church/:churchId/ocr/upload
Content-Type: multipart/form-data

Body:
- images: File[] (max 10 files)
- recordType: string ('baptism'|'marriage'|'death'|'other')
- language: string (language code)

Response:
{
    "success": true,
    "message": "Files uploaded successfully",
    "jobs": [
        {
            "id": 1,
            "filename": "ocr_1752189013339_abc123.jpg",
            "originalFilename": "baptism_certificate.jpg",
            "status": "pending"
        }
    ]
}
```

### Get OCR Jobs

```http
GET /api/church/:churchId/ocr/jobs?page=1&limit=20&status=complete

Response:
{
    "jobs": [
        {
            "id": 1,
            "filename": "ocr_1752189013339_abc123.jpg",
            "originalFilename": "baptism_certificate.jpg",
            "status": "complete",
            "confidenceScore": 0.95,
            "recordType": "baptism",
            "language": "el",
            "hasResult": true,
            "createdAt": "2025-07-10T19:51:49.000Z"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 16,
        "pages": 1
    }
}
```

### Get OCR Result

```http
GET /api/church/:churchId/ocr/jobs/:jobId

Response:
{
    "job": {
        "id": 1,
        "ocrResult": "Extracted text content...",
        "confidenceScore": 0.95,
        "errorRegions": null
    }
}
```

---

## File Management

### Directory Structure

```
server/
├── uploads/
│   └── ocr/
│       ├── church_14/
│       │   ├── ocr_1752189013339_abc123.jpg
│       │   ├── ocr_1752189013339_abc123_preprocessed.jpg
│       │   └── ...
│       └── church_15/
│           └── ...
└── ocr-results/
    ├── church_14/
    │   ├── baptism_certificate_result_job1_2025-07-10T23-51-58.txt
    │   ├── marriage_record_result_job2_2025-07-10T23-52-15.txt
    │   └── ...
    └── church_15/
        └── ...
```

### Text File Format

```
============================================================
OCR RESULT
============================================================
Original File: baptism_certificate.jpg
Processed File: ocr_1752189013339_abc123.jpg
Language: el
Record Type: baptism
Confidence Score: 95.0%
Processing Date: 2025-07-10T23:51:58.000Z
Job ID: 1
File Generated: 2025-07-10T23:52:00.123Z
============================================================

EXTRACTED TEXT:
----------------------------------------
Βεβαιώ ότι Ιωάννης Παπαδόπουλος
έβαπτίσθη κατά την 15η Μαΐου 1985
υπό του Πατρός Γεωργίου Χριστοδούλου
εν τη Αγία Τριάδι εκκλησία...
----------------------------------------

============================================================
End of OCR Result
============================================================
```

---

## Multi-Language Support

### Supported Languages

| Language | Code | Script | Use Case |
|----------|------|--------|----------|
| English | en | Latin | Modern records |
| Greek (Modern) | el | Greek | Greek Orthodox records |
| Greek (Ancient) | grc | Greek | Historical documents |
| Russian | ru | Cyrillic | Russian Orthodox records |
| Russian (Old) | ru-PETR1708 | Cyrillic | Pre-1918 records |
| Serbian | sr | Cyrillic | Serbian Orthodox |
| Serbian (Latin) | sr-Latn | Latin | Modern Serbian |
| Bulgarian | bg | Cyrillic | Bulgarian Orthodox |
| Romanian | ro | Latin | Romanian Orthodox |
| Ukrainian | uk | Cyrillic | Ukrainian Orthodox |
| Macedonian | mk | Cyrillic | Macedonian Orthodox |
| Belarusian | be | Cyrillic | Belarusian Orthodox |
| Georgian | ka | Georgian | Georgian Orthodox |

### Language Configuration

```javascript
// Frontend language options
const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'el', label: 'Greek (Modern)' },
    { value: 'grc', label: 'Greek (Ancient)' },
    { value: 'ru', label: 'Russian' },
    { value: 'ru-PETR1708', label: 'Russian (Old Orthography)' },
    { value: 'sr', label: 'Serbian (Cyrillic)' },
    { value: 'sr-Latn', label: 'Serbian (Latin)' },
    { value: 'bg', label: 'Bulgarian' },
    { value: 'ro', label: 'Romanian' },
    { value: 'uk', label: 'Ukrainian' },
    { value: 'mk', label: 'Macedonian' },
    { value: 'be', label: 'Belarusian' },
    { value: 'ka', label: 'Georgian' }
];
```

---

## Monitoring & Debugging

### Debug Scripts

```bash
# Check OCR results for a church
node debug-ocr-results.js

# Test church admin functionality
node test-church-admin.js

# Test Google Vision API
node test-google-vision.js

# Manually process OCR queue
node -e "require('./services/ocrProcessingService').processQueue()"
```

### Logging

The system provides comprehensive logging:

```javascript
// OCR Processing Logs
console.log('🚀 Starting OCR Processing Service...');
console.log('🔄 Processing OCR queue...');
console.log('📋 Processing X jobs for Church Name');
console.log('🔍 Processing OCR job X: filename.jpg');
console.log('✅ OCR job X completed with 95.0% confidence');
console.log('💾 OCR result saved to: /path/to/result.txt');
```

### Performance Monitoring

```javascript
// Get processing statistics
const stats = await ocrProcessingService.getProcessingStats();
console.log(stats);
/*
{
    totalChurches: 1,
    queueStatus: {
        pending: 4,
        processing: 0,
        complete: 12,
        error: 0
    },
    timestamp: "2025-07-10T23:52:00.000Z"
}
*/
```

---

## Maintenance & Troubleshooting

### Common Issues

#### 1. OCR Jobs Stuck in Processing
```bash
# Check for stuck jobs
mysql -e "SELECT * FROM ocr_jobs WHERE status='processing' AND updated_at < NOW() - INTERVAL 5 MINUTE;"

# Reset stuck jobs
mysql -e "UPDATE ocr_jobs SET status='pending' WHERE status='processing' AND updated_at < NOW() - INTERVAL 5 MINUTE;"
```

#### 2. Google Vision API Errors
```bash
# Test API credentials
node test-google-vision.js

# Check service account permissions
gcloud auth list
gcloud projects list
```

#### 3. Database Connection Issues
```bash
# Test database connections
node -e "require('./utils/dbSwitcher').getChurchDbConnection('church_db_name').then(db => console.log('Connected')).catch(console.error)"

# Check database permissions
mysql -e "SHOW GRANTS FOR 'orthodoxapp'@'localhost';"
```

### Maintenance Tasks

#### Regular Cleanup
```bash
# Clean up old preprocessed images (weekly)
find uploads/ocr -name "*_preprocessed.*" -mtime +7 -delete

# Archive old OCR results (monthly)
tar -czf ocr-results-$(date +%Y%m).tar.gz ocr-results/
```

#### Database Optimization
```sql
-- Optimize OCR tables (monthly)
OPTIMIZE TABLE ocr_jobs;
OPTIMIZE TABLE ocr_queue;

-- Clean up old queue entries
DELETE FROM ocr_queue WHERE created_at < NOW() - INTERVAL 30 DAY;
```

### Backup Strategy

```bash
# Backup church databases
for db in $(mysql -e "SELECT database_name FROM churches" --skip-column-names); do
    mysqldump $db > backups/${db}_$(date +%Y%m%d).sql
done

# Backup uploaded files
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/

# Backup OCR results
tar -czf ocr-results-backup-$(date +%Y%m%d).tar.gz ocr-results/
```

---

## Security Considerations

### Data Isolation
- Each church has its own isolated database
- File storage is organized by church ID
- API endpoints validate church access permissions

### File Security
- Uploaded files are stored outside web root
- File types are validated and restricted
- File sizes are limited (default: 10MB)

### API Security
- Church ID validation on all endpoints
- User authentication required
- Rate limiting on upload endpoints

### Database Security
- Dedicated database user with minimal privileges
- No cross-church data access possible
- Regular security updates and patches

---

## Conclusion

The Multi-Tenant OCR System provides a comprehensive solution for Orthodox churches to digitize their historical records. With complete data isolation, multi-language support, and dual storage (database + filesystem), the system ensures both functionality and security.

The system is production-ready and actively processing OCR jobs with high accuracy across multiple languages and church jurisdictions.

For support or questions, refer to the debug scripts and monitoring tools provided in this documentation.

---

**Document Version**: 1.0  
**Last Updated**: July 10, 2025  
**System Status**: Production Ready ✅
