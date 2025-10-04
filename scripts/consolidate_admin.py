#!/usr/bin/env python3
"""
Consolidate admin components into features/admin-centralized/
"""

import os
import shutil
from pathlib import Path
import re

def identify_admin_components():
    """Identify all admin-related components"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Identifying admin components...')
    
    admin_components = []
    admin_patterns = ['admin', 'management', 'control', 'dashboard', 'settings', 'config', 'system', 'user', 'role', 'permission', 'access', 'log', 'audit']
    
    # Walk through all files
    for root, dirs, files in os.walk(frontend_path):
        if 'node_modules' in root or '.git' in root or 'backup' in root:
            continue
            
        relative_path = Path(root).relative_to(frontend_path)
        
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx')):
                file_path = relative_path / file
                file_str = str(file_path)
                file_name = file_path.stem
                
                # Check if it's an admin component
                is_admin_component = False
                for pattern in admin_patterns:
                    if pattern.lower() in file_name.lower() or pattern.lower() in str(relative_path).lower():
                        is_admin_component = True
                        break
                
                if is_admin_component:
                    admin_components.append({
                        'path': file_str,
                        'name': file_name,
                        'full_path': frontend_path / file_path,
                        'category': 'admin'
                    })
    
    return admin_components

def create_admin_centralized_structure():
    """Create the admin-centralized directory structure"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    admin_path = frontend_path / 'features' / 'admin-centralized'
    
    print('📁 Creating admin-centralized structure...')
    
    # Create directory structure
    directories = [
        'components',
        'components/dashboard',
        'components/management',
        'components/settings',
        'components/users',
        'components/roles',
        'components/permissions',
        'components/logs',
        'components/audit',
        'hooks',
        'services',
        'types',
        'utils',
        'constants',
        'styles'
    ]
    
    for directory in directories:
        dir_path = admin_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f'  ✅ Created: {directory}')
    
    return admin_path

def categorize_admin_components(admin_components):
    """Categorize admin components by type"""
    print('📋 Categorizing admin components...')
    
    categories = {
        'dashboard': [],
        'management': [],
        'settings': [],
        'users': [],
        'roles': [],
        'permissions': [],
        'logs': [],
        'audit': [],
        'other': []
    }
    
    for comp in admin_components:
        name = comp['name'].lower()
        path = comp['path'].lower()
        
        if 'dashboard' in name or 'dashboard' in path:
            categories['dashboard'].append(comp)
        elif 'user' in name or 'user' in path:
            categories['users'].append(comp)
        elif 'role' in name or 'role' in path:
            categories['roles'].append(comp)
        elif 'permission' in name or 'permission' in path or 'access' in name or 'access' in path:
            categories['permissions'].append(comp)
        elif 'log' in name or 'log' in path:
            categories['logs'].append(comp)
        elif 'audit' in name or 'audit' in path:
            categories['audit'].append(comp)
        elif 'setting' in name or 'setting' in path or 'config' in name or 'config' in path:
            categories['settings'].append(comp)
        elif 'management' in name or 'management' in path or 'control' in name or 'control' in path:
            categories['management'].append(comp)
        else:
            categories['other'].append(comp)
    
    return categories

def move_admin_components(admin_components, admin_path):
    """Move admin components to admin-centralized"""
    print('🔄 Moving admin components...')
    
    results = {
        'moved_files': [],
        'backup_files': [],
        'errors': []
    }
    
    for comp in admin_components:
        source_path = comp['full_path']
        relative_path = comp['path']
        
        # Determine target directory based on component type
        if 'dashboard' in comp['name'].lower():
            target_dir = admin_path / 'components' / 'dashboard'
        elif 'user' in comp['name'].lower():
            target_dir = admin_path / 'components' / 'users'
        elif 'role' in comp['name'].lower():
            target_dir = admin_path / 'components' / 'roles'
        elif 'permission' in comp['name'].lower() or 'access' in comp['name'].lower():
            target_dir = admin_path / 'components' / 'permissions'
        elif 'log' in comp['name'].lower():
            target_dir = admin_path / 'components' / 'logs'
        elif 'audit' in comp['name'].lower():
            target_dir = admin_path / 'components' / 'audit'
        elif 'setting' in comp['name'].lower() or 'config' in comp['name'].lower():
            target_dir = admin_path / 'components' / 'settings'
        elif 'management' in comp['name'].lower() or 'control' in comp['name'].lower():
            target_dir = admin_path / 'components' / 'management'
        else:
            target_dir = admin_path / 'components'
        
        # Create target directory
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Create target file path
        target_path = target_dir / source_path.name
        
        if source_path.exists():
            try:
                # Create backup
                backup_path = source_path.with_suffix(source_path.suffix + '.admin_backup')
                shutil.copy2(source_path, backup_path)
                
                # Move file
                shutil.move(str(source_path), str(target_path))
                
                results['moved_files'].append({
                    'source': str(relative_path),
                    'target': str(target_path.relative_to(admin_path.parent)),
                    'backup': str(backup_path)
                })
                
                print(f'  ✅ Moved: {relative_path} -> {target_path.relative_to(admin_path.parent)}')
                
            except Exception as e:
                error_msg = f'Error moving {relative_path}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
        else:
            print(f'  ⚠️  File not found: {relative_path}')
    
    return results

def create_admin_index_files(admin_path):
    """Create index files for admin-centralized"""
    print('📦 Creating index files...')
    
    # Main index file
    main_index = '''// Admin Centralized - Main Export
export * from './components';
export * from './hooks';
export * from './services';
export * from './types';
export * from './utils';
export * from './constants';
'''
    
    with open(admin_path / 'index.ts', 'w') as f:
        f.write(main_index)
    
    # Components index
    components_index = '''// Admin Components
export * from './dashboard';
export * from './management';
export * from './settings';
export * from './users';
export * from './roles';
export * from './permissions';
export * from './logs';
export * from './audit';
'''
    
    with open(admin_path / 'components' / 'index.ts', 'w') as f:
        f.write(components_index)
    
    # Create individual category index files
    categories = ['dashboard', 'management', 'settings', 'users', 'roles', 'permissions', 'logs', 'audit']
    
    for category in categories:
        category_index = f'''// {category.title()} Components
// Auto-generated exports will be added here
'''
        
        with open(admin_path / 'components' / category / 'index.ts', 'w') as f:
            f.write(category_index)
    
    print('  ✅ Created index files')

def generate_admin_report(admin_components, categories, results):
    """Generate an admin consolidation report"""
    print('📊 Generating admin consolidation report...')
    
    report_content = f'''# Admin Centralization Report

## Overview
This report documents the consolidation of admin components into `features/admin-centralized/`.

## Summary
- **Total Admin Components**: {len(admin_components)}
- **Components Moved**: {len(results['moved_files'])}
- **Backup Files Created**: {len(results['backup_files'])}
- **Errors**: {len(results['errors'])}

## Component Categories

### Dashboard Components ({len(categories['dashboard'])})
'''
    
    for comp in categories['dashboard']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Management Components ({len(categories['management'])})
'''
    
    for comp in categories['management']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Settings Components ({len(categories['settings'])})
'''
    
    for comp in categories['settings']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### User Components ({len(categories['users'])})
'''
    
    for comp in categories['users']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Role Components ({len(categories['roles'])})
'''
    
    for comp in categories['roles']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Permission Components ({len(categories['permissions'])})
'''
    
    for comp in categories['permissions']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Log Components ({len(categories['logs'])})
'''
    
    for comp in categories['logs']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Audit Components ({len(categories['audit'])})
'''
    
    for comp in categories['audit']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Other Components ({len(categories['other'])})
'''
    
    for comp in categories['other']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
## Moved Files

'''
    
    for move in results['moved_files']:
        report_content += f'- **{move["source"]}** -> `{move["target"]}`\n'
    
    if results['errors']:
        report_content += f'''
## Errors

'''
        for error in results['errors']:
            report_content += f'- {error}\n'
    
    report_content += f'''
## Next Steps

1. **Update Import Statements**: Fix all imports to use new paths
2. **Test Functionality**: Ensure all admin components work correctly
3. **Refactor for Template**: Make components template-agnostic
4. **Document Dependencies**: Map all admin dependencies
5. **Prepare for Migration**: Ready for modernize template

## Directory Structure

```
features/admin-centralized/
├── components/
│   ├── dashboard/
│   ├── management/
│   ├── settings/
│   ├── users/
│   ├── roles/
│   ├── permissions/
│   ├── logs/
│   ├── audit/
│   └── index.ts
├── hooks/
├── services/
├── types/
├── utils/
├── constants/
├── styles/
└── index.ts
```
'''
    
    with open('/var/www/orthodoxmetrics/prod/front-end/ADMIN_CONSOLIDATION_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated admin consolidation report: ADMIN_CONSOLIDATION_REPORT.md')

def main():
    """Main function"""
    print('�� Starting admin consolidation...')
    
    # Step 1: Identify admin components
    admin_components = identify_admin_components()
    
    # Step 2: Create admin-centralized structure
    admin_path = create_admin_centralized_structure()
    
    # Step 3: Categorize components
    categories = categorize_admin_components(admin_components)
    
    # Step 4: Move components
    results = move_admin_components(admin_components, admin_path)
    
    # Step 5: Create index files
    create_admin_index_files(admin_path)
    
    # Step 6: Generate report
    generate_admin_report(admin_components, categories, results)
    
    print(f'\n🎉 Admin consolidation complete!')
    print(f'📊 Summary:')
    print(f'  Admin components identified: {len(admin_components)}')
    print(f'  Components moved: {len(results["moved_files"])}')
    print(f'  Backup files created: {len(results["backup_files"])}')
    print(f'  Errors: {len(results["errors"])}')
    print(f'  Report: ADMIN_CONSOLIDATION_REPORT.md')
    
    return {
        'admin_components': admin_components,
        'categories': categories,
        'results': results
    }

if __name__ == "__main__":
    result = main()
