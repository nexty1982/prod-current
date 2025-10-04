#!/usr/bin/env node

import { glob } from 'glob';
import fs from 'fs';
import path from 'path';

const root = 'UI/modernize/frontend/src';

// Find all TypeScript files
const files = await glob('**/*.{ts,tsx}', {
  cwd: root,
  absolute: true,
  ignore: ['**/node_modules/**']
});

let fixedCount = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  
  // Check if file has duplicate ReactNode imports
  const hasReactNodeInMainImport = /import\s+.*[\s,{]ReactNode[\s,}].*from\s+['"]react['"]/.test(content);
  const hasStandaloneReactNodeImport = /import\s+{\s*ReactNode\s*}\s+from\s+["']react["'];?\s*$/m.test(content);
  
  if (hasReactNodeInMainImport && hasStandaloneReactNodeImport) {
    // Remove standalone ReactNode import
    const fixed = content.replace(/import\s+{\s*ReactNode\s*}\s+from\s+["']react["'];?\s*\n/gm, '');
    
    // Also remove standalone FC import if ReactNode was already imported
    const hasFCInMainImport = /import\s+.*[\s,{]FC[\s,}].*from\s+['"]react['"]/.test(content);
    const hasStandaloneFCImport = /import\s+{\s*FC\s*}\s+from\s+["']react["'];?\s*$/m.test(content);
    
    let finalContent = fixed;
    if (hasFCInMainImport && hasStandaloneFCImport) {
      finalContent = finalContent.replace(/import\s+{\s*FC\s*}\s+from\s+["']react["'];?\s*\n/gm, '');
    }
    
    if (finalContent !== content) {
      fs.writeFileSync(file, finalContent);
      console.log(`Fixed: ${path.relative(process.cwd(), file)}`);
      fixedCount++;
    }
  }
}

console.log(`\nFixed ${fixedCount} files with duplicate ReactNode imports`);
