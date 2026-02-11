# Orthodox Church Management System - API Documentation

## 📚 Complete API Reference

This document provides comprehensive documentation for all API endpoints in the Orthodox Church Management System.

---

## 🔐 **Authentication APIs**

### Base URL: `/api/auth`

#### POST `/api/auth/login`
**Description**: Authenticate user and create session  
**Method**: POST  
**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin",
    "church_id": 1
  }
}
```

**Response (401)**:
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

#### POST `/api/auth/logout`
**Description**: End user session  
**Method**: POST  
**Response (200)**:
```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### PUT `/api/auth/change-password`
**Description**: Change user password  
**Method**: PUT  
**Authentication**: Required  
**Request Body**:
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

#### POST `/api/auth/register`
**Description**: Register new user (admin only)  
**Method**: POST  
**Authentication**: Required (Admin)  
**Request Body**:
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User",
  "role": "user",
  "church_id": 1
}
```

---

## 👥 **User Management APIs**

### Base URL: `/api/admin`

#### GET `/api/admin/users`
**Description**: Get all users  
**Method**: GET  
**Authentication**: Required (Admin)  
**Query Parameters**:
- `page` (optional): Page number
- `limit` (optional): Items per page
- `role` (optional): Filter by role
- `church_id` (optional): Filter by church

**Response (200)**:
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "admin",
      "church_id": 1,
      "church_name": "St. Mary's Orthodox Church",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "last_login": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

#### POST `/api/admin/users`
**Description**: Create new user  
**Method**: POST  
**Authentication**: Required (Admin)  
**Request Body**:
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "role": "user",
  "church_id": 1,
  "password": "temporarypassword"
}
```

#### PUT `/api/admin/users/:id`
**Description**: Update user information  
**Method**: PUT  
**Authentication**: Required (Admin)  
**Request Body**:
```json
{
  "name": "Updated Name",
  "role": "admin",
  "church_id": 2
}
```

#### PUT `/api/admin/users/:id/toggle-status`
**Description**: Toggle user active status  
**Method**: PUT  
**Authentication**: Required (Admin)  
**Response (200)**:
```json
{
  "success": true,
  "message": "User status updated successfully",
  "user": {
    "id": 1,
    "is_active": false
  }
}
```

#### DELETE `/api/admin/users/:id`
**Description**: Delete user  
**Method**: DELETE  
**Authentication**: Required (Admin)  
**Response (200)**:
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## 🏛️ **Church Management APIs**

### Base URL: `/api/churches`

#### GET `/api/churches`
**Description**: Get all churches  
**Method**: GET  
**Authentication**: Required  
**Response (200)**:
```json
{
  "success": true,
  "churches": [
    {
      "id": 1,
      "name": "St. Mary's Orthodox Church",
      "address": "123 Church St",
      "city": "New York",
      "state": "NY",
      "zip": "10001",
      "phone": "(555) 123-4567",
      "email": "info@stmarys.org",
      "website": "https://stmarys.org",
      "pastor": "Father John Smith",
      "language": "English",
      "timezone": "America/New_York",
      "is_active": true
    }
  ]
}
```

#### POST `/api/churches`
**Description**: Create new church  
**Method**: POST  
**Authentication**: Required (Super Admin)  
**Request Body**:
```json
{
  "name": "New Orthodox Church",
  "address": "456 Faith Ave",
  "city": "Boston",
  "state": "MA",
  "zip": "02101",
  "phone": "(555) 987-6543",
  "email": "info@newchurch.org",
  "pastor": "Father Peter Jones",
  "language": "Greek"
}
```

#### PUT `/api/churches/:id`
**Description**: Update church information  
**Method**: PUT  
**Authentication**: Required (Super Admin)

#### DELETE `/api/churches/:id`
**Description**: Delete church  
**Method**: DELETE  
**Authentication**: Required (Super Admin)

---

## 📝 **Notes APIs**

### Base URL: `/api/notes`

#### GET `/api/notes`
**Description**: Get user's notes  
**Method**: GET  
**Authentication**: Required  
**Query Parameters**:
- `category` (optional): Filter by category
- `pinned` (optional): Filter pinned notes
- `search` (optional): Search in title/content

**Response (200)**:
```json
{
  "success": true,
  "notes": [
    {
      "id": 1,
      "title": "Meeting Notes",
      "content": "Discussion about upcoming events...",
      "category": "meetings",
      "color": "blue",
      "is_pinned": true,
      "is_archived": false,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### POST `/api/notes`
**Description**: Create new note  
**Method**: POST  
**Authentication**: Required  
**Request Body**:
```json
{
  "title": "New Note",
  "content": "Note content here...",
  "category": "general",
  "color": "yellow"
}
```

#### PUT `/api/notes/:id`
**Description**: Update note  
**Method**: PUT  
**Authentication**: Required

#### DELETE `/api/notes/:id`
**Description**: Delete note  
**Method**: DELETE  
**Authentication**: Required

---

## 🔔 **Notifications APIs**

### Base URL: `/api/notifications`

#### GET `/api/notifications`
**Description**: Get user notifications  
**Method**: GET  
**Authentication**: Required  
**Query Parameters**:
- `unread` (optional): Filter unread notifications
- `type` (optional): Filter by notification type

**Response (200)**:
```json
{
  "success": true,
  "notifications": [
    {
      "id": 1,
      "title": "Welcome to Orthodox Metrics",
      "message": "Thank you for joining our system.",
      "type": "info",
      "is_read": false,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST `/api/notifications`
**Description**: Create notification (admin only)  
**Method**: POST  
**Authentication**: Required (Admin)  
**Request Body**:
```json
{
  "title": "System Maintenance",
  "message": "Scheduled maintenance at 2 AM",
  "type": "warning",
  "user_id": 1
}
```

#### PUT `/api/notifications/:id/read`
**Description**: Mark notification as read  
**Method**: PUT  
**Authentication**: Required

#### DELETE `/api/notifications/:id`
**Description**: Delete notification  
**Method**: DELETE  
**Authentication**: Required

---

## 📜 **Orthodox Church Records APIs**

### Baptism Records - Base URL: `/api/baptism-records`

#### GET `/api/baptism-records`
**Description**: Get baptism records  
**Method**: GET  
**Authentication**: Required  
**Response (200)**:
```json
{
  "success": true,
  "records": [
    {
      "id": 1,
      "person_name": "John Michael Smith",
      "baptism_date": "2024-01-15",
      "priest_name": "Father Peter Jones",
      "godparent_names": "Mary Smith, James Smith",
      "church_id": 1,
      "certificate_number": "BAPT-2024-001",
      "notes": "Infant baptism",
      "created_at": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

#### POST `/api/baptism-records`
**Description**: Create baptism record  
**Method**: POST  
**Authentication**: Required (Priest/Admin)  
**Request Body**:
```json
{
  "person_name": "John Michael Smith",
  "baptism_date": "2024-01-15",
  "priest_name": "Father Peter Jones",
  "godparent_names": "Mary Smith, James Smith",
  "birth_date": "2023-12-01",
  "birth_place": "New York, NY",
  "parents_names": "Michael Smith, Sarah Smith"
}
```

### Marriage Records - Base URL: `/api/marriage-records`

#### GET `/api/marriage-records`
**Description**: Get marriage records  
**Method**: GET  
**Authentication**: Required

#### POST `/api/marriage-records`
**Description**: Create marriage record  
**Method**: POST  
**Authentication**: Required (Priest/Admin)  
**Request Body**:
```json
{
  "groom_name": "John Smith",
  "bride_name": "Jane Doe",
  "marriage_date": "2024-06-15",
  "priest_name": "Father Peter Jones",
  "witness1_name": "Best Man",
  "witness2_name": "Maid of Honor",
  "certificate_number": "MARR-2024-001"
}
```

### Funeral Records - Base URL: `/api/funeral-records`

#### GET `/api/funeral-records`
**Description**: Get funeral records  
**Method**: GET  
**Authentication**: Required

#### POST `/api/funeral-records`
**Description**: Create funeral record  
**Method**: POST  
**Authentication**: Required (Priest/Admin)  
**Request Body**:
```json
{
  "deceased_name": "John Smith",
  "death_date": "2024-01-10",
  "funeral_date": "2024-01-15",
  "priest_name": "Father Peter Jones",
  "burial_place": "Orthodox Cemetery",
  "age_at_death": 75
}
```

---

## 📊 **Dashboard APIs**

### Base URL: `/api/dashboard`

#### GET `/api/dashboard/stats`
**Description**: Get dashboard statistics  
**Method**: GET  
**Authentication**: Required  
**Response (200)**:
```json
{
  "success": true,
  "stats": {
    "total_users": 150,
    "total_churches": 25,
    "recent_baptisms": 12,
    "recent_marriages": 5,
    "recent_funerals": 3,
    "pending_notifications": 8,
    "system_health": "good"
  }
}
```

---

## 📋 **Invoice APIs**

### Base URL: `/api/invoices`

#### GET `/api/invoices`
**Description**: Get invoices  
**Method**: GET  
**Authentication**: Required  
**Response (200)**:
```json
{
  "success": true,
  "invoices": [
    {
      "id": 1,
      "invoice_number": "INV-2024-001",
      "client_name": "John Smith",
      "amount": 500.00,
      "status": "paid",
      "due_date": "2024-02-01",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST `/api/invoices`
**Description**: Create new invoice  
**Method**: POST  
**Authentication**: Required (Admin)

---

## 📅 **Calendar APIs**

### Base URL: `/api/calendar`

#### GET `/api/calendar/events`
**Description**: Get calendar events  
**Method**: GET  
**Authentication**: Required  
**Query Parameters**:
- `start` (optional): Start date filter
- `end` (optional): End date filter
- `type` (optional): Event type filter

**Response (200)**:
```json
{
  "success": true,
  "events": [
    {
      "id": 1,
      "title": "Divine Liturgy",
      "description": "Sunday morning service",
      "start_date": "2024-01-21T09:00:00.000Z",
      "end_date": "2024-01-21T11:00:00.000Z",
      "type": "liturgy",
      "church_id": 1,
      "is_recurring": true
    }
  ]
}
```

---

## 🗂️ **Kanban APIs**

### Base URL: `/api/kanban`

#### GET `/api/kanban/boards`
**Description**: Get kanban boards  
**Method**: GET  
**Authentication**: Required

#### POST `/api/kanban/cards`
**Description**: Create kanban card  
**Method**: POST  
**Authentication**: Required

---

## 🔍 **OCR APIs**

### Base URL: `/api/ocr`

#### POST `/api/ocr/upload`
**Description**: Upload document for OCR processing  
**Method**: POST  
**Authentication**: Required  
**Content-Type**: multipart/form-data

#### GET `/api/ocr/sessions`
**Description**: Get OCR processing sessions  
**Method**: GET  
**Authentication**: Required

---

## 📊 **Logs APIs**

### Base URL: `/api/logs`

#### GET `/api/logs`
**Description**: Get system logs  
**Method**: GET  
**Authentication**: Required (Admin)  
**Query Parameters**:
- `level` (optional): Log level filter
- `component` (optional): Component filter
- `start_date` (optional): Start date filter
- `end_date` (optional): End date filter

---

## ⚙️ **Menu Management APIs**

### Base URL: `/api/menu-management`

#### GET `/api/menu-management/permissions`
**Description**: Get menu permissions (Super Admin only)  
**Method**: GET  
**Authentication**: Required (Super Admin)

#### PUT `/api/menu-management/permissions`
**Description**: Update menu permissions (Super Admin only)  
**Method**: PUT  
**Authentication**: Required (Super Admin)

#### GET `/api/menu-management/current-user`
**Description**: Get menu items for current user  
**Method**: GET  
**Authentication**: Required

---

## 🛒 **E-commerce APIs**

### Base URL: `/api/ecommerce`

#### GET `/api/ecommerce/products`
**Description**: Get products  
**Method**: GET  
**Authentication**: Required

#### POST `/api/ecommerce/products`
**Description**: Create product  
**Method**: POST  
**Authentication**: Required (Admin)

---

## 💳 **Billing APIs**

### Base URL: `/api/billing`

#### GET `/api/billing`
**Description**: Get billing information  
**Method**: GET  
**Authentication**: Required

---

## 🔧 **Debug APIs**

### Base URL: `/api/debug`

#### GET `/api/debug/session`
**Description**: Get current session information  
**Method**: GET  
**Authentication**: Required  
**Response (200)**:
```json
{
  "success": true,
  "session": {
    "id": "sess_abc123",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "admin"
    },
    "authenticated": true,
    "expires": "2024-01-22T00:00:00.000Z"
  }
}
```

---

## 🔒 **Authentication & Security**

### Session Management
- All authenticated endpoints require valid session cookie
- Sessions expire after 24 hours of inactivity
- Session data stored securely in MySQL database

### Role-Based Access Control
- **super_admin**: Full system access
- **admin**: User and church management
- **priest**: Orthodox records management
- **deacon**: Limited record access
- **user**: Basic features only

### Error Responses
All endpoints return consistent error format:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

### Common HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **500**: Internal Server Error

---

## 📝 **Request/Response Standards**

### Headers
- **Content-Type**: application/json
- **Cookie**: Session cookie for authentication
- **X-Requested-With**: XMLHttpRequest (for CSRF protection)

### Date Formats
- All dates in ISO 8601 format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Date-only fields in format: `YYYY-MM-DD`

### Pagination
Standard pagination format for list endpoints:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

## 🧪 **Testing**

### Using cURL
```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  -c cookies.txt

# Get users (using saved session)
curl -X GET http://localhost:3001/api/admin/users \
  -b cookies.txt
```

### Using the Testing Script
```bash
# Run comprehensive API tests
node z:\scripts\comprehensive-test.js
```

This API documentation covers all implemented endpoints in the Orthodox Church Management System. For detailed implementation examples, refer to the test scripts and frontend code.