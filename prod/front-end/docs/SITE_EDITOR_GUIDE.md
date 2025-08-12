# 🛠️ Site Editor Overlay - User Guide

## Overview

The Site Editor Overlay is a powerful tool that allows super_admins to inspect, analyze, and manually fix frontend components in OrthodoxMetrics. This system provides a visual interface for debugging and editing components without needing to modify code directly.

## 🎯 Features

### 1. Component Inspection
- **Hover Detection**: Hover over any component to see a visual indicator
- **Component Information**: View component name, type, props, and metadata
- **Position Tracking**: See exact dimensions and location of components
- **Style Analysis**: View CSS classes and Tailwind styling

### 2. Interactive Inspector Panel
- **Right-side Drawer**: Detailed component information panel
- **Editable Props**: Modify component properties in real-time
- **API Route Detection**: View associated API endpoints
- **Database Table Mapping**: See which database tables are affected
- **Style Information**: View CSS and Tailwind classes

### 3. OMAI Integration
- **AI-Powered Analysis**: Get suggestions from OMAI for component fixes
- **Issue Detection**: Automatic detection of common problems
- **Fix Recommendations**: AI-generated solutions and explanations
- **Confidence Scoring**: Understand how reliable AI suggestions are

### 4. Manual Fix Editor (Phase 17)
- **Monaco Editor Integration**: Full IDE-like code editing experience with syntax highlighting
- **Live Component Editing**: Edit `.tsx` and `.jsx` components directly in the browser
- **Syntax Validation**: Real-time TypeScript validation with error highlighting
- **File Operations**: Save changes, create backups, and rollback to previous versions
- **Diff Preview**: Compare original and modified code before saving
- **Auto-backup System**: Automatic backup creation before any changes
- **Template Generation**: Auto-generate component templates if source not found

### 5. GitOps Integration (Phase 17)
- **Automatic Commits**: Auto-commit successful fixes to dedicated branches
- **Pull Request Creation**: Generate PRs with detailed fix summaries
- **Branch Management**: Organized fix branches with consistent naming
- **Git Status Tracking**: Monitor repository status and pending changes
- **Commit History**: Detailed commit messages with user attribution

### 6. Visual Regression Testing (VRT) - Enhanced
- **Snapshot Capture**: Capture baseline and post-fix screenshots across device breakpoints
- **Diff Analysis**: Pixel-level comparison between snapshots with region detection
- **Confidence Adjustment**: AI confidence scores adjusted based on visual validation
- **Manual Fix Integration**: Automatic VRT analysis for all manual component changes
- **Real-time Results**: Live VRT status and analysis in the Component Inspector
- **Playwright Integration**: Browser automation tests for comprehensive validation
- **Learning System**: Continuous improvement through machine learning feedback
- **Export Functionality**: Download snapshots as PNG and metadata as JSON

### 7. JIT Terminal Access (On-Demand)
- **Secure Shell Access**: Time-limited terminal sessions for system administration
- **Elevated Privileges**: Sudo access for critical operations when needed
- **Session Management**: Configurable timeouts and concurrent session limits
- **Command Logging**: Complete audit trail of all terminal commands
- **WebSocket Communication**: Real-time terminal I/O through the web interface
- **Security Controls**: Production safeguards and super_admin-only access

### 5. Debugging Tools
- **Console Logging**: Log component data to browser console
- **Component Registry**: Track all components on the current page
- **History Navigation**: Navigate between inspected components
- **Change Tracking**: Monitor pending changes before applying

## 🚀 Getting Started

### Prerequisites
- Must be logged in as a `super_admin` user
- OrthodoxMetrics frontend application running
- OMAI service (optional, for AI-powered suggestions)

### Accessing the Site Editor

1. **Navigate to Demo Page**
   ```
   http://localhost:5173/demos/site-editor
   ```

2. **Enable Edit Mode**
   - Look for the floating blue edit button (bottom-right corner)
   - Click the edit icon to enter Site Edit Mode
   - The button will turn red when active

3. **Start Inspecting**
   - Hover over any component on the page
   - Blue dashed borders will appear around hoverable components
   - Click on a component to open the Inspector Panel

## 📋 Using the Inspector Panel

### Component Information
The right-side panel displays:

- **Component Name**: The React component name
- **Component Type**: HTML element type (div, button, etc.)
- **Properties**: All component props and their values
- **API Routes**: Associated API endpoints (if detected)
- **Database Tables**: Affected database tables (if known)
- **CSS Classes**: Applied CSS classes
- **Tailwind Classes**: Tailwind CSS classes
- **Position**: Exact coordinates and dimensions

### Editing Components

1. **Enable Edit Mode**
   - Click the "Edit" button in the Inspector Panel
   - Props become editable text fields

2. **Modify Properties**
   - Click on any prop value to edit it
   - Use the "×" button to delete props
   - Changes are tracked in "Pending Changes"

3. **Apply Changes**
   - Click "Save" to apply changes
   - Click "Cancel" to discard changes
   - Changes are applied immediately to the component

### OMAI Integration

1. **Request AI Analysis**
   - Click "Fix with OMAI" button
   - Wait for AI analysis (loading indicator shown)
   - Review AI suggestions and confidence score

2. **AI Response Includes**
   - **Explanation**: Why the fix is needed
   - **Suggestion**: Recommended solution
   - **Confidence**: How reliable the suggestion is
   - **Code Diff**: Suggested code changes (if available)

3. **Manual Review**
   - AI suggestions require manual review
   - Apply changes manually through the inspector
   - Use AI as a guide, not automatic fixes

## 🔍 Visual Regression Testing (VRT)

### Overview
VRT automatically validates UI changes by capturing and comparing visual snapshots, providing confidence in fix quality and detecting unintended visual regressions.

### Accessing VRT

1. **VRT Settings Button**
   - Click the VRT Settings button (gear icon) in the Site Editor overlay
   - Available only in Site Edit Mode for super_admin users

2. **VRT Dashboard**
   - Open Component Inspector for any component
   - Navigate to "Visual Regression Testing" accordion section
   - Click "Open VRT Dashboard" to access the main interface

3. **VRT Demo Page**
   ```
   http://localhost:5173/demos/vrt
   ```

### VRT Dashboard Features

#### Snapshot Comparison
- **Side-by-Side View**: Compare baseline and post-fix snapshots
- **Overlay Mode**: View differences as highlighted overlays
- **Zoom and Pan**: Detailed examination of specific regions
- **Device Breakpoints**: View snapshots across desktop, tablet, and mobile

#### Diff Analysis
- **Percentage Difference**: Quantified visual changes
- **Severity Classification**: NONE, MINOR, MODERATE, MAJOR, CRITICAL
- **Region Detection**: Highlighted areas of change
- **Pixel-Level Analysis**: Detailed pixel comparison data

#### Test Results
- **Playwright Tests**: Automated browser test results
- **Accessibility Checks**: WCAG compliance validation
- **Responsive Layout**: Cross-breakpoint consistency
- **Element Validation**: Component existence and functionality

#### Export Functionality
- **Download PNG**: Export snapshot comparisons as high-resolution images
- **Download Report**: Export comprehensive VRT metadata as JSON
- **Audit Trail**: All exports logged for compliance

### VRT Settings Panel

#### Snapshot Configuration
- **Enable/Disable**: Toggle snapshot capture
- **Retention Period**: Configure how long snapshots are stored
- **Quality Settings**: Adjust image quality and compression
- **Device Breakpoints**: Customize viewport sizes for testing

#### Diff Analysis Settings
- **Sensitivity**: Adjust diff detection sensitivity (0-100%)
- **Ignore Regions**: Define areas to exclude from comparison
- **Color Threshold**: Set color difference detection levels
- **Pixel Threshold**: Configure minimum pixel change detection

#### Confidence Settings
- **Base Confidence**: Default confidence for new components
- **Diff Weight**: How much visual changes affect confidence
- **Learning Rate**: Speed of confidence model adaptation
- **History Tracking**: Enable confidence change logging

#### Playwright Configuration
- **Browser Selection**: Choose which browsers to test
- **Test Timeout**: Configure maximum test duration
- **Retry Attempts**: Set number of retries for failed tests
- **Custom Assertions**: Define component-specific tests

#### Learning System
- **Enable Learning**: Toggle ML-based improvements
- **Feedback Threshold**: Minimum feedback required for learning
- **Model Updates**: Configure automatic model retraining
- **Data Retention**: Set learning data storage duration

#### Security & Access
- **Production Mode**: Enable/disable VRT in production
- **Admin Only**: Restrict access to super_admin users
- **Audit Logging**: Log all VRT activities
- **Rate Limiting**: Configure action limits per user

### VRT Workflow

#### 1. Capture Baseline
```typescript
// Automatically triggered when component is first inspected
1. Component selected in Site Editor
2. VRT captures baseline snapshot
3. Metadata stored (timestamp, dimensions, breakpoint)
4. Snapshot persisted to local storage
```

#### 2. Apply Fix
```typescript
// Use OMAI suggestions or manual edits
1. OMAI provides fix recommendation
2. Apply changes through Inspector Panel
3. Monitor component state changes
4. Validate fix application
```

#### 3. Capture Post-Fix
```typescript
// Automatically captured after applying fixes
1. Post-fix snapshot captured
2. Same breakpoints and settings as baseline
3. Metadata includes fix ID and confidence
4. Snapshot stored with baseline reference
```

#### 4. Analyze Differences
```typescript
// Automatic pixel-level comparison
1. Diff analysis performed
2. Regions of change identified
3. Severity calculated and classified
4. Results integrated with confidence model
```

#### 5. Adjust Confidence
```typescript
// OMAI confidence updated based on VRT results
1. Original OMAI confidence retrieved
2. VRT results factored into adjustment
3. Learning model updated with feedback
4. New confidence score calculated
```

### VRT Best Practices

#### For Testing
- **Consistent Environment**: Use same browser and device settings
- **Stable Content**: Ensure dynamic content is controlled or mocked
- **Baseline Quality**: Capture high-quality baseline snapshots
- **Multiple Breakpoints**: Test across all supported device sizes

#### For Analysis
- **Threshold Tuning**: Adjust sensitivity based on component type
- **Ignore Regions**: Exclude dynamic areas (timestamps, counters)
- **Severity Context**: Consider component importance for severity
- **Learning Feedback**: Provide feedback for edge cases

#### For Security
- **Production Disable**: Keep VRT disabled in production
- **Access Control**: Restrict to super_admin users only
- **Data Retention**: Configure appropriate retention periods
- **Audit Compliance**: Monitor and export audit logs

## 🔧 Advanced Features

### Component Registry
- All components on the page are tracked
- Navigate between components using history
- View component relationships and hierarchy

### Debug Console
- Click "Console" button to log component data
- Detailed information appears in browser console
- Useful for debugging complex components

### OMAI Status
- Real-time status indicator shows OMAI availability
- Green indicator = OMAI online and available
- Red indicator = OMAI offline or unavailable

### VRT Integration
- VRT results appear in Component Inspector
- Confidence adjustments visible in real-time
- Export capabilities for documentation and compliance

## 🎨 Visual Indicators

### Hover States
- **Blue Dashed Border**: Component is hoverable
- **Red Border**: Component is clickable (in edit mode)
- **Green Border**: Component is selected/inspected

### Status Indicators
- **Floating Button**: Blue = inactive, Red = active
- **OMAI Status**: Green = online, Red = offline
- **VRT Status**: Confidence percentage and diff severity
- **Loading States**: Spinner for AI analysis and VRT processing

### VRT Visual Elements
- **Diff Highlights**: Red regions show visual differences
- **Confidence Badge**: Color-coded confidence scores
- **Severity Icons**: Visual indicators for diff severity levels
- **Export Buttons**: Download icons for PNG and JSON export

## 📱 Responsive Design

The Site Editor works on all screen sizes:

- **Desktop**: Full inspector panel on the right, VRT dashboard in modal
- **Tablet**: Inspector panel adapts to screen size, VRT controls responsive
- **Mobile**: Inspector panel slides up from bottom, VRT in full-screen mode

## 🔒 Security & Permissions

### Access Control
- Only `super_admin` users can access Site Editor and VRT
- All changes and VRT actions are logged for audit purposes
- No permanent code changes (only runtime modifications)
- VRT disabled by default in production environments

### Safe Mode
- Changes are applied only to the current session
- Page refresh resets all modifications
- VRT snapshots stored locally with retention policies
- No risk of breaking the application

### VRT Security
- **Role-Based Access**: Super admin only for all VRT features
- **Rate Limiting**: Configurable action limits per user
- **Audit Logging**: Comprehensive logging of all VRT operations
- **Data Protection**: Local storage with configurable retention
- **Production Safeguards**: VRT automatically disabled in production

## 🐛 Troubleshooting

### Common Issues

1. **Components Not Detected**
   - Ensure you're in Site Edit Mode (red button)
   - Check that components have proper React markers
   - Try refreshing the page

2. **Inspector Panel Not Opening**
   - Verify you're logged in as super_admin
   - Check browser console for errors
   - Ensure CSS is properly loaded

3. **OMAI Not Responding**
   - Check OMAI service status
   - Verify network connectivity
   - Review OMAI service logs

4. **Changes Not Applying**
   - Ensure you clicked "Save" after editing
   - Check for JavaScript errors in console
   - Verify component is still mounted

5. **VRT Issues**
   - **Snapshots Not Capturing**: Check browser permissions, storage quota
   - **Diff Analysis Failing**: Verify image formats, check memory usage
   - **Dashboard Not Loading**: Confirm super_admin access, check console errors
   - **Export Not Working**: Verify HTML2Canvas library, check file permissions

### VRT Troubleshooting

#### Snapshot Issues
```typescript
// Debug snapshot capture
1. Check browser console for VRT logs
2. Verify localStorage availability and quota
3. Test with different components
4. Check network connectivity for large images
```

#### Diff Analysis Problems
```typescript
// Debug diff analysis
1. Verify baseline snapshot exists
2. Check image format compatibility
3. Monitor memory usage during analysis
4. Validate diff sensitivity settings
```

#### Configuration Issues
```typescript
// Debug VRT configuration
1. Check localStorage for 'vrt_master_config'
2. Verify configuration validation logs
3. Test with default settings
4. Check audit logs for error patterns
```

### Debug Steps

1. **Check Console Logs**
   - Open browser developer tools
   - Look for VRT-specific error messages
   - Monitor network requests for VRT operations
   - Use "Console" button in inspector

2. **Verify Permissions**
   - Confirm user role is `super_admin`
   - Check authentication status
   - Verify VRT security settings
   - Test with different user roles

3. **Test VRT Pipeline**
   - Use VRT Demo page for isolated testing
   - Capture manual snapshots
   - Verify diff analysis with known changes
   - Test export functionality

4. **Monitor Storage**
   - Check localStorage usage
   - Verify snapshot and configuration storage
   - Clear old VRT data if needed
   - Monitor storage quota limits

## 🔮 Future Enhancements

### Planned Features
- **Git Integration**: Save changes as code diffs
- **Component Templates**: Save and reuse component configurations
- **Advanced OMAI**: More sophisticated AI analysis
- **Collaboration**: Share component fixes with team
- **Version Control**: Track component changes over time

### VRT Roadmap
- **Cloud Storage**: AWS S3, Azure Blob, Google Cloud integration
- **Advanced ML**: More sophisticated learning algorithms
- **Parallel Processing**: Multi-threaded diff analysis
- **Cross-Browser Testing**: Expanded browser automation
- **Real-time Collaboration**: Multi-user VRT sessions

### API Extensions
- **GraphQL Support**: Enhanced data mapping
- **Custom Hooks**: User-defined component analysis
- **Plugin System**: Extensible inspector capabilities
- **Export Options**: Generate component documentation
- **VRT API**: Programmatic access to VRT functionality

## 📞 Support

For issues or questions about the Site Editor and VRT:

1. **Check Documentation**: Review this guide and PHASE_16_VRT_IMPLEMENTATION.md
2. **Console Debugging**: Use browser developer tools
3. **VRT Logs**: Check VRT audit logs in localStorage
4. **OMAI Logs**: Check OMAI service logs for AI-related issues
5. **Development Team**: Contact the OrthodoxMetrics development team

### VRT-Specific Support
- **Configuration Issues**: Check VRT Settings Panel validation
- **Performance Problems**: Monitor VRT performance logs
- **Security Questions**: Review VRT security documentation
- **Export Issues**: Verify browser compatibility for HTML2Canvas

---

**Note**: The Site Editor and VRT are development and debugging tools. Always test changes thoroughly, use version control for permanent modifications, and ensure VRT is properly configured for your environment. 

## Phase 17: Manual Fix Workflow

### 🔧 Manual Component Editing

#### 1. Access Manual Fix Editor
```typescript
// Navigate to Manual Fix tab in Component Inspector
1. Select component using Site Editor Overlay
2. Open Component Inspector panel
3. Navigate to "Manual Fix Editor" accordion
4. Monaco Editor loads with component source code
```

#### 2. Edit Component Source
```typescript
// Full IDE-like editing experience
1. Syntax highlighting for TypeScript/JSX
2. Real-time validation and error detection
3. IntelliSense and code completion
4. Multi-cursor editing and selection
5. Code folding and minimap navigation
```

#### 3. Validation and Preview
```typescript
// Validate changes before saving
1. Automatic TypeScript compilation check
2. Syntax error highlighting in editor
3. Validation results in dedicated tab
4. Preview diff between original and modified
5. Line-by-line change comparison
```

#### 4. Save and Backup
```typescript
// Secure save with automatic backup
1. Automatic backup creation before save
2. Server-side file write with validation
3. Rollback token generation
4. Backup metadata storage
5. Success/failure notification
```

### 💾 File Operations

#### Backup Management
```typescript
// Comprehensive backup system
1. View all backups for current component
2. Restore from any previous backup
3. Download backup contents
4. Automatic cleanup of old backups
5. Backup metadata (timestamp, user, changes)
```

#### Component Path Resolution
```typescript
// Intelligent file location
1. Component map generation (/api/editor/components-map)
2. Automatic path detection
3. Support for nested component structures
4. Template generation for missing files
5. Safe path validation (prevent traversal attacks)
```

### 🔄 GitOps Integration

#### Automatic Git Operations
```typescript
// Enable GitOps for automated version control
1. Configure GitOps settings in Manual Fix Editor
2. Auto-commit on successful component save
3. Dedicated fix branches (omai-fixes/<component>)
4. Consistent commit message format
5. Optional Pull Request creation
```

#### Branch Management
```typescript
// Organized Git workflow
1. Branch naming: omai-fixes/<component>-<timestamp>
2. Base branch: configurable (default: main)
3. Auto-push to remote repository
4. PR template with fix summary
5. Cleanup of old fix branches
```

### 🔍 VRT Integration with Manual Fixes

#### Automatic VRT Workflow
```typescript
// Seamless VRT integration
1. Pre-fix snapshot captured on component selection
2. Manual fix applied and saved
3. Post-fix snapshot automatically captured (1s delay)
4. Visual diff analysis performed
5. Results displayed in both VRT tab and Component Inspector
```

#### Real-time VRT Feedback
```typescript
// Live VRT status in Component Inspector
1. VRT status chips (Pre-fix, Manual Fix, Post-fix)
2. Analysis summary (pixel difference, severity, confidence)
3. Quick VRT actions (snapshot, compare, reset)
4. Integration with VRT Dashboard
5. Confidence score adjustments based on results
```

### 🖥️ JIT Terminal Access

#### Secure Shell Access
```typescript
// On-demand terminal sessions for system operations
1. Navigate to Settings → JIT Terminal Access
2. Create new JIT session with timeout
3. WebSocket-based terminal emulation
4. Full shell access with sudo privileges
5. Command logging and session transcripts
```

#### Terminal Features
```typescript
// Comprehensive terminal functionality
1. xterm.js-based terminal emulation
2. Real-time command input/output
3. Session metadata (time remaining, command count)
4. Downloadable session transcripts
5. Secure session termination
```

#### Security Controls
```typescript
// Production-safe terminal access
1. Super_admin role requirement
2. Configurable session timeouts
3. Production environment protection
4. Complete audit logging
5. Session isolation per user
```

### 📁 Backend API Integration

#### Site Editor APIs
```typescript
// RESTful API for component operations
POST /api/editor/save-component     // Save component with backup
POST /api/editor/rollback-component // Rollback to previous version
GET  /api/editor/components-map     // Get component file mapping
GET  /api/editor/component-source   // Load component source code
POST /api/editor/validate-syntax    // Validate TypeScript syntax
GET  /api/editor/backups           // List component backups
```

#### JIT Terminal APIs
```typescript
// WebSocket and REST APIs for terminal access
POST /api/jit/start-session        // Create new JIT session
WS   /api/jit/ws                   // Real-time terminal I/O
POST /api/jit/end-session          // Terminate session
GET  /api/jit/sessions             // List active sessions
GET  /api/jit/audit-logs           // Access terminal logs
```

### ⚙️ Configuration Management

#### Environment Variables
```bash
# Site Editor Configuration
SITE_EDITOR_ENABLED=true
SITE_EDITOR_ALLOW_PRODUCTION=false
SITE_EDITOR_BACKUP_DIR=/var/log/orthodoxmetrics/backups
SITE_EDITOR_AUTO_BACKUP=true
SITE_EDITOR_MAX_BACKUPS=50

# GitOps Configuration
GITOPS_ENABLED=false
GITOPS_AUTO_COMMIT=false
GITOPS_BRANCH_PREFIX=site-editor-fix
GITOPS_DEFAULT_BRANCH=main
GITOPS_CREATE_PR=false

# JIT Terminal Configuration
ALLOW_JIT_TERMINAL=true
JIT_ALLOW_PRODUCTION=false
JIT_TIMEOUT_MINUTES=10
JIT_MAX_SESSIONS=3
JIT_LOG_COMMANDS=true
JIT_LOG_DIR=/var/log/orthodoxmetrics
```

#### Security Settings
```typescript
// Production safeguards and access control
1. Lockdown mode for production environments
2. Super_admin role enforcement
3. Audit logging for all operations
4. File path validation and sanitization
5. Rate limiting and session management
``` 