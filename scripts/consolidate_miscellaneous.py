#!/usr/bin/env python3
"""
Consolidate miscellaneous components into features/miscellaneous-centralized/
"""

import os
import shutil
from pathlib import Path
import re

def identify_miscellaneous_components():
    """Identify all remaining miscellaneous components"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Identifying miscellaneous components...')
    
    miscellaneous_components = []
    
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
                
                # Skip if it's already in a centralized feature directory
                if 'features/' in str(relative_path) and any(centralized in str(relative_path) for centralized in [
                    'forms-centralized', 'tables-centralized', 'charts-centralized', 'modals-centralized',
                    'layouts-centralized', 'buttons-centralized', 'inputs-centralized', 'cards-centralized',
                    'auth-centralized', 'admin-centralized', 'church-centralized', 'records-centralized',
                    'dashboard-centralized', 'settings-centralized'
                ]):
                    continue
                
                # Skip common non-component files
                if file_name in ['index', 'types', 'constants', 'utils', 'api', 'service', 'hook', 'context', 'provider']:
                    continue
                
                # Skip if it's a test file
                if 'test' in file_name.lower() or 'spec' in file_name.lower():
                    continue
                
                miscellaneous_components.append({
                    'path': file_str,
                    'name': file_name,
                    'full_path': frontend_path / file_path,
                    'category': 'miscellaneous'
                })
    
    return miscellaneous_components

def create_miscellaneous_centralized_structure():
    """Create the miscellaneous-centralized directory structure"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    miscellaneous_path = frontend_path / 'features' / 'miscellaneous-centralized'
    
    print('📁 Creating miscellaneous-centralized structure...')
    
    # Create directory structure
    directories = [
        'components',
        'components/ui',
        'components/utility',
        'components/common',
        'components/shared',
        'components/widgets',
        'components/tools',
        'components/helpers',
        'components/utilities',
        'hooks',
        'services',
        'types',
        'utils',
        'constants',
        'styles'
    ]
    
    for directory in directories:
        dir_path = miscellaneous_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f'  ✅ Created: {directory}')
    
    return miscellaneous_path

def categorize_miscellaneous_components(miscellaneous_components):
    """Categorize miscellaneous components by type"""
    print('📋 Categorizing miscellaneous components...')
    
    categories = {
        'ui': [],
        'utility': [],
        'common': [],
        'shared': [],
        'widgets': [],
        'tools': [],
        'helpers': [],
        'utilities': [],
        'other': []
    }
    
    for comp in miscellaneous_components:
        name = comp['name'].lower()
        path = comp['path'].lower()
        
        if 'widget' in name or 'widget' in path:
            categories['widgets'].append(comp)
        elif 'tool' in name or 'tool' in path:
            categories['tools'].append(comp)
        elif 'helper' in name or 'helper' in path:
            categories['helpers'].append(comp)
        elif 'utility' in name or 'utility' in path:
            categories['utilities'].append(comp)
        elif 'shared' in name or 'shared' in path:
            categories['shared'].append(comp)
        elif 'common' in name or 'common' in path:
            categories['common'].append(comp)
        elif 'ui' in name or 'ui' in path:
            categories['ui'].append(comp)
        else:
            categories['other'].append(comp)
    
    return categories

def move_miscellaneous_components(miscellaneous_components, miscellaneous_path):
    """Move miscellaneous components to miscellaneous-centralized"""
    print('🔄 Moving miscellaneous components...')
    
    results = {
        'moved_files': [],
        'backup_files': [],
        'errors': []
    }
    
    for comp in miscellaneous_components:
        source_path = comp['full_path']
        relative_path = comp['path']
        
        # Determine target directory based on component type
        if 'widget' in comp['name'].lower():
            target_dir = miscellaneous_path / 'components' / 'widgets'
        elif 'tool' in comp['name'].lower():
            target_dir = miscellaneous_path / 'components' / 'tools'
        elif 'helper' in comp['name'].lower():
            target_dir = miscellaneous_path / 'components' / 'helpers'
        elif 'utility' in comp['name'].lower():
            target_dir = miscellaneous_path / 'components' / 'utilities'
        elif 'shared' in comp['name'].lower():
            target_dir = miscellaneous_path / 'components' / 'shared'
        elif 'common' in comp['name'].lower():
            target_dir = miscellaneous_path / 'components' / 'common'
        elif 'ui' in comp['name'].lower():
            target_dir = miscellaneous_path / 'components' / 'ui'
        else:
            target_dir = miscellaneous_path / 'components' / 'utility'
        
        # Create target directory
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Create target file path
        target_path = target_dir / source_path.name
        
        if source_path.exists():
            try:
                # Create backup
                backup_path = source_path.with_suffix(source_path.suffix + '.miscellaneous_backup')
                shutil.copy2(source_path, backup_path)
                
                # Move file
                shutil.move(str(source_path), str(target_path))
                
                results['moved_files'].append({
                    'source': str(relative_path),
                    'target': str(target_path.relative_to(miscellaneous_path.parent)),
                    'backup': str(backup_path)
                })
                
                print(f'  ✅ Moved: {relative_path} -> {target_path.relative_to(miscellaneous_path.parent)}')
                
            except Exception as e:
                error_msg = f'Error moving {relative_path}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
        else:
            print(f'  ⚠️  File not found: {relative_path}')
    
    return results

def create_miscellaneous_index_files(miscellaneous_path):
    """Create index files for miscellaneous-centralized"""
    print('📦 Creating index files...')
    
    # Main index file
    main_index = '''// Miscellaneous Centralized - Main Export
export * from './components';
export * from './hooks';
export * from './services';
export * from './types';
export * from './utils';
export * from './constants';
'''
    
    with open(miscellaneous_path / 'index.ts', 'w') as f:
        f.write(main_index)
    
    # Components index
    components_index = '''// Miscellaneous Components
export * from './ui';
export * from './utility';
export * from './common';
export * from './shared';
export * from './widgets';
export * from './tools';
export * from './helpers';
export * from './utilities';
'''
    
    with open(miscellaneous_path / 'components' / 'index.ts', 'w') as f:
        f.write(components_index)
    
    # Create individual category index files
    categories = ['ui', 'utility', 'common', 'shared', 'widgets', 'tools', 'helpers', 'utilities']
    
    for category in categories:
        category_index = f'''// {category.title()} Components
// Auto-generated exports will be added here
'''
        
        with open(miscellaneous_path / 'components' / category / 'index.ts', 'w') as f:
            f.write(category_index)
    
    print('  ✅ Created index files')

def generate_miscellaneous_report(miscellaneous_components, categories, results):
    """Generate a miscellaneous consolidation report"""
    print('📊 Generating miscellaneous consolidation report...')
    
    report_content = f'''# Miscellaneous Centralization Report

## Overview
This report documents the consolidation of miscellaneous components into `features/miscellaneous-centralized/`.

## Summary
- **Total Miscellaneous Components**: {len(miscellaneous_components)}
- **Components Moved**: {len(results['moved_files'])}
- **Backup Files Created**: {len(results['backup_files'])}
- **Errors**: {len(results['errors'])}

## Component Categories

### UI Components ({len(categories['ui'])})
'''
    
    for comp in categories['ui']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Utility Components ({len(categories['utility'])})
'''
    
    for comp in categories['utility']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Common Components ({len(categories['common'])})
'''
    
    for comp in categories['common']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Shared Components ({len(categories['shared'])})
'''
    
    for comp in categories['shared']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Widget Components ({len(categories['widgets'])})
'''
    
    for comp in categories['widgets']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Tool Components ({len(categories['tools'])})
'''
    
    for comp in categories['tools']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Helper Components ({len(categories['helpers'])})
'''
    
    for comp in categories['helpers']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Utilities Components ({len(categories['utilities'])})
'''
    
    for comp in categories['utilities']:
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
2. **Test Functionality**: Ensure all miscellaneous components work correctly
3. **Refactor for Template**: Make components template-agnostic
4. **Document Dependencies**: Map all miscellaneous dependencies
5. **Prepare for Migration**: Ready for modernize template

## Directory Structure

```
features/miscellaneous-centralized/
├── components/
│   ├── ui/
│   ├── utility/
│   ├── common/
│   ├── shared/
│   ├── widgets/
│   ├── tools/
│   ├── helpers/
│   ├── utilities/
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
    
    with open('/var/www/orthodoxmetrics/prod/front-end/MISCELLANEOUS_CONSOLIDATION_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated miscellaneous consolidation report: MISCELLANEOUS_CONSOLIDATION_REPORT.md')

def main():
    """Main function"""
    print('🚀 Starting miscellaneous consolidation...')
    
    # Step 1: Identify miscellaneous components
    miscellaneous_components = identify_miscellaneous_components()
    
    # Step 2: Create miscellaneous-centralized structure
    miscellaneous_path = create_miscellaneous_centralized_structure()
    
    # Step 3: Categorize components
    categories = categorize_miscellaneous_components(miscellaneous_components)
    
    # Step 4: Move components
    results = move_miscellaneous_components(miscellaneous_components, miscellaneous_path)
    
    # Step 5: Create index files
    create_miscellaneous_index_files(miscellaneous_path)
    
    # Step 6: Generate report
    generate_miscellaneous_report(miscellaneous_components, categories, results)
    
    print(f'\n🎉 Miscellaneous consolidation complete!')
    print(f'📊 Summary:')
    print(f'  Miscellaneous components identified: {len(miscellaneous_components)}')
    print(f'  Components moved: {len(results["moved_files"])}')
    print(f'  Backup files created: {len(results["backup_files"])}')
    print(f'  Errors: {len(results["errors"])}')
    print(f'  Report: MISCELLANEOUS_CONSOLIDATION_REPORT.md')
    
    return {
        'miscellaneous_components': miscellaneous_components,
        'categories': categories,
        'results': results
    }

if __name__ == "__main__":
    result = main()
