/** * - Platform operations             console.log('🌐 Request routed to platform database (orthodoxmetrics_db)'); orthodoxmetrics_db * Database Router Middleware
 * 
 * Automatically routes requests to the correct database:
 * - Platform operations → orthodoxmetrics_db
 * - Record operations → church-specific DB
 */

const { isRecordPath, getChurchRecordDatabase } = require('../services/databaseService');

/**
 * Middleware to set the correct database connection for the request
 */
async function databaseRouter(req, res, next) {
    try {
        // For record paths, determine the church record database
        if (isRecordPath(req.path)) {
            if (req.session?.user?.church_id) {
                const recordDatabase = await getChurchRecordDatabase(req.session.user.id);
                req.recordDatabase = recordDatabase;
                req.isRecordRequest = true;
                console.log(`🏛️ Record request routed to: ${recordDatabase}`);
            } else {
                console.warn('⚠️ Record request without church context');
                req.isRecordRequest = false;
            }
        } else {
            // Check if this is an admin logging request that should use OMAI error tracking DB
            if (req.path.startsWith('/api/admin/logs') || req.path.startsWith('/api/logger') || req.path.startsWith('/api/errors')) {
                req.isRecordRequest = false;
                req.useOmaiDatabase = true;
                console.log('🔍 Request routed to OMAI error tracking database (omai_error_tracking_db)');
            } else {
                // All other requests use the platform database
                req.isRecordRequest = false;
                console.log('🌐 Request routed to platform database (orthodoxmetrics_db)');
            }
        }
        
        next();
    } catch (error) {
        console.error('❌ Database routing error:', error);
        res.status(500).json({
            success: false,
            error: 'Database routing failed',
            details: error.message
        });
    }
}

module.exports = { databaseRouter };
