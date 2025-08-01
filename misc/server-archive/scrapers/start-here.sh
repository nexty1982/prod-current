#!/bin/bash

# 📁 server/scrapers/start-here.sh
# Getting started script for Orthodox Church scrapers

echo "🏛️  Orthodox Church Directory Scrapers - Getting Started"
echo "========================================================"
echo

# Make scripts executable
chmod +x *.sh 2>/dev/null || true

echo "✅ Updated: All database configurations now use orthodoxapps user"
echo "✅ Created: Linux-compatible diagnostic and test scripts"
echo

echo "🚀 NEXT STEPS:"
echo

echo "1. 🔧 Fix Database Permissions (if needed):"
echo "   ./fix-database-permissions.sh"
echo

echo "2. 🧪 Test Your Scrapers:"
echo "   ./test-scrapers.sh"
echo

echo "3. 🕷️  Run Scrapers (if tests pass):"
echo "   cd .. && node scrapers/cli.js --no-validate-urls --concurrent 2"
echo

echo "📚 SCRIPT REFERENCE:"
echo
echo "• fix-database-permissions.sh - Fixes the 'Access denied' database error"
echo "• test-scrapers.sh           - Comprehensive testing of all components"
echo "• test-scrapers.sh db        - Test database connection only"
echo "• test-scrapers.sh scrapers  - Test scraper functionality only"
echo "• test-scrapers.sh setup     - Setup database schema"
echo

echo "🔍 TROUBLESHOOTING:"
echo
echo "Main issue from your logs: Database connection failed for orthodoxapps user"
echo "👉 Run: ./fix-database-permissions.sh (this should solve it)"
echo

echo "If scrapers still don't work after fixing database:"
echo "1. Check internet connectivity to Orthodox church websites"
echo "2. Install missing Node.js packages: npm install"
echo "3. Run diagnostic: node debug-scrapers.js"
echo

echo "📊 Your scraper system includes:"
echo "• 7 Orthodox jurisdictions (OCA, GOARCH, Antiochian, etc.)"
echo "• Intelligent data validation and duplicate detection"
echo "• Database storage with comprehensive schema"
echo "• URL validation and data quality scoring"
echo "• RESTful API for accessing scraped data"
echo

echo "Ready to start? Run: ./fix-database-permissions.sh" 