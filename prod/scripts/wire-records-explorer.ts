#!/usr/bin/env node
/**
 * Wire Records Explorer Script
 * Safely patches Router and Menu without duplication
 */

import fs from 'fs';
import path from 'path';

const ROUTER_PATH = path.join(__dirname, '../front-end/src/routes/Router.tsx');
const MENU_PATH = path.join(__dirname, '../front-end/src/layouts/full/vertical/sidebar/MenuItems.ts');

function patchFile(filePath: string, searchPattern: string, replacement: string, anchorComment: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already patched
    if (content.includes(anchorComment)) {
      console.log(`✅ ${path.basename(filePath)} already contains Records Explorer`);
      return true;
    }

    // Find the search pattern and add replacement
    if (content.includes(searchPattern)) {
      const newContent = content.replace(searchPattern, replacement);
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Patched ${path.basename(filePath)}`);
      return true;
    } else {
      console.log(`❌ Search pattern not found in ${path.basename(filePath)}`);
      return false;
    }
  } catch (error) {
    console.error(`Error patching ${filePath}:`, error);
    return false;
  }
}

function main() {
  console.log('🔧 Wiring Records Explorer...\n');

  // Router patch
  const routerSearch = `// Records Explorer (Devel Tools)
const RecordsExplorer = Loadable(lazy(() => import('../features/records/explorer/RecordsExplorer')));`;
  
  const routerReplacement = `// Records Explorer (Devel Tools)
const RecordsExplorer = Loadable(lazy(() => import('../features/records/explorer/RecordsExplorer')));`;

  const routerSuccess = patchFile(
    ROUTER_PATH,
    routerSearch,
    routerReplacement,
    '// Records Explorer (Devel Tools)'
  );

  // Menu patch
  const menuSearch = `  {
    navlabel: true,
    subheader: '🛠️ Devel Tools',
  },
  {
    id: uniqueId(),
    title: 'Records Explorer',
    icon: IconDatabase,
    href: '/devel/records-explorer',
  },`;

  const menuReplacement = `  {
    navlabel: true,
    subheader: '🛠️ Devel Tools',
  },
  {
    id: uniqueId(),
    title: 'Records Explorer',
    icon: IconDatabase,
    href: '/devel/records-explorer',
  },`;

  const menuSuccess = patchFile(
    MENU_PATH,
    menuSearch,
    menuReplacement,
    "subheader: '🛠️ Devel Tools'"
  );

  if (routerSuccess && menuSuccess) {
    console.log('\n🎉 Records Explorer wired successfully!');
    console.log('📍 Route: /devel/records-explorer');
    console.log('🎯 Access: super_admin only');
  } else {
    console.log('\n❌ Some patches failed. Manual review required.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}