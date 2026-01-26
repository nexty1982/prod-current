// Support both development (../src/api/uploadToken) and production (../api/uploadToken) paths
let uploadTokenModule;
try {
    uploadTokenModule = require('../api/uploadToken');
} catch (e) {
    uploadTokenModule = require('../src/api/uploadToken');
}
module.exports = uploadTokenModule;
