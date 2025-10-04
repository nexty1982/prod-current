#!/usr/bin/env python3
"""
Consolidate settings components into features/settings-centralized/
"""

import os
import shutil
from pathlib import Path
import re

def identify_settings_components():
    """Identify all settings-related components"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Identifying settings components...')
    
    settings_components = []
    settings_patterns = ['setting', 'config', 'preference', 'option', 'parameter', 'configuration', 'setup', 'wizard', 'customize', 'theme', 'appearance']
    
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
                
                # Check if it's a settings component
                is_settings_component = False
                for pattern in settings_patterns:
                    if pattern.lower() in file_name.lower() or pattern.lower() in str(relative_path).lower():
                        is_settings_component = True
                        break
                
                if is_settings_component:
                    settings_components.append({
                        'path': file_str,
                        'name': file_name,
                        'full_path': frontend_path / file_path,
                        'category': 'settings'
                    })
    
    return settings_components

def create_settings_centralized_structure():
    """Create the settings-centralized directory structure"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    settings_path = frontend_path / 'features' / 'settings-centralized'
    
    print('📁 Creating settings-centralized structure...')
    
    # Create directory structure
    directories = [
        'components',
        'components/settings',
        'components/config',
        'components/preferences',
        'components/options',
        'components/parameters',
        'components/configuration',
        'components/setup',
        'components/wizard',
        'components/customize',
        'components/theme',
        'components/appearance',
        'hooks',
        'services',
        'types',
        'utils',
        'constants',
        'styles'
    ]
    
    for directory in directories:
        dir_path = settings_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f'  ✅ Created: {directory}')
    
    return settings_path

def categorize_settings_components(settings_components):
    """Categorize settings components by type"""
    print('📋 Categorizing settings components...')
    
    categories = {
        'settings': [],
        'config': [],
        'preferences': [],
        'options': [],
        'parameters': [],
        'configuration': [],
        'setup': [],
        'wizard': [],
        'customize': [],
        'theme': [],
        'appearance': [],
        'other': []
    }
    
    for comp in settings_components:
        name = comp['name'].lower()
        path = comp['path'].lower()
        
        if 'theme' in name or 'theme' in path:
            categories['theme'].append(comp)
        elif 'appearance' in name or 'appearance' in path:
            categories['appearance'].append(comp)
        elif 'customize' in name or 'customize' in path:
            categories['customize'].append(comp)
        elif 'wizard' in name or 'wizard' in path:
            categories['wizard'].append(comp)
        elif 'setup' in name or 'setup' in path:
            categories['setup'].append(comp)
        elif 'configuration' in name or 'configuration' in path:
            categories['configuration'].append(comp)
        elif 'parameter' in name or 'parameter' in path:
            categories['parameters'].append(comp)
        elif 'option' in name or 'option' in path:
            categories['options'].append(comp)
        elif 'preference' in name or 'preference' in path:
            categories['preferences'].append(comp)
        elif 'config' in name or 'config' in path:
            categories['config'].append(comp)
        elif 'setting' in name or 'setting' in path:
            categories['settings'].append(comp)
        else:
            categories['other'].append(comp)
    
    return categories

def move_settings_components(settings_components, settings_path):
    """Move settings components to settings-centralized"""
    print('🔄 Moving settings components...')
    
    results = {
        'moved_files': [],
        'backup_files': [],
        'errors': []
    }
    
    for comp in settings_components:
        source_path = comp['full_path']
        relative_path = comp['path']
        
        # Determine target directory based on component type
        if 'theme' in comp['name'].lower():
            target_dir = settings_path / 'components' / 'theme'
        elif 'appearance' in comp['name'].lower():
            target_dir = settings_path / 'components' / 'appearance'
        elif 'customize' in comp['name'].lower():
            target_dir = settings_path / 'components' / 'customize'
        elif 'wizard' in comp['name'].lower():
            target_dir = settings_path / 'components' / 'wizard'
        elif 'setup' in comp['name'].lower():
            target_dir = settings_path / 'components' / 'setup'
        elif 'configuration' in comp['name'].lower():
            target_dir = settings_path / 'components' / 'configuration'
        elif 'parameter' in comp['name'].lower():
            target_dir = settings_path / 'components' / 'parameters'
        elif 'option' in comp['name'].lower():
            target_dir = settings_path / 'components' / 'options'
        elif 'preference' in comp['name'].lower():
            target_dir = settings_path / 'components' / 'preferences'
        elif 'config' in comp['name'].lower():
            target_dir = settings_path / 'components' / 'config'
        elif 'setting' in comp['name'].lower():
            target_dir = settings_path / 'components' / 'settings'
        else:
            target_dir = settings_path / 'components'
        
        # Create target directory
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Create target file path
        target_path = target_dir / source_path.name
        
        if source_path.exists():
            try:
                # Create backup
                backup_path = source_path.with_suffix(source_path.suffix + '.settings_backup')
                shutil.copy2(source_path, backup_path)
                
                # Move file
                shutil.move(str(source_path), str(target_path))
                
                results['moved_files'].append({
                    'source': str(relative_path),
                    'target': str(target_path.relative_to(settings_path.parent)),
                    'backup': str(backup_path)
                })
                
                print(f'  ✅ Moved: {relative_path} -> {target_path.relative_to(settings_path.parent)}')
                
            except Exception as e:
                error_msg = f'Error moving {relative_path}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
        else:
            print(f'  ⚠️  File not found: {relative_path}')
    
    return results

def create_settings_index_files(settings_path):
    """Create index files for settings-centralized"""
    print('📦 Creating index files...')
    
    # Main index file
    main_index = '''// Settings Centralized - Main Export
export * from './components';
export * from './hooks';
export * from './services';
export * from './types';
export * from './utils';
export * from './constants';
'''
    
    with open(settings_path / 'index.ts', 'w') as f:
        f.write(main_index)
    
    # Components index
    components_index = '''// Settings Components
export * from './settings';
export * from './config';
export * from './preferences';
export * from './options';
export * from './parameters';
export * from './configuration';
export * from './setup';
export * from './wizard';
export * from './customize';
export * from './theme';
export * from './appearance';
'''
    
    with open(settings_path / 'components' / 'index.ts', 'w') as f:
        f.write(components_index)
    
    # Create individual category index files
    categories = ['settings', 'config', 'preferences', 'options', 'parameters', 'configuration', 'setup', 'wizard', 'customize', 'theme', 'appearance']
    
    for category in categories:
        category_index = f'''// {category.title()} Components
// Auto-generated exports will be added here
'''
        
        with open(settings_path / 'components' / category / 'index.ts', 'w') as f:
            f.write(category_index)
    
    print('  ✅ Created index files')

def generate_settings_report(settings_components, categories, results):
    """Generate a settings consolidation report"""
    print('📊 Generating settings consolidation report...')
    
    report_content = f'''# Settings Centralization Report

## Overview
This report documents the consolidation of settings components into `features/settings-centralized/`.

## Summary
- **Total Settings Components**: {len(settings_components)}
- **Components Moved**: {len(results['moved_files'])}
- **Backup Files Created**: {len(results['backup_files'])}
- **Errors**: {len(results['errors'])}

## Component Categories

### Settings Components ({len(categories['settings'])})
'''
    
    for comp in categories['settings']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Config Components ({len(categories['config'])})
'''
    
    for comp in categories['config']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Preferences Components ({len(categories['preferences'])})
'''
    
    for comp in categories['preferences']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Options Components ({len(categories['options'])})
'''
    
    for comp in categories['options']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Parameters Components ({len(categories['parameters'])})
'''
    
    for comp in categories['parameters']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Configuration Components ({len(categories['configuration'])})
'''
    
    for comp in categories['configuration']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Setup Components ({len(categories['setup'])})
'''
    
    for comp in categories['setup']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Wizard Components ({len(categories['wizard'])})
'''
    
    for comp in categories['wizard']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Customize Components ({len(categories['customize'])})
'''
    
    for comp in categories['customize']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Theme Components ({len(categories['theme'])})
'''
    
    for comp in categories['theme']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Appearance Components ({len(categories['appearance'])})
'''
    
    for comp in categories['appearance']:
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
2. **Test Functionality**: Ensure all settings components work correctly
3. **Refactor for Template**: Make components template-agnostic
4. **Document Dependencies**: Map all settings dependencies
5. **Prepare for Migration**: Ready for modernize template

## Directory Structure

```
features/settings-centralized/
├── components/
│   ├── settings/
│   ├── config/
│   ├── preferences/
│   ├── options/
│   ├── parameters/
│   ├── configuration/
│   ├── setup/
│   ├── wizard/
│   ├── customize/
│   ├── theme/
│   ├── appearance/
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
    
    with open('/var/www/orthodoxmetrics/prod/front-end/SETTINGS_CONSOLIDATION_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated settings consolidation report: SETTINGS_CONSOLIDATION_REPORT.md')

def main():
    """Main function"""
    print('🚀 Starting settings consolidation...')
    
    # Step 1: Identify settings components
    settings_components = identify_settings_components()
    
    # Step 2: Create settings-centralized structure
    settings_path = create_settings_centralized_structure()
    
    # Step 3: Categorize components
    categories = categorize_settings_components(settings_components)
    
    # Step 4: Move components
    results = move_settings_components(settings_components, settings_path)
    
    # Step 5: Create index files
    create_settings_index_files(settings_path)
    
    # Step 6: Generate report
    generate_settings_report(settings_components, categories, results)
    
    print(f'\n🎉 Settings consolidation complete!')
    print(f'📊 Summary:')
    print(f'  Settings components identified: {len(settings_components)}')
    print(f'  Components moved: {len(results["moved_files"])}')
    print(f'  Backup files created: {len(results["backup_files"])}')
    print(f'  Errors: {len(results["errors"])}')
    print(f'  Report: SETTINGS_CONSOLIDATION_REPORT.md')
    
    return {
        'settings_components': settings_components,
        'categories': categories,
        'results': results
    }

if __name__ == "__main__":
    result = main()
