const { getAppPool } = require('../../config/db-compat');
const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/db-compat');
const { requireAuth } = require('../middleware/auth');

// Get user profile data
router.get('/profile', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Get user profile data
        const [profiles] = await getAppPool().query(`
            SELECT 
                up.*,
                u.first_name,
                u.last_name,
                u.email,
                u.role
            FROM user_profiles up
            RIGHT JOIN orthodoxmetrics_db.users u ON up.user_id = u.id
            WHERE u.id = ?
        `, [userId]);

        let profileData = {};
        if (profiles.length > 0) {
            const profile = profiles[0];
            profileData = {
                id: profile.id,
                user_id: profile.user_id,
                display_name: profile.display_name || `${profile.first_name} ${profile.last_name}`,
                bio: profile.bio,
                location: profile.location,
                website: profile.website,
                birthday: profile.birthday,
                status_message: profile.status_message,
                profile_theme: profile.profile_theme || 'default',
                profile_image_url: profile.profile_image_url,
                cover_image_url: profile.cover_image_url,
                is_online: profile.is_online,
                last_seen: profile.last_seen,
                privacy_settings: profile.privacy_settings,
                social_links: profile.social_links,
                // User basic info
                first_name: profile.first_name,
                last_name: profile.last_name,
                email: profile.email,
                role: profile.role
            };
        } else {
            // Return basic user info if no profile exists
            const [users] = await getAppPool().query('SELECT * FROM orthodoxmetrics_db.users WHERE id = ?', [userId]);
            if (users.length > 0) {
                const user = users[0];
                profileData = {
                    user_id: user.id,
                    display_name: `${user.first_name} ${user.last_name}`,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    role: user.role,
                    profile_image_url: null,
                    cover_image_url: null
                };
            }
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

// Update user profile data
router.put('/profile', requireAuth, async (req, res) => {
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
            church_affiliation
        } = req.body;

        // Check if profile exists
        const [existingProfiles] = await getAppPool().query(
            'SELECT id FROM user_profiles WHERE user_id = ?',
            [userId]
        );

        if (existingProfiles.length > 0) {
            // Update existing profile
            await getAppPool().query(`
                UPDATE user_profiles SET
                    display_name = ?,
                    bio = ?,
                    location = ?,
                    website = ?,
                    birthday = ?,
                    status_message = ?,
                    profile_theme = ?,
                    profile_image_url = ?,
                    cover_image_url = ?,
                    privacy_settings = ?,
                    social_links = ?,
                    church_affiliation = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `, [
                display_name, bio, location, website, birthday, status_message,
                profile_theme, profile_image_url, cover_image_url,
                JSON.stringify(privacy_settings), JSON.stringify(social_links), church_affiliation, userId
            ]);

            console.log(`📸 User profile updated for user ${userId}`);
        } else {
            // Create new profile
            await getAppPool().query(`
                INSERT INTO user_profiles (
                    user_id, display_name, bio, location, website, birthday,
                    status_message, profile_theme, profile_image_url, cover_image_url,
                    privacy_settings, social_links, church_affiliation, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
                userId, display_name, bio, location, website, birthday, status_message,
                profile_theme, profile_image_url, cover_image_url,
                JSON.stringify(privacy_settings), JSON.stringify(social_links), church_affiliation
            ]);

            console.log(`📸 User profile created for user ${userId}`);
        }

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
router.put('/profile/images', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const { profile_image_url, cover_image_url } = req.body;

        // Check if profile exists
        const [existingProfiles] = await getAppPool().query(
            'SELECT id FROM user_profiles WHERE user_id = ?',
            [userId]
        );

        if (existingProfiles.length > 0) {
            // Update existing profile images
            const updateFields = [];
            const updateValues = [];

            if (profile_image_url !== undefined) {
                updateFields.push('profile_image_url = ?');
                updateValues.push(profile_image_url);
            }

            if (cover_image_url !== undefined) {
                updateFields.push('cover_image_url = ?');
                updateValues.push(cover_image_url);
            }

            if (updateFields.length > 0) {
                updateFields.push('updated_at = CURRENT_TIMESTAMP');
                updateValues.push(userId);

                await getAppPool().query(`
                    UPDATE user_profiles SET ${updateFields.join(', ')}
                    WHERE user_id = ?
                `, updateValues);
            }
        } else {
            // Create new profile with just the images
            await getAppPool().query(`
                INSERT INTO user_profiles (user_id, profile_image_url, cover_image_url, created_at, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [userId, profile_image_url || null, cover_image_url || null]);
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

module.exports = router; 