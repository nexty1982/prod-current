# Database Schema Documentation

## 🗄️ Orthodox Church Management System - Database Schema

This document provides a comprehensive overview of the database schema, including all tables, relationships, indexes, and data integrity constraints.

---

## 📊 Database Overview

**Database Engine**: MySQL 8.0+  
**Character Set**: utf8mb4  
**Collation**: utf8mb4_unicode_ci  
**Database Name**: `orthodoxmetrics_db`

---

## 👥 **User Management Tables**

### users
Primary table for user accounts and authentication.

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin', 'priest', 'deacon', 'user') DEFAULT 'user',
    church_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone VARCHAR(20),
    last_login TIMESTAMP NULL,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_church_id (church_id),
    INDEX idx_active (is_active)
);
```

**Key Fields**:
- `id`: Primary key, auto-incrementing
- `email`: Unique identifier for login
- `password_hash`: Bcrypt hashed password
- `role`: User access level
- `church_id`: Associated church (nullable)
- `is_active`: Account status flag

---

## 🏛️ **Church Management Tables**

### churches
Master table for church organizations.

```sql
CREATE TABLE churches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    pastor VARCHAR(255),
    denomination VARCHAR(100) DEFAULT 'Orthodox',
    language VARCHAR(50) DEFAULT 'English',
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    currency VARCHAR(10) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    founded_date DATE,
    description TEXT,
    logo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_city (city),
    INDEX idx_state (state),
    INDEX idx_active (is_active)
);
```

**Key Fields**:
- `name`: Church name
- `pastor`: Current pastor/priest
- `denomination`: Religious denomination
- `timezone`: Local timezone for events
- `currency`: Preferred currency for financial transactions

---

## 📜 **Orthodox Church Records Tables**

### baptism_records
Records of baptism ceremonies.

```sql
CREATE TABLE baptism_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    person_name VARCHAR(255) NOT NULL,
    birth_date DATE,
    birth_place VARCHAR(255),
    baptism_date DATE NOT NULL,
    priest_name VARCHAR(255) NOT NULL,
    godparent_names TEXT,
    parents_names TEXT,
    church_id INT NOT NULL,
    certificate_number VARCHAR(100) UNIQUE,
    witness_names TEXT,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_person_name (person_name),
    INDEX idx_baptism_date (baptism_date),
    INDEX idx_church_id (church_id),
    INDEX idx_certificate_number (certificate_number),
    INDEX idx_priest_name (priest_name)
);
```

### marriage_records
Records of marriage ceremonies.

```sql
CREATE TABLE marriage_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    groom_name VARCHAR(255) NOT NULL,
    groom_birth_date DATE,
    groom_birth_place VARCHAR(255),
    bride_name VARCHAR(255) NOT NULL,
    bride_birth_date DATE,
    bride_birth_place VARCHAR(255),
    marriage_date DATE NOT NULL,
    priest_name VARCHAR(255) NOT NULL,
    witness1_name VARCHAR(255),
    witness2_name VARCHAR(255),
    church_id INT NOT NULL,
    certificate_number VARCHAR(100) UNIQUE,
    marriage_license_number VARCHAR(100),
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_groom_name (groom_name),
    INDEX idx_bride_name (bride_name),
    INDEX idx_marriage_date (marriage_date),
    INDEX idx_church_id (church_id),
    INDEX idx_certificate_number (certificate_number)
);
```

### funeral_records
Records of funeral services.

```sql
CREATE TABLE funeral_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deceased_name VARCHAR(255) NOT NULL,
    birth_date DATE,
    death_date DATE NOT NULL,
    funeral_date DATE NOT NULL,
    priest_name VARCHAR(255) NOT NULL,
    burial_place VARCHAR(255),
    age_at_death INT,
    cause_of_death VARCHAR(255),
    surviving_family TEXT,
    church_id INT NOT NULL,
    certificate_number VARCHAR(100) UNIQUE,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_deceased_name (deceased_name),
    INDEX idx_death_date (death_date),
    INDEX idx_funeral_date (funeral_date),
    INDEX idx_church_id (church_id),
    INDEX idx_certificate_number (certificate_number)
);
```

### certificates
Generated certificates for various records.

```sql
CREATE TABLE certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    certificate_number VARCHAR(100) UNIQUE NOT NULL,
    certificate_type ENUM('baptism', 'marriage', 'funeral', 'confirmation', 'other') NOT NULL,
    record_id INT NOT NULL,
    record_type VARCHAR(50) NOT NULL,
    generated_by INT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pdf_path VARCHAR(500),
    template_used VARCHAR(100),
    is_official BOOLEAN DEFAULT TRUE,
    church_id INT NOT NULL,
    
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE RESTRICT,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_certificate_number (certificate_number),
    INDEX idx_certificate_type (certificate_type),
    INDEX idx_record_id_type (record_id, record_type),
    INDEX idx_church_id (church_id)
);
```

---

## 📝 **Application Data Tables**

### notes
User personal notes and memos.

```sql
CREATE TABLE notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    category VARCHAR(100) DEFAULT 'general',
    color VARCHAR(20) DEFAULT 'blue',
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    tags JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_category (category),
    INDEX idx_pinned (is_pinned),
    INDEX idx_archived (is_archived),
    FULLTEXT idx_content (title, content)
);
```

### notifications
System and user notifications.

```sql
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    is_global BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_read (is_read),
    INDEX idx_global (is_global),
    INDEX idx_created_at (created_at)
);
```

---

## 📊 **Financial Tables**

### invoices
Invoice management system.

```sql
CREATE TABLE invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255),
    client_address TEXT,
    amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
    due_date DATE,
    paid_date DATE NULL,
    description TEXT,
    notes TEXT,
    church_id INT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_client_name (client_name),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date),
    INDEX idx_church_id (church_id)
);
```

### invoice_items
Individual line items for invoices.

```sql
CREATE TABLE invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(8,2) DEFAULT 1.00,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    sort_order INT DEFAULT 0,
    
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    INDEX idx_invoice_id (invoice_id)
);
```

---

## 📅 **Calendar Tables**

### calendar_events
Calendar events and liturgical calendar.

```sql
CREATE TABLE calendar_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME,
    all_day BOOLEAN DEFAULT FALSE,
    event_type ENUM('liturgy', 'feast', 'fast', 'meeting', 'other') DEFAULT 'other',
    recurrence_rule VARCHAR(255),
    is_recurring BOOLEAN DEFAULT FALSE,
    church_id INT,
    created_by INT,
    is_public BOOLEAN DEFAULT TRUE,
    color VARCHAR(20) DEFAULT 'blue',
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_start_date (start_date),
    INDEX idx_end_date (end_date),
    INDEX idx_event_type (event_type),
    INDEX idx_church_id (church_id),
    INDEX idx_public (is_public)
);
```

---

## 🗂️ **Project Management Tables**

### kanban_boards
Kanban boards for project management.

```sql
CREATE TABLE kanban_boards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    church_id INT,
    created_by INT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    background_color VARCHAR(20) DEFAULT 'blue',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_church_id (church_id),
    INDEX idx_created_by (created_by)
);
```

### kanban_columns
Columns within kanban boards.

```sql
CREATE TABLE kanban_columns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    board_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    position INT NOT NULL,
    color VARCHAR(20) DEFAULT 'gray',
    
    FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE,
    INDEX idx_board_id (board_id),
    INDEX idx_position (position)
);
```

### kanban_cards
Cards within kanban columns.

```sql
CREATE TABLE kanban_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    column_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    position INT NOT NULL,
    assigned_to INT,
    due_date DATE,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    labels JSON,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (column_id) REFERENCES kanban_columns(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_column_id (column_id),
    INDEX idx_position (position),
    INDEX idx_assigned_to (assigned_to)
);
```

---

## ⚙️ **System Management Tables**

### menu_items
Dynamic menu structure.

```sql
CREATE TABLE menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    path VARCHAR(255),
    icon VARCHAR(100),
    parent_id INT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_system_required BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    INDEX idx_menu_key (menu_key),
    INDEX idx_parent_id (parent_id),
    INDEX idx_display_order (display_order),
    INDEX idx_active (is_active)
);
```

### role_menu_permissions
Role-based menu access control.

```sql
CREATE TABLE role_menu_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_item_id INT NOT NULL,
    role ENUM('super_admin', 'admin', 'priest', 'deacon', 'user') NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_menu_role (menu_item_id, role),
    INDEX idx_menu_item_id (menu_item_id),
    INDEX idx_role (role)
);
```

### system_logs
Application logging.

```sql
CREATE TABLE system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level ENUM('error', 'warn', 'info', 'debug') NOT NULL,
    component VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    metadata JSON,
    user_id INT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_level (level),
    INDEX idx_component (component),
    INDEX idx_created_at (created_at),
    INDEX idx_user_id (user_id)
);
```

---

## 🔍 **OCR and File Management Tables**

### ocr_sessions
OCR processing sessions.

```sql
CREATE TABLE ocr_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    ocr_result TEXT,
    confidence_score DECIMAL(5,2),
    processing_time INT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);
```

---

## 🔐 **Session Management Tables**

### sessions
Express session storage.

```sql
CREATE TABLE sessions (
    session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
    expires INT(11) UNSIGNED NOT NULL,
    data MEDIUMTEXT COLLATE utf8mb4_bin,
    PRIMARY KEY (session_id)
);
```

---

## 🔗 **Database Relationships**

### Primary Relationships
```sql
-- Users belong to churches
users.church_id → churches.id

-- Orthodox records belong to churches
baptism_records.church_id → churches.id
marriage_records.church_id → churches.id
funeral_records.church_id → churches.id

-- Records are created by users
baptism_records.created_by → users.id
marriage_records.created_by → users.id
funeral_records.created_by → users.id

-- User-specific data
notes.user_id → users.id
notifications.user_id → users.id

-- System permissions
role_menu_permissions.menu_item_id → menu_items.id

-- Project management
kanban_boards.church_id → churches.id
kanban_boards.created_by → users.id
kanban_cards.assigned_to → users.id
```

### Referential Integrity
- **CASCADE**: Child records deleted when parent is deleted
- **SET NULL**: Foreign key set to NULL when parent is deleted
- **RESTRICT**: Prevent deletion of parent if children exist

---

## 📈 **Indexes and Performance**

### Primary Indexes
- All tables have auto-incrementing primary keys
- Unique constraints on email addresses and certificate numbers

### Search Indexes
- Email lookup: `idx_email` on users table
- Role-based queries: `idx_role` on users table
- Church associations: `idx_church_id` on multiple tables
- Date range queries: `idx_created_at`, `idx_baptism_date`, etc.

### Full-Text Indexes
- Notes search: `FULLTEXT idx_content` on notes table
- Log search: Planned for system_logs table

---

## 🔒 **Security Considerations**

### Data Protection
- Password hashing with bcrypt (stored in application layer)
- Sensitive data encrypted at rest (planned)
- Audit trail for record modifications

### Access Control
- Role-based permissions at database level
- User isolation through church_id relationships
- Soft deletes for critical records (planned)

### Backup Strategy
- Daily automated backups
- Point-in-time recovery capability
- Cross-region backup storage (planned)

---

## 📊 **Database Statistics**

### Table Sizes (Estimated)
- **users**: ~1,000 records
- **churches**: ~100 records
- **baptism_records**: ~10,000 records
- **marriage_records**: ~2,000 records
- **funeral_records**: ~5,000 records
- **notes**: ~50,000 records
- **notifications**: ~100,000 records

### Storage Requirements
- **Current**: ~500 MB
- **Projected (1 year)**: ~2 GB
- **Projected (5 years)**: ~10 GB

---

## 🔧 **Database Maintenance**

### Regular Tasks
- **Daily**: Backup creation
- **Weekly**: Index optimization
- **Monthly**: Statistics update
- **Quarterly**: Performance review

### Monitoring
- Query performance tracking
- Index usage analysis
- Storage growth monitoring
- Connection pool monitoring

---

## 🚀 **Future Enhancements**

### Planned Features
- **Audit Logging**: Complete change history
- **Data Archiving**: Historical data management
- **Performance Optimization**: Advanced indexing
- **Data Encryption**: Enhanced security
- **Multi-tenancy**: Church isolation improvements

### Scaling Considerations
- **Read Replicas**: Query performance
- **Sharding**: Data distribution
- **Caching Layer**: Redis integration
- **Connection Pooling**: Enhanced concurrency

This database schema provides a solid foundation for the Orthodox Church Management System with proper relationships, indexes, and security considerations.