// Support both development (../src/api/settings) and production (../api/settings) paths
let settingsModule;
try {
    settingsModule = require('../api/settings');
} catch (e) {
    settingsModule = require('../src/api/settings');
}
module.exports = settingsModule;
