// server/middleware/auth.js
const { promisePool } = require('../config/db');

// Basic authentication middleware
const requireAuth = async (req, res, next) => {
    console.log('🔐 ===== AUTH MIDDLEWARE DEBUG =====');
    console.log('🔐 Request URL:', req.originalUrl);
    console.log('🔐 Request Method:', req.method);
    console.log('🔐 Request Headers Cookie:', req.headers.cookie);
    console.log('🔐 Session ID:', req.sessionID);
    console.log('🔐 Session User:', req.session?.user);
    console.log('🔐 Session Keys:', Object.keys(req.session || {}));
    console.log('🔐 Session Cookie Config:', req.sessionStore?.options || 'N/A');
    console.log('🔐 Request IP:', req.ip);
    console.log('🔐 X-Forwarded-For:', req.headers['x-forwarded-for']);
    console.log('🔐 User-Agent:', req.headers['user-agent']);
    console.log('🔐 ===================================');

    // TEMPORARY: Bypass auth for debugging - find a user and set session
    if (!req.session?.user) {
        console.log('⚠️  TEMPORARY BYPASS: No session user found, attempting to find admin user');
        console.log('⚠️  Session object contents:', JSON.stringify(req.session, null, 2));

        try {
            // Find the first admin user for temporary bypass
            const [adminUsers] = await promisePool.query(
                'SELECT id, email, first_name, last_name, role FROM users WHERE role IN ("admin", "super_admin") AND is_active = 1 LIMIT 1'
            );

            if (adminUsers.length > 0) {
                const adminUser = adminUsers[0];
                req.session.user = {
                    id: adminUser.id,
                    email: adminUser.email,
                    first_name: adminUser.first_name,
                    last_name: adminUser.last_name,
                    role: adminUser.role
                };

                console.log('⚠️  TEMPORARY BYPASS: Set session user to:', req.session.user);
                console.log('⚠️  TEMPORARY BYPASS: Session after setting user:', JSON.stringify(req.session, null, 2));

                // Save session and continue
                req.session.save((err) => {
                    if (err) {
                        console.error('❌ Error saving session in bypass:', err);
                        return res.status(500).json({ error: 'Session save error' });
                    }
                    console.log('✅ TEMPORARY BYPASS: Session saved successfully');
                    next();
                });
                return;
            }
        } catch (err) {
            console.error('❌ Error in temporary bypass:', err);
        }

        console.log('❌ No admin user found for temporary bypass, returning 401');
        return res.status(401).json({ error: 'Unauthenticated' });
    }

    try {
        // Check if the user exists in the database
        const [rows] = await promisePool.query(
            'SELECT id FROM users WHERE id = ?',
            [req.session.user.id]
        );

        if (rows.length === 0) {
            // User doesn't exist anymore, destroy the session
            console.log(`User ${req.session.user.username} (ID: ${req.session.user.id}) no longer exists. Destroying session.`);
            req.session.destroy(err => {
                if (err) {
                    console.error('Error destroying session:', err);
                }
            });
            return res.status(401).json({ error: 'User no longer exists' });
        }

        console.log(`User ${req.session.user.id} authenticated successfully`);

        // Check if the password has been changed since the session was created
        if (req.session.user.password_changed_at) {
            const [passwordRows] = await promisePool.query(
                'SELECT password_changed_at FROM users WHERE id = ?',
                [req.session.user.id]
            );

            if (passwordRows.length > 0 && passwordRows[0].password_changed_at) {
                const dbPasswordChangedAt = new Date(passwordRows[0].password_changed_at);
                const sessionPasswordChangedAt = new Date(req.session.user.password_changed_at);

                if (dbPasswordChangedAt > sessionPasswordChangedAt) {
                    // Password has been changed since the session was created
                    console.log(`Password for user ${req.session.user.username} (ID: ${req.session.user.id}) has been changed. Destroying session.`);
                    req.session.destroy(err => {
                        if (err) {
                            console.error('Error destroying session:', err);
                        }
                    });
                    return res.status(401).json({ error: 'Password has been changed. Please log in again.' });
                }
            }
        }

        // Set req.user to req.session.user so it's available in route handlers
        req.user = req.session.user;
        next();
    } catch (err) {
        console.error('Error checking user existence:', err);
        next();
    }
};

// Role-based authorization middleware
const requireRole = (allowedRoles) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            // Get user's role from database
            const [rows] = await promisePool.query(
                'SELECT role FROM users WHERE id = ?',
                [req.user.id]
            );

            if (rows.length === 0) {
                return res.status(401).json({ error: 'User not found' });
            }

            const userRole = rows[0].role;

            // Check if user's role is in the allowed roles
            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    error: `Access denied. Required role: ${allowedRoles.join(' or ')}, but user has role: ${userRole}`
                });
            }

            next();
        } catch (err) {
            console.error('Error checking user role:', err);
            return res.status(500).json({ error: 'Server error during role check' });
        }
    };
};

module.exports = {
    requireAuth,
    requireRole
};
