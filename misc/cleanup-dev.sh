#!/bin/bash
# OrthodoxMetrics /dev Cleanup Script
# Purpose: Consolidate directories, clean up root, and pair omai + bigbook

set -e

echo "🔧 Starting /dev directory refactor..."

# Create backup of existing omai directory if it exists
if [ -d omai ]; then
  echo "📦 Backing up existing omai directory..."
  mv omai omai-backup
fi

# Move OMAI-related components into /dev/omai
mkdir -p omai/{bigbook,data,database,services,ocr-results,logs,scripts,configs}

# Restore any existing omai files to configs
if [ -d omai-backup ]; then
  mv omai-backup/* omai/configs/
  rmdir omai-backup
fi

# Move top-level directories into omai
if [ -d bigbook ]; then mv bigbook omai/bigbook; fi
if [ -d data ]; then mv data omai/data; fi
if [ -d database ]; then mv database omai/database; fi
if [ -d ocr-results ]; then mv ocr-results omai/ocr-results; fi
if [ -d services ]; then mv services omai/services; fi
if [ -d logs ]; then mv logs omai/logs; fi
if [ -d scripts ]; then mv scripts omai/scripts; fi

# Merge configs and config into omai/configs
if [ -d config ]; then mv config/* omai/configs/ && rmdir config; fi
if [ -d configs ]; then mv configs/* omai/configs/ && rmdir configs; fi
if [ -f paths.config.example ]; then mv paths.config.example omai/configs/; fi

# Clean up top-level files and move to misc (only if they exist)
mkdir -p misc
if [ -f AI-agent-workspace.txt ]; then mv AI-agent-workspace.txt misc/; fi
if [ -f demo.html ]; then mv demo.html misc/; fi
if [ -f api-route-frontend.md ]; then mv api-route-frontend.md misc/; fi
if [ -f api-routes-viewer.tsx ]; then mv api-routes-viewer.tsx misc/; fi
if [ -f README-FIRST.md ]; then mv README-FIRST.md misc/; fi
if [ -f README-SECOND.md ]; then mv README-SECOND.md misc/; fi
mv *_REBRANDING_COMPLETE.md misc/ 2>/dev/null || true
mv *.log misc/ 2>/dev/null || true

# Remove unused root-level package files if not needed
if [ -f package.json ] && grep -q '"name": "ssppoc-server"' package.json; then
  echo "📦 Keeping package.json (in use by server)"
else
  echo "🗑️ Removing unused package.json and package-lock.json"
  rm -f package.json package-lock.json
fi

echo "✅ Cleanup complete. OMAI and BigBook paired in /dev/omai"
if command -v tree >/dev/null 2>&1; then
  tree omai | head -n 30
else
  find omai -type d | head -n 20
fi
