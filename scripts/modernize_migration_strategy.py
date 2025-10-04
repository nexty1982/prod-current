#!/usr/bin/env python3
"""
Comprehensive migration strategy from front-end/src to modernize template
"""

import os
import json
import shutil
from pathlib import Path
from collections import defaultdict

def analyze_existing_structure():
    """Analyze the existing front-end structure to understand what needs to be migrated"""
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    modernize_path = Path('/var/www/orthodoxmetrics/prod/UI/modernize/frontend/src')
    
    print('🔍 Analyzing existing front-end structure...')
    
    # Analyze file structure
    file_analysis = {
        'components': [],
        'pages': [],
        'contexts': [],
        'hooks': [],
        'utils': [],
        'services': [],
        'types': [],
        'constants': [],
        'styles': [],
        'assets': []
    }
    
    # Walk through the front-end directory
    for root, dirs, files in os.walk(frontend_path):
        if 'node_modules' in root or '.git' in root:
            continue
            
        relative_path = Path(root).relative_to(frontend_path)
        
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx')):
                file_path = Path(root) / file
                file_info = {
                    'path': str(relative_path / file),
                    'size': file_path.stat().st_size,
                    'type': 'unknown'
                }
                
                # Categorize files
                if 'component' in str(relative_path).lower():
                    file_info['type'] = 'component'
                    file_analysis['components'].append(file_info)
                elif 'page' in str(relative_path).lower():
                    file_info['type'] = 'page'
                    file_analysis['pages'].append(file_info)
                elif 'context' in str(relative_path).lower():
                    file_info['type'] = 'context'
                    file_analysis['contexts'].append(file_info)
                elif 'hook' in str(relative_path).lower():
                    file_info['type'] = 'hook'
                    file_analysis['hooks'].append(file_info)
                elif 'util' in str(relative_path).lower():
                    file_info['type'] = 'util'
                    file_analysis['utils'].append(file_info)
                elif 'service' in str(relative_path).lower():
                    file_info['type'] = 'service'
                    file_analysis['services'].append(file_info)
                elif 'type' in str(relative_path).lower():
                    file_info['type'] = 'type'
                    file_analysis['types'].append(file_info)
                elif 'constant' in str(relative_path).lower():
                    file_info['type'] = 'constant'
                    file_analysis['constants'].append(file_info)
    
    # Analyze dependencies
    print('📦 Analyzing dependencies...')
    package_json_path = frontend_path.parent / 'package.json'
    if package_json_path.exists():
        with open(package_json_path, 'r') as f:
            package_data = json.load(f)
        
        dependencies = package_data.get('dependencies', {})
        dev_dependencies = package_data.get('devDependencies', {})
    else:
        dependencies = {}
        dev_dependencies = {}
    
    return {
        'file_analysis': file_analysis,
        'dependencies': dependencies,
        'dev_dependencies': dev_dependencies,
        'total_files': sum(len(files) for files in file_analysis.values())
    }

def create_migration_plan(analysis):
    """Create a comprehensive migration plan"""
    print('📋 Creating migration plan...')
    
    plan = {
        'phases': [],
        'dependencies_to_install': [],
        'files_to_migrate': [],
        'files_to_refactor': [],
        'new_architecture': {}
    }
    
    # Phase 1: Foundation Setup
    plan['phases'].append({
        'name': 'Foundation Setup',
        'description': 'Set up modernize template with essential dependencies and structure',
        'tasks': [
            'Install core dependencies (React, TypeScript, Vite)',
            'Set up TailwindCSS and PostCSS',
            'Configure build tools and linting',
            'Create base directory structure',
            'Set up routing and navigation'
        ]
    })
    
    # Phase 2: Core Infrastructure
    plan['phases'].append({
        'name': 'Core Infrastructure',
        'description': 'Migrate core infrastructure components',
        'tasks': [
            'Migrate context providers (Auth, Theme, etc.)',
            'Set up state management',
            'Configure API services and axios',
            'Set up error handling and logging',
            'Configure internationalization'
        ]
    })
    
    # Phase 3: UI Components
    plan['phases'].append({
        'name': 'UI Components',
        'description': 'Migrate and modernize UI components',
        'tasks': [
            'Migrate base components (Button, Input, etc.)',
            'Migrate layout components',
            'Migrate form components',
            'Migrate data display components',
            'Update component styling to use TailwindCSS'
        ]
    })
    
    # Phase 4: Pages and Features
    plan['phases'].append({
        'name': 'Pages and Features',
        'description': 'Migrate pages and feature modules',
        'tasks': [
            'Migrate authentication pages',
            'Migrate dashboard pages',
            'Migrate records management',
            'Migrate church management',
            'Migrate other feature pages'
        ]
    })
    
    # Phase 5: Integration and Testing
    plan['phases'].append({
        'name': 'Integration and Testing',
        'description': 'Final integration and testing',
        'tasks': [
            'Test all migrated functionality',
            'Fix any remaining issues',
            'Optimize performance',
            'Update documentation',
            'Deploy and verify'
        ]
    })
    
    # Identify dependencies to install
    essential_deps = [
        'react', 'react-dom', 'react-router-dom',
        '@mui/material', '@mui/icons-material', '@mui/lab',
        'tailwindcss', 'postcss', 'autoprefixer',
        'axios', 'socket.io-client',
        'formik', 'yup',
        'framer-motion', 'date-fns',
        'lodash', 'prop-types'
    ]
    
    plan['dependencies_to_install'] = essential_deps
    
    return plan

def create_modernize_structure():
    """Create the modernize template structure"""
    modernize_path = Path('/var/www/orthodoxmetrics/prod/UI/modernize/frontend/src')
    
    print('🏗️  Creating modernize template structure...')
    
    # Create directory structure
    directories = [
        'components/base',
        'components/ui',
        'components/forms',
        'components/layout',
        'components/data',
        'pages/auth',
        'pages/dashboard',
        'pages/records',
        'pages/church',
        'context',
        'hooks',
        'utils',
        'services',
        'types',
        'constants',
        'styles',
        'assets',
        'layouts',
        'routes'
    ]
    
    for directory in directories:
        dir_path = modernize_path / directory
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f'✅ Created: {directory}')
    
    return modernize_path

def migrate_core_infrastructure():
    """Migrate core infrastructure components"""
    print('🔧 Migrating core infrastructure...')
    
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end/src')
    modernize_path = Path('/var/www/orthodoxmetrics/prod/UI/modernize/frontend/src')
    
    # Files to migrate with refactoring
    core_files = [
        'context/AuthContext.tsx',
        'context/ThemeContext.tsx',
        'context/ChurchRecordsContext.tsx',
        'context/WebSocketContext.tsx',
        'utils/axiosInstance.ts',
        'utils/constants.ts',
        'types/index.ts'
    ]
    
    migrated_files = []
    
    for file_path in core_files:
        src_file = frontend_path / file_path
        dst_file = modernize_path / file_path
        
        if src_file.exists():
            # Create destination directory
            dst_file.parent.mkdir(parents=True, exist_ok=True)
            
            # Copy and refactor file
            with open(src_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Basic refactoring - update imports to use @ alias
            content = content.replace("from '../../../", "from '@/")
            content = content.replace("from '../../", "from '@/")
            content = content.replace("from '../", "from '@/")
            
            with open(dst_file, 'w', encoding='utf-8') as f:
                f.write(content)
            
            migrated_files.append(file_path)
            print(f'✅ Migrated: {file_path}')
    
    return migrated_files

def create_migration_guide():
    """Create a comprehensive migration guide"""
    guide_content = '''# Modernize Template Migration Guide

## Overview
This guide outlines the migration from `prod/front-end/src` to `prod/UI/modernize/frontend/src`.

## Migration Strategy

### Phase 1: Foundation Setup ✅
- [x] Set up modernize template with Vite + TypeScript
- [x] Configure TailwindCSS and PostCSS
- [x] Install essential dependencies
- [x] Create base directory structure

### Phase 2: Core Infrastructure 🔄
- [ ] Migrate context providers
- [ ] Set up state management
- [ ] Configure API services
- [ ] Set up error handling
- [ ] Configure internationalization

### Phase 3: UI Components 📋
- [ ] Migrate base components
- [ ] Migrate layout components
- [ ] Migrate form components
- [ ] Update styling to TailwindCSS

### Phase 4: Pages and Features 📋
- [ ] Migrate authentication pages
- [ ] Migrate dashboard pages
- [ ] Migrate records management
- [ ] Migrate church management

### Phase 5: Integration and Testing 📋
- [ ] Test all functionality
- [ ] Fix remaining issues
- [ ] Optimize performance
- [ ] Update documentation

## Key Differences

### Architecture Changes
- **Old**: Mixed component organization
- **New**: Clean separation of concerns with dedicated directories

### Styling Changes
- **Old**: Mix of CSS modules and inline styles
- **New**: TailwindCSS utility-first approach

### Import Changes
- **Old**: Relative imports (`../../../`)
- **New**: Absolute imports with `@/` alias

### Component Structure
- **Old**: Large, monolithic components
- **New**: Smaller, focused, reusable components

## Migration Checklist

### For Each Component:
1. [ ] Analyze dependencies
2. [ ] Update imports to use `@/` alias
3. [ ] Convert styling to TailwindCSS
4. [ ] Break down large components
5. [ ] Add TypeScript types
6. [ ] Test functionality
7. [ ] Update documentation

### For Each Page:
1. [ ] Identify required components
2. [ ] Migrate components first
3. [ ] Update routing
4. [ ] Test page functionality
5. [ ] Update navigation

## Best Practices

1. **Start Small**: Begin with simple components
2. **Test Frequently**: Test after each migration
3. **Maintain Functionality**: Don't break existing features
4. **Document Changes**: Keep track of what's been migrated
5. **Refactor Gradually**: Don't try to migrate everything at once

## Common Issues and Solutions

### Import Errors
- **Problem**: Relative imports not working
- **Solution**: Use `@/` alias for absolute imports

### Styling Issues
- **Problem**: CSS not applying correctly
- **Solution**: Convert to TailwindCSS classes

### Type Errors
- **Problem**: TypeScript errors after migration
- **Solution**: Add proper type definitions

### Component Dependencies
- **Problem**: Missing component dependencies
- **Solution**: Migrate dependencies first

## Next Steps

1. Complete Phase 2 (Core Infrastructure)
2. Begin Phase 3 (UI Components)
3. Test each migration step
4. Document any issues found
5. Continue with remaining phases
'''
    
    with open('/var/www/orthodoxmetrics/prod/UI/modernize/frontend/MIGRATION_GUIDE.md', 'w') as f:
        f.write(guide_content)
    
    print('✅ Created migration guide')

def main():
    """Main migration function"""
    print('🚀 Starting comprehensive modernize migration...')
    
    # Step 1: Analyze existing structure
    analysis = analyze_existing_structure()
    print(f'�� Found {analysis["total_files"]} files to analyze')
    
    # Step 2: Create migration plan
    plan = create_migration_plan(analysis)
    print(f'�� Created {len(plan["phases"])} migration phases')
    
    # Step 3: Create modernize structure
    modernize_path = create_modernize_structure()
    print(f'🏗️  Created modernize structure at {modernize_path}')
    
    # Step 4: Migrate core infrastructure
    migrated_files = migrate_core_infrastructure()
    print(f'✅ Migrated {len(migrated_files)} core files')
    
    # Step 5: Create migration guide
    create_migration_guide()
    
    print(f'\n🎉 Migration setup complete!')
    print(f'📁 Modernize path: {modernize_path}')
    print(f'📋 Next steps: Follow the migration guide to continue')
    
    return {
        'analysis': analysis,
        'plan': plan,
        'modernize_path': modernize_path,
        'migrated_files': migrated_files
    }

if __name__ == "__main__":
    result = main()
    print(f'\n📊 MIGRATION SUMMARY:')
    print(f'  Total files analyzed: {result["analysis"]["total_files"]}')
    print(f'  Migration phases: {len(result["plan"]["phases"])}')
    print(f'  Core files migrated: {len(result["migrated_files"])}')
    print(f'  Modernize path: {result["modernize_path"]}')
