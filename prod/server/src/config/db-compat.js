const { getAppPool, getAuthPool } = require('../../config/db');
module.exports = {
  getAppPool, getAuthPool,
  pool: {
    query:   (...a) => getAppPool().query(...a),
    execute: (...a) => getAppPool().query(...a),
  }
};
