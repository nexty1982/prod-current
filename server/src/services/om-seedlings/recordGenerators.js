/**
 * Record Generators — Produce realistic baptism, marriage, and funeral records
 *
 * Generates historically plausible sacramental records with:
 * - Period-appropriate Orthodox names
 * - Realistic age distributions
 * - Growth-curve-aware date distribution (via scopeMatrix byYear counts)
 * - Sponsor/parent/clergy patterns
 * - No duplicate spouse combos, no impossible chronology
 */

// ─── Name Data ──────────────────────────────────────────────────────────────

const MALE_FIRST = [
  // Slavic/Russian Orthodox
  'Alexander', 'Alexei', 'Andrei', 'Boris', 'Constantine', 'Daniel', 'Demetrios',
  'Dimitri', 'Dmitry', 'Elias', 'Emmanuel', 'Feodor', 'George', 'Gregory', 'Igor',
  'Ivan', 'Jacob', 'James', 'John', 'Joseph', 'Leo', 'Mark', 'Matthew', 'Michael',
  'Nicholas', 'Nikolai', 'Paul', 'Peter', 'Philip', 'Raphael', 'Samuel', 'Sergei',
  'Simeon', 'Simon', 'Spyridon', 'Stefan', 'Stephen', 'Theodore', 'Thomas',
  'Timothy', 'Vasili', 'Victor', 'Vladimir', 'William', 'Zachary',
  // Greek/Antiochian Orthodox
  'Andreas', 'Anthony', 'Athanasios', 'Basil', 'Christos', 'Costas', 'Evangelos',
  'Georgios', 'Ioannis', 'Konstantinos', 'Nektarios', 'Panagiotis', 'Pavlos',
  'Petros', 'Spiros', 'Stavros', 'Themistocles', 'Vasilios',
  // American converts / mixed
  'Benjamin', 'Charles', 'Christopher', 'David', 'Edward', 'Evan', 'Henry',
  'Isaac', 'Jason', 'Jonathan', 'Joshua', 'Kenneth', 'Lucas', 'Nathan',
  'Noah', 'Oliver', 'Patrick', 'Richard', 'Robert', 'Sebastian', 'Vincent',
];

const FEMALE_FIRST = [
  // Slavic/Russian Orthodox
  'Aleksandra', 'Anastasia', 'Anna', 'Daria', 'Elena', 'Ekaterina', 'Galina',
  'Irina', 'Katarina', 'Larisa', 'Lidia', 'Ludmila', 'Maria', 'Marina',
  'Nadezhda', 'Natalia', 'Olga', 'Raisa', 'Svetlana', 'Tamara', 'Tatiana',
  'Valentina', 'Vera', 'Xenia', 'Zoya',
  // Greek/Antiochian
  'Adriana', 'Alexandra', 'Angela', 'Athena', 'Barbara', 'Catherine', 'Christina',
  'Constance', 'Daphne', 'Diana', 'Dorothy', 'Eleni', 'Georgia', 'Helen',
  'Irene', 'Kalliope', 'Panagiota', 'Penelope', 'Sophia', 'Stavroula',
  'Theodora', 'Vasiliki',
  // American converts / mixed
  'Claire', 'Elizabeth', 'Emily', 'Eva', 'Evelyn', 'Grace', 'Hannah',
  'Isabella', 'Julia', 'Katherine', 'Laura', 'Lily', 'Margaret', 'Martha',
  'Mary', 'Mia', 'Nicole', 'Olivia', 'Rachel', 'Rebecca', 'Sarah',
  'Stephanie', 'Susan', 'Victoria', 'Zoe',
];

const LAST_NAMES = [
  // Slavic
  'Adamov', 'Alexeev', 'Baranov', 'Bogdanov', 'Chernyshev', 'Dmitriev', 'Fedorov',
  'Grigoryev', 'Ivanov', 'Kovalenko', 'Kozlov', 'Kuznetsov', 'Lebedev', 'Makarov',
  'Morozov', 'Nikolaev', 'Novikov', 'Pavlov', 'Petrov', 'Popov', 'Smirnov',
  'Sokolov', 'Vasiliev', 'Volkov', 'Zaytsev',
  // Greek
  'Alexandros', 'Angelopoulos', 'Antonopoulos', 'Christodoulou', 'Dimitriou',
  'Georgiou', 'Ioannou', 'Kallas', 'Konstantinidis', 'Lazaridis', 'Nikolaou',
  'Papadopoulos', 'Pappas', 'Stavros', 'Theodoridis',
  // American/mixed
  'Adams', 'Anderson', 'Baker', 'Bennett', 'Brooks', 'Campbell', 'Carter',
  'Clark', 'Collins', 'Cooper', 'Davis', 'Edwards', 'Evans', 'Foster',
  'Garcia', 'Grant', 'Green', 'Hall', 'Harris', 'Hayes', 'Henderson',
  'Hughes', 'Jackson', 'Johnson', 'Jones', 'King', 'Lee', 'Lewis',
  'Martin', 'Mason', 'Miller', 'Mitchell', 'Moore', 'Morgan', 'Murphy',
  'Nelson', 'Parker', 'Peterson', 'Phillips', 'Price', 'Reed', 'Roberts',
  'Robinson', 'Rogers', 'Ross', 'Russell', 'Scott', 'Smith', 'Stewart',
  'Sullivan', 'Taylor', 'Thomas', 'Thompson', 'Turner', 'Walker', 'Walsh',
  'Ward', 'Watson', 'White', 'Williams', 'Wilson', 'Wright', 'Young',
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
  'Fr. Alexei Krindatch', 'Fr. David Brum', 'Fr. Herman Shick',
  'Fr. Innocent Neal', 'Fr. Justin Patterson', 'Fr. Kirill Sokolov',
  'Fr. Matthew Baker', 'Fr. Raphael Morgan', 'Fr. Tikhon Fitzgerald',
];

const CITIES = [
  'New York, NY', 'Chicago, IL', 'Boston, MA', 'Pittsburgh, PA',
  'Philadelphia, PA', 'Detroit, MI', 'Cleveland, OH', 'San Francisco, CA',
  'Los Angeles, CA', 'Houston, TX', 'Atlanta, GA', 'Baltimore, MD',
  'Denver, CO', 'Indianapolis, IN', 'Minneapolis, MN', 'Milwaukee, WI',
  'Nashville, TN', 'Portland, OR', 'Seattle, WA', 'Washington, DC',
  'Charlotte, NC', 'Richmond, VA', 'St. Louis, MO', 'Columbus, OH',
  'Tampa, FL', 'Dallas, TX', 'Phoenix, AZ', 'Sacramento, CA',
  'Hartford, CT', 'Providence, RI', 'Bayonne, NJ', 'Clifton, NJ',
  'Newark, NJ', 'Passaic, NJ', 'Perth Amboy, NJ', 'Jersey City, NJ',
  'Hempstead, NY', 'Yonkers, NY', 'Syracuse, NY', 'Albany, NY',
];

const CEMETERIES = [
  'Holy Cross Cemetery', 'Resurrection Cemetery', 'St. Theodosius Cemetery',
  'All Saints Memorial Park', 'Orthodox Memorial Gardens', 'Evergreen Cemetery',
  'Mt. Olivet Cemetery', 'Calvary Cemetery', 'Cedar Grove Cemetery',
  'Greenwood Cemetery', 'Holy Trinity Cemetery', 'St. Nicholas Memorial Park',
  'Assumption Cemetery', 'Transfiguration Memorial Gardens', 'Oak Hill Cemetery',
  'Woodland Cemetery', 'Fairview Memorial Park', 'Hillside Cemetery',
  'Pine Lawn Memorial Park', 'Rest Haven Cemetery',
];

const COUNTIES = [
  'Cook County', 'Allegheny County', 'Suffolk County', 'Cuyahoga County',
  'Wayne County', 'Fulton County', 'Harris County', 'Los Angeles County',
  'Maricopa County', 'King County', 'Hennepin County', 'Marion County',
  'Hudson County', 'Passaic County', 'Bergen County', 'Essex County',
  'Middlesex County', 'Westchester County', 'Nassau County', 'Onondaga County',
];

const ENTRY_TYPES = [
  { value: 'Baptism', weight: 75 },
  { value: 'Baptism & Chrismation', weight: 10 },
  { value: 'Reception by Chrismation', weight: 10 },
  { value: 'Adult Baptism', weight: 5 },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function weightedPick(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function randomDate(year) {
  const month = 1 + Math.floor(Math.random() * 12);
  const maxDay = new Date(year, month, 0).getDate();
  const day = 1 + Math.floor(Math.random() * maxDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(dateStr, minDays, maxDays) {
  const dt = new Date(dateStr);
  dt.setDate(dt.getDate() + minDays + Math.floor(Math.random() * (maxDays - minDays)));
  return dt.toISOString().split('T')[0];
}

function maleName() { return { first: pick(MALE_FIRST), last: pick(LAST_NAMES) }; }
function femaleName() { return { first: pick(FEMALE_FIRST), last: pick(LAST_NAMES) }; }
function fullName(n) { return `${n.first} ${n.last}`; }

function parentString(childLast) {
  const father = { first: pick(MALE_FIRST), last: childLast };
  const motherMaiden = pick(LAST_NAMES);
  const mother = { first: pick(FEMALE_FIRST), last: childLast };
  return `${fullName(father)} & ${mother.first} (${motherMaiden}) ${childLast}`;
}

// Assign 1-2 clergy per church to be the "rector" — use predominantly
function pickClergy(rectorPool) {
  // 80% chance of rector, 20% chance of guest/visiting
  if (rectorPool && rectorPool.length > 0 && Math.random() < 0.8) {
    return pick(rectorPool);
  }
  return pick(CLERGY);
}

// ─── Baptism Generator ──────────────────────────────────────────────────────

function generateBaptismRecord(year, churchId, rectorPool) {
  const isMale = Math.random() < 0.5;
  const child = isMale ? maleName() : femaleName();
  const birthDate = randomDate(year);

  // Infants baptized 7-180 days after birth (most within 40-120 days)
  const entryType = weightedPick(ENTRY_TYPES);
  const isAdult = entryType === 'Adult Baptism' || entryType === 'Reception by Chrismation';

  let receptionDate;
  if (isAdult) {
    // Adult: baptism date is the event itself, birth date is years earlier
    receptionDate = randomDate(year);
    const age = 18 + Math.floor(Math.random() * 45);
    const bYear = year - age;
    child.birthDate = randomDate(bYear);
  } else {
    child.birthDate = birthDate;
    receptionDate = addDays(birthDate, 7, 180);
  }

  // Sponsors: 1-2 people
  const hasTwoSponsors = Math.random() < 0.3;
  const sponsors = hasTwoSponsors
    ? `${fullName(Math.random() < 0.5 ? maleName() : femaleName())} & ${fullName(Math.random() < 0.5 ? maleName() : femaleName())}`
    : fullName(Math.random() < 0.5 ? maleName() : femaleName());

  return {
    first_name: child.first,
    last_name: child.last,
    birth_date: isAdult ? child.birthDate : birthDate,
    reception_date: receptionDate,
    birthplace: pick(CITIES),
    entry_type: entryType,
    sponsors,
    parents: isAdult ? null : parentString(child.last),
    clergy: pickClergy(rectorPool),
    church_id: churchId,
  };
}

// ─── Marriage Generator ─────────────────────────────────────────────────────

function generateMarriageRecord(year, churchId, rectorPool, usedCombos) {
  let groom, bride, comboKey;

  // Ensure no duplicate spouse combinations
  let attempts = 0;
  do {
    groom = maleName();
    bride = femaleName();
    comboKey = `${groom.first}|${groom.last}|${bride.first}|${bride.last}`;
    attempts++;
  } while (usedCombos.has(comboKey) && attempts < 20);
  usedCombos.add(comboKey);

  const mdate = randomDate(year);

  // 2-4 witnesses
  const witnessCount = 2 + Math.floor(Math.random() * 3);
  const witnesses = [];
  for (let i = 0; i < witnessCount; i++) {
    witnesses.push(fullName(Math.random() < 0.5 ? maleName() : femaleName()));
  }

  const licenseYear = year;
  const licenseNum = String(Math.floor(Math.random() * 9999)).padStart(4, '0');

  return {
    mdate,
    fname_groom: groom.first,
    lname_groom: groom.last,
    parentsg: parentString(groom.last),
    fname_bride: bride.first,
    lname_bride: bride.last,
    parentsb: parentString(bride.last),
    witness: witnesses.join(', '),
    mlicense: `License #ML-${licenseYear}-${licenseNum}, ${pick(COUNTIES)}`,
    clergy: pickClergy(rectorPool),
    church_id: churchId,
  };
}

// ─── Funeral Generator ──────────────────────────────────────────────────────

function generateFuneralRecord(year, churchId, rectorPool) {
  const isMale = Math.random() < 0.5;
  const deceased = isMale ? maleName() : femaleName();
  const deceasedDate = randomDate(year);

  // Age distribution: mostly elderly, some middle-aged, rare young
  let age;
  const ageRoll = Math.random();
  if (ageRoll < 0.02) {
    age = Math.floor(Math.random() * 10); // infant/child (2%)
  } else if (ageRoll < 0.08) {
    age = 10 + Math.floor(Math.random() * 30); // young adult (6%)
  } else if (ageRoll < 0.25) {
    age = 40 + Math.floor(Math.random() * 20); // middle-aged (17%)
  } else {
    age = 60 + Math.floor(Math.random() * 35); // elderly (75%)
  }

  return {
    deceased_date: deceasedDate,
    burial_date: addDays(deceasedDate, 2, 7),
    name: deceased.first,
    lastname: deceased.last,
    age,
    clergy: pickClergy(rectorPool),
    burial_location: `${pick(CEMETERIES)}, ${pick(CITIES)}`,
    church_id: churchId,
  };
}

// ─── Batch Generator ────────────────────────────────────────────────────────

/**
 * Generate all records for a church based on byYear plan from scopeMatrix.
 *
 * @param {object} byYear - { [year]: { baptism: N, marriage: N, funeral: N } }
 * @param {number} churchId
 * @param {string[]} [recordTypes] - Subset of types to generate
 * @returns {{ baptism: object[], marriage: object[], funeral: object[] }}
 */
function generateRecordsForChurch(byYear, churchId, recordTypes = ['baptism', 'marriage', 'funeral']) {
  const records = { baptism: [], marriage: [], funeral: [] };
  const marriageCombos = new Set();

  // Assign 1-2 "rectors" for this church for consistency
  const rectorPool = [];
  rectorPool.push(pick(CLERGY));
  if (Math.random() < 0.4) rectorPool.push(pick(CLERGY));

  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);

  for (const year of years) {
    const plan = byYear[year];

    if (recordTypes.includes('baptism')) {
      for (let i = 0; i < (plan.baptism || 0); i++) {
        records.baptism.push(generateBaptismRecord(year, churchId, rectorPool));
      }
    }

    if (recordTypes.includes('marriage')) {
      for (let i = 0; i < (plan.marriage || 0); i++) {
        records.marriage.push(generateMarriageRecord(year, churchId, rectorPool, marriageCombos));
      }
    }

    if (recordTypes.includes('funeral')) {
      for (let i = 0; i < (plan.funeral || 0); i++) {
        records.funeral.push(generateFuneralRecord(year, churchId, rectorPool));
      }
    }
  }

  return records;
}

module.exports = {
  generateBaptismRecord,
  generateMarriageRecord,
  generateFuneralRecord,
  generateRecordsForChurch,
};
