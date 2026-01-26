// Support both development (../src/api/adminSystem) and production (../api/adminSystem) paths
let adminSystemModule;
try {
    adminSystemModule = require('../api/adminSystem');
} catch (e) {
    adminSystemModule = require('../src/api/adminSystem');
}
module.exports = adminSystemModule;
