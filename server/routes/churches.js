// Bridge route to api/churches.js
// Support both development (../src/api/churches) and production (../api/churches) paths
let churchesModule;
try {
    churchesModule = require('../api/churches');
} catch (e) {
    churchesModule = require('../src/api/churches');
}
module.exports = churchesModule;
