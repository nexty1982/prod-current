#!/usr/bin/env npx tsx
/**
 * Unit tests for services/testChurchDataGenerator.js (OMD-1224)
 *
 * Realistic Orthodox sample data generator. Pure JS class with one
 * external dep: `bcrypt` (used only in generateUsers). We stub bcrypt
 * via require.cache so tests don't pay the real hash cost.
 *
 * Coverage:
 *   - generateName: returns firstName/lastName/fullName from the
 *                   configured pools for both genders
 *   - generateRandomDate: date between start/end years (inclusive)
 *   - generateAddress: address/city/postal_code/country shape
 *   - generateClergy(N): N items, each with role derived from title
 *   - generateBaptismRecords(N): ISO date strings, registry number in notes
 *   - generateMarriageRecords(N): padded license number, groom/bride split
 *   - generateFuneralRecords(N): death ≥ birth, funeral within a week
 *   - generateUsers(N): first user is admin, second is editor, bcrypt mocked
 *   - generateChurchSettings: 5 entries, known setting_keys
 *   - generateBranding: canonical shape
 *   - generateCompleteTestData: bundles everything, honors option counts
 *   - loadSampleDataIntoDb: queries fake pool for baptism/marriage/funeral
 *                           INSERTs with correct column counts; individual
 *                           failures are swallowed (count remains accurate)
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

// ── bcrypt stub (avoid real hashing) ─────────────────────────────────
const bcryptStub = {
  hash: async (_plain: string, _rounds: number) => 'HASHED',
  compare: async (_a: string, _b: string) => true,
};
const bcryptPath = require.resolve('bcrypt');
require.cache[bcryptPath] = {
  id: bcryptPath, filename: bcryptPath, loaded: true, exports: bcryptStub,
} as any;

const TestChurchDataGenerator = require('../testChurchDataGenerator');
const gen = new TestChurchDataGenerator();

async function main() {

// ============================================================================
// generateName
// ============================================================================
console.log('\n── generateName ───────────────────────────────────────────');

{
  const male = gen.generateName('male');
  assert(typeof male.firstName === 'string', 'male firstName string');
  assert(typeof male.lastName === 'string', 'male lastName string');
  assertEq(male.fullName, `${male.firstName} ${male.lastName}`, 'fullName composed');
  assert(gen.orthodoxNames.male.includes(male.firstName), 'male firstName in pool');
  assert(gen.orthodoxSurnames.includes(male.lastName), 'lastName in pool');

  const female = gen.generateName('female');
  assert(gen.orthodoxNames.female.includes(female.firstName), 'female firstName in pool');
}

// ============================================================================
// generateRandomDate
// ============================================================================
console.log('\n── generateRandomDate ─────────────────────────────────────');

{
  const d = gen.generateRandomDate(2000, 2005);
  assert(d instanceof Date, 'returns Date');
  const y = d.getFullYear();
  assert(y >= 2000 && y <= 2005, `year within range (got ${y})`);

  // Tight range
  const d2 = gen.generateRandomDate(2020, 2020);
  assertEq(d2.getFullYear(), 2020, 'single-year range');
}

// ============================================================================
// generateAddress
// ============================================================================
console.log('\n── generateAddress ────────────────────────────────────────');

{
  const a = gen.generateAddress();
  assert(typeof a.address === 'string', 'address string');
  assert(/^\d+\s/.test(a.address), 'address starts with number + space');
  assert(gen.cities.includes(a.city), 'city in pool');
  assertEq(a.country, 'United States', 'country fixed');
  assert(/^\d{5}$/.test(a.postal_code), 'postal_code 5 digits');
  assert(typeof a.state === 'string', 'state present');
}

// ============================================================================
// generateClergy
// ============================================================================
console.log('\n── generateClergy ─────────────────────────────────────────');

{
  const clergy = gen.generateClergy(10);
  assertEq(clergy.length, 10, '10 clergy generated');
  const first = clergy[0];
  assertEq(first.church_id, 1, 'church_id=1');
  assert(typeof first.name === 'string', 'name present');
  assert(gen.clergyTitles.includes(first.title), 'title in pool');
  assert(/^\(555\) \d{3}-\d{4}$/.test(first.phone), 'phone format');
  assert(first.email.endsWith('@church.org'), 'email domain');
  assert(['priest', 'bishop', 'deacon'].includes(first.role), 'role derived');
  assertEq(first.is_active, true, 'active');
  assert(first.created_at instanceof Date, 'created_at Date');

  // role mapping logic — sample over a batch of 500
  const batch = gen.generateClergy(500);
  for (const c of batch) {
    if (c.title === 'Father' || c.title === 'Archimandrite') {
      assertEq(c.role, 'priest', `${c.title} → priest`);
      break;
    }
  }
  for (const c of batch) {
    if (c.title === 'Bishop') {
      assertEq(c.role, 'bishop', 'Bishop → bishop');
      break;
    }
  }
  for (const c of batch) {
    if (c.title === 'Deacon') {
      assertEq(c.role, 'deacon', 'Deacon → deacon');
      break;
    }
  }
}

// Default count when omitted
{
  const clergy = gen.generateClergy();
  assertEq(clergy.length, 5, 'default clergy count=5');
}

// ============================================================================
// generateBaptismRecords
// ============================================================================
console.log('\n── generateBaptismRecords ─────────────────────────────────');

{
  const records = gen.generateBaptismRecords(20);
  assertEq(records.length, 20, '20 baptism records');
  const r = records[0];
  assertEq(r.church_id, 1, 'church_id=1');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_birth), 'DOB ISO date');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_baptism), 'baptism ISO date');
  assert(new Date(r.date_of_baptism) >= new Date(r.date_of_birth), 'baptism ≥ birth');
  assert(r.place_of_baptism === 'St. Nicholas Orthodox Church', 'fixed church name');
  assert(r.priest_name.startsWith('Father '), 'priest_name Father ...');
  assert(r.notes.includes('Registry #'), 'notes include registry #');
  assert(r.created_at instanceof Date, 'created_at Date');

  // Registry numbers: 1000..1000+count-1
  const notes0 = records[0].notes;
  const notes19 = records[19].notes;
  assert(notes0.includes('Registry #1000'), 'first registry #1000');
  assert(notes19.includes('Registry #1019'), 'last registry #1019');
}

// Default count
{
  const records = gen.generateBaptismRecords();
  assertEq(records.length, 50, 'default baptism count=50');
}

// ============================================================================
// generateMarriageRecords
// ============================================================================
console.log('\n── generateMarriageRecords ────────────────────────────────');

{
  const records = gen.generateMarriageRecords(10);
  assertEq(records.length, 10, '10 marriage records');
  const r = records[0];
  assertEq(r.church_id, 1, 'church_id=1');
  assert(typeof r.groom_first_name === 'string', 'groom_first_name');
  assert(typeof r.bride_first_name === 'string', 'bride_first_name');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.marriage_date), 'ISO marriage_date');
  assertEq(r.license_number, 'ML-2024-0001', 'license_number padded');
  assert(r.notes.includes('Registry #2000'), 'registry # starts at 2000');
  assertEq(records[9].license_number, 'ML-2024-0010', 'last license padded');
}

// Default count
{
  const records = gen.generateMarriageRecords();
  assertEq(records.length, 25, 'default marriage count=25');
}

// ============================================================================
// generateFuneralRecords
// ============================================================================
console.log('\n── generateFuneralRecords ─────────────────────────────────');

{
  const records = gen.generateFuneralRecords(10);
  assertEq(records.length, 10, '10 funeral records');
  const r = records[0];
  assertEq(r.church_id, 1, 'church_id=1');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_birth), 'DOB ISO');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_death), 'death ISO');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_funeral), 'funeral ISO');
  assert(new Date(r.date_of_death) >= new Date(r.date_of_birth), 'death ≥ birth');
  assert(new Date(r.date_of_funeral) >= new Date(r.date_of_death), 'funeral ≥ death');
  // Within a week (≤ 7 days)
  const diffMs = new Date(r.date_of_funeral).getTime() - new Date(r.date_of_death).getTime();
  assert(diffMs <= 7 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000, 'funeral within ~week of death');
  assert(r.priest_name.startsWith('Father '), 'priest Father ...');
  assert(r.burial_location.includes('Orthodox Cemetery'), 'burial Orthodox Cemetery');
  assert(['Natural causes', 'Age-related illness'].includes(r.cause_of_death), 'cause of death enum');
  assert(r.notes.includes('May their memory be eternal'), 'memorial note');
  assert(r.notes.includes('Registry #3000'), 'registry # starts at 3000');
}

// Default count
{
  const records = gen.generateFuneralRecords();
  assertEq(records.length, 15, 'default funeral count=15');
}

// ============================================================================
// generateUsers
// ============================================================================
console.log('\n── generateUsers ──────────────────────────────────────────');

{
  const users = await gen.generateUsers(5);
  assertEq(users.length, 5, '5 users');
  assertEq(users[0].role, 'admin', 'first user admin');
  assertEq(users[1].role, 'editor', 'second user editor');
  for (const u of users) {
    assertEq(u.password, 'HASHED', 'bcrypt stub applied');
    assertEq(u.church_id, 1, 'church_id');
    assertEq(u.is_active, true, 'active');
    assert(u.email.endsWith('@church.org'), 'email domain');
    assert(typeof u.username === 'string', 'username');
    assert(['admin', 'editor', 'user'].includes(u.role), 'role enum');
  }
}

// Default count
{
  const users = await gen.generateUsers();
  assertEq(users.length, 8, 'default users=8');
}

// ============================================================================
// generateChurchSettings / generateBranding
// ============================================================================
console.log('\n── generateChurchSettings / generateBranding ──────────────');

{
  const settings = gen.generateChurchSettings();
  assertEq(settings.length, 5, '5 settings');
  const keys = settings.map((s: any) => s.setting_key).sort();
  assertEq(
    keys,
    ['allow_public_registration', 'backup_frequency', 'calendar_type', 'max_records_per_page', 'notification_email'],
    'setting keys'
  );
  for (const s of settings) {
    assertEq(s.church_id, 1, 'church_id');
    assert(['boolean', 'string', 'number'].includes(s.setting_type), 'setting_type enum');
  }
}

{
  const branding = gen.generateBranding();
  assertEq(branding.church_id, 1, 'church_id');
  assertEq(branding.primary_color, '#1976d2', 'primary color');
  assertEq(branding.secondary_color, '#dc004e', 'secondary color');
  assertEq(branding.ag_grid_theme, 'ag-theme-alpine', 'grid theme');
  assertEq(branding.logo_path, null, 'logo null');
}

// ============================================================================
// generateCompleteTestData
// ============================================================================
console.log('\n── generateCompleteTestData ───────────────────────────────');

{
  const data = await gen.generateCompleteTestData({
    baptismCount: 3,
    marriageCount: 2,
    funeralCount: 1,
    clergyCount: 4,
    userCount: 2,
  });
  assertEq(data.clergy.length, 4, '4 clergy');
  assertEq(data.baptismRecords.length, 3, '3 baptisms');
  assertEq(data.marriageRecords.length, 2, '2 marriages');
  assertEq(data.funeralRecords.length, 1, '1 funeral');
  assertEq(data.users.length, 2, '2 users');
  assert(Array.isArray(data.settings), 'settings array');
  assertEq(typeof data.branding, 'object', 'branding object');
}

// Default options
{
  const data = await gen.generateCompleteTestData();
  assertEq(data.clergy.length, 5, 'default clergy=5');
  assertEq(data.baptismRecords.length, 50, 'default baptism=50');
  assertEq(data.marriageRecords.length, 25, 'default marriage=25');
  assertEq(data.funeralRecords.length, 15, 'default funeral=15');
  assertEq(data.users.length, 8, 'default users=8');
}

// ============================================================================
// loadSampleDataIntoDb
// ============================================================================
console.log('\n── loadSampleDataIntoDb ───────────────────────────────────');

{
  type Call = { sql: string; params: any[] };
  const calls: Call[] = [];
  const fakePool = {
    query: async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      return [{}];
    },
  };

  const counts = await gen.loadSampleDataIntoDb(fakePool, {
    baptisms: 3, marriages: 2, funerals: 1,
  });
  assertEq(counts.baptisms, 3, '3 baptisms inserted');
  assertEq(counts.marriages, 2, '2 marriages inserted');
  assertEq(counts.funerals, 1, '1 funeral inserted');
  assertEq(calls.length, 6, '6 INSERTs total');

  const baptismCalls = calls.filter(c => /INSERT INTO baptism_records/.test(c.sql));
  assertEq(baptismCalls.length, 3, 'baptism INSERTs');
  assertEq(baptismCalls[0].params.length, 11, 'baptism param count=11');

  const marriageCalls = calls.filter(c => /INSERT INTO marriage_records/.test(c.sql));
  assertEq(marriageCalls.length, 2, 'marriage INSERTs');
  assertEq(marriageCalls[0].params.length, 11, 'marriage param count=11');

  const funeralCalls = calls.filter(c => /INSERT INTO funeral_records/.test(c.sql));
  assertEq(funeralCalls.length, 1, 'funeral INSERTs');
  assertEq(funeralCalls[0].params.length, 11, 'funeral param count=11');
}

// Default counts
{
  const calls: any[] = [];
  const fakePool = { query: async (sql: string, params: any[] = []) => {
    calls.push({ sql }); return [{}];
  }};
  const counts = await gen.loadSampleDataIntoDb(fakePool);
  assertEq(counts.baptisms, 20, 'default baptisms=20');
  assertEq(counts.marriages, 10, 'default marriages=10');
  assertEq(counts.funerals, 5, 'default funerals=5');
  assertEq(calls.length, 35, 'total INSERTs = 20+10+5');
}

// Individual failures are swallowed
{
  let n = 0;
  const fakePool = {
    query: async (_sql: string) => {
      n++;
      if (n % 2 === 0) throw new Error('unique collision');
      return [{}];
    },
  };
  // NOTE: the SUT uses `counts.marriages || 10` so passing 0 falls through to
  // defaults. Pass baptisms=4 only and accept defaults for marriages/funerals —
  // the point of the test is to prove failures are swallowed without throwing.
  const counts = await gen.loadSampleDataIntoDb(fakePool, { baptisms: 4 });
  // 4 baptism calls: odd succeed → 2
  assertEq(counts.baptisms, 2, '2 successful inserts out of 4 (others swallowed)');
  // Defaults (10 marriages, 5 funerals) were attempted without throwing
  assert(typeof counts.marriages === 'number', 'marriages count numeric');
  assert(typeof counts.funerals === 'number', 'funerals count numeric');
  // Total queries attempted: 4 + 10 + 5 = 19
  assertEq(n, 19, '19 total INSERTs attempted');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => {
  console.error('Unhandled:', e);
  process.exit(1);
});
