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

// OCR Routes - Legacy /api/ocr routes (DISABLED by default)
// ⚠️  DEPRECATED: Legacy /api/ocr/* routes are disabled in favor of church-scoped routes
// Set ENABLE_LEGACY_OCR_ROUTES=true to enable (not recommended)
const ENABLE_LEGACY_OCR_ROUTES = process.env.ENABLE_LEGACY_OCR_ROUTES === 'true';
if (ENABLE_LEGACY_OCR_ROUTES) {
  const ocrRouter = require('./routes/ocr');
  console.log('⚠️  [OCR] Registering legacy /api/ocr routes (deprecated)');
  app.use('/api/ocr', ocrRouter);
  console.log('⚠️  [OCR] Legacy /api/ocr routes registered');
} else {
  console.log('🚫 [OCR] Legacy /api/ocr routes disabled (use /api/church/:churchId/ocr/* instead)');
}

// OCR Admin Monitor + Layout Templates + Table Extractor
try {
  const ocrAdminMonitorRouter = require('./routes/ocr/adminMonitor');
  app.use('/api', ocrAdminMonitorRouter);
  console.log('✅ [OCR] Admin monitor + layout templates + table extractor routes mounted');
} catch (e: any) {
  console.warn('⚠️  [OCR] Failed to load admin monitor routes:', e.message);
}

// OCR Feeder Worker — polls platform DB for pending jobs
try {
  const { workerLoop } = require('./workers/ocrFeederWorker');
  workerLoop().catch((err: any) => console.error('[OCR Worker] Fatal error:', err));
  console.log('✅ [OCR] Feeder worker started');
} catch (e: any) {
  console.warn('⚠️  [OCR] Failed to start feeder worker:', e.message);
}

// Church-specific OCR routes - hardwired (DB source of truth)
console.log('✅ [OCR] Church OCR routes: hardwired (DB source of truth)');

// Church-specific OCR settings routes (keep for backward compatibility)
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
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    const defaultSettings = {
      engine: 'google-vision',
      language: 'eng',
      defaultLanguage: 'en',
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
          confidence_threshold, default_language, preprocessing_enabled, auto_rotate, noise_reduction,
          settings_json
        FROM ocr_settings 
        WHERE church_id = ?
        ORDER BY updated_at DESC
        LIMIT 1
      `, [churchId]);

      if (settingsRows.length > 0) {
        const s = settingsRows[0];
        const loadedSettings: any = {
          engine: s.engine || defaultSettings.engine,
          language: s.language || defaultSettings.language,
          defaultLanguage: s.default_language || 'en',
          dpi: s.dpi || defaultSettings.dpi,
          deskew: s.deskew !== undefined ? Boolean(s.deskew) : (s.auto_rotate !== undefined ? Boolean(s.auto_rotate) : defaultSettings.deskew),
          removeNoise: s.remove_noise !== undefined ? Boolean(s.remove_noise) : (s.noise_reduction !== undefined ? Boolean(s.noise_reduction) : defaultSettings.removeNoise),
          preprocessImages: s.preprocess_images !== undefined ? Boolean(s.preprocess_images) : (s.preprocessing_enabled !== undefined ? Boolean(s.preprocessing_enabled) : defaultSettings.preprocessImages),
          outputFormat: s.output_format || defaultSettings.outputFormat,
          confidenceThreshold: s.confidence_threshold !== null && s.confidence_threshold !== undefined ? Math.round(Number(s.confidence_threshold) * 100) : defaultSettings.confidenceThreshold
        };
        
        // Load document processing and deletion settings from JSON column
        if (s.settings_json) {
          try {
            const jsonSettings = typeof s.settings_json === 'string' 
              ? JSON.parse(s.settings_json) 
              : s.settings_json;
            if (jsonSettings.documentProcessing) {
              loadedSettings.documentProcessing = jsonSettings.documentProcessing;
            }
            if (jsonSettings.documentDeletion) {
              loadedSettings.documentDeletion = jsonSettings.documentDeletion;
            }
          } catch (e) {
            console.warn('[OCR Settings] Failed to parse settings_json:', e);
          }
        }
        
        // Add defaults if not present
        if (!loadedSettings.documentProcessing) {
          loadedSettings.documentProcessing = {
            spellingCorrection: 'fix',
            extractAllText: 'yes',
            improveFormatting: 'yes',
          };
        }
        if (!loadedSettings.documentDeletion) {
          loadedSettings.documentDeletion = {
            deleteAfter: 7,
            deleteUnit: 'days',
          };
        }
        
        console.log(`[OCR Settings] Loaded settings for church ${churchId}:`, loadedSettings);
        return res.json(loadedSettings);
      } else {
        console.log(`[OCR Settings] No saved settings found for church ${churchId}, using defaults`);
      }
    } catch (dbError) {
      console.warn('OCR settings table may not exist, using defaults:', dbError.message);
    }

    console.log(`[OCR Settings] Returning default settings for church ${churchId}`);
    const defaultResponse = {
      ...defaultSettings,
      documentProcessing: {
        spellingCorrection: 'fix',
        extractAllText: 'yes',
        improveFormatting: 'yes',
      },
      documentDeletion: {
        deleteAfter: 7,
        deleteUnit: 'days',
      },
    };
    res.json(defaultResponse);
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

    // Allow saving document processing/deletion settings without requiring engine/language
    // (for settings page that only updates those fields)
    if (settings.documentProcessing || settings.documentDeletion) {
      // Allow partial updates for document processing/deletion - skip engine/language validation
    } else if (!settings.engine || !settings.language) {
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
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Ensure table exists with canonical schema (after migration, columns should exist)
    try {
      // Table should exist after migration - if not, create it
      await db.query(`
        CREATE TABLE IF NOT EXISTS ocr_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          church_id INT NOT NULL,
          engine VARCHAR(50) DEFAULT 'google-vision',
          language VARCHAR(10) DEFAULT 'eng',
          default_language CHAR(2) DEFAULT 'en',
          dpi INT DEFAULT 300,
          deskew TINYINT(1) DEFAULT 1,
          remove_noise TINYINT(1) DEFAULT 1,
          preprocess_images TINYINT(1) DEFAULT 1,
          output_format VARCHAR(20) DEFAULT 'json',
          confidence_threshold DECIMAL(5,2) DEFAULT 0.75,
          preprocessing_enabled TINYINT(1) DEFAULT 1,
          auto_contrast TINYINT(1) DEFAULT 1,
          auto_rotate TINYINT(1) DEFAULT 1,
          noise_reduction TINYINT(1) DEFAULT 1,
          settings_json JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_church_settings (church_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (createError) {
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS ocr_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            church_id INT NOT NULL,
            engine VARCHAR(50) DEFAULT 'google-vision',
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

    // Normalize confidenceThreshold: API sends percent (0-100), DB stores fraction (0-1)
    const confidenceThresholdFraction = settings.confidenceThreshold !== null && settings.confidenceThreshold !== undefined
      ? Number(settings.confidenceThreshold) / 100
      : 0.75;
    
    // Normalize defaultLanguage: accept defaultLanguage from API, fallback to language or 'en'
    // Convert 3-char language codes to 2-char for default_language (CHAR(2) column)
    const languageToDefaultLanguage = (lang: string): string => {
      const mapping: Record<string, string> = {
        'eng': 'en',
        'ell': 'el',
        'grc': 'gr',
        'rus': 'ru',
        'ron': 'ro',
        'srp': 'sr',
        'bul': 'bg',
        'ukr': 'uk'
      };
      return mapping[lang] || lang.substring(0, 2) || 'en';
    };
    
    const defaultLanguage = settings.defaultLanguage 
      ? languageToDefaultLanguage(settings.defaultLanguage)
      : (settings.language ? languageToDefaultLanguage(settings.language) : 'en');
    
    // Only update language if explicitly provided
    const languageValue = settings.language !== undefined ? settings.language : null;

    await db.query(`
      INSERT INTO ocr_settings (
        church_id, engine, language, dpi, deskew, remove_noise, 
        preprocess_images, output_format, confidence_threshold,
        default_language, preprocessing_enabled, auto_contrast, auto_rotate, noise_reduction,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        engine = COALESCE(VALUES(engine), engine),
        language = COALESCE(IFNULL(VALUES(language), language), language),
        dpi = COALESCE(VALUES(dpi), dpi),
        deskew = COALESCE(VALUES(deskew), deskew),
        remove_noise = COALESCE(VALUES(remove_noise), remove_noise),
        preprocess_images = COALESCE(VALUES(preprocess_images), preprocess_images),
        output_format = COALESCE(VALUES(output_format), output_format),
        confidence_threshold = COALESCE(VALUES(confidence_threshold), confidence_threshold),
        default_language = COALESCE(VALUES(default_language), default_language),
        preprocessing_enabled = COALESCE(VALUES(preprocess_images), preprocessing_enabled),
        auto_rotate = COALESCE(VALUES(deskew), auto_rotate),
        noise_reduction = COALESCE(VALUES(remove_noise), noise_reduction),
        updated_at = NOW()
    `, [
      churchId,
      settings.engine || 'google-vision',
      languageValue || 'eng', // Use provided language or default
      settings.dpi || 300,
      settings.deskew !== undefined ? (settings.deskew ? 1 : 0) : 1,
      settings.removeNoise !== undefined ? (settings.removeNoise ? 1 : 0) : 1,
      settings.preprocessImages !== undefined ? (settings.preprocessImages ? 1 : 0) : 1,
      settings.outputFormat || 'json',
      confidenceThresholdFraction, // Store as fraction (0-1)
      defaultLanguage, // Store defaultLanguage
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
    
    // Store new document processing and deletion settings in settings JSON column if it exists
    // or in a separate JSON field
    if (settings.documentProcessing || settings.documentDeletion) {
      try {
        const settingsJson = JSON.stringify({
          documentProcessing: settings.documentProcessing,
          documentDeletion: settings.documentDeletion,
        });
        
        // Update settings_json column (should exist after migration)
        try {
          await db.query(`
            UPDATE ocr_settings 
            SET settings_json = ?
            WHERE church_id = ?
          `, [settingsJson, churchId]);
        } catch (jsonError: any) {
          // If column doesn't exist (pre-migration), add it
          if (jsonError.code === 'ER_BAD_FIELD_ERROR') {
            await db.query(`ALTER TABLE ocr_settings ADD COLUMN settings_json JSON NULL`);
            await db.query(`
              UPDATE ocr_settings 
              SET settings_json = ?
              WHERE church_id = ?
            `, [settingsJson, churchId]);
          } else {
            throw jsonError;
          }
        }
      } catch (jsonError) {
        console.warn('[OCR Settings] Failed to save document processing/deletion settings:', jsonError);
        // Don't fail the whole request if JSON storage fails
      }
    }
    
    res.json({ success: true, message: 'OCR settings saved successfully', settings: settings });
  } catch (error) {
    console.error('Error saving church OCR settings:', error);
    res.status(500).json({ error: 'Failed to save OCR settings', message: error.message });
  }
});

// =============================================================================
// OCR Setup Wizard Endpoints
// =============================================================================

// GET /api/church/:churchId/ocr/setup-state - Get setup wizard state
app.get('/api/church/:churchId/ocr/setup-state', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    console.log(`[OCR Setup] GET /api/church/${churchId}/ocr/setup-state`);
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
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS ocr_setup_state (
        church_id INT NOT NULL PRIMARY KEY,
        state_json LONGTEXT NULL,
        percent_complete INT NOT NULL DEFAULT 0,
        is_complete TINYINT(1) NOT NULL DEFAULT 0,
        flow_type ENUM('blank_slate', 'existing_records') NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_is_complete (is_complete),
        INDEX idx_updated_at (updated_at),
        INDEX idx_flow_type (flow_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add flow_type column if it doesn't exist (for existing tables)
    try {
      await db.query(`
        ALTER TABLE ocr_setup_state 
        ADD COLUMN flow_type ENUM('blank_slate', 'existing_records') NULL AFTER is_complete,
        ADD INDEX idx_flow_type (flow_type)
      `);
    } catch (e: any) {
      // Column might already exist, that's fine
      if (!e.message?.includes('Duplicate column name')) {
        console.warn('[OCR Setup] Could not add flow_type column:', e.message);
      }
    }

    const [rows] = await db.query(
      'SELECT state_json, percent_complete, is_complete, flow_type, updated_at FROM ocr_setup_state WHERE church_id = ?',
      [churchId]
    );

    if (rows.length > 0) {
      const row = rows[0];
      const stateJson = row.state_json ? (typeof row.state_json === 'string' ? JSON.parse(row.state_json) : row.state_json) : {};
      res.json({
        churchId,
        state: stateJson,
        percentComplete: row.percent_complete || 0,
        isComplete: Boolean(row.is_complete),
        flowType: row.flow_type || null,
        updatedAt: row.updated_at
      });
    } else {
      // Return default empty state
      res.json({
        churchId,
        state: {},
        percentComplete: 0,
        isComplete: false,
        flowType: null,
        updatedAt: null
      });
    }
  } catch (error) {
    console.error('Error fetching OCR setup state:', error);
    res.status(500).json({ error: 'Failed to fetch setup state', message: error.message });
  }
});

// PUT /api/church/:churchId/ocr/setup-state - Save setup wizard state
app.put('/api/church/:churchId/ocr/setup-state', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const { state, percentComplete, isComplete } = req.body;
    
    console.log(`[OCR Setup] PUT /api/church/${churchId}/ocr/setup-state - percentComplete: ${percentComplete}, isComplete: ${isComplete}`);
    
    if (!churchId) {
      return res.status(400).json({ error: 'Invalid church ID' });
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
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS ocr_setup_state (
        church_id INT NOT NULL PRIMARY KEY,
        state_json LONGTEXT NULL,
        percent_complete INT NOT NULL DEFAULT 0,
        is_complete TINYINT(1) NOT NULL DEFAULT 0,
        flow_type ENUM('blank_slate', 'existing_records') NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_is_complete (is_complete),
        INDEX idx_updated_at (updated_at),
        INDEX idx_flow_type (flow_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add flow_type column if it doesn't exist (for existing tables)
    try {
      await db.query(`
        ALTER TABLE ocr_setup_state 
        ADD COLUMN flow_type ENUM('blank_slate', 'existing_records') NULL AFTER is_complete,
        ADD INDEX idx_flow_type (flow_type)
      `);
    } catch (e: any) {
      // Column might already exist, that's fine
      if (!e.message?.includes('Duplicate column name')) {
        console.warn('[OCR Setup] Could not add flow_type column:', e.message);
      }
    }

    const stateJson = JSON.stringify(state || {});
    const percent = Math.max(0, Math.min(100, percentComplete || 0));
    const complete = isComplete ? 1 : 0;
    const flowType = req.body.flowType || null; // Get flow_type from request body

    await db.query(`
      INSERT INTO ocr_setup_state (church_id, state_json, percent_complete, is_complete, flow_type)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        state_json = VALUES(state_json),
        percent_complete = VALUES(percent_complete),
        is_complete = VALUES(is_complete),
        flow_type = COALESCE(VALUES(flow_type), flow_type),
        updated_at = CURRENT_TIMESTAMP
    `, [churchId, stateJson, percent, complete, flowType]);

    res.json({ success: true, message: 'Setup state saved successfully' });
  } catch (error) {
    console.error('Error saving OCR setup state:', error);
    res.status(500).json({ error: 'Failed to save setup state', message: error.message });
  }
});

// POST /api/church/:churchId/ocr/setup-validate - Validate readiness checks
app.post('/api/church/:churchId/ocr/setup-validate', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    console.log(`[OCR Setup] POST /api/church/${churchId}/ocr/setup-validate`);
    const { promisePool } = require('./config/db');
    
    // Validate church exists
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    const fs = require('fs').promises;
    const path = require('path');
    const checklist: any = {
      churchContext: { passed: true, message: 'Church context verified' },
      ocrSettings: { passed: false, message: 'OCR settings not configured' },
      storageReady: { passed: false, message: 'Storage paths not verified' },
      visionReady: { passed: false, message: 'Vision credentials not configured' },
      mappingReady: { passed: false, message: 'Mapping templates not configured' }
    };

    // Check OCR settings
    try {
      const [settingsRows] = await db.query('SELECT * FROM ocr_settings WHERE church_id = ? LIMIT 1', [churchId]);
      if (settingsRows.length > 0) {
        checklist.ocrSettings = { passed: true, message: 'OCR settings configured' };
      }
    } catch (e) {
      console.warn('[OCR Setup] OCR settings check failed:', e.message);
    }

    // Check storage paths (check if upload directory exists)
    try {
      const uploadPath = path.join('/var/www/orthodoxmetrics/data/church', String(churchId), 'ocr_uploads');
      try {
        await fs.access(uploadPath);
        checklist.storageReady = { passed: true, message: 'Storage directory exists' };
      } catch (e) {
        // Try to create it
        try {
          await fs.mkdir(uploadPath, { recursive: true });
          // Test write
          const testFile = path.join(uploadPath, '.write-test');
          await fs.writeFile(testFile, 'test');
          await fs.unlink(testFile);
          checklist.storageReady = { passed: true, message: 'Storage directory created and writable' };
        } catch (createError) {
          checklist.storageReady = { passed: false, message: `Storage directory not writable: ${createError.message}` };
        }
      }
    } catch (e) {
      checklist.storageReady = { passed: false, message: `Storage check failed: ${e.message}` };
    }

    // Check Vision credentials (just check if GOOGLE_APPLICATION_CREDENTIALS env var is set or if credentials exist in config)
    try {
      const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                             process.env.GOOGLE_VISION_API_KEY ||
                             (serverConfig && serverConfig.ocr && serverConfig.ocr.googleVisionKey);
      checklist.visionReady = {
        passed: !!hasCredentials,
        message: hasCredentials ? 'Vision credentials configured' : 'Vision credentials not found'
      };
    } catch (e) {
      checklist.visionReady = { passed: false, message: `Vision check failed: ${e.message}` };
    }

    // Check mapping templates
    try {
      const [mappingRows] = await db.query(
        'SELECT id FROM ocr_job_mappings WHERE church_id = ? LIMIT 1',
        [churchId]
      );
      if (mappingRows.length > 0) {
        checklist.mappingReady = { passed: true, message: 'Mapping templates exist' };
      } else {
        // Check if we can create default mappings
        checklist.mappingReady = { passed: false, message: 'No mapping templates found (can be created in wizard)' };
      }
    } catch (e) {
      // Table might not exist, that's okay
      checklist.mappingReady = { passed: false, message: 'Mapping table not initialized (will be created in wizard)' };
    }

    const allPassed = Object.values(checklist).every((item: any) => item.passed);
    res.json({
      checklist,
      allPassed,
      percentComplete: Math.round((Object.values(checklist).filter((item: any) => item.passed).length / Object.keys(checklist).length) * 100)
    });
  } catch (error) {
    console.error('Error validating OCR setup:', error);
    res.status(500).json({ error: 'Failed to validate setup', message: error.message });
  }
});

// GET /api/church/:churchId/ocr/setup-inventory - Check church data inventory for branching
app.get('/api/church/:churchId/ocr/setup-inventory', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    console.log(`[OCR Setup] GET /api/church/${churchId}/ocr/setup-inventory`);
    const { promisePool } = require('./config/db');
    
    // Validate church exists
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Helper function to check if table exists and get row count
    async function checkTable(tableName: string): Promise<{ table_exists: boolean; row_count: number }> {
      try {
        // Whitelist of allowed table names for safety
        const allowedTables = ['baptism', 'marriage', 'funeral', 'ocr_jobs', 'ocr_fused_drafts', 'ocr_mappings', 'ocr_settings'];
        if (!allowedTables.includes(tableName)) {
          return { table_exists: false, row_count: 0 };
        }

        // Check if table exists using information_schema
        const [tableRows] = await db.query(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE() 
          AND table_name = ?
        `, [tableName]);
        
        const tableExists = (tableRows as any[])[0]?.count > 0;
        
        if (!tableExists) {
          return { table_exists: false, row_count: 0 };
        }
        
        // Get row count (only if table exists) - use string interpolation with whitelist
        const [countRows] = await db.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
        const rowCount = (countRows as any[])[0]?.count || 0;
        
        return { table_exists: true, row_count: rowCount };
      } catch (error: any) {
        // If query fails, assume table doesn't exist
        console.warn(`[Setup Inventory] Error checking table ${tableName}:`, error.message);
        return { table_exists: false, row_count: 0 };
      }
    }

    // Check record tables
    const baptism = await checkTable('baptism');
    const marriage = await checkTable('marriage');
    const funeral = await checkTable('funeral');

    // Check OCR tables
    const ocrJobs = await checkTable('ocr_jobs');
    const ocrFusedDrafts = await checkTable('ocr_fused_drafts');
    const ocrMappings = await checkTable('ocr_mappings');
    const ocrSettings = await checkTable('ocr_settings');

    // Determine classification
    const recordsExist = baptism.table_exists || marriage.table_exists || funeral.table_exists;
    const recordsHaveData = (baptism.row_count > 0) || (marriage.row_count > 0) || (funeral.row_count > 0);
    const ocrTablesExist = ocrJobs.table_exists || ocrFusedDrafts.table_exists || ocrMappings.table_exists || ocrSettings.table_exists;
    const ocrHasData = (ocrJobs.row_count > 0) || (ocrFusedDrafts.row_count > 0) || (ocrMappings.row_count > 0);

    // Classification logic
    let classification: 'existing_records' | 'blank_slate' = 'blank_slate';
    const reasons: string[] = [];

    if (recordsHaveData) {
      classification = 'existing_records';
      reasons.push(`Found existing record data: ${baptism.row_count} baptisms, ${marriage.row_count} marriages, ${funeral.row_count} funerals`);
    } else if (recordsExist && !recordsHaveData) {
      classification = 'blank_slate';
      reasons.push('Record tables exist but are empty');
    } else {
      classification = 'blank_slate';
      reasons.push('No record tables found');
    }

    if (ocrTablesExist) {
      reasons.push(`OCR infrastructure exists: ${ocrJobs.row_count} jobs, ${ocrMappings.row_count} mappings`);
    } else {
      reasons.push('No OCR infrastructure found');
    }

    res.json({
      church_id: churchId,
      records: {
        baptism,
        marriage,
        funeral
      },
      ocr: {
        ocr_jobs: ocrJobs,
        ocr_fused_drafts: ocrFusedDrafts,
        ocr_mappings: ocrMappings,
        ocr_settings: ocrSettings
      },
      classification,
      reasons
    });
  } catch (error: any) {
    console.error('Error fetching setup inventory:', error);
    res.status(500).json({ error: 'Failed to fetch setup inventory', message: error.message });
  }
});

// =============================================================================
// Church-specific OCR Jobs Endpoints - Hardwired Directly (Bypass Router Loader)
// =============================================================================
// These 5 endpoints are defined directly on app to ensure they work immediately
// Place them right after settings routes and before catch-all 404 handler
// This is the AUTHORITATIVE implementation - no router loader, no legacy routes
console.log('✅ [OCR Jobs Routes] Registering hardwired OCR jobs endpoints (authoritative)...');

// Debug middleware to log all OCR requests (can be removed in production if too verbose)
if (process.env.OCR_DEBUG === 'true') {
  app.use('/api/church/:churchId/ocr', (req, res, next) => {
    console.log(`[OCR Debug] ${req.method} ${req.originalUrl} - Path: ${req.path}, Route: ${req.route?.path || 'no route'}`);
    next();
  });
}

// GET /api/church/:churchId/ocr/jobs - List OCR jobs
app.get('/api/church/:churchId/ocr/jobs', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    console.log(`[OCR Jobs] GET /api/church/${churchId}/ocr/jobs - ROUTE HIT`);
    const { promisePool } = require('./config/db');
    
    // Validate church exists
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found', jobs: [] });
    }

    const dbName = churchRows[0].database_name;

    // Get church database connection
    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(dbName);

    // Query canonical columns only (after migration, no dynamic detection needed)
    let jobs: any[] = [];
    let jobsSource = 'church_db';
    try {
      const [jobRows] = await db.query(`
        SELECT 
          id, filename, original_filename, file_path, status, 
          record_type, language, confidence_score, file_size, mime_type, pages,
          ocr_text, ocr_result_json, error, processing_time_ms,
          created_at, updated_at, church_id
        FROM ocr_jobs 
        WHERE church_id = ?
        ORDER BY created_at DESC
        LIMIT 100
      `, [churchId]);
      jobs = jobRows;
      console.log(`[OCR Jobs GET] Found ${jobs.length} jobs in church database ${dbName}`);
    } catch (dbError: any) {
      // Log error but don't throw 500 for missing table (migration may not have run yet)
      if (dbError.code === 'ER_NO_SUCH_TABLE' || dbError.code === 'ER_BAD_FIELD_ERROR') {
        console.warn(`[OCR Jobs] Church DB ${dbName} issue: ${dbError.message}. Run migration normalize_ocr_schema.sql first.`);
        jobs = [];
      } else {
        throw dbError;
      }
    }

    console.log(`[OCR Jobs GET] Returning ${jobs.length} jobs from ${jobsSource} for church ${churchId}`);
    
    // DB is source of truth - no bundle merge
    // Optionally check for bundle existence as metadata only (non-blocking)
    let bundleCheckMap = new Map<number, boolean>();
    try {
      let jobBundleModule;
      try {
        jobBundleModule = require('./utils/jobBundle');
      } catch (e) {
        try {
          jobBundleModule = require('../dist/utils/jobBundle');
        } catch (e2) {
          jobBundleModule = null;
        }
      }
      
      if (jobBundleModule && jobBundleModule.tryReadManifest) {
        const { tryReadManifest } = jobBundleModule;
        const bundleChecks = await Promise.all(
          jobs.map(async (job: any) => {
            try {
              const manifest = await tryReadManifest(churchId, String(job.id));
              return { id: job.id, hasBundle: manifest !== null };
            } catch {
              return { id: job.id, hasBundle: false };
            }
          })
        );
        bundleChecks.forEach(b => bundleCheckMap.set(b.id, b.hasBundle));
      }
    } catch (bundleError: any) {
      // Non-blocking - bundle check failure doesn't affect response
      console.log(`[OCR Jobs GET] Bundle check skipped (non-blocking):`, bundleError.message);
    }
    
    // Map to API response format - DB is source of truth
    const mappedJobs = jobs.map((job: any) => {
      // DB status is canonical
      const jobStatus = job.status || 'pending';
      const isCompleted = jobStatus === 'completed' || jobStatus === 'complete';
      const hasOcrText = !!job.ocr_text;
      
      // Generate preview from ocr_text in DB
      let ocrTextPreview = null;
      if (job.ocr_text) {
        const lines = job.ocr_text.split('\n').slice(0, 8);
        ocrTextPreview = lines.join('\n').substring(0, 400);
        if (ocrTextPreview.length < job.ocr_text.length) {
          ocrTextPreview += '...';
        }
      } else if (isCompleted) {
        ocrTextPreview = '[OCR text available - click to view]';
      }
      
      return {
        id: job.id?.toString() || '',
        church_id: job.church_id?.toString() || churchId.toString(),
        original_filename: job.original_filename || job.filename || '',
        filename: job.filename || '',
        status: jobStatus, // DB is source of truth
        confidence_score: job.confidence_score || 0,
        error_message: job.error || null,
        created_at: job.created_at || new Date().toISOString(),
        updated_at: job.updated_at || new Date().toISOString(), // DB is source of truth
        record_type: job.record_type || 'baptism', // DB is source of truth
        language: job.language || 'en',
        ocr_text_preview: ocrTextPreview,
        has_ocr_text: hasOcrText,
        // Optional metadata: bundle existence (non-canonical)
        has_bundle: bundleCheckMap.get(job.id) || false,
      };
    });

    res.json({ jobs: mappedJobs });
  } catch (error: any) {
    console.error('[OCR Jobs] Error fetching church OCR jobs:', error);
    res.status(500).json({ error: 'Failed to fetch OCR jobs', message: error.message, jobs: [] });
  }
});

// =============================================================================
// OCR Job Upload Endpoint - Handles file uploads and creates OCR jobs
// =============================================================================
// Simulation OCR endpoint for enhanced uploader
app.post('/api/church/:churchId/ocr/enhanced/process', upload.array('files', 10), async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const ocrMode = req.query.ocr_mode || req.body.ocr_mode;
    
    if (churchId !== 46 || ocrMode !== 'simulate') {
      return res.status(400).json({ error: 'Simulation mode only available for church 46', jobs: [] });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded', jobs: [] });
    }

    // Import simulation manifest
    const { CHURCH_46_DEMO_FILES } = require('./ocr/sim/manifests/church_46_demo_manifest');
    const recordType = (req.body.recordType || 'baptism') as 'baptism' | 'marriage' | 'funeral';

    const { promisePool } = require('./config/db');
    const dbSwitcherModule = require('./utils/dbSwitcher');
    const { getChurchDbConnection } = dbSwitcherModule;
    
    // Validate church exists
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found', jobs: [] });
    }

    const dbName = churchRows[0].database_name;
    const db = await getChurchDbConnection(dbName);

    // Ensure ocr_jobs table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS ocr_jobs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size BIGINT,
        mime_type VARCHAR(100),
        status ENUM('queued', 'processing', 'completed', 'failed') DEFAULT 'queued',
        record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL DEFAULT 'baptism',
        language VARCHAR(10) DEFAULT 'en',
        confidence_score DECIMAL(5,2),
        pages INT,
        ocr_text LONGTEXT,
        ocr_result LONGTEXT,
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_church (church_id),
        INDEX idx_status (status),
        INDEX idx_record_type (record_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const createdJobs: any[] = [];
    const uploadDir = path.join(__dirname, '..', 'uploads', 'ocr', `church_${churchId}`);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    for (const file of files) {
      try {
        const originalName = file.originalname;
        const simData = CHURCH_46_DEMO_FILES[originalName];

        if (!simData) {
          // File not in manifest - return error or empty result
          console.log(`[Simulation] No simulation data for file: ${originalName}`);
          continue;
        }

        // Generate unique filename
        const timestamp = Date.now();
        const ext = path.extname(originalName);
        const baseName = path.basename(originalName, ext);
        const uniqueFilename = `${baseName}_${timestamp}${ext}`;
        const finalPath = path.join(uploadDir, uniqueFilename);

        // Move file
        fs.renameSync(file.path, finalPath);
        const stats = fs.statSync(finalPath);

        // Insert job with simulation data
        const [result] = await db.query(`
          INSERT INTO ocr_jobs (
            church_id, filename, original_filename, file_path, file_size, mime_type,
            status, record_type, language, confidence_score, ocr_text, ocr_result,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          churchId,
          uniqueFilename,
          originalName,
          finalPath,
          stats.size,
          file.mimetype || 'image/jpeg',
          simData.record_type,
          'en',
          simData.confidence,
          simData.ocrText || '',
          JSON.stringify({
            record_type: simData.record_type,
            church: simData.church,
            city: simData.city,
            state: simData.state,
            records: simData.records,
            confidence: simData.confidence,
            source: simData.source
          })
        ]);

        const jobId = (result as any).insertId;
        const jobData = {
          id: jobId,
          filename: uniqueFilename,
          original_filename: originalName,
          status: 'completed',
          record_type: simData.record_type,
          source: 'simulation',
          data: {
            record_type: simData.record_type,
            church: simData.church,
            city: simData.city,
            state: simData.state,
            records: simData.records,
            confidence: simData.confidence,
            source: simData.source
          }
        };
        createdJobs.push(jobData);

        console.log(`[Simulation] Created job ${jobId} for ${originalName} with ${simData.records.length} records`);
      } catch (error: any) {
        console.error(`[Simulation] Error processing file ${file.originalname}:`, error);
      }
    }

    return res.json({
      success: true,
      data: {
        jobs: createdJobs,
        source: 'simulation'
      },
      jobs: createdJobs,
      message: `Processed ${createdJobs.length} file(s) in simulation mode`
    });
  } catch (error: any) {
    console.error('[Simulation OCR] Error:', error);
    return res.status(500).json({ error: error.message || 'Simulation processing failed', jobs: [] });
  }
});

app.post('/api/ocr/jobs/upload', upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded', jobs: [] });
    }

    // Get FormData fields
    const churchId = parseInt(req.body.churchId);
    const recordType = (req.body.recordType || 'baptism') as 'baptism' | 'marriage' | 'funeral';
    const language = req.body.language || 'en';
    const settings = req.body.settings ? JSON.parse(req.body.settings) : {};

    if (!churchId) {
      return res.status(400).json({ error: 'churchId is required', jobs: [] });
    }

    console.log(`[OCR Upload] Processing ${files.length} file(s) for church ${churchId}, recordType: ${recordType}`);

    const { promisePool } = require('./config/db');
    
    // Validate church exists
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found', jobs: [] });
    }

    const dbName = churchRows[0].database_name;

    // Get church database connection
    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(dbName);

    // Ensure ocr_jobs table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS ocr_jobs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size BIGINT,
        mime_type VARCHAR(100),
        status ENUM('queued', 'processing', 'completed', 'failed') DEFAULT 'queued',
        record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL DEFAULT 'baptism',
        language VARCHAR(10) DEFAULT 'en',
        confidence_score DECIMAL(5,2),
        pages INT,
        ocr_text LONGTEXT,
        ocr_result LONGTEXT,
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_church (church_id),
        INDEX idx_status (status),
        INDEX idx_record_type (record_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const createdJobs: any[] = [];
    const uploadDir = path.join(__dirname, '..', 'uploads', 'ocr', `church_${churchId}`);

    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    for (const file of files) {
      try {
        // Generate unique filename
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext);
        const uniqueFilename = `${baseName}_${timestamp}${ext}`;
        const finalPath = path.join(uploadDir, uniqueFilename);

        // Move file from temp to final location
        fs.renameSync(file.path, finalPath);

        // Get file stats
        const stats = fs.statSync(finalPath);
        const fileSize = stats.size;
        const mimeType = file.mimetype || 'image/jpeg';

        // Insert job into database
        const [result] = await db.query(`
          INSERT INTO ocr_jobs (
            church_id, filename, original_filename, file_path, file_size, mime_type,
            status, record_type, language, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?, NOW(), NOW())
        `, [
          churchId,
          uniqueFilename,
          file.originalname,
          `/uploads/ocr/church_${churchId}/${uniqueFilename}`,
          fileSize,
          mimeType,
          recordType, // Store the recordType from FormData
          language
        ]);

        const jobId = result.insertId;

        // Also insert into platform DB so the feeder worker picks it up
        try {
          await promisePool.query(
            `INSERT INTO ocr_jobs (church_id, filename, status, record_type, language, created_at, source_pipeline)
             VALUES (?, ?, 'pending', ?, ?, NOW(), 'studio')`,
            [churchId, uniqueFilename, recordType, language]
          );
          console.log(`[OCR Upload] Also inserted into platform DB for worker pickup`);
        } catch (platformErr: any) {
          console.warn(`[OCR Upload] Platform DB insert failed (non-blocking): ${platformErr.message}`);
        }

        // Copy file to worker's expected upload location
        try {
          const workerUploadDir = `/var/www/orthodoxmetrics/prod/uploads/om_church_${churchId}/uploaded`;
          if (!fs.existsSync(workerUploadDir)) fs.mkdirSync(workerUploadDir, { recursive: true });
          fs.copyFileSync(finalPath, path.join(workerUploadDir, uniqueFilename));
          console.log(`[OCR Upload] Copied file to worker upload dir`);
        } catch (copyErr: any) {
          console.warn(`[OCR Upload] File copy to worker dir failed (non-blocking): ${copyErr.message}`);
        }

        createdJobs.push({
          id: jobId,
          church_id: churchId,
          filename: uniqueFilename,
          original_filename: file.originalname,
          file_path: `/uploads/ocr/church_${churchId}/${uniqueFilename}`,
          file_size: fileSize,
          mime_type: mimeType,
          status: 'queued',
          record_type: recordType,
          language: language,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        console.log(`[OCR Upload] Created job ${jobId} for file ${file.originalname} with recordType: ${recordType}`);
      } catch (fileError: any) {
        console.error(`[OCR Upload] Error processing file ${file.originalname}:`, fileError);
        // Continue with other files even if one fails
      }
    }

    if (createdJobs.length === 0) {
      return res.status(500).json({ error: 'Failed to create any OCR jobs', jobs: [] });
    }

    res.json({ 
      success: true, 
      jobs: createdJobs,
      message: `Successfully uploaded ${createdJobs.length} file(s)`
    });
  } catch (error: any) {
    console.error('[OCR Upload] Error:', error);
    res.status(500).json({ error: 'Failed to upload files', message: error.message, jobs: [] });
  }
});

// =============================================================================
// Church-specific OCR job DETAIL endpoint (heavy - includes ocr_text)
// =============================================================================
app.get('/api/church/:churchId/ocr/jobs/:jobId', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    console.log(`[OCR Jobs] GET /api/church/${churchId}/ocr/jobs/${jobId}`);
    
    const { promisePool } = require('./config/db');
    
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Query canonical columns only (after migration, no dynamic detection needed)
    const [rows] = await db.query(`
      SELECT 
        id, filename, original_filename, file_path, status,
        record_type, language, confidence_score, file_size, mime_type, pages,
        ocr_text, ocr_result_json, error, processing_time_ms,
        created_at, updated_at, church_id
      FROM ocr_jobs 
      WHERE id = ? AND church_id = ?
    `, [jobId, churchId]);
    
    if (!rows.length) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = rows[0] as any;
    
    // DB is source of truth - read OCR text and JSON from DB only
    const ocrText = job.ocr_text || null;
    let ocrResult = null;
    
    // Parse OCR result JSON from DB (canonical source)
    if (job.ocr_result_json) {
      try {
        ocrResult = typeof job.ocr_result_json === 'string' 
          ? JSON.parse(job.ocr_result_json) 
          : job.ocr_result_json;
      } catch (e) {
        console.warn(`[OCR Job Detail] Failed to parse ocr_result_json:`, e);
      }
    }
    
    // Optional: Check if bundle exists (metadata only, non-blocking)
    let hasBundle = false;
    try {
      let jobBundleModule;
      try {
        jobBundleModule = require('./utils/jobBundle');
      } catch (e) {
        try {
          jobBundleModule = require('../dist/utils/jobBundle');
        } catch (e2) {
          // Bundle module not available - that's OK
        }
      }
      if (jobBundleModule && jobBundleModule.tryReadManifest) {
        const manifest = await jobBundleModule.tryReadManifest(churchId, String(jobId));
        hasBundle = manifest !== null;
      }
    } catch {
      // Bundle check failure doesn't affect response
    }

    // Load saved mapping if exists
    let mapping = null;
    try {
      const [mappings] = await db.query('SELECT * FROM ocr_mappings WHERE ocr_job_id = ? ORDER BY updated_at DESC LIMIT 1', [jobId]);
      if (mappings.length > 0) {
        mapping = {
          id: mappings[0].id,
          record_type: mappings[0].record_type,
          mapping_json: typeof mappings[0].mapping_json === 'string' ? JSON.parse(mappings[0].mapping_json) : mappings[0].mapping_json,
          created_by: mappings[0].created_by,
          created_at: mappings[0].created_at,
          updated_at: mappings[0].updated_at
        };
      }
    } catch (e) {
      // Table may not exist
    }

    res.json({
      id: job.id.toString(),
      original_filename: job.original_filename || job.filename,
      filename: job.filename,
      file_path: job.file_path,
      status: job.status, // DB is source of truth
      record_type: job.record_type || 'baptism',
      language: job.language || 'en',
      confidence_score: job.confidence_score || 0,
      created_at: job.created_at,
      updated_at: job.updated_at,
      ocr_text: ocrText, // DB is source of truth
      ocr_result: ocrResult, // From DB
      error: job.error || null,
      mapping: mapping,
      has_ocr_text: !!ocrText,
      // Optional metadata
      has_bundle: hasBundle,
    });
  } catch (error: any) {
    console.error('[OCR Job Detail] Error:', error);
    res.status(500).json({ error: 'Failed to fetch job detail', message: error.message });
  }
});

// =============================================================================
// POST /api/church/:churchId/ocr/jobs/:jobId/normalize - Normalize transcription
// =============================================================================
app.post('/api/church/:churchId/ocr/jobs/:jobId/normalize', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const settings = req.body?.settings || {}; // Document processing settings
    
    console.log(`[OCR Normalize] POST /api/church/${churchId}/ocr/jobs/${jobId}/normalize`);
    
    const { promisePool } = require('./config/db');
    
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Check if request body has OCR data (preferred - skip DB read)
    let ocrResult = req.body?.ocrResult || req.body?.ocr_result || null;
    let sourceUsed = 'request_body';
    
    // If no OCR data in body, fetch from DB
    if (!ocrResult) {
      // Query correct columns: result_json, ocr_text, ocr_result (NOT ocr_result_json)
      const [rows] = await db.query('SELECT result_json, ocr_text, ocr_result FROM ocr_jobs WHERE id = ?', [jobId]);
      if (!rows.length) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = rows[0];
      const fs = require('fs').promises;
      const path = require('path');
      
      // Try sources in order: result_json -> ocr_text -> ocr_result
      try {
        // Source 1: result_json (parse JSON longtext)
        if (job.result_json) {
          try {
            ocrResult = typeof job.result_json === 'string' ? JSON.parse(job.result_json) : job.result_json;
            sourceUsed = 'result_json';
            console.log(`[OCR Normalize] Using source: result_json for job ${jobId}`);
          } catch (e) {
            console.warn(`[OCR Normalize] Failed to parse result_json, trying next source:`, e.message);
          }
        }
        
        // Source 2: ocr_text (if result_json not available or failed to parse)
        if (!ocrResult && job.ocr_text) {
          // ocr_text is plain text, not JSON - we need to construct a minimal structure
          // or use it directly if the normalization function can handle plain text
          // For now, we'll try to use it as-is and let the normalization handle it
          sourceUsed = 'ocr_text';
          console.log(`[OCR Normalize] Using source: ocr_text for job ${jobId}`);
          // If we have ocr_text but need JSON structure, we'll need to handle this differently
          // For now, check if we can get JSON from file
        }
        
        // Source 3: ocr_result (parse if JSON; else treat as text)
        if (!ocrResult && job.ocr_result) {
          try {
            if (typeof job.ocr_result === 'string' && job.ocr_result.startsWith('{')) {
              ocrResult = JSON.parse(job.ocr_result);
              sourceUsed = 'ocr_result (parsed JSON)';
              console.log(`[OCR Normalize] Using source: ocr_result (parsed JSON) for job ${jobId}`);
            } else {
              // ocr_result is text, not JSON - similar to ocr_text handling
              sourceUsed = 'ocr_result (text)';
              console.log(`[OCR Normalize] Using source: ocr_result (text) for job ${jobId}`);
            }
          } catch (e) {
            console.warn(`[OCR Normalize] Failed to parse ocr_result:`, e.message);
          }
        }
        
        // Fallback: Try file system if DB sources didn't work
        if (!ocrResult) {
          const [jobFile] = await db.query('SELECT file_path FROM ocr_jobs WHERE id = ?', [jobId]);
          if (jobFile.length && jobFile[0].file_path) {
            const processedDir = path.dirname(jobFile[0].file_path);
            const filenameWithoutExt = path.parse(path.basename(jobFile[0].file_path)).name;
            const jsonFilePath = path.join(processedDir, `${filenameWithoutExt}_ocr.json`);
            try {
              const jsonContent = await fs.promises.readFile(jsonFilePath, 'utf8');
              ocrResult = JSON.parse(jsonContent);
              sourceUsed = 'file_system';
              console.log(`[OCR Normalize] Using source: file_system for job ${jobId}`);
            } catch (e) {
              // File doesn't exist or invalid JSON
              console.warn(`[OCR Normalize] File not found or invalid:`, jsonFilePath);
            }
          }
        }
      } catch (e: any) {
        console.error('[OCR Normalize] Error reading OCR result:', e);
        return res.status(500).json({ error: 'Failed to read OCR result', message: e.message });
      }
    }

    // Validate we have OCR data
    if (!ocrResult) {
      return res.status(400).json({ 
        error: 'OCR result not found',
        message: 'No OCR data available. Please ensure the job has been processed and contains result_json, ocr_text, or ocr_result.',
        jobId,
        sourceUsed: sourceUsed || 'none'
      });
    }
    
    console.log(`[OCR Normalize] Successfully loaded OCR data from source: ${sourceUsed} for job ${jobId}`);

    // Import normalization modules
    const { extractTokensFromVision } = require('./ocr/transcription/extractTokensFromVision');
    const { normalizeTranscription } = require('./ocr/transcription/normalizeTranscription');

    // Extract tokens and lines from Vision response
    const { tokens, lines } = extractTokensFromVision(ocrResult);

    // Normalize transcription
    const normalizationSettings = {
      transcriptionMode: settings.transcriptionMode || 'exact',
      textExtractionScope: settings.textExtractionScope || 'all',
      formattingMode: settings.formattingMode || 'improve-formatting',
      confidenceThreshold: settings.confidenceThreshold ?? 0.35,
    };

    const result = normalizeTranscription(
      { tokens, lines },
      normalizationSettings
    );

    res.json({
      transcription: {
        text: result.text,
        paragraphs: result.paragraphs,
        diagnostics: result.diagnostics,
      },
    });
  } catch (error: any) {
    console.error('[OCR Normalize] Error:', error);
    res.status(500).json({ error: 'Failed to normalize transcription', message: error.message });
  }
});

// =============================================================================
// Church-specific OCR job IMAGE endpoint
// =============================================================================
app.get('/api/church/:churchId/ocr/jobs/:jobId/image', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    console.log(`[OCR Jobs] GET /api/church/${churchId}/ocr/jobs/${jobId}/image`);
    
    const { promisePool } = require('./config/db');
    
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    const [rows] = await db.query('SELECT file_path, mime_type FROM ocr_jobs WHERE id = ?', [jobId]);
    
    if (!rows.length || !rows[0].file_path) {
      return res.status(404).json({ error: 'Job or image not found' });
    }

    const dbFilePath = rows[0].file_path;
    const mimeType = rows[0].mime_type || 'image/jpeg';
    const filename = require('path').basename(dbFilePath);

    const fs = require('fs');
    const path = require('path');
    
    // Try multiple locations where the file might be
    // Use absolute path: /var/www/orthodoxmetrics/prod/server/uploads
    const baseUploadPath = process.env.UPLOAD_BASE_PATH || '/var/www/orthodoxmetrics/prod/server/uploads';
    const serverRoot = path.resolve(__dirname, '..').replace('/dist', '');
    const possiblePaths = [
      dbFilePath, // Try DB path first
      path.join(baseUploadPath, `om_church_${churchId}`, 'processed', filename),
      path.join(baseUploadPath, `om_church_${churchId}`, 'uploaded', filename),
      path.join(baseUploadPath, 'ocr', `church_${churchId}`, filename),
      // Fallback to relative paths (for backward compatibility)
      path.join(serverRoot, 'uploads', `om_church_${churchId}`, 'processed', filename),
      path.join(serverRoot, 'uploads', `om_church_${churchId}`, 'uploaded', filename),
      path.join(__dirname, '..', 'uploads', `om_church_${churchId}`, 'processed', filename),
    ];
    
    let foundPath: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }
    
    if (!foundPath) {
      console.warn(`[OCR Image] File not found in any location. DB path: ${dbFilePath}, tried:`, possiblePaths.slice(0, 3));
      return res.status(404).json({ error: 'Image file not found on disk' });
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    fs.createReadStream(foundPath).pipe(res);
  } catch (error: any) {
    console.error('[OCR Image] Error:', error);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

// =============================================================================
// Church-specific OCR mapping endpoints
// =============================================================================
app.post('/api/church/:churchId/ocr/jobs/:jobId/mapping', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const { record_type, mapping_json } = req.body;
    const userEmail = req.session?.user?.email || req.user?.email || 'unknown';

    if (!record_type || !mapping_json) {
      return res.status(400).json({ error: 'record_type and mapping_json are required' });
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
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Create table if not exists (with church_id for compatibility)
    await db.query(`
      CREATE TABLE IF NOT EXISTS ocr_mappings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ocr_job_id INT NOT NULL,
        church_id INT NULL,
        record_type VARCHAR(50) NOT NULL,
        mapping_json LONGTEXT NOT NULL,
        bbox_links LONGTEXT NULL,
        status ENUM('draft', 'reviewed', 'approved') DEFAULT 'draft',
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ocr_job (ocr_job_id),
        INDEX idx_church (church_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ensure church_id column exists (for tables created before this was added)
    try {
      await db.query(`ALTER TABLE ocr_mappings ADD COLUMN IF NOT EXISTS church_id INT NULL AFTER ocr_job_id`);
    } catch (e) { /* column may already exist */ }

    const mappingStr = typeof mapping_json === 'string' ? mapping_json : JSON.stringify(mapping_json);

    // Upsert
    const [existing] = await db.query('SELECT id FROM ocr_mappings WHERE ocr_job_id = ?', [jobId]);
    
    if (existing.length > 0) {
      await db.query(
        'UPDATE ocr_mappings SET church_id = ?, record_type = ?, mapping_json = ?, created_by = ?, updated_at = NOW() WHERE ocr_job_id = ?',
        [churchId, record_type, mappingStr, userEmail, jobId]
      );
    } else {
      await db.query(
        'INSERT INTO ocr_mappings (ocr_job_id, church_id, record_type, mapping_json, created_by) VALUES (?, ?, ?, ?, ?)',
        [jobId, churchId, record_type, mappingStr, userEmail]
      );
    }

    res.json({ success: true, message: 'Mapping saved' });
  } catch (error: any) {
    console.error('[OCR Mapping Save] Error:', error);
    res.status(500).json({ error: 'Failed to save mapping', message: error.message });
  }
});

app.get('/api/church/:churchId/ocr/jobs/:jobId/mapping', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    console.log(`[OCR Jobs] GET /api/church/${churchId}/ocr/jobs/${jobId}/mapping`);

    const { promisePool } = require('./config/db');
    
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    try {
      const [rows] = await db.query('SELECT * FROM ocr_mappings WHERE ocr_job_id = ? ORDER BY updated_at DESC LIMIT 1', [jobId]);
      
      if (!rows.length) {
        return res.json({ mapping: null });
      }

      const row = rows[0];
      res.json({
        mapping: {
          id: row.id,
          ocr_job_id: row.ocr_job_id,
          record_type: row.record_type,
          mapping_json: typeof row.mapping_json === 'string' ? JSON.parse(row.mapping_json) : row.mapping_json,
          created_by: row.created_by,
          created_at: row.created_at,
          updated_at: row.updated_at
        }
      });
    } catch (e: any) {
      if (e.code === 'ER_NO_SUCH_TABLE') {
        return res.json({ mapping: null });
      }
      throw e;
    }
  } catch (error: any) {
    console.error('[OCR Mapping Get] Error:', error);
    res.status(500).json({ error: 'Failed to get mapping', message: error.message });
  }
});

// =============================================================================
// PATCH /api/church/:churchId/ocr/jobs/:jobId - Update job (e.g., record_type)
// =============================================================================
app.patch('/api/church/:churchId/ocr/jobs/:jobId', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const { record_type } = req.body;

    const { promisePool } = require('./config/db');
    
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (record_type) {
      updates.push('record_type = ?');
      values.push(record_type);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(jobId);
    await db.query(`UPDATE ocr_jobs SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);

    res.json({ success: true, message: 'Job updated' });
  } catch (error: any) {
    console.error('[OCR Job PATCH] Error:', error);
    res.status(500).json({ error: 'Failed to update job', message: error.message });
  }
});

// =============================================================================
// POST /api/church/:churchId/ocr/jobs/:jobId/retry - Retry a failed job
// =============================================================================
app.post('/api/church/:churchId/ocr/jobs/:jobId/retry', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);

    const { promisePool } = require('./config/db');
    
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Get the job to check status and file_path
    const [jobs] = await db.query('SELECT id, file_path, status FROM ocr_jobs WHERE id = ?', [jobId]);
    if (!jobs.length) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobs[0];
    if (job.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed jobs can be retried' });
    }

    // Reset status to processing
    await db.query(`
      UPDATE ocr_jobs SET 
        status = 'processing', 
        error = NULL,
        ocr_text = NULL,
        ocr_result = NULL,
        updated_at = NOW()
      WHERE id = ?
    `, [jobId]);

    // Trigger OCR processing (async)
    // Import and call processOcrJobAsync if available
    try {
      const ocrRoutes = require('./routes/ocr');
      if (typeof ocrRoutes.processOcrJobAsync === 'function') {
        ocrRoutes.processOcrJobAsync(jobId, job.file_path, churchId, db);
      }
    } catch (e) {
      console.warn('[OCR Retry] Could not trigger async processing:', e);
    }

    res.json({ success: true, message: 'Job queued for retry' });
  } catch (error: any) {
    console.error('[OCR Job Retry] Error:', error);
    res.status(500).json({ error: 'Failed to retry job', message: error.message });
  }
});

// =============================================================================
// DELETE /api/church/:churchId/ocr/jobs - Bulk delete jobs
// =============================================================================
app.delete('/api/church/:churchId/ocr/jobs', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const { jobIds } = req.body; // Array of job IDs to delete

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({ error: 'jobIds array is required' });
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
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    const fs = require('fs').promises;
    const path = require('path');

    // Get file paths before deleting
    const placeholders = jobIds.map(() => '?').join(',');
    const [jobs] = await db.query(`SELECT id, file_path FROM ocr_jobs WHERE id IN (${placeholders})`, jobIds);

    // Delete files from disk
    for (const job of jobs) {
      if (job.file_path) {
        try {
          // Delete image
          await fs.unlink(job.file_path);
          
          // Delete OCR text file
          const dir = path.dirname(job.file_path);
          const base = path.parse(path.basename(job.file_path)).name;
          await fs.promises.unlink(path.join(dir, `${base}_ocr.txt`)).catch(() => {});
          await fs.promises.unlink(path.join(dir, `${base}_ocr.json`)).catch(() => {});
        } catch (e) {
          // File may not exist
        }
      }
    }

    // Delete from database
    await db.query(`DELETE FROM ocr_jobs WHERE id IN (${placeholders})`, jobIds);

    // Also delete any mappings
    try {
      await db.query(`DELETE FROM ocr_mappings WHERE ocr_job_id IN (${placeholders})`, jobIds);
    } catch (e) {
      // Table may not exist
    }

    res.json({ success: true, deleted: jobIds.length });
  } catch (error: any) {
    console.error('[OCR Bulk Delete] Error:', error);
    res.status(500).json({ error: 'Failed to delete jobs', message: error.message });
  }
});

// =============================================================================
// FUSION WORKFLOW ENDPOINTS
// =============================================================================

// =============================================================================
// TEST ENDPOINT: Create test OCR job and fusion drafts
// =============================================================================
app.post('/api/church/:churchId/ocr/test/create-test-job', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const { jobId, filename } = req.body;
    
    console.log(`[TEST] Creating test OCR job for church ${churchId}`);
    
    const { promisePool } = require('./config/db');
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Create test OCR job
    const testJobId = jobId || Date.now();
    const testFilename = filename || `test_${testJobId}.jpg`;
    
    try {
      // Try to insert with standard schema
      await db.query(`
        INSERT INTO ocr_jobs (
          id, church_id, filename, original_filename, file_path, file_size, mime_type, 
          status, record_type, language, confidence_score, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', 'baptism', 'en', 85.5, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          filename = VALUES(filename),
          status = 'completed',
          updated_at = NOW()
      `, [
        testJobId,
        churchId,
        testFilename,
        testFilename,
        `/uploads/test/${testFilename}`,
        1024000,
        'image/jpeg'
      ]);
      console.log(`[TEST] Created/updated OCR job ${testJobId} in ${churchRows[0].database_name}`);
    } catch (insertError: any) {
      // Try alternative schema
      if (insertError.code === 'ER_BAD_FIELD_ERROR') {
        await db.query(`
          INSERT INTO ocr_jobs (
            id, church_id, file_name, file_path, status, 
            record_type, language_detected, confidence_score, created_at
          ) VALUES (?, ?, ?, ?, 'completed', 'baptism', 'en', 85.5, NOW())
          ON DUPLICATE KEY UPDATE
            file_name = VALUES(file_name),
            status = 'completed',
            updated_at = NOW()
        `, [
          testJobId,
          churchId,
          testFilename,
          `/uploads/test/${testFilename}`
        ]);
        console.log(`[TEST] Created/updated OCR job ${testJobId} (alt schema) in ${churchRows[0].database_name}`);
      } else {
        throw insertError;
      }
    }

    // Create test fusion drafts
    const testDrafts = [
      {
        entry_index: 0,
        record_type: 'baptism',
        record_number: 'TEST-001',
        payload_json: {
          child_name: 'Test Child',
          parent_names: 'Test Parents',
          birth_date: '2020-01-01',
          baptism_date: '2020-02-01',
          godparents: 'Test Godparents'
        }
      },
      {
        entry_index: 1,
        record_type: 'baptism',
        record_number: 'TEST-002',
        payload_json: {
          child_name: 'Another Test Child',
          parent_names: 'Another Test Parents',
          birth_date: '2021-01-01',
          baptism_date: '2021-02-01'
        }
      }
    ];

    // Ensure ocr_fused_drafts table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS ocr_fused_drafts (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        ocr_job_id BIGINT NOT NULL,
        entry_index INT NOT NULL DEFAULT 0,
        record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL DEFAULT 'baptism',
        record_number VARCHAR(16) NULL,
        payload_json LONGTEXT NOT NULL,
        bbox_json LONGTEXT NULL,
        status ENUM('draft', 'committed') NOT NULL DEFAULT 'draft',
        committed_record_id BIGINT NULL,
        created_by VARCHAR(255) NOT NULL DEFAULT 'system',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_job_entry (ocr_job_id, entry_index),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // After migration, workflow_status and church_id columns should exist
    // Insert test drafts using canonical columns
    const insertedDrafts = [];
    for (const draft of testDrafts) {
      await db.query(`
        INSERT INTO ocr_fused_drafts 
          (ocr_job_id, entry_index, record_type, record_number, payload_json, workflow_status, status, church_id, created_by)
        VALUES (?, ?, ?, ?, ?, 'draft', 'draft', ?, 'test-user')
        ON DUPLICATE KEY UPDATE
          payload_json = VALUES(payload_json),
          record_number = VALUES(record_number),
          workflow_status = VALUES(workflow_status),
          church_id = VALUES(church_id),
          updated_at = NOW()
      `, [
        testJobId,
        draft.entry_index,
        draft.record_type,
        draft.record_number,
        JSON.stringify(draft.payload_json),
        churchId,
      ]);

      insertedDrafts.push({
        ocr_job_id: testJobId,
        entry_index: draft.entry_index,
        record_type: draft.record_type,
        record_number: draft.record_number
      });
    }

    console.log(`[TEST] Created ${insertedDrafts.length} test fusion drafts for job ${testJobId}`);

    res.json({
      success: true,
      message: `Test OCR job ${testJobId} and ${insertedDrafts.length} fusion drafts created`,
      job: {
        id: testJobId,
        filename: testFilename,
        church_id: churchId,
        database: churchRows[0].database_name
      },
      drafts: insertedDrafts
    });
  } catch (error: any) {
    console.error('[TEST] Error creating test job:', error);
    res.status(500).json({ error: 'Failed to create test job', message: error.message });
  }
});

// GET /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts - Get fusion drafts for a job
app.get('/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts', async (req, res) => {
  const churchId = parseInt(req.params.churchId);
  const jobId = parseInt(req.params.jobId || '0');
  console.log(`[OCR Jobs] GET /api/church/${churchId}/ocr/jobs/${jobId}/fusion/drafts`);
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    console.log(`[Fusion Drafts GET] Parsed churchId: ${churchId}, jobId: ${jobId}`);
    
    // Verify church exists
    const { promisePool } = require('./config/db');
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      console.log(`[Fusion Drafts GET] Church ${churchId} not found`);
      return res.status(404).json({ error: 'Church not found' });
    }

    // Read from DB (canonical source of truth)
    const statusFilter = req.query.status as string | undefined;
    const recordTypeFilter = req.query.record_type as string | undefined;

    // Get church database connection
    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    let query = `
      SELECT 
        id, ocr_job_id, entry_index, record_type, record_number,
        payload_json, bbox_json, workflow_status, status,
        church_id, committed_record_id, created_at, updated_at
      FROM ocr_fused_drafts
      WHERE ocr_job_id = ? AND church_id = ?
    `;
    const params: any[] = [jobId, churchId];

    if (statusFilter) {
      query += ' AND workflow_status = ?';
      params.push(statusFilter);
    }

    if (recordTypeFilter) {
      query += ' AND record_type = ?';
      params.push(recordTypeFilter);
    }

    query += ' ORDER BY entry_index';

    const [drafts] = await db.query(query, params);

    console.log(`[Fusion Drafts GET] Returning ${drafts.length} drafts from DB (canonical source)`);
    
    // Convert to API format (DB is source of truth)
    const normalizedDrafts = (drafts as any[]).map(draft => {
      const payloadJson = typeof draft.payload_json === 'string' 
        ? JSON.parse(draft.payload_json) 
        : (draft.payload_json || {});
      
      const bboxJson = typeof draft.bbox_json === 'string' 
        ? JSON.parse(draft.bbox_json) 
        : (draft.bbox_json || {});

      return {
        id: draft.entry_index,
        ocr_job_id: draft.ocr_job_id,
        entry_index: draft.entry_index,
        record_type: draft.record_type,
        record_number: draft.record_number,
        payload_json: payloadJson,
        bbox_json: {
          entryAreas: bboxJson.entryAreas || [],
          entries: bboxJson.entries || {},
          selections: bboxJson.selections || {},
          entryBbox: bboxJson.entryBbox,
          fieldBboxes: bboxJson.fieldBboxes || {},
        },
        status: draft.workflow_status === 'committed' ? 'committed' : 'draft',
        workflow_status: draft.workflow_status,
        committed_record_id: draft.committed_record_id || null,
        updated_at: draft.updated_at,
      };
    });
    
    res.json({ 
      drafts: normalizedDrafts,
      entryAreas: normalizedDrafts[0]?.bbox_json?.entryAreas || [],
      entries: normalizedDrafts[0]?.bbox_json?.entries || {},
      fields: normalizedDrafts[0]?.bbox_json?.entries || {},
      selections: normalizedDrafts[0]?.bbox_json?.selections || {},
    });
  } catch (error: any) {
    console.error('[Fusion Drafts GET] Error:', error);
    res.status(500).json({ error: 'Failed to fetch drafts', message: error.message });
  }
});

console.log('✅ [OCR Jobs Routes] All 5 hardwired OCR jobs endpoints registered successfully');
console.log('✅ [OCR] Church OCR routing complete - using hardwired routes (DB source of truth)');

// POST /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts - Save/upsert fusion drafts
app.post('/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const { entries } = req.body; // Array of { entry_index, record_type, record_number, payload_json, bbox_json }
    const userEmail = req.session?.user?.email || req.user?.email || 'system';

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries array is required' });
    }

    // Verify church exists
    const { promisePool } = require('./config/db');
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    // Write to DB FIRST (canonical source of truth)
    console.log(`[Fusion Drafts POST] Writing ${entries.length} entries to DB (canonical source) for job ${jobId} (church ${churchId})`);
    
    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS ocr_fused_drafts (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        ocr_job_id BIGINT NOT NULL,
        entry_index INT NOT NULL DEFAULT 0,
        record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL DEFAULT 'baptism',
        record_number VARCHAR(16) NULL,
        payload_json LONGTEXT NOT NULL,
        bbox_json LONGTEXT NULL,
        workflow_status ENUM('draft', 'in_review', 'finalized', 'committed') NOT NULL DEFAULT 'draft',
        status ENUM('draft', 'committed') NOT NULL DEFAULT 'draft',
        church_id INT NOT NULL,
        committed_record_id BIGINT NULL,
        created_by VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_job_entry (ocr_job_id, entry_index),
        INDEX idx_workflow_status (workflow_status),
        INDEX idx_church (church_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Write to DB (canonical)
    // Write each entry to DB
    const savedDrafts = [];
    for (const entry of entries) {
      const [result] = await db.query(`
        INSERT INTO ocr_fused_drafts 
          (ocr_job_id, entry_index, record_type, record_number, payload_json, bbox_json, workflow_status, church_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          record_type = VALUES(record_type),
          record_number = VALUES(record_number),
          payload_json = VALUES(payload_json),
          bbox_json = VALUES(bbox_json),
          workflow_status = VALUES(workflow_status),
          updated_at = CURRENT_TIMESTAMP
      `, [
        jobId,
        entry.entry_index,
        entry.record_type,
        entry.record_number || null,
        JSON.stringify(entry.payload_json || {}),
        entry.bbox_json ? JSON.stringify(entry.bbox_json) : null,
        entry.workflow_status || 'draft',
        churchId,
        userEmail,
      ]);

      savedDrafts.push({
        id: entry.entry_index,
        ocr_job_id: jobId,
        entry_index: entry.entry_index,
        record_type: entry.record_type,
        record_number: entry.record_number,
        payload_json: entry.payload_json,
        bbox_json: entry.bbox_json,
        workflow_status: entry.workflow_status || 'draft',
        updated_at: new Date().toISOString(),
      });
    }

    console.log(`[Fusion Drafts POST] DB write completed (canonical) for job ${jobId}`);

    // Optional: Write to bundle as derived artifact (non-blocking)
    try {
      let jobBundleModule;
      try {
        jobBundleModule = require('./utils/jobBundle');
      } catch (e) {
        try {
          jobBundleModule = require('../dist/utils/jobBundle');
        } catch (e2) {
          // Bundle module not available - that's OK
        }
      }

      if (jobBundleModule && jobBundleModule.upsertDraftEntries) {
        await jobBundleModule.upsertDraftEntries(churchId, String(jobId), entries.map(entry => ({
          entry_index: entry.entry_index,
          record_type: entry.record_type,
          record_number: entry.record_number,
          payload_json: entry.payload_json || {},
          bbox_json: entry.bbox_json,
          workflow_status: entry.workflow_status || 'draft',
        })));
        console.log(`[Fusion Drafts POST] Wrote to bundle as artifact (non-canonical) for job ${jobId}`);
      }
    } catch (bundleError: any) {
      // Non-blocking - bundle write failure doesn't affect response
      console.warn(`[Fusion Drafts POST] Bundle write skipped (non-blocking):`, bundleError.message);
    }

    res.json({ success: true, drafts: savedDrafts });
  } catch (error: any) {
    console.error('[Fusion Drafts POST] Error:', error);
    res.status(500).json({ error: 'Failed to save drafts', message: error.message });
  }
});

// POST /api/church/:churchId/ocr/jobs/:jobId/fusion/validate - Validate drafts before commit
app.post('/api/church/:churchId/ocr/jobs/:jobId/fusion/validate', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);

    const { promisePool } = require('./config/db');
    
    const [churchRows] = await promisePool.query('SELECT database_name, name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) {
      return res.status(404).json({ error: 'Church not found' });
    }

    let dbSwitcherModule;
    try {
      dbSwitcherModule = require('./utils/dbSwitcher');
    } catch (e) {
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Fetch drafts using workflow_status (canonical after migration)
    const [drafts] = await db.query(
      `SELECT * FROM ocr_fused_drafts WHERE ocr_job_id = ? AND workflow_status = 'draft' ORDER BY entry_index`,
      [jobId]
    );

    if (drafts.length === 0) {
      return res.json({ valid: false, error: 'No drafts to validate', drafts: [] });
    }

    // Required fields per record type
    const requiredFields: Record<string, string[]> = {
      baptism: ['child_name'],
      marriage: ['groom_name', 'bride_name'],
      funeral: ['deceased_name'],
    };

    const validatedDrafts = drafts.map((draft: any) => {
      const payload = typeof draft.payload_json === 'string' 
        ? JSON.parse(draft.payload_json) 
        : draft.payload_json;
      
      const recordType = draft.record_type || 'baptism';
      const required = requiredFields[recordType] || [];
      const missingFields: string[] = [];
      const warnings: string[] = [];

      // Check required fields
      for (const field of required) {
        if (!payload[field] || payload[field].trim() === '') {
          missingFields.push(field);
        }
      }

      // Check for low confidence warnings (if bbox_json contains confidence data)
      if (draft.bbox_json) {
        const bboxData = typeof draft.bbox_json === 'string' 
          ? JSON.parse(draft.bbox_json) 
          : draft.bbox_json;
        
        if (bboxData.fieldBboxes) {
          for (const [fieldName, fieldData] of Object.entries(bboxData.fieldBboxes)) {
            const fd = fieldData as any;
            if (fd.confidence && fd.confidence < 0.6) {
              warnings.push(`Low OCR confidence on ${fieldName}`);
            }
          }
        }
      }

      // Check for very short values that might be incomplete
      for (const [fieldName, value] of Object.entries(payload)) {
        if (typeof value === 'string' && value.length > 0 && value.length < 2) {
          warnings.push(`${fieldName} appears incomplete`);
        }
      }

      return {
        id: draft.id,
        entry_index: draft.entry_index,
        record_type: recordType,
        record_number: draft.record_number,
        missing_fields: missingFields,
        warnings,
        payload,
      };
    });

    const allValid = validatedDrafts.every((d: any) => d.missing_fields.length === 0);

    res.json({
      valid: allValid,
      church_name: churchRows[0].name || `Church ${churchId}`,
      church_id: churchId,
      drafts: validatedDrafts,
      summary: {
        total: validatedDrafts.length,
        valid: validatedDrafts.filter((d: any) => d.missing_fields.length === 0).length,
        invalid: validatedDrafts.filter((d: any) => d.missing_fields.length > 0).length,
        warnings: validatedDrafts.reduce((sum: number, d: any) => sum + d.warnings.length, 0),
      },
    });
  } catch (error: any) {
    console.error('[Fusion Validate] Error:', error);
    res.status(500).json({ error: 'Failed to validate drafts', message: error.message });
  }
});

// POST /api/church/:churchId/ocr/jobs/:jobId/fusion/commit - Commit drafts to final record tables
app.post('/api/church/:churchId/ocr/jobs/:jobId/fusion/commit', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const { draft_ids } = req.body; // Array of draft IDs to commit
    const userEmail = req.session?.user?.email || req.user?.email || 'system';

    if (!Array.isArray(draft_ids) || draft_ids.length === 0) {
      return res.status(400).json({ error: 'draft_ids array is required' });
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
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Fetch drafts to commit using workflow_status (canonical after migration)
    // Note: This endpoint may use 'draft' status, but after migration should use workflow_status
    const placeholders = draft_ids.map(() => '?').join(',');
    let drafts: any[];
    try {
      // Try workflow_status first (canonical after migration)
      [drafts] = await db.query(
        `SELECT * FROM ocr_fused_drafts WHERE id IN (${placeholders}) AND workflow_status = 'draft'`,
        draft_ids
      );
    } catch (err: any) {
      // Fallback to status column if workflow_status doesn't exist (pre-migration)
      if (err.code === 'ER_BAD_FIELD_ERROR' && err.message.includes('workflow_status')) {
        [drafts] = await db.query(
          `SELECT * FROM ocr_fused_drafts WHERE id IN (${placeholders}) AND status = 'draft'`,
          draft_ids
        );
      } else {
        throw err;
      }
    }

    if (drafts.length === 0) {
      return res.status(400).json({ error: 'No valid drafts found to commit' });
    }

    const committed: any[] = [];
    const errors: any[] = [];

    for (const draft of drafts) {
      try {
        const payload = typeof draft.payload_json === 'string' 
          ? JSON.parse(draft.payload_json) 
          : draft.payload_json;

        let recordId: number | null = null;
        const recordType = draft.record_type;

        // Map payload to record table columns and insert
        if (recordType === 'baptism') {
          // Validate required fields
          if (!payload.child_name) {
            errors.push({ draft_id: draft.id, error: 'child_name is required for baptism records' });
            continue;
          }

          const [result] = await db.query(`
            INSERT INTO baptism_records 
              (church_id, child_name, date_of_birth, place_of_birth, 
               father_name, mother_name, address, date_of_baptism,
               godparents, performed_by, notes, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `, [
            churchId,
            payload.child_name || null,
            payload.date_of_birth || null,
            payload.place_of_birth || null,
            payload.father_name || null,
            payload.mother_name || payload.parents_name || null,
            payload.address || null,
            payload.date_of_baptism || null,
            payload.godparents || null,
            payload.performed_by || null,
            payload.notes || null,
            userEmail,
          ]);
          recordId = result.insertId;

        } else if (recordType === 'marriage') {
          if (!payload.groom_name || !payload.bride_name) {
            errors.push({ draft_id: draft.id, error: 'groom_name and bride_name are required for marriage records' });
            continue;
          }

          const [result] = await db.query(`
            INSERT INTO marriage_records 
              (church_id, groom_name, bride_name, date_of_marriage,
               place_of_marriage, witnesses, officiant, notes, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `, [
            churchId,
            payload.groom_name || null,
            payload.bride_name || null,
            payload.date_of_marriage || null,
            payload.place_of_marriage || null,
            payload.witnesses || null,
            payload.officiant || null,
            payload.notes || null,
            userEmail,
          ]);
          recordId = result.insertId;

        } else if (recordType === 'funeral') {
          if (!payload.deceased_name) {
            errors.push({ draft_id: draft.id, error: 'deceased_name is required for funeral records' });
            continue;
          }

          const [result] = await db.query(`
            INSERT INTO funeral_records 
              (church_id, deceased_name, date_of_death, date_of_funeral,
               date_of_burial, place_of_burial, age_at_death, cause_of_death,
               next_of_kin, officiant, notes, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `, [
            churchId,
            payload.deceased_name || null,
            payload.date_of_death || null,
            payload.date_of_funeral || null,
            payload.date_of_burial || null,
            payload.place_of_burial || null,
            payload.age_at_death || null,
            payload.cause_of_death || null,
            payload.next_of_kin || null,
            payload.officiant || null,
            payload.notes || null,
            userEmail,
          ]);
          recordId = result.insertId;
        }

        if (recordId) {
          // Mark draft as committed
          await db.query(`
            UPDATE ocr_fused_drafts 
            SET status = 'committed', committed_record_id = ?, updated_at = NOW()
            WHERE id = ?
          `, [recordId, draft.id]);

          committed.push({
            draft_id: draft.id,
            record_type: recordType,
            record_id: recordId,
          });
        }
      } catch (err: any) {
        console.error(`[Fusion Commit] Error committing draft ${draft.id}:`, err);
        errors.push({ draft_id: draft.id, error: err.message });
      }
    }

    res.json({
      success: errors.length === 0,
      committed,
      errors,
      message: `Committed ${committed.length} records, ${errors.length} errors`,
    });
  } catch (error: any) {
    console.error('[Fusion Commit] Error:', error);
    res.status(500).json({ error: 'Failed to commit drafts', message: error.message });
  }
});

// =============================================================================
// REVIEW & FINALIZE ENDPOINTS
// =============================================================================

// PUT /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts/:entryIndex - Upsert single draft (autosave)
app.put('/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts/:entryIndex', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const entryIndex = parseInt(req.params.entryIndex);
    const { record_type, record_number, payload_json, bbox_json, workflow_status } = req.body;
    const userEmail = req.session?.user?.email || req.user?.email || 'system';

    const { promisePool } = require('./config/db');
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) return res.status(404).json({ error: 'Church not found' });

    let dbSwitcherModule;
    try { dbSwitcherModule = require('./utils/dbSwitcher'); } 
    catch (e) { dbSwitcherModule = require('./utils/dbSwitcher'); }
    const db = await dbSwitcherModule.getChurchDbConnection(churchRows[0].database_name);

    // Ensure columns exist
    try {
      await db.query(`ALTER TABLE ocr_fused_drafts ADD COLUMN IF NOT EXISTS workflow_status ENUM('draft','in_review','finalized','committed') NOT NULL DEFAULT 'draft'`);
      await db.query(`ALTER TABLE ocr_fused_drafts ADD COLUMN IF NOT EXISTS last_saved_at DATETIME NULL`);
    } catch (e) { /* columns may already exist */ }

    await db.query(`
      INSERT INTO ocr_fused_drafts 
        (ocr_job_id, entry_index, record_type, record_number, payload_json, bbox_json, status, workflow_status, created_by, last_saved_at)
      VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        record_type = VALUES(record_type),
        record_number = VALUES(record_number),
        payload_json = VALUES(payload_json),
        bbox_json = VALUES(bbox_json),
        workflow_status = COALESCE(VALUES(workflow_status), workflow_status),
        last_saved_at = NOW(),
        updated_at = NOW()
    `, [
      jobId, entryIndex, record_type || 'baptism', record_number || null,
      JSON.stringify(payload_json || {}), bbox_json ? JSON.stringify(bbox_json) : null,
      workflow_status || 'draft', userEmail
    ]);

    const [saved] = await db.query('SELECT * FROM ocr_fused_drafts WHERE ocr_job_id = ? AND entry_index = ?', [jobId, entryIndex]);
    
    res.json({ 
      success: true, 
      draft: saved[0] ? {
        ...saved[0],
        payload_json: typeof saved[0].payload_json === 'string' ? JSON.parse(saved[0].payload_json) : saved[0].payload_json
      } : null,
      last_saved_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Autosave Draft] Error:', error);
    res.status(500).json({ error: 'Failed to save draft', message: error.message });
  }
});

// POST /api/church/:churchId/ocr/jobs/:jobId/fusion/extract-layout - Extract fields using layout-aware extractor
app.post('/api/church/:churchId/ocr/jobs/:jobId/fusion/extract-layout', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const { visionResponse, imageWidth, imageHeight, recordType, confidenceThreshold, entryAreas, debug } = req.body;

    if (!visionResponse || !imageWidth || !imageHeight) {
      return res.status(400).json({ error: 'visionResponse, imageWidth, and imageHeight are required' });
    }

    // Import layout extractor
    const { extractLayoutFields } = require('./ocr/layoutExtractor');
    
    const config = {
      confidenceThreshold: confidenceThreshold || 0.60,
      imageWidth: parseInt(imageWidth),
      imageHeight: parseInt(imageHeight),
      recordType: recordType || 'baptism',
      entryAreas: entryAreas || undefined, // Optional: pre-detected entry areas for multi-entry pages
      debug: debug === true || debug === '1' || req.query.debug === '1',
    };

    const result = extractLayoutFields(visionResponse, config);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[Extract Layout] Error:', error);
    res.status(500).json({ error: 'Failed to extract layout fields', message: error.message });
  }
});

// PATCH /api/church/:churchId/ocr/jobs/:jobId/fusion/drafts/:draftId/entry-bbox - Update entry bbox for a specific draft
app.patch('/api/church/:churchId/ocr/jobs/:jobId/fusion/drafts/:draftId/entry-bbox', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const draftId = parseInt(req.params.draftId);
    const { entryBbox, entryAreas } = req.body; // Support both legacy entryBbox and new entryAreas

    // Validate: require either entryBbox (legacy) or entryAreas (new format)
    if (!entryBbox && !entryAreas) {
      return res.status(400).json({ error: 'Either entryBbox or entryAreas is required' });
    }

    // Validate entryBbox if provided (legacy support)
    if (entryBbox) {
      if (typeof entryBbox !== 'object') {
        return res.status(400).json({ error: 'entryBbox must be an object with x, y, w, h properties' });
      }
      if (typeof entryBbox.x !== 'number' || typeof entryBbox.y !== 'number' || 
          typeof entryBbox.w !== 'number' || typeof entryBbox.h !== 'number') {
        return res.status(400).json({ error: 'entryBbox must have numeric x, y, w, h properties' });
      }
    }

    // Validate entryAreas if provided (new format)
    if (entryAreas) {
      if (!Array.isArray(entryAreas)) {
        return res.status(400).json({ error: 'entryAreas must be an array' });
      }
      for (const area of entryAreas) {
        if (!area.entryId || !area.bbox || typeof area.bbox.x !== 'number' || 
            typeof area.bbox.y !== 'number' || typeof area.bbox.w !== 'number' || typeof area.bbox.h !== 'number') {
          return res.status(400).json({ error: 'Each entryArea must have entryId and bbox with x, y, w, h properties' });
        }
      }
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
      dbSwitcherModule = require('./utils/dbSwitcher');
    }
    const { getChurchDbConnection } = dbSwitcherModule;
    const db = await getChurchDbConnection(churchRows[0].database_name);

    // Get existing draft to merge bbox_json
    const [existing] = await db.query(
      'SELECT bbox_json FROM ocr_fused_drafts WHERE id = ? AND ocr_job_id = ?',
      [draftId, jobId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    // Parse existing bbox_json or create new structure
    let bboxJson: any = {};
    if (existing[0].bbox_json) {
      try {
        bboxJson = typeof existing[0].bbox_json === 'string' 
          ? JSON.parse(existing[0].bbox_json) 
          : existing[0].bbox_json;
      } catch (e) {
        bboxJson = {};
      }
    }

    // Update entryBbox (legacy support)
    if (entryBbox) {
      bboxJson.entryBbox = entryBbox;
    }

    // Update entryAreas (new format - preferred)
    if (entryAreas) {
      bboxJson.entryAreas = entryAreas;
      console.log(`[Update Entry Bbox] Updated entryAreas with ${entryAreas.length} areas`);
    }

    // Ensure selections object exists
    if (!bboxJson.selections) {
      bboxJson.selections = {};
    }

    // Update draft
    await db.query(`
      UPDATE ocr_fused_drafts 
      SET bbox_json = ?, updated_at = NOW()
      WHERE id = ? AND ocr_job_id = ?
    `, [JSON.stringify(bboxJson), draftId, jobId]);

    // Fetch updated draft
    const [updated] = await db.query(
      'SELECT * FROM ocr_fused_drafts WHERE id = ? AND ocr_job_id = ?',
      [draftId, jobId]
    );

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Draft not found after update' });
    }

    const draft = updated[0];
    res.json({
      success: true,
      draft: {
        ...draft,
        payload_json: typeof draft.payload_json === 'string' ? JSON.parse(draft.payload_json) : draft.payload_json,
        bbox_json: typeof draft.bbox_json === 'string' ? JSON.parse(draft.bbox_json) : draft.bbox_json,
      },
    });
  } catch (error: any) {
    console.error('[Update Entry Bbox] Error:', error);
    res.status(500).json({ error: 'Failed to update entry bbox', message: error.message });
  }
});

// POST /api/church/:churchId/ocr/jobs/:jobId/fusion/ready-for-review - Mark drafts ready for review
app.post('/api/church/:churchId/ocr/jobs/:jobId/fusion/ready-for-review', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const { entry_indexes } = req.body;

    const { promisePool } = require('./config/db');
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) return res.status(404).json({ error: 'Church not found' });

    let dbSwitcherModule;
    try { dbSwitcherModule = require('./utils/dbSwitcher'); } 
    catch (e) { dbSwitcherModule = require('./utils/dbSwitcher'); }
    const db = await dbSwitcherModule.getChurchDbConnection(churchRows[0].database_name);

    // After migration, workflow_status column should exist - use it directly
    if (Array.isArray(entry_indexes) && entry_indexes.length > 0) {
      const placeholders = entry_indexes.map(() => '?').join(',');
      await db.query(
        `UPDATE ocr_fused_drafts 
         SET workflow_status = 'in_review', updated_at = NOW() 
         WHERE ocr_job_id = ? AND entry_index IN (${placeholders}) AND workflow_status = 'draft'`,
        [jobId, ...entry_indexes]
      );
    } else {
      await db.query(
        `UPDATE ocr_fused_drafts 
         SET workflow_status = 'in_review', updated_at = NOW() 
         WHERE ocr_job_id = ? AND workflow_status = 'draft'`,
        [jobId]
      );
    }

    res.json({ success: true, message: 'Drafts marked for review' });
  } catch (error: any) {
    console.error('[Ready for Review] Error:', error);
    res.status(500).json({ error: 'Failed to mark ready for review', message: error.message });
  }
});

// POST /api/church/:churchId/ocr/jobs/:jobId/review/finalize - Finalize drafts (create history snapshot)
app.post('/api/church/:churchId/ocr/jobs/:jobId/review/finalize', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const { entry_indexes } = req.body;
    const userEmail = req.session?.user?.email || req.user?.email || 'system';

    // Verify church exists
    const { promisePool } = require('./config/db');
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) return res.status(404).json({ error: 'Church not found' });

    // Read from DB (canonical source)
    console.log(`[Finalize] Reading drafts from DB (canonical source) for job ${jobId} (church ${churchId})`);
    
    let dbSwitcherModule;
    try { dbSwitcherModule = require('./utils/dbSwitcher'); } 
    catch (e) { dbSwitcherModule = require('./utils/dbSwitcher'); }
    const db = await dbSwitcherModule.getChurchDbConnection(churchRows[0].database_name);
    
    let query = `
      SELECT 
        id, ocr_job_id, entry_index, record_type, record_number,
        payload_json, bbox_json, workflow_status, church_id, committed_record_id
      FROM ocr_fused_drafts
      WHERE ocr_job_id = ? AND church_id = ? 
        AND workflow_status IN ('draft', 'in_review')
    `;
    const params: any[] = [jobId, churchId];

    if (Array.isArray(entry_indexes) && entry_indexes.length > 0) {
      const placeholders = entry_indexes.map(() => '?').join(',');
      query += ` AND entry_index IN (${placeholders})`;
      params.push(...entry_indexes);
    }

    query += ' ORDER BY entry_index';

    const [draftsToFinalize] = await db.query(query, params);

    if (draftsToFinalize.length === 0) {
      return res.json({ success: true, finalized: [], count: 0 });
    }

    // Update workflow_status to 'finalized' in DB (canonical)
    const now = new Date().toISOString();
    const finalizedEntries = [];
    for (const draft of draftsToFinalize as any[]) {
      await db.query(`
        UPDATE ocr_fused_drafts 
        SET workflow_status = 'finalized', updated_at = NOW()
        WHERE ocr_job_id = ? AND entry_index = ?
      `, [jobId, draft.entry_index]);
      
      finalizedEntries.push({
        entry_index: draft.entry_index,
        record_type: draft.record_type,
        record_number: draft.record_number,
        payload_json: typeof draft.payload_json === 'string' ? JSON.parse(draft.payload_json) : draft.payload_json,
        updatedAt: now,
      });
    }

    console.log(`[Finalize] Updated ${finalizedEntries.length} entries to 'finalized' in DB for job ${jobId}`);

    // Optional: Write to bundle as artifact (non-blocking)
    try {
      let jobBundleModule;
      try {
        jobBundleModule = require('./utils/jobBundle');
      } catch (e) {
        try {
          jobBundleModule = require('../dist/utils/jobBundle');
        } catch (e2) {
          // Bundle module not available - that's OK
        }
      }
      if (jobBundleModule && jobBundleModule.readDrafts && jobBundleModule.writeDrafts) {
        const draftsFile = await jobBundleModule.readDrafts(churchId, String(jobId));
        finalizedEntries.forEach(entry => {
          const bundleEntry = draftsFile.entries.find(e => e.entry_index === entry.entry_index);
          if (bundleEntry) {
            bundleEntry.workflow_status = 'finalized';
            bundleEntry.updatedAt = entry.updatedAt;
          }
        });
        await jobBundleModule.writeDrafts(churchId, String(jobId), draftsFile);
        console.log(`[Finalize] Wrote to bundle as artifact (non-canonical) for job ${jobId}`);
      }
    } catch (bundleError: any) {
      console.warn(`[Finalize] Bundle write skipped (non-blocking):`, bundleError.message);
    }

    // Best-effort history write (non-blocking)
    try {

      // Ensure history table exists
      await db.query(`
        CREATE TABLE IF NOT EXISTS ocr_finalize_history (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          ocr_job_id BIGINT NOT NULL,
          entry_index INT NOT NULL DEFAULT 0,
          record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL DEFAULT 'baptism',
          record_number VARCHAR(16) NULL,
          payload_json LONGTEXT NOT NULL,
          created_record_id BIGINT NULL,
          finalized_by VARCHAR(255) NOT NULL DEFAULT 'system',
          finalized_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          committed_at DATETIME NULL,
          source_filename VARCHAR(255) NULL,
          INDEX idx_record_type (record_type),
          INDEX idx_finalized_at (finalized_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Get original filename from ocr_jobs (best-effort)
      let originalFilename = null;
      try {
        const [jobs] = await db.query('SELECT original_filename FROM ocr_jobs WHERE id = ?', [jobId]);
        if (jobs.length > 0) {
          originalFilename = jobs[0].original_filename;
        }
      } catch (e) {
        console.warn(`[Finalize] Could not fetch original_filename (non-blocking):`, e);
      }

      // Insert into history for each finalized entry
      for (const entry of finalizedEntries) {
        try {
          await db.query(`
            INSERT INTO ocr_finalize_history 
              (ocr_job_id, entry_index, record_type, record_number, payload_json, finalized_by, finalized_at, source_filename)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
            ON DUPLICATE KEY UPDATE
              payload_json = VALUES(payload_json),
              finalized_by = VALUES(finalized_by),
              finalized_at = NOW()
          `, [
            jobId,
            entry.entry_index,
            entry.record_type,
            entry.record_number,
            JSON.stringify(entry.payload_json),
            userEmail,
            originalFilename
          ]);
        } catch (dbErr: any) {
          console.warn(`[Finalize] DB history write failed for entry ${entry.entry_index} (non-blocking):`, dbErr.message);
        }
      }
    } catch (dbError: any) {
      console.warn(`[Finalize] DB history write skipped (non-blocking):`, dbError.message);
    }

    const finalized = finalizedEntries.map(e => ({
      entry_index: e.entry_index,
      record_type: e.record_type,
    }));

    res.json({ success: true, finalized, count: finalized.length });
  } catch (error: any) {
    console.error('[Finalize] Error:', error);
    res.status(500).json({ error: 'Failed to finalize drafts', message: error.message });
  }
});

// POST /api/church/:churchId/ocr/jobs/:jobId/review/commit - Commit finalized drafts to record tables
app.post('/api/church/:churchId/ocr/jobs/:jobId/review/commit', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const { entry_indexes } = req.body;
    const userEmail = req.session?.user?.email || req.user?.email || 'system';

    // Verify church exists
    const { promisePool } = require('./config/db');
    const [churchRows] = await promisePool.query('SELECT database_name, name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) return res.status(404).json({ error: 'Church not found' });

    // Read from DB (canonical source)
    console.log(`[Review Commit] Reading drafts from DB (canonical source) for job ${jobId} (church ${churchId})`);
    
    let dbSwitcherModule;
    try { dbSwitcherModule = require('./utils/dbSwitcher'); } 
    catch (e) { dbSwitcherModule = require('./utils/dbSwitcher'); }
    const db = await dbSwitcherModule.getChurchDbConnection(churchRows[0].database_name);
    
    let query = `
      SELECT 
        id, ocr_job_id, entry_index, record_type, record_number,
        payload_json, bbox_json, workflow_status, church_id, committed_record_id
      FROM ocr_fused_drafts
      WHERE ocr_job_id = ? AND church_id = ? AND workflow_status = 'finalized'
    `;
    const params: any[] = [jobId, churchId];

    if (Array.isArray(entry_indexes) && entry_indexes.length > 0) {
      const placeholders = entry_indexes.map(() => '?').join(',');
      query += ` AND entry_index IN (${placeholders})`;
      params.push(...entry_indexes);
    }

    query += ' ORDER BY entry_index';

    const [draftsToCommit] = await db.query(query, params);

    if (draftsToCommit.length === 0) {
      return res.status(400).json({ error: 'No finalized drafts to commit' });
    }

    const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;
    const finalizeNote = `\nFinalized via Review & Finalize on ${dateStr}`;

    const committed: any[] = [];
    const errors: any[] = [];

    for (const draft of draftsToCommit as any[]) {
      let recordId: number | null = null;
      let commitError: string | null = null;

      const payload = typeof draft.payload_json === 'string' 
        ? JSON.parse(draft.payload_json) 
        : draft.payload_json;
      const recordType = draft.record_type;

      try {
        // Append finalize note to notes field
        let notes = payload.notes || '';
        if (!notes.includes('Finalized via Review & Finalize')) {
          notes = notes + finalizeNote;
        }

        if (recordType === 'baptism') {
          if (!payload.child_name) {
            commitError = 'child_name is required';
            errors.push({ entry_index: draft.entry_index, error: commitError });
          } else {
            const [result] = await db.query(`
              INSERT INTO baptism_records 
                (church_id, child_name, date_of_birth, place_of_birth, father_name, mother_name, 
                 address, date_of_baptism, godparents, performed_by, notes, created_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [churchId, payload.child_name, payload.date_of_birth, payload.place_of_birth,
                payload.father_name, payload.mother_name || payload.parents_name, payload.address,
                payload.date_of_baptism, payload.godparents, payload.performed_by, notes, userEmail]);
            recordId = result.insertId;
          }

        } else if (recordType === 'marriage') {
          if (!payload.groom_name || !payload.bride_name) {
            commitError = 'groom_name and bride_name required';
            errors.push({ entry_index: draft.entry_index, error: commitError });
          } else {
            const [result] = await db.query(`
              INSERT INTO marriage_records 
                (church_id, groom_name, bride_name, date_of_marriage, place_of_marriage, 
                 witnesses, officiant, notes, created_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [churchId, payload.groom_name, payload.bride_name, payload.date_of_marriage,
                payload.place_of_marriage, payload.witnesses, payload.officiant, notes, userEmail]);
            recordId = result.insertId;
          }

        } else if (recordType === 'funeral') {
          if (!payload.deceased_name) {
            commitError = 'deceased_name is required';
            errors.push({ entry_index: draft.entry_index, error: commitError });
          } else {
            const [result] = await db.query(`
              INSERT INTO funeral_records 
                (church_id, deceased_name, date_of_death, date_of_funeral, date_of_burial,
                 place_of_burial, age_at_death, cause_of_death, next_of_kin, officiant, notes, created_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [churchId, payload.deceased_name, payload.date_of_death, payload.date_of_funeral,
                payload.date_of_burial, payload.place_of_burial, payload.age_at_death,
                payload.cause_of_death, payload.next_of_kin, payload.officiant, notes, userEmail]);
            recordId = result.insertId;
          }
        }

        if (recordId) {
          // Update history (best-effort)
          try {
            await db.query(`
              UPDATE ocr_finalize_history 
              SET created_record_id = ?, committed_at = NOW()
              WHERE ocr_job_id = ? AND entry_index = ?
            `, [recordId, jobId, draft.entry_index]);
          } catch (histErr: any) {
            console.warn(`[Review Commit] History update failed for entry ${draft.entry_index} (non-blocking):`, histErr.message);
          }

          // Update DB draft: mark as committed
          await db.query(`
            UPDATE ocr_fused_drafts 
            SET workflow_status = 'committed', committed_record_id = ?, updated_at = NOW()
            WHERE ocr_job_id = ? AND entry_index = ?
          `, [recordId, jobId, draft.entry_index]);

          committed.push({ entry_index: draft.entry_index, record_type: recordType, record_id: recordId });
        }
      } catch (err: any) {
        commitError = err.message;
        console.error(`[Review Commit] DB commit error for entry ${draft.entry_index}:`, err);
        errors.push({ entry_index: draft.entry_index, error: err.message });
      }
    }

    console.log(`[Review Commit] DB commit completed for job ${jobId}: ${committed.length} committed, ${errors.length} errors`);

    // Optional: Write to bundle as artifact (non-blocking)
    try {
      let jobBundleModule;
      try {
        jobBundleModule = require('./utils/jobBundle');
      } catch (e) {
        try {
          jobBundleModule = require('../dist/utils/jobBundle');
        } catch (e2) {
          // Bundle module not available - that's OK
        }
      }
      if (jobBundleModule && jobBundleModule.readDrafts && jobBundleModule.writeDrafts) {
        const draftsFile = await jobBundleModule.readDrafts(churchId, String(jobId));
        for (const commit of committed) {
          const bundleEntry = draftsFile.entries.find(e => e.entry_index === commit.entry_index);
          if (bundleEntry) {
            bundleEntry.workflow_status = 'committed';
            bundleEntry.committed_record_id = commit.record_id;
            bundleEntry.updatedAt = new Date().toISOString();
          }
        }
        for (const err of errors) {
          const bundleEntry = draftsFile.entries.find(e => e.entry_index === err.entry_index);
          if (bundleEntry) {
            bundleEntry.commit_error = err.error;
            bundleEntry.updatedAt = new Date().toISOString();
          }
        }
        await jobBundleModule.writeDrafts(churchId, String(jobId), draftsFile);
        console.log(`[Review Commit] Wrote to bundle as artifact (non-canonical) for job ${jobId}`);
      }
    } catch (bundleError: any) {
      console.warn(`[Review Commit] Bundle write skipped (non-blocking):`, bundleError.message);
    }

    res.json({ success: errors.length === 0, committed, errors, message: `Committed ${committed.length}, ${errors.length} errors` });
  } catch (error: any) {
    console.error('[Review Commit] Error:', error);
    res.status(500).json({ error: 'Failed to commit records', message: error.message });
  }
});

// GET /api/church/:churchId/ocr/finalize-history - Get finalization history
app.get('/api/church/:churchId/ocr/finalize-history', async (req, res) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const { record_type, days = 30, limit = 100 } = req.query;

    const { promisePool } = require('./config/db');
    const [churchRows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) return res.status(404).json({ error: 'Church not found' });

    let dbSwitcherModule;
    try { dbSwitcherModule = require('./utils/dbSwitcher'); } 
    catch (e) { dbSwitcherModule = require('./utils/dbSwitcher'); }
    const db = await dbSwitcherModule.getChurchDbConnection(churchRows[0].database_name);

    let query = `
      SELECT h.*, j.original_filename 
      FROM ocr_finalize_history h
      LEFT JOIN ocr_jobs j ON h.ocr_job_id = j.id
      WHERE h.finalized_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    const params: any[] = [parseInt(days as string) || 30];

    if (record_type && record_type !== 'all') {
      query += ` AND h.record_type = ?`;
      params.push(record_type);
    }

    query += ` ORDER BY h.finalized_at DESC LIMIT ?`;
    params.push(parseInt(limit as string) || 100);

    const [history] = await db.query(query, params);

    res.json({ history });
  } catch (error: any) {
    console.error('[Finalize History] Error:', error);
    res.status(500).json({ error: 'Failed to fetch history', message: error.message, history: [] });
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
