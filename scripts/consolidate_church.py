#!/usr/bin/env python3
"""
Consolidate church management components into features/church-centralized/
"""

import os
import shutil
from pathlib import Path
import re

def identify_church_components():
    """Identify all church management-related components"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Identifying church management components...')
    
    church_components = []
    church_patterns = ['church', 'parish', 'diocese', 'clergy', 'priest', 'deacon', 'bishop', 'liturgy', 'service', 'mass', 'divine', 'orthodox', 'eastern']
    
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
                
                # Check if it's a church component
                is_church_component = False
                for pattern in church_patterns:
                    if pattern.lower() in file_name.lower() or pattern.lower() in str(relative_path).lower():
                        is_church_component = True
                        break
                
                if is_church_component:
                    church_components.append({
                        'path': file_str,
                        'name': file_name,
                        'full_path': frontend_path / file_path,
                        'category': 'church'
                    })
    
    return church_components

def create_church_centralized_structure():
    """Create the church-centralized directory structure"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    church_path = frontend_path / 'features' / 'church-centralized'
    
    print('📁 Creating church-centralized structure...')
    
    # Create directory structure
    directories = [
        'components',
        'components/church',
        'components/parish',
        'components/diocese',
        'components/clergy',
        'components/liturgy',
        'components/services',
        'components/calendar',
        'components/management',
        'hooks',
        'services',
        'types',
        'utils',
        'constants',
        'styles'
    ]
    
    for directory in directories:
        dir_path = church_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f'  ✅ Created: {directory}')
    
    return church_path

def categorize_church_components(church_components):
    """Categorize church components by type"""
    print('📋 Categorizing church components...')
    
    categories = {
        'church': [],
        'parish': [],
        'diocese': [],
        'clergy': [],
        'liturgy': [],
        'services': [],
        'calendar': [],
        'management': [],
        'other': []
    }
    
    for comp in church_components:
        name = comp['name'].lower()
        path = comp['path'].lower()
        
        if 'parish' in name or 'parish' in path:
            categories['parish'].append(comp)
        elif 'diocese' in name or 'diocese' in path:
            categories['diocese'].append(comp)
        elif 'clergy' in name or 'clergy' in path or 'priest' in name or 'priest' in path or 'deacon' in name or 'deacon' in path or 'bishop' in name or 'bishop' in path:
            categories['clergy'].append(comp)
        elif 'liturgy' in name or 'liturgy' in path or 'divine' in name or 'divine' in path:
            categories['liturgy'].append(comp)
        elif 'service' in name or 'service' in path or 'mass' in name or 'mass' in path:
            categories['services'].append(comp)
        elif 'calendar' in name or 'calendar' in path:
            categories['calendar'].append(comp)
        elif 'management' in name or 'management' in path:
            categories['management'].append(comp)
        elif 'church' in name or 'church' in path or 'orthodox' in name or 'orthodox' in path or 'eastern' in name or 'eastern' in path:
            categories['church'].append(comp)
        else:
            categories['other'].append(comp)
    
    return categories

def move_church_components(church_components, church_path):
    """Move church components to church-centralized"""
    print('🔄 Moving church components...')
    
    results = {
        'moved_files': [],
        'backup_files': [],
        'errors': []
    }
    
    for comp in church_components:
        source_path = comp['full_path']
        relative_path = comp['path']
        
        # Determine target directory based on component type
        if 'parish' in comp['name'].lower():
            target_dir = church_path / 'components' / 'parish'
        elif 'diocese' in comp['name'].lower():
            target_dir = church_path / 'components' / 'diocese'
        elif 'clergy' in comp['name'].lower() or 'priest' in comp['name'].lower() or 'deacon' in comp['name'].lower() or 'bishop' in comp['name'].lower():
            target_dir = church_path / 'components' / 'clergy'
        elif 'liturgy' in comp['name'].lower() or 'divine' in comp['name'].lower():
            target_dir = church_path / 'components' / 'liturgy'
        elif 'service' in comp['name'].lower() or 'mass' in comp['name'].lower():
            target_dir = church_path / 'components' / 'services'
        elif 'calendar' in comp['name'].lower():
            target_dir = church_path / 'components' / 'calendar'
        elif 'management' in comp['name'].lower():
            target_dir = church_path / 'components' / 'management'
        elif 'church' in comp['name'].lower() or 'orthodox' in comp['name'].lower() or 'eastern' in comp['name'].lower():
            target_dir = church_path / 'components' / 'church'
        else:
            target_dir = church_path / 'components'
        
        # Create target directory
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Create target file path
        target_path = target_dir / source_path.name
        
        if source_path.exists():
            try:
                # Create backup
                backup_path = source_path.with_suffix(source_path.suffix + '.church_backup')
                shutil.copy2(source_path, backup_path)
                
                # Move file
                shutil.move(str(source_path), str(target_path))
                
                results['moved_files'].append({
                    'source': str(relative_path),
                    'target': str(target_path.relative_to(church_path.parent)),
                    'backup': str(backup_path)
                })
                
                print(f'  ✅ Moved: {relative_path} -> {target_path.relative_to(church_path.parent)}')
                
            except Exception as e:
                error_msg = f'Error moving {relative_path}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
        else:
            print(f'  ⚠️  File not found: {relative_path}')
    
    return results

def create_church_index_files(church_path):
    """Create index files for church-centralized"""
    print('📦 Creating index files...')
    
    # Main index file
    main_index = '''// Church Centralized - Main Export
export * from './components';
export * from './hooks';
export * from './services';
export * from './types';
export * from './utils';
export * from './constants';
'''
    
    with open(church_path / 'index.ts', 'w') as f:
        f.write(main_index)
    
    # Components index
    components_index = '''// Church Components
export * from './church';
export * from './parish';
export * from './diocese';
export * from './clergy';
export * from './liturgy';
export * from './services';
export * from './calendar';
export * from './management';
'''
    
    with open(church_path / 'components' / 'index.ts', 'w') as f:
        f.write(components_index)
    
    # Create individual category index files
    categories = ['church', 'parish', 'diocese', 'clergy', 'liturgy', 'services', 'calendar', 'management']
    
    for category in categories:
        category_index = f'''// {category.title()} Components
// Auto-generated exports will be added here
'''
        
        with open(church_path / 'components' / category / 'index.ts', 'w') as f:
            f.write(category_index)
    
    print('  ✅ Created index files')

def generate_church_report(church_components, categories, results):
    """Generate a church consolidation report"""
    print('📊 Generating church consolidation report...')
    
    report_content = f'''# Church Centralization Report

## Overview
This report documents the consolidation of church management components into `features/church-centralized/`.

## Summary
- **Total Church Components**: {len(church_components)}
- **Components Moved**: {len(results['moved_files'])}
- **Backup Files Created**: {len(results['backup_files'])}
- **Errors**: {len(results['errors'])}

## Component Categories

### Church Components ({len(categories['church'])})
'''
    
    for comp in categories['church']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Parish Components ({len(categories['parish'])})
'''
    
    for comp in categories['parish']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Diocese Components ({len(categories['diocese'])})
'''
    
    for comp in categories['diocese']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Clergy Components ({len(categories['clergy'])})
'''
    
    for comp in categories['clergy']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Liturgy Components ({len(categories['liturgy'])})
'''
    
    for comp in categories['liturgy']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Service Components ({len(categories['services'])})
'''
    
    for comp in categories['services']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Calendar Components ({len(categories['calendar'])})
'''
    
    for comp in categories['calendar']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Management Components ({len(categories['management'])})
'''
    
    for comp in categories['management']:
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
2. **Test Functionality**: Ensure all church components work correctly
3. **Refactor for Template**: Make components template-agnostic
4. **Document Dependencies**: Map all church dependencies
5. **Prepare for Migration**: Ready for modernize template

## Directory Structure

```
features/church-centralized/
├── components/
│   ├── church/
│   ├── parish/
│   ├── diocese/
│   ├── clergy/
│   ├── liturgy/
│   ├── services/
│   ├── calendar/
│   ├── management/
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
    
    with open('/var/www/orthodoxmetrics/prod/front-end/CHURCH_CONSOLIDATION_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated church consolidation report: CHURCH_CONSOLIDATION_REPORT.md')

def main():
    """Main function"""
    print('🚀 Starting church consolidation...')
    
    # Step 1: Identify church components
    church_components = identify_church_components()
    
    # Step 2: Create church-centralized structure
    church_path = create_church_centralized_structure()
    
    # Step 3: Categorize components
    categories = categorize_church_components(church_components)
    
    # Step 4: Move components
    results = move_church_components(church_components, church_path)
    
    # Step 5: Create index files
    create_church_index_files(church_path)
    
    # Step 6: Generate report
    generate_church_report(church_components, categories, results)
    
    print(f'\n🎉 Church consolidation complete!')
    print(f'📊 Summary:')
    print(f'  Church components identified: {len(church_components)}')
    print(f'  Components moved: {len(results["moved_files"])}')
    print(f'  Backup files created: {len(results["backup_files"])}')
    print(f'  Errors: {len(results["errors"])}')
    print(f'  Report: CHURCH_CONSOLIDATION_REPORT.md')
    
    return {
        'church_components': church_components,
        'categories': categories,
        'results': results
    }

if __name__ == "__main__":
    result = main()
