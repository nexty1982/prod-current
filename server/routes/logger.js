// Support both development (../src/api/logger) and production (../api/logger) paths
let api;
try {
    api = require('../api/logger');
} catch (e) {
    api = require('../src/api/logger');
}
module.exports = api;
