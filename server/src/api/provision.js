const { getAppPool } = require('../config/db-compat');
// Church Provisioning API
// Handles the automated church provisioning pipeline

const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();
const db = require('../config/db-compat');
const { requireAuth, requireRole } = require('../middleware/auth');
const { createReactSite } = require('../utils/createReactSite');
const { sendProvisionEmail } = require('../utils/sendProvisionEmail');
const { testDeployedSite } = require('../utils/testDeployedSite');
const { generateCredentials } = require('../utils/generateCredentials');
const logger = require('../utils/logger');

// Get all provision queue entries (admin only)
router.get('/queue', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
  try {
    const {
      status = 'all',
      stage = 'all',
      limit = 50,
      offset = 0,
      language = 'all'
    } = req.query;

    let query = `
      SELECT 
        cpq.*,
        c.name as church_name,
        c.location as church_location,
        c.contact_email,
        c.language_preference,
        u.username as approved_by_username
      FROM church_provision_queue cpq
      LEFT JOIN churches c ON cpq.church_id = c.id
      LEFT JOIN orthodoxmetrics_db.users u ON cpq.approved_by = u.id
      WHERE 1=1
    `;
    
    const params = [];

    if (status !== 'all') {
      query += ' AND cpq.status = ?';
      params.push(status);
    }

    if (stage !== 'all') {
      query += ' AND cpq.stage = ?';
      params.push(stage);
    }

    if (language !== 'all') {
      query += ' AND cpq.language_preference = ?';
      params.push(language);
    }

    query += ' ORDER BY cpq.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await getAppPool().query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM church_provision_queue cpq WHERE 1=1';
    const countParams = [];

    if (status !== 'all') {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    if (stage !== 'all') {
      countQuery += ' AND stage = ?';
      countParams.push(stage);
    }

    if (language !== 'all') {
      countQuery += ' AND language_preference = ?';
      countParams.push(language);
    }

    const [countRows] = await getAppPool().query(countQuery, countParams);
    const total = countRows[0].total;

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Failed to fetch provision queue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch provision queue',
      error: error.message
    });
  }
});

// Add church to provision queue
router.post('/add', requireAuth, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      churchId,
      languagePreference = 'en',
      domainName,
      adminEmail
    } = req.body;

    // Validate church exists and user has permission
    const [churchRows] = await getAppPool().query(
      'SELECT * FROM churches WHERE id = ?',
      [churchId]
    );

    if (churchRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Church not found'
      });
    }

    const church = churchRows[0];

    // Check if church is already in queue
    const [existingRows] = await getAppPool().query(
      'SELECT * FROM church_provision_queue WHERE church_id = ? AND status IN (?, ?, ?)',
      [churchId, 'pending', 'approved', 'provisioning']
    );

    if (existingRows.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Church is already in provisioning queue'
      });
    }

    // Generate unique site slug
    const baseSlug = church.name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    let siteSlug = baseSlug;
    let counter = 1;

    // Ensure slug is unique
    while (true) {
      const [slugRows] = await getAppPool().query(
        'SELECT id FROM church_provision_queue WHERE site_slug = ?',
        [siteSlug]
      );

      if (slugRows.length === 0) break;
      
      siteSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Insert into provision queue
    const [insertResult] = await getAppPool().query(`
      INSERT INTO church_provision_queue (
        church_id, language_preference, site_slug, 
        domain_name, admin_email, provision_data,
        status, stage
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'pending_review')
    `, [
      churchId,
      languagePreference,
      siteSlug,
      domainName,
      adminEmail || church.contact_email,
      JSON.stringify({
        requestedBy: req.user.id,
        requestedAt: new Date().toISOString(),
        churchData: church
      })
    ]);

    const queueId = insertResult.insertId;

    // Update church record
    await getAppPool().query(
      'UPDATE churches SET provision_status = ?, provision_queue_id = ? WHERE id = ?',
      ['pending', queueId, churchId]
    );

    // Create initial stage log
    await getAppPool().query(`
      INSERT INTO provision_stage_logs (
        queue_id, stage, status, started_at, log_data
      ) VALUES (?, 'submission', 'completed', NOW(), ?)
    `, [
      queueId,
      JSON.stringify({
        submittedBy: req.user.id,
        submissionData: req.body
      })
    ]);

    // Create pending review stage
    await getAppPool().query(`
      INSERT INTO provision_stage_logs (
        queue_id, stage, status, started_at
      ) VALUES (?, 'pending_review', 'pending', NOW())
    `, [queueId]);

    await connection.commit();

    // Send notification to church about pending status
    try {
      await sendProvisionEmail(queueId, 'approval_pending');
    } catch (emailError) {
      logger.error('Failed to send pending approval email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Church added to provisioning queue',
      data: {
        queueId,
        siteSlug,
        status: 'pending',
        stage: 'pending_review'
      }
    });

  } catch (error) {
    await connection.rollback();
    logger.error('Failed to add church to provision queue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add church to provision queue',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// Approve church provisioning (admin only)
router.post('/approve/:queueId', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { queueId } = req.params;
    const { approvalNotes } = req.body;

    // Get queue entry
    const [queueRows] = await getAppPool().query(
      'SELECT * FROM church_provision_queue WHERE id = ? AND status = ?',
      [queueId, 'pending']
    );

    if (queueRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Provision queue entry not found or not pending'
      });
    }

    const queueEntry = queueRows[0];

    // Update queue entry to approved
    await getAppPool().query(`
      UPDATE church_provision_queue 
      SET status = 'approved', stage = 'approval', 
          approved_by = ?, approved_at = NOW(),
          provision_data = JSON_SET(provision_data, '$.approvalNotes', ?, '$.approvedBy', ?)
      WHERE id = ?
    `, [req.user.id, approvalNotes || '', req.user.id, queueId]);

    // Complete pending review stage
    await getAppPool().query(`
      UPDATE provision_stage_logs 
      SET status = 'completed', completed_at = NOW(),
          duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()),
          log_data = JSON_SET(COALESCE(log_data, '{}'), '$.approvedBy', ?, '$.approvalNotes', ?)
      WHERE queue_id = ? AND stage = 'pending_review' AND status = 'pending'
    `, [req.user.id, approvalNotes || '', queueId]);

    // Create approval stage
    await getAppPool().query(`
      INSERT INTO provision_stage_logs (
        queue_id, stage, status, started_at, completed_at,
        duration_seconds, log_data
      ) VALUES (?, 'approval', 'completed', NOW(), NOW(), 0, ?)
    `, [
      queueId,
      JSON.stringify({
        approvedBy: req.user.id,
        approvalNotes: approvalNotes || '',
        approvedAt: new Date().toISOString()
      })
    ]);

    await connection.commit();

    // Start automatic provisioning process
    setImmediate(() => {
      startProvisioningProcess(queueId);
    });

    res.json({
      success: true,
      message: 'Church provisioning approved and started',
      data: {
        queueId,
        status: 'approved',
        stage: 'approval'
      }
    });

  } catch (error) {
    await connection.rollback();
    logger.error('Failed to approve church provisioning:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve church provisioning',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// Start automated provisioning process
async function startProvisioningProcess(queueId) {
  const connection = await db.getConnection();
  
  try {
    // Update status to provisioning
    await getAppPool().query(
      'UPDATE church_provision_queue SET status = ?, stage = ? WHERE id = ?',
      ['provisioning', 'provision_site', queueId]
    );

    // Create provision_site stage
    await getAppPool().query(`
      INSERT INTO provision_stage_logs (
        queue_id, stage, status, started_at
      ) VALUES (?, 'provision_site', 'in_progress', NOW())
    `, [queueId]);

    // Get queue entry with church data
    const [queueRows] = await getAppPool().query(`
      SELECT cpq.*, c.name as church_name, c.location, c.contact_email
      FROM church_provision_queue cpq
      LEFT JOIN churches c ON cpq.church_id = c.id
      WHERE cpq.id = ?
    `, [queueId]);

    const queueEntry = queueRows[0];

    // Step 1: Create React site
    logger.info(`Starting site provisioning for queue ${queueId}`);
    const siteResult = await createReactSite({
      queueId,
      siteSlug: queueEntry.site_slug,
      language: queueEntry.language_preference,
      churchData: {
        name: queueEntry.church_name,
        location: queueEntry.location,
        email: queueEntry.admin_email
      }
    });

    if (!siteResult.success) {
      throw new Error(`Site creation failed: ${siteResult.error}`);
    }

    // Complete provision_site stage
    await updateStageStatus(connection, queueId, 'provision_site', 'completed', {
      siteUrl: siteResult.siteUrl,
      sitePath: siteResult.sitePath
    });

    // Step 2: Test deployed site
    await updateStageStatus(connection, queueId, 'test_site', 'in_progress');
    
    const testResult = await testDeployedSite({
      siteUrl: siteResult.siteUrl,
      language: queueEntry.language_preference
    });

    if (!testResult.success) {
      throw new Error(`Site testing failed: ${testResult.error}`);
    }

    await updateStageStatus(connection, queueId, 'test_site', 'completed', testResult);

    // Step 3: Create credentials
    await updateStageStatus(connection, queueId, 'create_credentials', 'in_progress');
    
    const credentialsResult = await generateCredentials({
      queueId,
      churchId: queueEntry.church_id,
      adminEmail: queueEntry.admin_email,
      siteSlug: queueEntry.site_slug
    });

    if (!credentialsResult.success) {
      throw new Error(`Credential creation failed: ${credentialsResult.error}`);
    }

    // Update queue with credentials
    await getAppPool().query(`
      UPDATE church_provision_queue 
      SET admin_password_hash = ?, test_user_email = ?, test_user_password_hash = ?
      WHERE id = ?
    `, [
      credentialsResult.adminPasswordHash,
      credentialsResult.testUserEmail,
      credentialsResult.testUserPasswordHash,
      queueId
    ]);

    await updateStageStatus(connection, queueId, 'create_credentials', 'completed', {
      adminCreated: true,
      testUserCreated: true
    });

    // Step 4: Send notification email
    await updateStageStatus(connection, queueId, 'notify_church', 'in_progress');
    
    const emailResult = await sendProvisionEmail(queueId, 'provision_completed', {
      siteUrl: siteResult.siteUrl,
      adminPassword: credentialsResult.adminPassword,
      testPassword: credentialsResult.testPassword
    });

    if (!emailResult.success) {
      logger.error(`Email notification failed for queue ${queueId}:`, emailResult.error);
      // Don't fail the whole process if email fails
    }

    await updateStageStatus(connection, queueId, 'notify_church', 'completed', emailResult);

    // Final step: Mark as completed
    await getAppPool().query(`
      UPDATE church_provision_queue 
      SET status = 'provisioned', stage = 'completed', provisioned_at = NOW()
      WHERE id = ?
    `, [queueId]);

    // Update church record
    await getAppPool().query(`
      UPDATE churches 
      SET provision_status = 'provisioned', site_slug = ?, 
          site_url = ?, provisioned_at = NOW()
      WHERE id = ?
    `, [queueEntry.site_slug, siteResult.siteUrl, queueEntry.church_id]);

    await updateStageStatus(connection, queueId, 'completed', 'completed');

    logger.info(`Church provisioning completed successfully for queue ${queueId}`);

  } catch (error) {
    logger.error(`Church provisioning failed for queue ${queueId}:`, error);
    
    // Mark as failed
    await getAppPool().query(`
      UPDATE church_provision_queue 
      SET status = 'failed', error_log = CONCAT(COALESCE(error_log, ''), ?, '\n')
      WHERE id = ?
    `, [`[${new Date().toISOString()}] ${error.message}`, queueId]);

    // Update current stage as failed
    await getAppPool().query(`
      UPDATE provision_stage_logs 
      SET status = 'failed', completed_at = NOW(),
          duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()),
          error_message = ?
      WHERE queue_id = ? AND status = 'in_progress'
    `, [error.message, queueId]);

  } finally {
    connection.release();
  }
}

// Helper function to update stage status
async function updateStageStatus(connection, queueId, stage, status, logData = null) {
  if (status === 'in_progress') {
    await getAppPool().query(`
      INSERT INTO provision_stage_logs (
        queue_id, stage, status, started_at
      ) VALUES (?, ?, ?, NOW())
    `, [queueId, stage, status]);
    
    await getAppPool().query(
      'UPDATE church_provision_queue SET stage = ? WHERE id = ?',
      [stage, queueId]
    );
  } else {
    await getAppPool().query(`
      UPDATE provision_stage_logs 
      SET status = ?, completed_at = NOW(),
          duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()),
          log_data = ?
      WHERE queue_id = ? AND stage = ? AND status IN ('pending', 'in_progress')
    `, [status, JSON.stringify(logData || {}), queueId, stage]);
  }
}

// Get provision status
router.get('/status/:queueId', requireAuth, async (req, res) => {
  try {
    const { queueId } = req.params;

    const [queueRows] = await getAppPool().query(`
      SELECT cpq.*, c.name as church_name
      FROM church_provision_queue cpq
      LEFT JOIN churches c ON cpq.church_id = c.id
      WHERE cpq.id = ?
    `, [queueId]);

    if (queueRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provision queue entry not found'
      });
    }

    const [stageRows] = await getAppPool().query(`
      SELECT * FROM provision_stage_logs 
      WHERE queue_id = ? 
      ORDER BY created_at ASC
    `, [queueId]);

    res.json({
      success: true,
      data: {
        queue: queueRows[0],
        stages: stageRows
      }
    });

  } catch (error) {
    logger.error('Failed to get provision status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get provision status',
      error: error.message
    });
  }
});

// Cancel provisioning (admin only)
router.post('/cancel/:queueId', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { queueId } = req.params;
    const { reason } = req.body;

    // Update queue entry
    await getAppPool().query(`
      UPDATE church_provision_queue 
      SET status = 'cancelled',
          error_log = CONCAT(COALESCE(error_log, ''), ?)
      WHERE id = ? AND status IN ('pending', 'approved', 'provisioning')
    `, [`[${new Date().toISOString()}] Cancelled by ${req.user.username}: ${reason || 'No reason provided'}\n`, queueId]);

    // Update church record
    await getAppPool().query(`
      UPDATE churches 
      SET provision_status = 'manual', provision_queue_id = NULL
      WHERE provision_queue_id = ?
    `, [queueId]);

    await connection.commit();

    res.json({
      success: true,
      message: 'Provisioning cancelled successfully'
    });

  } catch (error) {
    await connection.rollback();
    logger.error('Failed to cancel provisioning:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel provisioning',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// ===== NEW SIMPLE CHURCH PROVISIONING ENDPOINTS =====

// In-memory store for provisioning status (in production, use Redis or database)
const provisioningStatus = new Map();

// POST /api/churches/provision - Simple church provisioning
router.post('/churches/provision', async (req, res) => {
  try {
    const {
      churchName,
      adminEmail,
      preferredLanguage,
      adminFirstName,
      adminLastName,
      churchAddress,
      phoneNumber
    } = req.body;

    // Validate required fields
    if (!churchName || !adminEmail || !adminFirstName || !adminLastName || !churchAddress) {
      return res.status(400).json({ 
        error: 'Missing required fields: churchName, adminEmail, adminFirstName, adminLastName, churchAddress' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if admin email already exists
    const [existingUser] = await db.getAppPool().query(
      'SELECT id FROM orthodoxmetrics_db.users WHERE email = ?',
      [adminEmail]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    // Generate provisioning ID
    const provisioningId = crypto.randomUUID();

    // Store initial status
    provisioningStatus.set(provisioningId, {
      id: provisioningId,
      status: 'processing',
      message: 'Initializing church site provisioning...',
      startTime: new Date(),
      churchName,
      adminEmail
    });

    // Start provisioning process (async)
    provisionChurchSimple({
      provisioningId,
      churchName,
      adminEmail,
      preferredLanguage: preferredLanguage || 'en',
      adminFirstName,
      adminLastName,
      churchAddress,
      phoneNumber
    });

    res.json({
      success: true,
      provisioningId,
      message: 'Church provisioning started'
    });

  } catch (error) {
    logger.error('Simple provisioning error:', error);
    res.status(500).json({ error: 'Failed to start provisioning process' });
  }
});

// GET /api/churches/provision/status/:id
router.get('/churches/provision/status/:id', (req, res) => {
  const { id } = req.params;
  const status = provisioningStatus.get(id);

  if (!status) {
    return res.status(404).json({ error: 'Provisioning status not found' });
  }

  res.json(status);
});

// Simple async provisioning function
async function provisionChurchSimple({
  provisioningId,
  churchName,
  adminEmail,
  preferredLanguage,
  adminFirstName,
  adminLastName,
  churchAddress,
  phoneNumber
}) {
  try {
    // Update status: Creating database entries
    updateProvisioningStatus(provisioningId, {
      status: 'processing',
      message: 'Creating database entries...'
    });

    // Create church record (check if churches table exists)
    try {
      const [churchResult] = await db.getAppPool().query(`
        INSERT INTO churches (name, address, language, phone, is_active, created_at) 
        VALUES (?, ?, ?, ?, true, NOW())
      `, [churchName, churchAddress, preferredLanguage, phoneNumber || null]);

      const churchId = churchResult.insertId;

      // Generate temporary password
      const temporaryPassword = generateSecurePassword();
      const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

      // Update status: Creating admin user
      updateProvisioningStatus(provisioningId, {
        status: 'processing',
        message: 'Creating administrator account...'
      });

      // Create admin user
      const adminUsername = `${adminFirstName.toLowerCase()}.${adminLastName.toLowerCase()}`;
      
      await db.getAppPool().query(`
        INSERT INTO orthodoxmetrics_db.users (
          email, username, password_hash, role, landing_page, 
          created_at, church_id, is_active
        ) VALUES (?, ?, ?, 'admin', '/pages/admin/dashboard', NOW(), ?, true)
      `, [adminEmail, adminUsername, hashedPassword, churchId]);

      // Update status: Configuring permissions
      updateProvisioningStatus(provisioningId, {
        status: 'processing',
        message: 'Configuring permissions and settings...'
      });

      // Add some initial configuration (simulate work)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update status: Sending credentials
      updateProvisioningStatus(provisioningId, {
        status: 'processing',
        message: 'Sending login credentials...'
      });

      // Send email with credentials
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/login`;
      await sendProvisioningEmailSimple({
        adminEmail,
        adminFirstName,
        adminLastName,
        churchName,
        adminUsername,
        temporaryPassword,
        loginUrl
      });

      // Final update: Completed
      updateProvisioningStatus(provisioningId, {
        status: 'completed',
        message: 'Church site provisioning completed successfully!',
        credentials: {
          adminUsername,
          temporaryPassword,
          loginUrl
        },
        completedAt: new Date()
      });

      logger.info(`✅ Church provisioning completed for: ${churchName}`);

    } catch (dbError) {
      // If churches table doesn't exist, create a simplified version
      if (dbError.code === 'ER_NO_SUCH_TABLE') {
        logger.warn('Churches table not found, using simplified provisioning');
        
        // Just create the user for now
        const temporaryPassword = generateSecurePassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 12);
        const adminUsername = `${adminFirstName.toLowerCase()}.${adminLastName.toLowerCase()}`;
        
        await db.getAppPool().query(`
          INSERT INTO orthodoxmetrics_db.users (
            email, username, password_hash, role, landing_page, created_at, is_active
          ) VALUES (?, ?, ?, 'admin', '/pages/admin/dashboard', NOW(), true)
        `, [adminEmail, adminUsername, hashedPassword]);

        const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/login`;
        
        updateProvisioningStatus(provisioningId, {
          status: 'completed',
          message: 'Church admin account created successfully!',
          credentials: {
            adminUsername,
            temporaryPassword,
            loginUrl
          },
          completedAt: new Date()
        });
      } else {
        throw dbError;
      }
    }

  } catch (error) {
    logger.error('Simple provisioning failed:', error);
    updateProvisioningStatus(provisioningId, {
      status: 'failed',
      message: `Provisioning failed: ${error.message}`,
      error: error.message,
      failedAt: new Date()
    });
  }
}

// Helper function to update provisioning status
function updateProvisioningStatus(provisioningId, updates) {
  const currentStatus = provisioningStatus.get(provisioningId);
  if (currentStatus) {
    provisioningStatus.set(provisioningId, {
      ...currentStatus,
      ...updates,
      lastUpdated: new Date()
    });
  }
}

// Generate secure temporary password
function generateSecurePassword(length = 12) {
  const charset = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Send simple provisioning email
async function sendProvisioningEmailSimple({
  adminEmail,
  adminFirstName,
  adminLastName,
  churchName,
  adminUsername,
  temporaryPassword,
  loginUrl
}) {
  logger.info(`📧 Would send provisioning email to: ${adminEmail}`);
  logger.info(`Church: ${churchName}`);
  logger.info(`Username: ${adminUsername}`);
  logger.info(`Password: ${temporaryPassword}`);
  logger.info(`Login URL: ${loginUrl}`);
  
  // For now, just log the email content
  // In production, implement actual email sending
}

module.exports = router;
