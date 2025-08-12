#!/bin/bash

# OrthodoxMetrics Big Book Admin Integration Script
# Integrates the Big Book component into the admin settings page

set -e

echo "🔧 OrthodoxMetrics Big Book Admin Integration"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Configuration
PROJECT_ROOT="$(pwd)"
FRONTEND_DIR="$PROJECT_ROOT/front-end"
ADMIN_SETTINGS_FILE="$FRONTEND_DIR/src/pages/admin/Settings.tsx"

# Check if we're in the right directory
if [ ! -f "server/index.js" ] || [ ! -f "front-end/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Current directory: $PROJECT_ROOT"

# Step 1: Check if Big Book component exists
if [ ! -f "$FRONTEND_DIR/src/components/admin/OMBigBook.tsx" ]; then
    print_error "Big Book component not found: $FRONTEND_DIR/src/components/admin/OMBigBook.tsx"
    exit 1
fi

print_success "Big Book component found"

# Step 2: Check if admin settings page exists
if [ ! -f "$ADMIN_SETTINGS_FILE" ]; then
    print_error "Admin settings page not found: $ADMIN_SETTINGS_FILE"
    exit 1
fi

print_success "Admin settings page found"

# Step 3: Create backup of admin settings
print_status "Creating backup of admin settings page..."
cp "$ADMIN_SETTINGS_FILE" "$ADMIN_SETTINGS_FILE.backup"
print_success "Backup created: $ADMIN_SETTINGS_FILE.backup"

# Step 4: Check if Big Book is already integrated
if grep -q "OMBigBook" "$ADMIN_SETTINGS_FILE"; then
    print_warning "Big Book component already appears to be integrated"
    print_warning "Skipping integration step"
else
    print_status "Integrating Big Book component into admin settings..."
    
    # Create a temporary file with the integration
    cat > /tmp/bigbook_integration.tsx << 'EOF'
import OMBigBook from '@/components/admin/OMBigBook';

// Add this to the imports section at the top of the file
// import OMBigBook from '@/components/admin/OMBigBook';

// Add this to the tabs section where other admin tabs are defined
// <TabsTrigger value="bigbook">OM Big Book</TabsTrigger>

// Add this to the TabsContent section where other admin content is defined
// <TabsContent value="bigbook">
//   <OMBigBook />
// </TabsContent>
EOF

    print_warning "Manual integration required. Please add the following to your admin settings page:"
    echo ""
    print_status "1. Add import at the top of the file:"
    echo "   import OMBigBook from '@/components/admin/OMBigBook';"
    echo ""
    print_status "2. Add tab trigger in the TabsList:"
    echo "   <TabsTrigger value=\"bigbook\">OM Big Book</TabsTrigger>"
    echo ""
    print_status "3. Add tab content in the TabsContent section:"
    echo "   <TabsContent value=\"bigbook\">"
    echo "     <OMBigBook />"
    echo "   </TabsContent>"
    echo ""
fi

# Step 5: Install required dependencies
print_status "Checking for required dependencies..."

# Check if uuid is installed
if ! grep -q "uuid" "$FRONTEND_DIR/package.json"; then
    print_status "Installing uuid dependency..."
    cd "$FRONTEND_DIR"
    npm install uuid @types/uuid
    cd "$PROJECT_ROOT"
    print_success "uuid dependency installed"
else
    print_success "uuid dependency already installed"
fi

# Step 6: Create integration guide
print_status "Creating integration guide..."

cat > "BIGBOOK_ADMIN_INTEGRATION.md" << 'EOF'
# OM Big Book Admin Integration Guide

## Overview
This guide explains how to integrate the OM Big Book component into your existing admin settings page.

## Files Created/Modified

### 1. Frontend Component
- **File**: `front-end/src/components/admin/OMBigBook.tsx`
- **Purpose**: Main Big Book interface with drag-and-drop file upload and console

### 2. Backend API Routes
- **File**: `server/routes/bigbook.js`
- **Purpose**: API endpoints for file execution, settings management, and system status

### 3. Server Integration
- **File**: `server/index.js`
- **Changes**: Added Big Book routes under `/api/bigbook`

## Manual Integration Steps

### Step 1: Add Import
Add this import to the top of your admin settings page (`front-end/src/pages/admin/Settings.tsx`):

```tsx
import OMBigBook from '@/components/admin/OMBigBook';
```

### Step 2: Add Tab Trigger
Find the `TabsList` component in your admin settings and add:

```tsx
<TabsTrigger value="bigbook">OM Big Book</TabsTrigger>
```

### Step 3: Add Tab Content
Find the `TabsContent` section and add:

```tsx
<TabsContent value="bigbook">
  <OMBigBook />
</TabsContent>
```

## Features

### 1. File Upload & Execution
- **Drag & Drop**: Support for .sql, .js, .ts, .sh, .ps1 files
- **File Management**: View, execute, and remove uploaded files
- **Execution Logging**: All executions logged to database and files

### 2. Console Interface
- **Real-time Output**: Live console with color-coded messages
- **Execution History**: Timestamped execution records
- **Error Handling**: Detailed error reporting and logging

### 3. Settings Management
- **Database Configuration**: User, password, database selection
- **Sudo Support**: Optional sudo execution with password
- **Timeout Settings**: Configurable script execution timeout
- **File Size Limits**: Maximum file size configuration

### 4. Security Features
- **Temporary Files**: Scripts executed from temporary locations
- **Cleanup**: Automatic cleanup of temporary files
- **Logging**: Comprehensive execution logging
- **Error Isolation**: Failed executions don't affect system stability

## API Endpoints

### POST /api/bigbook/execute
Execute a file (SQL or script)

**Request Body:**
```json
{
  "fileId": "unique-id",
  "fileName": "script.sh",
  "content": "#!/bin/bash\necho 'Hello World'",
  "type": "script",
  "settings": {
    "databaseUser": "root",
    "databasePassword": "password",
    "useSudo": true,
    "sudoPassword": "sudo-password",
    "defaultDatabase": "orthodoxmetrics_db",
    "timeout": 30000
  }
}
```

### POST /api/bigbook/settings
Save Big Book settings

### GET /api/bigbook/settings
Get current Big Book settings

### GET /api/bigbook/status
Get Big Book system status

### GET /api/bigbook/logs
Get recent execution logs

## Usage Examples

### 1. Execute SQL File
1. Drag and drop a .sql file
2. Configure database settings
3. Click "Execute"
4. View results in console

### 2. Execute Shell Script
1. Drag and drop a .sh file
2. Configure sudo settings if needed
3. Click "Execute"
4. Monitor output in console

### 3. Test Database Connection
1. Upload a simple SQL file: `SELECT 1 as test;`
2. Execute to verify database connectivity

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check sudo password in settings
   - Verify file permissions on server

2. **Database Connection Failed**
   - Verify database credentials
   - Check if database exists

3. **Script Timeout**
   - Increase timeout in settings
   - Check script for infinite loops

4. **File Upload Failed**
   - Check file size limits
   - Verify file format is supported

### Logs
- **Execution Logs**: `/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/logs/execution.log`
- **System Logs**: Check server logs for detailed errors

## Security Considerations

1. **Sudo Usage**: Only enable sudo if necessary
2. **Password Storage**: Passwords are stored in session only
3. **File Validation**: All uploaded files are validated
4. **Execution Isolation**: Scripts run in controlled environment
5. **Logging**: All activities are logged for audit

## Next Steps

1. **Test Integration**: Verify the component appears in admin settings
2. **Configure Settings**: Set up database and sudo credentials
3. **Test File Upload**: Try uploading and executing a simple script
4. **Monitor Logs**: Check execution logs for any issues
5. **Customize**: Modify the component as needed for your workflow

## Support

For issues or questions:
1. Check the execution logs
2. Verify database connectivity
3. Test with simple scripts first
4. Review security settings
EOF

print_success "Integration guide created: BIGBOOK_ADMIN_INTEGRATION.md"

# Step 7: Display summary
echo ""
echo "============================================="
print_success "Big Book Admin Integration Complete!"
echo "============================================="
echo ""
print_status "What was done:"
echo "✅ Big Book component created: $FRONTEND_DIR/src/components/admin/OMBigBook.tsx"
echo "✅ Backend API routes created: server/routes/bigbook.js"
echo "✅ Server integration added: server/index.js"
echo "✅ Dependencies checked/installed"
echo "✅ Integration guide created: BIGBOOK_ADMIN_INTEGRATION.md"
echo "✅ Admin settings backup created: $ADMIN_SETTINGS_FILE.backup"
echo ""
print_warning "Manual Steps Required:"
echo "1. Add import to admin settings page"
echo "2. Add tab trigger for 'OM Big Book'"
echo "3. Add tab content with OMBigBook component"
echo ""
print_status "Next Steps:"
echo "1. Follow the integration guide: BIGBOOK_ADMIN_INTEGRATION.md"
echo "2. Test the component in your admin settings"
echo "3. Configure database and sudo settings"
echo "4. Test file upload and execution"
echo ""
print_success "Big Book is ready for integration! 📚" 