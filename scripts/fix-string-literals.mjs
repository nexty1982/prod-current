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
  
  // Fix unterminated string literals in import statements
  // Pattern: import Something from "@/path/to/file'; (missing closing quote)
  const unterminatedImportRegex = /import\s+[^'"]*from\s+["']@\/[^'"]*$/gm;
  const matches = content.match(unterminatedImportRegex);
  
  if (matches) {
    for (const match of matches) {
      // Add the missing closing quote
      const fixed = match + "'";
      content = content.replace(match, fixed);
      modified = true;
    }
  }
  
  // Also fix any other unterminated strings that end with '; but are missing quotes
  const unterminatedStringRegex = /import\s+[^'"]*from\s+["']@\/[^'"]*;\s*$/gm;
  const stringMatches = content.match(unterminatedStringRegex);
  
  if (stringMatches) {
    for (const match of stringMatches) {
      // Check if it's actually unterminated
      if (!match.match(/['"]\s*;$/)) {
        const fixed = match.replace(/;\s*$/, "';");
        content = content.replace(match, fixed);
        modified = true;
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`Fixed: ${path.relative(process.cwd(), file)}`);
    fixedCount++;
  }
}

console.log(`\nFixed ${fixedCount} files with unterminated string literals`);
