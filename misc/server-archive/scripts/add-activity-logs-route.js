#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const routerPath = path.join(__dirname, '../../front-end/src/routes/Router.tsx');

async function addActivityLogsRoute() {
  try {
    console.log('📁 Adding Activity Logs route to Router.tsx...');
    
    // Read current router file
    let routerContent = fs.readFileSync(routerPath, 'utf8');
    
    // Add import for ActivityLogs component
    const importSection = routerContent.indexOf('// Admin');
    if (importSection === -1) {
      console.error('❌ Could not find Admin import section');
      return;
    }
    
    // Find the line after SessionManagement import
    const sessionImportMatch = routerContent.match(/const.*SessionManagement.*import\('\.\.\/views\/admin\/SessionManagement'\)\);/);
    if (!sessionImportMatch) {
      console.log('⚠️ SessionManagement import not found, adding both...');
      
      // Add both imports after the Admin comment
      const adminCommentIndex = routerContent.indexOf('// Admin');
      const nextLineIndex = routerContent.indexOf('\n', adminCommentIndex) + 1;
      
      const newImports = `const SessionManagement = Loadable(lazy(() => import('../views/admin/SessionManagement')));
const ActivityLogs = Loadable(lazy(() => import('../views/admin/ActivityLogs')));
`;
      
      routerContent = routerContent.slice(0, nextLineIndex) + newImports + routerContent.slice(nextLineIndex);
    } else {
      // Add ActivityLogs import after SessionManagement
      const sessionImportEnd = routerContent.indexOf(';', sessionImportMatch.index) + 1;
      const newImport = '\nconst ActivityLogs = Loadable(lazy(() => import(\'../views/admin/ActivityLogs\')));';
      
      routerContent = routerContent.slice(0, sessionImportEnd) + newImport + routerContent.slice(sessionImportEnd);
    }
    
    // Find the routes section and add the new routes
    const routesPattern = /children:\s*\[\s*{[^}]*path:\s*['"]\/admin['"]/;
    const routesMatch = routerContent.match(routesPattern);
    
    if (!routesMatch) {
      console.error('❌ Could not find admin routes section');
      return;
    }
    
    // Find the end of the admin children array
    let adminSectionStart = routesMatch.index;
    let braceCount = 0;
    let i = adminSectionStart;
    
    // Find the children array opening
    while (i < routerContent.length && routerContent.substring(i, i + 8) !== 'children') {
      i++;
    }
    
    // Find the opening bracket of children array
    while (i < routerContent.length && routerContent[i] !== '[') {
      i++;
    }
    i++; // Move past the opening bracket
    
    // Find existing routes to add after
    const sessionRoutePattern = /{\s*path:\s*['"]\/admin\/sessions['"]/;
    const sessionRouteMatch = routerContent.substring(i).match(sessionRoutePattern);
    
    let insertPosition;
    if (sessionRouteMatch) {
      // Find the end of the session route object
      let sessionStart = i + sessionRouteMatch.index;
      let sessionEnd = sessionStart;
      let sessionBraces = 0;
      
      while (sessionEnd < routerContent.length) {
        if (routerContent[sessionEnd] === '{') sessionBraces++;
        if (routerContent[sessionEnd] === '}') {
          sessionBraces--;
          if (sessionBraces === 0) {
            sessionEnd++;
            break;
          }
        }
        sessionEnd++;
      }
      
      // Find the comma after the session route
      while (sessionEnd < routerContent.length && routerContent[sessionEnd] !== ',') {
        sessionEnd++;
      }
      insertPosition = sessionEnd + 1;
    } else {
      // If no session route found, add at the end of children array
      let childrenEnd = i;
      let childrenBraces = 1;
      
      while (childrenEnd < routerContent.length && childrenBraces > 0) {
        if (routerContent[childrenEnd] === '[') childrenBraces++;
        if (routerContent[childrenEnd] === ']') childrenBraces--;
        childrenEnd++;
      }
      insertPosition = childrenEnd - 1; // Before the closing bracket
    }
    
    // Add the routes
    const newRoutes = `
        {
          path: '/admin/sessions',
          element: (
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminErrorBoundary>
                <SessionManagement />
              </AdminErrorBoundary>
            </ProtectedRoute>
          ),
        },
        {
          path: '/admin/activity-logs',
          element: (
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminErrorBoundary>
                <ActivityLogs />
              </AdminErrorBoundary>
            </ProtectedRoute>
          ),
        },`;
    
    routerContent = routerContent.slice(0, insertPosition) + newRoutes + routerContent.slice(insertPosition);
    
    // Write the updated file
    fs.writeFileSync(routerPath, routerContent);
    
    console.log('✅ Successfully added Activity Logs route to Router.tsx');
    console.log('📍 Routes added:');
    console.log('   - /admin/sessions -> SessionManagement component');
    console.log('   - /admin/activity-logs -> ActivityLogs component');
    
  } catch (error) {
    console.error('❌ Error updating Router.tsx:', error.message);
  }
}

// Run the script
addActivityLogsRoute();
