// Usage: node update-password.js user@example.com newpassword

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const [,, email, newPassword] = process.argv;

if (!email || !newPassword) {
  console.error('Usage: node update-password.js <email> <newPassword>');
  process.exit(1);
}

async function updatePassword() {
  try {
    const hash = await bcrypt.hash(newPassword, 10);

    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'orthodapps',
      password: 'Summerof1982@!',
      database: 'orthodoxmetrics_db'
    });

    const [result] = await connection.execute(
      'UPDATE orthodoxmetrics_db.users SET password_hash = ? WHERE email = ?',
      [hash, email]
    );

    if (result.affectedRows === 0) {
      console.log(`❌ No user found with email: ${email}`);
    } else {
      console.log(`✅ Password updated successfully for: ${email}`);
    }

    await connection.end();
  } catch (err) {
    console.error('Error updating password:', err.message);
  }
}

updatePassword();

