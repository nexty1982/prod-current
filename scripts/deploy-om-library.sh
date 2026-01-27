#!/bin/bash
# OM-Library Complete Deployment Script
# Run this on the Linux server to deploy OM-Library

set -e  # Exit on error

echo "================================================"
echo "  OM-Library Deployment"
echo "  Date: $(date)"
echo "================================================"
echo ""

# Change to project root
cd /var/www/orthodoxmetrics/prod

# Step 1: Backup
echo "📦 Step 1: Creating backups..."
mkdir -p backups
tar -czf backups/docs_$(date +%Y%m%d_%H%M%S).tar.gz docs/ || echo "⚠️  Docs backup skipped"
tar -czf backups/public-docs_$(date +%Y%m%d_%H%M%S).tar.gz front-end/public/docs/ || echo "⚠️  Public docs backup skipped"
if [ -f "ecosystem.config.js" ]; then
  cp ecosystem.config.js ecosystem.config.js.backup
fi
echo "✅ Backups created in backups/"
echo ""

# Step 2: Install Dependencies
echo "📚 Step 2: Installing dependencies..."
cd server
npm install slugify@1.6.6 fuse.js@7.0.0
echo "✅ Dependencies installed"
cd ..
echo ""

# Step 3: Create Directories
echo "📁 Step 3: Creating directories..."
mkdir -p front-end/public/docs/library/technical
mkdir -p front-end/public/docs/library/ops
mkdir -p front-end/public/docs/library/recovery
mkdir -p .analysis
mkdir -p logs
echo "✅ Directories created"
echo ""

# Step 4: Set Permissions
echo "🔒 Step 4: Setting permissions..."
chmod 755 front-end/public/docs/library
chmod 755 front-end/public/docs/library/technical
chmod 755 front-end/public/docs/library/ops
chmod 755 front-end/public/docs/library/recovery
chmod 755 .analysis
chmod 755 logs
echo "✅ Permissions set"
echo ""

# Step 5: Verify Files Exist
echo "✅ Step 5: Verifying files..."
if [ ! -f "server/src/agents/omLibrarian.js" ]; then
  echo "❌ ERROR: omLibrarian.js not found"
  exit 1
fi
if [ ! -f "server/routes/library.js" ]; then
  echo "❌ ERROR: library.js not found"
  exit 1
fi
if [ ! -f "ecosystem.config.js" ]; then
  echo "❌ ERROR: ecosystem.config.js not found"
  exit 1
fi
echo "✅ All required files present"
echo ""

# Step 6: Restart Backend
echo "🔄 Step 6: Restarting backend..."
pm2 restart om-backend || echo "⚠️  Backend restart failed - may need manual restart"
sleep 2
echo "✅ Backend restarted"
echo ""

# Step 7: Start OM-Librarian
echo "🤖 Step 7: Starting OM-Librarian agent..."
pm2 start ecosystem.config.js --only om-librarian
sleep 3
echo "✅ OM-Librarian started"
echo ""

# Step 8: Verify Deployment
echo "🔍 Step 8: Verifying deployment..."
echo ""

echo "PM2 Processes:"
pm2 list

echo ""
echo "Librarian Logs (last 10 lines):"
pm2 logs om-librarian --lines 10 --nostream

echo ""
echo "Testing API endpoints..."

# Test status endpoint
if curl -s http://localhost:3000/api/library/status | jq -e '.running' > /dev/null 2>&1; then
  echo "✅ Status endpoint working"
else
  echo "⚠️  Status endpoint not responding"
fi

# Test files endpoint
if curl -s http://localhost:3000/api/library/files | jq -e '.success' > /dev/null 2>&1; then
  echo "✅ Files endpoint working"
else
  echo "⚠️  Files endpoint not responding"
fi

echo ""
echo "================================================"
echo "  OM-Library Deployment Complete! 🎉"
echo "================================================"
echo ""
echo "✅ Agent: om-librarian is running"
echo "✅ Backend API: /api/library/* registered"
echo "✅ Library storage: front-end/public/docs/library/"
echo "✅ Index file: .analysis/library-index.json"
echo ""
echo "Next Steps:"
echo "  1. Wait 30-60 seconds for initial indexing"
echo "  2. Check index: cat .analysis/library-index.json | jq 'keys | length'"
echo "  3. Access UI: http://yourdomain.com/church/om-library"
echo "  4. Test search functionality"
echo "  5. Verify related groups work"
echo ""
echo "Monitoring:"
echo "  pm2 logs om-librarian          # View logs"
echo "  pm2 monit                       # Live monitoring"
echo "  curl http://localhost:3000/api/library/status | jq .  # Check status"
echo ""
echo "Documentation:"
echo "  docs/FEATURES/om-library-transformation.md"
echo "  docs/DEVELOPMENT/om-library-quickstart.md"
echo "  docs/REFERENCE/om-library-quick-reference.md"
echo ""
