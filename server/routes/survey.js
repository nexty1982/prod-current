// Support both development (../src/api/survey) and production (../api/survey) paths
let api;
try {
    api = require('../api/survey');
} catch (e) {
    api = require('../src/api/survey');
}
module.exports = api;
