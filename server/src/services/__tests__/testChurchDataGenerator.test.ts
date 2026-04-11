#!/usr/bin/env npx tsx
/**
 * Unit tests for services/testChurchDataGenerator.js (OMD-989)
 *
 * Pure data-fabrication module. Uses bcrypt (real) + a tenant pool
 * for loadSampleDataIntoDb (stubbed here).
 *
 * Coverage:
 *   - constructor: name/surname/city/street lists populated
 *   - generateName: male / female, returns {firstName, lastName, fullName}
 *   - generateRandomDate: within range, endpoints respected
 *   - generateAddress: shape, street/city from pools
 *   - generateClergy: count honored, role mapping (priest/bishop/deacon),
 *     email lowercase, phone format
 *   - generateBaptismRecords: count, required fields, ISO dates,
 *     baptismDate >= birthDate, registry number in notes
 *   - generateMarriageRecords: count, fields, license_number format,
 *     registry number
 *   - generateFuneralRecords: count, fields, funeralDate >= deathDate
 *   - generateUsers: count, admin/editor roles, email/username format,
 *     bcrypt hash, unique-ish identity
 *   - generateChurchSettings: 5 settings with expected keys
 *   - generateBranding: shape
 *   - generateCompleteTestData: defaults + custom counts
 *   - loadSampleDataIntoDb: stubbed pool, counts correct inserts,
 *     swallows individual errors
 *
 * Run: npx tsx server/src/services/__tests__/testChurchDataGenerator.test.ts
 */

const TestChurchDataGenerator = require('../testChurchDataGenerator');
const bcrypt = require('bcrypt');

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

async function main() {

const gen = new TestChurchDataGenerator();

// ============================================================================
// constructor
// ============================================================================
console.log('\n── constructor ───────────────────────────────────────────');

assert(Array.isArray(gen.orthodoxNames.male) && gen.orthodoxNames.male.length > 0, 'male names populated');
assert(Array.isArray(gen.orthodoxNames.female) && gen.orthodoxNames.female.length > 0, 'female names populated');
assert(Array.isArray(gen.orthodoxSurnames) && gen.orthodoxSurnames.length > 0, 'surnames populated');
assert(Array.isArray(gen.clergyTitles) && gen.clergyTitles.length > 0, 'clergy titles populated');
assert(Array.isArray(gen.cities) && gen.cities.length > 0, 'cities populated');
assert(Array.isArray(gen.streets) && gen.streets.length > 0, 'streets populated');

// ============================================================================
// generateName
// ============================================================================
console.log('\n── generateName ──────────────────────────────────────────');

for (let i = 0; i < 20; i++) {
  const m = gen.generateName('male');
  assert(gen.orthodoxNames.male.includes(m.firstName), `male firstName from pool (${m.firstName})`);
  assert(gen.orthodoxSurnames.includes(m.lastName), `male lastName from pool (${m.lastName})`);
  assertEq(m.fullName, `${m.firstName} ${m.lastName}`, `male fullName = first + last`);
}

for (let i = 0; i < 20; i++) {
  const f = gen.generateName('female');
  assert(gen.orthodoxNames.female.includes(f.firstName), `female firstName from pool (${f.firstName})`);
  assert(gen.orthodoxSurnames.includes(f.lastName), `female lastName from pool`);
}

// ============================================================================
// generateRandomDate
// ============================================================================
console.log('\n── generateRandomDate ────────────────────────────────────');

for (let i = 0; i < 50; i++) {
  const d = gen.generateRandomDate(2020, 2024);
  assert(d instanceof Date, 'returns Date instance');
  const year = d.getFullYear();
  assert(year >= 2020 && year <= 2024, `year in range (${year})`);
}

// Same year → date within that year
for (let i = 0; i < 10; i++) {
  const d = gen.generateRandomDate(2023, 2023);
  assertEq(d.getFullYear(), 2023, 'single-year range stays in year');
}

// ============================================================================
// generateAddress
// ============================================================================
console.log('\n── generateAddress ───────────────────────────────────────');

for (let i = 0; i < 10; i++) {
  const a = gen.generateAddress();
  assert(typeof a.address === 'string' && a.address.length > 0, 'has address');
  assert(/^\d+ /.test(a.address), 'address starts with number');
  assert(gen.cities.includes(a.city), 'city from pool');
  assertEq(a.country, 'United States', 'country is US');
  assert(/^\d{5}$/.test(a.postal_code), '5-digit postal code');
  assert(typeof a.state === 'string', 'has state');
}

// ============================================================================
// generateClergy
// ============================================================================
console.log('\n── generateClergy ────────────────────────────────────────');

{
  const clergy = gen.generateClergy(5);
  assertEq(clergy.length, 5, '5 clergy generated');
  for (const c of clergy) {
    assertEq(c.church_id, 1, 'church_id 1');
    assert(typeof c.name === 'string', 'has name');
    assert(gen.clergyTitles.includes(c.title), 'title from pool');
    assert(c.email.includes('@church.org'), 'email @church.org');
    assert(c.email === c.email.toLowerCase(), 'email lowercase');
    assert(/^\(\d{3}\) \d{3}-\d{4}$/.test(c.phone), `phone format (${c.phone})`);
    assert(['priest', 'bishop', 'deacon'].includes(c.role), `role valid (${c.role})`);
    assertEq(c.is_active, true, 'is_active true');
    assert(c.created_at instanceof Date, 'created_at Date');
  }
}

// Role mapping is deterministic from title
{
  // Run many times to cover each mapping path
  let sawPriest = false, sawBishop = false, sawDeacon = false;
  for (let i = 0; i < 100; i++) {
    const clergy = gen.generateClergy(1);
    const c = clergy[0];
    if (c.title === 'Father' || c.title === 'Archimandrite') {
      assertEq(c.role, 'priest', `Father/Archimandrite → priest`);
      sawPriest = true;
    } else if (c.title === 'Bishop') {
      assertEq(c.role, 'bishop', `Bishop → bishop`);
      sawBishop = true;
    } else {
      assertEq(c.role, 'deacon', `other → deacon`);
      sawDeacon = true;
    }
  }
  assert(sawPriest, 'saw priest mapping');
  // Bishop/deacon may not always be sampled — don't fail if not seen
}

// Default count = 5
{
  const c = gen.generateClergy();
  assertEq(c.length, 5, 'default count 5');
}

// ============================================================================
// generateBaptismRecords
// ============================================================================
console.log('\n── generateBaptismRecords ────────────────────────────────');

{
  const records = gen.generateBaptismRecords(10);
  assertEq(records.length, 10, '10 baptism records');
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    assertEq(r.church_id, 1, 'church_id');
    assert(typeof r.first_name === 'string', 'first_name');
    assert(typeof r.last_name === 'string', 'last_name');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_birth), 'date_of_birth ISO');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_baptism), 'date_of_baptism ISO');
    assert(new Date(r.date_of_baptism) >= new Date(r.date_of_birth), 'baptism >= birth');
    assert(r.priest_name.startsWith('Father '), 'priest starts with Father');
    assert(r.notes.includes(`#${1000 + i}`), `registry #${1000 + i} in notes`);
    assertEq(r.place_of_baptism, 'St. Nicholas Orthodox Church', 'place_of_baptism');
  }
}

// Default count
{
  const records = gen.generateBaptismRecords();
  assertEq(records.length, 50, 'default baptism count 50');
}

// ============================================================================
// generateMarriageRecords
// ============================================================================
console.log('\n── generateMarriageRecords ───────────────────────────────');

{
  const records = gen.generateMarriageRecords(5);
  assertEq(records.length, 5, '5 marriage records');
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    assertEq(r.church_id, 1, 'church_id');
    assert(typeof r.groom_first_name === 'string', 'groom_first_name');
    assert(typeof r.bride_first_name === 'string', 'bride_first_name');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(r.marriage_date), 'marriage_date ISO');
    assert(/^ML-2024-\d{4}$/.test(r.license_number), `license format (${r.license_number})`);
    assertEq(r.license_number, `ML-2024-${String(i + 1).padStart(4, '0')}`, 'license numbered');
    assert(r.notes.includes(`#${2000 + i}`), `registry #${2000 + i} in notes`);
    assert(r.priest_name.startsWith('Father '), 'priest starts with Father');
  }
}

// Default count
{
  const r = gen.generateMarriageRecords();
  assertEq(r.length, 25, 'default marriage count 25');
}

// ============================================================================
// generateFuneralRecords
// ============================================================================
console.log('\n── generateFuneralRecords ────────────────────────────────');

{
  const records = gen.generateFuneralRecords(8);
  assertEq(records.length, 8, '8 funeral records');
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    assertEq(r.church_id, 1, 'church_id');
    assert(typeof r.first_name === 'string', 'first_name');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_birth), 'dob ISO');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_death), 'death ISO');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_funeral), 'funeral ISO');
    assert(new Date(r.date_of_funeral) >= new Date(r.date_of_death), 'funeral >= death');
    assert(new Date(r.date_of_death) > new Date(r.date_of_birth), 'death > birth');
    assert(r.burial_location.endsWith('Orthodox Cemetery'), 'burial ends with Orthodox Cemetery');
    assert(['Natural causes', 'Age-related illness'].includes(r.cause_of_death), 'cause valid');
    assert(r.notes.includes(`#${3000 + i}`), `registry #${3000 + i}`);
  }
}

// Default count
{
  const r = gen.generateFuneralRecords();
  assertEq(r.length, 15, 'default funeral count 15');
}

// ============================================================================
// generateUsers
// ============================================================================
console.log('\n── generateUsers ─────────────────────────────────────────');

{
  const users = await gen.generateUsers(5);
  assertEq(users.length, 5, '5 users');
  assertEq(users[0].role, 'admin', 'first user is admin');
  assertEq(users[1].role, 'editor', 'second user is editor');
  for (const u of users) {
    assertEq(u.church_id, 1, 'church_id');
    assert(u.username === u.username.toLowerCase(), 'username lowercase');
    assert(u.email.includes('@church.org'), 'email @church.org');
    assert(['admin', 'editor', 'user'].includes(u.role), 'role valid');
    assertEq(u.is_active, true, 'is_active');
    // bcrypt hash looks like $2b$...
    assert(/^\$2[aby]\$\d+\$/.test(u.password), 'bcrypt hash format');
    // Verify hash matches 'password123'
    const match = await bcrypt.compare('password123', u.password);
    assertEq(match, true, 'bcrypt hash verifies');
  }
}

// Default count
{
  const u = await gen.generateUsers();
  assertEq(u.length, 8, 'default user count 8');
}

// ============================================================================
// generateChurchSettings
// ============================================================================
console.log('\n── generateChurchSettings ────────────────────────────────');

{
  const settings = gen.generateChurchSettings();
  assertEq(settings.length, 5, '5 settings');
  const keys = settings.map((s: any) => s.setting_key);
  assertEq(keys, [
    'allow_public_registration',
    'notification_email',
    'calendar_type',
    'max_records_per_page',
    'backup_frequency',
  ], 'setting keys');
  for (const s of settings) {
    assertEq(s.church_id, 1, 'church_id');
    assert(typeof s.setting_value === 'string', 'setting_value string');
    assert(['boolean', 'string', 'number'].includes(s.setting_type), 'setting_type valid');
  }
}

// ============================================================================
// generateBranding
// ============================================================================
console.log('\n── generateBranding ──────────────────────────────────────');

{
  const b = gen.generateBranding();
  assertEq(b.church_id, 1, 'church_id');
  assertEq(b.logo_path, null, 'logo_path null');
  assertEq(b.primary_color, '#1976d2', 'primary_color');
  assertEq(b.secondary_color, '#dc004e', 'secondary_color');
  assertEq(b.ag_grid_theme, 'ag-theme-alpine', 'ag_grid_theme');
}

// ============================================================================
// generateCompleteTestData
// ============================================================================
console.log('\n── generateCompleteTestData ──────────────────────────────');

{
  // Defaults
  const data = await gen.generateCompleteTestData();
  assertEq(data.clergy.length, 5, 'default clergy 5');
  assertEq(data.baptismRecords.length, 50, 'default baptism 50');
  assertEq(data.marriageRecords.length, 25, 'default marriage 25');
  assertEq(data.funeralRecords.length, 15, 'default funeral 15');
  assertEq(data.users.length, 8, 'default users 8');
  assertEq(data.settings.length, 5, '5 settings');
  assert(data.branding && typeof data.branding === 'object', 'branding object');
}

{
  // Custom counts
  const data = await gen.generateCompleteTestData({
    baptismCount: 3,
    marriageCount: 2,
    funeralCount: 1,
    clergyCount: 4,
    userCount: 2,
  });
  assertEq(data.clergy.length, 4, 'custom clergy 4');
  assertEq(data.baptismRecords.length, 3, 'custom baptism 3');
  assertEq(data.marriageRecords.length, 2, 'custom marriage 2');
  assertEq(data.funeralRecords.length, 1, 'custom funeral 1');
  assertEq(data.users.length, 2, 'custom users 2');
}

// ============================================================================
// loadSampleDataIntoDb (stubbed pool)
// ============================================================================
console.log('\n── loadSampleDataIntoDb ──────────────────────────────────');

type Call = { sql: string; params: any[] };
function makePool(failEveryOther = false): any {
  let n = 0;
  const calls: Call[] = [];
  const pool = {
    query: async (sql: string, params: any[]) => {
      calls.push({ sql, params });
      n++;
      if (failEveryOther && n % 2 === 0) throw new Error('simulated failure');
      return [{ affectedRows: 1 }, []];
    },
    calls,
  };
  return pool;
}

{
  const pool = makePool();
  const result = await gen.loadSampleDataIntoDb(pool, { baptisms: 3, marriages: 2, funerals: 1 });
  assertEq(result.baptisms, 3, 'inserted 3 baptisms');
  assertEq(result.marriages, 2, 'inserted 2 marriages');
  assertEq(result.funerals, 1, 'inserted 1 funeral');
  assertEq(pool.calls.length, 6, '6 queries total');
  assert(/INSERT INTO baptism_records/.test(pool.calls[0].sql), 'first query is baptism insert');
  assert(/INSERT INTO marriage_records/.test(pool.calls[3].sql), '4th query is marriage insert');
  assert(/INSERT INTO funeral_records/.test(pool.calls[5].sql), '6th query is funeral insert');
}

// Defaults
{
  const pool = makePool();
  const result = await gen.loadSampleDataIntoDb(pool);
  assertEq(result.baptisms, 20, 'default baptisms 20');
  assertEq(result.marriages, 10, 'default marriages 10');
  assertEq(result.funerals, 5, 'default funerals 5');
}

// Failures are swallowed: failEveryOther → roughly half succeed
{
  const pool = makePool(true);
  // Note: `counts.marriages || 10` means 0 falls through to default.
  // Pass only baptisms to isolate the failure behavior.
  const result = await gen.loadSampleDataIntoDb(pool, { baptisms: 4 });
  // Every 2nd call throws. With 4 baptisms: calls 1,2,3,4 → 2,4 fail → 2 succeed
  assertEq(result.baptisms, 2, 'half baptisms succeed (errors swallowed)');
  // marriages=10 default, fail every other → 5 succeed
  assertEq(result.marriages, 5, 'half marriages succeed');
  // funerals=5 default, fail every other → 2 or 3 depending on call parity
  assert(result.funerals >= 2 && result.funerals <= 3, 'half funerals succeed');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
