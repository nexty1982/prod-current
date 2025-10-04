#!/usr/bin/env python3
"""
Systematic component consolidation plan
"""

import os
import re
from pathlib import Path
from collections import defaultdict

def identify_component_groups():
    """Identify components that serve the same purpose"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Identifying component groups for consolidation...')
    
    # Component groups based on functionality
    component_groups = {
        'auth': {
            'name': 'Authentication Components',
            'description': 'Login, registration, password reset, user management',
            'patterns': ['auth', 'login', 'register', 'password', 'user'],
            'components': []
        },
        'forms': {
            'name': 'Form Components', 
            'description': 'Form inputs, validation, form layouts',
            'patterns': ['form', 'input', 'field', 'validation'],
            'components': []
        },
        'tables': {
            'name': 'Table Components',
            'description': 'Data tables, grids, lists, pagination',
            'patterns': ['table', 'grid', 'list', 'pagination', 'data'],
            'components': []
        },
        'modals': {
            'name': 'Modal Components',
            'description': 'Dialogs, popups, confirmations, overlays',
            'patterns': ['modal', 'dialog', 'popup', 'confirm', 'overlay'],
            'components': []
        },
        'charts': {
            'name': 'Chart Components',
            'description': 'Data visualization, graphs, analytics',
            'patterns': ['chart', 'graph', 'analytics', 'visualization'],
            'components': []
        },
        'navigation': {
            'name': 'Navigation Components',
            'description': 'Menus, breadcrumbs, tabs, navigation',
            'patterns': ['nav', 'menu', 'breadcrumb', 'tab', 'sidebar'],
            'components': []
        },
        'layout': {
            'name': 'Layout Components',
            'description': 'Headers, footers, containers, layouts',
            'patterns': ['header', 'footer', 'layout', 'container', 'sidebar'],
            'components': []
        },
        'ui': {
            'name': 'UI Components',
            'description': 'Buttons, cards, badges, tooltips, UI elements',
            'patterns': ['button', 'card', 'badge', 'tooltip', 'ui'],
            'components': []
        }
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
                for group_name, group_info in component_groups.items():
                    for pattern in group_info['patterns']:
                        if pattern.lower() in file_name.lower() or pattern.lower() in str(relative_path).lower():
                            component_groups[group_name]['components'].append({
                                'path': file_str,
                                'name': file_name,
                                'category': group_name
                            })
                            break
    
    return component_groups

def create_consolidation_plan(component_groups):
    """Create a consolidation plan for each component group"""
    print('📋 Creating consolidation plan...')
    
    plan = {
        'phases': [],
        'total_components': 0,
        'estimated_effort': 'Medium'
    }
    
    for group_name, group_info in component_groups.items():
        if len(group_info['components']) > 1:  # Only consolidate groups with multiple components
            phase = {
                'name': f"Consolidate {group_info['name']}",
                'group': group_name,
                'description': group_info['description'],
                'components': group_info['components'],
                'count': len(group_info['components']),
                'target_directory': f'features/{group_name}-centralized',
                'priority': 'High' if group_name in ['auth', 'forms', 'tables'] else 'Medium'
            }
            plan['phases'].append(phase)
            plan['total_components'] += len(group_info['components'])
    
    # Sort by priority and component count
    plan['phases'].sort(key=lambda x: (x['priority'] == 'High', x['count']), reverse=True)
    
    return plan

def generate_consolidation_report(component_groups, plan):
    """Generate a consolidation report"""
    print('📊 Generating consolidation report...')
    
    report_content = f'''# Component Consolidation Plan

## Overview
This plan outlines the systematic consolidation of components into centralized feature directories, following the pattern established with Records-centralized.

## Strategy
1. **Identify** components serving the same purpose
2. **Relocate** to `features/component_name-centralized/`
3. **Analyze** dependencies and imports
4. **Refactor** for template-agnostic design
5. **Prepare** for modernize template migration

## Component Groups

'''
    
    for group_name, group_info in component_groups.items():
        if len(group_info['components']) > 0:
            report_content += f'''
### {group_info['name']} ({len(group_info['components'])} components)
**Description**: {group_info['description']}

'''
            for comp in group_info['components']:
                report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
## Consolidation Phases

**Total Components to Consolidate**: {plan['total_components']}
**Estimated Effort**: {plan['estimated_effort']}

'''
    
    for i, phase in enumerate(plan['phases'], 1):
        report_content += f'''
### Phase {i}: {phase['name']}
**Priority**: {phase['priority']}
**Components**: {phase['count']}
**Target Directory**: `{phase['target_directory']}/`
**Description**: {phase['description']}

**Components to Consolidate**:
'''
        for comp in phase['components']:
            report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
## Implementation Steps

### For Each Phase:
1. **Create Target Directory**: `features/{{group_name}}-centralized/`
2. **Move Components**: Relocate all components to the new directory
3. **Update Imports**: Fix all import statements
4. **Create Index Files**: Export all components
5. **Test Functionality**: Ensure everything works
6. **Document Dependencies**: Map all dependencies
7. **Refactor for Template**: Make components template-agnostic

### Directory Structure:
```
features/
├── auth-centralized/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── index.ts
├── forms-centralized/
│   ├── components/
│   ├── validation/
│   ├── types/
│   └── index.ts
└── ...
```

## Next Steps

1. **Start with High Priority**: Auth, Forms, Tables
2. **Follow Records Pattern**: Use Records-centralized as template
3. **Test Each Phase**: Ensure functionality before proceeding
4. **Document Progress**: Update this report as you go

## Benefits

- **Reduced Duplication**: Single source of truth for each component type
- **Easier Maintenance**: Centralized logic and styling
- **Template Migration**: Ready for modernize template
- **Better Organization**: Clear feature boundaries
- **Reusability**: Components can be easily reused
'''
    
    with open('/var/www/orthodoxmetrics/prod/front-end/COMPONENT_CONSOLIDATION_PLAN.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated consolidation plan: COMPONENT_CONSOLIDATION_PLAN.md')

def main():
    """Main function"""
    print('🚀 Starting component consolidation planning...')
    
    # Step 1: Identify component groups
    component_groups = identify_component_groups()
    
    # Step 2: Create consolidation plan
    plan = create_consolidation_plan(component_groups)
    
    # Step 3: Generate report
    generate_consolidation_report(component_groups, plan)
    
    print(f'\n🎉 Component consolidation plan complete!')
    print(f'📊 Summary:')
    print(f'  Component groups: {len(component_groups)}')
    print(f'  Phases to execute: {len(plan["phases"])}')
    print(f'  Total components: {plan["total_components"]}')
    print(f'  Plan file: COMPONENT_CONSOLIDATION_PLAN.md')
    
    return {
        'component_groups': component_groups,
        'plan': plan
    }

if __name__ == "__main__":
    result = main()
