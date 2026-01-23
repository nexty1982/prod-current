#!/usr/bin/env python3
"""
OM-Recovery Suite - Analysis Module
Provides read-only analysis of filesystem: inventory, junk detection, duplicates, stale files.
"""

import os
import sys
import json
import csv
import hashlib
import time
import datetime
import shutil
import fnmatch
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set
from collections import defaultdict
import stat

# Analysis configuration
REPO_ROOT = Path("/var/www/orthodoxmetrics/prod")
ANALYSIS_ROOT = Path("/var/backups/OM/analysis")
RUNS_DIR = ANALYSIS_ROOT / "runs"
REPORT_FILE = ANALYSIS_ROOT / "report.html"
INDEX_FILE = ANALYSIS_ROOT / "index.json"

# Junk patterns (directories and files)
JUNK_PATTERNS = {
    "node_modules": ["**/node_modules/**"],
    "dist": ["**/dist/**"],
    "build": ["**/build/**"],
    "vite_cache": ["**/.vite/**"],
    "cache": ["**/.cache/**", "**/.tmp/**"],
    "cursor_backup": ["**/_cursor_session_backup/**"],
    "venv": ["**/.venv*/**", "**/.venv_image/**"],
    "logs": ["**/*.log", "**/logs/**"],
    "git": ["**/.git/**"],
    "coverage": ["**/coverage/**"],
    "backup_artifacts": ["**/*.tar.gz", "**/*.zip"],
    "large_files": [],  # Will be populated dynamically (> 50MB)
}

# File extensions for type breakdown
COMMON_EXTENSIONS = {
    ".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs",
    ".py", ".pyc", ".pyo",
    ".json", ".yaml", ".yml",
    ".html", ".css", ".scss", ".sass",
    ".md", ".txt", ".log",
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico",
    ".sql", ".db", ".sqlite",
    ".pdf", ".doc", ".docx",
    ".zip", ".tar", ".gz", ".tar.gz",
    ".mp4", ".mp3", ".avi",
}


def ensure_analysis_dirs():
    """Ensure analysis directories exist."""
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    ANALYSIS_ROOT.mkdir(parents=True, exist_ok=True)


def normalize_path_to_posix(path_str: str) -> str:
    """Normalize a path to POSIX style (forward slashes) regardless of OS."""
    # Convert Windows-style backslashes to forward slashes
    return path_str.replace(os.sep, "/").replace("\\", "/")


def normalize_pattern(pattern: str) -> str:
    """Normalize a pattern for matching (POSIX style, handle **)."""
    # Strip leading "./" if present
    pattern = pattern.lstrip("./")
    
    # Convert to POSIX style
    pattern = normalize_path_to_posix(pattern)
    
    # Handle trailing "/" - convert to "/**" for directory matching
    if pattern.endswith("/"):
        pattern = pattern.rstrip("/") + "/**"
    
    # Convert ** to * for fnmatch (simple approach - ** matches any sequence)
    # For patterns like **/node_modules/**, we want to match node_modules anywhere
    pattern = pattern.replace("**", "*")
    
    return pattern


def should_exclude(rel_posix_path: str, patterns: List[str]) -> bool:
    """
    Check if a path should be excluded based on patterns.
    Uses deterministic matching with fast-path for directory excludes.
    
    Also checks OM-Ops hard exclusions first (mandatory).
    
    Args:
        rel_posix_path: Relative path in POSIX format (forward slashes)
        patterns: List of exclusion patterns (may contain **, *, etc.)
    
    Returns:
        True if path matches any exclusion pattern or hard exclusion
    """
    # Check hard exclusions first (mandatory)
    if HARD_EXCLUSIONS_AVAILABLE:
        # Convert relative POSIX path to absolute for hard exclusion check
        try:
            # Try to resolve as relative to repo root
            abs_path = str(REPO_ROOT / rel_posix_path)
            if is_hard_excluded(abs_path, "analysis"):
                return True
        except Exception:
            # If conversion fails, try direct check
            if is_hard_excluded(rel_posix_path, "analysis"):
                return True
    
    # Ensure path doesn't start with "./"
    rel_posix_path = rel_posix_path.lstrip("./")
    
    # Normalize path to POSIX
    rel_posix_path = normalize_path_to_posix(rel_posix_path)
    
    # Fast path: check if any path component contains excluded directory names
    # This handles patterns like **/node_modules/** efficiently
    path_parts = rel_posix_path.split("/")
    
    for pattern in patterns:
        # Fast path: directory name contains check (e.g., "/node_modules/" in path)
        if "**/" in pattern and "/**" in pattern:
            # Extract directory name from pattern like "**/node_modules/**"
            dir_name = pattern.split("**/")[-1].split("/**")[0]
            if dir_name and dir_name in path_parts:
                return True
        
        # Normalize pattern for fnmatch
        normalized_pattern = normalize_pattern(pattern)
        
        # Test exact match
        if fnmatch.fnmatch(rel_posix_path, normalized_pattern):
            return True
        
        # Test directory match (with trailing /)
        rel_posix_path_dir = rel_posix_path + "/"
        if fnmatch.fnmatch(rel_posix_path_dir, normalized_pattern):
            return True
        
        # For patterns like **/something, check if path ends with or contains it
        if normalized_pattern.startswith("*/") or normalized_pattern.startswith("*"):
            # Remove leading wildcard
            pattern_suffix = normalized_pattern.lstrip("*").lstrip("/")
            if pattern_suffix:
                # Check if any suffix of the path matches
                for i in range(len(path_parts)):
                    test_path = "/".join(path_parts[i:])
                    if fnmatch.fnmatch(test_path, normalized_pattern) or \
                       fnmatch.fnmatch(test_path, pattern_suffix) or \
                       fnmatch.fnmatch("/" + test_path, normalized_pattern):
                        return True
        
        # For file glob patterns (*.log, *.tar.gz), use fnmatch directly
        if "*" in normalized_pattern and "/" not in normalized_pattern:
            # Simple file pattern
            if fnmatch.fnmatch(rel_posix_path.split("/")[-1], normalized_pattern):
                return True
    
    return False


def matches_pattern(path: Path, patterns: List[str]) -> bool:
    """
    Legacy wrapper for should_exclude (for backward compatibility).
    Converts Path to relative POSIX string and calls should_exclude.
    """
    # Convert Path to relative string
    try:
        # Try to get relative path if possible
        path_str = str(path)
    except Exception:
        path_str = str(path)
    
    return should_exclude(path_str, patterns)


def classify_junk(path: Path, size: int) -> Optional[str]:
    """Classify a file/directory as junk and return category."""
    for category, patterns in JUNK_PATTERNS.items():
        if matches_pattern(path, patterns):
            return category
    
    # Check for large files (> 50MB)
    if size > 50 * 1024 * 1024:
        return "large_files"
    
    return None


def calculate_file_hash(file_path: Path, max_size: int = 20 * 1024 * 1024) -> Optional[str]:
    """Calculate SHA256 hash of a file, skipping if too large."""
    try:
        if file_path.stat().st_size > max_size:
            return None
        
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    except Exception:
        return None


def format_size(size_bytes: int) -> str:
    """Format bytes to human-readable size."""
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} PB"


def get_file_info(path: Path) -> Dict:
    """Get file information."""
    try:
        stat_info = path.stat()
        return {
            "path": str(path),
            "name": path.name,
            "size": stat_info.st_size,
            "mtime": stat_info.st_mtime,
            "mtime_iso": datetime.datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
            "is_dir": path.is_dir(),
            "extension": path.suffix.lower() if path.is_file() else "",
        }
    except Exception as e:
        return {
            "path": str(path),
            "name": path.name,
            "size": 0,
            "mtime": 0,
            "mtime_iso": "",
            "is_dir": False,
            "extension": "",
            "error": str(e),
        }


def analyze_directory(root_paths: List[Path], exclude_patterns: List[str] = None,
                     dedupe_mode: str = "quick", max_hash_mb: int = 20,
                     stale_days: int = 180) -> Dict:
    """
    Analyze directory structure.
    
    Args:
        root_paths: List of root paths to analyze
        exclude_patterns: Patterns to exclude from analysis
        dedupe_mode: "quick" (name+size) or "full" (hash)
        max_hash_mb: Maximum file size to hash in MB
        stale_days: Days threshold for stale files
    
    Returns:
        Analysis results dictionary
    """
    exclude_patterns = exclude_patterns or []
    max_hash_bytes = max_hash_mb * 1024 * 1024
    
    start_time = time.time()
    now = time.time()
    stale_threshold = now - (stale_days * 24 * 60 * 60)
    recent_24h = now - (24 * 60 * 60)
    recent_7d = now - (7 * 24 * 60 * 60)
    recent_30d = now - (30 * 24 * 60 * 60)
    
    # Inventory counters
    total_files = 0
    total_dirs = 0
    total_bytes = 0
    files_scanned = 0  # Total files encountered (including excluded)
    files_skipped = 0  # Files skipped due to exclusions or errors
    errors = []  # Track errors during analysis (capped at 20)
    
    # Collections
    files_by_size = []  # List of (path, size, mtime)
    dir_sizes = defaultdict(int)  # path -> total size
    file_types = defaultdict(lambda: {"count": 0, "bytes": 0})
    junk_by_category = defaultdict(lambda: {"count": 0, "bytes": 0, "paths": []})
    duplicates_by_name_size = defaultdict(list)  # (name, size) -> [paths]
    duplicates_by_hash = defaultdict(list)  # hash -> [paths]
    stale_files = []
    recent_files_24h = []
    recent_files_7d = []
    recent_files_30d = []
    large_files = []  # > 50MB
    
    # For duplicate detection
    name_size_groups = defaultdict(list)
    files_to_hash = []
    
    # For diff vs previous run
    file_index = []  # List of (path, size, mtime) for non-junk files
    
    print(f"Analyzing {len(root_paths)} root path(s)...")
    
    # Walk all root paths
    for root_path in root_paths:
        if not root_path.exists():
            print(f"Warning: Path does not exist: {root_path}")
            continue
        
        print(f"Scanning: {root_path}")
        
        for current_path, dirs, files in os.walk(root_path):
            current_path_obj = Path(current_path)
            
            # Check hard exclusions for current directory (mandatory)
            if HARD_EXCLUSIONS_AVAILABLE and is_hard_excluded(str(current_path_obj.resolve()), "analysis"):
                # Skip entire directory tree
                dirs[:] = []
                files = []
                continue
            
            # Get relative path from root for pattern matching
            try:
                rel_path = os.path.relpath(current_path, root_path)
                if rel_path == ".":
                    rel_path = ""
            except Exception:
                try:
                    rel_path = str(current_path_obj.relative_to(root_path))
                    if rel_path == ".":
                        rel_path = ""
                except Exception:
                    rel_path = ""
            
            # Normalize relative path to POSIX
            rel_path_posix = normalize_path_to_posix(rel_path) if rel_path else ""
            
            # Filter excluded directories (both hard exclusions and patterns)
            dirs[:] = [d for d in dirs if not should_exclude(
                normalize_path_to_posix(os.path.join(rel_path_posix, d)) if rel_path_posix else d,
                exclude_patterns
            )]
            
            # Process directories
            for dir_name in dirs:
                dir_rel_path = normalize_path_to_posix(
                    os.path.join(rel_path_posix, dir_name) if rel_path_posix else dir_name
                )
                if not should_exclude(dir_rel_path, exclude_patterns):
                    total_dirs += 1
            
            # Process files
            for file_name in files:
                files_scanned += 1  # Increment BEFORE any checks
                file_rel_path = normalize_path_to_posix(
                    os.path.join(rel_path_posix, file_name) if rel_path_posix else file_name
                )
                
                # Skip excluded files
                if should_exclude(file_rel_path, exclude_patterns):
                    files_skipped += 1  # Increment when excluded
                    continue
                
                # Define file_path before use
                file_path = current_path_obj / file_name
                
                try:
                    file_info = get_file_info(file_path)
                    if "error" in file_info:
                        # Track error but continue
                        if len(errors) < 20:
                            errors.append({
                                "path": str(file_path),
                                "error": file_info.get("error", "Unknown error")
                            })
                        files_skipped += 1  # Increment when file_info has error
                        continue
                    
                    size = file_info["size"]
                    mtime = file_info["mtime"]
                    ext = file_info["extension"]
                    
                    total_files += 1
                    total_bytes += size
                    
                    # Track by size
                    files_by_size.append((str(file_path), size, mtime))
                    
                    # Track directory sizes
                    parent = file_path.parent
                    dir_sizes[str(parent)] += size
                    
                    # File type breakdown
                    if ext in COMMON_EXTENSIONS:
                        file_types[ext]["count"] += 1
                        file_types[ext]["bytes"] += size
                    elif ext:
                        file_types[ext]["count"] += 1
                        file_types[ext]["bytes"] += size
                    else:
                        file_types["(no extension)"]["count"] += 1
                        file_types["(no extension)"]["bytes"] += size
                    
                    # Junk detection
                    junk_category = classify_junk(file_path, size)
                    if junk_category:
                        junk_by_category[junk_category]["count"] += 1
                        junk_by_category[junk_category]["bytes"] += size
                        if len(junk_by_category[junk_category]["paths"]) < 200:
                            junk_by_category[junk_category]["paths"].append(str(file_path))
                    
                    # Large files
                    if size > 50 * 1024 * 1024:
                        large_files.append((str(file_path), size, mtime))
                    
                    # Time-based analysis
                    if mtime < stale_threshold:
                        stale_files.append((str(file_path), size, mtime))
                    if mtime >= recent_24h:
                        recent_files_24h.append((str(file_path), size, mtime))
                    if mtime >= recent_7d:
                        recent_files_7d.append((str(file_path), size, mtime))
                    if mtime >= recent_30d:
                        recent_files_30d.append((str(file_path), size, mtime))
                    
                    # Duplicate detection - Tier 1: name + size
                    key = (file_name.lower(), size)
                    name_size_groups[key].append(str(file_path))
                    
                    # Collect files for hashing (Tier 2)
                    if dedupe_mode == "full" and size <= max_hash_bytes:
                        files_to_hash.append(file_path)
                    
                    # Track file index for diff (exclude junk)
                    if not junk_category:
                        file_index.append({
                            "path": str(file_path),
                            "size": size,
                            "mtime": mtime
                        })
                
                except (PermissionError, FileNotFoundError, OSError) as e:
                    # Track specific file access errors
                    if len(errors) < 20:
                        errors.append({
                            "path": str(file_path),
                            "error": f"{type(e).__name__}: {str(e)}"
                        })
                    files_skipped += 1
                    continue
                except Exception as e:
                    # Track unexpected errors
                    if len(errors) < 20:
                        errors.append({
                            "path": str(file_path),
                            "error": f"Unexpected error: {type(e).__name__}: {str(e)}"
                        })
                    files_skipped += 1
                    continue
    
    # Sort largest files
    files_by_size.sort(key=lambda x: x[1], reverse=True)
    
    # Sort largest directories
    dir_sizes_sorted = sorted(dir_sizes.items(), key=lambda x: x[1], reverse=True)
    
    # Process duplicates - Tier 1
    for (name, size), paths in name_size_groups.items():
        if len(paths) > 1:
            duplicates_by_name_size[(name, size)] = paths
    
    # Process duplicates - Tier 2: Hash files
    if dedupe_mode == "full" and files_to_hash:
        print(f"Hashing {len(files_to_hash)} files for duplicate detection...")
        hash_progress = 0
        for file_path in files_to_hash:
            hash_progress += 1
            if hash_progress % 1000 == 0:
                print(f"  Hashed {hash_progress}/{len(files_to_hash)} files...")
            
            file_hash = calculate_file_hash(file_path, max_hash_bytes)
            if file_hash:
                duplicates_by_hash[file_hash].append(str(file_path))
        
        # Filter to only actual duplicates
        duplicates_by_hash = {h: paths for h, paths in duplicates_by_hash.items() if len(paths) > 1}
    
    duration = time.time() - start_time
    
    # Build results
    results = {
        "scope": "custom",  # Will be set by caller
        "root_paths": [str(p) for p in root_paths],
        "timestamp": datetime.datetime.now().isoformat(),
        "duration_seconds": duration,
        "inventory": {
            "total_files": total_files,
            "total_dirs": total_dirs,
            "total_bytes": total_bytes,
            "total_bytes_formatted": format_size(total_bytes),
        },
        "scan_stats": {
            "files_scanned": files_scanned,
            "files_skipped": files_skipped,
            "errors_count": len(errors),
        },
        "largest_files": [
            {"path": p, "size": s, "size_formatted": format_size(s), "mtime": m, "mtime_iso": datetime.datetime.fromtimestamp(m).isoformat()}
            for p, s, m in files_by_size[:100]
        ],
        "largest_dirs": [
            {"path": p, "size": s, "size_formatted": format_size(s)}
            for p, s in dir_sizes_sorted[:50]
        ],
        "file_types": {
            ext: {"count": info["count"], "bytes": info["bytes"], "bytes_formatted": format_size(info["bytes"])}
            for ext, info in sorted(file_types.items(), key=lambda x: x[1]["bytes"], reverse=True)
        },
        "junk": {
            category: {
                "count": info["count"],
                "bytes": info["bytes"],
                "bytes_formatted": format_size(info["bytes"]),
                "paths": info["paths"][:200],  # Limit to top 200
                "total_paths": len(info["paths"]) if len(info["paths"]) <= 200 else "200+",
            }
            for category, info in sorted(junk_by_category.items(), key=lambda x: x[1]["bytes"], reverse=True)
        },
        "duplicates": {
            "by_name_size": [
                {
                    "name": name,
                    "size_bytes": size,
                    "size_formatted": format_size(size),
                    "count": len(paths),
                    "wasted_bytes": (len(paths) - 1) * size,
                    "wasted_bytes_formatted": format_size((len(paths) - 1) * size),
                    "paths": paths
                }
                for (name, size), paths in sorted(
                    list(duplicates_by_name_size.items()),
                    key=lambda x: (len(x[1]) - 1) * x[0][1],  # Sort by wasted bytes
                    reverse=True
                )[:100]
            ],
            "by_hash": [
                {
                    "hash": hash_val,
                    "size_bytes": sum(Path(p).stat().st_size for p in paths if Path(p).exists()),
                    "count": len(paths),
                    "paths": paths
                }
                for hash_val, paths in list(duplicates_by_hash.items())[:100]
            ],
            "duplicate_bytes_total": sum(
                (len(paths) - 1) * size
                for (name, size), paths in duplicates_by_name_size.items()
            ) + sum(
                (len(paths) - 1) * (sum(Path(p).stat().st_size for p in paths if Path(p).exists()) // len(paths) if paths else 0)
                for paths in duplicates_by_hash.values()
            ),
        },
        "stale_files": {
            "threshold_days": stale_days,
            "count": len(stale_files),
            "bytes": sum(s for _, s, _ in stale_files),
            "bytes_formatted": format_size(sum(s for _, s, _ in stale_files)),
            "files": [
                {"path": p, "size": s, "size_formatted": format_size(s), "mtime": m, "mtime_iso": datetime.datetime.fromtimestamp(m).isoformat()}
                for p, s, m in stale_files[:200]
            ],
        },
        "recent_files": {
            "last_24h": {
                "count": len(recent_files_24h),
                "bytes": sum(s for _, s, _ in recent_files_24h),
                "bytes_formatted": format_size(sum(s for _, s, _ in recent_files_24h)),
            },
            "last_7d": {
                "count": len(recent_files_7d),
                "bytes": sum(s for _, s, _ in recent_files_7d),
                "bytes_formatted": format_size(sum(s for _, s, _ in recent_files_7d)),
            },
            "last_30d": {
                "count": len(recent_files_30d),
                "bytes": sum(s for _, s, _ in recent_files_30d),
                "bytes_formatted": format_size(sum(s for _, s, _ in recent_files_30d)),
            },
        },
        "large_files": {
            "count": len(large_files),
            "bytes": sum(s for _, s, _ in large_files),
            "bytes_formatted": format_size(sum(s for _, s, _ in large_files)),
            "files": [
                {"path": p, "size": s, "size_formatted": format_size(s), "mtime": m, "mtime_iso": datetime.datetime.fromtimestamp(m).isoformat()}
                for p, s, m in large_files[:50]
            ],
        },
        "options": {
            "dedupe_mode": dedupe_mode,
            "max_hash_mb": max_hash_mb,
            "stale_days": stale_days,
        },
        "file_index": file_index[:10000],  # Cap to manageable size
        "errors": errors,  # Capped at 20 during collection
        "files_scanned": files_scanned,
        "files_skipped": files_skipped,
        "recommendations": generate_recommendations(
            files_by_size, stale_files, large_files, junk_by_category,
            root_paths, stale_days
        ),
    }
    
    return results


def generate_recommendations(files_by_size: List, stale_files: List, large_files: List,
                            junk_by_category: Dict, root_paths: List[Path],
                            stale_days: int) -> Dict:
    """Generate recommendations for likely unneeded files."""
    recommendations = {
        "build_outputs": [],
        "venv_in_repo": [],
        "backup_artifacts": [],
        "orphaned_large_files": [],
        "very_old_artifacts": [],
    }
    
    # Very old threshold (2 years)
    very_old_threshold = time.time() - (2 * 365 * 24 * 60 * 60)
    
    # Check for build outputs (dist/build directories)
    for category, info in junk_by_category.items():
        if category in ["dist", "build"]:
            for path_str in info["paths"][:20]:  # Top 20
                recommendations["build_outputs"].append({
                    "path": path_str,
                    "size": next((s for p, s, _ in files_by_size if p == path_str), 0),
                    "reason": "Build output directory detected",
                })
    
    # Check for venv directories
    for category, info in junk_by_category.items():
        if category == "venv":
            for path_str in info["paths"][:20]:
                recommendations["venv_in_repo"].append({
                    "path": path_str,
                    "size": next((s for p, s, _ in files_by_size if p == path_str), 0),
                    "reason": "Python virtual environment in repository",
                })
    
    # Check for backup artifacts (tar.gz, zip files in repo)
    for category, info in junk_by_category.items():
        if category == "backup_artifacts":
            for path_str in info["paths"][:20]:
                recommendations["backup_artifacts"].append({
                    "path": path_str,
                    "size": next((s for p, s, _ in files_by_size if p == path_str), 0),
                    "reason": "Backup artifact committed to repository",
                })
    
    # Orphaned large files in hidden dirs
    for path_str, size, mtime in large_files[:20]:
        path_obj = Path(path_str)
        # Check if in hidden directory or unusual location
        parts = path_obj.parts
        if any(part.startswith(".") for part in parts) and size > 100 * 1024 * 1024:  # > 100MB
            recommendations["orphaned_large_files"].append({
                "path": path_str,
                "size": size,
                "reason": f"Large file ({format_size(size)}) in hidden directory",
            })
    
    # Very old artifacts under tools/ or temp dirs
    for path_str, size, mtime in stale_files:
        path_obj = Path(path_str)
        parts = path_obj.parts
        # Check if in tools/ or temp-like directories and very old
        if mtime < very_old_threshold:
            if any(part in ["tools", "tmp", "temp", "cache"] for part in parts):
                recommendations["very_old_artifacts"].append({
                    "path": path_str,
                    "size": size,
                    "mtime_iso": datetime.datetime.fromtimestamp(mtime).isoformat(),
                    "reason": f"Very old file (not modified in {stale_days}+ days) in tools/temp directory",
                })
                if len(recommendations["very_old_artifacts"]) >= 50:
                    break
    
    # Format recommendations with counts and summaries
    return {
        "build_outputs": {
            "count": len(recommendations["build_outputs"]),
            "items": recommendations["build_outputs"][:20],
        },
        "venv_in_repo": {
            "count": len(recommendations["venv_in_repo"]),
            "items": recommendations["venv_in_repo"][:20],
        },
        "backup_artifacts": {
            "count": len(recommendations["backup_artifacts"]),
            "items": recommendations["backup_artifacts"][:20],
        },
        "orphaned_large_files": {
            "count": len(recommendations["orphaned_large_files"]),
            "items": recommendations["orphaned_large_files"][:20],
        },
        "very_old_artifacts": {
            "count": len(recommendations["very_old_artifacts"]),
            "items": recommendations["very_old_artifacts"][:50],
        },
    }


def load_previous_run(scope: str) -> Optional[Dict]:
    """Load the most recent previous run for the same scope."""
    if not INDEX_FILE.exists():
        return None
    
    try:
        with open(INDEX_FILE, "r") as f:
            index = json.load(f)
        
        # Find most recent run for this scope
        runs = index.get("runs", [])
        scope_runs = [r for r in runs if r.get("scope") == scope]
        if not scope_runs:
            return None
        
        # Sort by timestamp (most recent first)
        scope_runs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        most_recent = scope_runs[0]
        
        # Load the analysis.json from that run
        run_dir = RUNS_DIR / most_recent["run_id"]
        analysis_file = run_dir / "analysis.json"
        
        if analysis_file.exists():
            with open(analysis_file, "r") as f:
                return json.load(f)
    except Exception:
        pass
    
    return None


def diff_against_previous(current: Dict, previous: Dict) -> Dict:
    """Compare current analysis against previous run using file_index."""
    if not previous:
        return {
            "has_previous": False,
            "added_count": current["inventory"]["total_files"],
            "removed_count": 0,
            "changed_count": 0,
            "size_delta": current["inventory"]["total_bytes"],
            "size_delta_formatted": current["inventory"]["total_bytes_formatted"],
        }
    
    # Build file maps from file_index
    current_index = {item["path"]: item for item in current.get("file_index", [])}
    previous_index = {item["path"]: item for item in previous.get("file_index", [])}
    
    current_paths = set(current_index.keys())
    previous_paths = set(previous_index.keys())
    
    added_paths = current_paths - previous_paths
    removed_paths = previous_paths - current_paths
    common_paths = current_paths & previous_paths
    
    # Count changed files (size or mtime changed)
    changed_count = 0
    for path in common_paths:
        curr = current_index[path]
        prev = previous_index[path]
        if curr["size"] != prev["size"] or curr["mtime"] != prev["mtime"]:
            changed_count += 1
    
    # Calculate size delta
    current_total = current["inventory"]["total_bytes"]
    previous_total = previous.get("inventory", {}).get("total_bytes", 0)
    size_delta = current_total - previous_total
    
    # Calculate file count delta
    current_file_count = current["inventory"]["total_files"]
    previous_file_count = previous.get("inventory", {}).get("total_files", 0)
    file_count_delta = current_file_count - previous_file_count
    
    return {
        "has_previous": True,
        "added_count": len(added_paths),
        "removed_count": len(removed_paths),
        "changed_count": changed_count,
        "file_count_delta": file_count_delta,
        "size_delta": size_delta,
        "size_delta_formatted": format_size(abs(size_delta)),
        "size_delta_positive": size_delta > 0,
        "added_files_sample": list(added_paths)[:50],  # Sample
        "removed_files_sample": list(removed_paths)[:50],  # Sample
    }


def compute_metrics(results: Dict) -> Dict:
    """Compute comprehensive metrics from analysis results."""
    # Calculate junk totals
    junk_bytes_total = sum(cat.get("bytes", 0) for cat in results.get("junk", {}).values())
    junk_counts_total = sum(cat.get("count", 0) for cat in results.get("junk", {}).values())
    
    # Calculate duplicate totals from structured data
    duplicate_bytes_total = results.get("duplicates", {}).get("duplicate_bytes_total", 0)
    
    # If not available, compute from structured lists
    if duplicate_bytes_total == 0:
        duplicates = results.get("duplicates", {})
        
        # From structured by_name_size list
        for dup in duplicates.get("by_name_size", []):
            duplicate_bytes_total += dup.get("wasted_bytes", 0)
        
        # From by_hash list
        for dup in duplicates.get("by_hash", []):
            size_bytes = dup.get("size_bytes", 0)
            count = dup.get("count", 0)
            if count > 1 and size_bytes > 0:
                duplicate_bytes_total += size_bytes * (count - 1)
    
    # Get top extensions
    file_types = results.get("file_types", {})
    top_extensions_by_bytes = sorted(
        [(ext, info["bytes"]) for ext, info in file_types.items()],
        key=lambda x: x[1],
        reverse=True
    )[:10]
    top_extensions_by_count = sorted(
        [(ext, info["count"]) for ext, info in file_types.items()],
        key=lambda x: x[1],
        reverse=True
    )[:10]
    
    # Extract date from timestamp
    created_at = results.get("timestamp", "")
    date = created_at[:10] if len(created_at) >= 10 else ""
    
    return {
        "run_id": results.get("run_id", ""),
        "scope": results.get("scope", "unknown"),
        "created_at": created_at,
        "date": date,
        "total_files": results["inventory"]["total_files"],
        "total_dirs": results["inventory"]["total_dirs"],
        "total_bytes": results["inventory"]["total_bytes"],
        "junk_bytes_total": junk_bytes_total,
        "junk_counts_total": junk_counts_total,
        "stale_files_count": results.get("stale_files", {}).get("count", 0),
        "stale_bytes_total": results.get("stale_files", {}).get("bytes", 0),
        "duplicate_bytes_total": duplicate_bytes_total,
        "large_files_over_50mb_count": results.get("large_files", {}).get("count", 0),
        "top_extensions_by_bytes": top_extensions_by_bytes,
        "top_extensions_by_count": top_extensions_by_count,
    }


def save_analysis_run(results: Dict, diff: Dict, dedupe_mode: str = "quick",
                     max_hash_mb: int = 20, stale_days: int = 180):
    """Save analysis results to a run directory."""
    ensure_analysis_dirs()
    
    # Create run directory
    timestamp_str = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")
    run_dir = RUNS_DIR / timestamp_str
    run_dir.mkdir(parents=True, exist_ok=True)
    
    # Add run_id to results
    results["run_id"] = timestamp_str
    
    # Save analysis.json
    analysis_file = run_dir / "analysis.json"
    with open(analysis_file, "w") as f:
        json.dump(results, f, indent=2)
    
    # Save duplicates CSV if there are duplicates
    duplicates = results.get("duplicates", {})
    has_duplicates = (
        (isinstance(duplicates.get("by_name_size"), list) and len(duplicates.get("by_name_size", [])) > 0) or
        (isinstance(duplicates.get("by_hash"), list) and len(duplicates.get("by_hash", [])) > 0)
    )
    
    if has_duplicates:
        duplicates_file = run_dir / "duplicates.csv"
        with open(duplicates_file, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["Type", "Key", "Path", "Size"])
            
            # Handle by_name_size as list of objects
            for dup in duplicates.get("by_name_size", []):
                if isinstance(dup, dict):
                    name = dup.get("name", "unknown")
                    size_bytes = dup.get("size_bytes", 0)
                    paths = dup.get("paths", [])
                    key = f"{name}:{size_bytes}"
                    for path in paths:
                        writer.writerow(["name_size", key, path, size_bytes])
            
            # Handle by_hash as list of objects
            for dup in duplicates.get("by_hash", []):
                if isinstance(dup, dict):
                    hash_val = dup.get("hash", "unknown")
                    size_bytes = dup.get("size_bytes", 0)
                    paths = dup.get("paths", [])
                    hash_short = hash_val[:16] + "..." if len(hash_val) > 16 else hash_val
                    for path in paths:
                        writer.writerow(["hash", hash_short, path, size_bytes])
    
    # Compute metrics
    metrics = compute_metrics(results)
    
    # Save meta.json with comprehensive metrics
    meta = {
        "run_id": timestamp_str,
        "scope": results["scope"],
        "timestamp": results["timestamp"],
        "created_at": results["timestamp"],  # Alias for consistency
        "duration_seconds": results["duration_seconds"],
        "hostname": os.uname().nodename if hasattr(os, "uname") else "unknown",
        "options": {
            "dedupe_mode": dedupe_mode,
            "max_hash_mb": max_hash_mb,
            "stale_days": stale_days,
        },
        **metrics  # Include all computed metrics
    }
    
    meta_file = run_dir / "meta.json"
    with open(meta_file, "w") as f:
        json.dump(meta, f, indent=2)
    
    # Update index.json with compact metrics
    update_index(meta, diff)
    
    return run_dir


def update_index(meta: Dict, diff: Dict):
    """Update the analysis index with new run information."""
    if INDEX_FILE.exists():
        with open(INDEX_FILE, "r") as f:
            index = json.load(f)
    else:
        index = {"runs": []}
    
    # Create compact metrics entry
    run_entry = {
        "run_id": meta["run_id"],
        "scope": meta["scope"],
        "timestamp": meta.get("timestamp", meta.get("created_at", "")),
        "created_at": meta.get("created_at", meta.get("timestamp", "")),
        "date": meta.get("date", meta.get("created_at", "")[:10]),
        "duration_seconds": meta.get("duration_seconds", 0),
        "total_files": meta.get("total_files", 0),
        "total_dirs": meta.get("total_dirs", 0),
        "total_bytes": meta.get("total_bytes", 0),
        "junk_bytes_total": meta.get("junk_bytes_total", 0),
        "junk_counts_total": meta.get("junk_counts_total", 0),
        "stale_files_count": meta.get("stale_files_count", 0),
        "stale_bytes_total": meta.get("stale_bytes_total", 0),
        "duplicate_bytes_total": meta.get("duplicate_bytes_total", 0),
        "large_files_over_50mb_count": meta.get("large_files_over_50mb_count", 0),
        "size_delta": diff.get("size_delta", 0),
        "file_count_delta": diff.get("file_count_delta", 0),
    }
    
    # Check if run already exists (update instead of append)
    existing_idx = None
    for i, run in enumerate(index["runs"]):
        if run.get("run_id") == meta["run_id"]:
            existing_idx = i
            break
    
    if existing_idx is not None:
        index["runs"][existing_idx] = run_entry
    else:
        index["runs"].append(run_entry)
    
    # Sort by timestamp (most recent first)
    index["runs"].sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    # Keep summary stats
    index["summary"] = {
        "total_runs": len(index["runs"]),
        "scopes": list(set(r["scope"] for r in index["runs"])),
        "latest_run": index["runs"][0] if index["runs"] else None,
    }
    
    with open(INDEX_FILE, "w") as f:
        json.dump(index, f, indent=2)


def generate_html_report():
    """Generate interactive HTML report from all analysis runs."""
    ensure_analysis_dirs()
    
    # Load index
    if not INDEX_FILE.exists():
        # Create empty report
        html_content = generate_empty_html()
        with open(REPORT_FILE, "w") as f:
            f.write(html_content)
        return
    
    with open(INDEX_FILE, "r") as f:
        index = json.load(f)
    
    runs = index.get("runs", [])
    if not runs:
        html_content = generate_empty_html()
        with open(REPORT_FILE, "w") as f:
            f.write(html_content)
        return
    
    # Load all run data
    runs_data = []
    for run_info in runs:
        run_dir = RUNS_DIR / run_info["run_id"]
        analysis_file = run_dir / "analysis.json"
        if analysis_file.exists():
            with open(analysis_file, "r") as f:
                runs_data.append(json.load(f))
    
    # Generate HTML
    html_content = generate_html_content(runs_data, index)
    
    with open(REPORT_FILE, "w") as f:
        f.write(html_content)


def generate_empty_html() -> str:
    """Generate empty HTML report."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OM-Recovery Analysis Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .empty { text-align: center; padding: 40px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h1>OM-Recovery Analysis Report</h1>
        <div class="empty">No analysis runs found. Run an analysis first.</div>
    </div>
</body>
</html>"""


def generate_html_content(runs_data: List[Dict], index: Dict, changelog_data: Optional[Dict] = None) -> str:
    """Generate full HTML report content."""
    # This will be a large function - generating the interactive HTML
    # I'll create it in parts due to size constraints
    
    html_parts = []
    
    # HTML head and styles
    html_parts.append("""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OM-Recovery Analysis Report</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
            margin-top: 0;
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        .controls {
            margin: 20px 0;
            padding: 15px;
            background: #ecf0f1;
            border-radius: 5px;
        }
        .controls label {
            font-weight: bold;
            margin-right: 10px;
        }
        .controls select {
            padding: 8px 12px;
            font-size: 14px;
            border: 1px solid #bdc3c7;
            border-radius: 4px;
            background: white;
        }
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .card h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            opacity: 0.9;
        }
        .card .value {
            font-size: 24px;
            font-weight: bold;
        }
        .tabs {
            display: flex;
            border-bottom: 2px solid #ecf0f1;
            margin: 20px 0;
        }
        .tab {
            padding: 12px 24px;
            cursor: pointer;
            border: none;
            background: none;
            font-size: 14px;
            color: #7f8c8d;
            border-bottom: 2px solid transparent;
            transition: all 0.3s;
        }
        .tab:hover {
            color: #3498db;
        }
        .tab.active {
            color: #3498db;
            border-bottom-color: #3498db;
            font-weight: bold;
        }
        .tab-content {
            display: none;
            padding: 20px 0;
        }
        .tab-content.active {
            display: block;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ecf0f1;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }
        tr:hover {
            background: #f8f9fa;
        }
        .search-box {
            margin: 15px 0;
            padding: 10px;
            width: 100%;
            max-width: 400px;
            border: 1px solid #bdc3c7;
            border-radius: 4px;
            font-size: 14px;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-warning {
            background: #f39c12;
            color: white;
        }
        .badge-danger {
            background: #e74c3c;
            color: white;
        }
        .badge-info {
            background: #3498db;
            color: white;
        }
        .code-block {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            overflow-x: auto;
            margin: 10px 0;
        }
        .collapsible {
            cursor: pointer;
            user-select: none;
        }
        .collapsible::before {
            content: '▶ ';
            display: inline-block;
            transition: transform 0.3s;
        }
        .collapsible.expanded::before {
            transform: rotate(90deg);
        }
        .collapsible-content {
            display: none;
            margin-left: 20px;
            padding: 10px;
            background: #f8f9fa;
            border-left: 3px solid #3498db;
        }
        .collapsible-content.expanded {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>OM-Recovery Analysis Report</h1>
        <div class="controls">
            <label for="runSelector">Analysis Run:</label>
            <select id="runSelector">
""")
    
    # Add run options
    for i, run in enumerate(runs_data):
        scope = run.get("scope", "unknown")
        timestamp = run.get("timestamp", "")[:19].replace("T", " ")
        option_text = f"{scope} - {timestamp}"
        html_parts.append(f'                <option value="{i}">{option_text}</option>\n')
    
    html_parts.append("""            </select>
        </div>
        <div id="reportContent"></div>
    </div>
    <script>
        const runsData = """)
    
    # Embed runs data as JSON (escaped)
    html_parts.append(json.dumps(runs_data).replace("<", "\\u003c"))
    
    html_parts.append(""";
        const indexData = """)
    
    # Embed index data
    html_parts.append(json.dumps(index).replace("<", "\\u003c"))
    
    html_parts.append(""";
        const changelogData = """)
    
    # Embed changelog data if available
    if changelog_data:
        html_parts.append(json.dumps(changelog_data).replace("<", "\\u003c"))
    else:
        html_parts.append("null")
    
    html_parts.append(""";
        
        function formatSize(bytes) {
            const units = ['B', 'KB', 'MB', 'GB', 'TB'];
            let size = bytes;
            let unitIndex = 0;
            while (size >= 1024 && unitIndex < units.length - 1) {
                size /= 1024;
                unitIndex++;
            }
            return size.toFixed(2) + ' ' + units[unitIndex];
        }
        
        function formatDate(isoString) {
            return new Date(isoString).toLocaleString();
        }
        
        function renderReport(runIndex) {
            const run = runsData[runIndex];
            if (!run) return;
            
            const inv = run.inventory || {};
            const junk = run.junk || {};
            const duplicates = run.duplicates || {};
            const stale = run.stale_files || {};
            const large = run.large_files || {};
            
            let html = `
                <div class="summary-cards">
                    <div class="card">
                        <h3>Total Files</h3>
                        <div class="value">${inv.total_files?.toLocaleString() || 0}</div>
                    </div>
                    <div class="card">
                        <h3>Total Size</h3>
                        <div class="value">${inv.total_bytes_formatted || '0 B'}</div>
                    </div>
                    <div class="card">
                        <h3>Junk Size</h3>
                        <div class="value">${formatSize(Object.values(junk).reduce((sum, j) => sum + (j.bytes || 0), 0))}</div>
                    </div>
                    <div class="card">
                        <h3>Stale Files</h3>
                        <div class="value">${stale.count || 0}</div>
                    </div>
                </div>
                
                <div class="tabs">
                    <button class="tab active" onclick="showTab('overview')">Overview</button>
                    <button class="tab" onclick="showTab('largest')">Largest Files</button>
                    <button class="tab" onclick="showTab('junk')">Junk Findings</button>
                    <button class="tab" onclick="showTab('duplicates')">Duplicates</button>
                    <button class="tab" onclick="showTab('stale')">Stale Files</button>
                    <button class="tab" onclick="showTab('recommendations')">Recommendations</button>
                    <button class="tab" onclick="showTab('errors')">Errors & Skipped</button>
                    <button class="tab" onclick="showTab('growth')">Growth Dashboard</button>
                </div>
                
                <div id="overview" class="tab-content active">
                    <h2>Overview</h2>
                    <p><strong>Scope:</strong> ${run.scope || 'unknown'}</p>
                    <p><strong>Timestamp:</strong> ${formatDate(run.timestamp)}</p>
                    <p><strong>Duration:</strong> ${run.duration_seconds?.toFixed(2) || 0} seconds</p>
                    <p><strong>Files Scanned:</strong> ${run.scan_stats?.files_scanned || 0}</p>
                    <p><strong>Files Skipped:</strong> ${run.scan_stats?.files_skipped || 0}</p>
                    <p><strong>Errors:</strong> ${run.scan_stats?.errors_count || 0}</p>
                    <p><strong>Root Paths:</strong></p>
                    <ul>
                        ${(run.root_paths || []).map(p => `<li><code>${p}</code></li>`).join('')}
                    </ul>
                    
                    <h3>File Types</h3>
                    <table>
                        <thead>
                            <tr><th>Extension</th><th>Count</th><th>Size</th></tr>
                        </thead>
                        <tbody>
                            ${Object.entries(run.file_types || {}).slice(0, 20).map(([ext, info]) => 
                                `<tr><td><code>${ext}</code></td><td>${info.count}</td><td>${info.bytes_formatted}</td></tr>`
                            ).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div id="largest" class="tab-content">
                    <h2>Largest Files</h2>
                    <input type="text" class="search-box" placeholder="Search files..." id="searchLargest" onkeyup="filterTable('largestTable', 'searchLargest')">
                    <table id="largestTable">
                        <thead>
                            <tr><th>Path</th><th>Size</th><th>Modified</th></tr>
                        </thead>
                        <tbody>
                            ${(run.largest_files || []).slice(0, 100).map(f => 
                                `<tr><td><code>${f.path}</code></td><td>${f.size_formatted}</td><td>${formatDate(f.mtime_iso)}</td></tr>`
                            ).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div id="junk" class="tab-content">
                    <h2>Junk Findings</h2>
                    <table>
                        <thead>
                            <tr><th>Category</th><th>Count</th><th>Size</th><th>Paths</th></tr>
                        </thead>
                        <tbody>
                            ${Object.entries(junk).map(([cat, info]) => 
                                `<tr>
                                    <td><strong>${cat}</strong></td>
                                    <td>${info.count}</td>
                                    <td>${info.bytes_formatted}</td>
                                    <td>
                                        ${info.paths.slice(0, 10).map(p => `<code style="display:block;margin:2px 0;">${p}</code>`).join('')}
                                        ${info.paths.length > 10 ? `<em>... and ${info.paths.length - 10} more</em>` : ''}
                                    </td>
                                </tr>`
                            ).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div id="duplicates" class="tab-content">
                    <h2>Duplicates</h2>
                    <h3>By Name + Size</h3>
                    ${(() => {
                        const byName = duplicates.by_name_size || [];
                        return byName.slice(0, 50).map(d => {
                            const paths = d.paths || [];
                            const pathsToShow = paths.slice(0, 20);
                            const remaining = paths.length - 20;
                            const name = d.name || 'unknown';
                            const sizeFormatted = d.size_formatted || formatSize(d.size_bytes || 0);
                            const count = d.count || 0;
                            const wastedFormatted = d.wasted_bytes_formatted || formatSize(d.wasted_bytes || 0);
                            const pathsHtml = pathsToShow.map(p => '<li><code>' + p + '</code></li>').join('');
                            const moreHtml = remaining > 0 ? '<li><em>... and ' + remaining + ' more</em></li>' : '';
                            return '<div style="margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">' +
                                '<strong>' + name + '</strong> - ' + sizeFormatted + ' (' + count + ' copies, wasted: ' + wastedFormatted + ')' +
                                '<ul style="margin: 5px 0 0 20px;">' + pathsHtml + moreHtml + '</ul>' +
                                '</div>';
                        }).join('');
                    })()}
                    
                    <h3>By Hash (Exact Duplicates)</h3>
                    ${(() => {
                        const byHash = duplicates.by_hash || [];
                        return byHash.slice(0, 50).map(d => {
                            const hash = d.hash || 'unknown';
                            const paths = d.paths || [];
                            const pathsToShow = paths.slice(0, 20);
                            const remaining = paths.length - 20;
                            const hashShort = hash.length > 16 ? hash.substring(0, 16) + '...' : hash;
                            const sizeFormatted = formatSize(d.size_bytes || 0);
                            const count = d.count || 0;
                            const pathsHtml = pathsToShow.map(p => '<li><code>' + p + '</code></li>').join('');
                            const moreHtml = remaining > 0 ? '<li><em>... and ' + remaining + ' more</em></li>' : '';
                            return '<div style="margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">' +
                                '<strong>' + hashShort + '</strong> - ' + sizeFormatted + ' (' + count + ' copies)' +
                                '<ul style="margin: 5px 0 0 20px;">' + pathsHtml + moreHtml + '</ul>' +
                                '</div>';
                        }).join('');
                    })()}
                </div>
                
                <div id="stale" class="tab-content">
                    <h2>Stale Files (not modified in ${stale.threshold_days || 180} days)</h2>
                    <p>Total: ${stale.count} files, ${stale.bytes_formatted}</p>
                    <input type="text" class="search-box" placeholder="Search stale files..." id="searchStale" onkeyup="filterTable('staleTable', 'searchStale')">
                    <table id="staleTable">
                        <thead>
                            <tr><th>Path</th><th>Size</th><th>Last Modified</th></tr>
                        </thead>
                        <tbody>
                            ${(stale.files || []).slice(0, 200).map(f => 
                                `<tr><td><code>${f.path}</code></td><td>${f.size_formatted}</td><td>${formatDate(f.mtime_iso)}</td></tr>`
                            ).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div id="recommendations" class="tab-content">
                    <h2>Recommendations (Likely Unneeded Files)</h2>
                    <p>These files may be candidates for cleanup. Review carefully before deleting.</p>
                    
                    ${run.recommendations ? `
                        ${run.recommendations.build_outputs?.count > 0 ? `
                            <h3>Build Outputs (${run.recommendations.build_outputs.count})</h3>
                            <table>
                                <thead><tr><th>Path</th><th>Size</th><th>Reason</th></tr></thead>
                                <tbody>
                                    ${run.recommendations.build_outputs.items.map(item => 
                                        `<tr><td><code>${item.path}</code></td><td>${formatSize(item.size || 0)}</td><td>${item.reason}</td></tr>`
                                    ).join('')}
                                </tbody>
                            </table>
                        ` : ''}
                        
                        ${run.recommendations.venv_in_repo?.count > 0 ? `
                            <h3>Python Virtual Environments in Repo (${run.recommendations.venv_in_repo.count})</h3>
                            <table>
                                <thead><tr><th>Path</th><th>Size</th><th>Reason</th></tr></thead>
                                <tbody>
                                    ${run.recommendations.venv_in_repo.items.map(item => 
                                        `<tr><td><code>${item.path}</code></td><td>${formatSize(item.size || 0)}</td><td>${item.reason}</td></tr>`
                                    ).join('')}
                                </tbody>
                            </table>
                        ` : ''}
                        
                        ${run.recommendations.backup_artifacts?.count > 0 ? `
                            <h3>Backup Artifacts in Repo (${run.recommendations.backup_artifacts.count})</h3>
                            <table>
                                <thead><tr><th>Path</th><th>Size</th><th>Reason</th></tr></thead>
                                <tbody>
                                    ${run.recommendations.backup_artifacts.items.map(item => 
                                        `<tr><td><code>${item.path}</code></td><td>${formatSize(item.size || 0)}</td><td>${item.reason}</td></tr>`
                                    ).join('')}
                                </tbody>
                            </table>
                        ` : ''}
                        
                        ${run.recommendations.orphaned_large_files?.count > 0 ? `
                            <h3>Orphaned Large Files (${run.recommendations.orphaned_large_files.count})</h3>
                            <table>
                                <thead><tr><th>Path</th><th>Size</th><th>Reason</th></tr></thead>
                                <tbody>
                                    ${run.recommendations.orphaned_large_files.items.map(item => 
                                        `<tr><td><code>${item.path}</code></td><td>${formatSize(item.size || 0)}</td><td>${item.reason}</td></tr>`
                                    ).join('')}
                                </tbody>
                            </table>
                        ` : ''}
                        
                        ${run.recommendations.very_old_artifacts?.count > 0 ? `
                            <h3>Very Old Artifacts (${run.recommendations.very_old_artifacts.count})</h3>
                            <table>
                                <thead><tr><th>Path</th><th>Size</th><th>Last Modified</th><th>Reason</th></tr></thead>
                                <tbody>
                                    ${run.recommendations.very_old_artifacts.items.map(item => 
                                        `<tr><td><code>${item.path}</code></td><td>${formatSize(item.size || 0)}</td><td>${formatDate(item.mtime_iso || '')}</td><td>${item.reason}</td></tr>`
                                    ).join('')}
                                </tbody>
                            </table>
                        ` : ''}
                    ` : '<p>No recommendations available.</p>'}
                </div>
                
                <div id="errors" class="tab-content">
                    <h2>Errors & Skipped Files</h2>
                    <div style="margin: 20px 0;">
                        <p><strong>Files Scanned:</strong> ${run.scan_stats?.files_scanned || 0}</p>
                        <p><strong>Files Skipped:</strong> ${run.scan_stats?.files_skipped || 0}</p>
                        <p><strong>Files Processed:</strong> ${run.inventory?.total_files || 0}</p>
                        <p><strong>Errors Count:</strong> ${run.scan_stats?.errors_count || 0}</p>
                    </div>
                    ${run.errors && run.errors.length > 0 ? `
                        <h3>Errors Encountered (${run.errors.length})</h3>
                        <table>
                            <thead><tr><th>Path</th><th>Error</th></tr></thead>
                            <tbody>
                                ${run.errors.map(err => 
                                    `<tr><td><code>${err.path || 'unknown'}</code></td><td>${err.error || 'Unknown error'}</td></tr>`
                                ).join('')}
                            </tbody>
                        </table>
                    ` : '<p>No errors encountered during analysis.</p>'}
                </div>
                
                <div id="growth" class="tab-content">
                    ${renderGrowthDashboard()}
                </div>
            `;
            
            document.getElementById('reportContent').innerHTML = html;
        }
        
        function renderGrowthDashboard() {
            // Filter controls
            let html = `
                <h2>Growth Dashboard</h2>
                <div class="controls" style="margin: 20px 0;">
                    <label for="growthScopeFilter">Scope:</label>
                    <select id="growthScopeFilter" onchange="updateGrowthCharts()">
                        <option value="all">All Scopes</option>
                        <option value="prod">prod</option>
                        <option value="server">server</option>
                        <option value="front-end">front-end</option>
                        <option value="entire">entire</option>
                    </select>
                    <label for="growthDateRange" style="margin-left: 20px;">Date Range:</label>
                    <select id="growthDateRange" onchange="updateGrowthCharts()">
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                        <option value="all">All time</option>
                    </select>
                </div>
                
                <div id="growthCharts"></div>
                <div id="dailySummary"></div>
                <div id="changelogSummary"></div>
            `;
            
            return html;
        }
        
        function updateGrowthCharts() {
            const scopeFilter = document.getElementById('growthScopeFilter')?.value || 'all';
            const dateRange = document.getElementById('growthDateRange')?.value || '7';
            
            // Filter runs
            let runs = indexData.runs || [];
            const now = new Date();
            let cutoffDate = null;
            if (dateRange !== 'all') {
                cutoffDate = new Date(now.getTime() - (parseInt(dateRange) * 24 * 60 * 60 * 1000));
            }
            
            runs = runs.filter(run => {
                if (scopeFilter !== 'all' && run.scope !== scopeFilter) return false;
                if (cutoffDate) {
                    const runDate = new Date(run.created_at || run.timestamp);
                    if (runDate < cutoffDate) return false;
                }
                return true;
            });
            
            // Sort by date
            runs.sort((a, b) => new Date(a.created_at || a.timestamp) - new Date(b.created_at || b.timestamp));
            
            // Prepare chart data
            const chartData = {
                dates: runs.map(r => r.date || (r.created_at || r.timestamp).substring(0, 10)),
                totalBytes: runs.map(r => r.total_bytes || 0),
                totalFiles: runs.map(r => r.total_files || 0),
                junkBytes: runs.map(r => r.junk_bytes_total || 0),
                staleFiles: runs.map(r => r.stale_files_count || 0),
                duplicateBytes: runs.map(r => r.duplicate_bytes_total || 0),
            };
            
            // Render charts
            const chartsHtml = `
                <h3>Time-Series Charts</h3>
                <div style="margin: 20px 0;">
                    <h4>Total Size Over Time</h4>
                    ${renderSVGChart(chartData.dates, chartData.totalBytes, 'Total Bytes', formatSize)}
                </div>
                <div style="margin: 20px 0;">
                    <h4>Total Files Over Time</h4>
                    ${renderSVGChart(chartData.dates, chartData.totalFiles, 'Total Files', (v) => v.toLocaleString())}
                </div>
                <div style="margin: 20px 0;">
                    <h4>Junk Bytes Over Time</h4>
                    ${renderSVGChart(chartData.dates, chartData.junkBytes, 'Junk Bytes', formatSize)}
                </div>
                <div style="margin: 20px 0;">
                    <h4>Stale Files Count Over Time</h4>
                    ${renderSVGChart(chartData.dates, chartData.staleFiles, 'Stale Files', (v) => v.toLocaleString())}
                </div>
                ${chartData.duplicateBytes.some(v => v > 0) ? `
                <div style="margin: 20px 0;">
                    <h4>Duplicate Bytes Over Time</h4>
                    ${renderSVGChart(chartData.dates, chartData.duplicateBytes, 'Duplicate Bytes', formatSize)}
                </div>
                ` : ''}
            `;
            
            document.getElementById('growthCharts').innerHTML = chartsHtml;
            
            // Render daily summary table
            renderDailySummary(runs);
            
            // Render changelog summary
            renderChangelogSummary();
        }
        
        function renderSVGChart(dates, values, label, formatter) {
            if (dates.length === 0) return '<p>No data available</p>';
            
            const width = 800;
            const height = 300;
            const padding = { top: 20, right: 40, bottom: 40, left: 80 };
            const chartWidth = width - padding.left - padding.right;
            const chartHeight = height - padding.top - padding.bottom;
            
            const minVal = Math.min(...values);
            const maxVal = Math.max(...values);
            const range = maxVal - minVal || 1;
            
            // Generate points
            const points = values.map((val, i) => {
                const x = padding.left + (i / (values.length - 1 || 1)) * chartWidth;
                const y = padding.top + chartHeight - ((val - minVal) / range) * chartHeight;
                return { x, y, val, date: dates[i] };
            });
            
            // Generate polyline path
            const pathData = points.map((p, i) => 
                (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y
            ).join(' ');
            
            // Generate axis labels
            const xLabels = dates.map((date, i) => {
                const x = padding.left + (i / (dates.length - 1 || 1)) * chartWidth;
                return `<text x="${x}" y="${height - 5}" text-anchor="middle" font-size="10" fill="#666">${date.substring(5)}</text>`;
            }).join('');
            
            const yStep = 5;
            const yLabels = [];
            for (let i = 0; i <= yStep; i++) {
                const val = minVal + (range * i / yStep);
                const y = padding.top + chartHeight - (i / yStep) * chartHeight;
                yLabels.push(`<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="#666">${formatter(val)}</text>`);
                yLabels.push(`<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" stroke="#ddd" stroke-width="1"/>`);
            }
            
            // Generate tooltip points
            const tooltipPoints = points.map(p => 
                `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#3498db" opacity="0.7">
                    <title>${p.date}: ${formatter(p.val)}</title>
                </circle>`
            ).join('');
            
            return `
                <svg width="${width}" height="${height}" style="border: 1px solid #ddd; background: white;">
                    <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="#333" stroke-width="2"/>
                    <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${padding.left + chartWidth}" y2="${padding.top + chartHeight}" stroke="#333" stroke-width="2"/>
                    <polyline points="${points.map(p => p.x + ',' + p.y).join(' ')}" fill="none" stroke="#3498db" stroke-width="2"/>
                    ${yLabels.join('')}
                    ${xLabels}
                    ${tooltipPoints}
                    <text x="${width / 2}" y="15" text-anchor="middle" font-size="12" font-weight="bold">${label}</text>
                </svg>
            `;
        }
        
        function renderDailySummary(runs) {
            // Group runs by date
            const runsByDate = {};
            runs.forEach(run => {
                const date = run.date || (run.created_at || run.timestamp).substring(0, 10);
                if (!runsByDate[date]) runsByDate[date] = [];
                runsByDate[date].push(run);
            });
            
            // Calculate deltas
            const dailyData = Object.keys(runsByDate).sort().map(date => {
                const dateRuns = runsByDate[date].sort((a, b) => 
                    new Date(a.created_at || a.timestamp) - new Date(b.created_at || b.timestamp)
                );
                
                return dateRuns.map((run, idx) => {
                    const prevRun = idx > 0 ? dateRuns[idx - 1] : 
                        (runs.find(r => 
                            (r.date || (r.created_at || r.timestamp).substring(0, 10)) < date && 
                            r.scope === run.scope
                        ) || {});
                    
                    const sizeDelta = run.total_bytes - (prevRun.total_bytes || 0);
                    const fileDelta = run.total_files - (prevRun.total_files || 0);
                    const junkDelta = (run.junk_bytes_total || 0) - (prevRun.junk_bytes_total || 0);
                    
                    return {
                        date,
                        scope: run.scope,
                        totalBytes: run.total_bytes,
                        totalFiles: run.total_files,
                        sizeDelta,
                        fileDelta,
                        junkDelta,
                        timestamp: run.created_at || run.timestamp,
                    };
                });
            }).flat();
            
            let html = `
                <h3>Daily Summary</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Scope</th>
                            <th>Total Bytes</th>
                            <th>Size Δ</th>
                            <th>Files Δ</th>
                            <th>Junk Δ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dailyData.map(d => `
                            <tr>
                                <td>${d.date}</td>
                                <td>${d.scope}</td>
                                <td>${formatSize(d.totalBytes)}</td>
                                <td style="color: ${d.sizeDelta >= 0 ? '#e74c3c' : '#27ae60'};">
                                    ${d.sizeDelta >= 0 ? '↑' : '↓'} ${formatSize(Math.abs(d.sizeDelta))}
                                </td>
                                <td style="color: ${d.fileDelta >= 0 ? '#e74c3c' : '#27ae60'};">
                                    ${d.fileDelta >= 0 ? '↑' : '↓'} ${d.fileDelta}
                                </td>
                                <td style="color: ${d.junkDelta >= 0 ? '#e74c3c' : '#27ae60'};">
                                    ${d.junkDelta >= 0 ? '↑' : '↓'} ${formatSize(Math.abs(d.junkDelta))}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            document.getElementById('dailySummary').innerHTML = html;
        }
        
        function renderChangelogSummary() {
            if (!changelogData) {
                document.getElementById('changelogSummary').innerHTML = '<p style="color: #666; font-style: italic;">Changelog data not available. Start tracking work sessions to see daily accomplishments.</p>';
                return;
            }
            
            const today = new Date().toISOString().substring(0, 10);
            const dates = Object.keys(changelogData).sort().reverse().slice(0, 7);
            
            let html = `
                <h3>Today's Work Summary</h3>
                ${dates.map(date => {
                    const sessions = changelogData[date] || [];
                    const successCount = sessions.filter(s => s.outcome === 'success').length;
                    const failCount = sessions.filter(s => s.outcome === 'fail').length;
                    const totalEntries = sessions.reduce((sum, s) => sum + (s.entry_count || 0), 0);
                    
                    return `
                        <div style="margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                            <h4>${date} ${date === today ? '<span style="color: #27ae60;">(Today)</span>' : ''}</h4>
                            <p><strong>Sessions:</strong> ${sessions.length} (${successCount} success, ${failCount} failed)</p>
                            <p><strong>Total Entries:</strong> ${totalEntries}</p>
                            <ul>
                                ${sessions.map(s => `<li>${s.title || 'Untitled'} - ${s.status || 'CLOSED'}</li>`).join('')}
                            </ul>
                            <p><small>View details: <code>/var/backups/OM/changelog/report.html</code></small></p>
                        </div>
                    `;
                }).join('')}
            `;
            
            document.getElementById('changelogSummary').innerHTML = html;
        }
        
        // Initialize growth dashboard on load
        setTimeout(() => {
            if (document.getElementById('growth')) {
                updateGrowthCharts();
            }
        }, 100);
        
        function showTab(tabName) {
            // Hide all tab contents and buttons
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            
            // Show selected tab
            const selectedContent = document.getElementById(tabName);
            const selectedButton = document.querySelector(`button.tab[onclick*="'${tabName}'"]`);
            if (selectedContent) selectedContent.classList.add('active');
            if (selectedButton) selectedButton.classList.add('active');
        }
        
        function filterTable(tableId, searchId) {
            const input = document.getElementById(searchId);
            const filter = input.value.toLowerCase();
            const table = document.getElementById(tableId);
            const tr = table.getElementsByTagName('tr');
            
            for (let i = 1; i < tr.length; i++) {
                const td = tr[i].getElementsByTagName('td')[0];
                if (td) {
                    const txtValue = td.textContent || td.innerText;
                    tr[i].style.display = txtValue.toLowerCase().indexOf(filter) > -1 ? '' : 'none';
                }
            }
        }
        
        document.getElementById('runSelector').addEventListener('change', function() {
            renderReport(parseInt(this.value));
        });
        
        // Render first run by default
        renderReport(0);
    </script>
</body>
</html>""")
    
    return "".join(html_parts)


def prune_old_runs(keep_last_n: int = 10):
    """Prune old analysis runs, keeping only the last N runs."""
    if not INDEX_FILE.exists():
        return
    
    with open(INDEX_FILE, "r") as f:
        index = json.load(f)
    
    runs = index.get("runs", [])
    if len(runs) <= keep_last_n:
        return
    
    # Sort by timestamp
    runs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    # Keep last N, remove others
    to_keep = runs[:keep_last_n]
    to_remove = runs[keep_last_n:]
    
    for run_info in to_remove:
        run_id = run_info["run_id"]
        run_dir = RUNS_DIR / run_id
        if run_dir.exists():
            shutil.rmtree(run_dir)
    
    # Update index
    index["runs"] = to_keep
    with open(INDEX_FILE, "w") as f:
        json.dump(index, f, indent=2)
    
    print(f"Pruned {len(to_remove)} old runs, kept {len(to_keep)} most recent runs.")


def run_analysis(scope_name: str, root_paths: List[Path], exclude_patterns: List[str] = None,
                dedupe_mode: str = "quick", max_hash_mb: int = 20, stale_days: int = 180,
                dry_run: bool = False) -> Dict:
    """
    Run analysis and save results.
    
    Args:
        scope_name: Name of the scope (prod, server, front-end, entire)
        root_paths: List of root paths to analyze
        exclude_patterns: Patterns to exclude
        dedupe_mode: "quick" or "full" duplicate detection
        max_hash_mb: Maximum file size to hash in MB
        stale_days: Days threshold for stale files
        dry_run: If True, don't write files (read-only analysis)
    
    Returns:
        Dictionary with run information
    """
    if dry_run:
        print(f"\n=== Running Analysis (DRY RUN): {scope_name} ===\n")
        print("*** DRY RUN MODE - No files will be written ***\n")
    else:
        print(f"\n=== Running Analysis: {scope_name} ===\n")
    
    # Load previous run for diff (only if not dry-run)
    previous = None
    if not dry_run:
        previous = load_previous_run(scope_name)
    
    # Run analysis
    results = analyze_directory(root_paths, exclude_patterns, dedupe_mode, max_hash_mb, stale_days)
    results["scope"] = scope_name
    
    # Compute diff
    diff = diff_against_previous(results, previous) if not dry_run else {"has_previous": False}
    
    # Save run (skip if dry-run)
    run_dir = None
    if not dry_run:
        run_dir = save_analysis_run(results, diff, dedupe_mode, max_hash_mb, stale_days)
        # Generate/update HTML report
        generate_html_report()
    else:
        # In dry-run, create a temporary path for display
        timestamp_str = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")
        run_dir = RUNS_DIR / timestamp_str
        print(f"[DRY RUN] Would create run directory: {run_dir}")
        print(f"[DRY RUN] Would update HTML report: {REPORT_FILE}")
    
    print(f"\nAnalysis complete!")
    print(f"  Duration: {results['duration_seconds']:.2f} seconds")
    print(f"  Files: {results['inventory']['total_files']:,}")
    print(f"  Size: {results['inventory']['total_bytes_formatted']}")
    if run_dir:
        print(f"  Run directory: {run_dir}")
    if not dry_run:
        print(f"  HTML report: {REPORT_FILE}")
    
    return {
        "run_dir": str(run_dir) if run_dir else None,
        "report_file": str(REPORT_FILE) if not dry_run else None,
        "results": results,
    }
