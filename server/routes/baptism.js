// Bridge route to api/baptism.js
// Detects context (dist vs source) and uses appropriate path
const path = require('path');
const isDist = __dirname.includes(path.sep + 'dist' + path.sep);

let baptismModule;
if (isDist) {
    // Running from dist: only try dist path (src/ doesn't exist in dist)
    baptismModule = require('../api/baptism');
} else {
    // Running from source: try dist path first, then src path
    try {
        baptismModule = require('../api/baptism');
    } catch (e) {
        baptismModule = require('../src/api/baptism');
    }
}
module.exports = baptismModule;
