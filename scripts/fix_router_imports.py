#!/usr/bin/env python3
"""
Script to fix missing components referenced in Router.tsx
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
            print(f'  ❌ Missing: {import_path}')
        else:
            print(f'  ✅ Found: {import_path}')
    
    print(f'\n📊 Missing components: {len(missing_components)}')
    
    # Try to find and restore missing components
    for missing_import in missing_components:
        print(f'\n🔍 Looking for: {missing_import}')
        
        # Extract component name from path
        component_name = Path(missing_import).stem
        
        # Search for the component in features directories
        found_files = list(frontend_path.glob(f'**/{component_name}*'))
        
        if found_files:
            # Find the most recent file
            latest_file = max(found_files, key=lambda x: x.stat().st_mtime)
            print(f'  📁 Found in: {latest_file.relative_to(frontend_path)}')
            
            # Create target directory
            target_path = frontend_path / missing_import
            target_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Copy the file
            shutil.copy2(latest_file, target_path)
            print(f'  ✅ Restored: {missing_import}')
        else:
            print(f'  ❌ Not found: {component_name}')
    
    print('\n🎉 Router import fixes complete!')

if __name__ == "__main__":
    fix_router_imports()
