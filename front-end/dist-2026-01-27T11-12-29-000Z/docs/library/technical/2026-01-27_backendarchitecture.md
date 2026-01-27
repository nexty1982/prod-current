# Backend Architecture Documentation

## 🏗️ Orthodox Church Management System - Backend Architecture

This document provides a comprehensive overview of the backend architecture, including server structure, database design, API organization, and system components.

---

## 🚀 Application Entry Point

### index.js
The main entry point for the Orthodox Church Management System backend.

**Location**: `z:\server\index.js`

**Key Features**:
- Express.js application setup
- Middleware configuration
- Route mounting (both direct and `/api` prefixed)
- Session management
- Database connectivity
- Error handling

**Route Mounting Strategy**:
```javascript
// Direct routes (for nginx proxy compatibility)
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/notifications', notificationRoutes);
app.use('/ocr-upload', ocrRoutes);
app.use('/debug', debugRoutes);

// API prefixed routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ocr-upload', ocrRoutes);
app.use('/api/debug', debugRoutes);
```

**Dependencies**:
```javascript
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const path = require('path');
```

---

## 📁 Directory Structure

```
server/
├── index.js                 # Main application entry point
├── package.json             # Dependencies and scripts
├── config/                  # Configuration files
│   ├── database.js         # Database connection
│   ├── session.js          # Session configuration
│   └── cors.js             # CORS configuration
├── middleware/              # Custom middleware
│   ├── auth.js             # Authentication middleware
│   ├── validation.js       # Input validation
│   └── errorHandler.js     # Error handling
├── routes/                  # API route definitions
│   ├── auth.js             # Authentication routes
│   ├── admin.js            # Admin management routes
│   ├── churches.js         # Church management routes
│   ├── notes.js            # Notes management routes
│   ├── notifications.js    # Notification routes
│   ├── baptism.js          # Baptism records routes
│   ├── marriage.js         # Marriage records routes
│   ├── funeral.js          # Funeral records routes
│   ├── certificates.js     # Certificate routes
│   ├── invoices.js         # Invoice management routes
│   ├── calendar.js         # Calendar routes
│   ├── kanban.js           # Kanban board routes
│   ├── logs.js             # System logs routes
│   ├── dashboard.js        # Dashboard data routes
│   ├── ocr.js              # OCR processing routes
│   ├── ecommerce.js        # E-commerce routes
│   ├── billing.js          # Billing routes
│   ├── menuManagement.js   # Menu management routes
│   ├── menuPermissions.js  # Menu permissions routes
│   └── debug.js            # Debug utility routes
├── controllers/             # Business logic controllers
│   ├── authController.js   # Authentication logic
│   ├── userController.js   # User management logic
│   ├── churchController.js # Church management logic
│   └── ...                 # Other controllers
├── models/                  # Data models (if using ORM)
├── utils/                   # Utility functions
│   ├── logger.js           # Logging utility
│   ├── validation.js       # Validation helpers
│   ├── email.js            # Email utilities
│   └── helpers.js          # General helpers
├── database/                # Database utilities
│   ├── migrations/         # Database migrations
│   ├── seeds/              # Database seed data
│   └── queries/            # Common SQL queries
├── uploads/                 # File upload storage
├── logs/                    # Application logs
├── templates/              # Email/document templates
└── certificates/           # SSL certificates
```

---

## 🗄️ Database Architecture

### Connection Management
**File**: `z:\server\config\database.js`

**Connection Pool Configuration**:
```javascript
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'orthodox_metrics',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
});
```

### Database Tables

#### Core Tables
- **users**: User accounts and authentication
- **churches**: Church organizations
- **sessions**: Session storage
- **user_sessions**: User session tracking

#### Orthodox Church Records
- **baptism_records**: Baptism ceremonies
- **marriage_records**: Marriage ceremonies  
- **funeral_records**: Funeral services
- **certificates**: Generated certificates

#### Application Data
- **notes**: User notes and memos
- **notifications**: System notifications
- **invoices**: Financial invoices
- **calendar_events**: Calendar entries
- **kanban_boards**: Project boards
- **kanban_cards**: Task cards

#### System Management
- **menu_items**: Dynamic menu structure
- **role_menu_permissions**: Role-based menu access
- **system_logs**: Application logging
- **ocr_sessions**: OCR processing sessions

### Database Relationships
```sql
-- Users belong to churches
users.church_id → churches.id

-- Records belong to churches and users
baptism_records.church_id → churches.id
baptism_records.created_by → users.id

-- Menu permissions link roles to menu items
role_menu_permissions.menu_item_id → menu_items.id

-- Notes belong to users
notes.user_id → users.id

-- Notifications can target specific users
notifications.user_id → users.id
```

---

## 🔐 Authentication & Session Management

### Session Configuration
**File**: `z:\server\config\session.js`

**Session Store**: MySQL-based session storage for scalability and persistence

**Configuration**:
```javascript
const sessionConfig = {
  key: 'orthodox_metrics_session',
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  store: new MySQLStore({
    host: process.env.DB_HOST,
    port: 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  }),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
};
```

### Authentication Middleware
**File**: `z:\server\middleware\auth.js`

**Features**:
- Session validation
- Role-based access control
- Request logging
- Temporary bypass capability (for debugging)

**Role Hierarchy**:
1. `super_admin` - Full system access
2. `admin` - User and church management
3. `priest` - Orthodox records management
4. `deacon` - Limited record access
5. `user` - Basic features only

---

## 🛣️ Route Organization

### Authentication Routes (`/api/auth`)
**File**: `z:\server\routes\auth.js`

**Endpoints**:
- `POST /login` - User authentication
- `POST /logout` - Session termination
- `PUT /change-password` - Password updates
- `POST /register` - User registration (admin only)

### Admin Routes (`/api/admin`)
**File**: `z:\server\routes\admin.js`

**Endpoints**:
- `GET /users` - List all users
- `POST /users` - Create new user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `PUT /users/:id/toggle-status` - Toggle user status

### Church Management (`/api/churches`)
**File**: `z:\server\routes\churches.js`

**Endpoints**:
- `GET /` - List churches
- `POST /` - Create church
- `PUT /:id` - Update church
- `DELETE /:id` - Delete church

### Orthodox Records
**Files**: `baptism.js`, `marriage.js`, `funeral.js`, `certificates.js`

**Pattern**: Standard CRUD operations for each record type
- `GET /` - List records
- `POST /` - Create record
- `GET /:id` - Get specific record
- `PUT /:id` - Update record
- `DELETE /:id` - Delete record

### Notifications (`/api/notifications`)
**File**: `z:\server\routes\notifications.js`

**Features**:
- Real-time notification creation
- User-specific notification retrieval
- Read/unread status management
- Notification cleanup

### Notes Management (`/api/notes`)
**File**: `z:\server\routes\notes.js`

**Features**:
- Personal note creation
- Categorization and tagging
- Search functionality
- Pin/archive capabilities

---

## 🔧 Middleware Architecture

### Error Handling
**File**: `z:\server\middleware\errorHandler.js`

**Features**:
- Centralized error processing
- Consistent error response format
- Error logging and tracking
- Environment-specific error details

### Input Validation
**File**: `z:\server\middleware\validation.js`

**Features**:
- Request data validation
- SQL injection prevention
- Data sanitization
- Type checking

### CORS Configuration
**File**: `z:\server\config\cors.js`

**Features**:
- Cross-origin request handling
- Credential support
- Development/production settings
- Security headers

---

## 📊 Logging System

### Logger Configuration
**File**: `z:\server\utils\logger.js`

**Log Levels**:
- `error` - Error conditions
- `warn` - Warning conditions
- `info` - Informational messages
- `debug` - Debug-level messages

**Log Destinations**:
- Console output (development)
- File logging (production)
- Database logging (system events)

### Log Categories
- **Authentication**: Login/logout events
- **API**: Request/response logging
- **Database**: Query logging and errors
- **System**: Application startup/shutdown
- **Security**: Security-related events

---

## 🔍 Debugging & Monitoring

### Debug Routes (`/api/debug`)
**File**: `z:\server\routes\debug.js`

**Endpoints**:
- `GET /session` - Current session information
- `GET /database` - Database connectivity status
- `GET /config` - System configuration
- `GET /logs` - Recent log entries

### Health Checks
- Database connectivity monitoring
- Session store health
- File system access
- External service connectivity

---

## 📦 Dependencies

### Core Dependencies
```json
{
  "express": "^4.18.2",
  "express-session": "^1.17.3",
  "express-mysql-session": "^2.1.8",
  "mysql2": "^3.6.0",
  "cors": "^2.8.5",
  "bcrypt": "^5.1.0",
  "multer": "^1.4.5-lts.1"
}
```

### Development Dependencies
```json
{
  "nodemon": "^3.0.1",
  "jest": "^29.6.2",
  "supertest": "^6.3.3"
}
```

---

## 🚀 Deployment Architecture

### Environment Configuration
```bash
# Production Environment Variables
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_USER=orthodox_user
DB_PASSWORD=secure_password
DB_NAME=orthodox_metrics
SESSION_SECRET=your-session-secret
```

### Process Management
- **PM2**: Process management for production
- **Nginx**: Reverse proxy and load balancing
- **MySQL**: Database server
- **SSL**: Certificate management

### Scaling Considerations
- Horizontal scaling with multiple server instances
- Database connection pooling
- Session store clustering
- File upload handling
- Cache implementation

---

## 🔒 Security Architecture

### Data Protection
- Password hashing with bcrypt
- SQL injection prevention
- XSS protection
- CSRF protection

### Session Security
- HTTPOnly cookies
- Secure cookie flags (production)
- Rolling session expiration
- Session invalidation

### API Security
- Role-based access control
- Request rate limiting (planned)
- Input validation
- Error message sanitization

---

## 🧪 Testing Strategy

### Unit Testing
- Controller logic testing
- Utility function testing
- Middleware testing
- Database query testing

### Integration Testing
- API endpoint testing
- Authentication flow testing
- Database integration testing
- Session management testing

### Testing Tools
- Jest for unit tests
- Supertest for API testing
- Custom test scripts for comprehensive testing

---

## 📈 Performance Optimization

### Database Optimization
- Connection pooling
- Query optimization
- Index management
- Query caching

### Application Optimization
- Middleware optimization
- Route organization
- Memory management
- Response compression

### Monitoring
- Performance metrics collection
- Error rate monitoring
- Response time tracking
- Resource usage monitoring

---

## 🔮 Future Enhancements

### Planned Features
- GraphQL API implementation
- Real-time capabilities with WebSockets
- Microservices architecture
- Advanced caching strategies
- API versioning
- Enhanced security features

### Scalability Improvements
- Container deployment (Docker)
- Kubernetes orchestration
- Database sharding
- CDN integration
- Load balancing optimization

This backend architecture provides a solid foundation for the Orthodox Church Management System with room for future growth and enhancement.