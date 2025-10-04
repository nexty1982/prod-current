#!/usr/bin/env python3
"""
Consolidate card components into features/cards-centralized/
"""

import os
import shutil
from pathlib import Path
import re

def identify_card_components():
    """Identify all card-related components"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Identifying card components...')
    
    card_components = []
    card_patterns = ['card', 'panel', 'container', 'box', 'tile', 'widget', 'item', 'block', 'section', 'divider']
    
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
                
                # Check if it's a card component
                is_card_component = False
                for pattern in card_patterns:
                    if pattern.lower() in file_name.lower() or pattern.lower() in str(relative_path).lower():
                        is_card_component = True
                        break
                
                if is_card_component:
                    card_components.append({
                        'path': file_str,
                        'name': file_name,
                        'full_path': frontend_path / file_path,
                        'category': 'card'
                    })
    
    return card_components

def create_cards_centralized_structure():
    """Create the cards-centralized directory structure"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    cards_path = frontend_path / 'features' / 'cards-centralized'
    
    print('📁 Creating cards-centralized structure...')
    
    # Create directory structure
    directories = [
        'components',
        'components/cards',
        'components/panels',
        'components/containers',
        'components/boxes',
        'components/tiles',
        'components/widgets',
        'components/items',
        'components/blocks',
        'components/sections',
        'components/dividers',
        'hooks',
        'services',
        'types',
        'utils',
        'constants',
        'styles'
    ]
    
    for directory in directories:
        dir_path = cards_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f'  ✅ Created: {directory}')
    
    return cards_path

def categorize_card_components(card_components):
    """Categorize card components by type"""
    print('📋 Categorizing card components...')
    
    categories = {
        'cards': [],
        'panels': [],
        'containers': [],
        'boxes': [],
        'tiles': [],
        'widgets': [],
        'items': [],
        'blocks': [],
        'sections': [],
        'dividers': [],
        'other': []
    }
    
    for comp in card_components:
        name = comp['name'].lower()
        path = comp['path'].lower()
        
        if 'divider' in name or 'divider' in path:
            categories['dividers'].append(comp)
        elif 'section' in name or 'section' in path:
            categories['sections'].append(comp)
        elif 'block' in name or 'block' in path:
            categories['blocks'].append(comp)
        elif 'item' in name or 'item' in path:
            categories['items'].append(comp)
        elif 'widget' in name or 'widget' in path:
            categories['widgets'].append(comp)
        elif 'tile' in name or 'tile' in path:
            categories['tiles'].append(comp)
        elif 'box' in name or 'box' in path:
            categories['boxes'].append(comp)
        elif 'container' in name or 'container' in path:
            categories['containers'].append(comp)
        elif 'panel' in name or 'panel' in path:
            categories['panels'].append(comp)
        elif 'card' in name or 'card' in path:
            categories['cards'].append(comp)
        else:
            categories['other'].append(comp)
    
    return categories

def move_card_components(card_components, cards_path):
    """Move card components to cards-centralized"""
    print('🔄 Moving card components...')
    
    results = {
        'moved_files': [],
        'backup_files': [],
        'errors': []
    }
    
    for comp in card_components:
        source_path = comp['full_path']
        relative_path = comp['path']
        
        # Determine target directory based on component type
        if 'divider' in comp['name'].lower():
            target_dir = cards_path / 'components' / 'dividers'
        elif 'section' in comp['name'].lower():
            target_dir = cards_path / 'components' / 'sections'
        elif 'block' in comp['name'].lower():
            target_dir = cards_path / 'components' / 'blocks'
        elif 'item' in comp['name'].lower():
            target_dir = cards_path / 'components' / 'items'
        elif 'widget' in comp['name'].lower():
            target_dir = cards_path / 'components' / 'widgets'
        elif 'tile' in comp['name'].lower():
            target_dir = cards_path / 'components' / 'tiles'
        elif 'box' in comp['name'].lower():
            target_dir = cards_path / 'components' / 'boxes'
        elif 'container' in comp['name'].lower():
            target_dir = cards_path / 'components' / 'containers'
        elif 'panel' in comp['name'].lower():
            target_dir = cards_path / 'components' / 'panels'
        elif 'card' in comp['name'].lower():
            target_dir = cards_path / 'components' / 'cards'
        else:
            target_dir = cards_path / 'components'
        
        # Create target directory
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Create target file path
        target_path = target_dir / source_path.name
        
        if source_path.exists():
            try:
                # Create backup
                backup_path = source_path.with_suffix(source_path.suffix + '.cards_backup')
                shutil.copy2(source_path, backup_path)
                
                # Move file
                shutil.move(str(source_path), str(target_path))
                
                results['moved_files'].append({
                    'source': str(relative_path),
                    'target': str(target_path.relative_to(cards_path.parent)),
                    'backup': str(backup_path)
                })
                
                print(f'  ✅ Moved: {relative_path} -> {target_path.relative_to(cards_path.parent)}')
                
            except Exception as e:
                error_msg = f'Error moving {relative_path}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
        else:
            print(f'  ⚠️  File not found: {relative_path}')
    
    return results

def create_cards_index_files(cards_path):
    """Create index files for cards-centralized"""
    print('📦 Creating index files...')
    
    # Main index file
    main_index = '''// Cards Centralized - Main Export
export * from './components';
export * from './hooks';
export * from './services';
export * from './types';
export * from './utils';
export * from './constants';
'''
    
    with open(cards_path / 'index.ts', 'w') as f:
        f.write(main_index)
    
    # Components index
    components_index = '''// Card Components
export * from './cards';
export * from './panels';
export * from './containers';
export * from './boxes';
export * from './tiles';
export * from './widgets';
export * from './items';
export * from './blocks';
export * from './sections';
export * from './dividers';
'''
    
    with open(cards_path / 'components' / 'index.ts', 'w') as f:
        f.write(components_index)
    
    # Create individual category index files
    categories = ['cards', 'panels', 'containers', 'boxes', 'tiles', 'widgets', 'items', 'blocks', 'sections', 'dividers']
    
    for category in categories:
        category_index = f'''// {category.title()} Components
// Auto-generated exports will be added here
'''
        
        with open(cards_path / 'components' / category / 'index.ts', 'w') as f:
            f.write(category_index)
    
    print('  ✅ Created index files')

def generate_cards_report(card_components, categories, results):
    """Generate a cards consolidation report"""
    print('📊 Generating cards consolidation report...')
    
    report_content = f'''# Cards Centralization Report

## Overview
This report documents the consolidation of card components into `features/cards-centralized/`.

## Summary
- **Total Card Components**: {len(card_components)}
- **Components Moved**: {len(results['moved_files'])}
- **Backup Files Created**: {len(results['backup_files'])}
- **Errors**: {len(results['errors'])}

## Component Categories

### Card Components ({len(categories['cards'])})
'''
    
    for comp in categories['cards']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Panel Components ({len(categories['panels'])})
'''
    
    for comp in categories['panels']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Container Components ({len(categories['containers'])})
'''
    
    for comp in categories['containers']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Box Components ({len(categories['boxes'])})
'''
    
    for comp in categories['boxes']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Tile Components ({len(categories['tiles'])})
'''
    
    for comp in categories['tiles']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Widget Components ({len(categories['widgets'])})
'''
    
    for comp in categories['widgets']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Item Components ({len(categories['items'])})
'''
    
    for comp in categories['items']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Block Components ({len(categories['blocks'])})
'''
    
    for comp in categories['blocks']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Section Components ({len(categories['sections'])})
'''
    
    for comp in categories['sections']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Divider Components ({len(categories['dividers'])})
'''
    
    for comp in categories['dividers']:
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
2. **Test Functionality**: Ensure all cards work correctly
3. **Refactor for Template**: Make components template-agnostic
4. **Document Dependencies**: Map all card dependencies
5. **Prepare for Migration**: Ready for modernize template

## Directory Structure

```
features/cards-centralized/
├── components/
│   ├── cards/
│   ├── panels/
│   ├── containers/
│   ├── boxes/
│   ├── tiles/
│   ├── widgets/
│   ├── items/
│   ├── blocks/
│   ├── sections/
│   ├── dividers/
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
    
    with open('/var/www/orthodoxmetrics/prod/front-end/CARDS_CONSOLIDATION_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated cards consolidation report: CARDS_CONSOLIDATION_REPORT.md')

def main():
    """Main function"""
    print('🚀 Starting cards consolidation...')
    
    # Step 1: Identify card components
    card_components = identify_card_components()
    
    # Step 2: Create cards-centralized structure
    cards_path = create_cards_centralized_structure()
    
    # Step 3: Categorize components
    categories = categorize_card_components(card_components)
    
    # Step 4: Move components
    results = move_card_components(card_components, cards_path)
    
    # Step 5: Create index files
    create_cards_index_files(cards_path)
    
    # Step 6: Generate report
    generate_cards_report(card_components, categories, results)
    
    print(f'\n🎉 Cards consolidation complete!')
    print(f'📊 Summary:')
    print(f'  Card components identified: {len(card_components)}')
    print(f'  Components moved: {len(results["moved_files"])}')
    print(f'  Backup files created: {len(results["backup_files"])}')
    print(f'  Errors: {len(results["errors"])}')
    print(f'  Report: CARDS_CONSOLIDATION_REPORT.md')
    
    return {
        'card_components': card_components,
        'categories': categories,
        'results': results
    }

if __name__ == "__main__":
    result = main()
