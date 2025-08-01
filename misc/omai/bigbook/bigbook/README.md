# OrthodoxMetrics Big Book System

## Overview
The Big Book is a comprehensive knowledge management system for OrthodoxMetrics that indexes, organizes, and provides AI-powered insights for all scripts, documentation, and configuration files.

## Architecture
- **Storage**: `/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/`
- **Database**: `omai_db` (bigbook_* tables)
- **Web Interface**: Integrated with existing OrthodoxMetrics frontend

## Components

### 1. Storage Structure
- `storage/documents/` - Original files organized by type
- `index/` - Search indexes and metadata
- `config/` - System configuration files
- `logs/` - System operation logs
- `web/` - Web interface assets

### 2. Database Schema
- `bigbook_documents` - Main document storage
- `bigbook_relationships` - Document dependencies
- `bigbook_executions` - Script execution history
- `bigbook_ai_patterns` - AI learning patterns
- `bigbook_recommendations` - AI recommendations
- `bigbook_timeline` - Document change history

### 3. File Watchers
- Main project directory monitoring
- Server scripts monitoring
- Documentation monitoring
- Automatic indexing every 5 minutes

## Quick Commands
- `bigbook-status` - Check system status
- `bigbook-backup` - Create system backup

## Next Steps
1. Start the indexing service
2. Configure the web interface
3. Set up AI learning system
4. Migrate existing documents

## Support
See the main OrthodoxMetrics documentation for detailed information.
