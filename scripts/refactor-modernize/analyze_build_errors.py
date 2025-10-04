#!/usr/bin/env python3
"""
Analyze TypeScript build errors to prioritize fixes
"""

import re
import argparse
from pathlib import Path
from collections import defaultdict, Counter

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Analyze TypeScript build errors')
    parser.add_argument('--log', type=str, default='build.errors.log',
                       help='Build error log file')
    parser.add_argument('--root', type=str, default='/var/www/orthodoxmetrics/prod/UI/modernize/frontend',
                       help='Project root directory')
    return parser.parse_args()

def analyze_errors(log_file):
    """Analyze errors from TypeScript build log"""
    
    error_types = Counter()
    error_messages = defaultdict(list)
    files_with_errors = set()
    error_patterns = defaultdict(int)
    
    # Common error patterns
    patterns = {
        'implicit_any': r"error TS7006: Parameter '\w+' implicitly has an 'any' type",
        'implicit_any_binding': r"error TS7031: Binding element '\w+' implicitly has an 'any' type",
        'unused_var': r"error TS6133: '\w+' is declared but its value is never read",
        'missing_module': r"error TS2307: Cannot find module",
        'property_not_exist': r"error TS2339: Property '\w+' does not exist on type",
        'cannot_find_name': r"error TS2304: Cannot find name '\w+'",
        'type_not_assignable': r"error TS2322: Type .* is not assignable to type",
        'argument_not_assignable': r"error TS2345: Argument of type .* is not assignable",
        'missing_properties': r"error TS2739: Type .* is missing the following properties",
        'no_overload': r"error TS2769: No overload matches this call",
        'jsx_element': r"error TS2786: .* cannot be used as a JSX component",
        'import_error': r"error TS2305: Module .* has no exported member",
    }
    
    try:
        with open(log_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except FileNotFoundError:
        print(f"❌ Error log file not found: {log_file}")
        return None
    
    for line in lines:
        # Extract error code
        error_match = re.search(r'error (TS\d{4}):', line)
        if error_match:
            error_code = error_match.group(1)
            error_types[error_code] += 1
            
            # Extract file path
            file_match = re.search(r'^(src/[^(]+)\(\d+,\d+\):', line)
            if file_match:
                file_path = file_match.group(1)
                files_with_errors.add(file_path)
            
            # Categorize by pattern
            for pattern_name, pattern in patterns.items():
                if re.search(pattern, line):
                    error_patterns[pattern_name] += 1
                    break
            
            # Store full error message
            error_messages[error_code].append(line.strip())
    
    return {
        'error_types': error_types,
        'error_patterns': error_patterns,
        'files_with_errors': files_with_errors,
        'error_messages': error_messages,
        'total_errors': sum(error_types.values())
    }

def generate_fix_priority(analysis):
    """Generate prioritized list of fixes"""
    
    priorities = []
    
    # Priority 1: Import and module errors (blocks compilation)
    if analysis['error_patterns']['missing_module'] > 0:
        priorities.append({
            'priority': 1,
            'category': 'Missing Modules',
            'count': analysis['error_patterns']['missing_module'],
            'action': 'Install missing dependencies or fix import paths',
            'impact': 'HIGH - Blocks compilation'
        })
    
    # Priority 2: Type errors that break functionality
    type_errors = (
        analysis['error_patterns']['property_not_exist'] +
        analysis['error_patterns']['cannot_find_name'] +
        analysis['error_patterns']['import_error']
    )
    if type_errors > 0:
        priorities.append({
            'priority': 2,
            'category': 'Type Definition Errors',
            'count': type_errors,
            'action': 'Add type definitions or fix property access',
            'impact': 'HIGH - May cause runtime errors'
        })
    
    # Priority 3: Implicit any (easy to fix)
    implicit_any = (
        analysis['error_patterns']['implicit_any'] +
        analysis['error_patterns']['implicit_any_binding']
    )
    if implicit_any > 0:
        priorities.append({
            'priority': 3,
            'category': 'Implicit Any Types',
            'count': implicit_any,
            'action': 'Add explicit type annotations',
            'impact': 'MEDIUM - Type safety'
        })
    
    # Priority 4: Unused variables (can be ignored with config)
    if analysis['error_patterns']['unused_var'] > 0:
        priorities.append({
            'priority': 4,
            'category': 'Unused Variables',
            'count': analysis['error_patterns']['unused_var'],
            'action': 'Remove unused code or adjust TypeScript config',
            'impact': 'LOW - Code cleanliness'
        })
    
    return priorities

def main():
    """Main function"""
    args = parse_args()
    
    print('📊 Analyzing TypeScript build errors...\n')
    
    # Check if log file exists in root or as absolute path
    log_path = Path(args.log)
    if not log_path.is_absolute():
        log_path = Path(args.root) / args.log
    
    analysis = analyze_errors(log_path)
    
    if not analysis:
        return
    
    print(f'📈 Error Summary:')
    print(f'  Total errors: {analysis["total_errors"]}')
    print(f'  Files with errors: {len(analysis["files_with_errors"])}')
    print(f'  Average errors per file: {analysis["total_errors"] / len(analysis["files_with_errors"]):.1f}')
    
    print(f'\n🔍 Top Error Types:')
    for error_code, count in analysis['error_types'].most_common(10):
        print(f'  {error_code}: {count} errors')
    
    print(f'\n📋 Error Categories:')
    for category, count in sorted(analysis['error_patterns'].items(), key=lambda x: x[1], reverse=True):
        if count > 0:
            percentage = (count / analysis['total_errors']) * 100
            print(f'  {category}: {count} ({percentage:.1f}%)')
    
    # Generate fix priorities
    priorities = generate_fix_priority(analysis)
    
    print(f'\n🎯 Fix Priorities:')
    for item in sorted(priorities, key=lambda x: x['priority']):
        print(f'\n  Priority {item["priority"]}: {item["category"]}')
        print(f'    Count: {item["count"]} errors')
        print(f'    Action: {item["action"]}')
        print(f'    Impact: {item["impact"]}')
    
    # Show most affected files
    print(f'\n📁 Most Affected Files (sample):')
    file_error_count = Counter()
    for line in open(log_path, 'r', encoding='utf-8'):
        file_match = re.search(r'^(src/[^(]+)\(\d+,\d+\):', line)
        if file_match:
            file_error_count[file_match.group(1)] += 1
    
    for file_path, count in file_error_count.most_common(10):
        print(f'  {file_path}: {count} errors')
    
    # Recommendations
    print(f'\n💡 Recommendations:')
    print(f'  1. Run: python3 scripts/refactor-modernize/fix_common_typescript_errors.py')
    print(f'  2. Consider adding "skipLibCheck": true to tsconfig.json')
    print(f'  3. For unused variables, add to tsconfig.json:')
    print(f'     "noUnusedLocals": false,')
    print(f'     "noUnusedParameters": false')
    print(f'  4. Install any remaining missing type definitions')

if __name__ == "__main__":
    main()
