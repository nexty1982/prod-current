#!/bin/bash

# ------------------------------------------
# Orthodox Metrics Screenshot Capture Runner
# Tasks: 131, 132
# Description: Executes Puppeteer-based screenshot capture scripts
# Location: /a/prod/scripts/
# ------------------------------------------

echo "🎯 OrthodoxMetrics Task Completion Protocol"
echo "📸 Executing screenshot capture for completed tasks..."

# Task 132 - Blog System Screenshots
echo ""
echo "🔄 Processing Task 132 - Blog System Screenshots..."
TASK132_SCRIPT_DIR="/a/prod/tasks/scripts"
TASK132_SCRIPT_NAME="generate-task-screenshots.sh"

cd "$TASK132_SCRIPT_DIR" || {
  echo "❌ Failed to change directory to $TASK132_SCRIPT_DIR"
  exit 1
}

chmod +x "$TASK132_SCRIPT_NAME"
./"$TASK132_SCRIPT_NAME" 132

if [ $? -eq 0 ]; then
  echo "✅ Task 132 screenshot capture completed successfully."
else
  echo "❌ Task 132 screenshot capture failed."
fi

# Task 131 - OMSiteSurvey Screenshots  
echo ""
echo "🔄 Processing Task 131 - OMSiteSurvey Screenshots..."
TASK131_SCRIPT_DIR="/a/prod/scripts"
TASK131_SCRIPT_NAME="capture-task131-screenshots.js"

cd "$TASK131_SCRIPT_DIR" || {
  echo "❌ Failed to change directory to $TASK131_SCRIPT_DIR"
  exit 1
}

node "$TASK131_SCRIPT_NAME"

if [ $? -eq 0 ]; then
  echo "✅ Task 131 screenshot capture completed successfully."
else
  echo "❌ Task 131 screenshot capture failed."
fi

echo ""
echo "🎉 Task completion protocol finished!"
echo "📁 Check screenshots/ directory for generated files"
