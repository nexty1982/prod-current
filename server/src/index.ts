// ?? backend/server/index.js
// Load centralized configuration first (this will also load .env files)
// In src: ./config -> src/config/index.ts (compiled to dist/src/config/index.js)
// In dist: ./config -> dist/src/config/index.js
let serverConfig: any;
try {
  // Try to load from src/config (works in both src and dist after compilation)
  serverConfig = require('./config');
} catch (error: any) {
  // Fallback: try alternative path (for dist environment)
  try {
    serverConfig = require('./config');
  } catch (e) {
    console.error('❌ Failed to load centralized config:', error.message);
    console.error('   Falling back to process.env (backward compatibility)');
    // Create a minimal config object for backward compatibility
    const corsOrigins = process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',').map((s: string) => s.trim())
      : [
          'https://orthodoxmetrics.com',
          'http://orthodoxmetrics.com',
          'https://www.orthodoxmetrics.com',
          'http://www.orthodoxmetrics.com',
          'http://localhost:3000',
          'https://localhost:3000',
          'http://localhost:5173',
          'https://localhost:5173',
          'http://localhost:5174',
          'https://localhost:5174',
          'http://192.168.1.239:5174',
          'http://192.168.1.239:5173',
        ];
    serverConfig = {
      server: {
        env: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || '3001'),
        host: process.env.HOST || '0.0.0.0',
        trustProxy: process.env.TRUST_PROXY !== 'false',
      },
      db: {
        app: {
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'orthodoxapps',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'orthodoxmetrics_db',
          port: parseInt(process.env.DB_PORT || '3306'),
        },
        auth: {
          host: process.env.AUTH_DB_HOST || process.env.DB_HOST || 'localhost',
          user: process.env.AUTH_DB_USER || process.env.DB_USER || 'orthodoxapps',
          password: process.env.AUTH_DB_PASSWORD || process.env.DB_PASSWORD || '',
          database: process.env.AUTH_DB_NAME || process.env.AUTH_DB || process.env.DB_NAME || 'orthodoxmetrics_db',
          port: parseInt(process.env.AUTH_DB_PORT || process.env.DB_PORT || '3306'),
        },
      },
      session: {
        secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
        cookieName: process.env.SESSION_COOKIE_NAME || 'orthodoxmetrics.sid',
        cookieDomain: process.env.SESSION_COOKIE_DOMAIN,
        secure: process.env.SESSION_SECURE === 'true',
        sameSite: process.env.SESSION_SAME_SITE || 'lax',
        maxAgeMs: parseInt(process.env.SESSION_MAX_AGE_MS || '86400000'),
        store: process.env.SESSION_STORE || 'mysql',
      },
      cors: {
        allowedOrigins: corsOrigins,
        credentials: process.env.CORS_CREDENTIALS !== 'false',
      },
      paths: {},
      features: {
        interactiveReports: process.env.FEATURE_INTERACTIVE_REPORTS !== 'false',
        notifications: process.env.FEATURE_NOTIFICATIONS !== 'false',
        ocr: process.env.FEATURE_OCR !== 'false',
        certificates: process.env.FEATURE_CERTIFICATES !== 'false',
        invoices: process.env.FEATURE_INVOICES !== 'false',
      },
    };
  }
}

// Boot signature to verify PM2 is running the correct dist/index.js
console.log('BOOT_SIGNATURE_OCR', __filename, new Date().toISOString());

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Runtime will use dist/ as root; import session from ./config once dist is self-contained
const sessionMiddleware = require('./config/session');
const db = require('./config/db');
// Once build copies middleware into dist/, use dist-local imports
const { requestLogger, errorLogger } = require('./middleware/logger');
const { versionSwitcherMiddleware, getBuildPath, getSelectedVersion } = require('./middleware/versionSwitcher');
const { requestLogger: dbRequestLogger } = require('./middleware/requestLogger');
// Import client context middleware for multi-tenant support
const { clientContext, clientContextCleanup } = require('./middleware/clientContext');

// Refactor Console router (CommonJS require for compatibility)
let refactorConsoleRouter: any;
try {
  console.log('[Server] Loading Refactor Console router...');
  refactorConsoleRouter = require('./routes/refactorConsole');
  console.log('[Server] Refactor Console router loaded, type:', typeof refactorConsoleRouter);
  if (refactorConsoleRouter) {
    console.log('[Server] Router has use method:', typeof refactorConsoleRouter.use === 'function');
    console.log('[Server] Router stack length:', refactorConsoleRouter.stack?.length || 0);
  }
} catch (error: any) {
  console.error('[Server] ❌ Failed to load Refactor Console router:', error.message);
  console.error('[Server] Error stack:', error.stack);
  refactorConsoleRouter = null;
}

// --- API ROUTES -----------------------------------------------------
const authRoutes = require('./routes/auth');
const adminRoutes = require('./api/admin'); // Admin routes are in api/admin.js, not routes/admin.js
const omtraceRoutes = require('./api/omtrace'); // OMTrace dependency analysis routes
const maintenancePublicRoutes = require('./api/maintenance-public'); // Public maintenance status
const adminLogsRouter = require('./api/adminLogs'); // Admin log monitoring API
const socketService = require('./services/socketService'); // Socket.IO service for real-time log alerts
const logMonitor = require('./services/logMonitor'); // PM2 log monitoring service
const debugRoutes = require('./routes/debug');
const menuManagementRoutes = require('./routes/menuManagement');
const menuPermissionsRoutes = require('./routes/menuPermissions');
const notesRoutes = require('./routes/notes');
const baptismRouter = require('./routes/baptism');
const marriageRouter = require('./routes/marriage');
const funeralRouter = require('./routes/funeral');
const uniqueValuesRouter = require('./routes/unique-values');
const dropdownOptionsRouter = require('./routes/dropdownOptions');
// Load baptismCertificates router with error handling for native module issues
let baptismCertificatesRouter: any;
try {
    baptismCertificatesRouter = require('./routes/baptismCertificates');
} catch (e: any) {
    console.error('⚠️  [Server] Failed to load baptismCertificates router:', e.message);
    console.error('   Creating stub router. Certificate routes will return 503.');
    // Create a stub router that returns 503 for all requests
    const express = require('express');
    const stubRouter = express.Router();
    stubRouter.use((req: any, res: any) => {
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
let marriageCertificatesRouter: any;
try {
    marriageCertificatesRouter = require('./routes/marriageCertificates');
} catch (e: any) {
    console.error('⚠️  [Server] Failed to load marriageCertificates router:', e.message);
    const express = require('express');
    const stubRouter = express.Router();
    stubRouter.use((req: any, res: any) => {
        res.status(503).json({
            success: false,
            error: 'Service temporarily unavailable',
            message: 'Marriage certificates module failed to load. Native dependencies may need rebuilding.',
            details: e.message
        });
    });
    marriageCertificatesRouter = stubRouter;
}
// Load churchCertificates router with error handling for native module issues
let churchCertificatesRouter: any;
try {
    churchCertificatesRouter = require('./api/churchCertificates');
} catch (e: any) {
    console.error('⚠️  [Server] Failed to load churchCertificates router:', e.message);
    const express = require('express');
    const stubRouter = express.Router({ mergeParams: true });
    stubRouter.use((req: any, res: any) => {
        res.status(503).json({
            success: false,
            error: 'Service temporarily unavailable',
            message: 'Church certificates module failed to load. Canvas native module needs rebuilding.',
            details: e.message,
            fix: 'Run: cd /var/www/orthodoxmetrics/prod/server && npm rebuild canvas'
        });
    });
    churchCertificatesRouter = stubRouter;
}
const tutorialsRouter = require('./routes/tutorials');
const calendarRouter = require('./routes/calendar');
const dashboardRouter = require('./routes/dashboard');
const invoicesRouter = require('./routes/invoices');
const invoicesMultilingualRouter = require('./routes/invoicesMultilingual');
const enhancedInvoicesRouter = require('./routes/enhancedInvoices');
const billingRouter = require('./routes/billing');
const churchesRouter = require('./routes/churches');
const provisionRouter = require('./routes/provision');
// Load certificates router with error handling for native module issues
let certificatesRouter: any;
try {
    certificatesRouter = require('./routes/certificates');
} catch (e: any) {
    console.error('⚠️  [Server] Failed to load certificates router:', e.message);
    const express = require('express');
    const stubRouter = express.Router();
    stubRouter.use((req: any, res: any) => {
        res.status(503).json({
            success: false,
            error: 'Service temporarily unavailable',
            message: 'Certificates module failed to load. Native dependencies may need rebuilding.',
            details: e.message
        });
    });
    certificatesRouter = stubRouter;
}
const ecommerceRouter = require('./routes/ecommerce');
const { router: notificationRouter } = require('./routes/notifications');
const kanbanRouter = require('./routes/kanban');
const { router: logsRouter } = require('./routes/logs');
const globalOmaiRouter = require('./routes/globalOmai');
const versionRouter = require('./routes/version');
const systemStatusRouter = require('./api/systemStatus');
const dailyTasksRouter = require('./api/dailyTasks');
const omDailyRouter = require('./routes/om-daily');
const crmRouter = require('./routes/crm');
const analyticsRouter = require('./routes/analytics'); // US Church Map analytics
const omChartsRouter = require('./api/om-charts'); // OM Charts: graphical charts from church records
const dashboardHomeRouter = require('./api/dashboard-home'); // Dashboard Home: summary data for church dashboard
const { routesRouter: apiExplorerRoutesRouter, testsRouter: apiExplorerTestsRouter } = require('./api/apiExplorer');
// Add missing router imports
const churchRecordsRouter = require('./routes/records'); // Church records functionality
const powerSearchRouter = require('./api/powerSearchApi'); // Power Search API for advanced record filtering
const uploadTokenRouter = require('./routes/uploadToken');
const templatesRouter = require('./routes/templates');
const globalTemplatesRouter = require('./routes/globalTemplates');
// Load admin templates router (for /api/admin/templates)
let adminTemplatesRouter;
try {
  adminTemplatesRouter = require('./routes/admin/templates');
  console.log('✅ [Server] Admin templates router loaded successfully');
} catch (error) {
  console.error('❌ [Server] Failed to load admin templates router:', error);
  // Create a dummy router that returns 500 to prevent crashes
  const express = require('express');
  adminTemplatesRouter = express.Router();
  adminTemplatesRouter.use((req, res) => {
    res.status(500).json({ success: false, error: 'Admin templates router failed to load' });
  });
}
const metricsRouter = require('./routes/metrics');
// Removed duplicate: recordsRouter - already loaded as churchRecordsRouter
const importRecordsRouter = require('./routes/records-import'); // Records import functionality
const scriptRunnerRouter = require('./routes/runScript'); // Secure script runner for admin users

// Import client API router for multi-tenant client endpoints (with safe loader)
let clientApiRouter;
try {
  clientApiRouter = require('./routes/clientApi');
  console.log('✅ [Server] Client API router loaded successfully');
} catch (error) {
  console.error('❌ [Server] Failed to load client API router:', error.message);
  console.error('   This is non-fatal - server will continue without client API routes');
  // Create a dummy router that returns 501 (Not Implemented) to prevent crashes
  const express = require('express');
  clientApiRouter = express.Router();
  clientApiRouter.use((req, res) => {
    res.status(501).json({ 
      error: 'Client API feature not available',
      message: 'Router module not found. Check build process.'
    });
  });
}
// Import admin system management router
const adminSystemRouter = require('./routes/adminSystem');
// Import church admin management router for multi-database support
const churchAdminRouter = require('./routes/admin/church');
// Import churches management router for church provisioning
const churchesManagementRouter = require('./routes/admin/churches');
const sessionsRouter = require('./routes/admin/sessions');
const usersRouter = require('./routes/admin/users');
const adminInvitesRouter = require('./routes/admin/invites');
const inviteRegisterRouter = require('./routes/invite-register');
const churchRegisterRouter = require('./routes/church-register');
const activityLogsRouter = require('./routes/admin/activity-logs');
// Import new modular admin route files (extracted from monolithic admin.js)
const churchUsersRouter = require('./routes/admin/church-users');
const churchDatabaseRouter = require('./routes/admin/church-database');
const userRouter = require('./routes/user'); // User routes
// Load funeralCertificates router with error handling for native module issues
let funeralCertificatesRouter: any;
try {
    funeralCertificatesRouter = require('./routes/funeralCertificates');
} catch (e: any) {
    console.error('⚠️  [Server] Failed to load funeralCertificates router:', e.message);
    const express = require('express');
    const stubRouter = express.Router();
    stubRouter.use((req: any, res: any) => {
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
// Import OCR feeder router for content ingestion
const feederRouter = require('./routes/feeder');
// Import service management router for system monitoring and control
const servicesRouter = require('./routes/admin/services');
// Import components management router for system component control
const componentsRouter = require('./routes/admin/components');
const settingsRouter = require('./routes/settings');
// Import system update routes (safe to fail if not available)
let systemUpdateRouter;
try {
    systemUpdateRouter = require('./routes/system');
    console.log('✅ [Server] System update routes loaded');
} catch (error) {
    console.warn('⚠️  [Server] System update routes not available:', error.message);
    // Create stub router to prevent crashes
    systemUpdateRouter = require('express').Router();
    systemUpdateRouter.all('*', (req, res) => {
        res.status(503).json({
            success: false,
            error: 'System update functionality not available',
            message: 'The update system is not configured on this server'
        });
    });
}
// Import social module routers
const socialBlogRouter = require('./routes/social/blog');
const socialFriendsRouter = require('./routes/social/friends');
const socialChatRouter = require('./routes/social/chat');
const socialNotificationsRouter = require('./routes/social/notifications');
// Import backup management routers
const backupRouter = require('./api/backups'); // New database-integrated backup API
const legacyBackupRouter = require('./routes/admin/backups'); // Legacy backup router
// Import original backup system router
const originalBackupRouter = require('./routes/backup');
// Import NFS backup configuration router
const nfsBackupRouter = require('./routes/admin/nfs-backup');
// Import Big Book system router
const bigBookRouter = require('./routes/bigbook');
const libraryRouter = require('./routes/library');
const menuRouter = require('./routes/menu');

// Import OM-AI system router
const omaiRouter = require('./routes/omai');
const omaiMemoriesRouter = require('./routes/omai/memories');
// const omaiRouter = require('./routes/omai-test'); // TEMPORARY TEST
const ombRouter = require('./routes/omb');
// Import mock APIs to prevent 404 errors
const mockApisRouter = require('./routes/mock-apis');
// Import JIT Terminal router for secure server access (with error handling)
let jitTerminalRouter: any;
try {
    jitTerminalRouter = require('./routes/jit-terminal');
} catch (e: any) {
    console.error('⚠️  [Server] Failed to load jit-terminal router:', e.message);
    const express = require('express');
    const stubRouter = express.Router();
    stubRouter.use((req: any, res: any) => {
        res.status(503).json({
            success: false,
            error: 'Service temporarily unavailable',
            message: 'JIT Terminal module failed to load. Native dependencies may need rebuilding.',
            details: e.message,
            fix: 'Run: cd /var/www/orthodoxmetrics/prod/server && npm rebuild node-pty'
        });
    });
    // Stub WebSocket setup function
    stubRouter.setupJITWebSocket = () => {
        console.warn('⚠️  [Server] JIT WebSocket setup skipped - module not available');
        return null;
    };
    jitTerminalRouter = stubRouter;
}
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
const { registerRouterMenuStudio } = require("./features/routerMenuStudio");
// Import Router/Menu Studio feature (JavaScript version)
// Import Router/Menu Studio feature

const app = express();
const server = http.createServer(app);

// NOTE: Socket.IO is initialized once by websocketService (at server startup below).
// socketService was previously initialized here too, causing duplicate Socket.IO servers
// on the same HTTP server → "Invalid frame header" WebSocket errors.
// websocketService already handles admin log streaming via broadcastLogEntry().

// Trust proxy configuration (from centralized config)
app.set('trust proxy', serverConfig.server.trustProxy ? 1 : 0);

// --- CORS SETUP -----------------------------------------------------
// Use centralized configuration for CORS
const allowedOrigins = serverConfig.cors.allowedOrigins;

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn('❌ CORS blocked origin:', origin);
    callback(new Error('CORS policy does not allow access from origin: ' + origin));
  },
  credentials: serverConfig.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie']
}));

const PORT = serverConfig.server.port;
const HOST = serverConfig.server.host;

// 🔧 FIXED: Middleware order is CRITICAL for session authentication
console.log('🔧 Setting up middleware in correct order...');

// Log auth-optional paths configuration
const { logAuthConfiguration } = require('./middleware/auth');
logAuthConfiguration();

// 1. Logging middleware (first)
app.use(morgan('dev'));

// 2. Body parsing middleware (before session)
// Note: express.json() and express.urlencoded() automatically skip multipart/form-data
// So they won't interfere with multer file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// !! CRITICAL — cookieParser MUST receive the session secret — SEE server/CONFIG.md !!
// Without the secret, express-session's signed cookies break and every request gets a new session.
// This caused a production outage on 2026-02-02. NEVER call cookieParser() without the secret.
console.log('🔑 cookieParser secret check:', {
  length: serverConfig.session.secret?.length || 0,
  prefix: serverConfig.session.secret?.substring(0, 8) || 'MISSING',
});
app.use(cookieParser(serverConfig.session.secret));

// Multer setup for file uploads (must be after body parsers)
const multer = require('multer');
const upload = multer({ 
  dest: 'uploads/temp/',
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

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
  // Log ALL POST requests immediately (especially uploads)
  if (req.method === 'POST') {
    console.log(`📤📤📤 POST REQUEST RECEIVED: ${req.method} ${req.originalUrl || req.path}`, {
      path: req.path,
      originalUrl: req.originalUrl,
      url: req.url,
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      sessionID: req.sessionID,
      sessionUser: req.session?.user?.email || 'Not authenticated',
    });
  } else {
    // Only log non-POST requests if they're not polling endpoints
    if (!req.path.includes('notifications') && !req.path.includes('counts')) {
      console.log(`🌍 Request: ${req.method} ${req.path}`);
    }
  }
  next();
});

// --- ROUTES ---------------------------------------------------------
console.log('🛤️  Setting up routes in correct order...');

// ============================================================================
// PUBLIC HEALTH ENDPOINTS - Registered BEFORE all other routes
// ============================================================================
// These MUST be defined before any auth middleware or routers that might
// intercept them. Direct app.get() registration ensures they are never blocked.

// GET /api/system/health - System health check (NO AUTH)
app.get('/api/system/health', async (req, res) => {
  try {
    const dbStatus = await db.testConnection();
    const memoryUsage = process.memoryUsage();
    
    res.json({
      status: dbStatus.success ? 'ok' : 'error',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: dbStatus,
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
      }
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error', 
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/maintenance/status - Maintenance status check (NO AUTH)
app.get('/api/maintenance/status', (req, res) => {
  try {
    const fs = require('fs');
    const MAINTENANCE_FILE = '/var/www/orthodoxmetrics/maintenance.on';
    const exists = fs.existsSync(MAINTENANCE_FILE);
    let startTime = null;
    
    if (exists) {
      const stats = fs.statSync(MAINTENANCE_FILE);
      startTime = stats.mtime.toISOString();
    }
    
    res.json({
      maintenance: exists,
      status: exists ? 'updating' : 'production',
      startTime: startTime,
      message: exists ? 'System is currently under maintenance' : null
    });
  } catch (error) {
    res.json({
      maintenance: false,
      status: 'production',
      message: null
    });
  }
});

console.log('✅ Public health endpoints registered (no auth required)');
// ============================================================================

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
app.use('/api/invite', inviteRegisterRouter); // Public invite validation + registration
console.log('✅ [Server] Mounted /api/invite route (public invite registration)');
app.use('/api/auth', churchRegisterRouter); // Public church token registration
app.use('/api', churchRegisterRouter); // Admin token management endpoints
console.log('✅ [Server] Mounted church registration token routes');
app.use('/api/churches', churchesRouter);
// Mount churches router at /api/my to handle /api/my/churches
app.use('/api/my', churchesRouter);

// Authentication routes (no auth required for login itself)

// Register Router/Menu Studio feature (requires authentication)
app.use('/api/auth', authRoutes);

// Internal build events endpoint (token-protected, no auth middleware)
const buildEventsRouter = require('./routes/internal/buildEvents');
app.use('/api/internal', buildEventsRouter);
console.log('✅ [Server] Mounted /api/internal/build-events route');

// 🔧 FIXED: Specific admin routes BEFORE general admin routes
app.use('/api/admin/church', churchAdminRouter);

app.use('/api/admin/system', adminSystemRouter);
// Admin churches routes - mount compatibility router first to catch legacy paths
const churchesCompatRouter = require('./routes/admin/churches-compat');
// Mount compatibility router for both /churches (plural) and /church (singular) paths
app.use('/api/admin/churches', churchesCompatRouter);
app.use('/api/admin/church', churchesCompatRouter); // Legacy singular path support
// Mount main churches router after compatibility router
app.use('/api/admin/churches', churchesManagementRouter);
app.use('/api/admin/sessions', sessionsRouter);
app.use('/api/admin/users', usersRouter); // 🎯 CRITICAL: This route was being intercepted
app.use('/api/admin/invites', adminInvitesRouter);
console.log('✅ [Server] Mounted /api/admin/invites route (invite user management)');
// Removed duplicate mounting - users are managed through /api/admin/users
app.use('/api/admin/activity-logs', activityLogsRouter);
app.use('/api/admin/templates', adminTemplatesRouter);
console.log('✅ [Server] Mounted /api/admin/templates route');
app.use('/api/admin/logs', adminLogsRouter);
console.log('✅ [Server] Mounted /api/admin/logs route (log monitoring)');
const logSearchRouter = require('./routes/admin/log-search');
app.use('/api/admin/log-search', logSearchRouter);
console.log('✅ [Server] Mounted /api/admin/log-search route');
app.use('/api/admin/global-images', globalImagesRouter);
// Build status endpoint for admins
const buildStatusRouter = require('./routes/admin/buildStatus');
app.use('/api/admin', buildStatusRouter);
console.log('✅ [Server] Mounted /api/admin/build-status route');

// Admin auth check (for Nginx auth_request)
const authCheckRouter = require('./routes/admin/auth-check');
app.use('/api/admin/auth', authCheckRouter);
console.log('✅ [Server] Mounted /api/admin/auth/check route (for Nginx auth_request)');

// OM-Ops Reports Hub (includes Git Operations)
const opsRouter = require('./routes/admin/ops');
app.use('/api/ops', opsRouter);
console.log('✅ [Server] Mounted /api/ops route (includes Git Operations)');

// Health/Diagnostics endpoint for route verification (admin-only)
const { requireAuth: requireAuthForRoutes } = require('./middleware/requireAuth');
const requireAdminForRoutes = (req, res, next) => {
  const user = req.session?.user || req.user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  const userRole = user.role;
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};
app.get('/api/admin/_routes', requireAuthForRoutes, requireAdminForRoutes, (req, res) => {
  const routes = {
    success: true,
    timestamp: new Date().toISOString(),
    entrypoint: 'dist/index.js (compiled from src/index.ts)',
    routes: {
      '/api/admin/templates': {
        mounted: true,
        router: 'routes/admin/templates',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      },
      '/api/admin/churches': {
        mounted: true,
        router: 'routes/admin/churches',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      },
      '/api/admin/users': {
        mounted: true,
        router: 'routes/admin/users',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      }
    },
    build_info: {
      node_version: process.version,
      node_env: serverConfig.server.env,
      port: serverConfig.server.port
    }
  };
  res.json(routes);
});
app.use('/api/feeder', feederRouter);
app.use('/api/backups', backupRouter);
app.use('/api/backup', originalBackupRouter);
app.use('/api/admin/nfs-backup', nfsBackupRouter);
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
app.use('/api/tutorials', tutorialsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/system', systemUpdateRouter); // System update routes (super_admin only, with safe fallback)
console.log('✅ [Server] Mounted /api/system route (updates, build-info)');
// Import unified backup routes
const backupsRouter = require('./routes/backups');
app.use('/api/backups', backupsRouter);
console.log('✅ [Server] Mounted /api/backups route (backup management)');
app.use('/api/build', buildRouter);
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
// OM-Library routes (documentation library indexed by om-librarian)
app.use('/api/library', libraryRouter);
console.log('✅ [Server] Mounted /api/library routes (OM-Library documentation)');
// Menu API routes for super_admin editable navigation
app.use('/api', menuRouter);
console.log('✅ [Server] Mounted /api/ui/menu and /api/admin/menus routes (Editable Menu System)');
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

// Impersonation ("Login As") routes (auth checked inside each handler)
const impersonateRouter = require('./api/impersonate');
app.use('/api/admin/impersonate', impersonateRouter);
console.log('✅ [Server] Mounted /api/admin/impersonate route');

// General admin routes (AFTER specific routes to prevent conflicts)
app.use('/api/admin', adminRoutes);
console.log(`✅ Admin routes mounted at /api/admin from ${require.resolve('./api/admin')}`);

// OMTrace dependency analysis routes (admin-only)
app.use('/api/omtrace', omtraceRoutes);
console.log('✅ [Server] Mounted /api/omtrace routes (dependency analysis)');

// Public maintenance status (no auth — polled by front-end)
app.use('/api/maintenance', maintenancePublicRoutes);
console.log('✅ [Server] Mounted /api/maintenance routes (public status)');

app.use('/api/version', versionRouter); // Version switcher for superadmins
app.use('/api/system', systemStatusRouter); // System status for admin HUD
app.use('/api/system', apiExplorerRoutesRouter); // API Explorer route introspection (super_admin)
app.use('/api/admin/api-tests', apiExplorerTestsRouter); // API Explorer test cases CRUD + runner (super_admin)
console.log('✅ [Server] Mounted /api/system/routes and /api/admin/api-tests (API Explorer)');
app.use('/api/admin/tasks', dailyTasksRouter); // Daily tasks management
app.use('/api/om-daily', omDailyRouter); // OM Daily work pipelines
console.log('✅ [Server] Mounted /api/om-daily routes (Work Pipelines)');
app.use('/api/crm', crmRouter); // CRM pipeline & outreach
console.log('✅ [Server] Mounted /api/crm routes (CRM & Outreach)');
app.use('/api/analytics', analyticsRouter); // US Church Map analytics
console.log('✅ [Server] Mounted /api/analytics routes (US Church Map)');
app.use('/api/churches/:churchId/charts', omChartsRouter); // OM Charts
console.log('✅ [Server] Mounted /api/churches/:churchId/charts routes (OM Charts)');
app.use('/api/churches/:churchId/dashboard', dashboardHomeRouter); // Dashboard Home
console.log('✅ [Server] Mounted /api/churches/:churchId/dashboard routes (Dashboard Home)');

// Other authenticated routes
app.use('/api/user', userRouter);
app.use('/api/church-records', churchRecordsRouter);
app.use('/api/churches/:churchId/records', churchRecordsRouter);

// Power Search API - Advanced record filtering with server-side pagination
// Feature can be disabled per-church via power_search_enabled flag
app.use('/api/records', powerSearchRouter);
console.log('[BOOT] Power Search routes mounted at /api/records');

app.use('/api/kanban', kanbanRouter);

// User profile routes (authenticated)
const userProfileRouter = require('./routes/user-profile');
app.use('/api/user/profile', userProfileRouter);

// Profile image upload routes (avatar + banner)
const profileUploadRouter = require('./routes/upload');
app.use('/api/upload', profileUploadRouter);

// Contact form (public - no auth required)
app.post('/api/contact', async (req: any, res: any) => {
  try {
    const { firstName, lastName, phone, email, enquiryType, message } = req.body;
    if (!firstName || !lastName || !email || !phone || !message) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled out.' });
    }
    // Send email to info@orthodoxmetrics.com
    const { sendContactEmail } = require('./utils/emailService');
    const emailResult = await sendContactEmail({ firstName, lastName, phone, email, enquiryType, message });
    if (!emailResult.success) {
      console.error('Contact email failed:', emailResult.error);
    }
    // Create contact_us notification for all super_admins
    try {
      const { getAppPool } = require('./config/db-compat');
      const [admins] = await getAppPool().query(
        "SELECT id FROM orthodoxmetrics_db.users WHERE role = 'super_admin' AND is_active = 1"
      );
      const { notificationService } = require('./api/notifications');
      const enquiryLabels: Record<string, string> = {
        general: 'General Enquiry', parish_registration: 'Parish Registration',
        records: 'Records & Certificates', technical: 'Technical Support',
        billing: 'Billing & Pricing', other: 'Other',
      };
      for (const admin of admins) {
        await notificationService.createNotification(
          admin.id,
          'contact_us',
          'New Contact Form Submission',
          `${firstName} ${lastName} (${email}) sent a ${enquiryLabels[enquiryType] || enquiryType} enquiry.`,
          {
            priority: 'normal',
            actionUrl: null,
            data: { firstName, lastName, email, phone, enquiryType, message: message.substring(0, 500) },
          }
        );
      }
      console.log(`📬 Contact Us notification sent to ${admins.length} super_admin(s)`);
    } catch (notifErr: any) {
      console.error('Contact notification failed (non-fatal):', notifErr.message);
    }
    res.json({ success: true, message: 'Your message has been sent successfully.' });
  } catch (error: any) {
    console.error('Contact form error:', error);
    res.status(500).json({ success: false, message: 'Failed to send your message. Please try again later.' });
  }
});

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

// Church-specific certificate routes (uses church database pools)
app.use('/api/church/:churchId/certificate', churchCertificatesRouter);

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
// Add middleware to log ALL requests to /api/gallery before routing
app.use('/api/gallery', (req, res, next) => {
  console.log(`🖼️🖼️🖼️ GALLERY REQUEST: ${req.method} ${req.path}`, {
    originalUrl: req.originalUrl,
    url: req.url,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    sessionID: req.sessionID,
    sessionUser: req.session?.user?.email || 'Not authenticated',
  });
  next();
});

const galleryRouter = require('./routes/gallery');
console.log('🖼️ Registering /api/gallery routes');
app.use('/api/gallery', galleryRouter);
console.log('✅ /api/gallery routes registered');
const docsRouter = require('./routes/docs');
console.log('📚 Registering /api/docs routes');
app.use('/api/docs', docsRouter);
console.log('✅ /api/docs routes registered');

// User Files Routes
const userFilesRouter = require('./routes/user-files');
console.log('👤 Registering /api/user-files routes');
app.use('/api/user-files', userFilesRouter);
console.log('✅ /api/user-files routes registered');

// Conversation Log Routes (super_admin only)
const conversationLogRouter = require('./routes/conversation-log');
app.use('/api/conversation-log', requireAuthForRoutes, requireAdminForRoutes, conversationLogRouter);
console.log('✅ [Server] Mounted /api/conversation-log routes');

// OCR Feeder Worker — polls platform DB for pending jobs
try {
  const { workerLoop } = require('./workers/ocrFeederWorker');
  workerLoop().catch((err: any) => console.error('[OCR Worker] Fatal error:', err));
  console.log('✅ [OCR] Feeder worker started');
} catch (e: any) {
  console.warn('⚠️  [OCR] Failed to start feeder worker:', e.message);
}

// OCR Routes — modular routers (admin + church-scoped)
try {
  const { mountOcrRoutes } = require('./routes/ocr');
  mountOcrRoutes(app, upload);
} catch (e: any) {
  console.error('❌ [OCR] Failed to mount OCR routes:', e.message);
}

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

// Interactive Reports routes (with safe loader to prevent crashes)
let interactiveReportsRouter;
try {
  interactiveReportsRouter = require('./routes/interactiveReports');
  console.log('✅ [Server] Interactive reports router loaded successfully');
  app.use('/api/records/interactive-reports', interactiveReportsRouter);
  app.use('/r/interactive', interactiveReportsRouter); // Public routes
} catch (error) {
  console.error('❌ [Server] Failed to load interactive reports router:', error.message);
  console.error('   This is non-fatal - server will continue without interactive reports feature');
  // Create a dummy router that returns 501 (Not Implemented) to prevent crashes
  const express = require('express');
  interactiveReportsRouter = express.Router();
  interactiveReportsRouter.use((req, res) => {
    res.status(501).json({ 
      error: 'Interactive reports feature not available',
      message: 'Router module not found. Check build process.'
    });
  });
  app.use('/api/records/interactive-reports', interactiveReportsRouter);
  app.use('/r/interactive', interactiveReportsRouter);
}

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

// --- FRONTEND COMPATIBILITY ALIASES ---------------------------------

// /api/system/version -> server + frontend build info
app.get('/api/system/version', (req, res) => {
  // Auto-detect GIT_SHA from git if not in env
  let gitSha = process.env.GIT_SHA || 'unknown';
  if (gitSha === 'unknown') {
    try {
      const { execSync } = require('child_process');
      gitSha = execSync('git rev-parse --short=7 HEAD', { cwd: path.resolve(__dirname, '..'), timeout: 3000 }).toString().trim();
    } catch (_) { /* git not available or not a repo */ }
  }

  let packageVersion = '1.0.0';
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
    packageVersion = pkg.version || '1.0.0';
  } catch (_) {}

  res.json({
    success: true,
    server: {
      version: packageVersion,
      gitSha: gitSha.length > 7 ? gitSha.substring(0, 7) : gitSha,
      gitShaFull: gitSha,
      buildTime: process.env.BUILD_TIME || null,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
    },
    timestamp: new Date().toISOString()
  });
});

// /api/system/config -> Get current configuration (redacted, admin/dev only)
app.get('/api/system/config', (req, res) => {
  try {
    // Check if user is admin OR if we're in development
    const isAdmin = req.session?.user?.role === 'super_admin' || req.session?.user?.role === 'admin';
    const isDev = serverConfig.server.env === 'development';
    
    if (!isAdmin && !isDev) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. Admin role required.' 
      });
    }
    
    // Use the formatConfigForLog function to redact secrets
    const { formatConfigForLog } = require('./config/redact');
    
    res.json({
      success: true,
      config: formatConfigForLog ? formatConfigForLog(serverConfig) : serverConfig,
      environment: serverConfig.server.env,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to load configuration',
      message: err.message 
    });
  }
});

// /api/admin/session-stats -> same router as /api/admin/sessions
app.use('/api/admin/session-stats', (req, res, next) => {
  // Rewrite to /stats so the sessions router handles it
  req.url = '/stats' + req.url;
  sessionsRouter(req, res, next);
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

// Refactor Console API - Hard-wired route for Phase 1 analysis (backward-compatible)
// This ensures the route works even if router mounting fails
// Now uses async job system to prevent timeouts
app.get('/api/refactor-console/phase1-analysis', async (req: any, res: any) => {
  console.log('[Server] Hard-wired phase1-analysis route called (backward-compatible)');
  try {
    res.setHeader('Content-Type', 'application/json');
    
    // Import the service (handles both src and dist paths)
    let phase1Service: any;
    try {
      phase1Service = require('./services/phase1RecoveryAnalysis');
    } catch (e1) {
      try {
        phase1Service = require('./services/phase1RecoveryAnalysis');
      } catch (e2) {
        try {
          phase1Service = require('./services/phase1RecoveryAnalysis');
        } catch (e3) {
          return res.status(500).json({ 
            ok: false,
            error: 'Failed to load phase1RecoveryAnalysis service',
            message: e3 instanceof Error ? e3.message : 'Unknown error'
          });
        }
      }
    }
    
    if (!phase1Service || !phase1Service.startPhase1Analysis) {
      return res.status(500).json({ 
        ok: false,
        error: 'startPhase1Analysis function not found in service'
      });
    }
    
    const jobId = phase1Service.startPhase1Analysis();
    console.log(`[Server] [Hard-wired] Started job ${jobId}`);
    
    // Return 202 Accepted with jobId (backward-compatible)
    res.status(202).json({ 
      ok: true,
      jobId,
      status: 'started',
      message: 'Phase 1 analysis started in background. Poll /api/refactor-console/jobs/' + jobId + ' for status.'
    });
  } catch (error) {
    console.error('[Server] [Hard-wired] Phase 1 analysis error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        ok: false,
        error: 'Phase 1 analysis failed', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Refactor Console API
if (refactorConsoleRouter && typeof refactorConsoleRouter.use === 'function') {
  console.log('[Server] ✅ Mounting Refactor Console router at /api/refactor-console');
  app.use('/api/refactor-console', refactorConsoleRouter);
  
  // Log registered routes for debugging
  const routes: string[] = [];
  refactorConsoleRouter.stack.forEach((middleware: any) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase()).join(', ');
      routes.push(`${methods} ${middleware.route.path}`);
    }
  });
  console.log('[Server] Refactor Console routes:', routes.join(', '));
} else {
  console.error('[Server] ❌ Refactor Console router is not a valid Express router');
  console.error('[Server] Router type:', typeof refactorConsoleRouter);
  if (refactorConsoleRouter) {
    console.error('[Server] Router keys:', Object.keys(refactorConsoleRouter));
  }
}

registerRouterMenuStudio(app);
// --- 404 HANDLER ----------------------------------------------------
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// --- STATIC FRONTEND ------------------------------------------------
// Serve /images/* from front-end/dist/images (production) or front-end/public/images (development)
// Note: __dirname in dist/index.js is server/dist, so we need to go up to prod root, then into front-end
const prodRoot = path.resolve(__dirname, '../..'); // From server/dist -> server -> prod root
const distImagesPath = path.join(prodRoot, 'front-end/dist/images');
const publicImagesPath = path.join(prodRoot, 'front-end/public/images');
console.log(`[DEBUG] Checking images paths:`);
console.log(`  distImagesPath: ${distImagesPath} (exists: ${fs.existsSync(distImagesPath)})`);
console.log(`  publicImagesPath: ${publicImagesPath} (exists: ${fs.existsSync(publicImagesPath)})`);
let imagesPath: string | null = null;
if (fs.existsSync(distImagesPath)) {
    imagesPath = distImagesPath;
    console.log(`✅ [Server] Serving /images/* from: ${imagesPath} (dist)`);
} else if (fs.existsSync(publicImagesPath)) {
    imagesPath = publicImagesPath;
    console.log(`✅ [Server] Serving /images/* from: ${imagesPath} (public)`);
} else {
    console.warn(`⚠️  [Server] Images directory not found in dist or public`);
    console.warn(`   Checked: ${distImagesPath}`);
    console.warn(`   Checked: ${publicImagesPath}`);
}
if (imagesPath) {
    app.use('/images', express.static(imagesPath));
    console.log(`✅ [Server] /images/* middleware mounted`);
} else {
    console.error(`❌ [Server] Failed to mount /images/* middleware - path not found`);
}

app.use('/uploads', express.static(path.resolve(__dirname, '../misc/public/uploads')));

// Serve static assets with long cache (hashed filenames are immutable)
// Vite produces hashed filenames like assets/index-abc123.js, so these can be cached forever
app.use('/assets', express.static(path.resolve(__dirname, 'assets'), {
  maxAge: '1y', // 1 year cache for hashed assets (immutable)
  immutable: true, // Mark as immutable for better caching
  etag: true,
  lastModified: true
}));

// Serve dynamic addon components (development & production paths)
const addonsPath = process.env.NODE_ENV === 'production' 
  ? '/var/www/orthodoxmetrics/addons' 
  : path.resolve(__dirname, '../misc/public/addons');
app.use('/addons', express.static(addonsPath));

// Explicit route for manifest.json to fix 403 errors
// CRITICAL: Set no-cache for manifest.json to prevent PWA caching issues
app.get('/manifest.json', (req, res) => {
  const manifestPath = path.resolve(__dirname, '../front-end/dist/manifest.json');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
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

// Explicit route for build-info.json (injected by build script)
app.get('/build-info.json', (req, res) => {
  const buildInfoPath = path.resolve(__dirname, '../front-end/dist/build-info.json');
  
  if (fs.existsSync(buildInfoPath)) {
    res.setHeader('Content-Type', 'application/json');
    // CRITICAL: No cache for build-info.json so it always shows latest build
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.sendFile(buildInfoPath);
  }
  
  // Fallback if file doesn't exist
  res.json({
    gitSha: 'unknown',
    buildTime: new Date().toISOString(),
    buildTimestamp: Date.now(),
    version: '1.0.0'
  });
});

// Version-aware static file serving
app.use(versionSwitcherMiddleware);
app.use((req, res, next) => {
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
  // Don't serve index.html for /images/* routes
  // Note: In production, Nginx should serve /images/* directly.
  // This check is a fallback - if we reach here, the static middleware didn't match,
  // which means the file doesn't exist or there's a routing issue.
  if (req.path.startsWith('/images/')) {
    // Return 404 with proper image content-type hint
    res.status(404).json({ error: 'Image not found', path: req.path });
    return;
  }

  // CRITICAL: Set no-cache headers for index.html to ensure users always get latest asset references
  // This prevents browsers from caching index.html which contains references to hashed JS/CSS files
  if (req.path === '/' || req.path === '/index.html' || !req.path.includes('.')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
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

// Daily changelog at 11 PM
cron.schedule('0 23 * * *', async () => {
  try {
    const omDaily = require('./routes/om-daily');
    await omDaily.generateAndEmailChangelog();
  } catch (err) {
    console.error('[Changelog] Cron error:', err);
  }
});
console.log('Daily changelog cron scheduled (11 PM)');

// GitHub issue sync at 11:15 PM
cron.schedule('15 23 * * *', async () => {
  try {
    const omDaily = require('./routes/om-daily');
    await omDaily.fullSync();
  } catch (err) {
    console.error('[GitHub Sync] Cron error:', err);
  }
});
console.log('GitHub issue sync cron scheduled (11:15 PM)');

// --- WEBSOCKET INTEGRATION -----------------------------------------
const websocketService = require('./services/websocketService');

// Initialize JIT WebSocket
if (jitTerminalRouter.setupJITWebSocket) {
  const jitWebSocket = jitTerminalRouter.setupJITWebSocket(server);
  console.log('🔌 JIT Terminal WebSocket initialized');
}

// Initialize OMAI Logger WebSocket
const WS = require('ws');
const omaiLoggerWss = new WS.Server({
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

// --- BROADCAST NEW BUILD (triggers UpdateAvailableBanner on all connected clients) -----------
app.post('/api/admin/broadcast-new-build', requireAuthForRoutes, requireAdminForRoutes, (req, res) => {
  try {
    const buildInfo = req.body || {};
    websocketService.broadcastNewBuild(buildInfo);
    res.json({ ok: true, message: 'New build notification broadcast to all connected clients' });
  } catch (err) {
    console.error('[broadcast-new-build] Error:', err);
    res.status(500).json({ ok: false, message: 'Failed to broadcast' });
  }
});

// --- GLOBAL ERROR HANDLER (MUST be after all routes, before server starts) -------------------
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
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// --- START SERVER ---------------------------------------------------
// Defensive logging: Log process info before attempting to bind
const nodeEnv = process.env.NODE_ENV || 'development';
const processId = process.pid;
const instanceId = process.env.pm_id || process.env.INSTANCE_ID || 'unknown';
const execMode = process.env.pm_exec_mode || 'standalone';

console.log('═══════════════════════════════════════════════════════════');
console.log('🚀 Starting OrthodoxMetrics Backend Server');
console.log('═══════════════════════════════════════════════════════════');
console.log(`📋 Process ID: ${processId}`);
console.log(`🔢 Instance ID: ${instanceId}`);
console.log(`⚙️  Execution Mode: ${execMode}`);
console.log(`🌐 Environment: ${nodeEnv.toUpperCase()}`);
console.log(`🔌 Attempting to bind: ${HOST}:${PORT}`);
console.log('═══════════════════════════════════════════════════════════');

// Error handler for server listen errors (EADDRINUSE, etc.)
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ FATAL ERROR: Port already in use (EADDRINUSE)');
    console.error('═══════════════════════════════════════════════════════════');
    console.error(`Port ${PORT} is already bound by another process.`);
    console.error(`Process ID: ${processId}`);
    console.error(`Instance ID: ${instanceId}`);
    console.error(`Execution Mode: ${execMode}`);
    console.error('');
    console.error('🔍 Troubleshooting Steps:');
    console.error('   1. Check for zombie processes:');
    console.error(`      ss -lntp | grep :${PORT}`);
    console.error(`      lsof -i :${PORT}`);
    console.error('   2. Check PM2 status:');
    console.error('      pm2 status orthodox-backend');
    console.error('      pm2 describe orthodox-backend');
    console.error('   3. If PM2 shows multiple instances, stop all:');
    console.error('      pm2 stop orthodox-backend');
    console.error('      pm2 delete orthodox-backend');
    console.error('   4. Kill any zombie processes manually if needed:');
    console.error(`      kill -9 <PID>  # Replace <PID> with process ID from lsof`);
    console.error('   5. Restart cleanly:');
    console.error('      pm2 start ecosystem.config.cjs --only orthodox-backend');
    console.error('');
    console.error('⚠️  Exiting to prevent crash loop...');
    console.error('═══════════════════════════════════════════════════════════');
    process.exit(1);
  } else {
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ FATAL ERROR: Server failed to start');
    console.error('═══════════════════════════════════════════════════════════');
    console.error(`Error: ${error.message}`);
    console.error(`Code: ${error.code || 'UNKNOWN'}`);
    console.error(`Process ID: ${processId}`);
    console.error(`Stack: ${error.stack}`);
    console.error('═══════════════════════════════════════════════════════════');
    process.exit(1);
  }
});

server.listen(PORT, HOST, () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Server successfully bound to ${HOST}:${PORT}`);
  console.log(`📁 Entrypoint: dist/index.js (compiled from src/index.ts)`);
  console.log(`🔍 Route health check: GET /api/admin/_routes`);
  if (nodeEnv !== 'production') {
    console.log('📋 Development mode: Enhanced logging and verbose output enabled');
  } else {
    console.log('🔧 Production mode: Optimized for performance and reduced logging');
  }
  
  // Log critical route mounts
  console.log('✅ Critical routes mounted:');
  console.log('   - /api/admin/templates');
  console.log('   - /api/admin/churches');
  console.log('   - /api/admin/users');
  
  // Initialize WebSocket service after server starts
  websocketService.initialize(server, sessionMiddleware);
  console.log('🔌 WebSocket service initialized');
  
  // DISABLED: Backend log monitoring causes infinite feedback loop
  // The logMonitor watches PM2 logs, but its own output gets logged by PM2,
  // creating an infinite loop that floods the logs
  // logMonitor.start('orthodox-backend');
  // console.log('🔍 Backend log monitoring started for orthodox-backend');
  console.log('═══════════════════════════════════════════════════════════');
  
  // ============================================================================
  // STARTUP VERIFICATION - Test critical public endpoints
  // ============================================================================
  // Verify that health and maintenance status endpoints are accessible
  // without authentication. This prevents silent regressions from breaking
  // monitoring and uptime checks.
  console.log('🏥 Running startup health check verification...');
  
  const http = require('http');
  
  // Test /api/system/health
  const healthCheckOptions = {
    hostname: HOST === '0.0.0.0' ? 'localhost' : HOST,
    port: PORT,
    path: '/api/system/health',
    method: 'GET',
    timeout: 5000
  };
  
  const healthReq = http.request(healthCheckOptions, (healthRes) => {
    let data = '';
    healthRes.on('data', (chunk) => { data += chunk; });
    healthRes.on('end', () => {
      if (healthRes.statusCode === 200) {
        console.log('✅ Health endpoint verification PASSED: /api/system/health returns 200');
        try {
          const json = JSON.parse(data);
          console.log(`   Status: ${json.status}, Uptime: ${json.uptime}s`);
        } catch (e) {
          console.log('   Response received successfully');
        }
      } else {
        console.error('❌ CRITICAL: Health endpoint verification FAILED!');
        console.error(`   /api/system/health returned ${healthRes.statusCode} instead of 200`);
        console.error('   This endpoint MUST be public for monitoring systems!');
        console.error('   Check: server/src/api/systemStatus.js and auth middleware allowlist');
      }
    });
  });
  
  healthReq.on('error', (err) => {
    console.error('❌ Health endpoint verification ERROR:', err.message);
  });
  
  healthReq.on('timeout', () => {
    console.error('❌ Health endpoint verification TIMEOUT');
    healthReq.destroy();
  });
  
  healthReq.end();
  
  // Test /api/maintenance/status
  const maintenanceCheckOptions = {
    hostname: HOST === '0.0.0.0' ? 'localhost' : HOST,
    port: PORT,
    path: '/api/maintenance/status',
    method: 'GET',
    timeout: 5000
  };
  
  const maintenanceReq = http.request(maintenanceCheckOptions, (maintenanceRes) => {
    let data = '';
    maintenanceRes.on('data', (chunk) => { data += chunk; });
    maintenanceRes.on('end', () => {
      if (maintenanceRes.statusCode === 200) {
        console.log('✅ Maintenance endpoint verification PASSED: /api/maintenance/status returns 200');
        try {
          const json = JSON.parse(data);
          console.log(`   Status: ${json.status}, Maintenance: ${json.maintenance}`);
        } catch (e) {
          console.log('   Response received successfully');
        }
      } else {
        console.error('❌ CRITICAL: Maintenance endpoint verification FAILED!');
        console.error(`   /api/maintenance/status returned ${maintenanceRes.statusCode} instead of 200`);
        console.error('   This endpoint MUST be public for frontend polling!');
        console.error('   Check: server/src/api/maintenance-public.js and auth middleware allowlist');
      }
    });
  });
  
  maintenanceReq.on('error', (err) => {
    console.error('❌ Maintenance endpoint verification ERROR:', err.message);
  });
  
  maintenanceReq.on('timeout', () => {
    console.error('❌ Maintenance endpoint verification TIMEOUT');
    maintenanceReq.destroy();
  });
  
  maintenanceReq.end();
  
  console.log('═══════════════════════════════════════════════════════════');
  // ============================================================================
});

app.get('/api/auth/check', (req,res)=>{
  const u = req.session && req.session.user;
  if (u) return res.json({ authenticated: true, user: u });
  res.status(401).json({ authenticated: false, message: 'Not authenticated' });
});

// Removed duplicate /api/user/profile route - already handled by userProfileRouter
