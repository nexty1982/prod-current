const { getAppPool } = require('../config/db-compat');
// server/routes/admin.js
const express = require('express');
const { pool: promisePool } = require('../config/db-compat');
const bcrypt = require('bcrypt');
const {
    canManageUser,
    canPerformDestructiveOperation,
    canChangeRole,
    isRootSuperAdmin,
    logUnauthorizedAttempt,
    ROOT_SUPERADMIN_EMAIL
} = require('../middleware/userAuthorization');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Mount admin menu management routes
const menusRouter = require('../routes/admin/menus');
router.use('/menus', menusRouter);

// Use centralized auth middleware (supports both session and JWT fallback)
const requireAdmin = requireRole(['admin', 'super_admin']);
const requireSuperAdmin = requireRole(['super_admin']);

// Middleware to check if user can create/edit users with specific roles
const requireRolePermission = async (req, res, next) => {
    const userRole = req.session?.user?.role || req.user?.role;
    const targetRole = req.body.role;

    if (!userRole) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    // Super admin can create/edit any role except super_admin
    if (userRole === 'super_admin') {
        if (targetRole === 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot create or modify super_admin users'
            });
        }
        return next();
    }

    // Regular admin can only create/edit non-admin roles
    if (userRole === 'admin') {
        if (targetRole === 'admin' || targetRole === 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot create or modify admin or super_admin users'
            });
        }
        return next();
    }

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
        const { search, role, church_id, is_active } = req.query;
        
        let query = `
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
                u.phone,
                u.created_at,
                u.updated_at,
                u.last_login
            FROM orthodoxmetrics_db.users u
            LEFT JOIN orthodoxmetrics_db.churches c ON u.church_id = c.id
            WHERE 1=1
        `;
        const params = [];

        // Search filter (email, first_name, last_name)
        if (search) {
            query += ` AND (u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Role filter
        if (role && role !== 'all') {
            query += ` AND u.role = ?`;
            params.push(role);
        }

        // Church filter
        if (church_id && church_id !== 'all') {
            query += ` AND u.church_id = ?`;
            params.push(parseInt(church_id));
        }

        // Active status filter
        if (is_active !== undefined && is_active !== 'all') {
            query += ` AND u.is_active = ?`;
            params.push(is_active === 'true' ? 1 : 0);
        }

        query += ` ORDER BY u.created_at DESC`;

        const [rows] = await getAppPool().query(query, params);

        // Remove password_hash from results (shouldn't be in SELECT, but ensure it's not returned)
        const users = rows.map(user => {
            const { password_hash, ...safeUser } = user;
            return safeUser;
        });

        res.json({
            success: true,
            users: users,
            count: users.length
        });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching users',
            error: err.message
        });
    }
});

// POST /admin/users - Create new user
router.post('/users', requireAdmin, requireRolePermission, async (req, res) => {
    try {
        const { email, first_name, last_name, role, church_id, phone, preferred_language, password } = req.body;
        const currentUser = req.user || req.session?.user;

        // Validate required fields
        if (!email || !first_name || !last_name || !role) {
            return res.status(400).json({
                success: false,
                message: 'Email, first name, last name, and role are required'
            });
        }

        // Check if email already exists
        const [existingUsers] = await getAppPool().query(
            'SELECT id FROM orthodoxmetrics_db.users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Generate password if not provided
        let tempPassword = null;
        let passwordHash;
        
        if (password) {
            const saltRounds = 12;
            passwordHash = await bcrypt.hash(password, saltRounds);
        } else {
            // Generate secure temporary password
            tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
            const saltRounds = 12;
            passwordHash = await bcrypt.hash(tempPassword, saltRounds);
        }

        // Insert user
        const [result] = await getAppPool().query(`
            INSERT INTO orthodoxmetrics_db.users (
                email, first_name, last_name, role, church_id, phone, 
                preferred_language, password_hash, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
        `, [
            email,
            first_name,
            last_name,
            role,
            church_id || null,
            phone || null,
            preferred_language || 'en',
            passwordHash
        ]);

        const userId = result.insertId;

        console.log(`✅ User created: ${email} (${role}) by ${currentUser.email} (role: ${currentUser.role})`);

        // Get created user (without password_hash)
        const [userRows] = await getAppPool().query(`
            SELECT 
                id, email, first_name, last_name, role, church_id, phone,
                preferred_language, is_active, email_verified, created_at, updated_at, last_login
            FROM orthodoxmetrics_db.users 
            WHERE id = ?
        `, [userId]);

        res.json({
            success: true,
            message: 'User created successfully',
            user: userRows[0],
            tempPassword: tempPassword // Only returned if auto-generated
        });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while creating user',
            error: err.message
        });
    }
});

// PUT /admin/users/:id - Update user
router.put('/users/:id', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { email, first_name, last_name, role, church_id, preferred_language, is_active } = req.body;
        const currentUser = req.user || req.session?.user;

        // Don't allow updating self's role to lower privilege
        if (userId === currentUser.id && role && role !== currentUser.role) {
            return res.status(400).json({
                success: false,
                message: 'You cannot change your own role'
            });
        }

        // Get target user
        const [userRows] = await getAppPool().query(
            'SELECT id, email, role, first_name, last_name FROM orthodoxmetrics_db.users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const targetUser = userRows[0];

        // Check if current user can manage target user
        if (!canManageUser(currentUser, targetUser)) {
            logUnauthorizedAttempt(currentUser, targetUser, 'UPDATE_USER');
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update this user',
                code: 'UPDATE_DENIED'
            });
        }

        // Check role assignment permission if role is being changed
        if (role && role !== targetUser.role) {
            if (!canChangeRole(currentUser, targetUser, role)) {
                logUnauthorizedAttempt(currentUser, targetUser, 'CHANGE_ROLE');
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to assign this role',
                    code: 'ROLE_ASSIGNMENT_DENIED'
                });
            }

            // Prevent assigning super_admin unless current user is super_admin
            if (role === 'super_admin' && currentUser.role !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Only super_admin can assign super_admin role'
                });
            }
        }

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (email !== undefined) {
            // Check if email is already taken by another user
            const [emailCheck] = await getAppPool().query(
                'SELECT id FROM orthodoxmetrics_db.users WHERE email = ? AND id != ?',
                [email, userId]
            );
            if (emailCheck.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already in use by another user'
                });
            }
            updates.push('email = ?');
            values.push(email);
        }

        if (first_name !== undefined) {
            updates.push('first_name = ?');
            values.push(first_name);
        }

        if (last_name !== undefined) {
            updates.push('last_name = ?');
            values.push(last_name);
        }

        if (role !== undefined) {
            updates.push('role = ?');
            values.push(role);
        }

        if (church_id !== undefined) {
            updates.push('church_id = ?');
            values.push(church_id || null);
        }

        if (preferred_language !== undefined) {
            updates.push('preferred_language = ?');
            values.push(preferred_language);
        }

        if (is_active !== undefined) {
            // Don't allow deactivating self
            if (userId === currentUser.id && !is_active) {
                return res.status(400).json({
                    success: false,
                    message: 'You cannot deactivate your own account'
                });
            }

            // Check permission for deactivation
            if (!is_active && !canPerformDestructiveOperation(currentUser, targetUser)) {
                logUnauthorizedAttempt(currentUser, targetUser, 'DEACTIVATE_USER');
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to deactivate this user',
                    code: 'DEACTIVATION_DENIED'
                });
            }

            updates.push('is_active = ?');
            values.push(is_active ? 1 : 0);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(userId);

        await getAppPool().query(
            `UPDATE orthodoxmetrics_db.users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        console.log(`✅ User updated: ${targetUser.email} by ${currentUser.email} (role: ${currentUser.role})`);

        // Get updated user (without password_hash)
        const [updatedRows] = await getAppPool().query(`
            SELECT 
                id, email, first_name, last_name, role, church_id, phone,
                preferred_language, is_active, email_verified, created_at, updated_at, last_login
            FROM orthodoxmetrics_db.users 
            WHERE id = ?
        `, [userId]);

        res.json({
            success: true,
            message: 'User updated successfully',
            user: updatedRows[0]
        });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while updating user',
            error: err.message
        });
    }
});

// DELETE /admin/users/:id - Delete user
router.delete('/users/:id', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const currentUser = req.user || req.session?.user;

        // Don't allow deleting self
        if (userId === currentUser.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        // Get target user
        const [userRows] = await getAppPool().query(
            'SELECT id, email, role, first_name, last_name FROM orthodoxmetrics_db.users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const targetUser = userRows[0];

        // Check if current user can perform destructive operation
        if (!canPerformDestructiveOperation(currentUser, targetUser)) {
            logUnauthorizedAttempt(currentUser, targetUser, 'DELETE_USER');
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this user',
                code: 'DELETE_DENIED'
            });
        }

        // Super admin can delete anyone except super_admin
        // Regular admin can only delete non-admin users
        if (currentUser.role === 'super_admin') {
            if (targetUser.role === 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot delete super_admin users'
                });
            }
        } else if (currentUser.role === 'admin') {
            if (targetUser.role === 'admin' || targetUser.role === 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot delete admin or super_admin users'
                });
            }
        }

        // Delete user
        await getAppPool().query(
            'DELETE FROM orthodoxmetrics_db.users WHERE id = ?',
            [userId]
        );

        console.log(`✅ User deleted: ${targetUser.email} by ${currentUser.email} (role: ${currentUser.role})`);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting user',
            error: err.message
        });
    }
});

// PUT /admin/users/:id/toggle-status - Toggle user active status (alias for frontend compatibility)
router.put('/users/:id/toggle-status', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const currentUser = req.user || req.session?.user;

        // Get current user status
        const [userRows] = await getAppPool().query(
            'SELECT id, email, role, first_name, last_name, is_active FROM orthodoxmetrics_db.users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const targetUser = userRows[0];
        const newStatus = !targetUser.is_active; // Toggle status

        // Don't allow deactivating self
        if (userId === currentUser.id && !newStatus) {
            return res.status(400).json({
                success: false,
                message: 'You cannot deactivate your own account'
            });
        }

        // Check permissions
        if (!newStatus && !canPerformDestructiveOperation(currentUser, targetUser)) {
            logUnauthorizedAttempt(currentUser, targetUser, 'DEACTIVATE_USER');
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to deactivate this user',
                code: 'DEACTIVATION_DENIED'
            });
        }

        if (newStatus && !canManageUser(currentUser, targetUser)) {
            logUnauthorizedAttempt(currentUser, targetUser, 'ACTIVATE_USER');
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to activate this user',
                code: 'ACTIVATION_DENIED'
            });
        }

        // Update status
        await getAppPool().query(
            'UPDATE orthodoxmetrics_db.users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStatus ? 1 : 0, userId]
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
            message: 'Server error while toggling user status',
            error: err.message
        });
    }
});

// GET /api/admin/churches - Get all churches (for admin panel / ChurchHeader.tsx)
router.get('/churches', requireAdmin, async (req, res) => {
    try {
        const [churches] = await getAppPool().query(
            `SELECT id, name, church_name, is_active 
             FROM churches 
             WHERE is_active = 1 
             ORDER BY name ASC`
        );
        
        res.json({
            success: true,
            data: churches
        });
    } catch (err) {
        console.error('❌ Error fetching church list:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// GET /api/admin/churches/:id - Get individual church by ID (admin only)
router.get('/churches/:id', requireAdmin, async (req, res) => {
    try {
        const churchId = parseInt(req.params.id);
        console.log('🔍 Admin request for church ID:', churchId, 'from:', req.user?.email);

        if (isNaN(churchId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid church ID format'
            });
        }

        const [churchResult] = await getAppPool().query(
            `SELECT 
                id, name, email, phone, address, city, state_province, postal_code, 
                country, website, preferred_language, timezone, currency, tax_id,
                description_multilang, settings, is_active, database_name,
                has_baptism_records, has_marriage_records, has_funeral_records, 
                setup_complete, created_at, updated_at
            FROM churches 
            WHERE id = ? AND is_active = 1`,
            [churchId]
        );

        if (churchResult.length === 0) {
            console.log('❌ Church not found with ID:', churchId);
            return res.status(404).json({
                success: false,
                message: 'Church not found'
            });
        }

        const church = churchResult[0];
        console.log('✅ Church found for editing:', church.name);

        res.json({
            success: true,
            ...church, // Return the church data directly for compatibility with frontend
            church_id: church.id, // Add church_id for frontend compatibility
            // Add backward compatibility aliases
            admin_email: church.email,
            church_name: church.name,
            language_preference: church.preferred_language || 'en'
        });
    } catch (error) {
        console.error('❌ Error fetching church for admin:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch church',
            error: error.message
        });
    }
});

// POST /admin/churches - Create new church (super_admin only)

// POST /admin/churches/wizard - Create church via comprehensive wizard (super_admin only)
router.post('/churches/wizard', requireSuperAdmin, async (req, res) => {
    try {
        console.log('🧙‍♂️ Church Setup Wizard request:', req.body);
        
        const {
            // Basic church info
            name, email, phone, address, city, state_province, postal_code, country,
            website, preferred_language = 'en', timezone = 'UTC', currency = 'USD', is_active = true,
            
            // Template selection
            template_church_id = null,
            selected_tables = [],
            
            // Custom fields
            custom_fields = [],
            
            // Initial users
            initial_users = [],
            
            // Landing page configuration
            custom_landing_page = { enabled: false }
        } = req.body;

        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Church name and email are required'
            });
        }

        // Check for existing church with same name or email
        const [existingChurches] = await getAppPool().query(
            'SELECT id, name, email FROM churches WHERE name = ? OR email = ?',
            [name, email]
        );

        if (existingChurches.length > 0) {
            console.log('🚫 Duplicate church found:', existingChurches);
            return res.status(400).json({
                success: false,
                message: 'Church with this name or email already exists',
                existing: existingChurches[0]
            });
        }

        // Always use record_template1 as the template database
        const templateDatabaseName = 'record_template1';
        console.log('🎯 Using template database:', templateDatabaseName);

        // Generate secure random password for database user
        const generateSecurePassword = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
            let result = '';
            for (let i = 0; i < 16; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };

        // Step 1: Insert church record and get the church_id
        const [result] = await getAppPool().query(`
            INSERT INTO churches (
                name, email, phone, address, city, state_province, postal_code, 
                country, website, preferred_language, timezone, currency, is_active,
                setup_complete, created_at, updated_at,
                church_name, admin_email, language_preference
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?)
        `, [
            name, email, phone, address, city, state_province, postal_code,
            country, website, preferred_language, timezone, currency, is_active ? 1 : 0,
            false, // Will be set to true after full setup
            name, email, preferred_language
        ]);

        const church_id = result.insertId;
        console.log('✅ Church created in orthodoxmetrics_db with ID:', church_id);

        // Step 2: Generate database credentials using new format
        const dbName = `om_church_${church_id}`;
        const dbUser = `church_${church_id}`;
        const dbPassword = generateSecurePassword();
        
        console.log(`🔧 Creating database: ${dbName} with user: ${dbUser}`);

        // Step 3: Create database and dedicated user
        try {
            console.log('🔄 Creating church-specific database and user...');
            
            // Create the database
            await getAppPool().query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
            console.log(`✅ Database created: ${dbName}`);
            
            // Create dedicated database user
            await getAppPool().query(`CREATE USER IF NOT EXISTS '${dbUser}'@'localhost' IDENTIFIED BY '${dbPassword}'`);
            console.log(`✅ Database user created: ${dbUser}`);
            
            // Grant full privileges to the user for their database
            await getAppPool().query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'localhost'`);
            await getAppPool().query(`FLUSH PRIVILEGES`);
            console.log(`✅ Privileges granted to ${dbUser} for ${dbName}`);
            
            // Switch to the new database for table creation
            await getAppPool().query(`USE \`${dbName}\``);
            
            // Create church_info table with the church_id
            await getAppPool().query(`
                CREATE TABLE IF NOT EXISTS church_info (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    church_id INT NOT NULL DEFAULT ${church_id},
                    name VARCHAR(255) NOT NULL DEFAULT '${name}',
                    email VARCHAR(255) NOT NULL DEFAULT '${email}',
                    phone VARCHAR(50),
                    address TEXT,
                    city VARCHAR(100),
                    state_province VARCHAR(100),
                    country VARCHAR(100),
                    preferred_language VARCHAR(10) DEFAULT '${preferred_language}',
                    timezone VARCHAR(50) DEFAULT '${timezone}',
                    currency VARCHAR(10) DEFAULT '${currency}',
                    is_active BOOLEAN DEFAULT TRUE,
                    custom_landing_page JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY uk_church_id (church_id)
                )
            `);

            // Insert church info with landing page configuration
            await getAppPool().query(`
                INSERT INTO church_info (
                    church_id, name, email, phone, address, city, state_province, 
                    country, preferred_language, timezone, currency, is_active, custom_landing_page
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                church_id, name, email, phone, address, city, state_province,
                country, preferred_language, timezone, currency, is_active ? 1 : 0,
                JSON.stringify(custom_landing_page)
            ]);

            // Clone structure from record_template1 database
            console.log('🎯 Cloning structure from template database:', templateDatabaseName);
            
            try {
                // Map selected modules to actual table names
                const tableNameMapping = {
                    'baptism': ['baptism_records', 'baptism_history'],
                    'marriage': ['marriage_records', 'marriage_history'], 
                    'funeral': ['funeral_records', 'funeral_history']
                };
                
                const tablesToClone = [];
                for (const module of selected_tables) {
                    if (tableNameMapping[module]) {
                        tablesToClone.push(...tableNameMapping[module]);
                    }
                }
                
                // Clone table structures for selected tables from record_template1
                const [templateTables] = await getAppPool().query(`
                    SELECT TABLE_NAME 
                    FROM information_schema.TABLES 
                    WHERE TABLE_SCHEMA = ? 
                    AND TABLE_NAME NOT IN ('church_info', 'church_settings')
                    AND TABLE_NAME IN (${tablesToClone.map(() => '?').join(',')})
                `, [templateDatabaseName, ...tablesToClone]);

                // Disable foreign key checks to avoid constraint issues during cloning
                await getAppPool().query('SET FOREIGN_KEY_CHECKS = 0');

                for (const table of templateTables) {
                    const tableName = table.TABLE_NAME;
                    console.log(`📋 Cloning table structure: ${tableName} from ${templateDatabaseName}`);
                    
                    try {
                        // Get CREATE TABLE statement from template
                        const [createTableResult] = await getAppPool().query(`SHOW CREATE TABLE \`${templateDatabaseName}\`.\`${tableName}\``);
                        let createStatement = createTableResult[0]['Create Table'];
                        
                        // Replace table name and execute in new database
                        createStatement = createStatement.replace(`CREATE TABLE \`${tableName}\``, `CREATE TABLE IF NOT EXISTS \`${dbName}\`.\`${tableName}\``);
                        await getAppPool().query(createStatement);
                        console.log(`✅ Cloned table: ${tableName}`);
                    } catch (tableError) {
                        console.warn(`⚠️ Failed to clone table ${tableName}:`, tableError.message);
                    }
                }
                
                // Re-enable foreign key checks
                await getAppPool().query('SET FOREIGN_KEY_CHECKS = 1');
                
                console.log('✅ Template structure cloned successfully');
            } catch (templateError) {
                console.warn('⚠️ Template cloning failed (non-critical):', templateError.message);
                // Make sure to re-enable foreign key checks even if there's an error
                try {
                    await getAppPool().query('SET FOREIGN_KEY_CHECKS = 1');
                } catch (fkError) {
                    console.warn('⚠️ Failed to re-enable foreign key checks:', fkError.message);
                }
            }

            // Create all selected record tables
            console.log('📋 Creating wizard selected record tables:', selected_tables);
            
            const tableDefinitions = {
                'baptism_records': `
                    CREATE TABLE IF NOT EXISTS \`${dbName}\`.baptism_records (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        church_id INT NOT NULL DEFAULT ${church_id},
                        first_name VARCHAR(255) NOT NULL,
                        middle_name VARCHAR(255),
                        last_name VARCHAR(255) NOT NULL,
                        birth_date DATE,
                        baptism_date DATE NOT NULL,
                        birth_place VARCHAR(255),
                        baptism_place VARCHAR(255),
                        father_name VARCHAR(255),
                        mother_name VARCHAR(255),
                        godfather_name VARCHAR(255),
                        godmother_name VARCHAR(255),
                        godparents VARCHAR(500),
                        priest_name VARCHAR(255),
                        sponsors VARCHAR(500),
                        parents VARCHAR(500),
                        clergy VARCHAR(255),
                        certificate_number VARCHAR(100),
                        book_number VARCHAR(100),
                        page_number VARCHAR(100),
                        entry_number VARCHAR(100),
                        notes TEXT,
                        created_by INT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_baptism_church_id (church_id),
                        INDEX idx_baptism_names (first_name, last_name),
                        INDEX idx_baptism_date (baptism_date)
                    )
                `,
                'marriage_records': `
                    CREATE TABLE IF NOT EXISTS \`${dbName}\`.marriage_records (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        church_id INT NOT NULL DEFAULT ${church_id},
                        groom_first_name VARCHAR(255) NOT NULL,
                        groom_middle_name VARCHAR(255),
                        groom_last_name VARCHAR(255) NOT NULL,
                        bride_first_name VARCHAR(255) NOT NULL,
                        bride_middle_name VARCHAR(255),
                        bride_last_name VARCHAR(255) NOT NULL,
                        marriage_date DATE NOT NULL,
                        marriage_place VARCHAR(255),
                        groom_father VARCHAR(255),
                        groom_mother VARCHAR(255),
                        bride_father VARCHAR(255),
                        bride_mother VARCHAR(255),
                        priest_name VARCHAR(255),
                        best_man VARCHAR(255),
                        maid_of_honor VARCHAR(255),
                        witness1 VARCHAR(255),
                        witness2 VARCHAR(255),
                        certificate_number VARCHAR(100),
                        book_number VARCHAR(100),
                        page_number VARCHAR(100),
                        entry_number VARCHAR(100),
                        notes TEXT,
                        created_by INT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_marriage_church_id (church_id),
                        INDEX idx_marriage_groom (groom_first_name, groom_last_name),
                        INDEX idx_marriage_bride (bride_first_name, bride_last_name),
                        INDEX idx_marriage_date (marriage_date)
                    )
                `,
                'funeral_records': `
                    CREATE TABLE IF NOT EXISTS \`${dbName}\`.funeral_records (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        church_id INT NOT NULL DEFAULT ${church_id},
                        first_name VARCHAR(255) NOT NULL,
                        middle_name VARCHAR(255),
                        last_name VARCHAR(255) NOT NULL,
                        birth_date DATE,
                        death_date DATE,
                        funeral_date DATE NOT NULL,
                        birth_place VARCHAR(255),
                        death_place VARCHAR(255),
                        funeral_place VARCHAR(255),
                        father_name VARCHAR(255),
                        mother_name VARCHAR(255),
                        spouse_name VARCHAR(255),
                        priest_name VARCHAR(255),
                        cause_of_death VARCHAR(255),
                        cemetery VARCHAR(255),
                        plot_number VARCHAR(100),
                        certificate_number VARCHAR(100),
                        book_number VARCHAR(100),
                        page_number VARCHAR(100),
                        entry_number VARCHAR(100),
                        notes TEXT,
                        created_by INT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_funeral_church_id (church_id),
                        INDEX idx_funeral_names (first_name, last_name),
                        INDEX idx_funeral_date (funeral_date)
                    )
                `,
                'clergy': `
                    CREATE TABLE IF NOT EXISTS \`${dbName}\`.clergy (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        church_id INT NOT NULL DEFAULT ${church_id},
                        first_name VARCHAR(255) NOT NULL,
                        last_name VARCHAR(255) NOT NULL,
                        title VARCHAR(100),
                        position VARCHAR(100),
                        ordination_date DATE,
                        start_date DATE,
                        end_date DATE,
                        email VARCHAR(255),
                        phone VARCHAR(50),
                        is_active BOOLEAN DEFAULT TRUE,
                        notes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_clergy_church_id (church_id),
                        INDEX idx_clergy_names (first_name, last_name)
                    )
                `,
                'members': `
                    CREATE TABLE IF NOT EXISTS \`${dbName}\`.members (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        church_id INT NOT NULL DEFAULT ${church_id},
                        first_name VARCHAR(255) NOT NULL,
                        last_name VARCHAR(255) NOT NULL,
                        email VARCHAR(255),
                        phone VARCHAR(50),
                        address TEXT,
                        city VARCHAR(100),
                        state_province VARCHAR(100),
                        postal_code VARCHAR(20),
                        country VARCHAR(100),
                        birth_date DATE,
                        baptism_date DATE,
                        membership_date DATE,
                        membership_status VARCHAR(50) DEFAULT 'active',
                        notes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_members_church_id (church_id),
                        INDEX idx_members_names (first_name, last_name),
                        INDEX idx_members_email (email)
                    )
                `,
                'donations': `
                    CREATE TABLE IF NOT EXISTS \`${dbName}\`.donations (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        church_id INT NOT NULL DEFAULT ${church_id},
                        donor_name VARCHAR(255),
                        amount DECIMAL(10,2) NOT NULL,
                        currency VARCHAR(10) DEFAULT '${currency}',
                        donation_date DATE NOT NULL,
                        category VARCHAR(100),
                        method VARCHAR(50),
                        reference_number VARCHAR(100),
                        notes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_donations_church_id (church_id),
                        INDEX idx_donations_date (donation_date),
                        INDEX idx_donations_amount (amount)
                    )
                `,
                'calendar_events': `
                    CREATE TABLE IF NOT EXISTS \`${dbName}\`.calendar_events (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        church_id INT NOT NULL DEFAULT ${church_id},
                        title VARCHAR(255) NOT NULL,
                        description TEXT,
                        event_date DATE NOT NULL,
                        start_time TIME,
                        end_time TIME,
                        event_type VARCHAR(100),
                        location VARCHAR(255),
                        is_recurring BOOLEAN DEFAULT FALSE,
                        recurrence_pattern VARCHAR(100),
                        created_by INT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_events_church_id (church_id),
                        INDEX idx_events_date (event_date),
                        INDEX idx_events_type (event_type)
                    )
                `,
                'confession_records': `
                    CREATE TABLE IF NOT EXISTS \`${dbName}\`.confession_records (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        church_id INT NOT NULL DEFAULT ${church_id},
                        person_name VARCHAR(255),
                        confession_date DATE NOT NULL,
                        priest_name VARCHAR(255),
                        notes TEXT,
                        is_confidential BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_confession_church_id (church_id),
                        INDEX idx_confession_date (confession_date)
                    )
                `,
                'communion_records': `
                    CREATE TABLE IF NOT EXISTS \`${dbName}\`.communion_records (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        church_id INT NOT NULL DEFAULT ${church_id},
                        person_name VARCHAR(255),
                        communion_date DATE NOT NULL,
                        service_type VARCHAR(100),
                        priest_name VARCHAR(255),
                        notes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_communion_church_id (church_id),
                        INDEX idx_communion_date (communion_date)
                    )
                `,
                'chrismation_records': `
                    CREATE TABLE IF NOT EXISTS \`${dbName}\`.chrismation_records (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        church_id INT NOT NULL DEFAULT ${church_id},
                        first_name VARCHAR(255) NOT NULL,
                        last_name VARCHAR(255) NOT NULL,
                        chrismation_date DATE NOT NULL,
                        baptism_date DATE,
                        sponsor_name VARCHAR(255),
                        priest_name VARCHAR(255),
                        confirmation_name VARCHAR(255),
                        certificate_number VARCHAR(100),
                        notes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_chrismation_church_id (church_id),
                        INDEX idx_chrismation_names (first_name, last_name),
                        INDEX idx_chrismation_date (chrismation_date)
                    )
                `
            };

            // Create selected tables
            for (const tableName of selected_tables) {
                if (tableDefinitions[tableName]) {
                    await getAppPool().query(tableDefinitions[tableName]);
                    console.log(`✅ Created table: ${tableName}`);
                }
            }

            // Add custom fields to selected tables
            if (custom_fields && custom_fields.length > 0) {
                console.log('🔧 Adding custom fields:', custom_fields);
                
                for (const field of custom_fields) {
                    try {
                        let fieldDefinition = `${field.field_name} ${field.field_type}`;
                        
                        if (field.field_type === 'VARCHAR' && field.field_length) {
                            fieldDefinition += `(${field.field_length})`;
                        }
                        
                        if (field.is_required) {
                            fieldDefinition += ' NOT NULL';
                        }
                        
                        if (field.default_value) {
                            fieldDefinition += ` DEFAULT '${field.default_value}'`;
                        }

                        await getAppPool().query(`
                            ALTER TABLE \`${dbName}\`.\`${field.table_name}\` 
                            ADD COLUMN ${fieldDefinition}
                        `);
                        
                        console.log(`✅ Added custom field: ${field.field_name} to ${field.table_name}`);
                    } catch (fieldError) {
                        console.warn(`⚠️ Failed to add custom field ${field.field_name}:`, fieldError.message);
                    }
                }
            }

                        // NOTE: Users are stored in orthodoxmetrics_db, not in individual church databases
            // Church databases are for records only. User management is handled centrally.
                        // Use the church_users junction table in orthodoxmetrics_db to assign users to churches.

                        // Add initial users to orthodoxmetrics_db (not church database)
            if (initial_users && initial_users.length > 0) {
                                console.log('👥 Adding initial users to orthodoxmetrics_db:', initial_users.length);
                
                for (const user of initial_users) {
                    try {
                        // Check if user already exists in orthodoxmetrics_db
                        const [existingUsers] = await getAppPool().query(
                            'SELECT id FROM orthodoxmetrics_db.users WHERE email = ?',
                            [user.email]
                        );

                        let userId;
                        if (existingUsers.length > 0) {
                            userId = existingUsers[0].id;
                            console.log(`👤 User ${user.email} already exists, using existing user`);
                        } else {
                            // Create new user in orthodoxmetrics_db
                            const tempPassword = Math.random().toString(36).slice(-12);
                            const bcrypt = require('bcrypt');
                            const hashedPassword = await bcrypt.hash(tempPassword, 10);

                            // Get role_id for the user role
                            const [roleResult] = await getAppPool().query(
                                'SELECT id FROM orthodoxmetrics_db.roles WHERE name = ?',
                                [user.role]
                            );
                            
                            if (roleResult.length === 0) {
                                throw new Error(`Role '${user.role}' not found`);
                            }
                            
                            const role_id = roleResult[0].id;
                            const full_name = `${user.first_name} ${user.last_name}`;

                            const [result] = await getAppPool().query(`
                                INSERT INTO orthodoxmetrics_db.users (
                                    email, full_name, role_id, church_id, 
                                    password_hash, is_active, created_at, updated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
                            `, [
                                user.email, full_name, role_id, church_id,
                                hashedPassword, true
                            ]);
                            
                            userId = result.insertId;
                            console.log(`✅ Created user: ${user.first_name} ${user.last_name} (${user.role}) with temp password: ${tempPassword}`);
                        }

                        // Assign user to church via church_users junction table
                        await getAppPool().query(
                            'INSERT INTO church_users (church_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)',
                            [church_id, userId, user.role]
                        );
                        
                        // TODO: Send invitation email if user.send_invite is true
                        if (user.send_invite) {
                            console.log(`📧 TODO: Send invitation email to ${user.email}`);
                        }
                    } catch (userError) {
                        console.warn(`⚠️ Failed to add user ${user.email}:`, userError.message);
                    }
                }
            }

            // Create church settings table for landing page and other configurations
            await getAppPool().query(`
                CREATE TABLE IF NOT EXISTS \`${dbName}\`.church_settings (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    church_id INT NOT NULL DEFAULT ${church_id},
                    setting_key VARCHAR(255) NOT NULL,
                    setting_value JSON,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY uk_church_setting (church_id, setting_key),
                    INDEX idx_settings_church_id (church_id)
                )
            `);

            // Store landing page configuration in settings
            if (custom_landing_page && custom_landing_page.enabled) {
                await getAppPool().query(`
                    INSERT INTO \`${dbName}\`.church_settings (
                        church_id, setting_key, setting_value, description
                    ) VALUES (?, 'custom_landing_page', ?, 'Custom landing page configuration with default app')
                `, [church_id, JSON.stringify(custom_landing_page)]);
                console.log('✅ Stored custom landing page configuration with default app');
            }

            // Step 4: Store database credentials in the main churches table
            await getAppPool().query('USE orthodoxmetrics_db');
            await getAppPool().query(`
                UPDATE churches 
                SET database_name = ?, db_user = ?, db_password = ?, setup_complete = 1 
                WHERE id = ?
            `, [dbName, dbUser, dbPassword, church_id]);
            console.log('✅ Database credentials stored in churches table');

            console.log('🎉 Church Setup Wizard completed successfully!');

        } catch (dbError) {
            console.error('❌ Database setup failed:', dbError);
            
            // Rollback: delete the church record and database if setup failed
            try {
                await getAppPool().query('USE orthodoxmetrics_db');
                await getAppPool().query('DELETE FROM churches WHERE id = ?', [church_id]);
                await getAppPool().query(`DROP DATABASE IF EXISTS \`${dbName}\``);
                await getAppPool().query(`DROP USER IF EXISTS '${dbUser}'@'localhost'`);
                console.log('🔄 Rolled back church record and database due to setup failure');
            } catch (rollbackError) {
                console.error('❌ Rollback failed:', rollbackError);
            }
            
            throw new Error(`Database setup failed: ${dbError.message}`);
        }

        // Fetch the created church with all details
        const [newChurch] = await getAppPool().query(`
            SELECT * FROM churches WHERE id = ?
        `, [church_id]);

        res.json({
            success: true,
            message: `Church "${name}" created successfully with dedicated database`,
            church_id: church_id,
            db_name: dbName,
            db_user: dbUser,
            church: newChurch[0],
            wizard_summary: {
                template_used: templateDatabaseName,
                tables_created: selected_tables.length,
                custom_fields_added: custom_fields.length,
                initial_users_added: initial_users.length,
                landing_page_configured: custom_landing_page.enabled,
                church_id: church_id,
                dbName: dbName
            }
        });

    } catch (error) {
        console.error('❌ Church wizard creation failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create church via wizard',
            error: error.message
        });
    }
});

// PUT /admin/churches/:id - Update church (admin for own, super_admin for any)
router.put('/churches/:id', requireAdmin, async (req, res) => {
    try {
        const churchId = parseInt(req.params.id);
        const currentUser = req.user || req.session?.user;

        console.log(`🔧 Updating church ${churchId} by user ${currentUser?.email}`);

        if (isNaN(churchId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid church ID format'
            });
        }

        // Check if church exists
        const [existingChurch] = await getAppPool().query(
            'SELECT id, name FROM churches WHERE id = ?',
            [churchId]
        );

        if (existingChurch.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Church not found'
            });
        }

        // Extract updatable fields from request body
        const {
            name, email, phone, address, city, state_province, postal_code,
            country, website, preferred_language, timezone, currency, tax_id,
            description_multilang, settings, is_active, database_name,
            has_baptism_records, has_marriage_records, has_funeral_records,
            setup_complete
            // Note: template_church_id, default_landing_page, enable_ag_grid, ag_grid_record_types, 
            // enable_multilingual, enable_notifications, public_calendar removed - columns don't exist in DB
        } = req.body;

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (name !== undefined) { updates.push('name = ?'); values.push(name); }
        if (email !== undefined) { updates.push('email = ?'); values.push(email); }
        if (phone !== undefined) { updates.push('phone = ?'); values.push(phone || null); }
        if (address !== undefined) { updates.push('address = ?'); values.push(address || null); }
        if (city !== undefined) { updates.push('city = ?'); values.push(city || null); }
        if (state_province !== undefined) { updates.push('state_province = ?'); values.push(state_province || null); }
        if (postal_code !== undefined) { updates.push('postal_code = ?'); values.push(postal_code || null); }
        if (country !== undefined) { updates.push('country = ?'); values.push(country || null); }
        if (website !== undefined) { updates.push('website = ?'); values.push(website || null); }
        if (preferred_language !== undefined) { updates.push('preferred_language = ?'); values.push(preferred_language); }
        if (timezone !== undefined) { updates.push('timezone = ?'); values.push(timezone); }
        if (currency !== undefined) { updates.push('currency = ?'); values.push(currency || null); }
        if (tax_id !== undefined) { updates.push('tax_id = ?'); values.push(tax_id || null); }
        if (description_multilang !== undefined) { updates.push('description_multilang = ?'); values.push(description_multilang || null); }
        if (settings !== undefined) { updates.push('settings = ?'); values.push(typeof settings === 'string' ? settings : JSON.stringify(settings || {})); }
        if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
        if (database_name !== undefined) { updates.push('database_name = ?'); values.push(database_name || null); }
        if (has_baptism_records !== undefined) { updates.push('has_baptism_records = ?'); values.push(has_baptism_records ? 1 : 0); }
        if (has_marriage_records !== undefined) { updates.push('has_marriage_records = ?'); values.push(has_marriage_records ? 1 : 0); }
        if (has_funeral_records !== undefined) { updates.push('has_funeral_records = ?'); values.push(has_funeral_records ? 1 : 0); }
        if (setup_complete !== undefined) { updates.push('setup_complete = ?'); values.push(setup_complete ? 1 : 0); }
        // Removed: template_church_id, default_landing_page, enable_ag_grid, ag_grid_record_types, 
        // enable_multilingual, enable_notifications, public_calendar (these columns don't exist in the churches table)

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(churchId);

        await getAppPool().query(
            `UPDATE churches SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        console.log(`✅ Church ${churchId} updated successfully by ${currentUser?.email}`);

        // Fetch and return updated church
        const [updatedChurch] = await getAppPool().query(
            `SELECT
                id, name, email, phone, address, city, state_province, postal_code,
                country, website, preferred_language, timezone, currency, tax_id,
                description_multilang, settings, is_active, database_name,
                has_baptism_records, has_marriage_records, has_funeral_records,
                setup_complete, created_at, updated_at
            FROM churches WHERE id = ?`,
            [churchId]
        );

        res.json({
            success: true,
            message: 'Church updated successfully',
            church: updatedChurch[0]
        });

    } catch (error) {
        console.error('❌ Error updating church:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update church',
            error: error.message
        });
    }
});

// DELETE /admin/churches/:id - Delete church (super_admin only)
router.delete('/churches/:id', requireSuperAdmin, async (req, res) => {
    try {
        const churchId = parseInt(req.params.id);

        // Check if there are users assigned to this church
        const [userRows] = await getAppPool().query(
            'SELECT COUNT(*) as user_count FROM orthodoxmetrics_db.users WHERE church_id = ?',
            [churchId]
        );

        if (userRows[0].user_count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete church with assigned users. Please reassign users first.'
            });
        }

        // Get church info before deletion
        const [churchRows] = await getAppPool().query(
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
        await getAppPool().query('DELETE FROM churches WHERE id = ?', [churchId]);

        console.log(`✅ Church deleted successfully: ${churchRows[0].name} by admin ${req.user?.email}`);

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

// POST /admin/users/:id/reset-password - Reset user password
router.post('/users/:id/reset-password', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // Don't allow reset of current user's password
        if (userId === (req.user?.id || req.session?.user?.id)) {
            return res.status(400).json({
                success: false,
                message: 'You cannot reset your own password'
            });
        }

        // Get user info and check permissions
        const [userRows] = await getAppPool().query(
            'SELECT email, role FROM orthodoxmetrics_db.users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const targetUserRole = userRows[0].role;
        const currentUserRole = req.user?.role || req.session?.user?.role;

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
        await getAppPool().query(
            'UPDATE orthodoxmetrics_db.users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [passwordHash, userId]
        );

        console.log(`✅ Password reset for user: ${userRows[0].email} by admin ${req.user?.email}`);
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
        const { new_password } = req.body;
        const currentUser = req.user || req.session?.user;



        // Don't allow reset of current user's password
        if (userId === currentUser.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot reset your own password'
            });
        }

        // Get target user information
        const [userRows] = await getAppPool().query(
            'SELECT id, email, role, first_name, last_name FROM orthodoxmetrics_db.users WHERE id = ?',
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

        // Validate provided password
        if (!new_password || typeof new_password !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Password is required'
            });
        }

        if (new_password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        // Hash the password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(new_password, saltRounds);

        // Update user password
        await getAppPool().query(
            'UPDATE orthodoxmetrics_db.users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [passwordHash, userId]
        );

        console.log(`✅ Password reset for user: ${targetUser.email} by ${currentUser.email} (role: ${currentUser.role})`);


        res.json({
            success: true,
            message: 'Password reset successfully'
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
        const currentUser = req.user || req.session?.user;

        // Don't allow deactivation of the current user
        if (userId === currentUser.id && !is_active) {
            return res.status(400).json({
                success: false,
                message: 'You cannot deactivate your own account'
            });
        }

        // Get target user information
        const [userRows] = await getAppPool().query(
            'SELECT id, email, role, first_name, last_name FROM orthodoxmetrics_db.users WHERE id = ?',
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
        await getAppPool().query(
            'UPDATE orthodoxmetrics_db.users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
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
        const [rows] = await getAppPool().query(`
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
            FROM orthodoxmetrics_db.users u
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

// GET /admin/churches/:id/tables - Get available tables for a church (for template selection)

// GET /admin/churches/:id/users - Get church users

// GET /admin/churches/:id/record-counts - Get record counts for church

// GET /admin/churches/:id/database-info - Get database information

// POST /admin/churches/:id/users/:userId/reset-password - Reset user password

// POST /admin/churches/:id/users/:userId/lock - Lock user account

// POST /admin/churches/:id/users/:userId/unlock - Unlock user account

// POST /admin/churches/:id/users - Add new user to church

// PUT /admin/churches/:id/users/:userId - Update church user

// POST /admin/churches/:id/test-connection - Test database connection

// GET /api/admin/roles - Get all system roles
router.get('/roles', requireAdmin, async (req, res) => {
    try {
        const [roles] = await promisePool.query(`
            SELECT id, name, description, is_system
            FROM orthodoxmetrics_db.roles
            WHERE is_system = 1
            ORDER BY 
                CASE name
                    WHEN 'super_admin' THEN 1
                    WHEN 'admin' THEN 2
                    WHEN 'church_admin' THEN 3
                    WHEN 'priest' THEN 4
                    WHEN 'deacon' THEN 5
                    WHEN 'cantor' THEN 6
                    WHEN 'editor' THEN 7
                    WHEN 'member' THEN 8
                    WHEN 'viewer' THEN 9
                    WHEN 'guest' THEN 10
                    ELSE 99
                END,
                name ASC
        `);
        
        res.json({
            success: true,
            roles: roles
        });
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch roles'
        });
    }
});

module.exports = router;
