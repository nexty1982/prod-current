# OMAI Service Setup and Troubleshooting Guide

## Overview

OMAI (Orthodox Metrics AI) is the command center AI system for your OrthodoxMetrics platform. This guide provides everything you need to get OMAI fully functional and connected to both frontend and backend.

## 🎯 Current Status

Based on your requirements:
- **Goal**: Get OMAI service fully functional and connected to web frontend and backend
- **Environment**: Linux drive mapped to Windows (requires manual service management)
- **Focus**: Complete frontend-backend integration

## 🔧 Scripts Created

I've created two comprehensive scripts to help you:

### 1. `scripts/start-omai-complete.sh` - Complete OMAI Startup
**Purpose**: Full OMAI service initialization and startup
**Features**:
- Pre-flight checks for all required files and directories
- Initializes OMAI memory and embeddings systems
- Manages PM2 processes properly
- Creates necessary log directories
- Tests API endpoints after startup
- Provides comprehensive status reporting

### 2. `scripts/omai-diagnostic.sh` - OMAI Service Diagnostics  
**Purpose**: Comprehensive health check and troubleshooting
**Features**:
- File system verification
- Process status checking
- API endpoint testing
- Frontend integration verification
- Log analysis
- Configuration validation
- Network connectivity tests

## 🚀 Getting Started

### Step 1: Start OMAI Service
Since you're on a Linux mapped drive [[memory:4369141]], run this in your Linux environment:

```bash
# Navigate to your project root
cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod

# Run the complete startup script
./scripts/start-omai-complete.sh
```

### Step 2: Verify Everything is Working
```bash
# Run diagnostics to check everything
./scripts/omai-diagnostic.sh
```

## 🏗️ OMAI Architecture

### Backend Components
- **Main Service**: `services/om-ai/` (TypeScript core)
- **Background Service**: `server/services/omaiBackgroundService.js` (PM2 managed)
- **API Routes**: `server/routes/omai.js` (REST endpoints)
- **Orchestrator**: `services/om-ai/orchestrator.ts` (Agent management)

### Frontend Integration Points
- **AI Lab**: `front-end/src/pages/sandbox/ai-lab.tsx`
- **Component Inspector**: `front-end/src/components/ComponentInspector.tsx`
- **Editor Bridge**: `front-end/src/services/om-ai/editorBridge.ts`
- **Auto-fix Engine**: `front-end/src/ai/autoFixEngine.ts`
- **Service Management**: `front-end/src/views/settings/ServiceManagement.tsx`

### Key API Endpoints
- `GET /api/omai/health` - Service health check
- `GET /api/omai/stats` - System statistics
- `POST /api/omai/ask` - Main AI query endpoint
- `POST /api/omai/autofix` - Auto-fix system
- `POST /api/omai/control/start` - Start OMAI service
- `POST /api/omai/control/stop` - Stop OMAI service

## 🧪 Testing Frontend-Backend Connection

### 1. AI Lab Testing
1. Open frontend in browser
2. Navigate to **Sandbox → AI Lab**
3. Enter a test query: "What is OMAI?"
4. Click "Run Query"
5. Should receive AI response with context

### 2. Component Inspector Testing
1. Open any React component in the frontend
2. Use the Component Inspector
3. Click "OMAI Fix" button
4. Should receive AI-powered component analysis

### 3. Service Management Dashboard
1. Go to **Settings → Service Management**
2. Check OMAI service status
3. Use start/stop/restart controls
4. Monitor service health indicators

## 🔍 Troubleshooting

### Common Issues

#### 1. OMAI Service Won't Start
**Symptoms**: PM2 shows service as "errored" or "stopped"
**Solutions**:
```bash
# Check logs
pm2 logs omai-background

# Restart the service
pm2 restart omai-background

# Delete and recreate if needed
pm2 delete omai-background
./scripts/start-omai-complete.sh
```

#### 2. Frontend Can't Connect to OMAI
**Symptoms**: AI Lab shows "OMAI not available" or timeouts
**Solutions**:
```bash
# Verify backend is running
pm2 list
curl http://localhost:3000/api/omai/health

# Check if main backend is running
pm2 restart orthodox-backend
```

#### 3. Missing Memory/Embeddings Files
**Symptoms**: OMAI starts but can't provide context
**Solutions**:
The startup script automatically creates these files, but you can manually create:
```bash
mkdir -p services/om-ai/memory services/om-ai/embeddings
echo '{"memories": [], "metadata": {"created": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'", "version": "1.0"}}' > services/om-ai/memory/om-memory.json
echo '{"embeddings": [], "metadata": {"created": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'", "version": "1.0"}}' > services/om-ai/embeddings/embeddings.json
```

#### 4. Import/Module Errors
**Symptoms**: Service fails to start with import errors
**Solutions**:
```bash
# Ensure TypeScript files are compiled
cd services/om-ai
npm run build  # if build script exists

# Check for missing dependencies
npm install
```

## 📊 Monitoring and Maintenance

### Real-time Monitoring
```bash
# Monitor all PM2 processes
pm2 monit

# View live logs
pm2 logs omai-background --lines 50

# Check system resources
pm2 show omai-background
```

### Log Locations
- **Combined logs**: `logs/omai-combined.log`
- **Error logs**: `logs/omai-err.log`
- **Output logs**: `logs/omai-out.log`
- **OMAI-specific**: `logs/omai/`

### Health Checks
```bash
# Quick health check
curl http://localhost:3000/api/omai/health

# Detailed system stats
curl http://localhost:3000/api/omai/stats

# Test AI functionality
curl -X POST http://localhost:3000/api/omai/ask \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "test query"}'
```

## 🔧 Manual Service Management

Since you prefer to manage services manually [[memory:4054093]], here are the key commands:

### Start Services
```bash
# Start main backend (if not running)
pm2 start server/index.js --name orthodox-backend

# Start OMAI background service
pm2 start server/services/omaiBackgroundService.js --name omai-background
```

### Stop Services
```bash
pm2 stop omai-background
pm2 stop orthodox-backend
```

### Restart Services
```bash
pm2 restart omai-background
pm2 restart orthodox-backend
```

## 🎨 Frontend Development Notes

When working with OMAI frontend components:

1. **AI Lab** (`ai-lab.tsx`) - Direct OMAI interaction for testing
2. **Component Inspector** - OMAI-powered component analysis
3. **Auto-fix Engine** - Autonomous debugging system
4. **Editor Bridge** - OMAI integration for live editing

### Frontend Build Requirements
Remember to use these flags when building the frontend [[memory:4010572]]:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
npm install --legacy-peer-deps
```

## 📝 Next Steps

After running the startup script:

1. **Verify Core Functionality**:
   - Test AI Lab with simple queries
   - Check Component Inspector integration
   - Verify Service Management dashboard

2. **Test Advanced Features**:
   - Auto-fix system
   - Agent dialogue system
   - Context retrieval and embeddings

3. **Monitor Performance**:
   - Check response times
   - Monitor memory usage
   - Review log files for errors

4. **Integration Testing**:
   - Test BigBook synchronization
   - Verify church data access
   - Test multi-tenant functionality

## 🆘 Support

If you encounter issues:

1. Run the diagnostic script: `./scripts/omai-diagnostic.sh`
2. Check PM2 logs: `pm2 logs omai-background`
3. Verify API endpoints are responding
4. Check frontend console for JavaScript errors
5. Review the setup guide for missed steps

The OMAI service is designed to be the central intelligence system for your platform, providing AI-powered insights, auto-fixing, and intelligent assistance across all components. 