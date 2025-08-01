const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');
const { requireRole } = require('../middleware/auth');

// Filesystem analysis endpoint
router.post('/filesystem', requireRole(['super_admin']), async (req, res) => {
  try {
    console.log('🔍 Starting filesystem analysis...');
    
    const prodPath = path.resolve(__dirname, '../../');
    const results = [];
    
    // Recursive function to scan directories
    async function scanDirectory(dirPath, relativePath = '') {
      try {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dirPath, item.name);
          const relativeFullPath = path.join(relativePath, item.name);
          
          // Skip node_modules, .git, dist, and other build directories
          if (['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(item.name)) {
            continue;
          }
          
          if (item.isDirectory()) {
            // Add directory entry
            const dirStats = await fs.stat(fullPath);
            results.push({
              path: relativeFullPath,
              type: 'directory',
              lastModified: dirStats.mtime.toISOString(),
              lastAccessed: dirStats.atime.toISOString(),
              size: 0,
              isStale: (Date.now() - dirStats.mtime.getTime()) > (60 * 24 * 60 * 60 * 1000) // 60 days
            });
            
            // Recursively scan subdirectory
            await scanDirectory(fullPath, relativeFullPath);
          } else if (item.isFile()) {
            const ext = path.extname(item.name).toLowerCase();
            
            // Filter for relevant file types
            if (['.ts', '.tsx', '.js', '.jsx', '.sql', '.json', '.md'].includes(ext)) {
              const fileStats = await fs.stat(fullPath);
              
              results.push({
                path: relativeFullPath,
                type: 'file',
                extension: ext.substring(1), // Remove leading dot
                lastModified: fileStats.mtime.toISOString(),
                lastAccessed: fileStats.atime.toISOString(),
                size: fileStats.size,
                isStale: (Date.now() - fileStats.mtime.getTime()) > (60 * 24 * 60 * 60 * 1000) // 60 days
              });
            }
          }
        }
      } catch (error) {
        console.warn(`Error scanning directory ${dirPath}:`, error.message);
      }
    }
    
    await scanDirectory(prodPath);
    
    console.log(`✅ Filesystem analysis complete: ${results.length} items found`);
    
    // Calculate summary statistics that frontend expects
    const files = results.filter(item => item.type === 'file');
    const staleFiles = files.filter(file => file.isStale);
    
    const categories = {};
    const extensions = {};
    
    files.forEach(file => {
      // Categorize by path
      if (file.path.includes('front-end')) {
        categories['Frontend'] = (categories['Frontend'] || 0) + 1;
      } else if (file.path.includes('server')) {
        categories['Backend'] = (categories['Backend'] || 0) + 1;
      } else if (file.path.includes('scripts')) {
        categories['Scripts'] = (categories['Scripts'] || 0) + 1;
      } else {
        categories['Other'] = (categories['Other'] || 0) + 1;
      }
      
      // Count extensions
      extensions[file.extension] = (extensions[file.extension] || 0) + 1;
    });
    
    res.json({
      success: true,
      summary: {
        totalFiles: files.length,
        staleFiles: staleFiles.length,
        categories,
        extensions
      },
      data: results.sort((a, b) => a.path.localeCompare(b.path)),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Filesystem analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Menu audit endpoint
router.post('/menu-audit', requireRole(['super_admin']), async (req, res) => {
  try {
    console.log('📋 Starting menu audit...');
    
    const menuItems = [];
    
    // Mock menu data - in a real implementation, this would scan actual menu files
    // You would scan files like:
    // - front-end/src/layouts/full/vertical/sidebar/MenuItems.ts
    // - front-end/src/layouts/full/horizontal/navbar/MenuItems.ts
    // - front-end/src/layouts/full/shared/quicklinks/QuickLinks.ts
    
    const mockVerticalMenu = [
      { id: 'dashboard', title: 'Dashboard', route: '/dashboard', roles: ['admin', 'super_admin'], menuType: 'vertical' },
      { id: 'users', title: 'User Management', route: '/admin/users', roles: ['super_admin'], menuType: 'vertical' },
      { id: 'churches', title: 'Churches', route: '/admin/churches', roles: ['super_admin'], menuType: 'vertical' },
      { id: 'records', title: 'Records', route: '/records', roles: ['admin', 'super_admin', 'user'], menuType: 'vertical' },
      { id: 'bigbook', title: 'Big Book', route: '/admin/bigbook', roles: ['super_admin', 'admin'], menuType: 'vertical' },
      { id: 'survey', title: 'Site Survey', route: '/admin/tools/survey', roles: ['super_admin'], menuType: 'vertical' }
    ];
    
    const mockHorizontalMenu = [
      { id: 'home', title: 'Home', route: '/', roles: ['public'], menuType: 'horizontal' },
      { id: 'about', title: 'About', route: '/about', roles: ['public'], menuType: 'horizontal' },
      { id: 'contact', title: 'Contact', route: '/contact', roles: ['public'], menuType: 'horizontal' }
    ];
    
    const mockQuickLinks = [
      { id: 'profile', title: 'My Profile', route: '/profile', roles: ['user', 'admin', 'super_admin'], menuType: 'quicklinks' },
      { id: 'settings', title: 'Settings', route: '/settings', roles: ['admin', 'super_admin'], menuType: 'quicklinks' }
    ];
    
    // Get all users to determine visibility
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'orthodoxmetrics_db'
    });
    
    const [users] = await connection.execute(
      'SELECT id, email, first_name, last_name, role FROM users WHERE is_active = 1'
    );
    
    await connection.end();
    
    // Process all menu items
    [...mockVerticalMenu, ...mockHorizontalMenu, ...mockQuickLinks].forEach(item => {
      const visibleToUsers = users
        .filter(user => item.roles.includes(user.role) || item.roles.includes('public'))
        .map(user => user.email);
      
      menuItems.push({
        ...item,
        isOrphaned: visibleToUsers.length === 0 && !item.roles.includes('public'),
        visibleToUsers
      });
    });
    
    console.log(`✅ Menu audit complete: ${menuItems.length} menu items analyzed`);
    
    // Calculate summary statistics for frontend
    const menuTypes = {};
    const orphanedCount = menuItems.filter(item => item.isOrphaned).length;
    
    menuItems.forEach(item => {
      menuTypes[item.menuType] = (menuTypes[item.menuType] || 0) + 1;
    });
    
    res.json({
      success: true,
      summary: {
        totalItems: menuItems.length,
        orphanedRoutes: orphanedCount,
        menuTypes
      },
      data: menuItems,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Menu audit error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// User roles analysis endpoint
router.post('/user-roles', requireRole(['super_admin']), async (req, res) => {
  try {
    console.log('👥 Starting user role analysis...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'orthodoxmetrics_db'
    });
    
    // Get all users with their roles
    const [users] = await connection.execute(`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.created_at,
        u.last_login
      FROM users u 
      WHERE u.is_active = 1
      ORDER BY u.created_at DESC
    `);
    
    await connection.end();
    
    // Process user data
    const userRoleData = users.map(user => {
      const isTestUser = /test\d+@example\.com/.test(user.email) || user.email.includes('test');
      
      // Mock menu visibility - in real implementation, calculate based on role permissions
      const visibleMenuItems = [];
      if (user.role === 'super_admin') {
        visibleMenuItems.push('dashboard', 'users', 'churches', 'records', 'bigbook', 'survey', 'profile', 'settings');
      } else if (user.role === 'admin') {
        visibleMenuItems.push('dashboard', 'records', 'bigbook', 'profile', 'settings');
      } else if (user.role === 'user') {
        visibleMenuItems.push('records', 'profile');
      }
      
      return {
        userId: user.id,
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown',
        roles: [user.role], // Convert single role to array for consistency
        visibleMenuItems,
        isTestUser
      };
    });
    
    console.log(`✅ User role analysis complete: ${userRoleData.length} users analyzed`);
    
    // Calculate summary statistics for frontend
    const roleCount = {};
    const testUserCount = userRoleData.filter(user => user.isTestUser).length;
    
    userRoleData.forEach(user => {
      user.roles.forEach(role => {
        roleCount[role] = (roleCount[role] || 0) + 1;
      });
    });
    
    res.json({
      success: true,
      summary: {
        totalUsers: userRoleData.length,
        testUsers: testUserCount,
        roleDistribution: roleCount
      },
      data: userRoleData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('User role analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Database analysis endpoint  
router.post('/database-analysis', requireRole(['super_admin']), async (req, res) => {
  try {
    console.log('🗄️ Starting database analysis...');
    
    const { host, username, password, databases } = req.body;
    
    // If no credentials provided, return mock data for demo purposes
    if (!username || !password) {
      console.log('📊 Returning mock database analysis (no credentials provided)');
      return res.json({
        success: true,
        data: {
          databases: ['orthodoxmetrics_db', 'church_db', 'test_db'],
          tables: {
            'orthodoxmetrics_db': [
              { name: 'users', rows: 15, size: '2.3 MB', created: '2025-01-01' },
              { name: 'churches', rows: 8, size: '1.1 MB', created: '2025-01-01' },
              { name: 'activity_logs', rows: 1250, size: '5.7 MB', created: '2025-01-01' }
            ],
            'church_db': [
              { name: 'baptism_records', rows: 150, size: '12.4 MB', created: '2024-12-01' },
              { name: 'marriage_records', rows: 89, size: '8.2 MB', created: '2024-12-01' },
              { name: 'funeral_records', rows: 67, size: '6.1 MB', created: '2024-12-01' }
            ]
          },
          duplicateTables: ['users', 'sessions'],
          staleTables: ['temp_uploads', 'cache_data'],
          userRoleMappings: []
        }
      });
    }
    
    const connection = await mysql.createConnection({
      host: host || 'localhost',
      user: username,
      password: password
    });
    
    // Get list of databases
    const [dbList] = await connection.execute('SHOW DATABASES');
    const targetDatabases = databases.split(',').map(db => db.trim());
    const availableDatabases = dbList
      .map(row => row.Database)
      .filter(db => targetDatabases.includes(db));
    
    const databaseAnalysis = {
      databases: availableDatabases,
      tables: {},
      duplicateTables: [],
      staleTables: [],
      userRoleMappings: []
    };
    
    // Analyze each database
    for (const dbName of availableDatabases) {
      await connection.execute(`USE \`${dbName}\``);
      
      // Get table information
      const [tables] = await connection.execute(`
        SELECT 
          TABLE_NAME as name,
          TABLE_ROWS as rows,
          ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as size_mb,
          CREATE_TIME as created
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME
      `, [dbName]);
      
      databaseAnalysis.tables[dbName] = tables.map(table => ({
        name: table.name,
        rows: table.rows,
        size: table.size_mb ? `${table.size_mb} MB` : 'N/A',
        created: table.created ? table.created.toISOString().split('T')[0] : 'N/A'
      }));
    }
    
    // Find duplicate tables across databases
    const allTableNames = [];
    Object.values(databaseAnalysis.tables).forEach(tables => {
      tables.forEach(table => allTableNames.push(table.name));
    });
    
    const tableCountMap = {};
    allTableNames.forEach(name => {
      tableCountMap[name] = (tableCountMap[name] || 0) + 1;
    });
    
    databaseAnalysis.duplicateTables = Object.keys(tableCountMap)
      .filter(name => tableCountMap[name] > 1);
    
    // Mock stale tables (tables with no recent activity)
    databaseAnalysis.staleTables = Object.values(databaseAnalysis.tables)
      .flat()
      .filter(table => {
        if (table.created === 'N/A') return false;
        const createdDate = new Date(table.created);
        const monthsOld = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return monthsOld > 12 && (table.rows === 0 || table.rows === null);
      })
      .map(table => table.name);
    
    await connection.end();
    
    console.log(`✅ Database analysis complete: ${availableDatabases.length} databases analyzed`);
    
    res.json({
      success: true,
      data: databaseAnalysis
    });
    
  } catch (error) {
    console.error('Database analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start crawler endpoint
router.post('/start-crawler', requireRole(['super_admin']), async (req, res) => {
  try {
    const { crawlerId, userEmail, password, concurrentPages } = req.body;
    
    console.log(`🕷️ Starting crawler ${crawlerId} for user ${userEmail}`);
    
    // In a real implementation, this would:
    // 1. Launch a Puppeteer instance
    // 2. Login with the test user credentials
    // 3. Navigate through key pages
    // 4. Log errors and warnings
    // 5. Use WebSocket to send real-time updates
    
    // Mock response for now
    res.json({
      success: true,
      message: `Crawler ${crawlerId} started successfully`,
      crawlerId,
      status: 'running'
    });
    
    // Mock crawler progress (in real implementation, this would be handled by WebSocket)
    setTimeout(() => {
      console.log(`📊 Crawler ${crawlerId} completed mock run`);
    }, 5000);
    
  } catch (error) {
    console.error('Crawler start error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get crawler status endpoint
router.get('/crawler-status/:crawlerId', requireRole(['super_admin']), async (req, res) => {
  try {
    const { crawlerId } = req.params;
    
    // Mock crawler status - in real implementation, this would check actual crawler state
    res.json({
      success: true,
      data: {
        id: crawlerId,
        status: 'completed',
        pagesVisited: Math.floor(Math.random() * 50) + 10,
        errorsFound: [],
        consoleWarnings: ['Deprecated API warning on /admin/users'],
        currentUrl: '',
        logs: [
          `${new Date().toISOString()} - Crawler ${crawlerId} started`,
          `${new Date().toISOString()} - Logged in successfully`,
          `${new Date().toISOString()} - Navigating to dashboard`,
          `${new Date().toISOString()} - Testing menu navigation`,
          `${new Date().toISOString()} - Crawler completed`
        ]
      }
    });
    
  } catch (error) {
    console.error('Crawler status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export survey results endpoint
router.get('/export/:format', requireRole(['super_admin']), async (req, res) => {
  try {
    const { format } = req.params;
    
    if (!['json', 'csv', 'markdown'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export format'
      });
    }
    
    // This would compile all survey data and return in requested format
    const timestamp = new Date().toISOString();
    const filename = `orthodoxmetrics-survey-${timestamp.split('T')[0]}.${format}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    switch (format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.json({
          timestamp,
          survey: 'Complete survey data would be here',
          format: 'json'
        });
        break;
        
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        res.send('Category,Count,Issues\nFiles,1000,50\nMenus,25,2\nUsers,15,0');
        break;
        
      case 'markdown':
        res.setHeader('Content-Type', 'text/markdown');
        res.send(`# OrthodoxMetrics Survey Report\n\nGenerated: ${new Date().toLocaleString()}\n\n## Summary\n\nSurvey completed successfully.`);
        break;
    }
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 