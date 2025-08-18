const { promisePool } = require('../../config/db');

(async () => {
    try {
        console.log('🧹 Cleaning up expired sessions...\n');
        
        // 1. First, show current session statistics
        console.log('1. Current session statistics:');
        const [totalStats] = await promisePool.query(`
            SELECT 
                COUNT(*) as total_sessions,
                SUM(CASE WHEN expires > NOW() THEN 1 ELSE 0 END) as active_sessions,
                SUM(CASE WHEN expires <= NOW() THEN 1 ELSE 0 END) as expired_sessions
            FROM sessions
        `);
        
        const stats = totalStats[0];
        console.log(`   Total sessions: ${stats.total_sessions}`);
        console.log(`   Active sessions: ${stats.active_sessions}`);
        console.log(`   Expired sessions: ${stats.expired_sessions}`);
        
        if (stats.expired_sessions === 0) {
            console.log('✅ No expired sessions to clean up!');
            process.exit(0);
        }
        
        // 2. Show some expired sessions before deletion (for confirmation)
        console.log('\n2. Sample expired sessions to be deleted:');
        const [expiredSamples] = await promisePool.query(`
            SELECT 
                session_id, 
                expires,
                TIMESTAMPDIFF(DAY, expires, NOW()) as days_expired,
                CHAR_LENGTH(data) as data_size
            FROM sessions 
            WHERE expires <= NOW() 
            ORDER BY expires ASC 
            LIMIT 5
        `);
        
        expiredSamples.forEach((session, index) => {
            console.log(`   ${index + 1}. ID: ${session.session_id.substring(0, 16)}...`);
            console.log(`      Expired: ${session.expires} (${session.days_expired} days ago)`);
            console.log(`      Size: ${session.data_size} bytes`);
        });
        
        if (expiredSamples.length < stats.expired_sessions) {
            console.log(`   ... and ${stats.expired_sessions - expiredSamples.length} more expired sessions`);
        }
        
        // 3. Delete expired sessions
        console.log('\n3. Deleting expired sessions...');
        const [deleteResult] = await promisePool.query(`
            DELETE FROM sessions WHERE expires <= NOW()
        `);
        
        console.log(`✅ Successfully deleted ${deleteResult.affectedRows} expired sessions`);
        
        // 4. Show final statistics
        console.log('\n4. Final session statistics:');
        const [finalStats] = await promisePool.query(`
            SELECT 
                COUNT(*) as total_sessions,
                SUM(CASE WHEN expires > NOW() THEN 1 ELSE 0 END) as active_sessions,
                MIN(expires) as oldest_session,
                MAX(expires) as newest_session
            FROM sessions
        `);
        
        const final = finalStats[0];
        console.log(`   Remaining sessions: ${final.total_sessions}`);
        console.log(`   Active sessions: ${final.active_sessions}`);
        if (final.total_sessions > 0) {
            console.log(`   Oldest session expires: ${final.oldest_session}`);
            console.log(`   Newest session expires: ${final.newest_session}`);
        }
        
        // 5. Optional: Show database space saved
        console.log('\n💾 Database cleanup completed!');
        console.log(`   Removed ${deleteResult.affectedRows} expired session records`);
        console.log('   Database space has been freed up');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Cleanup failed:', err.message);
        console.error('Full error:', err);
        process.exit(1);
    }
})(); 