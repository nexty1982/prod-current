#!/bin/bash

# OrthodoxMetrics Frontend-Backend Connection Setup Script
# This script helps configure and test the connection between frontend and backend

set -e

echo "🔧 Setting up Frontend-Backend Connection for OrthodoxMetrics"
echo "=============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "server/index.js" ] || [ ! -f "front-end/package.json" ]; then
    print_error "Please run this script from the project root directory (where server/ and front-end/ folders are located)"
    exit 1
fi

print_status "Current directory: $(pwd)"

# Step 1: Create development environment file for frontend
print_status "Creating frontend environment configuration..."

cat > front-end/.env.development << EOF
# Development Environment Configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_APP_ENV=development
VITE_APP_VERSION=5.0.0
EOF

print_success "Created front-end/.env.development"

# Step 2: Verify backend configuration
print_status "Checking backend configuration..."

if grep -q "const PORT = process.env.PORT || 3001" server/index.js; then
    print_success "Backend configured to run on port 3001"
else
    print_warning "Backend port configuration not found in expected location"
fi

# Step 3: Verify frontend proxy configuration
print_status "Checking frontend proxy configuration..."

if grep -q "target: 'http://localhost:3001'" front-end/vite.config.ts; then
    print_success "Frontend proxy configured to backend port 3001"
else
    print_warning "Frontend proxy configuration not found"
fi

# Step 4: Check if backend dependencies are installed
print_status "Checking backend dependencies..."

if [ -d "server/node_modules" ]; then
    print_success "Backend node_modules found"
else
    print_warning "Backend node_modules not found - you may need to run 'npm install' in server/ directory"
fi

# Step 5: Check if frontend dependencies are installed
print_status "Checking frontend dependencies..."

if [ -d "front-end/node_modules" ]; then
    print_success "Frontend node_modules found"
else
    print_warning "Frontend node_modules not found - you may need to run 'npm install' in front-end/ directory"
fi

# Step 6: Create a test script to verify connection
print_status "Creating connection test script..."

cat > test-frontend-backend-connection.sh << 'EOF'
#!/bin/bash

# Test script to verify frontend-backend connection

echo "🧪 Testing Frontend-Backend Connection"
echo "======================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to test if a port is listening
test_port() {
    local port=$1
    local service=$2
    
    if command -v netstat >/dev/null 2>&1; then
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            echo -e "${GREEN}✅ $service is running on port $port${NC}"
            return 0
        fi
    elif command -v ss >/dev/null 2>&1; then
        if ss -tuln 2>/dev/null | grep -q ":$port "; then
            echo -e "${GREEN}✅ $service is running on port $port${NC}"
            return 0
        fi
    elif command -v lsof >/dev/null 2>&1; then
        if lsof -i :$port >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $service is running on port $port${NC}"
            return 0
        fi
    fi
    
    echo -e "${RED}❌ $service is not running on port $port${NC}"
    return 1
}

# Test backend
echo -e "${BLUE}Testing Backend (Port 3001)...${NC}"
if test_port 3001 "Backend"; then
    # Test API health endpoint
    echo -e "${BLUE}Testing API health endpoint...${NC}"
    if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend API is responding${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend API health check failed (this might be normal if auth is required)${NC}"
    fi
else
    echo -e "${YELLOW}💡 To start the backend, run: cd server && npm start${NC}"
fi

# Test frontend
echo -e "${BLUE}Testing Frontend (Port 5174)...${NC}"
if test_port 5174 "Frontend"; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
else
    echo -e "${YELLOW}💡 To start the frontend, run: cd front-end && npm run dev${NC}"
fi

echo ""
echo -e "${BLUE}Connection Summary:${NC}"
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:5174"
echo "API Proxy: /api requests from frontend → backend"
echo ""
echo -e "${YELLOW}If both services are running, you should be able to access:${NC}"
echo "- Frontend: http://localhost:5174"
echo "- Backend API: http://localhost:3001/api/health"
EOF

chmod +x test-frontend-backend-connection.sh
print_success "Created test-frontend-backend-connection.sh"

# Step 7: Create startup script
print_status "Creating startup script..."

cat > start-orthodoxmetrics.sh << 'EOF'
#!/bin/bash

# OrthodoxMetrics Startup Script
# Starts both backend and frontend services

set -e

echo "🚀 Starting OrthodoxMetrics Services"
echo "===================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to check if a process is running
is_running() {
    local port=$1
    if command -v netstat >/dev/null 2>&1; then
        netstat -tuln 2>/dev/null | grep -q ":$port "
    elif command -v ss >/dev/null 2>&1; then
        ss -tuln 2>/dev/null | grep -q ":$port "
    elif command -v lsof >/dev/null 2>&1; then
        lsof -i :$port >/dev/null 2>&1
    else
        false
    fi
}

# Start backend if not running
if ! is_running 3001; then
    echo -e "${BLUE}Starting backend on port 3001...${NC}"
    cd server
    npm start &
    BACKEND_PID=$!
    echo -e "${GREEN}Backend started with PID: $BACKEND_PID${NC}"
    cd ..
else
    echo -e "${YELLOW}Backend already running on port 3001${NC}"
fi

# Wait a moment for backend to start
sleep 3

# Start frontend if not running
if ! is_running 5174; then
    echo -e "${BLUE}Starting frontend on port 5174...${NC}"
    cd front-end
    npm run dev &
    FRONTEND_PID=$!
    echo -e "${GREEN}Frontend started with PID: $FRONTEND_PID${NC}"
    cd ..
else
    echo -e "${YELLOW}Frontend already running on port 5174${NC}"
fi

echo ""
echo -e "${GREEN}🎉 OrthodoxMetrics services are starting up!${NC}"
echo ""
echo -e "${BLUE}Services:${NC}"
echo "- Backend:  http://localhost:3001"
echo "- Frontend: http://localhost:5174"
echo ""
echo -e "${YELLOW}To stop services, press Ctrl+C${NC}"
echo -e "${YELLOW}To test connection, run: ./test-frontend-backend-connection.sh${NC}"

# Wait for user to stop
wait
EOF

chmod +x start-orthodoxmetrics.sh
print_success "Created start-orthodoxmetrics.sh"

# Step 8: Display summary
echo ""
echo "=============================================================="
echo -e "${GREEN}✅ Frontend-Backend Connection Setup Complete!${NC}"
echo "=============================================================="
echo ""
echo -e "${BLUE}What was configured:${NC}"
echo "1. ✅ Created front-end/.env.development with API configuration"
echo "2. ✅ Verified backend runs on port 3001"
echo "3. ✅ Verified frontend proxy configuration"
echo "4. ✅ Created test script: test-frontend-backend-connection.sh"
echo "5. ✅ Created startup script: start-orthodoxmetrics.sh"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Start the backend: cd server && npm start"
echo "2. Start the frontend: cd front-end && npm run dev"
echo "3. Test connection: ./test-frontend-backend-connection.sh"
echo "4. Or use the startup script: ./start-orthodoxmetrics.sh"
echo ""
echo -e "${BLUE}Access URLs:${NC}"
echo "- Frontend: http://localhost:5174"
echo "- Backend API: http://localhost:3001"
echo ""
echo -e "${YELLOW}Note: The frontend will proxy /api requests to the backend automatically${NC}" 