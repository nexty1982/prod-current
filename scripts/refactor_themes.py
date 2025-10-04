#!/usr/bin/env python3
"""
Refactor and consolidate theme directories
"""

import os
import shutil
from pathlib import Path
from collections import defaultdict
import re

def analyze_theme_directories():
    """Analyze theme directories and identify duplicates"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    themes_path = frontend_path / 'themes'
    themes2_path = frontend_path / 'themes2'
    
    print('🔍 Analyzing theme directories...')
    
    analysis = {
        'themes': {'path': themes_path, 'files': [], 'exists': themes_path.exists()},
        'themes2': {'path': themes2_path, 'files': [], 'exists': themes2_path.exists()},
        'duplicates': [],
        'conflicts': [],
        'recommendations': []
    }
    
    # Analyze themes directory
    if themes_path.exists():
        print(f'  📁 Analyzing {themes_path.relative_to(frontend_path)}...')
        for root, dirs, files in os.walk(themes_path):
            for file in files:
                if file.endswith(('.tsx', '.ts', '.js', '.jsx', '.css', '.scss', '.sass')):
                    file_path = Path(root) / file
                    relative_path = file_path.relative_to(frontend_path)
                    analysis['themes']['files'].append({
                        'name': file,
                        'path': str(relative_path),
                        'full_path': str(file_path),
                        'size': file_path.stat().st_size if file_path.exists() else 0
                    })
    
    # Analyze themes2 directory
    if themes2_path.exists():
        print(f'  📁 Analyzing {themes2_path.relative_to(frontend_path)}...')
        for root, dirs, files in os.walk(themes2_path):
            for file in files:
                if file.endswith(('.tsx', '.ts', '.js', '.jsx', '.css', '.scss', '.sass')):
                    file_path = Path(root) / file
                    relative_path = file_path.relative_to(frontend_path)
                    analysis['themes2']['files'].append({
                        'name': file,
                        'path': str(relative_path),
                        'full_path': str(file_path),
                        'size': file_path.stat().st_size if file_path.exists() else 0
                    })
    
    # Find duplicates
    all_files = analysis['themes']['files'] + analysis['themes2']['files']
    file_names = defaultdict(list)
    
    for file_info in all_files:
        file_names[file_info['name']].append(file_info)
    
    for name, files in file_names.items():
        if len(files) > 1:
            analysis['duplicates'].append({
                'name': name,
                'files': files,
                'count': len(files)
            })
    
    return analysis

def create_consolidated_theme_structure():
    """Create a consolidated theme structure"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    consolidated_theme_path = frontend_path / 'themes-consolidated'
    
    print('📁 Creating consolidated theme structure...')
    
    # Create directory structure
    directories = [
        'components',
        'components/ThemeProvider',
        'components/ThemeToggle',
        'components/ThemeCustomizer',
        'styles',
        'styles/orthodox',
        'styles/material',
        'styles/custom',
        'styles/legacy',
        'utils',
        'hooks',
        'types',
        'constants',
        'templates'
    ]
    
    for directory in directories:
        dir_path = consolidated_theme_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f'  ✅ Created: {directory}')
    
    return consolidated_theme_path

def consolidate_theme_files(analysis, consolidated_theme_path):
    """Consolidate theme files into the new structure"""
    print('🔄 Consolidating theme files...')
    
    results = {
        'moved_files': [],
        'backup_files': [],
        'errors': [],
        'consolidated': []
    }
    
    # Process themes directory
    for file_info in analysis['themes']['files']:
        source_path = Path(file_info['full_path'])
        relative_path = file_info['path']
        
        # Determine target directory based on file type and name
        target_dir = determine_theme_target_directory(file_info, consolidated_theme_path)
        
        # Create target file path
        target_path = target_dir / source_path.name
        
        if source_path.exists():
            try:
                # Create backup
                backup_path = source_path.with_suffix(source_path.suffix + '.theme_backup')
                shutil.copy2(source_path, backup_path)
                
                # Move file
                shutil.move(str(source_path), str(target_path))
                
                results['moved_files'].append({
                    'source': relative_path,
                    'target': str(target_path.relative_to(consolidated_theme_path.parent)),
                    'backup': str(backup_path)
                })
                
                print(f'  ✅ Moved: {relative_path} -> {target_path.relative_to(consolidated_theme_path.parent)}')
                
            except Exception as e:
                error_msg = f'Error moving {relative_path}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
    
    # Process themes2 directory
    for file_info in analysis['themes2']['files']:
        source_path = Path(file_info['full_path'])
        relative_path = file_info['path']
        
        # Determine target directory based on file type and name
        target_dir = determine_theme_target_directory(file_info, consolidated_theme_path)
        
        # Create target file path
        target_path = target_dir / source_path.name
        
        if source_path.exists():
            try:
                # Create backup
                backup_path = source_path.with_suffix(source_path.suffix + '.theme_backup')
                shutil.copy2(source_path, backup_path)
                
                # Move file
                shutil.move(str(source_path), str(target_path))
                
                results['moved_files'].append({
                    'source': relative_path,
                    'target': str(target_path.relative_to(consolidated_theme_path.parent)),
                    'backup': str(backup_path)
                })
                
                print(f'  ✅ Moved: {relative_path} -> {target_path.relative_to(consolidated_theme_path.parent)}')
                
            except Exception as e:
                error_msg = f'Error moving {relative_path}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
    
    return results

def determine_theme_target_directory(file_info, consolidated_theme_path):
    """Determine the target directory for a theme file"""
    name = file_info['name'].lower()
    path = file_info['path'].lower()
    
    # Component files
    if 'provider' in name or 'provider' in path:
        return consolidated_theme_path / 'components' / 'ThemeProvider'
    elif 'toggle' in name or 'toggle' in path:
        return consolidated_theme_path / 'components' / 'ThemeToggle'
    elif 'customizer' in name or 'customizer' in path:
        return consolidated_theme_path / 'components' / 'ThemeCustomizer'
    elif name.endswith(('.tsx', '.ts', '.js', '.jsx')):
        return consolidated_theme_path / 'components'
    
    # Style files
    elif 'orthodox' in name or 'orthodox' in path:
        return consolidated_theme_path / 'styles' / 'orthodox'
    elif 'material' in name or 'material' in path:
        return consolidated_theme_path / 'styles' / 'material'
    elif 'legacy' in name or 'legacy' in path:
        return consolidated_theme_path / 'styles' / 'legacy'
    elif name.endswith(('.css', '.scss', '.sass')):
        return consolidated_theme_path / 'styles' / 'custom'
    
    # Utility files
    elif 'util' in name or 'util' in path:
        return consolidated_theme_path / 'utils'
    elif 'hook' in name or 'hook' in path:
        return consolidated_theme_path / 'hooks'
    elif 'type' in name or 'type' in path:
        return consolidated_theme_path / 'types'
    elif 'constant' in name or 'constant' in path:
        return consolidated_theme_path / 'constants'
    
    # Default to components
    else:
        return consolidated_theme_path / 'components'

def create_theme_index_files(consolidated_theme_path):
    """Create index files for the consolidated theme structure"""
    print('📦 Creating theme index files...')
    
    # Main index file
    main_index = '''// Themes Consolidated - Main Export
export * from './components';
export * from './styles';
export * from './utils';
export * from './hooks';
export * from './types';
export * from './constants';
'''
    
    with open(consolidated_theme_path / 'index.ts', 'w') as f:
        f.write(main_index)
    
    # Components index
    components_index = '''// Theme Components
export * from './ThemeProvider';
export * from './ThemeToggle';
export * from './ThemeCustomizer';
'''
    
    with open(consolidated_theme_path / 'components' / 'index.ts', 'w') as f:
        f.write(components_index)
    
    # Styles index
    styles_index = '''// Theme Styles
export * from './orthodox';
export * from './material';
export * from './custom';
export * from './legacy';
'''
    
    with open(consolidated_theme_path / 'styles' / 'index.ts', 'w') as f:
        f.write(styles_index)
    
    print('  ✅ Created index files')

def generate_theme_refactor_report(analysis, results):
    """Generate a theme refactoring report"""
    print('📊 Generating theme refactoring report...')
    
    report_content = f'''# Theme Refactoring Report

## Overview
This report documents the refactoring and consolidation of theme directories.

## Summary Statistics
- **Themes Directory Files**: {len(analysis['themes']['files'])}
- **Themes2 Directory Files**: {len(analysis['themes2']['files'])}
- **Total Files Processed**: {len(analysis['themes']['files']) + len(analysis['themes2']['files'])}
- **Files Moved**: {len(results['moved_files'])}
- **Backup Files Created**: {len(results['backup_files'])}
- **Errors**: {len(results['errors'])}

## Directory Analysis

### Themes Directory
**Path**: `themes/`
**Exists**: {analysis['themes']['exists']}
**Files**: {len(analysis['themes']['files'])}

'''
    
    for file_info in analysis['themes']['files']:
        report_content += f'- **{file_info["name"]}** - `{file_info["path"]}` ({file_info["size"]} bytes)\n'
    
    report_content += f'''
### Themes2 Directory
**Path**: `themes2/`
**Exists**: {analysis['themes2']['exists']}
**Files**: {len(analysis['themes2']['files'])}

'''
    
    for file_info in analysis['themes2']['files']:
        report_content += f'- **{file_info["name"]}** - `{file_info["path"]}` ({file_info["size"]} bytes)\n'
    
    # Duplicates
    if analysis['duplicates']:
        report_content += f'''
## Duplicate Files Found

'''
        for dup in analysis['duplicates']:
            report_content += f'''### {dup['name']} ({dup['count']} occurrences)
'''
            for file_info in dup['files']:
                report_content += f'- `{file_info["path"]}` ({file_info["size"]} bytes)\n'
            report_content += '\n'
    
    # Moved Files
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
## New Theme Structure

```
themes-consolidated/
├── components/
│   ├── ThemeProvider/
│   ├── ThemeToggle/
│   ├── ThemeCustomizer/
│   └── index.ts
├── styles/
│   ├── orthodox/
│   ├── material/
│   ├── custom/
│   ├── legacy/
│   └── index.ts
├── utils/
├── hooks/
├── types/
├── constants/
├── templates/
└── index.ts
```

## Next Steps

1. **Update Import Statements**: Fix all imports to use new theme paths
2. **Test Theme Functionality**: Ensure all themes work correctly
3. **Remove Old Directories**: Delete `themes/` and `themes2/` after verification
4. **Update Documentation**: Update any theme-related documentation
5. **Test Application**: Ensure no regressions after theme refactoring

## Recommendations

### Theme Consolidation
1. **Merge Similar Themes**: Combine themes with similar functionality
2. **Standardize Naming**: Use consistent naming conventions
3. **Create Theme Registry**: Centralize theme management
4. **Implement Theme Switching**: Add dynamic theme switching capability

### Performance Optimization
1. **Lazy Load Themes**: Load themes only when needed
2. **Minimize CSS**: Remove unused theme styles
3. **Optimize Bundle Size**: Reduce theme-related bundle size
4. **Cache Themes**: Implement theme caching for better performance
'''
    
    with open('/var/www/orthodoxmetrics/prod/front-end/THEME_REFACTOR_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated theme refactor report: THEME_REFACTOR_REPORT.md')

def main():
    """Main function"""
    print('🚀 Starting theme refactoring...')
    
    # Step 1: Analyze theme directories
    analysis = analyze_theme_directories()
    
    # Step 2: Create consolidated theme structure
    consolidated_theme_path = create_consolidated_theme_structure()
    
    # Step 3: Consolidate theme files
    results = consolidate_theme_files(analysis, consolidated_theme_path)
    
    # Step 4: Create index files
    create_theme_index_files(consolidated_theme_path)
    
    # Step 5: Generate report
    generate_theme_refactor_report(analysis, results)
    
    print(f'\n🎉 Theme refactoring complete!')
    print(f'📊 Summary:')
    print(f'  Themes directory files: {len(analysis["themes"]["files"])}')
    print(f'  Themes2 directory files: {len(analysis["themes2"]["files"])}')
    print(f'  Files moved: {len(results["moved_files"])}')
    print(f'  Backup files created: {len(results["backup_files"])}')
    print(f'  Errors: {len(results["errors"])}')
    print(f'  Report: THEME_REFACTOR_REPORT.md')
    
    return analysis, results

if __name__ == "__main__":
    result = main()
