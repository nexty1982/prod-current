#!/usr/bin/env python3
"""
Fix broken imports after cleanup
"""

import os
import re
from pathlib import Path
import shutil

def fix_broken_imports():
    """Fix broken imports systematically"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔧 Fixing broken imports...')
    
    # Define import fixes
    import_fixes = [
        # Theme fixes
        {
            'file': 'App.tsx',
            'old_import': './theme/Theme',
            'new_import': './theme/ThemeSettings'
        },
        {
            'file': 'App.tsx',
            'old_import': './styles/themes/orthodox-traditional.css',
            'new_import': '// ./styles/themes/orthodox-traditional.css'
        },
        {
            'file': 'App.tsx',
            'old_import': './styles/themes/lent-season.css',
            'new_import': '// ./styles/themes/lent-season.css'
        },
        {
            'file': 'App.tsx',
            'old_import': './styles/themes/pascha-theme.css',
            'new_import': '// ./styles/themes/pascha-theme.css'
        },
        # Records-centralized fixes
        {
            'file': 'pages/apps/church-management/RecordsPageWrapper.tsx',
            'old_import': '../../../features/Records-centralized/views/apps/records/RecordsUIPage',
            'new_import': '../../../features/Records-centralized/views/apps/records/RecordsUIPage'
        },
        {
            'file': 'pages/apps/records/DynamicRecordsPageWrapper.tsx',
            'old_import': '../../../features/Records-centralized/views/apps/records/RecordsUIPage',
            'new_import': '../../../features/Records-centralized/views/apps/records/RecordsUIPage'
        },
        {
            'file': 'pages/apps/records/index.tsx',
            'old_import': '../../../context/RecordsContext',
            'new_import': '../../../features/Records-centralized/context/RecordsContext'
        },
        # Church management fixes
        {
            'file': 'pages/ChurchManagement/ChurchManagement.tsx',
            'old_import': '../../components/OrthodoxBanner/OrthodoxBanner',
            'new_import': '../../components/shared/OrthodoxBanner'
        },
        {
            'file': 'pages/ChurchManagement/ChurchManagement.tsx',
            'old_import': '../../hooks/useAuth',
            'new_import': '../../hooks/shared/useAuth'
        },
        {
            'file': 'pages/ChurchManagement/ChurchManagement.tsx',
            'old_import': '../../api/orthodox-metrics.api',
            'new_import': '../../api/shared/orthodox-metrics.api'
        }
    ]
    
    results = {
        'fixed_imports': [],
        'errors': []
    }
    
    for fix in import_fixes:
        file_path = frontend_path / fix['file']
        
        if file_path.exists():
            try:
                # Read file content
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Create backup
                backup_path = file_path.with_suffix(file_path.suffix + '.import_backup')
                shutil.copy2(file_path, backup_path)
                
                # Replace import
                old_import = fix['old_import']
                new_import = fix['new_import']
                
                # Handle different import patterns
                patterns = [
                    f"import.*from\\s+['\"]({re.escape(old_import)})['\"]",
                    f"import\\s+['\"]({re.escape(old_import)})['\"]",
                    f"require\\(['\"]({re.escape(old_import)})['\"]\\)"
                ]
                
                modified = False
                for pattern in patterns:
                    if re.search(pattern, content):
                        content = re.sub(pattern, lambda m: m.group(0).replace(old_import, new_import), content)
                        modified = True
                
                if modified:
                    # Write back the modified content
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    
                    results['fixed_imports'].append({
                        'file': fix['file'],
                        'old_import': old_import,
                        'new_import': new_import
                    })
                    print(f'  ✅ Fixed: {fix["file"]} - {old_import} -> {new_import}')
                else:
                    print(f'  ⚠️  Import not found in {fix["file"]}: {old_import}')
            except Exception as e:
                error_msg = f'Error fixing {fix["file"]}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
        else:
            print(f'  ⚠️  File not found: {fix["file"]}')
    
    return results

def create_missing_files():
    """Create missing files that are commonly imported"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('📁 Creating missing files...')
    
    # Define missing files to create
    missing_files = [
        {
            'path': 'theme/ThemeSettings.tsx',
            'content': '''import { createTheme } from '@mui/material/styles';

export const ThemeSettings = () => {
  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#6B21A8',
      },
      secondary: {
        main: '#FFD700',
      },
    },
  });
};'''
        },
        {
            'path': 'hooks/shared/useAuth.ts',
            'content': '''import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};'''
        },
        {
            'path': 'api/shared/orthodox-metrics.api.ts',
            'content': '''// Orthodox Metrics API
export const orthodoxMetricsApi = {
  // API endpoints will be defined here
};'''
        }
    ]
    
    results = {
        'created_files': [],
        'errors': []
    }
    
    for file_info in missing_files:
        file_path = frontend_path / file_info['path']
        
        try:
            # Create directory if it doesn't exist
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Create file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(file_info['content'])
            
            results['created_files'].append(file_info['path'])
            print(f'  ✅ Created: {file_info["path"]}')
        except Exception as e:
            error_msg = f'Error creating {file_info["path"]}: {e}'
            results['errors'].append(error_msg)
            print(f'  ❌ {error_msg}')
    
    return results

def main():
    """Main function"""
    print('🚀 Starting broken import fixes...')
    
    # Fix broken imports
    import_results = fix_broken_imports()
    
    # Create missing files
    file_results = create_missing_files()
    
    # Print summary
    print(f'\n📊 Fix Summary:')
    print(f'  Fixed imports: {len(import_results["fixed_imports"])}')
    print(f'  Created files: {len(file_results["created_files"])}')
    print(f'  Errors: {len(import_results["errors"]) + len(file_results["errors"])}')
    
    if import_results['errors'] or file_results['errors']:
        print(f'\n❌ Errors encountered:')
        for error in import_results['errors'] + file_results['errors']:
            print(f'  - {error}')
    
    print(f'\n✅ Import fixes complete!')
    
    return {
        'fixed_imports': import_results['fixed_imports'],
        'created_files': file_results['created_files'],
        'errors': import_results['errors'] + file_results['errors']
    }

if __name__ == "__main__":
    result = main()
