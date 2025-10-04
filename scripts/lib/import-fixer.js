import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { FileSystemIndex } from './fs-index.js';
import { ImportRewriter } from './ast.js';
export class ImportFixer {
    constructor(options) {
        this.options = options;
        this.errors = [];
        this.fixes = [];
        this.fsIndex = new FileSystemIndex(options.root);
        this.rewriter = new ImportRewriter(options.root);
    }
    async run() {
        // Build file index
        await this.fsIndex.build(this.options.src);
        // Collect import errors
        if (this.options.runVite) {
            await this.collectViteErrors();
        }
        else if (this.options.fromBuild) {
            await this.parseErrorLog(this.options.fromBuild);
        }
        else {
            await this.scanStatically();
        }
        // Fix each error
        for (const error of this.errors) {
            await this.fixImportError(error);
        }
        return { fixes: this.fixes, errors: this.errors };
    }
    async collectViteErrors() {
        return new Promise((resolve) => {
            const vite = spawn('npx', ['vite', 'build'], {
                cwd: this.options.root,
                shell: true,
            });
            let errorOutput = '';
            vite.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            vite.on('close', () => {
                this.parseViteOutput(errorOutput);
                resolve();
            });
        });
    }
    parseViteOutput(output) {
        const lines = output.split('\n');
        for (const line of lines) {
            // Parse Vite import errors
            const viteMatch = line.match(/Failed to resolve import "([^"]+)" from "([^"]+)"/);
            if (viteMatch) {
                this.errors.push({
                    file: path.join(this.options.root, viteMatch[2]),
                    specifier: viteMatch[1],
                    errorMessage: line,
                });
            }
            // Parse TypeScript errors
            const tsMatch = line.match(/([^:]+):.*Cannot find module '([^']+)'/);
            if (tsMatch) {
                this.errors.push({
                    file: tsMatch[1],
                    specifier: tsMatch[2],
                    errorMessage: line,
                });
            }
        }
    }
    async parseErrorLog(logPath) {
        if (!fs.existsSync(logPath)) {
            console.error(`Error log not found: ${logPath}`);
            return;
        }
        const content = fs.readFileSync(logPath, 'utf-8');
        this.parseViteOutput(content);
    }
    async scanStatically() {
        const allFiles = this.fsIndex.getAllFiles();
        for (const file of allFiles) {
            if (file.match(/\.(tsx?|jsx?)$/)) {
                const imports = this.rewriter.getImports(file);
                for (const specifier of imports) {
                    if (!this.canResolveImport(file, specifier)) {
                        this.errors.push({
                            file,
                            specifier,
                            errorMessage: `Static scan: unresolved import`,
                        });
                    }
                }
            }
        }
    }
    canResolveImport(fromFile, specifier) {
        // Skip node_modules and absolute imports
        if (!specifier.startsWith('.') && !specifier.startsWith('@/') && !specifier.startsWith('src/')) {
            return true; // Assume external modules are fine
        }
        const resolved = this.resolveImport(fromFile, specifier);
        return resolved !== null;
    }
    resolveImport(fromFile, specifier) {
        const fromDir = path.dirname(fromFile);
        // Handle aliases
        const aliases = this.fsIndex.getAliases();
        for (const [alias, aliasPath] of aliases) {
            if (specifier.startsWith(alias + '/')) {
                const relativePath = specifier.substring(alias.length + 1);
                const fullPath = path.join(aliasPath, relativePath);
                if (this.fileExists(fullPath)) {
                    return fullPath;
                }
            }
        }
        // Handle relative imports
        if (specifier.startsWith('.')) {
            const fullPath = path.resolve(fromDir, specifier);
            if (this.fileExists(fullPath)) {
                return fullPath;
            }
        }
        return null;
    }
    fileExists(filePath) {
        // Try exact path
        if (fs.existsSync(filePath)) {
            return true;
        }
        // Try with extensions
        const extensions = ['.tsx', '.ts', '.jsx', '.js'];
        for (const ext of extensions) {
            if (fs.existsSync(filePath + ext)) {
                return true;
            }
        }
        // Try index files
        for (const ext of extensions) {
            if (fs.existsSync(path.join(filePath, `index${ext}`))) {
                return true;
            }
        }
        return false;
    }
    async fixImportError(error) {
        const candidates = this.findCandidates(error);
        if (candidates.length === 0 && this.options.createStubs) {
            this.createStub(error);
            return;
        }
        const bestCandidate = candidates.sort((a, b) => b.score - a.score)[0];
        if (bestCandidate && bestCandidate.score >= 0.5) {
            const newImport = this.buildImportPath(error.file, bestCandidate.targetPath);
            const fix = {
                file: error.file,
                oldImport: error.specifier,
                newImport,
                heuristic: bestCandidate.heuristic,
                score: bestCandidate.score,
                applied: false,
            };
            if (this.options.apply) {
                const success = this.rewriter.rewriteImport(error.file, error.specifier, newImport);
                fix.applied = success;
            }
            this.fixes.push(fix);
        }
    }
    findCandidates(error) {
        const candidates = [];
        const specifier = error.specifier;
        const basename = path.basename(specifier).replace(/\.(tsx?|jsx?)$/, '');
        // 1. Try extension resolution
        this.tryExtensionResolution(error, candidates);
        // 2. Try case variations
        this.tryCaseVariations(error, basename, candidates);
        // 3. Try folder flips (context/contexts, etc.)
        this.tryFolderFlips(error, candidates);
        // 4. Try basename search
        this.tryBasenameSearch(error, basename, candidates);
        return candidates;
    }
    tryExtensionResolution(error, candidates) {
        const extensions = ['.tsx', '.ts', '.jsx', '.js'];
        const fromDir = path.dirname(error.file);
        for (const ext of extensions) {
            const withExt = error.specifier + ext;
            const resolved = this.resolveImport(error.file, withExt);
            if (resolved) {
                candidates.push({
                    targetPath: resolved,
                    score: 0.9,
                    heuristic: 'extension-resolution',
                    needsExtension: true,
                });
            }
        }
        // Try index files
        const indexPath = path.join(error.specifier, 'index');
        for (const ext of extensions) {
            const resolved = this.resolveImport(error.file, indexPath + ext);
            if (resolved) {
                candidates.push({
                    targetPath: resolved,
                    score: 0.85,
                    heuristic: 'index-resolution',
                });
            }
        }
    }
    tryCaseVariations(error, basename, candidates) {
        const variations = [
            basename,
            basename.toLowerCase(),
            basename.toUpperCase(),
            this.toPascalCase(basename),
            this.toCamelCase(basename),
            this.toKebabCase(basename),
            this.toSnakeCase(basename),
        ];
        const uniqueVariations = [...new Set(variations)];
        for (const variant of uniqueVariations) {
            const files = this.fsIndex.findFilesByBasename(variant);
            for (const file of files) {
                if (file !== error.file) {
                    candidates.push({
                        targetPath: file,
                        score: 0.7,
                        heuristic: 'case-variation',
                    });
                }
            }
        }
    }
    tryFolderFlips(error, candidates) {
        const folderMappings = [
            ['context', 'contexts'],
            ['component', 'components'],
            ['util', 'utils'],
            ['lib', 'libs'],
            ['hook', 'hooks'],
            ['service', 'services'],
            ['type', 'types'],
            ['model', 'models'],
        ];
        for (const [singular, plural] of folderMappings) {
            let flipped = error.specifier;
            if (flipped.includes(`/${singular}/`)) {
                flipped = flipped.replace(`/${singular}/`, `/${plural}/`);
            }
            else if (flipped.includes(`/${plural}/`)) {
                flipped = flipped.replace(`/${plural}/`, `/${singular}/`);
            }
            else {
                continue;
            }
            const resolved = this.resolveImport(error.file, flipped);
            if (resolved) {
                candidates.push({
                    targetPath: resolved,
                    score: 0.8,
                    heuristic: 'folder-flip',
                });
            }
        }
    }
    tryBasenameSearch(error, basename, candidates) {
        const files = this.fsIndex.findFilesByBasename(basename);
        const fromFile = error.file;
        for (const file of files) {
            if (file !== fromFile) {
                const proximity = this.calculateProximity(fromFile, file);
                const score = Math.max(0.3, 0.6 - proximity * 0.1);
                candidates.push({
                    targetPath: file,
                    score,
                    heuristic: 'basename-search',
                });
            }
        }
    }
    calculateProximity(from, to) {
        const fromParts = from.split(path.sep);
        const toParts = to.split(path.sep);
        let commonParts = 0;
        for (let i = 0; i < Math.min(fromParts.length, toParts.length); i++) {
            if (fromParts[i] === toParts[i]) {
                commonParts++;
            }
            else {
                break;
            }
        }
        return Math.abs(fromParts.length - toParts.length) +
            (Math.min(fromParts.length, toParts.length) - commonParts);
    }
    buildImportPath(fromFile, toFile) {
        const style = this.rewriter.detectImportStyle(fromFile);
        const aliases = this.fsIndex.getAliases();
        // Try to use alias if preferred
        if (this.options.preferAlias || style.usesAliases) {
            for (const [alias, aliasPath] of aliases) {
                if (toFile.startsWith(aliasPath)) {
                    const relativePath = path.relative(aliasPath, toFile);
                    let aliasImport = `${alias}/${relativePath}`.replace(/\\/g, '/');
                    // Remove extension unless the project uses them
                    if (!style.usesExtensions) {
                        aliasImport = aliasImport.replace(/\.(tsx?|jsx?)$/, '');
                    }
                    // Handle index files
                    aliasImport = aliasImport.replace(/\/index$/, '');
                    return aliasImport;
                }
            }
        }
        // Fall back to relative import
        const fromDir = path.dirname(fromFile);
        let relativePath = path.relative(fromDir, toFile);
        // Convert to forward slashes
        relativePath = relativePath.replace(/\\/g, '/');
        // Add ./ prefix if needed
        if (!relativePath.startsWith('.')) {
            relativePath = './' + relativePath;
        }
        // Remove extension unless the project uses them
        if (!style.usesExtensions) {
            relativePath = relativePath.replace(/\.(tsx?|jsx?)$/, '');
        }
        // Handle index files
        relativePath = relativePath.replace(/\/index$/, '');
        return relativePath;
    }
    createStub(error) {
        const specifier = error.specifier;
        const targetPath = this.resolveStubPath(error.file, specifier);
        if (targetPath) {
            const exportName = path.basename(specifier).replace(/\.(tsx?|jsx?)$/, '');
            this.rewriter.createStubFile(targetPath, exportName);
            this.fixes.push({
                file: error.file,
                oldImport: specifier,
                newImport: specifier,
                heuristic: 'stub-created',
                score: 1.0,
                applied: true,
            });
        }
    }
    resolveStubPath(fromFile, specifier) {
        if (specifier.startsWith('.')) {
            const fromDir = path.dirname(fromFile);
            const resolved = path.resolve(fromDir, specifier);
            return resolved + '.tsx';
        }
        // Handle alias imports
        const aliases = this.fsIndex.getAliases();
        for (const [alias, aliasPath] of aliases) {
            if (specifier.startsWith(alias + '/')) {
                const relativePath = specifier.substring(alias.length + 1);
                return path.join(aliasPath, relativePath) + '.tsx';
            }
        }
        return null;
    }
    // String case utilities
    toPascalCase(str) {
        return str.replace(/(?:^|[-_])(\w)/g, (_, c) => c.toUpperCase());
    }
    toCamelCase(str) {
        const pascal = this.toPascalCase(str);
        return pascal.charAt(0).toLowerCase() + pascal.slice(1);
    }
    toKebabCase(str) {
        return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    }
    toSnakeCase(str) {
        return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    }
}
//# sourceMappingURL=import-fixer.js.map