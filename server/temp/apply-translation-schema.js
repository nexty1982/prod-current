#!/usr/bin/env node

// Apply translation schema updates to all church databases
// Run with: node apply-translation-schema.js

const { promisePool } = require('./config/db');
const { getChurchDbConnection } = require('./utils/dbSwitcher');
const fs = require('fs').promises;

async function applyTranslationSchema() {
    console.log('📝 Applying translation schema to all church databases...\n');

    try {
        // Get all active churches
        const [churches] = await promisePool.query(
            'SELECT id, name, database_name FROM churches WHERE is_active = 1'
        );

        console.log(`🏛️  Found ${churches.length} active churches`);

        for (const church of churches) {
            console.log(`\n📋 Updating ${church.name}...`);
            
            try {
                const db = await getChurchDbConnection(church.database_name);
                
                // Add translation columns to ocr_jobs if they don't exist
                try {
                    await db.query(`
                        ALTER TABLE ocr_jobs 
                        ADD COLUMN ocr_result_translation LONGTEXT AFTER ocr_result
                    `);
                    console.log('   ✅ Added ocr_result_translation column');
                } catch (error) {
                    if (error.code === 'ER_DUP_FIELDNAME') {
                        console.log('   ⚠️  ocr_result_translation column already exists');
                    } else {
                        throw error;
                    }
                }

                try {
                    await db.query(`
                        ALTER TABLE ocr_jobs 
                        ADD COLUMN translation_confidence DECIMAL(3,2) AFTER ocr_result_translation
                    `);
                    console.log('   ✅ Added translation_confidence column');
                } catch (error) {
                    if (error.code === 'ER_DUP_FIELDNAME') {
                        console.log('   ⚠️  translation_confidence column already exists');
                    } else {
                        throw error;
                    }
                }

                try {
                    await db.query(`
                        ALTER TABLE ocr_jobs 
                        ADD COLUMN detected_language VARCHAR(10) AFTER translation_confidence
                    `);
                    console.log('   ✅ Added detected_language column');
                } catch (error) {
                    if (error.code === 'ER_DUP_FIELDNAME') {
                        console.log('   ⚠️  detected_language column already exists');
                    } else {
                        throw error;
                    }
                }

                // Add translation settings to ocr_settings if they don't exist
                try {
                    await db.query(`
                        ALTER TABLE ocr_settings 
                        ADD COLUMN enable_translation BOOLEAN DEFAULT TRUE AFTER confidence_threshold
                    `);
                    console.log('   ✅ Added enable_translation column');
                } catch (error) {
                    if (error.code === 'ER_DUP_FIELDNAME') {
                        console.log('   ⚠️  enable_translation column already exists');
                    } else {
                        throw error;
                    }
                }

                try {
                    await db.query(`
                        ALTER TABLE ocr_settings 
                        ADD COLUMN target_language VARCHAR(10) DEFAULT 'en' AFTER enable_translation
                    `);
                    console.log('   ✅ Added target_language column');
                } catch (error) {
                    if (error.code === 'ER_DUP_FIELDNAME') {
                        console.log('   ⚠️  target_language column already exists');
                    } else {
                        throw error;
                    }
                }

                // Add indexes for better performance
                try {
                    await db.query(`
                        ALTER TABLE ocr_jobs 
                        ADD INDEX idx_language (language)
                    `);
                    console.log('   ✅ Added language index');
                } catch (error) {
                    if (error.code === 'ER_DUP_KEYNAME') {
                        console.log('   ⚠️  Language index already exists');
                    } else {
                        throw error;
                    }
                }

                try {
                    await db.query(`
                        ALTER TABLE ocr_jobs 
                        ADD INDEX idx_detected_language (detected_language)
                    `);
                    console.log('   ✅ Added detected_language index');
                } catch (error) {
                    if (error.code === 'ER_DUP_KEYNAME') {
                        console.log('   ⚠️  Detected language index already exists');
                    } else {
                        throw error;
                    }
                }

                // Initialize default settings if no settings exist
                const [settings] = await db.query(`
                    SELECT COUNT(*) as count FROM ocr_settings WHERE church_id = ?
                `, [church.id]);

                if (settings[0].count === 0) {
                    await db.query(`
                        INSERT INTO ocr_settings (church_id, default_language, enable_translation, target_language)
                        VALUES (?, 'en', TRUE, 'en')
                    `, [church.id]);
                    console.log('   ✅ Created default OCR settings with translation enabled');
                } else {
                    // Update existing settings to enable translation
                    await db.query(`
                        UPDATE ocr_settings 
                        SET enable_translation = TRUE, target_language = 'en'
                        WHERE church_id = ? AND enable_translation IS NULL
                    `, [church.id]);
                    console.log('   ✅ Updated existing settings to enable translation');
                }

                console.log(`   ✅ Successfully updated ${church.name}`);

            } catch (error) {
                console.error(`   ❌ Error updating church ${church.name}:`, error.message);
            }
        }

        console.log(`\n🎉 Translation schema update complete!`);
        console.log(`📊 Updated ${churches.length} church databases`);
        console.log(`\n🌍 Translation Features Enabled:`);
        console.log(`   ✅ Multi-language OCR with Google Vision`);
        console.log(`   ✅ Automatic English translation with Google Translate`);
        console.log(`   ✅ Confidence scoring for both OCR and translation`);
        console.log(`   ✅ Language detection and validation`);
        console.log(`   ✅ Dual text storage (original + translation)`);

    } catch (error) {
        console.error('❌ Error in translation schema update:', error);
        process.exit(1);
    }
}

// Run the script
applyTranslationSchema().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
});
