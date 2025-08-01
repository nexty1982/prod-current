#!/bin/bash

# 🛠️ Initialize OrthodoxMetrics Task Management System
# ===================================================
# This script creates a persistent, editable task system for autonomous operations
# Author: AI Assistant for OrthodoxMetrics
# Date: $(date '+%Y-%m-%d')

echo "🛠️ Initializing OrthodoxMetrics Task Management System"
echo "======================================================"
echo ""

# Define the root task directory
TASK_ROOT="/var/www/orthodoxmetrics/prod/tasks"
echo "📁 Task root directory: $TASK_ROOT"

# Create directory structure
echo "🏗️ Creating directory structure..."
mkdir -p "$TASK_ROOT"/{node,npm,pm2,scripts,logs}

echo "✅ Created directories:"
echo "   📂 $TASK_ROOT/node/     - Node.js .js scripts"
echo "   📂 $TASK_ROOT/npm/      - NPM commands (.txt or .sh)"
echo "   📂 $TASK_ROOT/pm2/      - PM2 command wrappers"
echo "   📂 $TASK_ROOT/scripts/  - General-purpose .sh scripts"
echo "   📂 $TASK_ROOT/logs/     - Execution logs"
echo ""

# Create the master runner.sh script
echo "⚙️ Creating runner.sh master execution script..."
cat > "$TASK_ROOT/runner.sh" << 'RUNNER_EOF'
#!/bin/bash

# 🚀 OrthodoxMetrics Task Runner
# ==============================
# Master execution script for the task management system
# Executes all valid files across task categories

# Configuration
TASK_ROOT="/var/www/orthodoxmetrics/prod/tasks"
LOG_DIR="$TASK_ROOT/logs"
TIMESTAMP=$(date '+%Y-%m-%d-%H%M')
LOG_FILE="$LOG_DIR/$TIMESTAMP-task-run.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Initialize log
echo "🚀 OrthodoxMetrics Task Runner - $(date)" | tee "$LOG_FILE"
echo "=======================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Tool detection function
check_tool() {
    local tool=$1
    if command -v "$tool" &> /dev/null; then
        echo "✅ $tool found at: $(which $tool)" | tee -a "$LOG_FILE"
        return 0
    else
        echo "⚠️ $tool not found in PATH" | tee -a "$LOG_FILE"
        return 1
    fi
}

# Task execution logging
log_task() {
    local status=$1
    local task=$2
    local details=$3
    
    if [ "$status" = "success" ]; then
        echo "[$✓] Success: $task" | tee -a "$LOG_FILE"
    else
        echo "[$✗] Failed: $task" | tee -a "$LOG_FILE"
    fi
    
    if [ -n "$details" ]; then
        echo "    $details" | tee -a "$LOG_FILE"
    fi
}

# Tool availability check
echo "🔍 Checking tool availability..." | tee -a "$LOG_FILE"
HAS_BASH=$(check_tool bash)
HAS_NODE=$(check_tool node)
HAS_NPM=$(check_tool npm)
HAS_PM2=$(check_tool pm2)
echo "" | tee -a "$LOG_FILE"

# Execute scripts from scripts/ directory
echo "📜 Executing bash scripts..." | tee -a "$LOG_FILE"
if [ -d "$TASK_ROOT/scripts" ]; then
    for script in "$TASK_ROOT/scripts"/*.sh; do
        if [ -f "$script" ] && [[ ! "$script" =~ \.(log|md|~)$ ]]; then
            script_name=$(basename "$script")
            echo "🔄 Running: $script_name" | tee -a "$LOG_FILE"
            
            # Make executable
            chmod +x "$script"
            
            # Execute with timeout and capture output
            if timeout 300 bash "$script" >> "$LOG_FILE" 2>&1; then
                log_task "success" "$script_name"
            else
                log_task "failed" "$script_name" "Check logs for details"
            fi
        fi
    done
else
    echo "📂 No scripts directory found" | tee -a "$LOG_FILE"
fi
echo "" | tee -a "$LOG_FILE"

# Execute Node.js scripts from node/ directory
echo "🟢 Executing Node.js scripts..." | tee -a "$LOG_FILE"
if [ -d "$TASK_ROOT/node" ] && [ $HAS_NODE ]; then
    for script in "$TASK_ROOT/node"/*.js; do
        if [ -f "$script" ] && [[ ! "$script" =~ \.(log|md|~)$ ]]; then
            script_name=$(basename "$script")
            echo "🔄 Running: $script_name" | tee -a "$LOG_FILE"
            
            # Execute with timeout
            if timeout 300 /usr/bin/env node "$script" >> "$LOG_FILE" 2>&1; then
                log_task "success" "$script_name"
            else
                log_task "failed" "$script_name" "Check logs for details"
            fi
        fi
    done
elif [ ! $HAS_NODE ]; then
    echo "⚠️ Node.js not available, skipping node/ scripts" | tee -a "$LOG_FILE"
else
    echo "📂 No node directory found" | tee -a "$LOG_FILE"
fi
echo "" | tee -a "$LOG_FILE"

# Execute NPM commands from npm/ directory
echo "📦 Executing NPM commands..." | tee -a "$LOG_FILE"
if [ -d "$TASK_ROOT/npm" ] && [ $HAS_NPM ]; then
    # Execute .sh wrapper scripts
    for script in "$TASK_ROOT/npm"/*.sh; do
        if [ -f "$script" ] && [[ ! "$script" =~ \.(log|md|~)$ ]]; then
            script_name=$(basename "$script")
            echo "🔄 Running NPM script: $script_name" | tee -a "$LOG_FILE"
            
            chmod +x "$script"
            if timeout 600 bash "$script" >> "$LOG_FILE" 2>&1; then
                log_task "success" "$script_name"
            else
                log_task "failed" "$script_name" "Check logs for details"
            fi
        fi
    done
    
    # Process .txt command files
    for cmdfile in "$TASK_ROOT/npm"/*.txt; do
        if [ -f "$cmdfile" ] && [[ ! "$cmdfile" =~ \.(log|md|~)$ ]]; then
            cmdfile_name=$(basename "$cmdfile")
            echo "🔄 Processing NPM commands: $cmdfile_name" | tee -a "$LOG_FILE"
            
            while IFS= read -r cmd; do
                # Skip empty lines and comments
                if [ -n "$cmd" ] && [[ ! "$cmd" =~ ^[[:space:]]*# ]]; then
                    echo "   Executing: $cmd" | tee -a "$LOG_FILE"
                    if timeout 600 /usr/bin/env npm $cmd >> "$LOG_FILE" 2>&1; then
                        log_task "success" "npm $cmd"
                    else
                        log_task "failed" "npm $cmd" "Command failed"
                    fi
                fi
            done < "$cmdfile"
        fi
    done
elif [ ! $HAS_NPM ]; then
    echo "⚠️ NPM not available, skipping npm/ commands" | tee -a "$LOG_FILE"
else
    echo "📂 No npm directory found" | tee -a "$LOG_FILE"
fi
echo "" | tee -a "$LOG_FILE"

# Execute PM2 commands from pm2/ directory
echo "⚡ Executing PM2 commands..." | tee -a "$LOG_FILE"
if [ -d "$TASK_ROOT/pm2" ] && [ $HAS_PM2 ]; then
    # Execute .sh wrapper scripts
    for script in "$TASK_ROOT/pm2"/*.sh; do
        if [ -f "$script" ] && [[ ! "$script" =~ \.(log|md|~)$ ]]; then
            script_name=$(basename "$script")
            echo "🔄 Running PM2 script: $script_name" | tee -a "$LOG_FILE"
            
            chmod +x "$script"
            if timeout 300 bash "$script" >> "$LOG_FILE" 2>&1; then
                log_task "success" "$script_name"
            else
                log_task "failed" "$script_name" "Check logs for details"
            fi
        fi
    done
    
    # Process .txt command files
    for cmdfile in "$TASK_ROOT/pm2"/*.txt; do
        if [ -f "$cmdfile" ] && [[ ! "$cmdfile" =~ \.(log|md|~)$ ]]; then
            cmdfile_name=$(basename "$cmdfile")
            echo "🔄 Processing PM2 commands: $cmdfile_name" | tee -a "$LOG_FILE"
            
            while IFS= read -r cmd; do
                # Skip empty lines and comments
                if [ -n "$cmd" ] && [[ ! "$cmd" =~ ^[[:space:]]*# ]]; then
                    echo "   Executing: pm2 $cmd" | tee -a "$LOG_FILE"
                    if timeout 300 /usr/bin/env pm2 $cmd >> "$LOG_FILE" 2>&1; then
                        log_task "success" "pm2 $cmd"
                    else
                        log_task "failed" "pm2 $cmd" "Command failed"
                    fi
                fi
            done < "$cmdfile"
        fi
    done
elif [ ! $HAS_PM2 ]; then
    echo "⚠️ PM2 not available, skipping pm2/ commands" | tee -a "$LOG_FILE"
else
    echo "📂 No pm2 directory found" | tee -a "$LOG_FILE"
fi
echo "" | tee -a "$LOG_FILE"

# Summary
echo "📊 Task execution summary - $(date)" | tee -a "$LOG_FILE"
echo "=================================" | tee -a "$LOG_FILE"
echo "Log file: $LOG_FILE" | tee -a "$LOG_FILE"
echo "Task run completed." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

RUNNER_EOF

# Make runner.sh executable
chmod +x "$TASK_ROOT/runner.sh"
echo "✅ Created executable runner.sh"
echo ""

# Create comprehensive README.md
echo "📖 Creating README.md documentation..."
cat > "$TASK_ROOT/README.md" << 'README_EOF'
# OrthodoxMetrics Task Management System

## 🏛️ Overview

This is a persistent, editable task management system designed for OrthodoxMetrics autonomous operations. Unlike run-once scripts, this system supports collaborative enhancement, full visibility, and manual or scheduled execution.

## 📁 Directory Structure

```
/var/www/orthodoxmetrics/prod/tasks/
├── node/         # Node.js `.js` scripts (editable and rerunnable)
├── npm/          # NPM commands in `.txt` or `.sh` format
├── pm2/          # PM2 command wrapper scripts or `.txt` lists
├── scripts/      # General-purpose `.sh` scripts
├── logs/         # Output logs per execution (timestamped)
├── runner.sh     # Master execution script
└── README.md     # This documentation
```

## 📂 Folder Descriptions

### `scripts/` - Bash Scripts
- **Purpose**: General-purpose shell scripts
- **Format**: `.sh` files, automatically made executable (chmod 755)
- **Execution**: Run with `bash`
- **Editable**: Yes, modify freely after creation

### `node/` - Node.js Scripts  
- **Purpose**: Server-side JavaScript operations
- **Format**: `.js` files
- **Execution**: Run with `node`
- **Environment**: OrthodoxMetrics production environment

### `npm/` - NPM Commands
- **Purpose**: Package management and build operations
- **Formats**: 
  - `.txt` files: One command per line (e.g., `install --legacy-peer-deps`)
  - `.sh` files: Wrapper scripts for complex NPM operations
- **Execution**: Commands prefixed with `npm`
- **Special**: All frontend operations require `--legacy-peer-deps`

### `pm2/` - Process Management
- **Purpose**: PM2 process control for OrthodoxMetrics services
- **Formats**:
  - `.txt` files: PM2 commands (e.g., `restart orthodox-backend`)
  - `.sh` files: Complex PM2 operation scripts
- **Target Services**:
  - `orthodox-backend` (main server, port 3001)
  - `omai-background` (AI service)

### `logs/` - Execution Logs
- **Purpose**: Timestamped execution logs for debugging
- **Format**: `YYYY-MM-DD-HHMM-task-run.log`
- **Retention**: Never deleted automatically
- **Content**: Full output from all executed tasks

## 🛠️ Usage Instructions

### Manual Execution
```bash
# Run all tasks in the system
bash /var/www/orthodoxmetrics/prod/tasks/runner.sh

# Check latest execution log
tail -f /var/www/orthodoxmetrics/prod/tasks/logs/$(ls -t /var/www/orthodoxmetrics/prod/tasks/logs/ | head -1)
```

### Adding New Tasks

#### Bash Script Example
```bash
# Create a new script
cat > /var/www/orthodoxmetrics/prod/tasks/scripts/backup-database.sh << 'EOF'
#!/bin/bash
echo "Starting database backup..."
# Your backup logic here
echo "Backup completed"
EOF
```

#### Node.js Script Example
```bash
# Create a Node.js task
cat > /var/www/orthodoxmetrics/prod/tasks/node/process-records.js << 'EOF'
// OrthodoxMetrics record processing
console.log('Processing church records...');
// Your Node.js logic here
console.log('Processing completed');
EOF
```

#### NPM Commands Example
```bash
# Create NPM command list
cat > /var/www/orthodoxmetrics/prod/tasks/npm/frontend-build.txt << 'EOF'
# Frontend build commands for OrthodoxMetrics
install --legacy-peer-deps
run build
EOF
```

#### PM2 Commands Example
```bash
# Create PM2 command list
cat > /var/www/orthodoxmetrics/prod/tasks/pm2/restart-services.txt << 'EOF'
# Restart OrthodoxMetrics services
restart orthodox-backend
restart omai-background
status
EOF
```

### Scheduled Execution
```bash
# Add to crontab for automated execution
# Run every minute
* * * * * /var/www/orthodoxmetrics/prod/tasks/runner.sh

# Run every hour
0 * * * * /var/www/orthodoxmetrics/prod/tasks/runner.sh

# Run daily at 2 AM
0 2 * * * /var/www/orthodoxmetrics/prod/tasks/runner.sh
```

## 🛡️ File Behavior Rules

### ✅ Safe Operations
- **Scripts are never deleted or renamed** by the system
- **All execution results are logged** with timestamps
- **Developers can modify scripts freely** after creation
- **Cursor can drop new files** into any category
- **Failed tasks remain for inspection** and debugging

### ⚠️ Important Notes
- Files ending in `.log`, `.md`, or `~` are **automatically skipped**
- All scripts have a **300-second timeout** (600s for NPM operations)
- **Tool availability is checked** before execution
- **Missing tools generate warnings** but don't stop other tasks

## 🔒 OrthodoxMetrics Environment Rules

### Critical Guidelines
- **DO NOT use Unstable_Grid2** - causes layout conflicts in OrthodoxMetrics
- **All backend communication** uses port 3001
- **NPM operations** in `prod/front-end` require `--legacy-peer-deps`
- **Frontend builds** need `NODE_OPTIONS="--max-old-space-size=4096"`

### System Architecture
- **Environment**: Linux server mounted via Windows network share
- **Backend**: Node.js + Express under PM2 management
- **Frontend**: React + TypeScript + Material-UI
- **Database**: MySQL with multi-tenant architecture

### PM2 Process Names
- `orthodox-backend` - Main OrthodoxMetrics server
- `omai-background` - AI background service

## 🧪 Tool Requirements

The system checks for these tools and logs warnings if missing:
- **bash** - Shell script execution
- **node** - Node.js script execution  
- **npm** - Package management and builds
- **pm2** - Process management

Missing tools don't prevent execution of other categories.

## 📊 Logging and Monitoring

### Log Format
```
🚀 OrthodoxMetrics Task Runner - 2025-01-28 10:30:15
=======================================

🔍 Checking tool availability...
✅ bash found at: /bin/bash
✅ node found at: /usr/bin/node
✅ npm found at: /usr/bin/npm  
✅ pm2 found at: /usr/bin/pm2

📜 Executing bash scripts...
🔄 Running: backup-database.sh
[✓] Success: backup-database.sh

🟢 Executing Node.js scripts...
🔄 Running: process-records.js
[✓] Success: process-records.js

📊 Task execution summary - 2025-01-28 10:32:45
=================================
Log file: /var/www/orthodoxmetrics/prod/tasks/logs/2025-01-28-1030-task-run.log
Task run completed.
```

### Monitoring Commands
```bash
# Watch real-time execution
tail -f /var/www/orthodoxmetrics/prod/tasks/logs/$(ls -t /var/www/orthodoxmetrics/prod/tasks/logs/ | head -1)

# List recent logs
ls -la /var/www/orthodoxmetrics/prod/tasks/logs/

# Search for errors
grep -r "\[✗\]" /var/www/orthodoxmetrics/prod/tasks/logs/
```

## 🔄 Maintenance

### Regular Tasks
- **Review logs** for failed executions
- **Update scripts** as requirements change
- **Monitor disk space** in logs/ directory
- **Test new tasks** before scheduling

### Troubleshooting
- **Check tool availability** with `which bash node npm pm2`
- **Verify file permissions** with `ls -la`
- **Review execution logs** for detailed error messages
- **Test individual scripts** manually before adding to system

---

## 📞 Support

For issues with the task management system:
1. Check the latest execution log
2. Verify tool availability
3. Test problematic scripts manually
4. Review OrthodoxMetrics environment rules

This system is designed for OrthodoxMetrics autonomous operations while maintaining safety and transparency.

README_EOF

echo "✅ Created comprehensive README.md"
echo ""

# Create example tasks to demonstrate the system
echo "🧩 Creating example tasks..."

# Example bash script
cat > "$TASK_ROOT/scripts/example-system-check.sh" << 'EXAMPLE_SCRIPT_EOF'
#!/bin/bash

# 🔍 OrthodoxMetrics System Health Check
# =====================================
# Example task: Basic system health verification

echo "🏛️ OrthodoxMetrics System Health Check - $(date)"
echo "============================================="

# Check disk space
echo "💾 Disk space check:"
df -h / | tail -1 | awk '{print "   Available: " $4 " (" $5 " used)"}'

# Check memory usage
echo "🧠 Memory usage:"
free -h | grep '^Mem:' | awk '{print "   Available: " $7 " / " $2}'

# Check if OrthodoxMetrics processes are running
echo "⚡ PM2 process status:"
if command -v pm2 &> /dev/null; then
    pm2 list | grep -E "(orthodox-backend|omai-background)" || echo "   ⚠️ OrthodoxMetrics processes not found"
else
    echo "   ⚠️ PM2 not available"
fi

# Check port 3001
echo "🌐 Port 3001 status:"
if netstat -ln | grep ":3001" > /dev/null 2>&1; then
    echo "   ✅ Port 3001 is active"
else
    echo "   ⚠️ Port 3001 not listening"
fi

echo "✅ System health check completed"

EXAMPLE_SCRIPT_EOF

# Example Node.js script
cat > "$TASK_ROOT/node/example-log-cleaner.js" << 'EXAMPLE_NODE_EOF'
// 🧹 OrthodoxMetrics Log Cleaner
// =============================
// Example task: Clean old log files (older than 30 days)

const fs = require('fs');
const path = require('path');

console.log('🧹 OrthodoxMetrics Log Cleaner - ' + new Date().toISOString());
console.log('====================================');

const logDirectories = [
    '/var/www/orthodoxmetrics/prod/logs',
    '/var/www/orthodoxmetrics/prod/server/logs',
    '/var/www/orthodoxmetrics/prod/front-end/logs'
];

const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

logDirectories.forEach(dir => {
    console.log(`📂 Checking directory: ${dir}`);
    
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        let cleanedCount = 0;
        
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isFile() && file.endsWith('.log') && stats.mtime.getTime() < thirtyDaysAgo) {
                try {
                    fs.unlinkSync(filePath);
                    cleanedCount++;
                    console.log(`   🗑️ Removed: ${file}`);
                } catch (error) {
                    console.log(`   ❌ Failed to remove: ${file} (${error.message})`);
                }
            }
        });
        
        console.log(`   ✅ Cleaned ${cleanedCount} old log files`);
    } else {
        console.log(`   ⚠️ Directory not found: ${dir}`);
    }
});

console.log('✅ Log cleaning completed');

EXAMPLE_NODE_EOF

# Example NPM commands
cat > "$TASK_ROOT/npm/example-frontend-health.txt" << 'EXAMPLE_NPM_EOF'
# 🔍 Frontend Health Check Commands
# Example: Check frontend dependencies and build status
# Note: These are examples - modify for actual health checks

# Check for security vulnerabilities
audit --audit-level moderate

# Verify dependencies are properly installed  
list --depth=0 --legacy-peer-deps
EXAMPLE_NPM_EOF

# Example PM2 commands
cat > "$TASK_ROOT/pm2/example-service-status.txt" << 'EXAMPLE_PM2_EOF'
# ⚡ OrthodoxMetrics Service Status Check
# Example: Monitor PM2 processes for OrthodoxMetrics

# Show current status of all processes
list

# Show detailed info for OrthodoxMetrics processes
show orthodox-backend
show omai-background

# Display process logs (last 10 lines)
logs orthodox-backend --lines 10
logs omai-background --lines 10
EXAMPLE_PM2_EOF

echo "✅ Created example tasks in all categories"
echo ""

# Set appropriate permissions
echo "🔐 Setting permissions..."
chmod +x "$TASK_ROOT/runner.sh"
chmod +x "$TASK_ROOT/scripts/"*.sh
find "$TASK_ROOT" -name "*.md" -exec chmod 644 {} \;
find "$TASK_ROOT" -name "*.txt" -exec chmod 644 {} \;

echo "✅ Permissions set"
echo ""

# Offer cron installation
echo "⏰ Cron Installation Option"
echo "=========================="
echo ""
echo "Would you like to install a cron job to run the task system automatically?"
echo ""
echo "Options:"
echo "  1) Every minute    (for active development/monitoring)"
echo "  2) Every hour      (for regular maintenance)"  
echo "  3) Daily at 2 AM   (for nightly tasks)"
echo "  4) Manual only     (no automatic scheduling)"
echo ""
echo "To install manually later, run one of these commands:"
echo ""
echo "# Every minute"
echo "echo '* * * * * $TASK_ROOT/runner.sh' | crontab -"
echo ""
echo "# Every hour"  
echo "echo '0 * * * * $TASK_ROOT/runner.sh' | crontab -"
echo ""
echo "# Daily at 2 AM"
echo "echo '0 2 * * * $TASK_ROOT/runner.sh' | crontab -"
echo ""

# Final summary
echo "🎉 OrthodoxMetrics Task Management System Initialized!"
echo "====================================================="
echo ""
echo "📁 System location: $TASK_ROOT"
echo "🚀 Runner script:   $TASK_ROOT/runner.sh"
echo "📖 Documentation:   $TASK_ROOT/README.md"
echo ""
echo "🛠️ Quick commands:"
echo "   bash $TASK_ROOT/runner.sh                    # Run all tasks"
echo "   cat $TASK_ROOT/README.md                     # View documentation"
echo "   ls -la $TASK_ROOT/                           # List system contents"
echo ""
echo "🧩 Example tasks created in all categories for testing"
echo "📝 All files are editable and rerunnable"
echo "🔒 Scripts are never deleted automatically"
echo ""
echo "✅ Task management system ready for autonomous operations!" 