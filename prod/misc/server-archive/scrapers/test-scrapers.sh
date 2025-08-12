#!/bin/bash

# 📁 server/scrapers/test-scrapers.sh
# Linux-compatible script to test and debug the Orthodox Church scrapers

set -e  # Exit on any error

echo "🔍 Testing Orthodox Church Directory Scrapers..."
echo "================================================"
echo

# Change to the scrapers directory
cd "$(dirname "$0")"

echo "📍 Current directory: $(pwd)"
echo "🗄️  Database User: orthodoxapps"
echo

# Function to run Node.js scripts with error handling
run_node_script() {
    local script="$1"
    local description="$2"
    local optional="${3:-false}"
    
    echo "🚀 $description..."
    
    if node "$script" 2>&1; then
        echo "✅ $description completed successfully"
        return 0
    else
        echo "❌ $description failed"
        if [ "$optional" = "false" ]; then
            echo "⚠️  This is a critical failure. Check the error above."
            return 1
        else
            echo "⚠️  This is optional. Continuing..."
            return 0
        fi
    fi
    echo
}

# Function to test database connection
test_database() {
    echo "🗄️  Testing Database Connection..."
    
    # Try the diagnostic script first
    if node debug-scrapers.js 2>&1; then
        echo "✅ Database diagnostics completed"
    else
        echo "❌ Database diagnostics failed"
        echo
        echo "💡 Common fixes:"
        echo "   1. Ensure MySQL is running"
        echo "   2. Check that user 'orthodoxapps' has proper permissions"
        echo "   3. Verify database 'orthodoxmetrics' exists"
        echo "   4. Check .env file has correct credentials"
        return 1
    fi
    echo
}

# Function to run a quick scraper test
test_scrapers() {
    echo "🕷️  Testing Scrapers (Quick Mode)..."
    
    if node test-scraper.js --quick --no-db 2>&1; then
        echo "✅ Scraper test completed successfully"
    else
        echo "❌ Scraper test failed"
        echo
        echo "💡 Common fixes:"
        echo "   1. Install missing dependencies: npm install"
        echo "   2. Check internet connectivity"
        echo "   3. Verify target websites are accessible"
        return 1
    fi
    echo
}

# Function to setup database if needed
setup_database() {
    echo "🔧 Setting up Database Schema..."
    
    if node setup-database.js 2>&1; then
        echo "✅ Database setup completed"
    else
        echo "❌ Database setup failed"
        echo
        echo "💡 Try these steps:"
        echo "   1. Check MySQL server is running"
        echo "   2. Verify database permissions for orthodoxapps user"
        echo "   3. Create database manually: CREATE DATABASE orthodoxmetrics;"
        return 1
    fi
    echo
}

# Function to run full scraper test with database
test_full_scraper() {
    echo "🚀 Running Full Scraper Test..."
    
    if node test-scraper.js --quick 2>&1; then
        echo "✅ Full scraper test completed successfully"
    else
        echo "❌ Full scraper test failed"
        return 1
    fi
    echo
}

# Main execution
main() {
    echo "🎯 Starting comprehensive scraper testing..."
    echo
    
    # Step 1: Test database connection
    if test_database; then
        DATABASE_OK=true
    else
        DATABASE_OK=false
        echo "🔧 Attempting to setup database..."
        if setup_database; then
            DATABASE_OK=true
        else
            DATABASE_OK=false
        fi
    fi
    
    # Step 2: Test scrapers without database
    echo "🔍 Testing scrapers independently..."
    if test_scrapers; then
        SCRAPERS_OK=true
    else
        SCRAPERS_OK=false
    fi
    
    # Step 3: If both work, test full integration
    if [ "$DATABASE_OK" = true ] && [ "$SCRAPERS_OK" = true ]; then
        echo "🔗 Testing full integration..."
        test_full_scraper
        INTEGRATION_OK=$?
    else
        INTEGRATION_OK=false
    fi
    
    # Summary report
    echo
    echo "📊 TEST SUMMARY"
    echo "==============="
    echo "Database Connection: $([ "$DATABASE_OK" = true ] && echo "✅ OK" || echo "❌ FAILED")"
    echo "Scraper Functionality: $([ "$SCRAPERS_OK" = true ] && echo "✅ OK" || echo "❌ FAILED")"
    echo "Full Integration: $([ "$INTEGRATION_OK" = true ] && echo "✅ OK" || echo "❌ FAILED")"
    echo
    
    if [ "$DATABASE_OK" = true ] && [ "$SCRAPERS_OK" = true ] && [ "$INTEGRATION_OK" = true ]; then
        echo "🎉 All tests passed! Your scraper system is working correctly."
        echo
        echo "🚀 To run the scrapers manually:"
        echo "   node cli.js --no-validate-urls --concurrent 2"
        echo "   node test-scraper.js --quick"
    else
        echo "⚠️  Some tests failed. Check the errors above for guidance."
        echo
        echo "🔧 Quick fixes to try:"
        echo "   1. Restart MySQL: sudo systemctl restart mysql"
        echo "   2. Install dependencies: npm install"
        echo "   3. Check .env file exists with correct credentials"
        echo "   4. Grant database permissions:"
        echo "      mysql -u root -p"
        echo "      GRANT ALL PRIVILEGES ON orthodoxmetrics.* TO 'orthodoxapps'@'localhost';"
        echo "      FLUSH PRIVILEGES;"
    fi
}

# Run with specific test if provided
case "${1:-}" in
    "db"|"database")
        test_database
        ;;
    "scraper"|"scrapers")
        test_scrapers
        ;;
    "setup")
        setup_database
        ;;
    "full")
        test_full_scraper
        ;;
    "")
        main
        ;;
    *)
        echo "Usage: $0 [db|scrapers|setup|full]"
        echo
        echo "Options:"
        echo "  db       - Test database connection only"
        echo "  scrapers - Test scraper functionality only"
        echo "  setup    - Setup database schema"
        echo "  full     - Run full integration test"
        echo "  (none)   - Run all tests"
        ;;
esac 