// Routes/logs.js - Bridge to the actual logs API
const { router, logMessage } = require('../src/api/logs');

module.exports = { 
    router,
    logMessage
};
