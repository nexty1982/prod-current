// Debug session endpoint
const express = require('express');
const router = express.Router();

// Debug endpoint to check session status (uncomment for debugging)
router.get('/session', (req, res) => {
    console.log('🔍 Session Debug:');
    console.log('  Session ID:', req.sessionID);
    console.log('  Session exists:', !!req.session);
    console.log('  Session user:', req.session?.user);
    console.log('  Session cookie:', req.session?.cookie);

    res.json({
        sessionID: req.sessionID,
        hasSession: !!req.session,
        hasUser: !!req.session?.user,
        user: req.session?.user || null,
        cookie: req.session?.cookie || null
    });
});

// Debug endpoint to test kanban auth middleware
router.get('/kanban-auth', (req, res, next) => {
    const { requireAuth } = require('../middleware/auth');
    requireAuth(req, res, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Auth middleware error', details: err.message });
        }
        res.json({
            message: 'Auth middleware passed',
            user: req.user,
            sessionUser: req.session?.user
        });
    });
});

// Debug endpoint to test notification counts with full debugging
router.get('/notification-counts', (req, res) => {
    console.log('🔍 Debug Notification Counts Request:');
    console.log('  Session ID:', req.sessionID);
    console.log('  Session exists:', !!req.session);
    console.log('  Session user:', req.session?.user);
    console.log('  Headers:', req.headers);
    console.log('  Cookies:', req.headers.cookie);

    // Test auth middleware manually
    const { requireAuth } = require('../middleware/auth');
    requireAuth(req, res, (err) => {
        if (err) {
            console.log('❌ Auth middleware failed:', err);
            return res.status(401).json({ 
                error: 'Auth middleware failed', 
                details: err.message,
                debug: {
                    sessionID: req.sessionID,
                    hasSession: !!req.session,
                    sessionUser: req.session?.user || null,
                    headers: req.headers,
                    cookies: req.headers.cookie
                }
            });
        }
        
        console.log('✅ Auth middleware passed for debug notification counts');
        res.json({
            message: 'Auth middleware passed for notification counts',
            user: req.user,
            sessionUser: req.session?.user,
            debug: {
                sessionID: req.sessionID,
                hasSession: !!req.session,
                headers: req.headers,
                cookies: req.headers.cookie
            }
        });
    });
});

// Debug endpoint to check raw cookie parsing
router.get('/cookies', (req, res) => {
    console.log('🔍 Cookie Debug:');
    console.log('  Raw cookies:', req.headers.cookie);
    console.log('  Parsed cookies:', req.cookies);
    console.log('  Session ID:', req.sessionID);
    console.log('  Session:', req.session);

    res.json({
        rawCookies: req.headers.cookie,
        parsedCookies: req.cookies,
        sessionID: req.sessionID,
        session: req.session
    });
});

// Debug endpoint to manually set and test cookies
router.get('/test-cookie', (req, res) => {
    console.log('🔍 Testing Cookie Setting:');
    console.log('  Environment:', process.env.NODE_ENV);
    console.log('  Session before:', req.session);
    
    // Manually set a test session value
    req.session.testValue = 'debug-test-' + Date.now();
    req.session.save((err) => {
        if (err) {
            console.log('❌ Session save error:', err);
            return res.json({
                error: 'Session save failed',
                details: err.message,
                environment: process.env.NODE_ENV,
                sessionID: req.sessionID
            });
        }
        
        console.log('✅ Session saved successfully');
        res.json({
            message: 'Test cookie/session set',
            testValue: req.session.testValue,
            sessionID: req.sessionID,
            environment: process.env.NODE_ENV,
            session: req.session
        });
    });
});

// Debug endpoint to check if test cookie persists
router.get('/check-cookie', (req, res) => {
    console.log('🔍 Checking Cookie Persistence:');
    console.log('  Session ID:', req.sessionID);
    console.log('  Test value:', req.session?.testValue);
    console.log('  Full session:', req.session);

    res.json({
        sessionID: req.sessionID,
        testValue: req.session?.testValue || 'NOT FOUND',
        hasSession: !!req.session,
        environment: process.env.NODE_ENV,
        fullSession: req.session
    });
});

// Test endpoint to debug session continuity
router.get('/session-continuity', (req, res) => {
    console.log('🔍 Session Continuity Test:');
    console.log('  Session ID:', req.sessionID);
    console.log('  Session exists:', !!req.session);
    console.log('  Session user:', req.session?.user);
    console.log('  Cookie header:', req.headers.cookie);
    console.log('  Set-Cookie header from last response:', req.get('Set-Cookie'));

    // Test setting a simple session value
    if (!req.session.continuityTest) {
        req.session.continuityTest = {
            timestamp: new Date().toISOString(),
            counter: 1
        };
        console.log('🆕 First visit - setting continuity test data');
    } else {
        req.session.continuityTest.counter += 1;
        console.log('🔄 Return visit - incrementing counter:', req.session.continuityTest.counter);
    }

    res.json({
        sessionID: req.sessionID,
        hasSession: !!req.session,
        hasUser: !!req.session?.user,
        continuityTest: req.session.continuityTest,
        cookies: req.headers.cookie,
        userAgent: req.headers['user-agent'],
        host: req.headers.host,
        origin: req.headers.origin,
        referer: req.headers.referer
    });
});

// Comprehensive session debugging endpoint
router.get('/session-full-debug', (req, res) => {
    console.log('🔍 FULL Session Debug:');
    console.log('  Session ID:', req.sessionID);
    console.log('  Session exists:', !!req.session);
    console.log('  Session user:', req.session?.user);
    console.log('  Raw cookie header:', req.headers.cookie);
    console.log('  User-Agent:', req.headers['user-agent']);
    console.log('  Host:', req.headers.host);
    console.log('  X-Forwarded-For:', req.headers['x-forwarded-for']);
    console.log('  X-Forwarded-Proto:', req.headers['x-forwarded-proto']);
    console.log('  X-Real-IP:', req.headers['x-real-ip']);
    console.log('  Session cookie config:', req.session?.cookie);

    // Check if cookies are being parsed correctly
    const cookies = req.headers.cookie;
    let sessionCookie = null;
    if (cookies) {
        const cookieArray = cookies.split(';');
        sessionCookie = cookieArray.find(cookie => 
            cookie.trim().startsWith('orthodox.sid=')
        );
    }

    res.json({
        sessionID: req.sessionID,
        hasSession: !!req.session,
        hasUser: !!req.session?.user,
        userInfo: req.session?.user || null,
        sessionCookie: sessionCookie,
        allCookies: req.headers.cookie,
        headers: {
            host: req.headers.host,
            userAgent: req.headers['user-agent'],
            xForwardedFor: req.headers['x-forwarded-for'],
            xForwardedProto: req.headers['x-forwarded-proto'],
            xRealIP: req.headers['x-real-ip'],
            origin: req.headers.origin,
            referer: req.headers.referer
        },
        sessionCookieConfig: req.session?.cookie,
        environment: process.env.NODE_ENV
    });
});

module.exports = router;
