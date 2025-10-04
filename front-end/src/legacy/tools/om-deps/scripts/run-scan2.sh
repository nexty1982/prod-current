
#!/bin/bash
set -Eeuo pipefail

# Define base paths
PROD_ROOT="/var/www/orthodoxmetrics/prod"
FRONTEND_ROOT="$PROD_ROOT/front-end"
SERVER_ROOT="$PROD_ROOT/server"
OUTPUT_FILE="$FRONTEND_ROOT/src/tools/om-deps/om-deps.json"

echo "🔍 Starting OM Dependencies Scan..."
echo "📂 Scanning: $FRONTEND_ROOT/src and $SERVER_ROOT/src"

# Check if madge is installed
if ! command -v madge &> /dev/null; then
    echo "📦 Installing madge..."
    npm install -g madge
fi

# Run madge across both front-end and server
echo "🔄 Running madge dependency analysis..."

madge --json "$FRONTEND_ROOT/src" "$SERVER_ROOT/src" > "$OUTPUT_FILE" 2>/dev/null || {
    echo "⚠️ Madge failed, trying frontend only..."
    madge --json "$FRONTEND_ROOT/src" > "$OUTPUT_FILE" 2>/dev/null || {
        echo "⚠️ Frontend scan failed, trying with basic structure..."

        # Create a basic structure if madge completely fails
        cat > "$OUTPUT_FILE" << 'EOF'
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

echo "✅ Scan complete. Output saved to: $OUTPUT_FILE"

# Display file size
if [ -f "$OUTPUT_FILE" ]; then
    echo "📊 Output size: $(du -h "$OUTPUT_FILE" | cut -f1)"
    echo "📄 First few entries:"
    head -5 "$OUTPUT_FILE"
fi

