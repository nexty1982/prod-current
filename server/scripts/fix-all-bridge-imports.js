#!/usr/bin/env node
/**
 * Fix all bridge files to use context detection instead of try-catch fallback
 * This ensures dist/ files never reference src/ at runtime
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const ROOT = path.resolve(__dirname, '..');

function fixBridgeFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Skip if already fixed
  if (content.includes('isDist = __dirname.includes')) {
    return false;
  }
  
  // Pattern 1: Simple bridge files like routes/marriage.js
  // let var; try { var = require('../api/...'); } catch { var = require('../src/api/...'); }
  const simpleBridgePattern = /\/\/ Bridge[^\n]*\n\/\/[^\n]*\nlet\s+(\w+)\s*;\s*try\s*\{\s*\1\s*=\s*require\(['"](\.\.\/)+api\/([^'"]+)['"]\);\s*\}\s*catch\s*\([^)]+\)\s*\{\s*\1\s*=\s*require\(['"](\.\.\/)+src\/api\/([^'"]+)['"]\);\s*\}\s*module\.exports\s*=\s*\1;/gs;
  
  if (simpleBridgePattern.test(content)) {
    content = content.replace(simpleBridgePattern, (match, varName, dots1, module1, dots2, module2) => {
      modified = true;
      return `// Bridge route to api/${module1}.js
// Detects context (dist vs source) and uses appropriate path
const path = require('path');
const isDist = __dirname.includes(path.sep + 'dist' + path.sep);

let ${varName};
if (isDist) {
    ${varName} = require('${dots1}api/${module1}');
} else {
    try {
        ${varName} = require('${dots1}api/${module1}');
    } catch (e) {
        ${varName} = require('${dots2}src/api/${module2}');
    }
}
module.exports = ${varName};`;
    });
  }
  
  // Pattern 2: Inline require patterns (not at top level)
  // try { var = require('../api/...'); } catch { var = require('../src/api/...'); }
  const inlinePattern = /try\s*\{\s*(\w+)\s*=\s*require\(['"](\.\.\/)+api\/([^'"]+)['"]\);\s*\}\s*catch\s*\([^)]+\)\s*\{\s*\1\s*=\s*require\(['"](\.\.\/)+src\/api\/([^'"]+)['"]\);\s*\}/g;
  
  // Only replace if path is already required
  const hasPathRequire = content.includes("const path = require('path')");
  const pathRequire = hasPathRequire ? '' : "const path = require('path');\nconst isDist = __dirname.includes(path.sep + 'dist' + path.sep);\n";
  
  if (inlinePattern.test(content) && hasPathRequire) {
    content = content.replace(inlinePattern, (match, varName, dots1, module1, dots2, module2) => {
      modified = true;
      return `if (isDist) {
        ${varName} = require('${dots1}api/${module1}');
    } else {
        try {
            ${varName} = require('${dots1}api/${module1}');
        } catch (e) {
            ${varName} = require('${dots2}src/api/${module2}');
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
const bridgeFiles = glob.sync('routes/**/*.js', { 
  cwd: ROOT, 
  ignore: ['**/*.backup', '**/*.back', '**/_moduleLoader.js', '**/ocr.js'] 
}).map(f => path.join(ROOT, f));

let fixedCount = 0;
bridgeFiles.forEach(file => {
  if (fixBridgeFile(file)) {
    console.log(`✅ Fixed: ${path.relative(ROOT, file)}`);
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} bridge files`);
