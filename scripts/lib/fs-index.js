import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
export class FileSystemIndex {
    constructor(root) {
        this.root = root;
        this.index = {
            files: new Map(),
            directories: new Map(),
            aliases: new Map(),
        };
    }
    async build(pattern = 'src/**/*.{ts,tsx,js,jsx}') {
        const files = await glob(pattern, {
            cwd: this.root,
            absolute: true,
            ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
        });
        for (const file of files) {
            const basename = path.basename(file);
            const dirname = path.dirname(file);
            const relativeDir = path.relative(this.root, dirname);
            // Index by basename
            if (!this.index.files.has(basename)) {
                this.index.files.set(basename, file);
            }
            else {
                // Handle duplicates by storing as array
                const existing = this.index.files.get(basename);
                if (typeof existing === 'string') {
                    this.index.files.set(basename, existing);
                }
            }
            // Index by directory
            if (!this.index.directories.has(relativeDir)) {
                this.index.directories.set(relativeDir, []);
            }
            this.index.directories.get(relativeDir).push(file);
        }
        // Load tsconfig aliases
        await this.loadTsConfigAliases();
    }
    async loadTsConfigAliases() {
        const tsconfigPath = path.join(this.root, 'tsconfig.json');
        if (fs.existsSync(tsconfigPath)) {
            try {
                const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
                const { baseUrl, paths } = tsconfig.compilerOptions || {};
                if (baseUrl && paths) {
                    const basePath = path.join(this.root, baseUrl);
                    for (const [alias, targets] of Object.entries(paths)) {
                        if (Array.isArray(targets) && targets.length > 0) {
                            const aliasKey = alias.replace('/*', '');
                            const targetPath = targets[0].replace('/*', '');
                            this.index.aliases.set(aliasKey, path.join(basePath, targetPath));
                        }
                    }
                }
            }
            catch (error) {
                console.warn('Failed to load tsconfig.json aliases:', error);
            }
        }
    }
    findFilesByBasename(basename) {
        const results = [];
        const normalizedBasename = basename.replace(/\.(ts|tsx|js|jsx)$/, '');
        // Try exact match first
        if (this.index.files.has(basename)) {
            const file = this.index.files.get(basename);
            if (typeof file === 'string') {
                results.push(file);
            }
        }
        // Try with common extensions
        const extensions = ['.tsx', '.ts', '.jsx', '.js'];
        for (const ext of extensions) {
            const withExt = normalizedBasename + ext;
            if (this.index.files.has(withExt)) {
                const file = this.index.files.get(withExt);
                if (typeof file === 'string' && !results.includes(file)) {
                    results.push(file);
                }
            }
        }
        // Try index files
        for (const ext of extensions) {
            const indexFile = `index${ext}`;
            for (const [dir, files] of this.index.directories) {
                if (dir.endsWith(normalizedBasename) || dir.endsWith(`/${normalizedBasename}`)) {
                    const indexPath = files.find(f => path.basename(f) === indexFile);
                    if (indexPath && !results.includes(indexPath)) {
                        results.push(indexPath);
                    }
                }
            }
        }
        return results;
    }
    findFilesInDirectory(directory) {
        const normalizedDir = path.relative(this.root, path.join(this.root, directory));
        return this.index.directories.get(normalizedDir) || [];
    }
    getAliases() {
        return this.index.aliases;
    }
    getAllFiles() {
        const allFiles = [];
        for (const files of this.index.directories.values()) {
            allFiles.push(...files);
        }
        return allFiles;
    }
}
//# sourceMappingURL=fs-index.js.map