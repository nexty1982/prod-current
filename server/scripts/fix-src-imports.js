#!/usr/bin/env node
/**
 * Fix src/ imports in bridge files
 * 
 * Updates all bridge files to try dist paths first, then fall back to src/ paths
 * This ensures dist/ files never reference src/ at runtime
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const ROOT = path.resolve(__dirname, '..');

// Patterns to fix: require('../src/...') or require('../../src/...')
const patterns = [
  {
    // Route bridge files: require('../src/api/...') -> try '../api/...' first
    pattern: /require\(['"](\.\.\/)+src\/(api|utils|services|middleware)\/([^'"]+)['"]\)/g,
    replacement: (match, dots, type, module) => {
      const distPath = `${dots}${type}/${module}`;
      const srcPath = `${dots}src/${type}/${module}`;
      return `(function() {
  try {
    return require('${distPath}');
  } catch (e) {
    try {
      return require('${srcPath}');
    } catch (e2) {
      throw new Error(\`Failed to load ${type}/${module} from both ${distPath} and ${srcPath}: \${e.message}\`);
    }
  }
})()`;
    }
  }
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix require('../src/api/...') patterns
  const apiPattern = /let\s+(\w+)\s*;\s*try\s*\{\s*\1\s*=\s*require\(['"](\.\.\/)+api\/([^'"]+)['"]\);\s*\}\s*catch\s*\([^)]+\)\s*\{\s*\1\s*=\s*require\(['"](\.\.\/)+src\/api\/([^'"]+)['"]\);\s*\}/gs;
  if (apiPattern.test(content)) {
    content = content.replace(apiPattern, (match, varName, dots1, module1, dots2, module2) => {
      modified = true;
      return `let ${varName};
try {
    // Try dist path first (when running from dist/)
    ${varName} = require('${dots1}api/${module1}');
} catch (e) {
    // Fallback to src path (when running from source)
    try {
        ${varName} = require('${dots2}src/api/${module2}');
    } catch (e2) {
        throw new Error(\`Failed to load ${module1} from both ${dots1}api/${module1} and ${dots2}src/api/${module2}: \${e.message}\`);
    }
}`;
    });
  }
  
  // Fix require('../src/utils/...') patterns
  const utilsPattern = /let\s+(\w+)\s*;\s*try\s*\{\s*\1\s*=\s*require\(['"](\.\.\/)+utils\/([^'"]+)['"]\);\s*\}\s*catch\s*\([^)]+\)\s*\{\s*\1\s*=\s*require\(['"](\.\.\/)+src\/utils\/([^'"]+)['"]\);\s*\}/gs;
  if (utilsPattern.test(content)) {
    content = content.replace(utilsPattern, (match, varName, dots1, module1, dots2, module2) => {
      modified = true;
      return `let ${varName};
try {
    // Try dist path first (when running from dist/)
    ${varName} = require('${dots1}utils/${module1}');
} catch (e) {
    // Fallback to src path (when running from source)
    try {
        ${varName} = require('${dots2}src/utils/${module2}');
    } catch (e2) {
        throw new Error(\`Failed to load ${module1} from both ${dots1}utils/${module1} and ${dots2}src/utils/${module2}: \${e.message}\`);
    }
}`;
    });
  }
  
  // Fix require('../src/services/...') patterns
  const servicesPattern = /let\s+(\w+)\s*;\s*try\s*\{\s*\1\s*=\s*require\(['"](\.\.\/)+services\/([^'"]+)['"]\);\s*\}\s*catch\s*\([^)]+\)\s*\{\s*\1\s*=\s*require\(['"](\.\.\/)+src\/services\/([^'"]+)['"]\);\s*\}/gs;
  if (servicesPattern.test(content)) {
    content = content.replace(servicesPattern, (match, varName, dots1, module1, dots2, module2) => {
      modified = true;
      return `let ${varName};
try {
    // Try dist path first (when running from dist/)
    ${varName} = require('${dots1}services/${module1}');
} catch (e) {
    // Fallback to src path (when running from source)
    try {
        ${varName} = require('${dots2}src/services/${module2}');
    } catch (e2) {
        throw new Error(\`Failed to load ${module1} from both ${dots1}services/${module1} and ${dots2}src/services/${module2}: \${e.message}\`);
    }
}`;
    });
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

// Find all bridge files
const bridgeFiles = [
  ...glob.sync('routes/**/*.js', { cwd: ROOT, ignore: ['**/*.backup', '**/*.back'] }),
  ...glob.sync('controllers/**/*.js', { cwd: ROOT }),
  ...glob.sync('middleware/**/*.js', { cwd: ROOT }),
  ...glob.sync('config/*.js', { cwd: ROOT })
].map(f => path.join(ROOT, f));

let fixedCount = 0;
bridgeFiles.forEach(file => {
  if (fixFile(file)) {
    console.log(`✅ Fixed: ${path.relative(ROOT, file)}`);
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} files`);
