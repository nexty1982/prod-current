import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export class ReportGenerator {
  constructor(frontendRoot) {
    this.frontendRoot = frontendRoot;
  }

  async generateReports(results, reportDir, isDryRun) {
    // Create report directory
    mkdirSync(reportDir, { recursive: true });
    
    // Generate JSON report
    await this.generateJsonReport(results, reportDir, isDryRun);
    
    // Generate summary report
    await this.generateSummaryReport(results, reportDir, isDryRun);
    
    // Generate detailed report
    await this.generateDetailedReport(results, reportDir, isDryRun);
  }

  async generateJsonReport(results, reportDir, isDryRun) {
    const reportData = {
      timestamp: new Date().toISOString(),
      isDryRun,
      summary: results.stats,
      processed: results.processed,
      errors: results.errors
    };
    
    const fileName = isDryRun ? 'plan.json' : 'applied.json';
    const filePath = join(reportDir, fileName);
    
    writeFileSync(filePath, JSON.stringify(reportData, null, 2));
  }

  async generateSummaryReport(results, reportDir, isDryRun) {
    const lines = [];
    
    lines.push('# Duplicate Refactor Report');
    lines.push('');
    lines.push(`**Mode:** ${isDryRun ? 'Dry Run' : 'Applied'}`);
    lines.push(`**Timestamp:** ${new Date().toISOString()}`);
    lines.push('');
    
    // Summary statistics
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Count |');
    lines.push('|--------|-------|');
    lines.push(`| Total Duplicates | ${results.stats.totalDuplicates} |`);
    lines.push(`| Total Rewrites | ${results.stats.totalRewrites} |`);
    lines.push(`| Files Removed | ${results.stats.totalFilesRemoved} |`);
    lines.push(`| Files Stubbed | ${results.stats.totalFilesStubbed} |`);
    lines.push(`| Errors | ${results.errors.length} |`);
    lines.push('');
    
    // Top duplicates by file count
    const topDuplicates = results.processed
      .sort((a, b) => b.outsideFiles.length - a.outsideFiles.length)
      .slice(0, 10);
    
    if (topDuplicates.length > 0) {
      lines.push('## Top Duplicates by File Count');
      lines.push('');
      lines.push('| Component | Outside Files | Rewrites |');
      lines.push('|-----------|---------------|----------|');
      
      for (const result of topDuplicates) {
        lines.push(`| ${result.key} | ${result.outsideFiles.length} | ${result.rewrites.length} |`);
      }
      lines.push('');
    }
    
    // Errors
    if (results.errors.length > 0) {
      lines.push('## Errors');
      lines.push('');
      for (const error of results.errors) {
        lines.push(`- **${error.key}**: ${error.error}`);
      }
      lines.push('');
    }
    
    const filePath = join(reportDir, 'summary.md');
    writeFileSync(filePath, lines.join('\n'));
  }

  async generateDetailedReport(results, reportDir, isDryRun) {
    const lines = [];
    
    lines.push('# Detailed Duplicate Refactor Report');
    lines.push('');
    lines.push(`**Mode:** ${isDryRun ? 'Dry Run' : 'Applied'}`);
    lines.push(`**Timestamp:** ${new Date().toISOString()}`);
    lines.push('');
    
    // Process each duplicate
    for (const result of results.processed) {
      lines.push(`## ${result.key}`);
      lines.push('');
      lines.push(`**Canonical Path:** \`${result.canonicalPath}\``);
      lines.push(`**Outside Files:** ${result.outsideFiles.length}`);
      lines.push('');
      
      // Outside files
      if (result.outsideFiles.length > 0) {
        lines.push('### Outside Files');
        lines.push('');
        for (const file of result.outsideFiles) {
          lines.push(`- \`${file}\``);
        }
        lines.push('');
      }
      
      // Rewrites
      if (result.rewrites.length > 0) {
        lines.push('### Import Rewrites');
        lines.push('');
        lines.push('| File | From | To | Status |');
        lines.push('|------|------|----|---------|');
        
        for (const rewrite of result.rewrites) {
          const status = rewrite.error ? `❌ ${rewrite.error}` : (rewrite.changed ? '✅ Changed' : '⏭️  No change');
          lines.push(`| \`${rewrite.file}\` | \`${rewrite.from}\` | \`${rewrite.to}\` | ${status} |`);
        }
        lines.push('');
      }
      
      // File system operations
      if (result.fsOps.removed.length > 0 || result.fsOps.stubbed.length > 0) {
        lines.push('### File System Operations');
        lines.push('');
        
        if (result.fsOps.removed.length > 0) {
          lines.push('**Removed Files:**');
          for (const file of result.fsOps.removed) {
            lines.push(`- \`${file}\``);
          }
          lines.push('');
        }
        
        if (result.fsOps.stubbed.length > 0) {
          lines.push('**Stubbed Files:**');
          for (const file of result.fsOps.stubbed) {
            lines.push(`- \`${file}\``);
          }
          lines.push('');
        }
        
        if (result.fsOps.errors.length > 0) {
          lines.push('**Errors:**');
          for (const error of result.fsOps.errors) {
            lines.push(`- ${error}`);
          }
          lines.push('');
        }
      }
      
      lines.push('---');
      lines.push('');
    }
    
    const filePath = join(reportDir, 'detailed.md');
    writeFileSync(filePath, lines.join('\n'));
  }

  generateConsoleSummary(results, isDryRun) {
    console.log('\n📊 REFACTOR SUMMARY');
    console.log('='.repeat(50));
    console.log(`Mode: ${isDryRun ? 'Dry Run' : 'Applied'}`);
    console.log(`Total Duplicates: ${results.stats.totalDuplicates}`);
    console.log(`Total Rewrites: ${results.stats.totalRewrites}`);
    console.log(`Files Removed: ${results.stats.totalFilesRemoved}`);
    console.log(`Files Stubbed: ${results.stats.totalFilesStubbed}`);
    console.log(`Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      for (const error of results.errors) {
        console.log(`   - ${error.key}: ${error.error}`);
      }
    }
    
    // Show top duplicates
    const topDuplicates = results.processed
      .sort((a, b) => b.outsideFiles.length - a.outsideFiles.length)
      .slice(0, 5);
    
    if (topDuplicates.length > 0) {
      console.log('\n🔝 Top Duplicates:');
      for (const result of topDuplicates) {
        console.log(`   - ${result.key}: ${result.outsideFiles.length} outside files, ${result.rewrites.length} rewrites`);
      }
    }
  }
}
