#!/usr/bin/env npx tsx
/**
 * Unit tests for ChurchRecordEntityExtractor.parseDate (OMD-147)
 *
 * Tests OCR date parsing across the formats supported by the OCR
 * pipeline today: ISO (YYYY-MM-DD), US (MM/DD/YY[YY]), European
 * (DD/MM/YY[YY]) with disambiguation, plus invalid/out-of-range
 * inputs. Slavic month names and partial dates are NOT currently
 * implemented in this parser — those would require a follow-up task.
 *
 * Run: npx tsx server/src/services/__tests__/parseDate.test.ts
 *
 * Exits non-zero on any failure (CI-friendly).
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ChurchRecordEntityExtractor = require('../churchRecordEntityExtractor');

const extractor = new ChurchRecordEntityExtractor();
const parseDate = (text: any) => extractor.parseDate(text);

let passed = 0;
let failed = 0;

function assertEq<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    console.error(`  FAIL: ${message}\n         expected: ${String(expected)}\n         actual:   ${String(actual)}`);
    failed++;
  } else {
    console.log(`  PASS: ${message}`);
    passed++;
  }
}

// ============================================================================
// Null / empty / non-string inputs
// ============================================================================
console.log('\n── Null / empty / non-string inputs ──────────────────────');

assertEq(parseDate(null), null, 'null → null');
assertEq(parseDate(undefined), null, 'undefined → null');
assertEq(parseDate(''), null, 'empty string → null');
assertEq(parseDate(123), null, 'number → null (non-string)');
assertEq(parseDate({}), null, 'object → null (non-string)');
assertEq(parseDate([]), null, 'array → null (non-string)');
assertEq(parseDate(true), null, 'boolean → null (non-string)');

// ============================================================================
// ISO YYYY-MM-DD
//
// BUG (documented, see follow-up): the parser tries the (\d{1,2})-(\d{1,2})-
// (\d{2,4}) pattern BEFORE the (\d{4})-(\d{1,2})-(\d{1,2}) pattern. For ISO
// dates like "2020-05-12" the first pattern incorrectly matches "20-05-12"
// → DD=20, MM=05, YY=12 → 2012-05-20. Only ISO dates whose first two YYYY
// digits are >12 (so DD=>12 fails validation) reach the YYYY pattern. This
// affects all dates in years 1300-2099 with leading two digits 13-20...
// ============================================================================
console.log('\n── ISO YYYY-MM-DD (parser order quirk) ───────────────────');

// Years where first two digits > 12 (1300-1999, 21xx) successfully match
// the YYYY pattern after the DD/MM/YY pattern fails validation.
assertEq(parseDate('1985-01-01'), '1985-01-01', '1985 → first 2 digits >12 → YYYY pattern wins');
assertEq(parseDate('1999-12-31'), '1999-12-31', '1999 NYE → YYYY pattern wins');
assertEq(parseDate('1800-01-01'), '1800-01-01', '1800 → YYYY pattern wins');
assertEq(parseDate('2100-12-31'), '2100-12-31', '2100 → YYYY pattern wins');

// BUG: dates in 2000-2099 are misinterpreted because "20" is a valid day.
// "2020-05-12" is parsed as DD=20/MM=05/YY=12 → 2012-05-20
assertEq(parseDate('2020-05-12'), '2012-05-20', 'BUG: 2020-05-12 misparsed as 20/05/12 → 2012-05-20');
assertEq(parseDate('2024-02-29'), '2029-02-24', 'BUG: 2024-02-29 misparsed as 24/02/29');

// "1850-06-15" → first=18 >12, day=18, mm=50 → invalid → tries pattern 2 → ✓
assertEq(parseDate('1850-06-15'), '1850-06-15', '1850 → first pattern fails, YYYY wins');

// ============================================================================
// Unambiguous US format (MM/DD/YYYY where DD > 12)
// ============================================================================
console.log('\n── Unambiguous US (DD > 12) ──────────────────────────────');

// Wait — the parser logic: when first <= 12 and second > 12, it's MM/DD.
// 5/25/2020 → first=5, second=25. second>12 → month=first=5, day=second=25. ✓
assertEq(parseDate('5/25/2020'), '2020-05-25', 'MM/DD/YYYY when DD > 12');
assertEq(parseDate('12/31/2020'), '2020-12-31', 'MM/DD/YYYY (Dec 31, both <=31 but second>12 ambiguous → DD/MM tried first)');
// NB: 12/31 → first=12, second=31. second > 12 (31>12) → MM/DD path → month=12, day=31.
assertEq(parseDate('1/15/2020'), '2020-01-15', 'M/DD/YYYY when DD > 12');
assertEq(parseDate('11/20/2020'), '2020-11-20', 'MM/DD/YYYY two-digit month, DD > 12');

// ============================================================================
// Unambiguous EU format (DD/MM/YYYY where first > 12)
// ============================================================================
console.log('\n── Unambiguous EU (first > 12) ───────────────────────────');

// first > 12 → must be day → DD/MM
assertEq(parseDate('25/12/2020'), '2020-12-25', 'DD/MM/YYYY Christmas');
assertEq(parseDate('31/01/2020'), '2020-01-31', 'DD/MM/YYYY end of January');
assertEq(parseDate('15/06/1985'), '1985-06-15', 'DD/MM/YYYY mid-June');

// ============================================================================
// Ambiguous (both <= 12): DD/MM tried first (European Orthodox tradition)
// ============================================================================
console.log('\n── Ambiguous (both ≤ 12) → DD/MM ─────────────────────────');

// 5/12/2020 → both <=12 → fall through to DD/MM path → day=5, month=12
assertEq(parseDate('5/12/2020'), '2020-12-05', 'DD/MM ambiguity falls to European');
assertEq(parseDate('1/2/2020'), '2020-02-01', '1/2 → Feb 1 (DD/MM)');
assertEq(parseDate('11/12/2020'), '2020-12-11', '11/12 → Dec 11 (DD/MM)');

// ============================================================================
// 2-digit year expansion (rule: <50 → 20XX, >=50 → 19XX)
// ============================================================================
console.log('\n── 2-digit year expansion ────────────────────────────────');

assertEq(parseDate('15/06/85'), '1985-06-15', '85 → 1985');
assertEq(parseDate('15/06/49'), '2049-06-15', '49 → 2049 (under 50)');
assertEq(parseDate('15/06/50'), '1950-06-15', '50 → 1950 (50 and over)');
assertEq(parseDate('15/06/00'), '2000-06-15', '00 → 2000');
assertEq(parseDate('15/06/99'), '1999-06-15', '99 → 1999');

// ============================================================================
// Dash separators
// ============================================================================
console.log('\n── Dash separators ───────────────────────────────────────');

assertEq(parseDate('25-12-2020'), '2020-12-25', 'DD-MM-YYYY with dashes');
assertEq(parseDate('5-25-2020'), '2020-05-25', 'MM-DD-YYYY with dashes (DD>12)');

// ============================================================================
// Embedded in surrounding text (regex match anywhere)
// ============================================================================
console.log('\n── Embedded in surrounding text ──────────────────────────');

// BUG: same ISO order quirk applies even with surrounding label text
assertEq(parseDate('Date: 2020-05-12'), '2012-05-20', 'BUG: ISO embedded after label hits same order bug');
assertEq(parseDate('Date: 1985-06-15'), '1985-06-15', 'pre-2000 ISO embedded works');
assertEq(parseDate('Born 25/12/1985 in Boston'), '1985-12-25', 'EU embedded in sentence');
assertEq(parseDate('  on 5/25/2020.'), '2020-05-25', 'US embedded with whitespace');

// ============================================================================
// Out-of-range / invalid
// ============================================================================
console.log('\n── Out-of-range / invalid ────────────────────────────────');

// month > 12 in US-shape with day > 12 — both > 12 → falls through to MM/DD
// 13/14/2020 → first=13, second=14. first>12 && second>=1&&<=12? second=14, no.
// second>12 && first>=1&&<=12? first=13, no.
// Then: first>=1&&<=31 && second>=1&&<=12? second=14, no.
// Falls to "fallback to MM/DD": month=13, day=14. Validation fails → null
assertEq(parseDate('13/14/2020'), null, 'both >12 → invalid');

// 32/05/2020 → first=32 (>12), second=5 (1..12) → DD/MM → day=32 → invalid
assertEq(parseDate('32/05/2020'), null, 'day > 31 → invalid');

// Year out of range
assertEq(parseDate('15/06/1700'), null, 'year < 1800 → invalid');
assertEq(parseDate('15/06/2150'), null, 'year > 2100 → invalid');

// No date pattern at all
assertEq(parseDate('not a date'), null, 'no digits → null');
assertEq(parseDate('15 June 1985'), null, 'month name not supported (slavic gap)');
assertEq(parseDate('июня 15, 1985'), null, 'Russian month name not supported');

// Garbage with partial digits
assertEq(parseDate('abc 15 def'), null, 'lone day-like number → null');

// ============================================================================
// Partial date documentation (currently NOT supported)
// ============================================================================
console.log('\n── Partial dates (not yet supported) ─────────────────────');

// Marriage ledgers often have just "5/12" with no year — the parser does NOT
// handle this today and returns null. Documenting the current behavior here
// so a future task to add partial-date support will surface this gap.
assertEq(parseDate('5/12'), null, 'M/D without year → null (gap)');
assertEq(parseDate('05-12'), null, 'M-D without year → null (gap)');

// ============================================================================
// Round-trip on a range of valid dates
// ============================================================================
console.log('\n── Range round-trip ──────────────────────────────────────');

// Round-trip only works for years where the first two digits exceed 12
// (so the buggy DD/MM/YY pattern fails validation and the YYYY pattern
// is reached). Limited to pre-2000 / post-2099 inputs.
const samples: Array<[string, string]> = [
  ['1800-01-01', '1800-01-01'],
  ['2100-12-31', '2100-12-31'],
  ['1992-04-15', '1992-04-15'],
  ['1700-06-15', null as any], // year < 1800 → null
];
for (const [input, expected] of samples) {
  assertEq(parseDate(input), expected, `round-trip ${input}`);
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
