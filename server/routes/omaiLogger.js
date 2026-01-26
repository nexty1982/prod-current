// Support both development (../src/api/omaiLogger) and production (../api/omaiLogger) paths
let api;
try {
    api = require('../api/omaiLogger');
} catch (e) {
    api = require('../src/api/omaiLogger');
}
module.exports = api;
