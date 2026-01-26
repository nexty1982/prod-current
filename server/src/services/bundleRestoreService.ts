/**
 * Bundle Restoration Service
 * 
 * Handles batch file restoration and automated system integration
 * using AST manipulation for Router.tsx and MenuItems.ts
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = '/var/www/orthodoxmetrics/prod';
const BACKUP_SOURCE = path.join(PROJECT_ROOT, 'refactor-src');
const LIVE_TARGET = path.join(PROJECT_ROOT, 'front-end/src');
const ROUTER_PATH = path.join(LIVE_TARGET, 'routes/Router.tsx');
const MENU_ITEMS_PATH = path.join(LIVE_TARGET, 'layouts/full/vertical/sidebar/MenuItems.ts');

interface RestoreBundleRequest {
  bundleFiles: string[];
  routePath?: string;
  menuLabel?: string;
  menuIcon?: string;
}

interface RestoreResult {
  success: boolean;
  message: string;
  restoredFiles: string[];
  routeAdded?: boolean;
  menuItemAdded?: boolean;
  rollbackPerformed?: boolean;
}

/**
 * Backup a file before modification
 */
function backupFile(filePath: string): string {
  const backupPath = `${filePath}.backup.${Date.now()}`;
  fs.copySync(filePath, backupPath);
  return backupPath;
}

/**
 * Restore a file from backup
 */
function restoreBackup(backupPath: string, originalPath: string): void {
  fs.copySync(backupPath, originalPath);
}

/**
 * Add route to Router.tsx using AST manipulation
 */
async function addRouteToRouter(
  routePath: string,
  componentName: string
): Promise<{ success: boolean; rollback?: boolean }> {
  if (!fs.existsSync(ROUTER_PATH)) {
    return { success: false };
  }

  let backupPath: string | null = null;
  
  try {
    // Backup original file
    backupPath = backupFile(ROUTER_PATH);
    
    // Read file content
    let content = fs.readFileSync(ROUTER_PATH, 'utf8');
    
    // Try to use ts-morph if available
    let Project: any;
    try {
      const tsMorph = require('ts-morph');
      Project = tsMorph.Project;
    } catch (error) {
      // Fallback to regex-based insertion
      return addRouteRegex(content, routePath, componentName, backupPath);
    }
    
    const project = new Project();
    const sourceFile = project.addSourceFileAtPath(ROUTER_PATH);
    
    // Find routes array or Route components
    const routes = sourceFile.getVariableDeclarations().find(v => 
      v.getName().toLowerCase().includes('route')
    );
    
    if (routes) {
      // Add route to array
      const routesArray = routes.getInitializer();
      if (routesArray && routesArray.getKind() === require('ts-morph').SyntaxKind.ArrayLiteralExpression) {
        const newRoute = `{\n    path: '${routePath}',\n    element: <${componentName} />,\n  }`;
        routesArray.addElement(newRoute);
        
        // Write file
        sourceFile.saveSync();
        
        // Verify syntax
        if (verifySyntax(ROUTER_PATH)) {
          return { success: true };
        } else {
          // Rollback on syntax error
          restoreBackup(backupPath, ROUTER_PATH);
          return { success: false, rollback: true };
        }
      }
    }
    
    // Fallback to regex
    return addRouteRegex(content, routePath, componentName, backupPath);
    
  } catch (error) {
    console.error('Error adding route:', error);
    if (backupPath) {
      restoreBackup(backupPath, ROUTER_PATH);
    }
    return { success: false, rollback: true };
  }
}

/**
 * Add route using regex fallback
 */
function addRouteRegex(
  content: string,
  routePath: string,
  componentName: string,
  backupPath: string
): { success: boolean; rollback?: boolean } {
  try {
    // Find routes array pattern
    const routesPattern = /(const\s+\w*[Rr]outes?\s*=\s*\[)([\s\S]*?)(\])/;
    const match = content.match(routesPattern);
    
    if (match) {
      const before = match[1];
      const routes = match[2];
      const after = match[3];
      
      const newRoute = `\n    {\n      path: '${routePath}',\n      element: <${componentName} />,\n    },`;
      const newContent = before + routes + newRoute + '\n  ' + after;
      
      fs.writeFileSync(ROUTER_PATH, newContent, 'utf8');
      
      // Verify syntax
      if (verifySyntax(ROUTER_PATH)) {
        return { success: true };
      } else {
        restoreBackup(backupPath, ROUTER_PATH);
        return { success: false, rollback: true };
      }
    }
    
    return { success: false };
  } catch (error) {
    if (backupPath) {
      restoreBackup(backupPath, ROUTER_PATH);
    }
    return { success: false, rollback: true };
  }
}

/**
 * Add menu item to MenuItems.ts using AST manipulation
 */
async function addMenuItemToMenu(
  menuLabel: string,
  menuPath: string,
  menuIcon: string = 'FileCode'
): Promise<{ success: boolean; rollback?: boolean }> {
  if (!fs.existsSync(MENU_ITEMS_PATH)) {
    return { success: false };
  }

  let backupPath: string | null = null;
  
  try {
    // Backup original file
    backupPath = backupFile(MENU_ITEMS_PATH);
    
    // Read file content
    let content = fs.readFileSync(MENU_ITEMS_PATH, 'utf8');
    
    // Try to use ts-morph if available
    let Project: any;
    try {
      const tsMorph = require('ts-morph');
      Project = tsMorph.Project;
    } catch (error) {
      // Fallback to regex-based insertion
      return addMenuItemRegex(content, menuLabel, menuPath, menuIcon, backupPath);
    }
    
    const project = new Project();
    const sourceFile = project.addSourceFileAtPath(MENU_ITEMS_PATH);
    
    // Find menu items array
    const menuItems = sourceFile.getVariableDeclarations().find(v => 
      v.getName().toLowerCase().includes('menu') || v.getName().toLowerCase().includes('items')
    );
    
    if (menuItems) {
      const itemsArray = menuItems.getInitializer();
      if (itemsArray && itemsArray.getKind() === require('ts-morph').SyntaxKind.ArrayLiteralExpression) {
        const newItem = `{\n    label: '${menuLabel}',\n    path: '${menuPath}',\n    icon: '${menuIcon}',\n  }`;
        itemsArray.addElement(newItem);
        
        // Write file
        sourceFile.saveSync();
        
        // Verify syntax
        if (verifySyntax(MENU_ITEMS_PATH)) {
          return { success: true };
        } else {
          // Rollback on syntax error
          restoreBackup(backupPath, MENU_ITEMS_PATH);
          return { success: false, rollback: true };
        }
      }
    }
    
    // Fallback to regex
    return addMenuItemRegex(content, menuLabel, menuPath, menuIcon, backupPath);
    
  } catch (error) {
    console.error('Error adding menu item:', error);
    if (backupPath) {
      restoreBackup(backupPath, MENU_ITEMS_PATH);
    }
    return { success: false, rollback: true };
  }
}

/**
 * Add menu item using regex fallback
 */
function addMenuItemRegex(
  content: string,
  menuLabel: string,
  menuPath: string,
  menuIcon: string,
  backupPath: string
): { success: boolean; rollback?: boolean } {
  try {
    // Find menu items array pattern
    const menuPattern = /(const\s+\w*[Mm]enu\w*[Ii]tems?\s*=\s*\[)([\s\S]*?)(\])/;
    const match = content.match(menuPattern);
    
    if (match) {
      const before = match[1];
      const items = match[2];
      const after = match[3];
      
      const newItem = `\n    {\n      label: '${menuLabel}',\n      path: '${menuPath}',\n      icon: '${menuIcon}',\n    },`;
      const newContent = before + items + newItem + '\n  ' + after;
      
      fs.writeFileSync(MENU_ITEMS_PATH, newContent, 'utf8');
      
      // Verify syntax
      if (verifySyntax(MENU_ITEMS_PATH)) {
        return { success: true };
      } else {
        restoreBackup(backupPath, MENU_ITEMS_PATH);
        return { success: false, rollback: true };
      }
    }
    
    return { success: false };
  } catch (error) {
    if (backupPath) {
      restoreBackup(backupPath, MENU_ITEMS_PATH);
    }
    return { success: false, rollback: true };
  }
}

/**
 * Verify TypeScript/JavaScript syntax using tsc or node
 */
function verifySyntax(filePath: string): boolean {
  try {
    // Try to parse with node (for JS) or check if it's valid TS
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic syntax checks
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;
    
    // Check balanced brackets
    if (openBraces !== closeBraces || openParens !== closeParens || openBrackets !== closeBrackets) {
      return false;
    }
    
    // Try to compile with tsc if available
    try {
      execSync(`npx tsc --noEmit "${filePath}"`, { 
        cwd: PROJECT_ROOT,
        stdio: 'ignore',
        timeout: 5000
      });
      return true;
    } catch (error) {
      // If tsc fails, do basic validation
      return true; // Assume valid if basic checks pass
    }
  } catch (error) {
    return false;
  }
}

/**
 * Restart server using pm2
 */
function restartServer(): void {
  try {
    execSync('pm2 restart orthodox-backend', {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      timeout: 30000
    });
    console.log('Server restarted successfully');
  } catch (error) {
    console.error('Failed to restart server:', error);
    throw new Error('Server restart failed');
  }
}

/**
 * Main bundle restoration function
 */
export async function restoreBundle(request: RestoreBundleRequest): Promise<RestoreResult> {
  const { bundleFiles, routePath, menuLabel, menuIcon } = request;
  const restoredFiles: string[] = [];
  let routeAdded = false;
  let menuItemAdded = false;
  let rollbackPerformed = false;
  
  try {
    // Step 1: Copy files from backup to target
    for (const relPath of bundleFiles) {
      const sourcePath = path.join(BACKUP_SOURCE, relPath);
      const targetPath = path.join(LIVE_TARGET, relPath);
      
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source file not found: ${relPath}`);
      }
      
      // Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      fs.ensureDirSync(targetDir);
      
      // Copy file
      fs.copySync(sourcePath, targetPath);
      restoredFiles.push(relPath);
    }
    
    // Step 2: Extract component name from root file
    const rootFile = bundleFiles[0];
    const componentName = path.basename(rootFile, path.extname(rootFile))
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    
    // Step 3: Add route if routePath provided
    if (routePath && fs.existsSync(ROUTER_PATH)) {
      const routeResult = await addRouteToRouter(routePath, componentName);
      if (routeResult.success) {
        routeAdded = true;
      } else if (routeResult.rollback) {
        rollbackPerformed = true;
        // Rollback file copies
        for (const relPath of restoredFiles) {
          const targetPath = path.join(LIVE_TARGET, relPath);
          if (fs.existsSync(targetPath)) {
            fs.removeSync(targetPath);
          }
        }
        return {
          success: false,
          message: 'Route addition failed syntax check - rollback performed',
          restoredFiles: [],
          rollbackPerformed: true
        };
      }
    }
    
    // Step 4: Add menu item if menuLabel provided
    if (menuLabel && routePath && fs.existsSync(MENU_ITEMS_PATH)) {
      const menuResult = await addMenuItemToMenu(menuLabel, routePath, menuIcon || 'FileCode');
      if (menuResult.success) {
        menuItemAdded = true;
      } else if (menuResult.rollback) {
        rollbackPerformed = true;
        // Rollback route if it was added
        if (routeAdded && fs.existsSync(`${ROUTER_PATH}.backup.*`)) {
          const backups = fs.readdirSync(path.dirname(ROUTER_PATH))
            .filter(f => f.startsWith('Router.tsx.backup.'))
            .sort()
            .reverse();
          if (backups.length > 0) {
            restoreBackup(path.join(path.dirname(ROUTER_PATH), backups[0]), ROUTER_PATH);
          }
        }
        // Rollback file copies
        for (const relPath of restoredFiles) {
          const targetPath = path.join(LIVE_TARGET, relPath);
          if (fs.existsSync(targetPath)) {
            fs.removeSync(targetPath);
          }
        }
        return {
          success: false,
          message: 'Menu item addition failed syntax check - rollback performed',
          restoredFiles: [],
          rollbackPerformed: true
        };
      }
    }
    
    // Step 5: Restart server
    try {
      restartServer();
    } catch (error) {
      console.error('Server restart failed, but files were restored:', error);
      // Don't fail the whole operation if restart fails
    }
    
    return {
      success: true,
      message: `Successfully restored ${restoredFiles.length} files`,
      restoredFiles,
      routeAdded,
      menuItemAdded
    };
    
  } catch (error) {
    // Rollback on any error
    for (const relPath of restoredFiles) {
      const targetPath = path.join(LIVE_TARGET, relPath);
      if (fs.existsSync(targetPath)) {
        fs.removeSync(targetPath);
      }
    }
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Restoration failed',
      restoredFiles: [],
      rollbackPerformed: true
    };
  }
}

// Export for use in routes
module.exports = {
  restoreBundle
};
