#!/usr/bin/env node

// Script to generate text files for existing OCR results
// This will create .txt files in ocr-results/ directory for completed jobs

const { getChurchDbConnection } = require('./utils/dbSwitcher');
const { promisePool } = require('./config/db');
const fs = require('fs').promises;
const path = require('path');

async function generateTextFiles() {
    console.log('📝 Generating OCR text files for existing results...\n');

    try {
        // Get all active churches
        const [churches] = await promisePool.query(
            'SELECT id, name, database_name FROM churches WHERE is_active = 1'
        );

        let totalGenerated = 0;

        for (const church of churches) {
            console.log(`🏛️  Processing church: ${church.name}`);
            
            try {
                const db = await getChurchDbConnection(church.database_name);
                
                // Get completed OCR jobs with results
                const [completedJobs] = await db.query(`
                    SELECT id, church_id, filename, original_filename, file_path, 
                           record_type, language, mime_type, confidence_score,
                           ocr_result, error_regions, created_at, updated_at
                    FROM ocr_jobs 
                    WHERE status = 'complete' 
                      AND ocr_result IS NOT NULL 
                      AND ocr_result != ''
                    ORDER BY created_at DESC
                `);

                if (completedJobs.length === 0) {
                    console.log(`   ⚠️  No completed jobs with results found`);
                    continue;
                }

                console.log(`   📄 Found ${completedJobs.length} completed jobs with results`);

                // Create result directory structure
                const baseDir = path.join(__dirname, 'ocr-results');
                const churchDir = path.join(baseDir, `church_${church.id}`);
                
                await fs.mkdir(baseDir, { recursive: true });
                await fs.mkdir(churchDir, { recursive: true });

                // Generate text files for each job
                for (const job of completedJobs) {
                    try {
                        const textFile = await generateTextFile(churchDir, job);
                        if (textFile) {
                            console.log(`   ✅ Generated: ${path.basename(textFile)}`);
                            totalGenerated++;
                        }
                    } catch (error) {
                        console.error(`   ❌ Failed to generate file for job ${job.id}:`, error.message);
                    }
                }

            } catch (error) {
                console.error(`❌ Error processing church ${church.name}:`, error.message);
            }
        }

        console.log(`\n🎉 Generation complete!`);
        console.log(`📊 Total text files generated: ${totalGenerated}`);
        console.log(`📁 Files saved to: ${path.join(__dirname, 'ocr-results')}`);

    } catch (error) {
        console.error('❌ Error in text file generation:', error);
        process.exit(1);
    }
}

async function generateTextFile(churchDir, job) {
    try {
        // Generate result filename based on original filename
        const originalName = path.parse(job.original_filename).name;
        const createdDate = new Date(job.created_at).toISOString().replace(/[:.]/g, '-');
        const resultFileName = `${originalName}_result_job${job.id}_${createdDate}.txt`;
        const resultFilePath = path.join(churchDir, resultFileName);
        
        // Prepare result content
        const resultContent = formatOcrResult(job);
        
        // Save the text file
        await fs.writeFile(resultFilePath, resultContent, 'utf8');
        
        return resultFilePath;
        
    } catch (error) {
        console.error('Failed to generate text file:', error);
        return null;
    }
}

function formatOcrResult(job) {
    const separator = '='.repeat(60);
    const timestamp = new Date().toISOString();
    
    let content = `${separator}\n`;
    content += `OCR RESULT\n`;
    content += `${separator}\n`;
    content += `Original File: ${job.original_filename}\n`;
    content += `Processed File: ${job.filename}\n`;
    content += `Language: ${job.language || 'en'}\n`;
    content += `Record Type: ${job.record_type || 'unknown'}\n`;
    content += `Confidence Score: ${job.confidence_score ? (job.confidence_score * 100).toFixed(1) + '%' : 'N/A'}\n`;
    content += `Processing Date: ${job.updated_at}\n`;
    content += `Job ID: ${job.id}\n`;
    content += `File Generated: ${timestamp}\n`;
    content += `${separator}\n\n`;
    
    if (job.ocr_result && job.ocr_result.trim()) {
        content += `EXTRACTED TEXT:\n`;
        content += `${'-'.repeat(40)}\n`;
        content += `${job.ocr_result}\n`;
        content += `${'-'.repeat(40)}\n\n`;
    } else {
        content += `NO TEXT EXTRACTED\n\n`;
    }
    
    if (job.error_regions) {
        try {
            const errorRegions = JSON.parse(job.error_regions);
            if (errorRegions && errorRegions.length > 0) {
                content += `DETECTED ISSUES:\n`;
                content += `${'-'.repeat(40)}\n`;
                errorRegions.forEach((region, index) => {
                    content += `${index + 1}. ${region.reason}: "${region.text}"\n`;
                });
                content += `${'-'.repeat(40)}\n\n`;
            }
        } catch (parseError) {
            console.warn('Failed to parse error regions:', parseError);
        }
    }
    
    content += `${separator}\n`;
    content += `End of OCR Result\n`;
    content += `${separator}\n`;
    
    return content;
}

// Run the script
generateTextFiles().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
});
