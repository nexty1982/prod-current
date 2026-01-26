const express = require('express');
const router = express.Router();

// Get unique clergy names for dropdowns
router.get('/:recordType', async (req, res) => {
    try {
        const { recordType } = req.params;
        const churchId = req.headers['x-om-church-id'] || 46; // Default to church 46
        
        console.log(`Fetching clergy for ${recordType}, church ${churchId}`);
        
        let tableName;
        let clergyColumn;
        
        switch (recordType) {
            case 'baptism':
                tableName = 'baptism_records';
                clergyColumn = 'clergy';
                break;
            case 'marriage':
                tableName = 'marriage_records';
                clergyColumn = 'clergy';
                break;
            case 'funeral':
                tableName = 'funeral_records';
                clergyColumn = 'clergy';
                break;
            default:
                return res.status(400).json({ error: 'Invalid record type' });
        }

        // Use church-specific database - connect directly
        const mysql = require('mysql2/promise');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'Summerof2025@!',
            database: `om_church_${churchId}`
        });

        const [rows] = await connection.execute(`
            SELECT DISTINCT ${clergyColumn} as clergy_name
            FROM ${tableName}
            WHERE ${clergyColumn} IS NOT NULL 
            AND ${clergyColumn} != '' 
            AND ${clergyColumn} != 'N/A'
            ORDER BY ${clergyColumn} ASC
        `);

        await connection.end();

        const clergyNames = rows.map(row => row.clergy_name).filter(name => name && name.trim());

        console.log(`Found ${clergyNames.length} clergy names:`, clergyNames);
        
        res.json({
            success: true,
            clergy: clergyNames,
            count: clergyNames.length
        });
    } catch (error) {
        console.error('Error fetching clergy names:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
