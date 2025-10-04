#!/usr/bin/env python3
"""
Script to fix missing components referenced in Router.tsx (fixed version)
"""

import os
import shutil
from pathlib import Path
import re

def fix_router_imports():
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔧 Fixing Router import issues...')
    
    # Read the Router.tsx file to find all imports
    router_file = frontend_path / 'routes/Router.tsx'
    if not router_file.exists():
        print('❌ Router.tsx not found')
        return
    
    with open(router_file, 'r') as f:
        content = f.read()
    
    # Find all import statements
    import_pattern = r'import\(["\']([^"\']+)["\']\)'
    imports = re.findall(import_pattern, content)
    
    print(f'📋 Found {len(imports)} dynamic imports in Router.tsx')
    
    missing_components = []
    
    for import_path in imports:
        # Convert relative path to absolute path
        if import_path.startswith('../'):
            full_path = frontend_path / import_path[3:]  # Remove ../
        elif import_path.startswith('./'):
            full_path = frontend_path / import_path[2:]  # Remove ./
        else:
            full_path = frontend_path / import_path
        
        # Check if file exists
        if not full_path.exists():
            missing_components.append(import_path)
        else:
            print(f'  ✅ Found: {import_path}')
    
    print(f'\n📊 Missing components: {len(missing_components)}')
    
    # Try to find and restore missing components
    restored_count = 0
    for missing_import in missing_components:
        print(f'\n🔍 Looking for: {missing_import}')
        
        # Extract component name from path
        component_name = Path(missing_import).stem
        
        # Search for the component in features directories
        found_files = list(frontend_path.glob(f'**/{component_name}*'))
        
        if found_files:
            # Find the most recent file (and ensure it's a file, not directory)
            file_candidates = [f for f in found_files if f.is_file()]
            if file_candidates:
                latest_file = max(file_candidates, key=lambda x: x.stat().st_mtime)
                print(f'  📁 Found in: {latest_file.relative_to(frontend_path)}')
                
                # Create target directory
                target_path = frontend_path / missing_import
                target_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Copy the file
                try:
                    shutil.copy2(latest_file, target_path)
                    print(f'  ✅ Restored: {missing_import}')
                    restored_count += 1
                except Exception as e:
                    print(f'  ❌ Error copying: {e}')
            else:
                print(f'  ❌ No file found: {component_name}')
        else:
            print(f'  ❌ Not found: {component_name}')
    
    print(f'\n🎉 Router import fixes complete!')
    print(f'📊 Restored: {restored_count} components')

if __name__ == "__main__":
    fix_router_imports()
