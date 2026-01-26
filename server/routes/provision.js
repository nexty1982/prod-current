// Bridge route to api/provision.js
// Support both development (../src/api/provision) and production (../api/provision) paths
let provisionModule;
try {
    provisionModule = require('../api/provision');
} catch (e) {
    provisionModule = require('../src/api/provision');
}
module.exports = provisionModule;
