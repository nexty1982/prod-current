const { promisePool } = require('../../config/db');

async function ensureSSPPOCChurch() {
  try {
    console.log('🏛️ Ensuring Saints Peter and Paul Orthodox Church exists...');
    
    // Check if the church already exists
    const [existingChurches] = await promisePool.query(
      'SELECT id, name, database_name FROM churches WHERE database_name = ? OR name LIKE ?',
      ['ssppoc_records_db', '%saints%peter%paul%']
    );
    
    if (existingChurches.length > 0) {
      console.log('✅ Church already exists:', existingChurches[0]);
      return existingChurches[0];
    }
    
    console.log('📝 Creating Saints Peter and Paul Orthodox Church...');
    
    // Insert the church
    const [result] = await promisePool.query(`
      INSERT INTO churches (
        name, email, phone, address, city, state_province, postal_code, country,
        website, preferred_language, timezone, currency, database_name, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      'Saints Peter and Paul Orthodox Church',
      'frjames@ssppoc.org',
      '(555) 123-4567',
      '123 Orthodox Way',
      'Potomac',
      'MD',
      '20854',
      'USA',
      'https://ssppoc.org',
      'en',
      'America/New_York',
      'USD',
      'ssppoc_records_db',
      true
    ]);
    
    const churchId = result.insertId;
    console.log(`✅ Church created with ID: ${churchId}`);
    
    // Now assign the user to this church
    console.log('👤 Assigning frjames@ssppoc.org to the church...');
    
    await promisePool.query(
      'UPDATE users SET church_id = ? WHERE email = ?',
      [churchId, 'frjames@ssppoc.org']
    );
    
    console.log('✅ User assigned to church successfully!');
    
    // Verify the setup
    const [updatedUsers] = await promisePool.query(
      'SELECT u.id, u.email, u.church_id, u.role, c.name as church_name FROM users u LEFT JOIN churches c ON u.church_id = c.id WHERE u.email = ?', 
      ['frjames@ssppoc.org']
    );
    
    console.log('Final user state:', updatedUsers[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

ensureSSPPOCChurch(); 