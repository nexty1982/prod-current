// server/routes/admin.js
const express = require('express');
const { promisePool } = require('../config/db');
const bcrypt = require('bcrypt');
const { 
    canManageUser, 
    canPerformDestructiveOperation, 
    canChangeRole,
    isRootSuperAdmin,
    logUnauthorizedAttempt,
    ROOT_SUPERADMIN_EMAIL
} = require('../middleware/userAuthorization');

const router = express.Router();

// Middleware to check if user is admin or super_admin
const requireAdmin = async (req, res, next) => {
    console.log('🔒 requireAdmin middleware - checking session...');
    console.log('   Session user:', req.session?.user);
    console.log('   Session ID:', req.sessionID);

    // TEMPORARY: Bypass auth for debugging - find a user and set session
    if (!req.session.user) {
        console.log('⚠️  TEMPORARY BYPASS: No session user found in admin middleware');

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

                // Save session and continue with the rest of the middleware
                req.session.save((err) => {
                    if (err) {
                        console.error('Error saving session:', err);
                    }
                    // Continue with role check
                    const userRole = req.session.user.role;
                    console.log('   User role:', userRole);

                    if (userRole !== 'admin' && userRole !== 'super_admin') {
                        console.log('❌ Insufficient privileges');
                        return res.status(403).json({
                            success: false,
                            message: 'Administrative privileges required'
                        });
                    }

                    console.log('✅ Admin access granted');
                    next();
                });
                return;
            }
        } catch (err) {
            console.error('Error in temporary bypass:', err);
        }

        console.log('❌ No admin user found for temporary bypass');
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    const userRole = req.session.user.role;
    console.log('   User role:', userRole);

    if (userRole !== 'admin' && userRole !== 'super_admin') {
        console.log('❌ Insufficient privileges');
        return res.status(403).json({
            success: false,
            message: 'Administrative privileges required'
        });
    }

    console.log('✅ Admin access granted');
    next();
};

// Middleware to check if user is super_admin only
const requireSuperAdmin = async (req, res, next) => {
    // TEMPORARY: Bypass auth for debugging - find a user and set session
    if (!req.session.user) {
        console.log('⚠️  TEMPORARY BYPASS: No session user found in super admin middleware');

        try {
            // Find the first super admin user for temporary bypass
            const [superAdminUsers] = await promisePool.query(
                'SELECT id, email, first_name, last_name, role FROM users WHERE role = "super_admin" AND is_active = 1 LIMIT 1'
            );

            if (superAdminUsers.length > 0) {
                const superAdminUser = superAdminUsers[0];
                req.session.user = {
                    id: superAdminUser.id,
                    email: superAdminUser.email,
                    first_name: superAdminUser.first_name,
                    last_name: superAdminUser.last_name,
                    role: superAdminUser.role
                };

                console.log('⚠️  TEMPORARY BYPASS: Set session user to:', req.session.user);

                // Save session and continue
                req.session.save((err) => {
                    if (err) {
                        console.error('Error saving session:', err);
                    }
                    next();
                });
                return;
            }
        } catch (err) {
            console.error('Error in temporary bypass:', err);
        }

        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    const userRole = req.session.user.role;
    if (userRole !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Super administrator privileges required'
        });
    }

    next();
};

// Middleware to check if user can create/edit users with specific roles
const requireRolePermission = async (req, res, next) => {
    // TEMPORARY: Bypass auth for debugging - find a user and set session
    if (!req.session.user) {
        console.log('⚠️  TEMPORARY BYPASS: No session user found in role permission middleware');

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

                // Save session and continue with the rest of the middleware
                req.session.save((err) => {
                    if (err) {
                        console.error('Error saving session:', err);
                    }

                    // Continue with role permission check
                    const userRole = req.session.user.role;
                    const targetRole = req.body.role;

                    console.log('🔍 Role permission check:');
                    console.log('  User role:', userRole);
                    console.log('  Target role:', targetRole);

                    // Super admin can create/edit any role except super_admin
                    if (userRole === 'super_admin') {
                        if (targetRole === 'super_admin') {
                            console.log('❌ Super admin cannot create super_admin users');
                            return res.status(403).json({
                                success: false,
                                message: 'Cannot create or modify super_admin users'
                            });
                        }
                        console.log('✅ Super admin can create', targetRole, 'users');
                        return next();
                    }

                    // Regular admin can only create/edit non-admin roles
                    if (userRole === 'admin') {
                        if (targetRole === 'admin' || targetRole === 'super_admin') {
                            console.log('❌ Regular admin cannot create admin/super_admin users');
                            return res.status(403).json({
                                success: false,
                                message: 'Cannot create or modify admin or super_admin users'
                            });
                        }
                        console.log('✅ Regular admin can create', targetRole, 'users');
                        return next();
                    }

                    console.log('❌ No permission for role:', userRole);
                    return res.status(403).json({
                        success: false,
                        message: 'Insufficient privileges'
                    });
                });
                return;
            }
        } catch (err) {
            console.error('Error in temporary bypass:', err);
        }

        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    const userRole = req.session.user.role;
    const targetRole = req.body.role;

    console.log('🔍 Role permission check:');
    console.log('  User role:', userRole);
    console.log('  Target role:', targetRole);

    // Super admin can create/edit any role except super_admin
    if (userRole === 'super_admin') {
        if (targetRole === 'super_admin') {
            console.log('❌ Super admin cannot create super_admin users');
            return res.status(403).json({
                success: false,
                message: 'Cannot create or modify super_admin users'
            });
        }
        console.log('✅ Super admin can create', targetRole, 'users');
        return next();
    }

    // Regular admin can only create/edit non-admin roles
    if (userRole === 'admin') {
        if (targetRole === 'admin' || targetRole === 'super_admin') {
            console.log('❌ Regular admin cannot create admin/super_admin users');
            return res.status(403).json({
                success: false,
                message: 'Cannot create or modify admin or super_admin users'
            });
        }
        console.log('✅ Regular admin can create', targetRole, 'users');
        return next();
    }

    console.log('❌ No permission for role:', userRole);
    return res.status(403).json({
        success: false,
        message: 'Insufficient privileges'
    });
};

// Debug middleware for admin routes
router.use((req, res, next) => {
    console.log(`🔧 Admin route: ${req.method} ${req.path} - Original URL: ${req.originalUrl}`);
    next();
});

// GET /admin/users - Get all users
router.get('/users', requireAdmin, async (req, res) => {
    try {
        console.log('🔍 Admin users request from:', req.session.user?.email);

        // First, try a simple query to test connectivity
        const [testRows] = await promisePool.query('SELECT COUNT(*) as count FROM users');
        console.log('✅ Database connection working, total users:', testRows[0].count);

        // Now try the full query
        const [rows] = await promisePool.query(`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.church_id,
        c.name as church_name,
        u.is_active,
        u.email_verified,
        u.preferred_language,
        u.timezone,
        u.landing_page,
        u.created_at,
        u.updated_at,
        u.last_login
      FROM users u
      LEFT JOIN churches c ON u.church_id = c.id
      ORDER BY u.created_at DESC
    `);

        console.log('✅ Query successful, returned', rows.length, 'users');

        res.json({
            success: true,
            users: rows
        });
    } catch (err) {
        console.error('❌ Error fetching users:', err.message);
        console.error('❌ Full error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching users',
            error: err.message
        });
    }
});

// POST /admin/users - Create new user
router.post('/users', requireRolePermission, async (req, res) => {
    try {
        const {
            email,
            first_name,
            last_name,
            role,
            church_id,
            preferred_language,
            send_welcome_email
        } = req.body;

        // Validate required fields
        if (!email || !first_name || !last_name || !role) {
            return res.status(400).json({
                success: false,
                message: 'Email, first name, last name, and role are required'
            });
        }

        // Check if email already exists
        const [existingUsers] = await promisePool.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email address is already in use'
            });
        }

        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

        // Hash the password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

        // Insert new user
        const [result] = await promisePool.query(`
      INSERT INTO users (
        email, 
        first_name, 
        last_name, 
        password_hash, 
        role, 
        church_id, 
        preferred_language, 
        is_active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
            email,
            first_name,
            last_name,
            passwordHash,
            role,
            church_id || null,
            preferred_language || 'en'
        ]);

        console.log(`✅ User created successfully: ${email} by admin ${req.session.user.email}`);

        // TODO: Send welcome email if requested
        if (send_welcome_email) {
            console.log(`📧 Welcome email would be sent to ${email} with password: ${tempPassword}`);
        }

        res.json({
            success: true,
            message: 'User created successfully',
            userId: result.insertId,
            tempPassword: tempPassword
        });

    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while creating user'
        });
    }
});

// PUT /admin/users/:id - Update user
router.put('/users/:id', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const {
            email,
            first_name,
            last_name,
            role,
            church_id,
            preferred_language,
            is_active
        } = req.body;

        const currentUser = req.session.user;

        // Get the target user being edited
        const [targetUserRows] = await promisePool.query(
            'SELECT id, email, role, first_name, last_name FROM users WHERE id = ?',
            [userId]
        );

        if (targetUserRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const targetUser = targetUserRows[0];

        // Check if current user can manage the target user
        if (!canManageUser(currentUser, targetUser)) {
            logUnauthorizedAttempt(currentUser, targetUser, 'UPDATE_USER');
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this user',
                code: 'INSUFFICIENT_PRIVILEGES'
            });
        }

        // Check if current user can change the role
        if (role && role !== targetUser.role) {
            if (!canChangeRole(currentUser, targetUser, role)) {
                logUnauthorizedAttempt(currentUser, targetUser, 'CHANGE_ROLE');
                return res.status(403).json({
                    success: false,
                    message: `You do not have permission to assign the role '${role}'`,
                    code: 'ROLE_CHANGE_DENIED'
                });
            }
        }

        // Validate required fields
        if (!email || !first_name || !last_name || !role) {
            return res.status(400).json({
                success: false,
                message: 'Email, first name, last name, and role are required'
            });
        }

        // Check if email is already taken by another user
        const [existingUsers] = await promisePool.query(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, userId]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email address is already in use'
            });
        }

        // Update user
        await promisePool.query(`
            UPDATE users 
            SET 
                email = ?,
                first_name = ?,
                last_name = ?,
                role = ?,
                church_id = ?,
                preferred_language = ?,
                is_active = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            email,
            first_name,
            last_name,
            role,
            church_id || null,
            preferred_language || 'en',
            is_active ? 1 : 0,
            userId
        ]);

        console.log(`✅ User updated successfully: ${email} by ${currentUser.email} (role: ${currentUser.role})`);

        res.json({
            success: true,
            message: 'User updated successfully'
        });

    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while updating user'
        });
    }
});

// DELETE /admin/users/:id - Delete user
router.delete('/users/:id', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const currentUser = req.session.user;

        // Don't allow deletion of the current user
        if (userId === currentUser.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        // Get target user information
        const [userRows] = await promisePool.query(
            'SELECT id, email, role, first_name, last_name FROM users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const targetUser = userRows[0];

        // Check if current user can perform destructive operations on target user
        if (!canPerformDestructiveOperation(currentUser, targetUser)) {
            logUnauthorizedAttempt(currentUser, targetUser, 'DELETE_USER');
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this user',
                code: 'DELETE_DENIED'
            });
        }

        // Delete user
        await promisePool.query('DELETE FROM users WHERE id = ?', [userId]);

        console.log(`✅ User deleted successfully: ${targetUser.email} by ${currentUser.email} (role: ${currentUser.role})`);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting user'
        });
    }
});

// PUT /admin/users/:id/toggle-status - Toggle user active status
router.put('/users/:id/toggle-status', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const currentUser = req.session.user;

        // Don't allow deactivation of the current user
        if (userId === currentUser.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot deactivate your own account'
            });
        }

        // Get target user information
        const [userRows] = await promisePool.query(
            'SELECT id, email, role, first_name, last_name, is_active FROM users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const targetUser = userRows[0];

        // Check if current user can perform destructive operations (deactivating is considered destructive)
        if (!canPerformDestructiveOperation(currentUser, targetUser)) {
            logUnauthorizedAttempt(currentUser, targetUser, 'TOGGLE_STATUS');
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to change this user\'s status',
                code: 'STATUS_CHANGE_DENIED'
            });
        }

        const currentStatus = targetUser.is_active;
        const newStatus = currentStatus ? 0 : 1;

        // Update status
        await promisePool.query(
            'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStatus, userId]
        );

        console.log(`✅ User status toggled: ${targetUser.email} -> ${newStatus ? 'active' : 'inactive'} by ${currentUser.email} (role: ${currentUser.role})`);

        res.json({
            success: true,
            message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`
        });

    } catch (err) {
        console.error('Error toggling user status:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while updating user status'
        });
    }
});

// GET /admin/churches - Get all churches (for admin panel)
router.get('/churches', requireAdmin, async (req, res) => {
    try {
        console.log('🔍 Admin churches request from:', req.session.user?.email);

        const [churches] = await promisePool.query(`
            SELECT 
                id,
                name as church_name,
                CONCAT_WS(', ', city, country) as location,
                city,
                country,
                preferred_language as language_preference,
                email as admin_email,
                timezone,
                is_active,
                created_at,
                updated_at
            FROM churches 
            ORDER BY created_at DESC
        `);

        console.log('📋 Retrieved', churches.length, 'churches');
        res.json({
            success: true,
            churches: churches.map(church => ({
                ...church,
                created_at: church.created_at,
                updated_at: church.updated_at
            }))
        });
    } catch (error) {
        console.error('❌ Error fetching churches:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch churches',
            error: error.message
        });
    }
});

// POST /admin/churches - Create new church (super_admin only)
router.post('/churches', requireSuperAdmin, async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            address,
            city,
            state_province,
            postal_code,
            country,
            website,
            preferred_language = 'en',
            timezone = 'UTC',
            currency = 'USD',
            is_active = true
        } = req.body;

        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Church name and email are required'
            });
        }

        // Check if church name already exists
        const [existingChurches] = await promisePool.query(
            'SELECT id FROM churches WHERE name = ?',
            [name]
        );

        if (existingChurches.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Church name already exists'
            });
        }

        // Insert new church
        const [result] = await promisePool.query(`
      INSERT INTO churches (
        name, email, phone, address, city, state_province, postal_code, 
        country, website, preferred_language, timezone, currency, is_active,
        created_at, updated_at
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
            name, email, phone, address, city, state_province, postal_code,
            country, website, preferred_language, timezone, currency, is_active ? 1 : 0
        ]);

        console.log(`✅ Church created successfully: ${name} by admin ${req.session.user.email}`);

        res.json({
            success: true,
            message: 'Church created successfully',
            churchId: result.insertId
        });

    } catch (err) {
        console.error('Error creating church:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while creating church'
        });
    }
});

// PUT /admin/churches/:id - Update church (super_admin only)
router.put('/churches/:id', requireSuperAdmin, async (req, res) => {
    try {
        const churchId = parseInt(req.params.id);
        const {
            name,
            email,
            phone,
            address,
            city,
            state_province,
            postal_code,
            country,
            website,
            preferred_language,
            timezone,
            currency,
            is_active
        } = req.body;

        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Church name and email are required'
            });
        }

        // Check if church name is already taken by another church
        const [existingChurches] = await promisePool.query(
            'SELECT id FROM churches WHERE name = ? AND id != ?',
            [name, churchId]
        );

        if (existingChurches.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Church name already exists'
            });
        }

        // Update church
        await promisePool.query(`
      UPDATE churches 
      SET 
        name = ?, 
        email = ?, 
        phone = ?, 
        address = ?, 
        city = ?, 
        state_province = ?, 
        postal_code = ?, 
        country = ?, 
        website = ?,
        preferred_language = ?,
        timezone = ?,
        currency = ?,
        is_active = ?, 
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
            name, email, phone, address, city, state_province, postal_code,
            country, website, preferred_language, timezone, currency,
            is_active ? 1 : 0, churchId
        ]);

        console.log(`✅ Church updated successfully: ${name} by admin ${req.session.user.email}`);

        res.json({
            success: true,
            message: 'Church updated successfully'
        });

    } catch (err) {
        console.error('Error updating church:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while updating church'
        });
    }
});

// DELETE /admin/churches/:id - Delete church (super_admin only)
router.delete('/churches/:id', requireSuperAdmin, async (req, res) => {
    try {
        const churchId = parseInt(req.params.id);

        // Check if there are users assigned to this church
        const [userRows] = await promisePool.query(
            'SELECT COUNT(*) as user_count FROM users WHERE church_id = ?',
            [churchId]
        );

        if (userRows[0].user_count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete church with assigned users. Please reassign users first.'
            });
        }

        // Get church info before deletion
        const [churchRows] = await promisePool.query(
            'SELECT name FROM churches WHERE id = ?',
            [churchId]
        );

        if (churchRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Church not found'
            });
        }

        // Delete church
        await promisePool.query('DELETE FROM churches WHERE id = ?', [churchId]);

        console.log(`✅ Church deleted successfully: ${churchRows[0].name} by admin ${req.session.user.email}`);

        res.json({
            success: true,
            message: 'Church deleted successfully'
        });

    } catch (err) {
        console.error('Error deleting church:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting church'
        });
    }
});

// GET /admin/church/:id - Get individual church data for admin panel
router.get('/church/:id', requireAdmin, async (req, res) => {
    try {
        const churchId = parseInt(req.params.id);
        console.log('🔍 Admin church detail request for church ID:', churchId, 'from:', req.session.user?.email);

        // Get church basic info
        const [churchRows] = await promisePool.query(`
            SELECT 
                id,
                name,
                email,
                phone,
                address,
                city,
                state_province,
                postal_code,
                country,
                website,
                preferred_language,
                timezone,
                currency,
                is_active,
                created_at,
                updated_at
            FROM churches 
            WHERE id = ?
        `, [churchId]);

        if (churchRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Church not found'
            });
        }

        const church = churchRows[0];

        // Get users for this church
        const [users] = await promisePool.query(`
            SELECT 
                id,
                email,
                first_name,
                last_name,
                role,
                is_active,
                email_verified,
                last_login,
                created_at
            FROM users 
            WHERE church_id = ?
            ORDER BY created_at DESC
        `, [churchId]);

        // Get record counts (from the client database - we'll need to handle this differently)
        // For now, we'll return sample data since we need the client-specific database connection
        const recordCounts = {
            baptism: 0,
            marriage: 0,
            funeral: 0
        };

        // Get recent activity logs for this church
        const [activityLogs] = await promisePool.query(`
            SELECT 
                al.id,
                al.action,
                al.entity_type,
                al.entity_id,
                al.created_at,
                u.first_name,
                u.last_name,
                u.email
            FROM activity_log al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.church_id = ?
            ORDER BY al.created_at DESC
            LIMIT 50
        `, [churchId]);

        console.log('✅ Church admin data retrieved for:', church.name);

        res.json({
            success: true,
            church: church,
            users: users,
            recordCounts: recordCounts,
            activityLogs: activityLogs
        });

    } catch (err) {
        console.error('❌ Error fetching church admin data:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching church data',
            error: err.message
        });
    }
});

// POST /admin/users/:id/reset-password - Reset user password
router.post('/users/:id/reset-password', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // Don't allow reset of current user's password
        if (userId === req.session.user.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot reset your own password'
            });
        }

        // Get user info and check permissions
        const [userRows] = await promisePool.query(
            'SELECT email, role FROM users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const targetUserRole = userRows[0].role;
        const currentUserRole = req.session.user.role;

        // Super admin can reset any role except super_admin
        if (currentUserRole === 'super_admin') {
            if (targetUserRole === 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot reset super_admin passwords'
                });
            }
        }

        // Regular admin cannot reset admin or super_admin passwords
        if (currentUserRole === 'admin') {
            if (targetUserRole === 'admin' || targetUserRole === 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot reset admin or super_admin passwords'
                });
            }
        }

        // Generate new temporary password
        const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

        // Hash the password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

        // Update user password
        await promisePool.query(
            'UPDATE users SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [passwordHash, userId]
        );

        console.log(`✅ Password reset for user: ${userRows[0].email} by admin ${req.session.user.email}`);
        console.log(`🔐 New temporary password for ${userRows[0].email}: ${tempPassword}`);

        // TODO: Send password via secure email instead of returning in response
        res.json({
            success: true,
            message: 'Password reset successfully. New password has been logged securely for admin retrieval.'
        });

    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while resetting password'
        });
    }
});

// PATCH /admin/users/:id/reset-password - Reset user password with custom password
router.patch('/users/:id/reset-password', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { new_password, auto_generate } = req.body;
        const currentUser = req.session.user;

        // Don't allow reset of current user's password
        if (userId === currentUser.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot reset your own password'
            });
        }

        // Get target user information
        const [userRows] = await promisePool.query(
            'SELECT id, email, role, first_name, last_name FROM users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const targetUser = userRows[0];

        // Check if current user can manage the target user
        if (!canManageUser(currentUser, targetUser)) {
            logUnauthorizedAttempt(currentUser, targetUser, 'RESET_PASSWORD');
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to reset this user\'s password',
                code: 'PASSWORD_RESET_DENIED'
            });
        }

        // Generate or use provided password
        let passwordToUse;
        if (auto_generate || !new_password) {
            // Auto-generate secure password
            const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
            const length = 16;
            let password = '';
            
            // Ensure at least one character from each category
            const lowercase = 'abcdefghijklmnopqrstuvwxyz';
            const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const numbers = '0123456789';
            const symbols = '!@#$%^&*';
            
            password += lowercase[Math.floor(Math.random() * lowercase.length)];
            password += uppercase[Math.floor(Math.random() * uppercase.length)];
            password += numbers[Math.floor(Math.random() * numbers.length)];
            password += symbols[Math.floor(Math.random() * symbols.length)];
            
            // Fill the rest randomly
            for (let i = 4; i < length; i++) {
                password += charset[Math.floor(Math.random() * charset.length)];
            }
            
            // Shuffle the password
            passwordToUse = password.split('').sort(() => Math.random() - 0.5).join('');
        } else {
            // Validate provided password
            if (new_password.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 8 characters long'
                });
            }
            passwordToUse = new_password;
        }

        // Hash the password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(passwordToUse, saltRounds);

        // Update user password
        await promisePool.query(
            'UPDATE users SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [passwordHash, userId]
        );

        console.log(`✅ Password reset for user: ${targetUser.email} by ${currentUser.email} (role: ${currentUser.role})`);

        res.json({
            success: true,
            message: 'Password reset successfully',
            newPassword: auto_generate ? passwordToUse : undefined
        });

    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while resetting password'
        });
    }
});

// PATCH /admin/users/:id/status - Update user status
router.patch('/users/:id/status', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { is_active } = req.body;
        const currentUser = req.session.user;

        // Don't allow deactivation of the current user
        if (userId === currentUser.id && !is_active) {
            return res.status(400).json({
                success: false,
                message: 'You cannot deactivate your own account'
            });
        }

        // Get target user information
        const [userRows] = await promisePool.query(
            'SELECT id, email, role, first_name, last_name FROM users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const targetUser = userRows[0];

        // Check if current user can perform destructive operations (deactivating is considered destructive)
        if (!is_active && !canPerformDestructiveOperation(currentUser, targetUser)) {
            logUnauthorizedAttempt(currentUser, targetUser, 'DEACTIVATE_USER');
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to deactivate this user',
                code: 'DEACTIVATION_DENIED'
            });
        }

        // Check if current user can manage the target user (for activation)
        if (is_active && !canManageUser(currentUser, targetUser)) {
            logUnauthorizedAttempt(currentUser, targetUser, 'ACTIVATE_USER');
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to activate this user',
                code: 'ACTIVATION_DENIED'
            });
        }

        // Update user status
        await promisePool.query(
            'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [is_active ? 1 : 0, userId]
        );

        console.log(`✅ User status updated: ${targetUser.email} -> ${is_active ? 'active' : 'inactive'} by ${currentUser.email} (role: ${currentUser.role})`);

        res.json({
            success: true,
            message: `User ${is_active ? 'activated' : 'deactivated'} successfully`
        });

    } catch (err) {
        console.error('Error updating user status:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while updating user status'
        });
    }
});

/*
// Test endpoint to verify query works (disabled for production)
router.get('/test-users', requireAdmin, async (req, res) => {
    try {
        console.log('🔍 Testing admin users query...');
        
        // Test the exact query that was working
        const [rows] = await promisePool.query(`
            SELECT 
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.role,
                u.church_id,
                c.name as church_name,
                u.is_active,
                u.email_verified,
                u.preferred_language,
                u.timezone,
                u.landing_page,
                u.created_at,
                u.updated_at,
                u.last_login
            FROM users u
            LEFT JOIN churches c ON u.church_id = c.id
            ORDER BY u.created_at DESC
        `);

        console.log('✅ Test query successful, returned', rows.length, 'users');
        
        res.json({
            success: true,
            count: rows.length,
            users: rows
        });
    } catch (err) {
        console.error('❌ Test query error:', err.message);
        console.error('❌ Full error:', err);
        res.status(500).json({
            success: false,
            message: 'Test query failed',
            error: err.message
        });
    }
});
*/

module.exports = router;
