// Support both development (../src/api/templates) and production (../api/templates) paths
let templatesModule;
try {
    templatesModule = require('../api/templates');
} catch (e) {
    templatesModule = require('../src/api/templates');
}
module.exports = templatesModule;
