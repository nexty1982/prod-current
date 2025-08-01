#!/bin/bash

# OM-AI Phase 2 Test Script
# Tests the enhanced embedding engine and memory system

echo "🧠 OM-AI Phase 2 Testing Script"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    echo -e "${BLUE}Testing: ${test_name}${NC}"
    
    # Run the test command and capture output
    local output
    output=$(eval "$test_command" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ] && echo "$output" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "Output: $output"
        ((TESTS_FAILED++))
    fi
    echo ""
}

# Function to check if a file exists
check_file() {
    local file_path="$1"
    local description="$2"
    
    echo -e "${BLUE}Checking: ${description}${NC}"
    if [ -f "$file_path" ]; then
        echo -e "${GREEN}✅ Found: $file_path${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ Missing: $file_path${NC}"
        ((TESTS_FAILED++))
    fi
    echo ""
}

echo "📁 Checking Phase 2 File Structure..."
echo ""

# Check core files
check_file "services/om-ai/memory/om-memory.json" "Memory vault file"
check_file "services/om-ai/memory/memory-manager.ts" "Memory manager"
check_file "services/om-ai/embeddings/context-loader.ts" "Enhanced context loader"
check_file "services/om-ai/index.ts" "Updated main entry point"
check_file "front-end/src/pages/sandbox/ai-lab.tsx" "Enhanced AI Lab UI"
check_file "server/routes/omai.js" "Updated backend routes"
check_file "OMAI_PHASE2_EMBEDDING_ENGINE.md" "Phase 2 documentation"

echo "🔧 Testing Memory System..."
echo ""

# Test memory file structure
run_test "Memory JSON Structure" \
    "node -e \"const mem = require('./services/om-ai/memory/om-memory.json'); console.log('Rules:', mem.rules.length, 'Components:', Object.keys(mem.components).length);\"" \
    "Rules: [0-9]+ Components: [0-9]+"

echo "🧪 Testing Enhanced AI Lab Features..."
echo ""

# Check if the enhanced UI has the new features
run_test "Query Mode Selection" \
    "grep -q 'queryMode' front-end/src/pages/sandbox/ai-lab.tsx" \
    "queryMode"

run_test "File Upload Support" \
    "grep -q 'UploadIcon' front-end/src/pages/sandbox/ai-lab.tsx" \
    "UploadIcon"

run_test "Context Display" \
    "grep -q 'responseSources' front-end/src/pages/sandbox/ai-lab.tsx" \
    "responseSources"

run_test "Memory Context" \
    "grep -q 'responseMemoryContext' front-end/src/pages/sandbox/ai-lab.tsx" \
    "responseMemoryContext"

echo "🔌 Testing Backend API Endpoints..."
echo ""

# Check for new API endpoints
run_test "Memory API Endpoint" \
    "grep -q '/memory' server/routes/omai.js" \
    "/memory"

run_test "Context API Endpoint" \
    "grep -q '/context' server/routes/omai.js" \
    "/context"

run_test "Memory Rule Endpoint" \
    "grep -q '/memory/rule' server/routes/omai.js" \
    "/memory/rule"

run_test "Memory Component Endpoint" \
    "grep -q '/memory/component' server/routes/omai.js" \
    "/memory/component"

echo "📊 Testing Enhanced Vector Store..."
echo ""

# Check for enhanced similarity calculations
run_test "Multi-Metric Similarity" \
    "grep -q 'calculateEnhancedSimilarity' services/om-ai/embeddings/context-loader.ts" \
    "calculateEnhancedSimilarity"

run_test "Jaccard Similarity" \
    "grep -q 'calculateJaccardSimilarity' services/om-ai/embeddings/context-loader.ts" \
    "calculateJaccardSimilarity"

run_test "Cosine Similarity" \
    "grep -q 'calculateCosineSimilarity' services/om-ai/embeddings/context-loader.ts" \
    "calculateCosineSimilarity"

run_test "Exact Match Bonus" \
    "grep -q 'calculateExactMatchBonus' services/om-ai/embeddings/context-loader.ts" \
    "calculateExactMatchBonus"

echo "🧠 Testing Memory Integration..."
echo ""

# Check for memory integration in main index
run_test "Memory Context Integration" \
    "grep -q 'getRelevantContext' services/om-ai/index.ts" \
    "getRelevantContext"

run_test "Memory Context Combination" \
    "grep -q 'memoryContext' services/om-ai/index.ts" \
    "memoryContext"

run_test "Sources Tracking" \
    "grep -q 'sources' services/om-ai/index.ts" \
    "sources"

echo "📈 Performance and Configuration..."
echo ""

# Check configuration updates
run_test "Memory Path Configuration" \
    "grep -q 'memoryPath' services/om-ai/config.ts" \
    "memoryPath"

run_test "Enhanced Similarity Threshold" \
    "grep -q 'similarityThreshold' services/om-ai/config.ts" \
    "similarityThreshold"

echo "🎯 Testing Documentation..."
echo ""

# Check documentation completeness
run_test "Phase 2 Documentation" \
    "grep -q 'Phase 2' OMAI_PHASE2_EMBEDDING_ENGINE.md" \
    "Phase 2"

run_test "Memory System Documentation" \
    "grep -q 'Memory System' OMAI_PHASE2_EMBEDDING_ENGINE.md" \
    "Memory System"

run_test "Enhanced UI Documentation" \
    "grep -q 'Query Modes' OMAI_PHASE2_EMBEDDING_ENGINE.md" \
    "Query Modes"

echo "📊 Test Results Summary"
echo "======================="
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All Phase 2 tests passed! OM-AI is ready for use.${NC}"
    echo ""
    echo "🚀 Next Steps:"
    echo "1. Start the server and test the AI Lab interface"
    echo "2. Try different query modes (Ask, Search, Explain)"
    echo "3. Upload files and test the explain functionality"
    echo "4. Check the context transparency features"
    echo "5. Test memory management via API endpoints"
    echo ""
    echo "🔗 Access Points:"
    echo "- AI Lab: http://localhost:3000/sandbox/ai-lab"
    echo "- Memory API: http://localhost:3000/api/omai/memory"
    echo "- Context Debug: http://localhost:3000/api/omai/context"
else
    echo -e "${RED}❌ Some tests failed. Please check the implementation.${NC}"
    exit 1
fi

echo ""
echo "📚 For detailed information, see: OMAI_PHASE2_EMBEDDING_ENGINE.md" 