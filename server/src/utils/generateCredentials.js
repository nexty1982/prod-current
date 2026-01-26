const { getAppPool } = require('../../config/db-compat');
// Credentials Generation Utility
// Generates secure admin and test user credentials for provisioned churches

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../../config/db-compat');
const logger = require('./logger');

const SALT_ROUNDS = 12;

// Generate secure password
function generateSecurePassword(length = 16) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one of each type
  password += getRandomChar('ABCDEFGHIJKLMNOPQRSTUVWXYZ'); // Uppercase
  password += getRandomChar('abcdefghijklmnopqrstuvwxyz'); // Lowercase
  password += getRandomChar('0123456789'); // Number
  password += getRandomChar('!@#$%^&*'); // Special char
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += getRandomChar(charset);
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

function getRandomChar(charset) {
  return charset.charAt(Math.floor(Math.random() * charset.length));
}

// Generate username from church name and email
function generateUsername(churchName, email) {
  const emailPrefix = email.split('@')[0];
  const churchPrefix = churchName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 8);
  
  return `${churchPrefix}_${emailPrefix}`.substring(0, 20);
}

// Generate test user email
function generateTestEmail(adminEmail, siteSlug) {
  const domain = adminEmail.split('@')[1];
  return `test_${siteSlug}@${domain}`;
}

// Create user account in database
async function createUserAccount(connection, userData) {
  try {
    const [result] = await getAppPool().query(`
      INSERT INTO orthodoxmetrics_db.users (
        username, email, password_hash, role, church_id, 
        first_name, last_name, is_active, created_at,
        email_verified, last_login, account_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, NOW(), TRUE, NULL, ?)
    `, [
      userData.username,
      userData.email,
      userData.passwordHash,
      userData.role,
      userData.churchId,
      userData.firstName,
      userData.lastName,
      userData.accountType || 'provisioned'
    ]);

    return {
      userId: result.insertId,
      username: userData.username,
      email: userData.email
    };

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      // Handle duplicate username/email
      if (error.message.includes('username')) {
        // Try with a random suffix
        const newUsername = `${userData.username}_${Math.floor(Math.random() * 1000)}`;
        return createUserAccount(connection, { ...userData, username: newUsername });
      } else if (error.message.includes('email')) {
        throw new Error(`Email ${userData.email} already exists`);
      }
    }
    throw error;
  }
}

// Generate credentials for a church
async function generateCredentials({ queueId, churchId, adminEmail, siteSlug }) {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    logger.info(`Generating credentials for queue ${queueId}, church ${churchId}`);

    // Get church information
    const [churchRows] = await getAppPool().query(
      'SELECT name, contact_name FROM churches WHERE id = ?',
      [churchId]
    );

    if (churchRows.length === 0) {
      throw new Error(`Church ${churchId} not found`);
    }

    const church = churchRows[0];

    // Generate admin credentials
    const adminPassword = generateSecurePassword(16);
    const adminPasswordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
    const adminUsername = generateUsername(church.name, adminEmail);

    // Parse contact name for first/last name
    const nameParts = (church.contact_name || 'Admin User').split(' ');
    const adminFirstName = nameParts[0] || 'Admin';
    const adminLastName = nameParts.slice(1).join(' ') || 'User';

    // Create admin user
    const adminUser = await createUserAccount(connection, {
      username: adminUsername,
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: 'admin',
      churchId,
      firstName: adminFirstName,
      lastName: adminLastName,
      accountType: 'provisioned_admin'
    });

    // Generate test user credentials
    const testEmail = generateTestEmail(adminEmail, siteSlug);
    const testPassword = generateSecurePassword(12);
    const testPasswordHash = await bcrypt.hash(testPassword, SALT_ROUNDS);
    const testUsername = `test_${siteSlug}`.substring(0, 20);

    // Create test user
    const testUser = await createUserAccount(connection, {
      username: testUsername,
      email: testEmail,
      passwordHash: testPasswordHash,
      role: 'volunteer',
      churchId,
      firstName: 'Test',
      lastName: 'User',
      accountType: 'provisioned_test'
    });

    // Create user permissions for admin
    await getAppPool().query(`
      INSERT INTO user_permissions (user_id, permission, granted_by, granted_at)
      VALUES 
        (?, 'canViewRecords', ?, NOW()),
        (?, 'canEditRecords', ?, NOW()),
        (?, 'canDeleteRecords', ?, NOW()),
        (?, 'canPrintCertificates', ?, NOW()),
        (?, 'canVerifyOCR', ?, NOW()),
        (?, 'canManageUsers', ?, NOW()),
        (?, 'canViewAnalytics', ?, NOW()),
        (?, 'canExportData', ?, NOW()),
        (?, 'canManageChurch', ?, NOW())
    `, [
      adminUser.userId, adminUser.userId,
      adminUser.userId, adminUser.userId,
      adminUser.userId, adminUser.userId,
      adminUser.userId, adminUser.userId,
      adminUser.userId, adminUser.userId,
      adminUser.userId, adminUser.userId,
      adminUser.userId, adminUser.userId,
      adminUser.userId, adminUser.userId,
      adminUser.userId, adminUser.userId
    ]);

    // Create basic permissions for test user
    await getAppPool().query(`
      INSERT INTO user_permissions (user_id, permission, granted_by, granted_at)
      VALUES 
        (?, 'canViewRecords', ?, NOW()),
        (?, 'canVerifyOCR', ?, NOW())
    `, [
      testUser.userId, adminUser.userId,
      testUser.userId, adminUser.userId
    ]);

    // Update church with primary admin
    await getAppPool().query(
      'UPDATE churches SET admin_user_id = ? WHERE id = ?',
      [adminUser.userId, churchId]
    );

    // Log credential creation
    await getAppPool().query(`
      INSERT INTO credential_audit_log (
        queue_id, church_id, admin_user_id, test_user_id,
        admin_email, test_email, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'system', NOW())
    `, [
      queueId, churchId, adminUser.userId, testUser.userId,
      adminEmail, testEmail
    ]);

    await connection.commit();

    logger.info(`Credentials generated successfully for church ${churchId}`);

    return {
      success: true,
      adminUser: {
        id: adminUser.userId,
        username: adminUser.username,
        email: adminUser.email,
        password: adminPassword // Plain text for email
      },
      adminPasswordHash,
      testUser: {
        id: testUser.userId,
        username: testUser.username,
        email: testUser.email,
        password: testPassword // Plain text for email
      },
      testUserEmail: testEmail,
      testUserPasswordHash,
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    await connection.rollback();
    logger.error(`Failed to generate credentials for queue ${queueId}:`, error);
    
    return {
      success: false,
      error: error.message
    };
  } finally {
    connection.release();
  }
}

// Reset user password
async function resetUserPassword(userId, newPassword = null) {
  const connection = await db.getConnection();
  
  try {
    // Generate new password if not provided
    const password = newPassword || generateSecurePassword(16);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Update user password
    await getAppPool().query(
      'UPDATE orthodoxmetrics_db.users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, userId]
    );

    // Get user info for logging
    const [userRows] = await getAppPool().query(
      'SELECT username, email FROM orthodoxmetrics_db.users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      throw new Error(`User ${userId} not found`);
    }

    const user = userRows[0];

    logger.info(`Password reset for user ${user.username} (${user.email})`);

    return {
      success: true,
      userId,
      username: user.username,
      email: user.email,
      newPassword: password
    };

  } catch (error) {
    logger.error(`Failed to reset password for user ${userId}:`, error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    connection.release();
  }
}

// Generate API key for church
async function generateAPIKey(churchId, description = 'Auto-generated API key') {
  const connection = await db.getConnection();
  
  try {
    // Generate secure API key
    const apiKey = `ocm_${crypto.randomBytes(32).toString('hex')}`;
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Store in database
    await getAppPool().query(`
      INSERT INTO api_keys (
        church_id, key_hash, description, 
        permissions, is_active, created_at, expires_at
      ) VALUES (?, ?, ?, ?, TRUE, NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR))
    `, [
      churchId,
      apiKeyHash,
      description,
      JSON.stringify(['read', 'write'])
    ]);

    logger.info(`API key generated for church ${churchId}`);

    return {
      success: true,
      apiKey, // Return plain key for one-time display
      description,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };

  } catch (error) {
    logger.error(`Failed to generate API key for church ${churchId}:`, error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    connection.release();
  }
}

// Create database tables if they don't exist
async function initializeCredentialTables() {
  const connection = await db.getConnection();
  
  try {
    // Credential audit log table
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS credential_audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        queue_id INT,
        church_id INT NOT NULL,
        admin_user_id INT,
        test_user_id INT,
        admin_email VARCHAR(255),
        test_email VARCHAR(255),
        action ENUM('created', 'reset', 'disabled') DEFAULT 'created',
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_queue_id (queue_id),
        INDEX idx_church_id (church_id),
        INDEX idx_created_at (created_at)
      )
    `);

    // API keys table
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        church_id INT NOT NULL,
        key_hash VARCHAR(64) NOT NULL,
        description TEXT,
        permissions JSON,
        is_active BOOLEAN DEFAULT TRUE,
        last_used_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        
        UNIQUE KEY unique_key_hash (key_hash),
        INDEX idx_church_id (church_id),
        INDEX idx_is_active (is_active)
      )
    `);

    // User permissions table (if not exists)
    await getAppPool().query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        permission VARCHAR(100) NOT NULL,
        granted_by INT,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP NULL,
        
        UNIQUE KEY unique_user_permission (user_id, permission),
        INDEX idx_user_id (user_id),
        INDEX idx_permission (permission)
      )
    `);

    logger.info('Credential tables initialized successfully');

  } catch (error) {
    logger.error('Failed to initialize credential tables:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Validate password strength
function validatePasswordStrength(password) {
  const checks = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    noSequential: !/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|123|234|345|456|567|678|789)/i.test(password),
    noRepeating: !/(.)\1{2,}/.test(password)
  };

  const score = Object.values(checks).filter(Boolean).length;
  const strength = score < 4 ? 'weak' : score < 6 ? 'medium' : 'strong';

  return {
    valid: strength !== 'weak',
    strength,
    score: Math.round((score / 7) * 100),
    checks
  };
}

module.exports = {
  generateCredentials,
  resetUserPassword,
  generateAPIKey,
  generateSecurePassword,
  validatePasswordStrength,
  initializeCredentialTables
};
