#!/bin/bash

# Diagnose Build History Issue
# This script checks why build history is not being kept in the web UI

echo "🔍 Diagnosing Build History Issue..."
echo "===================================="

# Check if build.log file exists
echo ""
echo "📁 Checking build log file..."
if [ -f "build.log" ]; then
    echo "✅ build.log exists"
    echo "   Size: $(ls -lh build.log | awk '{print $5}')"
    echo "   Last modified: $(stat -c '%y' build.log 2>/dev/null || stat -f '%Sm' build.log 2>/dev/null)"
    
    # Check if it's valid JSON
    echo ""
    echo "📋 Checking build.log content..."
    if jq . build.log > /dev/null 2>&1; then
        echo "✅ build.log contains valid JSON"
        entry_count=$(jq '. | length' build.log 2>/dev/null)
        echo "   Number of build entries: $entry_count"
        
        if [ "$entry_count" -gt 0 ]; then
            echo ""
            echo "📊 Latest build entry:"
            jq '.[length-1]' build.log 2>/dev/null | head -10
        fi
    else
        echo "❌ build.log contains invalid JSON"
        echo "   First few lines:"
        head -5 build.log
    fi
else
    echo "❌ build.log file does not exist"
fi

# Check if build.meta.json file exists
echo ""
echo "📋 Checking build metadata file..."
if [ -f "build.meta.json" ]; then
    echo "✅ build.meta.json exists"
    echo "   Size: $(ls -lh build.meta.json | awk '{print $5}')"
    
    if jq . build.meta.json > /dev/null 2>&1; then
        echo "✅ build.meta.json contains valid JSON"
        echo "   Content:"
        jq . build.meta.json 2>/dev/null
    else
        echo "❌ build.meta.json contains invalid JSON"
    fi
else
    echo "❌ build.meta.json file does not exist"
fi

# Check if build script exists
echo ""
echo "🔧 Checking build script..."
if [ -f "scripts/build.js" ]; then
    echo "✅ scripts/build.js exists"
    
    # Check if writeBuildLog function is present
    if grep -q "writeBuildLog" scripts/build.js; then
        echo "✅ writeBuildLog function found in build script"
    else
        echo "❌ writeBuildLog function missing from build script"
    fi
    
    # Check if writeBuildMeta function is present
    if grep -q "writeBuildMeta" scripts/build.js; then
        echo "✅ writeBuildMeta function found in build script"
    else
        echo "❌ writeBuildMeta function missing from build script"
    fi
else
    echo "❌ scripts/build.js does not exist"
fi

# Check API endpoints
echo ""
echo "🌐 Testing build API endpoints..."

# Test /api/build/logs endpoint
echo "Testing /api/build/logs endpoint..."
if command -v curl &> /dev/null; then
    response=$(curl -s "http://localhost:3001/api/build/logs" 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "✅ /api/build/logs endpoint accessible"
        if echo "$response" | jq . > /dev/null 2>&1; then
            echo "✅ Returns valid JSON"
            log_count=$(echo "$response" | jq '.logs | length' 2>/dev/null)
            echo "   Number of logs returned: $log_count"
        else
            echo "❌ Returns invalid JSON: $response"
        fi
    else
        echo "❌ /api/build/logs endpoint not accessible"
    fi
else
    echo "⚠️  curl not available, cannot test API endpoints"
fi

# Test /api/build/meta endpoint
echo ""
echo "Testing /api/build/meta endpoint..."
if command -v curl &> /dev/null; then
    response=$(curl -s "http://localhost:3001/api/build/meta" 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "✅ /api/build/meta endpoint accessible"
        if echo "$response" | jq . > /dev/null 2>&1; then
            echo "✅ Returns valid JSON"
            echo "   Response: $response"
        else
            echo "❌ Returns invalid JSON: $response"
        fi
    else
        echo "❌ /api/build/meta endpoint not accessible"
    fi
fi

# Check server logs for build-related errors
echo ""
echo "📊 Checking recent server logs for build errors..."
if [ -f "server.log" ]; then
    echo "Found server.log, checking for build-related errors..."
    grep -i "build\|error" server.log | tail -10
elif [ -f "logs/server.log" ]; then
    echo "Found logs/server.log, checking for build-related errors..."
    grep -i "build\|error" logs/server.log | tail -10
else
    echo "⚠️  No server log file found"
fi

# Check permissions
echo ""
echo "🔒 Checking file permissions..."
echo "Current directory: $(pwd)"
echo "User: $(whoami)"
echo "Permissions on current directory: $(ls -ld . | awk '{print $1}')"

if [ -f "build.log" ]; then
    echo "Permissions on build.log: $(ls -l build.log | awk '{print $1}')"
fi

if [ -f "scripts/build.js" ]; then
    echo "Permissions on scripts/build.js: $(ls -l scripts/build.js | awk '{print $1}')"
fi

echo ""
echo "🎯 Summary & Likely Causes:"
echo "=========================="

# Provide diagnosis
if [ ! -f "build.log" ]; then
    echo "❌ ISSUE: build.log file is missing"
    echo "   → Build history is not being written to disk"
    echo "   → Check if build script is properly calling writeBuildLog()"
elif [ -f "build.log" ] && ! jq . build.log > /dev/null 2>&1; then
    echo "❌ ISSUE: build.log contains invalid JSON"
    echo "   → File might be corrupted or partially written"
    echo "   → Need to fix JSON format or recreate file"
else
    entry_count=$(jq '. | length' build.log 2>/dev/null || echo "0")
    if [ "$entry_count" -eq 0 ]; then
        echo "❌ ISSUE: build.log exists but contains no build entries"
        echo "   → Builds are not being logged properly"
        echo "   → Check writeBuildLog() function execution"
    else
        echo "✅ build.log appears to be working ($entry_count entries)"
        echo "❓ Frontend may not be loading the history correctly"
        echo "   → Check browser console for API errors"
        echo "   → Verify /api/build/logs endpoint response"
    fi
fi

echo ""
echo "🔧 Recommended fixes:"
echo "1. Initialize build.log with empty array if missing"
echo "2. Fix any JSON formatting issues"
echo "3. Ensure writeBuildLog() is called after every build"
echo "4. Check API endpoint permissions and responses"

echo ""
echo "✅ Diagnostic complete!" 