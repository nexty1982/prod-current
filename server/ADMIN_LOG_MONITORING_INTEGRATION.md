# Admin Log Monitoring Integration Guide

## Overview
This guide explains how to integrate the backend log monitoring system with Socket.IO real-time alerts into the Orthodox Metrics server.

## Components Created

### 1. Backend Services
- **`src/services/logMonitor.js`** - PM2 log streaming and categorization
- **`src/services/socketService.js`** - Socket.IO service for real-time alerts
- **`src/api/adminLogs.js`** - REST API endpoints for log management

### 2. Features
- Real-time error/warning detection from PM2 logs
- Socket.IO push notifications to admin clients
- Log archiving to dated files
- Buffer management with configurable limits

## Integration Steps

### Step 1: Install Socket.IO (if not already installed)
```bash
cd /var/www/orthodoxmetrics/prod/server
npm install socket.io
```

### Step 2: Update `src/index.ts`

Add the following imports near the top of the file (around line 90-100):

```typescript
const socketService = require('./services/socketService');
const logMonitor = require('./services/logMonitor');
const adminLogsRouter = require('./api/adminLogs');
```

### Step 3: Initialize Socket.IO

Find where the server is created (around line 374):
```typescript
const server = http.createServer(app);
```

After the CORS setup (around line 395), add Socket.IO initialization:
```typescript
// Initialize Socket.IO with CORS origins
socketService.initialize(server, allowedOrigins);
console.log('✅ [Server] Socket.IO initialized for admin log monitoring');
```

### Step 4: Mount Admin Logs API Routes

Find where admin routes are mounted (around line 570-590) and add:
```typescript
app.use('/api/admin/logs', adminLogsRouter);
console.log('✅ [Server] Mounted /api/admin/logs route');
```

### Step 5: Start Log Monitoring

After the server starts listening (around line 4637), add:
```typescript
// Start backend log monitoring
logMonitor.start('orthodox-backend');
console.log('🔍 [Server] Backend log monitoring started');
```

### Step 6: Create Logs Directory

Ensure the logs directory exists:
```bash
mkdir -p /var/www/orthodoxmetrics/prod/server/logs
chmod 755 /var/www/orthodoxmetrics/prod/server/logs
```

### Step 7: Rebuild and Restart

```bash
cd /var/www/orthodoxmetrics/prod/server
npm run build
pm2 restart orthodox-backend
```

## API Endpoints

### GET /api/admin/logs/stats
Returns current log monitoring statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 15,
    "errors": 10,
    "warnings": 5,
    "isMonitoring": true
  }
}
```

### GET /api/admin/logs/buffer
Returns current log buffer.

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "type": "error",
      "message": "Error connecting to database",
      "timestamp": "2026-02-06T21:00:00.000Z",
      "id": "1234567890-abc123"
    }
  ],
  "count": 1
}
```

### POST /api/admin/logs/archive
Archives current logs to file and clears buffer.

**Request Body:**
```json
{
  "logEntries": [] // Optional, uses buffer if not provided
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logs archived successfully",
  "archived": 15,
  "file": "adminhud-2026-02-06.log"
}
```

### POST /api/admin/logs/start
Starts log monitoring.

**Request Body:**
```json
{
  "appName": "orthodox-backend" // Optional, defaults to "orthodox-backend"
}
```

### POST /api/admin/logs/stop
Stops log monitoring.

## Socket.IO Events

### Client → Server

- **`request-buffer`** - Request current log buffer
- **`request-stats`** - Request current statistics

### Server → Client

- **`log-alert`** - New error/warning detected
  ```json
  {
    "type": "error",
    "message": "Error message",
    "timestamp": "2026-02-06T21:00:00.000Z",
    "id": "unique-id"
  }
  ```

- **`log-stats`** - Updated statistics
  ```json
  {
    "total": 15,
    "errors": 10,
    "warnings": 5,
    "isMonitoring": true
  }
  ```

- **`log-buffer`** - Current log buffer (array of log entries)

## Frontend Integration

The AdminFloatingHUD component will connect to the Socket.IO admin namespace:

```typescript
import { io } from 'socket.io-client';

const socket = io('/admin', {
  path: '/socket.io/',
  transports: ['websocket', 'polling']
});

socket.on('log-alert', (logEntry) => {
  // Handle new log alert
});

socket.on('log-stats', (stats) => {
  // Update stats display
});
```

## Log File Format

Archived logs are saved to: `/var/www/orthodoxmetrics/prod/server/logs/adminhud-YYYY-MM-DD.log`

Format:
```
[2026-02-06T21:00:00.000Z] ERROR: Error message here
[2026-02-06T21:01:00.000Z] WARNING: Warning message here
```

## Troubleshooting

### PM2 logs not streaming
- Verify PM2 app name: `pm2 list`
- Check PM2 logs manually: `pm2 logs orthodox-backend --lines 50`

### Socket.IO not connecting
- Check CORS configuration in `allowedOrigins`
- Verify Socket.IO is installed: `npm list socket.io`
- Check browser console for connection errors

### Logs not archiving
- Verify logs directory exists and is writable
- Check server logs for file system errors

## Configuration

### Buffer Size
Edit `src/services/logMonitor.js`:
```javascript
this.maxBufferSize = 500; // Change to desired size
```

### Log Patterns
Edit `src/services/logMonitor.js` in the `processLogData` method:
```javascript
const isError = /error|exception|fail|fatal|crash/i.test(line);
const isWarning = /warn|warning|deprecated/i.test(line);
```

Add more patterns as needed for your application.
