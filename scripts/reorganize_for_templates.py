#!/usr/bin/env python3
"""
Records-Centralized Template-Agnostic Reorganization Script
Reorganizes the current file structure to be template-agnostic and easily portable to Berry or other UI templates.
"""

import os
import shutil
from pathlib import Path

def create_directory_structure(base_path):
    """Create the new template-agnostic directory structure"""
    
    directories = [
        # Core business logic (template-agnostic)
        "core/api",
        "core/hooks", 
        "core/types",
        "core/utils",
        
        # UI components (template-specific)
        "ui/components/base",
        "ui/components/mui",
        "ui/components/berry", 
        "ui/components/ag-grid",
        "ui/layouts",
        "ui/themes",
        
        # Feature-specific implementations
        "features/baptism",
        "features/marriage", 
        "features/funeral",
        "features/dynamic",
        
        # Page components
        "pages/mui",
        "pages/berry",
        
        # Configuration and constants
        "config",
        "constants",
        
        # Tests and documentation
        "__tests__/core",
        "__tests__/ui", 
        "__tests__/features",
        "docs"
    ]
    
    for directory in directories:
        dir_path = base_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f"Created directory: {directory}")

def move_core_files(base_path):
    """Move core business logic files to core/ directory"""
    
    # Move API services
    api_files = [
        "shared/api/RecordTableConfigApiService.ts",
        "shared/api/AgGridConfigApiService.ts", 
        "shared/api/UnifiedRecordsApiService.ts",
        "shared/api/DynamicRecordsApiService.ts",
        "shared/api/RecordsApiService.ts"
    ]
    
    for file_path in api_files:
        src = base_path / file_path
        dst = base_path / "core/api" / Path(file_path).name
        if src.exists():
            shutil.move(str(src), str(dst))
            print(f"Moved API service: {file_path} -> core/api/")
    
    # Move hooks
    hook_files = [
        "shared/hooks/useRecordTableConfig.ts",
        "shared/hooks/useAgGridConfig.ts",
        "shared/hooks/useUnifiedRecords.ts", 
        "shared/hooks/useDynamicRecords.ts",
        "shared/hooks/useRecords.ts"
    ]
    
    for file_path in hook_files:
        src = base_path / file_path
        dst = base_path / "core/hooks" / Path(file_path).name
        if src.exists():
            shutil.move(str(src), str(dst))
            print(f"Moved hook: {file_path} -> core/hooks/")
    
    # Move types
    type_files = [
        "shared/types/RecordsTypes.ts"
    ]
    
    for file_path in type_files:
        src = base_path / file_path
        dst = base_path / "core/types" / Path(file_path).name
        if src.exists():
            shutil.move(str(src), str(dst))
            print(f"Moved types: {file_path} -> core/types/")
    
    # Move utils
    util_files = [
        "shared/utils/performance.ts"
    ]
    
    for file_path in util_files:
        src = base_path / file_path
        dst = base_path / "core/utils" / Path(file_path).name
        if src.exists():
            shutil.move(str(src), str(dst))
            print(f"Moved utility: {file_path} -> core/utils/")

def move_ui_components(base_path):
    """Move UI components to template-specific directories"""
    
    # Move base components (template-agnostic)
    base_components = [
        "shared/components/RecordsTable.tsx",
        "shared/components/RecordsForm.tsx", 
        "shared/components/RecordsModal.tsx",
        "shared/components/RecordsSearch.tsx",
        "shared/components/DynamicRecordsTable.tsx",
        "shared/components/AccessibleRecordsTable.tsx",
        "shared/components/OptimizedRecordsTable.tsx"
    ]
    
    for file_path in base_components:
        src = base_path / file_path
        dst = base_path / "ui/components/base" / Path(file_path).name
        if src.exists():
            shutil.move(str(src), str(dst))
            print(f"Moved base component: {file_path} -> ui/components/base/")
    
    # Move AG Grid specific components
    ag_grid_components = [
        # These would be created as AG Grid specific versions
    ]
    
    # Move existing components to MUI directory (current template)
    mui_components = [
        # Current components are MUI-based, so move them there
    ]

def move_feature_files(base_path):
    """Move feature-specific files to features/ directory"""
    
    # Move baptism records
    baptism_files = [
        "records/BaptismRecords.tsx"
    ]
    
    for file_path in baptism_files:
        src = base_path / file_path
        dst = base_path / "features/baptism" / Path(file_path).name
        if src.exists():
            shutil.move(str(src), str(dst))
            print(f"Moved baptism feature: {file_path} -> features/baptism/")
    
    # Move marriage records
    marriage_files = [
        "records/MarriageRecords.tsx"
    ]
    
    for file_path in marriage_files:
        src = base_path / file_path
        dst = base_path / "features/marriage" / Path(file_path).name
        if src.exists():
            shutil.move(str(src), str(dst))
            print(f"Moved marriage feature: {file_path} -> features/marriage/")
    
    # Move funeral records
    funeral_files = [
        "records/FuneralRecords.tsx"
    ]
    
    for file_path in funeral_files:
        src = base_path / file_path
        dst = base_path / "features/funeral" / Path(file_path).name
        if src.exists():
            shutil.move(str(src), str(dst))
            print(f"Moved funeral feature: {file_path} -> features/funeral/")
    
    # Move dynamic records
    dynamic_files = [
        "records/DynamicRecordsManager.tsx",
        "records/DynamicRecordForm.tsx",
        "records/UnifiedRecordManager.tsx",
        "records/UnifiedRecordForm.tsx",
        "records/UnifiedRecordTable.tsx"
    ]
    
    for file_path in dynamic_files:
        src = base_path / file_path
        dst = base_path / "features/dynamic" / Path(file_path).name
        if src.exists():
            shutil.move(str(src), str(dst))
            print(f"Moved dynamic feature: {file_path} -> features/dynamic/")

def move_page_files(base_path):
    """Move page components to template-specific directories"""
    
    # Move current pages to MUI directory (current template)
    mui_pages = [
        "views/records/BaptismRecordsPage.tsx",
        "views/records/MarriageRecordsPage.tsx", 
        "views/records/FuneralRecordsPage.tsx",
        "views/records/DynamicRecordsPage.tsx",
        "views/records/UnifiedRecordsPage.tsx",
        "views/records/RecordsAgGrid.tsx"
    ]
    
    for file_path in mui_pages:
        src = base_path / file_path
        dst = base_path / "pages/mui" / Path(file_path).name
        if src.exists():
            shutil.move(str(src), str(dst))
            print(f"Moved MUI page: {file_path} -> pages/mui/")

def move_config_files(base_path):
    """Move configuration and constant files"""
    
    # Move constants
    constant_files = [
        "records/constants.ts",
        "records/constants.js"
    ]
    
    for file_path in constant_files:
        src = base_path / file_path
        dst = base_path / "constants" / Path(file_path).name
        if src.exists():
            shutil.move(str(src), str(dst))
            print(f"Moved constants: {file_path} -> constants/")
    
    # Move schemas
    schema_files = [
        "schemas/record-schemas.ts"
    ]
    
    for file_path in schema_files:
        src = base_path / file_path
        dst = base_path / "config" / Path(file_path).name
        if src.exists():
            shutil.move(str(src), str(dst))
            print(f"Moved schema: {file_path} -> config/")

def move_test_files(base_path):
    """Move test files to organized test directory"""
    
    # Move core tests
    core_tests = [
        "shared/__tests__/RecordsApiService.test.ts",
        "shared/__tests__/useDynamicRecords.test.ts"
    ]
    
    for file_path in core_tests:
        src = base_path / file_path
        dst = base_path / "__tests__/core" / Path(file_path).name
        if src.exists():
            shutil.move(str(src), str(dst))
            print(f"Moved core test: {file_path} -> __tests__/core/")
    
    # Move UI tests
    ui_tests = [
        "shared/__tests__/DynamicRecordsTable.test.tsx"
    ]
    
    for file_path in ui_tests:
        src = base_path / file_path
        dst = base_path / "__tests__/ui" / Path(file_path).name
        if src.exists():
            shutil.move(str(src), str(dst))
            print(f"Moved UI test: {file_path} -> __tests__/ui/")
    
    # Move feature tests
    feature_tests = [
        "records/__tests__/DynamicRecordsManager.test.tsx"
    ]
    
    for file_path in feature_tests:
        src = base_path / file_path
        dst = base_path / "__tests__/features" / Path(file_path).name
        if src.exists():
            shutil.move(str(src), str(dst))
            print(f"Moved feature test: {file_path} -> __tests__/features/")

def move_documentation(base_path):
    """Move documentation files"""
    
    doc_files = [
        "README.md",
        "migration-guide.md",
        "DYNAMIC_README.md",
        "PERFORMANCE_ACCESSIBILITY_GUIDE.md",
        "PHASE2_COMPLETION_SUMMARY.md",
        "PHASE3_REFACTORING_PLAN.md",
        "PHASE3A_COMPLETION_SUMMARY.md",
        "RECORD_TABLE_CONFIGURATION.md",
        "RECORD_TABLE_EXTENSION_SUMMARY.md",
        "BACKEND_API_DOCUMENTATION.md",
        "AG_GRID_CONFIGURATION.md"
    ]
    
    for file_path in doc_files:
        src = base_path / file_path
        dst = base_path / "docs" / Path(file_path).name
        if src.exists():
            shutil.move(str(src), str(dst))
            print(f"Moved documentation: {file_path} -> docs/")

def create_index_files(base_path):
    """Create index.ts files for each directory"""
    
    directories_with_index = [
        "core/api",
        "core/hooks", 
        "core/types",
        "core/utils",
        "ui/components/base",
        "ui/components/mui",
        "ui/components/berry",
        "ui/components/ag-grid",
        "ui/layouts",
        "ui/themes",
        "features/baptism",
        "features/marriage",
        "features/funeral", 
        "features/dynamic",
        "pages/mui",
        "pages/berry",
        "config",
        "constants",
        "__tests__/core",
        "__tests__/ui",
        "__tests__/features"
    ]
    
    for directory in directories_with_index:
        index_file = base_path / directory / "index.ts"
        if not index_file.exists():
            index_file.write_text("// Auto-generated index file\n// Export all modules from this directory\n")
            print(f"Created index file: {directory}/index.ts")

def main():
    """Main reorganization function"""
    
    base_path = Path("front-end/src/features/Records-centralized")
    
    print("🚀 Starting Records-Centralized Template-Agnostic Reorganization...")
    print("=" * 70)
    
    # Create new directory structure
    print("\n📁 Creating directory structure...")
    create_directory_structure(base_path)
    
    # Move core files
    print("\n🔧 Moving core business logic files...")
    move_core_files(base_path)
    
    # Move UI components
    print("\n🎨 Moving UI components...")
    move_ui_components(base_path)
    
    # Move feature files
    print("\n⚡ Moving feature-specific files...")
    move_feature_files(base_path)
    
    # Move page files
    print("\n📄 Moving page components...")
    move_page_files(base_path)
    
    # Move config files
    print("\n⚙️ Moving configuration files...")
    move_config_files(base_path)
    
    # Move test files
    print("\n🧪 Moving test files...")
    move_test_files(base_path)
    
    # Move documentation
    print("\n📚 Moving documentation...")
    move_documentation(base_path)
    
    # Create index files
    print("\n📝 Creating index files...")
    create_index_files(base_path)
    
    print("\n" + "=" * 70)
    print("✅ Reorganization complete!")
    print("\n📋 Next steps:")
    print("1. Update import paths in all files")
    print("2. Create Berry template specific components")
    print("3. Create template configuration system")
    print("4. Test template switching functionality")
    print("\n🎯 The structure is now ready for Berry template integration!")

if __name__ == "__main__":
    main()
