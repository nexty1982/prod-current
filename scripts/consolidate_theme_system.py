#!/usr/bin/env python3
"""
Consolidate theme system from scattered theme files
"""

import os
import shutil
from pathlib import Path
from collections import defaultdict
import re

def find_theme_files():
    """Find all theme-related files across the frontend"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Finding all theme-related files...')
    
    theme_files = []
    
    # Search for theme files in various locations
    search_patterns = [
        '**/*theme*',
        '**/*Theme*',
        '**/styles/*theme*',
        '**/styles/*Theme*'
    ]
    
    for pattern in search_patterns:
        for file_path in frontend_path.glob(pattern):
            if file_path.is_file() and not file_path.name.endswith('.backup'):
                relative_path = file_path.relative_to(frontend_path)
                theme_files.append({
                    'name': file_path.name,
                    'path': str(relative_path),
                    'full_path': str(file_path),
                    'size': file_path.stat().st_size if file_path.exists() else 0,
                    'type': categorize_theme_file(file_path)
                })
    
    return theme_files

def categorize_theme_file(file_path):
    """Categorize theme file by type"""
    name = file_path.name.lower()
    path = str(file_path).lower()
    
    if 'provider' in name or 'provider' in path:
        return 'provider'
    elif 'toggle' in name or 'toggle' in path:
        return 'toggle'
    elif 'customizer' in name or 'customizer' in path:
        return 'customizer'
    elif 'settings' in name or 'settings' in path:
        return 'settings'
    elif 'context' in name or 'context' in path:
        return 'context'
    elif 'orthodox' in name or 'orthodox' in path:
        return 'orthodox'
    elif 'material' in name or 'material' in path:
        return 'material'
    elif 'ag-grid' in name or 'ag-grid' in path:
        return 'ag-grid'
    elif 'table' in name or 'table' in path:
        return 'table'
    elif 'mobile' in name or 'mobile' in path:
        return 'mobile'
    elif name.endswith('.css'):
        return 'css'
    elif name.endswith(('.tsx', '.ts')):
        return 'component'
    else:
        return 'other'

def create_theme_consolidated_structure():
    """Create consolidated theme structure"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    theme_path = frontend_path / 'themes-consolidated'
    
    print('📁 Creating consolidated theme structure...')
    
    # Create directory structure
    directories = [
        'components',
        'components/ThemeProvider',
        'components/ThemeToggle',
        'components/ThemeCustomizer',
        'components/ThemeSettings',
        'styles',
        'styles/orthodox',
        'styles/material',
        'styles/ag-grid',
        'styles/tables',
        'styles/mobile',
        'styles/custom',
        'context',
        'hooks',
        'utils',
        'types',
        'constants'
    ]
    
    for directory in directories:
        dir_path = theme_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f'  ✅ Created: {directory}')
    
    return theme_path

def consolidate_theme_files(theme_files, theme_path):
    """Consolidate theme files into the new structure"""
    print('🔄 Consolidating theme files...')
    
    results = {
        'moved_files': [],
        'backup_files': [],
        'errors': [],
        'consolidated': []
    }
    
    for file_info in theme_files:
        source_path = Path(file_info['full_path'])
        relative_path = file_info['path']
        file_type = file_info['type']
        
        # Determine target directory based on file type
        target_dir = determine_theme_target_directory(file_type, theme_path)
        
        # Create target file path
        target_path = target_dir / source_path.name
        
        if source_path.exists():
            try:
                # Create backup
                backup_path = source_path.with_suffix(source_path.suffix + '.theme_consolidated_backup')
                shutil.copy2(source_path, backup_path)
                
                # Move file
                shutil.move(str(source_path), str(target_path))
                
                results['moved_files'].append({
                    'source': relative_path,
                    'target': str(target_path.relative_to(theme_path.parent)),
                    'backup': str(backup_path),
                    'type': file_type
                })
                
                print(f'  ✅ Moved: {relative_path} -> {target_path.relative_to(theme_path.parent)}')
                
            except Exception as e:
                error_msg = f'Error moving {relative_path}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
    
    return results

def determine_theme_target_directory(file_type, theme_path):
    """Determine target directory based on file type"""
    if file_type == 'provider':
        return theme_path / 'components' / 'ThemeProvider'
    elif file_type == 'toggle':
        return theme_path / 'components' / 'ThemeToggle'
    elif file_type == 'customizer':
        return theme_path / 'components' / 'ThemeCustomizer'
    elif file_type == 'settings':
        return theme_path / 'components' / 'ThemeSettings'
    elif file_type == 'context':
        return theme_path / 'context'
    elif file_type == 'orthodox':
        return theme_path / 'styles' / 'orthodox'
    elif file_type == 'material':
        return theme_path / 'styles' / 'material'
    elif file_type == 'ag-grid':
        return theme_path / 'styles' / 'ag-grid'
    elif file_type == 'table':
        return theme_path / 'styles' / 'tables'
    elif file_type == 'mobile':
        return theme_path / 'styles' / 'mobile'
    elif file_type == 'css':
        return theme_path / 'styles' / 'custom'
    elif file_type == 'component':
        return theme_path / 'components'
    else:
        return theme_path / 'utils'

def create_theme_index_files(theme_path):
    """Create index files for the consolidated theme structure"""
    print('📦 Creating theme index files...')
    
    # Main index file
    main_index = '''// Themes Consolidated - Main Export
export * from './components';
export * from './styles';
export * from './context';
export * from './hooks';
export * from './utils';
export * from './types';
export * from './constants';
'''
    
    with open(theme_path / 'index.ts', 'w') as f:
        f.write(main_index)
    
    # Components index
    components_index = '''// Theme Components
export * from './ThemeProvider';
export * from './ThemeToggle';
export * from './ThemeCustomizer';
export * from './ThemeSettings';
'''
    
    with open(theme_path / 'components' / 'index.ts', 'w') as f:
        f.write(components_index)
    
    # Styles index
    styles_index = '''// Theme Styles
export * from './orthodox';
export * from './material';
export * from './ag-grid';
export * from './tables';
export * from './mobile';
export * from './custom';
'''
    
    with open(theme_path / 'styles' / 'index.ts', 'w') as f:
        f.write(styles_index)
    
    print('  ✅ Created index files')

def generate_theme_consolidation_report(theme_files, results):
    """Generate theme consolidation report"""
    print('📊 Generating theme consolidation report...')
    
    # Group files by type
    files_by_type = defaultdict(list)
    for file_info in theme_files:
        files_by_type[file_info['type']].append(file_info)
    
    report_content = f'''# Theme System Consolidation Report

## Overview
This report documents the consolidation of the theme system from scattered theme files across the frontend.

## Summary Statistics
- **Total Theme Files Found**: {len(theme_files)}
- **Files Moved**: {len(results['moved_files'])}
- **Backup Files Created**: {len(results['backup_files'])}
- **Errors**: {len(results['errors'])}

## Theme Files by Type

'''
    
    for file_type, files in files_by_type.items():
        report_content += f'''### {file_type.title()} Files ({len(files)})
'''
        for file_info in files:
            report_content += f'- **{file_info["name"]}** - `{file_info["path"]}` ({file_info["size"]} bytes)\n'
        report_content += '\n'
    
    # Moved Files
    report_content += f'''
## Moved Files

'''
    for move in results['moved_files']:
        report_content += f'- **{move["source"]}** -> `{move["target"]}` (Type: {move["type"]})\n'
    
    if results['errors']:
        report_content += f'''
## Errors

'''
        for error in results['errors']:
            report_content += f'- {error}\n'
    
    report_content += f'''
## New Theme Structure

```
themes-consolidated/
├── components/
│   ├── ThemeProvider/
│   ├── ThemeToggle/
│   ├── ThemeCustomizer/
│   ├── ThemeSettings/
│   └── index.ts
├── styles/
│   ├── orthodox/
│   ├── material/
│   ├── ag-grid/
│   ├── tables/
│   ├── mobile/
│   ├── custom/
│   └── index.ts
├── context/
├── hooks/
├── utils/
├── types/
├── constants/
└── index.ts
```

## Next Steps

1. **Update Import Statements**: Fix all imports to use new theme paths
2. **Test Theme Functionality**: Ensure all themes work correctly
3. **Remove Old Theme Directories**: Clean up empty theme directories
4. **Update Documentation**: Update any theme-related documentation
5. **Test Application**: Ensure no regressions after theme consolidation

## Recommendations

### Theme System Improvements
1. **Centralize Theme Management**: Use a single theme provider
2. **Implement Theme Registry**: Create a registry for all available themes
3. **Add Theme Switching**: Implement dynamic theme switching
4. **Optimize CSS**: Minimize and optimize theme styles
5. **Create Theme Documentation**: Document all available themes and their usage
'''
    
    with open('/var/www/orthodoxmetrics/prod/front-end/THEME_CONSOLIDATION_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated theme consolidation report: THEME_CONSOLIDATION_REPORT.md')

def cleanup_old_theme_directories():
    """Clean up old theme directories"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('�� Cleaning up old theme directories...')
    
    old_dirs = ['theme', 'theme2']
    cleaned_dirs = []
    
    for dir_name in old_dirs:
        dir_path = frontend_path / dir_name
        if dir_path.exists():
            # Check if directory only contains backup files
            files = list(dir_path.iterdir())
            backup_files = [f for f in files if f.name.endswith('.backup')]
            
            if len(files) == len(backup_files):
                print(f'  🗑️  Removing {dir_name}/ (only contains backup files)')
                shutil.rmtree(dir_path)
                cleaned_dirs.append(dir_name)
            else:
                print(f'  ⚠️  Keeping {dir_name}/ (contains non-backup files)')
    
    return cleaned_dirs

def main():
    """Main function"""
    print('🚀 Starting theme system consolidation...')
    
    # Step 1: Find all theme files
    theme_files = find_theme_files()
    
    # Step 2: Create consolidated theme structure
    theme_path = create_theme_consolidated_structure()
    
    # Step 3: Consolidate theme files
    results = consolidate_theme_files(theme_files, theme_path)
    
    # Step 4: Create index files
    create_theme_index_files(theme_path)
    
    # Step 5: Clean up old directories
    cleaned_dirs = cleanup_old_theme_directories()
    
    # Step 6: Generate report
    generate_theme_consolidation_report(theme_files, results)
    
    print(f'\n🎉 Theme system consolidation complete!')
    print(f'📊 Summary:')
    print(f'  Theme files found: {len(theme_files)}')
    print(f'  Files moved: {len(results["moved_files"])}')
    print(f'  Backup files created: {len(results["backup_files"])}')
    print(f'  Errors: {len(results["errors"])}')
    print(f'  Directories cleaned: {len(cleaned_dirs)}')
    print(f'  Report: THEME_CONSOLIDATION_REPORT.md')
    
    return theme_files, results

if __name__ == "__main__":
    result = main()
