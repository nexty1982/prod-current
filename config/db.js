const mysql = require('mysql2/promise');

let _appPool, _authPool;
function mkPool({host, user, password, database, waitForConnections=true, connectionLimit=10, queueLimit=0}) {
  return mysql.createPool({host, user, password, database, waitForConnections, connectionLimit, queueLimit});
}

function getAppPool() {
  if (!_appPool) {
    _appPool = mkPool({
      host:     process.env.DB_HOST     || 'localhost',
      user:     process.env.DB_USER     || 'om_user',
      password: process.env.DB_PASS     || 'om_pass',
      database: process.env.DB_NAME     || 'orthodoxmetrics_db'
    });
  }
  return _appPool;
}

function getAuthPool() {
  if (!_authPool) {
    _authPool = mkPool({
      host:     process.env.AUTH_DB_HOST || process.env.DB_HOST || 'localhost',
      user:     process.env.AUTH_DB_USER || process.env.DB_USER || 'om_user',
      password: process.env.AUTH_DB_PASS || process.env.DB_PASS || 'om_pass',
      database: process.env.AUTH_DB_NAME || 'omai_db'
    });
  }
  return _authPool;
}

module.exports = { getAppPool, getAuthPool };
