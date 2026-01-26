// Support both development (../src/api/metrics) and production (../api/metrics) paths
let metricsModule;
try {
    metricsModule = require('../api/metrics');
} catch (e) {
    metricsModule = require('../src/api/metrics');
}
module.exports = metricsModule;
