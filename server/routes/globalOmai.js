// Support both development (../src/api/globalOmai) and production (../api/globalOmai) paths
let globalOmaiModule;
try {
    globalOmaiModule = require('../api/globalOmai');
} catch (e) {
    globalOmaiModule = require('../src/api/globalOmai');
}
module.exports = globalOmaiModule;
