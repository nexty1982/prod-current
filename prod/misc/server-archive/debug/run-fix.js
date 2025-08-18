// Simple script to run notification fixes
const { fixNotificationsSystem } = require('./fix-notifications-system');

async function runFixes() {
    console.log('🚀 Starting notification system fixes...');
    await fixNotificationsSystem();
    console.log('✅ All fixes completed!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Refresh your browser');
    console.log('2. Check notifications page - you should see:');
    console.log('   - Nick: "Sent friend request to Fr. James Parsells"');
    console.log('   - Fr. James: "Nick Parsells sent you a friend request"');
    console.log('3. Try the friend request features');
    process.exit(0);
}

runFixes().catch(error => {
    console.error('❌ Error running fixes:', error);
    process.exit(1);
}); 