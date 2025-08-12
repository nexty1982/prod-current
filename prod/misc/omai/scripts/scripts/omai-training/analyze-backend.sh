#!/bin/bash
# scripts/omai-training/analyze-backend.sh
# Backend Codebase Analysis for OMAI Training

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

BACKEND_DIR="server"
OUTPUT_DIR="data/omai-training/backend-analysis"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}🔍 Starting Backend Codebase Analysis...${NC}"

# Function to analyze Express routes
analyze_express_routes() {
    echo -e "${BLUE}🛣️  Analyzing Express Routes...${NC}"
    
    # Find all route files
    find "$BACKEND_DIR/routes" -name "*.js" 2>/dev/null | while read -r file; do
        echo "Analyzing route file: $file"
        
        # Extract route information
        route_name=$(basename "$file" .js)
        
        {
            echo "=== Route Analysis: $route_name ==="
            echo "File: $file"
            echo "Date: $(date)"
            echo ""
            
            # Extract route definitions
            echo "--- ROUTE DEFINITIONS ---"
            grep -E "router\.(get|post|put|delete|patch)" "$file" 2>/dev/null | head -20 || echo "No routes found"
            echo ""
            
            # Extract middleware usage
            echo "--- MIDDLEWARE ---"
            grep -E "authMiddleware|requireRole|cors|express\." "$file" 2>/dev/null || echo "No middleware found"
            echo ""
            
            # Extract database operations
            echo "--- DATABASE OPERATIONS ---"
            grep -E "db\.|pool\.|execute|query" "$file" 2>/dev/null || echo "No database operations found"
            echo ""
            
            # Extract dependencies
            echo "--- DEPENDENCIES ---"
            grep -E "^const.*require|^import" "$file" 2>/dev/null || echo "No dependencies found"
            echo ""
            
            # Extract error handling
            echo "--- ERROR HANDLING ---"
            grep -E "try.*{|catch.*{|throw|error" "$file" 2>/dev/null || echo "No error handling found"
            echo ""
            
            # Count endpoints
            echo "--- METRICS ---"
            echo "Lines of code: $(wc -l < "$file")"
            echo "GET endpoints: $(grep -c "router\.get" "$file" 2>/dev/null || echo 0)"
            echo "POST endpoints: $(grep -c "router\.post" "$file" 2>/dev/null || echo 0)"
            echo "PUT endpoints: $(grep -c "router\.put" "$file" 2>/dev/null || echo 0)"
            echo "DELETE endpoints: $(grep -c "router\.delete" "$file" 2>/dev/null || echo 0)"
            echo ""
            
        } >> "$OUTPUT_DIR/routes_analysis_$TIMESTAMP.txt"
    done
    
    echo -e "${GREEN}✅ Express Routes Analysis Complete${NC}"
}

# Function to analyze controllers
analyze_controllers() {
    echo -e "${BLUE}🎮 Analyzing Controllers...${NC}"
    
    # Find controller files
    find "$BACKEND_DIR" -path "*/controllers/*" -name "*.js" 2>/dev/null | while read -r file; do
        echo "Analyzing controller: $file"
        
        controller_name=$(basename "$file" .js)
        
        {
            echo "=== Controller Analysis: $controller_name ==="
            echo "File: $file"
            echo "Date: $(date)"
            echo ""
            
            # Extract exported functions
            echo "--- EXPORTED FUNCTIONS ---"
            grep -E "exports\.|module\.exports" "$file" -A 2 2>/dev/null || echo "No exports found"
            echo ""
            
            # Extract business logic patterns
            echo "--- BUSINESS LOGIC ---"
            grep -E "async.*function|function.*async" "$file" 2>/dev/null || echo "No async functions found"
            echo ""
            
            # Extract validation logic
            echo "--- VALIDATION ---"
            grep -E "validate|check|sanitize" "$file" 2>/dev/null || echo "No validation found"
            echo ""
            
            # Extract response patterns
            echo "--- RESPONSE PATTERNS ---"
            grep -E "res\.json|res\.status|res\.send" "$file" 2>/dev/null | head -10 || echo "No response patterns found"
            echo ""
            
        } >> "$OUTPUT_DIR/controllers_analysis_$TIMESTAMP.txt"
    done
    
    echo -e "${GREEN}✅ Controllers Analysis Complete${NC}"
}

# Function to analyze services
analyze_services() {
    echo -e "${BLUE}🔧 Analyzing Services...${NC}"
    
    # Find service files
    find "$BACKEND_DIR" -path "*/services/*" -name "*.js" 2>/dev/null | while read -r file; do
        echo "Analyzing service: $file"
        
        service_name=$(basename "$file" .js)
        
        {
            echo "=== Service Analysis: $service_name ==="
            echo "File: $file"
            echo "Date: $(date)"
            echo ""
            
            # Extract service functions
            echo "--- SERVICE FUNCTIONS ---"
            grep -E "function|exports\.|class.*{" "$file" -A 2 2>/dev/null || echo "No service functions found"
            echo ""
            
            # Extract external integrations
            echo "--- EXTERNAL INTEGRATIONS ---"
            grep -E "axios|fetch|nodemailer|fs\.|path\." "$file" 2>/dev/null || echo "No external integrations found"
            echo ""
            
            # Extract configuration usage
            echo "--- CONFIGURATION ---"
            grep -E "process\.env|config\.|require.*config" "$file" 2>/dev/null || echo "No configuration found"
            echo ""
            
        } >> "$OUTPUT_DIR/services_analysis_$TIMESTAMP.txt"
    done
    
    echo -e "${GREEN}✅ Services Analysis Complete${NC}"
}

# Function to analyze middleware
analyze_middleware() {
    echo -e "${BLUE}🛡️  Analyzing Middleware...${NC}"
    
    # Find middleware files
    find "$BACKEND_DIR" -path "*middleware*" -name "*.js" 2>/dev/null | while read -r file; do
        echo "Analyzing middleware: $file"
        
        middleware_name=$(basename "$file" .js)
        
        {
            echo "=== Middleware Analysis: $middleware_name ==="
            echo "File: $file"
            echo "Date: $(date)"
            echo ""
            
            # Extract middleware functions
            echo "--- MIDDLEWARE FUNCTIONS ---"
            grep -E "function.*req.*res.*next|.*req.*res.*next.*=>" "$file" 2>/dev/null || echo "No middleware functions found"
            echo ""
            
            # Extract authentication logic
            echo "--- AUTHENTICATION ---"
            grep -E "jwt|token|auth|session" "$file" 2>/dev/null || echo "No authentication logic found"
            echo ""
            
            # Extract validation logic
            echo "--- VALIDATION ---"
            grep -E "validate|check|sanitize|cors" "$file" 2>/dev/null || echo "No validation found"
            echo ""
            
        } >> "$OUTPUT_DIR/middleware_analysis_$TIMESTAMP.txt"
    done
    
    echo -e "${GREEN}✅ Middleware Analysis Complete${NC}"
}

# Function to analyze database configuration
analyze_database_config() {
    echo -e "${BLUE}🗄️  Analyzing Database Configuration...${NC}"
    
    {
        echo "=== Database Configuration Analysis ==="
        echo "Analysis Date: $(date)"
        echo ""
        
        # Look for database connection files
        echo "--- DATABASE CONNECTION FILES ---"
        find "$BACKEND_DIR" -name "*db*" -o -name "*database*" -o -name "*mysql*" | head -10
        echo ""
        
        # Analyze main database config
        if [[ -f "$BACKEND_DIR/config/database.js" ]]; then
            echo "--- DATABASE CONFIG CONTENT ---"
            cat "$BACKEND_DIR/config/database.js" 2>/dev/null || echo "Could not read database config"
        elif [[ -f "$BACKEND_DIR/db.js" ]]; then
            echo "--- DATABASE CONFIG CONTENT ---"
            head -50 "$BACKEND_DIR/db.js" 2>/dev/null || echo "Could not read database config"
        fi
        echo ""
        
        # Look for connection pool configuration
        echo "--- CONNECTION POOL CONFIGURATION ---"
        find "$BACKEND_DIR" -name "*.js" -exec grep -l "createPool\|mysql\.createConnection" {} \; 2>/dev/null | head -3
        echo ""
        
        # Look for migration files
        echo "--- MIGRATION FILES ---"
        find . -path "*/migrations/*" -name "*.sql" 2>/dev/null | head -10 || echo "No migration files found"
        echo ""
        
    } > "$OUTPUT_DIR/database_config_analysis_$TIMESTAMP.txt"
    
    echo -e "${GREEN}✅ Database Configuration Analysis Complete${NC}"
}

# Function to analyze API endpoints
analyze_api_endpoints() {
    echo -e "${BLUE}🌐 Analyzing API Endpoints...${NC}"
    
    {
        echo "=== API Endpoints Analysis ==="
        echo "Analysis Date: $(date)"
        echo ""
        
        echo "--- ALL API ENDPOINTS ---"
        find "$BACKEND_DIR/routes" -name "*.js" -exec grep -H "router\.\(get\|post\|put\|delete\|patch\)" {} \; 2>/dev/null | \
        sed 's/.*routes\///g' | sed 's/\.js:/ - /g' | sort || echo "No endpoints found"
        echo ""
        
        echo "--- AUTHENTICATION REQUIRED ENDPOINTS ---"
        find "$BACKEND_DIR/routes" -name "*.js" -exec grep -l "authMiddleware\|requireRole" {} \; 2>/dev/null | \
        while read -r file; do
            echo "File: $(basename "$file")"
            grep -E "router\.(get|post|put|delete|patch)" "$file" 2>/dev/null | head -5
            echo ""
        done
        echo ""
        
        echo "--- PUBLIC ENDPOINTS ---"
        find "$BACKEND_DIR/routes" -name "*.js" -exec grep -L "authMiddleware\|requireRole" {} \; 2>/dev/null | \
        while read -r file; do
            echo "File: $(basename "$file")"
            grep -E "router\.(get|post|put|delete|patch)" "$file" 2>/dev/null | head -3
            echo ""
        done
        
    } > "$OUTPUT_DIR/api_endpoints_analysis_$TIMESTAMP.txt"
    
    echo -e "${GREEN}✅ API Endpoints Analysis Complete${NC}"
}

# Function to analyze security measures
analyze_security() {
    echo -e "${BLUE}🔒 Analyzing Security Measures...${NC}"
    
    {
        echo "=== Security Analysis ==="
        echo "Analysis Date: $(date)"
        echo ""
        
        echo "--- AUTHENTICATION & AUTHORIZATION ---"
        find "$BACKEND_DIR" -name "*.js" -exec grep -l "jwt\|passport\|session\|auth" {} \; 2>/dev/null | head -5
        echo ""
        
        echo "--- INPUT VALIDATION ---"
        find "$BACKEND_DIR" -name "*.js" -exec grep -l "sanitize\|validate\|escape" {} \; 2>/dev/null | head -5
        echo ""
        
        echo "--- CORS CONFIGURATION ---"
        find "$BACKEND_DIR" -name "*.js" -exec grep -l "cors" {} \; 2>/dev/null | head -3
        echo ""
        
        echo "--- RATE LIMITING ---"
        find "$BACKEND_DIR" -name "*.js" -exec grep -l "rateLimit\|rate-limit" {} \; 2>/dev/null | head -3
        echo ""
        
        echo "--- SECURITY HEADERS ---"
        find "$BACKEND_DIR" -name "*.js" -exec grep -l "helmet\|security.*header" {} \; 2>/dev/null | head -3
        echo ""
        
        echo "--- ENVIRONMENT VARIABLES ---"
        if [[ -f ".env.example" ]]; then
            echo "Environment variables from .env.example:"
            cat .env.example 2>/dev/null | head -20
        fi
        
    } > "$OUTPUT_DIR/security_analysis_$TIMESTAMP.txt"
    
    echo -e "${GREEN}✅ Security Analysis Complete${NC}"
}

# Function to create comprehensive summary
create_summary() {
    echo -e "${BLUE}📋 Creating Analysis Summary...${NC}"
    
    {
        echo "=== BACKEND CODEBASE ANALYSIS SUMMARY ==="
        echo "Analysis Date: $(date)"
        echo "Analyzed Directory: $BACKEND_DIR"
        echo ""
        
        echo "--- STATISTICS ---"
        echo "Total JavaScript files: $(find "$BACKEND_DIR" -name "*.js" | wc -l)"
        echo "Route files: $(find "$BACKEND_DIR" -path "*/routes/*" -name "*.js" 2>/dev/null | wc -l)"
        echo "Controller files: $(find "$BACKEND_DIR" -path "*/controllers/*" -name "*.js" 2>/dev/null | wc -l)"
        echo "Service files: $(find "$BACKEND_DIR" -path "*/services/*" -name "*.js" 2>/dev/null | wc -l)"
        echo "Middleware files: $(find "$BACKEND_DIR" -path "*middleware*" -name "*.js" 2>/dev/null | wc -l)"
        echo "Total lines of code: $(find "$BACKEND_DIR" -name "*.js" -exec cat {} \; | wc -l)"
        echo ""
        
        echo "--- MAIN ENTRY POINTS ---"
        echo "Server entry: $(find "$BACKEND_DIR" -name "index.js" -o -name "server.js" -o -name "app.js" | head -3)"
        echo ""
        
        echo "--- KEY DIRECTORIES ---"
        find "$BACKEND_DIR" -type d -maxdepth 2 | sort
        echo ""
        
        echo "--- MAIN FEATURES IDENTIFIED ---"
        find "$BACKEND_DIR" -type d -name "*admin*" -o -name "*auth*" -o -name "*user*" -o -name "*api*" | sort
        echo ""
        
        echo "--- PACKAGE DEPENDENCIES ---"
        if [[ -f "$BACKEND_DIR/package.json" ]]; then
            echo "Dependencies from package.json:"
            grep -A 20 '"dependencies"' "$BACKEND_DIR/package.json" | grep -E '".*":' | head -15
        elif [[ -f "package.json" ]]; then
            echo "Dependencies from root package.json:"
            grep -A 20 '"dependencies"' package.json | grep -E '".*":' | head -15
        fi
        echo ""
        
        echo "--- ANALYSIS FILES GENERATED ---"
        ls -la "$OUTPUT_DIR"/*_$TIMESTAMP.txt 2>/dev/null || echo "No analysis files found"
        
    } > "$OUTPUT_DIR/backend_summary_$TIMESTAMP.txt"
    
    echo -e "${GREEN}✅ Summary Created${NC}"
}

# Run all analysis functions
main() {
    if [[ ! -d "$BACKEND_DIR" ]]; then
        echo -e "${YELLOW}⚠️  Backend directory not found: $BACKEND_DIR${NC}"
        echo -e "${YELLOW}   Creating placeholder analysis...${NC}"
        mkdir -p "$OUTPUT_DIR"
        echo "Backend directory not found during analysis" > "$OUTPUT_DIR/error_$TIMESTAMP.txt"
        return 1
    fi
    
    analyze_express_routes
    analyze_controllers
    analyze_services
    analyze_middleware
    analyze_database_config
    analyze_api_endpoints
    analyze_security
    create_summary
    
    echo -e "${GREEN}🎉 Backend Analysis Complete!${NC}"
    echo -e "${GREEN}📁 Results saved in: $OUTPUT_DIR${NC}"
}

# Execute main function
main "$@" 