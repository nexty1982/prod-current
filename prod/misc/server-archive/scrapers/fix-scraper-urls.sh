#!/bin/bash

# 📁 server/scrapers/fix-scraper-urls.sh
# Test and fix Orthodox church website URLs for scrapers

echo "🔍 Testing Orthodox Church Website URLs..."
echo "=========================================="
echo

# Function to test URL accessibility
test_url() {
    local url="$1"
    local name="$2"
    
    printf "%-50s" "$name:"
    
    # Test with curl (more reliable than the scraper's axios)
    if curl -s -L --max-time 10 --head "$url" > /dev/null 2>&1; then
        echo "✅ WORKING"
        return 0
    else
        echo "❌ FAILED"
        return 1
    fi
}

echo "🏛️  Testing Current Scraper URLs..."
echo

# OCA URLs
echo "📍 Orthodox Church in America (OCA):"
test_url "https://www.oca.org" "OCA Main Site"
test_url "https://www.oca.org/parishes/search" "OCA Parish Search"
test_url "https://www.oca.org/parishes/directory" "OCA Parish Directory"
echo

# GOARCH URLs  
echo "📍 Greek Orthodox Archdiocese (GOARCH):"
test_url "https://www.goarch.org" "GOARCH Main Site"
test_url "https://www.goarch.org/chapel/locator" "GOARCH Chapel Locator"
test_url "https://www.goarch.org/parishes" "GOARCH Parishes"
echo

# Antiochian URLs
echo "📍 Antiochian Orthodox:"
test_url "https://www.antiochian.org" "Antiochian Main Site"
test_url "https://www.antiochian.org/parish-directory" "Antiochian Directory"
echo

# ROCOR URLs
echo "📍 Russian Orthodox Church Outside Russia (ROCOR):"
test_url "https://www.synod.com" "ROCOR Main Site"
test_url "https://www.synod.com/parishes" "ROCOR Parishes"
test_url "https://www.synod.com/parish-directory" "ROCOR Directory"
echo

# Serbian URLs
echo "📍 Serbian Orthodox Church:"
test_url "https://www.serbianorthodoxchurch.org" "Serbian Main Site"
test_url "https://www.serbianorthodoxchurch.org/parishes" "Serbian Parishes"
test_url "https://www.eastwestorthodox.org/serbian-churches" "Serbian Alt Source"
echo

# Romanian URLs
echo "📍 Romanian Orthodox Episcopate:"
test_url "https://www.roea.org" "Romanian Main Site"
test_url "https://www.roea.org/directory" "Romanian Directory"
echo

# Bulgarian URLs
echo "📍 Bulgarian Orthodox Church:"
test_url "https://www.bgorthodox.com" "Bulgarian Main Site"
test_url "https://www.bulgarianorthodoxchurch.org" "Bulgarian Alt Site"
test_url "https://www.eastwestorthodox.org/bulgarian-churches" "Bulgarian Alt Source"
echo

echo "🔧 RECOMMENDATIONS:"
echo "=================="
echo

echo "🚨 CRITICAL ISSUES TO FIX:"
echo

echo "1. 📍 OCA (Orthodox Church in America):"
echo "   Current URL issue: Puppeteer timeout on parish search"
echo "   ✅ Fix: Update to use direct API or simpler HTML page"
echo "   📝 Try: https://www.oca.org/parishes (simpler endpoint)"
echo

echo "2. 📍 GOARCH (Greek Orthodox Archdiocese):"
echo "   Current issue: 403 Forbidden (blocking scrapers)"
echo "   ✅ Fix: Need different approach - they're actively blocking bots"
echo "   📝 Alternative: Manual data or different user agent"
echo

echo "3. 📍 ROCOR (Russian Orthodox):"
echo "   Current issue: 404 errors on parish URLs"
echo "   ✅ Fix: URLs have changed - need to find new directory URLs"
echo "   📝 Check: https://synod.com/directory or https://synod.com/churches"
echo

echo "4. 📍 Serbian Orthodox:"
echo "   Current issue: DNS resolution failure"
echo "   ✅ Fix: Domain may have changed or be down"
echo "   📝 Check: https://www.serborth.org or https://serbianorthodox.org"
echo

echo "5. 📍 Romanian Orthodox:"
echo "   Current issue: 404 on directory pages"
echo "   ✅ Fix: Directory URLs have changed"
echo "   📝 Check: https://roea.org/parishes or updated URLs"
echo

echo "6. 📍 Bulgarian Orthodox:"
echo "   Current issue: DNS and SSL certificate problems"
echo "   ✅ Fix: Multiple domain issues"
echo "   📝 Alternative: Use different Bulgarian Orthodox source"
echo

echo
echo "🛠️  QUICK FIXES:"
echo "==============="
echo

echo "Run these commands to apply URL fixes:"
echo

cat << 'EOF'
# 1. Test alternative URLs manually:
curl -I https://www.oca.org/parishes
curl -I https://synod.com/directory  
curl -I https://www.serborth.org
curl -I https://roea.org/parishes

# 2. Update scraper URLs in the jurisdiction files:
# Edit: server/scrapers/jurisdictions/oca-scraper.js
# Edit: server/scrapers/jurisdictions/goarch-scraper.js
# Edit: server/scrapers/jurisdictions/rocor-scraper.js
# etc.

# 3. Add better error handling and fallback URLs

# 4. Use different user agents to avoid blocking:
#    Mozilla/5.0 (compatible; ChurchDirectoryBot/1.0)

# 5. Add delays between requests to be more respectful
EOF

echo
echo "🔍 NEXT STEPS:"
echo "============="
echo
echo "1. 🧪 Test working URLs manually:"
echo "   ./test-scrapers.sh scrapers"
echo
echo "2. 🔧 Update scraper configuration with working URLs"
echo "3. 🕷️  Add fallback data sources for blocked sites"
echo "4. 🤖 Implement better bot detection avoidance"
echo
echo "💡 NOTE: Many Orthodox church websites have updated their URLs"
echo "    or implemented bot protection since the scrapers were written."
echo "    This is normal and requires periodic URL maintenance." 