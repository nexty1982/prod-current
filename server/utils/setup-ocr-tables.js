#!/usr/bin/env node

// OCR Database Tables Setup Script
// Run with: node utils/setup-ocr-tables.js

const { getChurchDbConnection } = require('../utils/dbSwitcher');
const { promisePool } = require('../config/db');

console.log('🗄️ Setting up OCR tables for all churches...\n');

async function setupOcrTables() {
    try {
        // Step 1: Get all churches from central database
        console.log('1️⃣ Fetching churches from central database...');
        const [churches] = await promisePool.query('SELECT id, name, database_name FROM churches WHERE is_active = 1');
        
        console.log(`Found ${churches.length} active churches:`);
        churches.forEach(church => {
            console.log(`   - ${church.name} (DB: ${church.database_name})`);
        });

        // Step 2: Create OCR tables for each church
        console.log('\n2️⃣ Creating OCR tables for each church...');
        
        for (const church of churches) {
            try {
                console.log(`\n🏛️ Setting up tables for: ${church.name}`);
                
                // Get connection to church-specific database
                const db = await getChurchDbConnection(church.database_name);
                
                // Create ocr_jobs table
                console.log('   📋 Creating ocr_jobs table...');
                await db.query(`
                    CREATE TABLE IF NOT EXISTS ocr_jobs (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        church_id INT NOT NULL,
                        filename VARCHAR(255) NOT NULL,
                        original_filename VARCHAR(255),
                        file_path VARCHAR(500),
                        file_size INT,
                        mime_type VARCHAR(100),
                        status ENUM('pending','processing','complete','error','cancelled') DEFAULT 'pending',
                        record_type ENUM('baptism','marriage','funeral','custom') NOT NULL,
                        language CHAR(2) DEFAULT 'en',
                        confidence_score DECIMAL(5,2),
                        error_regions TEXT,
                        error_message TEXT,
                        ocr_result LONGTEXT,
                        metadata JSON,
                        processing_started_at TIMESTAMP NULL,
                        processing_completed_at TIMESTAMP NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_church_status (church_id, status),
                        INDEX idx_record_type (record_type),
                        INDEX idx_created_at (created_at)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);

                // Create ocr_settings table
                console.log('   ⚙️ Creating ocr_settings table...');
                await db.query(`
                    CREATE TABLE IF NOT EXISTS ocr_settings (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        church_id INT NOT NULL UNIQUE,
                        confidence_threshold DECIMAL(5,2) DEFAULT 0.75,
                        default_language CHAR(2) DEFAULT 'en',
                        record_path_baptism VARCHAR(255) DEFAULT '/records/baptism',
                        record_path_marriage VARCHAR(255) DEFAULT '/records/marriage',
                        record_path_funeral VARCHAR(255) DEFAULT '/records/funeral',
                        preprocessing_enabled BOOLEAN DEFAULT TRUE,
                        auto_contrast BOOLEAN DEFAULT TRUE,
                        auto_rotate BOOLEAN DEFAULT TRUE,
                        noise_reduction BOOLEAN DEFAULT TRUE,
                        max_file_size INT DEFAULT 10485760,
                        allowed_file_types TEXT DEFAULT 'image/jpeg,image/png,image/gif,image/bmp,image/tiff',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);

                // Create ocr_queue table
                console.log('   📥 Creating ocr_queue table...');
                await db.query(`
                    CREATE TABLE IF NOT EXISTS ocr_queue (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        job_id INT NOT NULL,
                        church_id INT NOT NULL,
                        priority INT DEFAULT 5,
                        attempts INT DEFAULT 0,
                        max_attempts INT DEFAULT 3,
                        scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        started_at TIMESTAMP NULL,
                        completed_at TIMESTAMP NULL,
                        error_message TEXT,
                        status ENUM('queued','processing','completed','failed','cancelled') DEFAULT 'queued',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_church_status (church_id, status),
                        INDEX idx_priority (priority, scheduled_at)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);

                // Insert default settings for this church
                console.log('   🔧 Inserting default OCR settings...');
                await db.query(`
                    INSERT IGNORE INTO ocr_settings (church_id, confidence_threshold, default_language) 
                    VALUES (?, 0.75, 'en')
                `, [church.id]);

                console.log(`   ✅ OCR tables created successfully for ${church.name}`);
                
            } catch (error) {
                console.error(`   ❌ Failed to setup tables for ${church.name}:`, error.message);
            }
        }

        // Step 3: Verify table creation
        console.log('\n3️⃣ Verifying table creation...');
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const church of churches) {
            try {
                const db = await getChurchDbConnection(church.database_name);
                
                // Check if all tables exist
                const [tables] = await db.query(`
                    SELECT TABLE_NAME 
                    FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_SCHEMA = ? 
                    AND TABLE_NAME IN ('ocr_jobs', 'ocr_settings', 'ocr_queue')
                `, [church.database_name]);
                
                if (tables.length === 3) {
                    console.log(`   ✅ ${church.name}: All OCR tables present`);
                    successCount++;
                } else {
                    console.log(`   ⚠️  ${church.name}: Missing tables (${tables.length}/3)`);
                    errorCount++;
                }
                
            } catch (error) {
                console.log(`   ❌ ${church.name}: Verification failed`);
                errorCount++;
            }
        }

        // Step 4: Summary
        console.log('\n🎉 OCR Tables Setup Complete!\n');
        console.log('📊 Summary:');
        console.log(`   ✅ Successfully setup: ${successCount} churches`);
        console.log(`   ❌ Failed setup: ${errorCount} churches`);
        console.log(`   📋 Total churches: ${churches.length}`);
        
        if (successCount > 0) {
            console.log('\n📋 Tables created:');
            console.log('   - ocr_jobs: Store OCR job information and results');
            console.log('   - ocr_settings: Per-church OCR configuration');
            console.log('   - ocr_queue: Background processing queue');
            
            console.log('\n🚀 Next steps:');
            console.log('   1. Start your server');
            console.log('   2. Navigate to /admin/church/[ID]/ocr');
            console.log('   3. Upload test images');
            console.log('   4. Monitor OCR processing');
        }
        
        if (errorCount > 0) {
            console.log('\n⚠️  Some churches had setup issues. Check the logs above for details.');
        }

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

// Run the setup
setupOcrTables();
