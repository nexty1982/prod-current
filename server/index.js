// ?? backend/server/index.js
require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');

// 🔧 FIXED: Use the updated session configuration  
const sessionMiddleware = require('./config/session');
const db = require('./config/db');
const { requestLogger, errorLogger } = require('./middleware/logger');
const { versionSwitcherMiddleware, getBuildPath, getSelectedVersion } = require('./middleware/versionSwitcher');
const { requestLogger: dbRequestLogger } = require('./middleware/requestLogger');
// Import client context middleware for multi-tenant support
const { clientContext, clientContextCleanup } = require('./middleware/clientContext');

// --- API ROUTES -----------------------------------------------------
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const debugRoutes = require('./routes/debug');
const menuManagementRoutes = require('./routes/menuManagement');
const menuPermissionsRoutes = require('./routes/menuPermissions');
const { registerRouterMenuStudio } = require("./dist/features/routerMenuStudio");
const notesRoutes = require('./routes/notes');
const baptismRouter = require('./routes/baptism');
const marriageRouter = require('./routes/marriage');
const funeralRouter = require('./routes/funeral');
const uniqueValuesRouter = require('./routes/unique-values');
const dropdownOptionsRouter = require('./routes/dropdownOptions');
// Load baptismCertificates router with error handling for native module issues
let baptismCertificatesRouter;
try {
    baptismCertificatesRouter = require('./routes/baptismCertificates');
} catch (e) {
    console.error('⚠️  [Server] Failed to load baptismCertificates router:', e.message);
    console.error('   Creating stub router. Certificate routes will return 503.');
    // Create a stub router that returns 503 for all requests
    const express = require('express');
    const stubRouter = express.Router();
    stubRouter.use((req, res) => {
        res.status(503).json({
            success: false,
            error: 'Service temporarily unavailable',
            message: 'Baptism certificates module failed to load. Native dependencies may need rebuilding.',
            details: e.message
        });
    });
    baptismCertificatesRouter = stubRouter;
}
// Load marriageCertificates router with error handling for native module issues
let marriageCertificatesRouter;
try {
    marriageCertificatesRouter = require('./routes/marriageCertificates');
} catch (e) {
    console.error('⚠️  [Server] Failed to load marriageCertificates router:', e.message);
    const express = require('express');
    const stubRouter = express.Router();
    stubRouter.use((req, res) => {
        res.status(503).json({
            success: false,
            error: 'Service temporarily unavailable',
            message: 'Marriage certificates module failed to load. Native dependencies may need rebuilding.',
            details: e.message
        });
    });
    marriageCertificatesRouter = stubRouter;
}

const calendarRouter = require('./routes/calendar');
const dashboardRouter = require('./routes/dashboard');
const invoicesRouter = require('./routes/invoices');
const invoicesMultilingualRouter = require('./routes/invoicesMultilingual');
const enhancedInvoicesRouter = require('./routes/enhancedInvoices');
const billingRouter = require('./routes/billing');
const churchesRouter = require('./routes/churches');
const provisionRouter = require('./routes/provision');
const certificatesRouter = require('./routes/certificates');
const ecommerceRouter = require('./routes/ecommerce');
const { router: notificationRouter } = require('./routes/notifications');
const kanbanRouter = require('./routes/kanban');
const { router: logsRouter } = require('./routes/logs');
const globalOmaiRouter = require('./routes/globalOmai');
const versionRouter = require('./routes/version');
// Add missing router imports
const churchRecordsRouter = require('./routes/records'); // Church records functionality
const uploadTokenRouter = require('./routes/uploadToken');
const globalTemplatesRouter = require('./routes/globalTemplates');
const metricsRouter = require('./routes/metrics');
// Removed duplicate: recordsRouter - already loaded as churchRecordsRouter
const importRecordsRouter = require('./routes/records-import'); // Records import functionality
const scriptRunnerRouter = require('./routes/runScript'); // Secure script runner for admin users

// Import client API router for multi-tenant client endpoints
const clientApiRouter = require('./routes/clientApi');
// Import admin system management router
const adminSystemRouter = require('./routes/adminSystem');
// Import library routes for OM-Library system
const libraryRouter = require('./routes/library');
// Import church admin management router for multi-database support
const churchAdminRouter = require('./routes/admin/church');
// Import churches management router for church provisioning
const churchesManagementRouter = require('./routes/admin/churches');
const sessionsRouter = require('./routes/admin/sessions');
const messagesRouter = require('./routes/admin/messages');
const usersRouter = require('./routes/admin/users');
const activityLogsRouter = require('./routes/admin/activity-logs');
// Import new modular admin route files (extracted from monolithic admin.js)
const churchUsersRouter = require('./routes/admin/church-users');
const churchDatabaseRouter = require('./routes/admin/church-database');
const userRouter = require('./routes/user'); // User routes
// Load funeralCertificates router with error handling for native module issues
let funeralCertificatesRouter;
try {
    funeralCertificatesRouter = require('./routes/funeralCertificates');
} catch (e) {
    console.error('⚠️  [Server] Failed to load funeralCertificates router:', e.message);
    const express = require('express');
    const stubRouter = express.Router();
    stubRouter.use((req, res) => {
        res.status(503).json({
            success: false,
            error: 'Service temporarily unavailable',
            message: 'Funeral certificates module failed to load. Native dependencies may need rebuilding.',
            details: e.message
        });
    });
    funeralCertificatesRouter = stubRouter;
}
// Import pages and uploads management routes
const pagesRouter = require('./routes/pages');
const uploadsRouter = require('./routes/uploads');
const orthodoxCalendarRouter = require('./routes/orthodoxCalendar');
// Import global images management router for super admin content management
const globalImagesRouter = require('./routes/admin/globalImages');
// Import images router for listing images by directory
const imagesRouter = require('./routes/images');
// Import service management router for system monitoring and control
const servicesRouter = require('./routes/admin/services');
// Import components management router for system component control
const componentsRouter = require('./routes/admin/components');
// Load templates router with error handling
let templatesRouter;
try {
  templatesRouter = require('./routes/admin/templates');
  console.log('✅ [Server] Templates router loaded successfully');
} catch (error) {
  console.error('❌ [Server] Failed to load templates router:', error);
  // Create a dummy router that returns 500 to prevent crashes
  const express = require('express');
  templatesRouter = express.Router();
  templatesRouter.use((req, res) => {
    res.status(500).json({ success: false, error: 'Templates router failed to load' });
  });
}
const settingsRouter = require('./routes/settings');
// Import social module routers
const socialBlogRouter = require('./routes/social/blog');
const socialFriendsRouter = require('./routes/social/friends');
const socialChatRouter = require('./routes/social/chat');
const socialNotificationsRouter = require('./routes/social/notifications');
// Import Big Book system router
const bigBookRouter = require('./routes/bigbook');

// Import OM-AI system router
const omaiRouter = require('./routes/omai');
const omaiMemoriesRouter = require('./routes/omai/memories');
// const omaiRouter = require('./routes/omai-test'); // TEMPORARY TEST
const ombRouter = require('./routes/omb');
// Import mock APIs to prevent 404 errors
const mockApisRouter = require('./routes/mock-apis');
// Import JIT Terminal router for secure server access
const jitTerminalRouter = require('./routes/jit-terminal');
// Import Backend Diagnostics router for system monitoring
const backendDiagnosticsRouter = require('./routes/backend_diagnostics');
// Import Build System router for build orchestration
const buildRouter = require('./routes/build');
// Import AI Administration Panel router
const aiRouter = require('./routes/ai');
// Import Logger API router for SUCCESS/DEBUG log support
const loggerRouter = require('./routes/logger');
// Import GitHub Issues router for error reporting
const githubIssuesRouter = require('./routes/github-issues');
const routerMenuRouter = require('./routes/routerMenu');
// Import Router/Menu Studio feature (JavaScript version)
// Import Router/Menu Studio feature

const app = express();
const server = http.createServer(app);

// 🔧 FIXED: Trust proxy configuration
app.set('trust proxy', 1);

// 🔧 PRODUCTION: CORS configuration for orthodoxmetrics.com
const allowedOrigins = [
  // Production domains
  'https://orthodoxmetrics.com',
  'http://orthodoxmetrics.com',
  'https://www.orthodoxmetrics.com',
  'http://www.orthodoxmetrics.com',
  
  // Development origins (keep for local dev)
  'http://localhost:3000',
  'https://localhost:3000',
  'http://0.0.0.0:5174',           // Development frontend (Vite)
  'http://localhost:5174',         // Development frontend (Vite)
  'https://localhost:5174',
  'http://localhost:5173',         // Vite dev server fallback
  'http://192.168.1.239:5174',
  'https://localhost:5173',
  'http://127.0.0.1:5174',
  'https://127.0.0.1:5174',
  'http://127.0.0.1:5173',
  'https://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://127.0.0.1:3000',
];

// --- CORS SETUP -----------------------------------------------------
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn('❌ CORS blocked origin:', origin);
    callback(new Error('CORS policy does not allow access from origin: ' + origin));
  },
  credentials: true, // 🔧 CRITICAL: Allow credentials (cookies)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie']
}));

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// 🔧 FIXED: Middleware order is CRITICAL for session authentication
console.log('🔧 Setting up middleware in correct order...');

// 1. Logging middleware (first)
app.use(morgan('dev'));

// 2. Body parsing middleware (before session)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 3. Session middleware (CRITICAL: before any auth-protected routes)
console.log('🍪 Applying session middleware...');
app.use(sessionMiddleware);

// 4. Database routing middleware
const { databaseRouter } = require('./middleware/databaseRouter');
app.use(databaseRouter);

// 4a. Database-backed API logger (captures all routes + status code + duration)
app.use(dbRequestLogger);

// 5. Request debugging (after session, before routes)
app.use((req, res, next) => {
  console.log(`🌍 Request: ${req.method} ${req.path}`);
  console.log(`🍪 Session ID: ${req.sessionID}`);
  console.log(`👤 Session User: ${req.session?.user?.email || 'Not authenticated'}`);
  next();
});

// --- ROUTES ---------------------------------------------------------
console.log('🛤️  Setting up routes in correct order...');

// Removed root route to allow SPA to serve index.html

// --- DEBUG HELPERS (read‑only) ------------------------------------
app.get('/__debug/current-db', async (req, res) => {
  try {
    const { getAuthPool } = require('./config/db');
    const pool = getAuthPool();
    const [rows] = await pool.query('SELECT DATABASE() AS db');
    res.json({ db: rows?.[0]?.db || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/__debug/session', (req, res) => {
  res.json({
    hasSession: !!req.session,
    sessionID: req.sessionID || null,
    user: req.session?.user || null
  });
});

// Public routes first (no authentication required)
app.use('/api/churches', churchesRouter);

// Authentication routes (no auth required for login itself)

// Register Router/Menu Studio feature (requires authentication)
app.use('/api/auth', authRoutes);
registerRouterMenuStudio(app);

// 🔧 FIXED: Specific admin routes BEFORE general admin routes
app.use('/api/admin/church', churchAdminRouter);

app.use('/api/admin/system', adminSystemRouter);
app.use('/api/admin/churches', churchesManagementRouter);
app.use('/api/admin/sessions', sessionsRouter);
app.use('/api/admin/messages', messagesRouter);
app.use('/api/admin/users', usersRouter); // 🎯 CRITICAL: This route was being intercepted
app.use('/api/backup', require('./src/modules/backup/backup.routes'));
// Removed duplicate mounting - users are managed through /api/admin/users
app.use('/api/admin/activity-logs', activityLogsRouter);
app.use('/api/admin/templates', templatesRouter);
console.log('✅ [Server] Mounted /api/admin/templates route');
app.use('/api/admin/global-images', globalImagesRouter);
// Add public alias for global-images (without /admin prefix)
app.use('/api/global-images', globalImagesRouter);
// Images listing endpoint
app.use('/api/images', imagesRouter);
// Upload endpoints (profile, banner)
const uploadRouter = require('./routes/upload');
app.use('/api/upload', uploadRouter);
const socialPermissionsRouter = require('./routes/admin/social-permissions');
const menuPermissionsRouter = require('./routes/admin/menu-permissions');
const menuPermissionsApiRouter = require('./routes/menuPermissionsApi'); // Enhanced menu permissions API
const headlinesRouter = require('./routes/headlines');
const headlinesConfigRouter = require('./routes/headlines-config');
app.use('/api/admin/social-permissions', socialPermissionsRouter);
app.use('/api/admin/menu-permissions', menuPermissionsRouter);
app.use('/api/menu-permissions', menuPermissionsApiRouter); // Enhanced menu configuration API
app.use('/api/headlines', headlinesRouter);
app.use('/api/headlines/config', headlinesConfigRouter);
app.use('/api/admin/services', servicesRouter);
app.use('/api/admin/components', componentsRouter);
// OMAI-Spin environment mirroring routes
const omaiSpinRouter = require('./routes/admin/omaiSpin');
app.use('/api/admin/omai-spin', omaiSpinRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/build', buildRouter);
// Internal build events endpoint (token-protected, no auth middleware)
const buildEventsRouter = require('./routes/internal/buildEvents');
app.use('/api/internal', buildEventsRouter);
console.log('✅ [Server] Mounted /api/internal/build-events route');
app.use('/api/ai', aiRouter);
// Logger API routes for SUCCESS/DEBUG log support  
app.use('/api/logger', loggerRouter);
// OMAI Logger API routes for error tracking database
const { router: omaiLoggerRouter } = require('./routes/omaiLogger');
app.use('/api/omai-logger', omaiLoggerRouter);
// GitHub Issues API routes for error reporting
app.use('/api/errors', githubIssuesRouter);

// Big Book system routes
app.use('/api/bigbook', bigBookRouter);
// OM-AI system routes
app.use('/api/omai', omaiRouter);
app.use('/api/omai/memories', omaiMemoriesRouter);
// Global OMAI system routes for site-wide AI assistance
app.use('/api/omai/global', globalOmaiRouter); // Changed to avoid conflict with /api/omai
app.use('/api/omb', ombRouter);
// JIT Terminal routes for secure server access
app.use('/api/jit', jitTerminalRouter);
// Backend Diagnostics routes for system monitoring (super_admin only)
app.use('/api/server', backendDiagnosticsRouter);
// 🔧 NEW: Modular admin routes (extracted from monolithic admin.js)
app.use('/api/admin/church-users', churchUsersRouter);
app.use('/api/admin/church-database', churchDatabaseRouter);

// General admin routes (AFTER specific routes to prevent conflicts)
app.use('/api/admin', adminRoutes);
app.use('/api/version', versionRouter); // Version switcher for superadmins


// User profile routes (authenticated) - MUST come before /api/user
const userProfileRouter = require("./routes/user-profile");
app.use("/api/user/profile", userProfileRouter);

// Other authenticated routes
app.use("/api/user", userRouter);
app.use('/api/church-records', churchRecordsRouter);
app.use('/api/kanban', kanbanRouter);


// Notification routes (authenticated)
app.use('/api', notificationRouter);

// Social module routes
app.use('/api/social/blog', socialBlogRouter);
app.use('/api/social/friends', socialFriendsRouter);
app.use('/api/social/chat', socialChatRouter);
app.use('/api/social/notifications', socialNotificationsRouter);

// OM Profile routes (for user profiles)
const omProfileRouter = require('./routes/om/profile');
app.use('/api/om/profile', omProfileRouter);

// Record management routes
app.use('/api/baptism-records', baptismRouter);
app.use('/api/marriage-records', marriageRouter);
app.use('/api/funeral-records', funeralRouter);
app.use('/api/unique-values', uniqueValuesRouter);

// Certificate routes
app.use('/api/baptismCertificates', baptismCertificatesRouter);
// Certificate routes
app.use('/api/certificate/baptism', baptismCertificatesRouter);
app.use('/api/marriageCertificates', marriageCertificatesRouter);
app.use('/api/certificate/marriage', marriageCertificatesRouter);
app.use('/api/funeralCertificates', funeralCertificatesRouter);
app.use('/api/certificate/funeral', funeralCertificatesRouter);

// Upload token management routes
app.use('/api', uploadTokenRouter);

// Business routes
app.use('/api/calendar', calendarRouter);
app.use('/api/orthodox-calendar', orthodoxCalendarRouter); // Changed to avoid conflict with /api/calendar
app.use('/api/dashboard', dashboardRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/invoices-enhanced', enhancedInvoicesRouter);
app.use('/api/invoices-ml', invoicesMultilingualRouter);
app.use('/api/enhanced-invoices', enhancedInvoicesRouter);
app.use('/api/billing', billingRouter);
app.use('/api/provision', provisionRouter);
app.use('/api/certificates', certificatesRouter);
app.use('/api/eCommerce', ecommerceRouter);
app.use('/api/admin/logs', logsRouter); // 🔧 FIXED: Mount logsRouter under /api/admin/logs
app.use("/api/logs", logsRouter); // Add logs router at /api/logs for admin-errors

// CMS Routes
app.use('/api/pages', pagesRouter);
app.use('/api/blogs', require('./routes/blogs')); // Blog functionality for Task 132
app.use('/api/uploads', uploadsRouter);
const galleryRouter = require('./routes/gallery');
console.log('🖼️ Registering /api/gallery routes');
app.use('/api/gallery', galleryRouter);
console.log('✅ /api/gallery routes registered');
const docsRouter = require('./routes/docs');
console.log('📚 Registering /api/docs routes');
app.use('/api/docs', docsRouter);
console.log('✅ /api/docs routes registered');

// Library Routes (OM-Library system)
app.use('/api/library', libraryRouter);
console.log('✅ /api/library routes registered');

// OCR Routes
const ocrRouter = require('./routes/ocr');
console.log('🔍 Registering /api/ocr routes');
app.use('/api/ocr', ocrRouter);
console.log('✅ /api/ocr routes registered');

// Church-specific OCR settings routes
app.get('/api/church/:churchId/ocr/settings', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    console.log(`[OCR Settings] GET /api/church/${churchId}/ocr/settings`);
    const { promisePool } = require('./config/db');
    
    // Validate church exists
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    // Get church database connection
    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('./src/utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    const defaultSettings = {
      engine: 'tesseract',
      language: 'eng',
      dpi: 300,
      deskew: true,
      removeNoise: true,
      preprocessImages: true,
      outputFormat: 'json',
      confidenceThreshold: 75
    };

    try {
      const [settingsRows] = await db.query(`
        SELECT 
          engine, language, dpi, deskew, remove_noise, preprocess_images, output_format,
          confidence_threshold, default_language, preprocessing_enabled, auto_rotate, noise_reduction
        FROM ocr_settings 
        WHERE church_id = ?
        ORDER BY updated_at DESC
        LIMIT 1
      `, [churchId]);

      if (settingsRows.length > 0) {
        const s = settingsRows[0];
        const loadedSettings = {
          engine: s.engine || defaultSettings.engine,
          language: s.language || s.default_language || defaultSettings.language,
          dpi: s.dpi || defaultSettings.dpi,
          deskew: s.deskew !== undefined ? Boolean(s.deskew) : (s.auto_rotate !== undefined ? Boolean(s.auto_rotate) : defaultSettings.deskew),
          removeNoise: s.remove_noise !== undefined ? Boolean(s.remove_noise) : (s.noise_reduction !== undefined ? Boolean(s.noise_reduction) : defaultSettings.removeNoise),
          preprocessImages: s.preprocess_images !== undefined ? Boolean(s.preprocess_images) : (s.preprocessing_enabled !== undefined ? Boolean(s.preprocessing_enabled) : defaultSettings.preprocessImages),
          outputFormat: s.output_format || defaultSettings.outputFormat,
          confidenceThreshold: s.confidence_threshold ? Math.round(s.confidence_threshold * 100) : defaultSettings.confidenceThreshold
        };
        console.log(`[OCR Settings] Loaded settings for church ${churchId}:`, loadedSettings);
        return res.json(loadedSettings);
      } else {
        console.log(`[OCR Settings] No saved settings found for church ${churchId}, using defaults`);
      }
    } catch (dbError) {
      console.warn('OCR settings table may not exist, using defaults:', dbError.message);
    }

    console.log(`[OCR Settings] Returning default settings for church ${churchId}`);
    res.json(defaultSettings);
  } catch (error) {
    console.error('Error fetching church OCR settings:', error);
    res.status(500).json({ error: 'Failed to fetch OCR settings', message: error.message });
  }
});

app.put('/api/church/:churchId/ocr/settings', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const settings = req.body;
    
    console.log(`[OCR Settings] PUT /api/church/${churchId}/ocr/settings - settings:`, JSON.stringify(settings));
    
    if (!churchId) {
      return res.status(400).json({ error: 'Invalid church ID' });
    }

    if (!settings.engine || !settings.language) {
      return res.status(400).json({ error: 'Invalid settings', message: 'Engine and language are required' });
    }

    const { promisePool } = require('./config/db');
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('./src/utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Check and add columns if needed
    try {
      const [columns] = await db.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'ocr_settings'
      `);
      const columnNames = columns.map(c => c.COLUMN_NAME);
      const alterStatements = [];
      if (!columnNames.includes('engine')) alterStatements.push('ADD COLUMN engine VARCHAR(50) DEFAULT "tesseract"');
      if (!columnNames.includes('language')) alterStatements.push('ADD COLUMN language VARCHAR(10) DEFAULT "eng"');
      if (!columnNames.includes('dpi')) alterStatements.push('ADD COLUMN dpi INT DEFAULT 300');
      if (!columnNames.includes('deskew')) alterStatements.push('ADD COLUMN deskew TINYINT(1) DEFAULT 1');
      if (!columnNames.includes('remove_noise')) alterStatements.push('ADD COLUMN remove_noise TINYINT(1) DEFAULT 1');
      if (!columnNames.includes('preprocess_images')) alterStatements.push('ADD COLUMN preprocess_images TINYINT(1) DEFAULT 1');
      if (!columnNames.includes('output_format')) alterStatements.push('ADD COLUMN output_format VARCHAR(20) DEFAULT "json"');
      if (alterStatements.length > 0) {
        await db.query(`ALTER TABLE ocr_settings ${alterStatements.join(', ')}`);
      }
    } catch (createError) {
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS ocr_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            church_id INT NOT NULL,
            engine VARCHAR(50) DEFAULT 'tesseract',
            language VARCHAR(10) DEFAULT 'eng',
            dpi INT DEFAULT 300,
            deskew TINYINT(1) DEFAULT 1,
            remove_noise TINYINT(1) DEFAULT 1,
            preprocess_images TINYINT(1) DEFAULT 1,
            output_format VARCHAR(20) DEFAULT 'json',
            confidence_threshold DECIMAL(5,2) DEFAULT 0.75,
            default_language CHAR(2) DEFAULT 'en',
            preprocessing_enabled TINYINT(1) DEFAULT 1,
            auto_contrast TINYINT(1) DEFAULT 1,
            auto_rotate TINYINT(1) DEFAULT 1,
            noise_reduction TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_church_settings (church_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      } catch (e) {}
    }

    await db.query(`
      INSERT INTO ocr_settings (
        church_id, engine, language, dpi, deskew, remove_noise, 
        preprocess_images, output_format, confidence_threshold,
        default_language, preprocessing_enabled, auto_contrast, auto_rotate, noise_reduction,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        engine = COALESCE(VALUES(engine), engine),
        language = COALESCE(VALUES(language), language),
        dpi = COALESCE(VALUES(dpi), dpi),
        deskew = COALESCE(VALUES(deskew), deskew),
        remove_noise = COALESCE(VALUES(remove_noise), remove_noise),
        preprocess_images = COALESCE(VALUES(preprocess_images), preprocess_images),
        output_format = COALESCE(VALUES(output_format), output_format),
        confidence_threshold = COALESCE(VALUES(confidence_threshold), confidence_threshold),
        default_language = COALESCE(VALUES(language), default_language),
        preprocessing_enabled = COALESCE(VALUES(preprocess_images), preprocessing_enabled),
        auto_rotate = COALESCE(VALUES(deskew), auto_rotate),
        noise_reduction = COALESCE(VALUES(remove_noise), noise_reduction),
        updated_at = NOW()
    `, [
      churchId,
      settings.engine || 'tesseract',
      settings.language || 'eng',
      settings.dpi || 300,
      settings.deskew !== undefined ? (settings.deskew ? 1 : 0) : 1,
      settings.removeNoise !== undefined ? (settings.removeNoise ? 1 : 0) : 1,
      settings.preprocessImages !== undefined ? (settings.preprocessImages ? 1 : 0) : 1,
      settings.outputFormat || 'json',
      settings.confidenceThreshold ? (settings.confidenceThreshold / 100) : 0.75,
      settings.language || 'en',
      settings.preprocessImages !== undefined ? (settings.preprocessImages ? 1 : 0) : 1,
      1,
      settings.deskew !== undefined ? (settings.deskew ? 1 : 0) : 1,
      settings.removeNoise !== undefined ? (settings.removeNoise ? 1 : 0) : 1
    ]);

    // Verify the settings were saved
    const [verifyRows] = await db.query(`
      SELECT engine, language, dpi, deskew, remove_noise, preprocess_images, output_format, confidence_threshold
      FROM ocr_settings 
      WHERE church_id = ?
    `, [churchId]);
    
    if (verifyRows.length > 0) {
      console.log(`✅ Saved OCR settings for church ${churchId}:`, verifyRows[0]);
    } else {
      console.error(`❌ Failed to verify saved settings for church ${churchId}`);
    }
    
    res.json({ success: true, message: 'OCR settings saved successfully', settings: settings });
  } catch (error) {
    console.error('Error saving church OCR settings:', error);
    res.status(500).json({ error: 'Failed to save OCR settings', message: error.message });
  }
});

// Survey Routes (Task 131)
app.use('/api/survey', require('./routes/survey')); // OMSiteSurvey functionality

// Menu and admin routes
app.use('/api/menu-management', menuManagementRoutes);
// Removed duplicate - using enhanced menu permissions API at line 234
app.use('/api/notes', notesRoutes);
// Removed duplicate kanban router - already mounted at line 270
// Removed duplicate survey router - already mounted at line 323

// Multi-tenant client routes
app.use('/client/:clientSlug/api', clientContext, clientApiRouter, clientContextCleanup);

// ?? Mount dropdownOptions routes here to prevent override
app.use('/api', dropdownOptionsRouter);

// Records import routes
app.use('/api/records/import', importRecordsRouter);

// Additional utility routes expected by frontend
app.get('/api/dropdown-options', (req, res) => {
  // Return dropdown options for forms
  res.json({
    countries: ['United States', 'Canada', 'Greece', 'Romania', 'Russia'],
    states: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA'],
    languages: ['en', 'gr', 'ru', 'ro'],
    roles: ['admin', 'priest', 'supervisor', 'volunteer', 'viewer', 'church'],
    recordTypes: ['baptism', 'marriage', 'funeral']
  });
});

app.get('/api/config', (req, res) => {
  // Return app configuration
  res.json({
    appName: 'OrthodoxMetrics',
    version: '1.0.0',
    supportedLanguages: ['en', 'gr', 'ru', 'ro'],
    features: {

      certificates: true,
      invoices: true,
      calendar: true
    }
  });
});

app.get('/api/search', (req, res) => {
  // Basic search functionality placeholder
  const { q, type } = req.query;
  res.json({
    query: q,
    type: type || 'all',
    results: [],
    message: 'Search functionality not yet implemented'
  });
});

// --- HEALTHCHECK ----------------------------------------------------
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await db.testConnection();
    res.json({
      status: dbStatus.success ? 'ok' : 'error',
      user: req.session.user || null,
      database: dbStatus
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// --- OMAI FRONTEND COMPATIBILITY ENDPOINTS --------------------------
// These endpoints are for frontend compatibility with the OMAI system

// GET /api/status - OMAI status check for frontend
app.get('/api/status', async (req, res) => {
  try {
    // Import OMAI health check function
    const { getOMAIHealth } = require('/var/www/orthodoxmetrics/prod/misc/omai/services/index.js');
    const health = await getOMAIHealth();
    
    res.json({
      success: true,
      status: health.status,
      version: '1.0.0',
      activeAgents: health.components?.agents || [],
      timestamp: health.timestamp,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    console.error('OMAI status check failed:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// POST /api/fix - OMAI fix endpoint for frontend
app.post('/api/fix', async (req, res) => {
  try {
    const { route, component, issues, props, currentCode, errorDetails } = req.body;
    
    // Log the fix request
    console.log(`[OMAI] Fix request from user ${req.user?.id || 'unknown'} for component ${component}`);

    // For now, return a stub response
    // This would be implemented with actual AI fix logic
    res.json({
      success: true,
      suggestion: `Fix for ${component} component`,
      codeDiff: '',
      explanation: 'This is a placeholder fix response. AI fix functionality will be implemented.',
      confidence: 0.8,
      estimatedTime: '5 minutes',
      requiresManualReview: true
    });
  } catch (error) {
    console.error('OMAI fix failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Router Menu Studio API
app.use('/api/router-menu', routerMenuRouter);

// Refactor Console API
const refactorConsoleRouter = require('./routes/refactorConsole');
app.use('/api/refactor-console', refactorConsoleRouter);
// --- 404 HANDLER ----------------------------------------------------
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// --- STATIC FRONTEND ------------------------------------------------
app.use('/uploads', express.static(path.resolve(__dirname, '../misc/public/uploads')));
app.use('/assets', express.static(path.resolve(__dirname, '../src/assets')));

// Serve images from front-end/public/images/ (dev) or front-end/dist/images/ (prod)
// This must come BEFORE the catch-all route to serve actual image files
// Try both locations - use dist if it exists (production build), otherwise use public (dev)
const distImagesPath = path.resolve(__dirname, '../front-end/dist/images');
const publicImagesPath = path.resolve(__dirname, '../front-end/public/images');
let imagesPath = null;

if (fs.existsSync(distImagesPath)) {
  imagesPath = distImagesPath;
  console.log(`✅ [Server] Serving /images/* from: ${imagesPath} (dist)`);
} else if (fs.existsSync(publicImagesPath)) {
  imagesPath = publicImagesPath;
  console.log(`✅ [Server] Serving /images/* from: ${imagesPath} (public)`);
} else {
  console.warn(`⚠️  [Server] Images directory not found in dist or public`);
}

if (imagesPath) {
  app.use('/images', express.static(imagesPath));
}

// Serve dynamic addon components (development & production paths)
const addonsPath = process.env.NODE_ENV === 'production' 
  ? '/var/www/orthodoxmetrics/addons' 
  : path.resolve(__dirname, '../misc/public/addons');
app.use('/addons', express.static(addonsPath));

// Explicit route for manifest.json to fix 403 errors
app.get('/manifest.json', (req, res) => {
  const manifestPath = path.resolve(__dirname, '../front-end/dist/manifest.json');
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(manifestPath);
});

// Explicit route for build.meta.json to fix 403 errors
app.get('/build.meta.json', (req, res) => {
  // Try multiple locations for build.meta.json
  const locations = [
    path.resolve(__dirname, '../front-end/dist/build.meta.json'),
    path.resolve(__dirname, '../front-end/build.meta.json'),
    path.resolve(__dirname, '../front-end/public/build.meta.json')
  ];
  
  for (const buildMetaPath of locations) {
    if (fs.existsSync(buildMetaPath)) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.sendFile(buildMetaPath);
    }
  }
  
  // If file doesn't exist in any location, return a default response
  res.json({
    buildTime: new Date().toISOString(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || 'development'
  });
});

// Version-aware static file serving
// IMPORTANT: Skip /images/* requests here - they're handled by the specific /images middleware above
app.use(versionSwitcherMiddleware);
app.use((req, res, next) => {
  // Don't handle /images/* here - let the specific /images middleware handle it
  if (req.path.startsWith('/images/')) {
    return next();
  }
  if (req.versionPath) {
    express.static(req.versionPath)(req, res, next);
  } else {
    express.static(path.resolve(__dirname, '../front-end/dist'))(req, res, next);
  }
});

// Catch-all handler: send back React's index.html file for any non-API routes
app.get('*', versionSwitcherMiddleware, (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }

  // Serve version-specific index.html
  const versionPath = req.versionPath || path.resolve(__dirname, '../front-end/dist');
  const indexPath = path.join(versionPath, 'index.html');
  res.sendFile(indexPath);
});

// --- EMAIL QUEUE PROCESSING ------------------------------------------
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



// --- WEBSOCKET INTEGRATION -----------------------------------------
const websocketService = require('./services/websocketService');

// Initialize JIT WebSocket
if (jitTerminalRouter.setupJITWebSocket) {
  const jitWebSocket = jitTerminalRouter.setupJITWebSocket(server);
  console.log('🔌 JIT Terminal WebSocket initialized');
}

// Initialize OMAI Logger WebSocket
const WebSocket = require('ws');
const omaiLoggerWss = new WebSocket.Server({
  server,
  path: '/ws/omai-logger'
});

omaiLoggerWss.on('connection', (ws, req) => {
  console.log('🔌 OMAI Logger WebSocket connected');
  
  // Store the WebSocket connection for broadcasting
  if (omaiLoggerRouter.ws) {
    omaiLoggerRouter.ws(ws);
  }
  
  ws.on('error', (error) => {
    console.error('❌ OMAI Logger WebSocket error:', error);
  });
  
  ws.on('close', () => {
    console.log('🔌 OMAI Logger WebSocket disconnected');
  });
});

console.log('🔌 OMAI Logger WebSocket initialized on /ws/omai-logger');

// --- START SERVER ---------------------------------------------------
server.listen(PORT, HOST, () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log(`🚀 Server running in ${nodeEnv.toUpperCase()} mode at http://${HOST}:${PORT}`);
  if (nodeEnv !== 'production') {
    console.log('📋 Development mode: Enhanced logging and verbose output enabled');
  } else {
    console.log('🔧 Production mode: Optimized for performance and reduced logging');
  }
  
  // Initialize WebSocket service after server starts
  websocketService.initialize(server, sessionMiddleware);
  console.log('🔌 WebSocket service initialized');
});

app.get('/api/auth/check', (req,res)=>{
  const u = req.session && req.session.user;
  if (u) return res.json({ authenticated: true, user: u });
  res.status(401).json({ authenticated: false, message: 'Not authenticated' });
});

// Removed duplicate /api/user/profile route - already handled by userProfileRouter

// --- GLOBAL ERROR HANDLER (MUST be after all routes) -------------------
const apiErrorHandler = require('./middleware/apiErrorHandler');

// Register error handler for API routes
app.use(apiErrorHandler);

// Catch-all error handler for unhandled errors
app.use((err, req, res, next) => {
  // If headers already sent, delegate to default handler
  if (res.headersSent) {
    return next(err);
  }
  
  // For API routes, use the API error handler
  if (req.path && req.path.startsWith('/api/')) {
    return apiErrorHandler(err, req, res, next);
  }
  
  // For non-API routes, use default Express error handler
  next(err);
});

console.log('✅ Global API error handler registered');
