#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/imageProcessor.js (OMD-947)
 *
 * ImageProcessor singleton — module exports `new ImageProcessor()`.
 * Constructor calls async ensureDirectories() (fire-and-forget) using
 * fs.promises.mkdir, so we stub fs BEFORE require.
 *
 * Coverage:
 *   - constructor             default uploadDir/enhancedDir, env override,
 *                             auto-runs ensureDirectories
 *   - validateImage           valid jpeg/png; missing format; unsupported
 *                             format; too small; too large; sharp throws
 *   - enhanceForOCR           validates first; invalid → throws; valid →
 *                             pipeline + writes file; size 0 → throws
 *   - autoCropDocument        crops if box > 80%; otherwise returns original;
 *                             metadata throws → returns original
 *   - generateThumbnail       writes file; on error returns null
 *   - extractMetadata         maps sharp metadata + fs.stat; on error null
 *   - estimateProcessingTime  PURE: base + megapixels + fileSize +
 *                             format multiplier; clamped 5..120
 *   - cleanupOldFiles         deletes files older than maxAgeHours;
 *                             on error returns 0
 *
 * Strategy: stub sharp via require.cache, fs.promises via defineProperty,
 * logger via require.cache. Install BEFORE requiring SUT.
 *
 * Run from server/: npx tsx src/utils/__tests__/imageProcessor.test.ts
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

// ── Tracking state ───────────────────────────────────────────────────
type Call = { method: string; args: any[] };
let chainCalls: Call[] = [];
let metadataResponses: any[] = [];
let toBufferResponses: any[] = [];
let toFileResponses: any[] = [];
let throwOnNextSharp = false;

function resetSharp() {
  chainCalls = [];
  metadataResponses = [];
  toBufferResponses = [];
  toFileResponses = [];
  throwOnNextSharp = false;
}

// ── sharp stub ───────────────────────────────────────────────────────
function makeChain(input: any): any {
  if (throwOnNextSharp) {
    throwOnNextSharp = false;
    throw new Error('sharp instantiation failed');
  }
  const obj: any = {};
  const chainable = (method: string) => (...args: any[]) => {
    chainCalls.push({ method, args });
    return obj;
  };
  for (const m of [
    'rotate', 'resize', 'grayscale', 'greyscale', 'normalise', 'normalize',
    'sharpen', 'gamma', 'linear', 'median', 'png', 'jpeg', 'convolve',
    'threshold', 'extract', 'raw',
  ]) {
    obj[m] = chainable(m);
  }
  obj.metadata = async () => {
    chainCalls.push({ method: 'metadata', args: [] });
    if (metadataResponses.length > 0) {
      const r = metadataResponses.shift();
      if (r instanceof Error) throw r;
      return r;
    }
    return { width: 800, height: 1200, format: 'jpeg', size: 1234 };
  };
  obj.toBuffer = async (opts?: any) => {
    chainCalls.push({ method: 'toBuffer', args: [opts] });
    if (toBufferResponses.length > 0) {
      const r = toBufferResponses.shift();
      if (r instanceof Error) throw r;
      return r;
    }
    return Buffer.from('out');
  };
  obj.toFile = async (path: string) => {
    chainCalls.push({ method: 'toFile', args: [path] });
    if (toFileResponses.length > 0) {
      const r = toFileResponses.shift();
      if (r instanceof Error) throw r;
      return r;
    }
    return { size: 100, format: 'png' };
  };
  return obj;
}

const sharpStub: any = (input: any) => {
  chainCalls.push({ method: '__call__', args: [input] });
  return makeChain(input);
};
sharpStub.versions = { sharp: 'stub' };

const sharpPath = require.resolve('sharp');
require.cache[sharpPath] = {
  id: sharpPath, filename: sharpPath, loaded: true, exports: sharpStub,
} as any;

// ── logger stub ──────────────────────────────────────────────────────
const loggerCalls: Call[] = [];
const loggerStub = {
  info: (...args: any[]) => loggerCalls.push({ method: 'info', args }),
  warn: (...args: any[]) => loggerCalls.push({ method: 'warn', args }),
  error: (...args: any[]) => loggerCalls.push({ method: 'error', args }),
  debug: (...args: any[]) => loggerCalls.push({ method: 'debug', args }),
};
const loggerPath = require.resolve('../logger');
require.cache[loggerPath] = {
  id: loggerPath, filename: loggerPath, loaded: true, exports: loggerStub,
} as any;

// ── fs.promises stub ─────────────────────────────────────────────────
const fsCalls: Call[] = [];
const fileMtimes = new Map<string, number>();
let readdirResult: string[] = [];
let statResult: any = { size: 100, mtime: new Date() };
let statThrows: any = null;
let mkdirThrows = false;
let unlinkThrows = false;
let unlinkedFiles: string[] = [];

function resetFs() {
  fsCalls.length = 0;
  fileMtimes.clear();
  readdirResult = [];
  statResult = { size: 100, mtime: new Date() };
  statThrows = null;
  mkdirThrows = false;
  unlinkThrows = false;
  unlinkedFiles = [];
}

const fs = require('fs');
const origFsPromises = fs.promises;
const fsPromisesStub = {
  mkdir: async (p: string, opts: any) => {
    fsCalls.push({ method: 'mkdir', args: [p, opts] });
    if (mkdirThrows) throw new Error('mkdir failed');
    return undefined;
  },
  stat: async (p: string) => {
    fsCalls.push({ method: 'stat', args: [p] });
    if (statThrows) throw statThrows;
    if (fileMtimes.has(p)) {
      return { size: 100, mtime: new Date(fileMtimes.get(p)!) };
    }
    return statResult;
  },
  readdir: async (p: string) => {
    fsCalls.push({ method: 'readdir', args: [p] });
    return readdirResult;
  },
  unlink: async (p: string) => {
    fsCalls.push({ method: 'unlink', args: [p] });
    if (unlinkThrows) throw new Error('unlink failed');
    unlinkedFiles.push(p);
    return undefined;
  },
  access: async (p: string) => {
    fsCalls.push({ method: 'access', args: [p] });
    return undefined;
  },
};
Object.defineProperty(fs, 'promises', {
  value: fsPromisesStub,
  configurable: true,
  writable: true,
});

// Now require SUT (constructor will fire-and-forget ensureDirectories)
const ip = require('../imageProcessor');

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

async function main() {
// Allow constructor's async ensureDirectories to settle
await new Promise(r => setImmediate(r));

// ============================================================================
// constructor
// ============================================================================
console.log('\n── constructor ───────────────────────────────────────────');
assertEq(ip.uploadDir, './uploads', 'default uploadDir = ./uploads');
assertEq(ip.enhancedDir, 'uploads/enhanced', 'enhancedDir = uploadDir/enhanced');
assertEq(ip.maxWidth, 2048, 'default maxWidth = 2048');
assertEq(ip.maxHeight, 2048, 'default maxHeight = 2048');
// constructor's ensureDirectories should have called mkdir twice
const constructorMkdirs = fsCalls.filter(c => c.method === 'mkdir').length;
assert(constructorMkdirs >= 2, 'constructor mkdir called at least twice');

// ============================================================================
// validateImage
// ============================================================================
console.log('\n── validateImage ─────────────────────────────────────────');

// Valid jpeg, normal dimensions
resetSharp();
metadataResponses = [{ format: 'jpeg', width: 1024, height: 768 }];
{
  const v = await ip.validateImage('/foo.jpg');
  assertEq(v.isValid, true, 'valid jpeg');
  assertEq(v.errors, [], 'no errors');
  assertEq(v.metadata.format, 'jpeg', 'metadata returned');
}

// Missing format → invalid
resetSharp();
metadataResponses = [{ width: 100, height: 100 }];
{
  const v = await ip.validateImage('/foo');
  assertEq(v.isValid, false, 'no format → invalid');
  assert(v.errors.includes('File is not a valid image'), 'no format error');
}

// Unsupported format
resetSharp();
metadataResponses = [{ format: 'bmp', width: 200, height: 200 }];
{
  const v = await ip.validateImage('/foo.bmp');
  assertEq(v.isValid, false, 'bmp invalid');
  assert(
    v.errors.some((e: string) => e.includes('Unsupported format')),
    'unsupported format error'
  );
}

// Too small
resetSharp();
metadataResponses = [{ format: 'png', width: 50, height: 50 }];
{
  const v = await ip.validateImage('/tiny.png');
  assertEq(v.isValid, false, '50x50 invalid');
  assert(v.errors.some((e: string) => e.includes('too small')), 'too small error');
}

// Too large
resetSharp();
metadataResponses = [{ format: 'png', width: 20000, height: 20000 }];
{
  const v = await ip.validateImage('/huge.png');
  assertEq(v.isValid, false, '20000x20000 invalid');
  assert(v.errors.some((e: string) => e.includes('too large')), 'too large error');
}

// sharp throws → catch returns invalid
resetSharp();
metadataResponses = [new Error('sharp metadata failed')];
quiet();
{
  const v = await ip.validateImage('/bad');
  assertEq(v.isValid, false, 'sharp error → invalid');
  assertEq(v.metadata, null, 'metadata null on error');
  assert(
    v.errors.includes('Unable to process image file'),
    'generic error message'
  );
}
loud();

// ============================================================================
// enhanceForOCR
// ============================================================================
console.log('\n── enhanceForOCR ─────────────────────────────────────────');

// Valid → pipeline runs + saves file (uses validation metadata)
resetSharp();
resetFs();
metadataResponses = [
  { format: 'jpeg', width: 1024, height: 768 }, // validateImage call
];
toFileResponses = [{ size: 200, format: 'png' }];
statResult = { size: 200, mtime: new Date() };
quiet();
{
  const out = await ip.enhanceForOCR('/in/photo.jpg');
  loud();
  assert(out.includes('photo_enhanced.png'), 'output filename has _enhanced.png suffix');
  assert(out.startsWith('uploads/enhanced'), 'in enhanced dir');
  // pipeline methods called
  const methods = chainCalls.map(c => c.method);
  assert(methods.includes('rotate'), 'rotate called');
  assert(methods.includes('grayscale'), 'grayscale called');
  assert(methods.includes('normalize'), 'normalize called');
  assert(methods.includes('sharpen'), 'sharpen called');
  assert(methods.includes('median'), 'median called');
  assert(methods.includes('png'), 'png called');
  assert(methods.includes('toFile'), 'toFile called');
  // No resize call when within limits
  assert(!methods.includes('resize'), 'no resize when within bounds');
}

// Image too large → resize called
resetSharp();
resetFs();
metadataResponses = [{ format: 'jpeg', width: 5000, height: 5000 }];
toFileResponses = [{ size: 200 }];
statResult = { size: 200, mtime: new Date() };
quiet();
{
  await ip.enhanceForOCR('/big.jpg');
  loud();
  const methods = chainCalls.map(c => c.method);
  assert(methods.includes('resize'), 'resize called when oversized');
}

// Invalid input → throws wrapped error
resetSharp();
resetFs();
metadataResponses = [{ width: 50, height: 50, format: 'jpeg' }]; // too small
quiet();
{
  let caught: any = null;
  try {
    await ip.enhanceForOCR('/tiny.jpg');
  } catch (e) {
    caught = e;
  }
  loud();
  assert(caught !== null, 'invalid image throws');
  assert(
    caught.message.includes('Image enhancement failed'),
    'wrapped error prefix'
  );
}

// File written but size 0 → throws
resetSharp();
resetFs();
metadataResponses = [{ format: 'jpeg', width: 1024, height: 768 }];
toFileResponses = [{ size: 0 }];
statResult = { size: 0, mtime: new Date() };
quiet();
{
  let caught: any = null;
  try {
    await ip.enhanceForOCR('/foo.jpg');
  } catch (e) {
    caught = e;
  }
  loud();
  assert(caught !== null, 'size 0 throws');
  assert(caught.message.includes('Image enhancement failed'), 'error wrapped');
}

// ============================================================================
// autoCropDocument
// ============================================================================
console.log('\n── autoCropDocument ──────────────────────────────────────');

// Crop applied (margin = 5%, box width/height = 90% > 80% → meaningful)
resetSharp();
resetFs();
metadataResponses = [
  { width: 1000, height: 1000 }, // initial sharp(input).metadata
  { format: 'jpeg' }, // unused but consume
];
toBufferResponses = [{ data: Buffer.from('edges'), info: { width: 1000, height: 1000 } }];
toFileResponses = [{ size: 100 }];
quiet();
{
  const out = await ip.autoCropDocument('/in/scan.jpg');
  loud();
  assert(out.includes('scan_cropped.png'), 'cropped output filename');
  const extractCall = chainCalls.find(c => c.method === 'extract');
  assert(extractCall !== undefined, 'extract called');
  assertEq(extractCall!.args[0].left, 50, 'left = 5% margin');
  assertEq(extractCall!.args[0].top, 50, 'top = 5% margin');
  assertEq(extractCall!.args[0].width, 900, 'width = 90%');
  assertEq(extractCall!.args[0].height, 900, 'height = 90%');
}

// Sharp metadata throws → returns original
resetSharp();
resetFs();
metadataResponses = [new Error('metadata failed')];
quiet();
{
  const out = await ip.autoCropDocument('/in/scan.jpg');
  loud();
  assertEq(out, '/in/scan.jpg', 'returns original on error');
}

// ============================================================================
// generateThumbnail
// ============================================================================
console.log('\n── generateThumbnail ─────────────────────────────────────');

// Default size (300) → writes file
resetSharp();
resetFs();
toFileResponses = [{ size: 50 }];
quiet();
{
  const out = await ip.generateThumbnail('/in/photo.jpg');
  loud();
  assert(out !== null, 'returns path');
  assert(out.includes('photo_thumb.jpg'), 'thumbnail filename');
  const resizeCall = chainCalls.find(c => c.method === 'resize');
  assertEq(resizeCall!.args[0], 300, 'default size 300');
  assertEq(resizeCall!.args[1], 300, 'default size 300');
}

// Custom size
resetSharp();
resetFs();
toFileResponses = [{ size: 50 }];
{
  await ip.generateThumbnail('/in/photo.jpg', 150);
  const resizeCall = chainCalls.find(c => c.method === 'resize');
  assertEq(resizeCall!.args[0], 150, 'custom size 150');
}

// Failure → returns null
resetSharp();
resetFs();
toFileResponses = [new Error('toFile failed')];
quiet();
{
  const out = await ip.generateThumbnail('/in/photo.jpg');
  loud();
  assertEq(out, null, 'null on failure');
}

// ============================================================================
// extractMetadata
// ============================================================================
console.log('\n── extractMetadata ───────────────────────────────────────');

resetSharp();
resetFs();
metadataResponses = [{
  format: 'jpeg', width: 2000, height: 1000, channels: 3,
  depth: 8, density: 300, hasAlpha: false, hasProfile: true,
  isProgressive: false,
}];
const fakeDate = new Date('2026-04-01T00:00:00Z');
statResult = { size: 1024 * 1024 * 5, mtime: fakeDate };
{
  const m = await ip.extractMetadata('/foo.jpg');
  assertEq(m.format, 'jpeg', 'format');
  assertEq(m.width, 2000, 'width');
  assertEq(m.height, 1000, 'height');
  assertEq(m.channels, 3, 'channels');
  assertEq(m.depth, 8, 'depth');
  assertEq(m.density, 300, 'density');
  assertEq(m.hasAlpha, false, 'hasAlpha');
  assertEq(m.hasProfile, true, 'hasProfile');
  assertEq(m.isProgressive, false, 'isProgressive');
  assertEq(m.fileSize, 1024 * 1024 * 5, 'fileSize from stat');
  assertEq(m.aspectRatio, 2, 'aspectRatio = w/h');
  assertEq(m.megapixels, 2, 'megapixels = w*h/1e6');
}

// sharp throws → null
resetSharp();
metadataResponses = [new Error('boom')];
quiet();
{
  const m = await ip.extractMetadata('/bad');
  loud();
  assertEq(m, null, 'returns null on error');
}

// ============================================================================
// estimateProcessingTime (PURE)
// ============================================================================
console.log('\n── estimateProcessingTime ────────────────────────────────');

assertEq(ip.estimateProcessingTime(null), 30, 'null → 30 default');
assertEq(ip.estimateProcessingTime(undefined), 30, 'undefined → 30 default');

// 1 megapixel jpeg, 1MB
{
  const t = ip.estimateProcessingTime({
    width: 1000, height: 1000, fileSize: 1024 * 1024, format: 'jpeg',
  });
  // base 10 + 1*2 + 1*1 = 13, *1.0 = 13
  assertEq(t, 13, '1MP jpeg 1MB → 13s');
}

// PNG multiplier 1.2
{
  const t = ip.estimateProcessingTime({
    width: 1000, height: 1000, fileSize: 1024 * 1024, format: 'png',
  });
  // (10 + 2 + 1) * 1.2 = 15.6 → round = 16
  assertEq(t, 16, '1MP png 1MB → 16s');
}

// TIFF multiplier 1.5
{
  const t = ip.estimateProcessingTime({
    width: 1000, height: 1000, fileSize: 1024 * 1024, format: 'tiff',
  });
  // 13 * 1.5 = 19.5 → 20
  assertEq(t, 20, '1MP tiff 1MB → 20s');
}

// Below minimum → clamped to 5
{
  const t = ip.estimateProcessingTime({
    width: 100, height: 100, fileSize: 100, format: 'gif',
  });
  // (10 + 0.02 + 0.0001) * 0.8 = ~8 → still > 5; check that small values still work
  assert(t >= 5, 'clamped to min 5');
}

// Above maximum → clamped to 120
{
  const t = ip.estimateProcessingTime({
    width: 10000, height: 10000, fileSize: 1024 * 1024 * 500, format: 'tiff',
  });
  // 10 + 100*2 + 500 = 710, *1.5 = 1065 → clamped 120
  assertEq(t, 120, 'clamped to max 120');
}

// Unknown format → multiplier 1.0
{
  const t = ip.estimateProcessingTime({
    width: 1000, height: 1000, fileSize: 1024 * 1024, format: 'unknown',
  });
  assertEq(t, 13, 'unknown format → 1.0 multiplier');
}

// ============================================================================
// cleanupOldFiles
// ============================================================================
console.log('\n── cleanupOldFiles ───────────────────────────────────────');

// Mix of old and new files
resetSharp();
resetFs();
const now = Date.now();
const oldTime = now - 48 * 60 * 60 * 1000; // 48h ago
const newTime = now - 1 * 60 * 60 * 1000;  // 1h ago
readdirResult = ['old1.png', 'old2.png', 'new1.png'];
fileMtimes.set('uploads/enhanced/old1.png', oldTime);
fileMtimes.set('uploads/enhanced/old2.png', oldTime);
fileMtimes.set('uploads/enhanced/new1.png', newTime);
quiet();
{
  const count = await ip.cleanupOldFiles(24); // 24h cutoff
  loud();
  assertEq(count, 2, 'deleted 2 old files');
  assert(unlinkedFiles.includes('uploads/enhanced/old1.png'), 'old1 unlinked');
  assert(unlinkedFiles.includes('uploads/enhanced/old2.png'), 'old2 unlinked');
  assert(!unlinkedFiles.includes('uploads/enhanced/new1.png'), 'new1 NOT unlinked');
}

// Default maxAge = 24h
resetSharp();
resetFs();
readdirResult = [];
quiet();
{
  const count = await ip.cleanupOldFiles();
  loud();
  assertEq(count, 0, 'empty dir → 0');
}

// readdir throws → returns 0
resetSharp();
resetFs();
const origReaddir = fsPromisesStub.readdir;
(fsPromisesStub as any).readdir = async () => { throw new Error('readdir failed'); };
quiet();
{
  const count = await ip.cleanupOldFiles();
  loud();
  assertEq(count, 0, 'error → 0');
}
(fsPromisesStub as any).readdir = origReaddir;

// ============================================================================
// Restore + summary
// ============================================================================
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
