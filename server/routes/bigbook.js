// Support both development (../src/api/bigbook) and production (../api/bigbook) paths
let bigbookModule;
try {
    bigbookModule = require('../api/bigbook');
} catch (e) {
    bigbookModule = require('../src/api/bigbook');
}
module.exports = bigbookModule;
