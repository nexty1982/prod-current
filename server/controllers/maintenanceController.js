// server/src/controllers/maintenanceController.js
const fs = require('fs');
const path = require('path');

// Reference to a local config or environment file to persist state across restarts
const configPath = path.join(__dirname, '../../config/systemState.json');

exports.getMaintenanceStatus = (req, res) => {
    const isMaintenance = process.env.MAINTENANCE_MODE === 'true';
    res.json({ isInMaintenance: isMaintenance });
};

exports.toggleMaintenance = async (req, res) => {
    const { enabled } = req.body;
    
    // 1. Update the runtime environment variable
    process.env.MAINTENANCE_MODE = enabled ? 'true' : 'false';

    // 2. Persist to a local file so it survives a 'pm2 restart'
    try {
        const state = { isInMaintenance: enabled, updatedAt: new Date().toISOString() };
        fs.writeFileSync(configPath, JSON.stringify(state));
        
        console.log(`[System] Maintenance Mode set to: ${enabled}`);
        res.json({ success: true, isInMaintenance: enabled });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to persist maintenance state' });
    }
};
