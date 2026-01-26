// Support both development (../src/api/orthodoxCalendar) and production (../api/orthodoxCalendar) paths
let calendarModule;
try {
    calendarModule = require('../api/orthodoxCalendar');
} catch (e) {
    calendarModule = require('../src/api/orthodoxCalendar');
}
module.exports = calendarModule;
