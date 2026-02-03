#!/usr/bin/env npx ts-node
/**
 * sync-tasks.ts — Sync tasks from Markdown files to Google Sheets
 *
 * Usage:
 *   npx ts-node scripts/sync-tasks.ts [markdown-file]
 *   npm run sync-tasks
 *
 * If no file is specified, looks for common task files:
 *   - TASKS.md
 *   - docs/TASKS.md
 *   - TODO.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { googleSheetsService } from '../src/services/googleSheets';

const PROD_DIR = '/var/www/orthodoxmetrics/prod';

// Default task files to look for
const DEFAULT_TASK_FILES = [
  'TASKS.md',
  'docs/TASKS.md',
  'TODO.md',
  'docs/TODO.md',
  'BACKEND_TASKS.md',
  'docs/BACKEND_TASKS.md',
];

async function findTaskFile(): Promise<string | null> {
  for (const file of DEFAULT_TASK_FILES) {
    const fullPath = path.join(PROD_DIR, file);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

async function main(): Promise<void> {
  console.log('🔄 Task Sync Script');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Get markdown file path
  let taskFilePath = process.argv[2];

  if (!taskFilePath) {
    taskFilePath = await findTaskFile() || '';
    if (!taskFilePath) {
      console.log('No task file found. Searched for:');
      DEFAULT_TASK_FILES.forEach((f) => console.log(`  - ${f}`));
      console.log('\nCreate one of these files or specify a path:');
      console.log('  npx ts-node scripts/sync-tasks.ts path/to/tasks.md');
      process.exit(0);
    }
  }

  // Resolve relative paths
  if (!path.isAbsolute(taskFilePath)) {
    taskFilePath = path.join(process.cwd(), taskFilePath);
  }

  if (!fs.existsSync(taskFilePath)) {
    console.error(`❌ File not found: ${taskFilePath}`);
    process.exit(1);
  }

  console.log(`📄 Reading: ${taskFilePath}`);

  // Read markdown content
  const markdownContent = fs.readFileSync(taskFilePath, 'utf-8');

  // Count tasks
  const totalTasks = (markdownContent.match(/^\s*[-*]\s*\[[ xX]\]/gm) || []).length;
  const completedTasks = (markdownContent.match(/^\s*[-*]\s*\[[xX]\]/gm) || []).length;

  console.log(`📊 Found ${totalTasks} tasks (${completedTasks} completed)`);

  // Sync to Google Sheets
  console.log('\n📤 Syncing to Google Sheets...');

  try {
    await googleSheetsService.syncFromMarkdown(markdownContent, 'sync-tasks');
    console.log('\n✅ Sync complete!');
  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
