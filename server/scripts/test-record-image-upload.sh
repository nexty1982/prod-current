#!/bin/bash
# Test script for POST /api/admin/churches/:id/record-images endpoint
# 
# Usage:
#   ./test-record-image-upload.sh <churchId> <imagePath> [type] [sessionCookie]
#
# Example:
#   ./test-record-image-upload.sh 46 ./test-image.png baptism "connect.sid=abc123..."

set -e

CHURCH_ID="${1:-46}"
IMAGE_PATH="${2:-./test-image.png}"
TYPE="${3:-baptism}"
SESSION_COOKIE="${4:-}"

if [ ! -f "$IMAGE_PATH" ]; then
  echo "❌ Error: Image file not found: $IMAGE_PATH"
  exit 1
fi

BASE_URL="${BASE_URL:-http://127.0.0.1:3001}"
ENDPOINT="${BASE_URL}/api/admin/churches/${CHURCH_ID}/record-images?type=${TYPE}"

echo "🧪 Testing record image upload endpoint"
echo "   Church ID: $CHURCH_ID"
echo "   Type: $TYPE"
echo "   Image: $IMAGE_PATH"
echo "   Endpoint: $ENDPOINT"
echo ""

if [ -n "$SESSION_COOKIE" ]; then
  echo "📤 Uploading with session cookie..."
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Cookie: $SESSION_COOKIE" \
    -F "image=@$IMAGE_PATH" \
    -F "type=$TYPE" \
    "$ENDPOINT")
else
  echo "📤 Uploading without session (should return 401)..."
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -F "image=@$IMAGE_PATH" \
    -F "type=$TYPE" \
    "$ENDPOINT")
fi

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo ""
echo "📥 Response:"
echo "   HTTP Status: $HTTP_CODE"
echo "   Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
  echo "✅ Upload successful!"
  exit 0
elif [ "$HTTP_CODE" -eq 401 ]; then
  echo "⚠️  Authentication required (expected if no session cookie provided)"
  exit 0
else
  echo "❌ Upload failed with status $HTTP_CODE"
  exit 1
fi

