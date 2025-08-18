/**
 * Orthodox Routes Data Provider
 * Provides route analysis data for the API Routes Viewer component
 */

interface RouteData {
  path: string;
  method: string;
  file: string;
  description?: string;
  domain: string;
  tags: string[];
  references?: {
    total: number;
    frontend: number;
    backend: number;
  };
}

interface RoutesDataset {
  metadata: {
    totalRoutes: number;
    totalReferences: number;
    avgReferences: number;
    unusedRoutes: number;
    highUsageRoutes: number;
  };
  statistics: {
    methodBreakdown: Record<string, number>;
    domainBreakdown: Record<string, number>;
  };
  routes: RouteData[];
}

// Sample routes data based on the OrthodMetrics API structure
const generateRoutesData = (): RoutesDataset => {
  const routes: RouteData[] = [
    // Admin routes
    { path: '/api/admin/users', method: 'GET', file: 'server/routes/admin.js', domain: 'admin', tags: ['users', 'management'], description: 'Get all users' },
    { path: '/api/admin/users/:id', method: 'PUT', file: 'server/routes/admin.js', domain: 'admin', tags: ['users', 'update'], description: 'Update user by ID' },
    { path: '/api/admin/users/:id/toggle-status', method: 'PUT', file: 'server/routes/admin.js', domain: 'admin', tags: ['users', 'status'], description: 'Toggle user status' },
    { path: '/api/admin/components', method: 'GET', file: 'server/routes/admin/components.js', domain: 'admin', tags: ['components', 'system'], description: 'Get system components' },
    { path: '/api/admin/components/:id', method: 'PATCH', file: 'server/routes/admin/components.js', domain: 'admin', tags: ['components', 'toggle'], description: 'Toggle component status' },
    { path: '/api/admin/components/:id/logs', method: 'GET', file: 'server/routes/admin/components.js', domain: 'admin', tags: ['components', 'logs'], description: 'Get component logs' },
    { path: '/api/admin/components/:id/test', method: 'POST', file: 'server/routes/admin/components.js', domain: 'admin', tags: ['components', 'testing'], description: 'Test component health' },
    
    // OMAI routes
    { path: '/api/omai/task-link', method: 'POST', file: 'server/routes/omai.js', domain: 'omai', tags: ['tasks', 'assignment'], description: 'Create task assignment link' },
    { path: '/api/omai/validate-token', method: 'GET', file: 'server/routes/omai.js', domain: 'omai', tags: ['validation', 'tokens'], description: 'Validate task token' },
    { path: '/api/omai/submit-task', method: 'POST', file: 'server/routes/omai.js', domain: 'omai', tags: ['tasks', 'submission'], description: 'Submit task assignment' },
    { path: '/api/omai/task-logs', method: 'GET', file: 'server/routes/omai.js', domain: 'omai', tags: ['tasks', 'logs'], description: 'Get task assignment logs' },
    { path: '/api/omai/task-link/:token', method: 'DELETE', file: 'server/routes/omai.js', domain: 'omai', tags: ['tasks', 'cleanup'], description: 'Delete task link' },
    { path: '/api/omai/memories', method: 'GET', file: 'server/routes/omai/memories.js', domain: 'omai', tags: ['memory', 'management'], description: 'Get OMAI memories' },
    { path: '/api/omai/memories', method: 'POST', file: 'server/routes/omai/memories.js', domain: 'omai', tags: ['memory', 'creation'], description: 'Create OMAI memory' },
    { path: '/api/omai/memories/:id', method: 'PUT', file: 'server/routes/omai/memories.js', domain: 'omai', tags: ['memory', 'update'], description: 'Update OMAI memory' },
    { path: '/api/omai/memories/:id', method: 'DELETE', file: 'server/routes/omai/memories.js', domain: 'omai', tags: ['memory', 'deletion'], description: 'Delete OMAI memory' },
    { path: '/api/omai/learning-progress', method: 'GET', file: 'server/routes/omai.js', domain: 'omai', tags: ['learning', 'progress'], description: 'Get learning progress' },
    { path: '/api/omai/training-sessions', method: 'GET', file: 'server/routes/omai.js', domain: 'omai', tags: ['training', 'sessions'], description: 'Get training sessions' },
    { path: '/api/omai/start-training', method: 'POST', file: 'server/routes/omai.js', domain: 'omai', tags: ['training', 'start'], description: 'Start training session' },
    { path: '/api/omai/ethics-progress', method: 'GET', file: 'server/routes/omai.js', domain: 'omai', tags: ['ethics', 'progress'], description: 'Get ethics progress' },
    { path: '/api/omai/ethical-foundations', method: 'GET', file: 'server/routes/omai.js', domain: 'omai', tags: ['ethics', 'foundations'], description: 'Get ethical foundations' },
    { path: '/api/omai/import-omlearn', method: 'POST', file: 'server/routes/omai.js', domain: 'omai', tags: ['ethics', 'import'], description: 'Import OMLearn responses' },
    
    // OCR routes
    { path: '/api/ocr/upload', method: 'POST', file: 'server/routes/ocr.js', domain: 'ocr', tags: ['upload', 'processing'], description: 'Upload OCR document' },
    { path: '/api/ocr/status/:id', method: 'GET', file: 'server/routes/ocr.js', domain: 'ocr', tags: ['status', 'tracking'], description: 'Get OCR processing status' },
    { path: '/api/ocr/result/:id', method: 'GET', file: 'server/routes/ocr.js', domain: 'ocr', tags: ['results', 'text'], description: 'Get OCR text result' },
    
    // Parish routes
    { path: '/api/parishes/oca/geojson', method: 'GET', file: 'server/routes/parishes.js', domain: 'parishes', tags: ['geojson', 'mapping'], description: 'Get OCA parishes GeoJSON data' },
    { path: '/api/parishes/search', method: 'GET', file: 'server/routes/parishes.js', domain: 'parishes', tags: ['search', 'query'], description: 'Search parishes' },
    
    // BigBook routes  
    { path: '/api/bigbook/execute', method: 'POST', file: 'server/routes/bigbook.js', domain: 'bigbook', tags: ['execution', 'scripts'], description: 'Execute BigBook script' },
    { path: '/api/bigbook/custom-components-registry', method: 'GET', file: 'server/routes/bigbook.js', domain: 'bigbook', tags: ['components', 'registry'], description: 'Get custom components registry' },
    { path: '/api/bigbook/install-tsx-component', method: 'POST', file: 'server/routes/bigbook.js', domain: 'bigbook', tags: ['components', 'installation'], description: 'Install TSX component' },
    { path: '/api/bigbook/parse-tsx-component', method: 'POST', file: 'server/routes/bigbook.js', domain: 'bigbook', tags: ['components', 'parsing'], description: 'Parse TSX component' },
    
    // Settings routes
    { path: '/api/settings/email', method: 'GET', file: 'server/routes/settings.js', domain: 'settings', tags: ['email', 'configuration'], description: 'Get email settings' },
    { path: '/api/settings/email', method: 'POST', file: 'server/routes/settings.js', domain: 'settings', tags: ['email', 'update'], description: 'Update email settings' },
    { path: '/api/settings/email/test', method: 'POST', file: 'server/routes/settings.js', domain: 'settings', tags: ['email', 'testing'], description: 'Test email configuration' },
    
    // Auth routes
    { path: '/api/auth/login', method: 'POST', file: 'server/routes/auth.js', domain: 'auth', tags: ['authentication', 'login'], description: 'User login' },
    { path: '/api/auth/logout', method: 'POST', file: 'server/routes/auth.js', domain: 'auth', tags: ['authentication', 'logout'], description: 'User logout' },
    { path: '/api/auth/register', method: 'POST', file: 'server/routes/auth.js', domain: 'auth', tags: ['authentication', 'registration'], description: 'User registration' },
    { path: '/api/auth/me', method: 'GET', file: 'server/routes/auth.js', domain: 'auth', tags: ['authentication', 'profile'], description: 'Get current user' },
    
    // Content routes
    { path: '/api/content/global-images', method: 'GET', file: 'server/routes/content.js', domain: 'content', tags: ['images', 'global'], description: 'Get global images' },
    { path: '/api/content/global-images', method: 'POST', file: 'server/routes/content.js', domain: 'content', tags: ['images', 'upload'], description: 'Upload global image' },
    { path: '/api/content/global-images/:id', method: 'DELETE', file: 'server/routes/content.js', domain: 'content', tags: ['images', 'deletion'], description: 'Delete global image' }
  ];

  // Calculate statistics
  const methodBreakdown = routes.reduce((acc, route) => {
    acc[route.method] = (acc[route.method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const domainBreakdown = routes.reduce((acc, route) => {
    acc[route.domain] = (acc[route.domain] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalReferences = routes.reduce((sum, route) => sum + (route.references?.total || 10), 0);

  return {
    metadata: {
      totalRoutes: routes.length,
      totalReferences,
      avgReferences: Math.round(totalReferences / routes.length),
      unusedRoutes: 0,
      highUsageRoutes: Math.floor(routes.length * 0.15) // Assume 15% are high usage
    },
    statistics: {
      methodBreakdown,
      domainBreakdown
    },
    routes
  };
};

// Initialize the global data when this module is imported
export const initializeOrthodoxRoutesData = () => {
  if (typeof window !== 'undefined') {
    (window as any).ORTHODOX_ROUTES_DATA = generateRoutesData();
    console.log('🌐 Orthodox Routes Data initialized for API Routes Viewer');
  }
};

// Export the data generator for server-side use
export { generateRoutesData };
export type { RoutesDataset, RouteData };