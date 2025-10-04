#!/usr/bin/env python3
"""
Consolidate table components into features/tables-centralized/
"""

import os
import shutil
from pathlib import Path
import re

def identify_table_components():
    """Identify all table-related components"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Identifying table components...')
    
    table_components = []
    table_patterns = ['table', 'grid', 'list', 'pagination', 'data', 'row', 'column', 'cell']
    
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
                
                # Check if it's a table component
                is_table_component = False
                for pattern in table_patterns:
                    if pattern.lower() in file_name.lower() or pattern.lower() in str(relative_path).lower():
                        is_table_component = True
                        break
                
                if is_table_component:
                    table_components.append({
                        'path': file_str,
                        'name': file_name,
                        'full_path': frontend_path / file_path,
                        'category': 'table'
                    })
    
    return table_components

def create_tables_centralized_structure():
    """Create the tables-centralized directory structure"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    tables_path = frontend_path / 'features' / 'tables-centralized'
    
    print('📁 Creating tables-centralized structure...')
    
    # Create directory structure
    directories = [
        'components',
        'components/tables',
        'components/grids',
        'components/lists',
        'components/pagination',
        'components/cells',
        'components/rows',
        'components/columns',
        'hooks',
        'services',
        'types',
        'utils',
        'constants',
        'styles'
    ]
    
    for directory in directories:
        dir_path = tables_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f'  ✅ Created: {directory}')
    
    return tables_path

def categorize_table_components(table_components):
    """Categorize table components by type"""
    print('📋 Categorizing table components...')
    
    categories = {
        'tables': [],
        'grids': [],
        'lists': [],
        'pagination': [],
        'cells': [],
        'rows': [],
        'columns': [],
        'other': []
    }
    
    for comp in table_components:
        name = comp['name'].lower()
        path = comp['path'].lower()
        
        if 'table' in name or 'table' in path:
            categories['tables'].append(comp)
        elif 'grid' in name or 'grid' in path:
            categories['grids'].append(comp)
        elif 'list' in name or 'list' in path:
            categories['lists'].append(comp)
        elif 'pagination' in name or 'pagination' in path:
            categories['pagination'].append(comp)
        elif 'cell' in name or 'cell' in path:
            categories['cells'].append(comp)
        elif 'row' in name or 'row' in path:
            categories['rows'].append(comp)
        elif 'column' in name or 'column' in path:
            categories['columns'].append(comp)
        else:
            categories['other'].append(comp)
    
    return categories

def move_table_components(table_components, tables_path):
    """Move table components to tables-centralized"""
    print('🔄 Moving table components...')
    
    results = {
        'moved_files': [],
        'backup_files': [],
        'errors': []
    }
    
    for comp in table_components:
        source_path = comp['full_path']
        relative_path = comp['path']
        
        # Determine target directory based on component type
        if 'table' in comp['name'].lower():
            target_dir = tables_path / 'components' / 'tables'
        elif 'grid' in comp['name'].lower():
            target_dir = tables_path / 'components' / 'grids'
        elif 'list' in comp['name'].lower():
            target_dir = tables_path / 'components' / 'lists'
        elif 'pagination' in comp['name'].lower():
            target_dir = tables_path / 'components' / 'pagination'
        elif 'cell' in comp['name'].lower():
            target_dir = tables_path / 'components' / 'cells'
        elif 'row' in comp['name'].lower():
            target_dir = tables_path / 'components' / 'rows'
        elif 'column' in comp['name'].lower():
            target_dir = tables_path / 'components' / 'columns'
        else:
            target_dir = tables_path / 'components'
        
        # Create target directory
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Create target file path
        target_path = target_dir / source_path.name
        
        if source_path.exists():
            try:
                # Create backup
                backup_path = source_path.with_suffix(source_path.suffix + '.tables_backup')
                shutil.copy2(source_path, backup_path)
                
                # Move file
                shutil.move(str(source_path), str(target_path))
                
                results['moved_files'].append({
                    'source': str(relative_path),
                    'target': str(target_path.relative_to(tables_path.parent)),
                    'backup': str(backup_path)
                })
                
                print(f'  ✅ Moved: {relative_path} -> {target_path.relative_to(tables_path.parent)}')
                
            except Exception as e:
                error_msg = f'Error moving {relative_path}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
        else:
            print(f'  ⚠️  File not found: {relative_path}')
    
    return results

def create_tables_index_files(tables_path):
    """Create index files for tables-centralized"""
    print('📦 Creating index files...')
    
    # Main index file
    main_index = '''// Tables Centralized - Main Export
export * from './components';
export * from './hooks';
export * from './services';
export * from './types';
export * from './utils';
export * from './constants';
'''
    
    with open(tables_path / 'index.ts', 'w') as f:
        f.write(main_index)
    
    # Components index
    components_index = '''// Table Components
export * from './tables';
export * from './grids';
export * from './lists';
export * from './pagination';
export * from './cells';
export * from './rows';
export * from './columns';
'''
    
    with open(tables_path / 'components' / 'index.ts', 'w') as f:
        f.write(components_index)
    
    # Create individual category index files
    categories = ['tables', 'grids', 'lists', 'pagination', 'cells', 'rows', 'columns']
    
    for category in categories:
        category_index = f'''// {category.title()} Components
// Auto-generated exports will be added here
'''
        
        with open(tables_path / 'components' / category / 'index.ts', 'w') as f:
            f.write(category_index)
    
    print('  ✅ Created index files')

def generate_tables_report(table_components, categories, results):
    """Generate a tables consolidation report"""
    print('📊 Generating tables consolidation report...')
    
    report_content = f'''# Tables Centralization Report

## Overview
This report documents the consolidation of table components into `features/tables-centralized/`.

## Summary
- **Total Table Components**: {len(table_components)}
- **Components Moved**: {len(results['moved_files'])}
- **Backup Files Created**: {len(results['backup_files'])}
- **Errors**: {len(results['errors'])}

## Component Categories

### Table Components ({len(categories['tables'])})
'''
    
    for comp in categories['tables']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Grid Components ({len(categories['grids'])})
'''
    
    for comp in categories['grids']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### List Components ({len(categories['lists'])})
'''
    
    for comp in categories['lists']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Pagination Components ({len(categories['pagination'])})
'''
    
    for comp in categories['pagination']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Cell Components ({len(categories['cells'])})
'''
    
    for comp in categories['cells']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Row Components ({len(categories['rows'])})
'''
    
    for comp in categories['rows']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Column Components ({len(categories['columns'])})
'''
    
    for comp in categories['columns']:
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
2. **Test Functionality**: Ensure all tables work correctly
3. **Refactor for Template**: Make components template-agnostic
4. **Document Dependencies**: Map all table dependencies
5. **Prepare for Migration**: Ready for modernize template

## Directory Structure

```
features/tables-centralized/
├── components/
│   ├── tables/
│   ├── grids/
│   ├── lists/
│   ├── pagination/
│   ├── cells/
│   ├── rows/
│   ├── columns/
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
    
    with open('/var/www/orthodoxmetrics/prod/front-end/TABLES_CONSOLIDATION_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated tables consolidation report: TABLES_CONSOLIDATION_REPORT.md')

def main():
    """Main function"""
    print('🚀 Starting tables consolidation...')
    
    # Step 1: Identify table components
    table_components = identify_table_components()
    
    # Step 2: Create tables-centralized structure
    tables_path = create_tables_centralized_structure()
    
    # Step 3: Categorize components
    categories = categorize_table_components(table_components)
    
    # Step 4: Move components
    results = move_table_components(table_components, tables_path)
    
    # Step 5: Create index files
    create_tables_index_files(tables_path)
    
    # Step 6: Generate report
    generate_tables_report(table_components, categories, results)
    
    print(f'\n🎉 Tables consolidation complete!')
    print(f'📊 Summary:')
    print(f'  Table components identified: {len(table_components)}')
    print(f'  Components moved: {len(results["moved_files"])}')
    print(f'  Backup files created: {len(results["backup_files"])}')
    print(f'  Errors: {len(results["errors"])}')
    print(f'  Report: TABLES_CONSOLIDATION_REPORT.md')
    
    return {
        'table_components': table_components,
        'categories': categories,
        'results': results
    }

if __name__ == "__main__":
    result = main()
