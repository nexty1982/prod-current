# OMAI Operators Manual
## Orthodox Metrics AI System - Complete User Guide
*Version 1.0 - Generated 2025-07-27*

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [User Interfaces](#user-interfaces)
4. [API Reference](#api-reference)
5. [Learning System](#learning-system)
6. [Administration](#administration)
7. [Troubleshooting](#troubleshooting)
8. [Security](#security)
9. [Maintenance](#maintenance)
10. [Quick Reference](#quick-reference)

---

## 🔍 System Overview

### What is OMAI?

OMAI (Orthodox Metrics AI) is the central intelligence system for the OrthodoxMetrics platform. It serves as the command center that provides AI-powered analysis, auto-fixing, and intelligent assistance across all components of your Orthodox church management system.

### Core Capabilities

🧠 **Intelligence Features:**
- AI-powered component analysis and auto-fixing
- Intelligent code generation and documentation
- Real-time system monitoring and diagnostics
- Multi-agent orchestration for complex tasks

🔧 **Agent Systems:**
- **Doc-Bot**: Automated documentation generation and validation
- **API Guardian**: API endpoint monitoring and validation
- **Schema Sentinel**: Database schema integrity checking
- **Refactor Agent**: Intelligent code improvement suggestions
- **Component Analyzer**: Frontend component health checks
- **Learning Engine**: Continuous knowledge ingestion and updates

📊 **Platform Integration:**
- Frontend component inspection and auto-repair
- Backend API route analysis
- Church records management optimization
- Multi-tenant system coordination
- BigBook knowledge system integration

---

## 🏗️ Architecture

### System Components

```
OMAI System Architecture
├── Core Services
│   ├── orchestrator.js          # Main coordination engine
│   ├── index.js                 # Service entry point
│   └── learningSources.js       # Learning configuration
├── Learning System
│   ├── fileWatcher.js          # Real-time file monitoring
│   └── memory/                 # Knowledge storage
├── Agent Systems
│   ├── omai-doc-bot            # Documentation agent
│   ├── omai-api-guardian       # API monitoring agent
│   ├── omai-schema-sentinel    # Database schema agent
│   └── omai-refactor          # Code improvement agent
└── Interfaces
    ├── Desktop UI              # OMAIDiscoveryPanel.tsx
    ├── Mobile UI               # OMAIDiscoveryPanelMobile.tsx
    └── API Routes              # /api/omai/*
```

### File Locations

- **Core System**: `/services/om-ai/`
- **API Routes**: `/server/routes/omai.js`
- **Frontend Components**: `/front-end/src/components/admin/`
- **Learning Sources**: Defined in `learningSources.js`
- **Logs**: `/server/logs/` and `/logs/omai/`

---

## 💻 User Interfaces

### Desktop Interface

**Access**: Navigate to Admin Panel → OMAI Discovery Panel

**Features:**
- System status overview
- Component health monitoring
- Learning status and controls
- Agent management
- Real-time diagnostics

**Key Actions:**
- **Refresh Learning**: Manually trigger knowledge update
- **View Logs**: Access system activity logs
- **Agent Controls**: Start/stop individual agents
- **Health Check**: Run comprehensive system diagnostics

### Mobile Interface (Samsung Fold6 Optimized)

**Access**: `/admin/omai/mobile` (Super Admins only)

**Features:**
- Vertical stack layout for mobile use
- Collapsible sections for better navigation
- Touch-optimized controls
- PWA support (Add to Home Screen)

**Priority Actions:**
1. 🔁 **Refresh Learning** - Immediate knowledge update
2. 📊 **Learning Status** - Current system statistics
3. 📂 **View Memory** - Knowledge base preview
4. 🧠 **Run Autofix** - Automatic problem resolution
5. 📥 **Upload Knowledge** - Add external knowledge files

**Mobile-Specific Features:**
- Speed Dial for quick actions
- Swipeable drawers for logs
- Progress indicators for long operations
- Offline capability via PWA

---

## 🔌 API Reference

### Core Endpoints

#### System Status
```http
GET /api/omai/status
```
Returns overall system health and statistics.

```http
GET /api/omai/health
```
Detailed health check of all components.

```http
GET /api/omai/stats
```
Performance metrics and usage statistics.

#### Learning System
```http
POST /api/omai/learn-now
```
Manually trigger learning refresh from all sources.

```http
GET /api/omai/learning-status
```
Current learning system status and progress.

```http
GET /api/omai/memory-preview
```
Preview of knowledge base contents.

#### Agent Management
```http
GET /api/omai/agents
```
List all available agents and their capabilities.

```http
POST /api/omai/agents/run-command
```
Execute specific agent command.

#### Content Operations
```http
POST /api/omai/ask
```
Ask OMAI a question and get AI-powered response.

```http
POST /api/omai/autofix
```
Request automatic fixing of identified issues.

```http
POST /api/omai/fix
```
Manual fix request for specific component.

```http
POST /api/omai/generate-module
```
Generate new code modules or components.

#### Control & Management
```http
POST /api/omai/control/start
POST /api/omai/control/stop
POST /api/omai/control/restart
```
Service lifecycle management.

```http
GET /api/omai/logs
```
Retrieve system logs and activity history.

```http
POST /api/omai/upload-knowledge
```
Upload external knowledge files for learning.

### API Response Formats

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "timestamp": "2025-07-27T10:30:00Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2025-07-27T10:30:00Z"
}
```

---

## 🎓 Learning System

### How OMAI Learns

OMAI continuously learns from your codebase by monitoring and processing files from configured sources:

#### Learning Sources Configuration

| Source | Type | Priority | Extensions | Description |
|--------|------|----------|------------|-------------|
| `/docs` | documentation | high | .md, .txt | Project documentation |
| `/front-end/src/components` | react-component | high | .tsx, .jsx, .ts, .js | React components |
| `/server` | code | high | .js, .ts, .sql | Backend code |
| `/scripts` | code | medium | .js, .ts, .sh, .ps1, .sql | Admin scripts |
| `/services` | code | high | .js, .ts, .json | Service layer |
| `/config` | json | medium | .json, .yaml, .yml | Configuration |
| `/bigbook` | json | high | .json, .md | BigBook knowledge |

#### Learning Triggers

1. **Manual Trigger**: Click "Refresh Learning" button or call `/api/omai/learn-now`
2. **File Watcher**: Automatic detection of file changes (optional)
3. **Scheduled**: Periodic learning updates (configurable)

#### Learning Process

1. **File Discovery**: Scan configured source directories
2. **Content Analysis**: Parse files by type (markdown, React, code, JSON)
3. **Knowledge Extraction**: Extract metadata, tags, and content
4. **Memory Ingestion**: Store in OMAI's knowledge base
5. **Index Update**: Update search and retrieval indices

### Managing Learning

#### Refresh Learning Manually
```bash
# Via API
curl -X POST http://localhost:3000/api/omai/learn-now

# Via UI
# Desktop: Admin Panel → OMAI → Refresh Learning
# Mobile: /admin/omai/mobile → Refresh Learning button
```

#### Monitor Learning Status
```bash
# Check learning progress
curl http://localhost:3000/api/omai/learning-status
```

#### Learning Statistics
- **Total Files Processed**: Count of successfully learned files
- **Files Skipped**: Files excluded by filters
- **Errors**: Files that couldn't be processed
- **Learning Time**: Duration of last learning cycle
- **Memory Cache Size**: Current knowledge base size

---

## ⚙️ Administration

### Super Admin Functions

Only users with `super_admin` role can access OMAI administration features.

#### Service Management

**Start OMAI Service:**
```bash
cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod
./scripts/start-omai-complete.sh
```

**Run Diagnostics:**
```bash
./scripts/omai-diagnostic.sh
```

**Manual Service Control:**
```bash
# Start individual components
pm2 start ecosystem.config.js --only omai-service

# Check status
pm2 status

# View logs
pm2 logs omai-service
```

#### Configuration Management

**Main Configuration Files:**
- `services/om-ai/learningSources.js` - Learning source definitions
- `services/om-ai/orchestrator.js` - Core orchestration settings
- `ecosystem.config.js` - PM2 process configuration

**Environment Variables:**
```bash
# Required for AI features
OPENAI_API_KEY=your_api_key_here

# Database connections
DB_HOST=localhost
DB_USER=your_db_user
DB_PASS=your_db_password

# OMAI specific
OMAI_LOG_LEVEL=info
OMAI_MEMORY_LIMIT=2048
```

#### Agent Management

**View Active Agents:**
```http
GET /api/omai/agents
```

**Agent Commands:**
- `detect` - Identify issues or patterns
- `recommend` - Suggest improvements
- `autofix` - Automatically fix problems
- `generate` - Create new content
- `report` - Generate analysis reports

#### Memory Management

**Clear Memory Cache:**
```http
DELETE /api/omai/memories/cache
```

**Export Knowledge Base:**
```http
GET /api/omai/memories?export=true
```

**Import Knowledge:**
```http
POST /api/omai/upload-knowledge
Content-Type: multipart/form-data
```

---

## 🔧 Troubleshooting

### Common Issues

#### OMAI Service Won't Start

**Symptoms:**
- Service status shows "unhealthy"
- API endpoints return 500 errors
- Frontend shows "OMAI Disconnected"

**Solutions:**
1. **Check Dependencies:**
   ```bash
   cd /services/om-ai
   npm install
   ```

2. **Verify Environment:**
   ```bash
   # Check required environment variables
   echo $OPENAI_API_KEY
   echo $DB_HOST
   ```

3. **Check Logs:**
   ```bash
   tail -f /server/logs/omai.log
   pm2 logs omai-service
   ```

4. **Restart Service:**
   ```bash
   pm2 restart omai-service
   ```

#### Learning System Not Working

**Symptoms:**
- "Refresh Learning" button shows errors
- Learning status shows 0 files processed
- Knowledge base appears empty

**Solutions:**
1. **Check File Permissions:**
   ```bash
   # Ensure OMAI can read source directories
   ls -la /docs /front-end/src/components /server
   ```

2. **Verify Learning Sources:**
   ```bash
   # Check if learning sources configuration is valid
   node -e "console.log(require('./services/om-ai/learningSources.js'))"
   ```

3. **Manual Learning Test:**
   ```bash
   curl -X POST http://localhost:3000/api/omai/learn-now
   ```

#### Mobile Interface Issues

**Symptoms:**
- Mobile UI not loading
- PWA features not working
- Touch interactions unresponsive

**Solutions:**
1. **Clear Browser Cache:**
   - Clear site data and reload
   - Unregister and re-register service worker

2. **Check PWA Requirements:**
   ```bash
   # Verify manifest and service worker files exist
   ls -la /front-end/public/manifest.json
   ls -la /front-end/public/sw.js
   ```

3. **Test Mobile Breakpoints:**
   - Use browser dev tools mobile simulation
   - Test on actual Samsung Fold6 device

### Diagnostic Commands

#### Quick Health Check
```bash
# Run comprehensive diagnostics
./scripts/omai-diagnostic.sh

# Check specific endpoints
curl http://localhost:3000/api/omai/health
curl http://localhost:3000/api/omai/stats
```

#### Log Analysis
```bash
# View recent OMAI logs
tail -100 /server/logs/omai.log

# Search for specific errors
grep -i "error" /server/logs/omai.log

# Check learning activity
grep -i "learning" /logs/omai/learning.log
```

#### Performance Monitoring
```bash
# Check memory usage
curl http://localhost:3000/api/omai/stats | jq '.memory'

# Monitor active agents
curl http://localhost:3000/api/omai/agents | jq '.agents[].status'
```

---

## 🔒 Security

### Access Control

#### Role Requirements
- **View OMAI Status**: Any authenticated user
- **Use OMAI Features**: Admin users
- **Modify OMAI Settings**: Super Admin only
- **Access Mobile Interface**: Super Admin only

#### API Security
- All OMAI endpoints require authentication
- Rate limiting applied to prevent abuse
- Sensitive operations logged for audit

#### Data Protection
- Knowledge base encrypted at rest
- API keys stored securely in environment variables
- Learning data filtered to exclude sensitive information

### Security Best Practices

1. **Regular Key Rotation:**
   ```bash
   # Update OpenAI API key periodically
   export OPENAI_API_KEY=new_key_here
   pm2 restart omai-service
   ```

2. **Access Monitoring:**
   ```bash
   # Review OMAI access logs
   grep "OMAI" /server/logs/access.log
   ```

3. **Sensitive Data Exclusion:**
   - Configure learning sources to exclude sensitive files
   - Use `.omaiignore` files to prevent learning from specific directories

---

## 🛠️ Maintenance

### Regular Maintenance Tasks

#### Daily
- Monitor system health via dashboard
- Check for any error alerts
- Review learning activity logs

#### Weekly
- **Refresh Learning Data:**
  ```bash
  curl -X POST http://localhost:3000/api/omai/learn-now
  ```

- **Clear Old Logs:**
  ```bash
  find /logs/omai -name "*.log" -mtime +7 -delete
  ```

- **Check Agent Performance:**
  ```bash
  curl http://localhost:3000/api/omai/agent-metrics
  ```

#### Monthly
- **Update Dependencies:**
  ```bash
  cd /services/om-ai
  npm update
  ```

- **Backup Knowledge Base:**
  ```bash
  curl "http://localhost:3000/api/omai/memories?export=true" > omai-backup-$(date +%Y%m%d).json
  ```

- **Performance Review:**
  - Analyze response times
  - Review agent success rates
  - Optimize learning sources if needed

### Backup and Recovery

#### Backup OMAI Data
```bash
# Backup script
#!/bin/bash
BACKUP_DIR="/backups/omai/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup knowledge base
curl "http://localhost:3000/api/omai/memories?export=true" > "$BACKUP_DIR/knowledge-base.json"

# Backup configuration
cp -r /services/om-ai/*.js "$BACKUP_DIR/"
cp /ecosystem.config.js "$BACKUP_DIR/"

# Backup logs
cp -r /logs/omai "$BACKUP_DIR/logs/"

echo "OMAI backup completed: $BACKUP_DIR"
```

#### Recovery Process
1. **Stop OMAI Service:**
   ```bash
   pm2 stop omai-service
   ```

2. **Restore Configuration:**
   ```bash
   cp backup/*.js /services/om-ai/
   ```

3. **Restore Knowledge Base:**
   ```bash
   curl -X POST -F "file=@knowledge-base.json" http://localhost:3000/api/omai/upload-knowledge
   ```

4. **Restart Service:**
   ```bash
   pm2 start omai-service
   ```

---

## ⚡ Quick Reference

### Essential Commands

| Action | Command/URL |
|--------|-------------|
| Check Status | `curl http://localhost:3000/api/omai/health` |
| Refresh Learning | `curl -X POST http://localhost:3000/api/omai/learn-now` |
| View Desktop UI | Admin Panel → OMAI Discovery Panel |
| View Mobile UI | `/admin/omai/mobile` |
| Start Service | `./scripts/start-omai-complete.sh` |
| Run Diagnostics | `./scripts/omai-diagnostic.sh` |
| View Logs | `pm2 logs omai-service` |
| Restart Service | `pm2 restart omai-service` |

### Emergency Contacts

| Issue Type | Action |
|------------|--------|
| Service Down | Run diagnostic script and check logs |
| Learning Errors | Verify file permissions and learning sources |
| API Errors | Check authentication and rate limits |
| Mobile Issues | Clear cache and test PWA features |
| Performance | Review memory usage and agent metrics |

### Configuration Files

| File | Purpose |
|------|---------|
| `services/om-ai/orchestrator.js` | Main service configuration |
| `services/om-ai/learningSources.js` | Learning source definitions |
| `server/routes/omai.js` | API endpoint definitions |
| `ecosystem.config.js` | PM2 process configuration |
| `front-end/public/manifest.json` | PWA configuration |

---

## 📞 Support

For additional support:
1. **Check Logs**: Always start with system logs
2. **Run Diagnostics**: Use the diagnostic script
3. **Review Documentation**: This manual and related docs
4. **Check Status Dashboard**: Monitor real-time system health

**Important Files for Troubleshooting:**
- `/server/logs/omai.log` - Main service logs
- `/logs/omai/learning.log` - Learning system activity
- `/server/logs/error.log` - Error tracking

---

*End of OMAI Operators Manual v1.0* 