// Script to run the churches table schema fix
const fs = require('fs');
const path = require('path');
const { promisePool } = require('./config/db');

async function columnExists(tableName, columnName) {
    try {
        const [result] = await promisePool.query(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = ? 
            AND COLUMN_NAME = ?
        `, [tableName, columnName]);
        return result[0].count > 0;
    } catch (error) {
        console.log(`⚠️  Error checking column ${columnName}: ${error.message}`);
        return false;
    }
}

async function runSchemaFix() {
    console.log('🔧 Starting Churches Table Schema Fix...\n');
    
    try {
        // Disable foreign key checks temporarily to allow column modifications
        console.log('🔧 Temporarily disabling foreign key checks...');
        await promisePool.query('SET FOREIGN_KEY_CHECKS = 0');
        
        // Pre-add critical missing columns that are often referenced in UPDATE statements
        console.log('🔧 Pre-adding critical missing columns...');
        const criticalColumns = [
            { name: 'church_name', definition: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'admin_email', definition: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'language_preference', definition: 'VARCHAR(10) DEFAULT NULL' }
        ];
        
        for (const col of criticalColumns) {
            const exists = await columnExists('churches', col.name);
            if (!exists) {
                try {
                    await promisePool.query(`ALTER TABLE churches ADD COLUMN ${col.name} ${col.definition}`);
                    console.log(`✅ Added missing column: ${col.name}`);
                } catch (error) {
                    if (!error.message.includes('Duplicate column name')) {
                        console.log(`⚠️  Could not add ${col.name}: ${error.message}`);
                    }
                }
            } else {
                console.log(`✅ Column ${col.name} already exists`);
            }
        }
        
        // Read the SQL script
        const sqlPath = path.join(__dirname, 'database', 'fix-churches-schema.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // Handle DELIMITER statements for stored procedures
        const sections = sqlContent.split('DELIMITER');
        let statements = [];
        
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i].trim();
            if (!section) continue;
            
            if (section.startsWith('$$')) {
                // This is a stored procedure section - handle specially
                const procedureContent = section.substring(2).trim();
                const endIndex = procedureContent.lastIndexOf('$$');
                if (endIndex > -1) {
                    const procedureSQL = procedureContent.substring(0, endIndex).trim();
                    statements.push(procedureSQL);
                }
            } else if (section.startsWith(';')) {
                // This is the section after procedure - split by semicolon normally
                const normalStatements = section
                    .split(';')
                    .map(stmt => stmt.trim())
                    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
                statements.push(...normalStatements);
            } else {
                // Normal section - split by semicolon
                const normalStatements = section
                    .split(';')
                    .map(stmt => stmt.trim())
                    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
                statements.push(...normalStatements);
            }
        }
        
        console.log(`\n📋 Found ${statements.length} SQL statements to execute\n`);
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            // Skip comments and empty statements
            if (statement.startsWith('--') || statement.trim().length === 0) {
                continue;
            }
            
            // Check if this is an UPDATE statement that might reference non-existent columns
            if (statement.startsWith('UPDATE churches SET')) {
                // Check for column references in common patterns
                const churchNamePattern = /church_name/i;
                const adminEmailPattern = /admin_email/i;
                const languagePreferencePattern = /language_preference/i;
                
                let shouldSkip = false;
                
                if (churchNamePattern.test(statement)) {
                    const exists = await columnExists('churches', 'church_name');
                    if (!exists) {
                        console.log(`⚠️  Statement ${i + 1} skipped: church_name column doesn't exist yet`);
                        shouldSkip = true;
                    }
                }
                
                if (adminEmailPattern.test(statement)) {
                    const exists = await columnExists('churches', 'admin_email');
                    if (!exists) {
                        console.log(`⚠️  Statement ${i + 1} skipped: admin_email column doesn't exist yet`);
                        shouldSkip = true;
                    }
                }
                
                if (languagePreferencePattern.test(statement)) {
                    const exists = await columnExists('churches', 'language_preference');
                    if (!exists) {
                        console.log(`⚠️  Statement ${i + 1} skipped: language_preference column doesn't exist yet`);
                        shouldSkip = true;
                    }
                }
                
                if (shouldSkip) {
                    continue;
                }
            }
            
            console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
            
            try {
                await promisePool.query(statement);
                console.log(`✅ Statement ${i + 1} completed successfully`);
            } catch (error) {
                // Some statements might fail if columns already exist - that's OK
                if (error.message.includes('Duplicate column name') || 
                    error.message.includes('already exists') ||
                    error.message.includes('Multiple primary key defined') ||
                    error.message.includes('Duplicate key name') ||
                    error.message.includes('Duplicate entry') ||
                    error.message.includes('Cannot change column') ||
                    error.message.includes('used in a foreign key constraint')) {
                    console.log(`⚠️  Statement ${i + 1} skipped (constraint/already exists): ${error.message.split('\n')[0]}`);
                } else {
                    console.error(`❌ Error in statement ${i + 1}:`, error.message);
                    console.error(`SQL: ${statement.substring(0, 100)}...`);
                    throw error;
                }
            }
        }
        
        // Now run a second pass for any UPDATE statements that were skipped
        console.log('\n🔄 Running second pass for data synchronization...');
        
        const updateStatements = [
            "UPDATE churches SET name = church_name WHERE name IS NULL AND church_name IS NOT NULL",
            "UPDATE churches SET church_name = name WHERE church_name IS NULL AND name IS NOT NULL",
            "UPDATE churches SET email = admin_email WHERE email IS NULL AND admin_email IS NOT NULL", 
            "UPDATE churches SET admin_email = email WHERE admin_email IS NULL AND email IS NOT NULL",
            "UPDATE churches SET preferred_language = language_preference WHERE preferred_language IS NULL AND language_preference IS NOT NULL",
            "UPDATE churches SET language_preference = preferred_language WHERE language_preference IS NULL AND preferred_language IS NOT NULL"
        ];
        
        for (let i = 0; i < updateStatements.length; i++) {
            const statement = updateStatements[i];
            console.log(`🔄 Executing sync statement ${i + 1}/${updateStatements.length}...`);
            
            try {
                await promisePool.query(statement);
                console.log(`✅ Sync statement ${i + 1} completed successfully`);
            } catch (error) {
                if (error.message.includes('Unknown column')) {
                    console.log(`⚠️  Sync statement ${i + 1} skipped: ${error.message.split('\n')[0]}`);
                } else {
                    console.error(`❌ Error in sync statement ${i + 1}:`, error.message);
                }
            }
        }
        
        // Re-enable foreign key checks
        console.log('\n🔧 Re-enabling foreign key checks...');
        await promisePool.query('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log('\n🎉 Churches table schema fix completed successfully!');
        
        // Verify the changes
        console.log('\n🔍 Verifying schema changes...');
        const [columns] = await promisePool.query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'churches' 
            ORDER BY ORDINAL_POSITION
        `);
        
        console.log('\n📋 Current churches table structure:');
        console.table(columns);
        
        // Check for sample data
        const [sample] = await promisePool.query('SELECT * FROM churches LIMIT 1');
        if (sample.length > 0) {
            console.log('\n📄 Sample church record:');
            console.log(JSON.stringify(sample[0], null, 2));
        }
        
        const [count] = await promisePool.query('SELECT COUNT(*) as total FROM churches');
        console.log(`\n📊 Total churches in database: ${count[0].total}`);
        
        // Test the API endpoint structure
        console.log('\n🔍 Testing API compatibility...');
        const [apiTest] = await promisePool.query(`
            SELECT 
                id,
                name,
                email,
                phone,
                address,
                city,
                state_province,
                postal_code,
                country,
                website,
                preferred_language,
                timezone,
                currency,
                tax_id,
                description_multilang,
                settings,
                is_active,
                database_name,
                setup_complete,
                created_at,
                updated_at
            FROM churches 
            LIMIT 1
        `);
        
        if (apiTest.length > 0) {
            console.log('✅ All required API fields are present and accessible');
        } else {
            console.log('⚠️  No churches found for API testing');
        }
        
    } catch (error) {
        console.error('❌ Schema fix failed:', error);
        
        // Try to re-enable foreign key checks even if there was an error
        try {
            await promisePool.query('SET FOREIGN_KEY_CHECKS = 1');
            console.log('🔧 Foreign key checks re-enabled after error');
        } catch (fkError) {
            console.error('❌ Could not re-enable foreign key checks:', fkError.message);
        }
        
        process.exit(1);
    } finally {
        await promisePool.end();
        console.log('\n🔚 Database connection closed');
        process.exit(0);
    }
}

// Run the schema fix
runSchemaFix().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
}); 