const { getAppPool, getAuthPool } = require('./db');
const { getChurchDbConnection } = require('../utils/dbSwitcher');
const pool = {
  query:   (...args) => getAppPool().query(...args),
  execute: (...args) => getAppPool().query(...args),
};
module.exports = { getAppPool, getAuthPool, pool, getChurchDbConnection };
