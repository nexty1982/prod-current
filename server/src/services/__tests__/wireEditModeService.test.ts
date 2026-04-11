#!/usr/bin/env npx tsx
/**
 * Unit tests for services/wireEditModeService.js (OMD-1194)
 *
 * Pure transform engine for auto-wiring Edit Mode in TSX files.
 * Only external deps are `fs` and `path` — no DB, no network.
 *
 * Strategy: require the SUT first (so Node's CJS loader runs with real fs),
 * then monkey-patch fs.existsSync / readFileSync / writeFileSync to serve
 * test fixtures from an in-memory map. All unknown paths fall through to
 * the original implementations so the module loader is never broken.
 *
 * Coverage:
 *   - resolveFilePath:
 *       · absolute path returned as-is
 *       · relative path exists in front-end/src
 *       · relative path exists in project root (fallback)
 *       · path not found → returns front-end/src best guess
 *   - previewTransform:
 *       · file not found → { success: false, error }
 *       · no changes → totalChanges: 0, empty diff
 *       · Phase 1 single-line wrapping (<h1>{t('k')}</h1>)
 *       · Phase 1 multi-line wrapping
 *       · Phase 1 className attribute preserved
 *       · Phase 1 skip when covered by shared section prefix
 *       · Phase 2 simple array of t() calls + .map render site
 *       · Phase 2 object array with t() prop values
 *       · Phase 2b standalone {t('key')} in non-wrappable parent
 *       · Phase 3 import injection when changes > 0
 *       · Phase 3 skip when import already present
 *       · Phase 4 uncovered calls flagged
 *       · Phase 4 prop-value calls classified separately
 *       · allCovered flag reflects uncovered count
 *       · diff hunks generated when changes present
 *   - applyTransform:
 *       · file not found → error
 *       · no changes → applied: false, no write
 *       · happy path → fs.writeFileSync called with transformed source
 *       · already has import → importAdded: false
 *
 * Run: npx tsx server/src/services/__tests__/wireEditModeService.test.ts
 */

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

// ── Require the SUT BEFORE patching fs ──────────────────────────────
// The CJS loader uses fs internally to read .js source files. We must
// let it complete with the real fs, then swap in stubs.
const nodePath = require('path');
const wireEditModeService = require('../wireEditModeService');
const { previewTransform, applyTransform, resolveFilePath } = wireEditModeService;

// Compute absolute paths that match what the SUT computes internally.
const SUT_PATH = require.resolve('../wireEditModeService');
const SUT_DIR = nodePath.dirname(SUT_PATH);
const FRONTEND_SRC = nodePath.resolve(SUT_DIR, '../../../front-end/src');
const PROJECT_ROOT = nodePath.resolve(SUT_DIR, '../../..');

// ── fs patching (post-require) ──────────────────────────────────────
const fs = require('fs');
const origExistsSync = fs.existsSync;
const origReadFileSync = fs.readFileSync;
const origWriteFileSync = fs.writeFileSync;

const fsFiles: Record<string, string> = {};
const writtenFiles: Record<string, string> = {};

fs.existsSync = (p: any) => {
  if (typeof p === 'string' && p in fsFiles) return true;
  // Important: fall through to real impl so Node's module loader still works
  // if something needs to check for real files.
  return origExistsSync(p);
};
fs.readFileSync = (p: any, ...rest: any[]) => {
  if (typeof p === 'string' && p in fsFiles) return fsFiles[p];
  return origReadFileSync(p, ...rest);
};
fs.writeFileSync = (p: any, content: any, enc?: any) => {
  if (typeof p === 'string' && p in fsFiles) {
    writtenFiles[p] = String(content);
    // Also update the file so a subsequent read sees the new content
    fsFiles[p] = String(content);
    return;
  }
  return origWriteFileSync(p, content, enc);
};

function reset() {
  for (const k of Object.keys(fsFiles)) delete fsFiles[k];
  for (const k of Object.keys(writtenFiles)) delete writtenFiles[k];
}

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// ============================================================================
// resolveFilePath
// ============================================================================
console.log('\n── resolveFilePath ───────────────────────────────────────');

// Absolute path returned as-is
assertEq(resolveFilePath('/abs/path/file.tsx'), '/abs/path/file.tsx', 'absolute path returned as-is');
assertEq(resolveFilePath('/etc/hostname'), '/etc/hostname', 'another absolute path as-is');

// Relative path exists in FRONTEND_SRC
reset();
{
  const p = nodePath.resolve(FRONTEND_SRC, 'components/foo.tsx');
  fsFiles[p] = '';
  assertEq(resolveFilePath('components/foo.tsx'), p, 'relative path resolves under FRONTEND_SRC');
}

// Relative path NOT in FRONTEND_SRC but IS in project root
reset();
{
  const p = nodePath.resolve(PROJECT_ROOT, 'docs/example.md');
  fsFiles[p] = '';
  assertEq(resolveFilePath('docs/example.md'), p, 'relative path falls through to project root');
}

// Path not found anywhere → FRONTEND_SRC best guess
reset();
{
  const bestGuess = nodePath.resolve(FRONTEND_SRC, 'nope/file.tsx');
  assertEq(resolveFilePath('nope/file.tsx'), bestGuess, 'not-found returns FRONTEND_SRC best guess');
}

// ============================================================================
// previewTransform: file not found
// ============================================================================
console.log('\n── previewTransform: file not found ──────────────────────');

reset();
{
  const r = previewTransform('/definitely/not/a/real/path.tsx');
  assertEq(r.success, false, 'success=false for missing');
  assert(r.error && r.error.includes('File not found'), 'error mentions File not found');
}

// ============================================================================
// previewTransform: no changes needed
// ============================================================================
console.log('\n── previewTransform: no changes ──────────────────────────');

reset();
{
  const p = nodePath.resolve(FRONTEND_SRC, 'NoChanges.tsx');
  fsFiles[p] = `import React from 'react';
export default function Foo() { return <div>hello world</div>; }
`;
  const r = previewTransform('NoChanges.tsx');
  assertEq(r.success, true, 'success');
  assertEq(r.totalChanges, 0, 'totalChanges=0');
  assertEq(r.phases.directElements, 0, 'directElements=0');
  assertEq(r.phases.arrayPatterns, 0, 'arrayPatterns=0');
  assertEq(r.phases.standaloneCalls, 0, 'standaloneCalls=0');
  assertEq(r.phases.importAdded, false, 'importAdded=false');
  assertEq(r.diff.length, 0, 'no diff hunks');
  assertEq(r.allCovered, true, 'allCovered=true (nothing uncovered)');
}

// ============================================================================
// previewTransform: Phase 1 single-line wrapping
// ============================================================================
console.log('\n── previewTransform: Phase 1 single-line ─────────────────');

reset();
{
  const p = nodePath.resolve(FRONTEND_SRC, 'SingleLine.tsx');
  fsFiles[p] = `import React from 'react';
import { useTranslation } from 'react-i18next';
function Hero() {
  const { t } = useTranslation();
  return <h1>{t('hero.title')}</h1>;
}
`;
  const r = previewTransform('SingleLine.tsx');
  assertEq(r.success, true, 'success');
  assertEq(r.totalChanges, 1, 'one change');
  assertEq(r.phases.directElements, 1, 'directElements=1');
  assertEq(r.phases.importAdded, true, 'importAdded=true');
  assert(r.diff.length > 0, 'diff has hunks');
  assertEq(r.allCovered, true, 'allCovered=true after wrapping');
}

// ============================================================================
// previewTransform: Phase 1 multi-line wrapping
// ============================================================================
console.log('\n── previewTransform: Phase 1 multi-line ──────────────────');

reset();
{
  const p = nodePath.resolve(FRONTEND_SRC, 'MultiLine.tsx');
  fsFiles[p] = `import React from 'react';
function Foo() {
  const { t } = useTranslation();
  return (
    <h2 className="text-xl">
      {t('home.subtitle')}
    </h2>
  );
}
`;
  const r = previewTransform('MultiLine.tsx');
  assertEq(r.success, true, 'success');
  assertEq(r.phases.directElements, 1, 'directElements=1 (multi-line)');
  assertEq(r.totalChanges, 1, 'totalChanges=1');
  assertEq(r.phases.importAdded, true, 'importAdded=true');
  assertEq(r.allCovered, true, 'allCovered');
}

// ============================================================================
// previewTransform: Phase 1 skip when covered by shared section
// ============================================================================
console.log('\n── previewTransform: shared section coverage ─────────────');

reset();
{
  const p = nodePath.resolve(FRONTEND_SRC, 'SharedSection.tsx');
  // HeroSection with editKeyPrefix="hero" — all hero.* keys covered
  fsFiles[p] = `import React from 'react';
import HeroSection from '@/components/frontend-pages/shared/HeroSection';
function Page() {
  const { t } = useTranslation();
  return (
    <HeroSection editKeyPrefix="hero">
      <h1>{t('hero.title')}</h1>
    </HeroSection>
  );
}
`;
  const r = previewTransform('SharedSection.tsx');
  assertEq(r.success, true, 'success');
  assertEq(r.totalChanges, 0, 'no changes — hero.title covered');
  assertEq(r.coveredPrefixes.length, 1, 'one covered prefix');
  assertEq(r.coveredPrefixes[0], 'hero', 'prefix = hero');
  assertEq(r.allCovered, true, 'allCovered');
}

// ============================================================================
// previewTransform: Phase 2 simple array
// ============================================================================
console.log('\n── previewTransform: Phase 2 simple array ────────────────');

reset();
{
  const p = nodePath.resolve(FRONTEND_SRC, 'SimpleArray.tsx');
  fsFiles[p] = `import React from 'react';
function List() {
  const { t } = useTranslation();
  const features = [
    t('features.a'),
    t('features.b'),
    t('features.c'),
  ];
  return <ul>{features.map((feature) => <li>{feature}</li>)}</ul>;
}
`;
  const r = previewTransform('SimpleArray.tsx');
  assertEq(r.success, true, 'success');
  assertEq(r.phases.arrayPatterns, 3, 'arrayPatterns=3 keys');
  assert(r.totalChanges >= 3, 'totalChanges >= 3');
  assertEq(r.phases.importAdded, true, 'import added');
}

// ============================================================================
// previewTransform: Phase 2 object array
// ============================================================================
console.log('\n── previewTransform: Phase 2 object array ────────────────');

reset();
{
  const p = nodePath.resolve(FRONTEND_SRC, 'ObjectArray.tsx');
  fsFiles[p] = `import React from 'react';
function Cards() {
  const { t } = useTranslation();
  const cards = [
    { title: t('cards.one.title'), desc: t('cards.one.desc') },
    { title: t('cards.two.title'), desc: t('cards.two.desc') },
  ];
  return (
    <div>
      {cards.map((card) => (
        <div>
          <h3>{card.title}</h3>
          <p>{card.desc}</p>
        </div>
      ))}
    </div>
  );
}
`;
  const r = previewTransform('ObjectArray.tsx');
  assertEq(r.success, true, 'success');
  assert(r.phases.arrayPatterns >= 2, 'arrayPatterns >= 2 props transformed');
  assertEq(r.phases.importAdded, true, 'import added');
}

// ============================================================================
// previewTransform: Phase 2b standalone t-call
// ============================================================================
console.log('\n── previewTransform: Phase 2b standalone ─────────────────');

reset();
{
  const p = nodePath.resolve(FRONTEND_SRC, 'Standalone.tsx');
  // Wrapped by a non-wrappable parent (div) with t() on its own line
  fsFiles[p] = `import React from 'react';
function Foo() {
  const { t } = useTranslation();
  return (
    <div>
      {t('standalone.greeting')}
    </div>
  );
}
`;
  const r = previewTransform('Standalone.tsx');
  assertEq(r.success, true, 'success');
  assertEq(r.phases.standaloneCalls, 1, 'standaloneCalls=1');
  assertEq(r.phases.importAdded, true, 'import added');
}

// ============================================================================
// previewTransform: Phase 3 import already present
// ============================================================================
console.log('\n── previewTransform: import already present ──────────────');

reset();
{
  const p = nodePath.resolve(FRONTEND_SRC, 'HasImport.tsx');
  fsFiles[p] = `import React from 'react';
import EditableText from '@/components/frontend-pages/shared/EditableText';
function Foo() {
  const { t } = useTranslation();
  return <h1>{t('home.title')}</h1>;
}
`;
  const r = previewTransform('HasImport.tsx');
  assertEq(r.success, true, 'success');
  assertEq(r.totalChanges, 1, '1 change');
  assertEq(r.phases.importAdded, false, 'importAdded=false (already present)');
}

// ============================================================================
// previewTransform: Phase 4 uncovered call detected
// ============================================================================
console.log('\n── previewTransform: Phase 4 uncovered ───────────────────');

reset();
{
  const p = nodePath.resolve(FRONTEND_SRC, 'Uncovered.tsx');
  // t() call embedded mid-line in a div — Phase 1/2/2b won't transform it
  fsFiles[p] = `import React from 'react';
function Foo() {
  const { t } = useTranslation();
  return <div>Prefix {t('mid.line.call')} suffix</div>;
}
`;
  const r = previewTransform('Uncovered.tsx');
  assertEq(r.success, true, 'success');
  assertEq(r.totalChanges, 0, 'no transformation');
  assert(r.uncovered.length >= 1, 'uncovered call detected');
  assertEq(r.uncovered[0].key, 'mid.line.call', 'uncovered key');
  assertEq(r.uncovered[0].context, 'uncovered', 'context=uncovered');
  assertEq(r.allCovered, false, 'allCovered=false');
}

// ============================================================================
// previewTransform: Phase 4 prop-value classified separately
// ============================================================================
console.log('\n── previewTransform: Phase 4 prop-value ──────────────────');

reset();
{
  const p = nodePath.resolve(FRONTEND_SRC, 'PropValue.tsx');
  fsFiles[p] = `import React from 'react';
function Foo() {
  const { t } = useTranslation();
  return <section title={t('section.aria')}><div>body</div></section>;
}
`;
  const r = previewTransform('PropValue.tsx');
  assertEq(r.success, true, 'success');
  assertEq(r.totalChanges, 0, 'no transformation');
  assertEq(r.uncovered.length, 0, 'not flagged as uncovered');
  assertEq(r.propValues, 1, 'propValues=1');
  assertEq(r.allCovered, true, 'allCovered=true (propValues not counted)');
}

// ============================================================================
// previewTransform: diff hunks structure
// ============================================================================
console.log('\n── previewTransform: diff hunks ──────────────────────────');

reset();
{
  const p = nodePath.resolve(FRONTEND_SRC, 'DiffCheck.tsx');
  fsFiles[p] = `import React from 'react';
function Foo() {
  const { t } = useTranslation();
  return <h1>{t('diff.title')}</h1>;
}
`;
  const r = previewTransform('DiffCheck.tsx');
  assert(r.diff.length > 0, 'diff has at least one hunk');
  const hunk = r.diff[0];
  assert(Array.isArray(hunk.changes), 'hunk.changes is array');
  assert(typeof hunk.startLine === 'number', 'hunk.startLine is number');
  // Should contain at least one removed and one added change
  const hasRemoved = hunk.changes.some((c: any) => c.type === 'removed');
  const hasAdded = hunk.changes.some((c: any) => c.type === 'added');
  assert(hasRemoved, 'diff has removed lines');
  assert(hasAdded, 'diff has added lines');
}

// ============================================================================
// applyTransform: file not found
// ============================================================================
console.log('\n── applyTransform: file not found ────────────────────────');

reset();
{
  const r = applyTransform('/no/such/file.tsx');
  assertEq(r.success, false, 'success=false');
  assert(r.error && r.error.includes('File not found'), 'error mentions not found');
}

// ============================================================================
// applyTransform: no changes → no write
// ============================================================================
console.log('\n── applyTransform: no changes no-op ──────────────────────');

reset();
{
  const p = nodePath.resolve(FRONTEND_SRC, 'ApplyNoChange.tsx');
  fsFiles[p] = `import React from 'react';
export default function Foo() { return <div>plain</div>; }
`;
  const r = applyTransform('ApplyNoChange.tsx');
  assertEq(r.success, true, 'success');
  assertEq(r.applied, false, 'applied=false');
  assertEq(r.totalChanges, 0, 'totalChanges=0');
  assert(!(p in writtenFiles), 'no write happened');
}

// ============================================================================
// applyTransform: happy path → writes transformed content
// ============================================================================
console.log('\n── applyTransform: happy path write ──────────────────────');

reset();
{
  const p = nodePath.resolve(FRONTEND_SRC, 'ApplyHappy.tsx');
  const original = `import React from 'react';
function Hero() {
  const { t } = useTranslation();
  return <h1>{t('hero.title')}</h1>;
}
`;
  fsFiles[p] = original;
  const r = applyTransform('ApplyHappy.tsx');
  assertEq(r.success, true, 'success');
  assertEq(r.applied, true, 'applied=true');
  assertEq(r.totalChanges, 1, 'one change');
  assertEq(r.phases.importAdded, true, 'import added');
  assert(p in writtenFiles, 'file was written');
  const written = writtenFiles[p];
  assert(written.includes('EditableText'), 'written content has EditableText wrapper');
  assert(written.includes('contentKey="hero.title"'), 'written has contentKey');
  assert(written.includes("import EditableText from '@/components/frontend-pages/shared/EditableText'"),
    'written has EditableText import');
  assert(written !== original, 'content changed');
}

// ============================================================================
// applyTransform: already has import → importAdded false
// ============================================================================
console.log('\n── applyTransform: already has import ────────────────────');

reset();
{
  const p = nodePath.resolve(FRONTEND_SRC, 'ApplyHasImport.tsx');
  fsFiles[p] = `import React from 'react';
import EditableText from '@/components/frontend-pages/shared/EditableText';
function Foo() {
  const { t } = useTranslation();
  return <h2>{t('section.heading')}</h2>;
}
`;
  const r = applyTransform('ApplyHasImport.tsx');
  assertEq(r.success, true, 'success');
  assertEq(r.applied, true, 'applied=true');
  assertEq(r.phases.importAdded, false, 'importAdded=false (already present)');
  assert(p in writtenFiles, 'written');
  // Count EditableText import lines — should be exactly 1
  const importCount = (writtenFiles[p].match(/import\s+EditableText\s+from/g) || []).length;
  assertEq(importCount, 1, 'still exactly one EditableText import');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
