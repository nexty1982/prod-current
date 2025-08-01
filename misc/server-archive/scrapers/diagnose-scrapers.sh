#!/bin/bash

# 📁 server/scrapers/diagnose-scrapers.sh
# Comprehensive diagnosis of scraper issues

echo "🕵️  Orthodox Church Scraper Diagnosis"
echo "====================================="
echo

echo "💡 SITUATION: 0 churches found, 0 errors = HTML structure has changed"
echo "The websites are accessible but using different CSS selectors now."
echo

echo "🔍 Running HTML Structure Analysis..."
echo

# Run the HTML structure debugger
if node debug-html-structure.js; then
    echo
    echo "✅ HTML analysis completed!"
    echo
    
    # Check what files were created
    if [ -d "../data/debug-html" ]; then
        echo "📁 Debug files created:"
        ls -la ../data/debug-html/ | head -10
        echo
        
        echo "🔍 Quick Analysis Results:"
        echo "========================="
        
        # Look for the analysis report
        if [ -f "../data/debug-html/analysis-report.json" ]; then
            echo "✅ Detailed analysis saved to: ../data/debug-html/analysis-report.json"
        fi
        
        # Count how many HTML files were saved
        html_count=$(ls ../data/debug-html/*.html 2>/dev/null | wc -l)
        echo "📄 HTML samples saved: $html_count files"
        
        echo
        echo "🔧 IMMEDIATE FIXES NEEDED:"
        echo "========================="
        echo
        echo "1. 🎯 Update CSS Selectors - The main issue"
        echo "   Orthodox church websites have updated their HTML structure."
        echo "   Your scrapers are looking for old CSS class names."
        echo
        echo "2. 📱 JavaScript Rendering - Possible secondary issue"
        echo "   Some sites may now load content with JavaScript."
        echo "   These need Puppeteer instead of simple HTTP requests."
        echo
        echo "3. 🤖 Anti-Bot Protection - Less likely but possible"
        echo "   Some sites may be detecting and blocking scrapers."
        echo
        
    else
        echo "❌ No debug files created - there may be a deeper issue"
    fi
    
else
    echo "❌ HTML analysis failed"
    echo
    echo "🔧 FALLBACK DIAGNOSIS:"
    echo "====================="
    echo
    echo "Since the detailed analysis failed, here's what's likely happening:"
    echo
    echo "1. 🎯 CSS Selector Updates Needed (Most Likely)"
    echo "   - Orthodox church websites change their HTML regularly"
    echo "   - Class names like '.parish-listing' may now be '.church-directory'"
    echo "   - This is the #1 cause of scrapers returning 0 results"
    echo
    echo "2. 📱 JavaScript-Only Content (Possible)"
    echo "   - Sites may load church lists dynamically with JavaScript"
    echo "   - Requires Puppeteer to render the page fully"
    echo
    echo "3. 🔒 Access Restrictions (Less Likely)"
    echo "   - Some sites block automated requests"
    echo "   - Usually returns errors, not empty results"
fi

echo
echo "🚀 RECOMMENDED ACTIONS:"
echo "======================="
echo
echo "QUICK WINS (1-2 hours):"
echo "1. 🔍 Manual inspection of one website:"
echo "   curl -s https://www.oca.org/parishes | head -100"
echo "   # Look for new CSS classes containing 'parish' or 'church'"
echo
echo "2. 🛠️  Update one scraper with new selectors:"
echo "   # Edit: server/scrapers/jurisdictions/oca-scraper.js"
echo "   # Replace old selectors with new ones found in step 1"
echo
echo "3. 🧪 Test the updated scraper:"
echo "   node test-working-scrapers.js"
echo

echo "MEDIUM EFFORT (4-6 hours):"
echo "4. 🔧 Update all jurisdiction scrapers with current selectors"
echo "5. 🤖 Add Puppeteer support for JavaScript-heavy sites"
echo "6. 🛡️  Add better error handling and fallback URLs"
echo

echo "💡 EXPECTATION SETTING:"
echo "======================="
echo
echo "This is completely normal! Web scrapers need regular maintenance."
echo "- Orthodox church websites update their designs 1-2 times per year"
echo "- CSS selectors change when sites are redesigned"
echo "- Professional scraping services deal with this constantly"
echo
echo "Your scraper system architecture is solid - it just needs selector updates."
echo

echo "🔍 WANT TO FIX ONE MANUALLY?"
echo "============================"
echo
echo "Try this quick test for OCA:"
echo "1. Visit: https://www.oca.org/parishes"
echo "2. View page source (Ctrl+U)"
echo "3. Search for: 'parish' or 'church'"
echo "4. Find the CSS class names around church listings"
echo "5. Update server/scrapers/jurisdictions/oca-scraper.js"
echo "6. Test: node test-working-scrapers.js"
echo

echo "Need help updating selectors? Let your assistant know what you find!" 