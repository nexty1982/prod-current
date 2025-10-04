#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { ImportFixer } = await import(path.join(__dirname, 'lib/import-fixer.js'));
const { Reporter } = await import(path.join(__dirname, 'lib/report.js'));

// Check if TypeScript files need compilation
async function ensureCompiled() {
  const libDir = path.join(__dirname, 'lib');
  const needsCompile = !fs.existsSync(path.join(libDir, 'import-fixer.js'));
  
  if (needsCompile) {
    console.log(chalk.yellow('Compiling TypeScript files...'));
    
    return new Promise((resolve, reject) => {
      const tsc = spawn('npx', ['tsc', '-p', path.join(__dirname, 'tsconfig.json')], {
        stdio: 'inherit',
        shell: true,
        cwd: path.dirname(__dirname)
      });
      
      tsc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`TypeScript compilation failed with code ${code}`));
        }
      });
    });
  }
}

// Create git branch if in clean state
async function createGitBranch() {
  return new Promise((resolve) => {
    const gitStatus = spawn('git', ['status', '--porcelain']);
    let output = '';
    
    gitStatus.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    gitStatus.on('close', () => {
      if (output.trim() === '') {
        const branchName = `chore/auto-fix-imports-${new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')}`;
        spawn('git', ['checkout', '-b', branchName], { stdio: 'inherit' }).on('close', resolve);
      } else {
        console.log(chalk.yellow('Warning: Git working directory is not clean. Skipping branch creation.'));
        resolve();
      }
    });
  });
}

// Main CLI
const program = new Command();

program
  .name('auto-fix-imports')
  .description('Automatically fix unresolved imports in TypeScript/JavaScript projects')
  .version('1.0.0')
  .option('--root <path>', 'project root directory', process.cwd())
  .option('--src <glob>', 'source file glob pattern', 'src/**/*.{ts,tsx,js,jsx}')
  .option('--from-build <file>', 'parse saved build log file')
  .option('--run-vite', 'run vite build and parse errors')
  .option('--dry', 'show planned fixes without applying', false)
  .option('--apply', 'apply fixes to files', false)
  .option('--create-stubs', 'create stub files for unresolved imports', false)
  .option('--prefer-alias', 'prefer alias imports (@/...) when possible', false);

program.parse();

const options = program.opts();

// Validate options
if (!options.dry && !options.apply) {
  console.log(chalk.yellow('No action specified. Use --dry for preview or --apply to fix imports.'));
  options.dry = true;
}

async function main() {
  const startTime = Date.now();
  
  try {
    // Ensure TypeScript is compiled
    await ensureCompiled();
    
    console.log(chalk.bold.blue('\n🔧 Auto Fix Imports\n'));
    console.log(chalk.gray(`Root: ${options.root}`));
    console.log(chalk.gray(`Source: ${options.src}`));
    console.log(chalk.gray(`Mode: ${options.apply ? 'apply' : 'dry-run'}\n`));

    // Create git branch if applying changes
    if (options.apply) {
      await createGitBranch();
    }

    // Run the import fixer
    const fixer = new ImportFixer(options);
    const { fixes, errors } = await fixer.run();

    // Filter out successfully fixed errors
    const fixedSpecifiers = new Set(fixes.map(f => `${f.file}:${f.oldImport}`));
    const unresolvedErrors = errors.filter(
      e => !fixedSpecifiers.has(`${e.file}:${e.specifier}`)
    );

    // Print results
    if (fixes.length > 0) {
      Reporter.printTable(fixes);
      Reporter.printSummary(fixes, unresolvedErrors.length);
    } else {
      console.log(chalk.yellow('No fixes found.'));
    }

    if (unresolvedErrors.length > 0) {
      Reporter.printErrors(unresolvedErrors);
    }

    // Write JSON report
    const duration = Date.now() - startTime;
    await Reporter.writeJsonReport(fixes, errors, options, duration);

    // Run build to verify if changes were applied
    if (options.apply && fixes.some(f => f.applied)) {
      console.log(chalk.blue('\n🔍 Verifying build...'));
      
      const verify = spawn('npx', ['vite', 'build'], {
        cwd: options.root,
        stdio: 'inherit',
        shell: true
      });

      await new Promise((resolve) => {
        verify.on('close', (code) => {
          if (code === 0) {
            console.log(chalk.green('\n✓ Build successful!'));
            
            // Commit changes
            const commitMessage = `fix: auto-fix imports (${fixes.filter(f => f.applied).length} fixes)`;
            spawn('git', ['add', '-A'], { cwd: options.root }).on('close', () => {
              spawn('git', ['commit', '-m', commitMessage], { 
                cwd: options.root, 
                stdio: 'inherit' 
              });
            });
          } else {
            console.log(chalk.red('\n✗ Build failed. Some imports may still need manual fixing.'));
          }
          resolve();
        });
      });
    }

    // Exit code based on unresolved errors
    process.exit(unresolvedErrors.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error(chalk.red('\nError:'), error.message);
    process.exit(1);
  }
}

// Run
main().catch(console.error);
