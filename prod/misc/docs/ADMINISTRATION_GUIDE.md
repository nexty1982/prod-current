# Administration Guide - Orthodox Metrics

## 👥 Church Administration Overview

This guide covers daily administrative tasks for managing your Orthodox church through the Orthodox Metrics system.

## 🏛️ Church Setup and Configuration

### Initial Church Setup

#### Church Profile Configuration
1. **Access Admin Panel**: Navigate to `/admin` and login
2. **Church Information**: Update basic church details
   - Church name (in multiple languages if needed)
   - Address and contact information
   - Diocese and jurisdiction
   - Founding date and patron saint

3. **Branding Setup**:
   - Upload church logo (recommended: 200x200px PNG)
   - Upload banner image (recommended: 1200x400px)
   - Choose liturgical color scheme
   - Set Orthodox calendar preferences

#### Orthodox Calendar Integration
```javascript
// Calendar configuration options
{
  jurisdiction: "goarch|oca|antiochian|serbian|romanian|bulgarian",
  calendar: "new|old",  // New Calendar (Gregorian) or Old Calendar (Julian)
  language: "en|el|ru|ro|ka",
  showSaints: true,
  showFasts: true,
  showFeasts: true
}
```

### Church Settings Management

#### Multilingual Support Setup
1. **Primary Language**: Set church's primary language
2. **Secondary Languages**: Enable additional languages for community
3. **Content Translation**: Configure automatic translation preferences
4. **Document OCR Languages**: Set expected languages for document processing

#### Custom Menu Configuration
```sql
-- Menu items are dynamically configurable
INSERT INTO menu_items (church_id, title, url, icon, parent_id, sort_order, permissions) 
VALUES (1, 'Parish Events', '/events', 'calendar', NULL, 1, 'admin,user');
```

## 👤 User Management

### User Roles and Permissions

#### Role Hierarchy
```
Super Admin (System Level)
├── Create/delete churches
├── Manage church administrators
├── System configuration
└── Cross-church reporting

Church Admin (Church Level)
├── Manage church users
├── Configure church settings
├── Process OCR documents
├── Manage church content
└── View church analytics

Church User (Limited Access)
├── View assigned records
├── Submit OCR documents
├── Basic profile management
└── Church directory access
```

### Creating and Managing Users

#### Adding New Users
1. **Navigate**: Admin Panel → User Management → Add User
2. **Required Information**:
   - Full name and email address
   - Initial password (user must change on first login)
   - Role assignment
   - Church association (automatic for church admins)
   - Department or ministry assignment (optional)

3. **Permission Configuration**:
   - Record access permissions
   - OCR processing permissions
   - Content management permissions
   - Administrative permissions

#### User Account Lifecycle
```javascript
// User creation process
const createUser = async (userData) => {
  // 1. Validate email uniqueness within church
  // 2. Hash password with bcrypt
  // 3. Assign default permissions based on role
  // 4. Send welcome email with temporary password
  // 5. Log user creation in audit trail
  // 6. Set account as "pending first login"
};
```

#### Bulk User Import
```csv
# CSV format for bulk user import
name,email,role,department,notes
"John Komnenos","john@church.org","user","choir","Choir director"
"Maria Paleologos","maria@church.org","admin","office","Church secretary"
```

### User Activity Monitoring

#### Audit Trail
The system maintains comprehensive logs:
- Login/logout activities
- Record access and modifications
- OCR document submissions
- Administrative actions
- Permission changes

#### Session Management
- View active user sessions
- Force logout for security
- Monitor concurrent session limits
- Track login attempts and failures

## 📄 OCR Document Management

### Document Processing Workflow

#### 1. Document Upload
**Supported Formats**: PDF, JPEG, PNG, TIFF
**Maximum Size**: 50MB per file
**Batch Upload**: Up to 20 files simultaneously

**Upload Process**:
1. Select document type (Baptism/Marriage/Funeral)
2. Choose expected language
3. Add metadata (date range, church origin if different)
4. Upload files through secure interface

#### 2. OCR Processing
```javascript
// OCR processing pipeline
const processDocument = async (file, metadata) => {
  // 1. Security validation and virus scanning
  // 2. Google Vision API text extraction
  // 3. Language detection and verification
  // 4. Orthodox terminology recognition
  // 5. Record type classification
  // 6. Structured data extraction
  // 7. Confidence scoring
  // 8. Queue for manual review
};
```

#### 3. Review and Approval
**Review Interface Features**:
- Side-by-side original image and extracted text
- Highlighting of low-confidence extractions
- Manual correction tools
- Orthodox terminology suggestions
- Batch approval for high-confidence results

**Quality Assurance**:
- Minimum confidence threshold: 85%
- Required fields validation
- Date format verification
- Name consistency checking

#### 4. Record Integration
Approved OCR results are automatically:
- Stored in structured database format
- Linked to church member records (if existing)
- Indexed for search functionality
- Added to statistical reports

### Orthodox Record Types

#### Baptism Records
**Essential Fields**:
- Baptized person's name
- Birth date and baptism date
- Parents' names
- Godparents' names
- Presiding priest
- Church location
- Special notes (chrismation, adult baptism)

#### Marriage Records
**Essential Fields**:
- Bride and groom names
- Marriage date and location
- Witnesses' names
- Presiding priest
- Previous marriage status
- Special circumstances

#### Funeral Records
**Essential Fields**:
- Deceased person's name
- Birth date and death date
- Funeral date and location
- Cause of death (if recorded)
- Presiding priest
- Burial location
- Memorial service dates

### OCR Quality Management

#### Language-Specific Considerations

**Greek Text Processing**:
- Classical Greek recognition
- Modern Greek variations
- Diacritical mark handling
- Church Greek terminology

**Cyrillic Script (Russian)**:
- Church Slavonic elements
- Modern Russian variations
- Calligraphy recognition
- Orthodox terminology

**Multi-Language Documents**:
- Automatic language detection
- Mixed-language processing
- Translation assistance
- Cultural context preservation

## 📊 Content Management

### Church Website Content

#### Homepage Management
- **Banner Content**: Update church announcements
- **Service Times**: Maintain current liturgical schedule
- **News and Events**: Post parish announcements
- **Photo Galleries**: Upload and organize church photos

#### Page Management
```javascript
// Dynamic page creation
const createPage = {
  title: "About Our Parish",
  slug: "about",
  content: "HTML or Markdown content",
  language: "en",
  published: true,
  orthodox_calendar_events: true,
  permissions: ["public", "member", "admin"]
};
```

### Document Library Management

#### Organizing Church Documents
**Categories**:
- Liturgical texts and music
- Parish bylaws and policies
- Historical documents
- Educational materials
- Financial reports (admin only)

**File Management**:
- Folder organization by category
- Version control for updated documents
- Access permission management
- Search functionality
- Download tracking

### Newsletter and Communication

#### Email Communication System
- **Mailing Lists**: Organize by ministry, age group, language
- **Templates**: Orthodox-themed email templates
- **Scheduling**: Plan communications around liturgical calendar
- **Analytics**: Track open rates and engagement

#### Announcement Management
- **Priority Levels**: Urgent, normal, informational
- **Targeting**: Specific groups or entire parish
- **Scheduling**: Post-date announcements
- **Multi-language**: Automatic translation options

## 📈 Reporting and Analytics

### Church Statistics

#### Membership Analytics
- **Growth Trends**: New members over time
- **Demographics**: Age distribution, family units
- **Participation**: Service attendance patterns
- **Geographic**: Member location mapping

#### Sacramental Statistics
```sql
-- Sample reporting queries
SELECT 
  YEAR(baptism_date) as year,
  COUNT(*) as baptisms,
  AVG(age_at_baptism) as avg_age
FROM baptism_records 
WHERE church_id = ? 
GROUP BY YEAR(baptism_date)
ORDER BY year DESC;
```

#### OCR Processing Reports
- **Document Processing Volume**: Daily/monthly statistics
- **Processing Quality**: Accuracy rates by document type
- **Language Distribution**: Documents processed by language
- **Review Time**: Average time from upload to approval

### Financial Integration

#### Donation Tracking
- **Stewardship Records**: Annual giving statements
- **Special Collections**: Feast day and project donations
- **Memorial Donations**: Funeral and memorial contributions
- **Candle and Service Requests**: Traditional offerings

#### Report Generation
**Standard Reports**:
- Monthly financial summary
- Annual stewardship report
- Sacramental statistics
- Membership directory updates

**Custom Reports**:
- Orthodox calendar-based reporting
- Ministry-specific analytics
- Multi-year trend analysis
- Comparative diocese statistics

## 🔧 System Maintenance

### Regular Administrative Tasks

#### Daily Tasks
- Review new user registrations
- Check OCR processing queue
- Monitor system health alerts
- Review security logs
- Update announcements

#### Weekly Tasks
- Database backup verification
- User activity review
- Content update review
- System performance check
- Email communication planning

#### Monthly Tasks
- Generate statistical reports
- Review user permissions
- System security audit
- Database optimization
- Backup rotation management

### Backup and Recovery

#### Automated Backup System
```bash
# Daily automated backup script
node database/database-manager.js backup --schedule=daily
```

**Backup Components**:
- Database full backup (daily)
- Incremental backups (hourly)
- Uploaded documents backup
- Configuration backup
- System logs archive

#### Recovery Procedures
```bash
# Database recovery commands
node database/database-manager.js restore --backup-file=backup_20250718.sql
node database/database-manager.js validate --post-restore
```

### Security Management

#### Regular Security Tasks
- **Password Policy Enforcement**: Ensure strong passwords
- **Session Monitoring**: Track unusual login patterns
- **Permission Audits**: Regular review of user permissions
- **System Updates**: Keep software components updated
- **SSL Certificate Management**: Monitor certificate expiration

#### Security Incident Response
1. **Immediate Actions**: Disable affected accounts
2. **Investigation**: Review audit logs and access patterns
3. **Containment**: Isolate compromised systems
4. **Recovery**: Restore from clean backups if needed
5. **Documentation**: Record incident details and lessons learned

## 📞 User Support

### Common User Issues

#### Password Reset Process
1. **User Requests**: Self-service password reset via email
2. **Admin Reset**: Manual password reset for users
3. **Security Questions**: Additional verification if needed
4. **Temporary Access**: Emergency access procedures

#### Training Resources
- **User Manuals**: Role-specific documentation
- **Video Tutorials**: Screen-recorded demonstrations
- **Help Desk**: Contact information and hours
- **FAQ Section**: Common questions and answers

### Integration with Orthodox Practices

#### Liturgical Calendar Integration
- **Automatic Updates**: Feast days and fasting periods
- **Service Scheduling**: Divine Liturgy and special services
- **Saint Days**: Daily saint commemorations
- **Lectionary**: Scripture readings for services

#### Cultural Sensitivity
- **Orthodox Terminology**: Use proper ecclesiastical terms
- **Multiple Jurisdictions**: Support for different Orthodox traditions
- **Language Respect**: Preserve original language records
- **Tradition Maintenance**: Honor historical practices

---

This administration guide provides the foundation for effective church management while maintaining respect for Orthodox traditions and ensuring security. For technical issues, refer to the [Troubleshooting Guide](TROUBLESHOOTING.md). 🏛️✨
