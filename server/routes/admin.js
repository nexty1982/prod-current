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
    console.log('   Session ID:', req.sessionID);
    console.log('   Session exists:', !!req.session);
    console.log('   Session user exists:', !!req.session?.user);
    console.log('   Session user:', req.session?.user);
    console.log('   Request headers (cookie):', req.headers.cookie);
    console.log('   User Agent:', req.headers['user-agent']);

    // 🔧 ENHANCED DEBUG: Check session store directly
    if (req.sessionID && req.sessionStore) {
        try {
            const sessionData = await new Promise((resolve, reject) => {
                req.sessionStore.get(req.sessionID, (err, session) => {
                    if (err) reject(err);
                    else resolve(session);
                });
            });
            console.log('   Session from store:', sessionData);
        } catch (storeErr) {
            console.log('   Session store error:', storeErr.message);
        }
    }

    if (!req.session || !req.session.user) {
        console.log('❌ No authenticated user found');
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
            debug: {
                sessionExists: !!req.session,
                sessionId: req.sessionID,
                hasCookie: !!req.headers.cookie,
                timestamp: new Date().toISOString()
            }
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
    if (!req.session.user) {
        console.log('❌ No authenticated user found in super admin middleware');
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
    if (!req.session.user) {
        console.log('❌ No authenticated user found in role permission middleware');
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

// POST /admin/users - Create new user

// PUT /admin/users/:id - Update user

// DELETE /admin/users/:id - Delete user

// PUT /admin/users/:id/toggle-status - Toggle user active status

// GET /admin/churches - Get all churches (for admin panel)

// GET /admin/churches/:id - Get individual church by ID (admin only)
router.get('/churches/:id', requireAdmin, async (req, res) => {
    try {
        const churchId = parseInt(req.params.id);
        console.log('🔍 Admin request for church ID:', churchId, 'from:', req.session.user?.email);

        if (isNaN(churchId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid church ID format'
            });
        }

        const [churchResult] = await promisePool.query(
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
        const [existingChurches] = await promisePool.query(
            'SELECT id FROM churches WHERE name = ? OR email = ?',
            [name, email]
        );

        if (existingChurches.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Church with this name or email already exists'
            });
        }

        // Validate template church if specified
        let templateChurch = null;
        if (template_church_id) {
            const [templateChurches] = await promisePool.query(
                'SELECT * FROM churches WHERE id = ? AND preferred_language = ? AND is_active = 1',
                [template_church_id, 'en']
            );

            if (templateChurches.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Template church not found or not an active English church'
                });
            }

            templateChurch = templateChurches[0];
            console.log('🎯 Using wizard template church:', templateChurch.name);
        }

        // Generate unique church_id and database name
        const generateChurchId = (churchName) => {
            const prefix = churchName
                .split(' ')
                .map(word => word.charAt(0).toUpperCase())
                .join('')
                .substring(0, 6);
            const timestamp = Date.now().toString().slice(-6);
            return parseInt(`${timestamp}${Math.floor(Math.random() * 100)}`);
        };

        const church_id = generateChurchId(name);
        const sanitizedName = name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 30);
        
        const database_name = `${church_id}_${sanitizedName}_db`;

        // Insert new church into orthodmetrics_dev.churches
        const [result] = await promisePool.query(`
            INSERT INTO churches (
                name, email, phone, address, city, state_province, postal_code, 
                country, website, preferred_language, timezone, currency, is_active,
                database_name, setup_complete, created_at, updated_at,
                church_name, admin_email, language_preference
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?)
        `, [
            name, email, phone, address, city, state_province, postal_code,
            country, website, preferred_language, timezone, currency, is_active ? 1 : 0,
            database_name, false, // Will be set to true after full setup
            name, email, preferred_language
        ]);

        const newChurchDbId = result.insertId;
        console.log('✅ Church created in orthodmetrics_dev with ID:', newChurchDbId);        // Create individual church database with comprehensive setup
        try {
            console.log('🔄 Creating church-specific database with wizard settings:', database_name);
            
            // Create the database
            await promisePool.query(`CREATE DATABASE IF NOT EXISTS \`${database_name}\``);
            await promisePool.query(`USE \`${database_name}\``);
            
            // Create church_info table with the same church_id
            await promisePool.query(`
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
            await promisePool.query(`
                INSERT INTO church_info (
                    church_id, name, email, phone, address, city, state_province, 
                    country, preferred_language, timezone, currency, is_active, custom_landing_page
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?)
            `, [
                church_id, name, email, phone, address, city, state_province,
                country, preferred_language, timezone, currency, is_active ? 1 : 0,
                JSON.stringify(custom_landing_page)
            ]);

            // If template church is specified, clone its structure
            if (templateChurch && templateChurch.database_name) {
                console.log('🎯 Cloning structure from wizard template church database:', templateChurch.database_name);
                
                try {
                    // Clone table structures (excluding data)
                    const [templateTables] = await promisePool.query(`
                        SELECT TABLE_NAME 
                        FROM information_schema.TABLES 
                        WHERE TABLE_SCHEMA = ? 
                        AND TABLE_NAME NOT IN ('church_info')
                        AND TABLE_NAME IN (${selected_tables.map(() => '?').join(',')})
                    `, [templateChurch.database_name, ...selected_tables]);

                    for (const table of templateTables) {
                        const tableName = table.TABLE_NAME;
                        console.log(`📋 Cloning wizard table structure: ${tableName}`);
                        
                        // Get CREATE TABLE statement from template
                        const [createTableResult] = await promisePool.query(`SHOW CREATE TABLE \`${templateChurch.database_name}\`.\`${tableName}\``);
                        let createStatement = createTableResult[0]['Create Table'];
                        
                        // Replace table name and execute in new database
                        createStatement = createStatement.replace(`CREATE TABLE \`${tableName}\``, `CREATE TABLE IF NOT EXISTS \`${database_name}\`.\`${tableName}\``);
                        await promisePool.query(createStatement);
                    }
                    
                    console.log('✅ Wizard template structure cloned successfully');
                } catch (templateError) {
                    console.warn('⚠️ Wizard template cloning failed (non-critical):', templateError.message);
                }
            }

            // Create all selected record tables
            console.log('📋 Creating wizard selected record tables:', selected_tables);
            
            const tableDefinitions = {
                'baptism_records': `
                    CREATE TABLE IF NOT EXISTS \`${database_name}\`.baptism_records (
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
                    CREATE TABLE IF NOT EXISTS \`${database_name}\`.marriage_records (
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
                    CREATE TABLE IF NOT EXISTS \`${database_name}\`.funeral_records (
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
                    CREATE TABLE IF NOT EXISTS \`${database_name}\`.clergy (
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
                    CREATE TABLE IF NOT EXISTS \`${database_name}\`.members (
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
                    CREATE TABLE IF NOT EXISTS \`${database_name}\`.donations (
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
                    CREATE TABLE IF NOT EXISTS \`${database_name}\`.calendar_events (
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
                    CREATE TABLE IF NOT EXISTS \`${database_name}\`.confession_records (
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
                    CREATE TABLE IF NOT EXISTS \`${database_name}\`.communion_records (
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
                    CREATE TABLE IF NOT EXISTS \`${database_name}\`.chrismation_records (
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
                    await promisePool.query(tableDefinitions[tableName]);
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

                        await promisePool.query(`
                            ALTER TABLE \`${database_name}\`.\`${field.table_name}\` 
                            ADD COLUMN ${fieldDefinition}
                        `);
                        
                        console.log(`✅ Added custom field: ${field.field_name} to ${field.table_name}`);
                    } catch (fieldError) {
                        console.warn(`⚠️ Failed to add custom field ${field.field_name}:`, fieldError.message);
                    }
                }
            }

                        // NOTE: Users are stored in orthodmetrics_dev, not in individual church databases
            // Church databases are for records only. User management is handled centrally.
                        // Use the church_users junction table in orthodmetrics_dev to assign users to churches.

                        // Add initial users to orthodmetrics_dev (not church database)
            if (initial_users && initial_users.length > 0) {
                                console.log('👥 Adding initial users to orthodmetrics_dev:', initial_users.length);
                
                for (const user of initial_users) {
                    try {
                        // Check if user already exists in orthodmetrics_dev
                        const [existingUsers] = await promisePool.query(
                            'SELECT id FROM users WHERE email = ?',
                            [user.email]
                        );

                        let userId;
                        if (existingUsers.length > 0) {
                            userId = existingUsers[0].id;
                            console.log(`👤 User ${user.email} already exists, using existing user`);
                        } else {
                            // Create new user in orthodmetrics_dev
                            const tempPassword = Math.random().toString(36).slice(-12);
                            const bcrypt = require('bcrypt');
                            const hashedPassword = await bcrypt.hash(tempPassword, 10);

                            const [result] = await promisePool.query(`
                                INSERT INTO users (
                                    email, first_name, last_name, role, church_id, 
                                    password_hash, is_active, created_at, updated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                            `, [
                                user.email, user.first_name, user.last_name, user.role, church_id,
                                hashedPassword, true
                            ]);
                            
                            userId = result.insertId;
                            console.log(`✅ Created user: ${user.first_name} ${user.last_name} (${user.role}) with temp password: ${tempPassword}`);
                        }

                        // Assign user to church via church_users junction table
                        await promisePool.query(
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
            await promisePool.query(`
                CREATE TABLE IF NOT EXISTS \`${database_name}\`.church_settings (
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
                await promisePool.query(`
                    INSERT INTO \`${database_name}\`.church_settings (
                        church_id, setting_key, setting_value, description
                    ) VALUES (?, 'custom_landing_page', ?, 'Custom landing page configuration with default app')
                `, [church_id, JSON.stringify(custom_landing_page)]);
                console.log('✅ Stored custom landing page configuration with default app');
            }

            // Switch back to main database and mark setup as complete
            await promisePool.query('USE orthodmetrics_dev');
            await promisePool.query('UPDATE churches SET setup_complete = 1 WHERE id = ?', [newChurchDbId]);

            console.log('🎉 Church Setup Wizard completed successfully!');

        } catch (dbError) {
            console.error('❌ Database setup failed:', dbError);
            
            // Rollback: delete the church record if database setup failed
            try {
                await promisePool.query('DELETE FROM churches WHERE id = ?', [newChurchDbId]);
                console.log('🔄 Rolled back church record due to database setup failure');
            } catch (rollbackError) {
                console.error('❌ Rollback failed:', rollbackError);
            }
            
            throw new Error(`Database setup failed: ${dbError.message}`);
        }

        // Fetch the created church with all details
        const [newChurch] = await promisePool.query(`
            SELECT * FROM churches WHERE id = ?
        `, [newChurchDbId]);

        res.json({
            success: true,
            message: `Church "${name}" created successfully via wizard`,
            church: newChurch[0],
            wizard_summary: {
                template_used: templateChurch ? templateChurch.name : null,
                tables_created: selected_tables.length,
                custom_fields_added: custom_fields.length,
                initial_users_added: initial_users.length,
                landing_page_configured: custom_landing_page.enabled,
                church_id: church_id,
                database_name: database_name
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

// PUT /admin/churches/:id - Update church (super_admin only)

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
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
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
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
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

module.exports = router;
