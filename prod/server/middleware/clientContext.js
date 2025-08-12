// middleware/clientContext.js
const { promisePool } = require('../../config/db');

const clientContext = async (req, res, next) => {
    const clientSlug = req.params.clientSlug || req.headers['x-client-slug'];

    if (!clientSlug) {
        return res.status(400).json({ error: 'Client not specified' });
    }

    try {
        // Get client information from main database
        const [clients] = await promisePool.execute(
            'SELECT * FROM clients WHERE slug = ? AND status = "active"',
            [clientSlug]
        );

        if (clients.length === 0) {
            return res.status(404).json({ error: 'Client not found or inactive' });
        }

        req.client = clients[0];
        req.clientDatabase = clients[0].database_name;
        req.clientSlug = clientSlug;

        // Create client-specific database connection
        const mysql = require('mysql2/promise');
        req.clientDb = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: req.clientDatabase
        });

        next();
    } catch (error) {
        console.error('Client context error:', error);
        res.status(500).json({ error: 'Client context initialization failed' });
    }
};

// Cleanup middleware to close client database connection
const clientContextCleanup = async (req, res, next) => {
    res.on('finish', async () => {
        if (req.clientDb) {
            try {
                await req.clientDb.end();
            } catch (error) {
                console.error('Error closing client database connection:', error);
            }
        }
    });
    next();
};

module.exports = { clientContext, clientContextCleanup };
