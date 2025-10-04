#!/usr/bin/env python3
"""
Consolidate dashboard components into features/dashboard-centralized/
"""

import os
import shutil
from pathlib import Path
import re

def identify_dashboard_components():
    """Identify all dashboard-related components"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Identifying dashboard components...')
    
    dashboard_components = []
    dashboard_patterns = ['dashboard', 'analytics', 'metrics', 'report', 'statistics', 'kpi', 'widget', 'overview', 'summary', 'insights']
    
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
                
                # Check if it's a dashboard component
                is_dashboard_component = False
                for pattern in dashboard_patterns:
                    if pattern.lower() in file_name.lower() or pattern.lower() in str(relative_path).lower():
                        is_dashboard_component = True
                        break
                
                if is_dashboard_component:
                    dashboard_components.append({
                        'path': file_str,
                        'name': file_name,
                        'full_path': frontend_path / file_path,
                        'category': 'dashboard'
                    })
    
    return dashboard_components

def create_dashboard_centralized_structure():
    """Create the dashboard-centralized directory structure"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    dashboard_path = frontend_path / 'features' / 'dashboard-centralized'
    
    print('📁 Creating dashboard-centralized structure...')
    
    # Create directory structure
    directories = [
        'components',
        'components/dashboard',
        'components/analytics',
        'components/metrics',
        'components/reports',
        'components/statistics',
        'components/kpi',
        'components/widgets',
        'components/overview',
        'components/summary',
        'components/insights',
        'hooks',
        'services',
        'types',
        'utils',
        'constants',
        'styles'
    ]
    
    for directory in directories:
        dir_path = dashboard_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f'  ✅ Created: {directory}')
    
    return dashboard_path

def categorize_dashboard_components(dashboard_components):
    """Categorize dashboard components by type"""
    print('📋 Categorizing dashboard components...')
    
    categories = {
        'dashboard': [],
        'analytics': [],
        'metrics': [],
        'reports': [],
        'statistics': [],
        'kpi': [],
        'widgets': [],
        'overview': [],
        'summary': [],
        'insights': [],
        'other': []
    }
    
    for comp in dashboard_components:
        name = comp['name'].lower()
        path = comp['path'].lower()
        
        if 'analytics' in name or 'analytics' in path:
            categories['analytics'].append(comp)
        elif 'metrics' in name or 'metrics' in path:
            categories['metrics'].append(comp)
        elif 'report' in name or 'report' in path:
            categories['reports'].append(comp)
        elif 'statistics' in name or 'statistics' in path:
            categories['statistics'].append(comp)
        elif 'kpi' in name or 'kpi' in path:
            categories['kpi'].append(comp)
        elif 'widget' in name or 'widget' in path:
            categories['widgets'].append(comp)
        elif 'overview' in name or 'overview' in path:
            categories['overview'].append(comp)
        elif 'summary' in name or 'summary' in path:
            categories['summary'].append(comp)
        elif 'insights' in name or 'insights' in path:
            categories['insights'].append(comp)
        elif 'dashboard' in name or 'dashboard' in path:
            categories['dashboard'].append(comp)
        else:
            categories['other'].append(comp)
    
    return categories

def move_dashboard_components(dashboard_components, dashboard_path):
    """Move dashboard components to dashboard-centralized"""
    print('🔄 Moving dashboard components...')
    
    results = {
        'moved_files': [],
        'backup_files': [],
        'errors': []
    }
    
    for comp in dashboard_components:
        source_path = comp['full_path']
        relative_path = comp['path']
        
        # Determine target directory based on component type
        if 'analytics' in comp['name'].lower():
            target_dir = dashboard_path / 'components' / 'analytics'
        elif 'metrics' in comp['name'].lower():
            target_dir = dashboard_path / 'components' / 'metrics'
        elif 'report' in comp['name'].lower():
            target_dir = dashboard_path / 'components' / 'reports'
        elif 'statistics' in comp['name'].lower():
            target_dir = dashboard_path / 'components' / 'statistics'
        elif 'kpi' in comp['name'].lower():
            target_dir = dashboard_path / 'components' / 'kpi'
        elif 'widget' in comp['name'].lower():
            target_dir = dashboard_path / 'components' / 'widgets'
        elif 'overview' in comp['name'].lower():
            target_dir = dashboard_path / 'components' / 'overview'
        elif 'summary' in comp['name'].lower():
            target_dir = dashboard_path / 'components' / 'summary'
        elif 'insights' in comp['name'].lower():
            target_dir = dashboard_path / 'components' / 'insights'
        elif 'dashboard' in comp['name'].lower():
            target_dir = dashboard_path / 'components' / 'dashboard'
        else:
            target_dir = dashboard_path / 'components'
        
        # Create target directory
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Create target file path
        target_path = target_dir / source_path.name
        
        if source_path.exists():
            try:
                # Create backup
                backup_path = source_path.with_suffix(source_path.suffix + '.dashboard_backup')
                shutil.copy2(source_path, backup_path)
                
                # Move file
                shutil.move(str(source_path), str(target_path))
                
                results['moved_files'].append({
                    'source': str(relative_path),
                    'target': str(target_path.relative_to(dashboard_path.parent)),
                    'backup': str(backup_path)
                })
                
                print(f'  ✅ Moved: {relative_path} -> {target_path.relative_to(dashboard_path.parent)}')
                
            except Exception as e:
                error_msg = f'Error moving {relative_path}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
        else:
            print(f'  ⚠️  File not found: {relative_path}')
    
    return results

def create_dashboard_index_files(dashboard_path):
    """Create index files for dashboard-centralized"""
    print('📦 Creating index files...')
    
    # Main index file
    main_index = '''// Dashboard Centralized - Main Export
export * from './components';
export * from './hooks';
export * from './services';
export * from './types';
export * from './utils';
export * from './constants';
'''
    
    with open(dashboard_path / 'index.ts', 'w') as f:
        f.write(main_index)
    
    # Components index
    components_index = '''// Dashboard Components
export * from './dashboard';
export * from './analytics';
export * from './metrics';
export * from './reports';
export * from './statistics';
export * from './kpi';
export * from './widgets';
export * from './overview';
export * from './summary';
export * from './insights';
'''
    
    with open(dashboard_path / 'components' / 'index.ts', 'w') as f:
        f.write(components_index)
    
    # Create individual category index files
    categories = ['dashboard', 'analytics', 'metrics', 'reports', 'statistics', 'kpi', 'widgets', 'overview', 'summary', 'insights']
    
    for category in categories:
        category_index = f'''// {category.title()} Components
// Auto-generated exports will be added here
'''
        
        with open(dashboard_path / 'components' / category / 'index.ts', 'w') as f:
            f.write(category_index)
    
    print('  ✅ Created index files')

def generate_dashboard_report(dashboard_components, categories, results):
    """Generate a dashboard consolidation report"""
    print('📊 Generating dashboard consolidation report...')
    
    report_content = f'''# Dashboard Centralization Report

## Overview
This report documents the consolidation of dashboard components into `features/dashboard-centralized/`.

## Summary
- **Total Dashboard Components**: {len(dashboard_components)}
- **Components Moved**: {len(results['moved_files'])}
- **Backup Files Created**: {len(results['backup_files'])}
- **Errors**: {len(results['errors'])}

## Component Categories

### Dashboard Components ({len(categories['dashboard'])})
'''
    
    for comp in categories['dashboard']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Analytics Components ({len(categories['analytics'])})
'''
    
    for comp in categories['analytics']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Metrics Components ({len(categories['metrics'])})
'''
    
    for comp in categories['metrics']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Report Components ({len(categories['reports'])})
'''
    
    for comp in categories['reports']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Statistics Components ({len(categories['statistics'])})
'''
    
    for comp in categories['statistics']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### KPI Components ({len(categories['kpi'])})
'''
    
    for comp in categories['kpi']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Widget Components ({len(categories['widgets'])})
'''
    
    for comp in categories['widgets']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Overview Components ({len(categories['overview'])})
'''
    
    for comp in categories['overview']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Summary Components ({len(categories['summary'])})
'''
    
    for comp in categories['summary']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Insights Components ({len(categories['insights'])})
'''
    
    for comp in categories['insights']:
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
2. **Test Functionality**: Ensure all dashboard components work correctly
3. **Refactor for Template**: Make components template-agnostic
4. **Document Dependencies**: Map all dashboard dependencies
5. **Prepare for Migration**: Ready for modernize template

## Directory Structure

```
features/dashboard-centralized/
├── components/
│   ├── dashboard/
│   ├── analytics/
│   ├── metrics/
│   ├── reports/
│   ├── statistics/
│   ├── kpi/
│   ├── widgets/
│   ├── overview/
│   ├── summary/
│   ├── insights/
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
    
    with open('/var/www/orthodoxmetrics/prod/front-end/DASHBOARD_CONSOLIDATION_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated dashboard consolidation report: DASHBOARD_CONSOLIDATION_REPORT.md')

def main():
    """Main function"""
    print('🚀 Starting dashboard consolidation...')
    
    # Step 1: Identify dashboard components
    dashboard_components = identify_dashboard_components()
    
    # Step 2: Create dashboard-centralized structure
    dashboard_path = create_dashboard_centralized_structure()
    
    # Step 3: Categorize components
    categories = categorize_dashboard_components(dashboard_components)
    
    # Step 4: Move components
    results = move_dashboard_components(dashboard_components, dashboard_path)
    
    # Step 5: Create index files
    create_dashboard_index_files(dashboard_path)
    
    # Step 6: Generate report
    generate_dashboard_report(dashboard_components, categories, results)
    
    print(f'\n🎉 Dashboard consolidation complete!')
    print(f'📊 Summary:')
    print(f'  Dashboard components identified: {len(dashboard_components)}')
    print(f'  Components moved: {len(results["moved_files"])}')
    print(f'  Backup files created: {len(results["backup_files"])}')
    print(f'  Errors: {len(results["errors"])}')
    print(f'  Report: DASHBOARD_CONSOLIDATION_REPORT.md')
    
    return {
        'dashboard_components': dashboard_components,
        'categories': categories,
        'results': results
    }

if __name__ == "__main__":
    result = main()
