// Quick session test script
const express = require('express');
const sessionMW = require('./config/session');

const app = express();
app.use(sessionMW);

app.get('/test-session', (req, res) => {
    console.log('🔍 Session Test:');
    console.log('  Session ID:', req.sessionID);
    console.log('  Session exists:', !!req.session);
    console.log('  Session data:', req.session);
    
    // Create a test user in session
    if (!req.session.testUser) {
        req.session.testUser = {
            id: 1,
            email: 'test@example.com',
            timestamp: new Date()
        };
        console.log('✅ Created test user in session');
    }
    
    res.json({
        sessionID: req.sessionID,
        hasSession: !!req.session,
        testUser: req.session.testUser,
        cookie: req.session.cookie
    });
});

app.listen(3002, () => {
    console.log('Session test server running on port 3002');
});
