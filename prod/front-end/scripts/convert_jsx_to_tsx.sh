#!/bin/bash

# Convert all .jsx files to .tsx
echo "Converting JSX files to TSX..."

# Find all .jsx files and convert them
find front-end/src -name "*.jsx" -type f | while read -r file; do
    # Get the new filename
    newfile="${file%.jsx}.tsx"
    
    # Rename the file
    mv "$file" "$newfile"
    echo "Converted: $file -> $newfile"
    
    # Add basic TypeScript types if not already present
    # Check if the file has React import and add FC type if needed
    if grep -q "import React" "$newfile" && ! grep -q "React.FC" "$newfile"; then
        # Add React.FC type annotation to default exports
        sed -i 's/^const \([A-Za-z][A-Za-z0-9]*\) = (/const \1: React.FC = (/' "$newfile"
    fi
done

echo "Updating imports in all TypeScript/JavaScript files..."

# Update all imports from .jsx to .tsx
find front-end/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) | while read -r file; do
    # Update relative imports
    sed -i "s/from '\(.*\)\.jsx'/from '\1'/g" "$file"
    sed -i 's/from "\(.*\)\.jsx"/from "\1"/g' "$file"
    sed -i "s/import('\(.*\)\.jsx')/import('\1')/g" "$file"
    sed -i 's/import("\(.*\)\.jsx")/import("\1")/g' "$file"
done

echo "JSX to TSX conversion complete!"
