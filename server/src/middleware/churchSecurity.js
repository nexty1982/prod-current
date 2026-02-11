// server/middleware/churchSecurity.js
// Church Security Middleware - Enforces church_id verification for multi-tenant isolation

const { promisePool } = require("../config/db");

/**
 * Middleware to enforce church_id verification
 * Ensures users can only access data from their assigned church
 */
const requireChurchContext = (options = {}) => {
    const {
        allowSuperAdmin = true,        // Super admins can access any church
        allowAdminCrossChurch = false, // Regular admins limited to their church
        requireExplicitChurchId = true, // Require church_id in request
        source = 'body'               // Where to look for church_id: 'body', 'params', 'query'
    } = options;

    return async (req, res, next) => {
        try {
            // Check if user is authenticated
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required for church access',
                    code: 'AUTH_REQUIRED'
                });
            }

            const userRole = req.user.role;
            const userChurchId = req.user.church_id;

            console.log(`🔒 Church security check for ${req.user.email} (${userRole}) - Church: ${userChurchId}`);

            // Super admins can access any church (if allowed)
            if (allowSuperAdmin && userRole === 'super_admin') {
                console.log('✅ Super admin - church security bypassed');
                req.churchContext = {
                    userChurchId,
                    allowedChurchIds: 'all',
                    bypassReason: 'super_admin'
                };
                return next();
            }

            // Get requested church_id from request
            let requestedChurchId = null;
            
            switch (source) {
                case 'params':
                    requestedChurchId = req.params.church_id || req.params.churchId;
                    break;
                case 'query':
                    requestedChurchId = req.query.church_id || req.query.churchId;
                    break;
                case 'body':
                default:
                    requestedChurchId = req.body.church_id || req.body.churchId;
                    break;
            }

            // If no church_id specified and user has one, use user's church
            if (!requestedChurchId && userChurchId) {
                requestedChurchId = userChurchId;
                console.log(`🏛️ Using user's church_id: ${requestedChurchId}`);
            }

            // Require explicit church_id if configured
            if (requireExplicitChurchId && !requestedChurchId) {
                return res.status(400).json({
                    success: false,
                    message: 'church_id is required for this operation',
                    code: 'CHURCH_ID_REQUIRED'
                });
            }

            // Verify user belongs to the requested church
            if (requestedChurchId && userChurchId && requestedChurchId != userChurchId) {
                // Allow admins to access other churches if configured
                if (allowAdminCrossChurch && ['admin', 'super_admin'].includes(userRole)) {
                    console.log(`⚠️ Admin accessing different church: ${requestedChurchId} (user church: ${userChurchId})`);
                } else {
                    console.log(`❌ Church access denied: user ${userChurchId} trying to access ${requestedChurchId}`);
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied: You can only access data from your assigned church',
                        code: 'CHURCH_ACCESS_DENIED',
                        userChurch: userChurchId,
                        requestedChurch: requestedChurchId
                    });
                }
            }

            // Verify church exists and is active
            if (requestedChurchId) {
                const [churches] = await promisePool.execute(
                    'SELECT id, name, is_active FROM churches WHERE id = ?',
                    [requestedChurchId]
                );

                if (churches.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Church not found',
                        code: 'CHURCH_NOT_FOUND'
                    });
                }

                const church = churches[0];
                if (!church.is_active) {
                    return res.status(403).json({
                        success: false,
                        message: 'Church is not active',
                        code: 'CHURCH_INACTIVE'
                    });
                }

                console.log(`✅ Church access verified: ${church.name} (ID: ${church.id})`);
            }

            // Set church context for the request
            req.churchContext = {
                userChurchId,
                requestedChurchId: requestedChurchId ? parseInt(requestedChurchId) : null,
                allowedChurchIds: userChurchId ? [parseInt(userChurchId)] : [],
                isValid: true
            };

            next();

        } catch (error) {
            console.error('❌ Church security middleware error:', error);
            res.status(500).json({
                success: false,
                message: 'Church security validation failed',
                code: 'SECURITY_ERROR'
            });
        }
    };
};

/**
 * Middleware specifically for analytics routes
 * Ensures analytics data is filtered by church_id
 */
const requireChurchAnalytics = () => {
    return requireChurchContext({
        allowSuperAdmin: true,
        allowAdminCrossChurch: false,
        requireExplicitChurchId: false,
        source: 'query'
    });
};

/**
 * Middleware for OCR routes
 * Ensures OCR processing is tied to specific church
 */
const requireChurchOCR = () => {
    return requireChurchContext({
        allowSuperAdmin: true,
        allowAdminCrossChurch: false,
        requireExplicitChurchId: true,
        source: 'body'
    });
};

/**
 * Middleware for invoice/billing routes  
 * Ensures billing data is church-specific
 */
const requireChurchBilling = () => {
    return requireChurchContext({
        allowSuperAdmin: true,
        allowAdminCrossChurch: false,
        requireExplicitChurchId: true,
        source: 'params'
    });
};

/**
 * Helper function to add church_id to database queries
 * Usage: addChurchFilter(query, params, req.churchContext.requestedChurchId)
 */
const addChurchFilter = (query, params, churchId) => {
    if (!churchId) {
        throw new Error('Church ID is required for database filtering');
    }

    // Add WHERE clause if not present
    if (!query.toLowerCase().includes('where')) {
        query += ' WHERE church_id = ?';
        params.push(churchId);
    } else {
        // Add AND condition
        query += ' AND church_id = ?';
        params.push(churchId);
    }

    return { query, params };
};

/**
 * Validate user belongs to church in per-church database
 */
const validateUserChurchBinding = async (userId, churchId) => {
    try {
        // Check if user exists in the church's database
        const [users] = await promisePool.execute(
            'SELECT id, church_id FROM users WHERE id = ? AND church_id = ?',
            [userId, churchId]
        );

        return users.length > 0;
    } catch (error) {
        console.error('Error validating user-church binding:', error);
        return false;
    }
};

module.exports = {
    requireChurchContext,
    requireChurchAnalytics,
    requireChurchOCR,
    requireChurchBilling,
    addChurchFilter,
    validateUserChurchBinding
}; 