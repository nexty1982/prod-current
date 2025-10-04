#!/usr/bin/env python3
"""
Create a comprehensive inventory of all components to be refactored
"""

import os
import re
import json
import argparse
from pathlib import Path
from collections import defaultdict

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Create component inventory for refactoring')
    parser.add_argument('--src', type=str, default='/var/www/orthodoxmetrics/prod/front-end/src',
                       help='Source directory path')
    parser.add_argument('--dst', type=str, default='/var/www/orthodoxmetrics/prod/UI/modernize/frontend/src',
                       help='Destination directory path')
    parser.add_argument('--root-front', type=str, default='/var/www/orthodoxmetrics/prod/front-end',
                       help='Frontend root directory')
    parser.add_argument('--root-modernize', type=str, default='/var/www/orthodoxmetrics/prod/UI/modernize/frontend',
                       help='Modernize root directory')
    parser.add_argument('--output', type=str, default='./.refactor/inventory.json',
                       help='Output file path')
    return parser.parse_args()

def analyze_components(src_path):
    """Analyze all components in the source directory"""
    frontend_path = Path(src_path)
    
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

def main():
    """Main function"""
    args = parse_args()
    
    print('🚀 Creating component refactoring inventory...')
    
    # Create output directory if it doesn't exist
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Step 1: Analyze components
    components = analyze_components(args.src)
    
    # Step 2: Create migration phases
    phases = create_migration_phases(components)
    
    # Calculate totals
    total_components = sum(len(comp_list) for comp_list in components.values())
    
    # Create inventory data
    inventory_data = {
        'components': components,
        'phases': phases,
        'total_components': total_components,
        'metadata': {
            'source_path': args.src,
            'destination_path': args.dst,
            'frontend_root': args.root_front,
            'modernize_root': args.root_modernize
        }
    }
    
    # Write to JSON file
    with open(output_path, 'w') as f:
        json.dump(inventory_data, f, indent=2)
    
    print(f'✅ Generated component inventory: {args.output}')
    
    print(f'\n🎉 Component inventory complete!')
    print(f'📊 Summary:')
    print(f'  Total components: {total_components}')
    print(f'  Categories: {len(components)}')
    print(f'  Migration phases: {len(phases)}')
    print(f'  Phase 1 (Core): {len(phases["phase1_core"]["components"])} components')
    print(f'  Phase 2 (Shared): {len(phases["phase2_shared"]["components"])} components')
    print(f'  Phase 3 (Features): {len(phases["phase3_features"]["components"])} components')
    print(f'  Phase 4 (Pages): {len(phases["phase4_pages"]["components"])} components')
    
    return inventory_data

if __name__ == "__main__":
    result = main()
    print(f'\n📊 INVENTORY SUMMARY:')
    print(f'  Total components: {result["total_components"]}')
    print(f'  Categories: {len(result["components"])}')
    print(f'  Migration phases: {len(result["phases"])}')
    print(f'  Inventory file: {result.get("output_file", "inventory.json")}')