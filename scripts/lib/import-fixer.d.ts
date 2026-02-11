import { ImportError, ImportFix, FixerOptions } from '../types.js';
export declare class ImportFixer {
    private options;
    private fsIndex;
    private rewriter;
    private errors;
    private fixes;
    constructor(options: FixerOptions);
    run(): Promise<{
        fixes: ImportFix[];
        errors: ImportError[];
    }>;
    private collectViteErrors;
    private parseViteOutput;
    private parseErrorLog;
    private scanStatically;
    private canResolveImport;
    private resolveImport;
    private fileExists;
    private fixImportError;
    private findCandidates;
    private tryExtensionResolution;
    private tryCaseVariations;
    private tryFolderFlips;
    private tryBasenameSearch;
    private calculateProximity;
    private buildImportPath;
    private createStub;
    private resolveStubPath;
    private toPascalCase;
    private toCamelCase;
    private toKebabCase;
    private toSnakeCase;
}
//# sourceMappingURL=import-fixer.d.ts.map