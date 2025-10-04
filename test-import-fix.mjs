#!/usr/bin/env node

// Test the specific NotificationContext import fix
import { ImportFixer } from './scripts/lib/import-fixer.js';

const options = {
  root: 'UI/modernize/frontend',
  src: 'src/App.tsx',
  dry: false,
  apply: true,
  createStubs: false,
  preferAlias: false
};

// Create a custom error for the NotificationContext issue
const testError = {
  file: '/var/www/orthodoxmetrics/prod/UI/modernize/frontend/src/App.tsx',
  specifier: './contexts/NotificationContext',
  errorMessage: 'Failed to resolve import "./contexts/NotificationContext"'
};

console.log('Testing NotificationContext import fix...');
console.log('File:', testError.file);
console.log('Current import:', testError.specifier);
console.log('Expected fix: ./context/NotificationContext');

// Run the fixer
const fixer = new ImportFixer(options);
await fixer.run();
