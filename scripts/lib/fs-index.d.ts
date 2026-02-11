export declare class FileSystemIndex {
    private root;
    private index;
    constructor(root: string);
    build(pattern?: string): Promise<void>;
    private loadTsConfigAliases;
    findFilesByBasename(basename: string): string[];
    findFilesInDirectory(directory: string): string[];
    getAliases(): Map<string, string>;
    getAllFiles(): string[];
}
//# sourceMappingURL=fs-index.d.ts.map