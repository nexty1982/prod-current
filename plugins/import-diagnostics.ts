import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

interface ImportDiagnosticsOptions {
  logFile?: string;
  enabled?: boolean;
}

export function importDiagnostics(options: ImportDiagnosticsOptions = {}): Plugin {
  const {
    logFile = '.om/last-build.log',
    enabled = process.env.NODE_ENV === 'development'
  } = options;

  return {
    name: 'import-diagnostics',
    buildStart() {
      if (!enabled) return;
      
      // Ensure log directory exists
      const logDir = path.dirname(logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      // Clear previous log
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
      }
    },
    
    resolveId(id, importer) {
      if (!enabled || !importer) return null;
      
      // Only log unresolved imports (not node_modules)
      if (id.startsWith('.') || id.startsWith('/') || id.startsWith('@/') || id.startsWith('src/')) {
        // This is a potential unresolved import
        // We'll log it in the buildEnd hook since we can't determine resolution here
        return null;
      }
      
      return null;
    },
    
    buildEnd(error) {
      if (!enabled) return;
      
      const logEntries: string[] = [];
      logEntries.push(`# Import Diagnostics Log`);
      logEntries.push(`# Generated: ${new Date().toISOString()}`);
      logEntries.push(`# Build Status: ${error ? 'FAILED' : 'SUCCESS'}`);
      logEntries.push('');
      
      if (error) {
        logEntries.push(`## Build Error:`);
        logEntries.push(`\`\`\``);
        logEntries.push(error.message);
        logEntries.push(`\`\`\``);
        logEntries.push('');
      }
      
      // Write log file
      try {
        fs.writeFileSync(logFile, logEntries.join('\n'), 'utf-8');
      } catch (err) {
        console.warn('Failed to write import diagnostics log:', err);
      }
    }
  };
}

export default importDiagnostics;
