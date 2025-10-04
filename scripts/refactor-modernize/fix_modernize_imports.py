#!/usr/bin/env python3
"""
Fix missing imports and create necessary files for modernize template
"""

import os
import re
import json
import argparse
from pathlib import Path

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Fix imports and create necessary files for Modernize')
    parser.add_argument('--root-modernize', type=str, default='/var/www/orthodoxmetrics/prod/UI/modernize/frontend',
                       help='Modernize root directory')
    parser.add_argument('--dry-run', action='store_true',
                       help='Perform a dry run without actual file operations')
    return parser.parse_args()

def create_missing_contexts(modernize_path, dry_run=False):
    """Create missing context files"""
    print('📁 Creating missing context files...')
    
    contexts_dir = modernize_path / 'src' / 'contexts'
    if not dry_run:
        contexts_dir.mkdir(parents=True, exist_ok=True)
    
    # MenuVisibilityContext
    menu_visibility_content = '''import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MenuVisibilityContextType {
  isMenuVisible: boolean;
  toggleMenu: () => void;
  setMenuVisible: (visible: boolean) => void;
}

const MenuVisibilityContext = createContext<MenuVisibilityContextType | undefined>(undefined);

interface MenuVisibilityProviderProps {
  children: ReactNode;
}

export const MenuVisibilityProvider: React.FC<MenuVisibilityProviderProps> = ({ children }) => {
  const [isMenuVisible, setIsMenuVisible] = useState(true);

  const toggleMenu = () => {
    setIsMenuVisible(prev => !prev);
  };

  const setMenuVisible = (visible: boolean) => {
    setIsMenuVisible(visible);
  };

  const value: MenuVisibilityContextType = {
    isMenuVisible,
    toggleMenu,
    setMenuVisible,
  };

  return (
    <MenuVisibilityContext.Provider value={value}>
      {children}
    </MenuVisibilityContext.Provider>
  );
};

export const useMenuVisibility = () => {
  const context = useContext(MenuVisibilityContext);
  if (!context) {
    throw new Error('useMenuVisibility must be used within a MenuVisibilityProvider');
  }
  return context;
};

export default MenuVisibilityContext;
'''
    
    menu_file = contexts_dir / 'MenuVisibilityContext.tsx'
    if not menu_file.exists():
        if dry_run:
            print(f'  [DRY RUN] Would create: {menu_file}')
        else:
            with open(menu_file, 'w') as f:
                f.write(menu_visibility_content)
            print(f'  ✅ Created: {menu_file}')
    
    return ['MenuVisibilityContext.tsx']

def update_vite_config(modernize_path, dry_run=False):
    """Update vite.config.ts with proper aliases"""
    print('⚙️  Updating vite.config.ts...')
    
    vite_config_path = modernize_path / 'vite.config.ts'
    
    vite_content = '''import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'src': path.resolve(__dirname, 'src'),
      '@om': path.resolve(__dirname, 'src/@om')
    }
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
'''
    
    if dry_run:
        print(f'  [DRY RUN] Would update: {vite_config_path}')
    else:
        with open(vite_config_path, 'w') as f:
            f.write(vite_content)
        print(f'  ✅ Updated: {vite_config_path}')

def update_tsconfig(modernize_path, dry_run=False):
    """Update tsconfig.json with proper paths"""
    print('📝 Updating tsconfig.json...')
    
    tsconfig_path = modernize_path / 'tsconfig.json'
    
    tsconfig_content = '''{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "src/*": ["src/*"],
      "@om/*": ["src/@om/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
'''
    
    if dry_run:
        print(f'  [DRY RUN] Would update: {tsconfig_path}')
    else:
        with open(tsconfig_path, 'w') as f:
            f.write(tsconfig_content)
        print(f'  ✅ Updated: {tsconfig_path}')

def fix_import_paths(modernize_path, dry_run=False):
    """Fix import paths in all TypeScript/JavaScript files"""
    print('🔄 Fixing import paths...')
    
    src_path = modernize_path / 'src'
    files_fixed = 0
    
    for root, dirs, files in os.walk(src_path):
        if 'node_modules' in root:
            continue
            
        for file in files:
            if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
                file_path = Path(root) / file
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    original_content = content
                    
                    # Fix various import patterns
                    # Convert absolute imports from 'src/' to '@/'
                    content = re.sub(
                        r"from\s+['\"]src/([^'\"]+)['\"]",
                        r"from '@/\1'",
                        content
                    )
                    
                    # Convert require statements
                    content = re.sub(
                        r"require\s*\(\s*['\"]src/([^'\"]+)['\"]\s*\)",
                        r"require('@/\1')",
                        content
                    )
                    
                    # Fix @om imports if they exist
                    content = re.sub(
                        r"from\s+['\"]\/@om\/([^'\"]+)['\"]",
                        r"from '@om/\1'",
                        content
                    )
                    
                    if content != original_content:
                        if dry_run:
                            print(f'  [DRY RUN] Would fix imports in: {file_path.relative_to(modernize_path)}')
                        else:
                            with open(file_path, 'w', encoding='utf-8') as f:
                                f.write(content)
                            files_fixed += 1
                            
                except Exception as e:
                    print(f'  ⚠️  Error processing {file_path}: {e}')
    
    print(f'  ✅ Fixed imports in {files_fixed} files')
    return files_fixed

def create_index_exports(modernize_path, dry_run=False):
    """Create index.ts files for better exports"""
    print('📦 Creating index exports...')
    
    directories_to_index = [
        'components',
        'contexts', 
        'hooks',
        'utils',
        'services',
        'types',
        'features'
    ]
    
    src_path = modernize_path / 'src'
    
    for dir_name in directories_to_index:
        dir_path = src_path / dir_name
        if not dir_path.exists():
            continue
            
        # Find all exportable files
        exports = []
        for root, dirs, files in os.walk(dir_path):
            for file in files:
                if file.endswith(('.tsx', '.ts')) and file != 'index.ts':
                    file_path = Path(root) / file
                    relative_path = file_path.relative_to(dir_path)
                    module_path = str(relative_path.with_suffix('')).replace('\\', '/')
                    exports.append(f"export * from './{module_path}';")
        
        if exports:
            index_path = dir_path / 'index.ts'
            index_content = '\n'.join(sorted(exports)) + '\n'
            
            if dry_run:
                print(f'  [DRY RUN] Would create: {index_path}')
            else:
                with open(index_path, 'w') as f:
                    f.write(index_content)
                print(f'  ✅ Created: {index_path}')

def create_package_json(modernize_path, dry_run=False):
    """Create or update package.json with necessary dependencies"""
    print('📦 Creating/updating package.json...')
    
    package_json_path = modernize_path / 'package.json'
    
    package_content = {
        "name": "orthodox-metrics-modernize",
        "private": True,
        "version": "0.0.0",
        "type": "module",
        "scripts": {
            "dev": "vite",
            "build": "tsc && vite build",
            "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
            "preview": "vite preview"
        },
        "dependencies": {
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "react-router-dom": "^6.20.0",
            "@tanstack/react-query": "^5.12.0",
            "axios": "^1.6.2",
            "date-fns": "^2.30.0",
            "react-hook-form": "^7.48.0",
            "zod": "^3.22.4"
        },
        "devDependencies": {
            "@types/react": "^18.2.37",
            "@types/react-dom": "^18.2.15",
            "@typescript-eslint/eslint-plugin": "^6.10.0",
            "@typescript-eslint/parser": "^6.10.0",
            "@vitejs/plugin-react": "^4.2.0",
            "autoprefixer": "^10.4.16",
            "eslint": "^8.53.0",
            "eslint-plugin-react-hooks": "^4.6.0",
            "eslint-plugin-react-refresh": "^0.4.4",
            "postcss": "^8.4.31",
            "tailwindcss": "^3.3.5",
            "typescript": "^5.2.2",
            "vite": "^5.0.0"
        }
    }
    
    if dry_run:
        print(f'  [DRY RUN] Would create/update: {package_json_path}')
    else:
        with open(package_json_path, 'w') as f:
            json.dump(package_content, f, indent=2)
        print(f'  ✅ Created/updated: {package_json_path}')

def main():
    """Main function"""
    args = parse_args()
    
    print('🚀 Fixing Modernize imports and creating necessary files...')
    
    modernize_path = Path(args.root_modernize)
    
    if not modernize_path.exists():
        print(f'❌ Modernize path not found: {modernize_path}')
        return
    
    # Create missing contexts
    create_missing_contexts(modernize_path, args.dry_run)
    
    # Update configuration files
    update_vite_config(modernize_path, args.dry_run)
    update_tsconfig(modernize_path, args.dry_run)
    
    # Fix import paths
    fix_import_paths(modernize_path, args.dry_run)
    
    # Create index exports
    create_index_exports(modernize_path, args.dry_run)
    
    # Create/update package.json
    create_package_json(modernize_path, args.dry_run)
    
    print(f'\n✅ {"[DRY RUN] " if args.dry_run else ""}Modernize fixes complete!')

if __name__ == "__main__":
    main()
