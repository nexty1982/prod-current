#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const root = process.cwd();
const dry = process.argv.includes('--dry');
const apply = process.argv.includes('--apply');

if (!dry && !apply) {
  console.log('Usage: node replace-db-refs-all.js [--dry|--apply]');
  console.log('  --dry   Preview changes without modifying files');
  console.log('  --apply Apply changes to files');
  process.exit(1);
}

// Expanded patterns to include all file types
const patterns = [
  'server/**/*.js',
  'server/**/*.ts',
  'server/**/*.tsx',
  'server/**/*.jsx',
  'server/**/*.sql',
  'server/**/*.sh',
  'server/**/*.md',
  'server/.env*',
  'server/**/.env*'
];

const FROM = 'orthodoxmetrics_auth_db';
const TO = 'orthodoxmetrics_db';

async function main() {
  let allFiles = [];
  
  // Collect files from all patterns
  for (const pattern of patterns) {
    if (!pattern.startsWith('!')) {
      const files = glob.sync(pattern, {
        ignore: ['**/node_modules/**', '**/.archive/**', '**/*.backup', '**/*_old.*'],
        nodir: true,
        dot: true  // Include dotfiles like .env
      });
      allFiles = allFiles.concat(files);
    }
  }
  
  // Remove duplicates
  allFiles = [...new Set(allFiles)];

  let changed = 0;
  let totalHits = 0;
  let changeLog = [];

  for (const file of allFiles) {
    const filePath = path.resolve(file);
    
    // Skip if file doesn't exist or is a directory
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.includes(FROM)) continue;
    
    const matches = (content.match(new RegExp(FROM, 'g')) || []).length;
    totalHits += matches;
    
    const newContent = content.replace(new RegExp(FROM, 'g'), TO);
    
    if (dry) {
      console.log(`\n--- ${file} (${matches} occurrences) ---`);
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.includes(FROM)) {
          console.log(`  Line ${i + 1}: ${line.trim()}`);
        }
      });
      changeLog.push({ file, matches });
    } else if (apply) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      changed++;
      console.log(`✔ Updated ${file} (${matches} replacements)`);
      changeLog.push({ file, matches, status: 'updated' });
    }
  }

  console.log('\n' + '='.repeat(60));
  if (dry) {
    console.log(`PREVIEW: Found ${totalHits} occurrences in ${changeLog.length} files`);
    console.log('Run with --apply to make these changes');
  } else {
    console.log(`SUCCESS: Updated ${changed} files with ${totalHits} total replacements`);
    // Save change log
    const logPath = path.join('ops', 'audit', 'db_refs_changes_all.json');
    fs.writeFileSync(logPath, JSON.stringify(changeLog, null, 2));
    console.log(`Change log saved to ${logPath}`);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
