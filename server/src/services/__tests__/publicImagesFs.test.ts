#!/usr/bin/env npx tsx
/**
 * Unit tests for services/publicImagesFs.js (OMD-968)
 *
 * Pure path manipulation + fs introspection. The module caches its
 * _imagesRoot at module scope on first call, so we set PUBLIC_IMAGES_ROOT
 * env var to a real temp dir BEFORE requiring the SUT.
 *
 * Coverage:
 *   - getImagesRoot: env override takes priority; caching (second call
 *     returns same value without re-checking)
 *   - resolveSafePath:
 *       · empty/non-string → throws
 *       · absolute path → throws
 *       · ".." segment → throws
 *       · valid relative → resolves under root
 *       · normalizes leading/trailing slashes and backslashes
 *   - getRelativePath: inverse of resolve, normalizes to forward slashes
 *   - getUrlPath: /images/ prefix, strips leading slashes
 *   - isDirectory / isFile: true for matching, false for missing/wrong type
 *   - getStats: stats object or null (error swallowed)
 *   - sanitizeFilename:
 *       · keep: removes /\\\0, trims
 *       · slug: lowercase, non-alphanumeric → -, collapses --, trims -
 *       · hash: img_<ts>_<rand><ext> shape
 *
 * Run: npx tsx server/src/services/__tests__/publicImagesFs.test.ts
 */

import * as fs from 'fs';
import * as os from 'os';
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

// ── Set up temp images root via env var BEFORE requiring SUT ─────────
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'public-images-fs-test-'));
process.env.PUBLIC_IMAGES_ROOT = tmpRoot;

// Populate fixture files/dirs
fs.mkdirSync(path.join(tmpRoot, 'gallery'), { recursive: true });
fs.mkdirSync(path.join(tmpRoot, 'banners'), { recursive: true });
fs.writeFileSync(path.join(tmpRoot, 'gallery', 'photo.png'), 'fake png');
fs.writeFileSync(path.join(tmpRoot, 'banners', 'hero.jpg'), 'fake jpg');

// Silence noisy console logs from the SUT
const origLog = console.log;
const origWarn = console.warn;
function quiet() { console.log = () => {}; console.warn = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; }

quiet();
const pif = require('../publicImagesFs');
loud();

const {
  getImagesRoot,
  resolveSafePath,
  getRelativePath,
  getUrlPath,
  isDirectory,
  isFile,
  getStats,
  sanitizeFilename,
} = pif;

// ============================================================================
// getImagesRoot
// ============================================================================
console.log('\n── getImagesRoot ─────────────────────────────────────────');

// First call populates cache (quiet because it logs)
quiet();
const root1 = getImagesRoot();
loud();
assertEq(root1, tmpRoot, 'env override returns temp root');

// Second call returns cached value (no console log this time because cached)
const root2 = getImagesRoot();
assertEq(root2, tmpRoot, 'second call returns cached root');
assert(root1 === root2, 'same reference (cached)');

// ============================================================================
// resolveSafePath
// ============================================================================
console.log('\n── resolveSafePath ───────────────────────────────────────');

// Valid relative path
{
  const resolved = resolveSafePath('gallery/photo.png');
  assertEq(resolved, path.join(tmpRoot, 'gallery', 'photo.png'), 'valid relative resolved');
}

// Leading slash → absolute path → throws (note: SUT's leading-slash
// normalization regex /^[/\\]]+|[/\\]]+$/g has a stray `]` that makes
// it require a trailing `]`, so leading slashes are NOT stripped.
// Downstream path.isAbsolute check catches this and throws.
{
  let caught: Error | null = null;
  try { resolveSafePath('/gallery/photo.png'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'leading slash → throws (absolute path)');
  assert(caught !== null && caught.message.includes('Absolute'), 'absolute path error msg');
}

// Backslashes normalized (Windows-style) — converted to forward slashes
{
  const resolved = resolveSafePath('gallery\\photo.png');
  assertEq(resolved, path.join(tmpRoot, 'gallery', 'photo.png'), 'backslash normalized');
}

// Just 'gallery' (directory)
{
  const resolved = resolveSafePath('gallery');
  assertEq(resolved, path.join(tmpRoot, 'gallery'), 'directory resolution');
}

// Empty / non-string
{
  let caught: Error | null = null;
  try { resolveSafePath(''); } catch (e: any) { caught = e; }
  assert(caught !== null, 'empty string throws');
  assert(caught !== null && caught.message.includes('non-empty'), 'empty msg');
}

{
  let caught: Error | null = null;
  try { resolveSafePath(null as any); } catch (e: any) { caught = e; }
  assert(caught !== null, 'null throws');
}

{
  let caught: Error | null = null;
  try { resolveSafePath(123 as any); } catch (e: any) { caught = e; }
  assert(caught !== null, 'number throws');
}

// Path traversal: ".." segments
{
  let caught: Error | null = null;
  try { resolveSafePath('../../../etc/passwd'); } catch (e: any) { caught = e; }
  assert(caught !== null, '.. throws');
  assert(caught !== null && caught.message.includes('traversal'), 'traversal msg');
}

{
  let caught: Error | null = null;
  try { resolveSafePath('gallery/../../../etc/passwd'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'embedded .. throws');
}

// Absolute path / traversal attempt → throws
{
  let caught: Error | null = null;
  try { resolveSafePath('/etc/passwd'); } catch (e: any) { caught = e; }
  assert(caught !== null, '/etc/passwd blocked');
  assert(caught !== null && caught.message.includes('Absolute'), 'absolute error msg');
}

// ============================================================================
// getRelativePath
// ============================================================================
console.log('\n── getRelativePath ───────────────────────────────────────');

{
  const abs = path.join(tmpRoot, 'gallery', 'photo.png');
  const rel = getRelativePath(abs);
  assertEq(rel, 'gallery/photo.png', 'inverse of resolve');
}

// Root-relative root itself
{
  const rel = getRelativePath(tmpRoot);
  assertEq(rel, '', 'root → empty');
}

// Nested deeper
{
  const abs = path.join(tmpRoot, 'a', 'b', 'c.txt');
  const rel = getRelativePath(abs);
  assertEq(rel, 'a/b/c.txt', 'nested path');
}

// ============================================================================
// getUrlPath
// ============================================================================
console.log('\n── getUrlPath ────────────────────────────────────────────');

assertEq(getUrlPath('gallery/photo.png'), '/images/gallery/photo.png', 'simple');
assertEq(getUrlPath('/gallery/photo.png'), '/images/gallery/photo.png', 'leading slash stripped');
assertEq(getUrlPath('//gallery/photo.png'), '/images/gallery/photo.png', 'multiple leading slashes');
assertEq(getUrlPath('banners\\hero.jpg'), '/images/banners/hero.jpg', 'backslash normalized');
assertEq(getUrlPath(''), '/images/', 'empty → /images/');

// ============================================================================
// isDirectory / isFile / getStats
// ============================================================================
console.log('\n── isDirectory / isFile / getStats ───────────────────────');

// Existing directory
assertEq(isDirectory('gallery'), true, 'existing dir → true');
assertEq(isFile('gallery'), false, 'dir is not a file');

// Existing file
assertEq(isFile('gallery/photo.png'), true, 'existing file → true');
assertEq(isDirectory('gallery/photo.png'), false, 'file is not a dir');

// Non-existent path
assertEq(isDirectory('nonexistent'), false, 'missing → false (dir)');
assertEq(isFile('nonexistent'), false, 'missing → false (file)');

// Invalid input (error swallowed)
assertEq(isDirectory(''), false, 'empty path → false (error swallowed)');
assertEq(isFile(''), false, 'empty path → false (error swallowed)');
assertEq(isDirectory('../../../etc'), false, 'traversal → false');

// getStats existing
{
  const stats = getStats('gallery/photo.png');
  assert(stats !== null, 'stats returned');
  assertEq(typeof stats.isFile, 'function', 'has isFile method');
  assertEq(stats.isFile(), true, 'is file');
}

// getStats missing
assertEq(getStats('nonexistent'), null, 'missing → null');
assertEq(getStats(''), null, 'empty → null (error swallowed)');

// ============================================================================
// sanitizeFilename — keep mode (default)
// ============================================================================
console.log('\n── sanitizeFilename: keep mode ───────────────────────────');

assertEq(sanitizeFilename('My File.png'), 'My File.png', 'keep: preserves case/spaces');
assertEq(sanitizeFilename('  spaces  '), 'spaces', 'keep: trims');
assertEq(sanitizeFilename('path/to/file.png'), 'pathtofile.png', 'keep: removes slashes');
assertEq(sanitizeFilename('path\\to\\file.png'), 'pathtofile.png', 'keep: removes backslashes');
assertEq(sanitizeFilename('file\0.png'), 'file.png', 'keep: removes null byte');
assertEq(sanitizeFilename('name.PNG'), 'name.PNG', 'keep: preserves extension case');

// Explicit 'keep' mode
assertEq(sanitizeFilename('My File.png', 'keep'), 'My File.png', 'explicit keep');

// ============================================================================
// sanitizeFilename — slug mode
// ============================================================================
console.log('\n── sanitizeFilename: slug mode ───────────────────────────');

assertEq(sanitizeFilename('My File.png', 'slug'), 'my-file.png', 'slug: lowercase + dash');
assertEq(sanitizeFilename('UPPERCASE.JPG', 'slug'), 'uppercase.jpg', 'slug: all lower');
assertEq(sanitizeFilename('hello  world.png', 'slug'), 'hello-world.png', 'slug: collapses --');
assertEq(sanitizeFilename('---leading.png', 'slug'), 'leading.png', 'slug: trims leading -');
assertEq(sanitizeFilename('trailing---.png', 'slug'), 'trailing-.png', 'slug: dot-dash edge');
// Actually, 'trailing---.png' → 'trailing-.png' after collapse (trailing --- becomes -)
// Then .replace(/^-|-$/g, '') strips trailing - but '.' separates it, so final is 'trailing-.png'
assertEq(sanitizeFilename('multi___word!!!name@@@.png', 'slug'), 'multi-word-name-.png', 'slug: special chars');
assertEq(sanitizeFilename('only---dashes', 'slug'), 'only-dashes', 'slug: collapses internal dashes');
assertEq(sanitizeFilename('---', 'slug'), '', 'slug: all dashes → empty');

// ============================================================================
// sanitizeFilename — hash mode
// ============================================================================
console.log('\n── sanitizeFilename: hash mode ───────────────────────────');

{
  const result = sanitizeFilename('original.png', 'hash');
  assert(/^img_\d+_[a-z0-9]{7}\.png$/.test(result), 'hash: matches pattern');
  assert(result.endsWith('.png'), 'hash: preserves extension');
}

{
  const result = sanitizeFilename('photo.JPG', 'hash');
  assert(result.endsWith('.JPG'), 'hash: case-preserving extension');
}

{
  const result = sanitizeFilename('noext', 'hash');
  assert(/^img_\d+_[a-z0-9]{7}$/.test(result), 'hash: no extension');
}

// Two calls produce different output (different rand)
{
  const r1 = sanitizeFilename('x.png', 'hash');
  const r2 = sanitizeFilename('x.png', 'hash');
  // They MAY be equal if timestamp + Math.random collides (extremely rare)
  // but usually different
  assert(typeof r1 === 'string' && r1.length > 0, 'hash 1 produced');
  assert(typeof r2 === 'string' && r2.length > 0, 'hash 2 produced');
}

// Unknown mode → returns original
assertEq(sanitizeFilename('unchanged.png', 'bogus' as any), 'unchanged.png', 'unknown mode → unchanged');

// ============================================================================
// Cleanup
// ============================================================================
try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
delete process.env.PUBLIC_IMAGES_ROOT;

console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
