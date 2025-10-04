import { Project, SourceFile, ImportDeclaration, ImportSpecifier } from 'ts-morph';
import { glob } from 'glob';
import { join, relative, dirname, extname } from 'path';
import { readFileSync, writeFileSync } from 'fs';

export interface RewriteResult {
  file: string;
  from: string;
  to: string;
  changed: boolean;
  error?: string;
}

export interface RewriteOptions {
  preferAlias?: string;
  strictExtensions?: boolean;
  casePolicy?: string;
}

export class ImportRewriter {
  private frontendRoot: string;
  private project: Project;
  private options: RewriteOptions;
  private tsConfigPath: string;
  private viteConfigPath: string;
  private aliasMap: Map<string, string> = new Map();

  constructor(frontendRoot: string, options: RewriteOptions = {}) {
    this.frontendRoot = frontendRoot;
    this.options = options;
    this.tsConfigPath = join(frontendRoot, 'tsconfig.json');
    this.viteConfigPath = join(frontendRoot, 'vite.config.ts');
    
    // Initialize TypeScript project
    this.project = new Project({
      tsConfigFilePath: this.tsConfigPath,
      skipAddingFilesFromTsConfig: true
    });
    
    this.loadAliasMap();
  }

  private loadAliasMap() {
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

  private fileExists(path: string): boolean {
    try {
      readFileSync(path);
      return true;
    } catch {
      return false;
    }
  }

  async rewriteImports(
    key: string,
    canonicalPath: string,
    outsideFiles: string[]
  ): Promise<RewriteResult[]> {
    console.log(`   🔄 Rewriting imports for ${key}...`);
    
    const results: RewriteResult[] = [];
    
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
          file: sourceFile.getFilePath(),
          from: '',
          to: '',
          changed: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return results;
  }

  private async getSourceFiles(): Promise<SourceFile[]> {
    const pattern = join(this.frontendRoot, 'src/**/*.{ts,tsx,js,jsx}');
    const files = await glob(pattern);
    
    const sourceFiles: SourceFile[] = [];
    
    for (const file of files) {
      try {
        const sourceFile = this.project.addSourceFileAtPath(file);
        sourceFiles.push(sourceFile);
      } catch (error) {
        console.warn(`⚠️  Could not load file: ${file}`);
      }
    }
    
    return sourceFiles;
  }

  private async rewriteImportsInFile(
    sourceFile: SourceFile,
    key: string,
    canonicalPath: string,
    outsideFiles: string[]
  ): Promise<RewriteResult> {
    const filePath = sourceFile.getFilePath();
    const relativePath = relative(this.frontendRoot, filePath);
    let changed = false;
    let fromPath = '';
    let toPath = '';
    
    // Get all import declarations
    const importDeclarations = sourceFile.getImportDeclarations();
    
    for (const importDecl of importDeclarations) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      
      // Check if this import points to any of the outside files
      const matchingOutsideFile = this.findMatchingOutsideFile(
        moduleSpecifier,
        outsideFiles,
        filePath
      );
      
      if (matchingOutsideFile) {
        fromPath = moduleSpecifier;
        toPath = this.calculateNewImportPath(
          canonicalPath,
          filePath,
          moduleSpecifier
        );
        
        // Update the import
        importDecl.setModuleSpecifier(toPath);
        changed = true;
        
        console.log(`     📝 ${relativePath}: ${fromPath} → ${toPath}`);
      }
    }
    
    // Save the file if changed
    if (changed) {
      sourceFile.saveSync();
    }
    
    return {
      file: relativePath,
      from: fromPath,
      to: toPath,
      changed
    };
  }

  private findMatchingOutsideFile(
    moduleSpecifier: string,
    outsideFiles: string[],
    currentFilePath: string
  ): string | null {
    // Check if the module specifier matches any outside file
    for (const outsideFile of outsideFiles) {
      if (this.matchesImport(moduleSpecifier, outsideFile, currentFilePath)) {
        return outsideFile;
      }
    }
    return null;
  }

  private matchesImport(
    moduleSpecifier: string,
    outsideFile: string,
    currentFilePath: string
  ): boolean {
    // Remove file extension for comparison
    const outsideFileNoExt = outsideFile.replace(/\.(ts|tsx|js|jsx)$/, '');
    const moduleSpecNoExt = moduleSpecifier.replace(/\.(ts|tsx|js|jsx)$/, '');
    
    // Check various import patterns
    const patterns = [
      // Direct match
      moduleSpecNoExt === outsideFileNoExt,
      // Relative import match
      this.resolveRelativePath(moduleSpecifier, currentFilePath) === outsideFileNoExt,
      // Alias import match
      this.resolveAliasPath(moduleSpecifier) === outsideFileNoExt
    ];
    
    return patterns.some(Boolean);
  }

  private resolveRelativePath(moduleSpecifier: string, currentFilePath: string): string {
    try {
      const currentDir = dirname(currentFilePath);
      const resolvedPath = join(currentDir, moduleSpecifier);
      return relative(this.frontendRoot, resolvedPath).replace(/\\/g, '/');
    } catch {
      return moduleSpecifier;
    }
  }

  private resolveAliasPath(moduleSpecifier: string): string {
    for (const [alias, path] of this.aliasMap) {
      if (moduleSpecifier.startsWith(alias)) {
        const remainingPath = moduleSpecifier.substring(alias.length);
        return join(path, remainingPath).replace(/\\/g, '/');
      }
    }
    return moduleSpecifier;
  }

  private calculateNewImportPath(
    canonicalPath: string,
    currentFilePath: string,
    originalImport: string
  ): string {
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

  private shouldUseAlias(canonicalPath: string): boolean {
    return canonicalPath.startsWith('features/') && this.options.preferAlias === '@';
  }

  private buildAliasImport(canonicalPath: string): string {
    const alias = this.options.preferAlias || '@';
    return `${alias}/${canonicalPath}`;
  }

  async getImportUsageStats(): Promise<Map<string, number>> {
    const stats = new Map<string, number>();
    const sourceFiles = await this.getSourceFiles();
    
    for (const sourceFile of sourceFiles) {
      const importDeclarations = sourceFile.getImportDeclarations();
      
      for (const importDecl of importDeclarations) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        const count = stats.get(moduleSpecifier) || 0;
        stats.set(moduleSpecifier, count + 1);
      }
    }
    
    return stats;
  }
}
