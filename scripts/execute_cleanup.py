#!/usr/bin/env python3
"""
Execute legacy component cleanup
"""

import os
import re
from pathlib import Path
from collections import defaultdict
import shutil

def find_duplicates():
    """Find duplicate components"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    duplicate_groups = defaultdict(list)
    
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
                
                # Check for duplicate component names
                base_name = re.sub(r'\.(v\d+|old|backup|legacy|deprecated|unused|temp|bak|orig|copy|duplicate)$', '', file_name, flags=re.IGNORECASE)
                
                if base_name != file_name:
                    duplicate_groups[base_name].append({
                        'path': file_str,
                        'name': file_name,
                        'base_name': base_name,
                        'full_path': frontend_path / file_path
                    })
                else:
                    duplicate_groups[file_name].append({
                        'path': file_str,
                        'name': file_name,
                        'base_name': file_name,
                        'full_path': frontend_path / file_path
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
    
    return actual_duplicates

def cleanup_duplicates(duplicates, dry_run=True):
    """Clean up duplicate components"""
    print(f'🚀 Cleaning up duplicates (dry_run={dry_run})...')
    
    results = {
        'consolidated_files': [],
        'errors': []
    }
    
    for duplicate in duplicates:
        base_name = duplicate['base_name']
        versions = duplicate['versions']
        
        print(f'\n📦 Processing: {base_name} ({len(versions)} versions)')
        
        # Find the main version (prefer the one without version suffix)
        main_version = None
        for version in versions:
            if version['name'] == base_name:
                main_version = version
                break
        
        if not main_version:
            # If no exact match, use the first one
            main_version = versions[0]
        
        print(f'  🎯 Main version: {main_version["path"]}')
        
        # Process other versions
        for version in versions:
            if version['path'] == main_version['path']:
                continue
                
            version_path = version['full_path']
            
            if version_path.exists():
                if not dry_run:
                    try:
                        # Create backup before deletion
                        backup_path = version_path.with_suffix(version_path.suffix + '.cleanup_backup')
                        shutil.copy2(version_path, backup_path)
                        
                        # Delete the duplicate
                        version_path.unlink()
                        results['consolidated_files'].append({
                            'deleted': str(version_path),
                            'backup': str(backup_path),
                            'main': main_version['path']
                        })
                        print(f'  ✅ Consolidated: {version["path"]} -> {main_version["path"]}')
                    except Exception as e:
                        results['errors'].append(f'Error consolidating {version["path"]}: {e}')
                        print(f'  ❌ Error consolidating: {version["path"]} - {e}')
                else:
                    print(f'  🔍 Would consolidate: {version["path"]} -> {main_version["path"]}')
            else:
                print(f'  ⚠️  File not found: {version["path"]}')
    
    return results

def main():
    """Main function"""
    print('🚀 Starting duplicate component cleanup...')
    
    # Find duplicates
    duplicates = find_duplicates()
    
    print(f'📊 Found {len(duplicates)} duplicate groups')
    
    # Execute cleanup (dry run first)
    print('\n🔍 Executing dry run...')
    results = cleanup_duplicates(duplicates, dry_run=True)
    
    print(f'\n📊 Dry run results:')
    print(f'  Files to consolidate: {len(results["consolidated_files"])}')
    print(f'  Errors: {len(results["errors"])}')
    
    # Ask for confirmation
    print(f'\n❓ Proceed with actual cleanup? (y/N): ', end='')
    response = input().strip().lower()
    
    if response == 'y':
        print('\n🚀 Executing actual cleanup...')
        results = cleanup_duplicates(duplicates, dry_run=False)
        
        print(f'\n📊 Cleanup results:')
        print(f'  Files consolidated: {len(results["consolidated_files"])}')
        print(f'  Errors: {len(results["errors"])}')
        
        if results['errors']:
            print(f'\n❌ Errors encountered:')
            for error in results['errors']:
                print(f'  - {error}')
    else:
        print('❌ Cleanup cancelled')
    
    return results

if __name__ == "__main__":
    result = main()
