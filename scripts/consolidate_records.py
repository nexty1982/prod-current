#!/usr/bin/env python3
"""
Consolidate records components into features/records-centralized/
"""

import os
import shutil
from pathlib import Path
import re

def identify_records_components():
    """Identify all records-related components"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Identifying records components...')
    
    records_components = []
    records_patterns = ['record', 'data', 'entry', 'form', 'baptism', 'marriage', 'death', 'confirmation', 'communion', 'census', 'member', 'parishioner']
    
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
                
                # Check if it's a records component
                is_records_component = False
                for pattern in records_patterns:
                    if pattern.lower() in file_name.lower() or pattern.lower() in str(relative_path).lower():
                        is_records_component = True
                        break
                
                if is_records_component:
                    records_components.append({
                        'path': file_str,
                        'name': file_name,
                        'full_path': frontend_path / file_path,
                        'category': 'records'
                    })
    
    return records_components

def create_records_centralized_structure():
    """Create the records-centralized directory structure"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    records_path = frontend_path / 'features' / 'records-centralized'
    
    print('📁 Creating records-centralized structure...')
    
    # Create directory structure
    directories = [
        'components',
        'components/records',
        'components/forms',
        'components/entries',
        'components/baptism',
        'components/marriage',
        'components/death',
        'components/confirmation',
        'components/communion',
        'components/census',
        'components/members',
        'hooks',
        'services',
        'types',
        'utils',
        'constants',
        'styles'
    ]
    
    for directory in directories:
        dir_path = records_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f'  ✅ Created: {directory}')
    
    return records_path

def categorize_records_components(records_components):
    """Categorize records components by type"""
    print('📋 Categorizing records components...')
    
    categories = {
        'records': [],
        'forms': [],
        'entries': [],
        'baptism': [],
        'marriage': [],
        'death': [],
        'confirmation': [],
        'communion': [],
        'census': [],
        'members': [],
        'other': []
    }
    
    for comp in records_components:
        name = comp['name'].lower()
        path = comp['path'].lower()
        
        if 'baptism' in name or 'baptism' in path:
            categories['baptism'].append(comp)
        elif 'marriage' in name or 'marriage' in path:
            categories['marriage'].append(comp)
        elif 'death' in name or 'death' in path:
            categories['death'].append(comp)
        elif 'confirmation' in name or 'confirmation' in path:
            categories['confirmation'].append(comp)
        elif 'communion' in name or 'communion' in path:
            categories['communion'].append(comp)
        elif 'census' in name or 'census' in path:
            categories['census'].append(comp)
        elif 'member' in name or 'member' in path or 'parishioner' in name or 'parishioner' in path:
            categories['members'].append(comp)
        elif 'form' in name or 'form' in path:
            categories['forms'].append(comp)
        elif 'entry' in name or 'entry' in path:
            categories['entries'].append(comp)
        elif 'record' in name or 'record' in path or 'data' in name or 'data' in path:
            categories['records'].append(comp)
        else:
            categories['other'].append(comp)
    
    return categories

def move_records_components(records_components, records_path):
    """Move records components to records-centralized"""
    print('🔄 Moving records components...')
    
    results = {
        'moved_files': [],
        'backup_files': [],
        'errors': []
    }
    
    for comp in records_components:
        source_path = comp['full_path']
        relative_path = comp['path']
        
        # Determine target directory based on component type
        if 'baptism' in comp['name'].lower():
            target_dir = records_path / 'components' / 'baptism'
        elif 'marriage' in comp['name'].lower():
            target_dir = records_path / 'components' / 'marriage'
        elif 'death' in comp['name'].lower():
            target_dir = records_path / 'components' / 'death'
        elif 'confirmation' in comp['name'].lower():
            target_dir = records_path / 'components' / 'confirmation'
        elif 'communion' in comp['name'].lower():
            target_dir = records_path / 'components' / 'communion'
        elif 'census' in comp['name'].lower():
            target_dir = records_path / 'components' / 'census'
        elif 'member' in comp['name'].lower() or 'parishioner' in comp['name'].lower():
            target_dir = records_path / 'components' / 'members'
        elif 'form' in comp['name'].lower():
            target_dir = records_path / 'components' / 'forms'
        elif 'entry' in comp['name'].lower():
            target_dir = records_path / 'components' / 'entries'
        elif 'record' in comp['name'].lower() or 'data' in comp['name'].lower():
            target_dir = records_path / 'components' / 'records'
        else:
            target_dir = records_path / 'components'
        
        # Create target directory
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Create target file path
        target_path = target_dir / source_path.name
        
        if source_path.exists():
            try:
                # Create backup
                backup_path = source_path.with_suffix(source_path.suffix + '.records_backup')
                shutil.copy2(source_path, backup_path)
                
                # Move file
                shutil.move(str(source_path), str(target_path))
                
                results['moved_files'].append({
                    'source': str(relative_path),
                    'target': str(target_path.relative_to(records_path.parent)),
                    'backup': str(backup_path)
                })
                
                print(f'  ✅ Moved: {relative_path} -> {target_path.relative_to(records_path.parent)}')
                
            except Exception as e:
                error_msg = f'Error moving {relative_path}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
        else:
            print(f'  ⚠️  File not found: {relative_path}')
    
    return results

def create_records_index_files(records_path):
    """Create index files for records-centralized"""
    print('📦 Creating index files...')
    
    # Main index file
    main_index = '''// Records Centralized - Main Export
export * from './components';
export * from './hooks';
export * from './services';
export * from './types';
export * from './utils';
export * from './constants';
'''
    
    with open(records_path / 'index.ts', 'w') as f:
        f.write(main_index)
    
    # Components index
    components_index = '''// Records Components
export * from './records';
export * from './forms';
export * from './entries';
export * from './baptism';
export * from './marriage';
export * from './death';
export * from './confirmation';
export * from './communion';
export * from './census';
export * from './members';
'''
    
    with open(records_path / 'components' / 'index.ts', 'w') as f:
        f.write(components_index)
    
    # Create individual category index files
    categories = ['records', 'forms', 'entries', 'baptism', 'marriage', 'death', 'confirmation', 'communion', 'census', 'members']
    
    for category in categories:
        category_index = f'''// {category.title()} Components
// Auto-generated exports will be added here
'''
        
        with open(records_path / 'components' / category / 'index.ts', 'w') as f:
            f.write(category_index)
    
    print('  ✅ Created index files')

def generate_records_report(records_components, categories, results):
    """Generate a records consolidation report"""
    print('📊 Generating records consolidation report...')
    
    report_content = f'''# Records Centralization Report

## Overview
This report documents the consolidation of records components into `features/records-centralized/`.

## Summary
- **Total Records Components**: {len(records_components)}
- **Components Moved**: {len(results['moved_files'])}
- **Backup Files Created**: {len(results['backup_files'])}
- **Errors**: {len(results['errors'])}

## Component Categories

### Records Components ({len(categories['records'])})
'''
    
    for comp in categories['records']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Form Components ({len(categories['forms'])})
'''
    
    for comp in categories['forms']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Entry Components ({len(categories['entries'])})
'''
    
    for comp in categories['entries']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Baptism Components ({len(categories['baptism'])})
'''
    
    for comp in categories['baptism']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Marriage Components ({len(categories['marriage'])})
'''
    
    for comp in categories['marriage']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Death Components ({len(categories['death'])})
'''
    
    for comp in categories['death']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Confirmation Components ({len(categories['confirmation'])})
'''
    
    for comp in categories['confirmation']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Communion Components ({len(categories['communion'])})
'''
    
    for comp in categories['communion']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Census Components ({len(categories['census'])})
'''
    
    for comp in categories['census']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Member Components ({len(categories['members'])})
'''
    
    for comp in categories['members']:
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
2. **Test Functionality**: Ensure all records components work correctly
3. **Refactor for Template**: Make components template-agnostic
4. **Document Dependencies**: Map all records dependencies
5. **Prepare for Migration**: Ready for modernize template

## Directory Structure

```
features/records-centralized/
├── components/
│   ├── records/
│   ├── forms/
│   ├── entries/
│   ├── baptism/
│   ├── marriage/
│   ├── death/
│   ├── confirmation/
│   ├── communion/
│   ├── census/
│   ├── members/
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
    
    with open('/var/www/orthodoxmetrics/prod/front-end/RECORDS_CONSOLIDATION_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated records consolidation report: RECORDS_CONSOLIDATION_REPORT.md')

def main():
    """Main function"""
    print('🚀 Starting records consolidation...')
    
    # Step 1: Identify records components
    records_components = identify_records_components()
    
    # Step 2: Create records-centralized structure
    records_path = create_records_centralized_structure()
    
    # Step 3: Categorize components
    categories = categorize_records_components(records_components)
    
    # Step 4: Move components
    results = move_records_components(records_components, records_path)
    
    # Step 5: Create index files
    create_records_index_files(records_path)
    
    # Step 6: Generate report
    generate_records_report(records_components, categories, results)
    
    print(f'\n🎉 Records consolidation complete!')
    print(f'📊 Summary:')
    print(f'  Records components identified: {len(records_components)}')
    print(f'  Components moved: {len(results["moved_files"])}')
    print(f'  Backup files created: {len(results["backup_files"])}')
    print(f'  Errors: {len(results["errors"])}')
    print(f'  Report: RECORDS_CONSOLIDATION_REPORT.md')
    
    return {
        'records_components': records_components,
        'categories': categories,
        'results': results
    }

if __name__ == "__main__":
    result = main()
