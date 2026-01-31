# Frontend-Backend Connection Guide

This guide explains how the OrthodoxMetrics frontend connects to the backend and how to set up and troubleshoot the connection.

## Architecture Overview

```
┌─────────────────┐    HTTP Requests    ┌─────────────────┐
│   Frontend      │ ──────────────────► │    Backend      │
│   (Port 5174)   │                     │   (Port 3001)   │
└─────────────────┘                     └─────────────────┘
         │                                       │
         │ Proxy Configuration                   │
         │ /api → localhost:3001                │
         └───────────────────────────────────────┘
```

## Configuration Files

### 1. Frontend Configuration

**File: `front-end/vite.config.ts`**
- Configures Vite development server
- Sets up proxy for `/api` requests to backend
- Development server runs on port 5174

**File: `front-end/.env.development`**
- Environment variables for development
- `VITE_API_BASE_URL=http://localhost:3001`

**File: `front-end/src/config/api.config.ts`**
- Centralized API configuration
- Environment-aware settings
- Helper functions for URL building

**File: `front-end/src/api/utils/axiosInstance.ts`**
- Axios instance with interceptors
- Automatic `/api` prefix handling
- Error handling and logging

### 2. Backend Configuration

**File: `server/index.js`**
- Express server configuration
- Runs on port 3001
- CORS configuration for frontend
- Session middleware setup

## How the Connection Works

### Development Mode
1. **Frontend** runs on `http://localhost:5174`
2. **Backend** runs on `http://localhost:3001`
3. **Proxy** routes `/api/*` requests from frontend to backend
4. **Axios** instance uses `http://localhost:3001` as base URL

### Production Mode
1. **Frontend** builds to static files
2. **Backend** serves frontend files
3. **Same-origin** requests (no proxy needed)
4. **Axios** instance uses relative URLs

## Quick Start

### Option 1: Use the Setup Script
```bash
# Run the setup script
./setup-frontend-backend-connection.sh

# Test the connection
./test-frontend-backend-connection.sh

# Start both services
./start-orthodoxmetrics.sh
```

### Option 2: Manual Setup

1. **Start the Backend:**
   ```bash
   cd server
   npm install  # if not already done
   npm start
   ```

2. **Start the Frontend:**
   ```bash
   cd front-end
   npm install  # if not already done
   npm run dev
   ```

3. **Access the Application:**
   - Frontend: http://localhost:5174
   - Backend API: http://localhost:3001/api/health

## Troubleshooting

### Common Issues

#### 1. Frontend Can't Connect to Backend
**Symptoms:** API requests fail, CORS errors in browser console

**Solutions:**
- Ensure backend is running on port 3001
- Check if proxy is configured in `vite.config.ts`
- Verify CORS settings in backend
- Check browser console for specific error messages

#### 2. Backend Not Starting
**Symptoms:** "Port already in use" or other startup errors

**Solutions:**
- Check if port 3001 is already in use: `lsof -i :3001`
- Kill existing process: `kill -9 <PID>`
- Check backend logs for specific errors
- Ensure all dependencies are installed

#### 3. Frontend Build Issues
**Symptoms:** Build fails or dependencies missing

**Solutions:**
- Run `npm install --legacy-peer-deps` in front-end directory
- Set `NODE_OPTIONS="--max-old-space-size=4096"` for build
- Check for TypeScript errors
- Verify all dependencies are compatible

### Testing the Connection

#### 1. Health Check
```bash
# Test backend health endpoint
curl http://localhost:3001/api/health

# Expected response:
{
  "status": "ok",
  "user": null,
  "database": { "success": true }
}
```

#### 2. Frontend API Test
```javascript
// In browser console on frontend
fetch('/api/health')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

#### 3. Network Tab
- Open browser DevTools
- Go to Network tab
- Make a request from the frontend
- Verify `/api` requests are proxied to backend

## Environment Variables

### Frontend Environment Variables
```bash
# Development
VITE_API_BASE_URL=http://localhost:3001
VITE_APP_ENV=development
VITE_APP_VERSION=5.0.0

# Production
VITE_API_BASE_URL=
VITE_APP_ENV=production
```

### Backend Environment Variables
```bash
# Server configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# Database configuration
DB_HOST=localhost
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=orthodoxmetrics_db
```

## API Request Flow

1. **Frontend makes request** to `/api/users`
2. **Vite proxy intercepts** the request
3. **Proxy forwards** to `http://localhost:3001/api/users`
4. **Backend processes** the request
5. **Backend responds** with data
6. **Proxy returns** response to frontend

## Security Considerations

- **CORS** is configured to allow frontend origin
- **Session cookies** are used for authentication
- **Credentials** are included in requests (`withCredentials: true`)
- **HTTPS** should be used in production

## Performance Optimization

- **Proxy caching** in development
- **Request/response logging** for debugging
- **Error handling** with user-friendly messages
- **Loading states** for better UX

## Monitoring and Logging

### Frontend Logs
- Check browser console for API request logs
- Look for proxy configuration messages
- Monitor for CORS or network errors

### Backend Logs
- Check server console for request logs
- Monitor for database connection issues
- Look for authentication errors

### Network Monitoring
- Use browser DevTools Network tab
- Monitor request/response times
- Check for failed requests

## Support

If you encounter issues:

1. **Check the logs** in both frontend and backend
2. **Run the test script** to verify connectivity
3. **Verify configuration** files are correct
4. **Check for port conflicts** or firewall issues
5. **Ensure all dependencies** are installed correctly

For additional help, refer to the project documentation or create an issue in the repository. 