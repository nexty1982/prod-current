const { promisePool } = require('../../config/db');

async function assignUserToChurch() {
  try {
    console.log('🔧 Assigning user to church...');
    
    // Check the current user state
    const [users] = await promisePool.query(
      'SELECT id, email, church_id, role FROM users WHERE email = ?', 
      ['frjames@ssppoc.org']
    );
    
    if (users.length === 0) {
      console.log('❌ User frjames@ssppoc.org not found!');
      process.exit(1);
    }
    
    const user = users[0];
    console.log('Current user state:', user);
    
    // Look for a Saints Peter and Paul church
    const [churches] = await promisePool.query(
      'SELECT id, name, database_name FROM churches WHERE name LIKE ? AND is_active = 1',
      ['%saints%peter%paul%']
    );
    
    console.log('Found churches matching Saints Peter and Paul:', churches);
    
    if (churches.length === 0) {
      // Look for any active church with "ssppoc" in the database name
      const [ssppocChurches] = await promisePool.query(
        'SELECT id, name, database_name FROM churches WHERE database_name LIKE ? AND is_active = 1',
        ['%ssppoc%']
      );
      
      console.log('Found churches with ssppoc in database name:', ssppocChurches);
      
      if (ssppocChurches.length > 0) {
        const churchToAssign = ssppocChurches[0];
        console.log(`📋 Assigning user to church: ${churchToAssign.name} (ID: ${churchToAssign.id})`);
        
        await promisePool.query(
          'UPDATE users SET church_id = ? WHERE email = ?',
          [churchToAssign.id, 'frjames@ssppoc.org']
        );
        
        console.log('✅ User assigned successfully!');
        
        // Verify the assignment
        const [updatedUsers] = await promisePool.query(
          'SELECT id, email, church_id, role FROM users WHERE email = ?', 
          ['frjames@ssppoc.org']
        );
        console.log('Updated user state:', updatedUsers[0]);
        
      } else {
        console.log('❌ No suitable church found to assign the user to');
      }
    } else {
      const churchToAssign = churches[0];
      console.log(`📋 Assigning user to church: ${churchToAssign.name} (ID: ${churchToAssign.id})`);
      
      await promisePool.query(
        'UPDATE users SET church_id = ? WHERE email = ?',
        [churchToAssign.id, 'frjames@ssppoc.org']
      );
      
      console.log('✅ User assigned successfully!');
      
      // Verify the assignment
      const [updatedUsers] = await promisePool.query(
        'SELECT id, email, church_id, role FROM users WHERE email = ?', 
        ['frjames@ssppoc.org']
      );
      console.log('Updated user state:', updatedUsers[0]);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

assignUserToChurch(); 