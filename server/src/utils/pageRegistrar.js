// File: server/utils/pageRegistrar.js
const fs = require('fs');
const path = require('path');

// Paths to code files
const ROUTES_INDEX_PATH = path.resolve(__dirname, '../../src/routes/index.js');
const MENU_ITEMS_PATH = path.resolve(__dirname, '../../src/assets/data/menu-items.js');
const PAGES_DIR = path.resolve(__dirname, '../../src/pages');

// Directory aliases for route prefixes
const DIR_ALIASES = { ssppoc: 'pages' };

/**
 * Recursively scans src/pages for .jsx files and returns array of page objects
 * Each object: { name, importPath, routePath }
 */
function scanPages(dir = PAGES_DIR, parent = '') {
    let pages = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach(entry => {
        const fullPath = path.join(dir, entry.name);
        const relDir = parent ? `${parent}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            pages = pages.concat(scanPages(fullPath, relDir));
        } else if (entry.isFile() && entry.name.endsWith('.jsx')) {
            // Drop 'Page' suffix for cleaner names
            const rawName = path.basename(entry.name, '.jsx');
            const name = rawName.replace(/Page$/, '');
            // Compute import path relative to src/pages
            const importPath = `@/pages/${parent ? parent + '/' : ''}${entry.name}`;
            // Build route path segments, replacing certain dirs
            const parentSegs = parent ? parent.split('/').filter(Boolean) : [];
            const aliasedSegs = parentSegs.map(seg => DIR_ALIASES[seg] || seg);
            const segments = [...aliasedSegs, name];
            // Kebab-case each segment, then join
            const routePath = '/' + segments
                .map(seg => seg.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, ''))
                .join('/');
            pages.push({ name, importPath, routePath });
        }
    });
    return pages;
}

/**
 * Writes src/routes/index.js with imports & customRoutes/appRoutes
 */
function updateRoutesIndex(pages) {
    const imports = pages.map(p => `import ${p.name} from '${p.importPath}';`).join('\n');
    const routeObjs = pages.map(p =>
        `  { path: '${p.routePath}', name: '${p.name}', element: <${p.name} /> }`
    ).join(',\n');
    const template = `import { lazy } from 'react';
${imports}

export const customRoutes = [
${routeObjs}
];

export const appRoutes = [
  ...initialRoutes,
  ...generalRoutes,
  ...customRoutes,
  ...baseUIRoutes,
  ...advancedUIRoutes,
  ...chartsNMapsRoutes,
  ...formsRoutes,
  ...tableRoutes,
  ...iconRoutes,
  ...authRoutes,
];
`;
    fs.writeFileSync(ROUTES_INDEX_PATH, template, 'utf8');
}

/**
 * Writes src/assets/data/menu-items.js exporting MENU_ITEMS array
 */
function updateMenuItems(pages) {
    const menu = pages.map(p => ({ name: p.name, icon: 'file', link: p.routePath }));
    const content = `export const MENU_ITEMS = ${JSON.stringify(menu, null, 2)};\n`;
    fs.writeFileSync(MENU_ITEMS_PATH, content, 'utf8');
}

/**
 * Main: scan all pages and regenerate route & menu files
 */
function registerPages() {
    const pages = scanPages();
    updateRoutesIndex(pages);
    updateMenuItems(pages);
    console.log(`Registered ${pages.length} pages.`);
}

module.exports = { registerPages };
