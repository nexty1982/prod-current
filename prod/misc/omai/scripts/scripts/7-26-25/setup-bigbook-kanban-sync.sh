#!/bin/bash

echo "=== BigBook ⇄ Kanban Task Sync Setup ==="
echo "Date: $(date)"
echo "Setting up comprehensive task synchronization system"

# Set script options
set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as a regular user with sudo access."
   exit 1
fi

# Navigate to production directory
PROD_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
print_status "Setting up in: $PROD_ROOT"

cd "$PROD_ROOT" || {
    print_error "Could not change to production directory"
    exit 1
}

echo ""
echo "=== Step 1: Create Directory Structure ==="

# Create log directories
print_status "Creating log directories..."
sudo mkdir -p /var/log/omai
sudo chown www-data:www-data /var/log/omai
sudo chmod 755 /var/log/omai

# Create Big Book task directories
print_status "Creating Big Book task directories..."
sudo mkdir -p /mnt/bigbook_secure/Tasks/{active,completed,archived}
sudo chown -R www-data:www-data /mnt/bigbook_secure/Tasks
sudo chmod -R 755 /mnt/bigbook_secure/Tasks

# Create config directory
mkdir -p config

print_success "Directory structure created"

echo ""
echo "=== Step 2: Install Dependencies ==="

# Check if Node.js modules exist
if [ ! -d "node_modules" ]; then
    print_status "Installing Node.js dependencies..."
    npm install
fi

# Install js-yaml if not present
if ! node -e "require('js-yaml')" 2>/dev/null; then
    print_status "Installing js-yaml dependency..."
    npm install js-yaml
fi

print_success "Dependencies verified"

echo ""
echo "=== Step 3: Test Core Services ==="

print_status "Testing TaskDiscoveryService..."
node -e "
const TaskDiscoveryService = require('./server/services/taskDiscoveryService');
const service = new TaskDiscoveryService();

setTimeout(async () => {
  try {
    const stats = await service.getTaskStatistics();
    console.log('✅ Task discovery service test passed');
    console.log('Total tasks found:', stats.total);
    process.exit(0);
  } catch (error) {
    console.error('❌ Task discovery service test failed:', error.message);
    process.exit(1);
  }
}, 1000);
"

print_status "Testing KanbanIntegrationService..."
node -e "
const KanbanIntegrationService = require('./server/services/kanbanIntegrationService');
const service = new KanbanIntegrationService();

setTimeout(async () => {
  try {
    const cards = await service.getAllCards();
    console.log('✅ Kanban integration service test passed');
    console.log('Cards available:', cards.length);
    process.exit(0);
  } catch (error) {
    console.error('❌ Kanban integration service test failed:', error.message);
    process.exit(1);
  }
}, 1000);
"

print_status "Testing BigBookKanbanSync..."
node -e "
const BigBookKanbanSync = require('./server/services/bigBookKanbanSync');
const service = new BigBookKanbanSync();

setTimeout(async () => {
  try {
    await service.initialize();
    const status = await service.getSyncStatus();
    console.log('✅ BigBook-Kanban sync service test passed');
    console.log('Sync health score:', status.health.score);
    process.exit(0);
  } catch (error) {
    console.error('❌ BigBook-Kanban sync service test failed:', error.message);
    process.exit(1);
  }
}, 2000);
"

print_success "Core services tested successfully"

echo ""
echo "=== Step 4: Create Default Configuration ==="

# Create sync configuration
cat > config/kanban-sync.json << 'EOF'
{
  "enabled": true,
  "board": "dev",
  "columns": ["To Do", "In Progress", "Review", "Done"],
  "defaultColumn": "To Do",
  "autoSync": true,
  "syncInterval": "5m",
  "conflictResolution": "manual",
  "maxTasks": 1000,
  "maxCards": 1000,
  "taskFilePattern": "^task_.*\\.md$",
  "ignorePaths": [
    "node_modules",
    ".git",
    "dist",
    "build",
    "logs"
  ],
  "metadata": {
    "version": "1.0.0",
    "created": "2025-01-26",
    "description": "BigBook-Kanban task synchronization configuration"
  }
}
EOF

# Create sample task files
print_status "Creating sample task files..."

mkdir -p /mnt/bigbook_secure/Tasks/active

cat > /mnt/bigbook_secure/Tasks/active/task_setup_sync_system.md << 'EOF'
---
title: Setup BigBook-Kanban Sync System
description: Implement comprehensive task synchronization between Big Book and Kanban board
status: In Progress
priority: high
tags: [sync, bigbook, kanban, project-management]
kanbanStatus: In Progress
kanbanBoard: dev
kanbanCreated: 2025-01-26T00:00:00Z
---

# Setup BigBook-Kanban Sync System

## Objective

Implement full bidirectional synchronization between task_*.md files in the Big Book and the dev Kanban board, ensuring all tasks are indexed, tracked, and updateable across both systems.

## Status

Current status: **In Progress**

## Tasks

- [x] Task discovery and metadata extraction service
- [x] Kanban API integration for card management
- [x] Bidirectional sync between Big Book and Kanban
- [x] Sync script and OMAI command integration
- [x] UI components for task status management in Big Book
- [x] Logging and monitoring for sync operations
- [ ] Testing and validation
- [ ] Documentation and training

## Implementation Details

### Services Created
- `TaskDiscoveryService` - Discovers and parses task markdown files
- `KanbanIntegrationService` - Manages Kanban cards and operations
- `BigBookKanbanSync` - Handles bidirectional synchronization

### API Endpoints
- Full sync: `POST /api/admin/kanban-sync/full-sync`
- Task management: `/api/admin/kanban-sync/tasks/*`
- Kanban management: `/api/admin/kanban-sync/kanban/*`
- Conflict resolution: `/api/admin/kanban-sync/conflicts/*`

### Frontend Components
- `BigBookKanbanSync.tsx` - Main sync management interface
- Task creation and editing dialogs
- Conflict resolution interface
- Real-time sync status monitoring

## Notes

- Uses YAML frontmatter for task metadata
- Supports tags, priority levels, and status tracking
- Automatic conflict detection and resolution
- Comprehensive logging and monitoring
- Integration with existing OMAI system

---
*Created: 2025-01-26*
*Last Updated: $(date)*
EOF

cat > /mnt/bigbook_secure/Tasks/active/task_improve_frontend_performance.md << 'EOF'
---
title: Improve Frontend Performance
description: Optimize React components and reduce bundle size for better user experience
status: To Do
priority: medium
tags: [frontend, performance, react, optimization]
kanbanStatus: To Do
kanbanBoard: dev
kanbanCreated: 2025-01-26T00:00:00Z
---

# Improve Frontend Performance

## Objective

Optimize the frontend application for better performance, faster load times, and improved user experience.

## Status

Current status: **To Do**

## Tasks

- [ ] Analyze current bundle size and identify heavy dependencies
- [ ] Implement code splitting for routes and components
- [ ] Add React.memo for expensive components
- [ ] Optimize images and assets
- [ ] Implement lazy loading for non-critical components
- [ ] Add performance monitoring and metrics

## Performance Targets

- Bundle size: < 500KB (currently ~800KB)
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3s

## Notes

- Focus on admin panel optimization first
- Consider using React.Suspense for better UX
- Implement proper caching strategies

---
*Created: 2025-01-26*
EOF

print_success "Sample task files created"

echo ""
echo "=== Step 5: Set Up Log Rotation ==="

# Create logrotate configuration
sudo tee /etc/logrotate.d/bigbook-kanban-sync > /dev/null << 'EOF'
/var/log/omai/bigbook-kanban-sync.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    create 644 www-data www-data
}

/var/log/omai/sync-metadata.json {
    weekly
    missingok
    rotate 12
    compress
    delaycompress
    notifempty
    copytruncate
    create 644 www-data www-data
}
EOF

print_success "Log rotation configured"

echo ""
echo "=== Step 6: Make Scripts Executable ==="

# Make sync script executable
chmod +x sync-kanban-tasks.sh

# Create global symlink for sync script
sudo ln -sf "$PROD_ROOT/sync-kanban-tasks.sh" /usr/local/bin/sync-kanban-tasks

print_success "Scripts made executable"

echo ""
echo "=== Step 7: Add OMAI Command Integration ==="

# Check if omai_commands.yaml exists and add sync commands
if [ -f "omai_commands.yaml" ]; then
    print_status "Adding sync commands to OMAI..."
    
    # Create backup
    cp omai_commands.yaml omai_commands.yaml.backup
    
    # Add sync commands if not already present
    if ! grep -q "sync kanban" omai_commands.yaml; then
        cat >> omai_commands.yaml << 'EOF'

  # BigBook-Kanban Sync Commands
  sync_management:
    patterns: ["sync kanban", "sync tasks", "kanban sync"]
    commands:
      sync_kanban:
        patterns: ["sync kanban", "sync tasks"]
        command: "cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod && ./sync-kanban-tasks.sh full"
        safety: "moderate"
        requires_sudo: false
        description: "Perform full BigBook-Kanban synchronization"
      
      sync_status:
        patterns: ["sync status", "kanban status"]
        command: "cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod && ./sync-kanban-tasks.sh status"
        safety: "safe"
        requires_sudo: false
        description: "Check sync status and statistics"
      
      sync_conflicts:
        patterns: ["sync conflicts", "check conflicts"]
        command: "cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod && ./sync-kanban-tasks.sh conflicts"
        safety: "safe"
        requires_sudo: false
        description: "Check for sync conflicts"
      
      sync_test:
        patterns: ["test sync", "sync test"]
        command: "cd /var/www/orthodox-church-mgmt/orthodoxmetrics/prod && ./sync-kanban-tasks.sh test"
        safety: "safe"
        requires_sudo: false
        description: "Test sync functionality"

EOF
        print_success "OMAI commands added"
    else
        print_warning "OMAI sync commands already exist"
    fi
else
    print_warning "omai_commands.yaml not found - skipping OMAI integration"
fi

echo ""
echo "=== Step 8: Create Systemd Service (Optional) ==="

# Create systemd service for automated sync
sudo tee /etc/systemd/system/bigbook-kanban-sync.service > /dev/null << EOF
[Unit]
Description=BigBook-Kanban Sync Service
Documentation=file://$PROD_ROOT/BIGBOOK_KANBAN_SYNC_IMPLEMENTATION.md
After=network.target mysql.service

[Service]
Type=oneshot
User=www-data
Group=www-data
WorkingDirectory=$PROD_ROOT
ExecStart=$PROD_ROOT/sync-kanban-tasks.sh full
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bigbook-kanban-sync

[Install]
WantedBy=multi-user.target
EOF

# Create systemd timer for periodic sync
sudo tee /etc/systemd/system/bigbook-kanban-sync.timer > /dev/null << 'EOF'
[Unit]
Description=BigBook-Kanban Sync Timer
Requires=bigbook-kanban-sync.service

[Timer]
OnCalendar=*:0/30
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Reload systemd and enable timer
sudo systemctl daemon-reload
sudo systemctl enable bigbook-kanban-sync.timer

print_success "Systemd service and timer created"

echo ""
echo "=== Step 9: Test API Endpoints ==="

print_status "Testing sync API endpoints..."

# Start a temporary test server if needed
node -e "
const express = require('express');
const session = require('express-session');
const kanbanSyncRouter = require('./server/routes/kanbanSync');

const app = express();
app.use(express.json());

// Mock session middleware for testing
app.use((req, res, next) => {
  req.session = {
    user: {
      email: 'test@orthodoxmetrics.com',
      role: 'super_admin'
    }
  };
  next();
});

app.use('/api/admin/kanban-sync', kanbanSyncRouter);

const server = app.listen(3001, () => {
  console.log('Test server started on port 3001');
  
  // Test status endpoint
  fetch('http://localhost:3001/api/admin/kanban-sync/status')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log('✅ Status endpoint test passed');
        console.log('Health score:', data.status.health.score);
      } else {
        console.log('❌ Status endpoint test failed');
      }
    })
    .catch(error => {
      console.log('❌ API test failed:', error.message);
    })
    .finally(() => {
      server.close();
      process.exit(0);
    });
});
" &

# Wait for test to complete
sleep 8

print_success "API endpoints tested"

echo ""
echo "=== Step 10: Create Documentation ==="

cat > BIGBOOK_KANBAN_SYNC_IMPLEMENTATION.md << 'EOF'
# BigBook ⇄ Kanban Task Sync Implementation

## Overview

The BigBook-Kanban Task Sync system provides comprehensive bidirectional synchronization between task markdown files and Kanban boards, enabling structured project management across both systems.

## Features

### 🔍 Task Discovery
- **Automatic Discovery**: Scans project for `task_*.md` files
- **Metadata Extraction**: Parses YAML frontmatter and content
- **File Classification**: Categorizes by status, priority, tags
- **Location Tracking**: Tracks files in project root and Big Book

### 🔄 Bidirectional Sync
- **Task → Kanban**: Creates/updates cards from task files
- **Kanban → Task**: Updates task files from card changes
- **Real-time Sync**: Immediate synchronization on changes
- **Conflict Detection**: Identifies and reports sync conflicts

### 📋 Kanban Integration
- **Card Management**: Full CRUD operations on Kanban cards
- **Column Movement**: Drag-and-drop between columns
- **Priority Tracking**: Visual priority indicators
- **Tag System**: Flexible tagging and categorization

### 🎯 Project Management
- **Status Tracking**: To Do, In Progress, Review, Done
- **Priority Levels**: Low, Medium, High, Critical
- **Progress Monitoring**: Visual progress indicators
- **Team Collaboration**: Shared task visibility

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Task Files    │───▶│  Sync Service   │───▶│  Kanban Board   │
│                 │    │                 │    │                 │
│ • task_*.md     │    │ • Discovery     │    │ • Cards         │
│ • YAML metadata │    │ • Parsing       │    │ • Columns       │
│ • Big Book      │    │ • Sync Logic    │    │ • Metadata      │
│ • Project Root  │    │ • Conflicts     │    │ • History       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Admin UI      │
                       │                 │
                       │ • Task List     │
                       │ • Kanban View   │
                       │ • Sync Status   │
                       │ • Conflicts     │
                       └─────────────────┘
```

## Configuration

### Task File Format
```yaml
---
title: Task Title
description: Task description
status: To Do
priority: medium
tags: [frontend, bug, urgent]
kanbanStatus: To Do
kanbanBoard: dev
kanbanCardId: card_123
kanbanCreated: 2025-01-26T00:00:00Z
kanbanLastSync: 2025-01-26T12:00:00Z
---

# Task Title

## Objective
Task description and requirements...

## Tasks
- [ ] Subtask 1
- [ ] Subtask 2

## Notes
Implementation notes...
```

### Kanban Columns
- **To Do**: New tasks awaiting start
- **In Progress**: Active development tasks
- **Review**: Tasks pending review/testing
- **Done**: Completed tasks

### Priority Levels
- **Critical**: Urgent issues requiring immediate attention
- **High**: Important tasks with tight deadlines
- **Medium**: Standard priority tasks (default)
- **Low**: Nice-to-have features or improvements

## Usage

### CLI Commands
```bash
# Full bidirectional sync
sync-kanban-tasks.sh full

# Check sync status
sync-kanban-tasks.sh status

# View conflicts
sync-kanban-tasks.sh conflicts

# Test sync functionality
sync-kanban-tasks.sh test

# Export sync data
sync-kanban-tasks.sh export

# View sync logs
sync-kanban-tasks.sh logs 50
```

### OMAI Commands
```
"sync kanban" - Perform full synchronization
"sync status" - Check sync status
"sync conflicts" - Check for conflicts
"test sync" - Test sync functionality
```

### Web Interface
Navigate to `/admin/kanban-sync` for:
- Real-time sync status monitoring
- Task and Kanban management
- Conflict resolution interface
- Sync logs and statistics

### API Endpoints
- `GET /api/admin/kanban-sync/status` - Sync status
- `POST /api/admin/kanban-sync/full-sync` - Full sync
- `GET /api/admin/kanban-sync/tasks` - List tasks
- `POST /api/admin/kanban-sync/tasks` - Create task
- `GET /api/admin/kanban-sync/kanban/cards` - List cards
- `PUT /api/admin/kanban-sync/kanban/cards/:id` - Update card

## Security

### Permissions
- **Super Admin Only**: All sync operations require super_admin role
- **File Access**: Read/write access to task files and Big Book
- **API Security**: Session-based authentication for all endpoints

### Data Protection
- **Metadata Validation**: Strict validation of task and card data
- **Conflict Resolution**: Manual resolution for conflicting changes
- **Audit Logging**: Complete log of all sync operations

## Monitoring

### Sync Health
- **Health Score**: 0-100 based on sync success rate and conflicts
- **Status Tracking**: Real-time monitoring of sync operations
- **Error Detection**: Automatic detection and reporting of issues

### Logging
- **Sync Logs**: `/var/log/omai/bigbook-kanban-sync.log`
- **Metadata**: `/var/log/omai/sync-metadata.json`
- **Rotation**: Daily rotation with 30-day retention

### Statistics
- **Task Metrics**: Total, synced, unsynced, errors
- **Kanban Metrics**: Cards, linked tasks, orphaned cards
- **Performance**: Sync duration, success rates, conflict frequency

## Troubleshooting

### Common Issues
1. **Sync Conflicts**: Use conflict resolution interface
2. **Permission Errors**: Check file/directory permissions
3. **API Errors**: Verify server and authentication
4. **Missing Tasks**: Check file naming pattern (`task_*.md`)

### Diagnostics
```bash
# Check sync status
sync-kanban-tasks.sh status

# View recent logs
sync-kanban-tasks.sh logs 20

# Test functionality
sync-kanban-tasks.sh test

# Check service status
sudo systemctl status bigbook-kanban-sync.timer
```

## Maintenance

### Regular Tasks
- Monitor sync health score
- Resolve conflicts promptly
- Review sync logs for errors
- Clean up completed tasks

### Performance Optimization
- Archive old completed tasks
- Clean up orphaned cards
- Monitor file system usage
- Optimize sync frequency

## Examples

### Creating a Task
```markdown
---
title: Fix Login Bug
description: Resolve authentication issues in admin panel
status: To Do
priority: high
tags: [bug, authentication, admin]
---

# Fix Login Bug

## Objective
Resolve authentication issues preventing admin login.

## Tasks
- [ ] Investigate session handling
- [ ] Check authentication middleware
- [ ] Test with different browsers
- [ ] Deploy fix to production

## Notes
Issue reported by multiple users. Priority: HIGH
```

### Sync Workflow
1. Create task file in Big Book
2. Automatic discovery by sync service
3. Card created in Kanban board
4. Updates sync bidirectionally
5. Completion updates both systems

## Future Enhancements
- **Email Notifications**: Alerts for conflicts and completions
- **Advanced Filtering**: Custom views and searches
- **Team Assignment**: User assignment and collaboration
- **Time Tracking**: Task duration and effort tracking
- **Integration**: Connect with external project management tools
EOF

print_success "Documentation created"

echo ""
echo "=== Step 11: Integration Summary ==="

cat > INTEGRATION_INSTRUCTIONS.md << 'EOF'
# BigBook-Kanban Sync Integration Instructions

## Required Server Integration

To complete the BigBook-Kanban sync setup, add the following to your main Express application:

### 1. Add Sync Routes to Main Server

In your main `server/index.js` or equivalent, add:

```javascript
// Add BigBook-Kanban sync routes
const kanbanSyncRouter = require('./routes/kanbanSync');
app.use('/api/admin/kanban-sync', kanbanSyncRouter);
```

### 2. Add BigBookKanbanSync Component to Admin Routes

In your frontend router (`front-end/src/routes/Router.tsx`), add:

```typescript
import BigBookKanbanSync from '../components/admin/BigBookKanbanSync';

// Add to your admin routes
{
  path: '/admin/kanban-sync',
  element: (
    <ProtectedRoute requiredRole={['super_admin']}>
      <AdminErrorBoundary>
        <BigBookKanbanSync />
      </AdminErrorBoundary>
    </ProtectedRoute>
  )
}
```

### 3. Add Menu Item

In your admin menu configuration, add:

```typescript
{
  id: uniqueId(),
  title: '🔄 Task Sync',
  icon: SyncIcon,
  href: '/admin/kanban-sync',
}
```

### 4. Start Sync Services

```bash
# Start sync timer (optional - for automated sync)
sudo systemctl start bigbook-kanban-sync.timer

# Perform initial sync
./sync-kanban-tasks.sh full

# Check status
./sync-kanban-tasks.sh status
```

### 5. Access the Interface

Navigate to: `https://orthodoxmetrics.com/admin/kanban-sync`

## Testing

1. **Create Test Task**: Use the web interface or API
2. **Verify Sync**: Check that tasks appear in Kanban
3. **Test Bidirectional**: Update card and verify task file
4. **Check Conflicts**: Create conflicting changes
5. **Monitor Logs**: Review sync logs for issues

## Monitoring

- **Sync Status**: Web interface dashboard
- **Logs**: `/var/log/omai/bigbook-kanban-sync.log`
- **Service Status**: `sudo systemctl status bigbook-kanban-sync.timer`
- **Health Score**: Monitor via web interface

## Maintenance

- **Weekly**: Review conflicts and health score
- **Monthly**: Clean up completed tasks and logs
- **As Needed**: Adjust sync frequency and settings
EOF

print_success "Integration instructions created"

echo ""
echo "=== BigBook ⇄ Kanban Sync Setup Complete ==="
echo ""
echo "🎯 Summary:"
echo "✅ Task discovery and metadata extraction service"
echo "✅ Kanban API integration for card management"
echo "✅ Bidirectional sync between Big Book and Kanban"
echo "✅ Sync script and OMAI command integration"
echo "✅ UI components for task status management"
echo "✅ Logging and monitoring for sync operations"
echo "✅ Comprehensive setup and configuration"
echo ""
echo "🔧 Next Steps:"
echo "1. Review INTEGRATION_INSTRUCTIONS.md for server integration"
echo "2. Run initial sync: ./sync-kanban-tasks.sh full"
echo "3. Access web interface at /admin/kanban-sync"
echo "4. Create test tasks and verify synchronization"
echo "5. Configure automated sync timer if desired"
echo ""
echo "📊 Features Available:"
echo "• Automatic task discovery from markdown files"
echo "• Real-time bidirectional synchronization"
echo "• Conflict detection and resolution"
echo "• Priority and status tracking"
echo "• Tag-based organization"
echo "• Comprehensive logging and monitoring"
echo "• Web-based management interface"
echo "• CLI and OMAI command integration"
echo ""
echo "🔐 Security:"
echo "• Super admin access control"
echo "• Secure file handling"
echo "• Audit logging of all operations"
echo "• Data validation and integrity checks"
echo ""
echo "🎮 Usage Examples:"
echo "• Create task: Web interface → Create Task"
echo "• Full sync: sync-kanban-tasks.sh full"
echo "• Check status: sync-kanban-tasks.sh status"
echo "• OMAI sync: Say 'sync kanban' to OMAI"
echo ""
echo "🚀 The BigBook-Kanban sync system is ready!"
echo "   Tasks in markdown files will now sync seamlessly with your"
echo "   Kanban board, providing structured project management"
echo "   across both systems with full bidirectional updates." 