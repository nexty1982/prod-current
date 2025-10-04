#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script to add @ path aliases to tsconfig.json files
 * Adds "@/*": ["*"] mapping to both front-end and server TypeScript configs
 */

function updateFrontendTsConfig() {
  const tsConfigPath = path.join(__dirname, '..', 'prod', 'front-end', 'tsconfig.json');
  
  if (!fs.existsSync(tsConfigPath)) {
    console.error('Front-end tsconfig.json not found at:', tsConfigPath);
    return false;
  }
  
  try {
    const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
    
    // Ensure compilerOptions exists
    if (!tsConfig.compilerOptions) {
      tsConfig.compilerOptions = {};
    }
    
    // Set baseUrl to src for cleaner @ imports
    tsConfig.compilerOptions.baseUrl = "src";
    
    // Ensure paths exists
    if (!tsConfig.compilerOptions.paths) {
      tsConfig.compilerOptions.paths = {};
    }
    
    // Add @ alias
    tsConfig.compilerOptions.paths["@/*"] = ["*"];
    
    // Keep existing src/* alias but adjust for new baseUrl
    if (tsConfig.compilerOptions.paths["src/*"]) {
      delete tsConfig.compilerOptions.paths["src/*"];
    }
    
    // Write back to file
    fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
    console.log('✓ Updated front-end/tsconfig.json with @ alias');
    return true;
    
  } catch (error) {
    console.error('Error updating front-end tsconfig.json:', error);
    return false;
  }
}

function createServerTsConfig() {
  const tsConfigPath = path.join(__dirname, '..', 'prod', 'server', 'tsconfig.json');
  
  // Check if it already exists
  if (fs.existsSync(tsConfigPath)) {
    console.log('Server tsconfig.json already exists, updating...');
    try {
      const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
      
      // Ensure compilerOptions and paths exist
      if (!tsConfig.compilerOptions) tsConfig.compilerOptions = {};
      if (!tsConfig.compilerOptions.paths) tsConfig.compilerOptions.paths = {};
      
      // Add @ alias
      tsConfig.compilerOptions.baseUrl = ".";
      tsConfig.compilerOptions.paths["@/*"] = ["*"];
      
      fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
      console.log('✓ Updated server/tsconfig.json with @ alias');
      return true;
    } catch (error) {
      console.error('Error updating server tsconfig.json:', error);
      return false;
    }
  }
  
  // Create new tsconfig.json for server
  const tsConfig = {
    "compilerOptions": {
      "target": "ES2020",
      "module": "commonjs", 
      "lib": ["ES2020"],
      "outDir": "./dist",
      "rootDir": "./",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "declaration": true,
      "declarationMap": true,
      "sourceMap": true,
      "baseUrl": ".",
      "paths": {
        "@/*": ["*"]
      }
    },
    "include": [
      "**/*.ts",
      "**/*.js"
    ],
    "exclude": [
      "node_modules",
      "dist",
      "**/*.test.ts",
      "**/*.spec.ts"
    ]
  };
  
  try {
    fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
    console.log('✓ Created server/tsconfig.json with @ alias');
    return true;
  } catch (error) {
    console.error('Error creating server tsconfig.json:', error);
    return false;
  }
}

function setupTsConfigAliases() {
  console.log('Setting up @ path aliases in tsconfig.json files...\n');
  
  const frontendSuccess = updateFrontendTsConfig();
  const serverSuccess = createServerTsConfig();
  
  console.log('\n=== TSCONFIG ALIAS SETUP SUMMARY ===');
  console.log(`Front-end tsconfig.json: ${frontendSuccess ? 'SUCCESS' : 'FAILED'}`);
  console.log(`Server tsconfig.json: ${serverSuccess ? 'SUCCESS' : 'FAILED'}`);
  
  if (frontendSuccess && serverSuccess) {
    console.log('\n✓ All TypeScript configurations updated successfully');
    console.log('You can now use @/ imports in both projects');
    return true;
  } else {
    console.log('\n✗ Some TypeScript configurations failed to update');
    return false;
  }
}

if (require.main === module) {
  setupTsConfigAliases();
}

module.exports = { setupTsConfigAliases, updateFrontendTsConfig, createServerTsConfig };
