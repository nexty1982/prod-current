/**
 * Record Creation Wizard API
 * Comprehensive endpoints for wizard-based record generation with
 * configurable fields, batch creation, validation, and presets.
 *
 * Mounted at /api/admin/record-wizard
 */
const express = require('express');
const router = express.Router();

// ============================================================================
// NAME DATA & GENERATION CONSTANTS
// ============================================================================
const MALE_NAMES = ['Alexander','Andrew','Anthony','Basil','Benjamin','Charles','Christopher','Constantine','Daniel','David','Demetrios','Dimitri','Edward','Elias','Emmanuel','Evan','George','Gregory','Harry','Henry','Isaac','Jacob','James','Jason','John','Jonathan','Joseph','Joshua','Kenneth','Leo','Lucas','Mark','Matthew','Michael','Nathan','Nicholas','Noah','Oliver','Patrick','Paul','Peter','Philip','Richard','Robert','Samuel','Sebastian','Simon','Spyridon','Stefan','Stephen','Theodore','Thomas','Timothy','Victor','Vincent','William','Zachary'];
const FEMALE_NAMES = ['Adriana','Alexandra','Alexis','Anastasia','Angela','Anna','Athena','Barbara','Catherine','Christina','Claire','Constance','Daphne','Diana','Dorothy','Elena','Elizabeth','Emily','Eva','Evelyn','Georgia','Grace','Hannah','Helen','Irene','Isabella','Julia','Katherine','Laura','Lily','Lydia','Margaret','Maria','Marina','Martha','Mary','Mia','Natalia','Nicole','Olivia','Penelope','Rachel','Rebecca','Sophia','Stella','Stephanie','Susan','Tatiana','Theodora','Valentina','Victoria','Zoe'];
const LAST_NAMES = ['Adams','Alexandros','Anderson','Angelopoulos','Antonopoulos','Baker','Baxter','Bennett','Brooks','Campbell','Carter','Christodoulou','Clark','Collins','Cooper','Davis','Dimitriou','Edwards','Evans','Fischer','Fleming','Foster','Garcia','Georgiou','Grant','Green','Hall','Harris','Harrison','Hayes','Henderson','Hughes','Ioannou','Jackson','Johnson','Jones','Kallas','Kennedy','King','Konstantinidis','Kowalski','Lazaridis','Lee','Lewis','Martin','Mason','Meyer','Miller','Mitchell','Moore','Morgan','Murphy','Nelson','Nikolaou','Oconnor','Olsen','Pappas','Parker','Papadopoulos','Peterson','Phillips','Popov','Price','Quinn','Reed','Reynolds','Roberts','Robinson','Rogers','Ross','Russell','Schmidt','Scott','Shaw','Simmons','Smith','Stavros','Stewart','Sullivan','Taylor','Thomas','Thompson','Turner','Vasiliev','Walker','Walsh','Ward','Watson','White','Williams','Wilson','Wright','Young'];
const CLERGY_LIST = ['Fr. Alexander Karloutsos','Fr. Andrew Jarmus','Fr. Anthony Coniaris','Fr. Basil Stoyka','Fr. Constantine Nasr','Fr. Daniel Byantoro','Fr. Demetrios Constantelos','Fr. George Metallinos','Fr. Gregory Wingenbach','Fr. James Bernstein','Fr. John Behr','Fr. John Chryssavgis','Fr. John Meyendorff','Fr. John Peck','Fr. Joseph Huneycutt','Fr. Mark Arey','Fr. Michael Oleksa','Fr. Nicholas Triantafilou','Fr. Patrick Reardon','Fr. Paul Tarazi','Fr. Peter Gillquist','Fr. Philip LeMasters','Fr. Seraphim Bell','Fr. Stephen Freeman','Fr. Theodore Stylianopoulos','Fr. Thomas Hopko','Fr. Timothy Baclig'];
const CITIES = ['New York, NY','Chicago, IL','Boston, MA','Pittsburgh, PA','Philadelphia, PA','Detroit, MI','Cleveland, OH','San Francisco, CA','Los Angeles, CA','Houston, TX','Atlanta, GA','Baltimore, MD','Denver, CO','Indianapolis, IN','Minneapolis, MN','Milwaukee, WI','Nashville, TN','Portland, OR','Seattle, WA','Washington, DC','Charlotte, NC','Richmond, VA','St. Louis, MO','Columbus, OH','Tampa, FL','Orlando, FL','Dallas, TX','Phoenix, AZ','Sacramento, CA','Hartford, CT','Providence, RI','Worcester, MA'];
const CEMETERIES = ['Holy Cross Cemetery','Resurrection Cemetery','St. Theodosius Cemetery','All Saints Memorial Park','Orthodox Memorial Gardens','Evergreen Cemetery','Mt. Olivet Cemetery','Calvary Cemetery','Cedar Grove Cemetery','Greenwood Cemetery','Holy Trinity Cemetery','St. Nicholas Memorial Park','Assumption Cemetery','Transfiguration Memorial Gardens','Oak Hill Cemetery','Woodland Cemetery','Fairview Memorial Park','Hillside Cemetery'];
const COUNTIES = ['Cook County','Allegheny County','Suffolk County','Cuyahoga County','Wayne County','Fulton County','Harris County','Los Angeles County','Maricopa County','King County','Hennepin County','Marion County'];

// ============================================================================
// FIELD CONFIGURATION (config-driven, not hardcoded forms)
// ============================================================================
interface WizardFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'number' | 'select' | 'boolean';
  required: boolean;
  dbColumn: string;
  generationStrategy: 'male_first_name' | 'female_first_name' | 'last_name' | 'random_first_name' | 'date_in_range' | 'date_after' | 'date_before' | 'clergy' | 'city' | 'cemetery' | 'parents' | 'sponsors' | 'witnesses' | 'marriage_license' | 'age' | 'entry_type' | 'fixed' | 'none';
  generationDependsOn?: string;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: any;
  group?: string;
  displayOrder: number;
  visibleInPreview: boolean;
  dateConstraint?: { afterField?: string; beforeField?: string; offsetDaysMin?: number; offsetDaysMax?: number };
}

const FIELD_CONFIGS: Record<string, WizardFieldConfig[]> = {
  baptism: [
    { key: 'first_name', label: 'First Name', type: 'text', required: true, dbColumn: 'first_name', generationStrategy: 'random_first_name', group: 'identity', displayOrder: 1, visibleInPreview: true },
    { key: 'last_name', label: 'Last Name', type: 'text', required: true, dbColumn: 'last_name', generationStrategy: 'last_name', group: 'identity', displayOrder: 2, visibleInPreview: true },
    { key: 'birth_date', label: 'Birth Date', type: 'date', required: false, dbColumn: 'birth_date', generationStrategy: 'date_in_range', group: 'dates', displayOrder: 3, visibleInPreview: true },
    { key: 'reception_date', label: 'Reception Date', type: 'date', required: true, dbColumn: 'reception_date', generationStrategy: 'date_after', generationDependsOn: 'birth_date', group: 'dates', displayOrder: 4, visibleInPreview: true, dateConstraint: { afterField: 'birth_date', offsetDaysMin: 7, offsetDaysMax: 180 } },
    { key: 'birthplace', label: 'Birthplace', type: 'text', required: false, dbColumn: 'birthplace', generationStrategy: 'city', group: 'location', displayOrder: 5, visibleInPreview: false },
    { key: 'entry_type', label: 'Entry Type', type: 'select', required: false, dbColumn: 'entry_type', generationStrategy: 'entry_type', options: [{ value: 'Baptism', label: 'Baptism' }, { value: 'Chrismation', label: 'Chrismation' }, { value: 'Transfer', label: 'Transfer' }], defaultValue: 'Baptism', group: 'details', displayOrder: 6, visibleInPreview: false },
    { key: 'sponsors', label: 'Sponsors', type: 'textarea', required: false, dbColumn: 'sponsors', generationStrategy: 'sponsors', group: 'people', displayOrder: 7, visibleInPreview: false },
    { key: 'parents', label: 'Parents', type: 'textarea', required: true, dbColumn: 'parents', generationStrategy: 'parents', generationDependsOn: 'last_name', group: 'people', displayOrder: 8, visibleInPreview: false },
    { key: 'clergy', label: 'Clergy', type: 'select', required: true, dbColumn: 'clergy', generationStrategy: 'clergy', group: 'church', displayOrder: 9, visibleInPreview: true },
  ],
  marriage: [
    { key: 'fname_groom', label: 'Groom First Name', type: 'text', required: true, dbColumn: 'fname_groom', generationStrategy: 'male_first_name', group: 'groom', displayOrder: 1, visibleInPreview: true },
    { key: 'lname_groom', label: 'Groom Last Name', type: 'text', required: true, dbColumn: 'lname_groom', generationStrategy: 'last_name', group: 'groom', displayOrder: 2, visibleInPreview: true },
    { key: 'fname_bride', label: 'Bride First Name', type: 'text', required: true, dbColumn: 'fname_bride', generationStrategy: 'female_first_name', group: 'bride', displayOrder: 3, visibleInPreview: true },
    { key: 'lname_bride', label: 'Bride Last Name', type: 'text', required: true, dbColumn: 'lname_bride', generationStrategy: 'last_name', group: 'bride', displayOrder: 4, visibleInPreview: true },
    { key: 'mdate', label: 'Marriage Date', type: 'date', required: true, dbColumn: 'mdate', generationStrategy: 'date_in_range', group: 'dates', displayOrder: 5, visibleInPreview: true },
    { key: 'parentsg', label: "Groom's Parents", type: 'textarea', required: false, dbColumn: 'parentsg', generationStrategy: 'parents', generationDependsOn: 'lname_groom', group: 'groom', displayOrder: 6, visibleInPreview: false },
    { key: 'parentsb', label: "Bride's Parents", type: 'textarea', required: false, dbColumn: 'parentsb', generationStrategy: 'parents', generationDependsOn: 'lname_bride', group: 'bride', displayOrder: 7, visibleInPreview: false },
    { key: 'witness', label: 'Witnesses', type: 'text', required: false, dbColumn: 'witness', generationStrategy: 'witnesses', group: 'people', displayOrder: 8, visibleInPreview: false },
    { key: 'mlicense', label: 'Marriage License', type: 'text', required: false, dbColumn: 'mlicense', generationStrategy: 'marriage_license', group: 'details', displayOrder: 9, visibleInPreview: false },
    { key: 'clergy', label: 'Clergy', type: 'select', required: true, dbColumn: 'clergy', generationStrategy: 'clergy', group: 'church', displayOrder: 10, visibleInPreview: true },
  ],
  funeral: [
    { key: 'name', label: 'First Name', type: 'text', required: true, dbColumn: 'name', generationStrategy: 'random_first_name', group: 'identity', displayOrder: 1, visibleInPreview: true },
    { key: 'lastname', label: 'Last Name', type: 'text', required: true, dbColumn: 'lastname', generationStrategy: 'last_name', group: 'identity', displayOrder: 2, visibleInPreview: true },
    { key: 'deceased_date', label: 'Date of Death', type: 'date', required: true, dbColumn: 'deceased_date', generationStrategy: 'date_in_range', group: 'dates', displayOrder: 3, visibleInPreview: true },
    { key: 'burial_date', label: 'Burial Date', type: 'date', required: false, dbColumn: 'burial_date', generationStrategy: 'date_after', generationDependsOn: 'deceased_date', group: 'dates', displayOrder: 4, visibleInPreview: true, dateConstraint: { afterField: 'deceased_date', offsetDaysMin: 2, offsetDaysMax: 7 } },
    { key: 'age', label: 'Age', type: 'number', required: false, dbColumn: 'age', generationStrategy: 'age', group: 'details', displayOrder: 5, visibleInPreview: true },
    { key: 'burial_location', label: 'Burial Location', type: 'text', required: false, dbColumn: 'burial_location', generationStrategy: 'cemetery', group: 'location', displayOrder: 6, visibleInPreview: false },
    { key: 'clergy', label: 'Clergy', type: 'select', required: true, dbColumn: 'clergy', generationStrategy: 'clergy', group: 'church', displayOrder: 7, visibleInPreview: true },
  ],
};

const TABLE_MAP: Record<string, string> = {
  baptism: 'baptism_records',
  marriage: 'marriage_records',
  funeral: 'funeral_records',
};

// ============================================================================
// DATE DISTRIBUTION ENGINE
// ============================================================================
type DistributionMode = 'even' | 'random' | 'seasonal' | 'chronological';

function distributeDates(count: number, startDate: string, endDate: string, mode: DistributionMode, maxPerDay: number = 3): string[] {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const range = end - start;
  if (range <= 0) return Array(count).fill(startDate);

  const dates: string[] = [];
  const dateCounts: Record<string, number> = {};

  const toStr = (ts: number) => new Date(ts).toISOString().split('T')[0];

  const addDate = (ts: number) => {
    let d = toStr(ts);
    // Enforce maxPerDay - shift forward if needed
    let attempts = 0;
    while ((dateCounts[d] || 0) >= maxPerDay && attempts < 30) {
      ts += 86400000; // add a day
      if (ts > end) ts = start + Math.random() * range;
      d = toStr(ts);
      attempts++;
    }
    dateCounts[d] = (dateCounts[d] || 0) + 1;
    dates.push(d);
  };

  if (mode === 'even') {
    const step = range / Math.max(count - 1, 1);
    for (let i = 0; i < count; i++) {
      addDate(start + step * i);
    }
  } else if (mode === 'chronological') {
    // Sequential but with some natural variation
    const step = range / count;
    for (let i = 0; i < count; i++) {
      const base = start + step * i;
      const jitter = (Math.random() - 0.5) * step * 0.5;
      addDate(Math.max(start, Math.min(end, base + jitter)));
    }
    dates.sort();
  } else if (mode === 'seasonal') {
    // Weight toward spring (Apr-Jun) and fall (Sep-Nov) — typical sacrament seasons
    const seasonalWeight = (ts: number) => {
      const month = new Date(ts).getMonth(); // 0-11
      if (month >= 3 && month <= 5) return 2.0;   // Spring
      if (month >= 8 && month <= 10) return 1.8;  // Fall
      if (month === 11 || month === 0) return 0.5; // Winter
      return 1.0;
    };
    for (let i = 0; i < count; i++) {
      let ts: number;
      let attempts = 0;
      do {
        ts = start + Math.random() * range;
        attempts++;
      } while (Math.random() > seasonalWeight(ts) / 2.0 && attempts < 50);
      addDate(ts);
    }
  } else {
    // random
    for (let i = 0; i < count; i++) {
      addDate(start + Math.random() * range);
    }
  }

  return dates;
}

// ============================================================================
// VALUE GENERATION ENGINE
// ============================================================================
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function generateFieldValue(
  field: WizardFieldConfig,
  context: Record<string, any>,
  dateRange: { start: string; end: string },
  distributedDates: string[],
  index: number
): any {
  switch (field.generationStrategy) {
    case 'male_first_name': return pick(MALE_NAMES);
    case 'female_first_name': return pick(FEMALE_NAMES);
    case 'random_first_name': return Math.random() < 0.5 ? pick(MALE_NAMES) : pick(FEMALE_NAMES);
    case 'last_name': return pick(LAST_NAMES);
    case 'date_in_range': return distributedDates[index] || dateRange.start;
    case 'date_after': {
      const ref = context[field.generationDependsOn || ''];
      if (!ref) return distributedDates[index] || dateRange.start;
      const c = field.dateConstraint || { offsetDaysMin: 1, offsetDaysMax: 30 };
      const dt = new Date(ref);
      dt.setDate(dt.getDate() + (c.offsetDaysMin || 1) + Math.floor(Math.random() * ((c.offsetDaysMax || 30) - (c.offsetDaysMin || 1))));
      return dt.toISOString().split('T')[0];
    }
    case 'date_before': {
      const ref = context[field.generationDependsOn || ''];
      if (!ref) return distributedDates[index] || dateRange.start;
      const c = field.dateConstraint || { offsetDaysMin: 1, offsetDaysMax: 30 };
      const dt = new Date(ref);
      dt.setDate(dt.getDate() - (c.offsetDaysMin || 1) - Math.floor(Math.random() * ((c.offsetDaysMax || 30) - (c.offsetDaysMin || 1))));
      return dt.toISOString().split('T')[0];
    }
    case 'clergy': return pick(CLERGY_LIST);
    case 'city': return pick(CITIES);
    case 'cemetery': return `${pick(CEMETERIES)}, ${pick(CITIES)}`;
    case 'parents': {
      const ln = context[field.generationDependsOn || ''] || pick(LAST_NAMES);
      const father = `${pick(MALE_NAMES)} ${ln}`;
      const motherMaiden = pick(LAST_NAMES);
      const mother = `${pick(FEMALE_NAMES)} (${motherMaiden}) ${ln}`;
      return `${father} & ${mother}`;
    }
    case 'sponsors': {
      if (Math.random() < 0.3) {
        return `${pick(MALE_NAMES)} ${pick(LAST_NAMES)} & ${pick(FEMALE_NAMES)} ${pick(LAST_NAMES)}`;
      }
      return `${Math.random() < 0.5 ? pick(MALE_NAMES) : pick(FEMALE_NAMES)} ${pick(LAST_NAMES)}`;
    }
    case 'witnesses': {
      const wc = 2 + Math.floor(Math.random() * 3);
      const ws: string[] = [];
      for (let w = 0; w < wc; w++) {
        ws.push(`${Math.random() < 0.5 ? pick(MALE_NAMES) : pick(FEMALE_NAMES)} ${pick(LAST_NAMES)}`);
      }
      return ws.join(', ');
    }
    case 'marriage_license': {
      const year = new Date(dateRange.start).getFullYear() + Math.floor(Math.random() * (new Date(dateRange.end).getFullYear() - new Date(dateRange.start).getFullYear() + 1));
      return `License #ML-${year}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}, ${pick(COUNTIES)}`;
    }
    case 'age': return 25 + Math.floor(Math.random() * 70);
    case 'entry_type': return field.defaultValue || 'Baptism';
    case 'fixed': return field.defaultValue || '';
    case 'none': return null;
    default: return null;
  }
}

function generateRecord(
  recordType: string,
  fields: WizardFieldConfig[],
  dateRange: { start: string; end: string },
  distributedDates: string[],
  index: number,
  churchId: number,
  overrides: Record<string, any> = {}
): Record<string, any> {
  const record: Record<string, any> = {};
  const context: Record<string, any> = { ...overrides };

  // Sort fields to handle dependencies: date_in_range first, then dependent dates
  const sorted = [...fields].sort((a, b) => {
    if (a.generationStrategy === 'date_in_range' && b.generationStrategy !== 'date_in_range') return -1;
    if (b.generationStrategy === 'date_in_range' && a.generationStrategy !== 'date_in_range') return 1;
    if (a.generationDependsOn && !b.generationDependsOn) return 1;
    if (b.generationDependsOn && !a.generationDependsOn) return -1;
    return a.displayOrder - b.displayOrder;
  });

  for (const field of sorted) {
    if (overrides[field.key] !== undefined) {
      record[field.key] = overrides[field.key];
      context[field.key] = overrides[field.key];
    } else {
      const val = generateFieldValue(field, context, dateRange, distributedDates, index);
      record[field.key] = val;
      context[field.key] = val;
    }
  }

  record.church_id = churchId;
  return record;
}

// ============================================================================
// VALIDATION ENGINE
// ============================================================================
interface ValidationIssue {
  row: number;
  field: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

function validateRecords(recordType: string, records: Record<string, any>[], fields: WizardFieldConfig[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenKeys: Record<string, number[]> = {};

  records.forEach((record, idx) => {
    const row = idx + 1;

    // Required field check
    for (const field of fields) {
      if (field.required && (record[field.key] === null || record[field.key] === undefined || record[field.key] === '')) {
        issues.push({ row, field: field.key, severity: 'error', message: `${field.label} is required` });
      }
    }

    // Date ordering checks
    if (recordType === 'baptism') {
      if (record.birth_date && record.reception_date && record.birth_date > record.reception_date) {
        issues.push({ row, field: 'reception_date', severity: 'error', message: 'Reception date must be after birth date' });
      }
    }
    if (recordType === 'funeral') {
      if (record.deceased_date && record.burial_date && record.deceased_date > record.burial_date) {
        issues.push({ row, field: 'burial_date', severity: 'error', message: 'Burial date must be after date of death' });
      }
    }

    // Marriage: groom=male, bride=female — enforced by field config (groom names from MALE_NAMES, bride from FEMALE_NAMES)
    // Additional server-side enforcement:
    if (recordType === 'marriage') {
      if (!record.fname_groom || !record.lname_groom) {
        issues.push({ row, field: 'fname_groom', severity: 'error', message: 'Groom name is required' });
      }
      if (!record.fname_bride || !record.lname_bride) {
        issues.push({ row, field: 'fname_bride', severity: 'error', message: 'Bride name is required' });
      }
      // Enforce male groom / female bride by checking against name lists
      if (record.fname_groom && FEMALE_NAMES.includes(record.fname_groom) && !MALE_NAMES.includes(record.fname_groom)) {
        issues.push({ row, field: 'fname_groom', severity: 'error', message: 'Groom must have a male name — Orthodox marriage requires one male and one female spouse' });
      }
      if (record.fname_bride && MALE_NAMES.includes(record.fname_bride) && !FEMALE_NAMES.includes(record.fname_bride)) {
        issues.push({ row, field: 'fname_bride', severity: 'error', message: 'Bride must have a female name — Orthodox marriage requires one male and one female spouse' });
      }
    }

    // Age validation
    if (record.age !== undefined && record.age !== null) {
      if (record.age < 0 || record.age > 150) {
        issues.push({ row, field: 'age', severity: 'warning', message: 'Age seems unrealistic' });
      }
    }

    // Duplicate detection - build key
    let dupeKey = '';
    if (recordType === 'baptism') dupeKey = `${record.first_name}|${record.last_name}|${record.reception_date}`;
    if (recordType === 'marriage') dupeKey = `${record.fname_groom}|${record.lname_groom}|${record.fname_bride}|${record.lname_bride}|${record.mdate}`;
    if (recordType === 'funeral') dupeKey = `${record.name}|${record.lastname}|${record.deceased_date}`;

    if (dupeKey) {
      if (!seenKeys[dupeKey]) seenKeys[dupeKey] = [];
      seenKeys[dupeKey].push(row);
      if (seenKeys[dupeKey].length > 1) {
        issues.push({ row, field: 'duplicate', severity: 'warning', message: `Possible duplicate of row ${seenKeys[dupeKey][0]}` });
      }
    }
  });

  return issues;
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /config/:recordType — Return field configuration for a record type
 */
router.get('/config/:recordType', (req: any, res: any) => {
  const { recordType } = req.params;
  const fields = FIELD_CONFIGS[recordType];
  if (!fields) return res.status(400).json({ error: `Invalid record type: ${recordType}. Must be baptism, marriage, or funeral.` });

  res.json({
    recordType,
    fields,
    clergyOptions: CLERGY_LIST,
    supportedDistributions: ['even', 'random', 'seasonal', 'chronological'],
  });
});

/**
 * GET /churches — List churches available for record creation
 */
router.get('/churches', async (req: any, res: any) => {
  try {
    const { promisePool } = require('../../config/db');
    const [rows] = await promisePool.query('SELECT id, name, database_name FROM churches WHERE status = "active" OR status IS NULL ORDER BY name');
    res.json({ churches: rows });
  } catch (err: any) {
    console.error('[RecordWizard] Churches error:', err);
    res.status(500).json({ error: 'Failed to load churches' });
  }
});

/**
 * POST /preview — Generate preview records without inserting
 */
router.post('/preview', (req: any, res: any) => {
  try {
    const { record_type, church_id, count = 10, date_start, date_end, distribution = 'random', max_per_day = 3, overrides = {} } = req.body;

    if (!record_type || !['baptism', 'marriage', 'funeral'].includes(record_type)) {
      return res.status(400).json({ error: 'record_type must be baptism, marriage, or funeral' });
    }
    if (!church_id) return res.status(400).json({ error: 'church_id is required' });
    if (!date_start || !date_end) return res.status(400).json({ error: 'date_start and date_end are required' });

    const n = Math.min(Math.max(1, parseInt(count)), 500);
    const fields = FIELD_CONFIGS[record_type];
    const distributedDates = distributeDates(n, date_start, date_end, distribution as DistributionMode, max_per_day);

    const records: Record<string, any>[] = [];
    for (let i = 0; i < n; i++) {
      records.push(generateRecord(record_type, fields, { start: date_start, end: date_end }, distributedDates, i, church_id, overrides));
    }

    const validationIssues = validateRecords(record_type, records, fields);
    const hasErrors = validationIssues.some(v => v.severity === 'error');

    res.json({
      records,
      count: records.length,
      validation: {
        issues: validationIssues,
        hasErrors,
        errorCount: validationIssues.filter(v => v.severity === 'error').length,
        warningCount: validationIssues.filter(v => v.severity === 'warning').length,
      },
    });
  } catch (err: any) {
    console.error('[RecordWizard] Preview error:', err);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

/**
 * POST /validate — Validate a set of records without creating
 */
router.post('/validate', (req: any, res: any) => {
  try {
    const { record_type, records } = req.body;
    if (!record_type || !records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'record_type and records array are required' });
    }
    const fields = FIELD_CONFIGS[record_type];
    if (!fields) return res.status(400).json({ error: 'Invalid record type' });

    const issues = validateRecords(record_type, records, fields);
    res.json({
      valid: !issues.some(v => v.severity === 'error'),
      issues,
      errorCount: issues.filter(v => v.severity === 'error').length,
      warningCount: issues.filter(v => v.severity === 'warning').length,
    });
  } catch (err: any) {
    console.error('[RecordWizard] Validate error:', err);
    res.status(500).json({ error: 'Validation failed' });
  }
});

/**
 * POST /create — Validate and insert records into the database
 */
router.post('/create', async (req: any, res: any) => {
  try {
    const { record_type, church_id, records } = req.body;

    if (!record_type || !['baptism', 'marriage', 'funeral'].includes(record_type)) {
      return res.status(400).json({ error: 'record_type must be baptism, marriage, or funeral' });
    }
    if (!church_id) return res.status(400).json({ error: 'church_id is required' });
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'records array is required and must not be empty' });
    }
    if (records.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 records per batch' });
    }

    const fields = FIELD_CONFIGS[record_type];
    const issues = validateRecords(record_type, records, fields);
    const errors = issues.filter(v => v.severity === 'error');
    if (errors.length > 0) {
      return res.status(422).json({ error: 'Validation failed', issues: errors });
    }

    const { promisePool } = require('../../config/db');

    // Lookup church database
    const [churchRows] = await promisePool.query('SELECT id, name, database_name FROM churches WHERE id = ?', [church_id]);
    if (!churchRows.length) return res.status(404).json({ error: 'Church not found' });
    const church = churchRows[0];
    const table = TABLE_MAP[record_type];

    // Build column list from field config
    const cols = fields.map((f: WizardFieldConfig) => f.dbColumn);
    cols.push('church_id');

    const placeholders = records.map(() => `(${cols.map(() => '?').join(',')})`).join(',');
    const values = records.flatMap((r: Record<string, any>) => {
      return cols.map((c: string) => {
        if (c === 'church_id') return church_id;
        const field = fields.find((f: WizardFieldConfig) => f.dbColumn === c);
        return field ? (r[field.key] ?? null) : null;
      });
    });

    const [result] = await promisePool.query(
      `INSERT INTO \`${church.database_name}\`.${table} (${cols.join(',')}) VALUES ${placeholders}`,
      values
    );
    const inserted = (result as any).affectedRows;

    res.json({
      success: true,
      inserted,
      requested: records.length,
      skipped: records.length - inserted,
      record_type,
      church: church.name,
      database: church.database_name,
      warnings: issues.filter(v => v.severity === 'warning'),
    });
  } catch (err: any) {
    console.error('[RecordWizard] Create error:', err);
    res.status(500).json({ error: 'Failed to create records', message: err.message });
  }
});

/**
 * GET /presets — List saved presets
 */
router.get('/presets', async (req: any, res: any) => {
  try {
    const { promisePool } = require('../../config/db');
    const { record_type, church_id } = req.query;
    let sql = 'SELECT * FROM record_creation_presets WHERE is_active = 1';
    const params: any[] = [];
    if (record_type) { sql += ' AND record_type = ?'; params.push(record_type); }
    if (church_id) { sql += ' AND (church_id = ? OR church_id IS NULL)'; params.push(church_id); }
    sql += ' ORDER BY name';
    const [rows] = await promisePool.query(sql, params);
    res.json({ presets: rows });
  } catch (err: any) {
    // Table might not exist yet
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ presets: [], _note: 'Presets table not yet created' });
    }
    console.error('[RecordWizard] Presets list error:', err);
    res.status(500).json({ error: 'Failed to load presets' });
  }
});

/**
 * POST /presets — Save a new preset
 */
router.post('/presets', async (req: any, res: any) => {
  try {
    const { promisePool } = require('../../config/db');
    const { name, record_type, church_id, preset_json } = req.body;
    if (!name || !record_type || !preset_json) {
      return res.status(400).json({ error: 'name, record_type, and preset_json are required' });
    }
    const userId = req.session?.user?.id || req.user?.userId || null;
    const [result] = await promisePool.query(
      'INSERT INTO record_creation_presets (name, record_type, church_id, preset_json, created_by) VALUES (?, ?, ?, ?, ?)',
      [name, record_type, church_id || null, JSON.stringify(preset_json), userId]
    );
    res.status(201).json({ id: (result as any).insertId, name, record_type });
  } catch (err: any) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ error: 'Presets table not yet created. Run the migration first.' });
    }
    console.error('[RecordWizard] Preset save error:', err);
    res.status(500).json({ error: 'Failed to save preset' });
  }
});

/**
 * PUT /presets/:id — Update a preset
 */
router.put('/presets/:id', async (req: any, res: any) => {
  try {
    const { promisePool } = require('../../config/db');
    const { name, preset_json } = req.body;
    await promisePool.query(
      'UPDATE record_creation_presets SET name = COALESCE(?, name), preset_json = COALESCE(?, preset_json), updated_at = NOW() WHERE id = ?',
      [name || null, preset_json ? JSON.stringify(preset_json) : null, req.params.id]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('[RecordWizard] Preset update error:', err);
    res.status(500).json({ error: 'Failed to update preset' });
  }
});

/**
 * DELETE /presets/:id — Soft-delete a preset
 */
router.delete('/presets/:id', async (req: any, res: any) => {
  try {
    const { promisePool } = require('../../config/db');
    await promisePool.query('UPDATE record_creation_presets SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[RecordWizard] Preset delete error:', err);
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

module.exports = router;
export {};
