#!/usr/bin/env python3
import os
import re
from collections import defaultdict, Counter
from pathlib import Path
import ast
import json

def analyze_file_structure(file_path):
    """Analyze the structure and content of a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Basic file info
        lines = content.split('\n')
        total_lines = len(lines)
        non_empty_lines = len([line for line in lines if line.strip()])
        
        # Extract imports
        imports = extract_imports(content)
        
        # Extract React components
        components = extract_react_components(content)
        
        # Extract hooks usage
        hooks = extract_hooks(content)
        
        # Extract API calls
        api_calls = extract_api_calls(content)
        
        # Extract state management
        state_usage = extract_state_usage(content)
        
        return {
            'file_path': str(file_path),
            'total_lines': total_lines,
            'non_empty_lines': non_empty_lines,
            'imports': imports,
            'components': components,
            'hooks': hooks,
            'api_calls': api_calls,
            'state_usage': state_usage,
            'file_size': len(content)
        }
    except Exception as e:
        print(f"Error analyzing {file_path}: {e}")
        return None

def extract_imports(content):
    """Extract all import statements from content."""
    imports = []
    import_patterns = [
        r'import\s+([^;]+?)\s+from\s+[\'"]([^\'"]+)[\'"]',  # import { ... } from '...'
        r'import\s+[\'"]([^\'"]+)[\'"]',  # import '...'
        r'require\([\'"]([^\'"]+)[\'"]\)',  # require('...')
    ]
    
    for pattern in import_patterns:
        matches = re.findall(pattern, content, re.MULTILINE)
        for match in matches:
            if isinstance(match, tuple) and len(match) == 2:
                imports.append({
                    'type': 'named_import',
                    'module': match[1],
                    'imports': match[0].strip()
                })
            else:
                imports.append({
                    'type': 'side_effect_import',
                    'module': match,
                    'imports': 'side_effect'
                })
    
    return imports

def extract_react_components(content):
    """Extract React component definitions."""
    components = []
    
    # Function components
    func_pattern = r'(?:export\s+)?(?:const|function)\s+([A-Z][a-zA-Z0-9]*)\s*[=:]\s*(?:\([^)]*\)\s*)?=>\s*\{'
    func_matches = re.findall(func_pattern, content)
    components.extend([{'name': name, 'type': 'function'} for name in func_matches])
    
    # Class components
    class_pattern = r'(?:export\s+)?class\s+([A-Z][a-zA-Z0-9]*)\s+extends\s+React\.Component'
    class_matches = re.findall(class_pattern, content)
    components.extend([{'name': name, 'type': 'class'} for name in class_matches])
    
    return components

def extract_hooks(content):
    """Extract React hooks usage."""
    hooks = []
    hook_patterns = [
        r'useState\s*\([^)]*\)',
        r'useEffect\s*\([^)]*\)',
        r'useContext\s*\([^)]*\)',
        r'useReducer\s*\([^)]*\)',
        r'useCallback\s*\([^)]*\)',
        r'useMemo\s*\([^)]*\)',
        r'useRef\s*\([^)]*\)',
        r'useQuery\s*\([^)]*\)',
        r'useMutation\s*\([^)]*\)',
    ]
    
    for pattern in hook_patterns:
        matches = re.findall(pattern, content)
        for match in matches:
            hook_name = match.split('(')[0].strip()
            hooks.append(hook_name)
    
    return hooks

def extract_api_calls(content):
    """Extract API calls and service usage."""
    api_calls = []
    
    # Common API patterns
    api_patterns = [
        r'(\w+Api)\.(\w+)\s*\(',
        r'(\w+Service)\.(\w+)\s*\(',
        r'fetch\s*\([^)]*\)',
        r'axios\.(\w+)\s*\(',
        r'\.get\s*\(',
        r'\.post\s*\(',
        r'\.put\s*\(',
        r'\.delete\s*\(',
    ]
    
    for pattern in api_patterns:
        matches = re.findall(pattern, content)
        api_calls.extend(matches)
    
    return api_calls

def extract_state_usage(content):
    """Extract state management usage."""
    state_patterns = [
        r'useState\s*\([^)]*\)',
        r'useReducer\s*\([^)]*\)',
        r'useContext\s*\([^)]*\)',
        r'useStore\s*\([^)]*\)',
        r'useZustand\s*\([^)]*\)',
        r'useRedux\s*\([^)]*\)',
    ]
    
    state_usage = []
    for pattern in state_patterns:
        matches = re.findall(pattern, content)
        state_usage.extend(matches)
    
    return state_usage

def find_duplicate_code_patterns(files_data):
    """Find duplicate code patterns across files."""
    duplicates = {
        'similar_imports': defaultdict(list),
        'similar_components': defaultdict(list),
        'similar_hooks': defaultdict(list),
        'similar_api_patterns': defaultdict(list),
        'similar_state_patterns': defaultdict(list)
    }
    
    # Group files by similar patterns
    for file_data in files_data:
        if not file_data:
            continue
            
        file_path = file_data['file_path']
        
        # Group by import patterns
        for imp in file_data['imports']:
            key = f"{imp['module']}:{imp['type']}"
            duplicates['similar_imports'][key].append(file_path)
        
        # Group by component patterns
        for comp in file_data['components']:
            key = f"{comp['name']}:{comp['type']}"
            duplicates['similar_components'][key].append(file_path)
        
        # Group by hook patterns
        for hook in file_data['hooks']:
            duplicates['similar_hooks'][hook].append(file_path)
        
        # Group by API patterns
        for api in file_data['api_calls']:
            if isinstance(api, tuple):
                key = f"{api[0]}.{api[1]}"
            else:
                key = str(api)
            duplicates['similar_api_patterns'][key].append(file_path)
    
    return duplicates

def analyze_import_dependencies(files_data):
    """Analyze import dependencies and usage patterns."""
    import_analysis = {
        'external_deps': Counter(),
        'internal_deps': Counter(),
        'relative_deps': Counter(),
        'shared_deps': Counter(),
        'records_specific_deps': Counter(),
        'import_frequency': Counter(),
        'circular_deps': [],
        'unused_imports': []
    }
    
    all_imports = []
    for file_data in files_data:
        if not file_data:
            continue
        all_imports.extend(file_data['imports'])
    
    for imp in all_imports:
        module = imp['module']
        import_analysis['import_frequency'][module] += 1
        
        # Categorize imports
        if module.startswith('@') or '/' in module.split('/')[0] if '/' in module else False:
            import_analysis['external_deps'][module] += 1
        elif module.startswith('./') or module.startswith('../'):
            import_analysis['relative_deps'][module] += 1
        elif 'record' in module.lower():
            import_analysis['records_specific_deps'][module] += 1
        elif any(keyword in module for keyword in ['components', 'utils', 'hooks', 'context', 'services', 'api', 'types']):
            import_analysis['shared_deps'][module] += 1
        else:
            import_analysis['internal_deps'][module] += 1
    
    return import_analysis

def generate_refactoring_recommendations(files_data, duplicates, import_analysis):
    """Generate refactoring recommendations based on analysis."""
    recommendations = {
        'consolidation_opportunities': [],
        'extract_common_components': [],
        'extract_common_hooks': [],
        'extract_common_services': [],
        'remove_duplicates': [],
        'optimize_imports': [],
        'architectural_improvements': []
    }
    
    # Find consolidation opportunities
    for pattern, files in duplicates['similar_components'].items():
        if len(files) > 2:
            recommendations['consolidation_opportunities'].append({
                'pattern': pattern,
                'files': files,
                'type': 'component',
                'suggestion': f"Consider extracting {pattern} into a shared component"
            })
    
    # Find common hooks
    for hook, files in duplicates['similar_hooks'].items():
        if len(files) > 3:
            recommendations['extract_common_hooks'].append({
                'hook': hook,
                'files': files,
                'suggestion': f"Consider creating a custom hook for {hook}"
            })
    
    # Find common API patterns
    for api_pattern, files in duplicates['similar_api_patterns'].items():
        if len(files) > 2:
            recommendations['extract_common_services'].append({
                'pattern': api_pattern,
                'files': files,
                'suggestion': f"Consider consolidating {api_pattern} API calls"
            })
    
    # Find high-frequency imports that could be optimized
    for module, count in import_analysis['import_frequency'].most_common(10):
        if count > 5:
            recommendations['optimize_imports'].append({
                'module': module,
                'count': count,
                'suggestion': f"Consider creating a barrel export for {module}"
            })
    
    return recommendations

def main():
    """Main analysis function."""
    records_dir = Path('front-end/src/features/Records-centralized')
    
    if not records_dir.exists():
        print("Records-centralized directory not found!")
        return
    
    print("=" * 80)
    print("COMPREHENSIVE RECORDS-CENTRALIZED ANALYSIS")
    print("=" * 80)
    
    # Find all files
    files = []
    for pattern in ['*.ts', '*.tsx', '*.js', '*.jsx']:
        files.extend(records_dir.rglob(pattern))
    
    print(f"Analyzing {len(files)} files...")
    
    # Analyze each file
    files_data = []
    for file_path in files:
        file_data = analyze_file_structure(file_path)
        if file_data:
            files_data.append(file_data)
    
    print(f"Successfully analyzed {len(files_data)} files")
    
    # Find duplicates
    duplicates = find_duplicate_code_patterns(files_data)
    
    # Analyze imports
    import_analysis = analyze_import_dependencies(files_data)
    
    # Generate recommendations
    recommendations = generate_refactoring_recommendations(files_data, duplicates, import_analysis)
    
    # Generate report
    generate_comprehensive_report(files_data, duplicates, import_analysis, recommendations)

def generate_comprehensive_report(files_data, duplicates, import_analysis, recommendations):
    """Generate a comprehensive report."""
    
    report = []
    report.append("# Comprehensive Records-Centralized Analysis Report")
    report.append("=" * 80)
    report.append("")
    
    # Summary
    report.append("## Executive Summary")
    report.append(f"- **Total Files Analyzed**: {len(files_data)}")
    report.append(f"- **Total Lines of Code**: {sum(f['total_lines'] for f in files_data)}")
    report.append(f"- **Total File Size**: {sum(f['file_size'] for f in files_data)} bytes")
    report.append("")
    
    # File Structure Analysis
    report.append("## File Structure Analysis")
    report.append("")
    
    # Group files by directory
    dir_structure = defaultdict(list)
    for file_data in files_data:
        dir_path = Path(file_data['file_path']).parent
        dir_structure[str(dir_path)].append(file_data)
    
    for dir_path, files in sorted(dir_structure.items()):
        report.append(f"### {dir_path}")
        report.append(f"- Files: {len(files)}")
        report.append(f"- Total Lines: {sum(f['total_lines'] for f in files)}")
        report.append(f"- Average Lines per File: {sum(f['total_lines'] for f in files) // len(files)}")
        report.append("")
    
    # Import Analysis
    report.append("## Import Analysis")
    report.append("")
    
    report.append("### External Dependencies (Top 10)")
    for module, count in import_analysis['external_deps'].most_common(10):
        report.append(f"- `{module}`: {count} usages")
    report.append("")
    
    report.append("### Internal Dependencies (Top 10)")
    for module, count in import_analysis['internal_deps'].most_common(10):
        report.append(f"- `{module}`: {count} usages")
    report.append("")
    
    report.append("### Records-Specific Dependencies")
    for module, count in import_analysis['records_specific_deps'].most_common(10):
        report.append(f"- `{module}`: {count} usages")
    report.append("")
    
    report.append("### Shared Dependencies")
    for module, count in import_analysis['shared_deps'].most_common(10):
        report.append(f"- `{module}`: {count} usages")
    report.append("")
    
    # Duplicate Code Analysis
    report.append("## Duplicate Code Analysis")
    report.append("")
    
    report.append("### Similar Components (Potential Duplicates)")
    for pattern, files in duplicates['similar_components'].items():
        if len(files) > 1:
            report.append(f"- **{pattern}**: {len(files)} files")
            for file_path in files:
                report.append(f"  - {file_path}")
            report.append("")
    
    report.append("### Common Hook Patterns")
    for hook, files in duplicates['similar_hooks'].items():
        if len(files) > 2:
            report.append(f"- **{hook}**: {len(files)} usages")
            report.append(f"  - Files: {', '.join(files)}")
            report.append("")
    
    report.append("### Common API Patterns")
    for pattern, files in duplicates['similar_api_patterns'].items():
        if len(files) > 2:
            report.append(f"- **{pattern}**: {len(files)} usages")
            report.append(f"  - Files: {', '.join(files)}")
            report.append("")
    
    # Refactoring Recommendations
    report.append("## Refactoring Recommendations")
    report.append("")
    
    report.append("### Consolidation Opportunities")
    for rec in recommendations['consolidation_opportunities']:
        report.append(f"- **{rec['pattern']}**: {rec['suggestion']}")
        report.append(f"  - Affected files: {len(rec['files'])}")
        report.append("")
    
    report.append("### Extract Common Hooks")
    for rec in recommendations['extract_common_hooks']:
        report.append(f"- **{rec['hook']}**: {rec['suggestion']}")
        report.append(f"  - Affected files: {len(rec['files'])}")
        report.append("")
    
    report.append("### Extract Common Services")
    for rec in recommendations['extract_common_services']:
        report.append(f"- **{rec['pattern']}**: {rec['suggestion']}")
        report.append(f"  - Affected files: {len(rec['files'])}")
        report.append("")
    
    report.append("### Import Optimization")
    for rec in recommendations['optimize_imports']:
        report.append(f"- **{rec['module']}**: {rec['suggestion']} ({rec['count']} usages)")
        report.append("")
    
    # Detailed File Analysis
    report.append("## Detailed File Analysis")
    report.append("")
    
    for file_data in sorted(files_data, key=lambda x: x['total_lines'], reverse=True):
        report.append(f"### {file_data['file_path']}")
        report.append(f"- Lines: {file_data['total_lines']} (non-empty: {file_data['non_empty_lines']})")
        report.append(f"- Size: {file_data['file_size']} bytes")
        report.append(f"- Components: {len(file_data['components'])}")
        report.append(f"- Hooks: {len(file_data['hooks'])}")
        report.append(f"- API Calls: {len(file_data['api_calls'])}")
        report.append(f"- Imports: {len(file_data['imports'])}")
        report.append("")
    
    # Write report
    with open('comprehensive_records_analysis_report.md', 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))
    
    print("Comprehensive analysis complete!")
    print("Report saved to: comprehensive_records_analysis_report.md")

if __name__ == "__main__":
    main()
