#!/usr/bin/env node

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname, relative, extname } from 'path';
import { glob } from 'glob';

class ImportUsageAnalyzer {
  constructor() {
    this.rootDir = process.cwd();
    this.frontendDir = join(this.rootDir, 'front-end/src');
    this.importStats = new Map(); // file -> { imports: number, importedBy: Set }
    this.fileContents = new Map();
  }

  async analyze() {
    console.log('📊 Analyzing Import Usage');
    console.log('='.repeat(50));
    console.log(`Analyzing: ${this.frontendDir}`);
    console.log('');

    // Get all source files
    const sourceFiles = await this.getSourceFiles();
    console.log(`Found ${sourceFiles.length} source files to analyze`);
    console.log('');

    // Analyze each file
    await this.analyzeFiles(sourceFiles);

    // Generate report
    await this.generateReport();

    console.log('\n✅ Import usage analysis completed!');
  }

  async getSourceFiles() {
    const pattern = join(this.frontendDir, '**/*.{ts,tsx,js,jsx}');
    const files = await glob(pattern, {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/*.d.ts'
      ]
    });

    return files.filter(file => {
      try {
        const content = readFileSync(file, 'utf8');
        this.fileContents.set(file, content);
        return true;
      } catch {
        return false;
      }
    });
  }

  async analyzeFiles(files) {
    console.log('🔍 Analyzing import patterns...');

    for (const file of files) {
      try {
        await this.analyzeFileImports(file, files);
      } catch (error) {
        console.error(`   ❌ Error analyzing ${file}: ${error.message}`);
      }
    }
  }

  async analyzeFileImports(currentFile, allFiles) {
    const content = this.fileContents.get(currentFile);
    if (!content) return;

    const relativeCurrentFile = relative(this.frontendDir, currentFile);

    // Find all import statements
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    
    let match;
    const imports = new Set();

    // Static imports
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.') || importPath.startsWith('/')) {
        imports.add(importPath);
      }
    }

    // Dynamic imports
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.') || importPath.startsWith('/')) {
        imports.add(importPath);
      }
    }

    // For each import, find the actual file it resolves to
    for (const importPath of imports) {
      const resolvedFile = this.resolveImportPath(importPath, currentFile);
      if (resolvedFile && resolvedFile.startsWith(this.frontendDir)) {
        const relativeResolvedFile = relative(this.frontendDir, resolvedFile);
        
        if (!this.importStats.has(relativeResolvedFile)) {
          this.importStats.set(relativeResolvedFile, {
            imports: 0,
            importedBy: new Set()
          });
        }
        
        this.importStats.get(relativeResolvedFile).imports++;
        this.importStats.get(relativeResolvedFile).importedBy.add(relativeCurrentFile);
      }
    }
  }

  resolveImportPath(importPath, fromFile) {
    if (importPath.startsWith('@/')) {
      // Handle alias imports - assume @ maps to src root
      const aliasPath = importPath.replace('@/', '');
      return join(this.frontendDir, aliasPath);
    }

    if (importPath.startsWith('.')) {
      // Relative import
      const fromDir = dirname(fromFile);
      let resolvedPath = join(fromDir, importPath);

      // Try different extensions
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
      
      for (const ext of extensions) {
        const testPath = resolvedPath + ext;
        if (existsSync(testPath)) {
          return testPath;
        }
      }

      // If no file found, return the path as-is
      return resolvedPath;
    }

    // Absolute path or external module
    return null;
  }

  async generateReport() {
    console.log('\n📊 Generating import usage report...');

    // Sort by import count
    const sortedStats = Array.from(this.importStats.entries())
      .sort((a, b) => b[1].imports - a[1].imports);

    const topImported = sortedStats.slice(0, 50);

    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFilesAnalyzed: this.fileContents.size,
        totalUniqueImportedFiles: this.importStats.size,
        averageImportsPerFile: this.calculateAverageImports()
      },
      topImportedFiles: topImported.map(([file, stats]) => ({
        file,
        importCount: stats.imports,
        importedBy: Array.from(stats.importedBy).slice(0, 10) // Show first 10 importers
      })),
      categories: this.categorizeImports(sortedStats)
    };

    // Write JSON report
    const reportDir = '.om/import-analysis';
    mkdirSync(reportDir, { recursive: true });
    
    writeFileSync(
      join(reportDir, 'import-usage-report.json'),
      JSON.stringify(reportData, null, 2)
    );

    // Write markdown report
    this.writeMarkdownReport(reportData, reportDir);

    console.log(`   📄 Reports written to: ${reportDir}`);
  }

  calculateAverageImports() {
    if (this.importStats.size === 0) return 0;
    const totalImports = Array.from(this.importStats.values())
      .reduce((sum, stats) => sum + stats.imports, 0);
    return Math.round(totalImports / this.importStats.size * 100) / 100;
  }

  categorizeImports(sortedStats) {
    const categories = {
      'components': [],
      'services': [],
      'utils': [],
      'types': [],
      'hooks': [],
      'context': [],
      'api': [],
      'views': [],
      'other': []
    };

    for (const [file, stats] of sortedStats) {
      const category = this.categorizeFile(file);
      categories[category].push({
        file,
        importCount: stats.imports
      });
    }

    // Sort each category by import count
    for (const category in categories) {
      categories[category].sort((a, b) => b.importCount - a.importCount);
    }

    return categories;
  }

  categorizeFile(filePath) {
    const path = filePath.toLowerCase();
    
    if (path.includes('components/')) return 'components';
    if (path.includes('services/')) return 'services';
    if (path.includes('utils/')) return 'utils';
    if (path.includes('types/')) return 'types';
    if (path.includes('hooks/')) return 'hooks';
    if (path.includes('context')) return 'context';
    if (path.includes('api/')) return 'api';
    if (path.includes('views/')) return 'views';
    
    return 'other';
  }

  writeMarkdownReport(data, reportDir) {
    const lines = [];
    
    lines.push('# Import Usage Analysis Report');
    lines.push('');
    lines.push(`**Generated:** ${data.timestamp}`);
    lines.push('');
    
    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Total Files Analyzed:** ${data.summary.totalFilesAnalyzed}`);
    lines.push(`- **Unique Imported Files:** ${data.summary.totalUniqueImportedFiles}`);
    lines.push(`- **Average Imports per File:** ${data.summary.averageImportsPerFile}`);
    lines.push('');

    // Top imported files
    lines.push('## Top 50 Most Imported Files');
    lines.push('');
    lines.push('| Rank | File | Import Count | Top Importers |');
    lines.push('|------|------|--------------|---------------|');
    
    data.topImportedFiles.forEach((item, index) => {
      const importers = item.importedBy.length > 3 
        ? `${item.importedBy.slice(0, 3).join(', ')}... (+${item.importedBy.length - 3} more)`
        : item.importedBy.join(', ');
      
      lines.push(`| ${index + 1} | \`${item.file}\` | ${item.importCount} | ${importers} |`);
    });
    lines.push('');

    // Categories
    lines.push('## Import Usage by Category');
    lines.push('');
    
    for (const [category, files] of Object.entries(data.categories)) {
      if (files.length > 0) {
        lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)} (${files.length} files)`);
        lines.push('');
        
        files.slice(0, 10).forEach((file, index) => {
          lines.push(`${index + 1}. **\`${file.file}\`** - ${file.importCount} imports`);
        });
        
        if (files.length > 10) {
          lines.push(`   ... and ${files.length - 10} more files`);
        }
        lines.push('');
      }
    }

    writeFileSync(
      join(reportDir, 'import-usage-report.md'),
      lines.join('\n')
    );
  }

  displayTopImports(data) {
    console.log('\n🏆 TOP 20 MOST IMPORTED FILES');
    console.log('='.repeat(60));
    
    data.topImportedFiles.slice(0, 20).forEach((item, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${item.file}`);
      console.log(`    📊 ${item.importCount} imports`);
      if (item.importedBy.length > 0) {
        console.log(`    📁 Imported by: ${item.importedBy.slice(0, 3).join(', ')}${item.importedBy.length > 3 ? ` (+${item.importedBy.length - 3} more)` : ''}`);
      }
      console.log('');
    });
  }
}

// Run analysis
const analyzer = new ImportUsageAnalyzer();
analyzer.analyze().catch(console.error);
