#!/usr/bin/env python3
import os
import re
from collections import defaultdict, Counter
from pathlib import Path
import json

def analyze_code_patterns(file_path):
    """Analyze specific code patterns in a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        patterns = {
            'react_imports': len(re.findall(r'import.*from\s+[\'"]react[\'"]', content)),
            'mui_imports': len(re.findall(r'import.*from\s+[\'"]@mui/', content)),
            'bootstrap_imports': len(re.findall(r'import.*from\s+[\'"]react-bootstrap[\'"]', content)),
            'formik_usage': len(re.findall(r'Formik|useFormik', content)),
            'yup_usage': len(re.findall(r'Yup|yup', content)),
            'ag_grid_usage': len(re.findall(r'ag-grid', content)),
            'useState_count': len(re.findall(r'useState\s*\(', content)),
            'useEffect_count': len(re.findall(r'useEffect\s*\(', content)),
            'useCallback_count': len(re.findall(r'useCallback\s*\(', content)),
            'useMemo_count': len(re.findall(r'useMemo\s*\(', content)),
            'api_calls': len(re.findall(r'\.(get|post|put|delete)\s*\(', content)),
            'modal_components': len(re.findall(r'Modal|Dialog', content)),
            'table_components': len(re.findall(r'Table|Grid', content)),
            'form_components': len(re.findall(r'Form|Input|Field', content)),
            'button_components': len(re.findall(r'Button', content)),
            'icon_usage': len(re.findall(r'Fa[A-Z]|Icon', content)),
            'constants_usage': len(re.findall(r'RECORD_TYPES|FIELD_DEFINITIONS|THEME_COLORS', content)),
            'error_handling': len(re.findall(r'try\s*\{|catch\s*\(|throw\s+', content)),
            'loading_states': len(re.findall(r'loading|isLoading|Loading', content)),
            'validation_patterns': len(re.findall(r'required|validation|validate', content)),
        }
        
        return patterns
    except Exception as e:
        print(f"Error analyzing patterns in {file_path}: {e}")
        return {}

def find_duplicate_components(files_data):
    """Find duplicate component patterns."""
    component_patterns = defaultdict(list)
    
    for file_data in files_data:
        if not file_data:
            continue
            
        file_path = file_data['file_path']
        content = ""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            continue
        
        # Find component definitions
        component_matches = re.findall(r'(?:export\s+)?(?:const|function)\s+([A-Z][a-zA-Z0-9]*)\s*[=:]\s*(?:\([^)]*\)\s*)?=>\s*\{', content)
        for component in component_matches:
            component_patterns[component].append(file_path)
        
        # Find common patterns
        common_patterns = [
            'RecordManager', 'RecordTable', 'RecordForm', 'RecordModal',
            'RecordSearch', 'RecordFilter', 'RecordPagination', 'RecordHeader',
            'RecordCard', 'RecordList', 'RecordSidebar', 'RecordPreview',
            'ImportModal', 'DeleteModal', 'HistoryModal', 'CertificateModal'
        ]
        
        for pattern in common_patterns:
            if pattern in content:
                component_patterns[f"*{pattern}*"].append(file_path)
    
    return component_patterns

def analyze_import_consolidation(files_data):
    """Analyze import consolidation opportunities."""
    import_consolidation = {
        'mui_imports': defaultdict(list),
        'react_imports': defaultdict(list),
        'bootstrap_imports': defaultdict(list),
        'icon_imports': defaultdict(list),
        'common_imports': defaultdict(list),
        'relative_imports': defaultdict(list)
    }
    
    for file_data in files_data:
        if not file_data:
            continue
            
        file_path = file_data['file_path']
        
        for imp in file_data['imports']:
            module = imp['module']
            
            if module.startswith('@mui/'):
                import_consolidation['mui_imports'][module].append(file_path)
            elif module == 'react':
                import_consolidation['react_imports'][module].append(file_path)
            elif 'bootstrap' in module:
                import_consolidation['bootstrap_imports'][module].append(file_path)
            elif 'icon' in module.lower():
                import_consolidation['icon_imports'][module].append(file_path)
            elif module.startswith('./') or module.startswith('../'):
                import_consolidation['relative_imports'][module].append(file_path)
            else:
                import_consolidation['common_imports'][module].append(file_path)
    
    return import_consolidation

def analyze_hook_patterns(files_data):
    """Analyze React hook usage patterns."""
    hook_patterns = {
        'useState_patterns': defaultdict(list),
        'useEffect_patterns': defaultdict(list),
        'custom_hooks': defaultdict(list),
        'hook_combinations': defaultdict(list)
    }
    
    for file_data in files_data:
        if not file_data:
            continue
            
        file_path = file_data['file_path']
        content = ""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            continue
        
        # Analyze useState patterns
        useState_matches = re.findall(r'const\s+\[([^,]+),\s*set([^)]+)\]\s*=\s*useState\s*\([^)]*\)', content)
        for state_var, setter in useState_matches:
            hook_patterns['useState_patterns'][f"{state_var} -> {setter}"].append(file_path)
        
        # Analyze useEffect patterns
        useEffect_matches = re.findall(r'useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*\},\s*\[([^\]]*)\]', content)
        for deps in useEffect_matches:
            hook_patterns['useEffect_patterns'][deps.strip()].append(file_path)
        
        # Find custom hooks
        custom_hook_matches = re.findall(r'const\s+use[A-Z][a-zA-Z0-9]*\s*=', content)
        for hook in custom_hook_matches:
            hook_patterns['custom_hooks'][hook].append(file_path)
    
    return hook_patterns

def generate_refactoring_strategies(files_data, duplicates, import_analysis, hook_patterns):
    """Generate specific refactoring strategies."""
    strategies = {
        'component_consolidation': [],
        'hook_extraction': [],
        'import_optimization': [],
        'api_consolidation': [],
        'state_management': [],
        'error_handling': [],
        'validation_consolidation': [],
        'ui_consistency': []
    }
    
    # Component consolidation strategies
    if 'similar_components' in duplicates and isinstance(duplicates['similar_components'], dict):
        for component, files in duplicates['similar_components'].items():
            if len(files) > 2:
                strategies['component_consolidation'].append({
                    'component': component,
                    'files': files,
                    'strategy': f"Extract {component} into a shared component library",
                    'priority': 'high' if len(files) > 5 else 'medium'
                })
    
    # Hook extraction strategies
    for hook_pattern, files in hook_patterns['useState_patterns'].items():
        if len(files) > 3:
            strategies['hook_extraction'].append({
                'pattern': hook_pattern,
                'files': files,
                'strategy': f"Create custom hook for {hook_pattern} pattern",
                'priority': 'medium'
            })
    
    # Import optimization strategies
    if 'external_deps' in import_analysis and isinstance(import_analysis['external_deps'], dict):
        for module, files in import_analysis['external_deps'].items():
            if len(files) > 5:
                strategies['import_optimization'].append({
                    'module': module,
                    'files': files,
                    'strategy': f"Create barrel export for {module}",
                    'priority': 'low'
                })
    
    # API consolidation strategies
    api_patterns = defaultdict(list)
    for file_data in files_data:
        if not file_data:
            continue
        for api_call in file_data['api_calls']:
            if isinstance(api_call, tuple):
                api_patterns[f"{api_call[0]}.{api_call[1]}"].append(file_data['file_path'])
    
    for pattern, files in api_patterns.items():
        if len(files) > 2:
            strategies['api_consolidation'].append({
                'pattern': pattern,
                'files': files,
                'strategy': f"Consolidate {pattern} API calls into a service",
                'priority': 'high'
            })
    
    return strategies

def main():
    """Main analysis function."""
    records_dir = Path('front-end/src/features/Records-centralized')
    
    if not records_dir.exists():
        print("Records-centralized directory not found!")
        return
    
    print("=" * 80)
    print("DETAILED RECORDS-CENTRALIZED ANALYSIS")
    print("=" * 80)
    
    # Find all files
    files = []
    for pattern in ['*.ts', '*.tsx', '*.js', '*.jsx']:
        files.extend(records_dir.rglob(pattern))
    
    print(f"Analyzing {len(files)} files for detailed patterns...")
    
    # Analyze each file
    files_data = []
    for file_path in files:
        file_data = analyze_file_structure(file_path)
        if file_data:
            files_data.append(file_data)
    
    # Analyze patterns
    all_patterns = {}
    for file_data in files_data:
        if file_data:
            patterns = analyze_code_patterns(file_data['file_path'])
            all_patterns[file_data['file_path']] = patterns
    
    # Find duplicates
    duplicates = find_duplicate_components(files_data)
    
    # Analyze imports
    import_analysis = analyze_import_consolidation(files_data)
    
    # Analyze hooks
    hook_patterns = analyze_hook_patterns(files_data)
    
    # Generate strategies
    strategies = generate_refactoring_strategies(files_data, duplicates, import_analysis, hook_patterns)
    
    # Generate detailed report
    generate_detailed_report(files_data, all_patterns, duplicates, import_analysis, hook_patterns, strategies)

def analyze_file_structure(file_path):
    """Basic file structure analysis."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        lines = content.split('\n')
        total_lines = len(lines)
        non_empty_lines = len([line for line in lines if line.strip()])
        
        # Extract imports
        imports = extract_imports(content)
        
        # Extract hooks
        hooks = extract_hooks(content)
        
        # Extract API calls
        api_calls = extract_api_calls(content)
        
        return {
            'file_path': str(file_path),
            'total_lines': total_lines,
            'non_empty_lines': non_empty_lines,
            'imports': imports,
            'hooks': hooks,
            'api_calls': api_calls,
            'file_size': len(content)
        }
    except Exception as e:
        print(f"Error analyzing {file_path}: {e}")
        return None

def extract_imports(content):
    """Extract imports from content."""
    imports = []
    import_patterns = [
        r'import\s+([^;]+?)\s+from\s+[\'"]([^\'"]+)[\'"]',
        r'import\s+[\'"]([^\'"]+)[\'"]',
        r'require\([\'"]([^\'"]+)[\'"]\)',
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

def extract_hooks(content):
    """Extract React hooks from content."""
    hooks = []
    hook_patterns = [
        r'useState\s*\([^)]*\)',
        r'useEffect\s*\([^)]*\)',
        r'useContext\s*\([^)]*\)',
        r'useReducer\s*\([^)]*\)',
        r'useCallback\s*\([^)]*\)',
        r'useMemo\s*\([^)]*\)',
        r'useRef\s*\([^)]*\)',
    ]
    
    for pattern in hook_patterns:
        matches = re.findall(pattern, content)
        for match in matches:
            hook_name = match.split('(')[0].strip()
            hooks.append(hook_name)
    
    return hooks

def extract_api_calls(content):
    """Extract API calls from content."""
    api_calls = []
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

def generate_detailed_report(files_data, patterns, duplicates, import_analysis, hook_patterns, strategies):
    """Generate detailed analysis report."""
    
    report = []
    report.append("# Detailed Records-Centralized Analysis Report")
    report.append("=" * 80)
    report.append("")
    
    # Executive Summary
    report.append("## Executive Summary")
    report.append(f"- **Total Files**: {len(files_data)}")
    report.append(f"- **Total Lines**: {sum(f['total_lines'] for f in files_data)}")
    report.append(f"- **Total Size**: {sum(f['file_size'] for f in files_data)} bytes")
    report.append(f"- **Average File Size**: {sum(f['file_size'] for f in files_data) // len(files_data)} bytes")
    report.append("")
    
    # Code Pattern Analysis
    report.append("## Code Pattern Analysis")
    report.append("")
    
    # Aggregate patterns across all files
    total_patterns = defaultdict(int)
    for file_patterns in patterns.values():
        for pattern, count in file_patterns.items():
            total_patterns[pattern] += count
    
    report.append("### Most Common Patterns")
    for pattern, count in sorted(total_patterns.items(), key=lambda x: x[1], reverse=True)[:15]:
        report.append(f"- **{pattern}**: {count} occurrences")
    report.append("")
    
    # Component Analysis
    report.append("## Component Analysis")
    report.append("")
    
    report.append("### Duplicate Component Patterns")
    if 'similar_components' in duplicates and isinstance(duplicates['similar_components'], dict):
        for component, files in duplicates['similar_components'].items():
            if len(files) > 1:
                report.append(f"- **{component}**: {len(files)} files")
                for file_path in files[:5]:  # Show first 5 files
                    report.append(f"  - {file_path}")
                if len(files) > 5:
                    report.append(f"  - ... and {len(files) - 5} more")
                report.append("")
    
    # Import Analysis
    report.append("## Import Analysis")
    report.append("")
    
    report.append("### MUI Import Consolidation Opportunities")
    if 'mui_imports' in import_analysis and isinstance(import_analysis['mui_imports'], dict):
        for module, files in import_analysis['mui_imports'].items():
            if len(files) > 3:
                report.append(f"- **{module}**: {len(files)} files")
                report.append(f"  - Strategy: Create barrel export")
                report.append("")
    
    report.append("### Icon Import Consolidation")
    if 'icon_imports' in import_analysis and isinstance(import_analysis['icon_imports'], dict):
        for module, files in import_analysis['icon_imports'].items():
            if len(files) > 2:
                report.append(f"- **{module}**: {len(files)} files")
                report.append(f"  - Strategy: Create icon barrel export")
                report.append("")
    
    # Hook Analysis
    report.append("## Hook Pattern Analysis")
    report.append("")
    
    report.append("### Common useState Patterns")
    if 'useState_patterns' in hook_patterns and isinstance(hook_patterns['useState_patterns'], dict):
        for pattern, files in hook_patterns['useState_patterns'].items():
            if len(files) > 2:
                report.append(f"- **{pattern}**: {len(files)} files")
                report.append(f"  - Strategy: Extract into custom hook")
                report.append("")
    
    report.append("### Custom Hooks Found")
    if 'custom_hooks' in hook_patterns and isinstance(hook_patterns['custom_hooks'], dict):
        for hook, files in hook_patterns['custom_hooks'].items():
            report.append(f"- **{hook}**: {len(files)} files")
            report.append("")
    
    # Refactoring Strategies
    report.append("## Refactoring Strategies")
    report.append("")
    
    for category, strategies_list in strategies.items():
        if strategies_list:
            report.append(f"### {category.replace('_', ' ').title()}")
            for strategy in strategies_list:
                priority_emoji = "🔴" if strategy['priority'] == 'high' else "🟡" if strategy['priority'] == 'medium' else "🟢"
                report.append(f"- {priority_emoji} **{strategy.get('component', strategy.get('pattern', strategy.get('module', 'Unknown')))}**")
                report.append(f"  - Strategy: {strategy['strategy']}")
                report.append(f"  - Affected files: {len(strategy['files'])}")
                report.append("")
    
    # File-by-File Analysis
    report.append("## File-by-File Analysis")
    report.append("")
    
    # Sort files by size (largest first)
    sorted_files = sorted(files_data, key=lambda x: x['file_size'], reverse=True)
    
    for file_data in sorted_files[:20]:  # Top 20 largest files
        file_path = file_data['file_path']
        file_patterns = patterns.get(file_path, {})
        
        report.append(f"### {file_path}")
        report.append(f"- **Size**: {file_data['file_size']} bytes, {file_data['total_lines']} lines")
        report.append(f"- **Imports**: {len(file_data['imports'])}")
        report.append(f"- **Hooks**: {len(file_data['hooks'])}")
        report.append(f"- **API Calls**: {len(file_data['api_calls'])}")
        
        # Show key patterns
        key_patterns = ['useState_count', 'useEffect_count', 'mui_imports', 'bootstrap_imports', 'formik_usage']
        pattern_summary = []
        for pattern in key_patterns:
            count = file_patterns.get(pattern, 0)
            if count > 0:
                pattern_summary.append(f"{pattern}: {count}")
        
        if pattern_summary:
            report.append(f"- **Key Patterns**: {', '.join(pattern_summary)}")
        
        report.append("")
    
    # Recommendations
    report.append("## Key Recommendations")
    report.append("")
    
    report.append("### 1. Component Consolidation (High Priority)")
    report.append("- Extract common Record* components into shared library")
    report.append("- Create base components for Modal, Table, Form patterns")
    report.append("- Standardize component naming conventions")
    report.append("")
    
    report.append("### 2. Hook Extraction (Medium Priority)")
    report.append("- Create custom hooks for common state patterns")
    report.append("- Extract API call logic into custom hooks")
    report.append("- Standardize error handling hooks")
    report.append("")
    
    report.append("### 3. Import Optimization (Low Priority)")
    report.append("- Create barrel exports for frequently used modules")
    report.append("- Consolidate MUI imports")
    report.append("- Standardize icon imports")
    report.append("")
    
    report.append("### 4. API Consolidation (High Priority)")
    report.append("- Create centralized API service layer")
    report.append("- Standardize error handling across API calls")
    report.append("- Implement consistent loading states")
    report.append("")
    
    # Write report
    with open('detailed_records_analysis_report.md', 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))
    
    print("Detailed analysis complete!")
    print("Report saved to: detailed_records_analysis_report.md")

if __name__ == "__main__":
    main()
