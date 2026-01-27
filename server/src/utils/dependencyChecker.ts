/**
 * Dependency Checker Utility
 * 
 * Analyzes file imports and checks if dependencies exist in target directory.
 * Used for pre-restore validation and warning generation.
 */

import * as fs from 'fs-extra';
import * as path from 'path';

export interface ImportDependency {
  importPath: string;      // Original import statement (e.g., './Component')
  resolvedPath: string | null;  // Resolved file path or null if not found
  exists: boolean;         // Whether the file exists in target
  lineNumber: number;      // Line number where import appears
  importType: 'relative' | 'absolute' | 'package';  // Type of import
}

export interface DependencyCheckResult {
  filePath: string;
  hasImports: boolean;
  imports: ImportDependency[];
  missingImports: ImportDependency[];
  missingCount: number;
  allDependenciesExist: boolean;
}

/**
 * Extract import statements from TypeScript/JavaScript file
 */
function extractImports(fileContent: string): Array<{ importPath: string; lineNumber: number }> {
  const imports: Array<{ importPath: string; lineNumber: number }> = [];
  const lines = fileContent.split('\n');
  
  // Regex patterns for different import styles
  const patterns = [
    // import ... from '...'
    /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g,
    // require('...')
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    // dynamic import()
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  
  lines.forEach((line, index) => {
    patterns.forEach(pattern => {
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        imports.push({
          importPath: match[1],
          lineNumber: index + 1
        });
      }
    });
  });
  
  return imports;
}

/**
 * Determine import type (relative, absolute, or package)
 */
function getImportType(importPath: string): 'relative' | 'absolute' | 'package' {
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    return 'relative';
  } else if (importPath.startsWith('/') || importPath.startsWith('@/')) {
    return 'absolute';
  } else {
    return 'package';
  }
}

/**
 * Resolve an import path to an actual file path
 */
async function resolveImportPath(
  importPath: string,
  sourceFilePath: string,
  targetBasePath: string
): Promise<string | null> {
  const importType = getImportType(importPath);
  
  // Skip package imports (node_modules)
  if (importType === 'package') {
    return null;
  }
  
  let resolvedPath: string;
  
  if (importType === 'relative') {
    // Relative import: resolve relative to source file directory
    const sourceDir = path.dirname(sourceFilePath);
    resolvedPath = path.resolve(sourceDir, importPath);
  } else {
    // Absolute import: resolve relative to target base path
    // Handle @/ alias (common in React/Vite projects)
    const cleanPath = importPath.replace(/^@\//, '');
    resolvedPath = path.join(targetBasePath, cleanPath);
  }
  
  // Try different extensions
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.json'];
  
  for (const ext of extensions) {
    const testPath = resolvedPath + ext;
    try {
      if (await fs.pathExists(testPath)) {
        const stats = await fs.stat(testPath);
        if (stats.isFile()) {
          return testPath;
        }
      }
    } catch (error) {
      // Continue to next extension
    }
  }
  
  // Try as directory with index file
  for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
    const testPath = path.join(resolvedPath, `index${ext}`);
    try {
      if (await fs.pathExists(testPath)) {
        return testPath;
      }
    } catch (error) {
      // Continue
    }
  }
  
  return null;
}

/**
 * Check dependencies for a file
 * @param sourceFilePath - Path to the source file to analyze
 * @param targetBasePath - Base path of target directory for resolving imports
 * @returns Dependency check result with missing imports flagged
 */
export async function checkDependencies(
  sourceFilePath: string,
  targetBasePath: string
): Promise<DependencyCheckResult> {
  const result: DependencyCheckResult = {
    filePath: sourceFilePath,
    hasImports: false,
    imports: [],
    missingImports: [],
    missingCount: 0,
    allDependenciesExist: true
  };
  
  try {
    // Read file content
    if (!await fs.pathExists(sourceFilePath)) {
      return result;
    }
    
    const fileContent = await fs.readFile(sourceFilePath, 'utf8');
    
    // Extract imports
    const extractedImports = extractImports(fileContent);
    
    if (extractedImports.length === 0) {
      return result;
    }
    
    result.hasImports = true;
    
    // Check each import
    for (const { importPath, lineNumber } of extractedImports) {
      const importType = getImportType(importPath);
      
      // Skip package imports
      if (importType === 'package') {
        continue;
      }
      
      // Resolve import path
      const resolvedPath = await resolveImportPath(importPath, sourceFilePath, targetBasePath);
      const exists = resolvedPath !== null;
      
      const dependency: ImportDependency = {
        importPath,
        resolvedPath,
        exists,
        lineNumber,
        importType
      };
      
      result.imports.push(dependency);
      
      if (!exists) {
        result.missingImports.push(dependency);
        result.allDependenciesExist = false;
      }
    }
    
    result.missingCount = result.missingImports.length;
    
  } catch (error) {
    console.error(`Error checking dependencies for ${sourceFilePath}:`, error);
  }
  
  return result;
}

/**
 * Check dependencies for multiple files
 */
export async function checkMultipleDependencies(
  sourceFilePaths: string[],
  targetBasePath: string
): Promise<DependencyCheckResult[]> {
  const results: DependencyCheckResult[] = [];
  
  for (const filePath of sourceFilePaths) {
    const result = await checkDependencies(filePath, targetBasePath);
    results.push(result);
  }
  
  return results;
}

/**
 * Get summary of dependency issues across multiple files
 */
export function getDependencySummary(results: DependencyCheckResult[]): {
  totalFiles: number;
  filesWithImports: number;
  filesWithMissingDeps: number;
  totalMissingDeps: number;
  criticalFiles: DependencyCheckResult[];
} {
  const filesWithMissingDeps = results.filter(r => r.missingCount > 0);
  
  return {
    totalFiles: results.length,
    filesWithImports: results.filter(r => r.hasImports).length,
    filesWithMissingDeps: filesWithMissingDeps.length,
    totalMissingDeps: filesWithMissingDeps.reduce((sum, r) => sum + r.missingCount, 0),
    criticalFiles: filesWithMissingDeps.filter(r => r.missingCount > 3) // Files with many missing deps
  };
}
