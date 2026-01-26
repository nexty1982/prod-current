#!/bin/bash
#
# Scans for duplicate directories with similar names (e.g., frontend vs front-end)
#
# Usage:
#   ./check-duplicate-directories.sh [path] [depth]
#
# Examples:
#   ./check-duplicate-directories.sh /var/www/orthodoxmetrics/prod
#   ./check-duplicate-directories.sh . 3

set -euo pipefail

# Default values
ROOT_PATH="${1:-.}"
MAX_DEPTH="${2:-2}"

# Known correct directory names (from the rule)
declare -A KNOWN_CORRECT=(
    ["front-end"]="frontend"
    ["backend"]="backend"
    ["server"]="server"
    ["services"]="services"
    ["tools"]="tools"
    ["docs"]="docs"
    ["public"]="public"
    ["config"]="config"
    ["scripts"]="scripts"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Function to normalize directory names for comparison
normalize_name() {
    local name="$1"
    # Remove hyphens, underscores, spaces, convert to lowercase
    echo "$name" | tr '[:upper:]' '[:lower:]' | tr -d '[-_ ]'
}

# Function to check if two directory names are similar
test_similar_names() {
    local name1="$1"
    local name2="$2"
    
    local norm1=$(normalize_name "$name1")
    local norm2=$(normalize_name "$name2")
    
    # Exact match after normalization
    if [ "$norm1" = "$norm2" ] && [ "$name1" != "$name2" ]; then
        return 0
    fi
    
    # Check if one contains the other (with some tolerance)
    if [ ${#norm1} -gt 3 ] && [ ${#norm2} -gt 3 ]; then
        if [[ "$norm1" == *"$norm2"* ]] || [[ "$norm2" == *"$norm1"* ]]; then
            # Check similarity (simple length-based check)
            local shorter="${norm1}"
            local longer="${norm2}"
            if [ ${#norm1} -gt ${#norm2} ]; then
                shorter="${norm2}"
                longer="${norm1}"
            fi
            local shorter_len=${#shorter}
            local longer_len=${#longer}
            # Check if at least 80% similar
            if [ $((shorter_len * 100 / longer_len)) -ge 80 ]; then
                return 0
            fi
        fi
    fi
    
    return 1
}

echo -e "${CYAN}Scanning for duplicate directories in: $ROOT_PATH${NC}"
echo -e "${CYAN}Maximum depth: $MAX_DEPTH\n${NC}"

# Collect all directories
declare -a ALL_DIRS=()
declare -a DIR_NAMES=()
declare -a DIR_PATHS=()

collect_directories() {
    local current_path="$1"
    local current_depth="$2"
    
    if [ "$current_depth" -gt "$MAX_DEPTH" ]; then
        return
    fi
    
    # Find directories, handle errors gracefully
    while IFS= read -r -d '' dir; do
        local dir_name=$(basename "$dir")
        local relative_path="${dir#$ROOT_PATH/}"
        if [ "$relative_path" = "$dir" ]; then
            relative_path="$dir_name"
        fi
        
        ALL_DIRS+=("$dir_name|$dir|$relative_path")
        DIR_NAMES+=("$dir_name")
        DIR_PATHS+=("$dir")
        
        # Recurse if not at max depth
        if [ "$current_depth" -lt "$MAX_DEPTH" ]; then
            collect_directories "$dir" $((current_depth + 1))
        fi
    done < <(find "$current_path" -mindepth 1 -maxdepth 1 -type d -print0 2>/dev/null || true)
}

collect_directories "$ROOT_PATH" 0

total_dirs=${#ALL_DIRS[@]}
echo -e "${GREEN}Found $total_dirs directories to analyze\n${NC}"

# Find potential duplicates
declare -a DUPLICATE_GROUPS=()
declare -a PROCESSED=()

for ((i=0; i<${#ALL_DIRS[@]}; i++)); do
    IFS='|' read -r name1 path1 rel1 <<< "${ALL_DIRS[$i]}"
    
    # Skip if already processed
    if [[ " ${PROCESSED[@]} " =~ " ${name1} " ]]; then
        continue
    fi
    
    declare -a similar=("$name1|$path1|$rel1")
    
    for ((j=i+1; j<${#ALL_DIRS[@]}; j++)); do
        IFS='|' read -r name2 path2 rel2 <<< "${ALL_DIRS[$j]}"
        
        if test_similar_names "$name1" "$name2"; then
            similar+=("$name2|$path2|$rel2")
        fi
    done
    
    if [ ${#similar[@]} -gt 1 ]; then
        DUPLICATE_GROUPS+=("${similar[*]}")
        for item in "${similar[@]}"; do
            IFS='|' read -r n p r <<< "$item"
            PROCESSED+=("$n")
        done
    fi
done

# Report results
if [ ${#DUPLICATE_GROUPS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ No duplicate directories found!${NC}"
    exit 0
fi

echo -e "${YELLOW}⚠️  Found ${#DUPLICATE_GROUPS[@]} potential duplicate directory groups:\n${NC}"

group_num=1
for group in "${DUPLICATE_GROUPS[@]}"; do
    echo -e "${YELLOW}Group $group_num : Similar directory names found${NC}"
    echo "============================================================"
    
    read -ra items <<< "$group"
    for item in "${items[@]}"; do
        IFS='|' read -r name path rel <<< "$item"
        
        is_known_correct=false
        recommendation=""
        
        # Check against known correct names
        for correct_name in "${!KNOWN_CORRECT[@]}"; do
            norm_current=$(normalize_name "$name")
            norm_correct=$(normalize_name "$correct_name")
            
            if [ "$norm_current" = "$norm_correct" ]; then
                if [ "$name" = "$correct_name" ]; then
                    is_known_correct=true
                    recommendation="✅ CORRECT"
                else
                    recommendation="❌ Should be: '$correct_name'"
                fi
                break
            fi
        done
        
        if [ -z "$recommendation" ]; then
            # Check if it's the prod directory issue
            if [ "$name" = "prod" ] && [ "$rel" = "prod" ]; then
                recommendation="❌ REMOVE: Root directory IS the prod directory (Samba share)"
            else
                recommendation="⚠️  Review needed"
            fi
        fi
        
        echo -e "  • $rel"
        echo -e "    ${GRAY}Full Path: $path${NC}"
        if [ "$is_known_correct" = true ]; then
            echo -e "    ${GREEN}Status: $recommendation${NC}"
        else
            echo -e "    ${RED}Status: $recommendation${NC}"
        fi
        echo ""
    done
    
    echo ""
    group_num=$((group_num + 1))
done

# Summary
echo "============================================================"
echo -e "${CYAN}Summary:${NC}"
echo -e "${WHITE}  Total duplicate groups found: ${#DUPLICATE_GROUPS[@]}${NC}"
echo -e "\n${CYAN}Recommendations:${NC}"
echo -e "${WHITE}  1. Review each group above${NC}"
echo -e "${WHITE}  2. Consolidate files from incorrect directories to correct ones${NC}"
echo -e "${WHITE}  3. Remove incorrect directories after verification${NC}"
echo -e "${WHITE}  4. Update any references to use the correct directory names${NC}"
echo ""

exit 1
