#!/usr/bin/env python3
"""
Test the cleaned application for functionality
"""

import os
import re
from pathlib import Path
import subprocess
import json

def check_import_consistency():
    """Check for broken imports after cleanup"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('🔍 Checking import consistency...')
    
    broken_imports = []
    import_patterns = [
        r"import.*from\s+['\"]([^'\"]+)['\"]",
        r"import\s+['\"]([^'\"]+)['\"]",
        r"require\(['\"]([^'\"]+)['\"]\)"
    ]
    
    # Walk through all files
    for root, dirs, files in os.walk(frontend_path):
        if 'node_modules' in root or '.git' in root:
            continue
            
        relative_path = Path(root).relative_to(frontend_path)
        
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx')):
                file_path = relative_path / file
                file_str = str(file_path)
                
                try:
                    with open(frontend_path / file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Check for imports
                    for pattern in import_patterns:
                        matches = re.findall(pattern, content)
                        for match in matches:
                            # Check if it's a relative import
                            if match.startswith('./') or match.startswith('../'):
                                # Resolve the import path
                                import_path = (frontend_path / file_path.parent / match).resolve()
                                
                                # Check if the file exists
                                if not import_path.exists():
                                    # Try with different extensions
                                    extensions = ['.tsx', '.ts', '.js', '.jsx', '/index.tsx', '/index.ts', '/index.js']
                                    found = False
                                    for ext in extensions:
                                        if (import_path.parent / (import_path.stem + ext)).exists():
                                            found = True
                                            break
                                    
                                    if not found:
                                        broken_imports.append({
                                            'file': file_str,
                                            'import': match,
                                            'line': content[:content.find(match)].count('\n') + 1
                                        })
                
                except Exception as e:
                    print(f'  ⚠️  Error reading {file_str}: {e}')
    
    return broken_imports

def check_package_json():
    """Check package.json for consistency"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end')
    
    print('📦 Checking package.json...')
    
    package_json_path = frontend_path / 'package.json'
    
    if not package_json_path.exists():
        return {'error': 'package.json not found'}
    
    try:
        with open(package_json_path, 'r') as f:
            package_data = json.load(f)
        
        return {
            'dependencies': len(package_data.get('dependencies', {})),
            'devDependencies': len(package_data.get('devDependencies', {})),
            'scripts': list(package_data.get('scripts', {}).keys())
        }
    except Exception as e:
        return {'error': f'Error reading package.json: {e}'}

def check_tsconfig():
    """Check TypeScript configuration"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end')
    
    print('⚙️  Checking TypeScript configuration...')
    
    tsconfig_path = frontend_path / 'tsconfig.json'
    
    if not tsconfig_path.exists():
        return {'error': 'tsconfig.json not found'}
    
    try:
        with open(tsconfig_path, 'r') as f:
            tsconfig_data = json.load(f)
        
        return {
            'compilerOptions': tsconfig_data.get('compilerOptions', {}),
            'include': tsconfig_data.get('include', []),
            'exclude': tsconfig_data.get('exclude', [])
        }
    except Exception as e:
        return {'error': f'Error reading tsconfig.json: {e}'}

def check_build_script():
    """Check if the build script works"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end')
    
    print('🔨 Testing build script...')
    
    try:
        # Change to frontend directory and run build
        result = subprocess.run(
            ['npm', 'run', 'build'],
            cwd=frontend_path,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        return {
            'returncode': result.returncode,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'success': result.returncode == 0
        }
    except subprocess.TimeoutExpired:
        return {'error': 'Build script timed out after 5 minutes'}
    except Exception as e:
        return {'error': f'Error running build script: {e}'}

def check_dev_server():
    """Check if the dev server can start"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end')
    
    print('🚀 Testing dev server startup...')
    
    try:
        # Start dev server in background
        process = subprocess.Popen(
            ['npm', 'run', 'dev'],
            cwd=frontend_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait a bit for startup
        import time
        time.sleep(10)
        
        # Check if process is still running
        if process.poll() is None:
            # Process is still running, which is good
            process.terminate()
            return {'success': True, 'message': 'Dev server started successfully'}
        else:
            # Process exited, get output
            stdout, stderr = process.communicate()
            return {
                'success': False,
                'stdout': stdout,
                'stderr': stderr
            }
    except Exception as e:
        return {'error': f'Error testing dev server: {e}'}

def check_cleanup_backups():
    """Check cleanup backup files"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    
    print('💾 Checking cleanup backup files...')
    
    backup_files = []
    
    # Walk through all files looking for backup files
    for root, dirs, files in os.walk(frontend_path):
        for file in files:
            if file.endswith('.cleanup_backup'):
                backup_files.append({
                    'file': file,
                    'path': str(Path(root).relative_to(frontend_path) / file)
                })
    
    return backup_files

def generate_test_report(results):
    """Generate a comprehensive test report"""
    print('📊 Generating test report...')
    
    report_content = f'''# Application Cleanup Test Report

## Overview
This report documents the testing of the application after legacy component cleanup.

## Test Results

### Import Consistency Check
**Status**: {'✅ PASSED' if len(results['broken_imports']) == 0 else '❌ FAILED'}
**Broken Imports**: {len(results['broken_imports'])}

'''
    
    if results['broken_imports']:
        report_content += '**Broken Imports Found:**\n\n'
        for broken in results['broken_imports']:
            report_content += f'- **File**: `{broken["file"]}`\n'
            report_content += f'  - **Import**: `{broken["import"]}`\n'
            report_content += f'  - **Line**: {broken["line"]}\n\n'
    else:
        report_content += 'No broken imports found.\n\n'
    
    report_content += f'''
### Package.json Check
**Status**: {'✅ PASSED' if 'error' not in results['package_json'] else '❌ FAILED'}

'''
    
    if 'error' in results['package_json']:
        report_content += f'**Error**: {results["package_json"]["error"]}\n\n'
    else:
        report_content += f'**Dependencies**: {results["package_json"]["dependencies"]}\n'
        report_content += f'**Dev Dependencies**: {results["package_json"]["devDependencies"]}\n'
        report_content += f'**Scripts**: {", ".join(results["package_json"]["scripts"])}\n\n'
    
    report_content += f'''
### TypeScript Configuration
**Status**: {'✅ PASSED' if 'error' not in results['tsconfig'] else '❌ FAILED'}

'''
    
    if 'error' in results['tsconfig']:
        report_content += f'**Error**: {results["tsconfig"]["error"]}\n\n'
    else:
        report_content += 'TypeScript configuration loaded successfully.\n\n'
    
    report_content += f'''
### Build Script Test
**Status**: {'✅ PASSED' if results['build_test']['success'] else '❌ FAILED'}

'''
    
    if 'error' in results['build_test']:
        report_content += f'**Error**: {results["build_test"]["error"]}\n\n'
    else:
        report_content += f'**Return Code**: {results["build_test"]["returncode"]}\n'
        if results['build_test']['stderr']:
            report_content += f'**Errors**:\n```\n{results["build_test"]["stderr"]}\n```\n\n'
    
    report_content += f'''
### Dev Server Test
**Status**: {'✅ PASSED' if results['dev_server']['success'] else '❌ FAILED'}

'''
    
    if 'error' in results['dev_server']:
        report_content += f'**Error**: {results["dev_server"]["error"]}\n\n'
    else:
        report_content += f'**Message**: {results["dev_server"].get("message", "Unknown")}\n\n'
    
    report_content += f'''
### Cleanup Backup Files
**Backup Files Found**: {len(results['backup_files'])}

'''
    
    for backup in results['backup_files']:
        report_content += f'- **{backup["file"]}** - `{backup["path"]}`\n'
    
    report_content += f'''
## Summary

- **Import Consistency**: {'✅ PASSED' if len(results['broken_imports']) == 0 else '❌ FAILED'}
- **Package.json**: {'✅ PASSED' if 'error' not in results['package_json'] else '❌ FAILED'}
- **TypeScript Config**: {'✅ PASSED' if 'error' not in results['tsconfig'] else '❌ FAILED'}
- **Build Script**: {'✅ PASSED' if results['build_test']['success'] else '❌ FAILED'}
- **Dev Server**: {'✅ PASSED' if results['dev_server']['success'] else '❌ FAILED'}
- **Backup Files**: {len(results['backup_files'])} files

## Recommendations

1. **Review Broken Imports**: Fix any broken imports found
2. **Test Functionality**: Manually test key application features
3. **Review Backups**: Check backup files before permanent deletion
4. **Update Documentation**: Update any documentation that references deleted files

## Next Steps

1. Fix any broken imports
2. Test application functionality manually
3. Remove backup files after verification
4. Continue with migration or further cleanup
'''
    
    with open('/var/www/orthodoxmetrics/prod/front-end/CLEANUP_TEST_REPORT.md', 'w') as f:
        f.write(report_content)
    
    print('✅ Generated test report: CLEANUP_TEST_REPORT.md')

def main():
    """Main function"""
    print('🚀 Starting application cleanup test...')
    
    # Run all tests
    results = {
        'broken_imports': check_import_consistency(),
        'package_json': check_package_json(),
        'tsconfig': check_tsconfig(),
        'build_test': check_build_script(),
        'dev_server': check_dev_server(),
        'backup_files': check_cleanup_backups()
    }
    
    # Generate report
    generate_test_report(results)
    
    # Print summary
    print(f'\n📊 Test Summary:')
    print(f'  Broken imports: {len(results["broken_imports"])}')
    print(f'  Package.json: {"✅" if "error" not in results["package_json"] else "❌"}')
    print(f'  TypeScript config: {"✅" if "error" not in results["tsconfig"] else "❌"}')
    print(f'  Build script: {"✅" if results["build_test"]["success"] else "❌"}')
    print(f'  Dev server: {"✅" if results["dev_server"]["success"] else "❌"}')
    print(f'  Backup files: {len(results["backup_files"])}')
    
    return results

if __name__ == "__main__":
    result = main()
