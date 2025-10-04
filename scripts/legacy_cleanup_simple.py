#!/usr/bin/env python3
"""
Simple legacy component cleanup
"""

import os
import re
from pathlib import Path
from collections import defaultdict

def find_legacy_files():
    """Find files with legacy patterns"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Finding legacy files...')
    
    legacy_files = []
    duplicate_groups = defaultdict(list)
    
    # Legacy patterns
    legacy_patterns = [
        r'.*\.old\.',
        r'.*\.backup\.',
        r'.*\.legacy\.',
        r'.*\.v1\.',
        r'.*\.v2\.',
        r'.*\.deprecated\.',
        r'.*\.unused\.',
        r'.*\.temp\.',
        r'.*\.bak\.',
        r'.*\.orig\.',
        r'.*\.copy\.',
        r'.*\.duplicate\.',
        r'.*\.old$',
        r'.*\.backup$',
        r'.*\.legacy$',
        r'.*\.deprecated$',
        r'.*\.unused$',
        r'.*\.temp$',
        r'.*\.bak$',
        r'.*\.orig$',
        r'.*\.copy$',
        r'.*\.duplicate$'
    ]
    
    # Walk through all files
    for root, dirs, files in os.walk(frontend_path):
        if 'node_modules' in root or '.git' in root:
            continue
            
        relative_path = Path(root).relative_to(frontend_path)
        
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx')):
                file_path = relative_path / file
                file_str = str(file_path)
                file_name = file_path.stem
                
                # Check for legacy patterns
                is_legacy = False
                for pattern in legacy_patterns:
                    if re.match(pattern, file_name, re.IGNORECASE):
                        is_legacy = True
                        break
                
                if is_legacy:
                    legacy_files.append({
                        'path': file_str,
                        'name': file_name
                    })
                    continue
                
                # Check for duplicate component names
                base_name = re.sub(r'\.(v\d+|old|backup|legacy|deprecated|unused|temp|bak|orig|copy|duplicate)$', '', file_name, flags=re.IGNORECASE)
                
                if base_name != file_name:
                    duplicate_groups[base_name].append({
                        'path': file_str,
                        'name': file_name,
                        'base_name': base_name
                    })
                else:
                    duplicate_groups[file_name].append({
                        'path': file_str,
                        'name': file_name,
                        'base_name': file_name
                    })
    
    # Find actual duplicates
    actual_duplicates = []
    for base_name, versions in duplicate_groups.items():
        if len(versions) > 1:
            actual_duplicates.append({
                'base_name': base_name,
                'versions': versions,
                'count': len(versions)
            })
    
    return legacy_files, actual_duplicates

def main():
    """Main function"""
    print('🚀 Starting legacy component analysis...')
    
    # Find legacy files and duplicates
    legacy_files, duplicates = find_legacy_files()
    
    print(f'\n📊 Analysis Results:')
    print(f'  Legacy files found: {len(legacy_files)}')
    print(f'  Duplicate groups: {len(duplicates)}')
    
    if legacy_files:
        print(f'\n📁 Legacy Files:')
        for file_info in legacy_files:
            print(f'  - {file_info["name"]} - {file_info["path"]}')
    
    if duplicates:
        print(f'\n🔄 Duplicate Components:')
        for duplicate in duplicates:
            print(f'  📦 {duplicate["base_name"]} ({duplicate["count"]} versions):')
            for version in duplicate['versions']:
                print(f'    - {version["name"]} - {version["path"]}')
    
    print(f'\n🎉 Analysis complete!')
    return legacy_files, duplicates

if __name__ == "__main__":
    result = main()
