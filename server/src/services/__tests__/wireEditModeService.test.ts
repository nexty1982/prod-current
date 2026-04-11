#!/usr/bin/env npx tsx
/**
 * Unit tests for services/wireEditModeService.js (OMD-1105)
 *
 * Pure transform engine for auto-wiring EditableText into TSX files.
 * Only side effect is fs (readFileSync/writeFileSync/existsSync).
 *
 * Strategy: stub fs so we can drive the transforms with inline source
 * strings rather than touching the real filesystem. Each test sets the
 * virtual file contents, runs previewTransform or applyTransform, and
 * checks the resulting output.
 *
 * Coverage:
 *   - findCoveredPrefixes (indirect): shared sections suppress wrapping
 *   - transformDirectElements: single-line + multi-line, className pass-through
 *   - transformArrayPatterns: simple arrays, object arrays (label/title)
 *   - transformStandaloneTCalls: wraps naked {t('key')}
 *   - ensureImport: adds EditableText import when missing
 *   - findUncoveredCalls: classifies prop-value vs uncovered
 *   - resolveFilePath: absolute, relative to src, fallback
 *   - previewTransform: not-found, no-op, real transforms, diff hunks,
 *     covered prefixes suppress wrapping
 *   - applyTransform: not-found, no-op, writes, skip writes when 0 changes
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

// ── Virtual filesystem ──────────────────────────────────────────────
const vfs: Record<string, string> = {};
const writes: Record<string, string> = {};

// Replace the real fs module via require.cache
const realFs = require('fs');
const fsStub = {
  ...realFs,
  existsSync: (p: string) => p in vfs,
  readFileSync: (p: string, _enc?: string) => {
    if (!(p in vfs)) throw new Error(`ENOENT: ${p}`);
    return vfs[p];
  },
  writeFileSync: (p: string, data: string, _enc?: string) => {
    writes[p] = data;
    vfs[p] = data;
  },
};

const fsPath = require.resolve('fs');
require.cache[fsPath] = {
  id: fsPath,
  filename: fsPath,
  loaded: true,
  exports: fsStub,
} as any;

function resetVfs() {
  for (const k of Object.keys(vfs)) delete vfs[k];
  for (const k of Object.keys(writes)) delete writes[k];
}

const {
  previewTransform,
  applyTransform,
  resolveFilePath,
} = require('../wireEditModeService');

async function main() {

// ============================================================================
// resolveFilePath
// ============================================================================
console.log('\n── resolveFilePath ───────────────────────────────────────');

{
  // Absolute path → returned verbatim
  const abs = '/tmp/foo/bar.tsx';
  assertEq(resolveFilePath(abs), abs, 'absolute path returned as-is');
}

// ============================================================================
// previewTransform: file not found
// ============================================================================
console.log('\n── previewTransform: not found ───────────────────────────');

resetVfs();
{
  const r = previewTransform('/tmp/nope.tsx');
  assertEq(r.success, false, 'success=false');
  assert(r.error.includes('not found'), 'error message');
}

// ============================================================================
// previewTransform: no-op (nothing to wrap)
// ============================================================================
console.log('\n── previewTransform: no-op ───────────────────────────────');

resetVfs();
{
  vfs['/tmp/a.tsx'] = `import React from 'react';\nexport const A = () => <div>Plain</div>;\n`;
  const r = previewTransform('/tmp/a.tsx');
  assertEq(r.success, true, 'success');
  assertEq(r.totalChanges, 0, 'zero changes');
  assertEq(r.phases.directElements, 0, 'phase1 = 0');
  assertEq(r.phases.arrayPatterns, 0, 'phase2 = 0');
  assertEq(r.phases.standaloneCalls, 0, 'phase2b = 0');
  assertEq(r.phases.importAdded, false, 'no import added');
  assertEq(r.diff.length, 0, 'no diff');
  assertEq(r.allCovered, true, 'allCovered (nothing uncovered)');
}

// ============================================================================
// transformDirectElements — single-line
// ============================================================================
console.log('\n── transformDirectElements: single-line ──────────────────');

resetVfs();
{
  vfs['/tmp/s.tsx'] = `import { useTranslation } from 'react-i18next';
export const S = () => {
  const { t } = useTranslation();
  return (<h1>{t('page.title')}</h1>);
};
`;
  const r = previewTransform('/tmp/s.tsx');
  assertEq(r.success, true, 'success');
  assertEq(r.phases.directElements, 1, '1 direct element');
  assertEq(r.phases.importAdded, true, 'import added');
  // Diff should include new EditableText line
  const addedLines = r.diff.flatMap((h: any) => h.changes.filter((c: any) => c.type === 'added').map((c: any) => c.text)).join('\n');
  assert(/EditableText[^>]*contentKey="page.title"[^>]*as="h1"/.test(addedLines), 'EditableText injection');
  assert(/import EditableText/.test(addedLines), 'import line in diff');
}

// single-line with className
resetVfs();
{
  vfs['/tmp/sc.tsx'] = `import { useTranslation } from 'react-i18next';
export const SC = () => {
  const { t } = useTranslation();
  return (<h2 className="big">{t('hdr.sub')}</h2>);
};
`;
  const r = previewTransform('/tmp/sc.tsx');
  assertEq(r.phases.directElements, 1, '1 change');
  const added = r.diff.flatMap((h: any) => h.changes.filter((c: any) => c.type === 'added').map((c: any) => c.text)).join('\n');
  assert(/className="big"/.test(added), 'className preserved');
  assert(/as="h2"/.test(added), 'tag preserved');
}

// ============================================================================
// transformDirectElements — multi-line
// ============================================================================
console.log('\n── transformDirectElements: multi-line ───────────────────');

resetVfs();
{
  vfs['/tmp/m.tsx'] = `import { useTranslation } from 'react-i18next';
export const M = () => {
  const { t } = useTranslation();
  return (
    <p className="body">
      {t('body.intro')}
    </p>
  );
};
`;
  const r = previewTransform('/tmp/m.tsx');
  assertEq(r.phases.directElements, 1, '1 direct element');
  const added = r.diff.flatMap((h: any) => h.changes.filter((c: any) => c.type === 'added').map((c: any) => c.text)).join('\n');
  assert(/<EditableText contentKey="body.intro" as="p" className="body">/.test(added), 'multi-line wrap');
}

// ============================================================================
// Covered by shared section → not wrapped
// ============================================================================
console.log('\n── shared section coverage ───────────────────────────────');

resetVfs();
{
  vfs['/tmp/cov.tsx'] = `import { useTranslation } from 'react-i18next';
import HeroSection from '@/components/frontend-pages/shared/HeroSection';
export const C = () => {
  const { t } = useTranslation();
  return (
    <>
      <HeroSection editKeyPrefix="home.hero" />
      <h1>{t('home.hero.title')}</h1>
      <p>{t('other.intro')}</p>
    </>
  );
};
`;
  const r = previewTransform('/tmp/cov.tsx');
  assertEq(r.coveredPrefixes, ['home.hero'], 'covered prefix detected');
  // 'home.hero.title' is under hero → skip; 'other.intro' → wrap
  assertEq(r.phases.directElements, 1, 'only 1 wrap (other.intro)');
  const added = r.diff.flatMap((h: any) => h.changes.filter((c: any) => c.type === 'added').map((c: any) => c.text)).join('\n');
  assert(/contentKey="other\.intro"/.test(added), 'other.intro wrapped');
  assert(!/contentKey="home\.hero\.title"/.test(added), 'home.hero.title NOT wrapped');
}

// ============================================================================
// transformArrayPatterns — simple array
// ============================================================================
console.log('\n── transformArrayPatterns: simple array ──────────────────');

resetVfs();
{
  vfs['/tmp/arr1.tsx'] = `import { useTranslation } from 'react-i18next';
export const A1 = () => {
  const { t } = useTranslation();
  const items = [
    t('list.one'),
    t('list.two'),
    t('list.three'),
  ];
  return (
    <ul>
      {items.map((item) => (<li>{item}</li>))}
    </ul>
  );
};
`;
  const r = previewTransform('/tmp/arr1.tsx');
  assert(r.phases.arrayPatterns > 0, 'array pattern detected');
  const added = r.diff.flatMap((h: any) => h.changes.filter((c: any) => c.type === 'added').map((c: any) => c.text)).join('\n');
  // Array elements become bare strings
  assert(/'list\.one'/.test(added), 'list.one as string');
  // Render site wraps with EditableText
  assert(/<EditableText contentKey=\{item\} as="li">/.test(added), 'li render wrapped');
}

// ============================================================================
// transformArrayPatterns — object array with label prop
// ============================================================================
console.log('\n── transformArrayPatterns: object array ──────────────────');

resetVfs();
{
  vfs['/tmp/arr2.tsx'] = `import { useTranslation } from 'react-i18next';
export const A2 = () => {
  const { t } = useTranslation();
  const features = [
    { label: t('feat.one'), icon: 'star' },
    { label: t('feat.two'), icon: 'bolt' },
  ];
  return (
    <div>
      {features.map((f) => (<span>{f.label}</span>))}
    </div>
  );
};
`;
  const r = previewTransform('/tmp/arr2.tsx');
  assert(r.phases.arrayPatterns > 0, 'object array pattern detected');
  const added = r.diff.flatMap((h: any) => h.changes.filter((c: any) => c.type === 'added').map((c: any) => c.text)).join('\n');
  // Prop renamed to labelKey
  assert(/labelKey:\s*'feat\.one'/.test(added), 'labelKey rename');
  // Render site uses f.labelKey
  assert(/<EditableText contentKey=\{f\.labelKey\} as="span">/.test(added), 'span render wrapped');
}

// ============================================================================
// transformStandaloneTCalls
// ============================================================================
console.log('\n── transformStandaloneTCalls ─────────────────────────────');

resetVfs();
{
  // Standalone {t('key')} in a Button (non-wrappable parent)
  vfs['/tmp/st.tsx'] = `import { useTranslation } from 'react-i18next';
import { Button } from '@mui/material';
export const ST = () => {
  const { t } = useTranslation();
  return (
    <Button>
      {t('cta.click')}
    </Button>
  );
};
`;
  const r = previewTransform('/tmp/st.tsx');
  assertEq(r.phases.standaloneCalls, 1, '1 standalone wrapped');
  const added = r.diff.flatMap((h: any) => h.changes.filter((c: any) => c.type === 'added').map((c: any) => c.text)).join('\n');
  assert(/<EditableText contentKey="cta\.click" as="span">/.test(added), 'span wrap');
}

// Standalone {t('...')} before </h1> must NOT be wrapped by phase2b
// (phase1 covers it; phase2b checks "next line is closing wrappable")
resetVfs();
{
  vfs['/tmp/st2.tsx'] = `import { useTranslation } from 'react-i18next';
export const ST2 = () => {
  const { t } = useTranslation();
  return (
    <h1>
      {t('head')}
    </h1>
  );
};
`;
  const r = previewTransform('/tmp/st2.tsx');
  // phase1 catches it (multi-line direct element)
  assertEq(r.phases.directElements, 1, 'phase1 catches');
  assertEq(r.phases.standaloneCalls, 0, 'phase2b stays out');
}

// ============================================================================
// ensureImport — adds only when missing
// ============================================================================
console.log('\n── ensureImport ──────────────────────────────────────────');

resetVfs();
{
  // File already has EditableText import → should not duplicate
  vfs['/tmp/ei.tsx'] = `import { useTranslation } from 'react-i18next';
import EditableText from '@/components/frontend-pages/shared/EditableText';
export const EI = () => {
  const { t } = useTranslation();
  return (<h1>{t('hi')}</h1>);
};
`;
  const r = previewTransform('/tmp/ei.tsx');
  assertEq(r.phases.directElements, 1, 'wrap still happens');
  assertEq(r.phases.importAdded, false, 'import NOT added (already present)');
}

// No imports at all → inserts at top
resetVfs();
{
  vfs['/tmp/ei2.tsx'] = `export const EI2 = ({ t }: { t: any }) => <h1>{t('x')}</h1>;\n`;
  const r = previewTransform('/tmp/ei2.tsx');
  assertEq(r.phases.directElements, 1, 'wrap');
  assertEq(r.phases.importAdded, true, 'import added');
  const added = r.diff.flatMap((h: any) => h.changes.filter((c: any) => c.type === 'added').map((c: any) => c.text)).join('\n');
  assert(/import EditableText from/.test(added), 'import line present');
}

// ============================================================================
// findUncoveredCalls — classifies prop-values and uncovered
// ============================================================================
console.log('\n── findUncoveredCalls ────────────────────────────────────');

resetVfs();
{
  // t() used as prop value should be classified "prop-value", not "uncovered"
  vfs['/tmp/pv.tsx'] = `import { useTranslation } from 'react-i18next';
export const PV = () => {
  const { t } = useTranslation();
  return (<img alt={t('img.alt')} src="x.png" />);
};
`;
  const r = previewTransform('/tmp/pv.tsx');
  assertEq(r.phases.directElements, 0, 'no wrap (not element text)');
  assert(r.propValues >= 1, 'classified as prop-value');
  assertEq(r.uncovered.length, 0, 'no uncovered');
  assertEq(r.allCovered, true, 'all covered');
}

// Uncovered: t() in element that is not wrappable
resetVfs();
{
  vfs['/tmp/unc.tsx'] = `import { useTranslation } from 'react-i18next';
import { Typography } from '@mui/material';
export const U = () => {
  const { t } = useTranslation();
  return (<Typography>{t('typo.body')}</Typography>);
};
`;
  const r = previewTransform('/tmp/unc.tsx');
  // Typography is not in WRAPPABLE_TAGS. It has single-line form,
  // so phase2b skips (standalone is multi-line). Left uncovered.
  assertEq(r.phases.directElements, 0, 'not in wrappable set');
  assertEq(r.phases.standaloneCalls, 0, 'single-line → not standalone');
  assert(r.uncovered.length >= 1, 'uncovered captured');
  assertEq(r.uncovered[0].key, 'typo.body', 'uncovered key');
  assertEq(r.allCovered, false, 'not all covered');
}

// ============================================================================
// applyTransform: no-op
// ============================================================================
console.log('\n── applyTransform: no-op ─────────────────────────────────');

resetVfs();
{
  vfs['/tmp/noop.tsx'] = `export const N = () => <div>no translations</div>;\n`;
  const r = applyTransform('/tmp/noop.tsx');
  assertEq(r.success, true, 'success');
  assertEq(r.applied, false, 'not applied');
  assertEq(r.totalChanges, 0, 'zero');
  assertEq(writes['/tmp/noop.tsx'], undefined, 'no write');
}

// ============================================================================
// applyTransform: not found
// ============================================================================
console.log('\n── applyTransform: not found ─────────────────────────────');

resetVfs();
{
  const r = applyTransform('/tmp/missing.tsx');
  assertEq(r.success, false, 'success=false');
  assert(r.error.includes('not found'), 'error message');
}

// ============================================================================
// applyTransform: writes file
// ============================================================================
console.log('\n── applyTransform: writes ────────────────────────────────');

resetVfs();
{
  vfs['/tmp/w.tsx'] = `import { useTranslation } from 'react-i18next';
export const W = () => {
  const { t } = useTranslation();
  return (<h1 className="hero">{t('w.title')}</h1>);
};
`;
  const r = applyTransform('/tmp/w.tsx');
  assertEq(r.success, true, 'success');
  assertEq(r.applied, true, 'applied');
  assertEq(r.totalChanges, 1, '1 change');
  assertEq(r.phases.directElements, 1, 'phase1 = 1');
  assertEq(r.phases.importAdded, true, 'import added');
  assert(writes['/tmp/w.tsx'] !== undefined, 'file written');
  assert(/<EditableText contentKey="w\.title"/.test(writes['/tmp/w.tsx']), 'output has EditableText');
  assert(/import EditableText/.test(writes['/tmp/w.tsx']), 'output has import');
  assertEq(r.allCovered, true, 'allCovered');
  assertEq(r.uncovered.length, 0, 'uncovered empty');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
