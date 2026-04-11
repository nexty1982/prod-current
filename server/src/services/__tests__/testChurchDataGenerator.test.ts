#!/usr/bin/env npx tsx
/**
 * Unit tests for services/testChurchDataGenerator.js (OMD-1184)
 *
 * Class-based generator for seed data. The only external dep is `bcrypt`
 * (used in generateUsers). We stub bcrypt via require.cache BEFORE requiring
 * the SUT so we don't need the native module.
 *
 * Coverage:
 *   - constructor: name/surname/title/city/street tables populated
 *   - generateName: picks from gender-specific list; fullName composed
 *   - generateRandomDate: within [startYear..endYear] range; Date instance
 *   - generateAddress: shape + numeric ranges
 *   - generateClergy: count, shape, role derivation from title
 *   - generateBaptismRecords / generateMarriageRecords / generateFuneralRecords:
 *       count + shape + registry numbering + dates iso-formatted
 *   - generateUsers: first = admin, second = editor, rest = editor/user;
 *                    passwords hashed via stub; bcrypt called count times
 *   - generateChurchSettings: 5 settings with expected keys
 *   - generateBranding: fixed defaults
 *   - generateCompleteTestData: bundle shape + default counts + overrides
 *   - loadSampleDataIntoDb: issues INSERTs; results counted; per-insert
 *       errors swallowed; counts defaults when not provided
 *
 * Run: npx tsx server/src/services/__tests__/testChurchDataGenerator.test.ts
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

// ── bcrypt stub ──────────────────────────────────────────────────────
let bcryptCalls: Array<{ pw: string; rounds: number }> = [];
const bcryptStub = {
  hash: async (pw: string, rounds: number) => {
    bcryptCalls.push({ pw, rounds });
    return `hashed-${pw}-${rounds}`;
  },
};

const bcryptPath = require.resolve('bcrypt');
require.cache[bcryptPath] = {
  id: bcryptPath,
  filename: bcryptPath,
  loaded: true,
  exports: bcryptStub,
} as any;

const TestChurchDataGenerator = require('../testChurchDataGenerator');

async function main() {

const gen = new TestChurchDataGenerator();

// ============================================================================
// constructor tables
// ============================================================================
console.log('\n── constructor tables ────────────────────────────────────');

assert(Array.isArray(gen.orthodoxNames.male) && gen.orthodoxNames.male.length > 0, 'male names');
assert(Array.isArray(gen.orthodoxNames.female) && gen.orthodoxNames.female.length > 0, 'female names');
assert(Array.isArray(gen.orthodoxSurnames) && gen.orthodoxSurnames.length > 0, 'surnames');
assert(Array.isArray(gen.clergyTitles) && gen.clergyTitles.length > 0, 'clergy titles');
assert(Array.isArray(gen.cities) && gen.cities.length > 0, 'cities');
assert(Array.isArray(gen.streets) && gen.streets.length > 0, 'streets');

// ============================================================================
// generateName
// ============================================================================
console.log('\n── generateName ──────────────────────────────────────────');

for (let i = 0; i < 20; i++) {
  const n = gen.generateName('male');
  assert(typeof n.firstName === 'string' && n.firstName.length > 0, `male[${i}]: firstName non-empty`);
  assert(gen.orthodoxNames.male.includes(n.firstName), `male[${i}]: firstName from male list`);
  assert(gen.orthodoxSurnames.includes(n.lastName), `male[${i}]: lastName from surnames`);
  assertEq(n.fullName, `${n.firstName} ${n.lastName}`, `male[${i}]: fullName composed`);
}

for (let i = 0; i < 20; i++) {
  const n = gen.generateName('female');
  assert(gen.orthodoxNames.female.includes(n.firstName), `female[${i}]: firstName from female list`);
  assert(gen.orthodoxSurnames.includes(n.lastName), `female[${i}]: lastName from surnames`);
}

// ============================================================================
// generateRandomDate
// ============================================================================
console.log('\n── generateRandomDate ────────────────────────────────────');

for (let i = 0; i < 20; i++) {
  const d = gen.generateRandomDate(2020, 2024);
  assert(d instanceof Date, `rand[${i}]: Date instance`);
  const y = d.getFullYear();
  assert(y >= 2020 && y <= 2024, `rand[${i}]: year in [2020..2024]`);
}

// Single-year range
for (let i = 0; i < 10; i++) {
  const d = gen.generateRandomDate(2022, 2022);
  assertEq(d.getFullYear(), 2022, `single-year[${i}]`);
}

// ============================================================================
// generateAddress
// ============================================================================
console.log('\n── generateAddress ───────────────────────────────────────');

for (let i = 0; i < 15; i++) {
  const a = gen.generateAddress();
  assert(typeof a.address === 'string' && /^\d+ /.test(a.address), `addr[${i}]: starts with number`);
  assert(gen.cities.includes(a.city), `addr[${i}]: city from list`);
  assertEq(a.country, 'United States', `addr[${i}]: country`);
  assert(/^\d{5}$/.test(a.postal_code), `addr[${i}]: 5-digit postal`);
  assert(typeof a.state === 'string', `addr[${i}]: state string`);
}

// ============================================================================
// generateClergy
// ============================================================================
console.log('\n── generateClergy ────────────────────────────────────────');

{
  const clergy = gen.generateClergy(10);
  assertEq(clergy.length, 10, 'count=10');
  for (let i = 0; i < clergy.length; i++) {
    const c = clergy[i];
    assertEq(c.church_id, 1, `clergy[${i}]: church_id=1`);
    assert(typeof c.name === 'string' && c.name.length > 0, `clergy[${i}]: name`);
    assert(gen.clergyTitles.includes(c.title), `clergy[${i}]: title valid`);
    assert(/@church\.org$/.test(c.email), `clergy[${i}]: email domain`);
    assert(/^\(555\) \d{3}-\d{4}$/.test(c.phone), `clergy[${i}]: phone format`);
    const expectedRole =
      c.title === 'Father' || c.title === 'Archimandrite' ? 'priest' :
      c.title === 'Bishop' ? 'bishop' : 'deacon';
    assertEq(c.role, expectedRole, `clergy[${i}]: role derived from title`);
    assertEq(c.is_active, true, `clergy[${i}]: active`);
    assert(c.created_at instanceof Date, `clergy[${i}]: created_at Date`);
    assert(c.updated_at instanceof Date, `clergy[${i}]: updated_at Date`);
  }
}

// Default count
{
  const clergy = gen.generateClergy();
  assertEq(clergy.length, 5, 'default count=5');
}

// ============================================================================
// generateBaptismRecords
// ============================================================================
console.log('\n── generateBaptismRecords ────────────────────────────────');

{
  const records = gen.generateBaptismRecords(5);
  assertEq(records.length, 5, 'count=5');
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    assertEq(r.church_id, 1, `bap[${i}]: church_id`);
    assert(typeof r.first_name === 'string' && r.first_name.length > 0, `bap[${i}]: first_name`);
    assert(typeof r.last_name === 'string' && r.last_name.length > 0, `bap[${i}]: last_name`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_birth), `bap[${i}]: dob iso`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_baptism), `bap[${i}]: baptism iso`);
    assertEq(r.place_of_baptism, 'St. Nicholas Orthodox Church', `bap[${i}]: place`);
    assert(/^Father /.test(r.priest_name), `bap[${i}]: priest prefix`);
    assert(r.notes.includes(`Registry #${1000 + i}`), `bap[${i}]: registry number`);
    assert(r.created_at instanceof Date, `bap[${i}]: created_at`);
  }
}

// Default count
{
  const records = gen.generateBaptismRecords();
  assertEq(records.length, 50, 'default count=50');
}

// ============================================================================
// generateMarriageRecords
// ============================================================================
console.log('\n── generateMarriageRecords ───────────────────────────────');

{
  const records = gen.generateMarriageRecords(4);
  assertEq(records.length, 4, 'count=4');
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    assertEq(r.church_id, 1, `mar[${i}]: church_id`);
    assert(gen.orthodoxNames.male.includes(r.groom_first_name), `mar[${i}]: groom male name`);
    assert(gen.orthodoxNames.female.includes(r.bride_first_name), `mar[${i}]: bride female name`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(r.marriage_date), `mar[${i}]: date iso`);
    assertEq(r.place_of_marriage, 'St. Nicholas Orthodox Church', `mar[${i}]: place`);
    assert(/^Father /.test(r.priest_name), `mar[${i}]: priest prefix`);
    const expectedLicense = `ML-2024-${String(i + 1).padStart(4, '0')}`;
    assertEq(r.license_number, expectedLicense, `mar[${i}]: license number`);
    assert(r.notes.includes(`Registry #${2000 + i}`), `mar[${i}]: registry`);
  }
}

// Default count
{
  const records = gen.generateMarriageRecords();
  assertEq(records.length, 25, 'default count=25');
}

// ============================================================================
// generateFuneralRecords
// ============================================================================
console.log('\n── generateFuneralRecords ────────────────────────────────');

{
  const records = gen.generateFuneralRecords(3);
  assertEq(records.length, 3, 'count=3');
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    assertEq(r.church_id, 1, `fun[${i}]: church_id`);
    assert(typeof r.first_name === 'string', `fun[${i}]: first_name`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_birth), `fun[${i}]: dob iso`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_death), `fun[${i}]: death iso`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_funeral), `fun[${i}]: funeral iso`);
    const dobYear = parseInt(r.date_of_birth.slice(0, 4), 10);
    assert(dobYear >= 1930 && dobYear <= 1980, `fun[${i}]: birth year in range`);
    const deathYear = parseInt(r.date_of_death.slice(0, 4), 10);
    assert(deathYear >= 2020 && deathYear <= 2024, `fun[${i}]: death year in range`);
    assertEq(r.place_of_funeral, 'St. Nicholas Orthodox Church', `fun[${i}]: place`);
    assert(/^Father /.test(r.priest_name), `fun[${i}]: priest prefix`);
    assert(/Orthodox Cemetery$/.test(r.burial_location), `fun[${i}]: burial cemetery`);
    assert(['Natural causes', 'Age-related illness'].includes(r.cause_of_death), `fun[${i}]: cause`);
    assert(r.notes.includes(`Registry #${3000 + i}`), `fun[${i}]: registry`);
  }
}

// Default count
{
  const records = gen.generateFuneralRecords();
  assertEq(records.length, 15, 'default count=15');
}

// ============================================================================
// generateUsers (async, uses bcrypt stub)
// ============================================================================
console.log('\n── generateUsers ─────────────────────────────────────────');

{
  bcryptCalls = [];
  const users = await gen.generateUsers(6);
  assertEq(users.length, 6, 'count=6');
  assertEq(bcryptCalls.length, 6, 'bcrypt called per user');
  assertEq(bcryptCalls[0].pw, 'password123', 'bcrypt pw');
  assertEq(bcryptCalls[0].rounds, 10, 'bcrypt rounds');
  assertEq(users[0].role, 'admin', 'first = admin');
  assertEq(users[1].role, 'editor', 'second = editor');
  for (let i = 2; i < users.length; i++) {
    assert(['editor', 'user'].includes(users[i].role), `user[${i}]: role editor|user`);
  }
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    assertEq(u.church_id, 1, `user[${i}]: church_id`);
    assertEq(u.password, 'hashed-password123-10', `user[${i}]: password hashed by stub`);
    assert(u.username.includes('.'), `user[${i}]: username has dot`);
    assert(/@church\.org$/.test(u.email), `user[${i}]: email domain`);
    assertEq(u.is_active, true, `user[${i}]: active`);
    assert(u.created_at instanceof Date, `user[${i}]: created_at`);
  }
}

// Default count
{
  bcryptCalls = [];
  const users = await gen.generateUsers();
  assertEq(users.length, 8, 'default count=8');
  assertEq(bcryptCalls.length, 8, 'bcrypt count matches default');
}

// ============================================================================
// generateChurchSettings
// ============================================================================
console.log('\n── generateChurchSettings ────────────────────────────────');

{
  const settings = gen.generateChurchSettings();
  assertEq(settings.length, 5, '5 settings');
  const keys = settings.map((s: any) => s.setting_key);
  assert(keys.includes('allow_public_registration'), 'key: public registration');
  assert(keys.includes('notification_email'), 'key: notification email');
  assert(keys.includes('calendar_type'), 'key: calendar');
  assert(keys.includes('max_records_per_page'), 'key: max records');
  assert(keys.includes('backup_frequency'), 'key: backup');
  for (const s of settings) {
    assertEq(s.church_id, 1, `setting ${s.setting_key}: church_id`);
    assert(['boolean', 'string', 'number'].includes(s.setting_type), `setting ${s.setting_key}: type`);
  }
}

// ============================================================================
// generateBranding
// ============================================================================
console.log('\n── generateBranding ──────────────────────────────────────');

{
  const b = gen.generateBranding();
  assertEq(b.church_id, 1, 'church_id');
  assertEq(b.logo_path, null, 'logo null');
  assertEq(b.primary_color, '#1976d2', 'primary color');
  assertEq(b.secondary_color, '#dc004e', 'secondary color');
  assertEq(b.ag_grid_theme, 'ag-theme-alpine', 'ag grid theme');
}

// ============================================================================
// generateCompleteTestData
// ============================================================================
console.log('\n── generateCompleteTestData ──────────────────────────────');

{
  bcryptCalls = [];
  const data = await gen.generateCompleteTestData();
  assertEq(data.clergy.length, 5, 'default clergy');
  assertEq(data.baptismRecords.length, 50, 'default baptisms');
  assertEq(data.marriageRecords.length, 25, 'default marriages');
  assertEq(data.funeralRecords.length, 15, 'default funerals');
  assertEq(data.users.length, 8, 'default users');
  assertEq(data.settings.length, 5, 'settings');
  assert(data.branding && data.branding.church_id === 1, 'branding present');
}

// Override counts
{
  bcryptCalls = [];
  const data = await gen.generateCompleteTestData({
    baptismCount: 3,
    marriageCount: 2,
    funeralCount: 1,
    clergyCount: 4,
    userCount: 2,
  });
  assertEq(data.clergy.length, 4, 'override clergy');
  assertEq(data.baptismRecords.length, 3, 'override baptisms');
  assertEq(data.marriageRecords.length, 2, 'override marriages');
  assertEq(data.funeralRecords.length, 1, 'override funerals');
  assertEq(data.users.length, 2, 'override users');
  assertEq(bcryptCalls.length, 2, 'bcrypt calls match userCount');
}

// ============================================================================
// loadSampleDataIntoDb
// ============================================================================
console.log('\n── loadSampleDataIntoDb ──────────────────────────────────');

type QueryCall = { sql: string; params: any[] };

function makeFakePool(opts: { throwOnPattern?: RegExp } = {}) {
  const queries: QueryCall[] = [];
  const pool = {
    query: async (sql: string, params: any[]) => {
      queries.push({ sql, params });
      if (opts.throwOnPattern && opts.throwOnPattern.test(sql)) {
        throw new Error('fake insert failure');
      }
      return [{ insertId: queries.length }];
    },
    queries,
  };
  return pool;
}

// Explicit counts, all succeed
{
  const pool = makeFakePool();
  const r = await gen.loadSampleDataIntoDb(pool, { baptisms: 3, marriages: 2, funerals: 1 });
  assertEq(r.baptisms, 3, 'loaded baptisms');
  assertEq(r.marriages, 2, 'loaded marriages');
  assertEq(r.funerals, 1, 'loaded funerals');
  assertEq(pool.queries.length, 6, 'total insert count');
  const bapCount = pool.queries.filter(q => /INSERT INTO baptism_records/.test(q.sql)).length;
  const marCount = pool.queries.filter(q => /INSERT INTO marriage_records/.test(q.sql)).length;
  const funCount = pool.queries.filter(q => /INSERT INTO funeral_records/.test(q.sql)).length;
  assertEq(bapCount, 3, 'baptism inserts');
  assertEq(marCount, 2, 'marriage inserts');
  assertEq(funCount, 1, 'funeral inserts');
  // Param count per insert = 11 for each record type
  const firstBap = pool.queries.find(q => /INSERT INTO baptism_records/.test(q.sql))!;
  assertEq(firstBap.params.length, 11, 'baptism params count');
}

// Default counts (20/10/5)
{
  const pool = makeFakePool();
  const r = await gen.loadSampleDataIntoDb(pool);
  assertEq(r.baptisms, 20, 'default baptisms');
  assertEq(r.marriages, 10, 'default marriages');
  assertEq(r.funerals, 5, 'default funerals');
}

// Per-insert errors swallowed — baptism inserts all fail
{
  const pool = makeFakePool({ throwOnPattern: /INSERT INTO baptism_records/ });
  const r = await gen.loadSampleDataIntoDb(pool, { baptisms: 5, marriages: 3, funerals: 2 });
  assertEq(r.baptisms, 0, 'baptisms all failed → 0');
  assertEq(r.marriages, 3, 'marriages still inserted');
  assertEq(r.funerals, 2, 'funerals still inserted');
}

// All marriages fail
{
  const pool = makeFakePool({ throwOnPattern: /INSERT INTO marriage_records/ });
  const r = await gen.loadSampleDataIntoDb(pool, { baptisms: 2, marriages: 4, funerals: 1 });
  assertEq(r.baptisms, 2, 'baptisms ok');
  assertEq(r.marriages, 0, 'marriages failed → 0');
  assertEq(r.funerals, 1, 'funerals ok');
}

// All funerals fail
{
  const pool = makeFakePool({ throwOnPattern: /INSERT INTO funeral_records/ });
  const r = await gen.loadSampleDataIntoDb(pool, { baptisms: 1, marriages: 1, funerals: 3 });
  assertEq(r.baptisms, 1, 'baptisms ok');
  assertEq(r.marriages, 1, 'marriages ok');
  assertEq(r.funerals, 0, 'funerals failed → 0');
}

// Zero counts
{
  const pool = makeFakePool();
  const r = await gen.loadSampleDataIntoDb(pool, { baptisms: 0, marriages: 0, funerals: 0 });
  // Falsy zero → defaults kick in: 20/10/5
  assertEq(r.baptisms, 20, 'zero baptisms → default 20 (falsy fallback)');
  assertEq(r.marriages, 10, 'zero marriages → default 10');
  assertEq(r.funerals, 5, 'zero funerals → default 5');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
