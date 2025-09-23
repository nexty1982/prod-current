#!/bin/bash

# Development Manager Script for OrthodoxMetrics Frontend
# Production runs through nginx as normal - this is only for development

echo "🚀 OrthodoxMetrics Frontend Development Manager"
echo "=============================================="
echo "Note: Production runs through nginx (port 80/443)"
echo "This script is for development testing only"
echo ""

# Function to show current running processes
show_processes() {
    echo "📊 Current Development Processes:"
    echo "Development Server (Port 5174):"
    lsof -i :5174 2>/dev/null || echo "  ❌ Not running"
    echo "Preview Server (Port 5175):"
    lsof -i :5175 2>/dev/null || echo "  ❌ Not running"
    echo ""
    echo "Production Status (nginx):"
    systemctl is-active nginx 2>/dev/null || echo "  ❓ Cannot check nginx status"
}

# Function to start development server
start_dev() {
    echo "🔧 Starting Development Server (Port 5174)..."
    echo "This is for development testing only - production runs through nginx"
    cd /var/www/orthodoxmetrics/prod/front-end
    npm run dev &
    DEV_PID=$!
    echo "Development server started with PID: $DEV_PID"
    echo "Access at: http://0.0.0.0:5174"
    echo ""
    echo "Production site continues to run normally through nginx"
}

# Function to start preview server (for testing builds)
start_preview() {
    echo "🔍 Starting Preview Server (Port 5175)..."
    echo "This previews the built files - production runs through nginx"
    cd /var/www/orthodoxmetrics/prod/front-end
    npm run build
    npm run preview &
    PREVIEW_PID=$!
    echo "Preview server started with PID: $PREVIEW_PID"
    echo "Access at: http://localhost:5175"
}

# Function to stop all development processes
stop_all() {
    echo "🛑 Stopping all development processes..."
    echo "Note: This does NOT affect production (nginx)"
    pkill -f "vite.*5174" 2>/dev/null || echo "No dev server to stop"
    pkill -f "vite.*5175" 2>/dev/null || echo "No preview server to stop"
    echo "Development processes stopped."
    echo "Production continues running through nginx"
}

# Main menu
case "$1" in
    "dev")
        start_dev
        ;;
    "preview")
        start_preview
        ;;
    "both")
        echo "🚀 Starting both Development and Preview servers..."
        start_dev
        sleep 2
        start_preview
        echo ""
        echo "✅ Both development servers are running:"
        echo "   Development: http://0.0.0.0:5174"
        echo "   Preview:     http://localhost:5175"
        echo "   Production:  continues through nginx (port 80/443)"
        ;;
    "stop")
        stop_all
        ;;
    "status")
        show_processes
        ;;
    *)
        echo "Usage: $0 {dev|preview|both|stop|status}"
        echo ""
        echo "Commands:"
        echo "  dev     - Start development server only (port 5174)"
        echo "  preview - Start preview server only (port 5175)"
        echo "  both    - Start both development and preview servers"
        echo "  stop    - Stop all development servers"
        echo "  status  - Show current running processes"
        echo ""
        echo "Note: Production runs through nginx and is not affected by this script"
        echo ""
        show_processes
        ;;
esac
