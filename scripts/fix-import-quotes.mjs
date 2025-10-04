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
  let content = fs.readFileSync(file, 'utf-8');
  let modified = false;
  
  // Fix import statements that end with '; but are missing the closing quote
  // Pattern: import Something from "@/path/to/file';
  const lines = content.split('\n');
  const newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Check if this is an import line that ends with '; but is missing closing quote
    if (line.match(/^import\s+.*from\s+["']@\/.*';?\s*$/)) {
      // Check if it's actually unterminated (missing closing quote)
      if (line.includes("';") && !line.match(/["']\s*;$/)) {
        // Fix the unterminated string
        line = line.replace(/';$/, '";');
        modified = true;
      }
    }
    
    // Also fix lines that have double slashes in the path
    if (line.includes('@//')) {
      line = line.replace('@//', '@/');
      modified = true;
    }
    
    newLines.push(line);
  }
  
  if (modified) {
    const newContent = newLines.join('\n');
    fs.writeFileSync(file, newContent);
    console.log(`Fixed: ${path.relative(process.cwd(), file)}`);
    fixedCount++;
  }
}

console.log(`\nFixed ${fixedCount} files with import quote issues`);
