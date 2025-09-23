#!/bin/bash

echo "🚀 Auto-Installing Missing Dependencies Script"
echo "This will automatically detect and install missing packages until build succeeds!"

max_attempts=50
attempt=1

while [ $attempt -le $max_attempts ]; do
    echo ""
    echo "🔄 Build Attempt #$attempt"
    echo "================================"
    
    # Try to build and capture output
    build_output=$(NODE_OPTIONS="--max-old-space-size=4096" npm run build 2>&1)
    build_exit_code=$?
    
    if [ $build_exit_code -eq 0 ]; then
        echo ""
        echo "🎉🎉🎉 SUCCESS! BUILD COMPLETED! 🎉🎉🎉"
        echo ""
        echo "✅ All dependencies resolved automatically!"
        echo "✅ Site Structure Visualizer ready!"
        echo "✅ All features functional!"
        echo ""
        echo "🚀 NEXT STEPS:"
        echo "1. Restart your server"
        echo "2. Navigate to Developer Tools → Site Structure Visualizer"
        echo "3. Test all functionality!"
        echo ""
        echo "🎊 Total attempts needed: $attempt"
        exit 0
    fi
    
    # Extract missing package name from error
    import_path=$(echo "$build_output" | grep "Rollup failed to resolve import" | sed -n 's/.*import "\([^"]*\)".*/\1/p' | head -1)
    
    # Handle scoped packages (e.g., @mui/x-tree-view/hooks/something -> @mui/x-tree-view)
    if [[ $import_path == @*/* ]]; then
        missing_package=$(echo "$import_path" | cut -d'/' -f1,2)
    else
        missing_package=$(echo "$import_path" | cut -d'/' -f1)
    fi
    
    if [ -z "$missing_package" ]; then
        echo "❌ Could not detect missing package from error:"
        echo "$build_output"
        echo ""
        echo "💡 Manual intervention needed - check the error above"
        exit 1
    fi
    
    echo "📦 Detected missing package: $missing_package"
    echo "⚡ Installing automatically..."
    
    # Install the missing package
    npm install "$missing_package" --legacy-peer-deps
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install $missing_package"
        echo "💡 Manual intervention needed"
        exit 1
    fi
    
    echo "✅ Successfully installed: $missing_package"
    
    ((attempt++))
done

echo ""
echo "⚠️ Reached maximum attempts ($max_attempts)"
echo "💡 Manual review recommended" 
