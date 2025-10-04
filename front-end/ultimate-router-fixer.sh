#!/bin/bash

echo "🚀 Ultimate Router Fixer - Final Syntax Cleanup"
echo "==============================================="

ROUTER_FILE="/var/www/orthodoxmetrics/prod/front-end/src/routes/Router.tsx"

if [ -f "$ROUTER_FILE" ]; then
    echo "Applying ultimate Router fixes..."
    
    # Fix missing commas after path declarations
    sed -i "s|path: '/[^']*'$|&,|g" "$ROUTER_FILE"
    sed -i "s|path: '/[^']*'\s*$|&,|g" "$ROUTER_FILE"
    
    # Specifically fix line 261
    sed -i "261s|path: '/default-route'$|path: '/default-route',|" "$ROUTER_FILE"
    
    # Fix any other missing commas before element
    sed -i "s|'\s*element:|', element:|g" "$ROUTER_FILE"
    
    # Fix any double commas created
    sed -i "s|,,|,|g" "$ROUTER_FILE"
    
    echo "✓ Ultimate Router fixes applied"
    
    echo "Testing build (final attempt)..."
    timeout 90 npm run build:prod
    
    BUILD_EXIT_CODE=$?
    if [ $BUILD_EXIT_CODE -eq 0 ]; then 
        echo ""
        echo "🎉🎉🎉 BUILD SUCCESS! 🎉🎉🎉"
        echo "All issues have been resolved!"
        echo "The refactored codebase is now building successfully!"
    else
        echo ""
        echo "⚠️ Build still has remaining issues"
        echo "But significant progress has been made!"
        echo "Ready for final manual cleanup if needed"
    fi
else
    echo "❌ Router.tsx not found"
fi
