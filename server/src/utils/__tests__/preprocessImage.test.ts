#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/preprocessImage.js (OMD-943)
 *
 * Three exports:
 *   - preprocessImage         single sharp chain (grayscale → normalize →
 *                             sharpen → png → toFile). On failure returns
 *                             original inputPath.
 *   - advancedPreprocessImage two-pass: basic chain → threshold pass to
 *                             outputPath. Cleans up temp file. On failure
 *                             falls back to preprocessImage. On total
 *                             failure returns inputPath.
 *   - cleanupTempFiles        deletes a list of files via fs.unlinkSync,
 *                             tolerates missing/erroring files.
 *
 * Strategy: stub `sharp` via require.cache with a chainable factory.
 * Monkey-patch fs.existsSync + fs.unlinkSync. Track every chain call,
 * every toFile destination, every metadata read.
 *
 * Run from server/: npx tsx src/utils/__tests__/preprocessImage.test.ts
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

// ── sharp stub: chainable factory tracking every call ────────────────
type ChainCall = { method: string; args: any[]; input: string };
const chainCalls: ChainCall[] = [];
const toFileWrites: Array<{ input: string; output: string; chain: string[] }> = [];

let metadataResult: any = { format: 'jpeg', width: 1000, height: 800, channels: 3 };
let metadataShouldThrow = false;
let toFileShouldThrowFor: Set<string> = new Set(); // throw when output path matches

function makeChain(input: string) {
  const chain: string[] = [];
  const obj: any = {};

  const chainable = (method: string) => (...args: any[]) => {
    chainCalls.push({ method, args, input });
    chain.push(method);
    return obj;
  };

  obj.grayscale = chainable('grayscale');
  obj.normalize = chainable('normalize');
  obj.sharpen = chainable('sharpen');
  obj.png = chainable('png');
  obj.threshold = chainable('threshold');

  obj.metadata = async () => {
    chainCalls.push({ method: 'metadata', args: [], input });
    if (metadataShouldThrow) throw new Error('metadata failed');
    return metadataResult;
  };

  obj.toFile = async (output: string) => {
    chainCalls.push({ method: 'toFile', args: [output], input });
    if (toFileShouldThrowFor.has(output)) {
      throw new Error(`toFile failed: ${output}`);
    }
    toFileWrites.push({ input, output, chain: [...chain] });
    return { format: 'png', size: 1234 };
  };

  return obj;
}

const sharpStub = (input: string) => makeChain(input);

const sharpPath = require.resolve('sharp');
require.cache[sharpPath] = {
  id: sharpPath, filename: sharpPath, loaded: true,
  exports: sharpStub
} as any;

// ── fs monkey-patch: track existsSync + unlinkSync ──────────────────
const fs = require('fs');
const origExistsSync = fs.existsSync;
const origUnlinkSync = fs.unlinkSync;

const existsMap = new Map<string, boolean>();
const existsCalls: string[] = [];
const unlinkCalls: string[] = [];
let unlinkShouldThrowFor: Set<string> = new Set();

fs.existsSync = (p: string): boolean => {
  existsCalls.push(p);
  return existsMap.has(p) ? existsMap.get(p)! : false;
};
fs.unlinkSync = (p: string) => {
  unlinkCalls.push(p);
  if (unlinkShouldThrowFor.has(p)) {
    throw new Error(`unlink failed: ${p}`);
  }
  existsMap.delete(p);
};

// Now require the SUT
const {
  preprocessImage,
  advancedPreprocessImage,
  cleanupTempFiles,
} = require('../preprocessImage');

function reset() {
  chainCalls.length = 0;
  toFileWrites.length = 0;
  existsCalls.length = 0;
  unlinkCalls.length = 0;
  existsMap.clear();
  metadataResult = { format: 'jpeg', width: 1000, height: 800, channels: 3 };
  metadataShouldThrow = false;
  toFileShouldThrowFor = new Set();
  unlinkShouldThrowFor = new Set();
}

(async () => {

// ============================================================================
// preprocessImage: happy path
// ============================================================================
console.log('\n── preprocessImage: happy path ───────────────────────────');

reset();
{
  const out = await preprocessImage('/in/scan.jpg', '/out/scan.png');
  assertEq(out, '/out/scan.png', 'returns outputPath on success');

  // metadata read first
  const methods = chainCalls.map(c => c.method);
  assertEq(methods[0], 'metadata', 'metadata called first');

  // Then chain: grayscale → normalize → sharpen → png → toFile
  assertEq(toFileWrites.length, 1, 'one toFile write');
  assertEq(toFileWrites[0].output, '/out/scan.png', 'output is outputPath');
  assertEq(toFileWrites[0].input, '/in/scan.jpg', 'input is inputPath');
  assertEq(
    toFileWrites[0].chain,
    ['grayscale', 'normalize', 'sharpen', 'png'],
    'pipeline order: grayscale → normalize → sharpen → png'
  );

  // png called with quality: 100
  const pngCall = chainCalls.find(c => c.method === 'png' && c.args[0]?.quality);
  assert(pngCall !== undefined, 'png called with options');
  assertEq(pngCall?.args[0].quality, 100, 'png quality: 100');
}

// ============================================================================
// preprocessImage: failure → returns input path
// ============================================================================
console.log('\n── preprocessImage: failure fallback ─────────────────────');

reset();
metadataShouldThrow = true;
{
  const out = await preprocessImage('/in/x.jpg', '/out/x.png');
  assertEq(out, '/in/x.jpg', 'returns inputPath on metadata failure');
}

reset();
toFileShouldThrowFor.add('/out/y.png');
{
  const out = await preprocessImage('/in/y.jpg', '/out/y.png');
  assertEq(out, '/in/y.jpg', 'returns inputPath on toFile failure');
}

// ============================================================================
// advancedPreprocessImage: happy path
// ============================================================================
console.log('\n── advancedPreprocessImage: happy path ───────────────────');

reset();
existsMap.set('/out/scan_temp.png', true); // exists for cleanup
{
  const out = await advancedPreprocessImage('/in/scan.jpg', '/out/scan.png');
  assertEq(out, '/out/scan.png', 'returns outputPath on success');

  // Two toFile writes: temp first, then final
  assertEq(toFileWrites.length, 2, 'two toFile writes');
  assertEq(toFileWrites[0].output, '/out/scan_temp.png', 'first write to temp');
  assertEq(toFileWrites[0].input, '/in/scan.jpg', 'first input is original');
  assertEq(
    toFileWrites[0].chain,
    ['grayscale', 'normalize', 'sharpen', 'png'],
    'first pass: basic chain'
  );

  assertEq(toFileWrites[1].output, '/out/scan.png', 'second write to final');
  assertEq(toFileWrites[1].input, '/out/scan_temp.png', 'second input is temp');
  assertEq(
    toFileWrites[1].chain,
    ['threshold', 'png'],
    'second pass: threshold → png'
  );

  // threshold value
  const thresholdCall = chainCalls.find(c => c.method === 'threshold');
  assertEq(thresholdCall?.args[0], 128, 'threshold value: 128');

  // Temp file cleaned up
  assertEq(unlinkCalls, ['/out/scan_temp.png'], 'temp file unlinked');
}

// ============================================================================
// advancedPreprocessImage: temp file already gone → no unlink
// ============================================================================
console.log('\n── advancedPreprocessImage: temp absent ──────────────────');

reset();
// Don't set existsMap → existsSync returns false
{
  const out = await advancedPreprocessImage('/in/a.jpg', '/out/a.png');
  assertEq(out, '/out/a.png', 'still returns outputPath');
  assertEq(unlinkCalls.length, 0, 'no unlink when temp absent');
}

// ============================================================================
// advancedPreprocessImage: temp file extension replacement
// ============================================================================
console.log('\n── advancedPreprocessImage: temp name pattern ────────────');

reset();
{
  await advancedPreprocessImage('/in/x.jpg', '/out/photo.jpeg');
  assertEq(toFileWrites[0].output, '/out/photo_temp.png', 'jpeg → _temp.png');
}
reset();
{
  await advancedPreprocessImage('/in/x.jpg', '/out/photo.png');
  assertEq(toFileWrites[0].output, '/out/photo_temp.png', 'png → _temp.png');
}
reset();
{
  await advancedPreprocessImage('/in/x.jpg', '/out/photo.JPG');
  assertEq(toFileWrites[0].output, '/out/photo_temp.png', 'case-insensitive .JPG → _temp.png');
}

// ============================================================================
// advancedPreprocessImage: first pass fails → falls back to preprocessImage
// ============================================================================
console.log('\n── advancedPreprocessImage: fallback to basic ────────────');

reset();
toFileShouldThrowFor.add('/out/q_temp.png'); // first pass fails
{
  const out = await advancedPreprocessImage('/in/q.jpg', '/out/q.png');
  // Falls back to preprocessImage which writes to /out/q.png successfully
  assertEq(out, '/out/q.png', 'fallback writes to outputPath');
  // Verify the fallback chain ran (basic preprocess to outputPath)
  const fallbackWrite = toFileWrites.find(w => w.output === '/out/q.png');
  assert(fallbackWrite !== undefined, 'fallback write to outputPath occurred');
  assertEq(
    fallbackWrite?.chain,
    ['grayscale', 'normalize', 'sharpen', 'png'],
    'fallback used basic chain'
  );
}

// ============================================================================
// advancedPreprocessImage: complete failure → returns inputPath
// ============================================================================
console.log('\n── advancedPreprocessImage: total failure ────────────────');

reset();
toFileShouldThrowFor.add('/out/z_temp.png');
toFileShouldThrowFor.add('/out/z.png');
{
  const out = await advancedPreprocessImage('/in/z.jpg', '/out/z.png');
  assertEq(out, '/in/z.jpg', 'total failure → returns inputPath');
}

// ============================================================================
// cleanupTempFiles
// ============================================================================
console.log('\n── cleanupTempFiles ──────────────────────────────────────');

// Existing files are deleted
reset();
existsMap.set('/tmp/a.png', true);
existsMap.set('/tmp/b.png', true);
existsMap.set('/tmp/c.png', true);
{
  cleanupTempFiles(['/tmp/a.png', '/tmp/b.png', '/tmp/c.png']);
  assertEq(unlinkCalls.length, 3, 'all 3 unlinked');
  assert(unlinkCalls.includes('/tmp/a.png'), 'a unlinked');
  assert(unlinkCalls.includes('/tmp/b.png'), 'b unlinked');
  assert(unlinkCalls.includes('/tmp/c.png'), 'c unlinked');
}

// Missing files are skipped silently
reset();
existsMap.set('/tmp/exists.png', true);
{
  cleanupTempFiles(['/tmp/missing.png', '/tmp/exists.png']);
  assertEq(unlinkCalls, ['/tmp/exists.png'], 'only existing file unlinked');
}

// Empty array is a no-op
reset();
{
  cleanupTempFiles([]);
  assertEq(unlinkCalls.length, 0, 'empty list → no unlink');
  assertEq(existsCalls.length, 0, 'empty list → no existsSync');
}

// unlinkSync error is caught (does not throw)
reset();
existsMap.set('/tmp/erroring.png', true);
unlinkShouldThrowFor.add('/tmp/erroring.png');
{
  let threw = false;
  try {
    cleanupTempFiles(['/tmp/erroring.png']);
  } catch (e) { threw = true; }
  assertEq(threw, false, 'unlink error swallowed');
}

// Mixed: one error does not block subsequent files
reset();
existsMap.set('/tmp/a.png', true);
existsMap.set('/tmp/bad.png', true);
existsMap.set('/tmp/c.png', true);
unlinkShouldThrowFor.add('/tmp/bad.png');
{
  cleanupTempFiles(['/tmp/a.png', '/tmp/bad.png', '/tmp/c.png']);
  assert(unlinkCalls.includes('/tmp/a.png'), 'a deleted');
  assert(unlinkCalls.includes('/tmp/bad.png'), 'bad attempted');
  assert(unlinkCalls.includes('/tmp/c.png'), 'c deleted after error');
}

// ============================================================================
// Restore fs and exit
// ============================================================================
fs.existsSync = origExistsSync;
fs.unlinkSync = origUnlinkSync;

console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

})();
