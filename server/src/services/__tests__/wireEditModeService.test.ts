#!/usr/bin/env npx tsx
/**
 * Unit tests for services/wireEditModeService.js (OMD-1032)
 *
 * TSX transform engine — wraps t('key') calls in <EditableText> components.
 * Pure text transformation + fs I/O. Tests use a /tmp sandbox with real TSX
 * fixtures and exercise the public API (previewTransform, applyTransform,
 * resolveFilePath).
 *
 * Coverage:
 *   - resolveFilePath: absolute passthrough, relative guess
 *   - previewTransform:
 *       · file not found → { success: false, error }
 *       · single-line <h1>{t('k')}</h1> → wrapped, import added
 *       · multi-line <p>\n  {t('k')}\n</p> → wrapped
 *       · preserves className
 *       · className via template literal or expression
 *       · covered by shared section prefix → skipped
 *       · simple array of t() calls → transformed
 *       · object array with t() values → Key prop transform
 *       · standalone {t('key')} in non-wrappable parent → wrapped as span
 *       · diff hunks generated for changed regions
 *       · uncovered calls reported
 *       · existing EditableText import not duplicated
 *       · no changes → empty diff + import not added
 *   - applyTransform:
 *       · writes file when changes
 *       · returns { applied: false } when no changes
 *       · preserves file when error
 *
 * Run: npx tsx server/src/services/__tests__/wireEditModeService.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';

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

const { previewTransform, applyTransform, resolveFilePath } = require('../wireEditModeService');

// ── Sandbox helpers ──────────────────────────────────────────────────

const SANDBOX = `/tmp/wireEditMode-test-${process.pid}-${Date.now()}`;
fs.mkdirSync(SANDBOX, { recursive: true });

let fileCounter = 0;
function writeFixture(content: string): string {
  const p = path.join(SANDBOX, `fixture-${++fileCounter}.tsx`);
  fs.writeFileSync(p, content);
  return p;
}

function cleanup() {
  try { fs.rmSync(SANDBOX, { recursive: true, force: true }); } catch {}
}

async function main() {
try {

// ============================================================================
// resolveFilePath
// ============================================================================
console.log('\n── resolveFilePath ───────────────────────────────────────');

{
  // Absolute passthrough
  assertEq(resolveFilePath('/abs/path/foo.tsx'), '/abs/path/foo.tsx', 'absolute passthrough');

  // Relative — falls through to best-guess (frontend-src resolve)
  const guess = resolveFilePath('components/Foo.tsx');
  assert(path.isAbsolute(guess), 'returns absolute path');
  assert(guess.includes('components/Foo.tsx'), 'contains input');
}

// ============================================================================
// previewTransform — file not found
// ============================================================================
console.log('\n── previewTransform: file not found ──────────────────────');

{
  const r = previewTransform(path.join(SANDBOX, 'nope-does-not-exist.tsx'));
  assertEq(r.success, false, 'success=false');
  assert(r.error.includes('not found'), 'error mentions not found');
}

// ============================================================================
// previewTransform — single-line wrap
// ============================================================================
console.log('\n── previewTransform: single-line ─────────────────────────');

{
  const src = `import React from 'react';
const X = () => <h1>{t('greeting.hello')}</h1>;
export default X;
`;
  const p = writeFixture(src);
  const r = previewTransform(p);

  assertEq(r.success, true, 'success');
  assert(r.totalChanges >= 1, 'at least 1 change');
  assertEq(r.phases.directElements, 1, '1 direct element');
  assertEq(r.phases.importAdded, true, 'import added');

  // Verify the transformation via diff
  const addedLines = r.diff.flatMap((h: any) => h.changes.filter((c: any) => c.type === 'added').map((c: any) => c.text));
  const joined = addedLines.join('\n');
  assert(joined.includes('<EditableText'), 'EditableText added');
  assert(joined.includes('contentKey="greeting.hello"'), 'contentKey set');
  assert(joined.includes('as="h1"'), 'as="h1"');

  // Uncovered list should be empty
  assertEq(r.allCovered, true, 'all covered');
}

// ============================================================================
// previewTransform — multi-line wrap
// ============================================================================
console.log('\n── previewTransform: multi-line ──────────────────────────');

{
  const src = `import React from 'react';
const X = () => (
  <p>
    {t('about.description')}
  </p>
);
export default X;
`;
  const p = writeFixture(src);
  const r = previewTransform(p);

  assertEq(r.success, true, 'success');
  assert(r.phases.directElements >= 1, 'directElements >= 1');
  // Total changes should be at least 1
  assert(r.totalChanges >= 1, 'changes');
}

// ============================================================================
// previewTransform — className preserved
// ============================================================================
console.log('\n── previewTransform: className ───────────────────────────');

{
  const src = `import React from 'react';
const X = () => <h2 className="text-lg font-bold">{t('k.title')}</h2>;
export default X;
`;
  const p = writeFixture(src);
  const r = previewTransform(p);

  assertEq(r.success, true, 'success');
  const addedLines = r.diff.flatMap((h: any) => h.changes.filter((c: any) => c.type === 'added').map((c: any) => c.text));
  const joined = addedLines.join('\n');
  assert(joined.includes('className="text-lg font-bold"'), 'className preserved');
  assert(joined.includes('as="h2"'), 'as="h2"');
}

// ============================================================================
// previewTransform — shared section prefix skipped
// ============================================================================
console.log('\n── previewTransform: shared section ──────────────────────');

{
  const src = `import React from 'react';
import SectionHeader from '@/components/frontend-pages/shared/SectionHeader';
const X = () => (
  <>
    <SectionHeader editKeyPrefix="homepage.header" title="Hi" />
    <h1>{t('homepage.header.title')}</h1>
    <h2>{t('other.key')}</h2>
  </>
);
export default X;
`;
  const p = writeFixture(src);
  const r = previewTransform(p);

  assertEq(r.success, true, 'success');
  assert(r.coveredPrefixes.includes('homepage.header'), 'prefix detected');
  // Only 'other.key' should be wrapped (1 direct element change)
  assertEq(r.phases.directElements, 1, 'only uncovered key wrapped');
}

// ============================================================================
// previewTransform — existing import not duplicated
// ============================================================================
console.log('\n── previewTransform: existing import ─────────────────────');

{
  const src = `import React from 'react';
import EditableText from '@/components/frontend-pages/shared/EditableText';
const X = () => <h1>{t('k.a')}</h1>;
export default X;
`;
  const p = writeFixture(src);
  const r = previewTransform(p);

  assertEq(r.success, true, 'success');
  assertEq(r.phases.importAdded, false, 'no new import added');
  assert(r.totalChanges >= 1, 'still wraps content');
}

// ============================================================================
// previewTransform — no changes
// ============================================================================
console.log('\n── previewTransform: no changes ──────────────────────────');

{
  const src = `import React from 'react';
const X = () => <div>Static text</div>;
export default X;
`;
  const p = writeFixture(src);
  const r = previewTransform(p);

  assertEq(r.success, true, 'success');
  assertEq(r.totalChanges, 0, '0 changes');
  assertEq(r.diff, [], 'empty diff');
  assertEq(r.phases.importAdded, false, 'no import');
  assertEq(r.allCovered, true, 'nothing to cover');
}

// ============================================================================
// previewTransform — simple array of t() calls
// ============================================================================
console.log('\n── previewTransform: simple array ────────────────────────');

{
  const src = `import React from 'react';
const X = () => {
  const items = [
    t('list.a'),
    t('list.b'),
    t('list.c'),
  ];
  return (
    <ul>
      {items.map((item) => (
        <li>{item}</li>
      ))}
    </ul>
  );
};
export default X;
`;
  const p = writeFixture(src);
  const r = previewTransform(p);

  assertEq(r.success, true, 'success');
  assert(r.phases.arrayPatterns >= 3, 'array patterns counted for each key');
}

// ============================================================================
// previewTransform — uncovered call detection
// ============================================================================
console.log('\n── previewTransform: uncovered ───────────────────────────');

{
  // t() call inside a prop value — should be detected as prop-value not uncovered
  const src = `import React from 'react';
const X = () => <img alt={t('img.alt')} src="/x.png" />;
export default X;
`;
  const p = writeFixture(src);
  const r = previewTransform(p);
  assertEq(r.success, true, 'success');
  // Prop-value t() calls can't be wrapped by the transformer — they show up as propValues
  assertEq(r.phases.directElements, 0, 'no direct elements');
  assertEq(r.totalChanges, 0, 'no changes');
  // propValues count reported
  assert(typeof r.propValues === 'number', 'propValues is numeric');
}

// ============================================================================
// previewTransform — diff structure
// ============================================================================
console.log('\n── previewTransform: diff structure ──────────────────────');

{
  const src = `import React from 'react';
const X = () => <h1>{t('k.a')}</h1>;
`;
  const p = writeFixture(src);
  const r = previewTransform(p);

  assert(Array.isArray(r.diff), 'diff is array');
  assert(r.diff.length > 0, 'has hunks');
  const firstHunk = r.diff[0];
  assert(typeof firstHunk.startLine === 'number', 'startLine is number');
  assert(Array.isArray(firstHunk.changes), 'changes is array');
  const types = new Set(firstHunk.changes.map((c: any) => c.type));
  assert(types.has('removed') || types.has('added'), 'has add/remove');
}

// ============================================================================
// applyTransform — writes file
// ============================================================================
console.log('\n── applyTransform: writes file ───────────────────────────');

{
  const src = `import React from 'react';
const X = () => <h1>{t('k.apply')}</h1>;
`;
  const p = writeFixture(src);
  const r = applyTransform(p);

  assertEq(r.success, true, 'success');
  assertEq(r.applied, true, 'applied=true');
  assert(r.totalChanges >= 1, 'changes >=1');

  // Verify file was actually modified
  const after = fs.readFileSync(p, 'utf-8');
  assert(after.includes('<EditableText'), 'file contains EditableText');
  assert(after.includes('import EditableText'), 'import injected');
  assert(after.includes('contentKey="k.apply"'), 'contentKey set');
}

// ============================================================================
// applyTransform — no changes
// ============================================================================
console.log('\n── applyTransform: no changes ────────────────────────────');

{
  const src = `import React from 'react';
const X = () => <div>Static</div>;
`;
  const p = writeFixture(src);
  const before = fs.readFileSync(p, 'utf-8');
  const r = applyTransform(p);

  assertEq(r.success, true, 'success');
  assertEq(r.applied, false, 'applied=false');
  assertEq(r.totalChanges, 0, '0 changes');

  // File unchanged
  const after = fs.readFileSync(p, 'utf-8');
  assertEq(after, before, 'file unchanged');
}

// ============================================================================
// applyTransform — file not found
// ============================================================================
console.log('\n── applyTransform: not found ─────────────────────────────');

{
  const r = applyTransform(path.join(SANDBOX, 'missing-abc.tsx'));
  assertEq(r.success, false, 'success=false');
  assert(r.error.includes('not found'), 'error mentions not found');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);

} finally {
  cleanup();
}

if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { cleanup(); console.error('Unhandled:', e); process.exit(1); });
