#!/usr/bin/env python3
import os
import re
from collections import defaultdict, Counter
from pathlib import Path

def extract_imports_from_file(file_path):
    """Extract all import statements from a file."""
    imports = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Match various import patterns
        import_patterns = [
            r'import\s+([^;]+?)\s+from\s+[\'"]([^\'"]+)[\'"]',  # import { ... } from '...'
            r'import\s+([^;]+?)\s+from\s+[\'"]([^\'"]+)[\'"]',  # import default from '...'
            r'import\s+[\'"]([^\'"]+)[\'"]',  # import '...'
            r'require\([\'"]([^\'"]+)[\'"]\)',  # require('...')
        ]
        
        for pattern in import_patterns:
            matches = re.findall(pattern, content, re.MULTILINE)
            for match in matches:
                if isinstance(match, tuple):
                    if len(match) == 2:
                        imports.append({
                            'type': 'named_import',
                            'module': match[1],
                            'imports': match[0].strip()
                        })
                    else:
                        imports.append({
                            'type': 'default_import',
                            'module': match[0],
                            'imports': 'default'
                        })
                else:
                    imports.append({
                        'type': 'side_effect_import',
                        'module': match,
                        'imports': 'side_effect'
                    })
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    
    return imports

def categorize_import(module_path):
    """Categorize an import based on its path."""
    if not module_path:
        return 'unknown'
    
    # External libraries (node_modules)
    if module_path.startswith('@') or '/' in module_path.split('/')[0] if '/' in module_path else False:
        return 'external'
    
    # React and common libraries
    external_libs = [
        'react', 'react-dom', 'react-router', 'react-router-dom',
        '@mui/material', '@mui/icons-material', '@mui/lab', '@mui/x-data-grid',
        '@emotion/react', '@emotion/styled', 'axios', 'lodash', 'moment',
        'date-fns', 'ag-grid-react', 'ag-grid-community', 'ag-grid-enterprise',
        'recharts', 'd3', 'chart.js', 'framer-motion', 'react-hook-form',
        'formik', 'yup', 'react-query', '@tanstack/react-query', 'zustand',
        'redux', 'react-redux', 'jotai', 'valtio'
    ]
    
    if any(module_path.startswith(lib) for lib in external_libs):
        return 'external'
    
    # Relative imports
    if module_path.startswith('./') or module_path.startswith('../'):
        return 'relative'
    
    # Absolute imports from src
    if module_path.startswith('src/') or module_path.startswith('/src/'):
        return 'src_absolute'
    
    # Check if it's a records-specific import
    records_keywords = ['record', 'Record', 'records', 'Records']
    if any(keyword in module_path for keyword in records_keywords):
        return 'records_specific'
    
    # Check if it's a shared/common import
    shared_keywords = ['components', 'utils', 'hooks', 'context', 'services', 'api', 'types', 'constants', 'helpers']
    if any(keyword in module_path for keyword in shared_keywords):
        return 'shared'
    
    return 'other'

def analyze_record_files():
    """Analyze all record files and their imports."""
    records_dir = Path('front-end/src/features/Records-centralized')
    
    if not records_dir.exists():
        print(f"Records-centralized directory not found at {records_dir.absolute()}!")
        return
    
    print(f"Analyzing files in: {records_dir.absolute()}")
    
    all_imports = []
    file_imports = {}
    
    # Find all TypeScript/JavaScript files
    files_found = []
    for pattern in ['*.ts', '*.tsx', '*.js', '*.jsx']:
        files_found.extend(records_dir.rglob(pattern))
    print(f"Found {len(files_found)} files matching pattern")
    
    for file_path in files_found:
        if file_path.is_file():
            print(f"Processing: {file_path}")
            imports = extract_imports_from_file(file_path)
            all_imports.extend(imports)
            file_imports[str(file_path)] = imports
    
    # Analyze imports
    import_categories = defaultdict(list)
    module_usage = Counter()
    shared_modules = set()
    records_specific_modules = set()
    external_modules = set()
    
    for import_info in all_imports:
        module = import_info['module']
        category = categorize_import(module)
        import_categories[category].append(import_info)
        module_usage[module] += 1
        
        if category == 'shared':
            shared_modules.add(module)
        elif category == 'records_specific':
            records_specific_modules.add(module)
        elif category == 'external':
            external_modules.add(module)
    
    # Generate report
    print("=" * 80)
    print("RECORD FILES IMPORT ANALYSIS")
    print("=" * 80)
    print(f"Total files analyzed: {len(file_imports)}")
    print(f"Total imports found: {len(all_imports)}")
    print()
    
    print("IMPORT CATEGORIES:")
    print("-" * 40)
    for category, imports in import_categories.items():
        print(f"{category.upper()}: {len(imports)} imports")
    print()
    
    print("EXTERNAL DEPENDENCIES:")
    print("-" * 40)
    for module in sorted(external_modules):
        count = module_usage[module]
        print(f"  {module} ({count} usages)")
    print()
    
    print("SHARED MODULES (used across app):")
    print("-" * 40)
    for module in sorted(shared_modules):
        count = module_usage[module]
        print(f"  {module} ({count} usages)")
    print()
    
    print("RECORDS-SPECIFIC MODULES:")
    print("-" * 40)
    for module in sorted(records_specific_modules):
        count = module_usage[module]
        print(f"  {module} ({count} usages)")
    print()
    
    print("MOST FREQUENTLY USED MODULES:")
    print("-" * 40)
    for module, count in module_usage.most_common(20):
        category = categorize_import(module)
        print(f"  {module} ({count} usages) - {category}")
    print()
    
    print("DETAILED FILE ANALYSIS:")
    print("-" * 40)
    for file_path, imports in file_imports.items():
        if imports:
            print(f"\n{file_path}:")
            for imp in imports:
                category = categorize_import(imp['module'])
                print(f"  {imp['type']}: {imp['module']} - {category}")

if __name__ == "__main__":
    analyze_record_files()
