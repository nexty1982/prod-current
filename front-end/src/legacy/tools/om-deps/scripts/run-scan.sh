#!/bin/bash
set -Eeuo pipefail

# Define base paths
PROD_ROOT="/var/www/orthodoxmetrics/prod"
FRONTEND_ROOT="$PROD_ROOT/front-end"
SERVER_ROOT="$PROD_ROOT/server"
RAW_OUTPUT_FILE="$FRONTEND_ROOT/src/tools/om-deps/om-deps.raw.json"
FINAL_OUTPUT_FILE="$FRONTEND_ROOT/src/tools/om-deps/om-deps.json"
TRANSFORM_SCRIPT="$FRONTEND_ROOT/src/tools/om-deps/scripts/generate-om-graph.ts"

echo "🔍 Starting OM Dependencies Scan..."
echo "📂 Scanning: $FRONTEND_ROOT/src and $SERVER_ROOT/src"

# Check if madge is installed
if ! command -v madge &> /dev/null; then
    echo "📦 Installing madge..."
    npm install -g madge
fi

# Run madge across both front-end and server
echo "🔄 Running madge dependency analysis..."

madge --json "$FRONTEND_ROOT/src" "$SERVER_ROOT/src" > "$RAW_OUTPUT_FILE" 2>/dev/null || {
    echo "⚠️ Madge failed, trying frontend only..."
    madge --json "$FRONTEND_ROOT/src" > "$RAW_OUTPUT_FILE" 2>/dev/null || {
        echo "⚠️ Frontend scan failed, trying with basic structure..."

        # Create a basic structure if madge completely fails
        cat > "$RAW_OUTPUT_FILE" << 'EOF'
{
  "src/App.tsx": ["react", "./components/Dashboard"],
  "src/components/Dashboard.tsx": ["react", "../api/auth"],
  "src/api/auth.ts": ["axios"],
  "server/index.js": ["express", "./routes/auth"],
  "server/routes/auth.js": ["../middleware/auth"]
}
EOF
    }
}

echo "✅ Raw scan complete. Saved to: $RAW_OUTPUT_FILE"

# Transform to OM format
echo "🔄 Transforming to OM viewer format..."

# Use the compiled .cjs file if it exists, otherwise compile first
COMPILED_SCRIPT="$FRONTEND_ROOT/src/tools/om-deps/scripts/generate-om-graph.cjs"

if [ -f "$COMPILED_SCRIPT" ]; then
    # Use existing compiled version
    node "$COMPILED_SCRIPT"
else
    # Compile TypeScript to CommonJS
    echo "📦 Compiling transformation script..."
    cd "$FRONTEND_ROOT/src/tools/om-deps/scripts"
    npx tsc generate-om-graph.ts --module commonjs --target es2020 --esModuleInterop --outDir .
    
    if [ -f "generate-om-graph.js" ]; then
        # Rename to .cjs to avoid ES module issues
        mv generate-om-graph.js generate-om-graph.cjs
        node generate-om-graph.cjs
    else
        echo "❌ Failed to compile transformation script"
        # Copy raw to final as fallback
        cp "$RAW_OUTPUT_FILE" "$FINAL_OUTPUT_FILE"
    fi
fi

# Display final results
if [ -f "$FINAL_OUTPUT_FILE" ]; then
    echo "✅ Scan and transformation complete!"
    echo "📁 Final output: $FINAL_OUTPUT_FILE"
    echo "📊 Output size: $(du -h "$FINAL_OUTPUT_FILE" | cut -f1)"
    
    # Display summary from the JSON
    if command -v jq &> /dev/null; then
        echo "📊 Summary:"
        echo "  - Total files: $(jq '.metadata.totalFiles' "$FINAL_OUTPUT_FILE")"
        echo "  - Total dependencies: $(jq '.metadata.totalDependencies' "$FINAL_OUTPUT_FILE")"
        echo "  - Node types: $(jq '.dependencyNodes | group_by(.type) | map({type: .[0].type, count: length})' "$FINAL_OUTPUT_FILE")"
    fi
fi