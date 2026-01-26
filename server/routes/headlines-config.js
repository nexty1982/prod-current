// Support both development (../src/api/headlines-config) and production (../api/headlines-config) paths
let api;
try {
    api = require('../api/headlines-config');
} catch (e) {
    api = require('../src/api/headlines-config');
}
module.exports = api;
