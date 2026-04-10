#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/dependencyChecker.ts (OMD-881)
 *
 * Covers:
 *   - extractImports        (private, via __test__) — regex extraction
 *   - getImportType         (private, via __test__) — relative/absolute/package
 *   - resolveImportPath     (private, via __test__) — extension search + index
 *   - checkDependencies     (public) — full pipeline against tmp files
 *   - checkMultipleDependencies (public)
 *   - getDependencySummary  (public) — aggregation
 *
 * Run: npx tsx server/src/utils/__tests__/dependencyChecker.test.ts
 *
 * Exits non-zero on any failure.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

import {
  checkDependencies,
  checkMultipleDependencies,
  getDependencySummary,
  __test__,
  ImportDependency,
  DependencyCheckResult,
} from '../dependencyChecker';

const { extractImports, getImportType, resolveImportPath } = __test__;

let passed = 0;
let failed = 0;

function assert(cond: any, message: string): void {
  if (cond) { console.log(`  PASS: ${message}`); passed++; }
  else { console.error(`  FAIL: ${message}`); failed++; }
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { console.log(`  PASS: ${message}`); passed++; }
  else {
    console.error(`  FAIL: ${message}\n         expected: ${e}\n         actual:   ${a}`);
    failed++;
  }
}

// ============================================================================
// extractImports
// ============================================================================
console.log('\n── extractImports ────────────────────────────────────────');

// Empty file
assertEq(extractImports(''), [], 'empty content → no imports');
assertEq(extractImports('// just a comment\nconst x = 1;'), [], 'no imports → empty');

// ES import default
const r1 = extractImports("import React from 'react';");
assertEq(r1.length, 1, 'default import: count 1');
assertEq(r1[0].importPath, 'react', 'default import: path');
assertEq(r1[0].lineNumber, 1, 'default import: line 1');

// ES import named
const r2 = extractImports("import { foo, bar } from './utils';");
assertEq(r2.length, 1, 'named import: count 1');
assertEq(r2[0].importPath, './utils', 'named import: path');

// Bare import (side effect)
const r3 = extractImports("import './styles.css';");
assertEq(r3.length, 1, 'bare import: count 1');
assertEq(r3[0].importPath, './styles.css', 'bare import: path');

// ES import namespace
const r4 = extractImports("import * as fs from 'fs';");
assertEq(r4.length, 1, 'namespace import: count 1');
assertEq(r4[0].importPath, 'fs', 'namespace import: path');

// require
const r5 = extractImports("const path = require('path');");
assertEq(r5.length, 1, 'require: count 1');
assertEq(r5[0].importPath, 'path', 'require: path');

// dynamic import
const r6 = extractImports("const mod = await import('./lazy');");
assertEq(r6.length, 1, 'dynamic import: count 1');
assertEq(r6[0].importPath, './lazy', 'dynamic import: path');

// Multi-line file with several imports
const multi = `import React from 'react';
import { useState, useEffect } from 'react';
import './styles.css';

const path = require('path');

async function load() {
  const mod = await import('./component');
  return mod;
}`;
const rMulti = extractImports(multi);
assert(rMulti.length >= 5, `multi-line: at least 5 imports (got ${rMulti.length})`);
const lineMap = rMulti.reduce((m, i) => { m[i.importPath] = i.lineNumber; return m; }, {} as Record<string, number>);
assertEq(lineMap['./styles.css'], 3, 'styles.css on line 3');
assertEq(lineMap['path'], 5, 'path on line 5');
assertEq(lineMap['./component'], 8, 'component on line 8');

// Mixed quote styles (single, double)
const mixed = `import a from "double";
import b from 'single';`;
const rMixed = extractImports(mixed);
assertEq(rMixed.length, 2, 'mixed quotes: count 2');
assertEq(rMixed.find(i => i.importPath === 'double')?.lineNumber, 1, 'double quote import');
assertEq(rMixed.find(i => i.importPath === 'single')?.lineNumber, 2, 'single quote import');

// ============================================================================
// getImportType
// ============================================================================
console.log('\n── getImportType ─────────────────────────────────────────');

// Relative
assertEq(getImportType('./foo'), 'relative', './foo → relative');
assertEq(getImportType('./bar/baz'), 'relative', './bar/baz → relative');
assertEq(getImportType('../foo'), 'relative', '../foo → relative');
assertEq(getImportType('../../utils/helper'), 'relative', '../../utils/helper → relative');

// Absolute
assertEq(getImportType('/etc/foo'), 'absolute', '/etc/foo → absolute');
assertEq(getImportType('@/components/Button'), 'absolute', '@/components → absolute (alias)');

// Package
assertEq(getImportType('react'), 'package', 'react → package');
assertEq(getImportType('@mui/material'), 'package', '@mui/material → package (scoped)');
assertEq(getImportType('lodash/fp'), 'package', 'lodash/fp → package (subpath)');
assertEq(getImportType('fs'), 'package', 'fs → package (node builtin)');

// ============================================================================
// resolveImportPath — uses tmp directory
// ============================================================================
console.log('\n── resolveImportPath ─────────────────────────────────────');

const tmpRoot = path.join(os.tmpdir(), `omd-881-deps-${Date.now()}-${Math.random().toString(36).slice(2)}`);
fs.mkdirSync(tmpRoot, { recursive: true });
fs.mkdirSync(path.join(tmpRoot, 'utils'), { recursive: true });
fs.mkdirSync(path.join(tmpRoot, 'components'), { recursive: true });
fs.mkdirSync(path.join(tmpRoot, 'components/Button'), { recursive: true });

// Create files
fs.writeFileSync(path.join(tmpRoot, 'main.ts'), '// main');
fs.writeFileSync(path.join(tmpRoot, 'utils/helper.ts'), '// helper');
fs.writeFileSync(path.join(tmpRoot, 'utils/legacy.js'), '// legacy');
fs.writeFileSync(path.join(tmpRoot, 'utils/data.json'), '{}');
fs.writeFileSync(path.join(tmpRoot, 'components/Button/index.tsx'), '// button index');

const sourceFile = path.join(tmpRoot, 'main.ts');

// Helper to run async tests
async function runAsyncTests() {
  // Package import → returns null (skipped)
  const pkg = await resolveImportPath('react', sourceFile, tmpRoot);
  assertEq(pkg, null, 'package import → null');

  // Relative .ts (no extension)
  const tsResolved = await resolveImportPath('./utils/helper', sourceFile, tmpRoot);
  assertEq(tsResolved, path.join(tmpRoot, 'utils/helper.ts'), 'relative .ts: extension search');

  // Relative .js (no extension)
  const jsResolved = await resolveImportPath('./utils/legacy', sourceFile, tmpRoot);
  assertEq(jsResolved, path.join(tmpRoot, 'utils/legacy.js'), 'relative .js: extension search');

  // Relative .json (with explicit extension)
  const jsonResolved = await resolveImportPath('./utils/data.json', sourceFile, tmpRoot);
  assertEq(jsonResolved, path.join(tmpRoot, 'utils/data.json'), 'relative .json: explicit ext');

  // Directory with index.tsx
  const dirResolved = await resolveImportPath('./components/Button', sourceFile, tmpRoot);
  assertEq(dirResolved, path.join(tmpRoot, 'components/Button/index.tsx'), 'directory with index.tsx');

  // Non-existent → null
  const missing = await resolveImportPath('./nonexistent', sourceFile, tmpRoot);
  assertEq(missing, null, 'missing file → null');

  // Absolute @/ alias
  const aliasResolved = await resolveImportPath('@/utils/helper', sourceFile, tmpRoot);
  assertEq(aliasResolved, path.join(tmpRoot, 'utils/helper.ts'), '@/ alias resolves to base path');

  // ──────────────────────────────────────────────────────────────────────
  // checkDependencies
  // ──────────────────────────────────────────────────────────────────────
  console.log('\n── checkDependencies ─────────────────────────────────────');

  // File with no imports
  const noImportsFile = path.join(tmpRoot, 'no-imports.ts');
  fs.writeFileSync(noImportsFile, 'const x = 1;\nconst y = 2;');
  const noImports = await checkDependencies(noImportsFile, tmpRoot);
  assertEq(noImports.hasImports, false, 'no imports: hasImports false');
  assertEq(noImports.imports.length, 0, 'no imports: empty imports list');
  assertEq(noImports.allDependenciesExist, true, 'no imports: allDependenciesExist true (vacuously)');
  assertEq(noImports.missingCount, 0, 'no imports: missingCount 0');

  // File with all-resolvable imports
  const goodFile = path.join(tmpRoot, 'good.ts');
  fs.writeFileSync(
    goodFile,
    `import { helper } from './utils/helper';
import legacy from './utils/legacy';
import Button from './components/Button';
import React from 'react';`
  );
  const good = await checkDependencies(goodFile, tmpRoot);
  assertEq(good.hasImports, true, 'good file: hasImports true');
  // package imports (react) are skipped, so we expect 3 imports tracked
  assertEq(good.imports.length, 3, 'good file: 3 non-package imports tracked');
  assertEq(good.missingCount, 0, 'good file: no missing');
  assertEq(good.allDependenciesExist, true, 'good file: all deps exist');

  // File with missing imports
  const badFile = path.join(tmpRoot, 'bad.ts');
  fs.writeFileSync(
    badFile,
    `import { helper } from './utils/helper';
import { ghost } from './utils/ghost';
import { phantom } from './utils/phantom';`
  );
  const bad = await checkDependencies(badFile, tmpRoot);
  assertEq(bad.hasImports, true, 'bad file: hasImports true');
  assertEq(bad.imports.length, 3, 'bad file: 3 imports');
  assertEq(bad.missingCount, 2, 'bad file: 2 missing');
  assertEq(bad.allDependenciesExist, false, 'bad file: not all deps exist');
  assertEq(
    bad.missingImports.map(i => i.importPath).sort(),
    ['./utils/ghost', './utils/phantom'],
    'bad file: missing import paths'
  );

  // Each missing import should have exists=false and resolvedPath=null
  for (const mi of bad.missingImports) {
    assertEq(mi.exists, false, `missing import "${mi.importPath}" has exists=false`);
    assertEq(mi.resolvedPath, null, `missing import "${mi.importPath}" has resolvedPath=null`);
  }

  // Non-existent source file → returns empty result without throwing
  const ghostResult = await checkDependencies(path.join(tmpRoot, 'ghost.ts'), tmpRoot);
  assertEq(ghostResult.hasImports, false, 'non-existent source: hasImports false');
  assertEq(ghostResult.imports.length, 0, 'non-existent source: empty imports');

  // ──────────────────────────────────────────────────────────────────────
  // checkMultipleDependencies
  // ──────────────────────────────────────────────────────────────────────
  console.log('\n── checkMultipleDependencies ─────────────────────────────');

  const multipleResults = await checkMultipleDependencies([goodFile, badFile, noImportsFile], tmpRoot);
  assertEq(multipleResults.length, 3, 'multiple: 3 results');
  assertEq(multipleResults[0].filePath, goodFile, 'multiple: result[0] is goodFile');
  assertEq(multipleResults[1].filePath, badFile, 'multiple: result[1] is badFile');
  assertEq(multipleResults[2].filePath, noImportsFile, 'multiple: result[2] is noImportsFile');
  assertEq(multipleResults[1].missingCount, 2, 'multiple: badFile reports 2 missing');

  // ──────────────────────────────────────────────────────────────────────
  // getDependencySummary
  // ──────────────────────────────────────────────────────────────────────
  console.log('\n── getDependencySummary ──────────────────────────────────');

  const summary = getDependencySummary(multipleResults);
  assertEq(summary.totalFiles, 3, 'summary: totalFiles 3');
  assertEq(summary.filesWithImports, 2, 'summary: filesWithImports 2 (good + bad)');
  assertEq(summary.filesWithMissingDeps, 1, 'summary: filesWithMissingDeps 1');
  assertEq(summary.totalMissingDeps, 2, 'summary: totalMissingDeps 2');
  assertEq(summary.criticalFiles.length, 0, 'summary: no critical (need >3 missing)');

  // Critical file: > 3 missing
  const criticalFile = path.join(tmpRoot, 'critical.ts');
  fs.writeFileSync(
    criticalFile,
    `import a from './missing-a';
import b from './missing-b';
import c from './missing-c';
import d from './missing-d';
import e from './missing-e';`
  );
  const critResult = await checkDependencies(criticalFile, tmpRoot);
  const critSummary = getDependencySummary([critResult]);
  assertEq(critSummary.criticalFiles.length, 1, 'critical: 1 critical file (> 3 missing)');
  assertEq(critSummary.totalMissingDeps, 5, 'critical: 5 total missing');

  // Empty list
  const emptySummary = getDependencySummary([]);
  assertEq(emptySummary.totalFiles, 0, 'empty: totalFiles 0');
  assertEq(emptySummary.filesWithImports, 0, 'empty: filesWithImports 0');
  assertEq(emptySummary.filesWithMissingDeps, 0, 'empty: filesWithMissingDeps 0');
  assertEq(emptySummary.totalMissingDeps, 0, 'empty: totalMissingDeps 0');
  assertEq(emptySummary.criticalFiles.length, 0, 'empty: no critical');

  // Cleanup
  fs.removeSync(tmpRoot);
}

runAsyncTests()
  .then(() => {
    console.log(`\n──────────────────────────────────────────────────────────`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  })
  .catch((err) => {
    console.error('Test runner crashed:', err);
    try { fs.removeSync(tmpRoot); } catch {}
    process.exit(2);
  });
