/**
 * recordSearch.js — Parser for the enhanced records search box.
 *
 * Turns a free-text query into a parameterized SQL WHERE fragment. Supports:
 *   - Field-qualified terms:  clergy:nicholas   year:2011   baptism:2011-04
 *   - Bare 4-digit years:     2011  → matches YEAR() of any date column (or text)
 *   - Bare dates:             04/14/1920, 1920-04, 1920-04-14
 *   - Plain text terms:       smith  → LIKE across the type's text columns
 *   - Multiple terms are AND-ed; quote phrases with "double quotes".
 *
 * Column names come only from the trusted per-type config below (never user
 * input); all user values are passed as bound parameters.
 */

// type: 'text' | 'date' | 'year' | 'num'
const SEARCH_CONFIGS = {
  baptism: {
    textFields: ['first_name', 'last_name', 'clergy', 'sponsors', 'parents', 'birthplace'],
    dateFields: ['birth_date', 'reception_date'],
    qualifiers: {
      name: { type: 'text', cols: ['first_name', 'last_name'] },
      first: { type: 'text', cols: ['first_name'] },
      firstname: { type: 'text', cols: ['first_name'] },
      last: { type: 'text', cols: ['last_name'] },
      lastname: { type: 'text', cols: ['last_name'] },
      surname: { type: 'text', cols: ['last_name'] },
      clergy: { type: 'text', cols: ['clergy'] },
      priest: { type: 'text', cols: ['clergy'] },
      sponsor: { type: 'text', cols: ['sponsors'] },
      sponsors: { type: 'text', cols: ['sponsors'] },
      godparent: { type: 'text', cols: ['sponsors'] },
      godparents: { type: 'text', cols: ['sponsors'] },
      parent: { type: 'text', cols: ['parents'] },
      parents: { type: 'text', cols: ['parents'] },
      place: { type: 'text', cols: ['birthplace'] },
      birthplace: { type: 'text', cols: ['birthplace'] },
      birth: { type: 'date', cols: ['birth_date'] },
      dob: { type: 'date', cols: ['birth_date'] },
      born: { type: 'date', cols: ['birth_date'] },
      baptism: { type: 'date', cols: ['reception_date'] },
      reception: { type: 'date', cols: ['reception_date'] },
      baptized: { type: 'date', cols: ['reception_date'] },
      date: { type: 'date', cols: ['reception_date'] },
      year: { type: 'year', cols: ['birth_date', 'reception_date'] },
    },
  },
  marriage: {
    textFields: ['fname_groom', 'lname_groom', 'fname_bride', 'lname_bride', 'clergy', 'witness', 'parentsg', 'parentsb'],
    dateFields: ['mdate'],
    qualifiers: {
      groom: { type: 'text', cols: ['fname_groom', 'lname_groom'] },
      bride: { type: 'text', cols: ['fname_bride', 'lname_bride'] },
      name: { type: 'text', cols: ['fname_groom', 'lname_groom', 'fname_bride', 'lname_bride'] },
      clergy: { type: 'text', cols: ['clergy'] },
      priest: { type: 'text', cols: ['clergy'] },
      celebrant: { type: 'text', cols: ['clergy'] },
      witness: { type: 'text', cols: ['witness'] },
      witnesses: { type: 'text', cols: ['witness'] },
      license: { type: 'text', cols: ['mlicense'] },
      marriage: { type: 'date', cols: ['mdate'] },
      married: { type: 'date', cols: ['mdate'] },
      date: { type: 'date', cols: ['mdate'] },
      year: { type: 'year', cols: ['mdate'] },
    },
  },
  funeral: {
    textFields: ['name', 'lastname', 'clergy', 'burial_location'],
    dateFields: ['deceased_date', 'burial_date'],
    qualifiers: {
      name: { type: 'text', cols: ['name', 'lastname'] },
      first: { type: 'text', cols: ['name'] },
      last: { type: 'text', cols: ['lastname'] },
      lastname: { type: 'text', cols: ['lastname'] },
      clergy: { type: 'text', cols: ['clergy'] },
      priest: { type: 'text', cols: ['clergy'] },
      place: { type: 'text', cols: ['burial_location'] },
      location: { type: 'text', cols: ['burial_location'] },
      burialplace: { type: 'text', cols: ['burial_location'] },
      death: { type: 'date', cols: ['deceased_date'] },
      deceased: { type: 'date', cols: ['deceased_date'] },
      died: { type: 'date', cols: ['deceased_date'] },
      burial: { type: 'date', cols: ['burial_date'] },
      funeral: { type: 'date', cols: ['burial_date'] },
      date: { type: 'date', cols: ['deceased_date'] },
      year: { type: 'year', cols: ['deceased_date', 'burial_date'] },
      age: { type: 'num', cols: ['age'] },
    },
  },
};

/** Split a query into tokens, keeping `field:"quoted value"` and "quoted" runs intact. */
function tokenize(raw) {
  return raw.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
}

function stripQuotes(s) {
  return s.replace(/"/g, '').trim();
}

/** Parse a date-ish string into { year, month?, day? } (ints) or null. */
function parseDateParts(value) {
  const v = value.trim();
  let m;
  if ((m = v.match(/^(\d{4})$/))) return { year: +m[1] };
  if ((m = v.match(/^(\d{4})[-/](\d{1,2})$/))) return { year: +m[1], month: +m[2] };
  if ((m = v.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/))) return { year: +m[1], month: +m[2], day: +m[3] };
  if ((m = v.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/))) return { year: +m[3], month: +m[1], day: +m[2] };
  if ((m = v.match(/^(\d{1,2})[-/](\d{4})$/))) return { year: +m[2], month: +m[1] };
  return null;
}

/** Build an OR group matching the given date columns against parsed date parts. */
function dateCondition(cols, parts, conds, params) {
  const ors = [];
  for (const c of cols) {
    if (parts.day != null && parts.month != null) {
      const iso = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
      ors.push(`DATE(\`${c}\`) = ?`);
      params.push(iso);
    } else if (parts.month != null) {
      ors.push(`(YEAR(\`${c}\`) = ? AND MONTH(\`${c}\`) = ?)`);
      params.push(parts.year, parts.month);
    } else {
      ors.push(`YEAR(\`${c}\`) = ?`);
      params.push(parts.year);
    }
  }
  if (ors.length) conds.push(`(${ors.join(' OR ')})`);
}

function likeCondition(cols, value, conds, params) {
  const ors = cols.map((c) => `\`${c}\` LIKE ?`);
  for (let i = 0; i < cols.length; i++) params.push(`%${value}%`);
  conds.push(`(${ors.join(' OR ')})`);
}

/**
 * Parse a search string for a record type into a WHERE fragment + params.
 * @returns {{ where: string, params: any[] }} where is '' when nothing usable.
 */
function buildRecordSearch(raw, recordType) {
  const config = SEARCH_CONFIGS[recordType];
  if (!config || !raw || !raw.trim()) return { where: '', params: [] };

  const conds = [];
  const params = [];

  for (const token of tokenize(raw.trim())) {
    const qm = token.match(/^([a-zA-Z_]+):(.*)$/);
    if (qm && config.qualifiers[qm[1].toLowerCase()]) {
      const q = config.qualifiers[qm[1].toLowerCase()];
      const value = stripQuotes(qm[2]);
      if (!value) continue;
      if (q.type === 'text') {
        likeCondition(q.cols, value, conds, params);
      } else if (q.type === 'num') {
        const n = parseInt(value, 10);
        if (!isNaN(n)) { conds.push(`\`${q.cols[0]}\` = ?`); params.push(n); }
      } else {
        // 'date' or 'year' qualifier
        const parts = parseDateParts(value);
        if (parts) dateCondition(q.cols, parts, conds, params);
      }
      continue;
    }

    // Bare term
    const value = stripQuotes(token);
    if (!value) continue;
    if (/^\d{4}$/.test(value)) {
      // A 4-digit number: match the year of any date column OR text containing it.
      const ors = [];
      for (const d of config.dateFields) { ors.push(`YEAR(\`${d}\`) = ?`); params.push(+value); }
      for (const t of config.textFields) { ors.push(`\`${t}\` LIKE ?`); params.push(`%${value}%`); }
      conds.push(`(${ors.join(' OR ')})`);
    } else if (/[-/]/.test(value) && parseDateParts(value)) {
      dateCondition(config.dateFields, parseDateParts(value), conds, params);
    } else {
      likeCondition(config.textFields, value, conds, params);
    }
  }

  if (conds.length === 0) return { where: '', params: [] };
  return { where: `(${conds.join(' AND ')})`, params };
}

module.exports = { buildRecordSearch, SEARCH_CONFIGS };
