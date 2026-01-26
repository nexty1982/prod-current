// Bridge route to api/debug.js
// Support both development (../src/api/debug) and production (../api/debug) paths
let debugModule;
try {
    debugModule = require('../api/debug');
} catch (e) {
    debugModule = require('../src/api/debug');
}
module.exports = debugModule;
