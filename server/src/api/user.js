const { getAppPool } = require('../config/db-compat');
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { promisePool } = require('../config/db-compat');

// GET /api/user/church - Get user's assigned church
router.get('/church', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('👤 Getting church assignment for user ID:', userId);

        // Get user's church assignment from the main users table
        const [userResult] = await getAppPool().query(
            'SELECT u.church_id FROM orthodoxmetrics_db.users u WHERE u.id = ?',
            [userId]
        );

        if (userResult.length === 0) {
            return res.json({
                success: true,
                church: null,
                message: 'User not found'
            });
        }

        const churchId = userResult[0].church_id;

        if (!churchId) {
            return res.json({
                success: true,
                church: null,
                message: 'No church assignment found'
            });
        }

        // Get the church details
        const [churchResult] = await getAppPool().query(
            'SELECT id, name, database_name, email, phone, address, city, state_province, postal_code, country FROM churches WHERE id = ? AND is_active = 1',
            [churchId]
        );

        if (churchResult.length === 0) {
            return res.json({
                success: true,
                church: null,
                message: 'Assigned church not found or inactive'
            });
        }

        const church = churchResult[0];

        res.json({
            success: true,
            church: {
                id: church.id,
                name: church.name,
                database_name: church.database_name,
                church_id: church.id, // Use the database ID as church_id for now
                email: church.email,
                phone: church.phone,
                address: church.address,
                city: church.city,
                state_province: church.state_province,
                postal_code: church.postal_code,
                country: church.country
            }
        });

    } catch (error) {
        console.error('❌ Error getting user church:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user church assignment',
            error: error.message
        });
    }
});

module.exports = router; 