#!/bin/bash

# === CONFIGURATION ===
ARSENAL_MD="./orthodoxmetrics-js-arsenal.md"
BUNDLE_DIR="./prod/bundle"
LOG_FILE="$BUNDLE_DIR/bundle.log"

# === PREP ===
mkdir -p "$BUNDLE_DIR"
echo "🔄 Starting bundle process..." > "$LOG_FILE"

# === PARSE AND COPY ===
echo "📁 Collecting files from: $ARSENAL_MD"

grep -oP '(?<=\* \[\`).*?\.js' "$ARSENAL_MD" | while read -r REL_PATH; do
    # Strip potential path hints
    FILE_PATH=$(find . -type f -name "$(basename "$REL_PATH")" | head -n 1)

    if [[ -f "$FILE_PATH" ]]; then
        DEST="$BUNDLE_DIR/$(basename "$FILE_PATH")"
        cp -u "$FILE_PATH" "$DEST"
        echo "✅ Copied: $FILE_PATH" >> "$LOG_FILE"
    else
        echo "❌ Not Found: $REL_PATH" >> "$LOG_FILE"
    fi
done

echo "✅ Bundle complete. Files are in $BUNDLE_DIR"
