#!/usr/bin/env python3
"""
Scans for duplicate directories with similar names (e.g., frontend vs front-end)

Usage:
    python check-duplicate-directories.py [path] [depth]

Examples:
    python check-duplicate-directories.py /var/www/orthodoxmetrics/prod
    python check-duplicate-directories.py . 3
"""

import os
import sys
from pathlib import Path
from typing import List, Dict, Tuple
from collections import defaultdict

# Known correct directory names (from the rule)
KNOWN_CORRECT = {
    "front-end": "frontend",
    "backend": "backend",
    "server": "server",
    "services": "services",
    "tools": "tools",
    "docs": "docs",
    "public": "public",
    "config": "config",
    "scripts": "scripts",
}


def normalize_name(name: str) -> str:
    """Normalize directory names for comparison."""
    # Remove hyphens, underscores, spaces, convert to lowercase
    return name.lower().replace("-", "").replace("_", "").replace(" ", "")


def test_similar_names(name1: str, name2: str) -> bool:
    """Check if two directory names are similar."""
    norm1 = normalize_name(name1)
    norm2 = normalize_name(name2)
    
    # Exact match after normalization
    if norm1 == norm2 and name1 != name2:
        return True
    
    # Check if one contains the other (with some tolerance)
    if len(norm1) > 3 and len(norm2) > 3:
        if norm1 in norm2 or norm2 in norm1:
            # Check if at least 80% similar
            shorter = norm1 if len(norm1) < len(norm2) else norm2
            longer = norm1 if len(norm1) >= len(norm2) else norm2
            similarity = len(shorter) / len(longer)
            if similarity >= 0.8:
                return True
    
    return False


def collect_directories(root_path: Path, max_depth: int, current_depth: int = 0) -> List[Tuple[str, Path, str]]:
    """Recursively collect all directories up to max_depth."""
    directories = []
    
    if current_depth > max_depth:
        return directories
    
    try:
        root_str = str(root_path.resolve())
        for item in root_path.iterdir():
            if item.is_dir():
                try:
                    relative_path = str(item.relative_to(root_path))
                    directories.append((item.name, item, relative_path))
                    
                    # Recurse if not at max depth
                    if current_depth < max_depth:
                        directories.extend(
                            collect_directories(item, max_depth, current_depth + 1)
                        )
                except (PermissionError, OSError):
                    # Skip directories we can't access
                    continue
    except (PermissionError, OSError):
        pass
    
    return directories


def get_recommendation(name: str, relative_path: str) -> Tuple[str, bool]:
    """Get recommendation for a directory name."""
    norm_name = normalize_name(name)
    
    # Check against known correct names
    for correct_name in KNOWN_CORRECT.keys():
        norm_correct = normalize_name(correct_name)
        if norm_name == norm_correct:
            if name == correct_name:
                return "✅ CORRECT", True
            else:
                return f"❌ Should be: '{correct_name}'", False
    
    # Check if it's the prod directory issue
    if name == "prod" and relative_path == "prod":
        return "❌ REMOVE: Root directory IS the prod directory (Samba share)", False
    
    return "⚠️  Review needed", False


def main():
    root_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    max_depth = int(sys.argv[2]) if len(sys.argv) > 2 else 2
    
    print(f"\033[0;36mScanning for duplicate directories in: {root_path}\033[0m")
    print(f"\033[0;36mMaximum depth: {max_depth}\n\033[0m")
    
    # Collect all directories
    all_dirs = collect_directories(root_path, max_depth)
    
    print(f"\033[0;32mFound {len(all_dirs)} directories to analyze\n\033[0m")
    
    # Find potential duplicates
    duplicate_groups = []
    processed = set()
    
    for i, (name1, path1, rel1) in enumerate(all_dirs):
        if name1 in processed:
            continue
        
        similar = [(name1, path1, rel1)]
        
        for j in range(i + 1, len(all_dirs)):
            name2, path2, rel2 = all_dirs[j]
            if test_similar_names(name1, name2):
                similar.append((name2, path2, rel2))
        
        if len(similar) > 1:
            duplicate_groups.append(similar)
            for name, _, _ in similar:
                processed.add(name)
    
    # Report results
    if not duplicate_groups:
        print("\033[0;32m✅ No duplicate directories found!\033[0m")
        return 0
    
    print(f"\033[1;33m⚠️  Found {len(duplicate_groups)} potential duplicate directory groups:\n\033[0m")
    
    for group_num, group in enumerate(duplicate_groups, 1):
        print(f"\033[1;33mGroup {group_num} : Similar directory names found\033[0m")
        print("=" * 60)
        
        for name, path, rel in group:
            recommendation, is_correct = get_recommendation(name, rel)
            
            print(f"  • {rel}")
            print(f"    \033[0;37mFull Path: {path}\033[0m")
            color = "\033[0;32m" if is_correct else "\033[0;31m"
            print(f"    {color}Status: {recommendation}\033[0m")
            print()
        
        print()
    
    # Summary
    print("=" * 60)
    print("\033[0;36mSummary:\033[0m")
    print(f"\033[1;37m  Total duplicate groups found: {len(duplicate_groups)}\033[0m")
    print("\n\033[0;36mRecommendations:\033[0m")
    print("\033[1;37m  1. Review each group above\033[0m")
    print("\033[1;37m  2. Consolidate files from incorrect directories to correct ones\033[0m")
    print("\033[1;37m  3. Remove incorrect directories after verification\033[0m")
    print("\033[1;37m  4. Update any references to use the correct directory names\033[0m")
    print()
    
    return 1


if __name__ == "__main__":
    sys.exit(main())
