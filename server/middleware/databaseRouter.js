/** * - Platform operations             console.log('🌐 Request routed to platform database (orthodmetrics_dev)'); orthodmetrics_dev * Database Router Middleware
 * 
 * Automatically routes requests to the correct database:
 * - Platform operations → orthodmetrics_dev
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
            // All other requests use the platform database
            req.isRecordRequest = false;
            console.log('🌐 Request routed to platform database (orthodmetrics_dev)');
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
