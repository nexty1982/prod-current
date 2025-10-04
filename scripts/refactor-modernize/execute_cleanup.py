#!/usr/bin/env python3
"""
Execute migration based on move-map.json
"""

import os
import json
import shutil
import argparse
from pathlib import Path

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Execute migration based on move-map.json')
    parser.add_argument('--map', type=str, default='./.refactor/move-map.json',
                       help='Path to move-map.json file')
    parser.add_argument('--src-root', type=str, default='/var/www/orthodoxmetrics/prod/front-end',
                       help='Source root directory')
    parser.add_argument('--dst-root', type=str, default='/var/www/orthodoxmetrics/prod/UI/modernize/frontend',
                       help='Destination root directory')
    parser.add_argument('--dry-run', action='store_true',
                       help='Perform a dry run without actual file operations')
    return parser.parse_args()

def load_move_map(map_file):
    """Load the move map from JSON file"""
    print(f'📋 Loading move map from {map_file}...')
    
    if not Path(map_file).exists():
        print(f'❌ Move map file not found: {map_file}')
        return None
    
    with open(map_file, 'r') as f:
        data = json.load(f)
    
    return data

def execute_copy_operations(move_map, dry_run=False):
    """Execute copy operations based on move map"""
    print(f'📁 Executing copy operations (dry_run={dry_run})...')
    
    mappings = move_map.get('mappings', {})
    summary = move_map.get('summary', {})
    
    results = {
        'successful': 0,
        'failed': 0,
        'skipped': 0,
        'errors': []
    }
    
    for source, mapping in mappings.items():
        action = mapping.get('action', 'copy')
        
        # Skip special actions for now
        if action in ['create', 'merge']:
            results['skipped'] += 1
            continue
        
        source_path = Path(mapping['source'])
        dest_path = Path(mapping['destination'])
        
        # Ensure source exists
        if not source_path.exists():
            results['failed'] += 1
            results['errors'].append(f'Source not found: {source_path}')
            continue
        
        # Create destination directory
        dest_dir = dest_path.parent
        if not dry_run:
            dest_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            if dry_run:
                print(f'  [DRY RUN] Would copy: {source_path} → {dest_path}')
            else:
                shutil.copy2(source_path, dest_path)
                print(f'  ✅ Copied: {source_path} → {dest_path}')
            
            results['successful'] += 1
            
        except Exception as e:
            results['failed'] += 1
            results['errors'].append(f'Failed to copy {source_path}: {str(e)}')
            print(f'  ❌ Failed: {source_path} - {str(e)}')
    
    return results

def execute_create_operations(move_map, dst_root, dry_run=False):
    """Execute create operations for Modernize-specific files"""
    print(f'🏗️  Creating Modernize-specific files (dry_run={dry_run})...')
    
    mappings = move_map.get('mappings', {})
    results = {
        'created': 0,
        'errors': []
    }
    
    # Templates for files to create
    templates = {
        'vite-config': '''import { defineConfig } from 'vite'
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
  }
})
''',
        'tsconfig': '''{
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
''',
        'tailwind-config': '''/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
''',
        'postcss-config': '''export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
'''
    }
    
    for source, mapping in mappings.items():
        if mapping.get('action') != 'create':
            continue
        
        dest_path = Path(mapping['destination'])
        template_name = mapping.get('template', '')
        
        if template_name in templates:
            try:
                if dry_run:
                    print(f'  [DRY RUN] Would create: {dest_path}')
                else:
                    dest_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(dest_path, 'w') as f:
                        f.write(templates[template_name])
                    print(f'  ✅ Created: {dest_path}')
                
                results['created'] += 1
                
            except Exception as e:
                results['errors'].append(f'Failed to create {dest_path}: {str(e)}')
                print(f'  ❌ Failed: {dest_path} - {str(e)}')
    
    return results

def copy_public_assets(src_root, dst_root, dry_run=False):
    """Copy public assets like images"""
    print(f'🖼️  Copying public assets (dry_run={dry_run})...')
    
    public_src = Path(src_root) / 'public'
    public_dst = Path(dst_root) / 'public'
    
    if not public_src.exists():
        print('  ⚠️  No public directory found in source')
        return
    
    if not dry_run:
        public_dst.mkdir(parents=True, exist_ok=True)
    
    # Copy images directory if it exists
    images_src = public_src / 'images'
    if images_src.exists():
        images_dst = public_dst / 'images'
        
        try:
            if dry_run:
                print(f'  [DRY RUN] Would copy: {images_src} → {images_dst}')
            else:
                shutil.copytree(images_src, images_dst, dirs_exist_ok=True)
                print(f'  ✅ Copied: {images_src} → {images_dst}')
        except Exception as e:
            print(f'  ❌ Failed to copy images: {str(e)}')

def main():
    """Main function"""
    args = parse_args()
    
    print('🚀 Executing migration...')
    
    # Load move map
    move_data = load_move_map(args.map)
    if not move_data:
        return
    
    # Execute copy operations
    copy_results = execute_copy_operations(move_data, args.dry_run)
    
    # Execute create operations
    create_results = execute_create_operations(move_data, args.dst_root, args.dry_run)
    
    # Copy public assets
    copy_public_assets(args.src_root, args.dst_root, args.dry_run)
    
    # Print summary
    print(f'\n📊 Migration Summary:')
    print(f'  Files copied: {copy_results["successful"]}')
    print(f'  Files failed: {copy_results["failed"]}')
    print(f'  Files skipped: {copy_results["skipped"]}')
    print(f'  Files created: {create_results["created"]}')
    
    if copy_results['errors']:
        print(f'\n❌ Copy Errors:')
        for error in copy_results['errors'][:10]:  # Show first 10 errors
            print(f'  - {error}')
        if len(copy_results['errors']) > 10:
            print(f'  ... and {len(copy_results["errors"]) - 10} more')
    
    if create_results['errors']:
        print(f'\n❌ Create Errors:')
        for error in create_results['errors']:
            print(f'  - {error}')
    
    print(f'\n{"[DRY RUN] " if args.dry_run else ""}Migration complete!')

if __name__ == "__main__":
    main()