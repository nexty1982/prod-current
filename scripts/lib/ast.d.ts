export declare class ImportRewriter {
    private project;
    constructor(rootPath?: string);
    rewriteImport(filePath: string, oldSpecifier: string, newSpecifier: string): boolean;
    getImports(filePath: string): string[];
    detectImportStyle(filePath: string): {
        usesExtensions: boolean;
        usesAliases: boolean;
    };
    createStubFile(filePath: string, exportName?: string): void;
}
//# sourceMappingURL=ast.d.ts.map