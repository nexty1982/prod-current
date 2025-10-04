#!/usr/bin/env python3
"""
Setup modernize template with all dependencies and configurations from front-end
"""

import os
import shutil
import json
from pathlib import Path

def setup_modernize():
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end')
    modernize_path = Path('/var/www/orthodoxmetrics/prod/UI/modernize/frontend')
    
    print('🚀 Setting up modernize template with front-end dependencies...')
    
    # 1. Copy package.json and update scripts
    print('📦 Copying package.json...')
    package_json_src = frontend_path / 'package.json'
    package_json_dst = modernize_path / 'package.json'
    
    if package_json_src.exists():
        shutil.copy2(package_json_src, package_json_dst)
        print(f'✅ Copied package.json')
    
    # 2. Copy package-lock.json
    print('🔒 Copying package-lock.json...')
    package_lock_src = frontend_path / 'package-lock.json'
    package_lock_dst = modernize_path / 'package-lock.json'
    
    if package_lock_src.exists():
        shutil.copy2(package_lock_src, package_lock_dst)
        print(f'✅ Copied package-lock.json')
    
    # 3. Copy configuration files
    config_files = [
        'tailwind.config.js',
        'postcss.config.js',
        '.eslintrc.cjs',
        '.prettierrc',
        'tsconfig.json',
        'tsconfig.node.json'
    ]
    
    for config_file in config_files:
        src_file = frontend_path / config_file
        dst_file = modernize_path / config_file
        
        if src_file.exists():
            shutil.copy2(src_file, dst_file)
            print(f'✅ Copied {config_file}')
    
    # 4. Copy scripts directory
    scripts_src = frontend_path / 'scripts'
    scripts_dst = modernize_path / 'scripts'
    
    if scripts_src.exists():
        if scripts_dst.exists():
            shutil.rmtree(scripts_dst)
        shutil.copytree(scripts_src, scripts_dst)
        print(f'✅ Copied scripts directory')
    
    # 5. Copy public directory
    public_src = frontend_path / 'public'
    public_dst = modernize_path / 'public'
    
    if public_src.exists():
        if public_dst.exists():
            shutil.rmtree(public_dst)
        shutil.copytree(public_src, public_dst)
        print(f'✅ Copied public directory')
    
    # 6. Update vite.config.ts to include server settings
    print('⚙️  Updating vite.config.ts...')
    vite_config_content = '''import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs/promises';
import svgr from '@svgr/rollup';

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        host: '0.0.0.0',
        port: 5174,
    },
    resolve: {
        alias: {
            src: resolve(__dirname, 'src'),
            '@': resolve(__dirname, 'src'),
        },
    },
    esbuild: {
        loader: 'tsx',
        include: /src\/.*\.tsx?$/,
        exclude: [],
    },
    optimizeDeps: {
        esbuildOptions: {
            plugins: [
                {
                    name: 'load-js-files-as-tsx',
                    setup(build) {
                        build.onLoad(
                            { filter: /src\\.*\.js$/ },
                            async (args) => ({
                                loader: 'tsx',
                                contents: await fs.readFile(args.path, 'utf8'), 
                            })
                        );
                    },
                },
            ],
        },
    },
    plugins: [svgr(), react()],
});
'''
    
    with open(modernize_path / 'vite.config.ts', 'w') as f:
        f.write(vite_config_content)
    print(f'✅ Updated vite.config.ts')
    
    # 7. Update index.css with TailwindCSS
    print('🎨 Setting up TailwindCSS...')
    index_css_content = '''@tailwind base;
@tailwind components;
@tailwind utilities;

/* Orthodox Metrics - Liturgical Flow Animation */
@keyframes colorflow {
  0% {
    background-position: 0% 50%;
  }
  14.3% {
    background-position: 25% 50%;
  }
  28.6% {
    background-position: 50% 50%;
  }
  42.9% {
    background-position: 75% 50%;
  }
  57.2% {
    background-position: 100% 50%;
  }
  71.5% {
    background-position: 75% 50%;
  }
  85.8% {
    background-position: 50% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* Utility classes for liturgical styling */
.liturgical-flow {
  animation: colorflow 20s ease-in-out infinite;
  background-size: 400% 400%;
}

.orthodox-cross-glow {
  filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.6));
}

.liturgical-gradient {
  background: linear-gradient(
    135deg,
    #6B21A8 0%,     /* Purple - Lent */
    #FFD700 14.3%,  /* Gold - Resurrection */
    #DC2626 28.6%,  /* Red - Martyrs */
    #059669 42.9%,  /* Green - Ordinary Time */
    #2563EB 57.2%,  /* Blue - Theotokos */
    #F9FAFB 71.5%,  /* White - Feasts */
    #1F2937 85.8%,  /* Black - Good Friday */
    #6B21A8 100%    /* Purple - Complete cycle */
  );
}
'''
    
    with open(modernize_path / 'src' / 'index.css', 'w') as f:
        f.write(index_css_content)
    print(f'✅ Updated index.css with TailwindCSS')
    
    print(f'\n🎉 Modernize template setup complete!')
    print(f'📁 Source: {frontend_path}')
    print(f'📁 Destination: {modernize_path}')
    
    return modernize_path

if __name__ == "__main__":
    result = setup_modernize()
    print(f'\n📊 SETUP SUMMARY:')
    print(f'  Modernize path: {result}')
    print(f'  Next step: Run "npm install" in the modernize directory')
