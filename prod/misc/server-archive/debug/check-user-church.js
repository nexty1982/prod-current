const { promisePool } = require('../../config/db');

async function checkUserChurchAssignment() {
  try {
    console.log('🔍 Checking user church assignment...');
    
    // Check the specific user
    const [users] = await promisePool.query(
      'SELECT id, email, church_id, role, first_name, last_name FROM users WHERE email = ?', 
      ['frjames@ssppoc.org']
    );
    
    console.log('User data:', users[0] || 'User not found');
    
    // Check available churches
    console.log('\n🏛️ Available churches:');
    const [churches] = await promisePool.query(
      'SELECT id, name, database_name FROM churches WHERE is_active = 1'
    );
    churches.forEach(church => console.log(`  ID: ${church.id}, Name: ${church.name}, DB: ${church.database_name}`));
    
    // Check if user has a church assignment
    if (users.length > 0) {
      const user = users[0];
      if (user.church_id) {
        console.log(`\n✅ User ${user.email} is assigned to church ID: ${user.church_id}`);
        
        // Find the church name
        const church = churches.find(c => c.id === user.church_id);
        if (church) {
          console.log(`   Church Name: ${church.name}`);
          console.log(`   Church Database: ${church.database_name}`);
        }
      } else {
        console.log(`\n❌ User ${user.email} has NO church assignment (church_id is ${user.church_id})`);
        console.log('   This is why the redirect is failing!');
        
        // If there's only one church, let's suggest assigning the user to it
        if (churches.length === 1) {
          console.log(`\n💡 Suggestion: Assign user to the only available church:`);
          console.log(`   UPDATE users SET church_id = ${churches[0].id} WHERE email = 'frjames@ssppoc.org';`);
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUserChurchAssignment(); 