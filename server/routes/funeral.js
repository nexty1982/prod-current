// Bridge route to api/funeral.js
// Detects context (dist vs source) and uses appropriate path
const path = require('path');
const isDist = __dirname.includes(path.sep + 'dist' + path.sep);

let funeralModule;
if (isDist) {
    funeralModule = require('../api/funeral');
} else {
    try {
        funeralModule = require('../api/funeral');
    } catch (e) {
        funeralModule = require('../src/api/funeral');
    }
}
module.exports = funeralModule;
