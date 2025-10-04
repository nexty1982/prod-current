#!/usr/bin/env python3
"""
Card View Records Refactor Analysis
Analyzes card view record components for moving to features/records/card_view
"""

import os
import json
import re
from pathlib import Path
from typing import List, Dict

class CardViewRefactorAnalyzer:
    def __init__(self):
        self.base_path = "front-end/src"
        self.target_dir = "front-end/src/features/records/card_view"
        self.card_view_files = []
        
    def identify_card_view_files(self):
        """Identify files that belong to the card view system"""
        
        # Primary card view components
        card_view_components = [
            "components/apps/records/recordGrid/RecordCard.tsx",
            "components/apps/records/recordGrid/RecordFilter.tsx", 
            "components/apps/records/recordGrid/RecordList.tsx",
            "components/apps/records/recordGrid/RecordSearch.tsx",
            "components/apps/records/recordGrid/RecordSidebar.tsx",
        ]
        
        # Supporting files for card view
        supporting_files = [
            "pages/apps/records/index.tsx",  # RecordsManagement component
            "context/RecordsContext.tsx",    # Context for card view
        ]
        
        # Assets and related files
        related_files = []
        
        # Check which files actually exist and analyze them
        all_candidates = card_view_components + supporting_files + related_files
        
        for file_path in all_candidates:
            full_path = f"front-end/src/{file_path}"
            if os.path.exists(full_path):
                file_info = self.analyze_file(full_path, file_path)
                self.card_view_files.append(file_info)
        
        return self.card_view_files
    
    def analyze_file(self, full_path: str, rel_path: str):
        """Analyze a single file"""
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            content = ""
            
        # Extract imports and exports
        imports = re.findall(r'import.*from [\'"]([^\'"]+)[\'"]', content)
        exports = self.extract_exports(content)
        
        # Check dependencies on other card view components
        card_view_deps = []
        for imp in imports:
            if any(comp in imp for comp in ['RecordCard', 'RecordFilter', 'RecordList', 'RecordSearch', 'RecordSidebar', 'RecordsContext']):
                card_view_deps.append(imp)
        
        return {
            'rel_path': rel_path,
            'full_path': full_path,
            'name': os.path.basename(full_path),
            'size': len(content),
            'lines': len(content.split('\n')),
            'imports': imports,
            'exports': exports,
            'card_view_deps': card_view_deps,
            'external_deps': [imp for imp in imports if not imp.startswith('.')],
            'internal_deps': [imp for imp in imports if imp.startswith('.')],
            'new_path': f"features/records/card_view/{os.path.basename(full_path)}"
        }
    
    def extract_exports(self, content: str):
        """Extract exported items"""
        exports = []
        
        # Export default
        default_match = re.search(r'export default (\w+)', content)
        if default_match:
            exports.append(f"default:{default_match.group(1)}")
        
        # Named exports
        named_exports = re.findall(r'export (?:const|function|class|interface|type) (\w+)', content)
        exports.extend(named_exports)
        
        return exports
    
    def find_files_that_import_card_view(self):
        """Find all files that import card view components"""
        importing_files = []
        
        # Components to search for
        card_view_component_names = [
            'RecordCard', 'RecordFilter', 'RecordList', 'RecordSearch', 'RecordSidebar',
            'RecordsManagement', 'RecordProvider', 'RecordsContext', 'useRecords'
        ]
        
        # Search all source files
        for root, dirs, files in os.walk(self.base_path):
            if any(skip in root for skip in ['node_modules', 'dist', '.git', '_archive']):
                continue
                
            for file in files:
                if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, 'front-end/src')
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            
                        # Check for imports of card view components
                        found_imports = []
                        for component_name in card_view_component_names:
                            if component_name in content:
                                # More precise matching
                                import_patterns = [
                                    f'import.*{component_name}.*from',
                                    f'import.*{{.*{component_name}.*}}.*from',
                                    f'<{component_name}',
                                    f'const.*=.*{component_name}'
                                ]
                                
                                for pattern in import_patterns:
                                    if re.search(pattern, content):
                                        found_imports.append(component_name)
                                        break
                        
                        if found_imports:
                            importing_files.append({
                                'path': rel_path,
                                'full_path': file_path,
                                'imports': found_imports,
                                'import_lines': self.find_import_lines(content, found_imports)
                            })
                            
                    except:
                        continue
        
        return importing_files
    
    def find_import_lines(self, content: str, component_names: List[str]) -> List[str]:
        """Find the actual import lines for components"""
        import_lines = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines):
            if 'import' in line and 'from' in line:
                if any(comp in line for comp in component_names):
                    import_lines.append(f"Line {i+1}: {line.strip()}")
        
        return import_lines
    
    def calculate_new_import_paths(self):
        """Calculate new import paths after refactoring"""
        path_updates = {}
        
        for file_info in self.card_view_files:
            old_path = file_info['rel_path']
            new_path = file_info['new_path']
            
            # Calculate relative import paths from common locations
            component_name = os.path.splitext(file_info['name'])[0]
            
            # From components directory
            path_updates[f"../../../components/apps/records/recordGrid/{file_info['name']}"] = f"./card_view/{file_info['name']}"
            path_updates[f"./components/apps/records/recordGrid/{component_name}"] = f"./features/records/card_view/{component_name}"
            path_updates[f"../components/apps/records/recordGrid/{component_name}"] = f"../features/records/card_view/{component_name}"
            
            # From pages directory  
            path_updates[f"../../../context/RecordsContext"] = f"../features/records/card_view/RecordsContext"
            
        return path_updates
    
    def generate_refactor_plan(self):
        """Generate the complete refactor plan"""
        print("🔍 Identifying card view files...")
        card_view_files = self.identify_card_view_files()
        
        print("🔗 Finding files that import card view components...")
        importing_files = self.find_files_that_import_card_view()
        
        print("📐 Calculating new import paths...")
        path_updates = self.calculate_new_import_paths()
        
        plan = {
            'summary': {
                'files_to_move': len(card_view_files),
                'files_to_update': len(importing_files),
                'target_directory': self.target_dir
            },
            'files_to_move': card_view_files,
            'files_to_update': importing_files,
            'path_updates': path_updates,
            'steps': [
                "1. Create target directory: features/records/card_view/",
                "2. Move card view components to new location",
                "3. Update internal imports within moved files",
                "4. Update external imports in files that use card view",
                "5. Update Router.tsx import for RecordsManagement",
                "6. Test card view functionality",
                "7. Clean up empty directories"
            ]
        }
        
        return plan
    
    def print_plan_summary(self, plan):
        """Print a summary of the refactor plan"""
        print("\n" + "="*60)
        print("📋 CARD VIEW REFACTOR PLAN")
        print("="*60)
        
        print(f"\n📊 SUMMARY:")
        print(f"  Files to move: {plan['summary']['files_to_move']}")
        print(f"  Files to update: {plan['summary']['files_to_update']}")
        print(f"  Target: {plan['summary']['target_directory']}")
        
        print(f"\n📁 FILES TO MOVE:")
        for file_info in plan['files_to_move']:
            print(f"  📄 {file_info['rel_path']}")
            print(f"      → {file_info['new_path']}")
            print(f"      Size: {file_info['lines']} lines, Framework: {file_info.get('framework', 'unknown')}")
            if file_info['card_view_deps']:
                print(f"      Card deps: {', '.join(file_info['card_view_deps'])}")
            print()
        
        print(f"\n🔗 FILES TO UPDATE (Top 10):")
        for file_info in plan['files_to_update'][:10]:
            print(f"  📄 {file_info['path']}")
            print(f"      Imports: {', '.join(file_info['imports'])}")
            for import_line in file_info['import_lines'][:2]:
                print(f"      {import_line}")
            print()
        
        if len(plan['files_to_update']) > 10:
            print(f"  ... and {len(plan['files_to_update']) - 10} more files")
        
        print("\n📋 EXECUTION STEPS:")
        for step in plan['steps']:
            print(f"  {step}")
    
    def save_plan(self, plan, filename="card_view_refactor_plan.json"):
        """Save the plan to a JSON file"""
        with open(filename, 'w') as f:
            json.dump(plan, f, indent=2)
        print(f"\n💾 Detailed plan saved to: {filename}")

def main():
    analyzer = CardViewRefactorAnalyzer()
    plan = analyzer.generate_refactor_plan()
    
    analyzer.print_plan_summary(plan)
    analyzer.save_plan(plan)
    
    print("\n" + "="*60)
    print("🎯 RECOMMENDATION:")
    print("This is a focused refactor that organizes card view components")
    print("under the existing features/records/ structure.")
    print("") 
    print("✅ BENEFITS:")
    print("  • Logical organization by UI pattern")
    print("  • Keeps related features together")
    print("  • Smaller scope than full consolidation")
    print("  • Maintains features/records/ as primary location")
    print("")
    print("⚠️  CONSIDERATIONS:")
    print(f"  • {plan['summary']['files_to_update']} files need import updates")
    print("  • Router.tsx needs import path update")
    print("  • MenuItems.ts may need updates")
    print("="*60)

if __name__ == "__main__":
    main()
