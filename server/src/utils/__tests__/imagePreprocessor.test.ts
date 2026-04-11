#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/imagePreprocessor.js (OMD-945)
 *
 * ImagePreprocessor class:
 *   - constructor              defaults (1024x1440, supportedFormats)
 *   - processImage             6-step pipeline integration
 *   - detectDocumentBounds     5% padding success / 2% fallback
 *   - correctRotation          EXIF orientation map (3=180, 6=90, 8=-90, default=0)
 *   - cropToDocument           sharp.extract pass-through; original on failure
 *   - resizeToStandard         sharp.resize pass-through; original on failure
 *   - enhanceForOCR            language-aware (el/ru get gamma; others get sigma)
 *   - generateOutputFilename   timestamp + suffix selection
 *   - ensureDirectory          access then mkdir on miss
 *   - isValidImageFormat       case-insensitive ext check
 *   - healthCheck              creates test buffer + runs processImage
 *
 * Strategy: stub `sharp` and `fs.promises` via require.cache BEFORE
 * requiring the SUT. Sharp is a chainable callable that returns an object
 * with chainable methods + terminal toBuffer/metadata.
 *
 * Run from server/: npx tsx src/utils/__tests__/imagePreprocessor.test.ts
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

// ── Tracking state for stubs ─────────────────────────────────────────
type Call = { method: string; args: any[] };
let chainCalls: Call[] = [];
let metadataResponses: any[] = [];
let toBufferResponses: any[] = [];
let throwOnConvolve = false;
let throwOnExtract = false;
let throwOnResize = false;
let throwOnEnhance = false;

const fsCalls: Call[] = [];
const fsAccessMap = new Map<string, boolean>();
let fsAccessThrows: string | null = null;
let fsReadFileResult: Buffer = Buffer.from('fake-input');
let fsReadFileThrows = false;
let fsWriteFileThrows = false;

function resetTracking() {
  chainCalls = [];
  metadataResponses = [];
  toBufferResponses = [];
  throwOnConvolve = false;
  throwOnExtract = false;
  throwOnResize = false;
  throwOnEnhance = false;
  fsCalls.length = 0;
  fsAccessMap.clear();
  fsAccessThrows = null;
  fsReadFileResult = Buffer.from('fake-input');
  fsReadFileThrows = false;
  fsWriteFileThrows = false;
}

// ── sharp stub ───────────────────────────────────────────────────────
function makeChain(input: any): any {
  const obj: any = {};
  const chainable = (method: string) => (...args: any[]) => {
    chainCalls.push({ method, args });
    if (method === 'convolve' && throwOnConvolve) throw new Error('convolve failed');
    if (method === 'extract' && throwOnExtract) throw new Error('extract failed');
    if (method === 'resize' && throwOnResize) throw new Error('resize failed');
    if (method === 'linear' && throwOnEnhance) throw new Error('linear failed');
    return obj;
  };
  obj.greyscale = chainable('greyscale');
  obj.grayscale = chainable('grayscale');
  obj.normalise = chainable('normalise');
  obj.normalize = chainable('normalize');
  obj.sharpen = chainable('sharpen');
  obj.gamma = chainable('gamma');
  obj.linear = chainable('linear');
  obj.convolve = chainable('convolve');
  obj.raw = chainable('raw');
  obj.rotate = chainable('rotate');
  obj.extract = chainable('extract');
  obj.resize = chainable('resize');
  obj.jpeg = chainable('jpeg');
  obj.png = chainable('png');
  obj.toBuffer = async () => {
    chainCalls.push({ method: 'toBuffer', args: [] });
    if (toBufferResponses.length > 0) {
      const r = toBufferResponses.shift();
      if (r instanceof Error) throw r;
      return r;
    }
    return Buffer.from('processed');
  };
  obj.metadata = async () => {
    chainCalls.push({ method: 'metadata', args: [] });
    if (metadataResponses.length > 0) {
      const r = metadataResponses.shift();
      if (r instanceof Error) throw r;
      return r;
    }
    return { width: 800, height: 1200, format: 'jpeg', size: 1234 };
  };
  return obj;
}

const sharpStub: any = (input: any) => {
  chainCalls.push({ method: '__call__', args: [input] });
  return makeChain(input);
};
sharpStub.versions = { sharp: 'stub-1.0.0' };

// Install stub BEFORE requiring SUT
const sharpPath = require.resolve('sharp');
require.cache[sharpPath] = {
  id: sharpPath,
  filename: sharpPath,
  loaded: true,
  exports: sharpStub,
} as any;

// ── fs.promises stub ─────────────────────────────────────────────────
const fs = require('fs');
const origFsPromises = fs.promises;
const fsPromisesStub = {
  access: async (p: string) => {
    fsCalls.push({ method: 'access', args: [p] });
    if (fsAccessThrows && p === fsAccessThrows) throw new Error('not found');
    if (!fsAccessMap.has(p)) throw new Error('ENOENT');
    return undefined;
  },
  mkdir: async (p: string, opts: any) => {
    fsCalls.push({ method: 'mkdir', args: [p, opts] });
    fsAccessMap.set(p, true);
    return undefined;
  },
  readFile: async (p: string) => {
    fsCalls.push({ method: 'readFile', args: [p] });
    if (fsReadFileThrows) throw new Error('readFile failed');
    return fsReadFileResult;
  },
  writeFile: async (p: string, data: any) => {
    fsCalls.push({ method: 'writeFile', args: [p, data] });
    if (fsWriteFileThrows) throw new Error('writeFile failed');
    return undefined;
  },
};
Object.defineProperty(fs, 'promises', {
  value: fsPromisesStub,
  configurable: true,
  writable: true,
});

// Now require the SUT
const ImagePreprocessor = require('../imagePreprocessor');

// Silence console.log noise from the SUT
const origLog = console.log;
const origError = console.error;
console.log = () => {};
console.error = () => {};

// ============================================================================
// Main async wrapper (top-level await unavailable in tsx CJS mode)
// ============================================================================
const restore = () => { console.log = origLog; console.error = origError; };

async function main() {
const ip = new ImagePreprocessor();
restore();
console.log('\n── constructor ───────────────────────────────────────────');
assertEq(ip.standardWidth, 1024, 'standardWidth = 1024');
assertEq(ip.standardHeight, 1440, 'standardHeight = 1440');
assertEq(
  ip.supportedFormats,
  ['.jpg', '.jpeg', '.png', '.tiff', '.webp', '.pdf'],
  'supportedFormats list'
);
console.log = () => {};
console.error = () => {};

// ============================================================================
// isValidImageFormat (pure)
// ============================================================================
restore();
console.log('\n── isValidImageFormat ────────────────────────────────────');

assertEq(ip.isValidImageFormat('photo.jpg'), true, '.jpg valid');
assertEq(ip.isValidImageFormat('photo.JPG'), true, '.JPG case-insensitive');
assertEq(ip.isValidImageFormat('image.png'), true, '.png valid');
assertEq(ip.isValidImageFormat('doc.PDF'), true, '.PDF valid');
assertEq(ip.isValidImageFormat('archive.zip'), false, '.zip invalid');
assertEq(ip.isValidImageFormat('noext'), false, 'no extension invalid');
assertEq(ip.isValidImageFormat('a.tiff'), true, '.tiff valid');
assertEq(ip.isValidImageFormat('a.webp'), true, '.webp valid');

console.log = () => {};
console.error = () => {};

// ============================================================================
// generateOutputFilename (pure)
// ============================================================================
restore();
console.log('\n── generateOutputFilename ────────────────────────────────');

{
  const out = ip.generateOutputFilename('original.jpg', 'en', true);
  assert(out.startsWith('original_enhanced_en_'), 'enhanced en prefix');
  assert(out.endsWith('.jpg'), 'always .jpg extension');
  assert(/_\d{10,}\.jpg$/.test(out), 'has timestamp');
}

{
  const out = ip.generateOutputFilename('photo.png', 'el', false);
  assert(out.startsWith('photo_processed_el_'), 'processed (not enhanced) suffix');
}

{
  const out = ip.generateOutputFilename(null, 'en', true);
  assert(/^image_\d+_enhanced_en_\d+\.jpg$/.test(out), 'null filename → image_<ts>_...');
}

{
  // path.parse strips directory and extension
  const out = ip.generateOutputFilename('/path/to/scan.tiff', 'ru', true);
  assert(out.startsWith('scan_enhanced_ru_'), 'strips dir + ext');
}

console.log = () => {};
console.error = () => {};

// ============================================================================
// ensureDirectory
// ============================================================================
restore();
console.log('\n── ensureDirectory ───────────────────────────────────────');

resetTracking();
fsAccessMap.set('/exists', true);
await ip.ensureDirectory('/exists');
assertEq(fsCalls.length, 1, 'only access called when dir exists');
assertEq(fsCalls[0].method, 'access', 'access called');

resetTracking();
// dir does not exist → access throws → mkdir called
await ip.ensureDirectory('/missing');
assertEq(fsCalls.length, 2, 'access + mkdir on miss');
assertEq(fsCalls[0].method, 'access', 'access first');
assertEq(fsCalls[1].method, 'mkdir', 'mkdir second');
assertEq(fsCalls[1].args[1], { recursive: true }, 'recursive: true');

console.log = () => {};
console.error = () => {};

// ============================================================================
// detectDocumentBounds
// ============================================================================
restore();
console.log('\n── detectDocumentBounds ──────────────────────────────────');

// Success path: 5% padding
resetTracking();
metadataResponses = [{ width: 1000, height: 2000 }];
{
  const bounds = await ip.detectDocumentBounds(Buffer.from('img'));
  // padding = min(1000,2000)*0.05 = 50
  assertEq(bounds, { x: 50, y: 50, width: 900, height: 1900 }, '5% padding bounds');
}

// Convolve fails → fallback to 2% padding
resetTracking();
throwOnConvolve = true;
metadataResponses = [
  { width: 500, height: 1000 }, // first metadata call (try block)
  { width: 500, height: 1000 }, // second metadata call (catch block)
];
{
  const bounds = await ip.detectDocumentBounds(Buffer.from('img'));
  // padding = 500 * 0.02 = 10
  assertEq(bounds, { x: 10, y: 10, width: 480, height: 980 }, '2% fallback bounds');
}

console.log = () => {};
console.error = () => {};

// ============================================================================
// correctRotation
// ============================================================================
restore();
console.log('\n── correctRotation ───────────────────────────────────────');

// orientation 3 → 180
resetTracking();
metadataResponses = [{ width: 100, height: 100, orientation: 3 }];
toBufferResponses = [Buffer.from('rotated180')];
{
  const { rotatedBuffer, rotationAngle } = await ip.correctRotation(Buffer.from('img'));
  assertEq(rotationAngle, 180, 'orientation 3 → 180');
  assert(Buffer.isBuffer(rotatedBuffer), 'returns buffer');
}

// orientation 6 → 90
resetTracking();
metadataResponses = [{ width: 100, height: 100, orientation: 6 }];
toBufferResponses = [Buffer.from('rotated90')];
{
  const { rotationAngle } = await ip.correctRotation(Buffer.from('img'));
  assertEq(rotationAngle, 90, 'orientation 6 → 90');
}

// orientation 8 → -90
resetTracking();
metadataResponses = [{ width: 100, height: 100, orientation: 8 }];
toBufferResponses = [Buffer.from('rotatedm90')];
{
  const { rotationAngle } = await ip.correctRotation(Buffer.from('img'));
  assertEq(rotationAngle, -90, 'orientation 8 → -90');
}

// orientation 4 (other) → 0 (default branch in switch)
resetTracking();
metadataResponses = [{ width: 100, height: 100, orientation: 4 }];
toBufferResponses = [Buffer.from('r0')];
{
  const { rotationAngle } = await ip.correctRotation(Buffer.from('img'));
  assertEq(rotationAngle, 0, 'orientation 4 → 0 (default)');
}

// no orientation → no rotate, returns input buffer
resetTracking();
metadataResponses = [{ width: 100, height: 100 }];
{
  const inBuf = Buffer.from('input');
  const { rotatedBuffer, rotationAngle } = await ip.correctRotation(inBuf);
  assertEq(rotationAngle, 0, 'no orientation → 0');
  assertEq(rotatedBuffer === inBuf, true, 'returns input buffer unchanged');
}

// metadata throws → fallback returns input + 0
resetTracking();
metadataResponses = [new Error('metadata failed')];
{
  const inBuf = Buffer.from('input');
  const { rotatedBuffer, rotationAngle } = await ip.correctRotation(inBuf);
  assertEq(rotationAngle, 0, 'error → 0');
  assertEq(rotatedBuffer === inBuf, true, 'error → input buffer');
}

console.log = () => {};
console.error = () => {};

// ============================================================================
// cropToDocument
// ============================================================================
restore();
console.log('\n── cropToDocument ────────────────────────────────────────');

resetTracking();
toBufferResponses = [Buffer.from('cropped')];
{
  const out = await ip.cropToDocument(Buffer.from('img'), { x: 10, y: 20, width: 100, height: 200 });
  assert(Buffer.isBuffer(out), 'returns buffer');
  const extractCall = chainCalls.find(c => c.method === 'extract');
  assertEq(
    extractCall?.args[0],
    { left: 10, top: 20, width: 100, height: 200 },
    'extract called with bounds (xy → left/top)'
  );
}

// extract throws → returns original
resetTracking();
throwOnExtract = true;
{
  const inBuf = Buffer.from('orig');
  const out = await ip.cropToDocument(inBuf, { x: 0, y: 0, width: 50, height: 50 });
  assertEq(out === inBuf, true, 'returns input on extract failure');
}

console.log = () => {};
console.error = () => {};

// ============================================================================
// resizeToStandard
// ============================================================================
restore();
console.log('\n── resizeToStandard ──────────────────────────────────────');

resetTracking();
toBufferResponses = [Buffer.from('resized')];
{
  const out = await ip.resizeToStandard(Buffer.from('img'));
  assert(Buffer.isBuffer(out), 'returns buffer');
  const resizeCall = chainCalls.find(c => c.method === 'resize');
  assertEq(resizeCall?.args[0], 1024, 'width = 1024');
  assertEq(resizeCall?.args[1], 1440, 'height = 1440');
  assertEq(resizeCall?.args[2].fit, 'inside', 'fit: inside');
  assertEq(
    resizeCall?.args[2].background,
    { r: 255, g: 255, b: 255, alpha: 1 },
    'white background'
  );
}

// resize throws → returns original
resetTracking();
throwOnResize = true;
{
  const inBuf = Buffer.from('orig');
  const out = await ip.resizeToStandard(inBuf);
  assertEq(out === inBuf, true, 'returns input on resize failure');
}

console.log = () => {};
console.error = () => {};

// ============================================================================
// enhanceForOCR
// ============================================================================
restore();
console.log('\n── enhanceForOCR ─────────────────────────────────────────');

// Greek (el) → normalise + sharpen + gamma
resetTracking();
toBufferResponses = [Buffer.from('enhanced')];
{
  const out = await ip.enhanceForOCR(Buffer.from('img'), 'el');
  assert(Buffer.isBuffer(out), 'returns buffer');
  const methods = chainCalls.map(c => c.method);
  assert(methods.includes('normalise'), 'el: normalise called');
  assert(methods.includes('sharpen'), 'el: sharpen called');
  assert(methods.includes('gamma'), 'el: gamma called');
  const gammaCall = chainCalls.find(c => c.method === 'gamma');
  assertEq(gammaCall?.args[0], 1.2, 'el: gamma 1.2');
}

// Russian (ru) → same as el
resetTracking();
toBufferResponses = [Buffer.from('enhanced')];
{
  await ip.enhanceForOCR(Buffer.from('img'), 'ru');
  const methods = chainCalls.map(c => c.method);
  assert(methods.includes('gamma'), 'ru: gamma called');
}

// English → normalise + sharpen({sigma: 0.5}) (no gamma)
resetTracking();
toBufferResponses = [Buffer.from('enhanced')];
{
  await ip.enhanceForOCR(Buffer.from('img'), 'en');
  const methods = chainCalls.map(c => c.method);
  assert(methods.includes('normalise'), 'en: normalise called');
  assert(methods.includes('sharpen'), 'en: sharpen called');
  assert(!methods.includes('gamma'), 'en: NO gamma');
  const sharpenCall = chainCalls.find(c => c.method === 'sharpen');
  assertEq(sharpenCall?.args[0]?.sigma, 0.5, 'en: sharpen sigma 0.5');
}

// Generic (greyscale + linear at end) for both branches
resetTracking();
toBufferResponses = [Buffer.from('enhanced')];
{
  await ip.enhanceForOCR(Buffer.from('img'), 'en');
  const methods = chainCalls.map(c => c.method);
  assert(methods.includes('greyscale'), 'greyscale always applied');
  const linearCall = chainCalls.find(c => c.method === 'linear');
  assertEq(linearCall?.args, [1.2, -20], 'linear(1.2, -20)');
}

// Default language defaults to 'en' branch (no gamma)
resetTracking();
toBufferResponses = [Buffer.from('enhanced')];
{
  await ip.enhanceForOCR(Buffer.from('img'));
  const methods = chainCalls.map(c => c.method);
  assert(!methods.includes('gamma'), 'default lang → en branch');
}

// Failure → return input
resetTracking();
throwOnEnhance = true;
{
  const inBuf = Buffer.from('orig');
  const out = await ip.enhanceForOCR(inBuf, 'en');
  assertEq(out === inBuf, true, 'returns input on enhance failure');
}

console.log = () => {};
console.error = () => {};

// ============================================================================
// processImage (integration)
// ============================================================================
restore();
console.log('\n── processImage ──────────────────────────────────────────');

// Full pipeline with file path input
resetTracking();
fsAccessMap.set('./uploads/processed', true); // dir exists
fsReadFileResult = Buffer.from('file-bytes');
metadataResponses = [
  { width: 1000, height: 2000, format: 'jpeg', size: 5555 }, // initial sharp(buffer).metadata
  { width: 1000, height: 2000 },                              // detectDocumentBounds metadata
  { width: 1000, height: 2000 },                              // correctRotation metadata (no orientation)
  { width: 800, height: 1200 },                               // cropped metadata
  { width: 1024, height: 1440, format: 'jpeg', size: 9999 },  // final metadata
];
toBufferResponses = [
  Buffer.from('edges'),     // detectDocumentBounds raw().toBuffer
  Buffer.from('cropped'),   // cropToDocument
  Buffer.from('resized'),   // resizeToStandard
  Buffer.from('enhanced'),  // enhanceForOCR
];

{
  const result = await ip.processImage('/input/photo.jpg', {
    language: 'en',
    enhance: true,
    outputDir: './uploads/processed',
    filename: 'photo.jpg',
  });

  assertEq(result.status, 'success', 'status success');
  assertEq(result.originalPath, '/input/photo.jpg', 'originalPath preserved');
  assert(result.outputPath.includes('photo_enhanced_en_'), 'outputPath has enhanced suffix');
  assert(result.outputPath.endsWith('.jpg'), 'outputPath .jpg');
  assertEq(result.metadata.original.width, 1000, 'original.width');
  assertEq(result.metadata.original.height, 2000, 'original.height');
  assertEq(result.metadata.original.format, 'jpeg', 'original.format');
  assertEq(result.metadata.processed.width, 1024, 'processed.width');
  assertEq(result.metadata.processed.height, 1440, 'processed.height');
  assertEq(result.metadata.transformations.enhanced, true, 'enhanced flag');
  assertEq(result.metadata.transformations.language, 'en', 'language passed through');
  assertEq(result.metadata.transformations.rotationAngle, 0, 'no rotation');

  const writeCall = fsCalls.find(c => c.method === 'writeFile');
  assert(writeCall !== undefined, 'writeFile called');
  const readCall = fsCalls.find(c => c.method === 'readFile');
  assertEq(readCall?.args[0], '/input/photo.jpg', 'readFile from input path');
}

// Buffer input (skips readFile)
resetTracking();
fsAccessMap.set('./uploads/processed', true);
metadataResponses = [
  { width: 500, height: 500, format: 'jpeg', size: 100 },
  { width: 500, height: 500 },
  { width: 500, height: 500 },
  { width: 400, height: 400 },
  { width: 400, height: 400, format: 'jpeg', size: 200 },
];
toBufferResponses = [
  Buffer.from('e'),
  Buffer.from('c'),
  Buffer.from('r'),
  Buffer.from('en'),
];
{
  const inBuf = Buffer.from('input-bytes');
  const result = await ip.processImage(inBuf, { enhance: false });
  assertEq(result.status, 'success', 'buffer input success');
  assertEq(result.originalPath, 'buffer', 'originalPath = "buffer" for Buffer input');
  assertEq(result.metadata.transformations.enhanced, false, 'enhance=false propagated');
  const readCall = fsCalls.find(c => c.method === 'readFile');
  assertEq(readCall, undefined, 'no readFile for Buffer input');
}

// Error path: fs.readFile fails → wrapped error thrown
resetTracking();
fsAccessMap.set('./uploads/processed', true);
fsReadFileThrows = true;
{
  let caught: Error | null = null;
  try {
    await ip.processImage('/bad/file.jpg', {});
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'error thrown');
  assert(
    caught !== null && caught.message.includes('Image preprocessing failed'),
    'error wrapped with prefix'
  );
}

console.log = () => {};
console.error = () => {};

// ============================================================================
// healthCheck
// ============================================================================
restore();
console.log('\n── healthCheck ───────────────────────────────────────────');

// Healthy path
resetTracking();
fsAccessMap.set('./temp', true);
toBufferResponses = [
  Buffer.from('jpeg-test'),  // sharp({create:..}).jpeg().toBuffer
  Buffer.from('e'),          // detectDocumentBounds raw
  Buffer.from('c'),          // crop
  Buffer.from('r'),          // resize
  Buffer.from('en'),         // enhance
];
metadataResponses = [
  { width: 100, height: 100, format: 'jpeg', size: 50 }, // initial
  { width: 100, height: 100 }, // detect
  { width: 100, height: 100 }, // rotation
  { width: 90, height: 90 },   // cropped
  { width: 90, height: 90, format: 'jpeg', size: 40 }, // final
];
{
  const result = await ip.healthCheck();
  assertEq(result.status, 'healthy', 'healthy status');
  assertEq(result.processing_test, 'passed', 'processing test passed');
  assert(result.capabilities !== null, 'capabilities present');
  assertEq(
    result.capabilities.formats,
    ['.jpg', '.jpeg', '.png', '.tiff', '.webp', '.pdf'],
    'capabilities.formats'
  );
  assertEq(
    result.capabilities.standard_resolution,
    '1024x1440',
    'standard resolution'
  );
  assert(
    result.capabilities.features.includes('document_detection'),
    'features list'
  );
  assert(result.sharp_version !== undefined, 'sharp_version present');
}

// Unhealthy path: sharp().jpeg().toBuffer fails
resetTracking();
fsAccessMap.set('./temp', true);
toBufferResponses = [new Error('sharp create failed')];
{
  const result = await ip.healthCheck();
  assertEq(result.status, 'unhealthy', 'unhealthy when sharp fails');
  assert(result.error !== undefined, 'error message set');
  assertEq(result.capabilities, null, 'no capabilities on failure');
}

// ============================================================================
// Restore + summary
// ============================================================================
restore();
Object.defineProperty(fs, 'promises', {
  value: origFsPromises,
  configurable: true,
  writable: true,
});

console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main()

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
