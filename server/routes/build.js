// Support both development (../src/api/build) and production (../api/build) paths
let buildModule;
try {
    buildModule = require('../api/build');
} catch (e) {
    buildModule = require('../src/api/build');
}
module.exports = buildModule;
