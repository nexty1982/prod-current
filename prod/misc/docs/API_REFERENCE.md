# API Reference - Orthodox Metrics

## 📚 API Overview

Orthodox Metrics provides a comprehensive RESTful API for managing Orthodox church data, OCR processing, and administrative functions. All endpoints require proper authentication and respect church data isolation.

## 🔐 Authentication

### Authentication Methods

#### Session-Based Authentication
Most web interface interactions use session-based authentication with secure cookies.

```javascript
// Login request
POST /api/auth/login
{
  "email": "admin@church.org",
  "password": "secure_password"
}

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "admin@church.org",
      "role": "admin",
      "churchId": 1,
      "churchName": "St. Nicholas Orthodox Church"
    },
    "sessionId": "sess_abc123..."
  }
}
```

#### JWT Token Authentication
API integrations can use JWT tokens for programmatic access.

```javascript
// Request header
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Token payload
{
  "userId": 1,
  "churchId": 1,
  "role": "admin",
  "iat": 1642678800,
  "exp": 1642765200
}
```

### User Roles and Permissions

| Role | Permissions | Scope |
|------|-------------|-------|
| **super_admin** | Full system access | All churches |
| **admin** | Church administration | Single church |
| **user** | Limited access | Assigned records only |

## 🏛️ Church Management API

### Churches Endpoints

#### List Churches
```http
GET /api/churches
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "St. Nicholas Orthodox Church",
      "jurisdiction": "Greek Orthodox Archdiocese",
      "address": "123 Orthodox Way, City, State 12345",
      "phone": "+1-555-123-4567",
      "email": "info@stnicholasorthodox.org",
      "website": "https://stnicholasorthodox.org",
      "founded": "1954-03-15",
      "patronSaint": "St. Nicholas the Wonderworker",
      "calendar": "new",
      "language": "en",
      "active": true,
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-07-18T09:15:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

#### Get Church Details
```http
GET /api/churches/{churchId}
Authorization: Bearer <token>
```

#### Create Church (Super Admin Only)
```http
POST /api/churches
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Holy Trinity Orthodox Church",
  "jurisdiction": "Orthodox Church in America",
  "address": "456 Faith Street, City, State 12345",
  "phone": "+1-555-987-6543",
  "email": "admin@holytrinity.org",
  "website": "https://holytrinity.org",
  "founded": "1965-08-15",
  "patronSaint": "Holy Trinity",
  "calendar": "new",
  "language": "en"
}
```

#### Update Church
```http
PUT /api/churches/{churchId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone": "+1-555-987-6544",
  "website": "https://newholytrinity.org"
}
```

#### Delete Church (Super Admin Only)
```http
DELETE /api/churches/{churchId}
Authorization: Bearer <token>
```

### Church Configuration

#### Get Church Settings
```http
GET /api/churches/{churchId}/settings
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "liturgicalColors": {
      "primary": "#FFD700",
      "secondary": "#6B46C1",
      "accent": "#2563EB"
    },
    "calendar": {
      "type": "new",
      "jurisdiction": "goarch",
      "showSaints": true,
      "showFasts": true
    },
    "languages": {
      "primary": "en",
      "secondary": ["el", "ru"]
    },
    "ocr": {
      "enabledLanguages": ["en", "el"],
      "autoProcessing": true,
      "confidenceThreshold": 0.85
    },
    "notifications": {
      "emailEnabled": true,
      "smsEnabled": false
    }
  }
}
```

#### Update Church Settings
```http
PUT /api/churches/{churchId}/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "ocr": {
    "confidenceThreshold": 0.90
  },
  "notifications": {
    "emailEnabled": false
  }
}
```

## 👥 User Management API

### Users Endpoints

#### List Users
```http
GET /api/users?churchId={churchId}&role={role}&page={page}&limit={limit}
Authorization: Bearer <token>
```

**Query Parameters:**
- `churchId` (number): Filter by church ID
- `role` (string): Filter by role (admin, user)
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search by name or email

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "john.doe@church.org",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "churchId": 1,
      "churchName": "St. Nicholas Orthodox Church",
      "active": true,
      "lastLogin": "2025-07-18T08:30:00Z",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "pageSize": 10,
    "totalPages": 3
  }
}
```

#### Create User
```http
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "maria.smith@church.org",
  "firstName": "Maria",
  "lastName": "Smith",
  "password": "TemporaryPassword123!",
  "role": "user",
  "churchId": 1,
  "department": "choir",
  "sendWelcomeEmail": true
}
```

#### Update User
```http
PUT /api/users/{userId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Maria",
  "lastName": "Johnson",
  "role": "admin",
  "active": true
}
```

#### Delete User
```http
DELETE /api/users/{userId}
Authorization: Bearer <token>
```

### User Authentication

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@church.org",
  "password": "secure_password"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

#### Change Password
```http
PUT /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "old_password",
  "newPassword": "new_secure_password"
}
```

#### Password Reset Request
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@church.org"
}
```

#### Password Reset Confirmation
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_here",
  "newPassword": "new_secure_password"
}
```

## 📄 OCR Processing API

### OCR Upload and Processing

#### Upload Document for OCR
```http
POST /api/ocr/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

document: <file>
documentType: "baptism" | "marriage" | "funeral"
language: "en" | "el" | "ru" | "ro" | "ka"
churchId: 1
metadata: {
  "expectedDate": "1985-05-15",
  "notes": "Handwritten certificate"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "ocr_sess_abc123",
    "status": "processing",
    "fileName": "baptism_certificate_001.pdf",
    "documentType": "baptism",
    "language": "en",
    "uploadedAt": "2025-07-18T10:30:00Z",
    "estimatedCompletion": "2025-07-18T10:32:00Z"
  }
}
```

#### Get OCR Session Status
```http
GET /api/ocr/sessions/{sessionId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "ocr_sess_abc123",
    "status": "completed",
    "progress": 100,
    "fileName": "baptism_certificate_001.pdf",
    "documentType": "baptism",
    "language": "en",
    "confidence": 0.92,
    "extractedText": "Certificate of Baptism...",
    "structuredData": {
      "baptizedName": "John Michael Doe",
      "birthDate": "1985-05-10",
      "baptismDate": "1985-05-15",
      "parents": {
        "father": "Michael Doe",
        "mother": "Mary Doe"
      },
      "godparents": {
        "godfather": "Peter Smith",
        "godmother": "Helen Smith"
      },
      "priest": "Fr. Nicholas Papadopoulos",
      "church": "St. Nicholas Orthodox Church"
    },
    "reviewStatus": "pending",
    "createdAt": "2025-07-18T10:30:00Z",
    "completedAt": "2025-07-18T10:31:45Z"
  }
}
```

#### List OCR Sessions
```http
GET /api/ocr/sessions?status={status}&documentType={type}&page={page}&limit={limit}
Authorization: Bearer <token>
```

**Query Parameters:**
- `status`: "processing", "completed", "failed", "approved", "rejected"
- `documentType`: "baptism", "marriage", "funeral"
- `language`: "en", "el", "ru", "ro", "ka"
- `dateFrom`: ISO date string
- `dateTo`: ISO date string

#### Review and Approve OCR Results
```http
PUT /api/ocr/sessions/{sessionId}/review
Authorization: Bearer <token>
Content-Type: application/json

{
  "reviewStatus": "approved",
  "corrections": {
    "structuredData": {
      "baptizedName": "John Michael Doe Jr.",
      "baptismDate": "1985-05-16"
    }
  },
  "reviewNotes": "Corrected name suffix and date"
}
```

#### Delete OCR Session
```http
DELETE /api/ocr/sessions/{sessionId}
Authorization: Bearer <token>
```

### OCR Batch Operations

#### Bulk Upload
```http
POST /api/ocr/batch-upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

documents: <files[]>
documentType: "baptism"
language: "en"
batchName: "Baptism Records 1980-1990"
```

#### Batch Approval
```http
POST /api/ocr/batch-approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionIds": ["ocr_sess_001", "ocr_sess_002", "ocr_sess_003"],
  "reviewNotes": "Batch approved after verification"
}
```

## 📚 Records Management API

### Baptism Records

#### List Baptism Records
```http
GET /api/records/baptisms?churchId={churchId}&year={year}&page={page}&limit={limit}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "baptizedName": "John Michael Doe",
      "birthDate": "1985-05-10",
      "baptismDate": "1985-05-15",
      "parents": {
        "father": "Michael Doe",
        "mother": "Mary Doe"
      },
      "godparents": {
        "godfather": "Peter Smith",
        "godmother": "Helen Smith"
      },
      "priest": "Fr. Nicholas Papadopoulos",
      "church": "St. Nicholas Orthodox Church",
      "churchId": 1,
      "ocrSessionId": "ocr_sess_abc123",
      "verified": true,
      "createdAt": "2025-07-18T10:30:00Z"
    }
  ]
}
```

#### Create Baptism Record
```http
POST /api/records/baptisms
Authorization: Bearer <token>
Content-Type: application/json

{
  "baptizedName": "Maria Elena Papadopoulos",
  "birthDate": "2025-07-01",
  "baptismDate": "2025-07-15",
  "parents": {
    "father": "Dimitri Papadopoulos",
    "mother": "Elena Papadopoulos"
  },
  "godparents": {
    "godfather": "Constantine Stavros",
    "godmother": "Sophia Stavros"
  },
  "priest": "Fr. Michael Vlahos",
  "churchId": 1,
  "notes": "Adult baptism with chrismation"
}
```

#### Update Baptism Record
```http
PUT /api/records/baptisms/{recordId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "notes": "Updated: Adult baptism with chrismation, followed by first communion"
}
```

#### Get Baptism Record
```http
GET /api/records/baptisms/{recordId}
Authorization: Bearer <token>
```

#### Delete Baptism Record
```http
DELETE /api/records/baptisms/{recordId}
Authorization: Bearer <token>
```

### Marriage Records

#### List Marriage Records
```http
GET /api/records/marriages?churchId={churchId}&year={year}&page={page}&limit={limit}
Authorization: Bearer <token>
```

#### Create Marriage Record
```http
POST /api/records/marriages
Authorization: Bearer <token>
Content-Type: application/json

{
  "brideName": "Maria Stavros",
  "groomName": "Constantine Papadopoulos",
  "marriageDate": "2025-06-15",
  "ceremony": {
    "type": "orthodox_wedding",
    "location": "St. Nicholas Orthodox Church",
    "priest": "Fr. Nicholas Papadopoulos"
  },
  "witnesses": {
    "koumbaro": "Michael Stavros",
    "koumbara": "Elena Stavros"
  },
  "churchId": 1,
  "previousMarriages": {
    "bride": "none",
    "groom": "none"
  }
}
```

### Funeral Records

#### List Funeral Records
```http
GET /api/records/funerals?churchId={churchId}&year={year}&page={page}&limit={limit}
Authorization: Bearer <token>
```

#### Create Funeral Record
```http
POST /api/records/funerals
Authorization: Bearer <token>
Content-Type: application/json

{
  "deceasedName": "George Papadopoulos",
  "birthDate": "1935-03-15",
  "deathDate": "2025-07-10",
  "funeralDate": "2025-07-13",
  "cause": "Natural causes",
  "ceremony": {
    "type": "orthodox_funeral",
    "location": "St. Nicholas Orthodox Church",
    "priest": "Fr. Nicholas Papadopoulos"
  },
  "burial": {
    "cemetery": "Holy Cross Orthodox Cemetery",
    "plotNumber": "Section A, Row 5, Plot 12"
  },
  "survivors": {
    "spouse": "Maria Papadopoulos",
    "children": ["John Papadopoulos", "Helen Smith"],
    "grandchildren": 5
  },
  "churchId": 1
}
```

## 📊 Analytics and Reporting API

### Statistics Endpoints

#### Church Statistics
```http
GET /api/analytics/church-stats/{churchId}?year={year}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "2025",
    "sacraments": {
      "baptisms": 45,
      "marriages": 12,
      "funerals": 8
    },
    "membership": {
      "total": 350,
      "families": 125,
      "children": 95,
      "adults": 255
    },
    "trends": {
      "baptisms": {
        "current": 45,
        "previous": 38,
        "change": "+18.4%"
      }
    }
  }
}
```

#### OCR Processing Statistics
```http
GET /api/analytics/ocr-stats/{churchId}?period={period}
Authorization: Bearer <token>
```

#### Generate Report
```http
POST /api/analytics/reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "annual_sacraments",
  "churchId": 1,
  "year": 2025,
  "format": "pdf",
  "includeCharts": true
}
```

## 🔧 Administrative API

### System Health

#### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-07-18T10:30:00Z",
    "version": "1.0.0",
    "services": {
      "database": "connected",
      "redis": "connected",
      "googleVision": "available"
    },
    "performance": {
      "uptime": "5 days, 3 hours",
      "memory": "2.1GB/8GB",
      "diskSpace": "45% used"
    }
  }
}
```

#### System Configuration
```http
GET /api/admin/config
Authorization: Bearer <token>
```

#### Database Operations
```http
POST /api/admin/database/{operation}
Authorization: Bearer <token>
Content-Type: application/json

{
  "operation": "backup" | "optimize" | "validate",
  "options": {
    "includeData": true,
    "compression": "gzip"
  }
}
```

### Logs and Monitoring

#### Application Logs
```http
GET /api/admin/logs?level={level}&component={component}&limit={limit}
Authorization: Bearer <token>
```

#### Audit Trail
```http
GET /api/admin/audit?userId={userId}&action={action}&dateFrom={date}&dateTo={date}
Authorization: Bearer <token>
```

## 🌐 Public API Endpoints

### Orthodox Calendar

#### Get Orthodox Calendar Events
```http
GET /api/public/calendar/{year}/{month}?jurisdiction={jurisdiction}&calendar={type}
```

**Query Parameters:**
- `jurisdiction`: "goarch", "oca", "antiochian", "serbian", "romanian"
- `calendar`: "new", "old" (Gregorian vs Julian)

#### Get Saint of the Day
```http
GET /api/public/saints/today?jurisdiction={jurisdiction}&language={language}
```

### Church Directory

#### Public Church Information
```http
GET /api/public/churches/{churchId}
```

**Response (Public Information Only):**
```json
{
  "success": true,
  "data": {
    "name": "St. Nicholas Orthodox Church",
    "address": "123 Orthodox Way, City, State 12345",
    "phone": "+1-555-123-4567",
    "website": "https://stnicholasorthodox.org",
    "services": {
      "divine_liturgy": "Sunday 10:00 AM",
      "vespers": "Saturday 6:00 PM"
    },
    "jurisdiction": "Greek Orthodox Archdiocese",
    "patronSaint": "St. Nicholas the Wonderworker"
  }
}
```

## 📝 API Response Format

### Standard Response Structure

#### Success Response
```json
{
  "success": true,
  "data": { /* Response data */ },
  "meta": {
    "timestamp": "2025-07-18T10:30:00Z",
    "requestId": "req_abc123",
    "version": "1.0.0",
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  },
  "meta": {
    "timestamp": "2025-07-18T10:30:00Z",
    "requestId": "req_abc123",
    "version": "1.0.0"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|--------|
| 200 | OK | Successful GET, PUT requests |
| 201 | Created | Successful POST requests |
| 204 | No Content | Successful DELETE requests |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Public endpoints**: 100 requests per 15 minutes per IP
- **Authenticated endpoints**: 1000 requests per 15 minutes per user
- **Upload endpoints**: 50 requests per 15 minutes per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1626876900
```

## 🔗 API Client Examples

### JavaScript/Node.js Client
```javascript
class OrthodoxMetricsAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error.message);
    }
    return data.data;
  }

  async getBaptismRecords(churchId, filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/api/records/baptisms?churchId=${churchId}&${params}`);
  }

  async uploadOCRDocument(file, metadata) {
    const formData = new FormData();
    formData.append('document', file);
    Object.entries(metadata).forEach(([key, value]) => {
      formData.append(key, value);
    });

    return this.request('/api/ocr/upload', {
      method: 'POST',
      body: formData,
      headers: {} // Remove Content-Type to let browser set boundary
    });
  }
}

// Usage
const api = new OrthodoxMetricsAPI('https://api.orthodoxmetrics.org', 'your-token');
const records = await api.getBaptismRecords(1, { year: 2025 });
```

### Python Client
```python
import requests
import json

class OrthodoxMetricsAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    def request(self, endpoint, method='GET', data=None, files=None):
        url = f"{self.base_url}{endpoint}"
        headers = self.headers.copy()
        
        if files:
            headers.pop('Content-Type', None)  # Let requests set content-type for files
        
        response = requests.request(method, url, headers=headers, json=data, files=files)
        result = response.json()
        
        if not result['success']:
            raise Exception(result['error']['message'])
        
        return result['data']

    def get_baptism_records(self, church_id, **filters):
        params = '&'.join([f"{k}={v}" for k, v in filters.items()])
        return self.request(f"/api/records/baptisms?churchId={church_id}&{params}")

    def upload_ocr_document(self, file_path, document_type, language, church_id):
        with open(file_path, 'rb') as f:
            files = {'document': f}
            data = {
                'documentType': document_type,
                'language': language,
                'churchId': church_id
            }
            return self.request('/api/ocr/upload', method='POST', files=files)

# Usage
api = OrthodoxMetricsAPI('https://api.orthodoxmetrics.org', 'your-token')
records = api.get_baptism_records(1, year=2025)
```

---

This API reference provides comprehensive documentation for integrating with Orthodox Metrics. For implementation examples and troubleshooting, refer to the [Development Guide](DEVELOPMENT_GUIDE.md). 🏛️📡
