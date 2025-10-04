import { readFileSync, writeFileSync, unlinkSync, rmdirSync, existsSync, statSync } from 'fs';
import { join, dirname, relative, extname } from 'path';
import { glob } from 'glob';

export class FileSystemOps {
  constructor(frontendRoot, options = {}) {
    this.frontendRoot = frontendRoot;
    this.options = options;
  }

  async processOutsideFiles(key, canonicalPath, outsideFiles) {
    console.log(`   🗂️  Processing outside files for ${key}...`);
    
    const result = {
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

  async createReexportStub(filePath, canonicalPath, outsideFile) {
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

  calculateImportPath(filePath, canonicalPath) {
    const fileDir = dirname(filePath);
    const canonicalDir = dirname(join(this.frontendRoot, canonicalPath));
    
    // Calculate relative path
    const relativePath = relative(fileDir, canonicalDir);
    const canonicalFileName = canonicalPath.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || '';
    
    let importPath = relativePath ? `${relativePath}/${canonicalFileName}` : canonicalFileName;
    
    // Normalize path separators
    return importPath.replace(/\\/g, '/');
  }

  removeFile(filePath) {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  async removeEmptyDirectories(outsideFiles) {
    const directories = new Set();
    
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

  isDirectoryEmpty(dirPath) {
    try {
      const files = require('fs').readdirSync(dirPath);
      return files.length === 0;
    } catch {
      return false;
    }
  }
}
