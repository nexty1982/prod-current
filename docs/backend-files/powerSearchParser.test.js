/**
 * Unit Tests for Power Search Parser
 * 
 * Run with: npm test powerSearchParser.test.js
 * Or: node powerSearchParser.test.js
 */

const {
  parseSearchQuery,
  tokenize,
  resolveField,
  parseDateValue,
  buildWhereClause,
} = require('../src/utils/powerSearchParser');

// Simple test framework
let testCount = 0;
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  testCount++;
  if (condition) {
    passCount++;
    console.log(`✅ PASS: ${message}`);
  } else {
    failCount++;
    console.error(`❌ FAIL: ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  testCount++;
  const isEqual = JSON.stringify(actual) === JSON.stringify(expected);
  if (isEqual) {
    passCount++;
    console.log(`✅ PASS: ${message}`);
  } else {
    failCount++;
    console.error(`❌ FAIL: ${message}`);
    console.error(`  Expected:`, expected);
    console.error(`  Actual:`, actual);
  }
}

function assertContains(str, substring, message) {
  testCount++;
  if (str.includes(substring)) {
    passCount++;
    console.log(`✅ PASS: ${message}`);
  } else {
    failCount++;
    console.error(`❌ FAIL: ${message}`);
    console.error(`  Expected "${str}" to contain "${substring}"`);
  }
}

console.log('\n🧪 Running Power Search Parser Tests...\n');

// Test 1: Tokenization - Global terms
console.log('--- Test Group: Tokenization ---');
const tokens1 = tokenize('john smith');
assert(tokens1.length === 2, 'Should tokenize two global terms');
assert(tokens1[0].type === 'global' && tokens1[0].value === 'john', 'First token should be "john"');
assert(tokens1[1].type === 'global' && tokens1[1].value === 'smith', 'Second token should be "smith"');

// Test 2: Tokenization - Quoted phrases
const tokens2 = tokenize('"Rev. David"');
assert(tokens2.length === 1, 'Should tokenize quoted phrase as single token');
assert(tokens2[0].value === 'Rev. David', 'Should preserve spaces in quoted phrase');

// Test 3: Tokenization - Field scoping
const tokens3 = tokenize('first:john last:smith');
assert(tokens3.length === 2, 'Should tokenize two field tokens');
assert(tokens3[0].type === 'field' && tokens3[0].field === 'first', 'First field should be "first"');
assert(tokens3[0].value === 'john', 'First value should be "john"');
assert(tokens3[1].field === 'last' && tokens3[1].value === 'smith', 'Second field:value should be correct');

// Test 4: Tokenization - Operators
const tokens4 = tokenize('last=Smith birth>2020');
assert(tokens4.length === 2, 'Should tokenize two field tokens with operators');
assert(tokens4[0].operator === '=', 'Should parse exact match operator');
assert(tokens4[1].operator === '>', 'Should parse greater than operator');

// Test 5: Tokenization - Range operator
const tokens5 = tokenize('baptism:2024-01-01..2024-12-31');
assert(tokens5.length === 1, 'Should tokenize range as single token');
assert(tokens5[0].operator === '..', 'Should parse range operator');
assert(tokens5[0].value.start === '2024-01-01', 'Should parse range start');
assert(tokens5[0].value.end === '2024-12-31', 'Should parse range end');

// Test 6: Field resolution - Aliases
console.log('\n--- Test Group: Field Resolution ---');
assert(resolveField('first') === 'person_first', 'Should resolve "first" to "person_first"');
assert(resolveField('fname') === 'person_first', 'Should resolve "fname" alias');
assert(resolveField('last') === 'person_last', 'Should resolve "last" to "person_last"');
assert(resolveField('clergy') === 'officiant_name', 'Should resolve "clergy" to "officiant_name"');
assert(resolveField('birth') === 'birth_date', 'Should resolve "birth" to "birth_date"');
assert(resolveField('invalidfield') === null, 'Should return null for invalid field');

// Test 7: Date parsing - Year only
console.log('\n--- Test Group: Date Parsing ---');
const date1 = parseDateValue('2020', '>');
assert(date1.sql === '>= ?', 'Year with > should use >=');
assert(date1.params[0] === '2020-12-31', 'Should expand year to end of year');

const date2 = parseDateValue('2020', '<');
assert(date2.sql === '< ?', 'Year with < should use <');
assert(date2.params[0] === '2020-01-01', 'Should expand year to start of year');

// Test 8: Date parsing - Month
const date3 = parseDateValue('2024-06', '=');
assert(date3.sql === 'BETWEEN ? AND ?', 'Month should use BETWEEN');
assert(date3.params[0] === '2024-06-01', 'Should expand to first day of month');
assert(date3.params[1] === '2024-06-30', 'Should expand to last day of month');

// Test 9: Date parsing - Exact date
const date4 = parseDateValue('2024-06-15', '>=');
assert(date4.sql === '>= ?', 'Exact date should preserve operator');
assert(date4.params[0] === '2024-06-15', 'Should use exact date');

// Test 10: Full query parsing - Global search
console.log('\n--- Test Group: Full Query Parsing ---');
const result1 = parseSearchQuery('john smith');
assert(result1.sql.length > 0, 'Should generate SQL for global search');
assert(result1.params.length === 18, 'Should create params for all global search fields (9 fields × 2 terms)');
assertContains(result1.sql, 'person_first LIKE ?', 'Should include person_first in global search');
assertContains(result1.sql, 'OR', 'Should use OR for global search across fields');

// Test 11: Full query parsing - Field search
const result2 = parseSearchQuery('first:john last:smith');
assert(result2.sql.length > 0, 'Should generate SQL for field search');
assert(result2.params.length === 2, 'Should have 2 params for 2 fields');
assertContains(result2.sql, 'person_first LIKE ?', 'Should include person_first field');
assertContains(result2.sql, 'person_last LIKE ?', 'Should include person_last field');
assert(result2.params[0] === '%john%', 'Should wrap value in wildcards for partial match');

// Test 12: Full query parsing - Exact match
const result3 = parseSearchQuery('last=Smith');
assertContains(result3.sql, 'person_last = ?', 'Should use = for exact match');
assert(result3.params[0] === 'Smith', 'Should not wrap exact match in wildcards');

// Test 13: Full query parsing - Date comparison
const result4 = parseSearchQuery('birth>2020');
assertContains(result4.sql, 'birth_date >= ?', 'Should expand year comparison');
assert(result4.params[0] === '2020-12-31', 'Should use end of year for >');

// Test 14: Full query parsing - Date range
const result5 = parseSearchQuery('baptism:2024-01-01..2024-12-31');
assertContains(result5.sql, 'baptism_date BETWEEN ? AND ?', 'Should use BETWEEN for range');
assert(result5.params.length === 2, 'Should have 2 params for range');

// Test 15: Full query parsing - Mixed query
const result6 = parseSearchQuery('john first:mary birth>2020 clergy:"Rev. David"');
assert(result6.sql.length > 0, 'Should parse complex mixed query');
assert(result6.warnings.length === 0, 'Should not have warnings for valid query');
assert(result6.summary.globalTerms === 1, 'Should count 1 global term');
assert(result6.summary.fieldFilters === 3, 'Should count 3 field filters');

// Test 16: Invalid field warning
const result7 = parseSearchQuery('invalidfield:test');
assert(result7.warnings.length === 1, 'Should generate warning for invalid field');
assertContains(result7.warnings[0], 'Unknown field', 'Warning should mention unknown field');

// Test 17: Empty query
const result8 = parseSearchQuery('');
assert(result8.sql === '', 'Empty query should return empty SQL');
assert(result8.params.length === 0, 'Empty query should have no params');
assert(result8.warnings.length === 0, 'Empty query should have no warnings');

// Test 18: Quoted phrase in field
const result9 = parseSearchQuery('clergy:"Rev. David Smith"');
assertContains(result9.sql, 'officiant_name LIKE ?', 'Should handle quoted phrase in field');
assert(result9.params[0] === '%Rev. David Smith%', 'Should preserve full quoted phrase');

// Test 19: Multiple operators
const result10 = parseSearchQuery('birth>=2020-01-01 baptism<=2024-12-31');
assertContains(result10.sql, 'birth_date >= ?', 'Should handle >= operator');
assertContains(result10.sql, 'baptism_date <= ?', 'Should handle <= operator');

// Test 20: Case insensitivity
const result11 = parseSearchQuery('FIRST:JOHN Last:Smith');
assertContains(result11.sql, 'person_first LIKE ?', 'Should handle uppercase field names');
assert(result11.params[0] === '%JOHN%', 'Should preserve value case');

// Summary
console.log('\n' + '='.repeat(50));
console.log(`📊 Test Results: ${passCount}/${testCount} passed`);
if (failCount > 0) {
  console.log(`❌ ${failCount} test(s) failed`);
  process.exit(1);
} else {
  console.log('✅ All tests passed!');
  process.exit(0);
}
