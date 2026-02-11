// Bridge admin routes to api/admin.js
// Detects context (dist vs source) and uses appropriate path
const path = require('path');
const isDist = __dirname.includes(path.sep + 'dist' + path.sep);

let adminModule;
if (isDist) {
    // Running from dist: only try dist path (src/ doesn't exist in dist)
    adminModule = require('../../api/admin');
} else {
    // Running from source: try dist path first, then src path
    try {
        adminModule = require('../../api/admin');
    } catch (e) {
        adminModule = require('../../src/api/admin');
    }
}
module.exports = adminModule;
