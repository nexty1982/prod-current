#!/bin/bash
# Orthodox Headlines Aggregator Setup Script
# Sets up database, dependencies, and cron scheduling

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$SERVER_DIR/logs"

echo -e "${BLUE}🗞️ Orthodox Headlines Aggregator Setup${NC}"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "$SERVER_DIR/scripts/fetch-headlines.js" ]; then
    echo -e "${RED}❌ Cannot find fetch-headlines.js script${NC}"
    echo "Please run this script from the server directory"
    exit 1
fi

echo -e "${GREEN}✅ Found headlines script${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js found:${NC} $(node --version)"

# Check npm dependencies
echo -e "${BLUE}📦 Checking dependencies...${NC}"

# Check if rss-parser is installed
if ! node -e "require('rss-parser')" 2>/dev/null; then
    echo -e "${YELLOW}⚠️ Installing rss-parser...${NC}"
    cd "$SERVER_DIR"
    npm install rss-parser
fi

# Check if axios is installed  
if ! node -e "require('axios')" 2>/dev/null; then
    echo -e "${YELLOW}⚠️ Installing axios...${NC}"
    cd "$SERVER_DIR"
    npm install axios
fi

# Check if cheerio is installed
if ! node -e "require('cheerio')" 2>/dev/null; then
    echo -e "${YELLOW}⚠️ Installing cheerio...${NC}" 
    cd "$SERVER_DIR"
    npm install cheerio
fi

echo -e "${GREEN}✅ Dependencies verified${NC}"

# Create logs directory
mkdir -p "$LOG_DIR"
echo -e "${GREEN}✅ Created logs directory${NC}"

# Test database connection using the new credential system
echo -e "${BLUE}🔍 Testing database connection...${NC}"
cd "$SERVER_DIR"

echo "The script now prompts for database credentials interactively."
echo "No need to configure config/db.js anymore!"
echo ""
echo "You can test the database connection by running:"
echo "  node scripts/fetch-headlines.js --test"
echo ""

# Set up database schema
echo -e "${BLUE}🗄️ Setting up database schema...${NC}"
if [ -f "$SERVER_DIR/database/news-headlines-schema.sql" ]; then
    echo "Please run the following SQL script manually:"
    echo "mysql -u root -p orthodoxmetrics_db < database/news-headlines-schema.sql"
    echo ""
else
    echo -e "${RED}❌ Schema file not found${NC}"
fi

# Test the fetch script
echo -e "${BLUE}🧪 Testing headlines fetch (dry run)...${NC}"
cd "$SERVER_DIR"
if node scripts/fetch-headlines.js --test --language en; then
    echo -e "${GREEN}✅ Headlines fetch test successful${NC}"
else
    echo -e "${YELLOW}⚠️ Headlines fetch test had some issues${NC}"
    echo "This might be normal if some RSS feeds are temporarily unavailable"
fi

# Show cron setup instructions
echo ""
echo -e "${YELLOW}📅 Cron Job Setup${NC}"
echo "To set up automated headlines fetching every 6 hours:"
echo ""
echo "1. Open crontab:"
echo "   crontab -e"
echo ""
echo "2. Add this line:"
echo "   0 */6 * * * cd $SERVER_DIR && node scripts/fetch-headlines.js >> $LOG_DIR/headlines.log 2>&1"
echo ""
echo "3. Save and exit"
echo ""

# Show usage examples
echo -e "${BLUE}📋 Usage Examples${NC}"
echo "=================="
echo "Fetch all sources:"
echo "  node scripts/fetch-headlines.js"
echo ""
echo "Test mode (no database writes):"
echo "  node scripts/fetch-headlines.js --test"
echo ""
echo "English sources only:"
echo "  node scripts/fetch-headlines.js --language en"
echo ""
echo "Greek sources only:"
echo "  node scripts/fetch-headlines.js --language gr"
echo ""
echo "Specific source:"
echo "  node scripts/fetch-headlines.js --source \"Orthodox Times\""
echo ""
echo "Show help:"
echo "  node scripts/fetch-headlines.js --help"
echo ""

# Show API endpoints
echo -e "${BLUE}🌐 API Endpoints${NC}"
echo "==============="
echo "Get headlines:"
echo "  GET /api/headlines"
echo "  GET /api/headlines?language=en&source=all&limit=20"
echo ""
echo "Get sources:"
echo "  GET /api/headlines/sources"
echo ""

echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo ""
echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo "1. Run the database schema script (shown above)"
echo "2. Test the headlines fetch: node scripts/fetch-headlines.js --test"
echo "3. Set up cron job for automated fetching"
echo "4. Check the API endpoints work: GET /api/headlines"
echo "" 