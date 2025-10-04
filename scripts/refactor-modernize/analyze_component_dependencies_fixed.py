#!/usr/bin/env python3
"""
Analyze component dependencies and relationships for migration planning
"""

import os
import re
import json
import argparse
from pathlib import Path
from collections import defaultdict, Counter

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Analyze component dependencies for refactoring')
    parser.add_argument('--src', type=str, default='/var/www/orthodoxmetrics/prod/front-end/src',
                       help='Source directory path')
    parser.add_argument('--dst', type=str, default='/var/www/orthodoxmetrics/prod/UI/modernize/frontend/src',
                       help='Destination directory path')
    parser.add_argument('--root-front', type=str, default='/var/www/orthodoxmetrics/prod/front-end',
                       help='Frontend root directory')
    parser.add_argument('--root-modernize', type=str, default='/var/www/orthodoxmetrics/prod/UI/modernize/frontend',
                       help='Modernize root directory')
    parser.add_argument('--output', type=str, default='./.refactor/deps.json',
                       help='Output file path')
    return parser.parse_args()

def analyze_imports(src_path):
    """Analyze all import statements to understand component relationships"""
    frontend_path = Path(src_path)
    
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
        return str(Path(base_path) / import_path[2:])
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
        if not deps or all(not dep.startswith(('@/', './', '../')) for dep in deps):
            root_components.append(component)
    
    # Find leaf components (no dependents)
    leaf_components = []
    all_components = set(dependencies.keys())
    for component in all_components:
        if component not in dependents or not dependents[component]:
            leaf_components.append(component)
    
    # Find core components (most depended on)
    core_components = []
    for component, deps in dependents.items():
        if len(deps) > 5:  # Components with more than 5 dependents
            core_components.append({
                'component': component,
                'dependent_count': len(deps),
                'dependents': list(deps)
            })
    
    # Sort core components by dependency count
    core_components.sort(key=lambda x: x['dependent_count'], reverse=True)
    
    return {
        'root_components': root_components,
        'leaf_components': leaf_components,
        'core_components': core_components
    }

def identify_circular_dependencies(dependencies):
    """Identify circular dependencies between components"""
    print('🔄 Checking for circular dependencies...')
    
    circular_dependencies = []
    
    # Simple check for direct circular dependencies
    for component, deps in dependencies.items():
        for dep in deps:
            # Check if the dependency also depends on this component
            if dep in dependencies and component in dependencies[dep]:
                circular_pair = tuple(sorted([component, dep]))
                if circular_pair not in circular_dependencies:
                    circular_dependencies.append(circular_pair)
    
    return circular_dependencies

def analyze_external_dependencies(external_deps):
    """Analyze external dependencies and identify most used packages"""
    print('📦 Analyzing external dependencies...')
    
    # Get top 20 most used external dependencies
    top_dependencies = external_deps.most_common(20)
    
    # Categorize by type
    ui_libraries = []
    utility_libraries = []
    state_management = []
    routing = []
    other = []
    
    for dep, count in external_deps.items():
        if any(ui in dep for ui in ['@mui', 'antd', 'react-', 'material-ui']):
            ui_libraries.append((dep, count))
        elif any(util in dep for util in ['lodash', 'moment', 'date-fns', 'axios']):
            utility_libraries.append((dep, count))
        elif any(state in dep for state in ['redux', 'mobx', 'recoil', 'zustand']):
            state_management.append((dep, count))
        elif any(route in dep for route in ['react-router', 'router']):
            routing.append((dep, count))
        else:
            other.append((dep, count))
    
    return {
        'top_dependencies': top_dependencies,
        'ui_libraries': sorted(ui_libraries, key=lambda x: x[1], reverse=True),
        'utility_libraries': sorted(utility_libraries, key=lambda x: x[1], reverse=True),
        'state_management': sorted(state_management, key=lambda x: x[1], reverse=True),
        'routing': sorted(routing, key=lambda x: x[1], reverse=True),
        'other': sorted(other, key=lambda x: x[1], reverse=True)[:10]  # Top 10 other deps
    }

def generate_dependency_report(analysis_results, args):
    """Generate a comprehensive dependency analysis report"""
    print('📊 Generating dependency analysis report...')
    
    # Extract data
    imports_data = analysis_results['imports']
    hierarchy_data = analysis_results['hierarchy']
    circular_deps = analysis_results['circular_dependencies']
    external_analysis = analysis_results['external_analysis']
    
    # Create output directory if it doesn't exist
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Prepare JSON data
    report_data = {
        'metadata': {
            'source_path': args.src,
            'destination_path': args.dst,
            'frontend_root': args.root_front,
            'modernize_root': args.root_modernize,
            'total_files_analyzed': len(imports_data['all_imports']),
            'total_internal_dependencies': sum(imports_data['internal_dependencies'].values()),
            'total_external_dependencies': sum(imports_data['external_dependencies'].values())
        },
        'component_dependencies': {k: list(v) for k, v in imports_data['component_dependencies'].items()},
        'component_dependents': {k: list(v) for k, v in imports_data['component_dependents'].items()},
        'hierarchy': {
            'root_components': hierarchy_data['root_components'],
            'leaf_components': hierarchy_data['leaf_components'],
            'core_components': hierarchy_data['core_components'][:20]  # Top 20 core components
        },
        'circular_dependencies': circular_deps,
        'external_dependencies': {
            'top_20': external_analysis['top_dependencies'],
            'ui_libraries': external_analysis['ui_libraries'][:10],
            'utility_libraries': external_analysis['utility_libraries'][:10],
            'state_management': external_analysis['state_management'],
            'routing': external_analysis['routing'],
            'other': external_analysis['other']
        },
        'internal_dependencies': imports_data['internal_dependencies'].most_common(50),
        'all_imports': imports_data['all_imports']
    }
    
    # Write JSON report
    with open(output_path, 'w') as f:
        json.dump(report_data, f, indent=2)
    
    print(f'✅ Generated dependency analysis: {args.output}')
    
    return report_data

def main():
    """Main function"""
    args = parse_args()
    
    print('🚀 Starting dependency analysis...')
    
    # Step 1: Analyze imports
    imports_data = analyze_imports(args.src)
    
    # Step 2: Analyze component hierarchy
    hierarchy_data = analyze_component_hierarchy(
        imports_data['component_dependencies'],
        imports_data['component_dependents']
    )
    
    # Step 3: Check for circular dependencies
    circular_deps = identify_circular_dependencies(imports_data['component_dependencies'])
    
    # Step 4: Analyze external dependencies
    external_analysis = analyze_external_dependencies(imports_data['external_dependencies'])
    
    # Step 5: Generate report
    analysis_results = {
        'imports': imports_data,
        'hierarchy': hierarchy_data,
        'circular_dependencies': circular_deps,
        'external_analysis': external_analysis
    }
    
    report = generate_dependency_report(analysis_results, args)
    
    # Print summary
    print(f'\n🎉 Dependency analysis complete!')
    print(f'📊 Summary:')
    print(f'  Files analyzed: {len(imports_data["all_imports"])}')
    print(f'  Internal dependencies: {sum(imports_data["internal_dependencies"].values())}')
    print(f'  External dependencies: {sum(imports_data["external_dependencies"].values())}')
    print(f'  Root components: {len(hierarchy_data["root_components"])}')
    print(f'  Core components: {len(hierarchy_data["core_components"])}')
    print(f'  Circular dependencies: {len(circular_deps)}')
    
    if circular_deps:
        print(f'\n⚠️  Circular dependencies found:')
        for comp1, comp2 in circular_deps[:5]:  # Show first 5
            print(f'    {comp1} ←→ {comp2}')
        if len(circular_deps) > 5:
            print(f'    ... and {len(circular_deps) - 5} more')
    
    return report

if __name__ == "__main__":
    result = main()
    print(f'\n📊 DEPENDENCY ANALYSIS SUMMARY:')
    print(f'  Total files: {result["metadata"]["total_files_analyzed"]}')
    print(f'  Internal deps: {result["metadata"]["total_internal_dependencies"]}')
    print(f'  External deps: {result["metadata"]["total_external_dependencies"]}')
    print(f'  Output file: deps.json')