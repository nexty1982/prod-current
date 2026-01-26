// Support both development (../src/api/omb) and production (../api/omb) paths
let ombModule;
try {
    ombModule = require('../api/omb');
} catch (e) {
    ombModule = require('../src/api/omb');
}
module.exports = ombModule;
