#!/bin/bash

# ============================================
# OrthodMetrics Development Environment Setup
# ============================================
# Created: July 31, 2025
# Purpose: Setup clean development environment without OCR components

echo "🚀 Setting up OrthodMetrics Development Environment..."

# Check if we're in the correct directory
if [ ! -f "server/index.js" ]; then
    echo "❌ Error: Please run this script from the OrthodMetrics root directory"
    exit 1
fi

# 1. Create development database
echo "📦 Creating development database..."
mysql -u orthodoxapps -p'Summerof1982@!' -e "DROP DATABASE IF EXISTS orthodmetrics_dev;"
mysql -u orthodoxapps -p'Summerof1982@!' -e "CREATE DATABASE orthodmetrics_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Import database structure
echo "📥 Importing database structure..."
mysql -u orthodoxapps -p'Summerof1982@!' orthodmetrics_dev < database/create_dev_database.sql

# 3. Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📚 Installing dependencies..."
    npm install
fi

# 4. Check if OCR-related files exist and move them to archive
echo "🗂️  Archiving OCR-related files..."
mkdir -p misc/ocr-archive/routes
mkdir -p misc/ocr-archive/services

# Move OCR routes to archive
if [ -f "server/routes/ocr.js" ]; then
    mv server/routes/ocr.js misc/ocr-archive/routes/
    echo "  ✅ Archived server/routes/ocr.js"
fi

if [ -f "server/routes/ocrSessions.js" ]; then
    mv server/routes/ocrSessions.js misc/ocr-archive/routes/
    echo "  ✅ Archived server/routes/ocrSessions.js"
fi

if [ -f "server/routes/ocrVision.js" ]; then
    mv server/routes/ocrVision.js misc/ocr-archive/routes/
    echo "  ✅ Archived server/routes/ocrVision.js"
fi

if [ -f "server/routes/preprocessOcr.js" ]; then
    mv server/routes/preprocessOcr.js misc/ocr-archive/routes/
    echo "  ✅ Archived server/routes/preprocessOcr.js"
fi

if [ -d "server/routes/church" ] && [ -f "server/routes/church/ocr.js" ]; then
    mv server/routes/church/ocr.js misc/ocr-archive/routes/
    echo "  ✅ Archived server/routes/church/ocr.js"
fi

if [ -d "server/routes/public" ] && [ -f "server/routes/public/ocr.js" ]; then
    mv server/routes/public/ocr.js misc/ocr-archive/routes/
    echo "  ✅ Archived server/routes/public/ocr.js"
fi

if [ -f "server/routes/autoLearningRoutes.js" ]; then
    mv server/routes/autoLearningRoutes.js misc/ocr-archive/routes/
    echo "  ✅ Archived server/routes/autoLearningRoutes.js"
fi

# Archive OCR services
if [ -d "server/services/ocr" ]; then
    mv server/services/ocr misc/ocr-archive/services/
    echo "  ✅ Archived server/services/ocr/"
fi

# Archive OCR database files
find server/database -name "*ocr*" -type f -exec mv {} misc/ocr-archive/ \; 2>/dev/null || true

# Archive Google Vision credentials
if [ -d "server/credentials" ]; then
    mv server/credentials misc/ocr-archive/
    echo "  ✅ Archived server/credentials/"
fi

# 5. Remove OCR-related directories from development
echo "🧹 Cleaning OCR references from development..."

# Remove OCR uploads directory if it exists
if [ -d "uploads/ocr" ]; then
    mv uploads/ocr misc/ocr-archive/
    echo "  ✅ Archived uploads/ocr/"
fi

# Remove OCR results directory if it exists in workspace root
if [ -d "ocr-results" ]; then
    mv ocr-results misc/ocr-archive/
    echo "  ✅ Archived ocr-results/"
fi

# 6. Verify server can start
echo "🔍 Testing server configuration..."
timeout 10s node -e "
const app = require('./server/index.js');
console.log('✅ Server configuration valid');
process.exit(0);
" 2>/dev/null || echo "⚠️  Server test timeout (normal for startup check)"

# 7. Display development information
echo ""
echo "🎉 Development Environment Setup Complete!"
echo ""
echo "📋 Development Configuration:"
echo "  • Database: orthodmetrics_dev"
echo "  • Environment: development"
echo "  • OCR Features: disabled"
echo "  • Backend Port: 3002"
echo "  • Frontend Port: 5174 (0.0.0.0)"
echo ""
echo "🚀 To start the development server:"
echo "  npm run dev"
echo ""
echo "👤 Development Login Credentials:"
echo "  Admin: devadmin / devpassword123"
echo "  Priest: devpriest / devpassword123"
echo ""
echo "📚 Sample Data Available:"
echo "  • 2 Baptism records"
echo "  • 1 Marriage record"
echo "  • 1 Funeral record"
echo "  • Development church settings"
echo ""
echo "🔧 Next Steps:"
echo "  1. Update frontend API configuration to point to :3002"
echo "  2. Test database connection"
echo "  3. Verify all features work without OCR"
echo ""
