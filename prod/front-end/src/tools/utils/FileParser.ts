// File parsing utilities for Site Structure Visualizer
// This would be enhanced with actual AST parsing in a real implementation

export interface ParsedFileInfo {
    imports: string[];
    exports: string[];
    apiCalls: string[];
    componentNames: string[];
    hookUsage: string[];
    routeDefinitions: RouteInfo[];
    dependencies: FileDependency[];
}

export interface RouteInfo {
    path: string;
    component: string;
    layout?: string;
    exact?: boolean;
    protected?: boolean;
}

export interface FileDependency {
    from: string;
    imported: string[];
    type: 'relative' | 'absolute' | 'package';
}

export class FileParser {
    // Parse React/TypeScript file content
    static parseFile(filePath: string, content: string): ParsedFileInfo {
        const info: ParsedFileInfo = {
            imports: [],
            exports: [],
            apiCalls: [],
            componentNames: [],
            hookUsage: [],
            routeDefinitions: [],
            dependencies: []
        };

        // Extract imports using regex (would use AST parser in production)
        const importMatches = content.match(/import\s+.*?from\s+['"`]([^'"`]+)['"`]/g);
        if (importMatches) {
            importMatches.forEach(match => {
                const fromMatch = match.match(/from\s+['"`]([^'"`]+)['"`]/);
                if (fromMatch) {
                    const importPath = fromMatch[1];
                    info.imports.push(importPath);
                    
                    // Categorize dependency type
                    const depType = this.getDependencyType(importPath);
                    const importedItems = this.extractImportedItems(match);
                    
                    info.dependencies.push({
                        from: importPath,
                        imported: importedItems,
                        type: depType
                    });
                }
            });
        }

        // Extract exports
        const exportMatches = content.match(/export\s+(?:default\s+)?(?:const|function|class|interface|type)\s+(\w+)/g);
        if (exportMatches) {
            exportMatches.forEach(match => {
                const nameMatch = match.match(/(?:const|function|class|interface|type)\s+(\w+)/);
                if (nameMatch) {
                    info.exports.push(nameMatch[1]);
                }
            });
        }

        // Extract API calls (fetch, axios, etc.)
        const apiCallRegex = /(?:fetch|axios\.(?:get|post|put|delete|patch))\s*\(\s*['"`]([^'"`]+)['"`]/g;
        let apiMatch;
        while ((apiMatch = apiCallRegex.exec(content)) !== null) {
            info.apiCalls.push(apiMatch[1]);
        }

        // Extract React component names (functions starting with capital letter)
        const componentMatches = content.match(/(?:function|const)\s+([A-Z]\w+)/g);
        if (componentMatches) {
            componentMatches.forEach(match => {
                const nameMatch = match.match(/(?:function|const)\s+([A-Z]\w+)/);
                if (nameMatch) {
                    info.componentNames.push(nameMatch[1]);
                }
            });
        }

        // Extract hook usage (use-prefixed imports and calls)
        const hookMatches = content.match(/use[A-Z]\w+/g);
        if (hookMatches) {
            info.hookUsage = [...new Set(hookMatches)];
        }

        // Extract route definitions (for Router files)
        if (filePath.includes('Router') || filePath.includes('routes')) {
            info.routeDefinitions = this.extractRouteDefinitions(content);
        }

        return info;
    }

    // Extract imported items from import statement
    private static extractImportedItems(importStatement: string): string[] {
        const items: string[] = [];
        
        // Default import
        const defaultMatch = importStatement.match(/import\s+(\w+)/);
        if (defaultMatch) {
            items.push(defaultMatch[1]);
        }

        // Named imports
        const namedMatch = importStatement.match(/import\s+(?:\w+,\s*)?\{\s*([^}]+)\s*\}/);
        if (namedMatch) {
            const namedImports = namedMatch[1]
                .split(',')
                .map(item => item.trim().split(' as ')[0].trim())
                .filter(item => item.length > 0);
            items.push(...namedImports);
        }

        return items;
    }

    // Determine dependency type
    private static getDependencyType(importPath: string): FileDependency['type'] {
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
            return 'relative';
        } else if (importPath.startsWith('/') || importPath.startsWith('src/')) {
            return 'absolute';
        } else {
            return 'package';
        }
    }

    // Extract route definitions from router files
    private static extractRouteDefinitions(content: string): RouteInfo[] {
        const routes: RouteInfo[] = [];

        // Match React Router route patterns
        const routePatterns = [
            /path:\s*['"`]([^'"`]+)['"`].*?element:\s*<([^>]+)/g,
            /<Route\s+path=['"`]([^'"`]+)['"`].*?element=\{<([^>]+)/g,
            /<Route\s+path=['"`]([^'"`]+)['"`].*?component=\{([^}]+)/g
        ];

        routePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const path = match[1];
                const componentText = match[2];
                
                // Extract component name (remove props and whitespace)
                const componentName = componentText.split(/\s/)[0].replace(/[<>]/g, '');
                
                routes.push({
                    path: path,
                    component: componentName,
                    protected: content.includes('ProtectedRoute'),
                    exact: content.includes('exact')
                });
            }
        });

        return routes;
    }

    // Get file type based on path and content
    static getFileType(filePath: string, content: string): 'page' | 'component' | 'layout' | 'route' | 'hook' | 'api' | 'util' | 'context' {
        const fileName = filePath.split('/').pop()?.toLowerCase() || '';
        const pathLower = filePath.toLowerCase();

        // API endpoints
        if (pathLower.includes('/api/') || fileName.includes('api')) {
            return 'api';
        }

        // Hooks
        if (pathLower.includes('/hooks/') || fileName.startsWith('use') || content.includes('export const use')) {
            return 'hook';
        }

        // Layouts
        if (pathLower.includes('/layout') || fileName.includes('layout')) {
            return 'layout';
        }

        // Routes
        if (pathLower.includes('/route') || fileName.includes('router') || fileName.includes('route')) {
            return 'route';
        }

        // Pages/Views
        if (pathLower.includes('/pages/') || pathLower.includes('/views/')) {
            return 'page';
        }

        // Context
        if (pathLower.includes('/context') || fileName.includes('context') || content.includes('createContext')) {
            return 'context';
        }

        // React components (check for JSX/TSX and React imports)
        if ((fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) && 
            (content.includes('import React') || content.includes('import { React'))) {
            return 'component';
        }

        // Utilities
        return 'util';
    }

    // Extract all component dependencies
    static extractDependencyGraph(files: Map<string, string>): Map<string, string[]> {
        const graph = new Map<string, string[]>();

        files.forEach((content, filePath) => {
            const parsed = this.parseFile(filePath, content);
            const dependencies: string[] = [];

            // Add relative imports as dependencies
            parsed.dependencies.forEach(dep => {
                if (dep.type === 'relative' || dep.type === 'absolute') {
                    dependencies.push(dep.from);
                }
            });

            graph.set(filePath, dependencies);
        });

        return graph;
    }

    // Detect circular dependencies
    static detectCircularDependencies(dependencyGraph: Map<string, string[]>): string[][] {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        const cycles: string[][] = [];

        const dfs = (node: string, path: string[]): void => {
            if (recursionStack.has(node)) {
                // Found a cycle
                const cycleStart = path.indexOf(node);
                if (cycleStart !== -1) {
                    cycles.push(path.slice(cycleStart));
                }
                return;
            }

            if (visited.has(node)) {
                return;
            }

            visited.add(node);
            recursionStack.add(node);

            const dependencies = dependencyGraph.get(node) || [];
            dependencies.forEach(dep => {
                dfs(dep, [...path, dep]);
            });

            recursionStack.delete(node);
        };

        dependencyGraph.forEach((_, node) => {
            if (!visited.has(node)) {
                dfs(node, [node]);
            }
        });

        return cycles;
    }

    // Calculate file complexity metrics
    static calculateComplexity(content: string): {
        linesOfCode: number;
        imports: number;
        exports: number;
        functions: number;
        components: number;
        complexity: 'low' | 'medium' | 'high';
    } {
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        const linesOfCode = lines.length;

        const imports = (content.match(/import\s+.*?from/g) || []).length;
        const exports = (content.match(/export\s+/g) || []).length;
        const functions = (content.match(/function\s+\w+/g) || []).length;
        const components = (content.match(/(?:function|const)\s+[A-Z]\w+/g) || []).length;

        let complexity: 'low' | 'medium' | 'high' = 'low';
        if (linesOfCode > 200 || imports > 20) {
            complexity = 'high';
        } else if (linesOfCode > 100 || imports > 10) {
            complexity = 'medium';
        }

        return {
            linesOfCode,
            imports,
            exports,
            functions,
            components,
            complexity
        };
    }
} 