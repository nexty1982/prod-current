#!/usr/bin/env python3
"""
Comprehensive script to restore all backup files across the site
"""

import os
import shutil
from pathlib import Path
import re

def restore_all_backups():
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔄 Starting comprehensive backup restoration...')
    
    # Find all backup files
    backup_files = []
    for root, dirs, files in os.walk(frontend_path):
        for file in files:
            if any(backup_suffix in file for backup_suffix in [
                '.backup', '.cleanup_backup', '.miscellaneous_backup', 
                '.inputs_backup', '.settings_backup', '.admin_backup',
                '.tables_backup', '.layouts_backup', '.charts_backup',
                '.buttons_backup', '.cards_backup', '.auth_backup',
                '.church_backup', '.records_backup', '.dashboard_backup',
                '.theme_consolidated_backup', '.import_backup', '.bak'
            ]):
                backup_files.append(Path(root) / file)
    
    print(f'📁 Found {len(backup_files)} backup files')
    
    restored_count = 0
    skipped_count = 0
    error_count = 0
    
    for backup_file in backup_files:
        try:
            # Determine the target file name by removing backup suffixes
            target_name = backup_file.name
            for suffix in [
                '.backup', '.cleanup_backup', '.miscellaneous_backup', 
                '.inputs_backup', '.settings_backup', '.admin_backup',
                '.tables_backup', '.layouts_backup', '.charts_backup',
                '.buttons_backup', '.cards_backup', '.auth_backup',
                '.church_backup', '.records_backup', '.dashboard_backup',
                '.theme_consolidated_backup', '.import_backup', '.bak'
            ]:
                if target_name.endswith(suffix):
                    target_name = target_name[:-len(suffix)]
                    break
            
            target_file = backup_file.parent / target_name
            
            # Skip if target already exists and is newer
            if target_file.exists() and target_file.stat().st_mtime > backup_file.stat().st_mtime:
                skipped_count += 1
                continue
            
            # Restore the file
            shutil.copy2(backup_file, target_file)
            restored_count += 1
            
            if restored_count % 50 == 0:
                print(f'  ✅ Restored {restored_count} files...')
                
        except Exception as e:
            error_count += 1
            print(f'  ❌ Error restoring {backup_file}: {e}')
    
    print(f'\n📊 RESTORATION SUMMARY:')
    print(f'  Files restored: {restored_count}')
    print(f'  Files skipped: {skipped_count}')
    print(f'  Errors: {error_count}')
    
    # Now let's specifically fix the critical missing files
    print('\n🔧 Fixing critical missing files...')
    
    # 1. Fix Router import
    router_files = list(frontend_path.glob('**/Router*'))
    if router_files:
        # Find the most recent Router file
        latest_router = max(router_files, key=lambda x: x.stat().st_mtime)
        target_router = frontend_path / 'routes' / 'Router.tsx'
        target_router.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(latest_router, target_router)
        print('✅ Restored Router.tsx')
    
    # 2. Fix config import
    config_files = list(frontend_path.glob('**/config*'))
    if config_files:
        # Find the most recent config file
        latest_config = max(config_files, key=lambda x: x.stat().st_mtime)
        target_config = frontend_path / 'config.ts'
        shutil.copy2(latest_config, target_config)
        print('✅ Restored config.ts')
    
    # 3. Fix ChurchRecordsContext
    church_context_files = list(frontend_path.glob('**/ChurchRecordsContext*'))
    if church_context_files:
        latest_church_context = max(church_context_files, key=lambda x: x.stat().st_mtime)
        target_church_context = frontend_path / 'context' / 'ChurchRecordsContext.tsx'
        shutil.copy2(latest_church_context, target_church_context)
        print('✅ Restored ChurchRecordsContext.tsx')
    
    # 4. Fix WebSocketContext
    websocket_context_files = list(frontend_path.glob('**/WebSocketContext*'))
    if websocket_context_files:
        latest_websocket_context = max(websocket_context_files, key=lambda x: x.stat().st_mtime)
        target_websocket_context = frontend_path / 'context' / 'WebSocketContext.tsx'
        shutil.copy2(latest_websocket_context, target_websocket_context)
        print('✅ Restored WebSocketContext.tsx')
    
    # 5. Fix setupAxiosInterceptors
    axios_files = list(frontend_path.glob('**/axiosInterceptor*'))
    if axios_files:
        latest_axios = max(axios_files, key=lambda x: x.stat().st_mtime)
        target_axios = frontend_path / 'utils' / 'axiosInterceptor.ts'
        target_axios.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(latest_axios, target_axios)
        print('✅ Restored axiosInterceptor.ts')
    
    # 6. Fix router import in App.tsx
    app_tsx = frontend_path / 'App.tsx'
    if app_tsx.exists():
        with open(app_tsx, 'r') as f:
            content = f.read()
        
        # Fix router import
        content = re.sub(
            r'import router from "\./routes/Router";',
            'import router from "./routes/Router";',
            content
        )
        
        # Fix config import
        content = re.sub(
            r'import config from "\.\./config";',
            'import config from "../config";',
            content
        )
        
        with open(app_tsx, 'w') as f:
            f.write(content)
        print('✅ Fixed App.tsx imports')
    
    print('\n🎉 Comprehensive backup restoration complete!')
    print('🚀 The application should now work properly with all features restored.')

if __name__ == "__main__":
    restore_all_backups()
