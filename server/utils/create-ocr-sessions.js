// server/database/create-ocr-sessions.js
const { promisePool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function createOCRSessionsTable() {
  try {
    console.log('Creating OCR sessions table...');
    
    const sql = `
      CREATE TABLE IF NOT EXISTS ocr_sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          session_id VARCHAR(36) NOT NULL UNIQUE,
          pin VARCHAR(6) NOT NULL,
          church_id INT DEFAULT 1,
          record_type ENUM('baptism', 'marriage', 'funeral') DEFAULT 'baptism',
          created_by INT,
          verified BOOLEAN DEFAULT FALSE,
          verified_at TIMESTAMP NULL,
          used BOOLEAN DEFAULT FALSE,
          used_at TIMESTAMP NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_email VARCHAR(255),
          user_phone VARCHAR(20),
          
          INDEX idx_session_id (session_id),
          INDEX idx_expires_at (expires_at),
          INDEX idx_created_by (created_by),
          INDEX idx_church_id (church_id)
      );
    `;

    await promisePool.query(sql);
    console.log('✅ OCR sessions table created successfully');

  } catch (error) {
    console.error('❌ Error creating OCR sessions table:', error);
  } finally {
    process.exit(0);
  }
}

createOCRSessionsTable();
