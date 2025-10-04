#!/usr/bin/env python3
"""
Card View Refactor Execution Script
Moves card view record components to features/records/card_view/
and updates all import paths accordingly.

Usage:
  python3 execute_card_view_refactor.py --dry-run    # Preview changes
  python3 execute_card_view_refactor.py --execute    # Actually perform the refactor
"""

import os
import shutil
import json
import re
import argparse
from pathlib import Path
from typing import List, Dict, Tuple

class CardViewRefactorExecutor:
    def __init__(self, dry_run: bool = True):
        self.dry_run = dry_run
        self.base_path = "front-end/src"
        self.target_dir = "front-end/src/features/records/card_view"
        self.moves_completed = []
        self.updates_completed = []
        self.errors = []
        
        # Files to move (from analysis)
        self.files_to_move = [
            {
                'old_path': 'components/apps/records/recordGrid/RecordCard.tsx',
                'new_path': 'features/records/card_view/RecordCard.tsx',
                'name': 'RecordCard.tsx'
            },
            {
                'old_path': 'components/apps/records/recordGrid/RecordFilter.tsx',
                'new_path': 'features/records/card_view/RecordFilter.tsx',
                'name': 'RecordFilter.tsx'
            },
            {
                'old_path': 'components/apps/records/recordGrid/RecordList.tsx',
                'new_path': 'features/records/card_view/RecordList.tsx',
                'name': 'RecordList.tsx'
            },
            {
                'old_path': 'components/apps/records/recordGrid/RecordSearch.tsx',
                'new_path': 'features/records/card_view/RecordSearch.tsx',
                'name': 'RecordSearch.tsx'
            },
            {
                'old_path': 'components/apps/records/recordGrid/RecordSidebar.tsx',
                'new_path': 'features/records/card_view/RecordSidebar.tsx',
                'name': 'RecordSidebar.tsx'
            },
            {
                'old_path': 'pages/apps/records/index.tsx',
                'new_path': 'features/records/card_view/RecordsManagement.tsx',
                'name': 'RecordsManagement.tsx'  # Renamed for clarity
            },
            {
                'old_path': 'context/RecordsContext.tsx',
                'new_path': 'features/records/card_view/RecordsContext.tsx',
                'name': 'RecordsContext.tsx'
            }
        ]
        
        # Import path updates needed
        self.import_updates = [
            {
                'file': 'routes/Router.tsx',
                'updates': [
                    {
                        'old': 'lazy(() => import("../pages/apps/records/index"))',
                        'new': 'lazy(() => import("../features/records/card_view/RecordsManagement"))'
                    }
                ]
            },
            {
                'file': 'routes/legacy_Router.tsx',
                'updates': [
                    {
                        'old': 'lazy(() => import(\'../pages/apps/records/index\'))',
                        'new': 'lazy(() => import(\'../features/records/card_view/RecordsManagement\'))'
                    }
                ]
            }
        ]
        
        # Internal import updates within moved files
        self.internal_import_updates = [
            {
                'file': 'features/records/card_view/RecordCard.tsx',
                'updates': [
                    {
                        'old': 'from \'../../../../context/RecordsContext\'',
                        'new': 'from \'./RecordsContext\''
                    }
                ]
            },
            {
                'file': 'features/records/card_view/RecordFilter.tsx',
                'updates': [
                    {
                        'old': 'from \'../../../../context/RecordsContext\'',
                        'new': 'from \'./RecordsContext\''
                    }
                ]
            },
            {
                'file': 'features/records/card_view/RecordList.tsx',
                'updates': [
                    {
                        'old': 'from \'../../../../context/RecordsContext\'',
                        'new': 'from \'./RecordsContext\''
                    },
                    {
                        'old': 'from \'./RecordCard\'',
                        'new': 'from \'./RecordCard\''  # Already correct
                    },
                    {
                        'old': 'from \'./RecordSearch\'',
                        'new': 'from \'./RecordSearch\''  # Already correct
                    }
                ]
            },
            {
                'file': 'features/records/card_view/RecordSearch.tsx',
                'updates': [
                    {
                        'old': 'from \'../../../../context/RecordsContext\'',
                        'new': 'from \'./RecordsContext\''
                    }
                ]
            },
            {
                'file': 'features/records/card_view/RecordSidebar.tsx',
                'updates': [
                    {
                        'old': 'from \'./RecordFilter\'',
                        'new': 'from \'./RecordFilter\''  # Already correct
                    }
                ]
            },
            {
                'file': 'features/records/card_view/RecordsManagement.tsx',
                'updates': [
                    {
                        'old': 'from \'../../../components/apps/records/recordGrid/RecordList\'',
                        'new': 'from \'./RecordList\''
                    },
                    {
                        'old': 'from \'../../../components/apps/records/recordGrid/RecordSidebar\'',
                        'new': 'from \'./RecordSidebar\''
                    },
                    {
                        'old': 'from \'../../../context/RecordsContext\'',
                        'new': 'from \'./RecordsContext\''
                    },
                    {
                        'old': 'from \'../../../layouts/full/shared/breadcrumb/Breadcrumb\'',
                        'new': 'from \'../../../layouts/full/shared/breadcrumb/Breadcrumb\''
                    },
                    {
                        'old': 'from \'../../../components/container/PageContainer\'',
                        'new': 'from \'../../../components/container/PageContainer\''
                    },
                    {
                        'old': 'from \'../../../components/shared/AppCard\'',
                        'new': 'from \'../../../components/shared/AppCard\''
                    }
                ]
            }
        ]
    
    def create_target_directory(self):
        """Create the target directory structure"""
        action = "Would create" if self.dry_run else "Creating"
        print(f"📁 {action} target directory: {self.target_dir}")
        
        if not self.dry_run:
            try:
                Path(self.target_dir).mkdir(parents=True, exist_ok=True)
                print(f"✅ Created directory: {self.target_dir}")
            except Exception as e:
                self.errors.append(f"Failed to create directory {self.target_dir}: {e}")
                print(f"❌ Error creating directory: {e}")
                return False
        else:
            print(f"📁 Directory would be created at: {self.target_dir}")
        
        return True
    
    def move_files(self):
        """Move all card view files to new location"""
        print(f"\n📦 {'Would move' if self.dry_run else 'Moving'} card view files...")
        
        for file_move in self.files_to_move:
            old_full_path = f"front-end/src/{file_move['old_path']}"
            new_full_path = f"front-end/src/{file_move['new_path']}"
            
            if not os.path.exists(old_full_path):
                error_msg = f"Source file not found: {old_full_path}"
                self.errors.append(error_msg)
                print(f"⚠️  {error_msg}")
                continue
            
            if self.dry_run:
                print(f"📄 Would move: {file_move['old_path']}")
                print(f"           → {file_move['new_path']}")
            else:
                try:
                    shutil.move(old_full_path, new_full_path)
                    self.moves_completed.append(file_move)
                    print(f"✅ Moved: {file_move['old_path']} → {file_move['new_path']}")
                except Exception as e:
                    error_msg = f"Failed to move {old_full_path}: {e}"
                    self.errors.append(error_msg)
                    print(f"❌ {error_msg}")
    
    def update_internal_imports(self):
        """Update imports within the moved files"""
        print(f"\n🔧 {'Would update' if self.dry_run else 'Updating'} internal imports...")
        
        for update_info in self.internal_import_updates:
            file_path = f"front-end/src/{update_info['file']}"
            
            if not os.path.exists(file_path):
                print(f"⚠️  File not found for internal update: {file_path}")
                continue
            
            if self.dry_run:
                print(f"📄 Would update internal imports in: {update_info['file']}")
                for update in update_info['updates']:
                    if update['old'] != update['new']:  # Only show actual changes
                        print(f"    {update['old']} → {update['new']}")
            else:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    original_content = content
                    changes_made = []
                    
                    for update in update_info['updates']:
                        if update['old'] in content and update['old'] != update['new']:
                            content = content.replace(update['old'], update['new'])
                            changes_made.append(f"{update['old']} → {update['new']}")
                    
                    if content != original_content:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(content)
                        
                        self.updates_completed.append({
                            'file': update_info['file'],
                            'changes': changes_made
                        })
                        print(f"✅ Updated internal imports in: {update_info['file']}")
                        for change in changes_made:
                            print(f"    {change}")
                    else:
                        print(f"ℹ️  No changes needed in: {update_info['file']}")
                        
                except Exception as e:
                    error_msg = f"Failed to update internal imports in {file_path}: {e}"
                    self.errors.append(error_msg)
                    print(f"❌ {error_msg}")
    
    def update_external_imports(self):
        """Update imports in external files that reference moved components"""
        print(f"\n🔗 {'Would update' if self.dry_run else 'Updating'} external imports...")
        
        for update_info in self.import_updates:
            file_path = f"front-end/src/{update_info['file']}"
            
            if not os.path.exists(file_path):
                print(f"⚠️  File not found for external update: {file_path}")
                continue
            
            if self.dry_run:
                print(f"📄 Would update external imports in: {update_info['file']}")
                for update in update_info['updates']:
                    print(f"    {update['old']} → {update['new']}")
            else:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    original_content = content
                    changes_made = []
                    
                    for update in update_info['updates']:
                        if update['old'] in content:
                            content = content.replace(update['old'], update['new'])
                            changes_made.append(f"{update['old']} → {update['new']}")
                    
                    if content != original_content:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(content)
                        
                        self.updates_completed.append({
                            'file': update_info['file'],
                            'changes': changes_made
                        })
                        print(f"✅ Updated external imports in: {update_info['file']}")
                        for change in changes_made:
                            print(f"    {change}")
                    else:
                        print(f"ℹ️  No changes needed in: {update_info['file']}")
                        
                except Exception as e:
                    error_msg = f"Failed to update external imports in {file_path}: {e}"
                    self.errors.append(error_msg)
                    print(f"❌ {error_msg}")
    
    def create_index_file(self):
        """Create an index.ts file for the card_view directory"""
        index_content = '''/**
 * Card View Records Components
 * Export all card-based record browsing components
 */

// Main components
export { default as RecordCard } from './RecordCard';
export { default as RecordFilter } from './RecordFilter';
export { default as RecordList } from './RecordList';
export { default as RecordSearch } from './RecordSearch';
export { default as RecordSidebar } from './RecordSidebar';

// Main page component
export { default as RecordsManagement } from './RecordsManagement';

// Context and hooks
export { RecordProvider, useRecords } from './RecordsContext';
export type { RecordType, RecordFilter } from './RecordsContext';
'''
        
        index_path = f"{self.target_dir}/index.ts"
        
        if self.dry_run:
            print(f"📄 Would create index file: {index_path}")
            print("    Exports: RecordCard, RecordFilter, RecordList, RecordSearch, RecordSidebar, RecordsManagement, RecordProvider, useRecords")
        else:
            try:
                with open(index_path, 'w', encoding='utf-8') as f:
                    f.write(index_content)
                print(f"✅ Created index file: {index_path}")
            except Exception as e:
                error_msg = f"Failed to create index file: {e}"
                self.errors.append(error_msg)
                print(f"❌ {error_msg}")
    
    def cleanup_empty_directories(self):
        """Remove empty directories after moving files"""
        directories_to_check = [
            "front-end/src/components/apps/records/recordGrid",
            "front-end/src/components/apps/records",
            "front-end/src/pages/apps/records"
        ]
        
        for directory in directories_to_check:
            if self.dry_run:
                if os.path.exists(directory) and not os.listdir(directory):
                    print(f"🗑️  Would remove empty directory: {directory}")
            else:
                try:
                    if os.path.exists(directory) and not os.listdir(directory):
                        os.rmdir(directory)
                        print(f"🗑️  Removed empty directory: {directory}")
                except Exception as e:
                    print(f"⚠️  Could not remove directory {directory}: {e}")
    
    def update_router_imports(self):
        """Specifically update Router.tsx imports"""
        router_files = [
            'routes/Router.tsx',
            'routes/legacy_Router.tsx'
        ]
        
        for router_file in router_files:
            file_path = f"front-end/src/{router_file}"
            
            if not os.path.exists(file_path):
                continue
                
            if self.dry_run:
                print(f"📄 Would update Router imports in: {router_file}")
                print(f"    pages/apps/records/index → features/records/card_view/RecordsManagement")
            else:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    original_content = content
                    
                    # Update the import path
                    content = content.replace(
                        'import("../pages/apps/records/index")',
                        'import("../features/records/card_view/RecordsManagement")'
                    )
                    content = content.replace(
                        'import(\'../pages/apps/records/index\')',
                        'import(\'../features/records/card_view/RecordsManagement\')'
                    )
                    
                    if content != original_content:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(content)
                        print(f"✅ Updated router imports in: {router_file}")
                    else:
                        print(f"ℹ️  No router updates needed in: {router_file}")
                        
                except Exception as e:
                    error_msg = f"Failed to update router {file_path}: {e}"
                    self.errors.append(error_msg)
                    print(f"❌ {error_msg}")
    
    def execute_refactor(self):
        """Execute the complete refactor"""
        print("🚀 Starting Card View Refactor...")
        print(f"📋 Mode: {'DRY RUN' if self.dry_run else 'EXECUTE'}")
        print()
        
        # Step 1: Create target directory
        if not self.create_target_directory():
            print("❌ Failed to create target directory, aborting")
            return False
        
        # Step 2: Move files
        self.move_files()
        
        # Step 3: Create index file
        self.create_index_file()
        
        # Step 4: Update internal imports
        self.update_internal_imports()
        
        # Step 5: Update router imports specifically
        self.update_router_imports()
        
        # Step 6: Clean up empty directories
        self.cleanup_empty_directories()
        
        # Step 7: Summary
        self.print_summary()
        
        return len(self.errors) == 0
    
    def print_summary(self):
        """Print execution summary"""
        print("\n" + "="*60)
        print("📊 REFACTOR SUMMARY")
        print("="*60)
        
        if self.dry_run:
            print("🔍 DRY RUN RESULTS:")
            print(f"  Would move: {len(self.files_to_move)} files")
            print(f"  Would update: {len(self.internal_import_updates) + len(self.import_updates)} files")
            print(f"  Target: {self.target_dir}")
        else:
            print("✅ EXECUTION RESULTS:")
            print(f"  Files moved: {len(self.moves_completed)}")
            print(f"  Files updated: {len(self.updates_completed)}")
            print(f"  Errors: {len(self.errors)}")
        
        if self.errors:
            print(f"\n❌ ERRORS ({len(self.errors)}):")
            for error in self.errors:
                print(f"  • {error}")
        
        print(f"\n📁 NEW STRUCTURE:")
        print(f"  features/records/")
        print(f"  ├── card_view/              # Card-based record browsing")
        print(f"  │   ├── RecordCard.tsx      # Individual record cards")
        print(f"  │   ├── RecordFilter.tsx    # Advanced filtering")
        print(f"  │   ├── RecordList.tsx      # Main container")
        print(f"  │   ├── RecordSearch.tsx    # Search component")
        print(f"  │   ├── RecordSidebar.tsx   # Sidebar wrapper")
        print(f"  │   ├── RecordsManagement.tsx # Main page (renamed)")
        print(f"  │   ├── RecordsContext.tsx  # Card view context")
        print(f"  │   └── index.ts           # Barrel exports")
        print(f"  ├── EnhancedRecordsGrid.tsx # Professional data grid")
        print(f"  ├── RecordSettings.tsx      # Configuration")
        print(f"  ├── api/                    # API layer")
        print(f"  └── components/             # Grid components")
        
        if not self.dry_run and len(self.errors) == 0:
            print(f"\n🎉 Card view refactor completed successfully!")
            print(f"\n⚠️  NEXT STEPS:")
            print(f"  1. Test the /apps/records route")
            print(f"  2. Verify menu navigation works")
            print(f"  3. Check for any missed import paths")
            print(f"  4. Update documentation if needed")
        elif self.dry_run:
            print(f"\n🎯 TO EXECUTE:")
            print(f"  python3 execute_card_view_refactor.py --execute")

def main():
    parser = argparse.ArgumentParser(description="Execute card view refactor")
    parser.add_argument('--dry-run', action='store_true', default=True,
                       help='Preview changes without executing (default)')
    parser.add_argument('--execute', action='store_true',
                       help='Actually execute the refactor')
    
    args = parser.parse_args()
    
    # If --execute is specified, turn off dry-run
    if args.execute:
        dry_run = False
    else:
        dry_run = True
    
    executor = CardViewRefactorExecutor(dry_run=dry_run)
    success = executor.execute_refactor()
    
    if not success and not dry_run:
        print("\n❌ Refactor failed with errors!")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
