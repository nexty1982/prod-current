#!/usr/bin/env npx tsx
/**
 * Unit tests for services/testChurchDataGenerator.js (OMD-1162)
 *
 * Generates realistic Orthodox church sample data (names, dates, addresses,
 * baptism/marriage/funeral records, users, settings). Pure in-memory except
 * for `loadSampleDataIntoDb` which accepts a tenant pool (dependency-injected,
 * so no stubbing required beyond passing a fake pool).
 *
 * Coverage:
 *   - generateName: returns structured {firstName, lastName, fullName}, draws
 *                   from male/female pools, surname from shared pool
 *   - generateRandomDate: within range [startYear, endYear], boundary years
 *   - generateAddress: shape, numeric plausibility
 *   - generateClergy: count, role mapping from title, contact fields
 *   - generateBaptismRecords: count, shape, date_of_baptism >= date_of_birth
 *   - generateMarriageRecords: count, shape, license number format
 *   - generateFuneralRecords: count, shape, date_of_funeral >= date_of_death
 *   - generateUsers: bcrypt hashing (password != 'password123'), role mix
 *   - generateChurchSettings: 5 predefined keys
 *   - generateBranding: hex colors, ag-grid theme
 *   - generateCompleteTestData: default counts, option overrides
 *   - loadSampleDataIntoDb: success counts, per-query failure tolerance
 *
 * Run: npx tsx server/src/services/__tests__/testChurchDataGenerator.test.ts
 */

const bcrypt = require('bcrypt');
const TestChurchDataGenerator = require('../testChurchDataGenerator');

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

const gen = new TestChurchDataGenerator();

async function main() {

// ============================================================================
// generateName
// ============================================================================
console.log('\n── generateName ──────────────────────────────────────────');

const maleNames = gen.orthodoxNames.male;
const femaleNames = gen.orthodoxNames.female;
const surnames = gen.orthodoxSurnames;

for (let i = 0; i < 20; i++) {
  const m = gen.generateName('male');
  assert(maleNames.includes(m.firstName), `male first: ${m.firstName}`);
  assert(surnames.includes(m.lastName), `male last: ${m.lastName}`);
  assertEq(m.fullName, `${m.firstName} ${m.lastName}`, 'fullName concatenation');
}

for (let i = 0; i < 20; i++) {
  const f = gen.generateName('female');
  assert(femaleNames.includes(f.firstName), `female first: ${f.firstName}`);
  assert(surnames.includes(f.lastName), `female last: ${f.lastName}`);
}

// ============================================================================
// generateRandomDate
// ============================================================================
console.log('\n── generateRandomDate ────────────────────────────────────');

for (let i = 0; i < 20; i++) {
  const d = gen.generateRandomDate(2020, 2024);
  const year = d.getFullYear();
  assert(year >= 2020 && year <= 2024, `year ${year} in [2020, 2024]`);
  assert(d instanceof Date, 'returns Date');
}

// Single-year range
const d2 = gen.generateRandomDate(2023, 2023);
assertEq(d2.getFullYear(), 2023, 'single-year range → year 2023');

// ============================================================================
// generateAddress
// ============================================================================
console.log('\n── generateAddress ───────────────────────────────────────');

for (let i = 0; i < 10; i++) {
  const a = gen.generateAddress();
  assert(typeof a.address === 'string' && a.address.length > 0, 'address string');
  assert(gen.cities.includes(a.city), `city in pool: ${a.city}`);
  assert(/^\d+$/.test(a.postal_code), `postal code numeric: ${a.postal_code}`);
  assert(a.postal_code.length === 5, `postal code 5 digits: ${a.postal_code}`);
  assertEq(a.country, 'United States', 'country');
  // Address starts with a number followed by space + street
  assert(/^\d+\s/.test(a.address), `address starts with number: ${a.address}`);
}

// ============================================================================
// generateClergy
// ============================================================================
console.log('\n── generateClergy ────────────────────────────────────────');

const clergy = gen.generateClergy(10);
assertEq(clergy.length, 10, 'count');

for (const c of clergy) {
  assertEq(c.church_id, 1, 'church_id');
  assertEq(c.is_active, true, 'is_active');
  assert(gen.clergyTitles.includes(c.title), `title in pool: ${c.title}`);
  assert(['priest', 'bishop', 'deacon'].includes(c.role), `role: ${c.role}`);
  // Role mapping
  if (c.title === 'Father' || c.title === 'Archimandrite') {
    assertEq(c.role, 'priest', `${c.title} → priest`);
  } else if (c.title === 'Bishop') {
    assertEq(c.role, 'bishop', 'Bishop → bishop');
  } else {
    assertEq(c.role, 'deacon', `${c.title} → deacon`);
  }
  assert(/^[a-z]+\.[a-z]+@church\.org$/i.test(c.email), `email format: ${c.email}`);
  assert(/^\(555\) \d{3}-\d{4}$/.test(c.phone), `phone format: ${c.phone}`);
  assert(c.created_at instanceof Date, 'created_at is Date');
}

// Default count
const clergyDefault = gen.generateClergy();
assertEq(clergyDefault.length, 5, 'default count 5');

// ============================================================================
// generateBaptismRecords
// ============================================================================
console.log('\n── generateBaptismRecords ────────────────────────────────');

const baptisms = gen.generateBaptismRecords(30);
assertEq(baptisms.length, 30, 'count');

for (const r of baptisms) {
  assertEq(r.church_id, 1, 'church_id');
  assert(typeof r.first_name === 'string' && r.first_name.length > 0, 'first_name');
  assert(typeof r.last_name === 'string' && r.last_name.length > 0, 'last_name');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_birth), `dob format: ${r.date_of_birth}`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_baptism), `baptism date: ${r.date_of_baptism}`);
  assert(r.date_of_baptism >= r.date_of_birth, 'baptism after birth');
  assertEq(r.place_of_baptism, 'St. Nicholas Orthodox Church', 'place');
  assert(/^Father /.test(r.priest_name), `priest: ${r.priest_name}`);
  assert(/Registry #\d+/.test(r.notes), 'notes include registry');
  // Birth year in [2020, 2024]
  const birthYear = parseInt(r.date_of_birth.split('-')[0], 10);
  assert(birthYear >= 2020 && birthYear <= 2024, `birth year ${birthYear}`);
}

// Default count
assertEq(gen.generateBaptismRecords().length, 50, 'default count 50');

// Zero count
assertEq(gen.generateBaptismRecords(0).length, 0, 'zero count');

// ============================================================================
// generateMarriageRecords
// ============================================================================
console.log('\n── generateMarriageRecords ───────────────────────────────');

const marriages = gen.generateMarriageRecords(20);
assertEq(marriages.length, 20, 'count');

for (let i = 0; i < marriages.length; i++) {
  const r = marriages[i];
  assertEq(r.church_id, 1, 'church_id');
  assert(maleNames.includes(r.groom_first_name), `groom first: ${r.groom_first_name}`);
  assert(femaleNames.includes(r.bride_first_name), `bride first: ${r.bride_first_name}`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.marriage_date), `marriage date: ${r.marriage_date}`);
  assertEq(r.place_of_marriage, 'St. Nicholas Orthodox Church', 'place');
  assert(/^Father /.test(r.priest_name), 'priest starts with Father');
  assertEq(r.license_number, `ML-2024-${String(i + 1).padStart(4, '0')}`, `license ${i}`);
  assert(typeof r.witness1_name === 'string', 'witness1');
  assert(typeof r.witness2_name === 'string', 'witness2');
}

assertEq(gen.generateMarriageRecords().length, 25, 'default count 25');

// ============================================================================
// generateFuneralRecords
// ============================================================================
console.log('\n── generateFuneralRecords ────────────────────────────────');

const funerals = gen.generateFuneralRecords(15);
assertEq(funerals.length, 15, 'count');

for (const r of funerals) {
  assertEq(r.church_id, 1, 'church_id');
  assert(typeof r.first_name === 'string', 'first_name');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_birth), `dob: ${r.date_of_birth}`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_death), `dod: ${r.date_of_death}`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_funeral), `funeral: ${r.date_of_funeral}`);
  assert(r.date_of_funeral >= r.date_of_death, 'funeral after death');
  // death year 2020-2024
  const deathYear = parseInt(r.date_of_death.split('-')[0], 10);
  assert(deathYear >= 2020 && deathYear <= 2024, `death year ${deathYear}`);
  // birth year 1930-1980
  const birthYear = parseInt(r.date_of_birth.split('-')[0], 10);
  assert(birthYear >= 1930 && birthYear <= 1980, `birth year ${birthYear}`);
  assertEq(r.place_of_funeral, 'St. Nicholas Orthodox Church', 'place');
  assert(/Orthodox Cemetery$/.test(r.burial_location), `burial: ${r.burial_location}`);
  assert(['Natural causes', 'Age-related illness'].includes(r.cause_of_death),
         `cause: ${r.cause_of_death}`);
}

assertEq(gen.generateFuneralRecords().length, 15, 'default count 15');

// ============================================================================
// generateUsers
// ============================================================================
console.log('\n── generateUsers ─────────────────────────────────────────');

const users = await gen.generateUsers(8);
assertEq(users.length, 8, 'count 8');

assertEq(users[0].role, 'admin', 'first user is admin');
assertEq(users[1].role, 'editor', 'second user is editor');

for (const u of users) {
  assertEq(u.church_id, 1, 'church_id');
  assertEq(u.is_active, true, 'is_active');
  assert(/^[a-z]+\.[a-z]+$/.test(u.username), `username format: ${u.username}`);
  assert(/^[a-z]+\.[a-z]+@church\.org$/.test(u.email), `email: ${u.email}`);
  assert(u.password !== 'password123', 'password is hashed (not plain)');
  assert(u.password.startsWith('$2'), 'bcrypt hash format');
  assert(['admin', 'editor', 'user'].includes(u.role), `role: ${u.role}`);
  assert(typeof u.full_name === 'string' && u.full_name.includes(' '), 'full_name');
}

// Verify bcrypt actually hashed correctly
const match = await bcrypt.compare('password123', users[0].password);
assert(match, 'bcrypt verifies password123');

// Default count
const usersDefault = await gen.generateUsers();
assertEq(usersDefault.length, 8, 'default count 8');

// ============================================================================
// generateChurchSettings
// ============================================================================
console.log('\n── generateChurchSettings ────────────────────────────────');

const settings = gen.generateChurchSettings();
assertEq(settings.length, 5, '5 settings');

const keys = settings.map((s: any) => s.setting_key);
assert(keys.includes('allow_public_registration'), 'allow_public_registration');
assert(keys.includes('notification_email'), 'notification_email');
assert(keys.includes('calendar_type'), 'calendar_type');
assert(keys.includes('max_records_per_page'), 'max_records_per_page');
assert(keys.includes('backup_frequency'), 'backup_frequency');

for (const s of settings) {
  assertEq(s.church_id, 1, `church_id for ${s.setting_key}`);
  assert(['string', 'boolean', 'number'].includes(s.setting_type),
         `type for ${s.setting_key}: ${s.setting_type}`);
}

const calType = settings.find((s: any) => s.setting_key === 'calendar_type');
assertEq(calType.setting_value, 'gregorian', 'calendar_type default');

const maxRecs = settings.find((s: any) => s.setting_key === 'max_records_per_page');
assertEq(maxRecs.setting_value, '50', 'max_records value');
assertEq(maxRecs.setting_type, 'number', 'max_records type');

// ============================================================================
// generateBranding
// ============================================================================
console.log('\n── generateBranding ──────────────────────────────────────');

const branding = gen.generateBranding();
assertEq(branding.church_id, 1, 'church_id');
assertEq(branding.logo_path, null, 'logo_path null');
assert(/^#[0-9a-f]{6}$/i.test(branding.primary_color), `primary color: ${branding.primary_color}`);
assert(/^#[0-9a-f]{6}$/i.test(branding.secondary_color), `secondary: ${branding.secondary_color}`);
assertEq(branding.ag_grid_theme, 'ag-theme-alpine', 'ag-grid theme');

// ============================================================================
// generateCompleteTestData
// ============================================================================
console.log('\n── generateCompleteTestData ──────────────────────────────');

const complete = await gen.generateCompleteTestData();
assertEq(complete.clergy.length, 5, 'default clergy 5');
assertEq(complete.baptismRecords.length, 50, 'default baptisms 50');
assertEq(complete.marriageRecords.length, 25, 'default marriages 25');
assertEq(complete.funeralRecords.length, 15, 'default funerals 15');
assertEq(complete.users.length, 8, 'default users 8');
assertEq(complete.settings.length, 5, 'settings 5');
assert(complete.branding && complete.branding.church_id === 1, 'branding present');

// Option overrides
const custom = await gen.generateCompleteTestData({
  baptismCount: 3,
  marriageCount: 2,
  funeralCount: 1,
  clergyCount: 4,
  userCount: 6,
});
assertEq(custom.clergy.length, 4, 'override clergy');
assertEq(custom.baptismRecords.length, 3, 'override baptisms');
assertEq(custom.marriageRecords.length, 2, 'override marriages');
assertEq(custom.funeralRecords.length, 1, 'override funerals');
assertEq(custom.users.length, 6, 'override users');

// ============================================================================
// loadSampleDataIntoDb
// ============================================================================
console.log('\n── loadSampleDataIntoDb ──────────────────────────────────');

// Fake pool: records all queries, optionally fails matching patterns
function makeFakePool(failPattern: RegExp | null = null) {
  const queries: Array<{ sql: string; params: any[] }> = [];
  return {
    queries,
    query: async (sql: string, params: any[] = []) => {
      queries.push({ sql, params });
      if (failPattern && failPattern.test(sql)) {
        throw new Error('fake db failure');
      }
      return [{ affectedRows: 1 }];
    },
  };
}

// Happy path — all INSERTs succeed
{
  const pool = makeFakePool();
  const result = await gen.loadSampleDataIntoDb(pool, {
    baptisms: 3, marriages: 2, funerals: 1,
  });
  assertEq(result.baptisms, 3, 'baptism count');
  assertEq(result.marriages, 2, 'marriage count');
  assertEq(result.funerals, 1, 'funeral count');
  assertEq(pool.queries.length, 6, 'total 6 queries');

  // Verify query types
  const bapQueries = pool.queries.filter(q => /INSERT INTO baptism_records/.test(q.sql));
  const marQueries = pool.queries.filter(q => /INSERT INTO marriage_records/.test(q.sql));
  const funQueries = pool.queries.filter(q => /INSERT INTO funeral_records/.test(q.sql));
  assertEq(bapQueries.length, 3, '3 baptism inserts');
  assertEq(marQueries.length, 2, '2 marriage inserts');
  assertEq(funQueries.length, 1, '1 funeral insert');

  // Verify baptism params count (11 placeholders)
  assertEq(bapQueries[0].params.length, 11, 'baptism params count');
  // Verify marriage params count (11 placeholders)
  assertEq(marQueries[0].params.length, 11, 'marriage params count');
  // Verify funeral params count (11 placeholders)
  assertEq(funQueries[0].params.length, 11, 'funeral params count');
}

// Defaults
{
  const pool = makeFakePool();
  const result = await gen.loadSampleDataIntoDb(pool);
  assertEq(result.baptisms, 20, 'default baptism count 20');
  assertEq(result.marriages, 10, 'default marriage count 10');
  assertEq(result.funerals, 5, 'default funeral count 5');
}

// Failure tolerance — baptism inserts all fail, marriage/funeral still run
{
  const pool = makeFakePool(/INSERT INTO baptism_records/);
  const result = await gen.loadSampleDataIntoDb(pool, {
    baptisms: 3, marriages: 2, funerals: 1,
  });
  assertEq(result.baptisms, 0, 'baptism failures swallowed');
  assertEq(result.marriages, 2, 'marriages still succeed');
  assertEq(result.funerals, 1, 'funerals still succeed');
}

// All fail
{
  const pool = makeFakePool(/INSERT INTO/);
  const result = await gen.loadSampleDataIntoDb(pool, {
    baptisms: 2, marriages: 2, funerals: 2,
  });
  assertEq(result.baptisms, 0, 'all baptisms failed');
  assertEq(result.marriages, 0, 'all marriages failed');
  assertEq(result.funerals, 0, 'all funerals failed');
}

// Zero counts fall back to defaults (counts.baptisms || 20) — documented via
// the default-path test above. Explicit zero overrides are not supported
// by the SUT's `||` fallback; this is expected behavior.

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
