// Support both development (../src/api/headlines) and production (../api/headlines) paths
let api;
try {
    api = require('../api/headlines');
} catch (e) {
    api = require('../src/api/headlines');
}
module.exports = api;
