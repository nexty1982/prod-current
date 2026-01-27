# Components Management API

## Overview

The Components Management API provides endpoints for monitoring and controlling system components in the OrthodoxMetrics application. This system allows administrators to view component status, toggle components on/off, view logs, and run diagnostic tests.

## Manifest Generation

Component manifest is now generated via script. To update, run `npm run generate-manifest`.

## Authentication

All endpoints require authentication with `admin` or `super_admin` role.

## Endpoints

### 1. GET /api/admin/components

Retrieves all system components with their current status.

**Response:**
```json
[
  {
    "id": "authentication-service",
    "name": "Authentication Service",
    "description": "Handles user authentication, session management, and role-based access control",
    "enabled": true,
    "health": "healthy",
    "category": "security",
    "dependencies": ["database-connector", "session-manager"],
    "ports": [3001],
    "lastUpdated": "2025-01-29T10:30:00.000Z",
    "lastHealthCheck": "2025-01-29T12:45:00.000Z",
    "version": "2.1.4",
    "configPath": "/server/config/auth.js"
  }
]
```

### 2. PATCH /api/admin/components/:id

Toggles a component's enabled/disabled status.

**Request Body:**
```json
{
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Component 'Authentication Service' has been enabled",
  "component": { /* updated component object */ }
}
```

### 3. GET /api/admin/components/:id/logs

Retrieves logs for a specific component.

**Query Parameters:**
- `limit`: number (optional, default: 100, max: 1000) - Maximum number of log entries

**Response:**
```json
{
  "component": "Authentication Service",
  "total": 25,
  "logs": [
    {
      "id": "log_1",
      "level": "info",
      "message": "User authentication successful",
      "timestamp": "2025-01-29T12:45:00.000Z",
      "component": "authentication-service",
      "metadata": {
        "version": "2.1.4",
        "category": "security",
        "session_id": "sess_abc123"
      }
    }
  ]
}
```

### 4. POST /api/admin/components/:id/test

Runs diagnostic tests for a specific component.

**Response:**
```json
{
  "status": "pass",
  "details": "Completed 8 diagnostic tests for Authentication Service",
  "timestamp": "2025-01-29T12:45:00.000Z",
  "tests": [
    {
      "name": "Service Connectivity",
      "status": "pass",
      "duration": "156ms",
      "details": null,
      "error": null
    }
  ],
  "summary": {
    "total": 8,
    "passed": 6,
    "warnings": 1,
    "failed": 1
  },
  "health": "degraded",
  "component": { /* updated component object */ }
}
```

## Error Responses

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": "Error type",
  "details": "Detailed error message",
  "timestamp": "2025-01-29T12:45:00.000Z"
}
```

## Component Health States

- **healthy**: Component is functioning normally
- **degraded**: Component has issues but is still functional
- **failed**: Component has critical issues

## Component Categories

- **core**: Essential system components
- **security**: Authentication and authorization components
- **data**: Database and storage components
- **communication**: Notification and messaging components
- **processing**: OCR and document processing components
- **storage**: File and data storage components
- **maintenance**: Backup and maintenance components

## File Structure

```
server/
├── data/
│   └── componentManifest.json     # Component definitions
├── routes/admin/
│   └── components.js              # API routes
├── controllers/admin/
│   └── componentsController.js    # Business logic
└── services/
    └── componentsService.js       # Utility functions
```

## Future Enhancements

The system is designed to be extensible:

1. **Real System Integration**: Currently uses manifest-based simulation, can be extended to monitor actual system processes
2. **PM2 Integration**: Can connect to PM2 process manager for real process control
3. **Docker Integration**: Can monitor Docker container health
4. **Database Monitoring**: Can integrate with database health checks
5. **Custom Metrics**: Can add component-specific monitoring metrics

## Security

- All operations are logged with user and timestamp information
- Role-based access control enforced at route level
- Input validation on all endpoints
- Component state changes are audited