#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/churchValidation.js (OMD-891)
 *
 * Pure validation/sanitization helpers — no DB, no I/O.
 * Covers all 4 exports:
 *   - validateChurchData
 *   - validatePostalCode
 *   - sanitizeChurchData
 *   - generateChurchId
 *
 * Run: npx tsx server/src/utils/__tests__/churchValidation.test.ts
 *
 * Exits non-zero on any failure.
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

// Helper for valid baseline data
function validData(): Record<string, any> {
  return {
    name: 'Holy Trinity Church',
    email: 'info@holytrinity.org',
    country: 'United States',
    timezone: 'America/New_York',
    preferred_language: 'en',
  };
}

// ============================================================================
// validateChurchData — required fields
// ============================================================================
console.log('\n── validateChurchData: required fields ───────────────────');

const ok = validateChurchData(validData());
assertEq(ok.isValid, true, 'baseline valid → isValid=true');
assertEq(ok.errors, {}, 'baseline → no errors');
assertEq(ok.warnings, [], 'baseline → no warnings');
assertEq(ok.summary.errorCount, 0, 'summary.errorCount=0');
assertEq(ok.summary.warningCount, 0, 'summary.warningCount=0');

// Missing each required field
const noName = validateChurchData({ ...validData(), name: '' });
assertEq(noName.isValid, false, 'empty name → invalid');
assert(typeof noName.errors.name === 'string', 'name error present');

const noEmail = validateChurchData({ ...validData(), email: '' });
assertEq(noEmail.isValid, false, 'empty email → invalid');

const noCountry = validateChurchData({ ...validData(), country: '' });
assertEq(noCountry.isValid, false, 'empty country → invalid');

const noTz = validateChurchData({ ...validData(), timezone: '' });
assertEq(noTz.isValid, false, 'empty timezone → invalid');

const undefField = validateChurchData({ name: undefined, email: 'a@b.c', country: 'X', timezone: 'UTC', preferred_language: 'en' });
assertEq(undefField.isValid, false, 'undefined name → invalid');

const whitespaceOnly = validateChurchData({ ...validData(), name: '   ' });
assertEq(whitespaceOnly.isValid, false, 'whitespace-only name → invalid');

// ============================================================================
// validateChurchData — language preference
// ============================================================================
console.log('\n── validateChurchData: language preference ───────────────');

const langMissing = validateChurchData({ ...validData(), preferred_language: undefined });
assertEq(langMissing.isValid, false, 'missing language → invalid');
assert(typeof langMissing.errors.language_preference === 'string', 'language error key');

const langInvalid = validateChurchData({ ...validData(), preferred_language: 'xx' });
assertEq(langInvalid.isValid, false, 'invalid language code → invalid');
assert(langInvalid.errors.language_preference.includes('Invalid language'), 'error mentions Invalid language');

// language_preference field name (alternate)
const langAlt = validateChurchData({
  name: 'Test', email: 'a@b.c', country: 'X', timezone: 'UTC',
  language_preference: 'gr',
});
assertEq(langAlt.isValid, true, 'language_preference (alt name) accepted');

// All valid languages
const validLangs = ['en', 'gr', 'ru', 'ro', 'es', 'fr', 'de', 'ar', 'he'];
for (const l of validLangs) {
  const r = validateChurchData({ ...validData(), preferred_language: l });
  assertEq(r.isValid, true, `language ${l} accepted`);
}

// ============================================================================
// validateChurchData — email
// ============================================================================
console.log('\n── validateChurchData: email format ──────────────────────');

const badEmails = ['notanemail', 'no@dot', '@nodomain.com', 'spaces in@email.com', 'no@.com'];
for (const e of badEmails) {
  const r = validateChurchData({ ...validData(), email: e });
  assertEq(r.isValid, false, `bad email "${e}" → invalid`);
}

const goodEmails = ['a@b.c', 'foo.bar@example.co.uk', 'user+tag@host.org'];
for (const e of goodEmails) {
  const r = validateChurchData({ ...validData(), email: e });
  assertEq(r.isValid, true, `good email "${e}" → valid`);
}

// ============================================================================
// validateChurchData — phone (warning, not error)
// ============================================================================
console.log('\n── validateChurchData: phone (warning) ───────────────────');

const goodPhone = validateChurchData({ ...validData(), phone: '+1 (555) 123-4567' });
assertEq(goodPhone.isValid, true, 'good phone → still valid');
assertEq(goodPhone.warnings.length, 0, 'good phone → no warning');

const badPhone = validateChurchData({ ...validData(), phone: 'abc-def' });
assertEq(badPhone.isValid, true, 'bad phone → still valid (warning only)');
assert(badPhone.warnings.length > 0, 'bad phone → warning emitted');
assert(badPhone.warnings[0].includes('Phone'), 'phone warning text');

// ============================================================================
// validateChurchData — website URL
// ============================================================================
console.log('\n── validateChurchData: website ───────────────────────────');

const goodSite = validateChurchData({ ...validData(), website: 'https://example.org' });
assertEq(goodSite.isValid, true, 'valid URL → valid');

const badSite = validateChurchData({ ...validData(), website: 'not a url' });
assertEq(badSite.isValid, false, 'invalid URL → invalid');
assert(typeof badSite.errors.website === 'string', 'website error present');

// ============================================================================
// validateChurchData — currency
// ============================================================================
console.log('\n── validateChurchData: currency ──────────────────────────');

const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'RUB', 'RON', 'BGN'];
for (const c of validCurrencies) {
  const r = validateChurchData({ ...validData(), currency: c });
  assertEq(r.isValid, true, `currency ${c} accepted`);
}

const badCurrency = validateChurchData({ ...validData(), currency: 'XXX' });
assertEq(badCurrency.isValid, false, 'unknown currency → invalid');

// Empty currency: skipped (not required)
const emptyCurrency = validateChurchData({ ...validData(), currency: '' });
assertEq(emptyCurrency.isValid, true, 'empty currency → not validated (optional)');

// ============================================================================
// validateChurchData — founded year
// ============================================================================
console.log('\n── validateChurchData: founded_year ──────────────────────');

const currentYear = new Date().getFullYear();

const goodYear = validateChurchData({ ...validData(), founded_year: 1850 });
assertEq(goodYear.isValid, true, 'year 1850 → valid');

const yearJustRight = validateChurchData({ ...validData(), founded_year: 50 });
assertEq(yearJustRight.isValid, true, 'year 50 (boundary) → valid');

const yearCurrent = validateChurchData({ ...validData(), founded_year: currentYear });
assertEq(yearCurrent.isValid, true, 'year currentYear (boundary) → valid');

const yearTooEarly = validateChurchData({ ...validData(), founded_year: 49 });
assertEq(yearTooEarly.isValid, false, 'year 49 → invalid');

const yearFuture = validateChurchData({ ...validData(), founded_year: currentYear + 1 });
assertEq(yearFuture.isValid, false, 'future year → invalid');

const yearNaN = validateChurchData({ ...validData(), founded_year: 'abc' });
assertEq(yearNaN.isValid, false, 'non-numeric year → invalid');

// ============================================================================
// validateChurchData — timezone format
// ============================================================================
console.log('\n── validateChurchData: timezone format ───────────────────');

const tzGood = validateChurchData({ ...validData(), timezone: 'Europe/Athens' });
assertEq(tzGood.isValid, true, 'Europe/Athens valid');

const tzGood2 = validateChurchData({ ...validData(), timezone: 'UTC' });
assertEq(tzGood2.isValid, true, 'UTC valid');

const tzBad = validateChurchData({ ...validData(), timezone: 'America/New York' });
assertEq(tzBad.isValid, false, 'space in timezone → invalid');

const tzBad2 = validateChurchData({ ...validData(), timezone: 'UTC+5' });
assertEq(tzBad2.isValid, false, 'digits in timezone → invalid');

// ============================================================================
// validateChurchData — postal code (warning, not error)
// ============================================================================
console.log('\n── validateChurchData: postal_code (warning) ─────────────');

const usPostal = validateChurchData({ ...validData(), postal_code: '10001' });
assertEq(usPostal.isValid, true, 'US zip valid → no warning');
assertEq(usPostal.warnings.length, 0, 'US zip valid → 0 warnings');

const usPostalBad = validateChurchData({ ...validData(), postal_code: 'BADZIP' });
assertEq(usPostalBad.isValid, true, 'US bad zip → still valid (warning only)');
assert(usPostalBad.warnings.length > 0, 'US bad zip → warning emitted');

// ============================================================================
// validateChurchData — length limits
// ============================================================================
console.log('\n── validateChurchData: length limits ─────────────────────');

const longName = validateChurchData({ ...validData(), name: 'a'.repeat(256) });
assertEq(longName.isValid, false, 'name > 255 → invalid');

const exactName = validateChurchData({ ...validData(), name: 'a'.repeat(255) });
assertEq(exactName.isValid, true, 'name = 255 → valid');

const longDesc = validateChurchData({ ...validData(), description: 'a'.repeat(2001) });
assertEq(longDesc.isValid, false, 'description > 2000 → invalid');

const exactDesc = validateChurchData({ ...validData(), description: 'a'.repeat(2000) });
assertEq(exactDesc.isValid, true, 'description = 2000 → valid');

// ============================================================================
// validateChurchData — multiple errors aggregated
// ============================================================================
console.log('\n── validateChurchData: aggregation ───────────────────────');

const multi = validateChurchData({
  name: '',
  email: 'bad',
  country: '',
  timezone: '',
  preferred_language: 'xx',
  currency: 'XXX',
});
assertEq(multi.isValid, false, 'multi-error → invalid');
assert(multi.summary.errorCount >= 5, 'multi: 5+ errors counted');

// ============================================================================
// validatePostalCode
// ============================================================================
console.log('\n── validatePostalCode ────────────────────────────────────');

// US
assertEq(validatePostalCode('10001', 'United States').isValid, true, 'US 5-digit valid');
assertEq(validatePostalCode('10001-1234', 'United States').isValid, true, 'US zip+4 valid');
assertEq(validatePostalCode('1000', 'United States').isValid, false, 'US 4-digit invalid');
assertEq(validatePostalCode('abcde', 'United States').isValid, false, 'US letters invalid');

// Canada
assertEq(validatePostalCode('K1A 0B1', 'Canada').isValid, true, 'CA postal with space');
assertEq(validatePostalCode('K1A0B1', 'Canada').isValid, true, 'CA postal no space');
assertEq(validatePostalCode('K1A-0B1', 'Canada').isValid, false, 'CA hyphen invalid');

// UK
assertEq(validatePostalCode('SW1A 1AA', 'United Kingdom').isValid, true, 'UK postal valid');
assertEq(validatePostalCode('M1 1AA', 'United Kingdom').isValid, true, 'UK short valid');
assertEq(validatePostalCode('XXX', 'United Kingdom').isValid, false, 'UK garbage invalid');

// Germany / France
assertEq(validatePostalCode('10115', 'Germany').isValid, true, 'DE valid');
assertEq(validatePostalCode('10115', 'France').isValid, true, 'FR valid');
assertEq(validatePostalCode('1234', 'Germany').isValid, false, 'DE 4-digit invalid');

// Greece
assertEq(validatePostalCode('123 45', 'Greece').isValid, true, 'GR with space');
assertEq(validatePostalCode('12345', 'Greece').isValid, true, 'GR no space');
assertEq(validatePostalCode('1234', 'Greece').isValid, false, 'GR 4-digit invalid');

// Romania / Russia
assertEq(validatePostalCode('123456', 'Romania').isValid, true, 'RO 6-digit valid');
assertEq(validatePostalCode('123456', 'Russia').isValid, true, 'RU 6-digit valid');
assertEq(validatePostalCode('12345', 'Russia').isValid, false, 'RU 5-digit invalid');

// Unknown country → always valid
const unknown = validatePostalCode('whatever', 'Atlantis');
assertEq(unknown.isValid, true, 'unknown country → valid');
assert(unknown.message.includes('not validated'), 'unknown country message');

// ============================================================================
// sanitizeChurchData
// ============================================================================
console.log('\n── sanitizeChurchData ────────────────────────────────────');

// Trim strings
const trimmed = sanitizeChurchData({
  name: '  Holy Trinity  ',
  email: 'info@example.org  ',
  city: '  NYC',
});
assertEq(trimmed.name, 'Holy Trinity', 'name trimmed');
assertEq(trimmed.email, 'info@example.org', 'email trimmed');
assertEq(trimmed.city, 'NYC', 'city trimmed');

// Empty strings → null
const empties = sanitizeChurchData({ name: '', email: '   ' });
assertEq(empties.name, null, 'empty name → null');
assertEq(empties.email, null, 'whitespace email → null');

// Null/undefined → null
const nulls = sanitizeChurchData({ phone: null, address: undefined });
assertEq(nulls.phone, null, 'null phone → null');
assertEq(nulls.address, null, 'undefined address → null');

// Language preference defaults
const noLang = sanitizeChurchData({ name: 'Test' });
assertEq(noLang.language_preference, 'en', 'missing language → en default');

const altLang = sanitizeChurchData({ language_preference: 'gr' });
assertEq(altLang.language_preference, 'gr', 'language_preference passes through');

const prefLang = sanitizeChurchData({ preferred_language: 'ru' });
assertEq(prefLang.language_preference, 'ru', 'preferred_language → language_preference');

// preferred_language wins over language_preference (per source order: preferred_language || language_preference)
const bothLang = sanitizeChurchData({ preferred_language: 'gr', language_preference: 'fr' });
assertEq(bothLang.language_preference, 'gr', 'preferred_language has priority');

// founded_year parsing
const yearStr = sanitizeChurchData({ founded_year: '1850' });
assertEq(yearStr.founded_year, 1850, 'string year → int');

const yearNum = sanitizeChurchData({ founded_year: 1900 });
assertEq(yearNum.founded_year, 1900, 'numeric year preserved');

const yearBad = sanitizeChurchData({ founded_year: 'not a number' });
assertEq(yearBad.founded_year, null, 'bad year → null');

const yearMissing = sanitizeChurchData({});
assertEq(yearMissing.founded_year, null, 'missing year → null');

// is_active boolean
const activeTrue = sanitizeChurchData({ is_active: true });
assertEq(activeTrue.is_active, true, 'is_active true');

const activeFalse = sanitizeChurchData({ is_active: false });
assertEq(activeFalse.is_active, false, 'is_active false');

const activeMissing = sanitizeChurchData({});
assertEq(activeMissing.is_active, true, 'is_active default true');

const activeTruthy = sanitizeChurchData({ is_active: 1 });
assertEq(activeTruthy.is_active, true, 'is_active 1 → true');

// Timezone / currency defaults
const noTz2 = sanitizeChurchData({});
assertEq(noTz2.timezone, 'UTC', 'timezone default UTC');
assertEq(noTz2.currency, 'USD', 'currency default USD');

const withTz = sanitizeChurchData({ timezone: 'Europe/Athens', currency: 'EUR' });
assertEq(withTz.timezone, 'Europe/Athens', 'timezone preserved');
assertEq(withTz.currency, 'EUR', 'currency preserved');

// ============================================================================
// generateChurchId
// ============================================================================
console.log('\n── generateChurchId ──────────────────────────────────────');

const id1 = generateChurchId('Holy Trinity Church');
assert(/^HOLYTR_\d{3}$/.test(id1), `id format HOLYTR_XXX (got ${id1})`);

const id2 = generateChurchId('St. Nicholas');
assert(/^STNICH_\d{3}$/.test(id2), `id format STNICH_XXX (got ${id2})`);

// Short name → padded with X
const shortId = generateChurchId('AB');
assert(/^ABXXXX_\d{3}$/.test(shortId), `short name padded to 6 (got ${shortId})`);

// Empty name → all X
const emptyId = generateChurchId('');
assert(/^XXXXXX_\d{3}$/.test(emptyId), `empty name → all X (got ${emptyId})`);

// All special chars → all X
const specialId = generateChurchId('!@#$%^');
assert(/^XXXXXX_\d{3}$/.test(specialId), `all special → all X (got ${specialId})`);

// Mixed alphanumeric
const mixId = generateChurchId('Church 123');
assert(/^CHURCH_\d{3}$/.test(mixId), `church 123 → CHURCH (got ${mixId})`);

// Suffix uniqueness over time (best-effort — Date.now last 3 digits)
assertEq(typeof id1, 'string', 'returns string');
assertEq(id1.length, 10, 'length 10 (6 + _ + 3)');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
