#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/churchValidation.js (OMD-899)
 *
 * Pure module — no DB/fs side effects.
 *
 * Coverage:
 *   - validateChurchData    — required fields, email/phone/website/currency,
 *                             founded_year, timezone, postal+country pair,
 *                             name/description length
 *   - validatePostalCode    — 8 country regex patterns + unknown country
 *   - sanitizeChurchData    — string trim, null normalization, language
 *                             fallback, boolean coercion, defaults
 *   - generateChurchId      — prefix from alphanumerics, X-padding,
 *                             timestamp suffix
 *
 * Run: npx tsx server/src/utils/__tests__/churchValidation.test.ts
 */

const {
  validateChurchData,
  validatePostalCode,
  sanitizeChurchData,
  generateChurchId,
} = require('../churchValidation');

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

// A baseline valid church for spread-overrides
function validData(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    name: 'Saints Peter and Paul Orthodox Church',
    email: 'office@spp.org',
    country: 'United States',
    timezone: 'America/New_York',
    preferred_language: 'en',
    ...overrides,
  };
}

// ============================================================================
// validateChurchData — happy path
// ============================================================================
console.log('\n── validateChurchData: valid input ───────────────────────');

let r = validateChurchData(validData());
assertEq(r.isValid, true, 'baseline valid: isValid');
assertEq(r.errors, {}, 'baseline valid: no errors');
assertEq(r.summary.errorCount, 0, 'baseline valid: errorCount 0');

// language_preference field name also accepted
r = validateChurchData(validData({ preferred_language: undefined, language_preference: 'gr' }));
assertEq(r.isValid, true, 'language_preference field accepted');

// ============================================================================
// validateChurchData — required fields
// ============================================================================
console.log('\n── validateChurchData: required fields ───────────────────');

r = validateChurchData({});
assertEq(r.isValid, false, 'empty: invalid');
assert('name' in r.errors, 'empty: name error');
assert('email' in r.errors, 'empty: email error');
assert('country' in r.errors, 'empty: country error');
assert('timezone' in r.errors, 'empty: timezone error');
assert('language_preference' in r.errors, 'empty: language_preference error');

// Missing name
r = validateChurchData(validData({ name: '' }));
assertEq(r.errors.name, 'name is required', 'missing name message');

// Whitespace-only name
r = validateChurchData(validData({ name: '   ' }));
assertEq(r.errors.name, 'name is required', 'whitespace-only name → required');

// Null required field
r = validateChurchData(validData({ email: null }));
assert('email' in r.errors, 'null email → required error');

// ============================================================================
// validateChurchData — language preference
// ============================================================================
console.log('\n── validateChurchData: language ──────────────────────────');

// Missing
r = validateChurchData(validData({ preferred_language: '' }));
assertEq(r.errors.language_preference, 'Language preference is required', 'missing language');

// Invalid language code
r = validateChurchData(validData({ preferred_language: 'xx' }));
assert(r.errors.language_preference?.startsWith('Invalid language'), 'invalid language code');

// All valid languages accept
const validLangs = ['en', 'gr', 'ru', 'ro', 'es', 'fr', 'de', 'ar', 'he'];
for (const lang of validLangs) {
  r = validateChurchData(validData({ preferred_language: lang }));
  assertEq(r.isValid, true, `valid language: ${lang}`);
}

// ============================================================================
// validateChurchData — email
// ============================================================================
console.log('\n── validateChurchData: email ─────────────────────────────');

// Invalid email formats
const badEmails = ['notanemail', 'foo@', '@bar.com', 'foo@bar', 'foo bar@baz.com'];
for (const email of badEmails) {
  r = validateChurchData(validData({ email }));
  assertEq(r.errors.email, 'Invalid email format', `bad email: ${email}`);
}

// Valid emails
const goodEmails = ['user@example.com', 'a.b@c.d.e', 'tag+name@example.org'];
for (const email of goodEmails) {
  r = validateChurchData(validData({ email }));
  assert(!('email' in r.errors), `good email: ${email}`);
}

// ============================================================================
// validateChurchData — phone (warnings, not errors)
// ============================================================================
console.log('\n── validateChurchData: phone warnings ────────────────────');

// Valid phone (no warning)
r = validateChurchData(validData({ phone: '+1 (555) 123-4567' }));
assertEq(r.warnings.length, 0, 'phone with formatting → no warning');

r = validateChurchData(validData({ phone: '5551234567' }));
assertEq(r.warnings.length, 0, 'plain digits → no warning');

// Invalid phone → warning, not error
r = validateChurchData(validData({ phone: 'abc' }));
assert(r.warnings.length > 0, 'phone "abc" → warning');
assertEq(r.isValid, true, 'phone warning does not invalidate');

// ============================================================================
// validateChurchData — website
// ============================================================================
console.log('\n── validateChurchData: website ───────────────────────────');

r = validateChurchData(validData({ website: 'https://example.com' }));
assert(!('website' in r.errors), 'valid https URL');

r = validateChurchData(validData({ website: 'http://x.org/path' }));
assert(!('website' in r.errors), 'valid http URL with path');

r = validateChurchData(validData({ website: 'not a url' }));
assertEq(r.errors.website, 'Invalid website URL format', 'bad URL → error');

// ============================================================================
// validateChurchData — currency
// ============================================================================
console.log('\n── validateChurchData: currency ──────────────────────────');

const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'RUB', 'RON', 'BGN'];
for (const cur of validCurrencies) {
  r = validateChurchData(validData({ currency: cur }));
  assert(!('currency' in r.errors), `valid currency: ${cur}`);
}

r = validateChurchData(validData({ currency: 'XYZ' }));
assert(r.errors.currency?.startsWith('Invalid currency'), 'XYZ → invalid');

// Currency optional (no field → no error)
r = validateChurchData(validData());
assert(!('currency' in r.errors), 'currency optional');

// ============================================================================
// validateChurchData — founded year
// ============================================================================
console.log('\n── validateChurchData: founded_year ──────────────────────');

const currentYear = new Date().getFullYear();

// Valid years
r = validateChurchData(validData({ founded_year: 1850 }));
assert(!('founded_year' in r.errors), 'year 1850 valid');
r = validateChurchData(validData({ founded_year: 50 }));
assert(!('founded_year' in r.errors), 'year 50 (lower bound) valid');
r = validateChurchData(validData({ founded_year: currentYear }));
assert(!('founded_year' in r.errors), 'current year valid');

// Year too low
r = validateChurchData(validData({ founded_year: 49 }));
assert('founded_year' in r.errors, 'year 49 invalid');

// Year too high
r = validateChurchData(validData({ founded_year: currentYear + 1 }));
assert('founded_year' in r.errors, 'future year invalid');

// String year that parses
r = validateChurchData(validData({ founded_year: '1900' }));
assert(!('founded_year' in r.errors), 'string "1900" parses valid');

// Non-numeric string
r = validateChurchData(validData({ founded_year: 'abc' }));
assert('founded_year' in r.errors, 'non-numeric year invalid');

// ============================================================================
// validateChurchData — timezone
// ============================================================================
console.log('\n── validateChurchData: timezone ──────────────────────────');

r = validateChurchData(validData({ timezone: 'America/New_York' }));
assert(!('timezone' in r.errors), 'America/New_York valid');

r = validateChurchData(validData({ timezone: 'Europe/Athens' }));
assert(!('timezone' in r.errors), 'Europe/Athens valid');

r = validateChurchData(validData({ timezone: 'UTC' }));
assert(!('timezone' in r.errors), 'UTC valid');

r = validateChurchData(validData({ timezone: 'America/New York' }));
assert('timezone' in r.errors, 'space in timezone invalid');

r = validateChurchData(validData({ timezone: 'Asia/Tokyo123' }));
assert('timezone' in r.errors, 'digits in timezone invalid');

// ============================================================================
// validateChurchData — postal code
// ============================================================================
console.log('\n── validateChurchData: postal+country ────────────────────');

r = validateChurchData(validData({ postal_code: '10001' }));
assertEq(r.warnings.length, 0, 'valid US postal');

r = validateChurchData(validData({ postal_code: '10001-1234' }));
assertEq(r.warnings.length, 0, 'US zip+4');

r = validateChurchData(validData({ postal_code: 'INVALID' }));
assert(r.warnings.length > 0, 'invalid US postal → warning');
assertEq(r.isValid, true, 'postal warning does not invalidate');

// Postal without country → not validated (no warning)
r = validateChurchData({ ...validData(), country: undefined, postal_code: 'XYZ' });
// country is required so this still fails on country, but postal won't trigger
assert(!('postal_code' in r.errors), 'no postal error');

// ============================================================================
// validateChurchData — length limits
// ============================================================================
console.log('\n── validateChurchData: length limits ─────────────────────');

// Name length boundary
r = validateChurchData(validData({ name: 'A'.repeat(255) }));
assert(!('name' in r.errors), 'name 255 chars valid');

r = validateChurchData(validData({ name: 'A'.repeat(256) }));
assertEq(r.errors.name, 'Church name must be less than 255 characters', 'name 256 invalid');

// Description length
r = validateChurchData(validData({ description: 'D'.repeat(2000) }));
assert(!('description' in r.errors), 'description 2000 chars valid');

r = validateChurchData(validData({ description: 'D'.repeat(2001) }));
assertEq(r.errors.description, 'Description must be less than 2000 characters', 'description 2001 invalid');

// ============================================================================
// validateChurchData — summary structure
// ============================================================================
console.log('\n── validateChurchData: summary ───────────────────────────');

r = validateChurchData({});
assert(typeof r.summary === 'object', 'summary is object');
assertEq(typeof r.summary.errorCount, 'number', 'errorCount is number');
assertEq(typeof r.summary.warningCount, 'number', 'warningCount is number');
assertEq(r.summary.errorCount, Object.keys(r.errors).length, 'errorCount matches errors');
assertEq(r.summary.warningCount, r.warnings.length, 'warningCount matches warnings');

// ============================================================================
// validatePostalCode
// ============================================================================
console.log('\n── validatePostalCode: per country ───────────────────────');

// United States
let p = validatePostalCode('10001', 'United States');
assertEq(p.isValid, true, 'US 10001 valid');
p = validatePostalCode('10001-1234', 'United States');
assertEq(p.isValid, true, 'US zip+4 valid');
p = validatePostalCode('1000', 'United States');
assertEq(p.isValid, false, 'US 1000 (4 digits) invalid');
p = validatePostalCode('ABCDE', 'United States');
assertEq(p.isValid, false, 'US letters invalid');

// Canada
p = validatePostalCode('K1A 0B1', 'Canada');
assertEq(p.isValid, true, 'Canada K1A 0B1 valid');
p = validatePostalCode('K1A0B1', 'Canada');
assertEq(p.isValid, true, 'Canada no space valid');
p = validatePostalCode('k1a 0b1', 'Canada');
assertEq(p.isValid, true, 'Canada lowercase valid');
p = validatePostalCode('12345', 'Canada');
assertEq(p.isValid, false, 'Canada digits invalid');

// United Kingdom
p = validatePostalCode('SW1A 1AA', 'United Kingdom');
assertEq(p.isValid, true, 'UK SW1A 1AA valid');
p = validatePostalCode('M1 1AE', 'United Kingdom');
assertEq(p.isValid, true, 'UK M1 1AE valid');
p = validatePostalCode('12345', 'United Kingdom');
assertEq(p.isValid, false, 'UK digits invalid');

// Germany / France (5 digits)
p = validatePostalCode('10115', 'Germany');
assertEq(p.isValid, true, 'Germany 10115 valid');
p = validatePostalCode('1234', 'Germany');
assertEq(p.isValid, false, 'Germany 4 digits invalid');

p = validatePostalCode('75001', 'France');
assertEq(p.isValid, true, 'France 75001 valid');

// Greece
p = validatePostalCode('123 45', 'Greece');
assertEq(p.isValid, true, 'Greece 123 45 valid');
p = validatePostalCode('12345', 'Greece');
assertEq(p.isValid, true, 'Greece 12345 valid');
p = validatePostalCode('1234', 'Greece');
assertEq(p.isValid, false, 'Greece 1234 invalid');

// Romania (6 digits)
p = validatePostalCode('010101', 'Romania');
assertEq(p.isValid, true, 'Romania 6 digits valid');
p = validatePostalCode('10101', 'Romania');
assertEq(p.isValid, false, 'Romania 5 digits invalid');

// Russia (6 digits)
p = validatePostalCode('101000', 'Russia');
assertEq(p.isValid, true, 'Russia 101000 valid');

// Unknown country → permissive (valid)
p = validatePostalCode('ANYTHING', 'Mars');
assertEq(p.isValid, true, 'unknown country: permissive');
assert(p.message.includes('not validated'), 'unknown country: explanatory message');

// ============================================================================
// sanitizeChurchData
// ============================================================================
console.log('\n── sanitizeChurchData ────────────────────────────────────');

// String trim
let s = sanitizeChurchData({ name: '  Trinity  ' });
assertEq(s.name, 'Trinity', 'name trimmed');

// Empty string → null
s = sanitizeChurchData({ name: '   ' });
assertEq(s.name, null, 'whitespace-only → null');

s = sanitizeChurchData({ name: '' });
assertEq(s.name, null, 'empty → null');

// Undefined fields → null
s = sanitizeChurchData({});
assertEq(s.name, null, 'undefined name → null');
assertEq(s.email, null, 'undefined email → null');
assertEq(s.address, null, 'undefined address → null');

// Null preserved as null
s = sanitizeChurchData({ name: null });
assertEq(s.name, null, 'null → null');

// Coerce non-strings to string
s = sanitizeChurchData({ name: 12345 });
assertEq(s.name, '12345', 'number coerced to string');

// Language preference fallback chain
s = sanitizeChurchData({ preferred_language: 'gr' });
assertEq(s.language_preference, 'gr', 'preferred_language → language_preference');

s = sanitizeChurchData({ language_preference: 'ru' });
assertEq(s.language_preference, 'ru', 'language_preference passthrough');

s = sanitizeChurchData({ preferred_language: 'gr', language_preference: 'ru' });
assertEq(s.language_preference, 'gr', 'preferred_language wins over language_preference');

s = sanitizeChurchData({});
assertEq(s.language_preference, 'en', 'no language → en default');

s = sanitizeChurchData({ preferred_language: '   ' });
assertEq(s.language_preference, 'en', 'whitespace language → en default (after trim → empty → "" || en)');

// Founded year parsing
s = sanitizeChurchData({ founded_year: '1900' });
assertEq(s.founded_year, 1900, 'string "1900" → 1900');

s = sanitizeChurchData({ founded_year: 1900 });
assertEq(s.founded_year, 1900, 'number 1900 → 1900');

s = sanitizeChurchData({ founded_year: 'not a number' });
assertEq(s.founded_year, null, 'non-numeric year → null');

s = sanitizeChurchData({});
assertEq(s.founded_year, null, 'no founded_year → null');

// Boolean is_active
s = sanitizeChurchData({ is_active: true });
assertEq(s.is_active, true, 'is_active true');

s = sanitizeChurchData({ is_active: false });
assertEq(s.is_active, false, 'is_active false');

s = sanitizeChurchData({ is_active: 1 });
assertEq(s.is_active, true, 'is_active 1 → true');

s = sanitizeChurchData({ is_active: 0 });
assertEq(s.is_active, false, 'is_active 0 → false');

s = sanitizeChurchData({});
assertEq(s.is_active, true, 'is_active default true');

// Timezone default
s = sanitizeChurchData({});
assertEq(s.timezone, 'UTC', 'timezone default UTC');

s = sanitizeChurchData({ timezone: 'America/Chicago' });
assertEq(s.timezone, 'America/Chicago', 'timezone preserved');

// Currency default
s = sanitizeChurchData({});
assertEq(s.currency, 'USD', 'currency default USD');

s = sanitizeChurchData({ currency: 'EUR' });
assertEq(s.currency, 'EUR', 'currency preserved');

// Full sanitization round-trip
s = sanitizeChurchData({
  name: '  Saints Peter and Paul  ',
  email: '  office@spp.org  ',
  phone: '555-1234',
  founded_year: '1950',
  preferred_language: 'gr',
  is_active: false,
});
assertEq(s.name, 'Saints Peter and Paul', 'roundtrip: name');
assertEq(s.email, 'office@spp.org', 'roundtrip: email');
assertEq(s.phone, '555-1234', 'roundtrip: phone');
assertEq(s.founded_year, 1950, 'roundtrip: founded_year');
assertEq(s.language_preference, 'gr', 'roundtrip: language_preference');
assertEq(s.is_active, false, 'roundtrip: is_active');
assertEq(s.timezone, 'UTC', 'roundtrip: timezone default');
assertEq(s.currency, 'USD', 'roundtrip: currency default');

// ============================================================================
// generateChurchId
// ============================================================================
console.log('\n── generateChurchId ──────────────────────────────────────');

let id = generateChurchId('Saints Peter and Paul');
assert(/^[A-Z0-9]{6}_\d{3}$/.test(id), `format PREFIX_NNN: ${id}`);
assertEq(id.split('_')[0], 'SAINTS', 'prefix SAINTS (first 6 alphanumerics)');

id = generateChurchId('St. Mary');
assertEq(id.split('_')[0], 'STMARY', 'St. Mary → STMARY (punctuation stripped)');

// Pad with X if too short
id = generateChurchId('St');
assertEq(id.split('_')[0], 'STXXXX', 'St → STXXXX (padded with X)');

id = generateChurchId('A');
assertEq(id.split('_')[0], 'AXXXXX', 'A → AXXXXX');

id = generateChurchId('');
assertEq(id.split('_')[0], 'XXXXXX', 'empty → XXXXXX');

// Special chars stripped
id = generateChurchId('!@#$%^&*()');
assertEq(id.split('_')[0], 'XXXXXX', 'all-special → XXXXXX');

// Numbers preserved
id = generateChurchId('Church 123');
assertEq(id.split('_')[0], 'CHURCH', 'Church 123 → CHURCH (first 6)');

id = generateChurchId('123ABC');
assertEq(id.split('_')[0], '123ABC', 'numbers + letters preserved');

// Long names truncated
id = generateChurchId('Verylongchurchname');
assertEq(id.split('_')[0], 'VERYLO', 'long name truncated to 6');

// Suffix is last 3 of timestamp
id = generateChurchId('Trinity');
assert(/^\d{3}$/.test(id.split('_')[1]), 'suffix is 3 digits');

// Two consecutive calls likely produce different suffix (timing-dependent — sanity check format only)
const id1 = generateChurchId('Test');
const id2 = generateChurchId('Test');
assert(id1.startsWith('TESTXX_') && id2.startsWith('TESTXX_'), 'both have same prefix');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
