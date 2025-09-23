const mysql =  const email = 'superadmin@orthodoxmetrics.com';require('mysql2/promise');
const bcrypt = require('bcrypt');

const DB_CONFIG = {
  host: 'localhost',
  user: 'orthodapps',
  password: 'Summerof1982@!',
  database: 'orthodoxmetrics_db',
};

async function addTestUser() {
  const connection = await mysql.createConnection(DB_CONFIG);

  const email = 'superadmin@orthodoxmetrics.com';
  const plainPassword = 'Summerof82@!';
  const role = 'super_admin';

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const query = `
    INSERT INTO orthodoxmetrics_db.users (email, password_hash, role)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE hashedPassword = VALUES(password_hash), role = VALUES(role);
  `;

  await connection.execute(query, [email, password_hash, role]);

  console.log(`✅ Test user added: ${email}`);
  await connection.end();
}

addTestUser().catch(err => {
  console.error('❌ Error adding test user:', err);
});

