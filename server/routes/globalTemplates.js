// Support both development (../src/api/globalTemplates) and production (../api/globalTemplates) paths
let templatesModule;
try {
    templatesModule = require('../api/globalTemplates');
} catch (e) {
    templatesModule = require('../src/api/globalTemplates');
}
module.exports = templatesModule;
