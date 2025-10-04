#!/usr/bin/env python3
"""
Consolidate button components into features/buttons-centralized/
"""

import os
import shutil
from pathlib import Path
import re

def identify_button_components():
    """Identify all button-related components"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Identifying button components...')
    
    button_components = []
    button_patterns = ['button', 'btn', 'action', 'click', 'submit', 'reset', 'toggle', 'switch', 'link', 'anchor']
    
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
                
                # Check if it's a button component
                is_button_component = False
                for pattern in button_patterns:
                    if pattern.lower() in file_name.lower() or pattern.lower() in str(relative_path).lower():
                        is_button_component = True
                        break
                
                if is_button_component:
                    button_components.append({
                        'path': file_str,
                        'name': file_name,
                        'full_path': frontend_path / file_path,
                        'category': 'button'
                    })
    
    return button_components

def create_buttons_centralized_structure():
    """Create the buttons-centralized directory structure"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    buttons_path = frontend_path / 'features' / 'buttons-centralized'
    
    print('📁 Creating buttons-centralized structure...')
    
    # Create directory structure
    directories = [
        'components',
        'components/buttons',
        'components/actions',
        'components/toggles',
        'components/switches',
        'components/links',
        'components/anchors',
        'components/submit',
        'components/reset',
        'hooks',
        'services',
        'types',
        'utils',
        'constants',
        'styles'
    ]
    
    for directory in directories:
        dir_path = buttons_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f'  ✅ Created: {directory}')
    
    return buttons_path

def categorize_button_components(button_components):
    """Categorize button components by type"""
    print('�� Categorizing button components...')
    
    categories = {
        'buttons': [],
        'actions': [],
        'toggles': [],
        'switches': [],
        'links': [],
        'anchors': [],
        'submit': [],
        'reset': [],
        'other': []
    }
    
    for comp in button_components:
        name = comp['name'].lower()
        path = comp['path'].lower()
        
        if 'submit' in name or 'submit' in path:
            categories['submit'].append(comp)
        elif 'reset' in name or 'reset' in path:
            categories['reset'].append(comp)
        elif 'toggle' in name or 'toggle' in path:
            categories['toggles'].append(comp)
        elif 'switch' in name or 'switch' in path:
            categories['switches'].append(comp)
        elif 'link' in name or 'link' in path:
            categories['links'].append(comp)
        elif 'anchor' in name or 'anchor' in path:
            categories['anchors'].append(comp)
        elif 'action' in name or 'action' in path:
            categories['actions'].append(comp)
        elif 'button' in name or 'button' in path or 'btn' in name or 'btn' in path:
            categories['buttons'].append(comp)
        else:
            categories['other'].append(comp)
    
    return categories

def move_button_components(button_components, buttons_path):
    """Move button components to buttons-centralized"""
    print('🔄 Moving button components...')
    
    results = {
        'moved_files': [],
        'backup_files': [],
        'errors': []
    }
    
    for comp in button_components:
        source_path = comp['full_path']
        relative_path = comp['path']
        
        # Determine target directory based on component type
        if 'submit' in comp['name'].lower():
            target_dir = buttons_path / 'components' / 'submit'
        elif 'reset' in comp['name'].lower():
            target_dir = buttons_path / 'components' / 'reset'
        elif 'toggle' in comp['name'].lower():
            target_dir = buttons_path / 'components' / 'toggles'
        elif 'switch' in comp['name'].lower():
            target_dir = buttons_path / 'components' / 'switches'
        elif 'link' in comp['name'].lower():
            target_dir = buttons_path / 'components' / 'links'
        elif 'anchor' in comp['name'].lower():
            target_dir = buttons_path / 'components' / 'anchors'
        elif 'action' in comp['name'].lower():
            target_dir = buttons_path / 'components' / 'actions'
        elif 'button' in comp['name'].lower() or 'btn' in comp['name'].lower():
            target_dir = buttons_path / 'components' / 'buttons'
        else:
            target_dir = buttons_path / 'components'
        
        # Create target directory
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Create target file path
        target_path = target_dir / source_path.name
        
        if source_path.exists():
            try:
                # Create backup
                backup_path = source_path.with_suffix(source_path.suffix + '.buttons_backup')
                shutil.copy2(source_path, backup_path)
                
                # Move file
                shutil.move(str(source_path), str(target_path))
                
                results['moved_files'].append({
                    'source': str(relative_path),
                    'target': str(target_path.relative_to(buttons_path.parent)),
                    'backup': str(backup_path)
                })
                
                print(f'  ✅ Moved: {relative_path} -> {target_path.relative_to(buttons_path.parent)}')
                
            except Exception as e:
                error_msg = f'Error moving {relative_path}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
        else:
            print(f'  ⚠️  File not found: {relative_path}')
    
    return results

def create_buttons_index_files(buttons_path):
    """Create index files for buttons-centralized"""
    print('📦 Creating index files...')
    
    # Main index file
    main_index = '''// Buttons Centralized - Main Export
export * from './components';
export * from './hooks';
export * from './services';
export * from './types';
export * from './utils';
export * from './constants';
'''
    
    with open(buttons_path / 'index.ts', 'w') as f:
        f.write(main_index)
    
    # Components index
    components_index = '''// Button Components
export * from './buttons';
export * from './actions';
export * from './toggles';
export * from './switches';
export * from './links';
export * from './anchors';
export * from './submit';
export * from './reset';
'''
    
    with open(buttons_path / 'components' / 'index.ts', 'w') as f:
        f.write(components_index)
    
    # Create individual category index files
    categories = ['buttons', 'actions', 'toggles', 'switches', 'links', 'anchors', 'submit', 'reset']
    
    for category in categories:
        category_index = f'''// {category.title()} Components
// Auto-generated exports will be added here
'''
        
        with open(buttons_path / 'components' / category / 'index.ts', 'w') as f:
            f.write(category_index)
    
    print('  ✅ Created index files')

def generate_buttons_report(button_components, categories, results):
    """Generate a buttons consolidation report"""
    print('📊 Generating buttons consolidation report...')
    
    report_content = f'''# Buttons Centralization Report

## Overview
This report documents the consolidation of button components into `features/buttons-centralized/`.

## Summary
- **Total Button Components**: {len(button_components)}
- **Components Moved**: {len(results['moved_files'])}
- **Backup Files Created**: {len(results['backup_files'])}
- **Errors**: {len(results['errors'])}

## Component Categories

### Button Components ({len(categories['buttons'])})
'''
    
    for comp in categories['buttons']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Action Components ({len(categories['actions'])})
'''
    
    for comp in categories['actions']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Toggle Components ({len(categories['toggles'])})
'''
    
    for comp in categories['toggles']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Switch Components ({len(categories['switches'])})
'''
    
    for comp in categories['switches']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Link Components ({len(categories['links'])})
'''
    
    for comp in categories['links']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Anchor Components ({len(categories['anchors'])})
'''
    
    for comp in categories['anchors']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Submit Components ({len(categories['submit'])})
'''
    
    for comp in categories['submit']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Reset Components ({len(categories['reset'])})
'''
    
    for comp in categories['reset']:
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
2. **Test Functionality**: Ensure all buttons work correctly
3. **Refactor for Template**: Make components template-agnostic
4. **Document Dependencies**: Map all button dependencies
5. **Prepare for Migration**: Ready for modernize template

## Directory Structure

```
features/buttons-centralized/
├── components/
│   ├── buttons/
│   ├── actions/
│   ├── toggles/
│   ├── switches/
│   ├── links/
│   ├── anchors/
│   ├── submit/
│   ├── reset/
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
    
    with open('/var/www/orthodoxmetrics/prod/front-end/BUTTONS_CONSOLIDATION_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated buttons consolidation report: BUTTONS_CONSOLIDATION_REPORT.md')

def main():
    """Main function"""
    print('🚀 Starting buttons consolidation...')
    
    # Step 1: Identify button components
    button_components = identify_button_components()
    
    # Step 2: Create buttons-centralized structure
    buttons_path = create_buttons_centralized_structure()
    
    # Step 3: Categorize components
    categories = categorize_button_components(button_components)
    
    # Step 4: Move components
    results = move_button_components(button_components, buttons_path)
    
    # Step 5: Create index files
    create_buttons_index_files(buttons_path)
    
    # Step 6: Generate report
    generate_buttons_report(button_components, categories, results)
    
    print(f'\n🎉 Buttons consolidation complete!')
    print(f'📊 Summary:')
    print(f'  Button components identified: {len(button_components)}')
    print(f'  Components moved: {len(results["moved_files"])}')
    print(f'  Backup files created: {len(results["backup_files"])}')
    print(f'  Errors: {len(results["errors"])}')
    print(f'  Report: BUTTONS_CONSOLIDATION_REPORT.md')
    
    return {
        'button_components': button_components,
        'categories': categories,
        'results': results
    }

if __name__ == "__main__":
    result = main()
