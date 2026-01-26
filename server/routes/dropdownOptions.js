// Bridge route to api/dropdownOptions.js
// Support both development (../src/api/dropdownOptions) and production (../api/dropdownOptions) paths
let dropdownModule;
try {
    dropdownModule = require('../api/dropdownOptions');
} catch (e) {
    dropdownModule = require('../src/api/dropdownOptions');
}
module.exports = dropdownModule;
