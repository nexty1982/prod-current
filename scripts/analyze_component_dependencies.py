#!/usr/bin/env python3
"""
Analyze component dependencies and relationships for migration planning
"""

import os
import re
from pathlib import Path
from collections import defaultdict, Counter

def analyze_imports():
    """Analyze all import statements to understand component relationships"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Analyzing component dependencies...')
    
    # Track all imports
    all_imports = defaultdict(list)
    component_dependencies = defaultdict(set)
    component_dependents = defaultdict(set)
    external_dependencies = Counter()
    internal_dependencies = Counter()
    
    # Walk through all files
    for root, dirs, files in os.walk(frontend_path):
        if 'node_modules' in root or '.git' in root or 'backup' in root:
            continue
            
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx')):
                file_path = Path(root) / file
                relative_path = file_path.relative_to(frontend_path)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Find import statements
                    import_patterns = [
                        r"import\s+.*?\s+from\s+['\"]([^'\"]+)['\"]",
                        r"import\s+['\"]([^'\"]+)['\"]",
                        r"require\s*\(\s*['\"]([^'\"]+)['\"]\s*\)"
                    ]
                    
                    for pattern in import_patterns:
                        matches = re.findall(pattern, content)
                        for match in matches:
                            all_imports[str(relative_path)].append(match)
                            
                            # Categorize imports
                            if match.startswith('@/') or match.startswith('./') or match.startswith('../'):
                                # Internal dependency
                                internal_dependencies[match] += 1
                                
                                # Track component relationships
                                if match.startswith('@/') or match.startswith('./') or match.startswith('../'):
                                    # This is an internal import
                                    component_dependencies[str(relative_path)].add(match)
                                    
                                    # Find the target component
                                    target_path = resolve_import_path(match, file_path, frontend_path)
                                    if target_path:
                                        component_dependents[target_path].add(str(relative_path))
                            else:
                                # External dependency
                                external_dependencies[match] += 1
                
                except Exception as e:
                    print(f'⚠️  Error analyzing {file_path}: {e}')
    
    return {
        'all_imports': all_imports,
        'component_dependencies': component_dependencies,
        'component_dependents': component_dependents,
        'external_dependencies': external_dependencies,
        'internal_dependencies': internal_dependencies
    }

def resolve_import_path(import_path, source_file, base_path):
    """Resolve import path to actual file path"""
    if import_path.startswith('@/'):
        # Absolute import from src
        return str(base_path / import_path[2:])
    elif import_path.startswith('./'):
        # Relative import
        return str(source_file.parent / import_path[2:])
    elif import_path.startswith('../'):
        # Relative import going up
        return str(source_file.parent / import_path)
    else:
        # External import
        return None

def analyze_component_hierarchy(dependencies, dependents):
    """Analyze component hierarchy and identify core components"""
    print('🏗️  Analyzing component hierarchy...')
    
    # Find root components (no internal dependencies)
    root_components = []
    for component, deps in dependencies.items():
        internal_deps = [dep for dep in deps if not dep.startswith('react') and not dep.startswith('@mui')]
        if not internal_deps:
            root_components.append(component)
    
    # Find leaf components (no dependents)
    leaf_components = []
    for component, deps in dependents.items():
        if not deps:
            leaf_components.append(component)
    
    # Find core components (highly connected)
    component_connections = {}
    for component in dependencies:
        incoming = len(dependents.get(component, []))
        outgoing = len(dependencies.get(component, []))
        component_connections[component] = {
            'incoming': incoming,
            'outgoing': outgoing,
            'total': incoming + outgoing
        }
    
    # Sort by total connections
    core_components = sorted(component_connections.items(), 
                           key=lambda x: x[1]['total'], reverse=True)[:20]
    
    return {
        'root_components': root_components,
        'leaf_components': leaf_components,
        'core_components': core_components,
        'component_connections': component_connections
    }

def analyze_directory_structure():
    """Analyze the current directory structure"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('📁 Analyzing directory structure...')
    
    structure = {
        'components': [],
        'pages': [],
        'contexts': [],
        'hooks': [],
        'utils': [],
        'services': [],
        'types': [],
        'constants': [],
        'other': []
    }
    
    for root, dirs, files in os.walk(frontend_path):
        if 'node_modules' in root or '.git' in root or 'backup' in root:
            continue
            
        relative_path = Path(root).relative_to(frontend_path)
        
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx')):
                file_path = relative_path / file
                file_str = str(file_path)
                
                # Categorize by directory
                if 'component' in str(relative_path).lower():
                    structure['components'].append(file_str)
                elif 'page' in str(relative_path).lower():
                    structure['pages'].append(file_str)
                elif 'context' in str(relative_path).lower():
                    structure['contexts'].append(file_str)
                elif 'hook' in str(relative_path).lower():
                    structure['hooks'].append(file_str)
                elif 'util' in str(relative_path).lower():
                    structure['utils'].append(file_str)
                elif 'service' in str(relative_path).lower():
                    structure['services'].append(file_str)
                elif 'type' in str(relative_path).lower():
                    structure['types'].append(file_str)
                elif 'constant' in str(relative_path).lower():
                    structure['constants'].append(file_str)
                else:
                    structure['other'].append(file_str)
    
    return structure

def create_migration_strategy(analysis_results):
    """Create a migration strategy based on dependency analysis"""
    print('📋 Creating migration strategy...')
    
    dependencies = analysis_results['component_dependencies']
    dependents = analysis_results['component_dependents']
    hierarchy = analyze_component_hierarchy(dependencies, dependents)
    structure = analyze_directory_structure()
    
    strategy = {
        'phases': [],
        'migration_order': [],
        'critical_components': [],
        'shared_components': [],
        'page_components': [],
        'utility_components': []
    }
    
    # Phase 1: Core Infrastructure
    strategy['phases'].append({
        'name': 'Core Infrastructure',
        'description': 'Migrate core infrastructure components first',
        'components': [
            'context/*',
            'utils/*',
            'types/*',
            'constants/*',
            'services/*'
        ],
        'reason': 'These are foundational and other components depend on them'
    })
    
    # Phase 2: Shared Components
    strategy['phases'].append({
        'name': 'Shared Components',
        'description': 'Migrate shared/reusable components',
        'components': [
            'shared/components/*',
            'components/base/*',
            'components/ui/*'
        ],
        'reason': 'These are used by multiple other components'
    })
    
    # Phase 3: Feature Components
    strategy['phases'].append({
        'name': 'Feature Components',
        'description': 'Migrate feature-specific components',
        'components': [
            'components/forms/*',
            'components/data/*',
            'components/layout/*'
        ],
        'reason': 'These are used by pages and other feature components'
    })
    
    # Phase 4: Pages
    strategy['phases'].append({
        'name': 'Pages',
        'description': 'Migrate page components',
        'components': [
            'pages/*'
        ],
        'reason': 'These are the top-level components that use everything else'
    })
    
    # Identify critical components (highly connected)
    critical_components = [comp for comp, conn in hierarchy['core_components'][:10]]
    strategy['critical_components'] = critical_components
    
    # Identify shared components
    shared_components = structure['components'][:20]  # Top 20 components
    strategy['shared_components'] = shared_components
    
    # Identify page components
    page_components = structure['pages']
    strategy['page_components'] = page_components
    
    # Identify utility components
    utility_components = structure['utils'] + structure['hooks'] + structure['services']
    strategy['utility_components'] = utility_components
    
    return strategy

def generate_dependency_report(analysis_results, strategy):
    """Generate a comprehensive dependency analysis report"""
    print('📊 Generating dependency analysis report...')
    
    report_content = f'''# Component Dependency Analysis Report

## Overview
This report analyzes the component dependencies and relationships in the refactored front-end codebase to guide the migration to the modernize template.

## Analysis Results

### File Structure
- **Components**: {len(analysis_results['component_dependencies'])} files
- **Total imports analyzed**: {sum(len(imports) for imports in analysis_results['all_imports'].values())}
- **External dependencies**: {len(analysis_results['external_dependencies'])}
- **Internal dependencies**: {len(analysis_results['internal_dependencies'])}

### Top External Dependencies
'''
    
    # Add top external dependencies
    for dep, count in analysis_results['external_dependencies'].most_common(10):
        report_content += f'- **{dep}**: {count} files\n'
    
    report_content += f'\n### Top Internal Dependencies\n'
    
    # Add top internal dependencies
    for dep, count in analysis_results['internal_dependencies'].most_common(10):
        report_content += f'- **{dep}**: {count} files\n'
    
    report_content += f'''
## Migration Strategy

### Phase 1: Core Infrastructure
**Components to migrate first:**
- Context providers (Auth, Theme, etc.)
- Utility functions and helpers
- Type definitions
- Constants and configuration
- API services

**Reason**: These are foundational and other components depend on them.

### Phase 2: Shared Components
**Components to migrate second:**
- Base UI components (Button, Input, etc.)
- Layout components
- Common form components
- Reusable data display components

**Reason**: These are used by multiple other components.

### Phase 3: Feature Components
**Components to migrate third:**
- Form components
- Data display components
- Feature-specific layout components
- Business logic components

**Reason**: These are used by pages and other feature components.

### Phase 4: Pages
**Components to migrate last:**
- All page components
- Route components
- Top-level application components

**Reason**: These are the top-level components that use everything else.

## Critical Components

The following components are highly connected and should be migrated carefully:

'''
    
    for i, (component, connections) in enumerate(strategy['critical_components'][:10], 1):
        report_content += f'{i}. **{component}**\n'
        report_content += f'   - Incoming: {connections["incoming"]} dependencies\n'
        report_content += f'   - Outgoing: {connections["outgoing"]} dependencies\n'
        report_content += f'   - Total: {connections["total"]} connections\n\n'
    
    report_content += f'''
## Recommendations

### Before Migration
1. **Test current functionality** - Ensure refactoring didn't break anything
2. **Review critical components** - Understand their dependencies
3. **Plan import updates** - Prepare for path changes
4. **Set up modernize template** - Ensure it's ready for migration

### During Migration
1. **Follow the phase order** - Don't skip phases
2. **Test after each phase** - Ensure functionality is maintained
3. **Update imports systematically** - Use the new structure
4. **Document changes** - Track what's been migrated

### After Migration
1. **Test all functionality** - Ensure everything works
2. **Optimize performance** - Take advantage of new structure
3. **Update documentation** - Reflect the new architecture
4. **Plan future improvements** - Build on the clean foundation

## Next Steps

1. **Review this analysis** - Understand the component relationships
2. **Start with Phase 1** - Begin with core infrastructure
3. **Test frequently** - Ensure functionality is maintained
4. **Document progress** - Track what's been migrated

This analysis provides a clear roadmap for migrating the refactored front-end to the modernize template while maintaining functionality and improving the overall architecture.
'''
    
    with open('/var/www/orthodoxmetrics/prod/front-end/DEPENDENCY_ANALYSIS_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated dependency analysis report: DEPENDENCY_ANALYSIS_REPORT.md')

def main():
    """Main analysis function"""
    print('🚀 Starting component dependency analysis...')
    
    # Step 1: Analyze imports
    analysis_results = analyze_imports()
    
    # Step 2: Create migration strategy
    strategy = create_migration_strategy(analysis_results)
    
    # Step 3: Generate report
    generate_dependency_report(analysis_results, strategy)
    
    print(f'\n�� Dependency analysis complete!')
    print(f'📊 Summary:')
    print(f'  Components analyzed: {len(analysis_results["component_dependencies"])}')
    print(f'  External dependencies: {len(analysis_results["external_dependencies"])}')
    print(f'  Internal dependencies: {len(analysis_results["internal_dependencies"])}')
    print(f'  Migration phases: {len(strategy["phases"])}')
    print(f'  Critical components: {len(strategy["critical_components"])}')
    
    return {
        'analysis_results': analysis_results,
        'strategy': strategy
    }

if __name__ == "__main__":
    result = main()
    print(f'\n📊 ANALYSIS SUMMARY:')
    print(f'  Components: {len(result["analysis_results"]["component_dependencies"])}')
    print(f'  External deps: {len(result["analysis_results"]["external_dependencies"])}')
    print(f'  Internal deps: {len(result["analysis_results"]["internal_dependencies"])}')
    print(f'  Migration phases: {len(result["strategy"]["phases"])}')
    print(f'  Critical components: {len(result["strategy"]["critical_components"])}')
