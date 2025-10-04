#!/usr/bin/env python3
"""
Create a comprehensive inventory of all components to be refactored
"""

import os
import re
from pathlib import Path
from collections import defaultdict

def analyze_components():
    """Analyze all components in the front-end/src directory"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Analyzing all components for refactoring...')
    
    # Component categories
    components = {
        'pages': [],
        'components': [],
        'contexts': [],
        'hooks': [],
        'utils': [],
        'services': [],
        'types': [],
        'constants': [],
        'layouts': [],
        'forms': [],
        'tables': [],
        'modals': [],
        'charts': [],
        'auth': [],
        'records': [],
        'church': [],
        'admin': [],
        'other': []
    }
    
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
                
                # Categorize components
                if 'page' in str(relative_path).lower() or file_name.endswith('Page'):
                    components['pages'].append({
                        'path': file_str,
                        'name': file_name,
                        'category': 'page'
                    })
                elif 'component' in str(relative_path).lower():
                    if 'form' in file_name.lower():
                        components['forms'].append({
                            'path': file_str,
                            'name': file_name,
                            'category': 'form'
                        })
                    elif 'table' in file_name.lower():
                        components['tables'].append({
                            'path': file_str,
                            'name': file_name,
                            'category': 'table'
                        })
                    elif 'modal' in file_name.lower():
                        components['modals'].append({
                            'path': file_str,
                            'name': file_name,
                            'category': 'modal'
                        })
                    elif 'chart' in file_name.lower():
                        components['charts'].append({
                            'path': file_str,
                            'name': file_name,
                            'category': 'chart'
                        })
                    else:
                        components['components'].append({
                            'path': file_str,
                            'name': file_name,
                            'category': 'component'
                        })
                elif 'context' in str(relative_path).lower():
                    components['contexts'].append({
                        'path': file_str,
                        'name': file_name,
                        'category': 'context'
                    })
                elif 'hook' in str(relative_path).lower():
                    components['hooks'].append({
                        'path': file_str,
                        'name': file_name,
                        'category': 'hook'
                    })
                elif 'util' in str(relative_path).lower():
                    components['utils'].append({
                        'path': file_str,
                        'name': file_name,
                        'category': 'util'
                    })
                elif 'service' in str(relative_path).lower():
                    components['services'].append({
                        'path': file_str,
                        'name': file_name,
                        'category': 'service'
                    })
                elif 'type' in str(relative_path).lower():
                    components['types'].append({
                        'path': file_str,
                        'name': file_name,
                        'category': 'type'
                    })
                elif 'constant' in str(relative_path).lower():
                    components['constants'].append({
                        'path': file_str,
                        'name': file_name,
                        'category': 'constant'
                    })
                elif 'layout' in str(relative_path).lower():
                    components['layouts'].append({
                        'path': file_str,
                        'name': file_name,
                        'category': 'layout'
                    })
                elif 'auth' in str(relative_path).lower():
                    components['auth'].append({
                        'path': file_str,
                        'name': file_name,
                        'category': 'auth'
                    })
                elif 'record' in str(relative_path).lower():
                    components['records'].append({
                        'path': file_str,
                        'name': file_name,
                        'category': 'record'
                    })
                elif 'church' in str(relative_path).lower():
                    components['church'].append({
                        'path': file_str,
                        'name': file_name,
                        'category': 'church'
                    })
                elif 'admin' in str(relative_path).lower():
                    components['admin'].append({
                        'path': file_str,
                        'name': file_name,
                        'category': 'admin'
                    })
                else:
                    components['other'].append({
                        'path': file_str,
                        'name': file_name,
                        'category': 'other'
                    })
    
    return components

def create_migration_phases(components):
    """Create migration phases based on component analysis"""
    print('📋 Creating migration phases...')
    
    phases = {
        'phase1_core': {
            'name': 'Phase 1: Core Infrastructure',
            'description': 'Essential infrastructure components that other components depend on',
            'components': [],
            'priority': 'HIGHEST'
        },
        'phase2_shared': {
            'name': 'Phase 2: Shared Components',
            'description': 'Reusable components used across the application',
            'components': [],
            'priority': 'HIGH'
        },
        'phase3_features': {
            'name': 'Phase 3: Feature Components',
            'description': 'Feature-specific components and business logic',
            'components': [],
            'priority': 'MEDIUM'
        },
        'phase4_pages': {
            'name': 'Phase 4: Pages and Routes',
            'description': 'Page components and routing',
            'components': [],
            'priority': 'LOW'
        }
    }
    
    # Phase 1: Core Infrastructure
    phases['phase1_core']['components'].extend(components['contexts'])
    phases['phase1_core']['components'].extend(components['utils'])
    phases['phase1_core']['components'].extend(components['types'])
    phases['phase1_core']['components'].extend(components['constants'])
    phases['phase1_core']['components'].extend(components['services'])
    phases['phase1_core']['components'].extend(components['hooks'])
    
    # Phase 2: Shared Components
    phases['phase2_shared']['components'].extend(components['components'])
    phases['phase2_shared']['components'].extend(components['forms'])
    phases['phase2_shared']['components'].extend(components['tables'])
    phases['phase2_shared']['components'].extend(components['modals'])
    phases['phase2_shared']['components'].extend(components['charts'])
    phases['phase2_shared']['components'].extend(components['layouts'])
    
    # Phase 3: Feature Components
    phases['phase3_features']['components'].extend(components['auth'])
    phases['phase3_features']['components'].extend(components['records'])
    phases['phase3_features']['components'].extend(components['church'])
    phases['phase3_features']['components'].extend(components['admin'])
    
    # Phase 4: Pages
    phases['phase4_pages']['components'].extend(components['pages'])
    phases['phase4_pages']['components'].extend(components['other'])
    
    return phases

def generate_component_inventory(components, phases):
    """Generate a comprehensive component inventory report"""
    print('📊 Generating component inventory...')
    
    # Calculate totals
    total_components = sum(len(comp_list) for comp_list in components.values())
    
    report_content = f'''# Complete Component Refactoring Inventory

## Overview
This document provides a comprehensive inventory of all components that will be refactored from `prod/front-end/src` to `prod/UI/modernize/frontend/src`.

## Summary Statistics
- **Total Components**: {total_components}
- **Migration Phases**: 4
- **Categories**: {len(components)}

## Component Categories

### Pages ({len(components['pages'])} components)
'''
    
    # Add pages
    for comp in sorted(components['pages'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'\n### Components ({len(components['components'])} components)\n'
    
    # Add components
    for comp in sorted(components['components'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'\n### Forms ({len(components['forms'])} components)\n'
    
    # Add forms
    for comp in sorted(components['forms'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'\n### Tables ({len(components['tables'])} components)\n'
    
    # Add tables
    for comp in sorted(components['tables'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'\n### Modals ({len(components['modals'])} components)\n'
    
    # Add modals
    for comp in sorted(components['modals'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'\n### Charts ({len(components['charts'])} components)\n'
    
    # Add charts
    for comp in sorted(components['charts'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'\n### Contexts ({len(components['contexts'])} components)\n'
    
    # Add contexts
    for comp in sorted(components['contexts'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'\n### Hooks ({len(components['hooks'])} components)\n'
    
    # Add hooks
    for comp in sorted(components['hooks'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'\n### Utils ({len(components['utils'])} components)\n'
    
    # Add utils
    for comp in sorted(components['utils'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'\n### Services ({len(components['services'])} components)\n'
    
    # Add services
    for comp in sorted(components['services'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'\n### Types ({len(components['types'])} components)\n'
    
    # Add types
    for comp in sorted(components['types'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'\n### Constants ({len(components['constants'])} components)\n'
    
    # Add constants
    for comp in sorted(components['constants'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'\n### Layouts ({len(components['layouts'])} components)\n'
    
    # Add layouts
    for comp in sorted(components['layouts'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'\n### Auth ({len(components['auth'])} components)\n'
    
    # Add auth
    for comp in sorted(components['auth'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'\n### Records ({len(components['records'])} components)\n'
    
    # Add records
    for comp in sorted(components['records'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'\n### Church ({len(components['church'])} components)\n'
    
    # Add church
    for comp in sorted(components['church'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'\n### Admin ({len(components['admin'])} components)\n'
    
    # Add admin
    for comp in sorted(components['admin'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'\n### Other ({len(components['other'])} components)\n'
    
    # Add other
    for comp in sorted(components['other'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    # Add migration phases
    report_content += f'''
## Migration Phases

### Phase 1: Core Infrastructure ({len(phases['phase1_core']['components'])} components)
**Priority**: {phases['phase1_core']['priority']}
**Description**: {phases['phase1_core']['description']}

'''
    
    for comp in sorted(phases['phase1_core']['components'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'''
### Phase 2: Shared Components ({len(phases['phase2_shared']['components'])} components)
**Priority**: {phases['phase2_shared']['priority']}
**Description**: {phases['phase2_shared']['description']}

'''
    
    for comp in sorted(phases['phase2_shared']['components'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'''
### Phase 3: Feature Components ({len(phases['phase3_features']['components'])} components)
**Priority**: {phases['phase3_features']['priority']}
**Description**: {phases['phase3_features']['description']}

'''
    
    for comp in sorted(phases['phase3_features']['components'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'''
### Phase 4: Pages and Routes ({len(phases['phase4_pages']['components'])} components)
**Priority**: {phases['phase4_pages']['priority']}
**Description**: {phases['phase4_pages']['description']}

'''
    
    for comp in sorted(phases['phase4_pages']['components'], key=lambda x: x['name']):
        report_content += f'- **{comp['name']}** - `{comp['path']}`\n'
    
    report_content += f'''
## Migration Checklist

### Phase 1: Core Infrastructure
- [ ] Migrate all context providers
- [ ] Migrate all utility functions
- [ ] Migrate all type definitions
- [ ] Migrate all constants
- [ ] Migrate all services
- [ ] Migrate all hooks
- [ ] Test core functionality

### Phase 2: Shared Components
- [ ] Migrate all base components
- [ ] Migrate all form components
- [ ] Migrate all table components
- [ ] Migrate all modal components
- [ ] Migrate all chart components
- [ ] Migrate all layout components
- [ ] Test shared components

### Phase 3: Feature Components
- [ ] Migrate all auth components
- [ ] Migrate all records components
- [ ] Migrate all church components
- [ ] Migrate all admin components
- [ ] Test feature functionality

### Phase 4: Pages and Routes
- [ ] Migrate all page components
- [ ] Migrate all other components
- [ ] Set up routing
- [ ] Test complete application

## Notes

- **Total Components**: {total_components}
- **Migration Order**: Follow phases sequentially
- **Testing**: Test after each phase
- **Documentation**: Update as components are migrated
- **Rollback**: Keep backups of original files

This inventory provides a complete roadmap for the refactoring process.
'''
    
    with open('/var/www/orthodoxmetrics/prod/front-end/COMPONENT_REFACTORING_INVENTORY.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated component inventory: COMPONENT_REFACTORING_INVENTORY.md')

def main():
    """Main function"""
    print('🚀 Creating component refactoring inventory...')
    
    # Step 1: Analyze components
    components = analyze_components()
    
    # Step 2: Create migration phases
    phases = create_migration_phases(components)
    
    # Step 3: Generate inventory
    generate_component_inventory(components, phases)
    
    # Calculate totals
    total_components = sum(len(comp_list) for comp_list in components.values())
    
    print(f'\n🎉 Component inventory complete!')
    print(f'📊 Summary:')
    print(f'  Total components: {total_components}')
    print(f'  Categories: {len(components)}')
    print(f'  Migration phases: {len(phases)}')
    print(f'  Phase 1 (Core): {len(phases["phase1_core"]["components"])} components')
    print(f'  Phase 2 (Shared): {len(phases["phase2_shared"]["components"])} components')
    print(f'  Phase 3 (Features): {len(phases["phase3_features"]["components"])} components')
    print(f'  Phase 4 (Pages): {len(phases["phase4_pages"]["components"])} components')
    
    return {
        'components': components,
        'phases': phases,
        'total_components': total_components
    }

if __name__ == "__main__":
    result = main()
    print(f'\n📊 INVENTORY SUMMARY:')
    print(f'  Total components: {result["total_components"]}')
    print(f'  Categories: {len(result["components"])}')
    print(f'  Migration phases: {len(result["phases"])}')
    print(f'  Inventory file: COMPONENT_REFACTORING_INVENTORY.md')
