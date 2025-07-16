# Orthodox Metrics Server Configuration Guide

## Overview
This document outlines the default configurations for the Orthodox Metrics server components, including the main server file, routes, configuration files, and middleware.

---

## Server/index.js Configuration

### Port and Host Settings
```javascript
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
```

### CORS Allowed Origins
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://orthodoxmetrics.com',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://192.168.1.239',
  'http://192.168.1.239:3000',
  'http://192.168.1.239:3001',
  'http://192.168.1.239:5173',
  'http://192.168.1.239:5174',
  'http://192.168.1.221',
  'http://192.168.1.221:3000',
  'http://192.168.1.221:3001',
  'http://192.168.1.221:5173',
  'http://192.168.1.221:5174',
  'https://orthodmetrics.com'
];
```

### Middleware Stack (in order)
1. `morgan('dev')` - HTTP request logger
2. `express.json()` - JSON body parser
3. `sessionMW` - Session management
4. `requestLogger` - Custom request logging

### Route Mounting Order
```javascript
// API prefixed routes (for direct API access)
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/backup', backupRouter);
app.use('/api', notificationRouter);
app.use('/api', debugRoutes);

// Direct routes (for nginx proxy without /api prefix)
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/backup', backupRouter);
app.use('/', notificationRouter);
app.use('/debug', debugRoutes);
app.use('/menu-management', menuManagementRoutes);
app.use('/menu-permissions', menuPermissionsRoutes);
app.use('/notes', notesRoutes);
app.use('/kanban', kanbanRouter);
app.use('/baptism-records', baptismRouter);
app.use('/marriage-records', marriageRouter);
app.use('/funeral-records', funeralRouter);
app.use('/unique-values', uniqueValuesRouter);
app.use('/dashboard', dashboardRouter);
app.use('/calendar', calendarRouter);
app.use('/billing', billingRouter);
app.use('/invoices', invoicesRouter);
app.use('/churches', churchesRouter);
app.use('/logs', logsRouter);

// API routes with /api prefix
app.use('/api/menu-management', menuManagementRoutes);
app.use('/api/menu-permissions', menuPermissionsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/kanban', kanbanRouter);
app.use('/api/baptism-records', baptismRouter);
app.use('/api/marriage-records', marriageRouter);
app.use('/api/funeral-records', funeralRouter);
app.use('/api/unique-values', uniqueValuesRouter);
app.use('/api/baptismCertificates', baptismCertificatesRouter);
app.use('/api/certificate/baptism', baptismCertificatesRouter);
app.use('/api/marriageCertificates', marriageCertificatesRouter);
app.use('/api/certificate/marriage', marriageCertificatesRouter);

// OCR Routes (mounted in specific order to prevent conflicts)
app.post('/api/test-ocr', /* inline test route */);
app.use('/api', ocrVisionRouter); // Google Vision OCR routes
app.use('/api', uploadTokenRouter); // Upload token management
app.use('/api', ocrRouter); // Generic OCR routes

// Additional API routes
app.use('/api/calendar', calendarRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/invoices-enhanced', enhancedInvoicesRouter);
app.use('/api/invoices-ml', invoicesMultilingualRouter);
app.use('/api/enhanced-invoices', enhancedInvoicesRouter);
app.use('/api/billing', billingRouter);
app.use('/api/churches', churchesRouter);
app.use('/api/provision', provisionRouter);
app.use('/api/certificates', certificatesRouter);
app.use('/api/ocr', ocrSessionsRouter);
app.use('/api/eCommerce', ecommerceRouter);
app.use('/api/logs', logsRouter);

// Dropdown options (mounted last to prevent override)
app.use('/api', dropdownOptionsRouter);

// Direct routes for compatibility
app.use('/', ocrRouter);
app.use('/ocr', ocrSessionsRouter);
```

### Built-in Debug Routes
- `GET /api/test` - Basic API test
- `POST /api/debug-ocr` - OCR debug endpoint
- `GET /test` - Direct test route
- `GET /api/debug/routes` - Lists all registered routes

### Email Queue Processing
```javascript
// Cron job runs every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  const processedCount = await notificationService.processEmailQueue();
});
```

---

## Server/routes Directory Structure

### Available Route Files
```
server/routes/
├── admin.js              # Admin panel functionality
├── auth.js               # Authentication routes
├── backup.js             # Database backup routes
├── baptism.js            # Baptism records
├── baptismCertificates.js # Baptism certificates
├── billing.js            # Billing management
├── calendar.js           # Calendar events
├── certificates.js       # Certificate generation
├── churches.js           # Church management
├── dashboard.js          # Dashboard data
├── debug.js              # Debug utilities
├── dropdownOptions.js    # Dropdown data
├── ecommerce.js          # E-commerce functionality
├── enhancedInvoices.js   # Enhanced invoice features
├── funeral.js            # Funeral records
├── invoices.js           # Basic invoicing
├── invoicesMultilingual.js # Multi-language invoices
├── kanban.js             # Kanban board
├── logs.js               # System logs
├── marriage.js           # Marriage records
├── marriageCertificates.js # Marriage certificates
├── menuManagement.js     # Menu configuration
├── menuPermissions.js    # Menu permissions
├── notes.js              # Notes system
├── notifications.js      # Notification system
├── ocr.js                # Generic OCR routes
├── ocrSessions.js        # OCR session management
├── ocrVision.js          # Google Vision OCR
├── provision.js          # User provisioning
├── unique-values.js      # Unique value validation
└── uploadToken.js        # File upload tokens
```

### Route Configuration Patterns
Each route file typically follows this pattern:
```javascript
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Route definitions with authentication
router.get('/endpoint', requireAuth, (req, res) => {
  // Route logic
});

module.exports = router;
```

---

## Server/config Directory Structure

### Database Configuration (config/db.js)
```javascript
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'orthodoxapp',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'orthodoxmetrics_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});
```

### Session Configuration (config/session.js)
```javascript
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const sessionStore = new MySQLStore({
  expiration: 24 * 60 * 60 * 1000, // 24 hours
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
}, pool);

module.exports = session({
  key: 'orthodoxmetrics.sid',
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
});
```

---

## Server/middleware Directory Structure

### Authentication Middleware (middleware/auth.js)
```javascript
const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.session && req.session.user && 
      (req.session.user.role === 'admin' || req.session.user.role === 'super_admin')) {
    return next();
  } else {
    return res.status(403).json({ error: 'Admin access required' });
  }
};
```

### Logging Middleware (middleware/logger.js)
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'orthodox-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  next();
};

const errorLogger = (err, req, res, next) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  next(err);
};
```

---

## Environment Variables

### Required Environment Variables
```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=orthodoxapp
DB_PASSWORD=your_db_password
DB_NAME=orthodoxmetrics_db

# Session
SESSION_SECRET=your_session_secret

# Server
PORT=3001
HOST=0.0.0.0
NODE_ENV=production

# OCR and File Upload
UPLOAD_DIR=./uploads
OCR_RESULTS_DIR=./ocr-results
MAX_FILE_SIZE=20971520

# Google Cloud Vision (optional)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## PM2 Configuration

### Default PM2 Ecosystem (ecosystem.config.cjs)
```javascript
module.exports = {
  apps: [{
    name: 'orthodox-backend',
    script: './server/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: './logs/orthodox-backend-error.log',
    out_file: './logs/orthodox-backend-out.log',
    log_file: './logs/orthodox-backend.log',
    time: true
  }, {
    name: 'orthodox-frontend',
    script: 'npm',
    args: 'start',
    cwd: './front-end',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: './logs/orthodox-frontend-error.log',
    out_file: './logs/orthodox-frontend-out.log',
    log_file: './logs/orthodox-frontend.log',
    time: true
  }]
};
```

---

## File Upload Configuration

### Multer Configuration (in ocrVision.js)
```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 20 * 1024 * 1024, // 20MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/tiff', 'image/gif',
      'image/bmp', 'image/webp', 'application/pdf'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});
```

---

## Security Configuration

### CORS Configuration
```javascript
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS policy does not allow access from origin: ' + origin));
  },
  credentials: true
}));
```

### Session Security
- HTTP-only cookies
- Secure cookies in production
- SameSite protection
- 24-hour expiration
- MySQL session store

---

## Logging Configuration

### Log Levels
- `error`: Error messages only
- `info`: General information
- `debug`: Detailed debug information

### Log Files
- `logs/error.log`: Error-level logs only
- `logs/combined.log`: All log levels
- `logs/orthodox-backend-error.log`: PM2 error output
- `logs/orthodox-backend-out.log`: PM2 standard output
- `logs/orthodox-backend.log`: PM2 combined output

---

## Performance Settings

### Database Connection Pool
- Connection limit: 10
- Queue limit: 0 (unlimited)
- Acquire timeout: 60 seconds
- Query timeout: 60 seconds
- Auto-reconnect: enabled

### File Upload Limits
- Maximum file size: 20MB
- Maximum files per request: 1
- Allowed file types: Images and PDFs

---

## Troubleshooting

### Common Configuration Issues
1. **Port conflicts**: Check if port 3001 is available
2. **Database connection**: Verify database credentials
3. **Session issues**: Ensure session secret is set
4. **File upload failures**: Check upload directory permissions
5. **CORS errors**: Verify origin is in allowed list

### Debug Endpoints
- `GET /api/test`: Basic connectivity test
- `GET /api/debug/routes`: List all registered routes
- `POST /api/debug-ocr`: OCR endpoint testing

Last Updated: July 8, 2025
