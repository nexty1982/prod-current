#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, dirname, relative } from 'path';
import { glob } from 'glob';

class AuthComponentRefactor {
  constructor() {
    this.rootDir = process.cwd();
    this.sourceDir = join(this.rootDir, 'front-end/src');
    this.targetDir = join(this.rootDir, 'UI/default/main/frontend/src');
    this.movedFiles = [];
    this.updatedImports = [];
  }

  async refactor() {
    console.log('🔐 Refactoring Authentication Components');
    console.log('='.repeat(50));
    console.log(`Source: ${this.sourceDir}`);
    console.log(`Target: ${this.targetDir}`);
    console.log('');

    // Define authentication components to move
    const authComponents = [
      // Views
      'views/authentication',
      'views/authentication/Unauthorized.tsx',
      'views/authentication/auth1',
      'views/authentication/auth2', 
      'views/authentication/authForms',

      // Components
      'components/auth',
      '@om/components/features/auth',

      // Services
      'services/authService.ts',
      'services/authApi.ts',

      // Types
      'types/auth',

      // Utils
      'utils/authErrorHandler.ts',

      // Tools (optional - may want to keep in front-end)
      // 'tools/omtrace/lib/auth.ts',
      // 'tools/omtrace/lib/authReportGenerator.ts',
      // 'tools/omtrace/lib/authAudit.ts'
    ];

    // Move files and directories
    await this.moveAuthComponents(authComponents);

    // Update import statements
    await this.updateImports();

    // Generate report
    await this.generateReport();

    console.log('\n✅ Authentication component refactoring completed!');
  }

  async moveAuthComponents(components) {
    console.log('📁 Moving authentication components...');

    for (const component of components) {
      const sourcePath = join(this.sourceDir, component);
      const targetPath = join(this.targetDir, component);

      if (existsSync(sourcePath)) {
        try {
          // Create target directory if needed
          mkdirSync(dirname(targetPath), { recursive: true });

          if (this.isDirectory(sourcePath)) {
            await this.copyDirectory(sourcePath, targetPath);
            console.log(`   📂 Moved directory: ${component}`);
          } else {
            copyFileSync(sourcePath, targetPath);
            console.log(`   📄 Moved file: ${component}`);
          }

          this.movedFiles.push({
            source: component,
            target: component,
            type: this.isDirectory(sourcePath) ? 'directory' : 'file'
          });

        } catch (error) {
          console.error(`   ❌ Error moving ${component}: ${error.message}`);
        }
      } else {
        console.log(`   ⚠️  Not found: ${component}`);
      }
    }
  }

  async copyDirectory(source, target) {
    // Create target directory
    mkdirSync(target, { recursive: true });
    
    // Get all files and directories recursively
    const items = readdirSync(source);
    
    for (const item of items) {
      const sourcePath = join(source, item);
      const targetPath = join(target, item);
      
      if (this.isDirectory(sourcePath)) {
        // Recursively copy subdirectories
        await this.copyDirectory(sourcePath, targetPath);
      } else {
        // Copy files
        copyFileSync(sourcePath, targetPath);
      }
    }
  }

  isDirectory(path) {
    try {
      const stat = statSync(path);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  async updateImports() {
    console.log('\n🔄 Updating import statements...');

    // Find all files in the target directory that might need import updates
    const targetFiles = await glob(join(this.targetDir, '**/*.{ts,tsx,js,jsx}'));
    
    for (const file of targetFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        const updatedContent = this.updateImportStatements(content, file);
        
        if (content !== updatedContent) {
          writeFileSync(file, updatedContent, 'utf8');
          const relativePath = relative(this.targetDir, file);
          console.log(`   📝 Updated imports in: ${relativePath}`);
          
          this.updatedImports.push(relativePath);
        }
      } catch (error) {
        console.error(`   ❌ Error updating imports in ${file}: ${error.message}`);
      }
    }
  }

  updateImportStatements(content, filePath) {
    let updatedContent = content;
    
    // Update relative imports that point to front-end directory
    const frontEndImportRegex = /from\s+['"]\.\.\/\.\.\/\.\.\/front-end\//g;
    updatedContent = updatedContent.replace(frontEndImportRegex, "from '../../../front-end/");
    
    // Update imports that reference moved auth components
    const authImportPatterns = [
      // Update imports from services/authService
      /from\s+['"]\.\.\/\.\.\/services\/authService['"]/g,
      /from\s+['"]\.\.\/services\/authService['"]/g,
      /from\s+['"]services\/authService['"]/g,
      
      // Update imports from services/authApi  
      /from\s+['"]\.\.\/\.\.\/services\/authApi['"]/g,
      /from\s+['"]\.\.\/services\/authApi['"]/g,
      /from\s+['"]services\/authApi['"]/g,
      
      // Update imports from types/auth
      /from\s+['"]\.\.\/\.\.\/types\/auth['"]/g,
      /from\s+['"]\.\.\/types\/auth['"]/g,
      /from\s+['"]types\/auth['"]/g,
      
      // Update imports from utils/authErrorHandler
      /from\s+['"]\.\.\/\.\.\/utils\/authErrorHandler['"]/g,
      /from\s+['"]\.\.\/utils\/authErrorHandler['"]/g,
      /from\s+['"]utils\/authErrorHandler['"]/g,
      
      // Update imports from components/auth
      /from\s+['"]\.\.\/\.\.\/components\/auth['"]/g,
      /from\s+['"]\.\.\/components\/auth['"]/g,
      /from\s+['"]components\/auth['"]/g,
      
      // Update imports from views/authentication
      /from\s+['"]\.\.\/\.\.\/views\/authentication['"]/g,
      /from\s+['"]\.\.\/views\/authentication['"]/g,
      /from\s+['"]views\/authentication['"]/g
    ];

    for (const pattern of authImportPatterns) {
      updatedContent = updatedContent.replace(pattern, (match) => {
        // Calculate relative path from current file to target
        const currentDir = dirname(relative(this.targetDir, filePath));
        const targetPath = this.calculateRelativePath(currentDir, match);
        return match.replace(/from\s+['"][^'"]*['"]/, `from '${targetPath}'`);
      });
    }

    return updatedContent;
  }

  calculateRelativePath(fromDir, importMatch) {
    // Extract the import path from the match
    const importPath = importMatch.match(/from\s+['"]([^'"]*)['"]/)?.[1];
    if (!importPath) return importMatch;

    // For now, keep the same relative structure
    // This could be enhanced to calculate proper relative paths
    return importPath;
  }

  async generateReport() {
    console.log('\n📊 Generating refactor report...');

    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        filesMoved: this.movedFiles.length,
        importsUpdated: this.updatedImports.length
      },
      movedFiles: this.movedFiles,
      updatedImports: this.updatedImports,
      recommendations: [
        'Review moved authentication components for any remaining import issues',
        'Update any remaining references to authentication services in front-end directory',
        'Test authentication flows to ensure everything works correctly',
        'Consider updating build configurations if needed',
        'Update any documentation that references the old authentication component locations'
      ]
    };

    // Write JSON report
    const reportDir = '.om/auth-refactor';
    mkdirSync(reportDir, { recursive: true });
    
    writeFileSync(
      join(reportDir, 'auth-refactor-report.json'),
      JSON.stringify(reportData, null, 2)
    );

    // Write markdown report
    const markdownReport = this.generateMarkdownReport(reportData);
    writeFileSync(
      join(reportDir, 'auth-refactor-report.md'),
      markdownReport
    );

    console.log(`   📄 Reports written to: ${reportDir}`);
  }

  generateMarkdownReport(data) {
    const lines = [];
    
    lines.push('# Authentication Component Refactor Report');
    lines.push('');
    lines.push(`**Generated:** ${data.timestamp}`);
    lines.push('');
    
    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Files/Directories Moved:** ${data.summary.filesMoved}`);
    lines.push(`- **Files with Updated Imports:** ${data.summary.importsUpdated}`);
    lines.push('');

    // Moved files
    if (data.movedFiles.length > 0) {
      lines.push('## Moved Files and Directories');
      lines.push('');
      for (const file of data.movedFiles) {
        lines.push(`- **${file.type}:** \`${file.source}\` → \`${file.target}\``);
      }
      lines.push('');
    }

    // Updated imports
    if (data.updatedImports.length > 0) {
      lines.push('## Files with Updated Imports');
      lines.push('');
      for (const file of data.updatedImports) {
        lines.push(`- \`${file}\``);
      }
      lines.push('');
    }

    // Recommendations
    lines.push('## Recommendations');
    lines.push('');
    for (const recommendation of data.recommendations) {
      lines.push(`- ${recommendation}`);
    }
    lines.push('');

    return lines.join('\n');
  }
}

// Run refactor
const refactor = new AuthComponentRefactor();
refactor.refactor().catch(console.error);
