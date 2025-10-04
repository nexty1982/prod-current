import { readFileSync, writeFileSync, unlinkSync, rmdirSync, existsSync, statSync } from 'fs';
import { join, dirname, relative, extname } from 'path';
import { glob } from 'glob';

export interface FSOpResult {
  removed: string[];
  stubbed: string[];
  errors: string[];
}

export interface FSOpOptions {
  stubReexports?: boolean;
  removeEmpties?: boolean;
  casePolicy?: string;
}

export class FileSystemOps {
  private frontendRoot: string;
  private options: FSOpOptions;

  constructor(frontendRoot: string, options: FSOpOptions = {}) {
    this.frontendRoot = frontendRoot;
    this.options = options;
  }

  async processOutsideFiles(
    key: string,
    canonicalPath: string,
    outsideFiles: string[]
  ): Promise<FSOpResult> {
    console.log(`   🗂️  Processing outside files for ${key}...`);
    
    const result: FSOpResult = {
      removed: [],
      stubbed: [],
      errors: []
    };
    
    for (const outsideFile of outsideFiles) {
      try {
        const fullPath = join(this.frontendRoot, outsideFile);
        
        if (!existsSync(fullPath)) {
          console.log(`     ⚠️  File not found: ${outsideFile}`);
          continue;
        }
        
        if (this.options.stubReexports) {
          await this.createReexportStub(fullPath, canonicalPath, outsideFile);
          result.stubbed.push(outsideFile);
          console.log(`     📝 Created re-export stub: ${outsideFile}`);
        } else {
          this.removeFile(fullPath);
          result.removed.push(outsideFile);
          console.log(`     🗑️  Removed: ${outsideFile}`);
        }
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push(`${outsideFile}: ${errorMsg}`);
        console.error(`     ❌ Error processing ${outsideFile}: ${errorMsg}`);
      }
    }
    
    // Remove empty directories if requested
    if (this.options.removeEmpties) {
      await this.removeEmptyDirectories(outsideFiles);
    }
    
    return result;
  }

  private async createReexportStub(
    filePath: string,
    canonicalPath: string,
    outsideFile: string
  ): Promise<void> {
    const canonicalImportPath = this.calculateImportPath(filePath, canonicalPath);
    const fileExt = extname(filePath);
    const isTypeScript = fileExt === '.ts' || fileExt === '.tsx';
    
    let stubContent = '';
    
    if (isTypeScript) {
      // TypeScript/TSX stub
      stubContent = `// Re-export stub for ${outsideFile}
// This file has been replaced with a re-export from the canonical location

export * from '${canonicalImportPath}';

// Re-export default if it exists
export { default } from '${canonicalImportPath}';
`;
    } else {
      // JavaScript/JSX stub
      stubContent = `// Re-export stub for ${outsideFile}
// This file has been replaced with a re-export from the canonical location

export * from '${canonicalImportPath}';

// Re-export default if it exists
export { default } from '${canonicalImportPath}';
`;
    }
    
    writeFileSync(filePath, stubContent, 'utf8');
  }

  private calculateImportPath(filePath: string, canonicalPath: string): string {
    const fileDir = dirname(filePath);
    const canonicalDir = dirname(join(this.frontendRoot, canonicalPath));
    
    // Calculate relative path
    const relativePath = relative(fileDir, canonicalDir);
    const canonicalFileName = canonicalPath.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || '';
    
    let importPath = relativePath ? `${relativePath}/${canonicalFileName}` : canonicalFileName;
    
    // Normalize path separators
    return importPath.replace(/\\/g, '/');
  }

  private removeFile(filePath: string): void {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  private async removeEmptyDirectories(outsideFiles: string[]): Promise<void> {
    const directories = new Set<string>();
    
    // Collect all parent directories
    for (const file of outsideFiles) {
      let currentDir = dirname(join(this.frontendRoot, file));
      
      while (currentDir !== this.frontendRoot && currentDir.length > this.frontendRoot.length) {
        directories.add(currentDir);
        currentDir = dirname(currentDir);
      }
    }
    
    // Check each directory and remove if empty
    for (const dir of directories) {
      try {
        if (this.isDirectoryEmpty(dir)) {
          rmdirSync(dir);
          console.log(`     🗑️  Removed empty directory: ${relative(this.frontendRoot, dir)}`);
        }
      } catch (error) {
        // Directory not empty or other error, skip
      }
    }
  }

  private isDirectoryEmpty(dirPath: string): boolean {
    try {
      const files = require('fs').readdirSync(dirPath);
      return files.length === 0;
    } catch {
      return false;
    }
  }

  async findOrphanedFiles(): Promise<string[]> {
    console.log('🔍 Finding orphaned files...');
    
    const orphanedFiles: string[] = [];
    const pattern = join(this.frontendRoot, 'src/**/*.{ts,tsx,js,jsx}');
    const allFiles = await glob(pattern);
    
    for (const file of allFiles) {
      const relativePath = relative(this.frontendRoot, file);
      
      // Skip files in features directory
      if (relativePath.startsWith('features/')) {
        continue;
      }
      
      // Check if file is imported anywhere
      const isImported = await this.isFileImported(relativePath);
      
      if (!isImported) {
        orphanedFiles.push(relativePath);
      }
    }
    
    return orphanedFiles;
  }

  private async isFileImported(filePath: string): Promise<boolean> {
    const pattern = join(this.frontendRoot, 'src/**/*.{ts,tsx,js,jsx}');
    const allFiles = await glob(pattern);
    
    const fileName = filePath.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || '';
    const fileDir = dirname(filePath);
    
    for (const file of allFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        
        // Check for various import patterns
        const importPatterns = [
          // Direct import
          new RegExp(`from\\s+['"]${filePath.replace(/\.(ts|tsx|js|jsx)$/, '')}['"]`, 'g'),
          // Relative import
          new RegExp(`from\\s+['"]\\./.*${fileName}['"]`, 'g'),
          // Alias import
          new RegExp(`from\\s+['"]@/.*${fileName}['"]`, 'g'),
          // Dynamic import
          new RegExp(`import\\s*\\(\\s*['"]${filePath.replace(/\.(ts|tsx|js|jsx)$/, '')}['"]`, 'g')
        ];
        
        for (const pattern of importPatterns) {
          if (pattern.test(content)) {
            return true;
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
    
    return false;
  }

  async getFileStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    byExtension: Map<string, number>;
  }> {
    const pattern = join(this.frontendRoot, 'src/**/*.{ts,tsx,js,jsx}');
    const allFiles = await glob(pattern);
    
    let totalSize = 0;
    const byExtension = new Map<string, number>();
    
    for (const file of allFiles) {
      try {
        const stats = statSync(file);
        totalSize += stats.size;
        
        const ext = extname(file);
        const count = byExtension.get(ext) || 0;
        byExtension.set(ext, count + 1);
      } catch {
        // Skip files that can't be stat'd
      }
    }
    
    return {
      totalFiles: allFiles.length,
      totalSize,
      byExtension
    };
  }
}
