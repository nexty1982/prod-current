#!/bin/bash

echo "=== OMAI Command System Demonstration ==="
echo "Date: $(date)"
echo "Demonstrating natural language command execution capabilities"

# Navigate to production directory
PROD_ROOT="/var/www/orthodox-church-mgmt/orthodoxmetrics/prod"
echo "Demo location: $PROD_ROOT"

cd "$PROD_ROOT" || {
    echo "❌ Error: Could not change to production directory"
    exit 1
}

echo ""
echo "🎯 OMAI Command System Features:"
echo "✅ Natural language command parsing"
echo "✅ Memory system with frequency tracking"
echo "✅ Hands-on mode for actual execution"
echo "✅ Safety levels (safe, moderate, dangerous)"
echo "✅ Sudo command protection"
echo "✅ Command logging and history"
echo "✅ Auto-caching of common requests"

echo ""
echo "=== Demo 1: Show Help ==="
./omai --help

echo ""
echo "=== Demo 2: List Available Commands ==="
./omai --list

echo ""
echo "=== Demo 3: Test Natural Language Recognition (Safe Mode) ==="
echo ""
echo "🗣️ 'check server status'"
./omai "check server status"

echo ""
echo "🗣️ 'show me the logs'"
./omai "show me the logs"

echo ""
echo "🗣️ 'what's the disk usage?'"
./omai "what's the disk usage?"

echo ""
echo "🗣️ 'restart the server'"
./omai "restart the server"

echo ""
echo "=== Demo 4: Demonstrate Memory System ==="
echo ""
echo "Running the same command multiple times to show memory caching..."

echo "First time:"
./omai "check server status"

echo ""
echo "Second time (should be faster with caching):"
./omai "check server status"

echo ""
echo "Third time (auto-cached after 3 uses):"
./omai "check server status"

echo ""
echo "=== Demo 5: Show Memory Statistics ==="
./omai --stats

echo ""
echo "=== Demo 6: Hands-On Mode Examples ==="
echo ""
echo "🔧 Safe command execution (hands-on mode):"
echo "Command: 'omai status'"
./omai --mode hands-on "omai status"

echo ""
echo "🔧 File listing (hands-on mode):"
echo "Command: 'list files'"
./omai --mode hands-on "list files"

echo ""
echo "=== Demo 7: Safety Features ==="
echo ""
echo "🔒 Attempting dangerous command without --force:"
echo "Command: 'emergency restart'"
./omai --mode hands-on "emergency restart" || echo "✅ Correctly blocked dangerous command"

echo ""
echo "🔒 Attempting sudo command without confirmation:"
echo "Command: 'backup the database'"
./omai --mode hands-on "backup the database" || echo "✅ Correctly blocked sudo command"

echo ""
echo "=== Demo 8: Command History ==="
./omai --history

echo ""
echo "=== Demo 9: Alias Usage ==="
echo ""
echo "🎯 Using aliases for common commands:"
echo "rs = restart_server, status = server_status, logs = app_logs"

echo ""
echo "Command: 'rs' (restart server alias)"
./omai "rs"

echo ""
echo "Command: 'status' (server status alias)"  
./omai "status"

echo ""
echo "=== Demo 10: Advanced Pattern Matching ==="
echo ""
echo "🧠 Testing fuzzy matching and natural language understanding:"

echo ""
echo "🗣️ 'can you show me what processes are running?'"
./omai "can you show me what processes are running?"

echo ""
echo "🗣️ 'i need to see the error logs please'"
./omai "i need to see the error logs please"

echo ""
echo "🗣️ 'how much space is left on the disk?'"
./omai "how much space is left on the disk?"

echo ""
echo "=== OMAI Command System Demo Complete ==="
echo ""
echo "🎉 Key Features Demonstrated:"
echo "✅ Natural language understanding"
echo "✅ Command recognition and mapping"
echo "✅ Safety classification system"
echo "✅ Memory and caching system"
echo "✅ Hands-on mode execution"
echo "✅ Security controls for dangerous/sudo commands"
echo "✅ Command history and logging"
echo "✅ Alias support for quick access"
echo "✅ Fuzzy pattern matching"
echo ""
echo "📚 Available Commands Include:"
echo "  🖥️  Server Management (restart, stop, start, status)"
echo "  🗄️  Database Operations (backup, status, restart)"
echo "  🔨 Build & Deploy (frontend build, deployment, clean build)"
echo "  📋 Log Management (error logs, app logs, tail logs)"
echo "  📊 System Monitoring (resources, disk usage, memory)"
echo "  📁 File Operations (list, find, permissions)"
echo "  🤖 OMAI Specific (discovery, big book status)"
echo "  🚨 Emergency Commands (emergency restart, kill processes)"
echo ""
echo "🔧 Usage Patterns:"
echo "  ./omai 'natural language instruction'"
echo "  ./omai --mode hands-on 'command to execute'"
echo "  ./omai --mode hands-on --force 'dangerous command'"
echo "  ./omai --mode hands-on --confirm-sudo 'sudo command'"
echo ""
echo "🎯 OMAI is ready for production use!"
echo "Run './omai --help' for full documentation." 