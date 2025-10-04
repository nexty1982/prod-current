#!/usr/bin/env python3
"""
Fix common TypeScript errors in the Modernize migration
"""

import os
import re
import argparse
from pathlib import Path

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Fix common TypeScript errors')
    parser.add_argument('--root', type=str, default='/var/www/orthodoxmetrics/prod/UI/modernize/frontend',
                       help='Modernize root directory')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be fixed without making changes')
    return parser.parse_args()

def fix_implicit_any_types(file_path, content, dry_run=False):
    """Fix parameters with implicit 'any' type"""
    fixes = 0
    original_content = content
    
    # Common patterns for implicit any
    patterns = [
        # Arrow functions with single parameter
        (r'(\w+)\s*=>\s*{', r'(\1: any) => {'),
        # Function parameters in callbacks
        (r'\.map\((\w+)\s*=>', r'.map((\1: any) =>'),
        (r'\.filter\((\w+)\s*=>', r'.filter((\1: any) =>'),
        (r'\.forEach\((\w+)\s*=>', r'.forEach((\1: any) =>'),
        (r'\.reduce\(\((\w+),\s*(\w+)\)\s*=>', r'.reduce(((\1: any, \2: any) =>'),
        # onChange, onClick handlers
        (r'onChange=\{(\w+)\s*=>', r'onChange={(e: any) =>'),
        (r'onClick=\{(\w+)\s*=>', r'onClick={(e: any) =>'),
        # Destructured parameters in functions
        (r'function\s+\w+\s*\(\s*\{\s*(\w+)\s*\}\s*\)', r'function \1({ \1 }: any)'),
        # Theme parameter
        (r'\(\s*theme\s*\)\s*=>', r'(theme: any) =>'),
        (r'\(\s*\{\s*theme\s*\}\s*\)', r'({ theme }: any)'),
    ]
    
    for pattern, replacement in patterns:
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            fixes += len(re.findall(pattern, content))
            content = new_content
    
    if fixes > 0 and not dry_run:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    return fixes

def fix_import_paths(file_path, content, dry_run=False):
    """Fix common import path issues"""
    fixes = 0
    
    # Get relative path for context
    relative_path = Path(file_path).relative_to(Path(file_path).parent.parent.parent)
    
    # Fix patterns
    replacements = [
        # Fix double slashes in imports
        (r'from\s+[\'"]\.\.//([^\'\"]+)[\'"]', r'from "../\1"'),
        (r'from\s+[\'"]\.//([^\'\"]+)[\'"]', r'from "./\1"'),
        # Fix missing @ alias
        (r'from\s+[\'"]src/([^\'\"]+)[\'"]', r'from "@/\1"'),
        # Fix @om imports
        (r'from\s+[\'\"]/@om/([^\'\"]+)[\'"]', r'from "@om/\1"'),
        # Fix triple parent directory access
        (r'from\s+[\'"]\.\./(\.\./(\.\./))+', r'from "@/'),
    ]
    
    for pattern, replacement in replacements:
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            fixes += len(re.findall(pattern, content))
            content = new_content
    
    if fixes > 0 and not dry_run:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    return fixes

def add_missing_type_imports(file_path, content, dry_run=False):
    """Add missing type imports for common types"""
    fixes = 0
    
    # Check if React types are used but not imported
    if 'React.FC' in content or 'React.ReactNode' in content or 'React.MouseEvent' in content:
        if 'import React' not in content and 'import * as React' not in content:
            content = 'import React from "react";\n' + content
            fixes += 1
    
    # Check for common type usage without imports
    type_patterns = [
        ('ChangeEvent', 'import { ChangeEvent } from "react";'),
        ('FormEvent', 'import { FormEvent } from "react";'),
        ('MouseEvent', 'import { MouseEvent } from "react";'),
        ('ReactNode', 'import { ReactNode } from "react";'),
        ('FC', 'import { FC } from "react";'),
    ]
    
    for type_name, import_statement in type_patterns:
        if type_name in content and import_statement not in content:
            # Add import at the beginning after other imports
            import_match = re.search(r'((?:import.*\n)+)', content)
            if import_match:
                insert_pos = import_match.end()
                content = content[:insert_pos] + import_statement + '\n' + content[insert_pos:]
            else:
                content = import_statement + '\n' + content
            fixes += 1
    
    if fixes > 0 and not dry_run:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    return fixes

def remove_unused_imports(file_path, content, dry_run=False):
    """Remove unused imports (conservative approach)"""
    fixes = 0
    
    # Find all imports
    import_pattern = r'import\s+(?:\{[^}]+\}|[\w\s,*]+)\s+from\s+[\'"][^\'"]+[\'"];?\n'
    imports = re.findall(import_pattern, content)
    
    for import_line in imports:
        # Extract imported names
        match = re.search(r'import\s+\{([^}]+)\}\s+from', import_line)
        if match:
            imported_names = [name.strip() for name in match.group(1).split(',')]
            unused = []
            
            for name in imported_names:
                # Check if the name is used in the file (excluding the import line)
                content_without_import = content.replace(import_line, '')
                if name not in content_without_import:
                    unused.append(name)
            
            # Remove unused imports
            if unused and len(unused) == len(imported_names):
                # Remove entire import line
                content = content.replace(import_line, '')
                fixes += 1
            elif unused:
                # Remove specific unused imports
                for name in unused:
                    import_line = re.sub(rf'\b{name}\b,?\s*', '', import_line)
                    import_line = re.sub(r',\s*}', ' }', import_line)  # Fix trailing comma
                    import_line = re.sub(r'{\s*,', '{ ', import_line)  # Fix leading comma
                content = content.replace(imports[imports.index(import_line)], import_line)
                fixes += len(unused)
    
    if fixes > 0 and not dry_run:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    return fixes

def main():
    """Main function"""
    args = parse_args()
    
    print(f'🔧 Fixing common TypeScript errors{"[DRY RUN]" if args.dry_run else ""}...')
    
    src_path = Path(args.root) / 'src'
    
    total_fixes = {
        'implicit_any': 0,
        'import_paths': 0,
        'type_imports': 0,
        'unused_imports': 0,
        'files_processed': 0
    }
    
    for root, dirs, files in os.walk(src_path):
        if 'node_modules' in root:
            continue
            
        for file in files:
            if file.endswith(('.tsx', '.ts')) and not file.endswith('.d.ts'):
                file_path = Path(root) / file
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    file_fixes = 0
                    
                    # Apply fixes
                    any_fixes = fix_implicit_any_types(file_path, content, args.dry_run)
                    if any_fixes > 0:
                        total_fixes['implicit_any'] += any_fixes
                        file_fixes += any_fixes
                        # Re-read content if changes were made
                        if not args.dry_run:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                    
                    path_fixes = fix_import_paths(file_path, content, args.dry_run)
                    if path_fixes > 0:
                        total_fixes['import_paths'] += path_fixes
                        file_fixes += path_fixes
                        if not args.dry_run:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                    
                    type_fixes = add_missing_type_imports(file_path, content, args.dry_run)
                    if type_fixes > 0:
                        total_fixes['type_imports'] += type_fixes
                        file_fixes += type_fixes
                        if not args.dry_run:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                    
                    # Skip unused import removal for now - it's risky
                    # unused_fixes = remove_unused_imports(file_path, content, args.dry_run)
                    # total_fixes['unused_imports'] += unused_fixes
                    # file_fixes += unused_fixes
                    
                    if file_fixes > 0:
                        total_fixes['files_processed'] += 1
                        print(f'  ✅ Fixed {file_fixes} issues in {file_path.relative_to(src_path)}')
                        
                except Exception as e:
                    print(f'  ⚠️  Error processing {file_path}: {e}')
    
    print(f'\n📊 Summary:')
    print(f'  Files processed: {total_fixes["files_processed"]}')
    print(f'  Implicit any fixes: {total_fixes["implicit_any"]}')
    print(f'  Import path fixes: {total_fixes["import_paths"]}')
    print(f'  Type import fixes: {total_fixes["type_imports"]}')
    # print(f'  Unused import fixes: {total_fixes["unused_imports"]}')
    
    print(f'\n{"[DRY RUN] No changes made" if args.dry_run else "✅ Fixes applied"}')

if __name__ == "__main__":
    main()
