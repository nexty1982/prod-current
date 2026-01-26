// Bridge route to api/calendar.js
// Support both development (../src/api/calendar) and production (../api/calendar) paths
let calendarModule;
try {
    calendarModule = require('../api/calendar');
} catch (e) {
    calendarModule = require('../src/api/calendar');
}
module.exports = calendarModule;
