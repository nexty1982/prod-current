#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧠 Starting Interactive TSX Questionnaire Preview System Rebuild${NC}"
echo -e "${BLUE}================================================================${NC}"

# Navigate to frontend directory
echo -e "${YELLOW}📁 Navigating to frontend directory...${NC}"
cd front-end || {
    echo -e "${RED}❌ Error: frontend directory not found${NC}"
    exit 1
}

# Clean previous build
echo -e "${YELLOW}🧹 Cleaning previous build artifacts...${NC}"
rm -rf node_modules package-lock.json dist || echo -e "${YELLOW}⚠️  Some files might not exist${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies with legacy peer deps...${NC}"
export NODE_OPTIONS="--max-old-space-size=4096"
npm install --legacy-peer-deps

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: npm install failed${NC}"
    exit 1
fi

# Build the project
echo -e "${YELLOW}🔨 Building the project...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Build failed${NC}"
    exit 1
fi

# Verify key files
echo -e "${YELLOW}🔍 Verifying new questionnaire components...${NC}"

FRONTEND_FILES=(
    "src/components/admin/QuestionnairePreview.tsx"
    "src/components/admin/OMBigBook.tsx"
    "src/components/admin/UploadedFileList.tsx"
    "src/components/admin/BigBookConsolePage.tsx"
)

BACKEND_FILES=(
    "../server/utils/questionnaireParser.js"
    "../server/routes/bigbook.js"
    "../server/database/schema.sql"
)

echo -e "${BLUE}Frontend Components:${NC}"
for file in "${FRONTEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file${NC}"
    fi
done

echo -e "${BLUE}Backend Components:${NC}"
for file in "${BACKEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file${NC}"
    fi
done

# Check dist folder
if [ -d "dist" ]; then
    echo -e "${GREEN}✅ Build output directory exists${NC}"
    echo -e "${BLUE}📊 Build size: $(du -sh dist | cut -f1)${NC}"
else
    echo -e "${RED}❌ Build output directory missing${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Interactive TSX Questionnaire Preview System rebuild completed successfully!${NC}"
echo -e "${PURPLE}📋 Summary of new features:${NC}"
echo -e "${PURPLE}   • TSX questionnaire file detection and parsing${NC}"
echo -e "${PURPLE}   • Secure sandboxed component rendering in iframe${NC}"
echo -e "${PURPLE}   • Preview button for questionnaire files in console${NC}"
echo -e "${PURPLE}   • Form submission and response storage${NC}"
echo -e "${PURPLE}   • Database schema for survey responses${NC}"
echo -e "${PURPLE}   • Security validation and content sandboxing${NC}"
echo -e "${PURPLE}   • Real-time response collection and display${NC}"

echo ""
echo -e "${BLUE}🗂️  Sample questionnaire available at:${NC}"
echo -e "${YELLOW}   sample-questionnaires/Grade6-8_Personality_Questionnaire.tsx${NC}"

echo ""
echo -e "${BLUE}🔧 Next steps:${NC}"
echo -e "${YELLOW}   1. Upload the sample questionnaire to test the system${NC}"
echo -e "${YELLOW}   2. Click the Preview button (psychology icon) to test rendering${NC}"
echo -e "${YELLOW}   3. Fill out the questionnaire and submit responses${NC}"
echo -e "${YELLOW}   4. Check the database for stored responses${NC}"

echo -e "${GREEN}✨ Ready to use the Interactive TSX Questionnaire Preview System!${NC}" 