#!/bin/bash

# OMAI Phase 12 - Dialogue System Startup Script

echo "🧠 OMAI Phase 12 - Autonomous Agent Dialogue Framework"
echo "======================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "orchestrator.ts" ]; then
    echo "❌ Error: Please run this script from the services/om-ai directory"
    exit 1
fi

echo "📁 Checking Phase 12 components..."
echo ""

# Check for required files
required_files=(
    "dialogue/chat-engine.ts"
    "dialogue/context-sync.ts"
    "dialogue/translator.ts"
    "dialogue/index.ts"
    "dialogue/test-dialogue.ts"
    "dialogue/README.md"
    "agents/omai-mediator.ts"
    "types/agent-dialogue.ts"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    else
        echo "✅ $file"
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    echo ""
    echo "❌ Missing required files:"
    for file in "${missing_files[@]}"; do
        echo "   - $file"
    done
    echo ""
    echo "Please ensure all Phase 12 components are properly installed."
    exit 1
fi

echo ""
echo "🔧 Phase 12 components verified!"
echo ""

# Check if Node.js and TypeScript are available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx is not available"
    exit 1
fi

echo "✅ Node.js and npx available"
echo ""

# Create memory directory if it doesn't exist
if [ ! -d "memory" ]; then
    echo "📁 Creating memory directory..."
    mkdir -p memory
fi

echo "🚀 Starting Phase 12 Dialogue System..."
echo ""

# Run the test scenario
echo "🧪 Running Phase 12 test scenario..."
echo ""

npx ts-node dialogue/test-dialogue.ts

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Phase 12 Dialogue System test completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Review the test output above"
    echo "   2. Check memory/chat.log.json for dialogue logs"
    echo "   3. Integrate with your existing OMAI orchestrator"
    echo "   4. Begin Phase 13 development"
    echo ""
    echo "📚 Documentation: dialogue/README.md"
    echo "🔧 Integration: Update orchestrator.ts to call initializeDialogueSystem()"
    echo ""
else
    echo ""
    echo "❌ Phase 12 test failed. Please check the error messages above."
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   1. Ensure all dependencies are installed"
    echo "   2. Check TypeScript compilation"
    echo "   3. Verify file permissions"
    echo "   4. Review the error logs"
    echo ""
    exit 1
fi

echo "✨ Phase 12 is ready for production use!" 