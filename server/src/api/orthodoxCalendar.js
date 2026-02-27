/**
 * Orthodox Liturgical Calendar API
 *
 * Comprehensive Eastern Orthodox calendar engine with:
 * - Pascha (Easter) calculation using Julian→Gregorian algorithm
 * - All 12 Great Feasts + ~60 major fixed feasts with saints, readings, colors
 * - ~30 movable feasts relative to Pascha (Triodion through All Saints)
 * - Deterministic liturgical color calculation
 * - Fasting level computation (4 fasting periods + Wed/Fri + fast-free weeks)
 * - Liturgical tone (Octoechos) rotation
 * - Auto-theme endpoint for site-wide liturgical color theming
 *
 * Modeled after the GOARCH Chapel Calendar (goarch.org/chapel/calendar)
 */

const { getAppPool } = require('../config/db-compat');
const express = require('express');
const router = express.Router();

// ============================================================
// PASCHA CALCULATION
// ============================================================

/**
 * Calculate Orthodox Pascha (Easter) date for a given year.
 * Uses the Julian calendar algorithm, then converts to Gregorian.
 */
function calculatePascha(year) {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;

  // Convert Julian to Gregorian (add 13 days for 20th-21st century)
  const julianDate = new Date(year, month - 1, day);
  const gregorianDate = new Date(julianDate.getTime() + (13 * 24 * 60 * 60 * 1000));
  return gregorianDate;
}

/**
 * Get number of days between two dates (ignoring time).
 */
function daysBetween(date1, date2) {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
}

/**
 * Format date as MM-DD string for fixed feast lookups.
 */
function toDateKey(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${m}-${d}`;
}

/**
 * Add days to a date and return new Date.
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ============================================================
// CALENDAR TYPE HELPERS (Old Calendar / New Calendar)
// ============================================================

/**
 * Read calendarType from request query param.
 * Returns 'Julian' or 'Revised Julian' (default).
 */
function getCalendarTypeFromRequest(req) {
  const ct = req.query.calendarType;
  return ct === 'Julian' ? 'Julian' : 'Revised Julian';
}

/**
 * Get fixed feast for a Gregorian date, adjusted for calendar type.
 * For Julian (Old Calendar): a New Calendar feast on MM-DD is observed 13 days later.
 * So to find what feast falls on a given Gregorian date for a Julian church,
 * we subtract 13 days to get the equivalent New Calendar date key.
 */
function getFixedFeastForDate(date, calendarType) {
  if (calendarType === 'Julian') {
    const julianEquiv = addDays(date, -13);
    const key = toDateKey(julianEquiv);
    const feast = FIXED_FEASTS[key];
    return feast ? { feast, originalDateKey: key } : null;
  }
  const key = toDateKey(date);
  const feast = FIXED_FEASTS[key];
  return feast ? { feast, originalDateKey: key } : null;
}

/**
 * Format Old Style annotation: '12-25' → '(Dec 25 OS)'
 */
function formatOldStyleNote(dateKey) {
  const [mm, dd] = dateKey.split('-');
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `(${names[parseInt(mm) - 1]} ${parseInt(dd)} OS)`;
}

// ============================================================
// FIXED FEASTS — Saints and feasts on fixed calendar dates
// ============================================================
// rank: 'great' (12 Great Feasts), 'major', 'minor', 'commemoration'
// type: 'lords' (of the Lord), 'theotokos', 'apostle', 'martyr', 'hierarch',
//       'monk', 'prophet', 'righteous', 'cross', 'angel', 'other'
// color: liturgical vestment color for that day
// fasting: override fasting level for that day
// fastFree: true if fast-free day

const FIXED_FEASTS = {
  // === SEPTEMBER (Church New Year) ===
  '09-01': { name: 'Church New Year (Indiction)', rank: 'minor', type: 'other', color: 'green',
    saints: [{ name: 'Beginning of the Ecclesiastical Year', description: 'Indiction — start of the church calendar year' }],
    readings: { epistle: '1 Timothy 2:1-7', gospel: 'Luke 4:16-22' } },
  '09-08': { name: 'Nativity of the Theotokos', rank: 'great', type: 'theotokos', color: 'blue',
    saints: [{ name: 'Nativity of the Most Holy Theotokos', description: 'Birth of the Virgin Mary to Sts. Joachim and Anna' }],
    readings: { epistle: 'Philippians 2:5-11', gospel: 'Luke 10:38-42; 11:27-28' } },
  '09-14': { name: 'Exaltation of the Holy Cross', rank: 'great', type: 'cross', color: 'purple', fasting: 'strict',
    saints: [{ name: 'Universal Exaltation of the Precious and Life-Giving Cross', description: 'Finding of the True Cross by St. Helen in Jerusalem, 326 AD' }],
    readings: { epistle: '1 Corinthians 1:18-24', gospel: 'John 19:6-11, 13-20, 25-28, 30-35' } },
  '09-23': { name: 'Conception of St. John the Baptist', rank: 'minor', type: 'prophet', color: 'green',
    saints: [{ name: 'Conception of the Holy Glorious Prophet and Forerunner John the Baptist', description: 'Announcement to Zachariah of the birth of John' }],
    readings: { epistle: 'Galatians 4:22-31', gospel: 'Luke 1:5-25' } },
  '09-26': { name: 'Repose of the Apostle John the Theologian', rank: 'major', type: 'apostle', color: 'red',
    saints: [{ name: 'St. John the Theologian, Apostle and Evangelist', description: 'Beloved disciple of Christ, author of the Fourth Gospel and Revelation' }],
    readings: { epistle: '1 John 4:12-19', gospel: 'John 19:25-27; 21:24-25' } },

  // === OCTOBER ===
  '10-01': { name: 'Protection of the Theotokos', rank: 'major', type: 'theotokos', color: 'blue',
    saints: [{ name: 'Protection (Pokrov) of the Most Holy Theotokos', description: 'Vision of St. Andrew the Fool of the Theotokos spreading her veil over the faithful' }],
    readings: { epistle: 'Hebrews 9:1-7', gospel: 'Luke 10:38-42; 11:27-28' } },
  '10-06': { name: 'Apostle Thomas', rank: 'minor', type: 'apostle', color: 'red',
    saints: [{ name: 'Holy Apostle Thomas', description: 'Called Didymus (the Twin), preached in India' }],
    readings: { epistle: '1 Corinthians 4:9-16', gospel: 'John 20:19-31' } },
  '10-18': { name: 'Apostle and Evangelist Luke', rank: 'major', type: 'apostle', color: 'red',
    saints: [{ name: 'Holy Apostle and Evangelist Luke', description: 'Author of the Third Gospel and Acts of the Apostles, physician, iconographer' }],
    readings: { epistle: 'Colossians 4:5-9, 14, 18', gospel: 'Luke 10:16-21' } },
  '10-23': { name: 'Apostle James the Brother of the Lord', rank: 'major', type: 'apostle', color: 'red',
    saints: [{ name: 'Holy Apostle James the Brother of the Lord', description: 'First Bishop of Jerusalem, author of the Epistle of James' }],
    readings: { epistle: 'Galatians 1:11-19', gospel: 'Matthew 13:54-58' } },
  '10-26': { name: 'Great Martyr Demetrius', rank: 'major', type: 'martyr', color: 'red',
    saints: [{ name: 'Holy Great Martyr Demetrius the Myrrh-Streamer', description: 'Patron saint of Thessaloniki, martyred under Maximian (306 AD)' }],
    readings: { epistle: '2 Timothy 2:1-10', gospel: 'John 15:17-16:2' } },

  // === NOVEMBER ===
  '11-08': { name: 'Synaxis of the Archangels', rank: 'major', type: 'angel', color: 'white',
    saints: [{ name: 'Synaxis of the Archangel Michael and All the Bodiless Powers', description: 'Michael, Gabriel, Raphael, and all the angelic hosts' }],
    readings: { epistle: 'Hebrews 2:2-10', gospel: 'Luke 10:16-21' } },
  '11-13': { name: 'St. John Chrysostom', rank: 'major', type: 'hierarch', color: 'gold',
    saints: [{ name: 'St. John Chrysostom, Archbishop of Constantinople', description: 'Doctor of the Church, author of the Divine Liturgy' }],
    readings: { epistle: 'Hebrews 7:26-8:2', gospel: 'John 10:9-16' } },
  '11-14': { name: 'Apostle Philip', rank: 'major', type: 'apostle', color: 'red',
    saints: [{ name: 'Holy Apostle Philip', description: 'One of the Twelve. Nativity Fast begins the following day.' }],
    readings: { epistle: '1 Corinthians 4:9-16', gospel: 'John 1:43-51' } },
  '11-21': { name: 'Entry of the Theotokos into the Temple', rank: 'great', type: 'theotokos', color: 'blue',
    saints: [{ name: 'Entry of the Most Holy Theotokos into the Temple', description: 'The young Virgin Mary is brought to the Temple by Sts. Joachim and Anna' }],
    readings: { epistle: 'Hebrews 9:1-7', gospel: 'Luke 10:38-42; 11:27-28' } },
  '11-25': { name: 'Great Martyr Catherine', rank: 'minor', type: 'martyr', color: 'red',
    saints: [{ name: 'Holy Great Martyr Catherine of Alexandria', description: 'Patroness of philosophers and scholars, martyred c. 305 AD' }],
    readings: { epistle: 'Galatians 3:23-4:5', gospel: 'Mark 5:24-34' } },
  '11-30': { name: 'Apostle Andrew the First-Called', rank: 'major', type: 'apostle', color: 'red',
    saints: [{ name: 'Holy Apostle Andrew the First-Called', description: 'First disciple called by Christ, patron of the Ecumenical Patriarchate' }],
    readings: { epistle: '1 Corinthians 4:9-16', gospel: 'John 1:35-51' } },

  // === DECEMBER ===
  '12-04': { name: 'Great Martyr Barbara', rank: 'minor', type: 'martyr', color: 'red',
    saints: [{ name: 'Holy Great Martyr Barbara', description: 'Martyred by her own father for converting to Christianity' }],
    readings: { epistle: 'Galatians 3:23-4:5', gospel: 'Mark 5:24-34' } },
  '12-05': { name: 'St. Sabbas the Sanctified', rank: 'minor', type: 'monk', color: 'green',
    saints: [{ name: 'Venerable Sabbas the Sanctified', description: 'Founder of the Mar Saba monastery near Jerusalem (532 AD)' }],
    readings: { epistle: 'Galatians 5:22-6:2', gospel: 'Luke 6:17-23' } },
  '12-06': { name: 'St. Nicholas the Wonderworker', rank: 'major', type: 'hierarch', color: 'white', fasting: 'fish',
    saints: [{ name: 'St. Nicholas the Wonderworker, Archbishop of Myra in Lycia', description: 'The beloved saint known for his generosity and miracles (c. 270-343)' }],
    readings: { epistle: 'Hebrews 13:17-21', gospel: 'Luke 6:17-23' } },
  '12-12': { name: 'St. Spyridon the Wonderworker', rank: 'minor', type: 'hierarch', color: 'white',
    saints: [{ name: 'St. Spyridon, Bishop of Trimythous', description: 'Wonderworker and defender of Orthodoxy at the First Ecumenical Council' }],
    readings: { epistle: 'Ephesians 5:8-19', gospel: 'John 10:9-16' } },
  '12-20': { name: 'Forefeast of the Nativity begins', rank: 'minor', type: 'other', color: 'white',
    saints: [{ name: 'St. Ignatius the God-Bearer', description: 'Bishop of Antioch, martyr (c. 108 AD). Forefeast of Nativity begins.' }],
    readings: { epistle: 'Hebrews 4:14-5:6', gospel: 'Mark 9:33-41' } },
  '12-25': { name: 'Nativity of Our Lord', rank: 'great', type: 'lords', color: 'white', fastFree: true,
    saints: [{ name: 'The Nativity in the Flesh of Our Lord, God, and Savior Jesus Christ', description: 'Christmas — the birth of Christ in Bethlehem' }],
    readings: { epistle: 'Galatians 4:4-7', gospel: 'Matthew 2:1-12' } },
  '12-26': { name: 'Synaxis of the Theotokos', rank: 'major', type: 'theotokos', color: 'blue', fastFree: true,
    saints: [{ name: 'Synaxis of the Most Holy Theotokos', description: 'Day after Nativity — gathered assembly in honor of the Virgin Mary' }],
    readings: { epistle: 'Hebrews 2:11-18', gospel: 'Matthew 2:13-23' } },
  '12-27': { name: 'Protomartyr Stephen', rank: 'major', type: 'martyr', color: 'red', fastFree: true,
    saints: [{ name: 'Holy Protomartyr and Archdeacon Stephen', description: 'First Christian martyr, stoned to death (Acts 7)' }],
    readings: { epistle: 'Acts 6:8-7:5, 47-60', gospel: 'Matthew 21:33-42' } },

  // === JANUARY ===
  '01-01': { name: 'Circumcision of Our Lord / St. Basil the Great', rank: 'major', type: 'lords', color: 'white', fastFree: true,
    saints: [
      { name: 'Circumcision of Our Lord and Savior Jesus Christ', description: 'Eighth day after the Nativity' },
      { name: 'St. Basil the Great, Archbishop of Caesarea', description: 'One of the Three Holy Hierarchs, liturgist and theologian (379 AD)' }
    ],
    readings: { epistle: 'Colossians 2:8-12', gospel: 'Luke 2:20-21, 40-52' } },
  '01-05': { name: 'Eve of Theophany (Royal Hours)', rank: 'minor', type: 'other', color: 'white', fasting: 'strict',
    saints: [{ name: 'Paramony — Eve of Theophany', description: 'Royal Hours and strict fast. Great Blessing of Water on this evening.' }],
    readings: { epistle: '1 Corinthians 9:19-27', gospel: 'Luke 3:1-18' } },
  '01-06': { name: 'Holy Theophany', rank: 'great', type: 'lords', color: 'white', fastFree: true,
    saints: [{ name: 'Holy Theophany of Our Lord, God, and Savior Jesus Christ', description: 'Baptism of Christ in the River Jordan by St. John the Forerunner' }],
    readings: { epistle: 'Titus 2:11-14; 3:4-7', gospel: 'Matthew 3:13-17' } },
  '01-07': { name: 'Synaxis of St. John the Baptist', rank: 'major', type: 'prophet', color: 'red', fastFree: true,
    saints: [{ name: 'Synaxis of the Holy Glorious Prophet and Forerunner John the Baptist', description: 'Day after Theophany — honor to the Baptizer' }],
    readings: { epistle: 'Acts 19:1-8', gospel: 'John 1:29-34' } },
  '01-17': { name: 'St. Anthony the Great', rank: 'major', type: 'monk', color: 'green',
    saints: [{ name: 'Venerable Anthony the Great', description: 'Father of Monasticism, Desert Father of Egypt (356 AD)' }],
    readings: { epistle: 'Ephesians 6:10-17', gospel: 'Matthew 4:25-5:12' } },
  '01-18': { name: 'Sts. Athanasius and Cyril of Alexandria', rank: 'minor', type: 'hierarch', color: 'gold',
    saints: [{ name: 'Sts. Athanasius and Cyril, Archbishops of Alexandria', description: 'Defenders of Orthodox Christology' }],
    readings: { epistle: 'Hebrews 13:7-16', gospel: 'Matthew 5:14-19' } },
  '01-20': { name: 'Venerable Euthymius the Great', rank: 'minor', type: 'monk', color: 'green',
    saints: [{ name: 'Venerable Euthymius the Great', description: 'Abbot and desert father in Palestine (473 AD)' }],
    readings: { epistle: '2 Corinthians 4:6-15', gospel: 'Luke 6:17-23' } },
  '01-25': { name: 'St. Gregory the Theologian', rank: 'major', type: 'hierarch', color: 'gold',
    saints: [{ name: 'St. Gregory the Theologian, Archbishop of Constantinople', description: 'One of the Three Holy Hierarchs, Doctor of the Church (390 AD)' }],
    readings: { epistle: 'Hebrews 7:26-8:2', gospel: 'John 10:9-16' } },
  '01-30': { name: 'Three Holy Hierarchs', rank: 'major', type: 'hierarch', color: 'gold',
    saints: [{ name: 'Synaxis of the Three Great Hierarchs', description: 'Basil the Great, Gregory the Theologian, and John Chrysostom' }],
    readings: { epistle: 'Hebrews 13:7-16', gospel: 'Matthew 5:14-19' } },

  // === FEBRUARY ===
  '02-02': { name: 'Presentation of Our Lord', rank: 'great', type: 'lords', color: 'white',
    saints: [{ name: 'Meeting of Our Lord in the Temple (Hypapante)', description: 'The infant Christ is brought to the Temple and received by Simeon and Anna' }],
    readings: { epistle: 'Hebrews 7:7-17', gospel: 'Luke 2:22-40' } },
  '02-10': { name: 'Hieromartyr Haralambos', rank: 'minor', type: 'martyr', color: 'red',
    saints: [{ name: 'Hieromartyr Haralambos', description: 'Bishop of Magnesia, martyred at age 113 (c. 202 AD)' }],
    readings: { epistle: '2 Timothy 2:1-10', gospel: 'John 15:17-16:2' } },
  '02-24': { name: 'First and Second Finding of the Head of St. John', rank: 'major', type: 'prophet', color: 'red',
    saints: [{ name: 'First and Second Finding of the Venerable Head of St. John the Baptist', description: 'Discovery of the head of the Forerunner' }],
    readings: { epistle: '2 Corinthians 4:6-15', gospel: 'Matthew 11:2-15' } },

  // === MARCH ===
  '03-09': { name: 'Forty Martyrs of Sebastia', rank: 'minor', type: 'martyr', color: 'red',
    saints: [{ name: 'Holy Forty Martyrs of Sebastia', description: 'Forty Roman soldiers martyred for their faith on a frozen lake (320 AD)' }],
    readings: { epistle: 'Hebrews 12:1-10', gospel: 'Matthew 20:1-16' } },
  '03-25': { name: 'Annunciation of the Theotokos', rank: 'great', type: 'theotokos', color: 'blue', fasting: 'fish',
    saints: [{ name: 'Annunciation of the Most Holy Theotokos', description: 'The Archangel Gabriel announces to the Virgin Mary that she will bear the Son of God' }],
    readings: { epistle: 'Hebrews 2:11-18', gospel: 'Luke 1:24-38' } },

  // === APRIL ===
  '04-23': { name: 'Great Martyr George', rank: 'major', type: 'martyr', color: 'red',
    saints: [{ name: 'Holy Great Martyr George the Trophy-Bearer', description: 'One of the most venerated saints, martyred under Diocletian (303 AD)' }],
    readings: { epistle: 'Acts 12:1-11', gospel: 'John 15:17-16:2' } },
  '04-25': { name: 'Apostle and Evangelist Mark', rank: 'major', type: 'apostle', color: 'red',
    saints: [{ name: 'Holy Apostle and Evangelist Mark', description: 'Author of the Second Gospel, founder of the Church of Alexandria' }],
    readings: { epistle: '1 Peter 5:6-14', gospel: 'Mark 6:7-13' } },

  // === MAY ===
  '05-02': { name: 'Translation of the Relics of St. Athanasius', rank: 'minor', type: 'hierarch', color: 'gold',
    saints: [{ name: 'St. Athanasius the Great, Archbishop of Alexandria', description: 'Champion of Orthodoxy against Arianism (373 AD)' }],
    readings: { epistle: 'Hebrews 13:7-16', gospel: 'Matthew 5:14-19' } },
  '05-08': { name: 'Apostle and Evangelist John the Theologian', rank: 'major', type: 'apostle', color: 'red',
    saints: [{ name: 'Holy Apostle and Evangelist John the Theologian', description: 'The beloved disciple, author of the Gospel and Revelation' }],
    readings: { epistle: '1 John 1:1-7', gospel: 'John 19:25-27; 21:24-25' } },
  '05-11': { name: 'Sts. Cyril and Methodius', rank: 'minor', type: 'other', color: 'gold',
    saints: [{ name: 'Sts. Cyril and Methodius, Equal-to-the-Apostles', description: 'Apostles to the Slavs, creators of the Slavonic alphabet' }],
    readings: { epistle: 'Hebrews 7:26-8:2', gospel: 'John 10:9-16' } },
  '05-21': { name: 'Sts. Constantine and Helen', rank: 'major', type: 'righteous', color: 'gold',
    saints: [{ name: 'Holy Equal-to-the-Apostles Emperor Constantine and his mother Helen', description: 'Constantine legalized Christianity (337 AD); Helen found the True Cross' }],
    readings: { epistle: 'Acts 26:1-5, 12-20', gospel: 'John 10:1-9' } },

  // === JUNE ===
  '06-11': { name: 'Apostles Bartholomew and Barnabas', rank: 'minor', type: 'apostle', color: 'red',
    saints: [{ name: 'Holy Apostles Bartholomew and Barnabas', description: 'Apostles and companions of St. Paul' }],
    readings: { epistle: 'Acts 11:19-30', gospel: 'Luke 10:16-21' } },
  '06-24': { name: 'Nativity of St. John the Baptist', rank: 'major', type: 'prophet', color: 'red', fasting: 'fish',
    saints: [{ name: 'Nativity of the Holy Glorious Prophet and Forerunner John the Baptist', description: 'Birth of the Forerunner to Zachariah and Elizabeth' }],
    readings: { epistle: 'Romans 13:11-14:4', gospel: 'Luke 1:1-25, 57-68, 76, 80' } },
  '06-29': { name: 'Holy Apostles Peter and Paul', rank: 'great', type: 'apostle', color: 'red', fastFree: true,
    saints: [
      { name: 'Holy, Glorious, and All-Praised Leaders of the Apostles, Peter and Paul', description: 'Chief apostles of Christ. End of the Apostles\' Fast.' }
    ],
    readings: { epistle: '2 Corinthians 11:21-12:9', gospel: 'Matthew 16:13-19' } },
  '06-30': { name: 'Synaxis of the Twelve Apostles', rank: 'major', type: 'apostle', color: 'red',
    saints: [{ name: 'Synaxis of the Twelve Holy, Glorious, and All-Praised Apostles', description: 'Collective commemoration of all twelve apostles' }],
    readings: { epistle: '1 Corinthians 4:9-16', gospel: 'Mark 3:13-19' } },

  // === JULY ===
  '07-01': { name: 'Sts. Cosmas and Damian', rank: 'minor', type: 'martyr', color: 'red',
    saints: [{ name: 'Holy Unmercenary Healers Cosmas and Damian', description: 'Twin brothers who healed the sick without payment' }],
    readings: { epistle: '1 Corinthians 12:27-13:8', gospel: 'Matthew 10:1, 5-8' } },
  '07-17': { name: 'Great Martyr Marina', rank: 'minor', type: 'martyr', color: 'red',
    saints: [{ name: 'Holy Great Martyr Marina (Margaret)', description: 'Virgin martyr of Antioch in Pisidia' }],
    readings: { epistle: '2 Corinthians 6:1-10', gospel: 'Mark 5:24-34' } },
  '07-20': { name: 'Prophet Elijah', rank: 'major', type: 'prophet', color: 'gold',
    saints: [{ name: 'Holy Glorious Prophet Elijah the Tishbite', description: 'The great Old Testament prophet taken up to heaven in a fiery chariot' }],
    readings: { epistle: 'James 5:10-20', gospel: 'Luke 4:22-30' } },
  '07-22': { name: 'St. Mary Magdalene', rank: 'major', type: 'righteous', color: 'red',
    saints: [{ name: 'Holy Myrrhbearer and Equal-to-the-Apostles Mary Magdalene', description: 'First witness of the Resurrection' }],
    readings: { epistle: '1 Corinthians 9:2-12', gospel: 'Luke 8:1-3' } },
  '07-25': { name: 'Dormition of St. Anna', rank: 'minor', type: 'righteous', color: 'green',
    saints: [{ name: 'Dormition of St. Anna, Mother of the Theotokos', description: 'Mother of the Most Holy Virgin Mary' }],
    readings: { epistle: 'Galatians 4:22-31', gospel: 'Luke 8:16-21' } },
  '07-26': { name: 'St. Paraskeva of Rome', rank: 'minor', type: 'martyr', color: 'red',
    saints: [{ name: 'Holy Martyr Paraskeva of Rome', description: 'Virgin martyr during the reign of Antoninus Pius' }],
    readings: { epistle: 'Galatians 3:23-4:5', gospel: 'Mark 5:24-34' } },
  '07-27': { name: 'Great Martyr Panteleimon', rank: 'major', type: 'martyr', color: 'red', fasting: 'fish',
    saints: [{ name: 'Holy Great Martyr and Healer Panteleimon', description: 'Unmercenary healer and physician, martyred under Maximian (305 AD)' }],
    readings: { epistle: '2 Timothy 2:1-10', gospel: 'John 15:17-16:2' } },

  // === AUGUST ===
  '08-01': { name: 'Procession of the Cross / Dormition Fast begins', rank: 'minor', type: 'cross', color: 'purple',
    saints: [{ name: 'Procession of the Precious Wood of the Life-Giving Cross', description: 'Beginning of the Dormition Fast. Also: Holy Maccabean Martyrs.' }],
    readings: { epistle: '1 Corinthians 1:18-24', gospel: 'John 19:6-11, 13-20, 25-28, 30-35' } },
  '08-06': { name: 'Transfiguration of Our Lord', rank: 'great', type: 'lords', color: 'white', fasting: 'fish',
    saints: [{ name: 'Holy Transfiguration of Our Lord, God, and Savior Jesus Christ', description: 'Christ reveals His divine glory on Mount Tabor to Peter, James, and John' }],
    readings: { epistle: '2 Peter 1:10-19', gospel: 'Matthew 17:1-9' } },
  '08-15': { name: 'Dormition of the Theotokos', rank: 'great', type: 'theotokos', color: 'blue', fastFree: true,
    saints: [{ name: 'Dormition (Falling Asleep) of the Most Holy Theotokos', description: 'The passing of the Virgin Mary, surrounded by the Apostles. End of the Dormition Fast.' }],
    readings: { epistle: 'Philippians 2:5-11', gospel: 'Luke 10:38-42; 11:27-28' } },
  '08-16': { name: 'Translation of the Icon "Not Made By Hands"', rank: 'minor', type: 'lords', color: 'white', fastFree: true,
    saints: [{ name: 'Translation of the Icon of Our Lord "Not Made By Hands"', description: 'Transfer of the Holy Mandylion from Edessa to Constantinople' }],
    readings: { epistle: 'Colossians 1:12-18', gospel: 'Luke 9:51-56; 10:22-24' } },
  '08-29': { name: 'Beheading of St. John the Baptist', rank: 'great', type: 'prophet', color: 'red', fasting: 'strict',
    saints: [{ name: 'Beheading of the Holy Glorious Prophet and Forerunner John the Baptist', description: 'Martyrdom of St. John by order of Herod Antipas. Strict fast day.' }],
    readings: { epistle: 'Acts 13:25-33', gospel: 'Mark 6:14-30' } },
  '08-31': { name: 'Placing of the Cincture of the Theotokos', rank: 'minor', type: 'theotokos', color: 'blue',
    saints: [{ name: 'Placing of the Honorable Sash (Cincture) of the Most Holy Theotokos', description: 'Transfer of the sash of the Theotokos to Constantinople' }],
    readings: { epistle: 'Hebrews 9:1-7', gospel: 'Luke 10:38-42; 11:27-28' } },
};

// ============================================================
// MOVABLE FEASTS — Offsets from Pascha Sunday (day 0)
// ============================================================
// Negative = before Pascha, positive = after Pascha

const MOVABLE_FEAST_OFFSETS = {
  // Triodion begins (10 weeks before Pascha)
  '-70': { name: 'Sunday of the Publican and Pharisee', rank: 'minor', type: 'other', color: 'gold',
    saints: [{ name: 'Sunday of the Publican and Pharisee', description: 'Beginning of the Triodion. The following week is fast-free.' }],
    readings: { epistle: '2 Timothy 3:10-15', gospel: 'Luke 18:10-14' } },
  '-63': { name: 'Sunday of the Prodigal Son', rank: 'minor', type: 'other', color: 'gold',
    saints: [{ name: 'Sunday of the Prodigal Son', description: 'Parable of the prodigal son. The following week is Meatfare Week.' }],
    readings: { epistle: '1 Corinthians 6:12-20', gospel: 'Luke 15:11-32' } },
  '-56': { name: 'Meatfare Sunday (Last Judgment)', rank: 'minor', type: 'other', color: 'gold',
    saints: [{ name: 'Sunday of the Last Judgment (Meatfare)', description: 'Last day to eat meat before Pascha. The following week is Cheesefare Week.' }],
    readings: { epistle: '1 Corinthians 8:8-9:2', gospel: 'Matthew 25:31-46' } },
  '-49': { name: 'Cheesefare Sunday (Forgiveness Sunday)', rank: 'minor', type: 'other', color: 'gold',
    saints: [{ name: 'Cheesefare Sunday / Forgiveness Sunday', description: 'Last day of dairy before Lent. Forgiveness Vespers in the evening.' }],
    readings: { epistle: 'Romans 13:11-14:4', gospel: 'Matthew 6:14-21' } },
  '-48': { name: 'Clean Monday', rank: 'minor', type: 'other', color: 'purple',
    saints: [{ name: 'Clean Monday — Beginning of Great Lent', description: 'First day of the Great Fast. Strict fast — no food or only bread and water.' }],
    readings: { epistle: 'Isaiah 1:1-20', gospel: null } },
  '-43': { name: 'Saturday of Souls (1st)', rank: 'minor', type: 'other', color: 'purple',
    saints: [{ name: 'Saturday of Souls — Commemoration of the Departed', description: 'First of the memorial Saturdays during Great Lent' }] },
  '-42': { name: '1st Sunday of Lent — Triumph of Orthodoxy', rank: 'minor', type: 'other', color: 'gold',
    saints: [{ name: 'Sunday of Orthodoxy', description: 'Celebration of the restoration of icons in 843 AD' }],
    readings: { epistle: 'Hebrews 11:24-26, 32-12:2', gospel: 'John 1:43-51' } },
  '-35': { name: '2nd Sunday of Lent — St. Gregory Palamas', rank: 'minor', type: 'hierarch', color: 'gold',
    saints: [{ name: 'St. Gregory Palamas, Archbishop of Thessaloniki', description: 'Defender of Hesychasm and the uncreated energies of God' }],
    readings: { epistle: 'Hebrews 1:10-2:3', gospel: 'Mark 2:1-12' } },
  '-28': { name: '3rd Sunday of Lent — Veneration of the Cross', rank: 'minor', type: 'cross', color: 'purple',
    saints: [{ name: 'Veneration of the Holy Cross', description: 'The Cross is brought out for veneration at the midpoint of Lent' }],
    readings: { epistle: 'Hebrews 4:14-5:6', gospel: 'Mark 8:34-9:1' } },
  '-21': { name: '4th Sunday of Lent — St. John Climacus', rank: 'minor', type: 'monk', color: 'gold',
    saints: [{ name: 'Venerable John Climacus (of the Ladder)', description: 'Author of "The Ladder of Divine Ascent"' }],
    readings: { epistle: 'Hebrews 6:13-20', gospel: 'Mark 9:17-31' } },
  '-14': { name: '5th Sunday of Lent — St. Mary of Egypt', rank: 'minor', type: 'righteous', color: 'gold',
    saints: [{ name: 'Venerable Mary of Egypt', description: 'Great penitent who lived 47 years in the desert' }],
    readings: { epistle: 'Hebrews 9:11-14', gospel: 'Mark 10:32-45' } },
  '-8': { name: 'Lazarus Saturday', rank: 'major', type: 'lords', color: 'white', fasting: 'fish',
    saints: [{ name: 'Saturday of Lazarus', description: 'Commemoration of the raising of Lazarus from the dead. Fish is allowed.' }],
    readings: { epistle: 'Hebrews 12:28-13:8', gospel: 'John 11:1-45' } },
  '-7': { name: 'Palm Sunday', rank: 'great', type: 'lords', color: 'green', fasting: 'fish',
    saints: [{ name: 'Entry of Our Lord into Jerusalem (Palm Sunday)', description: 'Christ\'s triumphal entry into Jerusalem. Fish is allowed.' }],
    readings: { epistle: 'Philippians 4:4-9', gospel: 'John 12:1-18' } },
  '-6': { name: 'Great and Holy Monday', rank: 'minor', type: 'other', color: 'red', fasting: 'strict',
    saints: [{ name: 'Great and Holy Monday', description: 'Bridegroom Matins. Parable of the barren fig tree.' }],
    readings: { epistle: null, gospel: 'Matthew 21:18-43' } },
  '-5': { name: 'Great and Holy Tuesday', rank: 'minor', type: 'other', color: 'red', fasting: 'strict',
    saints: [{ name: 'Great and Holy Tuesday', description: 'Bridegroom Matins. Parable of the Ten Virgins.' }],
    readings: { epistle: null, gospel: 'Matthew 22:15-23:39' } },
  '-4': { name: 'Great and Holy Wednesday', rank: 'minor', type: 'other', color: 'red', fasting: 'strict',
    saints: [{ name: 'Great and Holy Wednesday', description: 'Holy Unction. The sinful woman anoints Christ\'s feet.' }],
    readings: { epistle: null, gospel: 'Matthew 26:6-16' } },
  '-3': { name: 'Great and Holy Thursday', rank: 'major', type: 'other', color: 'red', fasting: 'strict',
    saints: [{ name: 'Great and Holy Thursday', description: 'The Mystical Supper. Washing of the disciples\' feet. Twelve Gospels.' }],
    readings: { epistle: '1 Corinthians 11:23-32', gospel: 'Matthew 26:1-20; John 13:3-17; Matthew 26:21-39; Luke 22:43-45; Matthew 26:40-27:2' } },
  '-2': { name: 'Great and Holy Friday', rank: 'major', type: 'other', color: 'red', fasting: 'strict',
    saints: [{ name: 'Great and Holy Friday — The Passion of Our Lord', description: 'The Crucifixion. Royal Hours. Epitaphios (Burial) Vespers. Strict fast or total abstinence.' }],
    readings: { epistle: null, gospel: 'Composite Passion Gospels' } },
  '-1': { name: 'Great and Holy Saturday', rank: 'major', type: 'other', color: 'white', fasting: 'strict',
    saints: [{ name: 'Great and Holy Saturday', description: 'Christ\'s descent into Hades. Liturgy of St. Basil. First Paschal proclamation.' }],
    readings: { epistle: 'Romans 6:3-11', gospel: 'Matthew 28:1-20' } },
  '0': { name: 'PASCHA — The Resurrection of Our Lord', rank: 'great', type: 'lords', color: 'white', fastFree: true,
    saints: [{ name: 'PASCHA — The Holy and Great Sunday of the Life-Giving Resurrection of Our Lord', description: 'Christ is Risen! The Feast of Feasts and the Triumph of Triumphs.' }],
    readings: { epistle: 'Acts 1:1-8', gospel: 'John 1:1-17' } },
  // Bright Week (Pascha +1 to +6)
  '1': { name: 'Bright Monday', rank: 'major', type: 'lords', color: 'white', fastFree: true,
    saints: [{ name: 'Bright Monday', description: 'Bright Week — the entire week is celebrated as one continuous day of Pascha' }] },
  '2': { name: 'Bright Tuesday', rank: 'minor', type: 'lords', color: 'white', fastFree: true,
    saints: [{ name: 'Bright Tuesday', description: 'Bright Week continues' }] },
  '3': { name: 'Bright Wednesday', rank: 'minor', type: 'lords', color: 'white', fastFree: true,
    saints: [{ name: 'Bright Wednesday', description: 'Bright Week continues' }] },
  '4': { name: 'Bright Thursday', rank: 'minor', type: 'lords', color: 'white', fastFree: true,
    saints: [{ name: 'Bright Thursday', description: 'Bright Week continues' }] },
  '5': { name: 'Bright Friday — Life-Giving Spring', rank: 'minor', type: 'theotokos', color: 'blue', fastFree: true,
    saints: [{ name: 'Bright Friday — Theotokos of the Life-Giving Spring', description: 'Feast of the Theotokos celebrated on Bright Friday' }] },
  '6': { name: 'Bright Saturday', rank: 'minor', type: 'lords', color: 'white', fastFree: true,
    saints: [{ name: 'Bright Saturday', description: 'End of Bright Week' }] },
  // Sundays after Pascha
  '7': { name: 'Thomas Sunday (Antipascha)', rank: 'major', type: 'lords', color: 'white',
    saints: [{ name: 'Sunday of Thomas (Antipascha)', description: 'Doubting Thomas touches the risen Christ\'s wounds' }],
    readings: { epistle: 'Acts 5:12-20', gospel: 'John 20:19-31' } },
  '14': { name: 'Sunday of the Myrrh-Bearing Women', rank: 'minor', type: 'other', color: 'gold',
    saints: [{ name: 'Sunday of the Holy Myrrh-Bearing Women', description: 'The women who came to anoint Christ\'s body at the tomb' }],
    readings: { epistle: 'Acts 6:1-7', gospel: 'Mark 15:43-16:8' } },
  '21': { name: 'Sunday of the Paralytic', rank: 'minor', type: 'other', color: 'gold',
    saints: [{ name: 'Sunday of the Paralytic', description: 'Healing of the paralytic at the Pool of Bethesda' }],
    readings: { epistle: 'Acts 9:32-42', gospel: 'John 5:1-15' } },
  '24': { name: 'Mid-Pentecost', rank: 'minor', type: 'lords', color: 'gold',
    saints: [{ name: 'Mid-Pentecost', description: 'Midpoint between Pascha and Pentecost' }],
    readings: { epistle: 'Acts 14:6-18', gospel: 'John 7:14-30' } },
  '28': { name: 'Sunday of the Samaritan Woman', rank: 'minor', type: 'other', color: 'gold',
    saints: [{ name: 'Sunday of the Samaritan Woman', description: 'Christ speaks with the Samaritan woman at Jacob\'s well' }],
    readings: { epistle: 'Acts 11:19-30', gospel: 'John 4:5-42' } },
  '35': { name: 'Sunday of the Blind Man', rank: 'minor', type: 'other', color: 'gold',
    saints: [{ name: 'Sunday of the Blind Man', description: 'Healing of the man born blind' }],
    readings: { epistle: 'Acts 16:16-34', gospel: 'John 9:1-38' } },
  '39': { name: 'Ascension of Our Lord', rank: 'great', type: 'lords', color: 'white',
    saints: [{ name: 'Ascension of Our Lord, God, and Savior Jesus Christ', description: 'Christ ascends to heaven from the Mount of Olives, 40 days after Pascha' }],
    readings: { epistle: 'Acts 1:1-12', gospel: 'Luke 24:36-53' } },
  '42': { name: 'Sunday of the Fathers of the First Council', rank: 'minor', type: 'hierarch', color: 'gold',
    saints: [{ name: 'Sunday of the 318 Holy Fathers of the First Ecumenical Council', description: 'Commemoration of the Council of Nicaea (325 AD)' }],
    readings: { epistle: 'Acts 20:16-18, 28-36', gospel: 'John 17:1-13' } },
  '48': { name: 'Saturday of Souls before Pentecost', rank: 'minor', type: 'other', color: 'green',
    saints: [{ name: 'Saturday of Souls — Commemoration of the Departed', description: 'Memorial Saturday before Pentecost' }] },
  '49': { name: 'Holy Pentecost', rank: 'great', type: 'lords', color: 'green', fastFree: true,
    saints: [{ name: 'Holy Pentecost — Descent of the Holy Spirit', description: 'The Holy Spirit descends upon the Apostles. Birthday of the Church.' }],
    readings: { epistle: 'Acts 2:1-11', gospel: 'John 7:37-52; 8:12' } },
  '50': { name: 'Monday of the Holy Spirit', rank: 'major', type: 'other', color: 'green', fastFree: true,
    saints: [{ name: 'Monday of the Holy Spirit', description: 'Continuation of the Pentecost feast' }] },
  '56': { name: 'All Saints Sunday', rank: 'major', type: 'other', color: 'gold',
    saints: [{ name: 'Sunday of All Saints', description: 'Commemoration of all known and unknown saints. Apostles\' Fast begins tomorrow.' }],
    readings: { epistle: 'Hebrews 11:33-12:2', gospel: 'Matthew 10:32-33, 37-38; 19:27-30' } },
  '63': { name: 'All Saints of the Local Church', rank: 'minor', type: 'other', color: 'gold',
    saints: [{ name: 'Sunday of All Saints of the Local Church', description: 'Commemoration of all saints of the local Orthodox tradition' }] },
};

// ============================================================
// LITURGICAL COLOR CALCULATION
// ============================================================

/**
 * Color-to-MUI-theme mapping
 */
const COLOR_TO_THEME = {
  white:  'WHITE_THEME',
  gold:   'GOLD_THEME',
  blue:   'BLUE_THEME',
  red:    'RED_THEME',
  green:  'GREEN_THEME',
  purple: 'PURPLE_THEME',
};

/**
 * Determine the liturgical color for a given date.
 * Priority order follows traditional Orthodox practice.
 */
function getLiturgicalColor(date, pascha, calendarType = 'Revised Julian') {
  const offset = daysBetween(date, pascha);
  const dayOfWeek = date.getDay(); // 0=Sunday

  // 1. Check movable feasts first (they override fixed feasts for color)
  const movableFeast = MOVABLE_FEAST_OFFSETS[String(offset)];
  if (movableFeast && movableFeast.color) {
    return movableFeast.color;
  }

  // 2. Check fixed feasts (calendar-type-aware)
  const fixedResult = getFixedFeastForDate(date, calendarType);
  if (fixedResult && fixedResult.feast.color) {
    return fixedResult.feast.color;
  }

  // 3. Holy Week (Mon-Sat before Pascha) — red
  if (offset >= -6 && offset <= -1) {
    return 'red';
  }

  // 4. Bright Week — white
  if (offset >= 0 && offset <= 6) {
    return 'white';
  }

  // 5. Great Lent weekdays (Clean Monday through Lazarus Saturday eve)
  if (offset >= -48 && offset <= -9) {
    if (dayOfWeek === 0) return 'gold'; // Lent Sundays get gold (bright)
    return 'purple';
  }

  // 6. Paschal season (Pascha to Pentecost) — Sundays white, weekdays gold
  if (offset > 6 && offset < 49) {
    if (dayOfWeek === 0) return 'white';
    return 'gold';
  }

  // 7. Any Sunday — gold
  if (dayOfWeek === 0) {
    return 'gold';
  }

  // 8. Default weekday — green
  return 'green';
}

// ============================================================
// FASTING CALCULATION
// ============================================================

/**
 * Fasting levels:
 * - strict: No food, or bread/water only (Holy Week, certain vigils)
 * - wine_oil: Wine and oil allowed, no meat/dairy/fish
 * - fish: Fish, wine, and oil allowed
 * - dairy: Dairy allowed but no meat (Cheesefare week)
 * - fast_free: No restrictions
 */
function getFastingLevel(date, pascha, calendarType = 'Revised Julian') {
  const offset = daysBetween(date, pascha);
  const dayOfWeek = date.getDay(); // 0=Sunday, 3=Wednesday, 5=Friday

  // For fixed-date comparisons, use the calendar-equivalent date
  // Julian churches: subtract 13 days to get the equivalent New Calendar month/day
  const fixedDate = calendarType === 'Julian' ? addDays(date, -13) : date;
  const month = fixedDate.getMonth() + 1;
  const day = fixedDate.getDate();

  // Check movable feast fasting override
  const movableFeast = MOVABLE_FEAST_OFFSETS[String(offset)];
  if (movableFeast) {
    if (movableFeast.fastFree) return 'fast_free';
    if (movableFeast.fasting) return movableFeast.fasting;
  }

  // Check fixed feast fasting override (calendar-type-aware)
  const fixedResult = getFixedFeastForDate(date, calendarType);
  if (fixedResult) {
    if (fixedResult.feast.fastFree) return 'fast_free';
    if (fixedResult.feast.fasting) return fixedResult.feast.fasting;
  }

  // === FAST-FREE WEEKS ===

  // Week after Nativity (Dec 25 – Jan 4 in calendar-equivalent dates)
  if ((month === 12 && day >= 25) || (month === 1 && day <= 4)) {
    return 'fast_free';
  }

  // Week after Theophany (Jan 7-14 in calendar-equivalent dates)
  if (month === 1 && day >= 7 && day <= 14) {
    return 'fast_free';
  }

  // Week of the Publican and Pharisee (fast-free, offset -69 to -64)
  if (offset >= -69 && offset <= -64) {
    return 'fast_free';
  }

  // Bright Week (Pascha +0 to +6)
  if (offset >= 0 && offset <= 6) {
    return 'fast_free';
  }

  // Week after Pentecost (offset +50 to +55)
  if (offset >= 50 && offset <= 55) {
    return 'fast_free';
  }

  // === CHEESEFARE WEEK (dairy, no meat) ===
  if (offset >= -55 && offset <= -49) {
    return 'dairy';
  }

  // === GREAT LENT ===
  if (offset >= -48 && offset <= -8) {
    // Weekdays: strict fast (wine/oil on weekends)
    if (dayOfWeek === 6 || dayOfWeek === 0) {
      // Saturdays and Sundays of Lent: wine and oil allowed
      return 'wine_oil';
    }
    // Annunciation during Lent: fish allowed (handled by fixed feast check above)
    return 'strict';
  }

  // === HOLY WEEK ===
  if (offset >= -7 && offset <= -1) {
    if (offset === -7) return 'fish'; // Palm Sunday — fish
    return 'strict'; // Rest of Holy Week
  }

  // === APOSTLES' FAST ===
  // Monday after All Saints Sunday (offset +57) through June 28
  if (offset >= 57 && month <= 6 && !(month === 6 && day >= 29)) {
    // Mon, Wed, Fri: strict; Tue, Thu: wine_oil; Sat, Sun: fish
    if (dayOfWeek === 6 || dayOfWeek === 0) return 'fish';
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) return 'strict';
    return 'wine_oil';
  }

  // === DORMITION FAST (Aug 1-14) ===
  if (month === 8 && day >= 1 && day <= 14) {
    // Transfiguration (Aug 6): fish — handled by fixed feast check above
    if (dayOfWeek === 6 || dayOfWeek === 0) return 'wine_oil';
    return 'strict';
  }

  // === NATIVITY FAST (Nov 15 – Dec 24) ===
  if ((month === 11 && day >= 15) || (month === 12 && day <= 24)) {
    // Nov 15 – Dec 19: Mon/Wed/Fri strict, Tue/Thu wine_oil, Sat/Sun fish
    if (month === 12 && day >= 20) {
      // Dec 20-24: stricter period
      if (dayOfWeek === 6 || dayOfWeek === 0) return 'fish';
      return 'strict';
    }
    if (dayOfWeek === 6 || dayOfWeek === 0) return 'fish';
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) return 'strict';
    return 'wine_oil';
  }

  // === ORDINARY WEEKLY FASTING ===
  if (dayOfWeek === 3 || dayOfWeek === 5) {
    // Wednesday and Friday: wine and oil
    return 'wine_oil';
  }

  // No fast
  return 'fast_free';
}

/**
 * Human-readable fasting description
 */
function getFastingDescription(level) {
  const descriptions = {
    strict: 'Strict Fast — no meat, dairy, fish, wine, or oil',
    wine_oil: 'Wine & Oil — meat, dairy, and fish restricted',
    fish: 'Fish Allowed — meat and dairy restricted',
    dairy: 'Dairy Allowed — meat restricted (Cheesefare)',
    fast_free: 'No fasting restrictions',
  };
  return descriptions[level] || 'No fasting restrictions';
}

// ============================================================
// TONE (OCTOECHOS) CALCULATION
// ============================================================

/**
 * Calculate the liturgical tone (1-8) for a given date.
 * The 8 tones rotate weekly starting from the Sunday after Pentecost.
 * During Lent and Paschal season, tones still apply but are less prominent.
 */
function getTone(date, pascha) {
  const offset = daysBetween(date, pascha);

  // No tone during Bright Week
  if (offset >= 0 && offset <= 6) return null;

  // Tone 1 starts on Thomas Sunday (week after Pascha)
  // Then rotates through 8 tones
  if (offset >= 7) {
    const weeksSinceThomas = Math.floor((offset - 7) / 7);
    return (weeksSinceThomas % 8) + 1;
  }

  // Before Pascha: tones still rotate but counted from previous year's Pentecost
  // Simplified: calculate based on the previous Pascha cycle
  const prevPascha = calculatePascha(date.getFullYear() - 1);
  const prevOffset = daysBetween(date, prevPascha);
  if (prevOffset >= 7) {
    const weeksSinceThomas = Math.floor((prevOffset - 7) / 7);
    return (weeksSinceThomas % 8) + 1;
  }

  return 1; // Fallback
}

// ============================================================
// SEASON CALCULATION
// ============================================================

/**
 * Determine the liturgical season for a given date.
 */
function getSeason(date, pascha, calendarType = 'Revised Julian') {
  const offset = daysBetween(date, pascha);
  const fixedDate = calendarType === 'Julian' ? addDays(date, -13) : date;
  const month = fixedDate.getMonth() + 1;
  const day = fixedDate.getDate();

  // Pre-Lenten period (Triodion)
  if (offset >= -70 && offset < -48) return 'Triodion';

  // Great Lent
  if (offset >= -48 && offset < -7) return 'Great Lent';

  // Holy Week
  if (offset >= -7 && offset < 0) return 'Holy Week';

  // Pascha and Bright Week
  if (offset >= 0 && offset <= 6) return 'Bright Week';

  // Pentecostarion (Pascha to Pentecost)
  if (offset > 6 && offset < 49) return 'Pentecostarion';

  // Pentecost Sunday
  if (offset === 49) return 'Pentecost';

  // Apostles' Fast
  if (offset >= 57 && month <= 6 && !(month === 6 && day >= 29)) return 'Apostles\' Fast';

  // Dormition Fast
  if (month === 8 && day >= 1 && day <= 14) return 'Dormition Fast';

  // Nativity Fast
  if ((month === 11 && day >= 15) || (month === 12 && day <= 24)) return 'Nativity Fast';

  // After Pentecost / Ordinary Time
  return 'Ordinary Time';
}

// ============================================================
// COMBINED DAY DATA
// ============================================================

/**
 * Get complete liturgical data for a given date.
 */
function getDayData(date, calendarType = 'Revised Julian') {
  const year = date.getFullYear();
  const pascha = calculatePascha(year);
  const offset = daysBetween(date, pascha);
  const dayOfWeek = date.getDay();

  const color = getLiturgicalColor(date, pascha, calendarType);
  const fastingLevel = getFastingLevel(date, pascha, calendarType);
  const tone = getTone(date, pascha);
  const season = getSeason(date, pascha, calendarType);

  // Gather feast data
  const movableFeast = MOVABLE_FEAST_OFFSETS[String(offset)];
  const fixedResult = getFixedFeastForDate(date, calendarType);

  // Determine primary feast (movable takes precedence for naming if great/major)
  let primaryFeast = null;
  let feastRank = 'ordinary';
  const saints = [];
  let readings = null;
  let oldStyleDate = null;

  if (movableFeast) {
    primaryFeast = movableFeast;
    feastRank = movableFeast.rank || 'minor';
    if (movableFeast.saints) saints.push(...movableFeast.saints);
    if (movableFeast.readings) readings = movableFeast.readings;
  }

  if (fixedResult) {
    const fixedFeast = fixedResult.feast;
    // If no movable feast or movable is lower rank, use fixed
    const rankOrder = { great: 4, major: 3, minor: 2, commemoration: 1, ordinary: 0 };
    if (!primaryFeast || (rankOrder[fixedFeast.rank] || 0) > (rankOrder[feastRank] || 0)) {
      primaryFeast = fixedFeast;
      feastRank = fixedFeast.rank || 'minor';
    }
    if (fixedFeast.saints) saints.push(...fixedFeast.saints);
    if (fixedFeast.readings && !readings) readings = fixedFeast.readings;

    // For Julian calendar, note the Old Style date
    if (calendarType === 'Julian') {
      oldStyleDate = formatOldStyleNote(fixedResult.originalDateKey);
    }
  }

  let feastName = primaryFeast ? primaryFeast.name : null;

  // Append Old Style annotation for Julian calendar fixed feasts
  if (feastName && oldStyleDate && calendarType === 'Julian') {
    feastName = `${feastName} ${oldStyleDate}`;
  }

  // Holy Week flag
  const isHolyWeek = offset >= -7 && offset <= -1;

  // Pascha distance
  const paschaDate = pascha.toISOString().split('T')[0];

  return {
    date: date.toISOString().split('T')[0],
    dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
    tone,
    season,
    liturgicalColor: color,
    feastName,
    feastRank,
    saints: saints.length > 0 ? saints : [{ name: 'Various Saints', description: 'Commemorated on this day' }],
    readings,
    fasting: {
      level: fastingLevel,
      description: getFastingDescription(fastingLevel),
    },
    isHolyWeek,
    isFastFree: fastingLevel === 'fast_free',
    isSunday: dayOfWeek === 0,
    paschaDate,
    calendarType,
    ...(oldStyleDate ? { oldStyleDate } : {}),
  };
}

// ============================================================
// DATABASE HELPERS (for parish events / local commemorations)
// ============================================================

async function getLocalCommemorations(date) {
  try {
    const [rows] = await getAppPool().query(`
      SELECT * FROM local_commemorations
      WHERE (DATE(date) = ? OR recurring = TRUE) AND active = TRUE
      ORDER BY liturgical_rank DESC, name
    `, [date.toISOString().split('T')[0]]);
    return rows.map(row => ({
      id: row.id, name: row.name, type: row.commemoration_type,
      description: row.description || '', rank: row.liturgical_rank, color: row.liturgical_color,
    }));
  } catch (error) {
    // Tables may not exist yet
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
      id: row.id, title: row.title, description: row.description || '',
      startTime: row.start_time, endTime: row.end_time, location: row.location, type: row.event_type,
    }));
  } catch (error) {
    return [];
  }
}

async function getUserPreferences(userId) {
  try {
    const [rows] = await getAppPool().query(
      'SELECT * FROM calendar_preferences WHERE user_id = ?', [userId]
    );
    if (rows.length > 0) {
      const p = rows[0];
      return {
        language: p.language, defaultView: p.default_view,
        showReadings: p.show_readings, showSaints: p.show_saints,
        showParishEvents: p.show_parish_events,
        notificationPreferences: p.notification_preferences ? JSON.parse(p.notification_preferences) : {},
      };
    }
  } catch (error) { /* tables may not exist */ }
  return {
    language: 'en', defaultView: 'today', showReadings: true,
    showSaints: true, showParishEvents: true, notificationPreferences: {},
  };
}

// ============================================================
// API ROUTES
// ============================================================

// GET /api/orthodox-calendar/liturgical-color/today
// Returns today's liturgical color and corresponding MUI theme name
router.get('/liturgical-color/today', (req, res) => {
  try {
    const today = new Date();
    const calendarType = getCalendarTypeFromRequest(req);
    const dayData = getDayData(today, calendarType);
    res.json({
      color: dayData.liturgicalColor,
      themeName: COLOR_TO_THEME[dayData.liturgicalColor] || 'GREEN_THEME',
      season: dayData.season,
      feastName: dayData.feastName,
      date: dayData.date,
    });
  } catch (error) {
    console.error('Liturgical color error:', error);
    res.status(500).json({ error: 'Failed to determine liturgical color' });
  }
});

// GET /api/orthodox-calendar/today
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    const calendarType = getCalendarTypeFromRequest(req);
    const dayData = getDayData(today, calendarType);

    // Add local data
    const localCommemorations = await getLocalCommemorations(today);
    const parishEvents = await getParishEvents(today);

    res.json({
      ...dayData,
      localCommemorations,
      parishEvents,
    });
  } catch (error) {
    console.error('Today liturgical data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orthodox-calendar/date/:date
router.get('/date/:date', async (req, res) => {
  try {
    const requestedDate = new Date(req.params.date + 'T12:00:00');
    if (isNaN(requestedDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const calendarType = getCalendarTypeFromRequest(req);
    const dayData = getDayData(requestedDate, calendarType);
    const localCommemorations = await getLocalCommemorations(requestedDate);
    const parishEvents = await getParishEvents(requestedDate);

    res.json({
      ...dayData,
      localCommemorations,
      parishEvents,
    });
  } catch (error) {
    console.error('Date liturgical data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orthodox-calendar/month/:year/:month
router.get('/month/:year/:month', (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }

    const calendarType = getCalendarTypeFromRequest(req);
    const daysInMonth = new Date(year, month, 0).getDate();
    const data = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day, 12, 0, 0);
      data[day] = getDayData(date, calendarType);
    }

    res.json({
      year,
      month,
      monthName: new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
      data,
    });
  } catch (error) {
    console.error('Month liturgical data error:', error);
    res.status(500).json({ error: 'Failed to fetch month calendar data' });
  }
});

// GET /api/orthodox-calendar/pascha/:year
router.get('/pascha/:year', (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (year < 1900 || year > 2100) {
      return res.status(400).json({ error: 'Invalid year (1900-2100)' });
    }

    const pascha = calculatePascha(year);
    res.json({
      year,
      pascha: pascha.toISOString().split('T')[0],
      paschaFormatted: pascha.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      }),
    });
  } catch (error) {
    console.error('Pascha calculation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orthodox-calendar/season
router.get('/season', (req, res) => {
  try {
    const today = new Date();
    const calendarType = getCalendarTypeFromRequest(req);
    const pascha = calculatePascha(today.getFullYear());
    const season = getSeason(today, pascha, calendarType);
    const color = getLiturgicalColor(today, pascha, calendarType);
    const tone = getTone(today, pascha);
    res.json({ season, liturgicalColor: color, tone, date: today.toISOString().split('T')[0], calendarType });
  } catch (error) {
    console.error('Season error:', error);
    res.status(500).json({ error: 'Failed to fetch liturgical season' });
  }
});

// GET /api/orthodox-calendar/saints
router.get('/saints', (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date query parameter required' });
    const requestedDate = new Date(date + 'T12:00:00');
    const calendarType = getCalendarTypeFromRequest(req);
    const dayData = getDayData(requestedDate, calendarType);
    res.json(dayData.saints);
  } catch (error) {
    console.error('Saints error:', error);
    res.status(500).json({ error: 'Failed to fetch saints' });
  }
});

// GET /api/orthodox-calendar/feasts
router.get('/feasts', (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date query parameter required' });
    const requestedDate = new Date(date + 'T12:00:00');
    const calendarType = getCalendarTypeFromRequest(req);
    const dayData = getDayData(requestedDate, calendarType);
    if (dayData.feastName && dayData.feastRank !== 'ordinary') {
      res.json([{ name: dayData.feastName, rank: dayData.feastRank, color: dayData.liturgicalColor }]);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Feasts error:', error);
    res.status(500).json({ error: 'Failed to fetch feasts' });
  }
});

// GET /api/orthodox-calendar/readings
router.get('/readings', (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date query parameter required' });
    const requestedDate = new Date(date + 'T12:00:00');
    const dayData = getDayData(requestedDate);
    res.json(dayData.readings ? [dayData.readings] : []);
  } catch (error) {
    console.error('Readings error:', error);
    res.status(500).json({ error: 'Failed to fetch readings' });
  }
});

// GET /api/orthodox-calendar/fasting
router.get('/fasting', (req, res) => {
  try {
    const { date } = req.query;
    const requestedDate = date ? new Date(date + 'T12:00:00') : new Date();
    const calendarType = getCalendarTypeFromRequest(req);
    const dayData = getDayData(requestedDate, calendarType);
    res.json(dayData.fasting);
  } catch (error) {
    console.error('Fasting error:', error);
    res.status(500).json({ error: 'Failed to fetch fasting status' });
  }
});

// POST /api/orthodox-calendar/commemorations
router.post('/commemorations', async (req, res) => {
  try {
    if (!req.session?.user) return res.status(401).json({ error: 'Authentication required' });
    const { name, date, commemorationType, description, liturgicalRank, liturgicalColor, recurring } = req.body;
    if (!name || !date) return res.status(400).json({ error: 'Name and date are required' });

    const [result] = await getAppPool().query(`
      INSERT INTO local_commemorations
      (name, date, commemoration_type, description, liturgical_rank, liturgical_color, recurring, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, date, commemorationType || 'saint', description, liturgicalRank || 'commemoration',
        liturgicalColor || 'green', recurring !== undefined ? recurring : true, req.session.user.id]);

    res.status(201).json({ id: result.insertId, name, date, message: 'Commemoration added' });
  } catch (error) {
    console.error('Error adding commemoration:', error);
    res.status(500).json({ error: 'Failed to add commemoration' });
  }
});

// GET /api/orthodox-calendar/commemorations
router.get('/commemorations', async (req, res) => {
  try {
    const { year, month } = req.query;
    let query = 'SELECT * FROM local_commemorations WHERE active = TRUE';
    const params = [];
    if (year && month) {
      query += ' AND ((YEAR(date) = ? AND MONTH(date) = ?) OR recurring = TRUE)';
      params.push(year, month);
    }
    query += ' ORDER BY date, liturgical_rank DESC, name';
    const [rows] = await getAppPool().query(query, params);
    res.json(rows.map(row => ({
      id: row.id, name: row.name, date: row.date, type: row.commemoration_type,
      description: row.description || '', rank: row.liturgical_rank, color: row.liturgical_color,
    })));
  } catch (error) {
    console.error('Error fetching commemorations:', error);
    res.json([]);
  }
});

// POST /api/orthodox-calendar/events
router.post('/events', async (req, res) => {
  try {
    if (!req.session?.user) return res.status(401).json({ error: 'Authentication required' });
    const { title, eventDate, description, startTime, endTime, location, eventType, recurring } = req.body;
    if (!title || !eventDate) return res.status(400).json({ error: 'Title and event date required' });

    const [result] = await getAppPool().query(`
      INSERT INTO parish_events (title, description, event_date, start_time, end_time, location, event_type, recurring, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [title, description, eventDate, startTime, endTime, location, eventType || 'liturgy', recurring || false, req.session.user.id]);

    res.status(201).json({ id: result.insertId, title, eventDate, message: 'Event added' });
  } catch (error) {
    console.error('Error adding parish event:', error);
    res.status(500).json({ error: 'Failed to add parish event' });
  }
});

// GET /api/orthodox-calendar/events
router.get('/events', async (req, res) => {
  try {
    const { year, month } = req.query;
    let query = 'SELECT * FROM parish_events WHERE active = TRUE';
    const params = [];
    if (year && month) {
      query += ' AND ((YEAR(event_date) = ? AND MONTH(event_date) = ?) OR recurring = TRUE)';
      params.push(year, month);
    }
    query += ' ORDER BY event_date, start_time';
    const [rows] = await getAppPool().query(query, params);
    res.json(rows.map(row => ({
      id: row.id, title: row.title, description: row.description || '', date: row.event_date,
      startTime: row.start_time, endTime: row.end_time, location: row.location, type: row.event_type,
    })));
  } catch (error) {
    console.error('Error fetching parish events:', error);
    res.json([]);
  }
});

// POST /api/orthodox-calendar/notes
router.post('/notes', async (req, res) => {
  try {
    if (!req.session?.user) return res.status(401).json({ error: 'Authentication required' });
    const { date, noteText, isPrivate } = req.body;
    if (!date || !noteText) return res.status(400).json({ error: 'Date and note text required' });

    const [existing] = await getAppPool().query(
      'SELECT id FROM calendar_notes WHERE user_id = ? AND date = ?', [req.session.user.id, date]
    );

    if (existing.length > 0) {
      await getAppPool().query(
        'UPDATE calendar_notes SET note_text = ?, is_private = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND date = ?',
        [noteText, isPrivate !== undefined ? isPrivate : true, req.session.user.id, date]
      );
      res.json({ message: 'Note updated' });
    } else {
      const [result] = await getAppPool().query(
        'INSERT INTO calendar_notes (user_id, date, note_text, is_private) VALUES (?, ?, ?, ?)',
        [req.session.user.id, date, noteText, isPrivate !== undefined ? isPrivate : true]
      );
      res.status(201).json({ id: result.insertId, message: 'Note added' });
    }
  } catch (error) {
    console.error('Error saving note:', error);
    res.status(500).json({ error: 'Failed to save note' });
  }
});

// PUT /api/orthodox-calendar/preferences
router.put('/preferences', async (req, res) => {
  try {
    if (!req.session?.user) return res.status(401).json({ error: 'Authentication required' });
    const { language, defaultView, showReadings, showSaints, showParishEvents, notificationPreferences } = req.body;

    const [existing] = await getAppPool().query(
      'SELECT id FROM calendar_preferences WHERE user_id = ?', [req.session.user.id]
    );

    const values = [
      language || 'en', defaultView || 'today',
      showReadings !== undefined ? showReadings : true, showSaints !== undefined ? showSaints : true,
      showParishEvents !== undefined ? showParishEvents : true,
      notificationPreferences ? JSON.stringify(notificationPreferences) : null,
    ];

    if (existing.length > 0) {
      await getAppPool().query(`
        UPDATE calendar_preferences SET language=?, default_view=?, show_readings=?, show_saints=?,
        show_parish_events=?, notification_preferences=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?
      `, [...values, req.session.user.id]);
    } else {
      await getAppPool().query(`
        INSERT INTO calendar_preferences (user_id, language, default_view, show_readings, show_saints, show_parish_events, notification_preferences)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [req.session.user.id, ...values]);
    }
    res.json({ message: 'Preferences updated' });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// GET /api/orthodox-calendar/events/:churchId (compatibility)
router.get('/events/:churchId', (req, res) => {
  res.json([]);
});

// GET /api/orthodox-calendar/saints/search
router.get('/saints/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const query = q.toLowerCase();
    const results = [];

    // Search through fixed feasts
    for (const [dateKey, feast] of Object.entries(FIXED_FEASTS)) {
      if (feast.saints) {
        for (const saint of feast.saints) {
          if (saint.name.toLowerCase().includes(query) || (saint.description && saint.description.toLowerCase().includes(query))) {
            results.push({ ...saint, date: dateKey, feastName: feast.name });
          }
        }
      }
    }

    // Search through movable feasts
    for (const [offset, feast] of Object.entries(MOVABLE_FEAST_OFFSETS)) {
      if (feast.saints) {
        for (const saint of feast.saints) {
          if (saint.name.toLowerCase().includes(query) || (saint.description && saint.description.toLowerCase().includes(query))) {
            results.push({ ...saint, paschaOffset: parseInt(offset), feastName: feast.name });
          }
        }
      }
    }

    res.json(results.slice(0, 20));
  } catch (error) {
    console.error('Saints search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/orthodox-calendar/feasts/search
router.get('/feasts/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const query = q.toLowerCase();
    const results = [];

    for (const [dateKey, feast] of Object.entries(FIXED_FEASTS)) {
      if (feast.name.toLowerCase().includes(query)) {
        results.push({ name: feast.name, rank: feast.rank, color: feast.color, date: dateKey });
      }
    }

    for (const [offset, feast] of Object.entries(MOVABLE_FEAST_OFFSETS)) {
      if (feast.name.toLowerCase().includes(query)) {
        results.push({ name: feast.name, rank: feast.rank, color: feast.color, paschaOffset: parseInt(offset) });
      }
    }

    res.json(results.slice(0, 20));
  } catch (error) {
    console.error('Feasts search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
