#!/usr/bin/env python3
"""
Records Consolidation Analysis Script
Analyzes all record-related files (except src/features/records) and categorizes them
for consolidation into stage1/record_1, record_2, and record_3 directories.
"""

import os
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple, Set

class RecordsConsolidationAnalyzer:
    def __init__(self, base_path: str = "front-end/src"):
        self.base_path = base_path
        self.exclude_path = "front-end/src/features/records"  # Keep this untouched
        self.record_files = []
        self.categories = {
            'record_1': {'files': [], 'description': 'Legacy Systems & Advanced Features'},
            'record_2': {'files': [], 'description': 'Modern Components & UI Libraries'}, 
            'record_3': {'files': [], 'description': 'API, Types, Context & Infrastructure'}
        }
        
    def find_record_files(self) -> List[Dict]:
        """Find all record-related files excluding features/records"""
        record_files = []
        
        # Search patterns for record-related files
        patterns = [
            r'.*[Rr]ecord.*\.(tsx?|jsx?|css|js)$',
            r'.*[Bb]aptism.*\.(tsx?|jsx?|css|js)$',
            r'.*[Mm]arriage.*\.(tsx?|jsx?|css|js)$',
            r'.*[Ff]uneral.*\.(tsx?|jsx?|css|js)$',
            r'.*[Ss]acrament.*\.(tsx?|jsx?|css|js)$',
        ]
        
        for root, dirs, files in os.walk(self.base_path):
            # Skip features/records directory
            rel_path = os.path.relpath(root, 'front-end/src')
            if rel_path.startswith('features/records') or 'features/records' in root:
                continue
                
            # Skip node_modules, dist, etc.
            if any(skip in root for skip in ['node_modules', 'dist', '.git', '_archive']):
                continue
                
            for file in files:
                file_path = os.path.join(root, file)
                rel_file_path = os.path.relpath(file_path, 'front-end/src')
                
                # Check if file matches record patterns
                if any(re.match(pattern, file, re.IGNORECASE) for pattern in patterns):
                    file_info = self.analyze_file(file_path, rel_file_path)
                    if file_info:
                        record_files.append(file_info)
                        
        self.record_files = record_files
        return record_files
    
    def analyze_file(self, file_path: str, rel_path: str) -> Dict:
        """Analyze a single file for categorization"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            content = ""
            
        file_info = {
            'path': rel_path,
            'full_path': file_path,
            'name': os.path.basename(file_path),
            'size': len(content),
            'type': self.get_file_type(file_path, content),
            'dependencies': self.extract_dependencies(content),
            'exports': self.extract_exports(content),
            'complexity': self.assess_complexity(content),
            'framework': self.detect_framework(content),
            'category_hints': self.get_category_hints(rel_path, content)
        }
        
        return file_info
    
    def get_file_type(self, file_path: str, content: str) -> str:
        """Determine the type of file"""
        if file_path.endswith('.css'):
            return 'stylesheet'
        elif file_path.endswith('.ts') and not file_path.endswith('.tsx'):
            if 'interface' in content or 'type' in content:
                return 'types'
            elif 'export' in content and 'function' in content:
                return 'utility'
            else:
                return 'typescript'
        elif file_path.endswith('.tsx'):
            if 'export default' in content and 'React.FC' in content:
                return 'component'
            elif 'Dialog' in content or 'Modal' in content:
                return 'modal'
            else:
                return 'component'
        elif file_path.endswith('.js'):
            if 'export' in content and ('const' in content or 'function' in content):
                return 'api' if 'fetch' in content or 'axios' in content else 'utility'
            else:
                return 'javascript'
        else:
            return 'other'
    
    def extract_dependencies(self, content: str) -> List[str]:
        """Extract import dependencies"""
        imports = re.findall(r'import.*from [\'"]([^\'"]+)[\'"]', content)
        return [imp for imp in imports if not imp.startswith('.')]
    
    def extract_exports(self, content: str) -> List[str]:
        """Extract exported items"""
        exports = []
        # Find export default
        if 'export default' in content:
            match = re.search(r'export default (\w+)', content)
            if match:
                exports.append(match.group(1))
        
        # Find named exports
        named_exports = re.findall(r'export (?:const|function|class) (\w+)', content)
        exports.extend(named_exports)
        
        return exports
    
    def assess_complexity(self, content: str) -> str:
        """Assess file complexity"""
        lines = len(content.split('\n'))
        
        if lines < 50:
            return 'simple'
        elif lines < 200:
            return 'medium'
        elif lines < 500:
            return 'complex'
        else:
            return 'very_complex'
    
    def detect_framework(self, content: str) -> str:
        """Detect which framework/library the file uses"""
        if 'react-bootstrap' in content or 'Bootstrap' in content:
            return 'bootstrap'
        elif '@mui/material' in content or 'Material-UI' in content:
            return 'mui'
        elif 'ag-grid' in content:
            return 'ag-grid'
        elif 'formik' in content or 'Formik' in content:
            return 'formik'
        elif 'React' in content:
            return 'react'
        else:
            return 'vanilla'
    
    def get_category_hints(self, rel_path: str, content: str) -> List[str]:
        """Get hints for categorization"""
        hints = []
        
        # Path-based hints
        if 'views/' in rel_path:
            hints.append('legacy_view')
        if 'components/' in rel_path:
            hints.append('modern_component')
        if 'api/' in rel_path or 'services/' in rel_path:
            hints.append('infrastructure')
        if 'context/' in rel_path:
            hints.append('infrastructure')
        if 'types/' in rel_path:
            hints.append('infrastructure')
        if 'records/' in rel_path:
            hints.append('legacy_system')
        if 'examples/' in rel_path:
            hints.append('demo')
        
        # Content-based hints
        if 'certificate' in content.lower():
            hints.append('advanced_feature')
        if 'import' in content.lower() and 'modal' in content.lower():
            hints.append('advanced_feature')
        if 'ag-grid' in content.lower():
            hints.append('modern_component')
        if 'bootstrap' in content.lower():
            hints.append('legacy_system')
        if 'api' in content.lower() and 'fetch' in content.lower():
            hints.append('infrastructure')
        if 'interface' in content and 'type' in content:
            hints.append('infrastructure')
        if 'context' in content.lower() and 'provider' in content.lower():
            hints.append('infrastructure')
            
        return hints
    
    def categorize_files(self):
        """Categorize files into the three record directories"""
        for file_info in self.record_files:
            category = self.determine_category(file_info)
            self.categories[category]['files'].append(file_info)
    
    def determine_category(self, file_info: Dict) -> str:
        """Determine which category a file belongs to"""
        hints = file_info['category_hints']
        file_type = file_info['type']
        framework = file_info['framework']
        
        # record_3: API, Types, Context & Infrastructure
        if any(hint in hints for hint in ['infrastructure']):
            return 'record_3'
        if file_type in ['types', 'api', 'utility']:
            return 'record_3'
        if 'context' in file_info['path'].lower():
            return 'record_3'
        if 'api' in file_info['path'].lower() or 'services' in file_info['path'].lower():
            return 'record_3'
        if 'types' in file_info['path'].lower():
            return 'record_3'
            
        # record_1: Legacy Systems & Advanced Features  
        if any(hint in hints for hint in ['legacy_system', 'advanced_feature']):
            return 'record_1'
        if framework == 'bootstrap' or framework == 'formik':
            return 'record_1'
        if 'records/' in file_info['path']:  # src/records/ directory
            return 'record_1'
        if file_info['complexity'] == 'very_complex':
            return 'record_1'
        if 'certificate' in file_info['path'].lower():
            return 'record_1'
        if 'import' in file_info['path'].lower() and file_info['framework'] == 'bootstrap':
            return 'record_1'
            
        # record_2: Modern Components & UI Libraries (default)
        return 'record_2'
    
    def generate_move_plan(self) -> Dict:
        """Generate the consolidation plan"""
        move_plan = {
            'summary': {
                'total_files': len(self.record_files),
                'record_1_count': len(self.categories['record_1']['files']),
                'record_2_count': len(self.categories['record_2']['files']),
                'record_3_count': len(self.categories['record_3']['files'])
            },
            'categories': {},
            'moves': [],
            'import_updates': {}
        }
        
        for category_name, category_data in self.categories.items():
            move_plan['categories'][category_name] = {
                'description': category_data['description'],
                'file_count': len(category_data['files']),
                'files': []
            }
            
            for file_info in category_data['files']:
                # Calculate new path
                old_path = file_info['path']
                new_path = f"stage1/{category_name}/{os.path.basename(old_path)}"
                
                file_move = {
                    'old_path': old_path,
                    'new_path': new_path,
                    'full_old_path': file_info['full_path'],
                    'name': file_info['name'],
                    'type': file_info['type'],
                    'framework': file_info['framework'],
                    'complexity': file_info['complexity'],
                    'size': file_info['size'],
                    'exports': file_info['exports'],
                    'category_hints': file_info['category_hints']
                }
                
                move_plan['categories'][category_name]['files'].append(file_move)
                move_plan['moves'].append(file_move)
        
        return move_plan
    
    def find_import_updates_needed(self, move_plan: Dict) -> Dict:
        """Find all files that import the files being moved"""
        import_updates = {}
        
        # Create mapping of old paths to new paths
        path_mapping = {}
        for move in move_plan['moves']:
            old_import_path = './' + move['old_path'].replace('.tsx', '').replace('.ts', '').replace('.js', '')
            new_import_path = './' + move['new_path'].replace('.tsx', '').replace('.ts', '').replace('.js', '')
            path_mapping[old_import_path] = new_import_path
            
            # Also handle relative imports
            old_name = os.path.splitext(os.path.basename(move['old_path']))[0]
            path_mapping[old_name] = new_import_path
        
        # Search all frontend files for imports that need updating
        for root, dirs, files in os.walk(self.base_path):
            if any(skip in root for skip in ['node_modules', 'dist', '.git']):
                continue
                
            for file in files:
                if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, 'front-end/src')
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            
                        # Find imports that need updating
                        imports_to_update = []
                        for old_path, new_path in path_mapping.items():
                            if old_path in content:
                                imports_to_update.append({
                                    'old_import': old_path,
                                    'new_import': new_path
                                })
                        
                        if imports_to_update:
                            import_updates[rel_path] = imports_to_update
                            
                    except:
                        continue
        
        return import_updates
    
    def analyze(self) -> Dict:
        """Run complete analysis"""
        print("🔍 Finding record-related files...")
        self.find_record_files()
        
        print(f"📊 Found {len(self.record_files)} record-related files")
        
        print("🏗️ Categorizing files...")
        self.categorize_files()
        
        print("📋 Generating move plan...")
        move_plan = self.generate_move_plan()
        
        print("🔗 Analyzing import dependencies...")
        import_updates = self.find_import_updates_needed(move_plan)
        move_plan['import_updates'] = import_updates
        
        return move_plan
    
    def print_summary(self, move_plan: Dict):
        """Print a summary of the consolidation plan"""
        print("\n" + "="*60)
        print("📋 RECORDS CONSOLIDATION PLAN")
        print("="*60)
        
        print(f"\n📊 SUMMARY:")
        print(f"  Total files to move: {move_plan['summary']['total_files']}")
        print(f"  Files that import moved files: {len(move_plan['import_updates'])}")
        
        for category_name, category_data in move_plan['categories'].items():
            print(f"\n📁 {category_name.upper()} - {category_data['description']}")
            print(f"  Files: {category_data['file_count']}")
            
            # Group by current directory
            by_directory = {}
            for file_move in category_data['files']:
                current_dir = os.path.dirname(file_move['old_path'])
                if current_dir not in by_directory:
                    by_directory[current_dir] = []
                by_directory[current_dir].append(file_move)
            
            for directory, files in by_directory.items():
                print(f"    📂 {directory}/ ({len(files)} files)")
                for file_move in files[:3]:  # Show first 3 files
                    print(f"      • {file_move['name']} ({file_move['type']}, {file_move['framework']})")
                if len(files) > 3:
                    print(f"      ... and {len(files) - 3} more files")
        
        print(f"\n🔗 IMPORT UPDATES NEEDED:")
        print(f"  {len(move_plan['import_updates'])} files need import path updates")
        
        # Show top files that need updates
        for file_path, updates in list(move_plan['import_updates'].items())[:5]:
            print(f"    📄 {file_path} ({len(updates)} imports)")
        
        if len(move_plan['import_updates']) > 5:
            print(f"    ... and {len(move_plan['import_updates']) - 5} more files")
    
    def save_detailed_plan(self, move_plan: Dict, output_file: str = "records_consolidation_plan.json"):
        """Save detailed plan to JSON file"""
        with open(output_file, 'w') as f:
            json.dump(move_plan, f, indent=2)
        print(f"\n💾 Detailed plan saved to: {output_file}")
        
    def generate_move_script(self, move_plan: Dict, script_file: str = "execute_records_consolidation.py"):
        """Generate a script to execute the moves"""
        script_content = f'''#!/usr/bin/env python3
"""
Generated script to execute records consolidation
Run this script to move all record files to their new locations
"""

import os
import shutil
from pathlib import Path

def create_directories():
    """Create the new stage1 directories"""
    directories = ["front-end/src/stage1/record_1", "front-end/src/stage1/record_2", "front-end/src/stage1/record_3"]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"✅ Created directory: {{directory}}")

def move_files():
    """Move all files to their new locations"""
    moves = {json.dumps(move_plan['moves'], indent=4)}
    
    for move in moves:
        old_path = f"front-end/src/{{move['old_path']}}"
        new_path = f"front-end/src/{{move['new_path']}}"
        
        if os.path.exists(old_path):
            shutil.move(old_path, new_path)
            print(f"📦 Moved: {{move['old_path']}} → {{move['new_path']}}")
        else:
            print(f"⚠️  File not found: {{old_path}}")

def update_imports():
    """Update import statements in affected files"""
    import_updates = {json.dumps(move_plan['import_updates'], indent=4)}
    
    for file_path, updates in import_updates.items():
        full_path = f"front-end/src/{{file_path}}"
        
        if os.path.exists(full_path):
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            for update in updates:
                content = content.replace(update['old_import'], update['new_import'])
            
            if content != original_content:
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"🔧 Updated imports in: {{file_path}}")

if __name__ == "__main__":
    print("🚀 Starting records consolidation...")
    
    create_directories()
    print("\\n📦 Moving files...")
    move_files()
    
    print("\\n🔧 Updating imports...")
    update_imports()
    
    print("\\n✅ Records consolidation complete!")
    print("\\n⚠️  IMPORTANT: Test the application thoroughly after this change!")
'''
        
        with open(script_file, 'w') as f:
            f.write(script_content)
        
        # Make script executable
        os.chmod(script_file, 0o755)
        print(f"🔧 Execution script saved to: {script_file}")

def main():
    analyzer = RecordsConsolidationAnalyzer()
    move_plan = analyzer.analyze()
    
    analyzer.print_summary(move_plan)
    analyzer.save_detailed_plan(move_plan)
    analyzer.generate_move_script(move_plan)
    
    print("\n" + "="*60)
    print("🎯 NEXT STEPS:")
    print("1. Review the consolidation plan in records_consolidation_plan.json")
    print("2. If plan looks good, run: python3 execute_records_consolidation.py")
    print("3. Test the application thoroughly")
    print("4. Update any remaining import paths manually if needed")
    print("="*60)

if __name__ == "__main__":
    main()
