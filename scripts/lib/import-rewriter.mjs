import { glob } from 'glob';
import { join, relative, dirname, extname } from 'path';
import { readFileSync, writeFileSync } from 'fs';

export class ImportRewriter {
  constructor(frontendRoot, options = {}) {
    this.frontendRoot = frontendRoot;
    this.options = options;
    this.tsConfigPath = join(frontendRoot, 'tsconfig.json');
    this.viteConfigPath = join(frontendRoot, 'vite.config.ts');
    this.aliasMap = new Map();
    
    this.loadAliasMap();
  }

  loadAliasMap() {
    try {
      // Load tsconfig.json for path mapping
      if (this.fileExists(this.tsConfigPath)) {
        const tsConfig = JSON.parse(readFileSync(this.tsConfigPath, 'utf8'));
        const paths = tsConfig.compilerOptions?.paths || {};
        
        for (const [alias, pathArray] of Object.entries(paths)) {
          if (Array.isArray(pathArray) && pathArray.length > 0) {
            const aliasKey = alias.replace('/*', '');
            const pathValue = pathArray[0].replace('/*', '');
            this.aliasMap.set(aliasKey, pathValue);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not load tsconfig.json for alias mapping');
    }
  }

  fileExists(path) {
    try {
      readFileSync(path);
      return true;
    } catch {
      return false;
    }
  }

  async rewriteImports(key, canonicalPath, outsideFiles) {
    console.log(`   🔄 Rewriting imports for ${key}...`);
    
    const results = [];
    
    // Get all source files
    const sourceFiles = await this.getSourceFiles();
    
    for (const sourceFile of sourceFiles) {
      try {
        const result = await this.rewriteImportsInFile(
          sourceFile,
          key,
          canonicalPath,
          outsideFiles
        );
        
        if (result.changed) {
          results.push(result);
        }
      } catch (error) {
        results.push({
          file: sourceFile,
          from: '',
          to: '',
          changed: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return results;
  }

  async getSourceFiles() {
    const pattern = join(this.frontendRoot, 'src/**/*.{ts,tsx,js,jsx}');
    const files = await glob(pattern);
    
    return files;
  }

  async rewriteImportsInFile(sourceFile, key, canonicalPath, outsideFiles) {
    const filePath = sourceFile;
    const relativePath = relative(this.frontendRoot, filePath);
    let changed = false;
    let fromPath = '';
    let toPath = '';
    
    // Read file content
    let content = readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Find and replace imports
    for (const outsideFile of outsideFiles) {
      const outsideFileNoExt = outsideFile.replace(/\.(ts|tsx|js|jsx)$/, '');
      
      // Check various import patterns
      const patterns = [
        // Direct import
        new RegExp(`from\\s+['"]${outsideFileNoExt}['"]`, 'g'),
        // Relative import
        new RegExp(`from\\s+['"]\\./.*${outsideFileNoExt}['"]`, 'g'),
        // Alias import
        new RegExp(`from\\s+['"]@/.*${outsideFileNoExt}['"]`, 'g'),
        // Dynamic import
        new RegExp(`import\\s*\\(\\s*['"]${outsideFileNoExt}['"]`, 'g')
      ];
      
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          fromPath = outsideFileNoExt;
          toPath = this.calculateNewImportPath(canonicalPath, filePath, outsideFileNoExt);
          
          // Replace the import
          content = content.replace(pattern, (match) => {
            return match.replace(outsideFileNoExt, toPath);
          });
          
          changed = true;
          console.log(`     📝 ${relativePath}: ${fromPath} → ${toPath}`);
        }
      }
    }
    
    // Save the file if changed
    if (changed && content !== originalContent) {
      writeFileSync(filePath, content, 'utf8');
    }
    
    return {
      file: relativePath,
      from: fromPath,
      to: toPath,
      changed
    };
  }

  calculateNewImportPath(canonicalPath, currentFilePath, originalImport) {
    const currentDir = dirname(currentFilePath);
    const canonicalDir = dirname(join(this.frontendRoot, canonicalPath));
    
    // Calculate relative path from current file to canonical file
    const relativePath = relative(currentDir, canonicalDir);
    const canonicalFileName = canonicalPath.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || '';
    
    // Determine if we should use alias
    if (this.options.preferAlias && this.shouldUseAlias(canonicalPath)) {
      return this.buildAliasImport(canonicalPath);
    }
    
    // Build relative import
    let newImport = relativePath ? `${relativePath}/${canonicalFileName}` : canonicalFileName;
    
    // Add file extension if needed
    if (this.options.strictExtensions) {
      const ext = extname(canonicalPath);
      if (ext && !newImport.endsWith(ext)) {
        newImport += ext;
      }
    }
    
    // Normalize path separators
    return newImport.replace(/\\/g, '/');
  }

  shouldUseAlias(canonicalPath) {
    return canonicalPath.startsWith('features/') && this.options.preferAlias === '@';
  }

  buildAliasImport(canonicalPath) {
    const alias = this.options.preferAlias || '@';
    return `${alias}/${canonicalPath}`;
  }
}
