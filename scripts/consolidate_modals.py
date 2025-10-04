#!/usr/bin/env python3
"""
Consolidate modal components into features/modals-centralized/
"""

import os
import shutil
from pathlib import Path
import re

def identify_modal_components():
    """Identify all modal-related components"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Identifying modal components...')
    
    modal_components = []
    modal_patterns = ['modal', 'dialog', 'popup', 'overlay', 'drawer', 'sheet', 'panel']
    
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
                
                # Check if it's a modal component
                is_modal_component = False
                for pattern in modal_patterns:
                    if pattern.lower() in file_name.lower() or pattern.lower() in str(relative_path).lower():
                        is_modal_component = True
                        break
                
                if is_modal_component:
                    modal_components.append({
                        'path': file_str,
                        'name': file_name,
                        'full_path': frontend_path / file_path,
                        'category': 'modal'
                    })
    
    return modal_components

def create_modals_centralized_structure():
    """Create the modals-centralized directory structure"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    modals_path = frontend_path / 'features' / 'modals-centralized'
    
    print('📁 Creating modals-centralized structure...')
    
    # Create directory structure
    directories = [
        'components',
        'components/modals',
        'components/dialogs',
        'components/popups',
        'components/overlays',
        'components/drawers',
        'components/sheets',
        'components/panels',
        'hooks',
        'services',
        'types',
        'utils',
        'constants',
        'styles'
    ]
    
    for directory in directories:
        dir_path = modals_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f'  ✅ Created: {directory}')
    
    return modals_path

def categorize_modal_components(modal_components):
    """Categorize modal components by type"""
    print('📋 Categorizing modal components...')
    
    categories = {
        'modals': [],
        'dialogs': [],
        'popups': [],
        'overlays': [],
        'drawers': [],
        'sheets': [],
        'panels': [],
        'other': []
    }
    
    for comp in modal_components:
        name = comp['name'].lower()
        path = comp['path'].lower()
        
        if 'modal' in name or 'modal' in path:
            categories['modals'].append(comp)
        elif 'dialog' in name or 'dialog' in path:
            categories['dialogs'].append(comp)
        elif 'popup' in name or 'popup' in path:
            categories['popups'].append(comp)
        elif 'overlay' in name or 'overlay' in path:
            categories['overlays'].append(comp)
        elif 'drawer' in name or 'drawer' in path:
            categories['drawers'].append(comp)
        elif 'sheet' in name or 'sheet' in path:
            categories['sheets'].append(comp)
        elif 'panel' in name or 'panel' in path:
            categories['panels'].append(comp)
        else:
            categories['other'].append(comp)
    
    return categories

def move_modal_components(modal_components, modals_path):
    """Move modal components to modals-centralized"""
    print('🔄 Moving modal components...')
    
    results = {
        'moved_files': [],
        'backup_files': [],
        'errors': []
    }
    
    for comp in modal_components:
        source_path = comp['full_path']
        relative_path = comp['path']
        
        # Determine target directory based on component type
        if 'modal' in comp['name'].lower():
            target_dir = modals_path / 'components' / 'modals'
        elif 'dialog' in comp['name'].lower():
            target_dir = modals_path / 'components' / 'dialogs'
        elif 'popup' in comp['name'].lower():
            target_dir = modals_path / 'components' / 'popups'
        elif 'overlay' in comp['name'].lower():
            target_dir = modals_path / 'components' / 'overlays'
        elif 'drawer' in comp['name'].lower():
            target_dir = modals_path / 'components' / 'drawers'
        elif 'sheet' in comp['name'].lower():
            target_dir = modals_path / 'components' / 'sheets'
        elif 'panel' in comp['name'].lower():
            target_dir = modals_path / 'components' / 'panels'
        else:
            target_dir = modals_path / 'components'
        
        # Create target directory
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Create target file path
        target_path = target_dir / source_path.name
        
        if source_path.exists():
            try:
                # Create backup
                backup_path = source_path.with_suffix(source_path.suffix + '.modals_backup')
                shutil.copy2(source_path, backup_path)
                
                # Move file
                shutil.move(str(source_path), str(target_path))
                
                results['moved_files'].append({
                    'source': str(relative_path),
                    'target': str(target_path.relative_to(modals_path.parent)),
                    'backup': str(backup_path)
                })
                
                print(f'  ✅ Moved: {relative_path} -> {target_path.relative_to(modals_path.parent)}')
                
            except Exception as e:
                error_msg = f'Error moving {relative_path}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
        else:
            print(f'  ⚠️  File not found: {relative_path}')
    
    return results

def create_modals_index_files(modals_path):
    """Create index files for modals-centralized"""
    print('📦 Creating index files...')
    
    # Main index file
    main_index = '''// Modals Centralized - Main Export
export * from './components';
export * from './hooks';
export * from './services';
export * from './types';
export * from './utils';
export * from './constants';
'''
    
    with open(modals_path / 'index.ts', 'w') as f:
        f.write(main_index)
    
    # Components index
    components_index = '''// Modal Components
export * from './modals';
export * from './dialogs';
export * from './popups';
export * from './overlays';
export * from './drawers';
export * from './sheets';
export * from './panels';
'''
    
    with open(modals_path / 'components' / 'index.ts', 'w') as f:
        f.write(components_index)
    
    # Create individual category index files
    categories = ['modals', 'dialogs', 'popups', 'overlays', 'drawers', 'sheets', 'panels']
    
    for category in categories:
        category_index = f'''// {category.title()} Components
// Auto-generated exports will be added here
'''
        
        with open(modals_path / 'components' / category / 'index.ts', 'w') as f:
            f.write(category_index)
    
    print('  ✅ Created index files')

def generate_modals_report(modal_components, categories, results):
    """Generate a modals consolidation report"""
    print('📊 Generating modals consolidation report...')
    
    report_content = f'''# Modals Centralization Report

## Overview
This report documents the consolidation of modal components into `features/modals-centralized/`.

## Summary
- **Total Modal Components**: {len(modal_components)}
- **Components Moved**: {len(results['moved_files'])}
- **Backup Files Created**: {len(results['backup_files'])}
- **Errors**: {len(results['errors'])}

## Component Categories

### Modal Components ({len(categories['modals'])})
'''
    
    for comp in categories['modals']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Dialog Components ({len(categories['dialogs'])})
'''
    
    for comp in categories['dialogs']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Popup Components ({len(categories['popups'])})
'''
    
    for comp in categories['popups']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Overlay Components ({len(categories['overlays'])})
'''
    
    for comp in categories['overlays']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Drawer Components ({len(categories['drawers'])})
'''
    
    for comp in categories['drawers']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Sheet Components ({len(categories['sheets'])})
'''
    
    for comp in categories['sheets']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Panel Components ({len(categories['panels'])})
'''
    
    for comp in categories['panels']:
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
2. **Test Functionality**: Ensure all modals work correctly
3. **Refactor for Template**: Make components template-agnostic
4. **Document Dependencies**: Map all modal dependencies
5. **Prepare for Migration**: Ready for modernize template

## Directory Structure

```
features/modals-centralized/
├── components/
│   ├── modals/
│   ├── dialogs/
│   ├── popups/
│   ├── overlays/
│   ├── drawers/
│   ├── sheets/
│   ├── panels/
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
    
    with open('/var/www/orthodoxmetrics/prod/front-end/MODALS_CONSOLIDATION_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated modals consolidation report: MODALS_CONSOLIDATION_REPORT.md')

def main():
    """Main function"""
    print('🚀 Starting modals consolidation...')
    
    # Step 1: Identify modal components
    modal_components = identify_modal_components()
    
    # Step 2: Create modals-centralized structure
    modals_path = create_modals_centralized_structure()
    
    # Step 3: Categorize components
    categories = categorize_modal_components(modal_components)
    
    # Step 4: Move components
    results = move_modal_components(modal_components, modals_path)
    
    # Step 5: Create index files
    create_modals_index_files(modals_path)
    
    # Step 6: Generate report
    generate_modals_report(modal_components, categories, results)
    
    print(f'\n🎉 Modals consolidation complete!')
    print(f'📊 Summary:')
    print(f'  Modal components identified: {len(modal_components)}')
    print(f'  Components moved: {len(results["moved_files"])}')
    print(f'  Backup files created: {len(results["backup_files"])}')
    print(f'  Errors: {len(results["errors"])}')
    print(f'  Report: MODALS_CONSOLIDATION_REPORT.md')
    
    return {
        'modal_components': modal_components,
        'categories': categories,
        'results': results
    }

if __name__ == "__main__":
    result = main()
