#!/usr/bin/env python3
"""
Generate migration strategy and mapping for Modernize template
"""

import os
import json
import argparse
from pathlib import Path
from collections import defaultdict

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Generate migration strategy for Modernize template')
    parser.add_argument('--src', type=str, default='/var/www/orthodoxmetrics/prod/front-end/src',
                       help='Source directory path')
    parser.add_argument('--dst', type=str, default='/var/www/orthodoxmetrics/prod/UI/modernize/frontend/src',
                       help='Destination directory path')
    parser.add_argument('--root-front', type=str, default='/var/www/orthodoxmetrics/prod/front-end',
                       help='Frontend root directory')
    parser.add_argument('--root-modernize', type=str, default='/var/www/orthodoxmetrics/prod/UI/modernize/frontend',
                       help='Modernize root directory')
    parser.add_argument('--output', type=str, default='./.refactor/move-map.json',
                       help='Output file path')
    return parser.parse_args()

def analyze_source_structure(src_path):
    """Analyze the source directory structure"""
    print('🔍 Analyzing source structure...')
    
    source_files = defaultdict(list)
    
    for root, dirs, files in os.walk(src_path):
        if 'node_modules' in root or '.git' in root:
            continue
            
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx')):
                file_path = Path(root) / file
                relative_path = file_path.relative_to(src_path)
                
                # Categorize by directory structure
                parts = relative_path.parts
                if len(parts) > 0:
                    category = parts[0]
                    source_files[category].append(str(relative_path))
    
    return source_files

def map_to_modernize_structure(source_files, src_path, dst_path):
    """Map source files to Modernize template structure"""
    print('🗺️  Creating migration mapping...')
    
    move_map = {}
    
    for category, files in source_files.items():
        for file_path in files:
            source_full = str(Path(src_path) / file_path)
            
            # Determine destination path based on file type and location
            if 'page' in file_path.lower() or file_path.endswith('Page.tsx'):
                # Pages go to views
                dest_path = Path('views') / Path(file_path).name
            elif 'component' in file_path.lower():
                # Components stay in components
                dest_path = Path('components') / Path(file_path).relative_to(Path(file_path).parts[0] if Path(file_path).parts[0] == 'components' else '')
            elif 'context' in file_path.lower():
                # Contexts go to contexts
                dest_path = Path('contexts') / Path(file_path).name
            elif 'hook' in file_path.lower():
                # Hooks go to hooks
                dest_path = Path('hooks') / Path(file_path).name
            elif 'util' in file_path.lower() or 'helper' in file_path.lower():
                # Utils go to utils
                dest_path = Path('utils') / Path(file_path).name
            elif 'service' in file_path.lower() or 'api' in file_path.lower():
                # Services go to services
                dest_path = Path('services') / Path(file_path).name
            elif 'type' in file_path.lower() or 'interface' in file_path.lower():
                # Types go to types
                dest_path = Path('types') / Path(file_path).name
            elif 'constant' in file_path.lower() or 'config' in file_path.lower():
                # Constants go to constants
                dest_path = Path('constants') / Path(file_path).name
            elif 'layout' in file_path.lower():
                # Layouts go to layouts
                dest_path = Path('layouts') / Path(file_path).name
            elif any(feature in file_path.lower() for feature in ['auth', 'record', 'church', 'admin', 'dashboard', 'setting']):
                # Feature-specific files go to features
                feature_name = None
                for feature in ['auth', 'records', 'church', 'admin', 'dashboard', 'settings']:
                    if feature in file_path.lower():
                        feature_name = feature
                        break
                if feature_name:
                    dest_path = Path('features') / feature_name / Path(file_path).name
                else:
                    dest_path = Path('features') / Path(file_path).name
            else:
                # Default: maintain relative structure
                dest_path = Path(file_path)
            
            # Create full destination path
            dest_full = str(Path(dst_path) / dest_path)
            
            move_map[source_full] = {
                'source': source_full,
                'destination': dest_full,
                'relative_source': file_path,
                'relative_destination': str(dest_path),
                'category': category,
                'action': 'copy'  # or 'move' if we want to delete source
            }
    
    return move_map

def identify_shared_components(move_map):
    """Identify components that should be shared across features"""
    print('🔄 Identifying shared components...')
    
    shared_patterns = [
        'button', 'input', 'form', 'table', 'modal', 'dialog',
        'card', 'list', 'menu', 'nav', 'header', 'footer',
        'loading', 'error', 'success', 'toast', 'notification'
    ]
    
    for source, mapping in move_map.items():
        file_name = Path(mapping['relative_source']).name.lower()
        
        # Check if this is a shared component
        if any(pattern in file_name for pattern in shared_patterns):
            # Move to shared components
            mapping['relative_destination'] = str(Path('components/shared') / Path(mapping['relative_source']).name)
            mapping['destination'] = str(Path(mapping['destination']).parent.parent / 'components/shared' / Path(mapping['relative_source']).name)
            mapping['shared'] = True

def add_modernize_specific_files(move_map, dst_path):
    """Add Modernize-specific configuration files that need to be created"""
    print('➕ Adding Modernize-specific files...')
    
    # These files need to be created, not copied
    modernize_files = {
        'vite.config.ts': {
            'destination': str(Path(dst_path).parent / 'vite.config.ts'),
            'action': 'create',
            'template': 'vite-config'
        },
        'tsconfig.json': {
            'destination': str(Path(dst_path).parent / 'tsconfig.json'),
            'action': 'create',
            'template': 'tsconfig'
        },
        'tailwind.config.js': {
            'destination': str(Path(dst_path).parent / 'tailwind.config.js'),
            'action': 'create',
            'template': 'tailwind-config'
        },
        'postcss.config.js': {
            'destination': str(Path(dst_path).parent / 'postcss.config.js'),
            'action': 'create',
            'template': 'postcss-config'
        },
        'package.json': {
            'destination': str(Path(dst_path).parent / 'package.json'),
            'action': 'merge',
            'template': 'package-json'
        }
    }
    
    for file_name, config in modernize_files.items():
        move_map[f'_modernize_{file_name}'] = config

def generate_migration_summary(move_map):
    """Generate a summary of the migration"""
    print('📊 Generating migration summary...')
    
    summary = {
        'total_files': len([m for m in move_map.values() if m.get('action') in ['copy', 'move']]),
        'files_to_create': len([m for m in move_map.values() if m.get('action') == 'create']),
        'files_to_merge': len([m for m in move_map.values() if m.get('action') == 'merge']),
        'by_category': defaultdict(int),
        'by_destination': defaultdict(int),
        'shared_components': len([m for m in move_map.values() if m.get('shared', False)])
    }
    
    for mapping in move_map.values():
        if 'category' in mapping:
            summary['by_category'][mapping['category']] += 1
        
        if 'relative_destination' in mapping:
            dest_category = Path(mapping['relative_destination']).parts[0] if Path(mapping['relative_destination']).parts else 'root'
            summary['by_destination'][dest_category] += 1
    
    return summary

def main():
    """Main function"""
    args = parse_args()
    
    print('🚀 Generating Modernize migration strategy...')
    
    # Create output directory if it doesn't exist
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Step 1: Analyze source structure
    source_files = analyze_source_structure(args.src)
    
    # Step 2: Create migration mapping
    move_map = map_to_modernize_structure(source_files, args.src, args.dst)
    
    # Step 3: Identify shared components
    identify_shared_components(move_map)
    
    # Step 4: Add Modernize-specific files
    add_modernize_specific_files(move_map, args.dst)
    
    # Step 5: Generate summary
    summary = generate_migration_summary(move_map)
    
    # Create output data
    output_data = {
        'metadata': {
            'source_path': args.src,
            'destination_path': args.dst,
            'frontend_root': args.root_front,
            'modernize_root': args.root_modernize,
            'total_mappings': len(move_map)
        },
        'summary': dict(summary),
        'mappings': move_map
    }
    
    # Write to JSON file
    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f'✅ Generated migration strategy: {args.output}')
    
    # Print summary
    print(f'\n🎉 Migration strategy complete!')
    print(f'📊 Summary:')
    print(f'  Total files to migrate: {summary["total_files"]}')
    print(f'  Files to create: {summary["files_to_create"]}')
    print(f'  Files to merge: {summary["files_to_merge"]}')
    print(f'  Shared components: {summary["shared_components"]}')
    print(f'\n  By destination:')
    for dest, count in sorted(summary['by_destination'].items()):
        print(f'    {dest}: {count}')
    
    return output_data

if __name__ == "__main__":
    result = main()
    print(f'\n📊 MIGRATION STRATEGY SUMMARY:')
    print(f'  Total mappings: {result["metadata"]["total_mappings"]}')
    print(f'  Source: {result["metadata"]["source_path"]}')
    print(f'  Destination: {result["metadata"]["destination_path"]}')
    print(f'  Output file: move-map.json')
