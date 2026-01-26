// Support both development (../src/api/omai) and production (../api/omai) paths
let omaiModule;
try {
    omaiModule = require('../api/omai');
} catch (e) {
    omaiModule = require('../src/api/omai');
}
module.exports = omaiModule;
