#!/usr/bin/env python3
"""
Consolidate authentication components into features/auth-centralized/
"""

import os
import shutil
from pathlib import Path
import re

def identify_auth_components():
    """Identify all authentication-related components"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Identifying authentication components...')
    
    auth_components = []
    auth_patterns = ['auth', 'login', 'register', 'signup', 'signin', 'logout', 'password', 'reset', 'forgot', 'user', 'profile', 'account', 'session', 'token', 'jwt']
    
    # Walk through all files
    for root, dirs, files in os.walk(frontend_path):
        if 'node_modules' in root or '.git' in root or 'backup' in root:
            continue
            
        relative_path = Path(root).relative_to(frontend_path)
        
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx')):
                file_path = relative_path / file
                file_str = str(file_path)
                file_name = file_path.stem
                
                # Check if it's an auth component
                is_auth_component = False
                for pattern in auth_patterns:
                    if pattern.lower() in file_name.lower() or pattern.lower() in str(relative_path).lower():
                        is_auth_component = True
                        break
                
                if is_auth_component:
                    auth_components.append({
                        'path': file_str,
                        'name': file_name,
                        'full_path': frontend_path / file_path,
                        'category': 'auth'
                    })
    
    return auth_components

def create_auth_centralized_structure():
    """Create the auth-centralized directory structure"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    auth_path = frontend_path / 'features' / 'auth-centralized'
    
    print('📁 Creating auth-centralized structure...')
    
    # Create directory structure
    directories = [
        'components',
        'components/login',
        'components/register',
        'components/password',
        'components/profile',
        'components/session',
        'components/guards',
        'hooks',
        'services',
        'types',
        'utils',
        'constants',
        'styles'
    ]
    
    for directory in directories:
        dir_path = auth_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f'  ✅ Created: {directory}')
    
    return auth_path

def categorize_auth_components(auth_components):
    """Categorize auth components by type"""
    print('📋 Categorizing auth components...')
    
    categories = {
        'login': [],
        'register': [],
        'password': [],
        'profile': [],
        'session': [],
        'guards': [],
        'other': []
    }
    
    for comp in auth_components:
        name = comp['name'].lower()
        path = comp['path'].lower()
        
        if 'login' in name or 'signin' in name or 'login' in path or 'signin' in path:
            categories['login'].append(comp)
        elif 'register' in name or 'signup' in name or 'register' in path or 'signup' in path:
            categories['register'].append(comp)
        elif 'password' in name or 'reset' in name or 'forgot' in name or 'password' in path or 'reset' in path or 'forgot' in path:
            categories['password'].append(comp)
        elif 'profile' in name or 'account' in name or 'profile' in path or 'account' in path:
            categories['profile'].append(comp)
        elif 'session' in name or 'token' in name or 'jwt' in name or 'session' in path or 'token' in path or 'jwt' in path:
            categories['session'].append(comp)
        elif 'guard' in name or 'guard' in path:
            categories['guards'].append(comp)
        else:
            categories['other'].append(comp)
    
    return categories

def move_auth_components(auth_components, auth_path):
    """Move auth components to auth-centralized"""
    print('🔄 Moving auth components...')
    
    results = {
        'moved_files': [],
        'backup_files': [],
        'errors': []
    }
    
    for comp in auth_components:
        source_path = comp['full_path']
        relative_path = comp['path']
        
        # Determine target directory based on component type
        if 'login' in comp['name'].lower() or 'signin' in comp['name'].lower():
            target_dir = auth_path / 'components' / 'login'
        elif 'register' in comp['name'].lower() or 'signup' in comp['name'].lower():
            target_dir = auth_path / 'components' / 'register'
        elif 'password' in comp['name'].lower() or 'reset' in comp['name'].lower() or 'forgot' in comp['name'].lower():
            target_dir = auth_path / 'components' / 'password'
        elif 'profile' in comp['name'].lower() or 'account' in comp['name'].lower():
            target_dir = auth_path / 'components' / 'profile'
        elif 'session' in comp['name'].lower() or 'token' in comp['name'].lower() or 'jwt' in comp['name'].lower():
            target_dir = auth_path / 'components' / 'session'
        elif 'guard' in comp['name'].lower():
            target_dir = auth_path / 'components' / 'guards'
        else:
            target_dir = auth_path / 'components'
        
        # Create target directory
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Create target file path
        target_path = target_dir / source_path.name
        
        if source_path.exists():
            try:
                # Create backup
                backup_path = source_path.with_suffix(source_path.suffix + '.auth_backup')
                shutil.copy2(source_path, backup_path)
                
                # Move file
                shutil.move(str(source_path), str(target_path))
                
                results['moved_files'].append({
                    'source': str(relative_path),
                    'target': str(target_path.relative_to(auth_path.parent)),
                    'backup': str(backup_path)
                })
                
                print(f'  ✅ Moved: {relative_path} -> {target_path.relative_to(auth_path.parent)}')
                
            except Exception as e:
                error_msg = f'Error moving {relative_path}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
        else:
            print(f'  ⚠️  File not found: {relative_path}')
    
    return results

def create_auth_index_files(auth_path):
    """Create index files for auth-centralized"""
    print('📦 Creating index files...')
    
    # Main index file
    main_index = '''// Auth Centralized - Main Export
export * from './components';
export * from './hooks';
export * from './services';
export * from './types';
export * from './utils';
export * from './constants';
'''
    
    with open(auth_path / 'index.ts', 'w') as f:
        f.write(main_index)
    
    # Components index
    components_index = '''// Auth Components
export * from './login';
export * from './register';
export * from './password';
export * from './profile';
export * from './session';
export * from './guards';
'''
    
    with open(auth_path / 'components' / 'index.ts', 'w') as f:
        f.write(components_index)
    
    # Create individual category index files
    categories = ['login', 'register', 'password', 'profile', 'session', 'guards']
    
    for category in categories:
        category_index = f'''// {category.title()} Components
// Auto-generated exports will be added here
'''
        
        with open(auth_path / 'components' / category / 'index.ts', 'w') as f:
            f.write(category_index)
    
    print('  ✅ Created index files')

def generate_auth_report(auth_components, categories, results):
    """Generate an auth consolidation report"""
    print('📊 Generating auth consolidation report...')
    
    report_content = f'''# Auth Centralization Report

## Overview
This report documents the consolidation of authentication components into `features/auth-centralized/`.

## Summary
- **Total Auth Components**: {len(auth_components)}
- **Components Moved**: {len(results['moved_files'])}
- **Backup Files Created**: {len(results['backup_files'])}
- **Errors**: {len(results['errors'])}

## Component Categories

### Login Components ({len(categories['login'])})
'''
    
    for comp in categories['login']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Register Components ({len(categories['register'])})
'''
    
    for comp in categories['register']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Password Components ({len(categories['password'])})
'''
    
    for comp in categories['password']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Profile Components ({len(categories['profile'])})
'''
    
    for comp in categories['profile']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Session Components ({len(categories['session'])})
'''
    
    for comp in categories['session']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Guard Components ({len(categories['guards'])})
'''
    
    for comp in categories['guards']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
### Other Components ({len(categories['other'])})
'''
    
    for comp in categories['other']:
        report_content += f'- **{comp["name"]}** - `{comp["path"]}`\n'
    
    report_content += f'''
## Moved Files

'''
    
    for move in results['moved_files']:
        report_content += f'- **{move["source"]}** -> `{move["target"]}`\n'
    
    if results['errors']:
        report_content += f'''
## Errors

'''
        for error in results['errors']:
            report_content += f'- {error}\n'
    
    report_content += f'''
## Next Steps

1. **Update Import Statements**: Fix all imports to use new paths
2. **Test Functionality**: Ensure all auth components work correctly
3. **Refactor for Template**: Make components template-agnostic
4. **Document Dependencies**: Map all auth dependencies
5. **Prepare for Migration**: Ready for modernize template

## Directory Structure

```
features/auth-centralized/
├── components/
│   ├── login/
│   ├── register/
│   ├── password/
│   ├── profile/
│   ├── session/
│   ├── guards/
│   └── index.ts
├── hooks/
├── services/
├── types/
├── utils/
├── constants/
├── styles/
└── index.ts
```
'''
    
    with open('/var/www/orthodoxmetrics/prod/front-end/AUTH_CONSOLIDATION_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated auth consolidation report: AUTH_CONSOLIDATION_REPORT.md')

def main():
    """Main function"""
    print('🚀 Starting auth consolidation...')
    
    # Step 1: Identify auth components
    auth_components = identify_auth_components()
    
    # Step 2: Create auth-centralized structure
    auth_path = create_auth_centralized_structure()
    
    # Step 3: Categorize components
    categories = categorize_auth_components(auth_components)
    
    # Step 4: Move components
    results = move_auth_components(auth_components, auth_path)
    
    # Step 5: Create index files
    create_auth_index_files(auth_path)
    
    # Step 6: Generate report
    generate_auth_report(auth_components, categories, results)
    
    print(f'\n🎉 Auth consolidation complete!')
    print(f'📊 Summary:')
    print(f'  Auth components identified: {len(auth_components)}')
    print(f'  Components moved: {len(results["moved_files"])}')
    print(f'  Backup files created: {len(results["backup_files"])}')
    print(f'  Errors: {len(results["errors"])}')
    print(f'  Report: AUTH_CONSOLIDATION_REPORT.md')
    
    return {
        'auth_components': auth_components,
        'categories': categories,
        'results': results
    }

if __name__ == "__main__":
    result = main()
