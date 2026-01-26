// Support both development (../src/api/user) and production (../api/user) paths
let userModule;
try {
    userModule = require('../api/user');
} catch (e) {
    userModule = require('../src/api/user');
}
module.exports = userModule;
