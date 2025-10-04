#!/usr/bin/env python3
"""
Document all component dependencies and relationships
"""

import os
import re
from pathlib import Path
from collections import defaultdict, Counter
import json

def analyze_component_dependencies():
    """Analyze dependencies between all consolidated components"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Analyzing component dependencies...')
    
    # Get all consolidated feature directories
    feature_dirs = [
        'forms-centralized', 'tables-centralized', 'charts-centralized', 'modals-centralized',
        'layouts-centralized', 'buttons-centralized', 'inputs-centralized', 'cards-centralized',
        'auth-centralized', 'admin-centralized', 'church-centralized', 'records-centralized',
        'dashboard-centralized', 'settings-centralized', 'miscellaneous-centralized'
    ]
    
    dependencies = {
        'internal_deps': defaultdict(list),  # Dependencies within the same feature
        'cross_deps': defaultdict(list),     # Dependencies between different features
        'external_deps': defaultdict(list),  # Dependencies on external libraries
        'shared_deps': defaultdict(list),    # Dependencies on shared utilities
        'component_map': {},                 # Map of all components
        'feature_components': defaultdict(list)  # Components grouped by feature
    }
    
    # Analyze each feature directory
    for feature in feature_dirs:
        feature_path = frontend_path / 'features' / feature
        if not feature_path.exists():
            continue
            
        print(f'  📁 Analyzing {feature}...')
        
        # Find all component files in this feature
        for root, dirs, files in os.walk(feature_path):
            for file in files:
                if file.endswith(('.tsx', '.ts', '.js', '.jsx')):
                    file_path = Path(root) / file
                    relative_path = file_path.relative_to(frontend_path)
                    
                    # Add to component map
                    component_name = file_path.stem
                    dependencies['component_map'][str(relative_path)] = {
                        'name': component_name,
                        'feature': feature,
                        'path': str(relative_path),
                        'type': 'component'
                    }
                    dependencies['feature_components'][feature].append(str(relative_path))
                    
                    # Analyze imports in this file
                    analyze_file_dependencies(file_path, relative_path, feature, dependencies)
    
    return dependencies

def analyze_file_dependencies(file_path, relative_path, feature, dependencies):
    """Analyze dependencies in a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        return
    
    # Find all import statements
    import_patterns = [
        r"import\s+.*?\s+from\s+['\"]([^'\"]+)['\"]",  # Named imports
        r"import\s+['\"]([^'\"]+)['\"]",              # Default imports
        r"require\(['\"]([^'\"]+)['\"]\)",            # require statements
    ]
    
    for pattern in import_patterns:
        matches = re.findall(pattern, content)
        for match in matches:
            import_path = match.strip()
            
            # Categorize the import
            if import_path.startswith('@/'):
                # Internal import
                internal_path = import_path[2:]  # Remove @/ prefix
                categorize_internal_import(relative_path, internal_path, feature, dependencies)
            elif import_path.startswith('./') or import_path.startswith('../'):
                # Relative import
                categorize_relative_import(relative_path, import_path, feature, dependencies)
            elif import_path.startswith('@mui/') or import_path.startswith('react') or import_path.startswith('@tanstack/'):
                # External library
                dependencies['external_deps'][str(relative_path)].append(import_path)
            else:
                # Other internal import
                categorize_internal_import(relative_path, import_path, feature, dependencies)

def categorize_internal_import(component_path, import_path, feature, dependencies):
    """Categorize internal imports"""
    # Check if it's a shared utility
    if 'shared' in import_path or 'utils' in import_path or 'hooks' in import_path:
        dependencies['shared_deps'][str(component_path)].append(import_path)
    else:
        # Check if it's within the same feature
        if f'features/{feature}' in import_path:
            dependencies['internal_deps'][str(component_path)].append(import_path)
        else:
            # Cross-feature dependency
            dependencies['cross_deps'][str(component_path)].append(import_path)

def categorize_relative_import(component_path, import_path, feature, dependencies):
    """Categorize relative imports"""
    # For now, treat relative imports as internal to the same feature
    dependencies['internal_deps'][str(component_path)].append(import_path)

def generate_dependency_report(dependencies):
    """Generate comprehensive dependency report"""
    print('📊 Generating dependency report...')
    
    report_content = f'''# Component Dependencies Report

## Overview
This report documents all dependencies and relationships between consolidated components.

## Summary Statistics
- **Total Components**: {len(dependencies['component_map'])}
- **Features**: {len(dependencies['feature_components'])}
- **Components with Internal Dependencies**: {len(dependencies['internal_deps'])}
- **Components with Cross Dependencies**: {len(dependencies['cross_deps'])}
- **Components with External Dependencies**: {len(dependencies['external_deps'])}
- **Components with Shared Dependencies**: {len(dependencies['shared_deps'])}

## Feature Breakdown

'''
    
    for feature, components in dependencies['feature_components'].items():
        report_content += f'''### {feature.replace('-', ' ').title()} ({len(components)} components)
'''
        for component in components[:10]:  # Show first 10 components
            report_content += f'- `{component}`\n'
        if len(components) > 10:
            report_content += f'- ... and {len(components) - 10} more\n'
        report_content += '\n'
    
    # Internal Dependencies
    report_content += '''## Internal Dependencies (Within Same Feature)

'''
    for component, deps in list(dependencies['internal_deps'].items())[:20]:
        report_content += f'**{component}**\n'
        for dep in deps[:5]:
            report_content += f'  - `{dep}`\n'
        if len(deps) > 5:
            report_content += f'  - ... and {len(deps) - 5} more\n'
        report_content += '\n'
    
    # Cross Dependencies
    report_content += '''## Cross Dependencies (Between Features)

'''
    for component, deps in list(dependencies['cross_deps'].items())[:20]:
        report_content += f'**{component}**\n'
        for dep in deps[:5]:
            report_content += f'  - `{dep}`\n'
        if len(deps) > 5:
            report_content += f'  - ... and {len(deps) - 5} more\n'
        report_content += '\n'
    
    # External Dependencies
    report_content += '''## External Dependencies (Third-party Libraries)

'''
    external_libs = Counter()
    for component, deps in dependencies['external_deps'].items():
        for dep in deps:
            lib_name = dep.split('/')[0]
            external_libs[lib_name] += 1
    
    for lib, count in external_libs.most_common(20):
        report_content += f'- **{lib}**: {count} components\n'
    
    # Shared Dependencies
    report_content += '''## Shared Dependencies (Common Utilities)

'''
    for component, deps in list(dependencies['shared_deps'].items())[:20]:
        report_content += f'**{component}**\n'
        for dep in deps[:5]:
            report_content += f'  - `{dep}`\n'
        if len(deps) > 5:
            report_content += f'  - ... and {len(deps) - 5} more\n'
        report_content += '\n'
    
    report_content += '''## Migration Recommendations

### High Priority Dependencies
1. **Shared Utilities**: Ensure all shared utilities are properly exported
2. **Cross-Feature Dependencies**: Plan migration order to respect dependencies
3. **External Libraries**: Verify all external dependencies are available in modernize template

### Migration Order
1. Start with features that have no cross-dependencies
2. Migrate shared utilities first
3. Migrate dependent features in dependency order
4. Test each feature after migration

### Template-Agnostic Refactoring
1. Extract UI-specific code into template-specific components
2. Create base components with common interfaces
3. Use dependency injection for external services
4. Implement proper error boundaries

## Next Steps
1. **Update Import Paths**: Fix all imports to use new centralized paths
2. **Create Shared Utilities**: Consolidate common utilities
3. **Plan Migration Order**: Based on dependency analysis
4. **Refactor for Templates**: Make components template-agnostic
5. **Test Dependencies**: Ensure all relationships work correctly
'''
    
    with open('/var/www/orthodoxmetrics/prod/front-end/COMPONENT_DEPENDENCIES_REPORT.md', 'w') as f:
        f.write(report_content)
    
    # Also save as JSON for programmatic access
    with open('/var/www/orthodoxmetrics/prod/front-end/component_dependencies.json', 'w') as f:
        json.dump(dependencies, f, indent=2, default=str)
    
    print('✅ Generated dependency report: COMPONENT_DEPENDENCIES_REPORT.md')
    print('✅ Saved dependency data: component_dependencies.json')

def generate_migration_plan(dependencies):
    """Generate a migration plan based on dependencies"""
    print('📋 Generating migration plan...')
    
    # Analyze dependency graph to determine migration order
    feature_deps = defaultdict(set)
    
    for component, deps in dependencies['cross_deps'].items():
        component_feature = None
        for feature, components in dependencies['feature_components'].items():
            if component in components:
                component_feature = feature
                break
        
        if component_feature:
            for dep in deps:
                for feature, components in dependencies['feature_components'].items():
                    if any(dep in comp for comp in components):
                        if feature != component_feature:
                            feature_deps[component_feature].add(feature)
    
    # Create migration phases based on dependencies
    migration_phases = []
    remaining_features = set(dependencies['feature_components'].keys())
    
    phase = 1
    while remaining_features:
        # Find features with no remaining dependencies
        current_phase = []
        for feature in list(remaining_features):
            if not feature_deps[feature] or all(dep not in remaining_features for dep in feature_deps[feature]):
                current_phase.append(feature)
                remaining_features.remove(feature)
        
        if not current_phase:
            # If we can't find any features without dependencies, add remaining ones
            current_phase = list(remaining_features)
            remaining_features.clear()
        
        migration_phases.append({
            'phase': phase,
            'features': current_phase,
            'description': f'Phase {phase}: {", ".join(current_phase)}'
        })
        phase += 1
    
    # Generate migration plan report
    plan_content = f'''# Component Migration Plan

## Overview
This plan outlines the recommended order for migrating consolidated components to the modernize template.

## Migration Phases

'''
    
    for phase_info in migration_phases:
        plan_content += f'''### {phase_info['description']}
**Features**: {len(phase_info['features'])}
**Components**: {sum(len(dependencies['feature_components'][f]) for f in phase_info['features'])}

'''
        for feature in phase_info['features']:
            component_count = len(dependencies['feature_components'][feature])
            plan_content += f'- **{feature}** ({component_count} components)\n'
        plan_content += '\n'
    
    plan_content += '''## Migration Strategy

### Phase 1: Foundation
1. Set up modernize template structure
2. Install all required dependencies
3. Create base component interfaces
4. Set up shared utilities

### Phase 2: Core Features
1. Migrate shared utilities first
2. Migrate features with no cross-dependencies
3. Test each feature after migration

### Phase 3: Dependent Features
1. Migrate features in dependency order
2. Update cross-feature imports
3. Test integration between features

### Phase 4: Integration
1. Connect all features together
2. Test complete application
3. Optimize performance
4. Final testing and validation

## Risk Mitigation

### High-Risk Dependencies
- Features with many cross-dependencies
- Components with complex external library usage
- Shared utilities used by many components

### Mitigation Strategies
1. **Incremental Migration**: Migrate one feature at a time
2. **Dependency Injection**: Use DI for external services
3. **Interface Abstraction**: Create interfaces for complex dependencies
4. **Comprehensive Testing**: Test each phase thoroughly

## Success Criteria
1. All components migrate without breaking changes
2. All dependencies resolve correctly
3. Application functionality remains intact
4. Performance is maintained or improved
5. Code is more maintainable and organized
'''
    
    with open('/var/www/orthodoxmetrics/prod/front-end/MIGRATION_PLAN.md', 'w') as f:
        f.write(plan_content)
    
    print('✅ Generated migration plan: MIGRATION_PLAN.md')

def main():
    """Main function"""
    print('🚀 Starting dependency analysis...')
    
    # Step 1: Analyze dependencies
    dependencies = analyze_component_dependencies()
    
    # Step 2: Generate dependency report
    generate_dependency_report(dependencies)
    
    # Step 3: Generate migration plan
    generate_migration_plan(dependencies)
    
    print(f'\n🎉 Dependency analysis complete!')
    print(f'�� Summary:')
    print(f'  Components analyzed: {len(dependencies["component_map"])}')
    print(f'  Features analyzed: {len(dependencies["feature_components"])}')
    print(f'  Internal dependencies: {len(dependencies["internal_deps"])}')
    print(f'  Cross dependencies: {len(dependencies["cross_deps"])}')
    print(f'  External dependencies: {len(dependencies["external_deps"])}')
    print(f'  Shared dependencies: {len(dependencies["shared_deps"])}')
    print(f'  Reports generated: COMPONENT_DEPENDENCIES_REPORT.md, MIGRATION_PLAN.md')
    print(f'  Data saved: component_dependencies.json')
    
    return dependencies

if __name__ == "__main__":
    result = main()
