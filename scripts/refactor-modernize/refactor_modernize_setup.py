#!/usr/bin/env python3
"""
Refactor and properly set up modernize template with necessary dependencies
"""

import os
import json
from pathlib import Path

def refactor_modernize_setup():
    frontend_path = Path('/var/www/orthodoxmetrics/prod/front-end')
    modernize_path = Path('/var/www/orthodoxmetrics/prod/UI/modernize/frontend')
    
    print('🔧 Refactoring modernize template setup...')
    
    # 1. Read original package.json to extract dependencies
    print('📦 Analyzing original dependencies...')
    original_package = frontend_path / 'package.json'
    
    if not original_package.exists():
        print('❌ Original package.json not found')
        return
    
    with open(original_package, 'r') as f:
        original_data = json.load(f)
    
    # 2. Create refactored package.json for modernize
    print('📝 Creating refactored package.json...')
    
    # Essential dependencies for modernize template
    essential_deps = {
        # Core React and routing
        "react": "19.0.0-rc-02c0e824-20241028",
        "react-dom": "19.0.0-rc-02c0e824-20241028",
        "react-router-dom": "^6.8.1",
        
        # Material-UI (already in modernize)
        "@mui/material": "^6.1.6",
        "@mui/icons-material": "^5.14.13",
        "@mui/lab": "6.0.0-beta.10",
        "@mui/system": "^6.1.10",
        "@mui/x-charts": "7.23.1",
        "@mui/x-date-pickers": "7.18.0",
        "@mui/x-tree-view": "^7.18.0",
        
        # Styling and UI
        "@emotion/react": "^11.13.3",
        "@emotion/styled": "^11.13.0",
        "@emotion/cache": "^11.11.0",
        "@emotion/server": "^11.11.0",
        
        # TailwindCSS
        "tailwindcss": "^3.4.0",
        "postcss": "^8.4.0",
        "autoprefixer": "^10.4.0",
        
        # Icons
        "@tabler/icons-react": "^2.39.0",
        "@svgr/rollup": "8.1.0",
        
        # Forms and validation
        "formik": "^2.4.5",
        "formik-mui": "^5.0.0-alpha.0",
        "yup": "^0.32.11",
        
        # Data handling
        "@tanstack/react-table": "^8.20.1",
        "lodash": "^4.17.21",
        "date-fns": "^2.30.0",
        "dayjs": "^1.11.13",
        "moment": "^2.29.4",
        
        # Charts and visualization
        "apexcharts": "3.48.0",
        "react-apexcharts": "^1.4.1",
        
        # Drag and drop
        "@dnd-kit/core": "^6.3.1",
        "@dnd-kit/sortable": "^10.0.0",
        "@dnd-kit/utilities": "^3.2.2",
        "@hello-pangea/dnd": "^17.0.0",
        
        # Animation
        "framer-motion": "^10.16.4",
        "react-spring": "^9.7.3",
        
        # Utilities
        "chance": "^1.1.11",
        "prop-types": "^15.7.2",
        "simplebar": "^6.2.7",
        "simplebar-react": "^3.2.4",
        
        # API and data fetching
        "axios": "^1.6.0",
        "swr": "^2.3.0",
        
        # WebSocket
        "socket.io-client": "^4.7.0",
        
        # Internationalization
        "i18next": "^23.5.1",
        "react-i18next": "^13.2.2",
        
        # Other utilities
        "react-helmet": "^6.1.0",
        "react-dropzone": "^14.2.3",
        "react-intersection-observer": "^9.5.2",
        "react-syntax-highlighter": "^15.5.0",
        "react-top-loading-bar": "^2.3.1",
        "stylis-plugin-rtl": "^2.1.1"
    }
    
    # Essential dev dependencies
    essential_dev_deps = {
        "@types/react": "19.0.1",
        "@types/react-dom": "19.0.1",
        "@types/node": "22.10.1",
        "@types/lodash": "^4.14.0",
        "@types/chance": "^1.1.6",
        "@types/react-helmet": "^6.1.11",
        "@types/react-syntax-highlighter": "^15.5.13",
        "@vitejs/plugin-react": "^4.3.4",
        "typescript": "5.7.3",
        "vite": "6.0.11",
        "eslint": "latest",
        "eslint-config-next": "latest"
    }
    
    # Create modernized package.json
    modernize_package = {
        "name": "orthodoxmetrics-modernize",
        "private": True,
        "version": "1.0.0",
        "type": "module",
        "scripts": {
            "dev": "vite --host 0.0.0.0 --port 5174",
            "build": "tsc && vite build",
            "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
            "preview": "vite preview"
        },
        "dependencies": essential_deps,
        "devDependencies": essential_dev_deps
    }
    
    # Write package.json
    with open(modernize_path / 'package.json', 'w') as f:
        json.dump(modernize_package, f, indent=2)
    print(f'✅ Created refactored package.json')
    
    # 3. Create TailwindCSS configuration
    print('🎨 Setting up TailwindCSS configuration...')
    
    tailwind_config = '''/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Orthodox liturgical colors
        liturgical: {
          purple: '#6B21A8',    // Lent
          gold: '#FFD700',      // Resurrection
          red: '#DC2626',       // Martyrs
          green: '#059669',     // Ordinary Time
          blue: '#2563EB',      // Theotokos
          white: '#F9FAFB',     // Feasts
          black: '#1F2937',     // Good Friday
        }
      },
      animation: {
        'liturgical-flow': 'colorflow 20s ease-in-out infinite',
      },
      keyframes: {
        colorflow: {
          '0%': { 'background-position': '0% 50%' },
          '14.3%': { 'background-position': '25% 50%' },
          '28.6%': { 'background-position': '50% 50%' },
          '42.9%': { 'background-position': '75% 50%' },
          '57.2%': { 'background-position': '100% 50%' },
          '71.5%': { 'background-position': '75% 50%' },
          '85.8%': { 'background-position': '50% 50%' },
          '100%': { 'background-position': '0% 50%' },
        }
      }
    },
  },
  plugins: [],
}'''
    
    with open(modernize_path / 'tailwind.config.js', 'w') as f:
        f.write(tailwind_config)
    print(f'✅ Created TailwindCSS configuration')
    
    # 4. Create PostCSS configuration
    postcss_config = '''export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}'''
    
    with open(modernize_path / 'postcss.config.js', 'w') as f:
        f.write(postcss_config)
    print(f'✅ Created PostCSS configuration')
    
    # 5. Update Vite configuration
    print('⚙️  Updating Vite configuration...')
    
    vite_config = '''import { defineConfig } from 'vite';
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
});'''
    
    with open(modernize_path / 'vite.config.ts', 'w') as f:
        f.write(vite_config)
    print(f'✅ Updated Vite configuration')
    
    # 6. Update index.css with TailwindCSS
    print('🎨 Setting up TailwindCSS styles...')
    
    index_css = '''@tailwind base;
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
}'''
    
    with open(modernize_path / 'src' / 'index.css', 'w') as f:
        f.write(index_css)
    print(f'✅ Updated index.css with TailwindCSS')
    
    print(f'\n🎉 Modernize template refactoring complete!')
    print(f'📁 Modernize path: {modernize_path}')
    print(f'\n📋 Next steps:')
    print(f'  1. cd {modernize_path}')
    print(f'  2. npm install')
    print(f'  3. npm run dev')
    
    return modernize_path

if __name__ == "__main__":
    result = refactor_modernize_setup()
    print(f'\n📊 REFACTORING SUMMARY:')
    print(f'  Modernize path: {result}')
    print(f'  Dependencies: Essential packages only')
    print(f'  Configuration: TailwindCSS + Vite + TypeScript')
    print(f'  Architecture: Clean, modern, maintainable')
