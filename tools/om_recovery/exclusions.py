#!/usr/bin/env python3
"""
OM-Ops - Hard Exclusions Module
Enforces mandatory exclusion rules for all OM-Ops scanners.
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
import tempfile
import shutil

# Try to import yaml, fallback to JSON if not available
try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False

# Configuration
REPO_ROOT = Path("/var/www/orthodoxmetrics/prod")
OM_APP_ROOT = REPO_ROOT  # Alias for clarity
OPS_CONFIG_ROOT = Path("/var/backups/OM/config")
EXCLUSIONS_FILE = OPS_CONFIG_ROOT / "ops_exclusions.yaml"

# Preset: Recommended (minimal but high impact)
PRESET_RECOMMENDED = {
    "version": 1,
    "description": "OM-Ops hard exclusion rules - Recommended preset (minimal but high impact)",
    "generated_by": "preset_recommended",
    "paths": [
        ".git/",
        "node_modules/",
        "dist/",
        "build/",
        "coverage/",
        ".cache/",
        ".vite/",
        "tmp/",
        "logs/",
        "/var/backups/OM/",  # Absolute path - always exclude backups
    ],
    "rules": [
        {
            "reason": "Prevent scanning build artifacts and dependencies",
            "applies_to": ["analysis", "discovery", "integrity"],
        },
        {
            "reason": "Prevent backup recursion",
            "applies_to": ["analysis", "discovery"],
        },
    ],
}

# Preset: Strict (max performance)
PRESET_STRICT = {
    "version": 1,
    "description": "OM-Ops hard exclusion rules - Strict preset (max performance)",
    "generated_by": "preset_strict",
    "paths": [
        # All Recommended
        ".git/",
        "node_modules/",
        "dist/",
        "build/",
        "coverage/",
        ".cache/",
        ".vite/",
        "tmp/",
        "logs/",
        # Additional strict exclusions
        ".next/",
        ".turbo/",
        ".pnpm-store/",
        ".yarn/",
        ".parcel-cache/",
        "out/",
        # Absolute path
        "/var/backups/OM/",
    ],
    "rules": [
        {
            "reason": "Maximum performance - exclude all build artifacts and caches",
            "applies_to": ["analysis", "discovery", "integrity"],
        },
        {
            "reason": "Prevent backup recursion",
            "applies_to": ["analysis", "discovery"],
        },
    ],
}

# Auto-detect patterns (directory names to look for)
AUTO_DETECT_PATTERNS = [
    ".git",
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".cache",
    ".vite",
    ".next",
    ".turbo",
    ".pnpm-store",
    ".yarn",
    ".parcel-cache",
    "tmp",
    "logs",
    "out",
]

# Recommended patterns (always mark as recommended in auto-detect)
RECOMMENDED_PATTERNS = {
    ".git",
    "node_modules",
    "dist",
    "build",
    ".cache",
    ".vite",
}

# Cache for loaded exclusions
_exclusions_cache: Optional[Dict] = None
_normalized_paths_cache: Optional[Set[str]] = None


def ensure_config_dir():
    """Ensure config directory exists."""
    OPS_CONFIG_ROOT.mkdir(parents=True, exist_ok=True)


def load_exclusions(force_reload: bool = False) -> Dict:
    """Load exclusions from YAML/JSON file, creating Recommended preset if missing."""
    global _exclusions_cache
    
    if _exclusions_cache is not None and not force_reload:
        return _exclusions_cache
    
    ensure_config_dir()
    
    config_file = EXCLUSIONS_FILE
    if not YAML_AVAILABLE:
        config_file = EXCLUSIONS_FILE.with_suffix(".json")
    
    if not config_file.exists():
        # Auto-create with Recommended preset
        bootstrap_exclusions()
        return _exclusions_cache
    
    try:
        with open(config_file, "r", encoding="utf-8") as f:
            if YAML_AVAILABLE:
                data = yaml.safe_load(f)
            else:
                data = json.load(f)
            if not data:
                bootstrap_exclusions()
                return _exclusions_cache
            _exclusions_cache = data
            return _exclusions_cache
    except Exception as e:
        print(f"Warning: Failed to load exclusions: {e}. Using Recommended preset.")
        bootstrap_exclusions()
        return _exclusions_cache


def save_exclusions(exclusions: Dict, generated_by: str = None) -> bool:
    """Save exclusions to YAML/JSON file (atomic write)."""
    ensure_config_dir()
    
    # Add metadata if not present
    if "app_root" not in exclusions:
        exclusions["app_root"] = str(OM_APP_ROOT)
    if "updated_at" not in exclusions:
        import datetime
        exclusions["updated_at"] = datetime.datetime.now().isoformat()
    if generated_by and "generated_by" not in exclusions:
        exclusions["generated_by"] = generated_by
    
    # Validate before saving
    if not validate_exclusions(exclusions)[0]:
        return False
    
    try:
        config_file = EXCLUSIONS_FILE
        if not YAML_AVAILABLE:
            config_file = EXCLUSIONS_FILE.with_suffix(".json")
        
        # Atomic write: write to temp file, then rename
        temp_file = config_file.with_suffix(config_file.suffix + ".tmp")
        with open(temp_file, "w", encoding="utf-8") as f:
            if YAML_AVAILABLE:
                yaml.dump(exclusions, f, default_flow_style=False, sort_keys=False)
            else:
                json.dump(exclusions, f, indent=2)
        
        # Atomic rename
        shutil.move(str(temp_file), str(config_file))
        
        # Clear cache
        global _exclusions_cache, _normalized_paths_cache
        _exclusions_cache = None
        _normalized_paths_cache = None
        
        return True
    except Exception as e:
        print(f"Error saving exclusions: {e}")
        return False


def bootstrap_exclusions() -> bool:
    """Bootstrap exclusions config with Recommended preset (called on first run)."""
    ensure_config_dir()
    
    preset = PRESET_RECOMMENDED.copy()
    preset["app_root"] = str(OM_APP_ROOT)
    import datetime
    preset["updated_at"] = datetime.datetime.now().isoformat()
    preset["generated_by"] = "bootstrap_recommended"
    
    success = save_exclusions(preset, generated_by="bootstrap_recommended")
    if success:
        global _exclusions_cache
        _exclusions_cache = preset.copy()
    return success


def apply_preset(preset_name: str) -> Tuple[bool, str]:
    """Apply a preset (recommended or strict)."""
    if preset_name.lower() == "recommended":
        preset = PRESET_RECOMMENDED.copy()
        preset["app_root"] = str(OM_APP_ROOT)
        import datetime
        preset["updated_at"] = datetime.datetime.now().isoformat()
        preset["generated_by"] = "preset_recommended"
    elif preset_name.lower() == "strict":
        preset = PRESET_STRICT.copy()
        preset["app_root"] = str(OM_APP_ROOT)
        import datetime
        preset["updated_at"] = datetime.datetime.now().isoformat()
        preset["generated_by"] = "preset_strict"
    else:
        return False, f"Unknown preset: {preset_name}"
    
    if save_exclusions(preset, generated_by=preset["generated_by"]):
        return True, f"Applied {preset_name} preset"
    else:
        return False, "Failed to save preset"


def auto_detect_candidates(max_depth: int = 6, max_files_per_dir: int = 1000) -> List[Dict]:
    """
    Auto-detect exclusion candidates by scanning OM_APP_ROOT.
    
    Returns list of candidate directories with metadata.
    """
    candidates = []
    seen_paths = set()
    
    if not OM_APP_ROOT.exists():
        return candidates
    
    print(f"Scanning {OM_APP_ROOT} for exclusion candidates (max depth: {max_depth})...")
    
    def estimate_dir_size(path_obj: Path, max_files: int = max_files_per_dir) -> Tuple[int, int, bool]:
        """Estimate directory size and file count (bounded)."""
        total_size = 0
        file_count = 0
        estimated = False
        
        try:
            for item in path_obj.rglob("*"):
                if file_count >= max_files:
                    estimated = True
                    break
                
                try:
                    if item.is_file():
                        file_count += 1
                        total_size += item.stat().st_size
                except (OSError, PermissionError):
                    continue
        except (OSError, PermissionError):
            pass
        
        return total_size, file_count, estimated
    
    # Walk directory tree with depth limit
    for current_path, dirs, files in os.walk(OM_APP_ROOT):
        # Calculate depth
        try:
            rel_path = Path(current_path).relative_to(OM_APP_ROOT)
            depth = len(rel_path.parts)
            if depth > max_depth:
                dirs[:] = []  # Don't descend further
                continue
        except ValueError:
            continue
        
        current_path_obj = Path(current_path)
        dir_name = current_path_obj.name
        
        # Check if directory name matches auto-detect patterns
        if dir_name in AUTO_DETECT_PATTERNS:
            normalized = str(current_path_obj.resolve())
            
            # Skip if already seen (avoid duplicates)
            if normalized in seen_paths:
                continue
            seen_paths.add(normalized)
            
            # Estimate size (bounded)
            size_bytes, file_count, is_estimated = estimate_dir_size(current_path_obj)
            
            # Check if recommended
            is_recommended = dir_name in RECOMMENDED_PATTERNS
            
            # Get relative path from app root
            try:
                rel_path_str = str(current_path_obj.relative_to(OM_APP_ROOT))
                if not rel_path_str.endswith("/"):
                    rel_path_str += "/"
            except ValueError:
                rel_path_str = normalized
            
            candidates.append({
                "path": rel_path_str,
                "absolute_path": normalized,
                "name": dir_name,
                "size_bytes": size_bytes,
                "file_count": file_count,
                "is_estimated": is_estimated,
                "is_recommended": is_recommended,
                "depth": depth,
            })
    
    # Sort by recommended first, then by size (descending)
    candidates.sort(key=lambda x: (not x["is_recommended"], -x["size_bytes"]))
    
    return candidates


def apply_auto_detected_recommended() -> Tuple[bool, str, int]:
    """Apply all auto-detected recommended exclusions."""
    candidates = auto_detect_candidates()
    recommended = [c for c in candidates if c["is_recommended"]]
    
    if not recommended:
        return False, "No recommended candidates found", 0
    
    # Load current exclusions
    current = load_exclusions()
    current_paths = set(current.get("paths", []))
    
    # Add recommended paths
    added_count = 0
    for candidate in recommended:
        path_str = candidate["path"]
        if path_str not in current_paths:
            current_paths.add(path_str)
            added_count += 1
    
    # Update exclusions
    current["paths"] = sorted(list(current_paths))
    current["app_root"] = str(OM_APP_ROOT)
    import datetime
    current["updated_at"] = datetime.datetime.now().isoformat()
    current["generated_by"] = "auto_detect_recommended"
    
    if save_exclusions(current, generated_by="auto_detect_recommended"):
        return True, f"Applied {added_count} recommended exclusions", added_count
    else:
        return False, "Failed to save exclusions", 0


def reset_exclusions() -> Tuple[bool, str]:
    """Reset exclusions to empty (requires confirmation)."""
    empty_exclusions = {
        "version": 1,
        "description": "OM-Ops hard exclusion rules (empty - reset)",
        "paths": [],
        "app_root": str(OM_APP_ROOT),
        "generated_by": "reset",
    }
    import datetime
    empty_exclusions["updated_at"] = datetime.datetime.now().isoformat()
    
    if save_exclusions(empty_exclusions, generated_by="reset"):
        return True, "Exclusions reset to empty"
    else:
        return False, "Failed to reset exclusions"


def normalize_path_for_exclusion(path_str: str) -> str:
    """Normalize a path for exclusion matching."""
    # Convert to Path and resolve
    if os.path.isabs(path_str):
        path_obj = Path(path_str).resolve()
    else:
        # Relative to repo root
        path_obj = (REPO_ROOT / path_str).resolve()
    
    return str(path_obj)


def get_normalized_exclusion_paths() -> Set[str]:
    """Get set of normalized absolute paths that are excluded."""
    global _normalized_paths_cache
    
    if _normalized_paths_cache is not None:
        return _normalized_paths_cache
    
    exclusions = load_exclusions()
    paths = exclusions.get("paths", [])
    
    normalized = set()
    for path_str in paths:
        try:
            norm_path = normalize_path_for_exclusion(path_str)
            normalized.add(norm_path)
            # Also add parent directories for directory exclusions
            if path_str.endswith("/") or Path(path_str).is_dir():
                # Add all parent components
                path_obj = Path(norm_path)
                for parent in path_obj.parents:
                    normalized.add(str(parent))
        except Exception:
            # Skip invalid paths
            continue
    
    _normalized_paths_cache = normalized
    return normalized


def is_excluded(path: str, scanner_name: str = "all") -> bool:
    """
    Check if a path is excluded by OM-Ops hard exclusions.
    
    Args:
        path: Path to check (can be absolute or relative)
        scanner_name: Name of scanner (for rule-based exclusions)
    
    Returns:
        True if path should be excluded
    """
    try:
        # Normalize the input path
        if os.path.isabs(path):
            path_obj = Path(path).resolve()
        else:
            path_obj = (REPO_ROOT / path).resolve()
        
        path_str = str(path_obj)
        
        # Get normalized exclusion paths
        excluded_paths = get_normalized_exclusion_paths()
        
        # Check exact match
        if path_str in excluded_paths:
            return True
        
        # Check if path is under any excluded directory
        for excluded_path in excluded_paths:
            try:
                excluded_obj = Path(excluded_path)
                # Check if path is under excluded directory
                if path_obj.is_relative_to(excluded_obj):
                    return True
                # Also check reverse (excluded is under path - for directory exclusions)
                if excluded_obj.is_relative_to(path_obj):
                    return True
            except (ValueError, OSError):
                # Path comparison failed, skip
                continue
        
        # Check pattern-based exclusions (for backward compatibility)
        exclusions = load_exclusions()
        paths_list = exclusions.get("paths", [])
        
        # Convert input path to relative POSIX for pattern matching
        try:
            rel_path = path_obj.relative_to(REPO_ROOT)
            rel_posix = str(rel_path).replace(os.sep, "/")
        except ValueError:
            # Path is outside repo root, check absolute patterns
            rel_posix = path_str
        
        # Check each exclusion pattern
        for pattern in paths_list:
            pattern_normalized = pattern.rstrip("/")
            
            # Exact match
            if rel_posix == pattern_normalized or path_str.endswith(pattern_normalized):
                return True
            
            # Directory match (pattern ends with /)
            if pattern.endswith("/"):
                if rel_posix.startswith(pattern) or path_str.startswith(pattern_normalized + os.sep):
                    return True
            
            # Component match (for patterns like "node_modules/")
            pattern_components = pattern_normalized.split("/")
            path_components = rel_posix.split("/")
            
            # Check if any path component matches pattern
            for i in range(len(path_components)):
                if "/".join(path_components[i:i+len(pattern_components)]) == pattern_normalized:
                    return True
        
        return False
    except Exception as e:
        # On error, don't exclude (fail open for safety)
        return False


def validate_exclusions(exclusions: Dict) -> Tuple[bool, List[str]]:
    """Validate exclusions structure and paths."""
    errors = []
    
    if not isinstance(exclusions, dict):
        errors.append("Exclusions must be a dictionary")
        return False, errors
    
    if "paths" not in exclusions:
        errors.append("Missing 'paths' field")
        return False, errors
    
    if not isinstance(exclusions["paths"], list):
        errors.append("'paths' must be a list")
        return False, errors
    
    paths = exclusions.get("paths", [])
    
    # Check for dangerous exclusions
    dangerous = ["/", REPO_ROOT.as_posix(), str(REPO_ROOT)]
    for path in paths:
        path_normalized = path.rstrip("/")
        if path_normalized in dangerous:
            errors.append(f"Cannot exclude root path: {path}")
        if path_normalized == "" or path_normalized == ".":
            errors.append(f"Invalid empty path: {path}")
        if ".." in path:
            errors.append(f"Path contains '..': {path}")
    
    # Validate each path exists or is reasonable
    for path in paths:
        if not path:
            errors.append("Empty path in exclusions")
            continue
        
        # Try to normalize
        try:
            norm_path = normalize_path_for_exclusion(path)
            # Check if it would exclude repo root
            if Path(norm_path) == REPO_ROOT:
                errors.append(f"Path would exclude repo root: {path}")
        except Exception as e:
            errors.append(f"Invalid path '{path}': {e}")
    
    return len(errors) == 0, errors


def view_exclusions() -> Dict:
    """View current exclusions with metadata."""
    exclusions = load_exclusions()
    paths = exclusions.get("paths", [])
    
    result = {
        "config_file": str(EXCLUSIONS_FILE),
        "version": exclusions.get("version", 1),
        "description": exclusions.get("description", ""),
        "generated_by": exclusions.get("generated_by", "unknown"),
        "updated_at": exclusions.get("updated_at", "unknown"),
        "paths": [],
        "rules": exclusions.get("rules", []),
    }
    
    for path in paths:
        is_absolute = os.path.isabs(path)
        normalized = normalize_path_for_exclusion(path)
        exists = Path(normalized).exists()
        
        result["paths"].append({
            "path": path,
            "is_absolute": is_absolute,
            "normalized": normalized,
            "exists": exists,
        })
    
    return result


def add_exclusion(path: str) -> Tuple[bool, str]:
    """Add an exclusion path."""
    if not path:
        return False, "Path cannot be empty"
    
    # Normalize and validate
    try:
        norm_path = normalize_path_for_exclusion(path)
        if Path(norm_path) == REPO_ROOT:
            return False, "Cannot exclude repo root"
        if norm_path == "/":
            return False, "Cannot exclude root filesystem"
    except Exception as e:
        return False, f"Invalid path: {e}"
    
    exclusions = load_exclusions()
    paths = exclusions.get("paths", [])
    
    # Check if already exists
    if path in paths:
        return False, "Path already excluded"
    
    # Add path
    paths.append(path)
    exclusions["paths"] = paths
    
    # Validate before saving
    valid, errors = validate_exclusions(exclusions)
    if not valid:
        return False, f"Validation failed: {', '.join(errors)}"
    
    if save_exclusions(exclusions):
        return True, f"Added exclusion: {path}"
    else:
        return False, "Failed to save exclusions"


def remove_exclusion(path: str) -> Tuple[bool, str]:
    """Remove an exclusion path."""
    exclusions = load_exclusions()
    paths = exclusions.get("paths", [])
    
    if path not in paths:
        return False, "Path not found in exclusions"
    
    paths.remove(path)
    exclusions["paths"] = paths
    
    if save_exclusions(exclusions):
        return True, f"Removed exclusion: {path}"
    else:
        return False, "Failed to save exclusions"


def dry_run_impact() -> Dict:
    """Show impact of exclusions without scanning."""
    exclusions = load_exclusions()
    paths = exclusions.get("paths", [])
    
    # Count how many files/dirs would be excluded
    excluded_count = 0
    excluded_dirs = []
    
    for path_str in paths:
        try:
            norm_path = normalize_path_for_exclusion(path_str)
            path_obj = Path(norm_path)
            
            if path_obj.exists():
                if path_obj.is_dir():
                    # Count files in directory
                    try:
                        file_count = sum(1 for _ in path_obj.rglob("*") if _.is_file())
                        excluded_count += file_count
                        excluded_dirs.append({
                            "path": path_str,
                            "normalized": norm_path,
                            "file_count": file_count,
                        })
                    except (PermissionError, OSError):
                        excluded_dirs.append({
                            "path": path_str,
                            "normalized": norm_path,
                            "file_count": "unknown (permission denied)",
                        })
                else:
                    excluded_count += 1
        except Exception:
            continue
    
    return {
        "total_excluded_paths": len(paths),
        "estimated_excluded_files": excluded_count,
        "excluded_directories": excluded_dirs,
        "affected_scanners": ["analysis", "discovery", "integrity", "all"],
    }


# Import UI screen renderer
try:
    script_dir = Path(__file__).parent
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    from ui_screen import render_screen, get_user_input, wait_for_enter, clear_screen
    UI_SCREEN_AVAILABLE = True
except ImportError:
    UI_SCREEN_AVAILABLE = False
    def render_screen(*args, **kwargs):
        pass
    def get_user_input(prompt="Select option: "):
        return input(prompt).strip()
    def wait_for_enter(message="Press Enter to continue..."):
        input(message)
    def clear_screen():
        import os
        os.system("clear" if os.name != "nt" else "cls")


def show_exclusions_menu():
    """Display Hard Exclusions submenu using screen renderer."""
    exclusions = load_exclusions()
    config_file = str(EXCLUSIONS_FILE)
    app_root = exclusions.get("app_root", str(OM_APP_ROOT))
    
    context_lines = [
        f"Config: {config_file}",
        f"App Root: {app_root}",
    ]
    
    menu_items = [
        ("1", "Show current exclusions", "view"),
        ("2", "Apply preset: Recommended (Default)", "preset_recommended"),
        ("3", "Apply preset: Strict (Max performance)", "preset_strict"),
        ("4", "Auto-detect common bloat dirs (show list + sizes)", "auto_detect"),
        ("5", "Apply all auto-detected recommended exclusions", "apply_recommended"),
        ("6", "Advanced: Manual add exclusion", "add"),
        ("7", "Advanced: Manual remove exclusion", "remove"),
        ("8", "Reset exclusions to empty (requires confirmation)", "reset"),
        ("0", "Back to main menu", "back"),
    ]
    
    body_lines = []
    for num, desc, _ in menu_items:
        body_lines.append(f"  ({num}) {desc}")
    
    render_screen(
        title="Hard Exclusions",
        breadcrumb="OM-Ops › Hard Exclusions",
        context_lines=context_lines,
        body_lines=body_lines,
        footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
    )


def view_exclusions_screen():
    """Display exclusions view screen."""
    view_data = view_exclusions()
    
    context_lines = [
        f"Config: {view_data['config_file']}",
        f"Version: {view_data.get('version', 1)}",
        f"Description: {view_data.get('description', '')}",
        f"Generated by: {view_data.get('generated_by', 'unknown')}",
        f"Updated at: {view_data.get('updated_at', 'unknown')}",
        f"Total paths: {len(view_data['paths'])}",
    ]
    
    body_lines = []
    if view_data["paths"]:
        body_lines.append("Excluded Paths:")
        body_lines.append("")
        for p in view_data["paths"]:
            abs_marker = "[ABS]" if p["is_absolute"] else "[REL]"
            exists_marker = "✓" if p["exists"] else "✗"
            body_lines.append(f"  {exists_marker} {abs_marker} {p['path']}")
            if p["is_absolute"]:
                body_lines.append(f"      → {p['normalized']}")
    else:
        body_lines.append("No exclusions configured.")
    
    if view_data.get("rules"):
        body_lines.append("")
        body_lines.append("Rules:")
        for rule in view_data["rules"]:
            body_lines.append(f"  - {rule.get('reason', '')}")
            body_lines.append(f"    Applies to: {', '.join(rule.get('applies_to', []))}")
    
    render_screen(
        title="View Exclusions",
        breadcrumb="OM-Ops › Hard Exclusions › View",
        context_lines=context_lines,
        body_lines=body_lines,
        footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
    )


def auto_detect_screen():
    """Display auto-detect results screen."""
    candidates = auto_detect_candidates()
    
    context_lines = [
        f"Found {len(candidates)} candidate(s)",
    ]
    
    body_lines = []
    if candidates:
        body_lines.append(f"{'Rec':<4} {'Name':<20} {'Size':<15} {'Files':<10} {'Path':<40}")
        body_lines.append("-" * 95)
        for c in candidates:
            rec_marker = "✓" if c["is_recommended"] else " "
            size_str = format_size(c["size_bytes"])
            if c["is_estimated"]:
                size_str += " (est)"
            file_str = str(c["file_count"])
            if c["is_estimated"]:
                file_str += "+"
            path_display = c["path"][:38] + ".." if len(c["path"]) > 40 else c["path"]
            body_lines.append(f"{rec_marker:<4} {c['name']:<20} {size_str:<15} {file_str:<10} {path_display:<40}")
    else:
        body_lines.append("No candidates found.")
    
    render_screen(
        title="Auto-Detect Candidates",
        breadcrumb="OM-Ops › Hard Exclusions › Auto-Detect",
        context_lines=context_lines,
        body_lines=body_lines,
        footer_hint="[Enter] Back   [0] Main Menu   [q] Quit"
    )


def handle_exclusions_submenu() -> str:
    """
    Handle Hard Exclusions submenu with return-based navigation.
    
    Returns:
        Navigation action: "back" to return to main menu, "exit" to quit
    """
    while True:
        show_exclusions_menu()
        choice = get_user_input("Select option: ")
        
        if choice is None:  # EOF/KeyboardInterrupt
            return "back"
        
        if choice == "" or choice.lower() == "q":
            return "exit"
        if choice == "0":
            return "back"
        elif choice == "1":
            # Show current exclusions
            while True:
                view_exclusions_screen()
                action = get_user_input()
                if action is None or action == "" or action == "0" or action.lower() == "q":
                    break
            if action and action.lower() == "q":
                return "exit"
        elif choice == "2":
            # Apply Recommended preset
            clear_screen()
            print("Applying Recommended preset...")
            success, msg = apply_preset("recommended")
            print(f"\n{'✓' if success else '✗'} {msg}")
            wait_for_enter()
        elif choice == "3":
            # Apply Strict preset
            clear_screen()
            print("Applying Strict preset...")
            success, msg = apply_preset("strict")
            print(f"\n{'✓' if success else '✗'} {msg}")
            wait_for_enter()
        elif choice == "4":
            # Auto-detect candidates
            while True:
                auto_detect_screen()
                action = get_user_input()
                if action is None or action == "" or action == "0" or action.lower() == "q":
                    break
            if action and action.lower() == "q":
                return "exit"
        elif choice == "5":
            # Apply all auto-detected recommended
            clear_screen()
            print("Applying all auto-detected recommended exclusions...")
            success, msg, count = apply_auto_detected_recommended()
            print(f"\n{'✓' if success else '✗'} {msg}")
            if success and count > 0:
                print(f"Added {count} exclusion(s)")
            wait_for_enter()
        elif choice == "6":
            # Advanced: Manual add
            clear_screen()
            print("[Advanced] Manual add exclusion")
            path_input = get_user_input("Enter path to exclude (relative to app root or absolute): ")
            if path_input:
                success, msg = add_exclusion(path_input)
                print(f"\n{'✓' if success else '✗'} {msg}")
            else:
                print("No path provided.")
            wait_for_enter()
        elif choice == "7":
            # Advanced: Manual remove
            clear_screen()
            print("[Advanced] Manual remove exclusion")
            view_data = view_exclusions()
            if not view_data["paths"]:
                print("\nNo exclusions to remove.")
            else:
                print("\nCurrent exclusions:")
                for i, p in enumerate(view_data["paths"], 1):
                    print(f"  {i}. {p['path']}")
                try:
                    idx_input = get_user_input("\nEnter number to remove (or path): ")
                    # Try as index first
                    if idx_input and idx_input.isdigit():
                        idx = int(idx_input) - 1
                        if 0 <= idx < len(view_data["paths"]):
                            path_to_remove = view_data["paths"][idx]["path"]
                        else:
                            print("Invalid index.")
                            wait_for_enter()
                            continue
                    elif idx_input:
                        path_to_remove = idx_input
                    else:
                        continue
                    
                    success, msg = remove_exclusion(path_to_remove)
                    print(f"\n{'✓' if success else '✗'} {msg}")
                except (ValueError, IndexError):
                    print("Invalid selection.")
            wait_for_enter()
        elif choice == "8":
            # Reset exclusions
            clear_screen()
            print("⚠️  WARNING: This will remove ALL exclusions!")
            confirm = get_user_input("Type 'RESET' to confirm: ")
            if confirm == "RESET":
                success, msg = reset_exclusions()
                print(f"\n{'✓' if success else '✗'} {msg}")
            else:
                print("Reset cancelled.")
            wait_for_enter()
        else:
            clear_screen()
            print("Invalid option.")
            wait_for_enter()


def format_size(size_bytes: int) -> str:
    """Format bytes as human-readable size."""
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f}{unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f}PB"


