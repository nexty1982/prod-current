#!/usr/bin/env node
/**
 * One-time seed script: populate the 48 churches that have 0 records
 * with realistic baptism, marriage, and funeral records.
 *
 * Usage: node scripts/seed-empty-churches.js
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: '192.168.1.241',
  user: 'orthodoxapps',
  password: 'Summerof1982@!',
  waitForConnections: true,
  connectionLimit: 5,
};

// ── Name pools ──────────────────────────────────────────────────

const MALE_FIRST = [
  'Alexander','Andrew','Anthony','Basil','Boris','Christopher','Constantine','Daniel',
  'David','Dimitri','Eugene','George','Gregory','Igor','Ivan','James','John','Joseph',
  'Kyrill','Leonid','Michael','Nicholas','Paul','Peter','Philip','Sergei','Simon',
  'Stephen','Theodore','Thomas','Timothy','Victor','Vladimir','Yuri','Alexei','Adrian',
  'Arseniy','Maxim','Roman','Nikolai','Anatoly','Feodor','Andrei','Mikhail','Oleg',
  'Pavel','Stefan','Tikhon','Vasily','Georgy',
];

const FEMALE_FIRST = [
  'Alexandra','Anastasia','Anna','Catherine','Christina','Daria','Elena','Elizabeth',
  'Galina','Helen','Irene','Julia','Katherine','Larissa','Maria','Marina','Nadia',
  'Natalia','Nina','Olga','Paulina','Sophia','Tatiana','Valentina','Vera','Xenia',
  'Zoe','Ludmila','Paraskeva','Tamara','Seraphima','Ekaterina','Lydia','Raisa',
  'Svetlana','Yelena','Zinaida','Evdokia','Matrona','Euphemia',
];

const LAST_NAMES = [
  'Abramov','Antonov','Baranov','Bogdanov','Chernov','Davidov','Egorov','Fedorov',
  'Gavrilov','Grigoryev','Ivanov','Kalinin','Karpov','Klimov','Kozlov','Kuznetsov',
  'Lebedev','Makarov','Morozov','Nikitin','Novikov','Orlov','Pavlov','Petrov',
  'Popov','Romanov','Smirnov','Sokolov','Volkov','Voronov','Yakimov','Zaitsev',
  'Adamov','Belov','Danilov','Efimov','Frolov','Golubev','Kovalev','Litvinov',
  'Medvedev','Naumov','Osipov','Polyakov','Rozhkov','Savchenko','Tarasov','Ushakov',
  'Vinogradov','Zhukov','Kiselev','Stepanov','Andreev','Maksimov','Alekseev','Yakovlev',
  'Sorokin','Nikolaev','Zakharov','Korolyov',
];

const CLERGY = [
  'Rev. Alexander Petrov','Rev. Andrew Kozlov','Rev. Basil Morozov','Rev. Christopher Volkov',
  'Rev. Daniel Smirnov','Rev. Eugene Ivanov','Rev. George Fedorov','Rev. Gregory Popov',
  'Rev. James Lebedev','Rev. John Novikov','Rev. Joseph Sokolov','Rev. Michael Orlov',
  'Rev. Nicholas Pavlov','Rev. Paul Kuznetsov','Rev. Peter Zaitsev','Rev. Sergei Romanov',
  'Rev. Stephen Klimov','Rev. Theodore Gavrilov','Rev. Timothy Baranov','Rev. Vladimir Davidov',
  'Archbishop Nikon','Archbishop Michael','Bishop Tikhon','Bishop Seraphim',
  'Archpriest Dimitri Kalinin','Archpriest Boris Nikitin','Hieromonk Alexei',
];

const CITIES = [
  'Somerville, NJ','Bridgewater, NJ','Plainfield, NJ','New Brunswick, NJ',
  'Morristown, NJ','Newark, NJ','Trenton, NJ','Princeton, NJ',
  'Philadelphia, PA','Pittsburgh, PA','Scranton, PA','Allentown, PA',
  'New York, NY','Brooklyn, NY','Yonkers, NY','Albany, NY',
  'Hartford, CT','Bridgeport, CT','New Haven, CT',
  'Boston, MA','Worcester, MA','Springfield, MA',
  'Washington, DC','Baltimore, MD','Richmond, VA',
  'Cleveland, OH','Chicago, IL','Detroit, MI',
  'Paramus, NJ','South River, NJ','Perth Amboy, NJ','Bayonne, NJ',
];

const CEMETERIES = [
  'Ss. Peter & Paul Cemetery, Hillsborough, NJ',
  'St. Tikhons Cemetery, South Canaan, PA',
  'Hillside Cemetery, Plainfield, NJ',
  'Resurrection Cemetery, Piscataway, NJ',
  'Holy Cross Cemetery, Brooklyn, NY',
  'St. Vladimir Cemetery, Jackson, NJ',
  'Holy Trinity Cemetery, Yonkers, NY',
  'Rosedale Cemetery, Orange, NJ',
  'Gate of Heaven Cemetery, East Hanover, NJ',
  'St. Andrew Cemetery, South Bound Brook, NJ',
  'Graceland Memorial Park, Kenilworth, NJ',
  'Cedar Hill Cemetery, Newburgh, NY',
];

const ENTRY_TYPES = [
  { type: 'Baptism', weight: 85 },
  { type: 'Chrismation', weight: 12 },
  { type: 'Baptism / Chrismation', weight: 3 },
];

// ── Helpers ──────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function weightedPick(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.type;
  }
  return items[0].type;
}

function randomDate(startYear, endYear) {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().slice(0, 10);
}

function randomDateAfter(dateStr, maxDaysAfter = 60) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + Math.floor(Math.random() * maxDaysAfter) + 1);
  return d.toISOString().slice(0, 10);
}

function pickClergy(churchClergy) {
  return pick(churchClergy);
}

// Each church gets 2-4 assigned clergy for consistency
function assignClergy() {
  const count = 2 + Math.floor(Math.random() * 3);
  const shuffled = [...CLERGY].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Generate a record count that looks like a real parish
// Small parishes: 20-80, medium: 100-400, large: 500-1100
function generateRecordCount() {
  const r = Math.random();
  if (r < 0.25) return 20 + Math.floor(Math.random() * 60);       // small
  if (r < 0.60) return 100 + Math.floor(Math.random() * 300);     // medium
  if (r < 0.85) return 400 + Math.floor(Math.random() * 300);     // larger
  return 700 + Math.floor(Math.random() * 400);                    // large
}

// ── Record generators ────────────────────────────────────────────

function generateBaptismRecord(churchId, churchClergy) {
  const isMale = Math.random() < 0.5;
  const firstName = isMale ? pick(MALE_FIRST) : pick(FEMALE_FIRST);
  const lastName = pick(LAST_NAMES);
  const birthDate = randomDate(1920, 2024);
  const receptionDate = randomDateAfter(birthDate, 365);
  const entryType = weightedPick(ENTRY_TYPES);

  const fatherFirst = pick(MALE_FIRST);
  const motherFirst = pick(FEMALE_FIRST);
  const motherMaiden = pick(LAST_NAMES);
  const parents = `${fatherFirst} ${lastName} & ${motherFirst} ${motherMaiden} ${lastName}`;

  const sponsor1 = `${pick(MALE_FIRST)} ${pick(LAST_NAMES)}`;
  const sponsor2 = `${pick(FEMALE_FIRST)} ${pick(LAST_NAMES)}`;
  const sponsors = `${sponsor1} ${sponsor2}`;

  // Return as object — caller will pick columns that exist in the target table
  return {
    first_name: firstName,
    last_name: lastName,
    birth_date: birthDate,
    reception_date: receptionDate,
    birthplace: pick(CITIES),
    entry_type: entryType,
    sponsors,
    parents,
    clergy: pickClergy(churchClergy),
    church_id: churchId,
    source_scan_id: null,
    ocr_confidence: '0.00',
    verified_by: null,
    verified_at: null,
  };
}

function generateMarriageRecord(churchId, churchClergy) {
  const groomFirst = pick(MALE_FIRST);
  const groomLast = pick(LAST_NAMES);
  const brideFirst = pick(FEMALE_FIRST);
  const brideLast = pick(LAST_NAMES);
  const mdate = randomDate(1920, 2024);

  const parentsgFather = pick(MALE_FIRST);
  const parentsgMother = pick(FEMALE_FIRST);
  const parentsg = `${parentsgFather} & ${parentsgMother}`;

  const parentsbFather = pick(MALE_FIRST);
  const parentsbMother = pick(FEMALE_FIRST);
  const parentsb = `${parentsbFather} & ${parentsbMother}`;

  const witness1 = `${pick(MALE_FIRST)} ${pick(LAST_NAMES)}`;
  const witness2 = `${pick(FEMALE_FIRST)} ${pick(LAST_NAMES)}`;
  const witness = `${witness1} ${witness2}`;

  return {
    mdate,
    fname_groom: groomFirst,
    lname_groom: groomLast,
    parentsg,
    fname_bride: brideFirst,
    lname_bride: brideLast,
    parentsb,
    witness,
    mlicense: null,
    clergy: pickClergy(churchClergy),
    church_id: churchId,
  };
}

function generateFuneralRecord(churchId, churchClergy) {
  const isMale = Math.random() < 0.5;
  const firstName = isMale ? pick(MALE_FIRST) : pick(FEMALE_FIRST);
  const lastName = pick(LAST_NAMES);
  const age = 40 + Math.floor(Math.random() * 50); // 40-89
  const deceasedDate = randomDate(1920, 2025);
  const burialDate = randomDateAfter(deceasedDate, 7);

  return {
    deceased_date: deceasedDate,
    burial_date: burialDate,
    name: firstName,
    lastname: lastName,
    age,
    clergy: pickClergy(churchClergy),
    burial_location: pick(CEMETERIES),
    church_id: churchId,
  };
}

// Get columns for a table in a specific database, excluding 'id' and 'seed_run_id'
async function getTableColumns(pool, dbName, tableName) {
  const [cols] = await pool.query(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME NOT IN (?, ?) ORDER BY ORDINAL_POSITION',
    [dbName, tableName, 'id', 'seed_run_id']
  );
  return cols.map(c => c.COLUMN_NAME);
}

// Batch insert records using only columns that exist in the target table
async function batchInsert(pool, tableName, columns, records, batchSize = 200) {
  const colList = columns.join(', ');
  const placeholder = '(' + columns.map(() => '?').join(',') + ')';

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const placeholders = batch.map(() => placeholder).join(',');
    const flat = batch.flatMap(rec => columns.map(col => rec[col] !== undefined ? rec[col] : null));
    await pool.query(`INSERT INTO ${tableName} (${colList}) VALUES ${placeholders}`, flat);
  }
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  const appPool = mysql.createPool({ ...DB_CONFIG, database: 'orthodoxmetrics_db' });

  // Get all churches with database_name
  const [allChurches] = await appPool.query(
    `SELECT id, name, church_name, database_name FROM churches WHERE database_name IS NOT NULL ORDER BY id`
  );

  // Find empty ones by checking each tenant DB
  const emptyChurches = [];
  for (const church of allChurches) {
    try {
      const tenantPool = mysql.createPool({ ...DB_CONFIG, database: church.database_name });
      const [[{ cnt }]] = await tenantPool.query('SELECT COUNT(*) as cnt FROM baptism_records');
      const [[{ cnt: mcnt }]] = await tenantPool.query('SELECT COUNT(*) as cnt FROM marriage_records');
      const [[{ cnt: fcnt }]] = await tenantPool.query('SELECT COUNT(*) as cnt FROM funeral_records');
      await tenantPool.end();
      if (cnt + mcnt + fcnt === 0) {
        emptyChurches.push(church);
      }
    } catch (e) {
      console.warn(`  Skipping ${church.database_name}: ${e.message}`);
    }
  }

  console.log(`Found ${emptyChurches.length} empty churches to seed.\n`);

  let totalBaptisms = 0, totalMarriages = 0, totalFunerals = 0;

  // Use a shared pool for schema discovery
  const infoPool = mysql.createPool({ ...DB_CONFIG, database: 'information_schema' });

  for (const church of emptyChurches) {
    const churchClergy = assignClergy();
    const baptismCount = generateRecordCount();
    const marriageRatio = 0.35 + Math.random() * 0.15; // 35-50% of baptisms
    const funeralRatio = 0.25 + Math.random() * 0.20;  // 25-45% of baptisms
    const marriageCount = Math.round(baptismCount * marriageRatio);
    const funeralCount = Math.round(baptismCount * funeralRatio);

    console.log(`Seeding ${church.church_name || church.name} (${church.database_name}): B=${baptismCount} M=${marriageCount} F=${funeralCount}`);

    const tenantPool = mysql.createPool({ ...DB_CONFIG, database: church.database_name });

    // Discover actual columns for each table in this church's DB
    const bCols = await getTableColumns(infoPool, church.database_name, 'baptism_records');
    const mCols = await getTableColumns(infoPool, church.database_name, 'marriage_records');
    const fCols = await getTableColumns(infoPool, church.database_name, 'funeral_records');

    // Generate and insert baptism records
    const baptismRows = Array.from({ length: baptismCount }, () => generateBaptismRecord(church.id, churchClergy));
    await batchInsert(tenantPool, 'baptism_records', bCols, baptismRows);

    // Generate and insert marriage records
    const marriageRows = Array.from({ length: marriageCount }, () => generateMarriageRecord(church.id, churchClergy));
    await batchInsert(tenantPool, 'marriage_records', mCols, marriageRows);

    // Generate and insert funeral records
    const funeralRows = Array.from({ length: funeralCount }, () => generateFuneralRecord(church.id, churchClergy));
    await batchInsert(tenantPool, 'funeral_records', fCols, funeralRows);

    totalBaptisms += baptismCount;
    totalMarriages += marriageCount;
    totalFunerals += funeralCount;
    await tenantPool.end();
  }

  await infoPool.end();

  console.log(`\n✅ Done! Seeded ${emptyChurches.length} churches.`);
  console.log(`   Baptisms: ${totalBaptisms}, Marriages: ${totalMarriages}, Funerals: ${totalFunerals}`);
  console.log(`   Total records: ${totalBaptisms + totalMarriages + totalFunerals}`);

  await appPool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
