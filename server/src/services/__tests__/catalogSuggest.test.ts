#!/usr/bin/env npx tsx
/**
 * Unit tests for services/catalogSuggest.js (OMD-963)
 *
 * Pure pattern-matching logic — excellent test target.
 *
 * Strategy:
 *   - Use a real temp dir for the images root so fs.existsSync/readFileSync
 *     work naturally against actual files.
 *   - Stub `./publicImagesFs` via require.cache BEFORE requiring the SUT to
 *     inject getImagesRoot() and sanitizeFilename().
 *
 * Coverage:
 *   - loadCustomRules: missing file → [], valid JSON array → rules,
 *     non-array JSON → [], malformed JSON → [] (error swallowed)
 *   - suggestDestination: all 7 DEFAULT_HEURISTICS
 *     (banner/logo/bg|background/pattern/icon/avatar|profile/thumbnail|thumb);
 *     confidence boost when currentDir matches suggestedDir; empty-match
 *     fallback to 'gallery'; confidence sort (best-first); sanitizeFilename
 *     used for suggestedName; custom rule merge-in
 *   - suggestDestinations: non-array → []; array mapping; name fallback
 *     from path.split('/').pop(); empty → 'unknown'
 *
 * Run: npx tsx server/src/services/__tests__/catalogSuggest.test.ts
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

function assertNear(actual: number, expected: number, tol: number, message: string): void {
  if (Math.abs(actual - expected) <= tol) {
    console.log(`  PASS: ${message}`); passed++;
  } else {
    console.error(`  FAIL: ${message}\n         expected: ~${expected} (±${tol})\n         actual:   ${actual}`);
    failed++;
  }
}

// ── Temp images root ─────────────────────────────────────────────────
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-suggest-test-'));
const rulesFile = path.join(tmpRoot, '.catalog-rules.json');

function writeRules(content: string | null): void {
  if (content === null) {
    if (fs.existsSync(rulesFile)) fs.unlinkSync(rulesFile);
  } else {
    fs.writeFileSync(rulesFile, content, 'utf8');
  }
}

// ── publicImagesFs stub ──────────────────────────────────────────────
const sanitizeCalls: Array<{ name: string; mode: string }> = [];
const publicImagesFsStub = {
  getImagesRoot: () => tmpRoot,
  sanitizeFilename: (name: string, mode: string) => {
    sanitizeCalls.push({ name, mode });
    // Return a simple slug transform for verification
    return name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
  },
};

const pifPath = require.resolve('../publicImagesFs');
require.cache[pifPath] = {
  id: pifPath,
  filename: pifPath,
  loaded: true,
  exports: publicImagesFsStub,
} as any;

// Silence console.warn (loadCustomRules warns on parse error)
const origWarn = console.warn;
function quiet() { console.warn = () => {}; }
function loud() { console.warn = origWarn; }

const {
  suggestDestination,
  suggestDestinations,
  loadCustomRules,
} = require('../catalogSuggest');

// ============================================================================
// loadCustomRules
// ============================================================================
console.log('\n── loadCustomRules ───────────────────────────────────────');

// No file → []
writeRules(null);
{
  const rules = loadCustomRules();
  assertEq(rules, [], 'missing file → []');
}

// Valid JSON array
writeRules(JSON.stringify([
  { pattern: 'hero', suggestedDir: 'heroes', confidence: 0.9, reason: 'hero image' },
  { pattern: 'footer', suggestedDir: 'footers', confidence: 0.85, reason: 'footer image' },
]));
{
  const rules = loadCustomRules();
  assertEq(rules.length, 2, 'valid JSON → 2 rules');
  assertEq(rules[0].suggestedDir, 'heroes', 'first rule dir');
  assertEq(rules[1].suggestedDir, 'footers', 'second rule dir');
}

// Non-array JSON (object) → []
writeRules(JSON.stringify({ pattern: 'x', suggestedDir: 'y' }));
{
  const rules = loadCustomRules();
  assertEq(rules, [], 'non-array JSON → []');
}

// Non-array JSON (string) → []
writeRules(JSON.stringify('not an array'));
{
  const rules = loadCustomRules();
  assertEq(rules, [], 'string JSON → []');
}

// Malformed JSON → [] (error swallowed)
writeRules('{ this is not valid json');
quiet();
{
  const rules = loadCustomRules();
  loud();
  assertEq(rules, [], 'malformed JSON → [] (error swallowed)');
}

// Cleanup
writeRules(null);

// ============================================================================
// suggestDestination — DEFAULT_HEURISTICS (all 7 patterns)
// ============================================================================
console.log('\n── suggestDestination: default patterns ──────────────────');

writeRules(null); // ensure no custom rules interfere

// banner
{
  const s = suggestDestination('uploads/main-banner.png', 'main-banner.png');
  assertEq(s.suggestedDir, 'banners', 'banner → banners');
  assertNear(s.confidence, 0.8, 0.001, 'banner confidence 0.8');
  assertEq(s.path, 'uploads/main-banner.png', 'path preserved');
  assert(Array.isArray(s.reasons), 'reasons is array');
  assert(s.reasons[0].toLowerCase().includes('banner'), 'reason mentions banner');
}

// logo
{
  const s = suggestDestination('misc/brand-LOGO.svg', 'brand-LOGO.svg');
  assertEq(s.suggestedDir, 'logos', 'logo → logos (case-insensitive)');
  assertNear(s.confidence, 0.8, 0.001, 'logo confidence 0.8');
}

// bg
{
  const s = suggestDestination('assets/hero-bg.jpg', 'hero-bg.jpg');
  assertEq(s.suggestedDir, 'backgrounds', 'bg → backgrounds');
  assertNear(s.confidence, 0.7, 0.001, 'bg confidence 0.7');
}

// background (full word)
{
  const s = suggestDestination('assets/page-background.jpg', 'page-background.jpg');
  assertEq(s.suggestedDir, 'backgrounds', 'background → backgrounds');
}

// pattern
{
  const s = suggestDestination('tile/pattern-01.png', 'pattern-01.png');
  assertEq(s.suggestedDir, 'patterns', 'pattern → patterns');
  assertNear(s.confidence, 0.7, 0.001, 'pattern confidence 0.7');
}

// icon
{
  const s = suggestDestination('svg/save-icon.svg', 'save-icon.svg');
  assertEq(s.suggestedDir, 'icons', 'icon → icons');
  assertNear(s.confidence, 0.8, 0.001, 'icon confidence 0.8');
}

// avatar
{
  const s = suggestDestination('users/avatar-42.png', 'avatar-42.png');
  assertEq(s.suggestedDir, 'avatars', 'avatar → avatars');
  assertNear(s.confidence, 0.7, 0.001, 'avatar confidence 0.7');
}

// profile (alias for avatar)
{
  const s = suggestDestination('users/profile-pic.png', 'profile-pic.png');
  assertEq(s.suggestedDir, 'avatars', 'profile → avatars');
}

// thumbnail
{
  const s = suggestDestination('gallery/img-thumbnail.jpg', 'img-thumbnail.jpg');
  assertEq(s.suggestedDir, 'thumbnails', 'thumbnail → thumbnails');
  assertNear(s.confidence, 0.7, 0.001, 'thumbnail confidence 0.7');
}

// thumb (short)
{
  const s = suggestDestination('gallery/img-thumb.jpg', 'img-thumb.jpg');
  assertEq(s.suggestedDir, 'thumbnails', 'thumb → thumbnails');
}

// ============================================================================
// suggestDestination — confidence boost when currentDir matches
// ============================================================================
console.log('\n── suggestDestination: currentDir confidence boost ───────');

// Image already in the suggested dir → +0.2 boost (capped at 1.0)
{
  const s = suggestDestination('banners/top-banner.png', 'top-banner.png');
  assertEq(s.suggestedDir, 'banners', 'still banners');
  assertNear(s.confidence, 1.0, 0.001, 'banner (0.8) + 0.2 boost = 1.0');
}

// Cap at 1.0 (not 1.0001+)
{
  const s = suggestDestination('icons/save-icon.svg', 'save-icon.svg');
  assertNear(s.confidence, 1.0, 0.001, 'icon (0.8) + 0.2 = 1.0 (capped)');
}

// Partial dir match (substring): currentDir 'my-banners-dir' contains 'banners'
{
  const s = suggestDestination('my-banners-dir/top.png', 'top-banner.png');
  assertEq(s.suggestedDir, 'banners', 'substring match triggers boost');
  assertNear(s.confidence, 1.0, 0.001, 'substring boost applied');
}

// No boost when currentDir unrelated
{
  const s = suggestDestination('random/foo-logo.png', 'foo-logo.png');
  assertNear(s.confidence, 0.8, 0.001, 'logo in unrelated dir → 0.8 (no boost)');
}

// ============================================================================
// suggestDestination — no-match fallback
// ============================================================================
console.log('\n── suggestDestination: no-match fallback ─────────────────');

// No patterns match → fallback to currentDir
{
  const s = suggestDestination('uploads/subdir/random123.png', 'random123.png');
  assertEq(s.suggestedDir, 'uploads/subdir', 'falls back to currentDir');
  assertEq(s.suggestedName, 'random123.png', 'preserves original name on fallback');
  assertNear(s.confidence, 0.3, 0.001, 'fallback confidence 0.3');
  assertEq(s.reasons, ['No matching patterns found'], 'fallback reason');
  assertEq(s.path, 'uploads/subdir/random123.png', 'path preserved on fallback');
}

// Empty path + no match → 'gallery' fallback
{
  const s = suggestDestination('', 'random123.png');
  // path.dirname('') === '.' which is truthy → suggestedDir = '.'
  // To actually hit 'gallery' we'd need dirname to return falsy.
  // Node's path.dirname('') returns '.' — verify behavior
  assert(s.suggestedDir === '.' || s.suggestedDir === 'gallery', 'fallback dir for empty path');
  assertNear(s.confidence, 0.3, 0.001, 'fallback confidence');
}

// ============================================================================
// suggestDestination — confidence sort (best first)
// ============================================================================
console.log('\n── suggestDestination: multiple matches sort ─────────────');

// 'icon-banner.png' matches BOTH icon (0.8) and banner (0.8). Both tied.
// Without boost, first-matched (icon) or banner wins depending on rule order.
// Rules in order: banner, logo, bg, pattern, icon, avatar, thumbnail
// So banner tested first, then icon. Both 0.8. Sort is stable → banner wins.
{
  const s = suggestDestination('misc/icon-banner.png', 'icon-banner.png');
  assertEq(s.suggestedDir, 'banners', 'banner wins tie (rule order)');
  assertEq(s.reasons.length, 2, 'both reasons captured');
}

// Place in 'icons/' → icon gets +0.2 boost (1.0), banner stays 0.8 → icon wins
{
  const s = suggestDestination('icons/icon-banner.png', 'icon-banner.png');
  assertEq(s.suggestedDir, 'icons', 'icon wins via currentDir boost');
  assertNear(s.confidence, 1.0, 0.001, 'boosted to 1.0');
}

// ============================================================================
// suggestDestination — sanitizeFilename called for suggestedName
// ============================================================================
console.log('\n── suggestDestination: sanitizeFilename ──────────────────');

sanitizeCalls.length = 0;
{
  const s = suggestDestination('uploads/My Banner File.PNG', 'My Banner File.PNG');
  assertEq(s.suggestedDir, 'banners', 'matched banner');
  assertEq(sanitizeCalls.length, 1, 'sanitizeFilename called once');
  assertEq(sanitizeCalls[0].name, 'My Banner File.PNG', 'sanitize got filename');
  assertEq(sanitizeCalls[0].mode, 'slug', 'sanitize mode = slug');
  assertEq(s.suggestedName, 'my-banner-file.png', 'sanitized name in result');
}

// Non-matching path: fallback path does NOT call sanitizeFilename
sanitizeCalls.length = 0;
{
  const s = suggestDestination('zzz/random123.png', 'random123.png');
  assertEq(sanitizeCalls.length, 0, 'sanitize NOT called on fallback');
  assertEq(s.suggestedName, 'random123.png', 'name preserved');
}

// ============================================================================
// suggestDestination — custom rules merge
// ============================================================================
console.log('\n── suggestDestination: custom rules merge ────────────────');

// Custom rule with string pattern (SUT converts to RegExp)
writeRules(JSON.stringify([
  { pattern: 'hero', suggestedDir: 'heroes', confidence: 0.95, reason: 'hero banner' },
]));
{
  const s = suggestDestination('uploads/hero-shot.jpg', 'hero-shot.jpg');
  assertEq(s.suggestedDir, 'heroes', 'custom rule applied');
  assertNear(s.confidence, 0.95, 0.001, 'custom confidence');
}

// Custom rule missing optional fields → defaults
writeRules(JSON.stringify([
  { pattern: 'widget', directory: 'widgets' }, // no confidence, no reason, uses `directory`
]));
{
  const s = suggestDestination('uploads/widget-01.png', 'widget-01.png');
  assertEq(s.suggestedDir, 'widgets', 'uses rule.directory when suggestedDir absent');
  assertNear(s.confidence, 0.5, 0.001, 'default confidence 0.5');
  assert(s.reasons.includes('Matches pattern'), 'default reason "Matches pattern"');
}

// Custom rule with `description` instead of `reason`
writeRules(JSON.stringify([
  { pattern: 'promo', suggestedDir: 'promos', confidence: 0.6, description: 'promotional material' },
]));
{
  const s = suggestDestination('uploads/promo-xmas.jpg', 'promo-xmas.jpg');
  assert(s.reasons.includes('promotional material'), 'uses rule.description when reason absent');
}

// Custom rule outranks default
writeRules(JSON.stringify([
  { pattern: 'banner', suggestedDir: 'super-banners', confidence: 0.99, reason: 'override' },
]));
{
  const s = suggestDestination('uploads/top-banner.png', 'top-banner.png');
  assertEq(s.suggestedDir, 'super-banners', 'custom outranks default on confidence');
  assertNear(s.confidence, 0.99, 0.001, '0.99 > 0.8');
  assertEq(s.reasons.length, 2, 'both reasons captured');
}

// Cleanup
writeRules(null);

// ============================================================================
// suggestDestinations
// ============================================================================
console.log('\n── suggestDestinations ───────────────────────────────────');

// Non-array → []
assertEq(suggestDestinations(null as any), [], 'null → []');
assertEq(suggestDestinations(undefined as any), [], 'undefined → []');
assertEq(suggestDestinations('string' as any), [], 'string → []');
assertEq(suggestDestinations({} as any), [], 'object → []');

// Array mapping
{
  const results = suggestDestinations([
    { path: 'uploads/brand-logo.png', name: 'brand-logo.png' },
    { path: 'uploads/hero-banner.jpg', name: 'hero-banner.jpg' },
    { path: 'uploads/random.png', name: 'random.png' },
  ]);
  assertEq(results.length, 3, 'three results');
  assertEq(results[0].suggestedDir, 'logos', 'result[0] = logos');
  assertEq(results[1].suggestedDir, 'banners', 'result[1] = banners');
  assertEq(results[2].suggestedDir, 'uploads', 'result[2] = currentDir fallback');
}

// Empty array → empty results
assertEq(suggestDestinations([]), [], 'empty array → []');

// Name fallback: derives from path.split('/').pop()
{
  const results = suggestDestinations([
    { path: 'a/b/c/banner.png' }, // no name
  ]);
  assertEq(results.length, 1, 'one result');
  assertEq(results[0].suggestedDir, 'banners', 'matched banner via derived name');
}

// Both path and name missing → 'unknown'
{
  const results = suggestDestinations([{}]);
  assertEq(results.length, 1, 'one result from empty obj');
  // path = '', name = 'unknown' (''.split('/').pop() === '' which is falsy → 'unknown')
  // 'unknown' does not match any default pattern → fallback
  assertNear(results[0].confidence, 0.3, 0.001, 'empty obj → fallback confidence');
}

// Mixed shapes
{
  const results = suggestDestinations([
    { path: 'icons/save.svg', name: 'save-icon.svg' },
    { name: 'profile.png' }, // no path
  ]);
  assertEq(results.length, 2, 'two results mixed');
  assertEq(results[0].suggestedDir, 'icons', 'icons dir + icon name');
  assertEq(results[1].suggestedDir, 'avatars', 'profile → avatars');
}

// ============================================================================
// Cleanup + summary
// ============================================================================
try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}

console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
