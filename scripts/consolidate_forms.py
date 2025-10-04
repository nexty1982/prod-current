#!/usr/bin/env python3
"""
Consolidate form components into features/forms-centralized/
"""

import os
import shutil
from pathlib import Path
import re

def identify_form_components():
    """Identify all form-related components"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Identifying form components...')
    
    form_components = []
    form_patterns = ['form', 'input', 'field', 'validation', 'submit', 'button']
    
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
                
                # Check if it's a form component
                is_form_component = False
                for pattern in form_patterns:
                    if pattern.lower() in file_name.lower() or pattern.lower() in str(relative_path).lower():
                        is_form_component = True
                        break
                
                if is_form_component:
                    form_components.append({
                        'path': file_str,
                        'name': file_name,
                        'full_path': frontend_path / file_path,
                        'category': 'form'
                    })
    
    return form_components

def create_forms_centralized_structure():
    """Create the forms-centralized directory structure"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    forms_path = frontend_path / 'features' / 'forms-centralized'
    
    print('📁 Creating forms-centralized structure...')
    
    # Create directory structure
    directories = [
        'components',
        'components/inputs',
        'components/validation',
        'components/layouts',
        'components/fields',
        'hooks',
        'services',
        'types',
        'utils',
        'constants',
        'styles'
    ]
    
    for directory in directories:
        dir_path = forms_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f'  ✅ Created: {directory}')
    
    return forms_path

def categorize_form_components(form_components):
    """Categorize form components by type"""
    print('�� Categorizing form components...')
    
    categories = {
        'inputs': [],
        'validation': [],
        'layouts': [],
        'fields': [],
        'other': []
    }
    
    for comp in form_components:
        name = comp['name'].lower()
        path = comp['path'].lower()
        
        if 'input' in name or 'input' in path:
            categories['inputs'].append(comp)
        elif 'validation' in name or 'validation' in path:
            categories['validation'].append(comp)
        elif 'layout' in name or 'layout' in path:
            categories['layouts'].append(comp)
        elif 'field' in name or 'field' in path:
            categories['fields'].append(comp)
        else:
            categories['other'].append(comp)
    
    return categories

def move_form_components(form_components, forms_path):
    """Move form components to forms-centralized"""
    print('🔄 Moving form components...')
    
    results = {
        'moved_files': [],
        'backup_files': [],
        'errors': []
    }
    
    for comp in form_components:
        source_path = comp['full_path']
        relative_path = comp['path']
        
        # Determine target directory based on component type
        if 'input' in comp['name'].lower():
            target_dir = forms_path / 'components' / 'inputs'
        elif 'validation' in comp['name'].lower():
            target_dir = forms_path / 'components' / 'validation'
        elif 'layout' in comp['name'].lower():
            target_dir = forms_path / 'components' / 'layouts'
        elif 'field' in comp['name'].lower():
            target_dir = forms_path / 'components' / 'fields'
        else:
            target_dir = forms_path / 'components'
        
        # Create target directory
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Create target file path
        target_path = target_dir / source_path.name
        
        if source_path.exists():
            try:
                # Create backup
                backup_path = source_path.with_suffix(source_path.suffix + '.forms_backup')
                shutil.copy2(source_path, backup_path)
                
                # Move file
                shutil.move(str(source_path), str(target_path))
                
                results['moved_files'].append({
                    'source': str(relative_path),
                    'target': str(target_path.relative_to(forms_path.parent)),
                    'backup': str(backup_path)
                })
                
                print(f'  ✅ Moved: {relative_path} -> {target_path.relative_to(forms_path.parent)}')
                
            except Exception as e:
                error_msg = f'Error moving {relative_path}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
        else:
            print(f'  ⚠️  File not found: {relative_path}')
    
    return results

def create_forms_index_files(forms_path):
    """Create index files for forms-centralized"""
    print('📦 Creating index files...')
    
    # Main index file
    main_index = '''// Forms Centralized - Main Export
export * from './components';
export * from './hooks';
export * from './services';
export * from './types';
export * from './utils';
export * from './constants';
'''
    
    with open(forms_path / 'index.ts', 'w') as f:
        f.write(main_index)
    
    # Components index
    components_index = '''// Form Components
export * from './inputs';
export * from './validation';
export * from './layouts';
export * from './fields';
'''
    
    with open(forms_path / 'components' / 'index.ts', 'w') as f:
        f.write(components_index)
    
    # Inputs index
    inputs_index = '''// Form Input Components
// Auto-generated exports will be added here
'''
    
    with open(forms_path / 'components' / 'inputs' / 'index.ts', 'w') as f:
        f.write(inputs_index)
    
    # Validation index
    validation_index = '''// Form Validation Components
// Auto-generated exports will be added here
'''
    
    with open(forms_path / 'components' / 'validation' / 'index.ts', 'w') as f:
        f.write(validation_index)
    
    # Layouts index
    layouts_index = '''// Form Layout Components
// Auto-generated exports will be added here
'''
    
    with open(forms_path / 'components' / 'layouts' / 'index.ts', 'w') as f:
        f.write(layouts_index)
    
    # Fields index
    fields_index = '''// Form Field Components
// Auto-generated exports will be added here
'''
    
    with open(forms_path / 'components' / 'fields' / 'index.ts', 'w') as f:
        f.write(fields_index)
    
    print('  ✅ Created index files')

def generate_forms_report(form_components, categories, results):
    """Generate a forms consolidation report"""
    print('📊 Generating forms consolidation report...')
    
    report_content = f'''# Forms Centralization Report

## Overview
This report documents the consolidation of form components into `features/forms-centralized/`.

## Summary
- **Total Form Components**: {len(form_components)}
- **Components Moved**: {len(results['moved_files'])}
- **Backup Files Created**: {len(results['backup_files'])}
- **Errors**: {len(results['errors'])}

## Component Categories

### Input Components ({len(categories['inputs'])})
'''
    
    for comp in categories['inputs']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Validation Components ({len(categories['validation'])})
'''
    
    for comp in categories['validation']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Layout Components ({len(categories['layouts'])})
'''
    
    for comp in categories['layouts']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Field Components ({len(categories['fields'])})
'''
    
    for comp in categories['fields']:
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
2. **Test Functionality**: Ensure all forms work correctly
3. **Refactor for Template**: Make components template-agnostic
4. **Document Dependencies**: Map all form dependencies
5. **Prepare for Migration**: Ready for modernize template

## Directory Structure

```
features/forms-centralized/
├── components/
│   ├── inputs/
│   ├── validation/
│   ├── layouts/
│   ├── fields/
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
    
    with open('/var/www/orthodoxmetrics/prod/front-end/FORMS_CONSOLIDATION_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated forms consolidation report: FORMS_CONSOLIDATION_REPORT.md')

def main():
    """Main function"""
    print('🚀 Starting forms consolidation...')
    
    # Step 1: Identify form components
    form_components = identify_form_components()
    
    # Step 2: Create forms-centralized structure
    forms_path = create_forms_centralized_structure()
    
    # Step 3: Categorize components
    categories = categorize_form_components(form_components)
    
    # Step 4: Move components
    results = move_form_components(form_components, forms_path)
    
    # Step 5: Create index files
    create_forms_index_files(forms_path)
    
    # Step 6: Generate report
    generate_forms_report(form_components, categories, results)
    
    print(f'\n🎉 Forms consolidation complete!')
    print(f'📊 Summary:')
    print(f'  Form components identified: {len(form_components)}')
    print(f'  Components moved: {len(results["moved_files"])}')
    print(f'  Backup files created: {len(results["backup_files"])}')
    print(f'  Errors: {len(results["errors"])}')
    print(f'  Report: FORMS_CONSOLIDATION_REPORT.md')
    
    return {
        'form_components': form_components,
        'categories': categories,
        'results': results
    }

if __name__ == "__main__":
    result = main()
