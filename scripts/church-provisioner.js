#!/usr/bin/env node
/**
 * church-provisioner.js
 * Location: /var/www/orthodoxmetrics/prod/scripts/
 * * Usage:
 * node church-provisioner.js test               # Run the hardcoded test church
 * node church-provisioner.js batch <file.json>  # Provision multiple from JSON
 * node church-provisioner.js create "Name" "Email" "Pass"
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');
// Note: Ensure dbLogger exists or mock it for standalone use
const { info, success, error } = require('./utils/dbLogger'); 

require('dotenv').config({ path: path.join(__dirname, '../.env') });

class ChurchProvisioner {
  constructor() {
    this.systemDbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    };
  }

  generateDbName(churchName) {
    return churchName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50) + '_db';
  }

  generateChurchId(churchName) {
    const prefix = churchName.split(' ').map(w => w.charAt(0).toUpperCase()).join('').substring(0, 6);
    return `${prefix}_${Date.now().toString().slice(-6)}`;
  }

  async createChurchDatabase(churchData) {
    const connection = await mysql.createConnection(this.systemDbConfig);
    const dbName = this.generateDbName(churchData.name);

    try {
      console.log(`\n🚀 Provisioning: ${churchData.name}...`);
      await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
      await connection.execute(`USE \`${dbName}\``);

      // Path adjusted to the new script location
      const templatePath = path.join(__dirname, 'templates', 'church-database-template.sql');
      const templateSql = await fs.readFile(templatePath, 'utf8');
      await connection.query(templateSql);

      const churchId = this.generateChurchId(churchData.name);
      const hashedPassword = await bcrypt.hash(churchData.adminPassword || 'DefaultPassword123!', 10);

      // Update Local Church Info
      await connection.execute(`
        UPDATE church_info SET church_id = ?, name = ?, email = ?, country = ? WHERE id = 1
      `, [churchId, churchData.name, churchData.email, churchData.country || 'United States']);

      // Update Admin in Global User Table
      await connection.execute(`
        UPDATE orthodoxmetrics_db.users SET name = ?, email = ?, password = ? WHERE id = 1
      `, [churchData.adminName || 'Admin', churchData.email, hashedPassword]);

      await this.addToGlobalRegistry({ ...churchData, church_id: churchId, database_name: dbName });
      
      console.log(`✅ Success: ${churchData.name} is live on ${dbName}`);
      return { success: true, dbName };
    } catch (err) {
      console.error(`❌ Failed: ${churchData.name}`, err.message);
      await connection.execute(`DROP DATABASE IF EXISTS \`${dbName}\``);
      throw err;
    } finally {
      await connection.end();
    }
  }

  async addToGlobalRegistry(churchData) {
    const mainConnection = await mysql.createConnection({ ...this.systemDbConfig, database: 'orthodoxmetrics_db' });
    try {
      await mainConnection.execute(`
        INSERT INTO churches (church_id, name, email, database_name, is_active)
        VALUES (?, ?, ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE database_name = VALUES(database_name)
      `, [churchData.church_id, churchData.name, churchData.email, churchData.database_name]);
    } finally {
      await mainConnection.end();
    }
  }
}

// --- CLI Logic ---
if (require.main === module) {
  const provisioner = new ChurchProvisioner();
  const [,, command, ...args] = process.argv;

  (async () => {
    if (command === 'test') {
      await provisioner.createChurchDatabase({
        name: 'Test Trinity Church',
        email: 'test@trinity.org',
        adminPassword: 'Password123!'
      });
    } else if (command === 'batch') {
      const churches = JSON.parse(await fs.readFile(args[0], 'utf8'));
      for (const church of churches) {
        await provisioner.createChurchDatabase(church);
      }
    } else if (command === 'create') {
      await provisioner.createChurchDatabase({ name: args[0], email: args[1], adminPassword: args[2] });
    } else {
      console.log("Commands: test | batch <file.json> | create <name> <email> <pass>");
    }
    process.exit(0);
  })();
}
