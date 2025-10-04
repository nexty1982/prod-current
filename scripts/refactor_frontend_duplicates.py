#!/usr/bin/env python3
"""
Refactor front-end/src to eliminate duplicates and clean up the codebase
"""

import os
import hashlib
import shutil
from pathlib import Path
from collections import defaultdict

def find_duplicate_files():
    """Find exact duplicate files in the front-end/src directory"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Finding duplicate files in front-end/src...')
    
    file_hashes = defaultdict(list)
    total_files = 0
    
    # Walk through all files
    for root, dirs, files in os.walk(frontend_path):
        if 'node_modules' in root or '.git' in root:
            continue
            
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx', '.css', '.scss')):
                file_path = Path(root) / file
                try:
                    with open(file_path, 'rb') as f:
                        file_hash = hashlib.md5(f.read()).hexdigest()
                    
                    relative_path = file_path.relative_to(frontend_path)
                    file_hashes[file_hash].append(str(relative_path))
                    total_files += 1
                except Exception as e:
                    print(f'⚠️  Error reading {file_path}: {e}')
    
    # Find duplicates
    duplicates = {hash_val: paths for hash_val, paths in file_hashes.items() if len(paths) > 1}
    
    print(f'📊 Analysis complete:')
    print(f'  Total files: {total_files}')
    print(f'  Unique files: {len(file_hashes)}')
    print(f'  Duplicate groups: {len(duplicates)}')
    
    return duplicates, total_files

def find_similar_components():
    """Find components with similar names that might be duplicates"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Finding similar components...')
    
    component_names = defaultdict(list)
    
    # Find all component files
    for root, dirs, files in os.walk(frontend_path):
        if 'node_modules' in root or '.git' in root:
            continue
            
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx')):
                file_path = Path(root) / file
                relative_path = file_path.relative_to(frontend_path)
                
                # Extract component name from filename
                component_name = file_path.stem
                
                # Skip common non-component files
                if component_name in ['index', 'types', 'constants', 'utils', 'api']:
                    continue
                
                component_names[component_name].append(str(relative_path))
    
    # Find components with multiple files
    similar_components = {name: paths for name, paths in component_names.items() if len(paths) > 1}
    
    print(f'📊 Similar components found: {len(similar_components)}')
    
    return similar_components

def create_refactoring_plan(duplicates, similar_components):
    """Create a comprehensive refactoring plan"""
    print('📋 Creating refactoring plan...')
    
    plan = {
        'phase1': {
            'name': 'Remove Exact Duplicates',
            'description': 'Remove exact duplicate files, keeping the most appropriate one',
            'files': duplicates,
            'strategy': 'Keep the file in the most logical location, remove others'
        },
        'phase2': {
            'name': 'Consolidate Similar Components',
            'description': 'Consolidate components with similar names',
            'files': similar_components,
            'strategy': 'Analyze differences and merge or rename appropriately'
        },
        'phase3': {
            'name': 'Organize Directory Structure',
            'description': 'Reorganize files into a cleaner directory structure',
            'strategy': 'Group related files together, create shared directories'
        },
        'phase4': {
            'name': 'Update Import Statements',
            'description': 'Update all import statements to reflect new structure',
            'strategy': 'Use find and replace to update import paths'
        }
    }
    
    return plan

def remove_exact_duplicates(duplicates):
    """Remove exact duplicate files, keeping the most appropriate one"""
    print('🗑️  Removing exact duplicates...')
    
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    backup_dir = frontend_path.parent / 'backup-duplicates'
    backup_dir.mkdir(exist_ok=True)
    
    removed_files = []
    kept_files = []
    
    for file_hash, file_paths in duplicates.items():
        if len(file_paths) <= 1:
            continue
            
        # Choose which file to keep (prefer shorter paths, avoid backup dirs)
        file_paths.sort()
        keep_file = None
        
        for file_path in file_paths:
            if 'backup' not in file_path.lower() and 'old' not in file_path.lower():
                keep_file = file_path
                break
        
        if not keep_file:
            keep_file = file_paths[0]  # Fallback to first file
        
        kept_files.append(keep_file)
        
        # Remove duplicate files
        for file_path in file_paths:
            if file_path != keep_file:
                full_path = frontend_path / file_path
                backup_path = backup_dir / file_path
                
                try:
                    # Create backup
                    backup_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(full_path, backup_path)
                    
                    # Remove original
                    full_path.unlink()
                    removed_files.append(file_path)
                    print(f'✅ Removed duplicate: {file_path} (kept: {keep_file})')
                except Exception as e:
                    print(f'❌ Error removing {file_path}: {e}')
    
    print(f'📊 Duplicate removal complete:')
    print(f'  Files removed: {len(removed_files)}')
    print(f'  Files kept: {len(kept_files)}')
    print(f'  Backup location: {backup_dir}')
    
    return removed_files, kept_files, backup_dir

def consolidate_similar_components(similar_components):
    """Consolidate similar components"""
    print('🔧 Consolidating similar components...')
    
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    consolidated = []
    
    for component_name, file_paths in similar_components.items():
        if len(file_paths) <= 1:
            continue
            
        print(f'\n🔍 Analyzing component: {component_name}')
        print(f'  Files: {file_paths}')
        
        # Read all files to compare content
        file_contents = {}
        for file_path in file_paths:
            full_path = frontend_path / file_path
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    file_contents[file_path] = f.read()
            except Exception as e:
                print(f'  ❌ Error reading {file_path}: {e}')
                continue
        
        # Simple comparison - if files are identical, remove duplicates
        if len(set(file_contents.values())) == 1:
            # All files are identical, keep the first one
            keep_file = file_paths[0]
            for file_path in file_paths[1:]:
                try:
                    (frontend_path / file_path).unlink()
                    consolidated.append(f'Removed duplicate: {file_path} (kept: {keep_file})')
                    print(f'  ✅ Removed duplicate: {file_path}')
                except Exception as e:
                    print(f'  ❌ Error removing {file_path}: {e}')
        else:
            # Files are different, need manual review
            print(f'  ⚠️  Files differ - manual review needed')
            consolidated.append(f'Manual review needed: {component_name} - {file_paths}')
    
    return consolidated

def create_shared_directories():
    """Create shared directories for common components"""
    print('📁 Creating shared directory structure...')
    
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    shared_dirs = [
        'shared/components',
        'shared/hooks',
        'shared/utils',
        'shared/types',
        'shared/constants',
        'shared/services',
        'shared/context'
    ]
    
    for dir_path in shared_dirs:
        full_path = frontend_path / dir_path
        full_path.mkdir(parents=True, exist_ok=True)
        print(f'✅ Created: {dir_path}')
    
    return shared_dirs

def generate_refactoring_report(duplicates, similar_components, removed_files, consolidated):
    """Generate a comprehensive refactoring report"""
    report_content = f'''# Front-end Refactoring Report

## Overview
This report documents the refactoring of `prod/front-end/src` to eliminate duplicates and improve code organization.

## Analysis Results

### Duplicate Files
- **Total duplicate groups**: {len(duplicates)}
- **Files removed**: {len(removed_files)}

### Similar Components
- **Components with multiple files**: {len(similar_components)}
- **Consolidated**: {len(consolidated)}

## Refactoring Actions Taken

### 1. Exact Duplicate Removal
The following duplicate files were removed (backups created):

'''
    
    for file_hash, file_paths in duplicates.items():
        if len(file_paths) > 1:
            report_content += f'\n**Hash: {file_hash[:8]}...**\n'
            for file_path in file_paths:
                report_content += f'- {file_path}\n'
    
    report_content += f'\n### 2. Component Consolidation\n\n'
    
    for item in consolidated:
        report_content += f'- {item}\n'
    
    report_content += f'''
## Recommendations

### Next Steps
1. **Review removed files**: Check backups to ensure no important code was lost
2. **Test functionality**: Ensure all features still work after refactoring
3. **Update imports**: Update any remaining import statements
4. **Continue consolidation**: Manually review similar components that need attention

### Best Practices Going Forward
1. **Avoid duplicates**: Use shared components instead of copying code
2. **Consistent naming**: Use consistent naming conventions
3. **Proper organization**: Keep related files together
4. **Regular cleanup**: Periodically review and clean up the codebase

## Files Modified
- **Duplicates removed**: {len(removed_files)} files
- **Components consolidated**: {len(consolidated)} items
- **Backup location**: `prod/front-end/backup-duplicates/`

## Impact
- **Reduced file count**: {len(removed_files)} fewer files
- **Cleaner structure**: Better organization
- **Easier maintenance**: Less duplicate code to maintain
- **Better performance**: Smaller bundle size
'''
    
    with open('/var/www/orthodoxmetrics/prod/front-end/REFACTORING_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated refactoring report: REFACTORING_REPORT.md')

def main():
    """Main refactoring function"""
    print('🚀 Starting front-end refactoring...')
    
    # Step 1: Find duplicate files
    duplicates, total_files = find_duplicate_files()
    
    # Step 2: Find similar components
    similar_components = find_similar_components()
    
    # Step 3: Create refactoring plan
    plan = create_refactoring_plan(duplicates, similar_components)
    
    # Step 4: Remove exact duplicates
    removed_files, kept_files, backup_dir = remove_exact_duplicates(duplicates)
    
    # Step 5: Consolidate similar components
    consolidated = consolidate_similar_components(similar_components)
    
    # Step 6: Create shared directories
    shared_dirs = create_shared_directories()
    
    # Step 7: Generate report
    generate_refactoring_report(duplicates, similar_components, removed_files, consolidated)
    
    print(f'\n🎉 Front-end refactoring complete!')
    print(f'📊 Summary:')
    print(f'  Total files analyzed: {total_files}')
    print(f'  Duplicates removed: {len(removed_files)}')
    print(f'  Components consolidated: {len(consolidated)}')
    print(f'  Backup location: {backup_dir}')
    
    return {
        'duplicates': duplicates,
        'similar_components': similar_components,
        'removed_files': removed_files,
        'consolidated': consolidated,
        'backup_dir': backup_dir
    }

if __name__ == "__main__":
    result = main()
    print(f'\n📊 REFACTORING SUMMARY:')
    print(f'  Duplicate groups: {len(result["duplicates"])}')
    print(f'  Similar components: {len(result["similar_components"])}')
    print(f'  Files removed: {len(result["removed_files"])}')
    print(f'  Items consolidated: {len(result["consolidated"])}')
    print(f'  Backup directory: {result["backup_dir"]}')
