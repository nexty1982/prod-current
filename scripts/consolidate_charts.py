#!/usr/bin/env python3
"""
Consolidate chart components into features/charts-centralized/
"""

import os
import shutil
from pathlib import Path
import re

def identify_chart_components():
    """Identify all chart-related components"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Identifying chart components...')
    
    chart_components = []
    chart_patterns = ['chart', 'graph', 'visualization', 'plot', 'pie', 'bar', 'line', 'area', 'gauge', 'sparkline', 'scatter']
    
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
                
                # Check if it's a chart component
                is_chart_component = False
                for pattern in chart_patterns:
                    if pattern.lower() in file_name.lower() or pattern.lower() in str(relative_path).lower():
                        is_chart_component = True
                        break
                
                if is_chart_component:
                    chart_components.append({
                        'path': file_str,
                        'name': file_name,
                        'full_path': frontend_path / file_path,
                        'category': 'chart'
                    })
    
    return chart_components

def create_charts_centralized_structure():
    """Create the charts-centralized directory structure"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    charts_path = frontend_path / 'features' / 'charts-centralized'
    
    print('📁 Creating charts-centralized structure...')
    
    # Create directory structure
    directories = [
        'components',
        'components/charts',
        'components/graphs',
        'components/visualizations',
        'components/plots',
        'components/pie',
        'components/bar',
        'components/line',
        'components/area',
        'components/gauge',
        'components/sparkline',
        'components/scatter',
        'hooks',
        'services',
        'types',
        'utils',
        'constants',
        'styles'
    ]
    
    for directory in directories:
        dir_path = charts_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f'  ✅ Created: {directory}')
    
    return charts_path

def categorize_chart_components(chart_components):
    """Categorize chart components by type"""
    print('📋 Categorizing chart components...')
    
    categories = {
        'charts': [],
        'graphs': [],
        'visualizations': [],
        'plots': [],
        'pie': [],
        'bar': [],
        'line': [],
        'area': [],
        'gauge': [],
        'sparkline': [],
        'scatter': [],
        'other': []
    }
    
    for comp in chart_components:
        name = comp['name'].lower()
        path = comp['path'].lower()
        
        if 'pie' in name or 'pie' in path:
            categories['pie'].append(comp)
        elif 'bar' in name or 'bar' in path:
            categories['bar'].append(comp)
        elif 'line' in name or 'line' in path:
            categories['line'].append(comp)
        elif 'area' in name or 'area' in path:
            categories['area'].append(comp)
        elif 'gauge' in name or 'gauge' in path:
            categories['gauge'].append(comp)
        elif 'sparkline' in name or 'sparkline' in path:
            categories['sparkline'].append(comp)
        elif 'scatter' in name or 'scatter' in path:
            categories['scatter'].append(comp)
        elif 'plot' in name or 'plot' in path:
            categories['plots'].append(comp)
        elif 'visualization' in name or 'visualization' in path:
            categories['visualizations'].append(comp)
        elif 'graph' in name or 'graph' in path:
            categories['graphs'].append(comp)
        elif 'chart' in name or 'chart' in path:
            categories['charts'].append(comp)
        else:
            categories['other'].append(comp)
    
    return categories

def move_chart_components(chart_components, charts_path):
    """Move chart components to charts-centralized"""
    print('🔄 Moving chart components...')
    
    results = {
        'moved_files': [],
        'backup_files': [],
        'errors': []
    }
    
    for comp in chart_components:
        source_path = comp['full_path']
        relative_path = comp['path']
        
        # Determine target directory based on component type
        if 'pie' in comp['name'].lower():
            target_dir = charts_path / 'components' / 'pie'
        elif 'bar' in comp['name'].lower():
            target_dir = charts_path / 'components' / 'bar'
        elif 'line' in comp['name'].lower():
            target_dir = charts_path / 'components' / 'line'
        elif 'area' in comp['name'].lower():
            target_dir = charts_path / 'components' / 'area'
        elif 'gauge' in comp['name'].lower():
            target_dir = charts_path / 'components' / 'gauge'
        elif 'sparkline' in comp['name'].lower():
            target_dir = charts_path / 'components' / 'sparkline'
        elif 'scatter' in comp['name'].lower():
            target_dir = charts_path / 'components' / 'scatter'
        elif 'plot' in comp['name'].lower():
            target_dir = charts_path / 'components' / 'plots'
        elif 'visualization' in comp['name'].lower():
            target_dir = charts_path / 'components' / 'visualizations'
        elif 'graph' in comp['name'].lower():
            target_dir = charts_path / 'components' / 'graphs'
        elif 'chart' in comp['name'].lower():
            target_dir = charts_path / 'components' / 'charts'
        else:
            target_dir = charts_path / 'components'
        
        # Create target directory
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Create target file path
        target_path = target_dir / source_path.name
        
        if source_path.exists():
            try:
                # Create backup
                backup_path = source_path.with_suffix(source_path.suffix + '.charts_backup')
                shutil.copy2(source_path, backup_path)
                
                # Move file
                shutil.move(str(source_path), str(target_path))
                
                results['moved_files'].append({
                    'source': str(relative_path),
                    'target': str(target_path.relative_to(charts_path.parent)),
                    'backup': str(backup_path)
                })
                
                print(f'  ✅ Moved: {relative_path} -> {target_path.relative_to(charts_path.parent)}')
                
            except Exception as e:
                error_msg = f'Error moving {relative_path}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
        else:
            print(f'  ⚠️  File not found: {relative_path}')
    
    return results

def create_charts_index_files(charts_path):
    """Create index files for charts-centralized"""
    print('📦 Creating index files...')
    
    # Main index file
    main_index = '''// Charts Centralized - Main Export
export * from './components';
export * from './hooks';
export * from './services';
export * from './types';
export * from './utils';
export * from './constants';
'''
    
    with open(charts_path / 'index.ts', 'w') as f:
        f.write(main_index)
    
    # Components index
    components_index = '''// Chart Components
export * from './charts';
export * from './graphs';
export * from './visualizations';
export * from './plots';
export * from './pie';
export * from './bar';
export * from './line';
export * from './area';
export * from './gauge';
export * from './sparkline';
export * from './scatter';
'''
    
    with open(charts_path / 'components' / 'index.ts', 'w') as f:
        f.write(components_index)
    
    # Create individual category index files
    categories = ['charts', 'graphs', 'visualizations', 'plots', 'pie', 'bar', 'line', 'area', 'gauge', 'sparkline', 'scatter']
    
    for category in categories:
        category_index = f'''// {category.title()} Components
// Auto-generated exports will be added here
'''
        
        with open(charts_path / 'components' / category / 'index.ts', 'w') as f:
            f.write(category_index)
    
    print('  ✅ Created index files')

def generate_charts_report(chart_components, categories, results):
    """Generate a charts consolidation report"""
    print('📊 Generating charts consolidation report...')
    
    report_content = f'''# Charts Centralization Report

## Overview
This report documents the consolidation of chart components into `features/charts-centralized/`.

## Summary
- **Total Chart Components**: {len(chart_components)}
- **Components Moved**: {len(results['moved_files'])}
- **Backup Files Created**: {len(results['backup_files'])}
- **Errors**: {len(results['errors'])}

## Component Categories

### Chart Components ({len(categories['charts'])})
'''
    
    for comp in categories['charts']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Graph Components ({len(categories['graphs'])})
'''
    
    for comp in categories['graphs']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Visualization Components ({len(categories['visualizations'])})
'''
    
    for comp in categories['visualizations']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Plot Components ({len(categories['plots'])})
'''
    
    for comp in categories['plots']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Pie Chart Components ({len(categories['pie'])})
'''
    
    for comp in categories['pie']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Bar Chart Components ({len(categories['bar'])})
'''
    
    for comp in categories['bar']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Line Chart Components ({len(categories['line'])})
'''
    
    for comp in categories['line']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Area Chart Components ({len(categories['area'])})
'''
    
    for comp in categories['area']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Gauge Chart Components ({len(categories['gauge'])})
'''
    
    for comp in categories['gauge']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Sparkline Chart Components ({len(categories['sparkline'])})
'''
    
    for comp in categories['sparkline']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Scatter Chart Components ({len(categories['scatter'])})
'''
    
    for comp in categories['scatter']:
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
2. **Test Functionality**: Ensure all charts work correctly
3. **Refactor for Template**: Make components template-agnostic
4. **Document Dependencies**: Map all chart dependencies
5. **Prepare for Migration**: Ready for modernize template

## Directory Structure

```
features/charts-centralized/
├── components/
│   ├── charts/
│   ├── graphs/
│   ├── visualizations/
│   ├── plots/
│   ├── pie/
│   ├── bar/
│   ├── line/
│   ├── area/
│   ├── gauge/
│   ├── sparkline/
│   ├── scatter/
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
    
    with open('/var/www/orthodoxmetrics/prod/front-end/CHARTS_CONSOLIDATION_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated charts consolidation report: CHARTS_CONSOLIDATION_REPORT.md')

def main():
    """Main function"""
    print('🚀 Starting charts consolidation...')
    
    # Step 1: Identify chart components
    chart_components = identify_chart_components()
    
    # Step 2: Create charts-centralized structure
    charts_path = create_charts_centralized_structure()
    
    # Step 3: Categorize components
    categories = categorize_chart_components(chart_components)
    
    # Step 4: Move components
    results = move_chart_components(chart_components, charts_path)
    
    # Step 5: Create index files
    create_charts_index_files(charts_path)
    
    # Step 6: Generate report
    generate_charts_report(chart_components, categories, results)
    
    print(f'\n🎉 Charts consolidation complete!')
    print(f'📊 Summary:')
    print(f'  Chart components identified: {len(chart_components)}')
    print(f'  Components moved: {len(results["moved_files"])}')
    print(f'  Backup files created: {len(results["backup_files"])}')
    print(f'  Errors: {len(results["errors"])}')
    print(f'  Report: CHARTS_CONSOLIDATION_REPORT.md')
    
    return {
        'chart_components': chart_components,
        'categories': categories,
        'results': results
    }

if __name__ == "__main__":
    result = main()
