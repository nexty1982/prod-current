#!/usr/bin/env python3
"""
Consolidate input components into features/inputs-centralized/
"""

import os
import shutil
from pathlib import Path
import re

def identify_input_components():
    """Identify all input-related components"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Identifying input components...')
    
    input_components = []
    input_patterns = ['input', 'field', 'text', 'textarea', 'select', 'checkbox', 'radio', 'date', 'time', 'number', 'email', 'password', 'search', 'url', 'tel']
    
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
                
                # Check if it's an input component
                is_input_component = False
                for pattern in input_patterns:
                    if pattern.lower() in file_name.lower() or pattern.lower() in str(relative_path).lower():
                        is_input_component = True
                        break
                
                if is_input_component:
                    input_components.append({
                        'path': file_str,
                        'name': file_name,
                        'full_path': frontend_path / file_path,
                        'category': 'input'
                    })
    
    return input_components

def create_inputs_centralized_structure():
    """Create the inputs-centralized directory structure"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    inputs_path = frontend_path / 'features' / 'inputs-centralized'
    
    print('📁 Creating inputs-centralized structure...')
    
    # Create directory structure
    directories = [
        'components',
        'components/inputs',
        'components/fields',
        'components/text',
        'components/textarea',
        'components/select',
        'components/checkbox',
        'components/radio',
        'components/date',
        'components/time',
        'components/number',
        'components/email',
        'components/password',
        'components/search',
        'components/url',
        'components/tel',
        'hooks',
        'services',
        'types',
        'utils',
        'constants',
        'styles'
    ]
    
    for directory in directories:
        dir_path = inputs_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f'  ✅ Created: {directory}')
    
    return inputs_path

def categorize_input_components(input_components):
    """Categorize input components by type"""
    print('📋 Categorizing input components...')
    
    categories = {
        'inputs': [],
        'fields': [],
        'text': [],
        'textarea': [],
        'select': [],
        'checkbox': [],
        'radio': [],
        'date': [],
        'time': [],
        'number': [],
        'email': [],
        'password': [],
        'search': [],
        'url': [],
        'tel': [],
        'other': []
    }
    
    for comp in input_components:
        name = comp['name'].lower()
        path = comp['path'].lower()
        
        if 'textarea' in name or 'textarea' in path:
            categories['textarea'].append(comp)
        elif 'select' in name or 'select' in path:
            categories['select'].append(comp)
        elif 'checkbox' in name or 'checkbox' in path:
            categories['checkbox'].append(comp)
        elif 'radio' in name or 'radio' in path:
            categories['radio'].append(comp)
        elif 'date' in name or 'date' in path:
            categories['date'].append(comp)
        elif 'time' in name or 'time' in path:
            categories['time'].append(comp)
        elif 'number' in name or 'number' in path:
            categories['number'].append(comp)
        elif 'email' in name or 'email' in path:
            categories['email'].append(comp)
        elif 'password' in name or 'password' in path:
            categories['password'].append(comp)
        elif 'search' in name or 'search' in path:
            categories['search'].append(comp)
        elif 'url' in name or 'url' in path:
            categories['url'].append(comp)
        elif 'tel' in name or 'tel' in path:
            categories['tel'].append(comp)
        elif 'text' in name or 'text' in path:
            categories['text'].append(comp)
        elif 'field' in name or 'field' in path:
            categories['fields'].append(comp)
        elif 'input' in name or 'input' in path:
            categories['inputs'].append(comp)
        else:
            categories['other'].append(comp)
    
    return categories

def move_input_components(input_components, inputs_path):
    """Move input components to inputs-centralized"""
    print('🔄 Moving input components...')
    
    results = {
        'moved_files': [],
        'backup_files': [],
        'errors': []
    }
    
    for comp in input_components:
        source_path = comp['full_path']
        relative_path = comp['path']
        
        # Determine target directory based on component type
        if 'textarea' in comp['name'].lower():
            target_dir = inputs_path / 'components' / 'textarea'
        elif 'select' in comp['name'].lower():
            target_dir = inputs_path / 'components' / 'select'
        elif 'checkbox' in comp['name'].lower():
            target_dir = inputs_path / 'components' / 'checkbox'
        elif 'radio' in comp['name'].lower():
            target_dir = inputs_path / 'components' / 'radio'
        elif 'date' in comp['name'].lower():
            target_dir = inputs_path / 'components' / 'date'
        elif 'time' in comp['name'].lower():
            target_dir = inputs_path / 'components' / 'time'
        elif 'number' in comp['name'].lower():
            target_dir = inputs_path / 'components' / 'number'
        elif 'email' in comp['name'].lower():
            target_dir = inputs_path / 'components' / 'email'
        elif 'password' in comp['name'].lower():
            target_dir = inputs_path / 'components' / 'password'
        elif 'search' in comp['name'].lower():
            target_dir = inputs_path / 'components' / 'search'
        elif 'url' in comp['name'].lower():
            target_dir = inputs_path / 'components' / 'url'
        elif 'tel' in comp['name'].lower():
            target_dir = inputs_path / 'components' / 'tel'
        elif 'text' in comp['name'].lower():
            target_dir = inputs_path / 'components' / 'text'
        elif 'field' in comp['name'].lower():
            target_dir = inputs_path / 'components' / 'fields'
        elif 'input' in comp['name'].lower():
            target_dir = inputs_path / 'components' / 'inputs'
        else:
            target_dir = inputs_path / 'components'
        
        # Create target directory
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Create target file path
        target_path = target_dir / source_path.name
        
        if source_path.exists():
            try:
                # Create backup
                backup_path = source_path.with_suffix(source_path.suffix + '.inputs_backup')
                shutil.copy2(source_path, backup_path)
                
                # Move file
                shutil.move(str(source_path), str(target_path))
                
                results['moved_files'].append({
                    'source': str(relative_path),
                    'target': str(target_path.relative_to(inputs_path.parent)),
                    'backup': str(backup_path)
                })
                
                print(f'  ✅ Moved: {relative_path} -> {target_path.relative_to(inputs_path.parent)}')
                
            except Exception as e:
                error_msg = f'Error moving {relative_path}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
        else:
            print(f'  ⚠️  File not found: {relative_path}')
    
    return results

def create_inputs_index_files(inputs_path):
    """Create index files for inputs-centralized"""
    print('📦 Creating index files...')
    
    # Main index file
    main_index = '''// Inputs Centralized - Main Export
export * from './components';
export * from './hooks';
export * from './services';
export * from './types';
export * from './utils';
export * from './constants';
'''
    
    with open(inputs_path / 'index.ts', 'w') as f:
        f.write(main_index)
    
    # Components index
    components_index = '''// Input Components
export * from './inputs';
export * from './fields';
export * from './text';
export * from './textarea';
export * from './select';
export * from './checkbox';
export * from './radio';
export * from './date';
export * from './time';
export * from './number';
export * from './email';
export * from './password';
export * from './search';
export * from './url';
export * from './tel';
'''
    
    with open(inputs_path / 'components' / 'index.ts', 'w') as f:
        f.write(components_index)
    
    # Create individual category index files
    categories = ['inputs', 'fields', 'text', 'textarea', 'select', 'checkbox', 'radio', 'date', 'time', 'number', 'email', 'password', 'search', 'url', 'tel']
    
    for category in categories:
        category_index = f'''// {category.title()} Components
// Auto-generated exports will be added here
'''
        
        with open(inputs_path / 'components' / category / 'index.ts', 'w') as f:
            f.write(category_index)
    
    print('  ✅ Created index files')

def generate_inputs_report(input_components, categories, results):
    """Generate an inputs consolidation report"""
    print('📊 Generating inputs consolidation report...')
    
    report_content = f'''# Inputs Centralization Report

## Overview
This report documents the consolidation of input components into `features/inputs-centralized/`.

## Summary
- **Total Input Components**: {len(input_components)}
- **Components Moved**: {len(results['moved_files'])}
- **Backup Files Created**: {len(results['backup_files'])}
- **Errors**: {len(results['errors'])}

## Component Categories

### Input Components ({len(categories['inputs'])})
'''
    
    for comp in categories['inputs']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Field Components ({len(categories['fields'])})
'''
    
    for comp in categories['fields']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Text Components ({len(categories['text'])})
'''
    
    for comp in categories['text']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Textarea Components ({len(categories['textarea'])})
'''
    
    for comp in categories['textarea']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Select Components ({len(categories['select'])})
'''
    
    for comp in categories['select']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Checkbox Components ({len(categories['checkbox'])})
'''
    
    for comp in categories['checkbox']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Radio Components ({len(categories['radio'])})
'''
    
    for comp in categories['radio']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Date Components ({len(categories['date'])})
'''
    
    for comp in categories['date']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Time Components ({len(categories['time'])})
'''
    
    for comp in categories['time']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Number Components ({len(categories['number'])})
'''
    
    for comp in categories['number']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Email Components ({len(categories['email'])})
'''
    
    for comp in categories['email']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Password Components ({len(categories['password'])})
'''
    
    for comp in categories['password']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Search Components ({len(categories['search'])})
'''
    
    for comp in categories['search']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### URL Components ({len(categories['url'])})
'''
    
    for comp in categories['url']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Tel Components ({len(categories['tel'])})
'''
    
    for comp in categories['tel']:
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
2. **Test Functionality**: Ensure all inputs work correctly
3. **Refactor for Template**: Make components template-agnostic
4. **Document Dependencies**: Map all input dependencies
5. **Prepare for Migration**: Ready for modernize template

## Directory Structure

```
features/inputs-centralized/
├── components/
│   ├── inputs/
│   ├── fields/
│   ├── text/
│   ├── textarea/
│   ├── select/
│   ├── checkbox/
│   ├── radio/
│   ├── date/
│   ├── time/
│   ├── number/
│   ├── email/
│   ├── password/
│   ├── search/
│   ├── url/
│   ├── tel/
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
    
    with open('/var/www/orthodoxmetrics/prod/front-end/INPUTS_CONSOLIDATION_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated inputs consolidation report: INPUTS_CONSOLIDATION_REPORT.md')

def main():
    """Main function"""
    print('🚀 Starting inputs consolidation...')
    
    # Step 1: Identify input components
    input_components = identify_input_components()
    
    # Step 2: Create inputs-centralized structure
    inputs_path = create_inputs_centralized_structure()
    
    # Step 3: Categorize components
    categories = categorize_input_components(input_components)
    
    # Step 4: Move components
    results = move_input_components(input_components, inputs_path)
    
    # Step 5: Create index files
    create_inputs_index_files(inputs_path)
    
    # Step 6: Generate report
    generate_inputs_report(input_components, categories, results)
    
    print(f'\n🎉 Inputs consolidation complete!')
    print(f'📊 Summary:')
    print(f'  Input components identified: {len(input_components)}')
    print(f'  Components moved: {len(results["moved_files"])}')
    print(f'  Backup files created: {len(results["backup_files"])}')
    print(f'  Errors: {len(results["errors"])}')
    print(f'  Report: INPUTS_CONSOLIDATION_REPORT.md')
    
    return {
        'input_components': input_components,
        'categories': categories,
        'results': results
    }

if __name__ == "__main__":
    result = main()
