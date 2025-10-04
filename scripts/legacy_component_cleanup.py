#!/usr/bin/env python3
"""
Clean up legacy component versions in the existing front-end
"""

import os
import re
from pathlib import Path
from collections import defaultdict
import shutil

def analyze_legacy_components():
    """Analyze legacy components and identify duplicates"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Analyzing legacy components for cleanup...')
    
    # Track component versions and duplicates
    component_versions = defaultdict(list)
    duplicate_components = []
    legacy_patterns = []
    
    # Common legacy patterns
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
                    legacy_patterns.append({
                        'path': file_str,
                        'name': file_name,
                        'type': 'legacy_pattern'
                    })
                    continue
                
                # Check for duplicate component names
                base_name = re.sub(r'\.(v\d+|old|backup|legacy|deprecated|unused|temp|bak|orig|copy|duplicate)$', '', file_name, flags=re.IGNORECASE)
                
                if base_name != file_name:
                    component_versions[base_name].append({
                        'path': file_str,
                        'name': file_name,
                        'base_name': base_name
                    })
                else:
                    component_versions[file_name].append({
                        'path': file_str,
                        'name': file_name,
                        'base_name': file_name
                    })
    
    # Find duplicates
    for base_name, versions in component_versions.items():
        if len(versions) > 1:
            duplicate_components.append({
                'base_name': base_name,
                'versions': versions,
                'count': len(versions)
            })
    
    return {
        'legacy_patterns': legacy_patterns,
        'duplicate_components': duplicate_components,
        'component_versions': component_versions
    }

def create_cleanup_plan(analysis):
    """Create a cleanup plan based on analysis"""
    print('📋 Creating cleanup plan...')
    
    plan = {
        'phase1_remove_legacy': {
            'name': 'Phase 1: Remove Legacy Pattern Files',
            'description': 'Remove files with obvious legacy patterns',
            'files': analysis['legacy_patterns'],
            'action': 'delete'
        },
        'phase2_consolidate_duplicates': {
            'name': 'Phase 2: Consolidate Duplicate Components',
            'description': 'Consolidate duplicate component versions',
            'files': analysis['duplicate_components'],
            'action': 'consolidate'
        },
        'phase3_optimize_imports': {
            'name': 'Phase 3: Optimize Import References',
            'description': 'Update import statements to use consolidated components',
            'files': [],
            'action': 'update_imports'
        }
    }
    
    return plan

def execute_cleanup_plan(plan, dry_run=True):
    """Execute the cleanup plan"""
    print(f'🚀 Executing cleanup plan (dry_run={dry_run})...')
    
    results = {
        'deleted_files': [],
        'consolidated_files': [],
        'updated_imports': [],
        'errors': []
    }
    
    # Phase 1: Remove legacy pattern files
    print('\n📁 Phase 1: Removing legacy pattern files...')
    for file_info in plan['phase1_remove_legacy']['files']:
        file_path = Path('/var/www/orthodoxmetrics/prod/front-end/src') / file_info['path']
        
        if file_path.exists():
            if not dry_run:
                try:
                    file_path.unlink()
                    results['deleted_files'].append(str(file_path))
                    print(f'  ✅ Deleted: {file_info["path"]}')
                except Exception as e:
                    results['errors'].append(f'Error deleting {file_info["path"]}: {e}')
                    print(f'  ❌ Error deleting: {file_info["path"]} - {e}')
            else:
                print(f'  🔍 Would delete: {file_info["path"]}')
        else:
            print(f'  ⚠️  File not found: {file_info["path"]}')
    
    # Phase 2: Consolidate duplicate components
    print('\n🔄 Phase 2: Consolidating duplicate components...')
    for duplicate in plan['phase2_consolidate_duplicates']['files']:
        base_name = duplicate['base_name']
        versions = duplicate['versions']
        
        print(f'\n  📦 Consolidating: {base_name} ({len(versions)} versions)')
        
        # Find the most recent/main version
        main_version = None
        for version in versions:
            if not any(pattern in version['name'].lower() for pattern in ['old', 'backup', 'legacy', 'deprecated', 'unused', 'temp', 'bak', 'orig', 'copy', 'duplicate']):
                main_version = version
                break
        
        if not main_version:
            # If no clear main version, use the first one
            main_version = versions[0]
        
        print(f'    🎯 Main version: {main_version["path"]}')
        
        # Process other versions
        for version in versions:
            if version['path'] == main_version['path']:
                continue
                
            version_path = Path('/var/www/orthodoxmetrics/prod/front-end/src') / version['path']
            
            if version_path.exists():
                if not dry_run:
                    try:
                        # Create backup before deletion
                        backup_path = version_path.with_suffix(version_path.suffix + '.backup')
                        shutil.copy2(version_path, backup_path)
                        
                        # Delete the duplicate
                        version_path.unlink()
                        results['consolidated_files'].append({
                            'deleted': str(version_path),
                            'backup': str(backup_path),
                            'main': main_version['path']
                        })
                        print(f'    ✅ Consolidated: {version["path"]} -> {main_version["path"]}')
                    except Exception as e:
                        results['errors'].append(f'Error consolidating {version["path"]}: {e}')
                        print(f'    ❌ Error consolidating: {version["path"]} - {e}')
                else:
                    print(f'    🔍 Would consolidate: {version["path"]} -> {main_version["path"]}')
            else:
                print(f'    ⚠️  File not found: {version["path"]}')
    
    return results

def generate_cleanup_report(analysis, plan, results):
    """Generate a cleanup report"""
    print('📊 Generating cleanup report...')
    
    report_content = f'''# Legacy Component Cleanup Report

## Overview
This report documents the cleanup of legacy component versions in the front-end codebase.

## Analysis Summary
- **Legacy Pattern Files**: {len(analysis['legacy_patterns'])}
- **Duplicate Components**: {len(analysis['duplicate_components'])}
- **Total Component Versions**: {sum(len(versions) for versions in analysis['component_versions'].values())}

## Cleanup Plan

### Phase 1: Remove Legacy Pattern Files
**Files to Remove**: {len(plan['phase1_remove_legacy']['files'])}

'''
    
    # Add legacy files
    for file_info in plan['phase1_remove_legacy']['files']:
        report_content += f'- **{file_info["name"]}** - `{file_info["path"]}`\n'
    
    report_content += f'''
### Phase 2: Consolidate Duplicate Components
**Duplicate Groups**: {len(plan['phase2_consolidate_duplicates']['files'])}

'''
    
    # Add duplicate components
    for duplicate in plan['phase2_consolidate_duplicates']['files']:
        report_content += f'\n#### {duplicate["base_name"]} ({duplicate["count"]} versions)\n'
        for version in duplicate['versions']:
            report_content += f'- **{version["name"]}** - `{version["path"]}`\n'
    
    report_content += f'''
## Cleanup Results

### Files Deleted
**Total**: {len(results['deleted_files'])}

'''
    
    for file_path in results['deleted_files']:
        report_content += f'- `{file_path}`\n'
    
    report_content += f'''
### Files Consolidated
**Total**: {len(results['consolidated_files'])}

'''
    
    for consolidation in results['consolidated_files']:
        report_content += f'- **Deleted**: `{consolidation["deleted"]}`\n'
        report_content += f'  - **Backup**: `{consolidation["backup"]}`\n'
        report_content += f'  - **Main**: `{consolidation["main"]}`\n\n'
    
    if results['errors']:
        report_content += f'''
### Errors
**Total**: {len(results['errors'])}

'''
        for error in results['errors']:
            report_content += f'- {error}\n'
    
    report_content += f'''
## Recommendations

1. **Review Backups**: Check backup files before permanent deletion
2. **Update Imports**: Update all import statements to use consolidated components
3. **Test Functionality**: Test the application after cleanup
4. **Document Changes**: Document any breaking changes

## Next Steps

1. Review the cleanup plan
2. Execute cleanup (dry run first)
3. Test the application
4. Update import statements
5. Remove backup files after verification
'''
    
    with open('/var/www/orthodoxmetrics/prod/front-end/LEGACY_CLEANUP_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated cleanup report: LEGACY_CLEANUP_REPORT.md')

def main():
    """Main function"""
    print('🚀 Starting legacy component cleanup...')
    
    # Step 1: Analyze legacy components
    analysis = analyze_legacy_components()
    
    # Step 2: Create cleanup plan
    plan = create_cleanup_plan(analysis)
    
    # Step 3: Execute cleanup (dry run first)
    print('\n🔍 Executing dry run...')
    results = execute_cleanup_plan(plan, dry_run=True)
    
    # Step 4: Generate report
    generate_cleanup_report(analysis, plan, results)
    
    print(f'\n🎉 Legacy cleanup analysis complete!')
    print(f'📊 Summary:')
    print(f'  Legacy pattern files: {len(analysis["legacy_patterns"])}')
    print(f'  Duplicate components: {len(analysis["duplicate_components"])}')
    print(f'  Total component versions: {sum(len(versions) for versions in analysis["component_versions"].values())}')
    print(f'  Files to delete: {len(results["deleted_files"])}')
    print(f'  Files to consolidate: {len(results["consolidated_files"])}')
    print(f'  Report: LEGACY_CLEANUP_REPORT.md')
    
    return {
        'analysis': analysis,
        'plan': plan,
        'results': results
    }

if __name__ == "__main__":
    result = main()
    print(f'\n📊 CLEANUP SUMMARY:')
    print(f'  Legacy files: {len(result["analysis"]["legacy_patterns"])}')
    print(f'  Duplicates: {len(result["analysis"]["duplicate_components"])}')
    print(f'  To delete: {len(result["results"]["deleted_files"])}')
    print(f'  To consolidate: {len(result["results"]["consolidated_files"])}')
    print(f'  Report: LEGACY_CLEANUP_REPORT.md')
