/**
 * Script to fix existing manifest files that are stuck in "pending" status
 * Updates them to "completed" if the processed files exist
 */

const fs = require('fs').promises;
const path = require('path');

async function fixManifests() {
  const basePath = path.join(__dirname, 'uploads', 'om_church_46', 'jobs');
  
  try {
    const jobs = await fs.readdir(basePath);
    console.log(`Found ${jobs.length} job directories`);
    
    for (const jobId of jobs) {
      const manifestPath = path.join(basePath, jobId, 'manifest.json');
      
      try {
        const content = await fs.readFile(manifestPath, 'utf8');
        const manifest = JSON.parse(content);
        
        if (manifest.status === 'pending') {
          // Check if processed files exist
          const processedDir = path.join(__dirname, 'uploads', 'om_church_46', 'processed');
          const files = await fs.readdir(processedDir);
          const hasProcessedFiles = files.some(f => f.includes(jobId) || f.includes(manifest.jobId));
          
          if (hasProcessedFiles) {
            manifest.status = 'completed';
            manifest.updatedAt = new Date().toISOString();
            
            const tempPath = manifestPath + '.tmp.' + Date.now();
            await fs.writeFile(tempPath, JSON.stringify(manifest, null, 2), 'utf8');
            await fs.rename(tempPath, manifestPath);
            
            console.log(`✅ Updated job ${jobId} to "completed"`);
          } else {
            console.log(`⏭️  Job ${jobId} has no processed files, keeping as "pending"`);
          }
        } else {
          console.log(`✓ Job ${jobId} already has status: ${manifest.status}`);
        }
      } catch (error) {
        console.error(`❌ Error processing job ${jobId}:`, error.message);
      }
    }
    
    console.log('\n✅ Manifest fix complete!');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixManifests();

