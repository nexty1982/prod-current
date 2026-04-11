#!/usr/bin/env npx tsx
/**
 * Unit tests for services/testChurchDataGenerator.js (OMD-1103)
 *
 * Pure data generator class. Uses Math.random (pinned for determinism)
 * and bcrypt (stubbed so generateUsers doesn't spend real CPU).
 *
 * Strategy:
 *   - Pin Math.random via a PRNG seeded for tests that assert specific
 *     values. Restore between test groups.
 *   - Stub bcrypt via require.cache so generateUsers is deterministic
 *     and fast.
 *   - Verify shape/size/fields rather than exact values for random data.
 *
 * Coverage:
 *   - constructor: data arrays populated
 *   - generateName: returns {firstName, lastName, fullName}, gender
 *     picks from correct list
 *   - generateRandomDate: within bounds
 *   - generateAddress: shape and field types
 *   - generateClergy: default 5, custom count, required fields, role mapping
 *   - generateBaptismRecords: default 50, custom, date ordering (baptism
 *     within ~1 year of birth), registry number
 *   - generateMarriageRecords: default 25, license_number format,
 *     registry number
 *   - generateFuneralRecords: default 15, birth < death, funeral within
 *     a week of death, registry number
 *   - generateUsers: default 8, role assignment (admin/editor/user),
 *     bcrypt hash, username format
 *   - generateChurchSettings: returns 5 fixed settings
 *   - generateBranding: returns fixed branding object
 *   - generateCompleteTestData: orchestrates all with custom options
 *   - loadSampleDataIntoDb: INSERTs baptism/marriage/funeral, swallows
 *     individual errors, returns counts
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

// ── Stub bcrypt ─────────────────────────────────────────────────────
function stubModule(fromPath: string, relPath: string, exports: any): void {
  const { createRequire } = require('module');
  const path = require('path');
  const fromFile = require.resolve(fromPath);
  const fromDir = path.dirname(fromFile);
  const scopedRequire = createRequire(path.join(fromDir, 'noop.js'));
  try {
    const resolved = scopedRequire.resolve(relPath);
    require.cache[resolved] = {
      id: resolved,
      filename: resolved,
      loaded: true,
      exports,
    } as any;
  } catch {}
}

let hashCalls: Array<{ password: string; saltRounds: number }> = [];
const bcryptStub = {
  hash: async (password: string, saltRounds: number) => {
    hashCalls.push({ password, saltRounds });
    return `hashed:${password}`;
  },
};
stubModule('../testChurchDataGenerator', 'bcrypt', bcryptStub);

const TestChurchDataGenerator = require('../testChurchDataGenerator');

// ── Math.random pinning helpers ─────────────────────────────────────
const origRandom = Math.random;
function pinRandom(values: number[]) {
  let i = 0;
  Math.random = () => values[i++ % values.length];
}
function restoreRandom() {
  Math.random = origRandom;
}

async function main() {

// ============================================================================
// constructor
// ============================================================================
console.log('\n── constructor ───────────────────────────────────────────');

const gen = new TestChurchDataGenerator();
assert(Array.isArray(gen.orthodoxNames.male) && gen.orthodoxNames.male.length > 0, 'male names');
assert(Array.isArray(gen.orthodoxNames.female) && gen.orthodoxNames.female.length > 0, 'female names');
assert(Array.isArray(gen.orthodoxSurnames) && gen.orthodoxSurnames.length > 0, 'surnames');
assert(Array.isArray(gen.clergyTitles) && gen.clergyTitles.includes('Father'), 'clergy titles');
assert(Array.isArray(gen.cities) && gen.cities.includes('Athens'), 'cities');
assert(Array.isArray(gen.streets) && gen.streets.length > 0, 'streets');

// ============================================================================
// generateName
// ============================================================================
console.log('\n── generateName ──────────────────────────────────────────');

{
  const n = gen.generateName('male');
  assert(typeof n.firstName === 'string' && n.firstName.length > 0, 'firstName');
  assert(typeof n.lastName === 'string' && n.lastName.length > 0, 'lastName');
  assertEq(n.fullName, `${n.firstName} ${n.lastName}`, 'fullName composed');
  assert(gen.orthodoxNames.male.includes(n.firstName), 'from male list');
  assert(gen.orthodoxSurnames.includes(n.lastName), 'surname from list');
}

{
  const n = gen.generateName('female');
  assert(gen.orthodoxNames.female.includes(n.firstName), 'from female list');
}

// Deterministic: pinned to 0, should pick first element
pinRandom([0]);
{
  const n = gen.generateName('male');
  assertEq(n.firstName, gen.orthodoxNames.male[0], 'random=0 → first male');
  assertEq(n.lastName, gen.orthodoxSurnames[0], 'random=0 → first surname');
}
restoreRandom();

// ============================================================================
// generateRandomDate
// ============================================================================
console.log('\n── generateRandomDate ────────────────────────────────────');

{
  const d = gen.generateRandomDate(2020, 2024);
  assert(d instanceof Date, 'Date instance');
  assert(d.getFullYear() >= 2020, 'year lower bound');
  assert(d.getFullYear() <= 2024, 'year upper bound');
}

// Bounds determinism
pinRandom([0]);
{
  const d = gen.generateRandomDate(2020, 2020);
  assertEq(d.getFullYear(), 2020, 'single year');
}
restoreRandom();

// ============================================================================
// generateAddress
// ============================================================================
console.log('\n── generateAddress ───────────────────────────────────────');

{
  const a = gen.generateAddress();
  assert(typeof a.address === 'string' && /^\d+/.test(a.address), 'address starts with number');
  assert(typeof a.city === 'string', 'city string');
  assert(gen.cities.includes(a.city), 'city from list');
  assertEq(a.country, 'United States', 'country');
  assert(/^\d{5}$/.test(a.postal_code), '5-digit postal');
}

// ============================================================================
// generateClergy
// ============================================================================
console.log('\n── generateClergy ────────────────────────────────────────');

{
  const clergy = gen.generateClergy();
  assertEq(clergy.length, 5, 'default count 5');
  const c = clergy[0];
  assertEq(c.church_id, 1, 'church_id');
  assert(typeof c.name === 'string', 'name');
  assert(gen.clergyTitles.includes(c.title), 'title from list');
  assert(/@church\.org$/.test(c.email), 'email domain');
  assert(/^\(555\) \d{3}-\d{4}$/.test(c.phone), 'phone format');
  assert(['priest', 'bishop', 'deacon'].includes(c.role), 'valid role');
  assertEq(c.is_active, true, 'active');
  assert(c.created_at instanceof Date, 'created_at Date');
}

{
  const clergy = gen.generateClergy(3);
  assertEq(clergy.length, 3, 'custom count');
}

// Role mapping: pin title to "Father" → 'priest'
// title index is the 0th clergy title = 'Father'
// generateClergy uses random for name and title both; pin to 0 for title
// Actually the sequence is: name (4 randoms: male idx, surname idx), title (1 random), address (3 randoms), created (1), updated (1)
// Pin a pattern that always produces a title='Father' (index 0)
pinRandom([0]);
{
  const c = gen.generateClergy(1);
  assertEq(c[0].title, 'Father', 'Father (random=0)');
  assertEq(c[0].role, 'priest', 'priest role');
}
restoreRandom();

// ============================================================================
// generateBaptismRecords
// ============================================================================
console.log('\n── generateBaptismRecords ────────────────────────────────');

{
  const recs = gen.generateBaptismRecords();
  assertEq(recs.length, 50, 'default 50');
  const r = recs[0];
  assertEq(r.church_id, 1, 'church_id');
  assert(typeof r.first_name === 'string', 'first_name');
  assert(typeof r.last_name === 'string', 'last_name');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_birth), 'birth ISO date');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_baptism), 'baptism ISO date');
  assert(r.father_name.includes(' '), 'father fullname');
  assert(r.mother_name.includes(' '), 'mother fullname');
  assertEq(r.place_of_baptism, 'St. Nicholas Orthodox Church', 'fixed place');
  assert(/^Father /.test(r.priest_name), 'priest title');
  assert(/Registry #\d{4}/.test(r.notes), 'registry in notes');
  // Registry #1000 for i=0
  assert(r.notes.includes('Registry #1000'), 'first registry #1000');
}

{
  const recs = gen.generateBaptismRecords(3);
  assertEq(recs.length, 3, 'custom count');
  assert(recs[2].notes.includes('Registry #1002'), 'increments registry');
}

// Baptism date should be after birth date (within a year)
{
  const recs = gen.generateBaptismRecords(10);
  for (const r of recs) {
    const birth = new Date(r.date_of_birth).getTime();
    const baptism = new Date(r.date_of_baptism).getTime();
    assert(baptism >= birth, `baptism >= birth (${r.date_of_birth} / ${r.date_of_baptism})`);
  }
}

// ============================================================================
// generateMarriageRecords
// ============================================================================
console.log('\n── generateMarriageRecords ───────────────────────────────');

{
  const recs = gen.generateMarriageRecords();
  assertEq(recs.length, 25, 'default 25');
  const r = recs[0];
  assertEq(r.church_id, 1, 'church_id');
  assert(typeof r.groom_first_name === 'string', 'groom_first_name');
  assert(typeof r.bride_first_name === 'string', 'bride_first_name');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.marriage_date), 'ISO date');
  assert(/^ML-\d{4}-\d{4}$/.test(r.license_number), 'license format');
  assertEq(r.place_of_marriage, 'St. Nicholas Orthodox Church', 'fixed place');
  assert(r.notes.includes('Registry #2000'), 'registry starts at 2000');
}

{
  const recs = gen.generateMarriageRecords(2);
  assertEq(recs.length, 2, 'custom');
  // License: ML-2024-0001 / ML-2024-0002
  assert(recs[0].license_number.endsWith('0001'), 'padded 0001');
  assert(recs[1].license_number.endsWith('0002'), 'padded 0002');
}

// ============================================================================
// generateFuneralRecords
// ============================================================================
console.log('\n── generateFuneralRecords ────────────────────────────────');

{
  const recs = gen.generateFuneralRecords();
  assertEq(recs.length, 15, 'default 15');
  const r = recs[0];
  assertEq(r.church_id, 1, 'church_id');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_birth), 'birth ISO');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_death), 'death ISO');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(r.date_of_funeral), 'funeral ISO');
  assert(/Orthodox Cemetery$/.test(r.burial_location), 'burial location');
  assert(['Natural causes', 'Age-related illness'].includes(r.cause_of_death), 'cause');
  assert(r.notes.includes('Registry #3000'), 'registry starts at 3000');
}

// Birth < Death (birth from 1930-1980, death from 2020-2024)
{
  const recs = gen.generateFuneralRecords(5);
  for (const r of recs) {
    const birth = new Date(r.date_of_birth).getTime();
    const death = new Date(r.date_of_death).getTime();
    assert(death > birth, 'death > birth');
  }
}

// Funeral within a week of death
{
  const recs = gen.generateFuneralRecords(5);
  for (const r of recs) {
    const death = new Date(r.date_of_death).getTime();
    const funeral = new Date(r.date_of_funeral).getTime();
    const daysDiff = (funeral - death) / (24 * 60 * 60 * 1000);
    assert(daysDiff >= 0 && daysDiff <= 8, `funeral within ~week of death (${daysDiff.toFixed(2)} days)`);
  }
}

// ============================================================================
// generateUsers
// ============================================================================
console.log('\n── generateUsers ─────────────────────────────────────────');

{
  hashCalls.length = 0;
  const users = await gen.generateUsers();
  assertEq(users.length, 8, 'default 8');
  assertEq(hashCalls.length, 8, '8 bcrypt.hash calls');
  assertEq(hashCalls[0].saltRounds, 10, 'salt rounds 10');
  assertEq(hashCalls[0].password, 'password123', 'default password');

  const u = users[0];
  assertEq(u.church_id, 1, 'church_id');
  assert(typeof u.username === 'string' && u.username.includes('.'), 'username dot-separated');
  assert(/@church\.org$/.test(u.email), 'email domain');
  assertEq(u.password, 'hashed:password123', 'bcrypt stub result');
  assertEq(u.is_active, true, 'active');

  // Role assignment: user[0]=admin, user[1]=editor
  assertEq(users[0].role, 'admin', 'user 0 admin');
  assertEq(users[1].role, 'editor', 'user 1 editor');
  // Others are editor or user
  for (let i = 2; i < users.length; i++) {
    assert(['editor', 'user'].includes(users[i].role), `user ${i} valid role`);
  }
}

{
  hashCalls.length = 0;
  const users = await gen.generateUsers(2);
  assertEq(users.length, 2, 'custom count');
}

// ============================================================================
// generateChurchSettings
// ============================================================================
console.log('\n── generateChurchSettings ────────────────────────────────');

{
  const settings = gen.generateChurchSettings();
  assertEq(settings.length, 5, '5 settings');
  const keys = settings.map((s: any) => s.setting_key);
  assert(keys.includes('allow_public_registration'), 'has registration');
  assert(keys.includes('notification_email'), 'has email');
  assert(keys.includes('calendar_type'), 'has calendar');
  assert(keys.includes('max_records_per_page'), 'has pagination');
  assert(keys.includes('backup_frequency'), 'has backup');
  // Types
  const regSetting = settings.find((s: any) => s.setting_key === 'allow_public_registration');
  assertEq(regSetting.setting_type, 'boolean', 'reg is boolean');
  const pageSetting = settings.find((s: any) => s.setting_key === 'max_records_per_page');
  assertEq(pageSetting.setting_type, 'number', 'page is number');
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
  assertEq(b.ag_grid_theme, 'ag-theme-alpine', 'grid theme');
}

// ============================================================================
// generateCompleteTestData
// ============================================================================
console.log('\n── generateCompleteTestData ──────────────────────────────');

{
  hashCalls.length = 0;
  const data = await gen.generateCompleteTestData();
  assertEq(data.clergy.length, 5, 'default clergy');
  assertEq(data.baptismRecords.length, 50, 'default baptism');
  assertEq(data.marriageRecords.length, 25, 'default marriage');
  assertEq(data.funeralRecords.length, 15, 'default funeral');
  assertEq(data.users.length, 8, 'default users');
  assertEq(data.settings.length, 5, 'settings');
  assert(typeof data.branding === 'object', 'branding object');
}

{
  hashCalls.length = 0;
  const data = await gen.generateCompleteTestData({
    baptismCount: 3, marriageCount: 2, funeralCount: 1,
    clergyCount: 4, userCount: 2,
  });
  assertEq(data.clergy.length, 4, 'custom clergy');
  assertEq(data.baptismRecords.length, 3, 'custom baptism');
  assertEq(data.marriageRecords.length, 2, 'custom marriage');
  assertEq(data.funeralRecords.length, 1, 'custom funeral');
  assertEq(data.users.length, 2, 'custom users');
}

// ============================================================================
// loadSampleDataIntoDb
// ============================================================================
console.log('\n── loadSampleDataIntoDb ──────────────────────────────────');

{
  const queries: Array<{ sql: string; params: any[] }> = [];
  const fakePool = {
    query: async (sql: string, params: any[]) => {
      queries.push({ sql, params });
      return [{ affectedRows: 1 }];
    },
  };
  const results = await gen.loadSampleDataIntoDb(fakePool);
  // Defaults: 20 baptisms, 10 marriages, 5 funerals
  assertEq(results.baptisms, 20, 'default 20 baptisms');
  assertEq(results.marriages, 10, 'default 10 marriages');
  assertEq(results.funerals, 5, 'default 5 funerals');
  assertEq(queries.length, 35, '20+10+5 = 35 INSERTs');
  const baptismQueries = queries.filter(q => /baptism_records/i.test(q.sql));
  const marriageQueries = queries.filter(q => /marriage_records/i.test(q.sql));
  const funeralQueries = queries.filter(q => /funeral_records/i.test(q.sql));
  assertEq(baptismQueries.length, 20, 'baptism count');
  assertEq(marriageQueries.length, 10, 'marriage count');
  assertEq(funeralQueries.length, 5, 'funeral count');
}

console.log('\n── loadSampleDataIntoDb: custom counts ───────────────────');

{
  const queries: any[] = [];
  const fakePool = {
    query: async (sql: string, params: any[]) => {
      queries.push({ sql, params });
      return [{}];
    },
  };
  const r = await gen.loadSampleDataIntoDb(fakePool, {
    baptisms: 2, marriages: 1, funerals: 3,
  });
  assertEq(r, { baptisms: 2, marriages: 1, funerals: 3 }, 'counts match');
  assertEq(queries.length, 6, '2+1+3 INSERTs');
}

console.log('\n── loadSampleDataIntoDb: swallows errors ─────────────────');

{
  let callCount = 0;
  const fakePool = {
    query: async (_sql: string, _params: any[]) => {
      callCount++;
      // Fail every other query
      if (callCount % 2 === 0) throw new Error('duplicate key');
      return [{}];
    },
  };
  // Note: counts.marriages=0 falls through to default (10) because of
  // `counts.marriages || 10`. Use positive values to bypass defaults.
  const r = await gen.loadSampleDataIntoDb(fakePool, {
    baptisms: 4, marriages: 1, funerals: 1,
  });
  // Call sequence: 1,2,3,4 (baptism) 5 (marriage) 6 (funeral)
  // Success odd, fail even → baptisms: 1&3 OK (2); marriage: 5 OK (1); funeral: 6 fail (0)
  assertEq(r.baptisms, 2, '2 baptisms succeeded');
  assertEq(r.marriages, 1, 'marriage odd → OK');
  assertEq(r.funerals, 0, 'funeral even → failed');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
