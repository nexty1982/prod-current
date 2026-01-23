#!/bin/bash
# Verification script for Gallery image paths
# Tests that /images/<dir>/<file> resolves correctly for all 6 canonical directories

BASE_URL="${1:-http://localhost:5174}"
CANONICAL_DIRS=("logos" "backgrounds" "icons" "ui" "records" "misc")

echo "🔍 Verifying Gallery Image Paths"
echo "📍 Base URL: $BASE_URL"
echo ""

# Test files for each directory (first file found)
TEST_FILES=(
  "logos/biz-logo.png"
  "backgrounds/bgtiled1.png"
  "icons/baptism.png"
  "ui/components.png"
  "records/baptism.png"
  "misc/placeholder.png"
)

PASSED=0
FAILED=0

for test_file in "${TEST_FILES[@]}"; do
  dir=$(dirname "$test_file")
  file=$(basename "$test_file")
  url="$BASE_URL/images/$test_file"
  
  echo "Testing: /images/$test_file"
  
  # Get HTTP status and content type
  response=$(curl -s -o /dev/null -w "%{http_code}|%{content_type}" "$url" 2>&1)
  
  if [ $? -eq 0 ]; then
    http_code=$(echo "$response" | cut -d'|' -f1)
    content_type=$(echo "$response" | cut -d'|' -f2)
    
    if [ "$http_code" = "200" ]; then
      if [[ "$content_type" == image/* ]] || [[ "$content_type" == image/svg+xml ]]; then
        echo "  ✅ HTTP $http_code - $content_type"
        ((PASSED++))
      else
        echo "  ❌ HTTP $http_code - Wrong Content-Type: $content_type (expected image/*)"
        ((FAILED++))
      fi
    else
      echo "  ❌ HTTP $http_code (expected 200)"
      ((FAILED++))
    fi
  else
    echo "  ❌ Request failed: $response"
    ((FAILED++))
  fi
  echo ""
done

echo "═══════════════════════════════════════"
echo "📊 Summary: $PASSED passed, $FAILED failed"
echo "═══════════════════════════════════════"

if [ $FAILED -eq 0 ]; then
  echo "✅ All image path checks passed!"
  exit 0
else
  echo "❌ Some checks failed. See details above."
  exit 1
fi
