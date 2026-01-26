// Support both development (../src/api/records) and production (../api/records) paths
let recordsModule;
try {
    recordsModule = require('../api/records');
} catch (e) {
    recordsModule = require('../src/api/records');
}
module.exports = recordsModule;
