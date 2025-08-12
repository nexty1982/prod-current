// Test OCR database connection after fixes
const { getOcrDbPool } = require('./utils/dbConnections');

async function testOcrJobs() {
  console.log('🔍 Testing OCR jobs query...');
  
  try {
    const ocrDb = getOcrDbPool();
    
    // Test basic connection
    await ocrDb.query('SELECT 1 as test');
    console.log('✅ OCR database connection OK');
    
    // Test OCR jobs table
    const [jobs] = await ocrDb.query(`
      SELECT COUNT(*) as total FROM ocr_jobs WHERE church_id = ?
    `, [14]);
    
    console.log(`✅ Found ${jobs[0].total} OCR jobs for church 14`);
    
    // Test recent jobs
    const [recentJobs] = await ocrDb.query(`
      SELECT id, filename, status, created_at 
      FROM ocr_jobs 
      WHERE church_id = ? 
      ORDER BY created_at DESC 
      LIMIT 5
    `, [14]);
    
    console.log('📋 Recent OCR jobs:', recentJobs);
    
  } catch (error) {
    console.error('❌ OCR database test failed:', error.message);
  }
}

testOcrJobs();
