#!/usr/bin/env python3
"""
Consolidate layout components into features/layouts-centralized/
"""

import os
import shutil
from pathlib import Path
import re

def identify_layout_components():
    """Identify all layout-related components"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Identifying layout components...')
    
    layout_components = []
    layout_patterns = ['layout', 'navigation', 'header', 'footer', 'sidebar', 'navbar', 'menu', 'breadcrumb', 'container', 'wrapper', 'section']
    
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
                
                # Check if it's a layout component
                is_layout_component = False
                for pattern in layout_patterns:
                    if pattern.lower() in file_name.lower() or pattern.lower() in str(relative_path).lower():
                        is_layout_component = True
                        break
                
                if is_layout_component:
                    layout_components.append({
                        'path': file_str,
                        'name': file_name,
                        'full_path': frontend_path / file_path,
                        'category': 'layout'
                    })
    
    return layout_components

def create_layouts_centralized_structure():
    """Create the layouts-centralized directory structure"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    layouts_path = frontend_path / 'features' / 'layouts-centralized'
    
    print('📁 Creating layouts-centralized structure...')
    
    # Create directory structure
    directories = [
        'components',
        'components/layouts',
        'components/navigation',
        'components/headers',
        'components/footers',
        'components/sidebars',
        'components/navbars',
        'components/menus',
        'components/breadcrumbs',
        'components/containers',
        'components/wrappers',
        'components/sections',
        'hooks',
        'services',
        'types',
        'utils',
        'constants',
        'styles'
    ]
    
    for directory in directories:
        dir_path = layouts_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f'  ✅ Created: {directory}')
    
    return layouts_path

def categorize_layout_components(layout_components):
    """Categorize layout components by type"""
    print('📋 Categorizing layout components...')
    
    categories = {
        'layouts': [],
        'navigation': [],
        'headers': [],
        'footers': [],
        'sidebars': [],
        'navbars': [],
        'menus': [],
        'breadcrumbs': [],
        'containers': [],
        'wrappers': [],
        'sections': [],
        'other': []
    }
    
    for comp in layout_components:
        name = comp['name'].lower()
        path = comp['path'].lower()
        
        if 'header' in name or 'header' in path:
            categories['headers'].append(comp)
        elif 'footer' in name or 'footer' in path:
            categories['footers'].append(comp)
        elif 'sidebar' in name or 'sidebar' in path:
            categories['sidebars'].append(comp)
        elif 'navbar' in name or 'navbar' in path:
            categories['navbars'].append(comp)
        elif 'menu' in name or 'menu' in path:
            categories['menus'].append(comp)
        elif 'breadcrumb' in name or 'breadcrumb' in path:
            categories['breadcrumbs'].append(comp)
        elif 'container' in name or 'container' in path:
            categories['containers'].append(comp)
        elif 'wrapper' in name or 'wrapper' in path:
            categories['wrappers'].append(comp)
        elif 'section' in name or 'section' in path:
            categories['sections'].append(comp)
        elif 'navigation' in name or 'navigation' in path:
            categories['navigation'].append(comp)
        elif 'layout' in name or 'layout' in path:
            categories['layouts'].append(comp)
        else:
            categories['other'].append(comp)
    
    return categories

def move_layout_components(layout_components, layouts_path):
    """Move layout components to layouts-centralized"""
    print('🔄 Moving layout components...')
    
    results = {
        'moved_files': [],
        'backup_files': [],
        'errors': []
    }
    
    for comp in layout_components:
        source_path = comp['full_path']
        relative_path = comp['path']
        
        # Determine target directory based on component type
        if 'header' in comp['name'].lower():
            target_dir = layouts_path / 'components' / 'headers'
        elif 'footer' in comp['name'].lower():
            target_dir = layouts_path / 'components' / 'footers'
        elif 'sidebar' in comp['name'].lower():
            target_dir = layouts_path / 'components' / 'sidebars'
        elif 'navbar' in comp['name'].lower():
            target_dir = layouts_path / 'components' / 'navbars'
        elif 'menu' in comp['name'].lower():
            target_dir = layouts_path / 'components' / 'menus'
        elif 'breadcrumb' in comp['name'].lower():
            target_dir = layouts_path / 'components' / 'breadcrumbs'
        elif 'container' in comp['name'].lower():
            target_dir = layouts_path / 'components' / 'containers'
        elif 'wrapper' in comp['name'].lower():
            target_dir = layouts_path / 'components' / 'wrappers'
        elif 'section' in comp['name'].lower():
            target_dir = layouts_path / 'components' / 'sections'
        elif 'navigation' in comp['name'].lower():
            target_dir = layouts_path / 'components' / 'navigation'
        elif 'layout' in comp['name'].lower():
            target_dir = layouts_path / 'components' / 'layouts'
        else:
            target_dir = layouts_path / 'components'
        
        # Create target directory
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Create target file path
        target_path = target_dir / source_path.name
        
        if source_path.exists():
            try:
                # Create backup
                backup_path = source_path.with_suffix(source_path.suffix + '.layouts_backup')
                shutil.copy2(source_path, backup_path)
                
                # Move file
                shutil.move(str(source_path), str(target_path))
                
                results['moved_files'].append({
                    'source': str(relative_path),
                    'target': str(target_path.relative_to(layouts_path.parent)),
                    'backup': str(backup_path)
                })
                
                print(f'  ✅ Moved: {relative_path} -> {target_path.relative_to(layouts_path.parent)}')
                
            except Exception as e:
                error_msg = f'Error moving {relative_path}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
        else:
            print(f'  ⚠️  File not found: {relative_path}')
    
    return results

def create_layouts_index_files(layouts_path):
    """Create index files for layouts-centralized"""
    print('📦 Creating index files...')
    
    # Main index file
    main_index = '''// Layouts Centralized - Main Export
export * from './components';
export * from './hooks';
export * from './services';
export * from './types';
export * from './utils';
export * from './constants';
'''
    
    with open(layouts_path / 'index.ts', 'w') as f:
        f.write(main_index)
    
    # Components index
    components_index = '''// Layout Components
export * from './layouts';
export * from './navigation';
export * from './headers';
export * from './footers';
export * from './sidebars';
export * from './navbars';
export * from './menus';
export * from './breadcrumbs';
export * from './containers';
export * from './wrappers';
export * from './sections';
'''
    
    with open(layouts_path / 'components' / 'index.ts', 'w') as f:
        f.write(components_index)
    
    # Create individual category index files
    categories = ['layouts', 'navigation', 'headers', 'footers', 'sidebars', 'navbars', 'menus', 'breadcrumbs', 'containers', 'wrappers', 'sections']
    
    for category in categories:
        category_index = f'''// {category.title()} Components
// Auto-generated exports will be added here
'''
        
        with open(layouts_path / 'components' / category / 'index.ts', 'w') as f:
            f.write(category_index)
    
    print('  ✅ Created index files')

def generate_layouts_report(layout_components, categories, results):
    """Generate a layouts consolidation report"""
    print('📊 Generating layouts consolidation report...')
    
    report_content = f'''# Layouts Centralization Report

## Overview
This report documents the consolidation of layout components into `features/layouts-centralized/`.

## Summary
- **Total Layout Components**: {len(layout_components)}
- **Components Moved**: {len(results['moved_files'])}
- **Backup Files Created**: {len(results['backup_files'])}
- **Errors**: {len(results['errors'])}

## Component Categories

### Layout Components ({len(categories['layouts'])})
'''
    
    for comp in categories['layouts']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Navigation Components ({len(categories['navigation'])})
'''
    
    for comp in categories['navigation']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Header Components ({len(categories['headers'])})
'''
    
    for comp in categories['headers']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Footer Components ({len(categories['footers'])})
'''
    
    for comp in categories['footers']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Sidebar Components ({len(categories['sidebars'])})
'''
    
    for comp in categories['sidebars']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Navbar Components ({len(categories['navbars'])})
'''
    
    for comp in categories['navbars']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Menu Components ({len(categories['menus'])})
'''
    
    for comp in categories['menus']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Breadcrumb Components ({len(categories['breadcrumbs'])})
'''
    
    for comp in categories['breadcrumbs']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Container Components ({len(categories['containers'])})
'''
    
    for comp in categories['containers']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Wrapper Components ({len(categories['wrappers'])})
'''
    
    for comp in categories['wrappers']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Section Components ({len(categories['sections'])})
'''
    
    for comp in categories['sections']:
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
2. **Test Functionality**: Ensure all layouts work correctly
3. **Refactor for Template**: Make components template-agnostic
4. **Document Dependencies**: Map all layout dependencies
5. **Prepare for Migration**: Ready for modernize template

## Directory Structure

```
features/layouts-centralized/
├── components/
│   ├── layouts/
│   ├── navigation/
│   ├── headers/
│   ├── footers/
│   ├── sidebars/
│   ├── navbars/
│   ├── menus/
│   ├── breadcrumbs/
│   ├── containers/
│   ├── wrappers/
│   ├── sections/
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
    
    with open('/var/www/orthodoxmetrics/prod/front-end/LAYOUTS_CONSOLIDATION_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated layouts consolidation report: LAYOUTS_CONSOLIDATION_REPORT.md')

def main():
    """Main function"""
    print('🚀 Starting layouts consolidation...')
    
    # Step 1: Identify layout components
    layout_components = identify_layout_components()
    
    # Step 2: Create layouts-centralized structure
    layouts_path = create_layouts_centralized_structure()
    
    # Step 3: Categorize components
    categories = categorize_layout_components(layout_components)
    
    # Step 4: Move components
    results = move_layout_components(layout_components, layouts_path)
    
    # Step 5: Create index files
    create_layouts_index_files(layouts_path)
    
    # Step 6: Generate report
    generate_layouts_report(layout_components, categories, results)
    
    print(f'\n🎉 Layouts consolidation complete!')
    print(f'📊 Summary:')
    print(f'  Layout components identified: {len(layout_components)}')
    print(f'  Components moved: {len(results["moved_files"])}')
    print(f'  Backup files created: {len(results["backup_files"])}')
    print(f'  Errors: {len(results["errors"])}')
    print(f'  Report: LAYOUTS_CONSOLIDATION_REPORT.md')
    
    return {
        'layout_components': layout_components,
        'categories': categories,
        'results': results
    }

if __name__ == "__main__":
    result = main()
