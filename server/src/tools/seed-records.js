#!/usr/bin/env node
/**
 * seed-records.js — Interactive CLI for generating fake church records
 *
 * Usage:  node server/src/tools/seed-records.js
 *
 * Generates realistic baptism, marriage, and funeral records
 * for any om_church_## database. Menu-driven, reusable.
 */

const mysql = require('mysql2/promise');
const readline = require('readline');

// ─── DB Config ──────────────────────────────────────────────────────────────

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  port: parseInt(process.env.DB_PORT || '3306'),
  charset: 'utf8mb4',
};

// ─── Name Data ──────────────────────────────────────────────────────────────

const MALE_FIRST = [
  'Alexander', 'Andrew', 'Anthony', 'Basil', 'Benjamin', 'Charles', 'Christopher',
  'Constantine', 'Daniel', 'David', 'Demetrios', 'Dimitri', 'Edward', 'Elias',
  'Emmanuel', 'Evan', 'George', 'Gregory', 'Harry', 'Henry', 'Isaac', 'Jacob',
  'James', 'Jason', 'John', 'Jonathan', 'Joseph', 'Joshua', 'Kenneth', 'Leo',
  'Lucas', 'Mark', 'Matthew', 'Michael', 'Nathan', 'Nicholas', 'Noah', 'Oliver',
  'Patrick', 'Paul', 'Peter', 'Philip', 'Richard', 'Robert', 'Samuel', 'Sebastian',
  'Simon', 'Spyridon', 'Stefan', 'Stephen', 'Theodore', 'Thomas', 'Timothy',
  'Victor', 'Vincent', 'William', 'Zachary',
];

const FEMALE_FIRST = [
  'Adriana', 'Alexandra', 'Alexis', 'Anastasia', 'Angela', 'Anna', 'Athena',
  'Barbara', 'Catherine', 'Christina', 'Claire', 'Constance', 'Daphne', 'Diana',
  'Dorothy', 'Elena', 'Elizabeth', 'Emily', 'Eva', 'Evelyn', 'Georgia', 'Grace',
  'Hannah', 'Helen', 'Irene', 'Isabella', 'Julia', 'Katherine', 'Laura', 'Lily',
  'Lydia', 'Margaret', 'Maria', 'Marina', 'Martha', 'Mary', 'Mia', 'Natalia',
  'Nicole', 'Olivia', 'Penelope', 'Rachel', 'Rebecca', 'Sophia', 'Stella',
  'Stephanie', 'Susan', 'Tatiana', 'Theodora', 'Valentina', 'Victoria', 'Zoe',
];

const LAST_NAMES = [
  'Adams', 'Alexandros', 'Anderson', 'Angelopoulos', 'Antonopoulos', 'Baker',
  'Baxter', 'Bennett', 'Brooks', 'Campbell', 'Carter', 'Christodoulou', 'Clark',
  'Collins', 'Cooper', 'Davis', 'Dimitriou', 'Edwards', 'Evans', 'Fischer',
  'Fleming', 'Foster', 'Garcia', 'Georgiou', 'Grant', 'Green', 'Hall', 'Harris',
  'Harrison', 'Hayes', 'Henderson', 'Hughes', 'Ioannou', 'Jackson', 'Johnson',
  'Jones', 'Kallas', 'Kennedy', 'King', 'Konstantinidis', 'Kowalski', 'Lazaridis',
  'Lee', 'Lewis', 'Martin', 'Mason', 'Meyer', 'Miller', 'Mitchell', 'Moore',
  'Morgan', 'Murphy', 'Nelson', 'Nikolaou', 'Oconnor', 'Olsen', 'Pappas',
  'Parker', 'Papadopoulos', 'Peterson', 'Phillips', 'Popov', 'Price', 'Quinn',
  'Reed', 'Reynolds', 'Roberts', 'Robinson', 'Rogers', 'Ross', 'Russell',
  'Schmidt', 'Scott', 'Shaw', 'Simmons', 'Smith', 'Stavros', 'Stewart',
  'Sullivan', 'Taylor', 'Thomas', 'Thompson', 'Turner', 'Vasiliev', 'Walker',
  'Walsh', 'Ward', 'Watson', 'White', 'Williams', 'Wilson', 'Wright', 'Young',
];

const CLERGY = [
  'Fr. Alexander Karloutsos', 'Fr. Andrew Jarmus', 'Fr. Anthony Coniaris',
  'Fr. Basil Stoyka', 'Fr. Constantine Nasr', 'Fr. Daniel Byantoro',
  'Fr. Demetrios Constantelos', 'Fr. George Metallinos', 'Fr. Gregory Wingenbach',
  'Fr. James Bernstein', 'Fr. John Behr', 'Fr. John Chryssavgis',
  'Fr. John Meyendorff', 'Fr. John Peck', 'Fr. Joseph Huneycutt',
  'Fr. Mark Arey', 'Fr. Michael Oleksa', 'Fr. Nicholas Triantafilou',
  'Fr. Patrick Reardon', 'Fr. Paul Tarazi', 'Fr. Peter Gillquist',
  'Fr. Philip LeMasters', 'Fr. Seraphim Bell', 'Fr. Stephen Freeman',
  'Fr. Theodore Stylianopoulos', 'Fr. Thomas Hopko', 'Fr. Timothy Baclig',
];

const CITIES = [
  'New York, NY', 'Chicago, IL', 'Boston, MA', 'Pittsburgh, PA',
  'Philadelphia, PA', 'Detroit, MI', 'Cleveland, OH', 'San Francisco, CA',
  'Los Angeles, CA', 'Houston, TX', 'Atlanta, GA', 'Baltimore, MD',
  'Denver, CO', 'Indianapolis, IN', 'Minneapolis, MN', 'Milwaukee, WI',
  'Nashville, TN', 'Portland, OR', 'Seattle, WA', 'Washington, DC',
  'Charlotte, NC', 'Richmond, VA', 'St. Louis, MO', 'Columbus, OH',
  'Tampa, FL', 'Orlando, FL', 'Dallas, TX', 'Phoenix, AZ',
  'Sacramento, CA', 'Hartford, CT', 'Providence, RI', 'Worcester, MA',
];

const CEMETERIES = [
  'Holy Cross Cemetery', 'Resurrection Cemetery', 'St. Theodosius Cemetery',
  'All Saints Memorial Park', 'Orthodox Memorial Gardens', 'Evergreen Cemetery',
  'Mt. Olivet Cemetery', 'Calvary Cemetery', 'Cedar Grove Cemetery',
  'Greenwood Cemetery', 'Holy Trinity Cemetery', 'St. Nicholas Memorial Park',
  'Assumption Cemetery', 'Transfiguration Memorial Gardens', 'Oak Hill Cemetery',
  'Woodland Cemetery', 'Fairview Memorial Park', 'Hillside Cemetery',
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
};

function randomDate(startYear, endYear) {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

function addDays(dateStr, minDays, maxDays) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + minDays + Math.floor(Math.random() * (maxDays - minDays)));
  return d.toISOString().split('T')[0];
}

function maleName() { return { first: pick(MALE_FIRST), last: pick(LAST_NAMES) }; }
function femaleName() { return { first: pick(FEMALE_FIRST), last: pick(LAST_NAMES) }; }
function fullName(n) { return `${n.first} ${n.last}`; }

function parentPair(childLast) {
  const father = { first: pick(MALE_FIRST), last: childLast };
  // Mother keeps maiden name in records
  const mother = { first: pick(FEMALE_FIRST), last: pick(LAST_NAMES) };
  return `${fullName(father)} & ${mother.first} (${mother.last}) ${childLast}`;
}

function sponsors() {
  const count = Math.random() < 0.3 ? 2 : 1;
  if (count === 1) {
    const sponsor = Math.random() < 0.5 ? maleName() : femaleName();
    return fullName(sponsor);
  }
  return `${fullName(maleName())} & ${fullName(femaleName())}`;
}

// ─── Record Generators ─────────────────────────────────────────────────────

function generateBaptismRecord(churchId, yearRange) {
  const gender = Math.random() < 0.5 ? 'M' : 'F';
  const child = gender === 'M' ? maleName() : femaleName();
  const birthDate = randomDate(yearRange[0], yearRange[1]);
  const receptionDate = addDays(birthDate, 7, 180); // baptism 1 week to 6 months after birth

  return {
    first_name: child.first,
    last_name: child.last,
    birth_date: birthDate,
    reception_date: receptionDate,
    birthplace: pick(CITIES),
    entry_type: 'Baptism',
    sponsors: sponsors(),
    parents: parentPair(child.last),
    clergy: pick(CLERGY),
    church_id: churchId,
    ocr_confidence: null,
    verified_by: null,
    verified_at: null,
  };
}

function generateMarriageRecord(churchId, yearRange) {
  const groom = maleName();
  const bride = femaleName();
  const mdate = randomDate(yearRange[0], yearRange[1]);

  // Witnesses: 2-4 people
  const witnessCount = 2 + Math.floor(Math.random() * 3);
  const witnesses = [];
  for (let i = 0; i < witnessCount; i++) {
    witnesses.push(fullName(Math.random() < 0.5 ? maleName() : femaleName()));
  }

  // Marriage license info
  const licenseNum = `ML-${yearRange[0] + Math.floor(Math.random() * (yearRange[1] - yearRange[0]))}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
  const county = pick(['Cook County', 'Allegheny County', 'Suffolk County', 'Cuyahoga County',
    'Wayne County', 'Fulton County', 'Harris County', 'Los Angeles County',
    'Maricopa County', 'King County', 'Hennepin County', 'Marion County']);

  return {
    mdate,
    fname_groom: groom.first,
    lname_groom: groom.last,
    parentsg: parentPair(groom.last),
    fname_bride: bride.first,
    lname_bride: bride.last,
    parentsb: parentPair(bride.last),
    witness: witnesses.join(', '),
    mlicense: `License #${licenseNum}, ${county}`,
    clergy: pick(CLERGY),
    church_id: churchId,
  };
}

function generateFuneralRecord(churchId, yearRange) {
  const gender = Math.random() < 0.5 ? 'M' : 'F';
  const deceased = gender === 'M' ? maleName() : femaleName();
  const age = 25 + Math.floor(Math.random() * 70); // 25–94
  const deceasedDate = randomDate(yearRange[0], yearRange[1]);
  const burialDate = addDays(deceasedDate, 2, 7); // burial 2-7 days after death

  const cemetery = pick(CEMETERIES);
  const city = pick(CITIES);

  return {
    deceased_date: deceasedDate,
    burial_date: burialDate,
    name: deceased.first,
    lastname: deceased.last,
    age,
    clergy: pick(CLERGY),
    burial_location: `${cemetery}, ${city}`,
    church_id: churchId,
  };
}

// ─── SQL Insert Helpers ─────────────────────────────────────────────────────

async function insertBaptismRecords(conn, dbName, records) {
  if (!records.length) return 0;
  const cols = ['first_name', 'last_name', 'birth_date', 'reception_date', 'birthplace',
    'entry_type', 'sponsors', 'parents', 'clergy', 'church_id', 'ocr_confidence',
    'verified_by', 'verified_at'];
  const placeholders = records.map(() => `(${cols.map(() => '?').join(', ')})`).join(',\n');
  const values = records.flatMap(r => cols.map(c => r[c] ?? null));
  const sql = `INSERT INTO \`${dbName}\`.baptism_records (${cols.join(', ')}) VALUES ${placeholders}`;
  const [result] = await conn.query(sql, values);
  return result.affectedRows;
}

async function insertMarriageRecords(conn, dbName, records) {
  if (!records.length) return 0;
  const cols = ['mdate', 'fname_groom', 'lname_groom', 'parentsg', 'fname_bride',
    'lname_bride', 'parentsb', 'witness', 'mlicense', 'clergy', 'church_id'];
  const placeholders = records.map(() => `(${cols.map(() => '?').join(', ')})`).join(',\n');
  const values = records.flatMap(r => cols.map(c => r[c] ?? null));
  const sql = `INSERT INTO \`${dbName}\`.marriage_records (${cols.join(', ')}) VALUES ${placeholders}`;
  const [result] = await conn.query(sql, values);
  return result.affectedRows;
}

async function insertFuneralRecords(conn, dbName, records) {
  if (!records.length) return 0;
  const cols = ['deceased_date', 'burial_date', 'name', 'lastname', 'age',
    'clergy', 'burial_location', 'church_id'];
  const placeholders = records.map(() => `(${cols.map(() => '?').join(', ')})`).join(',\n');
  const values = records.flatMap(r => cols.map(c => r[c] ?? null));
  const sql = `INSERT INTO \`${dbName}\`.funeral_records (${cols.join(', ')}) VALUES ${placeholders}`;
  const [result] = await conn.query(sql, values);
  return result.affectedRows;
}

// ─── Interactive Menu ───────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function getConnection() {
  return mysql.createConnection(DB_CONFIG);
}

async function listChurches(conn) {
  const [rows] = await conn.query(
    'SELECT id, name, database_name FROM orthodoxmetrics_db.churches ORDER BY id'
  );
  return rows;
}

async function printChurches(conn) {
  const churches = await listChurches(conn);
  console.log('\n  Available Churches:');
  console.log('  ' + '-'.repeat(60));
  for (const c of churches) {
    console.log(`  [${c.id}] ${c.name}  (${c.database_name})`);
  }
  console.log('  ' + '-'.repeat(60));
  return churches;
}

async function selectChurch(conn) {
  const churches = await printChurches(conn);
  const id = parseInt(await ask('\n  Enter church ID: '));
  const church = churches.find(c => c.id === id);
  if (!church) {
    console.log('  Invalid church ID.');
    return null;
  }
  return church;
}

async function selectYearRange() {
  const input = await ask('  Year range (e.g. 1950-2020): ');
  const match = input.match(/(\d{4})\s*[-–]\s*(\d{4})/);
  if (!match) {
    console.log('  Invalid range. Using 1960-2024.');
    return [1960, 2024];
  }
  return [parseInt(match[1]), parseInt(match[2])];
}

async function selectCount() {
  const n = parseInt(await ask('  How many records? '));
  if (isNaN(n) || n < 1) {
    console.log('  Invalid count. Using 10.');
    return 10;
  }
  if (n > 5000) {
    console.log('  Capping at 5000.');
    return 5000;
  }
  return n;
}

function previewRecords(records, type) {
  console.log(`\n  Preview (first 3 of ${records.length}):`);
  console.log('  ' + '-'.repeat(70));
  const sample = records.slice(0, 3);
  for (const r of sample) {
    if (type === 'baptism') {
      console.log(`  ${r.first_name} ${r.last_name} | Born: ${r.birth_date} | Baptized: ${r.reception_date}`);
      console.log(`    Parents: ${r.parents}`);
      console.log(`    Sponsors: ${r.sponsors} | Clergy: ${r.clergy}`);
    } else if (type === 'marriage') {
      console.log(`  ${r.fname_groom} ${r.lname_groom} & ${r.fname_bride} ${r.lname_bride} | Date: ${r.mdate}`);
      console.log(`    Witnesses: ${r.witness}`);
      console.log(`    License: ${r.mlicense} | Clergy: ${r.clergy}`);
    } else if (type === 'funeral') {
      console.log(`  ${r.name} ${r.lastname} (age ${r.age}) | Died: ${r.deceased_date} | Buried: ${r.burial_date}`);
      console.log(`    Location: ${r.burial_location} | Clergy: ${r.clergy}`);
    }
    console.log('');
  }
}

async function generateFlow(conn, type) {
  const church = await selectChurch(conn);
  if (!church) return;

  const yearRange = await selectYearRange();
  const count = await selectCount();

  console.log(`\n  Generating ${count} ${type} records for ${church.name} (${yearRange[0]}-${yearRange[1]})...`);

  const records = [];
  for (let i = 0; i < count; i++) {
    if (type === 'baptism') records.push(generateBaptismRecord(church.id, yearRange));
    else if (type === 'marriage') records.push(generateMarriageRecord(church.id, yearRange));
    else if (type === 'funeral') records.push(generateFuneralRecord(church.id, yearRange));
  }

  previewRecords(records, type);

  const confirm = await ask('  Insert into database? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('  Cancelled.');
    return;
  }

  try {
    let inserted = 0;
    if (type === 'baptism') inserted = await insertBaptismRecords(conn, church.database_name, records);
    else if (type === 'marriage') inserted = await insertMarriageRecords(conn, church.database_name, records);
    else if (type === 'funeral') inserted = await insertFuneralRecords(conn, church.database_name, records);
    console.log(`\n  Inserted ${inserted} ${type} records into ${church.database_name}.${type}_records`);
  } catch (err) {
    console.error(`\n  ERROR: ${err.message}`);
    if (err.code === 'ER_NO_SUCH_TABLE') {
      console.log(`  Table ${church.database_name}.${type}_records does not exist. Create it first.`);
    }
  }
}

async function bulkFlow(conn) {
  const church = await selectChurch(conn);
  if (!church) return;

  const yearRange = await selectYearRange();
  console.log('  Counts per record type:');
  const bCount = parseInt(await ask('    Baptisms: ') || '0');
  const mCount = parseInt(await ask('    Marriages: ') || '0');
  const fCount = parseInt(await ask('    Funerals: ') || '0');

  const baptisms = Array.from({ length: bCount }, () => generateBaptismRecord(church.id, yearRange));
  const marriages = Array.from({ length: mCount }, () => generateMarriageRecord(church.id, yearRange));
  const funerals = Array.from({ length: fCount }, () => generateFuneralRecord(church.id, yearRange));

  const total = bCount + mCount + fCount;
  console.log(`\n  Generated ${total} total records (${bCount}B / ${mCount}M / ${fCount}F)`);

  if (bCount > 0) previewRecords(baptisms, 'baptism');
  if (mCount > 0) previewRecords(marriages, 'marriage');
  if (fCount > 0) previewRecords(funerals, 'funeral');

  const confirm = await ask('  Insert ALL into database? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('  Cancelled.');
    return;
  }

  try {
    let bi = 0, mi = 0, fi = 0;
    if (bCount > 0) bi = await insertBaptismRecords(conn, church.database_name, baptisms);
    if (mCount > 0) mi = await insertMarriageRecords(conn, church.database_name, marriages);
    if (fCount > 0) fi = await insertFuneralRecords(conn, church.database_name, funerals);
    console.log(`\n  Inserted: ${bi} baptisms, ${mi} marriages, ${fi} funerals into ${church.database_name}`);
  } catch (err) {
    console.error(`\n  ERROR: ${err.message}`);
  }
}

async function purgeFlow(conn) {
  const church = await selectChurch(conn);
  if (!church) return;

  console.log(`\n  WARNING: This will DELETE records from ${church.database_name}`);
  console.log('  Which tables to purge?');
  console.log('  [1] baptism_records');
  console.log('  [2] marriage_records');
  console.log('  [3] funeral_records');
  console.log('  [4] ALL three tables');

  const choice = await ask('  Choice: ');
  const tables = [];
  if (choice === '1' || choice === '4') tables.push('baptism_records');
  if (choice === '2' || choice === '4') tables.push('marriage_records');
  if (choice === '3' || choice === '4') tables.push('funeral_records');

  if (!tables.length) { console.log('  Invalid choice.'); return; }

  for (const t of tables) {
    const [countRows] = await conn.query(`SELECT COUNT(*) AS cnt FROM \`${church.database_name}\`.${t} WHERE church_id = ?`, [church.id]);
    console.log(`  ${t}: ${countRows[0].cnt} rows`);
  }

  const confirm = await ask(`\n  Type "DELETE" to confirm purge: `);
  if (confirm !== 'DELETE') { console.log('  Cancelled.'); return; }

  for (const t of tables) {
    const [result] = await conn.query(`DELETE FROM \`${church.database_name}\`.${t} WHERE church_id = ?`, [church.id]);
    console.log(`  Deleted ${result.affectedRows} rows from ${t}`);
  }
}

async function countFlow(conn) {
  const church = await selectChurch(conn);
  if (!church) return;

  console.log(`\n  Record counts for ${church.name} (${church.database_name}):`);
  for (const t of ['baptism_records', 'marriage_records', 'funeral_records']) {
    try {
      const [rows] = await conn.query(`SELECT COUNT(*) AS cnt FROM \`${church.database_name}\`.${t} WHERE church_id = ?`, [church.id]);
      console.log(`    ${t}: ${rows[0].cnt}`);
    } catch {
      console.log(`    ${t}: (table not found)`);
    }
  }
}

async function main() {
  let conn;
  try {
    conn = await getConnection();
    console.log('  Connected to database.');
  } catch (err) {
    console.error(`Failed to connect: ${err.message}`);
    process.exit(1);
  }

  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║   Orthodox Metrics — Record Seed Tool    ║');
  console.log('  ╚══════════════════════════════════════════╝');

  while (true) {
    console.log('');
    console.log('  ┌────────────────────────────────────────┐');
    console.log('  │  1) Generate Baptism Records           │');
    console.log('  │  2) Generate Marriage Records           │');
    console.log('  │  3) Generate Funeral Records            │');
    console.log('  │  4) Bulk Generate (all types at once)   │');
    console.log('  │  5) View Record Counts                  │');
    console.log('  │  6) Purge Records                       │');
    console.log('  │  7) List Churches                       │');
    console.log('  │  0) Exit                                │');
    console.log('  └────────────────────────────────────────┘');

    const choice = await ask('  > ');

    switch (choice.trim()) {
      case '1': await generateFlow(conn, 'baptism'); break;
      case '2': await generateFlow(conn, 'marriage'); break;
      case '3': await generateFlow(conn, 'funeral'); break;
      case '4': await bulkFlow(conn); break;
      case '5': await countFlow(conn); break;
      case '6': await purgeFlow(conn); break;
      case '7': await printChurches(conn); break;
      case '0': case 'q': case 'exit':
        console.log('  Goodbye.');
        rl.close();
        await conn.end();
        process.exit(0);
      default:
        console.log('  Invalid choice.');
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
