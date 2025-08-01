#!/bin/bash

# AI Backend Connection Rebuild Script
# Connects AI Administration Panel to OrthodoxMetrics backend

echo "🔧 Rebuilding AI Backend Connection..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Navigate to front-end directory
cd front-end

echo -e "${BLUE}📁 Cleaning previous build...${NC}"
rm -rf node_modules package-lock.json dist

echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install --legacy-peer-deps

echo -e "${BLUE}🔨 Building frontend with AI backend connection...${NC}"
NODE_OPTIONS="--max-old-space-size=4096" npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ AI Backend Connection rebuild completed successfully!${NC}"
    echo -e "${YELLOW}🎯 New Features:${NC}"
    echo -e "   • AI Administration Panel now connects to OrthodoxMetrics backend"
    echo -e "   • Real-time metrics from /api/ai/metrics"
    echo -e "   • AI service status from /api/ai/status"
    echo -e "   • Content generation via /api/ai/content/generate"
    echo -e "   • OCR processing via /api/ai/ocr/process"
    echo -e "   • Translation via /api/ai/translate/start"
    echo -e "   • Deployment automation via /api/ai/deploy/run"
    echo -e "   • Log analysis via /api/ai/logs/analyze"
    echo -e "   • Auto-learning OCR via /api/ai/ocr-learning/*"
    echo -e "${YELLOW}🔧 Backend Changes:${NC}"
    echo -e "   • New AI routes in server/routes/ai.js"
    echo -e "   • AI router mounted at /api/ai"
    echo -e "   • OMAI integration for AI services"
    echo -e "   • Role-based access control for AI endpoints"
else
    echo -e "${RED}❌ AI Backend Connection rebuild failed!${NC}"
    exit 1
fi 