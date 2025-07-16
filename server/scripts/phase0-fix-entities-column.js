/**
 * Phase 0: Fix Missing Extracted Entities Column in OCR Jobs Table
 * 
 * The OCR processing service is trying to access extracted_entities column
 * that doesn't exist. This script adds the missing column.
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: 'localhost',
    user: 'orthodoxapps',
    password: 'Summerof1982@!',
    database: 'saints_peter_and_paul_orthodox_church_db'
};

async function fixExtractedEntitiesColumn() {
    console.log('🔧 Phase 0: Fixing missing extracted_entities column in OCR jobs table...');
    
    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('✅ Connected to OCR database');

        // Check current table structure
        console.log('\n📋 Checking current ocr_jobs table structure...');
        const [columns] = await connection.execute(`
            SHOW COLUMNS FROM ocr_jobs
        `);
        
        const existingColumns = columns.map(col => col.Field);
        console.log('📋 Current column count:', existingColumns.length);

        // Add missing extracted_entities column
        const columnsToAdd = [
            {
                name: 'extracted_entities',
                definition: 'JSON NULL COMMENT "Extracted entities from AI processing"'
            },
            {
                name: 'entity_confidence',
                definition: 'DECIMAL(3,2) NULL COMMENT "Entity extraction confidence score 0.00-1.00"'
            },
            {
                name: 'needs_review',
                definition: 'BOOLEAN DEFAULT TRUE COMMENT "Whether the OCR result needs manual review"'
            },
            {
                name: 'detected_language',
                definition: 'VARCHAR(10) NULL COMMENT "Detected language code"'
            }
        ];

        for (const column of columnsToAdd) {
            if (!existingColumns.includes(column.name)) {
                console.log(`\n➕ Adding missing column: ${column.name}`);
                await connection.execute(`
                    ALTER TABLE ocr_jobs 
                    ADD COLUMN ${column.name} ${column.definition}
                `);
                console.log(`✅ Added column: ${column.name}`);
            } else {
                console.log(`✅ Column already exists: ${column.name}`);
            }
        }

        // Verify the fix by checking the table structure again
        console.log('\n📋 Verifying updated table structure...');
        const [updatedColumns] = await connection.execute(`
            SHOW COLUMNS FROM ocr_jobs
        `);
        
        const finalColumns = updatedColumns.map(col => col.Field);
        console.log('📋 Final column count:', finalColumns.length);
        console.log('📋 New columns added:', finalColumns.filter(col => !existingColumns.includes(col)));

        // Check if all required columns are now present
        const requiredColumns = ['extracted_entities', 'entity_confidence', 'needs_review', 'detected_language'];
        const missingColumns = requiredColumns.filter(col => !finalColumns.includes(col));

        if (missingColumns.length === 0) {
            console.log('\n🎉 SUCCESS: All required columns are now present!');
            requiredColumns.forEach(col => {
                console.log(`✅ ${col}: FOUND`);
            });
        } else {
            console.log('\n❌ ERROR: Some columns are still missing:', missingColumns);
        }

        // Test the OCR job query that was failing
        console.log('\n🧪 Testing the extracted_entities query...');
        try {
            const [testResult] = await connection.execute(`
                SELECT COUNT(*) as count 
                FROM ocr_jobs 
                WHERE status = 'complete' 
                AND extracted_entities IS NOT NULL
                AND JSON_LENGTH(extracted_entities) > 0
            `);
            console.log(`✅ Query test passed! Found ${testResult[0].count} jobs with extracted entities`);
        } catch (error) {
            console.log(`❌ Query test failed: ${error.message}`);
        }

    } catch (error) {
        console.error('❌ Error fixing extracted_entities column:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the fix
fixExtractedEntitiesColumn()
    .then(() => {
        console.log('\n🎯 Phase 0 Extracted Entities Fix Complete!');
        console.log('📝 Next: Re-run OCR status check to verify everything works');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Phase 0 Extracted Entities Fix Failed:', error.message);
        process.exit(1);
    });
