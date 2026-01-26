// server/controllers/analyticsController.js

const { promisePool } = require('../config/db');
// Detects context (dist vs source) and uses appropriate path
const path = require('path');
const isDist = __dirname.includes(path.sep + 'dist' + path.sep);

let dbSwitcherModule;
if (isDist) {
    dbSwitcherModule = require('../utils/dbSwitcher');
} else {
    try {
        dbSwitcherModule = require('../utils/dbSwitcher');
    } catch (e) {
        dbSwitcherModule = require('../src/utils/dbSwitcher');
    }
}
const { getChurchDbConnection } = dbSwitcherModule;
const mysql = require('mysql2/promise');

// Helper to get church_id from church context (set by security middleware)
function getChurchId(req) {
  // Priority: church context from security middleware > session > query
  return req.churchContext?.requestedChurchId || 
         req.session?.user?.church_id || 
         req.query.church_id;
}

// Helper: get church database name from platform DB
async function getChurchDatabaseName(churchId) {
  const [rows] = await promisePool.query(
    'SELECT database_name FROM church_info WHERE id = ?',
    [churchId]
  );
  if (!rows.length || !rows[0].database_name) throw new Error('Invalid or missing church_id/database_name');
  return rows[0].database_name;
}

// Helper: get connection to church-specific DB
async function getChurchDb(churchId) {
  const dbName = await getChurchDatabaseName(churchId);
  return mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

// Feast days definition
const feastDays = [
  { name: 'Nativity', month: 12, day: 25 },
  { name: 'Theophany', month: 1, day: 6 },
  { name: 'Annunciation', month: 3, day: 25 },
  { name: 'Transfiguration', month: 8, day: 6 },
  { name: 'Dormition', month: 8, day: 15 },
  { name: 'Elevation of the Cross', month: 9, day: 14 },
  {
    name: 'Pascha',
    dates: [
      '1900-04-15', '1901-05-05', '1902-04-27', '1903-04-19', '1904-05-08', '1905-04-23',
      '1906-04-15', '1907-05-05', '1908-04-26', '1909-04-11', '1910-05-01', '1911-04-16',
      '1912-05-05', '1913-04-27', '1914-04-12', '1915-05-02', '1916-04-23', '1917-04-08',
      '1918-04-28', '1919-04-20', '1920-04-04', '1921-04-24', '1922-04-16', '1923-04-08',
      '1924-04-27', '1925-04-12', '1926-04-04', '1927-04-24', '1928-04-15', '1929-05-05',
      '1930-04-20', '1931-04-12', '1932-05-01', '1933-04-16', '1934-04-08', '1935-04-28',
      '1936-04-12', '1937-05-02', '1938-04-17', '1939-04-09', '1940-04-28', '1941-04-13',
      '1942-04-05', '1943-04-25', '1944-04-16', '1945-04-29', '1946-04-21', '1947-04-06',
      '1948-04-25', '1949-04-17', '1950-04-09', '1951-04-29', '1952-04-20', '1953-04-05',
      '1954-04-25', '1955-04-10', '1956-04-29', '1957-04-21', '1958-04-06', '1959-04-26',
      '1960-04-17', '1961-04-02', '1962-04-22', '1963-04-14', '1964-05-03', '1965-04-25',
      '1966-04-10', '1967-04-30', '1968-04-21', '1969-04-13', '1970-05-03', '1971-04-18',
      '1972-04-09', '1973-04-29', '1974-04-14', '1975-05-04', '1976-04-25', '1977-04-10',
      '1978-04-30', '1979-04-22', '1980-04-06', '1981-04-26', '1982-04-18', '1983-04-10',
      '1984-04-29', '1985-04-14', '1986-05-04', '1987-04-19', '1988-04-10', '1989-04-30',
      '1990-04-15', '1991-04-07', '1992-04-26', '1993-04-18', '1994-05-01', '1995-04-23',
      '1996-04-14', '1997-04-27', '1998-04-19', '1999-04-11', '2000-04-30', '2001-04-15',
      '2002-05-05', '2003-04-27', '2004-04-11', '2005-05-01', '2006-04-23', '2007-04-08',
      '2008-04-27', '2009-04-19', '2010-04-04', '2011-04-24', '2012-04-15', '2013-05-05',
      '2014-04-20', '2015-04-12', '2016-05-01', '2017-04-16', '2018-04-08', '2019-04-28',
      '2020-04-19', '2021-05-02', '2022-04-24', '2023-04-16', '2024-05-05', '2025-04-20'
    ]
  }
];

exports.getSummary = async (req, res) => {
  try {
    const churchId = req.user?.church_id;
    if (!churchId) return res.status(400).json({ error: 'Missing church_id' });
    let db;
    try {
      db = await getChurchDb(churchId);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to connect to church DB', details: err.message });
    }
    // Count all records, no filters
    const [[summary]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM baptism_records) AS total_baptisms,
        (SELECT COUNT(*) FROM marriage_records) AS total_marriages,
        (SELECT COUNT(*) FROM funeral_records) AS total_funerals
    `);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch summary', details: err.message });
  }
};

exports.getMonthly = async (req, res) => {
  try {
    const churchId = req.user?.church_id;
    if (!churchId) return res.status(400).json({ error: 'Missing church_id' });
    const { recordType } = req.params;
    const validTypes = ['baptism', 'marriage', 'funeral'];
    if (!validTypes.includes(recordType)) return res.status(400).json({ error: 'Invalid recordType' });
    let db;
    try {
      db = await getChurchDb(churchId);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to connect to church DB', details: err.message });
    }
    const table = `${recordType}_records`;
    // Use correct date column
    const dateCol = recordType === 'baptism' ? 'reception_date' : recordType === 'marriage' ? 'mdate' : 'funeral_date';
    // If the management table does not filter by date, do not filter here
    const [monthly] = await db.query(`
      SELECT DATE_FORMAT(${dateCol}, '%Y-%m') AS month, COUNT(*) AS count
      FROM ${table}
      GROUP BY month
      ORDER BY month
    `);
    res.json(monthly);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch monthly data', details: err.message });
  }
};

exports.getByClergy = async (req, res) => {
  try {
    const churchId = req.user?.church_id;
    if (!churchId) return res.status(400).json({ error: 'Missing church_id' });
    let db;
    try {
      db = await getChurchDb(churchId);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to connect to church DB', details: err.message });
    }
    const [clergy] = await db.query(`
      SELECT clergy_name, COUNT(*) AS count
      FROM (
        SELECT clergy_name FROM baptism_records
        UNION ALL
        SELECT clergy_name FROM marriage_records
        UNION ALL
        SELECT clergy_name FROM funeral_records
      ) AS combined
      GROUP BY clergy_name
      ORDER BY count DESC
      LIMIT 5
    `);
    res.json(clergy);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clergy data', details: err.message });
  }
};

exports.getAgeDistribution = async (req, res) => {
  try {
    const churchId = req.user?.church_id;
    if (!churchId) return res.status(400).json({ error: 'Missing church_id' });
    let db;
    try {
      db = await getChurchDb(churchId);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to connect to church DB', details: err.message });
    }
    // Count all records with a date_of_birth
    const [ages] = await db.query(`
      SELECT FLOOR(TIMESTAMPDIFF(YEAR, date_of_birth, reception_date) / 10) * 10 AS age_group, COUNT(*) AS count
      FROM baptism_records
      WHERE date_of_birth IS NOT NULL
      GROUP BY age_group
      ORDER BY age_group
    `);
    res.json(ages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch age distribution', details: err.message });
  }
};

exports.getGenderDistribution = async (req, res) => {
  try {
    const churchId = req.user?.church_id;
    if (!churchId) return res.status(400).json({ error: 'Missing church_id' });
    let db;
    try {
      db = await getChurchDb(churchId);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to connect to church DB', details: err.message });
    }
    const [genders] = await db.query(`
      SELECT gender, COUNT(*) AS count
      FROM (
        SELECT gender FROM baptism_records
        UNION ALL
        SELECT gender FROM marriage_records
        UNION ALL
        SELECT gender FROM funeral_records
      ) AS combined
      GROUP BY gender
    `);
    res.json(genders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch gender distribution', details: err.message });
  }
};

exports.recordsByFeastDay = async (req, res) => {
  try {
    // Accept church_id from req.user, fallback to 14, but require it for clarity
    const churchId = req.user?.church_id || 14;
    if (!churchId) return res.status(400).json({ error: 'Missing church_id for feast analytics' });

    // Lookup the church's database name from the platform DB
    const [rows] = await promisePool.query('SELECT database_name FROM churches WHERE id = ?', [churchId]);
    if (!rows.length || !rows[0].database_name) {
      return res.status(400).json({ error: 'Invalid or missing church database for church_id ' + churchId });
    }
    const dbName = rows[0].database_name;

    // Get a connection to the church-specific database
    let db;
    try {
      db = await getChurchDbConnection(dbName);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to connect to church database', details: err.message });
    }

    const recordTypes = [
      { type: 'baptism', table: 'baptism_records', dateCol: 'reception_date' },
      { type: 'marriage', table: 'marriage_records', dateCol: 'mdate' },
      { type: 'funeral', table: 'funeral_records', dateCol: 'funeral_date' }
    ];
    let results = [];
    for (const feast of feastDays) {
      if (feast.dates) {
        // Pascha: loop over all years
        for (const paschaDate of feast.dates) {
          for (const { type, table, dateCol } of recordTypes) {
            try {
              const [[{ count }]] = await db.query(
                `SELECT COUNT(*) as count FROM ${table} WHERE ${dateCol} = ?`,
                [paschaDate]
              );
              results.push({ feast: feast.name, date: paschaDate, type, count });
            } catch (err) {
              return res.status(500).json({ error: `Query failed for ${table} on ${paschaDate}`, details: err.message });
            }
          }
        }
      } else {
        // Fixed feasts
        for (const { type, table, dateCol } of recordTypes) {
          try {
            const [[{ count }]] = await db.query(
              `SELECT COUNT(*) as count FROM ${table} WHERE MONTH(${dateCol}) = ? AND DAY(${dateCol}) = ?`,
              [feast.month, feast.day]
            );
            // Use current year for the date (for display)
            const year = new Date().getFullYear();
            const date = `${year.toString().padStart(4, '0')}-${feast.month.toString().padStart(2, '0')}-${feast.day.toString().padStart(2, '0')}`;
            results.push({ feast: feast.name, date, type, count });
          } catch (err) {
            return res.status(500).json({ error: `Query failed for ${table} on ${feast.name}`, details: err.message });
          }
        }
      }
    }
    res.json(results);
  } catch (err) {
    console.error('Analytics by-feast-day error:', err);
    res.status(500).json({ error: 'Failed to fetch feast day analytics', details: err.message });
  }
}; 