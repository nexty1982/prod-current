#!/usr/bin/env python3
"""
Simple component dependency analysis for migration planning
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
                            else:
                                # External dependency
                                external_dependencies[match] += 1
                
                except Exception as e:
                    print(f'⚠️  Error analyzing {file_path}: {e}')
    
    return {
        'all_imports': all_imports,
        'external_dependencies': external_dependencies,
        'internal_dependencies': internal_dependencies
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

def create_migration_strategy(analysis_results, structure):
    """Create a migration strategy based on dependency analysis"""
    print('📋 Creating migration strategy...')
    
    strategy = {
        'phases': [],
        'file_counts': {},
        'top_external_deps': [],
        'top_internal_deps': []
    }
    
    # Count files by category
    strategy['file_counts'] = {
        'components': len(structure['components']),
        'pages': len(structure['pages']),
        'contexts': len(structure['contexts']),
        'hooks': len(structure['hooks']),
        'utils': len(structure['utils']),
        'services': len(structure['services']),
        'types': len(structure['types']),
        'constants': len(structure['constants']),
        'other': len(structure['other'])
    }
    
    # Get top dependencies
    strategy['top_external_deps'] = analysis_results['external_dependencies'].most_common(10)
    strategy['top_internal_deps'] = analysis_results['internal_dependencies'].most_common(10)
    
    # Phase 1: Core Infrastructure
    strategy['phases'].append({
        'name': 'Core Infrastructure',
        'description': 'Migrate core infrastructure components first',
        'files': structure['contexts'] + structure['utils'] + structure['types'] + structure['constants'] + structure['services'],
        'reason': 'These are foundational and other components depend on them'
    })
    
    # Phase 2: Shared Components
    strategy['phases'].append({
        'name': 'Shared Components',
        'description': 'Migrate shared/reusable components',
        'files': structure['components'][:20],  # Top 20 components
        'reason': 'These are used by multiple other components'
    })
    
    # Phase 3: Pages
    strategy['phases'].append({
        'name': 'Pages',
        'description': 'Migrate page components',
        'files': structure['pages'],
        'reason': 'These are the top-level components that use everything else'
    })
    
    # Phase 4: Remaining Components
    strategy['phases'].append({
        'name': 'Remaining Components',
        'description': 'Migrate remaining components',
        'files': structure['components'][20:] + structure['other'],
        'reason': 'Complete the migration with remaining components'
    })
    
    return strategy

def generate_dependency_report(analysis_results, structure, strategy):
    """Generate a comprehensive dependency analysis report"""
    print('📊 Generating dependency analysis report...')
    
    report_content = f'''# Component Dependency Analysis Report

## Overview
This report analyzes the component dependencies and relationships in the refactored front-end codebase to guide the migration to the modernize template.

## Analysis Results

### File Structure
- **Total files analyzed**: {sum(len(imports) for imports in analysis_results['all_imports'].values())}
- **External dependencies**: {len(analysis_results['external_dependencies'])}
- **Internal dependencies**: {len(analysis_results['internal_dependencies'])}

### File Counts by Category
'''
    
    # Add file counts
    for category, count in strategy['file_counts'].items():
        report_content += f'- **{category.title()}**: {count} files\n'
    
    report_content += f'\n### Top External Dependencies\n'
    
    # Add top external dependencies
    for dep, count in strategy['top_external_deps']:
        report_content += f'- **{dep}**: {count} files\n'
    
    report_content += f'\n### Top Internal Dependencies\n'
    
    # Add top internal dependencies
    for dep, count in strategy['top_internal_deps']:
        report_content += f'- **{dep}**: {count} files\n'
    
    report_content += f'''
## Migration Strategy

### Phase 1: Core Infrastructure ({len(strategy['phases'][0]['files'])} files)
**Components to migrate first:**
- Context providers (Auth, Theme, etc.)
- Utility functions and helpers
- Type definitions
- Constants and configuration
- API services

**Reason**: These are foundational and other components depend on them.

### Phase 2: Shared Components ({len(strategy['phases'][1]['files'])} files)
**Components to migrate second:**
- Base UI components (Button, Input, etc.)
- Layout components
- Common form components
- Reusable data display components

**Reason**: These are used by multiple other components.

### Phase 3: Pages ({len(strategy['phases'][2]['files'])} files)
**Components to migrate third:**
- All page components
- Route components
- Top-level application components

**Reason**: These are the top-level components that use everything else.

### Phase 4: Remaining Components ({len(strategy['phases'][3]['files'])} files)
**Components to migrate last:**
- Remaining components
- Other miscellaneous files

**Reason**: Complete the migration with remaining components.

## Recommendations

### Before Migration
1. **Test current functionality** - Ensure refactoring didn't break anything
2. **Review file structure** - Understand the current organization
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

1. **Review this analysis** - Understand the file structure and dependencies
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
    
    # Step 2: Analyze directory structure
    structure = analyze_directory_structure()
    
    # Step 3: Create migration strategy
    strategy = create_migration_strategy(analysis_results, structure)
    
    # Step 4: Generate report
    generate_dependency_report(analysis_results, structure, strategy)
    
    print(f'\n🎉 Dependency analysis complete!')
    print(f'📊 Summary:')
    print(f'  Total files: {sum(strategy["file_counts"].values())}')
    print(f'  External dependencies: {len(analysis_results["external_dependencies"])}')
    print(f'  Internal dependencies: {len(analysis_results["internal_dependencies"])}')
    print(f'  Migration phases: {len(strategy["phases"])}')
    
    return {
        'analysis_results': analysis_results,
        'structure': structure,
        'strategy': strategy
    }

if __name__ == "__main__":
    result = main()
    print(f'\n📊 ANALYSIS SUMMARY:')
    print(f'  Total files: {sum(result["strategy"]["file_counts"].values())}')
    print(f'  External deps: {len(result["analysis_results"]["external_dependencies"])}')
    print(f'  Internal deps: {len(result["analysis_results"]["internal_dependencies"])}')
    print(f'  Migration phases: {len(result["strategy"]["phases"])}')
