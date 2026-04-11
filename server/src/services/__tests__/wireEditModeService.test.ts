#!/usr/bin/env npx tsx
/**
 * Unit tests for services/wireEditModeService.js (OMD-1236)
 *
 * Transform engine that auto-wires <EditableText> around t('key') calls in
 * TSX files. Public API: previewTransform, applyTransform, resolveFilePath.
 *
 * Strategy: monkey-patch fs on the real fs module object BEFORE the SUT is
 * required. Use an in-memory store keyed by absolute path. Verify phase
 * counts, import injection, and final transformed text through the public
 * API (private helpers are not exported).
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

// ── In-memory fs ───────────────────────────────────────────────
const files: Map<string, string> = new Map();

const realFs = require('fs');
const origExists = realFs.existsSync;
const origRead = realFs.readFileSync;
const origWrite = realFs.writeFileSync;

realFs.existsSync = (p: any): boolean => {
  const sp = String(p);
  if (files.has(sp)) return true;
  return origExists(sp);
};
realFs.readFileSync = (p: any, enc?: any): any => {
  const sp = String(p);
  if (files.has(sp)) return files.get(sp)!;
  return origRead(sp, enc);
};
realFs.writeFileSync = (p: any, content: any, enc?: any): void => {
  const sp = String(p);
  files.set(sp, String(content));
};

function resetFiles() { files.clear(); }

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

// Absolute path returned as-is
{
  const r = resolveFilePath('/tmp/foo.tsx');
  assertEq(r, '/tmp/foo.tsx', 'absolute unchanged');
}

// Relative to frontend-src (via fake fs existsSync)
{
  const fakeFrontend = require('path').resolve(__dirname, '../../../../front-end/src');
  const rel = 'pages/Home.tsx';
  const abs = require('path').resolve(fakeFrontend, rel);
  files.set(abs, '<html/>');
  const r = resolveFilePath(rel);
  assertEq(r, abs, 'resolves against front-end/src');
  files.delete(abs);
}

// Relative with no match → best-guess front-end/src path
{
  const r = resolveFilePath('does/not/exist.tsx');
  assert(typeof r === 'string', 'returns a string');
  assert(r.endsWith('does/not/exist.tsx'), 'ends with input');
}

// ============================================================================
// previewTransform — file not found
// ============================================================================
console.log('\n── previewTransform: file not found ──────────────────────');

{
  const r = previewTransform('/tmp/nope.tsx');
  assertEq(r.success, false, 'not found → success false');
  assert(/not found/.test(r.error), 'error message');
}

// ============================================================================
// previewTransform — single-line <p>{t('key')}</p>
// ============================================================================
console.log('\n── previewTransform: single-line wrap ────────────────────');

resetFiles();
const fp1 = '/tmp/singleLine.tsx';
const src1 = `import React from 'react';
import { useTranslation } from 'react-i18next';
export default function X() {
  const { t } = useTranslation();
  return <div><p className="lead">{t('home.welcome')}</p></div>;
}
`;
files.set(fp1, src1);

{
  const r = previewTransform(fp1);
  assertEq(r.success, true, 'success');
  assertEq(r.totalChanges, 1, '1 change');
  assertEq(r.phases.directElements, 1, 'directElements=1');
  assertEq(r.phases.arrayPatterns, 0, 'arrayPatterns=0');
  assertEq(r.phases.importAdded, true, 'import added');
  assert(Array.isArray(r.diff), 'diff is array');
  assert(r.diff.length > 0, 'diff non-empty');
  assertEq(r.allCovered, true, 'all covered (no remaining uncovered)');
}

// ============================================================================
// previewTransform — multi-line wrap with className
// ============================================================================
console.log('\n── previewTransform: multi-line wrap ─────────────────────');

resetFiles();
const fp2 = '/tmp/multi.tsx';
const src2 = `import React from 'react';
const C = () => (
  <h2 className="text-xl">
    {t('about.heading')}
  </h2>
);
`;
files.set(fp2, src2);

{
  const r = previewTransform(fp2);
  assertEq(r.success, true, 'success');
  assertEq(r.totalChanges, 1, '1 change multi-line');
  assertEq(r.phases.directElements, 1, 'directElements=1');
}

// ============================================================================
// previewTransform — already has EditableText import → no re-import
// ============================================================================
console.log('\n── previewTransform: existing import ─────────────────────');

resetFiles();
const fp3 = '/tmp/alreadyImported.tsx';
const src3 = `import React from 'react';
import EditableText from '@/components/frontend-pages/shared/EditableText';
const C = () => <p>{t('foo.bar')}</p>;
`;
files.set(fp3, src3);

{
  const r = previewTransform(fp3);
  assertEq(r.success, true, 'success');
  assertEq(r.phases.importAdded, false, 'import NOT added');
  assertEq(r.totalChanges, 1, '1 change');
}

// ============================================================================
// previewTransform — shared section prefix skipped
// ============================================================================
console.log('\n── previewTransform: shared section covered ──────────────');

resetFiles();
const fp4 = '/tmp/shared.tsx';
// HeroSection declares editKeyPrefix="home.hero", so home.hero.title is covered
const src4 = `import React from 'react';
const C = () => (
  <div>
    <HeroSection editKeyPrefix="home.hero" />
    <h1>{t('home.hero.title')}</h1>
    <p>{t('home.other')}</p>
  </div>
);
`;
files.set(fp4, src4);

{
  const r = previewTransform(fp4);
  assertEq(r.success, true, 'success');
  assert(r.coveredPrefixes.includes('home.hero'), 'prefix detected');
  assertEq(r.totalChanges, 1, 'only home.other transformed (home.hero.title skipped)');
}

// ============================================================================
// previewTransform — no changes needed (no t() calls to wrap)
// ============================================================================
console.log('\n── previewTransform: no changes ──────────────────────────');

resetFiles();
const fp5 = '/tmp/notsx.tsx';
const src5 = `import React from 'react';
const C = () => <div>Plain content</div>;
`;
files.set(fp5, src5);

{
  const r = previewTransform(fp5);
  assertEq(r.success, true, 'success');
  assertEq(r.totalChanges, 0, '0 changes');
  assertEq(r.phases.importAdded, false, 'no import');
  assertEq(r.diff, [], 'empty diff');
  assertEq(r.allCovered, true, 'all covered (no t calls)');
}

// ============================================================================
// previewTransform — uncovered calls remain (prop value)
// ============================================================================
console.log('\n── previewTransform: uncovered detection ─────────────────');

resetFiles();
const fp6 = '/tmp/prop.tsx';
// t() used as a prop value — Phase 1/2/2b don't handle this pattern
const src6 = `import React from 'react';
const C = () => (
  <div>
    <Component title={t('page.title')} />
    <p>{t('page.body')}</p>
  </div>
);
`;
files.set(fp6, src6);

{
  const r = previewTransform(fp6);
  assertEq(r.success, true, 'success');
  assertEq(r.totalChanges, 1, 'only page.body transformed');
  // page.title is a prop-value (not wrapped, not uncovered)
  assertEq(r.propValues, 1, '1 prop-value remaining');
  assertEq(r.uncovered.length, 0, 'no uncovered (prop-value is separate)');
}

// ============================================================================
// previewTransform — array pattern transformation
// ============================================================================
console.log('\n── previewTransform: simple array pattern ────────────────');

resetFiles();
const fp7 = '/tmp/array.tsx';
const src7 = `import React from 'react';
const items = [
  t('menu.home'),
  t('menu.about'),
];
const C = () => (
  <ul>
    {items.map((item) => <li>{item}</li>)}
  </ul>
);
`;
files.set(fp7, src7);

{
  const r = previewTransform(fp7);
  assertEq(r.success, true, 'success');
  assert(r.phases.arrayPatterns >= 2, 'array patterns detected');
}

// ============================================================================
// previewTransform — standalone {t('key')} in non-wrappable parent
// ============================================================================
console.log('\n── previewTransform: standalone t() call ─────────────────');

resetFiles();
const fp8 = '/tmp/standalone.tsx';
const src8 = `import React from 'react';
const C = () => (
  <div>
    {t('standalone.text')}
  </div>
);
`;
files.set(fp8, src8);

{
  const r = previewTransform(fp8);
  assertEq(r.success, true, 'success');
  assertEq(r.phases.standaloneCalls, 1, 'standalone call transformed');
}

// ============================================================================
// applyTransform — writes file
// ============================================================================
console.log('\n── applyTransform: writes file ───────────────────────────');

resetFiles();
const fp9 = '/tmp/apply.tsx';
files.set(fp9, `import React from 'react';
const C = () => <p>{t('apply.me')}</p>;
`);

{
  const r = applyTransform(fp9);
  assertEq(r.success, true, 'success');
  assertEq(r.applied, true, 'applied=true');
  assertEq(r.totalChanges, 1, '1 change');
  // Verify content written
  const written = files.get(fp9)!;
  assert(written.includes('<EditableText contentKey="apply.me"'), 'EditableText wrapped');
  assert(written.includes("import EditableText from '@/components/frontend-pages/shared/EditableText'"), 'import inserted');
}

// applyTransform — no changes → no write
console.log('\n── applyTransform: no changes ────────────────────────────');

resetFiles();
const fp10 = '/tmp/nochanges.tsx';
const original10 = `import React from 'react';
const C = () => <div>Static</div>;
`;
files.set(fp10, original10);

{
  const r = applyTransform(fp10);
  assertEq(r.success, true, 'success');
  assertEq(r.applied, false, 'applied=false');
  assertEq(r.totalChanges, 0, '0 changes');
  // Original untouched
  assertEq(files.get(fp10), original10, 'file unchanged');
}

// applyTransform — file not found
console.log('\n── applyTransform: file not found ────────────────────────');

{
  const r = applyTransform('/tmp/missing.tsx');
  assertEq(r.success, false, 'success=false');
  assert(/not found/.test(r.error), 'error message');
}

// ============================================================================
// previewTransform — complex mixed content
// ============================================================================
console.log('\n── previewTransform: mixed content ───────────────────────');

resetFiles();
const fp11 = '/tmp/mixed.tsx';
const src11 = `import React from 'react';
const C = () => (
  <section>
    <h1 className="title">{t('page.title')}</h1>
    <p>{t('page.body')}</p>
    <span>{t('page.footer')}</span>
  </section>
);
`;
files.set(fp11, src11);

{
  const r = previewTransform(fp11);
  assertEq(r.success, true, 'success');
  assertEq(r.totalChanges, 3, '3 changes (h1, p, span)');
  assertEq(r.phases.directElements, 3, 'all direct elements');
  // Verify generated transformed output has three EditableText blocks
  // by checking the diff changes count
  assert(r.diff.length > 0, 'diff has hunks');
}

// ============================================================================
// previewTransform — single-line preserves className
// ============================================================================
console.log('\n── previewTransform: className preserved ─────────────────');

resetFiles();
const fp12 = '/tmp/classname.tsx';
files.set(fp12, `import React from 'react';
const C = () => <h3 className="headline">{t('h.key')}</h3>;
`);

{
  // Need to apply to inspect written content
  applyTransform(fp12);
  const written = files.get(fp12)!;
  assert(/className="headline"/.test(written), 'className preserved');
  assert(/as="h3"/.test(written), 'as="h3" set');
  assert(/contentKey="h.key"/.test(written), 'contentKey set');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);

// Restore fs
realFs.existsSync = origExists;
realFs.readFileSync = origRead;
realFs.writeFileSync = origWrite;

if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
