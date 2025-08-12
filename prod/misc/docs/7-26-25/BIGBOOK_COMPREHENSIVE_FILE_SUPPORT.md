# OM Big Book - Comprehensive File Support System

## Overview

The OM Big Book system has been expanded to handle **all types of files and documents**, making it a comprehensive knowledge management and execution platform for OrthodoxMetrics.

## 🗂️ Supported File Types

### 📝 Documents & Text
- **Markdown** (`.md`, `.markdown`) - Documentation, guides, notes
- **Text** (`.txt`, `.log`) - Plain text files, logs
- **PDF** (`.pdf`) - Portable documents

### 💻 Code & Scripts
- **SQL** (`.sql`) - Database queries and scripts
- **JavaScript** (`.js`, `.jsx`, `.ts`, `.tsx`) - Node.js scripts, React components
- **Shell Scripts** (`.sh`, `.bash`, `.zsh`) - Linux/Unix scripts
- **Python** (`.py`, `.python`) - Python scripts and automation
- **HTML** (`.html`, `.htm`) - Web pages and templates
- **CSS** (`.css`, `.scss`, `.sass`) - Stylesheets
- **JSON** (`.json`) - Configuration and data files
- **XML** (`.xml`) - Structured data files

### 🎨 Media Files
- **Images** (`.jpg`, `.jpeg`, `.png`, `.gif`, `.svg`, `.webp`) - Graphics and photos
- **Videos** (`.mp4`, `.avi`, `.mov`, `.wmv`) - Video files
- **Audio** (`.mp3`, `.wav`, `.ogg`) - Audio files

### 📦 Archives
- **Compressed** (`.zip`, `.tar`, `.gz`, `.rar`) - Archive files

## 🚀 Features

### File Upload & Management
- **Drag & Drop** interface for easy file upload
- **Multiple file selection** support
- **File type detection** with appropriate icons and colors
- **File size validation** (max 10MB per file)
- **Real-time upload feedback**

### File Execution & Processing
- **SQL Execution** - Direct database query execution
- **Script Execution** - Shell, JavaScript, and Python script execution
- **Document Processing** - Markdown and text file processing
- **Media Handling** - Image, video, and audio file management
- **Archive Processing** - Compressed file handling

### Console & Logging
- **Real-time console output** for all operations
- **Execution logging** to database and files
- **Error handling** with detailed error messages
- **Performance tracking** with execution duration

### Settings Management
- **Database configuration** (user, password, database)
- **Sudo support** for elevated script execution
- **Timeout settings** for long-running operations
- **File size limits** configuration

## 🎯 Use Cases

### Documentation Management
```
📁 Upload markdown files (.md)
📝 Process and store documentation
🔍 Search and retrieve documents
📊 Track document versions and changes
```

### Script Automation
```
💻 Upload shell scripts (.sh)
⚡ Execute with sudo privileges
📊 Monitor execution results
📈 Track performance metrics
```

### Database Operations
```
🗄️ Upload SQL files (.sql)
🔧 Execute database queries
📊 View query results
📈 Monitor database performance
```

### Code Management
```
💻 Upload JavaScript/Python files
⚡ Execute Node.js/Python scripts
📊 View execution output
🔍 Debug and troubleshoot
```

### Media Management
```
🖼️ Upload images and videos
📁 Organize media files
🔍 Search and categorize
📊 Track file metadata
```

## 🔧 Technical Implementation

### Frontend Components
- **Material-UI** based interface
- **TypeScript** for type safety
- **Drag & Drop** file handling
- **Real-time console** output
- **File type detection** with icons

### Backend Processing
- **Express.js** API endpoints
- **File type routing** to appropriate handlers
- **Temporary file management** for execution
- **Database logging** of all operations
- **Error handling** and recovery

### File Type Handlers
```javascript
// SQL Files
executeSqlFile(content, settings)

// Shell Scripts  
executeShellScript(content, settings)

// JavaScript Files
executeJavaScriptFile(content, settings)

// Python Files
executePythonFile(content, settings)

// Document Files
processDocumentFile(content, fileName, fileType)
```

## 📊 Database Schema

The system uses the `omai_db` database with tables for:
- **bigbook_documents** - File metadata and content
- **bigbook_executions** - Execution history and results
- **bigbook_config** - System and user settings
- **bigbook_logs** - Activity logging

## 🔒 Security Features

- **File size limits** to prevent abuse
- **Execution timeouts** for long-running operations
- **Sudo password protection** for elevated privileges
- **Database connection security** with user credentials
- **Temporary file cleanup** after execution

## 🎨 User Interface

### File Type Icons
- 📄 **Markdown** - Article icon
- 💻 **JavaScript** - Code icon  
- 🐚 **Shell** - Terminal icon
- 🐍 **Python** - Code icon
- 🌐 **HTML** - Web icon
- 🎨 **CSS** - Style icon
- 📊 **JSON** - Data icon
- 📄 **Text** - Document icon
- 🖼️ **Images** - Image icon
- 🎥 **Videos** - Video icon
- 🎵 **Audio** - Audio icon
- 📦 **Archives** - Archive icon
- 📄 **PDF** - PDF icon

### Color-Coded Chips
- **SQL** - Primary (blue)
- **Markdown** - Info (light blue)
- **JavaScript** - Warning (orange)
- **Shell** - Success (green)
- **Python** - Secondary (purple)
- **HTML** - Error (red)
- **CSS** - Info (light blue)
- **JSON** - Warning (orange)
- **Text** - Default (gray)

## 🚀 Getting Started

### 1. Access the System
Navigate to: `https://orthodoxmetrics.com/admin/bigbook`

### 2. Upload Files
- **Drag & drop** files into the upload area
- **Click to browse** and select files
- **Multiple files** can be uploaded at once

### 3. Execute Files
- **Click the play button** next to any file
- **View real-time output** in the console
- **Check execution logs** for details

### 4. Configure Settings
- **Click Settings** to configure database and execution options
- **Set sudo password** for elevated script execution
- **Adjust timeouts** for long-running operations

## 📈 Monitoring & Logging

### Console Output
- **Real-time execution** feedback
- **Error messages** with details
- **Performance metrics** (execution time)
- **File processing** status

### Log Files
- **execution.log** - All execution attempts
- **documents.log** - Document processing
- **settings.log** - Configuration changes

### Database Logs
- **bigbook_executions** - Execution history
- **bigbook_documents** - File metadata
- **bigbook_config** - Settings history

## 🔧 Troubleshooting

### Common Issues
1. **File upload fails** - Check file size limits
2. **Script execution fails** - Verify sudo password
3. **Database connection fails** - Check credentials
4. **Timeout errors** - Increase timeout settings

### Debug Commands
```bash
# Check Big Book logs
tail -f /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/logs/execution.log

# Check database status
mysql -u omai_user -p omai_db -e "SELECT * FROM bigbook_executions ORDER BY created_at DESC LIMIT 10;"

# Check file permissions
ls -la /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/storage/
```

## 🎯 Next Steps

### Planned Enhancements
- **File versioning** and history tracking
- **Advanced search** and filtering
- **File relationships** and dependencies
- **Automated execution** scheduling
- **API integration** with external services
- **Collaborative editing** features

### Integration Opportunities
- **Git integration** for version control
- **CI/CD pipeline** integration
- **Monitoring dashboard** integration
- **Notification system** for execution results
- **Backup and restore** functionality

---

**The OM Big Book system is now a comprehensive file management and execution platform, ready to handle all your OrthodoxMetrics documentation, scripts, and media files!** 🚀 