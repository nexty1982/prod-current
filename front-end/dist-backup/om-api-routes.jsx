import React, { useState, useMemo } from 'react';
import { Search, Filter, Eye, Code, Database, Users, Globe } from 'lucide-react';

// Parse the route data from the markdown
const parseRouteData = () => {
  const rawData = `❓ 🔗 GET    *
    📁 server/index.js:485
    💬 Catch-all handler: send back React's index.html file for any non-API routes
    🔗 879 references (879 frontend, 0 backend)

❓ 🔗 GET    /
    📁 server/routes/admin/activity-logs.js:7
    💬 Get all activity logs with filtering and pagination
    🔗 1117 references (1 frontend, 1116 backend)

❓ 🔗 POST   /
    📁 server/routes/admin/churches.js:46
    💬 /
    🔗 1117 references (1 frontend, 1116 backend)

❓ 🔗 DELETE /
    📁 server/routes/logs.js:383
    💬 DELETE /api/logs - Clear all logs
    🔗 1117 references (1 frontend, 1116 backend)

❓ 🔗 POST   /:church_id/branding
    📁 server/routes/churchSetupWizard.js:580
    💬 POST /api/churches/:church_id/branding - Save branding settings
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 GET    /:church_id/clergy
    📁 server/routes/churchSetupWizard.js:439
    💬 GET /api/churches/:church_id/clergy - Get clergy members
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 POST   /:church_id/clergy
    📁 server/routes/churchSetupWizard.js:492
    💬 POST /api/churches/:church_id/clergy - Add clergy member
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 DELETE /:church_id/clergy/:clergy_id
    📁 server/routes/churchSetupWizard.js:541
    💬 DELETE /api/churches/:church_id/clergy/:clergy_id - Remove clergy member
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 GET    /:church_id/details
    📁 server/routes/churchSetupWizard.js:343
    💬 GET /api/churches/:church_id/details - Get church details and record counts
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 GET    /:churchId
    📁 server/routes/admin/church-users.js:55
    💬 GET /api/admin/church-users/:churchId - Get users for a specific church
    🔗 7 references (3 frontend, 4 backend)

❓ 🔗 POST   /:churchId
    📁 server/routes/admin/church-users.js:97
    💬 POST /api/admin/church-users/:churchId - Add new user to church
    🔗 7 references (3 frontend, 4 backend)

❓ 🔗 PUT    /:churchId/:userId
    📁 server/routes/admin/church-users.js:160
    💬 PUT /api/admin/church-users/:churchId/:userId - Update church user
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 POST   /:churchId/:userId/lock
    📁 server/routes/admin/church-users.js:294
    💬 POST /api/admin/church-users/:churchId/:userId/lock - Lock user account
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 POST   /:churchId/:userId/reset-password
    📁 server/routes/admin/church-users.js:257
    💬 POST /api/admin/church-users/:churchId/:userId/reset-password - Reset user password
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 POST   /:churchId/:userId/unlock
    📁 server/routes/admin/church-users.js:326
    💬 POST /api/admin/church-users/:churchId/:userId/unlock - Unlock user account
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 GET    /:churchId/health
    📁 server/routes/admin/church-database.js:294
    💬 GET /api/admin/church-database/:churchId/health - Get database health summary
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 GET    /:churchId/info
    📁 server/routes/admin/church-database.js:135
    💬 GET /api/admin/church-database/:churchId/info - Get comprehensive database information
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 GET    /:churchId/record-counts
    📁 server/routes/admin/church-database.js:79
    💬 GET /api/admin/church-database/:churchId/record-counts - Get record counts for church database
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 GET    /:churchId/tables
    📁 server/routes/admin/church-database.js:38
    💬 GET /api/admin/church-database/:churchId/tables - Get available database tables for a church
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 POST   /:churchId/test-connection
    📁 server/routes/admin/church-database.js:215
    💬 POST /api/admin/church-database/:churchId/test-connection - Test database connection and health
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 DELETE /:env/:filename
    📁 server/routes/admin/backups.js:313
    💬 DELETE /api/backups/:env/:filename - Delete a backup
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 DELETE /:filename
    📁 server/routes/uploads.js:157
    💬 DELETE /api/uploads/:filename - Delete an uploaded image
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 DELETE /:friendId
    📁 server/routes/social/friends.js:489
    💬 DELETE /api/social/friends/:friendId - Remove friend
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 GET    /:id
    📁 server/routes/admin/activity-logs.js:138
    💬 Get activity log details by ID
    🔗 189 references (3 frontend, 186 backend)

❓ 🔗 PUT    /:id
    📁 server/routes/admin/churches.js:311
    💬 /
    🔗 189 references (3 frontend, 186 backend)

❓ 🔗 DELETE /:id
    📁 server/routes/admin/churches.js:482
    💬 /
    🔗 189 references (3 frontend, 186 backend)

❓ 🔗 POST   /:id/action
    📁 server/routes/social/notifications.js:306
    💬 POST /api/social/notifications/:id/action - Handle notification actions (accept/decline friend requests, etc.)
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 GET    /:id/comments
    📁 server/routes/kanban/tasks.js:476
    💬 GET /api/kanban/tasks/:id/comments - Get task comments
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 POST   /:id/comments
    📁 server/routes/kanban/tasks.js:421
    💬 POST /api/kanban/tasks/:id/comments - Add comment to task
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 POST   /:id/complete-template-setup
    📁 server/routes/admin/churches.js:162
    💬 /
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 GET    /:id/database-info
    📁 server/routes/admin/churches.js:777
    💬 GET /api/admin/churches/:id/database-info - Get comprehensive database information
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 GET    /:id/debug
    📁 server/routes/admin/churches.js:732
    💬 GET /api/admin/churches/:id/debug - Debug church database connection
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 GET    /:id/download
    📁 server/routes/baptismCertificates.js:174
    💬 GET /api/certificate/baptism/:id/download - Download certificate with custom positions
    🔗 14 references (0 frontend, 14 backend)

❓ 🔗 GET    /:id/export
    📁 server/routes/kanban/boards.js:273
    💬 GET /api/kanban/boards/:id/export - Export board to markdown
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 POST   /:id/generate-pdf
    📁 server/routes/enhancedInvoices.js:787
    💬 POST /api/enhanced-invoices/:id/generate-pdf - Generate PDF
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 POST   /:id/items
    📁 server/routes/enhancedInvoices.js:561
    💬 POST /api/enhanced-invoices/:id/items - Add item to invoice
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 PUT    /:id/mark-paid
    📁 server/routes/invoices.js:582
    💬 PUT /api/invoices/:id/mark-paid - Mark invoice as paid
    🔗 7 references (3 frontend, 4 backend)

❓ 🔗 GET    /:id/markdown
    📁 server/routes/kanban/tasks.js:637
    💬 GET /api/kanban/tasks/:id/markdown - Get markdown content for task
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 POST   /:id/markdown
    📁 server/routes/kanban/tasks.js:572
    💬 POST /api/kanban/tasks/:id/markdown - Upload markdown file for task
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 DELETE /:id/markdown
    📁 server/routes/kanban/tasks.js:674
    💬 DELETE /api/kanban/tasks/:id/markdown - Remove markdown from task
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 PUT    /:id/move
    📁 server/routes/kanban/tasks.js:275
    💬 PUT /api/kanban/tasks/:id/move - Move task to different column/position
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 GET    /:id/overview
    📁 server/routes/admin/church.js:14
    💬 /
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 GET    /:id/pdf
    📁 server/routes/invoices.js:617
    💬 GET /api/invoices/:id/pdf - Generate PDF for invoice
    🔗 7 references (3 frontend, 4 backend)

❓ 🔗 POST   /:id/preview
    📁 server/routes/baptismCertificates.js:136
    💬 POST /api/certificate/baptism/:id/preview - Generate preview with custom field positions
    🔗 14 references (0 frontend, 14 backend)

❓ 🔗 PUT    /:id/read
    📁 server/routes/social/notifications.js:188
    💬 PUT /api/social/notifications/:id/read - Mark notification as read
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 GET    /:id/record-counts
    📁 server/routes/admin/churches.js:942
    💬 GET /api/admin/churches/:id/record-counts - Get record counts for church database
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 GET    /:id/records/:recordType
    📁 server/routes/admin/church.js:28
    💬 /
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 POST   /:id/remove-all-users
    📁 server/routes/admin/churches.js:551
    💬 /
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 POST   /:id/reset-password
    📁 server/routes/admin/church.js:21
    💬 /
    🔗 13 references (0 frontend, 13 backend)

❓ 🔗 GET    /:id/setup-status
    📁 server/routes/admin/churches.js:201
    💬 /
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 POST   /:id/share
    📁 server/routes/notes.js:352
    💬 POST /api/notes/:id/share - Share a note with another user
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 GET    /:id/stats
    📁 server/routes/clients.js:320
    💬 Get client statistics
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 PATCH  /:id/status
    📁 server/routes/admin/churches.js:516
    💬 /
    🔗 7 references (0 frontend, 7 backend)

❓ 🔗 POST   /:id/test-connection
    📁 server/routes/admin/churches.js:859
    💬 POST /api/admin/churches/:id/test-connection - Test database connection and health
    🔗 7 references (0 frontend, 7 backend)

❓ 🔗 GET    /:id/test-connection
    📁 server/routes/clients.js:374
    💬 Test client database connection
    🔗 7 references (0 frontend, 7 backend)

❓ 🔗 PUT    /:id/toggle-status
    📁 server/routes/admin/users.js:475
    💬 PUT /api/admin/users/:id/toggle-status - Toggle user active/inactive status
    🔗 4 references (0 frontend, 4 backend)

❓ 🔗 USE    /api/admin
    📁 server/index.js:289
    💬 General admin routes (AFTER specific routes to prevent conflicts)
    🛡️  Middleware: authenticate
    🔗 75 references (21 frontend, 54 backend)

❓ 🔗 USE    /api/auth
    📁 server/debug/session-persistence-debug.js:97
    🔗 295 references (11 frontend, 284 backend)

❓ 🔗 USE    /api/churches
    📁 server/index.js:244
    💬 Public routes first (no authentication required)
    🔗 29 references (5 frontend, 24 backend)

❓ 🔗 USE    /api/kanban
    📁 server/index.js:294
    💬 Other authenticated routes
    🛡️  Middleware: authenticate
    🔗 10 references (5 frontend, 5 backend)

❓ 🔗 USE    /api/ocr
    📁 server/index.js:327
    💬 OCR and Vision routes
    🔗 16 references (4 frontend, 12 backend)

❓ 🔗 USE    /api/omai
    📁 server/index.js:278
    💬 OM-AI system routes for site-wide AI assistance
    🔗 9 references (4 frontend, 5 backend)

❓ 🔗 USE    /api/social/blog
    📁 server/index.js:304
    💬 Social module routes
    🔗 6 references (1 frontend, 5 backend)

❓ 🔗 USE    /api/social/chat
    📁 server/index.js:306
    💬 Social module routes
    🔗 9 references (4 frontend, 5 backend)

❓ 🔗 USE    /api/social/friends
    📁 server/index.js:305
    💬 Social module routes
    🔗 10 references (5 frontend, 5 backend)

❓ 🔗 GET    /login
    📁 server/routes/auth.js:8
    💬 POST /api/auth/login - User login
    🔗 67 references (17 frontend, 50 backend)

❓ 🔗 POST   /logout
    📁 server/routes/auth.js:130
    💬 POST /api/auth/logout - User logout
    🔗 17 references (4 frontend, 13 backend)

❓ 🔗 GET    /churches
    📁 server/routes/church-scraper.js:77
    💬 Get churches with filtering
    🔗 86 references (5 frontend, 81 backend)

❓ 🔗 POST   /ocr
    📁 server/routes/ocr.js:381
    💬 General OCR processing endpoint
    🔗 38 references (5 frontend, 33 backend)

❓ 🔗 GET    /notifications
    📁 server/routes/notifications.js:491
    💬 Get user notifications
    🔗 10 references (5 frontend, 5 backend)

❓ 🔗 POST   /ask
    📁 server/routes/omai.js:141
    💬 POST /api/omai/ask - Main query execution
    🔗 5 references (4 frontend, 1 backend)

❓ 🔗 GET    /posts
    📁 server/routes/social/blog.js:90
    💬 GET /api/social/blog/posts - Get blog posts with filters
    🔗 37 references (4 frontend, 33 backend)

❓ 🔗 POST   /posts
    📁 server/routes/social/blog.js:333
    💬 POST /api/social/blog/posts - Create new blog post
    🔗 37 references (4 frontend, 33 backend)

❓ 🔗 GET    /conversations
    📁 server/routes/social/chat.js:18
    💬 GET /api/social/chat/conversations - Get user conversations
    🔗 9 references (4 frontend, 5 backend)

❓ 🔗 POST   /conversations
    📁 server/routes/social/chat.js:104
    💬 POST /api/social/chat/conversations - Create new conversation
    🔗 9 references (4 frontend, 5 backend)

❓ 🔗 GET    /requests
    📁 server/routes/social/friends.js:208
    💬 GET /api/social/friends/requests - Get friend requests (sent and received)
    🔗 57 references (4 frontend, 53 backend)`;

  const routes = [];
  const lines = rawData.split('\n');
  
  let currentRoute = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Match route definition line
    const routeMatch = line.match(/❓ 🔗 (\w+)\s+(.*)/);
    if (routeMatch) {
      const [, method, path] = routeMatch;
      currentRoute = {
        method,
        path: path.trim(),
        file: '',
        description: '',
        references: { total: 0, frontend: 0, backend: 0 },
        middleware: []
      };
      routes.push(currentRoute);
      continue;
    }
    
    if (currentRoute) {
      // Match file path
      const fileMatch = line.match(/📁 (.*)/);
      if (fileMatch) {
        currentRoute.file = fileMatch[1];
        continue;
      }
      
      // Match description
      const descMatch = line.match(/💬 (.*)/);
      if (descMatch) {
        currentRoute.description = descMatch[1];
        continue;
      }
      
      // Match middleware
      const middlewareMatch = line.match(/🛡️  Middleware: (.*)/);
      if (middlewareMatch) {
        currentRoute.middleware = middlewareMatch[1].split(',').map(m => m.trim());
        continue;
      }
      
      // Match references
      const refMatch = line.match(/🔗 (\d+) references \((\d+) frontend, (\d+) backend\)/);
      if (refMatch) {
        currentRoute.references = {
          total: parseInt(refMatch[1]),
          frontend: parseInt(refMatch[2]),
          backend: parseInt(refMatch[3])
        };
      }
    }
  }
  
  return routes;
};

const ApiRoutesViewer = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('ALL');
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [expandedSections, setExpandedSections] = useState(new Set());

  const routes = useMemo(() => parseRouteData(), []);

  // Extract domains and methods
  const domains = useMemo(() => {
    const domainSet = new Set();
    routes.forEach(route => {
      const path = route.path;
      if (path.startsWith('/api/')) {
        const parts = path.split('/');
        if (parts[2]) {
          domainSet.add(parts[2].split('-')[0]); // Take first part before dash
        }
      } else if (path !== '*' && path !== '/') {
        domainSet.add('root');
      } else {
        domainSet.add('system');
      }
    });
    return Array.from(domainSet).sort();
  }, [routes]);

  const methods = useMemo(() => {
    const methodSet = new Set(routes.map(r => r.method));
    return Array.from(methodSet).sort();
  }, [routes]);

  // Filter and group routes
  const filteredRoutes = useMemo(() => {
    return routes.filter(route => {
      const matchesSearch = route.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           route.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMethod = selectedMethod === 'ALL' || route.method === selectedMethod;
      
      let matchesDomain = true;
      if (selectedDomain !== 'ALL') {
        const path = route.path;
        if (path.startsWith('/api/')) {
          const parts = path.split('/');
          const domain = parts[2] ? parts[2].split('-')[0] : 'unknown';
          matchesDomain = domain === selectedDomain;
        } else if (path === '*' || path === '/') {
          matchesDomain = selectedDomain === 'system';
        } else {
          matchesDomain = selectedDomain === 'root';
        }
      }
      
      return matchesSearch && matchesMethod && matchesDomain;
    });
  }, [routes, searchTerm, selectedMethod, selectedDomain]);

  // Group routes by domain and method
  const groupedRoutes = useMemo(() => {
    const groups = {};
    
    filteredRoutes.forEach(route => {
      const path = route.path;
      let domain = 'system';
      
      if (path.startsWith('/api/')) {
        const parts = path.split('/');
        domain = parts[2] ? parts[2].split('-')[0] : 'unknown';
      } else if (path !== '*' && path !== '/') {
        domain = 'root';
      }
      
      if (!groups[domain]) {
        groups[domain] = {};
      }
      if (!groups[domain][route.method]) {
        groups[domain][route.method] = [];
      }
      groups[domain][route.method].push(route);
    });
    
    return groups;
  }, [filteredRoutes]);

  const toggleSection = (key) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSections(newExpanded);
  };

  const getMethodColor = (method) => {
    const colors = {
      GET: 'bg-green-100 text-green-800',
      POST: 'bg-blue-100 text-blue-800',
      PUT: 'bg-yellow-100 text-yellow-800',
      PATCH: 'bg-orange-100 text-orange-800',
      DELETE: 'bg-red-100 text-red-800',
      USE: 'bg-purple-100 text-purple-800'
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  const getDomainIcon = (domain) => {
    const icons = {
      admin: Users,
      auth: Globe,
      churches: Database,
      ocr: Eye,
      omai: Code,
      social: Users,
      system: Database
    };
    const Icon = icons[domain] || Database;
    return <Icon className="w-4 h-4" />;
  };

  const totalRoutes = routes.length;
  const totalReferences = routes.reduce((sum, route) => sum + route.references.total, 0);
  const avgReferences = Math.round(totalReferences / totalRoutes);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          OrthodoxMetrics API Routes
        </h1>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="bg-white p-3 rounded-lg shadow">
            <div className="text-gray-500">Total Routes</div>
            <div className="text-2xl font-bold text-blue-600">{totalRoutes}</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow">
            <div className="text-gray-500">Total References</div>
            <div className="text-2xl font-bold text-green-600">{totalReferences.toLocaleString()}</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow">
            <div className="text-gray-500">Avg References</div>
            <div className="text-2xl font-bold text-purple-600">{avgReferences}</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow">
            <div className="text-gray-500">Filtered Results</div>
            <div className="text-2xl font-bold text-orange-600">{filteredRoutes.length}
