import { Project, SourceFile, ImportDeclaration, StringLiteral } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

export class ImportRewriter {
  private project: Project;

  constructor(rootPath?: string) {
    const tsconfigPath = rootPath 
      ? path.join(rootPath, 'tsconfig.json')
      : path.join(process.cwd(), 'tsconfig.json');
      
    this.project = new Project({
      tsConfigFilePath: fs.existsSync(tsconfigPath) ? tsconfigPath : undefined,
      skipAddingFilesFromTsConfig: true,
    });
  }

  rewriteImport(
    filePath: string,
    oldSpecifier: string,
    newSpecifier: string
  ): boolean {
    try {
      const sourceFile = this.project.addSourceFileAtPath(filePath);
      let modified = false;

      // Find all import declarations
      const imports = sourceFile.getImportDeclarations();
      
      for (const importDecl of imports) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        
        if (moduleSpecifier === oldSpecifier) {
          // Update the import
          importDecl.setModuleSpecifier(newSpecifier);
          modified = true;
        }
      }

      // Also check for dynamic imports
      sourceFile.forEachDescendant((node) => {
        if (node.getKindName() === 'CallExpression') {
          const callExpr = node.asKindOrThrow(203); // CallExpression kind
          const expr = callExpr.getExpression();
          
          if (expr.getText() === 'import' || expr.getText() === 'require') {
            const args = callExpr.getArguments();
            if (args.length > 0 && args[0].getKindName() === 'StringLiteral') {
              const stringLit = args[0] as StringLiteral;
              if (stringLit.getLiteralValue() === oldSpecifier) {
                stringLit.setLiteralValue(newSpecifier);
                modified = true;
              }
            }
          }
        }
      });

      if (modified) {
        sourceFile.saveSync();
      }

      return modified;
    } catch (error) {
      console.error(`Failed to rewrite import in ${filePath}:`, error);
      return false;
    }
  }

  getImports(filePath: string): string[] {
    try {
      const sourceFile = this.project.addSourceFileAtPath(filePath);
      const imports: string[] = [];

      // Static imports
      sourceFile.getImportDeclarations().forEach(importDecl => {
        imports.push(importDecl.getModuleSpecifierValue());
      });

      // Dynamic imports and requires
      sourceFile.forEachDescendant((node) => {
        if (node.getKindName() === 'CallExpression') {
          const callExpr = node.asKindOrThrow(203);
          const expr = callExpr.getExpression();
          
          if (expr.getText() === 'import' || expr.getText() === 'require') {
            const args = callExpr.getArguments();
            if (args.length > 0 && args[0].getKindName() === 'StringLiteral') {
              const stringLit = args[0] as StringLiteral;
              imports.push(stringLit.getLiteralValue());
            }
          }
        }
      });

      return imports;
    } catch (error) {
      console.error(`Failed to get imports from ${filePath}:`, error);
      return [];
    }
  }

  detectImportStyle(filePath: string): { usesExtensions: boolean; usesAliases: boolean } {
    try {
      const sourceFile = this.project.addSourceFileAtPath(filePath);
      let usesExtensions = false;
      let usesAliases = false;

      sourceFile.getImportDeclarations().forEach(importDecl => {
        const specifier = importDecl.getModuleSpecifierValue();
        
        // Check for extensions
        if (/\.(tsx?|jsx?)$/.test(specifier)) {
          usesExtensions = true;
        }
        
        // Check for aliases
        if (specifier.startsWith('@/') || specifier.startsWith('src/')) {
          usesAliases = true;
        }
      });

      return { usesExtensions, usesAliases };
    } catch (error) {
      return { usesExtensions: false, usesAliases: false };
    }
  }

  createStubFile(filePath: string, exportName?: string): void {
    const sourceFile = this.project.createSourceFile(filePath, '', { overwrite: true });
    
    const stubContent = `// TODO: Auto-generated stub - implement this module
${exportName ? `
export const ${exportName} = () => {
  console.warn('${exportName} is not implemented yet');
  return null;
};

export default ${exportName};
` : `
export default {};
`}`;

    sourceFile.insertText(0, stubContent);
    sourceFile.saveSync();
  }
}
