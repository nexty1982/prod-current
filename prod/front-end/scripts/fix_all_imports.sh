#!/bin/bash

echo "Building file location map..."

# Create a map of all TypeScript/TSX files and their paths
declare -A file_map
while IFS= read -r file; do
    basename_file=$(basename "$file" | sed 's/\.[^.]*$//')
    file_map["$basename_file"]="$file"
done < <(find src -type f \( -name "*.tsx" -o -name "*.ts" \) | grep -v node_modules)

echo "Found ${#file_map[@]} unique files"

# Function to get correct relative path from source to target
get_relative_path() {
    source_dir=$(dirname "$1")
    target_file="$2"
    
    # Calculate relative path from source to target
    realpath --relative-to="$source_dir" "$target_file" | sed 's/\.[^.]*$//'
}

# Fix imports in all files
echo "Scanning and fixing imports..."

find src -type f \( -name "*.tsx" -o -name "*.ts" \) | while read -r file; do
    echo "Checking: $file"
    
    # Extract all imports from the file
    grep -E "^import .* from ['\"]" "$file" | while IFS= read -r import_line; do
        # Extract the import path
        import_path=$(echo "$import_line" | sed -n "s/.*from ['\"]\\([^'\"]*\\)['\"].*/\\1/p")
        
        # Skip external modules (not starting with . or /)
        if [[ ! "$import_path" =~ ^\.\.?\/ ]]; then
            continue
        fi
        
        # Extract just the filename without extension and path
        import_name=$(basename "$import_path" | sed 's/\.[^.]*$//')
        
        # Check if this file exists in our map
        if [[ -n "${file_map[$import_name]}" ]]; then
            target_file="${file_map[$import_name]}"
            correct_path=$(get_relative_path "$file" "$target_file")
            
            # Only fix if paths are different
            if [[ "$import_path" != "$correct_path" ]]; then
                echo "  Fixing: $import_path -> $correct_path"
                # Escape special characters for sed
                escaped_old=$(printf '%s\n' "$import_path" | sed 's/[[\.*^$()+?{|]/\\&/g')
                escaped_new=$(printf '%s\n' "$correct_path" | sed 's/[[\.*^$()+?{|]/\\&/g')
                sed -i "s|from ['\"]\($escaped_old\)['\"]|from '\1'|g" "$file"
                sed -i "s|from '\($escaped_old\)'|from '$correct_path'|g" "$file"
                sed -i "s|from \"\($escaped_old\)\"|from \"$correct_path\"|g" "$file"
            fi
        fi
    done
done

echo "Import fixes completed!"
