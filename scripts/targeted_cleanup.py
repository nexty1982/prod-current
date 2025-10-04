#!/usr/bin/env python3
"""
Targeted cleanup of specific duplicate components
"""

import os
import shutil
from pathlib import Path

def cleanup_specific_duplicates():
    """Clean up specific problematic duplicates"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🎯 Starting targeted cleanup of specific duplicates...')
    
    # Define specific cleanup rules
    cleanup_rules = [
        {
            'name': 'RecordsPageWrapper',
            'keep': 'pages/apps/church-management/RecordsPageWrapper.tsx',
            'remove': 'features/Records-centralized/pages/apps/church-management/RecordsPageWrapper.tsx'
        },
        {
            'name': 'BaptismRecordsPage',
            'keep': 'views/records/BaptismRecordsPage.tsx',
            'remove': 'features/Records-centralized/views/records/BaptismRecordsPage.tsx'
        },
        {
            'name': 'SSPPOCRecordsPage',
            'keep': 'views/records/SSPPOCRecordsPage.tsx',
            'remove': [
                'views/SSPPOCRecordsPage.tsx',
                'features/Records-centralized/views/records/SSPPOCRecordsPage.tsx'
            ]
        },
        {
            'name': 'EditChurchModal',
            'keep': 'pages/ChurchManagement/EditChurchModal.tsx',
            'remove': 'components/admin/EditChurchModal.tsx'
        },
        {
            'name': 'ChurchManagement',
            'keep': 'pages/ChurchManagement/ChurchManagement.tsx',
            'remove': 'components/admin/ChurchManagement.tsx'
        },
        {
            'name': 'UserFormModal',
            'keep': 'components/UserFormModal.tsx',
            'remove': [
                '@om/components/features/auth/UserFormModal.tsx',
                'components/admin/UserFormModal.tsx'
            ]
        },
        {
            'name': 'ThemeCustomizer',
            'keep': 'components/Theme/ThemeCustomizer.tsx',
            'remove': '@om/components/ui/theme/ThemeCustomizer.tsx'
        },
        {
            'name': 'FormValidation',
            'keep': 'views/forms/FormValidation.tsx',
            'remove': 'features/Records-centralized/ui/components/forms/FormValidation.tsx'
        }
    ]
    
    results = {
        'deleted_files': [],
        'backup_files': [],
        'errors': []
    }
    
    for rule in cleanup_rules:
        print(f'\n�� Processing: {rule["name"]}')
        
        # Handle single file removal
        if isinstance(rule['remove'], str):
            remove_files = [rule['remove']]
        else:
            remove_files = rule['remove']
        
        for remove_file in remove_files:
            file_path = frontend_path / remove_file
            
            if file_path.exists():
                try:
                    # Create backup
                    backup_path = file_path.with_suffix(file_path.suffix + '.cleanup_backup')
                    shutil.copy2(file_path, backup_path)
                    
                    # Delete the file
                    file_path.unlink()
                    
                    results['deleted_files'].append(str(file_path))
                    results['backup_files'].append(str(backup_path))
                    
                    print(f'  ✅ Deleted: {remove_file}')
                    print(f'  💾 Backup: {backup_path.name}')
                except Exception as e:
                    error_msg = f'Error deleting {remove_file}: {e}'
                    results['errors'].append(error_msg)
                    print(f'  ❌ {error_msg}')
            else:
                print(f'  ⚠️  File not found: {remove_file}')
    
    return results

def cleanup_index_files():
    """Clean up duplicate index files in specific directories"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('\n📁 Cleaning up duplicate index files...')
    
    # Define index file cleanup rules
    index_cleanup_rules = [
        {
            'directory': 'features/Records-centralized',
            'keep': 'features/Records-centralized/index.ts',
            'remove': 'features/Records-centralized/records/index.js'  # Remove .js version
        },
        {
            'directory': 'features/Records-centralized/records',
            'keep': 'features/Records-centralized/records/constants.ts',
            'remove': 'features/Records-centralized/records/constants.js'  # Remove .js version
        },
        {
            'directory': 'features/Records-centralized/records',
            'keep': 'features/Records-centralized/records/api.ts',
            'remove': 'features/Records-centralized/records/api.js'  # Remove .js version
        }
    ]
    
    results = {
        'deleted_files': [],
        'backup_files': [],
        'errors': []
    }
    
    for rule in index_cleanup_rules:
        remove_file = frontend_path / rule['remove']
        
        if remove_file.exists():
            try:
                # Create backup
                backup_path = remove_file.with_suffix(remove_file.suffix + '.cleanup_backup')
                shutil.copy2(remove_file, backup_path)
                
                # Delete the file
                remove_file.unlink()
                
                results['deleted_files'].append(str(remove_file))
                results['backup_files'].append(str(backup_path))
                
                print(f'  ✅ Deleted: {rule["remove"]}')
                print(f'  💾 Backup: {backup_path.name}')
            except Exception as e:
                error_msg = f'Error deleting {rule["remove"]}: {e}'
                results['errors'].append(error_msg)
                print(f'  ❌ {error_msg}')
        else:
            print(f'  ⚠️  File not found: {rule["remove"]}')
    
    return results

def main():
    """Main function"""
    print('🚀 Starting targeted duplicate cleanup...')
    
    # Clean up specific duplicates
    results1 = cleanup_specific_duplicates()
    
    # Clean up index files
    results2 = cleanup_index_files()
    
    # Combine results
    total_deleted = len(results1['deleted_files']) + len(results2['deleted_files'])
    total_backups = len(results1['backup_files']) + len(results2['backup_files'])
    total_errors = len(results1['errors']) + len(results2['errors'])
    
    print(f'\n�� Cleanup Summary:')
    print(f'  Files deleted: {total_deleted}')
    print(f'  Backups created: {total_backups}')
    print(f'  Errors: {total_errors}')
    
    if total_errors > 0:
        print(f'\n❌ Errors encountered:')
        for error in results1['errors'] + results2['errors']:
            print(f'  - {error}')
    
    print(f'\n✅ Targeted cleanup complete!')
    print(f'💾 Backup files created with .cleanup_backup extension')
    print(f'🔍 Review backups before permanent deletion')
    
    return {
        'deleted_files': results1['deleted_files'] + results2['deleted_files'],
        'backup_files': results1['backup_files'] + results2['backup_files'],
        'errors': results1['errors'] + results2['errors']
    }

if __name__ == "__main__":
    result = main()
