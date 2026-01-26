// Support both development (../src/api/importRecords) and production (../api/importRecords) paths
let importRecordsModule;
try {
    importRecordsModule = require('../api/importRecords');
} catch (e) {
    importRecordsModule = require('../src/api/importRecords');
}
module.exports = importRecordsModule;
