/**
 * Phase 0: Fix Missing Translation Columns in OCR Jobs Table
 * 
 * The OCR processing service is trying to update columns that don't exist:
 * - ocr_result_translation
 * - translation_confidence
 * 
 * This script adds the missing columns to fix the schema mismatch.
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: 'localhost',
    user: 'orthodoxapps',
    password: 'Summerof1982@!',
    database: 'saints_peter_and_paul_orthodox_church_db'
};

async function fixTranslationColumns() {
    console.log('🔧 Phase 0: Fixing missing translation columns in OCR jobs table...');
    
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
        console.log('📋 Existing columns:', existingColumns);

        // Add missing translation columns
        const columnsToAdd = [
            {
                name: 'ocr_result_translation',
                definition: 'LONGTEXT NULL COMMENT "Translated OCR result text"'
            },
            {
                name: 'translation_confidence',
                definition: 'DECIMAL(3,2) NULL COMMENT "Translation confidence score 0.00-1.00"'
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
        console.log('📋 Final columns:', finalColumns);

        // Check if translation columns are now present
        const hasTranslationColumn = finalColumns.includes('ocr_result_translation');
        const hasConfidenceColumn = finalColumns.includes('translation_confidence');

        if (hasTranslationColumn && hasConfidenceColumn) {
            console.log('\n🎉 SUCCESS: All translation columns are now present!');
            console.log('✅ ocr_result_translation column: FOUND');
            console.log('✅ translation_confidence column: FOUND');
        } else {
            console.log('\n❌ ERROR: Some translation columns are still missing');
            console.log('❌ ocr_result_translation:', hasTranslationColumn ? 'FOUND' : 'MISSING');
            console.log('❌ translation_confidence:', hasConfidenceColumn ? 'FOUND' : 'MISSING');
        }

    } catch (error) {
        console.error('❌ Error fixing translation columns:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the fix
fixTranslationColumns()
    .then(() => {
        console.log('\n🎯 Phase 0 Translation Fix Complete!');
        console.log('📝 Next: Re-test OCR upload to verify the fix works');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Phase 0 Translation Fix Failed:', error.message);
        process.exit(1);
    });
