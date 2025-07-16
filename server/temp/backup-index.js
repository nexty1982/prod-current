// 📁 backend/server/index.js
require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const sessionMW = require('./config/session');
const db = require('./config/db');
const { requestLogger, errorLogger } = require('./middleware/logger');
// Import client context middleware for multi-tenant support
const { clientContext, clientContextCleanup } = require('./middleware/clientContext');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const debugRoutes = require('./routes/debug');
const menuManagementRoutes = require('./routes/menuManagement');
const menuPermissionsRoutes = require('./routes/menuPermissions');
const notesRoutes = require('./routes/notes');
const baptismRouter = require('./routes/baptism');
const marriageRouter = require('./routes/marriage');
const funeralRouter = require('./routes/funeral');
const uniqueValuesRouter = require('./routes/unique-values');
const dropdownOptionsRouter = require('./routes/dropdownOptions');
const baptismCertificatesRouter = require('./routes/baptismCertificates');
const marriageCertificatesRouter = require('./routes/marriageCertificates');
const ocrRouter = require('./routes/ocr');
const calendarRouter = require('./routes/calendar');
const dashboardRouter = require('./routes/dashboard');
const invoicesRouter = require('./routes/invoices');
const invoicesMultilingualRouter = require('./routes/invoicesMultilingual');
const enhancedInvoicesRouter = require('./routes/enhancedInvoices');
const billingRouter = require('./routes/billing');
const churchesRouter = require('./routes/churches');
const provisionRouter = require('./routes/provision');
const certificatesRouter = require('./routes/certificates');
const ocrSessionsRouter = require('./routes/ocrSessions');
const ocrVisionRouter = require('./routes/ocrVision');
const ecommerceRouter = require('./routes/ecommerce');
const backupRouter = require('./routes/backup');
const { router: notificationRouter } = require('./routes/notifications');
const kanbanRouter = require('./routes/kanban');
const { router: logsRouter } = require('./routes/logs');
const uploadTokenRouter = require('./routes/uploadToken');
// Import client API router for multi-tenant client endpoints
const clientApiRouter = require('./routes/clientApi');
// Import main clients management router
const clientsRouter = require('./routes/clients');
// Import admin system management router
const adminSystemRouter = require('./routes/adminSystem');
// const funeralCertificatesRouter = require('./routes/funeralCertificates'); // No funeral certificates yet


const app = express();
const cors = require('cors');

const allowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  'https://orthodoxmetrics.com',
  'http://localhost:3001',
  'https://localhost:3001',
  'http://localhost:5173',
  'https://localhost:5173',
  'http://localhost:5174',
  'https://localhost:5174',
  'http://127.0.0.1:3000',
  'https://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://127.0.0.1:3001',
  'http://127.0.0.1:5173',
  'https://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://127.0.0.1:5174',
  'http://192.168.1.239',
  'https://192.168.1.239',
  'http://192.168.1.239:3000',
  'https://192.168.1.239:3000',
  'http://192.168.1.239:3001',
  'https://192.168.1.239:3001',
  'http://192.168.1.239:5173',
  'https://192.168.1.239:5173',
  'http://192.168.1.239:5174',
  'https://192.168.1.239:5174',
  'http://192.168.1.221',
  'https://192.168.1.221',
  'http://192.168.1.221:3000',
  'https://192.168.1.221:3000',
  'http://192.168.1.221:3001',
  'https://192.168.1.221:3001',
  'http://192.168.1.221:5173',
  'https://192.168.1.221:5173',
  'http://192.168.1.221:5174',
  'https://192.168.1.221:5174',
  'https://orthodmetrics.com'
];

// ─── CORS SETUP ─────────────────────────────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS policy does not allow access from origin: ' + origin));
  },
  credentials: true
}));

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.use(morgan('dev'));

app.use(express.json());
app.use(sessionMW);
// app.use(requestLogger); // Temporarily disable request logging middleware
// Note: clientContext middleware moved to specific client routes only

// ─── ROUTES ─────────────────────────────────────────────────────────
// Simple test route to verify Express is working
app.get('/api/test-basic', (req, res) => {
  console.log('✅ Basic test route hit');
  res.json({ 
    message: 'Basic Express routing is working', 
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url 
  });
});

// Test route to debug proxy path forwarding
app.get('/api/test-proxy-path', (req, res) => {
  console.log('🔍 Proxy path test:');
  console.log('  Original URL:', req.originalUrl);
  console.log('  URL:', req.url);
  console.log('  Method:', req.method);
  console.log('  Headers:', req.headers);
  
  res.json({
    message: 'Proxy path debugging',
    originalUrl: req.originalUrl,
    url: req.url,
    method: req.method,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Test route at root level (no /api prefix)
app.get('/test-direct-path', (req, res) => {
  console.log('🔍 Direct path test:');
  console.log('  Original URL:', req.originalUrl);
  console.log('  URL:', req.url);
  
  res.json({
    message: 'Direct path (no /api prefix)',
    originalUrl: req.originalUrl,
    url: req.url,
    timestamp: new Date().toISOString()
  });
});

// API prefixed routes (for direct API access)
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/system', adminSystemRouter); // System admin routes
app.use('/api/admin/backup', backupRouter);
app.use('/api', notificationRouter);
app.use('/api', debugRoutes);

// Direct routes (for nginx proxy without /api prefix)
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/system', adminSystemRouter); // System admin routes
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
app.use('/clients', clientsRouter); // Client management API
app.use('/logs', logsRouter);
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
// Mount OCR Vision routes BEFORE the generic OCR router to prevent conflicts
// Temporarily add a simple test route to debug the issue
app.post('/api/test-ocr', (req, res) => {
  res.json({
    message: 'Test OCR endpoint working from inline route',
    timestamp: new Date().toISOString(),
    hasFile: !!req.file,
    bypass: true
  });
});
app.use('/api', ocrVisionRouter); // New Google Vision OCR routes
app.use('/api', uploadTokenRouter); // Upload token management routes
app.use('/api', ocrRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/invoices', invoicesRouter); // Use basic invoices for main endpoint
app.use('/api/invoices-enhanced', enhancedInvoicesRouter); // Enhanced features
app.use('/api/invoices-ml', invoicesMultilingualRouter);
app.use('/api/enhanced-invoices', enhancedInvoicesRouter);
app.use('/api/billing', billingRouter);
app.use('/api/churches', churchesRouter);
app.use('/api/clients', clientsRouter); // Client management API
app.use('/api/provision', provisionRouter);
app.use('/api/certificates', certificatesRouter);
app.use('/api/ocr', ocrSessionsRouter);
app.use('/api/eCommerce', ecommerceRouter);
app.use('/api/logs', logsRouter);
// app.use('/api/funeralCertificates', funeralCertificatesRouter); // No funeral certificates yet

// ═══════════════════════════════════════════════════════════════
// MULTI-TENANT CLIENT ROUTES
// ═══════════════════════════════════════════════════════════════
// Client-specific routes with middleware for context and cleanup
app.use('/client/:clientSlug/api', clientContext, clientApiRouter, clientContextCleanup);

// ⬇️ Mount dropdownOptions routes here to prevent override
app.use('/api', dropdownOptionsRouter);

// Mount direct routes (without /api prefix) for compatibility
app.use('/', ocrRouter); // For /ocr and /process endpoints
app.use('/ocr', ocrSessionsRouter); // For OCR session management

// Add a simple test route to bypass all middleware
app.get('/test-direct', (req, res) => {
  res.json({ message: 'Direct endpoint working without middleware', timestamp: new Date().toISOString() });
});

// Add a debug endpoint to test churches API without auth
app.get('/api/debug/churches', (req, res) => {
  console.log('Debug churches endpoint called');
  const { promisePool } = require('./config/db');

  promisePool.query('SELECT COUNT(*) as count FROM churches')
    .then(([result]) => {
      res.json({
        message: 'Churches debug endpoint working',
        church_count: result[0].count,
        sample_query_working: true
      });
    })
    .catch(error => {
      res.json({
        message: 'Churches debug endpoint working but query failed',
        error: error.message
      });
    });
});

// Add a simple test route to debug routing
app.get('/api/test', (req, res) => {
  res.json({ message: 'API test route working' });
});

// Add OCR debug endpoint
app.post('/api/debug-ocr', (req, res) => {
  console.log('OCR Debug endpoint called');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Files:', req.files);
  res.json({
    message: 'OCR Debug endpoint working',
    hasFile: !!req.file,
    hasFiles: !!req.files,
    contentType: req.headers['content-type']
  });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Direct test route working' });
});

// Debug route to list all registered routes
app.get('/api/debug/routes', (req, res) => {
  const routes = [];

  function print(path, layer) {
    if (layer.route) {
      layer.route.stack.forEach(print.bind(null, path.concat(split(layer.route.path))))
    } else if (layer.name === 'router' && layer.handle.stack) {
      layer.handle.stack.forEach(print.bind(null, path.concat(split(layer.regexp))))
    } else if (layer.name === 'bound dispatch') {
      routes.push(path.concat(layer.route ? layer.route.path : '').join(''))
    }
  }

  function split(thing) {
    if (typeof thing === 'string') {
      return thing.split('/')
    } else if (thing.fast_slash) {
      return ''
    } else {
      var match = thing.toString()
        .replace('\\/?', '')
        .replace('(?=\\/|$)', '$')
        .match(/^\/\^((?:\\[.*+?^${}()|[\]\\\/]|[^.*+?^${}()|[\]\\\/])*)\$\//)
      return match
        ? match[1].replace(/\\(.)/g, '$1').split('/')
        : '<complex:' + thing.toString() + '>'
    }
  }

  try {
    app._router.stack.forEach(print.bind(null, []))
    res.json({ routes: routes.sort() });
  } catch (error) {
    res.json({
      message: 'OCR endpoints should be available',
      expectedEndpoints: [
        '/api/ocr-en', '/api/ocr-ru', '/api/ocr-ro', '/api/ocr-gr',
        '/api/public-ocr-en', '/api/public-ocr-ru', '/api/public-ocr-ro', '/api/public-ocr-gr',
        '/api/ocr', '/api/test-ocr', '/api/ocr-status',
        '/api/ocr/result/:jobId', '/api/ocr/results'
      ]
    });
  }
});

// ─── ERROR LOGGING MIDDLEWARE ──────────────────────────────────────────
app.use(errorLogger);

// ─── 404 HANDLER ────────────────────────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── STATIC FRONTEND ────────────────────────────────────────────────
app.use('/assets', express.static(path.resolve(__dirname, '../src/assets')));

// ─── EMAIL QUEUE PROCESSING ──────────────────────────────────────────
const { notificationService } = require('./routes/notifications');
const cron = require('node-cron');

// Process email queue every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const processedCount = await notificationService.processEmailQueue();
    if (processedCount > 0) {
      console.log(`Processed ${processedCount} emails from notification queue`);
    }
  } catch (error) {
    console.error('Error processing email queue:', error);
  }
});

console.log('Email queue processor started (runs every 5 minutes)');

// ─── START SERVER ───────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log(`🚀 Server running in ${nodeEnv.toUpperCase()} mode at http://${HOST}:${PORT}`);
  if (nodeEnv === 'development') {
    console.log('📋 Development mode: Enhanced logging and verbose output enabled');
  } else if (nodeEnv === 'production') {
    console.log('🔧 Production mode: Optimized for performance and reduced logging');
  }
});
