// Test script to verify church creation fix
const mysql = require('mysql2/promise');

async function testChurchCreation() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'ssppoc_user',
    password: 'Tr0ubleShoot24!',
    database: 'ssppoc_records_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    // Test the INSERT that was failing
    console.log('Testing church creation...');
    
    const church_name = 'Test Church';
    const location = 'Test City';
    const country = 'USA';
    const language_preference = 'en';
    const admin_email = 'test@test.com';
    const timezone = 'America/New_York';
    const is_active = true;

    // First, check table structure
    console.log('Checking table structure...');
    const [columns] = await getAppPool().query('DESCRIBE churches');
    console.log('Churches table columns:', columns.map(col => col.Field));

    // Try the INSERT with both name and church_name
    const [result] = await getAppPool().query(`
      INSERT INTO churches (
        name,
        church_name,
        city,
        country,
        language_preference,
        admin_email,
        timezone,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      church_name, // Use church_name for both name and church_name fields
      church_name,
      location,
      country,
      language_preference,
      admin_email,
      timezone,
      is_active
    ]);

    console.log('Church created successfully with ID:', result.insertId);

    // Clean up test data
    await getAppPool().query('DELETE FROM churches WHERE id = ?', [result.insertId]);
    console.log('Test data cleaned up');

  } catch (error) {
    console.error('Error testing church creation:', error);
    
    // If the above failed, try without the name column
    try {
      console.log('Trying without name column...');
      const [result2] = await getAppPool().query(`
        INSERT INTO churches (
          church_name,
          city,
          country,
          language_preference,
          admin_email,
          timezone,
          is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'Test Church 2',
        'Test City',
        'USA',
        'en',
        'test2@test.com',
        'America/New_York',
        true
      ]);
      
      console.log('Church created without name column, ID:', result2.insertId);
      await getAppPool().query('DELETE FROM churches WHERE id = ?', [result2.insertId]);
      
    } catch (error2) {
      console.error('Both methods failed:', error2);
    }
  } finally {
    await pool.end();
  }
}

testChurchCreation();
