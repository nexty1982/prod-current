// Bridge route to api/marriage.js
// Detects context (dist vs source) and uses appropriate path
const path = require('path');
const isDist = __dirname.includes(path.sep + 'dist' + path.sep);

let marriageModule;
if (isDist) {
    marriageModule = require('../api/marriage');
} else {
    try {
        marriageModule = require('../api/marriage');
    } catch (e) {
        marriageModule = require('../src/api/marriage');
    }
}
module.exports = marriageModule;
