// Add Orthodox Calendar menu item to database
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '.env.production') });

async function addOrthodoxCalendarMenu() {
    let connection;
    
    try {
        // Connect to database using production credentials
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'orthodoxapp',
            password: process.env.DB_PASSWORD || 'Summerof1982@!',
            database: process.env.DB_NAME || 'orthodoxmetrics_db',
            multipleStatements: true
        });

        console.log('🔌 Connected to database successfully');

        // Read and execute the SQL script
        const sqlScript = fs.readFileSync('./database/add_orthodox_calendar_menu.sql', 'utf8');
        
        // Split the script into individual statements
        const statements = sqlScript
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`📜 Executing ${statements.length} SQL statements...`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                try {
                    await connection.query(statement);
                    console.log(`✅ Statement ${i + 1} executed successfully`);
                } catch (error) {
                    // Skip duplicate key errors (expected for ON DUPLICATE KEY UPDATE)
                    if (error.code === 'ER_DUP_ENTRY') {
                        console.log(`ℹ️  Statement ${i + 1} - Entry already exists, updating...`);
                    } else {
                        console.log(`⚠️  Statement ${i + 1} warning:`, error.message);
                    }
                }
            }
        }

        // Verify the menu item was added
        const [results] = await connection.query(`
            SELECT 
                mi.menu_key,
                mi.title,
                mi.path,
                mi.display_order,
                COUNT(rmp.role) as roles_with_access
            FROM menu_items mi
            LEFT JOIN role_menu_permissions rmp ON mi.id = rmp.menu_item_id AND rmp.is_visible = TRUE
            WHERE mi.menu_key = 'orthodox-calendar'
            GROUP BY mi.id
        `);

        if (results.length > 0) {
            console.log('\n🎉 Orthodox Calendar menu item added successfully!');
            console.log('📋 Menu Item Details:');
            console.table(results);
        } else {
            console.log('❌ No Orthodox Calendar menu item found after insertion');
        }

        // Show all menu items for verification
        const [allMenus] = await connection.query(`
            SELECT menu_key, title, path, display_order 
            FROM menu_items 
            ORDER BY display_order, title
        `);
        
        console.log('\n📋 All Menu Items:');
        console.table(allMenus);

    } catch (error) {
        console.error('❌ Error adding Orthodox Calendar menu:', error.message);
        console.error('💡 Make sure:');
        console.error('   1. MySQL is running');
        console.error('   2. Database credentials are correct');
        console.error('   3. Database exists and has menu_items table');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// Run the script
addOrthodoxCalendarMenu();
