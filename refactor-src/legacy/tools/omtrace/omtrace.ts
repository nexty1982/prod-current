#!/usr/bin/env tsx

// Main OMTRACE CLI entry point

import * as fs from 'fs';
import * as path from 'path';
import { 
  TraceResult, 
  RefactorResult, 
  SelfTestResult, 
  CLIError,
  EXIT_CODES 
} from './core/types.js';
import { 
  OMTRACEError, 
  exitWithError 
} from './core/errors.js';
import { log, setVerbose } from './core/logger.js';
import { withAbort } from './core/timeout.js';
import { normalizePath } from './core/normalizePath.js';
import { resolveTarget, resolveCandidates } from './core/resolver.js';
import { 
  detectDomainAndSlug, 
  generateDestinationPath, 
  checkMixedUsage 
} from './slugRules.js';
import { traceDependencies, formatDependencies } from './core/tracer.js';
import { needsRefresh, getDefaultIndexPath, readIndexOrThrow } from './core/indexIO.js';
import { findComponentReferences } from './core/routeAnalyzer.js';
import { listAllMenus, addMenuItem, removeMenuItem } from './core/menuManager.js';
import { findDuplicateComponents, executeRefactor, checkNamingConventions } from './core/refactorHelper.js';
import { ImportRewriter, findImportingFiles, validateImportRewrite } from './core/astRewriter.js';
import { PackageManagerDetector, getSafeBuildCommand, getSafeTypecheckCommand } from './core/packageManager.js';
import { InteractiveResolver, shouldUseInteractiveMode } from './core/interactiveResolver.js';
import { DepsIndex } from './core/types.js';

// CLI configuration
interface CLIOptions {
  selftest: boolean;
  buildIndex: boolean;
  trace: boolean;
  refactor: boolean;
  delete: boolean;
  dryRun: boolean;
  yes: boolean;
  force: boolean;
  pickFirst: boolean;
  json: boolean;
  verbose: boolean;
  timeout: number;
  reverse: boolean;
  deep: boolean;
  showRoute: boolean;
  showServer: boolean;
  renameLegacy: boolean;
  menuCommand?: string;
  menuLabel?: string;
  menuPath?: string;
  menuRole?: string;
  menuSection?: string;
  menuHidden: boolean;
  interactive: boolean;
  noInteractive: boolean;
  clearCache: boolean;
  indexPath?: string;
  feRoot?: string;
  target?: string;
}

// Types for delete command
type RefHit = { 
  file: string; 
  kind: "import"|"route"|"menu"|"barrel"|"style"|"test"|"json"; 
  line: number; 
  snippet: string; 
};

type DeletePlan = { 
  target: string; 
  resolvedFiles: string[]; 
  patches: {file: string; kind: string; preview: string}[]; 
  archiveDir: string; 
  branchName: string;
};

type DeleteResult = {
  success: boolean;
  target: string;
  patched: number;
  archived: number;
  branchName: string;
  archiveDir: string;
  errors?: string[];
  verifyResult?: { typecheckOk: boolean; buildOk: boolean; errors?: string };
};

/**
 * Show help information
 */
function showHelp(): void {
  console.log(`
🔍 OMTRACE - Advanced File Dependency & Route Tracer

Usage:
  npx tsx omtrace.ts <filename> [options]
  npx tsx omtrace.ts --build-index
  npx tsx omtrace.ts menu <command> [options]
  npx tsx omtrace.ts delete <target> [options]

Core Options:
  <filename>              File to trace (case-insensitive, supports partial names)
  --build-index          Rebuild the file dependency index
  --reverse              Show reverse imports (who uses this file)
  --deep                 Show transitive dependencies
  --show-route           Show route and menu references for the component
  --refactor             Show refactor recommendations for duplicate components
  --rename-legacy        Rename legacy files when refactoring
  --json                 Output in JSON format
  --verbose              Enable verbose logging
  --help, -h            Show this help message

Delete Options:
  delete <target>        Auto-delete component/page and patch all references
  --dry-run              Preview deletion plan without applying changes

Interactive Options:
  --interactive          Force interactive mode for ambiguous targets
  --no-interactive       Disable interactive mode (use in CI/scripts)
  --clear-cache          Clear remembered user choices

Menu Commands:
  menu:list              List all menu items grouped by section
  menu:add               Add a new menu item
  menu:remove            Remove a menu item

Menu Options:
  --menu-label <label>   Menu item label (for add command)
  --menu-path <path>     Menu item path (for add/remove commands)
  --menu-role <role>     Required role for menu access
  --menu-section <section> Menu section (default: tools)
  --menu-hidden          Hide menu item from sidebar

Examples:
  # Basic tracing
  npx tsx omtrace.ts AssignTask.tsx
  npx tsx omtrace.ts AssignTask.tsx --reverse --deep
  npx tsx omtrace.ts AssignTask.tsx --show-route
  
  # Refactoring
  npx tsx omtrace.ts AssignTask --refactor
  npx tsx omtrace.ts AssignTask --refactor --rename-legacy
  
  # Auto-deletion
  npx tsx omtrace.ts delete ComponentPalette
  npx tsx omtrace.ts delete src/../features/../features/records/records/../features/records/records/BaptismRecordsPage.tsx
  npx tsx omtrace.ts delete ComponentPalette --dry-run
  
  # Menu management
  npx tsx omtrace.ts menu list
  npx tsx omtrace.ts menu add --menu-label "User Management" --menu-path "/admin/users" --menu-role "admin"
  npx tsx omtrace.ts menu remove --menu-path "/admin/users"
  
  # Index management
  npx tsx omtrace.ts --build-index

Features:
  • Auto-refreshes stale index (>12 hours old)
  • Extended search scope (front-end + server)
  • Route and menu analysis
  • Duplicate component detection
  • Naming convention enforcement
  • Menu management tools
`);
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  
  const options: CLIOptions = {
    selftest: false,
    buildIndex: false,
    trace: false,
    refactor: false,
    delete: false,
    dryRun: false,
    yes: false,
    force: false,
    pickFirst: false,
    json: false,
    verbose: false,
    timeout: 300000, // 5 minutes default
    reverse: false,
    deep: false,
    showRoute: false,
    renameLegacy: false,
    menuHidden: false,
    interactive: false,
    noInteractive: false,
    clearCache: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--selftest':
        options.selftest = true;
        break;
      case '--build-index':
        options.buildIndex = true;
        break;
      case '--trace':
        options.trace = true;
        break;
      case '--refactor':
        options.refactor = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--yes':
        options.yes = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--pick-first':
        options.pickFirst = true;
        break;
      case '--json':
        options.json = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--reverse':
        options.reverse = true;
        break;
      case '--deep':
        options.deep = true;
        break;
      case '--show-route':
        options.showRoute = true;
        break;
      case '--rename-legacy':
        options.renameLegacy = true;
        break;
      case '--menu-label':
        if (i + 1 < args.length) {
          options.menuLabel = args[++i];
        }
        break;
      case '--menu-path':
        if (i + 1 < args.length) {
          options.menuPath = args[++i];
        }
        break;
      case '--menu-role':
        if (i + 1 < args.length) {
          options.menuRole = args[++i];
        }
        break;
      case '--menu-section':
        if (i + 1 < args.length) {
          options.menuSection = args[++i];
        }
        break;
      case '--menu-hidden':
        options.menuHidden = true;
        break;
      case '--interactive':
        options.interactive = true;
        break;
      case '--no-interactive':
        options.noInteractive = true;
        break;
      case '--clear-cache':
        options.clearCache = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      case '--timeout':
        if (i + 1 < args.length) {
          options.timeout = parseInt(args[++i]) || 300000;
        }
        break;
      case '--index-path':
        if (i + 1 < args.length) {
          options.indexPath = args[++i];
        }
        break;
      case '--fe-root':
        if (i + 1 < args.length) {
          options.feRoot = args[++i];
        }
        break;
      default:
        if (!arg.startsWith('-') && !options.target) {
          // Check if it's a menu command
          if (arg === 'menu' && i + 1 < args.length) {
            options.menuCommand = args[++i]; // menu:list, menu:add, menu:remove
          } else if (arg.startsWith('menu:')) {
            // Handle menu:list, menu:add, menu:remove format
            options.menuCommand = arg.substring(5); // Remove 'menu:' prefix
          } else if (arg === 'delete' && i + 1 < args.length) {
            // Handle delete command
            options.delete = true;
            options.target = args[++i];
          } else if (!options.target) {
            options.target = arg;
            options.trace = true; // Auto-enable tracing when target is specified
          }
        }
        break;
    }
  }

  return options;
}

/**
 * Locate front-end root directory
 */
function locateFERoot(): string {
  // Try to find front-end directory
  let current = process.cwd();
  
  while (current !== '/' && current !== '') {
    if (fs.existsSync(path.join(current, 'package.json'))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(current, 'package.json'), 'utf-8'));
      if (pkg.scripts?.omtrace) {
        return current;
      }
    }
    current = path.dirname(current);
  }
  
  throw new OMTRACEError(
    'Could not locate front-end directory (no package.json with omtrace script found)',
    EXIT_CODES.RESOLVER_FAILED
  );
}

/**
 * Run self-test
 */
async function runSelfTest(feRoot: string): Promise<SelfTestResult> {
  log.info('Running self-test', { feRoot });

  try {
    // Check if index exists and is fresh
    const indexPath = getDefaultIndexPath(feRoot);
    const indexInfo = await withAbort(
      Promise.resolve().then(() => {
        if (!fs.existsSync(indexPath)) {
          return null;
        }
        const stats = fs.statSync(indexPath);
        const ageMs = Date.now() - stats.mtime.getTime();
        const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        return {
          path: indexPath,
          ageMs,
          files: data.nodes?.length || 0,
        };
      }),
      { timeoutMs: 30000, operation: 'self_test_index_check' }
    );

    // Build index if needed
    if (!indexInfo || indexInfo.ageMs > 24 * 60 * 60 * 1000) {
      log.info('Building fresh index for self-test');
      const { buildIndex } = await import('./build_index.js');
      await buildIndex();
    }

    // Test trace on a known component
    const testComponent = 'src/shared/ui/legacy/church-management/ch-wiz/ChurchSetupWizard.tsx';
    let traceProbe: SelfTestResult['traceProbe'];
    
    if (fs.existsSync(path.join(feRoot, testComponent))) {
      const index = readIndexOrThrow(indexPath);
      const candidates = resolveCandidates(testComponent, index, { pickFirst: true });
      traceProbe = {
        status: 'ok',
        resolvedPath: candidates[0]?.path || testComponent,
      };
    } else {
      traceProbe = {
        status: 'not_found',
      };
    }

    const result: SelfTestResult = {
      ok: true,
      feRoot,
      index: indexInfo || { path: indexPath, ageMs: 0, files: 0 },
      traceProbe,
    };

    // Write self-test result
    const selftestPath = path.join(feRoot, '.cache/omtrace/selftest.json');
    fs.mkdirSync(path.dirname(selftestPath), { recursive: true });
    fs.writeFileSync(selftestPath, JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    const result: SelfTestResult = {
      ok: false,
      feRoot,
      index: { path: '', ageMs: 0, files: 0 },
      traceProbe: { status: 'error' },
      error: {
        code: EXIT_CODES.INDEX_FAILED,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
    
    // Write failed self-test result
    const selftestPath = path.join(feRoot, '.cache/omtrace/selftest.json');
    fs.mkdirSync(path.dirname(selftestPath), { recursive: true });
    fs.writeFileSync(selftestPath, JSON.stringify(result, null, 2));
    
    throw error;
  }
}

/**
 * Run trace mode
 */
async function runTrace(
  target: string,
  feRoot: string,
  options: CLIOptions
): Promise<TraceResult> {
  log.info('Running trace', { target, feRoot });
  // console.log('🔍 DEBUG: runTrace function called with options:', { 
  //   showRoute: options.showRoute, 
  //   reverse: options.reverse, 
  //   deep: options.deep 
  // });

  const indexPath = options.indexPath || getDefaultIndexPath(feRoot);
  const index = readIndexOrThrow(indexPath);
  
  // Normalize target path
  const normalized = normalizePath(target, feRoot);
  
  if (normalized.exists) {
    // Direct path match - use the tracer to get actual dependency information
    const traceResult = await traceDependencies(normalized.normalized, index, {
      reverse: options.reverse,
      deep: options.deep,
      showServer: true, // Always show server endpoints for front-end files
    });
    
    // Add route analysis if requested (even for direct paths)
    if (options.showRoute) {
      // console.log('🔍 DEBUG: Route analysis for direct path:', normalized.normalized);
      
      const routeAnalysis = findComponentReferences(
        path.basename(normalized.normalized, path.extname(normalized.normalized)),
        feRoot
      );
      
      // console.log('🔍 DEBUG: Route analysis completed for direct path:', { 
      //   routes: routeAnalysis.routes.length, 
      //   references: routeAnalysis.componentReferences.length 
      // });
      
      // Map RouteInfo to the expected format
      traceResult.routes = routeAnalysis.routes.map(route => ({
        path: route.path,
        file: route.component,
        line: route.line,
        roles: route.roles,
      }));
      traceResult.componentReferences = routeAnalysis.componentReferences;
    }
    
    return traceResult;
  }

  // Resolve candidates
  const candidates = resolveCandidates(normalized.candidate, index, {
    pickFirst: options.pickFirst,
  });

  if (candidates.length === 0) {
    throw new OMTRACEError(
      `No candidates found for target: ${target}`,
      EXIT_CODES.RESOLVER_FAILED
    );
  }

  if (candidates.length > 1 && !options.pickFirst) {
    // Try interactive resolution if available
    if (shouldUseInteractiveMode()) {
      log.info('Multiple candidates found, using interactive resolution');
      const resolver = new InteractiveResolver(feRoot);
      const selectedCandidate = await resolver.resolveAmbiguity(target, candidates);
      
      if (selectedCandidate) {
        // Continue with selected candidate
        candidates = [selectedCandidate];
        log.info('User selected candidate', { path: selectedCandidate.path });
      } else {
        // User cancelled selection
        return {
          entry: target,
          resolvedPath: '',
          status: 'ambiguous',
          candidates,
          counts: { direct: 0, transitive: 0, reverse: 0 },
          deps: { direct: [], transitive: [], reverse: [] },
        };
      }
    } else {
      // Non-interactive mode - return ambiguous result
      return {
        entry: target,
        resolvedPath: '',
        status: 'ambiguous',
        candidates,
        counts: { direct: 0, transitive: 0, reverse: 0 },
        deps: { direct: [], transitive: [], reverse: [] },
      };
    }
  }

  const resolvedPath = candidates[0].path;
  
  // Use the tracer to get dependency information
  // console.log('🔍 DEBUG: About to call traceDependencies with options:', { 
  //   showRoute: options.showRoute, 
  //   reverse: options.reverse, 
  //   deep: options.deep 
  // });
  
  const traceResult = await traceDependencies(resolvedPath, index, {
    reverse: options.reverse,
    deep: options.deep,
    showServer: true, // Always show server endpoints for front-end files
  });

  // console.log('🔍 DEBUG: traceDependencies returned, now checking showRoute:', options.showRoute);
  
  log.debug('Options in runTrace', { 
    showRoute: options.showRoute, 
    reverse: options.reverse, 
    deep: options.deep 
  });

      // Add route analysis if requested
    if (options.showRoute) {
      log.debug('Route analysis requested', { showRoute: options.showRoute, resolvedPath });
      
      const routeAnalysis = findComponentReferences(
        path.basename(resolvedPath, path.extname(resolvedPath)),
        feRoot
      );
      
      log.debug('Route analysis completed', { 
        routes: routeAnalysis.routes.length, 
        references: routeAnalysis.componentReferences.length 
      });
      
      // Map RouteInfo to the expected format
      traceResult.routes = routeAnalysis.routes.map(route => ({
        path: route.path,
        file: route.component,
        line: route.line,
        roles: route.roles,
      }));
      traceResult.componentReferences = routeAnalysis.componentReferences;
    }
  
  return traceResult;
}

/**
 * Handle menu commands
 */
async function handleMenuCommand(
  command: string,
  feRoot: string,
  options: CLIOptions
): Promise<void> {
  switch (command) {
    case 'list':
      listAllMenus(feRoot);
      break;
      
    case 'add':
      if (!options.menuLabel || !options.menuPath) {
        throw new Error('Menu add requires --menu-label and --menu-path');
      }
      
      const success = addMenuItem(feRoot, {
        label: options.menuLabel,
        path: options.menuPath,
        role: options.menuRole,
        section: options.menuSection || 'tools',
        hidden: options.menuHidden,
      });
      
      if (success) {
        console.log('✅ Menu item added successfully');
      } else {
        console.log('❌ Failed to add menu item');
      }
      break;
      
    case 'remove':
      if (!options.menuPath) {
        throw new Error('Menu remove requires --menu-path');
      }
      
      const removeSuccess = removeMenuItem(feRoot, {
        path: options.menuPath,
        preserve: !options.force,
        delete: options.force,
      });
      
      if (removeSuccess) {
        console.log('✅ Menu item removed successfully');
      } else {
        console.log('❌ Failed to remove menu item');
      }
      break;
      
    default:
      throw new Error(`Unknown menu command: ${command}`);
  }
}

/**
 * Handle refactor mode
 */
async function handleRefactor(
  target: string,
  feRoot: string,
  options: CLIOptions,
  index: DepsIndex
): Promise<void> {
  // Resolve target to component name
  const normalized = normalizePath(target, feRoot);
  const candidates = resolveCandidates(normalized.candidate, index, {
    pickFirst: options.pickFirst,
  });

  if (candidates.length === 0) {
    throw new Error(`No components found for target: ${target}`);
  }

  const componentName = path.basename(candidates[0].path, path.extname(candidates[0].path));
  
  // Find duplicate components
  const duplicates = findDuplicateComponents(componentName, index, feRoot);
  
  if (duplicates.length === 0) {
    console.log(`✅ No duplicates found for ${componentName}`);
    return;
  }

  console.log(`🔍 Found ${duplicates.length} duplicate components for ${componentName}:`);
  duplicates.forEach((dup, index) => {
    console.log(`   ${index + 1}. ${dup.path} (${dup.reverseImports} imports, ${new Date(dup.mtime).toLocaleDateString()})`);
  });
  console.log('');

  // Execute refactor
  executeRefactor(componentName, duplicates, feRoot, options.renameLegacy);
}

/**
 * Run refactor mode
 */
async function runRefactor(
  target: string,
  feRoot: string,
  options: CLIOptions
): Promise<RefactorResult> {
  log.info('Running refactor', { target, feRoot, dryRun: options.dryRun });

  const indexPath = options.indexPath || getDefaultIndexPath(feRoot);
  const index = readIndexOrThrow(indexPath);
  
  // Normalize target path
  const normalized = normalizePath(target, feRoot);
  
  if (!normalized.exists) {
    throw new OMTRACEError(
      `Target file not found: ${target}`,
      EXIT_CODES.RESOLVER_FAILED
    );
  }

  // Extract component name
  const componentName = path.basename(normalized.normalized, path.extname(normalized.normalized));
  
  // Check for default export
  const filePath = path.join(feRoot, normalized.normalized);
  const content = fs.readFileSync(filePath, 'utf-8');
  const hasDefaultExport = /export\s+default/.test(content);
  
  if (!hasDefaultExport) {
    log.warn('Component missing default export', { componentName });
  }

  // Generate destination path
  const toPath = generateDestinationPath(componentName, normalized.normalized);
  const fullToPath = path.join(feRoot, toPath);
  
  // Check for collisions
  if (fs.existsSync(fullToPath)) {
    throw new OMTRACEError(
      `Destination already exists: ${toPath}`,
      EXIT_CODES.REFACTOR_BLOCKED
    );
  }

  // Check mixed usage
  const mixedUsage = checkMixedUsage(componentName, normalized.normalized);
  if (mixedUsage.hasMixedUsage && !options.force) {
    throw new OMTRACEError(
      `Component has mixed usage: ${mixedUsage.reason}`,
      EXIT_CODES.REFACTOR_BLOCKED
    );
  }

  // Determine domain and slug
  const { domain, slug } = detectDomainAndSlug(componentName);

  if (options.dryRun) {
    return {
      from: normalized.normalized,
      to: toPath,
      domain,
      slug,
      importUpdates: 0,
      notes: ['Dry run - no changes made'],
      success: true,
      filesTouched: [],
    };
  }

  // Execute the move
  try {
    // Step 1: Find all files that import this component
    log.info('Finding importing files for AST rewrite');
    const importingFiles = await findImportingFiles(normalized.normalized, feRoot);
    
    // Step 2: Create destination directory
    const destDir = path.dirname(fullToPath);
    fs.mkdirSync(destDir, { recursive: true });

    // Step 3: Move the file
    fs.copyFileSync(filePath, fullToPath);
    fs.unlinkSync(filePath);

    // Step 4: AST-based import rewriting
    log.info('Starting AST-based import rewriting', { importingFiles: importingFiles.length });
    const rewriter = new ImportRewriter(feRoot);
    const rewriteResult = await rewriter.rewriteImports(
      normalized.normalized,
      toPath,
      importingFiles
    );

    // Step 5: Validate the rewrite
    const validation = await validateImportRewrite(rewriteResult, feRoot);
    
    const notes = [
      'File moved successfully',
      `AST import rewriting completed: ${rewriteResult.successfulRewrites}/${rewriteResult.totalFiles} files updated`,
      validation.valid ? 'Import validation passed' : `Import validation issues: ${validation.errors.join(', ')}`,
    ];

    if (rewriteResult.failedRewrites > 0) {
      notes.push(`${rewriteResult.failedRewrites} files had rewrite failures - manual review needed`);
    }

    // Step 6: Append to refactor.md with detailed results
    const refactorLog = path.join(feRoot, 'refactor.md');
    const entry = `\n## ${new Date().toISOString()}\n- from: ${normalized.normalized}\n- to: ${toPath}\n- domain: ${domain}\n- slug: ${slug}\n- import updates: ${rewriteResult.successfulRewrites} successful, ${rewriteResult.failedRewrites} failed\n- files touched: ${importingFiles.length}\n- validation: ${validation.valid ? 'passed' : 'failed'}\n`;
    
    fs.appendFileSync(refactorLog, entry);

    // Step 7: Log detailed results
    if (options.verbose) {
      console.log('\n📝 Import Rewrite Details:');
      rewriteResult.details.forEach(detail => {
        const status = detail.success ? '✅' : '❌';
        console.log(`  ${status} ${detail.file}${detail.line ? ` (line ${detail.line})` : ''}`);
        if (!detail.success && detail.error) {
          console.log(`     Error: ${detail.error}`);
        }
      });
    }

    return {
      from: normalized.normalized,
      to: toPath,
      domain,
      slug,
      importUpdates: rewriteResult.successfulRewrites,
      notes,
      success: true,
      filesTouched: [normalized.normalized, toPath, ...importingFiles],
    };
  } catch (error) {
    // Rollback on failure
    if (fs.existsSync(fullToPath)) {
      fs.unlinkSync(fullToPath);
    }
    
    throw new OMTRACEError(
      `Failed to move file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      EXIT_CODES.REFACTOR_BLOCKED
    );
  }
}

/**
 * Resolve target for deletion
 */
function resolveDeleteTarget(nameOrPath: string, index: DepsIndex, feRoot: string): { target: string; resolvedFiles: string[] } {
  const normalized = normalizePath(nameOrPath, feRoot);
  
  if (normalized.exists) {
    // Direct path match
    const targetPath = normalized.normalized;
    const baseName = path.basename(targetPath, path.extname(targetPath));
    const dir = path.dirname(targetPath);
    
    // Find colocated files (tests, styles, etc.)
    const colocatedFiles = [targetPath];
    const possibleExtensions = ['.test.tsx', '.test.ts', '.spec.tsx', '.spec.ts', '.module.css', '.scss', '.css'];
    
    for (const ext of possibleExtensions) {
      const colocatedPath = path.join(dir, baseName + ext);
      if (fs.existsSync(path.join(feRoot, colocatedPath))) {
        colocatedFiles.push(colocatedPath);
      }
    }
    
    return { target: baseName, resolvedFiles: colocatedFiles };
  }
  
  // Resolve by name
  const candidates = resolveCandidates(normalized.candidate, index, { pickFirst: false });
  
  if (candidates.length === 0) {
    throw new OMTRACEError(
      `No candidates found for target: ${nameOrPath}`,
      EXIT_CODES.RESOLVER_FAILED
    );
  }
  
  if (candidates.length > 1) {
    // Pick best match (shortest path + src priority)
    const best = candidates.sort((a, b) => {
      const aSrc = a.path.includes('/src/') ? 0 : 1;
      const bSrc = b.path.includes('/src/') ? 0 : 1;
      if (aSrc !== bSrc) return aSrc - bSrc;
      return a.path.length - b.path.length;
    })[0];
    
    log.info(`Multiple candidates found, picking: ${best.path}`);
  }
  
  const targetPath = candidates[0].path;
  const baseName = path.basename(targetPath, path.extname(targetPath));
  
  return { target: baseName, resolvedFiles: [targetPath] };
}

/**
 * Find all references to target files
 */
function findReferences(resolvedFiles: string[], feRoot: string): RefHit[] {
  const refs: RefHit[] = [];
  const targetNames = resolvedFiles.map(f => path.basename(f, path.extname(f)));
  
  // Search patterns
  const searchDirs = [
    path.join(feRoot, 'src'),
    path.join(feRoot, '../server/src'), // Include server if exists
  ].filter(dir => fs.existsSync(dir));
  
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.md'];
  
  for (const searchDir of searchDirs) {
    const files = getAllFiles(searchDir, extensions);
    
    for (const file of files) {
      // Skip archived and node_modules
      if (file.includes('/_archive/') || file.includes('/node_modules/') || file.includes('/.backup')) {
        continue;
      }
      
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach((line, lineIndex) => {
          for (const targetName of targetNames) {
            if (line.includes(targetName)) {
              let kind: RefHit['kind'] = 'import';
              
              if (line.includes('import') && line.includes(targetName)) {
                kind = 'import';
              } else if (line.includes('lazy(') && line.includes(targetName)) {
                kind = 'route';
              } else if (line.includes('export') && line.includes(targetName)) {
                kind = 'barrel';
              } else if (file.includes('.test.') || file.includes('.spec.')) {
                kind = 'test';
              } else if (file.includes('.css') || file.includes('.scss')) {
                kind = 'style';
              } else if (file.includes('.json')) {
                kind = 'json';
              } else if (line.includes('menu') || line.includes('Menu')) {
                kind = 'menu';
              }
              
              refs.push({
                file: path.relative(feRoot, file),
                kind,
                line: lineIndex + 1,
                snippet: line.trim(),
              });
            }
          }
        });
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }
  }
  
  return refs;
}

/**
 * Get all files recursively
 */
function getAllFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  
  function walk(currentDir: string) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }
  
  walk(dir);
  return files;
}

/**
 * Build deletion plan
 */
function buildDeletePlan(resolved: { target: string; resolvedFiles: string[] }, refs: RefHit[], feRoot: string): DeletePlan {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5) + 'Z';
  const slug = resolved.target.toLowerCase().replace(/[^a-z0-9]/g, '');
  const branchName = `chore/delete-${slug}-${timestamp.slice(0, 12)}`;
  const archiveDir = path.join(feRoot, '_archive', 'omtrace-removed', timestamp, resolved.target);
  
  // Group references by file for patching
  const patchGroups = new Map<string, RefHit[]>();
  refs.forEach(ref => {
    if (!patchGroups.has(ref.file)) {
      patchGroups.set(ref.file, []);
    }
    patchGroups.get(ref.file)!.push(ref);
  });
  
  const patches = Array.from(patchGroups.entries()).map(([file, fileRefs]) => ({
    file,
    kind: fileRefs.map(r => r.kind).join(','),
    preview: `${fileRefs.length} reference(s): ${fileRefs.map(r => `L${r.line}`).join(', ')}`,
  }));
  
  return {
    target: resolved.target,
    resolvedFiles: resolved.resolvedFiles,
    patches,
    archiveDir,
    branchName,
  };
}

/**
 * Apply deletion plan
 */
async function applyDeletePlan(plan: DeletePlan, feRoot: string, dryRun: boolean = false): Promise<{ patched: number; archived: number }> {
  if (dryRun) {
    console.log('🔍 DRY RUN - No changes will be made');
    console.log(`Target: ${plan.target}`);
    console.log(`Files to archive: ${plan.resolvedFiles.length}`);
    console.log(`Files to patch: ${plan.patches.length}`);
    console.log(`Archive destination: ${plan.archiveDir}`);
    console.log(`Git branch: ${plan.branchName}`);
    return { patched: 0, archived: 0 };
  }
  
  // Create git branch
  const { execSync } = await import('child_process');
  try {
    execSync(`git checkout -b ${plan.branchName}`, { cwd: feRoot, stdio: 'pipe' });
    log.info(`Created branch: ${plan.branchName}`);
  } catch (error) {
    throw new OMTRACEError(
      `Failed to create git branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      EXIT_CODES.REFACTOR_BLOCKED
    );
  }
  
  // Archive files
  fs.mkdirSync(plan.archiveDir, { recursive: true });
  let archivedCount = 0;
  
  for (const file of plan.resolvedFiles) {
    const srcPath = path.join(feRoot, file);
    const destPath = path.join(plan.archiveDir, file);
    
    if (fs.existsSync(srcPath)) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
      fs.unlinkSync(srcPath);
      archivedCount++;
    }
  }
  
  // Patch references using AST-based approach
  let patchedCount = 0;
  
  // Use AST rewriter for more precise import removal
  const rewriter = new ImportRewriter(feRoot);
  const targetNames = plan.resolvedFiles.map(f => path.basename(f, path.extname(f)));
  
  for (const patch of plan.patches) {
    const filePath = path.join(feRoot, patch.file);
    
    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, 'utf-8');
        const originalContent = content;
        
        // AST-based import removal - more precise than regex
        for (const targetName of targetNames) {
          content = await removeImportsFromContent(content, targetName, patch.file, feRoot);
        }
        
        if (content !== originalContent) {
          fs.writeFileSync(filePath, content);
          patchedCount++;
          
          // Run prettier if available
          try {
            execSync(`npx prettier --write "${filePath}"`, { cwd: feRoot, stdio: 'pipe' });
          } catch {
            // Prettier not available or failed, continue
          }
        }
      } catch (error) {
        log.warn(`Failed to patch ${patch.file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
  
  // Stage changes
  try {
    execSync('git add -A', { cwd: feRoot, stdio: 'pipe' });
  } catch (error) {
    log.warn(`Failed to stage changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return { patched: patchedCount, archived: archivedCount };
}

/**
 * Verify build after deletion using auto-detected package manager
 */
async function verifyBuild(feRoot: string): Promise<{ typecheckOk: boolean; buildOk: boolean; errors?: string }> {
  log.info('Starting build verification with auto-detected package manager');
  
  let typecheckOk = true;
  let buildOk = true;
  let errors = '';
  
  const detector = new PackageManagerDetector(feRoot);
  
  // Try typecheck with detected package manager
  try {
    const typecheckCommand = await getSafeTypecheckCommand(feRoot);
    if (typecheckCommand) {
      log.debug('Running typecheck', { command: typecheckCommand });
      const result = await detector.executeCommand(typecheckCommand, { timeout: 120000 });
      if (!result.success) {
        typecheckOk = false;
        errors += `Typecheck failed: ${result.error || 'Unknown error'}\n`;
      }
    } else {
      log.info('No typecheck command available, skipping typecheck verification');
    }
  } catch (error) {
    typecheckOk = false;
    errors += `Typecheck failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
  }
  
  // Try build with detected package manager
  try {
    const buildCommand = await getSafeBuildCommand(feRoot);
    log.debug('Running build', { command: buildCommand });
    const result = await detector.executeCommand(buildCommand, { timeout: 300000 });
    if (!result.success) {
      buildOk = false;
      errors += `Build failed: ${result.error || 'Unknown error'}\n`;
    }
  } catch (error) {
    buildOk = false;
    errors += `Build failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
  }
  
  log.info('Build verification completed', { typecheckOk, buildOk });
  return { typecheckOk, buildOk, errors: errors || undefined };
}

/**
 * Run delete command
 */
async function runDelete(target: string, feRoot: string, options: CLIOptions): Promise<DeleteResult> {
  log.info('Running delete', { target, feRoot, dryRun: options.dryRun });
  
  if (!target) {
    throw new OMTRACEError(
      'Delete command requires a target. Usage: omtrace delete <target>',
      EXIT_CODES.RESOLVER_FAILED
    );
  }
  
  const indexPath = options.indexPath || getDefaultIndexPath(feRoot);
  const index = readIndexOrThrow(indexPath);
  
  // Step 1: Resolve target
  const resolved = resolveDeleteTarget(target, index, feRoot);
  
  // Step 2: Find references
  const refs = findReferences(resolved.resolvedFiles, feRoot);
  
  // Step 3: Build plan
  const plan = buildDeletePlan(resolved, refs, feRoot);
  
  if (options.dryRun) {
    await applyDeletePlan(plan, feRoot, true);
    return {
      success: true,
      target: plan.target,
      patched: plan.patches.length,
      archived: plan.resolvedFiles.length,
      branchName: plan.branchName,
      archiveDir: plan.archiveDir,
    };
  }
  
  // Step 4: Apply plan
  const { patched, archived } = await applyDeletePlan(plan, feRoot, false);
  
  // Step 5: Verify
  const verifyResult = await verifyBuild(feRoot);
  
  if (!verifyResult.typecheckOk || !verifyResult.buildOk) {
    // Restore files on verification failure
    const { execSync } = await import('child_process');
    try {
      // Move archived files back
      for (const file of plan.resolvedFiles) {
        const srcPath = path.join(plan.archiveDir, file);
        const destPath = path.join(feRoot, file);
        
        if (fs.existsSync(srcPath)) {
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.copyFileSync(srcPath, destPath);
        }
      }
      
      execSync('git add -A', { cwd: feRoot, stdio: 'pipe' });
      
      return {
        success: false,
        target: plan.target,
        patched,
        archived,
        branchName: plan.branchName,
        archiveDir: plan.archiveDir,
        errors: ['Verification failed - files restored'],
        verifyResult,
      };
    } catch (restoreError) {
      return {
        success: false,
        target: plan.target,
        patched,
        archived,
        branchName: plan.branchName,
        archiveDir: plan.archiveDir,
        errors: ['Verification failed and restore failed'],
        verifyResult,
      };
    }
  }
  
  // Step 6: Commit
  const { execSync } = await import('child_process');
  try {
    const commitMessage = `chore(omtrace): delete ${plan.target}
- patched ${patched} files
- archived ${archived} files → ${plan.archiveDir}
- verify: typecheck/build passed`;
    
    execSync(`git commit -m "${commitMessage}"`, { cwd: feRoot, stdio: 'pipe' });
  } catch (error) {
    log.warn(`Failed to commit: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    success: true,
    target: plan.target,
    patched,
    archived,
    branchName: plan.branchName,
    archiveDir: plan.archiveDir,
    verifyResult,
  };
}

/**
 * Remove imports from content string
 */
async function removeImportsFromContent(
  content: string, 
  targetName: string, 
  filePath: string, 
  feRoot: string
): Promise<string> {
  const lines = content.split('\n');
  const filteredLines: string[] = [];
  
  for (const line of lines) {
    let shouldRemove = false;
    
    // Check if line contains import of target
    if (line.trim().startsWith('import') && line.includes(targetName)) {
      // More precise matching
      const importRegex = new RegExp(`\\b${targetName}\\b`);
      if (importRegex.test(line)) {
        shouldRemove = true;
      }
    }
    
    // Check for lazy imports
    if (line.includes('lazy(') && line.includes(targetName)) {
      shouldRemove = true;
    }
    
    // Check for export statements
    if (line.includes('export') && line.includes(targetName)) {
      shouldRemove = true;
    }
    
    if (!shouldRemove) {
      filteredLines.push(line);
    }
  }
  
  return filteredLines.join('\n');
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  try {
    const options = parseArgs();
    
    // Set up logging
    setVerbose(options.verbose);
    
    // Locate front-end root
    const feRoot = options.feRoot || locateFERoot();
    log.info('Front-end root located', { feRoot });

    // Check if index needs refresh (unless building index)
    if (!options.buildIndex && needsRefresh(feRoot)) {
      console.log('🔄 Index is stale, auto-refreshing...');
      try {
        const { buildIndex } = await import('./build_index.js');
        await buildIndex();
        console.log('✅ Index auto-refreshed successfully');
      } catch (error) {
        console.warn('⚠️  Auto-refresh failed, using existing index:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Handle different modes
    if (options.selftest) {
      const result = await withAbort(
        runSelfTest(feRoot),
        { timeoutMs: options.timeout, operation: 'self_test' }
      );
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('✅ Self-test passed');
        console.log(`Front-end: ${result.feRoot}`);
        console.log(`Index: ${result.index.files} files, ${Math.round(result.index.ageMs / (1000 * 60 * 60))}h old`);
      }
      
      if (!result.ok) {
        process.exit(1);
      }
      return;
    }

    if (options.buildIndex) {
      const { buildIndex } = await import('./build_index.js');
      await withAbort(
        buildIndex(),
        { timeoutMs: options.timeout, operation: 'build_index' }
      );
      console.log('✅ Index built successfully');
      return;
    }

    // Handle cache clearing
    if (options.clearCache) {
      const resolver = new InteractiveResolver(feRoot);
      await resolver.clearCache();
      console.log('✅ User choice cache cleared');
      return;
    }

    // Handle menu commands
    if (options.menuCommand) {
      await handleMenuCommand(options.menuCommand, feRoot, options);
      return;
    }

    // Handle delete command
    if (options.delete) {
      const result = await withAbort(
        runDelete(options.target!, feRoot, options),
        { timeoutMs: options.timeout, operation: 'delete' }
      );
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.success) {
          console.log(`\n🗑️ Successfully deleted: ${result.target}`);
          console.log(`📁 Archived ${result.archived} files to: ${result.archiveDir}`);
          console.log(`🔧 Patched ${result.patched} files`);
          console.log(`🌿 Created branch: ${result.branchName}`);
          
          if (result.verifyResult) {
            console.log(`✅ Verification: typecheck=${result.verifyResult.typecheckOk}, build=${result.verifyResult.buildOk}`);
          }
          
          console.log(`\n📋 Undo instructions:`);
          console.log(`  git switch -`);
          console.log(`  git branch -D ${result.branchName}`);
        } else {
          console.log(`\n❌ Deletion failed: ${result.target}`);
          if (result.errors) {
            result.errors.forEach(error => console.log(`  • ${error}`));
          }
          if (result.verifyResult?.errors) {
            console.log(`\nVerification errors:\n${result.verifyResult.errors}`);
          }
        }
      }
      
      if (!result.success) {
        process.exit(1);
      }
      return;
    }

    // Handle naming convention check
    if (options.target === 'check') {
      checkNamingConventions(feRoot);
      return;
    }

    if (!options.target) {
      showHelp();
      throw new OMTRACEError(
        'No target specified. Use --help for usage information.',
        EXIT_CODES.RESOLVER_FAILED
      );
    }

    if (options.trace) {
      const result = await withAbort(
        runTrace(options.target, feRoot, options),
        { timeoutMs: options.timeout, operation: 'trace' }
      );
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`\n🔍 Trace result for: ${result.entry}`);
        console.log(`📁 Resolved path: ${result.resolvedPath}`);
        console.log(`\n📊 Dependency Summary:`);
        console.log(`  • Direct imports: ${result.counts.direct}`);
        if (options.reverse) {
          console.log(`  • Reverse imports: ${result.counts.reverse}`);
        }
        if (options.deep) {
          console.log(`  • Transitive dependencies: ${result.counts.transitive}`);
        }
        if (result.counts.server > 0) {
          console.log(`  • Server endpoints: ${result.counts.server}`);
        }
        
        if (result.counts.direct > 0) {
          console.log(`\n📥 Direct imports:`);
          result.deps.direct.forEach(imp => console.log(`  • ${imp}`));
        }
        
        if (options.reverse && result.counts.reverse > 0) {
          console.log(`\n📤 Reverse imports (who uses this file):`);
          result.deps.reverse.forEach(imp => console.log(`  • ${imp}`));
        }
        
        if (options.deep && result.counts.transitive > 0) {
          console.log(`\n🔄 Transitive dependencies:`);
          result.deps.transitive.forEach(imp => console.log(`  • ${imp}`));
        }
        
        if (result.counts.server > 0) {
          console.log(`\n🖥️  Server endpoints:`);
          result.deps.server.forEach(imp => console.log(`  • ${imp}`));
        }
        
        if (result.candidates && result.candidates.length > 1) {
          console.log(`\n⚠️  Ambiguous candidates:`, result.candidates.map(c => c.path).join(', '));
        }

        // Show route information if available
        if (options.showRoute && result.routes && result.routes.length > 0) {
          console.log(`\n🌐 Route References:`);
          result.routes.forEach(route => {
            console.log(`  • ${route.path} → ${route.file} (line ${route.line})`);
          });
        }

        if (options.showRoute && result.componentReferences && result.componentReferences.length > 0) {
          console.log(`\n📋 Component References:`);
          result.componentReferences.forEach(ref => {
            console.log(`  • ${ref}`);
          });
        }
      }
      
      if (result.status === 'ambiguous') {
        process.exit(EXIT_CODES.AMBIGUOUS);
      }
      return;
    }

    if (options.refactor) {
      // Load index for refactor mode
      const indexPath = options.indexPath || getDefaultIndexPath(feRoot);
      const index = readIndexOrThrow(indexPath);
      await handleRefactor(options.target, feRoot, options, index);
      return;
    }

    // Default to trace mode
    const result = await withAbort(
      runTrace(options.target, feRoot, options),
      { timeoutMs: options.timeout, operation: 'trace' }
    );
    
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\n🔍 Trace result for: ${result.entry}`);
      console.log(`📁 Resolved path: ${result.resolvedPath}`);
      console.log(`\n📊 Dependency Summary:`);
      console.log(`  • Direct imports: ${result.counts.direct}`);
      if (options.reverse) {
        console.log(`  • Reverse imports: ${result.counts.reverse}`);
      }
      if (options.deep) {
        console.log(`  • Transitive dependencies: ${result.counts.transitive}`);
      }
      if (result.counts.server > 0) {
        console.log(`  • Server endpoints: ${result.counts.server}`);
      }
      
      if (result.counts.direct > 0) {
        console.log(`\n📥 Direct imports:`);
        result.deps.direct.forEach(imp => console.log(`  • ${imp}`));
      }
      
      if (options.reverse && result.counts.reverse > 0) {
        console.log(`\n📤 Reverse imports (who uses this file):`);
        result.deps.reverse.forEach(imp => console.log(`  • ${imp}`));
        }
      
      if (options.deep && result.counts.transitive > 0) {
        console.log(`\n🔄 Transitive dependencies:`);
        result.deps.transitive.forEach(imp => console.log(`  • ${imp}`));
      }
      
      if (result.counts.server > 0) {
        console.log(`\n🖥️  Server endpoints:`);
        result.deps.server.forEach(imp => console.log(`  • ${imp}`));
      }
    }

  } catch (error) {
    if (error instanceof OMTRACEError) {
      exitWithError(error, parseArgs().json);
    } else {
      const genericError = new OMTRACEError(
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        EXIT_CODES.RESOLVER_FAILED
      );
      exitWithError(genericError, parseArgs().json);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
