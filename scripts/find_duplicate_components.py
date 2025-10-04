#!/usr/bin/env python3
"""
Find components with duplicate file names within front-end/src/features
"""

import os
from pathlib import Path
from collections import defaultdict

def find_duplicate_components():
    """Find components with duplicate file names in features directory"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    features_path = frontend_path / 'features'
    
    print('🔍 Finding duplicate component names in features directory...')
    
    # Dictionary to store file names and their locations
    component_map = defaultdict(list)
    
    # Walk through all files in features directory
    for root, dirs, files in os.walk(features_path):
        if 'node_modules' in root or '.git' in root or 'backup' in root:
            continue
            
        relative_path = Path(root).relative_to(frontend_path)
        
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx')):
                file_path = relative_path / file
                file_name = Path(file).stem  # Get filename without extension
                
                # Skip common non-component files
                if file_name in ['index', 'types', 'constants', 'utils', 'api', 'service', 'hook', 'context', 'provider']:
                    continue
                
                component_map[file_name].append({
                    'path': str(file_path),
                    'full_path': str(frontend_path / file_path),
                    'feature': str(relative_path).split('/')[1] if len(str(relative_path).split('/')) > 1 else 'unknown'
                })
    
    # Find duplicates
    duplicates = {name: locations for name, locations in component_map.items() if len(locations) > 1}
    
    return duplicates

def categorize_duplicates(duplicates):
    """Categorize duplicates by type of conflict"""
    categories = {
        'same_feature': [],      # Same name within same feature
        'cross_feature': [],     # Same name across different features
        'exact_match': [],       # Exact same file name and path structure
        'case_variations': [],   # Same name with different casing
        'extension_variations': [] # Same name with different extensions
    }
    
    for name, locations in duplicates.items():
        # Group by feature
        feature_groups = defaultdict(list)
        for loc in locations:
            feature_groups[loc['feature']].append(loc)
        
        # Check for same feature duplicates
        for feature, locs in feature_groups.items():
            if len(locs) > 1:
                categories['same_feature'].append({
                    'name': name,
                    'feature': feature,
                    'locations': locs
                })
        
        # Check for cross feature duplicates
        if len(feature_groups) > 1:
            categories['cross_feature'].append({
                'name': name,
                'features': list(feature_groups.keys()),
                'locations': locations
            })
        
        # Check for exact matches (same relative path)
        path_groups = defaultdict(list)
        for loc in locations:
            path_groups[loc['path']].append(loc)
        
        for path, locs in path_groups.items():
            if len(locs) > 1:
                categories['exact_match'].append({
                    'name': name,
                    'path': path,
                    'locations': locs
                })
        
        # Check for case variations
        case_variations = defaultdict(list)
        for loc in locations:
            case_variations[loc['path'].lower()].append(loc)
        
        for path, locs in case_variations.items():
            if len(locs) > 1:
                categories['case_variations'].append({
                    'name': name,
                    'path': path,
                    'locations': locs
                })
    
    return categories

def generate_duplicate_report(duplicates, categories):
    """Generate a comprehensive duplicate components report"""
    print('📊 Generating duplicate components report...')
    
    report_content = f'''# Duplicate Components Report

## Overview
This report identifies components with duplicate file names within the `front-end/src/features` directory.

## Summary Statistics
- **Total Duplicate Names**: {len(duplicates)}
- **Total Duplicate Files**: {sum(len(locations) for locations in duplicates.values())}
- **Same Feature Duplicates**: {len(categories['same_feature'])}
- **Cross Feature Duplicates**: {len(categories['cross_feature'])}
- **Exact Match Duplicates**: {len(categories['exact_match'])}
- **Case Variation Duplicates**: {len(categories['case_variations'])}

## Duplicate Components by Name

'''
    
    # Sort duplicates by number of occurrences
    sorted_duplicates = sorted(duplicates.items(), key=lambda x: len(x[1]), reverse=True)
    
    for name, locations in sorted_duplicates:
        report_content += f'''### {name} ({len(locations)} occurrences)
'''
        for i, loc in enumerate(locations, 1):
            report_content += f'{i}. **{loc["feature"]}** - `{loc["path"]}`\n'
        report_content += '\n'
    
    # Same Feature Duplicates
    if categories['same_feature']:
        report_content += '''## Same Feature Duplicates

These components have duplicate names within the same feature directory.

'''
        for dup in categories['same_feature']:
            report_content += f'''### {dup['name']} in {dup['feature']}
'''
            for loc in dup['locations']:
                report_content += f'- `{loc["path"]}`\n'
            report_content += '\n'
    
    # Cross Feature Duplicates
    if categories['cross_feature']:
        report_content += '''## Cross Feature Duplicates

These components have the same name across different features.

'''
        for dup in categories['cross_feature']:
            report_content += f'''### {dup['name']} (across {len(dup['features'])} features)
**Features**: {', '.join(dup['features'])}
'''
            for loc in dup['locations']:
                report_content += f'- **{loc["feature"]}**: `{loc["path"]}`\n'
            report_content += '\n'
    
    # Exact Match Duplicates
    if categories['exact_match']:
        report_content += '''## Exact Match Duplicates

These components have identical file paths (likely true duplicates).

'''
        for dup in categories['exact_match']:
            report_content += f'''### {dup['name']} - {dup['path']}
'''
            for loc in dup['locations']:
                report_content += f'- `{loc["path"]}`\n'
            report_content += '\n'
    
    # Case Variation Duplicates
    if categories['case_variations']:
        report_content += '''## Case Variation Duplicates

These components have the same name but different casing.

'''
        for dup in categories['case_variations']:
            report_content += f'''### {dup['name']} - {dup['path']}
'''
            for loc in dup['locations']:
                report_content += f'- `{loc["path"]}`\n'
            report_content += '\n'
    
    report_content += '''## Recommendations

### High Priority Actions
1. **Exact Match Duplicates**: Remove true duplicates immediately
2. **Same Feature Duplicates**: Consolidate or rename within features
3. **Cross Feature Duplicates**: Consider if components should be shared

### Resolution Strategies
1. **Rename Components**: Use more specific names (e.g., `UserForm` vs `Form`)
2. **Consolidate**: Merge similar components into shared utilities
3. **Namespace**: Use feature-specific prefixes (e.g., `AuthLogin`, `AdminLogin`)
4. **Move to Shared**: Move common components to shared utilities

### Migration Considerations
1. **Update Imports**: Fix all import statements after renaming
2. **Test Thoroughly**: Ensure no functionality is broken
3. **Document Changes**: Keep track of all renames and consolidations
4. **Version Control**: Use git to track changes

## Next Steps
1. **Review Duplicates**: Examine each duplicate for consolidation opportunities
2. **Create Naming Convention**: Establish consistent naming patterns
3. **Resolve Conflicts**: Rename or consolidate duplicate components
4. **Update Imports**: Fix all affected import statements
5. **Test Application**: Ensure no regressions after changes
'''
    
    with open('/var/www/orthodoxmetrics/prod/front-end/DUPLICATE_COMPONENTS_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated duplicate components report: DUPLICATE_COMPONENTS_REPORT.md')

def main():
    """Main function"""
    print('🚀 Starting duplicate component analysis...')
    
    # Step 1: Find duplicates
    duplicates = find_duplicate_components()
    
    # Step 2: Categorize duplicates
    categories = categorize_duplicates(duplicates)
    
    # Step 3: Generate report
    generate_duplicate_report(duplicates, categories)
    
    print(f'\n🎉 Duplicate analysis complete!')
    print(f'📊 Summary:')
    print(f'  Duplicate names found: {len(duplicates)}')
    print(f'  Total duplicate files: {sum(len(locations) for locations in duplicates.values())}')
    print(f'  Same feature duplicates: {len(categories["same_feature"])}')
    print(f'  Cross feature duplicates: {len(categories["cross_feature"])}')
    print(f'  Exact match duplicates: {len(categories["exact_match"])}')
    print(f'  Case variation duplicates: {len(categories["case_variations"])}')
    print(f'  Report: DUPLICATE_COMPONENTS_REPORT.md')
    
    return duplicates, categories

if __name__ == "__main__":
    result = main()
