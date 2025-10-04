#!/usr/bin/env python3
"""
Comprehensive script to fix all export/import mismatches
This script will find and fix all default vs named export issues
"""

import os
import re
from pathlib import Path

def find_import_statements():
    """Find all import statements in the codebase"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    imports = []
    
    for root, dirs, files in os.walk(frontend_path):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                file_path = Path(root) / file
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Find import statements
                    import_patterns = [
                        r'import\s+(\w+)\s+from\s+["\']([^"\']+)["\']',  # default imports
                        r'import\s*{\s*([^}]+)\s*}\s+from\s+["\']([^"\']+)["\']',  # named imports
                    ]
                    
                    for pattern in import_patterns:
                        matches = re.findall(pattern, content)
                        for match in matches:
                            if isinstance(match, tuple):
                                imports.append({
                                    'file': str(file_path.relative_to(frontend_path)),
                                    'import_type': 'default' if len(match) == 2 and not match[0].startswith('{') else 'named',
                                    'import_name': match[0],
                                    'import_path': match[1],
                                    'line': content[:content.find(match[0])].count('\n') + 1
                                })
                except Exception as e:
                    print(f'Error reading {file_path}: {e}')
    
    return imports

def check_export_compatibility(import_path, import_name, import_type):
    """Check if the import path has compatible exports"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    # Convert relative path to absolute
    if import_path.startswith('../'):
        full_path = frontend_path / import_path[3:]
    elif import_path.startswith('./'):
        full_path = frontend_path / import_path[2:]
    else:
        full_path = frontend_path / import_path
    
    if not full_path.exists():
        return False, "File not found"
    
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for default export
        has_default_export = bool(re.search(r'export\s+default', content))
        
        # Check for named export
        named_export_pattern = rf'export\s+(?:const|function|class|interface|type)\s+{import_name}'
        has_named_export = bool(re.search(named_export_pattern, content))
        
        # Check for named export in export statement
        export_statement_pattern = rf'export\s*{{\s*[^}}]*{import_name}[^}}]*\s*}}'
        has_named_export_statement = bool(re.search(export_statement_pattern, content))
        
        has_named_export = has_named_export or has_named_export_statement
        
        if import_type == 'default' and not has_default_export and has_named_export:
            return False, f"Missing default export, has named export for {import_name}"
        elif import_type == 'named' and not has_named_export and has_default_export:
            return False, f"Missing named export, has default export for {import_name}"
        elif not has_default_export and not has_named_export:
            return False, f"No exports found for {import_name}"
        
        return True, "Compatible"
        
    except Exception as e:
        return False, f"Error reading file: {e}"

def fix_export_issues():
    """Fix all export/import mismatches"""
    print('🔧 Starting export/import mismatch fixing...')
    
    imports = find_import_statements()
    print(f'📋 Found {len(imports)} import statements')
    
    issues_found = 0
    issues_fixed = 0
    
    for imp in imports:
        if imp['import_type'] == 'default':
            is_compatible, error_msg = check_export_compatibility(
                imp['import_path'], imp['import_name'], imp['import_type']
            )
            
            if not is_compatible and "Missing default export" in error_msg:
                issues_found += 1
                print(f'  ❌ Issue in {imp["file"]}:{imp["line"]} - {error_msg}')
                
                # Try to fix by adding default export
                try:
                    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
                    if imp['import_path'].startswith('../'):
                        full_path = frontend_path / imp['import_path'][3:]
                    elif imp['import_path'].startswith('./'):
                        full_path = frontend_path / imp['import_path'][2:]
                    else:
                        full_path = frontend_path / imp['import_path']
                    
                    if full_path.exists():
                        # Add default export
                        with open(full_path, 'a', encoding='utf-8') as f:
                            f.write(f'\nexport default {imp["import_name"]};\n')
                        print(f'  ✅ Fixed: Added default export to {full_path.name}')
                        issues_fixed += 1
                except Exception as e:
                    print(f'  ❌ Error fixing {imp["file"]}: {e}')
    
    print(f'\n📊 EXPORT/IMPORT FIX SUMMARY:')
    print(f'  Issues found: {issues_found}')
    print(f'  Issues fixed: {issues_fixed}')
    print(f'  Success rate: {(issues_fixed/issues_found*100):.1f}%' if issues_found > 0 else '100%')

if __name__ == "__main__":
    print('🚀 EXPORT/IMPORT MISMATCH FIXER')
    print('=' * 50)
    fix_export_issues()
    print('\n🎉 Export/Import mismatch fixing complete!')
