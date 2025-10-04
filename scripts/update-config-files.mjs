#!/usr/bin/env node

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';

class ConfigUpdater {
  constructor() {
    this.rootDir = process.cwd();
    this.sourceDir = join(this.rootDir, 'front-end');
    this.targetDir = join(this.rootDir, 'UI/default/frontend');
    this.reportDir = join(this.rootDir, '.om/config-update');
    
    // Config files to copy and refactor
    this.configFiles = [
      'package.json',
      'tsconfig.json',
      'tsconfig.node.json',
      'vite.config.ts',
      'vite.config.dev.ts',
      'vitest.config.ts',
      'tailwind.config.js',
      'tailwind.orthodox.config.js',
      'postcss.config.js'
    ];

    this.updateStats = {
      filesProcessed: 0,
      filesUpdated: 0,
      filesSkipped: 0,
      errors: []
    };
  }

  async updateConfigFiles() {
    console.log('🔧 Updating Config Files');
    console.log('='.repeat(50));
    console.log(`Source: ${this.sourceDir}`);
    console.log(`Target: ${this.targetDir}`);
    console.log('');

    // Ensure target directory exists
    mkdirSync(this.targetDir, { recursive: true });
    mkdirSync(this.reportDir, { recursive: true });

    // Process each config file
    for (const configFile of this.configFiles) {
      await this.updateConfigFile(configFile);
    }

    // Generate report
    await this.generateReport();

    console.log('\n✅ Config files update completed!');
    console.log(`📊 Summary: ${this.updateStats.filesUpdated}/${this.updateStats.filesProcessed} files updated`);
  }

  async updateConfigFile(configFile) {
    console.log(`📄 Processing: ${configFile}`);
    
    const sourcePath = join(this.sourceDir, configFile);
    const targetPath = join(this.targetDir, configFile);

    try {
      // Check if source exists
      if (!existsSync(sourcePath)) {
        console.log(`   ⚠️  Source file does not exist: ${configFile}`);
        this.updateStats.filesSkipped++;
        return;
      }

      // Read source content
      const sourceContent = readFileSync(sourcePath, 'utf8');
      
      // Refactor content for new directory structure
      const refactoredContent = this.refactorConfigFile(sourceContent, configFile);
      
      // Write refactored content
      writeFileSync(targetPath, refactoredContent);
      
      this.updateStats.filesProcessed++;
      
      // Check if content was actually changed
      if (refactoredContent !== sourceContent) {
        this.updateStats.filesUpdated++;
        console.log(`   🔧 Refactored: ${configFile}`);
      } else {
        console.log(`   ✅ Copied: ${configFile} (no changes needed)`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error processing ${configFile}: ${error.message}`);
      this.updateStats.errors.push({
        file: configFile,
        error: error.message
      });
    }
  }

  refactorConfigFile(content, filename) {
    let refactored = content;

    // Apply different refactoring based on file type
    switch (filename) {
      case 'package.json':
        refactored = this.refactorPackageJson(content);
        break;
      case 'tsconfig.json':
      case 'tsconfig.node.json':
        refactored = this.refactorTsConfig(content);
        break;
      case 'vite.config.ts':
      case 'vite.config.dev.ts':
        refactored = this.refactorViteConfig(content);
        break;
      case 'tailwind.config.js':
      case 'tailwind.orthodox.config.js':
        refactored = this.refactorTailwindConfig(content);
        break;
      case 'postcss.config.js':
        refactored = this.refactorPostcssConfig(content);
        break;
      case 'vitest.config.ts':
        refactored = this.refactorVitestConfig(content);
        break;
      default:
        // Generic refactoring for other files
        refactored = this.refactorGenericConfig(content);
    }

    return refactored;
  }

  refactorPackageJson(content) {
    let refactored = content;
    
    // Update scripts that reference specific paths
    refactored = refactored.replace(
      /"dev":\s*"([^"]*)"/g,
      '"dev": "vite --host 0.0.0.0 --port 5174"'
    );
    
    // Update build scripts to use correct paths
    refactored = refactored.replace(
      /"build":\s*"([^"]*)"/g,
      '"build": "tsc && vite build"'
    );
    
    // Update preview script
    refactored = refactored.replace(
      /"preview":\s*"([^"]*)"/g,
      '"preview": "vite preview"'
    );

    // Add or update scripts for the new structure
    const scriptsToAdd = {
      "fix:syntax": "node ../../../scripts/deep-sanitize.mjs",
      "scan:nonascii": "node ../../../scripts/scan-non-ascii.mjs",
      "build:hardened": "node ../../../scripts/build-harness.mjs"
    };

    // Parse JSON and add scripts
    try {
      const packageJson = JSON.parse(refactored);
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }
      
      // Add new scripts
      Object.assign(packageJson.scripts, scriptsToAdd);
      
      // Update existing scripts if they reference old paths
      if (packageJson.scripts.lint) {
        packageJson.scripts.lint = "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0";
      }
      
      if (packageJson.scripts["lint:fix"]) {
        packageJson.scripts["lint:fix"] = "eslint . --ext ts,tsx --fix";
      }
      
      refactored = JSON.stringify(packageJson, null, 2);
    } catch (error) {
      console.warn(`   ⚠️  Could not parse package.json: ${error.message}`);
    }

    return refactored;
  }

  refactorTsConfig(content) {
    let refactored = content;
    
    // Update paths to use new directory structure
    refactored = refactored.replace(
      /"baseUrl":\s*"\.\/"/g,
      '"baseUrl": "./"'
    );
    
    // Update path mappings for new structure
    refactored = refactored.replace(
      /"@\/\*":\s*\["src\/\*"\]/g,
      '"@/*": ["src/*"]'
    );
    
    // Ensure include paths are correct
    refactored = refactored.replace(
      /"include":\s*\[([^\]]*)\]/g,
      '"include": ["src/**/*", "**/*.ts", "**/*.tsx"]'
    );
    
    // Update exclude patterns
    refactored = refactored.replace(
      /"exclude":\s*\[([^\]]*)\]/g,
      '"exclude": ["node_modules", "dist", "build"]'
    );

    return refactored;
  }

  refactorViteConfig(content) {
    let refactored = content;
    
    // Update alias configurations
    refactored = refactored.replace(
      /alias:\s*\{([^}]*)\}/gs,
      `alias: {
        '@': path.resolve(__dirname, './src'),
        '@/components': path.resolve(__dirname, './src/components'),
        '@/utils': path.resolve(__dirname, './src/utils'),
        '@/types': path.resolve(__dirname, './src/types'),
        '@/hooks': path.resolve(__dirname, './src/hooks'),
        '@/services': path.resolve(__dirname, './src/services'),
        '@/context': path.resolve(__dirname, './src/context'),
        '@/contexts': path.resolve(__dirname, './src/contexts'),
        '@/constants': path.resolve(__dirname, './src/constants'),
        '@/config': path.resolve(__dirname, './src/config'),
        '@/api': path.resolve(__dirname, './src/api'),
        '@/store': path.resolve(__dirname, './src/store'),
        '@/assets': path.resolve(__dirname, './src/assets'),
        '@/styles': path.resolve(__dirname, './src/styles'),
        '@/theme': path.resolve(__dirname, './src/theme'),
        '@/layouts': path.resolve(__dirname, './src/layouts'),
        '@/pages': path.resolve(__dirname, './src/pages'),
        '@/views': path.resolve(__dirname, './src/views'),
        '@/routes': path.resolve(__dirname, './src/routes'),
        '@/features': path.resolve(__dirname, './src/features'),
        '@/modules': path.resolve(__dirname, './src/modules'),
        '@/tools': path.resolve(__dirname, './src/tools'),
        '@/records': path.resolve(__dirname, './src/records'),
        '@/data': path.resolve(__dirname, './src/data'),
        '@/demos': path.resolve(__dirname, './src/demos'),
        '@/examples': path.resolve(__dirname, './src/examples'),
        '@/sandbox': path.resolve(__dirname, './src/sandbox'),
        '@/ai': path.resolve(__dirname, './src/ai'),
        '@/omai': path.resolve(__dirname, './src/omai')
      }`
    );
    
    // Update server configuration
    refactored = refactored.replace(
      /server:\s*\{([^}]*)\}/gs,
      `server: {
        host: '0.0.0.0',
        port: 5174,
        open: true
      }`
    );
    
    // Update build configuration
    refactored = refactored.replace(
      /build:\s*\{([^}]*)\}/gs,
      `build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              ui: ['@mui/material', '@mui/icons-material']
            }
          }
        }
      }`
    );

    return refactored;
  }

  refactorTailwindConfig(content) {
    let refactored = content;
    
    // Update content paths for new directory structure
    refactored = refactored.replace(
      /content:\s*\[([^\]]*)\]/g,
      `content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./src/components/**/*.{js,ts,jsx,tsx}",
        "./src/pages/**/*.{js,ts,jsx,tsx}",
        "./src/views/**/*.{js,ts,jsx,tsx}",
        "./src/layouts/**/*.{js,ts,jsx,tsx}",
        "./src/features/**/*.{js,ts,jsx,tsx}"
      ]`
    );
    
    // Ensure theme paths are correct
    refactored = refactored.replace(
      /theme:\s*\{([^}]*)\}/gs,
      `theme: {
        extend: {
          colors: {
            primary: {
              50: '#eff6ff',
              500: '#3b82f6',
              600: '#2563eb',
              700: '#1d4ed8',
              900: '#1e3a8a'
            }
          },
          fontFamily: {
            sans: ['Inter', 'system-ui', 'sans-serif']
          }
        }
      }`
    );

    return refactored;
  }

  refactorPostcssConfig(content) {
    let refactored = content;
    
    // Ensure plugins are correctly configured for new structure
    refactored = refactored.replace(
      /plugins:\s*\{([^}]*)\}/gs,
      `plugins: {
        tailwindcss: {},
        autoprefixer: {},
      }`
    );

    return refactored;
  }

  refactorVitestConfig(content) {
    let refactored = content;
    
    // Update test environment configuration
    refactored = refactored.replace(
      /environment:\s*"([^"]*)"/g,
      '"jsdom"'
    );
    
    // Update test patterns
    refactored = refactored.replace(
      /include:\s*\[([^\]]*)\]/g,
      'include: ["src/**/*.{test,spec}.{js,ts,jsx,tsx}"]'
    );
    
    // Update setup files
    refactored = refactored.replace(
      /setupFiles:\s*\[([^\]]*)\]/g,
      'setupFiles: ["./src/test/setup.ts"]'
    );

    return refactored;
  }

  refactorGenericConfig(content) {
    // Generic refactoring for other config files
    let refactored = content;
    
    // Update any hardcoded paths
    refactored = refactored.replace(
      /front-end\/src/g,
      'src'
    );
    
    // Update relative paths
    refactored = refactored.replace(
      /\.\.\/src/g,
      './src'
    );

    return refactored;
  }

  async generateReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      source: this.sourceDir,
      target: this.targetDir,
      statistics: this.updateStats,
      configFiles: this.configFiles,
      summary: {
        successRate: this.updateStats.filesProcessed > 0 
          ? Math.round((this.updateStats.filesUpdated / this.updateStats.filesProcessed) * 100)
          : 0
      }
    };

    // Write JSON report
    writeFileSync(
      join(this.reportDir, 'config-update-report.json'),
      JSON.stringify(reportData, null, 2)
    );

    // Write markdown report
    this.writeMarkdownReport(reportData);

    console.log(`📄 Config update reports written to: ${this.reportDir}`);
  }

  writeMarkdownReport(data) {
    const lines = [];
    
    lines.push('# Config Files Update Report');
    lines.push('');
    lines.push(`**Generated:** ${data.timestamp}`);
    lines.push(`**Source:** ${data.source}`);
    lines.push(`**Target:** ${data.target}`);
    lines.push('');
    
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Files Processed:** ${data.statistics.filesProcessed}`);
    lines.push(`- **Files Updated:** ${data.statistics.filesUpdated}`);
    lines.push(`- **Files Skipped:** ${data.statistics.filesSkipped}`);
    lines.push(`- **Success Rate:** ${data.summary.successRate}%`);
    lines.push('');
    
    if (data.statistics.errors.length > 0) {
      lines.push('## Errors');
      lines.push('');
      for (const error of data.statistics.errors) {
        lines.push(`- **${error.file}:** ${error.error}`);
      }
      lines.push('');
    }
    
    lines.push('## Config Files Processed');
    lines.push('');
    for (const file of data.configFiles) {
      lines.push(`- ${file}`);
    }
    lines.push('');

    writeFileSync(
      join(this.reportDir, 'config-update-report.md'),
      lines.join('\n')
    );
  }
}

// Run config update
const updater = new ConfigUpdater();
updater.updateConfigFiles().catch(console.error);
