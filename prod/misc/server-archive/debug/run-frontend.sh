#!/bin/bash

# Linux script to run the frontend development server
echo "🚀 Starting Orthodox Metrics Frontend Development Server"
echo "================================================="

# Check if we're in the correct directory
if [ ! -f "front-end/package.json" ]; then
    echo "❌ Error: package.json not found in front-end directory"
    echo "Please make sure you're running this script from the project root"
    exit 1
fi

# Navigate to front-end directory
cd front-end
echo "📁 Changed to front-end directory"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed or not in PATH"
    echo "Please install Node.js and npm"
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
fi

# Start the development server
echo "🔄 Starting development server..."
echo "The app will be available at http://localhost:3000"
echo "Press Ctrl+C to stop the server"

npm run dev 