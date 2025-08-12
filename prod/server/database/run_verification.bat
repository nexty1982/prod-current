@echo off
echo 🔍 Running OCR Migration Verification...
echo =====================================
cd /d "z:\orthodoxmetrics\prod\server\database"
node verify_ocr_migration.js
pause
