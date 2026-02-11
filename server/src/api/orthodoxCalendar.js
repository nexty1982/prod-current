const { getAppPool } = require('../config/db-compat');
// server/routes/liturgicalCalendar.js - Simplified Orthodox Calendar
const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * Simple Orthodox Calendar API - Saints and Readings Only
 * Uses external Orthodox sources, no database required
 */

// Helper function to calculate Orthodox date
function getOrthodoxDate(date = new Date()) {
  // For simplicity, using Gregorian calendar
  // In production, you might want to handle Julian/Gregorian calendar differences
  return date;
}

// Fetch saints from OCA (Orthodox Church in America)
async function fetchOCASaints(date) {
  try {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${month}-${day}`;
    
    // Sample saints data for different dates
    const saintsData = {
      '07-01': [{ name: "St. Cosmas and Damian", description: "Unmercenary healers", type: "martyr" }],
      '07-02': [{ name: "St. Juvenal of Jerusalem", description: "Patriarch of Jerusalem", type: "bishop" }],
      '07-03': [{ name: "St. Hyacinth of Caesarea", description: "Martyr", type: "martyr" }],
      '07-04': [{ name: "St. Andrew of Crete", description: "Archbishop and hymnographer", type: "bishop" }],
      '07-05': [{ name: "St. Athanasius of Athos", description: "Founder of monasticism on Mount Athos", type: "monk" }],
      '07-06': [{ name: "St. Sisoes the Great", description: "Desert father", type: "monk" }],
      '07-07': [{ name: "St. Thomas of Mount Maleon", description: "Hermit", type: "monk" }],
      '07-08': [{ name: "St. Procopius the Great Martyr", description: "Martyr under Diocletian", type: "martyr" }],
      '07-09': [{ name: "St. Pancratius of Taormina", description: "Bishop and martyr", type: "bishop" }],
      '07-10': [{ name: "St. Anthony of the Kiev Caves", description: "Father of Russian monasticism", type: "monk" }],
      '07-11': [{ name: "St. Euphemia the Great Martyr", description: "Great martyr of Chalcedon", type: "martyr" }],
      '07-12': [{ name: "Sts. Peter and Paul", description: "Chief apostles", type: "apostle" }],
      '07-13': [{ name: "St. Gabriel the Archangel", description: "Synaxis of the Archangel Gabriel", type: "angel" }],
      '07-14': [{ name: "St. Aquila the Apostle", description: "One of the Seventy", type: "apostle" }],
      '07-15': [{ name: "St. Vladimir Equal-to-the-Apostles", description: "Baptizer of Russia", type: "king" }],
      '07-16': [{ name: "St. Athenogenes", description: "Bishop and martyr", type: "bishop" }],
      '07-17': [{ name: "St. Marina the Great Martyr", description: "Virgin martyr", type: "martyr" }],
      '07-18': [{ name: "St. Pambo of Nitria", description: "Desert father", type: "monk" }],
      '07-19': [{ name: "St. Macrina the Younger", description: "Sister of St. Basil", type: "nun" }],
      '07-20': [{ name: "Prophet Elijah", description: "The Tishbite", type: "prophet" }],
      '07-21': [{ name: "St. Symeon the Fool-for-Christ", description: "Fool for Christ", type: "fool" }],
      '07-22': [{ name: "St. Mary Magdalene", description: "Myrrhbearer", type: "myrrhbearer" }],
      '07-23': [{ name: "St. Phocas the Gardener", description: "Martyr and gardener", type: "martyr" }],
      '07-24': [{ name: "St. Christina the Great Martyr", description: "Virgin martyr", type: "martyr" }],
      '07-25': [{ name: "St. Anna", description: "Mother of the Theotokos", type: "righteous" }],
      '07-26': [{ name: "St. Paraskeva of Rome", description: "Martyr", type: "martyr" }],
      '07-27': [{ name: "St. Panteleimon the Great Martyr", description: "Unmercenary healer", type: "martyr" }],
      '07-28': [{ name: "Sts. Prochorus, Nicanor, Timon and Parmenas", description: "Of the Seventy", type: "apostle" }],
      '07-29': [{ name: "St. Callinicus of Cilicia", description: "Martyr", type: "martyr" }],
      '07-30': [{ name: "St. Silas the Apostle", description: "Of the Seventy", type: "apostle" }],
      '07-31': [{ name: "St. Eudocimus the Righteous", description: "Of Cappadocia", type: "righteous" }]
    };
    
    // Return saints for the specific date, or a default saint if not found
    const daysSaints = saintsData[dateKey] || [
      {
        name: "Various Saints",
        description: "Commemorated on this day",
        type: "various"
      }
    ];
    
    return daysSaints.map(saint => ({
      ...saint,
      source: "local_data"
    }));
    
  } catch (error) {
    console.error('Error fetching saints data:', error);
    return [{
      name: "Various Saints",
      description: "Commemorated on this day",
      type: "various",
      source: "fallback"
    }];
  }
}

// Get liturgical readings for the date
function getLiturgicalReadings(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateKey = `${month}-${day}`;
  
  // Sample readings for different dates in July
  const readingsData = {
    '07-20': { epistle: "1 Kings 19:9-16", gospel: "Luke 4:22-30" }, // Prophet Elijah
    '07-22': { epistle: "1 Corinthians 9:2-12", gospel: "Luke 8:1-3" }, // Mary Magdalene
    '07-24': { epistle: "2 Corinthians 6:1-10", gospel: "Matthew 13:44-54" }, // St. Christina
    '07-27': { epistle: "James 5:10-20", gospel: "Luke 6:17-23" }, // St. Panteleimon
    '07-25': { epistle: "Galatians 4:22-31", gospel: "Luke 8:16-21" }, // St. Anna
    '07-15': { epistle: "1 Corinthians 4:9-16", gospel: "Matthew 9:9-13" }, // St. Vladimir
    '07-17': { epistle: "2 Corinthians 6:1-10", gospel: "Mark 5:24-34" }, // St. Marina
  };
  
  // Default readings for ordinary days
  const defaultReadings = {
    epistle: "2 Corinthians 11:21-33",
    gospel: "Matthew 16:13-19"
  };
  
  return readingsData[dateKey] || defaultReadings;
}

// Get liturgical season and tone
function getLiturgicalInfo(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dateKey = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  // Special days with specific colors
  const specialDays = {
    '07-20': { season: "Feast of Prophet Elijah", tone: "Tone 6", liturgicalColor: "gold" },
    '07-22': { season: "Mary Magdalene", tone: "Tone 6", liturgicalColor: "red" },
    '07-24': { season: "St. Christina", tone: "Tone 6", liturgicalColor: "red" },
    '07-25': { season: "St. Anna", tone: "Tone 6", liturgicalColor: "blue" },
    '07-27': { season: "St. Panteleimon", tone: "Tone 6", liturgicalColor: "red" },
    '07-15': { season: "St. Vladimir", tone: "Tone 6", liturgicalColor: "gold" },
    '07-17': { season: "St. Marina", tone: "Tone 6", liturgicalColor: "red" }
  };
  
  // Calculate tone based on date (simplified calculation for July 2025)
  const weekOfYear = Math.floor((day + 181) / 7); // Approximate week since start of year
  const tone = ((weekOfYear - 1) % 8) + 1;
  
  // Check for special days first
  if (specialDays[dateKey]) {
    return specialDays[dateKey];
  }
  
  // Default for ordinary time
  return {
    season: "Ordinary Time",
    tone: `Tone ${tone}`,
    liturgicalColor: "green"
  };
}

// Helper functions for local data
async function getLocalCommemorations(date) {
  try {
    const [rows] = await getAppPool().query(`
      SELECT * FROM local_commemorations 
      WHERE (DATE(date) = ? OR recurring = TRUE) AND active = TRUE
      ORDER BY liturgical_rank DESC, name
    `, [date.toISOString().split('T')[0]]);
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.commemoration_type,
      description: row.description || '',
      rank: row.liturgical_rank,
      color: row.liturgical_color
    }));
  } catch (error) {
    console.error('Error fetching local commemorations:', error);
    return [];
  }
}

async function getParishEvents(date) {
  try {
    const [rows] = await getAppPool().query(`
      SELECT * FROM parish_events 
      WHERE (DATE(event_date) = ? OR recurring = TRUE) AND active = TRUE
      ORDER BY start_time
    `, [date.toISOString().split('T')[0]]);
    
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      startTime: row.start_time,
      endTime: row.end_time,
      location: row.location,
      type: row.event_type
    }));
  } catch (error) {
    console.error('Error fetching parish events:', error);
    return [];
  }
}

/**
 * API Routes
 */

// Get today's Orthodox calendar data
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    const orthodoxDate = getOrthodoxDate(today);
    
    const saints = await fetchOCASaints(orthodoxDate);
    const readings = getLiturgicalReadings(orthodoxDate);
    const liturgicalInfo = getLiturgicalInfo(orthodoxDate);
    
    const response = {
      date: orthodoxDate.toISOString().split('T')[0],
      saints: saints,
      readings: readings,
      season: liturgicalInfo.season,
      tone: liturgicalInfo.tone,
      liturgicalColor: liturgicalInfo.liturgicalColor,
      hasLocalData: false,
      userPreferences: {
        showReadings: true,
        showSaints: true,
        defaultView: 'today'
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching today\'s Orthodox calendar:', error);
    res.status(500).json({ error: 'Failed to fetch Orthodox calendar data' });
  }
});

// Get Orthodox calendar data for a specific date
router.get('/date/:date', async (req, res) => {
  try {
    const requestedDate = new Date(req.params.date);
    const orthodoxDate = getOrthodoxDate(requestedDate);
    
    const saints = await fetchOCASaints(orthodoxDate);
    const readings = getLiturgicalReadings(orthodoxDate);
    const liturgicalInfo = getLiturgicalInfo(orthodoxDate);
    
    const response = {
      date: orthodoxDate.toISOString().split('T')[0],
      saints: saints,
      readings: readings,
      season: liturgicalInfo.season,
      tone: liturgicalInfo.tone,
      liturgicalColor: liturgicalInfo.liturgicalColor,
      hasLocalData: false
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching Orthodox calendar for date:', error);
    res.status(500).json({ error: 'Failed to fetch Orthodox calendar data' });
  }
});

// Get Orthodox calendar data for a month
router.get('/month/:year/:month', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month) - 1; // JavaScript months are 0-indexed
    
    const monthData = {};
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const liturgicalInfo = getLiturgicalInfo(date);
      const saints = await fetchOCASaints(date);
      
      monthData[day] = {
        date: date.toISOString().split('T')[0],
        liturgicalColor: liturgicalInfo.liturgicalColor,
        saints: saints,
        feasts: [], // Simplified - no complex feast calculation
        hasSpecialReadings: false
      };
    }
    
    res.json({
      year: year,
      month: month + 1,
      data: monthData
    });
  } catch (error) {
    console.error('Error fetching month Orthodox calendar:', error);
    res.status(500).json({ error: 'Failed to fetch month calendar data' });
  }
});

// Helper functions for database operations
const { promisePool } = require('../config/db-compat');

async function getUserPreferences(userId) {
  try {
    const [rows] = await getAppPool().query(`
      SELECT * FROM calendar_preferences WHERE user_id = ?
    `, [userId]);
    
    if (rows.length > 0) {
      const pref = rows[0];
      return {
        language: pref.language,
        defaultView: pref.default_view,
        showReadings: pref.show_readings,
        showSaints: pref.show_saints,
        showParishEvents: pref.show_parish_events,
        notificationPreferences: pref.notification_preferences ? JSON.parse(pref.notification_preferences) : {}
      };
    }
    
    // Return default preferences if none found
    return {
      language: 'en',
      defaultView: 'today',
      showReadings: true,
      showSaints: true,
      showParishEvents: true,
      notificationPreferences: {}
    };
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return {
      language: 'en',
      defaultView: 'today',
      showReadings: true,
      showSaints: true,
      showParishEvents: true,
      notificationPreferences: {}
    };
  }
}

// Orthodox liturgical data - saints and readings for each day
const LITURGICAL_DATA = {
  'en': {
    // January
    '01-01': [{
      id: 'basil',
      name: 'St. Basil the Great',
      type: 'bishop',
      description: 'Archbishop of Caesarea, liturgist and theologian',
      rank: 'major',
      readings: {
        epistle: { ref: 'Hebrews 7:26-8:2', text: 'For such a high priest became us, who is holy, harmless, undefiled, separate from sinners, and has become higher than the heavens...' },
        gospel: { ref: 'John 10:9-16', text: 'I am the door. If anyone enters by Me, he will be saved, and will go in and out and find pasture...' }
      }
    }, {
      id: 'circumcision',
      name: 'Circumcision of Our Lord',
      type: 'feast',
      description: 'Feast of the Circumcision of Christ',
      rank: 'major',
      color: 'white',
      readings: {
        epistle: { ref: 'Colossians 2:8-12', text: 'Beware lest anyone cheat you through philosophy and empty deceit...' },
        gospel: { ref: 'Luke 2:20-21, 40-52', text: 'And the shepherds returned, glorifying and praising God for all the things that they had heard and seen...' }
      }
    }],
    '01-06': [{
      id: 'theophany',
      name: 'Theophany of Our Lord',
      type: 'feast',
      description: 'Baptism of Christ in the Jordan',
      rank: 'great',
      color: 'white',
      readings: {
        epistle: { ref: 'Titus 2:11-14; 3:4-7', text: 'For the grace of God that brings salvation has appeared to all men...' },
        gospel: { ref: 'Matthew 3:13-17', text: 'Then Jesus came from Galilee to John at the Jordan to be baptized by him...' }
      }
    }],
    '01-07': [{
      id: 'john-baptist-synaxis',
      name: 'Synaxis of St. John the Baptist',
      type: 'prophet',
      description: 'Forerunner of Christ',
      rank: 'major',
      readings: {
        epistle: { ref: 'Acts 19:1-8', text: 'And it happened, while Apollos was at Corinth, that Paul, having passed through the upper regions, came to Ephesus...' },
        gospel: { ref: 'John 1:29-34', text: 'The next day John saw Jesus coming toward him, and said, "Behold! The Lamb of God who takes away the sin of the world!..."' }
      }
    }],
    '01-17': [{
      id: 'anthony',
      name: 'St. Anthony the Great',
      type: 'monk',
      description: 'Father of Monasticism',
      rank: 'major',
      readings: {
        epistle: { ref: 'Ephesians 6:10-17', text: 'Finally, my brethren, be strong in the Lord and in the power of His might...' },
        gospel: { ref: 'Matthew 4:25-5:12', text: 'And great multitudes followed Him from Galilee, and from Decapolis, Jerusalem, Judea, and beyond the Jordan...' }
      }
    }],
    '01-25': [{
      id: 'gregory-theologian',
      name: 'St. Gregory the Theologian',
      type: 'bishop',
      description: 'Archbishop of Constantinople',
      rank: 'major',
      readings: {
        epistle: { ref: 'Hebrews 7:26-8:2', text: 'For such a high priest became us, who is holy, harmless, undefiled...' },
        gospel: { ref: 'John 10:9-16', text: 'I am the door. If anyone enters by Me, he will be saved...' }
      }
    }],
    '01-30': [{
      id: 'three-hierarchs',
      name: 'Three Holy Hierarchs',
      type: 'bishop',
      description: 'Basil, Gregory, and John Chrysostom',
      rank: 'major',
      color: 'gold',
      readings: {
        epistle: { ref: 'Hebrews 13:7-16', text: 'Remember those who rule over you, who have spoken the word of God to you...' },
        gospel: { ref: 'Matthew 5:14-19', text: 'You are the light of the world. A city that is set on a hill cannot be hidden...' }
      }
    }],
    // February
    '02-02': [{
      id: 'presentation',
      name: 'Presentation of Our Lord',
      type: 'feast',
      description: 'Meeting of the Lord in the Temple',
      rank: 'great',
      color: 'white',
      readings: {
        epistle: { ref: 'Hebrews 7:7-17', text: 'Now beyond all contradiction the lesser is blessed by the better...' },
        gospel: { ref: 'Luke 2:22-40', text: 'Now when the days of her purification according to the law of Moses were completed...' }
      }
    }],
    // March
    '03-25': [{
      id: 'annunciation',
      name: 'Annunciation of the Theotokos',
      type: 'feast',
      description: 'Announcement of the Incarnation to Mary',
      rank: 'great',
      color: 'blue',
      readings: {
        epistle: { ref: 'Hebrews 2:11-18', text: 'For both He who sanctifies and those who are being sanctified are all of one...' },
        gospel: { ref: 'Luke 1:24-38', text: 'Now in the sixth month the angel Gabriel was sent by God to a city of Galilee named Nazareth...' }
      }
    }],
    // August
    '08-06': [{
      id: 'transfiguration',
      name: 'Transfiguration of Our Lord',
      type: 'feast',
      description: 'Transfiguration on Mount Tabor',
      rank: 'great',
      color: 'white',
      readings: {
        epistle: { ref: '2 Peter 1:10-19', text: 'Therefore, brethren, be even more diligent to make your call and election sure...' },
        gospel: { ref: 'Matthew 17:1-9', text: 'Now after six days Jesus took Peter, James, and John his brother, led them up on a high mountain by themselves...' }
      }
    }],
    '08-15': [{
      id: 'dormition',
      name: 'Dormition of the Theotokos',
      type: 'feast',
      description: 'Falling Asleep of the Mother of God',
      rank: 'great',
      color: 'blue',
      readings: {
        epistle: { ref: 'Philippians 2:5-11', text: 'Let this mind be in you which was also in Christ Jesus...' },
        gospel: { ref: 'Luke 10:38-42; 11:27-28', text: 'Now it happened as they went that He entered a certain village...' }
      }
    }],
    // September
    '09-08': [{
      id: 'nativity-theotokos',
      name: 'Nativity of the Theotokos',
      type: 'feast',
      description: 'Birth of the Mother of God',
      rank: 'great',
      color: 'blue',
      readings: {
        epistle: { ref: 'Philippians 2:5-11', text: 'Let this mind be in you which was also in Christ Jesus...' },
        gospel: { ref: 'Luke 10:38-42; 11:27-28', text: 'Now it happened as they went that He entered a certain village...' }
      }
    }],
    '09-14': [{
      id: 'exaltation-cross',
      name: 'Exaltation of the Holy Cross',
      type: 'feast',
      description: 'Universal Exaltation of the Precious Cross',
      rank: 'great',
      color: 'purple',
      readings: {
        epistle: { ref: '1 Corinthians 1:18-24', text: 'For the message of the cross is foolishness to those who are perishing...' },
        gospel: { ref: 'John 19:6-11, 13-20, 25-28, 30-35', text: 'Therefore, when the chief priests and officers saw Him, they cried out, saying, "Crucify Him, crucify Him!..."' }
      }
    }],
    // December
    '12-25': [{
      id: 'nativity',
      name: 'Nativity of Our Lord',
      type: 'feast',
      description: 'Birth of Jesus Christ',
      rank: 'great',
      color: 'white',
      readings: {
        epistle: { ref: 'Galatians 4:4-7', text: 'But when the fullness of the time had come, God sent forth His Son...' },
        gospel: { ref: 'Matthew 1:18-25', text: 'Now the birth of Jesus Christ was as follows: After His mother Mary was betrothed to Joseph...' }
      }
    }]
  }
};

// Calculate Pascha (Easter) date for Orthodox Church
function calculatePascha(year) {
  // Simplified calculation for Julian calendar (Orthodox)
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  
  // Convert to Gregorian calendar (add 13 days for 20th-21st century)
  const julianDate = new Date(year, month - 1, day);
  const gregorianDate = new Date(julianDate.getTime() + (13 * 24 * 60 * 60 * 1000));
  
  return gregorianDate;
}

// Get liturgical tone (mode) for the week
function getTone(date, pascha) {
  const daysSincePascha = Math.floor((date.getTime() - pascha.getTime()) / (1000 * 60 * 60 * 24));
  const weeksSincePascha = Math.floor(daysSincePascha / 7);
  
  if (daysSincePascha < 0) return null; // Before Pascha
  if (weeksSincePascha >= 8) return ((weeksSincePascha - 8) % 8) + 1; // After Pentecost
  return null; // Paschal period (no tone)
}

// Get liturgical season
function getSeason(date, pascha) {
  const daysSincePascha = Math.floor((date.getTime() - pascha.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSincePascha >= 0 && daysSincePascha <= 6) return 'Bright Week';
  if (daysSincePascha > 6 && daysSincePascha < 49) return 'Paschal';
  if (daysSincePascha === 49) return 'Pentecost';
  if (daysSincePascha > 49) return 'Ordinary Time';
  
  // Before Pascha - check for Lent, etc.
  if (daysSincePascha >= -48 && daysSincePascha < 0) return 'Great Lent';
  
  return 'Ordinary Time';
}

// API Endpoints

// GET /api/liturgical-calendar/today - Get today's saints and readings
router.get('/today', async (req, res) => {
  try {
    const { lang = 'en' } = req.query;
    const today = new Date();
    const year = today.getFullYear();
    
    // Get liturgical data
    const pascha = calculatePascha(year);
    const tone = getTone(today, pascha);
    const season = getSeason(today, pascha);
    
    // Get today's saints and feasts
    const dateKey = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todaysData = (LITURGICAL_DATA[lang] || LITURGICAL_DATA['en'])[dateKey] || [];
    
    const feasts = todaysData.filter(item => item.type === 'feast');
    const saints = todaysData.filter(item => item.type !== 'feast');
    
    // Get local commemorations and parish events
    const localCommemorations = await getLocalCommemorations(today);
    const parishEvents = await getParishEvents(today);
    
    const response = {
      date: today.toISOString().split('T')[0],
      dayOfWeek: today.toLocaleDateString('en-US', { weekday: 'long' }),
      tone,
      season,
      feasts,
      saints,
      readings: todaysData.length > 0 ? todaysData[0].readings : null,
      hasSpecialReadings: todaysData.some(item => item.readings),
      liturgicalColor: todaysData.find(item => item.color)?.color || 'green',
      localCommemorations,
      parishEvents
    };
    
    res.json(response);
  } catch (error) {
    console.error('Today liturgical data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/liturgical-calendar/date/:date - Get specific date's data
router.get('/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { lang = 'en' } = req.query;
    
    const requestedDate = new Date(date);
    const year = requestedDate.getFullYear();
    
    // Get liturgical data
    const pascha = calculatePascha(year);
    const tone = getTone(requestedDate, pascha);
    const season = getSeason(requestedDate, pascha);
    
    // Get date's saints and feasts
    const dateKey = `${String(requestedDate.getMonth() + 1).padStart(2, '0')}-${String(requestedDate.getDate()).padStart(2, '0')}`;
    const dateData = (LITURGICAL_DATA[lang] || LITURGICAL_DATA['en'])[dateKey] || [];
    
    const feasts = dateData.filter(item => item.type === 'feast');
    const saints = dateData.filter(item => item.type !== 'feast');
    
    // Get local commemorations and parish events
    const localCommemorations = await getLocalCommemorations(requestedDate);
    const parishEvents = await getParishEvents(requestedDate);
    
    const response = {
      date: requestedDate.toISOString().split('T')[0],
      dayOfWeek: requestedDate.toLocaleDateString('en-US', { weekday: 'long' }),
      tone,
      season,
      feasts,
      saints,
      readings: dateData.length > 0 ? dateData[0].readings : null,
      hasSpecialReadings: dateData.some(item => item.readings),
      liturgicalColor: dateData.find(item => item.color)?.color || 'green',
      localCommemorations,
      parishEvents
    };
    
    res.json(response);
  } catch (error) {
    console.error('Date liturgical data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/liturgical-calendar/month/:year/:month - Get month's data
router.get('/month/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const { lang = 'en' } = req.query;
    
    const monthData = {};
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${String(parseInt(month)).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = (LITURGICAL_DATA[lang] || LITURGICAL_DATA['en'])[dateKey];
      
      if (dayData) {
        monthData[day] = {
          feasts: dayData.filter(item => item.type === 'feast'),
          saints: dayData.filter(item => item.type !== 'feast'),
          hasReadings: dayData.some(item => item.readings),
          liturgicalColor: dayData.find(item => item.color)?.color || 'green'
        };
      }
    }
    
    res.json({
      year: parseInt(year),
      month: parseInt(month),
      monthName: new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
      data: monthData
    });
  } catch (error) {
    console.error('Month liturgical data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/liturgical-calendar/pascha/:year - Get Pascha date for year
router.get('/pascha/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    
    if (year < 1900 || year > 2100) {
      return res.status(400).json({ error: 'Invalid year' });
    }
    
    const pascha = calculatePascha(year);
    
    res.json({
      year,
      pascha: pascha.toISOString().split('T')[0],
      paschaFormatted: pascha.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    });
  } catch (error) {
    console.error('Pascha calculation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/liturgical-calendar/commemorations - Add local commemoration
router.post('/commemorations', async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      name,
      nameTranslations,
      date,
      commemorationType,
      description,
      descriptionTranslations,
      iconUrl,
      readings,
      liturgicalRank,
      liturgicalColor,
      recurring
    } = req.body;

    if (!name || !date) {
      return res.status(400).json({ error: 'Name and date are required' });
    }

    const [result] = await getAppPool().query(`
      INSERT INTO local_commemorations 
      (name, name_translations, date, commemoration_type, description, description_translations, 
       icon_url, readings, liturgical_rank, liturgical_color, recurring, created_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      nameTranslations ? JSON.stringify(nameTranslations) : null,
      date,
      commemorationType || 'saint',
      description,
      descriptionTranslations ? JSON.stringify(descriptionTranslations) : null,
      iconUrl,
      readings ? JSON.stringify(readings) : null,
      liturgicalRank || 'commemoration',
      liturgicalColor || 'green',
      recurring !== undefined ? recurring : true,
      req.session.user.id
    ]);

    res.status(201).json({
      id: result.insertId,
      name,
      date,
      commemorationType,
      message: 'Commemoration added successfully'
    });

  } catch (error) {
    console.error('Error adding commemoration:', error);
    res.status(500).json({ error: 'Failed to add commemoration' });
  }
});

// POST /api/liturgical-calendar/events - Add parish event
router.post('/events', async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      title,
      description,
      eventDate,
      startTime,
      endTime,
      location,
      eventType,
      recurring,
      recurrencePattern,
      organizer,
      contactInfo
    } = req.body;

    if (!title || !eventDate) {
      return res.status(400).json({ error: 'Title and event date are required' });
    }

    const [result] = await getAppPool().query(`
      INSERT INTO parish_events 
      (title, description, event_date, start_time, end_time, location, event_type, 
       recurring, recurrence_pattern, organizer, contact_info, created_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title,
      description,
      eventDate,
      startTime,
      endTime,
      location,
      eventType || 'liturgy',
      recurring || false,
      recurrencePattern,
      organizer,
      contactInfo,
      req.session.user.id
    ]);

    res.status(201).json({
      id: result.insertId,
      title,
      eventDate,
      message: 'Parish event added successfully'
    });

  } catch (error) {
    console.error('Error adding parish event:', error);
    res.status(500).json({ error: 'Failed to add parish event' });
  }
});

// POST /api/liturgical-calendar/notes - Add/update user note
router.post('/notes', async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { date, noteText, isPrivate } = req.body;

    if (!date || !noteText) {
      return res.status(400).json({ error: 'Date and note text are required' });
    }

    // Check if note already exists for this user and date
    const [existing] = await getAppPool().query(`
      SELECT id FROM calendar_notes WHERE user_id = ? AND date = ?
    `, [req.session.user.id, date]);

    if (existing.length > 0) {
      // Update existing note
      await getAppPool().query(`
        UPDATE calendar_notes SET note_text = ?, is_private = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND date = ?
      `, [noteText, isPrivate !== undefined ? isPrivate : true, req.session.user.id, date]);

      res.json({ message: 'Note updated successfully' });
    } else {
      // Create new note
      const [result] = await getAppPool().query(`
        INSERT INTO calendar_notes (user_id, date, note_text, is_private) 
        VALUES (?, ?, ?, ?)
      `, [req.session.user.id, date, noteText, isPrivate !== undefined ? isPrivate : true]);

      res.status(201).json({
        id: result.insertId,
        message: 'Note added successfully'
      });
    }

  } catch (error) {
    console.error('Error adding/updating note:', error);
    res.status(500).json({ error: 'Failed to save note' });
  }
});

// PUT /api/liturgical-calendar/preferences - Update user preferences
router.put('/preferences', async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      language,
      defaultView,
      showReadings,
      showSaints,
      showParishEvents,
      notificationPreferences
    } = req.body;

    // Check if preferences exist
    const [existing] = await getAppPool().query(`
      SELECT id FROM calendar_preferences WHERE user_id = ?
    `, [req.session.user.id]);

    if (existing.length > 0) {
      // Update existing preferences
      await getAppPool().query(`
        UPDATE calendar_preferences 
        SET language = ?, default_view = ?, show_readings = ?, show_saints = ?, 
            show_parish_events = ?, notification_preferences = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [
        language || 'en',
        defaultView || 'today',
        showReadings !== undefined ? showReadings : true,
        showSaints !== undefined ? showSaints : true,
        showParishEvents !== undefined ? showParishEvents : true,
        notificationPreferences ? JSON.stringify(notificationPreferences) : null,
        req.session.user.id
      ]);
    } else {
      // Create new preferences
      await getAppPool().query(`
        INSERT INTO calendar_preferences 
        (user_id, language, default_view, show_readings, show_saints, show_parish_events, notification_preferences) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        req.session.user.id,
        language || 'en',
        defaultView || 'today',
        showReadings !== undefined ? showReadings : true,
        showSaints !== undefined ? showSaints : true,
        showParishEvents !== undefined ? showParishEvents : true,
        notificationPreferences ? JSON.stringify(notificationPreferences) : null
      ]);
    }

    res.json({ message: 'Preferences updated successfully' });

  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// GET /api/liturgical-calendar/commemorations - Get all local commemorations
router.get('/commemorations', async (req, res) => {
  try {
    const { year, month } = req.query;
    
    let query = `
      SELECT * FROM local_commemorations 
      WHERE active = TRUE
    `;
    const params = [];

    if (year && month) {
      query += ` AND (YEAR(date) = ? AND MONTH(date) = ?) OR recurring = TRUE`;
      params.push(year, month);
    }

    query += ` ORDER BY date, liturgical_rank DESC, name`;

    const [rows] = await getAppPool().query(query, params);

    const commemorations = rows.map(row => ({
      id: row.id,
      name: row.name,
      nameTranslations: row.name_translations ? JSON.parse(row.name_translations) : {},
      date: row.date,
      type: row.commemoration_type,
      description: row.description || '',
      descriptionTranslations: row.description_translations ? JSON.parse(row.description_translations) : {},
      rank: row.liturgical_rank,
      color: row.liturgical_color,
      iconUrl: row.icon_url,
      readings: row.readings ? JSON.parse(row.readings) : null,
      isRecurring: row.recurring,
      createdBy: row.created_by,
      createdAt: row.created_at
    }));

    res.json(commemorations);

  } catch (error) {
    console.error('Error fetching commemorations:', error);
    res.status(500).json({ error: 'Failed to fetch commemorations' });
  }
});

// GET /api/liturgical-calendar/events - Get parish events
router.get('/events', async (req, res) => {
  try {
    const { year, month, type } = req.query;
    
    let query = `
      SELECT * FROM parish_events 
      WHERE active = TRUE
    `;
    const params = [];

    if (year && month) {
      query += ` AND (YEAR(event_date) = ? AND MONTH(event_date) = ?) OR recurring = TRUE`;
      params.push(year, month);
    }

    if (type) {
      query += ` AND event_type = ?`;
      params.push(type);
    }

    query += ` ORDER BY event_date, start_time`;

    const [rows] = await getAppPool().query(query, params);

    const events = rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      date: row.event_date,
      startTime: row.start_time,
      endTime: row.end_time,
      location: row.location,
      type: row.event_type,
      organizer: row.organizer,
      contactInfo: row.contact_info,
      isRecurring: row.recurring,
      recurrencePattern: row.recurrence_pattern,
      createdBy: row.created_by,
      createdAt: row.created_at
    }));

    res.json(events);

  } catch (error) {
    console.error('Error fetching parish events:', error);
    res.status(500).json({ error: 'Failed to fetch parish events' });
  }
});

// ===== FRONTEND COMPATIBILITY ROUTES =====
// These routes match what the frontend liturgicalService expects

// Get liturgical calendar data for a specific year and language
router.get('/:language/:year', async (req, res) => {
  try {
    const { language, year } = req.params;
    const { type = 'revised_julian' } = req.query;
    
    // Generate liturgical days for the entire year
    const yearData = [];
    const currentYear = parseInt(year);
    
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, month, day);
        const liturgicalInfo = getLiturgicalInfo(date);
        const saints = await fetchOCASaints(date);
        const readings = getLiturgicalReadings(date);
        
        yearData.push({
          date: date.toISOString().split('T')[0],
          gregorianDate: date.toISOString().split('T')[0],
          liturgicalDate: date.toISOString().split('T')[0], // Simplified
          weekday: date.getDay(),
          feasts: [], // Simplified - no complex feast calculation
          saints: saints,
          readings: readings,
          fastingLevel: 0, // Simplified
          liturgicalColor: liturgicalInfo.liturgicalColor,
          season: liturgicalInfo.season,
          tone: liturgicalInfo.tone,
          isHoliday: false,
          isSunday: date.getDay() === 0,
          paschalDistance: 0, // Simplified
          language: language,
          calendarType: type
        });
      }
    }
    
    res.json(yearData);
  } catch (error) {
    console.error('Error fetching liturgical calendar by year:', error);
    res.status(500).json({ error: 'Failed to fetch liturgical calendar data' });
  }
});

// Get saints by date
router.get('/saints', async (req, res) => {
  try {
    const { date, lang = 'en' } = req.query;
    const requestedDate = new Date(date);
    const saints = await fetchOCASaints(requestedDate);
    res.json(saints);
  } catch (error) {
    console.error('Error fetching saints by date:', error);
    res.status(500).json({ error: 'Failed to fetch saints' });
  }
});

// Get feasts by date
router.get('/feasts', async (req, res) => {
  try {
    const { date, lang = 'en' } = req.query;
    // Simplified feast data
    res.json([]);
  } catch (error) {
    console.error('Error fetching feasts by date:', error);
    res.status(500).json({ error: 'Failed to fetch feasts' });
  }
});

// Get fasting status for a date
router.get('/fasting', async (req, res) => {
  try {
    const { date } = req.query;
    // Simplified fasting data
    res.json([]);
  } catch (error) {
    console.error('Error fetching fasting status:', error);
    res.status(500).json({ error: 'Failed to fetch fasting status' });
  }
});

// Get liturgical season
router.get('/season', async (req, res) => {
  try {
    const { lang = 'en' } = req.query;
    const today = new Date();
    const liturgicalInfo = getLiturgicalInfo(today);
    res.json(liturgicalInfo);
  } catch (error) {
    console.error('Error fetching liturgical season:', error);
    res.status(500).json({ error: 'Failed to fetch liturgical season' });
  }
});

// Get liturgical readings for a date
router.get('/readings', async (req, res) => {
  try {
    const { date, lang = 'en' } = req.query;
    const requestedDate = new Date(date);
    const readings = getLiturgicalReadings(requestedDate);
    res.json([readings]);
  } catch (error) {
    console.error('Error fetching liturgical readings:', error);
    res.status(500).json({ error: 'Failed to fetch readings' });
  }
});

// Get church events for a date range
router.get('/events/:churchId', async (req, res) => {
  try {
    const { churchId } = req.params;
    const { start_date, end_date } = req.query;
    // Simplified church events - would connect to church database in production
    res.json([]);
  } catch (error) {
    console.error('Error fetching church events:', error);
    res.status(500).json({ error: 'Failed to fetch church events' });
  }
});

// Search saints by name
router.get('/saints/search', async (req, res) => {
  try {
    const { q, lang = 'en', limit = 10 } = req.query;
    // Simplified search - would implement full-text search in production
    res.json([]);
  } catch (error) {
    console.error('Error searching saints:', error);
    res.status(500).json({ error: 'Failed to search saints' });
  }
});

// Search feasts by name
router.get('/feasts/search', async (req, res) => {
  try {
    const { q, lang = 'en', limit = 10 } = req.query;
    // Simplified search - would implement full-text search in production
    res.json([]);
  } catch (error) {
    console.error('Error searching feasts:', error);
    res.status(500).json({ error: 'Failed to search feasts' });
  }
});

module.exports = router;
