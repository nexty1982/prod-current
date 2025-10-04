#!/usr/bin/env python3
"""
Comprehensive cleanup of remaining duplicate components
"""

import os
import shutil
from pathlib import Path

def cleanup_remaining_duplicates():
    """Clean up remaining duplicate components"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🎯 Starting comprehensive cleanup of remaining duplicates...')
    
    # Define comprehensive cleanup rules
    cleanup_rules = [
        # E-commerce duplicates
        {
            'name': 'Pricing (E-commerce)',
            'keep': 'views/pages/frontend-pages/Pricing.tsx',
            'remove': [
                'views/pages/pricing/Pricing.tsx',
                'components/apps/ecommerce/productAdd/Pricing.tsx',
                'components/apps/ecommerce/productEdit/Pricing.tsx'
            ]
        },
        {
            'name': 'ProductTemplate',
            'keep': 'components/apps/ecommerce/productAdd/ProductTemplate.tsx',
            'remove': 'components/apps/ecommerce/productEdit/ProductTemplate.tsx'
        },
        {
            'name': 'Thumbnail',
            'keep': 'components/apps/ecommerce/productAdd/Thumbnail.tsx',
            'remove': 'components/apps/ecommerce/productEdit/Thumbnail.tsx'
        },
        {
            'name': 'ProductDetails',
            'keep': 'components/apps/ecommerce/productAdd/ProductDetails.tsx',
            'remove': 'components/apps/ecommerce/productEdit/ProductDetails.tsx'
        },
        {
            'name': 'VariationCard',
            'keep': 'components/apps/ecommerce/productAdd/VariationCard.tsx',
            'remove': 'components/apps/ecommerce/productEdit/VariationCard.tsx'
        },
        {
            'name': 'GeneralCard',
            'keep': 'components/apps/ecommerce/productAdd/GeneralCard.tsx',
            'remove': 'components/apps/ecommerce/productEdit/GeneralCard.tsx'
        },
        {
            'name': 'Status',
            'keep': 'components/apps/ecommerce/productAdd/Status.tsx',
            'remove': 'components/apps/ecommerce/productEdit/Status.tsx'
        },
        # Account settings duplicates
        {
            'name': 'AccountTab',
            'keep': 'components/pages/account-setting/AccountTab.tsx',
            'remove': 'components/apps/account-settings/AccountTab.tsx'
        },
        {
            'name': 'SecurityTab',
            'keep': 'components/pages/account-setting/SecurityTab.tsx',
            'remove': 'components/apps/account-settings/SecurityTab.tsx'
        },
        {
            'name': 'NotificationTab',
            'keep': 'components/pages/account-setting/NotificationTab.tsx',
            'remove': 'components/apps/account-settings/NotificationTab.tsx'
        },
        # Chat duplicates
        {
            'name': 'ChatSidebar',
            'keep': 'components/apps/chat/ChatSidebar.tsx',
            'remove': 'components/apps/chats/ChatSidebar.tsx'
        },
        # User profile duplicates
        {
            'name': 'ProfileBanner',
            'keep': 'components/apps/userprofile/ProfileBanner.tsx',
            'remove': 'components/apps/userprofile/profile/ProfileBanner.tsx'
        },
        {
            'name': 'FollowerCard',
            'keep': 'components/widgets/cards/FollowerCard.tsx',
            'remove': 'components/apps/userprofile/followers/FollowerCard.tsx'
        },
        # Logging duplicates
        {
            'name': 'SystemMessages',
            'keep': 'components/logs/SystemMessages.tsx',
            'remove': 'components/OMAI/Logger/SystemMessages.tsx'
        },
        # Footer duplicates
        {
            'name': 'Footer',
            'keep': 'components/landingpage/footer/Footer.tsx',
            'remove': 'components/logs/Footer.tsx'
        },
        # Banner duplicates
        {
            'name': 'Banner (Homepage)',
            'keep': 'components/frontend-pages/homepage/banner/Banner.tsx',
            'remove': [
                'components/frontend-pages/pricing/Banner.tsx',
                'components/frontend-pages/portfolio/Banner.tsx',
                'components/landingpage/banner/Banner.tsx'
            ]
        },
        # ContentArea duplicates
        {
            'name': 'ContentArea (About)',
            'keep': 'components/frontend-pages/about/key-metric/ContentArea.tsx',
            'remove': 'components/frontend-pages/shared/reviews/ContentArea.tsx'
        },
        # Features duplicates
        {
            'name': 'Features (Homepage)',
            'keep': 'components/frontend-pages/homepage/features/Features.tsx',
            'remove': 'components/landingpage/features/Features.tsx'
        },
        # Mobile sidebar duplicates
        {
            'name': 'MobileSidebar (Frontend)',
            'keep': 'components/frontend-pages/shared/header/MobileSidebar.tsx',
            'remove': 'components/landingpage/header/MobileSidebar.tsx'
        },
        # Navigation duplicates
        {
            'name': 'Navigations (Frontend)',
            'keep': 'components/frontend-pages/shared/header/Navigations.tsx',
            'remove': 'components/landingpage/header/Navigations.tsx'
        },
        # OrthodoxBanner duplicates
        {
            'name': 'OrthodoxBanner (Shared)',
            'keep': 'components/shared/OrthodoxBanner.tsx',
            'remove': 'components/OrthodoxBanner/OrthodoxBanner.tsx'
        }
    ]
    
    results = {
        'deleted_files': [],
        'backup_files': [],
        'errors': []
    }
    
    for rule in cleanup_rules:
        print(f'\n📦 Processing: {rule["name"]}')
        
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

def cleanup_form_duplicates():
    """Clean up form-related duplicates"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('\n📝 Cleaning up form-related duplicates...')
    
    # Define form cleanup rules
    form_cleanup_rules = [
        {
            'name': 'BasicIcons (Horizontal)',
            'keep': 'components/forms/form-horizontal/BasicIcons.tsx',
            'remove': 'components/forms/form-vertical/BasicIcons.tsx'
        },
        {
            'name': 'FormTabs (Horizontal)',
            'keep': 'components/forms/form-horizontal/FormTabs.tsx',
            'remove': 'components/forms/form-vertical/FormTabs.tsx'
        },
        {
            'name': 'FormSeparator (Horizontal)',
            'keep': 'components/forms/form-horizontal/FormSeparator.tsx',
            'remove': 'components/forms/form-vertical/FormSeparator.tsx'
        },
        {
            'name': 'BasicLayout (Horizontal)',
            'keep': 'components/forms/form-horizontal/BasicLayout.tsx',
            'remove': 'components/forms/form-vertical/BasicLayout.tsx'
        },
        {
            'name': 'CollapsibleForm (Horizontal)',
            'keep': 'components/forms/form-horizontal/CollapsibleForm.tsx',
            'remove': 'components/forms/form-vertical/CollapsibleForm.tsx'
        },
        {
            'name': 'BasicLayoutCode (Horizontal)',
            'keep': 'components/forms/form-horizontal/code/BasicLayoutCode.tsx',
            'remove': 'components/forms/form-vertical/code/BasicLayoutCode.tsx'
        },
        {
            'name': 'BasicIconsCode (Horizontal)',
            'keep': 'components/forms/form-horizontal/code/BasicIconsCode.tsx',
            'remove': 'components/forms/form-vertical/code/BasicIconsCode.tsx'
        }
    ]
    
    results = {
        'deleted_files': [],
        'backup_files': [],
        'errors': []
    }
    
    for rule in form_cleanup_rules:
        print(f'\n📝 Processing: {rule["name"]}')
        
        file_path = frontend_path / rule['remove']
        
        if file_path.exists():
            try:
                # Create backup
                backup_path = file_path.with_suffix(file_path.suffix + '.cleanup_backup')
                shutil.copy2(file_path, backup_path)
                
                # Delete the file
                file_path.unlink()
                
                results['deleted_files'].append(str(file_path))
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
    print('🚀 Starting comprehensive duplicate cleanup...')
    
    # Clean up remaining duplicates
    results1 = cleanup_remaining_duplicates()
    
    # Clean up form duplicates
    results2 = cleanup_form_duplicates()
    
    # Combine results
    total_deleted = len(results1['deleted_files']) + len(results2['deleted_files'])
    total_backups = len(results1['backup_files']) + len(results2['backup_files'])
    total_errors = len(results1['errors']) + len(results2['errors'])
    
    print(f'\n📊 Comprehensive Cleanup Summary:')
    print(f'  Files deleted: {total_deleted}')
    print(f'  Backups created: {total_backups}')
    print(f'  Errors: {total_errors}')
    
    if total_errors > 0:
        print(f'\n❌ Errors encountered:')
        for error in results1['errors'] + results2['errors']:
            print(f'  - {error}')
    
    print(f'\n✅ Comprehensive cleanup complete!')
    print(f'💾 All backup files created with .cleanup_backup extension')
    print(f'🔍 Review backups before permanent deletion')
    
    return {
        'deleted_files': results1['deleted_files'] + results2['deleted_files'],
        'backup_files': results1['backup_files'] + results2['backup_files'],
        'errors': results1['errors'] + results2['errors']
    }

if __name__ == "__main__":
    result = main()
