#!/usr/bin/env ts-node

import { runIngestionCLI } from '../services/om-ai/ingest';

/**
 * OM-AI Document Ingestion CLI
 * 
 * This script scans and indexes documents from the OrthodoxMetrics project
 * into the OM-AI embedding database for context-aware AI responses.
 * 
 * Usage:
 *   npm run omai:ingest
 *   npx ts-node scripts/omai-ingest.ts
 */

async function main() {
  console.log('🚀 OM-AI Document Ingestion CLI');
  console.log('================================');
  console.log('');
  
  try {
    await runIngestionCLI();
    console.log('');
    console.log('✅ Ingestion completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Ingestion failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
} 