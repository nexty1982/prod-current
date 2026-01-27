# Orthodox Metrics API Endpoints Documentation

## Overview
Complete reference for all API endpoints in the Orthodox Metrics system, including authentication requirements, request/response formats, and examples.

---

## Authentication Endpoints

### POST /api/auth/login
Authenticate user with credentials.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "admin",
    "church_id": 1
  }
}
```

### POST /api/auth/logout
Logout current user session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /api/auth/me
Get current user information.

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "admin",
    "church_id": 1
  }
}
```

---

## OCR Endpoints

### POST /api/test-ocr
**Status:** Currently returning 404 - requires PM2 restart
Test OCR processing with mock response.

**Request:** `multipart/form-data`
- `file`: Image file (JPEG, PNG, TIFF, GIF, BMP, WebP, PDF)

**Response:**
```json
{
  "success": true,
  "jobId": "uuid-string",
  "text": "Extracted text content",
  "confidence": 0.95,
  "language": "en",
  "timestamp": "2025-07-08T00:00:00.000Z"
}
```

### POST /api/ocr-{language}
Process OCR for specific language (en, ru, ro, gr).

**Request:** `multipart/form-data`
- `file`: Image file
- `language`: Language code (optional, inferred from endpoint)

**Response:**
```json
{
  "success": true,
  "jobId": "uuid-string",
  "text": "Extracted text",
  "confidence": 0.95,
  "language": "en",
  "blocks": [...], // Detailed text blocks
  "timestamp": "2025-07-08T00:00:00.000Z"
}
```

### POST /api/public-ocr-{language}
Public OCR endpoint (requires upload token).

**Headers:**
- `Authorization`: `Bearer {upload-token}`

**Request:** `multipart/form-data`
- `file`: Image file

**Response:** Same as `/api/ocr-{language}`

### GET /api/ocr-status/{jobId}
Get OCR processing status.

**Response:**
```json
{
  "status": "completed|processing|failed",
  "jobId": "uuid-string",
  "result": {...}, // OCR result if completed
  "error": "Error message if failed"
}
```

### GET /api/ocr/result/{jobId}
Get OCR result by job ID.

**Response:**
```json
{
  "success": true,
  "jobId": "uuid-string",
  "text": "Extracted text",
  "confidence": 0.95,
  "language": "en",
  "blocks": [...],
  "timestamp": "2025-07-08T00:00:00.000Z"
}
```

---

## Upload Token Endpoints

### POST /api/generate-upload-token
Generate JWT token for public uploads.

**Authentication:** Required (admin/super_admin)

**Request:**
```json
{
  "expiresIn": "1h", // Optional, default 1 hour
  "permissions": ["ocr"] // Optional, default all
}
```

**Response:**
```json
{
  "token": "jwt-token-string",
  "expiresAt": "2025-07-08T01:00:00.000Z",
  "permissions": ["ocr"]
}
```

### POST /api/validate-upload-token
Validate upload token.

**Request:**
```json
{
  "token": "jwt-token-string"
}
```

**Response:**
```json
{
  "valid": true,
  "expiresAt": "2025-07-08T01:00:00.000Z",
  "permissions": ["ocr"]
}
```

---

## Admin Endpoints

### GET /api/admin/users
Get all users (admin only).

**Authentication:** Required (admin/super_admin)

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "role": "admin",
      "church_id": 1,
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /api/admin/users
Create new user (admin only).

**Authentication:** Required (admin/super_admin)

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "role": "user",
  "church_id": 1
}
```

### PUT /api/admin/users/{id}
Update user (admin only).

**Authentication:** Required (admin/super_admin)

**Request:**
```json
{
  "email": "updated@example.com",
  "role": "admin",
  "church_id": 1
}
```

### DELETE /api/admin/users/{id}
Delete user (admin only).

**Authentication:** Required (admin/super_admin)

---

## Notification Endpoints

### GET /api/notifications
Get user notifications.

**Authentication:** Required

**Query Parameters:**
- `limit`: Number of notifications (default: 50)
- `offset`: Pagination offset (default: 0)
- `read`: Filter by read status (true/false)

**Response:**
```json
{
  "notifications": [
    {
      "id": 1,
      "title": "New Message",
      "message": "You have a new message",
      "type": "info",
      "read": false,
      "created_at": "2025-07-08T00:00:00.000Z"
    }
  ],
  "total": 25,
  "unread": 5
}
```

### GET /api/notifications/counts
Get notification counts.

**Authentication:** Required

**Response:**
```json
{
  "total": 25,
  "unread": 5,
  "priority": 2
}
```

### PUT /api/notifications/{id}/read
Mark notification as read.

**Authentication:** Required

### POST /api/notifications
Create notification (admin only).

**Authentication:** Required (admin/super_admin)

**Request:**
```json
{
  "title": "System Maintenance",
  "message": "System will be down for maintenance",
  "type": "warning",
  "user_id": 1, // Optional, if null sends to all users
  "priority": "high"
}
```

---

## Kanban Endpoints

### GET /api/kanban/boards
Get all Kanban boards.

**Authentication:** Required

**Response:**
```json
{
  "boards": [
    {
      "id": 1,
      "name": "Project Board",
      "description": "Main project board",
      "created_at": "2025-07-08T00:00:00.000Z"
    }
  ]
}
```

### GET /api/kanban/boards/{id}/cards
Get cards for a board.

**Response:**
```json
{
  "cards": [
    {
      "id": 1,
      "title": "Task 1",
      "description": "Task description",
      "status": "todo",
      "priority": "high",
      "assigned_to": 1,
      "created_at": "2025-07-08T00:00:00.000Z"
    }
  ]
}
```

### POST /api/kanban/cards
Create new card.

**Request:**
```json
{
  "board_id": 1,
  "title": "New Task",
  "description": "Task description",
  "status": "todo",
  "priority": "medium",
  "assigned_to": 1
}
```

### PUT /api/kanban/cards/{id}
Update card.

### DELETE /api/kanban/cards/{id}
Delete card.

---

## Records Endpoints

### Baptism Records

#### GET /api/baptism-records
Get baptism records with pagination and filtering.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 10)
- `search`: Search term
- `church_id`: Filter by church

**Response:**
```json
{
  "records": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "baptism_date": "2025-01-01",
      "church_id": 1,
      "created_at": "2025-07-08T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

#### POST /api/baptism-records
Create baptism record.

#### PUT /api/baptism-records/{id}
Update baptism record.

#### DELETE /api/baptism-records/{id}
Delete baptism record.

### Marriage Records

#### GET /api/marriage-records
Get marriage records (similar structure to baptism).

#### POST /api/marriage-records
Create marriage record.

#### PUT /api/marriage-records/{id}
Update marriage record.

#### DELETE /api/marriage-records/{id}
Delete marriage record.

### Funeral Records

#### GET /api/funeral-records
Get funeral records (similar structure to baptism).

#### POST /api/funeral-records
Create funeral record.

#### PUT /api/funeral-records/{id}
Update funeral record.

#### DELETE /api/funeral-records/{id}
Delete funeral record.

---

## Certificate Endpoints

### GET /api/certificates/baptism/{id}
Generate baptism certificate PDF.

**Response:** PDF file download

### GET /api/certificates/marriage/{id}
Generate marriage certificate PDF.

### GET /api/certificates/funeral/{id}
Generate funeral certificate PDF.

---

## Calendar Endpoints

### GET /api/calendar/events
Get calendar events.

**Query Parameters:**
- `start`: Start date (ISO string)
- `end`: End date (ISO string)
- `church_id`: Filter by church

**Response:**
```json
{
  "events": [
    {
      "id": 1,
      "title": "Sunday Service",
      "start": "2025-07-08T10:00:00.000Z",
      "end": "2025-07-08T12:00:00.000Z",
      "description": "Weekly service",
      "church_id": 1
    }
  ]
}
```

### POST /api/calendar/events
Create calendar event.

### PUT /api/calendar/events/{id}
Update calendar event.

### DELETE /api/calendar/events/{id}
Delete calendar event.

---

## Dashboard Endpoints

### GET /api/dashboard/stats
Get dashboard statistics.

**Response:**
```json
{
  "stats": {
    "total_members": 150,
    "recent_baptisms": 5,
    "recent_marriages": 2,
    "upcoming_events": 3,
    "active_users": 12
  }
}
```

### GET /api/dashboard/recent-activity
Get recent activity feed.

**Response:**
```json
{
  "activities": [
    {
      "id": 1,
      "type": "baptism_created",
      "description": "New baptism record created",
      "user_id": 1,
      "timestamp": "2025-07-08T00:00:00.000Z"
    }
  ]
}
```

---

## Invoice Endpoints

### GET /api/invoices
Get invoices with pagination.

**Response:**
```json
{
  "invoices": [
    {
      "id": 1,
      "invoice_number": "INV-001",
      "amount": 100.00,
      "status": "pending",
      "due_date": "2025-07-15",
      "created_at": "2025-07-08T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50
  }
}
```

### POST /api/invoices
Create invoice.

### PUT /api/invoices/{id}
Update invoice.

### DELETE /api/invoices/{id}
Delete invoice.

---

## Church Management Endpoints

### GET /api/churches
Get all churches.

**Response:**
```json
{
  "churches": [
    {
      "id": 1,
      "name": "St. Mary Orthodox Church",
      "address": "123 Main St",
      "city": "Springfield",
      "phone": "555-0123",
      "email": "info@stmary.org"
    }
  ]
}
```

### POST /api/churches
Create church (admin only).

### PUT /api/churches/{id}
Update church (admin only).

### DELETE /api/churches/{id}
Delete church (admin only).

---

## Debug Endpoints

### GET /api/test
Basic API connectivity test.

**Response:**
```json
{
  "message": "API test route working"
}
```

### POST /api/debug-ocr
OCR debug endpoint for testing file uploads.

**Request:** `multipart/form-data`
- `file`: Any file

**Response:**
```json
{
  "message": "OCR Debug endpoint working",
  "hasFile": true,
  "hasFiles": false,
  "contentType": "multipart/form-data; boundary=..."
}
```

### GET /api/debug/routes
List all registered API routes.

**Response:**
```json
{
  "routes": [
    "/api/auth/login",
    "/api/auth/logout",
    "/api/test-ocr",
    "..."
  ]
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "specific error details"
  }
}
```

### Common HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Validation Error
- `500`: Internal Server Error

### Authentication Errors
```json
{
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

### Validation Errors
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": "Email is required",
    "password": "Password must be at least 8 characters"
  }
}
```

---

## Rate Limiting

### Upload Endpoints
- **File Size Limit**: 20MB per file
- **File Type Limit**: Images and PDFs only
- **Concurrent Uploads**: 5 per user

### API Rate Limits
- **General API**: 1000 requests per hour per user
- **OCR Endpoints**: 100 requests per hour per user
- **Public Endpoints**: 50 requests per hour per IP

---

## File Upload Guidelines

### Supported File Types
- **Images**: JPEG, PNG, TIFF, GIF, BMP, WebP
- **Documents**: PDF

### File Size Limits
- **Maximum Size**: 20MB per file
- **Recommended Size**: Under 5MB for optimal processing

### Security Measures
- File type validation
- Virus scanning (if configured)
- Temporary file cleanup
- Secure file storage

---

## Webhook Endpoints

### POST /api/webhooks/payment
Handle payment webhook notifications.

### POST /api/webhooks/email
Handle email delivery notifications.

---

Last Updated: July 8, 2025
Version: 1.0.0
