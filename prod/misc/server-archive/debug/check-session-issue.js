const { promisePool } = require('../../config/db');

async function checkSessionIssue() {
  try {
    console.log('🔍 Diagnosing session authentication issue...');
    
    // 1. Check if user exists and is correct
    console.log('\n1. Checking user in database...');
    const [users] = await promisePool.query(
      'SELECT id, email, role, is_active FROM users WHERE email = ?', 
      ['superadmin@orthodoxmetrics.com']
    );
    
    if (users.length === 0) {
      console.log('❌ User not found in database!');
      process.exit(1);
    }
    
    const user = users[0];
    console.log('✅ User found in database:');
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Active:', user.is_active);
    
    // 2. Check session configuration
    console.log('\n2. Session configuration issues to check:');
    console.log('');
    console.log('🔧 Common session problems:');
    console.log('');
    console.log('A) Session middleware not properly configured');
    console.log('   - Check if express-session is set up correctly');
    console.log('   - Check session secret is consistent');
    console.log('   - Check session store (memory vs database)');
    console.log('');
    console.log('B) Cookie domain/path issues');
    console.log('   - Check if cookies are being set with correct domain');
    console.log('   - Check if httpOnly, secure, sameSite settings are correct');
    console.log('   - Check if cookie path matches your application path');
    console.log('');
    console.log('C) Session store persistence');
    console.log('   - If using memory store, sessions lost on server restart');
    console.log('   - If using database store, check connection');
    console.log('');
    console.log('D) CORS configuration');
    console.log('   - Check credentials: "include" is set');
    console.log('   - Check CORS allows credentials');
    console.log('   - Check origin configuration');
    
    console.log('\n🚨 IMMEDIATE DEBUGGING STEPS:');
    console.log('');
    console.log('1. Check browser cookies:');
    console.log('   - Open Dev Tools > Application > Cookies');
    console.log('   - Look for session cookie (connect.sid or similar)');
    console.log('   - Note the domain and path');
    console.log('');
    console.log('2. Check network requests:');
    console.log('   - Open Dev Tools > Network tab');
    console.log('   - Make a request (like refreshing settings)');
    console.log('   - Check if cookies are being sent in request headers');
    console.log('   - Check response headers for session-related info');
    console.log('');
    console.log('3. Check server logs:');
    console.log('   - Look for session-related error messages');
    console.log('   - Check if middleware is receiving session data');
    console.log('   - Look for "No valid session found" or similar messages');
    
    console.log('\n🔧 QUICK FIXES TO TRY:');
    console.log('');
    console.log('A) Restart application server:');
    console.log('   - Stop your Node.js server');
    console.log('   - Start it again');
    console.log('   - Try logging in fresh');
    console.log('');
    console.log('B) Clear all browser data again:');
    console.log('   - Clear cookies, localStorage, sessionStorage');
    console.log('   - Close all browser tabs');
    console.log('   - Open fresh tab and login');
    console.log('');
    console.log('C) Try different browser:');
    console.log('   - Use incognito/private mode');
    console.log('   - Or try different browser entirely');
    console.log('');
    console.log('D) Check cookie settings:');
    console.log('   - In your browser, check if cookies are enabled');
    console.log('   - Check if third-party cookies are blocked');
    
    console.log('\n💡 SESSION MIDDLEWARE DEBUG:');
    console.log('The issue is that your frontend login succeeded, but');
    console.log('subsequent API calls don\'t recognize your session.');
    console.log('This is typically a session middleware configuration problem.');
    
    console.log('\n🔍 Next steps:');
    console.log('1. Try restarting your server first (simplest fix)');
    console.log('2. If that doesn\'t work, check the browser debugging steps above');
    console.log('3. Look at server logs for session-related errors');
    console.log('4. The session is being created on login but not persisted/recognized');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking session issue:', error.message);
    process.exit(1);
  }
}

checkSessionIssue(); 