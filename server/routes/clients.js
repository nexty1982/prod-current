// server/routes/clients.js
// Main client management API endpoints for Orthodox Metrics SaaS platform

const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/db');
const { rootPool } = require('../config/db-root');
const path = require('path');

// Get all clients
router.get('/', async (req, res) => {
    try {
        // Handle pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        // Get total count for pagination
        const [countResult] = await promisePool.execute('SELECT COUNT(*) as total FROM clients');
        const total = countResult[0].total;

        // Get clients with pagination
        const [clients] = await promisePool.execute(`
      SELECT 
        id,
        name,
        slug,
        contact_email,
        database_name,
        status,
        branding_config,
        created_at,
        updated_at
      FROM clients 
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

        // Parse branding JSON for each client
        const clientsWithBranding = clients.map(client => ({
            ...client,
            branding_config: client.branding_config ? JSON.parse(client.branding_config) : {}
        }));

        // Calculate pagination info
        const totalPages = Math.ceil(total / limit);

        // Return structured response for frontend compatibility
        res.json({
            data: {
                clients: clientsWithBranding,
                total,
                totalPages,
                currentPage: page,
                limit
            }
        });
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

// Get specific client by ID
router.get('/:id', async (req, res) => {
    try {
        const [clients] = await promisePool.execute(`
      SELECT 
        id,
        name,
        slug,
        contact_email,
        database_name,
        status,
        branding_config,
        created_at,
        updated_at
      FROM clients 
      WHERE id = ?
    `, [req.params.id]);

        if (clients.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        const client = {
            ...clients[0],
            branding_config: clients[0].branding_config ? JSON.parse(clients[0].branding_config) : {}
        };

        res.json(client);
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({ error: 'Failed to fetch client' });
    }
});

// Create new client with automated database setup
router.post('/', async (req, res) => {
    try {
        console.log('📝 POST /api/clients - Request body:', JSON.stringify(req.body, null, 2));
        
        const { name, slug, contact_email, branding_config = {}, branding = {} } = req.body;
        
        // Use contact_email from frontend, fallback to contactEmail for backwards compatibility
        const contactEmail = contact_email;
        
        // Use branding from frontend, fallback to branding_config
        const finalBrandingConfig = Object.keys(branding).length > 0 ? branding : branding_config;

        console.log('📝 Extracted fields:', { name, slug, contactEmail, finalBrandingConfig });

        // Validate required fields
        if (!name || !slug || !contactEmail) {
            console.log('❌ Validation failed - missing fields:', { 
                name: !!name, 
                slug: !!slug, 
                contactEmail: !!contactEmail 
            });
            return res.status(400).json({
                error: 'Name, slug, and contact email are required'
            });
        }

        // Check if slug already exists
        const [existingClients] = await promisePool.execute(
            'SELECT id FROM clients WHERE slug = ?',
            [slug]
        );

        if (existingClients.length > 0) {
            console.log('❌ Slug already exists:', slug);
            return res.status(400).json({
                error: 'Client slug already exists. Please choose a different slug.'
            });
        }

        console.log('✅ Validation passed, creating client...');

        // Create client database directly using root pool
        try {
            const mysql = require('mysql2/promise');
            const fs = require('fs').promises;
            const databaseName = `orthodox_${slug}`;
            
            console.log(`Creating database: ${databaseName}`);
            
            // Basic name sanitization
            if (!/^orthodox_[a-zA-Z0-9_-]+$/.test(databaseName)) {
                return res.status(400).json({ error: 'Invalid database name format.' });
            }
            
            // Create database using root pool
            await rootPool.execute(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
            
            // Grant privileges to orthodoxapp user for the new database
            await rootPool.execute(`GRANT ALL PRIVILEGES ON \`${databaseName}\`.* TO 'orthodoxapp'@'localhost'`);
            await rootPool.execute(`FLUSH PRIVILEGES`);
            console.log(`✅ Database ${databaseName} created and privileges granted`);
            
            // Connect to the new database to create tables
            const clientConnection = await mysql.createConnection({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'orthodoxapp',
                password: process.env.DB_PASSWORD || 'Summerof1982@!',
                database: databaseName
            });
            
            try {
                // Read template schema
                const schemaPath = path.resolve(__dirname, '../../scripts/clientDatabaseTemplate.sql');
                const schemaSql = await fs.readFile(schemaPath, 'utf8');
                
                // Replace placeholders
                const clientSql = schemaSql
                    .replace(/{DATABASE_NAME}/g, databaseName)
                    .replace(/{CLIENT_NAME}/g, name)
                    .replace(/{CONTACT_EMAIL}/g, contactEmail);
                
                // Execute schema
                const statements = clientSql.split(';').filter(stmt => stmt.trim());
                
                for (const statement of statements) {
                    if (statement.trim()) {
                        await clientConnection.execute(statement);
                    }
                }
                
                console.log(`✅ Database ${databaseName} schema created successfully`);
                
                // Insert client record into main database
                const [insertResult] = await promisePool.execute(`
                    INSERT INTO clients (name, slug, contact_email, database_name, status, branding_config, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 'active', ?, NOW(), NOW())
                `, [name, slug, contactEmail, databaseName, JSON.stringify(finalBrandingConfig)]);
                
                console.log(`✅ Client record created with ID: ${insertResult.insertId}`);
                
                // Fetch the newly created client
                const [newClient] = await promisePool.execute(`
                    SELECT 
                      id,
                      name,
                      slug,
                      contact_email,
                      database_name,
                      status,
                      branding_config,
                      created_at,
                      updated_at
                    FROM clients 
                    WHERE id = ?
                `, [insertResult.insertId]);

                const client = {
                    ...newClient[0],
                    branding_config: newClient[0].branding_config ? JSON.parse(newClient[0].branding_config) : {}
                };

                res.status(201).json({
                    message: 'Client created successfully',
                    client
                });
                
            } finally {
                await clientConnection.end();
            }
            
        } catch (createError) {
            console.error('Error creating client database:', createError);
            res.status(500).json({
                error: 'Failed to create client database',
                details: createError.message
            });
        }

    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: 'Failed to create client' });
    }
});

// Update client
router.put('/:id', async (req, res) => {
    try {
        const { name, contactEmail, status, branding_config } = req.body;
        const clientId = req.params.id;

        const [result] = await promisePool.execute(`
      UPDATE clients 
      SET 
        name = ?,
        contact_email = ?,
        status = ?,
        branding_config = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [name, contactEmail, status, JSON.stringify(branding_config || {}), clientId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        // Fetch updated client
        const [clients] = await promisePool.execute(`
      SELECT 
        id,
        name,
        slug,
        contact_email,
        database_name,
        status,
        branding_config,
        created_at,
        updated_at
      FROM clients 
      WHERE id = ?
    `, [clientId]);

        const client = {
            ...clients[0],
            branding_config: clients[0].branding_config ? JSON.parse(clients[0].branding_config) : {}
        };

        res.json({
            message: 'Client updated successfully',
            client
        });
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ error: 'Failed to update client' });
    }
});

// Delete client (soft delete - set status to inactive)
router.delete('/:id', async (req, res) => {
    try {
        const clientId = req.params.id;

        const [result] = await promisePool.execute(`
      UPDATE clients 
      SET 
        status = 'inactive',
        updated_at = NOW()
      WHERE id = ?
    `, [clientId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json({ message: 'Client deactivated successfully' });
    } catch (error) {
        console.error('Error deactivating client:', error);
        res.status(500).json({ error: 'Failed to deactivate client' });
    }
});

// Get client statistics
router.get('/:id/stats', async (req, res) => {
    try {
        const clientId = req.params.id;

        // Get client info
        const [clients] = await promisePool.execute(`
      SELECT database_name FROM clients WHERE id = ?
    `, [clientId]);

        if (clients.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        const databaseName = clients[0].database_name;

        // Connect to client database and get statistics
        const mysql = require('mysql2/promise');
        const clientConnection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'Summerof1982@!',
            database: databaseName
        });

        try {
            // Get record counts
            const [baptismCount] = await clientConnection.execute('SELECT COUNT(*) as count FROM baptism_records');
            const [marriageCount] = await clientConnection.execute('SELECT COUNT(*) as count FROM marriage_records');
            const [funeralCount] = await clientConnection.execute('SELECT COUNT(*) as count FROM funeral_records');

            // Get church info
            const [churchInfo] = await clientConnection.execute('SELECT * FROM church_info ORDER BY created_at DESC LIMIT 1');

            const stats = {
                records: {
                    baptisms: baptismCount[0].count,
                    marriages: marriageCount[0].count,
                    funerals: funeralCount[0].count,
                    total: baptismCount[0].count + marriageCount[0].count + funeralCount[0].count
                },
                church: churchInfo[0] || null
            };

            res.json(stats);
        } finally {
            await clientConnection.end();
        }
    } catch (error) {
        console.error('Error fetching client stats:', error);
        res.status(500).json({ error: 'Failed to fetch client statistics' });
    }
});

// Test client database connection
router.get('/:id/test-connection', async (req, res) => {
    try {
        const clientId = req.params.id;

        // Get client info
        const [clients] = await promisePool.execute(`
      SELECT database_name FROM clients WHERE id = ?
    `, [clientId]);

        if (clients.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        const { database_name } = clients[0];

        // Test connection to client database
        const mysql = require('mysql2/promise');
        const clientConnection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'Summerof1982@!',
            database: database_name
        });

        try {
            await clientConnection.execute('SELECT 1');
            await clientConnection.end();

            res.json({
                success: true,
                message: 'Client database connection successful',
                database: database_name
            });
        } catch (connectionError) {
            res.status(500).json({
                success: false,
                message: 'Client database connection failed',
                error: connectionError.message,
                database: database_name
            });
        }
    } catch (error) {
        console.error('Error testing client connection:', error);
        res.status(500).json({ error: 'Failed to test client connection' });
    }
});

module.exports = router;
