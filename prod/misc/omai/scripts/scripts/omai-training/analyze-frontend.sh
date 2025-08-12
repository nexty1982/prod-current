#!/bin/bash
# scripts/omai-training/analyze-frontend.sh
# Frontend Codebase Analysis for OMAI Training

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

FRONTEND_DIR="front-end/src"
OUTPUT_DIR="data/omai-training/frontend-analysis"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}🔍 Starting Frontend Codebase Analysis...${NC}"

# Function to analyze React components
analyze_react_components() {
    echo -e "${BLUE}📦 Analyzing React Components...${NC}"
    
    # Find all React component files
    find "$FRONTEND_DIR" -name "*.tsx" -o -name "*.jsx" | while read -r file; do
        echo "Analyzing: $file"
        
        # Extract component information
        component_name=$(basename "$file" | sed 's/\.[^.]*$//')
        
        # Analyze component structure
        {
            echo "=== Component Analysis: $component_name ==="
            echo "File: $file"
            echo "Date: $(date)"
            echo ""
            
            # Extract imports
            echo "--- IMPORTS ---"
            grep -E "^import" "$file" 2>/dev/null || echo "No imports found"
            echo ""
            
            # Extract props interface/types
            echo "--- PROPS/INTERFACES ---"
            grep -E "interface.*Props|type.*Props" "$file" -A 10 2>/dev/null || echo "No props interface found"
            echo ""
            
            # Extract state usage
            echo "--- STATE MANAGEMENT ---"
            grep -E "useState|useEffect|useContext|useReducer" "$file" 2>/dev/null || echo "No hooks found"
            echo ""
            
            # Extract API calls
            echo "--- API INTEGRATION ---"
            grep -E "axios|fetch|api\.|API\." "$file" 2>/dev/null || echo "No API calls found"
            echo ""
            
            # Extract routing
            echo "--- ROUTING ---"
            grep -E "useNavigate|useLocation|Link|Route" "$file" 2>/dev/null || echo "No routing found"
            echo ""
            
            # Count lines of code
            echo "--- METRICS ---"
            echo "Lines of code: $(wc -l < "$file")"
            echo "Component exports: $(grep -c "export" "$file" 2>/dev/null || echo 0)"
            echo ""
            
        } >> "$OUTPUT_DIR/components_analysis_$TIMESTAMP.txt"
    done
    
    echo -e "${GREEN}✅ React Components Analysis Complete${NC}"
}

# Function to analyze routing structure
analyze_routing() {
    echo -e "${BLUE}🛣️  Analyzing Routing Structure...${NC}"
    
    # Find Router files
    find "$FRONTEND_DIR" -name "*Router*" -o -name "*Route*" | while read -r file; do
        echo "Analyzing routing file: $file"
        
        {
            echo "=== Routing Analysis ==="
            echo "File: $file"
            echo "Date: $(date)"
            echo ""
            
            # Extract route definitions
            echo "--- ROUTE DEFINITIONS ---"
            grep -E "path:|element:|Route" "$file" 2>/dev/null || echo "No routes found"
            echo ""
            
            # Extract protected routes
            echo "--- PROTECTED ROUTES ---"
            grep -E "ProtectedRoute|requireAuth|auth" "$file" -A 2 -B 2 2>/dev/null || echo "No protected routes found"
            echo ""
            
        } >> "$OUTPUT_DIR/routing_analysis_$TIMESTAMP.txt"
    done
    
    echo -e "${GREEN}✅ Routing Analysis Complete${NC}"
}

# Function to analyze API integration
analyze_api_integration() {
    echo -e "${BLUE}🌐 Analyzing API Integration...${NC}"
    
    # Find API files
    find "$FRONTEND_DIR" -path "*/api/*" -name "*.ts" -o -name "*.js" | while read -r file; do
        echo "Analyzing API file: $file"
        
        {
            echo "=== API Integration Analysis ==="
            echo "File: $file"
            echo "Date: $(date)"
            echo ""
            
            # Extract API endpoints
            echo "--- API ENDPOINTS ---"
            grep -E "get\(|post\(|put\(|delete\(|patch\(" "$file" 2>/dev/null || echo "No endpoints found"
            echo ""
            
            # Extract base URLs
            echo "--- BASE URLS ---"
            grep -E "baseURL|BASE_URL|apiClient" "$file" 2>/dev/null || echo "No base URLs found"
            echo ""
            
            # Extract interfaces/types
            echo "--- DATA TYPES ---"
            grep -E "interface|type.*=" "$file" -A 5 2>/dev/null || echo "No types found"
            echo ""
            
        } >> "$OUTPUT_DIR/api_analysis_$TIMESTAMP.txt"
    done
    
    echo -e "${GREEN}✅ API Integration Analysis Complete${NC}"
}

# Function to analyze state management
analyze_state_management() {
    echo -e "${BLUE}🏪 Analyzing State Management...${NC}"
    
    # Find context files
    find "$FRONTEND_DIR" -path "*/context*" -o -path "*Context*" -name "*.tsx" -o -name "*.ts" | while read -r file; do
        echo "Analyzing context file: $file"
        
        {
            echo "=== State Management Analysis ==="
            echo "File: $file"
            echo "Date: $(date)"
            echo ""
            
            # Extract context definitions
            echo "--- CONTEXT DEFINITIONS ---"
            grep -E "createContext|Context.*=" "$file" -A 5 -B 2 2>/dev/null || echo "No context found"
            echo ""
            
            # Extract providers
            echo "--- PROVIDERS ---"
            grep -E "Provider|provider" "$file" -A 10 2>/dev/null || echo "No providers found"
            echo ""
            
            # Extract hooks
            echo "--- CUSTOM HOOKS ---"
            grep -E "use[A-Z]" "$file" 2>/dev/null || echo "No custom hooks found"
            echo ""
            
        } >> "$OUTPUT_DIR/state_management_analysis_$TIMESTAMP.txt"
    done
    
    echo -e "${GREEN}✅ State Management Analysis Complete${NC}"
}

# Function to generate dependency graph
generate_dependency_graph() {
    echo -e "${BLUE}📊 Generating Dependency Graph...${NC}"
    
    {
        echo "=== Frontend Dependency Graph ==="
        echo "Generated: $(date)"
        echo ""
        
        echo "--- COMPONENT DEPENDENCIES ---"
        find "$FRONTEND_DIR" -name "*.tsx" -exec basename {} \; | sort | while read -r component; do
            component_path=$(find "$FRONTEND_DIR" -name "$component" | head -1)
            if [[ -f "$component_path" ]]; then
                echo "Component: $component"
                echo "  Imports:"
                grep -E "from ['\"]\./" "$component_path" 2>/dev/null | sed 's/.*from /    /' || echo "    No local imports"
                echo ""
            fi
        done
        
        echo "--- EXTERNAL DEPENDENCIES ---"
        if [[ -f "front-end/package.json" ]]; then
            echo "Production Dependencies:"
            grep -A 50 '"dependencies"' front-end/package.json | grep -E '".*":' | head -20
            echo ""
            echo "Development Dependencies:"
            grep -A 50 '"devDependencies"' front-end/package.json | grep -E '".*":' | head -10
        fi
        
    } > "$OUTPUT_DIR/dependency_graph_$TIMESTAMP.txt"
    
    echo -e "${GREEN}✅ Dependency Graph Generated${NC}"
}

# Function to analyze performance patterns
analyze_performance_patterns() {
    echo -e "${BLUE}⚡ Analyzing Performance Patterns...${NC}"
    
    {
        echo "=== Frontend Performance Analysis ==="
        echo "Generated: $(date)"
        echo ""
        
        echo "--- POTENTIAL PERFORMANCE ISSUES ---"
        
        # Find large components (>500 lines)
        echo "Large Components (>500 lines):"
        find "$FRONTEND_DIR" -name "*.tsx" -exec wc -l {} + | awk '$1 > 500 {print $2 " (" $1 " lines)"}' || echo "None found"
        echo ""
        
        # Find components without React.memo
        echo "Components without optimization:"
        find "$FRONTEND_DIR" -name "*.tsx" -exec grep -L "React.memo\|memo\|useMemo\|useCallback" {} \; | head -10 || echo "All components appear optimized"
        echo ""
        
        # Find inline functions in JSX
        echo "Potential inline function issues:"
        find "$FRONTEND_DIR" -name "*.tsx" -exec grep -l "onClick={() =>" {} \; | head -5 || echo "No obvious inline function issues"
        echo ""
        
        # Bundle size indicators
        echo "--- BUNDLE SIZE INDICATORS ---"
        echo "Total TypeScript/JavaScript files: $(find "$FRONTEND_DIR" -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | wc -l)"
        echo "Total lines of code: $(find "$FRONTEND_DIR" -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -exec cat {} \; | wc -l)"
        echo "Average component size: $(find "$FRONTEND_DIR" -name "*.tsx" -exec wc -l {} + | awk 'END {if (NR > 1) print int(total/(NR-1)) " lines"} {total += $1}')"
        
    } > "$OUTPUT_DIR/performance_analysis_$TIMESTAMP.txt"
    
    echo -e "${GREEN}✅ Performance Analysis Complete${NC}"
}

# Function to create comprehensive summary
create_summary() {
    echo -e "${BLUE}📋 Creating Analysis Summary...${NC}"
    
    {
        echo "=== FRONTEND CODEBASE ANALYSIS SUMMARY ==="
        echo "Analysis Date: $(date)"
        echo "Analyzed Directory: $FRONTEND_DIR"
        echo ""
        
        echo "--- STATISTICS ---"
        echo "Total React Components: $(find "$FRONTEND_DIR" -name "*.tsx" | wc -l)"
        echo "Total JavaScript/TypeScript files: $(find "$FRONTEND_DIR" -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | wc -l)"
        echo "Total API files: $(find "$FRONTEND_DIR" -path "*/api/*" -name "*.ts" | wc -l)"
        echo "Total Context files: $(find "$FRONTEND_DIR" -name "*Context*" -o -name "*context*" | wc -l)"
        echo "Total lines of code: $(find "$FRONTEND_DIR" -name "*.ts" -o -name "*.tsx" -exec cat {} \; | wc -l)"
        echo ""
        
        echo "--- KEY DIRECTORIES ---"
        find "$FRONTEND_DIR" -type d -maxdepth 3 | sort
        echo ""
        
        echo "--- MAIN FEATURES IDENTIFIED ---"
        find "$FRONTEND_DIR" -type d -name "*admin*" -o -name "*user*" -o -name "*auth*" -o -name "*dashboard*" | sort
        echo ""
        
        echo "--- ANALYSIS FILES GENERATED ---"
        ls -la "$OUTPUT_DIR"/*_$TIMESTAMP.txt 2>/dev/null || echo "No analysis files found"
        
    } > "$OUTPUT_DIR/frontend_summary_$TIMESTAMP.txt"
    
    echo -e "${GREEN}✅ Summary Created${NC}"
}

# Run all analysis functions
main() {
    if [[ ! -d "$FRONTEND_DIR" ]]; then
        echo -e "${YELLOW}⚠️  Frontend directory not found: $FRONTEND_DIR${NC}"
        echo -e "${YELLOW}   Creating placeholder analysis...${NC}"
        mkdir -p "$OUTPUT_DIR"
        echo "Frontend directory not found during analysis" > "$OUTPUT_DIR/error_$TIMESTAMP.txt"
        return 1
    fi
    
    analyze_react_components
    analyze_routing
    analyze_api_integration
    analyze_state_management
    generate_dependency_graph
    analyze_performance_patterns
    create_summary
    
    echo -e "${GREEN}🎉 Frontend Analysis Complete!${NC}"
    echo -e "${GREEN}📁 Results saved in: $OUTPUT_DIR${NC}"
}

# Execute main function
main "$@" 