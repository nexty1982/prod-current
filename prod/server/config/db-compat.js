const { getAppPool, getAuthPool } = require('./db');
const pool = {
  query:   (...args) => getAppPool().query(...args),
  execute: (...args) => getAppPool().query(...args),
};
module.exports = { getAppPool, getAuthPool, pool };
