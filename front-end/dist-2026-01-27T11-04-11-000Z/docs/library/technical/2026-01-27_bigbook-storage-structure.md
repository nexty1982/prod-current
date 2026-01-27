# OM Big Book Storage Structure

## Storage Location

**Primary Storage Path**: `/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook`

## Directory Structure

```
bigbook/
├── storage/                    # Physical file storage
│   ├── documents/             # Original files indexed
│   │   ├── scripts/           # All .js, .ts, .sh, .ps1 files
│   │   ├── docs/              # All .md files
│   │   ├── sql/               # All .sql files
│   │   ├── config/            # All .json, .yaml, .conf files
│   │   └── other/             # Other supported file types
│   ├── backups/               # Big Book system backups
│   ├── cache/                 # Temporary processing files
│   └── uploads/               # User uploaded files
├── index/                     # Search and metadata indexes
│   ├── search.json            # Full-text search index
│   ├── metadata.json          # Document metadata cache
│   ├── relationships.json     # Document relationship graph
│   └── timeline.json          # Document timeline events
├── config/                    # Big Book configuration
│   ├── watchers.json          # File watcher configuration
│   ├── categories.json        # Category definitions
│   ├── tags.json              # Tag definitions
│   └── ai-patterns.json       # AI learning patterns
├── logs/                      # Big Book system logs
│   ├── indexing.log           # File indexing operations
│   ├── ai-learning.log        # AI learning activities
│   ├── search.log             # Search query logs
│   └── execution.log          # Script execution logs
└── web/                       # Web interface assets
    ├── static/                # Static web assets
    ├── templates/             # HTML templates
    └── api/                   # API endpoint handlers
```

## File Organization Strategy

### 1. Document Storage (`storage/documents/`)

#### Scripts Directory
```
scripts/
├── server/                    # Server-side scripts
│   ├── setup/                 # Setup and installation scripts
│   ├── maintenance/           # Maintenance and cleanup scripts
│   ├── deployment/            # Deployment scripts
│   ├── testing/               # Test scripts
│   └── utilities/             # Utility scripts
├── frontend/                  # Frontend scripts
│   ├── build/                 # Build scripts
│   ├── dev/                   # Development scripts
│   └── deployment/            # Frontend deployment
└── database/                  # Database scripts
    ├── migrations/            # Database migrations
    ├── seeds/                 # Data seeding scripts
    └── maintenance/           # Database maintenance
```

#### Documentation Directory
```
docs/
├── architecture/              # System architecture docs
├── api/                       # API documentation
├── deployment/                # Deployment guides
├── troubleshooting/           # Troubleshooting guides
├── user-guides/               # User documentation
└── development/               # Development guides
```

#### SQL Directory
```
sql/
├── schemas/                   # Database schemas
├── migrations/                # Database migrations
├── procedures/                # Stored procedures
├── views/                     # Database views
└── data/                      # Data scripts
```

#### Configuration Directory
```
config/
├── system/                    # System configuration
├── application/               # Application configuration
├── deployment/                # Deployment configuration
└── environment/               # Environment-specific configs
```

### 2. Index Files (`index/`)

#### `search.json`
```json
{
  "version": "1.0",
  "last_updated": "2025-01-26T10:00:00Z",
  "documents": {
    "doc_id": {
      "title": "Document Title",
      "content": "Indexed content for search",
      "keywords": ["keyword1", "keyword2"],
      "file_path": "relative/path/to/file",
      "file_type": "markdown",
      "category": "Documentation",
      "tags": ["tag1", "tag2"],
      "last_modified": "2025-01-26T10:00:00Z"
    }
  },
  "keywords": {
    "keyword1": ["doc_id1", "doc_id2"],
    "keyword2": ["doc_id3"]
  }
}
```

#### `metadata.json`
```json
{
  "version": "1.0",
  "last_updated": "2025-01-26T10:00:00Z",
  "statistics": {
    "total_documents": 150,
    "by_category": {
      "Scripts": 45,
      "Documentation": 30,
      "Database": 25,
      "Configuration": 20,
      "Testing": 15,
      "Deployment": 10,
      "Maintenance": 5
    },
    "by_file_type": {
      "markdown": 50,
      "javascript": 40,
      "sql": 25,
      "bash": 20,
      "json": 10,
      "typescript": 5
    }
  },
  "recent_activity": [
    {
      "timestamp": "2025-01-26T10:00:00Z",
      "action": "document_updated",
      "doc_id": "doc_id",
      "details": "Document was updated"
    }
  ]
}
```

#### `relationships.json`
```json
{
  "version": "1.0",
  "last_updated": "2025-01-26T10:00:00Z",
  "relationships": {
    "doc_id1": {
      "depends_on": ["doc_id2", "doc_id3"],
      "references": ["doc_id4"],
      "similar_to": ["doc_id5"]
    }
  },
  "graph_data": {
    "nodes": [
      {"id": "doc_id1", "label": "Document 1", "category": "Scripts"},
      {"id": "doc_id2", "label": "Document 2", "category": "Database"}
    ],
    "edges": [
      {"source": "doc_id1", "target": "doc_id2", "type": "depends_on"}
    ]
  }
}
```

### 3. Configuration Files (`config/`)

#### `watchers.json`
```json
{
  "version": "1.0",
  "watchers": [
    {
      "id": "main_project",
      "path": "/var/www/orthodox-church-mgmt/orthodoxmetrics/prod",
      "patterns": ["**/*.md", "**/*.sql", "**/*.js", "**/*.ts", "**/*.sh", "**/*.ps1"],
      "exclude": ["**/node_modules/**", "**/.git/**", "**/logs/**", "**/temp/**"],
      "enabled": true,
      "scan_interval": 300
    },
    {
      "id": "server_scripts",
      "path": "/var/www/orthodox-church-mgmt/orthodoxmetrics/prod/server/scripts",
      "patterns": ["**/*.js", "**/*.sh", "**/*.sql"],
      "exclude": ["**/backups/**", "**/temp/**"],
      "enabled": true,
      "scan_interval": 300
    }
  ]
}
```

#### `categories.json`
```json
{
  "version": "1.0",
  "categories": [
    {
      "id": 1,
      "name": "Scripts",
      "description": "Automation and utility scripts",
      "color": "#28a745",
      "icon": "code",
      "sort_order": 1,
      "parent_id": null
    },
    {
      "id": 2,
      "name": "Documentation",
      "description": "System documentation and guides",
      "color": "#17a2b8",
      "icon": "book",
      "sort_order": 2,
      "parent_id": null
    }
  ]
}
```

### 4. Log Files (`logs/`)

#### `indexing.log`
```
[2025-01-26 10:00:00] INFO: Starting file indexing scan
[2025-01-26 10:00:01] INFO: Indexed 15 new files
[2025-01-26 10:00:02] INFO: Updated 3 existing files
[2025-01-26 10:00:03] INFO: Removed 1 deleted files
[2025-01-26 10:00:04] INFO: Indexing scan completed
```

#### `ai-learning.log`
```
[2025-01-26 10:00:00] INFO: AI pattern analysis started
[2025-01-26 10:00:01] INFO: Found 5 new script patterns
[2025-01-26 10:00:02] INFO: Generated 3 recommendations
[2025-01-26 10:00:03] INFO: Updated confidence scores
```

## File Naming Conventions

### Document IDs
- Format: `{category}_{filename}_{timestamp}`
- Example: `scripts_sdlc-backup-manager_20250126_100000`

### Backup Files
- Format: `bigbook_backup_{timestamp}.zip`
- Example: `bigbook_backup_20250126_100000.zip`

### Index Files
- Format: `{index_type}_{version}_{timestamp}.json`
- Example: `search_1.0_20250126_100000.json`

## Storage Configuration

### Database Configuration
- **Database**: `orthodoxmetrics_db`
- **Tables**: All `bigbook_*` tables
- **Connection**: Uses existing database connection

### File System Permissions
```bash
# Directory permissions
chmod 755 /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook
chmod 755 /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/storage
chmod 755 /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/index
chmod 755 /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/config
chmod 755 /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/logs

# File permissions
chmod 644 /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/config/*.json
chmod 644 /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook/index/*.json

# Ownership
chown -R www-data:www-data /var/www/orthodox-church-mgmt/orthodoxmetrics/prod/bigbook
```

### Backup Strategy
- **Frequency**: Daily at 2:00 AM
- **Retention**: 30 days
- **Location**: `/var/backups/orthodoxmetrics/bigbook/`
- **Format**: Compressed archive with metadata

### Performance Considerations
- **Index Updates**: Incremental updates every 5 minutes
- **Search Index**: Full rebuild weekly
- **Cache**: 24-hour cache for frequently accessed documents
- **Compression**: Gzip compression for large text files

## Integration Points

### With Existing Systems
- **SDLC Backup**: Big Book data included in SDLC backups
- **NFS Storage**: Optional NFS backup for Big Book data
- **Logging**: Integrated with existing logging system
- **Authentication**: Uses existing user authentication

### API Endpoints
- **Document Management**: CRUD operations for documents
- **Search**: Full-text search with filters
- **AI Integration**: Pattern analysis and recommendations
- **Timeline**: Document history and events
- **Relationships**: Document dependency management 