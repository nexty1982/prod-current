// Support both development (../src/api/user-profile) and production (../api/user-profile) paths
let api;
try {
    api = require('../api/user-profile');
} catch (e) {
    api = require('../src/api/user-profile');
}
module.exports = api;
