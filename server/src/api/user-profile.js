const { getAppPool } = require('../config/db-compat');
const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/db-compat');
const { requireAuth } = require('../middleware/auth');

// Get user profile data (root route for /api/user/profile)
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Get user data with profile_attributes from users table
        const [users] = await getAppPool().query(`
            SELECT id, first_name, last_name, email, role, profile_attributes
            FROM orthodoxmetrics_db.users 
            WHERE id = ?
        `, [userId]);

        let profileData = {};
        if (users.length > 0) {
            const user = users[0];
            // Parse profile_attributes JSON
            let attrs = {};
            if (user.profile_attributes) {
                try {
                    attrs = typeof user.profile_attributes === 'string' 
                        ? JSON.parse(user.profile_attributes) 
                        : user.profile_attributes;
                } catch (e) {
                    attrs = {};
                }
            }

            profileData = {
                user_id: user.id,
                display_name: attrs.display_name || `${user.first_name} ${user.last_name}`,
                bio: attrs.bio,
                location: attrs.location,
                website: attrs.website,
                birthday: attrs.birthday,
                status_message: attrs.status_message,
                profile_theme: attrs.profile_theme || 'default',
                profile_image_url: attrs.profile_image_url,
                cover_image_url: attrs.cover_image_url,
                privacy_settings: attrs.privacy_settings,
                social_links: attrs.social_links,
                job_title: attrs.job_title,
                company: attrs.company,
                phone: attrs.phone,
                currency: attrs.currency,
                church_affiliation: attrs.church_affiliation,
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

        // Build profile attributes object to store in JSON column
        const profileAttrs = {};
        const fieldMap = {
            display_name, bio, location, website, birthday, status_message,
            profile_theme, profile_image_url, cover_image_url,
            church_affiliation, job_title, company, phone, currency
        };

        for (const [key, value] of Object.entries(fieldMap)) {
            if (value !== undefined) {
                profileAttrs[key] = value;
            }
        }

        if (privacy_settings !== undefined) {
            profileAttrs.privacy_settings = privacy_settings;
        }
        if (social_links !== undefined) {
            profileAttrs.social_links = social_links;
        }

        if (Object.keys(profileAttrs).length > 0) {
            // Merge with existing profile_attributes
            await getAppPool().query(`
                UPDATE orthodoxmetrics_db.users 
                SET profile_attributes = JSON_MERGE_PATCH(COALESCE(profile_attributes, '{}'), ?),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [JSON.stringify(profileAttrs), userId]);
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

        // Build profile attributes for images
        const profileAttrs = {};
        if (profile_image_url !== undefined) {
            profileAttrs.profile_image_url = profile_image_url;
        }
        if (cover_image_url !== undefined) {
            profileAttrs.cover_image_url = cover_image_url;
        }

        if (Object.keys(profileAttrs).length > 0) {
            await getAppPool().query(`
                UPDATE orthodoxmetrics_db.users 
                SET profile_attributes = JSON_MERGE_PATCH(COALESCE(profile_attributes, '{}'), ?),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [JSON.stringify(profileAttrs), userId]);
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

        // Update password
        await getAppPool().query(
            'UPDATE orthodoxmetrics_db.users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newPasswordHash, userId]
        );

        console.log(`🔐 Password changed for user ${userId}`);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ success: false, message: 'Failed to change password' });
    }
});

module.exports = router; 