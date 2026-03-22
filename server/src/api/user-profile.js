const { getAppPool } = require('../config/db-compat');
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { promisePool } = require('../config/db-compat');
const { requireAuth } = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/emailService');

// Get user profile data (root route for /api/user/profile)
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Get user data from individual columns in users table
        const [users] = await getAppPool().query(`
            SELECT id, first_name, last_name, email, role, display_name,
                   phone, company, location, bio, website, birthday,
                   status_message, avatar_url, banner_url, job_title,
                   church_affiliation, social_links, privacy_settings,
                   currency, ui_theme, church_id
            FROM orthodoxmetrics_db.users
            WHERE id = ?
        `, [userId]);

        let profileData = {};
        if (users.length > 0) {
            const user = users[0];

            // Parse JSON columns if stored as strings
            let socialLinks = user.social_links;
            if (typeof socialLinks === 'string') {
                try { socialLinks = JSON.parse(socialLinks); } catch (e) { socialLinks = null; }
            }
            let privacySettings = user.privacy_settings;
            if (typeof privacySettings === 'string') {
                try { privacySettings = JSON.parse(privacySettings); } catch (e) { privacySettings = null; }
            }

            profileData = {
                user_id: user.id,
                display_name: user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                bio: user.bio,
                location: user.location,
                website: user.website,
                birthday: user.birthday,
                status_message: user.status_message,
                profile_theme: user.ui_theme || 'default',
                profile_image_url: user.avatar_url,
                cover_image_url: user.banner_url,
                privacy_settings: privacySettings,
                social_links: socialLinks,
                job_title: user.job_title,
                company: user.company,
                phone: user.phone,
                currency: user.currency,
                church_affiliation: user.church_affiliation,
                church_id: user.church_id,
                // User basic info
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role
            };
        }

        res.json({
            success: true,
            profile: profileData
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user profile' });
    }
});

// Update user profile data (root route for /api/user/profile)
router.put('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const {
            display_name,
            bio,
            location,
            website,
            birthday,
            status_message,
            profile_theme,
            profile_image_url,
            cover_image_url,
            privacy_settings,
            social_links,
            church_affiliation,
            job_title,
            company,
            phone,
            currency
        } = req.body;

        // Build SET clause from provided fields, mapping to actual column names
        const setClauses = [];
        const setValues = [];

        const columnMap = {
            display_name: 'display_name',
            bio: 'bio',
            location: 'location',
            website: 'website',
            birthday: 'birthday',
            status_message: 'status_message',
            profile_theme: 'ui_theme',
            profile_image_url: 'avatar_url',
            cover_image_url: 'banner_url',
            church_affiliation: 'church_affiliation',
            job_title: 'job_title',
            company: 'company',
            phone: 'phone',
            currency: 'currency',
        };

        const fieldValues = {
            display_name, bio, location, website, birthday, status_message,
            profile_theme, profile_image_url, cover_image_url,
            church_affiliation, job_title, company, phone, currency
        };

        for (const [field, value] of Object.entries(fieldValues)) {
            if (value !== undefined) {
                setClauses.push(`${columnMap[field]} = ?`);
                setValues.push(value);
            }
        }

        // JSON columns
        if (privacy_settings !== undefined) {
            setClauses.push('privacy_settings = ?');
            setValues.push(typeof privacy_settings === 'string' ? privacy_settings : JSON.stringify(privacy_settings));
        }
        if (social_links !== undefined) {
            setClauses.push('social_links = ?');
            setValues.push(typeof social_links === 'string' ? social_links : JSON.stringify(social_links));
        }

        if (setClauses.length > 0) {
            setClauses.push('updated_at = CURRENT_TIMESTAMP');
            setValues.push(userId);
            await getAppPool().query(
                `UPDATE orthodoxmetrics_db.users SET ${setClauses.join(', ')} WHERE id = ?`,
                setValues
            );
        }

        console.log(`📸 User profile updated for user ${userId}`);

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ success: false, message: 'Failed to update user profile' });
    }
});

// Update profile images specifically
router.put('/images', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const { profile_image_url, cover_image_url } = req.body;

        // Update image columns directly
        const setClauses = [];
        const setValues = [];
        if (profile_image_url !== undefined) {
            setClauses.push('avatar_url = ?');
            setValues.push(profile_image_url);
        }
        if (cover_image_url !== undefined) {
            setClauses.push('banner_url = ?');
            setValues.push(cover_image_url);
        }

        if (setClauses.length > 0) {
            setClauses.push('updated_at = CURRENT_TIMESTAMP');
            setValues.push(userId);
            await getAppPool().query(
                `UPDATE orthodoxmetrics_db.users SET ${setClauses.join(', ')} WHERE id = ?`,
                setValues
            );
        }

        console.log(`📸 Profile images updated for user ${userId}: profile=${profile_image_url || 'unchanged'}, cover=${cover_image_url || 'unchanged'}`);

        res.json({
            success: true,
            message: 'Profile images updated successfully'
        });

    } catch (error) {
        console.error('Error updating profile images:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile images' });
    }
});

// Change password (self-service)
router.put('/password', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validate inputs
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password, new password, and confirm password are required'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'New password and confirm password do not match'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long'
            });
        }

        // Get user's current password hash
        const [users] = await getAppPool().query(
            'SELECT password_hash FROM orthodoxmetrics_db.users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify current password
        const bcrypt = require('bcrypt');
        const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);

        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password + password_changed_at
        await getAppPool().query(
            'UPDATE orthodoxmetrics_db.users SET password_hash = ?, password_changed_at = NOW(), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newPasswordHash, userId]
        );

        // Revoke all other refresh tokens (keep current session alive)
        const crypto = require('crypto');
        const refreshToken = req.cookies?.refresh_token;
        let sessionsRevoked = 0;
        if (refreshToken) {
            const currentTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
            const [result] = await getAppPool().query(
                'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND token_hash != ? AND revoked_at IS NULL',
                [userId, currentTokenHash]
            );
            sessionsRevoked = result.affectedRows;
        } else {
            // No refresh token — revoke all (edge case)
            const [result] = await getAppPool().query(
                'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
                [userId]
            );
            sessionsRevoked = result.affectedRows;
        }

        // Log to activity_log
        getAppPool().query(
            `INSERT INTO activity_log (user_id, action, details, ip_address, user_agent, created_at)
             VALUES (?, 'password_changed', ?, ?, ?, NOW())`,
            [
                userId,
                JSON.stringify({ sessions_revoked: sessionsRevoked }),
                req.ip || 'unknown',
                (req.get('User-Agent') || 'unknown').substring(0, 255),
            ]
        ).catch((err) => console.error('Failed to log password_changed activity:', err.message));

        console.log(`🔐 Password changed for user ${userId}, revoked ${sessionsRevoked} other session(s)`);

        res.json({
            success: true,
            message: 'Password changed successfully',
            sessions_revoked: sessionsRevoked,
        });

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ success: false, message: 'Failed to change password' });
    }
});

// GET /api/user/profile/security-status — security metadata for Password & Auth page
router.get('/security-status', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // User timestamps
        const [users] = await getAppPool().query(
            'SELECT created_at, last_login, password_changed_at, email_verified, verification_status FROM orthodoxmetrics_db.users WHERE id = ?',
            [userId]
        );
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const user = users[0];

        // Active session count
        const [sessionRows] = await getAppPool().query(
            'SELECT COUNT(*) as active_sessions FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW()',
            [userId]
        );

        // Last verification email sent (for cooldown display)
        const [verifyRows] = await getAppPool().query(
            'SELECT created_at FROM email_verification_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            [userId]
        );

        res.json({
            success: true,
            security: {
                account_created_at: user.created_at,
                last_login: user.last_login,
                password_changed_at: user.password_changed_at,
                email_verified: !!user.email_verified,
                verification_status: user.verification_status || 'none',
                verification_sent_at: verifyRows.length > 0 ? verifyRows[0].created_at : null,
                active_sessions: sessionRows[0].active_sessions,
                two_factor_enabled: false, // No 2FA infrastructure exists yet
            },
        });
    } catch (error) {
        console.error('Error fetching security status:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch security status' });
    }
});

// POST /api/user/profile/resend-verification — send (or re-send) email verification link
router.post('/resend-verification', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const pool = getAppPool();

        // Get user email and verification status
        const [users] = await pool.query(
            'SELECT email, first_name, email_verified FROM orthodoxmetrics_db.users WHERE id = ?',
            [userId]
        );
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = users[0];

        // Already verified — no-op
        if (user.email_verified) {
            return res.json({ success: true, message: 'Email is already verified.' });
        }

        // Rate limit: max 1 verification email per 2 minutes
        const [recent] = await pool.query(
            'SELECT created_at FROM email_verification_tokens WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE) ORDER BY created_at DESC LIMIT 1',
            [userId]
        );
        if (recent.length > 0) {
            return res.status(429).json({
                success: false,
                message: 'A verification email was sent recently. Please wait a few minutes before trying again.',
                retry_after_seconds: 120,
            });
        }

        // Invalidate any existing unused tokens for this user
        await pool.query(
            'UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
            [userId]
        );

        // Generate token (48 bytes = 64 chars base64url)
        const rawToken = crypto.randomBytes(48).toString('base64url');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await pool.query(
            'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
            [userId, tokenHash, expiresAt]
        );

        // Update verification_status to pending
        await pool.query(
            'UPDATE orthodoxmetrics_db.users SET verification_status = ? WHERE id = ?',
            ['pending', userId]
        );

        // Build verification URL
        const baseUrl = process.env.FRONTEND_URL || 'https://orthodoxmetrics.com';
        const verificationUrl = `${baseUrl}/auth/verify-email?token=${rawToken}`;

        // Send email
        await sendVerificationEmail(user.email, verificationUrl, user.first_name);

        res.json({
            success: true,
            message: 'Verification email sent. Please check your inbox.',
        });
    } catch (error) {
        console.error('Error sending verification email:', error);
        res.status(500).json({ success: false, message: 'Unable to send verification email. Please try again later.' });
    }
});

// POST /api/user/profile/verify-email — validate token and mark email as verified
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ success: false, message: 'Verification token is required.' });
        }

        const pool = getAppPool();
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Find valid token
        const [rows] = await pool.query(
            'SELECT id, user_id, expires_at, used_at FROM email_verification_tokens WHERE token_hash = ?',
            [tokenHash]
        );

        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification link.' });
        }

        const tokenRow = rows[0];

        if (tokenRow.used_at) {
            return res.status(400).json({ success: false, message: 'This verification link has already been used.' });
        }

        if (new Date(tokenRow.expires_at) < new Date()) {
            return res.status(400).json({ success: false, message: 'This verification link has expired. Please request a new one.' });
        }

        // Mark token as used
        await pool.query(
            'UPDATE email_verification_tokens SET used_at = NOW() WHERE id = ?',
            [tokenRow.id]
        );

        // Mark user as verified
        await pool.query(
            'UPDATE orthodoxmetrics_db.users SET email_verified = 1, verification_status = ? WHERE id = ?',
            ['verified', tokenRow.user_id]
        );

        res.json({ success: true, message: 'Email verified successfully.' });
    } catch (error) {
        console.error('Error verifying email:', error);
        res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
    }
});

module.exports = router;